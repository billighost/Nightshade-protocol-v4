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
import { APEX_ARENA_MARAUDER_BOSS_CONFIG } from './config';
import {
  buildApexArenaMarauderBossRig,
  type ApexArenaMarauderRigHandle,
  type MarauderPoseMode,
} from './mesh';
import {
  computeMarauderAxeWaveAngles,
  computeMarauderShotgunSpread,
  selectMarauderAction,
  solveMarauderCataclysmLeap,
} from './tactics';
import { createMarauderTextures, type MarauderTextureSuite } from './textures';

const F5_MIN_FLOOR_Y = F5_PIT_Y - 0.6;

type MarauderPhase =
  | 'stalk'
  | 'parry_march'
  | 'dash_windup'
  | 'dash_cleave1'
  | 'dash_cleave2'
  | 'shotgun_windup'
  | 'shotgun_fire'
  | 'wave_windup'
  | 'wave_release'
  | 'leap_crouch'
  | 'leap_air'
  | 'leap_impact'
  | 'salvo_windup'
  | 'salvo_fire'
  | 'recover';

interface MarauderAiState {
  phase: MarauderPhase;
  timer: number;
  maxTimer: number;
  dashCleaveCooldown: number;
  shotgunCooldown: number;
  axeWaveCooldown: number;
  leapCooldown: number;
  parryCooldown: number;
  salvoCooldown: number;
  moveVx: number;
  moveVz: number;
  leapPeak: number;
  hitDone: boolean;
  salvoShotsLeft: number;
  salvoShotTimer: number;
  lastHp: number;
  damageBurstAccum: number;
}

const _origin = new THREE.Vector3();
const _tip = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

let sharedMarauderTex: MarauderTextureSuite | null = null;
function getSharedMarauderTextures(): MarauderTextureSuite {
  if (!sharedMarauderTex) sharedMarauderTex = createMarauderTextures();
  return sharedMarauderTex;
}

