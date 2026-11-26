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
import { F8_BASE_Y, F8_CEILINGS, F8_MEZZ_Y, F8_PORTALS } from './layout';

/**
 * FLOOR 08 — ZONE 2 (EAST WING): TACTICAL ARMORY, BALLISTICS OBSERVATION CORRIDOR & HEAVY ORDNANCE VAULT
 * Footprint:
 * - Armory Staging Hall: x ∈ [+13, +28], z ∈ [+33, +46]
 * - Heavy Ordnance Calibration Vault: x ∈ [+28, +36], z ∈ [+35, +45]
 * - Panoramic Ballistics Corridor & North Bypass: x ∈ [+17, +28], z ∈ [-1, +33]
 * - Elevated Observation Gallery Balcony (+4.4m): x ∈ [+17, +27.6], z ∈ [+25.8, +32.8]
 *
 * Wrapped in sub-floor `OcclusionCell` (`f8_armory_wing`) so unseen East Wing geometry culls cleanly!
 */
export function buildFloor8Zone2ArmoryWing(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry,
  accentMat: THREE.Material
): OcclusionCell {
  const baseY = F8_BASE_Y;
  const mezzY = F8_MEZZ_Y;
  const ceilH = F8_CEILINGS.armory; // 8.4m
  const warmAccent = mats.floorAccent[7]; // Warm industrial amber contrast inside Armory & Express Lift!

  const wingGroup = new THREE.Group();
  wingGroup.name = 'F8_Z2_ARMORY_WING_CELL';
  collector.group.add(wingGroup);

  // 1. Floor Slabs (Staging Hall, Express Lift Bay, Panoramic Observation Corridor)
  addWalkableDeck(collector, {
    minX: 13.0,
    maxX: 28.0,
    minZ: 33.0,
    maxZ: 46.0,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    targetGroup: wingGroup,
    name: 'F8_Z2_ArmoryStagingFloor',
  });
  addWalkableDeck(collector, {
    minX: 28.0,
    maxX: 36.0,
    minZ: 35.0,
    maxZ: 45.0,
    y: baseY,
    thickness: 0.6,
    material: mats.darkConcrete,
    targetGroup: wingGroup,
    name: 'F8_Z2_OrdnanceVaultFloor',
  });
  addWalkableDeck(collector, {
    minX: 17.0,
    maxX: 28.0,
    minZ: -1.0,
    maxZ: 33.0,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    targetGroup: wingGroup,
    name: 'F8_Z2_ObservationCorridorFloor',
  });

  // Ceilings spanning Armory, Lift Bay & Observation Corridor — flush non-overlapping slabs with ZERO z=33 seam gap!
  const ceilMesh = buildBatchedBoxesMesh(
    [
      // West Armory Staging nook (x ∈ [13.3, 17.3], z ∈ [33.3, 45.7] — sealed at z=33 by F8_Z4_SouthEastWingWall)
      { w: 4.0, h: 0.6, d: 12.4, x: 15.3, y: baseY + ceilH + 0.3, z: 39.5 },
      // Continuous East Armory + Observation Corridor roof (x ∈ [17.3, 27.7], z ∈ [-0.7, 45.7] — zero crack at z=33!)
      { w: 10.4, h: 0.6, d: 46.4, x: 22.5, y: baseY + ceilH + 0.3, z: 22.5 },
      // Heavy Ordnance Calibration Vault roof (x ∈ [28.3, 35.7], z ∈ [35.3, 44.7])
      { w: 7.4, h: 0.6, d: 9.4, x: 32.0, y: baseY + ceilH + 0.3, z: 40.0 },
    ],
    mats.darkConcrete,
    { receiveShadow: false, name: 'F8_Z2_WingCeilings' }
  );
  if (ceilMesh) wingGroup.add(ceilMesh);

  // 2. Perimeter Exterior Walls (shared walls at x=13 and x=17 are owned by Zone 1 & Zone 4 — trimmed cleanly at corners!)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: 46.0,
    spanStart: 13.3,
    spanEnd: 28.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: wingGroup,
    name: 'F8_Z2_ArmorySouthWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: 28.0,
    spanStart: 33.0,
    spanEnd: 45.7,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWallLight,
    accentMat: warmAccent,
    targetGroup: wingGroup,
    portals: [
      {
        start: 37.0,
        end: 43.0,
        bottomY: baseY,
        topY: baseY + 5.2,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
    ],
    name: 'F8_Z2_LiftDividerWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: 36.0,
    spanStart: 35.3,
    spanEnd: 44.7,
    baseY,
    height: ceilH,
    wallMat: mats.darkConcrete,
    targetGroup: wingGroup,
    name: 'F8_Z2_LiftEastWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: 45.0,
    spanStart: 28.3,
    spanEnd: 36.3,
    baseY,
    height: ceilH,
    wallMat: mats.darkConcrete,
    targetGroup: wingGroup,
    name: 'F8_Z2_LiftSouthWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: 35.0,
    spanStart: 28.3,
    spanEnd: 36.3,
    baseY,
    height: ceilH,
    wallMat: mats.darkConcrete,
    targetGroup: wingGroup,
    name: 'F8_Z2_LiftNorthWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: 28.0,
    spanStart: -0.7,
    spanEnd: 33.0,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: wingGroup,
    name: 'F8_Z2_CorridorEastWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: -1.0,
    spanStart: 17.0,
    spanEnd: 28.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat,
    targetGroup: wingGroup,
    portals: [
      {
        start: F8_PORTALS.armoryToAtriumX[0],
        end: F8_PORTALS.armoryToAtriumX[1],
        bottomY: baseY,
        topY: baseY + 4.1,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
    ],
    name: 'F8_Z2_NorthBypassPortalWall',
  });

  // Motorized proximity sliding blast door at East Armory North Bypass -> Zone 5 Security Atrium
  buildTacticalDoor(collector, mats, {
    id: 'f8_auto_armory_atrium',
    mode: 'automatic',
    x: (F8_PORTALS.armoryToAtriumX[0] + F8_PORTALS.armoryToAtriumX[1]) * 0.5,
    y: baseY,
    z: -1.0,
    width: F8_PORTALS.armoryToAtriumX[1] - F8_PORTALS.armoryToAtriumX[0],
    height: 4.1,
    spanAxis: 'x',
    targetGroup: wingGroup,
  });

  // 3. Elevated East Observation Gallery Balcony (+4.4m = 102.4m) + Millimeter-Aligned Interior Staircase!
  addWalkableDeck(collector, {
    minX: 17.32,
    maxX: 27.6,
    minZ: 25.8,
    maxZ: 32.8,
    y: mezzY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: wingGroup,
    castShadow: true,
    name: 'F8_Z2_ObservationBalcony',
  });

  // Interior Armory Staircase: climbs Southward from z=17.0 (baseY 98.0) -> z=25.8 (mezzY 102.4) flush against East wall (x=27.70)!
  // Width = 2.70m centered at x = 26.32 -> maxX = 27.67 (flush to East wall!) & minSide rail sits at EXACT x = 26.32 - (1.35 + 0.07) = 24.90!
  buildStraightStairFlight(collector, mats, {
    x: 26.32,
    z: 21.4,
    width: 2.7,
    length: 8.8,
    yStart: baseY,
    yEnd: mezzY,
    axis: 'z',
    steps: 20,
    railMinSide: true,
    railMaxSide: false,
    targetGroup: wingGroup,
    accentMat: warmAccent,
  });

  // Exact Balcony front guardrail at z=25.8: x ∈ [17.32, 24.90] -> joins stair top corner post at (24.90, mezzY, 25.8) seamlessly!
  buildGuardrailRun(collector, mats, {
    x1: 17.32,
    z1: 25.8,
    x2: 24.9,
    z2: 25.8,
    y: mezzY,
    accentMat: warmAccent,
    targetGroup: wingGroup,
  });
  // Balcony South return guardrail along z=32.8 overlooking Armory Staging Hall!
  buildGuardrailRun(collector, mats, {
    x1: 17.32,
    z1: 32.8,
    x2: 27.6,
    z2: 32.8,
    y: mezzY,
    accentMat: warmAccent,
    targetGroup: wingGroup,
  });

  // 4. Overhead Steel Trusses, Ordnance Vault Hoist Gantry, Vertical Light Conduits & Ceiling Lights
  const steelSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  const warmAccSpecs: BoxSpec[] = [];
  const hazardSpecs: BoxSpec[] = [];

  for (let z = 3.0; z <= 43.0; z += 5.0) {
    const cx = z > 33 ? 20.5 : 22.5;
    const w = z > 33 ? 14.32 : 10.32;
    steelSpecs.push({ w, h: 0.42, d: 0.36, x: cx, y: baseY + ceilH - 0.22, z });
    lightSpecs.push({ w: w * 0.62, h: 0.08, d: 0.28, x: cx, y: baseY + ceilH - 0.06, z: z + 2.5 });
  }
  // Support columns cleanly tucked at the 4 structural corners of Observation Balcony (wide clear hallways!)
  for (const [cx, cz] of [
    [17.56, 26.06],
    [24.64, 26.06],
    [17.56, 32.54],
    [27.36, 32.54],
  ] as const) {
    steelSpecs.push({ w: 0.42, h: 3.972, d: 0.42, x: cx, y: baseY + 0.004 + 1.986, z: cz });
    collector.boxes.push({
      minX: cx - 0.24,
      maxX: cx + 0.24,
      minY: baseY,
      maxY: mezzY,
      minZ: cz - 0.24,
      maxZ: cz + 0.24,
      walkableTop: false,
    });
  }
  // Heavy Ordnance Vault corner structural columns tucked neatly into all 4 room corners!
  const vaultColH = ceilH - 0.016;
  for (const lz of [35.64, 44.36]) {
    for (const lx of [28.64, 35.36]) {
      steelSpecs.push({ w: 0.58, h: vaultColH, d: 0.58, x: lx, y: baseY + 0.008 + vaultColH * 0.5, z: lz });
      const lightX = lx < 32 ? lx + 0.32 : lx - 0.32;
      warmAccSpecs.push({ w: 0.08, h: ceilH - 1.0, d: 0.08, x: lightX, y: baseY + ceilH * 0.5, z: lz });
      collector.boxes.push({
        minX: lx - 0.32,
        maxX: lx + 0.32,
        minY: baseY,
        maxY: baseY + ceilH,
        minZ: lz - 0.32,
        maxZ: lz + 0.32,
        walkableTop: false,
      });
    }
  }
  // Overhead Ordnance Hoist Bridge Gantry centered symmetrically wall-to-wall (x ∈ [28.32, 35.68])
  steelSpecs.push(
    { w: 7.36, h: 0.54, d: 0.4, x: 32.0, y: baseY + ceilH - 0.9, z: 38.6 },
    { w: 7.36, h: 0.54, d: 0.4, x: 32.0, y: baseY + ceilH - 0.9, z: 41.4 },
    { w: 2.2, h: 0.68, d: 2.36, x: 32.0, y: baseY + ceilH - 0.78, z: 40.0 }
  );
  // Vault ceiling lighting trio (central gantry light + flanking north/south recessed strips so vault reads crisp & bright!)
  lightSpecs.push(
    { w: 3.2, h: 0.1, d: 3.2, x: 32.0, y: baseY + ceilH - 1.2, z: 40.0 },
    { w: 5.4, h: 0.08, d: 0.32, x: 32.0, y: baseY + ceilH - 0.08, z: 36.8 },
    { w: 5.4, h: 0.08, d: 0.32, x: 32.0, y: baseY + ceilH - 0.08, z: 43.2 }
  );
  // Vault Portal floor hazard threshold bar
  hazardSpecs.push({ w: 0.42, h: 0.014, d: 5.5, x: 28.0, y: baseY + 0.018, z: 40.0 });
  // Corridor horizontal amber datum strip trimmed cleanly BEFORE East wall staircase (z ∈ [0.5, 16.6] — ZERO stair clipping!)
  // + floor guide line + Heavy Ordnance Vault wall accents & ammo crate calibration perimeter frame!
  warmAccSpecs.push(
    { w: 0.08, h: 0.08, d: 16.1, x: 27.64, y: baseY + 3.55, z: 8.55 },
    { w: 0.12, h: 0.012, d: 31.0, x: 21.4, y: baseY + 0.008, z: 15.0 },
    // Ordnance Vault North & South wall datum strips + glowing floor calibration frame around .50 HV reserve crate
    { w: 5.6, h: 0.08, d: 0.08, x: 32.0, y: baseY + 3.55, z: 35.34 },
    { w: 5.6, h: 0.08, d: 0.08, x: 32.0, y: baseY + 3.55, z: 44.66 },
    { w: 2.8, h: 0.012, d: 0.1, x: 32.0, y: baseY + 0.01, z: 37.5 },
    { w: 2.8, h: 0.012, d: 0.1, x: 32.0, y: baseY + 0.01, z: 39.7 },
    { w: 0.1, h: 0.012, d: 2.1, x: 30.65, y: baseY + 0.01, z: 38.6 },
    { w: 0.1, h: 0.012, d: 2.1, x: 33.35, y: baseY + 0.01, z: 38.6 }
  );

  const steelMesh = buildBatchedBoxesMesh(steelSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F8_Z2_SteelRibs',
  });
  if (steelMesh) {
    wingGroup.add(steelMesh);
    collector.wallMeshes.push(steelMesh);
  }
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, {
    name: 'F8_Z2_CeilingLights',
  });
  if (lightMesh) wingGroup.add(lightMesh);

  const warmAccMesh = buildBatchedBoxesMesh(warmAccSpecs, warmAccent, {
    name: 'F8_Z2_AmberAccents',
  });
  if (warmAccMesh) wingGroup.add(warmAccMesh);

  const hazMesh = buildBatchedBoxesMesh(hazardSpecs, mats.hazardStripe, {
    name: 'F8_Z2_LiftHazard',
  });
  if (hazMesh) wingGroup.add(hazMesh);

  // 5. Recessed Armored Weapon & Gear Storage Bays along Armory, Corridor & Heavy Ordnance Vault Walls!
  buildWallEquipmentBays(
    collector,
    mats,
    [
      // South Armory wall recessed heavy ordnance lockers
      { axis: 'x', coord: 45.7, inwardDir: -1, centerAlong: 18.2, baseY, width: 4.8, height: 3.1, depth: 0.56 },
      { axis: 'x', coord: 45.7, inwardDir: -1, centerAlong: 24.0, baseY, width: 4.6, height: 3.1, depth: 0.56 },
      // East Corridor wall recessed ballistic equipment locker bays (clear of staircase z ∈ [17, 25.8]!)
      { axis: 'z', coord: 27.7, inwardDir: -1, centerAlong: 5.5, baseY, width: 5.2, height: 3.0, depth: 0.54 },
      { axis: 'z', coord: 27.7, inwardDir: -1, centerAlong: 12.2, baseY, width: 4.8, height: 3.0, depth: 0.54 },
      // Heavy Ordnance Vault East & North wall armored rifle & calibration locker bays
      { axis: 'z', coord: 35.7, inwardDir: -1, centerAlong: 40.0, baseY, width: 5.8, height: 3.2, depth: 0.58 },
      { axis: 'x', coord: 35.3, inwardDir: 1, centerAlong: 32.0, baseY, width: 4.8, height: 3.1, depth: 0.54 },
    ],
    { targetGroup: wingGroup, accentMat: warmAccent, name: 'F8_Z2_WeaponBays' }
  );

  // 6. AAA Gunsmith Readiness Workstations & Panoramic Glass Observation Counter Desk!
  buildTacticalConsoleBenches(
    collector,
    mats,
    [
      // Armory Staging Hall gunsmith benches
      { x: 19.6, y: baseY, z: 42.6, w: 3.6, h: 0.98, d: 1.15 },
      { x: 20.6, y: baseY, z: 36.2, w: 3.2, h: 0.98, d: 1.1 },
      // Continuous Range Telemetry Observation Desk cleanly beside panoramic firing-hall glass window!
      { x: 17.92, y: baseY, z: 12.25, w: 0.95, h: 0.98, d: 10.6 },
      // Corridor North tactical checkpoint console
      { x: 23.4, y: baseY, z: 8.5, w: 2.3, h: 0.98, d: 1.15 },
      // Heavy Ordnance Vault central calibration workbench
      { x: 32.0, y: baseY, z: 42.4, w: 3.0, h: 0.98, d: 1.1 },
    ],
    { targetGroup: wingGroup, accentMat: warmAccent, name: 'F8_Z2_ArmoryConsoles' }
  );

  // 7. Crisp High-Resolution Stencil Signage (zero overlap/truncation!)
  addWallStencilPlaque(wingGroup, mats, {
    code: 'ORD-08',
    title: 'HEAVY ORDNANCE VAULT',
    subtitle: 'BALLISTIC CALIBRATION · .50 HV HEAVY AMMO RESERVE',
    accentHex: 0xf59e0b,
    x: 27.62,
    y: baseY + 6.3,
    z: 40.0,
    rotY: -Math.PI * 0.5,
    width: 5.4,
    height: 1.4,
  });
  addWallStencilPlaque(wingGroup, mats, {
    code: '08-E',
    title: 'BALLISTICS OBSERVATION',
    subtitle: 'NORTH EXTRACTION BYPASS · UPPER MEZZANINE ACCESS',
    accentHex: 0x38bdf8,
    x: 27.62,
    y: baseY + 5.0,
    z: 12.0,
    rotY: -Math.PI * 0.5,
    width: 5.4,
    height: 1.4,
  });

  // Sub-floor OcclusionCell: visible when inside East Wing OR viewing through Zone 1/4/5 eastern portals!
  return {
    id: 'f8_armory_wing',
    group: wingGroup,
    center: new THREE.Vector3(24.0, baseY + 3.0, 22.0),
    triggerBounds: {
      minX: 7.0,
      maxX: 38.0,
      minZ: -6.0,
      maxZ: 49.0,
    },
    maxViewDistance: 34.0,
  };
}
