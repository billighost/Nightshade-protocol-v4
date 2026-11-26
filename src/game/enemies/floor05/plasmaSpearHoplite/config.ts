import type { EnemyArchetypeConfig } from '../../core/types';

export const PLASMA_SPEAR_HOPLITE_CONFIG: EnemyArchetypeConfig = {
  id: 'plasma_spear_hoplite',
  displayName: 'PLASMA-SPEAR HOPLITE',
  roleSubtitle: 'SPARTAN PHALANX WAR-WRAITH',
  tier: 'normal',
  maxHp: 320,
  moveSpeed: 4.8,
  sprintSpeed: 7.2,
  collisionRadius: 0.58,
  height: 2.18,
  preferredMinRange: 2.2,
  preferredMaxRange: 14.5,
  detectRange: 32.0,
  scoreValue: 290,
  startsWithShield: false,
  weakpointIntel:
    'Bait its lunge or vaulting plunge, then flank and shatter its blazing DORSAL PHALANX CAPACITOR!',
  weakpoint: {
    id: 'dorsal_capacitor',
    label: 'DORSAL PHALANX CAPACITOR',
    damageMultiplier: 2.15,
    breakThreshold: 70,
    breakBonusDamage: 72,
    staggerDuration: 2.35,
    requiresExposedWindow: false,
    repeatable: false,
    repeatCooldown: 0,
    breaksShield: true,
  },
};
