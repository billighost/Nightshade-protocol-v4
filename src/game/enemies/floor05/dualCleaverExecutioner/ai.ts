import * as THREE from 'three';
import { F5_PIT_Y } from '../../../arena/hideout/floors/floor05/layout';
import type { EnemyAiStepContext, EnemyArchetypeBrain } from '../../core/enemyManager';
import {
  computeFacingYaw,
  hasEnemyLineOfSight,
  rotateYawTowards,
  stepEnemyMovement,
} from '../../core/enemyNav';
import type { Floor05EnemyMaterials } from '../materials';
import { DUAL_CLEAVER_EXECUTIONER_CONFIG } from './config';
import {
  buildDualCleaverExecutionerRig,
  type DualCleaverExecutionerRigHandle,
  type ExecutionerPoseMode,
} from './mesh';
import {
  computeExecutionerWaveAngles,
  selectExecutionerAction,
  solveExecutionerLeap,
} from './tactics';
import { createExecutionerTextures, type ExecutionerTextureSuite } from './textures';

const F5_MIN_FLOOR_Y = F5_PIT_Y - 0.6;

type ExecutionerPhase =
  | 'patrol'
  | 'stalk'
  | 'cleave_windup'
  | 'cleave_swing'
  | 'whirl_windup'
  | 'whirl_spin'
  | 'leap_crouch'
  | 'leap_air'
  | 'leap_impact'
  | 'guillotine_windup'
  | 'guillotine_slam'
  | 'wave_windup'
  | 'wave_release'
  | 'recover';

interface ExecutionerAiState {
  phase: ExecutionerPhase;
  timer: number;
  maxTimer: number;
  patrolIdx: number;
  cleaveCooldown: number;
  whirlwindCooldown: number;
  leapCooldown: number;
  waveCooldown: number;
  guillotineCooldown: number;
  leapVx: number;
  leapVz: number;
  leapPeak: number;
  spinHitTick: number;
  hitDone: boolean;
}

const _origin = new THREE.Vector3();
const _muzzle = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

let sharedExecTex: ExecutionerTextureSuite | null = null;
function getSharedExecTextures(): ExecutionerTextureSuite {
  if (!sharedExecTex) sharedExecTex = createExecutionerTextures();
  return sharedExecTex;
}

