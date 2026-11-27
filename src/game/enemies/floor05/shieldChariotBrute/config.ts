import type { EnemyArchetypeConfig } from '../../core/types';

export const SHIELD_CHARIOT_BRUTE_CONFIG: EnemyArchetypeConfig = {
  id: 'shield_chariot_brute',
  displayName: 'SHIELD-CHARIOT BRUTE',
  roleSubtitle: 'MOLTEN MINOTAUR PROW-RAM JUGGERNAUT',
  tier: 'normal',
  maxHp: 440,
  moveSpeed: 3.7,
  sprintSpeed: 5.65,
  collisionRadius: 0.8,
  height: 2.56,
  preferredMinRange: 3.2,
  preferredMaxRange: 15.5,
  detectRange: 34.0,
  scoreValue: 380,
  startsWithShield: true,
  phase2ThresholdRatio: 0.55,
  weakpointIntel:
    'Sidestep the bull-rush. While the Brute brakes, shoot the orange furnace on his back to shatter the prow shield.',
  phase2Intel: 'Furnace overdrive widens his flak fan and adds a third mortar. Move out of the landing rings.',
  weakpoint: {
    id: 'dorsal_booster',
    label: 'DORSAL FURNACE REACTOR',
    damageMultiplier: 2.25,
    breakThreshold: 80,
    breakBonusDamage: 88,
    staggerDuration: 2.6,
    requiresExposedWindow: false,
    repeatable: false,
    repeatCooldown: 0,
    breaksShield: true,
  },
};
