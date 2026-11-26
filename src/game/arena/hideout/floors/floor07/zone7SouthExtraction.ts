import * as THREE from 'three';
import { buildMassiveBulkheadDoor } from '../../mechanics';
import { buildFloorControlCenter } from '../../mechanics';
import { buildBatchedBoxesMesh, type BoxSpec, type HideoutMaterialRegistry } from '../../materials';
import {
  addLaneMarkerPlaque,
  addWalkableDeck,
  buildArchitecturalWall,
  buildJerseyBarricades,
} from '../../architecture';
import {
  buildDescentAirlockGallery,
  buildGuardrailRun,
  type FloorGeometryCollector,
} from '../../stairs';
import type { BulkheadDoorRig, ControlCenterRig } from '../../types';
import { F7_BASE_Y, F7_CEILINGS, F7_META, F7_UPPER_Y, F7_WALLS } from './layout';

export interface Zone7SouthExtractionResult {
  exitDoor: BulkheadDoorRig;
  controlCenter: ControlCenterRig;
}

/**
 * Zone 7 — South Extraction Concourse & Descent Airlock (`x ∈ [-16, +16], z ∈ [+10.5, +17.0]`,
 * plus Folded U-Turn Descent Gallery `7 -> 6` at `x ∈ [-6.2, +6.2], z ∈ [+17.0, +36.0]`)
 * - Elevated South Overlook Bridge (`y = 88.4m`) linking SW Cargo Gantry & SE Turbine Catwalk
 *   straight across the concourse, stopping 2.0m clear in front of Bulkhead 07!
 * - Floor 07 Control Center cleanly staged on the East extraction apron
 * - Massive Exit Bulkhead 07 & South Descent Airlock Gallery connecting seamlessly to Floor 06!
 */
