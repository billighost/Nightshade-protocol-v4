export type MarauderAction =
  | 'stalk_advance'
  | 'aegis_parry_advance'
  | 'marauder_dash_cleave'
  | 'war_shotgun_scatter'
  | 'argent_axe_wave'
  | 'apex_leap_cataclysm'
  | 'spectral_hound_salvo';

export interface MarauderTacticsInput {
  horizDist: number;
  vertDist: number;
  hasLos: boolean;
  phase: 1 | 2;
  dashCleaveCooldown: number;
  shotgunCooldown: number;
  axeWaveCooldown: number;
  leapCooldown: number;
  parryCooldown: number;
  salvoCooldown: number;
  damageBurstAccum: number;
  roll: number;
}

export function selectMarauderAction(input: MarauderTacticsInput): MarauderAction {
  // Reactive Aegis Parry March when sprayed with sustained fire at mid-range
  if (
    input.parryCooldown <= 0 &&
    input.damageBurstAccum >= 52 &&
    input.horizDist >= 5.5 &&
    input.horizDist <= 20.0
  ) {
    return 'aegis_parry_advance';
  }

  if (input.vertDist <= 2.8) {
    if (input.horizDist <= 4.6 && input.shotgunCooldown <= 0 && input.roll < 0.42) {
      return 'war_shotgun_scatter';
    }
    if (input.horizDist <= 8.8 && input.dashCleaveCooldown <= 0) {
      return 'marauder_dash_cleave';
    }
    if (input.hasLos && input.horizDist >= 6.8 && input.horizDist <= 18.0 && input.leapCooldown <= 0) {
      return 'apex_leap_cataclysm';
    }
  }

  if (input.phase === 2 && input.hasLos && input.horizDist >= 7.0 && input.salvoCooldown <= 0 && input.roll < 0.55) {
    return 'spectral_hound_salvo';
  }

  if (input.hasLos && input.horizDist >= 5.5 && input.horizDist <= 28.0 && input.axeWaveCooldown <= 0) {
    return 'argent_axe_wave';
  }

  return 'stalk_advance';
}

export function computeMarauderAxeWaveAngles(phase: 1 | 2): readonly number[] {
  return phase === 2 ? [-0.26, -0.13, 0, 0.13, 0.26] : [-0.16, 0, 0.16];
}

export function computeMarauderShotgunSpread(): ReadonlyArray<{ yaw: number; pitch: number }> {
  return [
    { yaw: -0.15, pitch: 0.03 },
    { yaw: -0.09, pitch: -0.02 },
    { yaw: -0.03, pitch: 0.02 },
    { yaw: 0.03, pitch: -0.02 },
    { yaw: 0.09, pitch: 0.02 },
    { yaw: 0.15, pitch: -0.03 },
  ];
}

export function solveMarauderCataclysmLeap(
  dx: number,
  dz: number,
  airTimeSec = 0.68
): { vx: number; vz: number; peakHeight: number } {
  const dist = Math.hypot(dx, dz);
  const clamped = Math.min(15.5, Math.max(5.0, dist * 0.94));
  const dirX = dist > 1e-4 ? dx / dist : 0;
  const dirZ = dist > 1e-4 ? dz / dist : -1;
  return {
    vx: (dirX * clamped) / airTimeSec,
    vz: (dirZ * clamped) / airTimeSec,
    peakHeight: Math.min(4.0, 2.2 + clamped * 0.12),
  };
}
