import * as THREE from 'three';
import { addWallStencilPlaque } from '../../architecture';
import {
  buildBatchedBoxesMesh,
  type BoxSpec,
  type HideoutMaterialRegistry,
} from '../../materials';
import {
  addWalkableDeck,
  buildArchitecturalWall,
  buildJerseyBarricades,
} from '../../architecture';
import {
  buildGuardrailRun,
  buildStraightStairFlight,
  type FloorGeometryCollector,
} from '../../stairs';
import { buildTacticalDoor } from '../../mechanics';
import type { OcclusionCell } from '../../types';
import {
  buildExplosiveBarrel,
  buildJumpPad,
  buildRetractableBridge,
  buildShootableLock,
  buildWorldSwitch,
} from '../../mechanics';
import {
  addF3PortalSill,
  F3_CEIL_H,
  F3_GRID,
  F3_IDS,
  F3_L0_Y,
  F3_L1_Y,
  F3_L2_Y,
  F3_PORTAL_L0,
  F3_PORTAL_L1,
  F3_PORTAL_L2,
  F3_PORTALS,
  F3_ROOF_CENTER_Y,
  F3_ROOF_THICK,
} from './layout';

/**
 * FLOOR 03 — ZONE 4 (NW OCCLUSION CELL): FROST AQUEDUCT & TRIPLE-TIER GALLERY
 * Footprint: x ∈ [-32.0, -12.0], z ∈ [-34.0, -4.0] (`20m × 30m`)
 *
 * - Monumental frozen temple aqueduct with glowing cryo-conduit trough & vaulted basalt ribs.
 * - Full 3-story verticality:
 *   - Flush East-wall `L0 → L1` stair + Calibrated `L0 → L1` Cryo-Lift Jump Pad (`f3_pad_aqueduct_l0_l1`)!
 *   - Flush North-wall `L1 → L2` stair (`x: -25.8 → -20.0, z = -32.7`)!
 *   - **Retractable Level 2 Aqueduct Skybridge #1 (`f3_bridge_aqueduct_l2`)** spanning `12.6m` across
 *     the aqueduct void (dual `[E]` Switch + Shootable Relay)!
 *   - **Jammed Roll-Under Ice-Blast Shutter #1 (`f3_jammed_aqueduct_crypt`)** into Zone 5 Glacial Crypt!
 */
