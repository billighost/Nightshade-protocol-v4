import type { EnemyArchetypeConfig } from '../../core/types';

export const RESONANT_BEAM_PRISM_CONFIG: EnemyArchetypeConfig = {
  id: 'resonant_beam_prism',
  displayName: 'RESONANT BEAM PRISM',
  roleSubtitle: 'SOLAR-TEAL REFRACTION SPIRE',
  tier: 'normal',
  maxHp: 490,
  moveSpeed: 0.0,
  sprintSpeed: 0.0,
  collisionRadius: 0.76,
  height: 2.65,
  preferredMinRange: 10.0,
  preferredMaxRange: 40.0,
  detectRange: 44.0,
  scoreValue: 310,
  weakpointIntel:
    'SHATTER ITS REFRACTIVE PRISM CORE AS THE MIRROR WINGS BLOOM TO LOCK ITS SWEEPING LASER, MORTARS & BARRIER!',
  weakpoint: {
    id: 'refractive_prism_core',
    label: 'REFRACTIVE PRISM CORE',
    damageMultiplier: 2.55,
    breakThreshold: 110,
    breakBonusDamage: 135,
    staggerDuration: 3.2,
    requiresExposedWindow: false,
    repeatable: false,
    repeatCooldown: 0,
  },
};
