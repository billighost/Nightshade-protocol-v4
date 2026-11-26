import * as THREE from 'three';
import { buildMassiveBulkheadDoor } from '../../mechanics';
import { buildFloorControlCenter } from '../../mechanics';
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
  buildTacticalConsoleBenches,
} from '../../architecture';
import {
  buildDescentAirlockGallery,
  buildGuardrailRun,
  type FloorGeometryCollector,
} from '../../stairs';
import type { BulkheadDoorRig, ControlCenterRig } from '../../types';
import { F4_BASE_Y, F4_CEILINGS, F4_UPPER_Y, F4_WALLS } from './layout';

export interface Floor4Zone9ExtractionResult {
  exitDoor: BulkheadDoorRig;
  controlCenter: ControlCenterRig;
}

/**
 * FLOOR 04 — ZONE 9 (NORTH): CANYON DISPATCH CONCOURSE & EXIT BULKHEAD 04
 * Footprint: x ∈ [-18, +18], z ∈ [-17.0, -10.8]
 * - Elevated North Dispatch Overlook Bridge (`y = 46.4m`) linking West & East Upper Suspension Towers
 * - Interactive Floor 04 Control Center (`[E]`) + Massive Exit Bulkhead 04 (`z = -17.0`, `rotY: 0`)
 * - Seamless North Descent Airlock Gallery down to Floor 03 Double-Helix Cryo Sanctum (`Y = 28.0m`)!
 */
