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
import { GRAPPLE_LANCE_DUELIST_CONFIG } from './config';
import { buildGrappleLanceDuelistRig, type GrappleDuelistRigHandle } from './mesh';
import {
  computePlasmaArcDirections,
  computeTetherZipVelocity,
  selectDuelistAttack,
} from './tactics';
import { createGrappleDuelistTextures } from './textures';

const F7_MIN_FLOOR_Y = F7_BASE_Y - 0.8;

type DuelistPhase =
  | 'approach'
  | 'zip_windup'
  | 'zip_lunge'
  | 'slash1_windup'
  | 'slash1_active'
  | 'slash2_windup'
  | 'slash2_active'
  | 'vault_rise'
  | 'vault_slam'
  | 'wave_windup'
  | 'wave_active'
  | 'feint_dash'
  | 'recover';

interface DuelistAiState {
  phase: DuelistPhase;
  timer: number;
  zipCooldown: number;
  slamCooldown: number;
  waveCooldown: number;
  feintCooldown: number;
  comboCooldown: number;
  hitApplied: boolean;
  dirX: number;
  dirZ: number;
  strafeSign: number;
  patrolIdx: number;
  lastHp: number;
  damageReactTimer: number;
  prevPlayerX: number;
  prevPlayerZ: number;
  hasPrevPlayer: boolean;
}

const _origin = new THREE.Vector3();
const _glint = new THREE.Vector3();
const _muzzle = new THREE.Vector3();
const _exhaustDir = new THREE.Vector3();
const _nozzle = new THREE.Vector3();
const _dirVec = new THREE.Vector3();
const _rayHit = { hit: false, point: new THREE.Vector3(), normal: new THREE.Vector3(), t: 1 };

