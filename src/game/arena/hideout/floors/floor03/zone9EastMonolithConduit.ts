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
  buildLockedSecurityGate,
  buildRetractableBridge,
  buildShootableLock,
  buildWorldSwitch,
} from '../../mechanics';
import {
  addF3PortalSill,
  F3_CEIL_H,
  F3_GRID,
  F3_IDS,
  F3_L0_Y,
  F3_L1_Y,
  F3_L2_Y,
  F3_PORTAL_L0,
  F3_PORTAL_L1,
  F3_PORTAL_L2,
  F3_PORTALS,
  F3_ROOF_CENTER_Y,
  F3_ROOF_THICK,
} from './layout';

/**
 * FLOOR 03 — ZONE 9 (EAST OCCLUSION CELL): EAST HANGING MONOLITH CONDUIT & CRISS-CROSS 3-TIER BRIDGES
 * Footprint: x ∈ [+12.0, +54.0], z ∈ [-4.0, +9.0] (`42m × 13m`)
 *
 * - Monumental temple approach toward the SE Grand Crown Reliquary (Zone 11):
 *   1. 2nd **12.0m Express Grand Temple Staircase** climbing straight `L0 (28.0m) → L2 (34.2m)` (`x: +28.0 → +40.0`)!
 *   2. **Retractable Level 2 Monolith Skybridge #2 (`f3_bridge_monolith_l2`)** spanning `12.6m` East-West
 *      across the South L2 canyon (dual `[E]` Switch + Shootable Relay)!
 *   3. **Locked Reliquary Bypass Gate (`f3_gate_reliquary_bypass`)** at `x = +24.0, z = +9.0` (unlocked by
 *      sniping the high Conduit Relay `f3_lock_reliquary_bypass` OR hitting the shortcut switch inside Zone 11!),
 *      while the main ceremonial East Arch (`x ∈ [+45.0, +49.0]`) leads freely into Zone 11!
 */
