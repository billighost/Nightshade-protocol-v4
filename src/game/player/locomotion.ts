import type { ColliderRect, OperativeLocomotionState } from '../core/types';
import type { CollisionWorld3D } from '../arena/hideout/types';
import {
  hasLowCeilingAbove,
  resolveCeilingHeight3D,
  resolveSupportHeight3D,
  resolveWorldHorizontal3D,
  STANCE_HEAD_HEIGHT,
} from '../arena/hideout/hideoutCollision';

/**
 * Calibrated 1:1 Human-Scale AAA Third-Person Locomotion & Variable Hold-to-Jump Physics:
 * - Grounded, weighty movement speeds & smooth momentum curves (ZERO twitchy arcade snapping!)
 * - Dynamic stride length scaling so walking & running leg cadence looks authentically human
 * - Variable hold-to-jump (authentic athletic feel):
 *   * Tap Space -> crisp ~0.66m tactical hop
 *   * Hold Space -> climbs smoothly to ~1.14m AND surges further horizontally to clear 0.98m cover platforms cleanly!
 *   * Silky apex hang-time band + readable weighted descent + true 3D platform landing (`supportY`)
 */
export const LOCOMOTION_CONFIG = {
  walkSpeed: 2.65,
  sprintSpeed: 5.5,
  crouchSpeed: 1.8,
  adsSpeed: 1.95,
  rollSpeed: 6.4,
  rollDuration: 0.88,
  rollCooldown: 1.05,
  groundAccel: 13.0,
  groundFriction: 10.5,
  airAccel: 7.5,
  launchPadAirAccel: 1.35,
  jumpVelocity: 5.25,
  jumpHoldDuration: 0.23,
  jumpHoldGravity: 9.8,
  launchPadGravity: 15.0,
  jumpHoldForwardBoost: 3.7,
  apexVelocityBand: 1.0,
  apexGravity: 11.8,
  shortHopGravity: 27.5,
  fallGravity: 19.5,
  maxFallSpeed: 16.5,
  coyoteDuration: 0.14,
  jumpBufferDuration: 0.14,
  playerRadius: 0.44,
  stepStrideWalk: 2.16,
  stepStrideSprint: 2.72,
  platformSnapMargin: 0.16,
} as const;

