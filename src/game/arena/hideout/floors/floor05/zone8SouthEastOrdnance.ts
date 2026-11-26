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
  buildWallEquipmentBays,
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
  F5_BASE_Y,
  F5_CEILINGS,
  F5_IDS,
  F5_UPPER_Y,
  F5_WALLS,
} from './layout';

/**
 * FLOOR 05 — ZONE 8 (SOUTH-EAST OCCLUSION CELL): HEAVY MILITARY ORDNANCE DEPOT
 * Footprint: x ∈ [+18.0, +48.0] (30m wide) × z ∈ [+10.0, +32.0] (22m deep), Ceiling: 10.4m
 *
 * Call of Duty Cargo Freight & Heavy Munitions Logistics Bay:
 * - Dual Staggered Armored Corrugated Shipping Containers creating tense CQB sightlines & flank lanes
 * - Flush East Wall Staircase (`x = +46.32, width = 2.70` -> `+47.67` flush to `+47.70` wall — ZERO gap!)
 * - 3rd Retractable Skybridge (`f5_bridge_se_depot`, `18.8m` span) linking East Logistics Balcony (`x = 42.4`)
 *   to West Logistics Balcony (`x = 23.6`) directly above the freight containers!
 * - Dual Activation: `[E]` Override Switch (`f5_switch_se_depot`) on East Balcony OR sniping the
 *   South Wall Crane Relay (`f5_lock_se_depot`) from ground level!
 * - 2 Pressurized Explosive Plasma Barrels positioned along the central container choke!
 */
