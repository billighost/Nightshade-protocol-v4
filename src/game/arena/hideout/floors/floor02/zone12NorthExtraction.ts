import * as THREE from 'three';
import { buildMassiveBulkheadDoor } from '../../mechanics';
import { addWallStencilPlaque } from '../../architecture';
import {
  buildBatchedBoxesMesh,
  type BoxSpec,
  type HideoutMaterialRegistry,
} from '../../materials';
import {
  addWalkableDeck,
  buildArchitecturalWall,
} from '../../architecture';
import {
  buildDescentAirlockGallery,
  buildGuardrailRun,
  type FloorGeometryCollector,
} from '../../stairs';
import type { BulkheadDoorRig } from '../../types';
import {
  addF2PortalSill,
  F2_CEIL_H,
  F2_GRID,
  F2_L0_Y,
  F2_L1_Y,
  F2_L2_Y,
  F2_PORTAL_L0,
  F2_PORTAL_L1,
  F2_PORTAL_L2,
  F2_PORTALS,
  F2_ROOF_CENTER_Y,
  F2_ROOF_THICK,
} from './layout';

/**
 * FLOOR 02 — ZONE 12 (NORTH CORE): NORTH EXTRACTION TERMINAL & EXIT BULKHEAD 02
 * Footprint: x ∈ [-12, +12], z ∈ [-17.0, -9.0]
 *
 * - Houses Massive Exit Bulkhead 02 (`z = -17.0`, `rotY: 0`) + North Descent Airlock Gallery
 *   leading seamlessly down to Floor 01 Abyssal Reactor Core (`Y = 0.0m`)!
 * - INTENTIONALLY HAS NO CONTROL CENTER HERE! Operatives must navigate the Voltaic Metropolis and
 *   ascend to Level 2 (`20.2m`) atop the remote NW High-Voltage Signal Control Tower (Zone 10) to
 *   unlock Bulkhead 02 — then can sprint back across the 22.5m High-Line Extraction Skybridge!
 * - Stacked L1 (`17.1m`) & L2 (`20.2m`) Extraction Gantry Galleries link Zone 10 (NW Signal Tower)
 *   <-> Zone 12 <-> Zone 11 (NE Cyber-Bazaar).
 */
