import * as THREE from 'three';
import { addWallStencilPlaque } from '../../architecture';
import {
  buildBatchedBoxesMesh,
  type BoxSpec,
  type HideoutMaterialRegistry,
} from '../../materials';
import {
  addLaneMarkerPlaque,
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
import { buildTacticalDoor } from '../../mechanics';
import type { OcclusionCell } from '../../types';
import { buildExplosiveBarrel } from '../../mechanics';
import { F8_BASE_Y, F8_CEILINGS, F8_MEZZ_Y, F8_PORTALS } from './layout';

/**
 * FLOOR 08 — ZONE 3 (WEST WING): MULTI-ROOM CQB BREACHING KILLHOUSE ("SHOOT HOUSE 08")
 * Footprint:
 * - Entry Airlock Vestibule: x ∈ [-24, -13], z ∈ [+36, +45]
 * - Main Killhouse Training Bay: x ∈ [-36, -17], z ∈ [-1, +36], Ceiling: 8.6m!
 *
 * Inspired by Call of Duty: Modern Warfare "Shoot House" / "Killhouse" & R6 Siege Hereford Base:
 * - Distinct warm ballistic composite-timber interior CQB breach walls framed in dark steel inside cool concrete bay!
 * - Corrugated tactical steel Shipping Container on the West Flank Lane + Jersey Ballistic Barricade L-Bunker
 * - Overhead Instructor Catwalk (+4.4m = 102.4m) hung from ceiling trusses via industrial steel suspension rods
 * - Millimeter-aligned West Killhouse Staircase climbing into the catwalk with zero-glitch solid handrails
 * - Wrapped in sub-floor `OcclusionCell` (`f8_killhouse_wing`) for strict AAA draw-call culling.
 */
export function buildFloor8Zone3KillhouseWing(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry,
  accentMat: THREE.Material
): OcclusionCell {
  const baseY = F8_BASE_Y;
  const mezzY = F8_MEZZ_Y;
  const ceilH = F8_CEILINGS.killhouse; // 8.6m
  const khAccent = mats.floorAccent[4]; // Tactical high-visibility orange-amber killhouse trim!

  const wingGroup = new THREE.Group();
  wingGroup.name = 'F8_Z3_KILLHOUSE_WING_CELL';
  collector.group.add(wingGroup);

  // 1. Floor Slabs & Ceiling
  addWalkableDeck(collector, {
    minX: -24.0,
    maxX: -13.0,
    minZ: 36.0,
    maxZ: 45.0,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    targetGroup: wingGroup,
    name: 'F8_Z3_EntryAirlockFloor',
  });
  addWalkableDeck(collector, {
    minX: -36.0,
    maxX: -17.0,
    minZ: -1.0,
    maxZ: 36.0,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    targetGroup: wingGroup,
    name: 'F8_Z3_KillhouseFloor',
  });

  const ceilMesh = buildBatchedBoxesMesh(
    [
      { w: 10.4, h: 0.6, d: 8.4, x: -18.5, y: baseY + ceilH + 0.3, z: 40.5 },
      { w: 18.4, h: 0.6, d: 36.4, x: -26.5, y: baseY + ceilH + 0.3, z: 17.5 },
    ],
    mats.darkConcrete,
    { receiveShadow: false, name: 'F8_Z3_WingCeilings' }
  );
  if (ceilMesh) wingGroup.add(ceilMesh);

  // 2. Outer Perimeter Shell Walls (trimmed cleanly at 90° corners for ZERO corner Z-fighting!)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: 45.0,
    spanStart: -24.3,
    spanEnd: -13.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: wingGroup,
    name: 'F8_Z3_AirlockSouthWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: -24.0,
    spanStart: 36.3,
    spanEnd: 44.7,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: wingGroup,
    name: 'F8_Z3_AirlockWestWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: 36.0,
    spanStart: -36.3,
    spanEnd: -13.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat: khAccent,
    targetGroup: wingGroup,
    portals: [
      {
        start: -23.2,
        end: -18.0,
        bottomY: baseY,
        topY: baseY + 4.0,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
    ],
    name: 'F8_Z3_KillhouseSouthWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: -36.0,
    spanStart: -0.7,
    spanEnd: 35.7,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWallLight,
    targetGroup: wingGroup,
    name: 'F8_Z3_KillhouseWestWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: -1.0,
    spanStart: -36.3,
    spanEnd: -17.0,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat,
    targetGroup: wingGroup,
    portals: [
      {
        start: F8_PORTALS.killhouseToAtriumX[0],
        end: F8_PORTALS.killhouseToAtriumX[1],
        bottomY: baseY,
        topY: baseY + 4.1,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
    ],
    name: 'F8_Z3_NorthExitWall',
  });

  // Motorized proximity sliding blast door at Killhouse North Exit -> Zone 5 Security Atrium
  buildTacticalDoor(collector, mats, {
    id: 'f8_auto_killhouse_atrium',
    mode: 'automatic',
    x: (F8_PORTALS.killhouseToAtriumX[0] + F8_PORTALS.killhouseToAtriumX[1]) * 0.5,
    y: baseY,
    z: -1.0,
    width: F8_PORTALS.killhouseToAtriumX[1] - F8_PORTALS.killhouseToAtriumX[0],
    height: 4.1,
    spanAxis: 'x',
    targetGroup: wingGroup,
  });

  // 3. INTERIOR CQB SHOOTHOUSE PARTITION WALLS (3.2m tall, warm ballistic-composite panels vs cool concrete shell!)
  const partH = 3.2;
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: 26.8,
    spanStart: -31.0,
    spanEnd: -17.3,
    baseY,
    height: partH,
    thickness: 0.36,
    wallMat: mats.ballisticPanel,
    targetGroup: wingGroup,
    portals: [
      { start: -28.8, end: -25.4, bottomY: baseY, topY: baseY + 2.7, kind: 'door', framed: true },
      { start: -21.8, end: -18.8, bottomY: baseY, topY: baseY + 2.7, kind: 'door', framed: true },
    ],
    name: 'F8_Z3_BreachWallSouth',
  });

  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: -23.0,
    spanStart: 5.7,
    spanEnd: 20.0,
    baseY,
    height: partH,
    thickness: 0.36,
    wallMat: mats.ballisticPanel,
    targetGroup: wingGroup,
    portals: [
      { start: 7.2, end: 10.4, bottomY: baseY, topY: baseY + 2.7, kind: 'door', framed: true },
      { start: 12.2, end: 16.4, bottomY: baseY + 1.05, topY: baseY + 2.35, kind: 'window', framed: true },
    ],
    name: 'F8_Z3_EastRoomPartition',
  });

  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: 5.5,
    spanStart: -31.0,
    spanEnd: -22.82,
    baseY,
    height: partH,
    thickness: 0.36,
    wallMat: mats.ballisticPanel,
    targetGroup: wingGroup,
    portals: [
      { start: -28.6, end: -25.2, bottomY: baseY, topY: baseY + 2.7, kind: 'door', framed: true },
    ],
    name: 'F8_Z3_NorthChokeWall',
  });

  // Heavy dark-steel top capping channels & grounded corner posts (clean butt joints — ZERO floor poke or corner Z-fighting!)
  const postCapH = partH - 0.028;
  const shoothouseTrimSpecs: BoxSpec[] = [
    { w: 13.8, h: 0.14, d: 0.44, x: -24.15, y: baseY + partH + 0.076, z: 26.8 },
    { w: 0.44, h: 0.14, d: 14.3, x: -23.0, y: baseY + partH + 0.076, z: 12.88 },
    { w: 7.9, h: 0.14, d: 0.44, x: -27.18, y: baseY + partH + 0.076, z: 5.5 },
    // Steel vertical corner posts cleanly grounded (minY = baseY + 0.008) & stopping cleanly under top capping channels
    { w: 0.46, h: postCapH, d: 0.46, x: -31.0, y: baseY + 0.008 + postCapH * 0.5, z: 26.8 },
    { w: 0.46, h: postCapH, d: 0.46, x: -23.0, y: baseY + 0.008 + postCapH * 0.5, z: 20.0 },
    { w: 0.46, h: postCapH, d: 0.46, x: -31.0, y: baseY + 0.008 + postCapH * 0.5, z: 5.5 },
  ];
  for (const [px, pz] of [
    [-31.0, 26.8],
    [-23.0, 20.0],
    [-31.0, 5.5],
  ] as const) {
    collector.boxes.push({
      minX: px - 0.24,
      maxX: px + 0.24,
      minY: baseY,
      maxY: baseY + partH + 0.14,
      minZ: pz - 0.24,
      maxZ: pz + 0.24,
      walkableTop: false,
    });
  }
  const shoothouseCapMesh = buildBatchedBoxesMesh(shoothouseTrimSpecs, mats.armoredSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F8_Z3_BreachWallSteelCaps',
  });
  if (shoothouseCapMesh) wingGroup.add(shoothouseCapMesh);

  // Breach threshold hazard strips trimmed cleanly inside door jambs & raised above floor guide stripes!
  const breachHazMesh = buildBatchedBoxesMesh(
    [
      { w: 2.9, h: 0.014, d: 0.36, x: -27.1, y: baseY + 0.018, z: 26.8 },
      { w: 2.5, h: 0.014, d: 0.36, x: -20.3, y: baseY + 0.018, z: 26.8 },
      { w: 0.36, h: 0.014, d: 2.7, x: -23.0, y: baseY + 0.018, z: 8.8 },
      { w: 2.9, h: 0.014, d: 0.36, x: -26.9, y: baseY + 0.018, z: 5.5 },
      { w: 4.6, h: 0.014, d: 0.36, x: -20.6, y: baseY + 0.018, z: 36.0 },
    ],
    mats.hazardStripe,
    { name: 'F8_Z3_BreachThresholdHazard' }
  );
  if (breachHazMesh) wingGroup.add(breachHazMesh);

  // Crisp CQB Breach Room Designation Plaques ("ALPHA", "BRAVO") above breach doors!
  addLaneMarkerPlaque(wingGroup, mats, {
    label: 'ALPHA',
    accentHex: 0xf97316,
    x: -27.1,
    y: baseY + 3.08,
    z: 27.08,
    rotY: 0,
    width: 1.5,
    height: 0.48,
  });
  addLaneMarkerPlaque(wingGroup, mats, {
    label: 'BRAVO',
    accentHex: 0xf97316,
    x: -20.3,
    y: baseY + 3.08,
    z: 27.08,
    rotY: 0,
    width: 1.5,
    height: 0.48,
  });

  // 4. OVERHEAD INSTRUCTOR CATWALK (+4.4m = 102.4m) + MILLIMETER-ALIGNED KILLHOUSE STAIRCASE!
  addWalkableDeck(collector, {
    minX: -35.68,
    maxX: -17.32,
    minZ: 20.0,
    maxZ: 24.4,
    y: mezzY,
    thickness: 0.4,
    material: mats.catwalkGrate,
    targetGroup: wingGroup,
    castShadow: true,
    name: 'F8_Z3_InstructorBridge',
  });
  addWalkableDeck(collector, {
    minX: -35.68,
    maxX: -32.2,
    minZ: 6.0,
    maxZ: 20.0,
    y: mezzY,
    thickness: 0.4,
    material: mats.catwalkGrate,
    targetGroup: wingGroup,
    castShadow: true,
    name: 'F8_Z3_InstructorNorthSpur',
  });

  // Killhouse West Staircase: climbs Northward from z=33.2 (baseY 98.0) -> z=24.4 (mezzY 102.4) flush against West wall (x=-35.70)!
  // Width = 2.70m centered at x = -34.32 -> minX = -35.67 (flush to West wall!) & maxSide rail sits at EXACT x = -34.32 + (1.35 + 0.07) = -32.90!
  buildStraightStairFlight(collector, mats, {
    x: -34.32,
    z: 28.8,
    width: 2.7,
    length: 8.8,
    yStart: mezzY,
    yEnd: baseY,
    axis: 'z',
    steps: 20,
    railMinSide: false,
    railMaxSide: true,
    targetGroup: wingGroup,
    accentMat: khAccent,
  });

  // Mathematically Exact Catwalk Guardrails joining stair corner post at (-32.90, mezzY, 24.4) seamlessly!
  buildGuardrailRun(collector, mats, {
    x1: -32.9,
    z1: 24.4,
    x2: -17.32,
    z2: 24.4,
    y: mezzY,
    accentMat: khAccent,
    targetGroup: wingGroup,
  });
  buildGuardrailRun(collector, mats, {
    x1: -32.2,
    z1: 20.0,
    x2: -17.32,
    z2: 20.0,
    y: mezzY,
    accentMat: khAccent,
    targetGroup: wingGroup,
  });
  buildGuardrailRun(collector, mats, {
    x1: -32.2,
    z1: 6.0,
    x2: -32.2,
    z2: 20.0,
    y: mezzY,
    accentMat: khAccent,
    targetGroup: wingGroup,
  });
  buildGuardrailRun(collector, mats, {
    x1: -35.68,
    z1: 6.0,
    x2: -32.2,
    z2: 6.0,
    y: mezzY,
    accentMat: khAccent,
    targetGroup: wingGroup,
  });

  // 5. Overhead Steel Trusses, Grounded Structural Catwalk Columns & Shoothouse Lights (ZERO floating hanger poles!)
  const steelSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  const accSpecs: BoxSpec[] = [];

  for (let z = 3.0; z <= 33.0; z += 6.0) {
    // Trimmed 4cm inside West (-35.7) and East (-17.3) wall faces — ZERO wall-truss coplanar Z-fighting!
    steelSpecs.push({ w: 18.32, h: 0.42, d: 0.36, x: -26.5, y: baseY + ceilH - 0.22, z });
    lightSpecs.push({ w: 12.0, h: 0.08, d: 0.3, x: -26.5, y: baseY + ceilH - 0.06, z: z + 3.0 });
  }
  lightSpecs.push({ w: 6.5, h: 0.08, d: 0.32, x: -18.5, y: baseY + ceilH - 0.06, z: 40.5 });

  // 5 grounded, logical structural support columns squarely on floor (98.0) supporting the underside of Instructor Catwalk (102.0)!
  // Tucked cleanly at structural corners & wall edge — ZERO floating rods and ZERO awkward pillars blocking CQB breach lanes!
  for (const [sx, sz] of [
    [-32.42, 6.22],
    [-32.42, 20.22],
    [-32.42, 24.18],
    [-17.56, 20.22],
    [-17.56, 24.18],
  ] as const) {
    steelSpecs.push({ w: 0.4, h: 3.992, d: 0.4, x: sx, y: baseY + 0.004 + 1.996, z: sz });
    collector.boxes.push({
      minX: sx - 0.24,
      maxX: sx + 0.24,
      minY: baseY,
      maxY: mezzY,
      minZ: sz - 0.24,
      maxZ: sz + 0.24,
      walkableTop: false,
    });
  }

  // Tactical floor course guidance stripes cleanly broken at walls, barricades & breach thresholds (ZERO overlaps!)
  accSpecs.push(
    { w: 0.1, h: 0.012, d: 5.2, x: -26.8, y: baseY + 0.008, z: 2.5 },
    { w: 0.1, h: 0.012, d: 4.8, x: -26.8, y: baseY + 0.008, z: 8.2 },
    { w: 0.1, h: 0.012, d: 9.8, x: -26.8, y: baseY + 0.008, z: 21.5 },
    { w: 5.0, h: 0.012, d: 0.1, x: -20.1, y: baseY + 0.008, z: 13.5 },
    // West wall datum strip trimmed cleanly BEFORE West staircase (z ∈ [0.8, 24.0] — ZERO stair clipping!)
    { w: 0.08, h: 0.08, d: 23.2, x: -35.64, y: baseY + 2.5, z: 12.4 }
  );

  const steelMesh = buildBatchedBoxesMesh(steelSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F8_Z3_KillhouseSteel',
  });
  if (steelMesh) {
    wingGroup.add(steelMesh);
    collector.wallMeshes.push(steelMesh);
  }
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, {
    name: 'F8_Z3_KillhouseLights',
  });
  if (lightMesh) wingGroup.add(lightMesh);

  const accMesh = buildBatchedBoxesMesh(accSpecs, khAccent, { name: 'F8_Z3_KillhouseAccents' });
  if (accMesh) wingGroup.add(accMesh);

  // 6. Authentic CoD Shoot House Corrugated Tactical Shipping Container + Jersey Ballistic Barricades!
  buildShippingContainer(collector, mats, {
    x: -33.2,
    y: baseY,
    z: 14.2,
    w: 2.8,
    h: 2.55,
    d: 6.2,
    targetGroup: wingGroup,
    name: 'F8_Z3_ShippingContainer',
  });

  buildJerseyBarricades(
    collector,
    mats,
    [
      // Central Killzone vaultable L-bunker
      { x: -27.2, y: baseY, z: 14.5, w: 3.2, h: 1.0, d: 1.05, walkableTop: true },
      { x: -28.4, y: baseY, z: 16.5, w: 1.05, h: 1.0, d: 2.8, walkableTop: true },
      // South Breach Room tactical cover
      { x: -25.2, y: baseY, z: 31.4, w: 2.5, h: 1.0, d: 1.05, walkableTop: true },
      { x: -20.2, y: baseY, z: 30.8, w: 2.0, h: 1.0, d: 1.1, walkableTop: true },
      // East Shoothouse Room interior cover
      { x: -19.8, y: baseY, z: 17.5, w: 2.2, h: 0.98, d: 0.95, walkableTop: true },
    ],
    { targetGroup: wingGroup, accentMat: mats.hazardStripe, name: 'F8_Z3_ShoothouseBarricades' }
  );

  // 7. Interactive Pressurized Explosive Plasma Barrels placed cleanly inside CQB breach lanes!
  buildExplosiveBarrel(collector, mats, {
    id: 'f8_barrel_kh_alpha',
    x: -29.8,
    y: baseY,
    z: 31.4,
    targetGroup: wingGroup,
  });
  buildExplosiveBarrel(collector, mats, {
    id: 'f8_barrel_kh_mid1',
    x: -25.6,
    y: baseY,
    z: 13.8,
    targetGroup: wingGroup,
  });
  buildExplosiveBarrel(collector, mats, {
    id: 'f8_barrel_kh_mid2',
    x: -28.4,
    y: baseY,
    z: 10.6,
    targetGroup: wingGroup,
  });
  buildExplosiveBarrel(collector, mats, {
    id: 'f8_barrel_kh_east',
    x: -19.6,
    y: baseY,
    z: 14.0,
    targetGroup: wingGroup,
  });

  // Crisp High-Resolution Stencil Signage (raised cleanly ABOVE catwalk handrail sightline — ZERO obstruction!)
  addWallStencilPlaque(wingGroup, mats, {
    code: 'KH-08',
    title: 'SHOOT HOUSE 08 · CQB',
    subtitle: 'BREACH LANES · INSTRUCTOR CATWALK · NORTH EXIT',
    accentHex: 0xf97316,
    x: -35.62,
    y: baseY + 6.95,
    z: 14.5,
    rotY: Math.PI * 0.5,
    width: 6.4,
    height: 1.55,
  });
  addWallStencilPlaque(wingGroup, mats, {
    code: 'EXIT',
    title: 'NORTH SECURITY ATRIUM',
    subtitle: 'WEST FLANK TO BULKHEAD 08',
    accentHex: 0x06b6d4,
    x: -20.7,
    y: baseY + 5.2,
    z: -0.64,
    rotY: 0,
    width: 5.0,
    height: 1.35,
  });

  // Sub-floor OcclusionCell: visible when inside West Wing OR viewing through Zone 1/4/5 western portals!
  return {
    id: 'f8_killhouse_wing',
    group: wingGroup,
    center: new THREE.Vector3(-26.0, baseY + 3.0, 18.0),
    triggerBounds: {
      minX: -38.0,
      maxX: -7.0,
      minZ: -6.0,
      maxZ: 47.0,
    },
    maxViewDistance: 34.0,
  };
}
