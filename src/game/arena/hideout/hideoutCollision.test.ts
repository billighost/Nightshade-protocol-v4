import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  createInitialLocomotionState,
  stepLocomotion,
} from '../../player/locomotion';
import {
  F1_CONTROL_CENTER_POS,
  F1_GRID,
  F1_IDS,
  F1_L0_Y,
  F1_L1_Y,
  F1_L2_Y,
  F1_L3_Y,
  F1_MIN_SAFE_Y,
} from './floors/floor01/layout';
import {
  F2_CONTROL_CENTER_POS,
  F2_IDS,
  F2_L0_Y,
  F2_L1_Y,
  F2_L2_Y,
  F2_TRACK_Y,
} from './floors/floor02/layout';
import {
  F3_CONTROL_CENTER_POS,
  F3_IDS,
  F3_L0_Y,
  F3_L1_Y,
  F3_L2_Y,
  F3_SUB_Y,
} from './floors/floor03/layout';
import { F4_BASE_Y, F4_CHASM_Y, F4_IDS, F4_MID_Y, F4_UPPER_Y } from './floors/floor04/layout';
import { F5_BASE_Y, F5_IDS, F5_PIT_Y, F5_TIER_Y, F5_UPPER_Y } from './floors/floor05/layout';
import { F6_BASE_Y, F6_IDS, F6_TRENCH_Y, F6_UPPER_Y } from './floors/floor06/layout';
import { buildFloor7Complex } from './floors/floor07';
import { F7_BASE_Y, F7_IDS, F7_UPPER_Y } from './floors/floor07/layout';
import { buildFloor8Complex } from './floors/floor08';
import {
  evaluateArcAngleProgress,
  resolveCeilingHeight3D,
  resolveHorizontal3D,
  resolveSupportHeight3D,
  resolveWorldHorizontal3D,
} from './hideoutCollision';
import { createEightFloorHideout } from './index';
import { createHideoutMaterials } from './materials';
import { stepTacticalDoors } from './mechanics';
import type { CollisionWorld3D } from './types';
import { stepWorldMechanics } from './mechanics';

function makeBaseWorld(partial?: Partial<CollisionWorld3D>): CollisionWorld3D {
  return {
    boxes: [],
    slabs: [{ minX: -20, maxX: 20, minZ: -20, maxZ: 20, y: 0 }],
    ramps: [],
    arcRamps: [],
    ringSlabs: [],
    bounds: { minX: -20, maxX: 20, minZ: -20, maxZ: 20 },
    minSafeY: -10,
    fallbackSpawn: { x: 0, y: 0, z: 0 },
    ...partial,
  };
}

test('straight WalkableRamp ascends & descends monotonically with zero jitter', () => {
  const world = makeBaseWorld({
    ramps: [
      {
        minX: -2,
        maxX: 2,
        minZ: 0,
        maxZ: 8,
        yStart: 0,
        yEnd: 4,
        axis: 'z',
      },
    ],
  });

  const samples: number[] = [];
  let prevY = 0;
  for (let z = 0; z <= 8; z += 0.5) {
    const h = resolveSupportHeight3D(0, z, prevY, world);
    assert.ok(h !== null, `expected valid support at z=${z}`);
    samples.push(h);
    assert.ok(h >= prevY - 1e-6, `expected monotonic ascent at z=${z}: ${h} vs ${prevY}`);
    prevY = h;
  }
  assert.ok(Math.abs(samples[0] - 0) < 1e-4);
  assert.ok(Math.abs(samples[samples.length - 1] - 4.0) < 1e-4);

  // Now descend smoothly via stepLocomotion (~1.5s walk down 8m ramp -> descends ~2.1m!)
  const loco = createInitialLocomotionState(0, 7.6, 3.8);
  for (let i = 0; i < 90; i++) {
    stepLocomotion(loco, {
      dt: 1 / 60,
      moveForward: 1, // yaw = 0 moves toward -Z (down the ramp!)
      moveRight: 0,
      cameraYaw: 0,
      sprintHeld: false,
      crouchHeld: false,
      adsHeld: false,
      jumpJustPressed: false,
      jumpHeld: false,
      rollJustPressed: false,
      colliders: [],
      bounds: world.bounds,
      world3D: world,
    });
  }
  assert.ok(loco.y < 2.2, `expected player to descend stairs smoothly, got y=${loco.y}`);
  assert.equal(loco.grounded, true, 'expected grounded tracking while descending straight stairs');
});

test('curved WalkableArcRamp tracks elevation on spiral treads and leaves open central hole genuinely void', () => {
  const world: CollisionWorld3D = {
    boxes: [],
    slabs: [],
    ramps: [],
    ringSlabs: [],
    arcRamps: [
      {
        centerX: 0,
        centerZ: 0,
        innerRadius: 4.5,
        outerRadius: 8.5,
        startAngle: 0,
        endAngle: Math.PI, // 180° CCW climb from y=84 -> y=88.4
        yStart: 84.0,
        yEnd: 88.4,
      },
    ],
    bounds: { minX: -20, maxX: 20, minZ: -20, maxZ: 20 },
    minSafeY: 70,
    fallbackSpawn: { x: 6.5, y: 84, z: 0 },
  };

  // Inside the gaping 9m open central hole (r < 4.5m): NO floor support!
  assert.equal(resolveSupportHeight3D(0, 0, 84.5, world), null);
  assert.equal(resolveSupportHeight3D(2.0, 2.0, 86.0, world), null);

  // Outside outer radius: NO floor support
  assert.equal(resolveSupportHeight3D(10.0, 0, 84.5, world), null);

  // Along the curved arc (r = 6.5m) from 0 -> PI: smooth monotonic ascent in walkable steps!
  let curY = 84.0;
  for (let i = 0; i <= 12; i++) {
    const frac = i / 12;
    const angle = frac * Math.PI;
    const x = Math.cos(angle) * 6.5;
    const z = Math.sin(angle) * 6.5;
    const expected = 84.0 + frac * 4.4;
    const h = resolveSupportHeight3D(x, z, curY, world);
    assert.ok(h !== null, `expected spiral support at frac=${frac.toFixed(2)}`);
    assert.ok(
      Math.abs(h - expected) < 0.05,
      `expected y≈${expected.toFixed(2)}, got ${h.toFixed(2)}`
    );
    curY = h;
  }

  // Also test CW (negative angle sweep) progress helper used by Floor 3 & Floor 1 double helices!
  const tStart = evaluateArcAngleProgress(-0.62 * Math.PI, -0.62 * Math.PI, -1.36 * Math.PI);
  const tMid = evaluateArcAngleProgress(-1.0 * Math.PI, -0.62 * Math.PI, -1.36 * Math.PI);
  const tEnd = evaluateArcAngleProgress(-1.36 * Math.PI, -0.62 * Math.PI, -1.36 * Math.PI);
  assert.ok(tStart !== null && tStart < 0.02);
  assert.ok(tMid !== null && tMid > 0.45 && tMid < 0.55);
  assert.ok(tEnd !== null && tEnd > 0.98);
});

test('walking underneath an elevated balcony or overhead bridge does not block the player', () => {
  const world = makeBaseWorld({
    boxes: [
      {
        id: 'overhead_bridge_beam',
        minX: -4,
        maxX: 4,
        minY: 3.8, // well above player head height (0 + 1.75m)!
        maxY: 4.4,
        minZ: -2,
        maxZ: 2,
        walkableTop: true,
      },
    ],
  });

  const pos = resolveHorizontal3D(0, 0, 0, 0.42, world.boxes);
  assert.equal(pos.x, 0, 'overhead beam must not push player horizontally when walking underneath');
  assert.equal(pos.z, 0);

  // Standing ON TOP of the bridge (feetY = 4.4) is supported cleanly!
  const topSupport = resolveSupportHeight3D(0, 0, 4.4, world);
  assert.equal(topSupport, 4.4);
});

test('closed Massive Bulkhead Door blocks passage; opening disables collider and permits crossing', () => {
  const doorBox = {
    id: 'bulkhead_door_08',
    minX: -3.0,
    maxX: 3.0,
    minY: 98.0,
    maxY: 103.5,
    minZ: -17.6,
    maxZ: -16.4,
    active: true,
    walkableTop: false,
  };
  const world = makeBaseWorld({
    boxes: [doorBox],
    slabs: [{ minX: -14, maxX: 14, minZ: -35, maxZ: 17, y: 98.0 }],
    bounds: { minX: -14, maxX: 14, minZ: -35, maxZ: 17 },
  });

  // Closed door blocks player attempting to enter z = -16.9
  const blocked = resolveHorizontal3D(0, -16.9, 98.0, 0.42, world.boxes);
  assert.ok(
    blocked.z > -16.2,
    `closed bulkhead door must repel player back out of doorway, got z=${blocked.z}`
  );

  // Open door (`active = false`): player passes straight through z = -17.0 unobstructed!
  doorBox.active = false;
  const openPos = resolveHorizontal3D(0, -17.0, 98.0, 0.42, world.boxes);
  assert.equal(openPos.z, -17.0, 'opened bulkhead door must permit unobstructed crossing');
});

test('Floor 08 multi-zone complex enforces solid stair/mezzanine handrails while keeping all wing portals & stair landings clear', () => {
  const mats = createHideoutMaterials(null);
  const f8 = buildFloor8Complex(mats);

  // 1. All 3 multi-wing OcclusionCells exist for strict AAA culling
  const cellIds = f8.occlusionCells.map((c) => c.id);
  assert.ok(cellIds.includes('f8_armory_wing'), 'expected East Armory OcclusionCell');
  assert.ok(cellIds.includes('f8_killhouse_wing'), 'expected West Killhouse OcclusionCell');
  assert.ok(cellIds.includes('f8_north_atrium'), 'expected North Security Atrium OcclusionCell');

  const world: CollisionWorld3D = {
    boxes: f8.boxes,
    slabs: f8.slabs,
    ramps: f8.ramps,
    arcRamps: f8.arcRamps,
    ringSlabs: f8.ringSlabs,
    bounds: f8.bounds ?? { minX: -40, maxX: 40, minZ: -38, maxZ: 54 },
    minSafeY: f8.meta.baseY - 9,
    fallbackSpawn: { x: f8.spawnPoint.x, y: f8.spawnPoint.y, z: f8.spawnPoint.z },
  };

  // 2. Unobstructed passage from Zone 1 Spawn (0, 45.5) straight North through 11m Blast Archway into Zone 4 Main Hall
  for (let z = 45.5; z >= 28.0; z -= 0.75) {
    const res = resolveHorizontal3D(0, z, 98.0, 0.38, world.boxes);
    assert.equal(res.collided, false, `unexpected blocker along central deployment path at z=${z}`);
  }

  // 3. West Killhouse Portal (x=-13, z=41) & East Armory Portal (x=+13, z=41) have smooth proximity sliding doors:
  // Closed initially -> open smoothly when approached!
  assert.equal(resolveHorizontal3D(-13.0, 41.0, 98.0, 0.38, world.boxes).collided, true);
  assert.equal(resolveHorizontal3D(13.0, 41.0, 98.0, 0.38, world.boxes).collided, true);
  for (let i = 0; i < 24; i++) {
    stepTacticalDoors(f8.tacticalDoors, 0.05, i * 0.05, -11.2, 98.0, 41.0);
  }
  assert.equal(
    resolveHorizontal3D(-13.0, 41.0, 98.0, 0.38, world.boxes).collided,
    false,
    'West Killhouse automatic door must clear collider once fully animated open'
  );
  for (let i = 0; i < 24; i++) {
    stepTacticalDoors(f8.tacticalDoors, 0.05, i * 0.05, 11.2, 98.0, 41.0);
  }
  assert.equal(
    resolveHorizontal3D(13.0, 41.0, 98.0, 0.38, world.boxes).collided,
    false,
    'East Armory automatic door must clear collider once fully animated open'
  );

  // 4. Climb West Grand Staircase (x=-11.2, z=18.4 -> 28.0) smoothly to Mezzanine (102.4m) with ZERO rail or stair_body snag!
  let curY = 98.0;
  for (let z = 18.4; z <= 28.0; z += 0.4) {
    const h = resolveSupportHeight3D(-11.2, z, curY, world);
    assert.ok(h !== null, `missing stair support at z=${z.toFixed(2)}`);
    assert.ok(h >= curY - 0.02, `expected monotonic ascent on West Grand Stair at z=${z.toFixed(2)}`);
    curY = h;
    const horiz = resolveHorizontal3D(-11.2, z, curY, 0.38, world.boxes);
    assert.equal(horiz.collided, false, `unexpected collision on stair centerline at z=${z.toFixed(2)}`);
  }
  assert.ok(Math.abs(curY - 102.4) < 0.05, `expected top of West Grand Stair to reach 102.4m, got ${curY}`);

  // 5. Walking from BEHIND the West Grand Staircase at ground level (y=98.0, z=27.0 -> 18.4) MUST BE BLOCKED!
  const behindLoco = createInitialLocomotionState(-11.2, 26.8, 98.0);
  for (let i = 0; i < 120; i++) {
    stepLocomotion(behindLoco, {
      dt: 1 / 60,
      moveForward: 1, // yaw=0 moves toward -Z (straight into the back/underside of the staircase!)
      moveRight: 0,
      cameraYaw: 0,
      sprintHeld: true,
      crouchHeld: false,
      adsHeld: false,
      jumpJustPressed: false,
      jumpHeld: false,
      rollJustPressed: false,
      colliders: [],
      bounds: world.bounds,
      world3D: world,
    });
  }
  assert.ok(
    behindLoco.z > 22.0,
    `player must NEVER phase through the back/underside of a staircase; stopped at z=${behindLoco.z.toFixed(2)}`
  );

  // 6. Attempting to walk SIDEWAYS through the staircase handrail at the TOP of the staircase MUST BE BLOCKED!
  const topRailHit = resolveHorizontal3D(-9.78, 26.2, 101.9, 0.38, world.boxes);
  assert.equal(topRailHit.collided, true, 'staircase top handrail must physically block sideways pass-through');

  // 7. Attempting to walk through South Overlook mezzanine guardrail (z=28.8 at y=102.4) MUST BE BLOCKED!
  const mezzRailHit = resolveHorizontal3D(0, 28.8, 102.4, 0.38, world.boxes);
  assert.equal(mezzRailHit.collided, true, 'mezzanine guardrail must block walking off balcony edge');

  // 8. Walking UNDERNEATH the South Overlook mezzanine guardrail at ground level (y=98.0) MUST BE UNOBSTRUCTED!
  const underMezz = resolveHorizontal3D(0, 28.8, 98.0, 0.38, world.boxes);
  assert.equal(underMezz.collided, false, 'elevated mezzanine rail must not block walking underneath on ground floor');

  f8.dispose();
  mats.dispose();
});

test('automatic proximity tactical doors animate smoothly (never instant) and close smoothly when departing', () => {
  const mats = createHideoutMaterials(null);
  const f8 = buildFloor8Complex(mats);
  const autoDoor = f8.tacticalDoors?.find((d) => d.id === 'f8_auto_atrium_west');
  assert.ok(autoDoor, 'expected f8_auto_atrium_west automatic door on Floor 08');
  assert.equal(autoDoor.openRatio, 0);
  assert.equal(autoDoor.collider.active, true);

  // Approach within triggerDistance: first 0.2s MUST be mid-animation (NOT instant open!)
  const openEvents = stepTacticalDoors(
    f8.tacticalDoors,
    0.2,
    0.2,
    autoDoor.position.x,
    autoDoor.position.y,
    autoDoor.position.z + 2.5
  );
  assert.ok(
    openEvents.some((e) => e.kind === 'slide_open' && e.doorId === autoDoor.id),
    'expected slide_open event on approach'
  );
  assert.ok(
    autoDoor.openRatio > 0.1 && autoDoor.openRatio < 0.5,
    `automatic door must open gradually, got openRatio=${autoDoor.openRatio.toFixed(3)}`
  );
  assert.equal(
    autoDoor.collider.active,
    true,
    'collider must stay active while leaves are only partway open'
  );

  // Continue stepping for another 0.8s -> reaches full openRatio = 1 and disables collider!
  for (let i = 0; i < 16; i++) {
    stepTacticalDoors(
      f8.tacticalDoors,
      0.05,
      0.2 + (i + 1) * 0.05,
      autoDoor.position.x,
      autoDoor.position.y,
      autoDoor.position.z + 2.5
    );
  }
  assert.equal(autoDoor.openRatio, 1);
  assert.equal(autoDoor.collider.active, false);

  // Walk far away -> emits slide_close and smoothly animates back to 0!
  const closeEvents = stepTacticalDoors(f8.tacticalDoors, 0.2, 2.0, 0, 98.0, 45.0);
  assert.ok(
    closeEvents.some((e) => e.kind === 'slide_close' && e.doorId === autoDoor.id),
    'expected slide_close event when leaving door'
  );
  assert.ok(autoDoor.openRatio > 0.5 && autoDoor.openRatio < 0.95);
  for (let i = 0; i < 20; i++) {
    stepTacticalDoors(f8.tacticalDoors, 0.05, 2.2 + i * 0.05, 0, 98.0, 45.0);
  }
  assert.equal(autoDoor.openRatio, 0);
  assert.equal(autoDoor.collider.active, true);

  f8.dispose();
  mats.dispose();
});

test('jammed half-open blast shutters block standing & crouching but allow smooth dodge-roll traversal cleanly underneath', () => {
  const mats = createHideoutMaterials(null);
  const f8 = buildFloor8Complex(mats);

  const world: CollisionWorld3D = {
    boxes: f8.boxes,
    slabs: f8.slabs,
    ramps: f8.ramps,
    arcRamps: f8.arcRamps,
    ringSlabs: f8.ringSlabs,
    bounds: f8.bounds ?? { minX: -40, maxX: 40, minZ: -38, maxZ: 54 },
    minSafeY: f8.meta.baseY - 9,
    fallbackSpawn: { x: f8.spawnPoint.x, y: f8.spawnPoint.y, z: f8.spawnPoint.z },
  };

  // Test BOTH Floor 08 jammed shutters:
  // 1. f8_jammed_atrium_east at (x=13.7, z=-1.0), walking/rolling North (-Z, cameraYaw = 0)
  // 2. f8_jammed_killhouse_breach at (x=-17.0, z=13.5), walking/rolling West (-X, cameraYaw = +PI/2)
  const cases = [
    {
      id: 'f8_jammed_atrium_east',
      startX: 13.7,
      startZ: 1.4,
      yaw: 0, // forward = -Z (from z=+1.4 through z=-1.0 to z<-1.8)
      passed: (x: number, z: number) => z < -1.8,
      blocked: (x: number, z: number) => z > -0.6,
    },
    {
      id: 'f8_jammed_killhouse_breach',
      startX: -14.6,
      startZ: 13.5,
      yaw: Math.PI * 0.5, // forward = -X (from x=-14.6 through x=-17.0 to x<-17.8)
      passed: (x: number, z: number) => x < -17.8,
      blocked: (x: number, z: number) => x > -16.6,
    },
  ];

  for (const c of cases) {
    const door = f8.tacticalDoors?.find((d) => d.id === c.id);
    assert.ok(door && door.mode === 'jammed_roll', `expected jammed_roll door ${c.id}`);

    // Approach door so shutter smoothly lifts and jams at 1.16m with a jam_clunk event!
    let sawJamClunk = false;
    for (let i = 0; i < 30; i++) {
      const evs = stepTacticalDoors(f8.tacticalDoors, 0.05, i * 0.05, c.startX, 98.0, c.startZ);
      if (evs.some((e) => e.kind === 'jam_clunk' && e.doorId === c.id)) sawJamClunk = true;
    }
    assert.equal(sawJamClunk, true, `expected jam_clunk event for ${c.id}`);
    assert.ok(
      door.collider.minY >= 98.0 + 1.1 && door.collider.minY <= 98.0 + 1.24,
      `expected jammed clearance ~1.16m above 98.0, got ${door.collider.minY}`
    );

    // 1. Standing sprint straight into the jammed shutter MUST BE BLOCKED!
    const standLoco = createInitialLocomotionState(c.startX, c.startZ, 98.0);
    for (let i = 0; i < 90; i++) {
      stepLocomotion(standLoco, {
        dt: 1 / 60,
        moveForward: 1,
        moveRight: 0,
        cameraYaw: c.yaw,
        sprintHeld: true,
        crouchHeld: false,
        adsHeld: false,
        jumpJustPressed: false,
        jumpHeld: false,
        rollJustPressed: false,
        colliders: [],
        bounds: world.bounds,
        world3D: world,
      });
    }
    assert.ok(
      c.blocked(standLoco.x, standLoco.z),
      `standing operative must be blocked by jammed shutter ${c.id}, got (${standLoco.x.toFixed(2)}, ${standLoco.z.toFixed(2)})`
    );

    // 2. Crouching walk into the jammed shutter MUST ALSO BE BLOCKED!
    const crouchLoco = createInitialLocomotionState(c.startX, c.startZ, 98.0);
    for (let i = 0; i < 90; i++) {
      stepLocomotion(crouchLoco, {
        dt: 1 / 60,
        moveForward: 1,
        moveRight: 0,
        cameraYaw: c.yaw,
        sprintHeld: false,
        crouchHeld: true,
        adsHeld: false,
        jumpJustPressed: false,
        jumpHeld: false,
        rollJustPressed: false,
        colliders: [],
        bounds: world.bounds,
        world3D: world,
      });
    }
    assert.ok(
      c.blocked(crouchLoco.x, crouchLoco.z),
      `crouching operative must be blocked by jammed shutter ${c.id}, got (${crouchLoco.x.toFixed(2)}, ${crouchLoco.z.toFixed(2)})`
    );

    // 3. Dodge-rolling right at the jammed shutter MUST GLIDE CLEANLY UNDERNEATH to the far side!
    const rollLoco = createInitialLocomotionState(standLoco.x, standLoco.z, 98.0);
    for (let i = 0; i < 65; i++) {
      stepLocomotion(rollLoco, {
        dt: 1 / 60,
        moveForward: 1,
        moveRight: 0,
        cameraYaw: c.yaw,
        sprintHeld: true,
        crouchHeld: false,
        adsHeld: false,
        jumpJustPressed: false,
        jumpHeld: false,
        rollJustPressed: i === 2,
        colliders: [],
        bounds: world.bounds,
        world3D: world,
      });
    }
    assert.ok(
      c.passed(rollLoco.x, rollLoco.z),
      `dodge-rolling operative must pass cleanly underneath jammed shutter ${c.id}, ended at (${rollLoco.x.toFixed(2)}, ${rollLoco.z.toFixed(2)})`
    );
    assert.equal(
      rollLoco.rollTimer,
      0,
      `operative should recover cleanly to standing on the far side of ${c.id}`
    );
  }

  f8.dispose();
  mats.dispose();
});

