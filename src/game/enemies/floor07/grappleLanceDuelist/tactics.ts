export type DuelistAttackChoice =
  | 'lance_flurry_combo'
  | 'tether_zip_lunge'
  | 'vault_shock_slam'
  | 'plasma_arc_wave'
  | 'evasive_sidestep_feint'
  | 'pursue';

export interface DuelistTacticsInput {
  horizDist: number;
  vertDist: number;
  hasLos: boolean;
  hasAttackToken: boolean;
  winchBroken: boolean;
  recentlyDamaged: boolean;
  zipCooldown: number;
  slamCooldown: number;
  waveCooldown: number;
  feintCooldown: number;
  comboCooldown: number;
  roll: number;
}

/**
 * Pure, deterministic tactical decision brain for the Floor 07 Grapple-Lance Duelist.
 * Coordinates 5 ferocious, highly mobile combat patterns:
 * 1. `lance_flurry_combo` — Close-quarters 2-hit diagonal cleave -> reverse spinning reap.
 * 2. `tether_zip_lunge` — Mid-long range magnetic grapple cable zip into impale lunge
 *    (PERMANENTLY LOCKED OUT when the player ruptures the Chest Tether Winch weakpoint!).
 * 3. `vault_shock_slam` — High airborne pole-vault slam releasing a radial thermite shockwave.
 * 4. `plasma_arc_wave` — Wide lance whip launching a 3-bolt crescent plasma fan to punish kiting.
 * 5. `evasive_sidestep_feint` — Blistering thruster sidestep juke when taking fire or closing in.
 */
export function selectDuelistAttack(input: DuelistTacticsInput): DuelistAttackChoice {
  // 1. Close-quarters relentless 2-hit Plasma-Lance Flurry Combo
  if (input.horizDist <= 3.85 && input.vertDist < 2.25 && input.comboCooldown <= 0) {
    return 'lance_flurry_combo';
  }

  // 2. Reactive thruster sidestep feint when taking fire at close-mid range
  if (
    input.recentlyDamaged &&
    input.feintCooldown <= 0 &&
    input.horizDist >= 3.2 &&
    input.horizDist <= 13.5
  ) {
    return 'evasive_sidestep_feint';
  }

  // 3. Signature Tether-Zip Lunge (only while Chest Tether Winch is intact!)
  if (
    !input.winchBroken &&
    input.hasLos &&
    input.hasAttackToken &&
    input.zipCooldown <= 0 &&
    input.horizDist >= 6.2 &&
    input.horizDist <= 18.5 &&
    input.vertDist < 2.6
  ) {
    return 'tether_zip_lunge';
  }

  // 4. Airborne Vault Shock-Slam at medium-close range to flush players out of cover/kiting
  if (
    input.hasLos &&
    input.hasAttackToken &&
    input.slamCooldown <= 0 &&
    input.horizDist >= 3.7 &&
    input.horizDist <= 8.8 &&
    input.vertDist < 2.4 &&
    input.roll < 0.62
  ) {
    return 'vault_shock_slam';
  }

  // 5. Crescent Plasma Arc Wave to keep pressure on retreating/kiting players
  if (
    input.hasLos &&
    input.hasAttackToken &&
    input.waveCooldown <= 0 &&
    input.horizDist >= 4.4 &&
    input.horizDist <= 15.0
  ) {
    return 'plasma_arc_wave';
  }

  // 6. Opportunistic flanking feint while closing gap
  if (
    input.feintCooldown <= 0 &&
    input.horizDist >= 5.2 &&
    input.horizDist <= 11.5 &&
    input.roll > 0.78
  ) {
    return 'evasive_sidestep_feint';
  }

  return 'pursue';
}

/**
 * Computes unit direction vectors for the 3-bolt Plasma Arc Wave crescent fan.
 */
export function computePlasmaArcDirections(
  baseYaw: number,
  aimPitch: number,
  spreadRad = 0.165
): Array<{ x: number; y: number; z: number }> {
  const offsets = [-spreadRad, 0, spreadRad];
  const cosP = Math.cos(aimPitch);
  const sinP = Math.sin(aimPitch);
  return offsets.map((off) => {
    const yaw = baseYaw + off;
    const x = -Math.sin(yaw) * cosP;
    const y = sinP;
    const z = -Math.cos(yaw) * cosP;
    const len = Math.hypot(x, y, z) || 1;
    return { x: x / len, y: y / len, z: z / len };
  });
}

/**
 * Computes horizontal velocity vector for the Tether-Zip airborne grapple lunge.
 */
export function computeTetherZipVelocity(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  zipSpeed = 19.5
): { vx: number; vz: number; dist: number } {
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  const dist = Math.hypot(dx, dz);
  if (dist < 1e-4) {
    return { vx: 0, vz: zipSpeed, dist: 0 };
  }
  return {
    vx: (dx / dist) * zipSpeed,
    vz: (dz / dist) * zipSpeed,
    dist,
  };
}