export interface LocomotionInput {
  dt: number;
  moveForward: number; // -1..1 (+1 = W / forward)
  moveRight: number; // -1..1 (+1 = D / right)
  cameraYaw: number; // radians, 0 = looking along -Z
  sprintHeld: boolean;
  crouchHeld: boolean;
  adsHeld: boolean;
  jumpJustPressed: boolean;
  /** True while Space is held down (extends jump height & horizontal leap distance!) */
  jumpHeld?: boolean;
  rollJustPressed: boolean;
  colliders: ColliderRect[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Optional 3D multi-floor world collision (slabs, straight/spiral stairs, underpasses, dynamic doors) */
  world3D?: CollisionWorld3D;
}

export function createInitialLocomotionState(x = 0, z = 14, y = 0): OperativeLocomotionState {
  return {
    x,
    y,
    z,
    vx: 0,
    vy: 0,
    vz: 0,
    grounded: true,
    crouching: false,
    sprinting: false,
    rollTimer: 0,
    rollCooldown: 0,
    rollDirX: 0,
    rollDirZ: -1,
    rollLocalX: 0,
    rollLocalZ: 1,
    jumpLocalX: 0,
    jumpLocalZ: 0,
    jumpHoldTimer: 0,
    launchPadTimer: 0,
    airTime: 0,
    landingTimer: 0,
    landingDuration: 0.34,
    landingImpact: 0,
    supportY: y,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    gaitPhase: 0,
    speedRatio: 0,
    localMoveX: 0,
    localMoveZ: 0,
    stepTrigger: false,
    jumpTrigger: false,
    landTrigger: false,
    rollContactTrigger: false,
  };
}

export function resolveCircleRectCollision(
  x: number,
  z: number,
  radius: number,
  rect: ColliderRect
): { x: number; z: number; collided: boolean } {
  const closestX = Math.max(rect.minX, Math.min(x, rect.maxX));
  const closestZ = Math.max(rect.minZ, Math.min(z, rect.maxZ));

  const dx = x - closestX;
  const dz = z - closestZ;
  const distSq = dx * dx + dz * dz;

  if (distSq >= radius * radius) {
    return { x, z, collided: false };
  }

  if (distSq > 1e-8) {
    const dist = Math.sqrt(distSq);
    const push = radius - dist;
    return {
      x: x + (dx / dist) * push,
      z: z + (dz / dist) * push,
      collided: true,
    };
  }

  const leftDist = Math.abs(x - rect.minX);
  const rightDist = Math.abs(rect.maxX - x);
  const topDist = Math.abs(z - rect.minZ);
  const bottomDist = Math.abs(rect.maxZ - z);
  const minDist = Math.min(leftDist, rightDist, topDist, bottomDist);

  if (minDist === leftDist) return { x: rect.minX - radius, z, collided: true };
  if (minDist === rightDist) return { x: rect.maxX + radius, z, collided: true };
  if (minDist === topDist) return { x, z: rect.minZ - radius, collided: true };
  return { x, z: rect.maxZ + radius, collided: true };
}

/**
 * Computes the highest walkable horizontal platform surface (`y >= 0`) directly beneath
 * the operative's boot footprint that the operative's feet are at or above.
 */
function findSupportHeight(
  x: number,
  z: number,
  feetY: number,
  colliders: ColliderRect[]
): number {
  let highest = 0;
  const footRadius = LOCOMOTION_CONFIG.playerRadius * 0.72;
  const margin = LOCOMOTION_CONFIG.platformSnapMargin;

  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (c.maxY === undefined) continue;
    // Skip walls/racks higher than our current feet elevation
    if (feetY < c.maxY - margin) continue;

    const closestX = Math.max(c.minX, Math.min(x, c.maxX));
    const closestZ = Math.max(c.minZ, Math.min(z, c.maxZ));
    const dx = x - closestX;
    const dz = z - closestZ;
    if (dx * dx + dz * dz <= footRadius * footRadius) {
      if (c.maxY > highest) highest = c.maxY;
    }
  }
  return highest;
}

