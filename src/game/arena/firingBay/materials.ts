import * as THREE from 'three';
import type { ProceduralTextureSet } from '../../core/textures';

export interface ArenaMaterialPalette {
  floor: THREE.MeshStandardMaterial;
  grate: THREE.MeshStandardMaterial;
  bulkhead: THREE.MeshStandardMaterial;
  darkSteel: THREE.MeshStandardMaterial;
  concreteBarrier: THREE.MeshStandardMaterial;
  hazard: THREE.MeshStandardMaterial;
  cyanStrip: THREE.MeshStandardMaterial;
  amberStrip: THREE.MeshStandardMaterial;
  crateMat: THREE.MeshStandardMaterial;
  holoScreen: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function createArenaMaterials(textures: ProceduralTextureSet): ArenaMaterialPalette {
  const all: THREE.Material[] = [];
  const reg = <T extends THREE.Material>(m: T): T => {
    all.push(m);
    return m;
  };

  const floor = reg(
    new THREE.MeshStandardMaterial({
      color: 0x7a8594, // keeps dark moody concrete without bright white IBL blowout
      map: textures.concreteColor,
      roughnessMap: textures.concreteRoughness,
      bumpMap: textures.concreteBump,
      bumpScale: 0.028,
      roughness: 0.78,
      metalness: 0.12,
    })
  );

  const grate = reg(
    new THREE.MeshStandardMaterial({
      color: 0x8d99a8,
      map: textures.grateColor,
      bumpMap: textures.grateBump,
      bumpScale: 0.03,
      roughness: 0.52,
      metalness: 0.76,
    })
  );

  const bulkhead = reg(
    new THREE.MeshStandardMaterial({
      map: textures.bulkheadColor,
      bumpMap: textures.bulkheadBump,
      bumpScale: 0.035,
      roughness: 0.7,
      metalness: 0.45,
    })
  );

  const darkSteel = reg(
    new THREE.MeshStandardMaterial({
      color: 0x161d27,
      roughness: 0.86,
      metalness: 0.28,
    })
  );

  const concreteBarrier = reg(
    new THREE.MeshStandardMaterial({
      color: 0x262f3b,
      bumpMap: textures.concreteBump,
      bumpScale: 0.022,
      roughness: 0.86,
      metalness: 0.14,
    })
  );

  const hazard = reg(
    new THREE.MeshStandardMaterial({
      map: textures.hazardColor,
      roughness: 0.55,
      metalness: 0.25,
    })
  );

  const cyanStrip = reg(
    new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 2.3,
      roughness: 0.2,
      metalness: 0.1,
    })
  );

  const amberStrip = reg(
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 2.1,
      roughness: 0.2,
      metalness: 0.1,
    })
  );

  const crateMat = reg(
    new THREE.MeshStandardMaterial({
      color: 0x1e262f,
      roughness: 0.7,
      metalness: 0.35,
    })
  );

  const holoScreen = reg(
    new THREE.MeshStandardMaterial({
      map: textures.holoScreen,
      emissiveMap: textures.holoScreen,
      emissive: 0x22d3ee,
      emissiveIntensity: 1.05,
      roughness: 0.22,
      metalness: 0.15,
    })
  );

  return {
    floor,
    grate,
    bulkhead,
    darkSteel,
    concreteBarrier,
    hazard,
    cyanStrip,
    amberStrip,
    crateMat,
    holoScreen,
    dispose: () => {
      all.forEach((m) => m.dispose());
    },
  };
}
