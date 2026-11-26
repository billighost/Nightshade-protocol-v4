import type { EnemyArchetypeConfig } from '../../core/types';

export const BASTION_SEVEN_BOSS_CONFIG: EnemyArchetypeConfig = {
  id: 'bastion_seven_boss',
  displayName: 'TITAN-RIG "BASTION-VII"',
  roleSubtitle: 'FLOOR 07 APEX SIEGE MECH · ROTUNDA WARDEN',
  tier: 'boss',
  maxHp: 3800,
  moveSpeed: 3.45,
  sprintSpeed: 5.1,
  collisionRadius: 1.08,
  height: 3.85,
  preferredMinRange: 7.5,
  preferredMaxRange: 19.5,
  detectRange: 54,
  scoreValue: 6000,
  phase2ThresholdRatio: 0.55,
  weakpointIntel:
    'WAIT FOR CHEST REACTOR BLAST-DOORS TO SLIDE OPEN DURING THERMAL VENTING — FOCUS FIRE ON SPINNING REACTOR CORE!',
  phase2Intel:
    'PHASE 2 APEX OVERDRIVE: DOUBLE SEISMIC STOMP, 6-MISSILE CARPET SALVO & TWIN RAIL-LANCE CONVERGENCE — PUNISH VENTING REACTOR!',
  weakpoint: {
    id: 'chest_reactor_core',
    label: 'Chest Reactor Core',
    damageMultiplier: 2.55,
    breakThreshold: 230,
    breakBonusDamage: 360,
    staggerDuration: 3.0,
    requiresExposedWindow: true,
    repeatable: true,
    repeatCooldown: 4.8,
  },
};
