import * as THREE from 'three';
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
  buildShippingContainer,
} from '../../architecture';
import {
  buildGuardrailRun,
  buildStraightStairFlight,
  type FloorGeometryCollector,
} from '../../stairs';
import type { OcclusionCell } from '../../types';
import {
  buildExplosiveBarrel,
  buildRetractableBridge,
  buildShootableLock,
  buildWorldSwitch,
} from '../../mechanics';
import {
  F4_BASE_Y,
  F4_CEILINGS,
  F4_IDS,
  F4_UPPER_Y,
  F4_WALLS,
} from './layout';

/**
 * FLOOR 04 — ZONE 8 (SE OCCLUSION CELL): CANYON LOGISTICS FREIGHT YARD & CONTAINER SWITCHYARD
 * Footprint: x ∈ [+18.0, +48.0] (30m) × z ∈ [+10.0, +32.0] (22m), 10.4m tall!
 *
 * Signature CoD Shoot House / Cargo Freight Yard:
 * - Staggered Corrugated Tactical Shipping Containers creating fast CQB kill-lanes & flank angles!
 * - Elevated `+4.4m` West Freight Overlook & East Freight Balcony (`y = 46.4m`) connected by
 *   18.8m Retractable Freight Gantry Skybridge #3 (`f4_bridge_se_freight`) passing high above the containers,
 *   deployable via `[E]` Switch OR sniping the crimson Relay Lock on the overhead crane truss!
 * - Flush East-Wall Staircase (`x = +46.42`, `maxX = +47.67` flush against `+47.70` -> ZERO wall gap!)
 */
