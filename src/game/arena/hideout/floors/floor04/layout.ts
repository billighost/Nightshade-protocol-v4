import { FLOOR_CATALOG } from '../../types';

/**
 * FLOOR 04 (Y = 42.0m) — THE SKYBRIDGE CHASM & HYDRO-GEO CANYON COMPLEX
 * Master spatial blueprint shared across all 9 modular combat zones (`96m × 64m` AAA 4-elevation world).
 *
 * Inter-Floor Portal Alignment (CRITICAL):
 * - Floor 05's South Descent Airlock Gallery (`x ∈ [-6.2, +6.2], z ∈ [+17.0, +36.0]`) delivers
 *   cleanly to Floor 04's South Arrival Bulkhead at `(x = 0, y = 42.0, z = +17.0)` facing North (`-Z`, `yaw = 0`).
 * - Floor 04's North Exit Bulkhead 04 sits at `(x = 0, y = 42.0, z = -17.0)` followed by the
 *   North Descent Airlock Gallery (`x ∈ [-6.2, +6.2], z ∈ [-36.0, -17.0]`) delivering cleanly to
 *   Floor 03's North Arrival Bulkhead (`y = 28.0, z = -17.0`).
 * - All 4 corner outer wings (`Zones 5, 6, 7, 8`) stay strictly outside `|x| >= 18.0` for `|z| > 17.0`
 *   (11.8m clearance from both inter-floor descent shafts!).
 */
export const F4_META = FLOOR_CATALOG[4];
export const F4_CHASM_Y = F4_META.baseY - 2.4; // 39.6m — Deep illuminated hydro-thermal abyssal chasm floor
export const F4_BASE_Y = F4_META.baseY; // 42.0m — Main canyon cliffs, spine bridge & outer wing ground halls
export const F4_MID_Y = F4_META.baseY + 2.6; // 44.6m — Staggered South transverse suspension skybridge (+2.26m clear OTS headroom under!)
export const F4_UPPER_Y = F4_META.baseY + 4.4; // 46.4m — +4.4m High sniper skybridge, suspension towers & all upper catwalks!

export const F4_CEILINGS = {
  /** 42.0 + 10.15 + 0.50 = 52.65m (strictly below Floor 05 sunken war-pit bottom at 52.80m — 12.55m tall from Chasm!) */
  canyon: 10.15,
  westHydroDam: 10.15,
  eastTramFoundry: 10.15,
  nwSubstation: 10.1,
  neOverwatch: 10.0,
  swGeothermal: 10.15,
  seFreightYard: 10.15,
} as const;

export const F4_SPAWN = {
  x: 0,
  y: F4_BASE_Y,
  z: 14.0,
  yaw: 0, // Facing North (-Z) straight across the 4-elevation Criss-Cross Cable-Stayed Skybridge Chasm!
} as const;

export const F4_BOUNDS = {
  minX: -49.5,
  maxX: 49.5,
  minZ: -36.8,
  maxZ: 36.8,
} as const;

export const F4_ENTRY_THRESHOLD = {
  minX: -15.0,
  maxX: 15.0,
  minZ: -15.5,
  maxZ: 15.6,
  maxY: F4_BASE_Y + 5.2,
} as const;

/** Shared master perimeter coordinates guaranteeing 0mm gaps & 0mm overlap across all 9 zones */
export const F4_WALLS = {
  canyonWestX: -18.0,
  canyonEastX: 18.0,
  canyonNorthZ: -17.0,
  canyonSouthZ: 17.0,
  westOuterX: -48.0,
  eastOuterX: 48.0,
  northWingsOuterZ: -32.0,
  northSplitZ: -10.0,
  southSplitZ: 10.0,
  southWingsOuterZ: 32.0,
} as const;

