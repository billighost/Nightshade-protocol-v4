import type { EnemyArchetypeConfig } from '../../core/types';

export const VALKYRIE_HOVER_DRONE_CONFIG: EnemyArchetypeConfig = {
  id: 'valkyrie_hover_drone',
  displayName: 'VALKYRIE HOVER-DRONE',
  roleSubtitle: 'AERIAL HUNTER-KILLER · TWIN VTOL NACELLES',
  tier: 'normal',
  maxHp: 380,
  moveSpeed: 6.1,
  sprintSpeed: 8.4,
  collisionRadius: 0.66,
  height: 1.32,
  preferredMinRange: 8.5,
  preferredMaxRange: 18.0,
  detectRange: 36,
  scoreValue: 390,
  weakpointIntel:
    'SHATTER GLOWING CYAN OPTIC GYRO-CORE TO CRASH DRONE & DISABLE RAIL-LASER / DIVE-STRAFE',
  weakpoint: {
    id: 'optic_gyro_core',
    label: 'Optic Gyro-Core',
    damageMultiplier: 2.35,
    breakThreshold: 95,
    breakBonusDamage: 120,
    staggerDuration: 2.4,
    requiresExposedWindow: false,
    repeatable: false,
    repeatCooldown: 0,
  },
};
