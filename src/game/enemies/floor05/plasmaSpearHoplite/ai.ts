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
import { PLASMA_SPEAR_HOPLITE_CONFIG } from './config';
import {
  buildPlasmaSpearHopliteRig,
  type HoplitePoseMode,
  type PlasmaSpearHopliteRigHandle,
} from './mesh';
import {
  computeJavelinSpreadAngles,
  selectHopliteAction,
  solveHopliteVaultLeap,
} from './tactics';
import { createHopliteTextures, type HopliteTextureSuite } from './textures';

const F5_MIN_FLOOR_Y = F5_PIT_Y - 0.6;

type HoplitePhase =
  | 'patrol'
  | 'pursue'
  | 'combat_strafe'
  | 'brace_march'
  | 'bash_windup'
  | 'bash_strike'
  | 'flurry_windup'
  | 'flurry_strike'
  | 'lunge_windup'
  | 'lunge_strike'
  | 'sweep_windup'
  | 'sweep_strike'
  | 'vault_windup'
  | 'vault_leap'
  | 'javelin_windup'
  | 'javelin_release'
  | 'recover';

interface HopliteAiState {
  phase: HoplitePhase;
  timer: number;
  maxTimer: number;
  patrolIdx: number;
  lungeCooldown: number;
  sweepCooldown: number;
  javelinCooldown: number;
  braceCooldown: number;
  flurryCooldown: number;
  bashCooldown: number;
  vaultCooldown: number;
  strafeCooldown: number;
  strafeDir: -1 | 1;
  lungeVx: number;
  lungeVz: number;
  vaultPeakHeight: number;
  hitDone: boolean;
  flurryHitsDone: number;
  lastHp: number;
  damageBurstAccum: number;
}

const _origin = new THREE.Vector3();
const _tip = new THREE.Vector3();
const _shieldPos = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _upNormal = new THREE.Vector3(0, 1, 0);
const _scarPos = new THREE.Vector3();
const _slashDir = new THREE.Vector3();
const _exhaustDir = new THREE.Vector3();

let sharedHopliteTex: HopliteTextureSuite | null = null;
function getSharedHopliteTextures(): HopliteTextureSuite {
  if (!sharedHopliteTex) sharedHopliteTex = createHopliteTextures();
  return sharedHopliteTex;
}

