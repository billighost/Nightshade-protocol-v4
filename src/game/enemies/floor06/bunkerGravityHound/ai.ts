import * as THREE from 'three';
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
import { BUNKER_GRAVITY_HOUND_CONFIG } from './config';
import {
  buildBunkerGravityHoundRig,
  type BunkerGravityHoundRigHandle,
  type GravityHoundStance,
} from './mesh';
import {
  computeHoundMawSweepYaw,
  computeHoundTuskSpread,
  selectGravityHoundAction,
  solveHoundMortarCluster,
  solveHoundPounceLeap,
  type HoundMortarArcSolution,
} from './tactics';
import {
  createBunkerGravityHoundTextures,
  type BunkerGravityHoundTextureSuite,
} from './textures';

const F6_HOUND_MIN_Y = F6_BASE_Y - 0.8;

type HoundPhase =
  | 'stalk'
  | 'pounce_windup'
  | 'pounce_leap'
  | 'pulse_windup'
  | 'pulse_blast'
  | 'tail_windup'
  | 'tail_spin'
  | 'tusk_windup'
  | 'tusk_fire'
  | 'mortar_windup'
  | 'mortar_fire'
  | 'charge_windup'
  | 'charge_rush'
  | 'beam_windup'
  | 'beam_sweep'
  | 'recover';

interface HoundAiState {
  phase: HoundPhase;
  timer: number;
  maxTimer: number;
  pounceCooldown: number;
  pulseCooldown: number;
  tuskCooldown: number;
  tailCooldown: number;
  mortarCooldown: number;
  chargeCooldown: number;
  beamCooldown: number;
  timeWithoutLos: number;
  leapVx: number;
  leapVz: number;
  leapPeakHeight: number;
  bouncesLeft: number;
  chargeVx: number;
  chargeVz: number;
  tuskSpread: number[];
  tuskIndex: number;
  mortarQueue: HoundMortarArcSolution[];
  mortarIndex: number;
  shotDelay: number;
  hitDone: boolean;
  aftershockDone: boolean;
  beamBaseYaw: number;
  beamSweepDir: -1 | 1;
  beamTickCooldown: number;
  beamScarCooldown: number;
  boosterBurstCooldown: number;
  phase2Announced: boolean;
}

const _muzzle = new THREE.Vector3();
const _glint = new THREE.Vector3();
const _aimDir = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _impactPos = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _rayHit = { hit: false, point: new THREE.Vector3(), normal: new THREE.Vector3(), t: 1 };

function clampBunkerVaultBounds(spatial: { x: number; z: number }): void {
  if (spatial.x < -34.0 && spatial.z > 13.5) {
    spatial.x = -34.0;
  }
}