export function buildFloor5Zone8SouthEastOrdnance(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const baseY = F5_BASE_Y; // 56.0m
  const upperY = F5_UPPER_Y; // 60.4m
  const ceilH = F5_CEILINGS.seOrdnance; // 10.4m (Zone 4 & Zone 2 walls are 10.8m >= 10.4m -> ZERO cracks!)
  const accentMat = mats.floorAccent[2]; // Military ordnance yellow-gold!
  const cellGroup = new THREE.Group();
  cellGroup.name = 'F5_ZONE8_SE_ORDNANCE';
  collector.group.add(cellGroup);

  // 1. Floor & Continuous Ceiling Slab
  addWalkableDeck(collector, {
    minX: F5_WALLS.coliseumEastX,
    maxX: F5_WALLS.eastOuterX,
    minZ: F5_WALLS.southSplitZ,
    maxZ: F5_WALLS.southWingsOuterZ,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    targetGroup: cellGroup,
    name: 'F5_Z8_OrdnanceFloor',
  });
  const ceilMesh = buildBatchedBoxesMesh(
    [{ w: 29.4, h: 0.5, d: 21.4, x: 33.0, y: baseY + ceilH + 0.25, z: 21.0 }],
    mats.darkConcrete,
    { receiveShadow: false, name: 'F5_Z8_OrdnanceCeiling' }
  );
  if (ceilMesh) cellGroup.add(ceilMesh);

  // 2. Exterior Perimeter Walls (East `x = +48`, South `z = +32`, West `x = +18` for `z ∈ [17.3, 31.7]`)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F5_WALLS.eastOuterX,
    spanStart: F5_WALLS.southSplitZ + 0.3,
    spanEnd: F5_WALLS.southWingsOuterZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: cellGroup,
    name: 'F5_Z8_EastOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F5_WALLS.southWingsOuterZ,
    spanStart: F5_WALLS.coliseumEastX - 0.3,
    spanEnd: F5_WALLS.eastOuterX + 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: cellGroup,
    name: 'F5_Z8_SouthOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F5_WALLS.coliseumEastX,
    spanStart: F5_WALLS.coliseumSouthZ + 0.3, // Cleanly butts Zone 9 South wall at +17.3!
    spanEnd: F5_WALLS.southWingsOuterZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: cellGroup,
    name: 'F5_Z8_WestOuterWall',
  });

  // Overhead Depot Crane Trusses & High-Bay Lighting Strips
  const beamSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  for (const bz of [15.5, 21.0, 26.5]) {
    beamSpecs.push({ w: 29.32, h: 0.46, d: 0.42, x: 33.0, y: baseY + ceilH - 0.24, z: bz });
    lightSpecs.push(
      { w: 9.6, h: 0.08, d: 0.34, x: 26.8, y: baseY + ceilH - 0.06, z: bz - 2.2 },
      { w: 9.6, h: 0.08, d: 0.34, x: 39.2, y: baseY + ceilH - 0.06, z: bz - 2.2 }
    );
  }
  const beamMesh = buildBatchedBoxesMesh(beamSpecs, mats.structuralSteel, { name: 'F5_Z8_RoofBeams' });
  if (beamMesh) cellGroup.add(beamMesh);
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F5_Z8_RoofLights' });
  if (lightMesh) cellGroup.add(lightMesh);

  // 3. DUAL STAGGERED ARMORED CORRUGATED SHIPPING CONTAINERS (`height = 3.1m`, cleanly beneath 60.4m skybridge!)
  buildShippingContainer(collector, mats, {
    x: 28.4,
    y: baseY,
    z: 24.4,
    w: 3.1,
    h: 3.05,
    d: 6.8,
    targetGroup: cellGroup,
    name: 'F5_Z8_ContainerWest',
  });
  buildShippingContainer(collector, mats, {
    x: 37.6,
    y: baseY,
    z: 20.0,
    w: 3.1,
    h: 3.05,
    d: 6.8,
    targetGroup: cellGroup,
    name: 'F5_Z8_ContainerEast',
  });

  // 4. FLUSH EAST WALL STAIRCASE (`x = +46.32, width = 2.70 -> maxX = +47.67` flush to `+47.70` wall — ZERO GAP!)
  // Climbs Northward from `z = +29.4` (baseY 56.0) -> `z = +20.6` (upperY 60.4, length = 8.8m)
  buildStraightStairFlight(collector, mats, {
    x: 46.32,
    z: 25.0,
    width: 2.7,
    length: 8.8,
    yStart: upperY,
    yEnd: baseY,
    axis: 'z',
    steps: 20,
    railMinSide: true,
    railMaxSide: false, // Flush to East perimeter wall!
    accentMat,
    targetGroup: cellGroup,
  });

  // 5. WEST & EAST LOGISTICS BALCONIES (`y = 60.4m`) + 3RD RETRACTABLE SKYBRIDGE (`f5_bridge_se_depot`)!
  // East Logistics Balcony (`x ∈ [42.4, 47.68], z ∈ [10.32, 20.6]` — links Zone 4 `mechToOrdnanceUpperX` + stair top!)
  addWalkableDeck(collector, {
    minX: 42.4,
    maxX: 47.68,
    minZ: 10.32,
    maxZ: 20.6,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F5_Z8_EastLogisticsBalcony',
  });
  // West Logistics Balcony (`x ∈ [18.32, 23.6], z ∈ [10.8, 21.2]` — links Coliseum `eastSouthUpperZ` + skybridge receiver!)
  addWalkableDeck(collector, {
    minX: 18.32,
    maxX: 23.6,
    minZ: 10.8,
    maxZ: 21.2,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F5_Z8_WestLogisticsBalcony',
  });

  // Grounded structural columns under both Logistics Balconies
  const colSpecs: BoxSpec[] = [];
  for (const [cx, cz] of [
    [42.65, 11.2],
    [42.65, 20.2],
    [23.35, 11.4],
    [23.35, 20.8],
  ] as const) {
    colSpecs.push({ w: 0.42, h: 3.972, d: 0.42, x: cx, y: baseY + 0.004 + 1.986, z: cz });
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
    name: 'F5_Z8_BalconyColumns',
  });
  if (colMesh) {
    cellGroup.add(colMesh);
    collector.wallMeshes.push(colMesh);
  }

  // Exact Guardrails leaving clean 3.0m skybridge openings (`z ∈ [16.7, 19.7]`) on both balconies!
  buildGuardrailRun(collector, mats, { x1: 42.4, z1: 10.32, x2: 42.4, z2: 16.7, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 42.4, z1: 19.7, x2: 42.4, z2: 20.6, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 42.4, z1: 20.6, x2: 44.92, z2: 20.6, y: upperY, accentMat, targetGroup: cellGroup });

  buildGuardrailRun(collector, mats, { x1: 18.32, z1: 10.8, x2: 23.6, z2: 10.8, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 18.32, z1: 21.2, x2: 23.6, z2: 21.2, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 23.6, z1: 10.8, x2: 23.6, z2: 16.7, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 23.6, z1: 19.7, x2: 23.6, z2: 21.2, y: upperY, accentMat, targetGroup: cellGroup });

  // 18.8m RETRACTABLE ORDNANCE DEPOT SKYBRIDGE (`x = 42.4 -> 23.6, z = 18.2, y = 60.4m`)!
  buildRetractableBridge(collector, mats, {
    id: F5_IDS.bridgeSeDepot,
    label: 'ORDNANCE DEPOT LOGISTICS SKYBRIDGE',
    anchorX: 42.4,
    y: upperY,
    anchorZ: 18.2,
    extendDirX: -1,
    extendDirZ: 0,
    length: 18.8,
    width: 3.0,
    accentMat,
    targetGroup: cellGroup,
  });

  // Dual Activation: `[E]` Override Switch on East Balcony + Shootable South Wall Crane Relay!
  buildWorldSwitch(collector, mats, {
    id: F5_IDS.switchSeDepot,
    x: 44.4,
    y: upperY,
    z: 14.4,
    rotY: -Math.PI * 0.5,
    promptLocked: '[E] DEPLOY ORDNANCE DEPOT SKYBRIDGE',
    promptActivated: 'ORDNANCE DEPOT SKYBRIDGE DEPLOYED',
    bannerText: 'ORDNANCE DEPOT LOGISTICS SKYBRIDGE DEPLOYED',
    deployBridgeId: F5_IDS.bridgeSeDepot,
    targetGroup: cellGroup,
  });
  buildShootableLock(collector, mats, {
    id: F5_IDS.lockSeDepot,
    x: 33.0,
    y: baseY + 6.4,
    z: 31.52,
    rotY: Math.PI, // Faces North (-Z) straight over the freight containers!
    bannerText: 'DEPOT CRANE RELAY SHATTERED · LOGISTICS SKYBRIDGE DEPLOYED',
    deployBridgeId: F5_IDS.bridgeSeDepot,
    targetGroup: cellGroup,
  });

  // 6. Munitions Lockers, Freight Cover & 2 Explosive Plasma Barrels!
  buildWallEquipmentBays(
    collector,
    mats,
    [
      { axis: 'x', coord: 31.66, inwardDir: -1, centerAlong: 24.4, baseY, width: 5.4, height: 3.1 },
    ],
    { targetGroup: cellGroup, accentMat, name: 'F5_Z8_MunitionsRacks' }
  );

  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: 22.8, y: baseY, z: 25.0, w: 0.92, h: 1.0, d: 2.6, walkableTop: true },
      { x: 33.0, y: baseY, z: 15.6, w: 2.6, h: 1.0, d: 0.92, walkableTop: true },
    ],
    { targetGroup: cellGroup, accentMat: mats.hazardStripe, name: 'F5_Z8_FreightCover' }
  );

  buildExplosiveBarrel(collector, mats, { id: 'f5_barrel_se_w', x: 33.0, y: baseY, z: 22.4, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f5_barrel_se_e', x: 41.2, y: baseY, z: 26.8, targetGroup: cellGroup });

  // Clean Unobstructed Ordnance Signage
  addWallStencilPlaque(cellGroup, mats, {
    code: 'ORD-5',
    title: 'HEAVY MILITARY ORDNANCE DEPOT',
    subtitle: 'FREIGHT CORRIDOR · LOGISTICS SKYBRIDGE · MUNITIONS BAY',
    accentHex: 0xeab308,
    x: 33.0,
    y: baseY + 8.4,
    z: 31.62,
    rotY: Math.PI,
    width: 6.6,
    height: 1.48,
  });

  return {
    id: 'f5_se_ordnance',
    group: cellGroup,
    triggerBounds: { minX: 14.0, maxX: 48.5, minZ: 6.5, maxZ: 32.5 },
    center: { x: 33.0, z: 21.0 },
    maxViewDistance: 46.0,
  };
}
