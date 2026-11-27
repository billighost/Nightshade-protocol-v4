import type { EnemyArchetypeConfig } from '../../core/types';

export const DUAL_CLEAVER_EXECUTIONER_CONFIG: EnemyArchetypeConfig = {
  id: 'dual_cleaver_executioner',
  displayName: 'DUAL-CLEAVER EXECUTIONER',
  roleSubtitle: 'WARDEN OF THE REACTOR GALLOWS',
  tier: 'miniboss',
  maxHp: 880,
  moveSpeed: 4.5,
  sprintSpeed: 6.5,
  collisionRadius: 0.82,
  height: 2.68,
  preferredMinRange: 2.6,
  preferredMaxRange: 13.0,
  detectRange: 32.0,
  scoreValue: 1350,
  phase2ThresholdRatio: 0.55,
  weakpointIntel:
    'Dodge the falling cleavers. The iron shutters on his back open after a guillotine, leap, or whirlwind.',
  phase2Intel:
    'Furnace overdrive adds a third crossing cut and a five-bolt fan. Flank him while he pulls his blades free.',
  weakpoint: {
    id: 'spine_furnace',
    label: 'DORSAL SPINE FURNACE',
    damageMultiplier: 2.4,
    breakThreshold: 145,
    breakBonusDamage: 140,
    staggerDuration: 2.8,
    requiresExposedWindow: true,
    repeatable: true,
    repeatCooldown: 9.0,
  },
};
