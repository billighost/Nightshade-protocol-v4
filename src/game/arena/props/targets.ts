import * as THREE from 'three';

export type TargetKind =
  | 'dummy_body'
  | 'dummy_head'
  | 'steel_plate'
  | 'canister'
  | 'hover_drone';

export interface InteractiveTarget {
  id: string;
  kind: TargetKind;
  root: THREE.Group;
  hitboxMesh: THREE.Mesh;
  hingeGroup?: THREE.Group;
  hp: number;
  maxHp: number;
  downTimer: number;
  flashTimer: number;
  baseEmissive: number;
  material: THREE.MeshStandardMaterial;
  patrolOrigin?: THREE.Vector3;
  patrolPhase?: number;
  patrolAmp?: number;
}

export interface TargetsBuildResult {
  targets: InteractiveTarget[];
  targetHitboxes: THREE.Object3D[];
  dispose: () => void;
}

export interface TargetLayoutSpecs {
  dummies?: Array<{ id: string; x: number; y: number; z: number; rotY?: number }>;
  steelPlates?: Array<{ id: string; x: number; y: number; z: number; rotY?: number }>;
  canisters?: Array<{ id: string; x: number; y: number; z: number }>;
  drones?: Array<{ id: string; x: number; y: number; z: number; amp: number; phase: number; axis?: 'x' | 'z' | 'orbit' }>;
}

/**
 * Builds true human-scale interactive range targets positioned at realistic CQB/mid-bay distances.
 */
export function buildBayTargets(group: THREE.Group): TargetsBuildResult {
  return buildTargetsFromSpecs(group, {
    dummies: [
      { x: -3.2, y: 0, z: 1.6, id: 'dummy_near_l' },
      { x: 3.2, y: 0, z: 1.6, id: 'dummy_near_r' },
      { x: 0.0, y: 0, z: -3.4, id: 'dummy_mid_c' },
      { x: -4.2, y: 0, z: -8.2, id: 'dummy_far_l' },
      { x: 4.2, y: 0, z: -8.2, id: 'dummy_far_r' },
    ],
    steelPlates: [
      { id: 'steel_plate_0', x: -2.4, y: 0, z: -11.4 },
      { id: 'steel_plate_1', x: 0, y: 0, z: -11.4 },
      { id: 'steel_plate_2', x: 2.4, y: 0, z: -11.4 },
    ],
    canisters: [
      { id: 'canister_0', x: -5.2, y: 0, z: -1.6 },
      { id: 'canister_1', x: 5.2, y: 0, z: -1.6 },
      { id: 'canister_2', x: 0.0, y: 0, z: -7.8 },
    ],
    drones: [
      { id: 'drone_mid', x: 0, y: 2.65, z: -2.2, amp: 5.0, phase: 0 },
      { id: 'drone_far', x: 0, y: 2.95, z: -9.4, amp: 6.2, phase: Math.PI * 0.75 },
    ],
  });
}

export function buildTargetsFromSpecs(
  _group: THREE.Group,
  _specs: TargetLayoutSpecs
): TargetsBuildResult {
  // All legacy blue hover drones and blue shooting-gallery target dummies have been removed across Floors 01-08
  // so every floor is a dedicated combat space for Phase 3 unique enemies, mini-bosses, and floor bosses.
  return {
    targets: [],
    targetHitboxes: [],
    dispose: () => {},
  };
}

export function stepBayTargets(
  targets: InteractiveTarget[],
  dt: number,
  elapsed: number
): void {
  for (const t of targets) {
    if (t.flashTimer > 0) {
      t.flashTimer = Math.max(0, t.flashTimer - dt);
      t.material.emissiveIntensity = t.flashTimer > 0 ? 4.2 : t.baseEmissive;
    }

    if (t.kind === 'hover_drone' && t.patrolOrigin && t.patrolAmp !== undefined) {
      if (t.downTimer > 0) {
        t.downTimer = Math.max(0, t.downTimer - dt);
        t.root.visible = false;
        if (t.downTimer === 0) {
          t.hp = t.maxHp;
          t.root.visible = true;
        }
      } else {
        const p = elapsed * 0.95 + (t.patrolPhase ?? 0);
        const axis = t.root.userData.patrolAxis as 'x' | 'z' | 'orbit' | undefined;
        if (axis === 'orbit') {
          t.root.position.x = t.patrolOrigin.x + Math.cos(p * 0.65) * t.patrolAmp;
          t.root.position.z = t.patrolOrigin.z + Math.sin(p * 0.65) * t.patrolAmp;
          t.root.position.y = t.patrolOrigin.y + Math.sin(p * 1.8) * 0.38;
          t.root.rotation.y = -p * 0.65;
        } else if (axis === 'z') {
          t.root.position.z = t.patrolOrigin.z + Math.sin(p) * t.patrolAmp;
          t.root.position.y = t.patrolOrigin.y + Math.sin(p * 2.1) * 0.25;
          t.root.rotation.y = Math.sin(p) * 0.24;
        } else {
          t.root.position.x = t.patrolOrigin.x + Math.sin(p) * t.patrolAmp;
          t.root.position.y = t.patrolOrigin.y + Math.sin(p * 2.1) * 0.22;
          t.root.rotation.y = Math.sin(p) * 0.24;
        }
      }
      continue;
    }

    if (t.kind === 'canister') {
      if (t.downTimer > 0) {
        t.downTimer = Math.max(0, t.downTimer - dt);
        t.root.visible = false;
        if (t.downTimer === 0) {
          t.hp = t.maxHp;
          t.root.visible = true;
        }
      }
      continue;
    }

    if (t.hingeGroup) {
      if (t.downTimer > 0) {
        t.downTimer = Math.max(0, t.downTimer - dt);
        t.hingeGroup.rotation.x += (-Math.PI * 0.48 - t.hingeGroup.rotation.x) * Math.min(1, dt * 14);
        if (t.downTimer === 0) {
          t.hp = t.maxHp;
        }
      } else {
        t.hingeGroup.rotation.x += (0 - t.hingeGroup.rotation.x) * Math.min(1, dt * 10);
      }
    }
  }
}

export function resetBayTargets(targets: InteractiveTarget[]): void {
  for (const t of targets) {
    t.hp = t.maxHp;
    t.downTimer = 0;
    t.flashTimer = 0;
    t.material.emissiveIntensity = t.baseEmissive;
    t.root.visible = true;
    if (t.hingeGroup) t.hingeGroup.rotation.x = 0;
  }
}
