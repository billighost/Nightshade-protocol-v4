import type * as THREE from 'three';
import type {
  ColliderBox3D,
  ExplosiveBarrelRig,
  JumpPadRig,
  RetractableBridgeRig,
  SecurityGateRig,
  ShootableLockRig,
  TacticalDoorRig,
  WalkableArcRamp,
  WalkableRamp,
  WalkableRingSlab,
  WalkableSlab,
  WorldSwitchRig,
} from '../types';

export interface FloorGeometryCollector {
  group: THREE.Group;
  boxes: ColliderBox3D[];
  slabs: WalkableSlab[];
  ramps: WalkableRamp[];
  arcRamps: WalkableArcRamp[];
  ringSlabs: WalkableRingSlab[];
  wallMeshes: THREE.Object3D[];
  tacticalDoors?: TacticalDoorRig[];
  retractableBridges?: RetractableBridgeRig[];
  securityGates?: SecurityGateRig[];
  shootableLocks?: ShootableLockRig[];
  jumpPads?: JumpPadRig[];
  worldSwitches?: WorldSwitchRig[];
  explosiveBarrels?: ExplosiveBarrelRig[];
  animatedSpinners?: Array<{ obj: THREE.Object3D; speed: number; axis?: 'x' | 'y' | 'z' }>;
}

export interface StraightStairOptions {
  /** Center X of stair flight */
  x: number;
  /** Center Z of stair flight */
  z: number;
  /** Clear walkable tread width perpendicular to travel direction */
  width: number;
  /** Horizontal run length along travel axis */
  length: number;
  /** Elevation at minAxis end */
  yStart: number;
  /** Elevation at maxAxis end */
  yEnd: number;
  axis: 'x' | 'z';
  /** Number of crisp visual treads (default auto-computed from height) */
  steps?: number;
  /** Guardrails on left/right sides (relative to min/max perpendicular axis) */
  railMinSide?: boolean;
  railMaxSide?: boolean;
  /** Optional target Three.js group (defaults to collector.group — useful for OcclusionCells!) */
  targetGroup?: THREE.Group;
  accentMat: THREE.Material;
}

export interface GuardrailRunOptions {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  /** Deck floor elevation the guardrail sits on */
  y: number;
  /** Rail height above deck (default 1.08m) */
  height?: number;
  /** Optional accent strip along deck fascia directly below the rail */
  accentMat?: THREE.Material;
  /** Optional host Three.js group (defaults to collector.group) */
  targetGroup?: THREE.Group;
  /** Whether to emit a solid waist-high ColliderBox3D blocking pass-through (default true) */
  includeCollider?: boolean;
}

export interface CurvedSpiralStairOptions {
  centerX: number;
  centerZ: number;
  /** Open central hole radius — `r < innerRadius` is a genuine gaping void! */
  innerRadius: number;
  outerRadius: number;
  /** Start angle in radians (atan2(z - centerZ, x - centerX)) */
  startAngle: number;
  /** End angle in radians (supports both CW and CCW sweeps!) */
  endAngle: number;
  yStart: number;
  yEnd: number;
  steps?: number;
  accentMat: THREE.Material;
  /** Adds waist-high safety collider & visual rail on the inner hole edge (leaving sightlines wide open!) */
  innerGuardrail?: boolean;
  outerGuardrail?: boolean;
  /** Optional host group (defaults to collector.group — ideal for OcclusionCells!) */
  targetGroup?: THREE.Group;
}
