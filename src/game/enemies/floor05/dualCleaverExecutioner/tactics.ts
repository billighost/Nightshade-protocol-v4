export const EXECUTIONER_ATTACKS = [
  'twin_x_cleave', 'whirlwind_blender', 'berserker_leap_slam', 'molten_arc_wave',
  'overhead_guillotine', 'dragging_uppercut', 'reaping_backstep',
] as const;
export type ExecutionerAttack = (typeof EXECUTIONER_ATTACKS)[number];
export type ExecutionerAction = 'stalk_advance' | ExecutionerAttack;
export const EXECUTIONER_TIMINGS: Record<ExecutionerAttack, {
  windup: number; active: number; recovery: number; cooldown: number;
}> = {
  twin_x_cleave:       { windup: 0.66, active: 0.86, recovery: 0.62, cooldown: 2.8 },
  whirlwind_blender:   { windup: 0.86, active: 1.38, recovery: 1.18, cooldown: 7.2 },
  berserker_leap_slam: { windup: 0.82, active: 0.96, recovery: 1.24, cooldown: 7.6 },
  molten_arc_wave:     { windup: 0.82, active: 0.68, recovery: 0.68, cooldown: 4.9 },
  overhead_guillotine: { windup: 1.02, active: 0.71, recovery: 1.21, cooldown: 5.7 },
  dragging_uppercut:   { windup: 0.82, active: 0.88, recovery: 0.87, cooldown: 5.3 },
  reaping_backstep:    { windup: 0.52, active: 0.82, recovery: 0.71, cooldown: 5.0 },
};

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
  dragCooldown?: number;
  backstepCooldown?: number;
  hasAttackToken?: boolean;
  flanked?: boolean;
  roll: number;
}

export function selectExecutionerAction(input: ExecutionerTacticsInput): ExecutionerAction {
  if (input.hasAttackToken === false || !input.hasLos) return 'stalk_advance';
  if (input.vertDist <= 2.6) {
    if (input.horizDist <= 3.35 && (input.backstepCooldown ?? Infinity) <= 0 &&
        (input.flanked || input.roll < 0.16)) return 'reaping_backstep';
    if (input.horizDist >= 3.0 && input.horizDist <= 6.3 &&
        (input.dragCooldown ?? Infinity) <= 0 && input.roll < 0.36) return 'dragging_uppercut';
    if (input.horizDist <= 4.1 && input.guillotineCooldown <= 0 && input.roll < 0.48) {
      return 'overhead_guillotine';
    }
    if (input.horizDist <= 4.4 && input.cleaveCooldown <= 0) {
      return 'twin_x_cleave';
    }
    if (input.horizDist >= 2.8 && input.horizDist <= 5.7 && input.whirlwindCooldown <= 0 && input.roll < 0.72) {
      return 'whirlwind_blender';
    }
    if (input.horizDist >= 6.4 && input.horizDist <= 15.5 && input.leapCooldown <= 0) {
      return 'berserker_leap_slam';
    }
  }

  if (input.horizDist >= 5.5 && input.horizDist <= 25.0 && input.waveCooldown <= 0) {
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
  const clamped = Math.min(13.5, dist * 0.94);
  const dirX = dist > 1e-4 ? dx / dist : 0;
  const dirZ = dist > 1e-4 ? dz / dist : 0;
  const duration = Math.max(0.1, airTimeSec);
  return {
    vx: (dirX * clamped) / duration,
    vz: (dirZ * clamped) / duration,
    peakHeight: Math.min(3.3, 1.85 + clamped * 0.12),
  };
}