/** Shared framed doorway & stacked upper-gallery portal coordinates (2D subtraction safe!) */
export const F4_PORTALS = {
  // Canyon West Wall (x = -18.0)
  westNorthGroundZ: [-15.4, -10.8] as const, // Zone 9 <-> Zone 5 NW Substation (Locked Bypass Gate!)
  westNorthUpperZ: [-15.0, -11.0] as const, // Zone 2 West Tower <-> Zone 5 Substation Catwalk
  westMidGroundZ: [-2.5, 2.5] as const, // Zone 2 <-> Zone 3 West Hydro Dam (Auto Door)
  westMidUpperZ: [-6.4, -2.0] as const, // Zone 2 West Tower <-> Zone 3 Hydro Dam Gallery
  westSouthGroundZ: [10.8, 15.4] as const, // Zone 1 <-> Zone 7 SW Geothermal (Auto Door)
  westSouthUpperZ: [11.0, 15.0] as const, // Zone 1 Overlook <-> Zone 7 Geothermal Gallery

  // Canyon East Wall (x = +18.0)
  eastNorthGroundZ: [-15.4, -10.8] as const, // Zone 9 <-> Zone 6 NE Overwatch (Auto Door)
  eastNorthUpperZ: [-15.0, -11.0] as const, // Zone 2 East Tower <-> Zone 6 Overwatch Gallery
  eastMidGroundZ: [-2.5, 2.5] as const, // Zone 2 <-> Zone 4 East Tram Foundry (Auto Door)
  eastMidUpperZ: [-6.4, -2.0] as const, // Zone 2 East Tower <-> Zone 4 Tram Foundry Catwalk
  eastSouthGroundZ: [10.8, 15.4] as const, // Zone 1 <-> Zone 8 SE Freight Yard (Auto Door)
  eastSouthUpperZ: [11.0, 15.0] as const, // Zone 1 Overlook <-> Zone 8 Freight Balcony

  // Zone 3 West Hydro Dam <-> Zone 5 NW Substation (z = -10.0)
  hydroToSubstationJammedX: [-39.0, -34.4] as const, // Jammed Roll-Under Blast Shutter!
  hydroToSubstationAutoX: [-25.0, -20.4] as const, // Motorized Auto Door
  hydroToSubstationUpperX: [-46.6, -42.6] as const, // Upper Catwalk Arch

  // Zone 3 West Hydro Dam <-> Zone 7 SW Geothermal (z = +10.0)
  hydroToGeoAutoX: [-38.4, -33.8] as const, // Motorized Auto Door
  hydroToGeoOpenX: [-25.2, -20.8] as const, // Open Tactical Arch
  hydroToGeoUpperX: [-46.6, -42.6] as const, // Upper Catwalk Arch

  // Zone 4 East Tram Foundry <-> Zone 6 NE Overwatch (z = -10.0)
  foundryToOverwatchAutoX: [20.8, 25.4] as const, // Motorized Auto Door
  foundryToOverwatchOpenX: [31.2, 35.6] as const, // Open Tactical Arch
  foundryToOverwatchUpperX: [42.6, 46.6] as const, // Upper Catwalk Arch

  // Zone 4 East Tram Foundry <-> Zone 8 SE Freight Yard (z = +10.0)
  foundryToFreightAutoX: [20.8, 25.4] as const, // Motorized Auto Door
  foundryToFreightJammedX: [34.4, 39.0] as const, // Jammed Roll-Under Blast Shutter!
  foundryToFreightUpperX: [42.6, 46.6] as const, // Upper Catwalk Arch
} as const;

/** Shared interactive mechanic IDs across Floor 04 */
export const F4_IDS = {
  // 3 Retractable Hydraulic Skybridges (each with dual [E] Switch + Shootable Relay Lock activation!)
  bridgeChasmHigh: 'f4_bridge_chasm_high',
  lockChasmHigh: 'f4_lock_chasm_high',
  switchChasmHigh: 'f4_switch_chasm_high',

  bridgeFoundryCrane: 'f4_bridge_foundry_crane',
  lockFoundryCrane: 'f4_lock_foundry_crane',
  switchFoundryCrane: 'f4_switch_foundry_crane',

  bridgeSeFreight: 'f4_bridge_se_freight',
  lockSeFreight: 'f4_lock_se_freight',
  switchSeFreight: 'f4_switch_se_freight',

  // 2 Locked Security Gates (with Shootable Relays & Bypass Switch!)
  gateNwSubstation: 'f4_gate_nw_substation',
  lockNwSubstation: 'f4_lock_nw_substation',
  switchNwSubstation: 'f4_switch_nw_substation',

  gateNeVault: 'f4_gate_ne_vault',
  lockNeVault: 'f4_lock_ne_vault',

  // 2 Jammed Half-Open Roll-Under Blast Shutters (`[V]` Dodge Roll!)
  jammedHydroNw: 'f4_jammed_hydro_nw',
  jammedFoundrySe: 'f4_jammed_foundry_se',

  // 6 Calibrated Pneumatic Jump Pads (4 upper +4.4m launches + 2 Chasm Thermal Updrafts onto Spine Bridge!)
  padChasmWest: 'f4_pad_chasm_west',
  padChasmEast: 'f4_pad_chasm_east',
  padChasmUpdraftW: 'f4_pad_chasm_updraft_w',
  padChasmUpdraftE: 'f4_pad_chasm_updraft_e',
  padHydroWest: 'f4_pad_hydro_west',
  padSubstationNw: 'f4_pad_substation_nw',
} as const;
