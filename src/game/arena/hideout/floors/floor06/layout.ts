import { FLOOR_CATALOG } from '../../types';

/**
 * FLOOR 06 (Y = 70.0m) — OBSIDIAN MONOLITH ARCHIVE & BALLISTIC LABS
 * Master spatial blueprint shared across all 8 modular combat zones (`88m × 56m` AAA multi-tier world).
 *
 * Inter-Floor Portal Alignment (CRITICAL):
 * - Floor 07's South Descent Airlock Gallery delivers cleanly to Floor 06's South Arrival Bulkhead
 *   at `(x = 0, y = 70.0, z = +17.0)` facing North (`-Z`, `yaw = 0`).
 * - Floor 06's North Exit Bulkhead 06 sits at `(x = 0, y = 70.0, z = -17.0)` followed by the
 *   North Descent Airlock Gallery (`x ∈ [-6.2, +6.2], z ∈ [-36.0, -17.0]`) delivering cleanly to
 *   Floor 05's North Arrival Bulkhead (`y = 56.0, z = -17.0`).
 * - Outer wing footprints stay strictly outside `|x| >= 18.0` for `|z| > 17.0` (11.8m clearance from both shafts!).
 */
export const F6_META = FLOOR_CATALOG[6];
export const F6_BASE_Y = F6_META.baseY; // 70.0m
export const F6_TRENCH_Y = F6_BASE_Y - 2.4; // 67.6m — sunken dry cooling & containment trench!
export const F6_UPPER_Y = F6_BASE_Y + 4.4; // 74.4m — +4.4m generous OTS headroom across all upper galleries!

export const F6_CEILINGS = {
  /** Strictly < Floor 07 abyss bottom (81.24m) -> 70.0 + 10.55 + 0.56 = 81.11m (12.95m tall above Trench!) */
  cathedral: 10.55,
  westLabs: 9.6,
  eastFoundry: 10.2,
  swBunker: 9.2,
  neGravCore: 10.55,
  nwCryoVault: 10.0,
} as const;

export const F6_SPAWN = {
  x: 0,
  y: F6_BASE_Y,
  z: 14.0,
  yaw: 0, // Facing North (-Z) straight into the Suspended Monolith Cathedral!
} as const;

export const F6_BOUNDS = {
  minX: -45.5,
  maxX: 45.5,
  minZ: -36.8,
  maxZ: 29.5,
} as const;

export const F6_ENTRY_THRESHOLD = {
  minX: -15.0,
  maxX: 15.0,
  minZ: -15.5,
  maxZ: 15.6,
  maxY: F6_BASE_Y + 5.2,
} as const;

/** Shared master perimeter coordinates ensuring 0mm gaps & 0mm overlap across all 8 zones */
export const F6_WALLS = {
  cathedralWestX: -18.0,
  cathedralEastX: 18.0,
  cathedralNorthZ: -17.0,
  cathedralSouthZ: 17.0,
  westOuterX: -44.0,
  eastOuterX: 44.0,
  northWingsNorthZ: -28.0,
  northWingsSplitZ: -8.0,
  westSouthSplitZ: 14.0,
  swBunkerSouthZ: 28.0,
  eastFoundrySouthZ: 17.0,
} as const;

