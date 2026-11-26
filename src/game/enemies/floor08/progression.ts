import type { EnemySpawnSpec, Floor08EncounterHudState } from '../core/types';

export const FLOOR08_LIVE_ROSTER: readonly EnemySpawnSpec[] = [
  // --- Zone 4: Central Main Firing Hall (First Contact Vanguard) ---
  {
    id: 'f8_hall_breacher_w',
    archetypeId: 'breacher_cyborg',
    zone: 'zone4_main_hall',
    x: -7.8,
    y: 98.0,
    z: 18.2,
    yaw: Math.PI,
    patrolPoints: [
      { x: -7.8, z: 18.2 },
      { x: -3.8, z: 18.2 },
    ],
  },
  {
    id: 'f8_hall_breacher_e',
    archetypeId: 'breacher_cyborg',
    zone: 'zone4_main_hall',
    x: 7.8,
    y: 98.0,
    z: 18.2,
    yaw: Math.PI,
    patrolPoints: [
      { x: 7.8, z: 18.2 },
      { x: 3.8, z: 18.2 },
    ],
  },
  {
    id: 'f8_hall_strider',
    archetypeId: 'razor_strider',
    zone: 'zone4_main_hall',
    x: 0.0,
    y: 98.0,
    z: 15.8,
    yaw: Math.PI,
    patrolPoints: [
      { x: -3.2, z: 16.0 },
      { x: 3.2, z: 16.0 },
    ],
  },
  {
    id: 'f8_hall_aegis',
    archetypeId: 'aegis_riot_trooper',
    zone: 'zone4_main_hall',
    x: 0.0,
    y: 98.0,
    z: 6.2,
    yaw: Math.PI,
    patrolPoints: [
      { x: -3.5, z: 6.2 },
      { x: 3.5, z: 6.2 },
    ],
  },

  // --- Zone 3: West Wing CQB Killhouse ("Shoot House 08") ---
  {
    id: 'f8_killhouse_breacher',
    archetypeId: 'breacher_cyborg',
    zone: 'zone3_killhouse',
    x: -21.5,
    y: 98.0,
    z: 27.5,
    yaw: Math.PI,
    patrolPoints: [
      { x: -21.5, z: 27.5 },
      { x: -25.5, z: 27.5 },
    ],
  },
  {
    id: 'f8_killhouse_strider',
    archetypeId: 'razor_strider',
    zone: 'zone3_killhouse',
    x: -22.2,
    y: 98.0,
    z: 10.5,
    yaw: 0,
    patrolPoints: [
      { x: -22.2, z: 10.5 },
      { x: -22.2, z: 18.0 },
    ],
  },
  {
    id: 'f8_miniboss_warden',
    archetypeId: 'killhouse_warden',
    zone: 'zone3_killhouse',
    x: -25.8,
    y: 98.0,
    z: 20.5,
    yaw: Math.PI,
    patrolPoints: [
      { x: -25.8, z: 20.5 },
      { x: -25.8, z: 8.8 },
    ],
  },

  // --- Zone 2: East Wing Tactical Armory & Ordnance Vault ---
  {
    id: 'f8_armory_breacher',
    archetypeId: 'breacher_cyborg',
    zone: 'zone2_armory',
    x: 21.8,
    y: 98.0,
    z: 29.0,
    yaw: Math.PI,
    patrolPoints: [
      { x: 21.8, z: 29.0 },
      { x: 24.5, z: 24.5 },
    ],
  },
  {
    id: 'f8_armory_aegis',
    archetypeId: 'aegis_riot_trooper',
    zone: 'zone2_armory',
    x: 21.5,
    y: 98.0,
    z: 21.0,
    yaw: Math.PI,
    patrolPoints: [
      { x: 21.5, z: 21.0 },
      { x: 21.5, z: 16.5 },
    ],
  },
  {
    id: 'f8_miniboss_pyro',
    archetypeId: 'ordnance_pyro_tech',
    zone: 'zone2_armory',
    x: 22.2,
    y: 98.0,
    z: 12.5,
    yaw: Math.PI,
    patrolPoints: [
      { x: 22.2, z: 12.5 },
      { x: 22.2, z: 19.0 },
    ],
  },

  // --- Zone 5: North Security Atrium Guard ---
  {
    id: 'f8_atrium_breacher',
    archetypeId: 'breacher_cyborg',
    zone: 'zone5_atrium',
    x: -8.5,
    y: 98.0,
    z: -10.5,
    yaw: Math.PI,
    patrolPoints: [
      { x: -8.5, z: -10.5 },
      { x: -3.5, z: -10.5 },
    ],
  },
  {
    id: 'f8_atrium_strider',
    archetypeId: 'razor_strider',
    zone: 'zone5_atrium',
    x: 8.5,
    y: 98.0,
    z: -10.5,
    yaw: Math.PI,
    patrolPoints: [
      { x: 8.5, z: -10.5 },
      { x: 3.5, z: -10.5 },
    ],
  },
];

export const FLOOR08_BOSS_SPAWN: EnemySpawnSpec = {
  id: 'f8_boss_kestrel',
  archetypeId: 'commander_kestrel',
  zone: 'zone4_main_hall',
  x: 0.0,
  y: 98.0,
  z: 14.5,
  yaw: Math.PI,
  patrolPoints: [{ x: 0.0, z: 14.5 }],
};

