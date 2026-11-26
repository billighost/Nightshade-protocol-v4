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
import { SHIELD_CHARIOT_BRUTE_CONFIG } from './config';
import {
  buildShieldChariotBruteRig,
  type BrutePoseMode,
  type ShieldChariotBruteRigHandle,
} from './mesh';
import { computeFlakScatterOffsets, selectBruteAction } from './tactics';
import { createBruteTextures, type BruteTextureSuite } from './textures';

const F5_MIN_FLOOR_Y = F5_PIT_Y - 0.6;

type BrutePhase =
  | 'patrol'
  | 'advance'
  | 'rush_windup'
  | 'rush_charge'
  | 'slam_windup'
  | 'slam_impact'
  | 'bash_windup'
  | 'bash_strike'
  | 'flak_windup'
  | 'flak_fire'
  | 'recover';

interface BruteAiState {
  phase: BrutePhase;
  timer: number;
  maxTimer: number;
  patrolIdx: number;
  rushCooldown: number;
  slamCooldown: number;
  flakCooldown: number;
  bashCooldown: number;
  chargeVx: number;
  chargeVz: number;
  hitDone: boolean;
}

const _origin = new THREE.Vector3();
const _muzzle = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

let sharedBruteTex: BruteTextureSuite | null = null;
function getSharedBruteTextures(): BruteTextureSuite {
  if (!sharedBruteTex) sharedBruteTex = createBruteTextures();
  return sharedBruteTex;
}