test('Floor 08 has zero floor holes in West entry room, zero pillars blocking any doorway, and solid backstop/desk colliders', () => {
  const mats = createHideoutMaterials(null);
  const f8 = buildFloor8Complex(mats);
  const world: CollisionWorld3D = {
    boxes: f8.boxes,
    slabs: f8.slabs,
    ramps: f8.ramps,
    arcRamps: f8.arcRamps,
    ringSlabs: f8.ringSlabs,
    bounds: f8.bounds ?? { minX: -40, maxX: 40, minZ: -38, maxZ: 54 },
    minSafeY: 85,
    fallbackSpawn: f8.spawnPoint,
  };

  // 1. West Entry Airlock (first room to the left of spawn): ZERO floor hole anywhere in [-23.4..-13.5] x [36.5..44.5]!
  for (let x = -23.4; x <= -13.5; x += 0.9) {
    for (let z = 36.5; z <= 44.5; z += 0.9) {
      const sup = resolveSupportHeight3D(x, z, 98.0, world);
      assert.equal(sup, 98.0, `Expected solid floor at West Entry Airlock (${x.toFixed(1)}, ${z.toFixed(1)}), got ${sup}`);
    }
  }
  // Trying to walk North from (-15.0, 38.0) toward the old [-17..-13] x [33..36] cavity MUST be blocked by solid wall at z=36!
  const holeTest = createInitialLocomotionState(-15.0, 38.0, 98.0);
  for (let i = 0; i < 60; i++) {
    stepLocomotion(holeTest, {
      dt: 1 / 60,
      moveForward: 1,
      moveRight: 0,
      cameraYaw: 0,
      sprintHeld: true,
      crouchHeld: false,
      adsHeld: false,
      jumpJustPressed: false,
      jumpHeld: false,
      rollJustPressed: false,
      colliders: [],
      bounds: world.bounds,
      world3D: world,
    });
  }
  assert.ok(holeTest.z >= 36.4, `West airlock north wall must block cavity access, got z=${holeTest.z.toFixed(2)}`);
  assert.equal(holeTest.grounded, true, 'Operative must remain grounded in West entry airlock');

  // 2. ZERO pillars obstructing ANY doorway centerline (ground & upper mezz portals)!
  // Open automatic doors first so we test pure architectural clearance across every portal
  for (const td of f8.tacticalDoors ?? []) {
    if (td.mode === 'automatic') td.collider.active = false;
  }
  const doorwayCheckpoints = [
    { name: 'East Armory Flank (ground)', x: 17.0, y: 98.0, z: 23.5 },
    { name: 'West Upper Killhouse Bridge', x: -17.0, y: 102.4, z: 22.2 },
    { name: 'East Upper Armory Balcony', x: 17.0, y: 102.4, z: 29.1 },
    { name: 'Upper North Overlook Bridge', x: 0.0, y: 102.4, z: -1.0 },
    { name: 'Briefing -> West Airlock', x: -13.0, y: 98.0, z: 41.0 },
    { name: 'Briefing -> East Armory', x: 13.0, y: 98.0, z: 41.0 },
  ];
  for (const dp of doorwayCheckpoints) {
    const res = resolveHorizontal3D(dp.x, dp.z, dp.y, 0.36, f8.boxes);
    assert.equal(
      res.collided,
      false,
      `Doorway "${dp.name}" at (${dp.x}, ${dp.y}, ${dp.z}) must have zero pillar/wall obstruction`
    );
  }

  // 3. Solid Louvered Bullet-Trap Backstop rack right beside f8_jammed_atrium_east (cannot phase through!)
  const trapWalk = createInitialLocomotionState(9.0, 2.2, 98.0);
  for (let i = 0; i < 60; i++) {
    stepLocomotion(trapWalk, {
      dt: 1 / 60,
      moveForward: 1,
      moveRight: 0,
      cameraYaw: 0,
      sprintHeld: true,
      crouchHeld: false,
      adsHeld: false,
      jumpJustPressed: false,
      jumpHeld: false,
      rollJustPressed: false,
      colliders: [],
      bounds: world.bounds,
      world3D: world,
    });
  }
  assert.ok(
    trapWalk.z >= 0.75,
    `Louvered bullet-trap rack beside jammed shutter must block operative, got z=${trapWalk.z.toFixed(2)}`
  );

  // 4. Solid collider on the South Monolith shelf under "08 APEX PROVING COMPLEX" behind spawn (cannot walk into shelves!)
  const monolithWalk = createInitialLocomotionState(0, 46.5, 98.0);
  for (let i = 0; i < 90; i++) {
    stepLocomotion(monolithWalk, {
      dt: 1 / 60,
      moveForward: 1,
      moveRight: 0,
      cameraYaw: Math.PI, // forward = +Z (straight into the monolith shelf behind spawn!)
      sprintHeld: true,
      crouchHeld: false,
      adsHeld: false,
      jumpJustPressed: false,
      jumpHeld: false,
      rollJustPressed: false,
      colliders: [],
      bounds: world.bounds,
      world3D: world,
    });
  }
  assert.ok(
    monolithWalk.z <= 48.72,
    `South Monolith shelf under "08 APEX PROVING COMPLEX" must block operative cleanly before shelves, got z=${monolithWalk.z.toFixed(2)}`
  );

  // Flanking South locker bays & North locker bays must also physically block walking into shelves
  for (const [lx, lz, yaw, check, label] of [
    [-6.2, 47.2, Math.PI, (x: number, z: number) => z <= 48.8, 'South-West locker bay'],
    [6.2, 47.2, Math.PI, (x: number, z: number) => z <= 48.8, 'South-East locker bay'],
    [-9.5, 35.8, 0, (x: number, z: number) => z >= 34.2, 'North-West locker bay'],
    [9.5, 35.8, 0, (x: number, z: number) => z >= 34.2, 'North-East locker bay'],
  ] as const) {
    const lockerWalk = createInitialLocomotionState(lx, lz, 98.0);
    for (let i = 0; i < 60; i++) {
      stepLocomotion(lockerWalk, {
        dt: 1 / 60,
        moveForward: 1,
        moveRight: 0,
        cameraYaw: yaw,
        sprintHeld: true,
        crouchHeld: false,
        adsHeld: false,
        jumpJustPressed: false,
        jumpHeld: false,
        rollJustPressed: false,
        colliders: [],
        bounds: world.bounds,
        world3D: world,
      });
    }
    assert.ok(
      check(lockerWalk.x, lockerWalk.z),
      `${label} must block operative cleanly in front of shelves, got (${lockerWalk.x.toFixed(2)}, ${lockerWalk.z.toFixed(2)})`
    );
  }

  // 5. Killhouse grounded catwalk columns have solid colliders while CQB breach doorways remain completely clear!
  for (const [cx, cz] of [
    [-32.42, 6.22],
    [-32.42, 20.22],
    [-17.56, 20.22],
    [-31.0, 26.8],
    [-23.0, 20.0],
  ] as const) {
    assert.equal(
      resolveHorizontal3D(cx, cz, 98.0, 0.36, f8.boxes).collided,
      true,
      `Grounded Killhouse column/post at (${cx}, ${cz}) must have solid collision`
    );
  }
  for (const [bx, bz] of [
    [-27.1, 26.8], // ALPHA breach doorway
    [-20.3, 26.8], // BRAVO breach doorway
    [-23.0, 8.8], // East shoothouse breach doorway
    [-26.9, 5.5], // North choke breach doorway
  ] as const) {
    assert.equal(
      resolveHorizontal3D(bx, bz, 98.0, 0.36, f8.boxes).collided,
      false,
      `Killhouse breach lane at (${bx}, ${bz}) must have zero pillar obstruction`
    );
  }

  f8.dispose();
  mats.dispose();
});

test('Floor 07 Spiral Well Combat Nexus: monotonic spiral stairs, genuine open abyss, solid rails, solid monoliths/turbines, and clear portals', () => {
  const mats = createHideoutMaterials(null);
  const f7 = buildFloor7Complex(mats);

  // 1. All 4 multi-wing OcclusionCells exist for strict AAA culling
  const cellIds = f7.occlusionCells.map((c) => c.id);
  assert.ok(cellIds.includes('floor7_zone3_west_barracks'));
  assert.ok(cellIds.includes('floor7_zone4_east_servers'));
  assert.ok(cellIds.includes('floor7_zone5_sw_cargo'));
  assert.ok(cellIds.includes('floor7_zone6_se_turbines'));

  const world: CollisionWorld3D = {
    boxes: f7.boxes,
    slabs: f7.slabs,
    ramps: f7.ramps,
    arcRamps: f7.arcRamps,
    ringSlabs: f7.ringSlabs,
    bounds: f7.bounds!,
    minSafeY: F7_BASE_Y - 10,
    fallbackSpawn: f7.spawnPoint,
  };

  // 2. Genuine open central abyss (`r < 4.7m`): NO floor support at (0, 0) on ground OR upper level while skybridge is retracted!
  assert.equal(resolveSupportHeight3D(0, 0, F7_BASE_Y + 0.1, world), null);
  assert.equal(resolveSupportHeight3D(0, 0, F7_UPPER_Y + 0.1, world), null);

  // 3. Monotonic Spiral Staircase ascent along North arc (-0.92π -> -0.08π, r = 6.5m) from 84.0 -> 88.4m!
  let curY = F7_BASE_Y;
  for (let i = 0; i <= 16; i++) {
    const frac = i / 16;
    const angle = -Math.PI * 0.92 + frac * Math.PI * 0.84;
    const sx = Math.cos(angle) * 6.5;
    const sz = Math.sin(angle) * 6.5;
    const h = resolveSupportHeight3D(sx, sz, curY, world);
    assert.ok(h !== null, `expected spiral stair support at frac=${frac.toFixed(2)}`);
    assert.ok(h >= curY - 0.02, `expected monotonic spiral ascent at frac=${frac.toFixed(2)}: ${h} vs ${curY}`);
    curY = h;
    const horiz = resolveHorizontal3D(sx, sz, curY, 0.36, world.boxes);
    assert.equal(horiz.collided, false, `spiral stair centerline must not snag at frac=${frac.toFixed(2)}`);
  }
  assert.ok(Math.abs(curY - F7_UPPER_Y) < 0.08, `expected spiral stair top at ${F7_UPPER_Y}, got ${curY}`);

  // 4. Both inner AND outer spiral handrails physically block sideways pass-through!
  const midAngle = -Math.PI * 0.5;
  const midY = (F7_BASE_Y + F7_UPPER_Y) * 0.5;
  assert.equal(
    resolveHorizontal3D(Math.cos(midAngle) * 4.65, Math.sin(midAngle) * 4.65, midY, 0.36, world.boxes).collided,
    true,
    'spiral inner handrail must block walking into abyss'
  );
  assert.equal(
    resolveHorizontal3D(Math.cos(midAngle) * 8.38, Math.sin(midAngle) * 8.38, midY, 0.36, world.boxes).collided,
    true,
    'spiral outer handrail must block walking off outer edge'
  );

  // 5. Server Monoliths (Zone 4) & Coolant Turbines (Zone 6) have 100% solid collision!
  for (const [mx, mz, label] of [
    [25.2, -5.8, 'Server Monolith NW'],
    [32.4, 2.8, 'Server Monolith SE'],
    [21.6, 24.4, 'Coolant Turbine W'],
    [28.4, 24.4, 'Coolant Turbine Mid'],
    [34.4, 24.4, 'Coolant Turbine E'],
  ] as const) {
    assert.equal(
      resolveHorizontal3D(mx, mz, F7_BASE_Y, 0.36, world.boxes).collided,
      true,
      `${label} at (${mx}, ${mz}) must be solid`
    );
  }

  // 6. Open all automatic doors -> zero doorway obstructions across all 7 zones!
  for (const td of f7.tacticalDoors ?? []) {
    if (td.mode === 'automatic') td.collider.active = false;
  }
  for (const [dx, dy, dz, label] of [
    [-16.0, F7_BASE_Y, -12.3, 'NW Barracks Portal'],
    [16.0, F7_BASE_Y, -12.3, 'NE Server Portal'],
    [16.0, F7_BASE_Y, 0.0, 'East Center Server Portal'],
    [-16.0, F7_BASE_Y, 13.0, 'SW Cargo Portal'],
    [16.0, F7_BASE_Y, 13.0, 'SE Turbine Portal'],
    [-16.0, F7_UPPER_Y, 0.0, 'West Upper Sky-Portal'],
    [16.0, F7_UPPER_Y, 0.0, 'East Upper Sky-Portal'],
    [-16.0, F7_UPPER_Y, 13.2, 'SW Upper Sky-Portal'],
    [16.0, F7_UPPER_Y, 13.2, 'SE Upper Sky-Portal'],
  ] as const) {
    assert.equal(
      resolveHorizontal3D(dx, dz, dy, 0.36, world.boxes).collided,
      false,
      `Floor 07 portal "${label}" must be clear`
    );
  }

  f7.dispose();
  mats.dispose();
});

test('Floor 07 interactive mechanics: shootable locks deploy retractable skybridge & unlock vault gates, jump pads launch, jammed shutters allow dodge-roll', () => {
  const hideout = createEightFloorHideout(null, null, true);
  hideout.teleportToFloor(7);
  const f7 = hideout.floors[7];
  const world = hideout.activeCollisionWorld;

  // 1. Retractable Cross-Chasm Skybridge starts retracted -> center of abyss (0, 0) at upperY is open void!
  assert.equal(resolveSupportHeight3D(0, 0, F7_UPPER_Y + 0.1, world), null);

  // Shoot Overhead Bridge Relay Lock -> deploys Retractable Cross-Chasm Skybridge!
  const bridgeLockRes = hideout.triggerShootableLock(F7_IDS.lockRotundaBridge);
  assert.ok(bridgeLockRes && bridgeLockRes.deployedBridge, 'shooting overhead bridge relay must deploy core skybridge');
  const pPos = new THREE.Vector3(0, F7_BASE_Y, -12);
  const cPos = new THREE.Vector3(0, F7_BASE_Y + 2, -14);
  let sawBridgeDeployed = false;
  for (let i = 0; i < 40; i++) {
    const evs = hideout.update(0.05, i * 0.05, pPos, cPos);
    if (evs.some((e) => e.kind === 'bridge_deployed' && e.mechanicId === F7_IDS.bridgeRotundaCore)) {
      sawBridgeDeployed = true;
    }
  }
  assert.equal(sawBridgeDeployed, true, 'expected bridge_deployed event once skybridge finishes telescoping');
  assert.equal(
    resolveSupportHeight3D(0, 0, F7_UPPER_Y + 0.1, world),
    F7_UPPER_Y,
    'deployed cross-chasm skybridge must cleanly support walking across the abyss center'
  );

  // 2. Locked Black-Ops Munitions Vault Gate starts sealed -> shooting window relay unlocks it!
  assert.equal(
    resolveHorizontal3D(-33.0, -17.8, F7_BASE_Y, 0.36, world.boxes).collided,
    true,
    'West Munitions Vault gate must start locked'
  );
  const vaultRes = hideout.triggerShootableLock(F7_IDS.lockWestVault);
  assert.ok(vaultRes && vaultRes.unlockedGate, 'shooting vault window relay must unlock vault gate');
  for (let i = 0; i < 30; i++) {
    hideout.update(0.05, 2.0 + i * 0.05, pPos, cPos);
  }
  assert.equal(
    resolveHorizontal3D(-33.0, -17.8, F7_BASE_Y, 0.36, world.boxes).collided,
    false,
    'unlocked West Munitions Vault gate must permit unobstructed entry'
  );

  // 3. World Switch in Zone 6 Turbine Gallery deploys the Turbine Catwalk Skybridge!
  // Before deployment, stepping off at upperY drops to the Zone 6 ground floor (F7_BASE_Y); after deployment it supports at F7_UPPER_Y.
  assert.equal(resolveSupportHeight3D(27.8, 13.2, F7_UPPER_Y + 0.1, world), F7_BASE_Y);
  const swRes = hideout.activateWorldSwitch(F7_IDS.switchTurbineBridge);
  assert.ok(swRes && swRes.deployedBridge, 'activating turbine switch must deploy turbine skybridge');
  for (let i = 0; i < 40; i++) {
    hideout.update(0.05, 4.0 + i * 0.05, pPos, cPos);
  }
  assert.equal(
    resolveSupportHeight3D(27.8, 13.2, F7_UPPER_Y + 0.1, world),
    F7_UPPER_Y,
    'deployed turbine skybridge must cleanly span the turbine catwalk trench'
  );

  // 4. Pneumatic Jump Pad launches operative upward & enforces cooldown!
  const padEvents = stepWorldMechanics(
    f7.retractableBridges,
    f7.securityGates,
    f7.shootableLocks,
    f7.jumpPads,
    0.016,
    5.0,
    12.2,
    F7_BASE_Y,
    -7.6
  );
  const launch = padEvents.find((e) => e.kind === 'jump_pad_launch' && e.id === F7_IDS.padRotundaEast);
  assert.ok(launch && (launch.launchVy ?? 0) >= 12.5, 'stepping on Rotunda East jump pad must fire launch impulse');
  // Immediate next frame must NOT double-trigger due to cooldown!
  const padEvents2 = stepWorldMechanics(
    f7.retractableBridges,
    f7.securityGates,
    f7.shootableLocks,
    f7.jumpPads,
    0.016,
    5.016,
    12.2,
    F7_BASE_Y,
    -7.6
  );
  assert.equal(padEvents2.some((e) => e.kind === 'jump_pad_launch'), false, 'jump pad cooldown must prevent double-fire');

  // 5. Floor 07 Jammed Roll-Under Blast Shutter (`f7_jammed_west_flank`) blocks standing & allows dodge-roll underneath!
  for (let i = 0; i < 30; i++) {
    stepTacticalDoors(f7.tacticalDoors, 0.05, i * 0.05, -13.6, F7_BASE_Y, 0);
  }
  const standLoco = createInitialLocomotionState(-13.6, 0, F7_BASE_Y);
  for (let i = 0; i < 80; i++) {
    stepLocomotion(standLoco, {
      dt: 1 / 60,
      moveForward: 1,
      moveRight: 0,
      cameraYaw: Math.PI * 0.5, // forward = -X toward x = -16.0
      sprintHeld: true,
      crouchHeld: false,
      adsHeld: false,
      jumpJustPressed: false,
      jumpHeld: false,
      rollJustPressed: false,
      colliders: [],
      bounds: world.bounds,
      world3D: world,
    });
  }
  assert.ok(standLoco.x > -15.6, `standing operative must be blocked by Floor 07 jammed shutter, got x=${standLoco.x}`);

  const rollLoco = createInitialLocomotionState(standLoco.x, 0, F7_BASE_Y);
  for (let i = 0; i < 65; i++) {
    stepLocomotion(rollLoco, {
      dt: 1 / 60,
      moveForward: 1,
      moveRight: 0,
      cameraYaw: Math.PI * 0.5,
      sprintHeld: true,
      crouchHeld: false,
      adsHeld: false,
      jumpJustPressed: false,
      jumpHeld: false,
      rollJustPressed: i === 2,
      colliders: [],
      bounds: world.bounds,
      world3D: world,
    });
  }
  assert.ok(rollLoco.x < -16.8, `dodge-roll must glide cleanly under Floor 07 jammed shutter, ended at x=${rollLoco.x}`);

  hideout.dispose();
});

