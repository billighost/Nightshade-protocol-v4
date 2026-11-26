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
import type { OcclusionCell } from '../../types';
import {
  buildExplosiveBarrel,
  buildJumpPad,
  buildLockedSecurityGate,
  buildShootableLock,
  buildWorldSwitch,
} from '../../mechanics';
import {
  F4_BASE_Y,
  F4_CEILINGS,
  F4_IDS,
  F4_PORTALS,
  F4_UPPER_Y,
  F4_WALLS,
} from './layout';

/**
 * FLOOR 04 — ZONE 5 (NW OCCLUSION CELL): HIGH-VOLTAGE SUBSTATION & RELAY SWITCHYARD
 * Footprint: x ∈ [-48.0, -18.0] (30m) × z ∈ [-32.0, -10.0] (22m), 10.2m tall!
 *
 * Signature Halo Forerunner Relay × CoD Power Switchyard:
 * - 4 Towering Multi-Part High-Voltage Transformer Pylons (`8.2m` tall) with ceramic insulator rings,
 *   overhead amber/cyan high-voltage busbar trusses & grounded capacitor banks!
 * - Continuous U-Shaped `+4.4m` Upper Substation Catwalk (`y = 46.4m`) linking Zone 3 Hydro Dam
 *   (`hydroToSubstationUpperX`) & Zone 2 West Suspension Tower (`westNorthUpperZ`)!
 * - Calibrated North Pneumatic Jump Pad (`f4_pad_substation_nw`) launching cleanly onto the North Catwalk
 *   through a dedicated guardrail opening (`x ∈ [-34.6, -31.4]`)!
 * - Locked Substation Bypass Security Gate (`f4_gate_nw_substation`) guarding the shortcut into Zone 9
 *   Extraction Concourse (`x = -18.0, z ∈ [-15.4, -10.8]`), unlockable via `[E]` Switch OR Shootable Relay Lock!
 */
