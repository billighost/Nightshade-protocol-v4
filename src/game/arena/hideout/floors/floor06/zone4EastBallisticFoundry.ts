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
import { buildTacticalDoor } from '../../mechanics';
import type { OcclusionCell } from '../../types';
import {
  buildExplosiveBarrel,
  buildRetractableBridge,
  buildShootableLock,
  buildWorldSwitch,
} from '../../mechanics';
import {
  F6_BASE_Y,
  F6_CEILINGS,
  F6_IDS,
  F6_PORTALS,
  F6_UPPER_Y,
  F6_WALLS,
} from './layout';

/**
 * FLOOR 06 — ZONE 4 (EAST OCCLUSION CELL): BALLISTIC CONTAINMENT FOUNDRY & FORGE
 * Footprint: x ∈ [+18.0, +44.0] (26m wide) × z ∈ [-8.0, +17.0] (25m deep), Ceiling: 10.2m
 *
 * Industrial CoD / Halo Forge Arena:
 * - Warm molten-amber industrial contrast against the cool cyan Monolith Cathedral
 * - 4 Grounded Heavy Foundry Crucible Pylons framing a wide central combat arena
 * - Flush East Wall Staircase (`x = +42.32`, ZERO wall gap!) climbing up to the `+4.4m` East Foundry Spine
 * - Retractable Foundry Skybridge (`f6_bridge_foundry_catwalk`) spanning 14.8m across the upper forge (`x ∈ [23.6, 38.4]`),
 *   deployable via `[E]` switch on East Spine OR shooting the glowing crimson Relay Lock on the South Foundry Crane!
 * - Jammed Half-Open Roll-Under Blast Shutter (`f6_jammed_foundry_grav`) & Motorized Auto Door into Zone 6 NE Grav-Core!
 * - 4 Explosive Plasma Barrels arranged in twin chain-reaction foundry clusters!
 */