export function buildFloor4Zone8SouthEastFreightYard(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const baseY = F4_BASE_Y; // 42.0m
  const upperY = F4_UPPER_Y; // 46.4m
  const ceilH = F4_CEILINGS.seFreightYard; // 10.4m
  const amberMat = mats.floorAccent[4]; // Volcanic amber freight accent
  const hazardMat = mats.hazardStripe;

  const cellGroup = new THREE.Group();
  cellGroup.name = 'F4_Z8_SE_FREIGHT_YARD';
  collector.group.add(cellGroup);

  // 1. Floor & Coffered Ceiling Slabs (`x ∈ [+18.0, +48.0], z ∈ [+10.0, +32.0]`)
  addWalkableDeck(collector, {
    minX: F4_WALLS.canyonEastX,
    maxX: F4_WALLS.eastOuterX,
    minZ: F4_WALLS.southSplitZ,
    maxZ: F4_WALLS.southWingsOuterZ,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    targetGroup: cellGroup,
    name: 'F4_Z8_FreightFloor',
  });

  const ceilMesh = buildBatchedBoxesMesh(
    [{ w: 29.4, h: 0.5, d: 21.4, x: 33.0, y: baseY + ceilH + 0.25, z: 21.0 }],
    mats.darkConcrete,
    { receiveShadow: false, name: 'F4_Z8_FreightCeiling' }
  );
  if (ceilMesh) cellGroup.add(ceilMesh);

  // Overhead Freight Gantry Crane Beams & High-Bay Lights
  const trussSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  for (const tz of [13.2, 21.0, 28.0]) {
    trussSpecs.push({ w: 29.3, h: 0.48, d: 0.44, x: 33.0, y: baseY + ceilH - 0.26, z: tz });
    lightSpecs.push(
      { w: 9.0, h: 0.08, d: 0.34, x: 26.8, y: baseY + ceilH - 0.06, z: tz - 2.0 },
      { w: 9.0, h: 0.08, d: 0.34, x: 39.2, y: baseY + ceilH - 0.06, z: tz - 2.0 }
    );
  }
  const trussMesh = buildBatchedBoxesMesh(trussSpecs, mats.structuralSteel, { name: 'F4_Z8_GantryTrusses' });
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F4_Z8_RoofLights' });
  if (trussMesh) cellGroup.add(trussMesh);
  if (lightMesh) cellGroup.add(lightMesh);

  // 2. Perimeter Walls (South Outer `z = +32.0`, East Outer `x = +48.0`, West Solid Segment `x = +18.0, z ∈ [+16.7, +31.7]`)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F4_WALLS.southWingsOuterZ,
    spanStart: F4_WALLS.canyonEastX,
    spanEnd: F4_WALLS.eastOuterX,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat: amberMat,
    targetGroup: cellGroup,
    name: 'F4_Z8_SouthOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F4_WALLS.eastOuterX,
    spanStart: F4_WALLS.southSplitZ + 0.3,
    spanEnd: F4_WALLS.southWingsOuterZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat: amberMat,
    targetGroup: cellGroup,
    name: 'F4_Z8_EastOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F4_WALLS.canyonEastX,
    spanStart: F4_WALLS.canyonSouthZ + 0.31,
    spanEnd: F4_WALLS.southWingsOuterZ - 0.31,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat: amberMat,
    targetGroup: cellGroup,
    name: 'F4_Z8_WestSolidWall',
  });

  // 3. STAGGERED CORRUGATED TACTICAL SHIPPING CONTAINERS (CoD Shoot House Switchyard Lanes!)
  buildShippingContainer(collector, mats, {
    x: 26.8,
    y: baseY,
    z: 21.8,
    w: 2.9,
    h: 2.95,
    d: 6.4,
    targetGroup: cellGroup,
    name: 'F4_Z8_Container_W',
  });
  buildShippingContainer(collector, mats, {
    x: 34.0,
    y: baseY,
    z: 26.2,
    w: 6.4,
    h: 2.95,
    d: 2.9,
    targetGroup: cellGroup,
    name: 'F4_Z8_Container_S',
  });
  buildShippingContainer(collector, mats, {
    x: 37.8,
    y: baseY,
    z: 18.8,
    w: 2.9,
    h: 2.95,
    d: 6.2,
    targetGroup: cellGroup,
    name: 'F4_Z8_Container_E',
  });

  // 4. ELEVATED `+4.4m` FREIGHT BALCONIES (`y = 46.4m`) + FLUSH EAST-WALL STAIRCASE + RETRACTABLE SKYBRIDGE #3!
  // West Freight Overlook (`x ∈ [18.32, 23.6], z ∈ [10.8, 15.6]`) meeting Zone 1 `eastSouthUpperZ: [11.0, 15.0]`!
  addWalkableDeck(collector, {
    minX: 18.32,
    maxX: 23.6,
    minZ: 10.8,
    maxZ: 15.6,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F4_Z8_WestFreightOverlook',
  });
  // East Freight Balcony (`x ∈ [42.4, 47.68], z ∈ [10.32, 21.0]`) meeting Zone 4 `foundryToFreightUpperX`!
  addWalkableDeck(collector, {
    minX: 42.4,
    maxX: 47.68,
    minZ: 10.32,
    maxZ: 21.0,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F4_Z8_EastFreightBalcony',
  });

  // Flush East-Wall Staircase (`x = +46.42`, `width = 2.50` -> `maxX = +47.67` flush against `+47.70`!)
  // Ascends South->North from `z = 29.2` (`baseY`) up to `z = 21.0` (`upperY`) — ZERO wall gap!
  buildStraightStairFlight(collector, mats, {
    x: 46.42,
    z: 25.1,
    width: 2.5,
    length: 8.2,
    yStart: upperY,
    yEnd: baseY,
    axis: 'z',
    steps: 20,
    railMinSide: true,
    railMaxSide: false,
    accentMat: amberMat,
    targetGroup: cellGroup,
  });

  // Grounded Support Columns
  const colSpecs: BoxSpec[] = [];
  const colH = upperY - 0.42 - (baseY + 0.004);
  for (const [cx, cz] of [
    [23.3, 15.3],
    [42.7, 15.3],
    [42.7, 20.6],
  ] as const) {
    colSpecs.push({ w: 0.42, h: colH, d: 0.42, x: cx, y: baseY + 0.004 + colH * 0.5, z: cz });
    collector.boxes.push({
      minX: cx - 0.24,
      maxX: cx + 0.24,
      minY: baseY,
      maxY: upperY,
      minZ: cz - 0.24,
      maxZ: cz + 0.24,
      walkableTop: false,
    });
  }
  const colMesh = buildBatchedBoxesMesh(colSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F4_Z8_FreightCols',
  });
  if (colMesh) {
    cellGroup.add(colMesh);
    collector.wallMeshes.push(colMesh);
  }

  // Exact Guardrails leaving clean 3.0m opening (`z ∈ [11.7, 14.7]`) on BOTH balconies for Skybridge #3!
  buildGuardrailRun(collector, mats, { x1: 18.32, z1: 10.8, x2: 23.6, z2: 10.8, y: upperY, accentMat: amberMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 18.32, z1: 15.6, x2: 23.6, z2: 15.6, y: upperY, accentMat: amberMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 23.6, z1: 10.8, x2: 23.6, z2: 11.7, y: upperY, accentMat: amberMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 23.6, z1: 14.7, x2: 23.6, z2: 15.6, y: upperY, accentMat: amberMat, targetGroup: cellGroup });

  buildGuardrailRun(collector, mats, { x1: 42.4, z1: 10.32, x2: 42.4, z2: 11.7, y: upperY, accentMat: amberMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 42.4, z1: 14.7, x2: 42.4, z2: 21.0, y: upperY, accentMat: amberMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 42.4, z1: 21.0, x2: 45.14, z2: 21.0, y: upperY, accentMat: amberMat, targetGroup: cellGroup });

  // 5. RETRACTABLE FREIGHT GANTRY SKYBRIDGE #3 (`f4_bridge_se_freight`, 18.8m span along `z = 13.2`!)
  buildRetractableBridge(collector, mats, {
    id: F4_IDS.bridgeSeFreight,
    label: 'FREIGHT GANTRY SKYBRIDGE',
    anchorX: 23.6,
    y: upperY,
    anchorZ: 13.2,
    extendDirX: 1,
    extendDirZ: 0,
    length: 18.8,
    width: 3.0,
    accentMat: amberMat,
    targetGroup: cellGroup,
  });

  // Dual Activation: `[E]` Switch on West Freight Overlook + Shootable Crimson Relay Lock on overhead gantry truss!
  buildWorldSwitch(collector, mats, {
    id: F4_IDS.switchSeFreight,
    x: 21.8,
    y: upperY,
    z: 15.0,
    rotY: 0,
    promptLocked: '[E] DEPLOY FREIGHT GANTRY SKYBRIDGE',
    promptActivated: 'FREIGHT GANTRY SKYBRIDGE DEPLOYED',
    bannerText: 'FREIGHT GANTRY SKYBRIDGE DEPLOYED',
    deployBridgeId: F4_IDS.bridgeSeFreight,
    targetGroup: cellGroup,
  });
  buildShootableLock(collector, mats, {
    id: F4_IDS.lockSeFreight,
    x: 33.0,
    y: baseY + ceilH - 1.3,
    z: 13.2,
    rotY: -Math.PI * 0.5, // Faces West toward West Freight Overlook!
    bannerText: 'FREIGHT RELAY SHATTERED · GANTRY SKYBRIDGE DEPLOYED',
    deployBridgeId: F4_IDS.bridgeSeFreight,
    targetGroup: cellGroup,
  });

  // 6. Tactical Barricades + 2 Explosive Plasma Barrels + Signage
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: 32.0, y: baseY, z: 18.2, w: 2.4, h: 0.96, d: 0.9, walkableTop: true },
      { x: 22.8, y: baseY, z: 27.6, w: 2.4, h: 0.96, d: 0.9, walkableTop: true },
    ],
    { targetGroup: cellGroup, accentMat: hazardMat, name: 'F4_Z8_FreightCover' }
  );
  buildExplosiveBarrel(collector, mats, { id: 'f4_barrel_se_1', x: 31.8, y: baseY, z: 22.4, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f4_barrel_se_2', x: 41.2, y: baseY, z: 24.4, targetGroup: cellGroup });

  addWallStencilPlaque(cellGroup, mats, {
    code: '04-Z8',
    title: 'FREIGHT SWITCHYARD',
    subtitle: 'CONTAINER KILL-LANES · DEPLOY GANTRY SKYBRIDGE ABOVE',
    accentHex: 0xf97316,
    x: 33.0,
    y: baseY + 8.2,
    z: 31.62,
    rotY: Math.PI,
    width: 6.4,
    height: 1.48,
  });

  return {
    id: 'f4_zone8_se_freight_yard',
    group: cellGroup,
    triggerBounds: { minX: -6.0, maxX: 49.5, minZ: -12.0, maxZ: 32.5 },
    center: { x: 33.0, z: 21.0 },
    maxViewDistance: 46.0,
  };
}
