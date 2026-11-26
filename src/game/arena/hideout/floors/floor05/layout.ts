import { FLOOR_CATALOG } from '../../types';

/**
 * FLOOR 05 (Y = 56.0m) — TACTICAL WAR-GAMES AMPHITHEATER & ORBITAL COMMAND COMPLEX
 * Master spatial blueprint shared across all 9 modular combat zones (`96m × 64m` AAA 4-tier world).
 *
 * Inter-Floor Portal Alignment (CRITICAL):
 * - Floor 06's North Descent Airlock Gallery (`x ∈ [-6.2, +6.2], z ∈ [-36.0, -17.0]`) delivers
 *   cleanly to Floor 05's North Arrival Bulkhead at `(x = 0, y = 56.0, z = -17.0)` facing South (`+Z`, `yaw = Math.PI`).
 * - Floor 05's South Exit Bulkhead 05 sits at `(x = 0, y = 56.0, z = +17.0)` followed by the
 *   South Descent Airlock Gallery (`x ∈ [-6.2, +6.2], z ∈ [+17.0, +36.0]`) delivering cleanly to
 *   Floor 04's South Arrival Bulkhead (`y = 42.0, z = +17.0`).
 * - All 4 corner outer wings (`Zones 5, 6, 7, 8`) stay strictly outside `|x| >= 18.0` for `|z| > 17.0`
 *   (11.8m clearance from both inter-floor descent shafts!).
 */
export const F5_META = FLOOR_CATALOG[5];
export const F5_BASE_Y = F5_META.baseY; // 56.0m — Main concourse & all 6 outer wings
export const F5_TIER_Y = F5_BASE_Y - 1.3; // 54.7m — Mid concentric amphitheater terrace ring
export const F5_PIT_Y = F5_BASE_Y - 2.6; // 53.4m — Sunken holographic war-pit coliseum floor
export const F5_UPPER_Y = F5_BASE_Y + 4.4; // 60.4m — +4.4m VIP balconies & all upper catwalks!

export const F5_CEILINGS = {
  /** 56.0 + 10.35 + 0.50 = 66.85m (strictly below Floor 06 sunken trench bottom at 67.00m — 12.95m tall from War-Pit!) */
  coliseum: 10.35,
  westSimDeck: 10.05,
  eastMechBay: 10.35,
  nwOrbital: 10.35,
  neCommand: 10.0,
  swReactor: 10.35,
  seOrdnance: 10.3,
} as const;

export const F5_SPAWN = {
  x: 0,
  y: F5_BASE_Y,
  z: -14.0,
  yaw: Math.PI, // Facing South (+Z) straight across the Sunken Holographic War-Pit Coliseum!
} as const;

export const F5_BOUNDS = {
  minX: -49.5,
  maxX: 49.5,
  minZ: -36.8,
  maxZ: 36.8,
} as const;

export const F5_ENTRY_THRESHOLD = {
  minX: -15.0,
  maxX: 15.0,
  minZ: -15.6,
  maxZ: 15.5,
  maxY: F5_BASE_Y + 5.2,
} as const;

/** Shared master perimeter coordinates guaranteeing 0mm gaps & 0mm overlap across all 9 zones */
export const F5_WALLS = {
  coliseumWestX: -18.0,
  coliseumEastX: 18.0,
  coliseumNorthZ: -17.0,
  coliseumSouthZ: 17.0,
  westOuterX: -48.0,
  eastOuterX: 48.0,
  northWingsOuterZ: -32.0,
  northSplitZ: -10.0,
  southSplitZ: 10.0,
  southWingsOuterZ: 32.0,
} as const;

