import * as THREE from 'three';
import { buildMassiveBulkheadDoor } from '../../mechanics';
import { buildBatchedBoxesMesh, type BoxSpec, type HideoutMaterialRegistry } from '../../materials';
import {
  addLaneMarkerPlaque,
  buildArchitecturalWall,
  buildJerseyBarricades,
  buildTacticalConsoleBenches,
  buildWallEquipmentBays,
} from '../../architecture';
import type { FloorGeometryCollector } from '../../stairs';
import type { BulkheadDoorRig } from '../../types';
import { F7_BASE_Y, F7_CEILINGS, F7_META, F7_WALLS } from './layout';

/**
 * Zone 1 — North Arrival Security Checkpoint (`x ∈ [-16, +16], z ∈ [-17.0, -10.5]`)
 * Receives the operative arriving down Floor 08's North Descent Airlock Gallery at `(0, 84.0, -17.0)`.
 * Frames an immediate, breathtaking vista straight into the gaping Spiral Well Rotunda, sweeping
 * helical staircase, suspended telemetry core, and flanking West Barracks / East Server doorways!
 */
export function buildZone1ArrivalCheckpoint(
  collector: FloorGeometryCollector,
  detailGroup: THREE.Group,
  mats: HideoutMaterialRegistry
): BulkheadDoorRig {
  const baseY = F7_BASE_Y;
  const ceilH = F7_CEILINGS.rotunda;
  const accentMat = mats.floorAccent[7];

  // 1. North Perimeter Wall (z = -17.0) with centered 5.6m × 5.4m Arrival Bulkhead Portal
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F7_WALLS.rotundaNorthZ,
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
    name: 'F7_Z1_NorthWall',
  });

  // 2. Arrival Bulkhead 07 Shutter (synchronized with Floor 08 exit door during descent!)
  const arrivalDoor = buildMassiveBulkheadDoor(collector.group, mats, {
    floor: 7,
    x: 0,
    y: baseY,
    z: F7_WALLS.rotundaNorthZ,
    rotY: 0,
    width: 5.6,
    height: 5.4,
    isArrivalShutter: true,
  });
  collector.boxes.push(arrivalDoor.collider);
  collector.wallMeshes.push(...arrivalDoor.raycastMeshes);

  // 3. Tactical Arrival Security Console Desks flanking the entry lane (clear 8.2m central sightline!)
  buildTacticalConsoleBenches(
    collector,
    mats,
    [
      { x: -7.8, y: baseY, z: -14.8, w: 3.4, h: 1.04, d: 1.05 },
      { x: 7.8, y: baseY, z: -14.8, w: 3.4, h: 1.04, d: 1.05 },
    ],
    { accentMat, name: 'F7_Z1_SecurityConsoles' }
  );

  // 4. Low waist-high ballistic cover barricades framing the rotunda approach
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -6.4, y: baseY, z: -10.8, w: 2.8, h: 1.06, d: 0.78 },
      { x: 6.4, y: baseY, z: -10.8, w: 2.8, h: 1.06, d: 0.78 },
    ],
    { accentMat, name: 'F7_Z1_EntryCover' }
  );

  // 5. Recessed Tactical Wall Weapon-Locker Bays flanking the arrival bulkhead (100% solid colliders!)
  buildWallEquipmentBays(
    collector,
    mats,
    [
      { axis: 'x', coord: -16.68, inwardDir: 1, centerAlong: -11.4, baseY, width: 4.8, height: 3.1 },
      { axis: 'x', coord: -16.68, inwardDir: 1, centerAlong: 11.4, baseY, width: 4.8, height: 3.1 },
    ],
    { accentMat, name: 'F7_Z1_ArrivalLockers' }
  );

  // 6. Clean floor guidance stripes (raised +14mm / +22mm above floor to prevent any Z-fighting!)
  const stripeSpecs: BoxSpec[] = [
    // Longitudinal center lane guide rails leading from Arrival Bulkhead toward the Spiral Well
    { w: 0.14, h: 0.012, d: 5.4, x: -2.4, y: baseY + 0.014, z: -13.6 },
    { w: 0.14, h: 0.012, d: 5.4, x: 2.4, y: baseY + 0.014, z: -13.6 },
    // Transverse arrival threshold hazard bar (cleanly +8mm above longitudinal stripes)
    { w: 6.8, h: 0.012, d: 0.36, x: 0, y: baseY + 0.022, z: -15.9 },
  ];
  const stripeMesh = buildBatchedBoxesMesh(stripeSpecs, accentMat, {
    name: 'F7_Z1_FloorGuides',
  });
  if (stripeMesh) detailGroup.add(stripeMesh);

  // 7. Flanking wing directional signage (North Arrival Bulkhead renders its own crisp overhead sector plaque!)

  addLaneMarkerPlaque(detailGroup, mats, {
    label: 'WEST BARRACKS',
    accentHex: F7_META.accentHex,
    x: -15.58,
    y: baseY + 4.2,
    z: -12.3,
    rotY: Math.PI * 0.5,
    width: 2.8,
    height: 0.72,
  });

  addLaneMarkerPlaque(detailGroup, mats, {
    label: 'EAST SERVERS',
    accentHex: F7_META.accentHex,
    x: 15.58,
    y: baseY + 4.2,
    z: -12.3,
    rotY: -Math.PI * 0.5,
    width: 2.8,
    height: 0.72,
  });

  return arrivalDoor;
}
