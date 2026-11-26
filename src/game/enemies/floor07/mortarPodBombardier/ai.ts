import * as THREE from 'three';
import { F7_BASE_Y } from '../../../arena/hideout/floors/floor07/layout';
import type { EnemyAiStepContext, EnemyArchetypeBrain } from '../../core/enemyManager';
import {
  computeFacingYaw,
  hasEnemyLineOfSight,
  raycastCollisionWorld3D,
  rotateYawTowards,
  stepEnemyMovement,
} from '../../core/enemyNav';
import type { Floor07EnemyMaterials } from '../materials';
import { MORTAR_POD_BOMBARDIER_CONFIG } from './config';
import { buildMortarPodBombardierRig, type MortarBombardierRigHandle } from './mesh';
import {
  computeBallisticMortarArc,
  computeCarpetStrikeTargets,
  selectBombardierAttack,
} from './tactics';
import { createMortarBombardierTextures } from './textures';

const F7_MIN_FLOOR_Y = F7_BASE_Y - 0.8;

type BombardierPhase =
  | 'reposition'
  | 'salvo_windup'
  | 'salvo_fire'
  | 'carpet_windup'
  | 'carpet_fire'
  | 'flak_windup'
  | 'flak_fire'
  | 'shrapnel_windup'
  | 'shrapnel_fire'
  | 'stomp_windup'
  | 'stomp_slam'
  | 'recover';

interface BombardierAiState {
  phase: BombardierPhase;
  timer: number;
  stompCooldown: number;
  carpetCooldown: number;
  flakCooldown: number;
  salvoCooldown: number;
  shrapnelCooldown: number;
  shotsLeft: number;
  shotDelay: number;
  podSide: -1 | 1;
  strafeSign: number;
  hitApplied: boolean;
  carpetTargets: Array<{ x: number; y: number; z: number }>;
  prevPlayerX: number;
  prevPlayerZ: number;
  hasPrevPlayer: boolean;
}

const _muzzle = new THREE.Vector3();
const _glint = new THREE.Vector3();
const _vel = new THREE.Vector3();
const _target = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _rayHit = { hit: false, point: new THREE.Vector3(), normal: new THREE.Vector3(), t: 1 };

