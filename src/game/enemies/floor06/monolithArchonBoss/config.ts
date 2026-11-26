import type { EnemyArchetypeConfig } from '../../core/types';

export const MONOLITH_ARCHON_BOSS_CONFIG: EnemyArchetypeConfig = {
  id: 'monolith_archon_boss',
  displayName: 'THE MONOLITH ARCHON',
  roleSubtitle: 'FLOOR 06 CATHEDRAL SOVEREIGN BOSS',
  tier: 'boss',
  maxHp: 5200,
  moveSpeed: 5.2,
  sprintSpeed: 8.4,
  collisionRadius: 1.4,
  height: 4.4,
  preferredMinRange: 8.0,
  preferredMaxRange: 21.0,
  detectRange: 52.0,
  scoreValue: 5000,
  phase2ThresholdRatio: 0.55,
  weakpointIntel:
    'WAIT FOR ITS CHEST SHUTTERS TO FLARE OPEN DURING RESONANCE VENTING — SHATTER THE SINGULARITY CORE!',
  phase2Intel:
    'ARCHON APEX OVERDRIVE — SCISSOR RAIL BEAMS, SERAPHIC SCYTHE CLEAVES & SOLAR SUPERNOVA CASCADE!',
  weakpoint: {
    id: 'paranatural_singularity_core',
    label: 'PARANATURAL SINGULARITY CORE',
    damageMultiplier: 2.75,
    breakThreshold: 360,
    breakBonusDamage: 480,
    staggerDuration: 4.0,
    requiresExposedWindow: true,
    repeatable: true,
    repeatCooldown: 8.0,
  },
};
