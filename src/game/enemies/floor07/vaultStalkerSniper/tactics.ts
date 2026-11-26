export type StalkerAttackChoice =
  | 'phantom_ambush_slash'
  | 'cryo_arc_flush_mine'
  | 'cloak_flank_dash'
  | 'flechette_scatter_burst'
  | 'laser_sweep_barrage'
  | 'rail_sniper_lock'
  | 'reposition';

export interface StalkerTacticsInput {
  horizDist: number;
  vertDist: number;
  hasLos: boolean;
  phase: 1 | 2;
  cloakDisabled: boolean;
  timeWithoutLos: number;
  recentlyDamaged: boolean;
  slashCooldown: number;
  dashCooldown: number;
  mineCooldown: number;
  flechetteCooldown: number;
  sweepCooldown: number;
  railCooldown: number;
  roll: number;
}

/**
 * Pure deterministic tactical decision engine for VAULT STALKER "PHANTOM-VII" (Floor 07 Zone Mini-Boss #2):
 * - CQC (< 4.6m): Punishes rushes with a blistering Phase-Mantis Wrist-Blade Ambush Slash + cloak disengage
 * - No LOS behind cover: Flushes target out with arcing Cryo-Shock Flush Mines (1 in P1, 2 in P2)
 * - Close pressure (< 10.5m) or damaged while cloak intact: Active-Camo Cloak-Flank Dash to break crosshair lock!
 *   (Shattering his glowing Recon Visor Optic disables Cloak-Dash for 5.5s!)
 * - Close-Mid LOS (4.6m - 12.0m): Snap-fires a wide magnetized Rail-Flechette Scatter Burst
 * - Mid-Long LOS: Mixes sweeping 3-shot Laser-Sweep Barrage with signature wall-clipped Rail-Sniper Lock
 *   (which escalates into a lethal Double-Tap Rail Salvo in Phase 2 Phantom Overdrive!).
 */
export function selectStalkerAttack(input: StalkerTacticsInput): StalkerAttackChoice {
  // 1. Lethal close-quarters counter: Phase-Mantis Wrist-Blade Ambush Slash
  if (input.horizDist <= 4.6 && input.vertDist <= 2.4 && input.slashCooldown <= 0) {
    return 'phantom_ambush_slash';
  }

  // 2. Reactive Active-Camo Cloak-Flank Dash when crowded or taking fire (locked out while visor optic is shattered!)
  if (
    !input.cloakDisabled &&
    input.dashCooldown <= 0 &&
    (input.horizDist < 9.5 || (input.recentlyDamaged && input.horizDist < 18.0))
  ) {
    return 'cloak_flank_dash';
  }

  // 3. Target hiding behind barracks pillars / crates: flush with arcing Cryo-Shock Mine!
  if (
    !input.hasLos &&
    input.timeWithoutLos >= 0.85 &&
    input.horizDist >= 6.0 &&
    input.horizDist <= 30.0 &&
    input.mineCooldown <= 0
  ) {
    return 'cryo_arc_flush_mine';
  }

  if (!input.hasLos) {
    return 'reposition';
  }

  // 4. Close-mid range defense: Rail-Flechette Scatter Burst (3 darts P1, 5 darts P2)
  if (input.horizDist <= 12.2 && input.flechetteCooldown <= 0 && input.roll < 0.65) {
    return 'flechette_scatter_burst';
  }

  // 5. Mid-long range optical-camo reposition flank roll
  if (
    !input.cloakDisabled &&
    input.dashCooldown <= 0 &&
    input.horizDist >= 10.0 &&
    input.roll < (input.phase === 2 ? 0.24 : 0.16)
  ) {
    return 'cloak_flank_dash';
  }

  // 6. Mid-long sweeping 3-shot Laser-Sweep Barrage
  if (
    input.horizDist >= 8.0 &&
    input.horizDist <= 30.0 &&
    input.sweepCooldown <= 0 &&
    input.roll < (input.phase === 2 ? 0.56 : 0.44)
  ) {
    return 'laser_sweep_barrage';
  }

  // 7. Mid-range offensive Cryo-Shock Flush Mine to force movement
  if (
    input.horizDist >= 10.5 &&
    input.horizDist <= 28.0 &&
    input.mineCooldown <= 0 &&
    input.roll < 0.68
  ) {
    return 'cryo_arc_flush_mine';
  }

  // 8. Signature Wall-Clipped Rail-Sniper Lock (Double-Tap in Phase 2!)
  if (input.horizDist >= 6.5 && input.horizDist <= 36.0 && input.railCooldown <= 0) {
    return 'rail_sniper_lock';
  }

  // Fallback to flechette scatter if rail is still cooling
  if (input.horizDist <= 18.0 && input.flechetteCooldown <= 0) {
    return 'flechette_scatter_burst';
  }

  return 'reposition';
}

export interface Direction3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Computes symmetric magnetized Rail-Flechette fan directions (3 darts in Phase 1, 5 wide darts in Phase 2).
 */
export function computeFlechetteFanDirections(
  baseYaw: number,
  pitch: number,
  phase: 1 | 2
): Direction3[] {
  const count = phase === 2 ? 5 : 3;
  const step = phase === 2 ? 0.115 : 0.135;
  const half = (count - 1) * 0.5;
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const dirs: Direction3[] = [];

  for (let i = 0; i < count; i++) {
    const yaw = baseYaw + (i - half) * step;
    const x = -Math.sin(yaw) * cosP;
    const y = sinP;
    const z = -Math.cos(yaw) * cosP;
    const len = Math.hypot(x, y, z) || 1;
    dirs.push({ x: x / len, y: y / len, z: z / len });
  }
  return dirs;
}

/**
 * Computes Active-Camo Cloak-Flank Dash velocity blending lateral evasion with retreat/reposition vector.
 */
export function computeCloakDashVelocity(
  fromX: number,
  fromZ: number,
  targetX: number,
  targetZ: number,
  flankSide: -1 | 1,
  retreatBias: number,
  phase: 1 | 2
): { vx: number; vz: number; speed: number } {
  const dx = targetX - fromX;
  const dz = targetZ - fromZ;
  const dist = Math.hypot(dx, dz) || 1;
  const dirX = dx / dist;
  const dirZ = dz / dist;
  const rightX = -dirZ;
  const rightZ = dirX;

  const rawX = -dirX * retreatBias + rightX * flankSide * 0.92;
  const rawZ = -dirZ * retreatBias + rightZ * flankSide * 0.92;
  const rawLen = Math.hypot(rawX, rawZ) || 1;
  const speed = phase === 2 ? 13.4 : 11.2;

  return {
    vx: (rawX / rawLen) * speed,
    vz: (rawZ / rawLen) * speed,
    speed,
  };
}
