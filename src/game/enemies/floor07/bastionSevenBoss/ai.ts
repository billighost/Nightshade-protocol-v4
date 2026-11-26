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
import type { Floor07EnemyMaterials } from '../materials';
import { BASTION_SEVEN_BOSS_CONFIG } from './config';
import { buildBastionSevenBossRig, type BastionRigHandle } from './mesh';
import {
  computePlasmaFanDirections,
  computeSiegeMissileTargets,
  computeTitanChargeVelocity,
  selectBastionAttack,
  type CarpetTargetPoint,
} from './tactics';

const F7_MIN_FLOOR_Y = F7_BASE_Y - 0.8;

type BastionAiPhase =
  | 'stalk'
  | 'stomp_windup'
  | 'stomp_slam'
  | 'rail_windup'
  | 'rail_fire'
  | 'missile_windup'
  | 'missile_salvo'
  | 'rotary_windup'
  | 'rotary_barrage'
  | 'charge_windup'
  | 'charge_rush'
  | 'fan_windup'
  | 'fan_fire'
  | 'vent_reactor';

interface BastionAiState {
  phase: BastionAiPhase;
  timer: number;
  maxTimer: number;
  shotsLeft: number;
  totalShots: number;
  shotDelay: number;
  actionCooldown: number;
  stompCooldown: number;
  railCooldown: number;
  missileCooldown: number;
  chargeCooldown: number;
  plasmaFanCooldown: number;
  rotaryCooldown: number;
  timeWithoutLos: number;
  strafeSign: number;
  barrelHeat: number;
  stompPulsesLeft: number;
  chargeVx: number;
  chargeVz: number;
  chargeHitDone: boolean;
  lockedAimYaw: number;
  lockedAimPitch: number;
  missileTargets: CarpetTargetPoint[];
  phase2Announced: boolean;
  ventTick: number;
}

const _muzzleL = new THREE.Vector3();
const _muzzleR = new THREE.Vector3();
const _muzzle = new THREE.Vector3();
const _aimDir = new THREE.Vector3();
const _target = new THREE.Vector3();
const _center = new THREE.Vector3();
const _ventPos = new THREE.Vector3();
const _ventDir = new THREE.Vector3();
const _rayHit: WorldRaycastHit = {
  hit: false,
  t: 1,
  point: new THREE.Vector3(),
  normal: new THREE.Vector3(0, 1, 0),
};

function startThermalVent(
  ai: BastionAiState,
  ctx: EnemyAiStepContext,
  isP2: boolean,
  durationP1: number,
  durationP2: number
) {
  ai.phase = 'vent_reactor';
  ai.timer = isP2 ? durationP2 : durationP1;
  ai.maxTimer = ai.timer;
  ai.ventTick = 0;
  ai.actionCooldown = isP2 ? 1.05 : 1.5;
  ctx.callbacks.onTelegraphAudio('warden_vent');
  ctx.exposeWeakpoint(ai.timer + 0.35);
}