export function createMortarPodBombardierBrain(mats: Floor07EnemyMaterials): EnemyArchetypeBrain {
  // Share one procedural PBR texture suite across all Floor 07 Mortar-Pod Bombardiers
  const sharedTextures = createMortarBombardierTextures();

  return {
    config: MORTAR_POD_BOMBARDIER_CONFIG,
    createRig: (enemyId) => buildMortarPodBombardierRig(enemyId, mats, sharedTextures),
    createAiState: (): Record<string, unknown> => ({
      phase: 'reposition',
      timer: 0,
      stompCooldown: 0.6,
      carpetCooldown: 2.2 + Math.random() * 1.4,
      flakCooldown: 1.4 + Math.random() * 1.2,
      salvoCooldown: 1.2 + Math.random() * 1.1,
      shrapnelCooldown: 1.8 + Math.random() * 1.2,
      shotsLeft: 0,
      shotDelay: 0,
      podSide: Math.random() < 0.5 ? -1 : 1,
      strafeSign: Math.random() < 0.5 ? -1 : 1,
      hitApplied: false,
      carpetTargets: [],
      prevPlayerX: 0,
      prevPlayerZ: 0,
      hasPrevPlayer: false,
    }),
    stepAi: (ctx: EnemyAiStepContext) => {
      const ai = ctx.aiState as unknown as BombardierAiState;
      const rig = ctx.rig as MortarBombardierRigHandle;
      const { dt, elapsed, state, spatial, playerPos, world, callbacks } = ctx;
      const cfg = MORTAR_POD_BOMBARDIER_CONFIG;

      // Track player lateral velocity for smart ballistic lead & Carpet Barrage walking vector
      let playerVx = 0;
      let playerVz = 0;
      if (ai.hasPrevPlayer && dt > 0.0005) {
        playerVx = THREE.MathUtils.clamp((playerPos.x - ai.prevPlayerX) / dt, -14, 14);
        playerVz = THREE.MathUtils.clamp((playerPos.z - ai.prevPlayerZ) / dt, -14, 14);
      }
      ai.prevPlayerX = playerPos.x;
      ai.prevPlayerZ = playerPos.z;
      ai.hasPrevPlayer = true;

      // Tick all 5 attack cooldowns
      ai.stompCooldown = Math.max(0, ai.stompCooldown - dt);
      ai.carpetCooldown = Math.max(0, ai.carpetCooldown - dt);
      ai.flakCooldown = Math.max(0, ai.flakCooldown - dt);
      ai.salvoCooldown = Math.max(0, ai.salvoCooldown - dt);
      ai.shrapnelCooldown = Math.max(0, ai.shrapnelCooldown - dt);

      if (state.staggerTimer > 0) {
        ai.phase = 'reposition';
        rig.setTargetLaser(false, 0, 0);
        stepEnemyMovement(spatial, 0, 0, world, dt, F7_MIN_FLOOR_Y);
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
      const dz = playerPos.z - spatial.z;
      const vertDist = Math.abs(playerPos.y - spatial.y);
      const horizDist = Math.hypot(dx, dz);
      const hasLos =
        horizDist <= cfg.detectRange &&
        hasEnemyLineOfSight(
          spatial.x,
          spatial.y + 1.78,
          spatial.z,
          playerPos.x,
          playerPos.y + 1.3,
          playerPos.z,
          world
        );

      if (hasLos || horizDist < 22) state.engaged = true;

      let desVx = 0;
      let desVz = 0;
      let attackProgress = 0;
      let attackVariant = 0;
      let laserActive = false;
      let laserDanger = 0;

      if (!state.engaged) {
        state.behavior = 'patrol';
      } else {
        const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);
        const dirX = horizDist > 0.01 ? dx / horizDist : -Math.sin(spatial.yaw);
        const dirZ = horizDist > 0.01 ? dz / horizDist : -Math.cos(spatial.yaw);
        const rightX = -dirZ;
        const rightZ = dirX;

        if (ai.phase === 'reposition') {
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 5.2, dt);

          const choice = selectBombardierAttack({
            horizDist,
            vertDist,
            hasLos,
            hasAttackToken: ctx.hasAttackToken,
            drumsBroken: state.weakpoint.broken,
            stompCooldown: ai.stompCooldown,
            carpetCooldown: ai.carpetCooldown,
            flakCooldown: ai.flakCooldown,
            salvoCooldown: ai.salvoCooldown,
            shrapnelCooldown: ai.shrapnelCooldown,
            roll: Math.random(),
          });

          if (choice === 'concussion_shock_stomp') {
            ai.phase = 'stomp_windup';
            ai.timer = 0.56;
            ai.hitApplied = false;
            ai.stompCooldown = 4.2 + Math.random() * 1.4;
            callbacks.onTelegraphAudio('boss_slam');
            _glint.set(spatial.x, spatial.y + 0.65, spatial.z);
            callbacks.spawnPerilGlint(_glint, 0xff8c18);
          } else if (choice === 'suppressive_shrapnel_fan') {
            ai.phase = 'shrapnel_windup';
            ai.timer = 0.44;
            ai.hitApplied = false;
            ai.shrapnelCooldown = 3.8 + Math.random() * 1.4;
            callbacks.onTelegraphAudio('pyro_flare');
            rig.getFlakMuzzleWorldPos(_glint);
            callbacks.spawnPerilGlint(_glint, 0xff9a20);
          } else if (choice === 'carpet_cluster_barrage') {
            ai.phase = 'carpet_windup';
            ai.timer = 0.72;
            ai.carpetCooldown = 6.8 + Math.random() * 2.2;
            ai.carpetTargets = computeCarpetStrikeTargets(
              playerPos.x,
              playerPos.y,
              playerPos.z,
              playerVx,
              playerVz,
              rightX,
              rightZ
            );
            callbacks.onTelegraphAudio('mortar');
            rig.getWeakpointWorldPos(_glint);
            callbacks.spawnPerilGlint(_glint, 0xff6a14);
          } else if (choice === 'direct_flak_burst') {
            ai.phase = 'flak_windup';
            ai.timer = 0.46;
            ai.flakCooldown = 3.4 + Math.random() * 1.3;
            callbacks.onTelegraphAudio('rail_charge');
            rig.getFlakMuzzleWorldPos(_glint);
            callbacks.spawnPerilGlint(_glint, 0xffaa24);
          } else if (choice === 'incendium_bracket_salvo') {
            ai.phase = 'salvo_windup';
            ai.timer = 0.58;
            ai.salvoCooldown = 3.4 + Math.random() * 1.2;
            callbacks.onTelegraphAudio('mortar');
            rig.getWeakpointWorldPos(_glint);
            callbacks.spawnPerilGlint(_glint, 0xffaa18);
          } else {
            // Tactical artillery spacing: hold high-ground / mid-long range while strafing
            if (horizDist < cfg.preferredMinRange) {
              state.behavior = 'strafe';
              desVx = -dirX * cfg.moveSpeed * 0.68 + rightX * ai.strafeSign * cfg.moveSpeed * 0.52;
              desVz = -dirZ * cfg.moveSpeed * 0.68 + rightZ * ai.strafeSign * cfg.moveSpeed * 0.52;
            } else if (horizDist > cfg.preferredMaxRange) {
              state.behavior = 'chase';
              desVx = dirX * cfg.moveSpeed * 0.85;
              desVz = dirZ * cfg.moveSpeed * 0.85;
            } else {
              state.behavior = 'strafe';
              desVx = rightX * ai.strafeSign * cfg.moveSpeed * 0.48;
              desVz = rightZ * ai.strafeSign * cfg.moveSpeed * 0.48;
            }
          }
        } else if (ai.phase === 'salvo_windup') {
          state.behavior = 'windup';
          attackVariant = 0;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 5.5, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / 0.58);
          if (ai.timer <= 0) {
            ai.phase = 'salvo_fire';
            // Rupturing the Shoulder Ordnance Drums cuts salvo down to 1 shell!
            ai.shotsLeft = state.weakpoint.broken ? 1 : 2;
            ai.shotDelay = 0.04;
          }
        } else if (ai.phase === 'salvo_fire') {
          state.behavior = 'attack';
          attackVariant = 0;
          ai.shotDelay -= dt;
          attackProgress = ai.shotsLeft >= 2 ? 0.35 : 0.84;
          if (ai.shotDelay <= 0 && ai.shotsLeft > 0) {
            ai.shotsLeft -= 1;
            ai.shotDelay = 0.34;
            const side = ai.podSide;
            ai.podSide = side < 0 ? 1 : -1;

            rig.getPodMuzzleWorldPos(side, _muzzle);
            rig.triggerPodRecoil(side);

            const spread = ai.shotsLeft === 0 ? 1.65 : -1.35;
            _target.set(
              playerPos.x + playerVx * 0.35 + rightX * spread,
              playerPos.y + 0.1,
              playerPos.z + playerVz * 0.35 + rightZ * spread
            );

            const gravity = 15.5;
            const arc = computeBallisticMortarArc(
              _muzzle.x,
              _muzzle.y,
              _muzzle.z,
              _target.x,
              _target.y,
              _target.z,
              gravity
            );
            _vel.set(arc.vx, arc.vy, arc.vz).normalize();

            callbacks.spawnMuzzleFlash(_muzzle, _vel, 0xffaa18, true);
            callbacks.onFireAudio('mortar');
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _vel.clone(),
              speed: arc.speed,
              damage: 22,
              radius: 0.22,
              color: 0xffaa18,
              kind: 'mortar_canister',
              gravity,
              splashRadius: 3.45,
              targetPos: _target.clone(),
              staggerStrength: 0.58,
            });

            if (ai.shotsLeft === 0) {
              ai.phase = 'recover';
              ai.timer = 0.85;
              ai.strafeSign *= -1;
            }
          }
        } else if (ai.phase === 'carpet_windup') {
          state.behavior = 'windup';
          attackVariant = 1;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.2, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / 0.72);
          laserActive = true;
          laserDanger = attackProgress;
          if (ai.timer <= 0) {
            ai.phase = 'carpet_fire';
            ai.shotsLeft = 3;
            ai.shotDelay = 0.04;
            // Re-lock carpet targets at final launch moment for razor-sharp pressure
            ai.carpetTargets = computeCarpetStrikeTargets(
              playerPos.x,
              playerPos.y,
              playerPos.z,
              playerVx,
              playerVz,
              rightX,
              rightZ
            );
          }
        } else if (ai.phase === 'carpet_fire') {
          state.behavior = 'attack';
          attackVariant = 1;
          ai.shotDelay -= dt;
          const idx = 3 - ai.shotsLeft;
          attackProgress = Math.min(1, 0.25 + idx * 0.34);
          laserActive = true;
          laserDanger = 1.0;

          if (ai.shotDelay <= 0 && ai.shotsLeft > 0) {
            const tgt = ai.carpetTargets[idx] ?? {
              x: playerPos.x,
              y: playerPos.y + 0.1,
              z: playerPos.z,
            };
            ai.shotsLeft -= 1;
            ai.shotDelay = 0.25;
            const side = ai.podSide;
            ai.podSide = side < 0 ? 1 : -1;

            rig.getPodMuzzleWorldPos(side, _muzzle);
            rig.triggerPodRecoil(side);

            _target.set(tgt.x, tgt.y, tgt.z);
            const gravity = 16.5;
            const arc = computeBallisticMortarArc(
              _muzzle.x,
              _muzzle.y,
              _muzzle.z,
              _target.x,
              _target.y,
              _target.z,
              gravity
            );
            _vel.set(arc.vx, arc.vy, arc.vz).normalize();

            callbacks.spawnMuzzleFlash(_muzzle, _vel, 0xff6a14, true);
            callbacks.onFireAudio('mortar');
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _vel.clone(),
              speed: arc.speed,
              damage: 20,
              radius: 0.23,
              color: 0xff6a14,
              kind: 'mortar_canister',
              gravity,
              splashRadius: 3.3,
              targetPos: _target.clone(),
              staggerStrength: 0.62,
            });

            if (ai.shotsLeft === 0) {
              ai.phase = 'recover';
              ai.timer = 1.05;
              ai.strafeSign *= -1;
            }
          }
        } else if (ai.phase === 'flak_windup') {
          state.behavior = 'windup';
          attackVariant = 2;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.0, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / 0.46);
          laserActive = true;
          laserDanger = 0.4 + attackProgress * 0.6;
          if (ai.timer <= 0) {
            ai.phase = 'flak_fire';
            ai.shotsLeft = 2;
            ai.shotDelay = 0.02;
          }
        } else if (ai.phase === 'flak_fire') {
          state.behavior = 'attack';
          attackVariant = 2;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 7.5, dt);
          ai.shotDelay -= dt;
          attackProgress = ai.shotsLeft === 2 ? 0.35 : 0.82;
          laserActive = true;
          laserDanger = 0.9;

          if (ai.shotDelay <= 0 && ai.shotsLeft > 0) {
            ai.shotsLeft -= 1;
            ai.shotDelay = 0.28;
            rig.getFlakMuzzleWorldPos(_muzzle);
            rig.triggerFlakSpin();

            const tLead = Math.min(0.28, horizDist / 34);
            _target.set(
              playerPos.x + playerVx * tLead,
              playerPos.y + 1.05,
              playerPos.z + playerVz * tLead
            );
            _vel.subVectors(_target, _muzzle).normalize();

            callbacks.spawnMuzzleFlash(_muzzle, _vel, 0xffaa24, true);
            callbacks.onFireAudio('shotgun');
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _vel.clone(),
              speed: 31,
              damage: 18,
              radius: 0.2,
              color: 0xffaa24,
              kind: 'boss_overdrive',
              splashRadius: 2.15,
              staggerStrength: 0.48,
            });

            if (ai.shotsLeft === 0) {
              ai.phase = 'recover';
              ai.timer = 0.62;
              ai.strafeSign *= -1;
            }
          }
        } else if (ai.phase === 'shrapnel_windup') {
          state.behavior = 'windup';
          attackVariant = 3;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.5, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / 0.44);
          if (ai.timer <= 0) {
            ai.phase = 'shrapnel_fire';
            ai.timer = 0.32;
            rig.getFlakMuzzleWorldPos(_muzzle);
            rig.triggerFlakSpin();

            const baseYaw = computeFacingYaw(_muzzle.x, _muzzle.z, playerPos.x, playerPos.z);
            const pitch = Math.atan2(
              playerPos.y + 1.08 - _muzzle.y,
              Math.max(1.2, Math.hypot(playerPos.x - _muzzle.x, playerPos.z - _muzzle.z))
            );
            const offsets = [-0.24, -0.12, 0, 0.12, 0.24];
            for (const off of offsets) {
              const yaw = baseYaw + off;
              const cp = Math.cos(pitch);
              _vel.set(-Math.sin(yaw) * cp, Math.sin(pitch) + (Math.random() - 0.5) * 0.04, -Math.cos(yaw) * cp).normalize();
              callbacks.spawnProjectile({
                origin: _muzzle.clone(),
                direction: _vel.clone(),
                speed: 35,
                damage: 9,
                radius: 0.14,
                color: 0xffb830,
                kind: 'shotgun_pellet',
                staggerStrength: 0.26,
              });
            }
            callbacks.spawnMuzzleFlash(_muzzle, _vel, 0xffaa24, true);
            callbacks.onFireAudio('shotgun');
          }
        } else if (ai.phase === 'shrapnel_fire') {
          state.behavior = 'attack';
          attackVariant = 3;
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / 0.32);
          if (ai.timer <= 0) {
            ai.phase = 'recover';
            ai.timer = 0.56;
            ai.strafeSign *= -1;
          }
        } else if (ai.phase === 'stomp_windup') {
          state.behavior = 'windup';
          attackVariant = 4;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.5, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / 0.56);
          if (ai.timer <= 0) {
            ai.phase = 'stomp_slam';
            ai.timer = 0.38;
            ai.hitApplied = false;
          }
        } else if (ai.phase === 'stomp_slam') {
          state.behavior = 'attack';
          attackVariant = 4;
          ai.timer -= dt;
          const p = 1 - Math.max(0, ai.timer / 0.38);
          attackProgress = p;

          if (!ai.hitApplied && p >= 0.36) {
            ai.hitApplied = true;
            _origin.set(spatial.x, spatial.y + 0.06, spatial.z);
            callbacks.spawnShockwave({
              center: _origin.clone(),
              maxRadius: 5.4,
              expandSpeed: 13.0,
              damage: 25,
              color: 0xff9a18,
              staggerStrength: 0.85,
            });
            callbacks.spawnImpactVfx(_origin, false, true);
            callbacks.onFireAudio('mortar');
          }

          if (ai.timer <= 0) {
            ai.phase = 'recover';
            ai.timer = 0.72;
            ai.strafeSign *= -1;
          }
        } else if (ai.phase === 'recover') {
          state.behavior = 'recover';
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 5.2, dt);
          ai.timer -= dt;
          if (ai.timer <= 0) {
            ai.phase = 'reposition';
          }
        }
      }

      // Keep elevated Bombardiers anchored cleanly on their balcony slabs (never walk off ledges!)
      stepEnemyMovement(
        spatial,
        desVx + ctx.separation.x * 1.4,
        desVz + ctx.separation.y * 1.4,
        world,
        dt,
        F7_MIN_FLOOR_Y
      );

      // Update live wall-clipped ballistic rangefinder laser beam
      if (laserActive) {
        const eyeY = spatial.y + 1.82;
        const hitWall = raycastCollisionWorld3D(
          spatial.x,
          eyeY,
          spatial.z,
          playerPos.x,
          playerPos.y + 1.18,
          playerPos.z,
          world,
          _rayHit
        );
        const len = hitWall
          ? Math.hypot(
              _rayHit.point.x - spatial.x,
              _rayHit.point.y - eyeY,
              _rayHit.point.z - spatial.z
            )
          : Math.min(34, Math.hypot(dx, playerPos.y + 1.18 - eyeY, dz));
        rig.setTargetLaser(true, len, laserDanger);
      } else {
        rig.setTargetLaser(false, 0, 0);
      }

      const speed = Math.hypot(spatial.vx, spatial.vz);
      const fwdX = -Math.sin(spatial.yaw);
      const fwdZ = -Math.cos(spatial.yaw);
      const sideX = Math.cos(spatial.yaw);
      const sideZ = -Math.sin(spatial.yaw);

      rig.updateAnimation({
        dt,
        elapsed,
        behavior: state.behavior,
        speedRatio: speed / cfg.moveSpeed,
        localMoveX: (spatial.vx * sideX + spatial.vz * sideZ) / Math.max(1, cfg.moveSpeed),
        localMoveZ: (spatial.vx * fwdX + spatial.vz * fwdZ) / Math.max(1, cfg.moveSpeed),
        aimPitch: 0,
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
