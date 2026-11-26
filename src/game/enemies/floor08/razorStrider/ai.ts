import * as THREE from 'three';
import type { EnemyAiStepContext } from '../../core/enemyManager';
import {
  raycastCollisionWorld3D,
  rotateYawTowards,
  stepEnemyMovement,
  type WorldRaycastHit,
} from '../../core/enemyNav';
import { RAZOR_STRIDER_CONFIG } from './config';

type StriderMoveKind = 'none' | 'combo' | 'iaijutsu' | 'leap_slam' | 'flash_step';

interface StriderAiState {
  phase: 'patrol' | 'stalk' | 'windup' | 'attack' | 'recover';
  moveKind: StriderMoveKind;
  phaseTimer: number;
  attackCooldown: number;
  flashStepCooldown: number;
  comboStep: number; // 0, 1, 2
  dashDirX: number;
  dashDirZ: number;
  dashStartX: number;
  dashStartZ: number;
  dashTargetX: number;
  dashTargetZ: number;
  hitAppliedThisSwing: boolean;
  scarCheckedThisSwing: boolean;
  glintFired: boolean;
  patrolIndex: number;
  strafeSign: number;
  boosterIntensity: number;
  airborneHeight: number;
  nextHeavyAlternator: number;
}

const tmpOrigin = new THREE.Vector3();
const tmpStart = new THREE.Vector3();
const tmpEnd = new THREE.Vector3();
const tmpTangent = new THREE.Vector3();
const tmpBackDir = new THREE.Vector3();
const tmpRayHit: WorldRaycastHit = {
  hit: false,
  t: 1,
  point: new THREE.Vector3(),
  normal: new THREE.Vector3(0, 1, 0),
};

export function createStriderAiState(): Record<string, unknown> {
  const s: StriderAiState = {
    phase: 'patrol',
    moveKind: 'none',
    phaseTimer: 0,
    attackCooldown: 0.7,
    flashStepCooldown: 2.2,
    comboStep: 0,
    dashDirX: 0,
    dashDirZ: -1,
    dashStartX: 0,
    dashStartZ: 0,
    dashTargetX: 0,
    dashTargetZ: 0,
    hitAppliedThisSwing: false,
    scarCheckedThisSwing: false,
    glintFired: false,
    patrolIndex: 0,
    strafeSign: Math.random() < 0.5 ? -1 : 1,
    boosterIntensity: 0,
    airborneHeight: 0,
    nextHeavyAlternator: 0,
  };
  return s as unknown as Record<string, unknown>;
}

/**
 * Checks solid-world obstacle blocking along a katana slash arc AND carves glowing molten
 * wall/pillar/floor scars + spark explosions whenever a blade strike misses the player and hits
 * solid Floor 08 architecture!
 */
