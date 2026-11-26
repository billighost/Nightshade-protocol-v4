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
} from '../../architecture';
import {
  buildGuardrailRun,
  buildStraightStairFlight,
  type FloorGeometryCollector,
} from '../../stairs';
import { buildExplosiveBarrel } from '../../mechanics';
import {
  addF2PortalSill,
  F2_CEIL_H,
  F2_GRID,
  F2_L0_Y,
  F2_L1_Y,
  F2_L2_Y,
  F2_PORTAL_L0,
  F2_PORTAL_L1,
  F2_PORTAL_L2,
  F2_PORTALS,
  F2_ROOF_CENTER_Y,
  F2_ROOF_THICK,
  F2_TRACK_Y,
} from './layout';

/**
 * FLOOR 02 — ZONE 2 (CENTER SPINE): VOLTAIC MAGLEV RAIL CANYON
 * Footprint: x ∈ [-12, +12], z ∈ [-9.0, +4.0]
 *
 * - Completely rejects the classic open central square arena!
 * - A dramatic, towering 3-story subterranean urban Maglev Canyon split down the middle by a
 *   recessed inductive rail channel (`Y = 13.60m`, bottom `13.34m > 13.20m` Floor 01 maxY) housing a
 *   multi-part composite Armored Maglev Freight Locomotive (`NIGHTSHADE-ML02`) with glowing headlamps,
 *   tinted armored cab, burnished copper-alloy hood, and a jumpable flatbed deck (`walkableTop: true`)!
 * - Flanking East & West pedestrian arcades lead into 3-tier cruciform viaduct portals West (Zone 3
 *   Smelter Foundry), East (Zone 9 Locomotive Bay), and North (Zone 12 North Extraction).
 * - Two-Stage Stepped Ascent (`L0 14.0m -> L1 17.1m` West stair -> walk across North L1 Steel
 *   Overpass -> `L1 17.1m -> L2 20.2m` East stair -> L2 Sky-Canyon Crown Bridge!) + Rotating Overhead
 *   Holographic Rail-Signal Ring!
 */
