import * as THREE from 'three';
import {
  createBeveledBox,
  createContouredArmorPlate,
  createCurvedPanelGeometry,
  createLoftedAnatomy,
  createSculptedHand,
  createStrapTube,
} from '../../../core/sculptUtils';
import type { EnemyAnimationInput, EnemyRigHandle } from '../../core/types';
import type { Floor06EnemyMaterials } from '../materials';
import {
  createArchiveRealityWeaverTextures,
  type ArchiveRealityWeaverTextureSuite,
} from './textures';

export type WeaverStaveFormation =
  | 'orbit_serene'
  | 'beam_prism_lock'
  | 'mortar_crown_bloom'
  | 'rift_scythe_spread'
  | 'repel_implode'
  | 'phase2_overdrive_star';

export interface WeaverVisualState {
  formation?: WeaverStaveFormation;
  phase2Aura?: number;
  castGlow?: number;
  riftIntensity?: number;
  repelImplode?: number;
  blinkPhase?: number;
}

export interface RealityWeaverRigHandle extends EnemyRigHandle {
  setBeamTelegraph: (
    active: boolean,
    length: number,
    chargeRatio: number,
    firing?: boolean,
    sweepYawOffset?: number
  ) => void;
  setWeaverVisualState: (state: WeaverVisualState) => void;
  getStaveTipWorldPos: (index: number, out: THREE.Vector3) => THREE.Vector3;
  getHandFocusWorldPos: (side: -1 | 1, out: THREE.Vector3) => THREE.Vector3;
}

function tagHitZone(obj: THREE.Object3D, enemyId: string, hitZone: 'body' | 'weakpoint'): void {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.userData.enemyId = enemyId;
      child.userData.hitZone = hitZone;
    }
  });
}

/** Sculpted stepped Gothic Cathedral Split Miter Horn with inner crescent arch cutout. */
function buildSplitMiterHornGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.085, 0.16, 0.165, 0.34);
  shape.lineTo(0.125, 0.38);
  shape.quadraticCurveTo(0.11, 0.48, 0.025, 0.54);
  shape.quadraticCurveTo(-0.02, 0.35, -0.055, 0.05);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.044,
    bevelEnabled: true,
    bevelThickness: 0.013,
    bevelSize: 0.011,
    bevelSegments: 2,
    curveSegments: 12,
  });
  geo.translate(0, 0, -0.022);
  geo.computeVertexNormals();
  return geo;
}

/** Sculpted sweeping Gothic Cathedral Reliquary Wing Arch behind each shoulder. */
function buildCathedralMantleWingGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.22, 0.06, 0.38, 0.24);
  shape.quadraticCurveTo(0.42, 0.5, 0.26, 0.72);
  shape.quadraticCurveTo(0.14, 0.58, 0.04, 0.38);
  shape.quadraticCurveTo(-0.02, 0.2, 0, 0);
  shape.closePath();

  // Carved pointed Gothic lancet arch cutout inside each reliquary wing
  const hole = new THREE.Path();
  hole.moveTo(0.11, 0.16);
  hole.quadraticCurveTo(0.24, 0.24, 0.27, 0.42);
  hole.quadraticCurveTo(0.22, 0.54, 0.16, 0.52);
  hole.quadraticCurveTo(0.1, 0.36, 0.11, 0.16);
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.028,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 12,
  });
  geo.translate(0, 0, -0.014);
  geo.computeVertexNormals();
  return geo;
}

