import * as THREE from 'three';
import { createBeveledBox } from '../../core/sculptUtils';
import type { SharedWeaponMaterials } from '../materials';

export interface SpectreSuppressorAssembly {
  suppressorGroup: THREE.Group;
  muzzlePoint: THREE.Object3D;
}

/**
 * SPECTRE-9 Chunky Modular SOCOM/Osprey Tactical Suppressor.
 * Features threaded barrel collar, QD locking ring, octagonal carbon-weave sleeve,
 * recessed heat-dissipation ribs, heavy endcap, dark bore aperture, and muzzle anchor.
 */
export function buildSpectreSuppressor(mats: SharedWeaponMaterials): SpectreSuppressorAssembly {
  const suppressorGroup = new THREE.Group();
  suppressorGroup.name = 'SPECTRE9_SUPPRESSOR';

  // Threaded barrel extension & QD locking collar
  const threadCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0115, 0.0115, 0.018, 12),
    mats.machinedSteel
  );
  threadCollar.rotation.x = Math.PI / 2;
  threadCollar.position.set(0, 0.059, -0.148);
  suppressorGroup.add(threadCollar);

  const qdNut = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0175, 0.0175, 0.018, 8),
    mats.heatBluedSteel
  );
  qdNut.rotation.x = Math.PI / 2;
  qdNut.rotation.z = Math.PI / 8;
  qdNut.position.set(0, 0.059, -0.163);
  suppressorGroup.add(qdNut);

  // Chunky octagonal tactical baffle body (Osprey/SOCOM silhouette — reads unmistakably at 3rd-person distance!)
  const mainCan = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0168, 0.0172, 0.148, 8),
    mats.carbonFiber
  );
  mainCan.rotation.x = Math.PI / 2;
  mainCan.rotation.z = Math.PI / 8;
  mainCan.position.set(0, 0.059, -0.244);
  mainCan.castShadow = true;
  suppressorGroup.add(mainCan);

  // Under-slung offset baffle spine (iconic Osprey suppressor profile!)
  const baffleSpine = new THREE.Mesh(
    createBeveledBox(0.024, 0.015, 0.142, 0.0028),
    mats.parkerizedMetal
  );
  baffleSpine.position.set(0, 0.048, -0.244);
  suppressorGroup.add(baffleSpine);

  // 4 Machined titanium heat-dissipation rings along suppressor tube
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0186, 0.0186, 0.0075, 8),
      mats.cerakoteSteel
    );
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = Math.PI / 8;
    ring.position.set(0, 0.059, -0.184 - i * 0.036);
    suppressorGroup.add(ring);
  }

  // Front crenellated flash-hider endcap + recessed black bore aperture
  const endcap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0155, 0.0168, 0.014, 12),
    mats.heatBluedSteel
  );
  endcap.rotation.x = Math.PI / 2;
  endcap.position.set(0, 0.059, -0.322);
  suppressorGroup.add(endcap);

  const bore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0068, 0.0068, 0.008, 10),
    mats.boreVoid
  );
  bore.rotation.x = Math.PI / 2;
  bore.position.set(0, 0.059, -0.327);
  suppressorGroup.add(bore);

  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.name = 'SPECTRE9_MUZZLE_POINT';
  muzzlePoint.position.set(0, 0.059, -0.334);

  return {
    suppressorGroup,
    muzzlePoint,
  };
}