function checkKatanaSlashWorldAndPlayer(
  ctx: EnemyAiStepContext,
  reach: number,
  arcHalfCos: number,
  damage: number,
  stagger: number,
  heavy: boolean,
  slashRollRad: number
): void {
  const { spatial, playerPos, playerRolling, world, callbacks } = ctx;
  const fwdX = -Math.sin(spatial.yaw);
  const fwdZ = -Math.cos(spatial.yaw);
  const rightX = Math.cos(spatial.yaw);
  const rightZ = -Math.sin(spatial.yaw);

  // 1. Spawn dramatic sweeping 3D crimson crescent slash ribbon at torso height!
  tmpOrigin.set(spatial.x + fwdX * 0.45, spatial.y + 1.18, spatial.z + fwdZ * 0.45);
  callbacks.spawnBladeSlashArc(
    tmpOrigin,
    spatial.yaw,
    slashRollRad,
    0.06,
    reach * 0.82,
    heavy ? 0xff2846 : 0xff4560,
    heavy,
    slashRollRad >= 0 ? 1 : -1
  );
  callbacks.onKatanaSlashAudio?.(heavy);

  // 2. Check player hit with STRICT solid-world obstacle blocking (attacks NEVER go through platforms/walls!)
  let hitPlayer = false;
  const dx = playerPos.x - spatial.x;
  const dz = playerPos.z - spatial.z;
  const dist = Math.hypot(dx, dz);
  const dy = Math.abs(playerPos.y - spatial.y);

  if (dist <= reach && dy < 1.55) {
    const dot = dist > 0.01 ? (dx * fwdX + dz * fwdZ) / dist : 1;
    if (dot >= arcHalfCos) {
      tmpStart.set(spatial.x, spatial.y + 1.1, spatial.z);
      tmpEnd.set(playerPos.x, playerPos.y + 1.05, playerPos.z);
      const wallBetween = raycastCollisionWorld3D(
        tmpStart.x,
        tmpStart.y,
        tmpStart.z,
        tmpEnd.x,
        tmpEnd.y,
        tmpEnd.z,
        world,
        tmpRayHit
      );
      if (!wallBetween && !playerRolling) {
        hitPlayer = true;
        callbacks.applyPlayerMeleeHit(damage, tmpStart, stagger);
      } else if (wallBetween) {
        // Player took cover behind a solid wall/crate — katana CARVES into that cover with huge sparks!
        tmpTangent
          .set(rightX * Math.cos(slashRollRad), Math.sin(slashRollRad), rightZ * Math.cos(slashRollRad))
          .normalize();
        callbacks.spawnSurfaceSlashScar(
          tmpRayHit.point,
          tmpRayHit.normal,
          tmpTangent,
          heavy
        );
        return;
      }
    }
  }

  // 3. Even when swinging in open combat or missing the player, probe 3 rays along the blade arc
  //    to carve blazing molten thermal scars into any wall, pillar, cover crate, or floor deck!
  if (!hitPlayer) {
    const probeAngles = [-0.55, 0, 0.55];
    tmpStart.set(spatial.x, spatial.y + 1.12, spatial.z);
    for (let i = 0; i < probeAngles.length; i++) {
      const a = spatial.yaw + probeAngles[i];
      const px = -Math.sin(a);
      const pz = -Math.cos(a);
      const probeY = heavy ? spatial.y + 0.52 : spatial.y + 1.02 + Math.sin(slashRollRad) * (i - 1) * 0.4;
      tmpEnd.set(spatial.x + px * (reach + 0.35), probeY, spatial.z + pz * (reach + 0.35));
      const hit = raycastCollisionWorld3D(
        tmpStart.x,
        tmpStart.y,
        tmpStart.z,
        tmpEnd.x,
        tmpEnd.y,
        tmpEnd.z,
        world,
        tmpRayHit
      );
      if (hit) {
        tmpTangent
          .set(rightX * Math.cos(slashRollRad), Math.sin(slashRollRad), rightZ * Math.cos(slashRollRad))
          .normalize();
        callbacks.spawnSurfaceSlashScar(
          tmpRayHit.point,
          tmpRayHit.normal,
          tmpTangent,
          heavy
        );
        break;
      }
    }
  }
}

/**
 * KAGE-08 "ONI-BLADE" AAA Predator Cyber-Katana Assassin AI:
 * - Fear-inducing relentless mobility: sprints with booster plumes + sudden Lateral Booster Flash-Step
 * - 3-Hit Flowing Katana Combo at close range (`< 3.3m`)
 * - Iaijutsu Quick-Draw Dash (`4.2m - 11.5m`) with Sekiro Peril Eye-Glint Starburst + floor dash corridor -> exposes dorsal spine core!
 * - Aerial Booster-Vault Helm-Breaker Slam (`3.6m - 8.5m`) -> carves blazing molten floor fissure + exposes dorsal spine core!
 * - Every slash & dash respects solid walls/cover via swept raycastCollisionWorld3D and carves glowing wall/floor scars!
 */
