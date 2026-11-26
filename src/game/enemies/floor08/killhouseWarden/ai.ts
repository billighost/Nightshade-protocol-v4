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
import { KILLHOUSE_WARDEN_CONFIG } from './config';

type WardenActionMode =
  | 'none'
  | 'flash_volley'
  | 'crossfire_advance'
  | 'cyclone_sweep'
  | 'vent_recover';

interface WardenAiState {
  actionMode: WardenActionMode;
  actionPhase: 'windup' | 'attack' | 'recover';
  phaseTimer: number;
  dashDir: number;
  dashCooldown: number;
  cycloneCooldown: number;
  decisionCooldown: number;
  shotsLeft: number;
  shotTimer: number;
  useLeftMuzzle: boolean;
  cycloneShockFired: boolean;
  patrolIndex: number;
}

export function createWardenAiState(): Record<string, unknown> {
  return {
    actionMode: 'none',
    actionPhase: 'windup',
    phaseTimer: 0,
    dashDir: 1,
    dashCooldown: 1.2,
    cycloneCooldown: 3.5,
    decisionCooldown: 0.9,
    shotsLeft: 0,
    shotTimer: 0,
    useLeftMuzzle: false,
    cycloneShockFired: false,
    patrolIndex: 0,
  } satisfies WardenAiState;
}

const _muzzleL = new THREE.Vector3();
const _muzzleR = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _backDir = new THREE.Vector3();
const _worldHit: WorldRaycastHit = {
  hit: false,
  t: 1,
  point: new THREE.Vector3(),
  normal: new THREE.Vector3(),
};

/**
 * AAA 4-Move Zone 3 Killhouse Mini-Boss AI for WARDEN-08 "SABLE":
 * 1. Flash-Dash Akimbo Volley: Checks swept wall clearance (`raycastCollisionWorld3D`), rockets sideways
 *    on amber-gold hip thrusters with peril optic glint, then unleashes an 8-round alternating dual VX-9 burst!
 * 2. Cross-Fire Gun-Kata Advance: Advances diagonally firing 3 synchronized dual-barrel crossfire pairs!
 * 3. Close-Range 360° Gun-Kata Cyclone Sweep: Punishes close-range rushes with a blinding 360° spinning
 *    radial akimbo bullet storm + golden kinetic shockwave!
 * 4. Thermal Capacitor Vent Recovery: After high-output moves, pops his Twin Dorsal Capacitor Coils
 *    blazing solar-gold for 2.45s so skilled operatives can snipe them for an EMP overload stagger!
 */
