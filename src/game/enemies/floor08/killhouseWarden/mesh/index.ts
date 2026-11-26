import * as THREE from 'three';
import {
  createEnemyContactShadow,
  createEnemyHitboxMesh,
  type Floor08EnemyMaterials,
} from '../../../core/enemyMeshShared';
import { buildWardenLimbsAndSmgs, type WardenLimbsAndSmgs } from './limbsAndWeapon';
import { buildWardenTorsoAndHead, type WardenTorsoParts } from './torsoAndHead';
import { buildWardenWeakpointRig, type WardenWeakpointAssembly } from './weakpointRig';

export interface WardenMeshRig {
  root: THREE.Group;
  torsoParts: WardenTorsoParts;
  limbs: WardenLimbsAndSmgs;
  weakpoint: WardenWeakpointAssembly;
  hitboxes: THREE.Mesh[];
  flashArmorMat: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function buildWardenMeshRig(
  enemyId: string,
  mats: Floor08EnemyMaterials
): WardenMeshRig {
  const root = new THREE.Group();
  const flashArmorMat = mats.armorDark.clone();
  flashArmorMat.color.setHex(0x282d3c);
  flashArmorMat.roughness = 0.58;
  flashArmorMat.metalness = 0.42;
  flashArmorMat.emissive = new THREE.Color(0xffb824);
  flashArmorMat.emissiveIntensity = 0;

  root.add(createEnemyContactShadow(0.66, mats.contactShadow));

  const torsoParts = buildWardenTorsoAndHead(mats, flashArmorMat);
  root.add(torsoParts.pelvis);

  const limbs = buildWardenLimbsAndSmgs(
    torsoParts.pelvis,
    torsoParts.torso,
    mats,
    flashArmorMat
  );
  const weakpoint = buildWardenWeakpointRig(enemyId, torsoParts.torso, mats);

  const bodyHitbox = createEnemyHitboxMesh(
    enemyId,
    'body',
    new THREE.CylinderGeometry(0.35, 0.31, 1.46, 10)
  );
  bodyHitbox.position.set(0, 0.21, 0);
  torsoParts.pelvis.add(bodyHitbox);

  const headHitbox = createEnemyHitboxMesh(
    enemyId,
    'head',
    new THREE.SphereGeometry(0.16, 10, 8)
  );
  headHitbox.position.set(0, 0.16, 0);
  torsoParts.head.add(headHitbox);

  return {
    root,
    torsoParts,
    limbs,
    weakpoint,
    hitboxes: [...weakpoint.weakpointHitboxes, headHitbox, bodyHitbox],
    flashArmorMat,
    dispose: () => {
      flashArmorMat.dispose();
      for (const d of torsoParts.disposables) d.dispose();
      for (const d of limbs.disposables) d.dispose();
      for (const d of weakpoint.disposables) d.dispose();
    },
  };
}