export function stepStriderAi(ctx: EnemyAiStepContext): void {
  const ai = ctx.aiState as unknown as StriderAiState;
  const { dt, elapsed, state, spatial, playerPos, world, separation, callbacks, rig } = ctx;

  // Access optional Kage-08 helpers attached via rig (for dash telegraph & eye glint)
  const striderRigAccess = (rig as unknown as {
    setDashTelegraph?: (visible: boolean, length?: number, pulse?: number) => void;
    getEyeGlintWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
  });

  if (ai.attackCooldown > 0) ai.attackCooldown = Math.max(0, ai.attackCooldown - dt);
  if (ai.flashStepCooldown > 0) ai.flashStepCooldown = Math.max(0, ai.flashStepCooldown - dt);

  // Staggered / Weakpoint Overload Kneel
  if (state.staggerTimer > 0) {
    state.behavior = 'staggered';
    ai.phase = 'stalk';
    ai.moveKind = 'none';
    ai.airborneHeight = Math.max(0, ai.airborneHeight - dt * 10);
    ai.boosterIntensity = 0;
    striderRigAccess.setDashTelegraph?.(false);
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
      airborneHeight: ai.airborneHeight,
      boosterIntensity: 0,
    });
    return;
  }

  const dx = playerPos.x - spatial.x;
  const dz = playerPos.z - spatial.z;
  const distToPlayer = Math.hypot(dx, dz);
  const yawToPlayer = Math.atan2(-dx, -dz);

  let moveX = 0;
  let moveZ = 0;
  let speedRatio = 0;
  let localMoveX = 0;
  let attackProgress = 0;
  let attackVariant = 0;
  ai.boosterIntensity = 0;
  striderRigAccess.setDashTelegraph?.(false);

  // ---------------------------------------------------------------------------
  // 1. PATROL
  // ---------------------------------------------------------------------------
  if (ai.phase === 'patrol') {
    state.behavior = 'patrol';
    if (distToPlayer <= RAZOR_STRIDER_CONFIG.detectRange) {
      ai.phase = 'stalk';
    } else if (ctx.patrolPoints.length > 1) {
      const pt = ctx.patrolPoints[ai.patrolIndex % ctx.patrolPoints.length];
      const pdx = pt.x - spatial.x;
      const pdz = pt.z - spatial.z;
      const pdist = Math.hypot(pdx, pdz);
      if (pdist < 0.7) {
        ai.patrolIndex = (ai.patrolIndex + 1) % ctx.patrolPoints.length;
      } else {
        const pyaw = Math.atan2(-pdx, -pdz);
        spatial.yaw = rotateYawTowards(spatial.yaw, pyaw, 5.2, dt);
        moveX = (pdx / pdist) * RAZOR_STRIDER_CONFIG.moveSpeed * 0.52;
        moveZ = (pdz / pdist) * RAZOR_STRIDER_CONFIG.moveSpeed * 0.52;
        speedRatio = 0.45;
      }
    }
  }
  // ---------------------------------------------------------------------------
  // 2. PREDATOR STALK, SPRINT & REACTIVE ATTACK SELECTION
  // ---------------------------------------------------------------------------
  else if (ai.phase === 'stalk') {
    state.behavior = 'chase';
    spatial.yaw = rotateYawTowards(spatial.yaw, yawToPlayer, 10.5, dt);

    const invD = distToPlayer > 0.01 ? 1 / distToPlayer : 0;
    const toPx = dx * invD;
    const toPz = dz * invD;
    const rightX = -toPz;
    const rightZ = toPx;

    // Sprint menacingly with diagonal weave + slight booster jet plume!
    const sprintNow = distToPlayer > 4.2;
    const spd = sprintNow ? RAZOR_STRIDER_CONFIG.sprintSpeed : RAZOR_STRIDER_CONFIG.moveSpeed;
    const weave = distToPlayer > 3.2 ? Math.sin(elapsed * 2.8) * 0.38 : 0.42 * ai.strafeSign;
    moveX = (toPx + rightX * weave) * spd + separation.x * 2.2;
    moveZ = (toPz + rightZ * weave) * spd + separation.y * 2.2;
    speedRatio = sprintNow ? 1.0 : 0.72;
    ai.boosterIntensity = sprintNow ? 0.58 : 0.16;

    // Trigger reactive Lateral Booster Flash-Step when closing through mid-range!
    if (
      ai.flashStepCooldown <= 0 &&
      distToPlayer >= 4.6 &&
      distToPlayer <= 12.0 &&
      ai.attackCooldown > 0.25
    ) {
      ai.phase = 'attack';
      ai.moveKind = 'flash_step';
      ai.phaseTimer = 0;
      ai.flashStepCooldown = 4.2;
      ai.strafeSign *= -1;
      ai.dashDirX = rightX * ai.strafeSign + toPx * 0.35;
      ai.dashDirZ = rightZ * ai.strafeSign + toPz * 0.35;
      const len = Math.hypot(ai.dashDirX, ai.dashDirZ) || 1;
      ai.dashDirX /= len;
      ai.dashDirZ /= len;
      callbacks.onTelegraphAudio('booster_burst');
      tmpOrigin.set(spatial.x, spatial.y + 1.15, spatial.z);
      tmpBackDir.set(-ai.dashDirX, 0.2, -ai.dashDirZ);
      callbacks.spawnBoosterBurst?.(tmpOrigin, tmpBackDir, 0x38bdf8, 12);
    }
    // Attack Token Decision: 3-Hit Combo close, or Iaijutsu / Aerial Helm-Breaker at mid-range!
    else if (ctx.hasAttackToken && ai.attackCooldown <= 0) {
      if (distToPlayer <= 3.35) {
        // Close-range 3-Hit Flowing Katana Combo
        ai.phase = 'windup';
        ai.moveKind = 'combo';
        ai.comboStep = 0;
        ai.phaseTimer = 0;
        ai.hitAppliedThisSwing = false;
        callbacks.onTelegraphAudio('melee');
      } else if (distToPlayer <= 11.4) {
        // Alternate signature high-drama predator moves: Iaijutsu Draw Dash <-> Aerial Helm-Breaker!
        const pickIaijutsu = ai.nextHeavyAlternator % 2 === 0 || distToPlayer > 8.2;
        ai.nextHeavyAlternator += 1;

        ai.phase = 'windup';
        ai.moveKind = pickIaijutsu ? 'iaijutsu' : 'leap_slam';
        ai.phaseTimer = 0;
        ai.hitAppliedThisSwing = false;
        ai.glintFired = false;
        ai.dashDirX = toPx;
        ai.dashDirZ = toPz;
        ai.dashStartX = spatial.x;
        ai.dashStartZ = spatial.z;
        ai.dashTargetX = playerPos.x;
        ai.dashTargetZ = playerPos.z;
        callbacks.onTelegraphAudio(pickIaijutsu ? 'iaijutsu_glint' : 'booster_burst');
      }
    }
  }
  // ---------------------------------------------------------------------------
  // 3. ATTACK WINDUP (Readable AAA Telegraphs!)
  // ---------------------------------------------------------------------------
  else if (ai.phase === 'windup') {
    state.behavior = 'windup';
    ai.phaseTimer += dt;

    if (ai.moveKind === 'combo') {
      attackVariant = ai.comboStep;
      const dur = ai.comboStep === 2 ? 0.34 : 0.24;
      attackProgress = Math.min(1, ai.phaseTimer / dur);
      spatial.yaw = rotateYawTowards(spatial.yaw, yawToPlayer, 13, dt);
      if (ai.phaseTimer >= dur) {
        ai.phase = 'attack';
        ai.phaseTimer = 0;
        ai.hitAppliedThisSwing = false;
      }
    } else if (ai.moveKind === 'iaijutsu') {
      attackVariant = 3;
      const dur = 0.68;
      attackProgress = Math.min(1, ai.phaseTimer / dur);
      // Track player during first 70% of crouch, then lock corridor cleanly so dodge-roll rewards timing!
      if (attackProgress < 0.72) {
        spatial.yaw = rotateYawTowards(spatial.yaw, yawToPlayer, 11, dt);
        ai.dashDirX = -Math.sin(spatial.yaw);
        ai.dashDirZ = -Math.cos(spatial.yaw);
      }

      // Compute exact corridor length clamped by solid walls via raycastCollisionWorld3D!
      const maxDashLen = Math.min(9.6, distToPlayer + 1.8);
      tmpStart.set(spatial.x, spatial.y + 1.0, spatial.z);
      tmpEnd.set(
        spatial.x + ai.dashDirX * maxDashLen,
        spatial.y + 1.0,
        spatial.z + ai.dashDirZ * maxDashLen
      );
      const wallStop = raycastCollisionWorld3D(
        tmpStart.x,
        tmpStart.y,
        tmpStart.z,
        tmpEnd.x,
        tmpEnd.y,
        tmpEnd.z,
        world,
        tmpRayHit
      );
      const visibleLen = wallStop ? Math.max(1.4, tmpRayHit.t * maxDashLen - 0.35) : maxDashLen;
      striderRigAccess.setDashTelegraph?.(true, visibleLen, Math.abs(Math.sin(elapsed * 22)));
      ai.boosterIntensity = 0.35 + attackProgress * 0.65;

      // Trigger Sekiro-style crimson Peril Eye-Glint Starburst right before release!
      if (!ai.glintFired && attackProgress >= 0.42) {
        ai.glintFired = true;
        if (striderRigAccess.getEyeGlintWorldPos) {
          striderRigAccess.getEyeGlintWorldPos(tmpOrigin);
        } else {
          tmpOrigin.set(spatial.x, spatial.y + 1.62, spatial.z);
        }
        callbacks.spawnPerilGlint(tmpOrigin, 0xff2244);
      }

      if (ai.phaseTimer >= dur) {
        ai.phase = 'attack';
        ai.phaseTimer = 0;
        ai.hitAppliedThisSwing = false;
        ai.scarCheckedThisSwing = false;
        callbacks.onTelegraphAudio('booster_burst');
        tmpOrigin.set(spatial.x, spatial.y + 1.2, spatial.z);
        tmpBackDir.set(-ai.dashDirX, 0.15, -ai.dashDirZ);
        callbacks.spawnBoosterBurst(tmpOrigin, tmpBackDir, 0xff4228, 16);
      }
    } else if (ai.moveKind === 'leap_slam') {
      attackVariant = 4;
      const dur = 0.36;
      attackProgress = Math.min(1, ai.phaseTimer / dur);
      spatial.yaw = rotateYawTowards(spatial.yaw, yawToPlayer, 12, dt);
      ai.dashStartX = spatial.x;
      ai.dashStartZ = spatial.z;
      ai.dashTargetX = playerPos.x;
      ai.dashTargetZ = playerPos.z;
      ai.boosterIntensity = 0.55 + attackProgress * 0.55;
      if (ai.phaseTimer >= dur) {
        ai.phase = 'attack';
        ai.phaseTimer = 0;
        ai.hitAppliedThisSwing = false;
        tmpOrigin.set(spatial.x, spatial.y + 1.15, spatial.z);
        tmpBackDir.set(0, -1, 0);
        callbacks.spawnBoosterBurst(tmpOrigin, tmpBackDir, 0xff5a1f, 16);
      }
    }
  }
  // ---------------------------------------------------------------------------
  // 4. ACTIVE ATTACK EXECUTION (Sweeping Slashes, Wall-Carves & Boosters!)
  // ---------------------------------------------------------------------------
  else if (ai.phase === 'attack') {
    state.behavior = 'attack';
    ai.phaseTimer += dt;

    if (ai.moveKind === 'flash_step') {
      attackVariant = 5;
      const dur = 0.28;
      attackProgress = Math.min(1, ai.phaseTimer / dur);
      spatial.yaw = rotateYawTowards(spatial.yaw, yawToPlayer, 14, dt);
      moveX = ai.dashDirX * 15.5;
      moveZ = ai.dashDirZ * 15.5;
      localMoveX = ai.strafeSign;
      speedRatio = 1.0;
      ai.boosterIntensity = 1.15;
      if (ai.phaseTimer >= dur) {
        ai.phase = 'stalk';
        ai.moveKind = 'none';
      }
    } else if (ai.moveKind === 'combo') {
      attackVariant = ai.comboStep;
      const dur = ai.comboStep === 2 ? 0.34 : 0.26;
      attackProgress = Math.min(1, ai.phaseTimer / dur);
      const fwdX = -Math.sin(spatial.yaw);
      const fwdZ = -Math.cos(spatial.yaw);
      // Forward katana lunge impulse
      const stepSpd = ai.comboStep === 2 ? 8.2 : 6.4;
      moveX = fwdX * stepSpd * (1 - attackProgress * 0.6);
      moveZ = fwdZ * stepSpd * (1 - attackProgress * 0.6);
      ai.boosterIntensity = ai.comboStep === 2 ? 0.85 : 0.35;

      if (!ai.hitAppliedThisSwing && attackProgress >= 0.34) {
        ai.hitAppliedThisSwing = true;
        const rollRad = ai.comboStep === 0 ? -0.48 : ai.comboStep === 1 ? 0.52 : 0.08;
        const isFinisher = ai.comboStep === 2;
        checkKatanaSlashWorldAndPlayer(
          ctx,
          isFinisher ? 3.2 : 2.75,
          isFinisher ? -0.3 : 0.15,
          isFinisher ? 22 : 14,
          isFinisher ? 0.82 : 0.52,
          isFinisher,
          rollRad
        );
      }

      if (ai.phaseTimer >= dur) {
        if (ai.comboStep < 2 && distToPlayer <= 4.1) {
          ai.comboStep += 1;
          ai.phase = 'windup';
          ai.phaseTimer = 0;
          ai.hitAppliedThisSwing = false;
        } else {
          ai.phase = 'recover';
          ai.phaseTimer = 0;
          if (ai.comboStep === 2) {
            ctx.exposeWeakpoint(2.2);
          }
        }
      }
    } else if (ai.moveKind === 'iaijutsu') {
      attackVariant = 3;
      const dur = 0.36;
      attackProgress = Math.min(1, ai.phaseTimer / dur);
      ai.boosterIntensity = 1.35;

      // Explosive dash movement checked strictly against walls/cover via swept raycast!
      const dashSpeed = 24.0 * (1 - attackProgress * 0.35);
      const stepDist = dashSpeed * dt;
      tmpStart.set(spatial.x, spatial.y + 1.0, spatial.z);
      tmpEnd.set(
        spatial.x + ai.dashDirX * (stepDist + 0.55),
        spatial.y + 1.0,
        spatial.z + ai.dashDirZ * (stepDist + 0.55)
      );
      const wallCrash = raycastCollisionWorld3D(
        tmpStart.x,
        tmpStart.y,
        tmpStart.z,
        tmpEnd.x,
        tmpEnd.y,
        tmpEnd.z,
        world,
        tmpRayHit
      );
      if (wallCrash) {
        // Slammed into solid wall/cover — carve a huge glowing thermal slash across it!
        if (!ai.scarCheckedThisSwing) {
          ai.scarCheckedThisSwing = true;
          tmpTangent.set(-ai.dashDirZ, 0.18, ai.dashDirX).normalize();
          callbacks.spawnSurfaceSlashScar(
            tmpRayHit.point,
            tmpRayHit.normal,
            tmpTangent,
            true
          );
        }
        moveX = 0;
        moveZ = 0;
      } else {
        moveX = ai.dashDirX * dashSpeed;
        moveZ = ai.dashDirZ * dashSpeed;
      }

      if (!ai.hitAppliedThisSwing && attackProgress >= 0.22) {
        ai.hitAppliedThisSwing = true;
        checkKatanaSlashWorldAndPlayer(ctx, 3.6, -0.2, 28, 0.96, true, -0.14);
      }

      if (ai.phaseTimer >= dur) {
        ai.phase = 'recover';
        ai.phaseTimer = 0;
        // High-risk/high-reward counterplay: dorsal vents burst open for 2.8 seconds!
        ctx.exposeWeakpoint(2.8);
      }
    } else if (ai.moveKind === 'leap_slam') {
      attackVariant = 4;
      const dur = 0.72;
      attackProgress = Math.min(1, ai.phaseTimer / dur);

      // Parabolic booster-vault arc up to 2.45m airborne!
      ai.airborneHeight = Math.sin(attackProgress * Math.PI) * 2.45;
      ai.boosterIntensity = attackProgress < 0.55 ? 1.25 : 0.45;

      // Travel cleanly toward target (blocked by solid walls!)
      const toTx = ai.dashTargetX - spatial.x;
      const toTz = ai.dashTargetZ - spatial.z;
      const rem = Math.hypot(toTx, toTz);
      if (rem > 0.7 && attackProgress < 0.88) {
        const leapSpd = Math.min(11.5, rem / Math.max(0.12, (0.88 - attackProgress) * dur));
        moveX = (toTx / rem) * leapSpd;
        moveZ = (toTz / rem) * leapSpd;
      }

      if (!ai.hitAppliedThisSwing && attackProgress >= 0.84) {
        ai.hitAppliedThisSwing = true;
        // Vertical overhead crescent ribbon + molten FLOOR fissure scar!
        const fwdX = -Math.sin(spatial.yaw);
        const fwdZ = -Math.cos(spatial.yaw);
        tmpOrigin.set(spatial.x + fwdX * 0.95, spatial.y + 0.04, spatial.z + fwdZ * 0.95);
        tmpTangent.set(fwdX, 0, fwdZ).normalize();
        callbacks.spawnSurfaceSlashScar(
          tmpOrigin,
          new THREE.Vector3(0, 1, 0),
          tmpTangent,
          true
        );
        checkKatanaSlashWorldAndPlayer(ctx, 3.4, -0.35, 26, 0.95, true, Math.PI * 0.48);
      }

      if (ai.phaseTimer >= dur) {
        ai.airborneHeight = 0;
        ai.phase = 'recover';
        ai.phaseTimer = 0;
        ctx.exposeWeakpoint(2.6);
      }
    }
  }
  // ---------------------------------------------------------------------------
  // 5. ZANSHIN RECOVERY WINDOW (Dorsal Booster Core Wide Open!)
  // ---------------------------------------------------------------------------
  else if (ai.phase === 'recover') {
    state.behavior = 'recover';
    ai.phaseTimer += dt;
    ai.airborneHeight = Math.max(0, ai.airborneHeight - dt * 12);

    const recDur = ai.moveKind === 'combo' ? 0.55 : 1.05;
    attackVariant =
      ai.moveKind === 'iaijutsu' ? 3 : ai.moveKind === 'leap_slam' ? 4 : ai.comboStep;
    attackProgress = Math.min(1, ai.phaseTimer / recDur);

    if (ai.phaseTimer >= recDur) {
      ai.phase = 'stalk';
      ai.moveKind = 'none';
      ai.attackCooldown = 1.15;
    }
  }

  if (moveX !== 0 || moveZ !== 0) {
    stepEnemyMovement(spatial, moveX, moveZ, world, dt);
  }

  rig.updateAnimation({
    dt,
    elapsed,
    behavior: state.behavior,
    speedRatio,
    localMoveX,
    localMoveZ: speedRatio,
    aimPitch: 0,
    attackProgress,
    attackVariant,
    flinchTimer: state.flinchTimer,
    flinchDirX: state.flinchDirX,
    staggerTimer: state.staggerTimer,
    deadProgress: 0,
    weakpointExposed: state.weakpoint.exposed,
    weakpointBroken: state.weakpoint.broken,
    shieldActive: false,
    phase: 1,
    airborneHeight: ai.airborneHeight,
    boosterIntensity: ai.boosterIntensity,
  });
}
