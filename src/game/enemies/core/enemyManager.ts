import * as THREE from 'three';
import type { CollisionWorld3D } from '../../arena/hideout/types';
import {
  createEnemyCombatState,
  exposeEnemyWeakpoint,
  resolveEnemyHit,
  stepEnemyWeakpointTimers,
} from './damageRouting';
import { buildWeakpointIntelBanner, selectActiveBossHud } from './enemyHealthHud';
import { computeSeparationVector, type EnemySpatialState } from './enemyNav';
import { EnemyProjectileSystem } from './enemyProjectiles';
import { EnemyCombatVfxPool } from './enemyVfx';
import type {
  BossHudState,
  EnemyArchetypeConfig,
  EnemyArchetypeId,
  EnemyAttackCallbacks,
  EnemyCombatState,
  EnemyDamageResult,
  EnemyHitZone,
  EnemyInspectInfo,
  EnemyRigHandle,
  EnemySpawnSpec,
  WeakpointIntelBanner,
} from './types';

export interface EnemyArchetypeBrain {
  readonly config: EnemyArchetypeConfig;
  createRig: (enemyId: string) => EnemyRigHandle;
  createAiState: () => Record<string, unknown>;
  onShieldBlock?: (aiState: Record<string, unknown>, rawDamage: number) => void;
  stepAi: (ctx: EnemyAiStepContext) => void;
}

export interface EnemyAiStepContext {
  dt: number;
  elapsed: number;
  state: EnemyCombatState;
  spatial: EnemySpatialState;
  aiState: Record<string, unknown>;
  rig: EnemyRigHandle;
  playerPos: THREE.Vector3;
  playerRolling: boolean;
  world: CollisionWorld3D;
  hasAttackToken: boolean;
  separation: THREE.Vector2;
  patrolPoints: Array<{ x: number; z: number }>;
  callbacks: EnemyAttackCallbacks;
  exposeWeakpoint: (duration: number) => void;
}

export interface ManagedEnemy {
  id: string;
  config: EnemyArchetypeConfig;
  brain: EnemyArchetypeBrain;
  state: EnemyCombatState;
  spatial: EnemySpatialState;
  aiState: Record<string, unknown>;
  rig: EnemyRigHandle;
  patrolPoints: Array<{ x: number; z: number }>;
  deadElapsed: number;
}

export interface EnemyManagerCallbacks {
  onPlayerHit: (damage: number, fromWorldPos: THREE.Vector3, staggerStrength: number) => void;
  onWeakpointBreak: (enemy: ManagedEnemy, result: EnemyDamageResult, worldPos: THREE.Vector3) => void;
  onEnemyKilled: (enemy: ManagedEnemy, worldPos: THREE.Vector3) => void;
  onBossPhase2: (enemy: ManagedEnemy) => void;
  onTelegraphAudio: (
    kind:
      | 'melee'
      | 'mortar'
      | 'boss_slam'
      | 'dash'
      | 'iaijutsu_glint'
      | 'booster_burst'
      | 'rail_charge'
      | 'shield_charge'
      | 'shield_slam'
      | 'warden_vent'
      | 'pyro_flare'
      | 'kestrel_overdrive'
  ) => void;
  onFireAudio: (kind: 'rifle' | 'rail_slug' | 'smg' | 'shotgun' | 'mortar' | 'boss_carbine') => void;
  onKatanaSlashAudio?: (heavy: boolean) => void;
  onKatanaWallCarveAudio?: (heavy: boolean, worldPos: THREE.Vector3) => void;
  onImpactVfx: (pos: THREE.Vector3, isWeakpoint: boolean, isExplosion?: boolean) => void;
  onBanner: (text: string, duration?: number) => void;
}

const MAX_ATTACK_TOKENS = 3;

/**
 * Shared modular Enemy Manager coordinating active Floor 08 (and future floor) enemy rigs,
 * raycast hitboxes, attack token budgets, AAA enemy weapon/surface VFX, weakpoint intel callouts,
 * and barrel splash damage.
 */
