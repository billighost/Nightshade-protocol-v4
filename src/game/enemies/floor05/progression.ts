import {
  F5_BASE_Y,
  F5_PIT_Y,
  F5_TIER_Y,
  F5_UPPER_Y,
} from '../../arena/hideout/floors/floor05/layout';
import type { EnemySpawnSpec } from '../core/types';

export interface Floor05ProgressionState {
  liveCombatActive: boolean;
  totalNormal: number;
  remainingNormal: number;
  totalMiniBosses: number;
  remainingMiniBosses: number;
  bossSpawned: boolean;
  bossDefeated: boolean;
  floorCleared: boolean;
}

/**
 * FLOOR 05: TACTICAL WAR-GAMES AMPHITHEATER & ORBITAL COMMAND COMPLEX
 * Elevations: Sunken War-Pit = 53.4m, Mid Amphitheater Terrace = 54.7m, Main Promenade = 56.0m, VIP Balconies = 60.4m
 * Faction: Gladiator Hunter-Beasts & Arena Champions (DOOM Eternal / Monster Hunter / Halo Elites)
 *
 * 27 Initial Hostiles + 1 Floor Boss (APEX ARENA MARAUDER) = 28 Total Hostiles!
 * Bigger, deadlier, and more vertical than Floor 06 (24 hostiles):
 * - 7 × Plasma-Spear Hoplite (Spartan polearm & phalanx-buckler vanguards across War-Pit, Terraces, Sim-Deck, Mech-Bay, NE Command, SE Ordnance, South Extraction)
 * - 6 × Leaping Carapace Stalker (Predator bio-chitin leapers across War-Pit, Sim-Deck, Mech-Bay, NW Orbital, SW Reactor, SE Ordnance)
 * - 7 × Arena Net-Shooter (Elevated Retiarius snare-web & mortar hunters on West VIP, East VIP, Director's Overlook, Sim-Deck Catwalk, Mech-Bay Spine, NE Command Gallery, SW Turbine Overlook)
 * - 5 × Shield-Chariot Brute (Horned prow-ram & flak juggernauts on Coliseum Promenade, West Sim-Deck, East Mech-Bay, NE Command, SE Ordnance)
 * - 1 × Dual-Cleaver Executioner (Zone Mini-Boss #1 — Zone 7 SW Thermal Reactor Gallery)
 * - 1 × Twin-Tail Acid Wyvern-Construct (Zone Mini-Boss #2 — Zone 5 NW Orbital Array)
 * - 1 × APEX ARENA MARAUDER (Floor 05 Boss — deploys into Zone 2 Sunken Holographic War-Pit once both Zone Mini-Bosses fall!)
 *
 * SAFETY GUARANTEES:
 * - Zone 1 North Arrival spawn at (0, 56.0, -14.0) stays 100% clear so player enters with hero sightline over the War-Pit!
 * - Zone 6 Sealed Black-Ops Prototype Vault (x >= 38.0, z <= -16.6) contains ZERO required hostiles!
 * - Central Holo War-Table collider (x,z in [-2.35, +2.35]), Dropship collider, Orbital Dish pedestal, Turbines & Containers are 100% clear!
 */
