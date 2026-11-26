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
} from '../../architecture';
import {
  buildGuardrailRun,
  buildStraightStairFlight,
  type FloorGeometryCollector,
} from '../../stairs';
import {
  addF3PortalSill,
  F3_CEIL_H,
  F3_GRID,
  F3_L0_Y,
  F3_L1_Y,
  F3_L2_Y,
  F3_PORTAL_L0,
  F3_PORTAL_L1,
  F3_PORTAL_L2,
  F3_PORTALS,
  F3_ROOF_CENTER_Y,
  F3_ROOF_THICK,
  F3_SUB_Y,
} from './layout';

/**
 * FLOOR 03 — ZONE 2 (CENTER SPINE): THE OBSIDIAN CLOISTER PASSAGES
 * Footprint: x ∈ [-12, +12], z ∈ [-4.0, +9.0]
 *
 * Explicitly breaks the Floor 8–4 "single giant central room" template:
 * - Tight, atmospheric 3-story cruciform carved basalt-and-gold cloister arches wrapping around a
 *   deep sunken `26.2m` Frosted Astrolabe Well (`x ∈ [-3.6, +3.6], z ∈ [-0.6, +5.6]`).
 * - Houses a suspended rotating **Glacial Astrolabe Prism** (`animatedSpinners`) spanning all 3 stories!
 * - Features a **Two-Stage Cloister Ascent (`L0 → L1` West Stair -> walk North L1 Cloister -> `L1 → L2` East Stair)**
 *   all tucked flush against `z = +8.7` with ZERO stair gaps and ZERO blocked portals!
 * - Branches West (Zone 3 Ziggurat), East (Zone 9 Hanging Monolith Conduit), and South (Zone 12 Extraction)
 *   across L0, L1, and L2!
 */
