import type * as THREE from 'three';
import type { FloorNumber } from '../types';

export interface HideoutMaterialRegistry {
  // Architectural greybox core materials (shared across all 8 floors!)
  concreteFloor: THREE.MeshStandardMaterial;
  concreteWall: THREE.MeshStandardMaterial;
  concreteWallLight: THREE.MeshStandardMaterial;
  darkConcrete: THREE.MeshStandardMaterial;
  structuralSteel: THREE.MeshStandardMaterial;
  brushedMetal: THREE.MeshStandardMaterial;
  catwalkGrate: THREE.MeshStandardMaterial;
  stairTread: THREE.MeshStandardMaterial;
  stairRiser: THREE.MeshStandardMaterial;
  trimBand: THREE.MeshStandardMaterial;
  glassPanel: THREE.MeshStandardMaterial;
  floorGlass: THREE.MeshStandardMaterial;
  hazardStripe: THREE.MeshStandardMaterial;
  ceilingLight: THREE.MeshStandardMaterial;
  abyssGlow: THREE.MeshBasicMaterial;
  cryoFrost: THREE.MeshStandardMaterial;
  crateCover: THREE.MeshStandardMaterial;
  /** Warm tactical composite/timber shoot-house & acoustic booth paneling */
  ballisticPanel: THREE.MeshStandardMaterial;
  /** Heavy dark ribbed gunmetal ballistic armor plate */
  armoredSteel: THREE.MeshStandardMaterial;
  /** Carved deep obsidian-indigo Forerunner temple basalt stone */
  basaltStone: THREE.MeshStandardMaterial;
  /** Luminous pale alabaster-ice temple marble */
  glacialMarble: THREE.MeshStandardMaterial;
  /** Burnished sacred Forerunner aurora-gold bronze trim */
  auroraGold: THREE.MeshStandardMaterial;
  /** Riveted dark industrial cast-iron foundry plate for Floor 02 */
  foundryIron: THREE.MeshStandardMaterial;
  /** Burnished copper-ochre industrial structural alloy for Floor 02 */
  amberAlloy: THREE.MeshStandardMaterial;
  /** Incandescent molten smelter-orange forge conduit glow for Floor 02 */
  moltenGlow: THREE.MeshStandardMaterial;
  /** Volcanic carved obsidian-basalt colosseum masonry for Floor 01 */
  obsidianBasalt: THREE.MeshStandardMaterial;
  /** Weathered ancient ashlar bone-limestone for Floor 01 cover walls, stairs & pillars */
  sacredBoneStone: THREE.MeshStandardMaterial;
  /** Burnished sovereign imperial antique gold-bronze for Floor 01 */
  sovereignGold: THREE.MeshStandardMaterial;
  /** Blazing blood-eclipse crimson solar fire emissive for Floor 01 */
  eclipseCrimson: THREE.MeshStandardMaterial;
  /** Per-floor subtle accent emissive strip material */
  floorAccent: Record<FloorNumber, THREE.MeshStandardMaterial>;
  /** Creates (and tracks for disposal) a crisp procedural architectural stencil plaque texture */
  createStencilMaterial: (
    bigCode: string,
    title: string,
    accentHex: number,
    subtitle?: string
  ) => THREE.MeshStandardMaterial;
  /** Creates a compact high-contrast lane / breach bay number stencil (e.g. "01", "ALPHA") */
  createLaneMarkerMaterial: (
    label: string,
    accentHex: number
  ) => THREE.MeshStandardMaterial;
  dispose: () => void;
}

export interface BoxSpec {
  w: number;
  h: number;
  d: number;
  x: number;
  y: number;
  z: number;
  rotY?: number;
  rotX?: number;
  rotZ?: number;
}
