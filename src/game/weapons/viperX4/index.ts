import * as THREE from 'three';
import { getSharedWeaponMaterials } from '../materials';
import { buildViperHandguardAndBarrel } from './handguardAndBarrel';
import { buildViperOpticsAndMagazine } from './opticsAndMagazine';
import { buildViperReceiverAndStock } from './receiverAndStock';

export interface ViperSmgRig {
  root: THREE.Group;
  bolt: THREE.Mesh;
  magazine: THREE.Group;
  thermalCoreMat: THREE.MeshStandardMaterial;
  ventFlapL: THREE.Group;
  ventFlapR: THREE.Group;
  muzzlePoint: THREE.Object3D;
  ejectionPoint: THREE.Object3D;
  ventPoint: THREE.Object3D;
}

/**
 * VIPER-X4 Tactical Rail-SMG / PDW — CoD MW Gunsmith modular build (~0.66m overall).
 * Subassemblies live in dedicated modules:
 * - `receiverAndStock.ts`: CNC billet upper/lower receiver, reciprocating bolt, brass deflector, PDW stock
 * - `handguardAndBarrel.ts`: M-LOK quad-rail handguard, cryo-vents, 3-port compensator brake, foregrip, PEQ-15 laser
 * - `opticsAndMagazine.ts`: EOTech holographic weapon sight, BUIS, translucent extended mag with brass rounds
 *
 * Right palm seats at (0,0,0); left hand IK locks onto foregrip at (0, 0.002, -0.212); barrel fires along -Z.
 */
export function createViperSmg(): ViperSmgRig {
  const root = new THREE.Group();
  root.name = 'VIPER_X4_SMG';

  const mats = getSharedWeaponMaterials();

  const { receiverGroup, bolt, ejectionPoint } = buildViperReceiverAndStock(mats);
  const {
    handguardGroup,
    ventFlapL,
    ventFlapR,
    thermalCoreMat,
    muzzlePoint,
    ventPoint,
  } = buildViperHandguardAndBarrel(mats);
  const { opticsGroup, magazine } = buildViperOpticsAndMagazine(mats);

  root.add(receiverGroup);
  root.add(handguardGroup);
  root.add(opticsGroup);
  root.add(magazine);
  root.add(muzzlePoint);
  root.add(ejectionPoint);
  root.add(ventPoint);

  return {
    root,
    bolt,
    magazine,
    thermalCoreMat,
    ventFlapL,
    ventFlapR,
    muzzlePoint,
    ejectionPoint,
    ventPoint,
  };
}
