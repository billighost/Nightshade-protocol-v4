import * as THREE from 'three';
import { buildBatchedBoxesMesh, type BoxSpec, type HideoutMaterialRegistry } from '../../materials';
import {
  addLaneMarkerPlaque,
  addWalkableDeck,
  buildArchitecturalWall,
  buildJerseyBarricades,
  buildTacticalConsoleBenches,
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
} from '../../mechanics';
import { F7_BASE_Y, F7_CEILINGS, F7_IDS, F7_META, F7_UPPER_Y, F7_WALLS } from './layout';

/**
 * Zone 4 — East Cyber-Server Atrium & Data Vault (`x ∈ [+16, +42], z ∈ [-22, +10]`, ceil `10.5m`)
 * Inspired by Cyberpunk 2077 Arasaka Data Core + Control Research Wing:
 * - 4 monumental grounded illuminated Server Monolith Banks forming tense flanking combat aisles (100% solid colliders!)
 * - Elevated Data Catwalk (`y = 88.4m`) + North Data Overlook Balcony reached via BOTH a crisp stair AND
 *   a **Pneumatic Tactical Jump-Boost Pad (`f7_pad_east_servers`)**!
 * - **Locked East Bypass Gate (`f7_gate_east_bypass`)** into Zone 6 Turbine Gallery, unsealed by shooting
 *   the glowing crimson **Overhead Bypass Relay (`f7_lock_east_bypass`)** high on the South Server Bulkhead!
 */
