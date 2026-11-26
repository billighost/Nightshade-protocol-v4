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
import { BREACHER_CYBORG_CONFIG } from './config';

type BreacherActionMode = 'none' | 'burst' | 'rail_lock' | 'jet_dash' | 'stock_bash';

interface BreacherAiState {
  strafeSign: number;
  strafeSwitchTimer: number;
  burstCooldown: number;
  railCooldown: number;
  jetDashCooldown: number;
  bashCooldown: number;
  actionMode: BreacherActionMode;
  actionPhase: 'windup' | 'attack' | 'recover';
  phaseTimer: number;
  burstShotsLeft: number;
  shotIntervalTimer: number;
  dashDirX: number;
  dashDirZ: number;
  bashHitDealt: boolean;
  glintTriggered: boolean;
  lastHp: number;
  patrolIndex: number;
}

export function createBreacherAiState(): Record<string, unknown> {
  return {
    strafeSign: Math.random() < 0.5 ? -1 : 1,
    strafeSwitchTimer: 1.6 + Math.random() * 1.4,
    burstCooldown: 0.75 + Math.random() * 0.7,
    railCooldown: 3.4 + Math.random() * 1.6,
    jetDashCooldown: 2.8 + Math.random() * 1.2,
    bashCooldown: 0.8,
    actionMode: 'none',
    actionPhase: 'windup',
    phaseTimer: 0,
    burstShotsLeft: 0,
    shotIntervalTimer: 0,
    dashDirX: 1,
    dashDirZ: 0,
    bashHitDealt: false,
    glintTriggered: false,
    lastHp: BREACHER_CYBORG_CONFIG.maxHp,
    patrolIndex: 0,
  } satisfies BreacherAiState;
}

const _muzzle = new THREE.Vector3();
const _laserOrigin = new THREE.Vector3();
const _laserEnd = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _glintPos = new THREE.Vector3();
const _backDir = new THREE.Vector3();
const _rayHit: WorldRaycastHit = {
  hit: false,
  t: 1,
  point: new THREE.Vector3(),
  normal: new THREE.Vector3(0, 1, 0),
};

interface BreacherRigExt {
  setLaserSight?: (visible: boolean, lengthMeters: number, lockCharge?: number) => void;
  getLaserOriginWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
  getOpticGlintWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
}

/**
 * AAA Smart Spec-Ops Marksman AI for BREACHER-08:
 * - Move 1: Suppressive 3-Round Plasma Burst with live muzzle flashes & wall-stopped bolts
 * - Move 2: Kneeling Laser-Locked Overcharged Rail-Slug (wall-clipped live targeting laser +
 *           blinding Quad-NOD optic glint + rising railgun whine -> hyper-velocity rail spear that
 *           blasts a molten crater + spark shower on walls/cover if dodged!)
 * - Move 3: Reactive Dorsal Jet-Dash Sidestep Evade when taking fire or repositioning
 * - Move 4: Close-Quarters Rifle Stock-Bash + thruster back-hop if player rushes point-blank!
 */