test('Floor 07 regression suite: all 4 jump pads launch cleanly onto +4.4m decks, wall-side stairs sit flush, spiral underside is transparent yet solid, locked vault hints & opens, barrels chain-detonate & spinners rotate', () => {
  const hideout = createEightFloorHideout(null, null, true);
  hideout.teleportToFloor(7);
  const f7 = hideout.floors[7];
  const world = hideout.activeCollisionWorld;

  // 1. ALL 4 Floor 07 Pneumatic Jump Pads launch cleanly onto +4.4m elevated decks with ZERO WASD input!
  const padCases = [
    { id: F7_IDS.padRotundaEast, label: 'Rotunda East -> East Upper Balcony' },
    { id: F7_IDS.padRotundaWest, label: 'Rotunda West -> West Upper Balcony' },
    { id: F7_IDS.padEastServers, label: 'East Servers -> North Data Balcony' },
    { id: F7_IDS.padCargoGantry, label: 'SW Cargo -> West Cargo Gantry' },
  ];
  for (const pc of padCases) {
    const pad = f7.jumpPads?.find((p) => p.id === pc.id);
    assert.ok(pad, `expected jump pad ${pc.id}`);
    pad.cooldown = 0;

    const evs = stepWorldMechanics(
      f7.retractableBridges,
      f7.securityGates,
      f7.shootableLocks,
      f7.jumpPads,
      0.016,
      1.0,
      pad.x,
      pad.y,
      pad.z
    );
    const launch = evs.find((e) => e.kind === 'jump_pad_launch' && e.id === pc.id);
    assert.ok(launch, `expected launch event for ${pc.label}`);

    const loco = createInitialLocomotionState(pad.x, pad.z, pad.y);
    loco.vy = launch.launchVy ?? 13.4;
    loco.vx = launch.launchVx ?? 0;
    loco.vz = launch.launchVz ?? 0;
    loco.launchPadTimer = 1.25;
    loco.jumpHoldTimer = 0;
    loco.airTime = 0;
    loco.grounded = false;

    let maxY = loco.y;
    for (let step = 0; step < 140; step++) {
      stepLocomotion(loco, {
        dt: 1 / 60,
        moveForward: 0,
        moveRight: 0,
        cameraYaw: 0,
        sprintHeld: false,
        crouchHeld: false,
        adsHeld: false,
        jumpJustPressed: false,
        jumpHeld: false,
        rollJustPressed: false,
        colliders: [],
        bounds: world.bounds,
        world3D: world,
      });
      if (loco.y > maxY) maxY = loco.y;
    }

    assert.ok(
      maxY > F7_UPPER_Y + 1.0,
      `${pc.label} must peak > ${(F7_UPPER_Y + 1.0).toFixed(2)}m, peaked at ${maxY.toFixed(2)}m`
    );
    assert.equal(loco.grounded, true, `${pc.label} must land grounded on elevated deck`);
    assert.ok(
      Math.abs(loco.y - F7_UPPER_Y) < 0.06,
      `${pc.label} must land cleanly on upperY=${F7_UPPER_Y}, landed at y=${loco.y.toFixed(2)} (x=${loco.x.toFixed(2)}, z=${loco.z.toFixed(2)})`
    );
  }

  // 2. Floor 07 East-wall staircases (Zone 4 & Zone 6) sit flush against the East Wall (`x = 41.70`, zero drop gap!)
  const z4Stair = f7.ramps.find((r) => r.minZ < -12 && r.maxZ > -6 && r.minX > 36);
  const z6Stair = f7.ramps.find((r) => r.minZ > 15 && r.maxZ < 26 && r.minX > 36);
  assert.ok(z4Stair, 'expected Zone 4 East Server stair ramp');
  assert.ok(z6Stair, 'expected Zone 6 SE Turbine stair ramp');
  assert.ok(
    z4Stair.maxX >= 41.6,
    `Zone 4 East Server stair must sit flush against East Wall (41.70), got maxX=${z4Stair.maxX}`
  );
  assert.ok(
    z6Stair.maxX >= 41.6,
    `Zone 6 SE Turbine stair must sit flush against East Wall (41.70), got maxX=${z6Stair.maxX}`
  );

  // 3. Curved Spiral Stair has NO opaque floating underside soffit mesh, yet solid `stair_body` colliders still block walking under!
  let foundSoffitMesh = false;
  f7.group.traverse((obj) => {
    if (obj.name === 'SpiralStairSoffit') foundSoffitMesh = true;
  });
  assert.equal(foundSoffitMesh, false, 'SpiralStairSoffit opaque grey pad must be removed');
  const spiralBodyBoxes = f7.boxes.filter((b) => b.tag === 'stair_body' && b.minZ < -3 && Math.abs(b.minX) < 10);
  assert.ok(spiralBodyBoxes.length >= 20, 'spiral stair must retain solid stair_body underside colliders');
  // Mid-spiral at angle = -0.78π (stepTopY ≈ 84.73m -> collider spans 84.11..84.57m -> blocks ground-level operative!)
  const lowSpiralAngle = -Math.PI * 0.78;
  const underSpiralHit = resolveHorizontal3D(
    Math.cos(lowSpiralAngle) * 6.5,
    Math.sin(lowSpiralAngle) * 6.5,
    F7_BASE_Y,
    0.38,
    world.boxes
  );
  assert.equal(
    underSpiralHit.collided,
    true,
    'solid stair_body colliders must still block walking underneath/behind the spiral staircase'
  );

  // 4. Locked Munitions Vault proximity hint -> shoot relay -> walk smoothly INSIDE vault (`x = -37.0, z = -17.8`)!
  const lockedHint = hideout.getNearbyInteraction(-31.2, F7_BASE_Y, -17.8);
  assert.ok(
    lockedHint && lockedHint.kind === 'hint' && lockedHint.isLockedGate === true,
    'standing near sealed Munitions Vault gate must return a locked-gate HUD hint'
  );
  assert.ok(
    lockedHint.prompt.includes('SHOOT'),
    `locked gate hint must instruct player to shoot the relay, got: "${lockedHint.prompt}"`
  );

  const unlockRes = hideout.triggerShootableLock(F7_IDS.lockWestVault);
  assert.ok(unlockRes && unlockRes.unlockedGate);
  const pPos = new THREE.Vector3(-31.2, F7_BASE_Y, -17.8);
  const cPos = new THREE.Vector3(-30.0, F7_BASE_Y + 1.8, -17.8);
  for (let i = 0; i < 30; i++) {
    hideout.update(0.05, i * 0.05, pPos, cPos);
  }
  const afterUnlockHint = hideout.getNearbyInteraction(-31.2, F7_BASE_Y, -17.8);
  assert.equal(afterUnlockHint, null, 'locked gate hint must clear once Munitions Vault is unlocked');

  // Walk smoothly straight West through the open vault doorway into the interior!
  const vaultWalk = createInitialLocomotionState(-31.2, -17.8, F7_BASE_Y);
  for (let i = 0; i < 90; i++) {
    stepLocomotion(vaultWalk, {
      dt: 1 / 60,
      moveForward: 1,
      moveRight: 0,
      cameraYaw: Math.PI * 0.5, // forward = -X into vault
      sprintHeld: true,
      crouchHeld: false,
      adsHeld: false,
      jumpJustPressed: false,
      jumpHeld: false,
      rollJustPressed: false,
      colliders: [],
      bounds: world.bounds,
      world3D: world,
    });
  }
  assert.ok(
    vaultWalk.x < -36.0,
    `operative must walk cleanly inside unlocked Munitions Vault, ended at x=${vaultWalk.x.toFixed(2)}`
  );

  // 5. Pressurized Explosive Plasma Barrels: chain-reaction detonation, collider removal, 14s auto-respawn!
  const b1 = hideout.activeExplosiveBarrels.find((b) => b.id === 'f7_barrel_rotunda_e1');
  const b2 = hideout.activeExplosiveBarrels.find((b) => b.id === 'f7_barrel_rotunda_e2');
  assert.ok(b1 && b2, 'expected Rotunda East chain-reaction barrel pair');
  assert.equal(b1.collider.active, true);
  assert.equal(b2.collider.active, true);

  const blown = hideout.triggerExplosiveBarrel('f7_barrel_rotunda_e1');
  assert.equal(blown.length, 2, 'detonating f7_barrel_rotunda_e1 must chain-detonate adjacent f7_barrel_rotunda_e2');
  assert.equal(b1.detonated, true);
  assert.equal(b2.detonated, true);
  assert.equal(b1.collider.active, false, 'detonated barrel collider must disable');
  assert.equal(b2.collider.active, false, 'chain-detonated barrel collider must disable');

  // Step 15 seconds -> barrels cleanly auto-respawn and re-enable colliders!
  const spinner0 = f7.animatedSpinners?.[0];
  assert.ok(spinner0, 'expected kinetic animatedSpinners on Floor 07 (Telemetry Core & Coolant Turbines)');
  const initRotY = spinner0.obj.rotation.y;
  for (let i = 0; i < 300; i++) {
    hideout.update(0.05, 2.0 + i * 0.05, pPos, cPos);
  }
  assert.equal(b1.detonated, false, 'explosive barrel must auto-respawn after 14s');
  assert.equal(b1.collider.active, true, 'respawned explosive barrel must re-enable solid collider');
  assert.ok(
    Math.abs(spinner0.obj.rotation.y - initRotY) > 1.0,
    'kinetic animatedSpinners must rotate continuously during hideout.update()'
  );

  hideout.dispose();
});

test('Floor 08 regression suite: wall-side staircases sit flush, Heavy Ordnance Vault is walkable, explosive barrels chain-detonate & respawn, and Doppler scanners rotate', () => {
  const hideout = createEightFloorHideout(null, null, true);
  const f8 = hideout.floors[8];
  const world = hideout.activeCollisionWorld;

  // 1. Both wall-side staircases on Floor 08 sit flush against their perimeter walls (zero wall gap!)
  const armoryEastStair = f8.ramps.find((r) => r.minX > 24 && r.minZ >= 16 && r.maxZ <= 27);
  const killhouseWestStair = f8.ramps.find((r) => r.maxX < -31 && r.minZ >= 23 && r.maxZ <= 34);
  assert.ok(armoryEastStair, 'expected Zone 2 Armory East wall stair ramp');
  assert.ok(killhouseWestStair, 'expected Zone 3 Killhouse West wall stair ramp');
  assert.ok(
    armoryEastStair.maxX >= 27.6,
    `Armory East stair must sit flush against East Wall (27.70), got maxX=${armoryEastStair.maxX}`
  );
  assert.ok(
    killhouseWestStair.minX <= -35.6,
    `Killhouse West stair must sit flush against West Wall (-35.70), got minX=${killhouseWestStair.minX}`
  );

  // 2. Floor 08 Pressurized Explosive Plasma Barrels: 8 total, chain-detonation, collider removal & 14s respawn
  assert.equal(
    hideout.activeExplosiveBarrels.length,
    8,
    `expected 8 explosive plasma barrels on Floor 08, got ${hideout.activeExplosiveBarrels.length}`
  );
  const bW1 = hideout.activeExplosiveBarrels.find((b) => b.id === 'f8_barrel_range_w1');
  const bW2 = hideout.activeExplosiveBarrels.find((b) => b.id === 'f8_barrel_range_w2');
  assert.ok(bW1 && bW2, 'expected Firing Hall West downrange chain-reaction barrel pair');
  assert.equal(bW1.collider.active, true);
  assert.equal(bW2.collider.active, true);

  const blown = hideout.triggerExplosiveBarrel('f8_barrel_range_w1');
  assert.equal(blown.length, 2, 'detonating f8_barrel_range_w1 must chain-detonate f8_barrel_range_w2');
  assert.equal(bW1.detonated, true);
  assert.equal(bW2.detonated, true);
  assert.equal(bW1.collider.active, false);
  assert.equal(bW2.collider.active, false);

  // 3. Overhead Doppler telemetry scanners rotate continuously & barrels respawn cleanly after 14s
  const spinner0 = f8.animatedSpinners?.[0];
  assert.ok(spinner0, 'expected overhead Doppler telemetry spinners on Floor 08');
  const initRotY = spinner0.obj.rotation.y;
  const pPos = new THREE.Vector3(0, 98.0, 28.0);
  const cPos = new THREE.Vector3(0, 100.0, 30.0);
  for (let i = 0; i < 300; i++) {
    hideout.update(0.05, i * 0.05, pPos, cPos);
  }
  assert.equal(bW1.detonated, false, 'Floor 08 explosive barrel must auto-respawn after 14s');
  assert.equal(bW1.collider.active, true, 'respawned Floor 08 barrel must re-enable collider');
  assert.ok(
    Math.abs(spinner0.obj.rotation.y - initRotY) > 1.0,
    'Floor 08 Doppler telemetry scanners must rotate continuously'
  );

  // 4. Heavy Ordnance Vault interior walkability check (entry from Armory Staging Hall x=26 -> x=32)
  const vaultLoco = createInitialLocomotionState(26.0, 40.0, 98.0);
  for (let i = 0; i < 90; i++) {
    stepLocomotion(vaultLoco, {
      dt: 1 / 60,
      moveForward: 1,
      moveRight: 0,
      cameraYaw: -Math.PI * 0.5, // forward = +X into Heavy Ordnance Vault
      sprintHeld: true,
      crouchHeld: false,
      adsHeld: false,
      jumpJustPressed: false,
      jumpHeld: false,
      rollJustPressed: false,
      colliders: [],
      bounds: world.bounds,
      world3D: world,
    });
  }
  assert.ok(
    vaultLoco.x > 31.0 && vaultLoco.grounded,
    `operative must walk cleanly inside Heavy Ordnance Vault, ended at x=${vaultLoco.x.toFixed(2)}`
  );

  hideout.dispose();
});

test('Floor 06 Obsidian Monolith Archive: all 5 OcclusionCells, 4 calibrated jump pads, 5 flush wall-side stairs, sunken trench, 2 retractable skybridges, 2 locked gates, 2 jammed roll shutters, explosive barrels & kinetic spinners', () => {
  const hideout = createEightFloorHideout(null, null, true);
  hideout.teleportToFloor(6);
  const f6 = hideout.floors[6];
  const world = hideout.activeCollisionWorld;

  // 1. All 5 outer-wing OcclusionCells exist for strict AAA culling
  const cellIds = f6.occlusionCells.map((c) => c.id);
  for (const expectedId of [
    'f6_west_labs',
    'f6_east_foundry',
    'f6_sw_bunker',
    'f6_ne_grav_core',
    'f6_nw_cryo_vault',
  ]) {
    assert.ok(cellIds.includes(expectedId), `expected Floor 06 OcclusionCell ${expectedId}`);
  }

  // 2. Sunken Cooling Trench (`y = 67.6m`) support + Twin Cross-Bridges (`y = 70.0m`) + Monotonic West Grand Stair (`70.0 -> 74.4m`)!
  assert.equal(resolveSupportHeight3D(0, -5.6, F6_TRENCH_Y + 0.2, world), F6_TRENCH_Y);
  assert.equal(resolveSupportHeight3D(-4.6, 0, F6_BASE_Y + 0.1, world), F6_BASE_Y);
  assert.equal(resolveSupportHeight3D(4.6, 0, F6_BASE_Y + 0.1, world), F6_BASE_Y);

  // Monotonic ascent up West Grand Stair (`x = -12.35`, `z = 0.6 -> 9.4`, `y = 70.0 -> 74.4`)
  let stairY = F6_BASE_Y;
  for (let i = 0; i <= 16; i++) {
    const z = 0.6 + (i / 16) * 8.8;
    const h = resolveSupportHeight3D(-12.35, z, stairY, world);
    assert.ok(h !== null, `expected West Grand Stair support at z=${z.toFixed(2)}`);
    assert.ok(h >= stairY - 0.02, `expected monotonic ascent at z=${z.toFixed(2)}: ${h} vs ${stairY}`);
    stairY = h;
  }
  assert.ok(Math.abs(stairY - F6_UPPER_Y) < 0.08, `expected West Grand Stair top ${F6_UPPER_Y}, got ${stairY}`);

  // 3. ALL 5 wall-side staircases sit flush against their adjacent walls (ZERO wall gap!)
  const westTrenchStair = f6.ramps.find((r) => r.minX < -10.5 && r.maxX < -8.0 && r.minZ > 3.5 && r.maxZ < 10.0);
  const eastTrenchStair = f6.ramps.find((r) => r.maxX > 10.5 && r.minX > 8.0 && r.minZ < -3.5 && r.maxZ > -10.0);
  const westLabsStair = f6.ramps.find((r) => r.minX < -43.0 && r.minZ >= 4.0 && r.maxZ <= 14.0);
  const eastFoundryStair = f6.ramps.find((r) => r.maxX > 43.0 && r.minZ >= 6.0 && r.maxZ <= 16.0);
  const nwCryoStair = f6.ramps.find((r) => r.maxX > -19.0 && r.minX < -20.5 && r.minZ <= -24.0 && r.maxZ >= -16.0);
  assert.ok(westTrenchStair && westTrenchStair.minX <= -11.1, 'West Trench stair must sit flush against -11.20 wall');
  assert.ok(eastTrenchStair && eastTrenchStair.maxX >= 11.1, 'East Trench stair must sit flush against +11.20 wall');
  assert.ok(westLabsStair && westLabsStair.minX <= -43.6, 'Zone 3 West Labs stair must sit flush against -43.70 wall');
  assert.ok(eastFoundryStair && eastFoundryStair.maxX >= 43.6, 'Zone 4 East Foundry stair must sit flush against +43.70 wall');
  assert.ok(nwCryoStair && nwCryoStair.maxX >= -18.4, 'Zone 7 NW Cryo stair must sit flush against -18.30 wall');

  // 4. ALL 4 Floor 06 Pneumatic Jump Pads launch cleanly with ZERO WASD input onto +4.4m elevated decks!
  const padCases = [
    { id: F6_IDS.padCathedralWest, label: 'Cathedral West -> West Upper Gallery' },
    { id: F6_IDS.padCathedralEast, label: 'Cathedral East -> East Upper Gallery' },
    { id: F6_IDS.padWestLabs, label: 'West Labs -> West Lab Catwalk' },
    { id: F6_IDS.padGravCore, label: 'NE Grav-Core -> North Halo Gallery' },
  ];
  for (const pc of padCases) {
    const pad = f6.jumpPads?.find((p) => p.id === pc.id);
    assert.ok(pad, `expected Floor 06 jump pad ${pc.id}`);
    pad.cooldown = 0;

    const evs = stepWorldMechanics(
      f6.retractableBridges,
      f6.securityGates,
      f6.shootableLocks,
      f6.jumpPads,
      0.016,
      1.0,
      pad.x,
      pad.y,
      pad.z
    );
    const launch = evs.find((e) => e.kind === 'jump_pad_launch' && e.id === pc.id);
    assert.ok(launch, `expected launch event for ${pc.label}`);

    const loco = createInitialLocomotionState(pad.x, pad.z, pad.y);
    loco.vy = launch.launchVy ?? 13.4;
    loco.vx = launch.launchVx ?? 0;
    loco.vz = launch.launchVz ?? 0;
    loco.launchPadTimer = 1.65;
    loco.jumpHoldTimer = 0;
    loco.airTime = 0;
    loco.grounded = false;

    let maxY = loco.y;
    for (let step = 0; step < 140; step++) {
      stepLocomotion(loco, {
        dt: 1 / 60,
        moveForward: 0,
        moveRight: 0,
        cameraYaw: 0,
        sprintHeld: false,
        crouchHeld: false,
        adsHeld: false,
        jumpJustPressed: false,
        jumpHeld: false,
        rollJustPressed: false,
        colliders: [],
        bounds: world.bounds,
        world3D: world,
      });
      if (loco.y > maxY) maxY = loco.y;
    }

    assert.ok(
      maxY > F6_UPPER_Y + 1.0,
      `${pc.label} must peak > ${(F6_UPPER_Y + 1.0).toFixed(2)}m, peaked at ${maxY.toFixed(2)}m`
    );
    assert.equal(loco.grounded, true, `${pc.label} must land grounded on elevated deck`);
    assert.ok(
      Math.abs(loco.y - F6_UPPER_Y) < 0.06,
      `${pc.label} must land cleanly on upperY=${F6_UPPER_Y}, landed at y=${loco.y.toFixed(2)} (x=${loco.x.toFixed(2)}, z=${loco.z.toFixed(2)})`
    );
  }

  // 5. BOTH Retractable Skybridges deploy cleanly (Cathedral High Skybridge via shootable lock; Foundry Skybridge via switch!)
  const pPos = new THREE.Vector3(0, F6_BASE_Y, 12);
  const cPos = new THREE.Vector3(0, F6_BASE_Y + 2, 14);
  assert.notEqual(resolveSupportHeight3D(0, 0, F6_UPPER_Y + 0.1, world), F6_UPPER_Y);
  assert.notEqual(resolveSupportHeight3D(31.0, 4.2, F6_UPPER_Y + 0.1, world), F6_UPPER_Y);

  const catBridgeLock = hideout.triggerShootableLock(F6_IDS.lockCathedralBridge);
  assert.ok(catBridgeLock && catBridgeLock.deployedBridge, 'shooting Monolith Relay must deploy Cathedral High Skybridge');
  const foundryBridgeSw = hideout.activateWorldSwitch(F6_IDS.switchFoundryBridge);
  assert.ok(foundryBridgeSw && foundryBridgeSw.deployedBridge, 'activating Foundry switch must deploy Foundry Skybridge');
  for (let i = 0; i < 45; i++) {
    hideout.update(0.05, i * 0.05, pPos, cPos);
  }
  assert.equal(resolveSupportHeight3D(0, 0, F6_UPPER_Y + 0.1, world), F6_UPPER_Y, 'Cathedral High Skybridge must support full span');
  assert.equal(resolveSupportHeight3D(31.0, 4.2, F6_UPPER_Y + 0.1, world), F6_UPPER_Y, 'Foundry Catwalk Skybridge must support full span');

  // 6. BOTH Locked Security Gates show HUD hints when sealed, unlock via Shootable Relays & permit smooth entry!
  const swVaultHint = hideout.getNearbyInteraction(-33.4, F6_BASE_Y, 21.4);
  assert.ok(swVaultHint && swVaultHint.isLockedGate === true, 'sealed SW Munitions Vault must return locked-gate hint');
  const cryoGateHint = hideout.getNearbyInteraction(-19.8, F6_BASE_Y, -12.9);
  assert.ok(cryoGateHint && cryoGateHint.isLockedGate === true, 'sealed Cryo Bypass Gate must return locked-gate hint');

  assert.ok(hideout.triggerShootableLock(F6_IDS.lockSwVault)?.unlockedGate, 'shooting SW Vault glass relay must unlock SW Vault gate');
  assert.ok(hideout.triggerShootableLock(F6_IDS.lockCryoBypass)?.unlockedGate, 'shooting Cryo North relay must unlock Cryo Bypass gate');
  for (let i = 0; i < 35; i++) {
    hideout.update(0.05, 2.5 + i * 0.05, pPos, cPos);
  }
  assert.equal(resolveHorizontal3D(-35.0, 21.4, F6_BASE_Y, 0.36, world.boxes).collided, false, 'unlocked SW Munitions Vault must be unobstructed');
  assert.equal(resolveHorizontal3D(-18.0, -12.9, F6_BASE_Y, 0.36, world.boxes).collided, false, 'unlocked Cryo Extraction Bypass must be unobstructed');

  // 7. BOTH Jammed Roll-Under Blast Shutters block standing walk & allow smooth [V] Dodge Roll underneath!
  for (const [jx, jz, label] of [
    [-34.7, -5.8, 'Zone 3 -> Zone 7 Labs-Cryo Jammed Shutter'],
    [35.3, -5.8, 'Zone 4 -> Zone 6 Foundry-Grav Jammed Shutter'],
  ] as const) {
    for (let i = 0; i < 30; i++) {
      stepTacticalDoors(f6.tacticalDoors, 0.05, i * 0.05, jx, F6_BASE_Y, jz);
    }
    const stand = createInitialLocomotionState(jx, jz, F6_BASE_Y);
    for (let i = 0; i < 80; i++) {
      stepLocomotion(stand, {
        dt: 1 / 60,
        moveForward: 1,
        moveRight: 0,
        cameraYaw: 0, // forward = -Z toward z = -8.0
        sprintHeld: true,
        crouchHeld: false,
        adsHeld: false,
        jumpJustPressed: false,
        jumpHeld: false,
        rollJustPressed: false,
        colliders: [],
        bounds: world.bounds,
        world3D: world,
      });
    }
    assert.ok(stand.z > -7.6, `${label} must block standing operative, got z=${stand.z.toFixed(2)}`);

    const roll = createInitialLocomotionState(stand.x, stand.z, F6_BASE_Y);
    for (let i = 0; i < 65; i++) {
      stepLocomotion(roll, {
        dt: 1 / 60,
        moveForward: 1,
        moveRight: 0,
        cameraYaw: 0,
        sprintHeld: true,
        crouchHeld: false,
        adsHeld: false,
        jumpJustPressed: false,
        jumpHeld: false,
        rollJustPressed: i === 2,
        colliders: [],
        bounds: world.bounds,
        world3D: world,
      });
    }
    assert.ok(roll.z < -8.8, `${label} must allow smooth dodge roll underneath, ended at z=${roll.z.toFixed(2)}`);
  }

  // 8. Pressurized Explosive Plasma Barrels (16 total) chain-detonate & respawn + Kinetic Spinners rotate continuously!
  assert.equal(
    hideout.activeExplosiveBarrels.length,
    16,
    `expected 16 explosive plasma barrels across Floor 06, got ${hideout.activeExplosiveBarrels.length}`
  );
  const f6b1 = hideout.activeExplosiveBarrels.find((b) => b.id === 'f6_barrel_foundry_n1');
  const f6b2 = hideout.activeExplosiveBarrels.find((b) => b.id === 'f6_barrel_foundry_n2');
  assert.ok(f6b1 && f6b2, 'expected Foundry North chain-reaction barrel pair');
  const blown = hideout.triggerExplosiveBarrel('f6_barrel_foundry_n1');
  assert.equal(blown.length, 2, 'detonating f6_barrel_foundry_n1 must chain-detonate f6_barrel_foundry_n2');
  assert.equal(f6b1.collider.active, false);
  assert.equal(f6b2.collider.active, false);

  assert.ok((f6.animatedSpinners?.length ?? 0) >= 7, 'expected Obsidian Halo + 3 Grav-Core Gyro Rings + 2 Cryo Fans rotating on Floor 06');
  const haloSpinner = f6.animatedSpinners![0];
  const initRotY = haloSpinner.obj.rotation.y;
  for (let i = 0; i < 300; i++) {
    hideout.update(0.05, 5.0 + i * 0.05, pPos, cPos);
  }
  assert.equal(f6b1.detonated, false, 'Floor 06 explosive barrel must auto-respawn after 14s');
  assert.equal(f6b1.collider.active, true, 'respawned Floor 06 barrel must re-enable collider');
  assert.ok(
    Math.abs(haloSpinner.obj.rotation.y - initRotY) > 1.0,
    'Floor 06 kinetic spinners must rotate continuously during hideout.update()'
  );

  hideout.dispose();
});

