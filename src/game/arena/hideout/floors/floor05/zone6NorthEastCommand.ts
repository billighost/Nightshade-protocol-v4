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
import { buildGuardrailRun, type FloorGeometryCollector } from '../../stairs';
import type { OcclusionCell } from '../../types';
import {
  buildExplosiveBarrel,
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
 * FLOOR 05 — ZONE 6 (NORTH-EAST OCCLUSION CELL): WAR-COUNCIL BRIEFING BUNKER & SEALED PROTOTYPE VAULT
 * Footprint: x ∈ [+18.0, +48.0] (30m wide) × z ∈ [-32.0, -10.0] (22m deep), Ceiling: 10.0m
 *
 * Executive Strategic Command Bunker & Snipe-Through-Glass Black-Ops Prototype Vault:
 * - Upper Command Gallery (`y = 60.4m, x ∈ [18.32, 47.68], z ∈ [-15.4, -10.32]`) cleanly linking
 *   Coliseum `eastNorthUpperZ [-15.0, -11.0]` directly to East Mech-Bay `mechToCommandUpperX [42.6, 46.6]`!
 * - Sealed Black-Ops Prototype Vault (`x ∈ [38.0, 47.7], z ∈ [-31.7, -16.6]`):
 *   - `4.4m` panoramic observation window (`z ∈ [-28.8, -24.4]`) separated by a `2.2m` solid concrete pier
 *     from the `3.2m` Bi-Parting Locked Security Gate (`f5_gate_ne_vault`, `z ∈ [-22.2, -19.0]`) -> ZERO leaf/glass overlap!
 *   - Glowing Crimson Shootable Vault Relay (`f5_lock_ne_vault`) mounted directly on the East interior wall
 *     at `(47.52, 58.25, -26.6)` facing West straight through the panoramic observation glass!
 *   - Brightly lit vault interior (3 overhead emissive light bars + 4 vertical wall-wash glow columns + golden weapon dais!)
 * - Strategic War-Council Briefing Table (`x = 27.6, z = -23.6`), tactical lockers, cover & 2 Explosive Plasma Barrels!
 */
export function buildFloor5Zone6NorthEastCommand(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const baseY = F5_BASE_Y; // 56.0m
  const upperY = F5_UPPER_Y; // 60.4m
  const ceilH = F5_CEILINGS.neCommand; // 10.0m (Zone 4 & Zone 2 walls are 10.8m >= 10.0m -> ZERO cracks!)
  const accentMat = mats.floorAccent[5]; // Crimson-rose Command
  const goldMat = mats.floorAccent[2]; // High-reward Vault gold!
  const cellGroup = new THREE.Group();
  cellGroup.name = 'F5_ZONE6_NE_COMMAND';
  collector.group.add(cellGroup);

  // 1. Floor & Continuous Ceiling Slab
  addWalkableDeck(collector, {
    minX: F5_WALLS.coliseumEastX,
    maxX: F5_WALLS.eastOuterX,
    minZ: F5_WALLS.northWingsOuterZ,
    maxZ: F5_WALLS.northSplitZ,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    targetGroup: cellGroup,
    name: 'F5_Z6_CommandFloor',
  });
  const ceilMesh = buildBatchedBoxesMesh(
    [{ w: 29.4, h: 0.6, d: 21.4, x: 33.0, y: baseY + ceilH + 0.3, z: -21.0 }],
    mats.darkConcrete,
    { receiveShadow: false, name: 'F5_Z6_CommandCeiling' }
  );
  if (ceilMesh) cellGroup.add(ceilMesh);

  // 2. Exterior Perimeter Walls (West `x = +18` for `z ∈ [-31.7, -17.3]`, East `x = +48`, North `z = -32`)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F5_WALLS.coliseumEastX,
    spanStart: F5_WALLS.northWingsOuterZ + 0.3,
    spanEnd: F5_WALLS.coliseumNorthZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: cellGroup,
    name: 'F5_Z6_WestOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F5_WALLS.eastOuterX,
    spanStart: F5_WALLS.northWingsOuterZ + 0.3,
    spanEnd: F5_WALLS.northSplitZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: cellGroup,
    name: 'F5_Z6_EastOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F5_WALLS.northWingsOuterZ,
    spanStart: F5_WALLS.coliseumEastX - 0.3,
    spanEnd: F5_WALLS.eastOuterX + 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: cellGroup,
    name: 'F5_Z6_NorthOuterWall',
  });

  // 3. SEALED BLACK-OPS PROTOTYPE VAULT (`x ∈ [38.0, 47.7], z ∈ [-31.7, -16.6]`)
  // South Vault Wall (cleanly North of the `z ∈ [-15.4, -10.32]` Upper Command Gallery!)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: -16.6,
    spanStart: 38.0,
    spanEnd: F5_WALLS.eastOuterX - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWallLight,
    targetGroup: cellGroup,
    name: 'F5_Z6_VaultSouthWall',
  });
  // West Vault Divider Wall (`x = 38.0`): Unobstructed 4.0m Single-Pane Armored Glass Window `[-28.6, -24.6]` + 2.4m Solid Pier + Security Gate `[-22.2, -19.0]`!
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: 38.0,
    spanStart: F5_WALLS.northWingsOuterZ + 0.3,
    spanEnd: -16.9,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWallLight,
    accentMat: goldMat,
    targetGroup: cellGroup,
    portals: [
      { start: -28.6, end: -24.6, bottomY: baseY + 1.05, topY: baseY + 3.45, kind: 'window', framed: true, accentHeader: true },
      { start: -22.2, end: -19.0, bottomY: baseY, topY: baseY + 3.8, kind: 'door', framed: true, accentHeader: true },
    ],
    name: 'F5_Z6_VaultDividerWall',
  });

  // Bi-Parting Locked Security Gate (`f5_gate_ne_vault`) — ZERO overlap with observation glass!
  buildLockedSecurityGate(collector, mats, {
    id: F5_IDS.gateNeVault,
    label: 'BLACK-OPS PROTOTYPE VAULT',
    x: 38.0,
    y: baseY,
    z: -20.6,
    width: 3.2,
    height: 3.8,
    spanAxis: 'z',
    lockedHint: 'PROTOTYPE VAULT SEALED · SHOOT RELAY THROUGH OBSERVATION GLASS',
    targetGroup: cellGroup,
  });

  // Shootable Crimson Vault Relay facing straight West (`-X`) cleanly framed inside the unobstructed single-pane glass!
  buildShootableLock(collector, mats, {
    id: F5_IDS.lockNeVault,
    x: 47.52,
    y: baseY + 2.32,
    z: -27.8,
    rotY: -Math.PI * 0.5,
    bannerText: 'VAULT RELAY SHATTERED · BLACK-OPS PROTOTYPE VAULT UNLOCKED',
    unlockGateId: F5_IDS.gateNeVault,
    targetGroup: cellGroup,
  });

  // Brightly Lit Vault Interior Architecture (luminous ceiling strips + vertical wall-wash columns + golden prototype dais!)
  const vaultLights: BoxSpec[] = [
    // 3 bright ceiling light strips inside vault
    { w: 7.4, h: 0.1, d: 0.42, x: 42.8, y: baseY + ceilH - 0.08, z: -28.4 },
    { w: 7.4, h: 0.1, d: 0.42, x: 42.8, y: baseY + ceilH - 0.08, z: -24.0 },
    { w: 7.4, h: 0.1, d: 0.42, x: 42.8, y: baseY + ceilH - 0.08, z: -19.6 },
    // 4 vertical interior wall-wash light columns so the vault interior reads crisply through the observation window!
    { w: 0.18, h: 6.4, d: 0.18, x: 47.52, y: baseY + 3.4, z: -30.2 },
    { w: 0.18, h: 6.4, d: 0.18, x: 47.52, y: baseY + 3.4, z: -22.2 },
    { w: 0.18, h: 6.4, d: 0.18, x: 47.52, y: baseY + 3.4, z: -17.6 },
    { w: 0.18, h: 6.4, d: 0.18, x: 38.6, y: baseY + 3.4, z: -30.8 },
  ];
  const vaultLightMesh = buildBatchedBoxesMesh(vaultLights, mats.ceilingLight, { name: 'F5_Z6_VaultInteriorLights' });
  if (vaultLightMesh) cellGroup.add(vaultLightMesh);

  // Golden Vault Prototype Armory Plinth & Glowing Perimeter Trim
  const vaultDaisMesh = buildBatchedBoxesMesh(
    [
      { w: 4.8, h: 0.18, d: 5.6, x: 43.2, y: baseY + 0.094, z: -24.2 },
      { w: 1.4, h: 1.12, d: 2.2, x: 44.6, y: baseY + 0.74, z: -29.2 },
    ],
    mats.armoredSteel,
    { castShadow: true, receiveShadow: true, name: 'F5_Z6_VaultDais' }
  );
  if (vaultDaisMesh) {
    cellGroup.add(vaultDaisMesh);
    collector.wallMeshes.push(vaultDaisMesh);
  }
  const vaultGoldTrim = buildBatchedBoxesMesh(
    [
      { w: 4.92, h: 0.06, d: 0.1, x: 43.2, y: baseY + 0.19, z: -27.0 },
      { w: 4.92, h: 0.06, d: 0.1, x: 43.2, y: baseY + 0.19, z: -21.4 },
      { w: 0.1, h: 0.06, d: 5.6, x: 40.76, y: baseY + 0.19, z: -24.2 },
      { w: 0.1, h: 0.06, d: 5.6, x: 45.64, y: baseY + 0.19, z: -24.2 },
    ],
    goldMat,
    { name: 'F5_Z6_VaultGoldTrim' }
  );
  if (vaultGoldTrim) cellGroup.add(vaultGoldTrim);

  collector.boxes.push({
    minX: 43.88,
    maxX: 45.32,
    minY: baseY,
    maxY: baseY + 1.32,
    minZ: -30.32,
    maxZ: -28.08,
    walkableTop: true,
  });

  // 4. UPPER COMMAND GALLERY (`y = 60.4m`) linking Coliseum `eastNorthUpperZ` <-> East Mech-Bay `mechToCommandUpperX`!
  addWalkableDeck(collector, {
    minX: 18.32,
    maxX: 47.68,
    minZ: -15.4,
    maxZ: -10.32,
    y: upperY,
    thickness: 0.42,
    material: mats.catwalkGrate,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F5_Z6_UpperCommandGallery',
  });

  // Grounded Columns under Upper Command Gallery
  const colSpecs: BoxSpec[] = [];
  for (const cx of [23.6, 31.0, 38.4, 46.8]) {
    colSpecs.push({ w: 0.42, h: 3.972, d: 0.42, x: cx, y: baseY + 0.004 + 1.986, z: -15.15 });
    collector.boxes.push({
      minX: cx - 0.24,
      maxX: cx + 0.24,
      minY: baseY,
      maxY: upperY,
      minZ: -15.39,
      maxZ: -14.91,
      walkableTop: false,
    });
  }
  const colMesh = buildBatchedBoxesMesh(colSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F5_Z6_GalleryColumns',
  });
  if (colMesh) {
    cellGroup.add(colMesh);
    collector.wallMeshes.push(colMesh);
  }

  // Full North Guardrail overlooking the War-Council Bunker (`z = -15.4`)
  buildGuardrailRun(collector, mats, {
    x1: 18.32,
    z1: -15.4,
    x2: 47.68,
    z2: -15.4,
    y: upperY,
    accentMat,
    targetGroup: cellGroup,
  });

  // Overhead Bunker Roof Beams & Main Briefing Lighting
  const roofTrussSpecs: BoxSpec[] = [];
  const roofLightSpecs: BoxSpec[] = [];
  for (const bz of [-27.0, -21.0, -14.0]) {
    roofTrussSpecs.push({ w: 19.3, h: 0.44, d: 0.4, x: 28.0, y: baseY + ceilH - 0.22, z: bz });
    roofLightSpecs.push({ w: 11.4, h: 0.08, d: 0.34, x: 28.0, y: baseY + ceilH - 0.06, z: bz + 2.4 });
  }
  const roofTrussMesh = buildBatchedBoxesMesh(roofTrussSpecs, mats.structuralSteel, { name: 'F5_Z6_RoofTrusses' });
  if (roofTrussMesh) cellGroup.add(roofTrussMesh);
  const roofLightMesh = buildBatchedBoxesMesh(roofLightSpecs, mats.ceilingLight, { name: 'F5_Z6_RoofLights' });
  if (roofLightMesh) cellGroup.add(roofLightMesh);

  // 5. STRATEGIC WAR-COUNCIL BRIEFING TABLE (`x = 27.6, z = -23.8`), Consoles, Equipment Lockers & 2 Barrels!
  const tableSpecs: BoxSpec[] = [
    { w: 6.2, h: 0.24, d: 3.6, x: 27.6, y: baseY + 0.124, z: -23.8 },
    { w: 5.0, h: 0.72, d: 2.2, x: 27.6, y: baseY + 0.61, z: -23.8 },
    { w: 5.8, h: 0.14, d: 3.1, x: 27.6, y: baseY + 1.04, z: -23.8 },
  ];
  const tableMesh = buildBatchedBoxesMesh(tableSpecs, mats.armoredSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F5_Z6_WarCouncilTable',
  });
  if (tableMesh) {
    cellGroup.add(tableMesh);
    collector.wallMeshes.push(tableMesh);
  }
  const mapGlowMesh = buildBatchedBoxesMesh(
    [{ w: 4.8, h: 0.04, d: 2.2, x: 27.6, y: baseY + 1.13, z: -23.8 }],
    accentMat,
    { name: 'F5_Z6_WarCouncilMapGlow' }
  );
  if (mapGlowMesh) cellGroup.add(mapGlowMesh);

  collector.boxes.push({
    minX: 24.5,
    maxX: 30.7,
    minY: baseY,
    maxY: baseY + 1.15,
    minZ: -25.6,
    maxZ: -22.0,
    walkableTop: true,
  });

  buildTacticalConsoleBenches(
    collector,
    mats,
    [
      { x: 27.6, y: baseY, z: -30.4, w: 5.2, h: 1.04, d: 0.86 },
      { x: 30.0, y: upperY, z: -14.65, w: 4.2, h: 1.0, d: 0.72 },
    ],
    { targetGroup: cellGroup, accentMat, name: 'F5_Z6_CommandConsoles' }
  );

  buildWallEquipmentBays(
    collector,
    mats,
    [
      { axis: 'z', coord: 18.34, inwardDir: 1, centerAlong: -24.4, baseY, width: 5.2, height: 3.1 },
    ],
    { targetGroup: cellGroup, accentMat, name: 'F5_Z6_BriefingArmoryBays' }
  );

  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: 22.0, y: baseY, z: -18.8, w: 2.4, h: 0.98, d: 0.9, walkableTop: true },
      { x: 33.4, y: baseY, z: -18.8, w: 2.4, h: 0.98, d: 0.9, walkableTop: true },
    ],
    { targetGroup: cellGroup, accentMat: mats.hazardStripe, name: 'F5_Z6_BunkerCover' }
  );

  buildExplosiveBarrel(collector, mats, { id: 'f5_barrel_cmd_w', x: 22.4, y: baseY, z: -26.8, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f5_barrel_cmd_e', x: 33.6, y: baseY, z: -27.4, targetGroup: cellGroup });

  // Clean Unobstructed Signage
  addWallStencilPlaque(cellGroup, mats, {
    code: 'CMD-5',
    title: 'WAR-COUNCIL BRIEFING BUNKER',
    subtitle: 'STRATEGIC OPERATIONS · PROTOTYPE VAULT SECTOR',
    accentHex: 0xfb7185,
    x: 27.6,
    y: baseY + 6.4,
    z: -31.62,
    rotY: 0,
    width: 6.4,
    height: 1.48,
  });
  addWallStencilPlaque(cellGroup, mats, {
    code: 'VLT-5',
    title: 'BLACK-OPS PROTOTYPE VAULT',
    subtitle: 'AUTHORIZED ACCESS ONLY · RELAY LOCKED',
    accentHex: 0xeab308,
    x: 37.62,
    y: baseY + 5.8,
    z: -24.0,
    rotY: -Math.PI * 0.5,
    width: 5.6,
    height: 1.32,
  });

  return {
    id: 'f5_ne_command',
    group: cellGroup,
    triggerBounds: { minX: 14.0, maxX: 48.5, minZ: -32.5, maxZ: -6.5 },
    center: { x: 33.0, z: -21.0 },
    maxViewDistance: 46.0,
  };
}
