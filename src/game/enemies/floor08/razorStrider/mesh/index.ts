import * as THREE from 'three';
import type { Floor08EnemyMaterials } from '../../../core/enemyMeshShared';
import { buildStriderLimbsAndWeapon, type StriderLimbParts } from './limbsAndWeapon';
import { buildStriderTorsoAndHead, type StriderTorsoParts } from './torsoAndHead';
import { buildStriderWeakpointRig, type StriderWeakpointParts } from './weakpointRig';

export interface RazorStriderMeshRig {
  root: THREE.Group;
  torso: StriderTorsoParts;
  limbs: StriderLimbParts;
  weakpoint: StriderWeakpointParts;
  flashArmorMat: THREE.MeshStandardMaterial;
  hitboxes: THREE.Mesh[];
  dispose: () => void;
}

export function buildStriderMeshRig(
  enemyId: string,
  mats: Floor08EnemyMaterials
): RazorStriderMeshRig {
  const root = new THREE.Group();
  const flashArmorMat = mats.armorDark.clone();
  flashArmorMat.emissive.setHex(0xffffff);
  flashArmorMat.emissiveIntensity = 0;

  const torso = buildStriderTorsoAndHead(enemyId, mats, flashArmorMat);
  root.add(torso.pelvisGroup);

  const limbs = buildStriderLimbsAndWeapon(
    torso.pelvisGroup,
    torso.chestGroup,
    mats,
    flashArmorMat
  );
  const weakpoint = buildStriderWeakpointRig(
    enemyId,
    root,
    torso.chestGroup,
    mats,
    flashArmorMat
  );

  const hitboxes = [...torso.hitboxes, weakpoint.hitbox];

  return {
    root,
    torso,
    limbs,
    weakpoint,
    flashArmorMat,
    hitboxes,
    dispose: () => {
      flashArmorMat.dispose();
      for (const d of torso.disposables) d.dispose();
      for (const d of limbs.disposables) d.dispose();
      for (const d of weakpoint.disposables) d.dispose();
    },
  };
}
