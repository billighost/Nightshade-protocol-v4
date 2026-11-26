import type * as THREE from 'three';
import type { HeavyAmmoCrate } from '../props/ammoCrates';
import type { InteractiveTarget } from '../props/targets';

export type FloorNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const FLOOR_PITCH_METERS = 14.0;

export function getFloorBaseY(floor: FloorNumber): number {
  return (floor - 1) * FLOOR_PITCH_METERS;
}

export interface FloorMeta {
  number: FloorNumber;
  code: string;
  name: string;
  subtitle: string;
  baseY: number;
  ceilingHeight: number;
  accentHex: number;
  /** Which side the massive exit bulkhead door sits on: 'north' (-Z) for even floors, 'south' (+Z) for odd floors */
  exitSide: 'north' | 'south';
}

export const FLOOR_CATALOG: Record<FloorNumber, FloorMeta> = {
  8: {
    number: 8,
    code: '08',
    name: 'APEX TACTICAL PROVING COMPLEX',
    subtitle: 'Ops Briefing · Armory · Ballistic Hall · CQB Killhouse · Extraction Atrium',
    baseY: getFloorBaseY(8),
    ceilingHeight: 13.5,
    accentHex: 0x06b6d4,
    exitSide: 'north',
  },
  7: {
    number: 7,
    code: '07',
    name: 'SPIRAL WELL COMBAT NEXUS',
    subtitle: 'Rotunda · Barracks · Cyber-Server Vault · Cargo Bay · Coolant Turbines',
    baseY: getFloorBaseY(7),
    ceilingHeight: 12.7,
    accentHex: 0xf59e0b,
    exitSide: 'south',
  },
  6: {
    number: 6,
    code: '06',
    name: 'THE SUSPENDED MONOLITH ARCHIVE',
    subtitle: 'Brutalist Hanging Data Pylons & Cooling Trench',
    baseY: getFloorBaseY(6),
    ceilingHeight: 10.55,
    accentHex: 0x38bdf8,
    exitSide: 'north',
  },
  5: {
    number: 5,
    code: '05',
    name: 'WAR-GAMES AMPHITHEATER COMPLEX',
    subtitle: 'Coliseum · Sim-Deck · Mech-Bay · Orbital Array · Command Vault · Turbines',
    baseY: getFloorBaseY(5),
    ceilingHeight: 10.35,
    accentHex: 0xfb7185,
    exitSide: 'south',
  },
  4: {
    number: 4,
    code: '04',
    name: 'SKYBRIDGE CHASM COMPLEX',
    subtitle: 'Criss-Cross Canyon · Hydro Dam · Tram Foundry · Substation · Vault · Freight',
    baseY: getFloorBaseY(4),
    ceilingHeight: 10.15,
    accentHex: 0xf97316,
    exitSide: 'north',
  },
  3: {
    number: 3,
    code: '03',
    name: 'THE GLACIAL FORERUNNER CITADEL',
    subtitle: 'Sealed Threshold · Obsidian Cloister · Ziggurat · Glacial Crypt · Crown Reliquary',
    baseY: getFloorBaseY(3),
    ceilingHeight: 10.3,
    accentHex: 0x67e8f9,
    exitSide: 'south',
  },
  2: {
    number: 2,
    code: '02',
    name: 'THE VOLTAIC MAGLEV METROPOLIS',
    subtitle: 'Customs Airlock · Maglev Canyon · Smelter Foundry · Cooling Silo · Signal Tower',
    baseY: getFloorBaseY(2),
    ceilingHeight: 10.9,
    accentHex: 0xeab308,
    exitSide: 'north',
  },
  1: {
    number: 1,
    code: '01',
    name: 'THE ECLIPSE SOVEREIGN COLOSSEUM',
    subtitle: 'Omen Overlook · 24.6m Sunken Boss Sanctum · Spiral Bastions · Inner Vault',
    baseY: getFloorBaseY(1),
    ceilingHeight: 12.6,
    accentHex: 0xe11d48,
    exitSide: 'south',
  },
};

export interface ColliderBox3D {
  id?: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  /** When false, box is completely ignored by horizontal & support collision (e.g. open Bulkhead Door!) */
  active?: boolean;
  /** When true, player can land & stand on top of box.maxY */
  walkableTop?: boolean;
  tag?: string;
}

export interface WalkableSlab {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
  thickness?: number;
  /** When false, slab is retracted/disabled (e.g., an undeployed Retractable Hydraulic Skybridge!) */
  active?: boolean;
}

export interface WalkableRamp {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Height at minX (if axis === 'x') or minZ (if axis === 'z') */
  yStart: number;
  /** Height at maxX (if axis === 'x') or maxZ (if axis === 'z') */
  yEnd: number;
  axis: 'x' | 'z';
}