export class EnemyManager {
  public readonly group = new THREE.Group();
  public readonly projectiles: EnemyProjectileSystem;
  public readonly vfx: EnemyCombatVfxPool;

  private readonly registry = new Map<EnemyArchetypeId, EnemyArchetypeBrain>();
  private readonly enemies: ManagedEnemy[] = [];
  private readonly hitboxPool: THREE.Mesh[] = [];
  private readonly callbacks: EnemyManagerCallbacks;

  private readonly seenArchetypes = new Set<EnemyArchetypeId>();
  private intelBanner: WeakpointIntelBanner | null = null;
  private intelTimer = 0;
  private showcasePausedEnemyId: string | null = null;

  private readonly tmpSep = new THREE.Vector2();
  private readonly tmpVecA = new THREE.Vector3();
  private readonly attackCallbacks: EnemyAttackCallbacks;

  constructor(callbacks: EnemyManagerCallbacks) {
    this.callbacks = callbacks;
    this.vfx = new EnemyCombatVfxPool();
    this.group.add(this.vfx.group);

    this.projectiles = new EnemyProjectileSystem({
      onPlayerHit: (dmg, fromPos, stagger) => callbacks.onPlayerHit(dmg, fromPos, stagger),
      onSplashExplosion: (pos) => callbacks.onImpactVfx(pos, false, true),
      onSurfaceImpact: (pos, normal, colorHex) =>
        this.vfx.spawnProjectileSurfaceImpact(pos, normal, colorHex),
      onRailSurfaceImpact: (pos, normal, colorHex) =>
        this.vfx.spawnRailImpactCrater(pos, normal, colorHex),
    });
    this.group.add(this.projectiles.group);

    this.attackCallbacks = {
      spawnProjectile: (spec) => this.projectiles.spawnProjectile(spec),
      spawnShockwave: (spec) => this.projectiles.spawnShockwave(spec),
      applyPlayerMeleeHit: (dmg, fromPos, stagger) =>
        callbacks.onPlayerHit(dmg, fromPos, stagger),
      onTelegraphAudio: (kind) => callbacks.onTelegraphAudio(kind),
      onFireAudio: (kind) => callbacks.onFireAudio(kind),
      onKatanaSlashAudio: (heavy) => callbacks.onKatanaSlashAudio?.(heavy),
      onKatanaWallCarveAudio: (heavy) => callbacks.onKatanaWallCarveAudio?.(heavy, this.tmpVecA),
      spawnImpactVfx: (pos, isWp, isExp) => callbacks.onImpactVfx(pos, isWp, isExp),
      spawnMuzzleFlash: (pos, dir, colorHex, heavy) =>
        this.vfx.spawnMuzzleFlash(pos, dir, colorHex, heavy),
      spawnBladeSlashArc: (origin, yaw, tiltRoll, tiltPitch, radius, colorHex, heavy, spinSign) =>
        this.vfx.spawnBladeSlashArc(origin, yaw, tiltRoll, tiltPitch, radius, colorHex, heavy, spinSign),
      spawnSurfaceSlashScar: (hitPos, hitNormal, slashDir, heavy) => {
        this.tmpVecA.copy(hitPos);
        this.vfx.spawnSurfaceSlashScar(hitPos, hitNormal, slashDir, heavy);
        callbacks.onKatanaWallCarveAudio?.(Boolean(heavy), hitPos);
      },
      spawnRailImpactCrater: (hitPos, hitNormal, colorHex) =>
        this.vfx.spawnRailImpactCrater(hitPos, hitNormal, colorHex),
      spawnProjectileImpactSparks: (hitPos, hitNormal, colorHex) =>
        this.vfx.spawnProjectileSurfaceImpact(hitPos, hitNormal, colorHex),
      spawnPerilGlint: (pos, colorHex) => this.vfx.spawnPerilGlint(pos, colorHex),
      spawnBoosterBurst: (pos, backDir, colorHex, count) =>
        this.vfx.spawnBoosterBurst(pos, backDir, colorHex, count),
      showIntelCallout: (title, hint, duration = 4.2) => {
        this.intelBanner = { title, hint, accent: 'gold' };
        this.intelTimer = duration;
      },
    };
  }

