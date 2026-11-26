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
  F6_BASE_Y,
  F6_CEILINGS,
  F6_IDS,
  F6_PORTALS,
  F6_UPPER_Y,
  F6_WALLS,
} from './layout';

/**
 * FLOOR 06 — ZONE 7 (NORTH-WEST OCCLUSION CELL): SUB-ZERO CRYO MEMORY SANCTUM
 * Footprint: x ∈ [-44.0, -18.0] (26m wide) × z ∈ [-28.0, -8.0] (20m deep), Ceiling: 10.0m
 *
 * Sub-Zero Cryogenic Archive Wing:
 * - 4 Grounded Frosted Cryogenic Data Monolith Columns (`mats.cryoFrost`) with ice-cyan telemetry trims
 * - Locked Cryo Extraction Bypass Gate (`f6_gate_cryo_bypass`) at `x = -18.0, z = -12.9` sliding cleanly
 *   North (`slideDir: -1`) into 12.5m of solid wall!
 * - Glowing Crimson Shootable Relay Lock (`f6_lock_cryo_bypass`) mounted cleanly on the North Cryo Bulkhead
 *   (`x = -31.0, y = baseY + 5.4, z = -27.52`) to unlock the direct flank straight into Zone 8 Extraction!
 * - Elevated Frost Observation Catwalk (`+4.4m = 74.4m`) + FLUSH East-Wall Interior Staircase (`x = -19.68`,
 *   ZERO wall gap, ZERO deck overlap!) + 2 Overhead Counter-Rotating Cryo Cooling Fans (`animatedSpinners`)!
 * - Sealed 0.4m clerestory concrete header above Zone 3's `z = -8.0` wall (zero ceiling crack!)
 */
