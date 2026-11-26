import * as THREE from 'three';
import {
  createCurvedPanelGeometry,
  createLoftedAnatomy,
} from '../../../core/sculptUtils';
import type { EnemyAnimationInput, EnemyHitZone, EnemyRigHandle } from '../../core/types';
import type { Floor06EnemyMaterials } from '../materials';
import {
  createClaymoreKnightTextures,
  type ClaymoreKnightTextureSuite,
} from './textures';

export type ClaymoreKnightPoseMode =
  | 'idle_march'
  | 'cleave_1'
  | 'cleave_2'
  | 'seismic_slam'
  | 'lunge_thrust'
  | 'crescent_wave'
  | 'vault_crash'
  | 'aegis_guard';

export interface MonolithClaymoreKnightRigHandle extends EnemyRigHandle {
  setPoseMode: (mode: ClaymoreKnightPoseMode) => void;
  setBladeCharge: (charge: number) => void;
  setAegisGuard: (active: boolean, intensity?: number) => void;
  setGroundTelegraph: (active: boolean, radius: number, progress: number) => void;
  setBladeTrailActive: (active: boolean) => void;
  getBladeTipWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  getBladeMidWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  getShieldCenterWorldPos: (out: THREE.Vector3) => THREE.Vector3;
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

/**
 * Custom beveled Executioner Monolith Claymore blade (total thickness 0.044m along Z, extends along -Z after rotation).
 */
function createClaymoreBladeGeo(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  // Blade extends along +Y from hilt guard (y=0) to razor tip (y=2.06)
  s.moveTo(-0.075, 0.0);
  s.lineTo(-0.105, 0.22);
  s.lineTo(-0.078, 0.34); // ricasso notch
  s.lineTo(-0.138, 0.56); // executioner flare
  s.lineTo(-0.155, 1.38);
  s.lineTo(-0.118, 1.62); // upper serration notch
  s.lineTo(-0.132, 1.72);
  s.lineTo(0.0, 2.08); // lethal beveled tip
  s.lineTo(0.132, 1.72);
  s.lineTo(0.118, 1.62);
  s.lineTo(0.155, 1.38);
  s.lineTo(0.138, 0.56);
  s.lineTo(0.078, 0.34);
  s.lineTo(0.105, 0.22);
  s.lineTo(0.075, 0.0);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.02,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.016,
    bevelSegments: 2,
    curveSegments: 4,
  });
  geo.translate(0, 0, -0.01);
  // Orient blade along -Z with flat width along X and edge thickness along Y
  geo.rotateX(-Math.PI * 0.5);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Luminous cyan astral fuller core cleanly protruding ±9mm beyond both flat faces of the Claymore (ZERO Z-fighting!).
 */
function createClaymoreFullerGeo(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.032, 0.12);
  s.lineTo(-0.048, 0.55);
  s.lineTo(-0.042, 1.48);
  s.lineTo(0.0, 1.88);
  s.lineTo(0.042, 1.48);
  s.lineTo(0.048, 0.55);
  s.lineTo(0.032, 0.12);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.046,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.006,
    bevelSegments: 1,
    curveSegments: 4,
  });
  geo.translate(0, 0, -0.023);
  geo.rotateX(-Math.PI * 0.5);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Swept winged gothic cathedral crossguard for the Monolith Claymore.
 */
function createCrossguardGeo(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.34, 0.14);
  s.lineTo(-0.24, -0.04);
  s.lineTo(-0.1, -0.09);
  s.lineTo(0.1, -0.09);
  s.lineTo(0.24, -0.04);
  s.lineTo(0.34, 0.14);
  s.lineTo(0.25, 0.06);
  s.lineTo(0.08, 0.04);
  s.lineTo(0.0, 0.12);
  s.lineTo(-0.08, 0.04);
  s.lineTo(-0.25, 0.06);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.072,
    bevelEnabled: true,
    bevelThickness: 0.016,
    bevelSize: 0.012,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.036);
  geo.rotateX(-Math.PI * 0.5);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Sharp sculpted gothic cathedral breast-crest cross protruding cleanly from the chest cuirass.
 */
function createChestCrestGeo(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, -0.3);
  s.lineTo(0.055, -0.06);
  s.lineTo(0.21, 0.04);
  s.lineTo(0.18, 0.11);
  s.lineTo(0.055, 0.09);
  s.lineTo(0.0, 0.29);
  s.lineTo(-0.055, 0.09);
  s.lineTo(-0.18, 0.11);
  s.lineTo(-0.21, 0.04);
  s.lineTo(-0.055, -0.06);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.036,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.018);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Sleek swept-back serrated monolith ridge crest hugging the top of each domed pauldron.
 */
function createPauldronFinGeo(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.14, 0.0);
  s.quadraticCurveTo(-0.04, 0.09, 0.12, 0.14);
  s.lineTo(0.28, 0.24);
  s.quadraticCurveTo(0.16, 0.06, 0.08, -0.02);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.028,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.translate(0, 0, -0.014);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Swept forged-iron helm horn / crown crest fin.
 */
function createHelmHornGeo(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.08, 0.12, 0.16, 0.32);
  s.lineTo(0.18, 0.44);
  s.quadraticCurveTo(0.06, 0.28, -0.01, 0.14);
  s.lineTo(-0.035, 0.01);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.028,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.translate(0, 0, -0.014);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Hexagonal forearm Paranatural Aegis Buckler frame mounted on the left gauntlet.
 */
function createAegisBucklerGeo(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, -0.34);
  s.lineTo(0.22, -0.16);
  s.lineTo(0.24, 0.16);
  s.lineTo(0, 0.34);
  s.lineTo(-0.22, 0.16);
  s.lineTo(-0.24, -0.16);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.042,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.012,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.021);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Pointed gothic knee-cop poleyn plate.
 */
function createKneeCopGeo(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, -0.14);
  s.lineTo(0.13, -0.02);
  s.lineTo(0.11, 0.11);
  s.lineTo(0, 0.16);
  s.lineTo(-0.11, 0.11);
  s.lineTo(-0.13, -0.02);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.042,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.021);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Curved obsidian spinal clamp prong gripping the Dorsal Obelisk Vertebra weakpoint.
 */
function createSpineClampGeo(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.032, 0);
  s.quadraticCurveTo(-0.042, 0.16, -0.016, 0.34);
  s.lineTo(0.0, 0.42);
  s.lineTo(0.026, 0.31);
  s.quadraticCurveTo(0.042, 0.14, 0.032, 0);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.026,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.007,
    bevelSegments: 1,
    curveSegments: 6,
  });
  geo.translate(0, 0, -0.013);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Dynamic 14-segment 3D Claymore Slash Ribbon Trail updated in-place with zero per-frame GC.
 */
const BLADE_TRAIL_SEGMENTS = 14;

interface BladeRibbonTrail {
  mesh: THREE.Mesh;
  geo: THREE.BufferGeometry;
  positions: Float32Array;
  baseHist: THREE.Vector3[];
  tipHist: THREE.Vector3[];
  initialized: boolean;
}

