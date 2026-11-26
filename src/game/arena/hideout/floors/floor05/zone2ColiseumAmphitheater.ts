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
  F5_BASE_Y,
  F5_CEILINGS,
  F5_IDS,
  F5_PIT_Y,
  F5_PORTALS,
  F5_TIER_Y,
  F5_UPPER_Y,
  F5_WALLS,
} from './layout';

/**
 * FLOOR 05 — ZONE 2 (CENTER HERO): 13.4m TACTICAL WAR-GAMES AMPHITHEATER COLISEUM
 * Footprint: x ∈ [-18, +18] (36m wide) × z ∈ [-17, +17] (34m deep), Vaulted Roof: 10.8m above baseY (13.4m above War-Pit!)
 *
 * AAA War-Room Coliseum (Halo / Call of Duty / Control):
 * - 3-Tier Concentric Stepped Bowl: Outer Promenade (56.0m) -> Mid Spectator Terrace (54.7m) -> Sunken War-Pit (53.4m)
 * - 4 Broad Open Cardinal Amphitheater Staircases (N/S/W/E) for seamless 360° vertical flow
 * - Centerpiece Armored Holographic War-Table Pedestal projecting a Dual Counter-Rotating Tactical Orbital Globe & Radar Ring!
 * - 4 Suspended Coliseum Jumbo Tactical Monitors framing the upper dome with glowing crimson-rose bezels
 * - Full-length `+4.4m` West & East VIP Command Balconies (`y = 60.4m`) + Twin Interior VIP Staircases +
 *   Twin Calibrated Pneumatic Jump Pads (`padColiseumWest`, `padColiseumEast`) with dedicated guardrail gaps!
 * - 27.2m Retractable Coliseum High Skybridge (`f5_bridge_coliseum_high`) deployable via `[E]` switch on East VIP
 *   OR sniping the glowing crimson Holo-Projector Relay right from the North Arrival Spawn!
 */