export function buildFloor6Zone4EastBallisticFoundry(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const baseY = F6_BASE_Y;
  const upperY = F6_UPPER_Y;
  const ceilH = F6_CEILINGS.eastFoundry; // 10.2m
  const forgeAccent = mats.floorAccent[4]; // Warm forge orange-amber industrial accent!

  const wingGroup = new THREE.Group();
  wingGroup.name = 'F6_Z4_EAST_FOUNDRY_CELL';
  collector.group.add(wingGroup);

  // 1. Floor Slab & Watertight Ceiling Slab (`x ∈ [18.3, 43.7], z ∈ [-7.7, 16.7]`)
  addWalkableDeck(collector, {
    minX: F6_WALLS.cathedralEastX,
    maxX: F6_WALLS.eastOuterX,
    minZ: F6_WALLS.northWingsSplitZ,
    maxZ: F6_WALLS.eastFoundrySouthZ,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    targetGroup: wingGroup,
    name: 'F6_Z4_FoundryFloor',
  });

  const ceilMesh = buildBatchedBoxesMesh(
    [{ w: 25.4, h: 0.6, d: 24.4, x: 31.0, y: baseY + ceilH + 0.3, z: 4.5 }],
    mats.darkConcrete,
    { receiveShadow: false, name: 'F6_Z4_FoundryCeiling' }
  );
  if (ceilMesh) wingGroup.add(ceilMesh);

  // 2. Perimeter & Shared North Wall (West wall x = +18.0 owned by Zone 2 Cathedral!)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F6_WALLS.eastOuterX,
    spanStart: F6_WALLS.northWingsSplitZ + 0.3,
    spanEnd: F6_WALLS.eastFoundrySouthZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: wingGroup,
    name: 'F6_Z4_EastOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F6_WALLS.eastFoundrySouthZ,
    spanStart: F6_WALLS.cathedralEastX + 0.3,
    spanEnd: F6_WALLS.eastOuterX + 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWallLight,
    targetGroup: wingGroup,
    name: 'F6_Z4_SouthOuterWall',
  });

  // North Shared Wall (z = -8.0 -> Zone 6 NE Grav-Core Test Chamber)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F6_WALLS.northWingsSplitZ,
    spanStart: F6_WALLS.cathedralEastX + 0.3,
    spanEnd: F6_WALLS.eastOuterX + 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat: mats.floorAccent[5], // Electric violet-cyan Grav-Core accent!
    targetGroup: wingGroup,
    portals: [
      {
        start: F6_PORTALS.foundryToGravAutoX[0],
        end: F6_PORTALS.foundryToGravAutoX[1],
        bottomY: baseY,
        topY: baseY + 4.0,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F6_PORTALS.foundryToGravJammedX[0],
        end: F6_PORTALS.foundryToGravJammedX[1],
        bottomY: baseY,
        topY: baseY + 4.0,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F6_PORTALS.foundryToGravUpperX[0],
        end: F6_PORTALS.foundryToGravUpperX[1],
        bottomY: upperY,
        topY: upperY + 3.6,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
    ],
    name: 'F6_Z4_NorthGravCoreWall',
  });

  // Interactive Doors into Zone 6 NE Grav-Core!
  buildTacticalDoor(collector, mats, {
    id: 'f6_auto_foundry_grav',
    mode: 'automatic',
    x: (F6_PORTALS.foundryToGravAutoX[0] + F6_PORTALS.foundryToGravAutoX[1]) * 0.5,
    y: baseY,
    z: F6_WALLS.northWingsSplitZ,
    width: F6_PORTALS.foundryToGravAutoX[1] - F6_PORTALS.foundryToGravAutoX[0],
    height: 4.0,
    spanAxis: 'x',
    targetGroup: wingGroup,
  });
  buildTacticalDoor(collector, mats, {
    id: F6_IDS.jammedFoundryGrav,
    mode: 'jammed_roll',
    x: (F6_PORTALS.foundryToGravJammedX[0] + F6_PORTALS.foundryToGravJammedX[1]) * 0.5,
    y: baseY,
    z: F6_WALLS.northWingsSplitZ,
    width: F6_PORTALS.foundryToGravJammedX[1] - F6_PORTALS.foundryToGravJammedX[0],
    height: 4.0,
    spanAxis: 'x',
    targetGroup: wingGroup,
  });

  // 3. ELEVATED FOUNDRY GALLERIES (`+4.4m = 74.4m`) + FLUSH EAST WALL STAIRCASE + RETRACTABLE SKYBRIDGE!
  // East Foundry Spine (`x ∈ [38.4, 43.68], z ∈ [-7.68, +6.4]`)
  addWalkableDeck(collector, {
    minX: 38.4,
    maxX: 43.68,
    minZ: -7.68,
    maxZ: 6.4,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: wingGroup,
    castShadow: true,
    name: 'F6_Z4_EastFoundrySpine',
  });
  // West Foundry Balcony (`x ∈ [18.32, 23.6], z ∈ [+1.6, +6.8]`) joining Zone 2 Cathedral's eastMidUpperZ [2.0..6.4]!
  addWalkableDeck(collector, {
    minX: 18.32,
    maxX: 23.6,
    minZ: 1.6,
    maxZ: 6.8,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: wingGroup,
    castShadow: true,
    name: 'F6_Z4_WestFoundryBalcony',
  });
  // Portal Threshold Bridge through z = -8.0 into Zone 6 NE Grav-Core!
  addWalkableDeck(collector, {
    minX: F6_PORTALS.foundryToGravUpperX[0] + 0.18,
    maxX: F6_PORTALS.foundryToGravUpperX[1] - 0.18,
    minZ: -8.32,
    maxZ: -7.68,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: wingGroup,
    name: 'F6_Z4_GravUpperThreshold',
  });

  // FLUSH East Wall Staircase: climbs Northward from z = +15.2 (baseY 70.0) -> z = +6.4 (upperY 74.4)!
  // x = 42.32, width = 2.70 -> maxX = 43.67 (FLUSH against East Wall `43.70`!), railMinSide at EXACT `x = 40.90`!
  buildStraightStairFlight(collector, mats, {
    x: 42.32,
    z: 10.8,
    width: 2.7,
    length: 8.8,
    yStart: upperY,
    yEnd: baseY,
    axis: 'z',
    steps: 20,
    railMinSide: true,
    railMaxSide: false,
    targetGroup: wingGroup,
    accentMat: forgeAccent,
  });

  // Exact Guardrails on East Foundry Spine & West Foundry Balcony (opening at `z ∈ [2.8, 5.6]` for Retractable Bridge!)
  buildGuardrailRun(collector, mats, {
    x1: 38.4,
    z1: -7.68,
    x2: 38.4,
    z2: 2.8,
    y: upperY,
    accentMat: forgeAccent,
    targetGroup: wingGroup,
  });
  buildGuardrailRun(collector, mats, {
    x1: 38.4,
    z1: 5.6,
    x2: 38.4,
    z2: 6.4,
    y: upperY,
    accentMat: forgeAccent,
    targetGroup: wingGroup,
  });
  buildGuardrailRun(collector, mats, {
    x1: 38.4,
    z1: 6.4,
    x2: 40.9,
    z2: 6.4,
    y: upperY,
    accentMat: forgeAccent,
    targetGroup: wingGroup,
  });
  // West Foundry Balcony guardrails (opening at `z ∈ [2.8, 5.6]` along `x = 23.6` for Retractable Bridge!)
  buildGuardrailRun(collector, mats, {
    x1: 18.32,
    z1: 1.6,
    x2: 23.6,
    z2: 1.6,
    y: upperY,
    accentMat: forgeAccent,
    targetGroup: wingGroup,
  });
  buildGuardrailRun(collector, mats, {
    x1: 23.6,
    z1: 1.6,
    x2: 23.6,
    z2: 2.8,
    y: upperY,
    accentMat: forgeAccent,
    targetGroup: wingGroup,
  });
  buildGuardrailRun(collector, mats, {
    x1: 23.6,
    z1: 5.6,
    x2: 23.6,
    z2: 6.8,
    y: upperY,
    accentMat: forgeAccent,
    targetGroup: wingGroup,
  });
  buildGuardrailRun(collector, mats, {
    x1: 18.32,
    z1: 6.8,
    x2: 23.6,
    z2: 6.8,
    y: upperY,
    accentMat: forgeAccent,
    targetGroup: wingGroup,
  });

  // RETRACTABLE FOUNDRY SKYBRIDGE (`x = 38.4 -> 23.6`, `length = 14.8m`, `z = 4.2`, `y = 74.4m`)!
  buildRetractableBridge(collector, mats, {
    id: F6_IDS.bridgeFoundryCatwalk,
    label: 'FOUNDRY CATWALK SKYBRIDGE',
    anchorX: 38.4,
    y: upperY,
    anchorZ: 4.2,
    extendDirX: -1,
    extendDirZ: 0,
    length: 14.8,
    width: 2.8,
    targetGroup: wingGroup,
    accentMat: forgeAccent,
  });

  // Dual Activation: (A) `[E]` Switch on East Foundry Spine + (B) Shootable Crimson Relay on South Forge Wall!
  buildWorldSwitch(collector, mats, {
    id: F6_IDS.switchFoundryBridge,
    x: 40.6,
    y: upperY,
    z: 1.4,
    rotY: -Math.PI * 0.5,
    promptLocked: '[E] DEPLOY FOUNDRY SKYBRIDGE',
    promptActivated: 'FOUNDRY SKYBRIDGE DEPLOYED',
    bannerText: 'FOUNDRY CATWALK SKYBRIDGE DEPLOYED',
    deployBridgeId: F6_IDS.bridgeFoundryCatwalk,
    targetGroup: wingGroup,
  });
  buildShootableLock(collector, mats, {
    id: F6_IDS.lockFoundryBridge,
    x: 31.0,
    y: baseY + 5.8,
    z: 16.52,
    rotY: Math.PI,
    bannerText: 'FOUNDRY CRANE RELAY SHATTERED · SKYBRIDGE DEPLOYED',
    deployBridgeId: F6_IDS.bridgeFoundryCatwalk,
    targetGroup: wingGroup,
  });

  // 4. MONUMENTAL FOUNDRY CRUCIBLE PYLONS, OVERHEAD BRIDGE CRANE & WARM AMBER ACCENTS
  const steelSpecs: BoxSpec[] = [];
  const armorSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  const accSpecs: BoxSpec[] = [];

  // 4 Grounded Heavy Crucible Pylons framing the central foundry floor (full ceiling height minus 12mm!)
  const pylonH = ceilH - 0.52;
  for (const [px, pz] of [
    [26.8, -1.6],
    [35.2, -1.6],
    [26.8, 10.6],
    [35.2, 10.6],
  ] as const) {
    armorSpecs.push({ w: 1.55, h: pylonH, d: 1.55, x: px, y: baseY + 0.006 + pylonH * 0.5, z: pz });
    steelSpecs.push(
      { w: 1.82, h: 0.34, d: 1.82, x: px, y: baseY + 0.17, z: pz },
      { w: 1.82, h: 0.34, d: 1.82, x: px, y: baseY + 4.4, z: pz }
    );
    accSpecs.push(
      { w: 0.12, h: pylonH - 1.2, d: 0.08, x: px, y: baseY + pylonH * 0.5, z: pz - 0.81 },
      { w: 0.12, h: pylonH - 1.2, d: 0.08, x: px, y: baseY + pylonH * 0.5, z: pz + 0.81 }
    );
    collector.boxes.push({
      minX: px - 0.88,
      maxX: px + 0.88,
      minY: baseY,
      maxY: baseY + ceilH,
      minZ: pz - 0.88,
      maxZ: pz + 0.88,
      walkableTop: false,
    });
  }

  // Overhead Foundry Roof Trusses & High-Bay Lighting + South Crane Bridge
  for (let z = -5.0; z <= 14.0; z += 4.75) {
    steelSpecs.push({ w: 25.32, h: 0.48, d: 0.4, x: 31.0, y: baseY + ceilH - 0.25, z });
    lightSpecs.push({ w: 16.5, h: 0.08, d: 0.32, x: 31.0, y: baseY + ceilH - 0.06, z: z + 2.2 });
  }
  // Grounded support columns under East Foundry Spine & West Foundry Balcony
  for (const [cx, cz] of [
    [38.64, -7.2],
    [38.64, 1.8],
    [38.64, 6.16],
    [23.36, 1.84],
    [23.36, 6.56],
  ] as const) {
    steelSpecs.push({ w: 0.42, h: 3.972, d: 0.42, x: cx, y: baseY + 0.004 + 1.986, z: cz });
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

  // Floor guidance lines + East wall accent strictly clear of the East Staircase (`z ∈ [-7.2, +6.0]`)!
  accSpecs.push(
    { w: 0.08, h: 0.08, d: 13.0, x: 43.64, y: baseY + 2.6, z: -0.6 },
    { w: 0.14, h: 0.012, d: 21.0, x: 31.0, y: baseY + 0.008, z: 4.0 }
  );

  const steelMesh = buildBatchedBoxesMesh(steelSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F6_Z4_FoundrySteel',
  });
  if (steelMesh) {
    wingGroup.add(steelMesh);
    collector.wallMeshes.push(steelMesh);
  }
  const armorMesh = buildBatchedBoxesMesh(armorSpecs, mats.armoredSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F6_Z4_CruciblePylons',
  });
  if (armorMesh) {
    wingGroup.add(armorMesh);
    collector.wallMeshes.push(armorMesh);
  }
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F6_Z4_FoundryLights' });
  if (lightMesh) wingGroup.add(lightMesh);
  const accMesh = buildBatchedBoxesMesh(accSpecs, forgeAccent, { name: 'F6_Z4_FoundryAccents' });
  if (accMesh) wingGroup.add(accMesh);

  // 5. Recessed South Foundry Gear Lockers, Workbenches, Tactical Barricades & 4 Explosive Plasma Barrels!
  buildWallEquipmentBays(
    collector,
    mats,
    [
      { axis: 'x', coord: 16.7, inwardDir: -1, centerAlong: 23.4, baseY, width: 5.0, height: 3.1, depth: 0.56 },
      { axis: 'x', coord: 16.7, inwardDir: -1, centerAlong: 35.8, baseY, width: 5.0, height: 3.1, depth: 0.56 },
    ],
    { targetGroup: wingGroup, accentMat: forgeAccent, name: 'F6_Z4_FoundryLockers' }
  );
  buildTacticalConsoleBenches(
    collector,
    mats,
    [
      { x: 31.0, y: baseY, z: 14.4, w: 3.6, h: 0.98, d: 1.1 },
      { x: 22.4, y: baseY, z: 4.5, w: 1.1, h: 0.98, d: 3.4 },
    ],
    { targetGroup: wingGroup, accentMat: forgeAccent, name: 'F6_Z4_FoundryBenches' }
  );
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: 31.0, y: baseY, z: 4.2, w: 3.4, h: 1.02, d: 1.05, walkableTop: true },
      { x: 31.0, y: baseY, z: -4.2, w: 2.8, h: 1.0, d: 0.98, walkableTop: true },
    ],
    { targetGroup: wingGroup, accentMat: mats.hazardStripe, name: 'F6_Z4_FoundryBarricades' }
  );

  // 4 Pressurized Explosive Plasma Barrels in 2 chain-reaction foundry pairs!
  buildExplosiveBarrel(collector, mats, {
    id: 'f6_barrel_foundry_n1',
    x: 29.2,
    y: baseY,
    z: -1.4,
    targetGroup: wingGroup,
  });
  buildExplosiveBarrel(collector, mats, {
    id: 'f6_barrel_foundry_n2',
    x: 32.8,
    y: baseY,
    z: -1.4,
    targetGroup: wingGroup,
  });
  buildExplosiveBarrel(collector, mats, {
    id: 'f6_barrel_foundry_s1',
    x: 29.2,
    y: baseY,
    z: 9.8,
    targetGroup: wingGroup,
  });
  buildExplosiveBarrel(collector, mats, {
    id: 'f6_barrel_foundry_s2',
    x: 32.8,
    y: baseY,
    z: 9.8,
    targetGroup: wingGroup,
  });

  // High-Readability Architectural Stencil Signage (cleanly above upper rails!)
  addWallStencilPlaque(wingGroup, mats, {
    code: '06-F',
    title: 'BALLISTIC FORGE FOUNDRY',
    subtitle: 'SHOOT SOUTH CRANE RELAY TO DEPLOY UPPER SKYBRIDGE',
    accentHex: 0xf97316,
    x: 31.0,
    y: baseY + 8.0,
    z: 16.62,
    rotY: Math.PI,
    width: 6.8,
    height: 1.55,
  });

  return {
    id: 'f6_east_foundry',
    group: wingGroup,
    center: new THREE.Vector3(31.0, baseY + 3.5, 4.5),
    triggerBounds: {
      minX: 12.0,
      maxX: 46.0,
      minZ: -12.0,
      maxZ: 20.0,
    },
    maxViewDistance: 36.0,
  };
}
