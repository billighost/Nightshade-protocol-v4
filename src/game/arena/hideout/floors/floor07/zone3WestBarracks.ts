import * as THREE from 'three';
import { buildBatchedBoxesMesh, type BoxSpec, type HideoutMaterialRegistry } from '../../materials';
import {
  addLaneMarkerPlaque,
  addWalkableDeck,
  buildArchitecturalWall,
  buildJerseyBarricades,
  buildShippingContainer,
  buildTacticalConsoleBenches,
  buildWallEquipmentBays,
} from '../../architecture';
import {
  buildGuardrailRun,
  buildStraightStairFlight,
  type FloorGeometryCollector,
} from '../../stairs';
import { buildTacticalDoor } from '../../mechanics';
import type { OcclusionCell } from '../../types';
import {
  buildExplosiveBarrel,
  buildLockedSecurityGate,
  buildShootableLock,
} from '../../mechanics';
import { F7_BASE_Y, F7_CEILINGS, F7_IDS, F7_META, F7_UPPER_Y, F7_WALLS } from './layout';

/**
 * Zone 3 — West Tactical Barracks & Black-Ops CQB Precinct (`x ∈ [-42, -16], z ∈ [-22, +10]`, ceil `9.2m`)
 * Inspired by Call of Duty Shoot House + Control's Brutalist Executive Precinct:
 * - Multi-room CQB interior divider walls, corrugated container flank lane, and solid weapon-locker bays
 * - **Locked Black-Ops Munitions Vault** (`x ∈ [-42, -33], z ∈ [-22, -11]`) sealed by `f7_gate_west_vault` —
 *   peeking through the armored ballistic observation window reveals the glowing crimson **Shootable Security
 *   Relay Lock (`f7_lock_west_vault`)** inside! Shoot through the glass to unlock the vault & raid 2 `.50 HV` crates!
 * - **Jammed Roll-Under Maintenance Shutter (`f7_jammed_cargo_shortcut`)** into Zone 5 Cargo Bay
 * - Elevated East Barracks Catwalk (`y = 88.4m`) linking Rotunda West Sky-Portal -> Zone 5 Cargo Gantry!
 */
