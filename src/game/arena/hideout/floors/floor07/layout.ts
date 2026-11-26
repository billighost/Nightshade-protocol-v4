import { FLOOR_CATALOG } from '../../types';

/**
 * Floor 07 — SPIRAL WELL COMBAT NEXUS
 * Master spatial constants shared across all 7 modular zones (`84m × 54m` combat world).
 *
 * Inter-Floor Portal Alignment (CRITICAL):
 * - Floor 08 North Descent Gallery arrives at `(x = 0, y = 84.0, z = -17.0)` facing `+Z`.
 * - Floor 07 South Exit Bulkhead 07 sits at `(x = 0, y = 84.0, z = +17.0)` followed by the
 *   South Descent Airlock Gallery (`x ∈ [-6.2, +6.2], z ∈ [+17.0, +36.0]`) delivering the
 *   operative cleanly to Floor 06's South Arrival Bulkhead (`y = 70.0, z = +17.0`).
 */
export const F7_META = FLOOR_CATALOG[7];
export const F7_BASE_Y = F7_META.baseY; // 84.0m
export const F7_UPPER_Y = F7_BASE_Y + 4.4; // 88.4m (+4.4m generous OTS headroom!)
export const F7_ABYSS_Y = F7_BASE_Y - 2.6; // 81.4m illuminated central shaft bottom (strictly above Floor 06 roof at 81.11m!)
export const F7_ABYSS_RADIUS = 4.7;
export const F7_STAIR_OUTER_R = 8.3;
export const F7_RING_OUTER_R = 8.5;

export const F7_CEILINGS = {
  /** Strictly < Floor 08 slab bottom (97.40m) -> 84.0 + 12.7 + 0.44 = 97.14m */
  rotunda: 12.7,
  barracks: 9.2,
  serverWing: 10.5,
  cargoBay: 9.6,
  turbineGallery: 9.6,
} as const;

export const F7_SPAWN = {
  x: 0,
  y: F7_BASE_Y,
  z: -13.8,
  yaw: Math.PI, // Facing +Z straight into the illuminated Spiral Well Rotunda!
} as const;

export const F7_BOUNDS = {
  minX: -43.5,
  maxX: 43.5,
  minZ: -24.0,
  maxZ: 36.8,
} as const;

export const F7_ENTRY_THRESHOLD = {
  minX: -14.0,
  maxX: 14.0,
  minZ: -15.4,
  maxZ: 15.0,
  maxY: F7_BASE_Y + 5.2,
} as const;

/** Shared key wall coordinates guaranteeing 0mm gaps & 0mm overlap between zones */
export const F7_WALLS = {
  rotundaWestX: -16.0,
  rotundaEastX: 16.0,
  rotundaNorthZ: -17.0,
  rotundaSouthZ: 17.0,
  westOuterX: -42.0,
  eastOuterX: 42.0,
  wingNorthZ: -22.0,
  wingSplitZ: 10.0,
  wingSouthZ: 32.0,
} as const;

/** Shared mechanic IDs connecting shootable locks, switches, bridges, and gates */
export const F7_IDS = {
  bridgeRotundaCore: 'f7_bridge_rotunda_core',
  lockRotundaBridge: 'f7_lock_rotunda_bridge',
  switchRotundaBridge: 'f7_switch_rotunda_bridge',

  gateWestVault: 'f7_gate_west_vault',
  lockWestVault: 'f7_lock_west_vault',

  gateEastBypass: 'f7_gate_east_bypass',
  lockEastBypass: 'f7_lock_east_bypass',

  bridgeTurbineCatwalk: 'f7_bridge_turbine_catwalk',
  switchTurbineBridge: 'f7_switch_turbine_bridge',

  jammedWestFlank: 'f7_jammed_west_flank',
  jammedCargoShortcut: 'f7_jammed_cargo_shortcut',

  padRotundaEast: 'f7_pad_rotunda_east',
  padRotundaWest: 'f7_pad_rotunda_west',
  padEastServers: 'f7_pad_east_servers',
  padCargoGantry: 'f7_pad_cargo_gantry',
} as const;
