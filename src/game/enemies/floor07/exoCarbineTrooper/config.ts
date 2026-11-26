import type { EnemyArchetypeConfig } from '../../core/types';

export const EXO_CARBINE_TROOPER_CONFIG: EnemyArchetypeConfig = {
  id: 'exo_carbine_trooper',
  displayName: 'EXO-CARBINE TROOPER',
  roleSubtitle: 'JET-BOOST FLANKER · PULSE CARBINE',
  tier: 'normal',
  maxHp: 390,
  moveSpeed: 4.3,
  sprintSpeed: 6.4,
  collisionRadius: 0.46,
  height: 1.88,
  preferredMinRange: 8.5,
  preferredMaxRange: 17.5,
  detectRange: 30,
  scoreValue: 320,
  weakpointIntel: 'SHOOT DORSAL EXO-PACK (GLOWING AMBER THRUSTER) FOR OVERLOAD DETONATION',
  weakpoint: {
    id: 'exo_pack',
    label: 'Dorsal Exo-Pack',
    damageMultiplier: 2.35,
    breakThreshold: 95,
    breakBonusDamage: 115,
    staggerDuration: 2.0,
    requiresExposedWindow: false,
    repeatable: false,
    repeatCooldown: 0,
  },
};