export function stepLocomotion(
  state: OperativeLocomotionState,
  input: LocomotionInput
): OperativeLocomotionState {
  const dt = Math.max(0, Math.min(input.dt, 0.05));
  state.stepTrigger = false;
  state.jumpTrigger = false;
  state.landTrigger = false;
  state.rollContactTrigger = false;

  const jumpHeld = Boolean(input.jumpHeld);

  if (state.rollCooldown > 0) {
    state.rollCooldown = Math.max(0, state.rollCooldown - dt);
  }
  if (state.landingTimer > 0) {
    state.landingTimer = Math.max(0, state.landingTimer - dt);
  }
  if (state.coyoteTimer > 0) {
    state.coyoteTimer = Math.max(0, state.coyoteTimer - dt);
  }
  if (state.jumpBufferTimer > 0) {
    state.jumpBufferTimer = Math.max(0, state.jumpBufferTimer - dt);
  }
  if ((state.launchPadTimer ?? 0) > 0) {
    state.launchPadTimer = state.grounded ? 0 : Math.max(0, (state.launchPadTimer ?? 0) - dt);
  }
  if (input.jumpJustPressed) {
    state.jumpBufferTimer = LOCOMOTION_CONFIG.jumpBufferDuration;
  }

  // Camera forward and right vectors on XZ plane (yaw 0 looks toward -Z)
  const forwardX = -Math.sin(input.cameraYaw);
  const forwardZ = -Math.cos(input.cameraYaw);
  const rightX = Math.cos(input.cameraYaw);
  const rightZ = -Math.sin(input.cameraYaw);

  let wishX = forwardX * input.moveForward + rightX * input.moveRight;
  let wishZ = forwardZ * input.moveForward + rightZ * input.moveRight;
  const wishLen = Math.hypot(wishX, wishZ);
  if (wishLen > 1e-4) {
    wishX /= wishLen;
    wishZ /= wishLen;
  } else {
    wishX = 0;
    wishZ = 0;
  }

  // Tactical martial dodge roll (`V`)
  if (
    input.rollJustPressed &&
    state.grounded &&
    state.rollTimer === 0 &&
    state.rollCooldown === 0
  ) {
    state.rollTimer = LOCOMOTION_CONFIG.rollDuration;
    state.rollCooldown = LOCOMOTION_CONFIG.rollCooldown;
    state.rollDirX = wishLen > 0.05 ? wishX : forwardX;
    state.rollDirZ = wishLen > 0.05 ? wishZ : forwardZ;
    const rawLocalF = state.rollDirX * forwardX + state.rollDirZ * forwardZ;
    const rawLocalR = state.rollDirX * rightX + state.rollDirZ * rightZ;
    const localLen = Math.hypot(rawLocalF, rawLocalR) || 1;
    state.rollLocalZ = rawLocalF / localLen;
    state.rollLocalX = rawLocalR / localLen;
    state.crouching = false;
  }

  if (state.rollTimer > 0) {
    const prevTRoll = 1 - state.rollTimer / LOCOMOTION_CONFIG.rollDuration;
    state.rollTimer = Math.max(0, state.rollTimer - dt);
    const tRoll = 1 - state.rollTimer / LOCOMOTION_CONFIG.rollDuration;

    // Emit tactile ground-contact trigger right when dive-leap hits the concrete floor (tRoll = 0.25)
    if (prevTRoll < 0.25 && tRoll >= 0.25) {
      state.rollContactTrigger = true;
    }

    // 3-Stage Dive-Leap -> Ground Roll -> Combat Stand-Up horizontal velocity profile:
    //   0.00 -> 0.26 : Explosive low forward leap burst (1.24x -> 1.08x)
    //   0.26 -> 0.74 : Smooth rolling ground momentum tapering gently under concrete friction (1.06x -> 0.72x)
    //   0.74 -> 1.00 : Grounded boot plant & combat stand-up deceleration (0.72x -> 0.22x)
    let rollEase: number;
    if (tRoll < 0.26) {
      const u = tRoll / 0.26;
      rollEase = 1.24 - 0.16 * u;
    } else if (tRoll < 0.74) {
      const u = (tRoll - 0.26) / 0.48;
      rollEase = 1.08 - 0.36 * u;
    } else {
      const u = (tRoll - 0.74) / 0.26;
      rollEase = 0.72 - 0.5 * u;
    }

    state.vx = state.rollDirX * LOCOMOTION_CONFIG.rollSpeed * Math.max(0.22, rollEase);
    state.vz = state.rollDirZ * LOCOMOTION_CONFIG.rollSpeed * Math.max(0.22, rollEase);
    state.sprinting = false;

    // Safety net: if a dodge-roll is about to finish directly underneath a jammed half-open blast shutter,
    // glide forward smoothly until the operative's capsule clears the shutter thickness before standing up!
    if (
      state.rollTimer <= 0.04 &&
      input.world3D &&
      hasLowCeilingAbove(state.x, state.z, state.y, LOCOMOTION_CONFIG.playerRadius, input.world3D.boxes)
    ) {
      state.rollTimer = 0.09;
      state.vx = state.rollDirX * LOCOMOTION_CONFIG.rollSpeed * 0.65;
      state.vz = state.rollDirZ * LOCOMOTION_CONFIG.rollSpeed * 0.65;
    }
  } else {
    state.crouching = input.crouchHeld && state.grounded;
    const canSprint =
      input.sprintHeld &&
      !input.adsHeld &&
      !state.crouching &&
      wishLen > 0.1 &&
      input.moveForward >= -0.1;
    state.sprinting = canSprint;

    let maxSpeed: number = LOCOMOTION_CONFIG.walkSpeed;
    if (state.crouching) maxSpeed = LOCOMOTION_CONFIG.crouchSpeed;
    else if (input.adsHeld) maxSpeed = LOCOMOTION_CONFIG.adsSpeed;
    else if (canSprint) maxSpeed = LOCOMOTION_CONFIG.sprintSpeed;

    // Subtle weighted landing slowdown during the deepest 45% of heavy landing absorption
    if (state.grounded && state.landingTimer > 0) {
      const landNorm = state.landingTimer / Math.max(0.01, state.landingDuration);
      maxSpeed *= 1 - landNorm * state.landingImpact * 0.28;
    }

    const targetVx = wishX * maxSpeed;
    const targetVz = wishZ * maxSpeed;

    const inLaunchArc = !state.grounded && (state.launchPadTimer ?? 0) > 0;
    if (inLaunchArc) {
      // Preserve pneumatic launch horizontal trajectory hands-off while still allowing smooth mid-air steering!
      if (wishLen > 0.05) {
        const steerBlend = 1 - Math.exp(-LOCOMOTION_CONFIG.launchPadAirAccel * dt);
        state.vx += (targetVx - state.vx) * steerBlend;
        state.vz += (targetVz - state.vz) * steerBlend;
      }
    } else {
      const accel = state.grounded
        ? wishLen > 0.05
          ? LOCOMOTION_CONFIG.groundAccel
          : LOCOMOTION_CONFIG.groundFriction
        : LOCOMOTION_CONFIG.airAccel;
      const blend = 1 - Math.exp(-accel * dt);
      state.vx += (targetVx - state.vx) * blend;
      state.vz += (targetVz - state.vz) * blend;
    }

    if (Math.hypot(state.vx, state.vz) < 0.02 && wishLen < 0.05) {
      state.vx = 0;
      state.vz = 0;
    }
  }

  // Variable Hold-to-Jump Launch (with coyote time & input buffer)
  if (state.grounded) {
    state.coyoteTimer = LOCOMOTION_CONFIG.coyoteDuration;
  }
  if (state.jumpBufferTimer > 0 && state.coyoteTimer > 0 && state.rollTimer === 0) {
    state.vy = LOCOMOTION_CONFIG.jumpVelocity;
    state.jumpHoldTimer = LOCOMOTION_CONFIG.jumpHoldDuration;
    state.airTime = 0;
    state.grounded = false;
    state.crouching = false;
    state.coyoteTimer = 0;
    state.jumpBufferTimer = 0;
    state.landingTimer = 0;
    state.jumpLocalX = input.moveRight;
    state.jumpLocalZ = input.moveForward;
    state.jumpTrigger = true;

    // Athletic forward launch impulse when moving at takeoff
    if (wishLen > 0.1) {
      const boost = state.sprinting ? 1.15 : 0.75;
      state.vx += wishX * boost;
      state.vz += wishZ * boost;
    }
  }

  // Variable Hold-to-Jump Ascent Boost + Apex Hang-Time + Weighted Descent
  const prevY = state.y;
  const wasAirborne = !state.grounded;

  const activeHeadHeight =
    state.rollTimer > 0
      ? STANCE_HEAD_HEIGHT.rolling
      : state.crouching
        ? STANCE_HEAD_HEIGHT.crouching
        : STANCE_HEAD_HEIGHT.standing;
  const r = LOCOMOTION_CONFIG.playerRadius;

  if (!state.grounded || state.vy > 0) {
    state.airTime += dt;

    if (jumpHeld && state.jumpHoldTimer > 0 && state.vy > 0) {
      state.jumpHoldTimer = Math.max(0, state.jumpHoldTimer - dt);
      // Holding Space lowers ascent gravity AND adds forward leap propulsion so jump goes HIGHER & FURTHER!
      state.vy -= LOCOMOTION_CONFIG.jumpHoldGravity * dt;
      if (wishLen > 0.1) {
        state.vx += wishX * LOCOMOTION_CONFIG.jumpHoldForwardBoost * dt;
        state.vz += wishZ * LOCOMOTION_CONFIG.jumpHoldForwardBoost * dt;
      }
    } else {
      // Stop hold-boost as soon as Space is released
      if (!jumpHeld) state.jumpHoldTimer = 0;

      let gravity: number;
      if (Math.abs(state.vy) <= LOCOMOTION_CONFIG.apexVelocityBand) {
        // Silky AAA apex hang-time band so mid-air pose reads dramatically!
        gravity = LOCOMOTION_CONFIG.apexGravity;
      } else if (state.vy > 0 && (state.launchPadTimer ?? 0) > 0) {
        // Pneumatic jump-pad soaring ascent curve — cleanly reaches +4.4m upper balconies & catwalks!
        gravity = LOCOMOTION_CONFIG.launchPadGravity;
      } else if (state.vy > 0) {
        // Released Space early -> crisp short-hop cut!
        gravity = LOCOMOTION_CONFIG.shortHopGravity;
      } else {
        // Weighted readable descent
        gravity = LOCOMOTION_CONFIG.fallGravity;
      }
      state.vy = Math.max(-LOCOMOTION_CONFIG.maxFallSpeed, state.vy - gravity * dt);
    }

    state.y += state.vy * dt;

    // 3D Solid Ceiling / Platform Underside Collision (prevents jumping or jump-padding through undersides!)
    if (input.world3D && state.y > prevY) {
      const clampedY = resolveCeilingHeight3D(
        state.x,
        state.z,
        prevY,
        state.y,
        activeHeadHeight,
        r,
        input.world3D
      );
      if (clampedY !== null) {
        state.y = Math.min(state.y, clampedY);
        if (state.vy > 0) state.vy = 0;
        state.jumpHoldTimer = 0;
      }
    }
  }

  // Horizontal integrate + 3D-elevation-aware slide collisions
  let nextX = state.x + state.vx * dt;
  let nextZ = state.z + state.vz * dt;

  const activeBounds = input.world3D ? input.world3D.bounds : input.bounds;
  nextX = Math.max(activeBounds.minX + r, Math.min(activeBounds.maxX - r, nextX));
  nextZ = Math.max(activeBounds.minZ + r, Math.min(activeBounds.maxZ - r, nextZ));

  if (input.world3D) {
    const activeStepClearance = state.grounded ? 0.44 : LOCOMOTION_CONFIG.platformSnapMargin;
    const res3D = resolveWorldHorizontal3D(
      nextX,
      nextZ,
      Math.max(prevY, state.y),
      r,
      input.world3D,
      undefined,
      activeHeadHeight,
      activeStepClearance
    );
    nextX = res3D.x;
    nextZ = res3D.z;

    // Post-horizontal ceiling re-check prevents diagonal upward launches from tunneling under an overhang!
    if (state.y > prevY) {
      const postClampedY = resolveCeilingHeight3D(
        nextX,
        nextZ,
        prevY,
        state.y,
        activeHeadHeight,
        r,
        input.world3D
      );
      if (postClampedY !== null) {
        state.y = Math.min(state.y, postClampedY);
        if (state.vy > 0) state.vy = 0;
        state.jumpHoldTimer = 0;
      }
    }
  } else {
    // Two solver passes prevent corner jitter against pillars & barricades;
    // allow clearing & walking ON TOP OF any platform whose top <= feet + step margin!
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < input.colliders.length; i++) {
        const c = input.colliders[i];
        if (c.maxY !== undefined && Math.max(prevY, state.y) >= c.maxY - LOCOMOTION_CONFIG.platformSnapMargin) {
          continue;
        }
        const res = resolveCircleRectCollision(nextX, nextZ, r, c);
        nextX = res.x;
        nextZ = res.z;
      }
    }
  }

  const movedDist = Math.hypot(nextX - state.x, nextZ - state.z);
  state.x = nextX;
  state.z = nextZ;

  // 3D Platform & Stair Support Surface Check (straight stairs, curved spiral stairs, balconies, cover crates!)
  if (input.world3D) {
    const stepUp = state.grounded ? 0.5 : LOCOMOTION_CONFIG.platformSnapMargin;
    const rawSupport = resolveSupportHeight3D(
      state.x,
      state.z,
      Math.max(prevY, state.y),
      input.world3D,
      stepUp
    );
    const supportY = rawSupport !== null ? rawSupport : -1000;
    state.supportY = rawSupport !== null ? rawSupport : state.supportY;

    if (state.grounded) {
      // Smooth downward stair tracking: snap down slopes up to 0.48m without micro-hopping,
      // while stepping off a real ledge (> 0.48m drop) cleanly enters airborne fall with coyote time!
      if (rawSupport === null || supportY < state.y - 0.48) {
        state.grounded = false;
        state.airTime = 0;
      } else {
        state.y = supportY;
        state.vy = 0;
      }
    } else if (state.vy <= 0 && rawSupport !== null && state.y <= supportY + 0.04) {
      const impactSpeed = Math.abs(state.vy);
      state.y = supportY;
      state.vy = 0;
      state.grounded = true;
      state.jumpHoldTimer = 0;
      if (wasAirborne && (impactSpeed > 1.2 || state.airTime > 0.14)) {
        const impact = Math.max(0.28, Math.min(1.0, (impactSpeed - 1.5) / 8.5));
        state.landingImpact = impact;
        state.landingDuration = 0.28 + impact * 0.16;
        state.landingTimer = state.landingDuration;
        state.landTrigger = true;
      }
    }

    // Graceful out-of-bounds abyss safety respawn to current floor's safe landing
    if (state.y < input.world3D.minSafeY) {
      state.x = input.world3D.fallbackSpawn.x;
      state.y = input.world3D.fallbackSpawn.y;
      state.z = input.world3D.fallbackSpawn.z;
      state.vx = 0;
      state.vy = 0;
      state.vz = 0;
      state.grounded = true;
      state.supportY = input.world3D.fallbackSpawn.y;
    }
  } else {
    const supportY = findSupportHeight(state.x, state.z, Math.max(prevY, state.y), input.colliders);
    state.supportY = supportY;

    if (state.grounded) {
      if (supportY < state.y - 0.04) {
        // Stepped off an elevated platform -> enter airborne fall cleanly with coyote time!
        state.grounded = false;
        state.airTime = 0;
      } else {
        state.y = supportY;
        state.vy = 0;
      }
    } else if (state.vy <= 0 && state.y <= supportY) {
      const impactSpeed = Math.abs(state.vy);
      state.y = supportY;
      state.vy = 0;
      state.grounded = true;
      state.jumpHoldTimer = 0;
      if (wasAirborne && (impactSpeed > 1.2 || state.airTime > 0.14)) {
        const impact = Math.max(0.28, Math.min(1.0, (impactSpeed - 1.5) / 8.5));
        state.landingImpact = impact;
        state.landingDuration = 0.28 + impact * 0.16; // 0.32s .. 0.44s weighted readable knee absorption!
        state.landingTimer = state.landingDuration;
        state.landTrigger = true;
      }
    }
  }

  // Compute local velocity components for directional leg animation
  const horizSpeed = Math.hypot(state.vx, state.vz);
  state.speedRatio = Math.min(1, horizSpeed / LOCOMOTION_CONFIG.sprintSpeed);
  const localForward = state.vx * forwardX + state.vz * forwardZ;
  const localRight = state.vx * rightX + state.vz * rightZ;
  state.localMoveZ = Math.max(-1, Math.min(1, localForward / LOCOMOTION_CONFIG.sprintSpeed));
  state.localMoveX = Math.max(-1, Math.min(1, localRight / LOCOMOTION_CONFIG.sprintSpeed));

  // Calibrated dynamic stride length (walk ~1.98m -> sprint ~2.48m) for natural, unhurried footstep rhythm!
  if (state.grounded && state.rollTimer === 0 && movedDist > 0.0005) {
    const strideLen =
      LOCOMOTION_CONFIG.stepStrideWalk +
      (LOCOMOTION_CONFIG.stepStrideSprint - LOCOMOTION_CONFIG.stepStrideWalk) * state.speedRatio;
    const prevHalfCycle = Math.floor(state.gaitPhase / Math.PI);
    state.gaitPhase += (movedDist / strideLen) * Math.PI * 2;
    const nextHalfCycle = Math.floor(state.gaitPhase / Math.PI);
    if (nextHalfCycle > prevHalfCycle && horizSpeed > 0.9) {
      state.stepTrigger = true;
    }
  }

  return state;
}
