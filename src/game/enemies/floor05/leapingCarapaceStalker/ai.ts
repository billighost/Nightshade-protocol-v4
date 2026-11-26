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
import { LEAPING_CARAPACE_STALKER_CONFIG } from './config';
import {
  buildLeapingCarapaceStalkerRig,
  type LeapingCarapaceStalkerRigHandle,
  type StalkerPoseMode,
} from './mesh';
import {
  computeSpineFanAngles,
  selectStalkerAction,
  solveStalkerBackflip,
  solveStalkerPounce,
  solveStalkerVenomLob,
} from './tactics';
import { createStalkerTextures, type StalkerTextureSuite } from './textures';

const F5_MIN_FLOOR_Y = F5_PIT_Y - 0.6;

type StalkerPhase =
  | 'patrol'
  | 'prowl'
  | 'sidestep'
  | 'pounce_crouch'
  | 'pounce_air'
  | 'blitz_windup'
  | 'blitz_rush'
  | 'slash1_windup'
  | 'slash1_hit'
  | 'slash2_windup'
  | 'slash2_hit'
  | 'xrend_windup'
  | 'xrend_hit'
  | 'tail_windup'
  | 'tail_hit'
  | 'spine_windup'
  | 'spine_fire'
  | 'mortar_windup'
  | 'mortar_fire'
  | 'backflip_air'
  | 'recover';

interface StalkerAiState {
  phase: StalkerPhase;
  timer: number;
  maxTimer: number;
  patrolIdx: number;
  pounceCooldown: number;
  clawCooldown: number;
  tailWhipCooldown: number;
  blitzCooldown: number;
  spineCooldown: number;
  mortarCooldown: number;
  backflipCooldown: number;
  sidestepCooldown: number;
  strafeSign: number;
  leapVx: number;
  leapVz: number;
  leapPeak: number;
  blitzDirX: number;
  blitzDirZ: number;
  hitDone: boolean;
  hitDone2: boolean;
  lastHp: number;
  damageBurstAccum: number;
}

const _origin = new THREE.Vector3();
const _jaw = new THREE.Vector3();
const _tail = new THREE.Vector3();
const _bladeL = new THREE.Vector3();
const _bladeR = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _slashDir = new THREE.Vector3();

let sharedStalkerTex: StalkerTextureSuite | null = null;
function getSharedStalkerTextures(): StalkerTextureSuite {
  if (!sharedStalkerTex) sharedStalkerTex = createStalkerTextures();
  return sharedStalkerTex;
}