export function buildFloor3Zone9EastMonolithConduit(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const y0 = F3_L0_Y; // 28.0m
  const y1 = F3_L1_Y; // 31.1m
  const y2 = F3_L2_Y; // 34.2m
  const ceilH = F3_CEIL_H; // 10.3m
  const accentMat = mats.floorAccent[3];
  const goldMat = mats.auroraGold;

  const cellGroup = new THREE.Group();
  cellGroup.name = 'F3_CELL_Z9_EAST_MONOLITH';
  collector.group.add(cellGroup);

  // 1. L0 Full Monolith Conduit Floor (`x ∈ [+12, +54], z ∈ [-4, +9]`)
  addWalkableDeck(collector, {
    minX: F3_GRID.X_CORE_EAST,
    maxX: F3_GRID.X_EAST_OUTER,
    minZ: F3_GRID.Z_THRESHOLD,
    maxZ: F3_GRID.Z_CLOISTER_SOUTH,
    y: y0,
    thickness: 0.56,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    name: 'F3_Z9_L0_Floor',
  });

  // 2. Single-Owner Walls: North (`z = -4.0` into Zones 7 & 8), South (`z = +9.0` into Zone 11), East exterior (`x = +54.0`)
  //    (West `x = +12.0` is owned by Zone 2!)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F3_GRID.Z_THRESHOLD,
    spanStart: F3_GRID.X_CORE_EAST + 0.3,
    spanEnd: F3_GRID.X_EAST_OUTER + 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.basaltStone,
    accentMat: goldMat,
    targetGroup: cellGroup,
    portals: [
      // Into Zone 7 NE Prism Archive
      { start: F3_PORTALS.Z9_Z7_L0_X[0], end: F3_PORTALS.Z9_Z7_L0_X[1], ...F3_PORTAL_L0, kind: 'door', framed: true, accentHeader: true },
      { start: F3_PORTALS.Z9_Z7_L1_X[0], end: F3_PORTALS.Z9_Z7_L1_X[1], ...F3_PORTAL_L1, kind: 'door', framed: true, accentHeader: true },
      { start: F3_PORTALS.Z9_Z7_L2_X[0], end: F3_PORTALS.Z9_Z7_L2_X[1], ...F3_PORTAL_L2, kind: 'door', framed: true, accentHeader: true },
      // Into Zone 8 NE Aurora Spire
      { start: F3_PORTALS.Z9_Z8_L0_X[0], end: F3_PORTALS.Z9_Z8_L0_X[1], ...F3_PORTAL_L0, kind: 'door', framed: true, accentHeader: true },
      { start: F3_PORTALS.Z9_Z8_L1_X[0], end: F3_PORTALS.Z9_Z8_L1_X[1], ...F3_PORTAL_L1, kind: 'door', framed: true, accentHeader: true },
      { start: F3_PORTALS.Z9_Z8_L2_X[0], end: F3_PORTALS.Z9_Z8_L2_X[1], ...F3_PORTAL_L2, kind: 'door', framed: true, accentHeader: true },
    ],
    name: 'F3_Z9_NorthWall',
  });

  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F3_GRID.Z_CLOISTER_SOUTH,
    spanStart: F3_GRID.X_CORE_EAST + 0.3,
    spanEnd: F3_GRID.X_EAST_OUTER + 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.basaltStone,
    accentMat: goldMat,
    targetGroup: cellGroup,
    portals: [
      // Locked Reliquary Bypass Shortcut Gate (`x ∈ [+22, +26]`)
      { start: F3_PORTALS.Z9_Z11_GATE_X[0], end: F3_PORTALS.Z9_Z11_GATE_X[1], ...F3_PORTAL_L0, kind: 'door', framed: true, accentHeader: true },
      // Main Ceremonial Open East Arch into Zone 11 (`x ∈ [+45, +49]`)
      { start: F3_PORTALS.Z9_Z11_L0_EAST_X[0], end: F3_PORTALS.Z9_Z11_L0_EAST_X[1], ...F3_PORTAL_L0, kind: 'door', framed: true, accentHeader: true },
      // L1 & L2 Portals into Zone 11
      { start: F3_PORTALS.Z9_Z11_L1_X[0], end: F3_PORTALS.Z9_Z11_L1_X[1], ...F3_PORTAL_L1, kind: 'door', framed: true, accentHeader: true },
      { start: F3_PORTALS.Z9_Z11_L2_X[0], end: F3_PORTALS.Z9_Z11_L2_X[1], ...F3_PORTAL_L2, kind: 'door', framed: true, accentHeader: true },
    ],
    name: 'F3_Z9_SouthWall',
  });

  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F3_GRID.X_EAST_OUTER,
    spanStart: F3_GRID.Z_THRESHOLD + 0.3,
    spanEnd: F3_GRID.Z_CLOISTER_SOUTH - 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.basaltStone,
    targetGroup: cellGroup,
    name: 'F3_Z9_EastOuterWall',
  });

  // Zero-gap elevated doorway threshold sills on Zone 9 North & South partition walls
  addF3PortalSill(collector, { axis: 'x', coord: F3_GRID.Z_THRESHOLD, span: F3_PORTALS.Z9_Z7_L1_X, y: y1, material: mats.basaltStone, targetGroup: cellGroup, name: 'F3_Z9_Sill_Z7_L1' });
  addF3PortalSill(collector, { axis: 'x', coord: F3_GRID.Z_THRESHOLD, span: F3_PORTALS.Z9_Z7_L2_X, y: y2, material: mats.glacialMarble, targetGroup: cellGroup, name: 'F3_Z9_Sill_Z7_L2' });
  addF3PortalSill(collector, { axis: 'x', coord: F3_GRID.Z_THRESHOLD, span: F3_PORTALS.Z9_Z8_L1_X, y: y1, material: mats.basaltStone, targetGroup: cellGroup, name: 'F3_Z9_Sill_Z8_L1' });
  addF3PortalSill(collector, { axis: 'x', coord: F3_GRID.Z_THRESHOLD, span: F3_PORTALS.Z9_Z8_L2_X, y: y2, material: mats.glacialMarble, targetGroup: cellGroup, name: 'F3_Z9_Sill_Z8_L2' });
  addF3PortalSill(collector, { axis: 'x', coord: F3_GRID.Z_CLOISTER_SOUTH, span: F3_PORTALS.Z9_Z11_L1_X, y: y1, material: mats.basaltStone, targetGroup: cellGroup, name: 'F3_Z9_Sill_Z11_L1' });
  addF3PortalSill(collector, { axis: 'x', coord: F3_GRID.Z_CLOISTER_SOUTH, span: F3_PORTALS.Z9_Z11_L2_X, y: y2, material: mats.glacialMarble, targetGroup: cellGroup, name: 'F3_Z9_Sill_Z11_L2' });

  // Locked Reliquary L0 Shortcut Gate (`x = +24.0, z = +9.0`) + Shootable High Relay above it!
  buildLockedSecurityGate(collector, mats, {
    id: F3_IDS.gateReliquaryBypass,
    label: 'RELIQUARY SHORTCUT GATE',
    x: 24.0,
    y: y0,
    z: F3_GRID.Z_CLOISTER_SOUTH,
    width: 4.0,
    height: 2.65,
    spanAxis: 'x',
    lockedHint: 'SHORTCUT SEALED · PROCEED EAST TO MAIN ARCH OR SHOOT OVERHEAD RELAY',
    targetGroup: cellGroup,
  });
  buildShootableLock(collector, mats, {
    id: F3_IDS.lockReliquaryBypass,
    bannerText: 'BYPASS RELAY SHATTERED · RELIQUARY SHORTCUT GATE UNSEALED!',
    x: 24.0,
    y: y0 + 3.2,
    z: F3_GRID.Z_CLOISTER_SOUTH - 0.38,
    rotY: Math.PI,
    unlockGateId: F3_IDS.gateReliquaryBypass,
    targetGroup: cellGroup,
  });

  // 3. LEVEL 1 (`31.1m`) CONDUIT GALLERIES (North Promenade + Cross-Bridge + South L1 Landing)
  //    North L1 Promenade (`x ∈ [+12.31, +53.69], z ∈ [-3.69, -0.3]`) -> links Zone 2 L1, Zone 7 L1, Zone 8 L1!
  addWalkableDeck(collector, {
    minX: 12.31,
    maxX: 53.69,
    minZ: -3.69,
    maxZ: -0.3,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z9_L1_NorthPromenade',
  });
  //    South L1 Reliquary Approach (`x ∈ [+24.3, +38.0], z ∈ [+5.6, +8.69]`) -> connects Zone 11 L1 (`x ∈ [+32.4, +36.0]`)!
  addWalkableDeck(collector, {
    minX: 24.3,
    maxX: 38.0,
    minZ: 5.6,
    maxZ: 8.69,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z9_L1_SouthApproach',
  });
  //    L1 Cross-Bridge (`x ∈ [+24.3, +27.5], z ∈ [-0.3, +5.6]`) — cleanly 0.5m West of Express Stair foot (`x = +28.0`)!
  addWalkableDeck(collector, {
    minX: 24.3,
    maxX: 27.5,
    minZ: -0.3,
    maxZ: 5.6,
    y: y1,
    thickness: 0.34,
    material: mats.basaltStone,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z9_L1_CrossBridge',
  });

  buildGuardrailRun(collector, mats, { x1: 12.35, z1: -0.3, x2: 24.3, z2: -0.3, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 27.5, z1: -0.3, x2: 53.65, z2: -0.3, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 24.3, z1: -0.3, x2: 24.3, z2: 5.6, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 27.5, z1: -0.3, x2: 27.5, z2: 5.6, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 27.5, z1: 5.6, x2: 38.0, z2: 5.6, y: y1, accentMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 38.0, z1: 5.6, x2: 38.0, z2: 8.65, y: y1, accentMat, targetGroup: cellGroup });

  // 4. LEVEL 2 (`34.2m`) CONDUIT CROWN DECKS + RETRACTABLE SKYBRIDGE #2!
  //    East L2 Crown Terrace (`x ∈ [+40.0, +53.69], z ∈ [-3.69, +8.69]`) — receives Express `L0 → L2` Stair at `x = +40.0`!
  //    Links Zone 8 L2 (`x ∈ [+41.0, +45.0]`) AND Zone 11 L2 (`x ∈ [+45.0, +49.0]`)!
  addWalkableDeck(collector, {
    minX: 40.0,
    maxX: 53.69,
    minZ: -3.69,
    maxZ: 8.69,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z9_L2_EastCrownTerrace',
  });
  //    North L2 Skywalk (`x ∈ [+12.31, +40.0], z ∈ [-3.69, -0.5]`) — connects Zone 7 L2 (`x ∈ [+20.0, +24.0]`)!
  addWalkableDeck(collector, {
    minX: 12.31,
    maxX: 40.0,
    minZ: -3.69,
    maxZ: -0.5,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z9_L2_NorthSkywalk',
  });
  //    West L2 Overlook Deck (`x ∈ [+12.31, +27.4], z ∈ [-0.5, +8.0]` — connects Zone 2 L2 `z ∈ [+0.2, +4.8]` AND receives Retractable Bridge #2!)
  addWalkableDeck(collector, {
    minX: 12.31,
    maxX: 15.8,
    minZ: -0.5,
    maxZ: 8.0,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z9_L2_WestSpur',
  });
  addWalkableDeck(collector, {
    minX: 15.8,
    maxX: 27.4,
    minZ: 5.0,
    maxZ: 8.0,
    y: y2,
    thickness: 0.34,
    material: mats.glacialMarble,
    targetGroup: cellGroup,
    castShadow: true,
    name: 'F3_Z9_L2_WestBridgeReceiver',
  });

  // L2 Guardrails (OPEN at Express Stair top `z ∈ [+0.9, +4.1]` on `x = +40.0` AND Retractable Bridge #2 mouth `z ∈ [+5.0, +8.0]`!)
  buildGuardrailRun(collector, mats, { x1: 40.0, z1: -0.5, x2: 40.0, z2: 0.9, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 40.0, z1: 4.1, x2: 40.0, z2: 5.0, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 15.8, z1: -0.5, x2: 40.0, z2: -0.5, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 15.8, z1: -0.5, x2: 15.8, z2: 5.0, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 15.8, z1: 5.0, x2: 27.4, z2: 5.0, y: y2, accentMat: goldMat, targetGroup: cellGroup });
  buildGuardrailRun(collector, mats, { x1: 12.35, z1: 8.0, x2: 27.4, z2: 8.0, y: y2, accentMat: goldMat, targetGroup: cellGroup });

  // Retractable Level 2 Monolith Skybridge #2 (`x: +40.0 → +27.4`, `z = +6.5`, `length = 12.6m`, `width = 3.0m`)!
  buildRetractableBridge(collector, mats, {
    id: F3_IDS.bridgeMonolithL2,
    label: 'MONOLITH L2 SKYBRIDGE',
    anchorX: 40.0,
    y: y2,
    anchorZ: 6.5,
    extendDirX: -1,
    extendDirZ: 0,
    length: 12.6,
    width: 3.0,
    targetGroup: cellGroup,
    accentMat: goldMat,
  });
  buildWorldSwitch(collector, mats, {
    id: F3_IDS.switchMonolithL2,
    x: 41.2,
    y: y2,
    z: 8.0,
    rotY: Math.PI * 0.5,
    promptLocked: '[E] EXTEND MONOLITH L2 SKYBRIDGE',
    promptActivated: 'MONOLITH L2 SKYBRIDGE EXTENDED',
    bannerText: 'MONOLITH L2 SKYBRIDGE DEPLOYED · DIRECT CROWN EXPRESSWAY OPEN!',
    deployBridgeId: F3_IDS.bridgeMonolithL2,
    targetGroup: cellGroup,
  });
  buildShootableLock(collector, mats, {
    id: F3_IDS.lockMonolithL2,
    bannerText: 'CONDUIT RELAY SHATTERED · MONOLITH L2 SKYBRIDGE DEPLOYED!',
    x: 27.2,
    y: y2 + 1.45,
    z: 5.18,
    rotY: -Math.PI * 0.5,
    deployBridgeId: F3_IDS.bridgeMonolithL2,
    targetGroup: cellGroup,
  });

  // 5. 2ND HERO EXPRESS `L0 → L2` GRAND TEMPLE STAIRCASE (`12.0m` uninterrupted climb `28.0m → 34.2m`!)
  buildStraightStairFlight(collector, mats, {
    x: 34.0,
    z: 2.5,
    width: 3.2,
    length: 12.0,
    yStart: y0, // x = +28.0 -> 28.0m
    yEnd: y2, // x = +40.0 -> 34.2m (East L2 Crown Terrace -> straight into Zone 11 L2!)
    axis: 'x',
    steps: 28,
    railMinSide: true,
    railMaxSide: true,
    targetGroup: cellGroup,
    accentMat: goldMat,
  });

  // Also add Flush South-Wall `L0 → L1` Stair (`x: +18.5 → +24.3, z = +7.7`, flush against `z = +8.7`!)
  buildStraightStairFlight(collector, mats, {
    x: 21.4,
    z: 7.7,
    width: 2.0,
    length: 5.8,
    yStart: y0, // x = +18.5 -> 28.0m
    yEnd: y1, // x = +24.3 -> 31.1m (South L1 Approach!)
    axis: 'x',
    railMinSide: true,
    railMaxSide: false,
    targetGroup: cellGroup,
    accentMat,
  });

  // 6. Floating Hanging Basalt Monolith Prisms + Structural Columns + Roof Slab (`top = 38.80m`)
  const basaltSpecs: BoxSpec[] = [];
  const goldSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];

  // Suspended monolith blades hanging from ceiling strictly over open high-ceiling spaces (`y_bot = 36.6m`, +2.4m above L2!)
  for (const mx of [19.5, 29.0, 36.0]) {
    basaltSpecs.push({ w: 1.2, h: 1.65, d: 0.72, x: mx, y: y0 + 9.45, z: 2.5 });
    goldSpecs.push({ w: 1.32, h: 0.14, d: 0.84, x: mx, y: y0 + 8.6, z: 2.5 });
  }
  const tallColH = y2 - 0.34 - (y0 + 0.006);
  for (const pz of [-0.8, 5.8]) {
    basaltSpecs.push({ w: 0.68, h: tallColH, d: 0.68, x: 40.6, y: y0 + 0.006 + tallColH * 0.5, z: pz });
    goldSpecs.push({ w: 0.84, h: 0.14, d: 0.84, x: 40.6, y: y2 - 0.42, z: pz });
    collector.boxes.push({
      minX: 40.22,
      maxX: 40.98,
      minY: y0,
      maxY: y2,
      minZ: pz - 0.38,
      maxZ: pz + 0.38,
      walkableTop: false,
    });
  }

  for (const lx of [21.0, 34.0, 46.0]) {
    lightSpecs.push({ w: 8.5, h: 0.1, d: 0.44, x: lx, y: y0 + ceilH - 0.06, z: 2.5 });
  }

  const roofMesh = buildBatchedBoxesMesh(
    [{ w: 42.3, h: F3_ROOF_THICK, d: 13.0, x: 33.15, y: F3_ROOF_CENTER_Y, z: 2.5 }],
    mats.basaltStone,
    { receiveShadow: true, name: 'F3_Z9_RoofSlab' }
  );
  if (roofMesh) {
    cellGroup.add(roofMesh);
    collector.wallMeshes.push(roofMesh);
  }
  const monoMesh = buildBatchedBoxesMesh(basaltSpecs, mats.basaltStone, {
    castShadow: true,
    receiveShadow: true,
    name: 'F3_Z9_HangingMonoliths',
  });
  if (monoMesh) {
    cellGroup.add(monoMesh);
    collector.wallMeshes.push(monoMesh);
  }
  const goldMesh = buildBatchedBoxesMesh(goldSpecs, goldMat, { name: 'F3_Z9_GoldTrim' });
  if (goldMesh) cellGroup.add(goldMesh);
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F3_Z9_Lights' });
  if (lightMesh) cellGroup.add(lightMesh);

  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: 17.0, y: y0, z: 2.5, w: 0.9, h: 1.0, d: 2.4, walkableTop: true },
      { x: 46.5, y: y2, z: 2.5, w: 0.9, h: 1.0, d: 2.6, walkableTop: true },
    ],
    { targetGroup: cellGroup, accentMat: goldMat, name: 'F3_Z9_Cover' }
  );

  buildExplosiveBarrel(collector, mats, { id: 'f3_barrel_z9_l0', x: 20.5, y: y0, z: 0.6, targetGroup: cellGroup });
  buildExplosiveBarrel(collector, mats, { id: 'f3_barrel_z9_l2', x: 43.2, y: y2, z: -1.4, targetGroup: cellGroup });

  addWallStencilPlaque(cellGroup, mats, {
    code: '03-MC',
    title: 'MONOLITH CONDUIT',
    subtitle: 'EXPRESS L0→L2 GRAND STAIR · SOUTH TO RELIQUARY',
    accentHex: 0xe6ad46,
    x: 53.62,
    y: y2 + 2.6,
    z: 2.5,
    rotY: -Math.PI * 0.5,
    width: 6.4,
    height: 1.4,
  });

  return {
    id: 'f3_zone9_east_monolith_conduit',
    group: cellGroup,
    triggerBounds: { minX: 8.0, maxX: 54.0, minZ: -8.0, maxZ: 13.0 },
    center: { x: 33.0, z: 2.5 },
    maxViewDistance: 68.0,
  };
}