export const FLOOR05_INITIAL_SPAWNS: readonly EnemySpawnSpec[] = [
  // =========================================================================
  // ZONE 2: SUNKEN WAR-PIT COLISEUM & AMPHITHEATER (4 Vertical Tiers!)
  // =========================================================================
  // Sunken Holographic War-Pit Floor (Y = 53.4m, clear of War-Table [-2.35..2.35] & barricades (±4.8, ±4.8))
  {
    id: 'f5_hoplite_pit_west',
    archetypeId: 'plasma_spear_hoplite',
    zone: 'f5_z2_coliseum',
    x: -5.0,
    y: F5_PIT_Y,
    z: 0.2,
    yaw: 0,
    patrolPoints: [
      { x: -5.0, z: -2.4 },
      { x: -5.0, z: 2.6 },
    ],
  },
  {
    id: 'f5_stalker_pit_east',
    archetypeId: 'leaping_carapace_stalker',
    zone: 'f5_z2_coliseum',
    x: 5.0,
    y: F5_PIT_Y,
    z: 0.4,
    yaw: 0,
    patrolPoints: [
      { x: 5.0, z: -2.6 },
      { x: 5.0, z: 2.8 },
    ],
  },
  // Concentric Mid Amphitheater Terrace Ring (Y = 54.7m, ±7.2..±10.4)
  {
    id: 'f5_hoplite_tier_nw',
    archetypeId: 'plasma_spear_hoplite',
    zone: 'f5_z2_coliseum',
    x: -8.8,
    y: F5_TIER_Y,
    z: -4.6,
    yaw: -Math.PI * 0.25,
    patrolPoints: [
      { x: -8.8, z: -5.8 },
      { x: -8.8, z: -3.2 },
    ],
  },
  {
    id: 'f5_brute_tier_se',
    archetypeId: 'shield_chariot_brute',
    zone: 'f5_z2_coliseum',
    x: 8.8,
    y: F5_TIER_Y,
    z: 4.8,
    yaw: Math.PI * 0.15,
    patrolPoints: [
      { x: 8.8, z: 3.2 },
      { x: 8.8, z: 6.2 },
    ],
  },
  // Outer Coliseum Promenade (Y = 56.0m)
  {
    id: 'f5_stalker_coliseum_west_prom',
    archetypeId: 'leaping_carapace_stalker',
    zone: 'f5_z2_coliseum',
    x: -14.4,
    y: F5_BASE_Y,
    z: 3.0,
    yaw: -Math.PI * 0.35,
    patrolPoints: [
      { x: -14.4, z: -2.5 },
      { x: -14.4, z: 6.0 },
    ],
  },
  // Elevated +4.4m West & East VIP Balconies (Y = 60.4m)
  {
    id: 'f5_netshooter_vip_west',
    archetypeId: 'arena_net_shooter',
    zone: 'f5_z2_coliseum',
    x: -15.6,
    y: F5_UPPER_Y,
    z: 1.5,
    yaw: -Math.PI * 0.45,
  },
  {
    id: 'f5_netshooter_vip_east',
    archetypeId: 'arena_net_shooter',
    zone: 'f5_z2_coliseum',
    x: 15.6,
    y: F5_UPPER_Y,
    z: -2.0,
    yaw: Math.PI * 0.45,
  },

  // =========================================================================
  // ZONE 9: SOUTH DIRECTOR'S EXTRACTION & OVERLOOK BRIDGE
  // =========================================================================
  {
    id: 'f5_netshooter_director_bridge',
    archetypeId: 'arena_net_shooter',
    zone: 'f5_z9_south_extraction',
    x: 0.0,
    y: F5_UPPER_Y,
    z: 12.6,
    yaw: 0,
  },
  {
    id: 'f5_hoplite_south_extraction',
    archetypeId: 'plasma_spear_hoplite',
    zone: 'f5_z9_south_extraction',
    x: -4.8,
    y: F5_BASE_Y,
    z: 14.5,
    yaw: 0,
    patrolPoints: [
      { x: -6.8, z: 14.5 },
      { x: -2.2, z: 14.5 },
    ],
  },

  // =========================================================================
  // ZONE 3: WEST SIM-DECK (x in [-48, -18], z in [-10, +10])
  // =========================================================================
  {
    id: 'f5_hoplite_sim_east',
    archetypeId: 'plasma_spear_hoplite',
    zone: 'f5_z3_west_simdeck',
    x: -22.2,
    y: F5_BASE_Y,
    z: -4.8,
    yaw: -Math.PI * 0.5,
    patrolPoints: [
      { x: -21.5, z: -6.5 },
      { x: -21.5, z: -2.2 },
    ],
  },
  {
    id: 'f5_stalker_sim_center',
    archetypeId: 'leaping_carapace_stalker',
    zone: 'f5_z3_west_simdeck',
    x: -30.2,
    y: F5_BASE_Y,
    z: 5.0,
    yaw: -Math.PI * 0.5,
    patrolPoints: [
      { x: -28.0, z: 5.4 },
      { x: -33.0, z: 5.4 },
    ],
  },
  {
    id: 'f5_brute_sim_west',
    archetypeId: 'shield_chariot_brute',
    zone: 'f5_z3_west_simdeck',
    x: -39.5,
    y: F5_BASE_Y,
    z: -4.5,
    yaw: -Math.PI * 0.5,
    patrolPoints: [
      { x: -38.5, z: -5.5 },
      { x: -41.5, z: 2.5 },
    ],
  },
  {
    id: 'f5_netshooter_sim_catwalk',
    archetypeId: 'arena_net_shooter',
    zone: 'f5_z3_west_simdeck',
    x: -31.0,
    y: F5_UPPER_Y,
    z: -4.2,
    yaw: Math.PI,
  },

  // =========================================================================
  // ZONE 4: EAST MECH-BAY (x in [+18, +48], z in [-10, +10])
  // Clear of Dropship hull [25.55..38.65, -0.65..4.25] & wings [31.8..35.8, -3.0..6.6]
  // =========================================================================
  {
    id: 'f5_hoplite_mech_north',
    archetypeId: 'plasma_spear_hoplite',
    zone: 'f5_z4_east_mechbay',
    x: 22.4,
    y: F5_BASE_Y,
    z: -5.8,
    yaw: Math.PI * 0.5,
    patrolPoints: [
      { x: 22.4, z: -7.2 },
      { x: 28.5, z: -6.8 },
    ],
  },
  {
    id: 'f5_brute_mech_east',
    archetypeId: 'shield_chariot_brute',
    zone: 'f5_z4_east_mechbay',
    x: 41.8,
    y: F5_BASE_Y,
    z: 5.0,
    yaw: Math.PI * 0.5,
    patrolPoints: [
      { x: 41.8, z: -2.0 },
      { x: 41.8, z: 7.2 },
    ],
  },
  {
    id: 'f5_stalker_mech_south',
    archetypeId: 'leaping_carapace_stalker',
    zone: 'f5_z4_east_mechbay',
    x: 22.8,
    y: F5_BASE_Y,
    z: 6.4,
    yaw: Math.PI * 0.6,
    patrolPoints: [
      { x: 22.4, z: 7.4 },
      { x: 28.5, z: 7.4 },
    ],
  },
  {
    id: 'f5_netshooter_mech_spine',
    archetypeId: 'arena_net_shooter',
    zone: 'f5_z4_east_mechbay',
    x: 44.8,
    y: F5_UPPER_Y,
    z: -3.5,
    yaw: Math.PI * 0.5,
  },

  // =========================================================================
  // ZONE 5: NW ORBITAL ARRAY (x in [-48, -18], z in [-32, -10])
  // Clear of central Dish Pedestal [-35.75..-30.25, -20.95..-15.45]
  // =========================================================================
  {
    id: 'f5_stalker_orbital_east',
    archetypeId: 'leaping_carapace_stalker',
    zone: 'f5_z5_nw_orbital',
    x: -23.8,
    y: F5_BASE_Y,
    z: -24.5,
    yaw: Math.PI,
    patrolPoints: [
      { x: -23.5, z: -26.5 },
      { x: -23.5, z: -15.5 },
    ],
  },
  // ZONE MINI-BOSS #2: TWIN-TAIL ACID WYVERN-CONSTRUCT
  {
    id: 'f5_miniboss_acid_wyvern',
    archetypeId: 'acid_wyvern_construct',
    zone: 'f5_z5_nw_orbital',
    x: -33.0,
    y: F5_BASE_Y + 3.2,
    z: -25.8,
    yaw: Math.PI,
  },

  // =========================================================================
  // ZONE 6: NE WAR-COUNCIL COMMAND (x in [+18, +48], z in [-32, -10])
  // Strictly clear of Sealed Vault [x >= 38.0, z <= -16.6] & Briefing Table [24.5..30.7, -25.6..-22.0]
  // =========================================================================
  {
    id: 'f5_hoplite_cmd_entry',
    archetypeId: 'plasma_spear_hoplite',
    zone: 'f5_z6_ne_command',
    x: 22.4,
    y: F5_BASE_Y,
    z: -14.6,
    yaw: Math.PI,
    patrolPoints: [
      { x: 22.0, z: -14.2 },
      { x: 31.0, z: -16.2 },
    ],
  },
  {
    id: 'f5_brute_cmd_north',
    archetypeId: 'shield_chariot_brute',
    zone: 'f5_z6_ne_command',
    x: 34.2,
    y: F5_BASE_Y,
    z: -27.5,
    yaw: Math.PI * 0.75,
    patrolPoints: [
      { x: 34.2, z: -28.0 },
      { x: 34.2, z: -20.5 },
    ],
  },
  {
    id: 'f5_netshooter_cmd_gallery',
    archetypeId: 'arena_net_shooter',
    zone: 'f5_z6_ne_command',
    x: 34.8,
    y: F5_UPPER_Y,
    z: -12.8,
    yaw: 0,
  },

  // =========================================================================
  // ZONE 7: SW THERMAL REACTOR GALLERY (x in [-48, -18], z in [+10, +32])
  // Clear of 3 Thermal Turbines at (-36.5/-30.5/-24.5, 24.2) & barricades (-38.6/-24.0, 18.8)
  // =========================================================================
  {
    id: 'f5_stalker_reactor_flank',
    archetypeId: 'leaping_carapace_stalker',
    zone: 'f5_z7_sw_reactor',
    x: -22.2,
    y: F5_BASE_Y,
    z: 14.8,
    yaw: 0,
    patrolPoints: [
      { x: -22.0, z: 14.5 },
      { x: -22.0, z: 20.5 },
    ],
  },
  {
    id: 'f5_netshooter_reactor_overlook',
    archetypeId: 'arena_net_shooter',
    zone: 'f5_z7_sw_reactor',
    x: -25.5,
    y: F5_UPPER_Y,
    z: 13.0,
    yaw: Math.PI,
  },
  // ZONE MINI-BOSS #1: DUAL-CLEAVER EXECUTIONER
  {
    id: 'f5_miniboss_executioner',
    archetypeId: 'dual_cleaver_executioner',
    zone: 'f5_z7_sw_reactor',
    x: -30.5,
    y: F5_BASE_Y,
    z: 17.8,
    yaw: 0,
    patrolPoints: [
      { x: -34.0, z: 17.8 },
      { x: -27.0, z: 17.8 },
    ],
  },

  // =========================================================================
  // ZONE 8: SE HEAVY ORDNANCE DEPOT (x in [+18, +48], z in [+10, +32])
  // Clear of ContainerWest [26.85..29.95, 21.0..27.8] & ContainerEast [36.05..39.15, 16.6..23.4]
  // =========================================================================
  {
    id: 'f5_hoplite_ordnance_west',
    archetypeId: 'plasma_spear_hoplite',
    zone: 'f5_z8_se_ordnance',
    x: 22.8,
    y: F5_BASE_Y,
    z: 16.5,
    yaw: 0,
    patrolPoints: [
      { x: 22.8, z: 14.0 },
      { x: 22.8, z: 20.5 },
    ],
  },
  {
    id: 'f5_brute_ordnance_south',
    archetypeId: 'shield_chariot_brute',
    zone: 'f5_z8_se_ordnance',
    x: 33.4,
    y: F5_BASE_Y,
    z: 27.6,
    yaw: 0,
    patrolPoints: [
      { x: 32.5, z: 27.6 },
      { x: 40.5, z: 27.6 },
    ],
  },
];