export function buildZone3WestBarracks(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const baseY = F7_BASE_Y;
  const upperY = F7_UPPER_Y;
  const ceilH = F7_CEILINGS.barracks;
  const ceilY = baseY + ceilH;
  const accentMat = mats.floorAccent[7];

  const cellGroup = new THREE.Group();
  cellGroup.name = 'F7_Z3_WestBarracksCell';
  collector.group.add(cellGroup);

  // 1. Seamless Ground Floor Slab (`x ∈ [-42, -16.04], z ∈ [-22, +10]`)
  addWalkableDeck(collector, {
    minX: F7_WALLS.westOuterX,
    maxX: F7_WALLS.rotundaWestX - 0.04,
    minZ: F7_WALLS.wingNorthZ,
    maxZ: F7_WALLS.wingSplitZ,
    y: baseY,
    thickness: 0.5,
    material: mats.concreteFloor,
    targetGroup: cellGroup,
    name: 'F7_Z3_Floor',
  });

  // 2. Ceiling Slab + Zero-Overlap Structural Ribs & Overhead Lights (`y = 93.2m`)
  const ceilMesh = buildBatchedBoxesMesh(
    [{ w: 26.2, h: 0.42, d: 32.4, x: -29.0, y: ceilY + 0.21, z: -6.0 }],
    mats.darkConcrete,
    { receiveShadow: true, name: 'F7_Z3_Ceiling' }
  );
  if (ceilMesh) {
    cellGroup.add(ceilMesh);
    collector.wallMeshes.push(ceilMesh);
  }
  const ribSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  for (const rz of [-18.0, -10.0, -2.0, 6.0]) {
    ribSpecs.push({ w: 25.0, h: 0.42, d: 0.48, x: -29.0, y: ceilY - 0.24, z: rz });
    lightSpecs.push(
      { w: 7.4, h: 0.08, d: 0.24, x: -34.0, y: ceilY - 0.52, z: rz },
      { w: 7.4, h: 0.08, d: 0.24, x: -23.0, y: ceilY - 0.52, z: rz }
    );
  }
  const ribMesh = buildBatchedBoxesMesh(ribSpecs, mats.structuralSteel, { name: 'F7_Z3_CeilingRibs' });
  if (ribMesh) cellGroup.add(ribMesh);
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F7_Z3_CeilingLights' });
  if (lightMesh) cellGroup.add(lightMesh);

  // 3. Perimeter Walls (Cleanly corner-trimmed -> ZERO corner Z-fighting!)
  // North Outer Wall (`z = -22.0`)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F7_WALLS.wingNorthZ,
    spanStart: F7_WALLS.westOuterX,
    spanEnd: F7_WALLS.rotundaWestX,
    baseY,
    height: ceilH,
    targetGroup: cellGroup,
    name: 'F7_Z3_NorthWall',
  });
  // West Outer Wall (`x = -42.0`)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F7_WALLS.westOuterX,
    spanStart: F7_WALLS.wingNorthZ + 0.32,
    spanEnd: F7_WALLS.wingSplitZ - 0.32,
    baseY,
    height: ceilH,
    targetGroup: cellGroup,
    name: 'F7_Z3_WestWall',
  });
  // North-East Stub Wall (`x = -16.0, z ∈ [-21.68, -17.32]`, north of Rotunda!)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F7_WALLS.rotundaWestX,
    spanStart: F7_WALLS.wingNorthZ + 0.32,
    spanEnd: F7_WALLS.rotundaNorthZ - 0.32,
    baseY,
    height: ceilH,
    targetGroup: cellGroup,
    name: 'F7_Z3_NorthEastStub',
  });
  // Shared South Partition Wall into Zone 5 Cargo Bay (`z = +10.0`)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F7_WALLS.wingSplitZ,
    spanStart: F7_WALLS.westOuterX,
    spanEnd: F7_WALLS.rotundaWestX - 0.32,
    baseY,
    height: ceilH,
    portals: [
      // Jammed Roll-Under Maintenance Shutter shortcut!
      { start: -38.4, end: -34.6, bottomY: baseY, topY: baseY + 3.4, kind: 'door', accentHeader: true },
      // Main ground doorway into SW Cargo Bay
      { start: -29.8, end: -25.8, bottomY: baseY, topY: baseY + 3.6, kind: 'door', accentHeader: true },
      // Elevated catwalk portal (`y = 88.4m`) linking Zone 3 Upper Catwalk <-> Zone 5 Cargo Gantry!
      { start: -22.2, end: -18.4, bottomY: upperY, topY: upperY + 3.6, kind: 'door', accentHeader: true },
    ],
    accentMat,
    targetGroup: cellGroup,
    name: 'F7_Z3_SouthSplitWall',
  });

  // Tactical doors on South Split Wall into Zone 5
  buildTacticalDoor(collector, mats, {
    id: F7_IDS.jammedCargoShortcut,
    x: -36.5,
    y: baseY,
    z: F7_WALLS.wingSplitZ,
    width: 3.8,
    height: 3.4,
    spanAxis: 'x',
    mode: 'jammed_roll',
    targetGroup: cellGroup,
  });
  buildTacticalDoor(collector, mats, {
    id: 'f7_door_barracks_to_cargo',
    x: -27.8,
    y: baseY,
    z: F7_WALLS.wingSplitZ,
    width: 4.0,
    height: 3.6,
    spanAxis: 'x',
    mode: 'automatic',
    targetGroup: cellGroup,
  });

  // =========================================================================
  // 4. LOCKED BLACK-OPS MUNITIONS VAULT (`x ∈ [-42, -33], z ∈ [-22, -11]`) + SHOOTABLE WINDOW LOCK!
  // =========================================================================
  // Vault East Wall (`x = -33.0`) with Locked Security Gate + Armored Observation Window!
  // Span ends flush at `-11.28` (exact North face of Vault South Wall -> ZERO corner crack!),
  // and window starts at `-14.4` so the open South gate leaf tucks 100% inside the solid pier `[-16.0, -14.4]`!
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: -33.0,
    spanStart: -21.68,
    spanEnd: -11.28,
    baseY,
    height: 4.2,
    thickness: 0.56,
    portals: [
      { start: -19.6, end: -16.0, bottomY: baseY, topY: baseY + 3.4, kind: 'door', accentHeader: true },
      // Panoramic ballistic window looking straight at the glowing Shootable Relay Lock inside the vault!
      { start: -14.4, end: -11.6, bottomY: baseY + 1.05, topY: baseY + 3.2, kind: 'window' },
    ],
    wallMat: mats.concreteWallLight,
    accentMat,
    targetGroup: cellGroup,
    name: 'F7_Z3_VaultEastWall',
  });
  // Vault South Wall (`z = -11.0`)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: -11.0,
    spanStart: -41.68,
    spanEnd: -32.72,
    baseY,
    height: 4.2,
    thickness: 0.56,
    wallMat: mats.concreteWallLight,
    targetGroup: cellGroup,
    name: 'F7_Z3_VaultSouthWall',
  });
  // Vault Roof Cap (`y = baseY + 4.2 .. baseY + 4.56`) tucked cleanly inside outer West/North walls!
  const vaultRoof = buildBatchedBoxesMesh(
    [{ w: 8.64, h: 0.36, d: 10.64, x: -37.36, y: baseY + 4.38, z: -16.36 }],
    mats.structuralSteel,
    { castShadow: true, receiveShadow: true, name: 'F7_Z3_VaultRoof' }
  );
  if (vaultRoof) {
    cellGroup.add(vaultRoof);
    collector.wallMeshes.push(vaultRoof);
  }
  collector.boxes.push({
    minX: -42.0,
    maxX: -32.7,
    minY: baseY + 4.15,
    maxY: baseY + 4.6,
    minZ: -22.0,
    maxZ: -10.7,
    walkableTop: false,
  });

  // Illuminated Black-Ops Munitions Vault Interior: recessed overhead ceiling lights + hazard entry strip + wall accent!
  const vaultLights = buildBatchedBoxesMesh(
    [
      { w: 5.4, h: 0.08, d: 0.34, x: -37.4, y: baseY + 4.15, z: -18.2 },
      { w: 5.4, h: 0.08, d: 0.34, x: -37.4, y: baseY + 4.15, z: -14.2 },
    ],
    mats.ceilingLight,
    { name: 'F7_Z3_VaultInteriorLights' }
  );
  if (vaultLights) cellGroup.add(vaultLights);

  const vaultHazardTrim = buildBatchedBoxesMesh(
    [
      { w: 1.6, h: 0.016, d: 3.4, x: -34.2, y: baseY + 0.012, z: -17.8 },
    ],
    mats.hazardStripe,
    { receiveShadow: true, name: 'F7_Z3_VaultEntryHazard' }
  );
  if (vaultHazardTrim) cellGroup.add(vaultHazardTrim);

  const vaultAccentTrim = buildBatchedBoxesMesh(
    [
      { w: 4.8, h: 0.14, d: 0.06, x: -37.6, y: baseY + 2.65, z: -21.62 },
    ],
    accentMat,
    { name: 'F7_Z3_VaultNorthAccent' }
  );
  if (vaultAccentTrim) cellGroup.add(vaultAccentTrim);

  // Locked Armored Vault Gate (`f7_gate_west_vault`)
  buildLockedSecurityGate(collector, mats, {
    id: F7_IDS.gateWestVault,
    label: 'MUNITIONS VAULT GATE',
    lockedHint: 'MUNITIONS VAULT SEALED · SHOOT CRIMSON RELAY THROUGH WINDOW',
    x: -33.0,
    y: baseY,
    z: -17.8,
    width: 3.6,
    height: 3.4,
    spanAxis: 'z',
    targetGroup: cellGroup,
  });

  // Grounded Armored Relay Stanchion inside the Vault (`x = -35.88, z = -13.0`) framing the pulsing crimson
  // Shootable Relay Lock DEAD-CENTER right behind the panoramic ballistic observation window (`[-14.4, -11.6]`)!
  const relayStanchion = buildBatchedBoxesMesh(
    [
      { w: 0.44, h: 2.85, d: 0.72, x: -35.88, y: baseY + 1.43, z: -13.0 },
      { w: 0.64, h: 0.16, d: 0.92, x: -35.88, y: baseY + 0.085, z: -13.0 },
    ],
    mats.structuralSteel,
    { castShadow: true, receiveShadow: true, name: 'F7_Z3_VaultRelayStanchion' }
  );
  if (relayStanchion) {
    cellGroup.add(relayStanchion);
    collector.wallMeshes.push(relayStanchion);
  }
  collector.boxes.push({
    minX: -36.2,
    maxX: -35.56,
    minY: baseY,
    maxY: baseY + 2.9,
    minZ: -13.46,
    maxZ: -12.54,
    walkableTop: false,
  });

  // Glowing Crimson Shootable Security Relay Lock mounted right behind the observation window!
  buildShootableLock(collector, mats, {
    id: F7_IDS.lockWestVault,
    bannerText: 'VAULT RELAY DESTROYED · MUNITIONS VAULT UNLOCKED',
    x: -35.6,
    y: baseY + 2.08,
    z: -13.0,
    rotY: Math.PI * 0.5,
    unlockGateId: F7_IDS.gateWestVault,
    targetGroup: cellGroup,
  });

  // =========================================================================
  // 5. MULTI-ROOM CQB PRECINCT COVER, SHIPPING CONTAINER & TACTICAL LOCKERS
  // =========================================================================
  // Mid-Precinct CQB Concrete Partition (`z = -3.8`, breach opening in center + wide side flanks!)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: -3.8,
    spanStart: -37.2,
    spanEnd: -27.2,
    baseY,
    height: 3.6,
    thickness: 0.5,
    portals: [{ start: -33.6, end: -30.6, bottomY: baseY, topY: baseY + 3.1, kind: 'door', accentHeader: true }],
    wallMat: mats.concreteWallLight,
    accentMat,
    targetGroup: cellGroup,
    name: 'F7_Z3_MidCqbDivider',
  });

  // Corrugated CoD Shoot-House Shipping Container forming a flanking kill-house lane!
  buildShippingContainer(collector, mats, {
    x: -35.6,
    y: baseY,
    z: 2.8,
    w: 3.2,
    h: 2.85,
    d: 6.8,
    targetGroup: cellGroup,
    name: 'F7_Z3_Container',
  });

  // Ballistic Jersey cover barricades & Tactical gunsmith console benches (strictly clear of Vault Gate sightline!)
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -28.4, y: baseY, z: -7.8, w: 2.6, h: 1.08, d: 0.82 },
      { x: -28.4, y: baseY, z: 3.6, w: 2.8, h: 1.08, d: 0.82 },
      { x: -21.0, y: baseY, z: -16.8, w: 2.8, h: 1.08, d: 0.82 },
    ],
    { targetGroup: cellGroup, accentMat, name: 'F7_Z3_Cover' }
  );

  buildTacticalConsoleBenches(
    collector,
    mats,
    [
      { x: -37.6, y: baseY, z: -19.8, w: 4.2, h: 1.04, d: 1.05 }, // Vault armory bench inside vault!
      { x: -25.2, y: baseY, z: -19.8, w: 4.6, h: 1.04, d: 1.05 }, // Briefing station
    ],
    { targetGroup: cellGroup, accentMat, name: 'F7_Z3_Benches' }
  );

  // Solid Wall Weapon-Locker Bays (100% solid colliders — including dedicated armored bay INSIDE the Munitions Vault!)
  buildWallEquipmentBays(
    collector,
    mats,
    [
      { axis: 'z', coord: -41.68, inwardDir: 1, centerAlong: -16.5, baseY, width: 4.6, height: 3.1 },
      { axis: 'z', coord: -41.68, inwardDir: 1, centerAlong: -4.2, baseY, width: 5.2, height: 3.1 },
      { axis: 'x', coord: -21.68, inwardDir: 1, centerAlong: -20.6, baseY, width: 4.6, height: 3.1 },
    ],
    { targetGroup: cellGroup, accentMat, name: 'F7_Z3_WeaponLockers' }
  );

  // Pressurized Explosive Plasma Barrels in West Barracks CQB kill-lanes (including a volatile chain-reaction pair!)
  buildExplosiveBarrel(collector, mats, {
    id: 'f7_barrel_barracks_1',
    x: -30.2,
    y: baseY,
    z: -5.8,
    targetGroup: cellGroup,
  });
  buildExplosiveBarrel(collector, mats, {
    id: 'f7_barrel_barracks_2',
    x: -31.8,
    y: baseY,
    z: -5.2,
    targetGroup: cellGroup,
  });
  buildExplosiveBarrel(collector, mats, {
    id: 'f7_barrel_barracks_3',
    x: -26.8,
    y: baseY,
    z: 4.8,
    targetGroup: cellGroup,
  });

  // =========================================================================
  // 6. UPPER BARRACKS CATWALK (`y = 88.4m`) + CRISP STAIRCASE LINKING ZONE 2 <-> ZONE 5!
  // =========================================================================
  // East Upper Catwalk running cleanly along `x ∈ [-22.6, -16.35], z ∈ [-11.8, +9.95]`
  addWalkableDeck(collector, {
    minX: -22.6,
    maxX: -16.35,
    minZ: -11.8,
    maxZ: 9.95,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F7_Z3_EastCatwalk',
  });
  // Upper Stair Landing extending West at `z ∈ [-11.8, -8.4], x ∈ [-26.2, -22.62]`
  addWalkableDeck(collector, {
    minX: -26.2,
    maxX: -22.62,
    minZ: -11.8,
    maxZ: -8.4,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F7_Z3_StairLanding',
  });

  // Crisp Zero-Glitch Straight Staircase descending South (`z = -8.4 -> +0.8`, `y = 88.4 -> 84.0`)!
  buildStraightStairFlight(collector, mats, {
    x: -24.4,
    z: -3.8,
    width: 3.2,
    length: 9.2,
    yStart: upperY,
    yEnd: baseY,
    axis: 'z',
    steps: 20,
    railMinSide: true,
    railMaxSide: true,
    targetGroup: cellGroup,
    accentMat,
  });

  // Guardrails along all open edges of Upper Barracks Catwalk & Stair Landing!
  buildGuardrailRun(collector, mats, { x1: -26.12, z1: -11.72, x2: -16.4, z2: -11.72, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -26.12, z1: -11.72, x2: -26.12, z2: -8.48, y: upperY, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: -22.52, z1: -8.35, x2: -22.52, z2: 9.65, y: upperY, accentMat, targetGroup: cellGroup });

  // Grounded structural columns supporting the Upper Barracks Catwalk (tucked strictly clear of doorways!)
  const colH = upperY - 0.44 - (baseY + 0.004);
  const colSpecs: BoxSpec[] = [];
  for (const [cx, cz] of [
    [-22.2, -11.4],
    [-22.2, 4.8],
    [-25.9, -8.65],
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
    name: 'F7_Z3_CatwalkColumns',
  });
  if (colMesh) {
    cellGroup.add(colMesh);
    collector.wallMeshes.push(colMesh);
  }

  // Signage for Vault & Roll-Under Shortcut
  addLaneMarkerPlaque(cellGroup, mats, {
    label: 'VAULT · SHOOT RELAY',
    accentHex: 0xef4444,
    x: -32.64,
    y: baseY + 3.7,
    z: -15.4,
    rotY: Math.PI * 0.5,
    width: 3.4,
    height: 0.68,
  });
  addLaneMarkerPlaque(cellGroup, mats, {
    label: 'CARGO BAY →',
    accentHex: F7_META.accentHex,
    x: -27.8,
    y: baseY + 4.1,
    z: 9.62,
    rotY: Math.PI,
    width: 2.6,
    height: 0.66,
  });

  return {
    id: 'floor7_zone3_west_barracks',
    group: cellGroup,
    center: new THREE.Vector3(-29.0, baseY + 3.0, -6.0),
    maxViewDistance: 44,
    triggerBounds: { minX: -43.0, maxX: -12.0, minZ: -23.0, maxZ: 13.0 },
  };
}
