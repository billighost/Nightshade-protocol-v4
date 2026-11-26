import type * as THREE from 'three';
import { addWalkableDeck } from '../../architecture';
import type { FloorGeometryCollector } from '../../stairs';
import { FLOOR_CATALOG } from '../../types';

/**
 * FLOOR 02 (Y = 14.0m) — THE VOLTAIC MAGLEV METROPOLIS & SMELTER SKY-YARD
 *
 * A colossal `112m × 68m` (7,616 m²) 12-zone, TRUE 3-STORY + MAGLEV RAIL CHANNEL subterranean
 * cyber-industrial rail city & molten alloy foundry:
 * - Breaks the Floors 8–4 template completely AND stands wholly distinct from Floor 03's ancient temple:
 *   1. NO big central arena! Spawn South (`z = +17.0`, receiving Floor 03's South Descent Gallery)
 *      inside a sealed Freight Customs Airlock (Zone 1) requiring a Shootable Breaker Relay OR
 *      Customs Override Switch to unseal the Freight Lockdown Shutter into Zone 2's narrow, towering
 *      3-story Voltaic Maglev Rail Canyon with a full composite Armored Freight Locomotive parked on
 *      inductive rails!
 *   2. TRUE 3 FULL PLAYABLE VERTICAL LEVELS (`L0 = 14.0m`, `L1 = 17.1m`, `L2 = 20.2m`, plus a
 *      recessed `-0.40m` Inductive Maglev Track Channel at `13.60m`) featuring BOTH Two-Stage Stepped
 *      Ascents (`L0 → L1 → walk → L1 → L2`) AND twin `12.0m` Express Grand Industrial Staircases
 *      (`L0 → L2`) + Monumental Stacked Double-Helix Spiral Cooling Silo (Zone 8) + 6 Calibrated
 *      Pneumatic Cargo-Lift Jump Pads (including TWO Express `L0 → L2` Super-Lifts!).
 *   3. Remote Level 2 Master Dispatch Spire: Floor 02's Control Center (`[E]`) sits FAR AWAY at
 *      `(-46.5, 20.2, -24.5)` atop the Level 2 Signal Tower Command Dais inside Zone 10 (NW Signal
 *      Control Tower) — NOT near Exit Bulkhead 02 in Zone 12!
 *   4. Strict global 8-floor vertical clearance:
 *      - Lowest non-descent mesh: `13.60 - 0.26 = 13.34m > 13.20m` (Floor 01 maxY, `+0.14m` margin!)
 *      - Highest non-descent mesh: `14.0 + 10.90 + 0.50 = 25.40m < 25.72m` (Floor 03 minY, `+0.32m` margin!)
 */

export const F2_META = FLOOR_CATALOG[2];

/** Recessed Inductive Maglev Track Channel (`13.60m`, slab bottom `13.34m > 13.20m` Floor 01 maxY!) */
export const F2_TRACK_Y = F2_META.baseY - 0.4; // 13.6m
/** Ground Street / Freight Deck Level 0 (`14.0m`, slab thickness `0.50m` -> bottom `13.50m`) */
export const F2_L0_Y = F2_META.baseY; // 14.0m
/** Mid Transit Overpass Level 1 (`17.1m`, +3.1m above L0, 2.76m clear OTS headroom underneath!) */
export const F2_L1_Y = F2_META.baseY + 3.1; // 17.1m
/** High Crane Sky-Yard Level 2 (`20.2m`, +6.2m above L0, +3.1m above L1, 4.70m soaring headroom under ceiling!) */
export const F2_L2_Y = F2_META.baseY + 6.2; // 20.2m

/** Uniform ceiling height across all 12 zones (underside `24.90m`, 0.50m roof slab top `25.40m < 25.72m`!) */
export const F2_CEIL_H = F2_META.ceilingHeight; // 10.9m
export const F2_ROOF_THICK = 0.5;
export const F2_ROOF_CENTER_Y = F2_L0_Y + F2_CEIL_H + F2_ROOF_THICK * 0.5; // 25.15m -> top 25.40m!

/** Non-overlapping 3-tier vertical portal windows for `buildArchitecturalWall` */
export const F2_PORTAL_L0 = { bottomY: F2_L0_Y, topY: F2_L0_Y + 2.65 }; // 14.00 .. 16.65
export const F2_PORTAL_L1 = { bottomY: F2_L1_Y, topY: F2_L1_Y + 2.65 }; // 17.10 .. 19.75
export const F2_PORTAL_L2 = { bottomY: F2_L2_Y, topY: F2_L2_Y + 3.2 }; // 20.20 .. 23.40