export function buildFloor3Zone4NorthWestAqueduct(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const y0 = F3_L0_Y; // 28.0m
  const y1 = F3_L1_Y; // 31.1m
  const y2 = F3_L2_Y; // 34.2m
  const ceilH = F3_CEIL_H; // 10.3m
  const accentMat = mats.floorAccent[3];
  const goldMat = mats.auroraGold;

  const cellGroup = new THREE.Group();
  cellGroup.name = 'F3_CELL_Z4_NW_AQUEDUCT';
  collector.group.add(cellGroup);

  // 1. L0 Full Aqueduct Temple Floor (`x ∈ [-32, -12], z ∈ [-34, -4]`)
  addWalkableDeck(collector, {
    minX: F3_GRID.X_WEST_MID,
    maxX: F3_GRID.X_CORE_WEST,
    minZ: F3_GRID.Z_NORTH_OUTER,
    maxZ: F3_GRID.Z_THRESHOLD,
    y: y0,
    thickness: 0.56,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    name: 'F3_Z4_L0_Floor',
  });

  // 2. Single-Owner Walls: North exterior (`z = -34.0`), East exterior (`x = -12.0, z ∈ [-34, -17]`),
  //    West partition (`x = -32.0, z ∈ [-34, -4]` into Zone 5)!
  //    (South `z = -4.0` owned by Zone 3; East `z ∈ [-17, -4]` owned by Zone 1!)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F3_GRID.Z_NORTH_OUTER,
    spanStart: F3_GRID.X_WEST_MID - 0.3,
    spanEnd: F3_GRID.X_CORE_WEST + 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.basaltStone,
    targetGroup: cellGroup,
    name: 'F3_Z4_NorthOuterWall',
  });

  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F3_GRID.X_CORE_WEST,
    spanStart: F3_GRID.Z_NORTH_OUTER + 0.3,
    spanEnd: F3_GRID.Z_ARRIVAL - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.basaltStone,
    targetGroup: cellGroup,
    name: 'F3_Z4_EastShaftWall',
  });

  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F3_GRID.X_WEST_MID,
    spanStart: F3_GRID.Z_NORTH_OUTER + 0.3,
    spanEnd: F3_GRID.Z_THRESHOLD - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.basaltStone,
    accentMat,
    targetGroup: cellGroup,
    portals: [
      // Jammed Roll-Under Shutter #1 (`z ∈ [-20.2, -16.2]`)
      { start: F3_PORTALS.Z4_Z5_JAMMED_Z[0], end: F3_PORTALS.Z4_Z5_JAMMED_Z[1], ...F3_PORTAL_L0, kind: 'door', framed: true, accentHeader: true },
      { start: F3_PORTALS.Z4_Z5_L1_Z[0], end: F3_PORTALS.Z4_Z5_L1_Z[1], ...F3_PORTAL_L1, kind: 'door', framed: true, accentHeader: true },
      { start: F3_PORTALS.Z4_Z5_L2_Z[0], end: F3_PORTALS.Z4_Z5_L2_Z[1], ...F3_PORTAL_L2, kind: 'door', framed: true, accentHeader: true },
    ],
    name: 'F3_Z4_WestPartitionWall',
  });

  // Zero-gap elevated doorway threshold sills on West partition wall into Zone 5
  addF3PortalSill(collector, { axis: 'z', coord: F3_GRID.X_WEST_MID, span: F3_PORTALS.Z4_Z5_L1_Z, y: y1, material: mats.basaltStone, targetGroup: cellGroup, name: 'F3_Z4_Sill_Z5_L1' });
  addF3PortalSill(collector, { axis: 'z', coord: F3_GRID.X_WEST_MID, span: F3_PORTALS.Z4_Z5_L2_Z, y: y2, material: mats.glacialMarble, targetGroup: cellGroup, name: 'F3_Z4_Sill_Z5_L2' });

  // Jammed Roll-Under Ice-Blast Shutter #1 (`[V]` Dodge Roll into Zone 5 Glacial Crypt!)
  buildTacticalDoor(collector, mats, {
    id: F3_IDS.jammedAqueductCrypt,
    mode: 'jammed_roll',
    x: F3_GRID.X_WEST_MID,
    y: y0,
    z: -18.2,
    width: 4.0,
    height: 2.65,
    spanAxis: 'z',
    targetGroup: cellGroup,
  });

  // 3. LEVEL 1 (`31.1m`) AQUEDUCT GALLERIES (North Terrace + West Gallery + South-East Gallery)
  //    North L1 Terrace (`x ∈ [-31.69, -12.31], z ∈ [-33.69, -24.6]`) — receives Jump Pad & connects Zone 5 L1 (`z ∈ [-29.0, -25.4]`)!
  addWalkableDeck(collector, {
    minX: -31.69,
    maxX: -12.31,
    minZ: -33.69,
    maxZ: -24.6,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z4_L1_NorthTerrace',
  });
  //    West L1 Aqueduct Walk (`x ∈ [-31.69, -27.4], z ∈ [-24.6, -4.31]`)
  addWalkableDeck(collector, {
    minX: -31.69,
    maxX: -27.4,
    minZ: -24.6,
    maxZ: -4.31,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z4_L1_WestWalk',
  });
  //    South L1 Gallery (`x ∈ [-27.4, -12.31], z ∈ [-14.2, -4.31]`) — receives East L0→L1 stair (`z = -14.2`)
  //    AND links Zone 1 L1 Overhead Gallery (`z ∈ [-11.4, -7.6]`) + Zone 3 L1 (`x ∈ [-18.0, -14.4]`)!
  addWalkableDeck(collector, {
    minX: -27.4,
    maxX: -12.31,
    minZ: -14.2,
    maxZ: -4.31,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z4_L1_SouthGallery',
  });

  // L1 Guardrails (OPEN at Jump Pad landing slot `x ∈ [-18.0, -14.4]` on `z = -24.6`, and open at East stair top `x ∈ [-14.4, -12.31]` on `z = -14.2`!)
  buildGuardrailRun(collector, mats, { x1: -27.4, z1: -24.6, x2: -18.0, z2: -24.6, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -14.4, z1: -24.6, x2: -12.35, z2: -24.6, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -27.4, z1: -24.6, x2: -27.4, z2: -14.2, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -27.4, z1: -14.2, x2: -14.3, z2: -14.2, y: y1, accentMat, targetGroup: cellGroup });

  // 4. LEVEL 2 (`34.2m`) AQUEDUCT CROWN DECKS + RETRACTABLE SKYBRIDGE #1!
  //    NE L2 Crown Landing (`x ∈ [-20.0, -12.31], z ∈ [-33.69, -24.6]`) — receives Flush North `L1 → L2` Stair (`x = -20.0`)!
  addWalkableDeck(collector, {
    minX: -20.0,
    maxX: -12.31,
    minZ: -33.69,
    maxZ: -24.6,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z4_L2_NorthLanding',
  });
  //    South L2 Aqueduct Hub (`x ∈ [-31.69, -12.31], z ∈ [-12.0, -4.31]`) — connects Zone 1 L2 (`z ∈ [-11.4, -7.6]`),
  //    Zone 3 L2 (`x ∈ [-24.0, -20.0]`), AND Zone 5 L2 (`z ∈ [-12.0, -8.2]`)!
  addWalkableDeck(collector, {
    minX: -31.69,
    maxX: -12.31,
    minZ: -12.0,
    maxZ: -4.31,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z4_L2_SouthHub',
  });

  // L2 Guardrails (OPEN at Retractable Bridge mouths `x ∈ [-17.8, -14.6]` on BOTH `z = -24.6` & `z = -12.0`,
  // and open at North L1→L2 stair mouth `z ∈ [-33.69, -31.65]` on `x = -20.0`!)
  buildGuardrailRun(collector, mats, { x1: -20.0, z1: -31.65, x2: -20.0, z2: -24.6, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -20.0, z1: -24.6, x2: -17.8, z2: -24.6, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -14.6, z1: -24.6, x2: -12.35, z2: -24.6, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -31.65, z1: -12.0, x2: -17.8, z2: -12.0, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -14.6, z1: -12.0, x2: -12.35, z2: -12.0, y: y2, accentMat: goldMat, targetGroup: cellGroup });

  // Retractable Level 2 Aqueduct Skybridge #1 (`z = -24.6 → -12.0`, `length = 12.6m`, `width = 3.2m`)!
  buildRetractableBridge(collector, mats, {
    id: F3_IDS.bridgeAqueductL2,
    label: 'AQUEDUCT L2 SKYBRIDGE',
    anchorX: -16.2,
    y: y2,
    anchorZ: -24.6,
    extendDirX: 0,
    extendDirZ: 1,
    length: 12.6,
    width: 3.2,
    targetGroup: cellGroup,
    accentMat: goldMat,
  });

  // Dual Trigger: [E] World Switch on NE L2 Landing + Shootable Relay across on South L2 Hub!
  buildWorldSwitch(collector, mats, {
    id: F3_IDS.switchAqueductL2,
    x: -13.6,
    y: y2,
    z: -25.8,
    rotY: 0,
    promptLocked: '[E] EXTEND AQUEDUCT L2 SKYBRIDGE',
    promptActivated: 'AQUEDUCT L2 SKYBRIDGE EXTENDED',
    bannerText: 'AQUEDUCT L2 SKYBRIDGE DEPLOYED · LEVEL 2 CORRIDOR OPEN!',
    deployBridgeId: F3_IDS.bridgeAqueductL2,
    targetGroup: cellGroup,
  });
  buildShootableLock(collector, mats, {
    id: F3_IDS.lockAqueductL2,
    bannerText: 'AQUEDUCT RELAY SHATTERED · L2 SKYBRIDGE DEPLOYED!',
    x: -19.2,
    y: y2 + 1.5,
    z: -12.18,
    rotY: Math.PI,
    deployBridgeId: F3_IDS.bridgeAqueductL2,
    targetGroup: cellGroup,
  });

  // 5. TWO-STAGE FLUSH STAIRS (`L0 → L1` East Wall + `L1 → L2` North Wall) + CALIBRATED `L0 → L1` JUMP PAD!
  //    Flush East Wall `L0 → L1` Stair (`x = -13.3, width = 2.0 -> x ∈ [-14.3, -12.3]` flush against `x = -12.3`!)
  buildStraightStairFlight(collector, mats, {
    x: -13.3,
    z: -17.1,
    width: 2.0,
    length: 5.8,
    yStart: y0, // z = -20.0 -> 28.0m
    yEnd: y1, // z = -14.2 -> 31.1m (South L1 Gallery!)
    axis: 'z',
    railMinSide: true,
    railMaxSide: false,
    targetGroup: cellGroup,
    accentMat,
  });

  //    Flush North Wall `L1 → L2` Stair (`z = -32.7, width = 2.0 -> z ∈ [-33.7, -31.7]` flush against `z = -33.7`!)
  buildStraightStairFlight(collector, mats, {
    x: -22.9,
    z: -32.7,
    width: 2.0,
    length: 5.8,
    yStart: y1, // x = -25.8 -> 31.1m (North L1 Terrace!)
    yEnd: y2, // x = -20.0 -> 34.2m (NE L2 Crown Landing!)
    axis: 'x',
    railMinSide: false,
    railMaxSide: true,
    targetGroup: cellGroup,
    accentMat: goldMat,
  });

  //    Calibrated `L0 → L1` Cryo-Lift Jump Pad (`(-16.2, 28.0, -21.4)` -> arcs cleanly OVER lip to `(-16.2, 31.1, -25.5)`!)
  buildJumpPad(collector, mats, {
    id: F3_IDS.padAqueductL0ToL1,
    x: -16.2,
    y: y0,
    z: -21.4,
    launchVy: 11.6,
    launchVx: 0,
    launchVz: -3.6,
    targetGroup: cellGroup,
  });

  // 6. Frozen Aqueduct Cryo-Conduit Channel, Arched Basalt Buttresses, Cover & Barrels
  const basaltSpecs: BoxSpec[] = [];
  const goldSpecs: BoxSpec[] = [];
  const frostSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];

  // Glowing inlaid frozen aqueduct stream (`x = -22.2, z ∈ [-29.0, -9.0]`, raised +12mm proud -> zero Z-fight!)
  frostSpecs.push({ w: 2.6, h: 0.024, d: 20.0, x: -22.2, y: y0 + 0.016, z: -19.0 });
  goldSpecs.push(
    { w: 0.14, h: 0.04, d: 20.2, x: -23.58, y: y0 + 0.024, z: -19.0 },
    { w: 0.14, h: 0.04, d: 20.2, x: -20.82, y: y0 + 0.024, z: -19.0 }
  );

  // Monumental Aqueduct Overhead Arch Ribs & Fluted Columns
  for (const az of [-28.0, -20.0, -11.5]) {
    basaltSpecs.push({ w: 19.2, h: 0.72, d: 0.68, x: -22.0, y: y0 + 9.45, z: az });
    lightSpecs.push({ w: 14.0, h: 0.1, d: 0.42, x: -22.0, y: y0 + ceilH - 0.06, z: az + 3.2 });
  }
  const colH = y1 - 0.34 - (y0 + 0.006);
  for (const [cx, cz] of [
    [-27.0, -24.2],
    [-27.0, -14.6],
  ] as const) {
    basaltSpecs.push({ w: 0.68, h: colH, d: 0.68, x: cx, y: y0 + 0.006 + colH * 0.5, z: cz });
    goldSpecs.push({ w: 0.84, h: 0.14, d: 0.84, x: cx, y: y1 - 0.46, z: cz });
    collector.boxes.push({
      minX: cx - 0.38,
      maxX: cx + 0.38,
      minY: y0,
      maxY: y1,
      minZ: cz - 0.38,
      maxZ: cz + 0.38,
      walkableTop: false,
    });
  }

  // Watertight Roof Slab (`top = 38.80m < 39.00m`!)
  const roofMesh = buildBatchedBoxesMesh(
    [{ w: 20.0, h: F3_ROOF_THICK, d: 30.3, x: -22.0, y: F3_ROOF_CENTER_Y, z: -19.15 }],
    mats.basaltStone,
    { receiveShadow: true, name: 'F3_Z4_RoofSlab' }
  );
  if (roofMesh) {
    cellGroup.add(roofMesh);
    collector.wallMeshes.push(roofMesh);
  }

  const archMesh = buildBatchedBoxesMesh(basaltSpecs, mats.basaltStone, {
    castShadow: true,
    receiveShadow: true,
    name: 'F3_Z4_AqueductArches',
  });
  if (archMesh) {
    cellGroup.add(archMesh);
    collector.wallMeshes.push(archMesh);
  }
  const frostMesh = buildBatchedBoxesMesh(frostSpecs, mats.cryoFrost, { name: 'F3_Z4_FrostStream' });
  if (frostMesh) cellGroup.add(frostMesh);
  const goldMesh = buildBatchedBoxesMesh(goldSpecs, goldMat, { name: 'F3_Z4_GoldTrim' });
  if (goldMesh) cellGroup.add(goldMesh);
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F3_Z4_Lights' });
  if (lightMesh) cellGroup.add(lightMesh);

  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -25.8, y: y0, z: -18.2, w: 0.88, h: 0.98, d: 2.4, walkableTop: true },
      { x: -22.0, y: y2, z: -8.2, w: 2.4, h: 0.98, d: 0.88, walkableTop: true },
    ],
    { targetGroup: cellGroup, accentMat, name: 'F3_Z4_Cover' }
  );

  buildExplosiveBarrel(collector, mats, { id: 'f3_barrel_z4_l0', x: -19.2, y: y0, z: -14.8, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f3_barrel_z4_l1', x: -23.0, y: y1, z: -27.2, targetGroup: cellGroup });

  addWallStencilPlaque(cellGroup, mats, {
    code: '03-AQ',
    title: 'FROST AQUEDUCT',
    subtitle: 'TRIPLE-TIER GALLERY · L2 SKYBRIDGE · CRYPT ACCESS',
    accentHex: 0x67e8f9,
    x: -22.0,
    y: y2 + 2.4,
    z: F3_GRID.Z_NORTH_OUTER + 0.36,
    rotY: 0,
    width: 6.4,
    height: 1.4,
  });

  return {
    id: 'f3_zone4_nw_aqueduct',
    group: cellGroup,
    triggerBounds: { minX: -36.0, maxX: -8.0, minZ: -34.0, maxZ: -1.0 },
    center: { x: -22.0, z: -19.0 },
    maxViewDistance: 68.0,
  };
}
