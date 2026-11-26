import * as THREE from 'three';
import type { EnemyAiStepContext } from '../../core/enemyManager';
import {
  computeFacingYaw,
  hasEnemyLineOfSight,
  raycastCollisionWorld3D,
  rotateYawTowards,
  stepEnemyMovement,
  type WorldRaycastHit,
} from '../../core/enemyNav';
import { AEGIS_RIOT_CONFIG } from './config';

type AegisActionMode = 'none' | 'flak_volley' | 'bull_rush' | 'shield_slam' | 'berserk_salvo';

interface AegisAiState {
  actionMode: AegisActionMode;
  actionPhase: 'windup' | 'attack' | 'recover';
  phaseTimer: number;
  decisionCooldown: number;
  bullRushCooldown: number;
  slamCooldown: number;
  salvoShotsLeft: number;
  salvoInterval: number;
  chargeDirX: number;
  chargeDirZ: number;
  chargeHitDealt: boolean;
  slamExecuted: boolean;
  patrolIndex: number;
}

export function createAegisAiState(): Record<string, unknown> {
  return {
    actionMode: 'none',
    actionPhase: 'windup',
    phaseTimer: 0,
    decisionCooldown: 1.0,
    bullRushCooldown: 4.5,
    slamCooldown: 3.0,
    salvoShotsLeft: 0,
    salvoInterval: 0,
    chargeDirX: 0,
    chargeDirZ: -1,
    chargeHitDealt: false,
    slamExecuted: false,
    patrolIndex: 0,
  } satisfies AegisAiState;
}

const _muzzle = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _from = new THREE.Vector3();
const _glintPos = new THREE.Vector3();
const _backDir = new THREE.Vector3();
const _worldHit: WorldRaycastHit = {
  hit: false,
  t: 1,
  point: new THREE.Vector3(),
  normal: new THREE.Vector3(),
};

/**
 * AAA 4-Move Heavy Exosuit Shield Juggernaut AI for AEGIS-RIOT:
 * 1. Phalanx Flak Volley: Advances behind curved hex-grid hard-light shield & fires 6-pellet flak bursts.
 * 2. Boosted Bull-Rush Shield Charge: Spools dorsal cyan ram-jets + visor peril glint, then rockets forward
 *    behind his barrier — colliding violently with solid cover/walls (`raycastCollisionWorld3D`) if dodged!
 * 3. Seismic Shield-Slam Shockwave: Heaves tower shield overhead and smashes the serrated rim into the deck,
 *    unleashing an expanding electric-cyan shockwave ring (jumpable, dodge-rollable, blocked by cover!).
 * 4. Berserk Unshielded Drum-Dump: Once the player shatters his Shield Projector Lens, drops slow guard
 *    and charges aggressively with rapid 2-shot Sledgehammer auto-shotgun salvos!
 */
