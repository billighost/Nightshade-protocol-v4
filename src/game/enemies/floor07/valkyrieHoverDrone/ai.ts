import * as THREE from 'three';
import {
  resolveWorldHorizontal3D,
  type HorizResolveResult,
} from '../../../arena/hideout/hideoutCollision';
import type { EnemyAiStepContext, EnemyArchetypeBrain } from '../../core/enemyManager';
import {
  computeFacingYaw,
  hasEnemyLineOfSight,
  raycastCollisionWorld3D,
  rotateYawTowards,
} from '../../core/enemyNav';
import type { Floor07EnemyMaterials } from '../materials';
import { VALKYRIE_HOVER_DRONE_CONFIG } from './config';
import { buildValkyrieHoverDroneRig, type ValkyrieDroneRigHandle } from './mesh';
import {
  computeMicroRocketOffsets,
  computeStrafeRunVector,
  selectValkyrieAttack,
} from './tactics';
import { createValkyrieDroneTextures } from './textures';

type ValkyriePhase =
  | 'orbit'
  | 'burst_fire'
  | 'rail_charge'
  | 'rail_fire'
  | 'strafe_dive'
  | 'rocket_windup'
  | 'rocket_fire'
  | 'emp_windup'
  | 'emp_blast'
  | 'evade_jink'
  | 'recover';

interface DroneAiState {
  homeX: number;
  homeY: number;
  homeZ: number;
  initialized: boolean;
  phase: ValkyriePhase;
  timer: number;
  orbitAngle: number;
  orbitDir: number;
  empCooldown: number;
  railCooldown: number;
  strafeRunCooldown: number;
  rocketCooldown: number;
  burstCooldown: number;
  jinkCooldown: number;
  shotsLeft: number;
  shotDelay: number;
  gunSide: -1 | 1;
  strafeVx: number;
  strafeVz: number;
  hitApplied: boolean;
  lastHp: number;
  prevPlayerX: number;
  prevPlayerZ: number;
  hasPrevPlayer: boolean;
}

const _muzzle = new THREE.Vector3();
const _glint = new THREE.Vector3();
const _aimDir = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _exhaustDir = new THREE.Vector3();
const _horizScratch: HorizResolveResult = { x: 0, z: 0, collided: false };
const _rayHit = { hit: false, point: new THREE.Vector3(), normal: new THREE.Vector3(), t: 1 };

