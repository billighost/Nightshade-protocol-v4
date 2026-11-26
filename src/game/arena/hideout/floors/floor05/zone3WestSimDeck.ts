import * as THREE from 'three';
import { addWallStencilPlaque } from '../../architecture';
import {
  buildBatchedBoxesMesh,
  buildInstancedBoxes,
  type BoxSpec,
  type HideoutMaterialRegistry,
} from '../../materials';
import {
  addLaneMarkerPlaque,
  addWalkableDeck,
  buildArchitecturalWall,
  buildJerseyBarricades,
  buildTacticalConsoleBenches,
  buildWallEquipmentBays,
} from '../../architecture';
import {
  buildGuardrailRun,
  buildStraightStairFlight,
  type FloorGeometryCollector,
} from '../../stairs';
import { buildTacticalDoor } from '../../mechanics';
import type { OcclusionCell } from '../../types';
import { buildExplosiveBarrel, buildJumpPad } from '../../mechanics';
import {
  F5_BASE_Y,
  F5_CEILINGS,
  F5_IDS,
  F5_PORTALS,
  F5_UPPER_Y,
  F5_WALLS,
} from './layout';

/**
 * FLOOR 05 — ZONE 3 (WEST OCCLUSION CELL): TACTICAL SIM-DECK KILL-GRID
 * Footprint: x ∈ [-48.0, -18.0] (30m wide) × z ∈ [-10.0, +10.0] (20m deep), Ceiling: 10.2m
 *
 * Call of Duty Modern Warfare Shoot-House & Kill-Grid Arena:
 * - Multi-lane CQB ballistic composite breach walls with framed doorways & tactical sightline windows
 * - Full-length Elevated Overwatch Catwalk (`y = 60.4m`) linking Coliseum `westMidUpperZ`, NW Orbital & SW Reactor
 * - Flush West Wall Staircase (`x = -46.32, width = 2.70` -> `-47.67` flush against `-47.70` wall — ZERO gap!)
 * - Calibrated Pneumatic Jump Pad (`padWestSim`) launching cleanly through a dedicated `2.8m` rail opening
 * - Jammed Half-Open Roll-Under Blast Shutter (`f5_jammed_sim_nw`) into NW Orbital Array (`[V]` dodge-roll!)
 * - 2 Pressurized Explosive Plasma Barrels flanking the Kill-Grid central breach corridor!
 */