export function buildFloor5Zone2ColiseumAmphitheater(
  collector: FloorGeometryCollector,
  detailGroup: THREE.Group,
  mats: HideoutMaterialRegistry
): void {
  const baseY = F5_BASE_Y; // 56.0m
  const tierY = F5_TIER_Y; // 54.7m
  const pitY = F5_PIT_Y; // 53.4m
  const upperY = F5_UPPER_Y; // 60.4m
  const ceilH = F5_CEILINGS.coliseum; // 10.8m
  const accentMat = mats.floorAccent[5]; // Crimson-rose War-Room signature!
  const cyanMat = mats.floorAccent[6]; // Crisp holographic projection cyan!
  const group = collector.group;

  // 1. SINGLE CONTINUOUS COLISEUM ROOF SLAB covering Zone 1 + Zone 2 + Zone 9 (`x ∈ [-17.7, +17.7], z ∈ [-16.7, +16.7]`)
  const ceilMesh = buildBatchedBoxesMesh(
    [{ w: 35.4, h: 0.5, d: 33.4, x: 0, y: baseY + ceilH + 0.25, z: 0 }],
    mats.darkConcrete,
    { receiveShadow: false, name: 'F5_ColiseumCeiling' }
  );
  if (ceilMesh) group.add(ceilMesh);

  // 2. Shared Coliseum West & East Walls (`x = ±18.0`, `z ∈ [-16.7, +16.7]`) with ALL 6 stacked portals per side!
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F5_WALLS.coliseumWestX,
    spanStart: F5_WALLS.coliseumNorthZ + 0.3,
    spanEnd: F5_WALLS.coliseumSouthZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat,
    portals: [
      { start: F5_PORTALS.westNorthGroundZ[0], end: F5_PORTALS.westNorthGroundZ[1], bottomY: baseY, topY: baseY + 4.0, kind: 'door', framed: true, accentHeader: true },
      { start: F5_PORTALS.westNorthUpperZ[0], end: F5_PORTALS.westNorthUpperZ[1], bottomY: upperY, topY: upperY + 3.6, kind: 'door', framed: true, accentHeader: true },
      { start: F5_PORTALS.westMidUpperZ[0], end: F5_PORTALS.westMidUpperZ[1], bottomY: upperY, topY: upperY + 3.6, kind: 'door', framed: true, accentHeader: true },
      { start: F5_PORTALS.westMidGroundZ[0], end: F5_PORTALS.westMidGroundZ[1], bottomY: baseY, topY: baseY + 4.0, kind: 'door', framed: true, accentHeader: true },
      { start: F5_PORTALS.westSouthGroundZ[0], end: F5_PORTALS.westSouthGroundZ[1], bottomY: baseY, topY: baseY + 4.0, kind: 'door', framed: true, accentHeader: true },
      { start: F5_PORTALS.westSouthUpperZ[0], end: F5_PORTALS.westSouthUpperZ[1], bottomY: upperY, topY: upperY + 3.6, kind: 'door', framed: true, accentHeader: true },
    ],
    name: 'F5_Z2_ColiseumWestWall',
  });

  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F5_WALLS.coliseumEastX,
    spanStart: F5_WALLS.coliseumNorthZ + 0.3,
    spanEnd: F5_WALLS.coliseumSouthZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat,
    portals: [
      { start: F5_PORTALS.eastNorthGroundZ[0], end: F5_PORTALS.eastNorthGroundZ[1], bottomY: baseY, topY: baseY + 4.0, kind: 'door', framed: true, accentHeader: true },
      { start: F5_PORTALS.eastNorthUpperZ[0], end: F5_PORTALS.eastNorthUpperZ[1], bottomY: upperY, topY: upperY + 3.6, kind: 'door', framed: true, accentHeader: true },
      { start: F5_PORTALS.eastMidUpperZ[0], end: F5_PORTALS.eastMidUpperZ[1], bottomY: upperY, topY: upperY + 3.6, kind: 'door', framed: true, accentHeader: true },
      { start: F5_PORTALS.eastMidGroundZ[0], end: F5_PORTALS.eastMidGroundZ[1], bottomY: baseY, topY: baseY + 4.0, kind: 'door', framed: true, accentHeader: true },
      { start: F5_PORTALS.eastSouthGroundZ[0], end: F5_PORTALS.eastSouthGroundZ[1], bottomY: baseY, topY: baseY + 4.0, kind: 'door', framed: true, accentHeader: true },
      { start: F5_PORTALS.eastSouthUpperZ[0], end: F5_PORTALS.eastSouthUpperZ[1], bottomY: upperY, topY: upperY + 3.6, kind: 'door', framed: true, accentHeader: true },
    ],
    name: 'F5_Z2_ColiseumEastWall',
  });

  // 5 Motorized Proximity Sliding Doors connecting Coliseum <-> Surrounding Outer Wings (6th portal West-North has Locked Bypass Gate!)
  const autoDoors: Array<{ id: string; x: number; span: readonly [number, number] }> = [
    { id: 'f5_auto_coliseum_sim', x: F5_WALLS.coliseumWestX, span: F5_PORTALS.westMidGroundZ },
    { id: 'f5_auto_coliseum_reactor', x: F5_WALLS.coliseumWestX, span: F5_PORTALS.westSouthGroundZ },
    { id: 'f5_auto_coliseum_command', x: F5_WALLS.coliseumEastX, span: F5_PORTALS.eastNorthGroundZ },
    { id: 'f5_auto_coliseum_mech', x: F5_WALLS.coliseumEastX, span: F5_PORTALS.eastMidGroundZ },
    { id: 'f5_auto_coliseum_ordnance', x: F5_WALLS.coliseumEastX, span: F5_PORTALS.eastSouthGroundZ },
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

  // 3. CONCENTRIC 3-TIER STEPPED AMPHITHEATER BOWL (`baseY 56.0 -> tierY 54.7 -> pitY 53.4`)
  // West & East Outer Promenades (`y = 56.0m`, North/South handled by Zones 1 & 9!)
  addWalkableDeck(collector, {
    minX: -18.0,
    maxX: -10.4,
    minZ: -10.4,
    maxZ: 10.4,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    name: 'F5_Z2_WestPromenade',
  });
  addWalkableDeck(collector, {
    minX: 10.4,
    maxX: 18.0,
    minZ: -10.4,
    maxZ: 10.4,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    name: 'F5_Z2_EastPromenade',
  });

  // Mid Terraced Spectator Ring (`y = 54.7m`, solid concrete tiers lifted 4mm above pitY and split cleanly
  // around ALL 4 cardinal 3.7m staircase openings `[-1.85, +1.85]` -> ZERO buried steps & ZERO Z-fighting!)
  const terraceH = tierY - (pitY + 0.004); // 1.296m
  const terraceMidY = pitY + 0.004 + terraceH * 0.5;
  const terraceSpecs: BoxSpec[] = [
    // North & South quadrant terrace bars (split cleanly at x = ±1.85 around North & South cardinal stairs!)
    { w: 8.55, h: terraceH, d: 3.2, x: -6.125, y: terraceMidY, z: -8.8 },
    { w: 8.55, h: terraceH, d: 3.2, x: 6.125, y: terraceMidY, z: -8.8 },
    { w: 8.55, h: terraceH, d: 3.2, x: -6.125, y: terraceMidY, z: 8.8 },
    { w: 8.55, h: terraceH, d: 3.2, x: 6.125, y: terraceMidY, z: 8.8 },
    // West & East quadrant terrace bars (split cleanly at z = ±1.85 around West & East cardinal stairs!)
    { w: 3.2, h: terraceH, d: 5.35, x: -8.8, y: terraceMidY, z: -4.525 },
    { w: 3.2, h: terraceH, d: 5.35, x: -8.8, y: terraceMidY, z: 4.525 },
    { w: 3.2, h: terraceH, d: 5.35, x: 8.8, y: terraceMidY, z: -4.525 },
    { w: 3.2, h: terraceH, d: 5.35, x: 8.8, y: terraceMidY, z: 4.525 },
  ];
  const terraceMesh = buildBatchedBoxesMesh(terraceSpecs, mats.concreteFloor, {
    receiveShadow: true,
    name: 'F5_Z2_MidTerraceRing',
  });
  if (terraceMesh) {
    group.add(terraceMesh);
    collector.wallMeshes.push(terraceMesh);
  }
  collector.slabs.push(
    { minX: -10.4, maxX: -1.85, minZ: -10.4, maxZ: -7.2, y: tierY },
    { minX: 1.85, maxX: 10.4, minZ: -10.4, maxZ: -7.2, y: tierY },
    { minX: -10.4, maxX: -1.85, minZ: 7.2, maxZ: 10.4, y: tierY },
    { minX: 1.85, maxX: 10.4, minZ: 7.2, maxZ: 10.4, y: tierY },
    { minX: -10.4, maxX: -7.2, minZ: -7.2, maxZ: -1.85, y: tierY },
    { minX: -10.4, maxX: -7.2, minZ: 1.85, maxZ: 7.2, y: tierY },
    { minX: 7.2, maxX: 10.4, minZ: -7.2, maxZ: -1.85, y: tierY },
    { minX: 7.2, maxX: 10.4, minZ: 1.85, maxZ: 7.2, y: tierY }
  );

  // Sunken Holographic War-Pit Floor (`y = 53.4m`, bottom `52.80m` > Floor 04 roof top `52.65m`!)
  addWalkableDeck(collector, {
    minX: -10.4,
    maxX: 10.4,
    minZ: -10.4,
    maxZ: 10.4,
    y: pitY,
    thickness: 0.6,
    material: mats.darkConcrete,
    name: 'F5_Z2_SunkenWarPit',
  });

  // Zero-Overlap Steel Bowl Retaining Risers & Non-Coplanar Rim Glow Strips (split around all 4 cardinal stair mouths!):
  // 1) Outer Rim (±10.4): Promenade concrete slabs cover y∈[55.40..56.00], so steel retaining risers sit strictly
  //    BENEATH the promenade slabs (`y = 54.704 .. 55.396`), tucked flush behind `±10.4` with zero corner overlap!
  // 2) Inner Rim (±7.2): Solid concrete Mid Terrace Ring already forms the vertical wall `53.404..54.700`,
  //    so we mount slim proud steel fascia reveals strictly INWARD at `±7.16` (zero coplanar overlap!).
  const riserSpecs: BoxSpec[] = [];
  const rimGlowSpecs: BoxSpec[] = [];
  const outerRiserBotY = tierY + 0.004;
  const outerRiserTopY = baseY - 0.604;
  const outerRiserH = outerRiserTopY - outerRiserBotY; // 0.692m
  const outerRiserMidY = (outerRiserBotY + outerRiserTopY) * 0.5;

  for (const sgn of [-1, 1] as const) {
    // Outer Promenade Rim (±10.4) — North/South & West/East segments
    for (const [s0, s1] of [
      [-10.4, -1.85],
      [1.85, 10.4],
    ] as const) {
      const len = s1 - s0;
      const mid = (s0 + s1) * 0.5;
      // North/South steel wall tucked behind z = ±10.4 (z ∈ [±10.40 .. ±10.64])
      riserSpecs.push({ w: len, h: outerRiserH, d: 0.24, x: mid, y: outerRiserMidY, z: sgn * 10.52 });
      // Proud non-overlapping glowing lip strictly above baseY (`y = baseY + 0.022`)
      rimGlowSpecs.push({ w: len, h: 0.036, d: 0.1, x: mid, y: baseY + 0.022, z: sgn * 10.46 });
      collector.boxes.push({
        minX: s0,
        maxX: s1,
        minY: tierY,
        maxY: baseY - 0.04,
        minZ: sgn > 0 ? 10.4 : -10.66,
        maxZ: sgn > 0 ? 10.66 : -10.4,
        walkableTop: false,
      });

      // West/East steel wall tucked behind x = ±10.4 (x ∈ [±10.40 .. ±10.64], z trimmed strictly inside ±10.4 -> zero corner overlap!)
      riserSpecs.push({ w: 0.24, h: outerRiserH, d: len, x: sgn * 10.52, y: outerRiserMidY, z: mid });
      // Z-run glow trimmed 12cm short of outer corners & staggered +4mm in Y -> zero corner overlap!
      const zGlowStart = s0 < 0 ? s0 + 0.12 : s0;
      const zGlowEnd = s1 > 0 ? s1 - 0.12 : s1;
      rimGlowSpecs.push({
        w: 0.1,
        h: 0.036,
        d: zGlowEnd - zGlowStart,
        x: sgn * 10.46,
        y: baseY + 0.026,
        z: (zGlowStart + zGlowEnd) * 0.5,
      });
      collector.boxes.push({
        minX: sgn > 0 ? 10.4 : -10.66,
        maxX: sgn > 0 ? 10.66 : -10.4,
        minY: tierY,
        maxY: baseY - 0.04,
        minZ: s0,
        maxZ: s1,
        walkableTop: false,
      });
    }

    // Inner Terrace Rim (±7.2) — Slim proud steel fascia band & non-coplanar glowing lip!
    for (const [s0, s1] of [
      [-7.2, -1.85],
      [1.85, 7.2],
    ] as const) {
      const len = s1 - s0;
      const mid = (s0 + s1) * 0.5;
      const zTrimStart = s0 < 0 ? s0 + 0.12 : s0;
      const zTrimEnd = s1 > 0 ? s1 - 0.12 : s1;
      const zTrimLen = zTrimEnd - zTrimStart;
      const zTrimMid = (zTrimStart + zTrimEnd) * 0.5;

      // North/South slim fascia cleanly inward of z = ±7.2 (`z = ±7.16`, `d = 0.06` -> back at `±7.19`, 1cm off concrete!)
      riserSpecs.push({ w: len - 0.04, h: 0.2, d: 0.06, x: mid, y: tierY - 0.14, z: sgn * 7.16 });
      rimGlowSpecs.push({ w: len, h: 0.036, d: 0.1, x: mid, y: tierY + 0.022, z: sgn * 7.26 });
      collector.boxes.push({
        minX: s0,
        maxX: s1,
        minY: pitY,
        maxY: tierY - 0.04,
        minZ: sgn > 0 ? 7.16 : -7.42,
        maxZ: sgn > 0 ? 7.42 : -7.16,
        walkableTop: false,
      });

      // West/East slim fascia trimmed cleanly short of ±7.2 inner corners & staggered +4mm on glow strip!
      riserSpecs.push({ w: 0.06, h: 0.2, d: zTrimLen, x: sgn * 7.16, y: tierY - 0.14, z: zTrimMid });
      rimGlowSpecs.push({ w: 0.1, h: 0.036, d: zTrimLen, x: sgn * 7.26, y: tierY + 0.026, z: zTrimMid });
      collector.boxes.push({
        minX: sgn > 0 ? 7.16 : -7.42,
        maxX: sgn > 0 ? 7.42 : -7.16,
        minY: pitY,
        maxY: tierY - 0.04,
        minZ: s0,
        maxZ: s1,
        walkableTop: false,
      });
    }
  }
  const riserMesh = buildBatchedBoxesMesh(riserSpecs, mats.structuralSteel, {
    receiveShadow: true,
    name: 'F5_Z2_BowlRisers',
  });
  if (riserMesh) {
    group.add(riserMesh);
    collector.wallMeshes.push(riserMesh);
  }
  const rimGlowMesh = buildInstancedBoxes(rimGlowSpecs, accentMat, { name: 'F5_Z2_BowlRimGlow' });
  if (rimGlowMesh) detailGroup.add(rimGlowMesh);

  // 4 Broad Cardinal Amphitheater Staircases (`width = 3.6m, length = 4.0m`, `56.0 -> 53.4`, ZERO side-rail snags!)
  // North Stair: z = -10.4 (56.0) -> z = -6.4 (53.4)
  buildStraightStairFlight(collector, mats, {
    x: 0,
    z: -8.4,
    width: 3.6,
    length: 4.0,
    yStart: baseY,
    yEnd: pitY,
    axis: 'z',
    steps: 10,
    railMinSide: false,
    railMaxSide: false,
    accentMat,
  });
  // South Stair: z = +6.4 (53.4) -> z = +10.4 (56.0)
  buildStraightStairFlight(collector, mats, {
    x: 0,
    z: 8.4,
    width: 3.6,
    length: 4.0,
    yStart: pitY,
    yEnd: baseY,
    axis: 'z',
    steps: 10,
    railMinSide: false,
    railMaxSide: false,
    accentMat,
  });
  // West Stair: x = -10.4 (56.0) -> x = -6.4 (53.4)
  buildStraightStairFlight(collector, mats, {
    x: -8.4,
    z: 0,
    width: 3.6,
    length: 4.0,
    yStart: baseY,
    yEnd: pitY,
    axis: 'x',
    steps: 10,
    railMinSide: false,
    railMaxSide: false,
    accentMat,
  });
  // East Stair: x = +6.4 (53.4) -> x = +10.4 (56.0)
  buildStraightStairFlight(collector, mats, {
    x: 8.4,
    z: 0,
    width: 3.6,
    length: 4.0,
    yStart: pitY,
    yEnd: baseY,
    axis: 'x',
    steps: 10,
    railMinSide: false,
    railMaxSide: false,
    accentMat,
  });

  // 4. CENTERPIECE HERO: HOLOGRAPHIC WAR-TABLE PEDESTAL + DUAL COUNTER-ROTATING ORBITAL GLOBE + JUMBO SCREENS!
  const holoPedestalSpecs: BoxSpec[] = [
    { w: 4.6, h: 0.36, d: 4.6, x: 0, y: pitY + 0.18, z: 0 },
    { w: 3.4, h: 0.72, d: 3.4, x: 0, y: pitY + 0.72, z: 0 },
    { w: 3.8, h: 0.14, d: 3.8, x: 0, y: pitY + 1.15, z: 0 },
  ];
  const holoPedestalMesh = buildBatchedBoxesMesh(holoPedestalSpecs, mats.armoredSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F5_Z2_HoloWarTable',
  });
  if (holoPedestalMesh) {
    group.add(holoPedestalMesh);
    collector.wallMeshes.push(holoPedestalMesh);
  }
  const holoTableTrim = buildBatchedBoxesMesh(
    [
      { w: 3.92, h: 0.08, d: 3.92, x: 0, y: pitY + 1.16, z: 0 },
      { w: 2.2, h: 0.05, d: 2.2, x: 0, y: pitY + 1.24, z: 0 },
    ],
    cyanMat,
    { name: 'F5_Z2_HoloTableGlow' }
  );
  if (holoTableTrim) group.add(holoTableTrim);

  collector.boxes.push({
    minX: -2.35,
    maxX: 2.35,
    minY: pitY,
    maxY: pitY + 1.26,
    minZ: -2.35,
    maxZ: 2.35,
    walkableTop: true,
  });

  // Kinetic Dual Counter-Rotating Holographic Orbital Globe & Tactical Radar Ring (`y = 56.8m`, cleanly below 60.4m skybridge!)
  const globeY = pitY + 3.4; // 56.8m
  const holoOuterPivot = new THREE.Group();
  holoOuterPivot.name = 'F5_Z2_HoloGlobeOuter';
  holoOuterPivot.position.set(0, globeY, 0);
  const eqRing = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.055, 10, 44), cyanMat);
  eqRing.rotation.x = Math.PI * 0.5 - 0.18;
  const polRing = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.045, 10, 36), accentMat);
  polRing.rotation.y = Math.PI * 0.25;
  polRing.rotation.x = 0.42;
  holoOuterPivot.add(eqRing, polRing);
  group.add(holoOuterPivot);
  collector.animatedSpinners?.push({ obj: holoOuterPivot, speed: 0.58 });

  const holoInnerPivot = new THREE.Group();
  holoInnerPivot.name = 'F5_Z2_HoloGlobeInner';
  holoInnerPivot.position.set(0, globeY, 0);
  const wireGlobe = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.08, 1),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true })
  );
  const coreOcta = new THREE.Mesh(new THREE.OctahedronGeometry(0.46, 0), accentMat);
  holoInnerPivot.add(wireGlobe, coreOcta);
  group.add(holoInnerPivot);
  collector.animatedSpinners?.push({ obj: holoInnerPivot, speed: -1.15 });

  // Vertical translucent cyan holo-emitter projection cone rising from table (`pitY + 1.26`) to globe!
  const beamMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 0.28, 2.05, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  beamMesh.position.set(0, pitY + 2.28, 0);
  group.add(beamMesh);

  // 4 Overhead Suspended Coliseum Tactical Jumbo Screens framing the central dome (`y = 63.6 .. 66.8m`, well above 60.4m skybridge!)
  const jumboSpecs: BoxSpec[] = [];
  const jumboGlowSpecs: BoxSpec[] = [];
  for (const [jx, jz, jw, jd] of [
    [0, -6.2, 6.4, 0.48],
    [0, 6.2, 6.4, 0.48],
    [-6.2, 0, 0.48, 6.4],
    [6.2, 0, 0.48, 6.4],
  ] as const) {
    jumboSpecs.push(
      { w: jw, h: 2.3, d: jd, x: jx, y: baseY + ceilH - 2.15, z: jz },
      // Twin ceiling suspension struts
      { w: 0.24, h: 1.05, d: 0.24, x: jx + (jw > jd ? -2.2 : 0), y: baseY + ceilH - 0.52, z: jz + (jd > jw ? -2.2 : 0) },
      { w: 0.24, h: 1.05, d: 0.24, x: jx + (jw > jd ? 2.2 : 0), y: baseY + ceilH - 0.52, z: jz + (jd > jw ? 2.2 : 0) }
    );
    jumboGlowSpecs.push({
      w: jw > jd ? jw - 0.4 : jw + 0.08,
      h: 0.1,
      d: jd > jw ? jd - 0.4 : jd + 0.08,
      x: jx,
      y: baseY + ceilH - 3.32,
      z: jz,
    });
  }
  const jumboMesh = buildBatchedBoxesMesh(jumboSpecs, mats.armoredSteel, {
    castShadow: true,
    name: 'F5_Z2_ColiseumJumboScreens',
  });
  if (jumboMesh) {
    group.add(jumboMesh);
    collector.wallMeshes.push(jumboMesh);
  }
  const jumboGlow = buildBatchedBoxesMesh(jumboGlowSpecs, accentMat, { name: 'F5_Z2_JumboBezels' });
  if (jumboGlow) detailGroup.add(jumboGlow);

  // Crisp Emissive Tactical Display Faces mounted cleanly on the outward faces of the 4 Coliseum Jumbotrons!
  const jumboY = baseY + ceilH - 2.15;
  addWallStencilPlaque(group, mats, {
    code: 'WAR-5',
    title: 'COLISEUM WAR-GAMES',
    subtitle: 'LIVE TACTICAL ARENA · SHOOT RELAY BELOW',
    accentHex: 0xfb7185,
    x: 0,
    y: jumboY + 0.16,
    z: -6.48,
    rotY: Math.PI,
    width: 5.6,
    height: 1.56,
  });
  addWallStencilPlaque(group, mats, {
    code: 'ORB-5',
    title: 'ORBITAL COMMAND LINK',
    subtitle: 'NORTH-WEST TELEMETRY · PROTOTYPE VAULT',
    accentHex: 0x38bdf8,
    x: 0,
    y: jumboY + 0.16,
    z: 6.48,
    rotY: 0,
    width: 5.6,
    height: 1.56,
  });
  addWallStencilPlaque(group, mats, {
    code: 'SIM-5',
    title: 'WEST KILL-GRID SECTOR',
    subtitle: 'BALLISTIC CQB · THERMAL TURBINES',
    accentHex: 0x10b981,
    x: -6.48,
    y: jumboY + 0.16,
    z: 0,
    rotY: -Math.PI * 0.5,
    width: 5.6,
    height: 1.56,
  });
  addWallStencilPlaque(group, mats, {
    code: 'BAY-5',
    title: 'EAST MECH-BAY HANGAR',
    subtitle: 'VANGUARD-05 DROPSHIP · ORDNANCE DEPOT',
    accentHex: 0xf59e0b,
    x: 6.48,
    y: jumboY + 0.16,
    z: 0,
    rotY: Math.PI * 0.5,
    width: 5.6,
    height: 1.56,
  });
  // Inward-facing Jumbotron display screens facing the Holographic War-Pit & North Arrival Spawn sightline!
  addWallStencilPlaque(group, mats, {
    code: '05-HQ',
    title: 'WAR-GAMES AMPHITHEATER',
    subtitle: 'CONCENTRIC HOLO-PIT · 9 TACTICAL SECTORS',
    accentHex: 0xfb7185,
    x: 0,
    y: jumboY + 0.16,
    z: 5.92,
    rotY: Math.PI, // Faces North (-Z) directly toward Arrival Spawn!
    width: 5.6,
    height: 1.56,
  });
  addWallStencilPlaque(group, mats, {
    code: '05-HQ',
    title: 'ORBITAL COMMAND HUB',
    subtitle: 'NORTH ARRIVAL · VIP COMMAND BALCONIES',
    accentHex: 0x38bdf8,
    x: 0,
    y: jumboY + 0.16,
    z: -5.92,
    rotY: 0,
    width: 5.6,
    height: 1.56,
  });
  addWallStencilPlaque(group, mats, {
    code: 'SIM-5',
    title: 'WEST KILL-GRID SECTOR',
    subtitle: 'BALLISTIC CQB · THERMAL TURBINES',
    accentHex: 0x10b981,
    x: -5.92,
    y: jumboY + 0.16,
    z: 0,
    rotY: Math.PI * 0.5,
    width: 5.6,
    height: 1.56,
  });
  addWallStencilPlaque(group, mats, {
    code: 'BAY-5',
    title: 'EAST MECH-BAY HANGAR',
    subtitle: 'VANGUARD-05 DROPSHIP · ORDNANCE DEPOT',
    accentHex: 0xf59e0b,
    x: 5.92,
    y: jumboY + 0.16,
    z: 0,
    rotY: -Math.PI * 0.5,
    width: 5.6,
    height: 1.56,
  });

  // Overhead Coliseum Coffered Roof Trusses & High-Bay Lighting Strips
  const roofTrussSpecs: BoxSpec[] = [];
  const roofLightSpecs: BoxSpec[] = [];
  for (const bz of [-13.2, -6.6, 0, 6.6, 13.2]) {
    roofTrussSpecs.push({ w: 35.32, h: 0.46, d: 0.42, x: 0, y: baseY + ceilH - 0.24, z: bz });
    roofLightSpecs.push(
      { w: 12.0, h: 0.08, d: 0.34, x: -9.5, y: baseY + ceilH - 0.06, z: bz + 2.8 },
      { w: 12.0, h: 0.08, d: 0.34, x: 9.5, y: baseY + ceilH - 0.06, z: bz + 2.8 }
    );
  }
  const roofTrussMesh = buildBatchedBoxesMesh(roofTrussSpecs, mats.structuralSteel, {
    name: 'F5_Z2_ColiseumRoofTrusses',
  });
  if (roofTrussMesh) group.add(roofTrussMesh);
  const roofLightMesh = buildBatchedBoxesMesh(roofLightSpecs, mats.ceilingLight, {
    name: 'F5_Z2_ColiseumRoofLights',
  });
  if (roofLightMesh) group.add(roofLightMesh);

  // 5. ELEVATED `+4.4m` WEST & EAST VIP COMMAND BALCONIES (`y = 60.4m`) + TWIN VIP STAIRCASES + 27.2m SKYBRIDGE!
  addWalkableDeck(collector, {
    minX: -17.68,
    maxX: -13.6,
    minZ: -15.2,
    maxZ: 15.2,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    castShadow: true,
    name: 'F5_Z2_WestVipBalcony',
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
    name: 'F5_Z2_EastVipBalcony',
  });
  // Twin VIP Stair Top Landing Pads joining South Overlook Bridge & VIP Balconies (`z ∈ [11.8, 14.2]`)
  // Visually inset 6mm away from x = ±13.6 VIP Balcony edge -> zero coplanar Z-fighting!
  const vipLandingMesh = buildBatchedBoxesMesh(
    [
      { w: 2.494, h: 0.42, d: 2.4, x: -12.347, y: upperY - 0.21, z: 13.0 },
      { w: 2.494, h: 0.42, d: 2.4, x: 12.347, y: upperY - 0.21, z: 13.0 },
    ],
    mats.catwalkGrate,
    { castShadow: true, receiveShadow: true, name: 'F5_Z2_VipStairLandings' }
  );
  if (vipLandingMesh) {
    group.add(vipLandingMesh);
    collector.wallMeshes.push(vipLandingMesh);
  }
  collector.slabs.push(
    { minX: -13.6, maxX: -11.1, minZ: 11.8, maxZ: 14.2, y: upperY, thickness: 0.42 },
    { minX: 11.1, maxX: 13.6, minZ: 11.8, maxZ: 14.2, y: upperY, thickness: 0.42 }
  );

  // All 6 Upper Portal Threshold Bridges through `x = ±18.0` into outer wings (ZERO Z-fighting!)
  const upperThresholds: Array<{ minX: number; maxX: number; span: readonly [number, number]; name: string }> = [
    { minX: -18.32, maxX: -17.68, span: F5_PORTALS.westNorthUpperZ, name: 'F5_Z2_WestNorthThresh' },
    { minX: -18.32, maxX: -17.68, span: F5_PORTALS.westMidUpperZ, name: 'F5_Z2_WestMidThresh' },
    { minX: -18.32, maxX: -17.68, span: F5_PORTALS.westSouthUpperZ, name: 'F5_Z2_WestSouthThresh' },
    { minX: 17.68, maxX: 18.32, span: F5_PORTALS.eastNorthUpperZ, name: 'F5_Z2_EastNorthThresh' },
    { minX: 17.68, maxX: 18.32, span: F5_PORTALS.eastMidUpperZ, name: 'F5_Z2_EastMidThresh' },
    { minX: 17.68, maxX: 18.32, span: F5_PORTALS.eastSouthUpperZ, name: 'F5_Z2_EastSouthThresh' },
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

  // Twin Interior VIP Staircases climbing Southward from `z = +3.0` (baseY 56.0) -> `z = +11.8` (upperY 60.4)!
  // `x = ±12.35, width = 2.36` -> outer rail `±13.60` joins VIP balcony edge, inner rail `±11.10` joins top landing edge!
  buildStraightStairFlight(collector, mats, {
    x: -12.35,
    z: 7.4,
    width: 2.36,
    length: 8.8,
    yStart: baseY,
    yEnd: upperY,
    axis: 'z',
    steps: 20,
    railMinSide: true,
    railMaxSide: true,
    accentMat,
  });
  buildStraightStairFlight(collector, mats, {
    x: 12.35,
    z: 7.4,
    width: 2.36,
    length: 8.8,
    yStart: baseY,
    yEnd: upperY,
    axis: 'z',
    steps: 20,
    railMinSide: true,
    railMaxSide: true,
    accentMat,
  });

  // Grounded structural columns under West & East VIP Balconies (tucked cleanly at x = ±13.85!)
  const vipColSpecs: BoxSpec[] = [];
  for (const gx of [-13.85, 13.85]) {
    for (const gz of [-14.8, -4.4, 2.8, 14.8]) {
      vipColSpecs.push({ w: 0.44, h: 3.972, d: 0.44, x: gx, y: baseY + 0.004 + 1.986, z: gz });
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
  const vipColMesh = buildBatchedBoxesMesh(vipColSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F5_Z2_VipColumns',
  });
  if (vipColMesh) {
    group.add(vipColMesh);
    collector.wallMeshes.push(vipColMesh);
  }

  // Exact VIP Balcony Guardrails with clean openings for:
  // (A) Jump Pads (`z ∈ [-8.4, -5.6]`), (B) Retractable Skybridge (`z ∈ [-1.5, +1.5]`), (C) South Overlook (`z ∈ [11.2, 14.2]`)!
  for (const sgn of [-1, 1] as const) {
    const edgeX = sgn * 13.6;
    const wallX = sgn * 17.68;
    // North endcap (`z = -15.2`)
    buildGuardrailRun(collector, mats, {
      x1: Math.min(edgeX, wallX),
      z1: -15.2,
      x2: Math.max(edgeX, wallX),
      z2: -15.2,
      y: upperY,
      accentMat,
    });
    // South endcap (`z = +15.2`)
    buildGuardrailRun(collector, mats, {
      x1: Math.min(edgeX, wallX),
      z1: 15.2,
      x2: Math.max(edgeX, wallX),
      z2: 15.2,
      y: upperY,
      accentMat,
    });
    // Inner balcony spans leaving openings at [-8.4..-5.6], [-1.5..+1.5], and [+11.2..+14.2]!
    for (const [z1, z2] of [
      [-15.2, -8.4],
      [-5.6, -1.5],
      [1.5, 11.2],
      [14.2, 15.2],
    ] as const) {
      buildGuardrailRun(collector, mats, { x1: edgeX, z1, x2: edgeX, z2, y: upperY, accentMat });
    }
  }

  // 27.2m RETRACTABLE COLISEUM HIGH SKYBRIDGE (`x = -13.6 -> +13.6`, `z = 0.0`, `y = 60.4m`)!
  buildRetractableBridge(collector, mats, {
    id: F5_IDS.bridgeColiseumHigh,
    label: 'COLISEUM HIGH COMMAND SKYBRIDGE',
    anchorX: -13.6,
    y: upperY,
    anchorZ: 0.0,
    extendDirX: 1,
    extendDirZ: 0,
    length: 27.2,
    width: 3.0,
    accentMat,
  });

  // Dual Activation: (A) `[E]` Switch on East VIP Balcony + (B) Shootable Crimson Relay on North Jumbo Screen facing Spawn!
  buildWorldSwitch(collector, mats, {
    id: F5_IDS.switchColiseumBridge,
    x: 15.4,
    y: upperY,
    z: -2.4,
    rotY: -Math.PI * 0.5,
    promptLocked: '[E] DEPLOY COLISEUM SKYBRIDGE',
    promptActivated: 'COLISEUM SKYBRIDGE DEPLOYED',
    bannerText: 'COLISEUM HIGH COMMAND SKYBRIDGE DEPLOYED',
    deployBridgeId: F5_IDS.bridgeColiseumHigh,
  });
  buildShootableLock(collector, mats, {
    id: F5_IDS.lockColiseumBridge,
    x: 0.0,
    y: baseY + ceilH - 3.05,
    z: -6.56,
    rotY: Math.PI, // Faces North (-Z) straight toward Arrival Spawn cleanly below WAR-5 Jumbotron!
    bannerText: 'JUMBO RELAY SHATTERED · COLISEUM SKYBRIDGE DEPLOYED',
    deployBridgeId: F5_IDS.bridgeColiseumHigh,
  });

  // 6. TWIN CALIBRATED PNEUMATIC JUMP PADS (`+4.4m` clean launch through `z ∈ [-8.4, -5.6]` rail openings!)
  buildJumpPad(collector, mats, {
    id: F5_IDS.padColiseumWest,
    x: -11.6,
    y: baseY,
    z: -7.0,
    launchVy: 13.6,
    launchVx: -3.8, // arcs cleanly OVER lip & lands squarely on West VIP Balcony (`x ∈ [-17.68, -13.6], z = -7.0, y = 60.4m`)
    launchVz: 0,
  });
  buildJumpPad(collector, mats, {
    id: F5_IDS.padColiseumEast,
    x: 11.6,
    y: baseY,
    z: -7.0,
    launchVy: 13.6,
    launchVx: 3.8, // arcs cleanly OVER lip & lands squarely on East VIP Balcony (`x ∈ [+13.6, +17.68], z = -7.0, y = 60.4m`)
    launchVz: 0,
  });

  // 7. Tactical Terrace Cover Barricades & 4 Explosive Plasma Barrels ringing the Sunken War-Pit!
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -4.8, y: pitY, z: -4.8, w: 2.2, h: 0.98, d: 0.92, walkableTop: true },
      { x: 4.8, y: pitY, z: -4.8, w: 2.2, h: 0.98, d: 0.92, walkableTop: true },
      { x: -4.8, y: pitY, z: 4.8, w: 2.2, h: 0.98, d: 0.92, walkableTop: true },
      { x: 4.8, y: pitY, z: 4.8, w: 2.2, h: 0.98, d: 0.92, walkableTop: true },
    ],
    { accentMat: mats.hazardStripe, name: 'F5_Z2_WarPitCover' }
  );

  buildExplosiveBarrel(collector, mats, { id: 'f5_barrel_pit_nw', x: -5.4, y: tierY, z: -8.8 });
  buildExplosiveBarrel(collector, mats, { id: 'f5_barrel_pit_ne', x: 5.4, y: tierY, z: -8.8 });
  buildExplosiveBarrel(collector, mats, { id: 'f5_barrel_pit_sw', x: -5.4, y: tierY, z: 8.8 });
  buildExplosiveBarrel(collector, mats, { id: 'f5_barrel_pit_se', x: 5.4, y: tierY, z: 8.8 });

  // Wing Wayfinding Signage cleanly above VIP Balconies (`y = baseY + 8.6`)!
  addWallStencilPlaque(group, mats, {
    code: '05-W',
    title: 'SIM-DECK KILL-GRID',
    subtitle: 'URBAN CQB ARENA · OVERWATCH TOWER · REACTOR LINK',
    accentHex: 0x10b981,
    x: -17.62,
    y: baseY + 8.6,
    z: 0.0,
    rotY: Math.PI * 0.5,
    width: 6.4,
    height: 1.48,
  });
  addWallStencilPlaque(group, mats, {
    code: '05-E',
    title: 'ARMORED MECH-BAY',
    subtitle: 'DROPSHIP GANTRY · CRANE SKYBRIDGE · ORDNANCE DEPOT',
    accentHex: 0xf59e0b,
    x: 17.62,
    y: baseY + 8.6,
    z: 0.0,
    rotY: -Math.PI * 0.5,
    width: 6.4,
    height: 1.48,
  });
}
