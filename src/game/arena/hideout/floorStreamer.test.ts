import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BULKHEAD_CLOSE_DURATION_SEC,
  BULKHEAD_OPEN_DURATION_SEC,
  FloorStreamer,
} from './floorStreamer';
import { createEightFloorHideout } from './index';
import { FLOOR_CATALOG, type FloorNumber } from './types';

test('FloorStreamer enforces strict single-floor steady state, pre-wakes destination, and auto-seals & unloads former floor', () => {
  const streamer = new FloorStreamer({
    7: { minX: -12, maxX: 12, minZ: -15.2, maxZ: 14, maxY: FLOOR_CATALOG[7].baseY + 4.5 },
  });

  // 1. Initial steady state: ONLY Floor 8 active!
  assert.equal(streamer.currentFloor, 8);
  assert.deepEqual(streamer.getActiveFloorList(), [8]);
  assert.equal(streamer.getDoorState(8), 'locked');
  assert.equal(streamer.getDoorOpenRatio(8), 0);

  // 2. Activating Floor 8 Control Center immediately pre-wakes Floor 7 BEFORE leaves slide open!
  const activated = streamer.activateFloorControl(8);
  assert.equal(activated, true);
  assert.equal(streamer.getDoorState(8), 'opening');
  assert.deepEqual(streamer.getActiveFloorList(), [8, 7]);

  // Step through full opening animation
  const stepsOpen = Math.ceil(BULKHEAD_OPEN_DURATION_SEC / 0.05) + 2;
  let sawDoorOpen = false;
  for (let i = 0; i < stepsOpen; i++) {
    const events = streamer.step(0.05, 0, 98, -12);
    if (events.some((e) => e.kind === 'door_open' && e.floor === 8)) sawDoorOpen = true;
  }
  assert.equal(sawDoorOpen, true);
  assert.equal(streamer.getDoorState(8), 'open');
  assert.equal(streamer.getDoorOpenRatio(8), 1);
  assert.deepEqual(streamer.getActiveFloorList(), [8, 7]);

  // 3. Player descends airlock stairs & steps across Floor 7 entry threshold (z = -14.0, y = 84.0)
  const arriveEvents = streamer.step(0.05, 0, FLOOR_CATALOG[7].baseY, -14.0);
  assert.equal(streamer.currentFloor, 7);
  assert.equal(streamer.getDoorState(8), 'closing');
  assert.ok(arriveEvents.some((e) => e.kind === 'arrived_floor' && e.floor === 7));
  assert.ok(arriveEvents.some((e) => e.kind === 'door_closing' && e.floor === 8));
  // Floor 8 stays mounted ONLY while Bulkhead 08 is physically sliding shut!
  assert.deepEqual(streamer.getActiveFloorList(), [8, 7]);

  // 4. Step through closing animation -> the exact frame openRatio hits 0, Floor 8 unloads!
  const stepsClose = Math.ceil(BULKHEAD_CLOSE_DURATION_SEC / 0.05) + 2;
  let sawUnloaded = false;
  for (let i = 0; i < stepsClose; i++) {
    const events = streamer.step(0.05, 0, FLOOR_CATALOG[7].baseY, -12.0);
    if (events.some((e) => e.kind === 'floor_unloaded' && e.floor === 8)) sawUnloaded = true;
  }
  assert.equal(sawUnloaded, true);
  assert.equal(streamer.getDoorState(8), 'locked');
  assert.equal(streamer.getDoorOpenRatio(8), 0);
  assert.deepEqual(
    streamer.getActiveFloorList(),
    [7],
    'former floor must be completely unloaded after airlock bulkhead seals shut'
  );
});

test('createEightFloorHideout builds all 8 unique floors in Node with strict initial Floor-8-only visibility', () => {
  const hideout = createEightFloorHideout(null, null, true);

  assert.equal(hideout.getCurrentFloorMeta().number, 8);
  assert.deepEqual(hideout.streamer.getActiveFloorList(), [8]);

  const seenNames = new Set<string>();
  for (const num of [8, 7, 6, 5, 4, 3, 2, 1] as FloorNumber[]) {
    const floor = hideout.floors[num];
    assert.ok(floor, `missing floor ${num}`);
    assert.equal(floor.group.visible, num === 8, `only Floor 8 should be visible at startup (floor ${num})`);
    assert.ok(!seenNames.has(floor.meta.name), `duplicate floor name ${floor.meta.name}`);
    seenNames.add(floor.meta.name);
    assert.equal(floor.targets.length, 0, `Floor ${num} must have zero legacy blue range drones/targets`);
    assert.ok(floor.ammoCrates.length >= 3, `Floor ${num} should have .50 HV ammo crates`);
    assert.ok(floor.controlCenter, `Floor ${num} missing Control Center`);
    assert.ok(floor.exitDoor, `Floor ${num} missing Massive Bulkhead Door`);
    assert.equal(floor.exitDoor.collider.active, true, `Floor ${num} exit door must start sealed`);
    assert.ok(floor.occlusionCells.length >= 1, `Floor ${num} should define sub-floor OcclusionCell(s)`);
  }

  // Verify Floors 7, 3, and 1 have curved spiral arcRamps around open central voids!
  assert.ok(hideout.floors[7].arcRamps.length >= 1, 'Floor 7 must include curved spiral stairs');
  assert.ok(hideout.floors[3].arcRamps.length >= 2, 'Floor 3 must include twin double-helix spiral stairs');
  assert.ok(hideout.floors[1].arcRamps.length >= 1, 'Floor 1 must include curved concentric stairs');

  // Verify NO floor exposes a player-facing teleportation/express lift pad (strictly physical floor descent!)
  for (const num of [8, 7, 6, 5, 4, 3, 2, 1] as FloorNumber[]) {
    assert.equal(hideout.floors[num].expressLift, undefined, `Floor ${num} must not have a floor teleport pad`);
  }

  hideout.dispose();
});