export function createShieldChariotBruteBrain(mats: Floor05EnemyMaterials): EnemyArchetypeBrain {
  return {
    config: SHIELD_CHARIOT_BRUTE_CONFIG,
    createRig: (enemyId) => buildShieldChariotBruteRig(enemyId, mats, getSharedBruteTextures()),
    createAiState: (): Record<string, unknown> => ({
      phase: 'patrol',
      timer: 0,
      maxTimer: 1,
      patrolIdx: 0,
      rushCooldown: 2.2 + Math.random() * 1.4,
      slamCooldown: 2.6 + Math.random() * 1.4,
      flakCooldown: 1.5 + Math.random() * 1.2,
      bashCooldown: 0.4,
      chargeVx: 0,
      chargeVz: 0,
      hitDone: false,
    }),
    stepAi(ctx: EnemyAiStepContext) {
      const ai = ctx.aiState as unknown as BruteAiState;
      const rig = ctx.rig as ShieldChariotBruteRigHandle;
      const { dt, elapsed, state, spatial, playerPos, world, callbacks, patrolPoints } = ctx;
      const cfg = SHIELD_CHARIOT_BRUTE_CONFIG;

      ai.rushCooldown = Math.max(0, ai.rushCooldown - dt);
      ai.slamCooldown = Math.max(0, ai.slamCooldown - dt);
      ai.flakCooldown = Math.max(0, ai.flakCooldown - dt);
      ai.bashCooldown = Math.max(0, ai.bashCooldown - dt);

      if (state.staggerTimer > 0) {
        ai.phase = 'advance';
        rig.setPoseMode('march');
        rig.setBoosterFlame(0);
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
          shieldActive: state.shieldActive,
          phase: 1,
          airborneHeight: 0,
        });
        return;
      }

      const dx = playerPos.x - spatial.x;
      const dy = playerPos.y + 1.1 - (spatial.y + 1.5);
      const dz = playerPos.z - spatial.z;
      const horizDist = Math.hypot(dx, dz);
      const vertDist = Math.abs(playerPos.y - spatial.y);

      const hasLos =
        horizDist <= cfg.detectRange &&
        hasEnemyLineOfSight(
          spatial.x,
          spatial.y + 1.65,
          spatial.z,
          playerPos.x,
          playerPos.y + 1.2,
          playerPos.z,
          world
        );

      if (hasLos || horizDist < 17.0 || state.hp < state.maxHp) {
        state.engaged = true;
      }

      const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);
      const dirX = horizDist > 0.01 ? dx / horizDist : -Math.sin(spatial.yaw);
      const dirZ = horizDist > 0.01 ? dz / horizDist : -Math.cos(spatial.yaw);

      let desVx = 0;
      let desVz = 0;
      let attackProgress = 0;
      let poseMode: BrutePoseMode = 'march';
      let boosterFlame = 0;

      if (!state.engaged) {
        state.behavior = 'patrol';
        if (patrolPoints.length > 0) {
          const wp = patrolPoints[ai.patrolIdx % patrolPoints.length];
          const pdx = wp.x - spatial.x;
          const pdz = wp.z - spatial.z;
          const pdist = Math.hypot(pdx, pdz);
          if (pdist < 0.95) {
            ai.patrolIdx = (ai.patrolIdx + 1) % patrolPoints.length;
          } else {
            desVx = (pdx / pdist) * cfg.moveSpeed * 0.55;
            desVz = (pdz / pdist) * cfg.moveSpeed * 0.55;
            spatial.yaw = rotateYawTowards(
              spatial.yaw,
              computeFacingYaw(spatial.x, spatial.z, wp.x, wp.z),
              3.5,
              dt
            );
          }
        }
      } else if (ai.phase === 'patrol' || ai.phase === 'advance') {
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 4.8, dt);
        const action = selectBruteAction({
          horizDist,
          vertDist,
          hasLos,
          hasAttackToken: ctx.hasAttackToken,
          shieldActive: state.shieldActive,
          rushCooldown: ai.rushCooldown,
          slamCooldown: ai.slamCooldown,
          flakCooldown: ai.flakCooldown,
          bashCooldown: ai.bashCooldown,
          roll: Math.random(),
        });

        if (action === 'ram_shield_bash') {
          ai.phase = 'bash_windup';
          ai.timer = 0.4;
          ai.maxTimer = 0.4;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('melee');
        } else if (action === 'seismic_prow_slam') {
          ai.phase = 'slam_windup';
          ai.timer = 0.72;
          ai.maxTimer = 0.72;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('shield_slam');
          rig.getWeakpointWorldPos(_origin);
          callbacks.spawnPerilGlint(_origin, 0xf97316);
        } else if (action === 'chariot_bull_rush') {
          ai.phase = 'rush_windup';
          ai.timer = 0.68;
          ai.maxTimer = 0.68;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('shield_charge');
          rig.getWeakpointWorldPos(_origin);
          callbacks.spawnPerilGlint(_origin, 0xfef08a);
        } else if (action === 'flak_scatter_barrage') {
          ai.phase = 'flak_windup';
          ai.timer = 0.54;
          ai.maxTimer = 0.54;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('pyro_flare');
        } else {
          state.behavior = 'chase';
          const spd = horizDist > 10 ? cfg.sprintSpeed : cfg.moveSpeed;
          desVx = dirX * spd + ctx.separation.x * 2.0;
          desVz = dirZ * spd + ctx.separation.y * 2.0;
        }
      } else if (ai.phase === 'rush_windup') {
        state.behavior = 'windup';
        poseMode = 'rush_windup';
        boosterFlame = 0.75;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.2, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.chargeVx = -Math.sin(spatial.yaw) * 16.2;
          ai.chargeVz = -Math.cos(spatial.yaw) * 16.2;
          ai.phase = 'rush_charge';
          ai.timer = 0.85;
          ai.maxTimer = 0.85;
          rig.getWeakpointWorldPos(_origin);
          callbacks.spawnBoosterBurst(
            _origin,
            _dir.set(Math.sin(spatial.yaw), 0.15, Math.cos(spatial.yaw)),
            0xf97316,
            12
          );
        }
      } else if (ai.phase === 'rush_charge') {
        state.behavior = 'attack';
        poseMode = 'rush_charge';
        boosterFlame = 1.4;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        desVx = ai.chargeVx;
        desVz = ai.chargeVz;
        if (!ai.hitDone && horizDist <= 2.65 && vertDist <= 2.2) {
          ai.hitDone = true;
          _origin.set(spatial.x, spatial.y + 1.2, spatial.z);
          callbacks.applyPlayerMeleeHit(32, _origin, 1.0);
          callbacks.spawnImpactVfx(_origin, false, true);
        }
        if (ai.timer <= 0) {
          ai.rushCooldown = 6.2 + Math.random() * 1.8;
          ctx.exposeWeakpoint(2.2);
          ai.phase = 'recover';
          ai.timer = 1.05;
          ai.maxTimer = 1.05;
        }
      } else if (ai.phase === 'slam_windup') {
        state.behavior = 'windup';
        poseMode = 'slam';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 4.4, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.phase = 'slam_impact';
          ai.timer = 0.36;
          ai.maxTimer = 0.36;
        }
      } else if (ai.phase === 'slam_impact') {
        state.behavior = 'attack';
        poseMode = 'slam';
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (!ai.hitDone && attackProgress >= 0.28) {
          ai.hitDone = true;
          _origin.set(
            spatial.x - Math.sin(spatial.yaw) * 1.4,
            spatial.y + 0.12,
            spatial.z - Math.cos(spatial.yaw) * 1.4
          );
          callbacks.spawnShockwave({
            center: _origin.clone(),
            maxRadius: 7.5,
            expandSpeed: 14.5,
            damage: 26,
            color: 0xf97316,
            staggerStrength: 0.88,
          });
          callbacks.spawnRailImpactCrater(_origin, _up, 0xf97316);
          callbacks.onTelegraphAudio('boss_slam');
        }
        if (ai.timer <= 0) {
          ai.slamCooldown = 5.4 + Math.random() * 1.6;
          ai.phase = 'recover';
          ai.timer = 0.82;
          ai.maxTimer = 0.82;
        }
      } else if (ai.phase === 'bash_windup') {
        state.behavior = 'windup';
        poseMode = 'bash';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.4, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.phase = 'bash_strike';
          ai.timer = 0.3;
          ai.maxTimer = 0.3;
        }
      } else if (ai.phase === 'bash_strike') {
        state.behavior = 'attack';
        poseMode = 'bash';
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        desVx = dirX * 4.5;
        desVz = dirZ * 4.5;
        if (!ai.hitDone && attackProgress >= 0.35) {
          ai.hitDone = true;
          _origin.set(spatial.x, spatial.y + 1.25, spatial.z);
          if (horizDist <= 3.6 && vertDist <= 2.3) {
            callbacks.applyPlayerMeleeHit(24, _origin, 0.84);
          }
          callbacks.onTelegraphAudio('shield_slam');
        }
        if (ai.timer <= 0) {
          ai.bashCooldown = 2.4 + Math.random() * 0.8;
          ai.phase = 'recover';
          ai.timer = 0.56;
          ai.maxTimer = 0.56;
        }
      } else if (ai.phase === 'flak_windup') {
        state.behavior = 'windup';
        poseMode = 'flak';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 5.5, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.phase = 'flak_fire';
          ai.timer = 0.3;
          ai.maxTimer = 0.3;
        }
      } else if (ai.phase === 'flak_fire') {
        state.behavior = 'attack';
        poseMode = 'flak';
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (!ai.hitDone && attackProgress >= 0.22) {
          ai.hitDone = true;
          rig.getMuzzleWorldPos(_muzzle);
          const basePitch = Math.atan2(dy, Math.max(1, horizDist));
          const offsets = computeFlakScatterOffsets();
          for (let i = 0; i < offsets.length; i++) {
            const p = basePitch + offsets[i].pitch;
            const yOff = spatial.yaw + offsets[i].yaw;
            _dir.set(-Math.sin(yOff) * Math.cos(p), Math.sin(p), -Math.cos(yOff) * Math.cos(p)).normalize();
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _dir.clone(),
              speed: 24.5,
              damage: 10,
              kind: 'shotgun_pellet',
              color: 0xf97316,
              radius: 0.14,
              staggerStrength: 0.32,
            });
          }
          callbacks.spawnMuzzleFlash(_muzzle, _dir, 0xf97316, true);
          callbacks.onFireAudio('shotgun');
        }
        if (ai.timer <= 0) {
          ai.flakCooldown = 4.2 + Math.random() * 1.4;
          ai.phase = 'recover';
          ai.timer = 0.56;
          ai.maxTimer = 0.56;
        }
      } else if (ai.phase === 'recover') {
        state.behavior = 'recover';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 3.0, dt);
        ai.timer -= dt;
        if (ai.timer <= 0) ai.phase = 'advance';
      }

      rig.setPoseMode(poseMode);
      rig.setBoosterFlame(boosterFlame);

      const collided = stepEnemyMovement(spatial, desVx, desVz, world, dt, F5_MIN_FLOOR_Y);
      if (ai.phase === 'rush_charge' && collided) {
        // Wall crash interrupts charge and exposes back reactor!
        ai.rushCooldown = 6.5;
        ctx.exposeWeakpoint(2.4);
        ai.phase = 'recover';
        ai.timer = 1.1;
        ai.maxTimer = 1.1;
        callbacks.onTelegraphAudio('shield_slam');
      }

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
        shieldActive: state.shieldActive,
        phase: 1,
        airborneHeight: 0,
      });
    },
  };
}
