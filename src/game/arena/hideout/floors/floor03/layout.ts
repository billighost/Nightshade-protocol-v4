import type * as THREE from 'three';
import { addWalkableDeck } from '../../architecture';
import type { FloorGeometryCollector } from '../../stairs';
import { FLOOR_CATALOG } from '../../types';

/**
 * FLOOR 03 (Y = 28.0m) — THE GLACIAL FORERUNNER CITADEL & SUNKEN OBSIDIAN TEMPLE COMPLEX
 *
 * A colossal `108m × 68m` (7,344 m²) 12-zone, TRUE 3-STORY + SUB-CRYPT ancient megalithic citadel:
 * - Breaks the Floor 8–4 template completely:
 *   1. NO big central arena! Spawn inside a sealed Arrival Quarantine Vestibule (Zone 1) requiring
 *      a shootable Cryo-Resonator Relay OR Keystone Switch puzzle to unseal the Threshold Gate into
 *      tight, arched 3-story Obsidian Cloister passages (Zone 2)!
 *   2. TRUE 3 FULL PLAYABLE VERTICAL LEVELS (`L0 = 28.0m`, `L1 = 31.1m`, `L2 = 34.2m`, plus Sunken
 *      Cryo Sub-Crypt at `26.2m`) featuring BOTH Two-Stage Stepped Ascents (`L0 → L1 → walk → L1 → L2`)
 *      AND sweeping 12m Express Grand Staircases (`L0 → L2`) + Monumental Helical Spiral Stairs +
 *      Calibrated Multi-Tier Cryo-Lift Jump Pads (including Express `L0 → L2` Super-Lifts!).
 *   3. Remote Level 2 Master Control Sanctum: Floor 03's Control Center (`[E]`) sits FAR AWAY at
 *      `(45.5, 34.2, 24.0)` atop the Level 2 Obsidian-Gold Throne Dais inside Zone 11 (SE Grand Crown
 *      Reliquary) — NOT in a central room or next to Exit Bulkhead 03!
 *   4. Strict global 8-floor vertical clearance:
 *      - Lowest non-descent mesh: `26.2 - 0.48 = 25.72m > 25.40m` (Floor 02 maxY, `+0.32m` margin!)
 *      - Highest non-descent mesh: `28.0 + 10.30 + 0.50 = 38.80m < 39.00m` (Floor 04 minY, `+0.20m` margin!)
 */

export const F3_META = FLOOR_CATALOG[3];

/** Sunken Cryo Sub-Crypt floor (`26.2m`, slab bottom `25.72m > 25.40m` Floor 02 maxY!) */
export const F3_SUB_Y = F3_META.baseY - 1.8; // 26.2m
/** Ground Level 0 (`28.0m`) */
export const F3_L0_Y = F3_META.baseY; // 28.0m
/** Mid Level 1 (`31.1m`, +3.1m above L0, 2.76m clear OTS headroom underneath!) */
export const F3_L1_Y = F3_META.baseY + 3.1; // 31.1m
/** High Crown Level 2 (`34.2m`, +6.2m above L0, +3.1m above L1, 4.10m clear headroom under ceiling!) */
export const F3_L2_Y = F3_META.baseY + 6.2; // 34.2m

/** Uniform ceiling height across all 12 zones (underside `38.30m`, 0.50m roof slab top `38.80m < 39.00m`!) */
export const F3_CEIL_H = F3_META.ceilingHeight; // 10.3m
export const F3_ROOF_THICK = 0.5;
export const F3_ROOF_CENTER_Y = F3_L0_Y + F3_CEIL_H + F3_ROOF_THICK * 0.5; // 38.55m -> top 38.80m!

/** Non-overlapping 3-tier vertical portal windows for `buildArchitecturalWall` */
export const F3_PORTAL_L0 = { bottomY: F3_L0_Y, topY: F3_L0_Y + 2.65 }; // 28.00 .. 30.65
export const F3_PORTAL_L1 = { bottomY: F3_L1_Y, topY: F3_L1_Y + 2.65 }; // 31.10 .. 33.75
export const F3_PORTAL_L2 = { bottomY: F3_L2_Y, topY: F3_L2_Y + 3.0 }; // 34.20 .. 37.20

/** Shared architectural grid boundaries (X: -54..+54, Z: -34..+34) */
export const F3_GRID = {
  // X boundaries
  X_WEST_OUTER: -54.0,
  X_WEST_MID: -32.0,
  X_CORE_WEST: -12.0,
  X_CORE_EAST: 12.0,
  X_EAST_MID: 32.0,
  X_EAST_OUTER: 54.0,
  // Z boundaries
  Z_NORTH_OUTER: -34.0,
  Z_ARRIVAL: -17.0,
  Z_THRESHOLD: -4.0,
  Z_CLOISTER_SOUTH: 9.0,
  Z_EXIT: 17.0,
  Z_SOUTH_OUTER: 34.0,
} as const;

