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
  addF3PortalSill,
  F3_CEIL_H,
  F3_GRID,
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
 * FLOOR 03 — ZONE 12 (SOUTH CORE): SOUTH EXTRACTION ROTUNDA & EXIT BULKHEAD 03
 * Footprint: x ∈ [-12, +12], z ∈ [+9.0, +17.0]
 *
 * - Houses Massive Exit Bulkhead 03 (`z = +17.0`, `rotY: Math.PI`) + South Descent Airlock Gallery
 *   leading seamlessly down to Floor 02 Subterranean Transit Hangar (`Y = 14.0m`)!
 * - INTENTIONALLY HAS NO CONTROL CENTER HERE! Operatives must explore the Citadel and ascend to
 *   Level 2 (`34.2m`) inside the remote SE Grand Crown Reliquary (Zone 11) to unlock Bulkhead 03 —
 *   then can sprint straight back across the Level 2 Crown Extraction Skybridge!
 * - Stacked L1 (`31.1m`) & L2 (`34.2m`) Extraction Galleries link Zone 10 (SW Cavern) <-> Zone 11 (SE Reliquary).
 */
export function buildFloor3Zone12SouthExtraction(
  collector: FloorGeometryCollector,
  detailGroup: THREE.Group,
  mats: HideoutMaterialRegistry
): BulkheadDoorRig {
  const y0 = F3_L0_Y; // 28.0m
  const y1 = F3_L1_Y; // 31.1m
  const y2 = F3_L2_Y; // 34.2m
  const ceilH = F3_CEIL_H; // 10.3m
  const group = collector.group;
  const accentMat = mats.floorAccent[3];
  const goldMat = mats.auroraGold;

  // 1. L0 Extraction Floor Deck (`x ∈ [-12, +12], z ∈ [+9, +17]`)
  addWalkableDeck(collector, {
    minX: F3_GRID.X_CORE_WEST,
    maxX: F3_GRID.X_CORE_EAST,
    minZ: F3_GRID.Z_CLOISTER_SOUTH,
    maxZ: F3_GRID.Z_EXIT,
    y: y0,
    thickness: 0.56,
    material: mats.glacialMarble,
    name: 'F3_Z12_ExtractionFloor',
  });

  // 2. South Exit Bulkhead Wall (`z = +17.0`) with 5.6m × 5.4m Exit Bulkhead 03 cutout
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F3_GRID.Z_EXIT,
    spanStart: F3_GRID.X_CORE_WEST - 0.3,
    spanEnd: F3_GRID.X_CORE_EAST + 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.basaltStone,
    accentMat: goldMat,
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
    name: 'F3_Z12_SouthExitWall',
  });

  // 3. West (`x = -12.0`) & East (`x = +12.0`) Side Walls (single-owner by Zone 12 for z ∈ [+9, +17])
  //    Stacked 3-tier portals (`L0`, `L1`, `L2`) linking Zone 10 <-> Zone 12 <-> Zone 11!
  for (const side of [-1, 1] as const) {
    buildArchitecturalWall(collector, mats, {
      axis: 'z',
      coord: side < 0 ? F3_GRID.X_CORE_WEST : F3_GRID.X_CORE_EAST,
      spanStart: F3_GRID.Z_CLOISTER_SOUTH + 0.3,
      spanEnd: F3_GRID.Z_EXIT - 0.3,
      baseY: y0,
      height: ceilH,
      wallMat: mats.basaltStone,
      accentMat,
      portals: [
        {
          start: F3_PORTALS.Z12_SIDE_Z[0],
          end: F3_PORTALS.Z12_SIDE_Z[1],
          ...F3_PORTAL_L0,
          kind: 'door',
          framed: true,
          accentHeader: true,
        },
        {
          start: F3_PORTALS.Z12_SIDE_Z[0],
          end: F3_PORTALS.Z12_SIDE_Z[1],
          ...F3_PORTAL_L1,
          kind: 'door',
          framed: true,
          accentHeader: true,
        },
        {
          start: F3_PORTALS.Z12_SIDE_Z[0],
          end: F3_PORTALS.Z12_SIDE_Z[1],
          ...F3_PORTAL_L2,
          kind: 'door',
          framed: true,
          accentHeader: true,
        },
      ],
      name: side < 0 ? 'F3_Z12_WestWall' : 'F3_Z12_EastWall',
    });
    // Zero-gap elevated doorway threshold sills bridging through West & East extraction walls
    addF3PortalSill(collector, {
      axis: 'z',
      coord: side < 0 ? F3_GRID.X_CORE_WEST : F3_GRID.X_CORE_EAST,
      span: F3_PORTALS.Z12_SIDE_Z,
      y: y1,
      material: mats.basaltStone,
      name: `F3_Z12_Sill_${side < 0 ? 'W' : 'E'}_L1`,
    });
    addF3PortalSill(collector, {
      axis: 'z',
      coord: side < 0 ? F3_GRID.X_CORE_WEST : F3_GRID.X_CORE_EAST,
      span: F3_PORTALS.Z12_SIDE_Z,
      y: y2,
      material: mats.glacialMarble,
      name: `F3_Z12_Sill_${side < 0 ? 'W' : 'E'}_L2`,
    });
  }

  // 4. Stacked L1 (`31.1m`) & L2 (`34.2m`) Extraction Overlook Galleries (`z ∈ [11.0, 15.0]`)
  //    Full 4.0m portal alignment while keeping Exit Bulkhead 03 (`z = +17.0`) cleanly visible below!
  addWalkableDeck(collector, {
    minX: -11.69,
    maxX: 11.69,
    minZ: 11.0,
    maxZ: 15.0,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    castShadow: true,
    name: 'F3_Z12_L1_Gallery',
  });
  buildGuardrailRun(collector, mats, { x1: -11.6, z1: 11.0, x2: 11.6, z2: 11.0, y: y1, accentMat });
  buildGuardrailRun(collector, mats, { x1: -11.6, z1: 15.0, x2: 11.6, z2: 15.0, y: y1, accentMat });

  addWalkableDeck(collector, {
    minX: -11.69,
    maxX: 11.69,
    minZ: 11.0,
    maxZ: 15.0,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    castShadow: true,
    name: 'F3_Z12_L2_CrownGallery',
  });
  // L2 North Spur (`x ∈ [-2.6, +2.6], z ∈ [+9.31, +11.0]`) meeting Zone 2's South L2 Portal seamlessly!
  addWalkableDeck(collector, {
    minX: -2.6,
    maxX: 2.6,
    minZ: 9.31,
    maxZ: 11.0,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    castShadow: true,
    name: 'F3_Z12_L2_NorthSpur',
  });
  // L2 guardrails cleanly open at the North Spur (`x ∈ [-2.6, +2.6]`)
  buildGuardrailRun(collector, mats, { x1: -11.6, z1: 11.0, x2: -2.6, z2: 11.0, y: y2, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: 2.6, z1: 11.0, x2: 11.6, z2: 11.0, y: y2, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: -2.6, z1: 9.35, x2: -2.6, z2: 11.0, y: y2, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: 2.6, z1: 9.35, x2: 2.6, z2: 11.0, y: y2, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: -11.6, z1: 15.0, x2: 11.6, z2: 15.0, y: y2, accentMat: goldMat });

  // 5. Architectural Temple Support Columns, Wayfinder Stele & Ceiling Roof
  const basaltSpecs: BoxSpec[] = [];
  const goldSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];

  const colH = y1 - 0.34 - (y0 + 0.006);
  for (const cx of [-6.8, 6.8]) {
    basaltSpecs.push({ w: 0.72, h: colH, d: 0.72, x: cx, y: y0 + 0.006 + colH * 0.5, z: 12.6 });
    goldSpecs.push(
      { w: 0.88, h: 0.14, d: 0.88, x: cx, y: y0 + 0.08, z: 12.6 },
      { w: 0.88, h: 0.14, d: 0.88, x: cx, y: y1 - 0.46, z: 12.6 }
    );
    collector.boxes.push({
      minX: cx - 0.4,
      maxX: cx + 0.4,
      minY: y0,
      maxY: y1,
      minZ: 12.2,
      maxZ: 13.0,
      walkableTop: false,
    });
  }

  // Luminous floor guide strip pointing toward Bulkhead 03
  goldSpecs.push(
    { w: 0.12, h: 0.016, d: 7.2, x: -1.8, y: y0 + 0.012, z: 13.0 },
    { w: 0.12, h: 0.016, d: 7.2, x: 1.8, y: y0 + 0.012, z: 13.0 }
  );
  lightSpecs.push(
    { w: 16.0, h: 0.1, d: 0.4, x: 0, y: y0 + ceilH - 0.06, z: 11.2 },
    { w: 16.0, h: 0.1, d: 0.4, x: 0, y: y0 + ceilH - 0.06, z: 15.2 }
  );

  // Watertight Roof Slab (`top = 38.80m < 39.00m`!)
  const roofMesh = buildBatchedBoxesMesh(
    [{ w: 24.0, h: F3_ROOF_THICK, d: 8.0, x: 0, y: F3_ROOF_CENTER_Y, z: 13.0 }],
    mats.basaltStone,
    { receiveShadow: true, name: 'F3_Z12_RoofSlab' }
  );
  if (roofMesh) {
    group.add(roofMesh);
    collector.wallMeshes.push(roofMesh);
  }

  const colMesh = buildBatchedBoxesMesh(basaltSpecs, mats.basaltStone, {
    castShadow: true,
    receiveShadow: true,
    name: 'F3_Z12_Columns',
  });
  if (colMesh) {
    group.add(colMesh);
    collector.wallMeshes.push(colMesh);
  }
  const goldMesh = buildBatchedBoxesMesh(goldSpecs, goldMat, { name: 'F3_Z12_GoldTrim' });
  if (goldMesh) detailGroup.add(goldMesh);
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F3_Z12_Lights' });
  if (lightMesh) detailGroup.add(lightMesh);

  // High-Visibility Wayfinder Plaques directing players to the REMOTE Level 2 Master Control in Zone 11!
  addWallStencilPlaque(group, mats, {
    code: 'LOCKED',
    title: 'REMOTE MASTER SEAL',
    subtitle: 'ASCEND TO SE CROWN RELIQUARY · LEVEL 2 (34.2M)',
    accentHex: 0xe6ad46,
    x: -7.6,
    y: y0 + 7.2,
    z: F3_GRID.Z_EXIT - 0.36,
    rotY: Math.PI,
    width: 6.4,
    height: 1.5,
  });
  addWallStencilPlaque(group, mats, {
    code: 'FL-02',
    title: 'TRANSIT HANGAR',
    subtitle: 'AUTHORIZED DESCENT AFTER LEVEL 2 OVERRIDE',
    accentHex: 0xeab308,
    x: 7.6,
    y: y0 + 7.2,
    z: F3_GRID.Z_EXIT - 0.36,
    rotY: Math.PI,
    width: 6.4,
    height: 1.5,
  });

  // 6. MASSIVE FLOOR 03 EXIT BULKHEAD DOOR (`z = +17.0`, `rotY: Math.PI`) + SOUTH DESCENT GALLERY TO FLOOR 02!
  const exitDoor = buildMassiveBulkheadDoor(group, mats, {
    floor: 3,
    x: 0,
    y: y0,
    z: F3_GRID.Z_EXIT,
    rotY: Math.PI,
    width: 5.6,
    height: 5.4,
    plaqueTitle: 'BULKHEAD 03 EXIT',
    plaqueSubtitle: 'DESCENT TO FLOOR 02 TRANSIT HANGAR',
  });
  collector.boxes.push(exitDoor.collider);
  collector.wallMeshes.push(...exitDoor.raycastMeshes);

  // Seamless U-Turn South Descent Airlock Gallery down to Floor 02 Transit Hangar (`Y = 14.0m`)!
  buildDescentAirlockGallery(collector, mats, 3, 2, y0, 'south', 17.0);

  return exitDoor;
}