export function createBunkerGravityHoundBrain(mats: Floor06EnemyMaterials): EnemyArchetypeBrain {
  let sharedTextures: BunkerGravityHoundTextureSuite | null = null;

  return {
    config: BUNKER_GRAVITY_HOUND_CONFIG,
    createRig: (enemyId) => {
      if (!sharedTextures) {
        sharedTextures = createBunkerGravityHoundTextures();
      }
      return buildBunkerGravityHoundRig(enemyId, mats, sharedTextures);
    },
    createAiState: (): Record<string, unknown> => ({
      phase: 'stalk',
      timer: 0,
      maxTimer: 1,
      pounceCooldown: 1.5,
      pulseCooldown: 2.0,
      tuskCooldown: 1.1,
      tailCooldown: 1.8,
      mortarCooldown: 2.8,
      chargeCooldown: 3.2,
      beamCooldown: 3.6,
      timeWithoutLos: 0,
      leapVx: 0,
      leapVz: 0,
      leapPeakHeight: 1.6,
      bouncesLeft: 0,
      chargeVx: 0,
      chargeVz: 0,
      tuskSpread: [],
      tuskIndex: 0,
      mortarQueue: [],
      mortarIndex: 0,
      shotDelay: 0,
      hitDone: false,
      aftershockDone: false,
      beamBaseYaw: 0,
      beamSweepDir: 1,
      beamTickCooldown: 0,
      beamScarCooldown: 0,
      boosterBurstCooldown: 0,
      phase2Announced: false,
    }),
    stepAi: (ctx: EnemyAiStepContext) => {
      const ai = ctx.aiState as unknown as HoundAiState;
      const { dt, elapsed, state, spatial, playerPos, playerRolling, world, callbacks } = ctx;
      const rig = ctx.rig as BunkerGravityHoundRigHandle;
      const cfg = BUNKER_GRAVITY_HOUND_CONFIG;
      const isP2 = state.phase === 2;

      // Phase 2 Apex Overdrive awakening shockwave & callout
      if (isP2 && !ai.phase2Announced) {
        ai.phase2Announced = true;
        callbacks.onTelegraphAudio('kestrel_overdrive');
        _origin.set(spatial.x, spatial.y + 0.18, spatial.z);
        callbacks.spawnShockwave({
          center: _origin.clone(),
          maxRadius: 10.2,
          expandSpeed: 16.0,
          damage: 22,
          color: 0xf97316,
          staggerStrength: 0.85,
        });
        callbacks.spawnRailImpactCrater(_origin, _up, 0xf97316);
        callbacks.showIntelCallout(
          'BUNKER GRAVITY-HOUND · APEX OVERDRIVE',
          cfg.phase2Intel ?? 'PHASE 2 OVERDRIVE — PUNISH DORSAL GRAV-SINGULARITY REACTOR!',
          4.5
        );
      }

      // Tick all 7 cooldowns
      ai.pounceCooldown = Math.max(0, ai.pounceCooldown - dt);
      ai.pulseCooldown = Math.max(0, ai.pulseCooldown - dt);
      ai.tuskCooldown = Math.max(0, ai.tuskCooldown - dt);
      ai.tailCooldown = Math.max(0, ai.tailCooldown - dt);
      ai.mortarCooldown = Math.max(0, ai.mortarCooldown - dt);
      ai.chargeCooldown = Math.max(0, ai.chargeCooldown - dt);
      ai.beamCooldown = Math.max(0, ai.beamCooldown - dt);
      ai.boosterBurstCooldown = Math.max(0, ai.boosterBurstCooldown - dt);

      // Collapsed stagger state when Dorsal Grav-Singularity Reactor shatters!
      if (state.staggerTimer > 0) {
        ai.phase = 'stalk';
        rig.setMawBeamTelegraph(false, 0, 0, false, 0);
        rig.setHoundVisualState({
          stance: 'stalk',
          phase2Aura: 0,
          jawOpen: 0.44,
          shutterOpen: 1.0,
          gravFieldIntensity: 0.1,
          tuskCharge: 0,
          tailSpinAngle: 0,
          mortarPitch: 0,
        });
        stepEnemyMovement(spatial, 0, 0, world, dt, F6_HOUND_MIN_Y);
        clampBunkerVaultBounds(spatial);
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
      const dz = playerPos.z - spatial.z;
      const horizDist = Math.hypot(dx, dz);
      const hasLos =
        horizDist <= cfg.detectRange &&
        hasEnemyLineOfSight(
          spatial.x,
          spatial.y + 1.45,
          spatial.z,
          playerPos.x,
          playerPos.y + 1.3,
          playerPos.z,
          world
        );

      if (hasLos || horizDist < 19 || state.hp < state.maxHp) {
        state.engaged = true;
      }
      if (hasLos) ai.timeWithoutLos = 0;
      else if (state.engaged) ai.timeWithoutLos += dt;

      const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);
      const dirX = horizDist > 0.01 ? dx / horizDist : -Math.sin(spatial.yaw);
      const dirZ = horizDist > 0.01 ? dz / horizDist : -Math.cos(spatial.yaw);

      // Check whether the player is flanking behind the Hound (dot with forward < -0.25)
      const fwdX = -Math.sin(spatial.yaw);
      const fwdZ = -Math.cos(spatial.yaw);
      const playerBehind = dirX * fwdX + dirZ * fwdZ < -0.25;

      let desVx = 0;
      let desVz = 0;
      let attackProgress = 0;
      let attackVariant = 0;
      let airborneHeight = 0;

      let stance: GravityHoundStance = isP2 ? 'phase2_overdrive' : 'stalk';
      let jawOpen = 0;
      let shutterOpen = state.weakpoint.exposed ? 0.92 : isP2 ? 0.45 : 0.2;
      let gravFieldIntensity = isP2 ? 0.52 : 0.16;
      let tuskCharge = 0;
      let tailSpinAngle = 0;
      let mortarPitch = 0;

      // Default beam off unless active in beam phases
      if (ai.phase !== 'beam_windup' && ai.phase !== 'beam_sweep') {
        rig.setMawBeamTelegraph(false, 0, 0, false, 0);
      }

      if (!state.engaged) {
        state.behavior = 'idle';
        stance = 'stalk';
      } else if (ai.phase === 'stalk') {
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, isP2 ? 7.6 : 5.8, dt);
        const action = selectGravityHoundAction({
          horizDist,
          hasLos,
          phase: state.phase,
          pounceCooldown: ai.pounceCooldown,
          pulseCooldown: ai.pulseCooldown,
          tuskCooldown: ai.tuskCooldown,
          tailCooldown: ai.tailCooldown,
          mortarCooldown: ai.mortarCooldown,
          chargeCooldown: ai.chargeCooldown,
          beamCooldown: ai.beamCooldown,
          reactorBroken: state.weakpoint.broken,
          playerBehind,
          timeWithoutLos: ai.timeWithoutLos,
          roll: Math.random(),
        });

        if (action === 'tail_whip_cleave') {
          ai.phase = 'tail_windup';
          ai.timer = isP2 ? 0.34 : 0.42;
          ai.maxTimer = ai.timer;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('melee');
          rig.getTailTipWorldPos(_glint);
          callbacks.spawnPerilGlint(_glint, 0xef4444);
        } else if (action === 'gravity_well_pulse') {
          ai.phase = 'pulse_windup';
          ai.timer = isP2 ? 0.54 : 0.66;
          ai.maxTimer = ai.timer;
          ai.hitDone = false;
          ai.aftershockDone = false;
          callbacks.onTelegraphAudio('boss_slam');
          rig.getWeakpointWorldPos(_glint);
          callbacks.spawnPerilGlint(_glint, 0xef4444);
        } else if (action === 'gravity_pounce_slam') {
          ai.phase = 'pounce_windup';
          ai.timer = isP2 ? 0.42 : 0.54;
          ai.maxTimer = ai.timer;
          ai.bouncesLeft = isP2 ? 1 : 0;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('shield_charge');
          rig.getMuzzleWorldPos(_glint);
          callbacks.spawnPerilGlint(_glint, 0xf97316);
        } else if (action === 'maw_singularity_beam') {
          ai.phase = 'beam_windup';
          ai.timer = isP2 ? 0.72 : 0.86;
          ai.maxTimer = ai.timer;
          ai.beamBaseYaw = targetYaw;
          ai.beamSweepDir = Math.random() < 0.5 ? -1 : 1;
          ai.beamTickCooldown = 0;
          ai.beamScarCooldown = 0;
          callbacks.onTelegraphAudio('rail_charge');
          rig.getMuzzleWorldPos(_glint);
          callbacks.spawnPerilGlint(_glint, 0xfb923c);
        } else if (action === 'bull_gore_charge') {
          ai.phase = 'charge_windup';
          ai.timer = isP2 ? 0.48 : 0.6;
          ai.maxTimer = ai.timer;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('booster_burst');
          rig.getTuskTipWorldPos(-1, _glint);
          callbacks.spawnPerilGlint(_glint, 0xf97316);
          rig.getTuskTipWorldPos(1, _glint);
          callbacks.spawnPerilGlint(_glint, 0xf97316);
        } else if (action === 'grav_mortar_cluster') {
          ai.phase = 'mortar_windup';
          ai.timer = isP2 ? 0.48 : 0.6;
          ai.maxTimer = ai.timer;
          ai.mortarQueue = [];
          ai.mortarIndex = 0;
          callbacks.onTelegraphAudio('mortar');
          rig.getShoulderPodWorldPos(1, _glint);
          callbacks.spawnPerilGlint(_glint, 0xf59e0b);
        } else if (action === 'plasma_tusk_surge') {
          ai.phase = 'tusk_windup';
          ai.timer = 0.38;
          ai.maxTimer = 0.38;
          ai.tuskSpread = computeHoundTuskSpread(state.phase, state.weakpoint.broken);
          ai.tuskIndex = 0;
          callbacks.onTelegraphAudio('pyro_flare');
          rig.getMuzzleWorldPos(_glint);
          callbacks.spawnPerilGlint(_glint, 0xef4444);
        } else {
          state.behavior = 'chase';
          const spd = isP2 ? cfg.sprintSpeed : cfg.moveSpeed;
          desVx = dirX * spd;
          desVz = dirZ * spd;
        }
      } else if (ai.phase === 'pounce_windup') {
        state.behavior = 'windup';
        attackVariant = 1;
        stance = 'pounce_crouch';
        jawOpen = 0.32;
        shutterOpen = 0.65;
        gravFieldIntensity = 0.72;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 9.0, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.boosterBurstCooldown <= 0) {
          ai.boosterBurstCooldown = 0.16;
          _origin.set(spatial.x - fwdX * 0.4, spatial.y + 1.2, spatial.z - fwdZ * 0.4);
          callbacks.spawnBoosterBurst(_origin, _aimDir.set(-fwdX, 0.3, -fwdZ).normalize(), 0xf97316, 10);
        }
        if (ai.timer <= 0) {
          const sol = solveHoundPounceLeap(dx, dz, state.phase, ai.bouncesLeft === 0 && isP2);
          ai.leapVx = sol.vx;
          ai.leapVz = sol.vz;
          ai.leapPeakHeight = sol.peakHeight;
          ai.phase = 'pounce_leap';
          ai.timer = sol.duration;
          ai.maxTimer = sol.duration;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('booster_burst');
          _origin.set(spatial.x, spatial.y + 0.4, spatial.z);
          callbacks.spawnBoosterBurst(_origin, _aimDir.set(-dirX, 0.25, -dirZ).normalize(), 0xf97316, 22);
        }
      } else if (ai.phase === 'pounce_leap') {
        state.behavior = 'attack';
        attackVariant = 1;
        stance = 'pounce_leap';
        jawOpen = 0.56;
        shutterOpen = 0.85;
        tuskCharge = 0.9;
        ai.timer -= dt;
        const p = 1 - Math.max(0, ai.timer / ai.maxTimer);
        attackProgress = p;
        airborneHeight = Math.sin(p * Math.PI) * ai.leapPeakHeight;
        desVx = ai.leapVx;
        desVz = ai.leapVz;

        if (
          !ai.hitDone &&
          !playerRolling &&
          horizDist <= 2.95 &&
          Math.abs(playerPos.y - (spatial.y + airborneHeight * 0.4)) <= 2.4
        ) {
          ai.hitDone = true;
          callbacks.applyPlayerMeleeHit(
            isP2 ? 32 : 26,
            _origin.set(spatial.x, spatial.y + 1.2, spatial.z),
            0.9
          );
          callbacks.spawnBladeSlashArc(
            _origin.set(spatial.x + fwdX * 0.9, spatial.y + 1.2, spatial.z + fwdZ * 0.9),
            spatial.yaw,
            0.35,
            0.12,
            2.6,
            0xf97316,
            true,
            1
          );
        }

        if (ai.timer <= 0) {
          _origin.set(spatial.x, spatial.y + 0.14, spatial.z);
          callbacks.spawnShockwave({
            center: _origin.clone(),
            maxRadius: isP2 ? 9.0 : 7.4,
            expandSpeed: 15.2,
            damage: isP2 ? 26 : 22,
            color: 0xef4444,
            staggerStrength: 0.86,
          });
          callbacks.spawnRailImpactCrater(_origin, _up, 0xf97316);
          callbacks.onTelegraphAudio('shield_slam');

          // Phase 2 Double-Bounce Apex Pounce!
          if (ai.bouncesLeft > 0 && horizDist >= 3.8 && horizDist <= 15.0) {
            ai.bouncesLeft -= 1;
            spatial.yaw = targetYaw;
            ai.phase = 'pounce_windup';
            ai.timer = 0.28;
            ai.maxTimer = 0.28;
          } else {
            ctx.exposeWeakpoint(2.4);
            ai.pounceCooldown = isP2 ? 3.8 : 5.2;
            ai.phase = 'recover';
            ai.timer = isP2 ? 0.78 : 1.05;
            ai.maxTimer = ai.timer;
          }
        }
      } else if (ai.phase === 'pulse_windup') {
        state.behavior = 'windup';
        attackVariant = 2;
        stance = 'grav_pulse';
        jawOpen = 0.58;
        shutterOpen = 1.0;
        gravFieldIntensity = 0.65 + (1 - Math.max(0, ai.timer / ai.maxTimer)) * 0.65;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.phase = 'pulse_blast';
          ai.timer = isP2 ? 0.56 : 0.42;
          ai.maxTimer = ai.timer;
        }
      } else if (ai.phase === 'pulse_blast') {
        state.behavior = 'attack';
        attackVariant = 2;
        stance = 'grav_pulse';
        jawOpen = 0.66;
        shutterOpen = 1.0;
        gravFieldIntensity = 1.25;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (!ai.hitDone && attackProgress >= 0.16) {
          ai.hitDone = true;
          _origin.set(spatial.x, spatial.y + 0.14, spatial.z);
          callbacks.spawnShockwave({
            center: _origin.clone(),
            maxRadius: isP2 ? 10.8 : 9.0,
            expandSpeed: 15.6,
            damage: isP2 ? 28 : 24,
            color: 0xf97316,
            staggerStrength: 0.9,
          });
          callbacks.spawnRailImpactCrater(_origin, _up, 0xef4444);
          callbacks.onTelegraphAudio('shield_slam');
          ai.pulseCooldown = isP2 ? 4.4 : 6.0;
        }
        // Phase 2 staggered Twin-Ring Aftershock!
        if (isP2 && !ai.aftershockDone && attackProgress >= 0.58) {
          ai.aftershockDone = true;
          _origin.set(spatial.x, spatial.y + 0.14, spatial.z);
          callbacks.spawnShockwave({
            center: _origin.clone(),
            maxRadius: 11.4,
            expandSpeed: 18.2,
            damage: 24,
            color: 0xfef08a,
            staggerStrength: 0.82,
          });
          callbacks.onTelegraphAudio('boss_slam');
        }
        if (ai.timer <= 0) {
          ctx.exposeWeakpoint(1.8);
          ai.phase = 'recover';
          ai.timer = 0.68;
          ai.maxTimer = 0.68;
        }
      } else if (ai.phase === 'tail_windup') {
        state.behavior = 'windup';
        attackVariant = 3;
        stance = 'tail_whip';
        jawOpen = 0.35;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        tailSpinAngle = -0.65 * attackProgress;
        if (ai.timer <= 0) {
          ai.phase = 'tail_spin';
          ai.timer = 0.38;
          ai.maxTimer = 0.38;
          callbacks.onKatanaSlashAudio?.(true);
        }
      } else if (ai.phase === 'tail_spin') {
        state.behavior = 'attack';
        attackVariant = 3;
        stance = 'tail_whip';
        jawOpen = 0.52;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        tailSpinAngle = -0.65 + attackProgress * (Math.PI * 2 + 0.65);

        if (!ai.hitDone && attackProgress >= 0.25) {
          ai.hitDone = true;
          _origin.set(spatial.x, spatial.y + 1.05, spatial.z);
          callbacks.spawnBladeSlashArc(_origin, spatial.yaw, 0.08, 0.04, 4.2, 0xef4444, true, 1);
          callbacks.spawnBladeSlashArc(
            _origin,
            spatial.yaw + Math.PI,
            -0.08,
            0.04,
            4.2,
            0xfb923c,
            true,
            1
          );
          callbacks.spawnSurfaceSlashScar(
            _impactPos.set(spatial.x + dirX * 2.2, spatial.y + 0.04, spatial.z + dirZ * 2.2),
            _up,
            _aimDir.set(dirX, 0, dirZ).normalize(),
            true
          );
          if (!playerRolling && horizDist <= 4.45 && Math.abs(playerPos.y - spatial.y) <= 2.3) {
            callbacks.applyPlayerMeleeHit(
              isP2 ? 30 : 24,
              _origin.set(spatial.x, spatial.y + 1.0, spatial.z),
              0.92
            );
          }
          ai.tailCooldown = isP2 ? 3.2 : 4.5;
        }
        if (ai.timer <= 0) {
          ai.phase = 'recover';
          ai.timer = 0.45;
          ai.maxTimer = 0.45;
        }
      } else if (ai.phase === 'tusk_windup') {
        state.behavior = 'windup';
        attackVariant = 4;
        stance = 'tusk_surge';
        jawOpen = 0.48;
        tuskCharge = 1.0;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 7.6, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.phase = 'tusk_fire';
          ai.shotDelay = 0.02;
        }
      } else if (ai.phase === 'tusk_fire') {
        state.behavior = 'attack';
        attackVariant = 4;
        stance = 'tusk_surge';
        jawOpen = 0.56;
        tuskCharge = 1.25;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 5.8, dt);
        ai.shotDelay -= dt;
        attackProgress = ai.tuskSpread.length > 0 ? ai.tuskIndex / ai.tuskSpread.length : 1;

        if (ai.shotDelay <= 0 && ai.tuskIndex < ai.tuskSpread.length) {
          const yawOff = ai.tuskSpread[ai.tuskIndex];
          const side: -1 | 1 = ai.tuskIndex % 2 === 0 ? -1 : 1;
          ai.tuskIndex += 1;
          ai.shotDelay = isP2 ? 0.11 : 0.14;

          rig.getTuskTipWorldPos(side, _muzzle);
          const aimYaw = computeFacingYaw(_muzzle.x, _muzzle.z, playerPos.x, playerPos.z) + yawOff;
          const horiz = Math.max(1.5, Math.hypot(playerPos.x - _muzzle.x, playerPos.z - _muzzle.z));
          const pitchY = (playerPos.y + 1.1 - _muzzle.y) / horiz;
          _aimDir.set(-Math.sin(aimYaw), pitchY, -Math.cos(aimYaw)).normalize();

          callbacks.spawnMuzzleFlash(_muzzle, _aimDir, side === -1 ? 0xf97316 : 0xef4444, true);
          callbacks.onFireAudio('boss_carbine');
          callbacks.spawnProjectile({
            origin: _muzzle.clone(),
            direction: _aimDir.clone(),
            speed: isP2 ? 46 : 40,
            damage: isP2 ? 17 : 14,
            radius: 0.18,
            color: side === -1 ? 0xfb923c : 0xef4444,
            kind: 'boss_overdrive',
            staggerStrength: 0.34,
          });
        }
        if (ai.tuskIndex >= ai.tuskSpread.length) {
          ai.tuskCooldown = isP2 ? 2.4 : 3.2;
          ai.phase = 'recover';
          ai.timer = 0.48;
          ai.maxTimer = 0.48;
        }
      } else if (ai.phase === 'mortar_windup') {
        state.behavior = 'windup';
        attackVariant = 5;
        stance = 'mortar_salvo';
        mortarPitch = 1.0;
        shutterOpen = 0.78;
        jawOpen = 0.25;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 5.5, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          rig.getShoulderPodWorldPos(1, _muzzle);
          ai.mortarQueue = solveHoundMortarCluster(
            spatial.x,
            _muzzle.y,
            spatial.z,
            playerPos.x,
            playerPos.y + 0.1,
            playerPos.z,
            state.phase,
            16.5
          );
          ai.mortarIndex = 0;
          ai.shotDelay = 0.02;
          ai.phase = 'mortar_fire';
        }
      } else if (ai.phase === 'mortar_fire') {
        state.behavior = 'attack';
        attackVariant = 5;
        stance = 'mortar_salvo';
        mortarPitch = 1.1;
        shutterOpen = 0.85;
        ai.shotDelay -= dt;
        attackProgress = ai.mortarQueue.length > 0 ? ai.mortarIndex / ai.mortarQueue.length : 1;

        if (ai.shotDelay <= 0 && ai.mortarIndex < ai.mortarQueue.length) {
          const arc = ai.mortarQueue[ai.mortarIndex];
          const side: -1 | 1 = ai.mortarIndex % 2 === 0 ? -1 : 1;
          ai.mortarIndex += 1;
          ai.shotDelay = isP2 ? 0.12 : 0.16;

          rig.getShoulderPodWorldPos(side, _muzzle);
          _aimDir.set(arc.vx, arc.vy, arc.vz).normalize();
          callbacks.spawnMuzzleFlash(_muzzle, _aimDir, 0xf59e0b, true);
          callbacks.onFireAudio('mortar');
          callbacks.spawnProjectile({
            origin: _muzzle.clone(),
            direction: _aimDir.clone(),
            speed: arc.speed,
            damage: isP2 ? 24 : 20,
            radius: 0.24,
            color: 0xf97316,
            kind: 'mortar_canister',
            gravity: 16.5,
            splashRadius: 2.9,
            staggerStrength: 0.55,
          });
        }
        if (ai.mortarIndex >= ai.mortarQueue.length) {
          ai.mortarCooldown = isP2 ? 4.8 : 6.4;
          ai.phase = 'recover';
          ai.timer = 0.56;
          ai.maxTimer = 0.56;
        }
      } else if (ai.phase === 'charge_windup') {
        state.behavior = 'windup';
        attackVariant = 6;
        stance = 'bull_charge';
        jawOpen = 0.34;
        tuskCharge = 1.1;
        gravFieldIntensity = 0.65;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 9.5, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.boosterBurstCooldown <= 0) {
          ai.boosterBurstCooldown = 0.14;
          _origin.set(spatial.x - fwdX * 0.5, spatial.y + 1.35, spatial.z - fwdZ * 0.5);
          callbacks.spawnBoosterBurst(_origin, _aimDir.set(-fwdX, 0.2, -fwdZ).normalize(), 0xf97316, 14);
        }
        if (ai.timer <= 0) {
          const rushSpd = isP2 ? 20.8 : 17.6;
          ai.chargeVx = -Math.sin(spatial.yaw) * rushSpd;
          ai.chargeVz = -Math.cos(spatial.yaw) * rushSpd;
          ai.phase = 'charge_rush';
          ai.timer = isP2 ? 0.68 : 0.62;
          ai.maxTimer = ai.timer;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('shield_charge');
        }
      } else if (ai.phase === 'charge_rush') {
        state.behavior = 'attack';
        attackVariant = 6;
        stance = 'bull_charge';
        jawOpen = 0.45;
        tuskCharge = 1.35;
        gravFieldIntensity = 0.85;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        desVx = ai.chargeVx;
        desVz = ai.chargeVz;

        if (ai.boosterBurstCooldown <= 0) {
          ai.boosterBurstCooldown = 0.11;
          _origin.set(spatial.x - fwdX * 0.65, spatial.y + 1.32, spatial.z - fwdZ * 0.65);
          callbacks.spawnBoosterBurst(_origin, _aimDir.set(-fwdX, 0.15, -fwdZ).normalize(), 0xfb923c, 16);
        }

        if (!ai.hitDone && !playerRolling && horizDist <= 2.65 && Math.abs(playerPos.y - spatial.y) <= 2.2) {
          ai.hitDone = true;
          callbacks.applyPlayerMeleeHit(
            isP2 ? 34 : 28,
            _origin.set(spatial.x, spatial.y + 1.1, spatial.z),
            0.96
          );
          callbacks.spawnBladeSlashArc(
            _origin.set(spatial.x + fwdX * 1.1, spatial.y + 1.15, spatial.z + fwdZ * 1.1),
            spatial.yaw,
            0.25,
            0.05,
            3.0,
            0xf97316,
            true,
            1
          );
          callbacks.onKatanaSlashAudio?.(true);
        }

        if (ai.timer <= 0) {
          _origin.set(spatial.x + fwdX * 1.1, spatial.y + 0.14, spatial.z + fwdZ * 1.1);
          callbacks.spawnShockwave({
            center: _origin.clone(),
            maxRadius: isP2 ? 7.2 : 5.8,
            expandSpeed: 15.0,
            damage: isP2 ? 22 : 18,
            color: 0xf97316,
            staggerStrength: 0.78,
          });
          callbacks.spawnRailImpactCrater(_origin, _up, 0xf97316);
          callbacks.onTelegraphAudio('shield_slam');
          ctx.exposeWeakpoint(2.0);
          ai.chargeCooldown = isP2 ? 4.8 : 6.2;
          ai.phase = 'recover';
          ai.timer = 0.72;
          ai.maxTimer = 0.72;
        }
      } else if (ai.phase === 'beam_windup') {
        state.behavior = 'windup';
        attackVariant = 7;
        stance = 'maw_beam';
        jawOpen = 0.64;
        shutterOpen = 0.92;
        tuskCharge = 1.05;
        gravFieldIntensity = 0.85;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        const halfArc = isP2 ? 0.5 : 0.4;
        const startYaw = computeHoundMawSweepYaw(ai.beamBaseYaw, 0, ai.beamSweepDir, halfArc);
        spatial.yaw = rotateYawTowards(spatial.yaw, ai.beamBaseYaw, 6.5, dt);
        rig.getMuzzleWorldPos(_muzzle);
        _rayDir.set(-Math.sin(startYaw), -0.02, -Math.cos(startYaw)).normalize();
        const maxWindLen = 26.0;
        const hitWallWind = raycastCollisionWorld3D(
          _muzzle.x,
          _muzzle.y,
          _muzzle.z,
          _muzzle.x + _rayDir.x * maxWindLen,
          _muzzle.y + _rayDir.y * maxWindLen,
          _muzzle.z + _rayDir.z * maxWindLen,
          world,
          _rayHit
        );
        const beamLen = hitWallWind ? _rayHit.t * maxWindLen : maxWindLen;
        rig.setMawBeamTelegraph(true, beamLen, attackProgress, false, startYaw - spatial.yaw);
        if (ai.timer <= 0) {
          ai.phase = 'beam_sweep';
          ai.timer = isP2 ? 1.55 : 1.3;
          ai.maxTimer = ai.timer;
          callbacks.onFireAudio('rail_slug');
        }
      } else if (ai.phase === 'beam_sweep') {
        state.behavior = 'attack';
        attackVariant = 7;
        stance = 'maw_beam';
        jawOpen = 0.7;
        shutterOpen = 0.96;
        tuskCharge = 1.3;
        gravFieldIntensity = 1.0;
        ai.timer -= dt;
        ai.beamTickCooldown = Math.max(0, ai.beamTickCooldown - dt);
        ai.beamScarCooldown = Math.max(0, ai.beamScarCooldown - dt);
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        const halfArc = isP2 ? 0.5 : 0.4;
        const sweepYaw = computeHoundMawSweepYaw(
          ai.beamBaseYaw,
          attackProgress,
          ai.beamSweepDir,
          halfArc
        );

        rig.getMuzzleWorldPos(_muzzle);
        _rayDir.set(-Math.sin(sweepYaw), -0.025, -Math.cos(sweepYaw)).normalize();
        const maxBeamLen = 28.0;
        const wallHit = raycastCollisionWorld3D(
          _muzzle.x,
          _muzzle.y,
          _muzzle.z,
          _muzzle.x + _rayDir.x * maxBeamLen,
          _muzzle.y + _rayDir.y * maxBeamLen,
          _muzzle.z + _rayDir.z * maxBeamLen,
          world,
          _rayHit
        );
        const beamLen = wallHit ? _rayHit.t * maxBeamLen : maxBeamLen;
        rig.setMawBeamTelegraph(true, beamLen, 1.25, true, sweepYaw - spatial.yaw);

        if (wallHit && ai.beamScarCooldown <= 0) {
          ai.beamScarCooldown = 0.16;
          callbacks.spawnRailImpactCrater(_rayHit.point, _rayHit.normal, 0xf97316);
        }

        // Continuous sweeping ray-to-player hit detection honoring dodge-roll i-frames
        if (!playerRolling && ai.beamTickCooldown <= 0) {
          const px = playerPos.x - _muzzle.x;
          const py = playerPos.y + 1.05 - _muzzle.y;
          const pz = playerPos.z - _muzzle.z;
          const proj = px * _rayDir.x + py * _rayDir.y + pz * _rayDir.z;
          if (proj > 0.6 && proj < beamLen + 0.5) {
            const perpSq =
              (px - _rayDir.x * proj) ** 2 +
              (py - _rayDir.y * proj) ** 2 +
              (pz - _rayDir.z * proj) ** 2;
            if (perpSq <= 0.92 * 0.92) {
              ai.beamTickCooldown = 0.24;
              callbacks.applyPlayerMeleeHit(isP2 ? 16 : 13, _muzzle, 0.42);
            }
          }
        }

        if (ai.timer <= 0) {
          rig.setMawBeamTelegraph(false, 0, 0, false, 0);
          ctx.exposeWeakpoint(2.2);
          ai.beamCooldown = isP2 ? 5.2 : 7.0;
          ai.phase = 'recover';
          ai.timer = 0.78;
          ai.maxTimer = 0.78;
        }
      } else if (ai.phase === 'recover') {
        state.behavior = 'recover';
        stance = 'stalk';
        shutterOpen = state.weakpoint.exposed ? 0.96 : 0.45;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 3.4, dt);
        ai.timer -= dt;
        if (ai.timer <= 0) ai.phase = 'stalk';
      }

      stepEnemyMovement(spatial, desVx, desVz, world, dt, F6_HOUND_MIN_Y);
      clampBunkerVaultBounds(spatial);

      rig.setHoundVisualState({
        stance,
        phase2Aura: isP2 ? 1.0 : 0,
        jawOpen,
        shutterOpen,
        gravFieldIntensity,
        tuskCharge,
        tailSpinAngle,
        mortarPitch,
      });

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
        shieldActive: false,
        phase: state.phase,
        airborneHeight,
      });
    },
  };
}
