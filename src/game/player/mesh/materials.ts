import * as THREE from 'three';
import type { ProceduralTextureSet } from '../../core/textures';

/**
 * AAA Raw & Battle-Worn PBR Material Palette for the Helmeted Spec-Ops Stealth Operative:
 * - Raw sandblasted matte ceramic/carbon ballistic composite (ZERO glossy plastic sheen!)
 * - Dedicated Crye-G3 Ripstop Tactical Combat Trouser fabric with double-needle seams & wrinkles
 * - Matte Cordura combat shirt undersuit with subtle ballistic hex-weave & fabric grain
 * - Dry heavy Cordura webbing, MOLLE straps, utility pouches & belt
 * - Parkerized matte gunmetal hardware (no mirror-chrome shine)
 * - Weathered suede/leather combat boots & lugged vulcanized rubber soles
 */
export interface OperativeMaterialPalette {
  /** Primary raw sandblasted matte ballistic composite armor (helmet dome, chest plates, pauldrons, shin greaves) */
  armorPrimary: THREE.MeshStandardMaterial;
  /** Secondary darker weathered ceramic-carbon armor trim (respirator chin guard, elbow cups, knee rims, straps) */
  armorSecondary: THREE.MeshStandardMaterial;
  /** Raw matte Cordura combat shirt undersuit (torso & slightly creased sleeves) */
  hexUndersuit: THREE.MeshStandardMaterial;
  /** Crye-G3 Ripstop Tactical Combat Trouser cloth (visible grid weave, seams, wrinkles, bone-dry matte!) */
  tacticalTrouser: THREE.MeshStandardMaterial;
  /** Matte ribbed flexible stretch ballistic gussets (neck gaiter, knee accordion panels, glove palms) */
  ribbedFlex: THREE.MeshStandardMaterial;
  /** Heavy dry Cordura tactical webbing (utility belt, MOLLE loops, pouches, holster & calf straps) */
  webbing: THREE.MeshStandardMaterial;
  /** Weathered parkerized dark gunmetal hardware (optic bezels, ARC rails, cobra buckle, rivets, fasteners) */
  gunmetal: THREE.MeshStandardMaterial;
  /** Recessed dark smoked inner optic backing */
  opticDarkGlass: THREE.MeshStandardMaterial;
  /** Glowing deep ruby-crimson twin helmet optics & wrist-comm status LED */
  crimsonOpticGlow: THREE.MeshStandardMaterial;
  /** Matte recessed tactical crimson armor seam piping */
  crimsonPiping: THREE.MeshStandardMaterial;
  /** Raw weathered matte tactical combat boot leather & heavy lugged rubber sole */
  bootLeather: THREE.MeshStandardMaterial;
  bootRubber: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function createOperativeMaterials(
  textures: ProceduralTextureSet
): OperativeMaterialPalette {
  const all: THREE.Material[] = [];
  const reg = <T extends THREE.Material>(m: T): T => {
    all.push(m);
    return m;
  };

  // Raw sandblasted battle-worn matte ballistic composite (roughness 0.80..0.96 via map, metalness 0.14 — ZERO plastic gloss!)
  const armorPrimary = reg(
    new THREE.MeshStandardMaterial({
      color: 0xc2cbd6,
      map: textures.armorPlateColor,
      normalMap: textures.armorPlateNormal,
      normalScale: new THREE.Vector2(1.05, 1.05),
      roughnessMap: textures.armorPlateRoughness,
      roughness: 1.0,
      metalness: 0.14,
    })
  );

  // Darker weathered ceramic-slate armor trim, rails, faceplate & pouch flaps
  const armorSecondary = reg(
    new THREE.MeshStandardMaterial({
      color: 0x737d8c,
      map: textures.armorPlateColor,
      normalMap: textures.armorPlateNormal,
      normalScale: new THREE.Vector2(0.95, 0.95),
      roughnessMap: textures.armorPlateRoughness,
      roughness: 1.0,
      metalness: 0.16,
    })
  );

  // Raw matte Cordura tactical combat shirt undersuit (torso & sleeves)
  const hexUndersuit = reg(
    new THREE.MeshStandardMaterial({
      color: 0xbac3ce,
      map: textures.hexCarbonColor,
      normalMap: textures.hexCarbonNormal,
      normalScale: new THREE.Vector2(0.88, 0.88),
      roughnessMap: textures.hexCarbonRoughness,
      roughness: 1.0,
      metalness: 0.02,
    })
  );

  // Crye-G3 Ripstop Tactical Combat Trousers — bone-dry matte cloth with crisp weave, seams & deep wrinkles!
  const tacticalTrouser = reg(
    new THREE.MeshStandardMaterial({
      color: 0xc2cbd4,
      map: textures.tacticalTrouserColor,
      normalMap: textures.tacticalTrouserNormal,
      normalScale: new THREE.Vector2(1.45, 1.45),
      roughnessMap: textures.tacticalTrouserRoughness,
      roughness: 1.0,
      metalness: 0.01,
    })
  );

  // Matte ribbed stretch accordion fabric (neck gaiter, above-knee flex bellows, glove palms)
  const ribbedFlex = reg(
    new THREE.MeshStandardMaterial({
      color: 0x1d232b,
      map: textures.molleColor,
      normalMap: textures.molleNormal,
      normalScale: new THREE.Vector2(0.95, 0.95),
      roughness: 0.94,
      metalness: 0.03,
    })
  );

  // Heavy dry Cordura webbing (utility belt, MOLLE loops, cargo flaps, thigh/calf straps)
  const webbing = reg(
    new THREE.MeshStandardMaterial({
      color: 0x2a313b,
      map: textures.molleColor,
      normalMap: textures.molleNormal,
      normalScale: new THREE.Vector2(1.05, 1.05),
      roughness: 0.93,
      metalness: 0.04,
    })
  );

  // Weathered parkerized dark gunmetal hardware (raw matte anodized finish, ZERO chrome bar reflections!)
  const gunmetal = reg(
    new THREE.MeshStandardMaterial({
      color: 0x454e5c,
      map: textures.cyberColor,
      normalMap: textures.cyberNormal,
      normalScale: new THREE.Vector2(0.75, 0.75),
      roughness: 0.72,
      metalness: 0.42,
    })
  );

  // Deep smoked recessed orbital socket lens housing
  const opticDarkGlass = reg(
    new THREE.MeshStandardMaterial({
      color: 0x0c0406,
      roughness: 0.22,
      metalness: 0.55,
    })
  );

  // Deep menacing ruby-crimson glowing twin helmet optics & wrist-comm status LED
  const crimsonOpticGlow = reg(
    new THREE.MeshStandardMaterial({
      color: 0x8f0814,
      emissive: 0xdc1428,
      emissiveIntensity: 1.5,
      roughness: 0.22,
      metalness: 0.14,
    })
  );

  // Subtle recessed matte tactical crimson seam piping
  const crimsonPiping = reg(
    new THREE.MeshStandardMaterial({
      color: 0x8f1520,
      emissive: 0x620810,
      emissiveIntensity: 0.24,
      roughness: 0.82,
      metalness: 0.08,
    })
  );

  // Raw weathered matte tactical suede/leather combat boots & vulcanized rubber sole
  const bootLeather = reg(
    new THREE.MeshStandardMaterial({
      color: 0x8a929d,
      map: textures.leatherColor,
      normalMap: textures.leatherNormal,
      normalScale: new THREE.Vector2(1.25, 1.25),
      roughnessMap: textures.leatherRoughness,
      roughness: 0.98,
      metalness: 0.04,
    })
  );

  const bootRubber = reg(
    new THREE.MeshStandardMaterial({
      color: 0x171c23,
      roughness: 0.95,
      metalness: 0.03,
    })
  );

  return {
    armorPrimary,
    armorSecondary,
    hexUndersuit,
    tacticalTrouser,
    ribbedFlex,
    webbing,
    gunmetal,
    opticDarkGlass,
    crimsonOpticGlow,
    crimsonPiping,
    bootLeather,
    bootRubber,
    dispose: () => {
      all.forEach((m) => m.dispose());
    },
  };
}