export interface Floor08ProgressionState {
  liveCombatActive: boolean;
  totalNormal: number;
  remainingNormal: number;
  totalMiniBosses: number;
  remainingMiniBosses: number;
  bossSpawned: boolean;
  bossDefeated: boolean;
  floorCleared: boolean;
}

export function createInitialFloor08Progression(): Floor08ProgressionState {
  return {
    liveCombatActive: false,
    totalNormal: 0,
    remainingNormal: 0,
    totalMiniBosses: 0,
    remainingMiniBosses: 0,
    bossSpawned: false,
    bossDefeated: false,
    floorCleared: false,
  };
}

/**
 * Pure progression evaluator: counts remaining normal & mini-boss units and determines
 * the exact moment Floor 08's Main-Hall Boss (Commander Kestrel-08) should deploy!
 */
export function evaluateFloor08Progression(
  state: Floor08ProgressionState,
  enemies: ReadonlyArray<{ tier: 'normal' | 'miniboss' | 'boss'; alive: boolean }>
): { shouldSpawnBoss: boolean; justClearedFloor: boolean } {
  if (!state.liveCombatActive) {
    return { shouldSpawnBoss: false, justClearedFloor: false };
  }

  let totalNormal = 0;
  let remainingNormal = 0;
  let totalMiniBosses = 0;
  let remainingMiniBosses = 0;
  let bossAlive = false;
  let bossPresent = false;

  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.tier === 'normal') {
      totalNormal += 1;
      if (e.alive) remainingNormal += 1;
    } else if (e.tier === 'miniboss') {
      totalMiniBosses += 1;
      if (e.alive) remainingMiniBosses += 1;
    } else if (e.tier === 'boss') {
      bossPresent = true;
      if (e.alive) bossAlive = true;
    }
  }

  state.totalNormal = totalNormal;
  state.remainingNormal = remainingNormal;
  state.totalMiniBosses = totalMiniBosses;
  state.remainingMiniBosses = remainingMiniBosses;

  // Trigger Floor 08 Main-Hall Boss as soon as BOTH Zone Mini-Bosses are neutralized!
  const shouldSpawnBoss = !state.bossSpawned && totalMiniBosses > 0 && remainingMiniBosses === 0;

  if (state.bossSpawned && bossPresent && !bossAlive && !state.bossDefeated) {
    state.bossDefeated = true;
  }

  // Floor 08 is ONLY cleared when EVERY SINGLE ENEMY (all normal guards, both mini-bosses, AND Kestrel-08) is vanquished!
  let justClearedFloor = false;
  if (
    state.bossSpawned &&
    state.bossDefeated &&
    remainingNormal === 0 &&
    remainingMiniBosses === 0 &&
    !state.floorCleared
  ) {
    state.floorCleared = true;
    justClearedFloor = true;
  }

  return { shouldSpawnBoss, justClearedFloor };
}

export function getRemainingHostilesTotal(state: Floor08ProgressionState): number {
  if (!state.liveCombatActive) return 0;
  const bossRemaining = state.bossDefeated ? 0 : 1;
  return state.remainingNormal + state.remainingMiniBosses + bossRemaining;
}

export interface ControlCenterGateStatus {
  allowed: boolean;
  remainingHostiles: number;
  reason: string | null;
}

/**
 * Pure Floor Control Center lockout rule:
 * On Floor 08, the Control Center is strictly disabled until ALL hostiles (normal troops,
 * both zone mini-bosses, and Commander Kestrel-08) have been vanquished!
 */
export function canUseFloorControlCenter(
  floorNumber: number,
  tutorialActive: boolean,
  progression: Floor08ProgressionState
): ControlCenterGateStatus {
  if (floorNumber !== 8) {
    return { allowed: true, remainingHostiles: 0, reason: null };
  }
  if (tutorialActive) {
    return {
      allowed: false,
      remainingHostiles: FLOOR08_LIVE_ROSTER.length + 1,
      reason: 'CONTROL CENTER LOCKED · COMPLETE TRAINING & VANQUISH ALL ENEMIES FIRST',
    };
  }
  if (progression.liveCombatActive && !progression.floorCleared) {
    const rem = getRemainingHostilesTotal(progression);
    return {
      allowed: false,
      remainingHostiles: rem,
      reason: `ALL ENEMIES MUST BE VANQUISHED FIRST (${rem} REMAINING)`,
    };
  }
  return { allowed: true, remainingHostiles: 0, reason: null };
}

export function buildFloor08EncounterHudState(
  state: Floor08ProgressionState,
  activeBossHud: Floor08EncounterHudState['activeBossHud'],
  weakpointIntel: Floor08EncounterHudState['weakpointIntel']
): Floor08EncounterHudState {
  return {
    liveCombatActive: state.liveCombatActive,
    remainingNormal: state.remainingNormal,
    totalNormal: state.totalNormal,
    remainingMiniBosses: state.remainingMiniBosses,
    totalMiniBosses: state.totalMiniBosses,
    bossSpawned: state.bossSpawned,
    bossDefeated: state.bossDefeated,
    floorCleared: state.floorCleared,
    activeBossHud,
    weakpointIntel,
  };
}
