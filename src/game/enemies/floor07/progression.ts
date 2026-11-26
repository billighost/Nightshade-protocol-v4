import { F7_BASE_Y, F7_UPPER_Y } from '../../arena/hideout/floors/floor07/layout';
import type { EnemyCombatState, EnemySpawnSpec } from '../core/types';

/**
 * Full Floor 07 Combat Roster (20 initial hostiles + 1 Floor Boss = 21 total hostiles):
 * - 6 Exo-Carbine Troopers (Rotunda W/E, West Barracks, SW Cargo, East Servers, SE Turbines)
 * - 4 Grapple-Lance Duelists (Rotunda South, West Barracks CQB, SW Cargo Lane, East Server Flank)
 * - 4 Mortar-Pod Bombardiers (Elevated! Rotunda Skybridge, West Catwalk, East Balcony, SE Turbine Balcony)
 * - 4 Valkyrie Hover-Drones (Aerial! 2x Rotunda Abyss, 1x East Server Atrium, 1x SW Cargo Vault)
 * - 2 Zone Mini-Bosses:
 *     - Zone 6 SE Turbines: TURBINE JUGGERNAUT "VOLT-VII"
 *     - Zone 3 West Barracks: VAULT STALKER "PHANTOM-VII"
 * - 1 Floor 07 Boss (deploys into the Central Spiral Rotunda once both Zone Mini-Bosses fall!):
 *     - TITAN-RIG "BASTION-VII"
 */