export function buildFloor3Zone2ObsidianCloister(
  collector: FloorGeometryCollector,
  detailGroup: THREE.Group,
  mats: HideoutMaterialRegistry
): void {
  const ySub = F3_SUB_Y; // 26.2m
  const y0 = F3_L0_Y; // 28.0m
  const y1 = F3_L1_Y; // 31.1m
  const y2 = F3_L2_Y; // 34.2m
  const ceilH = F3_CEIL_H; // 10.3m
  const group = collector.group;
  const accentMat = mats.floorAccent[3];
  const goldMat = mats.auroraGold;

  // 1. Sunken Astrolabe Well Floor (`26.2m`, bottom `25.72m > 25.40m` Floor 02 maxY!)
  //    Plus 4 non-overlapping L0 Cloister Walkways framing the well (`x ∈ [-3.6, +3.6], z ∈ [-0.6, +5.6]`)
  addWalkableDeck(collector, {
    minX: -3.6,
    maxX: 3.6,
    minZ: -0.6,
    maxZ: 5.6,
    y: ySub,
    thickness: 0.48,
    material: mats.basaltStone,
    name: 'F3_Z2_AstrolabeWellFloor',
  });
  // L0 North Cloister Passage (`z ∈ [-4.0, -0.6]`)
  addWalkableDeck(collector, {
    minX: -12.0,
    maxX: 12.0,
    minZ: -4.0,
    maxZ: -0.6,
    y: y0,
    thickness: 0.56,
    material: mats.glacialMarble,
    name: 'F3_Z2_L0_NorthWalk',
  });
  // L0 South Cloister Passage (`z ∈ [+5.6, +9.0]`)
  addWalkableDeck(collector, {
    minX: -12.0,
    maxX: 12.0,
    minZ: 5.6,
    maxZ: 9.0,
    y: y0,
    thickness: 0.56,
    material: mats.glacialMarble,
    name: 'F3_Z2_L0_SouthWalk',
  });
  // L0 West Cloister Passage (`x ∈ [-12.0, -3.6], z ∈ [-0.6, +5.6]`)
  addWalkableDeck(collector, {
    minX: -12.0,
    maxX: -3.6,
    minZ: -0.6,
    maxZ: 5.6,
    y: y0,
    thickness: 0.56,
    material: mats.glacialMarble,
    name: 'F3_Z2_L0_WestWalk',
  });
  // L0 East Cloister Passage (`x ∈ [+3.6, +12.0], z ∈ [-0.6, +5.6]`)
  addWalkableDeck(collector, {
    minX: 3.6,
    maxX: 12.0,
    minZ: -0.6,
    maxZ: 5.6,
    y: y0,
    thickness: 0.56,
    material: mats.glacialMarble,
    name: 'F3_Z2_L0_EastWalk',
  });

  // Solid basalt well liner skirts from `26.20m` up to `27.44m` flush underneath L0 marble deck undersides (ZERO Z-fighting!)
  const wellLinerSpecs: BoxSpec[] = [
    { w: 7.68, h: 1.24, d: 0.24, x: 0, y: ySub + 0.62, z: -0.72 },
    { w: 7.68, h: 1.24, d: 0.24, x: 0, y: ySub + 0.62, z: 5.72 },
    { w: 0.24, h: 1.24, d: 6.2, x: -3.72, y: ySub + 0.62, z: 2.5 },
    { w: 0.24, h: 1.24, d: 6.2, x: 3.72, y: ySub + 0.62, z: 2.5 },
  ];
  const linerMesh = buildBatchedBoxesMesh(wellLinerSpecs, mats.basaltStone, {
    receiveShadow: true,
    name: 'F3_Z2_WellLiners',
  });
  if (linerMesh) {
    group.add(linerMesh);
    collector.wallMeshes.push(linerMesh);
  }
  // Watertight pit-wall colliders (`26.2m → 28.0m`) enclosing the sunken Astrolabe Well so players can NEVER
  // walk under the L0 marble decks and fall into void! Open cleanly at North-East escape stair (`x ∈ [2.2, 3.6]`).
  collector.boxes.push(
    { minX: -3.9, maxX: 2.2, minY: ySub - 0.6, maxY: y0 - 0.04, minZ: -0.92, maxZ: -0.6, walkableTop: false, tag: 'pit_wall' },
    { minX: -3.9, maxX: 3.9, minY: ySub - 0.6, maxY: y0 - 0.04, minZ: 5.6, maxZ: 5.92, walkableTop: false, tag: 'pit_wall' },
    { minX: -3.92, maxX: -3.6, minY: ySub - 0.6, maxY: y0 - 0.04, minZ: -0.6, maxZ: 5.6, walkableTop: false, tag: 'pit_wall' },
    { minX: 3.6, maxX: 3.92, minY: ySub - 0.6, maxY: y0 - 0.04, minZ: -0.6, maxZ: 5.6, walkableTop: false, tag: 'pit_wall' }
  );

  // Sleek basalt escape stair climbing out of the sunken Astrolabe Well (`26.2m → 28.0m`) flush along the East rim!
  buildStraightStairFlight(collector, mats, {
    x: 2.9,
    z: 0.9,
    width: 1.4,
    length: 3.0,
    yStart: y0, // z = -0.6 -> 28.0m (L0 North Cloister Passage!)
    yEnd: ySub, // z = +2.4 -> 26.2m (Astrolabe Well floor!)
    axis: 'z',
    steps: 9,
    railMinSide: true,
    railMaxSide: false,
    accentMat: goldMat,
  });

  // Low protective guardrails around all 4 rims of the sunken Astrolabe Well on L0 (open at NE escape stair `x ∈ [2.2, 3.6]`!)
  buildGuardrailRun(collector, mats, { x1: -3.6, z1: -0.6, x2: 2.2, z2: -0.6, y: y0, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: -3.6, z1: 5.6, x2: 3.6, z2: 5.6, y: y0, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: -3.6, z1: -0.6, x2: -3.6, z2: 5.6, y: y0, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: 3.6, z1: -0.6, x2: 3.6, z2: 5.6, y: y0, accentMat: goldMat });

  // 2. Single-Owner Shared Walls (`z = +9.0` South, `x = -12.0` West, `x = +12.0` East)
  //    (North wall `z = -4.0` is owned by Zone 1!)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F3_GRID.Z_CLOISTER_SOUTH,
    spanStart: F3_GRID.X_CORE_WEST - 0.3,
    spanEnd: F3_GRID.X_CORE_EAST + 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.basaltStone,
    accentMat: goldMat,
    portals: [
      {
        start: F3_PORTALS.Z2_Z12_L0_X[0],
        end: F3_PORTALS.Z2_Z12_L0_X[1],
        ...F3_PORTAL_L0,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: F3_PORTALS.Z2_Z12_L2_X[0],
        end: F3_PORTALS.Z2_Z12_L2_X[1],
        ...F3_PORTAL_L2,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
    ],
    name: 'F3_Z2_SouthWall',
  });

  for (const side of [-1, 1] as const) {
    buildArchitecturalWall(collector, mats, {
      axis: 'z',
      coord: side < 0 ? F3_GRID.X_CORE_WEST : F3_GRID.X_CORE_EAST,
      spanStart: F3_GRID.Z_THRESHOLD + 0.3,
      spanEnd: F3_GRID.Z_CLOISTER_SOUTH - 0.3,
      baseY: y0,
      height: ceilH,
      wallMat: mats.basaltStone,
      accentMat,
      portals: [
        {
          start: F3_PORTALS.Z2_SIDE_L0_Z[0],
          end: F3_PORTALS.Z2_SIDE_L0_Z[1],
          ...F3_PORTAL_L0,
          kind: 'door',
          framed: true,
          accentHeader: true,
        },
        {
          start: F3_PORTALS.Z2_SIDE_L1_Z[0],
          end: F3_PORTALS.Z2_SIDE_L1_Z[1],
          ...F3_PORTAL_L1,
          kind: 'door',
          framed: true,
          accentHeader: true,
        },
        {
          start: F3_PORTALS.Z2_SIDE_L2_Z[0],
          end: F3_PORTALS.Z2_SIDE_L2_Z[1],
          ...F3_PORTAL_L2,
          kind: 'door',
          framed: true,
          accentHeader: true,
        },
      ],
      name: side < 0 ? 'F3_Z2_WestWall' : 'F3_Z2_EastWall',
    });
    // Zero-gap elevated doorway threshold sills bridging through the 0.6m walls on L1 & L2
    addF3PortalSill(collector, {
      axis: 'z',
      coord: side < 0 ? F3_GRID.X_CORE_WEST : F3_GRID.X_CORE_EAST,
      span: F3_PORTALS.Z2_SIDE_L1_Z,
      y: y1,
      material: mats.basaltStone,
      name: `F3_Z2_Sill_${side < 0 ? 'W' : 'E'}_L1`,
    });
    addF3PortalSill(collector, {
      axis: 'z',
      coord: side < 0 ? F3_GRID.X_CORE_WEST : F3_GRID.X_CORE_EAST,
      span: F3_PORTALS.Z2_SIDE_L2_Z,
      y: y2,
      material: mats.glacialMarble,
      name: `F3_Z2_Sill_${side < 0 ? 'W' : 'E'}_L2`,
    });
  }
  addF3PortalSill(collector, {
    axis: 'x',
    coord: F3_GRID.Z_CLOISTER_SOUTH,
    span: F3_PORTALS.Z2_Z12_L2_X,
    y: y2,
    material: mats.glacialMarble,
    name: 'F3_Z2_Sill_South_L2',
  });

  // 3. LEVEL 1 (`31.1m`) CLOISTER RING GALLERIES (U-shaped: West + North + East!)
  //    West L1 Gallery (`x ∈ [-11.69, -8.2], z ∈ [-3.69, +6.69]` + SW stair landing `x ∈ [-11.69, -9.2], z ∈ [+6.69, +8.69]`)
  addWalkableDeck(collector, {
    minX: -11.69,
    maxX: -8.2,
    minZ: -3.69,
    maxZ: 6.69,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    castShadow: true,
    name: 'F3_Z2_L1_WestGallery',
  });
  addWalkableDeck(collector, {
    minX: -11.69,
    maxX: -9.2,
    minZ: 6.69,
    maxZ: 8.69,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    castShadow: true,
    name: 'F3_Z2_L1_SWLanding',
  });
  // North L1 Cloister Bridge (`x ∈ [-8.2, +8.2], z ∈ [-3.69, -1.0]`, overlooking the Astrolabe Well!)
  addWalkableDeck(collector, {
    minX: -8.2,
    maxX: 8.2,
    minZ: -3.69,
    maxZ: -1.0,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    castShadow: true,
    name: 'F3_Z2_L1_NorthBridge',
  });
  // East L1 Gallery (`x ∈ [+8.2, +11.69], z ∈ [-3.69, +6.69]` + SE stair landing `x ∈ [+9.2, +11.69], z ∈ [+6.69, +8.69]`)
  addWalkableDeck(collector, {
    minX: 8.2,
    maxX: 11.69,
    minZ: -3.69,
    maxZ: 6.69,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    castShadow: true,
    name: 'F3_Z2_L1_EastGallery',
  });
  addWalkableDeck(collector, {
    minX: 9.2,
    maxX: 11.69,
    minZ: 6.69,
    maxZ: 8.69,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    castShadow: true,
    name: 'F3_Z2_L1_SELanding',
  });

  // L1 Guardrails cleanly framing the inner cloister atrium (open at stair entries!)
  buildGuardrailRun(collector, mats, { x1: -8.2, z1: -1.0, x2: 8.2, z2: -1.0, y: y1, accentMat });
  buildGuardrailRun(collector, mats, { x1: -8.2, z1: -1.0, x2: -8.2, z2: 6.65, y: y1, accentMat });
  buildGuardrailRun(collector, mats, { x1: 8.2, z1: -1.0, x2: 8.2, z2: 6.65, y: y1, accentMat });

  // 4. LEVEL 2 (`34.2m`) CROWN SKY-PASSAGES (Full 360° Ring connecting Zone 3 L2, Zone 9 L2 & Zone 12 L2!)
  //    South L2 Crown Bridge (`x ∈ [-11.69, +3.4], z ∈ [+6.5, +8.69]`) — receives Stage 2 Stair at `x = +3.4`!
  addWalkableDeck(collector, {
    minX: -11.69,
    maxX: 3.4,
    minZ: 6.5,
    maxZ: 8.69,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    castShadow: true,
    name: 'F3_Z2_L2_SouthCrownBridge',
  });
  // West L2 Sky-Walk (`x ∈ [-11.69, -8.5], z ∈ [-3.69, +6.5]`) -> connects to Zone 3 L2 portal (`z ∈ [0.2, 4.8]`)!
  addWalkableDeck(collector, {
    minX: -11.69,
    maxX: -8.5,
    minZ: -3.69,
    maxZ: 6.5,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    castShadow: true,
    name: 'F3_Z2_L2_WestWalk',
  });
  // North L2 Sky-Span (`x ∈ [-8.5, +8.5], z ∈ [-3.69, -1.2]`)
  addWalkableDeck(collector, {
    minX: -8.5,
    maxX: 8.5,
    minZ: -3.69,
    maxZ: -1.2,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    castShadow: true,
    name: 'F3_Z2_L2_NorthSpan',
  });
  // East L2 Sky-Walk (`x ∈ [+8.5, +11.69], z ∈ [-3.69, +6.2]`) -> connects to Zone 9 L2 portal (`z ∈ [0.2, 4.8]`)!
  addWalkableDeck(collector, {
    minX: 8.5,
    maxX: 11.69,
    minZ: -3.69,
    maxZ: 6.2,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    castShadow: true,
    name: 'F3_Z2_L2_EastWalk',
  });

  // L2 Guardrails (with crisp aurora-gold edge trim; open at Stage 2 top landing `x = +3.4`!)
  buildGuardrailRun(collector, mats, { x1: -8.5, z1: -1.2, x2: 8.5, z2: -1.2, y: y2, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: -8.5, z1: -1.2, x2: -8.5, z2: 6.5, y: y2, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: 8.5, z1: -1.2, x2: 8.5, z2: 6.2, y: y2, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: 8.5, z1: 6.2, x2: 11.65, z2: 6.2, y: y2, accentMat: goldMat });
  buildGuardrailRun(collector, mats, { x1: -8.5, z1: 6.5, x2: 3.4, z2: 6.5, y: y2, accentMat: goldMat });

  // 5. TWO-STAGE CLOISTER ASCENT (`L0 → L1` West South-Wall Stair, then `L1 → L2` East South-Wall Stair!)
  //    Flush against `z = +8.70` wall face (`z = 7.70, width = 2.0 -> z ∈ [6.70, 8.70]`, railMaxSide: false!)
  buildStraightStairFlight(collector, mats, {
    x: -6.3,
    z: 7.7,
    width: 2.0,
    length: 5.8,
    yStart: y1, // x = -9.2 -> 31.1m (West L1 SW Landing)
    yEnd: y0, // x = -3.4 -> 28.0m (L0 South Passage)
    axis: 'x',
    railMinSide: true,
    railMaxSide: false,
    accentMat,
  });

  buildStraightStairFlight(collector, mats, {
    x: 6.3,
    z: 7.7,
    width: 2.0,
    length: 5.8,
    yStart: y2, // x = +3.4 -> 34.2m (South L2 Crown Bridge!)
    yEnd: y1, // x = +9.2 -> 31.1m (East L1 SE Landing!)
    axis: 'x',
    railMinSide: true,
    railMaxSide: false,
    accentMat: goldMat,
  });

  // 6. MONUMENTAL CARVED BASALT CLOISTER PIERS & SUSPENDED ROTATING GLACIAL ASTROLABE PRISM!
  const basaltSpecs: BoxSpec[] = [];
  const goldSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];

  // 4 towering cruciform basalt monolith piers framing the Astrolabe Well from L0 (`28.0m`) to ceiling (`38.3m`)!
  // Positioned at `x = ±4.55, z = 0.0 / +5.0` — strictly clear of ALL L0 well rails, L1/L2 walkways, and South stairs!
  for (const px of [-4.55, 4.55]) {
    for (const pz of [0.0, 5.0]) {
      basaltSpecs.push({
        w: 0.88,
        h: ceilH - 0.04,
        d: 0.88,
        x: px,
        y: y0 + 0.02 + (ceilH - 0.04) * 0.5,
        z: pz,
      });
      goldSpecs.push(
        { w: 1.06, h: 0.16, d: 1.06, x: px, y: y0 + 0.09, z: pz },
        { w: 1.06, h: 0.14, d: 1.06, x: px, y: y1 + 0.02, z: pz },
        { w: 1.06, h: 0.14, d: 1.06, x: px, y: y2 + 0.02, z: pz }
      );
      collector.boxes.push({
        minX: px - 0.48,
        maxX: px + 0.48,
        minY: y0,
        maxY: y0 + ceilH,
        minZ: pz - 0.48,
        maxZ: pz + 0.48,
        walkableTop: false,
      });
    }
  }
  // Overhead vaulted cloister ribs spanning cleanly BETWEEN the 4 monolith piers near ceiling (`y = 37.5m`)
  basaltSpecs.push(
    { w: 8.22, h: 0.72, d: 0.64, x: 0, y: y0 + 9.45, z: 0.0 },
    { w: 8.22, h: 0.72, d: 0.64, x: 0, y: y0 + 9.45, z: 5.0 },
    { w: 0.64, h: 0.72, d: 4.12, x: -4.55, y: y0 + 9.45, z: 2.5 },
    { w: 0.64, h: 0.72, d: 4.12, x: 4.55, y: y0 + 9.45, z: 2.5 }
  );
  // Recessed ceiling light troughs framing the central astrolabe shaft
  lightSpecs.push(
    { w: 7.0, h: 0.1, d: 0.38, x: 0, y: y0 + ceilH - 0.06, z: -2.4 },
    { w: 7.0, h: 0.1, d: 0.38, x: 0, y: y0 + ceilH - 0.06, z: 7.4 },
    { w: 0.38, h: 0.1, d: 6.0, x: -9.8, y: y0 + ceilH - 0.06, z: 2.5 },
    { w: 0.38, h: 0.1, d: 6.0, x: 9.8, y: y0 + ceilH - 0.06, z: 2.5 }
  );

  // Rotating Glacial Astrolabe Prism suspended down the center of the Well (`x = 0, z = 2.5`)!
  const astrolabeOuter = new THREE.Group();
  astrolabeOuter.name = 'F3_Z2_AstrolabeOuter';
  astrolabeOuter.position.set(0, y1 + 0.6, 2.5);
  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.09, 10, 32), goldMat);
  outerRing.rotation.x = Math.PI * 0.18;
  const crystalSpire = new THREE.Mesh(new THREE.OctahedronGeometry(0.95, 0), mats.cryoFrost);
  crystalSpire.scale.set(0.75, 2.6, 0.75);
  astrolabeOuter.add(outerRing, crystalSpire);
  detailGroup.add(astrolabeOuter);
  collector.animatedSpinners?.push({ obj: astrolabeOuter, speed: 0.42 });

  const astrolabeInner = new THREE.Group();
  astrolabeInner.name = 'F3_Z2_AstrolabeInner';
  astrolabeInner.position.set(0, y1 + 0.6, 2.5);
  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.075, 10, 28), accentMat);
  innerRing.rotation.x = -Math.PI * 0.32;
  astrolabeInner.add(innerRing);
  detailGroup.add(astrolabeInner);
  collector.animatedSpinners?.push({ obj: astrolabeInner, speed: -0.78 });

  // Grounded basalt plinth at bottom of well (`26.2m`) — 100% solid & jumpable top!
  const wellPlinth = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.85, 0.7, 8), mats.basaltStone);
  wellPlinth.position.set(0, ySub + 0.354, 2.5);
  detailGroup.add(wellPlinth);
  collector.wallMeshes.push(wellPlinth);
  const wellGlow = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.06, 8, 24), accentMat);
  wellGlow.rotation.x = Math.PI * 0.5;
  wellGlow.position.set(0, ySub + 0.72, 2.5);
  detailGroup.add(wellGlow);
  collector.boxes.push(
    {
      minX: -1.72,
      maxX: 1.72,
      minY: ySub,
      maxY: ySub + 0.74,
      minZ: 0.78,
      maxZ: 4.22,
      walkableTop: true,
      tag: 'well_plinth',
    },
    // Solid core collider for the suspended crystalline astrolabe prism so players never clip through it mid-air
    {
      minX: -0.78,
      maxX: 0.78,
      minY: y1 - 1.8,
      maxY: y1 + 3.0,
      minZ: 1.72,
      maxZ: 3.28,
      walkableTop: false,
      tag: 'astrolabe_crystal',
    }
  );

  // Watertight Roof Slab (`top = 38.80m < 39.00m`!)
  const roofMesh = buildBatchedBoxesMesh(
    [{ w: 24.0, h: F3_ROOF_THICK, d: 13.0, x: 0, y: F3_ROOF_CENTER_Y, z: 2.5 }],
    mats.basaltStone,
    { receiveShadow: true, name: 'F3_Z2_RoofSlab' }
  );
  if (roofMesh) {
    group.add(roofMesh);
    collector.wallMeshes.push(roofMesh);
  }

  const pierMesh = buildBatchedBoxesMesh(basaltSpecs, mats.basaltStone, {
    castShadow: true,
    receiveShadow: true,
    name: 'F3_Z2_CloisterPiers',
  });
  if (pierMesh) {
    group.add(pierMesh);
    collector.wallMeshes.push(pierMesh);
  }
  const goldMesh = buildBatchedBoxesMesh(goldSpecs, goldMat, { name: 'F3_Z2_GoldTrim' });
  if (goldMesh) detailGroup.add(goldMesh);
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F3_Z2_Lights' });
  if (lightMesh) detailGroup.add(lightMesh);

  // Architectural Branch Wayfinder Signage inside the Cloister
  addWallStencilPlaque(group, mats, {
    code: '03-W',
    title: 'STEPPED ZIGGURAT',
    subtitle: 'EXPRESS L0→L2 GRAND STAIR · GLACIAL CRYPT',
    accentHex: 0x67e8f9,
    x: -11.62,
    y: y0 + 2.8,
    z: 6.9,
    rotY: Math.PI * 0.5,
    width: 3.6,
    height: 1.05,
  });
  addWallStencilPlaque(group, mats, {
    code: '03-E',
    title: 'MONOLITH CONDUIT',
    subtitle: 'PATH TO SE CROWN RELIQUARY · LEVEL 2 CONTROL',
    accentHex: 0xe6ad46,
    x: 11.62,
    y: y0 + 2.8,
    z: 6.9,
    rotY: -Math.PI * 0.5,
    width: 3.6,
    height: 1.05,
  });
}