/**
 * FLOOR 05 BOSS: APEX ARENA MARAUDER
 * Deploys into the Sunken Holographic War-Pit Coliseum (0.0, 53.4, 5.4) facing North (yaw: 0)
 * — 100% clear of the central Holo War-Table [-2.35..2.35] — once both Zone Mini-Bosses fall!
 */
export const FLOOR05_BOSS_SPAWN: EnemySpawnSpec = {
  id: 'f5_boss_apex_marauder',
  archetypeId: 'apex_arena_marauder_boss',
  zone: 'f5_z2_coliseum',
  x: 0.0,
  y: F5_PIT_Y,
  z: 5.4,
  yaw: 0,
};

export function createInitialFloor05Progression(): Floor05ProgressionState {
  let totalNormal = 0;
  let totalMiniBosses = 0;
  for (const s of FLOOR05_INITIAL_SPAWNS) {
    if (
      s.archetypeId === 'dual_cleaver_executioner' ||
      s.archetypeId === 'acid_wyvern_construct'
    ) {
      totalMiniBosses += 1;
    } else {
      totalNormal += 1;
    }
  }
  return {
    liveCombatActive: false,
    totalNormal,
    remainingNormal: totalNormal,
    totalMiniBosses,
    remainingMiniBosses: totalMiniBosses,
    bossSpawned: false,
    bossDefeated: false,
    floorCleared: false,
  };
}

