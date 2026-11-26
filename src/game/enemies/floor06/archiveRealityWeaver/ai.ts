import * as THREE from 'three';
import {
  resolveSupportHeight3D,
  resolveWorldHorizontal3D,
  type HorizResolveResult,
} from '../../../arena/hideout/hideoutCollision';
import { F6_BASE_Y } from '../../../arena/hideout/floors/floor06/layout';
import type { EnemyAiStepContext, EnemyArchetypeBrain } from '../../core/enemyManager';
import {
  computeFacingYaw,
  hasEnemyLineOfSight,
  raycastCollisionWorld3D,
  rotateYawTowards,
  stepEnemyMovement,
} from '../../core/enemyNav';
import type { Floor06EnemyMaterials } from '../materials';
import { ARCHIVE_REALITY_WEAVER_CONFIG } from './config';
import {
  buildArchiveRealityWeaverRig,
  type RealityWeaverRigHandle,
  type WeaverStaveFormation,
} from './mesh';
import {
  computeGravCoreBlinkDest,
  computeWeaverFanAngles,
  computeWeaverHelixOffsets,
  computeWeaverSweepYaw,
  selectRealityWeaverAction,
  solveWeaverMortarPattern,
  type WeaverHelixShot,
} from './tactics';
import { createArchiveRealityWeaverTextures } from './textures';

const F6_WEAVER_MIN_Y = F6_BASE_Y - 0.8;

type WeaverPhase =
  | 'glide'
  | 'fan_windup'
  | 'fan_fire'
  | 'helix_windup'
  | 'helix_fire'
  | 'beam_charge'
  | 'beam_fire'
  | 'scythe_windup'
  | 'scythe_fire'
  | 'mortar_windup'
  | 'mortar_salvo'
  | 'blink_charge'
  | 'repel_windup'
  | 'repel_blast'
  | 'recover';

interface WeaverAiState {
  phase: WeaverPhase;
  timer: number;
  maxTimer: number;
  strafeSign: number;
  repelCooldown: number;
  beamCooldown: number;
  mortarCooldown: number;
  fanCooldown: number;
  blinkCooldown: number;
  helixCooldown: number;
  scytheCooldown: number;
  timeWithoutLos: number;
  shotsLeft: number;
  shotDelay: number;
  helixShots: WeaverHelixShot[];
  helixIndex: number;
  mortarTargets: Array<{ x: number; y: number; z: number }>;
  mortarIndex: number;
  lockedYaw: number;
  lockedPitch: number;
  sweepDir: -1 | 1;
  beamBurnTick: number;
  beamCraterTick: number;
  hitDone: boolean;
  fanWave2Pending: boolean;
  phase2Announced: boolean;
}

const _muzzle = new THREE.Vector3();
const _glint = new THREE.Vector3();
const _aimDir = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _target = new THREE.Vector3();
const _upNormal = new THREE.Vector3(0, 1, 0);
const _slashDir = new THREE.Vector3();
const _handL = new THREE.Vector3();
const _handR = new THREE.Vector3();
const _toPlayer = new THREE.Vector3();
const _horizScratch: HorizResolveResult = { x: 0, z: 0, collided: false };
const _rayHit = { hit: false, point: new THREE.Vector3(), normal: new THREE.Vector3(), t: 1 };