test('Floor 05 Tactical War-Games Amphitheater Complex: all 6 OcclusionCells, 4 elevation tiers, 4 flush wall-side stairs, 4 calibrated jump pads, 3 retractable skybridges, 2 locked gates, 2 jammed roll shutters, 20 explosive barrels & 6 kinetic spinners', () => {
  const hideout = createEightFloorHideout(null, null, true);
  hideout.teleportToFloor(5);
  const f5 = hideout.floors[5];
  const world = hideout.activeCollisionWorld;

  // 1. All 6 outer-wing OcclusionCells exist for strict AAA culling
  const cellIds = f5.occlusionCells.map((c) => c.id);
  for (const expectedId of [
    'f5_west_simdeck',
    'f5_east_mechbay',
    'f5_nw_orbital',
    'f5_ne_command',
    'f5_sw_reactor',
    'f5_se_ordnance',
  ]) {
    assert.ok(cellIds.includes(expectedId), `expected Floor 05 OcclusionCell ${expectedId}`);
  }

  // 2. All 4 Vertical Elevation Tiers (`53.4m` War-Pit, `54.7m` Mid Terrace, `56.0m` Promenade, `60.4m` VIP Balconies)
  assert.equal(resolveSupportHeight3D(-4.2, 0.0, F5_PIT_Y + 0.2, world), F5_PIT_Y, 'Sunken War-Pit floor support');
  assert.equal(resolveSupportHeight3D(-8.8, 5.0, F5_TIER_Y + 0.2, world), F5_TIER_Y, 'Mid Spectator Terrace support');
  assert.equal(resolveSupportHeight3D(0.0, -14.0, F5_BASE_Y + 0.2, world), F5_BASE_Y, 'North Arrival Promenade support');
  assert.equal(resolveSupportHeight3D(-15.6, 0.0, F5_UPPER_Y + 0.2, world), F5_UPPER_Y, 'West VIP Balcony support');

  // Monotonic descent down North Cardinal Amphitheater Stair (`z = -10.4 -> -6.4`, `56.0 -> 53.4`)
  let bowlY = F5_BASE_Y;
  for (let i = 0; i <= 10; i++) {
    const z = -10.4 + (i / 10) * 4.0;
    const h = resolveSupportHeight3D(0.0, z, bowlY + 0.15, world);
    assert.ok(h !== null, `expected North Cardinal stair support at z=${z.toFixed(2)}`);
    assert.ok(h <= bowlY + 0.03, `expected monotonic descent at z=${z.toFixed(2)}: ${h} vs ${bowlY}`);
    bowlY = h;
  }
  assert.ok(Math.abs(bowlY - F5_PIT_Y) < 0.08, `expected North Cardinal stair bottom ${F5_PIT_Y}, got ${bowlY}`);

  // Monotonic ascent up West VIP Staircase (`x = -12.35`, `z = +3.0 -> +11.8`, `56.0 -> 60.4`)
  let vipY = F5_BASE_Y;
  for (let i = 0; i <= 16; i++) {
    const z = 3.0 + (i / 16) * 8.8;
    const h = resolveSupportHeight3D(-12.35, z, vipY, world);
    assert.ok(h !== null, `expected West VIP stair support at z=${z.toFixed(2)}`);
    assert.ok(h >= vipY - 0.02, `expected monotonic ascent at z=${z.toFixed(2)}: ${h} vs ${vipY}`);
    vipY = h;
  }
  assert.ok(Math.abs(vipY - F5_UPPER_Y) < 0.08, `expected West VIP stair top ${F5_UPPER_Y}, got ${vipY}`);

  // 3. ALL 4 Wall-Side Staircases sit flush against their perimeter walls (`±47.70`, ZERO wall gap!)
  const simWestStair = f5.ramps.find((r) => r.minX < -47.0 && r.minZ >= -4.0 && r.maxZ <= 7.0);
  const mechEastStair = f5.ramps.find((r) => r.maxX > 47.0 && r.minZ >= -4.0 && r.maxZ <= 7.0);
  const reactorWestStair = f5.ramps.find((r) => r.minX < -47.0 && r.minZ >= 16.0 && r.maxZ <= 28.0);
  const ordnanceEastStair = f5.ramps.find((r) => r.maxX > 47.0 && r.minZ >= 19.0 && r.maxZ <= 31.0);
  assert.ok(simWestStair && simWestStair.minX <= -47.6, 'Zone 3 Sim-Deck West stair must sit flush against -47.70 wall');
  assert.ok(mechEastStair && mechEastStair.maxX >= 47.6, 'Zone 4 Mech-Bay East stair must sit flush against +47.70 wall');
  assert.ok(reactorWestStair && reactorWestStair.minX <= -47.6, 'Zone 7 SW Reactor West stair must sit flush against -47.70 wall');
  assert.ok(ordnanceEastStair && ordnanceEastStair.maxX >= 47.6, 'Zone 8 SE Ordnance East stair must sit flush against +47.70 wall');

  // 4. ALL 4 Calibrated Pneumatic Jump Pads launch cleanly with ZERO WASD input onto +4.4m elevated decks!
  const padCases = [
    { id: F5_IDS.padColiseumWest, label: 'Coliseum West -> West VIP Balcony' },
    { id: F5_IDS.padColiseumEast, label: 'Coliseum East -> East VIP Balcony' },
    { id: F5_IDS.padWestSim, label: 'West Sim-Deck -> West Overwatch Spine' },
    { id: F5_IDS.padNwOrbital, label: 'NW Orbital -> North Observation Deck' },
  ];
  for (const pc of padCases) {
    const pad = f5.jumpPads?.find((p) => p.id === pc.id);
    assert.ok(pad, `expected Floor 05 jump pad ${pc.id}`);
    pad.cooldown = 0;

    const evs = stepWorldMechanics(
      f5.retractableBridges,
      f5.securityGates,
      f5.shootableLocks,
      f5.jumpPads,
      0.016,
      1.0,
      pad.x,
      pad.y,
      pad.z
    );
    const launch = evs.find((e) => e.kind === 'jump_pad_launch' && e.id === pc.id);
    assert.ok(launch, `expected launch event for ${pc.label}`);

    const loco = createInitialLocomotionState(pad.x, pad.z, pad.y);
    loco.vy = launch.launchVy ?? 13.4;
    loco.vx = launch.launchVx ?? 0;
    loco.vz = launch.launchVz ?? 0;
    loco.launchPadTimer = 1.65;
    loco.jumpHoldTimer = 0;
    loco.airTime = 0;
    loco.grounded = false;

    let maxY = loco.y;
    for (let step = 0; step < 140; step++) {
      stepLocomotion(loco, {
        dt: 1 / 60,
        moveForward: 0,
        moveRight: 0,
        cameraYaw: 0,
        sprintHeld: false,
        crouchHeld: false,
        adsHeld: false,
        jumpJustPressed: false,
        jumpHeld: false,
        rollJustPressed: false,
        colliders: [],
        bounds: world.bounds,
        world3D: world,
      });
      if (loco.y > maxY) maxY = loco.y;
    }

    assert.ok(
      maxY > F5_UPPER_Y + 1.0,
      `${pc.label} must peak > ${(F5_UPPER_Y + 1.0).toFixed(2)}m, peaked at ${maxY.toFixed(2)}m`
    );
    assert.equal(loco.grounded, true, `${pc.label} must land grounded on elevated deck`);
    assert.ok(
      Math.abs(loco.y - F5_UPPER_Y) < 0.06,
      `${pc.label} must land cleanly on upperY=${F5_UPPER_Y}, landed at y=${loco.y.toFixed(2)} (x=${loco.x.toFixed(2)}, z=${loco.z.toFixed(2)})`
    );
  }

  // 5. ALL 3 Retractable Skybridges deploy cleanly (Coliseum via shootable lock; Mech Gantry & SE Depot via switches!)
  const pPos = new THREE.Vector3(0, F5_BASE_Y, -12);
  const cPos = new THREE.Vector3(0, F5_BASE_Y + 2, -14);
  assert.notEqual(resolveSupportHeight3D(0.0, 0.0, F5_UPPER_Y + 0.1, world), F5_UPPER_Y);
  assert.notEqual(resolveSupportHeight3D(33.0, -4.2, F5_UPPER_Y + 0.1, world), F5_UPPER_Y);
  assert.notEqual(resolveSupportHeight3D(33.0, 18.2, F5_UPPER_Y + 0.1, world), F5_UPPER_Y);

  assert.ok(hideout.triggerShootableLock(F5_IDS.lockColiseumBridge)?.deployedBridge, 'shooting Coliseum Jumbo Relay must deploy High Skybridge');
  assert.ok(hideout.activateWorldSwitch(F5_IDS.switchMechGantry)?.deployedBridge, 'activating Mech Gantry switch must deploy Gantry Skybridge');
  assert.ok(hideout.activateWorldSwitch(F5_IDS.switchSeDepot)?.deployedBridge, 'activating SE Depot switch must deploy Ordnance Skybridge');
  for (let i = 0; i < 45; i++) {
    hideout.update(0.05, i * 0.05, pPos, cPos);
  }
  assert.equal(resolveSupportHeight3D(0.0, 0.0, F5_UPPER_Y + 0.1, world), F5_UPPER_Y, 'Coliseum High Skybridge must support full 27.2m span');
  assert.equal(resolveSupportHeight3D(33.0, -4.2, F5_UPPER_Y + 0.1, world), F5_UPPER_Y, 'Mech-Bay Gantry Skybridge must support full 18.8m span');
  assert.equal(resolveSupportHeight3D(33.0, 18.2, F5_UPPER_Y + 0.1, world), F5_UPPER_Y, 'SE Ordnance Depot Skybridge must support full 18.8m span');

  // 6. BOTH Locked Security Gates display HUD hints when sealed, unlock via Shootable Relays & permit smooth entry!
  const nwGateHint = hideout.getNearbyInteraction(-16.2, F5_BASE_Y, -13.1);
  assert.ok(nwGateHint && nwGateHint.isLockedGate === true, 'sealed NW Orbital Bypass gate must return locked-gate hint');
  const neVaultHint = hideout.getNearbyInteraction(36.2, F5_BASE_Y, -20.6);
  assert.ok(neVaultHint && neVaultHint.isLockedGate === true, 'sealed NE Black-Ops Prototype Vault must return locked-gate hint');

  assert.ok(hideout.triggerShootableLock(F5_IDS.lockNwBypass)?.unlockedGate, 'shooting NW Orbital North relay must unlock Bypass Gate');
  assert.ok(hideout.triggerShootableLock(F5_IDS.lockNeVault)?.unlockedGate, 'shooting NE Vault through-glass relay must unlock Prototype Vault');
  for (let i = 0; i < 35; i++) {
    hideout.update(0.05, 2.5 + i * 0.05, pPos, cPos);
  }
  assert.equal(resolveHorizontal3D(-18.0, -13.1, F5_BASE_Y, 0.36, world.boxes).collided, false, 'unlocked NW Orbital Bypass gate must be clear');
  assert.equal(resolveHorizontal3D(38.0, -20.6, F5_BASE_Y, 0.36, world.boxes).collided, false, 'unlocked NE Black-Ops Prototype Vault must be clear');

  // 7. BOTH Jammed Roll-Under Blast Shutters block standing walk & allow smooth [V] Dodge Roll underneath!
  for (const [jx, jz, yaw, checkStand, checkRoll, label] of [
    [-36.7, -7.8, 0, (z: number) => z > -9.6, (z: number) => z < -10.8, 'Zone 3 -> Zone 5 Sim-Orbital Jammed Shutter'],
    [36.7, 7.8, Math.PI, (z: number) => z < 9.6, (z: number) => z > 10.8, 'Zone 4 -> Zone 8 Mech-Ordnance Jammed Shutter'],
  ] as const) {
    for (let i = 0; i < 30; i++) {
      stepTacticalDoors(f5.tacticalDoors, 0.05, i * 0.05, jx, F5_BASE_Y, jz);
    }
    const stand = createInitialLocomotionState(jx, jz, F5_BASE_Y);
    for (let i = 0; i < 80; i++) {
      stepLocomotion(stand, {
        dt: 1 / 60,
        moveForward: 1,
        moveRight: 0,
        cameraYaw: yaw,
        sprintHeld: true,
        crouchHeld: false,
        adsHeld: false,
        jumpJustPressed: false,
        jumpHeld: false,
        rollJustPressed: false,
        colliders: [],
        bounds: world.bounds,
        world3D: world,
      });
    }
    assert.ok(checkStand(stand.z), `${label} must block standing operative, got z=${stand.z.toFixed(2)}`);

    const roll = createInitialLocomotionState(stand.x, stand.z, F5_BASE_Y);
    for (let i = 0; i < 65; i++) {
      stepLocomotion(roll, {
        dt: 1 / 60,
        moveForward: 1,
        moveRight: 0,
        cameraYaw: yaw,
        sprintHeld: true,
        crouchHeld: false,
        adsHeld: false,
        jumpJustPressed: false,
        jumpHeld: false,
        rollJustPressed: i === 2,
        colliders: [],
        bounds: world.bounds,
        world3D: world,
      });
    }
    assert.ok(checkRoll(roll.z), `${label} must allow smooth dodge roll underneath, ended at z=${roll.z.toFixed(2)}`);
  }

  // 8. 20 Pressurized Explosive Plasma Barrels chain-detonate & respawn + 6 Kinetic Spinners rotate continuously!
  assert.equal(
    hideout.activeExplosiveBarrels.length,
    20,
    `expected 20 explosive plasma barrels across Floor 05, got ${hideout.activeExplosiveBarrels.length}`
  );
  const f5b1 = hideout.activeExplosiveBarrels.find((b) => b.id === 'f5_barrel_mech_nw');
  const f5b2 = hideout.activeExplosiveBarrels.find((b) => b.id === 'f5_barrel_mech_nw2');
  assert.ok(f5b1 && f5b2, 'expected Mech-Bay NW chain-reaction barrel pair');
  const blown = hideout.triggerExplosiveBarrel('f5_barrel_mech_nw');
  assert.equal(blown.length, 2, 'detonating f5_barrel_mech_nw must chain-detonate f5_barrel_mech_nw2');
  assert.equal(f5b1.collider.active, false);
  assert.equal(f5b2.collider.active, false);

  assert.equal(
    f5.animatedSpinners?.length ?? 0,
    6,
    `expected 6 kinetic animatedSpinners on Floor 05 (2 Holo Globe + 1 Orbital Dish + 3 Thermal Turbines), got ${f5.animatedSpinners?.length ?? 0}`
  );
  const initRots = f5.animatedSpinners!.map((s) => s.obj.rotation.y);
  for (let i = 0; i < 300; i++) {
    hideout.update(0.05, 5.0 + i * 0.05, pPos, cPos);
  }
  assert.equal(f5b1.detonated, false, 'Floor 05 explosive barrel must auto-respawn after 14s');
  assert.equal(f5b1.collider.active, true, 'respawned Floor 05 barrel must re-enable collider');
  for (let i = 0; i < initRots.length; i++) {
    assert.ok(
      Math.abs(f5.animatedSpinners![i].obj.rotation.y - initRots[i]) > 1.0,
      `Floor 05 kinetic spinner #${i} must rotate continuously during hideout.update()`
    );
  }

  hideout.dispose();
});

test('Floor 06 trench & Floor 05 amphitheater bowl zero-Z-fighting & unobstructed cardinal stairs regression', () => {
  const hideout = createEightFloorHideout(null, null, true);

  // 1. Floor 06 Trench Retaining Walls stop strictly beneath the 0.6m promenade slab (`y <= 69.40m`)
  const f6 = hideout.floors[6];
  let trenchWallMesh: THREE.Mesh | null = null;
  f6.group.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.name === 'F6_Z2_TrenchRetainingWalls') {
      trenchWallMesh = obj;
    }
  });
  assert.ok(trenchWallMesh, 'expected F6_Z2_TrenchRetainingWalls mesh');
  const f6Box = new THREE.Box3().setFromObject(trenchWallMesh);
  assert.ok(
    f6Box.max.y <= F6_BASE_Y - 0.59,
    `Floor 06 trench retaining walls must stop cleanly beneath 0.6m promenade slab (${F6_BASE_Y - 0.6}m), got maxY=${f6Box.max.y.toFixed(4)}`
  );

  // 2. Floor 05 Mid Terrace Ring leaves ALL 4 cardinal staircase openings (`[-1.85, +1.85]`) 100% open (ZERO buried steps!)
  const f5 = hideout.floors[5];
  const midTierSlabs = f5.slabs.filter((s) => Math.abs(s.y - F5_TIER_Y) < 0.05);
  assert.equal(midTierSlabs.length, 8, `expected 8 split quadrant slabs on Floor 05 Mid Terrace Ring, got ${midTierSlabs.length}`);
  const cardinalChecks: Array<[number, number, string]> = [
    [0.0, -8.8, 'North cardinal stair'],
    [0.0, 8.8, 'South cardinal stair'],
    [-8.8, 0.0, 'West cardinal stair'],
    [8.8, 0.0, 'East cardinal stair'],
  ];
  for (const [cx, cz, label] of cardinalChecks) {
    const blocking = midTierSlabs.find(
      (s) => cx > s.minX + 0.01 && cx < s.maxX - 0.01 && cz > s.minZ + 0.01 && cz < s.maxZ - 0.01
    );
    assert.equal(blocking, undefined, `${label} center (${cx}, ${cz}) must NOT intersect any Mid Terrace slab`);
  }

  hideout.dispose();
});

