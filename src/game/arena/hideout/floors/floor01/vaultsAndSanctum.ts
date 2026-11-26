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
  buildWallEquipmentBays,
} from '../../architecture';
import type { FloorGeometryCollector } from '../../stairs';
import type {
  BulkheadDoorRig,
  ControlCenterRig,
  OcclusionCell,
} from '../../types';
import {
  buildLockedSecurityGate,
  buildShootableLock,
} from '../../mechanics';
import {
  F1_CONTROL_CENTER_POS,
  F1_GRID,
  F1_IDS,
  F1_L0_Y,
  F1_L1_Y,
  F1_L2_Y,
  F1_META,
} from './layout';

export interface Floor1VaultsAndSanctumResult {
  exitDoor: BulkheadDoorRig;
  controlCenter: ControlCenterRig;
  occlusionCells: OcclusionCell[];
}

/**
 * FLOOR 01 — TWIN WATERTIGHT L0 BOSS-MUNITIONS RELIQUARY ARMORY VAULTS,
 * ELEVATED SOUTH L2 SOVEREIGN CONTROL CENTER,
 * AND COLOSSAL FINAL CORE VAULT 01 + INNER VICTORY SANCTUM (`OcclusionCell`).
 *
 * Strictly zero Z-fighting / zero roof gaps:
 * - Both L0 Armory Vault walls have exact height `L1 - L0 - 0.34 = 5.66m`, tucking flush underneath
 *   the West/East L1 Bastion Decks with zero coplanar roof overlap and zero open roof cracks!
 * - Both Shootable Crimson Relays sit cleanly off-mullion inside panoramic blast-glass windows!
 * - South L2 Sovereign Control Center (`y = 0.0m`) sits +12.0m above the Boss Pit (zero L0 trigger leak!)
 *   with its golden arch & plaque raised cleanly clear of the console!
 */
