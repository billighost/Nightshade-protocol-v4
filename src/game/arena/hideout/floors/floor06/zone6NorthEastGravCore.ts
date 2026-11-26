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
  type FloorGeometryCollector,
} from '../../stairs';
import type { OcclusionCell } from '../../types';
import { buildExplosiveBarrel, buildJumpPad } from '../../mechanics';
import {
  F6_BASE_Y,
  F6_CEILINGS,
  F6_IDS,
  F6_UPPER_Y,
  F6_WALLS,
} from './layout';

/**
 * FLOOR 06 — ZONE 6 (NORTH-EAST OCCLUSION CELL): GRAV-CORE GYRO TEST CHAMBER
 * Footprint: x ∈ [+18.0, +44.0] (26m wide) × z ∈ [-28.0, -8.0] (20m deep), Ceiling: 11.2m
 *
 * Halo Forerunner Sanctum / Zero-G Containment Lab:
 * - Monumental Triple Counter-Rotating Grav-Core Gyro Rings (`animatedSpinners`) suspended
 *   above an armored octahedral emitter pedestal with a vertical plasma containment beam!
 * - Continuous U-shaped Elevated Halo Observation Gallery (`+4.4m = 74.4m`) linking
 *   Zone 4 East Foundry Spine <-> North Gyro Balcony <-> Zone 8 North Archive Overlook!
 * - Calibrated Pneumatic Jump Pad (`padGravCore`) launching straight North onto the North
 *   Gallery through a dedicated `2.8m` guardrail landing gap (`x ∈ [29.6, 32.4]`)!
 * - Sealed 1.0m clerestory concrete header above Zone 4's `z = -8.0` wall (zero ceiling crack!)
 * - 2 Pressurized Explosive Plasma Barrels flanking the Grav-Core containment plinth!
 */