test('Floor 04 Skybridge Chasm & Hydro-Geo Canyon Complex: all 6 OcclusionCells, 4 elevation tiers, flush stairs, 6 calibrated jump pads, 3 retractable skybridges, 2 locked gates, 2 jammed roll shutters, explosive barrels & 13 kinetic spinners', () => {
  const hideout = createEightFloorHideout(null, null, true);
  hideout.teleportToFloor(4);
  const f4 = hideout.floors[4];
  const world = hideout.activeCollisionWorld;

  // 1. All 6 outer-wing OcclusionCells exist for strict AAA culling
  const cellIds = f4.occlusionCells.map((c) => c.id);
  for (const expectedId of [
    'f4_zone3_west_hydro_dam',
    'f4_zone4_east_tram_foundry',
    'f4_zone5_nw_substation',
    'f4_zone6_ne_overwatch',
    'f4_zone7_sw_geothermal',
    'f4_zone8_se_freight_yard',
  ]) {
    assert.ok(cellIds.includes(expectedId), `expected Floor 04 OcclusionCell ${expectedId}`);
  }

  // 2. All 4 Vertical Elevation Tiers (`39.6m` Chasm, `42.0m` Spine/Cliffs, `44.6m` Mid Transverse Bridge, `46.4m` Upper Towers)
  assert.equal(resolveSupportHeight3D(-5.0, -4.0, F4_CHASM_Y + 0.2, world), F4_CHASM_Y, 'Abyssal Chasm floor support');
  assert.equal(resolveSupportHeight3D(0.0, 0.0, F4_BASE_Y + 0.2, world), F4_BASE_Y, 'Main Spine Bridge support');
  assert.equal(resolveSupportHeight3D(0.0, 4.6, F4_MID_Y + 0.2, world), F4_MID_Y, 'South Transverse Mid Skybridge support');
  assert.equal(resolveSupportHeight3D(-15.6, 0.0, F4_UPPER_Y + 0.2, world), F4_UPPER_Y, 'West Upper Suspension Tower support');

  // Monotonic ascent up West Switchback Staircase (`42.0 -> 44.6 -> 46.4m` along `x = -12.45`)!
  let swY = F4_BASE_Y;
  for (let i = 0; i <= 12; i++) {
    const z = 10.6 - (i / 12) * 4.4;
    const h = resolveSupportHeight3D(-12.45, z, swY, world);
    assert.ok(h !== null, `expected Switchback Flight A support at z=${z.toFixed(2)}`);
    assert.ok(h >= swY - 0.02, `expected monotonic ascent Flight A at z=${z.toFixed(2)}: ${h} vs ${swY}`);
    swY = h;
  }
  assert.ok(Math.abs(swY - F4_MID_Y) < 0.08, `expected Switchback Mid Landing ${F4_MID_Y}, got ${swY}`);
  for (let i = 0; i <= 12; i++) {
    const z = 3.0 - (i / 12) * 4.6;
    const h = resolveSupportHeight3D(-12.45, z, swY, world);
    assert.ok(h !== null, `expected Switchback Flight B support at z=${z.toFixed(2)}`);
    assert.ok(h >= swY - 0.02, `expected monotonic ascent Flight B at z=${z.toFixed(2)}: ${h} vs ${swY}`);
    swY = h;
  }
  assert.ok(Math.abs(swY - F4_UPPER_Y) < 0.08, `expected Switchback Top Landing ${F4_UPPER_Y}, got ${swY}`);

  // 3. Flush Wall-Side & Chasm Staircases sit flush against adjacent walls/catwalks (ZERO wall gap!)
  const westChasmStair = f4.ramps.find((r) => r.minX < -11.3 && r.maxX < -8.0 && r.minZ < -9.5);
  const eastChasmStair = f4.ramps.find((r) => r.maxX > 11.3 && r.minX > 8.0 && r.maxZ > 9.5);
  const hydroNorthStair = f4.ramps.find((r) => r.axis === 'x' && r.minZ <= -9.6 && r.minX < -33.0);
  const foundrySouthStair = f4.ramps.find((r) => r.axis === 'x' && r.maxZ >= 9.6 && r.minX > 25.0);
  const nwWestStair = f4.ramps.find((r) => r.axis === 'z' && r.minX <= -42.3 && r.maxX <= -39.5 && r.minZ < -20.0);
  const neNorthStair = f4.ramps.find((r) => r.axis === 'x' && r.minZ <= -31.6 && r.minX > 20.0);
  const swWestStair = f4.ramps.find((r) => r.axis === 'z' && r.minX <= -47.6 && r.minZ > 20.0);
  const seEastStair = f4.ramps.find((r) => r.axis === 'z' && r.maxX >= 47.6 && r.minZ > 20.0);
  assert.ok(westChasmStair, 'West Chasm stair must sit flush against -11.40 cliff');
  assert.ok(eastChasmStair, 'East Chasm stair must sit flush against +11.40 cliff');
  assert.ok(hydroNorthStair, 'Zone 3 Hydro Dam stair must sit flush against -9.70 wall');
  assert.ok(foundrySouthStair, 'Zone 4 Tram Foundry stair must sit flush against +9.70 wall');
  assert.ok(nwWestStair, 'Zone 5 NW Substation stair must sit flush against -42.40 West Catwalk edge');
  assert.ok(neNorthStair, 'Zone 6 NE Overwatch stair must sit flush against -31.70 wall');
  assert.ok(swWestStair, 'Zone 7 SW Geothermal stair must sit flush against -47.70 wall');
  assert.ok(seEastStair, 'Zone 8 SE Freight Yard stair must sit flush against +47.70 wall');

  // 4. ALL 6 Floor 04 Pneumatic Jump Pads launch cleanly with ZERO WASD input onto target elevated decks!
  const padCases = [
    { id: F4_IDS.padChasmWest, targetY: F4_UPPER_Y, minPeakY: F4_UPPER_Y + 1.0, label: 'Chasm West -> West Suspension Tower' },
    { id: F4_IDS.padChasmEast, targetY: F4_UPPER_Y, minPeakY: F4_UPPER_Y + 1.0, label: 'Chasm East -> East Suspension Tower' },
    { id: F4_IDS.padChasmUpdraftW, targetY: F4_BASE_Y, minPeakY: F4_BASE_Y + 0.8, label: 'Chasm Thermal Updraft W -> Main Spine Bridge' },
    { id: F4_IDS.padChasmUpdraftE, targetY: F4_BASE_Y, minPeakY: F4_BASE_Y + 0.8, label: 'Chasm Thermal Updraft E -> Main Spine Bridge' },
    { id: F4_IDS.padHydroWest, targetY: F4_UPPER_Y, minPeakY: F4_UPPER_Y + 1.0, label: 'Hydro Dam -> Transverse Dam Overlook Bridge' },
    { id: F4_IDS.padSubstationNw, targetY: F4_UPPER_Y, minPeakY: F4_UPPER_Y + 1.0, label: 'NW Substation -> North Substation Catwalk' },
  ];
  for (const pc of padCases) {
    const pad = f4.jumpPads?.find((p) => p.id === pc.id);
    assert.ok(pad, `expected Floor 04 jump pad ${pc.id}`);
    pad.cooldown = 0;

    const evs = stepWorldMechanics(
      f4.retractableBridges,
      f4.securityGates,
      f4.shootableLocks,
      f4.jumpPads,
      0.016,
      1.0,
      pad.x,
      pad.y,
      pad.z
    );
    const launch = evs.find((e) => e.kind === 'jump_pad_launch' && e.id === pc.id);
    assert.ok(launch, `expected launch event for ${pc.label}`);

    const loco = createInitialLocomotionState(pad.x, pad.z, pad.y);
    loco.vy = launch.launchVy ?? 13.4;
    loco.vx = launch.launchVx ?? 0;
    loco.vz = launch.launchVz ?? 0;
    loco.launchPadTimer = 1.65;
    loco.jumpHoldTimer = 0;
    loco.airTime = 0;
    loco.grounded = false;

    let maxY = loco.y;
    for (let step = 0; step < 140; step++) {
      stepLocomotion(loco, {
        dt: 1 / 60,
        moveForward: 0,
        moveRight: 0,
        cameraYaw: 0,
        sprintHeld: false,
        crouchHeld: false,
        adsHeld: false,
        jumpJustPressed: false,
        jumpHeld: false,
        rollJustPressed: false,
        colliders: [],
        bounds: world.bounds,
        world3D: world,
      });
      if (loco.y > maxY) maxY = loco.y;
    }

    assert.ok(
      maxY > pc.minPeakY,
      `${pc.label} must peak > ${pc.minPeakY.toFixed(2)}m, peaked at ${maxY.toFixed(2)}m`
    );
    assert.equal(loco.grounded, true, `${pc.label} must land grounded on target deck`);
    assert.ok(
      Math.abs(loco.y - pc.targetY) < 0.06,
      `${pc.label} must land cleanly on targetY=${pc.targetY}, landed at y=${loco.y.toFixed(2)} (x=${loco.x.toFixed(2)}, z=${loco.z.toFixed(2)})`
    );
  }

  // 5. ALL 3 Retractable Skybridges deploy cleanly (Chasm High via shootable lock; Foundry Crane & SE Freight via switches!)
  const pPos = new THREE.Vector3(0, F4_BASE_Y, 12);
  const cPos = new THREE.Vector3(0, F4_BASE_Y + 2, 14);
  assert.notEqual(resolveSupportHeight3D(0.0, -4.6, F4_UPPER_Y + 0.1, world), F4_UPPER_Y);
  assert.notEqual(resolveSupportHeight3D(33.0, -4.2, F4_UPPER_Y + 0.1, world), F4_UPPER_Y);
  assert.notEqual(resolveSupportHeight3D(33.0, 13.2, F4_UPPER_Y + 0.1, world), F4_UPPER_Y);

  assert.ok(hideout.triggerShootableLock(F4_IDS.lockChasmHigh)?.deployedBridge, 'shooting Arch Relay must deploy High Sniper Skybridge');
  assert.ok(hideout.activateWorldSwitch(F4_IDS.switchFoundryCrane)?.deployedBridge, 'activating Foundry switch must deploy Crane Skybridge');
  assert.ok(hideout.activateWorldSwitch(F4_IDS.switchSeFreight)?.deployedBridge, 'activating SE Freight switch must deploy Gantry Skybridge');
  for (let i = 0; i < 45; i++) {
    hideout.update(0.05, i * 0.05, pPos, cPos);
  }
  assert.equal(resolveSupportHeight3D(0.0, -4.6, F4_UPPER_Y + 0.1, world), F4_UPPER_Y, 'High Sniper Canyon Skybridge must support full 27.2m span');
  assert.equal(resolveSupportHeight3D(33.0, -4.2, F4_UPPER_Y + 0.1, world), F4_UPPER_Y, 'Foundry Crane Skybridge must support full 18.8m span');
  assert.equal(resolveSupportHeight3D(33.0, 13.2, F4_UPPER_Y + 0.1, world), F4_UPPER_Y, 'SE Freight Gantry Skybridge must support full 18.8m span');

  // 6. BOTH Locked Security Gates display HUD hints when sealed, unlock via Shootable Relays & permit smooth entry!
  const nwGateHint = hideout.getNearbyInteraction(-16.2, F4_BASE_Y, -13.1);
  assert.ok(nwGateHint && nwGateHint.isLockedGate === true, 'sealed NW Substation Bypass Gate must return locked-gate hint');
  const neVaultHint = hideout.getNearbyInteraction(42.5, F4_BASE_Y, -17.2);
  assert.ok(neVaultHint && neVaultHint.isLockedGate === true, 'sealed NE Hydro-Core Armory Vault must return locked-gate hint');

  assert.ok(hideout.triggerShootableLock(F4_IDS.lockNwSubstation)?.unlockedGate, 'shooting NW Substation relay must unlock Bypass Gate');
  assert.ok(hideout.triggerShootableLock(F4_IDS.lockNeVault)?.unlockedGate, 'shooting NE Vault through-glass relay must unlock Hydro-Core Vault');
  for (let i = 0; i < 35; i++) {
    hideout.update(0.05, 2.5 + i * 0.05, pPos, cPos);
  }
  assert.equal(resolveHorizontal3D(-18.0, -13.1, F4_BASE_Y, 0.36, world.boxes).collided, false, 'unlocked NW Substation Bypass Gate must be clear');
  assert.equal(resolveHorizontal3D(42.5, -19.0, F4_BASE_Y, 0.36, world.boxes).collided, false, 'unlocked NE Hydro-Core Armory Vault must be clear');

  // 7. BOTH Jammed Roll-Under Blast Shutters block standing walk & allow smooth [V] Dodge Roll underneath!
  for (const [jx, jz, yaw, checkStand, checkRoll, label] of [
    [-36.7, -7.8, 0, (z: number) => z > -9.6, (z: number) => z < -10.8, 'Zone 3 -> Zone 5 Hydro-Substation Jammed Shutter'],
    [36.7, 7.8, Math.PI, (z: number) => z < 9.6, (z: number) => z > 10.8, 'Zone 4 -> Zone 8 Foundry-Freight Jammed Shutter'],
  ] as const) {
    for (let i = 0; i < 30; i++) {
      stepTacticalDoors(f4.tacticalDoors, 0.05, i * 0.05, jx, F4_BASE_Y, jz);
    }
    const stand = createInitialLocomotionState(jx, jz, F4_BASE_Y);
    for (let i = 0; i < 80; i++) {
      stepLocomotion(stand, {
        dt: 1 / 60,
        moveForward: 1,
        moveRight: 0,
        cameraYaw: yaw,
        sprintHeld: true,
        crouchHeld: false,
        adsHeld: false,
        jumpJustPressed: false,
        jumpHeld: false,
        rollJustPressed: false,
        colliders: [],
        bounds: world.bounds,
        world3D: world,
      });
    }
    assert.ok(checkStand(stand.z), `${label} must block standing operative, got z=${stand.z.toFixed(2)}`);

    const roll = createInitialLocomotionState(stand.x, stand.z, F4_BASE_Y);
    for (let i = 0; i < 65; i++) {
      stepLocomotion(roll, {
        dt: 1 / 60,
        moveForward: 1,
        moveRight: 0,
        cameraYaw: yaw,
        sprintHeld: true,
        crouchHeld: false,
        adsHeld: false,
        jumpJustPressed: false,
        jumpHeld: false,
        rollJustPressed: i === 2,
        colliders: [],
        bounds: world.bounds,
        world3D: world,
      });
    }
    assert.ok(checkRoll(roll.z), `${label} must allow smooth dodge roll underneath, ended at z=${roll.z.toFixed(2)}`);
  }

  // 8. 15 Pressurized Explosive Plasma Barrels detonate & respawn + 13 Kinetic Spinners rotate continuously!
  assert.equal(
    hideout.activeExplosiveBarrels.length,
    15,
    `expected 15 explosive plasma barrels across Floor 04, got ${hideout.activeExplosiveBarrels.length}`
  );
  const f4b = hideout.activeExplosiveBarrels.find((b) => b.id === 'f4_barrel_chasm_w');
  assert.ok(f4b, 'expected Chasm West explosive barrel');
  const blown = hideout.triggerExplosiveBarrel('f4_barrel_chasm_w');
  assert.ok(blown.length >= 1, 'detonating f4_barrel_chasm_w must succeed');
  assert.equal(f4b.collider.active, false);

  assert.equal(
    f4.animatedSpinners?.length ?? 0,
    13,
    `expected 13 kinetic animatedSpinners on Floor 04 (3 Abyss + 2 Gyro + 3 Hydro + 3 Geothermal + 1 Tram Pulley + 1 Tesla Core), got ${f4.animatedSpinners?.length ?? 0}`
  );
  const initRots = f4.animatedSpinners!.map((s) => s.obj.rotation.y);
  for (let i = 0; i < 300; i++) {
    hideout.update(0.05, 5.0 + i * 0.05, pPos, cPos);
  }
  assert.equal(f4b.detonated, false, 'Floor 04 explosive barrel must auto-respawn after 14s');
  assert.equal(f4b.collider.active, true, 'respawned Floor 04 barrel must re-enable collider');
  for (let i = 0; i < initRots.length; i++) {
    assert.ok(
      Math.abs(f4.animatedSpinners![i].obj.rotation.y - initRots[i]) > 1.0,
      `Floor 04 kinetic spinner #${i} must rotate continuously during hideout.update()`
    );
  }

  hideout.dispose();
});

test('Global 8-floor vertical clearance & Control Center wake isolation (ZERO inter-floor ceiling/pit penetration on Floors 8->1)', () => {
  const hideout = createEightFloorHideout(null, null, true);
  hideout.group.updateMatrixWorld(true);

  const isInDescentGallery = (obj: THREE.Object3D): boolean => {
    let cur: THREE.Object3D | null = obj;
    while (cur) {
      if (cur.name.includes('Descent')) return true;
      cur = cur.parent;
    }
    return false;
  };

  // Measure strict main-hall vertical envelope [minY, maxY] for each floor (excluding inter-floor descent shafts!)
  const floorMinY: Record<number, number> = {};
  const floorMaxY: Record<number, number> = {};
  const floorMaxColliderY: Record<number, number> = {};
  const tmpBox = new THREE.Box3();

  for (const fNum of [8, 7, 6, 5, 4, 3, 2, 1] as const) {
    const fl = hideout.floors[fNum];
    fl.group.visible = true;
    fl.group.updateMatrixWorld(true);
    let minY = Infinity;
    let maxY = -Infinity;

    fl.group.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || isInDescentGallery(obj)) return;
      tmpBox.setFromObject(obj);
      if (tmpBox.isEmpty()) return;
      // Ignore descent staircase/gallery meshes that sit strictly outside the main hall (`|x| <= 6.6 && |z| >= 16.0`)
      if (tmpBox.min.x >= -6.6 && tmpBox.max.x <= 6.6 && (tmpBox.min.z >= 16.0 || tmpBox.max.z <= -16.0)) {
        return;
      }
      if (tmpBox.min.y < minY) minY = tmpBox.min.y;
      if (tmpBox.max.y > maxY) maxY = tmpBox.max.y;
    });

    let maxColY = -Infinity;
    for (const b of fl.boxes) {
      // Ignore descent gallery enclosure walls strictly in the airlock shaft (`|x| <= 7.2 && |z| >= 16.2`)
      if (b.minX >= -7.2 && b.maxX <= 7.2 && (b.minZ >= 16.2 || b.maxZ <= -16.2)) continue;
      if (b.maxY > maxColY) maxColY = b.maxY;
    }

    floorMinY[fNum] = minY;
    floorMaxY[fNum] = maxY;
    floorMaxColliderY[fNum] = maxColY;
  }

  // Assert strictly positive vertical clearance between EVERY adjacent pair (8->7, 7->6, 6->5, 5->4, 4->3, 3->2, 2->1)!
  for (const upper of [8, 7, 6, 5, 4, 3, 2] as const) {
    const lower = upper - 1;
    const meshClearance = floorMinY[upper] - floorMaxY[lower];
    assert.ok(
      meshClearance >= 0.05,
      `Inter-floor mesh penetration between Floor 0${upper} (minY=${floorMinY[upper].toFixed(3)}) and Floor 0${lower} (maxY=${floorMaxY[lower].toFixed(3)}): clearance=${meshClearance.toFixed(3)}m`
    );
    const colClearance = floorMinY[upper] - floorMaxColliderY[lower];
    assert.ok(
      colClearance >= 0.05,
      `Inter-floor collider penetration between Floor 0${upper} (minY=${floorMinY[upper].toFixed(3)}) and Floor 0${lower} (maxColY=${floorMaxColliderY[lower].toFixed(3)}): clearance=${colClearance.toFixed(3)}m`
    );
  }

  // Explicitly reproduce & verify the exact Floor 04 Control Center wake scenario!
  hideout.teleportToFloor(4);
  assert.equal(hideout.unlockFloorDoor(4), true, 'Floor 04 Control Center unlock must succeed');
  const pPos = new THREE.Vector3(0, F4_BASE_Y, -13.0);
  const cPos = new THREE.Vector3(0, F4_BASE_Y + 2.0, -11.0);
  for (let i = 0; i < 40; i++) {
    hideout.update(0.05, i * 0.05, pPos, cPos);
  }
  assert.equal(hideout.floors[3].group.visible, true, 'Floor 03 must be awake/visible after Floor 04 Control Center activates');

  const liveWorld = hideout.activeCollisionWorld;
  // Walkable Chasm Floor & Chasm Stairs must remain 100% unobstructed by Floor 03!
  for (const [cx, cz] of [
    [-5.0, -4.0],
    [5.0, 4.0],
    [0.0, 0.0],
    [-8.5, 4.0],
    [8.5, -4.0],
  ] as const) {
    assert.equal(
      resolveSupportHeight3D(cx, cz, F4_CHASM_Y + 0.5, liveWorld),
      F4_CHASM_Y,
      `Floor 04 Chasm (${cx}, ${cz}) must remain at ${F4_CHASM_Y}m with ZERO Floor 03 intrusion while Floor 03 is awake`
    );
    assert.equal(
      resolveHorizontal3D(cx, cz, F4_CHASM_Y + 0.2, 0.36, liveWorld.boxes).collided,
      false,
      `Floor 04 Chasm (${cx}, ${cz}) must have ZERO phantom Floor 03 collider while Floor 03 is awake`
    );
  }

  hideout.dispose();
});

