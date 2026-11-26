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
import { ORDNANCE_PYRO_CONFIG } from './config';
import type { PyroRigHandle } from './index';

type PyroActionMode =
  | 'patrol'
  | 'advance'
  | 'mortar_salvo'
  | 'thermite_sweep'
  | 'napalm_slam'
  | 'vent_recover';

interface PyroAiState {
  actionMode: PyroActionMode;
  actionPhase: 'windup' | 'active' | 'recover';
  phaseTimer: number;
  decisionCooldown: number;
  slamCooldown: number;
  shotsFired: number;
  shotIntervalTimer: number;
  useMortarNext: boolean;
  patrolIndex: number;
}

export function createPyroAiState(): Record<string, unknown> {
  return {
    actionMode: 'patrol',
    actionPhase: 'windup',
    phaseTimer: 0,
    decisionCooldown: 1.2,
    slamCooldown: 0,
    shotsFired: 0,
    shotIntervalTimer: 0,
    useMortarNext: true,
    patrolIndex: 0,
  } satisfies PyroAiState;
}

const _muzzle = new THREE.Vector3();
const _glint = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _upNorm = new THREE.Vector3(0, 1, 0);
const _burstPos = new THREE.Vector3();
const _rayHit: WorldRaycastHit = {
  hit: false,
  t: 1,
  point: new THREE.Vector3(),
  normal: new THREE.Vector3(0, 1, 0),
};

/**
 * AAA Zone 2 Armory Mini-Boss Tactical AI for FORGE-08 "PYRO-TECH":
 * 4 signature heavy-ordnance moves with wall/ceiling awareness & rewarding back-tank counterplay:
 * 1. Mortar Salvo (Variant 0): Braces wide & lobs a 2-shell staggered high-arc 40mm incendiary barrage
 *    with pulsing ground impact warning rings (checks overhead clearance with swept raycast!).
 * 2. Thermite Fan Sweep (Variant 1): Fires a 5-bolt sweeping molten plasma fan across the Armory aisle.
 * 3. Napalm Shockwave Slam (Variant 2): When player rushes inside 5.6m to flank his back tank,
 *    flares dorsal exhaust vents -> slams down a jumpable/rollable molten floor shockwave ring!
 * 4. Thermal Vent Recovery (Variant 3): Brief post-slam hunch pitching his pressurized back fuel tank
 *    high so players who dodge the slam can immediately rupture it for massive bonus stagger!
 */