export function buildZone7SouthExtraction(
  collector: FloorGeometryCollector,
  detailGroup: THREE.Group,
  mats: HideoutMaterialRegistry
): Zone7SouthExtractionResult {
  const baseY = F7_BASE_Y;
  const upperY = F7_UPPER_Y;
  const ceilH = F7_CEILINGS.rotunda;
  const accentMat = mats.floorAccent[7];

  // 1. South Perimeter Wall (`z = +17.0`) with centered 5.6m × 5.4m Exit Bulkhead Portal
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F7_WALLS.rotundaSouthZ,
    spanStart: F7_WALLS.rotundaWestX,
    spanEnd: F7_WALLS.rotundaEastX,
    baseY,
    height: ceilH,
    thickness: 0.6,
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
    accentMat,
    name: 'F7_Z7_SouthWall',
  });

  // 2. Massive Exit Bulkhead 07 Door (`x = 0, z = +17.0, rotY = Math.PI`)
  const exitDoor = buildMassiveBulkheadDoor(collector.group, mats, {
    floor: 7,
    x: 0,
    y: baseY,
    z: F7_WALLS.rotundaSouthZ,
    rotY: Math.PI,
    width: 5.6,
    height: 5.4,
    plaqueTitle: 'BULKHEAD 07 EXIT',
    plaqueSubtitle: 'DESCENT TO FLOOR 06 ARCHIVE',
  });
  collector.boxes.push(exitDoor.collider);
  collector.wallMeshes.push(...exitDoor.raycastMeshes);

  // 3. Folded U-Turn Descent Airlock Gallery (`7 -> 6`, South `+Z`)
  buildDescentAirlockGallery(collector, mats, 7, 6, baseY, 'south', F7_WALLS.rotundaSouthZ);

  // 4. Floor 07 Control Center cleanly positioned East of the extraction lane (zero doorway clash!)
  const controlCenter = buildFloorControlCenter(
    collector.group,
    mats,
    collector.boxes,
    collector.wallMeshes,
    {
      floor: 7,
      x: 7.4,
      y: baseY,
      z: 13.8,
      rotY: -Math.PI * 0.78,
    }
  );

  // 5. Elevated South Overlook Bridge (`y = 88.4m`, `x ∈ [-16.0, +16.0], z ∈ [+11.4, +15.0]`)
  // Stops cleanly 2.0m IN FRONT of the Bulkhead 07 portal (`z = +17.0`) — zero clipping & dramatic overlook!
  addWalkableDeck(collector, {
    minX: -16.0,
    maxX: 16.0,
    minZ: 11.4,
    maxZ: 15.0,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F7_Z7_SouthOverlookBridge',
  });

  // Guardrails along South Overlook Bridge (leaving clean openings at `x ∈ [-10.6, -4.4]` & `[+4.4, +10.6]` for Ring Connectors!)
  buildGuardrailRun(collector, mats, { x1: -15.65, z1: 11.48, x2: -10.85, z2: 11.48, y: upperY, accentMat });
  buildGuardrailRun(collector, mats, { x1: -4.15, z1: 11.48, x2: 4.15, z2: 11.48, y: upperY, accentMat });
  buildGuardrailRun(collector, mats, { x1: 10.85, z1: 11.48, x2: 15.65, z2: 11.48, y: upperY, accentMat });
  // Continuous South overlook railing looking straight down at Bulkhead 07!
  buildGuardrailRun(collector, mats, { x1: -15.65, z1: 14.92, x2: 15.65, z2: 14.92, y: upperY, accentMat });

  // Grounded structural columns supporting the South Overlook Bridge (strictly outside doorway lanes!)
  const colH = upperY - 0.44 - (baseY + 0.004);
  const colSpecs: BoxSpec[] = [];
  for (const cx of [-10.4, -4.5, 4.5, 10.4]) {
    colSpecs.push(
      { w: 0.54, h: colH, d: 0.54, x: cx, y: baseY + 0.004 + colH * 0.5, z: 11.7 },
      { w: 0.74, h: 0.22, d: 0.74, x: cx, y: baseY + 0.004 + 0.11, z: 11.7 }
    );
    collector.boxes.push({
      minX: cx - 0.32,
      maxX: cx + 0.32,
      minY: baseY,
      maxY: upperY - 0.42,
      minZ: 11.7 - 0.32,
      maxZ: 11.7 + 0.32,
      walkableTop: false,
    });
  }
  const colMesh = buildBatchedBoxesMesh(colSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F7_Z7_OverlookColumns',
  });
  if (colMesh) {
    collector.group.add(colMesh);
    collector.wallMeshes.push(colMesh);
  }

  // 6. Ground-level cover & floor extraction guide lines
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -7.4, y: baseY, z: 13.8, w: 2.8, h: 1.06, d: 0.78 },
    ],
    { accentMat, name: 'F7_Z7_ExtractionCover' }
  );

  const floorGuideSpecs: BoxSpec[] = [
    { w: 0.14, h: 0.012, d: 5.2, x: -2.4, y: baseY + 0.014, z: 13.6 },
    { w: 0.14, h: 0.012, d: 5.2, x: 2.4, y: baseY + 0.014, z: 13.6 },
    { w: 6.8, h: 0.012, d: 0.36, x: 0, y: baseY + 0.022, z: 15.9 },
  ];
  const guideMesh = buildBatchedBoxesMesh(floorGuideSpecs, accentMat, {
    name: 'F7_Z7_ExtractionGuides',
  });
  if (guideMesh) detailGroup.add(guideMesh);

  // 7. Flanking wing directional signage (South Exit Bulkhead renders its own crisp overhead sector plaque!)

  addLaneMarkerPlaque(detailGroup, mats, {
    label: 'CARGO BAY ←',
    accentHex: F7_META.accentHex,
    x: -15.58,
    y: baseY + 4.1,
    z: 13.0,
    rotY: Math.PI * 0.5,
    width: 2.6,
    height: 0.68,
  });
  addLaneMarkerPlaque(detailGroup, mats, {
    label: '→ TURBINES',
    accentHex: F7_META.accentHex,
    x: 15.58,
    y: baseY + 4.1,
    z: 13.0,
    rotY: -Math.PI * 0.5,
    width: 2.6,
    height: 0.68,
  });

  return { exitDoor, controlCenter };
}