export function createBastionSevenBossBrain(mats: Floor07EnemyMaterials): EnemyArchetypeBrain {
  return {
    config: BASTION_SEVEN_BOSS_CONFIG,
    createRig: (enemyId) => buildBastionSevenBossRig(enemyId, mats),
    createAiState: (): Record<string, unknown> => ({
      phase: 'stalk',
      timer: 0,
      maxTimer: 1,
      shotsLeft: 0,
      totalShots: 1,
      shotDelay: 0,
      actionCooldown: 1.0,
      stompCooldown: 3.0,
      railCooldown: 2.2,
      missileCooldown: 1.5,
      chargeCooldown: 4.5,
      plasmaFanCooldown: 2.0,
      rotaryCooldown: 0.8,
      timeWithoutLos: 0,
      strafeSign: 1,
      barrelHeat: 0,
      stompPulsesLeft: 0,
      chargeVx: 0,
      chargeVz: 0,
      chargeHitDone: false,
      lockedAimYaw: 0,
      lockedAimPitch: 0,
      missileTargets: [],
      phase2Announced: false,
      ventTick: 0,
    }),
    stepAi: (ctx: EnemyAiStepContext) => {
      const ai = ctx.aiState as unknown as BastionAiState;
      const rig = ctx.rig as BastionRigHandle;
      const { dt, elapsed, state, spatial, playerPos, world, callbacks } = ctx;
      const cfg = BASTION_SEVEN_BOSS_CONFIG;
      const isP2 = state.phase === 2;

      // Cool cannon barrels smoothly over time
      ai.barrelHeat = Math.max(0, ai.barrelHeat - dt * 0.24);
      rig.setBarrelHeat(ai.barrelHeat);
      rig.setPodHoodOpen(0);

      // Phase 2 Apex Overdrive dramatic transition shockwave & callout!
      if (isP2 && !ai.phase2Announced) {
        ai.phase2Announced = true;
        ai.actionCooldown = 0.25;
        ai.chargeCooldown = 0.5;
        ai.railCooldown = 0.5;
        callbacks.onTelegraphAudio('kestrel_overdrive');
        _center.set(spatial.x, spatial.y + 0.2, spatial.z);
        callbacks.spawnShockwave({
          center: _center.clone(),
          maxRadius: 11.0,
          expandSpeed: 16.0,
          damage: 16,
          color: 0xff2c14,
          staggerStrength: 0.72,
        });
        callbacks.showIntelCallout(
          'BASTION-VII · APEX OVERDRIVE',
          cfg.phase2Intel ?? 'PHASE 2 OVERDRIVE ACTIVE — PUNISH VENTING CHEST REACTOR!',
          4.6
        );
      }

      // Dramatic kneel-stagger when Chest Reactor Core ruptures!
      if (state.staggerTimer > 0) {
        ai.phase = 'stalk';
        rig.setDualRailLasers(false, 0, 0, 0);
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
          phase: state.phase,
          airborneHeight: 0,
          boosterIntensity: 0,
        });
        return;
      }

      state.engaged = true;
      const dx = playerPos.x - spatial.x;
      const dy = playerPos.y + 1.2 - (spatial.y + 2.3);
      const dz = playerPos.z - spatial.z;
      const horizDist = Math.hypot(dx, dz);
      const hasLos = hasEnemyLineOfSight(
        spatial.x,
        spatial.y + 2.5,
        spatial.z,
        playerPos.x,
        playerPos.y + 1.35,
        playerPos.z,
        world
      );

      ai.timeWithoutLos = hasLos ? 0 : ai.timeWithoutLos + dt;
      ai.actionCooldown = Math.max(0, ai.actionCooldown - dt);
      ai.stompCooldown = Math.max(0, ai.stompCooldown - dt);
      ai.railCooldown = Math.max(0, ai.railCooldown - dt);
      ai.missileCooldown = Math.max(0, ai.missileCooldown - dt);
      ai.chargeCooldown = Math.max(0, ai.chargeCooldown - dt);
      ai.plasmaFanCooldown = Math.max(0, ai.plasmaFanCooldown - dt);
      ai.rotaryCooldown = Math.max(0, ai.rotaryCooldown - dt);

      const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);
      const aimPitch = Math.atan2(dy, Math.max(1, horizDist));

      let desVx = 0;
      let desVz = 0;
      let attackProgress = 0;
      let attackVariant = 0;
      let boosterIntensity = 0;
      let lasersActive = false;

      if (ai.phase === 'stalk') {
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, isP2 ? 4.2 : 3.2, dt);
        const dirX = horizDist > 0.01 ? dx / horizDist : 0;
        const dirZ = horizDist > 0.01 ? dz / horizDist : -1;
        const rightX = -dirZ;
        const rightZ = dirX;

        if (ai.actionCooldown <= 0 || (horizDist <= 6.2 && ai.stompCooldown <= 0)) {
          const next = selectBastionAttack({
            horizDist,
            hasLos,
            phase: state.phase,
            timeWithoutLos: ai.timeWithoutLos,
            stompCooldown: ai.stompCooldown,
            railCooldown: ai.railCooldown,
            missileCooldown: ai.missileCooldown,
            chargeCooldown: ai.chargeCooldown,
            plasmaFanCooldown: ai.plasmaFanCooldown,
            rotaryCooldown: ai.rotaryCooldown,
            roll: Math.random(),
          });

          if (next === 'seismic_hydraulic_stomp') {
            ai.phase = 'stomp_windup';
            ai.timer = isP2 ? 0.56 : 0.72;
            ai.maxTimer = ai.timer;
            ai.stompPulsesLeft = isP2 ? 2 : 1;
            callbacks.onTelegraphAudio('boss_slam');
            rig.getReactorWorldPos(_center);
            callbacks.spawnPerilGlint(_center, isP2 ? 0xff2c14 : 0xff9a18);
          } else if (next === 'twin_siege_rail_lance') {
            ai.phase = 'rail_windup';
            ai.timer = isP2 ? 0.92 : 1.15;
            ai.maxTimer = ai.timer;
            ai.lockedAimYaw = targetYaw;
            ai.lockedAimPitch = aimPitch;
            callbacks.onTelegraphAudio('rail_charge');
            rig.getLeftArmMuzzlePos(_muzzleL);
            rig.getRightArmMuzzlePos(_muzzleR);
            callbacks.spawnPerilGlint(_muzzleL, 0xffaa24);
            callbacks.spawnPerilGlint(_muzzleR, 0xffaa24);
          } else if (next === 'carpet_missile_barrage') {
            ai.phase = 'missile_windup';
            ai.timer = isP2 ? 0.54 : 0.68;
            ai.maxTimer = ai.timer;
            ai.missileTargets = computeSiegeMissileTargets(
              playerPos.x,
              playerPos.y,
              playerPos.z,
              spatial.x,
              spatial.z,
              state.phase
            );
            callbacks.onTelegraphAudio('mortar');
            rig.getPodMuzzlePos(-1, _muzzleL);
            rig.getPodMuzzlePos(1, _muzzleR);
            callbacks.spawnPerilGlint(_muzzleL, 0xffaa18);
            callbacks.spawnPerilGlint(_muzzleR, 0xffaa18);
          } else if (next === 'overdrive_titan_charge') {
            ai.phase = 'charge_windup';
            ai.timer = isP2 ? 0.52 : 0.68;
            ai.maxTimer = ai.timer;
            ai.chargeHitDone = false;
            const vel = computeTitanChargeVelocity(
              spatial.x,
              spatial.z,
              playerPos.x,
              playerPos.z,
              state.phase
            );
            ai.chargeVx = vel.vx;
            ai.chargeVz = vel.vz;
            callbacks.onTelegraphAudio('booster_burst');
            rig.getReactorWorldPos(_center);
            callbacks.spawnPerilGlint(_center, 0xff4818);
          } else if (next === 'arc_plasma_fan_barrage') {
            ai.phase = 'fan_windup';
            ai.timer = isP2 ? 0.44 : 0.58;
            ai.maxTimer = ai.timer;
            callbacks.onTelegraphAudio('pyro_flare');
            rig.getLeftArmMuzzlePos(_muzzleL);
            callbacks.spawnPerilGlint(_muzzleL, 0xff9218);
          } else {
            ai.phase = 'rotary_windup';
            ai.timer = isP2 ? 0.42 : 0.56;
            ai.maxTimer = ai.timer;
            callbacks.onTelegraphAudio('rail_charge');
          }
        } else {
          state.behavior = 'chase';
          const moveSpd = isP2 ? cfg.sprintSpeed : cfg.moveSpeed;
          if (horizDist > cfg.preferredMaxRange) {
            desVx = dirX * moveSpd;
            desVz = dirZ * moveSpd;
          } else if (horizDist < cfg.preferredMinRange) {
            desVx = rightX * ai.strafeSign * moveSpd * 0.8;
            desVz = rightZ * ai.strafeSign * moveSpd * 0.8;
          } else {
            desVx = dirX * moveSpd * 0.48 + rightX * ai.strafeSign * moveSpd * 0.68;
            desVz = dirZ * moveSpd * 0.48 + rightZ * ai.strafeSign * moveSpd * 0.68;
          }
        }
      } else if (ai.phase === 'stomp_windup') {
        state.behavior = 'windup';
        attackVariant = 2;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / Math.max(0.01, ai.maxTimer));
        if (ai.timer <= 0) {
          ai.phase = 'stomp_slam';
          ai.timer = 0.01;
          ai.maxTimer = isP2 ? 0.72 : 0.42;
        }
      } else if (ai.phase === 'stomp_slam') {
        state.behavior = 'attack';
        attackVariant = 2;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / Math.max(0.01, ai.maxTimer));
        if (ai.timer <= 0 && ai.stompPulsesLeft > 0) {
          ai.stompPulsesLeft -= 1;
          callbacks.onTelegraphAudio('shield_slam');
          _center.set(spatial.x, spatial.y + 0.16, spatial.z);
          callbacks.spawnShockwave({
            center: _center.clone(),
            maxRadius: isP2 ? 12.8 : 10.6,
            expandSpeed: isP2 ? 16.0 : 13.4,
            damage: isP2 ? 32 : 26,
            color: isP2 ? 0xff3c18 : 0xff8c1a,
            staggerStrength: 0.94,
          });
          callbacks.spawnRailImpactCrater(
            _center.set(spatial.x, spatial.y + 0.04, spatial.z),
            _ventDir.set(0, 1, 0),
            isP2 ? 0xff3c18 : 0xff8c1a
          );
          if (ai.stompPulsesLeft > 0) {
            ai.timer = 0.36;
          } else {
            ai.stompCooldown = isP2 ? 5.2 : 6.8;
            startThermalVent(ai, ctx, isP2, 2.8, 2.3);
          }
        }
      } else if (ai.phase === 'rail_windup') {
        state.behavior = 'windup';
        attackVariant = 3;
        ai.timer -= dt;
        const charge = 1 - Math.max(0, ai.timer / Math.max(0.01, ai.maxTimer));
        attackProgress = charge;

        // Track player smoothly during first 72% of charge, then lock final 28% for fair dodge!
        if (charge < 0.72) {
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, isP2 ? 4.4 : 3.4, dt);
          ai.lockedAimYaw = spatial.yaw;
          ai.lockedAimPitch = aimPitch;
        }

        // Compute wall-clipped dual convergence targeting laser lengths!
        rig.root.updateMatrixWorld(true);
        rig.getLeftArmMuzzlePos(_muzzleL);
        rig.getRightArmMuzzlePos(_muzzleR);
        const fwdX = -Math.sin(ai.lockedAimYaw) * Math.cos(ai.lockedAimPitch);
        const fwdY = Math.sin(ai.lockedAimPitch);
        const fwdZ = -Math.cos(ai.lockedAimYaw) * Math.cos(ai.lockedAimPitch);
        const maxLen = 42;
        const leftLen = raycastCollisionWorld3D(
          _muzzleL.x,
          _muzzleL.y,
          _muzzleL.z,
          _muzzleL.x + fwdX * maxLen,
          _muzzleL.y + fwdY * maxLen,
          _muzzleL.z + fwdZ * maxLen,
          world,
          _rayHit
        )
          ? _rayHit.t * maxLen
          : maxLen;
        const rightLen = raycastCollisionWorld3D(
          _muzzleR.x,
          _muzzleR.y,
          _muzzleR.z,
          _muzzleR.x + fwdX * maxLen,
          _muzzleR.y + fwdY * maxLen,
          _muzzleR.z + fwdZ * maxLen,
          world,
          _rayHit
        )
          ? _rayHit.t * maxLen
          : maxLen;

        lasersActive = true;
        rig.setDualRailLasers(true, leftLen, rightLen, charge);

        if (ai.timer <= 0) {
          ai.phase = 'rail_fire';
          ai.timer = 0.36;
          ai.maxTimer = 0.36;
          ai.barrelHeat = Math.min(1, ai.barrelHeat + 0.65);

          // Synchronized twin hyper-velocity Rail-Lance beams!
          const fireRailFrom = (origin: THREE.Vector3) => {
            _aimDir.set(
              playerPos.x - origin.x,
              playerPos.y + 1.15 - origin.y,
              playerPos.z - origin.z
            );
            // Blend 35% toward locked direction so dodging at the last instant reliably works!
            _aimDir.normalize().lerp(_ventDir.set(fwdX, fwdY, fwdZ), 0.65).normalize();
            callbacks.spawnMuzzleFlash(origin, _aimDir, isP2 ? 0xff3418 : 0xffb824, true);
            callbacks.onFireAudio('rail_slug');
            callbacks.spawnProjectile({
              origin: origin.clone(),
              direction: _aimDir.clone(),
              speed: isP2 ? 98 : 88,
              damage: isP2 ? 26 : 22,
              radius: 0.19,
              color: isP2 ? 0xff3218 : 0xffaa24,
              kind: 'rail_slug',
              staggerStrength: 0.72,
            });
          };
          fireRailFrom(_muzzleL);
          fireRailFrom(_muzzleR);
          rig.setDualRailLasers(false, 0, 0, 0);
          ai.railCooldown = isP2 ? 5.6 : 7.4;
        }
      } else if (ai.phase === 'rail_fire') {
        state.behavior = 'attack';
        attackVariant = 3;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / Math.max(0.01, ai.maxTimer));
        if (ai.timer <= 0) {
          startThermalVent(ai, ctx, isP2, 3.0, 2.5);
        }
      } else if (ai.phase === 'missile_windup') {
        state.behavior = 'windup';
        attackVariant = 1;
        rig.setPodHoodOpen(1);
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 3.2, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / Math.max(0.01, ai.maxTimer));
        if (ai.timer <= 0) {
          ai.phase = 'missile_salvo';
          ai.totalShots = ai.missileTargets.length || (isP2 ? 6 : 4);
          ai.shotsLeft = ai.totalShots;
          ai.shotDelay = 0.04;
        }
      } else if (ai.phase === 'missile_salvo') {
        state.behavior = 'attack';
        attackVariant = 1;
        rig.setPodHoodOpen(1);
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 2.2, dt);
        ai.shotDelay -= dt;
        attackProgress = 1 - ai.shotsLeft / Math.max(1, ai.totalShots);

        if (ai.shotDelay <= 0 && ai.shotsLeft > 0) {
          const idx = ai.totalShots - ai.shotsLeft;
          const side: -1 | 1 = idx % 2 === 0 ? -1 : 1;
          ai.shotsLeft -= 1;
          ai.shotDelay = isP2 ? 0.18 : 0.23;

          rig.getPodMuzzlePos(side, _muzzle);
          const tp = ai.missileTargets[idx] ?? {
            x: playerPos.x,
            y: playerPos.y + 0.12,
            z: playerPos.z,
          };
          _target.set(tp.x, tp.y, tp.z);

          const gravity = 15.8;
          const distToTgt = Math.hypot(_target.x - _muzzle.x, _target.z - _muzzle.z);
          const flightTime = Math.max(0.78, Math.min(1.5, distToTgt / 14.5));
          const vx = (_target.x - _muzzle.x) / flightTime;
          const vz = (_target.z - _muzzle.z) / flightTime;
          const vy = (_target.y - _muzzle.y + 0.5 * gravity * flightTime * flightTime) / flightTime;
          _aimDir.set(vx, vy, vz);
          const launchSpeed = _aimDir.length();
          _aimDir.normalize();

          callbacks.spawnMuzzleFlash(_muzzle, _aimDir, 0xffaa24, true);
          callbacks.onFireAudio('mortar');
          callbacks.spawnProjectile({
            origin: _muzzle.clone(),
            direction: _aimDir.clone(),
            speed: launchSpeed,
            damage: isP2 ? 26 : 22,
            radius: 0.24,
            color: isP2 ? 0xff4618 : 0xff8c1a,
            kind: 'mortar_canister',
            gravity,
            splashRadius: 3.9,
            targetPos: _target.clone(),
            staggerStrength: 0.68,
          });
        }
        if (ai.shotsLeft <= 0) {
          ai.missileCooldown = isP2 ? 5.8 : 7.6;
          startThermalVent(ai, ctx, isP2, 3.1, 2.5);
        }
      } else if (ai.phase === 'rotary_windup') {
        state.behavior = 'windup';
        attackVariant = 0;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 3.4, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / Math.max(0.01, ai.maxTimer));
        if (ai.timer <= 0) {
          ai.phase = 'rotary_barrage';
          ai.totalShots = isP2 ? 16 : 10;
          ai.shotsLeft = ai.totalShots;
          ai.shotDelay = 0.03;
        }
      } else if (ai.phase === 'rotary_barrage') {
        state.behavior = 'attack';
        attackVariant = 0;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, isP2 ? 3.2 : 2.4, dt);
        ai.shotDelay -= dt;
        attackProgress = 1 - ai.shotsLeft / Math.max(1, ai.totalShots);

        if (ai.shotDelay <= 0 && ai.shotsLeft > 0) {
          const useLeft = ai.shotsLeft % 2 === 0;
          ai.shotsLeft -= 1;
          ai.shotDelay = isP2 ? 0.115 : 0.155;
          ai.barrelHeat = Math.min(1, ai.barrelHeat + 0.085);

          if (useLeft) rig.getLeftArmMuzzlePos(_muzzle);
          else rig.getRightArmMuzzlePos(_muzzle);

          _aimDir
            .set(
              playerPos.x - _muzzle.x + (Math.random() - 0.5) * 0.68,
              playerPos.y + 1.18 - _muzzle.y + (Math.random() - 0.5) * 0.32,
              playerPos.z - _muzzle.z + (Math.random() - 0.5) * 0.68
            )
            .normalize();
          callbacks.spawnMuzzleFlash(_muzzle, _aimDir, isP2 ? 0xff4218 : 0xffaa24, true);
          callbacks.onFireAudio('boss_carbine');
          callbacks.spawnProjectile({
            origin: _muzzle.clone(),
            direction: _aimDir.clone(),
            speed: isP2 ? 46 : 40,
            damage: isP2 ? 15 : 13,
            radius: 0.16,
            color: isP2 ? 0xff4218 : 0xffaa24,
            kind: 'boss_overdrive',
            staggerStrength: 0.24,
          });
        }
        if (ai.shotsLeft <= 0) {
          ai.rotaryCooldown = isP2 ? 3.2 : 4.2;
          startThermalVent(ai, ctx, isP2, 2.9, 2.35);
        }
      } else if (ai.phase === 'charge_windup') {
        state.behavior = 'windup';
        attackVariant = 4;
        boosterIntensity = 0.75;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 4.8, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / Math.max(0.01, ai.maxTimer));
        if (ai.timer <= 0) {
          const vel = computeTitanChargeVelocity(
            spatial.x,
            spatial.z,
            playerPos.x,
            playerPos.z,
            state.phase
          );
          ai.chargeVx = vel.vx;
          ai.chargeVz = vel.vz;
          ai.phase = 'charge_rush';
          ai.timer = isP2 ? 0.92 : 0.85;
          ai.maxTimer = ai.timer;
          callbacks.onTelegraphAudio('shield_charge');
        }
      } else if (ai.phase === 'charge_rush') {
        state.behavior = 'attack';
        attackVariant = 4;
        boosterIntensity = 1.35;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / Math.max(0.01, ai.maxTimer));
        desVx = ai.chargeVx;
        desVz = ai.chargeVz;

        // Emit roaring rocket thruster plumes from dorsal vents!
        ai.ventTick += dt;
        if (ai.ventTick >= 0.09) {
          ai.ventTick = 0;
          const backX = Math.sin(spatial.yaw);
          const backZ = Math.cos(spatial.yaw);
          rig.getDorsalVentWorldPos(-1, _ventPos);
          callbacks.spawnBoosterBurst(
            _ventPos,
            _ventDir.set(backX, -0.35, backZ).normalize(),
            isP2 ? 0xff3014 : 0xff9418,
            8
          );
          rig.getDorsalVentWorldPos(1, _ventPos);
          callbacks.spawnBoosterBurst(
            _ventPos,
            _ventDir.set(backX, -0.35, backZ).normalize(),
            isP2 ? 0xff3014 : 0xff9418,
            8
          );
        }

        // Check heavy hydraulic tackle impact on player!
        if (!ai.chargeHitDone && horizDist <= 2.65 && Math.abs(playerPos.y - spatial.y) <= 2.4) {
          ai.chargeHitDone = true;
          callbacks.applyPlayerMeleeHit(
            isP2 ? 32 : 26,
            _center.set(spatial.x, spatial.y + 1.5, spatial.z),
            0.96
          );
          ai.timer = 0;
        }

        if (ai.timer <= 0) {
          // Slam shockwave at end of Titan Bull-Charge!
          callbacks.onTelegraphAudio('shield_slam');
          _center.set(spatial.x, spatial.y + 0.16, spatial.z);
          callbacks.spawnShockwave({
            center: _center.clone(),
            maxRadius: isP2 ? 9.5 : 7.8,
            expandSpeed: 15.0,
            damage: isP2 ? 24 : 20,
            color: isP2 ? 0xff3414 : 0xff8c1a,
            staggerStrength: 0.85,
          });
          ai.chargeCooldown = isP2 ? 6.4 : 8.5;
          startThermalVent(ai, ctx, isP2, 3.0, 2.5);
        }
      } else if (ai.phase === 'fan_windup') {
        state.behavior = 'windup';
        attackVariant = 5;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 3.8, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / Math.max(0.01, ai.maxTimer));
        if (ai.timer <= 0) {
          ai.phase = 'fan_fire';
          ai.timer = 0.34;
          ai.maxTimer = 0.34;
          ai.barrelHeat = Math.min(1, ai.barrelHeat + 0.45);

          const dirs = computePlasmaFanDirections(spatial.yaw, aimPitch, state.phase);
          rig.getLeftArmMuzzlePos(_muzzleL);
          rig.getRightArmMuzzlePos(_muzzleR);
          callbacks.onFireAudio('shotgun');
          callbacks.spawnMuzzleFlash(_muzzleL, _aimDir.set(dirs[0].x, dirs[0].y, dirs[0].z), 0xff8c1a, true);
          callbacks.spawnMuzzleFlash(
            _muzzleR,
            _aimDir.set(dirs[dirs.length - 1].x, dirs[dirs.length - 1].y, dirs[dirs.length - 1].z),
            0xff8c1a,
            true
          );

          dirs.forEach((d, idx) => {
            const origin = idx < dirs.length / 2 ? _muzzleL : _muzzleR;
            callbacks.spawnProjectile({
              origin: origin.clone(),
              direction: new THREE.Vector3(d.x, d.y, d.z),
              speed: isP2 ? 36 : 31,
              damage: isP2 ? 18 : 15,
              radius: 0.2,
              color: isP2 ? 0xff3e18 : 0xff981c,
              kind: 'plasma_bolt',
              staggerStrength: 0.42,
            });
          });
          ai.plasmaFanCooldown = isP2 ? 4.4 : 5.8;
        }
      } else if (ai.phase === 'fan_fire') {
        state.behavior = 'attack';
        attackVariant = 5;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / Math.max(0.01, ai.maxTimer));
        if (ai.timer <= 0) {
          ai.phase = 'stalk';
          ai.actionCooldown = isP2 ? 0.95 : 1.35;
          ai.strafeSign *= -1;
        }
      } else if (ai.phase === 'vent_reactor') {
        state.behavior = 'recover';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 1.5, dt);
        ai.timer -= dt;
        ai.ventTick += dt;
        if (ai.ventTick >= 0.22) {
          ai.ventTick = 0;
          rig.getDorsalVentWorldPos(-1, _ventPos);
          callbacks.spawnBoosterBurst(_ventPos, _ventDir.set(0, 1, 0), isP2 ? 0xff3414 : 0xffaa24, 5);
          rig.getDorsalVentWorldPos(1, _ventPos);
          callbacks.spawnBoosterBurst(_ventPos, _ventDir.set(0, 1, 0), isP2 ? 0xff3414 : 0xffaa24, 5);
        }
        if (ai.timer <= 0) {
          ai.phase = 'stalk';
          ai.strafeSign *= -1;
        }
      }

      if (!lasersActive) {
        rig.setDualRailLasers(false, 0, 0, 0);
      }

      // STRICT CENTRAL SPIRAL ABYSS GUARD: Never let Bastion-VII step or charge into the r < 5.9m pit!
      const nextX = spatial.x + desVx * dt;
      const nextZ = spatial.z + desVz * dt;
      const abyssR = Math.hypot(nextX, nextZ);
      if (abyssR < 5.95 && abyssR > 0.01) {
        const pushX = nextX / abyssR;
        const pushZ = nextZ / abyssR;
        // Project velocity tangentially + push gently outward
        const radialDot = desVx * pushX + desVz * pushZ;
        if (radialDot < 0) {
          desVx -= pushX * radialDot;
          desVz -= pushZ * radialDot;
        }
        desVx += pushX * 5.2;
        desVz += pushZ * 5.2;
      }

      stepEnemyMovement(spatial, desVx, desVz, world, dt, F7_MIN_FLOOR_Y);

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
        attackVariant,
        flinchTimer: state.flinchTimer,
        flinchDirX: state.flinchDirX,
        staggerTimer: 0,
        deadProgress: 0,
        weakpointExposed: state.weakpoint.exposed,
        weakpointBroken: state.weakpoint.broken,
        shieldActive: false,
        phase: state.phase,
        airborneHeight: 0,
        boosterIntensity,
      });
    },
  };
}