export function buildFloor6Zone6NorthEastGravCore(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const baseY = F6_BASE_Y;
  const upperY = F6_UPPER_Y;
  const ceilH = F6_CEILINGS.neGravCore; // 11.2m
  const gravAccent = mats.floorAccent[5]; // Electric violet-cyan Forerunner grav-core accent!
  const cyanAccent = mats.floorAccent[6];

  const wingGroup = new THREE.Group();
  wingGroup.name = 'F6_Z6_NE_GRAV_CORE_CELL';
  collector.group.add(wingGroup);

  // 1. Floor Slab, Watertight Ceiling Slab & Clerestory Header Seal over Zone 4 (`z = -8.0`)
  addWalkableDeck(collector, {
    minX: F6_WALLS.cathedralEastX,
    maxX: F6_WALLS.eastOuterX,
    minZ: F6_WALLS.northWingsNorthZ,
    maxZ: F6_WALLS.northWingsSplitZ,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    targetGroup: wingGroup,
    name: 'F6_Z6_GravFloor',
  });

  const ceilMesh = buildBatchedBoxesMesh(
    [
      // Main watertight ceiling slab (`x ∈ [18.3, 43.7], z ∈ [-27.7, -8.3]`, top = 81.11m < Floor 07 abyss!)
      { w: 25.4, h: 0.56, d: 19.4, x: 31.0, y: baseY + ceilH + 0.28, z: -18.0 },
      // Clerestory concrete header bridging Zone 4's 10.2m wall top up to Zone 6's 11.2m ceiling (ZERO crack!)
      {
        w: 25.4,
        h: ceilH - F6_CEILINGS.eastFoundry,
        d: 0.6,
        x: 31.0,
        y: baseY + F6_CEILINGS.eastFoundry + (ceilH - F6_CEILINGS.eastFoundry) * 0.5,
        z: F6_WALLS.northWingsSplitZ,
      },
    ],
    mats.darkConcrete,
    { receiveShadow: false, name: 'F6_Z6_GravCeilingAndHeader' }
  );
  if (ceilMesh) wingGroup.add(ceilMesh);

  // 2. Perimeter Walls (South wall z = -8.0 owned by Zone 4; West wall z ∈ [-16.7, -8.3] owned by Zone 2!)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F6_WALLS.cathedralEastX,
    spanStart: F6_WALLS.northWingsNorthZ + 0.3,
    spanEnd: F6_WALLS.cathedralNorthZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: wingGroup,
    name: 'F6_Z6_WestExteriorWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F6_WALLS.eastOuterX,
    spanStart: F6_WALLS.northWingsNorthZ + 0.3,
    spanEnd: F6_WALLS.northWingsSplitZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: wingGroup,
    name: 'F6_Z6_EastOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F6_WALLS.northWingsNorthZ,
    spanStart: F6_WALLS.cathedralEastX - 0.3,
    spanEnd: F6_WALLS.eastOuterX + 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWallLight,
    accentMat: gravAccent,
    targetGroup: wingGroup,
    name: 'F6_Z6_NorthOuterWall',
  });

  // 3. ELEVATED UPPER HALO OBSERVATION GALLERIES (`+4.4m = 74.4m`)
  // East Gallery (`x ∈ [38.4, 43.68], z ∈ [-27.68, -8.32]`) joining Zone 4's foundryToGravUpperX!
  addWalkableDeck(collector, {
    minX: 38.4,
    maxX: 43.68,
    minZ: -27.68,
    maxZ: -8.32,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: wingGroup,
    castShadow: true,
    name: 'F6_Z6_EastHaloGallery',
  });
  // North Gallery (`x ∈ [18.32, 38.4], z ∈ [-27.68, -23.4]`) — generous 4.28m landing deck for padGravCore!
  addWalkableDeck(collector, {
    minX: 18.32,
    maxX: 38.4,
    minZ: -27.68,
    maxZ: -23.4,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: wingGroup,
    castShadow: true,
    name: 'F6_Z6_NorthHaloGallery',
  });
  // West Connector (`x ∈ [18.32, 23.0], z ∈ [-23.4, -10.8]`) joining Zone 8's eastNorthUpperZ [-15.0..-11.0]!
  addWalkableDeck(collector, {
    minX: 18.32,
    maxX: 23.0,
    minZ: -23.4,
    maxZ: -10.8,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: wingGroup,
    castShadow: true,
    name: 'F6_Z6_WestHaloConnector',
  });

  // Exact Halo Gallery Guardrails (with dedicated 2.8m Jump Pad gap `x ∈ [29.6, 32.4]` along `z = -23.4`!)
  buildGuardrailRun(collector, mats, {
    x1: 38.4,
    z1: -23.4,
    x2: 38.4,
    z2: -8.32,
    y: upperY,
    accentMat: gravAccent,
    targetGroup: wingGroup,
  });
  buildGuardrailRun(collector, mats, {
    x1: 23.0,
    z1: -23.4,
    x2: 29.6,
    z2: -23.4,
    y: upperY,
    accentMat: gravAccent,
    targetGroup: wingGroup,
  });
  buildGuardrailRun(collector, mats, {
    x1: 32.4,
    z1: -23.4,
    x2: 38.4,
    z2: -23.4,
    y: upperY,
    accentMat: gravAccent,
    targetGroup: wingGroup,
  });
  buildGuardrailRun(collector, mats, {
    x1: 23.0,
    z1: -23.4,
    x2: 23.0,
    z2: -10.8,
    y: upperY,
    accentMat: gravAccent,
    targetGroup: wingGroup,
  });
  buildGuardrailRun(collector, mats, {
    x1: 18.32,
    z1: -10.8,
    x2: 23.0,
    z2: -10.8,
    y: upperY,
    accentMat: gravAccent,
    targetGroup: wingGroup,
  });

  // Calibrated Pneumatic Jump Pad (`padGravCore`) launching straight North (`-Z`) onto North Halo Gallery!
  buildJumpPad(collector, mats, {
    id: F6_IDS.padGravCore,
    x: 31.0,
    y: baseY,
    z: -21.8,
    launchVy: 13.4,
    launchVx: 0,
    launchVz: -3.4, // lands cleanly at z ≈ -25.7m inside North Gallery [-27.68, -23.4], y = 74.4m!
    targetGroup: wingGroup,
  });

  // 4. CENTERPIECE HERO: FORERUNNER GRAV-CORE PEDESTAL + TRIPLE COUNTER-ROTATING GYRO RINGS!
  const cx = 31.0;
  const cz = -16.8; // Centered cleanly South of padGravCore (-21.8) with generous 5.0m spacing!
  const gyroCenterY = baseY + 5.2;

  const armorSpecs: BoxSpec[] = [];
  const steelSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  const accSpecs: BoxSpec[] = [];

  // Stepped Armored Emitter Pedestal & Ceiling Collector Dome
  armorSpecs.push(
    { w: 4.8, h: 0.44, d: 4.8, x: cx, y: baseY + 0.22, z: cz },
    { w: 3.4, h: 0.62, d: 3.4, x: cx, y: baseY + 0.75, z: cz },
    { w: 2.2, h: 0.36, d: 2.2, x: cx, y: baseY + 1.24, z: cz },
    // Upper Ceiling Containment Collector Assembly
    { w: 4.4, h: 0.56, d: 4.4, x: cx, y: baseY + ceilH - 0.32, z: cz },
    { w: 2.8, h: 0.48, d: 2.8, x: cx, y: baseY + ceilH - 0.84, z: cz }
  );
  accSpecs.push(
    { w: 4.92, h: 0.1, d: 4.92, x: cx, y: baseY + 0.46, z: cz },
    { w: 2.36, h: 0.12, d: 2.36, x: cx, y: baseY + 1.44, z: cz },
    { w: 3.0, h: 0.12, d: 3.0, x: cx, y: baseY + ceilH - 1.08, z: cz }
  );
  collector.boxes.push({
    minX: cx - 2.45,
    maxX: cx + 2.45,
    minY: baseY,
    maxY: baseY + 1.45,
    minZ: cz - 2.45,
    maxZ: cz + 2.45,
    walkableTop: true,
  });

  // 4 Monumental Corner Containment Pylons cleanly OUTSIDE the 3.2m gyro sweep radius (`dist = 5.95m`)!
  const pylonH = ceilH - 0.56;
  for (const [px, pz] of [
    [cx - 4.5, cz - 3.9],
    [cx + 4.5, cz - 3.9],
    [cx - 4.5, cz + 3.9],
    [cx + 4.5, cz + 3.9],
  ] as const) {
    armorSpecs.push({ w: 1.15, h: pylonH, d: 1.15, x: px, y: baseY + 0.006 + pylonH * 0.5, z: pz });
    steelSpecs.push(
      { w: 1.42, h: 0.32, d: 1.42, x: px, y: baseY + 0.16, z: pz },
      { w: 1.42, h: 0.32, d: 1.42, x: px, y: baseY + 5.2, z: pz }
    );
    accSpecs.push(
      { w: 0.1, h: pylonH - 1.4, d: 0.08, x: px, y: baseY + pylonH * 0.5, z: pz + (pz < cz ? 0.6 : -0.6) }
    );
    collector.boxes.push({
      minX: px - 0.68,
      maxX: px + 0.68,
      minY: baseY,
      maxY: baseY + ceilH,
      minZ: pz - 0.68,
      maxZ: pz + 0.68,
      walkableTop: false,
    });
  }

  // Vertical Grav-Beam Plasma Column running cleanly through the center of the Gyro Assembly
  const beamGeo = new THREE.CylinderGeometry(0.22, 0.22, ceilH - 2.55, 16);
  const beamMesh = new THREE.Mesh(beamGeo, cyanAccent);
  beamMesh.position.set(cx, baseY + 1.45 + (ceilH - 2.55) * 0.5, cz);
  beamMesh.name = 'F6_Z6_GravContainmentBeam';
  wingGroup.add(beamMesh);

  // Triple Counter-Rotating Grav-Core Gyro Rings (`animatedSpinners`)!
  const outerPivot = new THREE.Group();
  outerPivot.position.set(cx, gyroCenterY, cz);
  const outerRingMesh = new THREE.Mesh(new THREE.TorusGeometry(3.05, 0.14, 12, 40), mats.armoredSteel);
  outerRingMesh.rotation.x = Math.PI * 0.14;
  outerRingMesh.castShadow = true;
  const outerTrimMesh = new THREE.Mesh(new THREE.TorusGeometry(2.86, 0.055, 8, 40), gravAccent);
  outerTrimMesh.rotation.x = Math.PI * 0.14;
  outerPivot.add(outerRingMesh, outerTrimMesh);
  wingGroup.add(outerPivot);
  collector.animatedSpinners?.push({ obj: outerPivot, speed: 0.52 });

  const midPivot = new THREE.Group();
  midPivot.position.set(cx, gyroCenterY, cz);
  const midRingMesh = new THREE.Mesh(new THREE.TorusGeometry(2.22, 0.12, 12, 36), mats.structuralSteel);
  midRingMesh.rotation.x = Math.PI * 0.5 - 0.42;
  midRingMesh.rotation.z = 0.28;
  const midTrimMesh = new THREE.Mesh(new THREE.TorusGeometry(2.06, 0.05, 8, 36), cyanAccent);
  midTrimMesh.rotation.x = Math.PI * 0.5 - 0.42;
  midTrimMesh.rotation.z = 0.28;
  midPivot.add(midRingMesh, midTrimMesh);
  wingGroup.add(midPivot);
  collector.animatedSpinners?.push({ obj: midPivot, speed: -0.92 });

  const corePivot = new THREE.Group();
  corePivot.position.set(cx, gyroCenterY, cz);
  const innerRingMesh = new THREE.Mesh(new THREE.TorusGeometry(1.38, 0.08, 10, 32), gravAccent);
  innerRingMesh.rotation.x = Math.PI * 0.35;
  const octaCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), mats.ceilingLight);
  corePivot.add(innerRingMesh, octaCore);
  wingGroup.add(corePivot);
  collector.animatedSpinners?.push({ obj: corePivot, speed: 1.55 });

  // 5. Overhead Steel Trusses, Gallery Support Columns, Ceiling Lights & Floor Perimeter Lines
  for (let z = -25.0; z <= -11.0; z += 4.6) {
    steelSpecs.push({ w: 25.32, h: 0.46, d: 0.4, x: 31.0, y: baseY + ceilH - 0.24, z });
    lightSpecs.push({ w: 18.0, h: 0.08, d: 0.32, x: 31.0, y: baseY + ceilH - 0.06, z: z + 2.0 });
  }
  for (const [gx, gz] of [
    [38.64, -23.16],
    [38.64, -15.6],
    [38.64, -8.8],
    [22.76, -23.16],
    [22.76, -11.04],
  ] as const) {
    steelSpecs.push({ w: 0.42, h: 3.972, d: 0.42, x: gx, y: baseY + 0.004 + 1.986, z: gz });
    collector.boxes.push({
      minX: gx - 0.24,
      maxX: gx + 0.24,
      minY: baseY,
      maxY: upperY,
      minZ: gz - 0.24,
      maxZ: gz + 0.24,
      walkableTop: false,
    });
  }

  // Luminous floor framing lines around the Grav-Core arena
  accSpecs.push(
    { w: 11.4, h: 0.012, d: 0.12, x: cx, y: baseY + 0.008, z: cz - 5.2 },
    { w: 11.4, h: 0.012, d: 0.12, x: cx, y: baseY + 0.008, z: cz + 5.2 },
    { w: 0.12, h: 0.012, d: 10.4, x: cx - 5.7, y: baseY + 0.008, z: cz },
    { w: 0.12, h: 0.012, d: 10.4, x: cx + 5.7, y: baseY + 0.008, z: cz }
  );

  const armorMesh = buildBatchedBoxesMesh(armorSpecs, mats.armoredSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F6_Z6_GravArmor',
  });
  if (armorMesh) {
    wingGroup.add(armorMesh);
    collector.wallMeshes.push(armorMesh);
  }
  const steelMesh = buildBatchedBoxesMesh(steelSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F6_Z6_GravSteel',
  });
  if (steelMesh) {
    wingGroup.add(steelMesh);
    collector.wallMeshes.push(steelMesh);
  }
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F6_Z6_GravLights' });
  if (lightMesh) wingGroup.add(lightMesh);
  const accMesh = buildBatchedBoxesMesh(accSpecs, gravAccent, { name: 'F6_Z6_GravAccents' });
  if (accMesh) wingGroup.add(accMesh);

  // 6. Telemetry Consoles, Wall Equipment Bays, Cover Barricades & 2 Explosive Plasma Barrels!
  buildWallEquipmentBays(
    collector,
    mats,
    [
      { axis: 'x', coord: -27.7, inwardDir: 1, centerAlong: 24.4, baseY, width: 4.8, height: 3.1, depth: 0.56 },
      { axis: 'x', coord: -27.7, inwardDir: 1, centerAlong: 37.6, baseY, width: 4.8, height: 3.1, depth: 0.56 },
    ],
    { targetGroup: wingGroup, accentMat: gravAccent, name: 'F6_Z6_GravLockers' }
  );
  buildTacticalConsoleBenches(
    collector,
    mats,
    [
      // Twin flanking upper telemetry benches leaving x = 31.0 jump-pad landing runway 100% open!
      { x: 25.8, y: upperY, z: -26.4, w: 3.0, h: 0.96, d: 0.92 },
      { x: 36.2, y: upperY, z: -26.4, w: 3.0, h: 0.96, d: 0.92 },
      { x: 41.4, y: baseY, z: -16.8, w: 1.05, h: 0.98, d: 3.4 },
    ],
    { targetGroup: wingGroup, accentMat: gravAccent, name: 'F6_Z6_GravConsoles' }
  );
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: 24.8, y: baseY, z: -12.2, w: 2.6, h: 1.0, d: 0.98, walkableTop: true },
      { x: 37.2, y: baseY, z: -12.2, w: 2.6, h: 1.0, d: 0.98, walkableTop: true },
    ],
    { targetGroup: wingGroup, accentMat: mats.hazardStripe, name: 'F6_Z6_GravBarricades' }
  );

  buildExplosiveBarrel(collector, mats, {
    id: 'f6_barrel_grav_w',
    x: 24.8,
    y: baseY,
    z: -16.8,
    targetGroup: wingGroup,
  });
  buildExplosiveBarrel(collector, mats, {
    id: 'f6_barrel_grav_e',
    x: 37.2,
    y: baseY,
    z: -16.8,
    targetGroup: wingGroup,
  });

  // High-Readability Architectural Stencil Signage cleanly above North Gallery rail!
  addWallStencilPlaque(wingGroup, mats, {
    code: '06-G',
    title: 'GRAV-CORE TEST CHAMBER',
    subtitle: 'GYRO CONTAINMENT FIELD · PNEUMATIC JUMP PAD TO UPPER HALO',
    accentHex: 0xa855f7,
    x: 31.0,
    y: baseY + 8.6,
    z: -27.62,
    rotY: 0,
    width: 7.4,
    height: 1.58,
  });

  return {
    id: 'f6_ne_grav_core',
    group: wingGroup,
    center: new THREE.Vector3(31.0, baseY + 4.0, -18.0),
    triggerBounds: {
      minX: 12.0,
      maxX: 46.0,
      minZ: -30.0,
      maxZ: -4.0,
    },
    maxViewDistance: 36.0,
  };
}
