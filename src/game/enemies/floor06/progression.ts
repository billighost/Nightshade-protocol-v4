import {
  F6_BASE_Y,
  F6_TRENCH_Y,
  F6_UPPER_Y,
} from '../../arena/hideout/floors/floor06/layout';
import type { EnemySpawnSpec } from '../core/types';

export interface Floor06ProgressionState {
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
 * FLOOR 06: OBSIDIAN MONOLITH ARCHIVE & BALLISTIC LABS (Y = 70.0m, Trench = 67.6m, Upper = 74.4m)
 * Faction: Paranatural Brutalist Constructs (Control / Returnal / Destiny Vex)
 *
 * 23 Initial Hostiles + 1 Floor Boss (THE MONOLITH ARCHON) = 24 Total Hostiles!
 * Bigger, deadlier, and more vertical than Floor 07 (21 hostiles):
 * - 6 × Astral Shard Levitator (3D hovering geometric crystal constructs over Trench, Foundry, Labs, Grav-Core, Cryo Vault)
 * - 5 × Monolith Claymore Knight (Heavy obsidian slab melee/shockwave vanguards across Cathedral, Foundry, Bunker, Cryo Vault)
 * - 5 × Resonant Beam Prism (Elevated gallery & catwalk laser-sniping spires across Upper Galleries, Overlook, Labs & Foundry)
 * - 5 × Phase-Blink Warden (Aggressive phase-blinking flankers patrolling Promenades, Labs, Foundry & Grav-Core)
 * - 1 × Archive Reality-Weaver (Zone Mini-Boss #1 — Zone 6 NE Grav-Core Chamber)
 * - 1 × Bunker Gravity-Hound (Zone Mini-Boss #2 — Zone 5 SW Armory Bunker open staging bay, x > -35.0!)
 * - 1 × THE MONOLITH ARCHON (Floor 06 Boss — deploys into Zone 2 Monolith Cathedral center once both Mini-Bosses fall)
 *
 * NOTE: South Arrival spawn at (0, 70.0, 14.0) stays completely clear so the player has clean sightlines on arrival.
 * NOTE: Zone 5 SW Armored Vault behind x = -35.0 is sealed behind a shootable lock, so ZERO required hostiles spawn at x < -34.2!
 */
export const FLOOR06_INITIAL_SPAWNS: readonly EnemySpawnSpec[] = [
  // =========================================================================
  // ZONE 2: MONOLITH CATHEDRAL (Central Hub — Trench Y=67.6, Base Y=70.0, Upper Y=74.4)
  // =========================================================================
  {
    id: 'f6_knight_cath_west',
    archetypeId: 'monolith_claymore_knight',
    zone: 'f6_z2_cathedral',
    x: -4.6,
    y: F6_BASE_Y,
    z: 2.2,
    yaw: Math.PI,
    patrolPoints: [
      { x: -4.6, z: 4.5 },
      { x: -4.6, z: -1.5 },
    ],
  },
  {
    id: 'f6_warden_cath_east',
    archetypeId: 'phase_blink_warden',
    zone: 'f6_z2_cathedral',
    x: 4.6,
    y: F6_BASE_Y,
    z: -1.8,
    yaw: Math.PI,
    patrolPoints: [
      { x: 4.6, z: 1.5 },
      { x: 4.6, z: -6.2 },
    ],
  },
  {
    id: 'f6_knight_cath_trench',
    archetypeId: 'monolith_claymore_knight',
    zone: 'f6_z2_cathedral',
    x: -1.2,
    y: F6_TRENCH_Y,
    z: -5.2,
    yaw: Math.PI,
    patrolPoints: [
      { x: -2.0, z: -5.8 },
      { x: 2.0, z: -4.8 },
    ],
  },
  {
    id: 'f6_levitator_cath_south',
    archetypeId: 'astral_shard_levitator',
    zone: 'f6_z2_cathedral',
    x: -7.8,
    y: F6_BASE_Y + 3.2,
    z: -1.6,
    yaw: Math.PI * 0.85,
  },
  {
    id: 'f6_levitator_cath_north',
    archetypeId: 'astral_shard_levitator',
    zone: 'f6_z2_cathedral',
    x: 8.0,
    y: F6_BASE_Y + 3.4,
    z: -5.4,
    yaw: -Math.PI * 0.85,
  },
  // Elevated Cathedral Upper Galleries & North Overlook (Y = 74.4m)
  {
    id: 'f6_prism_cath_west_upper',
    archetypeId: 'resonant_beam_prism',
    zone: 'f6_z2_cathedral',
    x: -15.6,
    y: F6_UPPER_Y,
    z: 1.6,
    yaw: -Math.PI * 0.55,
  },
  {
    id: 'f6_prism_cath_east_upper',
    archetypeId: 'resonant_beam_prism',
    zone: 'f6_z2_cathedral',
    x: 15.6,
    y: F6_UPPER_Y,
    z: -4.6,
    yaw: Math.PI * 0.55,
  },
  {
    id: 'f6_prism_cath_overlook',
    archetypeId: 'resonant_beam_prism',
    zone: 'f6_z8_north_extraction',
    x: 0.0,
    y: F6_UPPER_Y,
    z: -12.0,
    yaw: Math.PI,
  },
  {
    id: 'f6_warden_cath_west_prom',
    archetypeId: 'phase_blink_warden',
    zone: 'f6_z2_cathedral',
    x: -15.4,
    y: F6_BASE_Y,
    z: 3.4,
    yaw: -Math.PI * 0.5,
    patrolPoints: [
      { x: -15.4, z: 5.5 },
      { x: -15.4, z: -4.5 },
    ],
  },

  // =========================================================================
  // ZONE 3: WEST BLACK-SITE LABS (x in [-44, -18], z in [-8, 14])
  // =========================================================================
  {
    id: 'f6_warden_labs_cleanroom',
    archetypeId: 'phase_blink_warden',
    zone: 'f6_z3_west_labs',
    x: -29.0,
    y: F6_BASE_Y,
    z: 2.4,
    yaw: -Math.PI * 0.5,
    patrolPoints: [
      { x: -29.0, z: 5.2 },
      { x: -29.0, z: -0.4 },
    ],
  },
  {
    id: 'f6_levitator_labs_air',
    archetypeId: 'astral_shard_levitator',
    zone: 'f6_z3_west_labs',
    x: -36.5,
    y: F6_BASE_Y + 3.2,
    z: 8.6,
    yaw: -Math.PI * 0.35,
  },
  {
    id: 'f6_prism_labs_catwalk',
    archetypeId: 'resonant_beam_prism',
    zone: 'f6_z3_west_labs',
    x: -40.8,
    y: F6_UPPER_Y,
    z: -1.8,
    yaw: -Math.PI * 0.45,
  },

  // =========================================================================
  // ZONE 4: EAST BALLISTIC FOUNDRY (x in [18, 44], z in [-8, 17])
  // =========================================================================
  {
    id: 'f6_knight_foundry_center',
    archetypeId: 'monolith_claymore_knight',
    zone: 'f6_z4_east_foundry',
    x: 31.0,
    y: F6_BASE_Y,
    z: 7.4,
    yaw: Math.PI * 0.5,
    patrolPoints: [
      { x: 24.5, z: 6.5 },
      { x: 36.5, z: 6.5 },
    ],
  },
  {
    id: 'f6_warden_foundry_south',
    archetypeId: 'phase_blink_warden',
    zone: 'f6_z4_east_foundry',
    x: 24.0,
    y: F6_BASE_Y,
    z: 12.2,
    yaw: Math.PI * 0.65,
    patrolPoints: [
      { x: 23.0, z: 12.5 },
      { x: 33.0, z: 13.5 },
    ],
  },
  {
    id: 'f6_levitator_foundry_air',
    archetypeId: 'astral_shard_levitator',
    zone: 'f6_z4_east_foundry',
    x: 31.0,
    y: F6_BASE_Y + 3.5,
    z: 1.0,
    yaw: Math.PI * 0.5,
  },
  {
    id: 'f6_prism_foundry_spine',
    archetypeId: 'resonant_beam_prism',
    zone: 'f6_z4_east_foundry',
    x: 41.0,
    y: F6_UPPER_Y,
    z: -0.6,
    yaw: Math.PI * 0.5,
  },

  // =========================================================================
  // ZONE 5: SW ARMORY BUNKER (Open Staging Bay: x in [-34.0, -19.0], z in [15.5, 26.5])
  // Strictly outside sealed Vault Gate at x = -35.0 and clear of container [-26.1..-19.9, 21.4..24.2]
  // =========================================================================
  {
    id: 'f6_knight_bunker_guard',
    archetypeId: 'monolith_claymore_knight',
    zone: 'f6_z5_sw_bunker',
    x: -24.5,
    y: F6_BASE_Y,
    z: 17.6,
    yaw: 0,
    patrolPoints: [
      { x: -22.5, z: 17.6 },
      { x: -29.5, z: 16.5 },
    ],
  },
  // ZONE MINI-BOSS #2: BUNKER GRAVITY-HOUND
  {
    id: 'f6_miniboss_bunker_hound',
    archetypeId: 'bunker_gravity_hound',
    zone: 'f6_z5_sw_bunker',
    x: -31.0,
    y: F6_BASE_Y,
    z: 22.8,
    yaw: -Math.PI * 0.25,
    patrolPoints: [
      { x: -31.4, z: 24.4 },
      { x: -27.5, z: 25.4 },
    ],
  },

  // =========================================================================
  // ZONE 6: NE GRAV-CORE CHAMBER (x in [18, 44], z in [-28, -8])
  // Clear of central grav-core pedestal at (31.0, -16.8) radius 2.45m
  // =========================================================================
  {
    id: 'f6_warden_gravcore_flank',
    archetypeId: 'phase_blink_warden',
    zone: 'f6_z6_ne_gravcore',
    x: 23.2,
    y: F6_BASE_Y,
    z: -16.8,
    yaw: Math.PI * 0.5,
    patrolPoints: [
      { x: 23.2, z: -12.5 },
      { x: 23.2, z: -21.2 },
    ],
  },
  {
    id: 'f6_levitator_gravcore_air',
    archetypeId: 'astral_shard_levitator',
    zone: 'f6_z6_ne_gravcore',
    x: 35.6,
    y: F6_BASE_Y + 3.6,
    z: -22.6,
    yaw: Math.PI * 0.75,
  },
  // ZONE MINI-BOSS #1: ARCHIVE REALITY-WEAVER
  {
    id: 'f6_miniboss_reality_weaver',
    archetypeId: 'archive_reality_weaver',
    zone: 'f6_z6_ne_gravcore',
    x: 31.0,
    y: F6_BASE_Y,
    z: -11.4,
    yaw: Math.PI,
    patrolPoints: [
      { x: 27.2, z: -11.4 },
      { x: 34.8, z: -11.4 },
    ],
  },

  // =========================================================================
  // ZONE 7: NW CRYO VAULT (x in [-44, -18], z in [-28, -8])
  // Clear of 4 cryo monoliths at (-34.2/-27.4, -13.6/-20.4) & barricade at (-30.8, -17.0)
  // =========================================================================
  {
    id: 'f6_knight_cryo_sanctum',
    archetypeId: 'monolith_claymore_knight',
    zone: 'f6_z7_nw_cryovault',
    x: -23.0,
    y: F6_BASE_Y,
    z: -16.8,
    yaw: Math.PI,
    patrolPoints: [
      { x: -22.5, z: -13.5 },
      { x: -22.5, z: -20.5 },
    ],
  },
  {
    id: 'f6_levitator_cryo_air',
    archetypeId: 'astral_shard_levitator',
    zone: 'f6_z7_nw_cryovault',
    x: -36.5,
    y: F6_BASE_Y + 3.4,
    z: -22.8,
    yaw: -Math.PI * 0.75,
  },
];

/**
 * FLOOR 06 BOSS: THE MONOLITH ARCHON
 * Deploys majestically above the Monolith Cathedral Central Cross-Island (0, 70.0, 0)
 * once both Zone Mini-Bosses (Archive Reality-Weaver & Bunker Gravity-Hound) are eliminated.
 */
export const FLOOR06_BOSS_SPAWN: EnemySpawnSpec = {
  id: 'f6_boss_monolith_archon',
  archetypeId: 'monolith_archon_boss',
  zone: 'f6_z2_cathedral',
  x: 0.0,
  y: F6_BASE_Y,
  z: 0.0,
  yaw: Math.PI,
};

export function createInitialFloor06Progression(): Floor06ProgressionState {
  let totalNormal = 0;
  let totalMiniBosses = 0;
  for (const s of FLOOR06_INITIAL_SPAWNS) {
    if (
      s.archetypeId === 'archive_reality_weaver' ||
      s.archetypeId === 'bunker_gravity_hound'
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

export interface Floor06ProgressionEvalInput {
  liveCombatActive: boolean;
  aliveNormal: number;
  aliveMiniBosses: number;
  bossSpawned: boolean;
  bossAlive: boolean;
}

export interface Floor06ProgressionEvalResult {
  next: Floor06ProgressionState;
  shouldSpawnBoss: boolean;
  justClearedFloor: boolean;
}

export function evaluateFloor06Progression(
  prev: Floor06ProgressionState,
  input: Floor06ProgressionEvalInput
): Floor06ProgressionEvalResult {
  const shouldSpawnBoss =
    input.liveCombatActive &&
    !prev.bossSpawned &&
    !input.bossSpawned &&
    input.aliveMiniBosses === 0;

  const bossSpawnedNow = prev.bossSpawned || input.bossSpawned || shouldSpawnBoss;
  const bossDefeatedNow =
    prev.bossDefeated || (bossSpawnedNow && !shouldSpawnBoss && !input.bossAlive);

  // Strict all-enemies-vanquished Floor 06 clear law: every normal, mini-boss, AND THE MONOLITH ARCHON must fall!
  const floorClearedNow =
    input.liveCombatActive &&
    bossDefeatedNow &&
    input.aliveNormal === 0 &&
    input.aliveMiniBosses === 0;

  const next: Floor06ProgressionState = {
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

export function getFloor06RemainingHostilesTotal(state: Floor06ProgressionState): number {
  const bossRemaining = state.bossDefeated ? 0 : 1;
  return state.remainingNormal + state.remainingMiniBosses + bossRemaining;
}

export function canUseFloor06ControlCenter(state: Floor06ProgressionState): {
  allowed: boolean;
  reason: string | null;
} {
  if (!state.liveCombatActive) {
    return {
      allowed: false,
      reason: 'FLOOR 06 ENCOUNTER NOT YET ENGAGED',
    };
  }
  const rem = getFloor06RemainingHostilesTotal(state);
  if (!state.floorCleared || rem > 0) {
    return {
      allowed: false,
      reason: `ALL ENEMIES MUST BE VANQUISHED FIRST (${rem} REMAINING)`,
    };
  }
  return { allowed: true, reason: null };
}
