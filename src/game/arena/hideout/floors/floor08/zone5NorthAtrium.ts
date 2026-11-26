import * as THREE from 'three';
import { buildMassiveBulkheadDoor } from '../../mechanics';
import { buildFloorControlCenter } from '../../mechanics';
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
import {
  buildDescentAirlockGallery,
  buildGuardrailRun,
  buildStraightStairFlight,
  type FloorGeometryCollector,
} from '../../stairs';
import type { BulkheadDoorRig, ControlCenterRig, OcclusionCell } from '../../types';
import { F8_BASE_Y, F8_CEILINGS, F8_MEZZ_Y, F8_PORTALS } from './layout';

export interface Zone5NorthAtriumResult {
  occlusionCell: OcclusionCell;
  exitDoor: BulkheadDoorRig;
  controlCenter: ControlCenterRig;
}

/**
 * FLOOR 08 — ZONE 5 (NORTH WING): VERTICAL SECURITY ATRIUM & BULKHEAD 08 EXTRACTION CONCOURSE
 * Footprint: x ∈ [-24, +24] (48m wide) × z ∈ [-17, -1] (16m deep), Ceiling: 12.5m!
 *
 * All 5 routes across Floor 08 converge into this monumental High-Security Extraction Concourse:
 * - West Killhouse North Exit, Firing Hall West/East Passages, East Armory Bypass, and Upper Command Bridge (+4.4m)
 * - Twin Symmetric Descending Staircases framing Massive Bulkhead 08 straight ahead
 * - Monumental symmetric Buttress Piers at x = ±5.4 framing Bulkhead 08 with ZERO pillar obstructing the door or signage!
 * - Interactive Floor 08 Control Center ([E]) + Massive Bulkhead 08 Exit + U-turn Descent Airlock Gallery to Floor 07!
 */
