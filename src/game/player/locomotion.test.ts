import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialLocomotionState,
  LOCOMOTION_CONFIG,
  resolveCircleRectCollision,
  stepLocomotion,
} from './locomotion';

const BOUNDS = { minX: -18, maxX: 18, minZ: -20, maxZ: 20 };

test('Operative accelerates smoothly at realistic tactical speed and syncs gait phase without skating', () => {
  const state = createInitialLocomotionState(0, 10);
  const startZ = state.z;

  for (let i = 0; i < 30; i++) {
    stepLocomotion(state, {
      dt: 0.025,
      moveForward: 1,
      moveRight: 0,
      cameraYaw: 0, // facing -Z
      sprintHeld: true,
      crouchHeld: false,
      adsHeld: false,
      jumpJustPressed: false,
      jumpHeld: false,
      rollJustPressed: false,
      colliders: [],
      bounds: BOUNDS,
    });
  }

  assert.ok(state.z < startZ - 2.2, 'Moving forward should decrease Z when yaw is 0');
  assert.equal(state.sprinting, true);
  assert.ok(state.gaitPhase > Math.PI, 'Gait phase should advance proportionally to distance');
  assert.ok(
    Math.hypot(state.vx, state.vz) <= LOCOMOTION_CONFIG.sprintSpeed + 0.05,
    'Sprint speed must remain bounded to realistic 1:1 human pace'
  );
});

test('Circle-vs-AABB collision resolver slides operative cleanly around concrete cover pillars', () => {
  const pillar = { minX: -1, maxX: 1, minZ: -1, maxZ: 1 };
  const resolved = resolveCircleRectCollision(0, 1.1, LOCOMOTION_CONFIG.playerRadius, pillar);

  assert.equal(resolved.collided, true);
  assert.ok(resolved.z >= 1 + LOCOMOTION_CONFIG.playerRadius - 1e-4);

  const state = createInitialLocomotionState(0.2, 2.2);
  for (let i = 0; i < 40; i++) {
    stepLocomotion(state, {
      dt: 0.025,
      moveForward: 1,
      moveRight: 0,
      cameraYaw: 0,
      sprintHeld: false,
      crouchHeld: false,
      adsHeld: false,
      jumpJustPressed: false,
      jumpHeld: false,
      rollJustPressed: false,
      colliders: [pillar],
      bounds: BOUNDS,
    });
  }
  assert.ok(
    state.z >= pillar.maxZ + LOCOMOTION_CONFIG.playerRadius - 0.01,
    'Operative must never tunnel through pillar'
  );
});

test('Tactical dive-leap dodge-roll surges fastest during low leap, fires ground contact trigger, and decelerates cleanly', () => {
  const state = createInitialLocomotionState(0, 10);
  let contactCount = 0;
  let leapSpeed = 0;
  let lateSpeed = 0;

  for (let i = 0; i < 46; i++) {
    stepLocomotion(state, {
      dt: 0.02,
      moveForward: 0,
      moveRight: 1,
      cameraYaw: 0,
      sprintHeld: false,
      crouchHeld: false,
      adsHeld: false,
      jumpJustPressed: false,
      jumpHeld: false,
      rollJustPressed: i === 0,
      colliders: [],
      bounds: BOUNDS,
    });
    if (i === 0) {
      assert.ok(state.rollTimer > 0, 'Roll timer should activate');
      assert.ok(state.rollCooldown > 0, 'Roll cooldown should activate');
      leapSpeed = state.vx;
    }
    if (state.rollContactTrigger) contactCount++;
    if (i === 40) lateSpeed = state.vx;
  }

  assert.ok(leapSpeed > LOCOMOTION_CONFIG.sprintSpeed, `Low forward leap burst (${leapSpeed.toFixed(2)}) should exceed sprint speed`);
  assert.equal(contactCount, 1, 'Ground contact trigger should fire exactly once when dive-leap hits concrete');
  assert.ok(lateSpeed < leapSpeed * 0.65, `Stand-up phase speed (${lateSpeed.toFixed(2)}) should decelerate smoothly from leap (${leapSpeed.toFixed(2)})`);
});

