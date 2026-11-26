import * as THREE from 'three';
import { F6_TRENCH_Y } from '../../../arena/hideout/floors/floor06/layout';
import type { EnemyAiStepContext, EnemyArchetypeBrain } from '../../core/enemyManager';
import {
  computeFacingYaw,
  hasEnemyLineOfSight,
  rotateYawTowards,
  stepEnemyMovement,
} from '../../core/enemyNav';
import type { Floor06EnemyMaterials } from '../materials';
import { MONOLITH_CLAYMORE_KNIGHT_CONFIG } from './config';
import {
  buildMonolithClaymoreKnightRig,
  type ClaymoreKnightPoseMode,
  type MonolithClaymoreKnightRigHandle,
} from './mesh';
import {
  computeCrescentWaveOffsets,
  selectClaymoreKnightAction,
  solveVaultCrashLeap,
} from './tactics';
import {
  createClaymoreKnightTextures,
  type ClaymoreKnightTextureSuite,
} from './textures';

const F6_MIN_FLOOR_Y = F6_TRENCH_Y - 0.6;

type KnightPhase =
  | 'patrol'
  | 'pursue'
  | 'cleave1_windup'
  | 'cleave1_swing'
  | 'cleave2_windup'
  | 'cleave2_swing'
  | 'slam_windup'
  | 'slam_impact'
  | 'lunge_windup'
  | 'lunge_rush'
  | 'wave_windup'
  | 'wave_release'
  | 'vault_crouch'
  | 'vault_airborne'
  | 'vault_impact'
  | 'aegis_march'
  | 'recover';

interface KnightAiState {
  phase: KnightPhase;
  timer: number;
  maxTimer: number;
  patrolIdx: number;
  slamCooldown: number;
  lungeCooldown: number;
  cleaveCooldown: number;
  waveCooldown: number;
  vaultCooldown: number;
  guardCooldown: number;
  lungeVx: number;
  lungeVz: number;
  vaultPeakHeight: number;
  hitDone: boolean;
  lastHp: number;
  damageBurstAccum: number;
  staggerSparkTick: number;
  lastRecoverPose: ClaymoreKnightPoseMode;
}

// Module-scope scratch helpers (zero GC inside stepAi!)
const _origin = new THREE.Vector3();
const _glint = new THREE.Vector3();
const _bladeTip = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

let sharedKnightTextures: ClaymoreKnightTextureSuite | null = null;
function getSharedKnightTextures(): ClaymoreKnightTextureSuite {
  if (!sharedKnightTextures) {
    sharedKnightTextures = createClaymoreKnightTextures();
  }
  return sharedKnightTextures;
}

