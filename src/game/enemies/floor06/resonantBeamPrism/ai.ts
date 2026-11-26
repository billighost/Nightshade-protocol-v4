import * as THREE from 'three';
import type { EnemyAiStepContext, EnemyArchetypeBrain } from '../../core/enemyManager';
import {
  computeFacingYaw,
  hasEnemyLineOfSight,
  raycastCollisionWorld3D,
  rotateYawTowards,
} from '../../core/enemyNav';
import type { Floor06EnemyMaterials } from '../materials';
import { RESONANT_BEAM_PRISM_CONFIG } from './config';
import {
  buildResonantBeamPrismRig,
  type BeamPrismApertureMode,
  type BeamPrismRigHandle,
} from './mesh';
import {
  computeRefractedFanAngles,
  computeSweepBeamYaw,
  selectBeamPrismAction,
  solvePrismMortarCluster,
} from './tactics';
import {
  createBeamPrismTextures,
  type BeamPrismTextureSuite,
} from './textures';

type PrismPhase =
  | 'scan'
  | 'rail_charge'
  | 'rail_fire'
  | 'sweep_windup'
  | 'sweep_beam'
  | 'fan_windup'
  | 'fan_fire'
  | 'mortar_windup'
  | 'mortar_launch'
  | 'shield_hold'
  | 'pulse_windup'
  | 'pulse_blast'
  | 'recover';

interface PrismAiState {
  phase: PrismPhase;
  timer: number;
  maxTimer: number;
  railCooldown: number;
  sweepCooldown: number;
  fanCooldown: number;
  mortarCooldown: number;
  shieldCooldown: number;
  pulseCooldown: number;
  lockedYaw: number;
  lockedPitch: number;
  sweepCenterYaw: number;
  sweepDir: 1 | -1;
  sweepScarTick: number;
  sweepDamageTick: number;
  hitDone: boolean;
  lastHp: number;
  damageBurstAccum: number;
  timeWithoutLos: number;
  staggerSparkTick: number;
}

// Module-scope scratch math helpers (zero per-frame GC!)
const _muzzle = new THREE.Vector3();
const _glint = new THREE.Vector3();
const _aimDir = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _toPlayer = new THREE.Vector3();
const _rayHit = {
  hit: false,
  point: new THREE.Vector3(),
  normal: new THREE.Vector3(),
  t: 1,
};

let sharedPrismTextures: BeamPrismTextureSuite | null = null;
function getSharedPrismTextures(): BeamPrismTextureSuite {
  if (!sharedPrismTextures) {
    sharedPrismTextures = createBeamPrismTextures();
  }
  return sharedPrismTextures;
}