export function createDualCleaverExecutionerBrain(
  mats: Floor05EnemyMaterials
): EnemyArchetypeBrain {
  return {
    config: DUAL_CLEAVER_EXECUTIONER_CONFIG,
    createRig: (enemyId) =>
      buildDualCleaverExecutionerRig(enemyId, mats, getSharedExecTextures()),
    createAiState: (): Record<string, unknown> => ({
      phase: 'patrol',
      timer: 0,
      maxTimer: 1,
      patrolIdx: 0,
      cleaveCooldown: 0.5,
      whirlwindCooldown: 3.0,
      leapCooldown: 2.2,
      waveCooldown: 2.4,
      guillotineCooldown: 3.4,
      leapVx: 0,
      leapVz: 0,
      leapPeak: 2.6,
      spinHitTick: 0,
      hitDone: false,
    }),
    stepAi(ctx: EnemyAiStepContext) {
      const ai = ctx.aiState as unknown as ExecutionerAiState;
      const rig = ctx.rig as DualCleaverExecutionerRigHandle;
      const { dt, elapsed, state, spatial, playerPos, world, callbacks, patrolPoints } = ctx;
      const cfg = DUAL_CLEAVER_EXECUTIONER_CONFIG;
      const p2 = state.phase === 2;
      const cdRate = p2 ? 1.28 : 1.0;

      ai.cleaveCooldown = Math.max(0, ai.cleaveCooldown - dt * cdRate);
      ai.whirlwindCooldown = Math.max(0, ai.whirlwindCooldown - dt * cdRate);
      ai.leapCooldown = Math.max(0, ai.leapCooldown - dt * cdRate);
      ai.waveCooldown = Math.max(0, ai.waveCooldown - dt * cdRate);
      ai.guillotineCooldown = Math.max(0, ai.guillotineCooldown - dt * cdRate);

      if (state.staggerTimer > 0) {
        ai.phase = 'stalk';
        rig.setPoseMode('stalk');
        rig.setCleaverHeat(0);
        stepEnemyMovement(spatial, 0, 0, world, dt, F5_MIN_FLOOR_Y);
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
          airborneHeight: 0,
        });
        return;
      }

      const dx = playerPos.x - spatial.x;
      const dy = playerPos.y + 1.15 - (spatial.y + 1.5);
      const dz = playerPos.z - spatial.z;
      const horizDist = Math.hypot(dx, dz);
      const vertDist = Math.abs(playerPos.y - spatial.y);

      const hasLos =
        horizDist <= cfg.detectRange &&
        hasEnemyLineOfSight(
          spatial.x,
          spatial.y + 1.75,
          spatial.z,
          playerPos.x,
          playerPos.y + 1.25,
          playerPos.z,
          world
        );

      if (hasLos || horizDist < 19.0 || state.hp < state.maxHp) {
        state.engaged = true;
      }

      const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);
      const dirX = horizDist > 0.01 ? dx / horizDist : -Math.sin(spatial.yaw);
      const dirZ = horizDist > 0.01 ? dz / horizDist : -Math.cos(spatial.yaw);

      let desVx = 0;
      let desVz = 0;
      let attackProgress = 0;
      let airborneHeight = 0;
      let poseMode: ExecutionerPoseMode = 'stalk';
      let cleaverHeat = p2 ? 0.5 : 0.15;

      if (!state.engaged) {
        state.behavior = 'patrol';
        if (patrolPoints.length > 0) {
          const wp = patrolPoints[ai.patrolIdx % patrolPoints.length];
          const pdx = wp.x - spatial.x;
          const pdz = wp.z - spatial.z;
          const pdist = Math.hypot(pdx, pdz);
          if (pdist < 1.0) {
            ai.patrolIdx = (ai.patrolIdx + 1) % patrolPoints.length;
          } else {
            desVx = (pdx / pdist) * cfg.moveSpeed * 0.5;
            desVz = (pdz / pdist) * cfg.moveSpeed * 0.5;
            spatial.yaw = rotateYawTowards(
              spatial.yaw,
              computeFacingYaw(spatial.x, spatial.z, wp.x, wp.z),
              3.8,
              dt
            );
          }
        }
      } else if (ai.phase === 'patrol' || ai.phase === 'stalk') {
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.4, dt);
        const action = selectExecutionerAction({
          horizDist,
          vertDist,
          hasLos,
          phase: state.phase,
          cleaveCooldown: ai.cleaveCooldown,
          whirlwindCooldown: ai.whirlwindCooldown,
          leapCooldown: ai.leapCooldown,
          waveCooldown: ai.waveCooldown,
          guillotineCooldown: ai.guillotineCooldown,
          roll: Math.random(),
        });

        if (action === 'twin_x_cleave') {
          ai.phase = 'cleave_windup';
          ai.timer = p2 ? 0.34 : 0.42;
          ai.maxTimer = ai.timer;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('melee');
          rig.getMuzzleWorldPos(_muzzle);
          callbacks.spawnPerilGlint(_muzzle, 0xff5a1f);
        } else if (action === 'whirlwind_blender') {
          ai.phase = 'whirl_windup';
          ai.timer = 0.52;
          ai.maxTimer = 0.52;
          ai.spinHitTick = 0;
          callbacks.onTelegraphAudio('dash');
          rig.getWeakpointWorldPos(_origin);
          callbacks.spawnPerilGlint(_origin, 0xef4444);
        } else if (action === 'berserker_leap_slam') {
          ai.phase = 'leap_crouch';
          ai.timer = 0.46;
          ai.maxTimer = 0.46;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('boss_slam');
          rig.getWeakpointWorldPos(_origin);
          callbacks.spawnPerilGlint(_origin, 0xf97316);
        } else if (action === 'overhead_guillotine') {
          ai.phase = 'guillotine_windup';
          ai.timer = p2 ? 0.56 : 0.68;
          ai.maxTimer = ai.timer;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('boss_slam');
          rig.getMuzzleWorldPos(_muzzle);
          callbacks.spawnPerilGlint(_muzzle, 0xff2c12);
        } else if (action === 'molten_arc_wave') {
          ai.phase = 'wave_windup';
          ai.timer = 0.52;
          ai.maxTimer = 0.52;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('iaijutsu_glint');
        } else {
          state.behavior = 'chase';
          const spd = horizDist > 8.5 ? cfg.sprintSpeed : cfg.moveSpeed;
          desVx = dirX * spd * (p2 ? 1.15 : 1.0);
          desVz = dirZ * spd * (p2 ? 1.15 : 1.0);
        }
      } else if (ai.phase === 'cleave_windup') {
        state.behavior = 'windup';
        poseMode = 'x_cleave';
        cleaverHeat = 0.9;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.2, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.phase = 'cleave_swing';
          ai.timer = 0.34;
          ai.maxTimer = 0.34;
        }
      } else if (ai.phase === 'cleave_swing') {
        state.behavior = 'attack';
        poseMode = 'x_cleave';
        cleaverHeat = 1.4;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        desVx = dirX * 5.6;
        desVz = dirZ * 5.6;
        if (!ai.hitDone && attackProgress >= 0.3) {
          ai.hitDone = true;
          _origin.set(spatial.x, spatial.y + 1.45, spatial.z);
          callbacks.spawnBladeSlashArc(_origin, spatial.yaw, 0.55, 0.08, 3.6, 0xff5a1f, true, 1);
          callbacks.spawnBladeSlashArc(_origin, spatial.yaw, -0.55, 0.08, 3.6, 0xef4444, true, -1);
          callbacks.onKatanaSlashAudio?.(true);
          if (horizDist <= 4.35 && vertDist <= 2.4) {
            callbacks.applyPlayerMeleeHit(p2 ? 32 : 26, _origin, 0.85);
          }
        }
        if (ai.timer <= 0) {
          ai.cleaveCooldown = 2.0;
          ai.phase = 'recover';
          ai.timer = 0.5;
          ai.maxTimer = 0.5;
        }
      } else if (ai.phase === 'whirl_windup') {
        state.behavior = 'windup';
        poseMode = 'x_cleave';
        cleaverHeat = 1.1;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 7.2, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.phase = 'whirl_spin';
          ai.timer = p2 ? 2.1 : 1.75;
          ai.maxTimer = ai.timer;
          ai.spinHitTick = 0;
        }
      } else if (ai.phase === 'whirl_spin') {
        state.behavior = 'attack';
        poseMode = 'whirlwind';
        cleaverHeat = 1.6;
        ai.timer -= dt;
        ai.spinHitTick += dt;
        const spinSpd = p2 ? 6.8 : 5.6;
        desVx = dirX * spinSpd;
        desVz = dirZ * spinSpd;
        if (ai.spinHitTick >= 0.34) {
          ai.spinHitTick = 0;
          _origin.set(spatial.x, spatial.y + 1.4, spatial.z);
          callbacks.spawnBladeSlashArc(_origin, elapsed * 10, 0.05, 0, 3.85, 0xff5a1f, true, 1);
          callbacks.onKatanaSlashAudio?.(false);
          if (horizDist <= 3.9 && vertDist <= 2.4) {
            callbacks.applyPlayerMeleeHit(16, _origin, 0.55);
          }
        }
        if (ai.timer <= 0) {
          ai.whirlwindCooldown = 6.8;
          ctx.exposeWeakpoint(2.2);
          ai.phase = 'recover';
          ai.timer = 0.95;
          ai.maxTimer = 0.95;
        }
      } else if (ai.phase === 'leap_crouch') {
        state.behavior = 'windup';
        poseMode = 'leap_crouch';
        cleaverHeat = 1.0;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.2, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          const leap = solveExecutionerLeap(dx, dz, 0.64);
          ai.leapVx = leap.vx;
          ai.leapVz = leap.vz;
          ai.leapPeak = leap.peakHeight;
          ai.phase = 'leap_air';
          ai.timer = 0.64;
          ai.maxTimer = 0.64;
          rig.getWeakpointWorldPos(_origin);
          callbacks.spawnBoosterBurst(_origin, _up, 0xff5a1f, 12);
        }
      } else if (ai.phase === 'leap_air') {
        state.behavior = 'windup';
        poseMode = 'leap_air';
        cleaverHeat = 1.5;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        airborneHeight = Math.sin(attackProgress * Math.PI) * ai.leapPeak;
        desVx = ai.leapVx;
        desVz = ai.leapVz;
        if (ai.timer <= 0) {
          ai.phase = 'leap_impact';
          ai.timer = 0.34;
          ai.maxTimer = 0.34;
        }
      } else if (ai.phase === 'leap_impact') {
        state.behavior = 'attack';
        poseMode = 'guillotine';
        cleaverHeat = 1.6;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (!ai.hitDone && attackProgress >= 0.16) {
          ai.hitDone = true;
          _origin.set(
            spatial.x - Math.sin(spatial.yaw) * 1.5,
            spatial.y + 0.14,
            spatial.z - Math.cos(spatial.yaw) * 1.5
          );
          callbacks.spawnShockwave({
            center: _origin.clone(),
            maxRadius: p2 ? 9.6 : 8.4,
            expandSpeed: 16.0,
            damage: p2 ? 36 : 30,
            color: 0xff5a1f,
            staggerStrength: 0.95,
          });
          callbacks.spawnRailImpactCrater(_origin, _up, 0xff5a1f);
          callbacks.onTelegraphAudio('boss_slam');
          ctx.exposeWeakpoint(2.4);
        }
        if (ai.timer <= 0) {
          ai.leapCooldown = 7.4;
          ai.phase = 'recover';
          ai.timer = 1.05;
          ai.maxTimer = 1.05;
        }
      } else if (ai.phase === 'guillotine_windup') {
        state.behavior = 'windup';
        poseMode = 'guillotine';
        cleaverHeat = 1.3;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.2, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.phase = 'guillotine_slam';
          ai.timer = 0.34;
          ai.maxTimer = 0.34;
        }
      } else if (ai.phase === 'guillotine_slam') {
        state.behavior = 'attack';
        poseMode = 'guillotine';
        cleaverHeat = 1.6;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (!ai.hitDone && attackProgress >= 0.22) {
          ai.hitDone = true;
          _origin.set(
            spatial.x - Math.sin(spatial.yaw) * 1.8,
            spatial.y + 0.14,
            spatial.z - Math.cos(spatial.yaw) * 1.8
          );
          callbacks.spawnShockwave({
            center: _origin.clone(),
            maxRadius: 7.4,
            expandSpeed: 15.2,
            damage: 32,
            color: 0xef4444,
            staggerStrength: 0.92,
          });
          callbacks.spawnRailImpactCrater(_origin, _up, 0xef4444);
          callbacks.onTelegraphAudio('boss_slam');
          ctx.exposeWeakpoint(2.2);
        }
        if (ai.timer <= 0) {
          ai.guillotineCooldown = 5.4;
          ai.phase = 'recover';
          ai.timer = 0.95;
          ai.maxTimer = 0.95;
        }
      } else if (ai.phase === 'wave_windup') {
        state.behavior = 'windup';
        poseMode = 'wave';
        cleaverHeat = 1.2;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 7.0, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.phase = 'wave_release';
          ai.timer = 0.34;
          ai.maxTimer = 0.34;
        }
      } else if (ai.phase === 'wave_release') {
        state.behavior = 'attack';
        poseMode = 'wave';
        cleaverHeat = 1.5;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (!ai.hitDone && attackProgress >= 0.24) {
          ai.hitDone = true;
          rig.getMuzzleWorldPos(_muzzle);
          callbacks.spawnBladeSlashArc(_muzzle, spatial.yaw, 0.08, 0, 3.6, 0xff5a1f, true, 1);
          callbacks.onKatanaSlashAudio?.(true);
          const pitch = Math.atan2(dy, Math.max(1, horizDist));
          const cosP = Math.cos(pitch);
          const sinP = Math.sin(pitch);
          const angles = computeExecutionerWaveAngles(state.phase);
          for (let i = 0; i < angles.length; i++) {
            const yOff = spatial.yaw + angles[i];
            _dir.set(-Math.sin(yOff) * cosP, sinP, -Math.cos(yOff) * cosP).normalize();
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _dir.clone(),
              speed: p2 ? 25.5 : 22.5,
              damage: 18,
              kind: 'boss_overdrive',
              color: 0xff5a1f,
              radius: 0.22,
              staggerStrength: 0.45,
            });
          }
        }
        if (ai.timer <= 0) {
          ai.waveCooldown = p2 ? 4.2 : 5.4;
          ai.phase = 'recover';
          ai.timer = 0.56;
          ai.maxTimer = 0.56;
        }
      } else if (ai.phase === 'recover') {
        state.behavior = 'recover';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 3.6, dt);
        ai.timer -= dt;
        if (ai.timer <= 0) ai.phase = 'stalk';
      }

      rig.setPoseMode(poseMode);
      rig.setCleaverHeat(cleaverHeat);

      stepEnemyMovement(spatial, desVx, desVz, world, dt, F5_MIN_FLOOR_Y);
      const speed = Math.hypot(spatial.vx, spatial.vz);

      rig.updateAnimation({
        dt,
        elapsed,
        behavior: state.behavior,
        speedRatio: speed / cfg.moveSpeed,
        localMoveX: 0,
        localMoveZ: speed / cfg.moveSpeed,
        aimPitch: 0,
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
        airborneHeight,
      });
    },
  };
}
