import * as THREE from 'three';
import {
  resolveWorldHorizontal3D,
  type HorizResolveResult,
} from '../../../arena/hideout/hideoutCollision';
import { F6_BASE_Y, F6_TRENCH_Y } from '../../../arena/hideout/floors/floor06/layout';
import type { EnemyAiStepContext, EnemyArchetypeBrain } from '../../core/enemyManager';
import {
  computeFacingYaw,
  hasEnemyLineOfSight,
  raycastCollisionWorld3D,
  rotateYawTowards,
} from '../../core/enemyNav';
import type { Floor06EnemyMaterials } from '../materials';
import { ASTRAL_SHARD_LEVITATOR_CONFIG } from './config';
import {
  buildAstralShardLevitatorRig,
  type AstralLevitatorRigHandle,
  type LevitatorFormationMode,
} from './mesh';
import {
  computeBlinkFlankVelocity,
  computeHexSpiralOffsets,
  computeTriShardOffsets,
  selectLevitatorAttack,
  solveAstralMortarArc,
} from './tactics';
import {
  createAstralLevitatorTextures,
  type AstralLevitatorTextureSuite,
} from './textures';

type LevitatorPhase =
  | 'orbit'
  | 'volley_windup'
  | 'volley_fire'
  | 'barrage_windup'
  | 'barrage_fire'
  | 'lance_charge'
  | 'lance_fire'
  | 'slash_windup'
  | 'slash_surge'
  | 'slash_cleave'
  | 'mortar_windup'
  | 'mortar_release'
  | 'pulse_windup'
  | 'pulse_blast'
  | 'jink'
  | 'recover';

interface LevitatorAiState {
  homeX: number;
  homeY: number;
  homeZ: number;
  initialized: boolean;
  phase: LevitatorPhase;
  timer: number;
  maxTimer: number;
  orbitAngle: number;
  orbitDir: number;
  pulseCooldown: number;
  lanceCooldown: number;
  volleyCooldown: number;
  barrageCooldown: number;
  slashCooldown: number;
  mortarCooldown: number;
  jinkCooldown: number;
  timeWithoutLos: number;
  burstShotIndex: number;
  burstShotDelay: number;
  jinkVx: number;
  jinkVz: number;
  surgeVx: number;
  surgeVz: number;
  lockedYaw: number;
  lockedPitch: number;
  mortarTargetX: number;
  mortarTargetY: number;
  mortarTargetZ: number;
  lastHp: number;
  damageBurstAccum: number;
  staggerSparkTick: number;
  hitApplied: boolean;
}

const _muzzle = new THREE.Vector3();
const _glint = new THREE.Vector3();
const _aimDir = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _slashTarget = new THREE.Vector3();
const _exhaustDir = new THREE.Vector3();
const _horizScratch: HorizResolveResult = { x: 0, z: 0, collided: false };
const _rayHit = { hit: false, point: new THREE.Vector3(), normal: new THREE.Vector3(), t: 1 };