test('Floor 03 Glacial Forerunner Citadel: 12 zones, 3 full vertical levels, opening puzzle, express/two-stage/spiral stairs, 6 Jump Pads, 3 Skybridges, 2 Jammed Shutters & Remote L2 Control Center', () => {
  const hideout = createEightFloorHideout(null, null, true);
  hideout.teleportToFloor(3);
  const f3 = hideout.floors[3];
  const world = hideout.activeCollisionWorld;

  // 1. Scale, 8 OcclusionCells & 4 Playable Elevations (26.2m Sub-Crypt, 28.0m L0, 31.1m L1, 34.2m L2)
  assert.equal(f3.occlusionCells.length, 8, 'Floor 03 must have 8 modular outer OcclusionCells');
  assert.equal(f3.bounds?.minX, -54.0);
  assert.equal(f3.bounds?.maxX, 54.0);
  assert.equal(f3.bounds?.minZ, -34.0);
  assert.equal(f3.bounds?.maxZ, 34.0);

  assert.equal(resolveSupportHeight3D(-32.0, 21.0, F3_SUB_Y + 0.5, world), F3_SUB_Y, 'Zone 10 Sub-Crypt resolves at 26.2m');
  assert.equal(resolveSupportHeight3D(0.0, -14.2, F3_L0_Y + 0.5, world), F3_L0_Y, 'Zone 1 Spawn resolves at L0 28.0m');
  assert.equal(resolveSupportHeight3D(-9.8, 1.0, F3_L1_Y + 0.5, world), F3_L1_Y, 'Zone 2 West Cloister resolves at L1 31.1m');
  assert.equal(resolveSupportHeight3D(45.5, 24.0, F3_L2_Y + 0.5, world), F3_L2_Y, 'Zone 11 Throne Dais resolves at L2 34.2m');

  // 2. Opening Sealed Threshold Gate Puzzle (Zone 1 blocks exit into Zone 2 until Cryo-Resonator shot or Keystone switched!)
  const sealedCol = resolveHorizontal3D(0, -4.0, F3_L0_Y + 0.4, 0.38, world.boxes);
  assert.equal(sealedCol.collided, true, 'Opening Threshold Gate must block player before solving puzzle');
  assert.equal(hideout.triggerShootableLock(F3_IDS.lockVestibuleSeal)?.unlockedGate, true, 'Shooting Cryo-Resonator unlocks Threshold Gate');
  for (let i = 0; i < 40; i++) {
    hideout.update(0.05, i * 0.05, new THREE.Vector3(0, F3_L0_Y, -6.0), new THREE.Vector3(0, F3_L0_Y + 2, -8.0));
  }
  const unsealedCol = resolveHorizontal3D(0, -4.0, F3_L0_Y + 0.4, 0.38, world.boxes);
  assert.equal(unsealedCol.collided, false, 'Opening Threshold Gate must be passable once unsealed');

  // 3. Express 12.0m Grand Temple Staircases (L0 28.0m -> L2 34.2m in ONE continuous climb!)
  let prevH = F3_L0_Y;
  for (let i = 0; i <= 12; i++) {
    const x = -28.0 - i * 1.0; // Zone 3 West Ziggurat Express Grand Stair (x: -28 -> -40)
    const h = resolveSupportHeight3D(x, 2.5, prevH + 0.6, world);
    assert.ok(h !== null && h >= prevH - 0.01, `Z3 Express Stair must ascend monotonically at x=${x}: got ${h}, prev=${prevH}`);
    prevH = h;
  }
  assert.ok(Math.abs(prevH - F3_L2_Y) < 0.08, `Z3 Express Stair must reach L2 (${F3_L2_Y}m), got ${prevH}`);

  let prevHE = F3_L0_Y;
  for (let i = 0; i <= 12; i++) {
    const x = 28.0 + i * 1.0; // Zone 9 East Monolith Express Grand Stair (x: +28 -> +40)
    const h = resolveSupportHeight3D(x, 2.5, prevHE + 0.6, world);
    assert.ok(h !== null && h >= prevHE - 0.01, `Z9 Express Stair must ascend monotonically at x=${x}: got ${h}, prev=${prevHE}`);
    prevHE = h;
  }
  assert.ok(Math.abs(prevHE - F3_L2_Y) < 0.08, `Z9 Express Stair must reach L2 (${F3_L2_Y}m), got ${prevHE}`);

  // 4. Two-Stage Stepped Ascent (Zone 2 Cloister: L0->L1 West Stair AND L1->L2 East Stair)
  let z2H1 = F3_L0_Y;
  for (let i = 0; i <= 10; i++) {
    const x = -3.4 - i * 0.58;
    const h = resolveSupportHeight3D(x, 7.7, z2H1 + 0.5, world);
    assert.ok(h !== null && h >= z2H1 - 0.01, `Z2 Stage 1 Stair monotonic at x=${x}: got ${h}`);
    z2H1 = h;
  }
  assert.ok(Math.abs(z2H1 - F3_L1_Y) < 0.08, `Z2 Stage 1 Stair reaches L1 (${F3_L1_Y}m), got ${z2H1}`);

  let z2H2 = F3_L1_Y;
  for (let i = 0; i <= 10; i++) {
    const x = 9.2 - i * 0.58;
    const h = resolveSupportHeight3D(x, 7.7, z2H2 + 0.5, world);
    assert.ok(h !== null && h >= z2H2 - 0.01, `Z2 Stage 2 Stair monotonic at x=${x}: got ${h}`);
    z2H2 = h;
  }
  assert.ok(Math.abs(z2H2 - F3_L2_Y) < 0.08, `Z2 Stage 2 Stair reaches L2 (${F3_L2_Y}m), got ${z2H2}`);

  // 5. Monumental Double-Tier Helical Spiral Staircases (Zone 5 Glacial Crypt: L0 -> L1 junction -> L2!)
  assert.equal(f3.arcRamps.length, 2, 'Zone 5 Glacial Crypt must register 2 stacked helical arcRamps');
  assert.equal(
    resolveSupportHeight3D(-41.0, -15.2, F3_L0_Y + 0.4, world),
    F3_L0_Y,
    'Zone 5 L0 Spiral Entry Landing walkable'
  );
  let helixH = F3_L0_Y;
  const lowerStart = Math.PI * 0.5;
  const lowerEnd = Math.PI * 1.5 - 0.28;
  for (let i = 0; i <= 12; i++) {
    const a = lowerStart + ((lowerEnd - lowerStart) * i) / 12;
    const hx = -43.0 + Math.cos(a) * 3.4;
    const hz = -19.0 + Math.sin(a) * 3.4;
    const h = resolveSupportHeight3D(hx, hz, helixH + 0.5, world);
    assert.ok(h !== null && h >= helixH - 0.02, `Lower Helix monotonic at angle=${a.toFixed(2)}: got ${h}`);
    helixH = h;
  }
  assert.ok(Math.abs(helixH - F3_L1_Y) < 0.12, `Lower Helix reaches L1 (${F3_L1_Y}m), got ${helixH}`);
  // Step cleanly across curved North L1 junction and bridge stub onto L1 North Terrace!
  assert.equal(
    resolveSupportHeight3D(-43.0, -22.4, F3_L1_Y + 0.4, world),
    F3_L1_Y,
    'Zone 5 L1 curved spiral apex junction walkable'
  );
  assert.equal(
    resolveSupportHeight3D(-43.0, -23.6, F3_L1_Y + 0.4, world),
    F3_L1_Y,
    'Zone 5 L1 spiral bridge stub walkable'
  );
  assert.equal(
    resolveSupportHeight3D(-43.0, -25.0, F3_L1_Y + 0.4, world),
    F3_L1_Y,
    'Zone 5 L1 North Terrace reachable straight off spiral apex'
  );
  const upperStart = -Math.PI * 0.5 + 0.28;
  const upperEnd = Math.PI * 0.5;
  for (let i = 0; i <= 12; i++) {
    const a = upperStart + ((upperEnd - upperStart) * i) / 12;
    const hx = -43.0 + Math.cos(a) * 3.4;
    const hz = -19.0 + Math.sin(a) * 3.4;
    const h = resolveSupportHeight3D(hx, hz, helixH + 0.5, world);
    assert.ok(h !== null && h >= helixH - 0.02, `Upper Helix monotonic at angle=${a.toFixed(2)}: got ${h}`);
    helixH = h;
  }
  assert.ok(Math.abs(helixH - F3_L2_Y) < 0.12, `Upper Helix reaches L2 (${F3_L2_Y}m), got ${helixH}`);
  assert.equal(
    resolveSupportHeight3D(-45.0, -15.2, F3_L2_Y + 0.4, world),
    F3_L2_Y,
    'Zone 5 L2 Spiral Exit Landing walkable'
  );

  // 5b. Elevated L1 & L2 inter-zone doorway sills have ZERO floor gap inside 0.62m partition walls
  const elevatedPortalSamples: Array<[string, number, number, number]> = [
    ['Z1<->Z4 L1 West Gallery', -12.0, -9.5, F3_L1_Y],
    ['Z1<->Z7 L2 East Gallery', 12.0, -9.5, F3_L2_Y],
    ['Z2<->Z3 L1 West Portal', -12.0, -1.8, F3_L1_Y],
    ['Z2<->Z9 L2 East Portal', 12.0, 2.5, F3_L2_Y],
    ['Z3<->Z10 L2 SW Portal', -51.5, 9.0, F3_L2_Y],
    ['Z9<->Z11 L2 SE Portal', 47.0, 9.0, F3_L2_Y],
    ['Z12<->Z11 L1/L2 Extraction Gallery', 12.0, 13.0, F3_L2_Y],
  ];
  for (const [label, px, pz, py] of elevatedPortalSamples) {
    assert.equal(
      resolveSupportHeight3D(px, pz, py + 0.4, world),
      py,
      `Elevated portal sill ${label} at (${px}, ${pz}) must support exact height ${py}m`
    );
  }

  // 6. ALL 6 Calibrated Multi-Tier Jump Pads (ZERO WASD input — full ballistic arc onto exact target deck!)
  const expectedPadTargets: Record<string, number> = {
    [F3_IDS.padAqueductL0ToL1]: F3_L1_Y,
    [F3_IDS.padCryptSuperL0ToL2]: F3_L2_Y, // Express L0 -> L2 Super-Lift #1!
    [F3_IDS.padArchiveL1ToL2]: F3_L2_Y,
    [F3_IDS.padSpireSuperL0ToL2]: F3_L2_Y, // Express L0 -> L2 Super-Lift #2!
    [F3_IDS.padCavernSubToL0]: F3_L0_Y,
    [F3_IDS.padReliquaryL1ToL2]: F3_L2_Y,
  };
  assert.equal(f3.jumpPads?.length, 6, 'Floor 03 must have 6 calibrated multi-tier Jump Pads');
  for (const pad of f3.jumpPads!) {
    const targetY = expectedPadTargets[pad.id];
    assert.ok(targetY !== undefined, `Unexpected jump pad ${pad.id}`);
    const state = createInitialLocomotionState(pad.x, pad.z, pad.y);
    const launchEvts = stepWorldMechanics(
      undefined,
      undefined,
      undefined,
      [pad],
      0.016,
      0.1,
      pad.x,
      pad.y,
      pad.z
    );
    assert.equal(launchEvts.length, 1, `Jump pad ${pad.id} must trigger on contact`);
    state.vy = launchEvts[0].launchVy!;
    state.vx = launchEvts[0].launchVx!;
    state.vz = launchEvts[0].launchVz!;
    state.launchPadTimer = 1.65;
    state.jumpHoldTimer = 0;
    state.airTime = 0;
    state.grounded = false;
    for (let step = 0; step < 140; step++) {
      stepLocomotion(state, {
        dt: 1 / 60,
        moveForward: 0,
        moveRight: 0,
        cameraYaw: 0,
        sprintHeld: false,
        crouchHeld: false,
        adsHeld: false,
        jumpJustPressed: false,
        jumpHeld: false,
        rollJustPressed: false,
        colliders: [],
        bounds: world.bounds,
        world3D: world,
      });
      if (state.grounded && step > 15) break;
    }
    assert.equal(state.grounded, true, `Jump pad ${pad.id} must land grounded cleanly`);
    assert.ok(
      Math.abs(state.y - targetY) < 0.08,
      `Jump pad ${pad.id} must land at ${targetY}m (landed at y=${state.y.toFixed(2)}, x=${state.x.toFixed(2)}, z=${state.z.toFixed(2)})`
    );
  }

  // 7. ALL 3 Retractable Level 2 Skybridges (Aqueduct, Monolith & 22.5m Crown Extraction Skybridge!)
  assert.equal(f3.retractableBridges?.length, 3, 'Floor 03 must have 3 Retractable Level 2 Skybridges');
  for (const lockId of [F3_IDS.lockAqueductL2, F3_IDS.lockMonolithL2, F3_IDS.lockCrownExitL2]) {
    assert.equal(hideout.triggerShootableLock(lockId)?.deployedBridge, true, `Relay ${lockId} deploys its L2 Skybridge`);
  }
  for (let i = 0; i < 45; i++) {
    hideout.update(0.05, i * 0.05, new THREE.Vector3(30, F3_L2_Y, 13.0), new THREE.Vector3(30, F3_L2_Y + 2, 11.0));
  }
  assert.equal(resolveSupportHeight3D(-16.2, -18.0, F3_L2_Y + 0.5, world), F3_L2_Y, 'Aqueduct L2 Skybridge walkable');
  assert.equal(resolveSupportHeight3D(33.5, 6.5, F3_L2_Y + 0.5, world), F3_L2_Y, 'Monolith L2 Skybridge walkable');
  assert.equal(resolveSupportHeight3D(30.0, 13.0, F3_L2_Y + 0.5, world), F3_L2_Y, '22.5m Crown Extraction L2 Skybridge walkable');

  // 8. ALL 2 Jammed Roll-Under Ice-Blast Shutters (block stand/crouch, clear Dodge Roll 0.84m!)
  assert.equal(f3.tacticalDoors?.length, 2, 'Floor 03 must have 2 Jammed Roll-Under Shutters');
  for (const door of f3.tacticalDoors!) {
    for (let i = 0; i < 35; i++) {
      stepTacticalDoors([door], 0.05, i * 0.05, door.position.x, door.position.y, door.position.z + 1.5);
    }
    const standBlocked = resolveHorizontal3D(door.position.x, door.position.z, door.position.y, 0.36, [door.collider], undefined, 1.75).collided;
    const crouchBlocked = resolveHorizontal3D(door.position.x, door.position.z, door.position.y, 0.36, [door.collider], undefined, 1.28).collided;
    const rollBlocked = resolveHorizontal3D(door.position.x, door.position.z, door.position.y, 0.36, [door.collider], undefined, 0.84).collided;
    assert.equal(standBlocked, true, `${door.id} must block standing`);
    assert.equal(crouchBlocked, true, `${door.id} must block crouching`);
    assert.equal(rollBlocked, false, `${door.id} must allow dodge-roll underneath`);
  }

  // 9. Remote Level 2 Master Control Center inside Zone 11 (`(45.5, 34.2, 24.0)`)!
  assert.equal(f3.controlCenter.position.x, F3_CONTROL_CENTER_POS.x);
  assert.equal(f3.controlCenter.position.y, F3_L2_Y, 'Control Center MUST sit on Level 2 (34.2m), NOT L0!');
  assert.equal(f3.controlCenter.position.z, F3_CONTROL_CENTER_POS.z);

  // Must NOT be reachable from L0 (`28.0m`) directly underneath it!
  assert.equal(
    hideout.getNearbyInteraction(F3_CONTROL_CENTER_POS.x, F3_L0_Y, F3_CONTROL_CENTER_POS.z),
    null,
    'Remote Level 2 Control Center must reject interaction from L0 underneath'
  );
  // MUST be reachable when physically standing on the Level 2 Throne Dais (`34.2m`)!
  const nearbyCC = hideout.getNearbyInteraction(
    F3_CONTROL_CENTER_POS.x - 1.2,
    F3_L2_Y,
    F3_CONTROL_CENTER_POS.z
  );
  assert.equal(
    nearbyCC?.kind,
    'control_center',
    'Remote Level 2 Control Center must be interactive on Level 2 Throne Dais'
  );
  assert.equal(hideout.unlockFloorDoor(3), true, 'Activating Remote Level 2 Control Center unseals Bulkhead 03');
  for (let i = 0; i < 40; i++) {
    hideout.update(0.05, i * 0.05, new THREE.Vector3(0, F3_L0_Y, 15.0), new THREE.Vector3(0, F3_L0_Y + 2, 13.0));
  }
  assert.equal(hideout.floors[2].group.visible, true, 'Activating Floor 03 Control Center wakes Floor 02 below');
  assert.equal(f3.exitDoor.collider.active, false, 'Exit Bulkhead 03 in Zone 12 must be wide open');

  hideout.dispose();
});

test('Solid 3D underside, side-thickness & opposite-end collision blocks phasing through slabs, ring slabs, and ramps', () => {
  const world = makeBaseWorld({
    slabs: [
      { minX: -20, maxX: 20, minZ: -20, maxZ: 20, y: 0, thickness: 0.6 },
      // Elevated overhanging platform deck: top at y = 3.2, underside at y = 2.78
      { minX: -3, maxX: 3, minZ: -3, maxZ: 3, y: 3.2, thickness: 0.42 },
    ],
    ringSlabs: [
      // Elevated ring deck: top at y = 3.6, underside at y = 3.12
      { centerX: 10, centerZ: 0, innerRadius: 1.5, outerRadius: 4.0, y: 3.6, thickness: 0.48 },
    ],
    ramps: [
      // Straight staircase along +Z: low entry at z = 6 (y = 0) -> high exit at z = 12 (y = 3.0)
      { minX: -1.5, maxX: 1.5, minZ: 6, maxZ: 12, axis: 'z', yStart: 0, yEnd: 3.0 },
    ],
  });

  // 1. Jumping / super-launching directly under an elevated slab MUST bonk underside (NEVER phase up onto deck!)
  const underSlab = createInitialLocomotionState(0, 0, 0);
  underSlab.vy = 16.0;
  underSlab.grounded = false;
  let maxSlabY = 0;
  for (let i = 0; i < 60; i++) {
    stepLocomotion(underSlab, {
      dt: 1 / 60,
      moveForward: 0,
      moveRight: 0,
      cameraYaw: 0,
      sprintHeld: false,
      crouchHeld: false,
      adsHeld: false,
      jumpJustPressed: false,
      jumpHeld: false,
      rollJustPressed: false,
      colliders: [],
      bounds: world.bounds,
      world3D: world,
    });
    if (underSlab.y > maxSlabY) maxSlabY = underSlab.y;
  }
  assert.ok(
    maxSlabY + 1.75 <= 2.78 + 0.04,
    `Jumping under slab must bonk underside (2.78m); reached head y=${(maxSlabY + 1.75).toFixed(2)}m`
  );
  assert.ok(underSlab.y < 0.2, `Player must land back on ground after underside bonk, got y=${underSlab.y.toFixed(2)}`);

  // 2. Direct ceiling query under ring slab and ramp underside (returns clamped feetY = underside - headHeight!)
  const ringCeil = resolveCeilingHeight3D(12.5, 0, 0.5, 2.0, 1.75, 0.36, world);
  assert.ok(ringCeil !== null && Math.abs(ringCeil + 1.75 - 3.12) < 0.05, `Ring underside must clamp head at ~3.12m, got ${ringCeil !== null ? ringCeil + 1.75 : null}`);
  const rampCeil = resolveCeilingHeight3D(0, 11.4, 0.0, 1.2, 1.75, 0.36, world);
  assert.ok(rampCeil !== null && rampCeil + 1.75 < 2.6, `Ramp high-end underside must clamp head below 2.6m, got ${rampCeil !== null ? rampCeil + 1.75 : null}`);

  // 3. Walking from the opposite/back direction into the sloped ramp underside (z = 10.0 -> deck at 2.0m, underside 1.58m < 1.75m head)
  //    or into the side flank (x = 1.3, z = 9.0 -> deck at 1.5m) is 100% BLOCKED!
  const rampBack = resolveWorldHorizontal3D(0, 10.0, 0, 0.36, world, undefined, 1.75, 0.44);
  assert.equal(rampBack.collided, true, 'Opposite/back approach into sloped staircase underside must block walking through it');
  assert.ok(rampBack.z >= 10.34, `Player must be pushed back out of low stair underside, got z=${rampBack.z.toFixed(2)}`);

  const rampSide = resolveWorldHorizontal3D(1.3, 9.0, 0, 0.36, world, undefined, 1.75, 0.44);
  assert.equal(rampSide.collided, true, 'Side flank of elevated staircase must block walking through it');
  assert.ok(rampSide.x >= 1.84, `Player must be pushed outside x=1.5 flank, got x=${rampSide.x.toFixed(2)}`);

  // 4. Walking horizontally into the side thickness of an elevated slab (feetY = 2.0 -> body intersects [2.78, 3.2]) is BLOCKED
  const slabSide = resolveWorldHorizontal3D(2.9, 0, 2.0, 0.36, world, undefined, 1.75, 0.16);
  assert.equal(slabSide.collided, true, 'Elevated slab side edge must block horizontal phasing');
  assert.ok(slabSide.x >= 3.34, `Player must be pushed clear of x=3.0 slab edge, got x=${slabSide.x.toFixed(2)}`);

  // 5. Climbing UP from the low entrance (z = 6 -> 12) must remain 100% snag-free!
  const climber = createInitialLocomotionState(0, 5.2, 0);
  climber.grounded = true;
  for (let i = 0; i < 180; i++) {
    stepLocomotion(climber, {
      dt: 1 / 60,
      moveForward: 1,
      moveRight: 0,
      cameraYaw: Math.PI, // forward along +Z
      sprintHeld: true,
      crouchHeld: false,
      adsHeld: false,
      jumpJustPressed: false,
      jumpHeld: false,
      rollJustPressed: false,
      colliders: [],
      bounds: world.bounds,
      world3D: world,
    });
    if (climber.z >= 11.8) break;
  }
  assert.ok(climber.y >= 2.85, `Climbing staircase from low entrance must reach top cleanly, got y=${climber.y.toFixed(2)}`);
});

test('All 36 Jump Pads across Floors 7 -> 1 launch cleanly from every point on trigger radius with zero underside bonks', () => {
  const hideout = createEightFloorHideout(null, null, true);

  for (const floorNum of [7, 6, 5, 4, 3, 2, 1] as const) {
    hideout.teleportToFloor(floorNum);
    const floor = hideout.floors[floorNum];
    const world = hideout.activeCollisionWorld;
    const pads = floor.jumpPads ?? [];
    assert.ok(pads.length > 0, `Floor 0${floorNum} must expose jump pads`);

    for (const pad of pads) {
      const dirX = Math.sign(pad.launchVx || 0);
      const dirZ = Math.sign(pad.launchVz || 0);
      for (const frac of [-0.95, -0.5, 0, 0.5, 0.95]) {
        const off = frac * pad.radius;
        const sx = pad.x + dirX * off;
        const sz = pad.z + dirZ * off;
        const sy = pad.y;
        const state = createInitialLocomotionState(sx, sz, sy);
        state.grounded = true;
        pad.cooldown = 0;
        const evts = stepWorldMechanics(undefined, undefined, undefined, [pad], 0.016, 0.1, sx, sy, sz);
        assert.equal(evts.length, 1, `F0${floorNum} ${pad.id} must trigger at frac=${frac}`);

        state.vy = evts[0].launchVy!;
        state.vx = evts[0].launchVx!;
        state.vz = evts[0].launchVz!;
        state.launchPadTimer = 1.65;
        state.jumpHoldTimer = 0;
        state.airTime = 0;
        state.grounded = false;

        let bonked = false;
        let prevVy = state.vy;
        for (let step = 0; step < 180; step++) {
          stepLocomotion(state, {
            dt: 1 / 60,
            moveForward: 0,
            moveRight: 0,
            cameraYaw: 0,
            sprintHeld: false,
            crouchHeld: false,
            adsHeld: false,
            jumpJustPressed: false,
            jumpHeld: false,
            rollJustPressed: false,
            colliders: [],
            bounds: world.bounds,
            world3D: world,
          });
          if (prevVy > 1.2 && state.vy === 0 && !state.grounded) {
            bonked = true;
          }
          prevVy = state.vy;
          if (state.grounded && step > 15) break;
        }
        assert.equal(bonked, false, `F0${floorNum} ${pad.id} (frac=${frac}) must NOT bonk underside`);
        assert.equal(state.grounded, true, `F0${floorNum} ${pad.id} (frac=${frac}) must land grounded`);
        assert.ok(
          state.y - sy >= 1.7,
          `F0${floorNum} ${pad.id} (frac=${frac}) must gain >=1.7m elevation (gained ${(state.y - sy).toFixed(2)}m)`
        );
      }
    }
  }

  hideout.dispose();
});