export function buildFloor8Zone5NorthAtrium(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry,
  accentMat: THREE.Material
): Zone5NorthAtriumResult {
  const baseY = F8_BASE_Y; // 98.0m
  const mezzY = F8_MEZZ_Y; // 102.4m
  const ceilH = F8_CEILINGS.northAtrium; // 12.5m

  const atriumGroup = new THREE.Group();
  atriumGroup.name = 'F8_Z5_NORTH_ATRIUM_CELL';
  collector.group.add(atriumGroup);

  // 1. Main Atrium Concourse Floor (48m × 16m) & High Vaulted Ceiling
  addWalkableDeck(collector, {
    minX: -24.0,
    maxX: 24.0,
    minZ: -17.0,
    maxZ: -1.0,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    targetGroup: atriumGroup,
    name: 'F8_Z5_AtriumFloor',
  });

  const ceilMesh = buildBatchedBoxesMesh(
    [{ w: 47.4, h: 0.7, d: 15.4, x: 0, y: baseY + ceilH + 0.35, z: -9.0 }],
    mats.darkConcrete,
    { receiveShadow: false, name: 'F8_Z5_AtriumCeiling' }
  );
  if (ceilMesh) atriumGroup.add(ceilMesh);

  // 2. Atrium Exterior Walls (trimmed cleanly inside North & South corners — ZERO corner Z-fighting!)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: -24.0,
    spanStart: -16.7,
    spanEnd: -1.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: atriumGroup,
    name: 'F8_Z5_WestWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: 24.0,
    spanStart: -16.7,
    spanEnd: -1.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: atriumGroup,
    name: 'F8_Z5_EastWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F8_PORTALS.bulkheadZ,
    spanStart: -24.3,
    spanEnd: 24.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWallLight,
    accentMat,
    targetGroup: collector.group,
    portals: [
      {
        start: -F8_PORTALS.bulkheadWidth * 0.5,
        end: F8_PORTALS.bulkheadWidth * 0.5,
        bottomY: baseY,
        topY: baseY + F8_PORTALS.bulkheadHeight,
        kind: 'door',
        framed: false,
      },
    ],
    name: 'F8_Z5_NorthBulkheadWall',
  });

  // Upper South closure patches above Zone 3 & Zone 2 roofs (8mm lift prevents seam Z-fighting!)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: -1.0,
    spanStart: -23.7,
    spanEnd: -17.0,
    baseY: baseY + F8_CEILINGS.killhouse + 0.008,
    height: ceilH - F8_CEILINGS.killhouse - 0.014,
    thickness: 0.588,
    wallMat: mats.concreteWall,
    targetGroup: atriumGroup,
    includeColliders: false,
    name: 'F8_Z5_SouthWestUpperClosure',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: -1.0,
    spanStart: 17.0,
    spanEnd: 23.7,
    baseY: baseY + F8_CEILINGS.armory + 0.008,
    height: ceilH - F8_CEILINGS.armory - 0.014,
    thickness: 0.588,
    wallMat: mats.concreteWall,
    targetGroup: atriumGroup,
    includeColliders: false,
    name: 'F8_Z5_SouthEastUpperClosure',
  });

  // 3. UPPER COMMAND BRIDGE (+4.4m = 102.4m) & TWIN SYMMETRIC DESCENDING STAIRCASES!
  // Stops cleanly at maxZ = -1.32 to meet F8_Z4_NorthPortalBridge flush with ZERO Z-fighting,
  // while placing the Twin Descending Staircases at z = -5.5 (rails at -6.80 & -4.20) so ground portals
  // at z = -1.0 (West Automatic Door & East Jammed Roll Shutter) open into a generous 2.9m-wide promenade!
  addWalkableDeck(collector, {
    minX: -8.8,
    maxX: 8.8,
    minZ: -6.8,
    maxZ: -1.32,
    y: mezzY,
    thickness: 0.44,
    material: mats.catwalkGrate,
    targetGroup: atriumGroup,
    castShadow: true,
    name: 'F8_Z5_UpperCommandBridge',
  });

  // Twin Descending Staircases: z = -5.50, width = 2.46 -> outer rails at EXACT z = -6.80 and z = -4.20!
  buildStraightStairFlight(collector, mats, {
    x: -13.1,
    z: -5.5,
    width: 2.46,
    length: 8.6,
    yStart: baseY,
    yEnd: mezzY,
    axis: 'x',
    steps: 20,
    railMinSide: true,
    railMaxSide: true,
    targetGroup: atriumGroup,
    accentMat,
  });
  buildStraightStairFlight(collector, mats, {
    x: 13.1,
    z: -5.5,
    width: 2.46,
    length: 8.6,
    yStart: mezzY,
    yEnd: baseY,
    axis: 'x',
    steps: 20,
    railMinSide: true,
    railMaxSide: true,
    targetGroup: atriumGroup,
    accentMat,
  });

  // Exact Command Bridge Guardrails meeting stair top corners at (±8.8, mezzY, -6.80) & (±8.8, mezzY, -4.20)!
  buildGuardrailRun(collector, mats, {
    x1: -8.8,
    z1: -6.8,
    x2: 8.8,
    z2: -6.8,
    y: mezzY,
    accentMat,
    targetGroup: atriumGroup,
  });
  buildGuardrailRun(collector, mats, {
    x1: -8.8,
    z1: -4.2,
    x2: -8.8,
    z2: -1.32,
    y: mezzY,
    accentMat,
    targetGroup: atriumGroup,
  });
  buildGuardrailRun(collector, mats, {
    x1: 8.8,
    z1: -4.2,
    x2: 8.8,
    z2: -1.32,
    y: mezzY,
    accentMat,
    targetGroup: atriumGroup,
  });

  // Elevated Security Overlook Console Desk on the Command Bridge (center-west, leaving stair approaches wide clear!)
  buildTacticalConsoleBenches(
    collector,
    mats,
    [{ x: -5.6, y: mezzY, z: -5.6, w: 2.6, h: 0.96, d: 0.8 }],
    { targetGroup: atriumGroup, accentMat, name: 'F8_Z5_BridgeConsole' }
  );

  // 4. MONUMENTAL BRUTALIST ATRIUM ARCHITECTURE (ZERO PILASTERS OBSTRUCTING BULKHEAD 08 OR PLAQUES!)
  const steelSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  const accSpecs: BoxSpec[] = [];

  // Bridge support columns (flush beneath 0.44m Command Bridge deck — zero penetration!)
  for (const cx of [-8.4, -4.0, 4.0, 8.4]) {
    steelSpecs.push({ w: 0.52, h: 3.952, d: 0.52, x: cx, y: baseY + 0.004 + 1.976, z: -6.45 });
    collector.boxes.push({
      minX: cx - 0.3,
      maxX: cx + 0.3,
      minY: baseY,
      maxY: mezzY,
      minZ: -6.75,
      maxZ: -6.15,
      walkableTop: false,
    });
  }

  // Grand Atrium overhead steel portal ceiling beams (trimmed cleanly inside z ∈ [-16.66, -1.34] — ZERO wall overlap!)
  for (const bx of [-18.5, -12.0, -5.8, 5.8, 12.0, 18.5]) {
    steelSpecs.push({ w: 0.54, h: 0.66, d: 15.32, x: bx, y: baseY + ceilH - 0.34, z: -9.0 });
  }
  // Monumental Symmetric Buttress Piers flush IN FRONT of North Bulkhead Wall (z >= -16.68) & stopping cleanly UNDER overhead beams!
  const buttressH = ceilH - 0.684;
  for (const px of [-18.5, -5.8, 5.8, 18.5]) {
    const isHeroButtress = Math.abs(px) < 7;
    const bw = isHeroButtress ? 0.92 : 0.64;
    const bd = isHeroButtress ? 0.88 : 0.56;
    const bz = isHeroButtress ? -16.24 : -16.40;
    steelSpecs.push({
      w: bw,
      h: buttressH,
      d: bd,
      x: px,
      y: baseY + 0.004 + buttressH * 0.5,
      z: bz,
    });
    collector.boxes.push({
      minX: px - bw * 0.52,
      maxX: px + bw * 0.52,
      minY: baseY,
      maxY: baseY + ceilH,
      minZ: bz - bd * 0.52,
      maxZ: bz + bd * 0.52,
      walkableTop: false,
    });
    if (isHeroButtress) {
      // Glowing vertical security beacon strips mounted cleanly proud of hero buttresses flanking Bulkhead 08!
      accSpecs.push({
        w: 0.12,
        h: buttressH - 1.2,
        d: 0.08,
        x: px,
        y: baseY + buttressH * 0.5,
        z: bz + bd * 0.5 + 0.05,
      });
    }
  }

  // Symmetrical linear overhead atrium sky-lights
  for (const lx of [-15.2, -8.9, -2.2, 2.2, 8.9, 15.2]) {
    lightSpecs.push({ w: 0.42, h: 0.1, d: 12.6, x: lx, y: baseY + ceilH - 0.08, z: -9.0 });
  }

  // Dramatic glowing extraction runway stripes stopping cleanly BEFORE Bulkhead Hazard Apron (z >= -15.32)!
  accSpecs.push(
    { w: 0.14, h: 0.01, d: 8.4, x: -2.7, y: baseY + 0.007, z: -11.1 },
    { w: 0.14, h: 0.01, d: 8.4, x: 2.7, y: baseY + 0.007, z: -11.1 },
    { w: 42.0, h: 0.01, d: 0.12, x: 0, y: baseY + 0.016, z: -9.8 }
  );

  // High-visibility Bulkhead 08 blast threshold hazard apron on the floor
  const blastApron = buildBatchedBoxesMesh(
    [{ w: 7.4, h: 0.014, d: 0.55, x: 0, y: baseY + 0.02, z: -15.65 }],
    mats.hazardStripe,
    { name: 'F8_Z5_BulkheadHazardApron' }
  );
  if (blastApron) atriumGroup.add(blastApron);

  const steelMesh = buildBatchedBoxesMesh(steelSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F8_Z5_AtriumTrusses',
  });
  if (steelMesh) {
    atriumGroup.add(steelMesh);
    collector.wallMeshes.push(steelMesh);
  }
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, {
    name: 'F8_Z5_AtriumLights',
  });
  if (lightMesh) atriumGroup.add(lightMesh);

  const accMesh = buildBatchedBoxesMesh(accSpecs, accentMat, { name: 'F8_Z5_RunwayAccents' });
  if (accMesh) atriumGroup.add(accMesh);

  // AAA Armored Security Checkpoint Jersey Barricades flanking the extraction runway!
  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -6.4, y: baseY, z: -10.8, w: 3.0, h: 1.02, d: 1.05, walkableTop: true },
      { x: -13.8, y: baseY, z: -12.2, w: 3.2, h: 1.02, d: 1.1, walkableTop: true },
      { x: 13.8, y: baseY, z: -12.2, w: 3.2, h: 1.02, d: 1.1, walkableTop: true },
    ],
    { targetGroup: atriumGroup, accentMat: mats.hazardStripe, name: 'F8_Z5_SecurityBarricades' }
  );

  // Crisp High-Resolution Architectural Wall Stencils (centered cleanly at x = ±12.2 between buttresses ±5.8 and ±18.5!)
  addWallStencilPlaque(atriumGroup, mats, {
    code: '08-N',
    title: 'EXTRACTION CONCOURSE',
    subtitle: 'ACTIVATE CONTROL CENTER · UNSEAL BULKHEAD 08',
    accentHex: 0x06b6d4,
    x: -12.2,
    y: baseY + 8.6,
    z: -16.62,
    rotY: 0,
    width: 6.4,
    height: 1.6,
  });
  addWallStencilPlaque(atriumGroup, mats, {
    code: 'FL-07',
    title: 'SPIRAL WELL DESCENT',
    subtitle: 'AUTHORIZED OPERATIVE PASSAGE TO LEVEL 07',
    accentHex: 0xf59e0b,
    x: 12.2,
    y: baseY + 8.6,
    z: -16.62,
    rotY: 0,
    width: 6.4,
    height: 1.6,
  });

  // 5. MASSIVE FLOOR 08 BULKHEAD EXIT DOOR (x = 0, z = -17.0) + CONTROL CENTER + DESCENT GALLERY!
  const exitDoor = buildMassiveBulkheadDoor(collector.group, mats, {
    floor: 8,
    x: 0,
    y: baseY,
    z: F8_PORTALS.bulkheadZ,
    rotY: 0,
    width: F8_PORTALS.bulkheadWidth,
    height: F8_PORTALS.bulkheadHeight,
    plaqueTitle: 'BULKHEAD 08 EXIT',
    plaqueSubtitle: 'DESCENT TO FLOOR 07 SPIRAL WELL',
  });
  collector.boxes.push(exitDoor.collider);
  collector.wallMeshes.push(...exitDoor.raycastMeshes);

  const controlCenter = buildFloorControlCenter(
    collector.group,
    mats,
    collector.boxes,
    collector.wallMeshes,
    {
      floor: 8,
      x: 6.6,
      y: baseY,
      z: -11.8,
      rotY: 0,
    }
  );

  // Seamless U-Turn Descent Airlock Gallery down to Floor 07 Spiral Well Rotunda (Y = 84.0m)!
  buildDescentAirlockGallery(collector, mats, 8, 7, baseY, 'north', 17.0);

  const occlusionCell: OcclusionCell = {
    id: 'f8_north_atrium',
    group: atriumGroup,
    center: new THREE.Vector3(0, baseY + 4.0, -9.0),
    triggerBounds: {
      minX: -28.0,
      maxX: 28.0,
      minZ: -20.0,
      maxZ: 6.0,
    },
    maxViewDistance: 36.0,
  };

  return { occlusionCell, exitDoor, controlCenter };
}
