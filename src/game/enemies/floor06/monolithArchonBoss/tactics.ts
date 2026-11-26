export type ArchonBossAction =
  | 'dual_archon_rail_sweep'
  | 'cataclysm_gravity_slam'
  | 'seraphic_scythe_cleave'
  | 'meteor_shard_barrage'
  | 'astral_fan_judgment'
  | 'phase_blink_reposition'
  | 'orbital_judgment_barrage'
  | 'sovereign_lance_barrage';

export interface ArchonBossTacticsInput {
  horizDist: number;
  hasLos: boolean;
  phase: 1 | 2;
  timeWithoutLos: number;
  slamCooldown: number;
  railCooldown: number;
  meteorCooldown: number;
  fanCooldown: number;
  blinkCooldown: number;
  scytheCooldown?: number;
  supernovaCooldown?: number;
  roll: number;
}

/**
 * Pure tactical combat planner for Floor 06 Final Boss — THE MONOLITH ARCHON.
 * Orchestrates 8 distinct Phase 1 & Phase 2 sovereign combat maneuvers:
 * - Close-range pressure: Cataclysm Gravity Slam + Twin Hard-Light Seraphic Scythe Cleave
 * - Anti-cover / LoS denial: Celestial Monolith Meteor Rain + Phase-Blink Flanking Ambush
 * - Phase 2 Apex Ultimate: Cathedral Solar-Astral Supernova Cascade (`orbital_judgment_barrage`)
 * - Mid/Long-range pressure: Scissor Convergence Rail-Sweep, Dual-Wave Astral Fan Judgment, & Sovereign Lance Storm
 */
export function selectArchonBossAction(input: ArchonBossTacticsInput): ArchonBossAction {
  const scytheCd = input.scytheCooldown ?? 99;
  const supernovaCd = input.supernovaCooldown ?? 99;

  // 1. Close-quarters punishment: alternate Cataclysm Gravity Slam and Seraphic Hard-Light Scythe Cleave
  if (input.horizDist <= 7.2) {
    if (input.slamCooldown <= 0 && (scytheCd > 0 || input.roll < 0.56)) {
      return 'cataclysm_gravity_slam';
    }
    if (scytheCd <= 0) {
      return 'seraphic_scythe_cleave';
    }
    if (input.slamCooldown <= 0) {
      return 'cataclysm_gravity_slam';
    }
  }

  // 2. Phase 2 Signature Ultimate — Cathedral Solar-Astral Supernova Cascade!
  if (input.phase === 2 && supernovaCd <= 0 && input.roll < 0.34) {
    return 'orbital_judgment_barrage';
  }

  // 3. Cover flush / LoS recovery
  if (!input.hasLos || input.timeWithoutLos >= 2.0) {
    if (input.meteorCooldown <= 0) return 'meteor_shard_barrage';
    if (input.blinkCooldown <= 0) return 'phase_blink_reposition';
  }

  // 4. Phase 2 aggressive Phase-Blink flank ambush or mid-range Scythe Rush
  if (input.phase === 2 && input.blinkCooldown <= 0 && input.roll < 0.22) {
    return 'phase_blink_reposition';
  }
  if (scytheCd <= 0 && input.horizDist <= 11.2 && input.roll < 0.32) {
    return 'seraphic_scythe_cleave';
  }

  // 5. Twin Scissor Convergence Rail-Sweep
  if (input.railCooldown <= 0 && input.horizDist >= 7.5 && input.roll < 0.48) {
    return 'dual_archon_rail_sweep';
  }

  // 6. Celestial Monolith Meteor Rain
  if (input.meteorCooldown <= 0 && input.roll < 0.68) {
    return 'meteor_shard_barrage';
  }

  // 7. Astral Fan Judgment Curtain
  if (input.fanCooldown <= 0 && input.roll < 0.86) {
    return 'astral_fan_judgment';
  }

  // 8. Sovereign Lance Storm (rapid alternating pylon + funnel barrage)
  return 'sovereign_lance_barrage';
}