/** Shared architectural grid boundaries (X: -56..+56, Z: -34..+34) */
export const F2_GRID = {
  // X boundaries (112m total span!)
  X_WEST_OUTER: -56.0,
  X_WEST_MID: -34.0,
  X_CORE_WEST: -12.0,
  X_CORE_EAST: 12.0,
  X_EAST_MID: 34.0,
  X_EAST_OUTER: 56.0,
  // Z boundaries (68m total span; Arrival South +17, Exit North -17!)
  Z_NORTH_OUTER: -34.0,
  Z_EXIT: -17.0,
  Z_CONCOURSE_NORTH: -9.0,
  Z_CUSTOMS: 4.0,
  Z_ARRIVAL: 17.0,
  Z_SOUTH_OUTER: 34.0,
} as const;

/** Shared portal spans along shared partition walls (exact match between adjacent zones!) */
export const F2_PORTALS = {
  // Zone 1 (South Customs) <-> Zone 2 (Maglev Concourse) along z = +4.0 (L0 sealed customs gate ONLY — L1/L2 solid!)
  Z1_Z2_GATE_X: [-2.4, 2.4] as const,
  // Zone 1 <-> Zone 4 (x = -12) & Zone 1 <-> Zone 6 (x = +12): L1 & L2 Overpass Sky-Galleries ONLY (NO L0 bypass!)
  Z1_SIDE_GALLERY_Z: [7.6, 11.4] as const,

  // Zone 2 <-> Zone 3 (x = -12, West Smelter) & Zone 2 <-> Zone 9 (x = +12, East Locomotive Bay): 3-tier viaduct portals!
  Z2_SIDE_L0_Z: [-4.8, -0.2] as const,
  Z2_SIDE_L1_Z: [0.4, 3.2] as const,
  Z2_SIDE_L2_Z: [-4.8, -0.2] as const,

  // Zone 2 <-> Zone 12 (North Extraction) along z = -9.0
  Z2_Z12_L0_X: [-2.6, 2.6] as const,
  Z2_Z12_L1_WEST_X: [-9.6, -6.4] as const,
  Z2_Z12_L1_EAST_X: [6.4, 9.6] as const,
  Z2_Z12_L2_X: [-2.6, 2.6] as const,

  // Zone 12 <-> Zone 10 (x = -12, NW Signal Tower) & Zone 12 <-> Zone 11 (x = +12, NE Cyber-Bazaar): 3-tier connectors!
  Z12_SIDE_Z: [-15.0, -11.0] as const,

  // West Industrial District internal portals:
  // Zone 3 (West Smelter) <-> Zone 4 (SW Forge Yard) along z = +4.0 (x in [-34, -12])
  Z3_Z4_L0_X: [-25.0, -21.0] as const,
  Z3_Z4_L1_X: [-18.0, -14.4] as const,
  Z3_Z4_L2_X: [-25.0, -21.0] as const,
  // Zone 3 (West Smelter) <-> Zone 5 (Far SW Slag Silo) along z = +4.0 (x in [-56, -34])
  Z3_Z5_L0_X: [-47.0, -43.0] as const,
  Z3_Z5_L1_X: [-53.2, -49.6] as const,
  Z3_Z5_L2_X: [-47.0, -43.0] as const,
  // Zone 4 (SW Forge Yard) <-> Zone 5 (Far SW Slag Silo) along x = -34.0 (z in [+4, +34])
  Z4_Z5_JAMMED_Z: [16.2, 20.2] as const,
  Z4_Z5_L1_Z: [25.4, 29.0] as const,
  Z4_Z5_L2_Z: [8.2, 12.0] as const,
  // Zone 3 (West Smelter) <-> Zone 10 (NW Signal Tower) along z = -9.0 (x in [-56, -12])
  Z3_Z10_JAMMED_X: [-26.0, -22.0] as const,
  Z3_Z10_GATE_X: [-48.0, -44.0] as const,
  Z3_Z10_L1_X: [-36.4, -32.8] as const,
  Z3_Z10_L2_X: [-53.2, -49.8] as const,

  // East Rail-Yard & Cyber-Bazaar District internal portals:
  // Zone 9 (East Locomotive Bay) <-> Zone 6 (SE Rail Depot) along z = +4.0 (x in [+12, +34])
  Z9_Z6_L0_X: [21.0, 25.0] as const,
  Z9_Z6_L1_X: [14.4, 18.0] as const,
  Z9_Z6_L2_X: [21.0, 25.0] as const,
  // Zone 9 (East Locomotive Bay) <-> Zone 8 (Far SE Cooling Silo) along z = +4.0 (x in [+34, +56])
  Z9_Z8_L0_X: [43.0, 47.0] as const,
  Z9_Z8_L1_X: [49.6, 53.2] as const,
  Z9_Z8_L2_X: [43.0, 47.0] as const,
  // Zone 6 (SE Rail Depot) <-> Zone 8 (Far SE Cooling Silo) along x = +34.0 (z in [+4, +34])
  Z6_Z8_L0_Z: [16.0, 20.0] as const,
  Z6_Z8_L1_Z: [25.4, 29.0] as const,
  Z6_Z8_L2_Z: [8.2, 12.0] as const,
  // Zone 9 (East Locomotive Bay) <-> Zone 11 (NE Cyber-Bazaar) along z = -9.0 (x in [+12, +56])
  Z9_Z11_L0_WEST_X: [22.0, 26.0] as const,
  Z9_Z11_L0_EAST_X: [45.0, 49.0] as const,
  Z9_Z11_L1_X: [32.8, 36.4] as const,
  Z9_Z11_L2_X: [49.8, 53.2] as const,
} as const;

