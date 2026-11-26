import * as THREE from 'three';
import {
  resolveSupportHeight3D,
  resolveWorldHorizontal3D,
  type HorizResolveResult,
} from '../../../arena/hideout/hideoutCollision';
import { F6_TRENCH_Y } from '../../../arena/hideout/floors/floor06/layout';
import type { CollisionWorld3D } from '../../../arena/hideout/types';
import type { EnemyAiStepContext, EnemyArchetypeBrain } from '../../core/enemyManager';
import {
  computeFacingYaw,
  hasEnemyLineOfSight,
  raycastCollisionWorld3D,
  rotateYawTowards,
  stepEnemyMovement,
  type WorldRaycastHit,
} from '../../core/enemyNav';
import type { Floor06EnemyMaterials } from '../materials';
import { PHASE_BLINK_WARDEN_CONFIG } from './config';
import { buildPhaseBlinkWardenRig, type PhaseBlinkWardenRigHandle } from './mesh';
import {
  computeAmbushBlinkTarget,
  computeBlinkFlankTarget,
  computeRiftArcFanAngles,
  selectWardenAction,
  solveVoidSnareArc,
} from './tactics';
import {
  createPhaseBlinkWardenTextures,
  type PhaseBlinkWardenTextureSuite,
} from './textures';

const F6_MIN_FLOOR_Y = F6_TRENCH_Y - 0.6;

type WardenPhase =
  | 'patrol'
  | 'maneuver'
  | 'blink_charge'
  | 'ambush_charge'
  | 'ambush_arrive'
  | 'burst_fire'
  | 'rift_windup'
  | 'rift_fire'
  | 'snare_windup'
  | 'snare_throw'
  | 'slash_windup'
  | 'slash_strike_1'
  | 'slash_strike_2'
  | 'recover';

interface WardenAiState {
  phase: WardenPhase;
  timer: number;
  maxTimer: number;
  patrolIdx: number;
  strafeSign: number;
  blinkCooldown: number;
  ambushCooldown: number;
  burstCooldown: number;
  riftBarrageCooldown: number;
  snareCooldown: number;
  slashCooldown: number;
  timeWithoutLos: number;
  shotsLeft: number;
  shotDelay: number;
  nextHand: -1 | 1;
  hitDone: boolean;
  riftFadeTimer: number;
  snareTargetX: number;
  snareTargetY: number;
  snareTargetZ: number;
}

const _muzzle = new THREE.Vector3();
const _glint = new THREE.Vector3();
const _aimDir = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _exhaustDir = new THREE.Vector3();
const _slashDir = new THREE.Vector3();
const _scarPos = new THREE.Vector3();
const _scarNorm = new THREE.Vector3();
const _horizScratch: HorizResolveResult = { x: 0, z: 0, collided: false };
const _rayHitScratch: WorldRaycastHit = {
  hit: false,
  t: 1,
  point: new THREE.Vector3(),
  normal: new THREE.Vector3(),
};

/**
 * Validates a spatial blink destination so the Phase-Blink Warden never teleports inside walls,
 * through solid dividers, or off elevated Floor 06 ledges into empty voids.
 */
function tryValidateBlinkDest(
  fromX: number,
  fromY: number,
  fromZ: number,
  candX: number,
  candZ: number,
  radius: number,
  height: number,
  world: CollisionWorld3D
): { ok: boolean; x: number; y: number; z: number } {
  for (const frac of [1.0, 0.65]) {
    const tx = fromX + (candX - fromX) * frac;
    const tz = fromZ + (candZ - fromZ) * frac;

    // Prevent teleporting cleanly through solid room walls
    const blocked = raycastCollisionWorld3D(
      fromX,
      fromY + 1.15,
      fromZ,
      tx,
      fromY + 1.15,
      tz,
      world,
      _rayHitScratch
    );
    if (blocked && _rayHitScratch.t < 0.88) continue;

    resolveWorldHorizontal3D(tx, tz, fromY, radius, world, _horizScratch, height, 0.35);
    if (_horizScratch.collided) continue;

    const supportY = resolveSupportHeight3D(_horizScratch.x, _horizScratch.z, fromY, world, 0.85);
    if (supportY !== null && supportY >= F6_MIN_FLOOR_Y && Math.abs(supportY - fromY) <= 1.2) {
      return { ok: true, x: _horizScratch.x, y: supportY, z: _horizScratch.z };
    }
  }
  return { ok: false, x: fromX, y: fromY, z: fromZ };
}