export function buildFloor5Zone3WestSimDeck(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const baseY = F5_BASE_Y; // 56.0m
  const upperY = F5_UPPER_Y; // 60.4m
  const ceilH = F5_CEILINGS.westSimDeck; // 10.2m
  const emeraldHex = 0x10b981;
  const accentMat = mats.floorAccent[8];
  const cellGroup = new THREE.Group();
  cellGroup.name = 'F5_ZONE3_WEST_SIMDECK';
  collector.group.add(cellGroup);

  // 1. Floor & Roof Slabs
  addWalkableDeck(collector, {
    minX: F5_WALLS.westOuterX,
    maxX: F5_WALLS.coliseumWestX,
    minZ: F5_WALLS.northSplitZ,
    maxZ: F5_WALLS.southSplitZ,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    targetGroup: cellGroup,
    name: 'F5_Z3_SimDeckFloor',
  });
  const ceilMesh = buildBatchedBoxesMesh(
    [{ w: 29.4, h: 0.6, d: 19.4, x: -33.0, y: baseY + ceilH + 0.3, z: 0 }],
    mats.darkConcrete,
    { receiveShadow: false, name: 'F5_Z3_SimDeckCeiling' }
  );
  if (ceilMesh) cellGroup.add(ceilMesh);

  // 2. Exterior West Wall & North/South Shared Split Walls (`z = ±10.0`, `height = 10.2m`)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F5_WALLS.westOuterX,
    spanStart: F5_WALLS.northSplitZ + 0.3,
    spanEnd: F5_WALLS.southSplitZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: cellGroup,
    name: 'F5_Z3_WestOuterWall',
  });

  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F5_WALLS.northSplitZ,
    spanStart: F5_WALLS.westOuterX - 0.3,
    spanEnd: F5_WALLS.coliseumWestX - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat,
    targetGroup: cellGroup,
    portals: [
      { start: F5_PORTALS.simToOrbitalUpperX[0], end: F5_PORTALS.simToOrbitalUpperX[1], bottomY: upperY, topY: upperY + 3.4, kind: 'door', framed: true, accentHeader: true },
      { start: F5_PORTALS.simToOrbitalJammedX[0], end: F5_PORTALS.simToOrbitalJammedX[1], bottomY: baseY, topY: baseY + 3.8, kind: 'door', framed: true, accentHeader: true },
      { start: F5_PORTALS.simToOrbitalAutoX[0], end: F5_PORTALS.simToOrbitalAutoX[1], bottomY: baseY, topY: baseY + 3.8, kind: 'door', framed: true, accentHeader: true },
    ],
    name: 'F5_Z3_NorthSharedWall',
  });

  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F5_WALLS.southSplitZ,
    spanStart: F5_WALLS.westOuterX - 0.3,
    spanEnd: F5_WALLS.coliseumWestX - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat,
    targetGroup: cellGroup,
    portals: [
      { start: F5_PORTALS.simToReactorUpperX[0], end: F5_PORTALS.simToReactorUpperX[1], bottomY: upperY, topY: upperY + 3.4, kind: 'door', framed: true, accentHeader: true },
      { start: F5_PORTALS.simToReactorAutoX[0], end: F5_PORTALS.simToReactorAutoX[1], bottomY: baseY, topY: baseY + 3.8, kind: 'door', framed: true, accentHeader: true },
      { start: F5_PORTALS.simToReactorOpenX[0], end: F5_PORTALS.simToReactorOpenX[1], bottomY: baseY, topY: baseY + 3.8, kind: 'door', framed: true, accentHeader: true },
    ],
    name: 'F5_Z3_SouthSharedWall',
  });

  // Jammed Roll-Under Blast Shutter into NW Orbital + Motorized Doors
  buildTacticalDoor(collector, mats, {
    id: F5_IDS.jammedSimNw,
    mode: 'jammed_roll',
    x: (F5_PORTALS.simToOrbitalJammedX[0] + F5_PORTALS.simToOrbitalJammedX[1]) * 0.5,
    y: baseY,
    z: F5_WALLS.northSplitZ,
    width: F5_PORTALS.simToOrbitalJammedX[1] - F5_PORTALS.simToOrbitalJammedX[0],
    height: 3.8,
    spanAxis: 'x',
    targetGroup: cellGroup,
  });
  buildTacticalDoor(collector, mats, {
    id: 'f5_auto_sim_orbital',
    mode: 'automatic',
    x: (F5_PORTALS.simToOrbitalAutoX[0] + F5_PORTALS.simToOrbitalAutoX[1]) * 0.5,
    y: baseY,
    z: F5_WALLS.northSplitZ,
    width: F5_PORTALS.simToOrbitalAutoX[1] - F5_PORTALS.simToOrbitalAutoX[0],
    height: 3.8,
    spanAxis: 'x',
    targetGroup: cellGroup,
  });
  buildTacticalDoor(collector, mats, {
    id: 'f5_auto_sim_reactor',
    mode: 'automatic',
    x: (F5_PORTALS.simToReactorAutoX[0] + F5_PORTALS.simToReactorAutoX[1]) * 0.5,
    y: baseY,
    z: F5_WALLS.southSplitZ,
    width: F5_PORTALS.simToReactorAutoX[1] - F5_PORTALS.simToReactorAutoX[0],
    height: 3.8,
    spanAxis: 'x',
    targetGroup: cellGroup,
  });

  // 3. Overhead Industrial Ceiling Beams & Crisp Lighting Strips
  const trussSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  for (const bx of [-42.0, -33.0, -24.0]) {
    trussSpecs.push({ w: 0.42, h: 0.44, d: 19.32, x: bx, y: baseY + ceilH - 0.24, z: 0 });
    lightSpecs.push(
      { w: 0.34, h: 0.08, d: 7.4, x: bx - 4.0, y: baseY + ceilH - 0.06, z: -4.4 },
      { w: 0.34, h: 0.08, d: 7.4, x: bx - 4.0, y: baseY + ceilH - 0.06, z: 4.4 }
    );
  }
  const trussMesh = buildBatchedBoxesMesh(trussSpecs, mats.structuralSteel, { name: 'F5_Z3_RoofTrusses' });
  if (trussMesh) cellGroup.add(trussMesh);
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F5_Z3_RoofLights' });
  if (lightMesh) cellGroup.add(lightMesh);

  // 4. FLUSH WEST WALL STAIRCASE (`x = -46.32, width = 2.70 -> minX = -47.67` flush to `-47.70` wall — ZERO GAP!)
  // Climbs Northward from `z = +6.0` (baseY 56.0) -> `z = -2.8` (upperY 60.4, length = 8.8m)
  buildStraightStairFlight(collector, mats, {
    x: -46.32,
    z: 1.6,
    width: 2.7,
    length: 8.8,
    yStart: upperY,
    yEnd: baseY,
    axis: 'z',
    steps: 20,
    railMinSide: false, // Flush to West perimeter wall!
    railMaxSide: true,
    accentMat,
    targetGroup: cellGroup,
  });

  // 5. ELEVATED `+4.4m` WEST SPINE & CENTRAL OVERWATCH CATWALK (`y = 60.4m`)
  // Split cleanly around stair cutout (`x ∈ [-47.68, -44.92], z ∈ [-2.8, +6.4]`)!
  addWalkableDeck(collector, {
    minX: -47.68,
    maxX: -42.4,
    minZ: -9.68,
    maxZ: -2.8,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F5_Z3_WestSpineNorth',
  });
  addWalkableDeck(collector, {
    minX: -44.92,
    maxX: -42.4,
    minZ: -2.8,
    maxZ: 6.4,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F5_Z3_WestSpineMidWalkway',
  });
  addWalkableDeck(collector, {
    minX: -47.68,
    maxX: -42.4,
    minZ: 6.4,
    maxZ: 9.68,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F5_Z3_WestSpineSouth',
  });

  // Central Overwatch Cross-Bridge linking West Spine straight to Coliseum `westMidUpperZ [-6.4, -2.0]`!
  addWalkableDeck(collector, {
    minX: -42.4,
    maxX: -18.32,
    minZ: -6.2,
    maxZ: -2.2,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F5_Z3_OverwatchBridge',
  });

  // Upper Threshold Bridges cleanly through `z = -10.0` (into Zone 5) and `z = +10.0` (into Zone 7)!
  addWalkableDeck(collector, {
    minX: F5_PORTALS.simToOrbitalUpperX[0] + 0.18,
    maxX: F5_PORTALS.simToOrbitalUpperX[1] - 0.18,
    minZ: -10.32,
    maxZ: -9.68,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    name: 'F5_Z3_NorthUpperThresh',
  });
  addWalkableDeck(collector, {
    minX: F5_PORTALS.simToReactorUpperX[0] + 0.18,
    maxX: F5_PORTALS.simToReactorUpperX[1] - 0.18,
    minZ: 9.68,
    maxZ: 10.32,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    name: 'F5_Z3_SouthUpperThresh',
  });

  // Grounded structural columns under Overwatch Bridge & West Spine
  const colSpecs: BoxSpec[] = [];
  for (const [cx, cz] of [
    [-42.65, -9.2],
    [-42.65, -1.8],
    [-42.65, 9.2],
    [-33.0, -5.9],
    [-25.0, -5.9],
  ] as const) {
    colSpecs.push({ w: 0.42, h: 3.972, d: 0.42, x: cx, y: baseY + 0.004 + 1.986, z: cz });
    collector.boxes.push({
      minX: cx - 0.24,
      maxX: cx + 0.24,
      minY: baseY,
      maxY: upperY,
      minZ: cz - 0.24,
      maxZ: cz + 0.24,
      walkableTop: false,
    });
  }
  const colMesh = buildBatchedBoxesMesh(colSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F5_Z3_CatwalkColumns',
  });
  if (colMesh) {
    cellGroup.add(colMesh);
    collector.wallMeshes.push(colMesh);
  }

  // Upper Guardrails (leaving clean 2.8m Jump Pad landing gap `z ∈ [1.0, 3.8]` on West Spine East edge!)
  buildGuardrailRun(collector, mats, { x1: -42.4, z1: -9.68, x2: -42.4, z2: -6.2, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -42.4, z1: -2.2, x2: -42.4, z2: 1.0, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -42.4, z1: 3.8, x2: -42.4, z2: 9.68, y: upperY, accentMat, targetGroup: cellGroup });
  // Stairwell safety rails along South edge of cutout (`z = 6.4`) and East edge of cutout (`x = -44.92`)
  buildGuardrailRun(collector, mats, { x1: -47.68, z1: 6.4, x2: -44.92, z2: 6.4, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -44.92, z1: -2.8, x2: -44.92, z2: 6.4, y: upperY, accentMat, targetGroup: cellGroup });
  // Overwatch Cross-Bridge North & South guardrails
  buildGuardrailRun(collector, mats, { x1: -42.4, z1: -6.2, x2: -18.32, z2: -6.2, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -42.4, z1: -2.2, x2: -18.32, z2: -2.2, y: upperY, accentMat, targetGroup: cellGroup });

  // 6. CALIBRATED PNEUMATIC JUMP PAD (`padWestSim`) launching cleanly onto West Spine Mid Walkway (`x ∈ [-44.92, -42.4], z = +2.4`)!
  buildJumpPad(collector, mats, {
    id: F5_IDS.padWestSim,
    x: -39.8,
    y: baseY,
    z: 2.4,
    launchVy: 13.4,
    launchVx: -3.4, // Lands squarely at x ≈ -43.2 on the 60.4m deck through the z ∈ [1.0, 3.8] rail gap!
    launchVz: 0,
    targetGroup: cellGroup,
  });

  // 7. CALL OF DUTY SHOOT-HOUSE KILL-GRID CQB PARTITIONS (`mats.ballisticPanel`, `height = 3.2m` cleanly below 60.4m bridge!)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: -34.0,
    spanStart: -5.6,
    spanEnd: 6.2,
    baseY,
    height: 3.15,
    thickness: 0.42,
    wallMat: mats.ballisticPanel,
    accentMat,
    targetGroup: cellGroup,
    portals: [
      { start: -3.6, end: -1.4, bottomY: baseY, topY: baseY + 2.65, kind: 'door', framed: true },
      { start: 0.8, end: 3.8, bottomY: baseY + 1.05, topY: baseY + 2.45, kind: 'window', framed: true },
    ],
    name: 'F5_Z3_KillGridWestPartition',
  });

  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: -25.8,
    spanStart: -5.6,
    spanEnd: 6.2,
    baseY,
    height: 3.15,
    thickness: 0.42,
    wallMat: mats.ballisticPanel,
    accentMat,
    targetGroup: cellGroup,
    portals: [
      { start: -3.8, end: -1.0, bottomY: baseY + 1.05, topY: baseY + 2.45, kind: 'window', framed: true },
      { start: 1.6, end: 4.0, bottomY: baseY, topY: baseY + 2.65, kind: 'door', framed: true },
    ],
    name: 'F5_Z3_KillGridEastPartition',
  });

  // Transverse center kill-house baffle connecting West & East partitions with central breach arch
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: 0.2,
    spanStart: -33.78,
    spanEnd: -26.02,
    baseY,
    height: 3.15,
    thickness: 0.42,
    wallMat: mats.ballisticPanel,
    accentMat,
    targetGroup: cellGroup,
    portals: [
      { start: -31.2, end: -28.6, bottomY: baseY, topY: baseY + 2.65, kind: 'door', framed: true },
    ],
    name: 'F5_Z3_KillGridMidBaffle',
  });

  // Floor tactical kill-grid painted/luminous lane strips (lifted 4mm above floor -> zero Z-fighting!)
  const gridStripSpecs: BoxSpec[] = [
    { w: 22.0, h: 0.012, d: 0.14, x: -30.0, y: baseY + 0.008, z: -7.6 },
    { w: 22.0, h: 0.012, d: 0.14, x: -30.0, y: baseY + 0.008, z: 7.6 },
    { w: 0.14, h: 0.012, d: 15.0, x: -29.9, y: baseY + 0.008, z: 0 },
  ];
  const gridStripMesh = buildInstancedBoxes(gridStripSpecs, accentMat, { name: 'F5_Z3_KillGridFloorLines' });
  if (gridStripMesh) cellGroup.add(gridStripMesh);

  // Tactical Jersey Cover Barricades, Gear Lockers & Control Desks
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -30.0, y: baseY, z: -6.6, w: 2.6, h: 1.0, d: 0.9, walkableTop: true },
      { x: -30.0, y: baseY, z: 6.6, w: 2.6, h: 1.0, d: 0.9, walkableTop: true },
      { x: -21.4, y: baseY, z: -4.4, w: 0.9, h: 1.0, d: 2.4, walkableTop: true },
      { x: -21.4, y: baseY, z: 4.4, w: 0.9, h: 1.0, d: 2.4, walkableTop: true },
    ],
    { targetGroup: cellGroup, accentMat: mats.hazardStripe, name: 'F5_Z3_KillGridCover' }
  );

  buildWallEquipmentBays(
    collector,
    mats,
    [
      { axis: 'z', coord: -47.66, inwardDir: 1, centerAlong: -6.4, baseY, width: 4.6, height: 3.1 },
    ],
    { targetGroup: cellGroup, accentMat, name: 'F5_Z3_GearLockers' }
  );

  buildTacticalConsoleBenches(
    collector,
    mats,
    [
      { x: -30.0, y: upperY, z: -5.45, w: 3.4, h: 1.0, d: 0.72 },
    ],
    { targetGroup: cellGroup, accentMat, name: 'F5_Z3_OverwatchDesk' }
  );

  // 2 Pressurized Explosive Plasma Barrels flanking the CQB breach lanes!
  buildExplosiveBarrel(collector, mats, { id: 'f5_barrel_sim_n', x: -31.8, y: baseY, z: -3.0, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f5_barrel_sim_s', x: -28.0, y: baseY, z: 3.4, targetGroup: cellGroup });

  // Clean Unobstructed Signage & Lane Markers (high enough to clear the Overwatch Bridge guardrail from every angle!)
  addWallStencilPlaque(cellGroup, mats, {
    code: 'SIM-5',
    title: 'TACTICAL SIM-DECK KILL-GRID',
    subtitle: 'BALLISTIC CQB BREACH HOUSE · OVERWATCH CATWALK',
    accentHex: emeraldHex,
    x: -33.0,
    y: baseY + 8.65,
    z: -9.62,
    rotY: 0,
    width: 6.4,
    height: 1.48,
  });
  addLaneMarkerPlaque(cellGroup, mats, {
    label: 'LANE A',
    accentHex: emeraldHex,
    x: -33.76,
    y: baseY + 2.86,
    z: -2.5,
    rotY: Math.PI * 0.5,
  });
  addLaneMarkerPlaque(cellGroup, mats, {
    label: 'BREACH',
    accentHex: emeraldHex,
    x: -29.9,
    y: baseY + 2.86,
    z: 0.45,
    rotY: 0,
  });

  return {
    id: 'f5_west_simdeck',
    group: cellGroup,
    triggerBounds: { minX: -48.5, maxX: -14.0, minZ: -14.0, maxZ: 14.0 },
    center: { x: -33.0, z: 0.0 },
    maxViewDistance: 44.0,
  };
}