export function createPlasmaSpearHopliteBrain(mats: Floor05EnemyMaterials): EnemyArchetypeBrain {
  return {
    config: PLASMA_SPEAR_HOPLITE_CONFIG,
    createRig: (enemyId) => buildPlasmaSpearHopliteRig(enemyId, mats, getSharedHopliteTextures()),
    createAiState: (): Record<string, unknown> => ({
      phase: 'patrol',
      timer: 0,
      maxTimer: 1,
      patrolIdx: 0,
      lungeCooldown: 1.0 + Math.random() * 1.0,
      sweepCooldown: 0.4,
      javelinCooldown: 1.5 + Math.random() * 1.3,
      braceCooldown: 1.8,
      flurryCooldown: 1.2 + Math.random() * 0.9,
      bashCooldown: 0.8 + Math.random() * 0.7,
      vaultCooldown: 2.2 + Math.random() * 1.5,
      strafeCooldown: 1.0 + Math.random() * 1.2,
      strafeDir: Math.random() < 0.5 ? -1 : 1,
      lungeVx: 0,
      lungeVz: 0,
      vaultPeakHeight: 2.4,
      hitDone: false,
      flurryHitsDone: 0,
      lastHp: PLASMA_SPEAR_HOPLITE_CONFIG.maxHp,
      damageBurstAccum: 0,
    }),
    stepAi(ctx: EnemyAiStepContext) {
      const ai = ctx.aiState as unknown as HopliteAiState;
      const rig = ctx.rig as PlasmaSpearHopliteRigHandle;
      const { dt, elapsed, state, spatial, playerPos, world, callbacks, patrolPoints } = ctx;
      const cfg = PLASMA_SPEAR_HOPLITE_CONFIG;

      ai.lungeCooldown = Math.max(0, ai.lungeCooldown - dt);
      ai.sweepCooldown = Math.max(0, ai.sweepCooldown - dt);
      ai.javelinCooldown = Math.max(0, ai.javelinCooldown - dt);
      ai.braceCooldown = Math.max(0, ai.braceCooldown - dt);
      ai.flurryCooldown = Math.max(0, ai.flurryCooldown - dt);
      ai.bashCooldown = Math.max(0, ai.bashCooldown - dt);
      ai.vaultCooldown = Math.max(0, ai.vaultCooldown - dt);
      ai.strafeCooldown = Math.max(0, ai.strafeCooldown - dt);
      ai.damageBurstAccum = Math.max(0, ai.damageBurstAccum - dt * 32);

      const dmgDelta = ai.lastHp - state.hp;
      ai.lastHp = state.hp;
      if (dmgDelta > 0.5) {
        state.engaged = true;
        ai.damageBurstAccum += dmgDelta;
      }

      const hpRatio = state.hp / Math.max(1, state.maxHp);
      const enraged = hpRatio <= 0.6;
      rig.setEnragedIntensity(enraged ? Math.min(1, (0.65 - hpRatio) * 2.2) : 0);

      if (state.staggerTimer > 0) {
        ai.phase = 'pursue';
        state.shieldActive = false;
        rig.setPoseMode('march');
        rig.setSpearCharge(0);
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
          phase: 1,
          airborneHeight: 0,
        });
        return;
      }

      const dx = playerPos.x - spatial.x;
      const dy = playerPos.y + 1.15 - (spatial.y + 1.42);
      const dz = playerPos.z - spatial.z;
      const horizDist = Math.hypot(dx, dz);
      const vertDist = Math.abs(playerPos.y - spatial.y);

      const hasLos =
        horizDist <= cfg.detectRange &&
        hasEnemyLineOfSight(
          spatial.x,
          spatial.y + 1.55,
          spatial.z,
          playerPos.x,
          playerPos.y + 1.25,
          playerPos.z,
          world
        );

      if (hasLos || horizDist < 17.5 || state.hp < state.maxHp) {
        state.engaged = true;
      }

      const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);
      const dirX = horizDist > 0.01 ? dx / horizDist : -Math.sin(spatial.yaw);
      const dirZ = horizDist > 0.01 ? dz / horizDist : -Math.cos(spatial.yaw);
      // Right-perpendicular horizontal vector for lateral combat strafing
      const rightX = -dirZ;
      const rightZ = dirX;

      let desVx = 0;
      let desVz = 0;
      let localMoveX = 0;
      let localMoveZ = 0;
      let attackProgress = 0;
      let attackVariant = 0;
      let poseMode: HoplitePoseMode = 'march';
      let spearCharge = enraged ? 0.38 : 0.15;
      let shieldUp = false;
      let airborneHeight = 0;

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
            desVx = (pdx / pdist) * cfg.moveSpeed * 0.55;
            desVz = (pdz / pdist) * cfg.moveSpeed * 0.55;
            localMoveZ = 0.55;
            spatial.yaw = rotateYawTowards(
              spatial.yaw,
              computeFacingYaw(spatial.x, spatial.z, wp.x, wp.z),
              4.2,
              dt
            );
          }
        }
      } else if (ai.phase === 'patrol' || ai.phase === 'pursue') {
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 7.6, dt);
        const action = selectHopliteAction({
          horizDist,
          vertDist,
          hasLos,
          hasAttackToken: ctx.hasAttackToken,
          capacitorBroken: state.weakpoint.broken,
          hpRatio,
          lungeCooldown: ai.lungeCooldown,
          sweepCooldown: ai.sweepCooldown,
          javelinCooldown: ai.javelinCooldown,
          braceCooldown: ai.braceCooldown,
          flurryCooldown: ai.flurryCooldown,
          bashCooldown: ai.bashCooldown,
          vaultCooldown: ai.vaultCooldown,
          strafeCooldown: ai.strafeCooldown,
          damageBurstAccum: ai.damageBurstAccum,
          roll: Math.random(),
        });

        if (action === 'phalanx_brace_advance') {
          ai.phase = 'brace_march';
          ai.timer = 1.6;
          ai.maxTimer = 1.6;
          ai.damageBurstAccum = 0;
          ai.braceCooldown = 4.6 + Math.random() * 1.4;
          callbacks.onTelegraphAudio('shield_charge');
        } else if (action === 'shield_bash_slam') {
          ai.phase = 'bash_windup';
          ai.timer = 0.28;
          ai.maxTimer = 0.28;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('shield_slam');
          rig.getShieldWorldPos(_shieldPos);
          callbacks.spawnPerilGlint(_shieldPos, 0xf97316);
        } else if (action === 'triple_flurry_thrust') {
          ai.phase = 'flurry_windup';
          ai.timer = 0.3;
          ai.maxTimer = 0.3;
          ai.flurryHitsDone = 0;
          callbacks.onTelegraphAudio('iaijutsu_glint');
          rig.getSpearTipWorldPos(_tip);
          callbacks.spawnPerilGlint(_tip, 0xfef08a);
        } else if (action === 'phalanx_sweep_combo') {
          ai.phase = 'sweep_windup';
          ai.timer = 0.34;
          ai.maxTimer = 0.34;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('melee');
          rig.getSpearTipWorldPos(_tip);
          callbacks.spawnPerilGlint(_tip, 0xfbbf24);
        } else if (action === 'spear_lunge_thrust') {
          ai.phase = 'lunge_windup';
          ai.timer = 0.38;
          ai.maxTimer = 0.38;
          ai.hitDone = false;
          ai.lungeVx = dirX * 16.2;
          ai.lungeVz = dirZ * 16.2;
          callbacks.onTelegraphAudio('dash');
          rig.getSpearTipWorldPos(_tip);
          callbacks.spawnPerilGlint(_tip, 0xf59e0b);
        } else if (action === 'vaulting_plunge_spear') {
          ai.phase = 'vault_windup';
          ai.timer = 0.34;
          ai.maxTimer = 0.34;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('booster_burst');
          rig.getSpearTipWorldPos(_tip);
          callbacks.spawnPerilGlint(_tip, 0xff5a22);
        } else if (action === 'plasma_javelin_throw') {
          ai.phase = 'javelin_windup';
          ai.timer = 0.52;
          ai.maxTimer = 0.52;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('rail_charge');
          rig.getSpearTipWorldPos(_tip);
          callbacks.spawnPerilGlint(_tip, 0xfef08a);
        } else if (action === 'combat_strafe') {
          ai.phase = 'combat_strafe';
          ai.timer = 0.85 + Math.random() * 0.55;
          ai.maxTimer = ai.timer;
          ai.strafeDir = Math.random() < 0.5 ? -1 : 1;
          ai.strafeCooldown = 2.6 + Math.random() * 1.2;
        } else {
          state.behavior = 'chase';
          const spd = horizDist > 8.5 || enraged ? cfg.sprintSpeed : cfg.moveSpeed;
          desVx = dirX * spd + ctx.separation.x * 2.2;
          desVz = dirZ * spd + ctx.separation.y * 2.2;
          localMoveZ = spd / cfg.moveSpeed;
        }
      } else if (ai.phase === 'combat_strafe') {
        state.behavior = 'strafe';
        poseMode = 'strafe';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.5, dt);
        ai.timer -= dt;
        const strafeSpd = cfg.moveSpeed * 0.92;
        const closeFactor = horizDist > 5.8 ? 0.42 : horizDist < 3.6 ? -0.25 : 0.14;
        desVx = (rightX * ai.strafeDir + dirX * closeFactor) * strafeSpd + ctx.separation.x * 1.8;
        desVz = (rightZ * ai.strafeDir + dirZ * closeFactor) * strafeSpd + ctx.separation.y * 1.8;
        localMoveX = ai.strafeDir;
        localMoveZ = closeFactor;
        // Opportunistically cancel strafe into a deadly strike if close & token available
        if (ctx.hasAttackToken && horizDist <= 3.6 && vertDist <= 2.3 && ai.flurryCooldown <= 0) {
          ai.phase = 'flurry_windup';
          ai.timer = 0.28;
          ai.maxTimer = 0.28;
          ai.flurryHitsDone = 0;
          callbacks.onTelegraphAudio('iaijutsu_glint');
        } else if (ai.timer <= 0) {
          ai.phase = 'pursue';
        }
      } else if (ai.phase === 'brace_march') {
        state.behavior = 'chase';
        poseMode = 'brace';
        attackVariant = 6;
        shieldUp = !state.weakpoint.broken;
        spearCharge = 0.55;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 5.8, dt);
        ai.timer -= dt;
        const marchSpd = cfg.moveSpeed * 0.9;
        desVx = dirX * marchSpd;
        desVz = dirZ * marchSpd;
        localMoveZ = 0.9;
        if (horizDist <= 3.2 && vertDist <= 2.3 && !state.weakpoint.broken) {
          // Chain straight from shield wall into brutal spiked shield bash!
          ai.phase = 'bash_windup';
          ai.timer = 0.24;
          ai.maxTimer = 0.24;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('shield_slam');
        } else if (horizDist <= 4.1 && vertDist <= 2.3) {
          ai.phase = 'sweep_windup';
          ai.timer = 0.28;
          ai.maxTimer = 0.28;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('melee');
        } else if (ai.timer <= 0 || state.weakpoint.broken) {
          ai.phase = 'pursue';
        }
      } else if (ai.phase === 'bash_windup') {
        state.behavior = 'windup';
        poseMode = 'shield_bash';
        attackVariant = 4;
        shieldUp = !state.weakpoint.broken;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 9.2, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        spearCharge = 0.5 + attackProgress * 0.6;
        if (ai.timer <= 0) {
          ai.lungeVx = dirX * 11.5;
          ai.lungeVz = dirZ * 11.5;
          ai.phase = 'bash_strike';
          ai.timer = 0.34;
          ai.maxTimer = 0.34;
        }
      } else if (ai.phase === 'bash_strike') {
        state.behavior = 'attack';
        poseMode = 'shield_bash';
        attackVariant = 4;
        shieldUp = !state.weakpoint.broken;
        spearCharge = 1.0;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        const burst = attackProgress < 0.55 ? 1 : 0.2;
        desVx = ai.lungeVx * burst;
        desVz = ai.lungeVz * burst;
        if (!ai.hitDone && attackProgress >= 0.26) {
          ai.hitDone = true;
          rig.getShieldWorldPos(_shieldPos);
          callbacks.spawnShockwave({
            center: _shieldPos.clone(),
            maxRadius: 3.4,
            expandSpeed: 16.0,
            damage: 16,
            color: 0xf97316,
            staggerStrength: 0.92,
          });
          callbacks.spawnImpactVfx(_shieldPos, false, true);
          callbacks.onTelegraphAudio('shield_slam');
          if (horizDist <= 3.3 && vertDist <= 2.2) {
            _origin.set(spatial.x, spatial.y + 1.25, spatial.z);
            callbacks.applyPlayerMeleeHit(20, _origin, 0.92);
          }
        }
        if (ai.timer <= 0) {
          ai.bashCooldown = 4.2 + Math.random() * 1.4;
          // Deadly reactive follow-up combo: 55% chance to chain immediately into spear sweep if player is still near!
          if (horizDist <= 4.4 && vertDist <= 2.3 && Math.random() < 0.55) {
            ai.phase = 'sweep_windup';
            ai.timer = 0.24;
            ai.maxTimer = 0.24;
            ai.hitDone = false;
            callbacks.onTelegraphAudio('melee');
          } else {
            ai.phase = 'recover';
            ai.timer = 0.4;
            ai.maxTimer = 0.4;
          }
        }
      } else if (ai.phase === 'flurry_windup') {
        state.behavior = 'windup';
        poseMode = 'flurry';
        attackVariant = 3;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 9.4, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        spearCharge = 0.65 + attackProgress * 0.75;
        if (ai.timer <= 0) {
          ai.phase = 'flurry_strike';
          ai.timer = 0.78;
          ai.maxTimer = 0.78;
          ai.flurryHitsDone = 0;
        }
      } else if (ai.phase === 'flurry_strike') {
        state.behavior = 'attack';
        poseMode = 'flurry';
        attackVariant = 3;
        spearCharge = 1.35;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.2, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);

        // 3 rapid progressive Spartan step-thrusts at 0.16, 0.48, 0.80
        const pulseStep = Math.sin(((attackProgress * 3) % 1) * Math.PI);
        desVx = dirX * (3.2 + pulseStep * 5.8);
        desVz = dirZ * (3.2 + pulseStep * 5.8);

        const thresholds = [0.16, 0.48, 0.8];
        if (ai.flurryHitsDone < 3 && attackProgress >= thresholds[ai.flurryHitsDone]) {
          const hitIdx = ai.flurryHitsDone;
          ai.flurryHitsDone += 1;
          const isFinisher = hitIdx === 2;
          _origin.set(spatial.x, spatial.y + 1.3, spatial.z);
          callbacks.spawnBladeSlashArc(
            _origin,
            spatial.yaw + (hitIdx === 1 ? -0.1 : 0.08),
            hitIdx === 1 ? -0.14 : 0.12,
            0.05,
            isFinisher ? 3.5 : 2.85,
            isFinisher ? 0xff6b24 : 0xfef08a,
            isFinisher,
            hitIdx === 1 ? -1 : 1
          );
          callbacks.onKatanaSlashAudio?.(isFinisher);
          if (horizDist <= (isFinisher ? 4.3 : 3.75) && vertDist <= 2.3) {
            callbacks.applyPlayerMeleeHit(isFinisher ? 20 : 12, _origin, isFinisher ? 0.82 : 0.45);
          }
          if (isFinisher) {
            ctx.exposeWeakpoint(1.25);
          }
        }

        if (ai.timer <= 0) {
          ai.flurryCooldown = 3.8 + Math.random() * 1.4;
          ai.phase = 'recover';
          ai.timer = 0.5;
          ai.maxTimer = 0.5;
        }
      } else if (ai.phase === 'lunge_windup') {
        state.behavior = 'windup';
        poseMode = 'lunge';
        attackVariant = 0;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.6, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        spearCharge = 0.5 + attackProgress * 0.95;
        if (ai.timer <= 0) {
          ai.lungeVx = dirX * 16.8;
          ai.lungeVz = dirZ * 16.8;
          ai.phase = 'lunge_strike';
          ai.timer = 0.38;
          ai.maxTimer = 0.38;
          _origin.set(spatial.x, spatial.y + 1.2, spatial.z);
          _exhaustDir.set(-dirX, 0.25, -dirZ).normalize();
          callbacks.spawnBoosterBurst(_origin, _exhaustDir, 0xf59e0b, 16);
        }
      } else if (ai.phase === 'lunge_strike') {
        state.behavior = 'attack';
        poseMode = 'lunge';
        attackVariant = 0;
        spearCharge = 1.4;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        desVx = ai.lungeVx;
        desVz = ai.lungeVz;
        if (!ai.hitDone && (horizDist <= 3.5 || attackProgress >= 0.52)) {
          ai.hitDone = true;
          _origin.set(spatial.x, spatial.y + 1.3, spatial.z);
          callbacks.spawnBladeSlashArc(_origin, spatial.yaw, 0.08, 0.04, 3.3, 0xfbbf24, true, 1);
          callbacks.onKatanaSlashAudio?.(true);
          _scarPos.set(spatial.x + dirX * 1.6, spatial.y + 0.04, spatial.z + dirZ * 1.6);
          _slashDir.set(dirX, 0, dirZ).normalize();
          callbacks.spawnSurfaceSlashScar(_scarPos, _upNormal, _slashDir, true);
          if (horizDist <= 4.0 && vertDist <= 2.3) {
            callbacks.applyPlayerMeleeHit(25, _origin, 0.82);
          }
          ctx.exposeWeakpoint(1.45);
        }
        if (ai.timer <= 0) {
          ai.lungeCooldown = 3.5 + Math.random() * 1.3;
          ai.phase = 'recover';
          ai.timer = 0.5;
          ai.maxTimer = 0.5;
        }
      } else if (ai.phase === 'sweep_windup') {
        state.behavior = 'windup';
        poseMode = 'sweep';
        attackVariant = 1;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.0, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        spearCharge = 0.55 + attackProgress * 0.75;
        if (ai.timer <= 0) {
          ai.phase = 'sweep_strike';
          ai.timer = 0.34;
          ai.maxTimer = 0.34;
        }
      } else if (ai.phase === 'sweep_strike') {
        state.behavior = 'attack';
        poseMode = 'sweep';
        attackVariant = 1;
        spearCharge = 1.25;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        desVx = dirX * 4.5;
        desVz = dirZ * 4.5;
        if (!ai.hitDone && attackProgress >= 0.3) {
          ai.hitDone = true;
          _origin.set(spatial.x, spatial.y + 1.28, spatial.z);
          callbacks.spawnBladeSlashArc(_origin, spatial.yaw, -0.22, 0.08, 3.4, 0xf59e0b, true, -1);
          callbacks.onKatanaSlashAudio?.(true);
          _scarPos.set(spatial.x + dirX * 1.5, spatial.y + 0.04, spatial.z + dirZ * 1.5);
          _slashDir.set(rightX, 0, rightZ).normalize();
          callbacks.spawnSurfaceSlashScar(_scarPos, _upNormal, _slashDir, false);
          if (horizDist <= 3.9 && vertDist <= 2.3) {
            callbacks.applyPlayerMeleeHit(23, _origin, 0.74);
          }
        }
        if (ai.timer <= 0) {
          ai.sweepCooldown = 2.0 + Math.random() * 0.8;
          ai.phase = 'recover';
          ai.timer = 0.46;
          ai.maxTimer = 0.46;
        }
      } else if (ai.phase === 'vault_windup') {
        state.behavior = 'windup';
        poseMode = 'vault_plunge';
        attackVariant = 5;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 9.0, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        spearCharge = 0.7 + attackProgress * 0.9;
        if (ai.timer <= 0) {
          const leap = solveHopliteVaultLeap(dx, dz, 0.62);
          ai.lungeVx = leap.vx;
          ai.lungeVz = leap.vz;
          ai.vaultPeakHeight = leap.peakHeight;
          ai.phase = 'vault_leap';
          ai.timer = leap.duration;
          ai.maxTimer = leap.duration;
          ai.hitDone = false;
          _origin.set(spatial.x, spatial.y + 0.35, spatial.z);
          _exhaustDir.set(-dirX, -0.7, -dirZ).normalize();
          callbacks.spawnBoosterBurst(_origin, _exhaustDir, 0xff6b24, 22);
          callbacks.onTelegraphAudio('dash');
        }
      } else if (ai.phase === 'vault_leap') {
        state.behavior = 'attack';
        poseMode = 'vault_plunge';
        attackVariant = 5;
        spearCharge = 1.55;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 4.8, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);

        // Smooth parabolic airborne arc peaking mid-flight and slamming down at 0.78!
        const flightNorm = Math.min(1, attackProgress / 0.82);
        airborneHeight = Math.sin(flightNorm * Math.PI) * ai.vaultPeakHeight;
        const moveScale = attackProgress < 0.82 ? 1.0 : 0.08;
        desVx = ai.lungeVx * moveScale;
        desVz = ai.lungeVz * moveScale;

        if (!ai.hitDone && attackProgress >= 0.78) {
          ai.hitDone = true;
          _origin.set(spatial.x, spatial.y + 0.14, spatial.z);
          callbacks.spawnShockwave({
            center: _origin.clone(),
            maxRadius: 4.8,
            expandSpeed: 18.5,
            damage: 26,
            color: 0xff7a1a,
            staggerStrength: 0.95,
          });
          callbacks.spawnBladeSlashArc(
            _origin.clone().setY(spatial.y + 1.1),
            spatial.yaw,
            0.0,
            0.78,
            3.6,
            0xff5a22,
            true,
            1
          );
          _scarPos.set(spatial.x + dirX * 1.1, spatial.y + 0.04, spatial.z + dirZ * 1.1);
          _slashDir.set(dirX, 0, dirZ).normalize();
          callbacks.spawnSurfaceSlashScar(_scarPos, _upNormal, _slashDir, true);
          callbacks.spawnImpactVfx(_origin, false, true);
          callbacks.onTelegraphAudio('boss_slam');
          if (horizDist <= 4.3 && vertDist <= 2.6) {
            callbacks.applyPlayerMeleeHit(28, _origin, 0.96);
          }
          ctx.exposeWeakpoint(1.65);
        }

        if (ai.timer <= 0) {
          ai.vaultCooldown = 5.4 + Math.random() * 1.8;
          ai.phase = 'recover';
          ai.timer = 0.56;
          ai.maxTimer = 0.56;
        }
      } else if (ai.phase === 'javelin_windup') {
        state.behavior = 'windup';
        poseMode = 'javelin';
        attackVariant = 2;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.2, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        spearCharge = 0.7 + attackProgress * 0.95;
        if (ai.timer <= 0) {
          ai.phase = 'javelin_release';
          ai.timer = 0.34;
          ai.maxTimer = 0.34;
        }
      } else if (ai.phase === 'javelin_release') {
        state.behavior = 'attack';
        poseMode = 'javelin';
        attackVariant = 2;
        spearCharge = 1.4;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (!ai.hitDone && attackProgress >= 0.2) {
          ai.hitDone = true;
          rig.getSpearTipWorldPos(_tip);
          const pitch = Math.atan2(dy, Math.max(1, horizDist));
          const cosP = Math.cos(pitch);
          const sinP = Math.sin(pitch);
          const boltCount: 1 | 2 | 3 = enraged ? 3 : horizDist > 13.5 ? 1 : 2;
          const angles = computeJavelinSpreadAngles(boltCount);
          for (let i = 0; i < angles.length; i++) {
            const yawOff = spatial.yaw + angles[i];
            _dir.set(-Math.sin(yawOff) * cosP, sinP, -Math.cos(yawOff) * cosP).normalize();
            callbacks.spawnProjectile({
              origin: _tip.clone(),
              direction: _dir.clone(),
              speed: 31.0,
              damage: enraged ? 20 : 19,
              kind: 'rail_slug',
              color: enraged ? 0xff7a1a : 0xfbbf24,
              radius: 0.19,
              staggerStrength: 0.5,
            });
          }
          callbacks.spawnMuzzleFlash(_tip, _dir, 0xfef08a, true);
          callbacks.onFireAudio('rail_slug');
        }
        if (ai.timer <= 0) {
          ai.javelinCooldown = enraged ? 3.1 + Math.random() * 1.1 : 3.8 + Math.random() * 1.3;
          ai.phase = 'recover';
          ai.timer = 0.46;
          ai.maxTimer = 0.46;
        }
      } else if (ai.phase === 'recover') {
        state.behavior = 'recover';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 4.4, dt);
        ai.timer -= dt;
        if (ai.timer <= 0) ai.phase = 'pursue';
      }

      state.shieldActive = shieldUp;
      rig.setPoseMode(poseMode);
      rig.setSpearCharge(spearCharge);

      stepEnemyMovement(spatial, desVx, desVz, world, dt, F5_MIN_FLOOR_Y);
      const speed = Math.hypot(spatial.vx, spatial.vz);

      rig.updateAnimation({
        dt,
        elapsed,
        behavior: state.behavior,
        speedRatio: speed / cfg.moveSpeed,
        localMoveX,
        localMoveZ: localMoveZ !== 0 ? localMoveZ : speed / cfg.moveSpeed,
        aimPitch: 0,
        attackProgress,
        attackVariant,
        flinchTimer: state.flinchTimer,
        flinchDirX: state.flinchDirX,
        staggerTimer: 0,
        deadProgress: 0,
        weakpointExposed: state.weakpoint.exposed,
        weakpointBroken: state.weakpoint.broken,
        shieldActive: shieldUp,
        phase: 1,
        airborneHeight,
      });
    },
  };
}
