import * as THREE from 'three';
import { F5_PIT_Y } from '../../../arena/hideout/floors/floor05/layout';
import type { EnemyAiStepContext, EnemyArchetypeBrain } from '../../core/enemyManager';
import {
  computeFacingYaw,
  hasEnemyLineOfSight,
  rotateYawTowards,
  stepEnemyMovement,
} from '../../core/enemyNav';
import type { Floor05EnemyMaterials } from '../materials';
import { ARENA_NET_SHOOTER_CONFIG } from './config';
import {
  buildArenaNetShooterRig,
  type ArenaNetShooterRigHandle,
  type NetShooterPoseMode,
} from './mesh';
import {
  computeSnareNetSpreadAngles,
  computeTeslaBurstOffsets,
  selectNetShooterAction,
  solveArcBlinkVault,
  solveShockBolaArc,
} from './tactics';
import { createNetShooterTextures, type NetShooterTextureSuite } from './textures';

const F5_MIN_FLOOR_Y = F5_PIT_Y - 0.6;

type NetShooterPhase =
  | 'patrol'
  | 'aim_hold'
  | 'strafe'
  | 'net_windup'
  | 'net_fire'
  | 'mortar_windup'
  | 'mortar_fire'
  | 'snipe_windup'
  | 'snipe_fire'
  | 'burst_windup'
  | 'burst_fire'
  | 'nova_windup'
  | 'nova_release'
  | 'cleave_windup'
  | 'cleave_strike'
  | 'blink_air'
  | 'recover';

interface NetShooterAiState {
  phase: NetShooterPhase;
  timer: number;
  maxTimer: number;
  patrolIdx: number;
  netCooldown: number;
  mortarCooldown: number;
  snipeCooldown: number;
  burstCooldown: number;
  novaCooldown: number;
  meleeCooldown: number;
  blinkCooldown: number;
  strafeCooldown: number;
  strafeSign: number;
  shotsFired: number;
  hitDone: boolean;
  hitDone2: boolean;
  vaultVx: number;
  vaultVz: number;
  vaultPeak: number;
  lastHp: number;
  damageBurstAccum: number;
}

const _muzzle = new THREE.Vector3();
const _wpPos = new THREE.Vector3();
const _tipPos = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _target = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _slashDir = new THREE.Vector3();

let sharedNetTex: NetShooterTextureSuite | null = null;
function getSharedNetTextures(): NetShooterTextureSuite {
  if (!sharedNetTex) sharedNetTex = createNetShooterTextures();
  return sharedNetTex;
}

