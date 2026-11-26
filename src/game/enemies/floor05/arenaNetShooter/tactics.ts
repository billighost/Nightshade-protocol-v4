export type NetShooterAction =
  | 'hold_aim'
  | 'strafe_reposition'
  | 'electric_snare_net'
  | 'shock_bola_mortar'
  | 'arc_rail_snipe'
  | 'tesla_burst_sweep'
  | 'voltaic_shock_nova'
  | 'trident_arc_cleave'
  | 'arc_blink_reposition';

export interface NetShooterTacticsInput {
  horizDist: number;
  vertDist?: number;
  hasLos: boolean;
  hasAttackToken: boolean;
  netCooldown: number;
  mortarCooldown: number;
  snipeCooldown: number;
  strafeCooldown: number;
  burstCooldown?: number;
  novaCooldown?: number;
  meleeCooldown?: number;
  blinkCooldown?: number;
  damageBurstAccum?: number;
  enraged?: boolean;
  roll: number;
}

/**
 * Pure tactical decision maker for Floor 05 Arena Net-Shooter (Voltaic Retiarius Executioner).
 * Combines lethal long-range rail sniping, wide electric snare volleys, anti-cover shock-bola
 * mortars, mid-range sweeping plasma bursts, close-quarters anti-rush Shock Novas & Trident
 * melee cleaves, plus reactive thruster-assisted Arc-Blink disengages.
 */
export function selectNetShooterAction(input: NetShooterTacticsInput): NetShooterAction {
  const burstCd = input.burstCooldown ?? 99;
  const novaCd = input.novaCooldown ?? 99;
  const meleeCd = input.meleeCooldown ?? 99;
  const blinkCd = input.blinkCooldown ?? 99;
  const burstAccum = input.damageBurstAccum ?? 0;
  const vertDist = input.vertDist ?? 0;

  // 1. Reactive Arc-Blink evade under heavy burst fire or when cornered at close quarters
  if (
    blinkCd <= 0 &&
    (burstAccum >= 46 || (input.horizDist < 5.6 && novaCd > 0 && meleeCd > 0 && input.roll < 0.72))
  ) {
    return 'arc_blink_reposition';
  }

  // 2. Close-quarters anti-rush defense (Shock Nova cage discharge or brutal Trident Arc Cleave)
  if (input.hasAttackToken && input.horizDist <= 4.6 && vertDist <= 2.1) {
    if (input.horizDist <= 3.6 && meleeCd <= 0 && (novaCd > 0 || input.roll < 0.48)) {
      return 'trident_arc_cleave';
    }
    if (novaCd <= 0) {
      return 'voltaic_shock_nova';
    }
    if (input.horizDist <= 3.9 && meleeCd <= 0) {
      return 'trident_arc_cleave';
    }
  }

  // 3. Anti-cover Shock-Bola Mortar when player hides behind arena cover or different vertical tier
  if (
    input.hasAttackToken &&
    !input.hasLos &&
    input.horizDist >= 6.5 &&
    input.horizDist <= 29.0 &&
    input.mortarCooldown <= 0
  ) {
    return 'shock_bola_mortar';
  }

  // 4. Direct LOS ranged combat toolkit
  if (input.hasAttackToken && input.hasLos) {
    // Wide electric snare-net volley at close-to-mid range
    if (input.horizDist <= 18.5 && input.netCooldown <= 0 && input.roll < 0.58) {
      return 'electric_snare_net';
    }

    // Sweeping 3-round Tesla burst for tracking strafing targets at mid range
    if (input.horizDist >= 5.5 && input.horizDist <= 22.0 && burstCd <= 0 && input.roll < 0.66) {
      return 'tesla_burst_sweep';
    }

    // High-arc Shock-Bola mortar flushing player position
    if (input.horizDist >= 7.0 && input.horizDist <= 28.5 && input.mortarCooldown <= 0 && input.roll < 0.72) {
      return 'shock_bola_mortar';
    }

    // High-velocity kneeling Arc-Rail Snipe
    if (input.horizDist >= 9.5 && input.horizDist <= 35.0 && input.snipeCooldown <= 0) {
      return 'arc_rail_snipe';
    }

    // Fallback ready ranged attacks
    if (input.netCooldown <= 0) {
      return 'electric_snare_net';
    }
    if (burstCd <= 0) {
      return 'tesla_burst_sweep';
    }
    if (input.mortarCooldown <= 0 && input.horizDist >= 6.0) {
      return 'shock_bola_mortar';
    }
  }

  // 5. Agile tactical strafing/kiting when crowded, repositioning, or hunting LOS
  if (
    input.strafeCooldown <= 0 &&
    (input.horizDist < 7.8 || !input.hasLos || (input.enraged && input.roll < 0.55))
  ) {
    return 'strafe_reposition';
  }

  return 'hold_aim';
}

/**
 * Horizontal fan angles for the Retiarius Electric Snare-Net volley.
 * Default 4 bolts in normal mode; 6-bolt X-Snare barrage in Voltaic Overdrive!
 */
export function computeSnareNetSpreadAngles(count = 4): readonly number[] {
  if (count <= 4) {
    return [-0.15, -0.05, 0.05, 0.15];
  }
  return [-0.22, -0.132, -0.044, 0.044, 0.132, 0.22];
}

/**
 * Sweeping yaw offsets for the 3-round Tesla Burst Sweep.
 */
export function computeTeslaBurstOffsets(sweepSign = 1): readonly number[] {
  const s = sweepSign >= 0 ? 1 : -1;
  return [-0.075 * s, 0, 0.075 * s];
}

/**
 * Solves a clean lobbed arc velocity vector for the Shock-Bola Mortar canister.
 */
export function solveShockBolaArc(
  originX: number,
  originY: number,
  originZ: number,
  targetX: number,
  targetY: number,
  targetZ: number,
  gravity = 16.0,
  flightTime = 1.05
): { vx: number; vy: number; vz: number } {
  const t = Math.max(0.45, flightTime);
  return {
    vx: (targetX - originX) / t,
    vy: (targetY - originY + 0.5 * gravity * t * t) / t,
    vz: (targetZ - originZ) / t,
  };
}

/**
 * Solves the ballistic thruster-vault velocity for the reactive Arc-Blink Reposition evade.
 */
export function solveArcBlinkVault(
  dirToPlayerX: number,
  dirToPlayerZ: number,
  strafeSign: number,
  duration = 0.44
): { vx: number; vz: number; peakHeight: number; duration: number } {
  const d = Math.max(0.32, duration);
  const s = strafeSign >= 0 ? 1 : -1;
  // Diagonal lateral + backward evade away from rushing player
  const rawX = -dirToPlayerZ * s * 0.78 - dirToPlayerX * 0.62;
  const rawZ = dirToPlayerX * s * 0.78 - dirToPlayerZ * 0.62;
  const len = Math.hypot(rawX, rawZ) || 1;
  const travelDist = 6.2;
  const speed = travelDist / d;
  return {
    vx: (rawX / len) * speed,
    vz: (rawZ / len) * speed,
    peakHeight: 1.55,
    duration: d,
  };
}