function createBladeRibbonTrail(mat: THREE.Material): BladeRibbonTrail {
  const vertCount = BLADE_TRAIL_SEGMENTS * 2;
  const positions = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const indices: number[] = [];

  for (let i = 0; i < BLADE_TRAIL_SEGMENTS; i++) {
    const v = i / (BLADE_TRAIL_SEGMENTS - 1);
    uvs[i * 4 + 0] = 0;
    uvs[i * 4 + 1] = v;
    uvs[i * 4 + 2] = 1;
    uvs[i * 4 + 3] = v;
    if (i < BLADE_TRAIL_SEGMENTS - 1) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;

  const baseHist: THREE.Vector3[] = [];
  const tipHist: THREE.Vector3[] = [];
  for (let i = 0; i < BLADE_TRAIL_SEGMENTS; i++) {
    baseHist.push(new THREE.Vector3());
    tipHist.push(new THREE.Vector3());
  }

  return { mesh, geo, positions, baseHist, tipHist, initialized: false };
}

// Module-scope scratch math helpers (zero GC inside updateAnimation!)
const _tmpBase = new THREE.Vector3();
const _tmpTip = new THREE.Vector3();
const _tmpInv = new THREE.Matrix4();

/**
 * AAA Sculpted Rig for Floor 06 Enemy #2: MONOLITH CLAYMORE KNIGHT
 * ("Obsidian Crusader · Heavy Paranatural Vanguard")
 * - Grounded articulated Crusader Plate Legs (lofted cuisses, beveled gothic poleyn knee-cops,
 *   flared monolithic greaves, and heavy clawed sabatons flush at y = 0)
 * - Heroic V-Tapered Obsidian Cuirass with protruding gilded cathedral cross breast-crest,
 *   glowing cyan sternum core, articulated hip tassets, front war-tabard, and tattered rear cloak
 * - Open-Front Sculpted Monolith Greathelm over an abyssal obsidian face void with blazing
 *   incandescent cyan gothic T-visor, swept forged brow horns, and jagged gilded crown crest
 * - Towering Asymmetrical Cathedral Pauldrons + Left Forearm Paranatural Aegis Buckler that
 *   expands into a live translucent glowing cyan Energy Shield Wall during Aegis Guard Advance
 * - Exposed Weakpoint: Faceted Electric-Cyan Dorsal Obelisk Vertebra Spire + Prismatic Cage +
 *   4 Articulated Spinal Clamp Prongs protruding above the back/collar
 * - Monumental 2.45m Custom-Sculpted Runic Executioner Claymore with proud glowing astral fuller
 *   (zero Z-fighting!) and a live zero-GC 14-segment 3D Blade Slash Energy Ribbon Trail
 */
export function buildMonolithClaymoreKnightRig(
  enemyId: string,
  mats: Floor06EnemyMaterials,
  sharedTextures?: ClaymoreKnightTextureSuite
): MonolithClaymoreKnightRigHandle {
  const tex = sharedTextures ?? createClaymoreKnightTextures();
  const ownsTextures = !sharedTextures;

  const root = new THREE.Group();
  const ownedGeos: THREE.BufferGeometry[] = [];
  const ownedMats: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    ownedGeos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    ownedMats.push(m);
    return m;
  };
  const reg = (m: THREE.Mesh): THREE.Mesh => {
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  // =========================================================================
  // DEDICATED HIGH-VALUE PBR MATERIALS (color: 0xffffff so 512x512 albedo shines!)
  // =========================================================================
  const obsidianArmorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.obsidianPlateAlbedo,
      bumpMap: tex.obsidianPlateBump,
      bumpScale: 0.032,
      roughnessMap: tex.obsidianPlateRoughness,
      roughness: 0.56,
      metalness: 0.44,
      emissive: 0x000000,
      emissiveIntensity: 0,
    })
  );

  const darkUnderframeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1a2030,
      roughness: 0.78,
      metalness: 0.35,
    })
  );

  const darkVisorVoidMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x060910,
      roughness: 0.92,
      metalness: 0.12,
    })
  );

  const relicGoldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.relicGoldAlbedo,
      bumpMap: tex.relicGoldBump,
      bumpScale: 0.024,
      roughness: 0.28,
      metalness: 0.82,
    })
  );

  const tabardClothMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.tabardAlbedo,
      bumpMap: tex.tabardBump,
      bumpScale: 0.022,
      roughness: 0.88,
      metalness: 0.06,
      side: THREE.DoubleSide,
    })
  );

  const bladeSteelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.bladeAlbedo,
      emissive: 0x0ea5e9,
      emissiveMap: tex.bladeEmissive,
      emissiveIntensity: 1.25,
      roughness: 0.24,
      metalness: 0.72,
    })
  );

  const bladeFullerGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 2.2,
      roughness: 0.14,
      metalness: 0.15,
    })
  );

  const visorCyanMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x38bdf8,
      emissiveIntensity: 3.4,
      roughness: 0.1,
      metalness: 0.05,
    })
  );

  const weakpointObeliskMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x0ea5e9,
      emissiveIntensity: 2.35,
      roughness: 0.14,
      metalness: 0.28,
      flatShading: true,
    })
  );

  const innerStarMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );

  const aegisShieldMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: tex.aegisHexMap,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  const aegisRimMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  const bladeTrailMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      map: tex.trailGradMap,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  // =========================================================================
  // GROUND CONTACT SHADOW & EXPANDABLE SEISMIC TELEGRAPH RING (disjoint Y!)
  // =========================================================================
  const shadow = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(2.35, 2.35)), mats.shadowDisc);
  shadow.rotation.x = -Math.PI * 0.5;
  shadow.position.y = 0.02;
  root.add(shadow);

  const groundTelegraphMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  const groundTelegraphRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.84, 1.0, 32)),
    groundTelegraphMat
  );
  groundTelegraphRing.rotation.x = -Math.PI * 0.5;
  groundTelegraphRing.position.set(0, 0.048, -0.9);
  groundTelegraphRing.visible = false;
  root.add(groundTelegraphRing);

  // =========================================================================
  // 1. SCULPTED PELVIS, ARTICULATED HIP TASSETS & GROUNDED CRUSADER LEGS
  // =========================================================================
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 1.08, 0);
  root.add(pelvis);

  const pelvisCoreGeo = trackGeo(
    createLoftedAnatomy(
      [
        { y: -0.16, rx: 0.24, rz: 0.19, squareness: 2.5 },
        { y: 0.0, rx: 0.34, rz: 0.25, pinchFront: 0.03, squareness: 2.6 },
        { y: 0.16, rx: 0.32, rz: 0.24, squareness: 2.5 },
      ],
      16
    )
  );
  pelvis.add(reg(new THREE.Mesh(pelvisCoreGeo, darkUnderframeMat)));

  // Gilded cathedral belt ring & front relic buckle
  const beltRing = reg(
    new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.34, 0.032, 6, 16)), relicGoldMat)
  );
  beltRing.rotation.x = Math.PI * 0.5;
  beltRing.scale.set(1.04, 0.78, 1);
  beltRing.position.y = 0.12;
  pelvis.add(beltRing);

  const beltBuckle = reg(
    new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.088, 0)), relicGoldMat)
  );
  beltBuckle.scale.set(1.15, 1.25, 0.45);
  beltBuckle.position.set(0, 0.11, -0.27);
  pelvis.add(beltBuckle);

  // Articulated Left & Right Armored Hip Fauld Tassets (curved overlapping plates!)
  const tassetGeoL = trackGeo(
    createCurvedPanelGeometry(
      [
        { y: -0.44, rx: 0.42, rz: 0.34, thickness: 0.036 },
        { y: -0.18, rx: 0.39, rz: 0.31, thickness: 0.038 },
        { y: 0.08, rx: 0.36, rz: 0.28, thickness: 0.034 },
      ],
      Math.PI * 0.72,
      Math.PI * 1.28,
      10
    )
  );
  const tassetGeoR = trackGeo(
    createCurvedPanelGeometry(
      [
        { y: -0.44, rx: 0.42, rz: 0.34, thickness: 0.036 },
        { y: -0.18, rx: 0.39, rz: 0.31, thickness: 0.038 },
        { y: 0.08, rx: 0.36, rz: 0.28, thickness: 0.034 },
      ],
      -Math.PI * 0.28,
      Math.PI * 0.28,
      10
    )
  );
  pelvis.add(
    reg(new THREE.Mesh(tassetGeoL, obsidianArmorMat)),
    reg(new THREE.Mesh(tassetGeoR, obsidianArmorMat))
  );

  // Flowing Pointed Front Crusader War-Tabard Banner
  const frontTabardPivot = new THREE.Group();
  frontTabardPivot.position.set(0, 0.08, -0.26);
  pelvis.add(frontTabardPivot);
  const frontTabardGeo = trackGeo(
    createCurvedPanelGeometry(
      [
        { y: -0.78, rx: 0.04, rz: 0.04, thickness: 0.012, creaseAmp: 0.006 },
        { y: -0.52, rx: 0.16, rz: 0.08, thickness: 0.013, creaseAmp: 0.014 },
        { y: -0.22, rx: 0.18, rz: 0.08, thickness: 0.014, creaseAmp: 0.01 },
        { y: 0.02, rx: 0.15, rz: 0.07, thickness: 0.014, creaseAmp: 0.004 },
      ],
      -Math.PI * 0.68,
      -Math.PI * 0.32,
      8
    )
  );
  frontTabardPivot.add(reg(new THREE.Mesh(frontTabardGeo, tabardClothMat)));

  // Shared sculpted leg geometries
  const thighGeo = trackGeo(
    createLoftedAnatomy(
      [
        { y: -0.46, rx: 0.135, rz: 0.145, squareness: 2.5 },
        { y: -0.24, rx: 0.165, rz: 0.175, pinchFront: 0.025, squareness: 2.6 },
        { y: 0.02, rx: 0.155, rz: 0.16, squareness: 2.4 },
      ],
      14
    )
  );
  const greaveGeo = trackGeo(
    createLoftedAnatomy(
      [
        { y: -0.44, rx: 0.175, rz: 0.195, pinchFront: 0.035, squareness: 2.7 },
        { y: -0.22, rx: 0.155, rz: 0.17, pinchFront: 0.03, squareness: 2.6 },
        { y: 0.02, rx: 0.14, rz: 0.155, squareness: 2.5 },
      ],
      14
    )
  );
  const kneeCopGeo = trackGeo(createKneeCopGeo());
  const sabatonGeo = trackGeo(
    createLoftedAnatomy(
      [
        { y: -0.54, rx: 0.17, rz: 0.25, offsetZ: -0.05, pinchFront: 0.04, squareness: 2.8 },
        { y: -0.44, rx: 0.155, rz: 0.21, offsetZ: -0.03, squareness: 2.6 },
        { y: -0.37, rx: 0.125, rz: 0.15, offsetZ: 0.0, squareness: 2.4 },
      ],
      14
    )
  );

  const buildLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.24, -0.06, 0);
    pelvis.add(hip);

    const thigh = reg(new THREE.Mesh(thighGeo, obsidianArmorMat));
    hip.add(thigh);

    // Gilded thigh trim band
    const thighBand = reg(
      new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.16, 0.016, 6, 12)), relicGoldMat)
    );
    thighBand.rotation.x = Math.PI * 0.5;
    thighBand.position.y = -0.38;
    hip.add(thighBand);

    const knee = new THREE.Group();
    knee.position.set(0, -0.48, 0);
    hip.add(knee);

    // Pointed gothic poleyn knee-cop protruding cleanly forward
    const poleyn = reg(new THREE.Mesh(kneeCopGeo, relicGoldMat));
    poleyn.position.set(0, 0.01, -0.175);
    knee.add(poleyn);

    const greave = reg(new THREE.Mesh(greaveGeo, obsidianArmorMat));
    knee.add(greave);

    const sabaton = reg(new THREE.Mesh(sabatonGeo, darkUnderframeMat));
    knee.add(sabaton);

    // Gilded sabaton toe ridge claw
    const toeClaw = reg(
      new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.062, 0)), relicGoldMat)
    );
    toeClaw.scale.set(1.2, 0.65, 1.85);
    toeClaw.position.set(0, -0.49, -0.29);
    knee.add(toeClaw);

    return { hip, knee };
  };
  const legL = buildLeg(-1);
  const legR = buildLeg(1);

  // =========================================================================
  // 2. HEROIC V-TAPERED OBSIDIAN CUIRASS, BREAST CREST & REAR TATTERED CLOAK
  // =========================================================================
  const torso = new THREE.Group();
  torso.position.set(0, 0.14, 0);
  pelvis.add(torso);

  const cuirassGeo = trackGeo(
    createLoftedAnatomy(
      [
        { y: 0.0, rx: 0.3, rz: 0.23, squareness: 2.5 },
        { y: 0.24, rx: 0.39, rz: 0.28, pinchFront: 0.05, squareness: 2.7 },
        { y: 0.52, rx: 0.49, rz: 0.33, pinchFront: 0.08, squareness: 2.8 },
        { y: 0.74, rx: 0.45, rz: 0.3, pinchFront: 0.05, squareness: 2.6 },
        { y: 0.86, rx: 0.26, rz: 0.21, squareness: 2.3 },
      ],
      18
    )
  );
  torso.add(reg(new THREE.Mesh(cuirassGeo, obsidianArmorMat)));

  // Sculpted obsidian-steel gothic gorget collar crowned with a slim burnished gold rim
  const gorgetGeo = trackGeo(
    createCurvedPanelGeometry(
      [
        { y: 0.76, rx: 0.31, rz: 0.28, thickness: 0.036 },
        { y: 0.89, rx: 0.27, rz: 0.25, thickness: 0.03 },
      ],
      -Math.PI * 0.86,
      -Math.PI * 0.14,
      12
    )
  );
  torso.add(reg(new THREE.Mesh(gorgetGeo, obsidianArmorMat)));

  const gorgetRim = reg(
    new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.255, 0.017, 6, 16)), relicGoldMat)
  );
  gorgetRim.rotation.x = Math.PI * 0.5;
  gorgetRim.scale.set(1.06, 0.92, 1);
  gorgetRim.position.set(0, 0.885, -0.01);
  torso.add(gorgetRim);

  // Protruding Gilded Cathedral Cross Breast-Crest + Glowing Cyan Sternum Slit
  const breastCrest = reg(new THREE.Mesh(trackGeo(createChestCrestGeo()), relicGoldMat));
  breastCrest.position.set(0, 0.48, -0.372);
  torso.add(breastCrest);

  const sternumCore = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.068, 0)),
    visorCyanMat
  );
  sternumCore.scale.set(0.62, 1.95, 0.45);
  sternumCore.position.set(0, 0.48, -0.405);
  torso.add(sternumCore);

  // Flowing Tattered Rear Crusader War-Cape (3 pointed cloth panels billowing behind the back!)
  const cloakPivot = new THREE.Group();
  cloakPivot.position.set(0, 0.68, 0.3);
  torso.add(cloakPivot);

  const cloakRibbonGeo = trackGeo(
    createCurvedPanelGeometry(
      [
        { y: -1.34, rx: 0.05, rz: 0.04, thickness: 0.012, creaseAmp: 0.01 },
        { y: -0.96, rx: 0.22, rz: 0.14, thickness: 0.014, creaseAmp: 0.026 },
        { y: -0.5, rx: 0.26, rz: 0.15, thickness: 0.014, creaseAmp: 0.02 },
        { y: 0.0, rx: 0.21, rz: 0.12, thickness: 0.014, creaseAmp: 0.008 },
      ],
      Math.PI * 0.32,
      Math.PI * 0.68,
      10
    )
  );
  const cloakC = reg(new THREE.Mesh(cloakRibbonGeo, tabardClothMat));
  cloakC.position.set(0, -0.06, 0.08);
  const cloakL = reg(new THREE.Mesh(cloakRibbonGeo, tabardClothMat));
  cloakL.position.set(-0.24, 0.0, 0.02);
  cloakL.rotation.y = -0.38;
  cloakL.scale.set(0.84, 0.92, 0.85);
  const cloakR = reg(new THREE.Mesh(cloakRibbonGeo, tabardClothMat));
  cloakR.position.set(0.24, 0.0, 0.02);
  cloakR.rotation.y = 0.38;
  cloakR.scale.set(0.84, 0.92, 0.85);
  cloakPivot.add(cloakC, cloakL, cloakR);

  // =========================================================================
  // 3. EXPOSED WEAKPOINT: FACETED CYAN DORSAL OBELISK VERTEBRA + 4 SPINAL CLAMPS
  // =========================================================================
  const dorsalGroup = new THREE.Group();
  dorsalGroup.position.set(0, 0.72, 0.36);
  torso.add(dorsalGroup);

  // Basalt reliquary dorsal housing collar
  const dorsalSocket = reg(
    new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.24, 0.24, 6)), darkUnderframeMat)
  );
  dorsalSocket.position.y = -0.22;
  dorsalGroup.add(dorsalSocket);

  // Sharp Faceted Electric-Cyan Obelisk Crystal Spire (WEAKPOINT!)
  const dorsalObelisk = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.235, 0)),
    weakpointObeliskMat
  );
  dorsalObelisk.scale.set(0.82, 1.92, 0.82);
  dorsalGroup.add(dorsalObelisk);

  // Outer prismatic cyan wireframe crystal cage
  const obeliskCageMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.38,
      wireframe: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const obeliskCage = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.285, 0)),
    obeliskCageMat
  );
  obeliskCage.scale.set(0.86, 1.96, 0.86);
  dorsalGroup.add(obeliskCage);

  // Blazing white inner energy star
  const obeliskStar = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.12, 0)),
    innerStarMat
  );
  obeliskStar.scale.set(0.68, 1.95, 0.68);
  dorsalGroup.add(obeliskStar);

  // 4 Articulated Curved Spinal Clamp Prongs encircling the Obelisk
  const clampGeo = trackGeo(createSpineClampGeo());
  const spinalClamps: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI * 0.25;
    const cPivot = new THREE.Group();
    cPivot.position.set(Math.cos(a) * 0.21, -0.14, Math.sin(a) * 0.21);
    cPivot.rotation.y = -a + Math.PI * 0.5;
    const prong = reg(new THREE.Mesh(clampGeo, i % 2 === 0 ? obsidianArmorMat : relicGoldMat));
    cPivot.add(prong);
    dorsalGroup.add(cPivot);
    spinalClamps.push(cPivot);
  }

  // =========================================================================
  // 4. OPEN-FRONT SCULPTED MONOLITH GREATHELM & BLAZING CYAN T-VISOR
  // =========================================================================
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.9, -0.02);
  torso.add(headGroup);

  // Open-front sculpted barbute/sallet outer obsidian helm shell
  const helmShellGeo = trackGeo(
    createCurvedPanelGeometry(
      [
        { y: -0.02, rx: 0.2, rz: 0.23, thickness: 0.038 },
        { y: 0.16, rx: 0.23, rz: 0.25, thickness: 0.042 },
        { y: 0.36, rx: 0.2, rz: 0.24, thickness: 0.038 },
        { y: 0.48, rx: 0.1, rz: 0.14, thickness: 0.03 },
      ],
      -Math.PI * 0.16,
      Math.PI * 1.16,
      16
    )
  );
  headGroup.add(reg(new THREE.Mesh(helmShellGeo, obsidianArmorMat)));

  // Angular overhanging gothic helmet brow visor peak
  const helmBrowGeo = trackGeo(
    createCurvedPanelGeometry(
      [
        { y: 0.24, rx: 0.21, rz: 0.24, thickness: 0.034 },
        { y: 0.38, rx: 0.17, rz: 0.28, thickness: 0.038 },
        { y: 0.48, rx: 0.08, rz: 0.17, thickness: 0.026 },
      ],
      -Math.PI * 0.84,
      -Math.PI * 0.16,
      10
    )
  );
  headGroup.add(reg(new THREE.Mesh(helmBrowGeo, obsidianArmorMat)));

  // Recessed Pitch-Black Abyssal Face Cavity cleanly visible inside the greathelm opening
  const faceMaskGeo = trackGeo(
    createLoftedAnatomy(
      [
        { y: 0.0, rx: 0.13, rz: 0.14, offsetZ: -0.03, squareness: 2.5 },
        { y: 0.18, rx: 0.16, rz: 0.17, offsetZ: -0.04, pinchFront: 0.02, squareness: 2.6 },
        { y: 0.34, rx: 0.14, rz: 0.15, offsetZ: -0.03, squareness: 2.4 },
      ],
      14
    )
  );
  headGroup.add(new THREE.Mesh(faceMaskGeo, darkVisorVoidMat));

  // Gilded Cheek Guard Plates framing the blazing cyan T-visor
  const helmCheekGeoL = trackGeo(
    createCurvedPanelGeometry(
      [
        { y: 0.0, rx: 0.18, rz: 0.21, thickness: 0.024 },
        { y: 0.15, rx: 0.2, rz: 0.23, thickness: 0.026 },
        { y: 0.26, rx: 0.19, rz: 0.22, thickness: 0.022 },
      ],
      -Math.PI * 0.9,
      -Math.PI * 0.68,
      8
    )
  );
  const helmCheekGeoR = trackGeo(
    createCurvedPanelGeometry(
      [
        { y: 0.0, rx: 0.18, rz: 0.21, thickness: 0.024 },
        { y: 0.15, rx: 0.2, rz: 0.23, thickness: 0.026 },
        { y: 0.26, rx: 0.19, rz: 0.22, thickness: 0.022 },
      ],
      -Math.PI * 0.32,
      -Math.PI * 0.1,
      8
    )
  );
  headGroup.add(
    reg(new THREE.Mesh(helmCheekGeoL, relicGoldMat)),
    reg(new THREE.Mesh(helmCheekGeoR, relicGoldMat))
  );

  // Blazing Electric-Cyan Gothic T-Visor (proud at z = -0.235 so it burns clearly!)
  const visorVert = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.034, 0)),
    visorCyanMat
  );
  visorVert.scale.set(0.55, 3.2, 0.48);
  visorVert.position.set(0, 0.15, -0.235);
  headGroup.add(visorVert);

  const visorHorizL = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.03, 0)),
    visorCyanMat
  );
  visorHorizL.scale.set(2.35, 0.48, 0.45);
  visorHorizL.position.set(-0.078, 0.21, -0.225);
  visorHorizL.rotation.set(0, 0.24, -0.22);

  const visorHorizR = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.03, 0)),
    visorCyanMat
  );
  visorHorizR.scale.set(2.35, 0.48, 0.45);
  visorHorizR.position.set(0.078, 0.21, -0.225);
  visorHorizR.rotation.set(0, -0.24, 0.22);
  headGroup.add(visorHorizL, visorHorizR);

  // Twin Swept Forged-Iron Helm Horns + Jagged Gilded Cathedral Crest Fin
  const hornGeo = trackGeo(createHelmHornGeo());
  const helmHornL = reg(new THREE.Mesh(hornGeo, obsidianArmorMat));
  helmHornL.position.set(-0.15, 0.32, -0.01);
  helmHornL.rotation.set(-0.26, 0.32, 0.46);
  helmHornL.scale.set(-0.92, 0.92, 0.92);

  const helmHornR = reg(new THREE.Mesh(hornGeo, obsidianArmorMat));
  helmHornR.position.set(0.15, 0.32, -0.01);
  helmHornR.rotation.set(-0.26, -0.32, -0.46);
  helmHornR.scale.set(0.92, 0.92, 0.92);

  const crownCrest = reg(new THREE.Mesh(hornGeo, relicGoldMat));
  crownCrest.position.set(0, 0.36, -0.02);
  crownCrest.rotation.set(-0.34, Math.PI * 0.5, 0);
  crownCrest.scale.set(0.95, 1.05, 0.9);
  headGroup.add(helmHornL, helmHornR, crownCrest);

  // =========================================================================
  // 5. DOWNWARD-DRAPING CATHEDRAL PAULDRONS (TORSO-TRACKED!), LEFT AEGIS GAUNTLET & SHIELD WALL
  // =========================================================================
  // Sculpted downward-draping gothic armor shoulder domes (closed at top, flaring down around bicep!)
  const pauldronShellGeoL = trackGeo(
    createCurvedPanelGeometry(
      [
        { y: -0.26, rx: 0.32, rz: 0.31, thickness: 0.044 },
        { y: -0.06, rx: 0.31, rz: 0.3, thickness: 0.052 },
        { y: 0.1, rx: 0.25, rz: 0.24, thickness: 0.048 },
        { y: 0.21, rx: 0.12, rz: 0.14, thickness: 0.034 },
      ],
      Math.PI * 0.56,
      Math.PI * 1.44,
      14
    )
  );
  const pauldronShellGeoR = trackGeo(
    createCurvedPanelGeometry(
      [
        { y: -0.26, rx: 0.32, rz: 0.31, thickness: 0.044 },
        { y: -0.06, rx: 0.31, rz: 0.3, thickness: 0.052 },
        { y: 0.1, rx: 0.25, rz: 0.24, thickness: 0.048 },
        { y: 0.21, rx: 0.12, rz: 0.14, thickness: 0.034 },
      ],
      -Math.PI * 0.44,
      Math.PI * 0.44,
      14
    )
  );
  const pauldronCapGeo = trackGeo(
    createLoftedAnatomy(
      [
        { y: -0.04, rx: 0.21, rz: 0.22, squareness: 2.5 },
        { y: 0.08, rx: 0.23, rz: 0.24, squareness: 2.6 },
        { y: 0.19, rx: 0.15, rz: 0.16, squareness: 2.4 },
        { y: 0.24, rx: 0.04, rz: 0.05, squareness: 2.0 },
      ],
      14
    )
  );
  const pauldronFinGeo = trackGeo(createPauldronFinGeo());

  const upperArmGeo = trackGeo(
    createLoftedAnatomy(
      [
        { y: -0.38, rx: 0.12, rz: 0.125, squareness: 2.4 },
        { y: -0.18, rx: 0.14, rz: 0.145, squareness: 2.5 },
        { y: 0.02, rx: 0.13, rz: 0.135, squareness: 2.4 },
      ],
      12
    )
  );
  const vambraceGeo = trackGeo(
    createLoftedAnatomy(
      [
        { y: -0.76, rx: 0.13, rz: 0.14, squareness: 2.7 },
        { y: -0.56, rx: 0.15, rz: 0.16, pinchFront: 0.02, squareness: 2.7 },
        { y: -0.34, rx: 0.125, rz: 0.13, squareness: 2.5 },
      ],
      12
    )
  );

  // Torso-mounted damped Cathedral Pauldron Pivots (NEVER invert upside-down when arms swing!)
  const pauldronPivotL = new THREE.Group();
  pauldronPivotL.position.set(-0.54, 0.72, 0);
  torso.add(pauldronPivotL);

  const pauldronL = reg(new THREE.Mesh(pauldronShellGeoL, obsidianArmorMat));
  pauldronL.position.set(-0.02, 0.0, 0);
  pauldronL.rotation.z = -0.12; // hugs inward at top, flares down & out over upper arm!
  pauldronPivotL.add(pauldronL);

  const capL = reg(new THREE.Mesh(pauldronCapGeo, obsidianArmorMat));
  capL.position.set(-0.05, 0.01, 0);
  capL.rotation.z = 0.24;
  pauldronPivotL.add(capL);

  const pauldronTrimL = reg(
    new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.28, 0.016, 6, 12, Math.PI * 0.9)), relicGoldMat)
  );
  pauldronTrimL.rotation.set(Math.PI * 0.5, 0, Math.PI * 0.55);
  pauldronTrimL.position.set(-0.05, -0.22, 0);
  pauldronPivotL.add(pauldronTrimL);

  const finL = reg(new THREE.Mesh(pauldronFinGeo, relicGoldMat));
  finL.position.set(-0.08, 0.21, 0.01);
  finL.rotation.set(0, Math.PI * 0.5, 0.12);
  finL.scale.set(1.05, 1.05, 1);
  pauldronPivotL.add(finL);

  const pauldronPivotR = new THREE.Group();
  pauldronPivotR.position.set(0.54, 0.72, 0);
  torso.add(pauldronPivotR);

  const pauldronR = reg(new THREE.Mesh(pauldronShellGeoR, obsidianArmorMat));
  pauldronR.position.set(0.02, 0.0, 0);
  pauldronR.rotation.z = 0.12;
  pauldronPivotR.add(pauldronR);

  const capR = reg(new THREE.Mesh(pauldronCapGeo, obsidianArmorMat));
  capR.position.set(0.05, 0.01, 0);
  capR.rotation.z = -0.24;
  pauldronPivotR.add(capR);

  const pauldronTrimR = reg(
    new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.28, 0.016, 6, 12, Math.PI * 0.9)), relicGoldMat)
  );
  pauldronTrimR.rotation.set(Math.PI * 0.5, 0, -Math.PI * 0.45);
  pauldronTrimR.position.set(0.05, -0.22, 0);
  pauldronPivotR.add(pauldronTrimR);

  const finR = reg(new THREE.Mesh(pauldronFinGeo, relicGoldMat));
  finR.position.set(0.08, 0.21, 0.01);
  finR.rotation.set(0, Math.PI * 0.5, -0.12);
  finR.scale.set(0.96, 0.96, 1);
  pauldronPivotR.add(finR);

  // LEFT ARM (Vanguard Forearm Paranatural Aegis Gauntlet + Deployable Energy Wall!)
  const armL = new THREE.Group();
  armL.position.set(-0.56, 0.66, 0);
  torso.add(armL);

  armL.add(reg(new THREE.Mesh(upperArmGeo, darkUnderframeMat)));
  armL.add(reg(new THREE.Mesh(vambraceGeo, obsidianArmorMat)));

  // Sculpted Hexagonal Paranatural Aegis Buckler mounted on outer left forearm (faces -X outward!)
  const aegisGroup = new THREE.Group();
  aegisGroup.position.set(-0.18, -0.54, -0.05);
  aegisGroup.rotation.y = -Math.PI * 0.5;
  armL.add(aegisGroup);

  const bucklerFrame = reg(new THREE.Mesh(trackGeo(createAegisBucklerGeo()), obsidianArmorMat));
  aegisGroup.add(bucklerFrame);

  const bucklerGoldRim = reg(
    new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.24, 0.022, 6, 6)), relicGoldMat)
  );
  bucklerGoldRim.position.z = 0.032;
  aegisGroup.add(bucklerGoldRim);

  const bucklerCore = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.085, 0)),
    visorCyanMat
  );
  bucklerCore.scale.set(0.95, 1.35, 0.4);
  bucklerCore.position.z = 0.042;
  aegisGroup.add(bucklerCore);

  // Expandable Translucent Hex-Grid Paranatural Aegis Shield Wall (mounted directly on torso front anchor when active!)
  const aegisWallGroup = new THREE.Group();
  aegisWallGroup.position.set(-0.16, 0.34, -0.92);
  aegisWallGroup.visible = false;
  torso.add(aegisWallGroup);

  const aegisWallMesh = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(0.94, 6)),
    aegisShieldMat
  );
  const aegisWallRim = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.86, 0.96, 6)),
    aegisRimMat
  );
  aegisWallRim.position.z = -0.015;
  const aegisWallInnerRim = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.46, 0.51, 6)),
    aegisRimMat
  );
  aegisWallInnerRim.position.z = -0.012;
  aegisWallGroup.add(aegisWallMesh, aegisWallRim, aegisWallInnerRim);

  // =========================================================================
  // 6. RIGHT ARM & MONUMENTAL 2.45m SCULPTED RUNIC OBSIDIAN CLAYMORE
  // =========================================================================
  const armR = new THREE.Group();
  armR.position.set(0.56, 0.66, 0);
  torso.add(armR);

  armR.add(reg(new THREE.Mesh(upperArmGeo, darkUnderframeMat)));
  armR.add(reg(new THREE.Mesh(vambraceGeo, obsidianArmorMat)));

  // Monumental Monolith Obsidian Claymore mounted to right gauntlet
  const swordPivot = new THREE.Group();
  swordPivot.position.set(0.03, -0.78, -0.14);
  armR.add(swordPivot);

  // Ribbed two-handed Lathe grip + faceted counterweight pommel
  const gripPts = [
    new THREE.Vector2(0.001, -0.18),
    new THREE.Vector2(0.068, -0.11),
    new THREE.Vector2(0.042, -0.05),
    new THREE.Vector2(0.038, 0.14),
    new THREE.Vector2(0.044, 0.28),
    new THREE.Vector2(0.052, 0.42),
    new THREE.Vector2(0.001, 0.44),
  ];
  const gripGeo = trackGeo(new THREE.LatheGeometry(gripPts, 8));
  gripGeo.rotateX(-Math.PI * 0.5);
  const hilt = reg(new THREE.Mesh(gripGeo, darkUnderframeMat));
  hilt.position.z = 0.2;
  swordPivot.add(hilt);

  const pommelGem = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.064, 0)),
    relicGoldMat
  );
  pommelGem.position.set(0, 0, 0.42);
  swordPivot.add(pommelGem);

  // Winged gothic cathedral crossguard + glowing astral core gem
  const crossguard = reg(new THREE.Mesh(trackGeo(createCrossguardGeo()), relicGoldMat));
  crossguard.position.set(0, 0, -0.24);
  swordPivot.add(crossguard);

  const guardGem = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.055, 0)),
    visorCyanMat
  );
  guardGem.scale.set(1.25, 0.72, 1.25);
  guardGem.position.set(0, 0, -0.28);
  swordPivot.add(guardGem);

  // Sculpted beveled executioner blade + proud glowing astral fuller (ZERO Z-fighting!)
  const bladeMesh = reg(new THREE.Mesh(trackGeo(createClaymoreBladeGeo()), bladeSteelMat));
  bladeMesh.position.set(0, 0, -0.28);
  swordPivot.add(bladeMesh);

  const fullerMesh = new THREE.Mesh(
    trackGeo(createClaymoreFullerGeo()),
    bladeFullerGlowMat
  );
  fullerMesh.position.set(0, 0, -0.28);
  swordPivot.add(fullerMesh);

  const bladeBaseAnchor = new THREE.Object3D();
  bladeBaseAnchor.position.set(0, 0, -0.62);
  swordPivot.add(bladeBaseAnchor);

  const bladeMidAnchor = new THREE.Object3D();
  bladeMidAnchor.position.set(0, 0, -1.45);
  swordPivot.add(bladeMidAnchor);

  const bladeTipAnchor = new THREE.Object3D();
  bladeTipAnchor.position.set(0, 0, -2.36);
  swordPivot.add(bladeTipAnchor);

  // Live Zero-GC 14-Segment 3D Blade Slash Energy Ribbon Trail
  const bladeTrail = createBladeRibbonTrail(bladeTrailMat);
  ownedGeos.push(bladeTrail.geo);
  root.add(bladeTrail.mesh);

  const updateBladeTrail = (visibleOpacity: number) => {
    bladeTrailMat.opacity = visibleOpacity;
    if (visibleOpacity <= 0.02) {
      bladeTrail.mesh.visible = false;
      bladeTrail.initialized = false;
      return;
    }
    bladeTrail.mesh.visible = true;
    root.updateMatrixWorld(true);
    _tmpInv.copy(root.matrixWorld).invert();
    bladeBaseAnchor.getWorldPosition(_tmpBase).applyMatrix4(_tmpInv);
    bladeTipAnchor.getWorldPosition(_tmpTip).applyMatrix4(_tmpInv);

    if (!bladeTrail.initialized) {
      for (let i = 0; i < BLADE_TRAIL_SEGMENTS; i++) {
        bladeTrail.baseHist[i].copy(_tmpBase);
        bladeTrail.tipHist[i].copy(_tmpTip);
      }
      bladeTrail.initialized = true;
    } else {
      for (let i = BLADE_TRAIL_SEGMENTS - 1; i > 0; i--) {
        bladeTrail.baseHist[i].copy(bladeTrail.baseHist[i - 1]);
        bladeTrail.tipHist[i].copy(bladeTrail.tipHist[i - 1]);
      }
      bladeTrail.baseHist[0].copy(_tmpBase);
      bladeTrail.tipHist[0].copy(_tmpTip);
    }

    const arr = bladeTrail.positions;
    for (let i = 0; i < BLADE_TRAIL_SEGMENTS; i++) {
      const b = bladeTrail.baseHist[i];
      const t = bladeTrail.tipHist[i];
      const off = i * 6;
      arr[off + 0] = b.x;
      arr[off + 1] = b.y;
      arr[off + 2] = b.z;
      arr[off + 3] = t.x;
      arr[off + 4] = t.y;
      arr[off + 5] = t.z;
    }
    (bladeTrail.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  };

  // =========================================================================
  // 7. PRECISION MULTI-ZONE HITBOXES (body, head, Dorsal Obelisk weakpoint, Aegis shield)
  // =========================================================================
  const hitboxes: THREE.Mesh[] = [];
  const bodyHit = makeHitbox(
    trackGeo(new THREE.CylinderGeometry(0.52, 0.44, 1.65, 8)),
    mats.hitboxInvisible,
    enemyId,
    'body',
    [0, 0.28, 0]
  );
  const headHit = makeHitbox(
    trackGeo(new THREE.BoxGeometry(0.46, 0.54, 0.48)),
    mats.hitboxInvisible,
    enemyId,
    'head',
    [0, 0.22, -0.02]
  );
  const wpHit = makeHitbox(
    trackGeo(new THREE.SphereGeometry(0.42, 10, 10)),
    mats.hitboxInvisible,
    enemyId,
    'weakpoint',
    [0, 0.04, 0]
  );
  const shieldHit = makeHitbox(
    trackGeo(new THREE.CylinderGeometry(0.86, 0.86, 0.14, 6)),
    mats.hitboxInvisible,
    enemyId,
    'shield',
    [0, 0, 0.1]
  );
  shieldHit.rotation.x = Math.PI * 0.5;

  torso.add(bodyHit);
  headGroup.add(headHit);
  dorsalGroup.add(wpHit);
  aegisWallGroup.add(shieldHit);
  hitboxes.push(bodyHit, headHit, wpHit, shieldHit);

  // Live animation state (zero GC!)
  let walkPhase = 0;
  let poseMode: ClaymoreKnightPoseMode = 'idle_march';
  let bladeCharge = 0;
  let aegisGuardActive = false;
  let aegisGuardIntensity = 0;
  let currentAegisScale = 0.01;
  let trailRequested = false;
  let trailFade = 0;
  let trailTick = 0;

  // Damped pose state for silky smooth transitions between combat stances
  const curTorsoRot = new THREE.Euler();
  const tgtTorsoRot = new THREE.Euler();
  const curArmLRot = new THREE.Euler();
  const tgtArmLRot = new THREE.Euler();
  const curArmRRot = new THREE.Euler();
  const tgtArmRRot = new THREE.Euler();
  const curSwordRot = new THREE.Euler();
  const tgtSwordRot = new THREE.Euler();

  return {
    root,
    hitboxes,
    weakpointMaterials: [weakpointObeliskMat],
    armorFlashMaterials: [obsidianArmorMat],

    getMuzzleWorldPos(out: THREE.Vector3) {
      return bladeTipAnchor.getWorldPosition(out);
    },

    getWeakpointWorldPos(out: THREE.Vector3) {
      return dorsalObelisk.getWorldPosition(out);
    },

    getBladeTipWorldPos(out: THREE.Vector3) {
      return bladeTipAnchor.getWorldPosition(out);
    },

    getBladeMidWorldPos(out: THREE.Vector3) {
      return bladeMidAnchor.getWorldPosition(out);
    },

    getShieldCenterWorldPos(out: THREE.Vector3) {
      return aegisWallGroup.getWorldPosition(out);
    },

    setPoseMode(mode: ClaymoreKnightPoseMode) {
      poseMode = mode;
    },

    setBladeCharge(charge: number) {
      bladeCharge = Math.max(0, Math.min(1.5, charge));
    },

    setAegisGuard(active: boolean, intensity = 1) {
      aegisGuardActive = active;
      aegisGuardIntensity = active ? Math.max(0.2, intensity) : 0;
    },

    setGroundTelegraph(active: boolean, radius: number, progress: number) {
      if (!active) {
        groundTelegraphRing.visible = false;
        groundTelegraphMat.opacity = 0;
        return;
      }
      groundTelegraphRing.visible = true;
      const sc = Math.max(0.4, radius * (0.35 + progress * 0.65));
      groundTelegraphRing.scale.set(sc, sc, 1);
      groundTelegraphMat.opacity = 0.25 + progress * 0.58;
    },

    setBladeTrailActive(active: boolean) {
      trailRequested = active;
    },

    updateAnimation(input: EnemyAnimationInput) {
      const {
        dt,
        elapsed,
        behavior,
        speedRatio,
        attackProgress,
        flinchTimer,
        flinchDirX,
        staggerTimer,
        deadProgress,
        weakpointExposed,
        weakpointBroken,
        airborneHeight,
      } = input;

      if (deadProgress > 0) {
        pelvis.position.y = Math.max(0.24, 1.08 - deadProgress * 0.86);
        pelvis.rotation.x = -deadProgress * 1.48;
        torso.rotation.x = deadProgress * 0.45;
        aegisWallGroup.visible = false;
        groundTelegraphRing.visible = false;
        updateBladeTrail(0);
        return;
      }

      const dampFast = 1 - Math.exp(-13.5 * dt);
      const dampMed = 1 - Math.exp(-8.5 * dt);
      const isStaggered = staggerTimer > 0;
      const isAttacking = behavior === 'windup' || behavior === 'attack';

      // Pelvis vertical elevation (parabolic Vault-Crash airborne leap + grounded stride bob!)
      const airLift = Math.max(0, airborneHeight || 0);
      walkPhase += dt * (2.5 + speedRatio * 5.2);
      const stride = airLift > 0.15 ? 0 : Math.min(1, speedRatio) * 0.56;

      if (isStaggered) {
        // Hunched forward stagger -> exposes Dorsal Obelisk Vertebra high for punish shots!
        pelvis.position.y += (0.88 - pelvis.position.y) * dampMed;
        pelvis.rotation.x += (0.14 - pelvis.rotation.x) * dampMed;
        tgtTorsoRot.set(0.56, Math.sin(elapsed * 14) * 0.16, Math.cos(elapsed * 11) * 0.08);
        tgtArmRRot.set(0.32, 0.15, -0.52);
        tgtArmLRot.set(0.42, -0.1, 0.42);
        tgtSwordRot.set(0.35, 0.2, 0.3);
        legL.hip.rotation.x = -0.32;
        legR.hip.rotation.x = 0.22;
        legL.knee.rotation.x = 0.52;
        legR.knee.rotation.x = 0.28;
      } else {
        const flinchKick = flinchTimer > 0 ? Math.sin(flinchTimer * 28) * 0.18 : 0;
        const bob =
          airLift > 0.15 ? 0 : Math.abs(Math.sin(walkPhase)) * 0.055 * Math.min(1, speedRatio);
        pelvis.position.y += (1.08 + airLift + bob - pelvis.position.y) * dampFast;
        pelvis.rotation.x += ((airLift > 0.2 ? 0.22 : 0) - pelvis.rotation.x) * dampMed;

        // Grounded legs or airborne vaulted tuck!
        if (airLift > 0.2) {
          legL.hip.rotation.x = -0.68;
          legR.hip.rotation.x = 0.36;
          legL.knee.rotation.x = 1.05;
          legR.knee.rotation.x = 0.62;
        } else {
          legL.hip.rotation.x = Math.sin(walkPhase) * stride;
          legR.hip.rotation.x = -Math.sin(walkPhase) * stride;
          legL.knee.rotation.x = Math.max(0, -Math.sin(walkPhase) * stride * 0.88);
          legR.knee.rotation.x = Math.max(0, Math.sin(walkPhase) * stride * 0.88);
        }

        // Dynamic combat pose choreography across all 6 attack modes!
        // NOTE: In Three.js right-hand rule around +X, +rx swings hanging arms (-Y) FORWARD (-Z)!
        if (poseMode === 'seismic_slam' || poseMode === 'vault_crash') {
          if (behavior === 'windup') {
            // Two-handed towering skyward hoist (exposing Dorsal Obelisk!)
            const w = Math.min(1, attackProgress * 1.15);
            tgtTorsoRot.set(-0.24 * w, 0, 0);
            tgtArmRRot.set(2.58 * w, 0.14 * w, 0.22);
            tgtArmLRot.set(2.25 * w, -0.22 * w, -0.28);
            tgtSwordRot.set(0.42 * w, 0, 0);
          } else if (behavior === 'attack') {
            // Earth-shattering downward executioner smash!
            const slam = Math.sin(Math.min(1, attackProgress * 1.45) * Math.PI * 0.5);
            tgtTorsoRot.set(-0.24 + slam * 0.78, 0, 0);
            tgtArmRRot.set(2.58 - slam * 2.18, 0, 0.12);
            tgtArmLRot.set(2.25 - slam * 1.85, -0.14, -0.22);
            tgtSwordRot.set(0.42 - slam * 0.88, 0, 0);
          } else {
            // Heavy hunched recovery wrenching blade from floor -> Dorsal Obelisk wide open!
            tgtTorsoRot.set(0.46, 0, 0);
            tgtArmRRot.set(0.42, -0.08, 0.16);
            tgtArmLRot.set(0.38, 0.06, -0.18);
            tgtSwordRot.set(-0.46, 0, 0);
          }
        } else if (poseMode === 'cleave_1') {
          if (behavior === 'windup') {
            const w = attackProgress;
            tgtTorsoRot.set(0.08, -0.82 * w, 0);
            tgtArmRRot.set(1.18 * w, -0.78 * w, 0.55);
            tgtArmLRot.set(0.65 * w, 0.25 * w, -0.22);
            tgtSwordRot.set(0.18, -0.45 * w, -0.68);
          } else {
            // Wide forward-extended horizontal executioner cleave (ZERO torso/leg clipping!)
            const sw = Math.min(1, attackProgress * 1.38);
            tgtTorsoRot.set(0.12, -0.82 + sw * 1.72, 0);
            tgtArmRRot.set(1.22, -0.78 + sw * 1.68, 0.36 - sw * 0.18);
            tgtArmLRot.set(0.52, -0.35, -0.28);
            tgtSwordRot.set(0.14, -0.35 + sw * 0.78, -0.62);
          }
        } else if (poseMode === 'cleave_2') {
          // Rising reverse diagonal uppercut follow-up!
          if (behavior === 'windup') {
            const w = attackProgress;
            tgtTorsoRot.set(0.22, 0.78 * w, 0);
            tgtArmRRot.set(0.68 * w, 0.68 * w, 0.18);
            tgtArmLRot.set(0.45, -0.28, -0.32);
            tgtSwordRot.set(-0.28, 0.35, 0.52);
          } else {
            const sw = Math.min(1, attackProgress * 1.45);
            tgtTorsoRot.set(0.22 - sw * 0.38, 0.78 - sw * 1.65, 0);
            tgtArmRRot.set(0.68 + sw * 1.55, 0.68 - sw * 1.48, 0.34);
            tgtArmLRot.set(0.62, 0.22, -0.34);
            tgtSwordRot.set(-0.28 + sw * 0.68, 0.35 - sw * 0.75, 0.44);
          }
        } else if (poseMode === 'lunge_thrust') {
          if (behavior === 'windup') {
            const w = attackProgress;
            tgtTorsoRot.set(0.22 * w, -0.52 * w, 0);
            tgtArmRRot.set(0.32 * w, -0.32 * w, 0.18);
            tgtArmLRot.set(0.75 * w, 0.35 * w, -0.18);
            tgtSwordRot.set(-0.08, 0.0, 0.02);
          } else {
            // Rocket-forward greatsword spear thrust!
            const thrust = Math.min(1, attackProgress * 1.6);
            tgtTorsoRot.set(0.26, -0.52 + thrust * 0.82, 0);
            tgtArmRRot.set(1.42 * thrust, 0.12 * thrust, 0.08);
            tgtArmLRot.set(0.35, -0.32, -0.36);
            tgtSwordRot.set(-0.32 * thrust, 0, 0);
          }
        } else if (poseMode === 'crescent_wave') {
          if (behavior === 'windup') {
            const w = attackProgress;
            tgtTorsoRot.set(0.06, -0.96 * w, 0);
            tgtArmRRot.set(1.32 * w, -0.88 * w, 0.62);
            tgtArmLRot.set(0.68 * w, 0.32 * w, -0.22);
            tgtSwordRot.set(0.15, -0.32 * w, -1.12 * w);
          } else {
            const sw = Math.min(1, attackProgress * 1.45);
            tgtTorsoRot.set(0.1, -0.96 + sw * 1.98, 0);
            tgtArmRRot.set(1.32, -0.88 + sw * 1.88, 0.48);
            tgtArmLRot.set(0.55, -0.35, -0.28);
            tgtSwordRot.set(0.15, -0.32 + sw * 0.65, -1.12);
          }
        } else if (poseMode === 'aegis_guard') {
          // Left forearm braced squarely forward projecting the hexagonal Aegis Shield Wall while Claymore cocks high-right!
          tgtTorsoRot.set(0.08, 0.24, 0);
          tgtArmLRot.set(1.26, -0.18, 0.48);
          tgtArmRRot.set(0.78, -0.36, 0.32);
          tgtSwordRot.set(0.56, -0.25, -0.28);
        } else {
          // Dominant Heroic Crusader Guard / Heavy March Stance (Claymore angled high & proud, Aegis Buckler forward!)
          tgtTorsoRot.set(
            0.05 + flinchKick * 0.35,
            0.14 + Math.sin(elapsed * 1.5) * 0.04,
            flinchKick * (flinchDirX || 1) * 0.4
          );
          tgtArmRRot.set(0.62 - Math.sin(walkPhase) * 0.14, -0.18, 0.24);
          tgtArmLRot.set(0.48 + Math.sin(walkPhase) * 0.18, 0.12, -0.18);
          tgtSwordRot.set(0.48, -0.18, -0.18);
        }
      }

      // Smooth exponential interpolation of torso, arms & greatsword
      curTorsoRot.x += (tgtTorsoRot.x - curTorsoRot.x) * dampFast;
      curTorsoRot.y += (tgtTorsoRot.y - curTorsoRot.y) * dampFast;
      curTorsoRot.z += (tgtTorsoRot.z - curTorsoRot.z) * dampFast;
      torso.rotation.copy(curTorsoRot);

      curArmLRot.x += (tgtArmLRot.x - curArmLRot.x) * dampFast;
      curArmLRot.y += (tgtArmLRot.y - curArmLRot.y) * dampFast;
      curArmLRot.z += (tgtArmLRot.z - curArmLRot.z) * dampFast;
      armL.rotation.copy(curArmLRot);

      curArmRRot.x += (tgtArmRRot.x - curArmRRot.x) * dampFast;
      curArmRRot.y += (tgtArmRRot.y - curArmRRot.y) * dampFast;
      curArmRRot.z += (tgtArmRRot.z - curArmRRot.z) * dampFast;
      armR.rotation.copy(curArmRRot);

      // Torso-mounted pauldrons softly track 20% of arm pitch so they stay grounded & majestic!
      pauldronPivotL.rotation.x = Math.max(-0.22, Math.min(0.42, curArmLRot.x * 0.22));
      pauldronPivotR.rotation.x = Math.max(-0.22, Math.min(0.42, curArmRRot.x * 0.22));

      curSwordRot.x += (tgtSwordRot.x - curSwordRot.x) * dampFast;
      curSwordRot.y += (tgtSwordRot.y - curSwordRot.y) * dampFast;
      curSwordRot.z += (tgtSwordRot.z - curSwordRot.z) * dampFast;
      swordPivot.rotation.copy(curSwordRot);

      // Head tracks sternly & tilts down on stagger
      headGroup.rotation.x = isStaggered ? 0.38 : isAttacking ? -0.1 : 0.02;
      headGroup.rotation.y = isStaggered
        ? Math.sin(elapsed * 16) * 0.2
        : -curTorsoRot.y * 0.45;

      // Flowing rear cloak & front tabard respond dynamically to movement & vault velocity!
      cloakPivot.rotation.x =
        0.14 + Math.min(0.65, speedRatio * 0.32 + airLift * 0.24) + Math.sin(elapsed * 3.8) * 0.06;
      frontTabardPivot.rotation.x = -0.06 - Math.min(0.45, speedRatio * 0.24);

      // Blazing T-Visor & Claymore Runic Fuller Surge during combat windups/charges
      visorCyanMat.emissiveIntensity = isStaggered
        ? 0.45
        : isAttacking || aegisGuardActive
          ? 3.8 + bladeCharge * 2.2
          : 2.8 + Math.sin(elapsed * 4.0) * 0.35;

      bladeFullerGlowMat.emissiveIntensity =
        1.65 + bladeCharge * 4.2 + (isAttacking ? 1.2 : 0);
      bladeSteelMat.emissiveIntensity = 0.85 + bladeCharge * 2.8;

      // Expandable Forward-Facing Hex-Grid Paranatural Aegis Shield Wall
      const tgtShieldScale = aegisGuardActive && !isStaggered ? 1.0 : 0.01;
      currentAegisScale += (tgtShieldScale - currentAegisScale) * dampFast;
      if (currentAegisScale > 0.05) {
        aegisWallGroup.visible = true;
        aegisWallGroup.scale.setScalar(currentAegisScale);
        aegisWallGroup.rotation.z = elapsed * 0.65;
        aegisShieldMat.opacity = (0.68 + Math.sin(elapsed * 10) * 0.08) * currentAegisScale * aegisGuardIntensity;
        aegisRimMat.opacity = 0.92 * currentAegisScale * aegisGuardIntensity;
      } else {
        aegisWallGroup.visible = false;
      }

      // Exposed Dorsal Obelisk Vertebra Weakpoint + 4 Articulated Spinal Clamps
      const obSpin = isStaggered ? 0.6 : isAttacking ? 6.2 : 2.1;
      dorsalObelisk.rotation.y += dt * obSpin;
      const obPulse = weakpointBroken
        ? 0.78
        : 1.0 + Math.sin(elapsed * (weakpointExposed ? 14 : 4.5)) * 0.08 + bladeCharge * 0.14;
      dorsalObelisk.scale.set(0.82 * obPulse, 1.92 * obPulse, 0.82 * obPulse);

      obeliskCage.visible = !weakpointBroken;
      obeliskCage.rotation.y -= dt * (obSpin * 0.7);
      obeliskStar.visible = !weakpointBroken;
      obeliskStar.rotation.y = -elapsed * 4.8;

      const clampOpen = isStaggered || weakpointBroken ? 0.92 : isAttacking ? 0.56 : 0.18 + Math.sin(elapsed * 2.4) * 0.05;
      for (let i = 0; i < spinalClamps.length; i++) {
        spinalClamps[i].rotation.x = clampOpen;
      }

      // Live 14-Segment 3D Claymore Slash Energy Ribbon Trail
      const tgtTrail = trailRequested && !isStaggered ? 0.78 : 0;
      trailFade += (tgtTrail - trailFade) * (tgtTrail > trailFade ? dampFast : dampMed);
      trailTick += dt;
      if (trailTick >= 0.018 || trailRequested) {
        trailTick = 0;
        updateBladeTrail(trailFade);
      }
    },

    dispose() {
      for (const g of ownedGeos) g.dispose();
      for (const m of ownedMats) m.dispose();
      if (ownsTextures) tex.dispose();
    },
  };
}
