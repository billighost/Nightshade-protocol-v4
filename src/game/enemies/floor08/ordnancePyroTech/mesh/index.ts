import * as THREE from 'three';
import {
  createEnemyHitboxMesh,
  type Floor08EnemyMaterials,
} from '../../../core/enemyMeshShared';
import { buildPyroLimbsAndCannon, type PyroLimbsAndCannon } from './limbsAndWeapon';
import { buildPyroTorsoAndHead, type PyroTorsoParts } from './torsoAndHead';
import { buildPyroWeakpointRig, type PyroWeakpointAssembly } from './weakpointRig';

export interface PyroMeshRig {
  root: THREE.Group;
  torsoParts: PyroTorsoParts;
  limbs: PyroLimbsAndCannon;
  weakpoint: PyroWeakpointAssembly;
  flashArmorMat: THREE.MeshStandardMaterial;
  hitboxes: THREE.Mesh[];
  dispose: () => void;
}

/**
 * Full AAA Sculpted Procedural Rig for FORGE-08 "PYRO-TECH" (Zone 2 Armory Mini-Boss).
 */
export function buildPyroMeshRig(enemyId: string, mats: Floor08EnemyMaterials): PyroMeshRig {
  const root = new THREE.Group();

  // Signature Scorched Ceramic Hazard-Orange / Burnt Industrial Ochre EOD Armor!
  const flashArmorMat = new THREE.MeshStandardMaterial({
    color: 0xd95f18,
    roughness: 0.46,
    metalness: 0.28,
    bumpMap: mats.armorHeavy.bumpMap,
    bumpScale: 0.012,
  });

  const torsoParts = buildPyroTorsoAndHead(mats, flashArmorMat);
  root.add(torsoParts.pelvis);

  const limbs = buildPyroLimbsAndCannon(
    torsoParts.pelvis,
    torsoParts.torso,
    mats,
    flashArmorMat
  );
  const weakpoint = buildPyroWeakpointRig(enemyId, torsoParts.torso, mats);

  const headHitbox = createEnemyHitboxMesh(
    enemyId,
    'head',
    new THREE.SphereGeometry(0.24, 10, 8)
  );
  headHitbox.position.set(0, 0.16, 0);
  torsoParts.head.add(headHitbox);

  const bodyHitbox = createEnemyHitboxMesh(
    enemyId,
    'body',
    new THREE.CapsuleGeometry(0.46, 0.96, 6, 10)
  );
  bodyHitbox.position.set(0, 0.98, 0);
  root.add(bodyHitbox);

  // Weakpoint checked FIRST so clean flank & shoulder-peak tank shots always score critical ruptures!
  const hitboxes: THREE.Mesh[] = [weakpoint.weakpointHitbox, headHitbox, bodyHitbox];

  const dispose = (): void => {
    flashArmorMat.dispose();
    for (const d of torsoParts.disposables) d.dispose();
    for (const d of limbs.disposables) d.dispose();
    for (const d of weakpoint.disposables) d.dispose();
    for (const hb of hitboxes) {
      hb.geometry.dispose();
      (hb.material as THREE.Material).dispose();
    }
  };

  return {
    root,
    torsoParts,
    limbs,
    weakpoint,
    flashArmorMat,
    hitboxes,
    dispose,
  };
}
