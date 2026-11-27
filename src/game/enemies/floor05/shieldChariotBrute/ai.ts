import * as THREE from 'three';
import { F5_PIT_Y } from '../../../arena/hideout/floors/floor05/layout';
import { resolveSupportHeight3D } from '../../../arena/hideout/hideoutCollision';
import type { EnemyAiStepContext, EnemyArchetypeBrain } from '../../core/enemyManager';
import { computeFacingYaw, hasEnemyLineOfSight, rotateYawTowards, stepEnemyMovement, wrapAngleDelta } from '../../core/enemyNav';
import type { EnemyAttackCallbacks } from '../../core/types';
import type { Floor05EnemyMaterials } from '../materials';
import { SHIELD_CHARIOT_BRUTE_CONFIG as cfg } from './config';
import { buildShieldChariotBruteRig, type ShieldChariotBruteRigHandle } from './mesh';
import { BRUTE_ATTACKS, bruteSpinYaw, computeFlakScatterOffsets, selectBruteAction, solveBruteMortarArc, type BruteAttack } from './tactics';
import { createBruteTextures, type BruteTextureSuite } from './textures';

interface Move {
  windup: number;
  active: number;
  recovery: number;
  cooldown: number;
  cue: Parameters<EnemyAttackCallbacks['onTelegraphAudio']>[0];
}

const moves: Record<BruteAttack, Move> = {
  ram_shield_bash:         { windup: 0.49, active: 0.38, recovery: 0.61, cooldown: 2.7, cue: 'melee' },
  seismic_prow_slam:       { windup: 0.86, active: 0.56, recovery: 1.05, cooldown: 6.3, cue: 'shield_slam' },
  chariot_bull_rush:       { windup: 0.88, active: 0.91, recovery: 1.28, cooldown: 7.5, cue: 'shield_charge' },
  flak_scatter_barrage:    { windup: 0.64, active: 0.43, recovery: 0.69, cooldown: 4.3, cue: 'pyro_flare' },
  incendiary_mortar_salvo: { windup: 0.91, active: 0.84, recovery: 0.92, cooldown: 9.0, cue: 'mortar' },
  juggernaut_spin_cleave:  { windup: 0.78, active: 0.79, recovery: 1.02, cooldown: 5.7, cue: 'iaijutsu_glint' },
  fortress_advance_barrage: { windup: 0.77, active: 1.52, recovery: 0.96, cooldown: 9.5, cue: 'rail_charge' },
};

interface BruteState {
  stage: 'advance' | 'strafe' | 'windup' | 'active' | 'recovery';
  attack: BruteAttack;
  readyAt: Record<BruteAttack, number>;
  time: number;
  duration: number;
  patrolIndex: number;
  strafeSide: number;
  nextStrafe: number;
  shieldPressure: number;
  events: number;
  hit: boolean;
  target: THREE.Vector3;
}

const ember = 0xff872f;
const hot = 0xffca71;
const up = new THREE.Vector3(0, 1, 0);
const origin = new THREE.Vector3();
const direction = new THREE.Vector3();
const target = new THREE.Vector3();
const normalFan = computeFlakScatterOffsets();
const hotFan = computeFlakScatterOffsets(true);

function setStage(ai: BruteState, stage: BruteState['stage'], duration: number) {
  ai.stage = stage;
  ai.duration = duration;
  ai.time = 0;
}

function recover(ctx: EnemyAiStepContext, ai: BruteState, crashed = false) {
  if (ai.attack === 'chariot_bull_rush' || ai.attack === 'seismic_prow_slam') {
    ctx.exposeWeakpoint(crashed ? 2.4 : 1.8);
  }
  setStage(ai, 'recovery', moves[ai.attack].recovery + (crashed ? 0.38 : 0));
}

function fireFlak(ctx: EnemyAiStepContext, ai: BruteState, fortress: boolean) {
  ctx.rig.getMuzzleWorldPos(origin);
  const yaw = computeFacingYaw(origin.x, origin.z, ai.target.x, ai.target.z);
  const pitch = Math.atan2(ai.target.y + 1.05 - origin.y, Math.hypot(ai.target.x - origin.x, ai.target.z - origin.z));
  const offsets = ctx.state.phase === 2 ? hotFan : normalFan;
  for (const offset of offsets) {
    // The fortress fires a narrower three-round burst from behind its moving shield.
    if (fortress && Math.abs(offset.yaw) > 0.071) continue;
    const a = yaw + offset.yaw;
    const p = pitch + offset.pitch;
    direction.set(-Math.sin(a) * Math.cos(p), Math.sin(p), -Math.cos(a) * Math.cos(p));
    ctx.callbacks.spawnProjectile({
      origin: origin.clone(), direction: direction.clone(), speed: fortress ? 22 : 26,
      damage: fortress ? 5 : 8, radius: 0.115, kind: 'shotgun_pellet', color: ember, staggerStrength: 0.26,
    });
  }
  direction.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
  ctx.callbacks.spawnMuzzleFlash(origin, direction, hot, true);
  ctx.callbacks.onFireAudio('shotgun');
}