  public registerArchetype(brain: EnemyArchetypeBrain): void {
    this.registry.set(brain.config.id, brain);
  }

  public get activeHitboxes(): THREE.Mesh[] {
    return this.hitboxPool;
  }

  public get allEnemies(): ReadonlyArray<ManagedEnemy> {
    return this.enemies;
  }

  public get activeIntelBanner(): WeakpointIntelBanner | null {
    return this.intelTimer > 0 ? this.intelBanner : null;
  }

  public spawnEnemy(spec: EnemySpawnSpec): ManagedEnemy | null {
    const brain = this.registry.get(spec.archetypeId);
    if (!brain) return null;

    const rig = brain.createRig(spec.id);
    rig.root.position.set(spec.x, spec.y, spec.z);
    rig.root.rotation.y = spec.yaw;
    this.group.add(rig.root);

    const managed: ManagedEnemy = {
      id: spec.id,
      config: brain.config,
      brain,
      state: createEnemyCombatState(spec.id, brain.config, spec.zone),
      spatial: {
        x: spec.x,
        y: spec.y,
        z: spec.z,
        vx: 0,
        vz: 0,
        yaw: spec.yaw,
        radius: brain.config.collisionRadius,
        height: brain.config.height,
        grounded: true,
      },
      aiState: brain.createAiState(),
      rig,
      patrolPoints: spec.patrolPoints ?? [{ x: spec.x, z: spec.z }],
      deadElapsed: 0,
    };

    this.enemies.push(managed);
    for (let i = 0; i < rig.hitboxes.length; i++) {
      this.hitboxPool.push(rig.hitboxes[i]);
    }
    return managed;
  }

  public clearAll(): void {
    this.projectiles.clear();
    this.vfx.clear();
    for (const e of this.enemies) {
      this.group.remove(e.rig.root);
      e.rig.dispose();
    }
    this.enemies.length = 0;
    this.hitboxPool.length = 0;
    this.seenArchetypes.clear();
    this.intelBanner = null;
    this.intelTimer = 0;
    this.showcasePausedEnemyId = null;
  }

