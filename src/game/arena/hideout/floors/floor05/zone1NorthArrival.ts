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
import { F5_BASE_Y, F5_CEILINGS, F5_WALLS } from './layout';

/**
 * FLOOR 05 — ZONE 1 (NORTH): ARRIVAL TACTICAL CHECKPOINT
 * Footprint: x ∈ [-18, +18], z ∈ [-17.0, -10.4]
 * - Receives operative seamlessly from Floor 06's North Descent Airlock Gallery at `(0, 56.0, -17.0)`
 * - Continuous 10.8m roof shared with Zone 2 Coliseum & Zone 9 Extraction (ZERO ceiling seams!)
 * - Framed hero sightline straight South across the 13.4m-deep Sunken Holographic War-Pit Coliseum!
 */
export function buildFloor5Zone1NorthArrival(
  collector: FloorGeometryCollector,
  detailGroup: THREE.Group,
  mats: HideoutMaterialRegistry
): BulkheadDoorRig {
  const baseY = F5_BASE_Y;
  const ceilH = F5_CEILINGS.coliseum; // 10.8m
  const accentMat = mats.floorAccent[5]; // Crimson-rose War-Room signature!
  const group = collector.group;

  // 1. North Arrival Concourse Floor Slab (z ∈ [-17.0, -10.4] — meets Coliseum bowl rim flush!)
  addWalkableDeck(collector, {
    minX: F5_WALLS.coliseumWestX,
    maxX: F5_WALLS.coliseumEastX,
    minZ: F5_WALLS.coliseumNorthZ,
    maxZ: -10.4,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    name: 'F5_Z1_ArrivalFloor',
  });

  // 2. North Perimeter Bulkhead Wall (z = -17.0) with 5.6m × 5.4m Arrival Bulkhead cutout
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F5_WALLS.coliseumNorthZ,
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
    name: 'F5_Z1_NorthBulkheadWall',
  });

  // 3. Synchronized Arrival Bulkhead Door (`z = -17.0`, facing South `+Z` into Coliseum!)
  const arrivalDoor = buildMassiveBulkheadDoor(group, mats, {
    floor: 6,
    x: 0,
    y: baseY,
    z: F5_WALLS.coliseumNorthZ,
    rotY: 0,
    width: 5.6,
    height: 5.4,
    plaqueTitle: 'ARRIVAL 05',
    plaqueSubtitle: 'FROM FLOOR 06 MONOLITH ARCHIVE',
  });
  collector.boxes.push(arrivalDoor.collider);
  collector.wallMeshes.push(...arrivalDoor.raycastMeshes);

  // 4. Monumental Flanking Buttresses & Crimson-Rose Arrival Runway Accents
  const buttressH = ceilH - 0.684;
  const steelSpecs: BoxSpec[] = [];
  const accSpecs: BoxSpec[] = [];
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

  // Arrival guidance lines stopping cleanly before Bulkhead Hazard Apron (`z >= -15.32`)
  accSpecs.push(
    { w: 0.14, h: 0.012, d: 4.5, x: -2.7, y: baseY + 0.008, z: -13.0 },
    { w: 0.14, h: 0.012, d: 4.5, x: 2.7, y: baseY + 0.008, z: -13.0 },
    { w: 30.0, h: 0.012, d: 0.12, x: 0, y: baseY + 0.016, z: -11.4 }
  );

  const steelMesh = buildBatchedBoxesMesh(steelSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F5_Z1_ArrivalButtresses',
  });
  if (steelMesh) {
    group.add(steelMesh);
    collector.wallMeshes.push(steelMesh);
  }
  const accMesh = buildBatchedBoxesMesh(accSpecs, accentMat, { name: 'F5_Z1_ArrivalAccents' });
  if (accMesh) detailGroup.add(accMesh);

  const hazardApron = buildBatchedBoxesMesh(
    [{ w: 7.4, h: 0.014, d: 0.55, x: 0, y: baseY + 0.02, z: -15.65 }],
    mats.hazardStripe,
    { name: 'F5_Z1_ArrivalHazard' }
  );
  if (hazardApron) detailGroup.add(hazardApron);

  // 5. Recessed North Wall Equipment Lockers, Twin Briefing Consoles & Low Flank Cover
  buildWallEquipmentBays(
    collector,
    mats,
    [
      { axis: 'x', coord: -16.7, inwardDir: 1, centerAlong: -10.8, baseY, width: 4.8, height: 3.1, depth: 0.56 },
      { axis: 'x', coord: -16.7, inwardDir: 1, centerAlong: 10.8, baseY, width: 4.8, height: 3.1, depth: 0.56 },
    ],
    { accentMat, name: 'F5_Z1_ArrivalLockers' }
  );
  buildTacticalConsoleBenches(
    collector,
    mats,
    [
      { x: -10.6, y: baseY, z: -13.6, w: 3.0, h: 0.96, d: 1.0 },
      { x: 10.6, y: baseY, z: -13.6, w: 3.0, h: 0.96, d: 1.0 },
    ],
    { accentMat, name: 'F5_Z1_ArrivalConsoles' }
  );
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -5.4, y: baseY, z: -11.4, w: 2.6, h: 0.98, d: 0.92, walkableTop: true },
      { x: 5.4, y: baseY, z: -11.4, w: 2.6, h: 0.98, d: 0.92, walkableTop: true },
    ],
    { accentMat: mats.hazardStripe, name: 'F5_Z1_ArrivalBarricades' }
  );

  // Crisp Architectural Stencil Signage cleanly centered between buttresses (±5.8) and side walls (±18.0)!
  addWallStencilPlaque(group, mats, {
    code: '05-NW',
    title: 'ORBITAL TELEMETRY',
    subtitle: 'WEST SIM-DECK · DISH ARRAY · EXTRACTION BYPASS',
    accentHex: 0x38bdf8,
    x: -11.8,
    y: baseY + 7.8,
    z: -16.62,
    rotY: 0,
    width: 6.2,
    height: 1.5,
  });
  addWallStencilPlaque(group, mats, {
    code: '05-NE',
    title: 'WAR-COUNCIL COMMAND',
    subtitle: 'EAST MECH-BAY · BRIEFING BUNKER · SEALED VAULT',
    accentHex: 0xfb7185,
    x: 11.8,
    y: baseY + 7.8,
    z: -16.62,
    rotY: 0,
    width: 6.2,
    height: 1.5,
  });

  return arrivalDoor;
}
