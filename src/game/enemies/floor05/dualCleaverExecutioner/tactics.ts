export type ExecutionerAction =
  | 'stalk_advance'
  | 'twin_x_cleave'
  | 'whirlwind_blender'
  | 'berserker_leap_slam'
  | 'molten_arc_wave'
  | 'overhead_guillotine';

export interface ExecutionerTacticsInput {
  horizDist: number;
  vertDist: number;
  hasLos: boolean;
  phase: 1 | 2;
  cleaveCooldown: number;
  whirlwindCooldown: number;
  leapCooldown: number;
  waveCooldown: number;
  guillotineCooldown: number;
  roll: number;
}

export function selectExecutionerAction(input: ExecutionerTacticsInput): ExecutionerAction {
  if (input.vertDist <= 2.6) {
    if (input.horizDist <= 4.1 && input.guillotineCooldown <= 0 && input.roll < 0.48) {
      return 'overhead_guillotine';
    }
    if (input.horizDist <= 4.4 && input.cleaveCooldown <= 0) {
      return 'twin_x_cleave';
    }
    if (input.horizDist >= 3.2 && input.horizDist <= 8.4 && input.whirlwindCooldown <= 0 && input.roll < 0.55) {
      return 'whirlwind_blender';
    }
    if (input.hasLos && input.horizDist >= 6.4 && input.horizDist <= 15.5 && input.leapCooldown <= 0) {
      return 'berserker_leap_slam';
    }
  }

  if (input.hasLos && input.horizDist >= 5.5 && input.horizDist <= 25.0 && input.waveCooldown <= 0) {
    return 'molten_arc_wave';
  }

  return 'stalk_advance';
}

export function computeExecutionerWaveAngles(phase: 1 | 2): readonly number[] {
  return phase === 2 ? [-0.26, -0.13, 0, 0.13, 0.26] : [-0.16, 0, 0.16];
}

export function solveExecutionerLeap(
  dx: number,
  dz: number,
  airTimeSec = 0.64
): { vx: number; vz: number; peakHeight: number } {
  const dist = Math.hypot(dx, dz);
  const clamped = Math.min(13.5, Math.max(4.5, dist * 0.94));
  const dirX = dist > 1e-4 ? dx / dist : 0;
  const dirZ = dist > 1e-4 ? dz / dist : -1;
  return {
    vx: (dirX * clamped) / airTimeSec,
    vz: (dirZ * clamped) / airTimeSec,
    peakHeight: Math.min(3.3, 1.85 + clamped * 0.12),
  };
}
