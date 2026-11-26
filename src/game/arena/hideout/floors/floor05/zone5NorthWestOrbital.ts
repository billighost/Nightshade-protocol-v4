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
} from '../../architecture';
import { buildGuardrailRun, type FloorGeometryCollector } from '../../stairs';
import type { OcclusionCell } from '../../types';
import {
  buildExplosiveBarrel,
  buildJumpPad,
  buildLockedSecurityGate,
  buildShootableLock,
} from '../../mechanics';
import {
  F5_BASE_Y,
  F5_CEILINGS,
  F5_IDS,
  F5_PORTALS,
  F5_UPPER_Y,
  F5_WALLS,
} from './layout';

/**
 * FLOOR 05 — ZONE 5 (NORTH-WEST OCCLUSION CELL): ORBITAL TELEMETRY & SATELLITE DISH ARRAY
 * Footprint: x ∈ [-48.0, -18.0] (30m wide) × z ∈ [-32.0, -10.0] (22m deep), Ceiling: 10.8m
 *
 * Halo Orbital Command / Control Deep-Space Relay Dish Chamber:
 * - Colossal Kinetic Rotating Orbital Satellite Dish & Dual Telemetry Signal Rings (`animatedSpinners`)
 *   mounted on an armored stepped command pedestal at `(-33.0, 56.0, -18.2)`!
 * - Continuous U-Shaped Upper Telemetry Catwalk (`y = 60.4m`) linking Zone 3 `simToOrbitalUpperX`,
 *   North Observation Deck, and Coliseum `westNorthUpperZ`!
 * - Calibrated Pneumatic Jump Pad (`padNwOrbital`) launching North (`-Z`) cleanly through a dedicated
 *   `2.8m` guardrail gap onto the unobstructed North Observation Deck (`z ∈ [-31.68, -27.2], y = 60.4m`)!
 * - Locked Orbital Bypass Security Gate (`f5_gate_nw_bypass`) mounted in Coliseum's `westNorthGroundZ`
 *   portal, unlocked by sniping the glowing crimson Relay Lock (`f5_lock_nw_bypass`) on the North wall!
 * - Clerestory `0.6m` concrete header along `z = -10.0` sealing Zone 3's `10.2m` top up to `10.8m` (ZERO cracks!).
 */