export function buildFloor2Zone2MaglevConcourse(
  collector: FloorGeometryCollector,
  detailGroup: THREE.Group,
  mats: HideoutMaterialRegistry
): void {
  const yTrack = F2_TRACK_Y; // 13.6m
  const y0 = F2_L0_Y; // 14.0m
  const y1 = F2_L1_Y; // 17.1m
  const y2 = F2_L2_Y; // 20.2m
  const ceilH = F2_CEIL_H; // 10.9m
  const group = collector.group;
  const accentMat = mats.floorAccent[2];
  const moltenMat = mats.moltenGlow;

  // 1. L0 Flanking Pedestrian Arcades + Recessed Inductive Maglev Track Channel (`x ∈ [-3.2, +3.2], z ∈ [-6.4, +1.8]`)
  addWalkableDeck(collector, {
    minX: -12.0,
    maxX: -3.2,
    minZ: -9.0,
    maxZ: 4.0,
    y: y0,
    thickness: 0.5,
    material: mats.foundryIron,
    name: 'F2_Z2_WestArcadeDeck',
  });
  addWalkableDeck(collector, {
    minX: 3.2,
    maxX: 12.0,
    minZ: -9.0,
    maxZ: 4.0,
    y: y0,
    thickness: 0.5,
    material: mats.foundryIron,
    name: 'F2_Z2_EastArcadeDeck',
  });
  addWalkableDeck(collector, {
    minX: -3.2,
    maxX: 3.2,
    minZ: -9.0,
    maxZ: -6.4,
    y: y0,
    thickness: 0.5,
    material: mats.foundryIron,
    name: 'F2_Z2_NorthThresholdDeck',
  });
  addWalkableDeck(collector, {
    minX: -3.2,
    maxX: 3.2,
    minZ: 1.8,
    maxZ: 4.0,
    y: y0,
    thickness: 0.5,
    material: mats.foundryIron,
    name: 'F2_Z2_SouthThresholdDeck',
  });

  // Recessed Inductive Track Bed (`13.60m`, thickness `0.26m` -> bottom `13.34m > 13.20m` Floor 01 maxY!)
  // Drop is only 0.40m (< 0.48m step-up clearance), so operatives step smoothly in & out at every edge!
  addWalkableDeck(collector, {
    minX: -3.2,
    maxX: 3.2,
    minZ: -6.4,
    maxZ: 1.8,
    y: yTrack,
    thickness: 0.26,
    material: mats.darkConcrete,
    name: 'F2_Z2_MaglevTrackBed',
  });

  // Inductive copper-amber maglev rail tracks & hazard platform edges (strictly proud -> zero Z-fighting!)
  const trackRailSpecs: BoxSpec[] = [
    { w: 0.22, h: 0.08, d: 7.9, x: -1.15, y: yTrack + 0.04, z: -2.3 },
    { w: 0.22, h: 0.08, d: 7.9, x: 1.15, y: yTrack + 0.04, z: -2.3 },
  ];
  const trackGlowSpecs: BoxSpec[] = [
    { w: 0.34, h: 0.025, d: 7.7, x: 0, y: yTrack + 0.018, z: -2.3 },
    { w: 0.16, h: 0.016, d: 8.1, x: -3.32, y: y0 + 0.012, z: -2.3 },
    { w: 0.16, h: 0.016, d: 8.1, x: 3.32, y: y0 + 0.012, z: -2.3 },
  ];
  const railMesh = buildBatchedBoxesMesh(trackRailSpecs, mats.brushedMetal, { name: 'F2_Z2_MaglevRails' });
  if (railMesh) detailGroup.add(railMesh);
  const trackGlowMesh = buildBatchedBoxesMesh(trackGlowSpecs, moltenMat, { name: 'F2_Z2_MaglevCoilGlow' });
  if (trackGlowMesh) detailGroup.add(trackGlowMesh);

  // 2. HERO COMPOSITE 3D PROP: Armored Maglev Freight Locomotive (`NIGHTSHADE-ML02`)!
  const locoDarkSpecs: BoxSpec[] = [
    // Heavy main underframe chassis & rear armored freight flatbed (cleanly above maglev coil glow!)
    { w: 2.75, h: 0.42, d: 6.1, x: 0, y: yTrack + 0.25, z: -2.2 },
    { w: 3.1, h: 0.56, d: 2.55, x: 0, y: yTrack + 0.72, z: -4.05 },
    { w: 2.2, h: 0.34, d: 0.65, x: 0, y: yTrack + 0.45, z: -5.45 },
    // Tiered armored cowcatcher / rail-clearing nose wedge facing South Customs entrance
    { w: 2.94, h: 0.42, d: 0.36, x: 0, y: yTrack + 0.3, z: 1.24 },
    { w: 2.42, h: 0.28, d: 0.22, x: 0, y: yTrack + 0.22, z: 1.48 },
    // 4 Inductive Maglev Hover-Bogie Pods straddling the copper rails
    { w: 0.46, h: 0.36, d: 1.15, x: -1.32, y: yTrack + 0.24, z: -4.4 },
    { w: 0.46, h: 0.36, d: 1.15, x: 1.32, y: yTrack + 0.24, z: -4.4 },
    { w: 0.46, h: 0.36, d: 1.25, x: -1.32, y: yTrack + 0.24, z: -0.9 },
    { w: 0.46, h: 0.36, d: 1.25, x: 1.32, y: yTrack + 0.24, z: -0.9 },
    // Rooftop heavy twin exhaust shrouds & pantograph riser struts
    { w: 0.34, h: 0.42, d: 0.44, x: -0.68, y: yTrack + 2.78, z: -2.15 },
    { w: 0.34, h: 0.42, d: 0.44, x: 0.68, y: yTrack + 2.78, z: -2.15 },
    { w: 0.14, h: 0.48, d: 0.14, x: -0.82, y: yTrack + 2.8, z: -0.95 },
    { w: 0.14, h: 0.48, d: 0.14, x: 0.82, y: yTrack + 2.8, z: -0.95 },
  ];
  const locoBodySpecs: BoxSpec[] = [
    { w: 3.16, h: 1.85, d: 3.35, x: 0, y: yTrack + 1.36, z: -1.05 },
    { w: 2.86, h: 0.85, d: 0.52, x: 0, y: yTrack + 0.88, z: 0.89 },
    // Recessed angled windshield visor brow over the armored cab glass
    { w: 2.78, h: 0.18, d: 0.34, x: 0, y: yTrack + 2.2, z: 0.68 },
  ];
  const locoAlloySpecs: BoxSpec[] = [
    { w: 2.52, h: 0.28, d: 2.85, x: 0, y: yTrack + 2.43, z: -1.1 },
    // Copper-alloy rooftop pantograph collector bar
    { w: 2.1, h: 0.12, d: 0.22, x: 0, y: yTrack + 3.08, z: -0.95 },
    { w: 0.22, h: 0.92, d: 2.2, x: -1.66, y: yTrack + 1.36, z: -1.1 },
    { w: 0.22, h: 0.92, d: 2.2, x: 1.66, y: yTrack + 1.36, z: -1.1 },
    { w: 1.7, h: 0.72, d: 1.45, x: 0, y: yTrack + 1.38, z: -4.05 },
  ];
  const locoGlassSpecs: BoxSpec[] = [
    { w: 2.56, h: 0.74, d: 0.14, x: 0, y: yTrack + 1.72, z: 0.64 },
  ];
  const locoGlowSpecs: BoxSpec[] = [
    // Twin blazing forward headlamps + center nose beacon
    { w: 0.46, h: 0.24, d: 0.08, x: -0.96, y: yTrack + 0.92, z: 1.14 },
    { w: 0.46, h: 0.24, d: 0.08, x: 0.96, y: yTrack + 0.92, z: 1.14 },
    { w: 0.64, h: 0.12, d: 0.08, x: 0, y: yTrack + 2.2, z: 0.86 },
    // Flanking chassis induction telemetry bars
    { w: 0.08, h: 0.12, d: 5.4, x: -1.42, y: yTrack + 0.34, z: -2.3 },
    { w: 0.08, h: 0.12, d: 5.4, x: 1.42, y: yTrack + 0.34, z: -2.3 },
  ];
  // Cyan holographic cab instrument glow visible through the tinted windshield
  const locoCabConsoleMesh = buildBatchedBoxesMesh(
    [{ w: 1.65, h: 0.26, d: 0.18, x: 0, y: yTrack + 1.56, z: 0.44 }],
    mats.floorAccent[3],
    { name: 'F2_Z2_LocomotiveCabConsole' }
  );

  const locoDarkMesh = buildBatchedBoxesMesh(locoDarkSpecs, mats.armoredSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F2_Z2_LocomotiveChassis',
  });
  const locoBodyMesh = buildBatchedBoxesMesh(locoBodySpecs, mats.foundryIron, {
    castShadow: true,
    receiveShadow: true,
    name: 'F2_Z2_LocomotiveCab',
  });
  const locoAlloyMesh = buildBatchedBoxesMesh(locoAlloySpecs, mats.amberAlloy, {
    castShadow: true,
    receiveShadow: true,
    name: 'F2_Z2_LocomotiveTrim',
  });
  const locoGlassMesh = buildBatchedBoxesMesh(locoGlassSpecs, mats.glassPanel, {
    name: 'F2_Z2_LocomotiveWindshield',
  });
  const locoGlowMesh = buildBatchedBoxesMesh(locoGlowSpecs, accentMat, {
    name: 'F2_Z2_LocomotiveLights',
  });
  for (const m of [locoDarkMesh, locoBodyMesh, locoAlloyMesh]) {
    if (m) {
      group.add(m);
      collector.wallMeshes.push(m);
    }
  }
  if (locoCabConsoleMesh) detailGroup.add(locoCabConsoleMesh);
  if (locoGlassMesh) group.add(locoGlassMesh);
  if (locoGlowMesh) detailGroup.add(locoGlowMesh);

  // Solid 3D colliders matching locomotive cab (non-walkable high roof) & flatbed/cargo (walkable!)
  collector.boxes.push(
    {
      id: 'f2_loco_cab',
      minX: -1.72,
      maxX: 1.72,
      minY: yTrack,
      maxY: yTrack + 3.12,
      minZ: -2.75,
      maxZ: 1.58,
      walkableTop: false,
      tag: 'maglev_locomotive',
    },
    {
      id: 'f2_loco_flatbed',
      minX: -1.58,
      maxX: 1.58,
      minY: yTrack,
      maxY: yTrack + 1.0,
      minZ: -5.35,
      maxZ: -2.75,
      walkableTop: true,
      tag: 'maglev_flatbed',
    },
    {
      id: 'f2_loco_cargo',
      minX: -0.88,
      maxX: 0.88,
      minY: yTrack + 1.0,
      maxY: yTrack + 1.74,
      minZ: -4.78,
      maxZ: -3.32,
      walkableTop: true,
      tag: 'maglev_cargo',
    }
  );

  // 3. Shared Perimeter Walls owned by Zone 2:
  //    - West (`x = -12.0`, Z ∈ [-9, +4]) -> Zone 3 West Smelter Foundry (3-tier portals!)
  //    - East (`x = +12.0`, Z ∈ [-9, +4]) -> Zone 9 East Locomotive Bay (3-tier portals!)
  //    - North (`z = -9.0`, X ∈ [-12, +12]) -> Zone 12 North Extraction (L0 center, dual L1, L2 center!)
  for (const side of [-1, 1] as const) {
    const coord = side < 0 ? F2_GRID.X_CORE_WEST : F2_GRID.X_CORE_EAST;
    buildArchitecturalWall(collector, mats, {
      axis: 'z',
      coord,
      spanStart: F2_GRID.Z_CONCOURSE_NORTH + 0.3,
      spanEnd: F2_GRID.Z_CUSTOMS - 0.3,
      baseY: y0,
      height: ceilH,
      wallMat: mats.foundryIron,
      accentMat,
      portals: [
        {
          start: F2_PORTALS.Z2_SIDE_L0_Z[0],
          end: F2_PORTALS.Z2_SIDE_L0_Z[1],
          ...F2_PORTAL_L0,
          kind: 'door',
          framed: true,
          accentHeader: true,
        },
        {
          start: F2_PORTALS.Z2_SIDE_L1_Z[0],
          end: F2_PORTALS.Z2_SIDE_L1_Z[1],
          ...F2_PORTAL_L1,
          kind: 'door',
          framed: true,
          accentHeader: true,
        },
        {
          start: F2_PORTALS.Z2_SIDE_L2_Z[0],
          end: F2_PORTALS.Z2_SIDE_L2_Z[1],
          ...F2_PORTAL_L2,
          kind: 'door',
          framed: true,
          accentHeader: true,
        },
      ],
      name: side < 0 ? 'F2_Z2_WestViaductWall' : 'F2_Z2_EastViaductWall',
    });

    addF2PortalSill(collector, {
      axis: 'z',
      coord,
      span: F2_PORTALS.Z2_SIDE_L1_Z,
      y: y1,
      material: mats.catwalkGrate,
      name: `F2_Z2_Sill_${side < 0 ? 'W' : 'E'}_L1`,
    });
    addF2PortalSill(collector, {
      axis: 'z',
      coord,
      span: F2_PORTALS.Z2_SIDE_L2_Z,
      y: y2,
      material: mats.catwalkGrate,
      name: `F2_Z2_Sill_${side < 0 ? 'W' : 'E'}_L2`,
    });
  }

  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F2_GRID.Z_CONCOURSE_NORTH,
    spanStart: F2_GRID.X_CORE_WEST - 0.3,
    spanEnd: F2_GRID.X_CORE_EAST + 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.foundryIron,
    accentMat,
    portals: [
      {
        start: F2_PORTALS.Z2_Z12_L0_X[0],
        end: F2_PORTALS.Z2_Z12_L0_X[1],
        ...F2_PORTAL_L0,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F2_PORTALS.Z2_Z12_L1_WEST_X[0],
        end: F2_PORTALS.Z2_Z12_L1_WEST_X[1],
        ...F2_PORTAL_L1,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F2_PORTALS.Z2_Z12_L1_EAST_X[0],
        end: F2_PORTALS.Z2_Z12_L1_EAST_X[1],
        ...F2_PORTAL_L1,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F2_PORTALS.Z2_Z12_L2_X[0],
        end: F2_PORTALS.Z2_Z12_L2_X[1],
        ...F2_PORTAL_L2,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
    ],
    name: 'F2_Z2_NorthPartitionWall',
  });
  addF2PortalSill(collector, {
    axis: 'x',
    coord: F2_GRID.Z_CONCOURSE_NORTH,
    span: F2_PORTALS.Z2_Z12_L1_WEST_X,
    y: y1,
    material: mats.catwalkGrate,
    name: 'F2_Z2_Sill_N_L1W',
  });
  addF2PortalSill(collector, {
    axis: 'x',
    coord: F2_GRID.Z_CONCOURSE_NORTH,
    span: F2_PORTALS.Z2_Z12_L1_EAST_X,
    y: y1,
    material: mats.catwalkGrate,
    name: 'F2_Z2_Sill_N_L1E',
  });
  addF2PortalSill(collector, {
    axis: 'x',
    coord: F2_GRID.Z_CONCOURSE_NORTH,
    span: F2_PORTALS.Z2_Z12_L2_X,
    y: y2,
    material: mats.catwalkGrate,
    name: 'F2_Z2_Sill_N_L2',
  });

  // 4. LEVEL 1 (`17.1m`) SPLIT NON-OVERLAPPING U-SHAPED VIADUCT WALKWAYS + STAGE 1 STAIR (`L0 -> L1`)!
  //    Clean cutouts along `z ∈ [1.69, 3.69]` for Stage 1 (West) & Stage 2 (East) flush stairs -> ZERO deck slicing!
  addWalkableDeck(collector, {
    minX: -11.69,
    maxX: -6.4,
    minZ: -8.69,
    maxZ: 1.69,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F2_Z2_L1_WestNorthArcade',
  });
  addWalkableDeck(collector, {
    minX: -11.69,
    maxX: -9.2,
    minZ: 1.69,
    maxZ: 3.69,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F2_Z2_L1_WestStage1Landing',
  });

  addWalkableDeck(collector, {
    minX: 6.4,
    maxX: 11.69,
    minZ: -8.69,
    maxZ: 1.69,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F2_Z2_L1_EastNorthArcade',
  });
  addWalkableDeck(collector, {
    minX: 9.2,
    maxX: 11.69,
    minZ: 1.69,
    maxZ: 3.69,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F2_Z2_L1_EastStage2Landing',
  });

  addWalkableDeck(collector, {
    minX: -6.4,
    maxX: 6.4,
    minZ: -8.69,
    maxZ: -6.0,
    y: y1,
    thickness: 0.34,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F2_Z2_L1_NorthOverpass',
  });

  // L1 Guardrails (open cleanly at Stage 1 top `x = -9.2, z ∈ [1.69, 3.69]` and Stage 2 base `x = +9.2, z ∈ [1.69, 3.69]`!)
  buildGuardrailRun(collector, mats, { x1: -6.4, z1: -6.0, x2: -6.4, z2: 1.69, y: y1, accentMat });
  buildGuardrailRun(collector, mats, { x1: -9.2, z1: 1.69, x2: -6.4, z2: 1.69, y: y1, accentMat });
  buildGuardrailRun(collector, mats, { x1: 6.4, z1: -6.0, x2: 6.4, z2: 1.69, y: y1, accentMat });
  buildGuardrailRun(collector, mats, { x1: 6.4, z1: 1.69, x2: 9.2, z2: 1.69, y: y1, accentMat });
  buildGuardrailRun(collector, mats, { x1: -6.4, z1: -6.0, x2: 6.4, z2: -6.0, y: y1, accentMat });

  // STAGE 1 STAIR (`L0 14.0m -> L1 17.1m`): 100% flush against South Customs Wall (`z = 2.69`, `maxZ = 3.69`)!
  buildStraightStairFlight(collector, mats, {
    x: -6.3,
    z: 2.69,
    width: 2.0,
    length: 5.8,
    yStart: y1, // x = -9.2 -> 17.1m (West Stage 1 Landing)
    yEnd: y0, // x = -3.4 -> 14.0m (West Arcade clear of Customs Gate!)
    axis: 'x',
    railMinSide: true,
    railMaxSide: false,
    accentMat,
  });

  // 5. LEVEL 2 (`20.2m`) SKY-CANYON CROWN BRIDGE + STAGE 2 STAIR (`L1 -> L2`)!
  addWalkableDeck(collector, {
    minX: -11.69,
    maxX: 11.69,
    minZ: -4.8,
    maxZ: -0.2,
    y: y2,
    thickness: 0.34,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F2_Z2_L2_CrownBridge',
  });
  addWalkableDeck(collector, {
    minX: -2.6,
    maxX: 2.6,
    minZ: -8.69,
    maxZ: -4.8,
    y: y2,
    thickness: 0.34,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F2_Z2_L2_NorthSpur',
  });
  addWalkableDeck(collector, {
    minX: 1.2,
    maxX: 3.4,
    minZ: -0.2,
    maxZ: 3.69,
    y: y2,
    thickness: 0.34,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F2_Z2_L2_Stage2Landing',
  });

  // L2 Guardrails (open cleanly at North Spur `x ∈ [-2.6, +2.6]` and Stage 2 Landing `x ∈ [+1.2, +3.4]`!)
  buildGuardrailRun(collector, mats, { x1: -11.6, z1: -4.8, x2: -2.6, z2: -4.8, y: y2, accentMat: moltenMat });
  buildGuardrailRun(collector, mats, { x1: 2.6, z1: -4.8, x2: 11.6, z2: -4.8, y: y2, accentMat: moltenMat });
  buildGuardrailRun(collector, mats, { x1: -2.6, z1: -8.65, x2: -2.6, z2: -4.8, y: y2, accentMat: moltenMat });
  buildGuardrailRun(collector, mats, { x1: 2.6, z1: -8.65, x2: 2.6, z2: -4.8, y: y2, accentMat: moltenMat });
  buildGuardrailRun(collector, mats, { x1: -11.6, z1: -0.2, x2: 1.2, z2: -0.2, y: y2, accentMat: moltenMat });
  buildGuardrailRun(collector, mats, { x1: 3.4, z1: -0.2, x2: 11.6, z2: -0.2, y: y2, accentMat: moltenMat });
  buildGuardrailRun(collector, mats, { x1: 1.2, z1: -0.2, x2: 1.2, z2: 3.65, y: y2, accentMat: moltenMat });
  buildGuardrailRun(collector, mats, { x1: 3.4, z1: -0.2, x2: 3.4, z2: 1.69, y: y2, accentMat: moltenMat });

  // STAGE 2 STAIR (`L1 17.1m -> L2 20.2m`): 100% flush against South Customs Wall (`z = 2.69`, `maxZ = 3.69`)!
  buildStraightStairFlight(collector, mats, {
    x: 6.3,
    z: 2.69,
    width: 2.0,
    length: 5.8,
    yStart: y2, // x = +3.4 -> 20.2m (L2 Stage 2 Landing)
    yEnd: y1, // x = +9.2 -> 17.1m (East Stage 2 Landing)
    axis: 'x',
    railMinSide: true,
    railMaxSide: false,
    accentMat: moltenMat,
  });

  // 6. ROTATING OVERHEAD HOLOGRAPHIC MAGLEV SIGNAL RING + STRUCTURAL VIADUCT ARCHES
  const signalHalo = new THREE.Group();
  signalHalo.name = 'F2_Z2_MaglevSignalRing';
  signalHalo.position.set(0, y2 + 3.05, -2.5);
  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.09, 10, 36), accentMat);
  outerRing.rotation.x = Math.PI * 0.5 + 0.08;
  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.06, 8, 28), moltenMat);
  innerRing.rotation.x = Math.PI * 0.5 - 0.1;
  signalHalo.add(outerRing, innerRing);
  group.add(signalHalo);
  collector.animatedSpinners?.push({ obj: signalHalo, speed: 0.55 });

  // Viaduct Support Columns (`L0 -> L1` underside), Roof Trusses, Ceiling Lights & Roof Slab
  const steelSpecs: BoxSpec[] = [];
  const alloySpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];

  const colH = y1 - 0.34 - (y0 + 0.006);
  for (const cx of [-6.9, 6.9]) {
    for (const cz of [-5.8, -0.8]) {
      steelSpecs.push({ w: 0.56, h: colH, d: 0.56, x: cx, y: y0 + 0.006 + colH * 0.5, z: cz });
      alloySpecs.push(
        { w: 0.72, h: 0.14, d: 0.72, x: cx, y: y0 + 0.08, z: cz },
        { w: 0.72, h: 0.14, d: 0.72, x: cx, y: y1 - 0.46, z: cz }
      );
      collector.boxes.push({
        minX: cx - 0.32,
        maxX: cx + 0.32,
        minY: y0,
        maxY: y1,
        minZ: cz - 0.32,
        maxZ: cz + 0.32,
        walkableTop: false,
      });
    }
  }
  for (const lz of [-6.8, -2.5, 1.4]) {
    steelSpecs.push({ w: 23.2, h: 0.42, d: 0.38, x: 0, y: y0 + ceilH - 0.25, z: lz });
    lightSpecs.push({ w: 16.0, h: 0.1, d: 0.42, x: 0, y: y0 + ceilH - 0.06, z: lz + 0.7 });
  }

  const roofMesh = buildBatchedBoxesMesh(
    [{ w: 24.0, h: F2_ROOF_THICK, d: 13.0, x: 0, y: F2_ROOF_CENTER_Y, z: -2.5 }],
    mats.foundryIron,
    { receiveShadow: true, name: 'F2_Z2_RoofSlab' }
  );
  if (roofMesh) {
    group.add(roofMesh);
    collector.wallMeshes.push(roofMesh);
  }
  const steelMesh = buildBatchedBoxesMesh(steelSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F2_Z2_ViaductColumns',
  });
  if (steelMesh) {
    group.add(steelMesh);
    collector.wallMeshes.push(steelMesh);
  }
  const alloyMesh = buildBatchedBoxesMesh(alloySpecs, mats.amberAlloy, { name: 'F2_Z2_AlloyTrim' });
  if (alloyMesh) detailGroup.add(alloyMesh);
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F2_Z2_Lights' });
  if (lightMesh) detailGroup.add(lightMesh);

  // Tactical Jersey cover flanking the locomotive on L0 & L2 Crown Bridge
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -5.2, y: y0, z: -3.2, w: 0.86, h: 0.98, d: 2.3, walkableTop: true },
      { x: 5.2, y: y0, z: -3.2, w: 0.86, h: 0.98, d: 2.3, walkableTop: true },
      { x: -5.5, y: y2, z: -2.5, w: 0.84, h: 0.96, d: 2.0, walkableTop: true },
    ],
    { accentMat, name: 'F2_Z2_Cover' }
  );

  // Explosive Pressurized Plasma Barrels in tactical crossfire lanes
  buildExplosiveBarrel(collector, mats, { id: 'f2_barrel_z2_l0_w', x: -8.8, y: y0, z: -5.2 });
  buildExplosiveBarrel(collector, mats, { id: 'f2_barrel_z2_l2_e', x: 7.2, y: y2, z: -2.5 });

  // Crisp Sector Plaque mounted cleanly above North partition L2 portal!
  addWallStencilPlaque(group, mats, {
    code: '02-II',
    title: 'MAGLEV RAIL CANYON',
    subtitle: 'W: SMELTER FOUNDRY · E: LOCOMOTIVE BAY · NW L2: DISPATCH SPIRE',
    accentHex: 0xeab308,
    x: 0,
    y: y2 + 3.65,
    z: F2_GRID.Z_CONCOURSE_NORTH + 0.36,
    rotY: 0,
    width: 8.6,
    height: 1.4,
  });
}
