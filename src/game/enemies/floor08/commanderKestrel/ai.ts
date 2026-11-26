import * as THREE from 'three';
import type { EnemyAiStepContext } from '../../core/enemyManager';
import {
  computeFacingYaw,
  raycastCollisionWorld3D,
  rotateYawTowards,
  stepEnemyMovement,
} from '../../core/enemyNav';
import { COMMANDER_KESTREL_CONFIG } from './config';

type KestrelAttackKind = 'carbine_burst' | 'jet_blade' | 'aerial_slam' | 'wing_fan_barrage';

interface KestrelAiState {
  strafeSign: number;
  attackCooldown: number;
  currentAttack: KestrelAttackKind;
  phaseTimer: number;
  burstShotsLeft: number;
  shotTimer: number;
  dashDirX: number;
  dashDirZ: number;
  hitApplied: boolean;
  slashVfxFired: boolean;
  aerialVolleyFired: boolean;
  airborneHeight: number;
  maxSafeHover: number;
  cycleIndex: number;
  lastPhase: 1 | 2;
}

export function createKestrelAiState(): Record<string, unknown> {
  return {
    strafeSign: 1,
    attackCooldown: 1.0,
    currentAttack: 'carbine_burst',
    phaseTimer: 0,
    burstShotsLeft: 0,
    shotTimer: 0,
    dashDirX: 0,
    dashDirZ: -1,
    hitApplied: false,
    slashVfxFired: false,
    aerialVolleyFired: false,
    airborneHeight: 0,
    maxSafeHover: 2.05,
    cycleIndex: 0,
    lastPhase: 1,
  } satisfies KestrelAiState;
}

const _muzzle = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _exhaust = new THREE.Vector3();
const _glintPos = new THREE.Vector3();
const _slashDir = new THREE.Vector3();
const _upNormal = new THREE.Vector3(0, 1, 0);
const _rayHit = {
  hit: false,
  t: 1,
  point: new THREE.Vector3(),
  normal: new THREE.Vector3(),
};

/**
 * Multi-Phase Wall-Aware Floor 08 Main-Hall Boss AI for COMMANDER KESTREL-08:
 * - Phase 1 (100%–55% HP):
 *   0. Sovereign-8 Overdrive Pulse Carbine jet-strafe bursts (5 crimson rounds)
 *   1. Aero-Jet Thermal Blade Dash (peril glint -> wall-checked dash -> wide Seraph-Edge slash arc + wall/floor scars -> 2.6s gold vent window!)
 *   2. Valkyrie Meteor Hover-Slam (occasional closer with ceiling raycast -> expanding golden shockwave ring + crater -> 3.2s gold vent window!)
 * - Phase 2 OVERDRIVE (<= 55% HP):
 *   Triggers dramatic golden wing-flare overdrive burst + unlocks Move 3 (`wing_fan_barrage`: levitating 7-bolt golden fan sweep)
 *   plus upgrades carbine bursts to 7 rapid gold rounds + mid-air suppression volley at peak Meteor Hover!
 */