export function createPhaseBlinkWardenBrain(mats: Floor06EnemyMaterials): EnemyArchetypeBrain {
  let cachedTextures: PhaseBlinkWardenTextureSuite | null = null;

  return {
    config: PHASE_BLINK_WARDEN_CONFIG,
    createRig: (enemyId) => {
      if (!cachedTextures) {
        cachedTextures = createPhaseBlinkWardenTextures();
      }
      return buildPhaseBlinkWardenRig(enemyId, mats, cachedTextures);
    },
    createAiState: (): Record<string, unknown> => ({
      phase: 'patrol',
      timer: 0,
      maxTimer: 1,
      patrolIdx: 0,
      strafeSign: Math.random() < 0.5 ? -1 : 1,
      blinkCooldown: 2.0 + Math.random() * 1.4,
      ambushCooldown: 5.5 + Math.random() * 2.2,
      burstCooldown: 0.9 + Math.random() * 0.7,
      riftBarrageCooldown: 3.4 + Math.random() * 1.6,
      snareCooldown: 4.5 + Math.random() * 1.8,
      slashCooldown: 0.4,
      timeWithoutLos: 0,
      shotsLeft: 0,
      shotDelay: 0,
      nextHand: 1,
      hitDone: false,
      riftFadeTimer: 0,
      snareTargetX: 0,
      snareTargetY: 0,
      snareTargetZ: 0,
    }),
    stepAi: (ctx: EnemyAiStepContext) => {
      const ai = ctx.aiState as unknown as WardenAiState;
      const { dt, elapsed, state, spatial, playerPos, world, callbacks, patrolPoints } = ctx;
      const rig = ctx.rig as PhaseBlinkWardenRigHandle;
      const cfg = PHASE_BLINK_WARDEN_CONFIG;

      ai.blinkCooldown = Math.max(0, ai.blinkCooldown - dt);
      ai.ambushCooldown = Math.max(0, ai.ambushCooldown - dt);
      ai.burstCooldown = Math.max(0, ai.burstCooldown - dt);
      ai.riftBarrageCooldown = Math.max(0, ai.riftBarrageCooldown - dt);
      ai.snareCooldown = Math.max(0, ai.snareCooldown - dt);
      ai.slashCooldown = Math.max(0, ai.slashCooldown - dt);
      ai.riftFadeTimer = Math.max(0, ai.riftFadeTimer - dt);

      // Staggered / Phase-Anchor Gyro Shattered punish window
      if (state.staggerTimer > 0) {
        ai.phase = 'maneuver';
        rig.setWardenVisualState({
          bladeExtend: 0.14,
          riftIntensity: 0,
          phaseFade: 0,
          casterCharge: 0,
          gyroAlert: 0,
        });
        // Sputtering golden-violet sparks from damaged chest gyro
        if (Math.random() < dt * 7.5) {
          rig.getWeakpointWorldPos(_glint);
          callbacks.spawnBoosterBurst(
            _glint,
            _exhaustDir
              .set((Math.random() - 0.5) * 0.8, 0.7, (Math.random() - 0.5) * 0.8)
              .normalize(),
            0xfbbf24,
            3
          );
        }
        stepEnemyMovement(spatial, 0, 0, world, dt, F6_MIN_FLOOR_Y);
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
          phase: 1,
          airborneHeight: 0,
        });
        return;
      }

      const dx = playerPos.x - spatial.x;
      const dy = playerPos.y + 1.18 - (spatial.y + 1.44);
      const dz = playerPos.z - spatial.z;
      const rawDist = Math.hypot(dx, dz);
      const horizDist = Number.isFinite(rawDist) ? rawDist : 10;

      const hasLos =
        horizDist <= cfg.detectRange &&
        hasEnemyLineOfSight(
          spatial.x,
          spatial.y + 1.55,
          spatial.z,
          playerPos.x,
          playerPos.y + 1.3,
          playerPos.z,
          world
        );

      if (hasLos || horizDist < 15.5 || state.hp < state.maxHp) {
        state.engaged = true;
      }
      if (state.engaged) {
        ai.timeWithoutLos = hasLos ? 0 : ai.timeWithoutLos + dt;
      }

      const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);
      const aimPitch = Math.atan2(dy, Math.max(1, horizDist));
      const dirX = horizDist > 0.01 ? dx / horizDist : -Math.sin(spatial.yaw);
      const dirZ = horizDist > 0.01 ? dz / horizDist : -Math.cos(spatial.yaw);
      const rightX = -dirZ;
      const rightZ = dirX;

      let desVx = 0;
      let desVz = 0;
      let attackProgress = 0;
      let attackVariant = 0;
      let bladeExtend = 0.18;
      let riftIntensity = ai.riftFadeTimer > 0 ? ai.riftFadeTimer / 0.55 : 0;
      let phaseFade = ai.riftFadeTimer > 0 ? (ai.riftFadeTimer / 0.55) * 0.7 : 0;
      let casterCharge = 0;
      let gyroAlert = 0;

      if (!state.engaged) {
        state.behavior = 'patrol';
        if (patrolPoints.length > 0) {
          const wp = patrolPoints[ai.patrolIdx % patrolPoints.length];
          const pdx = wp.x - spatial.x;
          const pdz = wp.z - spatial.z;
          const pdist = Math.hypot(pdx, pdz);
          if (pdist < 0.85) {
            ai.patrolIdx = (ai.patrolIdx + 1) % patrolPoints.length;
          } else {
            desVx = (pdx / pdist) * cfg.moveSpeed * 0.54;
            desVz = (pdz / pdist) * cfg.moveSpeed * 0.54;
            spatial.yaw = rotateYawTowards(
              spatial.yaw,
              computeFacingYaw(spatial.x, spatial.z, wp.x, wp.z),
              4.6,
              dt
            );
          }
        }
      } else {
        if (ai.phase === 'patrol' || ai.phase === 'maneuver') {
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.0, dt);
          const action = selectWardenAction({
            horizDist,
            hasLos,
            hasAttackToken: ctx.hasAttackToken,
            gyroBroken: state.weakpoint.broken,
            blinkCooldown: ai.blinkCooldown,
            ambushCooldown: ai.ambushCooldown,
            burstCooldown: ai.burstCooldown,
            riftBarrageCooldown: ai.riftBarrageCooldown,
            snareCooldown: ai.snareCooldown,
            slashCooldown: ai.slashCooldown,
            timeWithoutLos: ai.timeWithoutLos,
            roll: Math.random(),
          });

          if (action === 'phase_slash_repel') {
            ai.phase = 'slash_windup';
            ai.timer = 0.34;
            ai.maxTimer = 0.34;
            ai.hitDone = false;
            callbacks.onTelegraphAudio('iaijutsu_glint');
            rig.getRightMuzzleWorldPos(_glint);
            callbacks.spawnPerilGlint(_glint, 0xe879f9);
          } else if (action === 'blink_backstab_ambush') {
            ai.phase = 'ambush_charge';
            ai.timer = 0.46;
            ai.maxTimer = 0.46;
            ai.hitDone = false;
            callbacks.onTelegraphAudio('iaijutsu_glint');
            rig.getWeakpointWorldPos(_glint);
            callbacks.spawnPerilGlint(_glint, 0xfbbf24);
          } else if (action === 'phase_blink_flank') {
            ai.phase = 'blink_charge';
            ai.timer = 0.36;
            ai.maxTimer = 0.36;
            callbacks.onTelegraphAudio('dash');
            rig.getWeakpointWorldPos(_glint);
            callbacks.spawnPerilGlint(_glint, 0xfbbf24);
          } else if (action === 'dimensional_rift_barrage') {
            ai.phase = 'rift_windup';
            ai.timer = 0.5;
            ai.maxTimer = 0.5;
            ai.hitDone = false;
            callbacks.onTelegraphAudio('rail_charge');
            rig.getLeftMuzzleWorldPos(_glint);
            callbacks.spawnPerilGlint(_glint, 0xe879f9);
            rig.getRightMuzzleWorldPos(_glint);
            callbacks.spawnPerilGlint(_glint, 0xe879f9);
          } else if (action === 'void_anchor_snare') {
            ai.phase = 'snare_windup';
            ai.timer = 0.44;
            ai.maxTimer = 0.44;
            ai.hitDone = false;
            ai.snareTargetX = playerPos.x;
            ai.snareTargetY = playerPos.y + 0.12;
            ai.snareTargetZ = playerPos.z;
            callbacks.onTelegraphAudio('mortar');
            rig.getLeftMuzzleWorldPos(_glint);
            callbacks.spawnPerilGlint(_glint, 0xc084fc);
          } else if (action === 'resonance_burst') {
            ai.phase = 'burst_fire';
            ai.shotsLeft = 6;
            ai.shotDelay = 0.05;
            ai.burstCooldown = 2.1 + Math.random() * 0.75;
          } else {
            state.behavior = horizDist > cfg.preferredMaxRange ? 'chase' : 'strafe';
            if (horizDist > cfg.preferredMaxRange) {
              desVx = dirX * cfg.sprintSpeed + rightX * ai.strafeSign * 2.4;
              desVz = dirZ * cfg.sprintSpeed + rightZ * ai.strafeSign * 2.4;
            } else if (horizDist < cfg.preferredMinRange) {
              desVx = -dirX * cfg.moveSpeed * 0.58 + rightX * ai.strafeSign * cfg.moveSpeed * 0.9;
              desVz = -dirZ * cfg.moveSpeed * 0.58 + rightZ * ai.strafeSign * cfg.moveSpeed * 0.9;
            } else {
              desVx = rightX * ai.strafeSign * cfg.moveSpeed * 0.92;
              desVz = rightZ * ai.strafeSign * cfg.moveSpeed * 0.92;
            }
            desVx += ctx.separation.x * 2.3;
            desVz += ctx.separation.y * 2.3;
          }
        } else if (ai.phase === 'blink_charge') {
          // 1. LATERAL PHASE-BLINK FLANK + SNAP BURST
          state.behavior = 'windup';
          attackVariant = 1;
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          riftIntensity = Math.max(riftIntensity, 0.45 + attackProgress * 0.85);
          phaseFade = Math.max(phaseFade, attackProgress * 0.88);
          gyroAlert = 1.25;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 10.0, dt);

          if (ai.timer <= 0) {
            _origin.set(spatial.x, spatial.y + 1.18, spatial.z);
            callbacks.spawnBoosterBurst(
              _origin,
              _exhaustDir.set(-rightX * ai.strafeSign, 0.25, -rightZ * ai.strafeSign).normalize(),
              0xc084fc,
              12
            );
            const cand = computeBlinkFlankTarget(
              spatial.x,
              spatial.z,
              playerPos.x,
              playerPos.z,
              ai.strafeSign,
              4.8
            );
            const res = tryValidateBlinkDest(
              spatial.x,
              spatial.y,
              spatial.z,
              cand.x,
              cand.z,
              spatial.radius,
              spatial.height,
              world
            );
            if (res.ok) {
              spatial.x = res.x;
              spatial.y = res.y;
              spatial.z = res.z;
              spatial.yaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);
              _origin.set(spatial.x, spatial.y + 1.18, spatial.z);
              callbacks.spawnBoosterBurst(_origin, _exhaustDir.set(0, 0.85, 0), 0xe879f9, 10);
            }
            ai.riftFadeTimer = 0.55;
            ai.strafeSign *= -1;
            ai.blinkCooldown = 4.6 + Math.random() * 1.5;
            // Immediately unleash a snappy 4-round akimbo follow-up burst!
            ai.phase = 'burst_fire';
            ai.shotsLeft = 4;
            ai.shotDelay = 0.06;
          }
        } else if (ai.phase === 'ambush_charge') {
          // 2. PREDATORY BLINK-BACKSTAB AMBUSH (Phase 1: high-visibility vanish charge)
          state.behavior = 'windup';
          attackVariant = 1;
          bladeExtend = 0.65 + (1 - Math.max(0, ai.timer / ai.maxTimer)) * 0.45;
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          riftIntensity = Math.max(riftIntensity, 0.65 + attackProgress * 0.65);
          phaseFade = Math.max(phaseFade, 0.35 + attackProgress * 0.65);
          gyroAlert = 1.45;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 11.0, dt);

          if (ai.timer <= 0) {
            _origin.set(spatial.x, spatial.y + 1.18, spatial.z);
            callbacks.spawnBoosterBurst(_origin, _exhaustDir.set(0, 0.9, 0), 0xe879f9, 14);
            callbacks.onTelegraphAudio('dash');

            const cand = computeAmbushBlinkTarget(
              spatial.x,
              spatial.z,
              playerPos.x,
              playerPos.z,
              ai.strafeSign,
              3.2
            );
            const res = tryValidateBlinkDest(
              spatial.x,
              spatial.y,
              spatial.z,
              cand.x,
              cand.z,
              spatial.radius,
              spatial.height,
              world
            );
            if (res.ok) {
              spatial.x = res.x;
              spatial.y = res.y;
              spatial.z = res.z;
            }
            spatial.yaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);
            ai.riftFadeTimer = 0.55;
            ai.strafeSign *= -1;
            ai.ambushCooldown = 7.4 + Math.random() * 2.2;
            ai.blinkCooldown = Math.max(ai.blinkCooldown, 3.0);

            // Arrival telegraph (0.40s readable counter window before twin Mantis-Blade cleave!)
            ai.phase = 'ambush_arrive';
            ai.timer = 0.4;
            ai.maxTimer = 0.4;
            ai.hitDone = false;
            _origin.set(spatial.x, spatial.y + 1.25, spatial.z);
            callbacks.spawnPerilGlint(_origin, 0xe879f9);
            callbacks.onTelegraphAudio('iaijutsu_glint');
          }
        } else if (ai.phase === 'ambush_arrive') {
          state.behavior = 'windup';
          attackVariant = 2;
          bladeExtend = 1.12;
          riftIntensity = Math.max(riftIntensity, 0.95);
          gyroAlert = 1.2;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 12.0, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          if (ai.timer <= 0) {
            ai.phase = 'slash_strike_1';
            ai.timer = 0.25;
            ai.maxTimer = 0.25;
            ai.hitDone = false;
          }
        } else if (ai.phase === 'burst_fire') {
          // 3. ALTERNATING AKIMBO RESONANCE BURST
          state.behavior = 'attack';
          attackVariant = 0;
          casterCharge = 1.0;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.8, dt);
          desVx = rightX * ai.strafeSign * cfg.moveSpeed * 0.62;
          desVz = rightZ * ai.strafeSign * cfg.moveSpeed * 0.62;
          ai.shotDelay -= dt;
          attackProgress = 1 - ai.shotsLeft / 6;

          if (ai.shotDelay <= 0 && ai.shotsLeft > 0) {
            ai.shotsLeft -= 1;
            ai.shotDelay = 0.115;
            const hand = ai.nextHand;
            ai.nextHand = hand === 1 ? -1 : 1;
            if (hand < 0) rig.getLeftMuzzleWorldPos(_muzzle);
            else rig.getRightMuzzleWorldPos(_muzzle);
            rig.triggerCasterRecoil(hand);

            _aimDir
              .set(
                playerPos.x - _muzzle.x + (Math.random() - 0.5) * 0.34,
                playerPos.y + 1.16 - _muzzle.y + (Math.random() - 0.5) * 0.2,
                playerPos.z - _muzzle.z + (Math.random() - 0.5) * 0.34
              )
              .normalize();
            callbacks.spawnMuzzleFlash(_muzzle, _aimDir, 0xe879f9, false);
            callbacks.onFireAudio('smg');
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _aimDir.clone(),
              speed: 42,
              damage: 11,
              radius: 0.14,
              color: hand < 0 ? 0xc084fc : 0xe879f9,
              kind: 'plasma_bolt',
              staggerStrength: 0.16,
            });
          }
          if (ai.shotsLeft <= 0) {
            ai.phase = 'recover';
            ai.timer = 0.44;
            ai.maxTimer = 0.44;
          }
        } else if (ai.phase === 'rift_windup') {
          // 4. DIMENSIONAL RIFT CRESCENT BARRAGE (5-Bolt Fan)
          state.behavior = 'windup';
          attackVariant = 3;
          casterCharge = 1.45;
          riftIntensity = Math.max(riftIntensity, 0.55);
          gyroAlert = 0.9;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 9.2, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          if (ai.timer <= 0) {
            ai.phase = 'rift_fire';
            ai.timer = 0.28;
            ai.maxTimer = 0.28;
            ai.hitDone = false;
          }
        } else if (ai.phase === 'rift_fire') {
          state.behavior = 'attack';
          attackVariant = 3;
          casterCharge = 1.3;
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          if (!ai.hitDone && attackProgress >= 0.22) {
            ai.hitDone = true;
            rig.getLeftMuzzleWorldPos(_muzzle);
            rig.getRightMuzzleWorldPos(_glint);
            _origin.addVectors(_muzzle, _glint).multiplyScalar(0.5);
            rig.triggerCasterRecoil(-1);
            rig.triggerCasterRecoil(1);

            const fanAngles = computeRiftArcFanAngles(state.weakpoint.broken);
            const baseYaw = spatial.yaw;
            const pitchCos = Math.cos(aimPitch);
            const pitchSin = Math.sin(aimPitch);

            callbacks.spawnMuzzleFlash(_origin, _aimDir.set(dirX, pitchSin, dirZ).normalize(), 0xe879f9, true);
            callbacks.onFireAudio('shotgun');

            for (let i = 0; i < fanAngles.length; i++) {
              const yaw = baseYaw + fanAngles[i];
              _aimDir.set(-Math.sin(yaw) * pitchCos, pitchSin, -Math.cos(yaw) * pitchCos).normalize();
              callbacks.spawnProjectile({
                origin: _origin.clone(),
                direction: _aimDir.clone(),
                speed: 35,
                damage: 14,
                radius: 0.17,
                color: i % 2 === 0 ? 0xe879f9 : 0xfbbf24,
                kind: 'plasma_bolt',
                staggerStrength: 0.26,
              });
            }
          }
          if (ai.timer <= 0) {
            ai.riftBarrageCooldown = 5.4 + Math.random() * 1.8;
            ai.phase = 'recover';
            ai.timer = 0.5;
            ai.maxTimer = 0.5;
          }
        } else if (ai.phase === 'snare_windup') {
          // 5. COVER-FLUSHING VOID-ANCHOR SNARE MORTAR BOMB
          state.behavior = 'windup';
          attackVariant = 4;
          casterCharge = 1.25;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.0, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          if (ai.timer <= 0) {
            ai.phase = 'snare_throw';
            ai.timer = 0.3;
            ai.maxTimer = 0.3;
            ai.hitDone = false;
          }
        } else if (ai.phase === 'snare_throw') {
          state.behavior = 'attack';
          attackVariant = 4;
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          if (!ai.hitDone && attackProgress >= 0.32) {
            ai.hitDone = true;
            rig.getLeftMuzzleWorldPos(_muzzle);
            rig.triggerCasterRecoil(-1);
            const arc = solveVoidSnareArc(
              _muzzle.x,
              _muzzle.y,
              _muzzle.z,
              ai.snareTargetX,
              ai.snareTargetY,
              ai.snareTargetZ,
              16.5
            );
            _aimDir.set(arc.vx, arc.vy, arc.vz).normalize();
            callbacks.spawnMuzzleFlash(_muzzle, _aimDir, 0xc084fc, true);
            callbacks.onFireAudio('mortar');
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _aimDir.clone(),
              speed: arc.speed,
              damage: 24,
              radius: 0.24,
              color: 0xc084fc,
              kind: 'mortar_canister',
              gravity: 16.5,
              splashRadius: 3.6,
              targetPos: new THREE.Vector3(ai.snareTargetX, ai.snareTargetY, ai.snareTargetZ),
              staggerStrength: 0.62,
            });
          }
          if (ai.timer <= 0) {
            ai.snareCooldown = 6.2 + Math.random() * 2.0;
            ai.timeWithoutLos = 0;
            ai.phase = 'recover';
            ai.timer = 0.46;
            ai.maxTimer = 0.46;
          }
        } else if (ai.phase === 'slash_windup') {
          // 6. CLOSE-QUARTERS TWIN MANTIS-BLADE 2-HIT X-CROSS SLASH
          state.behavior = 'windup';
          attackVariant = 2;
          bladeExtend = 1.12;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 10.5, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          if (ai.timer <= 0) {
            ai.phase = 'slash_strike_1';
            ai.timer = 0.24;
            ai.maxTimer = 0.24;
            ai.hitDone = false;
          }
        } else if (ai.phase === 'slash_strike_1') {
          state.behavior = 'attack';
          attackVariant = 2;
          bladeExtend = 1.12;
          desVx = dirX * 5.2;
          desVz = dirZ * 5.2;
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          if (!ai.hitDone && attackProgress >= 0.28) {
            ai.hitDone = true;
            _origin.set(spatial.x, spatial.y + 1.24, spatial.z);
            callbacks.spawnBladeSlashArc(_origin, spatial.yaw, 0.34, 0.08, 2.7, 0xe879f9, true, 1);
            callbacks.spawnBladeSlashArc(_origin, spatial.yaw, -0.34, 0.08, 2.7, 0xc084fc, true, -1);
            callbacks.onKatanaSlashAudio?.(true);

            // Carve glowing dimensional slash scar into floor/walls if blade connects with geometry
            _scarPos.set(spatial.x + dirX * 1.45, spatial.y + 0.04, spatial.z + dirZ * 1.45);
            _scarNorm.set(0, 1, 0);
            _slashDir.set(rightX, 0, rightZ).normalize();
            callbacks.spawnSurfaceSlashScar(_scarPos, _scarNorm, _slashDir, true);

            if (horizDist <= 3.85 && Math.abs(playerPos.y - spatial.y) <= 2.3) {
              callbacks.applyPlayerMeleeHit(20, _origin, 0.72);
            }
          }
          if (ai.timer <= 0) {
            ai.phase = 'slash_strike_2';
            ai.timer = 0.24;
            ai.maxTimer = 0.24;
            ai.hitDone = false;
          }
        } else if (ai.phase === 'slash_strike_2') {
          state.behavior = 'attack';
          attackVariant = 2;
          bladeExtend = 1.08;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.5, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          if (!ai.hitDone && attackProgress >= 0.32) {
            ai.hitDone = true;
            _origin.set(spatial.x, spatial.y + 1.32, spatial.z);
            callbacks.spawnBladeSlashArc(_origin, spatial.yaw, -0.18, 0.14, 2.85, 0xfbbf24, false, -1);
            callbacks.onKatanaSlashAudio?.(false);
            if (horizDist <= 3.9 && Math.abs(playerPos.y - spatial.y) <= 2.3) {
              callbacks.applyPlayerMeleeHit(16, _origin, 0.58);
            }
          }
          if (ai.timer <= 0) {
            ai.slashCooldown = 2.8;
            ai.phase = 'recover';
            ai.timer = 0.52;
            ai.maxTimer = 0.52;
          }
        } else if (ai.phase === 'recover') {
          state.behavior = 'recover';
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.2, dt);
          ai.timer -= dt;
          desVx = rightX * ai.strafeSign * cfg.moveSpeed * 0.48;
          desVz = rightZ * ai.strafeSign * cfg.moveSpeed * 0.48;
          if (ai.timer <= 0) ai.phase = 'maneuver';
        }
      }

      stepEnemyMovement(spatial, desVx, desVz, world, dt, F6_MIN_FLOOR_Y);
      const speed = Math.hypot(spatial.vx, spatial.vz);
      const localMoveX = (spatial.vx * rightX + spatial.vz * rightZ) / Math.max(1, cfg.moveSpeed);
      const localMoveZ = (spatial.vx * dirX + spatial.vz * dirZ) / Math.max(1, cfg.moveSpeed);

      rig.setWardenVisualState({
        bladeExtend,
        riftIntensity,
        phaseFade,
        casterCharge,
        gyroAlert,
      });

      rig.updateAnimation({
        dt,
        elapsed,
        behavior: state.behavior,
        speedRatio: speed / cfg.moveSpeed,
        localMoveX,
        localMoveZ,
        aimPitch,
        attackProgress,
        attackVariant,
        flinchTimer: state.flinchTimer,
        flinchDirX: state.flinchDirX,
        staggerTimer: 0,
        deadProgress: 0,
        weakpointExposed: state.weakpoint.exposed,
        weakpointBroken: state.weakpoint.broken,
        shieldActive: false,
        phase: 1,
        airborneHeight: 0,
      });
    },
  };
}