export function buildFloor6Zone7NorthWestCryoVault(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const baseY = F6_BASE_Y;
  const upperY = F6_UPPER_Y;
  const ceilH = F6_CEILINGS.nwCryoVault; // 10.0m
  const frostAccent = mats.floorAccent[3]; // Crisp sub-zero ice-cyan accent!

  const wingGroup = new THREE.Group();
  wingGroup.name = 'F6_Z7_NW_CRYO_VAULT_CELL';
  collector.group.add(wingGroup);

  // 1. Floor Slab, Watertight Ceiling Slab & Clerestory Header Seal over Zone 3 (`z = -8.0`)
  addWalkableDeck(collector, {
    minX: F6_WALLS.westOuterX,
    maxX: F6_WALLS.cathedralWestX,
    minZ: F6_WALLS.northWingsNorthZ,
    maxZ: F6_WALLS.northWingsSplitZ,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    targetGroup: wingGroup,
    name: 'F6_Z7_CryoFloor',
  });

  const ceilMesh = buildBatchedBoxesMesh(
    [
      // Main watertight ceiling slab (`x ∈ [-43.7, -18.3], z ∈ [-27.7, -8.3]`)
      { w: 25.4, h: 0.6, d: 19.4, x: -31.0, y: baseY + ceilH + 0.3, z: -18.0 },
      // Clerestory concrete header sealing Zone 3's 9.6m wall top up to Zone 7's 10.0m ceiling (ZERO crack!)
      {
        w: 25.4,
        h: ceilH - F6_CEILINGS.westLabs,
        d: 0.6,
        x: -31.0,
        y: baseY + F6_CEILINGS.westLabs + (ceilH - F6_CEILINGS.westLabs) * 0.5,
        z: F6_WALLS.northWingsSplitZ,
      },
    ],
    mats.darkConcrete,
    { receiveShadow: false, name: 'F6_Z7_CryoCeilingAndHeader' }
  );
  if (ceilMesh) wingGroup.add(ceilMesh);

  // 2. Perimeter Walls (South wall z = -8.0 owned by Zone 3; East wall z ∈ [-16.7, -8.3] owned by Zone 2!)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F6_WALLS.cathedralWestX,
    spanStart: F6_WALLS.northWingsNorthZ + 0.3,
    spanEnd: F6_WALLS.cathedralNorthZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: wingGroup,
    name: 'F6_Z7_EastExteriorWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F6_WALLS.westOuterX,
    spanStart: F6_WALLS.northWingsNorthZ + 0.3,
    spanEnd: F6_WALLS.northWingsSplitZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: wingGroup,
    name: 'F6_Z7_WestOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F6_WALLS.northWingsNorthZ,
    spanStart: F6_WALLS.westOuterX - 0.3,
    spanEnd: F6_WALLS.cathedralWestX + 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWallLight,
    accentMat: frostAccent,
    targetGroup: wingGroup,
    name: 'F6_Z7_NorthOuterWall',
  });

  // Bi-Parting Locked Cryo Extraction Bypass Gate (`x = -18.0, z = -12.9`) cleanly tucked into solid piers!
  buildLockedSecurityGate(collector, mats, {
    id: F6_IDS.gateCryoBypass,
    label: 'CRYO EXTRACTION BYPASS',
    x: F6_WALLS.cathedralWestX,
    y: baseY,
    z: (F6_PORTALS.westNorthGroundZ[0] + F6_PORTALS.westNorthGroundZ[1]) * 0.5,
    width: F6_PORTALS.westNorthGroundZ[1] - F6_PORTALS.westNorthGroundZ[0],
    height: 4.0,
    spanAxis: 'z',
    lockedHint: 'EXTRACTION BYPASS LOCKED · SHOOT CRYO RELAY ON NORTH BULKHEAD',
    targetGroup: wingGroup,
  });

  buildShootableLock(collector, mats, {
    id: F6_IDS.lockCryoBypass,
    x: -31.0,
    y: baseY + 5.4,
    z: -27.52,
    rotY: 0,
    bannerText: 'CRYO BYPASS RELAY SHATTERED · EXTRACTION FLANK GATE UNLOCKED',
    unlockGateId: F6_IDS.gateCryoBypass,
    targetGroup: wingGroup,
  });

  // 4. ELEVATED FROST OBSERVATION CATWALK (`+4.4m = 74.4m`) + FLUSH EAST WALL STAIRCASE!
  // West Frost Spine (`x ∈ [-43.68, -38.4], z ∈ [-27.68, -8.32]`) joining Zone 3's labsToCryoUpperX!
  addWalkableDeck(collector, {
    minX: -43.68,
    maxX: -38.4,
    minZ: -27.68,
    maxZ: -8.32,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: wingGroup,
    castShadow: true,
    name: 'F6_Z7_WestFrostSpine',
  });
  // North Frost Overlook (`x ∈ [-38.4, -18.32], z ∈ [-27.68, -24.4]`) connecting straight to top of East Stair!
  addWalkableDeck(collector, {
    minX: -38.4,
    maxX: -18.32,
    minZ: -27.68,
    maxZ: -24.4,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: wingGroup,
    castShadow: true,
    name: 'F6_Z7_NorthFrostOverlook',
  });
  // East Frost Spur (`x ∈ [-23.8, -21.24], z ∈ [-24.4, -15.2]`) — clean 15cm reveal West of East Stair rail (-21.09)!
  addWalkableDeck(collector, {
    minX: -23.8,
    maxX: -21.24,
    minZ: -24.4,
    maxZ: -15.2,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: wingGroup,
    castShadow: true,
    name: 'F6_Z7_EastFrostSpur',
  });
  // South-East Upper Portal Landing (`x ∈ [-23.8, -18.32], z ∈ [-15.2, -10.8]`) joining Zone 8's westNorthUpperZ!
  addWalkableDeck(collector, {
    minX: -23.8,
    maxX: -18.32,
    minZ: -15.2,
    maxZ: -10.8,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: wingGroup,
    castShadow: true,
    name: 'F6_Z7_EastPortalLanding',
  });

  // FLUSH East Wall Staircase: climbs Northward from z = -15.6 (baseY 70.0) -> z = -24.4 (upperY 74.4)!
  // x = -19.68, width = 2.70 -> maxX = -18.33 (FLUSH against East Wall `-18.30`, ZERO gap!), railMinSide at `-21.10`!
  buildStraightStairFlight(collector, mats, {
    x: -19.68,
    z: -20.0,
    width: 2.7,
    length: 8.8,
    yStart: upperY,
    yEnd: baseY,
    axis: 'z',
    steps: 20,
    railMinSide: true,
    railMaxSide: false,
    targetGroup: wingGroup,
    accentMat: frostAccent,
  });

  // Exact Frost Catwalk Guardrails (ZERO overlap with stair rail or portals!)
  buildGuardrailRun(collector, mats, {
    x1: -38.4,
    z1: -24.4,
    x2: -38.4,
    z2: -8.32,
    y: upperY,
    accentMat: frostAccent,
    targetGroup: wingGroup,
  });
  buildGuardrailRun(collector, mats, {
    x1: -38.4,
    z1: -24.4,
    x2: -23.8,
    z2: -24.4,
    y: upperY,
    accentMat: frostAccent,
    targetGroup: wingGroup,
  });
  buildGuardrailRun(collector, mats, {
    x1: -23.8,
    z1: -24.4,
    x2: -23.8,
    z2: -10.8,
    y: upperY,
    accentMat: frostAccent,
    targetGroup: wingGroup,
  });
  buildGuardrailRun(collector, mats, {
    x1: -21.24,
    z1: -24.4,
    x2: -21.24,
    z2: -15.2,
    y: upperY,
    accentMat: frostAccent,
    targetGroup: wingGroup,
  });
  buildGuardrailRun(collector, mats, {
    x1: -21.24,
    z1: -15.2,
    x2: -18.32,
    z2: -15.2,
    y: upperY,
    accentMat: frostAccent,
    targetGroup: wingGroup,
  });
  buildGuardrailRun(collector, mats, {
    x1: -23.8,
    z1: -10.8,
    x2: -18.32,
    z2: -10.8,
    y: upperY,
    accentMat: frostAccent,
    targetGroup: wingGroup,
  });

  // 5. 4 GROUNDED FROSTED CRYOGENIC DATA MONOLITH COLUMNS + 2 OVERHEAD ROTATING CRYO FANS!
  const armorSpecs: BoxSpec[] = [];
  const steelSpecs: BoxSpec[] = [];
  const frostSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  const accSpecs: BoxSpec[] = [];

  const colH = ceilH - 0.56;
  for (const [mx, mz] of [
    [-34.2, -13.6],
    [-27.4, -13.6],
    [-34.2, -20.4],
    [-27.4, -20.4],
  ] as const) {
    // Solid armored base & ceiling crown + glowing frosted ice-glass containment shaft!
    armorSpecs.push(
      { w: 1.72, h: 0.72, d: 1.72, x: mx, y: baseY + 0.36, z: mz },
      { w: 1.72, h: 0.72, d: 1.72, x: mx, y: baseY + ceilH - 0.42, z: mz }
    );
    frostSpecs.push({
      w: 1.38,
      h: colH - 1.48,
      d: 1.38,
      x: mx,
      y: baseY + 0.72 + (colH - 1.48) * 0.5,
      z: mz,
    });
    // Corner cryo structural ribs & bright frost-cyan internal core strips
    steelSpecs.push(
      { w: 1.56, h: 0.22, d: 1.56, x: mx, y: baseY + 3.2, z: mz },
      { w: 1.56, h: 0.22, d: 1.56, x: mx, y: baseY + 6.4, z: mz }
    );
    accSpecs.push(
      { w: 0.12, h: colH - 1.8, d: 0.08, x: mx, y: baseY + colH * 0.5, z: mz + 0.73 },
      { w: 0.12, h: colH - 1.8, d: 0.08, x: mx, y: baseY + colH * 0.5, z: mz - 0.73 }
    );
    collector.boxes.push({
      minX: mx - 0.88,
      maxX: mx + 0.88,
      minY: baseY,
      maxY: baseY + ceilH,
      minZ: mz - 0.88,
      maxZ: mz + 0.88,
      walkableTop: false,
    });
  }

  // 2 Overhead Rotating Cryo Exhaust Fans (`animatedSpinners`) recessed cleanly into the ceiling!
  for (const [idx, fz] of [-13.6, -20.4].entries()) {
    const fanGroup = new THREE.Group();
    fanGroup.position.set(-30.8, baseY + ceilH - 0.48, fz);
    const shroud = new THREE.Mesh(new THREE.TorusGeometry(1.68, 0.14, 10, 28), mats.armoredSteel);
    shroud.rotation.x = Math.PI * 0.5;
    shroud.position.set(-30.8, baseY + ceilH - 0.42, fz);
    wingGroup.add(shroud);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.26, 12), mats.structuralSteel);
    fanGroup.add(hub);
    for (let b = 0; b < 4; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.06, 0.34), mats.armoredSteel);
      const ang = (b * Math.PI) / 2;
      blade.position.set(Math.cos(ang) * 0.82, 0, Math.sin(ang) * 0.82);
      blade.rotation.y = -ang;
      blade.rotation.x = 0.28;
      fanGroup.add(blade);
    }
    wingGroup.add(fanGroup);
    collector.animatedSpinners?.push({ obj: fanGroup, speed: idx === 0 ? 2.1 : -2.1 });
  }

  // Overhead Roof Trusses, Grounded Catwalk Columns, Ceiling Lights & Non-Clipping Wall Trim
  for (let z = -25.2; z <= -10.8; z += 4.8) {
    steelSpecs.push({ w: 25.32, h: 0.44, d: 0.38, x: -31.0, y: baseY + ceilH - 0.23, z });
    lightSpecs.push({ w: 17.6, h: 0.08, d: 0.3, x: -31.0, y: baseY + ceilH - 0.06, z: z + 2.2 });
  }
  for (const [cx, cz] of [
    [-38.62, -24.16],
    [-38.62, -16.4],
    [-38.62, -8.8],
    [-23.56, -24.16],
    [-23.56, -11.04],
  ] as const) {
    steelSpecs.push({ w: 0.4, h: 3.972, d: 0.4, x: cx, y: baseY + 0.004 + 1.986, z: cz });
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

  // Crisp frost floor lanes (strictly clear of East Stair wall!)
  accSpecs.push(
    { w: 0.14, h: 0.012, d: 15.6, x: -30.8, y: baseY + 0.008, z: -17.0 },
    { w: 15.2, h: 0.012, d: 0.12, x: -30.8, y: baseY + 0.014, z: -17.0 }
  );

  const armorMesh = buildBatchedBoxesMesh(armorSpecs, mats.armoredSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F6_Z7_CryoArmor',
  });
  if (armorMesh) {
    wingGroup.add(armorMesh);
    collector.wallMeshes.push(armorMesh);
  }
  const steelMesh = buildBatchedBoxesMesh(steelSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F6_Z7_CryoSteel',
  });
  if (steelMesh) {
    wingGroup.add(steelMesh);
    collector.wallMeshes.push(steelMesh);
  }
  const frostMesh = buildBatchedBoxesMesh(frostSpecs, mats.cryoFrost, {
    castShadow: false,
    receiveShadow: true,
    name: 'F6_Z7_CryoFrostMonoliths',
  });
  if (frostMesh) {
    wingGroup.add(frostMesh);
    collector.wallMeshes.push(frostMesh);
  }
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F6_Z7_CryoLights' });
  if (lightMesh) wingGroup.add(lightMesh);
  const accMesh = buildBatchedBoxesMesh(accSpecs, frostAccent, { name: 'F6_Z7_CryoAccents' });
  if (accMesh) wingGroup.add(accMesh);

  // 6. Cryo Telemetry Consoles, Lockers, Tactical Barricades & 2 Explosive Plasma Barrels!
  buildWallEquipmentBays(
    collector,
    mats,
    [
      { axis: 'x', coord: -27.7, inwardDir: 1, centerAlong: -35.6, baseY, width: 4.6, height: 3.0, depth: 0.54 },
      { axis: 'x', coord: -27.7, inwardDir: 1, centerAlong: -26.0, baseY, width: 4.6, height: 3.0, depth: 0.54 },
    ],
    { targetGroup: wingGroup, accentMat: frostAccent, name: 'F6_Z7_CryoLockers' }
  );
  buildTacticalConsoleBenches(
    collector,
    mats,
    [
      { x: -41.4, y: baseY, z: -17.0, w: 1.05, h: 0.98, d: 3.6 },
      { x: -30.8, y: baseY, z: -24.4, w: 3.4, h: 0.96, d: 1.0 },
    ],
    { targetGroup: wingGroup, accentMat: frostAccent, name: 'F6_Z7_CryoConsoles' }
  );
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -30.8, y: baseY, z: -17.0, w: 2.8, h: 1.0, d: 0.98, walkableTop: true },
    ],
    { targetGroup: wingGroup, accentMat: mats.hazardStripe, name: 'F6_Z7_CryoBarricades' }
  );

  buildExplosiveBarrel(collector, mats, {
    id: 'f6_barrel_cryo_1',
    x: -36.8,
    y: baseY,
    z: -17.0,
    targetGroup: wingGroup,
  });
  buildExplosiveBarrel(collector, mats, {
    id: 'f6_barrel_cryo_2',
    x: -24.8,
    y: baseY,
    z: -17.0,
    targetGroup: wingGroup,
  });

  // High-Readability Architectural Stencil Signage cleanly above North Frost Overlook rail!
  addWallStencilPlaque(wingGroup, mats, {
    code: '06-C',
    title: 'CRYO MEMORY SANCTUM',
    subtitle: 'SHOOT NORTH BULKHEAD RELAY TO UNLOCK EXTRACTION FLANK GATE',
    accentHex: 0x38bdf8,
    x: -31.0,
    y: baseY + 7.9,
    z: -27.62,
    rotY: 0,
    width: 7.4,
    height: 1.55,
  });

  return {
    id: 'f6_nw_cryo_vault',
    group: wingGroup,
    center: new THREE.Vector3(-31.0, baseY + 3.5, -18.0),
    triggerBounds: {
      minX: -46.0,
      maxX: -12.0,
      minZ: -30.0,
      maxZ: -4.0,
    },
    maxViewDistance: 36.0,
  };
}