export function stepPyroAi(ctx: EnemyAiStepContext): void {
  const ai = ctx.aiState as unknown as PyroAiState;
  const { dt, elapsed, state, spatial, rig, playerPos, world, separation, callbacks } = ctx;
  const cfg = ORDNANCE_PYRO_CONFIG;
  const pyroRig = rig as PyroRigHandle;

  const dx = playerPos.x - spatial.x;
  const dz = playerPos.z - spatial.z;
  const dist = Math.hypot(dx, dz);
  const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);

  if (state.staggerTimer > 0) {
    ai.actionMode = 'advance';
    ai.decisionCooldown = Math.max(ai.decisionCooldown, 0.75);
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
      weakpointExposed: true,
      weakpointBroken: state.weakpoint.broken,
      shieldActive: false,
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
      spatial.y + 1.65,
      spatial.z,
      playerPos.x,
      playerPos.y + 1.32,
      playerPos.z,
      world
    );
  if (hasLos && dist <= 24) {
    state.engaged = true;
  }

  ai.decisionCooldown = Math.max(0, ai.decisionCooldown - dt);
  ai.slamCooldown = Math.max(0, ai.slamCooldown - dt);

  let desVx = 0;
  let desVz = 0;
  let attackProgress = 0;
  let attackVariant = 0;
  let boosterIntensity = 0;

  const fireMortarShell = (leadOffsetX: number, leadOffsetZ: number): void => {
    rig.getMuzzleWorldPos(_muzzle);
    const flightTime = THREE.MathUtils.clamp(dist / 10.2, 0.78, 1.38);
    const gravity = 15.2;
    _targetPos.set(playerPos.x + leadOffsetX, playerPos.y + 0.03, playerPos.z + leadOffsetZ);
    const vx = (_targetPos.x - _muzzle.x) / flightTime;
    const vz = (_targetPos.z - _muzzle.z) / flightTime;
    const vy = (_targetPos.y - _muzzle.y + 0.5 * gravity * flightTime * flightTime) / flightTime;
    const speed = Math.hypot(vx, vy, vz);
    _dir.set(vx / speed, vy / speed, vz / speed);

    callbacks.spawnMuzzleFlash(_muzzle, _dir, 0xff7824, true);
    callbacks.spawnProjectile({
      origin: _muzzle,
      direction: _dir,
      speed,
      damage: 24,
      radius: 0.22,
      color: 0xff5a1f,
      kind: 'mortar_canister',
      gravity,
      splashRadius: 2.9,
      targetPos: _targetPos.clone(),
      staggerStrength: 0.86,
    });
    callbacks.onFireAudio('mortar');
  };

  const fireThermiteBolt = (yawOffsetRad: number): void => {
    rig.getMuzzleWorldPos(_muzzle);
    _dir
      .set(playerPos.x - _muzzle.x, playerPos.y + 1.12 - _muzzle.y, playerPos.z - _muzzle.z)
      .normalize();
    const c = Math.cos(yawOffsetRad);
    const s = Math.sin(yawOffsetRad);
    const rx = _dir.x * c - _dir.z * s;
    const rz = _dir.x * s + _dir.z * c;
    _dir.set(rx, _dir.y, rz).normalize();

    callbacks.spawnMuzzleFlash(_muzzle, _dir, 0xff6a18, false);
    callbacks.spawnProjectile({
      origin: _muzzle,
      direction: _dir,
      speed: 22.5,
      damage: 12,
      radius: 0.16,
      color: 0xff6a18,
      kind: 'plasma_bolt',
      staggerStrength: 0.52,
    });
    callbacks.onFireAudio('mortar');
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
        2.4,
        dt
      );
      desVx = (pdx / pDist) * 1.35;
      desVz = (pdz / pDist) * 1.35;
    }
  } else {
    const fwdX = dist > 0.05 ? dx / dist : 0;
    const fwdZ = dist > 0.05 ? dz / dist : -1;

    // Deliberately weighty turn speed so flanking behind his pressurized back tank feels rewarding!
    const turnRate = ai.actionMode === 'vent_recover' ? 1.1 : ai.actionMode === 'napalm_slam' ? 1.8 : 2.65;
    spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, turnRate, dt);

    if (ai.actionMode === 'mortar_salvo') {
      attackVariant = 0;
      ai.phaseTimer -= dt;
      if (ai.actionPhase === 'windup') {
        state.behavior = 'windup';
        attackProgress = THREE.MathUtils.clamp(1 - ai.phaseTimer / 0.74, 0, 1);
        boosterIntensity = 0.55 + attackProgress * 0.55;
        if (ai.phaseTimer <= 0) {
          ai.actionPhase = 'active';
          ai.phaseTimer = 0.62;
          ai.shotsFired = 1;
          ai.shotIntervalTimer = 0.28;
          fireMortarShell(0, 0);
        }
      } else {
        state.behavior = 'attack';
        attackProgress = THREE.MathUtils.clamp(1 - ai.phaseTimer / 0.62, 0, 1);
        boosterIntensity = 0.8 * (1 - attackProgress * 0.5);
        ai.shotIntervalTimer -= dt;
        if (ai.shotsFired < 2 && ai.shotIntervalTimer <= 0) {
          ai.shotsFired = 2;
          // Bracket second mortar slightly off-center so player must reposition!
          const sideX = -fwdZ * 1.45;
          const sideZ = fwdX * 1.45;
          fireMortarShell(sideX, sideZ);
        }
        if (ai.phaseTimer <= 0) {
          ai.actionMode = 'advance';
          ai.decisionCooldown = 2.05;
          ai.useMortarNext = false;
        }
      }
    } else if (ai.actionMode === 'thermite_sweep') {
      attackVariant = 1;
      ai.phaseTimer -= dt;
      if (ai.actionPhase === 'windup') {
        state.behavior = 'windup';
        attackProgress = THREE.MathUtils.clamp(1 - ai.phaseTimer / 0.52, 0, 1);
        boosterIntensity = 0.45 + attackProgress * 0.45;
        if (ai.phaseTimer <= 0) {
          ai.actionPhase = 'active';
          ai.phaseTimer = 0.65;
          ai.shotsFired = 0;
          ai.shotIntervalTimer = 0;
        }
      } else {
        state.behavior = 'attack';
        attackProgress = THREE.MathUtils.clamp(1 - ai.phaseTimer / 0.65, 0, 1);
        boosterIntensity = 0.65;
        ai.shotIntervalTimer -= dt;
        const fanOffsets = [-0.26, -0.13, 0, 0.13, 0.26];
        if (ai.shotsFired < fanOffsets.length && ai.shotIntervalTimer <= 0) {
          fireThermiteBolt(fanOffsets[ai.shotsFired]);
          ai.shotsFired += 1;
          ai.shotIntervalTimer = 0.11;
        }
        if (ai.phaseTimer <= 0) {
          ai.actionMode = 'advance';
          ai.decisionCooldown = 1.95;
          ai.useMortarNext = true;
        }
      }
    } else if (ai.actionMode === 'napalm_slam') {
      attackVariant = 2;
      ai.phaseTimer -= dt;
      if (ai.actionPhase === 'windup') {
        state.behavior = 'windup';
        attackProgress = THREE.MathUtils.clamp(1 - ai.phaseTimer / 0.66, 0, 1);
        boosterIntensity = 0.95 + attackProgress * 0.45;
        if (ai.phaseTimer <= 0) {
          ai.actionPhase = 'active';
          ai.phaseTimer = 0.42;
          callbacks.spawnShockwave({
            center: _targetPos.set(spatial.x, spatial.y + 0.04, spatial.z),
            maxRadius: 6.2,
            expandSpeed: 11.8,
            damage: 24,
            color: 0xff6218,
            staggerStrength: 0.9,
          });
          callbacks.spawnRailImpactCrater(
            _targetPos.set(spatial.x, spatial.y + 0.03, spatial.z),
            _upNorm,
            0xff5a18
          );
          callbacks.spawnBoosterBurst(
            _burstPos.set(spatial.x, spatial.y + 1.85, spatial.z),
            _upNorm,
            0xff741c,
            18
          );
          callbacks.onTelegraphAudio('shield_slam');
        }
      } else {
        state.behavior = 'attack';
        attackProgress = THREE.MathUtils.clamp(1 - ai.phaseTimer / 0.42, 0, 1);
        boosterIntensity = 1.2 * (1 - attackProgress * 0.4);
        if (ai.phaseTimer <= 0) {
          // Enter brief thermal vent cooldown pitching back tank forward/high for counterplay!
          ai.actionMode = 'vent_recover';
          ai.actionPhase = 'recover';
          ai.phaseTimer = 1.45;
          ai.slamCooldown = 6.2;
        }
      }
    } else if (ai.actionMode === 'vent_recover') {
      state.behavior = 'recover';
      attackVariant = 3;
      ai.phaseTimer -= dt;
      attackProgress = THREE.MathUtils.clamp(1 - ai.phaseTimer / 1.45, 0, 1);
      boosterIntensity = 0.75 * (1 - attackProgress * 0.5);
      if (ai.phaseTimer <= 0) {
        ai.actionMode = 'advance';
        ai.decisionCooldown = 0.85;
      }
    } else {
      // Relentless heavy EOD advance / range holding
      if (dist > cfg.preferredMaxRange || !hasLos) {
        state.behavior = 'chase';
        desVx = fwdX * cfg.sprintSpeed;
        desVz = fwdZ * cfg.sprintSpeed;
      } else if (dist < cfg.preferredMinRange) {
        state.behavior = 'strafe';
        desVx = -fwdX * 1.2;
        desVz = -fwdZ * 1.2;
      } else {
        state.behavior = 'strafe';
        desVx = fwdX * 0.65;
        desVz = fwdZ * 0.65;
      }

      if (hasLos && ai.decisionCooldown <= 0 && dist <= 23) {
        if (dist <= 5.6 && ai.slamCooldown <= 0) {
          // Close-range anti-flank Napalm Shockwave Slam!
          ai.actionMode = 'napalm_slam';
          ai.actionPhase = 'windup';
          ai.phaseTimer = 0.66;
          state.behavior = 'windup';
          attackVariant = 2;
          callbacks.onTelegraphAudio('pyro_flare');
          if (pyroRig.getVisorGlintWorldPos) {
            pyroRig.getVisorGlintWorldPos(_glint);
            callbacks.spawnPerilGlint(_glint, 0xff7824);
          }
        } else {
          // Check overhead ceiling/wall clearance before lobbing high-arc mortar salvo!
          const overheadBlocked = raycastCollisionWorld3D(
            spatial.x,
            spatial.y + 1.6,
            spatial.z,
            spatial.x + fwdX * 3.0,
            spatial.y + 4.4,
            spatial.z + fwdZ * 3.0,
            world,
            _rayHit
          );
          if (ai.useMortarNext && dist >= 5.2 && !overheadBlocked) {
            ai.actionMode = 'mortar_salvo';
            ai.actionPhase = 'windup';
            ai.phaseTimer = 0.74;
            state.behavior = 'windup';
            attackVariant = 0;
            callbacks.onTelegraphAudio('mortar');
          } else {
            ai.actionMode = 'thermite_sweep';
            ai.actionPhase = 'windup';
            ai.phaseTimer = 0.52;
            state.behavior = 'windup';
            attackVariant = 1;
            callbacks.onTelegraphAudio('pyro_flare');
          }
        }
      }
    }
  }

  desVx += separation.x * 1.25;
  desVz += separation.y * 1.25;
  stepEnemyMovement(spatial, desVx, desVz, world, dt);

  const speed = Math.hypot(spatial.vx, spatial.vz);
  rig.updateAnimation({
    dt,
    elapsed,
    behavior: state.behavior,
    speedRatio: Math.min(1, speed / cfg.sprintSpeed),
    localMoveX: 0,
    localMoveZ: 1,
    aimPitch: THREE.MathUtils.clamp((playerPos.y - spatial.y) / Math.max(4, dist), -0.32, 0.32),
    attackProgress,
    attackVariant,
    flinchTimer: state.flinchTimer,
    flinchDirX: state.flinchDirX,
    staggerTimer: state.staggerTimer,
    deadProgress: 0,
    weakpointExposed: true,
    weakpointBroken: state.weakpoint.broken,
    shieldActive: false,
    phase: 1,
    airborneHeight: 0,
    boosterIntensity,
  });
}
