import type { EnemyArchetypeConfig } from '../../core/types';

export const TURBINE_JUGGERNAUT_CONFIG: EnemyArchetypeConfig = {
  id: 'turbine_juggernaut',
  displayName: 'TURBINE JUGGERNAUT "VOLT-VII"',
  roleSubtitle: 'SE TURBINE MINI-BOSS · VOLT-VULCAN & PILEDRIVER',
  tier: 'miniboss',
  maxHp: 1750,
  moveSpeed: 3.35,
  sprintSpeed: 5.1,
  collisionRadius: 0.76,
  height: 2.55,
  preferredMinRange: 6.5,
  preferredMaxRange: 17.5,
  detectRange: 36,
  scoreValue: 1450,
  phase2ThresholdRatio: 0.55,
  weakpointIntel:
    'DODGE BULL-RUSH OR ROTARY VOLLEY, THEN SHATTER OPEN DORSAL COOLING RADIATOR DURING THERMAL VENTING',
  weakpoint: {
    id: 'cooling_radiator',
    label: 'Cooling Radiator Backplate',
    damageMultiplier: 2.55,
    breakThreshold: 195,
    breakBonusDamage: 265,
    staggerDuration: 3.0,
    requiresExposedWindow: false,
    repeatable: true,
    repeatCooldown: 5.5,
  },
};
