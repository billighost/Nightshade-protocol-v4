import * as THREE from 'three';
import {
  resolveWorldHorizontal3D,
  type HorizResolveResult,
} from '../../../arena/hideout/hideoutCollision';
import { F5_BASE_Y } from '../../../arena/hideout/floors/floor05/layout';
import type { EnemyAiStepContext, EnemyArchetypeBrain } from '../../core/enemyManager';
import { computeFacingYaw, hasEnemyLineOfSight, rotateYawTowards } from '../../core/enemyNav';
import type { Floor05EnemyMaterials } from '../materials';
import { solveShockBolaArc } from '../arenaNetShooter/tactics';
import { ACID_WYVERN_CONSTRUCT_CONFIG } from './config';
import {
  buildAcidWyvernConstructRig,
  type AcidWyvernRigHandle,
  type WyvernPoseMode,
} from './mesh';
import { computeVenomBarrageAngles, selectWyvernAction } from './tactics';
import { createWyvernTextures, type WyvernTextureSuite } from './textures';

type WyvernPhase =
  | 'hover_patrol'
  | 'orbit'
  | 'barrage_windup'
  | 'barrage_fire'
  | 'spit_windup'
  | 'spit_fire'
  | 'dive_windup'
  | 'dive_swoop'
  | 'recover';

interface WyvernAiState {
  initialized: boolean;
  homeX: number;
  homeY: number;
  homeZ: number;
  phase: WyvernPhase;
  timer: number;
  maxTimer: number;
  orbitAngle: number;
  orbitDir: number;
  barrageCooldown: number;
  mortarCooldown: number;
  diveCooldown: number;
  diveVx: number;
  diveVz: number;
  hitDone: boolean;
}

const _muzzle = new THREE.Vector3();
const _tail = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _horizScratch: HorizResolveResult = { x: 0, z: 0, collided: false };

let sharedWyvernTex: WyvernTextureSuite | null = null;
function getSharedWyvernTextures(): WyvernTextureSuite {
  if (!sharedWyvernTex) sharedWyvernTex = createWyvernTextures();
  return sharedWyvernTex;
}

