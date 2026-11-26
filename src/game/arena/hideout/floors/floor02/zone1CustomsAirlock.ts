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
  buildTacticalConsoleBenches,
  buildWallEquipmentBays,
} from '../../architecture';
import {
  buildGuardrailRun,
  type FloorGeometryCollector,
} from '../../stairs';
import type { BulkheadDoorRig } from '../../types';
import {
  buildLockedSecurityGate,
  buildShootableLock,
  buildWorldSwitch,
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
 * FLOOR 02 — ZONE 1 (SOUTH CORE): FREIGHT CUSTOMS AIRLOCK & BREACH CHECKPOINT
 * Footprint: x ∈ [-12, +12], z ∈ [+4.0, +17.0]
 *
 * - Breaks the open-arena formula: operatives descend from Floor 03 through Arrival Bulkhead 02
 *   (`z = +17.0`) into a tight, atmospheric cyber-industrial Freight Customs Airlock!
 * - Sealed North Customs Lockdown Shutter (`z = +4.0`) blocks entry into the Maglev Canyon until you:
 *   (A) Snipe the glowing crimson Overpass Breaker Relay (`f2_lock_customs_seal`) framed cleanly above
 *       the customs lintel (100% unobstructed sightline straight from spawn beneath the L1 overpass!), OR
 *   (B) Activate the illuminated Customs Override Switch (`f2_switch_customs_seal`) at the East Inspection Desk!
 * - Overhead L1 (`17.1m`) & L2 (`20.2m`) Sky-Overpass Galleries span West <-> East right above spawn
 *   (connecting Zone 4 SW Forge Yard <-> Zone 6 SE Rail Depot with zero L0 bypass!).
 */
export function buildFloor2Zone1CustomsAirlock(
  collector: FloorGeometryCollector,
  detailGroup: THREE.Group,
  mats: HideoutMaterialRegistry
): BulkheadDoorRig {
  const y0 = F2_L0_Y; // 14.0m
  const y1 = F2_L1_Y; // 17.1m
  const y2 = F2_L2_Y; // 20.2m
  const ceilH = F2_CEIL_H; // 10.9m
  const group = collector.group;
  const accentMat = mats.floorAccent[2];

  // 1. L0 Customs Floor Slab (`thickness = 0.50m -> bottom = 13.50m > 13.20m Floor 01 maxY!`)
  addWalkableDeck(collector, {
    minX: F2_GRID.X_CORE_WEST,
    maxX: F2_GRID.X_CORE_EAST,
    minZ: F2_GRID.Z_CUSTOMS,
    maxZ: F2_GRID.Z_ARRIVAL,
    y: y0,
    thickness: 0.5,
    material: mats.foundryIron,
    name: 'F2_Z1_CustomsFloor',
  });

  // 2. South Arrival Wall (`z = +17.0`) with 5.6m × 5.4m Arrival Bulkhead 02 cutout
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F2_GRID.Z_ARRIVAL,
    spanStart: F2_GRID.X_CORE_WEST - 0.3,
    spanEnd: F2_GRID.X_CORE_EAST + 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.foundryIron,
    accentMat,
    portals: [
      {
        start: -2.8,
        end: 2.8,
        bottomY: y0,
        topY: y0 + 5.4,
        kind: 'door',
        framed: false,
      },
    ],
    name: 'F2_Z1_SouthArrivalWall',
  });

  // 3. North Customs Seal Wall (`z = +4.0`) — SINGLE L0 doorway (`[-2.4, +2.4]`), solid L1/L2 upper bulkhead!
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F2_GRID.Z_CUSTOMS,
    spanStart: F2_GRID.X_CORE_WEST - 0.3,
    spanEnd: F2_GRID.X_CORE_EAST + 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.foundryIron,
    accentMat,
    portals: [
      {
        start: F2_PORTALS.Z1_Z2_GATE_X[0],
        end: F2_PORTALS.Z1_Z2_GATE_X[1],
        ...F2_PORTAL_L0,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      // Twin armored observation windows flanking the locked Customs Gate so players glimpse the Maglev Locomotive!
      {
        start: -8.6,
        end: -4.2,
        bottomY: y0 + 1.05,
        topY: y0 + 2.55,
        kind: 'window',
        framed: true,
      },
      {
        start: 4.2,
        end: 8.6,
        bottomY: y0 + 1.05,
        topY: y0 + 2.55,
        kind: 'window',
        framed: true,
      },
    ],
    name: 'F2_Z1_NorthCustomsWall',
  });

  // 4. West (`x = -12.0`) & East (`x = +12.0`) Side Walls — L1 & L2 Sky-Overpass portals ONLY (NO L0 bypass!)
  for (const side of [-1, 1] as const) {
    const coord = side < 0 ? F2_GRID.X_CORE_WEST : F2_GRID.X_CORE_EAST;
    buildArchitecturalWall(collector, mats, {
      axis: 'z',
      coord,
      spanStart: F2_GRID.Z_CUSTOMS + 0.3,
      spanEnd: F2_GRID.Z_ARRIVAL - 0.3,
      baseY: y0,
      height: ceilH,
      wallMat: mats.foundryIron,
      accentMat,
      portals: [
        {
          start: F2_PORTALS.Z1_SIDE_GALLERY_Z[0],
          end: F2_PORTALS.Z1_SIDE_GALLERY_Z[1],
          ...F2_PORTAL_L1,
          kind: 'door',
          framed: true,
          accentHeader: true,
        },
        {
          start: F2_PORTALS.Z1_SIDE_GALLERY_Z[0],
          end: F2_PORTALS.Z1_SIDE_GALLERY_Z[1],
          ...F2_PORTAL_L2,
          kind: 'door',
          framed: true,
          accentHeader: true,
        },
      ],
      name: side < 0 ? 'F2_Z1_WestWall' : 'F2_Z1_EastWall',
    });

    // Zero-gap elevated portal sills bridging 0.62m partition walls
    addF2PortalSill(collector, {
      axis: 'z',
      coord,
      span: F2_PORTALS.Z1_SIDE_GALLERY_Z,
      y: y1,
      material: mats.catwalkGrate,
      name: `F2_Z1_Sill_${side < 0 ? 'W' : 'E'}_L1`,
    });
    addF2PortalSill(collector, {
      axis: 'z',
      coord,
      span: F2_PORTALS.Z1_SIDE_GALLERY_Z,
      y: y2,
      material: mats.catwalkGrate,
      name: `F2_Z1_Sill_${side < 0 ? 'W' : 'E'}_L2`,
    });
  }

  // 5. Overhead L1 (`17.1m`) & L2 (`20.2m`) Transit Overpass Bridges (`z ∈ [7.6, 11.4]`)
  addWalkableDeck(collector, {
    minX: -11.69,
    maxX: 11.69,
    minZ: F2_PORTALS.Z1_SIDE_GALLERY_Z[0],
    maxZ: F2_PORTALS.Z1_SIDE_GALLERY_Z[1],
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F2_Z1_L1_Overpass',
  });
  buildGuardrailRun(collector, mats, { x1: -11.6, z1: 7.6, x2: 11.6, z2: 7.6, y: y1, accentMat });
  buildGuardrailRun(collector, mats, { x1: -11.6, z1: 11.4, x2: 11.6, z2: 11.4, y: y1, accentMat });

  addWalkableDeck(collector, {
    minX: -11.69,
    maxX: 11.69,
    minZ: F2_PORTALS.Z1_SIDE_GALLERY_Z[0],
    maxZ: F2_PORTALS.Z1_SIDE_GALLERY_Z[1],
    y: y2,
    thickness: 0.34,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F2_Z1_L2_Overpass',
  });
  buildGuardrailRun(collector, mats, { x1: -11.6, z1: 7.6, x2: 11.6, z2: 7.6, y: y2, accentMat: mats.moltenGlow });
  buildGuardrailRun(collector, mats, { x1: -11.6, z1: 11.4, x2: 11.6, z2: 11.4, y: y2, accentMat: mats.moltenGlow });

  // 6. Opening Sealed Customs Lockdown Puzzle (Locked Gate + Unobstructed Shootable Breaker + [E] Switch!)
  buildLockedSecurityGate(collector, mats, {
    id: F2_IDS.gateCustomsSeal,
    label: 'CUSTOMS LOCKDOWN SHUTTER',
    x: 0,
    y: y0,
    z: F2_GRID.Z_CUSTOMS,
    width: 4.8,
    height: 2.65,
    spanAxis: 'x',
    lockedHint: 'CUSTOMS SEALED · SHOOT CRIMSON BREAKER ABOVE GATE OR FLIP EAST [E] OVERRIDE',
  });

  // Mounted prominently on the West Customs Gate pier at eye level (x = -3.3, y0 + 2.1): 100% clear unobstructed sightline straight from spawn!
  buildShootableLock(collector, mats, {
    id: F2_IDS.lockCustomsSeal,
    bannerText: 'CUSTOMS BREAKER SHATTERED · MAGLEV RAIL CANYON UNSEALED',
    x: -3.3,
    y: y0 + 2.1,
    z: F2_GRID.Z_CUSTOMS + 0.42,
    rotY: 0,
    unlockGateId: F2_IDS.gateCustomsSeal,
  });

  // Alternative non-combat [E] Customs Override Switch on East Gate Pier (cleanly unobstructed from spawn!)
  buildWorldSwitch(collector, mats, {
    id: F2_IDS.switchCustomsSeal,
    x: 3.3,
    y: y0,
    z: 5.2,
    rotY: 0,
    promptLocked: '[E] OVERRIDE CUSTOMS LOCKDOWN SHUTTER',
    promptActivated: 'CUSTOMS LOCKDOWN OVERRIDDEN · CANYON OPEN',
    bannerText: 'CUSTOMS LOCKDOWN RELEASED · WELCOME TO VOLTAIC METROPOLIS',
    unlockGateId: F2_IDS.gateCustomsSeal,
  });

  // 7. Industrial Customs Scanner Arches, Consoles, Gear Bays & Overhead Lighting
  const steelSpecs: BoxSpec[] = [];
  const alloySpecs: BoxSpec[] = [];
  const glowSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];

  // Twin armored scanner stanchions supporting the L1 overpass cleanly outside BOTH panoramic observation windows!
  const colH = y1 - 0.34 - (y0 + 0.006);
  for (const sx of [-9.3, 9.3]) {
    for (const sz of [7.9, 11.1]) {
      steelSpecs.push({ w: 0.48, h: colH, d: 0.48, x: sx, y: y0 + 0.006 + colH * 0.5, z: sz });
      alloySpecs.push(
        { w: 0.62, h: 0.14, d: 0.62, x: sx, y: y0 + 0.11, z: sz },
        { w: 0.62, h: 0.14, d: 0.62, x: sx, y: y1 - 0.46, z: sz }
      );
      collector.boxes.push({
        minX: sx - 0.3,
        maxX: sx + 0.3,
        minY: y0,
        maxY: y1,
        minZ: sz - 0.3,
        maxZ: sz + 0.3,
        walkableTop: false,
      });
    }
  }

  // Luminous floor guide rails leading from Arrival Bulkhead 02 straight to the Customs Shutter
  glowSpecs.push(
    { w: 0.12, h: 0.016, d: 11.4, x: -1.9, y: y0 + 0.012, z: 10.6 },
    { w: 0.12, h: 0.016, d: 11.4, x: 1.9, y: y0 + 0.012, z: 10.6 }
  );

  // Overhead industrial roof trusses & high-bay sodium light strips
  for (const lz of [6.0, 9.5, 13.8]) {
    steelSpecs.push({ w: 23.2, h: 0.42, d: 0.38, x: 0, y: y0 + ceilH - 0.25, z: lz });
    lightSpecs.push({ w: 16.0, h: 0.1, d: 0.42, x: 0, y: y0 + ceilH - 0.06, z: lz + 1.1 });
  }

  // Customs inspection consoles & armored gear wall bays
  buildTacticalConsoleBenches(
    collector,
    mats,
    [
      { x: -7.4, y: y0, z: 6.2, w: 3.4, h: 1.0, d: 1.05 },
      { x: 8.6, y: y0, z: 6.2, w: 2.6, h: 1.0, d: 1.05 },
    ],
    { accentMat, name: 'F2_Z1_CustomsConsoles' }
  );
  buildWallEquipmentBays(
    collector,
    mats,
    [
      { axis: 'z', coord: F2_GRID.X_CORE_WEST + 0.3, inwardDir: 1, centerAlong: 13.4, baseY: y0, width: 4.4, height: 2.6 },
      { axis: 'z', coord: F2_GRID.X_CORE_EAST - 0.3, inwardDir: -1, centerAlong: 13.4, baseY: y0, width: 4.4, height: 2.6 },
    ],
    { accentMat, name: 'F2_Z1_GearLockers' }
  );

  // Watertight Roof Slab (`top = 25.40m < 25.72m`!)
  const roofMesh = buildBatchedBoxesMesh(
    [{ w: 24.0, h: F2_ROOF_THICK, d: 13.0, x: 0, y: F2_ROOF_CENTER_Y, z: 10.5 }],
    mats.foundryIron,
    { receiveShadow: true, name: 'F2_Z1_RoofSlab' }
  );
  if (roofMesh) {
    group.add(roofMesh);
    collector.wallMeshes.push(roofMesh);
  }

  const steelMesh = buildBatchedBoxesMesh(steelSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F2_Z1_SteelColumns',
  });
  if (steelMesh) {
    group.add(steelMesh);
    collector.wallMeshes.push(steelMesh);
  }
  const alloyMesh = buildBatchedBoxesMesh(alloySpecs, mats.amberAlloy, { name: 'F2_Z1_AlloyCollars' });
  if (alloyMesh) detailGroup.add(alloyMesh);
  const glowMesh = buildBatchedBoxesMesh(glowSpecs, accentMat, { name: 'F2_Z1_FloorGuides' });
  if (glowMesh) detailGroup.add(glowMesh);
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F2_Z1_CeilingLights' });
  if (lightMesh) detailGroup.add(lightMesh);

  // Crisp Sector Plaque mounted cleanly ABOVE the L1/L2 gallery sightline on North wall!
  addWallStencilPlaque(group, mats, {
    code: '02-I',
    title: 'CUSTOMS AIRLOCK',
    subtitle: 'BREACH LOCKDOWN SHUTTER TO ENTER MAGLEV METROPOLIS',
    accentHex: 0xeab308,
    x: 0,
    y: y0 + 8.35,
    z: F2_GRID.Z_CUSTOMS + 0.36,
    rotY: 0,
    width: 7.4,
    height: 1.55,
  });

  // 8. Arrival Bulkhead 02 (`z = +17.0`, receiving Floor 03 South Descent Airlock Gallery!)
  const arrivalDoor = buildMassiveBulkheadDoor(group, mats, {
    floor: 2,
    x: 0,
    y: y0,
    z: F2_GRID.Z_ARRIVAL,
    rotY: Math.PI,
    width: 5.6,
    height: 5.4,
    isArrivalShutter: true,
  });
  collector.boxes.push(arrivalDoor.collider);
  collector.wallMeshes.push(...arrivalDoor.raycastMeshes);

  return arrivalDoor;
}
