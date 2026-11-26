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
import { EXO_CARBINE_TROOPER_CONFIG } from './config';
import { buildExoCarbineTrooperRig, type ExoCarbineRigHandle } from './mesh';
import { computeFlushGrenadeVelocity, selectExoTrooperAttack } from './tactics';
import { createExoTrooperTextures } from './textures';

const F7_MIN_FLOOR_Y = F7_BASE_Y - 0.8;

type ActiveAttackMode = 'none' | 'pulse_burst' | 'jet_flank' | 'hyper_burst' | 'flush_grenade' | 'cqc_bash';

interface ExoTrooperAiState {
  mode: ActiveAttackMode;
  modeTimer: number;
  burstCooldown: number;
  jetCooldown: number;
  hyperCooldown: number;
  grenadeCooldown: number;
  cqcCooldown: number;
  shotsLeft: number;
  shotTimer: number;
  strafeDir: number;
  strafeTimer: number;
  timeWithoutLos: number;
  jetBackdashTimer: number;
  cqcHitApplied: boolean;
  patrolIdx: number;
  prevPlayerX: number;
  prevPlayerZ: number;
  hasPrevPlayer: boolean;
}

const _muzzle = new THREE.Vector3();
const _aimDir = new THREE.Vector3();
const _exhaustDir = new THREE.Vector3();
const _rayHit = { hit: false, point: new THREE.Vector3(), normal: new THREE.Vector3(), t: 1 };
const _tmpPos = new THREE.Vector3();

