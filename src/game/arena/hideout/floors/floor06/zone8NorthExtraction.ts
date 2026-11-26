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
import { F6_BASE_Y, F6_CEILINGS, F6_UPPER_Y, F6_WALLS } from './layout';

export interface Floor6Zone8ExtractionResult {
  exitDoor: BulkheadDoorRig;
  controlCenter: ControlCenterRig;
}

/**
 * FLOOR 06 — ZONE 8 (NORTH): ARCHIVE EXTRACTION CONCOURSE & BULKHEAD 06 EXIT
 * Footprint: x ∈ [-18, +18], z ∈ [-17.0, -9.6]
 * - Connects seamlessly into the Suspended Monolith Cathedral (continuous 13.4m roof, ZERO seam!)
 * - Elevated North Overlook Bridge (`+4.4m = 74.4m`) linking West Upper Gallery <-> East Upper Gallery
 *   and bridging cleanly to Zone 7 NW Cryo Vault & Zone 6 NE Grav-Core upper catwalks!
 * - Interactive Floor 06 Control Center (`[E]`) + Massive Exit Bulkhead 06 (`z = -17.0`) +
 *   North Descent Airlock Gallery down to Floor 05 Tactical Amphitheater (`Y = 56.0m`)!
 */
export function buildFloor6Zone8NorthExtraction(
  collector: FloorGeometryCollector,
  detailGroup: THREE.Group,
  mats: HideoutMaterialRegistry
): Floor6Zone8ExtractionResult {
  const baseY = F6_BASE_Y;
  const upperY = F6_UPPER_Y;
  const ceilH = F6_CEILINGS.cathedral;
  const accentMat = mats.floorAccent[6];
  const group = collector.group;

  // 1. North Extraction Concourse Floor Slab (z ∈ [-17.0, -9.6] — meets trench rim at -9.6 flush!)
  addWalkableDeck(collector, {
    minX: F6_WALLS.cathedralWestX,
    maxX: F6_WALLS.cathedralEastX,
    minZ: F6_WALLS.cathedralNorthZ,
    maxZ: -9.6,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    name: 'F6_Z8_ExtractionFloor',
  });

  // 2. North Bulkhead Perimeter Wall (z = -17.0) with 5.6m × 5.4m Exit Bulkhead 06 cutout
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F6_WALLS.cathedralNorthZ,
    spanStart: F6_WALLS.cathedralWestX - 0.3,
    spanEnd: F6_WALLS.cathedralEastX + 0.3,
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
    name: 'F6_Z8_NorthBulkheadWall',
  });

  // 3. Elevated North Archive Overlook Bridge (`y = 74.4m`, `x ∈ [-13.6, +13.6], z ∈ [-14.2, -11.2]`)
  // Links West Upper Gallery & East Upper Gallery cleanly across the extraction concourse!
  addWalkableDeck(collector, {
    minX: -13.6,
    maxX: 13.6,
    minZ: -14.2,
    maxZ: -11.2,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F6_Z8_NorthOverlookBridge',
  });

  // Exact Guardrails on North Overlook Bridge (North edge `-14.2` & South edge `-11.2`, plus West/East returns to `-15.2`!)
  buildGuardrailRun(collector, mats, { x1: -13.6, z1: -11.2, x2: 13.6, z2: -11.2, y: upperY, accentMat });
  buildGuardrailRun(collector, mats, { x1: -13.6, z1: -14.2, x2: 13.6, z2: -14.2, y: upperY, accentMat });
  buildGuardrailRun(collector, mats, { x1: -13.6, z1: -15.2, x2: -13.6, z2: -14.2, y: upperY, accentMat });
  buildGuardrailRun(collector, mats, { x1: 13.6, z1: -15.2, x2: 13.6, z2: -14.2, y: upperY, accentMat });
  buildGuardrailRun(collector, mats, { x1: -17.68, z1: -15.2, x2: -13.6, z2: -15.2, y: upperY, accentMat });
  buildGuardrailRun(collector, mats, { x1: 13.6, z1: -15.2, x2: 17.68, z2: -15.2, y: upperY, accentMat });

  // Grounded Bridge Support Columns & Monumental Bulkhead Buttresses (ZERO obstruction of Bulkhead 06 or plaques!)
  const steelSpecs: BoxSpec[] = [];
  const accSpecs: BoxSpec[] = [];
  for (const cx of [-9.0, -4.4, 4.4, 9.0]) {
    steelSpecs.push({ w: 0.46, h: 3.972, d: 0.46, x: cx, y: baseY + 0.004 + 1.986, z: -13.8 });
    collector.boxes.push({
      minX: cx - 0.26,
      maxX: cx + 0.26,
      minY: baseY,
      maxY: upperY,
      minZ: -14.06,
      maxZ: -13.54,
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

  // Luminous Extraction Runway Floor Lines stopping cleanly before Bulkhead Hazard Apron (`z >= -15.32`)
  accSpecs.push(
    { w: 0.14, h: 0.012, d: 5.4, x: -2.7, y: baseY + 0.008, z: -12.6 },
    { w: 0.14, h: 0.012, d: 5.4, x: 2.7, y: baseY + 0.008, z: -12.6 },
    { w: 32.0, h: 0.012, d: 0.12, x: 0, y: baseY + 0.016, z: -10.8 }
  );

  const steelMesh = buildBatchedBoxesMesh(steelSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F6_Z8_ExtractionButtresses',
  });
  if (steelMesh) {
    group.add(steelMesh);
    collector.wallMeshes.push(steelMesh);
  }
  const accMesh = buildBatchedBoxesMesh(accSpecs, accentMat, { name: 'F6_Z8_ExtractionAccents' });
  if (accMesh) detailGroup.add(accMesh);

  const blastApron = buildBatchedBoxesMesh(
    [{ w: 7.4, h: 0.014, d: 0.55, x: 0, y: baseY + 0.02, z: -15.65 }],
    mats.hazardStripe,
    { name: 'F6_Z8_BulkheadHazardApron' }
  );
  if (blastApron) detailGroup.add(blastApron);

  // Elevated Command Overlook Console Desk & Ground Security Barricades
  buildTacticalConsoleBenches(
    collector,
    mats,
    [{ x: 0, y: upperY, z: -13.2, w: 3.4, h: 0.96, d: 0.85 }],
    { accentMat, name: 'F6_Z8_OverlookConsole' }
  );
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: 9.2, y: baseY, z: -11.4, w: 2.8, h: 1.0, d: 0.98, walkableTop: true },
      { x: -11.8, y: baseY, z: -15.4, w: 2.8, h: 1.0, d: 0.98, walkableTop: true },
    ],
    { accentMat: mats.hazardStripe, name: 'F6_Z8_ExtractionCover' }
  );

  // Crisp Architectural Stencil Signage flanking Bulkhead 06 (cleanly centered between buttresses ±5.8 and walls ±18.0!)
  addWallStencilPlaque(group, mats, {
    code: '06-N',
    title: 'ARCHIVE EXTRACTION',
    subtitle: 'ACTIVATE CONTROL CENTER · UNSEAL BULKHEAD 06',
    accentHex: 0x38bdf8,
    x: -11.8,
    y: baseY + 8.6,
    z: -16.62,
    rotY: 0,
    width: 6.2,
    height: 1.55,
  });
  addWallStencilPlaque(group, mats, {
    code: 'FL-05',
    title: 'TACTICAL AMPHITHEATER',
    subtitle: 'AUTHORIZED OPERATIVE DESCENT TO LEVEL 05',
    accentHex: 0xf59e0b,
    x: 11.8,
    y: baseY + 8.6,
    z: -16.62,
    rotY: 0,
    width: 6.2,
    height: 1.55,
  });

  // 4. MASSIVE FLOOR 06 BULKHEAD EXIT DOOR (`z = -17.0`) + CONTROL CENTER + NORTH DESCENT GALLERY -> FLOOR 05!
  const exitDoor = buildMassiveBulkheadDoor(group, mats, {
    floor: 6,
    x: 0,
    y: baseY,
    z: F6_WALLS.cathedralNorthZ,
    rotY: 0,
    width: 5.6,
    height: 5.4,
    plaqueTitle: 'BULKHEAD 06 EXIT',
    plaqueSubtitle: 'DESCENT TO FLOOR 05 AMPHITHEATER',
  });
  collector.boxes.push(exitDoor.collider);
  collector.wallMeshes.push(...exitDoor.raycastMeshes);

  const controlCenter = buildFloorControlCenter(
    group,
    mats,
    collector.boxes,
    collector.wallMeshes,
    {
      floor: 6,
      x: -6.8,
      y: baseY,
      z: -11.8,
      rotY: 0,
    }
  );

  // Seamless U-Turn Descent Airlock Gallery down to Floor 05 Amphitheater (Y = 56.0m)!
  buildDescentAirlockGallery(collector, mats, 6, 5, baseY, 'north', 17.0);

  return { exitDoor, controlCenter };
}