export function buildZone4EastServerWing(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const baseY = F7_BASE_Y;
  const upperY = F7_UPPER_Y;
  const ceilH = F7_CEILINGS.serverWing;
  const ceilY = baseY + ceilH;
  const accentMat = mats.floorAccent[7];

  const cellGroup = new THREE.Group();
  cellGroup.name = 'F7_Z4_EastServerWingCell';
  collector.group.add(cellGroup);

  // 1. Seamless Ground Floor Slab (`x ∈ [+16.04, +42.0], z ∈ [-22, +10]`)
  addWalkableDeck(collector, {
    minX: F7_WALLS.rotundaEastX + 0.04,
    maxX: F7_WALLS.eastOuterX,
    minZ: F7_WALLS.wingNorthZ,
    maxZ: F7_WALLS.wingSplitZ,
    y: baseY,
    thickness: 0.5,
    material: mats.concreteFloor,
    targetGroup: cellGroup,
    name: 'F7_Z4_Floor',
  });

  // 2. Ceiling Slab + Zero-Overlap Structural Ribs & Overhead Lights (`y = 94.5m`)
  const ceilMesh = buildBatchedBoxesMesh(
    [{ w: 26.2, h: 0.42, d: 32.4, x: 29.0, y: ceilY + 0.21, z: -6.0 }],
    mats.darkConcrete,
    { receiveShadow: true, name: 'F7_Z4_Ceiling' }
  );
  if (ceilMesh) {
    cellGroup.add(ceilMesh);
    collector.wallMeshes.push(ceilMesh);
  }
  const ribSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  for (const rz of [-18.0, -10.0, -2.0, 6.0]) {
    ribSpecs.push({ w: 25.0, h: 0.44, d: 0.48, x: 29.0, y: ceilY - 0.24, z: rz });
    lightSpecs.push(
      { w: 7.4, h: 0.08, d: 0.24, x: 23.0, y: ceilY - 0.54, z: rz },
      { w: 7.4, h: 0.08, d: 0.24, x: 34.0, y: ceilY - 0.54, z: rz }
    );
  }
  const ribMesh = buildBatchedBoxesMesh(ribSpecs, mats.structuralSteel, { name: 'F7_Z4_CeilingRibs' });
  if (ribMesh) cellGroup.add(ribMesh);
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F7_Z4_CeilingLights' });
  if (lightMesh) cellGroup.add(lightMesh);

  // 3. Perimeter Walls (Corner-trimmed -> ZERO corner Z-fighting!)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F7_WALLS.wingNorthZ,
    spanStart: F7_WALLS.rotundaEastX,
    spanEnd: F7_WALLS.eastOuterX,
    baseY,
    height: ceilH,
    targetGroup: cellGroup,
    name: 'F7_Z4_NorthWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F7_WALLS.eastOuterX,
    spanStart: F7_WALLS.wingNorthZ + 0.32,
    spanEnd: F7_WALLS.wingSplitZ - 0.32,
    baseY,
    height: ceilH,
    targetGroup: cellGroup,
    name: 'F7_Z4_EastWall',
  });
  // North-West Stub Wall (`x = +16.0, z ∈ [-21.68, -17.32]`, north of Rotunda!)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F7_WALLS.rotundaEastX,
    spanStart: F7_WALLS.wingNorthZ + 0.32,
    spanEnd: F7_WALLS.rotundaNorthZ - 0.32,
    baseY,
    height: ceilH,
    targetGroup: cellGroup,
    name: 'F7_Z4_NorthWestStub',
  });
  // Shared South Partition Wall into Zone 6 Turbine Gallery (`z = +10.0`)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F7_WALLS.wingSplitZ,
    spanStart: F7_WALLS.rotundaEastX + 0.32,
    spanEnd: F7_WALLS.eastOuterX,
    baseY,
    height: ceilH,
    portals: [
      // Elevated Data Catwalk portal (`y = 88.4m`) linking Zone 4 <-> Zone 6 Turbine Overlook!
      { start: 18.4, end: 22.2, bottomY: upperY, topY: upperY + 3.6, kind: 'door', accentHeader: true },
      // Locked East Bypass Gate into Zone 6 Turbine Gallery!
      { start: 27.8, end: 31.8, bottomY: baseY, topY: baseY + 3.4, kind: 'door', accentHeader: true },
      // Ballistic Observation Window peering into the glowing Coolant Turbines of Zone 6!
      { start: 34.0, end: 39.2, bottomY: baseY + 1.1, topY: baseY + 3.4, kind: 'window' },
    ],
    accentMat,
    targetGroup: cellGroup,
    name: 'F7_Z4_SouthSplitWall',
  });

  // Locked East Bypass Security Gate (`f7_gate_east_bypass`) + High Shootable Relay Lock (`f7_lock_east_bypass`)!
  buildLockedSecurityGate(collector, mats, {
    id: F7_IDS.gateEastBypass,
    label: 'TURBINE BYPASS GATE',
    lockedHint: 'TURBINE BYPASS SEALED · SHOOT OVERHEAD RELAY ON SOUTH WALL',
    x: 29.8,
    y: baseY,
    z: F7_WALLS.wingSplitZ,
    width: 4.0,
    height: 3.4,
    spanAxis: 'x',
    targetGroup: cellGroup,
  });
  buildShootableLock(collector, mats, {
    id: F7_IDS.lockEastBypass,
    bannerText: 'BYPASS RELAY SHATTERED · TURBINE GATE UNLOCKED',
    x: 34.8,
    y: baseY + 4.3,
    z: F7_WALLS.wingSplitZ - 0.44,
    rotY: Math.PI,
    unlockGateId: F7_IDS.gateEastBypass,
    targetGroup: cellGroup,
  });

  // =========================================================================
  // 4. FOUR MONUMENTAL GROUNDED SERVER MONOLITH BANKS (100% SOLID COLLIDERS!)
  // =========================================================================
  const serverBaseSpecs: BoxSpec[] = [];
  const serverCoreSpecs: BoxSpec[] = [];
  const serverLedSpecs: BoxSpec[] = [];

  const monolithCoords: Array<[number, number]> = [
    [25.2, -5.8],
    [32.4, -5.8],
    [25.2, 2.8],
    [32.4, 2.8],
  ];
  const monW = 2.2;
  const monD = 4.6;
  const monH = 3.65;

  for (const [mx, mz] of monolithCoords) {
    // Grounded heavy plinth (`baseY + 0.004 .. baseY + 0.24`)
    serverBaseSpecs.push({
      w: monW + 0.16,
      h: 0.236,
      d: monD + 0.16,
      x: mx,
      y: baseY + 0.004 + 0.118,
      z: mz,
    });
    // Armored server chassis core strictly above plinth
    const coreH = monH - 0.46;
    serverCoreSpecs.push({
      w: monW,
      h: coreH,
      d: monD,
      x: mx,
      y: baseY + 0.246 + coreH * 0.5,
      z: mz,
    });
    // Crown cooling shroud cap strictly above core
    serverBaseSpecs.push({
      w: monW + 0.12,
      h: 0.2,
      d: monD + 0.12,
      x: mx,
      y: baseY + monH - 0.1,
      z: mz,
    });
    // Glowing cyan data-blade telemetry strips cleanly proud on East & West server faces (`±(monW/2 + 0.025)`)
    for (const side of [-1, 1]) {
      for (const lz of [-1.45, 0, 1.45]) {
        serverLedSpecs.push({
          w: 0.04,
          h: coreH - 0.42,
          d: 0.14,
          x: mx + side * (monW * 0.5 + 0.025),
          y: baseY + 0.246 + coreH * 0.5,
          z: mz + lz,
        });
      }
    }
    // 100% solid collider matching outer plinth footprint (IMPOSSIBLE to walk through!)
    collector.boxes.push({
      minX: mx - (monW * 0.5 + 0.12),
      maxX: mx + (monW * 0.5 + 0.12),
      minY: baseY,
      maxY: baseY + monH + 0.1,
      minZ: mz - (monD * 0.5 + 0.12),
      maxZ: mz + (monD * 0.5 + 0.12),
      walkableTop: false,
      tag: 'server_monolith',
    });
  }

  const sBaseMesh = buildBatchedBoxesMesh(serverBaseSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F7_Z4_ServerBases',
  });
  const sCoreMesh = buildBatchedBoxesMesh(serverCoreSpecs, mats.armoredSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F7_Z4_ServerCores',
  });
  const sLedMesh = buildBatchedBoxesMesh(serverLedSpecs, accentMat, {
    name: 'F7_Z4_ServerLEDs',
  });
  for (const m of [sBaseMesh, sCoreMesh]) {
    if (m) {
      cellGroup.add(m);
      collector.wallMeshes.push(m);
    }
  }
  if (sLedMesh) cellGroup.add(sLedMesh);

  // Tactical server analyst desks & CQB cover barricades
  buildTacticalConsoleBenches(
    collector,
    mats,
    [
      { x: 20.6, y: baseY, z: -18.8, w: 4.2, h: 1.04, d: 1.05 },
      { x: 28.8, y: upperY, z: -19.6, w: 4.8, h: 1.04, d: 1.05 },
    ],
    { targetGroup: cellGroup, accentMat, name: 'F7_Z4_DataDesks' }
  );
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: 28.8, y: baseY, z: -1.5, w: 2.2, h: 1.08, d: 0.8 },
      { x: 28.8, y: baseY, z: 6.8, w: 2.8, h: 1.08, d: 0.8 },
    ],
    { targetGroup: cellGroup, accentMat, name: 'F7_Z4_ServerCover' }
  );

  // Pressurized Explosive Plasma Barrels tucked along the central Server Monolith flanking aisle!
  buildExplosiveBarrel(collector, mats, {
    id: 'f7_barrel_servers_1',
    x: 28.8,
    y: baseY,
    z: -4.2,
    targetGroup: cellGroup,
  });
  buildExplosiveBarrel(collector, mats, {
    id: 'f7_barrel_servers_2',
    x: 28.8,
    y: baseY,
    z: 4.4,
    targetGroup: cellGroup,
  });

  // =========================================================================
  // 5. ELEVATED DATA CATWALK + NORTH OVERLOOK BALCONY + STAIR + PNEUMATIC JUMP PAD!
  // =========================================================================
  // West Data Catwalk linking Rotunda East Sky-Portal <-> Zone 6 Turbine Overlook (`y = 88.4m`)
  addWalkableDeck(collector, {
    minX: 16.35,
    maxX: 22.6,
    minZ: -21.65,
    maxZ: 9.95,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F7_Z4_WestDataCatwalk',
  });
  // North Data Overlook Balcony spanning East across the North wall (`x ∈ [+22.62, +41.65], z ∈ [-21.65, -14.2]`)
  addWalkableDeck(collector, {
    minX: 22.62,
    maxX: 41.65,
    minZ: -21.65,
    maxZ: -14.2,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F7_Z4_NorthDataBalcony',
  });

  // Crisp Zero-Glitch Straight Staircase sitting millimeter-flush against East wall (`x = +40.06, width = 3.2 -> maxX = 41.69 vs wall 41.70`)!
  buildStraightStairFlight(collector, mats, {
    x: 40.06,
    z: -9.5,
    width: 3.2,
    length: 9.4,
    yStart: upperY,
    yEnd: baseY,
    axis: 'z',
    steps: 20,
    railMinSide: true,
    railMaxSide: false,
    targetGroup: cellGroup,
    accentMat,
  });

  // Pneumatic Jump-Boost Pad launching straight up onto the North Data Overlook Balcony!
  buildJumpPad(collector, mats, {
    id: F7_IDS.padEastServers,
    x: 28.8,
    y: baseY,
    z: -10.8,
    launchVy: 13.4,
    launchVx: 0,
    launchVz: -4.2,
    targetGroup: cellGroup,
  });

  // Guardrails along open edges (leaving clean landing opening for Jump Pad at `x ∈ [26.8, 30.8]` and Stair at `x ∈ [38.4, 41.7]`!)
  buildGuardrailRun(collector, mats, { x1: 22.52, z1: -14.1, x2: 22.52, z2: 9.65, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 22.65, z1: -14.28, x2: 26.8, z2: -14.28, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 30.8, z1: -14.28, x2: 38.34, z2: -14.28, y: upperY, accentMat, targetGroup: cellGroup });

  // Grounded structural columns under Data Catwalk & North Overlook (strictly outside aisles & doorways!)
  const colH = upperY - 0.44 - (baseY + 0.004);
  const colSpecs: BoxSpec[] = [];
  for (const [cx, cz] of [
    [22.2, -14.5],
    [22.2, -5.8],
    [22.2, 4.8],
    [34.6, -14.5],
  ] as Array<[number, number]>) {
    colSpecs.push(
      { w: 0.5, h: colH, d: 0.5, x: cx, y: baseY + 0.004 + colH * 0.5, z: cz },
      { w: 0.72, h: 0.22, d: 0.72, x: cx, y: baseY + 0.004 + 0.11, z: cz }
    );
    collector.boxes.push({
      minX: cx - 0.3,
      maxX: cx + 0.3,
      minY: baseY,
      maxY: upperY - 0.42,
      minZ: cz - 0.3,
      maxZ: cz + 0.3,
      walkableTop: false,
    });
  }
  const colMesh = buildBatchedBoxesMesh(colSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F7_Z4_DataColumns',
  });
  if (colMesh) {
    cellGroup.add(colMesh);
    collector.wallMeshes.push(colMesh);
  }

  addLaneMarkerPlaque(cellGroup, mats, {
    label: 'TURBINES · SHOOT RELAY',
    accentHex: 0xef4444,
    x: 29.8,
    y: baseY + 4.1,
    z: 9.62,
    rotY: Math.PI,
    width: 3.6,
    height: 0.68,
  });

  return {
    id: 'floor7_zone4_east_servers',
    group: cellGroup,
    center: new THREE.Vector3(29.0, baseY + 3.0, -6.0),
    maxViewDistance: 44,
    triggerBounds: { minX: 12.0, maxX: 43.0, minZ: -23.0, maxZ: 13.0 },
  };
}
