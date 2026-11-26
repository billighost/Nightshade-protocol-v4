import * as THREE from 'three';
import { F7_BASE_Y } from '../../../arena/hideout/floors/floor07/layout';
import type { EnemyAiStepContext, EnemyArchetypeBrain } from '../../core/enemyManager';
import {
  computeFacingYaw,
  hasEnemyLineOfSight,
  raycastCollisionWorld3D,
  rotateYawTowards,
  stepEnemyMovement,
  type WorldRaycastHit,
} from '../../core/enemyNav';
import { computeBallisticMortarArc } from '../mortarPodBombardier/tactics';
import type { Floor07EnemyMaterials } from '../materials';
import { TURBINE_JUGGERNAUT_CONFIG } from './config';
import {
  buildTurbineJuggernautRig,
  type TurbineJuggernautRigHandle,
} from './mesh';
import {
  computeBullRushVelocity,
  computeVoltArcFanDirections,
  selectJuggernautAttack,
} from './tactics';
import { createTurbineJuggernautTextures } from './textures';

const F7_MIN_FLOOR_Y = F7_BASE_Y - 0.8;

type JuggPhase =
  | 'advance'
  | 'rotary_spinup'
  | 'rotary_volley'
  | 'slam_windup'
  | 'slam_strike'
  | 'rush_windup'
  | 'rush_charge'
  | 'arc_windup'
  | 'rail_windup'
  | 'mortar_windup'
  | 'vent';

interface JuggernautAiState {
  phase: JuggPhase;
  timer: number;
  shotsLeft: number;
  shotDelay: number;
  slamCooldown: number;
  rushCooldown: number;
  arcCooldown: number;
  railCooldown: number;
  volleyCooldown: number;
  mortarCooldown: number;
  timeWithoutLos: number;
  rushVx: number;
  rushVz: number;
  secondPulsePending: boolean;
  barrelHeat: number;
  patrolIdx: number;
  ventSteamTimer: number;
}

const _muzzle = new THREE.Vector3();
const _rayHit: WorldRaycastHit = {
  hit: false,
  t: 1,
  point: new THREE.Vector3(),
  normal: new THREE.Vector3(0, 1, 0),
};
const _aimDir = new THREE.Vector3();
const _center = new THREE.Vector3();
const _pylonPos = new THREE.Vector3();
const _laserEnd = new THREE.Vector3();

/**
 * AAA Zone Mini-Boss Combat Brain for Floor 07 Zone Mini-Boss #1:
 * TURBINE JUGGERNAUT "VOLT-VII"
 * - Coordinates 6 flexible, heavily telegraphed industrial heavy attacks with Phase 2 Overdrive (< 55% HP):
 *   1. VOLT-VULCAN 6-Barrel Rotary Suppression Sweep -> forces Thermal Venting window!
 *   2. Seismic Arc-Slam (Piledriver shockwave — DOUBLE shockwave pulse in Phase 2!)
 *   3. Juggernaut Bull-Rush Charge (shields front with buckler, charges lane, ends in slam & venting!)
 *   4. Volt-Arc Plasma Barrage (5-orb horizontal fan, 7-orb in Phase 2!)
 *   5. Overcharge Rail-Lance (wall-clipped laser lock -> piercing 54 m/s Volt-Slug!)
 *   6. Cover-Flush Arc-Mortar (lobs twin arcing high-voltage canisters over turbine pillars when LOS is blocked!)
 */