export function createLeapingCarapaceStalkerBrain(
  mats: Floor05EnemyMaterials
): EnemyArchetypeBrain {
  return {
    config: LEAPING_CARAPACE_STALKER_CONFIG,
    createRig: (enemyId) =>
      buildLeapingCarapaceStalkerRig(enemyId, mats, getSharedStalkerTextures()),
    createAiState: (): Record<string, unknown> => ({
      phase: 'patrol',
      timer: 0,
      maxTimer: 1,
      patrolIdx: 0,
      pounceCooldown: 0.9 + Math.random() * 1.1,
      clawCooldown: 0.25,
      tailWhipCooldown: 1.8 + Math.random() * 1.2,
      blitzCooldown: 2.0 + Math.random() * 1.5,
      spineCooldown: 2.0 + Math.random() * 1.4,
      mortarCooldown: 3.0 + Math.random() * 1.6,
      backflipCooldown: 2.4,
      sidestepCooldown: 1.2,
      strafeSign: Math.random() < 0.5 ? -1 : 1,
      leapVx: 0,
      leapVz: 0,
      leapPeak: 2.3,
      blitzDirX: 0,
      blitzDirZ: -1,
      hitDone: false,
      hitDone2: false,
      lastHp: LEAPING_CARAPACE_STALKER_CONFIG.maxHp,
      damageBurstAccum: 0,
    }),
    stepAi(ctx: EnemyAiStepContext) {
      const ai = ctx.aiState as unknown as StalkerAiState;
      const rig = ctx.rig as LeapingCarapaceStalkerRigHandle;
      const { dt, elapsed, state, spatial, playerPos, world, callbacks, patrolPoints } = ctx;
      const cfg = LEAPING_CARAPACE_STALKER_CONFIG;

      // Track burst damage taken for reactive acrobatic backflip-evade
      if (state.hp < ai.lastHp) {
        ai.damageBurstAccum += ai.lastHp - state.hp;
      }
      ai.lastHp = state.hp;
      ai.damageBurstAccum = Math.max(0, ai.damageBurstAccum - dt * 26);

      const enraged = state.hp <= state.maxHp * 0.55;
      const windupMul = enraged ? 0.85 : 1.0;

      ai.pounceCooldown = Math.max(0, ai.pounceCooldown - dt);
      ai.clawCooldown = Math.max(0, ai.clawCooldown - dt);
      ai.tailWhipCooldown = Math.max(0, ai.tailWhipCooldown - dt);
      ai.blitzCooldown = Math.max(0, ai.blitzCooldown - dt);
      ai.spineCooldown = Math.max(0, ai.spineCooldown - dt);
      ai.mortarCooldown = Math.max(0, ai.mortarCooldown - dt);
      ai.backflipCooldown = Math.max(0, ai.backflipCooldown - dt);
      ai.sidestepCooldown = Math.max(0, ai.sidestepCooldown - dt);

      if (state.staggerTimer > 0) {
        ai.phase = 'prowl';
        rig.setPoseMode('prowl');
        rig.setPredatorCharge(0.1, enraged);
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
          phase: enraged ? 2 : 1,
          airborneHeight: 0,
        });
        return;
      }

      const dx = playerPos.x - spatial.x;
      const dy = playerPos.y + 1.15 - (spatial.y + 1.25);
      const dz = playerPos.z - spatial.z;
      const horizDist = Math.hypot(dx, dz);
      const vertDist = Math.abs(playerPos.y - spatial.y);

      const hasLos =
        horizDist <= cfg.detectRange &&
        hasEnemyLineOfSight(
          spatial.x,
          spatial.y + 1.25,
          spatial.z,
          playerPos.x,
          playerPos.y + 1.2,
          playerPos.z,
          world
        );

      if (hasLos || horizDist < 19.0 || state.hp < state.maxHp) {
        state.engaged = true;
      }

      const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);
      const dirX = horizDist > 0.01 ? dx / horizDist : -Math.sin(spatial.yaw);
      const dirZ = horizDist > 0.01 ? dz / horizDist : -Math.cos(spatial.yaw);

      let desVx = 0;
      let desVz = 0;
      let attackProgress = 0;
      let airborneHeight = 0;
      let poseMode: StalkerPoseMode = 'prowl';
      let localMoveX = 0;
      let predatorCharge = enraged ? 0.55 : 0.22;

      if (!state.engaged) {
        state.behavior = 'patrol';
        if (patrolPoints.length > 0) {
          const wp = patrolPoints[ai.patrolIdx % patrolPoints.length];
          const pdx = wp.x - spatial.x;
          const pdz = wp.z - spatial.z;
          const pdist = Math.hypot(pdx, pdz);
          if (pdist < 0.9) {
            ai.patrolIdx = (ai.patrolIdx + 1) % patrolPoints.length;
          } else {
            desVx = (pdx / pdist) * cfg.moveSpeed * 0.56;
            desVz = (pdz / pdist) * cfg.moveSpeed * 0.56;
            spatial.yaw = rotateYawTowards(
              spatial.yaw,
              computeFacingYaw(spatial.x, spatial.z, wp.x, wp.z),
              5.6,
              dt
            );
          }
        }
      } else if (ai.phase === 'patrol' || ai.phase === 'prowl') {
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.8, dt);
        const action = selectStalkerAction({
          horizDist,
          vertDist,
          hasLos,
          hasAttackToken: ctx.hasAttackToken,
          pounceCooldown: ai.pounceCooldown,
          clawCooldown: ai.clawCooldown,
          spineCooldown: ai.spineCooldown,
          sidestepCooldown: ai.sidestepCooldown,
          tailWhipCooldown: ai.tailWhipCooldown,
          blitzCooldown: ai.blitzCooldown,
          mortarCooldown: ai.mortarCooldown,
          backflipCooldown: ai.backflipCooldown,
          damageBurstAccum: ai.damageBurstAccum,
          enraged,
          roll: Math.random(),
        });

        if (action === 'backflip_venom_reposition') {
          ai.damageBurstAccum = 0;
          ai.strafeSign = Math.random() < 0.5 ? -1 : 1;
          const bf = solveStalkerBackflip(-dirX, -dirZ, ai.strafeSign, 0.48);
          ai.leapVx = bf.vx;
          ai.leapVz = bf.vz;
          ai.leapPeak = bf.peakHeight;
          ai.phase = 'backflip_air';
          ai.timer = 0.48;
          ai.maxTimer = 0.48;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('dash');
          rig.getWeakpointWorldPos(_origin);
          callbacks.spawnBoosterBurst(_origin, _dir.set(dirX, 0.4, dirZ).normalize(), 0x84ff4d, 8);
        } else if (action === 'tail_whip_spin') {
          ai.phase = 'tail_windup';
          ai.timer = 0.34 * windupMul;
          ai.maxTimer = ai.timer;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('melee');
          rig.getTailTipWorldPos(_tail);
          callbacks.spawnPerilGlint(_tail, 0x39ff14);
          callbacks.spawnProjectileImpactSparks(_tail, _up, 0x39ff14);
        } else if (action === 'rend_claw_flurry') {
          ai.phase = 'slash1_windup';
          ai.timer = 0.25 * windupMul;
          ai.maxTimer = ai.timer;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('melee');
          rig.getJawWorldPos(_jaw);
          callbacks.spawnPerilGlint(_jaw, 0x84ff4d);
        } else if (action === 'predator_blitz_rush') {
          ai.phase = 'blitz_windup';
          ai.timer = 0.32 * windupMul;
          ai.maxTimer = ai.timer;
          ai.hitDone = false;
          ai.hitDone2 = false;
          ai.strafeSign = -ai.strafeSign;
          ai.blitzDirX = dirX;
          ai.blitzDirZ = dirZ;
          callbacks.onTelegraphAudio('iaijutsu_glint');
          rig.getJawWorldPos(_jaw);
          callbacks.spawnPerilGlint(_jaw, 0xbef264);
          ctx.exposeWeakpoint(0.95);
        } else if (action === 'tier_pounce_leap') {
          ai.phase = 'pounce_crouch';
          ai.timer = 0.4 * windupMul;
          ai.maxTimer = ai.timer;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('dash');
          rig.getWeakpointWorldPos(_jaw);
          callbacks.spawnPerilGlint(_jaw, 0xa3ff3b);
          ctx.exposeWeakpoint(1.3);
        } else if (action === 'venom_mortar_lob') {
          ai.phase = 'mortar_windup';
          ai.timer = 0.52 * windupMul;
          ai.maxTimer = ai.timer;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('mortar');
          rig.getJawWorldPos(_jaw);
          callbacks.spawnPerilGlint(_jaw, 0x22c55e);
          ctx.exposeWeakpoint(0.95);
        } else if (action === 'acid_spine_volley') {
          ai.phase = 'spine_windup';
          ai.timer = 0.44 * windupMul;
          ai.maxTimer = ai.timer;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('mortar');
          rig.getJawWorldPos(_jaw);
          callbacks.spawnPerilGlint(_jaw, 0x34f57a);
        } else if (action === 'evasive_sidestep') {
          ai.phase = 'sidestep';
          ai.timer = 0.68;
          ai.maxTimer = 0.68;
          ai.strafeSign = -ai.strafeSign;
          ai.sidestepCooldown = 2.6 + Math.random() * 1.2;
        } else {
          state.behavior = 'chase';
          const spd = horizDist > 7.5 || enraged ? cfg.sprintSpeed : cfg.moveSpeed;
          desVx = dirX * spd + ctx.separation.x * 2.5;
          desVz = dirZ * spd + ctx.separation.y * 2.5;
        }
      } else if (ai.phase === 'sidestep') {
        state.behavior = 'strafe';
        poseMode = 'strafe';
        localMoveX = ai.strafeSign;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 9.6, dt);
        ai.timer -= dt;
        const speed = cfg.sprintSpeed * (enraged ? 1.08 : 0.96);
        desVx = (-dirZ * ai.strafeSign * 0.88 + dirX * 0.42) * speed;
        desVz = (dirX * ai.strafeSign * 0.88 + dirZ * 0.42) * speed;
        if (ai.timer <= 0) ai.phase = 'prowl';
      } else if (ai.phase === 'pounce_crouch') {
        state.behavior = 'windup';
        poseMode = 'crouch';
        predatorCharge = 1.05;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 10.5, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          const leap = solveStalkerPounce(dx, dz, 0.56);
          ai.leapVx = leap.vx;
          ai.leapVz = leap.vz;
          ai.leapPeak = leap.peakHeight;
          ai.phase = 'pounce_air';
          ai.timer = 0.56;
          ai.maxTimer = 0.56;
          rig.getWeakpointWorldPos(_origin);
          callbacks.spawnBoosterBurst(_origin, _dir.set(-dirX, 0.35, -dirZ).normalize(), 0x84ff4d, 10);
        }
      } else if (ai.phase === 'pounce_air') {
        state.behavior = 'attack';
        poseMode = 'pounce';
        predatorCharge = 1.3;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        airborneHeight = Math.sin(attackProgress * Math.PI) * ai.leapPeak;
        desVx = ai.leapVx;
        desVz = ai.leapVz;
        if (!ai.hitDone && (horizDist <= 3.0 || attackProgress >= 0.84)) {
          ai.hitDone = true;
          _origin.set(spatial.x, spatial.y + 0.95, spatial.z);
          callbacks.spawnBladeSlashArc(_origin, spatial.yaw, 0.45, 0.12, 2.85, 0x84ff4d, true, 1);
          callbacks.spawnBladeSlashArc(_origin, spatial.yaw, -0.45, 0.12, 2.85, 0x34f57a, true, -1);
          callbacks.spawnShockwave({
            center: new THREE.Vector3(spatial.x, spatial.y + 0.12, spatial.z),
            maxRadius: 4.2,
            expandSpeed: 13.5,
            damage: 16,
            color: 0x84ff4d,
            staggerStrength: 0.55,
          });
          _slashDir.set(dirX, 0, dirZ).normalize();
          callbacks.spawnSurfaceSlashScar(
            new THREE.Vector3(spatial.x + dirX * 0.9, spatial.y + 0.04, spatial.z + dirZ * 0.9),
            _up,
            _slashDir,
            true
          );
          callbacks.spawnRailImpactCrater(
            new THREE.Vector3(spatial.x, spatial.y + 0.04, spatial.z),
            _up,
            0x39ff14
          );
          callbacks.onTelegraphAudio('boss_slam');
          callbacks.onKatanaSlashAudio?.(true);
          if (horizDist <= 3.5 && vertDist <= 2.5) {
            callbacks.applyPlayerMeleeHit(24, _origin, 0.78);
          }
        }
        if (ai.timer <= 0) {
          ai.pounceCooldown = (enraged ? 3.2 : 4.1) + Math.random() * 1.4;
          // Enraged predator chains pounce landing straight into brutal X-Rend if player is still close!
          if (enraged && horizDist <= 4.3 && vertDist <= 2.3) {
            ai.phase = 'xrend_windup';
            ai.timer = 0.24;
            ai.maxTimer = 0.24;
            ai.hitDone = false;
            callbacks.onTelegraphAudio('melee');
          } else {
            ai.phase = 'recover';
            ai.timer = 0.42;
            ai.maxTimer = 0.42;
          }
        }
      } else if (ai.phase === 'blitz_windup') {
        state.behavior = 'windup';
        poseMode = 'crouch';
        predatorCharge = 1.1;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 11.0, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.blitzDirX = dirX;
          ai.blitzDirZ = dirZ;
          ai.phase = 'blitz_rush';
          ai.timer = 0.52;
          ai.maxTimer = 0.52;
          rig.getWeakpointWorldPos(_origin);
          callbacks.spawnBoosterBurst(_origin, _dir.set(-dirX, 0.2, -dirZ).normalize(), 0xa3ff3b, 10);
          callbacks.onTelegraphAudio('booster_burst');
        }
      } else if (ai.phase === 'blitz_rush') {
        state.behavior = 'attack';
        poseMode = 'blitz';
        predatorCharge = 1.35;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        // High-speed jagged zig-zag predator dash
        const zig = Math.sin(attackProgress * Math.PI * 2) * ai.strafeSign * 0.58;
        const sideX = -ai.blitzDirZ;
        const sideZ = ai.blitzDirX;
        const dashSpd = enraged ? 16.5 : 14.5;
        desVx = (ai.blitzDirX + sideX * zig) * dashSpd;
        desVz = (ai.blitzDirZ + sideZ * zig) * dashSpd;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 9.5, dt);

        if (!ai.hitDone && (horizDist <= 3.1 || attackProgress >= 0.48)) {
          ai.hitDone = true;
          _origin.set(spatial.x, spatial.y + 1.0, spatial.z);
          callbacks.spawnBladeSlashArc(_origin, spatial.yaw, 0.35, 0.06, 2.75, 0xa3ff3b, false, 1);
          callbacks.onKatanaSlashAudio?.(false);
          if (horizDist <= 3.3 && vertDist <= 2.2) {
            callbacks.applyPlayerMeleeHit(17, _origin, 0.52);
          }
        }
        if (!ai.hitDone2 && attackProgress >= 0.8) {
          ai.hitDone2 = true;
          _origin.set(spatial.x, spatial.y + 1.0, spatial.z);
          callbacks.spawnBladeSlashArc(_origin, spatial.yaw, -0.35, 0.08, 2.9, 0x34f57a, true, -1);
          _slashDir.set(dirX, 0, dirZ).normalize();
          callbacks.spawnSurfaceSlashScar(
            new THREE.Vector3(spatial.x + dirX * 1.0, spatial.y + 0.04, spatial.z + dirZ * 1.0),
            _up,
            _slashDir,
            true
          );
          rig.getWeakpointWorldPos(_jaw);
          callbacks.spawnBoosterBurst(_jaw, _dir.set(-dirX, 0.25, -dirZ).normalize(), 0x39ff14, 7);
          callbacks.onKatanaSlashAudio?.(true);
          if (horizDist <= 3.45 && vertDist <= 2.2) {
            callbacks.applyPlayerMeleeHit(19, _origin, 0.62);
          }
        }
        if (ai.timer <= 0) {
          ai.blitzCooldown = (enraged ? 3.8 : 4.8) + Math.random() * 1.4;
          ai.phase = 'recover';
          ai.timer = 0.4;
          ai.maxTimer = 0.4;
        }
      } else if (ai.phase === 'slash1_windup') {
        state.behavior = 'windup';
        poseMode = 'slash1';
        predatorCharge = 0.9;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 10.0, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.phase = 'slash1_hit';
          ai.timer = 0.22;
          ai.maxTimer = 0.22;
        }
      } else if (ai.phase === 'slash1_hit') {
        state.behavior = 'attack';
        poseMode = 'slash1';
        predatorCharge = 1.15;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        desVx = dirX * 5.8;
        desVz = dirZ * 5.8;
        if (!ai.hitDone && attackProgress >= 0.34) {
          ai.hitDone = true;
          _origin.set(spatial.x, spatial.y + 1.05, spatial.z);
          callbacks.spawnBladeSlashArc(_origin, spatial.yaw, 0.42, 0.08, 2.55, 0x84ff4d, false, 1);
          callbacks.onKatanaSlashAudio?.(false);
          if (horizDist <= 3.3 && vertDist <= 2.2) {
            callbacks.applyPlayerMeleeHit(15, _origin, 0.46);
          }
        }
        if (ai.timer <= 0) {
          if (horizDist <= 4.8) {
            ai.phase = 'slash2_windup';
            ai.timer = 0.18 * windupMul;
            ai.maxTimer = ai.timer;
            ai.hitDone = false;
          } else {
            ai.clawCooldown = 1.25;
            ai.phase = 'recover';
            ai.timer = 0.36;
            ai.maxTimer = 0.36;
          }
        }
      } else if (ai.phase === 'slash2_windup') {
        state.behavior = 'windup';
        poseMode = 'slash2';
        predatorCharge = 1.05;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 10.5, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.phase = 'slash2_hit';
          ai.timer = 0.22;
          ai.maxTimer = 0.22;
        }
      } else if (ai.phase === 'slash2_hit') {
        state.behavior = 'attack';
        poseMode = 'slash2';
        predatorCharge = 1.2;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        desVx = dirX * 6.4;
        desVz = dirZ * 6.4;
        if (!ai.hitDone && attackProgress >= 0.32) {
          ai.hitDone = true;
          _origin.set(spatial.x, spatial.y + 1.05, spatial.z);
          callbacks.spawnBladeSlashArc(_origin, spatial.yaw, -0.45, 0.1, 2.65, 0xa3ff3b, false, -1);
          callbacks.onKatanaSlashAudio?.(false);
          if (horizDist <= 3.4 && vertDist <= 2.2) {
            callbacks.applyPlayerMeleeHit(17, _origin, 0.54);
          }
        }
        if (ai.timer <= 0) {
          // 3rd hit X-Rend Finisher when prey stays in melee!
          if (horizDist <= 4.5) {
            ai.phase = 'xrend_windup';
            ai.timer = 0.26 * windupMul;
            ai.maxTimer = ai.timer;
            ai.hitDone = false;
            rig.getJawWorldPos(_jaw);
            rig.getLeftBladeWorldPos(_bladeL);
            rig.getRightBladeWorldPos(_bladeR);
            callbacks.spawnPerilGlint(_jaw, 0x39ff14);
            callbacks.spawnProjectileImpactSparks(_bladeL, _up, 0x39ff14);
            callbacks.spawnProjectileImpactSparks(_bladeR, _up, 0x39ff14);
          } else {
            ai.clawCooldown = 1.45 + Math.random() * 0.5;
            ai.phase = 'recover';
            ai.timer = 0.42;
            ai.maxTimer = 0.42;
          }
        }
      } else if (ai.phase === 'xrend_windup') {
        state.behavior = 'windup';
        poseMode = 'x_rend';
        predatorCharge = 1.3;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 10.5, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.phase = 'xrend_hit';
          ai.timer = 0.28;
          ai.maxTimer = 0.28;
        }
      } else if (ai.phase === 'xrend_hit') {
        state.behavior = 'attack';
        poseMode = 'x_rend';
        predatorCharge = 1.45;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        desVx = dirX * 7.6;
        desVz = dirZ * 7.6;
        if (!ai.hitDone && attackProgress >= 0.34) {
          ai.hitDone = true;
          _origin.set(spatial.x, spatial.y + 1.05, spatial.z);
          callbacks.spawnBladeSlashArc(_origin, spatial.yaw, 0.62, 0.14, 2.95, 0xa3ff3b, true, 1);
          callbacks.spawnBladeSlashArc(_origin, spatial.yaw, -0.62, 0.14, 2.95, 0x34f57a, true, -1);
          _slashDir.set(dirX, 0, dirZ).normalize();
          callbacks.spawnSurfaceSlashScar(
            new THREE.Vector3(spatial.x + dirX * 1.1, spatial.y + 0.04, spatial.z + dirZ * 1.1),
            _up,
            _slashDir,
            true
          );
          callbacks.onKatanaSlashAudio?.(true);
          if (horizDist <= 3.65 && vertDist <= 2.3) {
            callbacks.applyPlayerMeleeHit(24, _origin, 0.78);
          }
        }
        if (ai.timer <= 0) {
          ai.clawCooldown = (enraged ? 1.35 : 1.75) + Math.random() * 0.55;
          ai.phase = 'recover';
          ai.timer = 0.46;
          ai.maxTimer = 0.46;
        }
      } else if (ai.phase === 'tail_windup') {
        state.behavior = 'windup';
        poseMode = 'tail_whip';
        predatorCharge = 1.15;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 9.5, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.phase = 'tail_hit';
          ai.timer = 0.34;
          ai.maxTimer = 0.34;
        }
      } else if (ai.phase === 'tail_hit') {
        state.behavior = 'attack';
        poseMode = 'tail_whip';
        predatorCharge = 1.35;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        desVx = dirX * 2.8;
        desVz = dirZ * 2.8;
        if (!ai.hitDone && attackProgress >= 0.38) {
          ai.hitDone = true;
          _origin.set(spatial.x, spatial.y + 0.85, spatial.z);
          callbacks.spawnBladeSlashArc(_origin, spatial.yaw, 0.04, 0.0, 3.6, 0x34f57a, true, 1);
          callbacks.spawnShockwave({
            center: new THREE.Vector3(spatial.x, spatial.y + 0.16, spatial.z),
            maxRadius: 4.3,
            expandSpeed: 15.0,
            damage: 14,
            color: 0x34f57a,
            staggerStrength: 0.65,
          });
          _slashDir.set(-dirZ, 0, dirX).normalize();
          callbacks.spawnSurfaceSlashScar(
            new THREE.Vector3(spatial.x, spatial.y + 0.04, spatial.z),
            _up,
            _slashDir,
            true
          );
          callbacks.onKatanaSlashAudio?.(true);
          if (horizDist <= 3.9 && vertDist <= 2.3) {
            callbacks.applyPlayerMeleeHit(22, _origin, 0.82);
          }
        }
        if (ai.timer <= 0) {
          ai.tailWhipCooldown = (enraged ? 3.2 : 4.2) + Math.random() * 1.2;
          ai.phase = 'recover';
          ai.timer = 0.44;
          ai.maxTimer = 0.44;
        }
      } else if (ai.phase === 'spine_windup') {
        state.behavior = 'windup';
        poseMode = 'spit';
        predatorCharge = 1.1;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.2, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.phase = 'spine_fire';
          ai.timer = 0.28;
          ai.maxTimer = 0.28;
        }
      } else if (ai.phase === 'spine_fire') {
        state.behavior = 'attack';
        poseMode = 'spit';
        predatorCharge = 1.25;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (!ai.hitDone && attackProgress >= 0.24) {
          ai.hitDone = true;
          rig.getJawWorldPos(_jaw);
          const pitch = Math.atan2(dy, Math.max(1, horizDist));
          const cosP = Math.cos(pitch);
          const sinP = Math.sin(pitch);
          const fan = computeSpineFanAngles(enraged ? 5 : 3);
          for (let i = 0; i < fan.length; i++) {
            const yawOff = spatial.yaw + fan[i];
            _dir.set(-Math.sin(yawOff) * cosP, sinP, -Math.cos(yawOff) * cosP).normalize();
            callbacks.spawnProjectile({
              origin: _jaw.clone(),
              direction: _dir.clone(),
              speed: enraged ? 26.0 : 23.5,
              damage: 13,
              kind: 'plasma_bolt',
              color: 0x84ff4d,
              radius: 0.16,
              staggerStrength: 0.34,
            });
          }
          callbacks.spawnMuzzleFlash(_jaw, _dir, 0xa3ff3b, enraged);
          callbacks.onFireAudio('shotgun');
        }
        if (ai.timer <= 0) {
          ai.spineCooldown = (enraged ? 3.0 : 3.8) + Math.random() * 1.4;
          ai.phase = 'recover';
          ai.timer = 0.4;
          ai.maxTimer = 0.4;
        }
      } else if (ai.phase === 'mortar_windup') {
        state.behavior = 'windup';
        poseMode = 'mortar';
        predatorCharge = 1.2;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 7.6, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.phase = 'mortar_fire';
          ai.timer = 0.32;
          ai.maxTimer = 0.32;
        }
      } else if (ai.phase === 'mortar_fire') {
        state.behavior = 'attack';
        poseMode = 'mortar';
        predatorCharge = 1.3;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (!ai.hitDone && attackProgress >= 0.25) {
          ai.hitDone = true;
          rig.getJawWorldPos(_jaw);
          const gravity = 16.0;
          const lob = solveStalkerVenomLob(
            _jaw.x,
            _jaw.y,
            _jaw.z,
            playerPos.x,
            playerPos.y + 0.35,
            playerPos.z,
            gravity,
            0.9
          );
          const speed = Math.hypot(lob.vx, lob.vy, lob.vz);
          _dir.set(lob.vx, lob.vy, lob.vz).normalize();
          callbacks.spawnProjectile({
            origin: _jaw.clone(),
            direction: _dir.clone(),
            speed,
            damage: 20,
            kind: 'mortar_canister',
            color: 0x34f57a,
            radius: 0.26,
            gravity,
            splashRadius: 3.4,
            staggerStrength: 0.62,
          });
          callbacks.spawnMuzzleFlash(_jaw, _dir, 0x39ff14, true);
          rig.getWeakpointWorldPos(_origin);
          callbacks.spawnBoosterBurst(_origin, _up, 0x34f57a, 8);
          callbacks.onFireAudio('mortar');
        }
        if (ai.timer <= 0) {
          ai.mortarCooldown = (enraged ? 4.4 : 5.6) + Math.random() * 1.6;
          ai.phase = 'recover';
          ai.timer = 0.44;
          ai.maxTimer = 0.44;
        }
      } else if (ai.phase === 'backflip_air') {
        state.behavior = 'attack';
        poseMode = 'backflip';
        predatorCharge = 1.1;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 11.0, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        airborneHeight = Math.sin(attackProgress * Math.PI) * ai.leapPeak;
        desVx = ai.leapVx;
        desVz = ai.leapVz;
        // Fire 2 parting venom spines mid-air at apex of backflip!
        if (!ai.hitDone && attackProgress >= 0.44) {
          ai.hitDone = true;
          rig.getJawWorldPos(_jaw);
          const pitch = Math.atan2(dy - airborneHeight, Math.max(1.2, horizDist));
          const cosP = Math.cos(pitch);
          const sinP = Math.sin(pitch);
          const fan = computeSpineFanAngles(2);
          for (let i = 0; i < fan.length; i++) {
            const yawOff = spatial.yaw + fan[i];
            _dir.set(-Math.sin(yawOff) * cosP, sinP, -Math.cos(yawOff) * cosP).normalize();
            callbacks.spawnProjectile({
              origin: _jaw.clone(),
              direction: _dir.clone(),
              speed: 24.5,
              damage: 12,
              kind: 'plasma_bolt',
              color: 0xa3ff3b,
              radius: 0.15,
              staggerStrength: 0.28,
            });
          }
          callbacks.spawnMuzzleFlash(_jaw, _dir, 0xa3ff3b, false);
          callbacks.onFireAudio('shotgun');
        }
        if (ai.timer <= 0) {
          ai.backflipCooldown = 4.6 + Math.random() * 1.6;
          ai.phase = 'prowl';
        }
      } else if (ai.phase === 'recover') {
        state.behavior = 'recover';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 5.2, dt);
        ai.timer -= dt;
        if (ai.timer <= 0) ai.phase = 'prowl';
      }

      rig.setPoseMode(poseMode);
      rig.setPredatorCharge(predatorCharge, enraged);
      stepEnemyMovement(spatial, desVx, desVz, world, dt, F5_MIN_FLOOR_Y);
      const speed = Math.hypot(spatial.vx, spatial.vz);

      rig.updateAnimation({
        dt,
        elapsed,
        behavior: state.behavior,
        speedRatio: speed / cfg.moveSpeed,
        localMoveX,
        localMoveZ: speed / cfg.moveSpeed,
        aimPitch: 0,
        attackProgress,
        attackVariant: 0,
        flinchTimer: state.flinchTimer,
        flinchDirX: state.flinchDirX,
        staggerTimer: 0,
        deadProgress: 0,
        weakpointExposed: state.weakpoint.exposed,
        weakpointBroken: state.weakpoint.broken,
        shieldActive: false,
        phase: enraged ? 2 : 1,
        airborneHeight,
      });
    },
  };
}
