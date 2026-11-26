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
  buildShippingContainer,
  buildTacticalConsoleBenches,
  buildWallEquipmentBays,
} from '../../architecture';
import type { FloorGeometryCollector } from '../../stairs';
import type { OcclusionCell } from '../../types';
import {
  buildExplosiveBarrel,
  buildLockedSecurityGate,
  buildShootableLock,
} from '../../mechanics';
import { F6_BASE_Y, F6_CEILINGS, F6_IDS, F6_WALLS } from './layout';

/**
 * FLOOR 06 — ZONE 5 (SOUTH-WEST OCCLUSION CELL): ARMORED DATA BUNKER & LOCKED MUNITIONS VAULT
 * Footprint: x ∈ [-44.0, -18.0] (26m wide) × z ∈ [+14.0, +28.0] (14m deep), Ceiling: 9.2m
 *
 * Tactical Black-Ops Armory Bunker:
 * - Staging Bay (`x ∈ [-35.0, -18.0]`): Corrugated tactical Shipping Container, Jersey Barricades, Armory Consoles & Explosive Barrels
 * - Sealed Black-Ops Munitions Vault (`x ∈ [-44.0, -35.0]`):
 *   * Reinforced Glass Observation Window (`z ∈ [15.4, 18.6]`) giving crystal-clear line of sight to the glowing
 *     crimson Shootable Security Relay (`f6_lock_sw_vault`) mounted on the West Vault Wall (`x = -43.52, z = 17.0`)!
 *   * Locked Security Gate (`f6_gate_sw_vault`) at `z ∈ [20.2, 23.4]` sliding South into solid pier `z ∈ [23.4, 27.7]`
 *     (ZERO window overlap!) with live HUD hint when approached while sealed!
 *   * Brightly lit interior with recessed West weapon lockers, amber floor calibration frame, and 2 `.50 HV` ammo crates!
 */