test('Floor 03 sunken pits are watertight with escape stairs, central Astrolabe plinth is solid, and rotated Control Center matches geometry', () => {
  const hideout = createEightFloorHideout(null, null, true);
  hideout.teleportToFloor(3);
  const world = hideout.activeCollisionWorld;

  // 1. Zone 2 Astrolabe Well: Central octagonal plinth (`x ∈ [-1.72, 1.72], z ∈ [0.78, 4.22]`) is 100% solid from all 4 sides & standable on top!
  for (const [px, pz, label] of [
    [0, 0.9, 'North'],
    [0, 4.1, 'South'],
    [-1.6, 2.5, 'West'],
    [1.6, 2.5, 'East'],
  ] as const) {
    const col = resolveWorldHorizontal3D(px, pz, F3_SUB_Y, 0.36, world, undefined, 1.75, 0.44);
    assert.equal(col.collided, true, `Astrolabe central plinth must block entry from ${label} (${px}, ${pz})`);
  }
  const plinthTop = resolveSupportHeight3D(0, 2.5, F3_SUB_Y + 1.2, world);
  assert.ok(
    plinthTop !== null && Math.abs(plinthTop - (F3_SUB_Y + 0.74)) < 0.05,
    `Central Astrolabe plinth top must be standable at ${(F3_SUB_Y + 0.74).toFixed(2)}m, got ${plinthTop}`
  );

  // 2. Zone 2 Astrolabe Well: Pushing into all 4 pit walls stays contained inside x ∈ [-3.6, +3.6], z ∈ [-0.6, +5.6] with ZERO void fall / respawn!
  for (const [startX, startZ, yaw, label] of [
    [-2.4, 2.5, Math.PI * 0.5, 'West pit wall'],
    [2.4, 2.5, -Math.PI * 0.5, 'East pit wall'],
    [0.0, 4.8, Math.PI, 'South pit wall'],
    [-2.0, 0.2, 0, 'North pit wall'],
  ] as const) {
    const walker = createInitialLocomotionState(startX, startZ, F3_SUB_Y);
    walker.grounded = true;
    for (let i = 0; i < 90; i++) {
      stepLocomotion(walker, {
        dt: 1 / 60,
        moveForward: 1,
        moveRight: 0,
        cameraYaw: yaw,
        sprintHeld: true,
        crouchHeld: false,
        adsHeld: false,
        jumpJustPressed: false,
        jumpHeld: false,
        rollJustPressed: false,
        colliders: [],
        bounds: world.bounds,
        world3D: world,
      });
    }
    assert.ok(
      walker.y >= F3_SUB_Y - 0.1 && walker.y <= F3_SUB_Y + 0.9,
      `Pushing into Zone 2 ${label} must NEVER fall into void or respawn (y=${walker.y.toFixed(2)}, x=${walker.x.toFixed(2)}, z=${walker.z.toFixed(2)})`
    );
    assert.ok(
      walker.x >= -3.65 && walker.x <= 3.65 && walker.z >= -0.65 && walker.z <= 5.65,
      `Zone 2 ${label} must contain player inside pit bounds (x=${walker.x.toFixed(2)}, z=${walker.z.toFixed(2)})`
    );
  }

  // 3. Zone 2 NE Escape Stair (`x = 2.9, z: +2.4 -> -0.6`) climbs smoothly back to L0 (`28.0m`)!
  let z2EscY = F3_SUB_Y;
  for (let i = 0; i <= 10; i++) {
    const z = 2.4 - i * 0.3;
    const h = resolveSupportHeight3D(2.9, z, z2EscY + 0.5, world);
    assert.ok(h !== null && h >= z2EscY - 0.02, `Zone 2 NE Escape Stair monotonic at z=${z.toFixed(2)}: got ${h}`);
    z2EscY = h;
  }
  assert.ok(Math.abs(z2EscY - F3_L0_Y) < 0.08, `Zone 2 NE Escape Stair must reach L0 (${F3_L0_Y}m), got ${z2EscY}`);

  // 4. Zone 5 Crypt Well, Zone 10 Cavern Basin & Zone 11 Mirror Basin retaining walls + escape stairs!
  assert.equal(resolveWorldHorizontal3D(-47.6, -19.0, F3_SUB_Y, 0.36, world, undefined, 1.75, 0.44).collided, true, 'Zone 5 Crypt Well West wall solid');
  assert.equal(resolveWorldHorizontal3D(-38.4, -19.0, F3_SUB_Y, 0.36, world, undefined, 1.75, 0.44).collided, true, 'Zone 5 Crypt Well East wall solid');
  let z5EscY = F3_SUB_Y;
  for (let i = 0; i <= 10; i++) {
    const z = -20.8 - i * 0.3;
    const h = resolveSupportHeight3D(-38.9, z, z5EscY + 0.5, world);
    assert.ok(h !== null && h >= z5EscY - 0.02, `Zone 5 NE Escape Stair monotonic at z=${z.toFixed(2)}: got ${h}`);
    z5EscY = h;
  }
  assert.ok(Math.abs(z5EscY - F3_L0_Y) < 0.08, `Zone 5 NE Escape Stair reaches L0 (${F3_L0_Y}m), got ${z5EscY}`);

  assert.equal(resolveWorldHorizontal3D(-24.2, 21.0, F3_SUB_Y, 0.36, world, undefined, 1.75, 0.44).collided, true, 'Zone 10 Cavern Basin East wall solid');
  assert.equal(resolveWorldHorizontal3D(-40.8, 22.0, F3_SUB_Y, 0.36, world, undefined, 1.75, 0.44).collided, true, 'Zone 10 Cavern Basin West wall solid');
  assert.equal(resolveWorldHorizontal3D(-37.2, 18.0, F3_SUB_Y, 0.36, world, undefined, 1.75, 0.44).collided, false, 'Zone 10 West Cavern Stair low entrance open');
  let z10EscY = F3_SUB_Y;
  for (let i = 0; i <= 10; i++) {
    const x = -37.2 - i * 0.38;
    const h = resolveSupportHeight3D(x, 18.0, z10EscY + 0.5, world);
    assert.ok(h !== null && h >= z10EscY - 0.02, `Zone 10 West Cavern Stair monotonic at x=${x.toFixed(2)}: got ${h}`);
    z10EscY = h;
  }
  assert.ok(Math.abs(z10EscY - F3_L0_Y) < 0.08, `Zone 10 West Cavern Stair reaches L0 (${F3_L0_Y}m), got ${z10EscY}`);

  assert.equal(resolveWorldHorizontal3D(36.8, 21.5, F3_SUB_Y, 0.36, world, undefined, 1.75, 0.44).collided, true, 'Zone 11 Mirror Basin East wall solid');
  assert.equal(resolveWorldHorizontal3D(23.2, 21.0, F3_SUB_Y, 0.36, world, undefined, 1.75, 0.44).collided, true, 'Zone 11 Mirror Basin West wall solid');
  let z11EscY = F3_SUB_Y;
  for (let i = 0; i <= 10; i++) {
    const x = 26.0 - i * 0.3;
    const h = resolveSupportHeight3D(x, 26.2, z11EscY + 0.5, world);
    assert.ok(h !== null && h >= z11EscY - 0.02, `Zone 11 SW Escape Stair monotonic at x=${x.toFixed(2)}: got ${h}`);
    z11EscY = h;
  }
  assert.ok(Math.abs(z11EscY - F3_L0_Y) < 0.08, `Zone 11 SW Escape Stair reaches L0 (${F3_L0_Y}m), got ${z11EscY}`);

  // 5. Rotated Floor 03 Control Center (`rotY = -π/2` at `(45.5, 34.2, 24.0)`) has rotated Z-wide AABB!
  assert.equal(
    resolveWorldHorizontal3D(F3_CONTROL_CENTER_POS.x, F3_CONTROL_CENTER_POS.z + 1.05, F3_L2_Y, 0.36, world, undefined, 1.75, 0.44).collided,
    true,
    'Rotated Control Center must block along its long Z axis (+1.05m)'
  );
  assert.equal(
    resolveWorldHorizontal3D(F3_CONTROL_CENTER_POS.x - 0.95, F3_CONTROL_CENTER_POS.z, F3_L2_Y, 0.36, world, undefined, 1.75, 0.44).collided,
    true,
    'Rotated Control Center must block from West approach (-0.95m)'
  );

  // 6. Floor 02 Composite Maglev Locomotive & Rotated Level 2 Control Center have solid colliders!
  const f2Spawn = hideout.teleportToFloor(2);
  const f2World = hideout.activeCollisionWorld;
  assert.equal(
    resolveWorldHorizontal3D(0, 0.5, F2_TRACK_Y, 0.36, f2World, undefined, 1.75, 0.44).collided,
    true,
    'Floor 02 Maglev Locomotive cab must be solid'
  );
  assert.equal(
    resolveWorldHorizontal3D(F2_CONTROL_CENTER_POS.x, F2_CONTROL_CENTER_POS.z + 1.05, F2_L2_Y, 0.36, f2World, undefined, 1.75, 0.44).collided,
    true,
    'Floor 02 rotated Control Center must block along its long Z axis (+1.05m)'
  );
  assert.equal(f2Spawn.y, F2_L0_Y, 'Floor 02 spawn must sit at F2_L0_Y');

  hideout.dispose();
});

test('Floor 02 Voltaic Maglev Metropolis: 12-zone 3-story layout, customs puzzle, 12m express stairs, Zone 8 spiral, 3 skybridges, 2 jammed shutters, vault & remote L2 Control Center', () => {
  const hideout = createEightFloorHideout(null, null, true);
  const spawn = hideout.teleportToFloor(2);
  const floor2 = hideout.floors[2];
  const world = hideout.activeCollisionWorld;

  // 1. Scale, 8 OcclusionCells, 42 targets, 12 ammo crates, 6 jump pads, 3 bridges, 3 gates, 2 jammed shutters!
  assert.equal(floor2.occlusionCells?.length, 8, 'Floor 02 must expose 8 outer OcclusionCells');
  assert.equal(floor2.bounds?.minX, -56);
  assert.equal(floor2.bounds?.maxX, 56);
  assert.equal(floor2.bounds?.minZ, -34);
  assert.equal(floor2.bounds?.maxZ, 34);
  assert.equal(floor2.jumpPads?.length, 6, 'Floor 02 must have 6 calibrated jump pads');
  assert.equal(floor2.retractableBridges?.length, 3, 'Floor 02 must have 3 retractable L2 skybridges');
  assert.equal(floor2.securityGates?.length, 3, 'Floor 02 must have 3 locked security gates');
  assert.equal(floor2.tacticalDoors?.filter((d) => d.mode === 'jammed_roll').length, 2, 'Floor 02 must have 2 jammed roll-under shutters');
  assert.ok((floor2.animatedSpinners?.length ?? 0) >= 8, 'Floor 02 must feature kinetic spinning machinery & halos');
  assert.ok((floor2.explosiveBarrels?.length ?? 0) >= 16, 'Floor 02 must feature explosive plasma barrels');
  assert.equal(spawn.x, 0);
  assert.equal(spawn.y, F2_L0_Y);
  assert.equal(spawn.z, 14.2);

  // 2. Opening Sealed Customs Shutter puzzle (`z = +4.0`) blocks L0 until breaker shot OR switch flipped!
  const blockedCustoms = resolveWorldHorizontal3D(0, 4.0, F2_L0_Y, 0.36, world, undefined, 1.75, 0.44);
  assert.equal(blockedCustoms.collided, true, 'Customs Lockdown Shutter must block entry into Maglev Canyon initially');
  const breachRes = hideout.triggerShootableLock(F2_IDS.lockCustomsSeal);
  assert.ok(breachRes && breachRes.unlockedGate, 'Shooting Customs Breaker Relay must unseal Customs Shutter');
  for (let i = 0; i < 60; i++) {
    stepWorldMechanics(floor2.retractableBridges, floor2.securityGates, floor2.shootableLocks, floor2.jumpPads, 0.05, i * 0.05, 0, F2_L0_Y, 10);
  }
  const openedCustoms = resolveWorldHorizontal3D(0, 4.0, F2_L0_Y, 0.36, world, undefined, 1.75, 0.44);
  assert.equal(openedCustoms.collided, false, 'Customs Shutter must allow unobstructed entry once breached');

  // 3. Recessed Track Channel (13.6m) & Maglev Locomotive walkable flatbed (14.6m)
  assert.ok(Math.abs((resolveSupportHeight3D(-2.2, -2.3, F2_L0_Y, world) ?? -1) - F2_TRACK_Y) < 0.05, 'Inductive track bed at 13.6m');
  assert.ok(Math.abs((resolveSupportHeight3D(0, -4.9, F2_L0_Y + 1.0, world) ?? -1) - (F2_TRACK_Y + 1.0)) < 0.05, 'Locomotive flatbed walkable top at 14.6m');

  // 4. Zone 2 Two-Stage Ascent (`L0 -> L1` West stair `z = 2.69`, `L1 -> L2` East stair `z = 2.69`)!
  let z2St1 = F2_L0_Y;
  for (let i = 0; i <= 10; i++) {
    const x = -3.4 - i * 0.58;
    const h = resolveSupportHeight3D(x, 2.69, z2St1 + 0.5, world);
    assert.ok(h !== null && h >= z2St1 - 0.03, `Zone 2 Stage 1 stair monotonic at x=${x.toFixed(2)}`);
    z2St1 = h;
  }
  assert.ok(Math.abs(z2St1 - F2_L1_Y) < 0.08, `Zone 2 Stage 1 reaches L1 (${F2_L1_Y}m), got ${z2St1}`);

  let z2St2 = F2_L1_Y;
  for (let i = 0; i <= 10; i++) {
    const x = 9.2 - i * 0.58;
    const h = resolveSupportHeight3D(x, 2.69, z2St2 + 0.5, world);
    assert.ok(h !== null && h >= z2St2 - 0.03, `Zone 2 Stage 2 stair monotonic at x=${x.toFixed(2)}`);
    z2St2 = h;
  }
  assert.ok(Math.abs(z2St2 - F2_L2_Y) < 0.08, `Zone 2 Stage 2 reaches L2 (${F2_L2_Y}m), got ${z2St2}`);

  // 5. Twin 12.0m Express Grand Staircases (`L0 14.0m -> L2 20.2m` in Zone 3 West & Zone 9 East!)
  let z3Exp = F2_L0_Y;
  for (let i = 0; i <= 12; i++) {
    const x = -29.0 - i * 1.0;
    const h = resolveSupportHeight3D(x, -2.5, z3Exp + 0.65, world);
    assert.ok(h !== null && h >= z3Exp - 0.03, `Zone 3 Express Stair monotonic at x=${x.toFixed(2)}`);
    z3Exp = h;
  }
  assert.ok(Math.abs(z3Exp - F2_L2_Y) < 0.08, `Zone 3 Express Stair reaches L2 (${F2_L2_Y}m), got ${z3Exp}`);

  let z9Exp = F2_L0_Y;
  for (let i = 0; i <= 12; i++) {
    const x = 29.0 + i * 1.0;
    const h = resolveSupportHeight3D(x, -2.5, z9Exp + 0.65, world);
    assert.ok(h !== null && h >= z9Exp - 0.03, `Zone 9 Express Stair monotonic at x=${x.toFixed(2)}`);
    z9Exp = h;
  }
  assert.ok(Math.abs(z9Exp - F2_L2_Y) < 0.08, `Zone 9 Express Stair reaches L2 (${F2_L2_Y}m), got ${z9Exp}`);

  // 6. Zone 8 Stacked Double-Helix Curved Spiral Cooling Silo (`L0 -> L1 curved ring apex -> L2`!)
  assert.equal(floor2.arcRamps?.length, 2, 'Zone 8 Cooling Silo must provide 2 stacked WalkableArcRamps');
  const cx = 45.0;
  const cz = 19.0;
  const rMid = 3.4;
  let z8Y = F2_L0_Y;
  // Lower Helix (`-π/2 -> +π/2 - 0.28`)
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI * 0.5 + (i / 10) * (Math.PI - 0.28);
    const h = resolveSupportHeight3D(cx + Math.cos(a) * rMid, cz + Math.sin(a) * rMid, z8Y + 0.55, world);
    assert.ok(h !== null && h >= z8Y - 0.04, `Zone 8 Lower Helix monotonic at step ${i}`);
    z8Y = h;
  }
  assert.ok(Math.abs(z8Y - F2_L1_Y) < 0.1, `Zone 8 Lower Helix reaches L1 (${F2_L1_Y}m), got ${z8Y}`);
  // Curved L1 South Apex Ring + Bridge Stub onto South Terrace
  assert.ok(Math.abs((resolveSupportHeight3D(45.0, 22.4, F2_L1_Y + 0.5, world) ?? -1) - F2_L1_Y) < 0.06, 'Zone 8 curved L1 South apex junction deck at 17.1m');
  assert.ok(Math.abs((resolveSupportHeight3D(45.0, 23.7, F2_L1_Y + 0.5, world) ?? -1) - F2_L1_Y) < 0.06, 'Zone 8 L1 spiral bridge stub connects cleanly to South Terrace');
  // Upper Helix (`+π/2 + 0.28 -> +3π/2`)
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * 0.5 + 0.28 + (i / 10) * (Math.PI - 0.28);
    const h = resolveSupportHeight3D(cx + Math.cos(a) * rMid, cz + Math.sin(a) * rMid, z8Y + 0.55, world);
    assert.ok(h !== null && h >= z8Y - 0.04, `Zone 8 Upper Helix monotonic at step ${i}`);
    z8Y = h;
  }
  assert.ok(Math.abs(z8Y - F2_L2_Y) < 0.1, `Zone 8 Upper Helix reaches L2 (${F2_L2_Y}m), got ${z8Y}`);

  // 7. Zero-Gap Elevated Portal Sills across inter-zone partition walls!
  for (const [px, pz, py, label] of [
    [-12.0, 1.8, F2_L1_Y, 'Z2<->Z3 L1'],
    [-12.0, -2.5, F2_L2_Y, 'Z2<->Z3 L2'],
    [12.0, -13.0, F2_L2_Y, 'Z12<->Z11 L2'],
    [-12.0, -13.0, F2_L2_Y, 'Z12<->Z10 L2'],
    [-34.0, 10.0, F2_L2_Y, 'Z4<->Z5 L2'],
    [34.0, 27.0, F2_L1_Y, 'Z6<->Z8 L1'],
  ] as const) {
    const sillH = resolveSupportHeight3D(px, pz, py + 0.5, world);
    assert.ok(sillH !== null && Math.abs(sillH - py) < 0.06, `Zero-gap portal sill ${label} must support at ${py}m, got ${sillH}`);
  }

  // 8. Both Jammed Roll-Under Blast Shutters lift halfway on approach, block stand/crouch, and allow Dodge-Rolling (0.84m)!
  for (const door of floor2.tacticalDoors!) {
    for (let i = 0; i < 35; i++) {
      stepTacticalDoors([door], 0.05, i * 0.05, door.position.x, door.position.y, door.position.z + 1.5);
    }
    assert.equal(resolveWorldHorizontal3D(door.position.x, door.position.z, F2_L0_Y, 0.36, world, undefined, 1.75, 0.44).collided, true, `${door.id} blocks standing`);
    assert.equal(resolveWorldHorizontal3D(door.position.x, door.position.z, F2_L0_Y, 0.36, world, undefined, 1.28, 0.44).collided, true, `${door.id} blocks crouching`);
    assert.equal(resolveWorldHorizontal3D(door.position.x, door.position.z, F2_L0_Y, 0.36, world, undefined, 0.84, 0.44).collided, false, `${door.id} allows dodge-roll underneath`);
  }

  // 9. Sealed SE Black-Market Munitions Vault (`f2_gate_blackmarket_vault`) is watertight overhead & opens when sniping relay through glass!
  assert.ok(Math.abs((resolveSupportHeight3D(29.0, 26.0, F2_L1_Y + 0.5, world) ?? -1) - F2_L1_Y) < 0.06, 'Black-Market Vault has watertight L1 ceiling right behind North glass wall');
  assert.equal(resolveWorldHorizontal3D(24.5, 29.6, F2_L0_Y, 0.36, world, undefined, 1.75, 0.44).collided, true, 'Black-Market Vault gate starts locked');
  const vaultLock = hideout.triggerShootableLock(F2_IDS.lockBlackMarketVault);
  assert.ok(vaultLock && vaultLock.unlockedGate, 'Sniping Black-Market Vault relay unlocks gate');
  for (let i = 0; i < 60; i++) {
    stepWorldMechanics(floor2.retractableBridges, floor2.securityGates, floor2.shootableLocks, floor2.jumpPads, 0.05, i * 0.05, 24.5, F2_L0_Y, 29.6);
  }
  assert.equal(resolveWorldHorizontal3D(24.5, 29.6, F2_L0_Y, 0.36, world, undefined, 1.75, 0.44).collided, false, 'Black-Market Vault gate open after relay shattered');

  // 10. All 3 Retractable Level 2 Skybridges (including 22.5m High-Line Extraction Bridge in Zone 10!)
  const retractedHighlineH = resolveSupportHeight3D(-31.0, -13.0, F2_L2_Y + 0.5, world) ?? -1;
  assert.ok(retractedHighlineH < F2_L2_Y - 1.5 && Math.abs(retractedHighlineH - F2_L1_Y) < 0.06, `High-Line Skybridge retracted initially (drops to L1 ${F2_L1_Y}m, got ${retractedHighlineH})`);
  for (const swId of [F2_IDS.switchSmelterL2, F2_IDS.switchLocomotiveL2, F2_IDS.switchHighlineExitL2]) {
    const swRes = hideout.activateWorldSwitch(swId);
    assert.ok(swRes && swRes.deployedBridge, `Switch ${swId} deploys L2 skybridge`);
  }
  for (let i = 0; i < 80; i++) {
    stepWorldMechanics(floor2.retractableBridges, floor2.securityGates, floor2.shootableLocks, floor2.jumpPads, 0.05, i * 0.05, -31.0, F2_L2_Y, -13.0);
  }
  assert.ok(Math.abs((resolveSupportHeight3D(-34.0, -6.8, F2_L2_Y + 0.5, world) ?? -1) - F2_L2_Y) < 0.06, 'Smelter L2 Skybridge walkable once deployed');
  assert.ok(Math.abs((resolveSupportHeight3D(34.0, -6.8, F2_L2_Y + 0.5, world) ?? -1) - F2_L2_Y) < 0.06, 'Locomotive L2 Skybridge walkable once deployed');
  assert.ok(Math.abs((resolveSupportHeight3D(-31.0, -13.0, F2_L2_Y + 0.5, world) ?? -1) - F2_L2_Y) < 0.06, '22.5m High-Line Extraction L2 Skybridge walkable once deployed');

  // 11. Remote Level 2 Signal Tower Master Control Center isolation (L0 rejected, L2 unlocks Exit Bulkhead 02 & wakes Floor 01!)
  assert.equal(
    hideout.getNearbyInteraction(F2_CONTROL_CENTER_POS.x + 1.4, F2_L0_Y, F2_CONTROL_CENTER_POS.z),
    null,
    'Floor 02 Master Control Center MUST NOT be interactable from L0 underneath!'
  );
  const nearCmd = hideout.getNearbyInteraction(F2_CONTROL_CENTER_POS.x + 1.4, F2_L2_Y, F2_CONTROL_CENTER_POS.z);
  assert.ok(nearCmd && nearCmd.kind === 'control_center' && nearCmd.floor === 2, 'Master Control Center interactable on L2 Dais');
  const cmdRes = hideout.triggerInteraction(F2_CONTROL_CENTER_POS.x + 1.4, F2_L2_Y, F2_CONTROL_CENTER_POS.z);
  assert.ok(cmdRes && cmdRes.kind === 'control_center', 'Activating L2 Master Control Center succeeds');
  assert.equal(hideout.floors[1].group.visible, true, 'Unlocking Floor 02 wakes Floor 01 Eclipse Sovereign Colosseum cleanly!');

  hideout.dispose();
});