test('Variable hold-to-jump reaches realistic athletic height (~1.10-1.26m, NOT superhuman) while clearing 0.98m platforms and going higher/further than tap', () => {
  const simulateJump = (holdFrames: number) => {
    const st = createInitialLocomotionState(0, 10);
    // Warm up forward walking velocity
    for (let i = 0; i < 25; i++) {
      stepLocomotion(st, {
        dt: 0.02,
        moveForward: 1,
        moveRight: 0,
        cameraYaw: 0,
        sprintHeld: false,
        crouchHeld: false,
        adsHeld: false,
        jumpJustPressed: false,
        jumpHeld: false,
        rollJustPressed: false,
        colliders: [],
        bounds: BOUNDS,
      });
    }
    const takeoffZ = st.z;
    let peakY = 0;
    let airFrames = 0;

    for (let f = 0; f < 100; f++) {
      stepLocomotion(st, {
        dt: 0.02,
        moveForward: 1,
        moveRight: 0,
        cameraYaw: 0,
        sprintHeld: false,
        crouchHeld: false,
        adsHeld: false,
        jumpJustPressed: f === 0,
        jumpHeld: f < holdFrames,
        rollJustPressed: false,
        colliders: [],
        bounds: BOUNDS,
      });
      if (st.y > peakY) peakY = st.y;
      if (!st.grounded) airFrames++;
      if (f > 5 && st.grounded) break;
    }

    return { peakY, distZ: takeoffZ - st.z, airTime: airFrames * 0.02, landingImpact: st.landingImpact };
  };

  const tap = simulateJump(2);
  const fullHold = simulateJump(22);

  assert.ok(
    fullHold.peakY >= 1.05 && fullHold.peakY <= 1.28,
    `Hold-jump must clear 0.98m platforms at realistic human athletic height (1.05..1.28m), got ${fullHold.peakY.toFixed(2)}m`
  );
  assert.ok(
    tap.peakY >= 0.55 && tap.peakY <= 0.82,
    `Quick tap-jump should be a crisp short hop (0.55..0.82m), got ${tap.peakY.toFixed(2)}m`
  );
  assert.ok(
    fullHold.peakY > tap.peakY + 0.35,
    `Hold-jump (${fullHold.peakY.toFixed(2)}m) must jump noticeably higher than tap (${tap.peakY.toFixed(2)}m)`
  );
  assert.ok(
    fullHold.distZ > tap.distZ + 0.55,
    `Hold-jump (${fullHold.distZ.toFixed(2)}m) must travel noticeably further than tap (${tap.distZ.toFixed(2)}m)`
  );
  assert.ok(
    fullHold.airTime >= 0.62,
    `Hold-jump air time should feel readable & weighted, got ${fullHold.airTime.toFixed(2)}s`
  );
  assert.ok(fullHold.landingImpact > 0.3, 'Landing should register scaled impact compression');
});

test('Operative can hold-jump onto and stand cleanly on top of a 0.98m concrete cover platform', () => {
  const coverPlatform = { minX: -2.0, maxX: 2.0, minZ: 5.0, maxZ: 6.4, maxY: 0.98 };
  const state = createInitialLocomotionState(0, 8.6);

  // Run forward toward cover, hold Space to leap onto top of the 0.98m barricade!
  let landedOnTop = false;
  for (let f = 0; f < 100; f++) {
    const shouldJump = f === 16;
    const holdJump = f >= 16 && f < 34;
    stepLocomotion(state, {
      dt: 0.02,
      moveForward: state.z > 5.7 ? 1 : 0,
      moveRight: 0,
      cameraYaw: 0,
      sprintHeld: false,
      crouchHeld: false,
      adsHeld: false,
      jumpJustPressed: shouldJump,
      jumpHeld: holdJump,
      rollJustPressed: false,
      colliders: [coverPlatform],
      bounds: BOUNDS,
    });
    if (state.grounded && Math.abs(state.y - 0.98) < 0.01) {
      landedOnTop = true;
      break;
    }
  }

  assert.equal(landedOnTop, true, `Operative should land and stand cleanly on top of 0.98m cover platform (ended at y=${state.y.toFixed(2)}, z=${state.z.toFixed(2)})`);
});
