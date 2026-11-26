import type { EnemyArchetypeConfig } from '../../core/types';

export const BREACHER_CYBORG_CONFIG: EnemyArchetypeConfig = {
  id: 'breacher_cyborg',
  displayName: 'BREACHER-08',
  roleSubtitle: 'QUAD-NOD RAIL MARKSMAN',
  tier: 'normal',
  maxHp: 310,
  moveSpeed: 3.45,
  sprintSpeed: 5.05,
  collisionRadius: 0.44,
  height: 1.86,
  preferredMinRange: 7.5,
  preferredMaxRange: 16.5,
  detectRange: 28,
  scoreValue: 260,
  weakpointIntel: 'SHATTER THE GLOWING AMBER SHOULDER EMP CELL TO TRIGGER ARC OVERLOAD STUN',
  weakpoint: {
    id: 'emp_shoulder_cell',
    label: 'EMP Shoulder Cell',
    damageMultiplier: 2.05,
    breakThreshold: 72,
    breakBonusDamage: 68,
    staggerDuration: 2.3,
    requiresExposedWindow: false,
    repeatable: false,
    repeatCooldown: 0,
  },
};
