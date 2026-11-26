import type { Floor08EncounterHudState } from '../enemies/core/types';
import type { MinimapSnapshot, ObjectiveWaypointSnapshot } from '../hud/minimapMath';
import type { DirectionalDamageVignette } from '../player/hitReaction';
import type { Floor08TutorialHudState } from '../tutorial/floor08Tutorial';

export type GamePhase = 'title' | 'playing' | 'paused';

export type WeaponId = 'pistol' | 'smg' | 'heavy';

export type ShoulderSide = 'right' | 'left';

export type PistolReloadPhase = 'idle' | 'active' | 'jammed';

export type ReloadBannerKind =
  | 'none'
  | 'perfect_reload'
  | 'jammed'
  | 'flash_cool'
  | 'overheated'
  | 'ammo_pickup'
  | 'no_heavy_ammo';

export interface ColliderRect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  maxY?: number;
}

export interface PistolState {
  ammo: number;
  maxAmmo: number;
  fireCooldown: number;
  spread: number;
  overchargedRounds: number;
  reloadPhase: PistolReloadPhase;
  reloadProgress: number; // 0..1
  reloadAttempted: boolean;
  sweetSpotStart: number; // 0.46
  sweetSpotEnd: number; // 0.68
}

export interface SmgState {
  heat: number; // 0..100
  overheated: boolean;
  venting: boolean;
  ventProgress: number; // 0..1
  flashCoolTimer: number; // >0 grants RPM surge
  fireCooldown: number;
  spread: number;
  shotsInBurst: number;
  coolDelayTimer: number; // brief pause after releasing trigger before cooling starts
}

export interface HeavyState {
  ammo: number;
  maxAmmo: number;
  reserveAmmo: number;
  maxReserveAmmo: number;
  reloading: boolean;
  reloadProgress: number; // 0..1
  fireCooldown: number;
  spread: number;
}

export interface WeaponSystemState {
  activeWeapon: WeaponId;
  swapFromWeapon: WeaponId;
  swapTimer: number; // 0 when ready
  pistol: PistolState;
  smg: SmgState;
  heavy: HeavyState;
  bannerKind: ReloadBannerKind;
  bannerTimer: number;
}

export interface OperativeLocomotionState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  grounded: boolean;
  crouching: boolean;
  sprinting: boolean;
  rollTimer: number;
  rollCooldown: number;
  rollDirX: number;
  rollDirZ: number;
  rollLocalX: number; // -1 left .. +1 right roll direction in character space
  rollLocalZ: number; // -1 back .. +1 forward roll direction in character space
  jumpLocalX: number; // captured takeoff lateral direction (-1 left .. +1 right)
  jumpLocalZ: number; // captured takeoff fore/aft direction (-1 back .. +1 forward)
  jumpHoldTimer: number; // remaining variable hold-to-jump boost window (s)
  launchPadTimer?: number; // active pneumatic jump-pad ballistic arc timer (s)
  airTime: number; // elapsed seconds in current airborne arc
  landingTimer: number; // remaining landing shock-absorption compression timer (s)
  landingDuration: number; // total duration of current landing compression (s)
  landingImpact: number; // 0..1 normalized impact intensity scaled by landing speed
  supportY: number; // current supporting ground or elevated platform height (m)
  coyoteTimer: number;
  jumpBufferTimer: number;
  gaitPhase: number;
  speedRatio: number; // 0..1
  localMoveX: number; // -1..1 right/left relative to aim yaw
  localMoveZ: number; // -1..1 forward/back relative to aim yaw
  stepTrigger: boolean;
  jumpTrigger: boolean;
  landTrigger: boolean;
  rollContactTrigger: boolean;
}

export interface HudSnapshot {
  phase: GamePhase;
  activeWeapon: WeaponId;
  pistolAmmo: number;
  pistolMaxAmmo: number;
  pistolOvercharged: number;
  pistolReloadPhase: PistolReloadPhase;
  pistolReloadProgress: number;
  pistolSweetSpotStart: number;
  pistolSweetSpotEnd: number;
  smgHeat: number;
  smgOverheated: boolean;
  smgVenting: boolean;
  smgFlashCoolActive: boolean;
  heavyAmmo: number;
  heavyMaxAmmo: number;
  heavyReserveAmmo: number;
  heavyMaxReserveAmmo: number;
  heavyReloading: boolean;
  heavyReloadProgress: number;
  reloadBanner: ReloadBannerKind;
  ads: boolean;
  combatReady: boolean;
  crouching: boolean;
  sprinting: boolean;
  shoulder: ShoulderSide;
  spreadPx: number;
  hitMarkerTimer: number;
  hitMarkerCritical: boolean;
  hitMarkerKill: boolean;
  /** CoD screen-space optical camera feedback (0..1) */
  cameraShotPulse: number;
  cameraHeavyPulse: number;
  cameraHeatPulse: number;
  cameraFrostPulse: number;
  pointerLocked: boolean;
  muted: boolean;
  hits: number;
  criticalHits: number;
  shotsFired: number;
  streak: number;
  bestStreak: number;
  score: number;
  targetsCleared: number;
  floorNumber: number;
  floorName: string;
  floorBannerText: string | null;
  interactPrompt: string | null;
  interactPromptLocked: boolean;
  controlCenterLocked: boolean;
  floorExitOpen: boolean;
  remainingHostilesTotal: number;
  objectiveTitle: string;
  objectiveSubtext: string;
  objectiveAccent: 'cyan' | 'amber' | 'crimson';
  objectiveWaypoint: ObjectiveWaypointSnapshot | null;
  cameraYaw: number;
  /** Halo / COD reactive vitality & kinetic shield state */
  playerHp: number;
  playerMaxHp: number;
  playerShieldIntegrity: number;
  playerShieldGhost: number;
  playerShieldRecharging: boolean;
  playerBarShake: number;
  playerHitBearingRad: number;
  playerHitArcAlpha: number;
  playerHitsTaken: number;
  playerDamagePulse: number;
  playerDamageVignette: DirectionalDamageVignette;
  /** Live architectural tactical minimap telemetry */
  minimap: MinimapSnapshot;
  /** Phase 3: Floor 08 Interactive Tutorial & Live Combat Encounter state */
  tutorial: Floor08TutorialHudState;
  floor08Encounter: Floor08EncounterHudState;
}