export interface WalkableArcRamp {
  centerX: number;
  centerZ: number;
  innerRadius: number;
  outerRadius: number;
  /** Start angle in radians (atan2(z - centerZ, x - centerX)), may be any real number */
  startAngle: number;
  /** End angle in radians; supports CW (endAngle < startAngle) or CCW (endAngle > startAngle) */
  endAngle: number;
  yStart: number;
  yEnd: number;
}

export interface WalkableRingSlab {
  centerX: number;
  centerZ: number;
  innerRadius: number;
  outerRadius: number;
  y: number;
  thickness?: number;
  /** Optional angular sector [startAngle, endAngle]; full 360° ring when omitted */
  startAngle?: number;
  endAngle?: number;
}

export interface CollisionWorld3D {
  boxes: ColliderBox3D[];
  slabs: WalkableSlab[];
  ramps: WalkableRamp[];
  arcRamps: WalkableArcRamp[];
  ringSlabs: WalkableRingSlab[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  minSafeY: number;
  fallbackSpawn: { x: number; y: number; z: number };
}

export interface PooledPointLightSpec {
  color: number;
  intensity: number;
  distance: number;
  x: number;
  /** Offset relative to floor baseY */
  yOffset: number;
  z: number;
}

export interface FloorLightPreset {
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  keyColor: number;
  keyIntensity: number;
  keyOffset: [number, number, number];
  fillColor: number;
  fillIntensity: number;
  fogColor: number;
  fogDensity: number;
  pointLights: PooledPointLightSpec[];
}

export interface OcclusionCell {
  id: string;
  group: THREE.Group;
  /** Player position within this trigger AABB (or within sightRadius) reveals the cell */
  triggerBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  center: { x: number; z: number };
  maxViewDistance: number;
}

export interface BulkheadDoorRig {
  floor: FloorNumber;
  root: THREE.Group;
  leftLeaf: THREE.Group;
  rightLeaf: THREE.Group;
  pistonRods: THREE.Mesh[];
  lockBolts: THREE.Mesh[];
  beaconMat: THREE.MeshStandardMaterial;
  seamMat: THREE.MeshStandardMaterial;
  collider: ColliderBox3D;
  raycastMeshes: THREE.Object3D[];
  leafSlideDistance: number;
  /** Direction along which leaves slide: 'x' for North/South doors, 'z' for East/West doors */
  slideAxis: 'x' | 'z';
  openRatio: number;
  setOpenRatio: (ratio: number, unlocked: boolean) => void;
}

export type ControlCenterLockoutMode = 'disabled' | 'ready' | 'activated';

export interface ControlCenterRig {
  floor: FloorNumber;
  root: THREE.Group;
  position: { x: number; y: number; z: number };
  interactRadius: number;
  promptLocked: string;
  promptUnlocked: string;
  beaconMat: THREE.MeshStandardMaterial;
  screenMat: THREE.MeshStandardMaterial;
  activated: boolean;
  lockoutMode: ControlCenterLockoutMode;
  setActivated: (active: boolean) => void;
  setLockoutState: (mode: ControlCenterLockoutMode) => void;
  updateVisuals: (elapsed: number) => void;
}

export interface ExpressLiftRig {
  id: string;
  floor: FloorNumber;
  targetFloor: FloorNumber;
  root: THREE.Group;
  position: { x: number; y: number; z: number };
  interactRadius: number;
  prompt: string;
  ringMesh: THREE.Mesh;
}

export type TacticalDoorMode = 'automatic' | 'jammed_roll';

export interface TacticalDoorRig {
  id: string;
  mode: TacticalDoorMode;
  root: THREE.Group;
  position: { x: number; y: number; z: number };
  width: number;
  height: number;
  /** 'x' = door spans along X (wall normal Z); 'z' = door spans along Z (wall normal X) */
  spanAxis: 'x' | 'z';
  triggerDistance: number;
  closeDistance: number;
  /** Maximum clear gap height for 'jammed_roll' shutters (e.g. 1.16m — blocks walk/crouch, clears dodge roll!) */
  jammedClearance: number;
  /** Current normalized opening animation progress [0..1] */
  openRatio: number;
  /** Target opening state (0 = closed, 1 = open or jammed-open) */
  targetRatio: number;
  /** True once jammed shutter has hit its mechanical stop during this open cycle */
  jamTriggered: boolean;
  /** Seconds elapsed since jam stop for damped metallic shudder animation */
  jamShakeTimer: number;
  collider: ColliderBox3D;
  raycastMeshes: THREE.Object3D[];
  applyVisuals: (elapsed: number) => void;
}

export interface RetractableBridgeRig {
  id: string;
  label: string;
  root: THREE.Group;
  deckGroup: THREE.Group;
  slab: WalkableSlab;
  railColliders: ColliderBox3D[];
  raycastMeshes: THREE.Object3D[];
  statusMat: THREE.MeshStandardMaterial;
  /** Current extension [0 = retracted, 1 = fully extended] */
  deployRatio: number;
  /** Target extension (0 or 1) */
  targetRatio: number;
  /** True once player triggered extension */
  deployed: boolean;
  applyVisuals: () => void;
}

export interface SecurityGateRig {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  /** Helpful HUD cue when player approaches this sealed gate */
  lockedHint: string;
  root: THREE.Group;
  collider: ColliderBox3D;
  raycastMeshes: THREE.Object3D[];
  statusMat: THREE.MeshStandardMaterial;
  openRatio: number;
  targetRatio: number;
  unlocked: boolean;
  applyVisuals: () => void;
}

export interface ShootableLockRig {
  id: string;
  /** Banner text displayed when player shoots and shatters this security relay */
  bannerText: string;
  root: THREE.Group;
  hitbox: THREE.Mesh;
  coreMat: THREE.MeshStandardMaterial;
  destroyed: boolean;
  /** Optional linked SecurityGateRig id to unlock */
  unlockGateId?: string;
  /** Optional linked RetractableBridgeRig id to deploy */
  deployBridgeId?: string;
  applyVisuals: (elapsed: number) => void;
}

export interface JumpPadRig {
  id: string;
  root: THREE.Group;
  x: number;
  y: number;
  z: number;
  radius: number;
  launchVy: number;
  launchVx: number;
  launchVz: number;
  cooldown: number;
  ringMat: THREE.MeshStandardMaterial;
  applyVisuals: (elapsed: number) => void;
}

export interface WorldSwitchRig {
  id: string;
  root: THREE.Group;
  x: number;
  y: number;
  z: number;
  interactRadius: number;
  promptLocked: string;
  promptActivated: string;
  bannerText: string;
  activated: boolean;
  deployBridgeId?: string;
  unlockGateId?: string;
  beaconMat: THREE.MeshStandardMaterial;
  applyVisuals: () => void;
}

export interface ExplosiveBarrelRig {
  id: string;
  root: THREE.Group;
  hitbox: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  blastRadius: number;
  collider: ColliderBox3D;
  glowMat: THREE.MeshStandardMaterial;
  detonated: boolean;
  respawnTimer: number;
  applyVisuals: (elapsed: number) => void;
}

export interface FloorBuildResult {
  meta: FloorMeta;
  group: THREE.Group;
  detailGroup: THREE.Group;
  occlusionCells: OcclusionCell[];
  boxes: ColliderBox3D[];
  slabs: WalkableSlab[];
  ramps: WalkableRamp[];
  arcRamps: WalkableArcRamp[];
  ringSlabs: WalkableRingSlab[];
  wallMeshes: THREE.Object3D[];
  targets: InteractiveTarget[];
  targetHitboxes: THREE.Object3D[];
  ammoCrates: HeavyAmmoCrate[];
  exitDoor: BulkheadDoorRig;
  /** Optional arrival bulkhead shutter on entry portal that seals shut behind the player on arrival */
  arrivalDoor?: BulkheadDoorRig;
  /** Interior motorized proximity sliding doors & jammed dodge-roll blast shutters */
  tacticalDoors?: TacticalDoorRig[];
  /** Interactive retractable hydraulic skybridges */
  retractableBridges?: RetractableBridgeRig[];
  /** Locked armored security gates unlocked by shootable relays or switches */
  securityGates?: SecurityGateRig[];
  /** Shootable security relay boxes that shatter when hit to open gates or extend bridges */
  shootableLocks?: ShootableLockRig[];
  /** Pneumatic tactical jump-boost pads launching operatives to upper tiers */
  jumpPads?: JumpPadRig[];
  /** Interactive [E] mechanical world switches (bridge extensions, shortcut overrides) */
  worldSwitches?: WorldSwitchRig[];
  /** Shootable pressurized plasma hazard barrels triggering chain-reaction shockwave blasts */
  explosiveBarrels?: ExplosiveBarrelRig[];
  /** Continuous lightweight kinetic props (spinning turbine rotors, telemetry scanner halos) */
  animatedSpinners?: Array<{ obj: THREE.Object3D; speed: number; axis?: 'x' | 'y' | 'z' }>;
  controlCenter: ControlCenterRig;
  expressLift?: ExpressLiftRig;
  lightPreset: FloorLightPreset;
  spawnPoint: { x: number; y: number; z: number; yaw: number };
  /** Optional per-floor horizontal safety bounds (defaults to standard hideout envelope when omitted) */
  bounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Optional per-floor minimum safe Y elevation before respawn (for deep sunken boss colosseums) */
  minSafeY?: number;
  /** Entry threshold box inside this floor's chamber; stepping here triggers the previous floor's door to seal & unload */
  entryThreshold: { minX: number; maxX: number; minZ: number; maxZ: number; maxY: number };
  dispose: () => void;
}
