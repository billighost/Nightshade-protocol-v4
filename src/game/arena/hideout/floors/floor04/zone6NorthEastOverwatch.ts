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
  buildTacticalConsoleBenches,
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
  F4_BASE_Y,
  F4_CEILINGS,
  F4_IDS,
  F4_UPPER_Y,
  F4_WALLS,
} from './layout';

/**
 * FLOOR 04 — ZONE 6 (NE OCCLUSION CELL): CANYON OVERWATCH BUNKER & SEALED HYDRO-CORE ARMORY VAULT
 * Footprint: x ∈ [+18.0, +48.0] (30m) × z ∈ [-32.0, -10.0] (22m), 10.0m tall!
 *
 * Signature CoD Tactical Bunker × Brightly Lit Panoramic Shoot-Through Armory Vault:
 * - Sealed Hydro-Core Armory Vault (`x ∈ [38.0, 47.7], z ∈ [-31.7, -19.0]`) behind a huge panoramic
 *   armored glass window (`x = 38.0, z ∈ [-29.8, -20.6]`) housing 2 high-value `.50 HV` ammo crates,
 *   illuminated weapon rack bays & the glowing crimson Shootable Vault Relay Lock (`f4_lock_ne_vault`)!
 *   Shoot `f4_lock_ne_vault` straight through the glass to unlock `f4_gate_ne_vault`!
 * - Tactical Overwatch Briefing Console Arena + Flush North-Wall Staircase (`z = -30.42`, flush against `-31.70`!)
 *   leading cleanly onto the `+4.4m` Upper Overwatch Gallery (`y = 46.4m`) linking `eastNorthUpperZ` &
 *   `foundryToOverwatchUpperX`!
 */
