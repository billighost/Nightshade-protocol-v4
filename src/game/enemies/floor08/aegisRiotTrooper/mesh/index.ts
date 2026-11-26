import * as THREE from 'three';
import {
  createEnemyContactShadow,
  createEnemyHitboxMesh,
  type Floor08EnemyMaterials,
} from '../../../core/enemyMeshShared';
import { buildAegisLimbsAndWeapon, type AegisLimbsAndWeapon } from './limbsAndWeapon';
import { buildAegisTorsoAndHead, type AegisTorsoParts } from './torsoAndHead';
import { buildAegisShieldAndWeakpoint, type AegisShieldAndWeakpoint } from './weakpointRig';

export interface AegisMeshRig {
  root: THREE.Group;
  torsoParts: AegisTorsoParts;
  limbs: AegisLimbsAndWeapon;
  shieldRig: AegisShieldAndWeakpoint;
  hitboxes: THREE.Mesh[];
  flashArmorMat: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function buildAegisMeshRig(
  enemyId: string,
  mats: Floor08EnemyMaterials
): AegisMeshRig {
  const root = new THREE.Group();
  const flashArmorMat = mats.armorHeavy.clone();
  flashArmorMat.color.setHex(0x33455c);
  flashArmorMat.roughness = 0.68;
  flashArmorMat.metalness = 0.38;
  flashArmorMat.emissive = new THREE.Color(0x38e8ff);
  flashArmorMat.emissiveIntensity = 0;

  root.add(createEnemyContactShadow(0.72, mats.contactShadow));

  const torsoParts = buildAegisTorsoAndHead(mats, flashArmorMat);
  root.add(torsoParts.pelvis);

  const limbs = buildAegisLimbsAndWeapon(
    torsoParts.pelvis,
    torsoParts.torso,
    mats,
    flashArmorMat
  );
  // Mount curved hex-grid tower shield directly inside leftArm.elbow for dead-vertical phalanx alignment!
  const shieldRig = buildAegisShieldAndWeakpoint(enemyId, limbs.leftArm.elbow, mats);

  const bodyHitbox = createEnemyHitboxMesh(
    enemyId,
    'body',
    new THREE.CylinderGeometry(0.4, 0.36, 1.48, 10)
  );
  bodyHitbox.position.set(0, 0.22, 0);
  torsoParts.pelvis.add(bodyHitbox);

  const headHitbox = createEnemyHitboxMesh(
    enemyId,
    'head',
    new THREE.SphereGeometry(0.18, 10, 8)
  );
  headHitbox.position.set(0, 0.16, 0);
  torsoParts.head.add(headHitbox);

  return {
    root,
    torsoParts,
    limbs,
    shieldRig,
    hitboxes: [
      shieldRig.weakpointHitbox,
      shieldRig.shieldHitbox,
      headHitbox,
      bodyHitbox,
    ],
    flashArmorMat,
    dispose: () => {
      flashArmorMat.dispose();
      for (const d of torsoParts.disposables) d.dispose();
      for (const d of limbs.disposables) d.dispose();
      for (const d of shieldRig.disposables) d.dispose();
    },
  };
}