export const FLOOR07_LIVE_ROSTER: EnemySpawnSpec[] = [
  // === ZONE 2 · CENTRAL SPIRAL WELL ROTUNDA (6 normals: ground, skybridge & aerial) ===
  {
    id: 'f7_exo_rotunda_w',
    archetypeId: 'exo_carbine_trooper',
    zone: 'f7_z2_rotunda',
    x: -10.5,
    y: F7_BASE_Y,
    z: -4.5,
    yaw: 0.45,
    patrolPoints: [
      { x: -10.5, z: -4.5 },
      { x: -11.2, z: 4.2 },
    ],
  },
  {
    id: 'f7_exo_rotunda_e',
    archetypeId: 'exo_carbine_trooper',
    zone: 'f7_z2_rotunda',
    x: 10.5,
    y: F7_BASE_Y,
    z: -4.5,
    yaw: -0.45,
    patrolPoints: [
      { x: 10.5, z: -4.5 },
      { x: 11.2, z: 4.2 },
    ],
  },
  {
    id: 'f7_duelist_rotunda_s',
    archetypeId: 'grapple_lance_duelist',
    zone: 'f7_z2_rotunda',
    x: -8.5,
    y: F7_BASE_Y,
    z: 8.8,
    yaw: 0.25,
    patrolPoints: [
      { x: -8.5, z: 8.8 },
      { x: 8.2, z: 8.8 },
    ],
  },
  {
    id: 'f7_mortar_skybridge',
    archetypeId: 'mortar_pod_bombardier',
    zone: 'f7_z2_rotunda',
    x: 2.6,
    y: F7_UPPER_Y,
    z: 13.0,
    yaw: 0,
    patrolPoints: [
      { x: 1.8, z: 13.0 },
      { x: 4.4, z: 13.0 },
    ],
  },
  {
    id: 'f7_drone_rotunda_nw',
    archetypeId: 'valkyrie_hover_drone',
    zone: 'f7_z2_rotunda',
    x: -6.8,
    y: F7_UPPER_Y + 0.4,
    z: -2.2,
    yaw: 0.5,
  },
  {
    id: 'f7_drone_rotunda_se',
    archetypeId: 'valkyrie_hover_drone',
    zone: 'f7_z2_rotunda',
    x: 6.8,
    y: F7_UPPER_Y + 1.1,
    z: 4.5,
    yaw: -0.5,
  },

  // === ZONE 3 · WEST BARRACKS & ORDNANCE VAULT APPROACH (3 normals + Zone Mini-Boss #2) ===
  {
    id: 'f7_exo_barracks_n',
    archetypeId: 'exo_carbine_trooper',
    zone: 'f7_z3_west_barracks',
    x: -24.2,
    y: F7_BASE_Y,
    z: -13.2,
    yaw: -Math.PI * 0.4,
    patrolPoints: [
      { x: -24.2, z: -13.2 },
      { x: -28.5, z: -7.2 },
    ],
  },
  {
    id: 'f7_duelist_barracks_cqb',
    archetypeId: 'grapple_lance_duelist',
    zone: 'f7_z3_west_barracks',
    x: -28.0,
    y: F7_BASE_Y,
    z: 5.2,
    yaw: -Math.PI * 0.5,
    patrolPoints: [
      { x: -28.0, z: 5.2 },
      { x: -24.5, z: -4.2 },
    ],
  },
  {
    id: 'f7_mortar_west_catwalk',
    archetypeId: 'mortar_pod_bombardier',
    zone: 'f7_z3_west_barracks',
    x: -19.5,
    y: F7_UPPER_Y,
    z: -3.5,
    yaw: Math.PI * 0.5,
    patrolPoints: [
      { x: -19.5, z: -6.5 },
      { x: -19.5, z: 3.5 },
    ],
  },
  {
    id: 'f7_miniboss_stalker',
    archetypeId: 'vault_stalker_sniper',
    zone: 'f7_z3_west_barracks',
    x: -28.5,
    y: F7_BASE_Y,
    z: -14.2,
    yaw: -Math.PI * 0.38,
    patrolPoints: [
      { x: -28.5, z: -14.2 },
      { x: -25.2, z: -5.8 },
      { x: -30.0, z: -8.5 },
    ],
  },

  // === ZONE 5 · SOUTH-WEST CARGO BAY (3 normals) ===
  {
    id: 'f7_exo_cargo_deck',
    archetypeId: 'exo_carbine_trooper',
    zone: 'f7_z5_sw_cargo',
    x: -27.2,
    y: F7_BASE_Y,
    z: 18.2,
    yaw: 0,
    patrolPoints: [
      { x: -27.2, z: 18.2 },
      { x: -35.5, z: 18.2 },
    ],
  },
  {
    id: 'f7_duelist_cargo_lane',
    archetypeId: 'grapple_lance_duelist',
    zone: 'f7_z5_sw_cargo',
    x: -29.2,
    y: F7_BASE_Y,
    z: 29.2,
    yaw: 0.15,
    patrolPoints: [
      { x: -29.2, z: 29.2 },
      { x: -25.5, z: 18.5 },
    ],
  },
  {
    id: 'f7_drone_cargo_bay',
    archetypeId: 'valkyrie_hover_drone',
    zone: 'f7_z5_sw_cargo',
    x: -29.5,
    y: F7_UPPER_Y + 0.8,
    z: 20.5,
    yaw: 0,
  },

  // === ZONE 4 · EAST CYBER-SERVER ATRIUM (4 normals) ===
  {
    id: 'f7_exo_servers_aisle',
    archetypeId: 'exo_carbine_trooper',
    zone: 'f7_z4_east_servers',
    x: 28.8,
    y: F7_BASE_Y,
    z: -7.2,
    yaw: Math.PI * 0.5,
    patrolPoints: [
      { x: 28.8, z: -7.2 },
      { x: 28.8, z: 3.0 },
    ],
  },
  {
    id: 'f7_duelist_servers_flank',
    archetypeId: 'grapple_lance_duelist',
    zone: 'f7_z4_east_servers',
    x: 37.5,
    y: F7_BASE_Y,
    z: -1.5,
    yaw: Math.PI * 0.5,
    patrolPoints: [
      { x: 37.5, z: -1.5 },
      { x: 28.8, z: 2.8 },
    ],
  },
  {
    id: 'f7_mortar_east_balcony',
    archetypeId: 'mortar_pod_bombardier',
    zone: 'f7_z4_east_servers',
    x: 31.5,
    y: F7_UPPER_Y,
    z: -17.0,
    yaw: Math.PI,
    patrolPoints: [
      { x: 27.5, z: -17.0 },
      { x: 35.5, z: -17.0 },
    ],
  },
  {
    id: 'f7_drone_servers_atrium',
    archetypeId: 'valkyrie_hover_drone',
    zone: 'f7_z4_east_servers',
    x: 29.0,
    y: F7_UPPER_Y + 0.6,
    z: -2.5,
    yaw: Math.PI * 0.5,
  },

  // === ZONE 6 · SOUTH-EAST COOLANT TURBINE GALLERY (2 normals + Zone Mini-Boss #1) ===
  {
    id: 'f7_exo_turbines_flank',
    archetypeId: 'exo_carbine_trooper',
    zone: 'f7_z6_se_turbines',
    x: 21.5,
    y: F7_BASE_Y,
    z: 15.2,
    yaw: Math.PI * 0.45,
    patrolPoints: [
      { x: 21.5, z: 15.2 },
      { x: 35.0, z: 15.2 },
    ],
  },
  {
    id: 'f7_mortar_turbine_balcony',
    archetypeId: 'mortar_pod_bombardier',
    zone: 'f7_z6_se_turbines',
    x: 36.5,
    y: F7_UPPER_Y,
    z: 13.2,
    yaw: Math.PI * 0.65,
    patrolPoints: [
      { x: 34.5, z: 13.2 },
      { x: 39.2, z: 13.2 },
    ],
  },
  {
    id: 'f7_miniboss_juggernaut',
    archetypeId: 'turbine_juggernaut',
    zone: 'f7_z6_se_turbines',
    x: 28.4,
    y: F7_BASE_Y,
    z: 19.2,
    yaw: Math.PI * 0.5,
    patrolPoints: [
      { x: 28.4, z: 19.2 },
      { x: 22.5, z: 19.2 },
      { x: 34.5, z: 19.2 },
    ],
  },
];