export function buildFloor4Zone9NorthExtraction(
  collector: FloorGeometryCollector,
  detailGroup: THREE.Group,
  mats: HideoutMaterialRegistry
): Floor4Zone9ExtractionResult {
  const baseY = F4_BASE_Y; // 42.0m
  const upperY = F4_UPPER_Y; // 46.4m
  const ceilH = F4_CEILINGS.canyon; // 10.6m
  const accentMat = mats.floorAccent[4];
  const group = collector.group;

  // 1. North Dispatch Cliff Floor Slab (`z ∈ [-17.0, -10.8]` — meets Canyon Chasm Rim flush!)
  addWalkableDeck(collector, {
    minX: F4_WALLS.canyonWestX,
    maxX: F4_WALLS.canyonEastX,
    minZ: F4_WALLS.canyonNorthZ,
    maxZ: -10.8,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    name: 'F4_Z9_NorthDispatchDeck',
  });

  // 2. North Bulkhead Perimeter Wall (`z = -17.0`) with 5.6m × 5.4m Exit Bulkhead 04 cutout
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F4_WALLS.canyonNorthZ,
    spanStart: F4_WALLS.canyonWestX - 0.3,
    spanEnd: F4_WALLS.canyonEastX + 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWallLight,
    accentMat,
    portals: [
      {
        start: -2.8,
        end: 2.8,
        bottomY: baseY,
        topY: baseY + 5.4,
        kind: 'door',
        framed: false,
      },
    ],
    name: 'F4_Z9_NorthBulkheadWall',
  });

  // 3. Elevated North Dispatch Overlook Bridge (`y = 46.4m`, `x ∈ [-13.594, +13.594], z ∈ [-14.4, -11.6]`)
  // Inset 6mm from x = ±13.6 Suspension Towers -> ZERO Z-fighting!
  const northBridgeMesh = buildBatchedBoxesMesh(
    [{ w: 27.188, h: 0.42, d: 2.8, x: 0, y: upperY - 0.21, z: -13.0 }],
    mats.catwalkGrate,
    { castShadow: true, receiveShadow: true, name: 'F4_Z9_NorthOverlookBridge' }
  );
  if (northBridgeMesh) {
    group.add(northBridgeMesh);
    collector.wallMeshes.push(northBridgeMesh);
  }
  collector.slabs.push({
    minX: -13.6,
    maxX: 13.6,
    minZ: -14.4,
    maxZ: -11.6,
    y: upperY,
    thickness: 0.42,
  });

  buildGuardrailRun(collector, mats, { x1: -13.6, z1: -11.6, x2: 13.6, z2: -11.6, y: upperY, accentMat });
  buildGuardrailRun(collector, mats, { x1: -13.6, z1: -14.4, x2: 13.6, z2: -14.4, y: upperY, accentMat });

  // Grounded Bridge Support Columns & Monumental Bulkhead Buttresses (100% clear of Bulkhead 04 & plaques!)
  const steelSpecs: BoxSpec[] = [];
  const accSpecs: BoxSpec[] = [];
  const colH = upperY - 0.42 - (baseY + 0.004);
  for (const cx of [-9.0, -4.4, 4.4, 9.0]) {
    steelSpecs.push({ w: 0.46, h: colH, d: 0.46, x: cx, y: baseY + 0.004 + colH * 0.5, z: -13.9 });
    collector.boxes.push({
      minX: cx - 0.26,
      maxX: cx + 0.26,
      minY: baseY,
      maxY: upperY,
      minZ: -14.16,
      maxZ: -13.64,
      walkableTop: false,
    });
  }

  const buttressH = ceilH - 0.62;
  for (const px of [-5.8, 5.8]) {
    steelSpecs.push({
      w: 0.9,
      h: buttressH,
      d: 0.86,
      x: px,
      y: baseY + 0.004 + buttressH * 0.5,
      z: -16.25,
    });
    collector.boxes.push({
      minX: px - 0.48,
      maxX: px + 0.48,
      minY: baseY,
      maxY: baseY + ceilH,
      minZ: -16.7,
      maxZ: -15.8,
      walkableTop: false,
    });
    accSpecs.push({
      w: 0.12,
      h: buttressH - 1.2,
      d: 0.08,
      x: px,
      y: baseY + buttressH * 0.5,
      z: -15.77,
    });
  }

  accSpecs.push(
    { w: 0.14, h: 0.012, d: 4.5, x: -2.7, y: baseY + 0.012, z: -13.2 },
    { w: 0.14, h: 0.012, d: 4.5, x: 2.7, y: baseY + 0.012, z: -13.2 },
    { w: 28.0, h: 0.012, d: 0.12, x: 0, y: baseY + 0.026, z: -11.6 }
  );

  const steelMesh = buildBatchedBoxesMesh(steelSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F4_Z9_NorthSteel',
  });
  if (steelMesh) {
    group.add(steelMesh);
    collector.wallMeshes.push(steelMesh);
  }
  const accMesh = buildBatchedBoxesMesh(accSpecs, accentMat, { name: 'F4_Z9_NorthAccents' });
  if (accMesh) detailGroup.add(accMesh);

  const hazardApron = buildBatchedBoxesMesh(
    [{ w: 7.4, h: 0.014, d: 0.55, x: 0, y: baseY + 0.018, z: -15.65 }],
    mats.hazardStripe,
    { name: 'F4_Z9_BulkheadHazard' }
  );
  if (hazardApron) detailGroup.add(hazardApron);

  buildTacticalConsoleBenches(
    collector,
    mats,
    [
      { x: -6.4, y: upperY, z: -13.0, w: 2.8, h: 0.96, d: 0.85 },
      { x: 6.4, y: upperY, z: -13.0, w: 2.8, h: 0.96, d: 0.85 },
    ],
    { accentMat, name: 'F4_Z9_DispatchConsoles' }
  );
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -9.8, y: baseY, z: -12.0, w: 2.4, h: 0.98, d: 0.88, walkableTop: true },
      { x: 9.8, y: baseY, z: -15.2, w: 2.4, h: 0.98, d: 0.88, walkableTop: true },
    ],
    { accentMat: mats.hazardStripe, name: 'F4_Z9_DispatchCover' }
  );

  // High-Readability Architectural Stencil Signage cleanly flanking Exit Bulkhead 04!
  addWallStencilPlaque(group, mats, {
    code: '04-N',
    title: 'CANYON EXTRACTION',
    subtitle: 'ACTIVATE CONTROL CENTER · UNSEAL BULKHEAD 04',
    accentHex: 0xf97316,
    x: -11.6,
    y: baseY + 7.6,
    z: -16.62,
    rotY: 0,
    width: 6.2,
    height: 1.5,
  });
  addWallStencilPlaque(group, mats, {
    code: 'FL-03',
    title: 'CRYO SANCTUM',
    subtitle: 'AUTHORIZED OPERATIVE DESCENT TO LEVEL 03',
    accentHex: 0x67e8f9,
    x: 11.6,
    y: baseY + 7.6,
    z: -16.62,
    rotY: 0,
    width: 6.2,
    height: 1.5,
  });

  // 4. MASSIVE FLOOR 04 EXIT BULKHEAD DOOR (`z = -17.0`, `rotY: 0`) + CONTROL CENTER + NORTH DESCENT GALLERY!
  const exitDoor = buildMassiveBulkheadDoor(group, mats, {
    floor: 4,
    x: 0,
    y: baseY,
    z: F4_WALLS.canyonNorthZ,
    rotY: 0,
    width: 5.6,
    height: 5.4,
    plaqueTitle: 'BULKHEAD 04 EXIT',
    plaqueSubtitle: 'DESCENT TO FLOOR 03 CRYO SANCTUM',
  });
  collector.boxes.push(exitDoor.collider);
  collector.wallMeshes.push(...exitDoor.raycastMeshes);

  const controlCenter = buildFloorControlCenter(
    group,
    mats,
    collector.boxes,
    collector.wallMeshes,
    {
      floor: 4,
      x: -6.8,
      y: baseY,
      z: -12.2,
      rotY: 0,
    }
  );

  // Seamless U-Turn North Descent Airlock Gallery down to Floor 03 Cryo Sanctum (`Y = 28.0m`)!
  buildDescentAirlockGallery(collector, mats, 4, 3, baseY, 'north', 17.0);

  return { exitDoor, controlCenter };
}
