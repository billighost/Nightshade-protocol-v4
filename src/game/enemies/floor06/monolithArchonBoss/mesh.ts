import * as THREE from 'three';
import {
  createBeveledBox,
  createCurvedPanelGeometry,
  createLoftedAnatomy,
  createStrapTube,
} from '../../../core/sculptUtils';
import type { EnemyAnimationInput, EnemyHitZone, EnemyRigHandle } from '../../core/types';
import type { Floor06EnemyMaterials } from '../materials';
import {
  createMonolithArchonTextures,
  type MonolithArchonTextureSuite,
} from './textures';

export type ArchonBossStance =
  | 'hover_stalk'
  | 'rail_scissor'
  | 'cataclysm_ascend'
  | 'cataclysm_slam'
  | 'scythe_cleave'
  | 'meteor_salvo'
  | 'astral_fan'
  | 'lance_barrage'
  | 'phase_blink'
  | 'supernova_cascade'
  | 'resonance_vent';

export interface ArchonBossVisualState {
  stance?: ArchonBossStance;
  phase2Aura?: number;
  shutterOpen?: number;
  scytheGlow?: number;
  scytheSwingAngle?: number;
  sanctuaryIntensity?: number;
  wingSpreadBoost?: number;
  pylonPitchBoost?: number;
  supernovaCharge?: number;
}

export interface MonolithArchonRigHandle extends EnemyRigHandle {
  getLeftPylonMuzzlePos: (out: THREE.Vector3) => THREE.Vector3;
  getRightPylonMuzzlePos: (out: THREE.Vector3) => THREE.Vector3;
  getFunnelMuzzlePos: (index: number, out: THREE.Vector3) => THREE.Vector3;
  setArchonVisualState: (state: ArchonBossVisualState) => void;
  setDualArchonLasers: (
    active: boolean,
    leftLen: number,
    rightLen: number,
    chargeRatio: number,
    firing?: boolean,
    leftYawOffset?: number,
    rightYawOffset?: number
  ) => void;
}

function makeHitbox(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  enemyId: string,
  hitZone: EnemyHitZone,
  pos: [number, number, number]
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(pos[0], pos[1], pos[2]);
  m.userData = { enemyId, hitZone };
  return m;
}

function tagHitZone(obj: THREE.Object3D, enemyId: string, hitZone: EnemyHitZone): void {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.userData.enemyId = enemyId;
      child.userData.hitZone = hitZone;
    }
  });
}

/** Sculpted Monumental Seraphic Pinion Wing-Blade with Gothic lancet window! */
function buildSeraphicWingBladeGeo(length: number, width: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(width * 0.44, length * 0.14);
  shape.lineTo(width * 0.54, length * 0.48);
  shape.lineTo(width * 0.28, length * 0.82);
  shape.lineTo(0, length);
  shape.lineTo(-width * 0.24, length * 0.78);
  shape.lineTo(-width * 0.4, length * 0.42);
  shape.lineTo(-width * 0.28, length * 0.1);
  shape.closePath();

  const hole = new THREE.Path();
  hole.moveTo(0, length * 0.26);
  hole.lineTo(width * 0.16, length * 0.44);
  hole.lineTo(0, length * 0.72);
  hole.lineTo(-width * 0.14, length * 0.44);
  hole.closePath();
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.078,
    bevelEnabled: true,
    bevelThickness: 0.022,
    bevelSize: 0.018,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.039);
  geo.computeVertexNormals();
  return geo;
}

/** Inner crystalline plasma feather-vane nestled inside each seraphic wing's lancet window. */
function buildWingCrystalVaneGeo(length: number, width: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, length * 0.24);
  shape.lineTo(width * 0.17, length * 0.44);
  shape.lineTo(0, length * 0.74);
  shape.lineTo(-width * 0.15, length * 0.44);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.032,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.008,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.016);
  geo.computeVertexNormals();
  return geo;
}

/** Sculpted Gothic-Brutalist Royal Tasset Armor Plate. */
function buildTassetPlateGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.22, 0.04);
  shape.lineTo(0.22, 0.04);
  shape.lineTo(0.27, -0.32);
  shape.lineTo(0.16, -0.88);
  shape.lineTo(0, -1.16);
  shape.lineTo(-0.16, -0.88);
  shape.lineTo(-0.27, -0.32);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.056,
    bevelEnabled: true,
    bevelThickness: 0.016,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.028);
  geo.computeVertexNormals();
  return geo;
}

/** Draped Ceremonial Royal Velvet-Brocade Stole Banner hanging fore & aft. */
function buildCeremonialStoleGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.22, 0);
  shape.lineTo(0.22, 0);
  shape.lineTo(0.25, -1.12);
  shape.lineTo(0, -1.44);
  shape.lineTo(-0.25, -1.12);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.028,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.014);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Flush Interlocking Gothic Cathedral Chest Vault-Shutter Door (Left half; mirror X for Right).
 * Inner edge sits squarely at x = 0 so both doors seal 100% flush with zero awkward gap!
 */
function buildChestShutterDoorGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.56);
  shape.lineTo(-0.34, 0.5);
  shape.lineTo(-0.56, 0.24);
  shape.lineTo(-0.56, -0.24);
  shape.lineTo(-0.34, -0.5);
  shape.lineTo(0, -0.56);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.095,
    bevelEnabled: true,
    bevelThickness: 0.022,
    bevelSize: 0.018,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.0475);
  geo.computeVertexNormals();
  return geo;
}

/** Sculpted Gothic Lancet Crown Spire tapering to a razor point. */
function buildCrownSpireGeo(height: number, baseW: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-baseW * 0.5, 0);
  shape.lineTo(baseW * 0.5, 0);
  shape.lineTo(baseW * 0.24, height * 0.52);
  shape.lineTo(0, height);
  shape.lineTo(-baseW * 0.24, height * 0.52);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.036,
    bevelEnabled: true,
    bevelThickness: 0.011,
    bevelSize: 0.009,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.018);
  geo.computeVertexNormals();
  return geo;
}

/** Sleek Tapered Gothic Rail-Obelisk Pylon Prong (extends forward along -Z!). */
function buildPylonForkProngGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.56, 0.01);
  shape.lineTo(0.76, 0.045);
  shape.lineTo(1.22, 0.13);
  shape.lineTo(0.96, 0.25);
  shape.lineTo(0.24, 0.22);
  shape.lineTo(-0.48, 0.17);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.15,
    bevelEnabled: true,
    bevelThickness: 0.022,
    bevelSize: 0.016,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.075);
  geo.rotateY(Math.PI / 2); // Shape +X extends forward along -Z!
  geo.computeVertexNormals();
  return geo;
}

/** Sculpted Swept Gothic Aerofoil Stabilizer Fin mounted on the outer flank of each Rail-Lance Pylon. */
function buildPylonAerofoilFinGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.56, 0.06);
  shape.lineTo(0.42, 0.22);
  shape.lineTo(0.68, 0.04);
  shape.lineTo(0.36, -0.18);
  shape.lineTo(-0.44, -0.12);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.046,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.012,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.023);
  geo.rotateY(Math.PI / 2); // Shape +X extends forward along -Z!
  geo.computeVertexNormals();
  return geo;
}

/** Tapered Heroic V-Shaped Cathedral Dorsal Spine Carapace Shell (eliminates flat boxy backpack!). */
function buildDorsalSpineCarapaceGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.62);
  shape.lineTo(0.24, -0.44);
  shape.lineTo(0.46, 0.16);
  shape.lineTo(0.52, 0.44);
  shape.lineTo(0.28, 0.56);
  shape.lineTo(0, 0.62);
  shape.lineTo(-0.28, 0.56);
  shape.lineTo(-0.52, 0.44);
  shape.lineTo(-0.46, 0.16);
  shape.lineTo(-0.24, -0.44);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.24,
    bevelEnabled: true,
    bevelThickness: 0.045,
    bevelSize: 0.036,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.12);
  geo.computeVertexNormals();
  return geo;
}

