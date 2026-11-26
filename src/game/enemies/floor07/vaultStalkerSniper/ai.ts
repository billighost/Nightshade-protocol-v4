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
import { VAULT_STALKER_SNIPER_CONFIG } from './config';
import { buildVaultStalkerSniperRig, type VaultStalkerRigHandle } from './mesh';
import {
  computeCloakDashVelocity,
  computeFlechetteFanDirections,
  selectStalkerAttack,
} from './tactics';

const F7_MIN_FLOOR_Y = F7_BASE_Y - 0.8;

type StalkerPhase =
  | 'reposition'
  | 'cloak_dash'
  | 'rail_lock'
  | 'rail_doubletap'
  | 'ambush_windup'
  | 'ambush_slash'
  | 'flechette_burst'
  | 'laser_sweep'
  | 'mine_lob'
  | 'recover';

interface StalkerAiState {
  phase: StalkerPhase;
  timer: number;
  dashVx: number;
  dashVz: number;
  flankSide: -1 | 1;
  slashCooldown: number;
  dashCooldown: number;
  mineCooldown: number;
  flechetteCooldown: number;
  sweepCooldown: number;
  railCooldown: number;
  cloakDisabledTimer: number;
  timeWithoutLos: number;
  lastHp: number;
  recentDamageTimer: number;
  sweepShotsLeft: number;
  sweepShotDelay: number;
  slashHitApplied: boolean;
  wasWeakpointBroken: boolean;
  patrolIdx: number;
}

const _muzzle = new THREE.Vector3();
const _aimDir = new THREE.Vector3();
const _glintPos = new THREE.Vector3();
const _thrusterPos = new THREE.Vector3();
const _exhaustDir = new THREE.Vector3();
const _handPos = new THREE.Vector3();
const _slashOrigin = new THREE.Vector3();
const _normalUp = new THREE.Vector3(0, 1, 0);
const _rayHit: WorldRaycastHit = {
  hit: false,
  t: 1,
  point: new THREE.Vector3(),
  normal: new THREE.Vector3(0, 1, 0),
};

