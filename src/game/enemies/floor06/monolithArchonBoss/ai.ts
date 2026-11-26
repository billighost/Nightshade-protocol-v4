import * as THREE from 'three';
import {
  resolveWorldHorizontal3D,
  type HorizResolveResult,
} from '../../../arena/hideout/hideoutCollision';
import { F6_BASE_Y } from '../../../arena/hideout/floors/floor06/layout';
import type { EnemyAiStepContext, EnemyArchetypeBrain } from '../../core/enemyManager';
import {
  computeFacingYaw,
  hasEnemyLineOfSight,
  raycastCollisionWorld3D,
  rotateYawTowards,
} from '../../core/enemyNav';
import type { Floor06EnemyMaterials } from '../materials';
import { MONOLITH_ARCHON_BOSS_CONFIG } from './config';
import {
  buildMonolithArchonBossRig,
  type ArchonBossStance,
  type MonolithArchonRigHandle,
} from './mesh';
import {
  computeArchonFanDirections,
  computeArchonMeteorTargets,
  computeArchonScissorSweepYaw,
  computeArchonSupernovaRing,
  pickArchonBlinkDestination,
  selectArchonBossAction,
  type ArchonMeteorTarget,
} from './tactics';
import {
  createMonolithArchonTextures,
  type MonolithArchonTextureSuite,
} from './textures';

type ArchonPhase =
  | 'hover_stalk'
  | 'phase2_ascension'
  | 'rail_windup'
  | 'rail_fire'
  | 'slam_windup'
  | 'slam_impact'
  | 'scythe_windup'
  | 'scythe_combo'
  | 'meteor_windup'
  | 'meteor_salvo'
  | 'fan_windup'
  | 'fan_fire'
  | 'lance_barrage'
  | 'blink_charge'
  | 'supernova_charge'
  | 'supernova_cascade'
  | 'resonance_vent';

interface ArchonAiState {
  phase: ArchonPhase;
  timer: number;
  maxTimer: number;
  actionCooldown: number;
  slamCooldown: number;
  railCooldown: number;
  meteorCooldown: number;
  fanCooldown: number;
  blinkCooldown: number;
  scytheCooldown: number;
  supernovaCooldown: number;
  timeWithoutLos: number;
  strafeSign: number;
  shotsLeft: number;
  shotDelay: number;
  fanWavesLeft: number;
  slamPulsesLeft: number;
  scytheSwingsLeft: number;
  supernovaWavesLeft: number;
  beamTickCooldown: number;
  craterTickCooldown: number;
  lockedYaw: number;
  lockedPitch: number;
  meteorTargets: ArchonMeteorTarget[];
  phase2Announced: boolean;
  wasStaggered: boolean;
  ventTick: number;
}

const _muzzleL = new THREE.Vector3();
const _muzzleR = new THREE.Vector3();
const _muzzle = new THREE.Vector3();
const _aimDir = new THREE.Vector3();
const _target = new THREE.Vector3();
const _center = new THREE.Vector3();
const _ventDir = new THREE.Vector3();
const _rayDirL = new THREE.Vector3();
const _rayDirR = new THREE.Vector3();
const _toPlayer = new THREE.Vector3();
const _slashUp = new THREE.Vector3(0, 1, 0);
const _horizScratch: HorizResolveResult = { x: 0, z: 0, collided: false };
const _rayHitL = { hit: false, point: new THREE.Vector3(), normal: new THREE.Vector3(), t: 1 };
const _rayHitR = { hit: false, point: new THREE.Vector3(), normal: new THREE.Vector3(), t: 1 };

function pointToRaySegmentDistSq(
  px: number,
  py: number,
  pz: number,
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  len: number
): number {
  const vx = px - ox;
  const vy = py - oy;
  const vz = pz - oz;
  const proj = Math.max(0, Math.min(len, vx * dx + vy * dy + vz * dz));
  const cx = ox + dx * proj - px;
  const cy = oy + dy * proj - py;
  const cz = oz + dz * proj - pz;
  return cx * cx + cy * cy + cz * cz;
}

function startResonanceVent(
  ai: ArchonAiState,
  ctx: EnemyAiStepContext,
  isP2: boolean,
  durP1: number,
  durP2: number
) {
  ai.phase = 'resonance_vent';
  ai.timer = isP2 ? durP2 : durP1;
  ai.maxTimer = ai.timer;
  ai.ventTick = 0;
  ai.actionCooldown = isP2 ? 0.85 : 1.25;
  ctx.callbacks.onTelegraphAudio('warden_vent');
  ctx.exposeWeakpoint(ai.timer + 0.4);
}