export function createArenaNetShooterBrain(mats: Floor05EnemyMaterials): EnemyArchetypeBrain {
  return {
    config: ARENA_NET_SHOOTER_CONFIG,
    createRig: (enemyId) => buildArenaNetShooterRig(enemyId, mats, getSharedNetTextures()),
    createAiState: (): Record<string, unknown> => ({
      phase: 'patrol',
      timer: 0,
      maxTimer: 1,
      patrolIdx: 0,
      netCooldown: 0.9 + Math.random() * 1.1,
      mortarCooldown: 2.5 + Math.random() * 1.5,
      snipeCooldown: 3.1 + Math.random() * 1.6,
      burstCooldown: 1.8 + Math.random() * 1.3,
      novaCooldown: 2.2,
      meleeCooldown: 0.4,
      blinkCooldown: 2.0,
      strafeCooldown: 1.4,
      strafeSign: Math.random() < 0.5 ? -1 : 1,
      shotsFired: 0,
      hitDone: false,
      hitDone2: false,
      vaultVx: 0,
      vaultVz: 0,
      vaultPeak: 1.55,
      lastHp: ARENA_NET_SHOOTER_CONFIG.maxHp,
      damageBurstAccum: 0,
    }),
    stepAi(ctx: EnemyAiStepContext) {
      const ai = ctx.aiState as unknown as NetShooterAiState;
      const rig = ctx.rig as ArenaNetShooterRigHandle;
      const { dt, elapsed, state, spatial, playerPos, world, callbacks, patrolPoints } = ctx;
      const cfg = ARENA_NET_SHOOTER_CONFIG;

      // Track burst damage taken for reactive thruster Arc-Blink evade
      if (state.hp < ai.lastHp) {
        ai.damageBurstAccum += ai.lastHp - state.hp;
      }
      ai.lastHp = state.hp;
      ai.damageBurstAccum = Math.max(0, ai.damageBurstAccum - dt * 24);

      const overclocked = state.hp <= state.maxHp * (cfg.phase2ThresholdRatio ?? 0.55);
      state.phase = overclocked ? 2 : 1;
      const windupMul = overclocked ? 0.85 : 1.0;

      ai.netCooldown = Math.max(0, ai.netCooldown - dt);
      ai.mortarCooldown = Math.max(0, ai.mortarCooldown - dt);
      ai.snipeCooldown = Math.max(0, ai.snipeCooldown - dt);
      ai.burstCooldown = Math.max(0, ai.burstCooldown - dt);
      ai.novaCooldown = Math.max(0, ai.novaCooldown - dt);
      ai.meleeCooldown = Math.max(0, ai.meleeCooldown - dt);
      ai.blinkCooldown = Math.max(0, ai.blinkCooldown - dt);
      ai.strafeCooldown = Math.max(0, ai.strafeCooldown - dt);

      if (state.staggerTimer > 0) {
        ai.phase = 'aim_hold';
        rig.setPoseMode('aim_hold');
        rig.setAimLaser(false);
        rig.setChargeLevel(0.05);
        rig.setEnragedIntensity(overclocked ? 0.6 : 0);
        stepEnemyMovement(spatial, 0, 0, world, dt, F5_MIN_FLOOR_Y);
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
          phase: overclocked ? 2 : 1,
          airborneHeight: 0,
        });
        return;
      }

      const dx = playerPos.x - spatial.x;
      const dy = playerPos.y + 1.15 - (spatial.y + 1.46);
      const dz = playerPos.z - spatial.z;
      const horizDist = Math.hypot(dx, dz);
      const vertDist = Math.abs(playerPos.y - spatial.y);
      const aimPitch = Math.atan2(dy, Math.max(0.8, horizDist));

      const hasLos =
        horizDist <= cfg.detectRange &&
        hasEnemyLineOfSight(
          spatial.x,
          spatial.y + 1.56,
          spatial.z,
          playerPos.x,
          playerPos.y + 1.24,
          playerPos.z,
          world
        );

      if (hasLos || horizDist < 20.0 || state.hp < state.maxHp) {
        state.engaged = true;
      }

      const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);
      const dirX = horizDist > 0.01 ? dx / horizDist : -Math.sin(spatial.yaw);
      const dirZ = horizDist > 0.01 ? dz / horizDist : -Math.cos(spatial.yaw);

      let desVx = 0;
      let desVz = 0;
      let attackProgress = 0;
      let attackVariant = 0;
      let laserActive = false;
      let chargeLevel = overclocked ? 0.55 : 0.18;
      let airborneHeight = 0;
      let poseMode: NetShooterPoseMode = 'aim_hold';
      let localMoveX = 0;

      if (!state.engaged) {
        state.behavior = 'patrol';
        poseMode = 'patrol';
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
              4.4,
              dt
            );
          }
        }
      } else if (ai.phase === 'patrol' || ai.phase === 'aim_hold') {
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.8, dt);
        const action = selectNetShooterAction({
          horizDist,
          vertDist,
          hasLos,
          hasAttackToken: ctx.hasAttackToken,
          netCooldown: ai.netCooldown,
          mortarCooldown: ai.mortarCooldown,
          snipeCooldown: ai.snipeCooldown,
          strafeCooldown: ai.strafeCooldown,
          burstCooldown: ai.burstCooldown,
          novaCooldown: ai.novaCooldown,
          meleeCooldown: ai.meleeCooldown,
          blinkCooldown: ai.blinkCooldown,
          damageBurstAccum: ai.damageBurstAccum,
          enraged: overclocked,
          roll: Math.random(),
        });

        if (action === 'arc_blink_reposition') {
          ai.damageBurstAccum = 0;
          ai.strafeSign = Math.random() < 0.5 ? -1 : 1;
          const v = solveArcBlinkVault(dirX, dirZ, ai.strafeSign, 0.44);
          ai.vaultVx = v.vx;
          ai.vaultVz = v.vz;
          ai.vaultPeak = v.peakHeight;
          ai.phase = 'blink_air';
          ai.timer = v.duration;
          ai.maxTimer = v.duration;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('dash');
          rig.getWeakpointWorldPos(_wpPos);
          callbacks.spawnBoosterBurst(_wpPos, _dir.set(dirX, -0.35, dirZ).normalize(), 0x38bdf8, 12);
          callbacks.spawnPerilGlint(_wpPos, 0x7dd3fc);
        } else if (action === 'trident_arc_cleave') {
          ai.phase = 'cleave_windup';
          ai.timer = 0.34 * windupMul;
          ai.maxTimer = ai.timer;
          ai.hitDone = false;
          ai.hitDone2 = false;
          callbacks.onTelegraphAudio('melee');
          rig.getTridentTipWorldPos(_tipPos);
          callbacks.spawnPerilGlint(_tipPos, 0x38bdf8);
        } else if (action === 'voltaic_shock_nova') {
          ai.phase = 'nova_windup';
          ai.timer = 0.48 * windupMul;
          ai.maxTimer = ai.timer;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('rail_charge');
          rig.getWeakpointWorldPos(_wpPos);
          callbacks.spawnPerilGlint(_wpPos, 0x7dd3fc);
          ctx.exposeWeakpoint(1.1);
        } else if (action === 'electric_snare_net') {
          ai.phase = 'net_windup';
          ai.timer = 0.48 * windupMul;
          ai.maxTimer = ai.timer;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('rail_charge');
          rig.getMuzzleWorldPos(_muzzle);
          callbacks.spawnPerilGlint(_muzzle, 0x38bdf8);
        } else if (action === 'tesla_burst_sweep') {
          ai.phase = 'burst_windup';
          ai.timer = 0.34 * windupMul;
          ai.maxTimer = ai.timer;
          ai.shotsFired = 0;
          ai.strafeSign = -ai.strafeSign;
          callbacks.onTelegraphAudio('rail_charge');
          rig.getMuzzleWorldPos(_muzzle);
          callbacks.spawnPerilGlint(_muzzle, 0x7dd3fc);
        } else if (action === 'shock_bola_mortar') {
          ai.phase = 'mortar_windup';
          ai.timer = 0.58 * windupMul;
          ai.maxTimer = ai.timer;
          ai.hitDone = false;
          ai.hitDone2 = false;
          callbacks.onTelegraphAudio('mortar');
          rig.getMuzzleWorldPos(_muzzle);
          callbacks.spawnPerilGlint(_muzzle, 0x38bdf8);
          ctx.exposeWeakpoint(1.0);
        } else if (action === 'arc_rail_snipe') {
          ai.phase = 'snipe_windup';
          ai.timer = 0.72 * windupMul;
          ai.maxTimer = ai.timer;
          ai.hitDone = false;
          ai.hitDone2 = false;
          callbacks.onTelegraphAudio('rail_charge');
          rig.getMuzzleWorldPos(_muzzle);
          callbacks.spawnPerilGlint(_muzzle, 0x7dd3fc);
        } else if (action === 'strafe_reposition') {
          ai.phase = 'strafe';
          ai.timer = 0.88;
          ai.maxTimer = 0.88;
          ai.strafeSign = -ai.strafeSign;
          ai.strafeCooldown = (overclocked ? 2.0 : 2.6) + Math.random() * 1.2;
        } else {
          state.behavior = 'idle';
          poseMode = 'aim_hold';
        }
      } else if (ai.phase === 'strafe') {
        state.behavior = 'strafe';
        poseMode = 'strafe';
        localMoveX = ai.strafeSign;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 7.6, dt);
        ai.timer -= dt;
        const backBias = horizDist < 8.5 ? -0.68 : !hasLos ? 0.32 : 0.1;
        const spd = overclocked ? cfg.sprintSpeed * 0.92 : cfg.moveSpeed * 1.04;
        desVx = (-dirZ * ai.strafeSign * 0.84 + dirX * backBias) * spd + ctx.separation.x * 2.0;
        desVz = (dirX * ai.strafeSign * 0.84 + dirZ * backBias) * spd + ctx.separation.y * 2.0;
        if (ai.timer <= 0) ai.phase = 'aim_hold';
      } else if (ai.phase === 'blink_air') {
        state.behavior = 'attack';
        poseMode = 'blink_vault';
        attackVariant = 5;
        chargeLevel = 1.15;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 9.5, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        airborneHeight = Math.sin(attackProgress * Math.PI) * ai.vaultPeak;
        desVx = ai.vaultVx;
        desVz = ai.vaultVz;
        if (!ai.hitDone && attackProgress >= 0.44) {
          ai.hitDone = true;
          rig.getMuzzleWorldPos(_muzzle);
          const cosP = Math.cos(aimPitch);
          const sinP = Math.sin(aimPitch);
          for (const yawDelta of [-0.075, 0.075]) {
            const yawOff = spatial.yaw + yawDelta;
            _dir.set(-Math.sin(yawOff) * cosP, sinP, -Math.cos(yawOff) * cosP).normalize();
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _dir.clone(),
              speed: 25.0,
              damage: 11,
              kind: 'plasma_bolt',
              color: 0x38bdf8,
              radius: 0.17,
              staggerStrength: 0.54,
            });
          }
          callbacks.spawnMuzzleFlash(_muzzle, _dir, 0x38bdf8, true);
          callbacks.spawnBoosterBurst(_muzzle, _dir, 0x7dd3fc, 8);
          callbacks.onFireAudio('shotgun');
        }
        if (ai.timer <= 0) {
          ai.blinkCooldown = (overclocked ? 4.4 : 5.8) + Math.random() * 1.6;
          ai.phase = 'aim_hold';
        }
      } else if (ai.phase === 'cleave_windup') {
        state.behavior = 'windup';
        poseMode = 'trident_cleave';
        attackVariant = 4;
        chargeLevel = 0.88;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 10.5, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        desVx = dirX * 2.2;
        desVz = dirZ * 2.2;
        if (ai.timer <= 0) {
          ai.phase = 'cleave_strike';
          ai.timer = overclocked ? 0.42 : 0.3;
          ai.maxTimer = ai.timer;
        }
      } else if (ai.phase === 'cleave_strike') {
        state.behavior = 'attack';
        poseMode = 'trident_cleave';
        attackVariant = 4;
        chargeLevel = 1.25;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        desVx = dirX * (attackProgress < 0.45 ? 4.8 : 0.6);
        desVz = dirZ * (attackProgress < 0.45 ? 4.8 : 0.6);
        if (!ai.hitDone && attackProgress >= 0.24) {
          ai.hitDone = true;
          _target.set(spatial.x, spatial.y + 1.12, spatial.z);
          callbacks.spawnBladeSlashArc(_target, spatial.yaw, 0.14, 0.08, 3.15, 0x38bdf8, true, 1);
          _slashDir.set(dirX, 0, dirZ).normalize();
          callbacks.spawnSurfaceSlashScar(
            new THREE.Vector3(spatial.x + dirX * 1.15, spatial.y + 0.04, spatial.z + dirZ * 1.15),
            _up,
            _slashDir,
            true
          );
          callbacks.onKatanaSlashAudio?.(true);
          if (horizDist <= 3.85 && vertDist <= 2.3) {
            callbacks.applyPlayerMeleeHit(22, _target, 0.72);
          }
        }
        if (overclocked && !ai.hitDone2 && attackProgress >= 0.7) {
          ai.hitDone2 = true;
          _target.set(spatial.x, spatial.y + 1.05, spatial.z);
          callbacks.spawnBladeSlashArc(_target, spatial.yaw, -0.22, 0.12, 3.25, 0x7dd3fc, true, -1);
          callbacks.onKatanaSlashAudio?.(false);
          if (horizDist <= 3.9 && vertDist <= 2.3) {
            callbacks.applyPlayerMeleeHit(16, _target, 0.56);
          }
        }
        if (ai.timer <= 0) {
          ai.meleeCooldown = (overclocked ? 2.2 : 3.0) + Math.random() * 0.9;
          ai.phase = 'recover';
          ai.timer = 0.42;
          ai.maxTimer = 0.42;
        }
      } else if (ai.phase === 'nova_windup') {
        state.behavior = 'windup';
        poseMode = 'shock_nova';
        attackVariant = 3;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.2, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        chargeLevel = 0.65 + attackProgress * 0.85;
        if (ai.timer <= 0) {
          ai.phase = 'nova_release';
          ai.timer = 0.32;
          ai.maxTimer = 0.32;
        }
      } else if (ai.phase === 'nova_release') {
        state.behavior = 'attack';
        poseMode = 'shock_nova';
        attackVariant = 3;
        chargeLevel = 1.45;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (!ai.hitDone && attackProgress >= 0.18) {
          ai.hitDone = true;
          _target.set(spatial.x, spatial.y + 0.14, spatial.z);
          callbacks.spawnShockwave({
            center: _target.clone(),
            maxRadius: overclocked ? 6.4 : 5.4,
            expandSpeed: 14.5,
            damage: overclocked ? 22 : 18,
            color: 0x38bdf8,
            staggerStrength: 0.78,
          });
          callbacks.spawnRailImpactCrater(_target.clone(), _up, 0x38bdf8);
          rig.getWeakpointWorldPos(_wpPos);
          callbacks.spawnBoosterBurst(_wpPos, _up, 0x7dd3fc, 16);
          callbacks.onTelegraphAudio('boss_slam');
        }
        if (ai.timer <= 0) {
          ai.novaCooldown = (overclocked ? 4.4 : 5.8) + Math.random() * 1.4;
          ai.phase = 'recover';
          ai.timer = 0.48;
          ai.maxTimer = 0.48;
        }
      } else if (ai.phase === 'net_windup') {
        state.behavior = 'windup';
        poseMode = 'net_volley';
        attackVariant = 0;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 7.2, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        chargeLevel = 0.45 + attackProgress * 0.85;
        laserActive = true;
        if (ai.timer <= 0) {
          ai.phase = 'net_fire';
          ai.timer = 0.28;
          ai.maxTimer = 0.28;
        }
      } else if (ai.phase === 'net_fire') {
        state.behavior = 'attack';
        poseMode = 'net_volley';
        attackVariant = 0;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        chargeLevel = 1.2;
        if (!ai.hitDone && attackProgress >= 0.18) {
          ai.hitDone = true;
          rig.getMuzzleWorldPos(_muzzle);
          const cosP = Math.cos(aimPitch);
          const sinP = Math.sin(aimPitch);
          const spread = computeSnareNetSpreadAngles(overclocked ? 6 : 4);
          for (let i = 0; i < spread.length; i++) {
            const yawOff = spatial.yaw + spread[i];
            const pitchOff = overclocked ? (i % 2 === 0 ? 0.042 : -0.042) : 0;
            const cP = Math.cos(aimPitch + pitchOff);
            const sP = Math.sin(aimPitch + pitchOff);
            _dir.set(-Math.sin(yawOff) * cP, sP, -Math.cos(yawOff) * cP).normalize();
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _dir.clone(),
              speed: overclocked ? 24.5 : 22.8,
              damage: 11,
              kind: 'plasma_bolt',
              color: 0x38bdf8,
              radius: 0.18,
              staggerStrength: 0.68,
            });
          }
          _dir.set(-Math.sin(spatial.yaw) * cosP, sinP, -Math.cos(spatial.yaw) * cosP).normalize();
          callbacks.spawnMuzzleFlash(_muzzle, _dir, 0x38bdf8, true);
          callbacks.spawnBoosterBurst(_muzzle, _dir, 0x38bdf8, overclocked ? 12 : 8);
          callbacks.onFireAudio('shotgun');
        }
        if (ai.timer <= 0) {
          ai.netCooldown = (overclocked ? 2.5 : 3.2) + Math.random() * 1.2;
          ai.phase = 'recover';
          ai.timer = 0.46;
          ai.maxTimer = 0.46;
        }
      } else if (ai.phase === 'burst_windup') {
        state.behavior = 'windup';
        poseMode = 'tesla_burst';
        attackVariant = 6;
        localMoveX = ai.strafeSign;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.2, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        chargeLevel = 0.5 + attackProgress * 0.55;
        desVx = -dirZ * ai.strafeSign * cfg.moveSpeed * 0.72;
        desVz = dirX * ai.strafeSign * cfg.moveSpeed * 0.72;
        if (ai.timer <= 0) {
          ai.phase = 'burst_fire';
          ai.timer = 0.48;
          ai.maxTimer = 0.48;
          ai.shotsFired = 0;
        }
      } else if (ai.phase === 'burst_fire') {
        state.behavior = 'attack';
        poseMode = 'tesla_burst';
        attackVariant = 6;
        localMoveX = ai.strafeSign;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.5, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        chargeLevel = 1.05;
        desVx = -dirZ * ai.strafeSign * cfg.moveSpeed * 0.85;
        desVz = dirX * ai.strafeSign * cfg.moveSpeed * 0.85;

        const offsets = computeTeslaBurstOffsets(ai.strafeSign);
        const shotThresholds = [0.12, 0.45, 0.78];
        while (ai.shotsFired < offsets.length && attackProgress >= shotThresholds[ai.shotsFired]) {
          const yawOff = spatial.yaw + offsets[ai.shotsFired];
          ai.shotsFired++;
          rig.getMuzzleWorldPos(_muzzle);
          const cosP = Math.cos(aimPitch);
          const sinP = Math.sin(aimPitch);
          _dir.set(-Math.sin(yawOff) * cosP, sinP, -Math.cos(yawOff) * cosP).normalize();
          callbacks.spawnProjectile({
            origin: _muzzle.clone(),
            direction: _dir.clone(),
            speed: 27.5,
            damage: 12,
            kind: 'plasma_bolt',
            color: 0x7dd3fc,
            radius: 0.16,
            staggerStrength: 0.44,
          });
          callbacks.spawnMuzzleFlash(_muzzle, _dir, 0x7dd3fc, false);
          callbacks.onFireAudio('rifle');
        }
        if (ai.timer <= 0) {
          ai.burstCooldown = (overclocked ? 2.6 : 3.5) + Math.random() * 1.2;
          ai.phase = 'recover';
          ai.timer = 0.38;
          ai.maxTimer = 0.38;
        }
      } else if (ai.phase === 'mortar_windup') {
        state.behavior = 'windup';
        poseMode = 'mortar_lob';
        attackVariant = 2;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.2, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        chargeLevel = 0.55 + attackProgress * 0.85;
        if (ai.timer <= 0) {
          ai.phase = 'mortar_fire';
          ai.timer = overclocked ? 0.48 : 0.3;
          ai.maxTimer = ai.timer;
        }
      } else if (ai.phase === 'mortar_fire') {
        state.behavior = 'attack';
        poseMode = 'mortar_lob';
        attackVariant = 2;
        chargeLevel = 1.15;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        const launchCanister = (leadX: number, leadZ: number) => {
          rig.getMuzzleWorldPos(_muzzle);
          _target.set(playerPos.x + leadX, playerPos.y, playerPos.z + leadZ);
          const v = solveShockBolaArc(
            _muzzle.x,
            _muzzle.y,
            _muzzle.z,
            _target.x,
            _target.y,
            _target.z,
            16.5,
            1.02
          );
          const spd = Math.hypot(v.vx, v.vy, v.vz);
          _dir.set(v.vx / spd, v.vy / spd, v.vz / spd);
          callbacks.spawnProjectile({
            origin: _muzzle.clone(),
            direction: _dir.clone(),
            speed: spd,
            damage: 21,
            kind: 'mortar_canister',
            color: 0x0ea5e9,
            radius: 0.25,
            gravity: 16.5,
            splashRadius: 3.3,
            targetPos: _target.clone(),
            staggerStrength: 0.76,
          });
          callbacks.spawnMuzzleFlash(_muzzle, _dir, 0x7dd3fc, true);
          callbacks.spawnBoosterBurst(_muzzle, _dir, 0x0ea5e9, 10);
          callbacks.onFireAudio('mortar');
        };
        if (!ai.hitDone && attackProgress >= 0.18) {
          ai.hitDone = true;
          launchCanister(0, 0);
        }
        if (overclocked && !ai.hitDone2 && attackProgress >= 0.66) {
          ai.hitDone2 = true;
          launchCanister(-dirZ * ai.strafeSign * 2.4, dirX * ai.strafeSign * 2.4);
        }
        if (ai.timer <= 0) {
          ai.mortarCooldown = (overclocked ? 4.4 : 5.4) + Math.random() * 1.6;
          ai.phase = 'recover';
          ai.timer = 0.54;
          ai.maxTimer = 0.54;
        }
      } else if (ai.phase === 'snipe_windup') {
        state.behavior = 'windup';
        poseMode = 'snipe_kneel';
        attackVariant = 1;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 5.8, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        laserActive = true;
        chargeLevel = 0.65 + attackProgress * 1.1;
        if (ai.timer <= 0) {
          ai.phase = 'snipe_fire';
          ai.timer = overclocked ? 0.52 : 0.28;
          ai.maxTimer = ai.timer;
        }
      } else if (ai.phase === 'snipe_fire') {
        state.behavior = 'attack';
        poseMode = 'snipe_kneel';
        attackVariant = 1;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 4.5, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        laserActive = overclocked && !ai.hitDone2;
        chargeLevel = 1.3;
        const fireRailSlug = () => {
          rig.getMuzzleWorldPos(_muzzle);
          const cosP = Math.cos(aimPitch);
          const sinP = Math.sin(aimPitch);
          _dir.set(-Math.sin(spatial.yaw) * cosP, sinP, -Math.cos(spatial.yaw) * cosP).normalize();
          callbacks.spawnProjectile({
            origin: _muzzle.clone(),
            direction: _dir.clone(),
            speed: 39.5,
            damage: 24,
            kind: 'rail_slug',
            color: 0x7dd3fc,
            radius: 0.16,
            staggerStrength: 0.6,
          });
          callbacks.spawnMuzzleFlash(_muzzle, _dir, 0x7dd3fc, true);
          rig.getWeakpointWorldPos(_wpPos);
          callbacks.spawnBoosterBurst(_wpPos, _up, 0x7dd3fc, 10);
          callbacks.onFireAudio('rail_slug');
        };
        if (!ai.hitDone && attackProgress >= 0.14) {
          ai.hitDone = true;
          fireRailSlug();
        }
        if (overclocked && !ai.hitDone2 && attackProgress >= 0.68) {
          ai.hitDone2 = true;
          fireRailSlug();
        }
        if (ai.timer <= 0) {
          ai.snipeCooldown = (overclocked ? 3.8 : 4.6) + Math.random() * 1.4;
          ai.phase = 'recover';
          ai.timer = 0.52;
          ai.maxTimer = 0.52;
        }
      } else if (ai.phase === 'recover') {
        state.behavior = 'recover';
        poseMode = 'aim_hold';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 4.6, dt);
        ai.timer -= dt;
        if (ai.timer <= 0) ai.phase = 'aim_hold';
      }

      rig.setPoseMode(poseMode);
      rig.setAimLaser(laserActive, Math.min(36, horizDist + 2.5));
      rig.setChargeLevel(chargeLevel);
      rig.setEnragedIntensity(overclocked ? 1.0 : 0.0);

      stepEnemyMovement(spatial, desVx, desVz, world, dt, F5_MIN_FLOOR_Y);
      const speed = Math.hypot(spatial.vx, spatial.vz);

      rig.updateAnimation({
        dt,
        elapsed,
        behavior: state.behavior,
        speedRatio: speed / cfg.moveSpeed,
        localMoveX,
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
        phase: overclocked ? 2 : 1,
        airborneHeight,
      });
    },
  };
}