/** Shared interactive mechanic IDs across all 12 zones */
export const F2_IDS = {
  // Opening Sealed Customs Airlock Puzzle (Zone 1)
  gateCustomsSeal: 'f2_gate_customs_seal',
  lockCustomsSeal: 'f2_lock_customs_seal',
  switchCustomsSeal: 'f2_switch_customs_seal',

  // Locked Black-Market Munitions Vault (Zone 6 SE Rail Depot — shoot through panoramic booth glass!)
  gateBlackMarketVault: 'f2_gate_blackmarket_vault',
  lockBlackMarketVault: 'f2_lock_blackmarket_vault',

  // Locked Signal Tower Security Bypass Gate (Zone 3 <-> Zone 10 — unlock via switch inside Zone 10 or shootable relay!)
  gateTowerBypass: 'f2_gate_tower_bypass',
  lockTowerBypass: 'f2_lock_tower_bypass',
  switchTowerBypass: 'f2_switch_tower_bypass',

  // 3 Retractable Level 2 Industrial Skybridges (each with dual [E] Switch + Shootable Relay!)
  bridgeSmelterL2: 'f2_bridge_smelter_l2',
  switchSmelterL2: 'f2_switch_smelter_l2',
  lockSmelterL2: 'f2_lock_smelter_l2',

  bridgeLocomotiveL2: 'f2_bridge_locomotive_l2',
  switchLocomotiveL2: 'f2_switch_locomotive_l2',
  lockLocomotiveL2: 'f2_lock_locomotive_l2',

  bridgeHighlineExitL2: 'f2_bridge_highline_exit_l2',
  switchHighlineExitL2: 'f2_switch_highline_exit_l2',
  lockHighlineExitL2: 'f2_lock_highline_exit_l2',

  // 2 Jammed Half-Open Roll-Under Industrial Blast Shutters ([V] Dodge Roll!)
  jammedForgeSilo: 'f2_jammed_forge_silo',
  jammedSmelterTower: 'f2_jammed_smelter_tower',

  // 6 Calibrated Multi-Tier Pneumatic Cargo-Lift Jump Pads (including TWO Express L0->L2 Super-Lifts!)
  padSmelterL0ToL1: 'f2_pad_smelter_l0_l1',
  padSlagSiloSuperL0ToL2: 'f2_pad_slagsilo_super_l0_l2',
  padBazaarL1ToL2: 'f2_pad_bazaar_l1_l2',
  padCoolingSiloSuperL0ToL2: 'f2_pad_silo_super_l0_l2',
  padLocomotiveL0ToL1: 'f2_pad_locomotive_l0_l1',
  padTowerL1ToL2: 'f2_pad_tower_l1_l2',
} as const;

/** Remote Level 2 Master Dispatch Control Spire inside Zone 10 (NW High-Voltage Signal Control Tower) */
export const F2_CONTROL_CENTER_POS = {
  x: -46.5,
  y: F2_L2_Y, // 20.2m — Level 2!
  z: -24.5,
} as const;

/** Spawn inside Zone 1 South Customs Airlock, facing North (-Z, yaw = 0) toward the Sealed Customs Shutter */
export const F2_SPAWN = {
  x: 0.0,
  y: F2_L0_Y,
  z: 14.2,
  yaw: 0,
} as const;

export const F2_BOUNDS = {
  minX: -56.0,
  maxX: 56.0,
  minZ: -34.0,
  maxZ: 34.0,
} as const;

export const F2_ENTRY_THRESHOLD = {
  minX: -5.5,
  maxX: 5.5,
  minZ: 10.5,
  maxZ: 15.8,
  maxY: F2_L0_Y + 3.0,
} as const;

/**
 * Bridges the exact 0.62m wall thickness (`coord - 0.31 .. coord + 0.31`) inside an elevated L1/L2
 * doorway portal so adjacent zone decks meet with ZERO floor gap and ZERO coplanar overlap!
 */
export function addF2PortalSill(
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
