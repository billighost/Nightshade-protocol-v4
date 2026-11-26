import * as THREE from 'three';
import type { ProceduralTextureSet } from '../../../core/textures';
import { FLOOR_CATALOG, type FloorNumber } from '../types';
import {
  makeBallisticPanelTexture,
  makeFloorStencilTexture,
  makeGreyboxGridTexture,
  makeLaneMarkerTexture,
} from './textures';
import type { HideoutMaterialRegistry } from './types';

export function createHideoutMaterials(
  textures?: ProceduralTextureSet | null
): HideoutMaterialRegistry {
  const disposableMats: THREE.Material[] = [];
  const disposableTex: THREE.Texture[] = [];

  const regMat = <T extends THREE.Material>(m: T): T => {
    disposableMats.push(m);
    return m;
  };

  const floorGridTex = makeGreyboxGridTexture('#2a323e', '#171d26', '#212935', 8, 8);
  const wallGridTex = makeGreyboxGridTexture('#374151', '#1e2633', '#2d3748', 4, 2);
  const lightWallTex = makeGreyboxGridTexture('#4a5668', '#2a3342', '#3d4859', 4, 2);
  const ballisticPanelTex = makeBallisticPanelTexture();
  if (floorGridTex) disposableTex.push(floorGridTex);
  if (wallGridTex) disposableTex.push(wallGridTex);
  if (lightWallTex) disposableTex.push(lightWallTex);
  if (ballisticPanelTex) disposableTex.push(ballisticPanelTex);

  const concreteFloor = regMat(
    new THREE.MeshStandardMaterial({
      color: floorGridTex ? 0xffffff : 0x2c3543,
      ...(floorGridTex ? { map: floorGridTex } : {}),
      ...(textures?.concreteBump ? { bumpMap: textures.concreteBump, bumpScale: 0.025 } : {}),
      roughness: 0.78,
      metalness: 0.12,
    })
  );

  const concreteWall = regMat(
    new THREE.MeshStandardMaterial({
      color: wallGridTex ? 0xffffff : 0x3b4657,
      ...(wallGridTex ? { map: wallGridTex } : {}),
      roughness: 0.84,
      metalness: 0.08,
    })
  );

  const concreteWallLight = regMat(
    new THREE.MeshStandardMaterial({
      color: lightWallTex ? 0xffffff : 0x526075,
      ...(lightWallTex ? { map: lightWallTex } : {}),
      roughness: 0.8,
      metalness: 0.1,
    })
  );

  const darkConcrete = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e2530,
      roughness: 0.88,
      metalness: 0.14,
    })
  );

  const structuralSteel = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x2a3442,
      roughness: 0.42,
      metalness: 0.78,
    })
  );

  const brushedMetal = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x526174,
      roughness: 0.34,
      metalness: 0.82,
    })
  );

  const catwalkGrate = regMat(
    new THREE.MeshStandardMaterial({
      color: textures?.grateColor ? 0xcbd5e1 : 0x3c4757,
      ...(textures?.grateColor ? { map: textures.grateColor } : {}),
      ...(textures?.grateBump ? { bumpMap: textures.grateBump, bumpScale: 0.03 } : {}),
      roughness: 0.48,
      metalness: 0.74,
    })
  );

  const stairTread = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x465466,
      roughness: 0.52,
      metalness: 0.56,
    })
  );

  const stairRiser = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x252e3b,
      roughness: 0.65,
      metalness: 0.45,
    })
  );

  const trimBand = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.38,
      metalness: 0.72,
    })
  );

  const glassPanel = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.16,
      roughness: 0.12,
      metalness: 0.18,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  const floorGlass = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x0284c7,
      emissiveIntensity: 0.2,
      roughness: 0.15,
      metalness: 0.22,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  const hazardStripe = regMat(
    new THREE.MeshStandardMaterial({
      color: textures?.hazardColor ? 0xffffff : 0xd97706,
      ...(textures?.hazardColor ? { map: textures.hazardColor } : {}),
      roughness: 0.58,
      metalness: 0.24,
    })
  );

  const ceilingLight = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0xe2f1ff,
      emissiveIntensity: 2.3,
      roughness: 0.2,
      metalness: 0.05,
    })
  );

  const abyssGlow = regMat(
    new THREE.MeshBasicMaterial({
      color: 0x0b2538,
    })
  );

  const cryoFrost = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.55,
      roughness: 0.22,
      metalness: 0.15,
      transparent: true,
      opacity: 0.78,
    })
  );

  const crateCover = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x4b5563,
      roughness: 0.72,
      metalness: 0.28,
    })
  );

  const ballisticPanel = regMat(
    new THREE.MeshStandardMaterial({
      color: ballisticPanelTex ? 0xffffff : 0x5c4d3c,
      ...(ballisticPanelTex ? { map: ballisticPanelTex } : {}),
      roughness: 0.86,
      metalness: 0.08,
    })
  );

  const armoredSteel = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x1b232e,
      roughness: 0.36,
      metalness: 0.84,
    })
  );

  const basaltTex = makeGreyboxGridTexture('#1c2536', '#0f1726', '#28364d', 3, 3);
  if (basaltTex) disposableTex.push(basaltTex);
  const basaltStone = regMat(
    new THREE.MeshStandardMaterial({
      color: basaltTex ? 0xffffff : 0x1e2736,
      ...(basaltTex ? { map: basaltTex } : {}),
      roughness: 0.74,
      metalness: 0.24,
    })
  );

  const marbleTex = makeGreyboxGridTexture('#c2d8e6', '#89a7bc', '#d8e9f4', 3, 3);
  if (marbleTex) disposableTex.push(marbleTex);
  const glacialMarble = regMat(
    new THREE.MeshStandardMaterial({
      color: marbleTex ? 0xffffff : 0xb9d2e2,
      ...(marbleTex ? { map: marbleTex } : {}),
      roughness: 0.58,
      metalness: 0.16,
    })
  );

  const auroraGold = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xe6ad46,
      emissive: 0x8a5410,
      emissiveIntensity: 0.72,
      roughness: 0.28,
      metalness: 0.82,
    })
  );

  const foundryTex = makeGreyboxGridTexture('#232026', '#131117', '#2f2a33', 4, 4);
  if (foundryTex) disposableTex.push(foundryTex);
  const foundryIron = regMat(
    new THREE.MeshStandardMaterial({
      color: foundryTex ? 0xffffff : 0x242128,
      ...(foundryTex ? { map: foundryTex } : {}),
      roughness: 0.54,
      metalness: 0.64,
    })
  );

  const amberAlloy = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xb8732a,
      roughness: 0.34,
      metalness: 0.78,
    })
  );

  const moltenGlow = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xff6b1a,
      emissive: 0xf97316,
      emissiveIntensity: 2.15,
      roughness: 0.24,
      metalness: 0.18,
    })
  );

  const obsidianTex = makeGreyboxGridTexture('#1d1921', '#0d0b10', '#2d2733', 3, 3);
  if (obsidianTex) disposableTex.push(obsidianTex);
  const obsidianBasalt = regMat(
    new THREE.MeshStandardMaterial({
      color: obsidianTex ? 0xffffff : 0x1a1620,
      ...(obsidianTex ? { map: obsidianTex } : {}),
      roughness: 0.72,
      metalness: 0.24,
    })
  );

  const boneStoneTex = makeGreyboxGridTexture('#8a8275', '#554f46', '#9e9688', 4, 4);
  if (boneStoneTex) disposableTex.push(boneStoneTex);
  const sacredBoneStone = regMat(
    new THREE.MeshStandardMaterial({
      color: boneStoneTex ? 0xffffff : 0x8a8275,
      ...(boneStoneTex ? { map: boneStoneTex } : {}),
      roughness: 0.8,
      metalness: 0.08,
    })
  );

  const sovereignGold = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xe3b149,
      emissive: 0x3b2204,
      emissiveIntensity: 0.3,
      roughness: 0.28,
      metalness: 0.84,
    })
  );

  const eclipseCrimson = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xcc1808,
      emissive: 0xe02400,
      emissiveIntensity: 1.75,
      roughness: 0.22,
      metalness: 0.14,
    })
  );

  const floorAccent = {} as Record<FloorNumber, THREE.MeshStandardMaterial>;
  for (const num of [1, 2, 3, 4, 5, 6, 7, 8] as FloorNumber[]) {
    const hex = FLOOR_CATALOG[num].accentHex;
    floorAccent[num] = regMat(
      new THREE.MeshStandardMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: 1.95,
        roughness: 0.24,
        metalness: 0.2,
      })
    );
  }

  const createStencilMaterial = (
    bigCode: string,
    title: string,
    accentHex: number,
    subtitle?: string
  ): THREE.MeshStandardMaterial => {
    const tex = makeFloorStencilTexture(bigCode, title, accentHex, subtitle);
    if (tex) disposableTex.push(tex);
    return regMat(
      new THREE.MeshStandardMaterial({
        color: tex ? 0xffffff : accentHex,
        ...(tex ? { map: tex } : {}),
        emissive: tex ? 0x0c1522 : accentHex,
        emissiveIntensity: tex ? 0.38 : 0.6,
        roughness: 0.52,
        metalness: 0.25,
      })
    );
  };

  const createLaneMarkerMaterial = (
    label: string,
    accentHex: number
  ): THREE.MeshStandardMaterial => {
    const tex = makeLaneMarkerTexture(label, accentHex);
    if (tex) disposableTex.push(tex);
    return regMat(
      new THREE.MeshStandardMaterial({
        color: tex ? 0xffffff : accentHex,
        ...(tex ? { map: tex } : {}),
        emissive: tex ? 0x0c1522 : accentHex,
        emissiveIntensity: 0.42,
        roughness: 0.48,
        metalness: 0.25,
      })
    );
  };

  return {
    concreteFloor,
    concreteWall,
    concreteWallLight,
    darkConcrete,
    structuralSteel,
    brushedMetal,
    catwalkGrate,
    stairTread,
    stairRiser,
    trimBand,
    glassPanel,
    floorGlass,
    hazardStripe,
    ceilingLight,
    abyssGlow,
    cryoFrost,
    crateCover,
    ballisticPanel,
    armoredSteel,
    basaltStone,
    glacialMarble,
    auroraGold,
    foundryIron,
    amberAlloy,
    moltenGlow,
    obsidianBasalt,
    sacredBoneStone,
    sovereignGold,
    eclipseCrimson,
    floorAccent,
    createStencilMaterial,
    createLaneMarkerMaterial,
    dispose: () => {
      for (const m of disposableMats) m.dispose();
      for (const t of disposableTex) t.dispose();
    },
  };
}
