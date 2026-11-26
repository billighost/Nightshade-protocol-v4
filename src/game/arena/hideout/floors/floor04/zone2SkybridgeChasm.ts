import * as THREE from 'three';
import { addWallStencilPlaque } from '../../architecture';
import {
  buildBatchedBoxesMesh,
  buildInstancedBoxes,
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
import { buildTacticalDoor } from '../../mechanics';
import {
  buildExplosiveBarrel,
  buildJumpPad,
  buildRetractableBridge,
  buildShootableLock,
  buildWorldSwitch,
} from '../../mechanics';
import {
  F4_BASE_Y,
  F4_CEILINGS,
  F4_CHASM_Y,
  F4_IDS,
  F4_MID_Y,
  F4_PORTALS,
  F4_UPPER_Y,
  F4_WALLS,
} from './layout';

/**
 * FLOOR 04 — ZONE 2 (CENTER HERO): THE CRISS-CROSS CABLE-STAYED SKYBRIDGE CHASM
 * Footprint: x ∈ [-18, +18] (36m wide) × z ∈ [-17, +17] (34m deep), 13.0m tall from Chasm Floor (39.6m -> 52.6m)!
 *
 * Halo (Forerunner Vertical Chasm) × CoD (Cable-Stayed Hydro Dam Canyon) Centerpiece:
 * - Deep Illuminated Hydro-Thermal Abyssal Chasm (`y = 39.6m`, `x ∈ [-11.4, +11.4], z ∈ [-10.8, +10.8]`)
 *   with ZERO-Z-fighting stepped retaining cliffs (strictly stopping beneath 0.6m promenade slabs!),
 *   translucent cyan hydro-sluice center channel & 3 Kinetic Rotating Abyssal Vent Turbines!
 * - 4-Elevation Criss-Cross Skybridge Matrix:
 *   1) Layer 0 (`y = 39.6m`): Illuminated Chasm Sluice Floor + Stepping Monoliths
 *   2) Layer 1 (`y = 42.0m`): Main North-South Armored Spine Bridge (`x ∈ [-2.2, +2.2]`) with glass center inlay
 *   3) Layer 2 (`y = 44.4m`): South Transverse Cable-Stayed Skybridge (`z ∈ [+3.0, +6.2]`, 2.06m clear headroom under!)
 *   4) Layer 3 (`y = 46.4m`): 27.2m Retractable North High Sniper Skybridge (`f4_bridge_chasm_high`, `z = -4.6`)
 *      deployable via `[E]` switch on West Suspension Tower OR sniping the crimson Relay Lock on the Central Arch!
 * - Full West & East Canyon Switchback Staircases (`42.0 -> 44.4 -> 46.4m`) + Twin Flush Chasm Stairs (`42.0 -> 39.6m`)!
 * - Twin Calibrated Pneumatic Jump Pads (`f4_pad_chasm_west`, `f4_pad_chasm_east`) launching cleanly to `46.4m`!
 * - Twin Colossal Overhead Counter-Rotating Gyroscopic Wind-Tension Turbines suspended from the Steel Cable Arch!
 */
export function buildFloor4Zone2SkybridgeChasm(
  collector: FloorGeometryCollector,
  detailGroup: THREE.Group,
  mats: HideoutMaterialRegistry
): void {
  const chasmY = F4_CHASM_Y; // 39.6m
  const baseY = F4_BASE_Y; // 42.0m
  const midY = F4_MID_Y; // 44.4m
  const upperY = F4_UPPER_Y; // 46.4m
  const ceilH = F4_CEILINGS.canyon; // 10.6m (ceilY = 52.6m)
  const accentMat = mats.floorAccent[4]; // Volcanic amber-orange!
  const hydroMat = mats.floorAccent[6]; // Crisp hydro-coolant cyan!
  const group = collector.group;

  // 1. SINGLE CONTINUOUS CANYON VAULTED CEILING SLAB covering Zones 1, 2 & 9 (`x ∈ [-17.7, +17.7], z ∈ [-16.7, +16.7]`, top = 52.65m!)
  const ceilMesh = buildBatchedBoxesMesh(
    [{ w: 35.4, h: 0.5, d: 33.4, x: 0, y: baseY + ceilH + 0.25, z: 0 }],
    mats.darkConcrete,
    { receiveShadow: false, name: 'F4_CanyonCeiling' }
  );
  if (ceilMesh) group.add(ceilMesh);

  // 2. Shared Canyon West & East Perimeter Walls (`x = ±18.0`, `z ∈ [-16.7, +16.7]`) with ALL 6 stacked portals per side!
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F4_WALLS.canyonWestX,
    spanStart: F4_WALLS.canyonNorthZ + 0.3,
    spanEnd: F4_WALLS.canyonSouthZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat,
    portals: [
      { start: F4_PORTALS.westNorthGroundZ[0], end: F4_PORTALS.westNorthGroundZ[1], bottomY: baseY, topY: baseY + 4.0, kind: 'door', framed: true, accentHeader: true },
      { start: F4_PORTALS.westNorthUpperZ[0], end: F4_PORTALS.westNorthUpperZ[1], bottomY: upperY, topY: upperY + 3.6, kind: 'door', framed: true, accentHeader: true },
      { start: F4_PORTALS.westMidUpperZ[0], end: F4_PORTALS.westMidUpperZ[1], bottomY: upperY, topY: upperY + 3.6, kind: 'door', framed: true, accentHeader: true },
      { start: F4_PORTALS.westMidGroundZ[0], end: F4_PORTALS.westMidGroundZ[1], bottomY: baseY, topY: baseY + 4.0, kind: 'door', framed: true, accentHeader: true },
      { start: F4_PORTALS.westSouthGroundZ[0], end: F4_PORTALS.westSouthGroundZ[1], bottomY: baseY, topY: baseY + 4.0, kind: 'door', framed: true, accentHeader: true },
      { start: F4_PORTALS.westSouthUpperZ[0], end: F4_PORTALS.westSouthUpperZ[1], bottomY: upperY, topY: upperY + 3.6, kind: 'door', framed: true, accentHeader: true },
    ],
    name: 'F4_Z2_CanyonWestWall',
  });

  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F4_WALLS.canyonEastX,
    spanStart: F4_WALLS.canyonNorthZ + 0.3,
    spanEnd: F4_WALLS.canyonSouthZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat,
    portals: [
      { start: F4_PORTALS.eastNorthGroundZ[0], end: F4_PORTALS.eastNorthGroundZ[1], bottomY: baseY, topY: baseY + 4.0, kind: 'door', framed: true, accentHeader: true },
      { start: F4_PORTALS.eastNorthUpperZ[0], end: F4_PORTALS.eastNorthUpperZ[1], bottomY: upperY, topY: upperY + 3.6, kind: 'door', framed: true, accentHeader: true },
      { start: F4_PORTALS.eastMidUpperZ[0], end: F4_PORTALS.eastMidUpperZ[1], bottomY: upperY, topY: upperY + 3.6, kind: 'door', framed: true, accentHeader: true },
      { start: F4_PORTALS.eastMidGroundZ[0], end: F4_PORTALS.eastMidGroundZ[1], bottomY: baseY, topY: baseY + 4.0, kind: 'door', framed: true, accentHeader: true },
      { start: F4_PORTALS.eastSouthGroundZ[0], end: F4_PORTALS.eastSouthGroundZ[1], bottomY: baseY, topY: baseY + 4.0, kind: 'door', framed: true, accentHeader: true },
      { start: F4_PORTALS.eastSouthUpperZ[0], end: F4_PORTALS.eastSouthUpperZ[1], bottomY: upperY, topY: upperY + 3.6, kind: 'door', framed: true, accentHeader: true },
    ],
    name: 'F4_Z2_CanyonEastWall',
  });

  // 5 Motorized Proximity Sliding Doors connecting Canyon <-> Outer Wings (6th portal NW ground has Locked Substation Gate!)
  const autoDoors: Array<{ id: string; x: number; span: readonly [number, number] }> = [
    { id: 'f4_auto_canyon_hydro', x: F4_WALLS.canyonWestX, span: F4_PORTALS.westMidGroundZ },
    { id: 'f4_auto_canyon_geo', x: F4_WALLS.canyonWestX, span: F4_PORTALS.westSouthGroundZ },
    { id: 'f4_auto_canyon_overwatch', x: F4_WALLS.canyonEastX, span: F4_PORTALS.eastNorthGroundZ },
    { id: 'f4_auto_canyon_foundry', x: F4_WALLS.canyonEastX, span: F4_PORTALS.eastMidGroundZ },
    { id: 'f4_auto_canyon_freight', x: F4_WALLS.canyonEastX, span: F4_PORTALS.eastSouthGroundZ },
  ];
  for (const ad of autoDoors) {
    buildTacticalDoor(collector, mats, {
      id: ad.id,
      mode: 'automatic',
      x: ad.x,
      y: baseY,
      z: (ad.span[0] + ad.span[1]) * 0.5,
      width: ad.span[1] - ad.span[0],
      height: 4.0,
      spanAxis: 'z',
    });
  }

  // 3. MAIN CLIFF PROMENADES (`y = 42.0m`) + SUNKEN HYDRO-THERMAL CHASM FLOOR (`y = 39.6m`)
  addWalkableDeck(collector, {
    minX: -18.0,
    maxX: -11.4,
    minZ: -10.8,
    maxZ: 10.8,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    name: 'F4_Z2_WestCliffPromenade',
  });
  addWalkableDeck(collector, {
    minX: 11.4,
    maxX: 18.0,
    minZ: -10.8,
    maxZ: 10.8,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    name: 'F4_Z2_EastCliffPromenade',
  });
  addWalkableDeck(collector, {
    minX: -11.4,
    maxX: 11.4,
    minZ: -10.8,
    maxZ: 10.8,
    y: chasmY,
    thickness: 0.6,
    material: mats.darkConcrete,
    name: 'F4_Z2_AbyssChasmFloor',
  });

  // ZERO-Z-FIGHTING CHASM RETAINING CLIFFS strictly underneath the 0.6m cliff decks (`y = 39.604 .. 41.396`)!
  // Widths & depths trimmed cleanly at corners (`±11.4`, `±10.8`) -> ZERO coplanar face overlap!
  const cliffBotY = chasmY + 0.004;
  const cliffTopY = baseY - 0.604;
  const cliffH = cliffTopY - cliffBotY; // 1.792m
  const cliffMidY = (cliffBotY + cliffTopY) * 0.5;
  const chasmCliffMesh = buildBatchedBoxesMesh(
    [
      { w: 22.8, h: cliffH, d: 0.48, x: 0, y: cliffMidY, z: -11.04 },
      { w: 22.8, h: cliffH, d: 0.48, x: 0, y: cliffMidY, z: 11.04 },
      { w: 0.48, h: cliffH, d: 21.6, x: -11.64, y: cliffMidY, z: 0 },
      { w: 0.48, h: cliffH, d: 21.6, x: 11.64, y: cliffMidY, z: 0 },
    ],
    mats.concreteWall,
    { receiveShadow: true, name: 'F4_Z2_ChasmRetainingCliffs' }
  );
  if (chasmCliffMesh) {
    group.add(chasmCliffMesh);
    collector.wallMeshes.push(chasmCliffMesh);
  }
  collector.boxes.push(
    { minX: -11.9, maxX: 11.9, minY: chasmY, maxY: baseY - 0.04, minZ: -11.3, maxZ: -10.8, walkableTop: false },
    { minX: -11.9, maxX: 11.9, minY: chasmY, maxY: baseY - 0.04, minZ: 10.8, maxZ: 11.3, walkableTop: false },
    { minX: -11.9, maxX: -11.4, minY: chasmY, maxY: baseY - 0.04, minZ: -10.8, maxZ: 10.8, walkableTop: false },
    { minX: 11.4, maxX: 11.9, minY: chasmY, maxY: baseY - 0.04, minZ: -10.8, maxZ: 10.8, walkableTop: false }
  );

  // Illuminated Abyssal Hydro-Thermal Sluice Channel + Non-Overlapping Amber Chasm Conduit Rails
  // (trimmed cleanly around West Chasm Stair `z ∈ [-10.8, -5.6]` & East Chasm Stair `z ∈ [+5.6, +10.8]`!)
  const chasmAmberGlow = buildBatchedBoxesMesh(
    [
      { w: 19.6, h: 0.06, d: 0.06, x: 1.45, y: chasmY + 0.46, z: -10.74 },
      { w: 19.6, h: 0.06, d: 0.06, x: -1.45, y: chasmY + 0.46, z: 10.74 },
      { w: 0.06, h: 0.06, d: 15.8, x: -11.34, y: chasmY + 0.46, z: 2.65 },
      { w: 0.06, h: 0.06, d: 15.8, x: 11.34, y: chasmY + 0.46, z: -2.65 },
      // Lateral thermal vent strips across chasm floor (`y = chasmY + 0.018`)
      { w: 18.0, h: 0.02, d: 0.16, x: 0, y: chasmY + 0.018, z: -6.2 },
      { w: 18.0, h: 0.02, d: 0.16, x: 0, y: chasmY + 0.018, z: 0.0 },
      { w: 18.0, h: 0.02, d: 0.16, x: 0, y: chasmY + 0.018, z: 6.2 },
    ],
    accentMat,
    { name: 'F4_Z2_ChasmAmberConduits' }
  );
  if (chasmAmberGlow) detailGroup.add(chasmAmberGlow);

  // Translucent Cyan Hydro-Coolant Sluice Spine running N-S down center of Chasm Floor (`y = chasmY + 0.034`)
  // + 4 Illuminated Hydro-Cascade Spillways pouring vertically down the West & East retaining cliffs!
  const hydroCascadeSpecs: BoxSpec[] = [
    { w: 2.6, h: 0.022, d: 20.6, x: 0, y: chasmY + 0.034, z: 0 },
  ];
  const cascadeSpoutSpecs: BoxSpec[] = [];
  const cascadeGlowSpecs: BoxSpec[] = [];
  for (const sgn of [-1, 1] as const) {
    for (const cz of [-3.2, 3.2]) {
      // Recessed steel discharge nozzle tucked cleanly under promenade deck lip
      cascadeSpoutSpecs.push({ w: 0.34, h: 0.26, d: 1.48, x: sgn * 11.24, y: baseY - 0.52, z: cz });
      // Translucent cyan waterfall sheet pouring cleanly proud of retaining cliff (`±11.30`, zero Z-fighting!)
      hydroCascadeSpecs.push({ w: 0.06, h: cliffH - 0.02, d: 1.16, x: sgn * 11.3, y: cliffMidY, z: cz });
      // Glowing cyan catch-basin shimmer pad at chasm floor base
      cascadeGlowSpecs.push({ w: 0.92, h: 0.024, d: 1.46, x: sgn * 10.82, y: chasmY + 0.022, z: cz });
    }
  }
  const sluiceMesh = buildBatchedBoxesMesh(hydroCascadeSpecs, mats.floorGlass, {
    name: 'F4_Z2_HydroSluiceAndCascades',
  });
  if (sluiceMesh) detailGroup.add(sluiceMesh);
  const spoutMesh = buildBatchedBoxesMesh(cascadeSpoutSpecs, mats.armoredSteel, {
    name: 'F4_Z2_CascadeSpouts',
  });
  if (spoutMesh) detailGroup.add(spoutMesh);
  const cascadeGlowMesh = buildBatchedBoxesMesh(cascadeGlowSpecs, hydroMat, {
    name: 'F4_Z2_CascadeCatchGlow',
  });
  if (cascadeGlowMesh) detailGroup.add(cascadeGlowMesh);

  // Color-Coded Non-Overlapping Floor Wayfinding Trails along West (Hydro Cyan) & East (Tram Amber) Cliff Promenades!
  const westTrailMesh = buildBatchedBoxesMesh(
    [{ w: 0.26, h: 0.016, d: 19.2, x: -14.8, y: baseY + 0.014, z: 0 }],
    hydroMat,
    { name: 'F4_Z2_WestWayfindingTrail' }
  );
  if (westTrailMesh) detailGroup.add(westTrailMesh);
  const eastTrailMesh = buildBatchedBoxesMesh(
    [{ w: 0.26, h: 0.016, d: 19.2, x: 14.8, y: baseY + 0.014, z: 0 }],
    accentMat,
    { name: 'F4_Z2_EastWayfindingTrail' }
  );
  if (eastTrailMesh) detailGroup.add(eastTrailMesh);

  // 3 Kinetic Rotating Abyssal Sluice Vent Turbines embedded smoothly along the Chasm floor centerline!
  for (let i = 0; i < 3; i++) {
    const vz = -6.2 + i * 6.2;
    const ventGroup = new THREE.Group();
    ventGroup.name = `F4_Z2_AbyssTurbine_${i}`;
    ventGroup.position.set(0, chasmY + 0.09, vz);
    const bladeMesh = buildBatchedBoxesMesh(
      [
        { w: 2.1, h: 0.04, d: 0.24, x: 0, y: 0, z: 0 },
        { w: 0.24, h: 0.04, d: 2.1, x: 0, y: 0.008, z: 0 },
      ],
      mats.structuralSteel,
      { name: `F4_Z2_AbyssBlades_${i}` }
    );
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.14, 14), hydroMat);
    if (bladeMesh) ventGroup.add(bladeMesh);
    ventGroup.add(hub);
    detailGroup.add(ventGroup);
    collector.animatedSpinners?.push({ obj: ventGroup, speed: i % 2 === 0 ? 1.65 : -1.65 });
  }

  // Twin Flush Chasm Access Staircases descending cleanly inside West & East Canyon Walls (ZERO wall gap!)
  // West Chasm Stair: x = -10.02, width = 2.70 -> minX = -11.37 (flush against West Cliff `-11.40`!), z ∈ [-10.8, -5.6]
  buildStraightStairFlight(collector, mats, {
    x: -10.02,
    z: -8.2,
    width: 2.7,
    length: 5.2,
    yStart: baseY,
    yEnd: chasmY,
    axis: 'z',
    steps: 12,
    railMinSide: false,
    railMaxSide: true,
    accentMat,
  });
  // East Chasm Stair: x = +10.02, width = 2.70 -> maxX = +11.37 (flush against East Cliff `+11.40`!), z ∈ [+5.6, +10.8]
  buildStraightStairFlight(collector, mats, {
    x: 10.02,
    z: 8.2,
    width: 2.7,
    length: 5.2,
    yStart: chasmY,
    yEnd: baseY,
    axis: 'z',
    steps: 12,
    railMinSide: true,
    railMaxSide: false,
    accentMat,
  });

  // 4. HERO 4-ELEVATION CRISS-CROSS SKYBRIDGE MATRIX!
  // Layer 1 (`y = 42.0m`): Main North-South Spine Bridge (`x ∈ [-2.2, +2.2], z ∈ [-10.8, +10.8]`, visual inset 8mm at cliff faces!)
  const spineDeckMesh = buildBatchedBoxesMesh(
    [{ w: 4.4, h: 0.36, d: 21.584, x: 0, y: baseY - 0.18, z: 0 }],
    mats.catwalkGrate,
    { castShadow: true, receiveShadow: true, name: 'F4_Z2_SpineBridgeDeck' }
  );
  if (spineDeckMesh) {
    group.add(spineDeckMesh);
    collector.wallMeshes.push(spineDeckMesh);
  }
  collector.slabs.push({ minX: -2.2, maxX: 2.2, minZ: -10.8, maxZ: 10.8, y: baseY, thickness: 0.36 });

  const spineGlass = buildBatchedBoxesMesh(
    [{ w: 1.1, h: 0.028, d: 19.6, x: 0, y: baseY + 0.016, z: 0 }],
    mats.floorGlass,
    { name: 'F4_Z2_SpineGlassInlay' }
  );
  if (spineGlass) detailGroup.add(spineGlass);

  // Layer 2 (`y = 44.4m`): South Transverse Cable-Stayed Skybridge (`x ∈ [-11.3, +11.3], z ∈ [+3.0, +6.2]`, 2.06m headroom under!)
  // Visually inset 6mm at x = ±11.3 against the West/East Mid Switchback Landings -> ZERO Z-fighting!
  const midBridgeMesh = buildBatchedBoxesMesh(
    [
      { w: 22.588, h: 0.34, d: 3.2, x: 0, y: midY - 0.17, z: 4.6 },
      // West & East Mid Switchback Landings (`x ∈ [-13.6, -11.3]` & `[+11.3, +13.6]`, `z ∈ [+3.0, +6.2]`)
      { w: 2.3, h: 0.34, d: 3.2, x: -12.45, y: midY - 0.17, z: 4.6 },
      { w: 2.3, h: 0.34, d: 3.2, x: 12.45, y: midY - 0.17, z: 4.6 },
    ],
    mats.catwalkGrate,
    { castShadow: true, receiveShadow: true, name: 'F4_Z2_MidTransverseBridge' }
  );
  if (midBridgeMesh) {
    group.add(midBridgeMesh);
    collector.wallMeshes.push(midBridgeMesh);
  }
  collector.slabs.push({ minX: -13.6, maxX: 13.6, minZ: 3.0, maxZ: 6.2, y: midY, thickness: 0.34 });

  // Clean Guardrails along South Transverse Bridge (`z = 3.0` & `z = 6.2`) leaving West/East switchback stairs open!
  buildGuardrailRun(collector, mats, { x1: -11.3, z1: 3.0, x2: 11.3, z2: 3.0, y: midY, accentMat });
  buildGuardrailRun(collector, mats, { x1: -11.3, z1: 6.2, x2: 11.3, z2: 6.2, y: midY, accentMat });

  // Grounded structural truss piers supporting Spine Bridge (`42.0m`) & Mid Transverse Bridge (`44.4m`)!
  const pierSpecs: BoxSpec[] = [];
  const spinePierH = baseY - 0.36 - (chasmY + 0.004);
  for (const pz of [-7.4, -2.0, 2.0, 7.4]) {
    for (const px of [-1.85, 1.85]) {
      pierSpecs.push({ w: 0.38, h: spinePierH, d: 0.38, x: px, y: chasmY + 0.004 + spinePierH * 0.5, z: pz });
      collector.boxes.push({
        minX: px - 0.22,
        maxX: px + 0.22,
        minY: chasmY,
        maxY: baseY - 0.36,
        minZ: pz - 0.22,
        maxZ: pz + 0.22,
        walkableTop: false,
      });
    }
  }
  const midPierH = midY - 0.34 - (chasmY + 0.004);
  for (const mx of [-7.4, 7.4]) {
    pierSpecs.push({ w: 0.58, h: midPierH, d: 0.58, x: mx, y: chasmY + 0.004 + midPierH * 0.5, z: 4.6 });
    collector.boxes.push({
      minX: mx - 0.34,
      maxX: mx + 0.34,
      minY: chasmY,
      maxY: midY - 0.34,
      minZ: 4.26,
      maxZ: 4.94,
      walkableTop: false,
    });
  }
  const pierMesh = buildBatchedBoxesMesh(pierSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F4_Z2_BridgeTrussPiers',
  });
  if (pierMesh) {
    group.add(pierMesh);
    collector.wallMeshes.push(pierMesh);
  }

  // 5. HERO ARCHITECTURAL LANDMARK: COLOSSAL CABLE-STAYED CANYON PYLON ARCH & TWIN GYROSCOPIC WIND TURBINES!
  // Spanning overhead across the entire chasm (`z = -4.6` & `z = +4.6`) + high diagonal steel suspension cables!
  const archSpecs: BoxSpec[] = [];
  const archGlowSpecs: BoxSpec[] = [];
  // Central Overhead Suspension Arch Beam at `z = -4.6`, `y = 50.08..51.33m` (well above `46.4m` High Skybridge -> 3.68m headroom!)
  archSpecs.push(
    { w: 28.0, h: 1.25, d: 1.25, x: 0, y: baseY + ceilH - 1.45, z: -4.6 },
    { w: 3.4, h: 1.75, d: 1.48, x: 0, y: baseY + ceilH - 1.55, z: -4.6 },
    { w: 0.44, h: 0.85, d: 0.44, x: -7.5, y: baseY + ceilH - 0.425, z: -4.6 },
    { w: 0.44, h: 0.85, d: 0.44, x: 7.5, y: baseY + ceilH - 0.425, z: -4.6 },
    // South Cable-Stay Suspension Crown Beam at `z = +4.6` anchoring diagonal cables cleanly from Mid Bridge (`44.6m`) to Crown (`51.15m`)!
    { w: 28.0, h: 0.88, d: 0.9, x: 0, y: baseY + ceilH - 1.0, z: 4.6 },
    { w: 0.16, h: 6.72, d: 0.16, x: -5.0, y: midY + 3.28, z: 4.6, rotZ: -0.224 },
    { w: 0.16, h: 6.72, d: 0.16, x: 5.0, y: midY + 3.28, z: 4.6, rotZ: 0.224 },
    { w: 0.16, h: 7.24, d: 0.16, x: -9.0, y: midY + 3.28, z: 4.6, rotZ: -0.428 },
    { w: 0.16, h: 7.24, d: 0.16, x: 9.0, y: midY + 3.28, z: 4.6, rotZ: 0.428 }
  );
  archGlowSpecs.push(
    { w: 26.8, h: 0.1, d: 0.1, x: 0, y: baseY + ceilH - 2.12, z: -3.96 },
    { w: 26.8, h: 0.1, d: 0.1, x: 0, y: baseY + ceilH - 2.12, z: -5.24 },
    { w: 26.8, h: 0.08, d: 0.08, x: 0, y: baseY + ceilH - 1.48, z: 5.06 }
  );

  // Coffered Canyon Roof Trusses & High-Bay Floodlight Strips
  const roofLightSpecs: BoxSpec[] = [];
  for (const bz of [-13.2, -9.2, 0.0, 9.2, 13.2]) {
    archSpecs.push({ w: 35.3, h: 0.46, d: 0.42, x: 0, y: baseY + ceilH - 0.24, z: bz });
    roofLightSpecs.push(
      { w: 12.2, h: 0.08, d: 0.34, x: -9.6, y: baseY + ceilH - 0.06, z: bz + 1.8 },
      { w: 12.2, h: 0.08, d: 0.34, x: 9.6, y: baseY + ceilH - 0.06, z: bz + 1.8 }
    );
  }
  const archMesh = buildBatchedBoxesMesh(archSpecs, mats.armoredSteel, {
    castShadow: true,
    name: 'F4_Z2_SuspensionArchAndCables',
  });
  if (archMesh) {
    group.add(archMesh);
    collector.wallMeshes.push(archMesh);
  }
  const archGlowMesh = buildBatchedBoxesMesh(archGlowSpecs, accentMat, { name: 'F4_Z2_ArchGlowStrips' });
  if (archGlowMesh) detailGroup.add(archGlowMesh);
  const roofLightMesh = buildBatchedBoxesMesh(roofLightSpecs, mats.ceilingLight, { name: 'F4_Z2_CanyonRoofLights' });
  if (roofLightMesh) group.add(roofLightMesh);

  // Twin Kinetic Counter-Rotating Overhead Canyon Gyro-Turbines flanking the center at `x = ±6.4, z = 0.0, y = 49.6m`!
  for (const [idx, gx] of ([-6.4, 6.4] as const).entries()) {
    const gyroOuter = new THREE.Group();
    gyroOuter.name = `F4_Z2_CanyonGyro_${idx}`;
    gyroOuter.position.set(gx, baseY + 7.6, 0.0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.09, 10, 32), mats.structuralSteel);
    ring.rotation.x = Math.PI * 0.5;
    const glowRing = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.045, 8, 28), idx === 0 ? accentMat : hydroMat);
    glowRing.rotation.x = Math.PI * 0.5;
    const blades = buildBatchedBoxesMesh(
      [
        { w: 2.8, h: 0.08, d: 0.28, x: 0, y: 0, z: 0 },
        { w: 0.28, h: 0.08, d: 2.8, x: 0, y: 0.014, z: 0 },
      ],
      mats.brushedMetal,
      { name: `F4_Z2_GyroBlades_${idx}` }
    );
    gyroOuter.add(ring, glowRing);
    if (blades) gyroOuter.add(blades);
    group.add(gyroOuter);
    collector.animatedSpinners?.push({ obj: gyroOuter, speed: idx === 0 ? 1.1 : -1.1 });
  }

  // Hero Suspended Canyon Arch Plaque visible immediately from South Arrival Spawn!
  addWallStencilPlaque(group, mats, {
    code: '04-HQ',
    title: 'SKYBRIDGE CHASM',
    subtitle: 'SHOOT ARCH RELAY TO DEPLOY HIGH SNIPER SKYBRIDGE',
    accentHex: 0xf97316,
    x: 0,
    y: baseY + ceilH - 1.42,
    z: -3.82,
    rotY: 0,
    width: 5.8,
    height: 1.32,
  });

  // 6. ELEVATED `+4.4m` WEST & EAST SUSPENSION TOWERS (`y = 46.4m`) + CONTINUOUS SWITCHBACK STAIRCASES!
  addWalkableDeck(collector, {
    minX: -17.68,
    maxX: -13.6,
    minZ: -15.2,
    maxZ: 15.2,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F4_Z2_WestSuspensionTower',
  });
  addWalkableDeck(collector, {
    minX: 13.6,
    maxX: 17.68,
    minZ: -15.2,
    maxZ: 15.2,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F4_Z2_EastSuspensionTower',
  });

  // Upper Switchback Top Landing Pads joining Flight B (`z = -1.6`) cleanly to West & East Towers (`x = ±13.6`)!
  // Visually inset 6mm from `x = ±13.6` -> ZERO Z-fighting!
  const topLandingMesh = buildBatchedBoxesMesh(
    [
      { w: 2.294, h: 0.42, d: 1.5, x: -12.447, y: upperY - 0.21, z: -2.35 },
      { w: 2.294, h: 0.42, d: 1.5, x: 12.447, y: upperY - 0.21, z: -2.35 },
    ],
    mats.catwalkGrate,
    { castShadow: true, receiveShadow: true, name: 'F4_Z2_SwitchbackTopLandings' }
  );
  if (topLandingMesh) {
    group.add(topLandingMesh);
    collector.wallMeshes.push(topLandingMesh);
  }
  collector.slabs.push(
    { minX: -13.6, maxX: -11.3, minZ: -3.1, maxZ: -1.6, y: upperY, thickness: 0.42 },
    { minX: 11.3, maxX: 13.6, minZ: -3.1, maxZ: -1.6, y: upperY, thickness: 0.42 }
  );

  // All 6 Upper Portal Threshold Bridges through `x = ±18.0` into outer wings (ZERO Z-fighting!)
  const upperThresholds: Array<{ minX: number; maxX: number; span: readonly [number, number]; name: string }> = [
    { minX: -18.32, maxX: -17.68, span: F4_PORTALS.westNorthUpperZ, name: 'F4_Z2_WestNorthThresh' },
    { minX: -18.32, maxX: -17.68, span: F4_PORTALS.westMidUpperZ, name: 'F4_Z2_WestMidThresh' },
    { minX: -18.32, maxX: -17.68, span: F4_PORTALS.westSouthUpperZ, name: 'F4_Z2_WestSouthThresh' },
    { minX: 17.68, maxX: 18.32, span: F4_PORTALS.eastNorthUpperZ, name: 'F4_Z2_EastNorthThresh' },
    { minX: 17.68, maxX: 18.32, span: F4_PORTALS.eastMidUpperZ, name: 'F4_Z2_EastMidThresh' },
    { minX: 17.68, maxX: 18.32, span: F4_PORTALS.eastSouthUpperZ, name: 'F4_Z2_EastSouthThresh' },
  ];
  for (const th of upperThresholds) {
    addWalkableDeck(collector, {
      minX: th.minX,
      maxX: th.maxX,
      minZ: th.span[0] + 0.18,
      maxZ: th.span[1] - 0.18,
      y: upperY,
      thickness: 0.42,
      material: mats.catwalkGrate,
      name: th.name,
    });
  }

  // Twin Continuous Canyon Switchback Staircases (`42.0 -> 44.4 -> 46.4m`) along `x = ±12.45`!
  // Width = 2.16m -> outer rail at ±13.60 (EXACT Tower edge!), inner rail at ±11.30 (EXACT Switchback edge!)
  for (const sx of [-12.45, 12.45]) {
    // Flight A: South Cliff (`z = +10.6, y = 42.0`) -> Mid Switchback Landing (`z = +6.2, y = 44.4`)
    buildStraightStairFlight(collector, mats, {
      x: sx,
      z: 8.4,
      width: 2.16,
      length: 4.4,
      yStart: midY,
      yEnd: baseY,
      axis: 'z',
      steps: 11,
      railMinSide: true,
      railMaxSide: true,
      accentMat,
    });
    // Flight B: Mid Switchback Landing (`z = +3.0, y = 44.4`) -> Upper Switchback Top Landing (`z = -1.6, y = 46.4`)
    buildStraightStairFlight(collector, mats, {
      x: sx,
      z: 0.7,
      width: 2.16,
      length: 4.6,
      yStart: upperY,
      yEnd: midY,
      axis: 'z',
      steps: 10,
      railMinSide: true,
      railMaxSide: true,
      accentMat,
    });
  }

  // Grounded structural columns under West & East Suspension Towers (`x = ±13.85`, cleanly clear of all portals!)
  const towerColSpecs: BoxSpec[] = [];
  const towerColH = upperY - 0.42 - (baseY + 0.004);
  for (const gx of [-13.85, 13.85]) {
    for (const gz of [-14.8, -5.8, 2.8, 14.8]) {
      towerColSpecs.push({ w: 0.44, h: towerColH, d: 0.44, x: gx, y: baseY + 0.004 + towerColH * 0.5, z: gz });
      collector.boxes.push({
        minX: gx - 0.25,
        maxX: gx + 0.25,
        minY: baseY,
        maxY: upperY,
        minZ: gz - 0.25,
        maxZ: gz + 0.25,
        walkableTop: false,
      });
    }
  }
  const towerColMesh = buildBatchedBoxesMesh(towerColSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F4_Z2_TowerSupportCols',
  });
  if (towerColMesh) {
    group.add(towerColMesh);
    collector.wallMeshes.push(towerColMesh);
  }

  // Mathematically Exact Upper Suspension Tower Guardrails with clean openings for:
  // (A) North Overlook Bridge (`z ∈ [-14.4, -11.6]`), (B) Jump Pad landings (`z ∈ [-9.2, -6.4]`),
  // (C) Retractable High Sniper Skybridge (`z ∈ [-6.1, -3.1]`), (D) Switchback Top Landings (`z ∈ [-3.1, -1.6]`),
  // (E) South Overlook Bridge (`z ∈ [+11.6, +14.4]`)!
  for (const sgn of [-1, 1] as const) {
    const edgeX = sgn * 13.6;
    const landX = sgn * 11.3;
    const wallX = sgn * 17.68;
    buildGuardrailRun(collector, mats, { x1: Math.min(edgeX, wallX), z1: -15.2, x2: Math.max(edgeX, wallX), z2: -15.2, y: upperY, accentMat });
    buildGuardrailRun(collector, mats, { x1: Math.min(edgeX, wallX), z1: 15.2, x2: Math.max(edgeX, wallX), z2: 15.2, y: upperY, accentMat });
    for (const [z1, z2] of [
      [-15.2, -14.4],
      [-11.6, -9.2],
      [-1.6, 11.6],
      [14.4, 15.2],
    ] as const) {
      buildGuardrailRun(collector, mats, { x1: edgeX, z1, x2: edgeX, z2, y: upperY, accentMat });
    }
    // Top Landing inner rail along `x = ±11.3, z ∈ [-3.1, -1.6]` + North cap along `z = -3.1`!
    buildGuardrailRun(collector, mats, { x1: landX, z1: -3.1, x2: landX, z2: -1.6, y: upperY, accentMat });
    buildGuardrailRun(collector, mats, {
      x1: Math.min(landX, edgeX),
      z1: -3.1,
      x2: Math.max(landX, edgeX),
      z2: -3.1,
      y: upperY,
      accentMat,
    });
  }

  // 7. RETRACTABLE HIGH SNIPER SKYBRIDGE #1 (`f4_bridge_chasm_high`, `z = -4.6`, `y = 46.4m`, 27.2m span!)
  buildRetractableBridge(collector, mats, {
    id: F4_IDS.bridgeChasmHigh,
    label: 'HIGH SNIPER CANYON SKYBRIDGE',
    anchorX: -13.6,
    y: upperY,
    anchorZ: -4.6,
    extendDirX: 1,
    extendDirZ: 0,
    length: 27.2,
    width: 3.0,
    accentMat,
  });

  // Dual Activation: (A) `[E]` Switch on West Suspension Tower + (B) Shootable Crimson Relay Lock on Central Arch!
  buildWorldSwitch(collector, mats, {
    id: F4_IDS.switchChasmHigh,
    x: -15.4,
    y: upperY,
    z: -2.4,
    rotY: Math.PI * 0.5,
    promptLocked: '[E] DEPLOY HIGH SNIPER SKYBRIDGE',
    promptActivated: 'HIGH SNIPER SKYBRIDGE DEPLOYED',
    bannerText: 'HIGH SNIPER CANYON SKYBRIDGE DEPLOYED',
    deployBridgeId: F4_IDS.bridgeChasmHigh,
  });
  buildShootableLock(collector, mats, {
    id: F4_IDS.lockChasmHigh,
    x: 0.0,
    y: baseY + ceilH - 2.48,
    z: -3.86,
    rotY: 0, // Faces South (+Z) straight toward Arrival Spawn cleanly beneath the 04-HQ Arch Plaque!
    bannerText: 'ARCH RELAY SHATTERED · HIGH SNIPER SKYBRIDGE DEPLOYED',
    deployBridgeId: F4_IDS.bridgeChasmHigh,
  });

  // 8. CALIBRATED PNEUMATIC JUMP PADS:
  // (A) Twin Upper Tower Pads (`+4.4m` launch cleanly through dedicated `z ∈ [-9.2, -6.4]` rail openings!)
  buildJumpPad(collector, mats, {
    id: F4_IDS.padChasmWest,
    x: -12.4,
    y: baseY,
    z: -7.8,
    launchVy: 14.9,
    launchVx: -2.6, // flush on cliff deck (1.0m from chasm rim) & arcs cleanly OVER lip onto West Suspension Tower
    launchVz: 0,
    radius: 0.56,
  });
  buildJumpPad(collector, mats, {
    id: F4_IDS.padChasmEast,
    x: 12.4,
    y: baseY,
    z: -7.8,
    launchVy: 14.9,
    launchVx: 2.6, // flush on cliff deck (1.0m from chasm rim) & arcs cleanly OVER lip onto East Suspension Tower
    launchVz: 0,
    radius: 0.56,
  });
  // (B) Twin Chasm-Floor Thermal Updraft Pads (`39.6m -> 42.0m` fast vertical escape directly onto Center Spine Bridge!)
  buildJumpPad(collector, mats, {
    id: F4_IDS.padChasmUpdraftW,
    x: -5.6,
    y: chasmY,
    z: 0.0,
    launchVy: 10.6,
    launchVx: 5.0, // clears x=-2.2 at y=43.34m and lands squarely center-deck on Spine Bridge (`x ≈ -0.4, z = 0`)!
    launchVz: 0,
  });
  buildJumpPad(collector, mats, {
    id: F4_IDS.padChasmUpdraftE,
    x: 5.6,
    y: chasmY,
    z: 0.0,
    launchVy: 10.6,
    launchVx: -5.0, // clears x=+2.2 at y=43.34m and lands squarely center-deck on Spine Bridge (`x ≈ +0.4, z = 0`)!
    launchVz: 0,
  });

  // 9. Tactical Cover Barricades (Spine, Mid Skybridge & Chasm Floor) + 4 Explosive Plasma Barrels!
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: 0.0, y: baseY, z: -1.4, w: 2.2, h: 0.96, d: 0.88, walkableTop: true },
      { x: -4.2, y: midY, z: 4.6, w: 1.6, h: 0.94, d: 1.1, walkableTop: true },
      { x: 4.2, y: midY, z: 4.6, w: 1.6, h: 0.94, d: 1.1, walkableTop: true },
      { x: -7.4, y: chasmY, z: -2.4, w: 2.2, h: 1.0, d: 1.8, walkableTop: true },
      { x: 7.4, y: chasmY, z: 2.4, w: 2.2, h: 1.0, d: 1.8, walkableTop: true },
    ],
    { accentMat: mats.hazardStripe, name: 'F4_Z2_CanyonCover' }
  );

  buildExplosiveBarrel(collector, mats, { id: 'f4_barrel_chasm_w', x: -4.2, y: chasmY, z: 2.8 });
  buildExplosiveBarrel(collector, mats, { id: 'f4_barrel_chasm_e', x: 4.2, y: chasmY, z: -2.8 });
  buildExplosiveBarrel(collector, mats, { id: 'f4_barrel_spine_n', x: -1.35, y: baseY, z: -6.8 });
  buildExplosiveBarrel(collector, mats, { id: 'f4_barrel_mid_c', x: 0.0, y: midY, z: 4.6 });

  // Wing Wayfinding Signage cleanly above Upper Suspension Towers (`y = baseY + 8.6`)!
  addWallStencilPlaque(group, mats, {
    code: '04-W',
    title: 'HYDRO-ELECTRIC DAM',
    subtitle: 'TURBINE HALL · HV SUBSTATION · GEOTHERMAL',
    accentHex: 0x06b6d4,
    x: -17.62,
    y: baseY + 8.6,
    z: 0.0,
    rotY: Math.PI * 0.5,
    width: 6.4,
    height: 1.48,
  });
  addWallStencilPlaque(group, mats, {
    code: '04-E',
    title: 'TRAM DEPOT FOUNDRY',
    subtitle: 'GONDOLA BAY · OVERWATCH VAULT · FREIGHT YARD',
    accentHex: 0xf97316,
    x: 17.62,
    y: baseY + 8.6,
    z: 0.0,
    rotY: -Math.PI * 0.5,
    width: 6.4,
    height: 1.48,
  });
}
