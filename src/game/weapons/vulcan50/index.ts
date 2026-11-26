import * as THREE from 'three';
import { getSharedWeaponMaterials } from '../materials';
import { buildVulcanBarrelAndBrake } from './barrelAndBrake';
import { buildVulcanOpticsAndMag } from './opticsAndMag';
import { buildVulcanReceiverAndStock } from './receiverAndStock';

export interface VulcanHeavyRig {
  root: THREE.Group;
  bolt: THREE.Mesh;
  magazine: THREE.Group;
  coilGlowMat: THREE.MeshStandardMaterial;
  scopeGlowMat: THREE.MeshStandardMaterial;
  muzzlePoint: THREE.Object3D;
  ejectionPoint: THREE.Object3D;
}

/**
 * VULCAN-50 Heavy .50-Cal Kinetic Battle Rifle / Marksman Cannon — CoD MW Gunsmith modular build (~0.84m).
 * Subassemblies live in dedicated modules:
 * - `receiverAndStock.ts`: Heavy billet .50-cal upper/lower receiver, fluted reciprocating bolt, recoil stock
 * - `barrelAndBrake.ts`: Quad-rail handguard with glowing amber kinetic rails, fluted .50 barrel,
 *   colossal dual-chamber slotted tank muzzle brake, ribbed foregrip & ballistic rangefinder
 * - `opticsAndMag.ts`: 34mm LPVO tactical scope, 45° canted backup red-dot & wide .50 box magazine
 *
 * Right palm seats at (0, 0, 0); left hand IK locks onto foregrip at (0, 0.002, -0.222); barrel fires along -Z.
 */
export function createVulcanHeavy(): VulcanHeavyRig {
  const root = new THREE.Group();
  root.name = 'VULCAN_50_HEAVY';

  const mats = getSharedWeaponMaterials();

  const { receiverGroup, bolt, ejectionPoint } = buildVulcanReceiverAndStock(mats);
  const { barrelGroup, coilGlowMat, muzzlePoint } = buildVulcanBarrelAndBrake(mats);
  const { opticsGroup, magazine, scopeGlowMat } = buildVulcanOpticsAndMag(mats);

  root.add(receiverGroup);
  root.add(barrelGroup);
  root.add(opticsGroup);
  root.add(magazine);
  root.add(muzzlePoint);
  root.add(ejectionPoint);

  return {
    root,
    bolt,
    magazine,
    coilGlowMat,
    scopeGlowMat,
    muzzlePoint,
    ejectionPoint,
  };
}