export function createTurbineJuggernautBrain(mats: Floor07EnemyMaterials): EnemyArchetypeBrain {
  const sharedTextures = createTurbineJuggernautTextures();

  return {
    config: TURBINE_JUGGERNAUT_CONFIG,
    createRig: (enemyId) => buildTurbineJuggernautRig(enemyId, mats, sharedTextures),
    createAiState: (): Record<string, unknown> => ({
      phase: 'advance',
      timer: 0,
      shotsLeft: 0,
      shotDelay: 0,
      slamCooldown: 3.2,
      rushCooldown: 4.5,
      arcCooldown: 3.8,
      railCooldown: 6.0,
      volleyCooldown: 1.2,
      mortarCooldown: 4.0,
      timeWithoutLos: 0,
      rushVx: 0,
      rushVz: 0,
      secondPulsePending: false,
      barrelHeat: 0,
      patrolIdx: 0,
      ventSteamTimer: 0,
    }),
    stepAi: (ctx: EnemyAiStepContext) => {
      const ai = ctx.aiState as unknown as JuggernautAiState;
      const rig = ctx.rig as TurbineJuggernautRigHandle;
      const { dt, elapsed, state, spatial, playerPos, world, callbacks } = ctx;
      const cfg = TURBINE_JUGGERNAUT_CONFIG;
      const phaseNum: 1 | 2 = state.phase === 2 ? 2 : 1;

      rig.setTargetLaser(false, 0, 0);
      ai.barrelHeat = Math.max(0, ai.barrelHeat - dt * 0.28);

      if (state.staggerTimer > 0) {
        ai.phase = 'advance';
        ai.secondPulsePending = false;
        stepEnemyMovement(spatial, 0, 0, world, dt, F7_MIN_FLOOR_Y);
        rig.setBarrelHeat(ai.barrelHeat);
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
          phase: phaseNum,
          airborneHeight: 0,
        });
        return;
      }

      const dx = playerPos.x - spatial.x;
      const dy = playerPos.y + 1.2 - (spatial.y + 1.55);
      const dz = playerPos.z - spatial.z;
      const horizDist = Math.hypot(dx, dz);
      const vertDist = Math.abs(playerPos.y - spatial.y);

      const hasLos =
        horizDist <= cfg.detectRange &&
        hasEnemyLineOfSight(
          spatial.x,
          spatial.y + 1.9,
          spatial.z,
          playerPos.x,
          playerPos.y + 1.35,
          playerPos.z,
          world
        );

      if (hasLos || horizDist < 18) state.engaged = true;
      ai.timeWithoutLos = state.engaged && !hasLos ? ai.timeWithoutLos + dt : 0;

      const cdRate = phaseNum === 2 ? 1.24 : 1.0;
      ai.slamCooldown = Math.max(0, ai.slamCooldown - dt * cdRate);
      ai.rushCooldown = Math.max(0, ai.rushCooldown - dt * cdRate);
      ai.arcCooldown = Math.max(0, ai.arcCooldown - dt * cdRate);
      ai.railCooldown = Math.max(0, ai.railCooldown - dt * cdRate);
      ai.volleyCooldown = Math.max(0, ai.volleyCooldown - dt * cdRate);
      ai.mortarCooldown = Math.max(0, ai.mortarCooldown - dt * cdRate);

      let desVx = 0;
      let desVz = 0;
      let attackProgress = 0;
      let attackVariant = 0;

      if (!state.engaged) {
        state.behavior = 'patrol';
        const pt = ctx.patrolPoints[ai.patrolIdx % ctx.patrolPoints.length];
        const px = pt.x - spatial.x;
        const pz = pt.z - spatial.z;
        const pDist = Math.hypot(px, pz);
        if (pDist < 0.9 && ctx.patrolPoints.length > 1) {
          ai.patrolIdx = (ai.patrolIdx + 1) % ctx.patrolPoints.length;
        } else if (pDist > 0.3) {
          desVx = (px / pDist) * cfg.moveSpeed * 0.5;
          desVz = (pz / pDist) * cfg.moveSpeed * 0.5;
          spatial.yaw = rotateYawTowards(
            spatial.yaw,
            computeFacingYaw(spatial.x, spatial.z, pt.x, pt.z),
            2.8,
            dt
          );
        }
      } else {
        const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);

        if (ai.phase === 'advance') {
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, phaseNum === 2 ? 4.3 : 3.5, dt);
          const dirX = horizDist > 0.01 ? dx / horizDist : 0;
          const dirZ = horizDist > 0.01 ? dz / horizDist : 1;

          const choice = selectJuggernautAttack({
            horizDist,
            vertDist,
            hasLos,
            phase: phaseNum,
            timeWithoutLos: ai.timeWithoutLos,
            slamCooldown: ai.slamCooldown,
            rushCooldown: ai.rushCooldown,
            arcCooldown: ai.arcCooldown,
            railCooldown: ai.railCooldown,
            volleyCooldown: ai.volleyCooldown,
            mortarCooldown: ai.mortarCooldown,
            roll: Math.random(),
          });

          if (choice === 'seismic_arc_slam') {
            ai.phase = 'slam_windup';
            ai.timer = phaseNum === 2 ? 0.58 : 0.68;
            ai.secondPulsePending = phaseNum === 2;
            callbacks.onTelegraphAudio('shield_charge');
            rig.getPiledriverWorldPos(_center);
            callbacks.spawnPerilGlint(_center, 0xff6a1a);
          } else if (choice === 'juggernaut_bull_rush') {
            ai.phase = 'rush_windup';
            ai.timer = 0.54;
            callbacks.onTelegraphAudio('booster_burst');
            rig.getPiledriverWorldPos(_center);
            callbacks.spawnPerilGlint(_center, 0xffa624);
          } else if (choice === 'overcharge_rail_lance') {
            ai.phase = 'rail_windup';
            ai.timer = phaseNum === 2 ? 0.72 : 0.85;
            callbacks.onTelegraphAudio('rail_charge');
            rig.getMuzzleWorldPos(_muzzle);
            callbacks.spawnPerilGlint(_muzzle, 0xffcc42);
          } else if (choice === 'volt_arc_barrage') {
            ai.phase = 'arc_windup';
            ai.timer = 0.56;
            callbacks.onTelegraphAudio('pyro_flare');
            rig.getTeslaPylonWorldPos(-1, _pylonPos);
            callbacks.spawnPerilGlint(_pylonPos, 0x30e8ff);
            rig.getTeslaPylonWorldPos(1, _pylonPos);
            callbacks.spawnPerilGlint(_pylonPos, 0x30e8ff);
          } else if (choice === 'cover_flush_arc_mortar') {
            ai.phase = 'mortar_windup';
            ai.timer = 0.62;
            callbacks.onTelegraphAudio('mortar');
            rig.getTeslaPylonWorldPos(1, _pylonPos);
            callbacks.spawnPerilGlint(_pylonPos, 0xff9824);
          } else if (choice === 'rotary_suppression_sweep') {
            ai.phase = 'rotary_spinup';
            ai.timer = phaseNum === 2 ? 0.52 : 0.64;
            callbacks.onTelegraphAudio('rail_charge');
          } else {
            state.behavior = 'chase';
            const moveMult = phaseNum === 2 ? 1.22 : 1.0;
            const pace = horizDist > cfg.preferredMinRange ? cfg.moveSpeed * moveMult : cfg.moveSpeed * 0.42;
            desVx = dirX * pace;
            desVz = dirZ * pace;
          }
        } else if (ai.phase === 'slam_windup') {
          state.behavior = 'windup';
          attackVariant = 1;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 3.0, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / 0.68);
          if (ai.timer <= 0) {
            ai.phase = 'slam_strike';
            ai.timer = ai.secondPulsePending ? 0.52 : 0.34;
            callbacks.onTelegraphAudio('boss_slam');
            _center.set(spatial.x, spatial.y + 0.14, spatial.z);
            callbacks.spawnShockwave({
              center: _center.clone(),
              maxRadius: 9.0,
              expandSpeed: 13.8,
              damage: 28,
              color: 0xff6818,
              staggerStrength: 0.9,
            });
          }
        } else if (ai.phase === 'slam_strike') {
          state.behavior = 'attack';
          attackVariant = 1;
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / 0.45);
          if (ai.secondPulsePending && ai.timer <= 0.22) {
            ai.secondPulsePending = false;
            callbacks.onTelegraphAudio('shield_slam');
            _center.set(spatial.x, spatial.y + 0.14, spatial.z);
            callbacks.spawnShockwave({
              center: _center.clone(),
              maxRadius: 10.6,
              expandSpeed: 15.2,
              damage: 22,
              color: 0x34e8ff,
              staggerStrength: 0.75,
            });
          }
          if (ai.timer <= 0) {
            ai.slamCooldown = 6.2;
            ai.phase = 'vent';
            ai.timer = 1.65;
            callbacks.onTelegraphAudio('warden_vent');
            ctx.exposeWeakpoint(2.2);
          }
        } else if (ai.phase === 'rush_windup') {
          state.behavior = 'windup';
          attackVariant = 2;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 5.2, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / 0.54);
          if (ai.timer <= 0) {
            const rv = computeBullRushVelocity(spatial.x, spatial.z, playerPos.x, playerPos.z, phaseNum);
            ai.rushVx = rv.vx;
            ai.rushVz = rv.vz;
            ai.phase = 'rush_charge';
            ai.timer = Math.min(1.25, Math.max(0.55, horizDist / rv.speed + 0.12));
            callbacks.onTelegraphAudio('shield_charge');
          }
        } else if (ai.phase === 'rush_charge') {
          state.behavior = 'attack';
          attackVariant = 2;
          ai.timer -= dt;
          attackProgress = 0.65;
          desVx = ai.rushVx;
          desVz = ai.rushVz;
          // Slight homing turn while charging (still cleanly sidesteppable!)
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 1.35, dt);

          const reachedPlayer = horizDist <= 2.75 && vertDist <= 2.2;
          if (reachedPlayer || ai.timer <= 0) {
            callbacks.onTelegraphAudio('shield_slam');
            _center.set(spatial.x, spatial.y + 0.14, spatial.z);
            callbacks.spawnShockwave({
              center: _center.clone(),
              maxRadius: 6.8,
              expandSpeed: 14.5,
              damage: 28,
              color: 0xff8822,
              staggerStrength: 0.95,
            });
            ai.rushCooldown = 7.4;
            ai.phase = 'vent';
            ai.timer = 2.05;
            callbacks.onTelegraphAudio('warden_vent');
            ctx.exposeWeakpoint(2.4);
          }
        } else if (ai.phase === 'arc_windup') {
          state.behavior = 'windup';
          attackVariant = 3;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 4.0, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / 0.56);
          if (ai.timer <= 0) {
            rig.getMuzzleWorldPos(_muzzle);
            const pitch = Math.atan2(playerPos.y + 1.15 - _muzzle.y, Math.max(1, horizDist));
            const fanDirs = computeVoltArcFanDirections(spatial.yaw, pitch, phaseNum);
            callbacks.onFireAudio('shotgun');
            for (const fd of fanDirs) {
              _aimDir.set(fd.x, fd.y, fd.z);
              callbacks.spawnMuzzleFlash(_muzzle, _aimDir, 0x34e8ff, false);
              callbacks.spawnProjectile({
                origin: _muzzle.clone(),
                direction: _aimDir.clone(),
                speed: phaseNum === 2 ? 29 : 25,
                damage: 14,
                radius: 0.18,
                color: phaseNum === 2 ? 0xffa828 : 0x34e8ff,
                kind: 'plasma_bolt',
                staggerStrength: 0.25,
              });
            }
            ai.arcCooldown = 5.6;
            ai.phase = 'advance';
          }
        } else if (ai.phase === 'rail_windup') {
          state.behavior = 'windup';
          attackVariant = 4;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 3.2, dt);
          ai.timer -= dt;
          const total = phaseNum === 2 ? 0.72 : 0.85;
          const charge = 1 - Math.max(0, ai.timer / total);
          attackProgress = charge;
          ai.barrelHeat = Math.min(1, ai.barrelHeat + dt * 1.1);

          // Wall-clipped targeting laser beam straight from rotary cannon
          rig.getMuzzleWorldPos(_muzzle);
          const fwdX = -Math.sin(spatial.yaw);
          const fwdZ = -Math.cos(spatial.yaw);
          _laserEnd.set(_muzzle.x + fwdX * 32, _muzzle.y + dy * 0.2, _muzzle.z + fwdZ * 32);
          const hitWall = raycastCollisionWorld3D(
            _muzzle.x,
            _muzzle.y,
            _muzzle.z,
            _laserEnd.x,
            _laserEnd.y,
            _laserEnd.z,
            world,
            _rayHit
          );
          const beamLen = hitWall ? _rayHit.t * 32 : Math.min(32, horizDist + 1.5);
          rig.setTargetLaser(true, beamLen, charge);

          if (ai.timer <= 0) {
            rig.setTargetLaser(false, 0, 0);
            _aimDir
              .set(playerPos.x - _muzzle.x, playerPos.y + 1.2 - _muzzle.y, playerPos.z - _muzzle.z)
              .normalize();
            callbacks.onFireAudio('rail_slug');
            callbacks.spawnMuzzleFlash(_muzzle, _aimDir, 0xffc842, true);
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _aimDir.clone(),
              speed: 54,
              damage: 28,
              radius: 0.2,
              color: 0xffc842,
              kind: 'rail_slug',
              staggerStrength: 0.72,
            });
            ai.railCooldown = 7.8;
            ai.phase = 'advance';
          }
        } else if (ai.phase === 'mortar_windup') {
          state.behavior = 'windup';
          attackVariant = 5;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 3.0, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / 0.62);
          if (ai.timer <= 0) {
            callbacks.onFireAudio('mortar');
            for (const side of [-1, 1] as const) {
              rig.getTeslaPylonWorldPos(side, _pylonPos);
              const tx = playerPos.x + side * 1.45;
              const tz = playerPos.z + (Math.random() - 0.5) * 1.2;
              const arc = computeBallisticMortarArc(
                _pylonPos.x,
                _pylonPos.y,
                _pylonPos.z,
                tx,
                playerPos.y,
                tz,
                16.0
              );
              const speedMag = Math.hypot(arc.vx, arc.vy, arc.vz) || 1;
              _aimDir.set(arc.vx / speedMag, arc.vy / speedMag, arc.vz / speedMag);
              callbacks.spawnMuzzleFlash(_pylonPos, _aimDir, 0xff9422, true);
              callbacks.spawnProjectile({
                origin: _pylonPos.clone(),
                direction: _aimDir.clone(),
                speed: speedMag,
                damage: 22,
                radius: 0.22,
                color: 0xff8c1a,
                kind: 'mortar_canister',
                gravity: 16.0,
                splashRadius: 3.4,
                targetPos: new THREE.Vector3(tx, playerPos.y + 0.04, tz),
                staggerStrength: 0.6,
              });
            }
            ai.mortarCooldown = 6.5;
            ai.phase = 'advance';
          }
        } else if (ai.phase === 'rotary_spinup') {
          state.behavior = 'windup';
          attackVariant = 0;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 3.0, dt);
          ai.timer -= dt;
          const total = phaseNum === 2 ? 0.52 : 0.64;
          const spinRatio = 1 - Math.max(0, ai.timer / total);
          attackProgress = spinRatio;
          ai.barrelHeat = Math.min(1, ai.barrelHeat + dt * 0.75);
          rig.getMuzzleWorldPos(_muzzle);
          rig.setTargetLaser(true, Math.min(24, horizDist + 1.0), spinRatio * 0.75);
          if (ai.timer <= 0) {
            ai.phase = 'rotary_volley';
            ai.shotsLeft = phaseNum === 2 ? 16 : 12;
            ai.shotDelay = 0.04;
          }
        } else if (ai.phase === 'rotary_volley') {
          state.behavior = 'attack';
          attackVariant = 0;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 2.2, dt);
          ai.shotDelay -= dt;
          const totalShots = phaseNum === 2 ? 16 : 12;
          attackProgress = 1 - ai.shotsLeft / totalShots;
          ai.barrelHeat = Math.min(1, ai.barrelHeat + dt * 0.9);

          if (ai.shotDelay <= 0 && ai.shotsLeft > 0) {
            ai.shotsLeft -= 1;
            ai.shotDelay = phaseNum === 2 ? 0.1 : 0.12;
            rig.getMuzzleWorldPos(_muzzle);
            // Sweeping suppression wave across target flank
            const sweep = Math.sin((totalShots - ai.shotsLeft) * 0.7) * 0.7;
            _aimDir
              .set(
                playerPos.x - _muzzle.x + sweep + (Math.random() - 0.5) * 0.32,
                playerPos.y + 1.18 - _muzzle.y + (Math.random() - 0.5) * 0.25,
                playerPos.z - _muzzle.z + (Math.random() - 0.5) * 0.35
              )
              .normalize();
            callbacks.spawnMuzzleFlash(_muzzle, _aimDir, 0xffaa2c, true);
            callbacks.onFireAudio('boss_carbine');
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _aimDir.clone(),
              speed: 41,
              damage: 11,
              radius: 0.14,
              color: 0xffaa2c,
              kind: 'plasma_bolt',
              staggerStrength: 0.18,
            });
          }
          if (ai.shotsLeft === 0) {
            ai.phase = 'vent';
            ai.timer = phaseNum === 2 ? 1.95 : 2.3;
            ai.volleyCooldown = 2.8;
            callbacks.onTelegraphAudio('warden_vent');
            ctx.exposeWeakpoint(2.5);
          }
        } else if (ai.phase === 'vent') {
          state.behavior = 'recover';
          // Deliberate slow turn during Thermal Venting lets observant players flank & shatter the open radiator!
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 1.05, dt);
          ai.timer -= dt;
          ai.ventSteamTimer -= dt;
          if (ai.ventSteamTimer <= 0) {
            ai.ventSteamTimer = 0.28;
            rig.getRadiatorVentWorldPos(_center);
            const backX = Math.sin(spatial.yaw);
            const backZ = Math.cos(spatial.yaw);
            _aimDir.set(backX, 0.35, backZ).normalize();
            callbacks.spawnBoosterBurst(_center, _aimDir, 0xff7020);
          }
          if (ai.timer <= 0) {
            ai.phase = 'advance';
          }
        }
      }

      stepEnemyMovement(
        spatial,
        desVx + ctx.separation.x * 1.6,
        desVz + ctx.separation.y * 1.6,
        world,
        dt,
        F7_MIN_FLOOR_Y
      );

      const speed = Math.hypot(spatial.vx, spatial.vz);
      const aimPitch = Math.atan2(dy, Math.max(1, horizDist));
      rig.setBarrelHeat(ai.barrelHeat);
      rig.updateAnimation({
        dt,
        elapsed,
        behavior: state.behavior,
        speedRatio: speed / cfg.moveSpeed,
        localMoveX: 0,
        localMoveZ: speed / cfg.moveSpeed,
        aimPitch,
        attackProgress,
        attackVariant,
        flinchTimer: state.flinchTimer,
        flinchDirX: state.flinchDirX,
        staggerTimer: 0,
        deadProgress: 0,
        weakpointExposed: state.weakpoint.exposed,
        weakpointBroken: state.weakpoint.broken,
        shieldActive: ai.phase === 'rush_charge',
        phase: phaseNum,
        airborneHeight: 0,
      });
    },
  };
}
