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
import { buildExplosiveBarrel } from '../../mechanics';
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
 * FLOOR 03 — ZONE 3 (WEST OCCLUSION CELL): THE STEPPED BASALT ZIGGURAT & EXPRESS GRAND STAIRWAY
 * Footprint: x ∈ [-54.0, -12.0], z ∈ [-4.0, +9.0] (`42m × 13m`)
 *
 * Showcases BOTH ways to traverse Floor 03's TRUE 3 Full Vertical Levels:
 * 1. EXPRESS GRAND TEMPLE STAIRCASE: A monumental `12.0m`-long uninterrupted ceremonial flight climbing
 *    straight from `L0 (28.0m) → L2 (34.2m)` down the center of the Ziggurat (`x: -28.0 → -40.0, z = +2.5`)!
 * 2. TWO-STAGE STEPPED ASCENT: Flush South-wall `L0 → L1` stair (`x: -18.5 → -24.3`) -> walk along the
 *    L1 Ziggurat Promenade -> Flush South-wall `L1 → L2` stair (`x: -44.2 → -50.0`) onto the L2 Crown Terrace!
 * - Houses Jammed Roll-Under Ice-Blast Shutter #2 (`f3_jammed_ziggurat_cavern`) into Zone 10 SW Cavern!
 */
export function buildFloor3Zone3WestZiggurat(
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
  cellGroup.name = 'F3_CELL_Z3_WEST_ZIGGURAT';
  collector.group.add(cellGroup);

  // 1. L0 Full Ziggurat Temple Floor (`x ∈ [-54, -12], z ∈ [-4, +9]`)
  addWalkableDeck(collector, {
    minX: F3_GRID.X_WEST_OUTER,
    maxX: F3_GRID.X_CORE_WEST,
    minZ: F3_GRID.Z_THRESHOLD,
    maxZ: F3_GRID.Z_CLOISTER_SOUTH,
    y: y0,
    thickness: 0.56,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    name: 'F3_Z3_L0_Floor',
  });

  // 2. Single-Owner Walls: North (`z = -4.0` into Zones 4 & 5), South (`z = +9.0` into Zone 10), West exterior (`x = -54.0`)
  //    (East wall `x = -12.0` is owned by Zone 2!)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F3_GRID.Z_THRESHOLD,
    spanStart: F3_GRID.X_WEST_OUTER - 0.3,
    spanEnd: F3_GRID.X_CORE_WEST - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.basaltStone,
    accentMat,
    targetGroup: cellGroup,
    portals: [
      // Into Zone 4 NW Aqueduct
      { start: F3_PORTALS.Z3_Z4_L0_X[0], end: F3_PORTALS.Z3_Z4_L0_X[1], ...F3_PORTAL_L0, kind: 'door', framed: true, accentHeader: true },
      { start: F3_PORTALS.Z3_Z4_L1_X[0], end: F3_PORTALS.Z3_Z4_L1_X[1], ...F3_PORTAL_L1, kind: 'door', framed: true, accentHeader: true },
      { start: F3_PORTALS.Z3_Z4_L2_X[0], end: F3_PORTALS.Z3_Z4_L2_X[1], ...F3_PORTAL_L2, kind: 'door', framed: true, accentHeader: true },
      // Into Zone 5 NW Glacial Crypt
      { start: F3_PORTALS.Z3_Z5_L0_X[0], end: F3_PORTALS.Z3_Z5_L0_X[1], ...F3_PORTAL_L0, kind: 'door', framed: true, accentHeader: true },
      { start: F3_PORTALS.Z3_Z5_L1_X[0], end: F3_PORTALS.Z3_Z5_L1_X[1], ...F3_PORTAL_L1, kind: 'door', framed: true, accentHeader: true },
      { start: F3_PORTALS.Z3_Z5_L2_X[0], end: F3_PORTALS.Z3_Z5_L2_X[1], ...F3_PORTAL_L2, kind: 'door', framed: true, accentHeader: true },
    ],
    name: 'F3_Z3_NorthWall',
  });

  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F3_GRID.Z_CLOISTER_SOUTH,
    spanStart: F3_GRID.X_WEST_OUTER - 0.3,
    spanEnd: F3_GRID.X_CORE_WEST - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.basaltStone,
    accentMat: goldMat,
    targetGroup: cellGroup,
    portals: [
      // Jammed Roll-Under Shutter #2 (`x ∈ [-26, -22]`)
      { start: F3_PORTALS.Z3_Z10_JAMMED_X[0], end: F3_PORTALS.Z3_Z10_JAMMED_X[1], ...F3_PORTAL_L0, kind: 'door', framed: true, accentHeader: true },
      // Open West L0 Arch into Zone 10
      { start: F3_PORTALS.Z3_Z10_L0_WEST_X[0], end: F3_PORTALS.Z3_Z10_L0_WEST_X[1], ...F3_PORTAL_L0, kind: 'door', framed: true, accentHeader: true },
      // L1 & L2 Portals into Zone 10
      { start: F3_PORTALS.Z3_Z10_L1_X[0], end: F3_PORTALS.Z3_Z10_L1_X[1], ...F3_PORTAL_L1, kind: 'door', framed: true, accentHeader: true },
      { start: F3_PORTALS.Z3_Z10_L2_X[0], end: F3_PORTALS.Z3_Z10_L2_X[1], ...F3_PORTAL_L2, kind: 'door', framed: true, accentHeader: true },
    ],
    name: 'F3_Z3_SouthWall',
  });

  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F3_GRID.X_WEST_OUTER,
    spanStart: F3_GRID.Z_THRESHOLD + 0.3,
    spanEnd: F3_GRID.Z_CLOISTER_SOUTH - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.basaltStone,
    targetGroup: cellGroup,
    name: 'F3_Z3_WestOuterWall',
  });

  // Zero-gap elevated doorway threshold sills on Zone 3 North & South partition walls
  addF3PortalSill(collector, { axis: 'x', coord: F3_GRID.Z_THRESHOLD, span: F3_PORTALS.Z3_Z4_L1_X, y: y1, material: mats.basaltStone, targetGroup: cellGroup, name: 'F3_Z3_Sill_Z4_L1' });
  addF3PortalSill(collector, { axis: 'x', coord: F3_GRID.Z_THRESHOLD, span: F3_PORTALS.Z3_Z4_L2_X, y: y2, material: mats.glacialMarble, targetGroup: cellGroup, name: 'F3_Z3_Sill_Z4_L2' });
  addF3PortalSill(collector, { axis: 'x', coord: F3_GRID.Z_THRESHOLD, span: F3_PORTALS.Z3_Z5_L1_X, y: y1, material: mats.basaltStone, targetGroup: cellGroup, name: 'F3_Z3_Sill_Z5_L1' });
  addF3PortalSill(collector, { axis: 'x', coord: F3_GRID.Z_THRESHOLD, span: F3_PORTALS.Z3_Z5_L2_X, y: y2, material: mats.glacialMarble, targetGroup: cellGroup, name: 'F3_Z3_Sill_Z5_L2' });
  addF3PortalSill(collector, { axis: 'x', coord: F3_GRID.Z_CLOISTER_SOUTH, span: F3_PORTALS.Z3_Z10_L1_X, y: y1, material: mats.basaltStone, targetGroup: cellGroup, name: 'F3_Z3_Sill_Z10_L1' });
  addF3PortalSill(collector, { axis: 'x', coord: F3_GRID.Z_CLOISTER_SOUTH, span: F3_PORTALS.Z3_Z10_L2_X, y: y2, material: mats.glacialMarble, targetGroup: cellGroup, name: 'F3_Z3_Sill_Z10_L2' });

  // Jammed Roll-Under Ice-Blast Shutter #2 (`[V]` Dodge Roll shortcut into Zone 10 SW Cavern!)
  buildTacticalDoor(collector, mats, {
    id: F3_IDS.jammedZigguratCavern,
    mode: 'jammed_roll',
    x: -24.0,
    y: y0,
    z: F3_GRID.Z_CLOISTER_SOUTH,
    width: 4.0,
    height: 2.65,
    spanAxis: 'x',
    targetGroup: cellGroup,
  });

  // 3. LEVEL 1 (`31.1m`) ZIGGURAT TERRACES (North Promenade + Cross-Bridge + South Stepped Terrace)
  //    North L1 Promenade (`x ∈ [-53.69, -12.31], z ∈ [-3.69, -0.3]`) -> links Zone 2 L1, Zone 4 L1, Zone 5 L1!
  addWalkableDeck(collector, {
    minX: -53.69,
    maxX: -12.31,
    minZ: -3.69,
    maxZ: -0.3,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z3_L1_NorthPromenade',
  });
  //    South-Central L1 Terrace (`x ∈ [-43.7, -24.3], z ∈ [+5.6, +8.69]`) -> receives Stage 1 Stair (`x = -24.3`),
  //    feeds Stage 2 Stair (`x = -43.7`) AND connects Zone 10 L1 portal (`x ∈ [-36.0, -32.4]`)!
  addWalkableDeck(collector, {
    minX: -43.7,
    maxX: -24.3,
    minZ: 5.6,
    maxZ: 8.69,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z3_L1_SouthTerrace',
  });
  //    L1 Cross-Bridge (`x ∈ [-27.5, -24.3], z ∈ [-0.3, +5.6]`) connecting North L1 Promenade <-> South L1 Terrace
  //    Cleanly 0.5m East of Express Stair foot (`x = -28.0`) -> ZERO collision!
  addWalkableDeck(collector, {
    minX: -27.5,
    maxX: -24.3,
    minZ: -0.3,
    maxZ: 5.6,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z3_L1_CrossBridge',
  });

  // L1 Guardrails (leaving Cross-Bridge & stair mouths wide open!)
  buildGuardrailRun(collector, mats, { x1: -53.6, z1: -0.3, x2: -27.5, z2: -0.3, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -24.3, z1: -0.3, x2: -12.35, z2: -0.3, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -27.5, z1: -0.3, x2: -27.5, z2: 5.6, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -24.3, z1: -0.3, x2: -24.3, z2: 5.6, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -43.7, z1: 5.6, x2: -27.5, z2: 5.6, y: y1, accentMat, targetGroup: cellGroup });

  // 4. LEVEL 2 (`34.2m`) CROWN ZIGGURAT DECKS (West Crown Sanctum + North L2 Skywalk + East Spur to Zone 2 L2!)
  //    West Crown Terrace North/Center (`x ∈ [-53.69, -40.0], z ∈ [-3.69, +6.69]`) — receives Express `L0→L2` Stair!
  addWalkableDeck(collector, {
    minX: -53.69,
    maxX: -40.0,
    minZ: -3.69,
    maxZ: 6.69,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z3_L2_WestCrownMain',
  });
  //    SW Crown Landing (`x ∈ [-53.69, -49.5], z ∈ [+6.69, +8.69]`) — receives Stage 2 `L1→L2` Stair (`x = -49.5`)
  //    AND connects cleanly through Zone 10 L2 portal (`x ∈ [-53.2, -49.8]`) with zero stair interference!
  addWalkableDeck(collector, {
    minX: -53.69,
    maxX: -49.5,
    minZ: 6.69,
    maxZ: 8.69,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z3_L2_SWLanding',
  });
  //    North L2 Crown Skywalk (`x ∈ [-40.0, -12.31], z ∈ [-3.69, -0.5]`) — connects Zone 4 L2 (`x ∈ [-24, -20]`)!
  addWalkableDeck(collector, {
    minX: -40.0,
    maxX: -12.31,
    minZ: -3.69,
    maxZ: -0.5,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z3_L2_NorthSkywalk',
  });
  //    East L2 Spur (`x ∈ [-15.8, -12.31], z ∈ [-0.5, +5.0]`) — meets Zone 2 L2 portal (`z ∈ [+0.2, +4.8]`)!
  addWalkableDeck(collector, {
    minX: -15.8,
    maxX: -12.31,
    minZ: -0.5,
    maxZ: 5.0,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z3_L2_EastSpur',
  });

  // L2 Guardrails (open cleanly at Express Stair mouth `z ∈ [+0.9, +4.1]` on `x = -40.0` AND Stage 2 Stair mouth!)
  buildGuardrailRun(collector, mats, { x1: -40.0, z1: -0.5, x2: -40.0, z2: 0.9, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -40.0, z1: 4.1, x2: -40.0, z2: 6.69, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -49.5, z1: 6.69, x2: -40.0, z2: 6.69, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -40.0, z1: -0.5, x2: -15.8, z2: -0.5, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -15.8, z1: -0.5, x2: -15.8, z2: 5.0, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -15.8, z1: 5.0, x2: -12.35, z2: 5.0, y: y2, accentMat: goldMat, targetGroup: cellGroup });

  // 5. HERO EXPRESS `L0 → L2` GRAND TEMPLE STAIRCASE (`12.0m` uninterrupted climb `28.0m → 34.2m`!)
  buildStraightStairFlight(collector, mats, {
    x: -34.0,
    z: 2.5,
    width: 3.2,
    length: 12.0,
    yStart: y2, // x = -40.0 -> 34.2m (West L2 Crown Terrace!)
    yEnd: y0, // x = -28.0 -> 28.0m (L0 Ziggurat Floor!)
    axis: 'x',
    steps: 28,
    railMinSide: true,
    railMaxSide: true,
    targetGroup: cellGroup,
    accentMat: goldMat,
  });

  // 6. TWO-STAGE STEPPED ASCENT (`L0 → L1` & `L1 → L2` flush against South wall `z = +8.70`!)
  buildStraightStairFlight(collector, mats, {
    x: -21.4,
    z: 7.7,
    width: 2.0,
    length: 5.8,
    yStart: y1, // x = -24.3 -> 31.1m (South L1 Terrace!)
    yEnd: y0, // x = -18.5 -> 28.0m (L0 Floor!)
    axis: 'x',
    railMinSide: true,
    railMaxSide: false,
    targetGroup: cellGroup,
    accentMat,
  });

  buildStraightStairFlight(collector, mats, {
    x: -46.6,
    z: 7.7,
    width: 2.0,
    length: 5.8,
    yStart: y2, // x = -49.5 -> 34.2m (SW L2 Crown Landing!)
    yEnd: y1, // x = -43.7 -> 31.1m (South L1 Terrace!)
    axis: 'x',
    railMinSide: true,
    railMaxSide: false,
    targetGroup: cellGroup,
    accentMat: goldMat,
  });

  // 7. Monumental Stepped Ziggurat Monoliths, Luminous Cryo-Runways, Barricades & Explosive Barrels
  const basaltSpecs: BoxSpec[] = [];
  const goldSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];

  // Fluted basalt-and-gold monolith pylons flanking the ceremonial Express Stair approach at `x = -23.4` (strictly clear of L1 Cross-Bridge `x ∈ [-27.5, -24.3]`!)
  for (const pz of [0.25, 4.75]) {
    basaltSpecs.push({ w: 0.72, h: 3.6, d: 0.72, x: -23.4, y: y0 + 1.806, z: pz });
    goldSpecs.push({ w: 0.88, h: 0.14, d: 0.88, x: -23.4, y: y0 + 3.64, z: pz });
    collector.boxes.push({
      minX: -23.8,
      maxX: -23.0,
      minY: y0,
      maxY: y0 + 3.75,
      minZ: pz - 0.4,
      maxZ: pz + 0.4,
      walkableTop: false,
    });
  }
  // Grounded structural temple columns supporting the West L2 Crown Terrace (`x = -40.6, z = -0.8 / +5.8`)
  const tallColH = y2 - 0.34 - (y0 + 0.006);
  for (const pz of [-0.8, 5.8]) {
    basaltSpecs.push({ w: 0.68, h: tallColH, d: 0.68, x: -40.6, y: y0 + 0.006 + tallColH * 0.5, z: pz });
    goldSpecs.push({ w: 0.84, h: 0.14, d: 0.84, x: -40.6, y: y2 - 0.42, z: pz });
    collector.boxes.push({
      minX: -40.98,
      maxX: -40.22,
      minY: y0,
      maxY: y2,
      minZ: pz - 0.38,
      maxZ: pz + 0.38,
      walkableTop: false,
    });
  }

  // Ceremonial floor inlay strips leading straight to Express Grand Stair foot
  goldSpecs.push(
    { w: 13.5, h: 0.016, d: 0.14, x: -20.5, y: y0 + 0.012, z: 0.85 },
    { w: 13.5, h: 0.016, d: 0.14, x: -20.5, y: y0 + 0.012, z: 4.15 }
  );
  // Ceiling light strips
  for (const lx of [-46.0, -34.0, -21.0]) {
    lightSpecs.push({ w: 8.5, h: 0.1, d: 0.44, x: lx, y: y0 + ceilH - 0.06, z: 2.5 });
  }

  // Watertight Roof Slab (`top = 38.80m < 39.00m`!)
  const roofMesh = buildBatchedBoxesMesh(
    [{ w: 42.3, h: F3_ROOF_THICK, d: 13.0, x: -33.15, y: F3_ROOF_CENTER_Y, z: 2.5 }],
    mats.basaltStone,
    { receiveShadow: true, name: 'F3_Z3_RoofSlab' }
  );
  if (roofMesh) {
    cellGroup.add(roofMesh);
    collector.wallMeshes.push(roofMesh);
  }

  const monoMesh = buildBatchedBoxesMesh(basaltSpecs, mats.basaltStone, {
    castShadow: true,
    receiveShadow: true,
    name: 'F3_Z3_Monoliths',
  });
  if (monoMesh) {
    cellGroup.add(monoMesh);
    collector.wallMeshes.push(monoMesh);
  }
  const goldMesh = buildBatchedBoxesMesh(goldSpecs, goldMat, { name: 'F3_Z3_GoldTrim' });
  if (goldMesh) cellGroup.add(goldMesh);
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F3_Z3_Lights' });
  if (lightMesh) cellGroup.add(lightMesh);

  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -17.0, y: y0, z: 2.5, w: 0.9, h: 1.0, d: 2.4, walkableTop: true },
      { x: -46.2, y: y2, z: 2.5, w: 0.9, h: 1.0, d: 2.6, walkableTop: true },
    ],
    { targetGroup: cellGroup, accentMat: goldMat, name: 'F3_Z3_Cover' }
  );

  // Chain-detonable Explosive Plasma Barrels in the Ziggurat
  buildExplosiveBarrel(collector, mats, { id: 'f3_barrel_z3_l0_a', x: -20.0, y: y0, z: 0.2, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f3_barrel_z3_l0_b', x: -21.8, y: y0, z: 1.4, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f3_barrel_z3_l2', x: -43.0, y: y2, z: -1.4, targetGroup: cellGroup });

  addWallStencilPlaque(cellGroup, mats, {
    code: '03-ZIG',
    title: 'BASALT ZIGGURAT',
    subtitle: 'EXPRESS L0→L2 GRAND STAIR · TWO-STAGE ASCENT',
    accentHex: 0xe6ad46,
    x: -53.62,
    y: y2 + 2.6,
    z: 2.5,
    rotY: Math.PI * 0.5,
    width: 6.4,
    height: 1.4,
  });

  return {
    id: 'f3_zone3_west_ziggurat',
    group: cellGroup,
    triggerBounds: { minX: -54.0, maxX: -8.0, minZ: -8.0, maxZ: 13.0 },
    center: { x: -33.0, z: 2.5 },
    maxViewDistance: 68.0,
  };
}
