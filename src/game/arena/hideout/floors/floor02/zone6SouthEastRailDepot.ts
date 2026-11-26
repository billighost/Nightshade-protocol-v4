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
  buildLockedSecurityGate,
  buildShootableLock,
} from '../../mechanics';
import {
  addF2PortalSill,
  F2_CEIL_H,
  F2_GRID,
  F2_IDS,
  F2_L0_Y,
  F2_L1_Y,
  F2_L2_Y,
  F2_PORTAL_L0,
  F2_PORTAL_L1,
  F2_PORTAL_L2,
  F2_PORTALS,
  F2_ROOF_CENTER_Y,
  F2_ROOF_THICK,
} from './layout';

/**
 * FLOOR 02 — ZONE 6 (SE OCCLUSION CELL): RAIL SWITCHYARD & SEALED BLACK-MARKET MUNITIONS VAULT
 * Footprint: x ∈ [+12.0, +34.0], z ∈ [+4.0, +34.0] (`22m × 30m`)
 *
 * - Cyber-industrial freight switchyard with a parked Armored Rail Flatbed (`walkableTop: true`)!
 * - BRIGHTLY LIT PANORAMIC SHOOT-THROUGH BLACK-MARKET MUNITIONS VAULT (`x ∈ [+24.5, +33.69], z ∈ [+24.0, +33.69]`):
 *   Snipe the glowing crimson Breaker Relay (`f2_lock_blackmarket_vault`) cleanly through the wide
 *   North panoramic glass viewing window to unseal the armored vault gate (`f2_gate_blackmarket_vault`)
 *   and claim 2 `.50 HV` Heavy Ammo Crates!
 * - Flush West-wall `L0 -> L1` Stair + L1 & L2 Skyways linking Zones 1, 8, and 9!
 */