function fireMortar(ctx: EnemyAiStepContext, ai: BruteState, rig: ShieldChariotBruteRigHandle) {
  const side = ai.events % 2 === 0 ? -1 : 1;
  rig.getMortarWorldPos(origin, side);
  const offset = [0, 2.8, -2.8][ai.events];
  const yaw = ctx.spatial.yaw;
  target.copy(ai.target);
  target.x += Math.cos(yaw) * offset;
  target.z -= Math.sin(yaw) * offset;
  target.y = resolveSupportHeight3D(target.x, target.z, ai.target.y, ctx.world) ?? ai.target.y;
  const arc = solveBruteMortarArc(origin.x, origin.y, origin.z, target.x, target.y, target.z, 17, 1.28);
  direction.set(arc.vx, arc.vy, arc.vz);
  const speed = direction.length();
  direction.normalize();
  ctx.callbacks.spawnProjectile({
    origin: origin.clone(), direction: direction.clone(), speed, gravity: 17, targetPos: target.clone(),
    kind: 'mortar_canister', splashRadius: 2.3, damage: 18, staggerStrength: 0.62, radius: 0.19, color: ember,
  });
  ctx.callbacks.spawnMuzzleFlash(origin, direction, hot, true);
  ctx.callbacks.onFireAudio('mortar');
}