export function buildFloor2Zone12NorthExtraction(
  collector: FloorGeometryCollector,
  detailGroup: THREE.Group,
  mats: HideoutMaterialRegistry
): BulkheadDoorRig {
  const y0 = F2_L0_Y; // 14.0m
  const y1 = F2_L1_Y; // 17.1m
  const y2 = F2_L2_Y; // 20.2m
  const ceilH = F2_CEIL_H; // 10.9m
  const group = collector.group;
  const accentMat = mats.floorAccent[2];
  const moltenMat = mats.moltenGlow;

  // 1. L0 Extraction Terminal Deck (`x ∈ [-12, +12], z ∈ [-17, -9]`)
  addWalkableDeck(collector, {
    minX: F2_GRID.X_CORE_WEST,
    maxX: F2_GRID.X_CORE_EAST,
    minZ: F2_GRID.Z_EXIT,
    maxZ: F2_GRID.Z_CONCOURSE_NORTH,
    y: y0,
    thickness: 0.5,
    material: mats.foundryIron,
    name: 'F2_Z12_ExtractionFloor',
  });

  // 2. North Exit Bulkhead Wall (`z = -17.0`) with 5.6m × 5.4m Exit Bulkhead 02 cutout
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F2_GRID.Z_EXIT,
    spanStart: F2_GRID.X_CORE_WEST - 0.3,
    spanEnd: F2_GRID.X_CORE_EAST + 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.foundryIron,
    accentMat,
    portals: [
      {
        start: -2.8,
        end: 2.8,
        bottomY: y0,
        topY: y0 + 5.4,
        kind: 'door',
        framed: false,
      },
    ],
    name: 'F2_Z12_NorthExitWall',
  });

  // 3. West (`x = -12.0`) & East (`x = +12.0`) Side Walls (single-owner by Zone 12 for z ∈ [-17, -9])
  //    Stacked 3-tier portals (`L0`, `L1`, `L2`) linking Zone 10 <-> Zone 12 <-> Zone 11!
  for (const side of [-1, 1] as const) {
    const coord = side < 0 ? F2_GRID.X_CORE_WEST : F2_GRID.X_CORE_EAST;
    buildArchitecturalWall(collector, mats, {
      axis: 'z',
      coord,
      spanStart: F2_GRID.Z_EXIT + 0.3,
      spanEnd: F2_GRID.Z_CONCOURSE_NORTH - 0.3,
      baseY: y0,
      height: ceilH,
      wallMat: mats.foundryIron,
      accentMat,
      portals: [
        {
          start: F2_PORTALS.Z12_SIDE_Z[0],
          end: F2_PORTALS.Z12_SIDE_Z[1],
          ...F2_PORTAL_L0,
          kind: 'door',
          framed: true,
          accentHeader: true,
        },
        {
          start: F2_PORTALS.Z12_SIDE_Z[0],
          end: F2_PORTALS.Z12_SIDE_Z[1],
          ...F2_PORTAL_L1,
          kind: 'door',
          framed: true,
          accentHeader: true,
        },
        {
          start: F2_PORTALS.Z12_SIDE_Z[0],
          end: F2_PORTALS.Z12_SIDE_Z[1],
          ...F2_PORTAL_L2,
          kind: 'door',
          framed: true,
          accentHeader: true,
        },
      ],
      name: side < 0 ? 'F2_Z12_WestWall' : 'F2_Z12_EastWall',
    });

    addF2PortalSill(collector, {
      axis: 'z',
      coord,
      span: F2_PORTALS.Z12_SIDE_Z,
      y: y1,
      material: mats.catwalkGrate,
      name: `F2_Z12_Sill_${side < 0 ? 'W' : 'E'}_L1`,
    });
    addF2PortalSill(collector, {
      axis: 'z',
      coord,
      span: F2_PORTALS.Z12_SIDE_Z,
      y: y2,
      material: mats.catwalkGrate,
      name: `F2_Z12_Sill_${side < 0 ? 'W' : 'E'}_L2`,
    });
  }

  // 4. Stacked L1 (`17.1m`) & L2 (`20.2m`) Extraction Gantry Galleries (`z ∈ [-15.0, -11.0]`)
  //    Plus L1 West/East South Spurs (`[-9.6,-6.4]` and `[+6.4,+9.6]`, `z ∈ [-11.0, -9.31]`) meeting Zone 2's dual L1 portals!
  addWalkableDeck(collector, {
    minX: -11.69,
    maxX: 11.69,
    minZ: -15.0,
    maxZ: -11.0,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F2_Z12_L1_Gallery',
  });
  addWalkableDeck(collector, {
    minX: -9.6,
    maxX: -6.4,
    minZ: -11.0,
    maxZ: -9.31,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F2_Z12_L1_SouthSpurW',
  });
  addWalkableDeck(collector, {
    minX: 6.4,
    maxX: 9.6,
    minZ: -11.0,
    maxZ: -9.31,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F2_Z12_L1_SouthSpurE',
  });
  // L1 guardrails cleanly open at both South Spurs!
  buildGuardrailRun(collector, mats, { x1: -11.6, z1: -15.0, x2: 11.6, z2: -15.0, y: y1, accentMat });
  buildGuardrailRun(collector, mats, { x1: -11.6, z1: -11.0, x2: -9.6, z2: -11.0, y: y1, accentMat });
  buildGuardrailRun(collector, mats, { x1: -6.4, z1: -11.0, x2: 6.4, z2: -11.0, y: y1, accentMat });
  buildGuardrailRun(collector, mats, { x1: 9.6, z1: -11.0, x2: 11.6, z2: -11.0, y: y1, accentMat });

  // L2 High-Line Crown Extraction Gallery (`20.2m`) + South Spur (`x ∈ [-2.6, +2.6], z ∈ [-11.0, -9.31]`)!
  addWalkableDeck(collector, {
    minX: -11.69,
    maxX: 11.69,
    minZ: -15.0,
    maxZ: -11.0,
    y: y2,
    thickness: 0.34,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F2_Z12_L2_CrownGallery',
  });
  addWalkableDeck(collector, {
    minX: -2.6,
    maxX: 2.6,
    minZ: -11.0,
    maxZ: -9.31,
    y: y2,
    thickness: 0.34,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F2_Z12_L2_SouthSpur',
  });
  buildGuardrailRun(collector, mats, { x1: -11.6, z1: -15.0, x2: 11.6, z2: -15.0, y: y2, accentMat: moltenMat });
  buildGuardrailRun(collector, mats, { x1: -11.6, z1: -11.0, x2: -2.6, z2: -11.0, y: y2, accentMat: moltenMat });
  buildGuardrailRun(collector, mats, { x1: 2.6, z1: -11.0, x2: 11.6, z2: -11.0, y: y2, accentMat: moltenMat });
  buildGuardrailRun(collector, mats, { x1: -2.6, z1: -11.0, x2: -2.6, z2: -9.35, y: y2, accentMat: moltenMat });
  buildGuardrailRun(collector, mats, { x1: 2.6, z1: -11.0, x2: 2.6, z2: -9.35, y: y2, accentMat: moltenMat });

  // 5. Industrial Support Columns, Luminous Floor Guides & Roof
  const steelSpecs: BoxSpec[] = [];
  const alloySpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];

  const colH = y1 - 0.34 - (y0 + 0.006);
  for (const cx of [-6.8, 6.8]) {
    steelSpecs.push({ w: 0.68, h: colH, d: 0.68, x: cx, y: y0 + 0.006 + colH * 0.5, z: -12.8 });
    alloySpecs.push(
      { w: 0.84, h: 0.14, d: 0.84, x: cx, y: y0 + 0.08, z: -12.8 },
      { w: 0.84, h: 0.14, d: 0.84, x: cx, y: y1 - 0.42, z: -12.8 }
    );
    collector.boxes.push({
      minX: cx - 0.38,
      maxX: cx + 0.38,
      minY: y0,
      maxY: y1,
      minZ: -13.18,
      maxZ: -12.42,
      walkableTop: false,
    });
  }

  alloySpecs.push(
    { w: 0.12, h: 0.016, d: 7.2, x: -1.8, y: y0 + 0.012, z: -13.0 },
    { w: 0.12, h: 0.016, d: 7.2, x: 1.8, y: y0 + 0.012, z: -13.0 }
  );
  lightSpecs.push(
    { w: 16.0, h: 0.1, d: 0.42, x: 0, y: y0 + ceilH - 0.06, z: -11.2 },
    { w: 16.0, h: 0.1, d: 0.42, x: 0, y: y0 + ceilH - 0.06, z: -15.2 }
  );

  // Watertight Roof Slab (`top = 25.40m < 25.72m`!)
  const roofMesh = buildBatchedBoxesMesh(
    [{ w: 24.0, h: F2_ROOF_THICK, d: 8.0, x: 0, y: F2_ROOF_CENTER_Y, z: -13.0 }],
    mats.foundryIron,
    { receiveShadow: true, name: 'F2_Z12_RoofSlab' }
  );
  if (roofMesh) {
    group.add(roofMesh);
    collector.wallMeshes.push(roofMesh);
  }
  const colMesh = buildBatchedBoxesMesh(steelSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F2_Z12_Columns',
  });
  if (colMesh) {
    group.add(colMesh);
    collector.wallMeshes.push(colMesh);
  }
  const alloyMesh = buildBatchedBoxesMesh(alloySpecs, mats.amberAlloy, { name: 'F2_Z12_AlloyTrim' });
  if (alloyMesh) detailGroup.add(alloyMesh);
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F2_Z12_Lights' });
  if (lightMesh) detailGroup.add(lightMesh);

  // High-Visibility Wayfinder Plaques directing players to the REMOTE Level 2 Master Dispatch Spire in Zone 10!
  addWallStencilPlaque(group, mats, {
    code: 'LOCKED',
    title: 'REMOTE DISPATCH SEAL',
    subtitle: 'ASCEND TO NW SIGNAL TOWER · LEVEL 2 (20.2M)',
    accentHex: 0xf97316,
    x: -7.6,
    y: y0 + 8.35,
    z: F2_GRID.Z_EXIT + 0.36,
    rotY: 0,
    width: 6.4,
    height: 1.5,
  });
  addWallStencilPlaque(group, mats, {
    code: 'FL-01',
    title: 'REACTOR CORE',
    subtitle: 'DEEP CORE DESCENT AFTER LEVEL 2 DISPATCH OVERRIDE',
    accentHex: 0x22d3ee,
    x: 7.6,
    y: y0 + 8.35,
    z: F2_GRID.Z_EXIT + 0.36,
    rotY: 0,
    width: 6.4,
    height: 1.5,
  });

  // 6. MASSIVE FLOOR 02 EXIT BULKHEAD DOOR (`z = -17.0`, `rotY: 0`) + NORTH DESCENT GALLERY TO FLOOR 01!
  const exitDoor = buildMassiveBulkheadDoor(group, mats, {
    floor: 2,
    x: 0,
    y: y0,
    z: F2_GRID.Z_EXIT,
    rotY: 0,
    width: 5.6,
    height: 5.4,
    plaqueTitle: 'BULKHEAD 02 EXIT',
    plaqueSubtitle: 'DESCENT TO FLOOR 01 REACTOR CORE',
  });
  collector.boxes.push(exitDoor.collider);
  collector.wallMeshes.push(...exitDoor.raycastMeshes);

  // Seamless U-Turn North Descent Airlock Gallery down to Floor 01 Abyssal Reactor Core (`Y = 0.0m`)!
  buildDescentAirlockGallery(collector, mats, 2, 1, y0, 'north', 17.0);

  return exitDoor;
}
