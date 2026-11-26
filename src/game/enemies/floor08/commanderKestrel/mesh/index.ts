import * as THREE from 'three';
import {
  createEnemyContactShadow,
  createEnemyHitboxMesh,
  type Floor08EnemyMaterials,
} from '../../../core/enemyMeshShared';
import { buildKestrelLimbsAndWeapons, type KestrelLimbsAndWeapons } from './limbsAndWeapon';
import { buildKestrelTorsoAndHead, type KestrelTorsoParts } from './torsoAndHead';
import { buildKestrelWeakpointRig, type KestrelWeakpointAssembly } from './weakpointRig';

export interface KestrelMeshRig {
  root: THREE.Group;
  torsoParts: KestrelTorsoParts;
  limbs: KestrelLimbsAndWeapons;
  weakpoint: KestrelWeakpointAssembly;
  hitboxes: THREE.Mesh[];
  flashArmorMat: THREE.MeshStandardMaterial;
  getVisorGlintWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  dispose: () => void;
}

export function buildKestrelMeshRig(
  enemyId: string,
  mats: Floor08EnemyMaterials
): KestrelMeshRig {
  const root = new THREE.Group();

  // Satin Obsidian-Titanium boss armor material with Imperial Gold hit-flash response
  const flashArmorMat = new THREE.MeshStandardMaterial({
    color: 0x1b202b,
    roughness: 0.38,
    metalness: 0.64,
    bumpMap: mats.armorDark.bumpMap,
    bumpScale: 0.012,
    emissive: new THREE.Color(0xffc424),
    emissiveIntensity: 0,
  });

  root.add(createEnemyContactShadow(0.92, mats.contactShadow));

  const torsoParts = buildKestrelTorsoAndHead(mats, flashArmorMat);
  root.add(torsoParts.pelvis);

  const limbs = buildKestrelLimbsAndWeapons(
    torsoParts.pelvis,
    torsoParts.torso,
    mats,
    flashArmorMat,
    torsoParts.goldMat,
    torsoParts.crimsonMat
  );
  const weakpoint = buildKestrelWeakpointRig(
    enemyId,
    torsoParts.torso,
    mats,
    flashArmorMat,
    torsoParts.goldMat
  );

  const bodyHitbox = createEnemyHitboxMesh(
    enemyId,
    'body',
    new THREE.CylinderGeometry(0.42, 0.36, 1.66, 10)
  );
  bodyHitbox.position.set(0, 0.25, 0);
  torsoParts.pelvis.add(bodyHitbox);

  const headHitbox = createEnemyHitboxMesh(
    enemyId,
    'head',
    new THREE.SphereGeometry(0.19, 10, 8)
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
    getVisorGlintWorldPos: (out: THREE.Vector3) =>
      torsoParts.visorGlintAnchor.getWorldPosition(out),
    dispose: () => {
      flashArmorMat.dispose();
      for (const d of torsoParts.disposables) d.dispose();
      for (const d of limbs.disposables) d.dispose();
      for (const d of weakpoint.disposables) d.dispose();
    },
  };
}
