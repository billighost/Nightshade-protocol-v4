import { FLOOR_CATALOG } from '../../types';

/**
 * FLOOR 01 — THE ECLIPSE SOVEREIGN COLOSSEUM (FINAL BOSS ARENA)
 *
 * Vertical Architecture (24.6 METERS of uninterrupted cathedral height!):
 * - Floor 02 lowest mesh sits at 13.34m; Floor 01 roof top caps at +13.08m (+0.26m clearance!).
 * - Nothing exists below Y = 0.0m, so the Arrival Omen Vestibule & Viewing Overlook sit at Y = 0.0m (L2),
 *   and the colossal 88m × 88m Obsidian Boss Colosseum drops dramatically down to Y = -12.0m (L0)!
 *
 * Four Playable Vertical Tiers:
 * - L0 = -12.0m : Sunken Obsidian Boss Colosseum Floor (88m × 88m, Central Boss Throne Dais, 8 Cover Pillars, 8 Cover Walls)
 * - L1 =  -6.0m : 360° Mid-Ring Bastion Galleries & L0→L1 Grand Stairs / Spiral Junctions
 * - L2 =   0.0m : Omen Vestibule, Sovereign Viewing Overlook, High Crown Galleries, Retractable Siege Skybridges & Control Center
 * - L3 =  +5.2m : Twin East & West Apex Vantage Crowns (+17.2m above Boss Pit, 7.4m headroom below roof!)
 */
export const F1_META = FLOOR_CATALOG[1];

export const F1_L0_Y = -12.0;
export const F1_L1_Y = -6.0;
export const F1_L2_Y = 0.0;
export const F1_L3_Y = 5.2;

export const F1_ROOF_UNDERSIDE_Y = 12.6;
export const F1_ROOF_THICK = 0.48;
export const F1_ROOF_CENTER_Y = F1_ROOF_UNDERSIDE_Y + F1_ROOF_THICK * 0.5; // 12.84m -> top 13.08m (< 13.34m F2!)
export const F1_WALL_HEIGHT = F1_ROOF_UNDERSIDE_Y - F1_L0_Y; // 24.60m!
export const F1_MIN_SAFE_Y = -24.0;

export const F1_GRID = {
  CX: 0,
  CZ: 40.0,
  X_MIN: -44.0,
  X_MAX: 44.0,
  Z_ARRIVAL: -17.0,
  Z_NORTH: -4.0,
  Z_SOUTH: 84.0,
  Z_SANCTUM_END: 97.0,
  VEST_HALF_W: 9.0,
  L1_DEPTH: 8.0, // West [-43.68, -36.0], East [36.0, 43.68], North [-3.68, 4.0], South [76.0, 83.68]
  L2_SIDE_W: 4.8, // West [-43.68, -39.2], East [39.2, 43.68]
  SPIRAL_W_X: -28.0,
  SPIRAL_E_X: 28.0,
  SPIRAL_Z: 40.0,
  SPIRAL_R_IN: 2.4,
  SPIRAL_R_OUT: 4.8,
} as const;

export const F1_IDS = {
  // Retractable Aerial Siege Skybridges (L2 = 0.0m) linking Spiral Towers -> Crucible Weapon Islands
  bridgeWestSiege: 'f1_bridge_west_siege',
  bridgeEastSiege: 'f1_bridge_east_siege',
  switchWestSiege: 'f1_switch_west_siege',
  switchEastSiege: 'f1_switch_east_siege',
  lockWestSiege: 'f1_lock_west_siege',
  lockEastSiege: 'f1_lock_east_siege',

  // Twin Sealed L0 Boss-Munitions Reliquary Armory Vaults
  gateWestVault: 'f1_gate_west_armory',
  lockWestVault: 'f1_lock_west_armory',
  gateEastVault: 'f1_gate_east_armory',
  lockEastVault: 'f1_lock_east_armory',

  // 6 Calibrated Gravity-Vortex Jump Pads (4 Corner L0→L1 + 2 Open-Sky L1→L2)
  padNwL1: 'f1_pad_nw_l1',
  padNeL1: 'f1_pad_ne_l1',
  padSwL1: 'f1_pad_sw_l1',
  padSeL1: 'f1_pad_se_l1',
  padSwL2: 'f1_pad_sw_l2',
  padNeL2: 'f1_pad_ne_l2',
} as const;

export const F1_SPAWN = {
  x: 0,
  y: F1_L2_Y,
  z: -13.8,
  yaw: Math.PI, // Facing South (+Z) straight out through the Omen Vestibule onto the Sovereign Overlook!
} as const;

export const F1_CONTROL_CENTER_POS = {
  x: 0,
  y: F1_L2_Y,
  z: 80.4,
} as const;
