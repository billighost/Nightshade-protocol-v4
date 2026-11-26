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
  buildWallEquipmentBays,
} from '../../architecture';
import type { FloorGeometryCollector } from '../../stairs';
import type { BulkheadDoorRig } from '../../types';
import { F6_BASE_Y, F6_CEILINGS, F6_META, F6_WALLS } from './layout';

/**
 * FLOOR 06 — ZONE 1: SOUTH ARRIVAL SECURITY VESTIBULE & CATHEDRAL OVERLOOK
 * Footprint: x ∈ [-18, +18], z ∈ [+10.0, +17.0]
 * - Receives operative seamlessly from Floor 07's South Descent Airlock Gallery at `(0, 70.0, +17.0)`
 * - Frames the jaw-dropping panoramic reveal of the 13.4m Suspended Monolith Cathedral straight ahead!
 * - Flanking tactical checkpoints, recessed archive locker bays, and wide portals into West Labs & East Foundry.
 */
export function buildFloor6Zone1SouthArrival(
  collector: FloorGeometryCollector,
  detailGroup: THREE.Group,
  mats: HideoutMaterialRegistry
): BulkheadDoorRig {
  const baseY = F6_BASE_Y;
  const ceilH = F6_CEILINGS.cathedral;
  const accentMat = mats.floorAccent[6];
  const group = collector.group;

  // 1. South Arrival Concourse Floor Slab (z ∈ [+9.6, +17.0] — joins Cathedral trench rim at z = +9.6 seamlessly!)
  addWalkableDeck(collector, {
    minX: F6_WALLS.cathedralWestX,
    maxX: F6_WALLS.cathedralEastX,
    minZ: 9.6,
    maxZ: F6_WALLS.cathedralSouthZ,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    name: 'F6_Z1_ArrivalFloor',
  });

  // 2. South Perimeter Wall (z = +17.0) with Arrival Bulkhead 06 cutout (`x ∈ [-2.8, +2.8]`)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F6_WALLS.cathedralSouthZ,
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
    name: 'F6_Z1_SouthArrivalWall',
  });

  // Arrival Bulkhead 06 (automatically seals behind player once inside Floor 06!)
  const arrivalDoor = buildMassiveBulkheadDoor(group, mats, {
    floor: 6,
    x: 0,
    y: baseY,
    z: F6_WALLS.cathedralSouthZ,
    rotY: Math.PI,
    width: 5.6,
    height: 5.4,
    isArrivalShutter: true,
  });
  collector.boxes.push(arrivalDoor.collider);
  collector.wallMeshes.push(...arrivalDoor.raycastMeshes);

  // 3. Dramatic Symmetric Brutalist Arrival Buttress Piers flanking Bulkhead 06 (z <= 16.68 -> zero wall Z-fighting!)
  const buttressH = ceilH - 0.684;
  const steelSpecs: BoxSpec[] = [];
  const accSpecs: BoxSpec[] = [];
  for (const px of [-5.8, 5.8]) {
    steelSpecs.push({
      w: 0.88,
      h: buttressH,
      d: 0.84,
      x: px,
      y: baseY + 0.004 + buttressH * 0.5,
      z: 16.26,
    });
    collector.boxes.push({
      minX: px - 0.46,
      maxX: px + 0.46,
      minY: baseY,
      maxY: baseY + ceilH,
      minZ: 15.82,
      maxZ: 16.7,
      walkableTop: false,
    });
    accSpecs.push({
      w: 0.12,
      h: buttressH - 1.2,
      d: 0.08,
      x: px,
      y: baseY + buttressH * 0.5,
      z: 15.79,
    });
  }

  // Luminous arrival floor guide lines fanning cleanly toward the twin glass cross-bridges & outer wings
  accSpecs.push(
    { w: 0.12, h: 0.012, d: 5.2, x: -4.6, y: baseY + 0.008, z: 12.6 },
    { w: 0.12, h: 0.012, d: 5.2, x: 4.6, y: baseY + 0.008, z: 12.6 },
    { w: 32.0, h: 0.012, d: 0.12, x: 0, y: baseY + 0.015, z: 10.6 }
  );

  const steelMesh = buildBatchedBoxesMesh(steelSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F6_Z1_ArrivalButtresses',
  });
  if (steelMesh) {
    group.add(steelMesh);
    collector.wallMeshes.push(steelMesh);
  }

  const accMesh = buildBatchedBoxesMesh(accSpecs, accentMat, {
    name: 'F6_Z1_ArrivalAccents',
  });
  if (accMesh) detailGroup.add(accMesh);

  // Arrival Blast Threshold Hazard Strip
  const hazardMesh = buildBatchedBoxesMesh(
    [{ w: 7.2, h: 0.014, d: 0.52, x: 0, y: baseY + 0.02, z: 15.65 }],
    mats.hazardStripe,
    { name: 'F6_Z1_ArrivalHazard' }
  );
  if (hazardMesh) detailGroup.add(hazardMesh);

  // 4. Recessed Archive Security Locker Bays flanking the Arrival Wall (x = ±11.2)
  buildWallEquipmentBays(
    collector,
    mats,
    [
      { axis: 'x', coord: 16.7, inwardDir: -1, centerAlong: -11.2, baseY, width: 5.0, height: 3.1, depth: 0.54 },
      { axis: 'x', coord: 16.7, inwardDir: -1, centerAlong: 11.2, baseY, width: 5.0, height: 3.1, depth: 0.54 },
    ],
    { accentMat, name: 'F6_Z1_ArrivalLockers' }
  );

  // 5. Flanking Tactical Arrival Security Console Desks & Vaultable Cover Barricades
  buildTacticalConsoleBenches(
    collector,
    mats,
    [
      { x: -11.2, y: baseY, z: 13.8, w: 3.2, h: 0.98, d: 1.05 },
      { x: 11.2, y: baseY, z: 13.8, w: 3.2, h: 0.98, d: 1.05 },
    ],
    { accentMat, name: 'F6_Z1_SecurityDesks' }
  );

  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: 0, y: baseY, z: 10.9, w: 3.4, h: 1.0, d: 0.96, walkableTop: true },
    ],
    { accentMat: mats.hazardStripe, name: 'F6_Z1_ArrivalBarricade' }
  );

  // 6. Crisp Stencil Signage on South Arrival Wall (centered cleanly between buttresses & corners!)
  addWallStencilPlaque(group, mats, {
    code: '06',
    title: 'OBSIDIAN MONOLITH ARCHIVE',
    subtitle: 'SECTOR 06 · 8-ZONE CONTAINMENT & BALLISTIC COMPLEX',
    accentHex: F6_META.accentHex,
    x: -11.2,
    y: baseY + 6.8,
    z: 16.62,
    rotY: Math.PI,
    width: 6.2,
    height: 1.55,
  });
  addWallStencilPlaque(group, mats, {
    code: '06-S',
    title: 'ARCHIVE DEPLOYMENT DECK',
    subtitle: 'WEST: BLACK-SITE LABS · EAST: BALLISTIC FOUNDRY',
    accentHex: 0xf59e0b,
    x: 11.2,
    y: baseY + 6.8,
    z: 16.62,
    rotY: Math.PI,
    width: 6.2,
    height: 1.55,
  });

  return arrivalDoor;
}