export function buildFloor5Zone5NorthWestOrbital(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const baseY = F5_BASE_Y; // 56.0m
  const upperY = F5_UPPER_Y; // 60.4m
  const ceilH = F5_CEILINGS.nwOrbital; // 10.8m
  const accentMat = mats.floorAccent[6]; // Cobalt orbital cyan!
  const roseMat = mats.floorAccent[5];
  const cellGroup = new THREE.Group();
  cellGroup.name = 'F5_ZONE5_NW_ORBITAL';
  collector.group.add(cellGroup);

  // 1. Floor, Roof & Clerestory Height-Transition Seal (`z = -10.0`, `y = 66.2 .. 66.8m` -> ZERO crack!)
  addWalkableDeck(collector, {
    minX: F5_WALLS.westOuterX,
    maxX: F5_WALLS.coliseumWestX,
    minZ: F5_WALLS.northWingsOuterZ,
    maxZ: F5_WALLS.northSplitZ,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    targetGroup: cellGroup,
    name: 'F5_Z5_OrbitalFloor',
  });
  const sealH = ceilH - F5_CEILINGS.westSimDeck + 0.04;
  const ceilMesh = buildBatchedBoxesMesh(
    [
      { w: 29.4, h: 0.5, d: 21.4, x: -33.0, y: baseY + ceilH + 0.25, z: -21.0 },
      // Clerestory concrete header bridging Zone 3's wall top up to Zone 5's ceiling!
      { w: 29.4, h: sealH, d: 0.6, x: -33.0, y: baseY + F5_CEILINGS.westSimDeck + sealH * 0.5 + 0.004, z: F5_WALLS.northSplitZ },
    ],
    mats.darkConcrete,
    { receiveShadow: false, name: 'F5_Z5_OrbitalCeilingAndSeal' }
  );
  if (ceilMesh) cellGroup.add(ceilMesh);

  // 2. Exterior Perimeter Walls (West `x = -48`, North `z = -32`, East `x = -18` for `z ∈ [-31.7, -17.3]`)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F5_WALLS.westOuterX,
    spanStart: F5_WALLS.northWingsOuterZ + 0.3,
    spanEnd: F5_WALLS.northSplitZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: cellGroup,
    name: 'F5_Z5_WestOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F5_WALLS.northWingsOuterZ,
    spanStart: F5_WALLS.westOuterX - 0.3,
    spanEnd: F5_WALLS.coliseumWestX + 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: cellGroup,
    name: 'F5_Z5_NorthOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F5_WALLS.coliseumWestX,
    spanStart: F5_WALLS.northWingsOuterZ + 0.3,
    spanEnd: F5_WALLS.coliseumNorthZ - 0.3, // Cleanly butts Zone 1 North wall at -17.3!
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: cellGroup,
    name: 'F5_Z5_EastOuterWall',
  });

  // Overhead Vaulted Radial Beams & Crisp High-Bay Ceiling Lights
  const beamSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  for (const bz of [-26.5, -21.0, -15.5]) {
    beamSpecs.push({ w: 29.32, h: 0.46, d: 0.42, x: -33.0, y: baseY + ceilH - 0.24, z: bz });
    lightSpecs.push(
      { w: 9.6, h: 0.08, d: 0.34, x: -39.2, y: baseY + ceilH - 0.06, z: bz + 2.2 },
      { w: 9.6, h: 0.08, d: 0.34, x: -26.8, y: baseY + ceilH - 0.06, z: bz + 2.2 }
    );
  }
  const beamMesh = buildBatchedBoxesMesh(beamSpecs, mats.structuralSteel, { name: 'F5_Z5_RoofBeams' });
  if (beamMesh) cellGroup.add(beamMesh);
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F5_Z5_RoofLights' });
  if (lightMesh) cellGroup.add(lightMesh);

  // 3. CENTERPIECE HERO: COLOSSAL ROTATING ORBITAL SATELLITE DISH & SIGNAL ARRAY (`-33.0, 56.0, -18.2`)!
  const dx = -33.0;
  const dz = -18.2;
  const basePedestalSpecs: BoxSpec[] = [
    { w: 5.4, h: 0.42, d: 5.4, x: dx, y: baseY + 0.214, z: dz },
    { w: 3.8, h: 1.15, d: 3.8, x: dx, y: baseY + 1.0, z: dz },
    { w: 2.2, h: 1.35, d: 2.2, x: dx, y: baseY + 2.25, z: dz },
    // Heavy steel azimuth rotary turret ring solidly bridging pedestal up to dish pivot (`y = 2.92 -> 4.10`)!
    { w: 1.45, h: 1.15, d: 1.45, x: dx, y: baseY + 3.48, z: dz },
  ];
  const pedMesh = buildBatchedBoxesMesh(basePedestalSpecs, mats.armoredSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F5_Z5_DishPedestal',
  });
  if (pedMesh) {
    cellGroup.add(pedMesh);
    collector.wallMeshes.push(pedMesh);
  }
  const pedGlow = buildBatchedBoxesMesh(
    [
      { w: 4.0, h: 0.1, d: 4.0, x: dx, y: baseY + 1.56, z: dz },
      { w: 1.62, h: 0.1, d: 1.62, x: dx, y: baseY + 3.24, z: dz },
    ],
    accentMat,
    { name: 'F5_Z5_DishPedestalTrim' }
  );
  if (pedGlow) cellGroup.add(pedGlow);

  collector.boxes.push({
    minX: dx - 2.75,
    maxX: dx + 2.75,
    minY: baseY,
    maxY: baseY + 3.6,
    minZ: dz - 2.75,
    maxZ: dz + 2.75,
    walkableTop: false,
  });

  // Kinetic Rotating Parabolic Orbital Dish Assembly (`animatedSpinners`)!
  const dishPivot = new THREE.Group();
  dishPivot.name = 'F5_Z5_RotatingOrbitalDish';
  dishPivot.position.set(dx, baseY + 4.45, dz);

  // Twin armored rotary gimbal yoke arms firmly clasping the dish cradle down into the azimuth turret!
  const yokeMesh = buildBatchedBoxesMesh(
    [
      { w: 1.56, h: 0.28, d: 0.92, x: 0, y: -0.52, z: 0 },
      { w: 0.26, h: 0.92, d: 0.54, x: -0.68, y: -0.06, z: 0 },
      { w: 0.26, h: 0.92, d: 0.54, x: 0.68, y: -0.06, z: 0 },
    ],
    mats.brushedMetal,
    { castShadow: true, name: 'F5_Z5_DishGimbalYoke' }
  );
  if (yokeMesh) dishPivot.add(yokeMesh);

  const dishTilt = new THREE.Group();
  dishTilt.position.y = 0.22;
  dishTilt.rotation.x = -0.38; // Angled dramatically skyward!

  // Heavy parabolic dish bowl + 6 structural outer petal ribs + central glowing transceiver spire
  const dishBowl = new THREE.Mesh(new THREE.CylinderGeometry(3.35, 1.05, 0.72, 16, 1, true), mats.structuralSteel);
  dishBowl.material = mats.structuralSteel;
  const dishBackPlate = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.75, 0.56, 12), mats.armoredSteel);
  dishBackPlate.position.y = -0.35;
  const dishOuterRing = new THREE.Mesh(new THREE.TorusGeometry(3.38, 0.14, 10, 32), accentMat);
  dishOuterRing.rotation.x = Math.PI * 0.5;
  dishOuterRing.position.y = 0.36;
  const dishInnerRing = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.08, 8, 24), roseMat);
  dishInnerRing.rotation.x = Math.PI * 0.5;
  dishInnerRing.position.y = 0.05;
  const dishSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 2.8, 10), mats.brushedMetal);
  dishSpire.position.y = 1.25;
  const dishBeacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), accentMat);
  dishBeacon.position.y = 2.75;

  dishTilt.add(dishBowl, dishBackPlate, dishOuterRing, dishInnerRing, dishSpire, dishBeacon);
  dishPivot.add(dishTilt);
  cellGroup.add(dishPivot);
  collector.animatedSpinners?.push({ obj: dishPivot, speed: 0.46 });

  // 4. CONTINUOUS U-SHAPED UPPER TELEMETRY CATWALK (`y = 60.4m`)
  // West Arm (`x ∈ [-47.68, -42.4]`, connects Zone 3 `simToOrbitalUpperX [-46.6, -42.6]`!)
  addWalkableDeck(collector, {
    minX: -47.68,
    maxX: -42.4,
    minZ: -31.68,
    maxZ: -10.32,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F5_Z5_WestUpperArm',
  });
  // North Observation Deck (`x ∈ [-42.4, -22.2], z ∈ [-31.68, -27.2]` — unobstructed Jump Pad landing runway at `x = -33.0`!)
  addWalkableDeck(collector, {
    minX: -42.4,
    maxX: -22.2,
    minZ: -31.68,
    maxZ: -27.2,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F5_Z5_NorthUpperDeck',
  });
  // East Arm (`x ∈ [-22.2, -18.32], z ∈ [-31.68, -10.6]` — links directly into Coliseum `westNorthUpperZ [-15.0, -11.0]`!)
  addWalkableDeck(collector, {
    minX: -22.2,
    maxX: -18.32,
    minZ: -31.68,
    maxZ: -10.6,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F5_Z5_EastUpperArm',
  });

  // Grounded columns supporting the U-shaped Upper Telemetry Catwalk
  const colSpecs: BoxSpec[] = [];
  for (const [cx, cz] of [
    [-42.65, -27.4],
    [-42.65, -18.0],
    [-42.65, -10.8],
    [-21.95, -27.4],
    [-21.95, -18.0],
    [-21.95, -11.0],
  ] as const) {
    colSpecs.push({ w: 0.42, h: 3.972, d: 0.42, x: cx, y: baseY + 0.004 + 1.986, z: cz });
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
  const colMesh = buildBatchedBoxesMesh(colSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F5_Z5_CatwalkColumns',
  });
  if (colMesh) {
    cellGroup.add(colMesh);
    collector.wallMeshes.push(colMesh);
  }

  // Exact Guardrails leaving clean `2.8m` Jump Pad landing gap (`x ∈ [-34.4, -31.6]`) along `z = -27.2`!
  buildGuardrailRun(collector, mats, { x1: -42.4, z1: -27.2, x2: -42.4, z2: -10.32, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -42.4, z1: -27.2, x2: -34.4, z2: -27.2, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -31.6, z1: -27.2, x2: -22.2, z2: -27.2, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -22.2, z1: -27.2, x2: -22.2, z2: -10.6, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -22.2, z1: -10.6, x2: -18.32, z2: -10.6, y: upperY, accentMat, targetGroup: cellGroup });

  // 5. CALIBRATED PNEUMATIC JUMP PAD (`padNwOrbital`) launching North (`-Z`) onto North Observation Deck!
  buildJumpPad(collector, mats, {
    id: F5_IDS.padNwOrbital,
    x: -33.0,
    y: baseY,
    z: -24.8,
    launchVy: 13.4,
    launchVx: 0,
    launchVz: -3.5, // Lands cleanly at z ≈ -28.4 on the unobstructed 60.4m North Observation Deck!
    targetGroup: cellGroup,
  });

  // 6. LOCKED ORBITAL BYPASS SECURITY GATE (`f5_gate_nw_bypass`) + SHOOTABLE NORTH WALL RELAY (`f5_lock_nw_bypass`)!
  // Mounted in Zone 2's `westNorthGroundZ [-15.4, -10.8]` portal — provides a tactical shortcut back to North Arrival Spawn!
  buildLockedSecurityGate(collector, mats, {
    id: F5_IDS.gateNwBypass,
    label: 'ORBITAL BYPASS GATE',
    x: F5_WALLS.coliseumWestX,
    y: baseY,
    z: (F5_PORTALS.westNorthGroundZ[0] + F5_PORTALS.westNorthGroundZ[1]) * 0.5,
    width: F5_PORTALS.westNorthGroundZ[1] - F5_PORTALS.westNorthGroundZ[0],
    height: 4.0,
    spanAxis: 'z',
    lockedHint: 'ORBITAL BYPASS SEALED · SHOOT RELAY IN NW ORBITAL ARRAY',
    targetGroup: collector.group, // Keep visible from Coliseum side too!
  });

  buildShootableLock(collector, mats, {
    id: F5_IDS.lockNwBypass,
    x: -33.0,
    y: baseY + 6.4,
    z: -31.52,
    rotY: 0, // Faces South (+Z) straight across the Rotating Orbital Dish!
    bannerText: 'ORBITAL RELAY SHATTERED · COLISEUM BYPASS GATE UNLOCKED',
    unlockGateId: F5_IDS.gateNwBypass,
    targetGroup: cellGroup,
  });

  // 7. Off-Center Telemetry Consoles (well clear of Jump Pad landing runway at `x = -33.0`!), Cover & 2 Explosive Barrels
  buildTacticalConsoleBenches(
    collector,
    mats,
    [
      { x: -38.8, y: upperY, z: -30.8, w: 3.4, h: 1.0, d: 0.78 },
      { x: -27.2, y: upperY, z: -30.8, w: 3.4, h: 1.0, d: 0.78 },
    ],
    { targetGroup: cellGroup, accentMat, name: 'F5_Z5_TelemetryConsoles' }
  );

  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -39.4, y: baseY, z: -18.2, w: 0.92, h: 1.0, d: 2.8, walkableTop: true },
      { x: -26.4, y: baseY, z: -18.2, w: 0.92, h: 1.0, d: 2.8, walkableTop: true },
    ],
    { targetGroup: cellGroup, accentMat: mats.hazardStripe, name: 'F5_Z5_OrbitalCover' }
  );

  buildExplosiveBarrel(collector, mats, { id: 'f5_barrel_nw_w', x: -38.4, y: baseY, z: -22.6, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f5_barrel_nw_e', x: -27.6, y: baseY, z: -22.6, targetGroup: cellGroup });

  // High-Contrast Orbital Wayfinding Signage (above North Observation Deck & Relay!)
  addWallStencilPlaque(cellGroup, mats, {
    code: 'ORB-5',
    title: 'ORBITAL TELEMETRY DISH ARRAY',
    subtitle: 'DEEP-SPACE RELAY · BYPASS LOCK · JUMP-PAD OVERLOOK',
    accentHex: 0x38bdf8,
    x: -33.0,
    y: baseY + 8.6,
    z: -31.62,
    rotY: 0,
    width: 6.6,
    height: 1.48,
  });

  return {
    id: 'f5_nw_orbital',
    group: cellGroup,
    triggerBounds: { minX: -48.5, maxX: -14.0, minZ: -32.5, maxZ: -6.5 },
    center: { x: -33.0, z: -21.0 },
    maxViewDistance: 46.0,
  };
}