/** Sculpted Hard-Light Curved Seraphic War-Scythe Blade igniting from each Pylon. */
function buildSeraphicScytheBladeGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.04);
  shape.quadraticCurveTo(0.74, -0.12, 1.48, 0.28);
  shape.quadraticCurveTo(1.88, 0.58, 2.06, 0.98);
  shape.quadraticCurveTo(1.5, 0.6, 0.9, 0.32);
  shape.quadraticCurveTo(0.36, 0.12, 0, 0.1);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.026,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 16,
  });
  geo.translate(0, 0, -0.013);
  geo.rotateY(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/** Sculpted Autonomous Floating Astral Monolith Fin-Funnel prism. */
function buildFunnelBodyGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.22, 0);
  shape.lineTo(0.36, 0.095);
  shape.lineTo(0.52, 0);
  shape.lineTo(0.36, -0.095);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.016,
    bevelSize: 0.014,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.06);
  geo.rotateY(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds Floor 06 Final Boss — THE MONOLITH ARCHON (Round 2 AAA Cathedral Sovereign Sculpt):
 * - Photorealistic 1024×1024 4-octave FBM Veined Nero-Marquina Obsidian (with Phase 2 molten magma veins!),
 *   Brushed Gunmetal-Titanium Plating, Hammered Antique Cathedral Gold, Royal Obsidian-Velvet Gold Brocade,
 *   Swirling Gravitational Event-Horizon Singularity Core & Faceted Astral Crystals.
 * - Heroic V-Tapered Armored Sovereign Cuirass with Layered Titanium Oblique Rib-Lames & Sculpted Dorsal Spine.
 * - Flush-Sealing Interlocking Gothic Cathedral Chest Vault-Shutters unveiling the Singularity Core.
 * - Chiseled Faceless Sovereign War-Mask with 3 Burning Seraphic Eyes, 7-Spire Diadem Crown & Triple Astrolabe Halo.
 * - Monumental 3-Tier Layered Shoulder Pauldrons with Braided Astral-Gold Tether Conduits to Twin Gothic Rail Pylons.
 * - 6 Compound Multi-Layered Seraphic Pinion Wings (~6.9m wingspan) + 6 Vertical Cathedral Judgment Light Pillars.
 */
export function buildMonolithArchonBossRig(
  enemyId: string,
  mats: Floor06EnemyMaterials,
  sharedTextures?: MonolithArchonTextureSuite
): MonolithArchonRigHandle {
  const ownsTextures = !sharedTextures;
  const tex = sharedTextures ?? createMonolithArchonTextures();

  // ── Photorealistic Multi-Material PBR Suite (Stark Stone / Metal / Gold / Velvet Contrast!) ──
  const obsidianMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.obsidianMap,
    bumpMap: tex.obsidianBump,
    bumpScale: 0.036,
    roughnessMap: tex.obsidianRoughness,
    roughness: 0.64,
    metalness: 0.24,
    envMapIntensity: 0.42,
    emissive: 0xf97316,
    emissiveMap: tex.obsidianVeinEmissive,
    emissiveIntensity: 0.08,
  });

  const titaniumMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.titaniumMap,
    bumpMap: tex.titaniumBump,
    bumpScale: 0.024,
    roughnessMap: tex.titaniumRoughness,
    roughness: 0.42,
    metalness: 0.78,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.goldMap,
    bumpMap: tex.goldBump,
    bumpScale: 0.026,
    roughnessMap: tex.goldRoughness,
    roughness: 0.32,
    metalness: 0.92,
  });

  const mantleMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.mantleMap,
    bumpMap: tex.mantleBump,
    bumpScale: 0.022,
    roughnessMap: tex.mantleRoughness,
    roughness: 0.96,
    metalness: 0.02,
    envMapIntensity: 0.14,
    side: THREE.DoubleSide,
  });

  // Dedicated pure matte royal obsidian-crimson velvet brocade for inner gorget (mathematically zero specular glare!)
  const gorgetVelvetMat = new THREE.MeshLambertMaterial({
    color: 0x3b1222,
    map: tex.mantleMap,
    side: THREE.DoubleSide,
  });

  const darkCoreMetalMat = new THREE.MeshStandardMaterial({
    color: 0x05060b,
    roughness: 0.92,
    metalness: 0.12,
    envMapIntensity: 0.08,
  });

  const astralCrystalMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.crystalMap,
    emissive: 0x9333ea,
    emissiveMap: tex.crystalMap,
    emissiveIntensity: 1.25,
    roughness: 0.14,
    metalness: 0.25,
    flatShading: true,
  });

  const sovereignGoldGlowMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.35,
    roughness: 0.18,
    metalness: 0.45,
    flatShading: true,
  });

  const singularityCoreMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.singularityMap,
    emissive: 0xffffff,
    emissiveMap: tex.singularityMap,
    emissiveIntensity: 1.85,
    roughness: 0.1,
    metalness: 0.18,
  });

  const singularityHorizonMat = new THREE.MeshBasicMaterial({
    color: 0x06020d,
  });

  const singularityCageMat = new THREE.MeshStandardMaterial({
    color: 0x452605,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.95,
    roughness: 0.2,
    metalness: 0.94,
    wireframe: true,
  });

  const visorMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfbbf24,
    emissiveIntensity: 2.35,
    roughness: 0.08,
    metalness: 0.2,
  });

  const tetherEnergyMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const scytheBladeMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    map: tex.beamFluxMap,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const sanctuaryOuterMat = new THREE.MeshBasicMaterial({
    color: 0xc084fc,
    alphaMap: tex.sanctuarySigilMap,
    transparent: true,
    opacity: 0.36,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const sanctuaryInnerMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    alphaMap: tex.sanctuarySigilMap,
    transparent: true,
    opacity: 0.32,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const lightPillarMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    map: tex.beamFluxMap,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const beamCoreMat = new THREE.MeshBasicMaterial({
    color: 0xfffdf5,
    transparent: true,
    opacity: 0.96,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const beamSheathMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    map: tex.beamFluxMap,
    transparent: true,
    opacity: 0.56,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const beamHelixMat = new THREE.MeshBasicMaterial({
    color: 0xe879f9,
    transparent: true,
    opacity: 0.82,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const beamFlareMat = new THREE.MeshBasicMaterial({
    color: 0xfde68a,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const supernovaHaloMat = new THREE.MeshBasicMaterial({
    color: 0xf97316,
    alphaMap: tex.sanctuarySigilMap,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const root = new THREE.Group();
  root.name = `monolith_archon_boss_${enemyId}`;

  // ── 1. Grounded Contact Shadow, Astrolabe Sanctuary Sigil, Orbit Shards & 6 Judgment Light Pillars ──
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2), mats.shadowDisc);
  shadow.rotation.x = -Math.PI * 0.5;
  shadow.position.y = 0.025;
  root.add(shadow);

  const sanctuaryGroup = new THREE.Group();
  sanctuaryGroup.position.y = 0.048;
  root.add(sanctuaryGroup);

  const sanctuaryOuter = new THREE.Mesh(new THREE.CircleGeometry(3.45, 64), sanctuaryOuterMat);
  sanctuaryOuter.rotation.x = -Math.PI * 0.5;
  sanctuaryGroup.add(sanctuaryOuter);

  const sanctuaryInner = new THREE.Mesh(new THREE.CircleGeometry(2.15, 48), sanctuaryInnerMat);
  sanctuaryInner.rotation.x = -Math.PI * 0.5;
  sanctuaryInner.position.y = 0.01;
  sanctuaryGroup.add(sanctuaryInner);

  // 6 Vertical Cathedral Judgment Light Pillars around the Sanctuary perimeter (flare on Slam/Supernova!)
  const pillarGeo = new THREE.CylinderGeometry(0.18, 0.32, 6.2, 12, 1, true);
  pillarGeo.translate(0, 3.1, 0);
  const lightPillars: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const pil = new THREE.Mesh(pillarGeo, lightPillarMat);
    pil.position.set(Math.cos(a) * 3.15, 0, Math.sin(a) * 3.15);
    pil.visible = false;
    sanctuaryGroup.add(pil);
    lightPillars.push(pil);
  }

  // 6 Levitated Basalt-Gold Monolith Shards orbiting the gravity sanctuary
  const orbitShards: THREE.Mesh[] = [];
  const shardGeo = new THREE.OctahedronGeometry(0.13, 0);
  for (let i = 0; i < 6; i++) {
    const sh = new THREE.Mesh(shardGeo, i % 2 === 0 ? obsidianMat : goldMat);
    sh.scale.set(0.68, 2.0 + (i % 3) * 0.4, 0.68);
    sh.castShadow = true;
    sanctuaryGroup.add(sh);
    orbitShards.push(sh);
  }

  // ── 2. Towering Hovering Sovereign Body (~4.45m Cathedral presence) ──
  const sovereign = new THREE.Group();
  sovereign.position.set(0, 2.1, 0);
  root.add(sovereign);

  // 2A. Open-Work Fluted Lower Cathedral Censer-Spire & Suspended Gravitic Gyro-Core
  const lowerVesselGeo = createLoftedAnatomy(
    [
      { y: -1.48, rx: 0.055, rz: 0.055, squareness: 2.35 },
      { y: -1.08, rx: 0.24, rz: 0.2, squareness: 2.7 },
      { y: -0.56, rx: 0.42, rz: 0.34, squareness: 2.75 },
      { y: -0.14, rx: 0.38, rz: 0.3, squareness: 2.6 },
      { y: 0.06, rx: 0.44, rz: 0.34, squareness: 2.55 },
    ],
    24
  );
  const lowerVessel = new THREE.Mesh(lowerVesselGeo, titaniumMat);
  lowerVessel.castShadow = true;
  lowerVessel.receiveShadow = true;
  sovereign.add(lowerVessel);

  // 4 Chased-Gold Architectural Meridian Buttresses framing the lower spire
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
    const rib = new THREE.Mesh(
      createStrapTube(
        [
          new THREE.Vector3(Math.cos(a) * 0.46, 0.02, Math.sin(a) * 0.36),
          new THREE.Vector3(Math.cos(a) * 0.5, -0.52, Math.sin(a) * 0.4),
          new THREE.Vector3(Math.cos(a) * 0.28, -1.06, Math.sin(a) * 0.24),
          new THREE.Vector3(Math.cos(a) * 0.07, -1.48, Math.sin(a) * 0.07),
        ],
        0.044,
        0.92,
        16
      ),
      goldMat
    );
    rib.castShadow = true;
    sovereign.add(rib);
  }

  // Sculpted Royal Waist Belt-Cincture + Glowing Buckle Reliquary
  const waistBelt = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: -0.12, rx: 0.48, rz: 0.38, squareness: 2.75 },
        { y: 0.02, rx: 0.53, rz: 0.42, squareness: 2.85 },
        { y: 0.14, rx: 0.47, rz: 0.37, squareness: 2.75 },
      ],
      20
    ),
    goldMat
  );
  waistBelt.castShadow = true;
  sovereign.add(waistBelt);

  const beltClasp = new THREE.Mesh(createBeveledBox(0.24, 0.24, 0.14, 0.022), obsidianMat);
  beltClasp.position.set(0, 0.02, -0.4);
  beltClasp.rotation.z = Math.PI * 0.25;
  sovereign.add(beltClasp);
  const beltGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), astralCrystalMat);
  beltGem.position.set(0, 0.02, -0.48);
  sovereign.add(beltGem);

  // 2 Flowing Royal Obsidian-Gold Velvet Brocade Ceremonial Stole Banners (Front & Rear!)
  const stoleGeo = buildCeremonialStoleGeo();
  const frontStolePivot = new THREE.Group();
  frontStolePivot.position.set(0, -0.06, -0.42);
  sovereign.add(frontStolePivot);
  const frontStole = new THREE.Mesh(stoleGeo, mantleMat);
  frontStole.rotation.x = -0.1;
  frontStole.castShadow = true;
  frontStolePivot.add(frontStole);
  const frontStoleFinial = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), goldMat);
  frontStoleFinial.scale.set(0.7, 1.5, 0.7);
  frontStoleFinial.position.set(0, -1.42, -0.14);
  frontStolePivot.add(frontStoleFinial);

  const rearStolePivot = new THREE.Group();
  rearStolePivot.position.set(0, -0.06, 0.42);
  sovereign.add(rearStolePivot);
  const rearStole = new THREE.Mesh(stoleGeo, mantleMat);
  rearStole.rotation.x = 0.12;
  rearStole.castShadow = true;
  rearStolePivot.add(rearStole);

  // 6 Articulated Tiered Veined-Obsidian & Titanium Gothic Tasset Plates around flanks
  const tassetGeo = buildTassetPlateGeo();
  const tassetPivots: Array<{ pivot: THREE.Group; baseAngle: number }> = [];
  const tassetAngles = [
    Math.PI * 0.22,
    Math.PI * 0.5,
    Math.PI * 0.78,
    -Math.PI * 0.22,
    -Math.PI * 0.5,
    -Math.PI * 0.78,
  ];
  for (let i = 0; i < tassetAngles.length; i++) {
    const a = tassetAngles[i];
    const tp = new THREE.Group();
    tp.position.set(Math.sin(a) * 0.56, -0.04, Math.cos(a) * 0.44);
    tp.rotation.y = a;
    sovereign.add(tp);

    const plate = new THREE.Mesh(tassetGeo, i % 2 === 0 ? obsidianMat : titaniumMat);
    plate.rotation.x = -0.15;
    plate.castShadow = true;
    tp.add(plate);

    const trim = new THREE.Mesh(createBeveledBox(0.072, 0.86, 0.082, 0.012), goldMat);
    trim.position.set(0, -0.46, 0.015);
    trim.rotation.x = -0.15;
    tp.add(trim);

    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.052, 0), astralCrystalMat);
    gem.position.set(0, -0.96, 0.1);
    tp.add(gem);

    tassetPivots.push({ pivot: tp, baseAngle: a });
  }

  // Suspended Lower Levitation Anchor Gyro-Crystal & Dual Meridian Rings
  const anchorCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.19, 0), astralCrystalMat);
  anchorCrystal.scale.set(0.72, 1.65, 0.72);
  anchorCrystal.position.y = -1.72;
  sovereign.add(anchorCrystal);

  const anchorRingOuter = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.024, 8, 28), goldMat);
  anchorRingOuter.rotation.x = Math.PI * 0.5;
  anchorRingOuter.position.y = -1.68;
  sovereign.add(anchorRingOuter);

  const anchorRingInner = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.016, 8, 20), sovereignGoldGlowMat);
  anchorRingInner.position.y = -1.68;
  sovereign.add(anchorRingInner);

  // Tilted Precessing Equatorial Cathedral Monolith Rune-Ring orbiting the Sovereign's lower waist!
  const equatorialRing = new THREE.Group();
  equatorialRing.position.set(0, -0.34, 0);
  equatorialRing.rotation.set(0.22, 0, -0.14);
  sovereign.add(equatorialRing);
  const eqTorus = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.02, 8, 48), goldMat);
  eqTorus.rotation.x = Math.PI * 0.5;
  equatorialRing.add(eqTorus);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const tablet = new THREE.Mesh(createBeveledBox(0.16, 0.24, 0.042, 0.008), obsidianMat);
    tablet.position.set(Math.cos(a) * 1.18, 0, Math.sin(a) * 1.18);
    tablet.rotation.y = -a + Math.PI * 0.5;
    equatorialRing.add(tablet);
    const tGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.036, 0), astralCrystalMat);
    tGem.position.set(Math.cos(a) * 1.22, 0, Math.sin(a) * 1.22);
    equatorialRing.add(tGem);
  }

  // ── 3. HEROIC V-TAPERED SOVEREIGN CUIRASS, TITANIUM RIB-LAMES & DORSAL SPINE ──
  const torsoCuirassGeo = createLoftedAnatomy(
    [
      { y: 0.04, rx: 0.44, rz: 0.34, squareness: 2.65 },
      { y: 0.38, rx: 0.64, rz: 0.43, squareness: 2.8, frontScale: 1.06 },
      { y: 0.78, rx: 0.96, rz: 0.52, squareness: 2.95, frontScale: 1.1 },
      { y: 1.14, rx: 1.14, rz: 0.49, squareness: 2.85, frontScale: 1.05 },
      { y: 1.32, rx: 0.76, rz: 0.42, squareness: 2.6 },
      { y: 1.44, rx: 0.36, rz: 0.32, squareness: 2.4 },
    ],
    28
  );
  const torsoCuirass = new THREE.Mesh(torsoCuirassGeo, obsidianMat);
  torsoCuirass.castShadow = true;
  torsoCuirass.receiveShadow = true;
  sovereign.add(torsoCuirass);

  // Sculpted Clavicular Gold-and-Titanium Shoulder Yoke Mantle (creates regal broad-shouldered silhouette!)
  const clavicularYoke = new THREE.Mesh(
    createBeveledBox(2.26, 0.22, 0.72, 0.055),
    titaniumMat
  );
  clavicularYoke.position.set(0, 1.16, 0.02);
  clavicularYoke.castShadow = true;
  sovereign.add(clavicularYoke);

  const yokeGoldCrest = new THREE.Mesh(createBeveledBox(2.04, 0.09, 0.76, 0.022), goldMat);
  yokeGoldCrest.position.set(0, 1.25, 0.02);
  sovereign.add(yokeGoldCrest);

  // Layered Brushed-Titanium Oblique Rib-Lames hugging the waist & mid-flanks (left & right!)
  for (const side of [-1, 1] as const) {
    for (let r = 0; r < 3; r++) {
      const ry = 0.2 + r * 0.22;
      const rx = 0.56 + r * 0.14;
      const rz = 0.39 + r * 0.05;
      const ribLame = new THREE.Mesh(
        createCurvedPanelGeometry(
          [
            { y: ry - 0.06, rx, rz, thickness: 0.05 },
            { y: ry + 0.07, rx: rx + 0.05, rz: rz + 0.02, thickness: 0.05 },
          ],
          side === 1 ? -Math.PI * 0.3 : Math.PI * 0.7,
          side === 1 ? Math.PI * 0.3 : Math.PI * 1.3,
          12
        ),
        titaniumMat
      );
      ribLame.castShadow = true;
      sovereign.add(ribLame);

      const ribGoldPiping = new THREE.Mesh(
        createCurvedPanelGeometry(
          [
            { y: ry + 0.05, rx: rx + 0.055, rz: rz + 0.025, thickness: 0.024 },
            { y: ry + 0.09, rx: rx + 0.055, rz: rz + 0.025, thickness: 0.024 },
          ],
          side === 1 ? -Math.PI * 0.28 : Math.PI * 0.72,
          side === 1 ? Math.PI * 0.28 : Math.PI * 1.28,
          12
        ),
        goldMat
      );
      sovereign.add(ribGoldPiping);
    }
  }

  // Sculpted Forged-Gold Pectoral Chevron Filigree Trim & Astral Tether Anchor Port Collars (front upper torso!)
  for (const side of [-1, 1] as const) {
    const pecFiligree = new THREE.Mesh(
      createStrapTube(
        [
          new THREE.Vector3(side * 0.14, 1.32, -0.43),
          new THREE.Vector3(side * 0.62, 1.18, -0.49),
          new THREE.Vector3(side * 0.98, 0.94, -0.34),
        ],
        0.028,
        0.92,
        12
      ),
      goldMat
    );
    sovereign.add(pecFiligree);

    // Sculpted gold conduit collar where each astral energy tether anchors cleanly into the torso flank
    const tetherPort = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.105, 0.14, 10), goldMat);
    tetherPort.rotation.z = Math.PI * 0.5;
    tetherPort.position.set(side * 1.12, 0.88, -0.02);
    sovereign.add(tetherPort);
    const portCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.052, 0), astralCrystalMat);
    portCore.position.set(side * 1.19, 0.88, -0.02);
    sovereign.add(portCore);
  }

  // Sculpted Heroic Tapered V-Shaped Cathedral Dorsal Vertebral Carapace (+Z back — zero boxy slab!)
  const dorsalCarapace = new THREE.Mesh(buildDorsalSpineCarapaceGeo(), obsidianMat);
  dorsalCarapace.position.set(0, 0.78, 0.52);
  dorsalCarapace.castShadow = true;
  dorsalCarapace.receiveShadow = true;
  sovereign.add(dorsalCarapace);

  // Twin beveled brushed-titanium dorsal scapular wing-mount cowlings flanking the spine
  for (const side of [-1, 1] as const) {
    const scapulaCowl = new THREE.Mesh(createBeveledBox(0.32, 0.72, 0.24, 0.04), titaniumMat);
    scapulaCowl.position.set(side * 0.44, 0.92, 0.48);
    scapulaCowl.rotation.z = -side * 0.22;
    scapulaCowl.rotation.y = side * 0.2;
    scapulaCowl.castShadow = true;
    sovereign.add(scapulaCowl);
  }

  // 3 Curved Forged-Gold Thoracic Spine Rib-Arches wrapping cleanly across the dorsal carapace
  for (let a = 0; a < 3; a++) {
    const ry = 0.44 + a * 0.34;
    const rw = 0.36 + a * 0.14;
    const archRib = new THREE.Mesh(
      createStrapTube(
        [
          new THREE.Vector3(-rw, ry - 0.06, 0.44),
          new THREE.Vector3(-rw * 0.52, ry + 0.04, 0.66),
          new THREE.Vector3(0, ry + 0.08, 0.72),
          new THREE.Vector3(rw * 0.52, ry + 0.04, 0.66),
          new THREE.Vector3(rw, ry - 0.06, 0.44),
        ],
        0.032,
        0.9,
        16
      ),
      goldMat
    );
    archRib.castShadow = true;
    sovereign.add(archRib);
  }

  // Recessed central glowing spine energy conduit + 5 tapered obsidian-gold vertebral crests
  const dorsalConduit = new THREE.Mesh(
    createBeveledBox(0.055, 1.06, 0.05, 0.008),
    sovereignGoldGlowMat
  );
  dorsalConduit.position.set(0, 0.78, 0.65);
  sovereign.add(dorsalConduit);

  for (let v = 0; v < 5; v++) {
    const vy = 0.24 + v * 0.24;
    const vw = 0.16 + Math.sin((v / 4) * Math.PI) * 0.12;
    const vertebra = new THREE.Mesh(createBeveledBox(vw, 0.11, 0.18, 0.022), obsidianMat);
    vertebra.position.set(0, vy, 0.63 + (v >= 1 && v <= 3 ? 0.06 : 0));
    vertebra.rotation.x = -0.18;
    sovereign.add(vertebra);
    const vGlow = new THREE.Mesh(new THREE.OctahedronGeometry(0.048, 0), astralCrystalMat);
    vGlow.scale.set(0.75, 1.25, 0.75);
    vGlow.position.set(0, vy, 0.73 + (v >= 1 && v <= 3 ? 0.06 : 0));
    sovereign.add(vGlow);
  }

  // Sculpted High-Collar Obsidian & Gold Cathedral Gorget framing the rear/flanks of head (+Z)
  const gorgetOuter = new THREE.Mesh(
    createCurvedPanelGeometry(
      [
        { y: 1.24, rx: 0.54, rz: 0.46, thickness: 0.068 },
        { y: 1.54, rx: 0.66, rz: 0.54, thickness: 0.072 },
        { y: 1.84, rx: 0.62, rz: 0.5, thickness: 0.052 },
      ],
      Math.PI * 0.08,
      Math.PI * 0.92,
      18
    ),
    obsidianMat
  );
  gorgetOuter.castShadow = true;
  sovereign.add(gorgetOuter);

  const gorgetVelvetInner = new THREE.Mesh(
    createCurvedPanelGeometry(
      [
        { y: 1.26, rx: 0.48, rz: 0.4, thickness: 0.022 },
        { y: 1.72, rx: 0.56, rz: 0.44, thickness: 0.022 },
      ],
      Math.PI * 0.12,
      Math.PI * 0.88,
      16
    ),
    gorgetVelvetMat
  );
  sovereign.add(gorgetVelvetInner);

  const gorgetGoldRim = new THREE.Mesh(
    createCurvedPanelGeometry(
      [
        { y: 1.79, rx: 0.64, rz: 0.52, thickness: 0.044 },
        { y: 1.88, rx: 0.63, rz: 0.51, thickness: 0.036 },
      ],
      Math.PI * 0.08,
      Math.PI * 0.92,
      18
    ),
    goldMat
  );
  sovereign.add(gorgetGoldRim);

  // Monumental 3-Tier Layered Cathedral Sovereign Shoulder Pauldrons (sculpted clavicle bridge!)
  for (const side of [-1, 1] as const) {
    const pGroup = new THREE.Group();
    pGroup.position.set(side * 1.18, 1.12, 0.02);
    pGroup.rotation.z = -side * 0.14;
    sovereign.add(pGroup);

    // Sculpted Cylindrical Titanium Clavicle Bridge & Forged-Gold Shoulder Collar Ring (no boxy slab!)
    const clavicleBridge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.21, 0.44, 12),
      titaniumMat
    );
    clavicleBridge.rotation.z = Math.PI * 0.5;
    clavicleBridge.position.set(-side * 0.16, 0.0, 0);
    pGroup.add(clavicleBridge);

    const shoulderCollar = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.028, 8, 18), goldMat);
    shoulderCollar.rotation.y = Math.PI * 0.5;
    shoulderCollar.position.set(-side * 0.12, 0.0, 0);
    pGroup.add(shoulderCollar);

    // Tier 1: Monumental Upper Veined-Obsidian Carapace Shell
    const upperShell = new THREE.Mesh(
      createCurvedPanelGeometry(
        [
          { y: -0.18, rx: 0.54, rz: 0.58, thickness: 0.075 },
          { y: 0.16, rx: 0.56, rz: 0.6, thickness: 0.082 },
          { y: 0.4, rx: 0.32, rz: 0.42, thickness: 0.062 },
        ],
        side === 1 ? -Math.PI * 0.44 : Math.PI * 0.56,
        side === 1 ? Math.PI * 0.44 : Math.PI * 1.44,
        16
      ),
      obsidianMat
    );
    upperShell.castShadow = true;
    pGroup.add(upperShell);

    // Tier 2: Lower Brushed-Titanium Articulated Lame
    const lowerLame = new THREE.Mesh(
      createCurvedPanelGeometry(
        [
          { y: -0.42, rx: 0.46, rz: 0.48, thickness: 0.06 },
          { y: -0.16, rx: 0.52, rz: 0.54, thickness: 0.064 },
        ],
        side === 1 ? -Math.PI * 0.4 : Math.PI * 0.6,
        side === 1 ? Math.PI * 0.4 : Math.PI * 1.4,
        14
      ),
      titaniumMat
    );
    lowerLame.castShadow = true;
    pGroup.add(lowerLame);

    // Tier 3: Hammered-Gold Chased Rim Borders
    const upperGoldTrim = new THREE.Mesh(
      createCurvedPanelGeometry(
        [
          { y: -0.2, rx: 0.56, rz: 0.6, thickness: 0.036 },
          { y: -0.12, rx: 0.56, rz: 0.6, thickness: 0.036 },
        ],
        side === 1 ? -Math.PI * 0.44 : Math.PI * 0.56,
        side === 1 ? Math.PI * 0.44 : Math.PI * 1.44,
        16
      ),
      goldMat
    );
    pGroup.add(upperGoldTrim);

    // Sculpted Upward-Swept Gold Cathedral Pauldron Fin-Spire + Glowing Shoulder Core
    const finSpire = new THREE.Mesh(buildCrownSpireGeo(0.66, 0.24), goldMat);
    finSpire.position.set(side * 0.16, 0.34, 0);
    finSpire.rotation.z = -side * 0.32;
    finSpire.rotation.y = Math.PI * 0.5;
    pGroup.add(finSpire);

    const shoulderGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), astralCrystalMat);
    shoulderGem.position.set(side * 0.48, 0.02, -0.18);
    pGroup.add(shoulderGem);

    // Ceremonial forged gold shoulder chain draping gracefully to the sternum bezel
    const chain = new THREE.Mesh(
      createStrapTube(
        [
          new THREE.Vector3(side * 0.14, -0.22, -0.34),
          new THREE.Vector3(side * -0.18, -0.44, -0.44),
          new THREE.Vector3(side * -0.58, -0.34, -0.48),
        ],
        0.024,
        0.92,
        12
      ),
      goldMat
    );
    pGroup.add(chain);
  }

  // Twin Floating Articulated Sovereign Forearm Vambraces & Gold Claw-Gauntlets!
  const buildGauntlet = (side: -1 | 1) => {
    const g = new THREE.Group();
    g.position.set(side * 1.38, 0.32, -0.22);
    sovereign.add(g);

    const vambraceGeo = createLoftedAnatomy(
      [
        { y: -0.28, rx: 0.1, rz: 0.11, squareness: 2.6 },
        { y: 0.0, rx: 0.14, rz: 0.16, squareness: 2.8 },
        { y: 0.28, rx: 0.17, rz: 0.18, squareness: 2.7 },
      ],
      14
    );
    const vambrace = new THREE.Mesh(vambraceGeo, obsidianMat);
    vambrace.rotation.x = Math.PI * 0.44;
    vambrace.castShadow = true;
    g.add(vambrace);

    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.022, 8, 16), goldMat);
    cuff.position.set(0, -0.04, -0.24);
    g.add(cuff);

    // 4 Splayed Articulated Gold Sovereign Claw-Talons channeling telekinetic force toward the Pylon
    for (let f = 0; f < 4; f++) {
      const fa = (f / 4) * Math.PI * 2 + Math.PI * 0.25;
      const talon = new THREE.Mesh(buildCrownSpireGeo(0.26, 0.06), goldMat);
      talon.position.set(Math.cos(fa) * 0.11, Math.sin(fa) * 0.11 - 0.04, -0.28);
      talon.rotation.x = -Math.PI * 0.46;
      talon.rotation.z = fa - Math.PI * 0.5;
      g.add(talon);
    }
    const palmOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.068, 0), astralCrystalMat);
    palmOrb.position.set(0, -0.04, -0.36);
    g.add(palmOrb);

    return g;
  };
  const gauntletL = buildGauntlet(-1);
  const gauntletR = buildGauntlet(1);

  // ── 4. GATED WEAKPOINT: Deep Recessed Reliquary SINGULARITY CORE & 100% Zero-Clip Vault-Shutters ──
  const coreReliquary = new THREE.Group();
  coreReliquary.position.set(0, 0.72, -0.49);
  sovereign.add(coreReliquary);

  // Deep armored octagonal coffer housing extending flush to the vault door seal
  const reliquaryOuterBezel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.58, 0.36, 8),
    titaniumMat
  );
  reliquaryOuterBezel.rotation.x = Math.PI * 0.5;
  reliquaryOuterBezel.rotation.y = Math.PI * 0.125;
  reliquaryOuterBezel.position.z = -0.02;
  coreReliquary.add(reliquaryOuterBezel);

  const reliquaryDarkWell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.49, 0.46, 0.38, 16),
    darkCoreMetalMat
  );
  reliquaryDarkWell.rotation.x = Math.PI * 0.5;
  reliquaryDarkWell.position.z = -0.02;
  coreReliquary.add(reliquaryDarkWell);

  const reliquaryGoldFrame = new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.056, 10, 8), goldMat);
  reliquaryGoldFrame.rotation.z = Math.PI * 0.125;
  reliquaryGoldFrame.position.z = -0.18;
  coreReliquary.add(reliquaryGoldFrame);

  // Twin Sculpted Gold Mechanical Vault-Hinge Knuckles flanking the chest coffer
  for (const side of [-1, 1] as const) {
    const knuckle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.56, 10), goldMat);
    knuckle.position.set(side * 0.58, 0, -0.2);
    coreReliquary.add(knuckle);
  }

  // 4 Chased-Gold Magnetic Containment Prongs pointing inward toward the Singularity
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
    const prong = new THREE.Mesh(createBeveledBox(0.06, 0.24, 0.07, 0.01), goldMat);
    prong.position.set(Math.cos(a) * 0.44, Math.sin(a) * 0.44, -0.16);
    prong.rotation.z = a + Math.PI * 0.5;
    coreReliquary.add(prong);
  }

  // Recessed Singularity Assembly (retracts cleanly behind closed vault doors; surges outward when open!)
  const coreAssembly = new THREE.Group();
  coreAssembly.position.z = 0.02;
  coreReliquary.add(coreAssembly);

  const coreGimbalOuter = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.024, 10, 32), goldMat);
  coreAssembly.add(coreGimbalOuter);

  const coreGimbalInner = new THREE.Mesh(
    new THREE.TorusGeometry(0.31, 0.018, 8, 28),
    astralCrystalMat
  );
  coreAssembly.add(coreGimbalInner);

  const coreSphere = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 18), singularityCoreMat);
  coreAssembly.add(coreSphere);

  const coreHorizonInner = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 16, 12),
    singularityHorizonMat
  );
  coreAssembly.add(coreHorizonInner);

  const coreAccretionDisc = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.022, 8, 32),
    sovereignGoldGlowMat
  );
  coreAccretionDisc.rotation.x = 1.15;
  coreAssembly.add(coreAccretionDisc);

  const coreWireCage = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 0), singularityCageMat);
  coreAssembly.add(coreWireCage);

  // Flush-Sealing Interlocking Gothic Cathedral Chest Vault-Shutters at z = -0.26 (100% ZERO core bleed!)
  const shutterGeo = buildChestShutterDoorGeo();
  const shutterPivotL = new THREE.Group();
  shutterPivotL.position.set(0, 0, -0.26);
  coreReliquary.add(shutterPivotL);
  const shutterMeshL = new THREE.Mesh(shutterGeo, obsidianMat);
  shutterMeshL.castShadow = true;
  shutterPivotL.add(shutterMeshL);
  const shutterGoldBarL = new THREE.Mesh(createBeveledBox(0.056, 0.78, 0.12, 0.01), goldMat);
  shutterGoldBarL.position.set(-0.24, 0, -0.015);
  shutterPivotL.add(shutterGoldBarL);
  const shutterCrossL = new THREE.Mesh(createBeveledBox(0.38, 0.058, 0.118, 0.01), goldMat);
  shutterCrossL.position.set(-0.22, 0, -0.015);
  shutterPivotL.add(shutterCrossL);
  const shutterSeamGlowL = new THREE.Mesh(
    createBeveledBox(0.018, 0.68, 0.124, 0.004),
    sovereignGoldGlowMat
  );
  shutterSeamGlowL.position.set(-0.02, 0, -0.015);
  shutterPivotL.add(shutterSeamGlowL);

  const shutterPivotR = new THREE.Group();
  shutterPivotR.position.set(0, 0, -0.26);
  coreReliquary.add(shutterPivotR);
  const shutterMeshR = new THREE.Mesh(shutterGeo, obsidianMat);
  shutterMeshR.scale.x = -1;
  shutterMeshR.castShadow = true;
  shutterPivotR.add(shutterMeshR);
  const shutterGoldBarR = new THREE.Mesh(createBeveledBox(0.056, 0.78, 0.12, 0.01), goldMat);
  shutterGoldBarR.position.set(0.24, 0, -0.015);
  shutterPivotR.add(shutterGoldBarR);
  const shutterCrossR = new THREE.Mesh(createBeveledBox(0.38, 0.058, 0.118, 0.01), goldMat);
  shutterCrossR.position.set(0.22, 0, -0.015);
  shutterPivotR.add(shutterCrossR);
  const shutterSeamGlowR = new THREE.Mesh(
    createBeveledBox(0.018, 0.68, 0.124, 0.004),
    sovereignGoldGlowMat
  );
  shutterSeamGlowR.position.set(0.02, 0, -0.015);
  shutterPivotR.add(shutterSeamGlowR);

  // ── 5. ICONIC FACELESS SOVEREIGN WAR-MASK, 7-SPIRE DIADEM CROWN & TRIPLE ASTROLABE HALO ──
  const head = new THREE.Group();
  head.position.set(0, 1.56, -0.04);
  sovereign.add(head);

  // Chiseled Angular Obsidian-Gold Sovereign Funeral War-Mask (sharp cheekbones & sculpted chin!)
  const helmGeo = createLoftedAnatomy(
    [
      { y: -0.22, rx: 0.1, rz: 0.14, squareness: 2.8, frontScale: 1.25 },
      { y: 0.04, rx: 0.24, rz: 0.3, squareness: 3.1, frontScale: 1.2 },
      { y: 0.34, rx: 0.3, rz: 0.34, squareness: 3.0, frontScale: 1.16 },
      { y: 0.68, rx: 0.25, rz: 0.3, squareness: 2.85 },
      { y: 1.04, rx: 0.07, rz: 0.1, squareness: 2.5 },
    ],
    20
  );
  const helmMesh = new THREE.Mesh(helmGeo, obsidianMat);
  helmMesh.castShadow = true;
  head.add(helmMesh);

  // Forged-Gold Sculpted Cheekbone Plates, Nasal Crest & Sharp Chin Finial
  const nasalCrest = new THREE.Mesh(createBeveledBox(0.078, 0.68, 0.14, 0.014), goldMat);
  nasalCrest.position.set(0, 0.3, -0.34);
  head.add(nasalCrest);

  const chinFinial = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), goldMat);
  chinFinial.scale.set(0.75, 1.85, 0.85);
  chinFinial.position.set(0, -0.18, -0.22);
  head.add(chinFinial);

  for (const side of [-1, 1] as const) {
    const cheekGuard = new THREE.Mesh(createBeveledBox(0.11, 0.44, 0.22, 0.018), titaniumMat);
    cheekGuard.position.set(side * 0.24, 0.12, -0.18);
    cheekGuard.rotation.y = side * 0.35;
    cheekGuard.rotation.z = -side * 0.14;
    head.add(cheekGuard);

    const cheekGoldEdge = new THREE.Mesh(createBeveledBox(0.045, 0.38, 0.055, 0.008), goldMat);
    cheekGoldEdge.position.set(side * 0.21, 0.1, -0.3);
    cheekGoldEdge.rotation.z = -side * 0.18;
    head.add(cheekGoldEdge);
  }

  // Sculpted Angled Sovereign Brow Diadem Band
  const tiaraBand = new THREE.Mesh(
    createCurvedPanelGeometry(
      [
        { y: 0.36, rx: 0.33, rz: 0.37, thickness: 0.048 },
        { y: 0.46, rx: 0.35, rz: 0.39, thickness: 0.046 },
      ],
      -Math.PI * 0.96,
      -Math.PI * 0.04,
      16
    ),
    goldMat
  );
  head.add(tiaraBand);

  // Deeply Recessed Obsidian Ocular Cavity with 3 RAZOR-SHARP BURNING SERAPHIC EYES!
  const visorRecess = new THREE.Mesh(createBeveledBox(0.46, 0.14, 0.1, 0.012), darkCoreMetalMat);
  visorRecess.position.set(0, 0.26, -0.32);
  head.add(visorRecess);

  for (const side of [-1, 1] as const) {
    const eyeSlit = new THREE.Mesh(createBeveledBox(0.16, 0.04, 0.05, 0.006), visorMat);
    eyeSlit.position.set(side * 0.125, 0.265, -0.368);
    eyeSlit.rotation.z = side * 0.22; // Fierce predatory angled chevron gaze!
    eyeSlit.rotation.y = -side * 0.18;
    head.add(eyeSlit);
  }

  const thirdEyeDiamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.062, 0), visorMat);
  thirdEyeDiamond.scale.set(0.62, 1.5, 0.62);
  thirdEyeDiamond.position.set(0, 0.48, -0.385);
  head.add(thirdEyeDiamond);

  // 7-Spire Sculpted Gothic Cathedral Diadem Crown!
  const crownAngles = [-0.88, -0.58, -0.29, 0, 0.29, 0.58, 0.88];
  const crownHeights = [0.34, 0.5, 0.66, 0.88, 0.66, 0.5, 0.34];
  for (let i = 0; i < crownAngles.length; i++) {
    const a = crownAngles[i];
    const sp = new THREE.Mesh(buildCrownSpireGeo(crownHeights[i], i === 3 ? 0.16 : 0.115), goldMat);
    sp.position.set(Math.sin(a) * 0.35, 0.43, -Math.cos(a) * 0.28);
    sp.rotation.z = -a * 0.68;
    sp.rotation.x = -0.22;
    sp.castShadow = true;
    head.add(sp);
  }

  // Monumental Triple-Ring Floating Cathedral Astrolabe Halo + Vertical Phase 2 Supernova Eclipse Ring
  const haloRoot = new THREE.Group();
  haloRoot.position.set(0, 0.34, 0.52);
  head.add(haloRoot);

  const astrolabeOuter = new THREE.Group();
  haloRoot.add(astrolabeOuter);
  astrolabeOuter.add(new THREE.Mesh(new THREE.TorusGeometry(1.44, 0.056, 10, 48), goldMat));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const major = i % 3 === 0;
    const needle = new THREE.Mesh(
      createBeveledBox(major ? 0.072 : 0.038, major ? 0.34 : 0.18, 0.05, 0.008),
      major ? goldMat : titaniumMat
    );
    needle.position.set(Math.cos(a) * (1.44 + (major ? 0.17 : 0.1)), Math.sin(a) * (1.44 + (major ? 0.17 : 0.1)), 0);
    needle.rotation.z = a - Math.PI * 0.5;
    astrolabeOuter.add(needle);
    if (major) {
      const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.082, 0), astralCrystalMat);
      jewel.position.set(Math.cos(a) * 1.44, Math.sin(a) * 1.44, -0.05);
      astrolabeOuter.add(jewel);
    }
  }

  const astrolabeMid = new THREE.Group();
  haloRoot.add(astrolabeMid);
  astrolabeMid.add(new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.044, 8, 8), obsidianMat));
  const midTrimMesh = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.022, 8, 32), goldMat);
  midTrimMesh.position.z = -0.03;
  astrolabeMid.add(midTrimMesh);

  const astrolabeInner = new THREE.Mesh(
    new THREE.TorusGeometry(0.76, 0.026, 8, 32),
    astralCrystalMat
  );
  haloRoot.add(astrolabeInner);

  // Phase 2 Celestial Solar-Eclipse Ring cleanly mounted behind the dorsal halo (never clips camera!)
  const supernovaHalo = new THREE.Mesh(new THREE.CircleGeometry(2.15, 48), supernovaHaloMat);
  supernovaHalo.position.set(0, -0.1, 0.14);
  haloRoot.add(supernovaHalo);

  // ── 6. 6 MONUMENTAL COMPOUND SERAPHIC PINION WING-BLADES (~6.9m Wingspan!) ──
  const wingsGroup = new THREE.Group();
  wingsGroup.position.set(0, 0.92, 0.6);
  sovereign.add(wingsGroup);

  const wingSpecs: Array<[number, number, number, number, number]> = [
    [2.72, 0.56, 0.72, 0.42, 0.44],
    [2.44, 0.48, 0.94, 0.1, 0.86],
    [1.98, 0.42, 0.86, -0.26, 1.3],
  ];
  const wings: Array<{ pivot: THREE.Group; baseAngle: number; side: -1 | 1; tier: number }> = [];
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < wingSpecs.length; i++) {
      const [len, wid, xOff, yOff, baseAng] = wingSpecs[i];
      const pivot = new THREE.Group();
      pivot.position.set(side * xOff, yOff, i * 0.12);
      pivot.rotation.z = -side * baseAng;
      pivot.rotation.y = -side * (0.16 + i * 0.07);
      wingsGroup.add(pivot);

      // Sculpted Titanium-and-Gold Wing Socket Bracket (no plain brown cylinder!)
      const bracket = new THREE.Mesh(createBeveledBox(0.24, 0.28, 0.24, 0.03), titaniumMat);
      pivot.add(bracket);
      const hingeCap = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.11, 0.28, 8), goldMat);
      hingeCap.rotation.x = Math.PI * 0.5;
      pivot.add(hingeCap);

      // Primary Veined-Obsidian Pinion Blade
      const blade = new THREE.Mesh(buildSeraphicWingBladeGeo(len, wid), obsidianMat);
      blade.castShadow = true;
      blade.receiveShadow = true;
      pivot.add(blade);

      // Recessed Luminous Faceted Astral-Crystal Feather Vane filling the Gothic lancet window!
      const crystalVane = new THREE.Mesh(buildWingCrystalVaneGeo(len, wid), astralCrystalMat);
      pivot.add(crystalVane);

      // Hammered-Gold Cathedral Spine Rib running up the blade axis
      const spineRib = new THREE.Mesh(
        createBeveledBox(0.075, len * 0.84, 0.105, 0.012),
        goldMat
      );
      spineRib.position.y = len * 0.44;
      pivot.add(spineRib);

      // Faceted Astral-Crystal Spear-Tip Finial
      const tipGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.145, 0), astralCrystalMat);
      tipGem.scale.set(0.58, 2.05, 0.58);
      tipGem.position.y = len + 0.06;
      pivot.add(tipGem);

      wings.push({ pivot, baseAngle: side * baseAng, side, tier: i });
    }
  }

  // ── 7. TWIN GOTHIC RAIL-OBELISK PYLONS + ENERGY TETHER CONDUITS + WAR-SCYTHES ──
  const prongGeo = buildPylonForkProngGeo();
  const scytheGeo = buildSeraphicScytheBladeGeo();
  const beamCoreGeo = new THREE.CylinderGeometry(0.055, 0.055, 1, 12);
  beamCoreGeo.rotateX(Math.PI * 0.5);
  beamCoreGeo.translate(0, 0, -0.5);

  const beamSheathGeo = new THREE.CylinderGeometry(0.18, 0.22, 1, 16, 1, true);
  beamSheathGeo.rotateX(Math.PI * 0.5);
  beamSheathGeo.translate(0, 0, -0.5);

  const muzzleConeGeo = new THREE.CylinderGeometry(0.36, 0.06, 0.68, 16, 1, true);
  muzzleConeGeo.rotateX(Math.PI * 0.5);
  muzzleConeGeo.translate(0, 0, -0.34);

  const tetherUnitGeo = new THREE.CylinderGeometry(0.028, 0.028, 1, 8, 1, true);
  tetherUnitGeo.rotateX(Math.PI * 0.5); // aligns length along Z!

  const pylonAerofoilGeo = buildPylonAerofoilFinGeo();
  const buildPylon = (side: -1 | 1) => {
    const pylon = new THREE.Group();
    pylon.position.set(side * 1.82, 0.54, -0.38);
    sovereign.add(pylon);

    // Sculpted rear capacitor housing (Veined Obsidian + Brushed Titanium frame + Swept Gothic Aerofoil Fin!)
    const rearHousing = new THREE.Mesh(createBeveledBox(0.38, 0.46, 0.76, 0.042), obsidianMat);
    rearHousing.position.z = 0.28;
    rearHousing.castShadow = true;
    pylon.add(rearHousing);

    const innerBarrelFrame = new THREE.Mesh(createBeveledBox(0.24, 0.26, 1.05, 0.02), titaniumMat);
    innerBarrelFrame.position.z = -0.18;
    pylon.add(innerBarrelFrame);

    // Sleek Layered Gothic Chevron Aerofoil Stabilizer Fin (gold frame + obsidian inlay + crystal slit!)
    const sideAeroFin = new THREE.Mesh(pylonAerofoilGeo, goldMat);
    sideAeroFin.position.set(side * 0.21, 0.02, 0.14);
    sideAeroFin.castShadow = true;
    pylon.add(sideAeroFin);

    const sideAeroInlay = new THREE.Mesh(pylonAerofoilGeo, obsidianMat);
    sideAeroInlay.position.set(side * 0.232, 0.02, 0.14);
    sideAeroInlay.scale.set(0.68, 0.68, 0.72);
    pylon.add(sideAeroInlay);

    const sideEnergySlit = new THREE.Mesh(
      createBeveledBox(0.032, 0.042, 0.64, 0.006),
      astralCrystalMat
    );
    sideEnergySlit.position.set(side * 0.252, 0.02, 0.1);
    pylon.add(sideEnergySlit);

    // Upper & Lower Sleek Tapered Gothic Magnetic Accelerator Prongs (-Z)
    const upperFork = new THREE.Mesh(prongGeo, obsidianMat);
    upperFork.position.set(0, 0.09, -0.2);
    upperFork.castShadow = true;
    pylon.add(upperFork);

    const lowerFork = new THREE.Mesh(prongGeo, obsidianMat);
    lowerFork.scale.y = -1;
    lowerFork.position.set(0, -0.09, -0.2);
    lowerFork.castShadow = true;
    pylon.add(lowerFork);

    // Twin Glowing Inner Plasma Accelerator Rails lining the inside faces of the tuning fork!
    for (const ry of [0.105, -0.105]) {
      const innerRail = new THREE.Mesh(
        createBeveledBox(0.042, 0.022, 1.14, 0.004),
        sovereignGoldGlowMat
      );
      innerRail.position.set(0, ry, -0.58);
      pylon.add(innerRail);
    }

    // 3 Hammered-Gold Magnetic Induction Coils framing the rail core
    for (let c = 0; c < 3; c++) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 8, 18), goldMat);
      coil.position.z = -0.26 - c * 0.28;
      pylon.add(coil);
    }

    // Spinning Faceted Plasma Accelerator Prism inside the rail fork
    const emitterCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), sovereignGoldGlowMat);
    emitterCrystal.scale.set(0.8, 0.8, 1.85);
    emitterCrystal.position.set(0, 0, -0.62);
    pylon.add(emitterCrystal);

    // Transformable Hard-Light Curved Seraphic War-Scythe Blade
    const scytheBlade = new THREE.Mesh(scytheGeo, scytheBladeMat);
    scytheBlade.position.set(side * 0.04, 0.02, -0.82);
    scytheBlade.rotation.z = -side * 0.36;
    scytheBlade.visible = false;
    pylon.add(scytheBlade);

    // Live Astral-Gold Gravity Tether Conduit linking shoulder yoke -> pylon capacitor!
    const tetherBeam = new THREE.Mesh(tetherUnitGeo, tetherEnergyMat);
    sovereign.add(tetherBeam);
    const tetherMidRing = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.016, 6, 16), goldMat);
    sovereign.add(tetherMidRing);

    // Muzzle & Volumetric 3-Layer Scissor Rail Beam Assembly
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0, -1.3);
    pylon.add(muzzle);

    const beamRoot = new THREE.Group();
    beamRoot.visible = false;
    muzzle.add(beamRoot);

    const irisRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.02, 8, 24), sovereignGoldGlowMat);
    beamRoot.add(irisRing);

    const beamCore = new THREE.Mesh(beamCoreGeo, beamCoreMat);
    beamRoot.add(beamCore);

    const beamSheath = new THREE.Mesh(beamSheathGeo, beamSheathMat);
    beamRoot.add(beamSheath);

    const muzzleCone = new THREE.Mesh(muzzleConeGeo, beamSheathMat);
    beamRoot.add(muzzleCone);

    const beamHelix = new THREE.Group();
    beamRoot.add(beamHelix);
    for (let strand = 0; strand < 2; strand++) {
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= 28; s++) {
        const frac = s / 28;
        const ang = frac * Math.PI * 6 + strand * Math.PI;
        const r = 0.22;
        pts.push(new THREE.Vector3(Math.cos(ang) * r, Math.sin(ang) * r, -frac));
      }
      const hGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 36, 0.016, 5, false);
      beamHelix.add(new THREE.Mesh(hGeo, beamHelixMat));
    }

    const muzzleFlare = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 1), beamFlareMat);
    muzzleFlare.position.set(0, 0, -0.06);
    beamRoot.add(muzzleFlare);

    const impactFlare = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10), beamFlareMat);
    beamRoot.add(impactFlare);

    return {
      pylon,
      emitterCrystal,
      scytheBlade,
      tetherBeam,
      tetherMidRing,
      muzzle,
      beamRoot,
      irisRing,
      beamCore,
      beamSheath,
      muzzleCone,
      beamHelix,
      muzzleFlare,
      impactFlare,
    };
  };
  const pylonL = buildPylon(-1);
  const pylonR = buildPylon(1);

  // ── 8. 4 Autonomous Orbiting Astral Monolith Fin-Funnels ──
  const funnelGeo = buildFunnelBodyGeo();
  const funnels: Array<{ group: THREE.Group; muzzle: THREE.Object3D; baseIndex: number }> = [];
  for (let i = 0; i < 4; i++) {
    const fg = new THREE.Group();
    sovereign.add(fg);

    const fBody = new THREE.Mesh(funnelGeo, obsidianMat);
    fBody.castShadow = true;
    fg.add(fBody);

    const fGold = new THREE.Mesh(createBeveledBox(0.16, 0.045, 0.4, 0.008), goldMat);
    fGold.position.z = -0.04;
    fg.add(fGold);

    const fGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), astralCrystalMat);
    fGem.position.z = -0.48;
    fg.add(fGem);

    const fMuzzle = new THREE.Object3D();
    fMuzzle.position.set(0, 0, -0.56);
    fg.add(fMuzzle);

    funnels.push({ group: fg, muzzle: fMuzzle, baseIndex: i });
  }

  // ── 9. Dedicated Invisible Raycast Hitboxes & Hit-Zone Tagging ──
  const bodyHit = makeHitbox(
    new THREE.BoxGeometry(2.3, 3.1, 1.55),
    mats.hitboxInvisible,
    enemyId,
    'body',
    [0, 0.15, 0]
  );
  const headHit = makeHitbox(
    new THREE.BoxGeometry(0.95, 1.15, 0.95),
    mats.hitboxInvisible,
    enemyId,
    'head',
    [0, 0.42, 0]
  );
  const wpHit = makeHitbox(
    new THREE.SphereGeometry(0.62, 12, 10),
    mats.hitboxInvisible,
    enemyId,
    'weakpoint',
    [0, 0, -0.08]
  );
  sovereign.add(bodyHit);
  head.add(headHit);
  coreReliquary.add(wpHit);

  tagHitZone(root, enemyId, 'body');
  tagHitZone(head, enemyId, 'head');
  tagHitZone(coreReliquary, enemyId, 'weakpoint');
  tagHitZone(shutterPivotL, enemyId, 'body');
  tagHitZone(shutterPivotR, enemyId, 'body');
  bodyHit.material = mats.hitboxInvisible;
  headHit.material = mats.hitboxInvisible;
  wpHit.material = mats.hitboxInvisible;

  const hitboxes: THREE.Mesh[] = [bodyHit, headHit, wpHit];
  const weakpointMaterials: THREE.MeshStandardMaterial[] = [
    singularityCoreMat,
    sovereignGoldGlowMat,
  ];
  const armorFlashMaterials: THREE.MeshStandardMaterial[] = [
    obsidianMat,
    titaniumMat,
    goldMat,
    mantleMat,
  ];

  // ── Runtime Visual State & Reusable Scratch Vectors (zero per-frame allocations!) ──
  let stance: ArchonBossStance = 'hover_stalk';
  let phase2Aura = 0;
  let shutterOpenOverride = 0;
  let scytheGlow = 0;
  let scytheSwingAngle = 0;
  let sanctuaryIntensity = 0;
  let wingSpreadBoost = 0;
  let pylonPitchBoost = 0;
  let supernovaCharge = 0;

  let lasersOn = false;
  let laserLeftLen = 0;
  let laserRightLen = 0;
  let laserCharge = 0;
  let laserFiring = false;
  let laserLeftYaw = 0;
  let laserRightYaw = 0;

  let smoothShutter = 0;
  let smoothP2 = 0;
  let smoothScythe = 0;
  let smoothSupernova = 0;
  let smoothAscend = 0;
  let smoothSlam = 0;

  const tmpStart = new THREE.Vector3();
  const tmpEnd = new THREE.Vector3();
  const tmpMid = new THREE.Vector3();

  // Helper to orient a child of `sovereign` along local `start -> end` with zero allocations!
  const tmpDir = new THREE.Vector3();
  const tmpZ = new THREE.Vector3(0, 0, 1);
  const tmpQuat = new THREE.Quaternion();
  const updateLocalTether = (
    p: typeof pylonL,
    side: -1 | 1,
    t: number,
    isStaggered: boolean
  ) => {
    if (isStaggered) {
      p.tetherBeam.visible = false;
      p.tetherMidRing.visible = false;
      return;
    }
    p.tetherBeam.visible = true;
    p.tetherMidRing.visible = true;
    tmpStart.set(side * 1.19, 0.88, -0.02);
    tmpEnd.set(p.pylon.position.x, p.pylon.position.y + 0.02, p.pylon.position.z + 0.34);
    tmpDir.subVectors(tmpEnd, tmpStart);
    const dist = tmpDir.length();
    if (dist > 0.001) {
      tmpDir.multiplyScalar(1 / dist);
      tmpQuat.setFromUnitVectors(tmpZ, tmpDir);
      p.tetherBeam.quaternion.copy(tmpQuat);
    }
    tmpMid.addVectors(tmpStart, tmpEnd).multiplyScalar(0.5);
    p.tetherBeam.position.copy(tmpMid);
    const pulse = 0.9 + Math.sin(t * 9.0 + side) * 0.2 + smoothP2 * 0.35;
    p.tetherBeam.scale.set(pulse, pulse, Math.max(0.08, dist));
    p.tetherMidRing.position.copy(tmpMid);
    p.tetherMidRing.quaternion.copy(tmpQuat);
    p.tetherMidRing.rotateZ(t * 3.8 * side);
  };

  const updatePylonBeam = (
    p: typeof pylonL,
    len: number,
    yawOff: number,
    t: number,
    isP2: boolean
  ) => {
    const show = lasersOn && len > 0.25;
    p.beamRoot.visible = show;
    if (!show) return;
    p.beamRoot.rotation.set(0, yawOff, 0);
    p.irisRing.rotation.z = t * (laserFiring ? 9.5 : 4.2);
    p.irisRing.scale.setScalar(0.75 + laserCharge * 0.55 + (laserFiring ? 0.25 : 0));

    const coreR = laserFiring ? 1.55 + Math.sin(t * 36) * 0.22 : 0.26 + laserCharge * 0.45;
    const sheathR = laserFiring ? 1.45 + Math.sin(t * 28) * 0.18 : 0.28 + laserCharge * 0.42;
    p.beamCore.scale.set(coreR, coreR, len);
    p.beamSheath.scale.set(sheathR, sheathR, len);
    p.muzzleCone.scale.set(
      laserFiring ? 1.3 : 0.55 + laserCharge * 0.5,
      laserFiring ? 1.3 : 0.55 + laserCharge * 0.5,
      laserFiring ? 1.35 : 0.72
    );
    p.muzzleCone.rotation.z = t * 7.2;

    p.beamHelix.visible = laserFiring || laserCharge > 0.45;
    p.beamHelix.rotation.z = -t * (laserFiring ? 16.0 : 6.5);
    const hRad = laserFiring ? 1.15 : 0.65;
    p.beamHelix.scale.set(hRad, hRad, len);

    p.muzzleFlare.scale.setScalar(
      laserFiring ? 1.35 + Math.sin(t * 32) * 0.2 : 0.55 + laserCharge * 0.55
    );
    p.muzzleFlare.rotation.y = t * 9.0;
    p.impactFlare.visible = laserFiring || laserCharge > 0.65;
    p.impactFlare.position.set(0, 0, -len);
    p.impactFlare.scale.setScalar(laserFiring ? 1.35 + Math.sin(t * 30) * 0.22 : 0.62);

    beamSheathMat.color.setHex(isP2 || laserFiring ? 0xf97316 : 0xf59e0b);
    beamHelixMat.color.setHex(isP2 ? 0xfde047 : 0xe879f9);
    beamCoreMat.opacity = laserFiring ? 0.96 : 0.34 + laserCharge * 0.5;
    beamSheathMat.opacity = laserFiring ? 0.56 : 0.18 + laserCharge * 0.28;
    beamHelixMat.opacity = laserFiring ? 0.85 : Math.max(0, (laserCharge - 0.45) * 0.9);
  };

  return {
    root,
    hitboxes,
    weakpointMaterials,
    armorFlashMaterials,
    getMuzzleWorldPos(out: THREE.Vector3) {
      return coreSphere.getWorldPosition(out);
    },
    getWeakpointWorldPos(out: THREE.Vector3) {
      return coreSphere.getWorldPosition(out);
    },
    getLeftPylonMuzzlePos(out: THREE.Vector3) {
      return pylonL.muzzle.getWorldPosition(out);
    },
    getRightPylonMuzzlePos(out: THREE.Vector3) {
      return pylonR.muzzle.getWorldPosition(out);
    },
    getFunnelMuzzlePos(index: number, out: THREE.Vector3) {
      const f = funnels[((index % funnels.length) + funnels.length) % funnels.length];
      return f.muzzle.getWorldPosition(out);
    },
    setArchonVisualState(st: ArchonBossVisualState) {
      if (st.stance !== undefined) stance = st.stance;
      if (st.phase2Aura !== undefined) phase2Aura = st.phase2Aura;
      if (st.shutterOpen !== undefined) shutterOpenOverride = st.shutterOpen;
      if (st.scytheGlow !== undefined) scytheGlow = st.scytheGlow;
      if (st.scytheSwingAngle !== undefined) scytheSwingAngle = st.scytheSwingAngle;
      if (st.sanctuaryIntensity !== undefined) sanctuaryIntensity = st.sanctuaryIntensity;
      if (st.wingSpreadBoost !== undefined) wingSpreadBoost = st.wingSpreadBoost;
      if (st.pylonPitchBoost !== undefined) pylonPitchBoost = st.pylonPitchBoost;
      if (st.supernovaCharge !== undefined) supernovaCharge = st.supernovaCharge;
    },
    setDualArchonLasers(
      active: boolean,
      leftLen: number,
      rightLen: number,
      chargeRatio: number,
      firing = false,
      leftYawOffset = 0,
      rightYawOffset = 0
    ) {
      lasersOn = active;
      laserLeftLen = leftLen;
      laserRightLen = rightLen;
      laserCharge = Math.max(0, Math.min(1.5, chargeRatio));
      laserFiring = firing;
      laserLeftYaw = leftYawOffset;
      laserRightYaw = rightYawOffset;
    },
    updateAnimation(input: EnemyAnimationInput) {
      const t = input.elapsed;
      const dt = Math.min(0.08, Math.max(0.001, input.dt));
      const isP2 = input.phase === 2;
      const isStaggered = input.behavior === 'staggered' || input.staggerTimer > 0;
      const isAttacking = input.behavior === 'windup' || input.behavior === 'attack';

      if (input.deadProgress > 0) {
        const dp = Math.min(1, input.deadProgress);
        const ease = 1 - (1 - dp) * (1 - dp);
        const floorOff = -Math.max(0, input.airborneHeight);
        shadow.position.y = floorOff + 0.025;
        sanctuaryGroup.position.y = floorOff + 0.048;

        // Monumental Cathedral Sovereign Collapse: descends, tilts forward, shutters blow open as core implodes!
        sovereign.position.y = Math.max(0.86, 2.1 - ease * 1.24);
        sovereign.rotation.x = ease * 0.56;
        sovereign.rotation.z = ease * 0.28;
        sovereign.rotation.y = ease * 0.16;

        // Chest shutters wrench open as the Singularity Core sputters and collapses to zero
        shutterPivotL.position.x = -0.64;
        shutterPivotR.position.x = 0.64;
        shutterPivotL.rotation.y = 0.88;
        shutterPivotR.rotation.y = -0.88;
        coreAssembly.visible = dp < 0.72;
        coreAssembly.scale.setScalar(Math.max(0.01, (1 - dp * 1.35) * 0.95));
        singularityCoreMat.emissiveIntensity = Math.max(0, 1.4 * (1 - dp * 1.4));
        obsidianMat.emissiveIntensity = Math.max(0, 0.8 * (1 - dp * 1.3));
        visorMat.emissiveIntensity = Math.max(0, 2.0 * (1 - dp * 1.5));

        // 6 Seraphic Pinion Wings droop heavily downward instead of awkwardly shrinking
        for (let i = 0; i < wings.length; i++) {
          const w = wings[i];
          w.pivot.rotation.z = -(w.baseAngle + w.side * ease * 0.78);
          w.pivot.rotation.x = ease * 0.45;
        }

        // Triple Astrolabe Halo tilts askew & Equatorial Rune-Ring drops downward
        haloRoot.rotation.set(ease * 0.55, ease * 0.25, ease * 0.42);
        equatorialRing.position.y = -0.34 - ease * 0.85;
        equatorialRing.rotation.x = 0.22 + ease * 0.48;
        equatorialRing.rotation.z = -0.14 - ease * 0.35;

        // Twin Rail-Lance Pylons & Floating Gauntlets lose levitation and sink toward floor
        pylonL.pylon.position.set(-1.95 - ease * 0.45, 0.54 - ease * 1.35, -0.38 + ease * 0.25);
        pylonR.pylon.position.set(1.95 + ease * 0.45, 0.54 - ease * 1.35, -0.38 + ease * 0.25);
        pylonL.pylon.rotation.set(-ease * 0.85, 0, ease * 0.42);
        pylonR.pylon.rotation.set(-ease * 0.85, 0, -ease * 0.42);
        gauntletL.position.set(-1.32 - ease * 0.25, 0.46 - ease * 1.05, -0.3);
        gauntletR.position.set(1.32 + ease * 0.25, 0.46 - ease * 1.05, -0.3);

        pylonL.beamRoot.visible = false;
        pylonR.beamRoot.visible = false;
        pylonL.scytheBlade.visible = false;
        pylonR.scytheBlade.visible = false;
        pylonL.tetherBeam.visible = false;
        pylonR.tetherBeam.visible = false;
        pylonL.tetherMidRing.visible = false;
        pylonR.tetherMidRing.visible = false;
        supernovaHalo.visible = false;
        for (let i = 0; i < lightPillars.length; i++) lightPillars[i].visible = false;
        for (let i = 0; i < orbitShards.length; i++) orbitShards[i].visible = false;

        sanctuaryGroup.scale.setScalar(Math.max(0.01, 1 - ease * 0.65));
        sanctuaryOuterMat.opacity = Math.max(0, 0.36 * (1 - dp));
        sanctuaryInnerMat.opacity = Math.max(0, 0.32 * (1 - dp));
        return;
      }

      const blend = Math.min(1, dt * 8.5);
      const tgtP2 = isP2 || phase2Aura > 0.1 ? Math.max(isP2 ? 1 : 0, phase2Aura) : 0;
      const tgtScythe = stance === 'scythe_cleave' ? Math.max(1, scytheGlow) : scytheGlow;
      const tgtSupernova =
        stance === 'supernova_cascade' ? Math.max(1, supernovaCharge) : supernovaCharge;
      const tgtAscend =
        stance === 'cataclysm_ascend' || stance === 'supernova_cascade' ? 1 : 0;
      const tgtSlam = stance === 'cataclysm_slam' ? 1 : 0;

      smoothP2 += (tgtP2 - smoothP2) * blend;
      smoothScythe += (tgtScythe - smoothScythe) * blend;
      smoothSupernova += (tgtSupernova - smoothSupernova) * blend;
      smoothAscend += (tgtAscend - smoothAscend) * blend;
      smoothSlam += (tgtSlam - smoothSlam) * blend;

      // 1. Dynamic Phase 1 (Royal Amethyst + Antique Gold) -> Phase 2 (Molten Solar-Crimson + Magma Veins!)
      const p2Active = smoothP2 > 0.45;
      astralCrystalMat.color.setHex(p2Active ? 0xffb85c : 0xd8b4fe);
      astralCrystalMat.emissive.setHex(p2Active ? 0xdc2626 : 0x9333ea);
      astralCrystalMat.emissiveIntensity = 1.25 + smoothP2 * 0.72 + smoothSupernova * 0.55;

      // Phase 2 Cracked Molten-Gold Obsidian Veins literally ignite across the Archon's entire body!
      obsidianMat.emissive.setHex(p2Active ? 0xf97316 : 0xd97706);
      obsidianMat.emissiveIntensity =
        0.1 + smoothP2 * (1.28 + Math.sin(t * 5.2) * 0.25) + smoothSupernova * 0.85;

      visorMat.emissive.setHex(p2Active ? 0xff4d1c : 0xfbbf24);
      visorMat.emissiveIntensity = 2.25 + smoothP2 * 0.7 + smoothSupernova * 0.6;

      tetherEnergyMat.color.setHex(p2Active ? 0xf97316 : 0xc084fc);
      tetherEnergyMat.opacity = 0.52 + smoothP2 * 0.25 + (lasersOn ? 0.22 : 0);

      sanctuaryOuterMat.color.setHex(p2Active ? 0xf97316 : 0xc084fc);
      sanctuaryInnerMat.color.setHex(p2Active ? 0xef4444 : 0xf59e0b);

      // 2. Ground Sanctuary Astrolabe Sigil, Orbit Shards & 6 Cathedral Judgment Light Pillars (ALWAYS FLUSH TO FLOOR!)
      const floorOffset = -Math.max(0, input.airborneHeight);
      shadow.position.y = floorOffset + 0.025;
      sanctuaryGroup.position.y = floorOffset + 0.048;
      sanctuaryOuter.rotation.z = t * (0.28 + smoothP2 * 0.45 + smoothSupernova * 0.9);
      sanctuaryInner.rotation.z = -t * (0.52 + smoothP2 * 0.72 + smoothSupernova * 1.4);
      const sigBoost = Math.max(sanctuaryIntensity, smoothP2 * 0.5, smoothSupernova, smoothSlam);
      sanctuaryGroup.scale.setScalar(0.95 + sigBoost * 0.28 + Math.sin(t * 3.0) * 0.03);
      sanctuaryOuterMat.opacity = isStaggered ? 0.12 : 0.28 + sigBoost * 0.42;
      sanctuaryInnerMat.opacity = isStaggered ? 0.08 : 0.22 + sigBoost * 0.38;

      const pillarStrength = Math.max(
        smoothSupernova,
        smoothSlam * 0.85,
        stance === 'meteor_salvo' ? 0.65 : 0
      );
      lightPillarMat.color.setHex(p2Active ? 0xf97316 : 0xc084fc);
      lightPillarMat.opacity = isStaggered ? 0 : pillarStrength * 0.34;
      for (let i = 0; i < lightPillars.length; i++) {
        const pil = lightPillars[i];
        pil.visible = !isStaggered && pillarStrength > 0.08;
        if (pil.visible) {
          pil.rotation.y = t * (2.2 + i * 0.3);
          const pScale = 0.65 + pillarStrength * 0.65 + Math.sin(t * 8 + i) * 0.08;
          pil.scale.set(pScale, 0.55 + pillarStrength * 0.65, pScale);
        }
      }

      for (let i = 0; i < orbitShards.length; i++) {
        const sh = orbitShards[i];
        const ang =
          t * (0.75 + smoothP2 * 0.9 + smoothSupernova * 1.4) +
          (i / orbitShards.length) * Math.PI * 2;
        const rad = 2.05 + sigBoost * 0.65 + Math.sin(t * 2.1 + i) * 0.16;
        sh.position.set(
          Math.cos(ang) * rad,
          0.42 + sigBoost * 0.8 + Math.sin(t * 2.8 + i * 1.3) * 0.25,
          Math.sin(ang) * rad
        );
        sh.rotation.set(t * 1.1 + i, t * 1.8, i * 0.7);
        sh.visible = !isStaggered;
      }

      // 3. Sovereign Hovering Elevation, Regality & Stance Pitch (kept cleanly framed in Cathedral!)
      const baseHoverY = isStaggered
        ? 1.54
        : 2.1 + smoothAscend * 0.52 - smoothSlam * 0.44 + Math.sin(t * (isP2 ? 2.8 : 2.0)) * 0.12;
      sovereign.position.y = baseHoverY;

      const tgtPitch = isStaggered
        ? 0.34
        : smoothSlam * 0.22 - smoothAscend * 0.12 + smoothScythe * 0.14;
      sovereign.rotation.x += (tgtPitch - sovereign.rotation.x) * blend;
      sovereign.rotation.z = isStaggered
        ? Math.sin(t * 13.0) * 0.16
        : Math.sin(t * 1.1) * 0.03;
      sovereign.rotation.y = smoothScythe * scytheSwingAngle;

      // Levitation anchor gyro-crystal, equatorial rune-ring, stoles & tasset skirt breathing sway
      anchorCrystal.rotation.y = t * (2.6 + smoothP2 * 2.0);
      anchorRingOuter.rotation.z = -t * 3.2;
      anchorRingInner.rotation.y = t * 4.4;
      anchorRingInner.rotation.x = Math.sin(t * 2.1) * 0.55;

      equatorialRing.visible = !isStaggered;
      equatorialRing.position.y = -0.34;
      equatorialRing.rotation.y = t * (0.72 + smoothP2 * 0.85 + smoothSupernova * 1.45);
      equatorialRing.rotation.x = 0.22 + Math.sin(t * 1.1) * 0.08 + smoothSupernova * 0.14;
      equatorialRing.rotation.z = -0.14;
      equatorialRing.scale.setScalar(0.96 + smoothSupernova * 0.22);

      frontStolePivot.rotation.x = -0.04 - smoothAscend * 0.18 + Math.sin(t * 2.4) * 0.05;
      rearStolePivot.rotation.x = 0.06 + smoothAscend * 0.22 + Math.cos(t * 2.4) * 0.05;
      for (let i = 0; i < tassetPivots.length; i++) {
        const tp = tassetPivots[i];
        tp.pivot.rotation.x =
          (isStaggered ? 0.1 : -0.04) -
          smoothAscend * 0.18 -
          smoothSlam * 0.24 -
          Math.sin(t * 2.2 + i * 1.1) * 0.045;
      }

      // 4. Gated Chest Event-Horizon Singularity Core & 100% Zero-Clip Flush Vault-Shutters!
      const wantShutter =
        input.weakpointExposed || isStaggered || stance === 'resonance_vent'
          ? 1.0
          : Math.max(shutterOpenOverride, smoothSupernova * 0.9);
      smoothShutter += (wantShutter - smoothShutter) * Math.min(1, dt * 9.0);
      const slideX = THREE.MathUtils.lerp(0.0, 0.6, smoothShutter);
      const hingeY = THREE.MathUtils.lerp(0.0, 0.74, smoothShutter);
      shutterPivotL.position.x = -slideX;
      shutterPivotR.position.x = slideX;
      shutterPivotL.rotation.y = hingeY;
      shutterPivotR.rotation.y = -hingeY;

      // Retract core cleanly behind closed vault doors; surge dramatically outward when exposed!
      coreAssembly.position.z = THREE.MathUtils.lerp(0.05, -0.1, smoothShutter);
      const assemblyScale = THREE.MathUtils.lerp(0.62, 1.08, smoothShutter);
      coreAssembly.scale.setScalar(assemblyScale);
      coreAssembly.visible = smoothShutter > 0.03;

      if (input.weakpointBroken) {
        coreSphere.scale.setScalar(0.62 + Math.sin(t * 18) * 0.1);
        coreWireCage.scale.setScalar(0.76);
        coreAccretionDisc.scale.setScalar(0.55);
        coreGimbalOuter.rotation.set(0.4, t * 0.7, 0.5);
        coreGimbalInner.rotation.set(-0.4, -t * 0.9, 0.3);
        singularityCoreMat.emissiveIntensity = 0.42;
        singularityCageMat.emissiveIntensity = 0.18;
      } else {
        const spin = 2.2 + smoothP2 * 2.4 + smoothShutter * 2.8 + smoothSupernova * 3.2;
        coreGimbalOuter.rotation.z = t * spin;
        coreGimbalOuter.rotation.x = Math.sin(t * 2.2) * 0.35;
        coreGimbalInner.rotation.z = -t * spin * 1.4;
        coreGimbalInner.rotation.y = t * spin * 0.9;
        coreSphere.rotation.y = t * spin * 1.1;
        coreSphere.rotation.z = Math.sin(t * 1.6) * 0.25;
        coreAccretionDisc.rotation.z = -t * spin * 2.2;
        coreWireCage.rotation.y = -t * spin * 1.5;
        coreWireCage.rotation.x = t * spin * 0.8;
        const cScale = 0.96 + smoothSupernova * 0.14 + Math.sin(t * 8.5) * 0.05;
        coreSphere.scale.setScalar(cScale);
        coreAccretionDisc.scale.setScalar(cScale * 1.08);
        coreWireCage.scale.setScalar(cScale * 1.04);
        singularityCoreMat.emissiveIntensity =
          1.6 + smoothShutter * 0.65 + smoothP2 * 0.45 + smoothSupernova * 0.55;
        singularityCageMat.emissiveIntensity = 0.85 + smoothShutter * 0.45 + smoothP2 * 0.35;
      }

      // 5. Triple-Ring Cathedral Astrolabe Halo & Framed Phase 2 Supernova Eclipse Disc
      haloRoot.rotation.set(0, 0, 0);
      astrolabeOuter.rotation.z = t * (0.75 + smoothP2 * 0.95 + smoothSupernova * 1.6);
      astrolabeMid.rotation.z = -t * (1.25 + smoothP2 * 1.35 + smoothSupernova * 2.2);
      astrolabeMid.rotation.y = Math.sin(t * 1.4) * 0.24;
      astrolabeInner.rotation.z = t * (2.4 + smoothP2 * 2.2 + smoothSupernova * 3.0);
      astrolabeInner.rotation.x = Math.cos(t * 1.8) * 0.38;

      supernovaHalo.visible = smoothSupernova > 0.05;
      supernovaHalo.rotation.z = -t * 1.8;
      supernovaHalo.scale.setScalar(0.7 + smoothSupernova * 0.45 + Math.sin(t * 10) * 0.04);
      supernovaHaloMat.opacity = smoothSupernova * 0.58;

      // 6. 6 Monumental Compound Seraphic Pinion Wing-Blades
      const wingFlare =
        wingSpreadBoost +
        (isAttacking ? 0.3 * input.attackProgress : 0) +
        smoothP2 * 0.15 +
        smoothSupernova * 0.38 +
        smoothAscend * 0.28 -
        (isStaggered ? 0.28 : 0);
      for (let i = 0; i < wings.length; i++) {
        const w = wings[i];
        const wave = Math.sin(t * (isP2 ? 3.2 : 2.1) + w.tier * 0.75) * 0.05;
        w.pivot.rotation.z = -(w.baseAngle + w.side * wingFlare) + wave;
        w.pivot.rotation.y =
          -w.side * (0.15 + w.tier * 0.07 - smoothSupernova * 0.12 - smoothScythe * 0.2);
      }

      // 7. Twin Gothic Rail-Obelisk Pylons, Live Energy Tethers & Hard-Light War-Scythes
      const pitch = THREE.MathUtils.clamp(input.aimPitch + pylonPitchBoost, -0.78, 0.88);
      const pylonSpreadX = 1.82 + smoothSupernova * 0.5 + smoothScythe * 0.3;
      const pylonFwdZ = -0.38 - smoothScythe * 0.44 - (lasersOn ? 0.22 : 0);
      pylonL.pylon.position.set(
        -pylonSpreadX,
        0.54 + Math.sin(t * 2.6) * 0.09 + smoothAscend * 0.26,
        pylonFwdZ
      );
      pylonR.pylon.position.set(
        pylonSpreadX,
        0.54 + Math.cos(t * 2.6) * 0.09 + smoothAscend * 0.26,
        pylonFwdZ
      );

      pylonL.pylon.rotation.set(
        pitch - smoothScythe * 0.22,
        smoothScythe * 0.38,
        smoothScythe * 0.52
      );
      pylonR.pylon.rotation.set(
        pitch - smoothScythe * 0.22,
        -smoothScythe * 0.38,
        -smoothScythe * 0.52
      );
      pylonL.emitterCrystal.rotation.z = t * (4.5 + smoothP2 * 3.0);
      pylonR.emitterCrystal.rotation.z = -t * (4.5 + smoothP2 * 3.0);

      updateLocalTether(pylonL, -1, t, isStaggered);
      updateLocalTether(pylonR, 1, t, isStaggered);

      // Animate Floating Sovereign Forearm Vambraces & Gold Claw-Gauntlets telekinetically guiding the Pylons!
      const gDrop = isStaggered ? -0.35 : 0;
      gauntletL.position.set(
        -1.26 - smoothSupernova * 0.26 - smoothScythe * 0.18,
        0.46 + gDrop + Math.sin(t * 2.6 + 0.4) * 0.07 + smoothAscend * 0.18,
        -0.3 - smoothScythe * 0.32 - (lasersOn ? 0.14 : 0)
      );
      gauntletR.position.set(
        1.26 + smoothSupernova * 0.26 + smoothScythe * 0.18,
        0.46 + gDrop + Math.cos(t * 2.6 + 0.4) * 0.07 + smoothAscend * 0.18,
        -0.3 - smoothScythe * 0.32 - (lasersOn ? 0.14 : 0)
      );
      gauntletL.rotation.set(
        isStaggered ? -0.55 : pitch * 0.7 - smoothScythe * 0.25,
        0.24 + smoothScythe * 0.32 - smoothSupernova * 0.25,
        -0.18 + smoothScythe * 0.4
      );
      gauntletR.rotation.set(
        isStaggered ? -0.55 : pitch * 0.7 - smoothScythe * 0.25,
        -0.24 - smoothScythe * 0.32 + smoothSupernova * 0.25,
        0.18 - smoothScythe * 0.4
      );

      // Hard-Light Seraphic War-Scythes
      const showScythe = smoothScythe > 0.06;
      pylonL.scytheBlade.visible = showScythe;
      pylonR.scytheBlade.visible = showScythe;
      if (showScythe) {
        scytheBladeMat.opacity = Math.min(0.92, smoothScythe * 0.92);
        scytheBladeMat.color.setHex(p2Active ? 0xf97316 : 0xfbbf24);
        const sScale = 0.45 + smoothScythe * 0.65;
        pylonL.scytheBlade.scale.set(sScale, sScale, sScale);
        pylonR.scytheBlade.scale.set(sScale, sScale, sScale);
      }

      // Dual Volumetric Scissor Convergence Rail Beams
      tex.beamFluxMap.offset.y = -t * (laserFiring ? 6.5 : 2.8);
      updatePylonBeam(pylonL, laserLeftLen, laserLeftYaw, t, p2Active);
      updatePylonBeam(pylonR, laserRightLen, laserRightYaw, t, p2Active);

      // 8. 4 Autonomous Orbiting Astral Monolith Fin-Funnels
      const funnelCombatFormation =
        stance === 'astral_fan' ||
        stance === 'lance_barrage' ||
        stance === 'meteor_salvo' ||
        stance === 'supernova_cascade';
      for (let i = 0; i < funnels.length; i++) {
        const f = funnels[i];
        if (funnelCombatFormation) {
          const sideSign = i < 2 ? -1 : 1;
          const row = i % 2;
          const fx = sideSign * (2.35 + row * 0.56);
          const fy = 1.34 - row * 0.64 + Math.sin(t * 4.0 + i) * 0.08;
          const fz = -0.66 - (1 - row) * 0.24;
          f.group.position.set(fx, fy, fz);
          f.group.rotation.set(pitch, sideSign * -0.14, 0);
        } else {
          const ang = t * (0.95 + smoothP2 * 0.75) + (i / funnels.length) * Math.PI * 2;
          f.group.position.set(
            Math.cos(ang) * 2.15,
            0.18 + Math.sin(t * 2.2 + i * 1.4) * 0.26,
            Math.sin(ang) * 1.75 + 0.25
          );
          f.group.rotation.set(0.08, -ang + Math.PI * 0.5, 0);
        }
      }
    },
    dispose() {
      if (ownsTextures) tex.dispose();
      obsidianMat.dispose();
      titaniumMat.dispose();
      goldMat.dispose();
      mantleMat.dispose();
      gorgetVelvetMat.dispose();
      darkCoreMetalMat.dispose();
      astralCrystalMat.dispose();
      sovereignGoldGlowMat.dispose();
      singularityCoreMat.dispose();
      singularityHorizonMat.dispose();
      singularityCageMat.dispose();
      visorMat.dispose();
      tetherEnergyMat.dispose();
      scytheBladeMat.dispose();
      sanctuaryOuterMat.dispose();
      sanctuaryInnerMat.dispose();
      lightPillarMat.dispose();
      beamCoreMat.dispose();
      beamSheathMat.dispose();
      beamHelixMat.dispose();
      beamFlareMat.dispose();
      supernovaHaloMat.dispose();
      root.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).geometry.dispose();
        }
      });
    },
  };
}