export function createValkyrieHoverDroneBrain(mats: Floor07EnemyMaterials): EnemyArchetypeBrain {
  // Share one procedural aerospace PBR texture suite across all Floor 07 Valkyrie Hover-Drones
  const sharedTextures = createValkyrieDroneTextures();

  return {
    config: VALKYRIE_HOVER_DRONE_CONFIG,
    createRig: (enemyId) => buildValkyrieHoverDroneRig(enemyId, mats, sharedTextures),
    createAiState: (): Record<string, unknown> => ({
      homeX: 0,
      homeY: 88.4,
      homeZ: 0,
      initialized: false,
      phase: 'orbit',
      timer: 0,
      orbitAngle: Math.random() * Math.PI * 2,
      orbitDir: Math.random() < 0.5 ? -1 : 1,
      empCooldown: 1.0,
      railCooldown: 2.8 + Math.random() * 1.6,
      strafeRunCooldown: 3.4 + Math.random() * 1.8,
      rocketCooldown: 2.0 + Math.random() * 1.4,
      burstCooldown: 0.9 + Math.random() * 0.8,
      jinkCooldown: 1.8,
      shotsLeft: 0,
      shotDelay: 0,
      gunSide: -1,
      strafeVx: 0,
      strafeVz: 0,
      hitApplied: false,
      lastHp: VALKYRIE_HOVER_DRONE_CONFIG.maxHp,
      prevPlayerX: 0,
      prevPlayerZ: 0,
      hasPrevPlayer: false,
    }),
    stepAi: (ctx: EnemyAiStepContext) => {
      const ai = ctx.aiState as unknown as DroneAiState;
      const rig = ctx.rig as ValkyrieDroneRigHandle;
      const { dt, elapsed, state, spatial, playerPos, world, callbacks } = ctx;
      const cfg = VALKYRIE_HOVER_DRONE_CONFIG;

      if (!ai.initialized) {
        ai.homeX = spatial.x;
        ai.homeY = spatial.y;
        ai.homeZ = spatial.z;
        ai.initialized = true;
      }

      // Track player lateral velocity for crisp gunship lead targeting
      let playerVx = 0;
      let playerVz = 0;
      if (ai.hasPrevPlayer && dt > 0.0005) {
        playerVx = THREE.MathUtils.clamp((playerPos.x - ai.prevPlayerX) / dt, -14, 14);
        playerVz = THREE.MathUtils.clamp((playerPos.z - ai.prevPlayerZ) / dt, -14, 14);
      }
      ai.prevPlayerX = playerPos.x;
      ai.prevPlayerZ = playerPos.z;
      ai.hasPrevPlayer = true;

      // Tick cooldowns
      ai.empCooldown = Math.max(0, ai.empCooldown - dt);
      ai.railCooldown = Math.max(0, ai.railCooldown - dt);
      ai.strafeRunCooldown = Math.max(0, ai.strafeRunCooldown - dt);
      ai.rocketCooldown = Math.max(0, ai.rocketCooldown - dt);
      ai.burstCooldown = Math.max(0, ai.burstCooldown - dt);
      ai.jinkCooldown = Math.max(0, ai.jinkCooldown - dt);

      // Reactive aerial jink dodge when hit while orbiting!
      const tookDamage = state.hp < ai.lastHp - 1;
      ai.lastHp = state.hp;
      if (tookDamage) state.engaged = true;

      if (state.staggerTimer > 0) {
        ai.phase = 'orbit';
        rig.setRailBeam(false, 0, 0);
        // Crash-dip lower while Optic Gyro-Core is overloaded!
        spatial.y += (Math.max(85.2, ai.homeY - 2.1) - spatial.y) * Math.min(1, dt * 4.5);
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
          boosterIntensity: 0.25,
        });
        return;
      }

      const dx = playerPos.x - spatial.x;
      const dy = playerPos.y + 1.15 - (spatial.y + 0.55);
      const dz = playerPos.z - spatial.z;
      const horizDist = Math.hypot(dx, dz);
      const vertDist = Math.abs(playerPos.y - spatial.y);
      const hasLos =
        horizDist <= cfg.detectRange &&
        hasEnemyLineOfSight(
          spatial.x,
          spatial.y + 0.58,
          spatial.z,
          playerPos.x,
          playerPos.y + 1.32,
          playerPos.z,
          world
        );

      if (hasLos || horizDist < 20) state.engaged = true;
      ai.orbitAngle += dt * 0.7 * ai.orbitDir;

      let desVx = 0;
      let desVz = 0;
      let targetY = ai.homeY + Math.sin(elapsed * 1.4 + ai.orbitAngle) * 0.55;
      let attackProgress = 0;
      let attackVariant = 0;
      let boosterIntensity = 0.55;
      let beamActive = false;
      let beamCharge = 0;

      if (!state.engaged) {
        state.behavior = 'patrol';
        const tx = ai.homeX + Math.cos(ai.orbitAngle) * 3.8;
        const tz = ai.homeZ + Math.sin(ai.orbitAngle) * 3.8;
        desVx = (tx - spatial.x) * 1.7;
        desVz = (tz - spatial.z) * 1.7;
        spatial.yaw = rotateYawTowards(
          spatial.yaw,
          computeFacingYaw(spatial.x, spatial.z, tx, tz),
          4.2,
          dt
        );
      } else {
        const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);
        const dirX = horizDist > 0.01 ? dx / horizDist : -Math.sin(spatial.yaw);
        const dirZ = horizDist > 0.01 ? dz / horizDist : -Math.cos(spatial.yaw);
        const rightX = -dirZ;
        const rightZ = dirX;

        // Default gunship tactical altitude hovering cleanly above player sightline
        targetY = Math.max(87.0, Math.min(91.6, playerPos.y + 3.45 + Math.sin(elapsed * 1.8) * 0.5));

        if (ai.phase === 'orbit') {
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 7.6, dt);

          // Trigger snappy banked aerial jink dodge if player lands hits!
          if (tookDamage && ai.jinkCooldown <= 0 && !state.weakpoint.broken) {
            ai.phase = 'evade_jink';
            ai.timer = 0.36;
            ai.jinkCooldown = 3.4 + Math.random() * 1.4;
            ai.orbitDir *= -1;
            ai.strafeVx = rightX * ai.orbitDir * 13.5 - dirX * 2.4;
            ai.strafeVz = rightZ * ai.orbitDir * 13.5 - dirZ * 2.4;
            callbacks.onTelegraphAudio('booster_burst');
            for (const s of [-1, 1] as const) {
              rig.getThrusterExhaustWorldPos(s, _muzzle);
              callbacks.spawnBoosterBurst(
                _muzzle,
                _exhaustDir.set(-ai.strafeVx, -3.0, -ai.strafeVz).normalize(),
                0x28e8ff,
                5
              );
            }
          } else {
            const choice = selectValkyrieAttack({
              horizDist,
              vertDist,
              hasLos,
              hasAttackToken: ctx.hasAttackToken,
              gyroCoreBroken: state.weakpoint.broken,
              empCooldown: ai.empCooldown,
              railCooldown: ai.railCooldown,
              strafeRunCooldown: ai.strafeRunCooldown,
              rocketCooldown: ai.rocketCooldown,
              burstCooldown: ai.burstCooldown,
              roll: Math.random(),
            });

            if (choice === 'emp_shock_pulse') {
              ai.phase = 'emp_windup';
              ai.timer = 0.56;
              ai.hitApplied = false;
              ai.empCooldown = 5.4 + Math.random() * 1.6;
              callbacks.onTelegraphAudio('warden_vent');
              rig.getWeakpointWorldPos(_glint);
              callbacks.spawnPerilGlint(_glint, 0x28e8ff);
            } else if (choice === 'rail_laser_sweep') {
              ai.phase = 'rail_charge';
              ai.timer = 0.88;
              ai.railCooldown = 6.5 + Math.random() * 2.0;
              callbacks.onTelegraphAudio('rail_charge');
              rig.getWeakpointWorldPos(_glint);
              callbacks.spawnPerilGlint(_glint, 0x70f8ff);
            } else if (choice === 'dive_strafe_run') {
              ai.phase = 'strafe_dive';
              ai.timer = 0.92;
              ai.strafeRunCooldown = 7.0 + Math.random() * 2.2;
              ai.shotsLeft = 6;
              ai.shotDelay = 0.1;
              const runVec = computeStrafeRunVector(
                spatial.x,
                spatial.z,
                playerPos.x,
                playerPos.z,
                ai.orbitDir,
                13.2
              );
              ai.strafeVx = runVec.vx;
              ai.strafeVz = runVec.vz;
              callbacks.onTelegraphAudio('booster_burst');
              rig.getWeakpointWorldPos(_glint);
              callbacks.spawnPerilGlint(_glint, 0x28e8ff);
            } else if (choice === 'micro_rocket_salvo') {
              ai.phase = 'rocket_windup';
              ai.timer = 0.44;
              ai.rocketCooldown = 5.2 + Math.random() * 1.8;
              callbacks.onTelegraphAudio('pyro_flare');
              rig.getRocketPodWorldPos(-1, _glint);
              callbacks.spawnPerilGlint(_glint, 0xff7b18);
            } else if (choice === 'twin_autocannon_burst') {
              ai.phase = 'burst_fire';
              ai.shotsLeft = 4;
              ai.shotDelay = 0.04;
              ai.burstCooldown = 2.0 + Math.random() * 0.9;
            } else {
              // Aggressive orbiting aerial strafe maintaining high-ground gunship dominance
              if (horizDist > cfg.preferredMaxRange) {
                state.behavior = 'chase';
                desVx = dirX * cfg.moveSpeed + rightX * ai.orbitDir * 2.8;
                desVz = dirZ * cfg.moveSpeed + rightZ * ai.orbitDir * 2.8;
              } else if (horizDist < cfg.preferredMinRange) {
                state.behavior = 'strafe';
                desVx = -dirX * cfg.moveSpeed * 0.65 + rightX * ai.orbitDir * cfg.moveSpeed * 0.92;
                desVz = -dirZ * cfg.moveSpeed * 0.65 + rightZ * ai.orbitDir * cfg.moveSpeed * 0.92;
              } else {
                state.behavior = 'strafe';
                desVx = rightX * ai.orbitDir * cfg.moveSpeed * 0.98;
                desVz = rightZ * ai.orbitDir * cfg.moveSpeed * 0.98;
              }
            }
          }
        } else if (ai.phase === 'burst_fire') {
          state.behavior = 'attack';
          attackVariant = 0;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.2, dt);
          desVx = rightX * ai.orbitDir * cfg.moveSpeed * 0.72;
          desVz = rightZ * ai.orbitDir * cfg.moveSpeed * 0.72;
          ai.shotDelay -= dt;
          attackProgress = 1 - ai.shotsLeft / 4;

          if (ai.shotDelay <= 0 && ai.shotsLeft > 0) {
            ai.shotsLeft -= 1;
            ai.shotDelay = 0.12;
            const side = ai.gunSide;
            ai.gunSide = side < 0 ? 1 : -1;

            rig.getGunMuzzleWorldPos(side, _muzzle);
            rig.triggerGunRecoil(side);
            const tLead = Math.min(0.24, horizDist / 36);
            _aimDir
              .set(
                playerPos.x + playerVx * tLead - _muzzle.x + (Math.random() - 0.5) * 0.35,
                playerPos.y + 1.18 - _muzzle.y + (Math.random() - 0.5) * 0.25,
                playerPos.z + playerVz * tLead - _muzzle.z + (Math.random() - 0.5) * 0.35
              )
              .normalize();

            callbacks.spawnMuzzleFlash(_muzzle, _aimDir, 0x28e8ff, false);
            callbacks.onFireAudio('smg');
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _aimDir.clone(),
              speed: 36,
              damage: 10,
              radius: 0.13,
              color: 0x28e8ff,
              kind: 'plasma_bolt',
              staggerStrength: 0.14,
            });

            if (ai.shotsLeft === 0) {
              ai.phase = 'recover';
              ai.timer = 0.42;
            }
          }
        } else if (ai.phase === 'rail_charge') {
          state.behavior = 'windup';
          attackVariant = 1;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 9.2, dt);
          ai.timer -= dt;
          const p = 1 - Math.max(0, ai.timer / 0.88);
          attackProgress = p;
          boosterIntensity = 0.85;
          beamActive = true;
          beamCharge = p;
          // Hover rock-steady while locking rail-laser onto player
          desVx = rightX * ai.orbitDir * 1.1;
          desVz = rightZ * ai.orbitDir * 1.1;

          if (ai.timer <= 0) {
            ai.phase = 'rail_fire';
            ai.timer = 0.32;
            rig.getWeakpointWorldPos(_muzzle);
            const tLead = Math.min(0.14, horizDist / 56);
            _aimDir
              .set(
                playerPos.x + playerVx * tLead - _muzzle.x,
                playerPos.y + 1.15 - _muzzle.y,
                playerPos.z + playerVz * tLead - _muzzle.z
              )
              .normalize();
            callbacks.spawnMuzzleFlash(_muzzle, _aimDir, 0x70f8ff, true);
            callbacks.onFireAudio('rail_slug');
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _aimDir.clone(),
              speed: 56,
              damage: 24,
              radius: 0.18,
              color: 0x58f2ff,
              kind: 'rail_slug',
              staggerStrength: 0.65,
            });
          }
        } else if (ai.phase === 'rail_fire') {
          state.behavior = 'attack';
          attackVariant = 1;
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / 0.32);
          beamActive = attackProgress < 0.35;
          beamCharge = 1.0;
          if (ai.timer <= 0) {
            ai.phase = 'recover';
            ai.timer = 0.68;
            ai.orbitDir *= -1;
          }
        } else if (ai.phase === 'strafe_dive') {
          state.behavior = 'attack';
          attackVariant = 2;
          ai.timer -= dt;
          const p = 1 - Math.max(0, ai.timer / 0.92);
          attackProgress = p;
          boosterIntensity = 1.35;
          desVx = ai.strafeVx;
          desVz = ai.strafeVz;
          // Dive low across the Rotunda during the gunship strafing pass!
          targetY = Math.max(86.2, playerPos.y + 2.05);
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.8, dt);

          if (Math.random() < 0.45) {
            rig.getThrusterExhaustWorldPos(Math.random() < 0.5 ? -1 : 1, _muzzle);
            callbacks.spawnBoosterBurst(
              _muzzle,
              _exhaustDir.set(-ai.strafeVx, -4.5, -ai.strafeVz).normalize(),
              0x28e8ff,
              3
            );
          }

          ai.shotDelay -= dt;
          if (ai.shotDelay <= 0 && ai.shotsLeft > 0) {
            ai.shotsLeft -= 1;
            ai.shotDelay = 0.125;
            const side = ai.gunSide;
            ai.gunSide = side < 0 ? 1 : -1;
            rig.getGunMuzzleWorldPos(side, _muzzle);
            rig.triggerGunRecoil(side);
            _aimDir
              .set(
                playerPos.x + playerVx * 0.18 - _muzzle.x + (Math.random() - 0.5) * 0.5,
                playerPos.y + 1.1 - _muzzle.y + (Math.random() - 0.5) * 0.25,
                playerPos.z + playerVz * 0.18 - _muzzle.z + (Math.random() - 0.5) * 0.5
              )
              .normalize();
            callbacks.spawnMuzzleFlash(_muzzle, _aimDir, 0x28e8ff, false);
            callbacks.onFireAudio('boss_carbine');
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _aimDir.clone(),
              speed: 38,
              damage: 9,
              radius: 0.14,
              color: 0x38ecff,
              kind: 'plasma_bolt',
              staggerStrength: 0.16,
            });
          }

          if (ai.timer <= 0) {
            ai.phase = 'recover';
            ai.timer = 0.58;
            ai.orbitDir *= -1;
          }
        } else if (ai.phase === 'rocket_windup') {
          state.behavior = 'windup';
          attackVariant = 3;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.0, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / 0.44);
          desVx = rightX * ai.orbitDir * 2.0;
          desVz = rightZ * ai.orbitDir * 2.0;
          if (ai.timer <= 0) {
            ai.phase = 'rocket_fire';
            ai.shotsLeft = 4;
            ai.shotDelay = 0.02;
          }
        } else if (ai.phase === 'rocket_fire') {
          state.behavior = 'attack';
          attackVariant = 3;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 7.6, dt);
          ai.shotDelay -= dt;
          const idx = 4 - ai.shotsLeft;
          attackProgress = Math.min(1, idx / 4);

          if (ai.shotDelay <= 0 && ai.shotsLeft > 0) {
            const offsets = computeMicroRocketOffsets();
            const spec = offsets[idx] ?? { side: 1 as const, lateral: 0, vertical: 0 };
            ai.shotsLeft -= 1;
            ai.shotDelay = 0.15;

            rig.getRocketPodWorldPos(spec.side, _muzzle);
            const tLead = Math.min(0.32, horizDist / 26);
            _aimDir
              .set(
                playerPos.x + playerVx * tLead + rightX * spec.lateral - _muzzle.x,
                playerPos.y + 1.05 + spec.vertical - _muzzle.y,
                playerPos.z + playerVz * tLead + rightZ * spec.lateral - _muzzle.z
              )
              .normalize();

            callbacks.spawnMuzzleFlash(_muzzle, _aimDir, 0xff8a24, true);
            callbacks.onFireAudio('mortar');
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _aimDir.clone(),
              speed: 25,
              damage: 14,
              radius: 0.18,
              color: 0xff8a24,
              kind: 'boss_overdrive',
              splashRadius: 2.0,
              staggerStrength: 0.36,
            });

            if (ai.shotsLeft === 0) {
              ai.phase = 'recover';
              ai.timer = 0.66;
              ai.orbitDir *= -1;
            }
          }
        } else if (ai.phase === 'emp_windup') {
          state.behavior = 'windup';
          attackVariant = 4;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.5, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / 0.56);
          boosterIntensity = 1.25;
          // Dip slightly lower toward player plane before releasing EMP ring!
          targetY = Math.max(85.8, playerPos.y + 1.55);
          if (ai.timer <= 0) {
            ai.phase = 'emp_blast';
            ai.timer = 0.38;
            ai.hitApplied = false;
          }
        } else if (ai.phase === 'emp_blast') {
          state.behavior = 'attack';
          attackVariant = 4;
          ai.timer -= dt;
          const p = 1 - Math.max(0, ai.timer / 0.38);
          attackProgress = p;
          boosterIntensity = 1.3;
          targetY = Math.max(85.8, playerPos.y + 1.55);

          if (!ai.hitApplied && p >= 0.25) {
            ai.hitApplied = true;
            _origin.set(spatial.x, playerPos.y + 0.08, spatial.z);
            callbacks.spawnShockwave({
              center: _origin.clone(),
              maxRadius: 5.8,
              expandSpeed: 14.2,
              damage: 20,
              color: 0x28e8ff,
              staggerStrength: 0.72,
            });
            callbacks.spawnImpactVfx(_origin, false, true);
            callbacks.onFireAudio('rail_slug');
          }

          if (ai.timer <= 0) {
            ai.phase = 'recover';
            ai.timer = 0.62;
            ai.orbitDir *= -1;
          }
        } else if (ai.phase === 'evade_jink') {
          state.behavior = 'strafe';
          ai.timer -= dt;
          boosterIntensity = 1.3;
          desVx = ai.strafeVx;
          desVz = ai.strafeVz;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 9.5, dt);
          if (ai.timer <= 0) {
            ai.phase = 'orbit';
          }
        } else if (ai.phase === 'recover') {
          state.behavior = 'recover';
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.5, dt);
          ai.timer -= dt;
          desVx = rightX * ai.orbitDir * cfg.moveSpeed * 0.45;
          desVz = rightZ * ai.orbitDir * cfg.moveSpeed * 0.45;
          if (ai.timer <= 0) {
            ai.phase = 'orbit';
          }
        }
      }

      // Smooth 3D aerial flight with wall-sliding collision (does NOT require floor slab underneath!)
      const blend = 1 - Math.exp(-7.2 * dt);
      spatial.vx += (desVx + ctx.separation.x * 2.6 - spatial.vx) * blend;
      spatial.vz += (desVz + ctx.separation.y * 2.6 - spatial.vz) * blend;
      resolveWorldHorizontal3D(
        spatial.x + spatial.vx * dt,
        spatial.z + spatial.vz * dt,
        spatial.y,
        spatial.radius,
        world,
        _horizScratch,
        spatial.height,
        0.15
      );
      if (_horizScratch.collided) {
        ai.orbitDir *= -1;
      }
      spatial.x = Math.max(-40.5, Math.min(40.5, _horizScratch.x));
      spatial.z = Math.max(-20.5, Math.min(30.5, _horizScratch.z));
      spatial.y += (targetY - spatial.y) * Math.min(1, dt * 3.8);
      spatial.grounded = false;

      // Update live wall-clipped Rail-Laser Scanner Beam
      if (beamActive) {
        rig.getWeakpointWorldPos(_muzzle);
        const hitWall = raycastCollisionWorld3D(
          _muzzle.x,
          _muzzle.y,
          _muzzle.z,
          playerPos.x,
          playerPos.y + 1.15,
          playerPos.z,
          world,
          _rayHit
        );
        const len = hitWall
          ? _muzzle.distanceTo(_rayHit.point)
          : Math.min(34, Math.hypot(playerPos.x - _muzzle.x, playerPos.y + 1.15 - _muzzle.y, playerPos.z - _muzzle.z));
        rig.setRailBeam(true, len, beamCharge);
      } else {
        rig.setRailBeam(false, 0, 0);
      }

      const fwdX = -Math.sin(spatial.yaw);
      const fwdZ = -Math.cos(spatial.yaw);
      const sideX = Math.cos(spatial.yaw);
      const sideZ = -Math.sin(spatial.yaw);
      const speed = Math.hypot(spatial.vx, spatial.vz);
      const aimPitch = Math.atan2(dy, Math.max(1, horizDist));

      rig.updateAnimation({
        dt,
        elapsed,
        behavior: state.behavior,
        speedRatio: speed / cfg.moveSpeed,
        localMoveX: (spatial.vx * sideX + spatial.vz * sideZ) / Math.max(1, cfg.moveSpeed),
        localMoveZ: (spatial.vx * fwdX + spatial.vz * fwdZ) / Math.max(1, cfg.moveSpeed),
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
        boosterIntensity,
      });
    },
  };
}