export function createMonolithArchonBossBrain(
  mats: Floor06EnemyMaterials
): EnemyArchetypeBrain {
  let sharedTextures: MonolithArchonTextureSuite | null = null;

  return {
    config: MONOLITH_ARCHON_BOSS_CONFIG,
    createRig: (enemyId) => {
      if (!sharedTextures) {
        sharedTextures = createMonolithArchonTextures();
      }
      return buildMonolithArchonBossRig(enemyId, mats, sharedTextures);
    },
    createAiState: (): Record<string, unknown> => ({
      phase: 'hover_stalk',
      timer: 0,
      maxTimer: 1,
      actionCooldown: 0.9,
      slamCooldown: 2.6,
      railCooldown: 2.0,
      meteorCooldown: 2.4,
      fanCooldown: 1.6,
      blinkCooldown: 4.0,
      scytheCooldown: 2.2,
      supernovaCooldown: 5.5,
      timeWithoutLos: 0,
      strafeSign: 1,
      shotsLeft: 0,
      shotDelay: 0,
      fanWavesLeft: 0,
      slamPulsesLeft: 0,
      scytheSwingsLeft: 0,
      supernovaWavesLeft: 0,
      beamTickCooldown: 0,
      craterTickCooldown: 0,
      lockedYaw: 0,
      lockedPitch: 0,
      meteorTargets: [],
      phase2Announced: false,
      wasStaggered: false,
      ventTick: 0,
    }),
    stepAi: (ctx: EnemyAiStepContext) => {
      const ai = ctx.aiState as unknown as ArchonAiState;
      const rig = ctx.rig as MonolithArchonRigHandle;
      const { dt, elapsed, state, spatial, playerPos, playerRolling, world, callbacks } = ctx;
      const cfg = MONOLITH_ARCHON_BOSS_CONFIG;
      const isP2 = state.phase === 2;

      // ── Dramatic Phase 2 Apex Overdrive Ascension (<= 55% HP) ──
      if (isP2 && !ai.phase2Announced) {
        ai.phase2Announced = true;
        ai.phase = 'phase2_ascension';
        ai.timer = 1.05;
        ai.maxTimer = 1.05;
        ai.actionCooldown = 0.25;
        ai.railCooldown = 0.8;
        ai.slamCooldown = 0.8;
        ai.supernovaCooldown = 1.6;
        rig.setDualArchonLasers(false, 0, 0, 0);
        callbacks.onTelegraphAudio('kestrel_overdrive');
        _center.set(spatial.x, F6_BASE_Y + 0.18, spatial.z);
        callbacks.spawnShockwave({
          center: _center.clone(),
          maxRadius: 15.0,
          expandSpeed: 18.0,
          damage: 22,
          color: 0xf97316,
          staggerStrength: 0.88,
        });
        rig.getWeakpointWorldPos(_center);
        callbacks.spawnPerilGlint(_center, 0xfde047);
        callbacks.spawnBoosterBurst(
          _center.set(spatial.x, spatial.y + 2.4, spatial.z),
          _ventDir.set(0, 1, 0),
          0xf97316,
          30
        );
        callbacks.showIntelCallout(
          'THE MONOLITH ARCHON · APEX OVERDRIVE',
          cfg.phase2Intel ?? 'PHASE 2 OVERDRIVE — PUNISH VENTING SINGULARITY CORE!',
          5.2
        );
      }

      // ── Core-Shatter Stagger State ──
      if (state.staggerTimer > 0) {
        if (!ai.wasStaggered) {
          ai.wasStaggered = true;
          rig.getWeakpointWorldPos(_center);
          callbacks.spawnPerilGlint(_center, 0xfef08a);
          callbacks.spawnBoosterBurst(
            _center,
            _ventDir.set(-Math.sin(spatial.yaw), 0.35, -Math.cos(spatial.yaw)).normalize(),
            isP2 ? 0xf97316 : 0xfde047,
            24
          );
          callbacks.spawnShockwave({
            center: new THREE.Vector3(spatial.x, F6_BASE_Y + 0.14, spatial.z),
            maxRadius: 7.2,
            expandSpeed: 15.5,
            damage: 0,
            color: 0xfde047,
            staggerStrength: 0,
          });
        }
        ai.phase = 'hover_stalk';
        rig.setDualArchonLasers(false, 0, 0, 0);
        rig.setArchonVisualState({
          stance: 'resonance_vent',
          phase2Aura: isP2 ? 0.6 : 0,
          shutterOpen: 1.0,
          scytheGlow: 0,
          scytheSwingAngle: 0,
          sanctuaryIntensity: 0.15,
          wingSpreadBoost: -0.25,
          pylonPitchBoost: -0.2,
          supernovaCharge: 0,
        });
        spatial.y += (F6_BASE_Y - 0.12 - spatial.y) * Math.min(1, dt * 4.5);
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
          weakpointExposed: true,
          weakpointBroken: state.weakpoint.broken,
          shieldActive: false,
          phase: state.phase,
          airborneHeight: Math.max(0, spatial.y - F6_BASE_Y),
        });
        return;
      }
      ai.wasStaggered = false;

      state.engaged = true;
      const dx = playerPos.x - spatial.x;
      const dy = playerPos.y + 1.2 - (spatial.y + 2.65);
      const dz = playerPos.z - spatial.z;
      const horizDist = Math.hypot(dx, dz);
      const hasLos = hasEnemyLineOfSight(
        spatial.x,
        spatial.y + 2.65,
        spatial.z,
        playerPos.x,
        playerPos.y + 1.35,
        playerPos.z,
        world
      );

      ai.timeWithoutLos = hasLos ? 0 : ai.timeWithoutLos + dt;
      ai.actionCooldown = Math.max(0, ai.actionCooldown - dt);
      ai.slamCooldown = Math.max(0, ai.slamCooldown - dt);
      ai.railCooldown = Math.max(0, ai.railCooldown - dt);
      ai.meteorCooldown = Math.max(0, ai.meteorCooldown - dt);
      ai.fanCooldown = Math.max(0, ai.fanCooldown - dt);
      ai.blinkCooldown = Math.max(0, ai.blinkCooldown - dt);
      ai.scytheCooldown = Math.max(0, ai.scytheCooldown - dt);
      ai.supernovaCooldown = Math.max(0, ai.supernovaCooldown - dt);
      ai.beamTickCooldown = Math.max(0, ai.beamTickCooldown - dt);
      ai.craterTickCooldown = Math.max(0, ai.craterTickCooldown - dt);

      const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);
      const aimPitch = Math.atan2(dy, Math.max(1, horizDist));
      const dirX = horizDist > 0.01 ? dx / horizDist : -Math.sin(spatial.yaw);
      const dirZ = horizDist > 0.01 ? dz / horizDist : -Math.cos(spatial.yaw);
      const rightX = -dirZ;
      const rightZ = dirX;

      let desVx = 0;
      let desVz = 0;
      let targetY = F6_BASE_Y + 0.65 + Math.sin(elapsed * 1.65) * 0.34;
      let attackProgress = 0;
      let lasersActive = false;

      // Visual state defaults per tick
      let visStance: ArchonBossStance = 'hover_stalk';
      let visShutter = 0;
      let visScytheGlow = 0;
      let visScytheSwing = 0;
      let visSanctuary = isP2 ? 0.55 : 0.28;
      let visWingBoost = 0;
      let visPylonPitch = 0;
      let visSupernova = 0;

      // ── State Machine: 8 Distinct AAA Sovereign Combat Maneuvers + Phase 2 Ascension ──
      if (ai.phase === 'phase2_ascension') {
        state.behavior = 'windup';
        visStance = 'supernova_cascade';
        ai.timer -= dt;
        const p = 1 - Math.max(0, ai.timer / ai.maxTimer);
        attackProgress = p;
        visSupernova = 0.55 + p * 0.95;
        visSanctuary = 1.15 + p * 0.4;
        visWingBoost = 0.2 + p * 0.42;
        visShutter = p < 0.72 ? p * 1.1 : Math.max(0, (1 - p) * 3.5);
        targetY = F6_BASE_Y + 0.95 + Math.sin(p * Math.PI) * 1.45;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 3.6, dt);
        ai.ventTick += dt;
        if (ai.ventTick >= 0.18) {
          ai.ventTick = 0;
          rig.getWeakpointWorldPos(_center);
          callbacks.spawnBoosterBurst(_center, _ventDir.set(0, 1, 0), 0xf97316, 12);
        }
        if (ai.timer <= 0) {
          callbacks.onTelegraphAudio('shield_slam');
          callbacks.spawnShockwave({
            center: new THREE.Vector3(spatial.x, F6_BASE_Y + 0.16, spatial.z),
            maxRadius: 13.5,
            expandSpeed: 19.0,
            damage: 18,
            color: 0xfde047,
            staggerStrength: 0.75,
          });
          ai.phase = 'hover_stalk';
          ai.actionCooldown = 0.22;
        }
      } else if (ai.phase === 'hover_stalk') {
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, isP2 ? 5.2 : 3.8, dt);

        if (ai.actionCooldown <= 0 || (horizDist <= 7.2 && (ai.slamCooldown <= 0 || ai.scytheCooldown <= 0))) {
          const next = selectArchonBossAction({
            horizDist,
            hasLos,
            phase: state.phase,
            timeWithoutLos: ai.timeWithoutLos,
            slamCooldown: ai.slamCooldown,
            railCooldown: ai.railCooldown,
            meteorCooldown: ai.meteorCooldown,
            fanCooldown: ai.fanCooldown,
            blinkCooldown: ai.blinkCooldown,
            scytheCooldown: ai.scytheCooldown,
            supernovaCooldown: ai.supernovaCooldown,
            roll: Math.random(),
          });

          if (next === 'cataclysm_gravity_slam') {
            ai.phase = 'slam_windup';
            ai.timer = isP2 ? 0.56 : 0.72;
            ai.maxTimer = ai.timer;
            ai.slamPulsesLeft = isP2 ? 3 : 1;
            callbacks.onTelegraphAudio('boss_slam');
            rig.getWeakpointWorldPos(_center);
            callbacks.spawnPerilGlint(_center, isP2 ? 0xf97316 : 0xfde047);
          } else if (next === 'seraphic_scythe_cleave') {
            ai.phase = 'scythe_windup';
            ai.timer = isP2 ? 0.38 : 0.5;
            ai.maxTimer = ai.timer;
            ai.scytheSwingsLeft = isP2 ? 3 : 2;
            ai.shotDelay = 0.02;
            callbacks.onTelegraphAudio('iaijutsu_glint');
            rig.getLeftPylonMuzzlePos(_muzzleL);
            rig.getRightPylonMuzzlePos(_muzzleR);
            callbacks.spawnPerilGlint(_muzzleL, isP2 ? 0xf97316 : 0xfbbf24);
            callbacks.spawnPerilGlint(_muzzleR, isP2 ? 0xf97316 : 0xfbbf24);
          } else if (next === 'dual_archon_rail_sweep') {
            ai.phase = 'rail_windup';
            ai.timer = isP2 ? 0.84 : 1.02;
            ai.maxTimer = ai.timer;
            ai.lockedYaw = targetYaw;
            ai.lockedPitch = aimPitch;
            callbacks.onTelegraphAudio('rail_charge');
            rig.getLeftPylonMuzzlePos(_muzzleL);
            rig.getRightPylonMuzzlePos(_muzzleR);
            callbacks.spawnPerilGlint(_muzzleL, 0xfde047);
            callbacks.spawnPerilGlint(_muzzleR, 0xfde047);
          } else if (next === 'meteor_shard_barrage') {
            ai.phase = 'meteor_windup';
            ai.timer = isP2 ? 0.48 : 0.62;
            ai.maxTimer = ai.timer;
            ai.meteorTargets = computeArchonMeteorTargets(
              playerPos.x,
              playerPos.y,
              playerPos.z,
              state.phase
            );
            callbacks.onTelegraphAudio('mortar');
          } else if (next === 'astral_fan_judgment') {
            ai.phase = 'fan_windup';
            ai.timer = isP2 ? 0.38 : 0.52;
            ai.maxTimer = ai.timer;
            ai.fanWavesLeft = isP2 ? 2 : 1;
            ai.shotDelay = 0;
            callbacks.onTelegraphAudio('pyro_flare');
          } else if (next === 'phase_blink_reposition') {
            ai.phase = 'blink_charge';
            ai.timer = 0.42;
            ai.maxTimer = 0.42;
            callbacks.onTelegraphAudio('dash');
            rig.getWeakpointWorldPos(_center);
            callbacks.spawnPerilGlint(_center, 0xc084fc);
          } else if (next === 'orbital_judgment_barrage') {
            ai.phase = 'supernova_charge';
            ai.timer = 1.02;
            ai.maxTimer = 1.02;
            ai.supernovaWavesLeft = 4;
            ai.shotDelay = 0.05;
            callbacks.onTelegraphAudio('kestrel_overdrive');
            rig.getWeakpointWorldPos(_center);
            callbacks.spawnPerilGlint(_center, 0xf97316);
          } else {
            ai.phase = 'lance_barrage';
            ai.shotsLeft = isP2 ? 14 : 8;
            ai.shotDelay = 0.06;
          }
        } else {
          state.behavior = 'strafe';
          const spd = isP2 ? cfg.sprintSpeed : cfg.moveSpeed;
          if (horizDist > cfg.preferredMaxRange) {
            desVx = dirX * spd;
            desVz = dirZ * spd;
          } else {
            desVx = rightX * ai.strafeSign * spd * 0.88 + dirX * spd * 0.22;
            desVz = rightZ * ai.strafeSign * spd * 0.88 + dirZ * spd * 0.22;
          }
        }
      } else if (ai.phase === 'slam_windup') {
        state.behavior = 'windup';
        visStance = 'cataclysm_ascend';
        visSanctuary = 1.05;
        visWingBoost = 0.38;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        targetY = F6_BASE_Y + 2.35;
        if (ai.timer <= 0) {
          ai.phase = 'slam_impact';
          ai.timer = 0.01;
          ai.maxTimer = isP2 ? 0.96 : 0.42;
        }
      } else if (ai.phase === 'slam_impact') {
        state.behavior = 'attack';
        visStance = 'cataclysm_slam';
        visSanctuary = 1.35;
        visWingBoost = 0.25;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        targetY = F6_BASE_Y + 0.1;
        if (ai.timer <= 0 && ai.slamPulsesLeft > 0) {
          const pulseIdx = (isP2 ? 3 : 1) - ai.slamPulsesLeft;
          ai.slamPulsesLeft -= 1;
          callbacks.onTelegraphAudio('shield_slam');
          _center.set(spatial.x, playerPos.y + 0.14, spatial.z);
          callbacks.spawnShockwave({
            center: _center.clone(),
            maxRadius: isP2 ? 11.5 + pulseIdx * 2.25 : 13.0,
            expandSpeed: isP2 ? 16.0 + pulseIdx * 1.4 : 14.8,
            damage: isP2 ? 28 : 26,
            color: pulseIdx % 2 === 0 ? (isP2 ? 0xf97316 : 0xc084fc) : 0xfde047,
            staggerStrength: 0.94,
          });
          callbacks.spawnBoosterBurst(
            _center.set(spatial.x, F6_BASE_Y + 0.45, spatial.z),
            _ventDir.set(0, 1, 0),
            isP2 ? 0xf97316 : 0xc084fc,
            18
          );
          if (ai.slamPulsesLeft > 0) {
            ai.timer = 0.32;
          } else {
            ai.slamCooldown = isP2 ? 5.2 : 6.8;
            startResonanceVent(ai, ctx, isP2, 3.0, 2.5);
          }
        }
      } else if (ai.phase === 'scythe_windup') {
        state.behavior = 'windup';
        visStance = 'scythe_cleave';
        visScytheGlow = 1.15;
        visSanctuary = 0.85;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.2, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        // Glide aggressively forward toward the player for close-quarters hard-light scythe pressure
        if (horizDist > 3.4) {
          const lungeSpd = isP2 ? 12.2 : 9.8;
          desVx = dirX * lungeSpd;
          desVz = dirZ * lungeSpd;
        }
        if (ai.timer <= 0) {
          ai.phase = 'scythe_combo';
          ai.timer = isP2 ? 0.96 : 0.68;
          ai.maxTimer = ai.timer;
          ai.shotDelay = 0.01;
        }
      } else if (ai.phase === 'scythe_combo') {
        state.behavior = 'attack';
        visStance = 'scythe_cleave';
        visScytheGlow = 1.4;
        visSanctuary = 1.0;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 4.6, dt);
        ai.timer -= dt;
        ai.shotDelay -= dt;
        const p = 1 - Math.max(0, ai.timer / ai.maxTimer);
        attackProgress = p;
        const swingPhase = Math.sin(p * Math.PI * (isP2 ? 3 : 2));
        visScytheSwing = swingPhase * 0.72;

        if (horizDist > 3.2) {
          desVx = dirX * (isP2 ? 7.8 : 6.2);
          desVz = dirZ * (isP2 ? 7.8 : 6.2);
        }

        if (ai.shotDelay <= 0 && ai.scytheSwingsLeft > 0) {
          const swingIdx = (isP2 ? 3 : 2) - ai.scytheSwingsLeft;
          ai.scytheSwingsLeft -= 1;
          ai.shotDelay = isP2 ? 0.28 : 0.32;
          const spinSign = swingIdx % 2 === 0 ? 1 : -1;
          const isHeavyFinish = ai.scytheSwingsLeft === 0;
          const slashOrigin = _center.set(
            spatial.x - Math.sin(spatial.yaw) * 1.1,
            spatial.y + 1.85,
            spatial.z - Math.cos(spatial.yaw) * 1.1
          );
          const slashColor = isHeavyFinish ? 0xf97316 : isP2 ? 0xfde047 : 0xe879f9;
          callbacks.onKatanaSlashAudio?.(isHeavyFinish);
          callbacks.spawnBladeSlashArc(
            slashOrigin,
            spatial.yaw,
            spinSign * (isHeavyFinish ? 0.12 : 0.42),
            isHeavyFinish ? 0.08 : -0.14,
            isHeavyFinish ? 5.2 : 4.5,
            slashColor,
            true,
            spinSign
          );
          if (isHeavyFinish && isP2) {
            // Twin X-Cross finishing slash arc in Phase 2!
            callbacks.spawnBladeSlashArc(
              slashOrigin,
              spatial.yaw,
              -spinSign * 0.42,
              0.14,
              5.2,
              0xfde047,
              true,
              -spinSign
            );
          }
          callbacks.spawnSurfaceSlashScar(
            _target.set(
              spatial.x - Math.sin(spatial.yaw) * 2.8,
              F6_BASE_Y + 0.04,
              spatial.z - Math.cos(spatial.yaw) * 2.8
            ),
            _slashUp,
            _aimDir.set(-Math.sin(spatial.yaw), 0, -Math.cos(spatial.yaw)),
            true
          );

          // Fair melee damage check respecting [V] dodge roll i-frames!
          if (!playerRolling && horizDist <= (isHeavyFinish ? 5.5 : 4.9)) {
            const toPX = dx / Math.max(0.01, horizDist);
            const toPZ = dz / Math.max(0.01, horizDist);
            const fwdDot = toPX * -Math.sin(spatial.yaw) + toPZ * -Math.cos(spatial.yaw);
            if (fwdDot > 0.15 || horizDist <= 2.6) {
              callbacks.applyPlayerMeleeHit(
                isHeavyFinish ? (isP2 ? 32 : 26) : isP2 ? 22 : 18,
                _center.set(spatial.x, spatial.y + 1.9, spatial.z),
                isHeavyFinish ? 0.92 : 0.58
              );
            }
          }
        }
        if (ai.timer <= 0) {
          ai.scytheCooldown = isP2 ? 4.8 : 6.4;
          ai.phase = 'hover_stalk';
          ai.actionCooldown = isP2 ? 0.75 : 1.05;
          ai.strafeSign *= -1;
        }
      } else if (ai.phase === 'rail_windup') {
        state.behavior = 'windup';
        visStance = 'rail_scissor';
        visSanctuary = 0.95;
        ai.timer -= dt;
        const charge = 1 - Math.max(0, ai.timer / ai.maxTimer);
        attackProgress = charge;

        if (charge < 0.75) {
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, isP2 ? 4.8 : 3.6, dt);
          ai.lockedYaw = spatial.yaw;
          ai.lockedPitch = aimPitch;
        }

        const offL = computeArchonScissorSweepYaw(0, -1, state.phase);
        const offR = computeArchonScissorSweepYaw(0, 1, state.phase);
        rig.root.updateMatrixWorld(true);
        rig.getLeftPylonMuzzlePos(_muzzleL);
        rig.getRightPylonMuzzlePos(_muzzleR);
        const cp = Math.cos(ai.lockedPitch);
        const sy = Math.sin(ai.lockedPitch);
        const yawL = ai.lockedYaw + offL;
        const yawR = ai.lockedYaw + offR;
        _rayDirL.set(-Math.sin(yawL) * cp, sy, -Math.cos(yawL) * cp).normalize();
        _rayDirR.set(-Math.sin(yawR) * cp, sy, -Math.cos(yawR) * cp).normalize();

        const maxLen = 46;
        const leftLen = raycastCollisionWorld3D(
          _muzzleL.x,
          _muzzleL.y,
          _muzzleL.z,
          _muzzleL.x + _rayDirL.x * maxLen,
          _muzzleL.y + _rayDirL.y * maxLen,
          _muzzleL.z + _rayDirL.z * maxLen,
          world,
          _rayHitL
        )
          ? _rayHitL.t * maxLen
          : maxLen;
        const rightLen = raycastCollisionWorld3D(
          _muzzleR.x,
          _muzzleR.y,
          _muzzleR.z,
          _muzzleR.x + _rayDirR.x * maxLen,
          _muzzleR.y + _rayDirR.y * maxLen,
          _muzzleR.z + _rayDirR.z * maxLen,
          world,
          _rayHitR
        )
          ? _rayHitR.t * maxLen
          : maxLen;

        lasersActive = true;
        rig.setDualArchonLasers(true, leftLen, rightLen, charge, false, offL, offR);

        if (ai.timer <= 0) {
          ai.phase = 'rail_fire';
          ai.timer = isP2 ? 1.25 : 1.05;
          ai.maxTimer = ai.timer;
          callbacks.onFireAudio('rail_slug');
        }
      } else if (ai.phase === 'rail_fire') {
        state.behavior = 'attack';
        visStance = 'rail_scissor';
        visSanctuary = 1.25;
        ai.timer -= dt;
        const sweepP = 1 - Math.max(0, ai.timer / ai.maxTimer);
        attackProgress = sweepP;

        // Smooth Scissor-Cross beam convergence sweeping inward across the Cathedral!
        const offL = computeArchonScissorSweepYaw(sweepP, -1, state.phase);
        const offR = computeArchonScissorSweepYaw(sweepP, 1, state.phase);
        rig.root.updateMatrixWorld(true);
        rig.getLeftPylonMuzzlePos(_muzzleL);
        rig.getRightPylonMuzzlePos(_muzzleR);
        const cp = Math.cos(ai.lockedPitch);
        const sy = Math.sin(ai.lockedPitch);
        const yawL = ai.lockedYaw + offL;
        const yawR = ai.lockedYaw + offR;
        _rayDirL.set(-Math.sin(yawL) * cp, sy, -Math.cos(yawL) * cp).normalize();
        _rayDirR.set(-Math.sin(yawR) * cp, sy, -Math.cos(yawR) * cp).normalize();

        const maxLen = 46;
        const hitL = raycastCollisionWorld3D(
          _muzzleL.x,
          _muzzleL.y,
          _muzzleL.z,
          _muzzleL.x + _rayDirL.x * maxLen,
          _muzzleL.y + _rayDirL.y * maxLen,
          _muzzleL.z + _rayDirL.z * maxLen,
          world,
          _rayHitL
        );
        const hitR = raycastCollisionWorld3D(
          _muzzleR.x,
          _muzzleR.y,
          _muzzleR.z,
          _muzzleR.x + _rayDirR.x * maxLen,
          _muzzleR.y + _rayDirR.y * maxLen,
          _muzzleR.z + _rayDirR.z * maxLen,
          world,
          _rayHitR
        );
        const leftLen = hitL ? _rayHitL.t * maxLen : maxLen;
        const rightLen = hitR ? _rayHitR.t * maxLen : maxLen;

        lasersActive = true;
        rig.setDualArchonLasers(true, leftLen, rightLen, 1.15, true, offL, offR);

        // Live scorched craters along Cathedral geometry
        if (ai.craterTickCooldown <= 0) {
          ai.craterTickCooldown = 0.14;
          if (hitL) {
            callbacks.spawnRailImpactCrater(_rayHitL.point, _rayHitL.normal, isP2 ? 0xf97316 : 0xf59e0b);
          }
          if (hitR) {
            callbacks.spawnRailImpactCrater(_rayHitR.point, _rayHitR.normal, isP2 ? 0xf97316 : 0xf59e0b);
          }
        }

        // Continuous scissor-beam burn check (respects [V] dodge roll i-frames!)
        if (!playerRolling && ai.beamTickCooldown <= 0) {
          _toPlayer.set(playerPos.x, playerPos.y + 1.05, playerPos.z);
          const dSqL = pointToRaySegmentDistSq(
            _toPlayer.x,
            _toPlayer.y,
            _toPlayer.z,
            _muzzleL.x,
            _muzzleL.y,
            _muzzleL.z,
            _rayDirL.x,
            _rayDirL.y,
            _rayDirL.z,
            leftLen
          );
          const dSqR = pointToRaySegmentDistSq(
            _toPlayer.x,
            _toPlayer.y,
            _toPlayer.z,
            _muzzleR.x,
            _muzzleR.y,
            _muzzleR.z,
            _rayDirR.x,
            _rayDirR.y,
            _rayDirR.z,
            rightLen
          );
          if (dSqL <= 0.72 * 0.72 || dSqR <= 0.72 * 0.72) {
            ai.beamTickCooldown = 0.24;
            callbacks.applyPlayerMeleeHit(
              isP2 ? 15 : 12,
              _center.set(spatial.x, spatial.y + 2.4, spatial.z),
              0.45
            );
          }
        }

        if (ai.timer <= 0) {
          // Finale twin Overcharged Rail-Slugs at end of scissor sweep!
          const fireFinaleSlug = (origin: THREE.Vector3) => {
            _aimDir
              .set(playerPos.x - origin.x, playerPos.y + 1.15 - origin.y, playerPos.z - origin.z)
              .normalize();
            callbacks.spawnMuzzleFlash(origin, _aimDir, isP2 ? 0xf97316 : 0xfde047, true);
            callbacks.spawnProjectile({
              origin: origin.clone(),
              direction: _aimDir.clone(),
              speed: isP2 ? 104 : 92,
              damage: isP2 ? 24 : 20,
              radius: 0.2,
              color: isP2 ? 0xf97316 : 0xfde047,
              kind: 'rail_slug',
              staggerStrength: 0.72,
            });
          };
          callbacks.onFireAudio('rail_slug');
          fireFinaleSlug(_muzzleL);
          fireFinaleSlug(_muzzleR);
          rig.setDualArchonLasers(false, 0, 0, 0);
          ai.railCooldown = isP2 ? 5.6 : 7.2;
          startResonanceVent(ai, ctx, isP2, 3.1, 2.55);
        }
      } else if (ai.phase === 'meteor_windup') {
        state.behavior = 'windup';
        visStance = 'meteor_salvo';
        visPylonPitch = 0.65;
        visWingBoost = 0.28;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 3.8, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.phase = 'meteor_salvo';
          ai.shotsLeft = ai.meteorTargets.length || (isP2 ? 7 : 4);
          ai.shotDelay = 0.04;
        }
      } else if (ai.phase === 'meteor_salvo') {
        state.behavior = 'attack';
        visStance = 'meteor_salvo';
        visPylonPitch = 0.72;
        visWingBoost = 0.24;
        ai.shotDelay -= dt;
        attackProgress = 1 - ai.shotsLeft / Math.max(1, ai.meteorTargets.length);
        if (ai.shotDelay <= 0 && ai.shotsLeft > 0) {
          const idx = Math.max(0, ai.meteorTargets.length - ai.shotsLeft);
          ai.shotsLeft -= 1;
          ai.shotDelay = isP2 ? 0.14 : 0.2;
          if (idx % 3 === 0) rig.getLeftPylonMuzzlePos(_muzzle);
          else if (idx % 3 === 1) rig.getRightPylonMuzzlePos(_muzzle);
          else rig.getFunnelMuzzlePos(idx, _muzzle);

          const tp = ai.meteorTargets[idx] ?? { x: playerPos.x, y: playerPos.y + 0.1, z: playerPos.z };
          _target.set(tp.x, tp.y, tp.z);
          const gravity = 16.2;
          const distToTgt = Math.hypot(_target.x - _muzzle.x, _target.z - _muzzle.z);
          const flightTime = Math.max(0.75, Math.min(1.45, distToTgt / 14.5));
          const vx = (_target.x - _muzzle.x) / flightTime;
          const vz = (_target.z - _muzzle.z) / flightTime;
          const vy = (_target.y - _muzzle.y + 0.5 * gravity * flightTime * flightTime) / flightTime;
          _aimDir.set(vx, vy, vz);
          const speed = _aimDir.length();
          _aimDir.normalize();
          const meteorColor = isP2 ? 0xf97316 : 0xc084fc;
          callbacks.spawnBoosterBurst(_muzzle, _aimDir, meteorColor, 11);
          callbacks.spawnPerilGlint(_muzzle, 0xfde047);
          callbacks.onFireAudio('mortar');
          // Readable ground impact telegraph pulse ring at landing target
          callbacks.spawnShockwave({
            center: new THREE.Vector3(_target.x, F6_BASE_Y + 0.08, _target.z),
            maxRadius: 3.6,
            expandSpeed: 10.5,
            damage: 0,
            color: meteorColor,
            staggerStrength: 0,
          });
          callbacks.spawnProjectile({
            origin: _muzzle.clone(),
            direction: _aimDir.clone(),
            speed,
            damage: isP2 ? 26 : 22,
            radius: 0.24,
            color: meteorColor,
            kind: 'mortar_canister',
            gravity,
            splashRadius: 4.1,
            targetPos: _target.clone(),
            staggerStrength: 0.72,
          });
        }
        if (ai.shotsLeft <= 0) {
          ai.meteorCooldown = isP2 ? 5.6 : 7.4;
          startResonanceVent(ai, ctx, isP2, 3.1, 2.55);
        }
      } else if (ai.phase === 'fan_windup') {
        state.behavior = 'windup';
        visStance = 'astral_fan';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 4.6, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.phase = 'fan_fire';
          ai.timer = isP2 ? 0.62 : 0.34;
          ai.maxTimer = ai.timer;
          ai.shotDelay = 0.01;
        }
      } else if (ai.phase === 'fan_fire') {
        state.behavior = 'attack';
        visStance = 'astral_fan';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 4.0, dt);
        ai.timer -= dt;
        ai.shotDelay -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);

        if (ai.shotDelay <= 0 && ai.fanWavesLeft > 0) {
          const waveIdx = (isP2 ? 2 : 1) - ai.fanWavesLeft;
          ai.fanWavesLeft -= 1;
          ai.shotDelay = 0.28;
          const dirs = computeArchonFanDirections(spatial.yaw, aimPitch, state.phase, waveIdx);
          rig.getLeftPylonMuzzlePos(_muzzleL);
          rig.getRightPylonMuzzlePos(_muzzleR);
          callbacks.onFireAudio('shotgun');
          dirs.forEach((d, idx) => {
            const origin =
              idx === 0
                ? rig.getFunnelMuzzlePos(0, _muzzle).clone()
                : idx === dirs.length - 1
                  ? rig.getFunnelMuzzlePos(2, _muzzle).clone()
                  : idx < dirs.length / 2
                    ? _muzzleL.clone()
                    : _muzzleR.clone();
            callbacks.spawnProjectile({
              origin,
              direction: new THREE.Vector3(d.x, d.y, d.z),
              speed: isP2 ? 42 : 35,
              damage: isP2 ? 19 : 16,
              radius: 0.2,
              color: waveIdx % 2 === 1 ? 0xfde047 : isP2 ? 0xf97316 : 0xe879f9,
              kind: 'plasma_bolt',
              staggerStrength: 0.42,
            });
          });
        }
        if (ai.timer <= 0) {
          ai.fanCooldown = isP2 ? 4.2 : 5.6;
          ai.phase = 'hover_stalk';
          ai.actionCooldown = isP2 ? 0.85 : 1.25;
          ai.strafeSign *= -1;
        }
      } else if (ai.phase === 'lance_barrage') {
        state.behavior = 'attack';
        visStance = 'lance_barrage';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 3.8, dt);
        desVx = rightX * ai.strafeSign * (isP2 ? 4.8 : 3.2);
        desVz = rightZ * ai.strafeSign * (isP2 ? 4.8 : 3.2);
        ai.shotDelay -= dt;
        attackProgress = 1 - ai.shotsLeft / (isP2 ? 14 : 8);
        if (ai.shotDelay <= 0 && ai.shotsLeft > 0) {
          const slot = ai.shotsLeft % 4;
          ai.shotsLeft -= 1;
          ai.shotDelay = isP2 ? 0.11 : 0.15;
          if (slot === 0) rig.getLeftPylonMuzzlePos(_muzzle);
          else if (slot === 1) rig.getRightPylonMuzzlePos(_muzzle);
          else rig.getFunnelMuzzlePos(slot, _muzzle);

          _aimDir
            .set(
              playerPos.x - _muzzle.x + (Math.random() - 0.5) * 0.55,
              playerPos.y + 1.18 - _muzzle.y + (Math.random() - 0.5) * 0.24,
              playerPos.z - _muzzle.z + (Math.random() - 0.5) * 0.55
            )
            .normalize();
          callbacks.spawnMuzzleFlash(_muzzle, _aimDir, 0xfde047, true);
          callbacks.onFireAudio('boss_carbine');
          callbacks.spawnProjectile({
            origin: _muzzle.clone(),
            direction: _aimDir.clone(),
            speed: isP2 ? 49 : 43,
            damage: isP2 ? 16 : 14,
            radius: 0.17,
            color: isP2 ? 0xf97316 : 0xc084fc,
            kind: 'boss_overdrive',
            staggerStrength: 0.26,
          });
        }
        if (ai.shotsLeft <= 0) {
          startResonanceVent(ai, ctx, isP2, 2.9, 2.4);
        }
      } else if (ai.phase === 'blink_charge') {
        state.behavior = 'windup';
        visStance = 'phase_blink';
        visSanctuary = 1.1;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          // Vanish implosion burst at old spot
          callbacks.spawnBoosterBurst(
            _center.set(spatial.x, spatial.y + 2.2, spatial.z),
            _ventDir.set(0, 1, 0),
            0xc084fc,
            18
          );
          const pick = pickArchonBlinkDestination(
            spatial.x,
            spatial.z,
            playerPos.x,
            playerPos.z,
            Math.random()
          );
          spatial.x = pick.x;
          spatial.z = pick.z;
          spatial.yaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);
          callbacks.spawnBoosterBurst(
            _center.set(spatial.x, spatial.y + 2.2, spatial.z),
            _ventDir.set(0, 1, 0),
            isP2 ? 0xf97316 : 0xfde047,
            22
          );
          ai.blinkCooldown = isP2 ? 5.0 : 7.0;

          // Phase 2 aggressive post-blink chain into Scythe Ambush or Fan Judgment!
          const postDist = Math.hypot(playerPos.x - spatial.x, playerPos.z - spatial.z);
          if (isP2 && postDist <= 10.5 && ai.scytheCooldown <= 0) {
            ai.phase = 'scythe_windup';
            ai.timer = 0.36;
            ai.maxTimer = 0.36;
            ai.scytheSwingsLeft = 3;
            callbacks.onTelegraphAudio('iaijutsu_glint');
          } else if (isP2) {
            ai.phase = 'fan_windup';
            ai.timer = 0.34;
            ai.maxTimer = 0.34;
            ai.fanWavesLeft = 2;
            callbacks.onTelegraphAudio('pyro_flare');
          } else {
            ai.phase = 'hover_stalk';
            ai.actionCooldown = 0.42;
          }
        }
      } else if (ai.phase === 'supernova_charge') {
        state.behavior = 'windup';
        visStance = 'supernova_cascade';
        visSupernova = 1.0;
        visSanctuary = 1.35;
        visWingBoost = 0.48;
        visShutter = 0.45;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 3.2, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        targetY = F6_BASE_Y + 2.65;
        if (ai.timer <= 0) {
          ai.phase = 'supernova_cascade';
          ai.timer = 2.25;
          ai.maxTimer = 2.25;
          ai.supernovaWavesLeft = 4;
          ai.shotDelay = 0.02;
        }
      } else if (ai.phase === 'supernova_cascade') {
        state.behavior = 'attack';
        visStance = 'supernova_cascade';
        visSupernova = 1.35;
        visSanctuary = 1.5;
        visWingBoost = 0.52;
        visShutter = 0.85;
        targetY = F6_BASE_Y + 2.5;
        ai.timer -= dt;
        ai.shotDelay -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        spatial.yaw += dt * 1.15;

        if (ai.shotDelay <= 0 && ai.supernovaWavesLeft > 0) {
          const waveNum = 4 - ai.supernovaWavesLeft;
          ai.supernovaWavesLeft -= 1;
          ai.shotDelay = 0.52;

          // 360° rotating Spiral of 10 Sovereign Overdrive Orbs
          const ringDirs = computeArchonSupernovaRing(10, waveNum * 0.32, -0.18);
          rig.getWeakpointWorldPos(_center);
          callbacks.onFireAudio('boss_carbine');
          for (const rd of ringDirs) {
            callbacks.spawnProjectile({
              origin: _center.clone(),
              direction: new THREE.Vector3(rd.x, rd.y, rd.z),
              speed: 28,
              damage: 16,
              radius: 0.21,
              color: waveNum % 2 === 0 ? 0xf97316 : 0xfde047,
              kind: 'boss_overdrive',
              staggerStrength: 0.35,
            });
          }

          // Expanding Cathedral Solar Shockwave on waves 0 & 2!
          if (waveNum === 0 || waveNum === 2) {
            callbacks.onTelegraphAudio('shield_slam');
            callbacks.spawnShockwave({
              center: new THREE.Vector3(spatial.x, F6_BASE_Y + 0.16, spatial.z),
              maxRadius: 15.8,
              expandSpeed: 16.5,
              damage: 24,
              color: waveNum === 0 ? 0xf97316 : 0xfde047,
              staggerStrength: 0.82,
            });
          }

          // Targeted sky meteor on waves 1 & 3 to keep player moving!
          if (waveNum === 1 || waveNum === 3) {
            rig.getFunnelMuzzlePos(waveNum, _muzzle);
            _target.set(playerPos.x, playerPos.y + 0.1, playerPos.z);
            const g = 16.2;
            const ft = 1.05;
            _aimDir.set(
              (_target.x - _muzzle.x) / ft,
              (_target.y - _muzzle.y + 0.5 * g * ft * ft) / ft,
              (_target.z - _muzzle.z) / ft
            );
            const spd = _aimDir.length();
            _aimDir.normalize();
            callbacks.onFireAudio('mortar');
            callbacks.spawnBoosterBurst(_muzzle, _aimDir, 0xf97316, 10);
            callbacks.spawnShockwave({
              center: new THREE.Vector3(_target.x, F6_BASE_Y + 0.08, _target.z),
              maxRadius: 3.8,
              expandSpeed: 10.5,
              damage: 0,
              color: 0xf97316,
              staggerStrength: 0,
            });
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _aimDir.clone(),
              speed: spd,
              damage: 24,
              radius: 0.25,
              color: 0xf97316,
              kind: 'mortar_canister',
              gravity: g,
              splashRadius: 4.2,
              targetPos: _target.clone(),
              staggerStrength: 0.75,
            });
          }
        }
        if (ai.timer <= 0) {
          ai.supernovaCooldown = 13.5;
          // Generous post-ultimate Overheat Vent Window rewarding players who survived the storm!
          startResonanceVent(ai, ctx, isP2, 3.6, 3.4);
        }
      } else if (ai.phase === 'resonance_vent') {
        state.behavior = 'recover';
        visStance = 'resonance_vent';
        visShutter = 1.0;
        visSanctuary = 0.45;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 1.9, dt);
        targetY = F6_BASE_Y + 0.25;
        ai.timer -= dt;
        ai.ventTick += dt;
        if (ai.ventTick >= 0.22) {
          ai.ventTick = 0;
          rig.getWeakpointWorldPos(_center);
          callbacks.spawnBoosterBurst(_center, _ventDir.set(0, 0.85, -0.45).normalize(), 0xfde047, 7);
        }
        if (ai.timer <= 0) {
          ai.phase = 'hover_stalk';
          ai.strafeSign *= -1;
        }
      }

      if (!lasersActive) {
        rig.setDualArchonLasers(false, 0, 0, 0);
      }

      rig.setArchonVisualState({
        stance: visStance,
        phase2Aura: isP2 ? 1.0 : 0,
        shutterOpen: visShutter,
        scytheGlow: visScytheGlow,
        scytheSwingAngle: visScytheSwing,
        sanctuaryIntensity: visSanctuary,
        wingSpreadBoost: visWingBoost,
        pylonPitchBoost: visPylonPitch,
        supernovaCharge: visSupernova,
      });

      // Smooth sovereign hovering movement confined cleanly to Monolith Cathedral bounds
      const blend = 1 - Math.exp(-5.8 * dt);
      spatial.vx += (desVx - spatial.vx) * blend;
      spatial.vz += (desVz - spatial.vz) * blend;
      resolveWorldHorizontal3D(
        spatial.x + spatial.vx * dt,
        spatial.z + spatial.vz * dt,
        spatial.y + 1.0,
        spatial.radius,
        world,
        _horizScratch,
        spatial.height,
        0.2
      );
      spatial.x = Math.max(-14.5, Math.min(14.5, _horizScratch.x));
      spatial.z = Math.max(-8.2, Math.min(8.2, _horizScratch.z));
      spatial.y += (targetY - spatial.y) * Math.min(1, dt * 3.8);
      spatial.grounded = false;

      const speed = Math.hypot(spatial.vx, spatial.vz);
      rig.updateAnimation({
        dt,
        elapsed,
        behavior: state.behavior,
        speedRatio: speed / cfg.moveSpeed,
        localMoveX: 0,
        localMoveZ: speed / cfg.moveSpeed,
        aimPitch,
        attackProgress,
        attackVariant: 0,
        flinchTimer: state.flinchTimer,
        flinchDirX: state.flinchDirX,
        staggerTimer: 0,
        deadProgress: 0,
        weakpointExposed: state.weakpoint.exposed,
        weakpointBroken: state.weakpoint.broken,
        shieldActive: false,
        phase: state.phase,
        airborneHeight: Math.max(0, spatial.y - F6_BASE_Y),
      });
    },
  };
}