export function createApexArenaMarauderBossBrain(
  mats: Floor05EnemyMaterials
): EnemyArchetypeBrain {
  return {
    config: APEX_ARENA_MARAUDER_BOSS_CONFIG,
    createRig: (enemyId) =>
      buildApexArenaMarauderBossRig(enemyId, mats, getSharedMarauderTextures()),
    createAiState: (): Record<string, unknown> => ({
      phase: 'stalk',
      timer: 0,
      maxTimer: 1,
      dashCleaveCooldown: 1.0,
      shotgunCooldown: 2.0,
      axeWaveCooldown: 1.8,
      leapCooldown: 3.4,
      parryCooldown: 2.6,
      salvoCooldown: 2.5,
      moveVx: 0,
      moveVz: 0,
      leapPeak: 3.2,
      hitDone: false,
      salvoShotsLeft: 0,
      salvoShotTimer: 0,
      lastHp: APEX_ARENA_MARAUDER_BOSS_CONFIG.maxHp,
      damageBurstAccum: 0,
    }),
    stepAi(ctx: EnemyAiStepContext) {
      const ai = ctx.aiState as unknown as MarauderAiState;
      const rig = ctx.rig as ApexArenaMarauderRigHandle;
      const { dt, elapsed, state, spatial, playerPos, world, callbacks } = ctx;
      const cfg = APEX_ARENA_MARAUDER_BOSS_CONFIG;
      const p2 = state.phase === 2;
      const cdRate = p2 ? 1.32 : 1.0;

      ai.dashCleaveCooldown = Math.max(0, ai.dashCleaveCooldown - dt * cdRate);
      ai.shotgunCooldown = Math.max(0, ai.shotgunCooldown - dt * cdRate);
      ai.axeWaveCooldown = Math.max(0, ai.axeWaveCooldown - dt * cdRate);
      ai.leapCooldown = Math.max(0, ai.leapCooldown - dt * cdRate);
      ai.parryCooldown = Math.max(0, ai.parryCooldown - dt * cdRate);
      ai.salvoCooldown = Math.max(0, ai.salvoCooldown - dt * cdRate);
      ai.damageBurstAccum = Math.max(0, ai.damageBurstAccum - dt * 42);

      const dmgDelta = ai.lastHp - state.hp;
      ai.lastHp = state.hp;
      if (dmgDelta > 1) {
        state.engaged = true;
        ai.damageBurstAccum += dmgDelta;
      }

      // Boss is always alert once manifested in the Coliseum!
      state.engaged = true;

      if (state.staggerTimer > 0) {
        ai.phase = 'stalk';
        state.shieldActive = false;
        rig.setPoseMode('stalk');
        rig.setAxeCharge(0);
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
          phase: state.phase,
          airborneHeight: 0,
        });
        return;
      }

      const dx = playerPos.x - spatial.x;
      const dy = playerPos.y + 1.15 - (spatial.y + 1.85);
      const dz = playerPos.z - spatial.z;
      const horizDist = Math.hypot(dx, dz);
      const vertDist = Math.abs(playerPos.y - spatial.y);

      const hasLos =
        horizDist <= cfg.detectRange &&
        hasEnemyLineOfSight(
          spatial.x,
          spatial.y + 2.0,
          spatial.z,
          playerPos.x,
          playerPos.y + 1.25,
          playerPos.z,
          world
        );

      const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);
      const dirX = horizDist > 0.01 ? dx / horizDist : -Math.sin(spatial.yaw);
      const dirZ = horizDist > 0.01 ? dz / horizDist : -Math.cos(spatial.yaw);

      let desVx = 0;
      let desVz = 0;
      let attackProgress = 0;
      let airborneHeight = 0;
      let poseMode: MarauderPoseMode = 'stalk';
      let axeCharge = p2 ? 0.6 : 0.2;
      let shieldUp = false;

      if (ai.phase === 'stalk') {
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 7.6, dt);
        const action = selectMarauderAction({
          horizDist,
          vertDist,
          hasLos,
          phase: state.phase,
          dashCleaveCooldown: ai.dashCleaveCooldown,
          shotgunCooldown: ai.shotgunCooldown,
          axeWaveCooldown: ai.axeWaveCooldown,
          leapCooldown: ai.leapCooldown,
          parryCooldown: ai.parryCooldown,
          salvoCooldown: ai.salvoCooldown,
          damageBurstAccum: ai.damageBurstAccum,
          roll: Math.random(),
        });

        if (action === 'aegis_parry_advance') {
          ai.phase = 'parry_march';
          ai.timer = 1.6;
          ai.maxTimer = 1.6;
          ai.damageBurstAccum = 0;
          ai.parryCooldown = 6.2;
          callbacks.onTelegraphAudio('shield_charge');
        } else if (action === 'marauder_dash_cleave') {
          ai.phase = 'dash_windup';
          ai.timer = p2 ? 0.36 : 0.44;
          ai.maxTimer = ai.timer;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('iaijutsu_glint');
          rig.getAxeTipWorldPos(_tip);
          callbacks.spawnPerilGlint(_tip, 0x22c55e); // Iconic Marauder emerald parry-glint telegraph!
        } else if (action === 'war_shotgun_scatter') {
          ai.phase = 'shotgun_windup';
          ai.timer = 0.34;
          ai.maxTimer = 0.34;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('pyro_flare');
          rig.getShotgunMuzzleWorldPos(_tip);
          callbacks.spawnPerilGlint(_tip, 0xfbbf24);
        } else if (action === 'apex_leap_cataclysm') {
          ai.phase = 'leap_crouch';
          ai.timer = 0.48;
          ai.maxTimer = 0.48;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('boss_slam');
          rig.getWeakpointWorldPos(_origin);
          callbacks.spawnPerilGlint(_origin, 0xff3b2f);
        } else if (action === 'spectral_hound_salvo') {
          ai.phase = 'salvo_windup';
          ai.timer = 0.56;
          ai.maxTimer = 0.56;
          ai.salvoShotsLeft = 4;
          ai.salvoShotTimer = 0;
          callbacks.onTelegraphAudio('kestrel_overdrive');
        } else if (action === 'argent_axe_wave') {
          ai.phase = 'wave_windup';
          ai.timer = p2 ? 0.44 : 0.54;
          ai.maxTimer = ai.timer;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('iaijutsu_glint');
          rig.getAxeTipWorldPos(_tip);
          callbacks.spawnPerilGlint(_tip, 0xff3b2f);
        } else {
          state.behavior = 'chase';
          const spd = horizDist > 9.0 ? cfg.sprintSpeed : cfg.moveSpeed;
          desVx = dirX * spd * (p2 ? 1.15 : 1.0);
          desVz = dirZ * spd * (p2 ? 1.15 : 1.0);
        }
      } else if (ai.phase === 'parry_march') {
        state.behavior = 'chase';
        poseMode = 'parry_guard';
        shieldUp = true;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.2, dt);
        ai.timer -= dt;
        desVx = dirX * (cfg.moveSpeed * 0.95);
        desVz = dirZ * (cfg.moveSpeed * 0.95);
        if (horizDist <= 5.2 && vertDist <= 2.6) {
          ai.phase = 'dash_windup';
          ai.timer = 0.3;
          ai.maxTimer = 0.3;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('iaijutsu_glint');
        } else if (ai.timer <= 0) {
          ai.phase = 'stalk';
        }
      } else if (ai.phase === 'dash_windup') {
        state.behavior = 'windup';
        poseMode = 'dash_cleave1';
        axeCharge = 1.1;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 9.5, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.moveVx = dirX * (p2 ? 19.0 : 16.5);
          ai.moveVz = dirZ * (p2 ? 19.0 : 16.5);
          ai.phase = 'dash_cleave1';
          ai.timer = 0.36;
          ai.maxTimer = 0.36;
          ai.hitDone = false;
        }
      } else if (ai.phase === 'dash_cleave1') {
        state.behavior = 'attack';
        poseMode = 'dash_cleave1';
        axeCharge = 1.6;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        desVx = ai.moveVx;
        desVz = ai.moveVz;
        if (!ai.hitDone && (horizDist <= 4.1 || attackProgress >= 0.45)) {
          ai.hitDone = true;
          _origin.set(spatial.x, spatial.y + 1.65, spatial.z);
          callbacks.spawnBladeSlashArc(_origin, spatial.yaw, 0.24, 0.05, 4.1, 0xff3b2f, true, 1);
          callbacks.onKatanaSlashAudio?.(true);
          if (horizDist <= 4.5 && vertDist <= 2.5) {
            callbacks.applyPlayerMeleeHit(p2 ? 32 : 26, _origin, 0.85);
          }
        }
        if (ai.timer <= 0) {
          ai.phase = 'dash_cleave2';
          ai.timer = 0.36;
          ai.maxTimer = 0.36;
          ai.hitDone = false;
          spatial.yaw = targetYaw;
        }
      } else if (ai.phase === 'dash_cleave2') {
        state.behavior = 'attack';
        poseMode = 'dash_cleave2';
        axeCharge = 1.75;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        desVx = dirX * 7.5;
        desVz = dirZ * 7.5;
        if (!ai.hitDone && attackProgress >= 0.32) {
          ai.hitDone = true;
          _origin.set(spatial.x, spatial.y + 1.7, spatial.z);
          callbacks.spawnBladeSlashArc(_origin, spatial.yaw, -0.46, 0.1, 4.25, 0xfbbf24, true, -1);
          callbacks.onKatanaSlashAudio?.(true);
          if (horizDist <= 4.6 && vertDist <= 2.5) {
            callbacks.applyPlayerMeleeHit(p2 ? 36 : 30, _origin, 0.92);
          }
          ctx.exposeWeakpoint(1.9);
        }
        if (ai.timer <= 0) {
          ai.dashCleaveCooldown = p2 ? 2.8 : 3.8;
          ai.phase = 'recover';
          ai.timer = 0.72;
          ai.maxTimer = 0.72;
        }
      } else if (ai.phase === 'shotgun_windup') {
        state.behavior = 'windup';
        poseMode = 'shotgun';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.8, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.phase = 'shotgun_fire';
          ai.timer = 0.28;
          ai.maxTimer = 0.28;
        }
      } else if (ai.phase === 'shotgun_fire') {
        state.behavior = 'attack';
        poseMode = 'shotgun';
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (!ai.hitDone && attackProgress >= 0.18) {
          ai.hitDone = true;
          rig.getShotgunMuzzleWorldPos(_tip);
          const basePitch = Math.atan2(dy, Math.max(1, horizDist));
          const spread = computeMarauderShotgunSpread();
          for (let i = 0; i < spread.length; i++) {
            const p = basePitch + spread[i].pitch;
            const yOff = spatial.yaw + spread[i].yaw;
            _dir.set(-Math.sin(yOff) * Math.cos(p), Math.sin(p), -Math.cos(yOff) * Math.cos(p)).normalize();
            callbacks.spawnProjectile({
              origin: _tip.clone(),
              direction: _dir.clone(),
              speed: 27.5,
              damage: 11,
              kind: 'shotgun_pellet',
              color: 0xfbbf24,
              radius: 0.15,
              staggerStrength: 0.36,
            });
          }
          callbacks.spawnMuzzleFlash(_tip, _dir, 0xfbbf24, true);
          callbacks.onFireAudio('shotgun');
        }
        if (ai.timer <= 0) {
          ai.shotgunCooldown = p2 ? 3.2 : 4.2;
          ai.phase = 'recover';
          ai.timer = 0.45;
          ai.maxTimer = 0.45;
        }
      } else if (ai.phase === 'wave_windup') {
        state.behavior = 'windup';
        poseMode = 'axe_wave';
        axeCharge = 1.3;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 7.8, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.phase = 'wave_release';
          ai.timer = 0.34;
          ai.maxTimer = 0.34;
        }
      } else if (ai.phase === 'wave_release') {
        state.behavior = 'attack';
        poseMode = 'axe_wave';
        axeCharge = 1.65;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (!ai.hitDone && attackProgress >= 0.22) {
          ai.hitDone = true;
          rig.getAxeTipWorldPos(_tip);
          callbacks.spawnBladeSlashArc(_tip, spatial.yaw, 0.06, 0, 4.3, 0xff3b2f, true, 1);
          callbacks.onKatanaSlashAudio?.(true);
          const pitch = Math.atan2(dy, Math.max(1, horizDist));
          const cosP = Math.cos(pitch);
          const sinP = Math.sin(pitch);
          const angles = computeMarauderAxeWaveAngles(state.phase);
          for (let i = 0; i < angles.length; i++) {
            const yOff = spatial.yaw + angles[i];
            _dir.set(-Math.sin(yOff) * cosP, sinP, -Math.cos(yOff) * cosP).normalize();
            callbacks.spawnProjectile({
              origin: _tip.clone(),
              direction: _dir.clone(),
              speed: p2 ? 27.5 : 24.0,
              damage: 19,
              kind: 'boss_overdrive',
              color: i === Math.floor(angles.length / 2) ? 0xfef08a : 0xff3b2f,
              radius: 0.24,
              staggerStrength: 0.5,
            });
          }
        }
        if (ai.timer <= 0) {
          ai.axeWaveCooldown = p2 ? 3.8 : 4.8;
          ai.phase = 'recover';
          ai.timer = 0.55;
          ai.maxTimer = 0.55;
        }
      } else if (ai.phase === 'leap_crouch') {
        state.behavior = 'windup';
        poseMode = 'leap_crouch';
        axeCharge = 1.3;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.6, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          const leap = solveMarauderCataclysmLeap(dx, dz, 0.68);
          ai.moveVx = leap.vx;
          ai.moveVz = leap.vz;
          ai.leapPeak = leap.peakHeight;
          ai.phase = 'leap_air';
          ai.timer = 0.68;
          ai.maxTimer = 0.68;
          rig.getWeakpointWorldPos(_origin);
          callbacks.spawnBoosterBurst(_origin, _up, 0xff3b2f, 14);
        }
      } else if (ai.phase === 'leap_air') {
        state.behavior = 'windup';
        poseMode = 'leap_air';
        axeCharge = 1.75;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        airborneHeight = Math.sin(attackProgress * Math.PI) * ai.leapPeak;
        desVx = ai.moveVx;
        desVz = ai.moveVz;
        if (ai.timer <= 0) {
          ai.phase = 'leap_impact';
          ai.timer = 0.36;
          ai.maxTimer = 0.36;
        }
      } else if (ai.phase === 'leap_impact') {
        state.behavior = 'attack';
        poseMode = 'cataclysm_slam';
        axeCharge = 1.8;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (!ai.hitDone && attackProgress >= 0.16) {
          ai.hitDone = true;
          _origin.set(
            spatial.x - Math.sin(spatial.yaw) * 1.9,
            spatial.y + 0.14,
            spatial.z - Math.cos(spatial.yaw) * 1.9
          );
          callbacks.spawnShockwave({
            center: _origin.clone(),
            maxRadius: p2 ? 11.4 : 10.0,
            expandSpeed: 17.0,
            damage: p2 ? 38 : 32,
            color: 0xff3b2f,
            staggerStrength: 0.98,
          });
          callbacks.spawnRailImpactCrater(_origin, _up, 0xff3b2f);
          callbacks.onTelegraphAudio('boss_slam');
          ctx.exposeWeakpoint(2.8);
        }
        if (ai.timer <= 0) {
          ai.leapCooldown = p2 ? 6.4 : 7.8;
          ai.phase = 'recover';
          ai.timer = 1.15;
          ai.maxTimer = 1.15;
        }
      } else if (ai.phase === 'salvo_windup') {
        state.behavior = 'windup';
        poseMode = 'salvo';
        axeCharge = 1.6;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.0, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.phase = 'salvo_fire';
          ai.timer = 0.95;
          ai.maxTimer = 0.95;
        }
      } else if (ai.phase === 'salvo_fire') {
        state.behavior = 'attack';
        poseMode = 'salvo';
        axeCharge = 1.8;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.4, dt);
        ai.timer -= dt;
        ai.salvoShotTimer -= dt;
        if (ai.salvoShotsLeft > 0 && ai.salvoShotTimer <= 0) {
          ai.salvoShotsLeft -= 1;
          ai.salvoShotTimer = 0.2;
          rig.getAxeTipWorldPos(_tip);
          const pitch = Math.atan2(dy, Math.max(1, horizDist));
          const spread = (ai.salvoShotsLeft % 2 === 0 ? -0.06 : 0.06);
          const yOff = spatial.yaw + spread;
          _dir
            .set(-Math.sin(yOff) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yOff) * Math.cos(pitch))
            .normalize();
          callbacks.spawnProjectile({
            origin: _tip.clone(),
            direction: _dir.clone(),
            speed: 28.0,
            damage: 18,
            kind: 'boss_overdrive',
            color: 0xfef08a,
            radius: 0.24,
            staggerStrength: 0.52,
          });
          callbacks.onFireAudio('boss_carbine');
        }
        if (ai.timer <= 0) {
          ai.salvoCooldown = 6.2;
          ctx.exposeWeakpoint(2.2);
          ai.phase = 'recover';
          ai.timer = 0.82;
          ai.maxTimer = 0.82;
        }
      } else if (ai.phase === 'recover') {
        state.behavior = 'recover';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 4.0, dt);
        ai.timer -= dt;
        if (ai.timer <= 0) ai.phase = 'stalk';
      }

      state.shieldActive = shieldUp;
      rig.setPoseMode(poseMode);
      rig.setAxeCharge(axeCharge);

      stepEnemyMovement(spatial, desVx, desVz, world, dt, F5_MIN_FLOOR_Y);
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
        attackVariant: 0,
        flinchTimer: state.flinchTimer,
        flinchDirX: state.flinchDirX,
        staggerTimer: 0,
        deadProgress: 0,
        weakpointExposed: state.weakpoint.exposed,
        weakpointBroken: state.weakpoint.broken,
        shieldActive: shieldUp,
        phase: state.phase,
        airborneHeight,
      });
    },
  };
}
