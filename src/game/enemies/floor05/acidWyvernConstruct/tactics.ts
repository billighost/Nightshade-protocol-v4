export type WyvernAction =
  | 'aerial_orbit'
  | 'twin_tail_venom_barrage'
  | 'corrosive_mortar_spit'
  | 'aerial_dive_sweep';

export interface WyvernTacticsInput {
  horizDist: number;
  hasLos: boolean;
  phase: 1 | 2;
  barrageCooldown: number;
  mortarCooldown: number;
  diveCooldown: number;
  roll: number;
}

export function selectWyvernAction(input: WyvernTacticsInput): WyvernAction {
  if (!input.hasLos) {
    return 'aerial_orbit';
  }

  if (input.horizDist >= 6.0 && input.horizDist <= 18.5 && input.diveCooldown <= 0 && input.roll < 0.44) {
    return 'aerial_dive_sweep';
  }

  if (input.horizDist >= 5.5 && input.horizDist <= 26.0 && input.mortarCooldown <= 0 && input.roll < 0.62) {
    return 'corrosive_mortar_spit';
  }

  if (input.horizDist <= 28.0 && input.barrageCooldown <= 0) {
    return 'twin_tail_venom_barrage';
  }

  return 'aerial_orbit';
}

export function computeVenomBarrageAngles(phase: 1 | 2): readonly number[] {
  return phase === 2
    ? [-0.27, -0.18, -0.09, 0, 0.09, 0.18, 0.27]
    : [-0.2, -0.1, 0, 0.1, 0.2];
}