export function stepBreacherAi(ctx: EnemyAiStepContext): void {
  const ai = ctx.aiState as unknown as BreacherAiState;
  const { dt, elapsed, state, spatial, rig, playerPos, playerRolling, world, hasAttackToken, separation, callbacks } =
    ctx;
  const cfg = BREACHER_CYBORG_CONFIG;
  const rigExt = rig as unknown as BreacherRigExt;

  const dx = playerPos.x - spatial.x;
  const dz = playerPos.z - spatial.z;
  const dist = Math.hypot(dx, dz);
  const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);

  if (state.staggerTimer > 0) {
    ai.actionMode = 'none';
    ai.burstShotsLeft = 0;
    rigExt.setLaserSight?.(false, 0);
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
      weakpointExposed: state.weakpoint.exposed,
      weakpointBroken: state.weakpoint.broken,
      shieldActive: false,
      phase: 1,
      airborneHeight: 0,
      boosterIntensity: 0,
    });
    return;
  }

  // Cooldowns
  ai.burstCooldown = Math.max(0, ai.burstCooldown - dt);
  ai.railCooldown = Math.max(0, ai.railCooldown - dt);
  ai.jetDashCooldown = Math.max(0, ai.jetDashCooldown - dt);
  ai.bashCooldown = Math.max(0, ai.bashCooldown - dt);

  const tookRecentDamage = state.hp < ai.lastHp - 4;
  ai.lastHp = state.hp;

  const hasLos =
    dist <= cfg.detectRange &&
    hasEnemyLineOfSight(
      spatial.x,
      spatial.y + 1.48,
      spatial.z,
      playerPos.x,
      playerPos.y + 1.28,
      playerPos.z,
      world
    );

  if (hasLos && dist <= cfg.detectRange) {
    state.engaged = true;
  }

  let desVx = 0;
  let desVz = 0;
  let attackProgress = 0;
  let attackVariant = 0;
  let boosterIntensity = 0;
  let showLaser = false;
  let laserLockCharge = 0;

  if (!state.engaged) {
    state.behavior = 'patrol';
    const wp = ctx.patrolPoints[ai.patrolIndex % ctx.patrolPoints.length];
    const pdx = wp.x - spatial.x;
    const pdz = wp.z - spatial.z;
    const pDist = Math.hypot(pdx, pdz);
    if (pDist < 0.75) {
      ai.patrolIndex = (ai.patrolIndex + 1) % ctx.patrolPoints.length;
    } else if (pDist > 0.1) {
      const pYaw = computeFacingYaw(spatial.x, spatial.z, wp.x, wp.z);
      spatial.yaw = rotateYawTowards(spatial.yaw, pYaw, 4.4, dt);
      desVx = (pdx / pDist) * 1.7;
      desVz = (pdz / pDist) * 1.7;
    }
  } else {
    const fwdX = dist > 0.05 ? dx / dist : 0;
    const fwdZ = dist > 0.05 ? dz / dist : -1;
    const rightX = -fwdZ;
    const rightZ = fwdX;

    ai.strafeSwitchTimer -= dt;
    if (ai.strafeSwitchTimer <= 0) {
      ai.strafeSign = -ai.strafeSign;
      ai.strafeSwitchTimer = 1.4 + Math.random() * 1.6;
    }

    // Reactive Jet-Dash Evade if taking fire while not mid-attack!
    if (ai.actionMode === 'none' && tookRecentDamage && ai.jetDashCooldown <= 0 && dist > 3.5) {
      ai.actionMode = 'jet_dash';
      ai.actionPhase = 'attack';
      ai.phaseTimer = 0.34;
      ai.jetDashCooldown = 4.2 + Math.random() * 1.8;
      ai.strafeSign = Math.random() < 0.5 ? -1 : 1;
      ai.dashDirX = rightX * ai.strafeSign * 0.92 - fwdX * 0.35;
      ai.dashDirZ = rightZ * ai.strafeSign * 0.92 - fwdZ * 0.35;
      callbacks.onTelegraphAudio('booster_burst');
      _backDir.set(-ai.dashDirX, -0.35, -ai.dashDirZ).normalize();
      callbacks.spawnBoosterBurst(
        _muzzle.set(spatial.x, spatial.y + 1.28, spatial.z),
        _backDir,
        0x38bdf8,
        14
      );
    }

    // -------------------------------------------------------------------------
    // ACTIVE MOVE EXECUTION
    // -------------------------------------------------------------------------
    if (ai.actionMode === 'burst') {
      attackVariant = 0;
      spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.2, dt);
      showLaser = true;
      laserLockCharge = 0.22;

      if (ai.actionPhase === 'windup') {
        state.behavior = 'windup';
        ai.phaseTimer -= dt;
        attackProgress = 1 - Math.max(0, ai.phaseTimer) / 0.28;
        desVx = rightX * ai.strafeSign * 1.25;
        desVz = rightZ * ai.strafeSign * 1.25;
        if (ai.phaseTimer <= 0) {
          ai.actionPhase = 'attack';
          ai.burstShotsLeft = 3;
          ai.shotIntervalTimer = 0;
        }
      } else {
        state.behavior = 'attack';
        desVx = rightX * ai.strafeSign * 1.1;
        desVz = rightZ * ai.strafeSign * 1.1;
        ai.shotIntervalTimer -= dt;
        attackProgress = 1 - ai.burstShotsLeft / 3;
        if (ai.shotIntervalTimer <= 0 && ai.burstShotsLeft > 0) {
          ai.burstShotsLeft -= 1;
          ai.shotIntervalTimer = 0.135;
          rig.getMuzzleWorldPos(_muzzle);
          _dir
            .set(
              playerPos.x + (Math.random() - 0.5) * 0.42 - _muzzle.x,
              playerPos.y + 1.18 + (Math.random() - 0.5) * 0.22 - _muzzle.y,
              playerPos.z + (Math.random() - 0.5) * 0.42 - _muzzle.z
            )
            .normalize();
          callbacks.spawnProjectile({
            origin: _muzzle,
            direction: _dir,
            speed: 26,
            damage: 9,
            radius: 0.13,
            color: 0xff5a24,
            kind: 'plasma_bolt',
            staggerStrength: 0.36,
          });
          callbacks.spawnMuzzleFlash(_muzzle, _dir, 0xff7a24, false);
          callbacks.onFireAudio('rifle');
        }
        if (ai.burstShotsLeft <= 0 && ai.shotIntervalTimer <= -0.06) {
          ai.actionMode = 'none';
          ai.burstCooldown = 1.35 + Math.random() * 0.7;
        }
      }
    } else if (ai.actionMode === 'rail_lock') {
      // MOVE 2: KNEELING LASER-LOCKED OVERCHARGED RAIL-SLUG!
      attackVariant = 1;
      if (ai.actionPhase === 'windup') {
        state.behavior = 'windup';
        // Track cleanly early, then lock yaw tight in final 0.22s so skilled players can dodge-roll!
        const trackRate = ai.phaseTimer > 0.22 ? 6.5 : 1.4;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, trackRate, dt);
        ai.phaseTimer -= dt;
        attackProgress = 1 - Math.max(0, ai.phaseTimer) / 0.92;
        showLaser = true;
        laserLockCharge = Math.min(1, 0.2 + attackProgress * 0.85);

        if (!ai.glintTriggered && attackProgress > 0.32) {
          ai.glintTriggered = true;
          const glintOrigin = rigExt.getOpticGlintWorldPos
            ? rigExt.getOpticGlintWorldPos(_glintPos)
            : _glintPos.set(spatial.x, spatial.y + 1.38, spatial.z);
          callbacks.spawnPerilGlint(glintOrigin, 0xffb830);
        }

        if (ai.phaseTimer <= 0) {
          ai.actionPhase = 'attack';
          ai.phaseTimer = 0.26;
          rig.getMuzzleWorldPos(_muzzle);
          const aimFx = -Math.sin(spatial.yaw);
          const aimFz = -Math.cos(spatial.yaw);
          const aimDy = playerPos.y + 1.15 - _muzzle.y;
          const hDist = Math.max(2.0, dist);
          _dir.set(aimFx * hDist, aimDy, aimFz * hDist).normalize();

          callbacks.spawnProjectile({
            origin: _muzzle,
            direction: _dir,
            speed: 44,
            damage: 20,
            radius: 0.16,
            color: 0xffc238,
            kind: 'rail_slug',
            staggerStrength: 0.78,
          });
          callbacks.spawnMuzzleFlash(_muzzle, _dir, 0xffb830, true);
          callbacks.onFireAudio('rail_slug');
        }
      } else if (ai.actionPhase === 'attack') {
        state.behavior = 'attack';
        ai.phaseTimer -= dt;
        attackProgress = 1 - Math.max(0, ai.phaseTimer) / 0.26;
        if (ai.phaseTimer <= 0) {
          ai.actionPhase = 'recover';
          ai.phaseTimer = 0.45;
        }
      } else {
        state.behavior = 'recover';
        ai.phaseTimer -= dt;
        attackProgress = 1 - Math.max(0, ai.phaseTimer) / 0.45;
        if (ai.phaseTimer <= 0) {
          ai.actionMode = 'none';
          ai.railCooldown = 4.8 + Math.random() * 2.2;
          ai.burstCooldown = 0.9;
        }
      }
    } else if (ai.actionMode === 'jet_dash') {
      // MOVE 3: BOOSTED LATERAL JET-DASH EVADE!
      attackVariant = 2;
      state.behavior = 'attack';
      spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 9.0, dt);
      ai.phaseTimer -= dt;
      attackProgress = 1 - Math.max(0, ai.phaseTimer) / 0.34;
      boosterIntensity = 1.15;
      desVx = ai.dashDirX * 11.2;
      desVz = ai.dashDirZ * 11.2;
      if (ai.phaseTimer <= 0) {
        ai.actionMode = 'none';
      }
    } else if (ai.actionMode === 'stock_bash') {
      // MOVE 4: CLOSE-QUARTERS RIFLE STOCK-BASH + THRUSTER BACK-HOP!
      attackVariant = 3;
      spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.5, dt);
      if (ai.actionPhase === 'windup') {
        state.behavior = 'windup';
        ai.phaseTimer -= dt;
        attackProgress = 1 - Math.max(0, ai.phaseTimer) / 0.34;
        if (ai.phaseTimer <= 0) {
          ai.actionPhase = 'attack';
          ai.phaseTimer = 0.22;
          ai.bashHitDealt = false;
        }
      } else if (ai.actionPhase === 'attack') {
        state.behavior = 'attack';
        ai.phaseTimer -= dt;
        attackProgress = 1 - Math.max(0, ai.phaseTimer) / 0.22;
        desVx = fwdX * 4.5;
        desVz = fwdZ * 4.5;
        if (!ai.bashHitDealt && attackProgress >= 0.35) {
          ai.bashHitDealt = true;
          if (dist <= 2.65 && Math.abs(playerPos.y - spatial.y) < 1.35 && !playerRolling) {
            const blocked = raycastCollisionWorld3D(
              spatial.x,
              spatial.y + 1.15,
              spatial.z,
              playerPos.x,
              playerPos.y + 1.15,
              playerPos.z,
              world,
              _rayHit
            );
            if (!blocked) {
              callbacks.applyPlayerMeleeHit(14, _muzzle.set(spatial.x, spatial.y + 1.2, spatial.z), 0.72);
            }
          }
        }
        if (ai.phaseTimer <= 0) {
          ai.actionPhase = 'recover';
          ai.phaseTimer = 0.34;
          callbacks.onTelegraphAudio('booster_burst');
        }
      } else {
        // Thruster back-hop to reopen firing distance!
        state.behavior = 'recover';
        ai.phaseTimer -= dt;
        attackProgress = 1 - Math.max(0, ai.phaseTimer) / 0.34;
        boosterIntensity = 0.95;
        desVx = -fwdX * 7.8;
        desVz = -fwdZ * 7.8;
        if (ai.phaseTimer <= 0) {
          ai.actionMode = 'none';
          ai.bashCooldown = 3.6;
        }
      }
    } else {
      // NEUTRAL TACTICAL POSITIONING & MOVE SELECTION
      spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 7.0, dt);

      if (dist < 2.85 && ai.bashCooldown <= 0) {
        // Player rushed point-blank -> CQB Rifle Stock-Bash + back-boost!
        ai.actionMode = 'stock_bash';
        ai.actionPhase = 'windup';
        ai.phaseTimer = 0.34;
        callbacks.onTelegraphAudio('melee');
      } else if (hasLos && hasAttackToken && ai.railCooldown <= 0 && dist >= 7.0 && dist <= 23.5) {
        // Open long/mid sightline -> Kneeling Laser-Locked Overcharged Rail-Slug!
        ai.actionMode = 'rail_lock';
        ai.actionPhase = 'windup';
        ai.phaseTimer = 0.92;
        ai.glintTriggered = false;
        callbacks.onTelegraphAudio('rail_charge');
      } else if (hasLos && hasAttackToken && ai.burstCooldown <= 0 && dist <= 22.0) {
        // Standard crisp 3-round suppressive plasma burst!
        ai.actionMode = 'burst';
        ai.actionPhase = 'windup';
        ai.phaseTimer = 0.28;
      } else if (!hasLos || dist > cfg.preferredMaxRange) {
        state.behavior = 'chase';
        desVx = fwdX * cfg.sprintSpeed + rightX * ai.strafeSign * 0.95;
        desVz = fwdZ * cfg.sprintSpeed + rightZ * ai.strafeSign * 0.95;
      } else if (dist < cfg.preferredMinRange) {
        state.behavior = 'strafe';
        showLaser = hasLos;
        laserLockCharge = 0.1;
        desVx = -fwdX * 2.5 + rightX * ai.strafeSign * cfg.moveSpeed;
        desVz = -fwdZ * 2.5 + rightZ * ai.strafeSign * cfg.moveSpeed;
      } else {
        state.behavior = 'strafe';
        showLaser = hasLos;
        laserLockCharge = 0.12;
        desVx = rightX * ai.strafeSign * cfg.moveSpeed;
        desVz = rightZ * ai.strafeSign * cfg.moveSpeed;
      }
    }
  }

  // Squad separation & solid collision movement
  desVx += separation.x * 1.8;
  desVz += separation.y * 1.8;
  stepEnemyMovement(spatial, desVx, desVz, world, dt);

  const speed = Math.hypot(spatial.vx, spatial.vz);
  const sinY = Math.sin(spatial.yaw);
  const cosY = Math.cos(spatial.yaw);
  const localMoveX = (spatial.vx * cosY - spatial.vz * sinY) / Math.max(1, cfg.moveSpeed);
  const localMoveZ = (-spatial.vx * sinY - spatial.vz * cosY) / Math.max(1, cfg.moveSpeed);

  rig.updateAnimation({
    dt,
    elapsed,
    behavior: state.behavior,
    speedRatio: Math.min(1, speed / cfg.sprintSpeed),
    localMoveX: THREE.MathUtils.clamp(localMoveX, -1, 1),
    localMoveZ: THREE.MathUtils.clamp(localMoveZ, -1, 1),
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

  // Update live wall-clipped tactical targeting laser sight beam!
  if (showLaser && rigExt.setLaserSight && rigExt.getLaserOriginWorldPos) {
    rig.root.updateMatrixWorld(true);
    rigExt.getLaserOriginWorldPos(_laserOrigin);
    const fx = -Math.sin(spatial.yaw);
    const fz = -Math.cos(spatial.yaw);
    const maxLen = Math.min(24, Math.max(4, dist + 2.5));
    _laserEnd.set(_laserOrigin.x + fx * maxLen, _laserOrigin.y, _laserOrigin.z + fz * maxLen);
    const hitWall = raycastCollisionWorld3D(
      _laserOrigin.x,
      _laserOrigin.y,
      _laserOrigin.z,
      _laserEnd.x,
      _laserEnd.y,
      _laserEnd.z,
      world,
      _rayHit
    );
    const beamLen = hitWall ? Math.max(0.25, maxLen * _rayHit.t) : maxLen;
    rigExt.setLaserSight(true, beamLen, laserLockCharge);
  } else {
    rigExt.setLaserSight?.(false, 0);
  }
}