  public setShowcaseLock(enemyId: string | null): void {
    this.showcasePausedEnemyId = enemyId;
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public getEnemyById(id: string): ManagedEnemy | undefined {
    return this.enemies.find((e) => e.id === id);
  }

  public applyHit(
    enemyId: string,
    rawDamage: number,
    hitZone: EnemyHitZone,
    hitWorldPos: THREE.Vector3,
    flinchDirX = 0
  ): EnemyDamageResult | null {
    const enemy = this.enemies.find((e) => e.id === enemyId);
    if (!enemy || !enemy.state.alive) return null;

    // First engagement with a new archetype surfaces its concise 1-line weakpoint intel!
    if (!this.seenArchetypes.has(enemy.config.id)) {
      this.seenArchetypes.add(enemy.config.id);
      this.intelBanner = buildWeakpointIntelBanner(enemy.config, false);
      this.intelTimer = 5.0;
    }

    const result = resolveEnemyHit(enemy.state, enemy.config, rawDamage, hitZone, flinchDirX);
    if (result.blockedByShield) enemy.brain.onShieldBlock?.(enemy.aiState, rawDamage);

    if (result.shieldShattered && enemy.rig.shieldGroup) {
      enemy.rig.shieldGroup.visible = false;
    }

    if (result.weakpointBroken) {
      this.callbacks.onWeakpointBreak(enemy, result, hitWorldPos);
      if (result.calloutText) {
        this.intelBanner = {
          title: result.calloutText,
          hint: enemy.config.weakpointIntel,
          accent: result.shieldShattered ? 'cyan' : 'gold',
        };
        this.intelTimer = 3.4;
      }
    }

    if (result.phaseTransitionedTo2) {
      this.callbacks.onBossPhase2(enemy);
      this.intelBanner = buildWeakpointIntelBanner(enemy.config, true);
      this.intelTimer = 5.5;
    }

    if (result.killed) {
      this.callbacks.onEnemyKilled(enemy, hitWorldPos);
    }

    return result;
  }

  public applyExplosiveSplash(
    centerX: number,
    centerY: number,
    centerZ: number,
    blastRadius: number,
    baseDamage = 135
  ): number {
    let hitCount = 0;
    const rSq = blastRadius * blastRadius;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.state.alive) continue;
      const dx = e.spatial.x - centerX;
      const dy = e.spatial.y - centerY;
      const dz = e.spatial.z - centerZ;
      const dSq = dx * dx + dy * dy + dz * dz;
      if (dSq <= rSq) {
        const dist = Math.sqrt(dSq);
        const falloff = Math.max(0.4, 1 - dist / blastRadius);
        this.tmpVecA.set(e.spatial.x, e.spatial.y + 1.1, e.spatial.z);
        this.applyHit(e.id, Math.round(baseDamage * falloff), 'weakpoint', this.tmpVecA, 0);
        hitCount += 1;
      }
    }
    return hitCount;
  }

  public getActiveBossHud(playerX: number, playerZ: number): BossHudState | null {
    const views = this.enemies.map((e) => ({
      state: e.state,
      config: e.config,
      x: e.spatial.x,
      y: e.spatial.y,
      z: e.spatial.z,
    }));
    return selectActiveBossHud(views, playerX, playerZ);
  }

  public update(
    dt: number,
    elapsed: number,
    playerPos: THREE.Vector3,
    playerGrounded: boolean,
    playerRolling: boolean,
    world: CollisionWorld3D,
    cameraPos?: THREE.Vector3
  ): void {
    if (this.intelTimer > 0) {
      this.intelTimer = Math.max(0, this.intelTimer - dt);
    }

    // Step enemy projectiles, shockwaves, and AAA katana/surface/booster VFX
    this.projectiles.update(dt, playerPos, playerGrounded, playerRolling, world);
    this.vfx.update(dt, cameraPos);

    // Assign attack tokens to the closest active enemies (max 3 simultaneous attackers for crisp readability)
    const tokenSet = new Set<string>();
    const livingByDist: Array<{ id: string; distSq: number; priority: number }> = [];
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.state.alive || e.state.staggerTimer > 0) continue;
      const dx = e.spatial.x - playerPos.x;
      const dz = e.spatial.z - playerPos.z;
      const distSq = dx * dx + dz * dz;
      const priority = e.state.tier === 'boss' ? -10000 : e.state.tier === 'miniboss' ? -200 : 0;
      livingByDist.push({ id: e.id, distSq, priority: distSq + priority });
    }
    livingByDist.sort((a, b) => a.priority - b.priority);
    for (let i = 0; i < Math.min(MAX_ATTACK_TOKENS, livingByDist.length); i++) {
      tokenSet.add(livingByDist[i].id);
    }

    // Build light separation list once per frame
    const sepPeers = this.enemies.map((e) => ({
      id: e.id,
      alive: e.state.alive,
      x: e.spatial.x,
      z: e.spatial.z,
      radius: e.spatial.radius,
    }));

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];

      if (!e.state.alive) {
        e.deadElapsed += dt;
        const collapse = Math.min(1, e.deadElapsed / 0.65);
        e.rig.updateAnimation({
          dt,
          elapsed,
          behavior: 'dead',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0,
          attackProgress: 0,
          attackVariant: 0,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: collapse,
          weakpointExposed: false,
          weakpointBroken: true,
          shieldActive: false,
          phase: e.state.phase,
          airborneHeight: 0,
        });
        // Disable hitboxes cleanly once dead
        if (e.deadElapsed > 0.1) {
          for (let h = 0; h < e.rig.hitboxes.length; h++) {
            e.rig.hitboxes[h].visible = false;
            e.rig.hitboxes[h].raycast = () => {};
          }
        }
        continue;
      }

      stepEnemyWeakpointTimers(e.state, e.config, dt);

      // Show first-sight intel banner when player walks into clear combat proximity of a new enemy
      if (!this.seenArchetypes.has(e.config.id)) {
        const dx = e.spatial.x - playerPos.x;
        const dz = e.spatial.z - playerPos.z;
        const revealDist = e.state.tier === 'boss' ? 32 : e.state.tier === 'miniboss' ? 18 : 13.5;
        if (dx * dx + dz * dz <= revealDist * revealDist) {
          this.seenArchetypes.add(e.config.id);
          this.intelBanner = buildWeakpointIntelBanner(e.config, false);
          this.intelTimer = 4.8;
        }
      }

      computeSeparationVector(
        e.id,
        e.spatial.x,
        e.spatial.z,
        e.spatial.radius,
        sepPeers,
        this.tmpSep
      );

      if (this.showcasePausedEnemyId === e.id) {
        // Keep root transform & weakpoint pulse live without letting AI overwrite QA showcase pose
        e.rig.root.position.set(e.spatial.x, e.spatial.y, e.spatial.z);
        e.rig.root.rotation.y = e.spatial.yaw;
      } else {
        e.brain.stepAi({
          dt,
          elapsed,
          state: e.state,
          spatial: e.spatial,
          aiState: e.aiState,
          rig: e.rig,
          playerPos,
          playerRolling,
          world,
          hasAttackToken: tokenSet.has(e.id),
          separation: this.tmpSep,
          patrolPoints: e.patrolPoints,
          callbacks: this.attackCallbacks,
          exposeWeakpoint: (duration) => exposeEnemyWeakpoint(e.state, duration),
        });

        // Sync root transform
        e.rig.root.position.set(e.spatial.x, e.spatial.y, e.spatial.z);
        e.rig.root.rotation.y = e.spatial.yaw;
      }

      // Emissive weakpoint clarity pulse (flares bright gold/amber when exposed!)
      const wpPulse =
        e.state.weakpoint.broken
          ? 0.25
          : e.state.weakpoint.exposed
            ? 2.8 + Math.sin(elapsed * 14) * 1.15
            : 1.1 + Math.sin(elapsed * 4) * 0.25;
      for (let m = 0; m < e.rig.weakpointMaterials.length; m++) {
        e.rig.weakpointMaterials[m].emissiveIntensity = wpPulse;
      }

      // Brief white-amber hit flash on armor
      const flashVal = e.state.hitFlashTimer > 0 ? 0.55 : 0;
      for (let m = 0; m < e.rig.armorFlashMaterials.length; m++) {
        e.rig.armorFlashMaterials[m].emissiveIntensity = flashVal;
      }
    }
  }

  public getInspectSnapshot(): EnemyInspectInfo[] {
    return this.enemies.map((e) => ({
      id: e.id,
      archetypeId: e.config.id,
      displayName: e.config.displayName,
      tier: e.state.tier,
      zone: e.state.zone,
      hp: Math.ceil(e.state.hp),
      maxHp: e.state.maxHp,
      alive: e.state.alive,
      phase: e.state.phase,
      behavior: e.state.behavior,
      shieldActive: e.state.shieldActive,
      weakpointExposed: e.state.weakpoint.exposed,
      weakpointBroken: e.state.weakpoint.broken,
      staggerTimer: Number(e.state.staggerTimer.toFixed(2)),
      pos: [
        Number(e.spatial.x.toFixed(2)),
        Number(e.spatial.y.toFixed(2)),
        Number(e.spatial.z.toFixed(2)),
      ],
      yaw: Number(e.spatial.yaw.toFixed(3)),
    }));
  }

  public dispose(): void {
    this.clearAll();
    this.projectiles.dispose();
    this.vfx.dispose();
  }
}
