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
  buildJerseyBarricades,
  buildTacticalConsoleBenches,
} from '../../architecture';
import { buildGuardrailRun, type FloorGeometryCollector } from '../../stairs';
import type { BulkheadDoorRig } from '../../types';
import { F4_BASE_Y, F4_CEILINGS, F4_UPPER_Y, F4_WALLS } from './layout';

/**
 * FLOOR 04 — ZONE 1 (SOUTH): CANYON ARRIVAL CLIFF & CABLE-ANCHOR TERRACE
 * Footprint: x ∈ [-18, +18], z ∈ [+10.8, +17.0]
 * - Arrival Bulkhead 04 (`z = +17.0`, `rotY: Math.PI`) seamlessly receives Floor 05's South Descent Airlock!
 * - Framed hero vista looking straight North (`-Z`) across the 4-elevation Criss-Cross Cable-Stayed Skybridge Chasm!
 * - Monumental twin angled cable-stay anchor piers & elevated South Overlook Bridge (`y = 46.4m`)
 */
export function buildFloor4Zone1SouthArrival(
  collector: FloorGeometryCollector,
  detailGroup: THREE.Group,
  mats: HideoutMaterialRegistry
): BulkheadDoorRig {
  const baseY = F4_BASE_Y; // 42.0m
  const upperY = F4_UPPER_Y; // 46.4m
  const ceilH = F4_CEILINGS.canyon; // 10.6m
  const accentMat = mats.floorAccent[4]; // Volcanic amber-orange!
  const hydroMat = mats.floorAccent[6]; // Hydro-coolant cyan!
  const group = collector.group;

  // 1. South Canyon Cliff Arrival Deck (`z ∈ [+10.8, +17.0]`, meets Canyon Chasm Rim flush at z = +10.8!)
  addWalkableDeck(collector, {
    minX: F4_WALLS.canyonWestX,
    maxX: F4_WALLS.canyonEastX,
    minZ: 10.8,
    maxZ: F4_WALLS.canyonSouthZ,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    name: 'F4_Z1_SouthCliffDeck',
  });

  // 2. South Arrival Perimeter Wall (`z = +17.0`) with 5.6m × 5.4m Arrival Bulkhead 04 cutout
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F4_WALLS.canyonSouthZ,
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
    name: 'F4_Z1_SouthArrivalWall',
  });

  // 3. Elevated South Cable-Anchor Overlook Bridge (`y = 46.4m`, `x ∈ [-13.594, +13.594], z ∈ [11.6, 14.4]`)
  // Inset 6mm from x = ±13.6 West/East Suspension Towers -> ZERO Z-fighting!
  const overlookMesh = buildBatchedBoxesMesh(
    [{ w: 27.188, h: 0.42, d: 2.8, x: 0, y: upperY - 0.21, z: 13.0 }],
    mats.catwalkGrate,
    { castShadow: true, receiveShadow: true, name: 'F4_Z1_SouthOverlookBridge' }
  );
  if (overlookMesh) {
    group.add(overlookMesh);
    collector.wallMeshes.push(overlookMesh);
  }
  collector.slabs.push({
    minX: -13.6,
    maxX: 13.6,
    minZ: 11.6,
    maxZ: 14.4,
    y: upperY,
    thickness: 0.42,
  });

  buildGuardrailRun(collector, mats, { x1: -13.6, z1: 11.6, x2: 13.6, z2: 11.6, y: upperY, accentMat });
  buildGuardrailRun(collector, mats, { x1: -13.6, z1: 14.4, x2: 13.6, z2: 14.4, y: upperY, accentMat });

  // 4. Twin Monumental Cable-Anchor Pylons flanking the arrival sightline (`x = ±6.2`) + Overlook columns
  const steelSpecs: BoxSpec[] = [];
  const accSpecs: BoxSpec[] = [];
  const colH = upperY - 0.42 - (baseY + 0.004);
  for (const cx of [-9.4, -5.6, 5.6, 9.4]) {
    steelSpecs.push({ w: 0.52, h: colH, d: 0.52, x: cx, y: baseY + 0.004 + colH * 0.5, z: 14.0 });
    collector.boxes.push({
      minX: cx - 0.28,
      maxX: cx + 0.28,
      minY: baseY,
      maxY: upperY,
      minZ: 13.72,
      maxZ: 14.28,
      walkableTop: false,
    });
  }
  // Angled cable-stay anchor bollards on the South cliff lip (`x = ±5.4, z = 11.45`) braced solidly into South Overlook underside!
  for (const ax of [-5.4, 5.4]) {
    steelSpecs.push(
      { w: 1.1, h: 1.35, d: 1.1, x: ax, y: baseY + 0.004 + 0.675, z: 11.45 },
      { w: 0.32, h: 2.85, d: 0.32, x: ax, y: baseY + 2.66, z: 11.82, rotX: -0.26 }
    );
    accSpecs.push({ w: 0.96, h: 0.08, d: 0.06, x: ax, y: baseY + 1.12, z: 10.87 });
    collector.boxes.push({
      minX: ax - 0.58,
      maxX: ax + 0.58,
      minY: baseY,
      maxY: baseY + 1.4,
      minZ: 10.86,
      maxZ: 12.04,
      walkableTop: true,
    });
  }

  // Floor guidance telemetry lines (staggered Y heights -> ZERO crossing Z-fighting!)
  accSpecs.push(
    { w: 0.14, h: 0.012, d: 4.8, x: -2.2, y: baseY + 0.012, z: 13.4 },
    { w: 0.14, h: 0.012, d: 4.8, x: 2.2, y: baseY + 0.012, z: 13.4 },
    { w: 28.0, h: 0.012, d: 0.12, x: 0, y: baseY + 0.026, z: 13.2 }
  );

  const steelMesh = buildBatchedBoxesMesh(steelSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F4_Z1_ArrivalSteel',
  });
  if (steelMesh) {
    group.add(steelMesh);
    collector.wallMeshes.push(steelMesh);
  }
  const accMesh = buildBatchedBoxesMesh(accSpecs, accentMat, { name: 'F4_Z1_ArrivalAccents' });
  if (accMesh) detailGroup.add(accMesh);

  const hazardApron = buildBatchedBoxesMesh(
    [{ w: 7.4, h: 0.014, d: 0.55, x: 0, y: baseY + 0.018, z: 15.75 }],
    mats.hazardStripe,
    { name: 'F4_Z1_ArrivalHazard' }
  );
  if (hazardApron) detailGroup.add(hazardApron);

  // Flanking Dispatch Workstations & Tactical Cover (100% clear of central Spine Bridge approach!)
  buildTacticalConsoleBenches(
    collector,
    mats,
    [
      { x: -10.8, y: baseY, z: 15.2, w: 3.2, h: 0.96, d: 0.88 },
      { x: 10.8, y: baseY, z: 15.2, w: 3.2, h: 0.96, d: 0.88 },
    ],
    { accentMat: hydroMat, name: 'F4_Z1_ArrivalConsoles' }
  );
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -7.6, y: baseY, z: 12.2, w: 2.2, h: 0.98, d: 0.88, walkableTop: true },
      { x: 7.6, y: baseY, z: 12.2, w: 2.2, h: 0.98, d: 0.88, walkableTop: true },
    ],
    { accentMat: mats.hazardStripe, name: 'F4_Z1_ArrivalCover' }
  );

  // Crisp Architectural Signage flanking Arrival Bulkhead 04 (facing North into the Chasm)
  addWallStencilPlaque(group, mats, {
    code: 'FL-04',
    title: 'SKYBRIDGE CHASM',
    subtitle: '4-TIER CABLE CANYON · HYDRO DAM · TRAM FOUNDRY',
    accentHex: 0xf97316,
    x: -11.4,
    y: baseY + 7.6,
    z: 16.62,
    rotY: Math.PI,
    width: 6.4,
    height: 1.5,
  });
  addWallStencilPlaque(group, mats, {
    code: '04-S',
    title: 'CABLE ANCHOR TERRACE',
    subtitle: 'WEST: GEOTHERMAL · EAST: FREIGHT YARD',
    accentHex: 0x06b6d4,
    x: 11.4,
    y: baseY + 7.6,
    z: 16.62,
    rotY: Math.PI,
    width: 6.4,
    height: 1.5,
  });

  // 5. Arrival Bulkhead 04 Shutter (`z = +17.0`, `rotY: Math.PI`, synced automatically with Floor 05 Exit!)
  const arrivalDoor = buildMassiveBulkheadDoor(group, mats, {
    floor: 4,
    x: 0,
    y: baseY,
    z: F4_WALLS.canyonSouthZ,
    rotY: Math.PI,
    width: 5.6,
    height: 5.4,
    isArrivalShutter: true,
  });
  collector.boxes.push(arrivalDoor.collider);
  collector.wallMeshes.push(...arrivalDoor.raycastMeshes);

  return arrivalDoor;
}
