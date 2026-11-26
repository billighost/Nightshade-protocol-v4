import type { WeaponId } from '../core/types';

export interface InspectCameraOverride {
  pos: [number, number, number];
  lookAt: [number, number, number];
  fov?: number;
}

export type InspectPoseOverride = Partial<{
  weapon: WeaponId;
  swapFromWeapon: WeaponId;
  swapProgress: number;
  ads: boolean;
  combatReady: boolean;
  heroTitlePose: boolean;
  localMoveX: number;
  localMoveZ: number;
  gaitPhase: number;
  grounded: boolean;
  y: number;
  vy: number;
  airTime: number;
  landingTimer: number;
  landingDuration: number;
  landingImpact: number;
  supportY: number;
  jumpLocalX: number;
  jumpLocalZ: number;
  rollTimer: number;
  rollLocalX: number;
  rollLocalZ: number;
  crouching: boolean;
  sprinting: boolean;
  speedRatio: number;
  freeFacing: boolean;
}>;

export interface CombatTelemetrySnapshot {
  hits: number;
  criticalHits: number;
  shotsFired: number;
  streak: number;
  bestStreak: number;
  score: number;
  targetsCleared: number;
  hitMarkerTimer: number;
  hitMarkerCritical: boolean;
}