export function computeArchonFanDirections(
  yaw: number,
  pitch: number,
  phase: 1 | 2,
  waveIndex = 0
): Array<{ x: number; y: number; z: number }> {
  const count = phase === 2 ? (waveIndex % 2 === 1 ? 6 : 7) : 5;
  const maxSpread = phase === 2 ? 0.38 : 0.28;
  const staggerYaw = waveIndex % 2 === 1 ? 0.055 : 0;
  const dirs: Array<{ x: number; y: number; z: number }> = [];
  for (let i = 0; i < count; i++) {
    const t = count > 1 ? i / (count - 1) : 0.5;
    const y = yaw + staggerYaw + (t - 0.5) * 2 * maxSpread;
    const cp = Math.cos(pitch);
    const dx = -Math.sin(y) * cp;
    const dy = Math.sin(pitch);
    const dz = -Math.cos(y) * cp;
    const len = Math.hypot(dx, dy, dz) || 1;
    dirs.push({ x: dx / len, y: dy / len, z: dz / len });
  }
  return dirs;
}

export interface ArchonMeteorTarget {
  x: number;
  y: number;
  z: number;
}

export function computeArchonMeteorTargets(
  playerX: number,
  playerY: number,
  playerZ: number,
  phase: 1 | 2
): ArchonMeteorTarget[] {
  const count = phase === 2 ? 7 : 4;
  const radius = phase === 2 ? 4.1 : 3.2;
  const targets: ArchonMeteorTarget[] = [{ x: playerX, y: playerY + 0.1, z: playerZ }];
  for (let i = 1; i < count; i++) {
    const a = ((i - 1) * Math.PI * 2) / (count - 1);
    const rScale = phase === 2 && i % 2 === 0 ? 1.18 : 0.92;
    targets.push({
      x: playerX + Math.cos(a) * radius * rScale,
      y: playerY + 0.1,
      z: playerZ + Math.sin(a) * radius * rScale,
    });
  }
  return targets;
}

/**
 * Pure Scissor Convergence Rail-Sweep angular offset solver:
 * Starts wide apart (`±startSpread`) and smoothly scissors INWARD to cross past center (`∓endCross`)
 * so both volumetric rail lances slice across the Cathedral floor in a dramatic X-convergence!
 */
export function computeArchonScissorSweepYaw(
  progress01: number,
  side: -1 | 1,
  phase: 1 | 2
): number {
  const t = Math.max(0, Math.min(1, progress01));
  const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const startSpread = phase === 2 ? 0.44 : 0.34;
  const endCross = phase === 2 ? -0.18 : -0.1;
  return side * (startSpread + (endCross - startSpread) * eased);
}

/**
 * Pure Phase-Blink Cathedral vantage selector:
 * Picks a tactical Cathedral cross-island flanking anchor that maintains ideal boss sightlines
 * while guaranteeing meaningful spatial displacement away from both the current position & player.
 */
export function pickArchonBlinkDestination(
  bossX: number,
  bossZ: number,
  playerX: number,
  playerZ: number,
  roll: number
): { x: number; z: number } {
  const anchors = [
    { x: 0.0, z: -6.2 },
    { x: 0.0, z: 6.2 },
    { x: -10.4, z: -4.2 },
    { x: 10.4, z: -4.2 },
    { x: -10.4, z: 4.2 },
    { x: 10.4, z: 4.2 },
    { x: 0.0, z: 0.0 },
  ];
  const scored = anchors
    .map((a) => {
      const distBoss = Math.hypot(a.x - bossX, a.z - bossZ);
      const distPlayer = Math.hypot(a.x - playerX, a.z - playerZ);
      // Prefer relocating >= 5.5m away from current spot and 7.5m..16m from player
      const idealPlayerScore = 1 - Math.min(1, Math.abs(distPlayer - 11.5) / 14);
      const validMove = distBoss >= 4.5 ? 1 : 0;
      return { a, score: validMove * 2 + idealPlayerScore };
    })
    .sort((u, v) => v.score - u.score);

  const poolSize = Math.min(3, scored.length);
  const idx = Math.floor(Math.max(0, Math.min(0.9999, roll)) * poolSize);
  return scored[idx].a;
}

/**
 * Pure radial supernova ring direction solver for Phase 2 Cathedral Solar-Astral Supernova Cascade.
 */
export function computeArchonSupernovaRing(
  count: number,
  phaseAngle: number,
  downwardPitch = -0.14
): Array<{ x: number; y: number; z: number }> {
  const safeCount = Math.max(4, count);
  const cp = Math.cos(downwardPitch);
  const sy = Math.sin(downwardPitch);
  const dirs: Array<{ x: number; y: number; z: number }> = [];
  for (let i = 0; i < safeCount; i++) {
    const a = phaseAngle + (i / safeCount) * Math.PI * 2;
    dirs.push({
      x: Math.cos(a) * cp,
      y: sy,
      z: Math.sin(a) * cp,
    });
  }
  return dirs;
}