export function createExoCarbineTrooperBrain(mats: Floor07EnemyMaterials): EnemyArchetypeBrain {
  // Share one high-res procedural PBR texture suite across all Floor 07 Exo-Carbine Troopers
  const sharedTextures = createExoTrooperTextures();

  return {
    config: EXO_CARBINE_TROOPER_CONFIG,
    createRig: (enemyId) => buildExoCarbineTrooperRig(enemyId, mats, sharedTextures),
    createAiState: (): Record<string, unknown> => ({
      mode: 'none',
      modeTimer: 0,
      burstCooldown: 0.65 + Math.random() * 0.6,
      jetCooldown: 2.6 + Math.random() * 1.8,
      hyperCooldown: 3.4 + Math.random() * 2.2,
      grenadeCooldown: 4.5 + Math.random() * 2.5,
      cqcCooldown: 0,
      shotsLeft: 0,
      shotTimer: 0,
      strafeDir: Math.random() < 0.5 ? -1 : 1,
      strafeTimer: 1.4 + Math.random() * 1.3,
      timeWithoutLos: 0,
      jetBackdashTimer: 0,
      cqcHitApplied: false,
      patrolIdx: 0,
      prevPlayerX: 0,
      prevPlayerZ: 0,
      hasPrevPlayer: false,
    }),
    stepAi: (ctx: EnemyAiStepContext) => {
      const ai = ctx.aiState as unknown as ExoTrooperAiState;
      const rig = ctx.rig as ExoCarbineRigHandle;
      const { dt, elapsed, state, spatial, playerPos, world, callbacks } = ctx;
      const cfg = EXO_CARBINE_TROOPER_CONFIG;

      // Track player lateral velocity for smart target lead prediction
      let playerVx = 0;
      let playerVz = 0;
      if (ai.hasPrevPlayer && dt > 0.001) {
        playerVx = THREE.MathUtils.clamp((playerPos.x - ai.prevPlayerX) / dt, -10, 10);
        playerVz = THREE.MathUtils.clamp((playerPos.z - ai.prevPlayerZ) / dt, -10, 10);
      }
      ai.prevPlayerX = playerPos.x;
      ai.prevPlayerZ = playerPos.z;
      ai.hasPrevPlayer = true;

      if (state.staggerTimer > 0) {
        ai.mode = 'none';
        ai.shotsLeft = 0;
        ai.jetBackdashTimer = 0;
        rig.setLaserSight(false, 0, 0);
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
          weakpointExposed: state.weakpoint.exposed,
          weakpointBroken: state.weakpoint.broken,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
          boosterIntensity: 0,
        });
        return;
      }

      const dx = playerPos.x - spatial.x;
      const dy = playerPos.y - (spatial.y + 1.45);
      const dz = playerPos.z - spatial.z;
      const horizDist = Math.hypot(dx, dz);
      const dist3d = Math.hypot(horizDist, dy);
      const hasLos =
        horizDist <= cfg.detectRange &&
        hasEnemyLineOfSight(
          spatial.x,
          spatial.y + 1.5,
          spatial.z,
          playerPos.x,
          playerPos.y + 1.35,
          playerPos.z,
          world
        );

      if (hasLos || horizDist < 15.5) state.engaged = true;
      ai.timeWithoutLos = state.engaged && !hasLos ? ai.timeWithoutLos + dt : 0;

      ai.burstCooldown = Math.max(0, ai.burstCooldown - dt);
      ai.jetCooldown = Math.max(0, ai.jetCooldown - dt);
      ai.hyperCooldown = Math.max(0, ai.hyperCooldown - dt);
      ai.grenadeCooldown = Math.max(0, ai.grenadeCooldown - dt);
      ai.cqcCooldown = Math.max(0, ai.cqcCooldown - dt);
      ai.jetBackdashTimer = Math.max(0, ai.jetBackdashTimer - dt);

      ai.strafeTimer -= dt;
      if (ai.strafeTimer <= 0) {
        ai.strafeDir *= -1;
        ai.strafeTimer = 1.45 + Math.random() * 1.4;
      }

      let desVx = 0;
      let desVz = 0;
      let attackVariant = 0;
      let attackProgress = 0;
      let airborneHeight = 0;
      let boosterIntensity = 0;
      let laserActive = false;
      let laserLen = 0;
      let laserDanger = 0;

      if (!state.engaged) {
        state.behavior = 'patrol';
        const pt = ctx.patrolPoints[ai.patrolIdx % ctx.patrolPoints.length];
        const px = pt.x - spatial.x;
        const pz = pt.z - spatial.z;
        const pDist = Math.hypot(px, pz);
        if (pDist < 0.7 && ctx.patrolPoints.length > 1) {
          ai.patrolIdx = (ai.patrolIdx + 1) % ctx.patrolPoints.length;
        } else if (pDist > 0.25) {
          const inv = 1 / pDist;
          desVx = px * inv * (cfg.moveSpeed * 0.45);
          desVz = pz * inv * (cfg.moveSpeed * 0.45);
          spatial.yaw = rotateYawTowards(
            spatial.yaw,
            computeFacingYaw(spatial.x, spatial.z, pt.x, pt.z),
            4.2,
            dt
          );
        }
      } else {
        const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);
        spatial.yaw = rotateYawTowards(
          spatial.yaw,
          targetYaw,
          ai.mode === 'hyper_burst' ? 4.8 : 7.6,
          dt
        );

        const dirX = horizDist > 0.01 ? dx / horizDist : 0;
        const dirZ = horizDist > 0.01 ? dz / horizDist : 1;
        const rightX = -dirZ;
        const rightZ = dirX;

        // If no multi-step attack is active, pick the smartest scary attack from tactics.ts!
        if (ai.mode === 'none') {
          const picked = selectExoTrooperAttack({
            horizDist,
            hasLos,
            hasAttackToken: ctx.hasAttackToken,
            exoPackBroken: state.weakpoint.broken,
            burstCooldown: ai.burstCooldown,
            jetCooldown: ai.jetCooldown,
            hyperCooldown: ai.hyperCooldown,
            grenadeCooldown: ai.grenadeCooldown,
            cqcCooldown: ai.cqcCooldown,
            timeWithoutLos: ai.timeWithoutLos,
            roll: Math.random(),
          });

          if (picked === 'cqc_buttstroke') {
            ai.mode = 'cqc_bash';
            ai.modeTimer = 0.56;
            ai.cqcHitApplied = false;
            ai.cqcCooldown = 2.6;
            callbacks.onTelegraphAudio('melee');
            rig.getVisorWorldPos(_tmpPos);
            callbacks.spawnPerilGlint(_tmpPos, 0x38e8ff);
          } else if (picked === 'flush_grenade') {
            ai.mode = 'flush_grenade';
            ai.modeTimer = 0.64;
            ai.shotsLeft = 1;
            ai.grenadeCooldown = 6.2 + Math.random() * 2.4;
            callbacks.onTelegraphAudio('mortar');
            rig.getGrenadeMuzzleWorldPos(_tmpPos);
            callbacks.spawnPerilGlint(_tmpPos, 0xffaa24);
          } else if (picked === 'overcharged_hyper_burst') {
            ai.mode = 'hyper_burst';
            ai.modeTimer = 0.64; // laser sightline telegraph lock!
            ai.shotsLeft = 3;
            ai.shotTimer = 0;
            ai.hyperCooldown = 5.4 + Math.random() * 2.2;
            callbacks.onTelegraphAudio('rail_charge');
            rig.getVisorWorldPos(_tmpPos);
            callbacks.spawnPerilGlint(_tmpPos, 0xff2842);
          } else if (picked === 'jet_flank_burst') {
            ai.mode = 'jet_flank';
            ai.modeTimer = 0.62;
            ai.shotsLeft = 3;
            ai.shotTimer = 0.12;
            ai.strafeDir = Math.random() < 0.5 ? -1 : 1;
            ai.jetCooldown = 4.4 + Math.random() * 2.0;
            callbacks.onTelegraphAudio('booster_burst');
            rig.getBoosterNozzleWorldPos(-1, _tmpPos);
            _exhaustDir.set(Math.sin(spatial.yaw), -0.4, Math.cos(spatial.yaw)).normalize();
            callbacks.spawnBoosterBurst(_tmpPos, _exhaustDir, 0x38e8ff, 10);
          } else if (picked === 'pulse_burst') {
            ai.mode = 'pulse_burst';
            ai.shotsLeft = 4;
            ai.shotTimer = 0.05;
            ai.burstCooldown = 1.55 + Math.random() * 0.65;
          }
        }

        // Execute active attack mode
        if (ai.mode === 'cqc_bash') {
          attackVariant = 4;
          ai.modeTimer -= dt;
          const total = 0.56;
          const elapsedMode = total - ai.modeTimer;
          if (elapsedMode < 0.24) {
            state.behavior = 'windup';
            attackProgress = elapsedMode / 0.24;
            desVx = dirX * cfg.sprintSpeed * 0.9;
            desVz = dirZ * cfg.sprintSpeed * 0.9;
          } else {
            state.behavior = 'attack';
            attackProgress = Math.min(1, (elapsedMode - 0.24) / 0.32);
            if (!ai.cqcHitApplied) {
              ai.cqcHitApplied = true;
              const fx = -Math.sin(spatial.yaw);
              const fz = -Math.cos(spatial.yaw);
              _tmpPos.set(spatial.x + fx * 0.72, spatial.y + 1.24, spatial.z + fz * 0.72);
              callbacks.spawnBladeSlashArc(_tmpPos, spatial.yaw, 0.08, 0.04, 1.9, 0x38e8ff, false, 1);
              if (horizDist <= 3.1 && !ctx.playerRolling) {
                callbacks.applyPlayerMeleeHit(18, _tmpPos.set(spatial.x, spatial.y + 1.2, spatial.z), 0.78);
              }
            }
          }
          if (ai.modeTimer <= 0) {
            ai.mode = 'none';
            // Reactive jet-hop backward to reopen firing distance if exo-pack is intact!
            if (!state.weakpoint.broken) {
              ai.jetBackdashTimer = 0.42;
              callbacks.onTelegraphAudio('booster_burst');
              rig.getWeakpointWorldPos(_tmpPos);
              _exhaustDir.set(-dirX, -0.35, -dirZ).normalize();
              callbacks.spawnBoosterBurst(_tmpPos, _exhaustDir, 0x38e8ff, 8);
            }
          }
        } else if (ai.mode === 'flush_grenade') {
          attackVariant = 3;
          ai.modeTimer -= dt;
          if (ai.modeTimer > 0.24) {
            state.behavior = 'windup';
            attackProgress = 1 - (ai.modeTimer - 0.24) / 0.4;
            desVx = rightX * ai.strafeDir * cfg.moveSpeed * 0.4;
            desVz = rightZ * ai.strafeDir * cfg.moveSpeed * 0.4;
          } else {
            state.behavior = 'attack';
            attackProgress = Math.min(1, (0.24 - ai.modeTimer) / 0.24);
            if (ai.shotsLeft > 0) {
              ai.shotsLeft = 0;
              rig.getGrenadeMuzzleWorldPos(_muzzle);
              const leadX = playerPos.x + playerVx * 0.55;
              const leadZ = playerPos.z + playerVz * 0.55;
              const gravity = 19.5;
              const flightTime = THREE.MathUtils.clamp(horizDist / 14.5, 0.68, 1.35);
              const vel = computeFlushGrenadeVelocity(
                _muzzle.x,
                _muzzle.y,
                _muzzle.z,
                leadX,
                playerPos.y + 0.12,
                leadZ,
                gravity,
                flightTime
              );
              _aimDir.set(vel.vx, vel.vy, vel.vz).normalize();
              callbacks.spawnMuzzleFlash(_muzzle, _aimDir, 0xffaa24, true);
              callbacks.onFireAudio('mortar');
              callbacks.spawnProjectile({
                origin: _muzzle.clone(),
                direction: _aimDir.clone(),
                speed: vel.speed,
                damage: 22,
                radius: 0.18,
                color: 0xff8c1a,
                kind: 'mortar_canister',
                gravity,
                splashRadius: 3.1,
                targetPos: new THREE.Vector3(leadX, playerPos.y + 0.06, leadZ),
                staggerStrength: 0.72,
              });
            }
          }
          if (ai.modeTimer <= 0) ai.mode = 'none';
        } else if (ai.mode === 'hyper_burst') {
          attackVariant = 2;
          if (ai.modeTimer > 0) {
            ai.modeTimer -= dt;
            state.behavior = 'windup';
            attackProgress = 1 - Math.max(0, ai.modeTimer) / 0.64;

            // Live wall-clipped laser targeting sightline!
            rig.getMuzzleWorldPos(_muzzle);
            const rayDist = Math.min(34, Math.max(4, horizDist + 4));
            const endX = _muzzle.x - Math.sin(spatial.yaw) * rayDist;
            const endY = _muzzle.y + Math.sin(Math.atan2(dy, Math.max(1, horizDist))) * rayDist;
            const endZ = _muzzle.z - Math.cos(spatial.yaw) * rayDist;
            const hitWall = raycastCollisionWorld3D(
              _muzzle.x,
              _muzzle.y,
              _muzzle.z,
              endX,
              endY,
              endZ,
              world,
              _rayHit
            );
            laserActive = true;
            laserLen = hitWall ? _muzzle.distanceTo(_rayHit.point) : rayDist;
            laserDanger = attackProgress;
          } else if (ai.shotsLeft > 0) {
            state.behavior = 'attack';
            ai.shotTimer -= dt;
            attackProgress = Math.min(1, (3 - ai.shotsLeft) / 3 + 0.2);
            if (ai.shotTimer <= 0) {
              ai.shotsLeft -= 1;
              ai.shotTimer = 0.085;
              rig.getMuzzleWorldPos(_muzzle);
              const tLead = Math.min(0.32, horizDist / 56);
              _aimDir
                .set(
                  playerPos.x + playerVx * tLead - _muzzle.x + (Math.random() - 0.5) * 0.22,
                  playerPos.y + 1.24 - _muzzle.y + (Math.random() - 0.5) * 0.14,
                  playerPos.z + playerVz * tLead - _muzzle.z + (Math.random() - 0.5) * 0.22
                )
                .normalize();
              callbacks.spawnMuzzleFlash(_muzzle, _aimDir, 0xff3b52, true);
              callbacks.onFireAudio('boss_carbine');
              callbacks.spawnProjectile({
                origin: _muzzle.clone(),
                direction: _aimDir.clone(),
                speed: 54,
                damage: 14,
                radius: 0.14,
                color: 0xff3856,
                kind: 'rail_slug',
                staggerStrength: 0.42,
              });
            }
          } else {
            ai.mode = 'none';
          }
        } else if (ai.mode === 'jet_flank') {
          attackVariant = 1;
          ai.modeTimer = Math.max(0, ai.modeTimer - dt);
          const frac = 1 - ai.modeTimer / 0.62;
          airborneHeight = Math.sin(frac * Math.PI) * 0.58;
          boosterIntensity = state.weakpoint.broken ? 0 : 1.05;
          desVx = rightX * ai.strafeDir * cfg.sprintSpeed * 1.6 + dirX * 1.4;
          desVz = rightZ * ai.strafeDir * cfg.sprintSpeed * 1.6 + dirZ * 1.4;
          state.behavior = ai.shotsLeft > 0 ? 'attack' : 'strafe';

          if (ai.shotsLeft > 0 && hasLos) {
            ai.shotTimer -= dt;
            attackProgress = Math.min(1, (3 - ai.shotsLeft) / 3 + 0.15);
            if (ai.shotTimer <= 0) {
              ai.shotsLeft -= 1;
              ai.shotTimer = 0.13;
              rig.getMuzzleWorldPos(_muzzle);
              const tLead = Math.min(0.3, horizDist / 40);
              _aimDir
                .set(
                  playerPos.x + playerVx * tLead - _muzzle.x + (Math.random() - 0.5) * 0.36,
                  playerPos.y + 1.24 - _muzzle.y + (Math.random() - 0.5) * 0.22,
                  playerPos.z + playerVz * tLead - _muzzle.z + (Math.random() - 0.5) * 0.36
                )
                .normalize();
              callbacks.spawnMuzzleFlash(_muzzle, _aimDir, 0x38e8ff, false);
              callbacks.onFireAudio('rifle');
              callbacks.spawnProjectile({
                origin: _muzzle.clone(),
                direction: _aimDir.clone(),
                speed: 40,
                damage: 11,
                radius: 0.12,
                color: 0x38e8ff,
                kind: 'plasma_bolt',
                staggerStrength: 0.16,
              });
            }
          }
          if (ai.modeTimer <= 0) ai.mode = 'none';
        } else if (ai.mode === 'pulse_burst') {
          attackVariant = 0;
          state.behavior = 'attack';
          desVx = rightX * ai.strafeDir * cfg.moveSpeed * 0.72;
          desVz = rightZ * ai.strafeDir * cfg.moveSpeed * 0.72;
          ai.shotTimer -= dt;
          attackProgress = Math.min(1, (4 - ai.shotsLeft) / 4 + 0.15);
          if (ai.shotTimer <= 0) {
            ai.shotsLeft -= 1;
            ai.shotTimer = 0.11;
            rig.getMuzzleWorldPos(_muzzle);
            const tLead = Math.min(0.28, horizDist / 38);
            _aimDir
              .set(
                playerPos.x + playerVx * tLead - _muzzle.x + (Math.random() - 0.5) * 0.38,
                playerPos.y + 1.25 - _muzzle.y + (Math.random() - 0.5) * 0.24,
                playerPos.z + playerVz * tLead - _muzzle.z + (Math.random() - 0.5) * 0.38
              )
              .normalize();
            callbacks.spawnMuzzleFlash(_muzzle, _aimDir, 0x38e8ff, false);
            callbacks.onFireAudio('rifle');
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _aimDir.clone(),
              speed: 38,
              damage: 11,
              radius: 0.12,
              color: 0x38e8ff,
              kind: 'plasma_bolt',
              staggerStrength: 0.14,
            });
            if (ai.shotsLeft <= 0) ai.mode = 'none';
          }
        } else {
          // Tactical positioning & reactive backdash
          if (ai.jetBackdashTimer > 0) {
            state.behavior = 'strafe';
            const f = ai.jetBackdashTimer / 0.42;
            airborneHeight = Math.sin(f * Math.PI) * 0.42;
            boosterIntensity = 0.95;
            desVx = -dirX * cfg.sprintSpeed * 1.45 + rightX * ai.strafeDir * 1.8;
            desVz = -dirZ * cfg.sprintSpeed * 1.45 + rightZ * ai.strafeDir * 1.8;
          } else if (horizDist > cfg.preferredMaxRange || !hasLos) {
            state.behavior = 'chase';
            desVx = dirX * cfg.sprintSpeed + rightX * ai.strafeDir * 1.5;
            desVz = dirZ * cfg.sprintSpeed + rightZ * ai.strafeDir * 1.5;
          } else if (horizDist < cfg.preferredMinRange) {
            state.behavior = 'strafe';
            desVx = -dirX * cfg.moveSpeed * 0.78 + rightX * ai.strafeDir * cfg.moveSpeed * 0.9;
            desVz = -dirZ * cfg.moveSpeed * 0.78 + rightZ * ai.strafeDir * cfg.moveSpeed * 0.9;
          } else {
            state.behavior = 'strafe';
            desVx = rightX * ai.strafeDir * cfg.moveSpeed * 0.92;
            desVz = rightZ * ai.strafeDir * cfg.moveSpeed * 0.92;
          }
        }
      }

      rig.setLaserSight(laserActive, laserLen, laserDanger);

      desVx += ctx.separation.x * 2.4;
      desVz += ctx.separation.y * 2.4;
      stepEnemyMovement(spatial, desVx, desVz, world, dt, F7_MIN_FLOOR_Y);

      const speed = Math.hypot(spatial.vx, spatial.vz);
      const fwdX = -Math.sin(spatial.yaw);
      const fwdZ = -Math.cos(spatial.yaw);
      const sideX = Math.cos(spatial.yaw);
      const sideZ = -Math.sin(spatial.yaw);
      const localMoveZ = (spatial.vx * fwdX + spatial.vz * fwdZ) / Math.max(1, cfg.moveSpeed);
      const localMoveX = (spatial.vx * sideX + spatial.vz * sideZ) / Math.max(1, cfg.moveSpeed);
      const aimPitch = Math.atan2(dy, Math.max(1, dist3d));

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
        airborneHeight,
        boosterIntensity,
      });
    },
  };
}
