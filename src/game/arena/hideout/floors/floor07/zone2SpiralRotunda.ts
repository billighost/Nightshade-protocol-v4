import * as THREE from 'three';
import { buildBatchedBoxesMesh, type BoxSpec, type HideoutMaterialRegistry } from '../../materials';
import {
  addLaneMarkerPlaque,
  buildArchitecturalWall,
  buildJerseyBarricades,
} from '../../architecture';
import {
  buildCurvedSpiralStairs,
  buildGuardrailRun,
  buildHelicalAnnularGeometry,
  buildRingWalkwayDeck,
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
  F7_ABYSS_RADIUS,
  F7_ABYSS_Y,
  F7_BASE_Y,
  F7_CEILINGS,
  F7_IDS,
  F7_META,
  F7_RING_OUTER_R,
  F7_STAIR_OUTER_R,
  F7_UPPER_Y,
  F7_WALLS,
} from './layout';

/**
 * Builds a single watertight, ZERO-Z-fighting rectangular floor slab (`[minX, maxX] × [minZ, maxZ]`)
 * with an exact circular open hole of radius `holeRadius` centered at `(0, 0)`!
 * Zero overlapping boxes, zero corner cracks, 1 draw call.
 */
function buildPerforatedSquareFloorGeometry(
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  holeRadius: number,
  topY: number,
  thickness: number,
  segmentsPerEdge = 12
): THREE.BufferGeometry {
  const botY = topY - thickness;
  const positions: number[] = [];
  const uvs: number[] = [];
  const uvScale = 0.25;

  // Build ordered perimeter points going CLOCKWISE in (x, z) when viewed from +Y
  // (so angle increases smoothly around the hole -> outward CCW normals match our annular convention!)
  const outerPts: Array<[number, number]> = [];
  // Edge 1: East (+X) from North-East (maxX, minZ) to South-East (maxX, maxZ)
  for (let i = 0; i < segmentsPerEdge; i++) {
    const t = i / segmentsPerEdge;
    outerPts.push([maxX, minZ + (maxZ - minZ) * t]);
  }
  // Edge 2: South (+Z) from South-East (maxX, maxZ) to South-West (minX, maxZ)
  for (let i = 0; i < segmentsPerEdge; i++) {
    const t = i / segmentsPerEdge;
    outerPts.push([maxX + (minX - maxX) * t, maxZ]);
  }
  // Edge 3: West (-X) from South-West (minX, maxZ) to North-West (minX, minZ)
  for (let i = 0; i < segmentsPerEdge; i++) {
    const t = i / segmentsPerEdge;
    outerPts.push([minX, maxZ + (minZ - maxZ) * t]);
  }
  // Edge 4: North (-Z) from North-West (minX, minZ) to North-East (maxX, minZ)
  for (let i = 0; i < segmentsPerEdge; i++) {
    const t = i / segmentsPerEdge;
    outerPts.push([minX + (maxX - minX) * t, minZ]);
  }

  const pushTri = (
    ax: number,
    ay: number,
    az: number,
    au: number,
    av: number,
    bx: number,
    by: number,
    bz: number,
    bu: number,
    bv: number,
    cx: number,
    cy: number,
    cz: number,
    cu: number,
    cv: number
  ) => {
    positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    uvs.push(au, av, bu, bv, cu, cv);
  };

  const n = outerPts.length;
  for (let i = 0; i < n; i++) {
    const [ox0, oz0] = outerPts[i];
    const [ox1, oz1] = outerPts[(i + 1) % n];

    const a0 = Math.atan2(oz0, ox0);
    const a1 = Math.atan2(oz1, ox1);
    const ix0 = Math.cos(a0) * holeRadius;
    const iz0 = Math.sin(a0) * holeRadius;
    const ix1 = Math.cos(a1) * holeRadius;
    const iz1 = Math.sin(a1) * holeRadius;

    // TOP (+Y outward): (i0, i1, o0) & (i1, o1, o0)
    pushTri(
      ix0, topY, iz0, ix0 * uvScale, iz0 * uvScale,
      ix1, topY, iz1, ix1 * uvScale, iz1 * uvScale,
      ox0, topY, oz0, ox0 * uvScale, oz0 * uvScale
    );
    pushTri(
      ix1, topY, iz1, ix1 * uvScale, iz1 * uvScale,
      ox1, topY, oz1, ox1 * uvScale, oz1 * uvScale,
      ox0, topY, oz0, ox0 * uvScale, oz0 * uvScale
    );

    // BOTTOM (-Y outward): reverse winding
    pushTri(
      ix0, botY, iz0, ix0 * uvScale, iz0 * uvScale,
      ox0, botY, oz0, ox0 * uvScale, oz0 * uvScale,
      ix1, botY, iz1, ix1 * uvScale, iz1 * uvScale
    );
    pushTri(
      ix1, botY, iz1, ix1 * uvScale, iz1 * uvScale,
      ox0, botY, oz0, ox0 * uvScale, oz0 * uvScale,
      ox1, botY, oz1, ox1 * uvScale, oz1 * uvScale
    );

    // INNER HOLE WALL (-r inward toward abyss center): (bi0, bi1, ti0) & (ti0, bi1, ti1)
    const u0 = i * 0.25;
    const u1 = (i + 1) * 0.25;
    pushTri(
      ix0, botY, iz0, u0, botY * uvScale,
      ix1, botY, iz1, u1, botY * uvScale,
      ix0, topY, iz0, u0, topY * uvScale
    );
    pushTri(
      ix0, topY, iz0, u0, topY * uvScale,
      ix1, botY, iz1, u1, botY * uvScale,
      ix1, topY, iz1, u1, topY * uvScale
    );
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Zone 2 — Central Spiral Well Combat Rotunda (`x ∈ [-16, +16], z ∈ [-17, +17]`, ceiling `13.5m`)
 * The monumental centerpiece of Floor 07:
 * - Watertight perforated concrete deck framing a gaping 9.4m-diameter illuminated Central Abyss (`y = 77.6m`)
 * - Sweeping, zero-Z-fighting 151° Round Spiral Staircase (`y = 84.0 -> 88.4m`) on the North arc
 * - Continuous annular Upper Observation Ring (`y = 88.4m`) on the East/South/West arc + East & West Upper Balconies
 * - Retractable Hydraulic Cross-Chasm Skybridge spanning straight across the open abyss (deployable by
 *   shooting the glowing crimson Overhead Relay on the suspended Telemetry Core OR pressing `[E]` on East Ring!)
 * - Twin Pneumatic Tactical Jump-Boost Pads launching operatives cleanly onto East & West Upper Balconies!
 * - Shared West & East architectural partition walls linking cleanly into Zones 3, 4, 5, and 6 via motorized
 *   sliding doors, a Jammed Roll-Under Blast Shutter, armored observation windows, and upper sky-portals!
 */
export function buildZone2SpiralRotunda(
  collector: FloorGeometryCollector,
  detailGroup: THREE.Group,
  mats: HideoutMaterialRegistry
): void {
  const baseY = F7_BASE_Y;
  const upperY = F7_UPPER_Y;
  const ceilH = F7_CEILINGS.rotunda;
  const ceilY = baseY + ceilH;
  const accentMat = mats.floorAccent[7];
  const rHole = F7_ABYSS_RADIUS;

  // =========================================================================
  // 1. WATERTIGHT PERFORATED GROUND FLOOR (`[-16, +16] × [-17, +17]` minus `r < 4.7m`)
  // =========================================================================
  const floorGeo = buildPerforatedSquareFloorGeometry(
    F7_WALLS.rotundaWestX,
    F7_WALLS.rotundaEastX,
    F7_WALLS.rotundaNorthZ,
    F7_WALLS.rotundaSouthZ,
    rHole,
    baseY,
    0.52,
    14
  );
  const floorMesh = new THREE.Mesh(floorGeo, mats.concreteFloor);
  floorMesh.name = 'F7_Z2_PerforatedGroundFloor';
  floorMesh.receiveShadow = true;
  collector.group.add(floorMesh);
  collector.wallMeshes.push(floorMesh);

  // Exact ground walkable colliders leaving `r < 4.7m` a genuine open void while sealing every millimeter outside!
  collector.ringSlabs.push({
    centerX: 0,
    centerZ: 0,
    innerRadius: rHole,
    outerRadius: 11.4,
    y: baseY,
    thickness: 0.52,
  });
  collector.slabs.push(
    // North, South, West, East outer bands (all strictly outside r = 4.7m!)
    { minX: -16.2, maxX: 16.2, minZ: -17.2, maxZ: -9.6, y: baseY },
    { minX: -16.2, maxX: 16.2, minZ: 9.6, maxZ: 17.2, y: baseY },
    { minX: -16.2, maxX: -9.6, minZ: -10.0, maxZ: 10.0, y: baseY },
    { minX: 9.6, maxX: 16.2, minZ: -10.0, maxZ: 10.0, y: baseY },
    // 4 outer corner fills (`hypot(6.9, 6.9) = 9.76 >> 4.7m`)
    { minX: -16.2, maxX: -6.9, minZ: -17.2, maxZ: -6.9, y: baseY },
    { minX: 6.9, maxX: 16.2, minZ: -17.2, maxZ: -6.9, y: baseY },
    { minX: -16.2, maxX: -6.9, minZ: 6.9, maxZ: 17.2, y: baseY },
    { minX: 6.9, maxX: 16.2, minZ: 6.9, maxZ: 17.2, y: baseY }
  );

  // Ground-level safety rail around the open central pit (with clean gap for the Spiral Stair bottom entry!)
  // Spiral stair starts at -0.92π (-2.89 rad) and ends at -0.08π (-0.25 rad)
  buildRingWalkwayDeck(collector, mats, {
    centerX: 0,
    centerZ: 0,
    y: baseY + 0.012, // 12mm decorative collar proud of perforated slab (never coplanar!)
    innerRadius: rHole - 0.02,
    outerRadius: rHole + 0.34,
    thickness: 0.01,
    segments: 36,
    material: mats.structuralSteel,
    accentMat,
    innerGuardrail: true,
    // Keep ground pit collar & rail open ONLY along the spiral stair sweep (stair carries its own continuous helical inner rail!)
    railGaps: [{ minAngle: -Math.PI * 0.96, maxAngle: -Math.PI * 0.04 }],
  });

  // =========================================================================
  // 2. ILLUMINATED CENTRAL ABYSS SHAFT (`y = 81.4m .. 83.48m`, strictly above Floor 06!)
  // =========================================================================
  // Real thick-walled watertight annular concrete liner (true inward CCW normals -> ZERO bleed-through!)
  const shaftWallGeo = buildHelicalAnnularGeometry({
    centerX: 0,
    centerZ: 0,
    rIn: rHole + 0.012,
    rOut: rHole + 0.58,
    aStart: 0,
    aEnd: Math.PI * 2,
    yBotStart: F7_ABYSS_Y - 0.10,
    yBotEnd: F7_ABYSS_Y - 0.10,
    yTopStart: baseY - 0.5,
    yTopEnd: baseY - 0.5,
    segments: 36,
    capEnds: false,
  });
  const shaftWall = new THREE.Mesh(shaftWallGeo, mats.darkConcrete);
  shaftWall.name = 'F7_Z2_AbyssWallLiner';
  collector.group.add(shaftWall);

  // Illuminated Abyss Floor at `y = 81.4m` (bottom 81.24m > Floor 06 maxY 81.11m!) + glowing concentric energy rings
  const pitFloor = new THREE.Mesh(new THREE.CylinderGeometry(rHole + 0.15, rHole + 0.15, 0.16, 32), mats.armoredSteel);
  pitFloor.position.set(0, F7_ABYSS_Y - 0.08, 0);
  collector.group.add(pitFloor);

  for (let d = 0; d < 3; d++) {
    const ringY = F7_ABYSS_Y + 0.24 + d * 0.78;
    const beacon = new THREE.Mesh(new THREE.TorusGeometry(rHole - 0.14, 0.07, 8, 36), accentMat);
    beacon.rotation.x = Math.PI * 0.5;
    beacon.position.set(0, ringY, 0);
    detailGroup.add(beacon);
  }
  const pitCoreGlow = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, 0.22, 24), accentMat);
  pitCoreGlow.position.set(0, F7_ABYSS_Y + 0.12, 0);
  detailGroup.add(pitCoreGlow);

  // =========================================================================
  // 3. HERO ZERO-GLITCH 151° ROUND SPIRAL STAIRCASE (North Arc, `84.0 -> 88.4m`)
  // =========================================================================
  // Sweeps cleanly clockwise from West-North-West (-0.92π) around North (-0.5π) to East-North-East (-0.08π)!
  buildCurvedSpiralStairs(collector, mats, {
    centerX: 0,
    centerZ: 0,
    innerRadius: rHole,
    outerRadius: F7_STAIR_OUTER_R,
    startAngle: -Math.PI * 0.92,
    endAngle: -Math.PI * 0.08,
    yStart: baseY,
    yEnd: upperY,
    steps: 24,
    accentMat,
    innerGuardrail: true,
    outerGuardrail: true,
  });

  // =========================================================================
  // 4. CONTINUOUS ANNULAR UPPER OBSERVATION RING (`y = 88.4m`, East -> South -> West!)
  // =========================================================================
  // Spans `-0.08π` (exact top of Spiral Stair!) -> `+1.08π` (West side), ZERO overlap with Spiral Stair!
  // Clean `railGaps` at East (`angle ≈ 0`) & West (`angle ≈ π`) where the Retractable Cross-Chasm Skybridge docks!
  buildRingWalkwayDeck(collector, mats, {
    centerX: 0,
    centerZ: 0,
    y: upperY,
    innerRadius: rHole,
    outerRadius: F7_RING_OUTER_R,
    thickness: 0.44,
    segments: 36,
    startAngle: -Math.PI * 0.08,
    endAngle: Math.PI * 1.08,
    material: mats.catwalkGrate,
    accentMat,
    innerGuardrail: true,
    railGaps: [
      { minAngle: -0.34, maxAngle: 0.34 }, // East skybridge dock opening
      { minAngle: Math.PI - 0.34, maxAngle: Math.PI + 0.34 }, // West skybridge dock opening
    ],
    outerGuardrail: true,
    outerRailGaps: [
      { minAngle: -0.56, maxAngle: 0.56 }, // East Upper Balcony junction
      { minAngle: 0.78, maxAngle: 1.1 }, // South-East Connector junction
      { minAngle: Math.PI - 1.1, maxAngle: Math.PI - 0.78 }, // South-West Connector junction
      { minAngle: Math.PI - 0.56, maxAngle: Math.PI + 0.56 }, // West Upper Balcony junction
    ],
  });

  // =========================================================================
  // 5. EAST & WEST UPPER BALCONY CONNECTOR DECKS (`y = 88.4m`) LINKING RING TO WINGS
  // =========================================================================
  // Visual decks sit 6mm below Upper Ring (`upperY - 0.006`) so circular ring edge overlays cleanly with ZERO Z-fighting
  // while extending inward to `|x| = 7.1` / `z = 6.2` so there are ZERO curved triangle floor cracks!
  const addConnectorDeck = (
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    name: string
  ) => {
    const w = maxX - minX;
    const d = maxZ - minZ;
    const thick = 0.41;
    const mesh = buildBatchedBoxesMesh(
      [{ w, h: thick, d, x: (minX + maxX) * 0.5, y: upperY - 0.014 - thick * 0.5, z: (minZ + maxZ) * 0.5 }],
      mats.catwalkGrate,
      { castShadow: true, receiveShadow: true, name }
    );
    if (mesh) {
      collector.group.add(mesh);
      collector.wallMeshes.push(mesh);
    }
    collector.slabs.push({ minX, maxX, minZ, maxZ, y: upperY, thickness: thick });
  };

  // West Upper Balcony (`x ∈ [-16.0, -7.2], z ∈ [-4.4, +4.4]` -> seamlessly docks under Upper Ring outer rim!)
  // South rail split around `x ∈ [-13.5, -10.9]` so `padRotundaWest` launches land cleanly without snagging!
  addConnectorDeck(-16.0, -7.2, -4.4, 4.4, 'F7_Z2_WestUpperBalcony');
  buildGuardrailRun(collector, mats, { x1: -15.58, z1: -4.32, x2: -7.55, z2: -4.32, y: upperY, accentMat });
  buildGuardrailRun(collector, mats, { x1: -15.58, z1: 4.32, x2: -13.5, z2: 4.32, y: upperY, accentMat });
  buildGuardrailRun(collector, mats, { x1: -10.9, z1: 4.32, x2: -7.55, z2: 4.32, y: upperY, accentMat });

  // East Upper Balcony (`x ∈ [+7.2, +16.0], z ∈ [-4.4, +4.4]` -> seamlessly docks under Upper Ring outer rim!)
  // North rail split around `x ∈ [10.9, 13.5]` so `padRotundaEast` launches land cleanly without snagging!
  addConnectorDeck(7.2, 16.0, -4.4, 4.4, 'F7_Z2_EastUpperBalcony');
  buildGuardrailRun(collector, mats, { x1: 7.55, z1: -4.32, x2: 10.9, z2: -4.32, y: upperY, accentMat });
  buildGuardrailRun(collector, mats, { x1: 13.5, z1: -4.32, x2: 15.58, z2: -4.32, y: upperY, accentMat });
  buildGuardrailRun(collector, mats, { x1: 7.55, z1: 4.32, x2: 15.58, z2: 4.32, y: upperY, accentMat });

  // South-West & South-East Ring-to-South-Overlook Connector Bridges (cleanly join Ring -> South Overlook!)
  addConnectorDeck(-8.8, -4.2, 6.2, 11.38, 'F7_Z2_SouthWestConnector');
  addConnectorDeck(4.2, 8.8, 6.2, 11.38, 'F7_Z2_SouthEastConnector');

  // Grounded structural steel support columns under the East & West Upper Balconies (strictly grounded at baseY + 0.004!)
  const balconyColSpecs: BoxSpec[] = [];
  const colPositions: Array<[number, number]> = [
    [-11.8, -4.1],
    [-11.8, 4.1],
    [11.8, -4.1],
    [11.8, 4.1],
  ];
  const colH = upperY - 0.44 - (baseY + 0.004);
  for (const [cx, cz] of colPositions) {
    balconyColSpecs.push(
      { w: 0.56, h: colH, d: 0.56, x: cx, y: baseY + 0.004 + colH * 0.5, z: cz },
      { w: 0.78, h: 0.22, d: 0.78, x: cx, y: baseY + 0.004 + 0.11, z: cz }
    );
    collector.boxes.push({
      minX: cx - 0.34,
      maxX: cx + 0.34,
      minY: baseY,
      maxY: upperY - 0.42,
      minZ: cz - 0.34,
      maxZ: cz + 0.34,
      walkableTop: false,
    });
  }
  const balconyCols = buildBatchedBoxesMesh(balconyColSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F7_Z2_BalconySupportColumns',
  });
  if (balconyCols) {
    collector.group.add(balconyCols);
    collector.wallMeshes.push(balconyCols);
  }

  // =========================================================================
  // 6. INTERACTIVE MECHANICS: CROSS-CHASM SKYBRIDGE + OVERHEAD SHOOTABLE LOCK + SWITCH + 2 JUMP PADS!
  // =========================================================================
  // Retractable Hydraulic Skybridge spanning directly across the open abyss (`x = +4.8 -> -4.8`, `z ∈ [-1.5, +1.5]`)!
  buildRetractableBridge(collector, mats, {
    id: F7_IDS.bridgeRotundaCore,
    label: 'ROTUNDA CORE SKYBRIDGE',
    anchorX: 4.82,
    y: upperY,
    anchorZ: 0,
    extendDirX: -1,
    extendDirZ: 0,
    length: 9.64,
    width: 3.0,
    accentMat,
  });

  // Override Switch on East Upper Ring (`[E]` extends the Cross-Chasm Skybridge!)
  buildWorldSwitch(collector, mats, {
    id: F7_IDS.switchRotundaBridge,
    x: 6.8,
    y: upperY,
    z: 2.8,
    rotY: -Math.PI * 0.65,
    promptLocked: 'PRESS [E] TO EXTEND CORE SKYBRIDGE',
    promptActivated: 'CORE SKYBRIDGE DEPLOYED',
    bannerText: 'CORE SKYBRIDGE EXTENDING ACROSS SPIRAL WELL',
    deployBridgeId: F7_IDS.bridgeRotundaCore,
  });

  // Suspended Brutalist Telemetry Core Pillar hanging from ceiling (`y = 91.2 .. 97.42`) — 2.8m headroom above skybridge!
  const coreBaseY = upperY + 2.8;
  const shaftBotY = coreBaseY + 0.36;
  const shaftTopY = ceilY - 0.51;
  const shaftH = Math.max(0.5, shaftTopY - shaftBotY);
  const coreSpecs: BoxSpec[] = [
    { w: 2.6, h: shaftH, d: 2.6, x: 0, y: shaftBotY + shaftH * 0.5, z: 0 },
    { w: 3.1, h: 0.36, d: 3.1, x: 0, y: coreBaseY + 0.18, z: 0 },
    { w: 3.2, h: 0.42, d: 3.2, x: 0, y: ceilY - 0.3, z: 0 },
  ];
  const coreMesh = buildBatchedBoxesMesh(coreSpecs, mats.armoredSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F7_Z2_SuspendedTelemetryCore',
  });
  if (coreMesh) {
    collector.group.add(coreMesh);
    collector.wallMeshes.push(coreMesh);
  }
  const coreGlowSpecs: BoxSpec[] = [
    { w: 2.74, h: 0.16, d: 2.74, x: 0, y: coreBaseY + 1.4, z: 0 },
    { w: 2.74, h: 0.16, d: 2.74, x: 0, y: coreBaseY + 3.2, z: 0 },
    { w: 2.74, h: 0.16, d: 2.74, x: 0, y: coreBaseY + 4.8, z: 0 },
  ];
  const coreGlow = buildBatchedBoxesMesh(coreGlowSpecs, accentMat, {
    name: 'F7_Z2_TelemetryCoreGlows',
  });
  if (coreGlow) detailGroup.add(coreGlow);

  // Kinetic rotating holographic telemetry scanner halo orbiting the Suspended Telemetry Core!
  const scannerRing = new THREE.Group();
  scannerRing.name = 'F7_Z2_TelemetryScannerRing';
  scannerRing.position.set(0, coreBaseY + 0.7, 0);
  const scannerHalo = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.048, 8, 36), accentMat);
  scannerHalo.rotation.x = Math.PI * 0.5;
  scannerRing.add(scannerHalo);
  const vaneSpecs: BoxSpec[] = [];
  for (let v = 0; v < 4; v++) {
    const a = (v * Math.PI) / 2;
    vaneSpecs.push({
      w: v % 2 === 0 ? 0.56 : 0.14,
      h: 0.34,
      d: v % 2 === 0 ? 0.14 : 0.56,
      x: Math.cos(a) * 2.25,
      y: 0,
      z: Math.sin(a) * 2.25,
    });
  }
  const vaneMesh = buildBatchedBoxesMesh(vaneSpecs, mats.structuralSteel, {
    name: 'F7_Z2_TelemetryScannerVanes',
  });
  if (vaneMesh) scannerRing.add(vaneMesh);
  collector.group.add(scannerRing);
  collector.animatedSpinners?.push({ obj: scannerRing, speed: 0.95 });

  // Shootable Overhead Bridge Relay Lock mounted on North face of Telemetry Core (snipe right from Arrival Lobby!)
  buildShootableLock(collector, mats, {
    id: F7_IDS.lockRotundaBridge,
    bannerText: 'BRIDGE RELAY SHATTERED · CORE SKYBRIDGE EXTENDING',
    x: 0,
    y: coreBaseY + 0.65,
    z: -1.42,
    rotY: Math.PI,
    deployBridgeId: F7_IDS.bridgeRotundaCore,
  });
  addLaneMarkerPlaque(detailGroup, mats, {
    label: 'SHOOT · SKYBRIDGE',
    accentHex: 0xef4444,
    x: 0,
    y: coreBaseY + 1.92,
    z: -1.36,
    rotY: Math.PI,
    width: 2.4,
    height: 0.54,
  });

  // Twin Pneumatic Tactical Jump-Boost Pads launching operative straight onto East & West Upper Balconies!
  buildJumpPad(collector, mats, {
    id: F7_IDS.padRotundaEast,
    x: 12.2,
    y: baseY,
    z: -7.6,
    launchVy: 13.4,
    launchVx: 0,
    launchVz: 4.2, // clean arc onto East Upper Balcony (z ∈ [-4.4, +4.4], y = 88.4)
  });
  buildJumpPad(collector, mats, {
    id: F7_IDS.padRotundaWest,
    x: -12.2,
    y: baseY,
    z: 7.6,
    launchVy: 13.4,
    launchVx: 0,
    launchVz: -4.2, // clean arc onto West Upper Balcony (z ∈ [-4.4, +4.4], y = 88.4)
  });

  // Ground-floor tactical cover barricades around the outer Rotunda combat ring
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -12.6, y: baseY, z: -6.8, w: 0.82, h: 1.08, d: 2.6 },
      { x: 12.6, y: baseY, z: 6.8, w: 0.82, h: 1.08, d: 2.6 },
    ],
    { accentMat, name: 'F7_Z2_RotundaCover' }
  );

  // Pressurized Explosive Plasma Barrels in the Rotunda ground combat lanes (including an East chain-reaction pair!)
  buildExplosiveBarrel(collector, mats, {
    id: 'f7_barrel_rotunda_w',
    x: -12.8,
    y: baseY,
    z: -2.2,
  });
  buildExplosiveBarrel(collector, mats, {
    id: 'f7_barrel_rotunda_e1',
    x: 11.2,
    y: baseY,
    z: 4.6,
  });
  buildExplosiveBarrel(collector, mats, {
    id: 'f7_barrel_rotunda_e2',
    x: 12.6,
    y: baseY,
    z: 3.2,
  });

  // =========================================================================
  // 7. SHARED WEST (`x = -16`) & EAST (`x = +16`) ARCHITECTURAL PARTITION WALLS
  // =========================================================================
  // Trimmed cleanly inside North/South walls (`-16.68 .. +16.68`) -> ZERO corner Z-fighting!
  const lowerWallH = upperY - baseY - 0.02;
  const upperWallH = ceilY - upperY;

  // Ground-tier Shared West Wall (`84.0 .. 88.38m`)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F7_WALLS.rotundaWestX,
    spanStart: -16.68,
    spanEnd: 16.68,
    baseY,
    height: lowerWallH,
    thickness: 0.6,
    portals: [
      { start: -14.2, end: -10.4, bottomY: baseY, topY: baseY + 3.6, kind: 'door', accentHeader: true },
      { start: -2.0, end: 2.0, bottomY: baseY, topY: baseY + 3.4, kind: 'door', accentHeader: true },
      { start: 4.2, end: 8.6, bottomY: baseY + 1.2, topY: baseY + 3.4, kind: 'window' },
      { start: 11.1, end: 14.9, bottomY: baseY, topY: baseY + 3.6, kind: 'door', accentHeader: true },
    ],
    accentMat,
    name: 'F7_Z2_SharedWestWall_Lower',
  });
  // Upper-tier Shared West Wall (`88.40 .. 97.50m`) with Elevated Sky-Portals!
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F7_WALLS.rotundaWestX,
    spanStart: -16.68,
    spanEnd: 16.68,
    baseY: upperY,
    height: upperWallH,
    thickness: 0.6,
    portals: [
      { start: -2.4, end: 2.4, bottomY: upperY, topY: upperY + 3.6, kind: 'door', accentHeader: true },
      { start: 11.4, end: 14.8, bottomY: upperY, topY: upperY + 3.6, kind: 'door', accentHeader: true },
    ],
    accentMat,
    name: 'F7_Z2_SharedWestWall_Upper',
  });

  // Ground-tier Shared East Wall (`84.0 .. 88.38m`)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F7_WALLS.rotundaEastX,
    spanStart: -16.68,
    spanEnd: 16.68,
    baseY,
    height: lowerWallH,
    thickness: 0.6,
    portals: [
      { start: -14.2, end: -10.4, bottomY: baseY, topY: baseY + 3.6, kind: 'door', accentHeader: true },
      { start: -8.2, end: -3.6, bottomY: baseY + 1.2, topY: baseY + 3.4, kind: 'window' },
      { start: -2.0, end: 2.0, bottomY: baseY, topY: baseY + 3.6, kind: 'door', accentHeader: true },
      { start: 11.1, end: 14.9, bottomY: baseY, topY: baseY + 3.6, kind: 'door', accentHeader: true },
    ],
    accentMat,
    name: 'F7_Z2_SharedEastWall_Lower',
  });
  // Upper-tier Shared East Wall (`88.40 .. 97.50m`) with Elevated Sky-Portals!
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F7_WALLS.rotundaEastX,
    spanStart: -16.68,
    spanEnd: 16.68,
    baseY: upperY,
    height: upperWallH,
    thickness: 0.6,
    portals: [
      { start: -2.4, end: 2.4, bottomY: upperY, topY: upperY + 3.6, kind: 'door', accentHeader: true },
      { start: 11.4, end: 14.8, bottomY: upperY, topY: upperY + 3.6, kind: 'door', accentHeader: true },
    ],
    accentMat,
    name: 'F7_Z2_SharedEastWall_Upper',
  });

  // Interior Motorized Sliding Doors & Jammed Roll-Under Blast Shutter on the shared Rotunda walls!
  buildTacticalDoor(collector, mats, {
    id: 'f7_door_nw_barracks',
    x: F7_WALLS.rotundaWestX,
    y: baseY,
    z: -12.3,
    width: 3.8,
    height: 3.6,
    spanAxis: 'z',
    mode: 'automatic',
  });
  buildTacticalDoor(collector, mats, {
    id: F7_IDS.jammedWestFlank,
    x: F7_WALLS.rotundaWestX,
    y: baseY,
    z: 0,
    width: 4.0,
    height: 3.4,
    spanAxis: 'z',
    mode: 'jammed_roll',
  });
  buildTacticalDoor(collector, mats, {
    id: 'f7_door_sw_cargo',
    x: F7_WALLS.rotundaWestX,
    y: baseY,
    z: 13.0,
    width: 3.8,
    height: 3.6,
    spanAxis: 'z',
    mode: 'automatic',
  });
  buildTacticalDoor(collector, mats, {
    id: 'f7_door_ne_servers',
    x: F7_WALLS.rotundaEastX,
    y: baseY,
    z: -12.3,
    width: 3.8,
    height: 3.6,
    spanAxis: 'z',
    mode: 'automatic',
  });
  buildTacticalDoor(collector, mats, {
    id: 'f7_door_east_center',
    x: F7_WALLS.rotundaEastX,
    y: baseY,
    z: 0,
    width: 4.0,
    height: 3.6,
    spanAxis: 'z',
    mode: 'automatic',
  });
  buildTacticalDoor(collector, mats, {
    id: 'f7_door_se_turbines',
    x: F7_WALLS.rotundaEastX,
    y: baseY,
    z: 13.0,
    width: 3.8,
    height: 3.6,
    spanAxis: 'z',
    mode: 'automatic',
  });

  // =========================================================================
  // 8. GRAND ROTUNDA CEILING & ZERO-OVERLAP OVERHEAD COFFERED TRUSSES (`y = 97.5m`)
  // =========================================================================
  const roofSlab = buildBatchedBoxesMesh(
    [{ w: 32.8, h: 0.44, d: 34.8, x: 0, y: ceilY + 0.22, z: 0 }],
    mats.darkConcrete,
    { receiveShadow: true, name: 'F7_Z2_RotundaCeiling' }
  );
  if (roofSlab) {
    collector.group.add(roofSlab);
    collector.wallMeshes.push(roofSlab);
  }

  // Strictly separated Y-tiers for transverse beams vs longitudinal ribs vs ceiling lights -> ZERO Z-fighting!
  const beamSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  for (const bz of [-12.0, -5.0, 5.0, 12.0]) {
    beamSpecs.push({ w: 31.2, h: 0.48, d: 0.56, x: 0, y: ceilY - 0.26, z: bz });
    lightSpecs.push(
      { w: 9.2, h: 0.08, d: 0.28, x: -9.4, y: ceilY - 0.56, z: bz },
      { w: 9.2, h: 0.08, d: 0.28, x: 9.4, y: ceilY - 0.56, z: bz }
    );
  }
  for (const bx of [-10.5, 10.5]) {
    // Stepped strictly BELOW transverse beams (`ceilY - 0.72`) so beams NEVER cross at identical Y!
    beamSpecs.push({ w: 0.44, h: 0.34, d: 32.4, x: bx, y: ceilY - 0.72, z: 0 });
  }
  const trussMesh = buildBatchedBoxesMesh(beamSpecs, mats.structuralSteel, {
    name: 'F7_Z2_CeilingTrusses',
  });
  if (trussMesh) detailGroup.add(trussMesh);
  const ceilLightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, {
    name: 'F7_Z2_CeilingLights',
  });
  if (ceilLightMesh) detailGroup.add(ceilLightMesh);

  // Clean signage pointing to upper wings & jump pads
  addLaneMarkerPlaque(detailGroup, mats, {
    label: 'JUMP LIFT →',
    accentHex: F7_META.accentHex,
    x: 15.58,
    y: baseY + 2.2,
    z: -7.6,
    rotY: -Math.PI * 0.5,
    width: 2.2,
    height: 0.62,
  });
  addLaneMarkerPlaque(detailGroup, mats, {
    label: '← JUMP LIFT',
    accentHex: F7_META.accentHex,
    x: -15.58,
    y: baseY + 2.2,
    z: 7.6,
    rotY: Math.PI * 0.5,
    width: 2.2,
    height: 0.62,
  });
}
