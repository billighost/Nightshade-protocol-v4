import * as THREE from 'three';
import { getSharedWeaponMaterials } from '../materials';
import { buildSpectreFrameAndGrip } from './frameAndGrip';
import { buildSpectreSlideAndBarrel } from './slideAndBarrel';
import { buildSpectreSuppressor } from './suppressorAndMuzzle';

export interface SpectrePistolRig {
  root: THREE.Group;
  slide: THREE.Group;
  magazine: THREE.Group;
  trigger: THREE.Mesh;
  hammer: THREE.Mesh;
  muzzlePoint: THREE.Object3D;
  ejectionPoint: THREE.Object3D;
  laserBeam: THREE.Mesh;
  sightMat: THREE.MeshStandardMaterial;
}

/**
 * SPECTRE-9 Suppressed Tactical Sidearm — CoD MW Gunsmith modular build.
 * Subassemblies live in dedicated modules:
 * - `frameAndGrip.ts`: lower receiver, stippled grip, magwell, extended mag, trigger, LAM laser/light
 * - `slideAndBarrel.ts`: CNC reciprocating slide, fluted barrel, exposed chamber, hammer, RMR reflex optic
 * - `suppressorAndMuzzle.ts`: chunky octagonal carbon-weave SOCOM suppressor & bore
 *
 * Origin (0,0,0) seats cleanly inside the operative's right palm; barrel fires along -Z.
 */
export function createSpectrePistol(): SpectrePistolRig {
  const root = new THREE.Group();
  root.name = 'SPECTRE_9_PISTOL';

  const mats = getSharedWeaponMaterials();

  const { frameGroup, magazine, trigger, laserBeam } = buildSpectreFrameAndGrip(mats);
  const { slide, barrelGroup, hammer, ejectionPoint, sightMat } = buildSpectreSlideAndBarrel(mats);
  const { suppressorGroup, muzzlePoint } = buildSpectreSuppressor(mats);

  root.add(frameGroup);
  root.add(barrelGroup);
  root.add(slide);
  root.add(suppressorGroup);
  root.add(muzzlePoint);
  root.add(ejectionPoint);

  return {
    root,
    slide,
    magazine,
    trigger,
    hammer,
    muzzlePoint,
    ejectionPoint,
    laserBeam,
    sightMat,
  };
}