export function createMonolithClaymoreKnightBrain(
  mats: Floor06EnemyMaterials
): EnemyArchetypeBrain {
  return {
    config: MONOLITH_CLAYMORE_KNIGHT_CONFIG,
    createRig: (enemyId) =>
      buildMonolithClaymoreKnightRig(enemyId, mats, getSharedKnightTextures()),
    createAiState: (): Record<string, unknown> => ({
      phase: 'patrol',
      timer: 0,
      maxTimer: 1,
      patrolIdx: 0,
      slamCooldown: 2.0 + Math.random() * 1.4,
      lungeCooldown: 1.6 + Math.random() * 1.2,
      cleaveCooldown: 0.35,
      waveCooldown: 2.6 + Math.random() * 1.5,
      vaultCooldown: 3.4 + Math.random() * 1.8,
      guardCooldown: 2.4,
      lungeVx: 0,
      lungeVz: 0,
      vaultPeakHeight: 2.5,
      hitDone: false,
      lastHp: MONOLITH_CLAYMORE_KNIGHT_CONFIG.maxHp,
      damageBurstAccum: 0,
      staggerSparkTick: 0,
      lastRecoverPose: 'idle_march',
    }),
    stepAi: (ctx: EnemyAiStepContext) => {
      const ai = ctx.aiState as unknown as KnightAiState;
      const rig = ctx.rig as MonolithClaymoreKnightRigHandle;
      const { dt, elapsed, state, spatial, playerPos, world, callbacks, patrolPoints } = ctx;
      const cfg = MONOLITH_CLAYMORE_KNIGHT_CONFIG;

      ai.slamCooldown = Math.max(0, ai.slamCooldown - dt);
      ai.lungeCooldown = Math.max(0, ai.lungeCooldown - dt);
      ai.cleaveCooldown = Math.max(0, ai.cleaveCooldown - dt);
      ai.waveCooldown = Math.max(0, ai.waveCooldown - dt);
      ai.vaultCooldown = Math.max(0, ai.vaultCooldown - dt);
      ai.guardCooldown = Math.max(0, ai.guardCooldown - dt);
      ai.damageBurstAccum = Math.max(0, ai.damageBurstAccum - dt * 38);

      const dmgDelta = ai.lastHp - state.hp;
      ai.lastHp = state.hp;
      if (dmgDelta > 1) {
        state.engaged = true;
        ai.damageBurstAccum += dmgDelta;
      }

      // =====================================================================
      // STAGGERED / DORSAL OBELISK RUPTURED STATE (hunched forward + sparks!)
      // =====================================================================
      if (state.staggerTimer > 0) {
        ai.phase = 'pursue';
        state.shieldActive = false;
        rig.setAegisGuard(false, 0);
        rig.setGroundTelegraph(false, 0, 0);
        rig.setBladeCharge(0);
        rig.setBladeTrailActive(false);
        rig.setPoseMode('idle_march');
        stepEnemyMovement(spatial, 0, 0, world, dt, F6_MIN_FLOOR_Y);

        ai.staggerSparkTick += dt;
        if (ai.staggerSparkTick >= 0.22) {
          ai.staggerSparkTick = 0;
          rig.getWeakpointWorldPos(_glint);
          callbacks.spawnBoosterBurst(_glint, _up, 0x38bdf8, 5);
        }

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
        });
        return;
      }

      const dx = playerPos.x - spatial.x;
      const dy = playerPos.y + 1.15 - (spatial.y + 1.35);
      const dz = playerPos.z - spatial.z;
      const horizDist = Math.hypot(dx, dz);
      if (!Number.isFinite(horizDist)) return;
      const vertDist = Math.abs(playerPos.y - spatial.y);

      const hasLos =
        horizDist <= cfg.detectRange &&
        hasEnemyLineOfSight(
          spatial.x,
          spatial.y + 1.65,
          spatial.z,
          playerPos.x,
          playerPos.y + 1.3,
          playerPos.z,
          world
        );

      if (hasLos || horizDist < 15.5 || state.hp < state.maxHp) {
        state.engaged = true;
      }

      const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);
      const dirX = horizDist > 0.01 ? dx / horizDist : -Math.sin(spatial.yaw);
      const dirZ = horizDist > 0.01 ? dz / horizDist : -Math.cos(spatial.yaw);

      let desVx = 0;
      let desVz = 0;
      let attackProgress = 0;
      let attackVariant = 0;
      let airborneHeight = 0;
      let bladeCharge = 0;
      let bladeTrail = false;
      let guardActive = false;
      let poseMode: ClaymoreKnightPoseMode = 'idle_march';
      let groundRingActive = false;
      let groundRingRadius = 4.0;
      let groundRingProgress = 0;

      if (!state.engaged) {
        state.behavior = 'patrol';
        if (patrolPoints.length > 0) {
          const wp = patrolPoints[ai.patrolIdx % patrolPoints.length];
          const pdx = wp.x - spatial.x;
          const pdz = wp.z - spatial.z;
          const pdist = Math.hypot(pdx, pdz);
          if (pdist < 0.85) {
            ai.patrolIdx = (ai.patrolIdx + 1) % patrolPoints.length;
          } else {
            desVx = (pdx / pdist) * cfg.moveSpeed * 0.52;
            desVz = (pdz / pdist) * cfg.moveSpeed * 0.52;
            spatial.yaw = rotateYawTowards(
              spatial.yaw,
              computeFacingYaw(spatial.x, spatial.z, wp.x, wp.z),
              4.0,
              dt
            );
          }
        }
      } else {
        // ===================================================================
        // 6-ATTACK COMBAT PHASE MACHINE
        // ===================================================================
        if (ai.phase === 'patrol' || ai.phase === 'pursue') {
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.4, dt);
          const action = selectClaymoreKnightAction({
            horizDist,
            vertDist,
            hasLos,
            hasAttackToken: ctx.hasAttackToken,
            obeliskBroken: state.weakpoint.broken,
            slamCooldown: ai.slamCooldown,
            lungeCooldown: ai.lungeCooldown,
            cleaveCooldown: ai.cleaveCooldown,
            waveCooldown: ai.waveCooldown,
            vaultCooldown: ai.vaultCooldown,
            guardCooldown: ai.guardCooldown,
            damageBurstAccum: ai.damageBurstAccum,
            roll: Math.random(),
          });

          if (action === 'aegis_guard_advance') {
            ai.phase = 'aegis_march';
            ai.timer = 1.65;
            ai.maxTimer = 1.65;
            ai.damageBurstAccum = 0;
            ai.guardCooldown = 6.2 + Math.random() * 1.8;
            callbacks.onTelegraphAudio('shield_slam');
            rig.getShieldCenterWorldPos(_glint);
            callbacks.spawnPerilGlint(_glint, 0x38bdf8);
          } else if (action === 'twin_cleave_combo') {
            ai.phase = 'cleave1_windup';
            ai.timer = 0.4;
            ai.maxTimer = 0.4;
            ai.hitDone = false;
            callbacks.onTelegraphAudio('melee');
            rig.getBladeTipWorldPos(_glint);
            callbacks.spawnPerilGlint(_glint, 0x38bdf8);
          } else if (action === 'seismic_monolith_slam') {
            ai.phase = 'slam_windup';
            ai.timer = 0.68;
            ai.maxTimer = 0.68;
            ai.hitDone = false;
            callbacks.onTelegraphAudio('boss_slam');
            rig.getBladeTipWorldPos(_glint);
            callbacks.spawnPerilGlint(_glint, 0x67e8f9);
          } else if (action === 'monolith_vault_crash') {
            const leap = solveVaultCrashLeap(dx, dz, 0.68);
            ai.lungeVx = leap.vx;
            ai.lungeVz = leap.vz;
            ai.vaultPeakHeight = leap.peakHeight;
            ai.phase = 'vault_crouch';
            ai.timer = 0.44;
            ai.maxTimer = 0.44;
            ai.hitDone = false;
            callbacks.onTelegraphAudio('boss_slam');
            rig.getWeakpointWorldPos(_glint);
            callbacks.spawnPerilGlint(_glint, 0x38bdf8);
          } else if (action === 'astral_crescent_wave') {
            ai.phase = 'wave_windup';
            ai.timer = 0.56;
            ai.maxTimer = 0.56;
            ai.hitDone = false;
            callbacks.onTelegraphAudio('iaijutsu_glint');
            rig.getBladeTipWorldPos(_glint);
            callbacks.spawnPerilGlint(_glint, 0x7dd3fc);
          } else if (action === 'lunge_pierce_thrust') {
            ai.phase = 'lunge_windup';
            ai.timer = 0.4;
            ai.maxTimer = 0.4;
            ai.hitDone = false;
            ai.lungeVx = dirX * 15.2;
            ai.lungeVz = dirZ * 15.2;
            callbacks.onTelegraphAudio('dash');
            rig.getBladeTipWorldPos(_glint);
            callbacks.spawnPerilGlint(_glint, 0x38bdf8);
          } else {
            state.behavior = 'chase';
            const spd = horizDist > 8.2 ? cfg.sprintSpeed : cfg.moveSpeed;
            desVx = dirX * spd + ctx.separation.x * 2.2;
            desVz = dirZ * spd + ctx.separation.y * 2.2;
          }
        } else if (ai.phase === 'aegis_march') {
          // Reactive Paranatural Aegis Guard March (blocks frontal fire on shield hitbox!)
          state.behavior = 'chase';
          poseMode = 'aegis_guard';
          guardActive = true;
          bladeCharge = 0.45;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 5.4, dt);
          ai.timer -= dt;
          desVx = dirX * (cfg.moveSpeed * 0.92);
          desVz = dirZ * (cfg.moveSpeed * 0.92);

          // If Knight closes into sword range during Aegis March, burst straight into Twin Cleave Counter!
          if (horizDist <= 3.85 && vertDist <= 2.2) {
            ai.phase = 'cleave1_windup';
            ai.timer = 0.28;
            ai.maxTimer = 0.28;
            ai.hitDone = false;
            callbacks.onTelegraphAudio('melee');
            rig.getBladeTipWorldPos(_glint);
            callbacks.spawnPerilGlint(_glint, 0x67e8f9);
          } else if (ai.timer <= 0) {
            ai.phase = 'pursue';
          }
        } else if (ai.phase === 'cleave1_windup') {
          state.behavior = 'windup';
          poseMode = 'cleave_1';
          attackVariant = 0;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 7.6, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          bladeCharge = 0.4 + attackProgress * 0.65;
          if (ai.timer <= 0) {
            ai.phase = 'cleave1_swing';
            ai.timer = 0.3;
            ai.maxTimer = 0.3;
          }
        } else if (ai.phase === 'cleave1_swing') {
          state.behavior = 'attack';
          poseMode = 'cleave_1';
          attackVariant = 0;
          bladeTrail = true;
          bladeCharge = 1.05;
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          desVx = dirX * 4.4;
          desVz = dirZ * 4.4;
          if (!ai.hitDone && attackProgress >= 0.3) {
            ai.hitDone = true;
            _origin.set(spatial.x, spatial.y + 1.28, spatial.z);
            callbacks.spawnBladeSlashArc(_origin, spatial.yaw, 0.2, 0.06, 3.05, 0x38bdf8, true, 1);
            callbacks.onKatanaSlashAudio?.(true);
            rig.getBladeTipWorldPos(_bladeTip);
            callbacks.spawnSurfaceSlashScar(_bladeTip, _up, _dir.set(-dirZ, 0, dirX).normalize(), true);
            if (horizDist <= 3.75 && vertDist <= 2.2) {
              callbacks.applyPlayerMeleeHit(22, _origin, 0.68);
            }
          }
          if (ai.timer <= 0) {
            // Chain smoothly into Rising Diagonal Uppercut (Hit #2) if player is still close!
            if (horizDist <= 5.4 && vertDist <= 2.4) {
              ai.phase = 'cleave2_windup';
              ai.timer = 0.24;
              ai.maxTimer = 0.24;
              ai.hitDone = false;
              callbacks.onTelegraphAudio('iaijutsu_glint');
            } else {
              ai.cleaveCooldown = 1.6;
              ai.lastRecoverPose = 'idle_march';
              ai.phase = 'recover';
              ai.timer = 0.48;
              ai.maxTimer = 0.48;
            }
          }
        } else if (ai.phase === 'cleave2_windup') {
          state.behavior = 'windup';
          poseMode = 'cleave_2';
          attackVariant = 0;
          bladeTrail = true;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.8, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          bladeCharge = 0.75 + attackProgress * 0.55;
          if (ai.timer <= 0) {
            ai.phase = 'cleave2_swing';
            ai.timer = 0.34;
            ai.maxTimer = 0.34;
          }
        } else if (ai.phase === 'cleave2_swing') {
          state.behavior = 'attack';
          poseMode = 'cleave_2';
          attackVariant = 0;
          bladeTrail = true;
          bladeCharge = 1.25;
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          desVx = dirX * 5.6;
          desVz = dirZ * 5.6;
          if (!ai.hitDone && attackProgress >= 0.3) {
            ai.hitDone = true;
            _origin.set(spatial.x, spatial.y + 1.32, spatial.z);
            callbacks.spawnBladeSlashArc(_origin, spatial.yaw, -0.58, 0.14, 3.25, 0x67e8f9, true, -1);
            callbacks.onKatanaSlashAudio?.(true);
            rig.getBladeTipWorldPos(_bladeTip);
            callbacks.spawnSurfaceSlashScar(_bladeTip, _up, _dir.set(dirZ, 0.45, -dirX).normalize(), true);
            if (horizDist <= 3.9 && vertDist <= 2.3) {
              callbacks.applyPlayerMeleeHit(28, _origin, 0.85);
            }
          }
          if (ai.timer <= 0) {
            ai.cleaveCooldown = 1.95;
            ai.lastRecoverPose = 'idle_march';
            ai.phase = 'recover';
            ai.timer = 0.62;
            ai.maxTimer = 0.62;
          }
        } else if (ai.phase === 'slam_windup') {
          state.behavior = 'windup';
          poseMode = 'seismic_slam';
          attackVariant = 1;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 5.4, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          bladeCharge = 0.4 + attackProgress * 1.0;
          groundRingActive = true;
          groundRingRadius = 4.6;
          groundRingProgress = attackProgress;
          if (ai.timer <= 0) {
            ai.phase = 'slam_impact';
            ai.timer = 0.36;
            ai.maxTimer = 0.36;
          }
        } else if (ai.phase === 'slam_impact') {
          state.behavior = 'attack';
          poseMode = 'seismic_slam';
          attackVariant = 1;
          bladeTrail = true;
          bladeCharge = 1.35;
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          if (!ai.hitDone && attackProgress >= 0.28) {
            ai.hitDone = true;
            const fwdX = -Math.sin(spatial.yaw);
            const fwdZ = -Math.cos(spatial.yaw);
            _origin.set(spatial.x + fwdX * 1.95, spatial.y + 0.14, spatial.z + fwdZ * 1.95);
            callbacks.spawnShockwave({
              center: _origin.clone(),
              maxRadius: 7.8,
              expandSpeed: 15.2,
              damage: 28,
              color: 0x38bdf8,
              staggerStrength: 0.86,
            });
            callbacks.spawnRailImpactCrater(_origin, _up, 0x38bdf8);
            callbacks.onTelegraphAudio('shield_slam');
            ctx.exposeWeakpoint(2.0);
          }
          if (ai.timer <= 0) {
            ai.slamCooldown = 5.2 + Math.random() * 1.6;
            ai.lastRecoverPose = 'seismic_slam';
            ai.phase = 'recover';
            ai.timer = 0.88;
            ai.maxTimer = 0.88;
          }
        } else if (ai.phase === 'vault_crouch') {
          // Coiled Monolith Vault-Crash crouch telegraph + Dorsal Obelisk ignition!
          state.behavior = 'windup';
          poseMode = 'vault_crash';
          attackVariant = 1;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.2, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          bladeCharge = 0.6 + attackProgress * 0.8;
          if (ai.timer <= 0) {
            const leap = solveVaultCrashLeap(dx, dz, 0.66);
            ai.lungeVx = leap.vx;
            ai.lungeVz = leap.vz;
            ai.vaultPeakHeight = leap.peakHeight;
            ai.phase = 'vault_airborne';
            ai.timer = 0.66;
            ai.maxTimer = 0.66;
            callbacks.onTelegraphAudio('dash');
            rig.getWeakpointWorldPos(_glint);
            callbacks.spawnBoosterBurst(_glint, _up, 0x38bdf8, 12);
          }
        } else if (ai.phase === 'vault_airborne') {
          // Parabolic airborne leap across the archive!
          state.behavior = 'windup';
          poseMode = 'vault_crash';
          attackVariant = 1;
          bladeTrail = true;
          bladeCharge = 1.4;
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          airborneHeight = Math.sin(attackProgress * Math.PI) * ai.vaultPeakHeight;
          desVx = ai.lungeVx;
          desVz = ai.lungeVz;
          groundRingActive = true;
          groundRingRadius = 5.2;
          groundRingProgress = attackProgress;
          if (ai.timer <= 0) {
            ai.phase = 'vault_impact';
            ai.timer = 0.34;
            ai.maxTimer = 0.34;
          }
        } else if (ai.phase === 'vault_impact') {
          // Earth-shattering blade-first landing quake + crater!
          state.behavior = 'attack';
          poseMode = 'vault_crash';
          attackVariant = 1;
          bladeTrail = true;
          bladeCharge = 1.45;
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          if (!ai.hitDone && attackProgress >= 0.16) {
            ai.hitDone = true;
            const fwdX = -Math.sin(spatial.yaw);
            const fwdZ = -Math.cos(spatial.yaw);
            _origin.set(spatial.x + fwdX * 1.6, spatial.y + 0.14, spatial.z + fwdZ * 1.6);
            callbacks.spawnShockwave({
              center: _origin.clone(),
              maxRadius: 8.6,
              expandSpeed: 16.5,
              damage: 34,
              color: 0x67e8f9,
              staggerStrength: 0.94,
            });
            callbacks.spawnRailImpactCrater(_origin, _up, 0x67e8f9);
            callbacks.spawnBladeSlashArc(_origin, spatial.yaw, 1.42, 0, 3.4, 0x67e8f9, true, 1);
            callbacks.onTelegraphAudio('boss_slam');
            ctx.exposeWeakpoint(2.2);
          }
          if (ai.timer <= 0) {
            ai.vaultCooldown = 7.2 + Math.random() * 2.0;
            ai.lastRecoverPose = 'vault_crash';
            ai.phase = 'recover';
            ai.timer = 1.05;
            ai.maxTimer = 1.05;
          }
        } else if (ai.phase === 'wave_windup') {
          // Anti-kiting 3-bolt glowing cyan Astral Crescent Wave charge
          state.behavior = 'windup';
          poseMode = 'crescent_wave';
          attackVariant = 2;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 7.2, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          bladeCharge = 0.5 + attackProgress * 0.95;
          if (ai.timer <= 0) {
            ai.phase = 'wave_release';
            ai.timer = 0.34;
            ai.maxTimer = 0.34;
          }
        } else if (ai.phase === 'wave_release') {
          state.behavior = 'attack';
          poseMode = 'crescent_wave';
          attackVariant = 2;
          bladeTrail = true;
          bladeCharge = 1.35;
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          if (!ai.hitDone && attackProgress >= 0.25) {
            ai.hitDone = true;
            _origin.set(spatial.x, spatial.y + 1.35, spatial.z);
            callbacks.spawnBladeSlashArc(_origin, spatial.yaw, 0.08, 0.02, 3.35, 0x38bdf8, true, 1);
            callbacks.onKatanaSlashAudio?.(true);

            const pitch = Math.atan2(dy, Math.max(1, horizDist));
            const cosP = Math.cos(pitch);
            const sinP = Math.sin(pitch);
            const offsets = computeCrescentWaveOffsets();
            rig.getBladeMidWorldPos(_bladeTip);
            for (let i = 0; i < offsets.length; i++) {
              const yawOff = spatial.yaw + offsets[i];
              _dir.set(-Math.sin(yawOff) * cosP, sinP, -Math.cos(yawOff) * cosP).normalize();
              callbacks.spawnProjectile({
                origin: _bladeTip.clone(),
                direction: _dir.clone(),
                speed: 24.5,
                damage: 17,
                kind: 'rail_slug',
                color: i === 1 ? 0x67e8f9 : 0x38bdf8,
                radius: 0.22,
                staggerStrength: 0.42,
              });
            }
          }
          if (ai.timer <= 0) {
            ai.waveCooldown = 5.4 + Math.random() * 1.6;
            ai.lastRecoverPose = 'idle_march';
            ai.phase = 'recover';
            ai.timer = 0.58;
            ai.maxTimer = 0.58;
          }
        } else if (ai.phase === 'lunge_windup') {
          state.behavior = 'windup';
          poseMode = 'lunge_thrust';
          attackVariant = 0;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.8, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          bladeCharge = 0.45 + attackProgress * 0.85;
          if (ai.timer <= 0) {
            ai.lungeVx = dirX * 15.6;
            ai.lungeVz = dirZ * 15.6;
            ai.phase = 'lunge_rush';
            ai.timer = 0.44;
            ai.maxTimer = 0.44;
            rig.getWeakpointWorldPos(_glint);
            callbacks.spawnBoosterBurst(_glint, _dir.set(-dirX, 0.2, -dirZ).normalize(), 0x38bdf8, 10);
          }
        } else if (ai.phase === 'lunge_rush') {
          state.behavior = 'attack';
          poseMode = 'lunge_thrust';
          attackVariant = 0;
          bladeTrail = true;
          bladeCharge = 1.25;
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          desVx = ai.lungeVx;
          desVz = ai.lungeVz;
          if (!ai.hitDone && (horizDist <= 3.3 || attackProgress >= 0.7)) {
            ai.hitDone = true;
            _origin.set(spatial.x, spatial.y + 1.25, spatial.z);
            callbacks.spawnBladeSlashArc(_origin, spatial.yaw, -0.22, 0.08, 3.15, 0x67e8f9, true, -1);
            callbacks.onKatanaSlashAudio?.(true);
            rig.getBladeTipWorldPos(_bladeTip);
            callbacks.spawnSurfaceSlashScar(_bladeTip, _up, _dir.set(dirX, 0, dirZ).normalize(), true);
            if (horizDist <= 3.75 && vertDist <= 2.2) {
              callbacks.applyPlayerMeleeHit(27, _origin, 0.82);
            }
          }
          if (ai.timer <= 0) {
            ai.lungeCooldown = 4.4 + Math.random() * 1.4;
            ai.lastRecoverPose = 'idle_march';
            ai.phase = 'recover';
            ai.timer = 0.62;
            ai.maxTimer = 0.62;
          }
        } else if (ai.phase === 'recover') {
          state.behavior = 'recover';
          poseMode = ai.lastRecoverPose;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 3.2, dt);
          ai.timer -= dt;
          if (ai.timer <= 0) {
            ai.phase = 'pursue';
          }
        }
      }

      // Sync shield state (blocks frontal hits on left forearm Aegis Barrier ONLY during Aegis March!)
      state.shieldActive = guardActive;
      rig.setPoseMode(poseMode);
      rig.setBladeCharge(bladeCharge);
      rig.setAegisGuard(guardActive, 1.0);
      rig.setGroundTelegraph(groundRingActive, groundRingRadius, groundRingProgress);
      rig.setBladeTrailActive(bladeTrail);

      stepEnemyMovement(spatial, desVx, desVz, world, dt, F6_MIN_FLOOR_Y);
      const speed = Math.hypot(spatial.vx, spatial.vz);

      rig.updateAnimation({
        dt,
        elapsed,
        behavior: state.behavior,
        speedRatio: speed / cfg.moveSpeed,
        localMoveX: 0,
        localMoveZ: speed / cfg.moveSpeed,
        aimPitch: 0,
        attackProgress,
        attackVariant,
        flinchTimer: state.flinchTimer,
        flinchDirX: state.flinchDirX,
        staggerTimer: 0,
        deadProgress: 0,
        weakpointExposed: state.weakpoint.exposed,
        weakpointBroken: state.weakpoint.broken,
        shieldActive: guardActive,
        phase: 1,
        airborneHeight,
      });
    },
  };
}