export function createGrappleLanceDuelistBrain(mats: Floor07EnemyMaterials): EnemyArchetypeBrain {
  // Share one high-res procedural PBR texture suite across all Floor 07 Grapple-Lance Duelists
  const sharedTextures = createGrappleDuelistTextures();

  return {
    config: GRAPPLE_LANCE_DUELIST_CONFIG,
    createRig: (enemyId) => buildGrappleLanceDuelistRig(enemyId, mats, sharedTextures),
    createAiState: (): Record<string, unknown> => ({
      phase: 'approach',
      timer: 0,
      zipCooldown: 1.8 + Math.random() * 1.4,
      slamCooldown: 3.2 + Math.random() * 1.6,
      waveCooldown: 2.6 + Math.random() * 1.5,
      feintCooldown: 1.5 + Math.random() * 1.2,
      comboCooldown: 0,
      hitApplied: false,
      dirX: 0,
      dirZ: 1,
      strafeSign: Math.random() < 0.5 ? -1 : 1,
      patrolIdx: 0,
      lastHp: GRAPPLE_LANCE_DUELIST_CONFIG.maxHp,
      damageReactTimer: 0,
      prevPlayerX: 0,
      prevPlayerZ: 0,
      hasPrevPlayer: false,
    }),
    stepAi: (ctx: EnemyAiStepContext) => {
      const ai = ctx.aiState as unknown as DuelistAiState;
      const rig = ctx.rig as GrappleDuelistRigHandle;
      const { dt, elapsed, state, spatial, playerPos, world, callbacks } = ctx;
      const cfg = GRAPPLE_LANCE_DUELIST_CONFIG;

      // Track player lateral velocity for smart lead prediction
      let playerVx = 0;
      let playerVz = 0;
      if (ai.hasPrevPlayer && dt > 0.0005) {
        playerVx = THREE.MathUtils.clamp((playerPos.x - ai.prevPlayerX) / dt, -14, 14);
        playerVz = THREE.MathUtils.clamp((playerPos.z - ai.prevPlayerZ) / dt, -14, 14);
      }
      ai.prevPlayerX = playerPos.x;
      ai.prevPlayerZ = playerPos.z;
      ai.hasPrevPlayer = true;

      // Detect incoming damage to trigger aggressive reactive feint dashes
      if (state.hp < ai.lastHp - 1) {
        ai.damageReactTimer = 0.65;
        state.engaged = true;
      }
      ai.lastHp = state.hp;
      ai.damageReactTimer = Math.max(0, ai.damageReactTimer - dt);

      // Tick cooldowns
      ai.zipCooldown = Math.max(0, ai.zipCooldown - dt);
      ai.slamCooldown = Math.max(0, ai.slamCooldown - dt);
      ai.waveCooldown = Math.max(0, ai.waveCooldown - dt);
      ai.feintCooldown = Math.max(0, ai.feintCooldown - dt);
      ai.comboCooldown = Math.max(0, ai.comboCooldown - dt);

      if (state.staggerTimer > 0) {
        ai.phase = 'approach';
        rig.setTetherCable(false, 0, 0);
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
          boosterIntensity: 0,
        });
        return;
      }

      const dx = playerPos.x - spatial.x;
      const dz = playerPos.z - spatial.z;
      const dy = playerPos.y - spatial.y;
      const vertDist = Math.abs(dy);
      const horizDist = Math.hypot(dx, dz);
      const hasLos =
        horizDist <= cfg.detectRange &&
        hasEnemyLineOfSight(
          spatial.x,
          spatial.y + 1.5,
          spatial.z,
          playerPos.x,
          playerPos.y + 1.3,
          playerPos.z,
          world
        );

      if (hasLos || horizDist < 15) state.engaged = true;

      let desVx = 0;
      let desVz = 0;
      let attackProgress = 0;
      let attackVariant = 0;
      let airborneHeight = 0;
      let boosterIntensity = 0;
      let cableActive = false;
      let cableLen = 0;
      let cableTension = 0;

      if (!state.engaged) {
        state.behavior = 'patrol';
        const pt = ctx.patrolPoints[ai.patrolIdx % ctx.patrolPoints.length];
        const px = pt.x - spatial.x;
        const pz = pt.z - spatial.z;
        const pDist = Math.hypot(px, pz);
        if (pDist < 0.7 && ctx.patrolPoints.length > 1) {
          ai.patrolIdx = (ai.patrolIdx + 1) % ctx.patrolPoints.length;
        } else if (pDist > 0.25) {
          desVx = (px / pDist) * cfg.moveSpeed * 0.48;
          desVz = (pz / pDist) * cfg.moveSpeed * 0.48;
          spatial.yaw = rotateYawTowards(
            spatial.yaw,
            computeFacingYaw(spatial.x, spatial.z, pt.x, pt.z),
            4.5,
            dt
          );
        }
      } else {
        const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);
        const dirX = horizDist > 0.01 ? dx / horizDist : -Math.sin(spatial.yaw);
        const dirZ = horizDist > 0.01 ? dz / horizDist : -Math.cos(spatial.yaw);
        const rightX = -dirZ;
        const rightZ = dirX;

        if (ai.phase === 'approach') {
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.2, dt);

          const decision = selectDuelistAttack({
            horizDist,
            vertDist,
            hasLos,
            hasAttackToken: ctx.hasAttackToken,
            winchBroken: state.weakpoint.broken,
            recentlyDamaged: ai.damageReactTimer > 0,
            zipCooldown: ai.zipCooldown,
            slamCooldown: ai.slamCooldown,
            waveCooldown: ai.waveCooldown,
            feintCooldown: ai.feintCooldown,
            comboCooldown: ai.comboCooldown,
            roll: Math.random(),
          });

          if (decision === 'lance_flurry_combo') {
            ai.phase = 'slash1_windup';
            ai.timer = 0.34;
            ai.hitApplied = false;
            ai.comboCooldown = 1.6;
            callbacks.onTelegraphAudio('melee');
            rig.getLanceTipWorldPos(_glint);
            callbacks.spawnPerilGlint(_glint, 0xff5a20);
          } else if (decision === 'tether_zip_lunge') {
            ai.phase = 'zip_windup';
            ai.timer = 0.44;
            ai.dirX = dirX;
            ai.dirZ = dirZ;
            callbacks.onTelegraphAudio('dash');
            rig.getWeakpointWorldPos(_glint);
            callbacks.spawnPerilGlint(_glint, 0x38e8ff);
            ctx.exposeWeakpoint(3.0);
          } else if (decision === 'vault_shock_slam') {
            ai.phase = 'vault_rise';
            ai.timer = 0.48;
            ai.hitApplied = false;
            ai.slamCooldown = 6.2 + Math.random() * 2.0;
            ai.dirX = dirX;
            ai.dirZ = dirZ;
            callbacks.onTelegraphAudio('booster_burst');
            rig.getLanceTipWorldPos(_glint);
            callbacks.spawnPerilGlint(_glint, 0xff7a1a);
          } else if (decision === 'plasma_arc_wave') {
            ai.phase = 'wave_windup';
            ai.timer = 0.42;
            ai.hitApplied = false;
            ai.waveCooldown = 4.6 + Math.random() * 1.8;
            callbacks.onTelegraphAudio('iaijutsu_glint');
            rig.getLanceTipWorldPos(_glint);
            callbacks.spawnPerilGlint(_glint, 0xff6220);
          } else if (decision === 'evasive_sidestep_feint') {
            ai.phase = 'feint_dash';
            ai.timer = 0.34;
            ai.feintCooldown = 3.8 + Math.random() * 1.6;
            ai.strafeSign *= -1;
            ai.dirX = rightX * ai.strafeSign * 0.92 + dirX * 0.38;
            ai.dirZ = rightZ * ai.strafeSign * 0.92 + dirZ * 0.38;
            const dLen = Math.hypot(ai.dirX, ai.dirZ) || 1;
            ai.dirX /= dLen;
            ai.dirZ /= dLen;
            callbacks.onTelegraphAudio('booster_burst');
            rig.getBoosterNozzleWorldPos(-1, _nozzle);
            callbacks.spawnBoosterBurst(
              _nozzle,
              _exhaustDir.set(-ai.dirX, -0.25, -ai.dirZ).normalize(),
              0x3ae8ff,
              6
            );
            rig.getBoosterNozzleWorldPos(1, _nozzle);
            callbacks.spawnBoosterBurst(_nozzle, _exhaustDir, 0x3ae8ff, 6);
          } else {
            state.behavior = 'chase';
            desVx = dirX * cfg.sprintSpeed + rightX * ai.strafeSign * 2.5;
            desVz = dirZ * cfg.sprintSpeed + rightZ * ai.strafeSign * 2.5;
          }
        } else if (ai.phase === 'zip_windup') {
          state.behavior = 'windup';
          attackVariant = 2;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 10.0, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / 0.44);
          boosterIntensity = 0.45 + attackProgress * 0.45;

          // Shoot live wall-clipped magnetic grapple cable straight out of left Grapple-Claw!
          rig.getGrappleMuzzleWorldPos(_muzzle);
          const targetX = playerPos.x + playerVx * 0.16;
          const targetY = playerPos.y + 1.15;
          const targetZ = playerPos.z + playerVz * 0.16;
          const hitWall = raycastCollisionWorld3D(
            _muzzle.x,
            _muzzle.y,
            _muzzle.z,
            targetX,
            targetY,
            targetZ,
            world,
            _rayHit
          );
          const fullLen = hitWall
            ? _muzzle.distanceTo(_rayHit.point)
            : Math.hypot(targetX - _muzzle.x, targetY - _muzzle.y, targetZ - _muzzle.z);
          cableActive = true;
          cableLen = fullLen * Math.min(1, attackProgress * 1.45);
          cableTension = attackProgress;

          if (ai.timer <= 0) {
            ai.phase = 'zip_lunge';
            ai.timer = 0.44;
            ai.zipCooldown = 5.6 + Math.random() * 2.0;
            const zVel = computeTetherZipVelocity(
              spatial.x,
              spatial.z,
              playerPos.x + playerVx * 0.14,
              playerPos.z + playerVz * 0.14,
              19.5
            );
            const len = Math.hypot(zVel.vx, zVel.vz) || 1;
            ai.dirX = zVel.vx / len;
            ai.dirZ = zVel.vz / len;
            callbacks.onTelegraphAudio('booster_burst');
          }
        } else if (ai.phase === 'zip_lunge') {
          state.behavior = 'attack';
          attackVariant = 2;
          ai.timer -= dt;
          const p = 1 - Math.max(0, ai.timer / 0.44);
          attackProgress = p;
          airborneHeight = Math.sin(p * Math.PI) * 0.68;
          boosterIntensity = 1.2;
          desVx = ai.dirX * 19.5;
          desVz = ai.dirZ * 19.5;

          // Keep taut magnetic cable visibly reeling in during zip flight!
          cableActive = true;
          cableLen = Math.max(0.8, horizDist - 0.6);
          cableTension = 1.0;

          if (Math.random() < 0.45) {
            rig.getBoosterNozzleWorldPos(Math.random() < 0.5 ? -1 : 1, _nozzle);
            callbacks.spawnBoosterBurst(
              _nozzle,
              _exhaustDir.set(-ai.dirX, -0.35, -ai.dirZ).normalize(),
              0x3ae8ff,
              3
            );
          }

          if (horizDist <= 3.15 || ai.timer <= 0) {
            ai.phase = 'slash1_windup';
            ai.timer = 0.2;
            ai.hitApplied = false;
            callbacks.onTelegraphAudio('melee');
          }
        } else if (ai.phase === 'slash1_windup') {
          state.behavior = 'windup';
          attackVariant = 0;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 10.5, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / 0.34);
          if (ai.timer <= 0) {
            ai.phase = 'slash1_active';
            ai.timer = 0.24;
            callbacks.onKatanaSlashAudio?.(false);
            _origin.set(spatial.x, spatial.y + 1.28, spatial.z);
            callbacks.spawnBladeSlashArc(
              _origin,
              spatial.yaw,
              0.38,
              0.08,
              2.65,
              0xff5a20,
              true,
              1
            );
          }
        } else if (ai.phase === 'slash1_active') {
          state.behavior = 'attack';
          attackVariant = 0;
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / 0.24);
          desVx = -Math.sin(spatial.yaw) * 5.2;
          desVz = -Math.cos(spatial.yaw) * 5.2;
          if (!ai.hitApplied && attackProgress > 0.28 && horizDist <= 3.65 && vertDist < 2.2) {
            ai.hitApplied = true;
            _origin.set(spatial.x, spatial.y + 1.2, spatial.z);
            callbacks.applyPlayerMeleeHit(18, _origin, 0.55);
          }
          if (ai.timer <= 0) {
            // Chain immediately into Hit 2 (Spinning Reverse Horizontal Reap!) if still in range
            if (horizDist <= 4.6 && vertDist < 2.4) {
              ai.phase = 'slash2_windup';
              ai.timer = 0.22;
              ai.hitApplied = false;
              callbacks.onTelegraphAudio('melee');
            } else {
              ai.phase = 'recover';
              ai.timer = 0.56;
              ai.strafeSign *= -1;
            }
          }
        } else if (ai.phase === 'slash2_windup') {
          state.behavior = 'windup';
          attackVariant = 1;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 11.0, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / 0.22);
          if (ai.timer <= 0) {
            ai.phase = 'slash2_active';
            ai.timer = 0.26;
            callbacks.onKatanaSlashAudio?.(true);
            _origin.set(spatial.x, spatial.y + 1.18, spatial.z);
            callbacks.spawnBladeSlashArc(
              _origin,
              spatial.yaw,
              -0.22,
              0.04,
              2.85,
              0xff3818,
              true,
              -1
            );
          }
        } else if (ai.phase === 'slash2_active') {
          state.behavior = 'attack';
          attackVariant = 1;
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / 0.26);
          desVx = -Math.sin(spatial.yaw) * 6.0;
          desVz = -Math.cos(spatial.yaw) * 6.0;
          if (!ai.hitApplied && attackProgress > 0.3 && horizDist <= 3.85 && vertDist < 2.2) {
            ai.hitApplied = true;
            _origin.set(spatial.x, spatial.y + 1.18, spatial.z);
            callbacks.applyPlayerMeleeHit(24, _origin, 0.72);
          }
          if (ai.timer <= 0) {
            ai.phase = 'recover';
            ai.timer = 0.74;
            ai.strafeSign *= -1;
            ctx.exposeWeakpoint(1.5);
          }
        } else if (ai.phase === 'vault_rise') {
          state.behavior = 'windup';
          attackVariant = 3;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 9.0, dt);
          ai.timer -= dt;
          const p = 1 - Math.max(0, ai.timer / 0.48);
          attackProgress = p;
          airborneHeight = Math.sin(p * Math.PI * 0.5) * 1.85;
          boosterIntensity = 1.05;
          desVx = ai.dirX * 8.2;
          desVz = ai.dirZ * 8.2;

          if (ai.timer <= 0) {
            ai.phase = 'vault_slam';
            ai.timer = 0.3;
            ai.hitApplied = false;
            callbacks.onTelegraphAudio('boss_slam');
          }
        } else if (ai.phase === 'vault_slam') {
          state.behavior = 'attack';
          attackVariant = 3;
          ai.timer -= dt;
          const p = 1 - Math.max(0, ai.timer / 0.3);
          attackProgress = p;
          airborneHeight = Math.max(0, (1 - p * 1.65) * 1.85);
          desVx = ai.dirX * 4.5 * (1 - p);
          desVz = ai.dirZ * 4.5 * (1 - p);

          if (!ai.hitApplied && p >= 0.52) {
            ai.hitApplied = true;
            const impactX = spatial.x - Math.sin(spatial.yaw) * 0.95;
            const impactZ = spatial.z - Math.cos(spatial.yaw) * 0.95;
            _origin.set(impactX, spatial.y + 0.08, impactZ);
            callbacks.spawnShockwave({
              center: _origin.clone(),
              maxRadius: 4.8,
              expandSpeed: 13.5,
              damage: 26,
              color: 0xff5a18,
              staggerStrength: 0.78,
            });
            callbacks.spawnImpactVfx(_origin, false, true);
            callbacks.onKatanaSlashAudio?.(true);
            ctx.exposeWeakpoint(1.8);
          }
          if (ai.timer <= 0) {
            ai.phase = 'recover';
            ai.timer = 0.72;
            ai.strafeSign *= -1;
          }
        } else if (ai.phase === 'wave_windup') {
          state.behavior = 'windup';
          attackVariant = 4;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 10.0, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / 0.42);
          if (ai.timer <= 0) {
            ai.phase = 'wave_active';
            ai.timer = 0.28;
            callbacks.onKatanaSlashAudio?.(true);
            callbacks.onFireAudio('rail_slug');
            _origin.set(spatial.x, spatial.y + 1.24, spatial.z);
            callbacks.spawnBladeSlashArc(
              _origin,
              spatial.yaw,
              0.08,
              0.02,
              2.6,
              0xff6a1a,
              true,
              1
            );

            // Launch 3-bolt crescent plasma energy wave fan aimed with strafe lead prediction!
            rig.getLanceTipWorldPos(_muzzle);
            const tLead = Math.min(0.28, horizDist / 34);
            const leadX = playerPos.x + playerVx * tLead;
            const leadZ = playerPos.z + playerVz * tLead;
            const leadYaw = computeFacingYaw(spatial.x, spatial.z, leadX, leadZ);
            const pitch = Math.atan2(
              playerPos.y + 1.18 - _muzzle.y,
              Math.max(1.5, Math.hypot(leadX - _muzzle.x, leadZ - _muzzle.z))
            );
            const dirs = computePlasmaArcDirections(leadYaw, pitch, 0.165);
            for (const d of dirs) {
              _dirVec.set(d.x, d.y, d.z);
              callbacks.spawnProjectile({
                origin: _muzzle.clone(),
                direction: _dirVec.clone(),
                speed: 33,
                damage: 14,
                radius: 0.18,
                color: 0xff5a18,
                kind: 'plasma_bolt',
                staggerStrength: 0.35,
              });
            }
            callbacks.spawnMuzzleFlash(_muzzle, _dirVec, 0xff6a1a, true);
          }
        } else if (ai.phase === 'wave_active') {
          state.behavior = 'attack';
          attackVariant = 4;
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / 0.28);
          if (ai.timer <= 0) {
            ai.phase = 'recover';
            ai.timer = 0.46;
            ai.strafeSign *= -1;
          }
        } else if (ai.phase === 'feint_dash') {
          state.behavior = 'attack';
          attackVariant = 5;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 11.0, dt);
          ai.timer -= dt;
          const p = 1 - Math.max(0, ai.timer / 0.34);
          attackProgress = p;
          airborneHeight = Math.sin(p * Math.PI) * 0.24;
          boosterIntensity = 0.95;
          desVx = ai.dirX * 13.8;
          desVz = ai.dirZ * 13.8;
          if (ai.timer <= 0) {
            ai.phase = 'approach';
          }
        } else if (ai.phase === 'recover') {
          state.behavior = 'recover';
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.5, dt);
          ai.timer -= dt;
          desVx = rightX * ai.strafeSign * 1.4;
          desVz = rightZ * ai.strafeSign * 1.4;
          if (ai.timer <= 0) {
            ai.phase = 'approach';
          }
        }
      }

      desVx += ctx.separation.x * 2.2;
      desVz += ctx.separation.y * 2.2;
      stepEnemyMovement(spatial, desVx, desVz, world, dt, F7_MIN_FLOOR_Y);

      rig.setTetherCable(cableActive, cableLen, cableTension);

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
        airborneHeight,
        boosterIntensity,
      });
    },
  };
}
