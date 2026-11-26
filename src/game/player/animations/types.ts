import * as THREE from 'three';
import type {
  OperativeLocomotionState,
  PistolReloadPhase,
  WeaponId,
} from '../../core/types';
import type { SpectrePistolRig, ViperSmgRig, VulcanHeavyRig } from '../../weapons/models';
import type { MixamoHumanoidRig } from '../skeleton/mixamoBones';

export interface AgentAnimationInput {
  dt: number;
  elapsed: number;
  locomotion: OperativeLocomotionState;
  aimPitch: number;
  ads: boolean;
  combatReady: boolean;
  /** Signed angular turn velocity (rad/s) for authentic athletic banking lean into turns! */
  turnRate?: number;
  /** True when operative is freely running/exploring aligned to velocity (false when combat strafing!) */
  freeFacing?: boolean;
  activeWeapon: WeaponId;
  swapFromWeapon: WeaponId;
  swapProgress: number; // 1 -> 0 during 0.68s physical stow/draw choreography
  recoilKick: number; // 0..1
  pistolReloadPhase: PistolReloadPhase;
  pistolReloadProgress: number; // 0..1
  heavyReloading: boolean;
  heavyReloadProgress: number; // 0..1
  smgHeatRatio: number; // 0..1
  smgVenting: boolean;
  smgOverheated: boolean;
  /** 0..1 upper-body impact flinch curve when struck by enemy fire/melee (never locks controls) */
  hitFlinch?: number;
  /** -1..1 horizontal impact direction in local operative space */
  hitDirLocalX?: number;
  heroTitlePose?: boolean;
}

export interface OperativeAnimationTargets {
  rig: MixamoHumanoidRig;
  contactShadow: THREE.Mesh;
  activePistol: SpectrePistolRig;
  activeSmg: ViperSmgRig;
  activeHeavy: VulcanHeavyRig;
  holsteredPistol: SpectrePistolRig;
  backSmg: ViperSmgRig;
  backHeavy: VulcanHeavyRig;
}

export interface AnimatorMemory {
  crouchBlend: number;
  adsBlend: number;
  readyBlend: number;
  sprintBlend: number;
  runBlend: number;
  airBlend: number;
  hipYawSmooth: number;
  leanX: number;
  leanZ: number;
  turnBankSmooth: number;
  recoilSmooth: number;
  reloadMagDrop: number;
  /** Previous frame speedRatio for organic start-fall & stop-settle inertia */
  prevSpeed: number;
  /** Damped longitudinal acceleration impulse (+start lean forward, -stop settle) */
  accelSmooth: number;
  /** Anticipatory head yaw lead when carving turns */
  headLeadSmooth: number;
  /** Previous pelvis Y for slung-gear secondary spring impulse */
  prevPelvisY: number;
  /** Secondary motion damped spring state for back-slung SMG weight bounce */
  gearBounce: number;
  gearBounceVel: number;
}

export function createAnimatorMemory(): AnimatorMemory {
  return {
    crouchBlend: 0,
    adsBlend: 0,
    readyBlend: 0,
    sprintBlend: 0,
    runBlend: 0,
    airBlend: 0,
    hipYawSmooth: 0,
    leanX: 0,
    leanZ: 0,
    turnBankSmooth: 0,
    recoilSmooth: 0,
    reloadMagDrop: 0,
    prevSpeed: 0,
    accelSmooth: 0,
    headLeadSmooth: 0,
    prevPelvisY: 0,
    gearBounce: 0,
    gearBounceVel: 0,
  };
}

/** Smooth damp helper */
export function dampVal(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}