/** Floor 07 Boss deploys into the Central Spiral Rotunda once both Zone Mini-Bosses are eliminated! */
export const FLOOR07_BOSS_SPAWN: EnemySpawnSpec = {
  id: 'f7_boss_bastion',
  archetypeId: 'bastion_seven_boss',
  zone: 'f7_z2_rotunda',
  x: 0.0,
  y: F7_BASE_Y,
  z: 9.4,
  yaw: 0,
  patrolPoints: [
    { x: 0.0, z: 9.4 },
    { x: -8.6, z: 6.4 },
    { x: 8.6, z: 6.4 },
  ],
};

export interface Floor07ProgressionState {
  liveCombatActive: boolean;
  totalNormal: number;
  remainingNormal: number;
  totalMiniBosses: number;
  remainingMiniBosses: number;
  bossSpawned: boolean;
  bossDefeated: boolean;
  floorCleared: boolean;
}

export function createInitialFloor07Progression(): Floor07ProgressionState {
  const totalNormal = FLOOR07_LIVE_ROSTER.filter(
    (s) => s.archetypeId !== 'turbine_juggernaut' && s.archetypeId !== 'vault_stalker_sniper'
  ).length;
  const totalMiniBosses = FLOOR07_LIVE_ROSTER.length - totalNormal;
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

export interface Floor07ProgressionResult {
  next: Floor07ProgressionState;
  shouldSpawnBoss: boolean;
  justClearedFloor: boolean;
}

/**
 * Pure deterministic Floor 07 progression evaluator:
 * - Counts remaining normals and both Zone Mini-Bosses
 * - Spawns TITAN-RIG "BASTION-VII" in the Spiral Rotunda when BOTH Zone Mini-Bosses are eliminated
 * - Marks Floor 07 cleared ONLY when EVERY normal, BOTH Zone Mini-Bosses, AND Bastion-VII are vanquished!
 */
export function evaluateFloor07Progression(
  prev: Floor07ProgressionState,
  enemies: ReadonlyArray<Pick<EnemyCombatState, 'id' | 'tier' | 'alive'>>
): Floor07ProgressionResult {
  if (!prev.liveCombatActive) {
    return { next: prev, shouldSpawnBoss: false, justClearedFloor: false };
  }

  let remainingNormal = 0;
  let remainingMiniBosses = 0;
  let bossAlive = false;
  let bossPresent = false;

  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.tier === 'normal' && e.alive) remainingNormal += 1;
    else if (e.tier === 'miniboss' && e.alive) remainingMiniBosses += 1;
    else if (e.tier === 'boss') {
      bossPresent = true;
      if (e.alive) bossAlive = true;
    }
  }

  const shouldSpawnBoss = !prev.bossSpawned && remainingMiniBosses === 0;
  const bossSpawned = prev.bossSpawned || shouldSpawnBoss || bossPresent;
  const bossDefeated = bossPresent ? !bossAlive : prev.bossDefeated;
  const floorCleared =
    bossSpawned && bossDefeated && remainingNormal === 0 && remainingMiniBosses === 0;
  const justClearedFloor = !prev.floorCleared && floorCleared;

  return {
    next: {
      ...prev,
      remainingNormal,
      remainingMiniBosses,
      bossSpawned,
      bossDefeated,
      floorCleared,
    },
    shouldSpawnBoss,
    justClearedFloor,
  };
}

export function getFloor07RemainingHostilesTotal(prog: Floor07ProgressionState): number {
  const bossRemaining = prog.bossDefeated ? 0 : 1;
  return prog.remainingNormal + prog.remainingMiniBosses + bossRemaining;
}

/**
 * Strict Control Center lockout gating for Floor 07:
 * Control Center remains strictly DISABLED until ALL 21 Floor 07 hostiles (normals + both Mini-Bosses + Bastion-VII) are vanquished!
 */
export function canUseFloor07ControlCenter(
  progression: Floor07ProgressionState
): { allowed: boolean; reason: string | null } {
  if (!progression.liveCombatActive) {
    return {
      allowed: false,
      reason: 'ALL ENEMIES MUST BE VANQUISHED FIRST',
    };
  }
  if (!progression.floorCleared) {
    const remaining = getFloor07RemainingHostilesTotal(progression);
    return {
      allowed: false,
      reason:
        remaining > 0
          ? `ALL ENEMIES MUST BE VANQUISHED FIRST (${remaining} REMAINING)`
          : 'ALL ENEMIES MUST BE VANQUISHED FIRST',
    };
  }
  return { allowed: true, reason: null };
}