export function buildFloor2Zone6SouthEastRailDepot(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const y0 = F2_L0_Y; // 14.0m
  const y1 = F2_L1_Y; // 17.1m
  const y2 = F2_L2_Y; // 20.2m
  const ceilH = F2_CEIL_H; // 10.9m
  const accentMat = mats.floorAccent[2];
  const moltenMat = mats.moltenGlow;

  const cellGroup = new THREE.Group();
  cellGroup.name = 'F2_CELL_Z6_SE_RAIL_DEPOT';
  collector.group.add(cellGroup);

  // 1. Full L0 Switchyard Floor (`x ∈ [+12, +34], z ∈ [+4, +34]`)
  addWalkableDeck(collector, {
    minX: F2_GRID.X_CORE_EAST,
    maxX: F2_GRID.X_EAST_MID,
    minZ: F2_GRID.Z_CUSTOMS,
    maxZ: F2_GRID.Z_SOUTH_OUTER,
    y: y0,
    thickness: 0.5,
    material: mats.foundryIron,
    targetGroup: cellGroup,
    name: 'F2_Z6_L0_Floor',
  });

  // 2. Single-Owner Walls:
  //    - East partition (`x = +34.0`, z ∈ [+4, +34]) -> Zone 8 Far SE Cooling Silo
  //    - South outer (`z = +34.0`, x ∈ [+12, +34])
  //    - West shaft wall (`x = +12.0`, z ∈ [+17, +34]; z ∈ [+4, +17] owned by Zone 1!)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F2_GRID.X_EAST_MID,
    spanStart: F2_GRID.Z_CUSTOMS + 0.3,
    spanEnd: F2_GRID.Z_SOUTH_OUTER - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.foundryIron,
    accentMat,
    targetGroup: cellGroup,
    portals: [
      { start: F2_PORTALS.Z6_Z8_L0_Z[0], end: F2_PORTALS.Z6_Z8_L0_Z[1], ...F2_PORTAL_L0, kind: 'door', framed: true, accentHeader: true },
      { start: F2_PORTALS.Z6_Z8_L1_Z[0], end: F2_PORTALS.Z6_Z8_L1_Z[1], ...F2_PORTAL_L1, kind: 'door', framed: true, accentHeader: true },
      { start: F2_PORTALS.Z6_Z8_L2_Z[0], end: F2_PORTALS.Z6_Z8_L2_Z[1], ...F2_PORTAL_L2, kind: 'door', framed: true, accentHeader: true },
    ],
    name: 'F2_Z6_EastPartitionWall',
  });
  addF2PortalSill(collector, { axis: 'z', coord: F2_GRID.X_EAST_MID, span: F2_PORTALS.Z6_Z8_L1_Z, y: y1, material: mats.catwalkGrate, targetGroup: cellGroup, name: 'F2_Z6_Sill_Z8_L1' });
  addF2PortalSill(collector, { axis: 'z', coord: F2_GRID.X_EAST_MID, span: F2_PORTALS.Z6_Z8_L2_Z, y: y2, material: mats.catwalkGrate, targetGroup: cellGroup, name: 'F2_Z6_Sill_Z8_L2' });

  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F2_GRID.Z_SOUTH_OUTER,
    spanStart: F2_GRID.X_CORE_EAST - 0.3,
    spanEnd: F2_GRID.X_EAST_MID + 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.foundryIron,
    targetGroup: cellGroup,
    name: 'F2_Z6_SouthOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F2_GRID.X_CORE_EAST,
    spanStart: F2_GRID.Z_ARRIVAL + 0.3,
    spanEnd: F2_GRID.Z_SOUTH_OUTER - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.foundryIron,
    targetGroup: cellGroup,
    name: 'F2_Z6_WestShaftWall',
  });

  // 3. BRIGHTLY LIT PANORAMIC SHOOT-THROUGH BLACK-MARKET MUNITIONS VAULT (`x ∈ [+24.5, +33.69], z ∈ [+25.3, +33.69]`)
  //    Walls terminate cleanly at `y1 - 0.34 = 16.76m` flush under `F2_Z6_L1_SouthDeck` -> 100% watertight roof, ZERO Z-fighting!
  const vaultWallH = y1 - y0 - 0.34;
  //    North Vault Wall (`z = +25.3`): Wide panoramic glass viewing window (`x ∈ [+26.2, +31.6]`)!
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: 25.3,
    spanStart: 24.2,
    spanEnd: 33.69,
    baseY: y0,
    height: vaultWallH,
    wallMat: mats.armoredSteel,
    accentMat: moltenMat,
    targetGroup: cellGroup,
    portals: [
      { start: 26.2, end: 31.6, bottomY: y0 + 0.9, topY: y0 + 2.48, kind: 'window', framed: true },
    ],
    name: 'F2_Z6_VaultNorthWindowWall',
  });
  //    West Vault Wall (`x = +24.5`): Locked Security Gate (`z ∈ [+27.6, +31.6]`, 2.0m solid pier from corner -> zero glass/leaf overlap!)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: 24.5,
    spanStart: 25.6,
    spanEnd: 33.69,
    baseY: y0,
    height: vaultWallH,
    wallMat: mats.armoredSteel,
    accentMat: moltenMat,
    targetGroup: cellGroup,
    portals: [
      { start: 27.6, end: 31.6, bottomY: y0, topY: y0 + 2.65, kind: 'door', framed: true, accentHeader: true },
    ],
    name: 'F2_Z6_VaultWestGateWall',
  });
  buildLockedSecurityGate(collector, mats, {
    id: F2_IDS.gateBlackMarketVault,
    label: 'BLACK-MARKET MUNITIONS VAULT',
    x: 24.5,
    y: y0,
    z: 29.6,
    width: 4.0,
    height: 2.65,
    spanAxis: 'z',
    lockedHint: 'VAULT SEALED · SNIPE CRIMSON RELAY THROUGH NORTH GLASS WINDOW!',
    targetGroup: cellGroup,
  });
  // Mounted cleanly on South Vault back wall centered in the left panoramic glass pane (clear of center mullion!)
  buildShootableLock(collector, mats, {
    id: F2_IDS.lockBlackMarketVault,
    bannerText: 'VAULT BREAKER SHATTERED · BLACK-MARKET MUNITIONS VAULT UNSEALED!',
    x: 27.5,
    y: y0 + 1.72,
    z: F2_GRID.Z_SOUTH_OUTER - 0.44,
    rotY: Math.PI,
    unlockGateId: F2_IDS.gateBlackMarketVault,
    targetGroup: cellGroup,
  });

  // Recessed armored weapon lockers lining the East vault wall behind the two .50 HV ammo crates
  buildWallEquipmentBays(
    collector,
    mats,
    [
      {
        axis: 'z',
        coord: 33.69,
        inwardDir: -1,
        centerAlong: 29.6,
        width: 6.6,
        baseY: y0,
        height: 2.48,
        depth: 0.52,
      },
    ],
    { targetGroup: cellGroup, accentMat, name: 'F2_Z6_VaultWeaponLockers' }
  );

  // Interior glowing ceiling strips & floor amber crate-bay framing lighting up the Black-Market Vault
  const vaultGlow = buildBatchedBoxesMesh(
    [
      { w: 6.4, h: 0.08, d: 0.34, x: 29.1, y: y1 - 0.39, z: 27.5 },
      { w: 6.4, h: 0.08, d: 0.34, x: 29.1, y: y1 - 0.39, z: 31.6 },
    ],
    mats.ceilingLight,
    { name: 'F2_Z6_VaultInteriorLights' }
  );
  if (vaultGlow) cellGroup.add(vaultGlow);
  const vaultAccentTrim = buildBatchedBoxesMesh(
    [
      { w: 2.1, h: 0.016, d: 0.08, x: 31.4, y: y0 + 0.012, z: 26.15 },
      { w: 2.1, h: 0.016, d: 0.08, x: 31.4, y: y0 + 0.012, z: 32.25 },
      { w: 0.08, h: 0.016, d: 6.18, x: 30.35, y: y0 + 0.012, z: 29.2 },
    ],
    accentMat,
    { name: 'F2_Z6_VaultCrateBayStrips' }
  );
  if (vaultAccentTrim) cellGroup.add(vaultAccentTrim);

  // 4. LEVEL 1 (`17.1m`) SWITCHYARD CATWALKS + FLUSH WEST-WALL `L0 -> L1` STAIR!
  //    South L1 Deck (`x ∈ [+12.31, +33.69], z ∈ [+25.3, +33.69]` -> roofs over the Vault & connects Zone 8 L1!)
  addWalkableDeck(collector, {
    minX: 12.31,
    maxX: 33.69,
    minZ: 25.3,
    maxZ: 33.69,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z6_L1_SouthDeck',
  });
  //    North-West L1 Overpass (`x ∈ [+12.31, +18.2], z ∈ [+4.31, +14.0]` -> connects Zone 1 L1 & Zone 9 L1!)
  addWalkableDeck(collector, {
    minX: 12.31,
    maxX: 18.2,
    minZ: 4.31,
    maxZ: 14.0,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z6_L1_NorthWestOverpass',
  });
  //    Connecting West Spine (`x ∈ [+14.3, +18.2], z ∈ [+14.0, +25.3]` -> flush beside West-wall stair!)
  addWalkableDeck(collector, {
    minX: 14.3,
    maxX: 18.2,
    minZ: 14.0,
    maxZ: 25.3,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z6_L1_WestConnector',
  });

  // L1 Guardrails (OPEN at West-wall stair top `x ∈ [+12.31, +14.3]` on `z = +25.3`!)
  buildGuardrailRun(collector, mats, { x1: 18.2, z1: 25.3, x2: 33.65, z2: 25.3, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 18.2, z1: 4.35, x2: 18.2, z2: 25.3, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 14.3, z1: 14.0, x2: 14.3, z2: 25.3, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 12.35, z1: 14.0, x2: 14.3, z2: 14.0, y: y1, accentMat, targetGroup: cellGroup });

  // Flush West-Wall `L0 -> L1` Stair (`x = +13.3, z: 19.5 -> 25.3`)
  buildStraightStairFlight(collector, mats, {
    x: 13.3,
    z: 22.4,
    width: 2.0,
    length: 5.8,
    yStart: y0, // z = 19.5 -> 14.0m
    yEnd: y1, // z = 25.3 -> 17.1m (South L1 Deck)
    axis: 'z',
    railMinSide: false,
    railMaxSide: true,
    targetGroup: cellGroup,
    accentMat,
  });

  // 5. LEVEL 2 (`20.2m`) NORTH SKYWAY (`x ∈ [+12.31, +33.69], z ∈ [+7.6, +12.0]` + North Spur into Zone 9!)
  addWalkableDeck(collector, {
    minX: 12.31,
    maxX: 33.69,
    minZ: 7.6,
    maxZ: 12.0,
    y: y2,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z6_L2_NorthSkyway',
  });
  addWalkableDeck(collector, {
    minX: 21.0,
    maxX: 25.0,
    minZ: 4.31,
    maxZ: 7.6,
    y: y2,
    thickness: 0.34,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F2_Z6_L2_NorthSpur',
  });
  buildGuardrailRun(collector, mats, { x1: 12.35, z1: 12.0, x2: 33.65, z2: 12.0, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 12.35, z1: 7.6, x2: 21.0, z2: 7.6, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 25.0, z1: 7.6, x2: 33.65, z2: 7.6, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 21.0, z1: 4.35, x2: 21.0, z2: 7.6, y: y2, accentMat: moltenMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 25.0, z1: 4.35, x2: 25.0, z2: 7.6, y: y2, accentMat: moltenMat, targetGroup: cellGroup });

  // 6. HERO COMPOSITE PROP: ARMORED RAIL FREIGHT FLATBED CAR (`(+22.2, y0, +16.2)`, walkableTop!)
  const carSpecs: BoxSpec[] = [
    { w: 6.2, h: 0.84, d: 2.8, x: 22.2, y: y0 + 0.43, z: 16.2 },
    { w: 2.1, h: 1.05, d: 1.9, x: 20.6, y: y0 + 1.38, z: 16.2 },
  ];
  const carMesh = buildBatchedBoxesMesh(carSpecs, mats.armoredSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F2_Z6_FreightFlatbed',
  });
  if (carMesh) {
    cellGroup.add(carMesh);
    collector.wallMeshes.push(carMesh);
  }
  const carTrim = buildBatchedBoxesMesh(
    [
      { w: 6.26, h: 0.12, d: 0.1, x: 22.2, y: y0 + 0.78, z: 14.82 },
      { w: 6.26, h: 0.12, d: 0.1, x: 22.2, y: y0 + 0.78, z: 17.58 },
    ],
    mats.amberAlloy,
    { name: 'F2_Z6_FlatbedTrim' }
  );
  if (carTrim) cellGroup.add(carTrim);
  collector.boxes.push(
    {
      id: 'f2_z6_flatbed',
      minX: 19.1,
      maxX: 25.3,
      minY: y0,
      maxY: y0 + 0.86,
      minZ: 14.8,
      maxZ: 17.6,
      walkableTop: true,
      tag: 'freight_flatbed',
    },
    {
      id: 'f2_z6_flatbed_crate',
      minX: 19.55,
      maxX: 21.65,
      minY: y0 + 0.86,
      maxY: y0 + 1.9,
      minZ: 15.25,
      maxZ: 17.15,
      walkableTop: true,
      tag: 'freight_crate',
    }
  );

  // Ceiling Lights & Watertight Roof Slab (`top = 25.40m`)
  const lightSpecs: BoxSpec[] = [];
  for (const lz of [9.5, 19.0, 28.5]) {
    lightSpecs.push({ w: 14.0, h: 0.1, d: 0.44, x: 23.0, y: y0 + ceilH - 0.06, z: lz });
  }
  const roofMesh = buildBatchedBoxesMesh(
    [{ w: 22.0, h: F2_ROOF_THICK, d: 30.3, x: 23.0, y: F2_ROOF_CENTER_Y, z: 19.15 }],
    mats.foundryIron,
    { receiveShadow: true, name: 'F2_Z6_RoofSlab' }
  );
  if (roofMesh) {
    cellGroup.add(roofMesh);
    collector.wallMeshes.push(roofMesh);
  }
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F2_Z6_Lights' });
  if (lightMesh) cellGroup.add(lightMesh);

  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: 28.5, y: y0, z: 13.5, w: 2.4, h: 0.98, d: 0.88, walkableTop: true },
      { x: 25.0, y: y1, z: 29.0, w: 0.88, h: 0.98, d: 2.4, walkableTop: true },
    ],
    { targetGroup: cellGroup, accentMat, name: 'F2_Z6_Cover' }
  );

  buildExplosiveBarrel(collector, mats, { id: 'f2_barrel_z6_l0', x: 27.2, y: y0, z: 19.8, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f2_barrel_z6_l1', x: 29.5, y: y1, z: 29.5, targetGroup: cellGroup });

  addWallStencilPlaque(cellGroup, mats, {
    code: '02-RD',
    title: 'RAIL SWITCHYARD & VAULT',
    subtitle: 'SNIPE RELAY THROUGH GLASS FOR .50 HV CACHE',
    accentHex: 0xeab308,
    x: 23.0,
    y: y2 + 2.4,
    z: F2_GRID.Z_SOUTH_OUTER - 0.36,
    rotY: Math.PI,
    width: 7.4,
    height: 1.4,
  });

  return {
    id: 'f2_zone6_se_rail_depot',
    group: cellGroup,
    triggerBounds: { minX: 8.0, maxX: 36.0, minZ: 1.0, maxZ: 34.0 },
    center: { x: 23.0, z: 19.0 },
    maxViewDistance: 66.0,
  };
}