export interface Floor05ProgressionEvalInput {
  liveCombatActive: boolean;
  aliveNormal: number;
  aliveMiniBosses: number;
  bossSpawned: boolean;
  bossAlive: boolean;
}

export interface Floor05ProgressionEvalResult {
  next: Floor05ProgressionState;
  shouldSpawnBoss: boolean;
  justClearedFloor: boolean;
}

export function evaluateFloor05Progression(
  prev: Floor05ProgressionState,
  input: Floor05ProgressionEvalInput
): Floor05ProgressionEvalResult {
  const shouldSpawnBoss =
    input.liveCombatActive &&
    !prev.bossSpawned &&
    !input.bossSpawned &&
    input.aliveMiniBosses === 0;

  const bossSpawnedNow = prev.bossSpawned || input.bossSpawned || shouldSpawnBoss;
  const bossDefeatedNow =
    prev.bossDefeated || (bossSpawnedNow && !shouldSpawnBoss && !input.bossAlive);

  // Strict all-enemies-vanquished Floor 05 clear law: every normal, mini-boss, AND APEX ARENA MARAUDER must fall!
  const floorClearedNow =
    input.liveCombatActive &&
    bossDefeatedNow &&
    input.aliveNormal === 0 &&
    input.aliveMiniBosses === 0;

  const next: Floor05ProgressionState = {
    liveCombatActive: input.liveCombatActive,
    totalNormal: prev.totalNormal,
    remainingNormal: input.aliveNormal,
    totalMiniBosses: prev.totalMiniBosses,
    remainingMiniBosses: input.aliveMiniBosses,
    bossSpawned: bossSpawnedNow,
    bossDefeated: bossDefeatedNow,
    floorCleared: floorClearedNow,
  };

  return {
    next,
    shouldSpawnBoss,
    justClearedFloor: !prev.floorCleared && floorClearedNow,
  };
}

export function getFloor05RemainingHostilesTotal(state: Floor05ProgressionState): number {
  const bossRemaining = state.bossDefeated ? 0 : 1;
  return state.remainingNormal + state.remainingMiniBosses + bossRemaining;
}

export function canUseFloor05ControlCenter(state: Floor05ProgressionState): {
  allowed: boolean;
  reason: string | null;
} {
  if (!state.liveCombatActive) {
    return {
      allowed: false,
      reason: 'FLOOR 05 ENCOUNTER NOT YET ENGAGED',
    };
  }
  const rem = getFloor05RemainingHostilesTotal(state);
  if (!state.floorCleared || rem > 0) {
    return {
      allowed: false,
      reason: `ALL ENEMIES MUST BE VANQUISHED FIRST (${rem} REMAINING)`,
    };
  }
  return { allowed: true, reason: null };
}