export function stepAegisAi(ctx: EnemyAiStepContext): void {
  const ai = ctx.aiState as unknown as AegisAiState;
  const {
    dt,
    elapsed,
    state,
    spatial,
    rig,
    playerPos,
    playerRolling,
    world,
    hasAttackToken,
    separation,
    callbacks,
  } = ctx;
  const cfg = AEGIS_RIOT_CONFIG;
  const rigExt = rig as unknown as {
    getVisorGlintWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
  };

  const dx = playerPos.x - spatial.x;
  const dz = playerPos.z - spatial.z;
  const dist = Math.hypot(dx, dz);
  const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);

  // Shield shattered or heavy EMP stagger cleanly interrupts any active charge/slam!
  if (state.staggerTimer > 0) {
    ai.actionMode = 'none';
    stepEnemyMovement(spatial, 0, 0, world, dt);
    rig.updateAnimation({
      dt,
      elapsed,
      behavior: 'staggered',
      speedRatio: 0,
      localMoveX: 0,
      localMoveZ: 0,
      aimPitch: 0,
      attackProgress: 0,
      attackVariant: 0,
      flinchTimer: state.flinchTimer,
      flinchDirX: state.flinchDirX,
      staggerTimer: state.staggerTimer,
      deadProgress: 0,
      weakpointExposed: false,
      weakpointBroken: true,
      shieldActive: state.shieldActive,
      phase: 1,
      airborneHeight: 0,
      boosterIntensity: 0,
    });
    return;
  }

  const hasLos =
    dist <= cfg.detectRange &&
    hasEnemyLineOfSight(
      spatial.x,
      spatial.y + 1.56,
      spatial.z,
      playerPos.x,
      playerPos.y + 1.32,
      playerPos.z,
      world
    );

  if (hasLos && dist <= cfg.detectRange) {
    state.engaged = true;
  }

  ai.decisionCooldown = Math.max(0, ai.decisionCooldown - dt);
  ai.bullRushCooldown = Math.max(0, ai.bullRushCooldown - dt);
  ai.slamCooldown = Math.max(0, ai.slamCooldown - dt);

  let desVx = 0;
  let desVz = 0;
  let attackProgress = 0;
  let attackVariant = 0;
  let boosterIntensity = 0;

  const fireSledgehammerFlak = (pelletCount: number, spreadAmp: number): void => {
    rig.getMuzzleWorldPos(_muzzle);
    _dir
      .set(
        playerPos.x - _muzzle.x,
        playerPos.y + 1.16 - _muzzle.y,
        playerPos.z - _muzzle.z
      )
      .normalize();

    callbacks.spawnMuzzleFlash(_muzzle, _dir, 0x38e8ff, false);
    callbacks.onFireAudio('shotgun');

    for (let p = 0; p < pelletCount; p++) {
      const spreadX = (p - (pelletCount - 1) * 0.5) * spreadAmp + (Math.random() - 0.5) * 0.025;
      const spreadY = (Math.random() - 0.5) * spreadAmp * 1.4;
      _from.copy(_dir);
      _from.x += spreadX;
      _from.y += spreadY;
      _from.normalize();
      callbacks.spawnProjectile({
        origin: _muzzle,
        direction: _from,
        speed: 24,
        damage: 6,
        radius: 0.11,
        color: 0x48f0ff,
        kind: 'shotgun_pellet',
        staggerStrength: 0.44,
      });
    }
  };

  if (!state.engaged) {
    state.behavior = 'patrol';
    const wp = ctx.patrolPoints[ai.patrolIndex % ctx.patrolPoints.length];
    const pdx = wp.x - spatial.x;
    const pdz = wp.z - spatial.z;
    const pDist = Math.hypot(pdx, pdz);
    if (pDist < 0.75) {
      ai.patrolIndex = (ai.patrolIndex + 1) % ctx.patrolPoints.length;
    } else if (pDist > 0.1) {
      spatial.yaw = rotateYawTowards(
        spatial.yaw,
        computeFacingYaw(spatial.x, spatial.z, wp.x, wp.z),
        3.0,
        dt
      );
      desVx = (pdx / pDist) * 1.35;
      desVz = (pdz / pDist) * 1.35;
    }
  } else {
    const fwdX = dist > 0.05 ? dx / dist : 0;
    const fwdZ = dist > 0.05 ? dz / dist : -1;

    // -------------------------------------------------------------------------
    // ACTIVE MOVE EXECUTION
    // -------------------------------------------------------------------------
    if (ai.actionMode === 'flak_volley') {
      attackVariant = 0;
      spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, state.shieldActive ? 4.4 : 6.2, dt);

      if (ai.actionPhase === 'windup') {
        state.behavior = 'windup';
        ai.phaseTimer -= dt;
        attackProgress = 1 - Math.max(0, ai.phaseTimer) / 0.42;
        if (ai.phaseTimer <= 0) {
          ai.actionPhase = 'attack';
          ai.phaseTimer = 0.38;
          fireSledgehammerFlak(6, 0.048);
        }
      } else {
        state.behavior = 'attack';
        ai.phaseTimer -= dt;
        attackProgress = 1 - Math.max(0, ai.phaseTimer) / 0.38;
        if (ai.phaseTimer <= 0) {
          ai.actionMode = 'none';
          ai.decisionCooldown = 1.65 + Math.random() * 0.65;
        }
      }
    } else if (ai.actionMode === 'bull_rush') {
      attackVariant = 1;
      if (!state.shieldActive) {
        // Lost shield mid-charge! Abort cleanly.
        ai.actionMode = 'none';
        ai.decisionCooldown = 0.8;
      } else if (ai.actionPhase === 'windup') {
        state.behavior = 'windup';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.2, dt);
        ai.phaseTimer -= dt;
        attackProgress = 1 - Math.max(0, ai.phaseTimer) / 0.68;
        boosterIntensity = 0.35 + attackProgress * 0.55;
        if (ai.phaseTimer <= 0) {
          ai.actionPhase = 'attack';
          ai.phaseTimer = 0.62;
          ai.chargeHitDealt = false;
          ai.chargeDirX = -Math.sin(spatial.yaw);
          ai.chargeDirZ = -Math.cos(spatial.yaw);
          callbacks.onTelegraphAudio('booster_burst');
          _backDir.set(-ai.chargeDirX, -0.28, -ai.chargeDirZ).normalize();
          callbacks.spawnBoosterBurst(
            _from.set(spatial.x - ai.chargeDirX * 0.35, spatial.y + 1.32, spatial.z - ai.chargeDirZ * 0.35),
            _backDir,
            0x22d3ee,
            18
          );
        }
      } else if (ai.actionPhase === 'attack') {
        state.behavior = 'attack';
        ai.phaseTimer -= dt;
        attackProgress = 1 - Math.max(0, ai.phaseTimer) / 0.62;
        boosterIntensity = 1.35;

        // Swept wall/cover collision check BEFORE dashing so he NEVER clips through walls or platforms!
        const probeDist = 1.05;
        const wallCrash = raycastCollisionWorld3D(
          spatial.x,
          spatial.y + 1.05,
          spatial.z,
          spatial.x + ai.chargeDirX * probeDist,
          spatial.y + 1.05,
          spatial.z + ai.chargeDirZ * probeDist,
          world,
          _worldHit
        );

        if (wallCrash) {
          // Violent tungsten shield-into-concrete wall crash with sparks + shockwave + brief recovery!
          callbacks.onTelegraphAudio('shield_slam');
          callbacks.spawnProjectileImpactSparks(_worldHit.point, _worldHit.normal, 0x38e8ff);
          callbacks.spawnBoosterBurst(_worldHit.point, _worldHit.normal, 0xffd264, 22);
          callbacks.spawnShockwave({
            center: _from.set(spatial.x, spatial.y, spatial.z),
            maxRadius: 4.0,
            expandSpeed: 10.5,
            damage: 14,
            color: 0x38e8ff,
            staggerStrength: 0.72,
          });
          ai.actionPhase = 'recover';
          ai.phaseTimer = 0.75;
        } else {
          desVx = ai.chargeDirX * 11.4;
          desVz = ai.chargeDirZ * 11.4;

          // Emit continuous cyan ram-jet exhaust trail sparks!
          if (Math.random() < 0.5) {
            _backDir.set(-ai.chargeDirX, -0.25, -ai.chargeDirZ).normalize();
            callbacks.spawnBoosterBurst(
              _from.set(spatial.x - ai.chargeDirX * 0.38, spatial.y + 1.28, spatial.z - ai.chargeDirZ * 0.38),
              _backDir,
              0x22d3ee,
              4
            );
          }

          if (!ai.chargeHitDealt && dist <= 1.75 && Math.abs(playerPos.y - spatial.y) < 1.35) {
            ai.chargeHitDealt = true;
            if (!playerRolling) {
              _from.set(spatial.x, spatial.y + 1.25, spatial.z);
              callbacks.applyPlayerMeleeHit(26, _from, 1.0);
              callbacks.onTelegraphAudio('shield_slam');
            }
            ai.actionPhase = 'recover';
            ai.phaseTimer = 0.55;
          } else if (ai.phaseTimer <= 0) {
            ai.actionPhase = 'recover';
            ai.phaseTimer = 0.52;
          }
        }
      } else {
        state.behavior = 'recover';
        ai.phaseTimer -= dt;
        attackProgress = 1 - Math.max(0, ai.phaseTimer) / 0.55;
        if (ai.phaseTimer <= 0) {
          ai.actionMode = 'none';
          ai.bullRushCooldown = 5.4 + Math.random() * 2.0;
          ai.decisionCooldown = 1.1;
        }
      }
    } else if (ai.actionMode === 'shield_slam') {
      attackVariant = 2;
      if (ai.actionPhase === 'windup') {
        state.behavior = 'windup';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 4.8, dt);
        ai.phaseTimer -= dt;
        attackProgress = 1 - Math.max(0, ai.phaseTimer) / 0.58;
        if (ai.phaseTimer <= 0) {
          ai.actionPhase = 'attack';
          ai.phaseTimer = 0.36;
          ai.slamExecuted = false;
        }
      } else if (ai.actionPhase === 'attack') {
        state.behavior = 'attack';
        ai.phaseTimer -= dt;
        attackProgress = 1 - Math.max(0, ai.phaseTimer) / 0.36;
        if (!ai.slamExecuted && attackProgress >= 0.32) {
          ai.slamExecuted = true;
          const slamX = spatial.x - Math.sin(spatial.yaw) * 0.72;
          const slamZ = spatial.z - Math.cos(spatial.yaw) * 0.72;
          _from.set(slamX, spatial.y, slamZ);
          callbacks.onTelegraphAudio('shield_slam');
          callbacks.spawnShockwave({
            center: _from,
            maxRadius: 5.8,
            expandSpeed: 12.0,
            damage: 20,
            color: 0x38e8ff,
            staggerStrength: 0.88,
          });
          callbacks.spawnRailImpactCrater(
            _from.set(slamX, spatial.y + 0.03, slamZ),
            _backDir.set(0, 1, 0),
            0x38e8ff
          );
          if (dist <= 2.35 && !playerRolling && Math.abs(playerPos.y - spatial.y) < 1.2) {
            const blocked = raycastCollisionWorld3D(
              spatial.x,
              spatial.y + 0.85,
              spatial.z,
              playerPos.x,
              playerPos.y + 0.85,
              playerPos.z,
              world,
              _worldHit
            );
            if (!blocked) {
              callbacks.applyPlayerMeleeHit(22, _from.set(spatial.x, spatial.y + 1.1, spatial.z), 0.92);
            }
          }
        }
        if (ai.phaseTimer <= 0) {
          ai.actionPhase = 'recover';
          ai.phaseTimer = 0.55;
        }
      } else {
        state.behavior = 'recover';
        ai.phaseTimer -= dt;
        attackProgress = 1 - Math.max(0, ai.phaseTimer) / 0.55;
        if (ai.phaseTimer <= 0) {
          ai.actionMode = 'none';
          ai.slamCooldown = 4.2 + Math.random() * 1.4;
          ai.decisionCooldown = 1.0;
        }
      }
    } else if (ai.actionMode === 'berserk_salvo') {
      attackVariant = 3;
      state.behavior = 'attack';
      spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 7.2, dt);
      desVx = fwdX * cfg.sprintSpeed * 0.55;
      desVz = fwdZ * cfg.sprintSpeed * 0.55;
      ai.salvoInterval -= dt;
      attackProgress = 1 - ai.salvoShotsLeft / 2;
      if (ai.salvoInterval <= 0 && ai.salvoShotsLeft > 0) {
        ai.salvoShotsLeft -= 1;
        ai.salvoInterval = 0.34;
        fireSledgehammerFlak(6, 0.062);
      }
      if (ai.salvoShotsLeft <= 0 && ai.salvoInterval <= 0) {
        ai.actionMode = 'none';
        ai.decisionCooldown = 1.25 + Math.random() * 0.45;
      }
    } else {
      // -----------------------------------------------------------------------
      // DELIBERATE PHALANX ADVANCE & SMART TACTICAL MOVE SELECTION
      // -----------------------------------------------------------------------
      // Slow, heavy turn rate while shielded so flanking or shooting the glowing lens feels super rewarding!
      spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, state.shieldActive ? 3.4 : 5.8, dt);

      if (dist > cfg.preferredMinRange) {
        state.behavior = 'chase';
        const advSpeed = state.shieldActive ? cfg.moveSpeed : cfg.sprintSpeed;
        desVx = fwdX * advSpeed;
        desVz = fwdZ * advSpeed;
      } else {
        state.behavior = 'strafe';
      }

      if (hasLos && hasAttackToken && ai.decisionCooldown <= 0) {
        if (state.shieldActive && dist <= 4.1 && ai.slamCooldown <= 0) {
          // Close-range Seismic Shield-Slam!
          ai.actionMode = 'shield_slam';
          ai.actionPhase = 'windup';
          ai.phaseTimer = 0.58;
          callbacks.onTelegraphAudio('melee');
        } else if (state.shieldActive && dist >= 5.5 && dist <= 13.5 && ai.bullRushCooldown <= 0) {
          // Boosted Bull-Rush Shield Charge!
          ai.actionMode = 'bull_rush';
          ai.actionPhase = 'windup';
          ai.phaseTimer = 0.68;
          callbacks.onTelegraphAudio('shield_charge');
          if (rigExt.getVisorGlintWorldPos) {
            rigExt.getVisorGlintWorldPos(_glintPos);
          } else {
            _glintPos.set(spatial.x, spatial.y + 1.65, spatial.z);
          }
          callbacks.spawnPerilGlint(_glintPos, 0x7ef6ff);
        } else if (!state.shieldActive && dist <= 14.0) {
          // Unshielded Berserk 2-Shot Sledgehammer Drum-Dump!
          ai.actionMode = 'berserk_salvo';
          ai.actionPhase = 'attack';
          ai.salvoShotsLeft = 2;
          ai.salvoInterval = 0.14;
        } else if (dist <= 15.5) {
          // Standard Phalanx 6-Pellet Flak Volley
          ai.actionMode = 'flak_volley';
          ai.actionPhase = 'windup';
          ai.phaseTimer = 0.42;
        }
      }
    }
  }

  if (ai.actionMode !== 'bull_rush') {
    desVx += separation.x * 1.4;
    desVz += separation.y * 1.4;
  }
  stepEnemyMovement(spatial, desVx, desVz, world, dt);

  const speed = Math.hypot(spatial.vx, spatial.vz);
  rig.updateAnimation({
    dt,
    elapsed,
    behavior: state.behavior,
    speedRatio: Math.min(1, speed / cfg.sprintSpeed),
    localMoveX: 0,
    localMoveZ: 1,
    aimPitch: THREE.MathUtils.clamp((playerPos.y - spatial.y) / Math.max(4, dist), -0.28, 0.28),
    attackProgress,
    attackVariant,
    flinchTimer: state.flinchTimer,
    flinchDirX: state.flinchDirX,
    staggerTimer: state.staggerTimer,
    deadProgress: 0,
    weakpointExposed: state.weakpoint.exposed,
    weakpointBroken: state.weakpoint.broken,
    shieldActive: state.shieldActive,
    phase: 1,
    airborneHeight: 0,
    boosterIntensity,
  });
}
