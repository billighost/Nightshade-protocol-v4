import type { EnemyArchetypeConfig } from '../../core/types';

export const LEAPING_CARAPACE_STALKER_CONFIG: EnemyArchetypeConfig = {
  id: 'leaping_carapace_stalker',
  displayName: 'LEAPING CARAPACE STALKER',
  roleSubtitle: 'APEX BIO-CYBERNETIC PREDATOR',
  tier: 'normal',
  maxHp: 295,
  moveSpeed: 6.2,
  sprintSpeed: 8.8,
  collisionRadius: 0.62,
  height: 1.92,
  preferredMinRange: 2.0,
  preferredMaxRange: 12.5,
  detectRange: 32.0,
  scoreValue: 285,
  weakpointIntel:
    'Punish the Stalker mid-crouch or flank its blazing EMERALD DORSAL CARAPACE CREST to shatter its leap momentum!',
  weakpoint: {
    id: 'carapace_crest',
    label: 'DORSAL CARAPACE CREST',
    damageMultiplier: 2.2,
    breakThreshold: 64,
    breakBonusDamage: 65,
    staggerDuration: 2.35,
    requiresExposedWindow: false,
    repeatable: false,
    repeatCooldown: 0,
  },
};