export function createVaultStalkerSniperBrain(mats: Floor07EnemyMaterials): EnemyArchetypeBrain {
  return {
    config: VAULT_STALKER_SNIPER_CONFIG,
    createRig: (enemyId) => buildVaultStalkerSniperRig(enemyId, mats),
    createAiState: (): Record<string, unknown> => ({
      phase: 'reposition',
      timer: 0,
      dashVx: 0,
      dashVz: 0,
      flankSide: 1,
      slashCooldown: 0,
      dashCooldown: 0.4,
      mineCooldown: 1.5,
      flechetteCooldown: 0.6,
      sweepCooldown: 1.8,
      railCooldown: 0.9,
      cloakDisabledTimer: 0,
      timeWithoutLos: 0,
      lastHp: VAULT_STALKER_SNIPER_CONFIG.maxHp,
      recentDamageTimer: 0,
      sweepShotsLeft: 0,
      sweepShotDelay: 0,
      slashHitApplied: false,
      wasWeakpointBroken: false,
      patrolIdx: 0,
    }),
    stepAi: (ctx: EnemyAiStepContext) => {
      const ai = ctx.aiState as unknown as StalkerAiState;
      const rig = ctx.rig as VaultStalkerRigHandle;
      const { dt, elapsed, state, spatial, playerPos, world, callbacks } = ctx;
      const cfg = VAULT_STALKER_SNIPER_CONFIG;
      const phaseNum: 1 | 2 = state.phase === 2 ? 2 : 1;

      // Track recent damage for reactive Cloak-Flank evasion
      if (state.hp < ai.lastHp - 1) {
        ai.recentDamageTimer = 1.6;
        ai.lastHp = state.hp;
      } else {
        ai.recentDamageTimer = Math.max(0, ai.recentDamageTimer - dt);
      }

      // Shattering his Recon Visor Optic disables Active Camo Cloak-Dash for 5.5s!
      if (state.weakpoint.broken && !ai.wasWeakpointBroken) {
        ai.wasWeakpointBroken = true;
        ai.cloakDisabledTimer = 5.5;
      } else if (!state.weakpoint.broken) {
        ai.wasWeakpointBroken = false;
      }
      ai.cloakDisabledTimer = Math.max(0, ai.cloakDisabledTimer - dt);

      // Cooldown ticks
      ai.slashCooldown = Math.max(0, ai.slashCooldown - dt);
      ai.dashCooldown = Math.max(0, ai.dashCooldown - dt);
      ai.mineCooldown = Math.max(0, ai.mineCooldown - dt);
      ai.flechetteCooldown = Math.max(0, ai.flechetteCooldown - dt);
      ai.sweepCooldown = Math.max(0, ai.sweepCooldown - dt);
      ai.railCooldown = Math.max(0, ai.railCooldown - dt);

      if (state.staggerTimer > 0) {
        ai.phase = 'reposition';
        rig.setRailLaser(false, 1, 0);
        rig.setRailCharge(0);
        rig.setWristBladeActive(false, 0);
        rig.setCamoOpacity(1.0);
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
          phase: phaseNum,
          airborneHeight: 0,
        });
        return;
      }

      const dx = playerPos.x - spatial.x;
      const dy = playerPos.y + 1.25 - (spatial.y + 1.56);
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
          playerPos.y + 1.35,
          playerPos.z,
          world
        );

      if (hasLos || horizDist < 20) state.engaged = true;
      ai.timeWithoutLos = state.engaged && !hasLos ? ai.timeWithoutLos + dt : 0;

      let desVx = 0;
      let desVz = 0;
      let attackProgress = 0;
      let attackVariant = 0;
      let localMoveX = 0;
      let localMoveZ = 0;

      // Default visuals reset each step before phase overrides
      let laserOn = false;
      let laserLen = 1;
      let laserLock = 0;
      let railCharge = 0;
      let camoOpacity = 0.96;
      let wristBladeOn = false;
      let wristBladeGlow = 1;

      if (!state.engaged) {
        state.behavior = 'patrol';
        const pt = ctx.patrolPoints[ai.patrolIdx % ctx.patrolPoints.length];
        const px = pt.x - spatial.x;
        const pz = pt.z - spatial.z;
        const pDist = Math.hypot(px, pz);
        if (pDist < 0.85 && ctx.patrolPoints.length > 1) {
          ai.patrolIdx = (ai.patrolIdx + 1) % ctx.patrolPoints.length;
        } else if (pDist > 0.25) {
          desVx = (px / pDist) * cfg.moveSpeed * 0.48;
          desVz = (pz / pDist) * cfg.moveSpeed * 0.48;
          spatial.yaw = rotateYawTowards(
            spatial.yaw,
            computeFacingYaw(spatial.x, spatial.z, pt.x, pt.z),
            4.6,
            dt
          );
        }
      } else {
        const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);
        const dirX = horizDist > 0.01 ? dx / horizDist : 0;
        const dirZ = horizDist > 0.01 ? dz / horizDist : 1;
        const rightX = -dirZ;
        const rightZ = dirX;

        if (ai.phase === 'reposition') {
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 7.4, dt);

          const choice = selectStalkerAttack({
            horizDist,
            vertDist,
            hasLos,
            phase: phaseNum,
            cloakDisabled: ai.cloakDisabledTimer > 0,
            timeWithoutLos: ai.timeWithoutLos,
            recentlyDamaged: ai.recentDamageTimer > 0,
            slashCooldown: ai.slashCooldown,
            dashCooldown: ai.dashCooldown,
            mineCooldown: ai.mineCooldown,
            flechetteCooldown: ai.flechetteCooldown,
            sweepCooldown: ai.sweepCooldown,
            railCooldown: ai.railCooldown,
            roll: Math.random(),
          });

          if (choice === 'phantom_ambush_slash') {
            ai.phase = 'ambush_windup';
            ai.timer = phaseNum === 2 ? 0.34 : 0.42;
            ai.slashHitApplied = false;
            callbacks.onTelegraphAudio('iaijutsu_glint');
            rig.getWeakpointWorldPos(_glintPos);
            callbacks.spawnPerilGlint(_glintPos, phaseNum === 2 ? 0xff2848 : 0x28f0ff);
          } else if (choice === 'cloak_flank_dash') {
            ai.phase = 'cloak_dash';
            ai.timer = phaseNum === 2 ? 0.68 : 0.76;
            ai.flankSide = Math.random() < 0.5 ? -1 : 1;
            const retreatBias = horizDist < 10.5 ? 0.74 : 0.15;
            const dash = computeCloakDashVelocity(
              spatial.x,
              spatial.z,
              playerPos.x,
              playerPos.z,
              ai.flankSide,
              retreatBias,
              phaseNum
            );
            ai.dashVx = dash.vx;
            ai.dashVz = dash.vz;
            callbacks.onTelegraphAudio('dash');
            rig.getSpineThrusterWorldPos(_thrusterPos);
            _exhaustDir.set(-dash.vx, 0.25, -dash.vz).normalize();
            callbacks.spawnBoosterBurst(_thrusterPos, _exhaustDir, 0x28f0ff, 18);
          } else if (choice === 'cryo_arc_flush_mine') {
            ai.phase = 'mine_lob';
            ai.timer = 0.54;
            callbacks.onTelegraphAudio('mortar');
          } else if (choice === 'flechette_scatter_burst') {
            ai.phase = 'flechette_burst';
            ai.timer = 0.42;
            callbacks.onTelegraphAudio('rail_charge');
          } else if (choice === 'laser_sweep_barrage') {
            ai.phase = 'laser_sweep';
            ai.sweepShotsLeft = phaseNum === 2 ? 4 : 3;
            ai.sweepShotDelay = 0.24;
            ai.timer = 0.36;
            callbacks.onTelegraphAudio('rail_charge');
            rig.getWeakpointWorldPos(_glintPos);
            callbacks.spawnPerilGlint(_glintPos, 0x38e8ff);
          } else if (choice === 'rail_sniper_lock') {
            ai.phase = 'rail_lock';
            ai.timer = phaseNum === 2 ? 0.92 : 1.08;
            callbacks.onTelegraphAudio('rail_charge');
            rig.getWeakpointWorldPos(_glintPos);
            callbacks.spawnPerilGlint(_glintPos, 0x28f0ff);
            ctx.exposeWeakpoint(1.5);
          } else if (!hasLos || horizDist > cfg.preferredMaxRange) {
            state.behavior = 'chase';
            desVx = dirX * cfg.moveSpeed;
            desVz = dirZ * cfg.moveSpeed;
          } else {
            state.behavior = 'strafe';
            desVx = rightX * ai.flankSide * cfg.moveSpeed * 0.72;
            desVz = rightZ * ai.flankSide * cfg.moveSpeed * 0.72;
            localMoveX = ai.flankSide * 0.7;
          }
        } else if (ai.phase === 'cloak_dash') {
          state.behavior = 'strafe';
          attackVariant = 2;
          camoOpacity = ai.cloakDisabledTimer > 0 ? 0.95 : 0.24;
          ai.timer -= dt;
          desVx = ai.dashVx;
          desVz = ai.dashVz;
          localMoveX = ai.flankSide * 1.1;
          localMoveZ = 0.6;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.2, dt);

          if (Math.random() < dt * 14) {
            rig.getSpineThrusterWorldPos(_thrusterPos);
            _exhaustDir.set(-ai.dashVx, 0.15, -ai.dashVz).normalize();
            callbacks.spawnBoosterBurst(_thrusterPos, _exhaustDir, 0x28f0ff, 6);
          }
          if (ai.timer <= 0) {
            ai.dashCooldown = phaseNum === 2 ? 3.2 : 4.2;
            ai.phase = 'reposition';
          }
        } else if (ai.phase === 'ambush_windup') {
          state.behavior = 'windup';
          attackVariant = 1;
          wristBladeOn = true;
          wristBladeGlow = 1.4;
          const total = phaseNum === 2 ? 0.34 : 0.42;
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / total);
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 10.0, dt);
          if (ai.timer <= 0) {
            ai.phase = 'ambush_slash';
            ai.timer = 0.34;
            callbacks.onKatanaSlashAudio?.(true);
          }
        } else if (ai.phase === 'ambush_slash') {
          state.behavior = 'attack';
          attackVariant = 1;
          wristBladeOn = true;
          wristBladeGlow = 2.0;
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / 0.34);

          // Fast forward lunge across the player!
          desVx = dirX * 12.2;
          desVz = dirZ * 12.2;

          if (!ai.slashHitApplied && attackProgress >= 0.35) {
            ai.slashHitApplied = true;
            const fwdX = -Math.sin(spatial.yaw);
            const fwdZ = -Math.cos(spatial.yaw);
            _slashOrigin.set(
              spatial.x + fwdX * 0.72,
              spatial.y + 1.24,
              spatial.z + fwdZ * 0.72
            );
            callbacks.spawnBladeSlashArc(
              _slashOrigin,
              spatial.yaw,
              -0.22,
              0.08,
              2.8,
              phaseNum === 2 ? 0xff2c58 : 0x28f0ff,
              true,
              1
            );
            callbacks.spawnSurfaceSlashScar(
              _handPos.set(spatial.x + fwdX * 1.45, spatial.y + 0.04, spatial.z + fwdZ * 1.45),
              _normalUp,
              _aimDir.set(fwdX, 0, fwdZ).normalize(),
              true
            );
            if (horizDist <= 3.6 && vertDist <= 2.1 && !ctx.playerRolling) {
              callbacks.applyPlayerMeleeHit(24, _slashOrigin, 0.85);
            }
          }

          if (ai.timer <= 0) {
            ai.slashCooldown = 3.8;
            // Immediately slip into an evasive Cloak-Flank Dash back out to sniper range if cloak intact!
            if (ai.cloakDisabledTimer <= 0) {
              ai.phase = 'cloak_dash';
              ai.timer = 0.62;
              ai.flankSide = Math.random() < 0.5 ? -1 : 1;
              const dash = computeCloakDashVelocity(
                spatial.x,
                spatial.z,
                playerPos.x,
                playerPos.z,
                ai.flankSide,
                0.85,
                phaseNum
              );
              ai.dashVx = dash.vx;
              ai.dashVz = dash.vz;
              callbacks.onTelegraphAudio('dash');
            } else {
              ai.phase = 'recover';
              ai.timer = 0.45;
            }
          }
        } else if (ai.phase === 'mine_lob') {
          state.behavior = 'windup';
          attackVariant = 4;
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / 0.54);
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 5.2, dt);

          if (ai.timer <= 0) {
            rig.getMineHandWorldPos(_handPos);
            callbacks.onFireAudio('mortar');
            const mineCount = phaseNum === 2 ? 2 : 1;
            for (let m = 0; m < mineCount; m++) {
              const lateral = mineCount === 2 ? (m === 0 ? -1.45 : 1.45) : 0;
              const tx = playerPos.x + rightX * lateral;
              const tz = playerPos.z + rightZ * lateral;
              const arc = computeBallisticMortarArc(
                _handPos.x,
                _handPos.y,
                _handPos.z,
                tx,
                playerPos.y,
                tz,
                16.2
              );
              const spd = Math.hypot(arc.vx, arc.vy, arc.vz) || 1;
              _aimDir.set(arc.vx / spd, arc.vy / spd, arc.vz / spd);
              callbacks.spawnMuzzleFlash(_handPos, _aimDir, 0x38e8ff, false);
              callbacks.spawnProjectile({
                origin: _handPos.clone(),
                direction: _aimDir.clone(),
                speed: spd,
                damage: 20,
                radius: 0.19,
                color: 0x28e8ff,
                kind: 'mortar_canister',
                gravity: 16.2,
                splashRadius: 3.25,
                targetPos: new THREE.Vector3(tx, playerPos.y + 0.04, tz),
                staggerStrength: 0.65,
              });
            }
            ai.mineCooldown = phaseNum === 2 ? 5.2 : 6.4;
            ai.phase = 'reposition';
          }
        } else if (ai.phase === 'flechette_burst') {
          state.behavior = 'attack';
          attackVariant = 3;
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / 0.42);
          railCharge = 0.55;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.8, dt);

          // Step backward + laterally while snap-firing magnetized flechettes
          desVx = (-dirX * 0.5 + rightX * ai.flankSide * 0.75) * cfg.moveSpeed * 0.85;
          desVz = (-dirZ * 0.5 + rightZ * ai.flankSide * 0.75) * cfg.moveSpeed * 0.85;

          if (ai.timer <= 0) {
            rig.getMuzzleWorldPos(_muzzle);
            const pitch = Math.atan2(playerPos.y + 1.2 - _muzzle.y, Math.max(1, horizDist));
            const fan = computeFlechetteFanDirections(spatial.yaw, pitch, phaseNum);
            callbacks.onFireAudio('shotgun');
            for (const f of fan) {
              _aimDir.set(f.x, f.y, f.z);
              callbacks.spawnMuzzleFlash(_muzzle, _aimDir, 0x38e8ff, false);
              callbacks.spawnProjectile({
                origin: _muzzle.clone(),
                direction: _aimDir.clone(),
                speed: 38,
                damage: 11,
                radius: 0.13,
                color: phaseNum === 2 ? 0xff4668 : 0x38e8ff,
                kind: 'shotgun_pellet',
                staggerStrength: 0.26,
              });
            }
            ai.flechetteCooldown = phaseNum === 2 ? 3.4 : 4.4;
            ai.phase = 'reposition';
          }
        } else if (ai.phase === 'laser_sweep') {
          state.behavior = 'attack';
          attackVariant = 0;
          ai.sweepShotDelay -= dt;
          railCharge = 0.78;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 4.8, dt);

          rig.getMuzzleWorldPos(_muzzle);
          const rayDist = Math.min(34, Math.max(4, horizDist + 5));
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
          laserOn = true;
          laserLen = hitWall ? _muzzle.distanceTo(_rayHit.point) : rayDist;
          laserLock = 0.65;

          if (ai.sweepShotDelay <= 0 && ai.sweepShotsLeft > 0) {
            const total = phaseNum === 2 ? 4 : 3;
            const idx = total - ai.sweepShotsLeft;
            const sweepOffset = (idx - (total - 1) * 0.5) * 0.85;
            ai.sweepShotsLeft -= 1;
            ai.sweepShotDelay = 0.24;

            _aimDir
              .set(
                playerPos.x + rightX * sweepOffset - _muzzle.x,
                playerPos.y + 1.22 - _muzzle.y,
                playerPos.z + rightZ * sweepOffset - _muzzle.z
              )
              .normalize();
            callbacks.spawnMuzzleFlash(_muzzle, _aimDir, 0x38e8ff, true);
            callbacks.onFireAudio('rifle');
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _aimDir.clone(),
              speed: 52,
              damage: 16,
              radius: 0.14,
              color: phaseNum === 2 ? 0xff3b5c : 0x38e8ff,
              kind: 'plasma_bolt',
              staggerStrength: 0.34,
            });
          }

          if (ai.sweepShotsLeft <= 0) {
            ai.sweepCooldown = phaseNum === 2 ? 5.2 : 6.6;
            ai.phase = 'recover';
            ai.timer = 0.42;
          }
        } else if (ai.phase === 'rail_lock' || ai.phase === 'rail_doubletap') {
          state.behavior = 'windup';
          attackVariant = 0;
          camoOpacity = 1.0;
          ai.timer -= dt;
          const lockDuration =
            ai.phase === 'rail_doubletap' ? 0.38 : phaseNum === 2 ? 0.92 : 1.08;
          const lockRatio = 1 - Math.max(0, ai.timer / lockDuration);
          attackProgress = lockRatio;
          railCharge = lockRatio;

          // Slower tracking in the final 0.26s so dodging feels razor-sharp & fair!
          spatial.yaw = rotateYawTowards(
            spatial.yaw,
            targetYaw,
            lockRatio > 0.74 ? 1.85 : 6.8,
            dt
          );

          rig.getMuzzleWorldPos(_muzzle);
          const rayDist = Math.min(36, Math.max(4, horizDist + 6));
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
          laserOn = true;
          laserLen = hitWall ? _muzzle.distanceTo(_rayHit.point) : rayDist;
          laserLock = lockRatio;

          if (ai.timer <= 0) {
            laserOn = false;
            _aimDir
              .set(
                playerPos.x - _muzzle.x,
                playerPos.y + 1.24 - _muzzle.y,
                playerPos.z - _muzzle.z
              )
              .normalize();
            callbacks.spawnMuzzleFlash(
              _muzzle,
              _aimDir,
              phaseNum === 2 ? 0xff2846 : 0x38e8ff,
              true
            );
            callbacks.onFireAudio('rail_slug');
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _aimDir.clone(),
              speed: phaseNum === 2 ? 70 : 64,
              damage: ai.phase === 'rail_doubletap' ? 22 : 30,
              radius: 0.17,
              color: phaseNum === 2 ? 0xff2846 : 0x38e8ff,
              kind: 'rail_slug',
              staggerStrength: 0.78,
            });

            // Phase 2 Phantom Overdrive fires a lethal Double-Tap Rail Salvo!
            if (phaseNum === 2 && ai.phase === 'rail_lock') {
              ai.phase = 'rail_doubletap';
              ai.timer = 0.38;
              callbacks.onTelegraphAudio('rail_charge');
            } else {
              ai.railCooldown = phaseNum === 2 ? 2.4 : 3.0;
              if (ai.cloakDisabledTimer <= 0) {
                ai.phase = 'cloak_dash';
                ai.timer = 0.66;
                ai.flankSide = Math.random() < 0.5 ? -1 : 1;
                const dash = computeCloakDashVelocity(
                  spatial.x,
                  spatial.z,
                  playerPos.x,
                  playerPos.z,
                  ai.flankSide,
                  0.2,
                  phaseNum
                );
                ai.dashVx = dash.vx;
                ai.dashVz = dash.vz;
                callbacks.onTelegraphAudio('dash');
              } else {
                ai.phase = 'recover';
                ai.timer = 0.55;
              }
            }
          }
        } else if (ai.phase === 'recover') {
          state.behavior = 'recover';
          ai.timer -= dt;
          if (ai.timer <= 0) ai.phase = 'reposition';
        }
      }

      rig.setRailLaser(laserOn, laserLen, laserLock);
      rig.setRailCharge(railCharge);
      rig.setCamoOpacity(camoOpacity);
      rig.setWristBladeActive(wristBladeOn, wristBladeGlow);

      stepEnemyMovement(
        spatial,
        desVx + ctx.separation.x * 1.8,
        desVz + ctx.separation.y * 1.8,
        world,
        dt,
        F7_MIN_FLOOR_Y
      );

      const speed = Math.hypot(spatial.vx, spatial.vz);
      const aimPitch = Math.atan2(dy, Math.max(1, horizDist));
      rig.updateAnimation({
        dt,
        elapsed,
        behavior: state.behavior,
        speedRatio: speed / cfg.moveSpeed,
        localMoveX,
        localMoveZ: localMoveZ || speed / cfg.moveSpeed,
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
        phase: phaseNum,
        airborneHeight: 0,
      });
    },
  };
}