export function buildFloor6Zone5SouthWestArmoryBunker(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry
): OcclusionCell {
  const baseY = F6_BASE_Y;
  const ceilH = F6_CEILINGS.swBunker; // 9.2m
  const bunkerAccent = mats.floorAccent[7]; // Tactical gold-amber armory accent!

  const wingGroup = new THREE.Group();
  wingGroup.name = 'F6_Z5_SW_BUNKER_CELL';
  collector.group.add(wingGroup);

  // 1. Floor Slab & Watertight Ceiling Slab (`x ∈ [-43.7, -18.3], z ∈ [14.3, 27.7]`)
  addWalkableDeck(collector, {
    minX: F6_WALLS.westOuterX,
    maxX: F6_WALLS.cathedralWestX,
    minZ: F6_WALLS.westSouthSplitZ,
    maxZ: F6_WALLS.swBunkerSouthZ,
    y: baseY,
    thickness: 0.6,
    material: mats.concreteFloor,
    targetGroup: wingGroup,
    name: 'F6_Z5_BunkerFloor',
  });

  const ceilMesh = buildBatchedBoxesMesh(
    [{ w: 25.4, h: 0.6, d: 13.4, x: -31.0, y: baseY + ceilH + 0.3, z: 21.0 }],
    mats.darkConcrete,
    { receiveShadow: false, name: 'F6_Z5_BunkerCeiling' }
  );
  if (ceilMesh) wingGroup.add(ceilMesh);

  // 2. Perimeter Walls (North z = 14.0 owned by Zone 3 Labs; East x = -18.0 for z <= 17.3 owned by Zone 1/2!)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F6_WALLS.westOuterX,
    spanStart: F6_WALLS.westSouthSplitZ + 0.3,
    spanEnd: F6_WALLS.swBunkerSouthZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: wingGroup,
    name: 'F6_Z5_WestOuterWall',
  });
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F6_WALLS.swBunkerSouthZ,
    spanStart: F6_WALLS.westOuterX - 0.3,
    spanEnd: F6_WALLS.cathedralWestX + 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWallLight,
    targetGroup: wingGroup,
    name: 'F6_Z5_SouthOuterWall',
  });
  // East exterior wall strictly from z = 17.3 to 27.7 (butts cleanly against Zone 1 South Wall at z = 17.0!)
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: F6_WALLS.cathedralWestX,
    spanStart: F6_WALLS.cathedralSouthZ + 0.3,
    spanEnd: F6_WALLS.swBunkerSouthZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWall,
    targetGroup: wingGroup,
    name: 'F6_Z5_EastOuterWall',
  });

  // 3. SEALED BLACK-OPS MUNITIONS VAULT DIVIDER WALL (`x = -35.0`, `z ∈ [14.3, 27.7]`)
  // Observation Window: `z ∈ [15.4, 18.6]` | Solid Pier: `[18.6, 20.2]` | Security Gate: `[20.2, 23.4]` | Tuck Pier: `[23.4, 27.7]`!
  buildArchitecturalWall(collector, mats, {
    axis: 'z',
    coord: -35.0,
    spanStart: F6_WALLS.westSouthSplitZ + 0.3,
    spanEnd: F6_WALLS.swBunkerSouthZ - 0.3,
    baseY,
    height: ceilH,
    wallMat: mats.concreteWallLight,
    accentMat: bunkerAccent,
    targetGroup: wingGroup,
    portals: [
      {
        start: 15.4,
        end: 18.6,
        bottomY: baseY + 1.1,
        topY: baseY + 3.2,
        kind: 'window',
        framed: true,
      },
      {
        start: 20.2,
        end: 23.4,
        bottomY: baseY,
        topY: baseY + 3.6,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
    ],
    name: 'F6_Z5_VaultDividerWall',
  });

  // Bi-Parting Locked Security Gate with 53cm solid pier clearance from observation window (ZERO glass overlap!)
  buildLockedSecurityGate(collector, mats, {
    id: F6_IDS.gateSwVault,
    label: 'BLACK-OPS ARMORY VAULT',
    x: -35.0,
    y: baseY,
    z: 21.8,
    width: 3.2,
    height: 3.6,
    spanAxis: 'z',
    lockedHint: 'VAULT SEALED — SHOOT RELAY LOCK THROUGH GLASS WINDOW',
    targetGroup: wingGroup,
  });

  // Glowing Crimson Shootable Security Relay mounted clearly inside the vault visible straight through the window!
  buildShootableLock(collector, mats, {
    id: F6_IDS.lockSwVault,
    x: -43.52,
    y: baseY + 2.3,
    z: 17.0,
    rotY: Math.PI * 0.5,
    bannerText: 'VAULT RELAY SHATTERED · ARMORY VAULT UNSEALED',
    unlockGateId: F6_IDS.gateSwVault,
    targetGroup: wingGroup,
  });

  // 4. Overhead Trusses, Bright Vault & Bunker Ceiling Lighting, Hazard Thresholds & Warm Accents
  const steelSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];
  const accSpecs: BoxSpec[] = [];
  const hazardSpecs: BoxSpec[] = [];

  for (const bx of [-39.5, -31.0, -24.5]) {
    steelSpecs.push({ w: 0.44, h: 0.46, d: 13.32, x: bx, y: baseY + ceilH - 0.24, z: 21.0 });
  }
  // Bright recessed ceiling light banks mounted cleanly below steel beams + luminous vertical interior vault sconces!
  lightSpecs.push(
    { w: 6.4, h: 0.1, d: 0.44, x: -39.5, y: baseY + ceilH - 0.52, z: 17.4 },
    { w: 6.4, h: 0.1, d: 0.44, x: -39.5, y: baseY + ceilH - 0.52, z: 21.8 },
    { w: 6.4, h: 0.1, d: 0.44, x: -39.5, y: baseY + ceilH - 0.52, z: 25.4 },
    // Interior bright wall wash bars visible right through the glass window & open security gate!
    { w: 0.08, h: 2.6, d: 0.22, x: -43.62, y: baseY + 2.4, z: 15.2 },
    { w: 0.08, h: 2.6, d: 0.22, x: -43.62, y: baseY + 2.4, z: 19.2 },
    { w: 0.08, h: 2.6, d: 0.22, x: -43.62, y: baseY + 2.4, z: 25.8 },
    { w: 12.0, h: 0.08, d: 0.34, x: -26.5, y: baseY + ceilH - 0.52, z: 18.2 },
    { w: 12.0, h: 0.08, d: 0.34, x: -26.5, y: baseY + ceilH - 0.52, z: 23.8 }
  );

  // Vault interior amber datum trim + glowing floor perimeter frame around the `.50 HV` ammo cache!
  accSpecs.push(
    { w: 6.4, h: 0.1, d: 0.08, x: -39.5, y: baseY + 3.6, z: 27.64 },
    { w: 6.4, h: 0.1, d: 0.08, x: -39.5, y: baseY + 3.6, z: 14.36 },
    { w: 0.08, h: 0.1, d: 11.4, x: -43.62, y: baseY + 3.6, z: 21.0 },
    { w: 3.6, h: 0.014, d: 0.14, x: -39.8, y: baseY + 0.012, z: 19.6 },
    { w: 3.6, h: 0.014, d: 0.14, x: -39.8, y: baseY + 0.012, z: 24.4 },
    { w: 0.14, h: 0.014, d: 4.8, x: -41.5, y: baseY + 0.012, z: 22.0 },
    { w: 0.14, h: 0.014, d: 4.8, x: -38.1, y: baseY + 0.012, z: 22.0 },
    { w: 0.12, h: 0.012, d: 11.4, x: -28.6, y: baseY + 0.008, z: 20.5 }
  );
  hazardSpecs.push({ w: 0.42, h: 0.012, d: 3.0, x: -35.0, y: baseY + 0.018, z: 21.8 });

  const steelMesh = buildBatchedBoxesMesh(steelSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: 'F6_Z5_BunkerSteel',
  });
  if (steelMesh) {
    wingGroup.add(steelMesh);
    collector.wallMeshes.push(steelMesh);
  }
  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.ceilingLight, { name: 'F6_Z5_BunkerLights' });
  if (lightMesh) wingGroup.add(lightMesh);
  const accMesh = buildBatchedBoxesMesh(accSpecs, bunkerAccent, { name: 'F6_Z5_BunkerAccents' });
  if (accMesh) wingGroup.add(accMesh);
  const hazMesh = buildBatchedBoxesMesh(hazardSpecs, mats.hazardStripe, { name: 'F6_Z5_VaultHazard' });
  if (hazMesh) wingGroup.add(hazMesh);

  // 5. Corrugated Shipping Container, Recessed Locker Bays, Armory Consoles & Explosive Plasma Barrels!
  buildShippingContainer(collector, mats, {
    x: -23.0,
    y: baseY,
    z: 22.8,
    w: 6.2,
    h: 2.55,
    d: 2.8,
    targetGroup: wingGroup,
    name: 'F6_Z5_BunkerContainer',
  });

  buildWallEquipmentBays(
    collector,
    mats,
    [
      // Inside Munitions Vault West wall armored rifle lockers (clear of Shootable Relay at z = 17.0!)
      { axis: 'z', coord: -43.7, inwardDir: 1, centerAlong: 22.6, baseY, width: 5.4, height: 3.1, depth: 0.56 },
      // South Bunker staging lockers
      { axis: 'x', coord: 27.7, inwardDir: -1, centerAlong: -29.2, baseY, width: 5.2, height: 3.1, depth: 0.56 },
    ],
    { targetGroup: wingGroup, accentMat: bunkerAccent, name: 'F6_Z5_VaultLockers' }
  );

  buildTacticalConsoleBenches(
    collector,
    mats,
    [
      { x: -31.8, y: baseY, z: 25.4, w: 3.0, h: 0.98, d: 1.05 },
      { x: -39.6, y: baseY, z: 26.2, w: 3.2, h: 0.98, d: 1.05 },
    ],
    { targetGroup: wingGroup, accentMat: bunkerAccent, name: 'F6_Z5_BunkerConsoles' }
  );

  buildJerseyBarricades(
    collector,
    mats,
    [
      { x: -29.6, y: baseY, z: 18.8, w: 2.6, h: 1.0, d: 0.98, walkableTop: true },
    ],
    { targetGroup: wingGroup, accentMat: mats.hazardStripe, name: 'F6_Z5_BunkerBarricades' }
  );

  // 2 Pressurized Explosive Plasma Barrels in the Bunker staging bay!
  buildExplosiveBarrel(collector, mats, {
    id: 'f6_barrel_bunker_1',
    x: -26.8,
    y: baseY,
    z: 20.6,
    targetGroup: wingGroup,
  });
  buildExplosiveBarrel(collector, mats, {
    id: 'f6_barrel_bunker_2',
    x: -26.8,
    y: baseY,
    z: 24.4,
    targetGroup: wingGroup,
  });

  // Crisp Vault & Bunker Wall Stencil Signage!
  addWallStencilPlaque(wingGroup, mats, {
    code: 'VLT-06',
    title: 'MUNITIONS VAULT 06',
    subtitle: 'SHOOT RELAY THROUGH OBSERVATION GLASS TO UNSEAL',
    accentHex: 0xf59e0b,
    x: -34.62,
    y: baseY + 5.4,
    z: 21.8,
    rotY: Math.PI * 0.5,
    width: 6.2,
    height: 1.5,
  });

  return {
    id: 'f6_sw_bunker',
    group: wingGroup,
    center: new THREE.Vector3(-31.0, baseY + 3.2, 21.0),
    triggerBounds: {
      minX: -46.0,
      maxX: -14.0,
      minZ: 10.0,
      maxZ: 30.0,
    },
    maxViewDistance: 34.0,
  };
}
