export type JuggernautAttackChoice =
  | 'seismic_arc_slam'
  | 'juggernaut_bull_rush'
  | 'volt_arc_barrage'
  | 'overcharge_rail_lance'
  | 'rotary_suppression_sweep'
  | 'cover_flush_arc_mortar'
  | 'advance';

export interface JuggernautTacticsInput {
  horizDist: number;
  vertDist: number;
  hasLos: boolean;
  phase: 1 | 2;
  timeWithoutLos: number;
  slamCooldown: number;
  rushCooldown: number;
  arcCooldown: number;
  railCooldown: number;
  volleyCooldown: number;
  mortarCooldown: number;
  roll: number;
}

/**
 * Pure, deterministic AAA Mini-Boss combat router for Floor 07 Zone Mini-Boss #1:
 * TURBINE JUGGERNAUT "VOLT-VII".
 * Coordinates 6 scary, varied, readable industrial heavy attacks with Phase 2 Overdrive escalation:
 * 1. `seismic_arc_slam` — Close-range Piledriver Gauntlet slam releasing a massive seismic shockwave (double-pulse in Phase 2!).
 * 2. `cover_flush_arc_mortar` — When player hides behind turbine pillars without LOS, lobs twin arcing high-voltage canisters over cover.
 * 3. `juggernaut_bull_rush` — Drops Piledriver Buckler forward and charges hard down the lane, ending in a shock-slam & exposing his dorsal radiator!
 * 4. `overcharge_rail_lance` — Laser-locked high-velocity Overcharged Volt-Slug punishing long-range peeking (stronger priority in Phase 2).
 * 5. `volt_arc_barrage` — Wide horizontal fan of 5 (7 in Phase 2) glowing electric arc orbs forcing lateral dodging.
 * 6. `rotary_suppression_sweep` — Signature 6-barrel VOLT-VULCAN 12-round (16 in Phase 2) sweeping autocannon storm followed by Thermal Venting!
 */
export function selectJuggernautAttack(input: JuggernautTacticsInput): JuggernautAttackChoice {
  // 1. Punish players crowding close with a devastating Piledriver Seismic Arc-Slam!
  if (input.horizDist <= 5.6 && input.vertDist <= 2.4 && input.slamCooldown <= 0) {
    return 'seismic_arc_slam';
  }

  // 2. Player hiding behind pillars/cover without LOS -> lob twin high-voltage Arc-Mortars over cover!
  if (
    !input.hasLos &&
    input.timeWithoutLos >= 0.85 &&
    input.mortarCooldown <= 0 &&
    input.horizDist >= 6.5 &&
    input.horizDist <= 28.0
  ) {
    return 'cover_flush_arc_mortar';
  }

  if (!input.hasLos) {
    return 'advance';
  }

  // 3. Aggressive Juggernaut Bull-Rush Charge across mid-range open lanes!
  const rushThreshold = input.phase === 2 ? 0.34 : 0.26;
  if (
    input.rushCooldown <= 0 &&
    input.horizDist >= 6.2 &&
    input.horizDist <= 16.5 &&
    input.vertDist <= 1.8 &&
    input.roll < rushThreshold
  ) {
    return 'juggernaut_bull_rush';
  }

  // 4. Laser-locked Overcharged Rail-Lance punishing long-range peeking (or Phase 2 overdrive!)
  const railMaxRoll = input.phase === 2 ? 0.62 : 0.48;
  if (
    input.railCooldown <= 0 &&
    input.horizDist >= 10.5 &&
    input.horizDist <= 32.0 &&
    input.roll >= rushThreshold &&
    input.roll < railMaxRoll
  ) {
    return 'overcharge_rail_lance';
  }

  // 5. Wide horizontal Volt-Arc Plasma Fan forcing horizontal evasion
  if (
    input.arcCooldown <= 0 &&
    input.horizDist >= 5.0 &&
    input.horizDist <= 22.0 &&
    input.roll < 0.72
  ) {
    return 'volt_arc_barrage';
  }

  // 6. Signature 6-Barrel VOLT-VULCAN Rotary Suppression Storm -> leads into Thermal Venting window!
  if (
    input.volleyCooldown <= 0 &&
    input.horizDist >= 4.2 &&
    input.horizDist <= 30.0
  ) {
    return 'rotary_suppression_sweep';
  }

  return 'advance';
}

/**
 * Generates normalized horizontal fan aim directions for the Volt-Arc Plasma Barrage
 * (5 orbs in Phase 1, 7 wider orbs in Phase 2 Overdrive!).
 */
export function computeVoltArcFanDirections(
  baseYaw: number,
  pitch: number,
  phase: 1 | 2
): Array<{ x: number; y: number; z: number }> {
  const count = phase === 2 ? 7 : 5;
  const half = (count - 1) * 0.5;
  const stepAngle = phase === 2 ? 0.135 : 0.145;
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const out: Array<{ x: number; y: number; z: number }> = [];
  for (let i = 0; i < count; i++) {
    const yaw = baseYaw + (i - half) * stepAngle;
    const x = -Math.sin(yaw) * cosP;
    const y = sinP;
    const z = -Math.cos(yaw) * cosP;
    const len = Math.hypot(x, y, z) || 1;
    out.push({ x: x / len, y: y / len, z: z / len });
  }
  return out;
}

/**
 * Computes bull-rush charge velocity vector straight down the target lane at the moment of lock.
 */
export function computeBullRushVelocity(
  juggX: number,
  juggZ: number,
  targetX: number,
  targetZ: number,
  phase: 1 | 2
): { vx: number; vz: number; speed: number } {
  const dx = targetX - juggX;
  const dz = targetZ - juggZ;
  const dist = Math.hypot(dx, dz) || 1;
  const speed = phase === 2 ? 12.6 : 10.8;
  return {
    vx: (dx / dist) * speed,
    vz: (dz / dist) * speed,
    speed,
  };
}