export function stepKestrelAi(ctx: EnemyAiStepContext): void {
  const ai = ctx.aiState as unknown as KestrelAiState;
  const { dt, elapsed, state, spatial, rig, playerPos, playerRolling, world, callbacks } = ctx;
  const cfg = COMMANDER_KESTREL_CONFIG;
  const rigExt = rig as unknown as {
    getVisorGlintWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
  };

  // Floor Boss is always engaged upon arrival in the Central Main Firing Hall
  state.engaged = true;

  // Detect Phase 1 -> Phase 2 Overdrive Awakening for visceral golden wing-flare burst!
  if (state.phase === 2 && ai.lastPhase === 1) {
    ai.lastPhase = 2;
    callbacks.onTelegraphAudio('kestrel_overdrive');
    _origin.set(spatial.x, spatial.y + 1.45, spatial.z);
    _exhaust.set(0, -1, 0);
    callbacks.spawnBoosterBurst(_origin, _exhaust, 0xffc424, 32);
    if (rigExt.getVisorGlintWorldPos) {
      callbacks.spawnPerilGlint(rigExt.getVisorGlintWorldPos(_glintPos), 0xffd248);
    }
  }

  const dx = playerPos.x - spatial.x;
  const dz = playerPos.z - spatial.z;
  const dist = Math.hypot(dx, dz);
  const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);

  if (state.staggerTimer > 0) {
    ai.airborneHeight = Math.max(0, ai.airborneHeight - dt * 5.5);
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
      phase: state.phase,
      airborneHeight: ai.airborneHeight,
      boosterIntensity: 0.08,
    });
    return;
  }

  ai.attackCooldown = Math.max(0, ai.attackCooldown - dt);
  let desVx = 0;
  let desVz = 0;
  let attackProgress = 0;
  let boosterIntensity = state.phase === 2 ? 0.5 : 0.2;
  const variant =
    ai.currentAttack === 'wing_fan_barrage'
      ? 3
      : ai.currentAttack === 'aerial_slam'
        ? 2
        : ai.currentAttack === 'jet_blade'
          ? 1
          : 0;

  const fwdX = dist > 0.05 ? dx / dist : 0;
  const fwdZ = dist > 0.05 ? dz / dist : -1;
  const rightX = -fwdZ;
  const rightZ = fwdX;
  const isP2 = state.phase === 2;

  if (state.behavior === 'windup') {
    ai.phaseTimer += dt;
    if (ai.currentAttack === 'aerial_slam') {
      // Hover skyward (respecting overhead ceiling clearance!) while closing toward player!
      attackProgress = Math.min(1, ai.phaseTimer / 0.92);
      ai.airborneHeight = Math.sin(attackProgress * Math.PI * 0.5) * ai.maxSafeHover;
      spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.5, dt);
      desVx = fwdX * 4.0;
      desVz = fwdZ * 4.0;
      boosterIntensity = 1.25;

      // At peak hover in Phase 2, fire a 3-bolt aerial suppression warning volley!
      if (isP2 && !ai.aerialVolleyFired && attackProgress >= 0.72) {
        ai.aerialVolleyFired = true;
        rig.getMuzzleWorldPos(_muzzle);
        for (const spread of [-0.22, 0, 0.22]) {
          const aimYaw = spatial.yaw + spread;
          _dir
            .set(
              -Math.sin(aimYaw),
              THREE.MathUtils.clamp((playerPos.y + 1.0 - _muzzle.y) / Math.max(4, dist), -0.65, -0.15),
              -Math.cos(aimYaw)
            )
            .normalize();
          callbacks.spawnProjectile({
            origin: _muzzle,
            direction: _dir,
            speed: 28,
            damage: 10,
            radius: 0.15,
            color: 0xffc424,
            kind: 'boss_overdrive',
            staggerStrength: 0.42,
          });
        }
        callbacks.spawnMuzzleFlash(_muzzle, _dir, 0xffc424, true);
        callbacks.onFireAudio('boss_carbine');
      }

      if (ai.phaseTimer >= 0.92) {
        state.behavior = 'attack';
        ai.phaseTimer = 0;
        ai.hitApplied = false;
      }
    } else if (ai.currentAttack === 'wing_fan_barrage') {
      // Phase 2 levitating wing-flare buildup
      attackProgress = Math.min(1, ai.phaseTimer / 0.56);
      ai.airborneHeight = Math.sin(attackProgress * Math.PI * 0.5) * Math.min(1.28, ai.maxSafeHover);
      spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 9.5, dt);
      boosterIntensity = 1.15;
      if (ai.phaseTimer >= 0.56) {
        state.behavior = 'attack';
        ai.phaseTimer = 0;
        ai.burstShotsLeft = 7;
        ai.shotTimer = 0;
      }
    } else if (ai.currentAttack === 'jet_blade') {
      attackProgress = Math.min(1, ai.phaseTimer / 0.48);
      boosterIntensity = 0.95;
      if (attackProgress < 0.72) {
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 10.5, dt);
        ai.dashDirX = fwdX;
        ai.dashDirZ = fwdZ;
      }
      if (ai.phaseTimer >= 0.48) {
        state.behavior = 'attack';
        ai.phaseTimer = 0;
        ai.hitApplied = false;
        ai.slashVfxFired = false;
        callbacks.onTelegraphAudio('booster_burst');
        _origin.set(
          spatial.x - ai.dashDirX * 0.35,
          spatial.y + 1.35,
          spatial.z - ai.dashDirZ * 0.35
        );
        _exhaust.set(-ai.dashDirX, -0.35, -ai.dashDirZ).normalize();
        callbacks.spawnBoosterBurst(_origin, _exhaust, isP2 ? 0xffc424 : 0x38e8ff, 26);
      }
    } else {
      attackProgress = Math.min(1, ai.phaseTimer / 0.32);
      spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 9.0, dt);
      if (ai.phaseTimer >= 0.32) {
        state.behavior = 'attack';
        ai.phaseTimer = 0;
        ai.burstShotsLeft = isP2 ? 7 : 5;
        ai.shotTimer = 0;
      }
    }
  } else if (state.behavior === 'attack') {
    ai.phaseTimer += dt;
    if (ai.currentAttack === 'aerial_slam') {
      // Meteor drop slam -> expanding golden floor shockwave ring + scorched crater!
      attackProgress = Math.min(1, ai.phaseTimer / 0.3);
      ai.airborneHeight = Math.max(0, ai.maxSafeHover * (1 - attackProgress * attackProgress));
      boosterIntensity = 1.05;
      if (!ai.hitApplied && attackProgress >= 0.65) {
        ai.hitApplied = true;
        ai.airborneHeight = 0;
        _origin.set(spatial.x, spatial.y + 0.04, spatial.z);
        callbacks.spawnShockwave({
          center: _origin,
          maxRadius: 12.5,
          expandSpeed: 10.0,
          damage: 26,
          color: 0xffb824,
          staggerStrength: 0.95,
        });
        callbacks.spawnRailImpactCrater(_origin, _upNormal, 0xffb824);
        callbacks.spawnImpactVfx(_origin, false, true);
        callbacks.onTelegraphAudio('shield_slam');
        if (dist <= 2.9 && !playerRolling) {
          callbacks.applyPlayerMeleeHit(28, _origin, 1.0);
        }
      }
      if (ai.phaseTimer >= 0.38) {
        state.behavior = 'recover';
        ai.phaseTimer = 0;
        ai.attackCooldown = 1.85;
        ctx.exposeWeakpoint(3.2);
      }
    } else if (ai.currentAttack === 'wing_fan_barrage') {
      // Sweeping 7-bolt Phase 2 golden overdrive plasma fan while hovering!
      spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.0, dt);
      ai.airborneHeight = Math.min(1.28, ai.maxSafeHover);
      desVx = rightX * ai.strafeSign * 4.8;
      desVz = rightZ * ai.strafeSign * 4.8;
      boosterIntensity = 1.2;
      ai.shotTimer -= dt;
      const idx = 7 - ai.burstShotsLeft;
      attackProgress = idx / 7;
      if (ai.shotTimer <= 0 && ai.burstShotsLeft > 0) {
        ai.burstShotsLeft -= 1;
        ai.shotTimer = 0.085;
        rig.getMuzzleWorldPos(_muzzle);
        const fanAngle = -0.44 + (idx / 6) * 0.88;
        const aimYaw = spatial.yaw + fanAngle;
        _dir
          .set(
            -Math.sin(aimYaw),
            THREE.MathUtils.clamp((playerPos.y + 1.08 - _muzzle.y) / Math.max(4, dist), -0.45, 0.25),
            -Math.cos(aimYaw)
          )
          .normalize();
        callbacks.spawnProjectile({
          origin: _muzzle,
          direction: _dir,
          speed: 31,
          damage: 11,
          radius: 0.16,
          color: 0xffc424,
          kind: 'boss_overdrive',
          staggerStrength: 0.48,
        });
        callbacks.spawnMuzzleFlash(_muzzle, _dir, 0xffc424, true);
        callbacks.onFireAudio('boss_carbine');
      }
      if (ai.burstShotsLeft <= 0 && ai.phaseTimer >= 0.65) {
        state.behavior = 'recover';
        ai.phaseTimer = 0;
        ai.attackCooldown = 1.5;
        ai.strafeSign = -ai.strafeSign;
        ctx.exposeWeakpoint(2.45);
      }
    } else if (ai.currentAttack === 'jet_blade') {
      // Wall-aware Aero-Jet Thermal Blade Dash + Seraph-Edge Greatsword Cleave!
      attackProgress = Math.min(1, ai.phaseTimer / 0.36);
      boosterIntensity = 1.3;

      const stepDist = 14.5 * dt;
      const blockedAhead = raycastCollisionWorld3D(
        spatial.x,
        spatial.y + 1.05,
        spatial.z,
        spatial.x + ai.dashDirX * (stepDist + 0.85),
        spatial.y + 1.05,
        spatial.z + ai.dashDirZ * (stepDist + 0.85),
        world,
        _rayHit
      );

      if (blockedAhead) {
        desVx = 0;
        desVz = 0;
        if (!ai.slashVfxFired) {
          ai.slashVfxFired = true;
          _slashDir.set(ai.dashDirX, 0, ai.dashDirZ).normalize();
          callbacks.spawnSurfaceSlashScar(_rayHit.point, _rayHit.normal, _slashDir, true);
        }
      } else {
        desVx = ai.dashDirX * 14.5;
        desVz = ai.dashDirZ * 14.5;
      }

      if (!ai.slashVfxFired && ai.phaseTimer >= 0.12) {
        ai.slashVfxFired = true;
        _origin.set(
          spatial.x + ai.dashDirX * 0.72,
          spatial.y + 1.24,
          spatial.z + ai.dashDirZ * 0.72
        );
        callbacks.spawnBladeSlashArc(
          _origin,
          spatial.yaw,
          -0.24,
          0.08,
          2.9,
          isP2 ? 0xffc424 : 0xff2c48,
          true,
          -1
        );
        callbacks.onKatanaSlashAudio?.(true);
        // Carve scorching floor slash scar under the heavy greatsword arc!
        _slashDir.set(ai.dashDirX, 0, ai.dashDirZ).normalize();
        callbacks.spawnSurfaceSlashScar(
          _origin.set(
            spatial.x + ai.dashDirX * 1.4,
            spatial.y + 0.04,
            spatial.z + ai.dashDirZ * 1.4
          ),
          _upNormal,
          _slashDir,
          true
        );
      }

      if (!ai.hitApplied && ai.phaseTimer >= 0.08 && ai.phaseTimer <= 0.3) {
        const reach = playerRolling ? 1.1 : 2.55;
        if (dist <= reach && Math.abs(playerPos.y - spatial.y) < 1.7) {
          // Verify no solid cover wall separates blade from operative
          const wallBetween = raycastCollisionWorld3D(
            spatial.x,
            spatial.y + 1.15,
            spatial.z,
            playerPos.x,
            playerPos.y + 1.0,
            playerPos.z,
            world,
            _rayHit
          );
          if (!wallBetween) {
            ai.hitApplied = true;
            _origin.set(spatial.x, spatial.y + 1.3, spatial.z);
            callbacks.applyPlayerMeleeHit(24, _origin, 0.92);
          }
        }
      }

      if (ai.phaseTimer >= 0.36) {
        state.behavior = 'recover';
        ai.phaseTimer = 0;
        ai.attackCooldown = 1.65;
        ctx.exposeWeakpoint(2.6);
      }
    } else {
      // High-velocity Sovereign-8 Overdrive Pulse Carbine burst while jet-strafing
      spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 9.2, dt);
      desVx = rightX * ai.strafeSign * 4.6;
      desVz = rightZ * ai.strafeSign * 4.6;
      boosterIntensity = isP2 ? 0.72 : 0.42;
      ai.shotTimer -= dt;
      attackProgress = 1 - ai.burstShotsLeft / (isP2 ? 7 : 5);
      if (ai.shotTimer <= 0 && ai.burstShotsLeft > 0) {
        ai.burstShotsLeft -= 1;
        ai.shotTimer = isP2 ? 0.105 : 0.135;
        rig.getMuzzleWorldPos(_muzzle);
        const losBlocked = raycastCollisionWorld3D(
          _muzzle.x,
          _muzzle.y,
          _muzzle.z,
          playerPos.x,
          playerPos.y + 1.15,
          playerPos.z,
          world,
          _rayHit
        );
        if (!losBlocked) {
          _dir
            .set(
              playerPos.x + (Math.random() - 0.5) * 0.4 - _muzzle.x,
              playerPos.y + 1.18 + (Math.random() - 0.5) * 0.22 - _muzzle.y,
              playerPos.z + (Math.random() - 0.5) * 0.4 - _muzzle.z
            )
            .normalize();
          const boltColor = isP2 ? 0xffc424 : 0xff3b52;
          callbacks.spawnProjectile({
            origin: _muzzle,
            direction: _dir,
            speed: isP2 ? 31 : 27,
            damage: 11,
            radius: 0.15,
            color: boltColor,
            kind: 'boss_overdrive',
            staggerStrength: 0.46,
          });
          callbacks.spawnMuzzleFlash(_muzzle, _dir, boltColor, isP2);
          callbacks.onFireAudio('boss_carbine');
        }
      }
      if (ai.burstShotsLeft <= 0) {
        state.behavior = 'strafe';
        ai.attackCooldown = isP2 ? 1.15 : 1.5;
        ai.strafeSign = -ai.strafeSign;
      }
    }
  } else if (state.behavior === 'recover') {
    ai.phaseTimer += dt;
    ai.airborneHeight = Math.max(0, ai.airborneHeight - dt * 5.0);
    spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 2.0, dt);
    boosterIntensity = 0.14;
    const recoverDur = ai.currentAttack === 'aerial_slam' ? 2.65 : 2.15;
    if (ai.phaseTimer >= recoverDur) {
      state.behavior = 'strafe';
      ai.phaseTimer = 0;
      ai.strafeSign = -ai.strafeSign;
    }
  } else {
    ai.airborneHeight = Math.max(0, ai.airborneHeight - dt * 6);
    spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.5, dt);

    if (dist > cfg.preferredMaxRange) {
      state.behavior = 'chase';
      desVx = fwdX * cfg.sprintSpeed + rightX * ai.strafeSign * 1.9;
      desVz = fwdZ * cfg.sprintSpeed + rightZ * ai.strafeSign * 1.9;
      boosterIntensity = isP2 ? 0.65 : 0.42;
    } else {
      state.behavior = 'strafe';
      const pushBack = dist < cfg.preferredMinRange ? -2.2 : 0.45;
      desVx = fwdX * pushBack + rightX * ai.strafeSign * cfg.moveSpeed;
      desVz = fwdZ * pushBack + rightZ * ai.strafeSign * cfg.moveSpeed;
    }

    if (ai.attackCooldown <= 0) {
      ai.cycleIndex += 1;
      // Overhead ceiling check before aerial moves so Kestrel never clips mezzanine slabs!
      const overheadBlocked = raycastCollisionWorld3D(
        spatial.x,
        spatial.y + 1.6,
        spatial.z,
        spatial.x,
        spatial.y + 4.4,
        spatial.z,
        world,
        _rayHit
      );
      ai.maxSafeHover = overheadBlocked
        ? Math.max(0.65, _rayHit.point.y - (spatial.y + 2.35))
        : 2.05;

      if (isP2 && ai.cycleIndex % 3 === 0) {
        ai.currentAttack = 'aerial_slam';
        ai.aerialVolleyFired = false;
        callbacks.onTelegraphAudio('boss_slam');
        if (rigExt.getVisorGlintWorldPos) {
          callbacks.spawnPerilGlint(rigExt.getVisorGlintWorldPos(_glintPos), 0xffd248);
        }
      } else if (isP2 && ai.cycleIndex % 3 === 2) {
        ai.currentAttack = 'wing_fan_barrage';
        callbacks.onTelegraphAudio('kestrel_overdrive');
      } else if (dist <= 10.2 && ai.cycleIndex % 2 === 1) {
        ai.currentAttack = 'jet_blade';
        callbacks.onTelegraphAudio('iaijutsu_glint');
        if (rigExt.getVisorGlintWorldPos) {
          callbacks.spawnPerilGlint(
            rigExt.getVisorGlintWorldPos(_glintPos),
            isP2 ? 0xffd248 : 0xff3b52
          );
        }
      } else if (!isP2 && ai.cycleIndex % 4 === 0 && dist <= 13.0) {
        ai.currentAttack = 'aerial_slam';
        ai.aerialVolleyFired = false;
        callbacks.onTelegraphAudio('boss_slam');
      } else {
        ai.currentAttack = 'carbine_burst';
      }
      state.behavior = 'windup';
      ai.phaseTimer = 0;
    }
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
    localMoveZ: 0.65,
    aimPitch: THREE.MathUtils.clamp((playerPos.y - spatial.y) / Math.max(4, dist), -0.35, 0.35),
    attackProgress,
    attackVariant: variant,
    flinchTimer: state.flinchTimer,
    flinchDirX: state.flinchDirX,
    staggerTimer: state.staggerTimer,
    deadProgress: 0,
    weakpointExposed: state.weakpoint.exposed,
    weakpointBroken: state.weakpoint.broken,
    shieldActive: false,
    phase: state.phase,
    airborneHeight: ai.airborneHeight,
    boosterIntensity,
  });
}