export function buildArchiveRealityWeaverRig(
  enemyId: string,
  mats: Floor06EnemyMaterials,
  sharedTextures?: ArchiveRealityWeaverTextureSuite
): RealityWeaverRigHandle {
  const ownsTextures = !sharedTextures;
  const tex = sharedTextures ?? createArchiveRealityWeaverTextures();

  // ── Bespoke Sovereign Celestial PBR Materials (always color=0xffffff with maps!) ──
  const obsidianArmorMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.armorMap,
    bumpMap: tex.armorBump,
    bumpScale: 0.026,
    roughnessMap: tex.armorRoughness,
    roughness: 0.42,
    metalness: 0.7,
  });

  const relicGoldMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.goldMap,
    bumpMap: tex.goldBump,
    bumpScale: 0.022,
    roughness: 0.26,
    metalness: 0.88,
  });

  const vestmentMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.vestmentMap,
    bumpMap: tex.vestmentBump,
    bumpScale: 0.02,
    roughness: 0.72,
    metalness: 0.14,
    side: THREE.DoubleSide,
  });

  const maskMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.maskMap,
    bumpMap: tex.maskBump,
    bumpScale: 0.016,
    roughness: 0.28,
    metalness: 0.24,
  });

  const darkUnderMat = new THREE.MeshStandardMaterial({
    color: 0x0d0a18,
    roughness: 0.62,
    metalness: 0.35,
  });

  // Rich faceted crystal emissive tuning (never blows out to flat white under tone-mapping!)
  const violetCrystalMat = new THREE.MeshStandardMaterial({
    color: 0xd946ef,
    emissive: 0xa21caf,
    emissiveIntensity: 1.28,
    roughness: 0.16,
    metalness: 0.28,
    flatShading: true,
  });

  const goldCrystalMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 1.32,
    roughness: 0.16,
    metalness: 0.35,
    flatShading: true,
  });

  const whiteCoreMat = new THREE.MeshBasicMaterial({
    color: 0xfff8dc,
  });

  const haloGoldMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.goldMap,
    bumpMap: tex.goldBump,
    bumpScale: 0.02,
    emissive: 0xd97706,
    emissiveIntensity: 0.58,
    roughness: 0.22,
    metalness: 0.9,
  });

  const haloJewelMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.75,
    roughness: 0.14,
    metalness: 0.22,
    flatShading: true,
  });

  const sigilFloorMat = new THREE.MeshBasicMaterial({
    color: 0xe879f9,
    alphaMap: tex.sigilAlphaMap,
    transparent: true,
    opacity: 0.56,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const sigilGoldOverlayMat = new THREE.MeshBasicMaterial({
    color: 0xfde047,
    alphaMap: tex.sigilAlphaMap,
    transparent: true,
    opacity: 0.36,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const phase2MandalaMat = new THREE.MeshBasicMaterial({
    color: 0xf0abfc,
    alphaMap: tex.sigilAlphaMap,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const fluxRibbonMat = new THREE.MeshBasicMaterial({
    color: 0xd946ef,
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const tetherArcMat = new THREE.MeshBasicMaterial({
    color: 0xe879f9,
    transparent: true,
    opacity: 0.52,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const beamCoreMat = new THREE.MeshBasicMaterial({
    color: 0xfffbeb,
    transparent: true,
    opacity: 0.96,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const beamSheathMat = new THREE.MeshBasicMaterial({
    color: 0xe879f9,
    map: tex.beamMap,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const beamFlareMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const beamHelixMat = new THREE.MeshBasicMaterial({
    color: 0xfde047,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const beamMuzzleConeMat = new THREE.MeshBasicMaterial({
    color: 0xf0abfc,
    transparent: true,
    opacity: 0.58,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const root = new THREE.Group();
  root.name = `archive_reality_weaver_${enemyId}`;

  // ── 1. Ground Celestial Levitation Sigil (pinned cleanly to floor y = 0.04) ──
  const groundSigilGroup = new THREE.Group();
  groundSigilGroup.position.y = 0.04;
  root.add(groundSigilGroup);

  const floorSigilDisc = new THREE.Mesh(new THREE.CircleGeometry(1.3, 48), sigilFloorMat);
  floorSigilDisc.rotation.x = -Math.PI / 2;
  groundSigilGroup.add(floorSigilDisc);

  const floorGoldDisc = new THREE.Mesh(new THREE.CircleGeometry(0.88, 40), sigilGoldOverlayMat);
  floorGoldDisc.rotation.x = -Math.PI / 2;
  floorGoldDisc.position.y = 0.008;
  groundSigilGroup.add(floorGoldDisc);

  const floorOuterRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.26, 0.02, 8, 48),
    relicGoldMat
  );
  floorOuterRing.rotation.x = Math.PI / 2;
  groundSigilGroup.add(floorOuterRing);

  const fluxRibbons: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2 + Math.PI / 4;
    const rib = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.024, 0.54, 6, 1, true),
      fluxRibbonMat
    );
    rib.position.set(Math.cos(ang) * 0.48, 0.25, Math.sin(ang) * 0.48);
    rib.rotation.z = Math.cos(ang) * 0.28;
    rib.rotation.x = -Math.sin(ang) * 0.28;
    groundSigilGroup.add(rib);
    fluxRibbons.push(rib);
  }

  // ── 2. Hovering Sovereign Body Hierarchy ──
  const hoverGroup = new THREE.Group();
  hoverGroup.position.y = 0.24;
  root.add(hoverGroup);

  // Inner sculpted fluted cathedral lower robe (strictly bottom-to-top slices!)
  const robeCoreGeo = createLoftedAnatomy(
    [
      { y: 0.14, rx: 0.16, rz: 0.14, foldAmp: 0.12, foldFreq: 7, foldPhase: 0.2 },
      { y: 0.34, rx: 0.34, rz: 0.3, foldAmp: 0.11, foldFreq: 7, foldPhase: 0.3 },
      { y: 0.62, rx: 0.44, rz: 0.37, foldAmp: 0.09, foldFreq: 7, foldPhase: 0.4 },
      { y: 0.96, rx: 0.38, rz: 0.32, foldAmp: 0.06, foldFreq: 7, foldPhase: 0.45 },
      { y: 1.24, rx: 0.29, rz: 0.24, foldAmp: 0.03, foldFreq: 6 },
      { y: 1.42, rx: 0.24, rz: 0.2, squareness: 2.2 },
    ],
    28,
    true,
    true
  );
  const robeCore = new THREE.Mesh(robeCoreGeo, vestmentMat);
  robeCore.castShadow = true;
  robeCore.receiveShadow = true;
  hoverGroup.add(robeCore);

  // 5 Articulated Split Ceremonial Stole Panels (STRICTLY bottom-to-top for gold constellation hem!)
  const stolePivots: Array<{ group: THREE.Group; basePitch: number; baseRoll: number; phase: number }> = [];

  const makeStolePanel = (
    angleStart: number,
    angleEnd: number,
    bottomRx: number,
    bottomRz: number,
    length: number,
    basePitch: number,
    baseRoll: number,
    phase: number
  ) => {
    const pivot = new THREE.Group();
    pivot.position.set(0, 1.38, 0);
    hoverGroup.add(pivot);

    const geo = createCurvedPanelGeometry(
      [
        { y: -length, rx: bottomRx, rz: bottomRz, thickness: 0.022, creaseAmp: 0.014 },
        { y: -length * 0.66, rx: bottomRx * 0.94, rz: bottomRz * 0.92, thickness: 0.022, creaseAmp: 0.011 },
        { y: -length * 0.32, rx: bottomRx * 0.78, rz: bottomRz * 0.76, thickness: 0.022, creaseAmp: 0.007 },
        { y: 0.0, rx: 0.29, rz: 0.25, thickness: 0.024, creaseAmp: 0.002 },
      ],
      angleStart,
      angleEnd,
      14
    );
    const mesh = new THREE.Mesh(geo, vestmentMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    pivot.add(mesh);

    stolePivots.push({ group: pivot, basePitch, baseRoll, phase });
    return pivot;
  };

  makeStolePanel(-Math.PI * 0.88, -Math.PI * 0.56, 0.52, 0.44, 1.16, 0.04, 0.04, 0.0);
  makeStolePanel(-Math.PI * 0.44, -Math.PI * 0.12, 0.52, 0.44, 1.16, 0.04, -0.04, 1.2);
  makeStolePanel(Math.PI * 0.18, Math.PI * 0.82, 0.6, 0.56, 1.24, -0.07, 0.0, 2.4);
  makeStolePanel(Math.PI * 0.88, Math.PI * 1.08, 0.5, 0.42, 0.96, 0.0, 0.08, 3.6);
  makeStolePanel(-Math.PI * 0.08, Math.PI * 0.12, 0.5, 0.42, 0.96, 0.0, -0.08, 4.8);

  // Sculpted Imperial Waist Corset & Hanging Relic Censer Pendulums
  const corsetGeo = createLoftedAnatomy(
    [
      { y: 1.28, rx: 0.3, rz: 0.26, squareness: 2.35 },
      { y: 1.4, rx: 0.28, rz: 0.24, squareness: 2.45 },
      { y: 1.52, rx: 0.31, rz: 0.25, squareness: 2.35 },
    ],
    22
  );
  const corset = new THREE.Mesh(corsetGeo, obsidianArmorMat);
  corset.castShadow = true;
  hoverGroup.add(corset);

  const beltGoldBand = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.024, 10, 32), relicGoldMat);
  beltGoldBand.rotation.x = Math.PI / 2;
  beltGoldBand.position.y = 1.4;
  beltGoldBand.scale.set(1.06, 0.9, 1);
  hoverGroup.add(beltGoldBand);

  const beltDiamond = new THREE.Mesh(createBeveledBox(0.14, 0.2, 0.055, 0.012), relicGoldMat);
  beltDiamond.position.set(0, 1.4, -0.265);
  beltDiamond.rotation.z = Math.PI / 4;
  hoverGroup.add(beltDiamond);

  const beltGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.052, 0), violetCrystalMat);
  beltGem.position.set(0, 1.4, -0.295);
  hoverGroup.add(beltGem);

  const censerPivots: THREE.Group[] = [];
  const censerPositions: Array<[number, number, number]> = [
    [-0.28, 1.36, -0.18],
    [0.28, 1.36, -0.18],
    [0.0, 1.36, 0.27],
  ];
  for (const [cx, cy, cz] of censerPositions) {
    const cp = new THREE.Group();
    cp.position.set(cx, cy, cz);
    hoverGroup.add(cp);
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.26, 6), relicGoldMat);
    chain.position.y = -0.13;
    cp.add(chain);
    const housing = new THREE.Mesh(new THREE.OctahedronGeometry(0.054, 0), relicGoldMat);
    housing.scale.set(0.8, 1.4, 0.8);
    housing.position.y = -0.3;
    cp.add(housing);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.036, 0), goldCrystalMat);
    gem.position.y = -0.3;
    cp.add(gem);
    censerPivots.push(cp);
  }

  // ── 3. Sovereign Armored Upper Torso & Exposed Reality-Loom Singularity Core ──
  const torsoPivot = new THREE.Group();
  torsoPivot.position.y = 1.44;
  hoverGroup.add(torsoPivot);

  const upperTorsoGeo = createLoftedAnatomy(
    [
      { y: 0.0, rx: 0.26, rz: 0.21, squareness: 2.3 },
      { y: 0.24, rx: 0.34, rz: 0.24, squareness: 2.4, frontScale: 1.08 },
      { y: 0.52, rx: 0.44, rz: 0.27, squareness: 2.55, frontScale: 1.12 },
      { y: 0.72, rx: 0.42, rz: 0.24, squareness: 2.35 },
      { y: 0.84, rx: 0.2, rz: 0.17, squareness: 2.1 },
    ],
    26
  );
  const upperTorso = new THREE.Mesh(upperTorsoGeo, obsidianArmorMat);
  upperTorso.castShadow = true;
  upperTorso.receiveShadow = true;
  torsoPivot.add(upperTorso);

  // Contoured Obsidian-Gold Gothic Breastplate Halves framing the Sternum Aperture
  const chestSurfaceMap = (u: number, v: number, off: number): [number, number, number] => {
    const rx = 0.28 + v * 0.19 + off;
    const rz = 0.22 + v * 0.075 + off;
    return [Math.cos(u) * rx, 0.14 + v * 0.58, Math.sin(u) * rz];
  };
  for (const side of [-1, 1] as const) {
    const uInner = -Math.PI / 2 + side * 0.28;
    const uOuter = -Math.PI / 2 + side * 1.12;
    const contour: Array<[number, number]> = [
      [uInner, 0.08],
      [uOuter, 0.2],
      [uOuter * 0.97, 0.88],
      [uInner * 1.0, 0.96],
      [uInner + side * 0.12, 0.52],
    ];
    const plateGeo = createContouredArmorPlate(contour, chestSurfaceMap, 0.028, 0.18, 0.011, 3);
    const plate = new THREE.Mesh(plateGeo, obsidianArmorMat);
    plate.castShadow = true;
    torsoPivot.add(plate);
  }

  // Tailored flush gilded gorget trim hugging the upper breastplate neckline cleanly
  const frontGorgetRimGeo = createCurvedPanelGeometry(
    [
      { y: 0.69, rx: 0.395, rz: 0.268, thickness: 0.018 },
      { y: 0.74, rx: 0.355, rz: 0.242, thickness: 0.017 },
    ],
    -Math.PI * 0.82,
    -Math.PI * 0.18,
    20
  );
  const frontGorgetRim = new THREE.Mesh(frontGorgetRimGeo, relicGoldMat);
  torsoPivot.add(frontGorgetRim);

  // Sternum Reality-Loom Singularity Eye Aperture (y = 0.45, z = -0.29)
  const chestCoreGroup = new THREE.Group();
  chestCoreGroup.position.set(0, 0.45, -0.295);
  torsoPivot.add(chestCoreGroup);

  const chestBezel = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.026, 10, 32), relicGoldMat);
  chestCoreGroup.add(chestBezel);

  // 4 Sculpted Golden Astrolabe Cardinal Needles crowning the Sternum Bezel
  const cardinalGeo = new THREE.ConeGeometry(0.022, 0.11, 4);
  for (let i = 0; i < 4; i++) {
    const ca = (i * Math.PI) / 2;
    const needle = new THREE.Mesh(cardinalGeo, relicGoldMat);
    needle.position.set(Math.cos(ca) * 0.23, Math.sin(ca) * 0.23, 0.005);
    needle.rotation.z = ca - Math.PI / 2;
    chestCoreGroup.add(needle);
  }

  const chestBackplate = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24), darkUnderMat);
  chestBackplate.position.z = 0.022;
  chestBackplate.rotation.y = Math.PI;
  chestCoreGroup.add(chestBackplate);

  const chestGimbalOuter = new THREE.Mesh(
    new THREE.TorusGeometry(0.142, 0.012, 8, 28),
    relicGoldMat
  );
  chestCoreGroup.add(chestGimbalOuter);

  const chestGimbalInner = new THREE.Mesh(
    new THREE.TorusGeometry(0.102, 0.01, 8, 24),
    goldCrystalMat
  );
  chestCoreGroup.add(chestGimbalInner);

  const chestSingularityOrb = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.088, 1),
    violetCrystalMat
  );
  chestCoreGroup.add(chestSingularityOrb);

  const chestSingularityWhite = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.044, 0),
    whiteCoreMat
  );
  chestCoreGroup.add(chestSingularityWhite);

  // 3-Piece Sculpted Winged Cathedral Reliquary Mantle (replaces flat collar!)
  // Low curved obsidian-gold cervical nape behind neck
  const rearNapeGeo = createCurvedPanelGeometry(
    [
      { y: 0.64, rx: 0.36, rz: 0.26, thickness: 0.03 },
      { y: 0.85, rx: 0.34, rz: 0.25, thickness: 0.026 },
    ],
    Math.PI * 0.1,
    Math.PI * 0.9,
    18
  );
  const rearNape = new THREE.Mesh(rearNapeGeo, obsidianArmorMat);
  torsoPivot.add(rearNape);

  const rearNapeGold = new THREE.Mesh(
    createCurvedPanelGeometry(
      [
        { y: 0.84, rx: 0.348, rz: 0.258, thickness: 0.02 },
        { y: 0.885, rx: 0.342, rz: 0.254, thickness: 0.018 },
      ],
      Math.PI * 0.1,
      Math.PI * 0.9,
      18
    ),
    relicGoldMat
  );
  torsoPivot.add(rearNapeGold);

  // Twin Sweeping Carved Gothic Lancet Reliquary Wings soaring symmetrically behind shoulders!
  const mantleWingGeo = buildCathedralMantleWingGeo();
  for (const side of [-1, 1] as const) {
    const wing = new THREE.Mesh(mantleWingGeo, obsidianArmorMat);
    wing.position.set(side * 0.22, 0.72, 0.23);
    wing.scale.x = side;
    wing.rotation.y = side * 0.42;
    wing.rotation.x = 0.16;
    wing.castShadow = true;
    torsoPivot.add(wing);

    // Gilded cathedral spire crowning the apex of each Gothic wing
    const wingSpire = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.28, 4), relicGoldMat);
    wingSpire.position.set(side * 0.45, 1.48, 0.36);
    wingSpire.rotation.z = -side * 0.26;
    wingSpire.rotation.x = 0.18;
    torsoPivot.add(wingSpire);
  }

  // Sculpted Multi-Tiered Pointed Cathedral Knight Pauldrons + Floating Amethyst Epaulets
  const shoulderGems: THREE.Mesh[] = [];
  for (const side of [-1, 1] as const) {
    const pGroup = new THREE.Group();
    pGroup.position.set(side * 0.5, 0.72, 0.0);
    torsoPivot.add(pGroup);

    // Upper flared pointed cathedral mantle shell
    const upperTier = createCurvedPanelGeometry(
      [
        { y: -0.06, rx: 0.31, rz: 0.27, thickness: 0.03 },
        { y: 0.07, rx: 0.24, rz: 0.22, thickness: 0.032 },
        { y: 0.18, rx: 0.12, rz: 0.14, thickness: 0.026 },
      ],
      side === 1 ? -Math.PI * 0.44 : Math.PI * 0.56,
      side === 1 ? Math.PI * 0.44 : Math.PI * 1.44,
      14
    );
    const pUpper = new THREE.Mesh(upperTier, obsidianArmorMat);
    pUpper.castShadow = true;
    pGroup.add(pUpper);

    // Overlapping lower fluted lames skirt plate with crisp gold rim
    const lowerTier = createCurvedPanelGeometry(
      [
        { y: -0.19, rx: 0.27, rz: 0.24, thickness: 0.024 },
        { y: -0.05, rx: 0.285, rz: 0.25, thickness: 0.026 },
      ],
      side === 1 ? -Math.PI * 0.38 : Math.PI * 0.62,
      side === 1 ? Math.PI * 0.38 : Math.PI * 1.38,
      12
    );
    const pLower = new THREE.Mesh(lowerTier, obsidianArmorMat);
    pLower.castShadow = true;
    pGroup.add(pLower);

    // Chased hammered-gold crescent arch trim along the upper pauldron lip
    const goldLip = new THREE.Mesh(
      createCurvedPanelGeometry(
        [
          { y: -0.075, rx: 0.322, rz: 0.282, thickness: 0.018 },
          { y: -0.035, rx: 0.315, rz: 0.276, thickness: 0.018 },
        ],
        side === 1 ? -Math.PI * 0.44 : Math.PI * 0.56,
        side === 1 ? Math.PI * 0.44 : Math.PI * 1.44,
        14
      ),
      relicGoldMat
    );
    pGroup.add(goldLip);

    // Pointed gilded shoulder finial spike
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.18, 4), relicGoldMat);
    spike.position.set(side * 0.26, 0.14, 0);
    spike.rotation.z = -side * 0.58;
    pGroup.add(spike);

    // Floating Faceted Amethyst Epaulet Crystal
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.064, 0), violetCrystalMat);
    gem.scale.set(0.75, 1.55, 0.75);
    gem.position.set(side * 0.16, 0.29, 0.0);
    pGroup.add(gem);
    shoulderGems.push(gem);
  }

  // Dorsal Reliquary Spine & Astral Loom Spindle Hub (+Z back)
  for (let i = 0; i < 5; i++) {
    const rib = new THREE.Mesh(
      createBeveledBox(0.2 - i * 0.014, 0.055, 0.09, 0.01),
      i % 2 === 0 ? relicGoldMat : obsidianArmorMat
    );
    rib.position.set(0, 0.14 + i * 0.125, 0.25 + Math.sin(i * 0.6) * 0.03);
    rib.rotation.x = -0.18;
    torsoPivot.add(rib);
  }

  const dorsalSpindle = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.024, 10, 28), relicGoldMat);
  dorsalSpindle.position.set(0, 0.58, 0.36);
  torsoPivot.add(dorsalSpindle);

  const dorsalCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.105, 0), goldCrystalMat);
  dorsalCore.position.set(0, 0.58, 0.37);
  torsoPivot.add(dorsalCore);

  // ── 4. Chiseled Gothic Porcelain Mask, Tri-Slit Star-Oculus & Split Cathedral Miter ──
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.88, -0.02);
  torsoPivot.add(headPivot);

  const neckCol = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.135, 0.16, 14), darkUnderMat);
  neckCol.position.y = 0.02;
  headPivot.add(neckCol);

  // Sculpted angular aristocratic porcelain visage
  const maskGeo = createLoftedAnatomy(
    [
      { y: 0.03, rx: 0.052, rz: 0.072, pinchFront: 0.035 },
      { y: 0.11, rx: 0.112, rz: 0.128, pinchFront: 0.04, frontScale: 1.12, squareness: 2.3 },
      { y: 0.22, rx: 0.136, rz: 0.152, pinchFront: 0.036, frontScale: 1.14, squareness: 2.35 },
      { y: 0.32, rx: 0.13, rz: 0.144, squareness: 2.25 },
      { y: 0.39, rx: 0.088, rz: 0.1, squareness: 2.0 },
    ],
    22
  );
  const maskMesh = new THREE.Mesh(maskGeo, maskMat);
  maskMesh.castShadow = true;
  headPivot.add(maskMesh);

  // Sculpted Gilded Brow-Crown & Sharp Nose-Bridge Keel (gives regal 3/4 profile!)
  const browCrown = new THREE.Mesh(
    createCurvedPanelGeometry(
      [
        { y: 0.275, rx: 0.148, rz: 0.172, thickness: 0.018 },
        { y: 0.318, rx: 0.144, rz: 0.164, thickness: 0.02 },
      ],
      -Math.PI * 0.86,
      -Math.PI * 0.14,
      14
    ),
    relicGoldMat
  );
  headPivot.add(browCrown);

  const noseKeel = new THREE.Mesh(createBeveledBox(0.024, 0.15, 0.036, 0.006), relicGoldMat);
  noseKeel.position.set(0, 0.21, -0.178);
  noseKeel.rotation.x = -0.1;
  headPivot.add(noseKeel);

  // Obsidian liturgical cowl hugging sides/back of the mask
  const cowlGeo = createCurvedPanelGeometry(
    [
      { y: 0.05, rx: 0.145, rz: 0.155, thickness: 0.024 },
      { y: 0.22, rx: 0.162, rz: 0.172, thickness: 0.026 },
      { y: 0.38, rx: 0.135, rz: 0.145, thickness: 0.024 },
    ],
    -Math.PI * 0.16,
    Math.PI * 1.16,
    18
  );
  const cowl = new THREE.Mesh(cowlGeo, obsidianArmorMat);
  headPivot.add(cowl);

  // Tri-Slit Celestial Star-Oculus (reads fiercely from BOTH front and 3/4 profile!)
  const oculusCenter = new THREE.Mesh(new THREE.OctahedronGeometry(0.036, 0), goldCrystalMat);
  oculusCenter.scale.set(0.45, 1.95, 0.45);
  oculusCenter.position.set(0, 0.22, -0.194);
  headPivot.add(oculusCenter);

  const oculusCross = new THREE.Mesh(createBeveledBox(0.088, 0.012, 0.012, 0.002), whiteCoreMat);
  oculusCross.position.set(0, 0.22, -0.198);
  headPivot.add(oculusCross);

  for (const side of [-1, 1] as const) {
    const cheekSlit = new THREE.Mesh(createBeveledBox(0.068, 0.016, 0.016, 0.003), violetCrystalMat);
    cheekSlit.position.set(side * 0.068, 0.23, -0.158);
    cheekSlit.rotation.y = -side * 0.42;
    cheekSlit.rotation.z = side * 0.24;
    headPivot.add(cheekSlit);
  }

  // Twin Sweeping Stepped Gothic Cathedral Miter Horns
  const miterHornGeo = buildSplitMiterHornGeo();
  for (const side of [-1, 1] as const) {
    const horn = new THREE.Mesh(miterHornGeo, obsidianArmorMat);
    horn.position.set(side * 0.082, 0.31, -0.01);
    horn.scale.x = side;
    horn.rotation.y = -side * 0.24;
    horn.rotation.x = 0.06;
    horn.castShadow = true;
    headPivot.add(horn);

    const trim = new THREE.Mesh(createBeveledBox(0.022, 0.44, 0.052, 0.005), relicGoldMat);
    trim.position.set(side * 0.132, 0.52, -0.01);
    trim.rotation.z = -side * 0.24;
    headPivot.add(trim);
  }

  // ── 5. WEAKPOINT: Elevated Floating CROWN RESONANCE HALO (ZERO head/miter overlap!) ──
  const haloGroup = new THREE.Group();
  haloGroup.position.set(0, 1.66, 0.08);
  torsoPivot.add(haloGroup);

  const haloOuterGroup = new THREE.Group();
  haloGroup.add(haloOuterGroup);

  const haloOuterRing = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.028, 12, 48), haloGoldMat);
  haloOuterGroup.add(haloOuterRing);

  // 8 Sculpted Golden Sun-Ray Spikes radiating around the Crown Halo
  const rayGeo = new THREE.ConeGeometry(0.036, 0.21, 4);
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI * 2) / 8;
    const isMajor = i % 2 === 0;
    const ray = new THREE.Mesh(rayGeo, haloGoldMat);
    ray.scale.set(isMajor ? 1.18 : 0.86, isMajor ? 1.28 : 0.9, 1);
    ray.position.set(Math.cos(ang) * 0.52, Math.sin(ang) * 0.52, 0);
    ray.rotation.z = ang - Math.PI / 2;
    haloOuterGroup.add(ray);
  }

  const haloInnerRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.26, 0.022, 10, 32),
    violetCrystalMat
  );
  haloGroup.add(haloInnerRing);

  const haloJewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.145, 0), haloJewelMat);
  haloGroup.add(haloJewel);

  const haloWhiteCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.068, 0), whiteCoreMat);
  haloGroup.add(haloWhiteCore);

  // Dedicated invisible weakpoint hitbox collider so skilled shots register reliably
  const weakpointCollider = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 12, 10),
    mats.hitboxInvisible
  );
  haloGroup.add(weakpointCollider);

  // ── 6. 2 Primary Articulated Ceremonial Arms (Positive +X bends forward toward -Z!) ──
  const buildPrimaryArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.56, 0.66, -0.02);
    torsoPivot.add(shoulder);

    const upperSleeveGeo = createLoftedAnatomy(
      [
        { y: -0.44, rx: 0.135, rz: 0.145, foldAmp: 0.08, foldFreq: 5 },
        { y: -0.22, rx: 0.115, rz: 0.118, foldAmp: 0.05, foldFreq: 5 },
        { y: 0.02, rx: 0.11, rz: 0.105 },
      ],
      18
    );
    const upperSleeve = new THREE.Mesh(upperSleeveGeo, vestmentMat);
    upperSleeve.castShadow = true;
    shoulder.add(upperSleeve);

    const bicepCuff = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 8, 22), relicGoldMat);
    bicepCuff.rotation.x = Math.PI / 2;
    bicepCuff.position.y = -0.32;
    shoulder.add(bicepCuff);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.42, 0);
    shoulder.add(elbow);

    const bracerGeo = createLoftedAnatomy(
      [
        { y: -0.38, rx: 0.068, rz: 0.072, squareness: 2.3 },
        { y: -0.18, rx: 0.084, rz: 0.088, squareness: 2.4 },
        { y: 0.02, rx: 0.095, rz: 0.098, squareness: 2.2 },
      ],
      16
    );
    const bracer = new THREE.Mesh(bracerGeo, obsidianArmorMat);
    bracer.castShadow = true;
    elbow.add(bracer);

    // Hanging embroidered ceremonial sleeve pennant (strictly bottom-to-top slices!)
    const pennantGeo = createCurvedPanelGeometry(
      [
        { y: -0.56, rx: 0.125, rz: 0.11, thickness: 0.016 },
        { y: -0.28, rx: 0.11, rz: 0.1, thickness: 0.016 },
        { y: 0.0, rx: 0.095, rz: 0.092, thickness: 0.018 },
      ],
      side === 1 ? -Math.PI * 0.15 : Math.PI * 0.65,
      side === 1 ? Math.PI * 0.35 : Math.PI * 1.15,
      8
    );
    const pennant = new THREE.Mesh(pennantGeo, vestmentMat);
    elbow.add(pennant);

    const wristRing = new THREE.Mesh(new THREE.TorusGeometry(0.076, 0.015, 8, 20), relicGoldMat);
    wristRing.rotation.x = Math.PI / 2;
    wristRing.position.y = -0.35;
    elbow.add(wristRing);

    const hand = createSculptedHand(side, obsidianArmorMat, relicGoldMat, relicGoldMat);
    hand.position.y = -0.38;
    hand.scale.setScalar(1.38);
    elbow.add(hand);

    return { shoulder, elbow };
  };

  const leftArm = buildPrimaryArm(-1);
  const rightArm = buildPrimaryArm(1);

  // ── 7. 2 Lower Floating Telekinetic Loom-Hands (Cleanly separated wide seraphic silhouette!) ──
  const buildFloatingLoomHand = (side: -1 | 1) => {
    const group = new THREE.Group();
    group.position.set(side * 0.94, 0.08, -0.44);
    torsoPivot.add(group);

    // Sculpted glowing telekinetic tether ribbon arching from rib/waist to wrist cuff
    const tetherGeo = createStrapTube(
      [
        new THREE.Vector3(-side * 0.56, 0.12, 0.36),
        new THREE.Vector3(-side * 0.28, 0.02, 0.22),
        new THREE.Vector3(0, 0.12, 0.08),
      ],
      0.012,
      1,
      14
    );
    const tetherRibbon = new THREE.Mesh(tetherGeo, tetherArcMat);
    group.add(tetherRibbon);

    const tetherRing = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.014, 8, 24), relicGoldMat);
    tetherRing.rotation.x = Math.PI / 2;
    tetherRing.position.set(0, 0.13, 0.06);
    group.add(tetherRing);

    const cuffGeo = createLoftedAnatomy(
      [
        { y: -0.06, rx: 0.068, rz: 0.07, squareness: 2.4 },
        { y: 0.08, rx: 0.086, rz: 0.088, squareness: 2.4 },
        { y: 0.18, rx: 0.076, rz: 0.078, squareness: 2.3 },
      ],
      14
    );
    const cuff = new THREE.Mesh(cuffGeo, obsidianArmorMat);
    cuff.rotation.x = 0.95; // Positive +X aims forward toward -Z!
    cuff.castShadow = true;
    group.add(cuff);

    const hand = createSculptedHand(side, obsidianArmorMat, relicGoldMat, relicGoldMat);
    hand.scale.setScalar(1.36);
    hand.rotation.x = 1.05; // Positive +X aims hand forward toward -Z!
    hand.position.set(0, -0.04, -0.06);
    group.add(hand);

    // Swirling Geometric Astrolabe Focus Orb held cleanly ahead of floating palm
    const focusGroup = new THREE.Group();
    focusGroup.position.set(-side * 0.04, 0.02, -0.24);
    group.add(focusGroup);

    const focusCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.072, 0), violetCrystalMat);
    focusGroup.add(focusCore);

    const focusRing = new THREE.Mesh(new THREE.TorusGeometry(0.112, 0.01, 8, 24), goldCrystalMat);
    focusGroup.add(focusRing);

    return { group, focusGroup, focusRing, tetherRing };
  };

  const leftFloatHand = buildFloatingLoomHand(-1);
  const rightFloatHand = buildFloatingLoomHand(1);

  // ── 8. 6 Articulated Floating Cathedral Monolith Staves (Elevated Mandorla Wheel y=0.78!) ──
  const staveWheelPivot = new THREE.Group();
  staveWheelPivot.position.set(0, 0.78, 0.58);
  torsoPivot.add(staveWheelPivot);

  // Delicate Phase 1 Gilded Clockwork Orbital Track + 6 Celestial Orrery Diamond Studs
  const clockworkTrackGroup = new THREE.Group();
  staveWheelPivot.add(clockworkTrackGroup);

  const clockworkTrackRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.24, 0.012, 8, 56),
    relicGoldMat
  );
  clockworkTrackGroup.add(clockworkTrackRing);

  const orreryStudGeo = new THREE.OctahedronGeometry(0.036, 0);
  for (let i = 0; i < 6; i++) {
    const sa = (i / 6) * Math.PI * 2;
    const stud = new THREE.Mesh(orreryStudGeo, relicGoldMat);
    stud.position.set(Math.cos(sa) * 1.24, Math.sin(sa) * 1.24, 0);
    stud.rotation.z = sa;
    stud.scale.set(1.35, 0.75, 0.75);
    clockworkTrackGroup.add(stud);
  }

  // Phase 2 Celestial Back Mandala anchored cleanly behind the Weaver's back
  const phase2MandalaGroup = new THREE.Group();
  phase2MandalaGroup.position.set(0, 0.78, 0.78);
  torsoPivot.add(phase2MandalaGroup);

  const phase2MandalaDisc = new THREE.Mesh(new THREE.CircleGeometry(1.78, 48), phase2MandalaMat);
  phase2MandalaGroup.add(phase2MandalaDisc);

  const phase2OuterRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.72, 0.026, 8, 56),
    haloGoldMat
  );
  phase2OuterRing.visible = false;
  phase2MandalaGroup.add(phase2OuterRing);

  interface StaveHandle {
    pivot: THREE.Group;
    crystal: THREE.Mesh;
    tipAnchor: THREE.Object3D;
    baseAngle: number;
  }

  const staves: StaveHandle[] = [];
  const shaftGeo = new THREE.CylinderGeometry(0.044, 0.026, 0.94, 6);
  const ferruleGeo = new THREE.TorusGeometry(0.052, 0.012, 8, 16);
  const prongGeo = createBeveledBox(0.022, 0.24, 0.028, 0.005);
  const staveCrystalGeo = new THREE.OctahedronGeometry(0.092, 0);
  const staveCoreGeo = new THREE.OctahedronGeometry(0.042, 0);
  const finialGeo = new THREE.ConeGeometry(0.036, 0.18, 6);

  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(ang) * 1.24, Math.sin(ang) * 1.24, 0);
    staveWheelPivot.add(pivot);

    const shaft = new THREE.Mesh(shaftGeo, obsidianArmorMat);
    shaft.castShadow = true;
    pivot.add(shaft);

    for (const fy of [-0.34, 0.0, 0.36]) {
      const ferrule = new THREE.Mesh(ferruleGeo, relicGoldMat);
      ferrule.rotation.x = Math.PI / 2;
      ferrule.position.y = fy;
      pivot.add(ferrule);
    }

    for (const ps of [-1, 1] as const) {
      const prong = new THREE.Mesh(prongGeo, relicGoldMat);
      prong.position.set(ps * 0.066, 0.55, 0);
      prong.rotation.z = -ps * 0.22;
      pivot.add(prong);
    }

    const crystal = new THREE.Mesh(
      staveCrystalGeo,
      i % 2 === 0 ? violetCrystalMat : goldCrystalMat
    );
    crystal.scale.set(0.75, 1.45, 0.75);
    crystal.position.y = 0.63;
    pivot.add(crystal);

    const innerCore = new THREE.Mesh(staveCoreGeo, whiteCoreMat);
    innerCore.scale.set(0.62, 1.3, 0.62);
    innerCore.position.y = 0.63;
    pivot.add(innerCore);

    const finial = new THREE.Mesh(finialGeo, relicGoldMat);
    finial.rotation.x = Math.PI;
    finial.position.y = -0.55;
    pivot.add(finial);

    const tipAnchor = new THREE.Object3D();
    tipAnchor.position.set(0, 0.72, 0);
    pivot.add(tipAnchor);

    staves.push({ pivot, crystal, tipAnchor, baseAngle: ang });
  }

  // ── 9. Volumetric Sweeping Reality-Tear Beam + Optical Aperture Iris ──
  const beamRoot = new THREE.Group();
  beamRoot.position.set(0, 0.45, -0.72);
  beamRoot.visible = false;
  torsoPivot.add(beamRoot);

  const irisGroup = new THREE.Group();
  beamRoot.add(irisGroup);
  const irisOuterRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.02, 8, 32), relicGoldMat);
  irisGroup.add(irisOuterRing);
  const irisInnerRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.013, 8, 24), violetCrystalMat);
  irisGroup.add(irisInnerRing);
  for (let i = 0; i < 6; i++) {
    const ia = (i / 6) * Math.PI * 2;
    const petal = new THREE.Mesh(createBeveledBox(0.036, 0.145, 0.014, 0.004), relicGoldMat);
    petal.position.set(Math.cos(ia) * 0.26, Math.sin(ia) * 0.26, 0);
    petal.rotation.z = ia + 0.45;
    irisGroup.add(petal);
  }

  const beamCoreGeo = new THREE.CylinderGeometry(0.048, 0.048, 1, 12);
  beamCoreGeo.rotateX(Math.PI / 2);
  beamCoreGeo.translate(0, 0, -0.5);
  const beamCore = new THREE.Mesh(beamCoreGeo, beamCoreMat);
  beamRoot.add(beamCore);

  const beamSheathGeo = new THREE.CylinderGeometry(0.15, 0.175, 1, 16, 1, true);
  beamSheathGeo.rotateX(Math.PI / 2);
  beamSheathGeo.translate(0, 0, -0.5);
  const beamSheath = new THREE.Mesh(beamSheathGeo, beamSheathMat);
  beamRoot.add(beamSheath);

  // Spinning golden double-helix plasma filament coiling around the Reality-Tear Beam
  const beamHelixGroup = new THREE.Group();
  beamRoot.add(beamHelixGroup);
  for (let strand = 0; strand < 2; strand++) {
    const pts: THREE.Vector3[] = [];
    const segs = 36;
    const phase = strand * Math.PI;
    for (let s = 0; s <= segs; s++) {
      const frac = s / segs;
      const ang = frac * Math.PI * 6 + phase;
      const r = 0.21 + Math.sin(frac * Math.PI) * 0.035;
      pts.push(new THREE.Vector3(Math.cos(ang) * r, Math.sin(ang) * r, -frac));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const helixGeo = new THREE.TubeGeometry(curve, 44, 0.014, 5, false);
    const helixMesh = new THREE.Mesh(helixGeo, beamHelixMat);
    beamHelixGroup.add(helixMesh);
  }

  // Luminous Muzzle Convergence Flare Cone & Halo right at the Optical Aperture Iris
  const muzzleConeGeo = new THREE.CylinderGeometry(0.36, 0.05, 0.62, 16, 1, true);
  muzzleConeGeo.rotateX(Math.PI / 2);
  muzzleConeGeo.translate(0, 0, -0.32);
  const beamMuzzleCone = new THREE.Mesh(muzzleConeGeo, beamMuzzleConeMat);
  beamRoot.add(beamMuzzleCone);

  const beamMuzzleFlare = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 1), beamFlareMat);
  beamMuzzleFlare.position.set(0, 0, -0.05);
  beamRoot.add(beamMuzzleFlare);

  const beamImpactFlare = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), beamFlareMat);
  beamRoot.add(beamImpactFlare);

  const muzzleAnchor = new THREE.Object3D();
  muzzleAnchor.position.set(0, 0.45, -0.76);
  torsoPivot.add(muzzleAnchor);

  // Dedicated raycast hitboxes for crisp player gun/katana hit registration
  const torsoHit = new THREE.Mesh(
    new THREE.BoxGeometry(1.14, 1.15, 0.72),
    mats.hitboxInvisible
  );
  torsoHit.position.set(0, 0.48, 0);
  torsoHit.userData.enemyId = enemyId;
  torsoHit.userData.hitZone = 'body';
  torsoPivot.add(torsoHit);

  const robeHit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.56, 1.24, 10),
    mats.hitboxInvisible
  );
  robeHit.position.set(0, 0.84, 0);
  robeHit.userData.enemyId = enemyId;
  robeHit.userData.hitZone = 'body';
  hoverGroup.add(robeHit);

  const headHit = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 10, 8),
    mats.hitboxInvisible
  );
  headHit.position.set(0, 0.24, -0.02);
  headHit.userData.enemyId = enemyId;
  headHit.userData.hitZone = 'head';
  headPivot.add(headHit);

  tagHitZone(root, enemyId, 'body');
  tagHitZone(haloGroup, enemyId, 'weakpoint');
  headHit.userData.hitZone = 'head';
  weakpointCollider.material = mats.hitboxInvisible;

  const hitboxes: THREE.Mesh[] = [torsoHit, robeHit, headHit, weakpointCollider];
  const weakpointMaterials: THREE.MeshStandardMaterial[] = [haloJewelMat, haloGoldMat];
  const armorFlashMaterials: THREE.MeshStandardMaterial[] = [
    obsidianArmorMat,
    vestmentMat,
    relicGoldMat,
    maskMat,
  ];

  // ── Runtime Visual State & Smooth Blends (zero per-frame allocations!) ──
  let formation: WeaverStaveFormation = 'orbit_serene';
  let phase2Aura = 0;
  let castGlow = 0;
  let riftIntensity = 0;
  let repelImplode = 0;
  let blinkPhase = 0;

  let beamActive = false;
  let beamLength = 0;
  let beamCharge = 0;
  let beamFiring = false;
  let beamSweepYawOffset = 0;

  let smoothBeamLock = 0;
  let smoothMortarBloom = 0;
  let smoothScytheSpread = 0;
  let smoothRepel = 0;
  let smoothP2 = 0;

  return {
    root,
    hitboxes,
    weakpointMaterials,
    armorFlashMaterials,
    setBeamTelegraph: (active, length, chargeRatio, firing = false, sweepYawOffset = 0) => {
      beamActive = active;
      beamLength = Math.max(0.5, length);
      beamCharge = Math.max(0, Math.min(1.5, chargeRatio));
      beamFiring = firing;
      beamSweepYawOffset = sweepYawOffset;
    },
    setWeaverVisualState: (st: WeaverVisualState) => {
      if (st.formation !== undefined) formation = st.formation;
      if (st.phase2Aura !== undefined) phase2Aura = st.phase2Aura;
      if (st.castGlow !== undefined) castGlow = st.castGlow;
      if (st.riftIntensity !== undefined) riftIntensity = st.riftIntensity;
      if (st.repelImplode !== undefined) repelImplode = st.repelImplode;
      if (st.blinkPhase !== undefined) blinkPhase = st.blinkPhase;
    },
    getStaveTipWorldPos: (index, out) => {
      const s = staves[((index % 6) + 6) % 6];
      return s.tipAnchor.getWorldPosition(out);
    },
    getHandFocusWorldPos: (side, out) => {
      const fh = side === -1 ? leftFloatHand : rightFloatHand;
      return fh.focusGroup.getWorldPosition(out);
    },
    getMuzzleWorldPos: (out) => muzzleAnchor.getWorldPosition(out),
    getWeakpointWorldPos: (out) => haloGroup.getWorldPosition(out),
    updateAnimation: (anim: EnemyAnimationInput) => {
      const t = anim.elapsed;
      const dt = Math.min(0.08, Math.max(0.001, anim.dt));
      const isP2 = anim.phase === 2;
      const isStaggered = anim.behavior === 'staggered' || anim.staggerTimer > 0;
      const isDead = anim.behavior === 'dead' || anim.deadProgress > 0;
      const isWindup = anim.behavior === 'windup';
      const isAttack = anim.behavior === 'attack';

      const blendRate = Math.min(1, dt * 8.5);
      const tgtBeamLock = formation === 'beam_prism_lock' ? 1 : 0;
      const tgtMortarBloom = formation === 'mortar_crown_bloom' ? 1 : 0;
      const tgtScythe = formation === 'rift_scythe_spread' ? 1 : 0;
      const tgtRepel = formation === 'repel_implode' ? 1 : 0;
      const tgtP2 =
        isP2 || phase2Aura > 0.1 || formation === 'phase2_overdrive_star'
          ? Math.max(isP2 ? 1 : 0, phase2Aura)
          : 0;

      smoothBeamLock += (tgtBeamLock - smoothBeamLock) * blendRate;
      smoothMortarBloom += (tgtMortarBloom - smoothMortarBloom) * blendRate;
      smoothScytheSpread += (tgtScythe - smoothScytheSpread) * blendRate;
      smoothRepel += (tgtRepel - smoothRepel) * blendRate;
      smoothP2 += (tgtP2 - smoothP2) * blendRate;

      // 1. Ground Celestial Levitation Sigil Rotation & Pulse
      floorSigilDisc.rotation.z = t * (isP2 ? 0.95 : 0.45);
      floorGoldDisc.rotation.z = -t * (isP2 ? 1.35 : 0.7);
      floorOuterRing.rotation.z = t * 0.35;
      const sigilScale = 1 + Math.sin(t * 3.4) * 0.04 + smoothRepel * 0.32 + smoothP2 * 0.14;
      groundSigilGroup.scale.setScalar(
        isDead ? Math.max(0.01, 1 - anim.deadProgress) : sigilScale
      );
      sigilFloorMat.opacity = isDead
        ? Math.max(0, 0.56 * (1 - anim.deadProgress))
        : 0.48 + smoothP2 * 0.18 + castGlow * 0.14;
      sigilFloorMat.color.setHex(smoothP2 > 0.45 ? 0xf0abfc : 0xd946ef);

      for (let i = 0; i < fluxRibbons.length; i++) {
        const rib = fluxRibbons[i];
        const pulse = 0.72 + Math.sin(t * 4.5 + i * 1.57) * 0.28;
        rib.scale.set(1, isStaggered ? 0.25 : pulse, 1);
      }

      // 2. Hover Elevation, Kneel on Stagger, & Dramatic Death Collapse
      if (isDead) {
        const dp = Math.min(1, anim.deadProgress);
        hoverGroup.position.y = THREE.MathUtils.lerp(0.24, -0.58, dp);
        hoverGroup.rotation.x = dp * 0.82;
        hoverGroup.rotation.z = dp * 0.24;
        haloGroup.visible = dp < 0.75;
        beamRoot.visible = false;
        return;
      }

      const hoverBob = isStaggered
        ? -0.22
        : 0.24 +
          Math.sin(t * (isP2 ? 3.2 : 2.1)) * 0.095 +
          smoothMortarBloom * 0.22 -
          smoothRepel * 0.14;
      hoverGroup.position.y += (hoverBob - hoverGroup.position.y) * Math.min(1, dt * 10);

      const blinkScaleX = 1 - blinkPhase * 0.42;
      const blinkScaleY = 1 + blinkPhase * 0.24;
      hoverGroup.scale.set(blinkScaleX, blinkScaleY, blinkScaleX);

      // Upward-extending spine (+Y) facing -Z: negative -X bows FORWARD, positive +X leans BACKWARD!
      const flinchX = anim.flinchTimer > 0 ? anim.flinchDirX * anim.flinchTimer * 0.35 : 0;
      const tgtTorsoPitch = isStaggered
        ? -0.38
        : smoothMortarBloom * 0.14 +
          smoothRepel * (isWindup ? 0.16 : -0.18) +
          smoothBeamLock * -0.06 -
          Math.min(0.14, anim.localMoveZ * 0.12);
      torsoPivot.rotation.x += (tgtTorsoPitch - torsoPivot.rotation.x) * Math.min(1, dt * 9);
      torsoPivot.rotation.z = flinchX - anim.localMoveX * 0.12;
      torsoPivot.rotation.y = smoothScytheSpread * Math.sin(anim.attackProgress * Math.PI * 2) * 0.36;

      for (const st of stolePivots) {
        const wind = Math.sin(t * 2.8 + st.phase) * 0.045 + anim.speedRatio * 0.08;
        const flare = smoothRepel * 0.26 + smoothP2 * 0.09;
        st.group.rotation.x = st.basePitch + wind + (st.basePitch < 0 ? -flare : flare * 0.4);
        st.group.rotation.z = st.baseRoll + Math.cos(t * 2.4 + st.phase) * 0.035;
      }
      for (let i = 0; i < censerPivots.length; i++) {
        censerPivots[i].rotation.z = Math.sin(t * 3.1 + i * 2.1) * 0.12;
        censerPivots[i].rotation.x = Math.cos(t * 2.5 + i) * 0.08 + anim.speedRatio * 0.16;
      }

      // 3. Sternum Singularity Eye & Shoulder Gems
      chestGimbalOuter.rotation.x = t * (isP2 ? 3.2 : 1.7);
      chestGimbalOuter.rotation.y = t * (isP2 ? 2.4 : 1.2);
      chestGimbalInner.rotation.z = -t * (isP2 ? 4.4 : 2.3);
      chestGimbalInner.rotation.x = t * 1.9;
      chestSingularityOrb.rotation.y = t * 2.6;
      const corePulse = 1 + Math.sin(t * 6.5) * 0.12 + castGlow * 0.32 + smoothBeamLock * 0.24;
      chestSingularityOrb.scale.setScalar(corePulse);

      for (let i = 0; i < shoulderGems.length; i++) {
        shoulderGems[i].position.y = 0.29 + Math.sin(t * 3.4 + i * Math.PI) * 0.035;
        shoulderGems[i].rotation.y = t * 1.8 * (i === 0 ? 1 : -1);
      }

      // 4. Head Gaze & Elevated Weakpoint CROWN RESONANCE HALO
      headPivot.rotation.x = isStaggered
        ? -0.26
        : THREE.MathUtils.clamp(-anim.aimPitch * 0.45, -0.35, 0.35);
      headPivot.rotation.y = isStaggered ? Math.sin(t * 7) * 0.14 : 0;

      haloGroup.visible = true;
      if (anim.weakpointBroken) {
        haloGroup.position.set(Math.sin(t * 11) * 0.04, 1.54, -0.05);
        haloGroup.rotation.set(-0.34, Math.sin(t * 4.5) * 0.35, 0.42);
        haloOuterGroup.rotation.z = t * 0.5;
        haloInnerRing.rotation.x = 0.6;
        haloJewel.scale.setScalar(0.58 + Math.sin(t * 16) * 0.1);
        haloJewelMat.emissive.setHex(0x9a3412);
        haloJewelMat.emissiveIntensity = 0.55;
        haloGoldMat.emissiveIntensity = 0.16;
      } else {
        haloGroup.position.set(0, 1.66 + Math.sin(t * 2.8) * 0.045, 0.08);
        haloGroup.rotation.set(0.06 * Math.sin(t * 1.6), 0, 0);
        const haloSpeed = isP2 ? 2.1 : 1.05;
        haloOuterGroup.rotation.z = t * haloSpeed;
        haloInnerRing.rotation.z = -t * haloSpeed * 1.8;
        haloInnerRing.rotation.x = Math.sin(t * 2.2) * 0.38;
        haloJewel.rotation.y = t * 3.2;
        const hScale = 1 + Math.sin(t * 5.2) * 0.1 + castGlow * 0.22 + smoothP2 * 0.12;
        haloJewel.scale.setScalar(hScale);
        haloJewelMat.emissive.setHex(smoothP2 > 0.45 ? 0xe879f9 : 0xf59e0b);
        haloJewelMat.emissiveIntensity = 1.65 + castGlow * 0.75 + smoothP2 * 0.45;
        haloGoldMat.emissiveIntensity = 0.56 + smoothP2 * 0.45 + castGlow * 0.35;
      }

      // 5. Primary Ceremonial Arms (Positive +X bends forward cleanly toward -Z!)
      if (isStaggered) {
        leftArm.shoulder.rotation.set(0.35, 0.15, 0.36);
        rightArm.shoulder.rotation.set(0.35, -0.15, -0.36);
        leftArm.elbow.rotation.set(0.42, 0, 0);
        rightArm.elbow.rotation.set(0.42, 0, 0);
      } else {
        const idleWave = Math.sin(t * 2.2) * 0.07;
        const repelFlare = smoothRepel * (isWindup ? -0.45 : 0.72);
        const scytheSwing =
          smoothScytheSpread * (isWindup ? -0.55 : Math.sin(anim.attackProgress * Math.PI) * 1.12);

        const baseShoulderX =
          0.56 +
          idleWave +
          smoothBeamLock * 0.86 +
          smoothMortarBloom * 1.52 +
          (isAttack && smoothBeamLock < 0.2 && smoothMortarBloom < 0.2 ? 0.32 : 0);

        const baseShoulderZ =
          0.38 +
          smoothMortarBloom * 0.28 -
          smoothBeamLock * 0.22 +
          repelFlare +
          scytheSwing * 0.52;

        leftArm.shoulder.rotation.set(baseShoulderX, -0.16 + smoothBeamLock * 0.32, -baseShoulderZ);
        rightArm.shoulder.rotation.set(baseShoulderX, 0.16 - smoothBeamLock * 0.32, baseShoulderZ);

        const elbowBend = 0.56 + smoothBeamLock * 0.22 - smoothMortarBloom * 0.2;
        leftArm.elbow.rotation.set(elbowBend, 0.12, 0);
        rightArm.elbow.rotation.set(elbowBend, -0.12, 0);
      }

      // 6. 2 Lower Floating Telekinetic Loom-Hands (Wide Seraphic Separation!)
      const updateFloatHand = (fh: typeof leftFloatHand, side: -1 | 1) => {
        const hoverY = 0.08 + Math.sin(t * 3.1 + (side === 1 ? 1.5 : 0)) * 0.055;
        let tx = side * (0.94 + smoothScytheSpread * 0.36 - smoothBeamLock * 0.5);
        let ty = hoverY + smoothMortarBloom * 0.62 + smoothBeamLock * 0.34;
        let tz = -0.44 - smoothBeamLock * 0.36 - smoothScytheSpread * 0.24;

        if (smoothRepel > 0.1) {
          const pull = isWindup ? 0.48 : 1.18;
          tx = side * pull;
          ty = 0.32;
          tz = isWindup ? -0.54 : -0.26;
        }
        if (isStaggered) {
          tx = side * 0.78;
          ty = -0.14;
          tz = -0.2;
        }

        fh.group.position.x += (tx - fh.group.position.x) * Math.min(1, dt * 10);
        fh.group.position.y += (ty - fh.group.position.y) * Math.min(1, dt * 10);
        fh.group.position.z += (tz - fh.group.position.z) * Math.min(1, dt * 10);
        fh.group.rotation.y = side * (smoothBeamLock * 0.28 - smoothScytheSpread * 0.42);
        fh.group.rotation.x = smoothMortarBloom * 0.68;

        fh.focusRing.rotation.x = t * 3.6;
        fh.focusRing.rotation.y = t * 2.4 * side;
        fh.tetherRing.rotation.z = t * 2.8 * side;
        const focusScale = isStaggered
          ? 0.5
          : 1 + castGlow * 0.38 + riftIntensity * 0.42 + smoothBeamLock * 0.3;
        fh.focusGroup.scale.setScalar(focusScale);
      };
      updateFloatHand(leftFloatHand, -1);
      updateFloatHand(rightFloatHand, 1);

      // 7. 6 Articulated Cathedral Monolith Staves (Mathematically Concentric Dynamic Choreography!)
      // Move wheel origin to beamRoot (0, 0.45, -0.72) during beam_prism_lock so staves frame the sweeping beam with zero parallax!
      const tgtWheelY =
        THREE.MathUtils.lerp(0.78, 0.45, smoothBeamLock) + smoothMortarBloom * 0.28;
      const tgtWheelZ = THREE.MathUtils.lerp(0.58, -0.72, smoothBeamLock);
      staveWheelPivot.position.y += (tgtWheelY - staveWheelPivot.position.y) * Math.min(1, dt * 10);
      staveWheelPivot.position.z += (tgtWheelZ - staveWheelPivot.position.z) * Math.min(1, dt * 10);
      const tgtWheelYaw = smoothBeamLock > 0.1 && beamActive ? beamSweepYawOffset * smoothBeamLock : 0;
      staveWheelPivot.rotation.y += (tgtWheelYaw - staveWheelPivot.rotation.y) * Math.min(1, dt * 10);

      const wheelSpinRate = isStaggered
        ? 0.22
        : 0.48 + smoothP2 * 0.85 + smoothBeamLock * 1.4 + smoothMortarBloom * 0.45;
      staveWheelPivot.rotation.z += dt * wheelSpinRate;

      // Clockwork orbital track visible when staves orbit serenely, hides cleanly during Beam Prism Lock
      clockworkTrackGroup.visible = smoothBeamLock < 0.65;
      clockworkTrackGroup.scale.setScalar(1 + smoothP2 * 0.16 + smoothMortarBloom * 0.12);

      // Phase 2 Celestial Mandala Disc anchored behind the Weaver's back
      phase2MandalaGroup.rotation.z = -t * 0.75;
      phase2MandalaMat.opacity = smoothP2 * (0.48 + Math.sin(t * 4.5) * 0.08);
      phase2OuterRing.visible = smoothP2 > 0.15;
      const p2Scale = 0.84 + smoothP2 * 0.22;
      phase2MandalaGroup.scale.setScalar(p2Scale);

      for (let i = 0; i < staves.length; i++) {
        const s = staves[i];
        const a = s.baseAngle;

        let rad = 1.24 + smoothP2 * 0.2 + smoothScytheSpread * 0.22;
        let zOff = 0.0;
        let rotX = 0.12;
        let rotZ = a - Math.PI / 2;

        // Beam Prism Lock: all 6 staves form a 100% concentric hexagonal railgun cage symmetrically around the beam axis!
        if (smoothBeamLock > 0.02) {
          rad = THREE.MathUtils.lerp(rad, 0.56, smoothBeamLock);
          zOff = THREE.MathUtils.lerp(zOff, 0.22, smoothBeamLock);
          rotX = THREE.MathUtils.lerp(rotX, -Math.PI / 2, smoothBeamLock);
          rotZ = THREE.MathUtils.lerp(rotZ, 0, smoothBeamLock);
        }

        // Mortar Crown Bloom: staves rise skyward as artillery spires!
        if (smoothMortarBloom > 0.02) {
          rad = THREE.MathUtils.lerp(rad, 1.42, smoothMortarBloom);
          rotX = THREE.MathUtils.lerp(rotX, -0.34, smoothMortarBloom);
        }

        // Repel Implode: staves draw tightly inward on windup, then explode outward!
        if (smoothRepel > 0.02) {
          const repelRad = isWindup ? 0.88 : 1.66;
          rad = THREE.MathUtils.lerp(rad, repelRad, smoothRepel);
        }

        if (smoothP2 > 0.2 && smoothBeamLock < 0.3) {
          zOff += (i % 2 === 0 ? 0.16 : -0.14) * smoothP2;
        }

        const tx = Math.cos(a) * rad;
        const ty = Math.sin(a) * rad;
        s.pivot.position.x += (tx - s.pivot.position.x) * Math.min(1, dt * 9);
        s.pivot.position.y += (ty - s.pivot.position.y) * Math.min(1, dt * 9);
        s.pivot.position.z += (zOff - s.pivot.position.z) * Math.min(1, dt * 9);
        s.pivot.rotation.x += (rotX - s.pivot.rotation.x) * Math.min(1, dt * 9);
        s.pivot.rotation.z = rotZ;

        s.crystal.rotation.y = t * 3.5 + i;
        const cPulse = 1 + Math.sin(t * 5 + i) * 0.09 + castGlow * 0.2;
        s.crystal.scale.set(0.75 * cPulse, 1.45 * cPulse, 0.75 * cPulse);
      }

      violetCrystalMat.emissive.setHex(smoothP2 > 0.45 ? 0xd946ef : 0xa21caf);
      violetCrystalMat.emissiveIntensity =
        1.22 + smoothP2 * 0.42 + castGlow * 0.55 + riftIntensity * 0.38;
      goldCrystalMat.emissiveIntensity = 1.28 + smoothP2 * 0.38 + castGlow * 0.48;

      // 8. Volumetric Sweeping Reality-Tear Beam + Optical Aperture Iris + Helical Filament Coil
      beamRoot.visible = beamActive;
      if (beamActive) {
        beamRoot.rotation.set(
          THREE.MathUtils.clamp(anim.aimPitch, -0.5, 0.5),
          beamSweepYawOffset,
          0
        );
        irisGroup.rotation.z = t * (beamFiring ? 7.5 : 3.2 + beamCharge * 3.5);
        const irisScale = 0.78 + beamCharge * 0.42 + (beamFiring ? 0.24 : 0);
        irisGroup.scale.setScalar(irisScale);

        const coreRad = beamFiring
          ? 1.55 + Math.sin(t * 36) * 0.22
          : 0.32 + beamCharge * 0.55;
        const sheathRad = beamFiring
          ? 1.45 + Math.sin(t * 28) * 0.18
          : 0.28 + beamCharge * 0.42;

        beamCore.scale.set(coreRad, coreRad, beamLength);
        beamSheath.scale.set(sheathRad, sheathRad, beamLength);
        beamCoreMat.opacity = beamFiring ? 0.96 : 0.38 + beamCharge * 0.48;
        beamSheathMat.opacity = beamFiring ? 0.44 : 0.16 + beamCharge * 0.22;
        beamSheathMat.color.setHex(smoothP2 > 0.45 ? 0xf0abfc : 0xd946ef);

        beamHelixGroup.visible = beamFiring || beamCharge > 0.45;
        beamHelixGroup.rotation.z = -t * (beamFiring ? 14.0 : 5.5);
        const helixRad = beamFiring ? 1.15 + Math.sin(t * 24) * 0.12 : 0.65;
        beamHelixGroup.scale.set(helixRad, helixRad, beamLength);
        beamHelixMat.opacity = beamFiring ? 0.78 : Math.max(0, (beamCharge - 0.45) * 0.85);

        const muzzlePulse = beamFiring ? 1.2 + Math.sin(t * 34) * 0.18 : 0.45 + beamCharge * 0.55;
        beamMuzzleCone.scale.set(muzzlePulse, muzzlePulse, beamFiring ? 1.35 : 0.75);
        beamMuzzleCone.rotation.z = t * 6.5;
        beamMuzzleConeMat.opacity = beamFiring ? 0.56 : 0.18 + beamCharge * 0.28;
        beamMuzzleFlare.scale.setScalar(muzzlePulse * (beamFiring ? 1.15 : 0.65));
        beamMuzzleFlare.rotation.y = t * 9.0;
        beamMuzzleFlare.rotation.z = t * 6.0;

        tex.beamMap.offset.y = -t * (beamFiring ? 5.5 : 2.2);

        beamImpactFlare.visible = beamFiring || beamCharge > 0.7;
        beamImpactFlare.position.set(0, 0, -beamLength);
        const flareSc = beamFiring ? 1.2 + Math.sin(t * 30) * 0.22 : 0.55;
        beamImpactFlare.scale.setScalar(flareSc);
      }
    },
    dispose: () => {
      if (ownsTextures) tex.dispose();
      obsidianArmorMat.dispose();
      relicGoldMat.dispose();
      vestmentMat.dispose();
      maskMat.dispose();
      darkUnderMat.dispose();
      violetCrystalMat.dispose();
      goldCrystalMat.dispose();
      whiteCoreMat.dispose();
      haloGoldMat.dispose();
      haloJewelMat.dispose();
      sigilFloorMat.dispose();
      sigilGoldOverlayMat.dispose();
      phase2MandalaMat.dispose();
      fluxRibbonMat.dispose();
      tetherArcMat.dispose();
      beamCoreMat.dispose();
      beamSheathMat.dispose();
      beamFlareMat.dispose();
      beamHelixMat.dispose();
      beamMuzzleConeMat.dispose();
      root.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).geometry.dispose();
        }
      });
    },
  };
}