/** Shared framed doorway & stacked upper-gallery portal coordinates (2D subtraction safe!) */
export const F5_PORTALS = {
  // Coliseum West Wall (x = -18.0)
  westNorthGroundZ: [-15.4, -10.8] as const, // Zone 1 <-> Zone 5 NW Orbital (Locked Bypass Gate!)
  westNorthUpperZ: [-15.0, -11.0] as const, // Zone 2 West VIP <-> Zone 5 Orbital Catwalk
  westMidGroundZ: [-2.5, 2.5] as const, // Zone 2 <-> Zone 3 West Sim-Deck (Auto Door)
  westMidUpperZ: [-6.4, -2.0] as const, // Zone 2 West VIP <-> Zone 3 Sim-Deck Overwatch
  westSouthGroundZ: [10.8, 15.4] as const, // Zone 9 <-> Zone 7 SW Reactor (Auto Door)
  westSouthUpperZ: [11.0, 15.0] as const, // Zone 9 Overlook <-> Zone 7 Turbine Gallery

  // Coliseum East Wall (x = +18.0)
  eastNorthGroundZ: [-15.4, -10.8] as const, // Zone 1 <-> Zone 6 NE Command (Auto Door)
  eastNorthUpperZ: [-15.0, -11.0] as const, // Zone 2 East VIP <-> Zone 6 Command Gallery
  eastMidGroundZ: [-2.5, 2.5] as const, // Zone 2 <-> Zone 4 East Mech-Bay (Auto Door)
  eastMidUpperZ: [-6.4, -2.0] as const, // Zone 2 East VIP <-> Zone 4 Mech Gantry
  eastSouthGroundZ: [10.8, 15.4] as const, // Zone 9 <-> Zone 8 SE Ordnance (Auto Door)
  eastSouthUpperZ: [11.0, 15.0] as const, // Zone 9 Overlook <-> Zone 8 Logistics Balcony

  // Zone 3 West Sim-Deck <-> Zone 5 NW Orbital Array (z = -10.0)
  simToOrbitalJammedX: [-39.0, -34.4] as const, // Jammed Roll-Under Blast Shutter!
  simToOrbitalAutoX: [-25.0, -20.4] as const, // Motorized Auto Door
  simToOrbitalUpperX: [-46.6, -42.6] as const, // Upper Catwalk Arch

  // Zone 3 West Sim-Deck <-> Zone 7 SW Reactor Gallery (z = +10.0)
  simToReactorAutoX: [-38.4, -33.8] as const, // Motorized Auto Door
  simToReactorOpenX: [-25.2, -20.8] as const, // Open Tactical Arch
  simToReactorUpperX: [-46.6, -42.6] as const, // Upper Catwalk Arch

  // Zone 4 East Mech-Bay <-> Zone 6 NE War-Council Command (z = -10.0)
  mechToCommandAutoX: [20.8, 25.4] as const, // Motorized Auto Door
  mechToCommandOpenX: [31.2, 35.6] as const, // Open Tactical Arch
  mechToCommandUpperX: [42.6, 46.6] as const, // Upper Catwalk Arch

  // Zone 4 East Mech-Bay <-> Zone 8 SE Ordnance Depot (z = +10.0)
  mechToOrdnanceAutoX: [20.8, 25.4] as const, // Motorized Auto Door
  mechToOrdnanceJammedX: [34.4, 39.0] as const, // Jammed Roll-Under Blast Shutter!
  mechToOrdnanceUpperX: [42.6, 46.6] as const, // Upper Catwalk Arch
} as const;

/** Shared interactive mechanic IDs across Floor 05 */
export const F5_IDS = {
  // 3 Retractable Skybridges (each with dual [E] Switch + Shootable Relay Lock activation!)
  bridgeColiseumHigh: 'f5_bridge_coliseum_high',
  lockColiseumBridge: 'f5_lock_coliseum_bridge',
  switchColiseumBridge: 'f5_switch_coliseum_bridge',

  bridgeMechGantry: 'f5_bridge_mech_gantry',
  lockMechGantry: 'f5_lock_mech_gantry',
  switchMechGantry: 'f5_switch_mech_gantry',

  bridgeSeDepot: 'f5_bridge_se_depot',
  lockSeDepot: 'f5_lock_se_depot',
  switchSeDepot: 'f5_switch_se_depot',

  // 2 Locked Security Gates (with Shootable Relays!)
  gateNwBypass: 'f5_gate_nw_bypass',
  lockNwBypass: 'f5_lock_nw_bypass',

  gateNeVault: 'f5_gate_ne_vault',
  lockNeVault: 'f5_lock_ne_vault',

  // 2 Jammed Half-Open Roll-Under Blast Shutters (`[V]` Dodge Roll!)
  jammedSimNw: 'f5_jammed_sim_nw',
  jammedMechSe: 'f5_jammed_mech_se',

  // 4 Calibrated Pneumatic Jump Pads (`+4.4m` clean upper landings with dedicated guardrail gaps!)
  padColiseumWest: 'f5_pad_coliseum_west',
  padColiseumEast: 'f5_pad_coliseum_east',
  padWestSim: 'f5_pad_west_sim',
  padNwOrbital: 'f5_pad_nw_orbital',
} as const;
