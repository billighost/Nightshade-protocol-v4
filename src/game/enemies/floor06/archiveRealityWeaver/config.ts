import type { EnemyArchetypeConfig } from '../../core/types';

export const ARCHIVE_REALITY_WEAVER_CONFIG: EnemyArchetypeConfig = {
  id: 'archive_reality_weaver',
  displayName: 'ARCHIVE REALITY-WEAVER',
  roleSubtitle: 'NE GRAV-CORE ZONE MINI-BOSS',
  tier: 'miniboss',
  maxHp: 2150,
  moveSpeed: 5.2,
  sprintSpeed: 7.8,
  collisionRadius: 0.94,
  height: 3.25,
  preferredMinRange: 8.5,
  preferredMaxRange: 20.0,
  detectRange: 36.0,
  scoreValue: 1500,
  phase2ThresholdRatio: 0.55,
  weakpointIntel:
    'SHATTER ITS FLOATING CROWN RESONANCE HALO TO INTERRUPT SWEEPING BEAMS & STAVE VOLLEYS!',
  phase2Intel:
    'SOVEREIGN OVERDRIVE — SWEEPING REALITY BEAMS, HELIX STAVE STORMS & PENTAGRAM MORTARS!',
  weakpoint: {
    id: 'crown_resonance_halo',
    label: 'CROWN RESONANCE HALO',
    damageMultiplier: 2.5,
    breakThreshold: 240,
    breakBonusDamage: 260,
    staggerDuration: 3.3,
    requiresExposedWindow: false,
    repeatable: true,
    repeatCooldown: 11.0,
  },
};
