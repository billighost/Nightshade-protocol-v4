import * as THREE from 'three';
import type { ProceduralTextureSet } from '../core/textures';
import type { ColliderRect } from '../core/types';
import {
  buildHeavyAmmoCrates,
  resetHeavyAmmoCrates,
  stepHeavyAmmoCrates,
  tryCollectAmmoCrate,
  type HeavyAmmoCrate,
} from './props/ammoCrates';
import { BAY_DIMENSIONS, buildBayArchitecture } from './firingBay/architecture';
import { createArenaMaterials } from './firingBay/materials';
import {
  buildBayTargets,
  resetBayTargets,
  stepBayTargets,
  type InteractiveTarget,
  type TargetKind,
} from './props/targets';

export type { HeavyAmmoCrate, InteractiveTarget, TargetKind };
export { tryCollectAmmoCrate };

export interface FiringBayArena {
  group: THREE.Group;
  colliders: ColliderRect[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  wallMeshes: THREE.Object3D[];
  targets: InteractiveTarget[];
  targetHitboxes: THREE.Object3D[];
  ammoCrates: HeavyAmmoCrate[];
  spawnPosition: THREE.Vector3;
  update: (dt: number, elapsed: number, cameraPosition?: THREE.Vector3) => void;
  resetTargets: () => void;
  dispose: () => void;
}

export function createCyberpunkFiringBay(textures: ProceduralTextureSet): FiringBayArena {
  const group = new THREE.Group();
  group.name = 'SECTOR_04_FIRING_BAY';

  const mats = createArenaMaterials(textures);
  const arch = buildBayArchitecture(group, mats);
  const tgt = buildBayTargets(group);
  const crateRes = buildHeavyAmmoCrates(group);

  const halfW = BAY_DIMENSIONS.width / 2;
  const halfD = BAY_DIMENSIONS.depth / 2;

  return {
    group,
    colliders: arch.colliders,
    bounds: {
      minX: -halfW + 0.5,
      maxX: halfW - 0.5,
      minZ: -halfD + 0.5,
      maxZ: halfD - 0.5,
    },
    wallMeshes: arch.wallMeshes,
    targets: tgt.targets,
    targetHitboxes: tgt.targetHitboxes,
    ammoCrates: crateRes.crates,
    spawnPosition: new THREE.Vector3(BAY_DIMENSIONS.spawnX, 0, BAY_DIMENSIONS.spawnZ),
    update: (dt, elapsed, cameraPosition) => {
      stepBayTargets(tgt.targets, dt, elapsed);
      stepHeavyAmmoCrates(crateRes.crates, dt, elapsed, cameraPosition);
    },
    resetTargets: () => {
      resetBayTargets(tgt.targets);
      resetHeavyAmmoCrates(crateRes.crates);
    },
    dispose: () => {
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
        }
      });
      mats.dispose();
      tgt.dispose();
      crateRes.dispose();
    },
  };
}