/** Shared framed doorway & upper-gallery portal coordinates */
export const F6_PORTALS = {
  // Cathedral West Wall (x = -18.0)
  westNorthGroundZ: [-15.2, -10.6] as const, // Zone 8 <-> Zone 7 Cryo Vault (Locked Security Gate!)
  westNorthUpperZ: [-15.0, -11.0] as const, // Zone 8 Overlook <-> Zone 7 Frost Catwalk
  westMidGroundZ: [-4.5, 0.5] as const, // Zone 2 <-> Zone 3 Black-Site Labs (Auto Sliding Door)
  westMidUpperZ: [2.0, 6.4] as const, // Zone 2 West Gallery <-> Zone 3 Lab Catwalk
  westSouthGroundZ: [8.2, 12.8] as const, // Zone 1 Arrival <-> Zone 3 South Entry

  // Cathedral East Wall (x = +18.0)
  eastNorthGroundZ: [-15.2, -10.6] as const, // Zone 8 <-> Zone 6 Grav-Core (Auto Sliding Door)
  eastNorthUpperZ: [-15.0, -11.0] as const, // Zone 8 Overlook <-> Zone 6 Upper Halo Ring
  eastMidGroundZ: [-4.5, 0.5] as const, // Zone 2 <-> Zone 4 Ballistic Foundry (Auto Sliding Door)
  eastMidUpperZ: [2.0, 6.4] as const, // Zone 2 East Gallery <-> Zone 4 Foundry Catwalk
  eastSouthGroundZ: [8.2, 12.8] as const, // Zone 1 Arrival <-> Zone 4 South Entry

  // Zone 3 West Labs <-> Zone 7 NW Cryo Vault (z = -8.0)
  labsToCryoJammedX: [-37.0, -32.4] as const, // Jammed Half-Open Roll-Under Shutter!
  labsToCryoAutoX: [-24.4, -20.0] as const, // Motorized Auto Door
  labsToCryoUpperX: [-42.6, -38.8] as const, // Upper Catwalk Arch

  // Zone 3 West Labs <-> Zone 5 SW Armored Bunker (z = +14.0)
  labsToBunkerWestX: [-31.0, -26.2] as const, // Motorized Auto Door
  labsToBunkerEastX: [-23.4, -19.6] as const, // Open Tactical Arch

  // Zone 4 East Foundry <-> Zone 6 NE Grav-Core (z = -8.0)
  foundryToGravAutoX: [20.4, 24.8] as const, // Motorized Auto Door
  foundryToGravJammedX: [33.0, 37.6] as const, // Jammed Half-Open Roll-Under Shutter!
  foundryToGravUpperX: [38.8, 42.6] as const, // Upper Catwalk Arch
} as const;

/** Shared interactive mechanic IDs across Floor 06 */
export const F6_IDS = {
  // Zone 2 Cathedral High Retractable Skybridge (deploy via [E] switch OR shooting hanging Monolith Relay!)
  bridgeCathedralHigh: 'f6_bridge_cathedral_high',
  lockCathedralBridge: 'f6_lock_cathedral_bridge',
  switchCathedralBridge: 'f6_switch_cathedral_bridge',

  // Zone 4 East Foundry Retractable Catwalk Bridge (deploy via [E] switch OR shooting overhead relay!)
  bridgeFoundryCatwalk: 'f6_bridge_foundry_catwalk',
  lockFoundryBridge: 'f6_lock_foundry_bridge',
  switchFoundryBridge: 'f6_switch_foundry_bridge',

  // Zone 5 SW Armored Bunker Sealed Munitions Vault (snipe relay through observation glass!)
  gateSwVault: 'f6_gate_sw_vault',
  lockSwVault: 'f6_lock_sw_vault',

  // Zone 7 NW Cryo Vault Extraction Bypass Gate (shoot relay inside Cryo Sanctum to unlock direct flank to Zone 8!)
  gateCryoBypass: 'f6_gate_cryo_bypass',
  lockCryoBypass: 'f6_lock_cryo_bypass',

  // Jammed Half-Open Roll-Under Blast Shutters (`[V]` Dodge Roll!)
  jammedLabsCryo: 'f6_jammed_labs_cryo',
  jammedFoundryGrav: 'f6_jammed_foundry_grav',

  // 4 Calibrated Pneumatic Jump Pads (`+4.4m` clean upper landing with dedicated guardrail gaps!)
  padCathedralWest: 'f6_pad_cathedral_west',
  padCathedralEast: 'f6_pad_cathedral_east',
  padWestLabs: 'f6_pad_west_labs',
  padGravCore: 'f6_pad_grav_core',
} as const;
