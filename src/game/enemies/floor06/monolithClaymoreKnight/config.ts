import type { EnemyArchetypeConfig } from '../../core/types';

export const MONOLITH_CLAYMORE_KNIGHT_CONFIG: EnemyArchetypeConfig = {
  id: 'monolith_claymore_knight',
  displayName: 'MONOLITH CLAYMORE KNIGHT',
  roleSubtitle: 'OBSIDIAN CRUSADER · HEAVY VANGUARD',
  tier: 'normal',
  maxHp: 560,
  moveSpeed: 4.8,
  sprintSpeed: 8.2,
  collisionRadius: 0.76,
  height: 2.42,
  preferredMinRange: 2.3,
  preferredMaxRange: 4.5,
  detectRange: 34.0,
  scoreValue: 330,
  weakpointIntel:
    'FLANK OR BAIT ITS SLAM/VAULT TO SHATTER THE DORSAL OBELISK VERTEBRA & LOCK WAVE/VAULT ATTACKS!',
  weakpoint: {
    id: 'dorsal_obelisk',
    label: 'DORSAL OBELISK VERTEBRA',
    damageMultiplier: 2.35,
    breakThreshold: 115,
    breakBonusDamage: 130,
    staggerDuration: 3.0,
    requiresExposedWindow: false,
    repeatable: true,
    repeatCooldown: 9.5,
  },
};
