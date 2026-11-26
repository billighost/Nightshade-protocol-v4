import * as THREE from 'three';
import {
  createEnemyContactShadow,
  createEnemyHitboxMesh,
  type Floor08EnemyMaterials,
} from '../../../core/enemyMeshShared';
import { buildBreacherLimbsAndWeapon, type BreacherLimbsAndWeapon } from './limbsAndWeapon';
import { buildBreacherTorsoAndHead, type BreacherTorsoParts } from './torsoAndHead';
import { buildBreacherWeakpointRig, type BreacherWeakpointAssembly } from './weakpointRig';

export interface BreacherMeshRig {
  root: THREE.Group;
  torsoParts: BreacherTorsoParts;
  limbs: BreacherLimbsAndWeapon;
  weakpoint: BreacherWeakpointAssembly;
  hitboxes: THREE.Mesh[];
  flashArmorMat: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function buildBreacherMeshRig(
  enemyId: string,
  mats: Floor08EnemyMaterials
): BreacherMeshRig {
  const root = new THREE.Group();
  const flashArmorMat = mats.armorDark.clone();
  flashArmorMat.emissive = new THREE.Color(0xffaa44);
  flashArmorMat.emissiveIntensity = 0;

  root.add(createEnemyContactShadow(0.56, mats.contactShadow));

  const torsoParts = buildBreacherTorsoAndHead(mats, flashArmorMat);
  root.add(torsoParts.pelvis);

  const limbs = buildBreacherLimbsAndWeapon(
    torsoParts.pelvis,
    torsoParts.torso,
    mats,
    flashArmorMat
  );
  const weakpoint = buildBreacherWeakpointRig(enemyId, torsoParts.torso, mats);

  const bodyHitbox = createEnemyHitboxMesh(
    enemyId,
    'body',
    new THREE.CylinderGeometry(0.34, 0.3, 1.34, 10)
  );
  bodyHitbox.position.set(0, 0.16, 0);
  torsoParts.pelvis.add(bodyHitbox);

  const headHitbox = createEnemyHitboxMesh(
    enemyId,
    'head',
    new THREE.SphereGeometry(0.18, 10, 8)
  );
  headHitbox.position.set(0, 0.17, 0);
  torsoParts.head.add(headHitbox);

  const hitboxes = [weakpoint.weakpointHitbox, headHitbox, bodyHitbox];

  return {
    root,
    torsoParts,
    limbs,
    weakpoint,
    hitboxes,
    flashArmorMat,
    dispose: () => {
      flashArmorMat.dispose();
      for (const d of torsoParts.disposables) d.dispose();
      for (const d of limbs.disposables) d.dispose();
      for (const d of weakpoint.disposables) d.dispose();
    },
  };
}