export function buildFloor4Zone5NorthWestSubstation(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const baseY = F4_BASE_Y; // 42.0m
  const upperY = F4_UPPER_Y; // 46.4m
  const ceilH = F4_CEILINGS.nwSubstation; // 10.2m
  const hydroMat = mats.floorAccent[6]; // High-voltage electric cyan
  const amberMat = mats.floorAccent[4]; // Amber danger accent

  const cellGroup = new THREE.Group();
  cellGroup.name = 'F4_Z5_NW_SUBSTATION';
  collector.group.add(cellGroup);

  // 1. Floor & Coffered Ceiling Slabs (`x ∈ [-48.0, -18.0], z ∈ [-32.0, -10.0]`)
  addWalkableDeck(collector, {
    minX: F4_WALLS.westOuterX,
    maxX: F4_WALLS.canyonWestX,
    minZ: F4_WALLS.northWingsOuterZ,
    maxZ: F4_WALLS.northSplitZ,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    targetGroup: cellGroup,
    name: 'F4_Z5_SubstationFloor',
  });

  const ceilMesh = buildBatchedBoxesMesh(
    [{ w: 29.4, h: 0.5, d: 21.4, x: -33.0, y: baseY + ceilH + 0.25, z: -21.0 }],
    mats.darkConcrete,
    { receiveShadow: false, name: 'F4_Z5_SubstationCeiling' }
  );
  if (ceilMesh) cellGroup.add(ceilMesh);

  // Overhead High-Voltage Busbar Trusses & Lighting
  const trussSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  for (const tz of [-28.0, -21.0, -14.0]) {
    trussSpecs.push({ w: 29.3, h: 0.44, d: 0.42, x: -33.0, y: baseY + ceilH - 0.24, z: tz });
    lightSpecs.push(
      { w: 9.2, h: 0.08, d: 0.34, x: -39.2, y: baseY + ceilH - 0.06, z: tz + 2.4 },
      { w: 9.2, h: 0.08, d: 0.34, x: -26.8, y: baseY + ceilH - 0.06, z: tz + 2.4 }
    );
  }
  const trussMesh = buildBatchedBoxesMesh(trussSpecs, mats.structuralSteel, { name: 'F4_Z5_BusbarTrusses' });
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F4_Z5_RoofLights' });
  if (trussMesh) cellGroup.add(trussMesh);
  if (lightMesh) cellGroup.add(lightMesh);

  // 2. Perimeter Walls (North Outer `z = -32.0`, West Outer `x = -48.0`, East Solid Segment `x = -18.0, z ∈ [-31.7, -16.7]`)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F4_WALLS.northWingsOuterZ,
    spanStart: F4_WALLS.westOuterX,
    spanEnd: F4_WALLS.canyonWestX,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat: hydroMat,
    targetGroup: cellGroup,
    name: 'F4_Z5_NorthOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F4_WALLS.westOuterX,
    spanStart: F4_WALLS.northWingsOuterZ + 0.3,
    spanEnd: F4_WALLS.northSplitZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat: hydroMat,
    targetGroup: cellGroup,
    name: 'F4_Z5_WestOuterWall',
  });
  // East Wall Segment cleanly north of Zone 2's Canyon West Wall (`z ∈ [-31.7, -16.7]`)!
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F4_WALLS.canyonWestX,
    spanStart: F4_WALLS.northWingsOuterZ + 0.31,
    spanEnd: F4_WALLS.canyonNorthZ - 0.31,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    accentMat: hydroMat,
    targetGroup: cellGroup,
    name: 'F4_Z5_EastSolidWall',
  });

  // 3. HERO LANDMARK: 4 TOWERING MULTI-PART HIGH-VOLTAGE TRANSFORMER PYLONS + OVERHEAD BUSBARS!
  const pylonBodySpecs: BoxSpec[] = [];
  const pylonCollarSpecs: BoxSpec[] = [];
  const pylonGlowSpecs: BoxSpec[] = [];
  const pylonCoords: Array<[number, number]> = [
    [-37.2, -21.8],
    [-28.8, -21.8],
    [-37.2, -15.4],
    [-28.8, -15.4],
  ];
  for (const [px, pz] of pylonCoords) {
    // Grounded heavy concrete-steel transformer plinth + core radiator block + vertical mast up to busbars!
    pylonBodySpecs.push(
      { w: 2.5, h: 0.44, d: 2.5, x: px, y: baseY + 0.224, z: pz },
      { w: 1.9, h: 3.1, d: 1.9, x: px, y: baseY + 1.994, z: pz },
      { w: 0.72, h: 4.9, d: 0.72, x: px, y: baseY + 6.02, z: pz }
    );
    // 3 Ceramic Insulator Disks stacked cleanly along upper transformer mast
    for (const dy of [4.2, 5.4, 6.6]) {
      pylonCollarSpecs.push({ w: 1.48, h: 0.22, d: 1.48, x: px, y: baseY + dy, z: pz });
    }
    // Glowing cyan/amber charge telemetry strips proud of core flanks
    pylonGlowSpecs.push(
      { w: 1.4, h: 0.12, d: 0.04, x: px, y: baseY + 2.9, z: pz + 0.97 },
      { w: 1.4, h: 0.12, d: 0.04, x: px, y: baseY + 2.9, z: pz - 0.97 }
    );
    collector.boxes.push({
      minX: px - 1.28,
      maxX: px + 1.28,
      minY: baseY,
      maxY: baseY + 3.6,
      minZ: pz - 1.28,
      maxZ: pz + 1.28,
      walkableTop: false,
    });
  }
  // Overhead High-Voltage Busbar Conduits linking all 4 Pylons at `y = baseY + 8.3m`!
  pylonGlowSpecs.push(
    { w: 8.6, h: 0.16, d: 0.16, x: -33.0, y: baseY + 8.35, z: -21.8 },
    { w: 8.6, h: 0.16, d: 0.16, x: -33.0, y: baseY + 8.35, z: -15.4 },
    { w: 0.16, h: 0.16, d: 6.4, x: -37.2, y: baseY + 8.55, z: -18.6 },
    { w: 0.16, h: 0.16, d: 6.4, x: -28.8, y: baseY + 8.55, z: -18.6 }
  );

  const pylonBodyMesh = buildBatchedBoxesMesh(pylonBodySpecs, mats.armoredSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F4_Z5_TransformerPylons',
  });
  const pylonCollarMesh = buildBatchedBoxesMesh(pylonCollarSpecs, mats.brushedMetal, {
    castShadow: true,
    name: 'F4_Z5_InsulatorDisks',
  });
  const pylonGlowMesh = buildBatchedBoxesMesh(pylonGlowSpecs, hydroMat, { name: 'F4_Z5_HighVoltageBusbars' });
  if (pylonBodyMesh) {
    cellGroup.add(pylonBodyMesh);
    collector.wallMeshes.push(pylonBodyMesh);
  }
  if (pylonCollarMesh) cellGroup.add(pylonCollarMesh);
  if (pylonGlowMesh) cellGroup.add(pylonGlowMesh);

  // Centerpiece Colossal Rotating High-Voltage Tesla Inductor Core (`x = -33.0, z = -18.6`)!
  const teslaX = -33.0;
  const teslaZ = -18.6;
  const teslaPlinth = buildBatchedBoxesMesh(
    [
      { w: 2.6, h: 0.52, d: 2.6, x: teslaX, y: baseY + 0.264, z: teslaZ },
      { w: 1.64, h: 0.72, d: 1.64, x: teslaX, y: baseY + 0.884, z: teslaZ },
      { w: 1.4, h: 0.44, d: 1.4, x: teslaX, y: baseY + 8.12, z: teslaZ },
    ],
    mats.armoredSteel,
    { castShadow: true, receiveShadow: true, name: 'F4_Z5_TeslaPlinth' }
  );
  if (teslaPlinth) {
    cellGroup.add(teslaPlinth);
    collector.wallMeshes.push(teslaPlinth);
  }
  const teslaCoreBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 6.72, 20), hydroMat);
  teslaCoreBeam.name = 'F4_Z5_TeslaCoreBeam';
  teslaCoreBeam.position.set(teslaX, baseY + 4.58, teslaZ);
  cellGroup.add(teslaCoreBeam);

  const teslaSpinner = new THREE.Group();
  teslaSpinner.name = 'F4_Z5_TeslaInductorRings';
  teslaSpinner.position.set(teslaX, baseY + 4.4, teslaZ);
  for (let r = 0; r < 3; r++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.18 + (r === 1 ? 0.34 : 0), 0.08, 10, 28),
      r === 1 ? hydroMat : mats.brushedMetal
    );
    ring.rotation.x = Math.PI * 0.5 + (r === 0 ? 0.32 : r === 2 ? -0.32 : 0);
    ring.position.y = (r - 1) * 1.45;
    teslaSpinner.add(ring);
  }
  const teslaFins = buildBatchedBoxesMesh(
    [
      { w: 2.65, h: 0.14, d: 0.22, x: 0, y: 0, z: 0 },
      { w: 0.22, h: 0.14, d: 2.65, x: 0, y: 0.016, z: 0 },
    ],
    mats.structuralSteel,
    { name: 'F4_Z5_TeslaFins' }
  );
  if (teslaFins) teslaSpinner.add(teslaFins);
  cellGroup.add(teslaSpinner);
  collector.animatedSpinners?.push({ obj: teslaSpinner, speed: 1.45 });

  collector.boxes.push({
    minX: teslaX - 1.35,
    maxX: teslaX + 1.35,
    minY: baseY,
    maxY: baseY + 4.8,
    minZ: teslaZ - 1.35,
    maxZ: teslaZ + 1.35,
    walkableTop: false,
  });

  // 4. CONTINUOUS U-SHAPED `+4.4m` UPPER SUBSTATION CATWALK (`y = 46.4m`)!
  // West Run (`x ∈ [-47.68, -42.4], z ∈ [-31.68, -10.32]`)
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
    name: 'F4_Z5_WestCatwalk',
  });
  // East Run (`x ∈ [-22.4, -18.32], z ∈ [-31.68, -10.32]`) meeting Zone 2 `westNorthUpperZ: [-15.0, -11.0]`!
  addWalkableDeck(collector, {
    minX: -22.4,
    maxX: -18.32,
    minZ: -31.68,
    maxZ: -10.32,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F4_Z5_EastCatwalk',
  });
  // North Connecting Bridge (`x ∈ [-42.4, -22.4], z ∈ [-31.68, -26.8]`, visually inset 6mm at both X seams!)
  const northCatMesh = buildBatchedBoxesMesh(
    [{ w: 19.988, h: 0.42, d: 4.88, x: -32.4, y: upperY - 0.21, z: -29.24 }],
    mats.catwalkGrate,
    { castShadow: true, receiveShadow: true, name: 'F4_Z5_NorthCatwalkBridge' }
  );
  if (northCatMesh) {
    cellGroup.add(northCatMesh);
    collector.wallMeshes.push(northCatMesh);
  }
  collector.slabs.push({ minX: -42.4, maxX: -22.4, minZ: -31.68, maxZ: -26.8, y: upperY, thickness: 0.42 });

  // Grounded Support Columns for U-Shaped Catwalk
  const colSpecs: BoxSpec[] = [];
  const colH = upperY - 0.42 - (baseY + 0.004);
  for (const [cx, cz] of [
    [-42.7, -26.5],
    [-42.7, -18.2],
    [-42.7, -11.2],
    [-22.1, -26.5],
    [-22.1, -18.2],
  ] as const) {
    colSpecs.push({ w: 0.42, h: colH, d: 0.42, x: cx, y: baseY + 0.004 + colH * 0.5, z: cz });
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
    name: 'F4_Z5_CatwalkCols',
  });
  if (colMesh) {
    cellGroup.add(colMesh);
    collector.wallMeshes.push(colMesh);
  }

  // Flush West-Catwalk Interior Staircase (`x = -41.12, width = 2.44` -> minX = -42.34 flush to West Catwalk `-42.40`!)
  // Ascends South->North (`z = -14.4` baseY -> `z = -22.6` upperY) onto a dedicated Top Landing Deck (`z ∈ [-25.0, -22.6]`)!
  const stairLandingMesh = buildBatchedBoxesMesh(
    [{ w: 2.494, h: 0.42, d: 2.4, x: -41.147, y: upperY - 0.21, z: -23.8 }],
    mats.catwalkGrate,
    { castShadow: true, receiveShadow: true, name: 'F4_Z5_StairTopLanding' }
  );
  if (stairLandingMesh) {
    cellGroup.add(stairLandingMesh);
    collector.wallMeshes.push(stairLandingMesh);
  }
  collector.slabs.push({ minX: -42.4, maxX: -39.9, minZ: -25.0, maxZ: -22.6, y: upperY, thickness: 0.42 });

  buildStraightStairFlight(collector, mats, {
    x: -41.12,
    z: -18.5,
    width: 2.44,
    length: 8.2,
    yStart: upperY,
    yEnd: baseY,
    axis: 'z',
    steps: 20,
    railMinSide: false,
    railMaxSide: true,
    accentMat: hydroMat,
    targetGroup: cellGroup,
  });

  // Exact Guardrails with clean openings for: (A) West Stair Top Landing (`z ∈ [-25.0, -22.6]`) & (B) North Jump Pad (`x ∈ [-34.6, -31.4]`)!
  buildGuardrailRun(collector, mats, { x1: -42.4, z1: -26.8, x2: -42.4, z2: -25.0, y: upperY, accentMat: hydroMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -42.4, z1: -22.6, x2: -42.4, z2: -10.32, y: upperY, accentMat: hydroMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -39.9, z1: -25.0, x2: -39.9, z2: -22.6, y: upperY, accentMat: hydroMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -42.4, z1: -25.0, x2: -39.9, z2: -25.0, y: upperY, accentMat: hydroMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -22.4, z1: -26.8, x2: -22.4, z2: -10.32, y: upperY, accentMat: hydroMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -42.4, z1: -26.8, x2: -34.6, z2: -26.8, y: upperY, accentMat: hydroMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -31.4, z1: -26.8, x2: -22.4, z2: -26.8, y: upperY, accentMat: hydroMat, targetGroup: cellGroup });

  // 5. Calibrated North Pneumatic Jump Pad (`f4_pad_substation_nw`) arcing cleanly OVER lip onto `z ≈ -29.2`!
  buildJumpPad(collector, mats, {
    id: F4_IDS.padSubstationNw,
    x: -33.0,
    y: baseY,
    z: -24.6,
    launchVy: 13.6,
    launchVx: 0,
    launchVz: -3.8, // arcs cleanly OVER lip & lands squarely on North Catwalk (`z ∈ [-31.68, -26.8]`) through [-34.6, -31.4] gap!
    targetGroup: cellGroup,
  });

  // 6. LOCKED SUBSTATION BYPASS SECURITY GATE (`f4_gate_nw_substation`, x = -18.0, z ∈ [-15.4, -10.8])!
  buildLockedSecurityGate(collector, mats, {
    id: F4_IDS.gateNwSubstation,
    label: 'NW SUBSTATION BYPASS GATE',
    x: F4_WALLS.canyonWestX,
    y: baseY,
    z: (F4_PORTALS.westNorthGroundZ[0] + F4_PORTALS.westNorthGroundZ[1]) * 0.5,
    width: F4_PORTALS.westNorthGroundZ[1] - F4_PORTALS.westNorthGroundZ[0],
    height: 4.0,
    spanAxis: 'z',
    lockedHint: 'BYPASS GATE SEALED · FLIP SUBSTATION SWITCH OR SHOOT RELAY ABOVE GATE',
    targetGroup: cellGroup,
  });
  // Dual Unlock: `[E]` Bypass Terminal on East Wall inside Zone 5 OR Sniping crimson Relay Lock above the gate!
  buildWorldSwitch(collector, mats, {
    id: F4_IDS.switchNwSubstation,
    x: -18.65,
    y: baseY,
    z: -16.8,
    rotY: -Math.PI * 0.5,
    promptLocked: '[E] OVERRIDE SUBSTATION BYPASS GATE',
    promptActivated: 'SUBSTATION BYPASS GATE OPEN',
    bannerText: 'NW SUBSTATION BYPASS GATE UNLOCKED',
    unlockGateId: F4_IDS.gateNwSubstation,
    targetGroup: cellGroup,
  });
  buildShootableLock(collector, mats, {
    id: F4_IDS.lockNwSubstation,
    x: -18.55,
    y: baseY + 3.45,
    z: -13.1,
    rotY: -Math.PI * 0.5, // Faces West into Substation cleanly above gate lintel!
    bannerText: 'BYPASS RELAY SHATTERED · SUBSTATION GATE UNLOCKED',
    unlockGateId: F4_IDS.gateNwSubstation,
    targetGroup: cellGroup,
  });

  // 7. Tactical Barricade + 2 Explosive Barrels + Signage (ground centerpiece now occupied by Tesla Inductor Core!)
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -45.0, y: upperY, z: -20.0, w: 2.0, h: 0.92, d: 0.9, walkableTop: true },
      { x: -24.8, y: baseY, z: -18.6, w: 0.92, h: 0.96, d: 2.6, walkableTop: true },
    ],
    { targetGroup: cellGroup, accentMat: amberMat, name: 'F4_Z5_SubstationCover' }
  );
  buildExplosiveBarrel(collector, mats, { id: 'f4_barrel_nw_1', x: -33.0, y: baseY, z: -13.8, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f4_barrel_nw_2', x: -24.4, y: baseY, z: -24.8, targetGroup: cellGroup });

  addWallStencilPlaque(cellGroup, mats, {
    code: '04-Z5',
    title: 'HV RELAY SUBSTATION',
    subtitle: 'UNLOCK EAST BYPASS GATE FOR DIRECT EXTRACTION FLANK',
    accentHex: 0x06b6d4,
    x: -33.0,
    y: baseY + 8.2,
    z: -31.62,
    rotY: 0,
    width: 6.4,
    height: 1.48,
  });

  return {
    id: 'f4_zone5_nw_substation',
    group: cellGroup,
    triggerBounds: { minX: -49.5, maxX: 6.0, minZ: -32.5, maxZ: 12.0 },
    center: { x: -33.0, z: -21.0 },
    maxViewDistance: 46.0,
  };
}