export function createArchiveRealityWeaverBrain(mats: Floor06EnemyMaterials): EnemyArchetypeBrain {
  const sharedTextures = createArchiveRealityWeaverTextures();

  return {
    config: ARCHIVE_REALITY_WEAVER_CONFIG,
    createRig: (enemyId) => buildArchiveRealityWeaverRig(enemyId, mats, sharedTextures),
    createAiState: (): Record<string, unknown> => ({
      phase: 'glide',
      timer: 0,
      maxTimer: 1,
      strafeSign: 1,
      repelCooldown: 1.4,
      beamCooldown: 2.2,
      mortarCooldown: 3.0,
      fanCooldown: 0.9,
      blinkCooldown: 3.6,
      helixCooldown: 1.8,
      scytheCooldown: 2.4,
      timeWithoutLos: 0,
      shotsLeft: 0,
      shotDelay: 0,
      helixShots: [],
      helixIndex: 0,
      mortarTargets: [],
      mortarIndex: 0,
      lockedYaw: 0,
      lockedPitch: 0,
      sweepDir: 1,
      beamBurnTick: 0,
      beamCraterTick: 0,
      hitDone: false,
      fanWave2Pending: false,
      phase2Announced: false,
    }),
    stepAi: (ctx: EnemyAiStepContext) => {
      const ai = ctx.aiState as unknown as WeaverAiState;
      const rig = ctx.rig as RealityWeaverRigHandle;
      const { dt, elapsed, state, spatial, playerPos, playerRolling, world, callbacks } = ctx;
      const cfg = ARCHIVE_REALITY_WEAVER_CONFIG;
      const isP2 = state.phase === 2;
      const haloBroken = state.weakpoint.broken;

      // ── Dramatic Sovereign Phase 2 Overdrive Transformation at <= 55% HP ──
      if (isP2 && !ai.phase2Announced) {
        ai.phase2Announced = true;
        callbacks.onTelegraphAudio('kestrel_overdrive');
        _origin.set(spatial.x, spatial.y + 0.16, spatial.z);
        callbacks.spawnShockwave({
          center: _origin.clone(),
          maxRadius: 11.2,
          expandSpeed: 16.5,
          damage: 20,
          color: 0xf0abfc,
          staggerStrength: 0.78,
        });
        rig.getWeakpointWorldPos(_glint);
        callbacks.spawnPerilGlint(_glint, 0xfde047);
        callbacks.spawnBoosterBurst(_glint, _upNormal, 0xf0abfc, 22);
        callbacks.showIntelCallout(
          'ARCHIVE REALITY-WEAVER · SOVEREIGN OVERDRIVE',
          cfg.phase2Intel ?? 'SWEEPING REALITY BEAMS & HELIX STAVE STORMS ACTIVE!',
          4.5
        );
      }

      ai.repelCooldown = Math.max(0, ai.repelCooldown - dt);
      ai.beamCooldown = Math.max(0, ai.beamCooldown - dt);
      ai.mortarCooldown = Math.max(0, ai.mortarCooldown - dt);
      ai.fanCooldown = Math.max(0, ai.fanCooldown - dt);
      ai.blinkCooldown = Math.max(0, ai.blinkCooldown - dt);
      ai.helixCooldown = Math.max(0, ai.helixCooldown - dt);
      ai.scytheCooldown = Math.max(0, ai.scytheCooldown - dt);

      // ── Crown Halo Shatter Stagger Interrupt ──
      if (state.staggerTimer > 0) {
        ai.phase = 'glide';
        rig.setBeamTelegraph(false, 0, 0, false, 0);
        rig.setWeaverVisualState({
          formation: 'orbit_serene',
          phase2Aura: isP2 ? 0.35 : 0,
          castGlow: 0,
          riftIntensity: 0,
          repelImplode: 0,
          blinkPhase: 0,
        });
        stepEnemyMovement(spatial, 0, 0, world, dt, F6_WEAVER_MIN_Y);
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
          weakpointBroken: haloBroken,
          shieldActive: false,
          phase: state.phase,
          airborneHeight: 0,
        });
        return;
      }

      const dx = playerPos.x - spatial.x;
      const dy = playerPos.y + 1.18 - (spatial.y + 1.98);
      const dz = playerPos.z - spatial.z;
      const horizDist = Math.hypot(dx, dz);
      const hasLos =
        horizDist <= cfg.detectRange &&
        hasEnemyLineOfSight(
          spatial.x,
          spatial.y + 1.98,
          spatial.z,
          playerPos.x,
          playerPos.y + 1.3,
          playerPos.z,
          world
        );

      if (hasLos) {
        ai.timeWithoutLos = 0;
      } else if (state.engaged) {
        ai.timeWithoutLos += dt;
      }

      if (hasLos || horizDist < 22 || state.hp < state.maxHp) {
        state.engaged = true;
      }

      const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);
      const aimPitch = Math.atan2(dy, Math.max(1, horizDist));
      const dirX = horizDist > 0.01 ? dx / horizDist : -Math.sin(spatial.yaw);
      const dirZ = horizDist > 0.01 ? dz / horizDist : -Math.cos(spatial.yaw);
      const rightX = -dirZ;
      const rightZ = dirX;

      let desVx = 0;
      let desVz = 0;
      let attackProgress = 0;
      let beamActive = false;
      let beamFiring = false;
      let beamCharge = 0;
      let activeBeamYaw = ai.lockedYaw;
      let sweepYawOffset = 0;
      let formation: WeaverStaveFormation = isP2 ? 'phase2_overdrive_star' : 'orbit_serene';
      let castGlow = 0;
      let riftIntensity = 0;
      let repelImplode = 0;
      let blinkPhase = 0;

      if (!state.engaged) {
        state.behavior = 'idle';
        spatial.yaw += dt * 0.32;
      } else if (ai.phase === 'glide') {
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, isP2 ? 6.8 : 5.2, dt);
        const action = selectRealityWeaverAction({
          horizDist,
          hasLos,
          phase: state.phase,
          repelCooldown: ai.repelCooldown,
          beamCooldown: ai.beamCooldown,
          mortarCooldown: ai.mortarCooldown,
          fanCooldown: ai.fanCooldown,
          blinkCooldown: ai.blinkCooldown,
          helixCooldown: ai.helixCooldown,
          scytheCooldown: ai.scytheCooldown,
          haloBroken,
          timeWithoutLos: ai.timeWithoutLos,
          roll: Math.random(),
        });

        if (action === 'singularity_repel') {
          ai.phase = 'repel_windup';
          ai.timer = isP2 ? 0.52 : 0.64;
          ai.maxTimer = ai.timer;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('boss_slam');
          rig.getWeakpointWorldPos(_glint);
          callbacks.spawnPerilGlint(_glint, 0xf0abfc);
        } else if (action === 'phase_reposition') {
          ai.phase = 'blink_charge';
          ai.timer = isP2 ? 0.32 : 0.42;
          ai.maxTimer = ai.timer;
          callbacks.onTelegraphAudio('dash');
          rig.getWeakpointWorldPos(_glint);
          callbacks.spawnPerilGlint(_glint, 0xfde047);
        } else if (action === 'reality_beam_lance') {
          ai.phase = 'beam_charge';
          ai.timer = isP2 ? 0.88 : 1.08;
          ai.maxTimer = ai.timer;
          ai.lockedYaw = targetYaw;
          ai.lockedPitch = aimPitch;
          ai.sweepDir = ai.strafeSign >= 0 ? 1 : -1;
          ai.beamBurnTick = 0;
          ai.beamCraterTick = 0;
          callbacks.onTelegraphAudio('rail_charge');
          rig.getMuzzleWorldPos(_glint);
          callbacks.spawnPerilGlint(_glint, 0xf0abfc);
        } else if (action === 'dimensional_rift_scythe') {
          ai.phase = 'scythe_windup';
          ai.timer = isP2 ? 0.42 : 0.52;
          ai.maxTimer = ai.timer;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('iaijutsu_glint');
          rig.getHandFocusWorldPos(-1, _handL);
          rig.getHandFocusWorldPos(1, _handR);
          callbacks.spawnPerilGlint(_handL, 0xe879f9);
          callbacks.spawnPerilGlint(_handR, 0xfde047);
        } else if (action === 'stave_barrage_helix') {
          ai.phase = 'helix_windup';
          ai.timer = isP2 ? 0.44 : 0.54;
          ai.maxTimer = ai.timer;
          ai.helixShots = computeWeaverHelixOffsets(state.phase, haloBroken);
          ai.helixIndex = 0;
          ai.shotDelay = 0;
          callbacks.onTelegraphAudio('pyro_flare');
          rig.getWeakpointWorldPos(_glint);
          callbacks.spawnPerilGlint(_glint, 0xfde047);
        } else if (action === 'gravity_mortar_salvo') {
          ai.phase = 'mortar_windup';
          ai.timer = isP2 ? 0.48 : 0.58;
          ai.maxTimer = ai.timer;
          ai.mortarTargets = solveWeaverMortarPattern(
            playerPos.x,
            playerPos.y,
            playerPos.z,
            state.phase,
            haloBroken
          );
          ai.mortarIndex = 0;
          ai.shotDelay = 0;
          callbacks.onTelegraphAudio('mortar');
          rig.getWeakpointWorldPos(_glint);
          callbacks.spawnPerilGlint(_glint, 0xf59e0b);
        } else if (action === 'astral_fan_volley') {
          ai.phase = 'fan_windup';
          ai.timer = isP2 ? 0.36 : 0.46;
          ai.maxTimer = ai.timer;
          ai.fanWave2Pending = isP2 && !haloBroken;
          callbacks.onTelegraphAudio('pyro_flare');
        } else {
          state.behavior = 'strafe';
          const spd = isP2 ? cfg.sprintSpeed : cfg.moveSpeed;
          if (horizDist > cfg.preferredMaxRange) {
            desVx = dirX * spd;
            desVz = dirZ * spd;
          } else if (horizDist < cfg.preferredMinRange) {
            desVx = -dirX * spd * 0.55 + rightX * ai.strafeSign * spd * 0.85;
            desVz = -dirZ * spd * 0.55 + rightZ * ai.strafeSign * spd * 0.85;
          } else {
            desVx = rightX * ai.strafeSign * spd * 0.9;
            desVz = rightZ * ai.strafeSign * spd * 0.9;
          }
        }
      } else if (ai.phase === 'fan_windup') {
        state.behavior = 'windup';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.4, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        castGlow = attackProgress * 0.9;
        if (ai.timer <= 0) {
          ai.phase = 'fan_fire';
          ai.timer = ai.fanWave2Pending ? 0.52 : 0.32;
          ai.maxTimer = ai.timer;
          rig.getMuzzleWorldPos(_muzzle);
          callbacks.onFireAudio('shotgun');
          const spreads = computeWeaverFanAngles(state.phase, haloBroken);
          for (let i = 0; i < spreads.length; i++) {
            const y = spatial.yaw + spreads[i];
            _aimDir
              .set(-Math.sin(y) * Math.cos(aimPitch), Math.sin(aimPitch), -Math.cos(y) * Math.cos(aimPitch))
              .normalize();
            callbacks.spawnMuzzleFlash(_muzzle, _aimDir, i % 2 === 0 ? 0xe879f9 : 0xfde047, true);
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _aimDir.clone(),
              speed: isP2 ? 42 : 35,
              damage: isP2 ? 17 : 14,
              radius: 0.18,
              color: i % 2 === 0 ? 0xe879f9 : 0xfde047,
              kind: 'plasma_bolt',
              staggerStrength: 0.34,
            });
          }
          ai.fanCooldown = isP2 ? 2.6 : 3.4;
        }
      } else if (ai.phase === 'fan_fire') {
        state.behavior = 'attack';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 5.2, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        castGlow = 1 - attackProgress * 0.5;
        // Phase 2 staggered second elevated wave!
        if (ai.fanWave2Pending && attackProgress >= 0.48) {
          ai.fanWave2Pending = false;
          rig.getMuzzleWorldPos(_muzzle);
          callbacks.onFireAudio('shotgun');
          const spreads = [-0.24, -0.08, 0.08, 0.24];
          for (const off of spreads) {
            const y = spatial.yaw + off;
            _aimDir
              .set(-Math.sin(y) * Math.cos(aimPitch), Math.sin(aimPitch), -Math.cos(y) * Math.cos(aimPitch))
              .normalize();
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _aimDir.clone(),
              speed: 44,
              damage: 15,
              radius: 0.17,
              color: 0xfde047,
              kind: 'boss_overdrive',
              staggerStrength: 0.32,
            });
          }
        }
        if (ai.timer <= 0) {
          ai.phase = 'recover';
          ai.timer = isP2 ? 0.42 : 0.62;
          ai.maxTimer = ai.timer;
        }
      } else if (ai.phase === 'helix_windup') {
        state.behavior = 'windup';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 5.8, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        formation = 'phase2_overdrive_star';
        castGlow = 0.5 + attackProgress * 0.8;
        if (ai.timer <= 0) {
          ai.phase = 'helix_fire';
          ai.shotDelay = 0.02;
        }
      } else if (ai.phase === 'helix_fire') {
        state.behavior = 'attack';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 5.4, dt);
        formation = 'phase2_overdrive_star';
        castGlow = 1.1;
        ai.shotDelay -= dt;
        const total = Math.max(1, ai.helixShots.length);
        attackProgress = ai.helixIndex / total;
        if (ai.shotDelay <= 0 && ai.helixIndex < ai.helixShots.length) {
          const shot = ai.helixShots[ai.helixIndex++];
          ai.shotDelay = isP2 ? 0.085 : 0.115;
          rig.root.updateMatrixWorld(true);
          rig.getStaveTipWorldPos(shot.staveIdx, _muzzle);
          const yaw = spatial.yaw + shot.yawOffset;
          const pitch = aimPitch + shot.pitchOffset;
          _aimDir
            .set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch))
            .normalize();
          const col = shot.gold ? 0xfde047 : 0xe879f9;
          callbacks.onFireAudio('boss_carbine');
          callbacks.spawnMuzzleFlash(_muzzle, _aimDir, col, false);
          callbacks.spawnProjectile({
            origin: _muzzle.clone(),
            direction: _aimDir.clone(),
            speed: isP2 ? 46 : 38,
            damage: isP2 ? 15 : 13,
            radius: 0.16,
            color: col,
            kind: shot.gold ? 'boss_overdrive' : 'plasma_bolt',
            staggerStrength: 0.28,
          });
        }
        if (ai.helixIndex >= ai.helixShots.length) {
          ai.helixCooldown = isP2 ? 4.2 : 5.4;
          ai.phase = 'recover';
          ai.timer = isP2 ? 0.48 : 0.68;
          ai.maxTimer = ai.timer;
        }
      } else if (ai.phase === 'scythe_windup') {
        state.behavior = 'windup';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.6, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        formation = 'rift_scythe_spread';
        riftIntensity = 0.45 + attackProgress * 0.85;
        castGlow = 0.7;
        if (ai.timer <= 0) {
          ai.phase = 'scythe_fire';
          ai.timer = 0.44;
          ai.maxTimer = 0.44;
          ai.hitDone = false;
        }
      } else if (ai.phase === 'scythe_fire') {
        state.behavior = 'attack';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 4.2, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        formation = 'rift_scythe_spread';
        riftIntensity = 1.25 * (1 - attackProgress * 0.4);
        castGlow = 1.0;

        if (!ai.hitDone && attackProgress >= 0.22) {
          ai.hitDone = true;
          callbacks.onKatanaSlashAudio?.(true);
          callbacks.onFireAudio('shotgun');
          _origin.set(spatial.x, spatial.y + 1.72, spatial.z);
          callbacks.spawnBladeSlashArc(_origin, spatial.yaw, 0.34, 0.08, 3.6, 0xe879f9, true, 1);
          callbacks.spawnBladeSlashArc(_origin, spatial.yaw, -0.34, 0.08, 3.6, 0xfde047, true, -1);

          // Floor slash scar directly ahead
          _slashDir.set(-Math.sin(spatial.yaw), 0, -Math.cos(spatial.yaw));
          callbacks.spawnSurfaceSlashScar(
            _target.set(
              spatial.x + _slashDir.x * 2.2,
              spatial.y + 0.04,
              spatial.z + _slashDir.z * 2.2
            ),
            _upNormal,
            _slashDir,
            true
          );

          // Launch fast twin reality-shear crescent projectiles from both floating Loom-Hands!
          rig.root.updateMatrixWorld(true);
          const handPositions: [THREE.Vector3, number][] = [
            [rig.getHandFocusWorldPos(-1, _handL), -0.09],
            [rig.getHandFocusWorldPos(1, _handR), 0.09],
          ];
          for (const [pos, off] of handPositions) {
            const yaw = spatial.yaw + off;
            _aimDir
              .set(-Math.sin(yaw) * Math.cos(aimPitch), Math.sin(aimPitch), -Math.cos(yaw) * Math.cos(aimPitch))
              .normalize();
            const col = off < 0 ? 0xe879f9 : 0xfde047;
            callbacks.spawnMuzzleFlash(pos, _aimDir, col, true);
            callbacks.spawnProjectile({
              origin: pos.clone(),
              direction: _aimDir.clone(),
              speed: isP2 ? 52 : 44,
              damage: isP2 ? 22 : 18,
              radius: 0.24,
              color: col,
              kind: 'boss_overdrive',
              staggerStrength: 0.56,
            });
          }
          // Close-mid direct scythe shock check if player stands right in the twin crescent arc
          if (horizDist <= 4.6 && !playerRolling) {
            callbacks.applyPlayerMeleeHit(isP2 ? 24 : 18, _origin.clone(), 0.72);
          }
          ai.scytheCooldown = isP2 ? 3.8 : 5.0;
        }

        if (ai.timer <= 0) {
          ai.phase = 'recover';
          ai.timer = isP2 ? 0.44 : 0.62;
          ai.maxTimer = ai.timer;
        }
      } else if (ai.phase === 'beam_charge') {
        state.behavior = 'windup';
        ai.timer -= dt;
        const charge = 1 - Math.max(0, ai.timer / ai.maxTimer);
        attackProgress = charge;
        formation = 'beam_prism_lock';
        beamActive = true;
        beamFiring = false;
        beamCharge = charge;
        castGlow = 0.4 + charge * 0.9;
        if (charge < 0.74) {
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 5.0, dt);
          ai.lockedYaw = spatial.yaw;
          ai.lockedPitch = aimPitch;
        }
        // In Phase 2, pre-offset the beam to sweep start angle near end of charge!
        if (isP2) {
          const startYaw = computeWeaverSweepYaw(ai.lockedYaw, 0, ai.sweepDir, 0.44);
          activeBeamYaw = THREE.MathUtils.lerp(ai.lockedYaw, startYaw, Math.max(0, (charge - 0.55) / 0.45));
          sweepYawOffset = activeBeamYaw - spatial.yaw;
        } else {
          activeBeamYaw = ai.lockedYaw;
          sweepYawOffset = ai.lockedYaw - spatial.yaw;
        }
        if (ai.timer <= 0) {
          ai.phase = 'beam_fire';
          ai.timer = isP2 ? 1.32 : 0.46;
          ai.maxTimer = ai.timer;
          ai.beamBurnTick = 0;
          ai.beamCraterTick = 0;
          rig.getMuzzleWorldPos(_muzzle);
          _aimDir
            .set(
              -Math.sin(activeBeamYaw) * Math.cos(ai.lockedPitch),
              Math.sin(ai.lockedPitch),
              -Math.cos(activeBeamYaw) * Math.cos(ai.lockedPitch)
            )
            .normalize();
          callbacks.spawnMuzzleFlash(_muzzle, _aimDir, 0xfef08a, true);
          callbacks.onFireAudio('rail_slug');

          // Phase 1 fires a blistering anti-materiel rail lance; Phase 2 opens the continuous sweep with a lead rail bolt too
          callbacks.spawnProjectile({
            origin: _muzzle.clone(),
            direction: _aimDir.clone(),
            speed: isP2 ? 96 : 88,
            damage: isP2 ? 28 : 26,
            radius: 0.22,
            color: 0xe879f9,
            kind: 'rail_slug',
            staggerStrength: 0.85,
          });
          ai.beamCooldown = isP2 ? 4.8 : 6.0;
        }
      } else if (ai.phase === 'beam_fire') {
        state.behavior = 'attack';
        ai.timer -= dt;
        const p = 1 - Math.max(0, ai.timer / ai.maxTimer);
        attackProgress = p;
        formation = 'beam_prism_lock';
        beamActive = true;
        beamFiring = true;
        beamCharge = 1.2;
        castGlow = 1.35;

        if (isP2) {
          // Sovereign Phase 2 Continuous Sweeping Reality-Tear Beam!
          activeBeamYaw = computeWeaverSweepYaw(ai.lockedYaw, p, ai.sweepDir, 0.44);
          spatial.yaw = rotateYawTowards(spatial.yaw, activeBeamYaw, 7.5, dt);
          sweepYawOffset = activeBeamYaw - spatial.yaw;

          ai.beamBurnTick -= dt;
          ai.beamCraterTick -= dt;

          // Ray-to-player burn hit check (respects dodge-roll i-frames!)
          rig.root.updateMatrixWorld(true);
          rig.getMuzzleWorldPos(_muzzle);
          const fwdX = -Math.sin(activeBeamYaw) * Math.cos(ai.lockedPitch);
          const fwdY = Math.sin(ai.lockedPitch);
          const fwdZ = -Math.cos(activeBeamYaw) * Math.cos(ai.lockedPitch);
          _aimDir.set(fwdX, fwdY, fwdZ).normalize();

          const maxLen = 40;
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
          const beamDist = hitWall ? _rayHit.t * maxLen : maxLen;

          if (hitWall && ai.beamCraterTick <= 0) {
            ai.beamCraterTick = 0.18;
            callbacks.spawnRailImpactCrater(_rayHit.point, _rayHit.normal, 0xe879f9);
          }

          if (ai.beamBurnTick <= 0 && !playerRolling) {
            _toPlayer.set(
              playerPos.x - _muzzle.x,
              playerPos.y + 1.15 - _muzzle.y,
              playerPos.z - _muzzle.z
            );
            const proj = _toPlayer.dot(_aimDir);
            if (proj > 0.5 && proj < beamDist) {
              const closestX = _muzzle.x + _aimDir.x * proj;
              const closestY = _muzzle.y + _aimDir.y * proj;
              const closestZ = _muzzle.z + _aimDir.z * proj;
              const perpDist = Math.hypot(
                playerPos.x - closestX,
                playerPos.y + 1.15 - closestY,
                playerPos.z - closestZ
              );
              if (perpDist <= 0.95) {
                ai.beamBurnTick = 0.24;
                callbacks.applyPlayerMeleeHit(14, _muzzle.clone(), 0.45);
              }
            }
          }
        } else {
          // Phase 1 lingering impact crater at wall hit
          activeBeamYaw = ai.lockedYaw;
          sweepYawOffset = ai.lockedYaw - spatial.yaw;
          if (ai.beamCraterTick <= 0) {
            ai.beamCraterTick = 99;
            rig.root.updateMatrixWorld(true);
            rig.getMuzzleWorldPos(_muzzle);
            const fwdX = -Math.sin(activeBeamYaw) * Math.cos(ai.lockedPitch);
            const fwdY = Math.sin(ai.lockedPitch);
            const fwdZ = -Math.cos(activeBeamYaw) * Math.cos(ai.lockedPitch);
            if (
              raycastCollisionWorld3D(
                _muzzle.x,
                _muzzle.y,
                _muzzle.z,
                _muzzle.x + fwdX * 40,
                _muzzle.y + fwdY * 40,
                _muzzle.z + fwdZ * 40,
                world,
                _rayHit
              )
            ) {
              callbacks.spawnRailImpactCrater(_rayHit.point, _rayHit.normal, 0xfde047);
            }
          }
        }

        if (ai.timer <= 0) {
          ai.phase = 'recover';
          ai.timer = isP2 ? 0.62 : 0.78;
          ai.maxTimer = ai.timer;
        }
      } else if (ai.phase === 'mortar_windup') {
        state.behavior = 'windup';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 5.2, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        formation = 'mortar_crown_bloom';
        castGlow = 0.45 + attackProgress * 0.75;
        if (ai.timer <= 0) {
          ai.phase = 'mortar_salvo';
          ai.shotDelay = 0.04;
        }
      } else if (ai.phase === 'mortar_salvo') {
        state.behavior = 'attack';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 4.4, dt);
        formation = 'mortar_crown_bloom';
        castGlow = 1.05;
        ai.shotDelay -= dt;
        const total = Math.max(1, ai.mortarTargets.length);
        attackProgress = ai.mortarIndex / total;
        if (ai.shotDelay <= 0 && ai.mortarIndex < ai.mortarTargets.length) {
          const tgt = ai.mortarTargets[ai.mortarIndex];
          rig.root.updateMatrixWorld(true);
          rig.getStaveTipWorldPos(ai.mortarIndex % 6, _muzzle);
          ai.mortarIndex++;
          ai.shotDelay = isP2 ? 0.17 : 0.21;

          _target.set(tgt.x, tgt.y, tgt.z);
          const gravity = 15.8;
          const distToTgt = Math.hypot(_target.x - _muzzle.x, _target.z - _muzzle.z);
          const flightTime = Math.max(0.78, Math.min(1.38, distToTgt / 13.5));
          const vx = (_target.x - _muzzle.x) / flightTime;
          const vz = (_target.z - _muzzle.z) / flightTime;
          const vy = (_target.y - _muzzle.y + 0.5 * gravity * flightTime * flightTime) / flightTime;
          _aimDir.set(vx, vy, vz);
          const speed = _aimDir.length();
          _aimDir.normalize();
          callbacks.onFireAudio('mortar');
          callbacks.spawnMuzzleFlash(_muzzle, _aimDir, 0xf59e0b, false);
          callbacks.spawnProjectile({
            origin: _muzzle.clone(),
            direction: _aimDir.clone(),
            speed,
            damage: isP2 ? 24 : 20,
            radius: 0.22,
            color: ai.mortarIndex % 2 === 0 ? 0xf59e0b : 0xc084fc,
            kind: 'mortar_canister',
            gravity,
            splashRadius: isP2 ? 3.8 : 3.5,
            targetPos: _target.clone(),
            staggerStrength: 0.68,
          });
        }
        if (ai.mortarIndex >= ai.mortarTargets.length) {
          ai.mortarCooldown = isP2 ? 5.0 : 6.6;
          ai.phase = 'recover';
          ai.timer = 0.62;
          ai.maxTimer = 0.62;
        }
      } else if (ai.phase === 'blink_charge') {
        state.behavior = 'windup';
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        blinkPhase = Math.sin(attackProgress * Math.PI);
        castGlow = 0.9;
        if (ai.timer <= 0) {
          // Departure warp ripple + amethyst burst
          _origin.set(spatial.x, spatial.y + 1.5, spatial.z);
          callbacks.spawnBoosterBurst(_origin, _upNormal, 0xe879f9, 18);

          const cand = computeGravCoreBlinkDest(
            spatial.x,
            spatial.z,
            playerPos.x,
            playerPos.z,
            ai.strafeSign,
            isP2 ? 7.0 : 5.8
          );
          resolveWorldHorizontal3D(
            cand.x,
            cand.z,
            spatial.y,
            spatial.radius,
            world,
            _horizScratch,
            spatial.height,
            0.35
          );
          const supportY = resolveSupportHeight3D(
            _horizScratch.x,
            _horizScratch.z,
            spatial.y + 0.6,
            world
          );
          const validFloor =
            supportY !== null && supportY >= F6_BASE_Y - 0.5 && supportY <= F6_BASE_Y + 0.8;
          if (!_horizScratch.collided && validFloor && supportY !== null) {
            spatial.x = _horizScratch.x;
            spatial.z = _horizScratch.z;
            spatial.y = supportY;
          }
          // Arrival burst + snap facing player
          spatial.yaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);
          _origin.set(spatial.x, spatial.y + 1.5, spatial.z);
          callbacks.spawnBoosterBurst(_origin, _upNormal, 0xfde047, 16);
          callbacks.spawnPerilGlint(_origin, 0xf0abfc);

          ai.strafeSign *= -1;
          ai.blinkCooldown = isP2 ? 4.0 : 5.6;
          ai.phase = 'glide';
        }
      } else if (ai.phase === 'repel_windup') {
        state.behavior = 'windup';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 5.5, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        formation = 'repel_implode';
        repelImplode = attackProgress;
        castGlow = 0.6 + attackProgress * 0.85;
        if (ai.timer <= 0) {
          ai.phase = 'repel_blast';
          ai.timer = 0.42;
          ai.maxTimer = 0.42;
        }
      } else if (ai.phase === 'repel_blast') {
        state.behavior = 'attack';
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        formation = 'repel_implode';
        repelImplode = 1 - attackProgress * 0.4;
        castGlow = 1.25 * (1 - attackProgress * 0.5);
        if (!ai.hitDone && attackProgress >= 0.2) {
          ai.hitDone = true;
          _origin.set(spatial.x, spatial.y + 0.14, spatial.z);
          callbacks.spawnShockwave({
            center: _origin.clone(),
            maxRadius: isP2 ? 11.0 : 9.2,
            expandSpeed: 16.5,
            damage: isP2 ? 30 : 25,
            color: 0xe879f9,
            staggerStrength: 0.92,
          });
          callbacks.spawnRailImpactCrater(_origin, _upNormal, 0xfde047);
          callbacks.spawnBoosterBurst(_origin, _upNormal, 0xf0abfc, 20);
          callbacks.onTelegraphAudio('shield_slam');
          ai.repelCooldown = isP2 ? 4.6 : 6.0;
        }
        if (ai.timer <= 0) {
          ai.phase = 'recover';
          ai.timer = 0.58;
          ai.maxTimer = 0.58;
        }
      } else if (ai.phase === 'recover') {
        state.behavior = 'recover';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 4.2, dt);
        ai.timer -= dt;
        if (ai.timer <= 0) {
          ai.phase = 'glide';
          ai.strafeSign *= -1;
        }
      }

      // ── Update Wall-Clamped Volumetric Reality-Tear Beam ──
      if (beamActive) {
        rig.root.updateMatrixWorld(true);
        rig.getMuzzleWorldPos(_muzzle);
        const fwdX = -Math.sin(activeBeamYaw) * Math.cos(ai.lockedPitch);
        const fwdY = Math.sin(ai.lockedPitch);
        const fwdZ = -Math.cos(activeBeamYaw) * Math.cos(ai.lockedPitch);
        const maxLen = 40;
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
        rig.setBeamTelegraph(
          true,
          hitWall ? _rayHit.t * maxLen : maxLen,
          beamCharge,
          beamFiring,
          sweepYawOffset
        );
      } else {
        rig.setBeamTelegraph(false, 0, 0, false, 0);
      }

      rig.setWeaverVisualState({
        formation,
        phase2Aura: isP2 ? 1.0 : 0.0,
        castGlow,
        riftIntensity,
        repelImplode,
        blinkPhase,
      });

      stepEnemyMovement(spatial, desVx, desVz, world, dt, F6_WEAVER_MIN_Y);
      const speed = Math.hypot(spatial.vx, spatial.vz);
      const invSpd = 1 / Math.max(0.1, cfg.moveSpeed);
      const fwdDot = spatial.vx * -Math.sin(spatial.yaw) + spatial.vz * -Math.cos(spatial.yaw);
      const rightDot = spatial.vx * Math.cos(spatial.yaw) + spatial.vz * -Math.sin(spatial.yaw);

      rig.updateAnimation({
        dt,
        elapsed,
        behavior: state.behavior,
        speedRatio: speed * invSpd,
        localMoveX: rightDot * invSpd,
        localMoveZ: fwdDot * invSpd,
        aimPitch,
        attackProgress,
        attackVariant: 0,
        flinchTimer: state.flinchTimer,
        flinchDirX: state.flinchDirX,
        staggerTimer: 0,
        deadProgress: 0,
        weakpointExposed: state.weakpoint.exposed,
        weakpointBroken: haloBroken,
        shieldActive: false,
        phase: state.phase,
        airborneHeight: 0,
      });
    },
  };
}