export function createShieldChariotBruteBrain(mats: Floor05EnemyMaterials): EnemyArchetypeBrain {
  let textures: BruteTextureSuite | undefined;
  let rigCount = 0;
  return {
    config: cfg,
    createRig(enemyId) {
      const rig = buildShieldChariotBruteRig(enemyId, mats, textures ??= createBruteTextures());
      rigCount++;
      const dispose = rig.dispose;
      rig.dispose = () => {
        dispose();
        if (--rigCount === 0) {
          textures?.dispose();
          textures = undefined;
        }
      };
      return rig;
    },
    createAiState: () => ({
      stage: 'advance', attack: 'ram_shield_bash', time: 0, duration: 1,
      readyAt: { ram_shield_bash: 0, seismic_prow_slam: 2.6, chariot_bull_rush: 2.2,
        flak_scatter_barrage: 1.5, incendiary_mortar_salvo: 3.5, juggernaut_spin_cleave: 2, fortress_advance_barrage: 0 },
      patrolIndex: 0, strafeSide: Math.random() < 0.5 ? -1 : 1, nextStrafe: 0,
      shieldPressure: 0, events: 0, hit: false, target: new THREE.Vector3(),
    } satisfies BruteState),
    onShieldBlock(record, rawDamage) {
      const ai = record as unknown as BruteState;
      ai.shieldPressure = Math.min(100, ai.shieldPressure + rawDamage);
    },
    stepAi(ctx) {
      const { state, spatial, playerPos, callbacks, world, elapsed, dt } = ctx;
      const ai = ctx.aiState as unknown as BruteState;
      const rig = ctx.rig as ShieldChariotBruteRigHandle;
      const dx = playerPos.x - spatial.x, dz = playerPos.z - spatial.z;
      const dist = Math.hypot(dx, dz);
      const height = Math.abs(playerPos.y - spatial.y);
      const targetYaw = computeFacingYaw(spatial.x, spatial.z, playerPos.x, playerPos.z);
      const los = dist <= cfg.detectRange && hasEnemyLineOfSight(spatial.x, spatial.y + 1.72, spatial.z,
        playerPos.x, playerPos.y + 1.1, playerPos.z, world);
      const overdrive = state.phase === 2;
      const directionX = dx / Math.max(0.01, dist), directionZ = dz / Math.max(0.01, dist);
      ai.shieldPressure = Math.max(0, ai.shieldPressure - 10 * dt);
      state.engaged ||= los || dist < 12 || state.hp < state.maxHp;
      let vx = 0, vz = 0, progress = 0, booster = 0;
      let pose: Parameters<typeof rig.setPoseMode>[0] = 'march';

      if (state.staggerTimer > 0) {
        ai.stage = 'advance';
        ai.shieldPressure = 0;
        state.behavior = 'staggered';
      } else if (!state.engaged) {
        state.behavior = 'patrol';
        const wp = ctx.patrolPoints[ai.patrolIndex % Math.max(1, ctx.patrolPoints.length)];
        if (wp) {
          const x = wp.x - spatial.x, z = wp.z - spatial.z, d = Math.hypot(x, z);
          if (d < 0.8) ai.patrolIndex++;
          else {
            vx = x / d * cfg.moveSpeed * 0.48;
            vz = z / d * cfg.moveSpeed * 0.48;
            spatial.yaw = rotateYawTowards(spatial.yaw, computeFacingYaw(spatial.x, spatial.z, wp.x, wp.z), 2.8, dt);
          }
        }
      } else {
        if (ai.stage === 'advance') {
          const cd = ai.readyAt;
          const action = selectBruteAction({
            horizDist: dist, vertDist: height, hasLos: los, hasAttackToken: ctx.hasAttackToken,
            shieldActive: state.shieldActive, enraged: overdrive, damageBurstAccum: ai.shieldPressure,
            bashCooldown: cd.ram_shield_bash - elapsed, slamCooldown: cd.seismic_prow_slam - elapsed,
            rushCooldown: cd.chariot_bull_rush - elapsed, flakCooldown: cd.flak_scatter_barrage - elapsed,
            spinCooldown: cd.juggernaut_spin_cleave - elapsed, mortarCooldown: cd.incendiary_mortar_salvo - elapsed,
            fortressCooldown: cd.fortress_advance_barrage - elapsed, strafeCooldown: ai.nextStrafe - elapsed,
            roll: Math.random(),
          });
          if (action === 'advance') {
            state.behavior = 'chase';
            spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 3.5, dt);
            const speed = dist < 1.6 ? 0 : dist > 10 ? cfg.sprintSpeed : cfg.moveSpeed;
            vx = directionX * speed + ctx.separation.x * 2;
            vz = directionZ * speed + ctx.separation.y * 2;
          } else if (action === 'strafe_pressure') {
            setStage(ai, 'strafe', 0.79);
            ai.strafeSide *= -1;
            ai.nextStrafe = elapsed + 2.6;
          } else {
            ai.attack = action;
            ai.events = 0;
            ai.hit = false;
            ai.target.copy(playerPos);
            const move = moves[action];
            ai.readyAt[action] = elapsed + move.cooldown * (overdrive ? 0.86 : 1);
            setStage(ai, 'windup', move.windup * (overdrive ? 0.91 : 1));
            if (action === 'fortress_advance_barrage') ai.shieldPressure = 0;
            callbacks.onTelegraphAudio(move.cue);
            if (action === 'incendiary_mortar_salvo') rig.getMortarWorldPos(origin, -1);
            else if (action === 'flak_scatter_barrage') rig.getMuzzleWorldPos(origin);
            else if (action === 'chariot_bull_rush') rig.getWeakpointWorldPos(origin);
            else rig.getProwWorldPos(origin);
            callbacks.spawnPerilGlint(origin, action === 'juggernaut_spin_cleave' ? 0xff4658 : hot);
          }
        }

        ai.time += dt;
        progress = Math.min(1, ai.time / ai.duration);
        const attack = ai.attack;
        if (ai.stage === 'strafe') {
          state.behavior = 'strafe';
          spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 3.7, dt);
          vx = (-directionZ * ai.strafeSide + directionX * 0.16) * cfg.moveSpeed * 0.75;
          vz = (directionX * ai.strafeSide + directionZ * 0.16) * cfg.moveSpeed * 0.75;
          if (progress >= 1) ai.stage = 'advance';
        } else if (ai.stage === 'windup') {
          state.behavior = 'windup';
          pose = attack;
          if (progress < 0.67) {
            spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 4.6, dt);
            ai.target.copy(playerPos);
          }
          booster = attack === 'chariot_bull_rush' ? progress * 0.9 : 0;
          if (progress >= 1) {
            setStage(ai, 'active', moves[attack].active);
            if (attack === 'chariot_bull_rush') {
              rig.getWeakpointWorldPos(origin);
              callbacks.spawnBoosterBurst(origin, direction.set(Math.sin(spatial.yaw), 0.1, Math.cos(spatial.yaw)), ember, 12);
            }
          }
        } else if (ai.stage === 'active') {
          pose = attack;
          state.behavior = 'attack';
          const facing = Math.cos(wrapAngleDelta(targetYaw, spatial.yaw));
          switch (attack) {
            case 'chariot_bull_rush': {
              const speed = overdrive ? 18.2 : 16.5;
              vx = -Math.sin(spatial.yaw) * speed;
              vz = -Math.cos(spatial.yaw) * speed;
              booster = 1.35;
              if (!ai.hit && los && facing > 0.5 && dist < 2.18 && height < 1.65) {
                rig.getProwWorldPos(origin);
                callbacks.applyPlayerMeleeHit(32, origin, 0.96);
                callbacks.spawnImpactVfx(origin, false, true);
                ai.hit = true;
              }
              break;
            }
            case 'ram_shield_bash':
              if (progress < 0.65) {
                vx = -Math.sin(spatial.yaw) * 4.8;
                vz = -Math.cos(spatial.yaw) * 4.8;
              }
              if (!ai.hit && progress >= 0.38) {
                rig.getProwWorldPos(origin);
                if (los && facing > 0.45 && dist < 3.15 && height < 1.6) callbacks.applyPlayerMeleeHit(23, origin, 0.78);
                callbacks.onTelegraphAudio('shield_slam');
                ai.hit = true;
              }
              break;
            case 'seismic_prow_slam':
              if (!ai.hit && progress >= 0.42) {
                origin.set(spatial.x - Math.sin(spatial.yaw) * 0.94, spatial.y + 0.09, spatial.z - Math.cos(spatial.yaw) * 0.94);
                callbacks.spawnShockwave({ center: origin.clone(), maxRadius: 6.8, expandSpeed: 11.8, damage: 25, color: ember, staggerStrength: 0.84 });
                callbacks.spawnRailImpactCrater(origin, up, ember);
                callbacks.onTelegraphAudio('boss_slam');
                ai.hit = true;
              }
              break;
            case 'juggernaut_spin_cleave': {
              const swingYaw = spatial.yaw + bruteSpinYaw(progress);
              if (!ai.events && progress >= 0.12) {
                origin.set(spatial.x, spatial.y + 1.17, spatial.z);
                callbacks.spawnBladeSlashArc(origin, swingYaw, 0.06, -0.13, 2.75, ember, true, 1);
                callbacks.onTelegraphAudio('melee');
                ai.events++;
              }
              if (!ai.hit && los && height < 1.45 && dist <= 2.95 && progress >= 0.1 && progress <= 0.93
                  && Math.abs(wrapAngleDelta(targetYaw, swingYaw)) < 0.88) {
                origin.set(spatial.x, spatial.y + 1.16, spatial.z);
                callbacks.applyPlayerMeleeHit(26, origin, 0.82);
                ai.hit = true;
              }
              break;
            }
            case 'flak_scatter_barrage':
              if (!ai.events && progress >= 0.25) {
                fireFlak(ctx, ai, false);
                ai.events++;
              }
              break;
            case 'incendiary_mortar_salvo':
              while (ai.events < (overdrive ? 3 : 2) && ai.time >= 0.09 + ai.events * 0.28) {
                fireMortar(ctx, ai, rig);
                ai.events++;
              }
              break;
            case 'fortress_advance_barrage':
              vx = -Math.sin(spatial.yaw) * 1.65;
              vz = -Math.cos(spatial.yaw) * 1.65;
              spatial.yaw = rotateYawTowards(spatial.yaw, targetYaw, 0.85, dt);
              if (ai.events < 3 && ai.time >= 0.22 + ai.events * 0.48) {
                if (los && facing > 0.68) {
                  ai.target.copy(playerPos);
                  fireFlak(ctx, ai, true);
                }
                ai.events++;
              }
              break;
          }
          if (progress >= 1) recover(ctx, ai);
        } else if (ai.stage === 'recovery') {
          state.behavior = 'recover';
          pose = attack;
          if (progress >= 1) ai.stage = 'advance';
        }
      }
      const collided = stepEnemyMovement(spatial, vx, vz, world, dt, F5_PIT_Y - 0.6);
      if (ai.stage === 'active' && ai.attack === 'chariot_bull_rush' && collided) {
        spatial.vx = spatial.vz = 0;
        recover(ctx, ai, true);
        rig.getProwWorldPos(origin);
        callbacks.spawnImpactVfx(origin, false, true);
        callbacks.onTelegraphAudio('shield_slam');
      }
      const sin = Math.sin(spatial.yaw), cos = Math.cos(spatial.yaw);
      rig.setPoseMode(pose);
      rig.setBoosterFlame(booster);
      rig.updateAnimation({
        dt, elapsed, behavior: state.behavior, speedRatio: Math.hypot(spatial.vx, spatial.vz) / cfg.moveSpeed,
        localMoveX: (cos * spatial.vx - sin * spatial.vz) / cfg.moveSpeed,
        localMoveZ: (-sin * spatial.vx - cos * spatial.vz) / cfg.moveSpeed,
        aimPitch: Math.atan2(ai.target.y + 1.05 - spatial.y - 1.48, Math.max(1, dist)),
        attackProgress: progress, attackVariant: BRUTE_ATTACKS.indexOf(ai.attack),
        flinchTimer: state.flinchTimer, flinchDirX: state.flinchDirX, staggerTimer: state.staggerTimer,
        deadProgress: 0, weakpointExposed: state.weakpoint.exposed, weakpointBroken: state.weakpoint.broken,
        shieldActive: state.shieldActive, phase: state.phase, airborneHeight: 0,
      });
    },
  };
}