export function buildFloor1VaultsAndSanctum(
  collector: FloorGeometryCollector,
  detailGroup: THREE.Group,
  mats: HideoutMaterialRegistry
): Floor1VaultsAndSanctumResult {
  const y0 = F1_L0_Y; // -12.0m
  const y1 = F1_L1_Y; //  -6.0m
  const y2 = F1_L2_Y; //   0.0m
  const group = collector.group;
  const vaultH = y1 - y0 - 0.34; // 5.66m — flush right beneath L1 Bastion deck underside!
  const occlusionCells: OcclusionCell[] = [];

  // =========================================================================
  // 1. TWIN WATERTIGHT L0 SEALED BOSS-MUNITIONS RELIQUARY ARMORY VAULTS
  //    West Vault: x ∈ [-43.68, -36.02], z ∈ [26.0, 36.0], y = -12.0m
  //    East Vault: x ∈ [+36.02, +43.68], z ∈ [44.0, 54.0], y = -12.0m
  // =========================================================================
  const vaultDefs = [
    {
      id: 'floor1_west_armory',
      side: -1 as const,
      frontX: -36.02,
      backX: -43.38,
      minZ: 26.0,
      maxZ: 36.0,
      gateId: F1_IDS.gateWestVault,
      lockId: F1_IDS.lockWestVault,
      label: 'WEST RELIQUARY ARMORY',
      code: '01-W',
    },
    {
      id: 'floor1_east_armory',
      side: 1 as const,
      frontX: 36.02,
      backX: 43.38,
      minZ: 44.0,
      maxZ: 54.0,
      gateId: F1_IDS.gateEastVault,
      lockId: F1_IDS.lockEastVault,
      label: 'EAST RELIQUARY ARMORY',
      code: '01-E',
    },
  ];

  for (const v of vaultDefs) {
    const cellGroup = new THREE.Group();
    cellGroup.name = `OCCLUSION_CELL_${v.id}`;
    group.add(cellGroup);

    const midZ = (v.minZ + v.maxZ) * 0.5;
    const minX = Math.min(v.frontX, v.backX);
    const maxX = Math.max(v.frontX, v.backX);

    // North & South vault partition walls (trimmed cleanly inside outer wall & front wall -> zero corner Z-fight!)
    for (const wz of [v.minZ, v.maxZ]) {
      buildArchitecturalWall(collector, mats, {
        axis: 'x',
        coord: wz,
        spanStart: v.side < 0 ? -43.66 : 36.32,
        spanEnd: v.side < 0 ? -36.32 : 43.66,
        baseY: y0,
        height: vaultH,
        wallMat: mats.obsidianBasalt,
        name: `F1_VaultSideWall_${v.code}_${wz}`,
      });
    }

    // Front inner wall (`x = ±36.02`) with Sealed Security Gate (`[minZ+0.9, minZ+4.3]`) + Panoramic Blast-Glass Window (`[minZ+4.9, maxZ-0.9]`)
    const gateZ0 = v.minZ + 0.9;
    const gateZ1 = v.minZ + 4.3;
    const winZ0 = v.minZ + 4.9;
    const winZ1 = v.maxZ - 0.9; // span = 4.2m -> ZERO intermediate mullions -> 100% unobstructed through-glass relay!

    buildArchitecturalWall(collector, mats, {
      axis: 'z',
      coord: v.frontX,
      spanStart: v.minZ - 0.3,
      spanEnd: v.maxZ + 0.3,
      baseY: y0,
      height: vaultH,
      wallMat: mats.obsidianBasalt,
      accentMat: mats.eclipseCrimson,
      portals: [
        {
          start: gateZ0,
          end: gateZ1,
          bottomY: y0,
          topY: y0 + 3.2,
          kind: 'door',
          framed: true,
          accentHeader: true,
        },
        {
          start: winZ0,
          end: winZ1,
          bottomY: y0 + 1.0,
          topY: y0 + 3.1,
          kind: 'window',
          framed: true,
        },
      ],
      name: `F1_VaultFrontWall_${v.code}`,
    });

    // Locked Armored Security Gate
    buildLockedSecurityGate(collector, mats, {
      id: v.gateId,
      label: v.label,
      x: v.frontX,
      y: y0,
      z: (gateZ0 + gateZ1) * 0.5,
      width: gateZ1 - gateZ0,
      height: 3.2,
      spanAxis: 'z',
      lockedHint: `${v.label} SEALED · SHOOT CRIMSON RELAY THROUGH BLAST WINDOW`,
    });

    // Unobstructed Shootable Crimson Relay inside the Vault directly centered in the 4.2m mullion-free window!
    buildShootableLock(collector, mats, {
      id: v.lockId,
      bannerText: `RELAY SHATTERED · ${v.label} UNSEALED — .50 HV MUNITIONS READY!`,
      x: v.side < 0 ? -42.5 : 42.5,
      y: y0 + 2.1,
      z: (winZ0 + winZ1) * 0.5,
      rotY: v.side < 0 ? Math.PI * 0.5 : -Math.PI * 0.5,
      unlockGateId: v.gateId,
      targetGroup: cellGroup,
    });

    // Recessed armored weapon lockers along interior back wall + bright interior ceiling lights inside cellGroup
    buildWallEquipmentBays(
      collector,
      mats,
      [
        {
          axis: 'z',
          coord: v.side < 0 ? -43.62 : 43.62,
          inwardDir: v.side < 0 ? 1 : -1,
          centerAlong: (gateZ0 + gateZ1) * 0.5,
          baseY: y0,
          width: 3.4,
          height: 2.75,
        },
      ],
      { targetGroup: cellGroup, accentMat: mats.sovereignGold, name: `F1_VaultLockers_${v.code}` }
    );

    const lightBar = buildBatchedBoxesMesh(
      [
        { w: 5.2, h: 0.1, d: 0.42, x: (minX + maxX) * 0.5, y: y0 + vaultH - 0.08, z: midZ - 1.8 },
        { w: 5.2, h: 0.1, d: 0.42, x: (minX + maxX) * 0.5, y: y0 + vaultH - 0.08, z: midZ + 1.8 },
      ],
      mats.ceilingLight,
      { name: `F1_VaultLights_${v.code}` }
    );
    if (lightBar) cellGroup.add(lightBar);

    // High-readability Vault Plaque mounted cleanly above the front wall window
    addWallStencilPlaque(group, mats, {
      code: v.code,
      title: v.label,
      subtitle: 'SHOOT RELAY THROUGH GLASS FOR .50 HV MUNITIONS',
      accentHex: F1_META.accentHex,
      x: v.frontX + (v.side < 0 ? 0.36 : -0.36),
      y: y0 + 4.35,
      z: midZ,
      rotY: v.side < 0 ? Math.PI * 0.5 : -Math.PI * 0.5,
      width: 5.2,
      height: 1.0,
    });

    occlusionCells.push({
      id: v.id,
      group: cellGroup,
      triggerBounds: {
        minX: minX - 10.0,
        maxX: maxX + 10.0,
        minZ: v.minZ - 10.0,
        maxZ: v.maxZ + 10.0,
      },
      center: { x: (minX + maxX) * 0.5, z: midZ },
      maxViewDistance: 36,
    });
  }

  // =========================================================================
  // 2. ELEVATED SOUTH L2 SOVEREIGN CONTROL CENTER (`(0, 0.0, 80.4)`, rotY = Math.PI)
  //    Stands +12.0m above the Boss Pit (ZERO false trigger from L0!) framed by a Golden Monolith Arch!
  // =========================================================================
  const cc = F1_CONTROL_CENTER_POS;
  const controlCenter = buildFloorControlCenter(
    group,
    mats,
    collector.boxes,
    collector.wallMeshes,
    {
      floor: 1,
      x: cc.x,
      y: cc.y,
      z: cc.z,
      rotY: Math.PI,
    }
  );

  // Monumental Golden Sovereign Command Arch behind the Control Center (`z = 83.25`, cleanly clear of console & wall!)
  const archGoldSpecs: BoxSpec[] = [
    { w: 0.64, h: 5.6, d: 0.58, x: -3.6, y: y2 + 2.82, z: 83.25 },
    { w: 0.64, h: 5.6, d: 0.58, x: 3.6, y: y2 + 2.82, z: 83.25 },
    { w: 8.2, h: 0.58, d: 0.64, x: 0, y: y2 + 5.92, z: 83.25 },
  ];
  const archCrimsonSpecs: BoxSpec[] = [
    { w: 6.4, h: 0.14, d: 0.1, x: 0, y: y2 + 5.92, z: 82.9 },
  ];
  const archGoldMesh = buildBatchedBoxesMesh(archGoldSpecs, mats.sovereignGold, {
    castShadow: true,
    name: 'F1_CommandArchGold',
  });
  if (archGoldMesh) detailGroup.add(archGoldMesh);
  const archCrimsonMesh = buildBatchedBoxesMesh(archCrimsonSpecs, mats.eclipseCrimson, {
    name: 'F1_CommandArchCrimson',
  });
  if (archCrimsonMesh) detailGroup.add(archCrimsonMesh);

  addWallStencilPlaque(group, mats, {
    code: '01-CMD',
    title: 'SOVEREIGN OVERRIDE',
    subtitle: 'UNSEAL FINAL CORE VAULT 01 BELOW',
    accentHex: F1_META.accentHex,
    x: 0,
    y: y2 + 4.35,
    z: 83.52,
    rotY: Math.PI,
    width: 5.6,
    height: 1.15,
  });

  // =========================================================================
  // 3. COLOSSAL FINAL CORE VAULT 01 (`6.8m × 6.5m`) & INNER VICTORY SANCTUM (`OcclusionCell`)
  // =========================================================================
  const exitDoor = buildMassiveBulkheadDoor(group, mats, {
    floor: 1,
    x: 0,
    y: y0,
    z: F1_GRID.Z_SOUTH,
    rotY: Math.PI,
    width: 6.8,
    height: 6.5,
    plaqueTitle: 'SOVEREIGN SANCTUM VAULT',
    plaqueSubtitle: 'FINAL VICTORY CHAMBER · LEVEL 01',
  });
  collector.boxes.push(exitDoor.collider);
  collector.wallMeshes.push(...exitDoor.raycastMeshes);

  const sanctumGroup = new THREE.Group();
  sanctumGroup.name = 'OCCLUSION_CELL_floor1_inner_sanctum';
  group.add(sanctumGroup);

  const sHalfW = 10.5;
  const sMinZ = F1_GRID.Z_SOUTH + 0.34; // 84.34m — starts cleanly behind South Colosseum wall!
  const sMaxZ = F1_GRID.Z_SANCTUM_END; // 97.0m
  const sHeight = 9.0; // y = -12.0 .. -3.0m

  addWalkableDeck(collector, {
    minX: -sHalfW,
    maxX: sHalfW,
    minZ: sMinZ,
    maxZ: sMaxZ,
    y: y0,
    thickness: 0.62,
    material: mats.sacredBoneStone,
    targetGroup: sanctumGroup,
    name: 'F1_SanctumFloor',
  });
  // Seamless walkable doorway threshold bridging z ∈ [83.4, 84.6]
  collector.slabs.push({ minX: -3.5, maxX: 3.5, minZ: 83.4, maxZ: 84.6, y: y0 });

  // Sanctum perimeter walls (South far wall + West/East side walls, strictly non-overlapping!)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: sMaxZ,
    spanStart: -sHalfW - 0.3,
    spanEnd: sHalfW + 0.3,
    baseY: y0,
    height: sHeight,
    wallMat: mats.obsidianBasalt,
    targetGroup: sanctumGroup,
    name: 'F1_SanctumSouthWall',
  });
  for (const side of [-1, 1] as const) {
    buildArchitecturalWall(collector, mats, {
      axis: 'z',
      coord: side * sHalfW,
      spanStart: sMinZ,
      spanEnd: sMaxZ - 0.32,
      baseY: y0,
      height: sHeight,
      wallMat: mats.obsidianBasalt,
      targetGroup: sanctumGroup,
      name: `F1_SanctumSideWall_${side < 0 ? 'W' : 'E'}`,
    });
  }

  // Sanctum Roof Slab (`y = -3.0 .. -2.56m`)
  const sRoof = buildBatchedBoxesMesh(
    [{ w: sHalfW * 2 + 0.64, h: 0.44, d: sMaxZ - sMinZ + 0.34, x: 0, y: y0 + sHeight + 0.22, z: (sMinZ + sMaxZ) * 0.5 + 0.14 }],
    mats.obsidianBasalt,
    { receiveShadow: true, name: 'F1_SanctumRoof' }
  );
  if (sRoof) {
    sanctumGroup.add(sRoof);
    collector.wallMeshes.push(sRoof);
  }

  // Golden Triumph Altar Monolith & Ceiling Light Canopy inside Inner Sanctum
  const sanctumGoldSpecs: BoxSpec[] = [
    { w: 4.8, h: 0.44, d: 3.4, x: 0, y: y0 + 0.23, z: 92.6 },
    { w: 1.6, h: 4.4, d: 1.6, x: 0, y: y0 + 0.46 + 2.2, z: 92.6 },
    { w: 0.14, h: 0.016, d: 6.4, x: -2.0, y: y0 + 0.012, z: 87.8 },
    { w: 0.14, h: 0.016, d: 6.4, x: 2.0, y: y0 + 0.012, z: 87.8 },
  ];
  const sanctumLightSpecs: BoxSpec[] = [
    { w: 12.0, h: 0.12, d: 0.55, x: 0, y: y0 + sHeight - 0.08, z: 88.0 },
    { w: 12.0, h: 0.12, d: 0.55, x: 0, y: y0 + sHeight - 0.08, z: 92.6 },
  ];
  const sGoldMesh = buildBatchedBoxesMesh(sanctumGoldSpecs, mats.sovereignGold, {
    castShadow: true,
    name: 'F1_SanctumTriumphAltar',
  });
  if (sGoldMesh) {
    sanctumGroup.add(sGoldMesh);
    collector.wallMeshes.push(sGoldMesh);
  }
  const sLightMesh = buildBatchedBoxesMesh(sanctumLightSpecs, mats.ceilingLight, {
    name: 'F1_SanctumLights',
  });
  if (sLightMesh) sanctumGroup.add(sLightMesh);

  collector.boxes.push({
    minX: -2.4,
    maxX: 2.4,
    minY: y0,
    maxY: y0 + 5.0,
    minZ: 90.9,
    maxZ: 94.3,
    walkableTop: false,
  });

  // Rotating Crimson Crown Crystal hovering above Triumph Altar
  const crownCrystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.92, 0),
    mats.eclipseCrimson
  );
  crownCrystal.position.set(0, y0 + 6.1, 92.6);
  crownCrystal.name = 'F1_SanctumCrownCrystal';
  sanctumGroup.add(crownCrystal);
  collector.animatedSpinners?.push({ obj: crownCrystal, speed: 0.9, axis: 'y' });

  addWallStencilPlaque(sanctumGroup, mats, {
    code: '01',
    title: 'ECLIPSE SOVEREIGN',
    subtitle: 'VICTORY SANCTUM · HIDEOUT CONQUERED',
    accentHex: 0xf59e0b,
    x: 0,
    y: y0 + 5.4,
    z: sMaxZ - 0.38,
    rotY: Math.PI,
    width: 7.4,
    height: 1.55,
  });

  occlusionCells.push({
    id: 'floor1_inner_sanctum',
    group: sanctumGroup,
    triggerBounds: {
      minX: -sHalfW - 4,
      maxX: sHalfW + 4,
      minZ: F1_GRID.Z_SOUTH - 6,
      maxZ: sMaxZ + 2,
    },
    center: { x: 0, z: (sMinZ + sMaxZ) * 0.5 },
    maxViewDistance: 24,
  });

  return { exitDoor, controlCenter, occlusionCells };
}