test('Floor 01 Eclipse Sovereign Colosseum: 24.6m unified boss arena, 4 vertical tiers, minSafeY=-24, cover walls/pillars, twin stacked spiral towers, siege skybridges, sealed armory vaults & L2 Sovereign Control Center', () => {
  const hideout = createEightFloorHideout(null, null, true);
  const spawn = hideout.teleportToFloor(1);
  const floor1 = hideout.floors[1];
  const world = hideout.activeCollisionWorld;

  // 1. Scale, 4 vertical tiers, minSafeY = -24.0, mechanics & spawn on L2 Omen Vestibule
  assert.equal(spawn.x, 0);
  assert.equal(spawn.y, F1_L2_Y);
  assert.equal(spawn.z, -13.8);
  assert.equal(world.minSafeY, F1_MIN_SAFE_Y, 'Floor 01 must set minSafeY=-24.0 so fighting on L0=-12.0m never triggers fall-respawn');
  assert.equal(floor1.jumpPads?.length, 6, 'Floor 01 must provide 6 calibrated Gravity-Vortex Jump Pads');
  assert.equal(floor1.retractableBridges?.length, 2, 'Floor 01 must provide 2 Retractable Aerial Siege Skybridges');
  assert.equal(floor1.securityGates?.length, 2, 'Floor 01 must provide 2 Sealed Reliquary Armory Vaults');
  assert.equal(floor1.arcRamps?.length, 4, 'Floor 01 must provide 4 stacked spiral arc ramps (2 per tower: L0->L1->L2)');
  assert.ok((floor1.animatedSpinners?.length ?? 0) >= 3, 'Floor 01 Black-Sun Singularity must have 3 counter-rotating celestial rings');
  assert.ok((floor1.explosiveBarrels?.length ?? 0) >= 10, 'Floor 01 must provide 10 explosive barrels');

  // 2. All 4 Playable Vertical Tiers + Central Stepped Boss Throne Dais (`y = -11.2m`)
  assert.ok(Math.abs((resolveSupportHeight3D(0, 0.5, F1_L2_Y + 0.5, world) ?? -99) - F1_L2_Y) < 0.05, 'Sovereign Viewing Overlook at L2=0.0m');
  assert.ok(Math.abs((resolveSupportHeight3D(0, 20.0, F1_L0_Y + 0.5, world) ?? -99) - F1_L0_Y) < 0.05, 'Sunken Boss Colosseum Pit floor at L0=-12.0m');
  assert.ok(Math.abs((resolveSupportHeight3D(0, 40.0, F1_L0_Y + 1.5, world) ?? -99) - (F1_L0_Y + 0.8)) < 0.06, 'Central Boss Throne Dais walkable at -11.2m');
  assert.ok(Math.abs((resolveSupportHeight3D(-40.0, 25.0, F1_L1_Y + 0.5, world) ?? -99) - F1_L1_Y) < 0.05, 'West L1 Bastion Gallery at -6.0m');
  assert.ok(Math.abs((resolveSupportHeight3D(-41.0, 40.0, F1_L3_Y + 0.5, world) ?? -99) - F1_L3_Y) < 0.05, 'West L3 Apex Vantage Crown at +5.2m');
  assert.ok(Math.abs((resolveSupportHeight3D(41.0, 40.0, F1_L3_Y + 0.5, world) ?? -99) - F1_L3_Y) < 0.05, 'East L3 Apex Vantage Crown at +5.2m');

  // 3. Solid Cover Architecture: 8 Monumental Pillars & 8 Blast-Shield Cover Walls block cleanly on Boss Pit L0
  const p0x = Math.cos(Math.PI / 8) * 17.6;
  const p0z = 40.0 + Math.sin(Math.PI / 8) * 17.6;
  for (const [cx, cz, label] of [
    [-p0x, 40.0 - Math.sin(Math.PI / 8) * 17.6, 'NW Monumental Cover Pillar'],
    [p0x, p0z, 'SE Monumental Cover Pillar'],
    [-18.5, 21.5, 'NW Blast-Shield Cover Wall'],
    [18.5, 58.5, 'SE Blast-Shield Cover Wall'],
    [-9.5, 12.8, 'North Approach Cover Wall'],
    [9.5, 67.2, 'South Vault Cover Wall'],
  ] as const) {
    assert.equal(
      resolveWorldHorizontal3D(cx, cz, F1_L0_Y, 0.36, world, undefined, 1.75, 0.44).collided,
      true,
      `Floor 01 ${label} must provide solid combat cover`
    );
  }

  // 4. Straight Stairs (`L0 -> L1`, `L1 -> L2`, & `L2 -> L3` Express Apex Stairs) climb monotonically!
  let st01 = F1_L0_Y;
  for (let i = 0; i <= 12; i++) {
    const z = 26.0 - i * 1.0;
    const h = resolveSupportHeight3D(-34.4, z, st01 + 0.65, world);
    assert.ok(h !== null && h >= st01 - 0.03, `NW L0->L1 Stair monotonic at z=${z.toFixed(2)}`);
    st01 = h;
  }
  assert.ok(Math.abs(st01 - F1_L1_Y) < 0.08, `NW L0->L1 Stair reaches L1 (${F1_L1_Y}m), got ${st01}`);

  let st12 = F1_L1_Y;
  for (let i = 0; i <= 12; i++) {
    const x = -26.0 + i * 1.0;
    const h = resolveSupportHeight3D(x, 2.9, st12 + 0.65, world);
    assert.ok(h !== null && h >= st12 - 0.03, `NW L1->L2 Stair monotonic at x=${x.toFixed(2)}`);
    st12 = h;
  }
  assert.ok(Math.abs(st12 - F1_L2_Y) < 0.08, `NW L1->L2 Stair reaches L2 (${F1_L2_Y}m), got ${st12}`);

  let st23W = F1_L2_Y;
  for (let i = 0; i <= 12; i++) {
    const z = 15.6 + (i / 12) * 10.4;
    const h = resolveSupportHeight3D(-41.4, z, st23W + 0.65, world);
    assert.ok(h !== null && h >= st23W - 0.03, `West L2->L3 Express Apex Stair monotonic at z=${z.toFixed(2)}`);
    st23W = h;
  }
  assert.ok(Math.abs(st23W - F1_L3_Y) < 0.08, `West L2->L3 Express Apex Stair reaches L3 (${F1_L3_Y}m), got ${st23W}`);

  let st23E = F1_L2_Y;
  for (let i = 0; i <= 12; i++) {
    const z = 64.4 - (i / 12) * 10.4;
    const h = resolveSupportHeight3D(41.4, z, st23E + 0.65, world);
    assert.ok(h !== null && h >= st23E - 0.03, `East L2->L3 Express Apex Stair monotonic at z=${z.toFixed(2)}`);
    st23E = h;
  }
  assert.ok(Math.abs(st23E - F1_L3_Y) < 0.08, `East L2->L3 Express Apex Stair reaches L3 (${F1_L3_Y}m), got ${st23E}`);

  // 5. Twin Stacked Curved Spiral Ascent Towers (`L0 -> L1 -> L2`) monotonic!
  const rMid = (F1_GRID.SPIRAL_R_IN + F1_GRID.SPIRAL_R_OUT) * 0.5;
  let spY = F1_L0_Y;
  for (let i = 0; i <= 14; i++) {
    const a = -Math.PI * 0.5 + (i / 14) * (Math.PI * 1.5);
    const h = resolveSupportHeight3D(F1_GRID.SPIRAL_W_X + Math.cos(a) * rMid, F1_GRID.SPIRAL_Z + Math.sin(a) * rMid, spY + 0.75, world);
    assert.ok(h !== null && h >= spY - 0.05, `West Spiral L0->L1 monotonic at step ${i}`);
    spY = h;
  }
  assert.ok(Math.abs(spY - F1_L1_Y) < 0.14, `West Spiral L0->L1 reaches L1 (${F1_L1_Y}m), got ${spY}`);
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI * 1.28 + (i / 14) * (Math.PI * 1.22);
    const h = resolveSupportHeight3D(F1_GRID.SPIRAL_W_X + Math.cos(a) * rMid, F1_GRID.SPIRAL_Z + Math.sin(a) * rMid, spY + 0.75, world);
    assert.ok(h !== null && h >= spY - 0.05, `West Spiral L1->L2 monotonic at step ${i}`);
    spY = h;
  }
  assert.ok(Math.abs(spY - F1_L2_Y) < 0.14, `West Spiral L1->L2 reaches L2 (${F1_L2_Y}m), got ${spY}`);

  // 6. Both Retractable Aerial Siege Skybridges deploy cleanly (West via switch, East via overhead shootable lock!)
  assert.ok((resolveSupportHeight3D(-20.5, 40.0, F1_L2_Y + 0.5, world) ?? -99) < F1_L1_Y, 'West Siege Skybridge retracted initially');
  assert.ok(hideout.activateWorldSwitch(F1_IDS.switchWestSiege)?.deployedBridge, 'West Siege switch deploys bridge');
  assert.ok(hideout.triggerShootableLock(F1_IDS.lockEastSiege)?.deployedBridge, 'East Siege shootable relay deploys bridge');
  for (let i = 0; i < 80; i++) {
    stepWorldMechanics(floor1.retractableBridges, floor1.securityGates, floor1.shootableLocks, floor1.jumpPads, 0.05, i * 0.05, 0, F1_L2_Y, 40);
  }
  assert.ok(Math.abs((resolveSupportHeight3D(-20.5, 40.0, F1_L2_Y + 0.5, world) ?? -99) - F1_L2_Y) < 0.06, 'West Siege Skybridge walkable at L2=0.0m');
  assert.ok(Math.abs((resolveSupportHeight3D(20.5, 40.0, F1_L2_Y + 0.5, world) ?? -99) - F1_L2_Y) < 0.06, 'East Siege Skybridge walkable at L2=0.0m');

  // 7. Twin Sealed Reliquary Armory Vaults block entry until glass relays shattered!
  assert.equal(resolveWorldHorizontal3D(-36.02, 28.6, F1_L0_Y, 0.36, world, undefined, 1.75, 0.44).collided, true, 'West Armory Vault starts sealed');
  assert.equal(resolveWorldHorizontal3D(36.02, 46.6, F1_L0_Y, 0.36, world, undefined, 1.75, 0.44).collided, true, 'East Armory Vault starts sealed');
  assert.ok(hideout.triggerShootableLock(F1_IDS.lockWestVault)?.unlockedGate, 'West Vault relay unseals gate');
  assert.ok(hideout.triggerShootableLock(F1_IDS.lockEastVault)?.unlockedGate, 'East Vault relay unseals gate');
  for (let i = 0; i < 60; i++) {
    stepWorldMechanics(floor1.retractableBridges, floor1.securityGates, floor1.shootableLocks, floor1.jumpPads, 0.05, i * 0.05, 0, F1_L0_Y, 40);
  }
  assert.equal(resolveWorldHorizontal3D(-36.02, 28.6, F1_L0_Y, 0.36, world, undefined, 1.75, 0.44).collided, false, 'West Armory Vault unobstructed once unsealed');
  assert.equal(resolveWorldHorizontal3D(36.02, 46.6, F1_L0_Y, 0.36, world, undefined, 1.75, 0.44).collided, false, 'East Armory Vault unobstructed once unsealed');

  // 8. South L2 Sovereign Control Center isolation (zero L0 trigger!) & Final Core Vault 01 unsealing!
  assert.equal(
    hideout.getNearbyInteraction(F1_CONTROL_CENTER_POS.x, F1_L0_Y, F1_CONTROL_CENTER_POS.z - 1.5),
    null,
    'South L2 Sovereign Control Center MUST NOT trigger from L0=-12.0m underneath!'
  );
  const nearSov = hideout.getNearbyInteraction(F1_CONTROL_CENTER_POS.x, F1_L2_Y, F1_CONTROL_CENTER_POS.z - 1.4);
  assert.ok(nearSov && nearSov.kind === 'control_center' && nearSov.floor === 1, 'Sovereign Control Center interactable on South L2 Crown');
  const sovRes = hideout.triggerInteraction(F1_CONTROL_CENTER_POS.x, F1_L2_Y, F1_CONTROL_CENTER_POS.z - 1.4);
  assert.ok(sovRes && sovRes.kind === 'control_center', 'Activating Sovereign Control Center unseals Final Core Vault 01');

  // Step exit door open & verify Inner Sanctum walkability!
  for (let i = 0; i < 60; i++) {
    hideout.update(0.05, i * 0.05, new THREE.Vector3(0, F1_L0_Y, 82), new THREE.Vector3(0, F1_L0_Y + 2, 80));
  }
  assert.equal(resolveWorldHorizontal3D(0, 84.0, F1_L0_Y, 0.36, world, undefined, 1.75, 0.44).collided, false, 'Final Core Vault 01 open for entry into Inner Sanctum');
  assert.ok(Math.abs((resolveSupportHeight3D(0, 90.0, F1_L0_Y + 0.5, world) ?? -99) - F1_L0_Y) < 0.05, 'Inner Victory Sanctum floor solid at -12.0m');

  hideout.dispose();
});

test('All 8 Floors & All 7 Inter-Floor Descent Gates have ZERO visible coplanar overlapping faces (>= 0.10m²)', () => {
  interface QuadFace {
    axis: 0 | 1 | 2;
    sign: 1 | -1;
    coord: number;
    u0: number;
    u1: number;
    v0: number;
    v1: number;
    meshName: string;
    floor: number;
    meshId: number;
    subIdx: number;
  }

  const pushQuads = (
    geom: THREE.BufferGeometry,
    matW: THREE.Matrix4,
    meshName: string,
    floor: number,
    meshId: number,
    out: QuadFace[],
    sc: { n: number }
  ) => {
    const pos = geom.attributes.position;
    if (!pos) return;
    const idx = geom.index;
    const triCount = idx ? idx.count / 3 : pos.count / 3;
    const vA = new THREE.Vector3();
    const vB = new THREE.Vector3();
    const vC = new THREE.Vector3();
    const e1 = new THREE.Vector3();
    const e2 = new THREE.Vector3();
    const n = new THREE.Vector3();
    const tris: Array<{ axis: 0 | 1 | 2; sign: 1 | -1; coord: number; u0: number; u1: number; v0: number; v1: number }> = [];
    for (let t = 0; t < triCount; t++) {
      const i0 = idx ? idx.getX(t * 3) : t * 3;
      const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
      vA.fromBufferAttribute(pos, i0).applyMatrix4(matW);
      vB.fromBufferAttribute(pos, i1).applyMatrix4(matW);
      vC.fromBufferAttribute(pos, i2).applyMatrix4(matW);
      e1.subVectors(vB, vA);
      e2.subVectors(vC, vA);
      n.crossVectors(e1, e2);
      const len = n.length();
      if (len < 1e-6) continue;
      n.divideScalar(len);
      let axis: 0 | 1 | 2 | -1 = -1;
      let sign: 1 | -1 = 1;
      if (Math.abs(n.x) > 0.999) {
        axis = 0;
        sign = n.x > 0 ? 1 : -1;
      } else if (Math.abs(n.y) > 0.999) {
        axis = 1;
        sign = n.y > 0 ? 1 : -1;
      } else if (Math.abs(n.z) > 0.999) {
        axis = 2;
        sign = n.z > 0 ? 1 : -1;
      }
      if (axis === -1) continue;
      const coord = axis === 0 ? vA.x : axis === 1 ? vA.y : vA.z;
      const uA = axis === 0 ? vA.y : vA.x;
      const uB = axis === 0 ? vB.y : vB.x;
      const uC = axis === 0 ? vC.y : vC.x;
      const wA = axis === 2 ? vA.y : vA.z;
      const wB = axis === 2 ? vB.y : vB.z;
      const wC = axis === 2 ? vC.y : vC.z;
      const u0 = Math.min(uA, uB, uC);
      const u1 = Math.max(uA, uB, uC);
      const v0 = Math.min(wA, wB, wC);
      const v1 = Math.max(wA, wB, wC);
      const rectArea = (u1 - u0) * (v1 - v0);
      if (rectArea < 1e-5) continue;
      if (Math.abs(len * 0.5 - 0.5 * rectArea) > 0.04 * rectArea) continue;
      tris.push({ axis, sign, coord, u0, u1, v0, v1 });
    }
    for (let i = 0; i + 1 < tris.length; i++) {
      const a = tris[i];
      const b = tris[i + 1];
      if (
        b.axis === a.axis &&
        b.sign === a.sign &&
        Math.abs(b.coord - a.coord) < 1e-4 &&
        Math.abs(b.u0 - a.u0) < 1e-4 &&
        Math.abs(b.u1 - a.u1) < 1e-4 &&
        Math.abs(b.v0 - a.v0) < 1e-4 &&
        Math.abs(b.v1 - a.v1) < 1e-4
      ) {
        out.push({ ...a, meshName, floor, meshId, subIdx: ++sc.n });
        i++;
      }
    }
  };

  const extractFloorFaces = (root: THREE.Object3D, floor: number): QuadFace[] => {
    root.updateMatrixWorld(true);
    const faces: QuadFace[] = [];
    let mc = 0;
    const instMat = new THREE.Matrix4();
    const combinedMat = new THREE.Matrix4();
    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || !obj.visible) return;
      const geom = obj.geometry;
      if (!geom || !geom.attributes.position) return;
      const mName = obj.name || obj.parent?.name || `mesh_${mc + 1}`;
      if (mName.startsWith('HeavyAmmoCrate_')) return;
      if (obj instanceof THREE.InstancedMesh) {
        const mId = ++mc;
        const sc = { n: 0 };
        for (let k = 0; k < obj.count; k++) {
          obj.getMatrixAt(k, instMat);
          combinedMat.multiplyMatrices(obj.matrixWorld, instMat);
          pushQuads(geom, combinedMat, mName, floor, mId, faces, sc);
        }
      } else {
        pushQuads(geom, obj.matrixWorld, mName, floor, ++mc, faces, { n: 0 });
      }
    });
    return faces;
  };

  const detectOverlaps = (faces: QuadFace[], groundYs: number[], crossFloorOnly: boolean): string[] => {
    const buckets = new Map<string, QuadFace[]>();
    for (const f of faces) {
      if (!crossFloorOnly && f.axis === 1 && f.sign === -1 && groundYs.some((gy) => Math.abs(f.coord - gy) < 0.04)) {
        continue;
      }
      const q = Math.round(f.coord / 0.004);
      for (const dq of [-1, 0, 1]) {
        const key = `${f.axis}_${f.sign}_${q + dq}`;
        let arr = buckets.get(key);
        if (!arr) {
          arr = [];
          buckets.set(key, arr);
        }
        arr.push(f);
      }
    }
    const hits: string[] = [];
    const seen = new Set<string>();
    for (const arr of buckets.values()) {
      for (let i = 0; i < arr.length; i++) {
        const A = arr[i];
        for (let j = i + 1; j < arr.length; j++) {
          const B = arr[j];
          if (crossFloorOnly && A.floor === B.floor) continue;
          if (Math.abs(A.coord - B.coord) > 0.0045) continue;
          const ou = Math.min(A.u1, B.u1) - Math.max(A.u0, B.u0);
          if (ou <= 0.01) continue;
          const ov = Math.min(A.v1, B.v1) - Math.max(A.v0, B.v0);
          if (ov <= 0.01) continue;
          const area = ou * ov;
          if (area < 0.1) continue;
          const k1 = `${A.floor}:${A.meshId}:${A.subIdx}`;
          const k2 = `${B.floor}:${B.meshId}:${B.subIdx}`;
          const pk = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
          if (seen.has(pk)) continue;
          seen.add(pk);
          hits.push(`F${A.floor}:${A.meshName} <-> F${B.floor}:${B.meshName} (${area.toFixed(3)}m² @ ${A.coord.toFixed(2)})`);
        }
      }
    }
    return hits;
  };

  const hideout = createEightFloorHideout(null, null, true);
  const floorFaces: Record<number, QuadFace[]> = {};
  for (const fn of [8, 7, 6, 5, 4, 3, 2, 1] as const) {
    const f = hideout.floors[fn];
    f.group.visible = true;
    f.detailGroup.visible = true;
    for (const cell of f.occlusionCells ?? []) cell.group.visible = true;
    f.exitDoor?.setOpenRatio(1, true);
    f.arrivalDoor?.setOpenRatio(1, true);
    floorFaces[fn] = extractFloorFaces(f.group, fn);
    const deckYs = Array.from(new Set(f.slabs.map((s) => s.y).concat([f.meta.baseY, f.meta.baseY - 2.4, -12.0, -6.0])));
    const intra = detectOverlaps(floorFaces[fn], deckYs, false);
    assert.equal(intra.length, 0, `Floor 0${fn} must have ZERO visible coplanar overlaps, found: ${intra.slice(0, 5).join('; ')}`);
  }
  for (const upper of [8, 7, 6, 5, 4, 3, 2] as const) {
    const lower = upper - 1;
    const cross = detectOverlaps([...floorFaces[upper], ...floorFaces[lower]], [], true);
    assert.equal(cross.length, 0, `Descent junction F0${upper}->F0${lower} must have ZERO coplanar overlaps, found: ${cross.slice(0, 5).join('; ')}`);
  }

  hideout.dispose();
});

test('Open SecurityGates and TacticalDoors never clip adjacent panoramic glass windows on any of the 8 floors', () => {
  const hideout = createEightFloorHideout(null, null, true);

  for (const fn of [8, 7, 6, 5, 4, 3, 2, 1] as const) {
    const f = hideout.floors[fn];
    f.group.visible = true;
    f.detailGroup.visible = true;
    for (const cell of f.occlusionCells ?? []) cell.group.visible = true;

    for (const g of f.securityGates ?? []) {
      g.unlocked = true;
      g.openRatio = 1;
      g.targetRatio = 1;
      g.applyVisuals();
    }
    for (const d of f.tacticalDoors ?? []) {
      if (d.mode === 'automatic') {
        d.openRatio = 1;
        d.targetRatio = 1;
        d.applyVisuals(0);
      }
    }

    f.group.updateMatrixWorld(true);
    const glassBoxes: Array<{ name: string; box: THREE.Box3 }> = [];
    const leafBoxes: Array<{ name: string; box: THREE.Box3 }> = [];
    const tmpV = new THREE.Vector3();

    f.group.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || !obj.visible) return;
      const geom = obj.geometry;
      const pos = geom?.attributes?.position;
      if (!geom || !pos) return;
      if (obj.name.endsWith('_Glass')) {
        // Batched glass walls contain 24 vertices per individual window pane — check each pane's exact world AABB!
        const stride = pos.count % 24 === 0 ? 24 : pos.count;
        for (let start = 0; start < pos.count; start += stride) {
          const paneBox = new THREE.Box3();
          for (let i = start; i < start + stride; i++) {
            tmpV.fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld);
            paneBox.expandByPoint(tmpV);
          }
          glassBoxes.push({ name: `${obj.name}[${start / stride}]`, box: paneBox });
        }
      } else if (
        obj.name.includes('_GateBody_') ||
        obj.name.includes('_GateRibs_') ||
        obj.name.includes('_LeafBody_')
      ) {
        if (!geom.boundingBox) geom.computeBoundingBox();
        if (!geom.boundingBox) return;
        leafBoxes.push({ name: obj.name, box: geom.boundingBox.clone().applyMatrix4(obj.matrixWorld) });
      }
    });

    for (const leaf of leafBoxes) {
      for (const gl of glassBoxes) {
        const ix = Math.min(leaf.box.max.x, gl.box.max.x) - Math.max(leaf.box.min.x, gl.box.min.x);
        const iy = Math.min(leaf.box.max.y, gl.box.max.y) - Math.max(leaf.box.min.y, gl.box.min.y);
        const iz = Math.min(leaf.box.max.z, gl.box.max.z) - Math.max(leaf.box.min.z, gl.box.min.z);
        assert.ok(
          !(ix > 0.02 && iy > 0.02 && iz > 0.02),
          `Floor 0${fn}: Open door/gate leaf ${leaf.name} must NOT clip window ${gl.name} (overlap ${ix.toFixed(2)}×${iy.toFixed(2)}×${iz.toFixed(2)}m)`
        );
      }
    }
  }

  hideout.dispose();
});