export function createResonantBeamPrismBrain(mats: Floor06EnemyMaterials): EnemyArchetypeBrain {
  return {
    config: RESONANT_BEAM_PRISM_CONFIG,
    createRig: (enemyId) =>
      buildResonantBeamPrismRig(enemyId, mats, getSharedPrismTextures()),
    createAiState: (): Record<string, unknown> => ({
      phase: 'scan',
      timer: 0,
      maxTimer: 1,
      railCooldown: 1.5 + Math.random() * 1.4,
      sweepCooldown: 3.4 + Math.random() * 1.8,
      fanCooldown: 1.1 + Math.random() * 1.0,
      mortarCooldown: 2.8 + Math.random() * 1.6,
      shieldCooldown: 3.0,
      pulseCooldown: 0.75,
      lockedYaw: 0,
      lockedPitch: 0,
      sweepCenterYaw: 0,
      sweepDir: 1,
      sweepScarTick: 0,
      sweepDamageTick: 0,
      hitDone: false,
      lastHp: RESONANT_BEAM_PRISM_CONFIG.maxHp,
      damageBurstAccum: 0,
      timeWithoutLos: 0,
      staggerSparkTick: 0,
    }),
    stepAi: (ctx: EnemyAiStepContext) => {
      const ai = ctx.aiState as unknown as PrismAiState;
      const rig = ctx.rig as BeamPrismRigHandle;
      const { dt, elapsed, state, spatial, playerPos, world, callbacks } = ctx;
      const cfg = RESONANT_BEAM_PRISM_CONFIG;

      ai.railCooldown = Math.max(0, ai.railCooldown - dt);
      ai.sweepCooldown = Math.max(0, ai.sweepCooldown - dt);
      ai.fanCooldown = Math.max(0, ai.fanCooldown - dt);
      ai.mortarCooldown = Math.max(0, ai.mortarCooldown - dt);
      ai.shieldCooldown = Math.max(0, ai.shieldCooldown - dt);
      ai.pulseCooldown = Math.max(0, ai.pulseCooldown - dt);
      ai.damageBurstAccum = Math.max(0, ai.damageBurstAccum - dt * 36);

      const dmgDelta = ai.lastHp - state.hp;
      ai.lastHp = state.hp;
      if (dmgDelta > 1) {
        state.engaged = true;
        ai.damageBurstAccum += dmgDelta;
      }

      // =====================================================================
      // STAGGERED / REFRACTIVE PRISM CORE SHATTERED STATE
      // =====================================================================
      if (state.staggerTimer > 0) {
        ai.phase = 'scan';
        state.shieldActive = false;
        rig.setApertureMode('scan_idle');
        rig.setTargetingLaser(false, 0, 0, false);
        rig.setRefractionShield(false, 0);
        rig.setNovaTelegraph(false, 0, 0);
        rig.setMortarOrbCharge(0);

        ai.staggerSparkTick += dt;
        if (ai.staggerSparkTick >= 0.22) {
          ai.staggerSparkTick = 0;
          rig.getWeakpointWorldPos(_glint);
          callbacks.spawnBoosterBurst(_glint, _up, 0x2dd4bf, 5);
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
      const dy = playerPos.y + 1.18 - (spatial.y + 1.66);
      const dz = playerPos.z - spatial.z;
      const horizDist = Math.hypot(dx, dz);
      if (!Number.isFinite(horizDist)) return;

      const hasLos =
        horizDist <= cfg.detectRange &&
        hasEnemyLineOfSight(
          spatial.x,
          spatial.y + 1.66,
          spatial.z,
          playerPos.x,
          playerPos.y + 1.3,
          playerPos.z,
          world
        );

      if (hasLos) {
        ai.timeWithoutLos = 0;
        state.engaged = true;
      } else if (state.engaged) {
        ai.timeWithoutLos += dt;
      }

      if (state.hp < state.maxHp) {
        state.engaged = true;
      }

      const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);
      const aimPitch = Math.atan2(dy, Math.max(1, horizDist));

      let attackProgress = 0;
      let apertureMode: BeamPrismApertureMode = 'scan_idle';
      let laserActive = false;
      let laserFiring = false;
      let laserCharge = 0;
      let laserYaw = ai.lockedYaw;
      let laserPitch = ai.lockedPitch;
      let shieldOn = false;
      let mortarCharge = 0;
      let novaActive = false;
      let novaProg = 0;

      if (!state.engaged) {
        state.behavior = 'idle';
        spatial.yaw += dt * 0.42;
      } else if (ai.phase === 'scan') {
        state.behavior = 'idle';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 5.4, dt);

        const next = selectBeamPrismAction({
          horizDist,
          hasLos,
          hasAttackToken: ctx.hasAttackToken,
          coreBroken: state.weakpoint.broken,
          railCooldown: ai.railCooldown,
          sweepCooldown: ai.sweepCooldown,
          fanCooldown: ai.fanCooldown,
          mortarCooldown: ai.mortarCooldown,
          shieldCooldown: ai.shieldCooldown,
          pulseCooldown: ai.pulseCooldown,
          damageBurstAccum: ai.damageBurstAccum,
          timeWithoutLos: ai.timeWithoutLos,
          roll: Math.random(),
        });

        if (next === 'close_pulse') {
          ai.phase = 'pulse_windup';
          ai.timer = 0.52;
          ai.maxTimer = 0.52;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('warden_vent');
          rig.getWeakpointWorldPos(_glint);
          callbacks.spawnPerilGlint(_glint, 0x2dd4bf);
        } else if (next === 'resonance_shield_surge') {
          ai.phase = 'shield_hold';
          ai.timer = 2.15;
          ai.maxTimer = 2.15;
          ai.damageBurstAccum = 0;
          ai.shieldCooldown = 9.5 + Math.random() * 2.5;
          callbacks.onTelegraphAudio('warden_vent');
          rig.getShieldCenterWorldPos(_glint);
          callbacks.spawnPerilGlint(_glint, 0x5eead4);
        } else if (next === 'prismatic_orbit_barrage') {
          ai.phase = 'mortar_windup';
          ai.timer = 0.58;
          ai.maxTimer = 0.58;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('pyro_flare');
          rig.getCrownOrbWorldPos(_glint);
          callbacks.spawnPerilGlint(_glint, 0xfef08a);
        } else if (next === 'resonant_rail_beam') {
          ai.phase = 'rail_charge';
          ai.timer = 1.05;
          ai.maxTimer = 1.05;
          ai.lockedYaw = targetYaw;
          ai.lockedPitch = aimPitch;
          callbacks.onTelegraphAudio('rail_charge');
          rig.getWeakpointWorldPos(_glint);
          callbacks.spawnPerilGlint(_glint, 0xfef08a);
        } else if (next === 'sweeping_prism_laser') {
          ai.phase = 'sweep_windup';
          ai.timer = 0.62;
          ai.maxTimer = 0.62;
          ai.sweepCenterYaw = targetYaw;
          ai.sweepDir = Math.random() < 0.5 ? 1 : -1;
          ai.lockedYaw = computeSweepBeamYaw(targetYaw, 0, ai.sweepDir);
          ai.lockedPitch = aimPitch;
          ai.sweepScarTick = 0;
          ai.sweepDamageTick = 0;
          callbacks.onTelegraphAudio('rail_charge');
          rig.getWeakpointWorldPos(_glint);
          callbacks.spawnPerilGlint(_glint, 0x2dd4bf);
        } else if (next === 'refracted_fan') {
          ai.phase = 'fan_windup';
          ai.timer = 0.44;
          ai.maxTimer = 0.44;
          callbacks.onTelegraphAudio('pyro_flare');
          rig.getMuzzleWorldPos(_glint);
          callbacks.spawnPerilGlint(_glint, 0x2dd4bf);
        }
      } else if (ai.phase === 'rail_charge') {
        state.behavior = 'windup';
        apertureMode = 'rail_barrel';
        ai.timer -= dt;
        const charge = 1 - Math.max(0, ai.timer / ai.maxTimer);
        attackProgress = charge;
        laserActive = true;
        laserCharge = charge;

        if (charge < 0.72) {
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 5.0, dt);
          ai.lockedYaw = spatial.yaw;
          ai.lockedPitch = aimPitch;
        }
        laserYaw = ai.lockedYaw;
        laserPitch = ai.lockedPitch;

        if (ai.timer <= 0) {
          ai.phase = 'rail_fire';
          ai.timer = 0.28;
          ai.maxTimer = 0.28;
          rig.triggerWingRecoil();
          rig.getMuzzleWorldPos(_muzzle);
          _aimDir
            .set(
              -Math.sin(ai.lockedYaw) * Math.cos(ai.lockedPitch),
              Math.sin(ai.lockedPitch),
              -Math.cos(ai.lockedYaw) * Math.cos(ai.lockedPitch)
            )
            .normalize();
          callbacks.spawnMuzzleFlash(_muzzle, _aimDir, 0xfef08a, true);
          callbacks.onFireAudio('rail_slug');
          callbacks.spawnProjectile({
            origin: _muzzle.clone(),
            direction: _aimDir.clone(),
            speed: 86,
            damage: 29,
            radius: 0.19,
            color: 0x2dd4bf,
            kind: 'rail_slug',
            staggerStrength: 0.76,
          });
          // Carve burning rail impact crater if wall is struck
          const hitWall = raycastCollisionWorld3D(
            _muzzle.x,
            _muzzle.y,
            _muzzle.z,
            _muzzle.x + _aimDir.x * 42,
            _muzzle.y + _aimDir.y * 42,
            _muzzle.z + _aimDir.z * 42,
            world,
            _rayHit
          );
          if (hitWall) {
            callbacks.spawnRailImpactCrater(_rayHit.point, _rayHit.normal, 0x2dd4bf);
          }
          ai.railCooldown = 4.4 + Math.random() * 1.4;
        }
      } else if (ai.phase === 'rail_fire') {
        state.behavior = 'attack';
        apertureMode = 'rail_barrel';
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        // Blazing residual rail-beam flash!
        laserActive = attackProgress < 0.72;
        laserFiring = true;
        laserCharge = 1.0 - attackProgress;
        laserYaw = ai.lockedYaw;
        laserPitch = ai.lockedPitch;
        if (ai.timer <= 0) {
          ai.phase = 'recover';
          ai.timer = 0.68;
          ai.maxTimer = 0.68;
        }
      } else if (ai.phase === 'sweep_windup') {
        state.behavior = 'windup';
        apertureMode = 'sweep_fan';
        ai.timer -= dt;
        const charge = 1 - Math.max(0, ai.timer / ai.maxTimer);
        attackProgress = charge;
        spatial.yaw = rotateYawTowards(spatial.yaw, ai.lockedYaw, 7.2, dt);
        laserActive = true;
        laserCharge = charge;
        laserYaw = spatial.yaw;
        laserPitch = ai.lockedPitch;

        if (ai.timer <= 0) {
          ai.phase = 'sweep_beam';
          ai.timer = 1.15;
          ai.maxTimer = 1.15;
          callbacks.onFireAudio('rail_slug');
          rig.getMuzzleWorldPos(_muzzle);
          callbacks.spawnMuzzleFlash(_muzzle, _up, 0xfef08a, true);
        }
      } else if (ai.phase === 'sweep_beam') {
        state.behavior = 'attack';
        apertureMode = 'sweep_fan';
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        const curYaw = computeSweepBeamYaw(ai.sweepCenterYaw, attackProgress, ai.sweepDir);
        spatial.yaw = curYaw;
        laserActive = true;
        laserFiring = true;
        laserCharge = 1.2;
        laserYaw = curYaw;
        laserPitch = ai.lockedPitch;

        // Live continuous swept beam hit-test + glowing surface burn scars!
        rig.root.updateMatrixWorld(true);
        rig.getMuzzleWorldPos(_muzzle);
        _aimDir
          .set(
            -Math.sin(curYaw) * Math.cos(ai.lockedPitch),
            Math.sin(ai.lockedPitch),
            -Math.cos(curYaw) * Math.cos(ai.lockedPitch)
          )
          .normalize();
        const maxLen = 38;
        const hitWall = raycastCollisionWorld3D(
          _muzzle.x,
          _muzzle.y,
          _muzzle.z,
          _muzzle.x + _aimDir.x * maxLen,
          _muzzle.y + _aimDir.y * maxLen,
          _muzzle.z + _aimDir.z * maxLen,
          world,
          _rayHit
        );
        const beamLen = hitWall ? _rayHit.t * maxLen : maxLen;

        ai.sweepScarTick += dt;
        if (hitWall && ai.sweepScarTick >= 0.16) {
          ai.sweepScarTick = 0;
          callbacks.spawnSurfaceSlashScar(_rayHit.point, _rayHit.normal, _aimDir, true);
        }

        // Check closest point on active laser segment to player torso (with wall occlusion!)
        ai.sweepDamageTick = Math.max(0, ai.sweepDamageTick - dt);
        if (ai.sweepDamageTick <= 0) {
          _toPlayer.set(
            playerPos.x - _muzzle.x,
            playerPos.y + 1.1 - _muzzle.y,
            playerPos.z - _muzzle.z
          );
          const proj = _toPlayer.dot(_aimDir);
          if (proj > 0.5 && proj < beamLen + 0.5) {
            const perpDistSq = _toPlayer.lengthSq() - proj * proj;
            if (perpDistSq <= 0.72 * 0.72) {
              ai.sweepDamageTick = 0.24;
              callbacks.applyPlayerMeleeHit(13, _muzzle, 0.35);
            }
          }
        }

        if (ai.timer <= 0) {
          ai.sweepCooldown = 6.2 + Math.random() * 1.8;
          ai.phase = 'recover';
          ai.timer = 0.85;
          ai.maxTimer = 0.85;
        }
      } else if (ai.phase === 'fan_windup') {
        state.behavior = 'windup';
        apertureMode = 'sweep_fan';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.4, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.phase = 'fan_fire';
          ai.timer = 0.28;
          ai.maxTimer = 0.28;
          rig.triggerWingRecoil();
          rig.getMuzzleWorldPos(_muzzle);
          callbacks.onFireAudio('rifle');
          const angles = computeRefractedFanAngles(state.weakpoint.broken);
          for (let i = 0; i < angles.length; i++) {
            const y = spatial.yaw + angles[i];
            _aimDir
              .set(
                -Math.sin(y) * Math.cos(aimPitch),
                Math.sin(aimPitch),
                -Math.cos(y) * Math.cos(aimPitch)
              )
              .normalize();
            const boltColor = i % 2 === 0 ? 0x2dd4bf : 0xfef08a;
            if (i === Math.floor(angles.length / 2)) {
              callbacks.spawnMuzzleFlash(_muzzle, _aimDir, boltColor, true);
            }
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _aimDir.clone(),
              speed: 40,
              damage: 14,
              radius: 0.16,
              color: boltColor,
              kind: 'plasma_bolt',
              staggerStrength: 0.24,
            });
          }
          ai.fanCooldown = 2.7 + Math.random() * 1.0;
        }
      } else if (ai.phase === 'fan_fire') {
        state.behavior = 'attack';
        apertureMode = 'sweep_fan';
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.phase = 'recover';
          ai.timer = 0.52;
          ai.maxTimer = 0.52;
        }
      } else if (ai.phase === 'mortar_windup') {
        state.behavior = 'windup';
        apertureMode = 'bloom_mortar';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 5.2, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        mortarCharge = 0.35 + attackProgress * 0.9;
        if (ai.timer <= 0) {
          ai.phase = 'mortar_launch';
          ai.timer = 0.36;
          ai.maxTimer = 0.36;
          rig.triggerWingRecoil();
          rig.getCrownOrbWorldPos(_origin);
          callbacks.onFireAudio('mortar');
          callbacks.spawnMuzzleFlash(_origin, _up, 0xfef08a, true);
          const arcs = solvePrismMortarCluster(
            _origin.x,
            _origin.y,
            _origin.z,
            playerPos.x,
            playerPos.y + 0.25,
            playerPos.z
          );
          for (let i = 0; i < arcs.length; i++) {
            const a = arcs[i];
            _aimDir.set(a.vx, a.vy, a.vz).normalize();
            callbacks.spawnProjectile({
              origin: _origin.clone(),
              direction: _aimDir.clone(),
              speed: a.speed,
              damage: 20,
              radius: 0.24,
              color: i === 1 ? 0xfef08a : 0x2dd4bf,
              kind: 'mortar_canister',
              gravity: 16.5,
              splashRadius: 3.1,
              staggerStrength: 0.55,
            });
          }
          ai.mortarCooldown = 6.5 + Math.random() * 2.0;
          ai.timeWithoutLos = 0;
        }
      } else if (ai.phase === 'mortar_launch') {
        state.behavior = 'attack';
        apertureMode = 'bloom_mortar';
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.phase = 'recover';
          ai.timer = 0.64;
          ai.maxTimer = 0.64;
        }
      } else if (ai.phase === 'shield_hold') {
        state.behavior = 'chase';
        apertureMode = 'refraction_shield';
        shieldOn = true;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.2, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0 || state.weakpoint.broken) {
          // Immediately snap into a crisp Refracted Fan counter-volley!
          if (!state.weakpoint.broken && hasLos) {
            ai.phase = 'fan_windup';
            ai.timer = 0.3;
            ai.maxTimer = 0.3;
          } else {
            ai.phase = 'recover';
            ai.timer = 0.45;
            ai.maxTimer = 0.45;
          }
        }
      } else if (ai.phase === 'pulse_windup') {
        state.behavior = 'windup';
        apertureMode = 'bloom_mortar';
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        novaActive = true;
        novaProg = attackProgress;
        if (ai.timer <= 0) {
          ai.phase = 'pulse_blast';
          ai.timer = 0.34;
          ai.maxTimer = 0.34;
        }
      } else if (ai.phase === 'pulse_blast') {
        state.behavior = 'attack';
        apertureMode = 'sweep_fan';
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (!ai.hitDone && attackProgress >= 0.22) {
          ai.hitDone = true;
          rig.triggerWingRecoil();
          _origin.set(spatial.x, spatial.y + 0.14, spatial.z);
          callbacks.spawnShockwave({
            center: _origin.clone(),
            maxRadius: 7.2,
            expandSpeed: 15.0,
            damage: 24,
            color: 0x2dd4bf,
            staggerStrength: 0.85,
          });
          callbacks.spawnRailImpactCrater(_origin, _up, 0x2dd4bf);
          callbacks.onFireAudio('rail_slug');
          ai.pulseCooldown = 5.2;
        }
        if (ai.timer <= 0) {
          ai.phase = 'recover';
          ai.timer = 0.58;
          ai.maxTimer = 0.58;
        }
      } else if (ai.phase === 'recover') {
        state.behavior = 'recover';
        apertureMode = 'scan_idle';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 3.8, dt);
        ai.timer -= dt;
        if (ai.timer <= 0) ai.phase = 'scan';
      }

      // Sync authentic frontal Refraction Shield blocking flag
      state.shieldActive = shieldOn && !state.weakpoint.broken;
      rig.setApertureMode(apertureMode);
      rig.setRefractionShield(state.shieldActive, 1.0);
      rig.setMortarOrbCharge(mortarCharge);
      rig.setNovaTelegraph(novaActive, 7.2, novaProg);

      if (laserActive) {
        rig.root.updateMatrixWorld(true);
        rig.getMuzzleWorldPos(_muzzle);
        const fwdX = -Math.sin(laserYaw) * Math.cos(laserPitch);
        const fwdY = Math.sin(laserPitch);
        const fwdZ = -Math.cos(laserYaw) * Math.cos(laserPitch);
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
        rig.setTargetingLaser(
          true,
          hitWall ? _rayHit.t * maxLen : maxLen,
          laserCharge,
          laserFiring
        );
      } else {
        rig.setTargetingLaser(false, 0, 0, false);
      }

      rig.updateAnimation({
        dt,
        elapsed,
        behavior: state.behavior,
        speedRatio: 0,
        localMoveX: 0,
        localMoveZ: 0,
        aimPitch: laserActive ? laserPitch : aimPitch,
        attackProgress,
        attackVariant: 0,
        flinchTimer: state.flinchTimer,
        flinchDirX: state.flinchDirX,
        staggerTimer: 0,
        deadProgress: 0,
        weakpointExposed: state.weakpoint.exposed,
        weakpointBroken: state.weakpoint.broken,
        shieldActive: state.shieldActive,
        phase: 1,
        airborneHeight: 0,
      });
    },
  };
}
