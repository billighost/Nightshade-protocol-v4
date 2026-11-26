import * as THREE from 'three';
import { buildMassiveBulkheadDoor } from '../../mechanics';
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
import { buildGuardrailRun, type FloorGeometryCollector } from '../../stairs';
import type { BulkheadDoorRig } from '../../types';
import {
  buildLockedSecurityGate,
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
 * FLOOR 03 — ZONE 1 (NORTH CORE): SEALED ARRIVAL THRESHOLD VESTIBULE
 * Footprint: x ∈ [-12, +12], z ∈ [-17.0, -4.0]
 *
 * Breaks the Floor 8–4 template immediately upon arrival:
 * - Spawn inside a mysterious carved basalt-and-marble Forerunner Quarantine Vestibule facing South (+Z).
 * - The forward Threshold Gate (`f3_gate_vestibule_seal`) is SEALED — NO L0 side exits!
 * - Solve the opening threshold puzzle by EITHER:
 *   1. Shooting the glowing Cryo-Resonator Relay (`f3_lock_vestibule_seal`) suspended above the gate, OR
 *   2. Activating the Ancient Keystone Pedestal (`f3_switch_vestibule_seal`, `[E]`).
 * - Flanking twin frosted panoramic windows preview the branching Obsidian Cloister & rotating Astrolabe beyond.
 * - Looking up reveals TWO stacked overhead temple sky-galleries (`L1 = 31.1m` and `L2 = 34.2m`) spanning
 *   right across the vestibule ceiling linking Zone 4 (NW Aqueduct) <-> Zone 7 (NE Prism Archive)!
 */
export function buildFloor3Zone1SealedThreshold(
  collector: FloorGeometryCollector,
  detailGroup: THREE.Group,
  mats: HideoutMaterialRegistry
): BulkheadDoorRig {
  const y0 = F3_L0_Y; // 28.0m
  const y1 = F3_L1_Y; // 31.1m
  const y2 = F3_L2_Y; // 34.2m
  const ceilH = F3_CEIL_H; // 10.3m
  const group = collector.group;
  const accentMat = mats.floorAccent[3]; // Glacial cyan
  const goldMat = mats.auroraGold;

  // 1. Luminous Glacial Marble Floor Deck (`x ∈ [-12, +12], z ∈ [-17, -4]`)
  addWalkableDeck(collector, {
    minX: F3_GRID.X_CORE_WEST,
    maxX: F3_GRID.X_CORE_EAST,
    minZ: F3_GRID.Z_ARRIVAL,
    maxZ: F3_GRID.Z_THRESHOLD,
    y: y0,
    thickness: 0.56,
    material: mats.glacialMarble,
    name: 'F3_Z1_VestibuleFloor',
  });

  // 2. North Arrival Perimeter Wall (`z = -17.0`) with 5.6m × 5.4m Arrival Bulkhead 03 cutout
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F3_GRID.Z_ARRIVAL,
    spanStart: F3_GRID.X_CORE_WEST - 0.3,
    spanEnd: F3_GRID.X_CORE_EAST + 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.basaltStone,
    accentMat: goldMat,
    portals: [
      {
        start: -2.8,
        end: 2.8,
        bottomY: y0,
        topY: y0 + 5.4,
        kind: 'door',
        framed: false,
      },
    ],
    name: 'F3_Z1_NorthArrivalWall',
  });

  // 3. South Threshold Wall (`z = -4.0`, single-owner by Zone 1!)
  //    Center Sealed Gate (`[-2.4, +2.4]`) + twin panoramic frost windows peering into Zone 2 Cloister!
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F3_GRID.Z_THRESHOLD,
    spanStart: F3_GRID.X_CORE_WEST - 0.3,
    spanEnd: F3_GRID.X_CORE_EAST + 0.3,
    baseY: y0,
    height: ceilH,
    wallMat: mats.basaltStone,
    accentMat,
    portals: [
      {
        start: F3_PORTALS.Z1_Z2_GATE_X[0],
        end: F3_PORTALS.Z1_Z2_GATE_X[1],
        ...F3_PORTAL_L0,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
      {
        start: -8.6,
        end: -3.6,
        bottomY: y0 + 0.9,
        topY: y0 + 2.55,
        kind: 'window',
        framed: true,
      },
      {
        start: 3.6,
        end: 8.6,
        bottomY: y0 + 0.9,
        topY: y0 + 2.55,
        kind: 'window',
        framed: true,
      },
    ],
    name: 'F3_Z1_SouthThresholdWall',
  });

  // 4. West (`x = -12.0`) & East (`x = +12.0`) Side Walls (single-owner by Zone 1 for z ∈ [-17, -4])
  //    ONLY L1 & L2 Sky-Gallery portals — ZERO L0 bypass so the opening gate puzzle is mandatory!
  for (const side of [-1, 1] as const) {
    buildArchitecturalWall(collector, mats, {
      axis: 'z',
      coord: side < 0 ? F3_GRID.X_CORE_WEST : F3_GRID.X_CORE_EAST,
      spanStart: F3_GRID.Z_ARRIVAL + 0.3,
      spanEnd: F3_GRID.Z_THRESHOLD - 0.3,
      baseY: y0,
      height: ceilH,
      wallMat: mats.basaltStone,
      accentMat: goldMat,
      portals: [
        {
          start: F3_PORTALS.Z1_SIDE_GALLERY_Z[0],
          end: F3_PORTALS.Z1_SIDE_GALLERY_Z[1],
          ...F3_PORTAL_L1,
          kind: 'door',
          framed: true,
          accentHeader: true,
        },
        {
          start: F3_PORTALS.Z1_SIDE_GALLERY_Z[0],
          end: F3_PORTALS.Z1_SIDE_GALLERY_Z[1],
          ...F3_PORTAL_L2,
          kind: 'door',
          framed: true,
          accentHeader: true,
        },
      ],
      name: side < 0 ? 'F3_Z1_WestWall' : 'F3_Z1_EastWall',
    });
  }

  // 5. Twin Overhead Sky-Galleries crossing directly above the Vestibule at L1 (`31.1m`) & L2 (`34.2m`)
  //    Linking Zone 4 (NW Aqueduct) <-> Zone 7 (NE Archive)! Inset 6mm from x = ±11.7 wall faces.
  for (const [tierIdx, deckY] of [
    [1, y1],
    [2, y2],
  ] as const) {
    addWalkableDeck(collector, {
      minX: -11.69,
      maxX: 11.69,
      minZ: F3_PORTALS.Z1_SIDE_GALLERY_Z[0],
      maxZ: F3_PORTALS.Z1_SIDE_GALLERY_Z[1],
      y: deckY,
      thickness: 0.34,
      material: tierIdx === 1 ? mats.basaltStone : mats.glacialMarble,
      castShadow: true,
      name: `F3_Z1_OverheadGallery_L${tierIdx}`,
    });
    buildGuardrailRun(collector, mats, {
      x1: -11.6,
      z1: F3_PORTALS.Z1_SIDE_GALLERY_Z[0],
      x2: 11.6,
      z2: F3_PORTALS.Z1_SIDE_GALLERY_Z[0],
      y: deckY,
      accentMat: tierIdx === 1 ? accentMat : goldMat,
    });
    buildGuardrailRun(collector, mats, {
      x1: -11.6,
      z1: F3_PORTALS.Z1_SIDE_GALLERY_Z[1],
      x2: 11.6,
      z2: F3_PORTALS.Z1_SIDE_GALLERY_Z[1],
      y: deckY,
      accentMat: tierIdx === 1 ? accentMat : goldMat,
    });
    for (const side of [-1, 1] as const) {
      addF3PortalSill(collector, {
        axis: 'z',
        coord: side < 0 ? F3_GRID.X_CORE_WEST : F3_GRID.X_CORE_EAST,
        span: F3_PORTALS.Z1_SIDE_GALLERY_Z,
        y: deckY,
        material: tierIdx === 1 ? mats.basaltStone : mats.glacialMarble,
        name: `F3_Z1_Sill_${side < 0 ? 'W' : 'E'}_L${tierIdx}`,
      });
    }
  }

  // 6. Opening Sealed Threshold Gate + Dual Unlock Puzzle (Shootable Cryo-Resonator OR Keystone Switch!)
  buildLockedSecurityGate(collector, mats, {
    id: F3_IDS.gateVestibuleSeal,
    label: 'CITADEL THRESHOLD SEAL',
    x: 0,
    y: y0,
    z: F3_GRID.Z_THRESHOLD,
    width: 4.8,
    height: 2.65,
    spanAxis: 'x',
    lockedHint: 'THRESHOLD SEALED · SHOOT CRYO-RESONATOR ABOVE GATE OR ACTIVATE KEYSTONE [E]',
  });

  // Glowing Shootable Cryo-Resonator Relay mounted proudly above the gate lintel facing North (-Z toward spawn!)
  buildShootableLock(collector, mats, {
    id: F3_IDS.lockVestibuleSeal,
    bannerText: 'CRYO-RESONATOR SHATTERED · CITADEL THRESHOLD UNSEALED!',
    x: 0,
    y: y0 + 3.24,
    z: F3_GRID.Z_THRESHOLD - 0.44,
    rotY: Math.PI,
    unlockGateId: F3_IDS.gateVestibuleSeal,
  });

  // Alternative Ancient Keystone Pedestal Switch right inside the Vestibule (`[E]` to unseal!)
  buildWorldSwitch(collector, mats, {
    id: F3_IDS.switchVestibuleSeal,
    x: 4.2,
    y: y0,
    z: -6.4,
    rotY: Math.PI,
    promptLocked: '[E] ACTIVATE ANCIENT KEYSTONE · UNSEAL CITADEL THRESHOLD',
    promptActivated: 'CITADEL THRESHOLD UNSEALED',
    bannerText: 'KEYSTONE ENGAGED · OBSIDIAN CLOISTER PASSAGES UNSEALED!',
    unlockGateId: F3_IDS.gateVestibuleSeal,
  });

  // 7. Monolithic Carved Basalt & Aurora-Gold Temple Pillars + Ritual Inlay Floor Strips + Ceiling Roof
  const basaltSpecs: BoxSpec[] = [];
  const goldSpecs: BoxSpec[] = [];
  const cyanSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];

  // 4 monumental fluted temple columns framing the arrival avenue (`x = ±6.4, z = -12.2 / -6.2`)
  const colH = y1 - 0.34 - (y0 + 0.006);
  for (const cx of [-6.4, 6.4]) {
    // Grounded under overhead gallery at z = -9.5
    basaltSpecs.push({
      w: 0.78,
      h: colH,
      d: 0.78,
      x: cx,
      y: y0 + 0.006 + colH * 0.5,
      z: -9.5,
    });
    goldSpecs.push(
      { w: 0.96, h: 0.16, d: 0.96, x: cx, y: y0 + 0.098, z: -9.5 },
      { w: 0.96, h: 0.16, d: 0.96, x: cx, y: y1 - 0.44, z: -9.5 }
    );
    collector.boxes.push({
      minX: cx - 0.44,
      maxX: cx + 0.44,
      minY: y0,
      maxY: y1,
      minZ: -9.94,
      maxZ: -9.06,
      walkableTop: false,
    });

    // Fluted monolith obelisks flanking the threshold gate at z = -5.4
    basaltSpecs.push({ w: 0.68, h: 2.8, d: 0.68, x: cx * 0.56, y: y0 + 1.406, z: -5.4 });
    goldSpecs.push({ w: 0.82, h: 0.14, d: 0.82, x: cx * 0.56, y: y0 + 2.84, z: -5.4 });
    cyanSpecs.push({ w: 0.1, h: 2.3, d: 0.72, x: cx * 0.56, y: y0 + 1.45, z: -5.4 });
    collector.boxes.push({
      minX: cx * 0.56 - 0.38,
      maxX: cx * 0.56 + 0.38,
      minY: y0,
      maxY: y0 + 2.95,
      minZ: -5.78,
      maxZ: -5.02,
      walkableTop: false,
    });
  }

  // Luminous ritual floor guide inlays leading straight from Arrival Bulkhead toward Threshold Gate (raised +8mm -> zero Z-fight!)
  for (const sx of [-1.85, 1.85]) {
    goldSpecs.push({ w: 0.12, h: 0.016, d: 11.2, x: sx, y: y0 + 0.012, z: -10.5 });
  }
  cyanSpecs.push({ w: 0.24, h: 0.014, d: 10.6, x: 0, y: y0 + 0.01, z: -10.5 });

  // Overhead aurora-gold cornice frieze cleanly split around Arrival Bulkhead lintel & plaque (zero overlap!)
  goldSpecs.push(
    { w: 22.8, h: 0.22, d: 0.16, x: 0, y: y0 + 7.1, z: F3_GRID.Z_THRESHOLD - 0.42 },
    { w: 7.0, h: 0.22, d: 0.16, x: -7.9, y: y0 + 7.25, z: F3_GRID.Z_ARRIVAL + 0.42 },
    { w: 7.0, h: 0.22, d: 0.16, x: 7.9, y: y0 + 7.25, z: F3_GRID.Z_ARRIVAL + 0.42 }
  );
  for (const lz of [-14.2, -9.5, -5.6]) {
    lightSpecs.push({ w: 14.0, h: 0.1, d: 0.42, x: 0, y: y0 + ceilH - 0.06, z: lz });
  }

  // Watertight Roof Slab (`top = 38.80m < 39.00m` Floor 04 minY!)
  const roofMesh = buildBatchedBoxesMesh(
    [{ w: 24.0, h: F3_ROOF_THICK, d: 13.0, x: 0, y: F3_ROOF_CENTER_Y, z: -10.5 }],
    mats.basaltStone,
    { receiveShadow: true, name: 'F3_Z1_RoofSlab' }
  );
  if (roofMesh) {
    group.add(roofMesh);
    collector.wallMeshes.push(roofMesh);
  }

  const basaltMesh = buildBatchedBoxesMesh(basaltSpecs, mats.basaltStone, {
    castShadow: true,
    receiveShadow: true,
    name: 'F3_Z1_TempleColumns',
  });
  if (basaltMesh) {
    group.add(basaltMesh);
    collector.wallMeshes.push(basaltMesh);
  }
  const goldMesh = buildBatchedBoxesMesh(goldSpecs, goldMat, { name: 'F3_Z1_AuroraGoldTrim' });
  if (goldMesh) detailGroup.add(goldMesh);
  const cyanMesh = buildBatchedBoxesMesh(cyanSpecs, accentMat, { name: 'F3_Z1_CyanInlays' });
  if (cyanMesh) detailGroup.add(cyanMesh);
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F3_Z1_Lights' });
  if (lightMesh) detailGroup.add(lightMesh);

  // High-Readability Citadel Threshold Stencil Plaque cleanly above L1 gallery sightline
  addWallStencilPlaque(group, mats, {
    code: '03-I',
    title: 'SEALED THRESHOLD',
    subtitle: 'SHOOT CRYO-RESONATOR OR ENGAGE KEYSTONE [E]',
    accentHex: 0x67e8f9,
    x: 0,
    y: y0 + 5.75,
    z: F3_GRID.Z_THRESHOLD - 0.36,
    rotY: Math.PI,
    width: 6.4,
    height: 1.15,
  });

  // 8. Arrival Bulkhead 03 (`z = -17.0`, `rotY: 0` facing South into Zone 1) — seals behind operative on arrival!
  const arrivalDoor = buildMassiveBulkheadDoor(group, mats, {
    floor: 3,
    x: 0,
    y: y0,
    z: F3_GRID.Z_ARRIVAL,
    rotY: 0,
    width: 5.6,
    height: 5.4,
    isArrivalShutter: true,
    plaqueTitle: 'BULKHEAD 03 ARRIVAL',
    plaqueSubtitle: 'GLACIAL FORERUNNER CITADEL · LEVEL 03',
  });
  collector.boxes.push(arrivalDoor.collider);
  collector.wallMeshes.push(...arrivalDoor.raycastMeshes);

  return arrivalDoor;
}