/** Shared portal spans along shared partition walls (exact match between adjacent zones!) */
export const F3_PORTALS = {
  // Zone 1 <-> Zone 2 along z = -4.0 (L0 sealed threshold gate ONLY — L1/L2 solid frieze!)
  Z1_Z2_GATE_X: [-2.4, 2.4] as const,
  // Zone 1 <-> Zone 4 (x = -12) & Zone 1 <-> Zone 7 (x = +12): L1 & L2 Sky-Galleries ONLY (NO L0 bypass!)
  Z1_SIDE_GALLERY_Z: [-11.4, -7.6] as const,

  // Zone 2 <-> Zone 3 (x = -12) & Zone 2 <-> Zone 9 (x = +12): 3-tier cruciform passages!
  Z2_SIDE_L0_Z: [0.2, 4.8] as const,
  Z2_SIDE_L1_Z: [-3.2, -0.4] as const,
  Z2_SIDE_L2_Z: [0.2, 4.8] as const,

  // Zone 2 <-> Zone 12 along z = +9.0
  Z2_Z12_L0_X: [-2.6, 2.6] as const,
  Z2_Z12_L1_WEST_X: [-9.6, -6.4] as const,
  Z2_Z12_L1_EAST_X: [6.4, 9.6] as const,
  Z2_Z12_L2_X: [-2.6, 2.6] as const,

  // Zone 12 <-> Zone 10 (x = -12) & Zone 12 <-> Zone 11 (x = +12): 3-tier extraction connectors!
  Z12_SIDE_Z: [11.0, 15.0] as const,

  // West Wing internal portals:
  // Zone 3 <-> Zone 4 along z = -4.0 (x in [-32, -12])
  Z3_Z4_L0_X: [-24.0, -20.0] as const,
  Z3_Z4_L1_X: [-18.0, -14.4] as const,
  Z3_Z4_L2_X: [-24.0, -20.0] as const,
  // Zone 3 <-> Zone 5 along z = -4.0 (x in [-54, -32])
  Z3_Z5_L0_X: [-45.0, -41.0] as const,
  Z3_Z5_L1_X: [-51.5, -48.0] as const,
  Z3_Z5_L2_X: [-45.0, -41.0] as const,
  // Zone 4 <-> Zone 5 along x = -32.0 (z in [-34, -4])
  Z4_Z5_JAMMED_Z: [-20.2, -16.2] as const,
  Z4_Z5_L1_Z: [-29.0, -25.4] as const,
  Z4_Z5_L2_Z: [-12.0, -8.2] as const,
  // Zone 3 <-> Zone 10 along z = +9.0 (x in [-54, -12])
  Z3_Z10_JAMMED_X: [-26.0, -22.0] as const,
  Z3_Z10_L0_WEST_X: [-49.0, -45.0] as const,
  Z3_Z10_L1_X: [-36.0, -32.4] as const,
  Z3_Z10_L2_X: [-53.2, -49.8] as const,

  // East Wing internal portals (clean architectural symmetry with distinct room interiors!):
  // Zone 9 <-> Zone 7 along z = -4.0 (x in [+12, +32])
  Z9_Z7_L0_X: [20.0, 24.0] as const,
  Z9_Z7_L1_X: [14.4, 18.0] as const,
  Z9_Z7_L2_X: [20.0, 24.0] as const,
  // Zone 9 <-> Zone 8 along z = -4.0 (x in [+32, +54])
  Z9_Z8_L0_X: [41.0, 45.0] as const,
  Z9_Z8_L1_X: [48.0, 51.5] as const,
  Z9_Z8_L2_X: [41.0, 45.0] as const,
  // Zone 7 <-> Zone 8 along x = +32.0 (z in [-34, -4])
  Z7_Z8_L0_Z: [-20.0, -16.0] as const,
  Z7_Z8_L1_Z: [-29.0, -25.4] as const,
  Z7_Z8_L2_Z: [-12.0, -8.2] as const,
  // Zone 9 <-> Zone 11 along z = +9.0 (x in [+12, +54])
  Z9_Z11_GATE_X: [22.0, 26.0] as const,
  Z9_Z11_L0_EAST_X: [45.0, 49.0] as const,
  Z9_Z11_L1_X: [32.4, 36.0] as const,
  Z9_Z11_L2_X: [45.0, 49.0] as const,
} as const;