export function buildFloor4Zone6NorthEastOverwatch(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const baseY = F4_BASE_Y; // 42.0m
  const upperY = F4_UPPER_Y; // 46.4m
  const ceilH = F4_CEILINGS.neOverwatch; // 10.0m
  const amberMat = mats.floorAccent[4]; // Volcanic amber
  const hydroMat = mats.floorAccent[6]; // Vault cyan glow

  const cellGroup = new THREE.Group();
  cellGroup.name = 'F4_Z6_NE_OVERWATCH';
  collector.group.add(cellGroup);

  // 1. Floor & Coffered Ceiling Slabs (`x ∈ [+18.0, +48.0], z ∈ [-32.0, -10.0]`)
  addWalkableDeck(collector, {
    minX: F4_WALLS.canyonEastX,
    maxX: F4_WALLS.eastOuterX,
    minZ: F4_WALLS.northWingsOuterZ,
    maxZ: F4_WALLS.northSplitZ,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    targetGroup: cellGroup,
    name: 'F4_Z6_OverwatchFloor',
  });

  const ceilMesh = buildBatchedBoxesMesh(
    [{ w: 29.4, h: 0.5, d: 21.4, x: 33.0, y: baseY + ceilH + 0.25, z: -21.0 }],
    mats.darkConcrete,
    { receiveShadow: false, name: 'F4_Z6_OverwatchCeiling' }
  );
  if (ceilMesh) cellGroup.add(ceilMesh);

  // Ceiling Trusses & Brightly Illuminated Overwatch + Vault Canopy Lights
  const trussSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  for (const tz of [-28.0, -21.0, -14.0]) {
    trussSpecs.push({ w: 29.3, h: 0.42, d: 0.4, x: 33.0, y: baseY + ceilH - 0.22, z: tz });
    lightSpecs.push(
      { w: 7.4, h: 0.08, d: 0.34, x: 25.4, y: baseY + ceilH - 0.06, z: tz + 2.2 },
      { w: 7.4, h: 0.08, d: 0.34, x: 42.6, y: baseY + ceilH - 0.06, z: tz + 2.2 }
    );
  }
  const trussMesh = buildBatchedBoxesMesh(trussSpecs, mats.structuralSteel, { name: 'F4_Z6_RoofTrusses' });
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F4_Z6_RoofLights' });
  if (trussMesh) cellGroup.add(trussMesh);
  if (lightMesh) cellGroup.add(lightMesh);

  // 2. Perimeter Walls (North Outer `z = -32.0`, East Outer `x = +48.0`, West Solid Segment `x = +18.0, z ∈ [-31.7, -16.7]`)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F4_WALLS.northWingsOuterZ,
    spanStart: F4_WALLS.canyonEastX,
    spanEnd: F4_WALLS.eastOuterX,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat: amberMat,
    targetGroup: cellGroup,
    name: 'F4_Z6_NorthOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F4_WALLS.eastOuterX,
    spanStart: F4_WALLS.northWingsOuterZ + 0.3,
    spanEnd: F4_WALLS.northSplitZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat: amberMat,
    targetGroup: cellGroup,
    name: 'F4_Z6_EastOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F4_WALLS.canyonEastX,
    spanStart: F4_WALLS.northWingsOuterZ + 0.31,
    spanEnd: F4_WALLS.canyonNorthZ - 0.31,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat: amberMat,
    targetGroup: cellGroup,
    name: 'F4_Z6_WestSolidWall',
  });

  // 3. SEALED HYDRO-CORE ARMORY VAULT (`x ∈ [38.0, 47.7], z ∈ [-31.7, -19.0]`, height `4.4m`)!
  // Vault West Partition Wall (`x = 38.0`) with HUGE Panoramic Armored Glass Observation Window!
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: 38.0,
    spanStart: -31.68,
    spanEnd: -19.0,
    baseY,
    height: 3.98,
    wallMat: mats.concreteWallLight,
    accentMat: hydroMat,
    targetGroup: cellGroup,
    portals: [
      {
        start: -29.8,
        end: -20.6,
        bottomY: baseY + 1.0,
        topY: baseY + 3.6,
        kind: 'window',
        framed: true,
        accentHeader: true,
      },
    ],
    name: 'F4_Z6_VaultWestGlassWall',
  });
  // Vault South Wall (`z = -19.0`) with Locked Security Gate Portal (`x ∈ [40.2, 44.8]`)!
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: -19.0,
    spanStart: 38.31,
    spanEnd: 47.68,
    baseY,
    height: 3.98,
    wallMat: mats.concreteWallLight,
    accentMat: hydroMat,
    targetGroup: cellGroup,
    portals: [
      {
        start: 40.2,
        end: 44.8,
        bottomY: baseY,
        topY: baseY + 3.8,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
    ],
    name: 'F4_Z6_VaultSouthWall',
  });

  // Raised Brightly Lit Vault Floor Plinth (`+0.18m`, cleanly inside vault!) + Vault Roof Slab (`y = upperY`)!
  addWalkableDeck(collector, {
    minX: 38.34,
    maxX: 47.66,
    minZ: -31.66,
    maxZ: -19.34,
    y: baseY + 0.18,
    thickness: 0.174,
    material: mats.concreteWallLight,
    targetGroup: cellGroup,
    name: 'F4_Z6_VaultRaisedPlinth',
  });
  // Vault Ceiling Deck (`y = upperY = 46.4m`) acting as a walkable NE Upper Roof Balcony!
  addWalkableDeck(collector, {
    minX: 37.7,
    maxX: 47.68,
    minZ: -31.68,
    maxZ: -18.7,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F4_Z6_VaultRoofDeck',
  });

  // Bright Interior Vault Ceiling Glow Strips + Wall Weapon Locker Bays inside Vault!
  const vaultLightMesh = buildBatchedBoxesMesh(
    [
      { w: 7.4, h: 0.08, d: 0.42, x: 43.0, y: upperY - 0.48, z: -22.2 },
      { w: 7.4, h: 0.08, d: 0.42, x: 43.0, y: upperY - 0.48, z: -28.2 },
    ],
    mats.ceilingLight,
    { name: 'F4_Z6_VaultInteriorLights' }
  );
  if (vaultLightMesh) cellGroup.add(vaultLightMesh);

  buildWallEquipmentBays(
    collector,
    mats,
    [
      { axis: 'z', coord: 47.68, inwardDir: -1, centerAlong: -25.4, baseY: baseY + 0.18, width: 7.2, height: 3.1 },
      { axis: 'x', coord: -31.68, inwardDir: 1, centerAlong: 43.0, baseY: baseY + 0.18, width: 6.4, height: 3.1 },
    ],
    { targetGroup: cellGroup, accentMat: hydroMat, name: 'F4_Z6_VaultWeaponBays' }
  );

  // Locked Vault Security Gate (`f4_gate_ne_vault`) + Crimson Shootable Vault Relay (`f4_lock_ne_vault`) visible through glass!
  buildLockedSecurityGate(collector, mats, {
    id: F4_IDS.gateNeVault,
    label: 'HYDRO-CORE ARMORY VAULT',
    x: 42.5,
    y: baseY,
    z: -19.0,
    width: 4.6,
    height: 3.8,
    spanAxis: 'x',
    lockedHint: 'VAULT SEALED · SHOOT CRIMSON RELAY THROUGH PANORAMIC GLASS WINDOW',
    targetGroup: cellGroup,
  });
  buildShootableLock(collector, mats, {
    id: F4_IDS.lockNeVault,
    x: 46.85,
    y: baseY + 2.45,
    z: -25.2,
    rotY: -Math.PI * 0.5, // Faces West straight out through the panoramic observation window!
    bannerText: 'VAULT RELAY SHATTERED · HYDRO-CORE ARMORY UNLOCKED',
    unlockGateId: F4_IDS.gateNeVault,
    targetGroup: cellGroup,
  });

  // 4. ELEVATED `+4.4m` OVERWATCH GALLERY (`y = 46.4m`) + FLUSH NORTH-WALL STAIRCASE!
  // (A) East Spine connecting Vault Roof (`z = -18.7`) straight to South Upper Portal (`foundryToOverwatchUpperX`, z = -10.0)!
  // Visually inset 6mm at `z = -18.7` -> ZERO Z-fighting!
  const eastSpineMesh = buildBatchedBoxesMesh(
    [{ w: 5.28, h: 0.42, d: 8.374, x: 45.04, y: upperY - 0.21, z: -14.513 }],
    mats.catwalkGrate,
    { castShadow: true, receiveShadow: true, name: 'F4_Z6_EastOverwatchSpine' }
  );
  if (eastSpineMesh) {
    cellGroup.add(eastSpineMesh);
    collector.wallMeshes.push(eastSpineMesh);
  }
  collector.slabs.push({ minX: 42.4, maxX: 47.68, minZ: -18.7, maxZ: -10.32, y: upperY, thickness: 0.42 });

  // (B) South-West Overwatch Gallery (`x ∈ [18.32, 42.4], z ∈ [-15.2, -10.32]`, inset 6mm at `x = 42.4`) meeting `eastNorthUpperZ`!
  const swGalleryMesh = buildBatchedBoxesMesh(
    [
      { w: 24.074, h: 0.42, d: 4.88, x: 30.357, y: upperY - 0.21, z: -12.76 },
      // (C) North Stair Top Landing (`x ∈ [28.8, 37.7], z ∈ [-31.68, -27.2]`, inset 6mm at `x = 37.7`)
      { w: 8.894, h: 0.42, d: 4.48, x: 33.247, y: upperY - 0.21, z: -29.44 },
      // (D) Central N-S Overwatch Skywalk (`x ∈ [31.6, 35.2], z ∈ [-27.2, -15.2]`, inset 6mm at both Z seams!)
      { w: 3.6, h: 0.42, d: 11.988, x: 33.4, y: upperY - 0.21, z: -21.2 },
    ],
    mats.catwalkGrate,
    { castShadow: true, receiveShadow: true, name: 'F4_Z6_OverwatchGalleryNetwork' }
  );
  if (swGalleryMesh) {
    cellGroup.add(swGalleryMesh);
    collector.wallMeshes.push(swGalleryMesh);
  }
  collector.slabs.push(
    { minX: 18.32, maxX: 42.4, minZ: -15.2, maxZ: -10.32, y: upperY, thickness: 0.42 },
    { minX: 28.8, maxX: 37.7, minZ: -31.68, maxZ: -27.2, y: upperY, thickness: 0.42 },
    { minX: 31.6, maxX: 35.2, minZ: -27.2, maxZ: -15.2, y: upperY, thickness: 0.42 }
  );

  // Flush North-Wall Staircase (`z = -30.42`, `width = 2.50` -> `minZ = -31.67` flush against `-31.70`!)
  // Ascends West->East from `x = 20.6` (`baseY`) up to `x = 28.8` (`upperY`) — ZERO wall gap!
  buildStraightStairFlight(collector, mats, {
    x: 24.7,
    z: -30.42,
    width: 2.5,
    length: 8.2,
    yStart: baseY,
    yEnd: upperY,
    axis: 'x',
    steps: 20,
    railMinSide: false,
    railMaxSide: true,
    accentMat: amberMat,
    targetGroup: cellGroup,
  });

  // Grounded Support Columns under Overwatch Gallery (cleanly clear of all doorways & consoles!)
  const colSpecs: BoxSpec[] = [];
  const colH = upperY - 0.42 - (baseY + 0.004);
  for (const [cx, cz] of [
    [29.1, -27.5],
    [31.9, -15.5],
    [34.9, -15.5],
    [42.7, -15.5],
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
    name: 'F4_Z6_OverwatchCols',
  });
  if (colMesh) {
    cellGroup.add(colMesh);
    collector.wallMeshes.push(colMesh);
  }

  // Exact Overwatch Guardrails
  buildGuardrailRun(collector, mats, { x1: 18.32, z1: -15.2, x2: 31.6, z2: -15.2, y: upperY, accentMat: amberMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 35.2, z1: -15.2, x2: 42.4, z2: -15.2, y: upperY, accentMat: amberMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 31.6, z1: -27.2, x2: 31.6, z2: -15.2, y: upperY, accentMat: amberMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 35.2, z1: -27.2, x2: 35.2, z2: -15.2, y: upperY, accentMat: amberMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 28.8, z1: -27.2, x2: 31.6, z2: -27.2, y: upperY, accentMat: amberMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 35.2, z1: -27.2, x2: 37.7, z2: -27.2, y: upperY, accentMat: amberMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 37.7, z1: -27.2, x2: 37.7, z2: -18.7, y: upperY, accentMat: hydroMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 37.7, z1: -18.7, x2: 42.4, z2: -18.7, y: upperY, accentMat: hydroMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 42.4, z1: -18.7, x2: 42.4, z2: -15.2, y: upperY, accentMat: amberMat, targetGroup: cellGroup });

  // 5. Overwatch Tactical Command Consoles + Cover Barricades + Explosive Barrel + Signage
  buildTacticalConsoleBenches(
    collector,
    mats,
    [
      { x: 25.4, y: baseY, z: -22.8, w: 5.4, h: 1.02, d: 1.6 },
      { x: 25.4, y: baseY, z: -18.2, w: 4.2, h: 0.96, d: 1.2 },
    ],
    { targetGroup: cellGroup, accentMat: amberMat, name: 'F4_Z6_CommandConsoles' }
  );
  buildJerseyBarricades(
    collector,
    mats,
    [{ x: 42.4, y: upperY, z: -24.4, w: 1.0, h: 0.92, d: 2.2, walkableTop: true }],
    { targetGroup: cellGroup, accentMat: hydroMat, name: 'F4_Z6_OverwatchCover' }
  );
  buildExplosiveBarrel(collector, mats, { id: 'f4_barrel_ne_1', x: 30.2, y: baseY, z: -21.0, targetGroup: cellGroup });

  addWallStencilPlaque(cellGroup, mats, {
    code: '04-Z6',
    title: 'OVERWATCH & VAULT',
    subtitle: 'SHOOT CRIMSON RELAY THROUGH VAULT GLASS FOR .50 HV SUPPLY',
    accentHex: 0x06b6d4,
    x: 37.62,
    y: baseY + 6.4,
    z: -25.2,
    rotY: -Math.PI * 0.5,
    width: 6.2,
    height: 1.42,
  });

  return {
    id: 'f4_zone6_ne_overwatch',
    group: cellGroup,
    triggerBounds: { minX: -6.0, maxX: 49.5, minZ: -32.5, maxZ: 12.0 },
    center: { x: 33.0, z: -21.0 },
    maxViewDistance: 46.0,
  };
}