export function createAcidWyvernConstructBrain(mats: Floor05EnemyMaterials): EnemyArchetypeBrain {
  return {
    config: ACID_WYVERN_CONSTRUCT_CONFIG,
    createRig: (enemyId) =>
      buildAcidWyvernConstructRig(enemyId, mats, getSharedWyvernTextures()),
    createAiState: (): Record<string, unknown> => ({
      initialized: false,
      homeX: -33.0,
      homeY: F5_BASE_Y + 3.2,
      homeZ: -25.6,
      phase: 'hover_patrol',
      timer: 0,
      maxTimer: 1,
      orbitAngle: 0,
      orbitDir: 1,
      barrageCooldown: 1.2,
      mortarCooldown: 3.0,
      diveCooldown: 4.0,
      diveVx: 0,
      diveVz: 0,
      hitDone: false,
    }),
    stepAi(ctx: EnemyAiStepContext) {
      const ai = ctx.aiState as unknown as WyvernAiState;
      const rig = ctx.rig as AcidWyvernRigHandle;
      const { dt, elapsed, state, spatial, playerPos, world, callbacks } = ctx;
      const cfg = ACID_WYVERN_CONSTRUCT_CONFIG;
      const p2 = state.phase === 2;
      const cdRate = p2 ? 1.3 : 1.0;

      if (!ai.initialized) {
        ai.initialized = true;
        ai.homeX = spatial.x;
        ai.homeY = spatial.y;
        ai.homeZ = spatial.z;
      }

      ai.barrageCooldown = Math.max(0, ai.barrageCooldown - dt * cdRate);
      ai.mortarCooldown = Math.max(0, ai.mortarCooldown - dt * cdRate);
      ai.diveCooldown = Math.max(0, ai.diveCooldown - dt * cdRate);

      const floorY = F5_BASE_Y;
      rig.setHoverGroundDelta(Math.max(0.2, spatial.y - floorY));

      if (state.staggerTimer > 0) {
        ai.phase = 'orbit';
        rig.setPoseMode('hover');
        // Descend sharply when venom-core is shattered!
        const targetY = floorY + 0.9;
        spatial.y += (targetY - spatial.y) * Math.min(1, dt * 6);
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
      const dy = playerPos.y + 1.1 - (spatial.y + 1.3);
      const dz = playerPos.z - spatial.z;
      const horizDist = Math.hypot(dx, dz);

      const hasLos =
        horizDist <= cfg.detectRange &&
        hasEnemyLineOfSight(
          spatial.x,
          spatial.y + 1.4,
          spatial.z,
          playerPos.x,
          playerPos.y + 1.25,
          playerPos.z,
          world
        );

      if (hasLos || horizDist < 22.0 || state.hp < state.maxHp) {
        state.engaged = true;
      }

      const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);
      const dirX = horizDist > 0.01 ? dx / horizDist : -Math.sin(spatial.yaw);
      const dirZ = horizDist > 0.01 ? dz / horizDist : -Math.cos(spatial.yaw);

      let desVx = 0;
      let desVz = 0;
      let targetHoverY = Math.min(floorY + 5.2, Math.max(floorY + 2.6, playerPos.y + 2.7));
      let attackProgress = 0;
      let poseMode: WyvernPoseMode = 'hover';

      if (!state.engaged) {
        state.behavior = 'patrol';
        ai.orbitAngle += dt * 0.55;
        const gx = ai.homeX + Math.cos(ai.orbitAngle) * 3.8;
        const gz = ai.homeZ + Math.sin(ai.orbitAngle) * 2.6;
        desVx = (gx - spatial.x) * 1.4;
        desVz = (gz - spatial.z) * 1.4;
        targetHoverY = ai.homeY + Math.sin(elapsed * 2.0) * 0.35;
        spatial.yaw = rotateYawTowards(spatial.yaw, computeFacingYaw(spatial.x, spatial.z, gx, gz), 3.6, dt);
      } else if (ai.phase === 'hover_patrol' || ai.phase === 'orbit') {
        state.behavior = 'strafe';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.0, dt);

        const action = selectWyvernAction({
          horizDist,
          hasLos,
          phase: state.phase,
          barrageCooldown: ai.barrageCooldown,
          mortarCooldown: ai.mortarCooldown,
          diveCooldown: ai.diveCooldown,
          roll: Math.random(),
        });

        if (action === 'twin_tail_venom_barrage') {
          ai.phase = 'barrage_windup';
          ai.timer = p2 ? 0.44 : 0.54;
          ai.maxTimer = ai.timer;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('rail_charge');
          rig.getTailStingerWorldPos(0, _tail);
          callbacks.spawnPerilGlint(_tail, 0x84cc16);
        } else if (action === 'corrosive_mortar_spit') {
          ai.phase = 'spit_windup';
          ai.timer = 0.6;
          ai.maxTimer = 0.6;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('mortar');
          rig.getMuzzleWorldPos(_muzzle);
          callbacks.spawnPerilGlint(_muzzle, 0x22c55e);
        } else if (action === 'aerial_dive_sweep') {
          ai.phase = 'dive_windup';
          ai.timer = 0.54;
          ai.maxTimer = 0.54;
          ai.hitDone = false;
          callbacks.onTelegraphAudio('dash');
          rig.getWeakpointWorldPos(_origin);
          callbacks.spawnPerilGlint(_origin, 0xa3e635);
        } else {
          // Smooth circling orbit around player / Orbital Array arena
          const radial = horizDist > 15.0 ? 0.65 : horizDist < 8.5 ? -0.45 : 0.05;
          const spd = cfg.moveSpeed * (p2 ? 1.18 : 1.0);
          desVx = (dirX * radial - dirZ * ai.orbitDir * 0.85) * spd;
          desVz = (dirZ * radial + dirX * ai.orbitDir * 0.85) * spd;
        }
      } else if (ai.phase === 'barrage_windup') {
        state.behavior = 'windup';
        poseMode = 'barrage';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 7.6, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.phase = 'barrage_fire';
          ai.timer = 0.34;
          ai.maxTimer = 0.34;
        }
      } else if (ai.phase === 'barrage_fire') {
        state.behavior = 'attack';
        poseMode = 'barrage';
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (!ai.hitDone && attackProgress >= 0.2) {
          ai.hitDone = true;
          const pitch = Math.atan2(dy, Math.max(1, horizDist));
          const cosP = Math.cos(pitch);
          const sinP = Math.sin(pitch);
          const angles = computeVenomBarrageAngles(state.phase);
          for (let i = 0; i < angles.length; i++) {
            rig.getTailStingerWorldPos((i % 2) as 0 | 1, _tail);
            const yOff = spatial.yaw + angles[i];
            _dir.set(-Math.sin(yOff) * cosP, sinP, -Math.cos(yOff) * cosP).normalize();
            callbacks.spawnProjectile({
              origin: _tail.clone(),
              direction: _dir.clone(),
              speed: p2 ? 25.5 : 22.0,
              damage: 14,
              kind: 'plasma_bolt',
              color: i % 2 === 0 ? 0x84cc16 : 0x22c55e,
              radius: 0.19,
              staggerStrength: 0.36,
            });
          }
          callbacks.onFireAudio('shotgun');
        }
        if (ai.timer <= 0) {
          ai.barrageCooldown = p2 ? 3.2 : 4.2;
          ai.phase = 'recover';
          ai.timer = 0.45;
          ai.maxTimer = 0.45;
        }
      } else if (ai.phase === 'spit_windup') {
        state.behavior = 'windup';
        poseMode = 'spit';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 6.8, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.phase = 'spit_fire';
          ai.timer = 0.32;
          ai.maxTimer = 0.32;
        }
      } else if (ai.phase === 'spit_fire') {
        state.behavior = 'attack';
        poseMode = 'spit';
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (!ai.hitDone && attackProgress >= 0.2) {
          ai.hitDone = true;
          rig.getMuzzleWorldPos(_muzzle);
          const offsets = p2 ? [-2.2, 0, 2.2] : [-1.5, 1.5];
          for (const ox of offsets) {
            const tx = playerPos.x + (-dirZ * ox);
            const tz = playerPos.z + (dirX * ox);
            const v = solveShockBolaArc(_muzzle.x, _muzzle.y, _muzzle.z, tx, playerPos.y, tz, 15.0, 0.98);
            const spd = Math.hypot(v.vx, v.vy, v.vz);
            _dir.set(v.vx / spd, v.vy / spd, v.vz / spd);
            callbacks.spawnProjectile({
              origin: _muzzle.clone(),
              direction: _dir.clone(),
              speed: spd,
              damage: 22,
              kind: 'mortar_canister',
              color: 0x84cc16,
              radius: 0.26,
              gravity: 15.0,
              splashRadius: 3.4,
              targetPos: new THREE.Vector3(tx, playerPos.y, tz),
              staggerStrength: 0.65,
            });
          }
          callbacks.spawnMuzzleFlash(_muzzle, _dir, 0xa3e635, true);
          callbacks.onFireAudio('mortar');
        }
        if (ai.timer <= 0) {
          ai.mortarCooldown = p2 ? 4.8 : 6.0;
          ai.phase = 'recover';
          ai.timer = 0.52;
          ai.maxTimer = 0.52;
        }
      } else if (ai.phase === 'dive_windup') {
        state.behavior = 'windup';
        poseMode = 'dive';
        targetHoverY = floorY + 4.4;
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 8.6, dt);
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        if (ai.timer <= 0) {
          ai.diveVx = dirX * (p2 ? 17.5 : 15.0);
          ai.diveVz = dirZ * (p2 ? 17.5 : 15.0);
          ai.phase = 'dive_swoop';
          ai.timer = 0.72;
          ai.maxTimer = 0.72;
        }
      } else if (ai.phase === 'dive_swoop') {
        state.behavior = 'attack';
        poseMode = 'dive';
        targetHoverY = playerPos.y + 1.05;
        ai.timer -= dt;
        attackProgress = 1 - Math.max(0, ai.timer / ai.maxTimer);
        desVx = ai.diveVx;
        desVz = ai.diveVz;
        if (!ai.hitDone && horizDist <= 3.6) {
          ai.hitDone = true;
          _origin.set(spatial.x, playerPos.y + 0.14, spatial.z);
          callbacks.spawnBladeSlashArc(_origin, spatial.yaw, 0.2, 0.05, 3.6, 0x84cc16, true, 1);
          callbacks.spawnShockwave({
            center: _origin.clone(),
            maxRadius: 6.4,
            expandSpeed: 14.5,
            damage: 26,
            color: 0x22c55e,
            staggerStrength: 0.78,
          });
          callbacks.applyPlayerMeleeHit(28, _origin, 0.82);
        }
        if (ai.timer <= 0) {
          ai.diveCooldown = p2 ? 5.6 : 7.0;
          ai.orbitDir = -ai.orbitDir;
          ai.phase = 'recover';
          ai.timer = 0.62;
          ai.maxTimer = 0.62;
        }
      } else if (ai.phase === 'recover') {
        state.behavior = 'recover';
        spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 4.4, dt);
        ai.timer -= dt;
        if (ai.timer <= 0) ai.phase = 'orbit';
      }

      // Smooth 3D aerial flight constrained cleanly by world walls & Orbital Dish Pedestal!
      const blend = 1 - Math.exp(-7 * dt);
      spatial.vx += (desVx - spatial.vx) * blend;
      spatial.vz += (desVz - spatial.vz) * blend;
      const tryX = spatial.x + spatial.vx * dt;
      const tryZ = spatial.z + spatial.vz * dt;
      resolveWorldHorizontal3D(tryX, tryZ, floorY + 0.5, spatial.radius, world, _horizScratch, 2.2, 0.4);
      spatial.x = _horizScratch.x;
      spatial.z = _horizScratch.z;
      if (_horizScratch.collided) {
        ai.orbitDir = -ai.orbitDir;
      }
      spatial.y += (targetHoverY - spatial.y) * Math.min(1, dt * 4.5);
      spatial.grounded = false;

      rig.setPoseMode(poseMode);
      rig.setHoverGroundDelta(Math.max(0.2, spatial.y - floorY));

      rig.updateAnimation({
        dt,
        elapsed,
        behavior: state.behavior,
        speedRatio: Math.hypot(spatial.vx, spatial.vz) / cfg.moveSpeed,
        localMoveX: 0,
        localMoveZ: 1,
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
        phase: state.phase,
        airborneHeight: 0,
      });
    },
  };
}