/** Shared interactive mechanic IDs across all 12 zones */
export const F3_IDS = {
  // Opening Sealed Threshold Gate Puzzle (Zone 1)
  gateVestibuleSeal: 'f3_gate_vestibule_seal',
  lockVestibuleSeal: 'f3_lock_vestibule_seal',
  switchVestibuleSeal: 'f3_switch_vestibule_seal',

  // Locked Crystal Armory Vault (Zone 10 SW Cavern — shoot through panoramic frost glass!)
  gateCrystalVault: 'f3_gate_crystal_vault',
  lockCrystalVault: 'f3_lock_crystal_vault',

  // Locked Reliquary L0 Shortcut Gate (Zone 9 <-> Zone 11 — unlocked from inside Zone 11 or shootable relay!)
  gateReliquaryBypass: 'f3_gate_reliquary_bypass',
  lockReliquaryBypass: 'f3_lock_reliquary_bypass',
  switchReliquaryBypass: 'f3_switch_reliquary_bypass',

  // 3 Retractable Level 2 Skybridges (each with dual [E] Switch + Shootable Relay!)
  bridgeAqueductL2: 'f3_bridge_aqueduct_l2',
  switchAqueductL2: 'f3_switch_aqueduct_l2',
  lockAqueductL2: 'f3_lock_aqueduct_l2',

  bridgeMonolithL2: 'f3_bridge_monolith_l2',
  switchMonolithL2: 'f3_switch_monolith_l2',
  lockMonolithL2: 'f3_lock_monolith_l2',

  bridgeCrownExitL2: 'f3_bridge_crown_exit_l2',
  switchCrownExitL2: 'f3_switch_crown_exit_l2',
  lockCrownExitL2: 'f3_lock_crown_exit_l2',

  // 2 Jammed Half-Open Roll-Under Ice-Blast Shutters ([V] Dodge Roll!)
  jammedAqueductCrypt: 'f3_jammed_aqueduct_crypt',
  jammedZigguratCavern: 'f3_jammed_ziggurat_cavern',

  // 6 Calibrated Multi-Tier Cryo-Lift Jump Pads
  padAqueductL0ToL1: 'f3_pad_aqueduct_l0_l1',
  padCryptSuperL0ToL2: 'f3_pad_crypt_super_l0_l2',
  padArchiveL1ToL2: 'f3_pad_archive_l1_l2',
  padSpireSuperL0ToL2: 'f3_pad_spire_super_l0_l2',
  padCavernSubToL0: 'f3_pad_cavern_sub_l0',
  padReliquaryL1ToL2: 'f3_pad_reliquary_l1_l2',
} as const;

/** Remote Level 2 Master Control Sanctum Throne Dais inside Zone 11 (SE Grand Crown Reliquary) */
export const F3_CONTROL_CENTER_POS = {
  x: 45.5,
  y: F3_L2_Y, // 34.2m — Level 2!
  z: 24.0,
} as const;

/** Spawn inside Zone 1 Sealed Threshold Vestibule, facing South (+Z) toward the Sealed Threshold Gate */
export const F3_SPAWN = {
  x: 0.0,
  y: F3_L0_Y,
  z: -14.2,
  yaw: Math.PI,
} as const;

export const F3_BOUNDS = {
  minX: -54.0,
  maxX: 54.0,
  minZ: -34.0,
  maxZ: 34.0,
} as const;

export const F3_ENTRY_THRESHOLD = {
  minX: -5.5,
  maxX: 5.5,
  minZ: -15.8,
  maxZ: -10.5,
  maxY: F3_L0_Y + 3.0,
} as const;

/**
 * Bridges the exact 0.62m wall thickness (`coord - 0.31 .. coord + 0.31`) inside an elevated L1/L2
 * doorway portal so adjacent zone decks meet with ZERO floor gap and ZERO coplanar overlap!
 */
export function addF3PortalSill(
  collector: FloorGeometryCollector,
  opts: {
    axis: 'x' | 'z';
    coord: number;
    span: readonly [number, number];
    y: number;
    material: THREE.Material;
    targetGroup?: THREE.Group;
    name: string;
  }
): void {
  const { axis, coord, span, y, material, targetGroup, name } = opts;
  const s0 = span[0] + 0.02;
  const s1 = span[1] - 0.02;
  addWalkableDeck(collector, {
    minX: axis === 'x' ? s0 : coord - 0.31,
    maxX: axis === 'x' ? s1 : coord + 0.31,
    minZ: axis === 'x' ? coord - 0.31 : s0,
    maxZ: axis === 'x' ? coord + 0.31 : s1,
    y,
    thickness: 0.34,
    material,
    targetGroup,
    name,
  });
}