export function stepWardenAi(ctx: EnemyAiStepContext): void {
  const ai = ctx.aiState as unknown as WardenAiState;
  const {
    dt,
    elapsed,
    state,
    spatial,
    rig,
    playerPos,
    playerRolling,
    world,
    separation,
    callbacks,
  } = ctx;
  const cfg = KILLHOUSE_WARDEN_CONFIG;
  const rigExt = rig as unknown as {
    getLeftMuzzleWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
    getRightMuzzleWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
    getOpticGlintWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
  };

  const dx = playerPos.x - spatial.x;
  const dz = playerPos.z - spatial.z;
  const dist = Math.hypot(dx, dz);
  const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);

  // EMP Capacitor Overload Stagger interrupts all active moves cleanly!
  if (state.staggerTimer > 0) {
    ai.actionMode = 'none';
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
      spatial.y + 1.62,
      spatial.z,
      playerPos.x,
      playerPos.y + 1.32,
      playerPos.z,
      world
    );
  if (hasLos && dist <= 23) {
    state.engaged = true;
  }

  ai.dashCooldown = Math.max(0, ai.dashCooldown - dt);
  ai.cycloneCooldown = Math.max(0, ai.cycloneCooldown - dt);
  ai.decisionCooldown = Math.max(0, ai.decisionCooldown - dt);

  let desVx = 0;
  let desVz = 0;
  let attackProgress = 0;
  let attackVariant = 0;
  let boosterIntensity = 0;

  const fireSingleSmg = (useLeft: boolean, spreadAmp = 0.55): void => {
    const outMuzzle = useLeft ? _muzzleL : _muzzleR;
    if (useLeft && rigExt.getLeftMuzzleWorldPos) {
      rigExt.getLeftMuzzleWorldPos(outMuzzle);
    } else if (!useLeft && rigExt.getRightMuzzleWorldPos) {
      rigExt.getRightMuzzleWorldPos(outMuzzle);
    } else {
      rig.getMuzzleWorldPos(outMuzzle);
    }
    _dir
      .set(
        playerPos.x + (Math.random() - 0.5) * spreadAmp - outMuzzle.x,
        playerPos.y + 1.18 + (Math.random() - 0.5) * (spreadAmp * 0.45) - outMuzzle.y,
        playerPos.z + (Math.random() - 0.5) * spreadAmp - outMuzzle.z
      )
      .normalize();
    callbacks.spawnMuzzleFlash(outMuzzle, _dir, 0xffb824, false);
    callbacks.spawnProjectile({
      origin: outMuzzle,
      direction: _dir,
      speed: 28,
      damage: 7,
      radius: 0.12,
      color: 0xffc038,
      kind: 'plasma_bolt',
      staggerStrength: 0.28,
    });
    callbacks.onFireAudio('smg');
  };

  const enterThermalVent = (): void => {
    ai.actionMode = 'vent_recover';
    ai.actionPhase = 'recover';
    ai.phaseTimer = 2.4;
    ai.dashCooldown = 2.4;
    ai.decisionCooldown = 0.85;
    ctx.exposeWeakpoint(2.45);
    callbacks.onTelegraphAudio('warden_vent');
    callbacks.spawnBoosterBurst(
      _pos.set(spatial.x, spatial.y + 1.72, spatial.z),
      _backDir.set(0, 1, 0),
      0xffd248,
      14
    );
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
        4.6,
        dt
      );
      desVx = (pdx / pDist) * 1.95;
      desVz = (pdz / pDist) * 1.95;
    }
  } else {
    const fwdX = dist > 0.05 ? dx / dist : 0;
    const fwdZ = dist > 0.05 ? dz / dist : -1;
    const rightX = -fwdZ;
    const rightZ = fwdX;

    // -------------------------------------------------------------------------
    // ACTIVE MOVE EXECUTION
    // -------------------------------------------------------------------------
    if (ai.actionMode === 'flash_volley') {
      attackVariant = 0;
      spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 9.5, dt);

      if (ai.actionPhase === 'windup') {
        state.behavior = 'windup';
        ai.phaseTimer -= dt;
        attackProgress = 1 - Math.max(0, ai.phaseTimer) / 0.42;
        boosterIntensity = 1.28;

        // Swept wall clearance check so Warden NEVER dashes face-first into a Killhouse partition!
        const dashVx = rightX * ai.dashDir;
        const dashVz = rightZ * ai.dashDir;
        const blocked = raycastCollisionWorld3D(
          spatial.x,
          spatial.y + 1.0,
          spatial.z,
          spatial.x + dashVx * 1.25,
          spatial.y + 1.0,
          spatial.z + dashVz * 1.25,
          world,
          _worldHit
        );
        if (blocked) {
          ai.dashDir = -ai.dashDir;
        }

        desVx = rightX * ai.dashDir * 11.2 + fwdX * (dist > 11.5 ? 2.4 : -0.8);
        desVz = rightZ * ai.dashDir * 11.2 + fwdZ * (dist > 11.5 ? 2.4 : -0.8);

        if (Math.random() < 0.55) {
          callbacks.spawnBoosterBurst(
            _pos.set(spatial.x, spatial.y + 1.05, spatial.z),
            _backDir.set(-rightX * ai.dashDir, -0.25, -rightZ * ai.dashDir).normalize(),
            0xffb824,
            4
          );
        }

        if (ai.phaseTimer <= 0) {
          ai.actionPhase = 'attack';
          ai.shotsLeft = 8;
          ai.shotTimer = 0.02;
        }
      } else {
        state.behavior = 'attack';
        desVx = rightX * ai.dashDir * 2.4;
        desVz = rightZ * ai.dashDir * 2.4;
        ai.shotTimer -= dt;
        attackProgress = 1 - ai.shotsLeft / 8;

        if (ai.shotTimer <= 0 && ai.shotsLeft > 0) {
          ai.shotsLeft -= 1;
          ai.shotTimer = 0.092;
          ai.useLeftMuzzle = !ai.useLeftMuzzle;
          fireSingleSmg(ai.useLeftMuzzle, 0.52);
        }

        if (ai.shotsLeft <= 0 && ai.shotTimer <= 0) {
          enterThermalVent();
        }
      }
    } else if (ai.actionMode === 'crossfire_advance') {
      attackVariant = 1;
      state.behavior = 'attack';
      spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.8, dt);
      desVx = fwdX * (dist > 6.5 ? 3.2 : -1.5) + rightX * ai.dashDir * 3.1;
      desVz = fwdZ * (dist > 6.5 ? 3.2 : -1.5) + rightZ * ai.dashDir * 3.1;

      ai.shotTimer -= dt;
      attackProgress = 1 - ai.shotsLeft / 3;
      if (ai.shotTimer <= 0 && ai.shotsLeft > 0) {
        ai.shotsLeft -= 1;
        ai.shotTimer = 0.24;
        // Synchronized twin-barrel Equilibrium crossfire pair!
        fireSingleSmg(true, 0.42);
        fireSingleSmg(false, 0.42);
      }

      if (ai.shotsLeft <= 0 && ai.shotTimer <= 0) {
        ai.actionMode = 'none';
        ai.decisionCooldown = 1.15 + Math.random() * 0.4;
        ai.dashDir = -ai.dashDir;
      }
    } else if (ai.actionMode === 'cyclone_sweep') {
      attackVariant = 2;
      if (ai.actionPhase === 'windup') {
        state.behavior = 'windup';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 9.0, dt);
        ai.phaseTimer -= dt;
        attackProgress = 1 - Math.max(0, ai.phaseTimer) / 0.48;
        if (ai.phaseTimer <= 0) {
          ai.actionPhase = 'attack';
          ai.phaseTimer = 0.56;
          ai.shotsLeft = 8;
          ai.shotTimer = 0.04;
          ai.cycloneShockFired = false;
        }
      } else {
        state.behavior = 'attack';
        ai.phaseTimer -= dt;
        attackProgress = 1 - Math.max(0, ai.phaseTimer) / 0.56;
        boosterIntensity = 0.9;

        if (!ai.cycloneShockFired && attackProgress >= 0.2) {
          ai.cycloneShockFired = true;
          callbacks.onTelegraphAudio('booster_burst');
          callbacks.spawnShockwave({
            center: _pos.set(spatial.x, spatial.y, spatial.z),
            maxRadius: 5.4,
            expandSpeed: 12.5,
            damage: 18,
            color: 0xffb824,
            staggerStrength: 0.82,
          });
          if (dist <= 2.75 && !playerRolling && Math.abs(playerPos.y - spatial.y) < 1.3) {
            const blocked = raycastCollisionWorld3D(
              spatial.x,
              spatial.y + 1.0,
              spatial.z,
              playerPos.x,
              playerPos.y + 1.0,
              playerPos.z,
              world,
              _worldHit
            );
            if (!blocked) {
              callbacks.applyPlayerMeleeHit(
                18,
                _pos.set(spatial.x, spatial.y + 1.2, spatial.z),
                0.78
              );
            }
          }
        }

        // Spray radial 360° golden akimbo bolts during the spin!
        ai.shotTimer -= dt;
        if (ai.shotTimer <= 0 && ai.shotsLeft > 0) {
          ai.shotsLeft -= 1;
          ai.shotTimer = 0.062;
          const ang = (ai.shotsLeft / 8) * Math.PI * 2 + spatial.yaw;
          _dir.set(Math.sin(ang), -0.04, Math.cos(ang)).normalize();
          _pos.set(spatial.x + _dir.x * 0.65, spatial.y + 1.25, spatial.z + _dir.z * 0.65);
          callbacks.spawnMuzzleFlash(_pos, _dir, 0xffb824, false);
          callbacks.spawnProjectile({
            origin: _pos,
            direction: _dir,
            speed: 24,
            damage: 8,
            radius: 0.13,
            color: 0xffd248,
            kind: 'plasma_bolt',
            staggerStrength: 0.32,
          });
          callbacks.onFireAudio('smg');
        }

        if (ai.phaseTimer <= 0) {
          ai.cycloneCooldown = 5.6 + Math.random() * 1.6;
          enterThermalVent();
        }
      }
    } else if (ai.actionMode === 'vent_recover') {
      attackVariant = 3;
      state.behavior = 'recover';
      spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 5.2, dt);
      desVx = rightX * ai.dashDir * 0.95;
      desVz = rightZ * ai.dashDir * 0.95;
      ai.phaseTimer -= dt;
      attackProgress = 1 - Math.max(0, ai.phaseTimer) / 2.4;

      if (Math.random() < 0.22) {
        callbacks.spawnBoosterBurst(
          _pos.set(spatial.x, spatial.y + 1.82, spatial.z),
          _backDir.set((Math.random() - 0.5) * 0.4, 1, (Math.random() - 0.5) * 0.4).normalize(),
          0xffd248,
          2
        );
      }

      if (ai.phaseTimer <= 0) {
        ai.actionMode = 'none';
        ai.dashDir = -ai.dashDir;
      }
    } else {
      // -----------------------------------------------------------------------
      // ATHLETIC KILLHOUSE SKIRMISHING & SMART MOVE SELECTION
      // -----------------------------------------------------------------------
      spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.8, dt);
      if (!hasLos || dist > cfg.preferredMaxRange) {
        state.behavior = 'chase';
        desVx = fwdX * cfg.sprintSpeed + rightX * ai.dashDir * 1.8;
        desVz = fwdZ * cfg.sprintSpeed + rightZ * ai.dashDir * 1.8;
      } else {
        state.behavior = 'strafe';
        desVx =
          rightX * ai.dashDir * cfg.moveSpeed +
          (dist < cfg.preferredMinRange ? -fwdX * 2.6 : 0);
        desVz =
          rightZ * ai.dashDir * cfg.moveSpeed +
          (dist < cfg.preferredMinRange ? -fwdZ * 2.6 : 0);
      }

      if (hasLos && ai.decisionCooldown <= 0) {
        if (dist <= 5.4 && ai.cycloneCooldown <= 0) {
          // Close-range 360° Gun-Kata Cyclone Sweep!
          ai.actionMode = 'cyclone_sweep';
          ai.actionPhase = 'windup';
          ai.phaseTimer = 0.48;
          callbacks.onTelegraphAudio('dash');
          if (rigExt.getOpticGlintWorldPos) {
            rigExt.getOpticGlintWorldPos(_pos);
          } else {
            _pos.set(spatial.x, spatial.y + 1.72, spatial.z);
          }
          callbacks.spawnPerilGlint(_pos, 0xffd248);
        } else if (ai.dashCooldown <= 0 && dist <= 18.5) {
          // Signature Flash-Dash into Alternating Akimbo Burst!
          ai.actionMode = 'flash_volley';
          ai.actionPhase = 'windup';
          ai.phaseTimer = 0.42;
          callbacks.onTelegraphAudio('dash');
          callbacks.onTelegraphAudio('booster_burst');
          if (rigExt.getOpticGlintWorldPos) {
            rigExt.getOpticGlintWorldPos(_pos);
          } else {
            _pos.set(spatial.x, spatial.y + 1.72, spatial.z);
          }
          callbacks.spawnPerilGlint(_pos, 0xffc038);
          callbacks.spawnBoosterBurst(
            _pos.set(spatial.x, spatial.y + 1.05, spatial.z),
            _backDir.set(-rightX * ai.dashDir, -0.25, -rightZ * ai.dashDir).normalize(),
            0xffb824,
            16
          );
        } else if (dist <= 16.5) {
          // Equilibrium Cross-Fire Advancing Suppression!
          ai.actionMode = 'crossfire_advance';
          ai.actionPhase = 'attack';
          ai.shotsLeft = 3;
          ai.shotTimer = 0.1;
        }
      }
    }
  }

  if (ai.actionMode !== 'flash_volley') {
    desVx += separation.x * 1.4;
    desVz += separation.y * 1.4;
  }
  stepEnemyMovement(spatial, desVx, desVz, world, dt);

  const speed = Math.hypot(spatial.vx, spatial.vz);
  const sinY = Math.sin(spatial.yaw);
  const cosY = Math.cos(spatial.yaw);
  const localMoveX = (spatial.vx * cosY - spatial.vz * sinY) / Math.max(1, cfg.moveSpeed);

  rig.updateAnimation({
    dt,
    elapsed,
    behavior: state.behavior,
    speedRatio: Math.min(1, speed / cfg.sprintSpeed),
    localMoveX: THREE.MathUtils.clamp(localMoveX, -1, 1),
    localMoveZ: 0.5,
    aimPitch: THREE.MathUtils.clamp((playerPos.y - spatial.y) / Math.max(4, dist), -0.35, 0.35),
    attackProgress,
    attackVariant,
    flinchTimer: state.flinchTimer,
    flinchDirX: state.flinchDirX,
    staggerTimer: state.staggerTimer,
    deadProgress: 0,
    weakpointExposed: state.weakpoint.exposed,
    weakpointBroken: state.weakpoint.broken,
    shieldActive: false,
    phase: 1,
    airborneHeight: 0,
    boosterIntensity,
  });
}
