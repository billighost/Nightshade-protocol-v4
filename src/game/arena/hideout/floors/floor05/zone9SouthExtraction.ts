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
import { F5_BASE_Y, F5_CEILINGS, F5_UPPER_Y, F5_WALLS } from './layout';

export interface Floor5Zone9ExtractionResult {
  exitDoor: BulkheadDoorRig;
  controlCenter: ControlCenterRig;
}

/**
 * FLOOR 05 — ZONE 9 (SOUTH): DIRECTOR'S EXTRACTION CONCOURSE & EXIT BULKHEAD 05
 * Footprint: x ∈ [-18, +18], z ∈ [+10.4, +17.0]
 * - Elevated South Director's Overlook Bridge (`y = 60.4m`) linking West VIP <-> East VIP & Outer South Wings
 * - Interactive Floor 05 Control Center (`[E]`) + Massive Exit Bulkhead 05 (`z = +17.0`, `rotY: Math.PI`)
 * - Seamless South Descent Airlock Gallery down to Floor 04 Skybridge Chasm (`Y = 42.0m`)!
 */
export function buildFloor5Zone9SouthExtraction(
  collector: FloorGeometryCollector,
  detailGroup: THREE.Group,
  mats: HideoutMaterialRegistry
): Floor5Zone9ExtractionResult {
  const baseY = F5_BASE_Y;
  const upperY = F5_UPPER_Y;
  const ceilH = F5_CEILINGS.coliseum;
  const accentMat = mats.floorAccent[5];
  const group = collector.group;

  // 1. South Extraction Concourse Floor Slab (z ∈ [+10.4, +17.0] — meets Coliseum bowl rim flush!)
  addWalkableDeck(collector, {
    minX: F5_WALLS.coliseumWestX,
    maxX: F5_WALLS.coliseumEastX,
    minZ: 10.4,
    maxZ: F5_WALLS.coliseumSouthZ,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    name: 'F5_Z9_ExtractionFloor',
  });

  // 2. South Bulkhead Perimeter Wall (z = +17.0) with 5.6m × 5.4m Exit Bulkhead 05 cutout
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F5_WALLS.coliseumSouthZ,
    spanStart: F5_WALLS.coliseumWestX - 0.3,
    spanEnd: F5_WALLS.coliseumEastX + 0.3,
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
    name: 'F5_Z9_SouthBulkheadWall',
  });

  // 3. Elevated South Director's Overlook Bridge (`y = 60.4m`, `x ∈ [-11.1, +11.1], z ∈ [+11.2, +14.2]`)
  // Joins seamlessly with Zone 2's Twin VIP Stair Top Landings (`x ∈ [-13.6, -11.1]` & `[+11.1, +13.6]`, `z ∈ [11.8, 14.2]`)!
  addWalkableDeck(collector, {
    minX: -11.1,
    maxX: 11.1,
    minZ: 11.2,
    maxZ: 14.2,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F5_Z9_DirectorOverlookBridge',
  });

  // Exact Guardrails on South Overlook Bridge (leaving stair mouths `x ∈ [-13.6,-11.1]` & `[+11.1,+13.6]` at `z = 11.8` open!)
  buildGuardrailRun(collector, mats, { x1: -11.1, z1: 11.2, x2: 11.1, z2: 11.2, y: upperY, accentMat });
  buildGuardrailRun(collector, mats, { x1: -13.6, z1: 14.2, x2: 13.6, z2: 14.2, y: upperY, accentMat });
  buildGuardrailRun(collector, mats, { x1: -11.1, z1: 11.2, x2: -11.1, z2: 11.8, y: upperY, accentMat });
  buildGuardrailRun(collector, mats, { x1: 11.1, z1: 11.2, x2: 11.1, z2: 11.8, y: upperY, accentMat });

  // Grounded Bridge Columns & Monumental Bulkhead Buttresses (100% clear of Bulkhead 05 & plaques!)
  const steelSpecs: BoxSpec[] = [];
  const accSpecs: BoxSpec[] = [];
  for (const cx of [-9.0, -4.4, 4.4, 9.0]) {
    steelSpecs.push({ w: 0.46, h: 3.972, d: 0.46, x: cx, y: baseY + 0.004 + 1.986, z: 13.8 });
    collector.boxes.push({
      minX: cx - 0.26,
      maxX: cx + 0.26,
      minY: baseY,
      maxY: upperY,
      minZ: 13.54,
      maxZ: 14.06,
      walkableTop: false,
    });
  }

  const buttressH = ceilH - 0.684;
  for (const px of [-5.8, 5.8]) {
    steelSpecs.push({
      w: 0.9,
      h: buttressH,
      d: 0.86,
      x: px,
      y: baseY + 0.004 + buttressH * 0.5,
      z: 16.25,
    });
    collector.boxes.push({
      minX: px - 0.48,
      maxX: px + 0.48,
      minY: baseY,
      maxY: baseY + ceilH,
      minZ: 15.8,
      maxZ: 16.7,
      walkableTop: false,
    });
    accSpecs.push({
      w: 0.12,
      h: buttressH - 1.2,
      d: 0.08,
      x: px,
      y: baseY + buttressH * 0.5,
      z: 15.77,
    });
  }

  accSpecs.push(
    { w: 0.14, h: 0.012, d: 4.5, x: -2.7, y: baseY + 0.008, z: 13.0 },
    { w: 0.14, h: 0.012, d: 4.5, x: 2.7, y: baseY + 0.008, z: 13.0 },
    { w: 30.0, h: 0.012, d: 0.12, x: 0, y: baseY + 0.016, z: 11.4 }
  );

  const steelMesh = buildBatchedBoxesMesh(steelSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F5_Z9_ExtractionSteel',
  });
  if (steelMesh) {
    group.add(steelMesh);
    collector.wallMeshes.push(steelMesh);
  }
  const accMesh = buildBatchedBoxesMesh(accSpecs, accentMat, { name: 'F5_Z9_ExtractionAccents' });
  if (accMesh) detailGroup.add(accMesh);

  const hazardApron = buildBatchedBoxesMesh(
    [{ w: 7.4, h: 0.014, d: 0.55, x: 0, y: baseY + 0.02, z: 15.65 }],
    mats.hazardStripe,
    { name: 'F5_Z9_BulkheadHazard' }
  );
  if (hazardApron) detailGroup.add(hazardApron);

  // Director's Overlook Command Console (flanked off-center so Bulkhead 05 Exit plaque is 100% clear!)
  buildTacticalConsoleBenches(
    collector,
    mats,
    [
      { x: -6.4, y: upperY, z: 13.1, w: 2.8, h: 0.96, d: 0.85 },
      { x: 6.4, y: upperY, z: 13.1, w: 2.8, h: 0.96, d: 0.85 },
    ],
    { accentMat, name: 'F5_Z9_DirectorConsoles' }
  );
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -9.6, y: baseY, z: 11.6, w: 2.6, h: 0.98, d: 0.92, walkableTop: true },
      { x: 9.6, y: baseY, z: 15.2, w: 2.6, h: 0.98, d: 0.92, walkableTop: true },
    ],
    { accentMat: mats.hazardStripe, name: 'F5_Z9_ExtractionCover' }
  );

  // High-Readability Architectural Stencil Signage cleanly flanking Bulkhead 05!
  addWallStencilPlaque(group, mats, {
    code: '05-S',
    title: 'DIRECTOR EXTRACTION',
    subtitle: 'ACTIVATE CONTROL CENTER · UNSEAL BULKHEAD 05',
    accentHex: 0xfb7185,
    x: -11.8,
    y: baseY + 7.8,
    z: 16.62,
    rotY: Math.PI,
    width: 6.2,
    height: 1.5,
  });
  addWallStencilPlaque(group, mats, {
    code: 'FL-04',
    title: 'SKYBRIDGE CHASM',
    subtitle: 'AUTHORIZED OPERATIVE DESCENT TO LEVEL 04',
    accentHex: 0xf97316,
    x: 11.8,
    y: baseY + 7.8,
    z: 16.62,
    rotY: Math.PI,
    width: 6.2,
    height: 1.5,
  });

  // 4. MASSIVE FLOOR 05 EXIT BULKHEAD DOOR (`z = +17.0`, `rotY: Math.PI`) + CONTROL CENTER + SOUTH DESCENT GALLERY!
  const exitDoor = buildMassiveBulkheadDoor(group, mats, {
    floor: 5,
    x: 0,
    y: baseY,
    z: F5_WALLS.coliseumSouthZ,
    rotY: Math.PI,
    width: 5.6,
    height: 5.4,
    plaqueTitle: 'BULKHEAD 05 EXIT',
    plaqueSubtitle: 'DESCENT TO FLOOR 04 SKYBRIDGE CHASM',
  });
  collector.boxes.push(exitDoor.collider);
  collector.wallMeshes.push(...exitDoor.raycastMeshes);

  const controlCenter = buildFloorControlCenter(
    group,
    mats,
    collector.boxes,
    collector.wallMeshes,
    {
      floor: 5,
      x: 6.8,
      y: baseY,
      z: 11.8,
      rotY: Math.PI,
    }
  );

  // Seamless U-Turn Descent Airlock Gallery down to Floor 04 Skybridge Chasm (`Y = 42.0m`)!
  buildDescentAirlockGallery(collector, mats, 5, 4, baseY, 'south', 17.0);

  return { exitDoor, controlCenter };
}