export function createAstralShardLevitatorBrain(mats: Floor06EnemyMaterials): EnemyArchetypeBrain {
  // Share one 512x512 procedural PBR texture suite across all Floor 06 Astral Shard Levitators!
  let sharedTex: AstralLevitatorTextureSuite | null = null;
  const getSharedTex = () => {
    if (!sharedTex) sharedTex = createAstralLevitatorTextures();
    return sharedTex;
  };

  return {
    config: ASTRAL_SHARD_LEVITATOR_CONFIG,
    createRig: (enemyId) => buildAstralShardLevitatorRig(enemyId, mats, getSharedTex()),
    createAiState: (): Record<string, unknown> => ({
      homeX: 0,
      homeY: F6_BASE_Y + 3.2,
      homeZ: 0,
      initialized: false,
      phase: 'orbit',
      timer: 0,
      maxTimer: 1,
      orbitAngle: Math.random() * Math.PI * 2,
      orbitDir: Math.random() < 0.5 ? -1 : 1,
      pulseCooldown: 1.4,
      lanceCooldown: 2.2 + Math.random() * 1.4,
      volleyCooldown: 0.9 + Math.random() * 0.8,
      barrageCooldown: 3.4 + Math.random() * 1.6,
      slashCooldown: 2.8 + Math.random() * 1.4,
      mortarCooldown: 3.2 + Math.random() * 1.5,
      jinkCooldown: 1.8,
      timeWithoutLos: 0,
      burstShotIndex: 0,
      burstShotDelay: 0,
      jinkVx: 0,
      jinkVz: 0,
      surgeVx: 0,
      surgeVz: 0,
      lockedYaw: 0,
      lockedPitch: 0,
      mortarTargetX: 0,
      mortarTargetY: F6_BASE_Y,
      mortarTargetZ: 0,
      lastHp: ASTRAL_SHARD_LEVITATOR_CONFIG.maxHp,
      damageBurstAccum: 0,
      staggerSparkTick: 0,
      hitApplied: false,
    }),
    stepAi: (ctx: EnemyAiStepContext) => {
      const ai = ctx.aiState as unknown as LevitatorAiState;
      const rig = ctx.rig as AstralLevitatorRigHandle;
      const { dt, elapsed, state, spatial, playerPos, world, callbacks } = ctx;
      const cfg = ASTRAL_SHARD_LEVITATOR_CONFIG;

      if (!ai.initialized) {
        ai.homeX = spatial.x;
        ai.homeY = spatial.y;
        ai.homeZ = spatial.z;
        ai.initialized = true;
      }

      ai.pulseCooldown = Math.max(0, ai.pulseCooldown - dt);
      ai.lanceCooldown = Math.max(0, ai.lanceCooldown - dt);
      ai.volleyCooldown = Math.max(0, ai.volleyCooldown - dt);
      ai.barrageCooldown = Math.max(0, ai.barrageCooldown - dt);
      ai.slashCooldown = Math.max(0, ai.slashCooldown - dt);
      ai.mortarCooldown = Math.max(0, ai.mortarCooldown - dt);
      ai.jinkCooldown = Math.max(0, ai.jinkCooldown - dt);
      ai.damageBurstAccum = Math.max(0, ai.damageBurstAccum - dt * 45);

      const dmgDelta = ai.lastHp - state.hp;
      const tookDamage = dmgDelta > 1;
      ai.lastHp = state.hp;
      if (tookDamage) {
        state.engaged = true;
        ai.damageBurstAccum += dmgDelta;
      }

      // Compute clean ground drop height so the projected shadow & rune ring always sit on the floor beneath!
      const floorBeneath = Math.abs(spatial.x) < 11.5 && spatial.z > -10 && spatial.z < 9.5
        ? F6_TRENCH_Y
        : F6_BASE_Y;
      rig.setGroundDrop(Math.max(0.15, spatial.y - floorBeneath));

      // =====================================================================
      // STAGGERED / GROUNDED CRASH (Astral Resonance Heart shattered!)
      // =====================================================================
      if (state.staggerTimer > 0) {
        ai.phase = 'orbit';
        rig.setTelegraphBeam(false, 0, 0);
        rig.setChaliceOrbCharge(0);
        rig.setNovaSphereCharge(0);
        rig.setFormationMode('seraphic_idle');
        // Drop sharply toward floor height with violent sputtering amethyst sparks
        const crashY = Math.max(floorBeneath + 0.55, ai.homeY - 2.35);
        spatial.y += (crashY - spatial.y) * Math.min(1, dt * 5.2);
        ai.staggerSparkTick += dt;
        if (ai.staggerSparkTick >= 0.22) {
          ai.staggerSparkTick = 0;
          rig.getWeakpointWorldPos(_glint);
          callbacks.spawnBoosterBurst(_glint, _exhaustDir.set(0, 1, 0), 0xc084fc, 4);
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
      const dy = playerPos.y + 1.15 - (spatial.y + 1.15);
      const dz = playerPos.z - spatial.z;
      const horizDist = Math.hypot(dx, dz);
      if (!Number.isFinite(horizDist)) return;
      const hasLos =
        horizDist <= cfg.detectRange &&
        hasEnemyLineOfSight(
          spatial.x,
          spatial.y + 1.15,
          spatial.z,
          playerPos.x,
          playerPos.y + 1.3,
          playerPos.z,
          world
        );

      if (hasLos || horizDist < 22) state.engaged = true;
      ai.timeWithoutLos = hasLos ? 0 : ai.timeWithoutLos + dt;
      ai.orbitAngle += dt * 0.78 * ai.orbitDir;

      let desVx = 0;
      let desVz = 0;
      let targetY = ai.homeY + Math.sin(elapsed * 1.65 + ai.orbitAngle) * 0.52;
      let attackProgress = 0;
      let beamActive = false;
      let beamCharge = 0;
      let chaliceCharge = 0;
      let novaCharge = 0;
      let formation: LevitatorFormationMode = 'seraphic_idle';

      if (!state.engaged) {
        state.behavior = 'patrol';
        const tx = ai.homeX + Math.cos(ai.orbitAngle) * 3.4;
        const tz = ai.homeZ + Math.sin(ai.orbitAngle) * 3.4;
        desVx = (tx - spatial.x) * 1.65;
        desVz = (tz - spatial.z) * 1.65;
        spatial.yaw = rotateYawTowards(
          spatial.yaw,
          computeFacingYaw(spatial.x, spatial.z, tx, tz),
          4.0,
          dt
        );
      } else {
        const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);
        const aimPitch = Math.atan2(dy, Math.max(1, horizDist));
        const dirX = horizDist > 0.01 ? dx / horizDist : -Math.sin(spatial.yaw);
        const dirZ = horizDist > 0.01 ? dz / horizDist : -Math.cos(spatial.yaw);
        const rightX = -dirZ;
        const rightZ = dirX;

        targetY = Math.max(
          F6_BASE_Y + 1.55,
          Math.min(F6_BASE_Y + 5.8, playerPos.y + 2.95 + Math.sin(elapsed * 1.9) * 0.52)
        );

        // ===================================================================
        // PHASE MACHINE: ORBIT + 6 DISTINCT ATTACKS + REACTIVE PHASE-BLINK JINK
        // ===================================================================
        if (ai.phase === 'orbit') {
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 7.6, dt);

          // Reactive Phase-Blink Evasive Jink when taking sustained bursts!
          if (ai.damageBurstAccum >= 48 && ai.jinkCooldown <= 0 && !state.weakpoint.broken) {
            ai.phase = 'jink';
            ai.timer = 0.32;
            ai.maxTimer = 0.32;
            ai.jinkCooldown = 3.0 + Math.random() * 1.4;
            ai.damageBurstAccum = 0;
            ai.orbitDir *= -1;
            const blinkVel = computeBlinkFlankVelocity(dx, dz, ai.orbitDir, 15.2);
            ai.jinkVx = blinkVel.vx;
            ai.jinkVz = blinkVel.vz;
            callbacks.onTelegraphAudio('dash');
            rig.getWeakpointWorldPos(_glint);
            callbacks.spawnPerilGlint(_glint, 0xc084fc);
            callbacks.spawnBoosterBurst(
              _glint,
              _exhaustDir.set(-blinkVel.vx, 0.1, -blinkVel.vz).normalize(),
              0xc084fc,
              8
            );
          } else {
            const choice = selectLevitatorAttack({
              horizDist,
              hasLos,
              hasAttackToken: ctx.hasAttackToken,
              coreBroken: state.weakpoint.broken,
              pulseCooldown: ai.pulseCooldown,
              lanceCooldown: ai.lanceCooldown,
              volleyCooldown: ai.volleyCooldown,
              barrageCooldown: ai.barrageCooldown,
              slashCooldown: ai.slashCooldown,
              mortarCooldown: ai.mortarCooldown,
              timeWithoutLos: ai.timeWithoutLos,
              roll: Math.random(),
            });

            if (choice === 'astral_pulse_repel') {
              ai.phase = 'pulse_windup';
              ai.timer = 0.54;
              ai.maxTimer = 0.54;
              ai.hitApplied = false;
              ai.pulseCooldown = 5.4 + Math.random() * 1.4;
              callbacks.onTelegraphAudio('warden_vent');
              rig.getWeakpointWorldPos(_glint);
              callbacks.spawnPerilGlint(_glint, 0xe879f9);
            } else if (choice === 'telekinetic_cross_slash') {
              ai.phase = 'slash_windup';
              ai.timer = 0.44;
              ai.maxTimer = 0.44;
              ai.hitApplied = false;
              ai.slashCooldown = 6.2 + Math.random() * 1.8;
              callbacks.onTelegraphAudio('iaijutsu_glint');
              rig.getWeakpointWorldPos(_glint);
              callbacks.spawnPerilGlint(_glint, 0xf0abfc);
            } else if (choice === 'focused_astral_lance') {
              ai.phase = 'lance_charge';
              ai.timer = 0.94;
              ai.maxTimer = 0.94;
              ai.lockedYaw = targetYaw;
              ai.lockedPitch = aimPitch;
              ai.lanceCooldown = 5.8 + Math.random() * 1.8;
              callbacks.onTelegraphAudio('rail_charge');
              rig.getWeakpointWorldPos(_glint);
              callbacks.spawnPerilGlint(_glint, 0xd8b4fe);
            } else if (choice === 'singularity_mortar') {
              ai.phase = 'mortar_windup';
              ai.timer = 0.68;
              ai.maxTimer = 0.68;
              ai.mortarTargetX = playerPos.x;
              ai.mortarTargetY = playerPos.y;
              ai.mortarTargetZ = playerPos.z;
              ai.mortarCooldown = 6.4 + Math.random() * 1.8;
              callbacks.onTelegraphAudio('mortar');
              rig.getChaliceOrbWorldPos(_glint);
              callbacks.spawnPerilGlint(_glint, 0xc084fc);
            } else if (choice === 'hex_shard_barrage') {
              ai.phase = 'barrage_windup';
              ai.timer = 0.46;
              ai.maxTimer = 0.46;
              ai.burstShotIndex = 0;
              ai.burstShotDelay = 0;
              ai.barrageCooldown = 5.0 + Math.random() * 1.4;
              callbacks.onTelegraphAudio('pyro_flare');
              rig.getWeakpointWorldPos(_glint);
              callbacks.spawnPerilGlint(_glint, 0xd8b4fe);
            } else if (choice === 'tri_shard_volley') {
              ai.phase = 'volley_windup';
              ai.timer = 0.36;
              ai.maxTimer = 0.36;
              ai.burstShotIndex = 0;
              ai.burstShotDelay = 0;
              ai.volleyCooldown = 2.3 + Math.random() * 0.9;
              callbacks.onTelegraphAudio('pyro_flare');
              rig.getMuzzleWorldPos(_glint);
              callbacks.spawnPerilGlint(_glint, 0xa855f7);
            } else {
              if (horizDist > cfg.preferredMaxRange) {
                state.behavior = 'chase';
                desVx = dirX * cfg.moveSpeed + rightX * ai.orbitDir * 2.8;
                desVz = dirZ * cfg.moveSpeed + rightZ * ai.orbitDir * 2.8;
              } else if (horizDist < cfg.preferredMinRange) {
                state.behavior = 'strafe';
                desVx = -dirX * cfg.moveSpeed * 0.6 + rightX * ai.orbitDir * cfg.moveSpeed * 0.95;
                desVz = -dirZ * cfg.moveSpeed * 0.6 + rightZ * ai.orbitDir * cfg.moveSpeed * 0.95;
              } else {
                state.behavior = 'strafe';
                desVx = rightX * ai.orbitDir * cfg.moveSpeed * 0.95;
                desVz = rightZ * ai.orbitDir * cfg.moveSpeed * 0.95;
              }
            }
          }
        }
        // -------------------------------------------------------------------
        // ATTACK 1: SEQUENTIAL TRI-SHARD VOLLEY (fired from individual recoiling wing-blades!)
        // -------------------------------------------------------------------
        else if (ai.phase === 'volley_windup') {
          state.behavior = 'windup';
          formation = 'volley_fan';
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.6, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          desVx = rightX * ai.orbitDir * 2.6;
          desVz = rightZ * ai.orbitDir * 2.6;
          if (ai.timer <= 0) {
            ai.phase = 'volley_fire';
            ai.burstShotIndex = 0;
            ai.burstShotDelay = 0;
          }
        } else if (ai.phase === 'volley_fire') {
          state.behavior = 'attack';
          formation = 'volley_fan';
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.0, dt);
          const offsets = computeTriShardOffsets();
          ai.burstShotDelay -= dt;
          attackProgress = ai.burstShotIndex / Math.max(1, offsets.length);
          if (ai.burstShotDelay <= 0 && ai.burstShotIndex < offsets.length) {
            const off = offsets[ai.burstShotIndex];
            ai.burstShotIndex += 1;
            ai.burstShotDelay = 0.085;
            rig.triggerShardRecoil(off.shardIndex);
            rig.getShardTipWorldPos(off.shardIndex, _muzzle);
            const baseYaw = Math.atan2(-(playerPos.x - _muzzle.x), -(playerPos.z - _muzzle.z));
            const basePitch = Math.atan2(
              playerPos.y + 1.15 - _muzzle.y,
              Math.max(1, Math.hypot(playerPos.x - _muzzle.x, playerPos.z - _muzzle.z))
            );
            const yaw = baseYaw + off.yawOffset;
            const pitch = basePitch + off.pitchOffset;
            _aimDir
              .set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch))
              .normalize();
            callbacks.onFireAudio('rifle');
            callbacks.spawnMuzzleFlash(_muzzle, _aimDir, 0xc084fc, false);
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _aimDir.clone(),
              speed: 38,
              damage: 13,
              radius: 0.15,
              color: 0xc084fc,
              kind: 'plasma_bolt',
              staggerStrength: 0.24,
            });
          }
          if (ai.burstShotIndex >= offsets.length && ai.burstShotDelay <= 0) {
            ai.phase = 'recover';
            ai.timer = 0.44;
          }
        }
        // -------------------------------------------------------------------
        // ATTACK 2: 6-BLADE HEX-SHARD SPIRAL BARRAGE (all 6 blades recoil in crisp wave!)
        // -------------------------------------------------------------------
        else if (ai.phase === 'barrage_windup') {
          state.behavior = 'windup';
          formation = 'volley_fan';
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.8, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          desVx = rightX * ai.orbitDir * 2.0;
          desVz = rightZ * ai.orbitDir * 2.0;
          if (ai.timer <= 0) {
            ai.phase = 'barrage_fire';
            ai.burstShotIndex = 0;
            ai.burstShotDelay = 0;
          }
        } else if (ai.phase === 'barrage_fire') {
          state.behavior = 'attack';
          formation = 'volley_fan';
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 7.2, dt);
          const hexOffsets = computeHexSpiralOffsets();
          ai.burstShotDelay -= dt;
          attackProgress = ai.burstShotIndex / Math.max(1, hexOffsets.length);
          if (ai.burstShotDelay <= 0 && ai.burstShotIndex < hexOffsets.length) {
            const off = hexOffsets[ai.burstShotIndex];
            ai.burstShotIndex += 1;
            ai.burstShotDelay = 0.068;
            rig.triggerShardRecoil(off.shardIndex);
            rig.getShardTipWorldPos(off.shardIndex, _muzzle);
            const baseYaw = Math.atan2(-(playerPos.x - _muzzle.x), -(playerPos.z - _muzzle.z));
            const basePitch = Math.atan2(
              playerPos.y + 1.12 - _muzzle.y,
              Math.max(1, Math.hypot(playerPos.x - _muzzle.x, playerPos.z - _muzzle.z))
            );
            const yaw = baseYaw + off.yawOffset;
            const pitch = basePitch + off.pitchOffset;
            _aimDir
              .set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch))
              .normalize();
            callbacks.onFireAudio('smg');
            callbacks.spawnMuzzleFlash(_muzzle, _aimDir, 0xe879f9, false);
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _aimDir.clone(),
              speed: 36,
              damage: 11,
              radius: 0.14,
              color: 0xe879f9,
              kind: 'plasma_bolt',
              staggerStrength: 0.18,
            });
          }
          if (ai.burstShotIndex >= hexOffsets.length && ai.burstShotDelay <= 0) {
            ai.phase = 'recover';
            ai.timer = 0.58;
            ai.orbitDir *= -1;
          }
        }
        // -------------------------------------------------------------------
        // ATTACK 3: FOCUSED ASTRAL LANCE (Hexagonal converging cannon + sliding focus rings!)
        // -------------------------------------------------------------------
        else if (ai.phase === 'lance_charge') {
          state.behavior = 'windup';
          formation = 'lance_barrel';
          ai.timer -= dt;
          const p = 1 - Math.max(0, ai.timer / ai.maxTimer);
          attackProgress = p;
          beamActive = true;
          beamCharge = p;
          // Tracks cleanly for first 74%, then locks firing lane so skilled players can roll out!
          if (p < 0.74) {
            spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.2, dt);
            ai.lockedYaw = spatial.yaw;
            ai.lockedPitch = aimPitch;
          }
          desVx = rightX * ai.orbitDir * 0.9;
          desVz = rightZ * ai.orbitDir * 0.9;

          if (ai.timer <= 0) {
            ai.phase = 'lance_fire';
            ai.timer = 0.34;
            ai.maxTimer = 0.34;
            for (let s = 0; s < 6; s++) rig.triggerShardRecoil(s);
            rig.getMuzzleWorldPos(_muzzle);
            _aimDir
              .set(
                -Math.sin(ai.lockedYaw) * Math.cos(ai.lockedPitch),
                Math.sin(ai.lockedPitch),
                -Math.cos(ai.lockedYaw) * Math.cos(ai.lockedPitch)
              )
              .normalize();
            callbacks.spawnMuzzleFlash(_muzzle, _aimDir, 0xf0abfc, true);
            callbacks.onFireAudio('rail_slug');
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _aimDir.clone(),
              speed: 74,
              damage: 28,
              radius: 0.19,
              color: 0xe879f9,
              kind: 'rail_slug',
              staggerStrength: 0.72,
            });
          }
        } else if (ai.phase === 'lance_fire') {
          state.behavior = 'attack';
          formation = 'lance_barrel';
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          beamActive = attackProgress < 0.25;
          beamCharge = 1;
          if (ai.timer <= 0) {
            ai.phase = 'recover';
            ai.timer = 0.64;
            ai.orbitDir *= -1;
          }
        }
        // -------------------------------------------------------------------
        // ATTACK 4: TELEKINETIC CROSS-SLASH (Predatory Blink-Surge + Twin 3D Astral Scythe Arcs!)
        // -------------------------------------------------------------------
        else if (ai.phase === 'slash_windup') {
          state.behavior = 'windup';
          formation = 'scythe_slash';
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 10.0, dt);
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          targetY = Math.max(F6_BASE_Y + 0.85, playerPos.y + 1.55);
          if (ai.timer <= 0) {
            ai.phase = 'slash_surge';
            ai.timer = 0.24;
            ai.maxTimer = 0.24;
            ai.surgeVx = dirX * 16.5;
            ai.surgeVz = dirZ * 16.5;
            callbacks.onTelegraphAudio('dash');
            rig.getWeakpointWorldPos(_glint);
            callbacks.spawnBoosterBurst(
              _glint,
              _exhaustDir.set(-dirX, 0.15, -dirZ).normalize(),
              0xd946ef,
              8
            );
          }
        } else if (ai.phase === 'slash_surge') {
          state.behavior = 'attack';
          formation = 'scythe_slash';
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 9.5, dt);
          ai.timer -= dt;
          attackProgress = 0.35 * (1 - Math.max(0, ai.timer / ai.maxTimer));
          desVx = ai.surgeVx;
          desVz = ai.surgeVz;
          targetY = Math.max(F6_BASE_Y + 0.7, playerPos.y + 1.25);
          if (ai.timer <= 0 || horizDist <= 4.0) {
            ai.phase = 'slash_cleave';
            ai.timer = 0.32;
            ai.maxTimer = 0.32;
            ai.hitApplied = false;
          }
        } else if (ai.phase === 'slash_cleave') {
          state.behavior = 'attack';
          formation = 'scythe_slash';
          ai.timer -= dt;
          const p = 1 - Math.max(0, ai.timer / ai.maxTimer);
          attackProgress = 0.35 + p * 0.65;
          targetY = Math.max(F6_BASE_Y + 0.7, playerPos.y + 1.25);
          if (!ai.hitApplied && p >= 0.2) {
            ai.hitApplied = true;
            rig.getMuzzleWorldPos(_origin);
            callbacks.onKatanaSlashAudio?.(true);
            // Twin crossed 3D glowing astral scythe crescent slash arcs!
            callbacks.spawnBladeSlashArc(_origin, spatial.yaw, 0.42, 0.08, 2.55, 0xd946ef, true, 1);
            callbacks.spawnBladeSlashArc(_origin, spatial.yaw, -0.42, -0.08, 2.55, 0xc084fc, true, -1);

            // Check wall carve scar if the massive astral scythe arc slices nearby geometry!
            _slashTarget.set(
              _origin.x - Math.sin(spatial.yaw) * 3.1,
              _origin.y,
              _origin.z - Math.cos(spatial.yaw) * 3.1
            );
            if (
              raycastCollisionWorld3D(
                _origin.x,
                _origin.y,
                _origin.z,
                _slashTarget.x,
                _slashTarget.y,
                _slashTarget.z,
                world,
                _rayHit
              )
            ) {
              callbacks.spawnSurfaceSlashScar(
                _rayHit.point,
                _rayHit.normal,
                _aimDir.set(rightX, 0.25, rightZ).normalize(),
                true
              );
            }

            // Close-range melee cleave check + twin angled scythe energy bolts for mid-range pressure!
            if (horizDist <= 4.8 && Math.abs(playerPos.y - spatial.y) <= 2.4 && hasLos) {
              callbacks.applyPlayerMeleeHit(24, _origin.clone(), 0.78);
            }
            for (const angOff of [-0.14, 0.14]) {
              const syaw = targetYaw + angOff;
              _aimDir.set(-Math.sin(syaw), aimPitch * 0.6, -Math.cos(syaw)).normalize();
              callbacks.spawnProjectile({
                origin: _origin.clone(),
                direction: _aimDir.clone(),
                speed: 42,
                damage: 16,
                radius: 0.2,
                color: 0xd946ef,
                kind: 'boss_overdrive',
                staggerStrength: 0.42,
              });
            }
          }
          if (ai.timer <= 0) {
            ai.phase = 'recover';
            ai.timer = 0.62;
            ai.orbitDir *= -1;
          }
        }
        // -------------------------------------------------------------------
        // ATTACK 5: SINGULARITY GRAVITY MORTAR (Chalice Crown -> Arcing Cover-Flushing Collapse Orb!)
        // -------------------------------------------------------------------
        else if (ai.phase === 'mortar_windup') {
          state.behavior = 'windup';
          formation = 'chalice_mortar';
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 5.5, dt);
          ai.timer -= dt;
          const p = 1 - Math.max(0, ai.timer / ai.maxTimer);
          attackProgress = p;
          chaliceCharge = p;
          targetY = Math.max(F6_BASE_Y + 2.4, ai.homeY + 0.85);
          // Lead player softly during first half of chalice charge
          if (p < 0.6) {
            ai.mortarTargetX = playerPos.x;
            ai.mortarTargetY = playerPos.y;
            ai.mortarTargetZ = playerPos.z;
          }
          if (ai.timer <= 0) {
            ai.phase = 'mortar_release';
            ai.timer = 0.34;
            ai.maxTimer = 0.34;
            rig.getChaliceOrbWorldPos(_muzzle);
            const arc = solveAstralMortarArc(
              _muzzle.x,
              _muzzle.y,
              _muzzle.z,
              ai.mortarTargetX,
              ai.mortarTargetY + 0.12,
              ai.mortarTargetZ,
              15.2
            );
            _aimDir.set(arc.vx, arc.vy, arc.vz).normalize();
            callbacks.onFireAudio('mortar');
            callbacks.spawnMuzzleFlash(_muzzle, _aimDir, 0xc084fc, true);
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _aimDir.clone(),
              speed: arc.speed,
              damage: 24,
              radius: 0.24,
              color: 0xc084fc,
              kind: 'mortar_canister',
              gravity: 15.2,
              splashRadius: 3.85,
              targetPos: new THREE.Vector3(ai.mortarTargetX, ai.mortarTargetY, ai.mortarTargetZ),
              staggerStrength: 0.72,
            });
          }
        } else if (ai.phase === 'mortar_release') {
          state.behavior = 'attack';
          formation = 'chalice_mortar';
          ai.timer -= dt;
          attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
          chaliceCharge = Math.max(0, 1 - attackProgress * 3.0);
          if (ai.timer <= 0) {
            ai.phase = 'recover';
            ai.timer = 0.56;
          }
        }
        // -------------------------------------------------------------------
        // ATTACK 6: ASTRAL PULSE REPEL (Implosion -> Supernova 360° Shockwave Ring!)
        // -------------------------------------------------------------------
        else if (ai.phase === 'pulse_windup') {
          state.behavior = 'windup';
          formation = 'nova_repel';
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.2, dt);
          ai.timer -= dt;
          const p = 1 - Math.max(0, ai.timer / ai.maxTimer);
          attackProgress = p;
          novaCharge = p;
          targetY = Math.max(F6_BASE_Y + 0.65, playerPos.y + 1.45);
          if (ai.timer <= 0) {
            ai.phase = 'pulse_blast';
            ai.timer = 0.38;
            ai.maxTimer = 0.38;
          }
        } else if (ai.phase === 'pulse_blast') {
          state.behavior = 'attack';
          formation = 'nova_repel';
          ai.timer -= dt;
          const p = 1 - Math.max(0, ai.timer / ai.maxTimer);
          attackProgress = p;
          novaCharge = Math.max(0, 1 - p * 2.5);
          if (!ai.hitApplied && p >= 0.2) {
            ai.hitApplied = true;
            _origin.set(spatial.x, playerPos.y + 0.1, spatial.z);
            callbacks.spawnShockwave({
              center: _origin.clone(),
              maxRadius: 6.8,
              expandSpeed: 15.8,
              damage: 24,
              color: 0xd946ef,
              staggerStrength: 0.76,
            });
            rig.getWeakpointWorldPos(_glint);
            callbacks.spawnBoosterBurst(_glint, _exhaustDir.set(0, 1, 0), 0xe879f9, 10);
            callbacks.onFireAudio('rail_slug');
          }
          if (ai.timer <= 0) {
            ai.phase = 'recover';
            ai.timer = 0.54;
            ai.orbitDir *= -1;
          }
        }
        // -------------------------------------------------------------------
        // REACTIVE PHASE-BLINK JINK & RECOVERY
        // -------------------------------------------------------------------
        else if (ai.phase === 'jink') {
          state.behavior = 'strafe';
          formation = 'volley_fan';
          ai.timer -= dt;
          desVx = ai.jinkVx;
          desVz = ai.jinkVz;
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 10.5, dt);
          if (ai.timer <= 0) ai.phase = 'orbit';
        } else if (ai.phase === 'recover') {
          state.behavior = 'recover';
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.2, dt);
          ai.timer -= dt;
          desVx = rightX * ai.orbitDir * cfg.moveSpeed * 0.45;
          desVz = rightZ * ai.orbitDir * cfg.moveSpeed * 0.45;
          if (ai.timer <= 0) ai.phase = 'orbit';
        }
      }

      // Smooth inertial 3D flight velocity & solid-world collision
      const blend = 1 - Math.exp(-7.4 * dt);
      spatial.vx += (desVx + ctx.separation.x * 2.4 - spatial.vx) * blend;
      spatial.vz += (desVz + ctx.separation.y * 2.4 - spatial.vz) * blend;
      resolveWorldHorizontal3D(
        spatial.x + spatial.vx * dt,
        spatial.z + spatial.vz * dt,
        spatial.y,
        spatial.radius,
        world,
        _horizScratch,
        spatial.height,
        0.15
      );
      if (_horizScratch.collided) {
        ai.orbitDir *= -1;
      }
      spatial.x = Math.max(-42.5, Math.min(42.5, _horizScratch.x));
      spatial.z = Math.max(-26.5, Math.min(26.5, _horizScratch.z));
      spatial.y += (targetY - spatial.y) * Math.min(1, dt * 4.0);
      spatial.grounded = false;

      // Drive rig formation & VFX states
      rig.setFormationMode(formation);
      rig.setChaliceOrbCharge(chaliceCharge);
      rig.setNovaSphereCharge(novaCharge);

      if (beamActive) {
        rig.root.updateMatrixWorld(true);
        rig.getMuzzleWorldPos(_muzzle);
        const fwdX = -Math.sin(ai.lockedYaw) * Math.cos(ai.lockedPitch);
        const fwdY = Math.sin(ai.lockedPitch);
        const fwdZ = -Math.cos(ai.lockedYaw) * Math.cos(ai.lockedPitch);
        const maxLen = 36;
        const hitWall = raycastCollisionWorld3D(
          _muzzle.x,
          _muzzle.y,
          _muzzle.z,
          _muzzle.x + fwdX * maxLen,
          _muzzle.y + fwdY * maxLen,
          _muzzle.z + fwdZ * maxLen,
          world,
          _rayHit
        );
        const len = hitWall ? _rayHit.t * maxLen : maxLen;
        rig.setTelegraphBeam(true, len, beamCharge);
      } else {
        rig.setTelegraphBeam(false, 0, 0);
      }

      const fwdX = -Math.sin(spatial.yaw);
      const fwdZ = -Math.cos(spatial.yaw);
      const sideX = Math.cos(spatial.yaw);
      const sideZ = -Math.sin(spatial.yaw);
      const speed = Math.hypot(spatial.vx, spatial.vz);

      rig.updateAnimation({
        dt,
        elapsed,
        behavior: state.behavior,
        speedRatio: speed / cfg.moveSpeed,
        localMoveX: (spatial.vx * sideX + spatial.vz * sideZ) / Math.max(1, cfg.moveSpeed),
        localMoveZ: (spatial.vx * fwdX + spatial.vz * fwdZ) / Math.max(1, cfg.moveSpeed),
        aimPitch: Math.atan2(dy, Math.max(1, horizDist)),
        attackProgress,
        attackVariant: 0,
        flinchTimer: state.flinchTimer,
        flinchDirX: state.flinchDirX,
        staggerTimer: 0,
        deadProgress: 0,
        weakpointExposed: state.weakpoint.exposed,
        weakpointBroken: state.weakpoint.broken,
        shieldActive: false,
        phase: 1,
        airborneHeight: 0,
      });
    },
  };
}
