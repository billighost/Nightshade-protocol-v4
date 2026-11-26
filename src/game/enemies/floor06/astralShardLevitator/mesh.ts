import * as THREE from 'three';
import {
  createCurvedPanelGeometry,
  createLoftedAnatomy,
} from '../../../core/sculptUtils';
import type { EnemyAnimationInput, EnemyHitZone, EnemyRigHandle } from '../../core/types';
import type { Floor06EnemyMaterials } from '../materials';
import {
  createAstralLevitatorTextures,
  type AstralLevitatorTextureSuite,
} from './textures';

export type LevitatorFormationMode =
  | 'seraphic_idle'
  | 'volley_fan'
  | 'lance_barrel'
  | 'scythe_slash'
  | 'chalice_mortar'
  | 'nova_repel';

export interface AstralLevitatorRigHandle extends EnemyRigHandle {
  setTelegraphBeam: (active: boolean, length: number, chargeRatio: number) => void;
  setFormationMode: (mode: LevitatorFormationMode) => void;
  setChaliceOrbCharge: (charge: number) => void;
  setNovaSphereCharge: (charge: number) => void;
  setGroundDrop: (dropMeters: number) => void;
  triggerShardRecoil: (shardIndex: number) => void;
  getShardTipWorldPos: (shardIndex: number, out: THREE.Vector3) => THREE.Vector3;
  getChaliceOrbWorldPos: (out: THREE.Vector3) => THREE.Vector3;
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
 * Builds a custom beveled scimitar obsidian/amethyst wing-shard blade using ExtrudeGeometry
 * (zero boxy primitives — razor swept tip, fuller groove, and chamfered bevel faces!).
 */
function createScimitarShardBladeGeo(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, -0.44);
  s.lineTo(0.06, -0.3);
  s.quadraticCurveTo(0.125, -0.06, 0.145, 0.24);
  s.quadraticCurveTo(0.12, 0.62, 0.015, 0.96);
  s.lineTo(0.0, 1.06);
  s.quadraticCurveTo(-0.085, 0.58, -0.095, 0.14);
  s.lineTo(-0.05, -0.12);
  s.quadraticCurveTo(-0.085, -0.26, 0, -0.44);

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.024,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.016,
    bevelSegments: 2,
    curveSegments: 10,
  });
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds an inner glowing amethyst energy fuller cleanly protruding ±1.1cm beyond both blade faces (zero Z-fighting!).
 */
function createScimitarFullerGeo(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, -0.28);
  s.quadraticCurveTo(0.052, 0.08, 0.044, 0.48);
  s.lineTo(0.0, 0.88);
  s.quadraticCurveTo(-0.042, 0.44, -0.036, 0.06);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.058,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.006,
    bevelSegments: 1,
    curveSegments: 8,
  });
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a swept serrated obsidian crown horn for the Mitre Cowl Mask.
 */
function createCrownHornGeo(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.08, 0.14, 0.14, 0.34);
  s.lineTo(0.17, 0.52);
  s.quadraticCurveTo(0.06, 0.34, 0.0, 0.18);
  s.lineTo(-0.035, 0.02);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.032,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.01,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.translate(0, 0, -0.016);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a curved obsidian rib-claw iris talon framing the Astral Resonance Heart.
 */
function createIrisTalonGeo(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.038, 0);
  s.quadraticCurveTo(-0.048, 0.14, -0.018, 0.3);
  s.lineTo(0.0, 0.38);
  s.lineTo(0.03, 0.27);
  s.quadraticCurveTo(0.048, 0.12, 0.035, 0);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.024,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.007,
    bevelSegments: 1,
    curveSegments: 6,
  });
  geo.translate(0, 0, -0.012);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a dynamic 12-segment trailing ribbon BufferGeometry updated in-place with zero per-frame GC.
 */
interface WingRibbonTrail {
  mesh: THREE.Mesh;
  geo: THREE.BufferGeometry;
  positions: Float32Array;
  history: THREE.Vector3[];
  initialized: boolean;
}

const TRAIL_SEGMENTS = 12;

function createWingRibbonTrail(mat: THREE.Material): WingRibbonTrail {
  const vertCount = TRAIL_SEGMENTS * 2;
  const positions = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const indices: number[] = [];

  for (let i = 0; i < TRAIL_SEGMENTS; i++) {
    const v = i / (TRAIL_SEGMENTS - 1);
    uvs[i * 4 + 0] = 0;
    uvs[i * 4 + 1] = v;
    uvs[i * 4 + 2] = 1;
    uvs[i * 4 + 3] = v;
    if (i < TRAIL_SEGMENTS - 1) {
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

  const history: THREE.Vector3[] = [];
  for (let i = 0; i < TRAIL_SEGMENTS; i++) {
    history.push(new THREE.Vector3());
  }

  return { mesh, geo, positions, history, initialized: false };
}

// Module-scope scratch helpers (zero GC inside updateAnimation!)
const _trailTip = new THREE.Vector3();
const _trailLocal = new THREE.Vector3();
const _trailInvMat = new THREE.Matrix4();

/**
 * AAA Sculpted Rig for Floor 06 Enemy #1: ASTRAL SHARD LEVITATOR
 * ("Seraphim-Class Paranatural Sentinel")
 * - Faceless Sculpted Mitre Cowl & Serrated Horned Mask with glowing Triple-Slit Ocular Visor
 * - Curved 5-Pair Thoracic Basalt Ribcage & Reliquary Spine cradling the open Astral Heart
 * - Tapered Fluted Stalactite Tail-Spire + 3 Orbiting Fractured Obsidian Counterweights
 * - Draped Pleated Liturgical Void-Silk Shroud Ribbons reacting dynamically to velocity
 * - Central Exposed Weakpoint: Faceted Amethyst Singularity Heart + 3 Gilded Astrolabe Gimbal Rings + 4 Iris Talons
 * - 6 Articulated Sculpted Scimitar Wing-Shards morphing smoothly across 6 combat formations with per-blade recoil & flash
 * - Multi-Layer Wall-Clipped Focusing Laser Beam + 3 Sliding Focus Rings + Impact Flare
 * - Overhead Chalice Singularity Charge Orb + Close-Range Supernova Charge Sphere + Live Twin Wingtip Wake Trails
 */
export function buildAstralShardLevitatorRig(
  enemyId: string,
  mats: Floor06EnemyMaterials,
  sharedTextures?: AstralLevitatorTextureSuite
): AstralLevitatorRigHandle {
  const tex = sharedTextures ?? createAstralLevitatorTextures();
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
  // DEDICATED HIGH-VALUE PBR MATERIALS (color: 0xffffff so 512x512 albedo pops!)
  // =========================================================================
  const basaltArmorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.basaltAlbedo,
      bumpMap: tex.basaltBump,
      bumpScale: 0.032,
      roughnessMap: tex.basaltRoughness,
      roughness: 0.68,
      metalness: 0.28,
      emissive: 0x000000,
      emissiveIntensity: 0,
    })
  );

  const darkCavityMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0c0e18,
      roughness: 0.9,
      metalness: 0.15,
    })
  );

  const relicBrassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.brassAlbedo,
      bumpMap: tex.brassBump,
      bumpScale: 0.022,
      roughness: 0.3,
      metalness: 0.78,
    })
  );

  const shroudClothMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.shroudAlbedo,
      bumpMap: tex.shroudBump,
      bumpScale: 0.02,
      roughness: 0.86,
      metalness: 0.08,
      side: THREE.DoubleSide,
    })
  );

  const weakpointCoreMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.crystalCoreAlbedo,
      emissive: 0xc084fc,
      emissiveMap: tex.crystalCoreEmissive,
      emissiveIntensity: 2.05,
      roughness: 0.12,
      metalness: 0.32,
      flatShading: true,
    })
  );

  const visorGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xe879f9,
      emissiveIntensity: 3.4,
      roughness: 0.1,
      metalness: 0.05,
    })
  );

  const veinGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd8b4fe,
      emissive: 0x9333ea,
      emissiveIntensity: 2.1,
      roughness: 0.2,
      metalness: 0.15,
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

  const trailMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      map: tex.trailGradMap,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  // =========================================================================
  // GROUND-PROJECTED SOFT SHADOW & FAINT ASTRAL RUNE RING (reads 3D altitude!)
  // =========================================================================
  const groundAnchor = new THREE.Group();
  groundAnchor.position.y = -2.8;
  root.add(groundAnchor);

  const shadowDisc = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(2.5, 2.5)), mats.shadowDisc);
  shadowDisc.rotation.x = -Math.PI * 0.5;
  shadowDisc.position.y = 0.03;
  groundAnchor.add(shadowDisc);

  const groundRuneMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  const groundRuneRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.68, 0.78, 6)),
    groundRuneMat
  );
  groundRuneRing.rotation.x = -Math.PI * 0.5;
  groundRuneRing.position.y = 0.05;
  groundAnchor.add(groundRuneRing);

  // =========================================================================
  // MAIN HOVERING CHASSIS PIVOT (never mutate root.position/rotation!)
  // =========================================================================
  const chassis = new THREE.Group();
  chassis.position.set(0, 1.15, 0);
  root.add(chassis);

  // =========================================================================
  // 1. SCULPTED SKELETAL RELIQUARY SPINE & CURVED THORACIC RIBCAGE
  // =========================================================================
  const spineGeo = trackGeo(
    createLoftedAnatomy(
      [
        { y: -0.52, rx: 0.12, rz: 0.12, offsetZ: 0.14, squareness: 2.5 },
        { y: -0.26, rx: 0.18, rz: 0.15, offsetZ: 0.24, squareness: 2.6 },
        { y: 0.04, rx: 0.22, rz: 0.16, offsetZ: 0.28, squareness: 2.7 },
        { y: 0.34, rx: 0.32, rz: 0.18, offsetZ: 0.2, squareness: 2.6 },
        { y: 0.54, rx: 0.24, rz: 0.17, offsetZ: 0.1, squareness: 2.4 },
      ],
      16
    )
  );
  const spineMesh = reg(new THREE.Mesh(spineGeo, basaltArmorMat));
  chassis.add(spineMesh);

  // Dorsal relic-brass spinal vertebrae ridge studs
  const vertGeo = trackGeo(new THREE.OctahedronGeometry(0.065, 0));
  for (let i = 0; i < 5; i++) {
    const v = reg(new THREE.Mesh(vertGeo, relicBrassMat));
    v.scale.set(0.75, 1.35, 1.1);
    v.position.set(0, -0.34 + i * 0.19, 0.36 + Math.sin(i * 0.65) * 0.06);
    chassis.add(v);
  }

  // Sculpted Upper Shoulder Mantle & Swept Pauldrons (createCurvedPanelGeometry!)
  const shoulderGeoL = trackGeo(
    createCurvedPanelGeometry(
      [
        { y: 0.22, rx: 0.48, rz: 0.36, thickness: 0.065 },
        { y: 0.38, rx: 0.58, rz: 0.42, thickness: 0.085 },
        { y: 0.54, rx: 0.36, rz: 0.28, thickness: 0.06 },
      ],
      Math.PI * 0.68,
      Math.PI * 1.24,
      12
    )
  );
  const shoulderGeoR = trackGeo(
    createCurvedPanelGeometry(
      [
        { y: 0.22, rx: 0.48, rz: 0.36, thickness: 0.065 },
        { y: 0.38, rx: 0.58, rz: 0.42, thickness: 0.085 },
        { y: 0.54, rx: 0.36, rz: 0.28, thickness: 0.06 },
      ],
      -Math.PI * 0.24,
      Math.PI * 0.32,
      12
    )
  );
  const shoulderL = reg(new THREE.Mesh(shoulderGeoL, basaltArmorMat));
  const shoulderR = reg(new THREE.Mesh(shoulderGeoR, basaltArmorMat));
  chassis.add(shoulderL, shoulderR);

  // Gilded shoulder collar rim arc (cleanly above gimbal rings)
  const collarArcGeo = trackGeo(new THREE.TorusGeometry(0.4, 0.022, 8, 20, Math.PI * 1.28));
  const collarArc = reg(new THREE.Mesh(collarArcGeo, relicBrassMat));
  collarArc.position.set(0, 0.49, 0.08);
  collarArc.rotation.set(Math.PI * 0.44, 0, Math.PI * 0.86);
  chassis.add(collarArc);

  // 5 Pairs of Curved Thoracic Basalt Ribs arching forward to cradle the open Astral Heart!
  for (let r = 0; r < 5; r++) {
    const t = r / 4;
    const yBase = 0.28 - t * 0.62;
    const spreadX = 0.44 - Math.abs(t - 0.35) * 0.24;
    const reachZ = -0.34 + Math.abs(t - 0.35) * 0.16;
    const radius = 0.034 - t * 0.004;

    for (const side of [-1, 1] as const) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.14, yBase + 0.04, 0.28),
        new THREE.Vector3(side * spreadX, yBase + 0.01, 0.06),
        new THREE.Vector3(side * (spreadX * 0.78), yBase - 0.05, reachZ * 0.62),
        new THREE.Vector3(side * (0.24 - t * 0.05), yBase - 0.08, reachZ),
      ]);
      const ribGeo = trackGeo(new THREE.TubeGeometry(curve, 12, radius, 6, false));
      const rib = reg(new THREE.Mesh(ribGeo, r % 2 === 0 ? basaltArmorMat : relicBrassMat));
      chassis.add(rib);

      // Glowing violet rune tip cap at the anterior rib tip
      const tipCap = new THREE.Mesh(
        trackGeo(new THREE.OctahedronGeometry(0.032, 0)),
        r === 1 || r === 2 ? veinGlowMat : relicBrassMat
      );
      tipCap.position.set(side * (0.24 - t * 0.05), yBase - 0.08, reachZ);
      chassis.add(tipCap);
    }
  }

  // =========================================================================
  // 2. OPEN-FRONT HOLLOW GOTHIC MITRE COWL, OBSIDIAN MASK & BLAZING TRIPLE-SLIT VISOR
  // =========================================================================
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.56, -0.02);
  chassis.add(headPivot);

  // Open-Front Hollow Gothic Hood Shell (wraps sides, back, and peaked overhanging cowl!)
  const cowlShellGeo = trackGeo(
    createCurvedPanelGeometry(
      [
        { y: -0.06, rx: 0.22, rz: 0.24, thickness: 0.042 },
        { y: 0.14, rx: 0.28, rz: 0.29, thickness: 0.048 },
        { y: 0.36, rx: 0.24, rz: 0.27, thickness: 0.044 },
        { y: 0.56, rx: 0.13, rz: 0.18, thickness: 0.036 },
        { y: 0.72, rx: 0.03, rz: 0.06, thickness: 0.024 },
      ],
      -Math.PI * 0.16,
      Math.PI * 1.16,
      16
    )
  );
  const cowlMesh = reg(new THREE.Mesh(cowlShellGeo, basaltArmorMat));
  headPivot.add(cowlMesh);

  // Sculpted Gothic Hood Peak Brow Overhang jutting forward over the face void
  const browPeakGeo = trackGeo(
    createCurvedPanelGeometry(
      [
        { y: 0.3, rx: 0.23, rz: 0.27, thickness: 0.038 },
        { y: 0.46, rx: 0.18, rz: 0.3, thickness: 0.04 },
        { y: 0.64, rx: 0.07, rz: 0.19, thickness: 0.03 },
      ],
      -Math.PI * 0.82,
      -Math.PI * 0.18,
      10
    )
  );
  const browPeak = reg(new THREE.Mesh(browPeakGeo, basaltArmorMat));
  browPeak.position.set(0, 0.02, -0.02);
  headPivot.add(browPeak);

  // Recessed Pitch-Black Obsidian Skull-Mask Face Cavity cleanly visible inside the open hood!
  const faceVoidGeo = trackGeo(
    createLoftedAnatomy(
      [
        { y: -0.02, rx: 0.11, rz: 0.12, offsetZ: -0.04, squareness: 2.3 },
        { y: 0.16, rx: 0.17, rz: 0.17, offsetZ: -0.05, pinchFront: 0.03, squareness: 2.5 },
        { y: 0.34, rx: 0.16, rz: 0.16, offsetZ: -0.04, squareness: 2.3 },
        { y: 0.48, rx: 0.09, rz: 0.1, offsetZ: -0.01, squareness: 2.0 },
      ],
      14
    )
  );
  const faceVoid = new THREE.Mesh(faceVoidGeo, darkCavityMat);
  headPivot.add(faceVoid);

  // Gilded Relic-Brass Jaw & Cheek Mandible Filigree framing the dark obsidian mask
  const cheekGeoL = trackGeo(
    createCurvedPanelGeometry(
      [
        { y: 0.0, rx: 0.19, rz: 0.22, thickness: 0.026 },
        { y: 0.16, rx: 0.22, rz: 0.25, thickness: 0.028 },
        { y: 0.32, rx: 0.21, rz: 0.24, thickness: 0.024 },
      ],
      -Math.PI * 0.92,
      -Math.PI * 0.68,
      8
    )
  );
  const cheekGeoR = trackGeo(
    createCurvedPanelGeometry(
      [
        { y: 0.0, rx: 0.19, rz: 0.22, thickness: 0.026 },
        { y: 0.16, rx: 0.22, rz: 0.25, thickness: 0.028 },
        { y: 0.32, rx: 0.21, rz: 0.24, thickness: 0.024 },
      ],
      -Math.PI * 0.32,
      -Math.PI * 0.08,
      8
    )
  );
  headPivot.add(
    reg(new THREE.Mesh(cheekGeoL, relicBrassMat)),
    reg(new THREE.Mesh(cheekGeoR, relicBrassMat))
  );

  // Haunting Blazing Triple-Slit Astral Ocular Visor (proud of the dark mask so it burns clearly!)
  const visorCenter = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.046, 0)), visorGlowMat);
  visorCenter.scale.set(0.42, 2.55, 0.5);
  visorCenter.position.set(0, 0.26, -0.25);
  headPivot.add(visorCenter);

  const sideSlitGeo = trackGeo(new THREE.OctahedronGeometry(0.036, 0));
  const visorL = new THREE.Mesh(sideSlitGeo, visorGlowMat);
  visorL.scale.set(2.15, 0.44, 0.45);
  visorL.position.set(-0.088, 0.18, -0.24);
  visorL.rotation.set(0, 0.25, -0.34);
  const visorR = new THREE.Mesh(sideSlitGeo, visorGlowMat);
  visorR.scale.set(2.15, 0.44, 0.45);
  visorR.position.set(0.088, 0.18, -0.24);
  visorR.rotation.set(0, -0.25, 0.34);

  // Lower whispering jaw-rune slit for extra eldritch menace
  const visorJaw = new THREE.Mesh(sideSlitGeo, veinGlowMat);
  visorJaw.scale.set(1.35, 0.28, 0.4);
  visorJaw.position.set(0, 0.07, -0.215);
  headPivot.add(visorL, visorR, visorJaw);

  // Twin Sculpted Serrated Crown Horns + Central Relic-Brass Crest + Floating Fractured Halo
  const hornGeo = trackGeo(createCrownHornGeo());
  const hornL = reg(new THREE.Mesh(hornGeo, basaltArmorMat));
  hornL.position.set(-0.17, 0.32, 0.02);
  hornL.rotation.set(-0.28, 0.34, 0.48);
  hornL.scale.set(-1, 0.96, 1);

  const hornR = reg(new THREE.Mesh(hornGeo, basaltArmorMat));
  hornR.position.set(0.17, 0.32, 0.02);
  hornR.rotation.set(-0.28, -0.34, -0.48);
  hornR.scale.set(1, 0.96, 1);
  headPivot.add(hornL, hornR);

  const crestFin = reg(new THREE.Mesh(hornGeo, relicBrassMat));
  crestFin.position.set(0, 0.4, -0.02);
  crestFin.rotation.set(-0.42, Math.PI * 0.5, 0);
  crestFin.scale.set(0.75, 0.92, 0.85);
  headPivot.add(crestFin);

  // Floating Fractured Gilded Seraphim Relic Halo hovering behind the cowl!
  const haloArcL = reg(
    new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.42, 0.016, 6, 16, Math.PI * 0.72)),
      relicBrassMat
    )
  );
  haloArcL.position.set(0, 0.32, 0.24);
  haloArcL.rotation.z = Math.PI * 0.14;
  const haloArcR = reg(
    new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.42, 0.016, 6, 16, Math.PI * 0.72)),
      relicBrassMat
    )
  );
  haloArcR.position.set(0, 0.32, 0.24);
  haloArcR.rotation.z = Math.PI * 1.14;
  headPivot.add(haloArcL, haloArcR);

  // =========================================================================
  // 3. TAPERED FLUTED STALACTITE TAIL-SPIRE & ORBITING FRACTURED SHARDS
  // =========================================================================
  const stalactitePts = [
    new THREE.Vector2(0.001, -0.95),
    new THREE.Vector2(0.065, -0.76),
    new THREE.Vector2(0.12, -0.58),
    new THREE.Vector2(0.095, -0.52),
    new THREE.Vector2(0.19, -0.34),
    new THREE.Vector2(0.16, -0.26),
    new THREE.Vector2(0.28, -0.06),
    new THREE.Vector2(0.24, 0.05),
    new THREE.Vector2(0.001, 0.08),
  ];
  const tailSpireGeo = trackGeo(new THREE.LatheGeometry(stalactitePts, 8));
  const tailSpire = reg(new THREE.Mesh(tailSpireGeo, basaltArmorMat));
  tailSpire.position.set(0, -0.44, 0.04);
  chassis.add(tailSpire);

  // Gilded collar ring + luminous gravity seam around the tail spire
  const tailCollar = reg(
    new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.24, 0.028, 6, 8)), relicBrassMat)
  );
  tailCollar.rotation.x = Math.PI * 0.5;
  tailCollar.position.set(0, -0.48, 0.04);
  chassis.add(tailCollar);

  const tailSeam = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.15, 0.018, 6, 8)),
    veinGlowMat
  );
  tailSeam.rotation.x = Math.PI * 0.5;
  tailSeam.position.set(0, -0.76, 0.04);
  chassis.add(tailSeam);

  // 3 Orbiting Fractured Obsidian Counterweight Shards beneath the tail
  const tailOrbitGroup = new THREE.Group();
  tailOrbitGroup.position.set(0, -0.96, 0.04);
  chassis.add(tailOrbitGroup);
  const fragGeo = trackGeo(new THREE.OctahedronGeometry(0.085, 0));
  const tailFrags: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const f = reg(new THREE.Mesh(fragGeo, basaltArmorMat));
    f.scale.set(0.68, 1.85, 0.58);
    f.position.set(Math.cos(a) * 0.34, 0, Math.sin(a) * 0.34);
    tailOrbitGroup.add(f);
    tailFrags.push(f);
  }

  // Draped Tapered Gothic Void-Silk Shroud Banners (flowing pointed cathedral tails!)
  const shroudPivot = new THREE.Group();
  shroudPivot.position.set(0, -0.16, 0.16);
  chassis.add(shroudPivot);

  const shroudRibbonGeo = trackGeo(
    createCurvedPanelGeometry(
      [
        { y: -1.04, rx: 0.04, rz: 0.04, thickness: 0.012, creaseAmp: 0.008 },
        { y: -0.78, rx: 0.16, rz: 0.12, thickness: 0.013, creaseAmp: 0.022 },
        { y: -0.44, rx: 0.21, rz: 0.15, thickness: 0.014, creaseAmp: 0.018 },
        { y: -0.14, rx: 0.18, rz: 0.13, thickness: 0.014, creaseAmp: 0.01 },
        { y: 0.08, rx: 0.15, rz: 0.11, thickness: 0.014, creaseAmp: 0.004 },
      ],
      Math.PI * 0.3,
      Math.PI * 0.7,
      10
    )
  );
  const shroudCenter = reg(new THREE.Mesh(shroudRibbonGeo, shroudClothMat));
  shroudCenter.position.set(0, 0, 0.1);
  const shroudL = reg(new THREE.Mesh(shroudRibbonGeo, shroudClothMat));
  shroudL.position.set(-0.22, 0.06, 0.02);
  shroudL.rotation.y = -0.48;
  shroudL.scale.set(0.84, 0.9, 0.85);
  const shroudR = reg(new THREE.Mesh(shroudRibbonGeo, shroudClothMat));
  shroudR.position.set(0.22, 0.06, 0.02);
  shroudR.rotation.y = 0.48;
  shroudR.scale.set(0.84, 0.9, 0.85);
  shroudPivot.add(shroudCenter, shroudL, shroudR);

  // =========================================================================
  // 4. CENTRAL EXPOSED WEAKPOINT: FACETED CRYSTALLINE ASTRAL HEART + 3 ASTROLABE RINGS + 4 IRIS TALONS
  // =========================================================================
  const heartGroup = new THREE.Group();
  heartGroup.position.set(0, -0.06, -0.04);
  chassis.add(heartGroup);

  // Sharp Faceted Amethyst Crystal Bipyramid Heart (WEAKPOINT! Crisp crystal facets instead of oval egg!)
  const heartMesh = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.235, 0)),
    weakpointCoreMat
  );
  heartMesh.scale.set(0.88, 1.44, 0.88);
  heartGroup.add(heartMesh);

  // Prismatic outer violet crystal aura cage
  const heartCageMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xe879f9,
      transparent: true,
      opacity: 0.34,
      wireframe: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const heartCage = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.29, 0)),
    heartCageMat
  );
  heartCage.scale.set(0.92, 1.48, 0.92);
  heartGroup.add(heartCage);

  // Blazing white-violet inner star core
  const innerStar = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.13, 0)), innerStarMat);
  innerStar.scale.set(0.76, 1.48, 0.76);
  heartGroup.add(innerStar);

  // 3 Sleek Counter-Rotating Gilded Astrolabe Gimbal Rings (clean clearance inside ribcage!)
  const gimbalA = reg(
    new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.33, 0.015, 6, 18)), relicBrassMat)
  );
  const gimbalB = reg(
    new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.39, 0.013, 6, 12)), relicBrassMat)
  );
  const gimbalC = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.28, 0.011, 6, 6)),
    veinGlowMat
  );
  heartGroup.add(gimbalA, gimbalB, gimbalC);

  // 4 Articulated Obsidian Iris Talons encircling the heart (flare wide open during attacks!)
  const talonGeo = trackGeo(createIrisTalonGeo());
  const irisTalons: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI * 0.25;
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(a) * 0.24, Math.sin(a) * 0.24, -0.14);
    pivot.rotation.z = a - Math.PI * 0.5;
    const m = reg(new THREE.Mesh(talonGeo, basaltArmorMat));
    pivot.add(m);
    heartGroup.add(pivot);
    irisTalons.push(pivot);
  }

  // Close-Range Supernova Charge Sphere (inflates during astral_pulse_repel windup!)
  const novaMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xd946ef,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const novaSphere = new THREE.Mesh(trackGeo(new THREE.IcosahedronGeometry(0.45, 1)), novaMat);
  novaSphere.visible = false;
  heartGroup.add(novaSphere);

  // Overhead Chalice Singularity Charge Orb (inflates above the cowl during singularity_mortar windup!)
  const chaliceOrbMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xe879f9,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const chaliceOrbGroup = new THREE.Group();
  chaliceOrbGroup.position.set(0, 1.55, -0.15);
  chassis.add(chaliceOrbGroup);

  const chaliceOrbMesh = new THREE.Mesh(
    trackGeo(new THREE.IcosahedronGeometry(0.34, 1)),
    chaliceOrbMat
  );
  const chaliceCoreMesh = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.18, 0)),
    innerStarMat
  );
  const chaliceRingMesh = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.46, 0.022, 6, 16)),
    veinGlowMat
  );
  chaliceOrbGroup.add(chaliceOrbMesh, chaliceCoreMesh, chaliceRingMesh);
  chaliceOrbGroup.visible = false;

  // =========================================================================
  // 5. SIX ARTICULATED TELEKINETIC SCIMITAR WING-SHARDS (3 LEFT / 3 RIGHT)
  // =========================================================================
  const shardBladeGeo = trackGeo(createScimitarShardBladeGeo());
  const shardFullerGeo = trackGeo(createScimitarFullerGeo());
  const shardHiltGeo = trackGeo(new THREE.OctahedronGeometry(0.085, 0));

  interface WingShardSlot {
    pivot: THREE.Group;
    bladeGroup: THREE.Group;
    tipAnchor: THREE.Object3D;
    fullerMat: THREE.MeshStandardMaterial;
    side: -1 | 1;
    tier: 0 | 1 | 2; // 0 = top outer, 1 = mid wing, 2 = lower inner
    recoil: number;
    flash: number;
    curPos: THREE.Vector3;
    curRot: THREE.Euler;
    tgtPos: THREE.Vector3;
    tgtRot: THREE.Euler;
  }

  const shards: WingShardSlot[] = [];
  for (let i = 0; i < 6; i++) {
    const side: -1 | 1 = i < 3 ? -1 : 1;
    const tier = (i % 3) as 0 | 1 | 2;

    const pivot = new THREE.Group();
    const bladeGroup = new THREE.Group();
    pivot.add(bladeGroup);

    // Per-shard emissive fuller material so each blade flashes independently on fire!
    const fullerMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xe879f9,
        emissive: 0xa855f7,
        emissiveIntensity: 1.8,
        roughness: 0.16,
        metalness: 0.2,
      })
    );

    const bladeMesh = reg(new THREE.Mesh(shardBladeGeo, basaltArmorMat));
    bladeMesh.scale.set(side, 0.92 - tier * 0.08, 1);
    bladeGroup.add(bladeMesh);

    const fullerMesh = new THREE.Mesh(shardFullerGeo, fullerMat);
    fullerMesh.scale.set(side, 0.92 - tier * 0.08, 1);
    bladeGroup.add(fullerMesh);

    // Gilded relic-brass binding collar & pommel diamond
    const hiltRing = reg(new THREE.Mesh(shardHiltGeo, relicBrassMat));
    hiltRing.scale.set(1.25, 0.65, 0.9);
    hiltRing.position.set(0, -0.34, 0);
    bladeGroup.add(hiltRing);

    const tipAnchor = new THREE.Object3D();
    tipAnchor.position.set(0, 0.64, 0);
    bladeGroup.add(tipAnchor);

    // Initial Seraphic Winged Fan resting pose
    const initX = side * (0.95 + (2 - tier) * 0.28);
    const initY = 0.56 - tier * 0.44;
    const initZ = 0.26 + tier * 0.06;
    pivot.position.set(initX, initY, initZ);
    pivot.rotation.set(0.12, side * 0.18, -side * (0.48 + tier * 0.34));
    chassis.add(pivot);

    shards.push({
      pivot,
      bladeGroup,
      tipAnchor,
      fullerMat,
      side,
      tier,
      recoil: 0,
      flash: 0,
      curPos: pivot.position.clone(),
      curRot: pivot.rotation.clone(),
      tgtPos: pivot.position.clone(),
      tgtRot: pivot.rotation.clone(),
    });
  }

  // =========================================================================
  // 6. MULTI-LAYER WALL-CLIPPED FOCUSING TELEGRAPH BEAM + 3 SLIDING RINGS + IMPACT FLARE
  // =========================================================================
  const muzzleAnchor = new THREE.Object3D();
  muzzleAnchor.position.set(0, -0.02, -0.62);
  chassis.add(muzzleAnchor);

  const beamCoreMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xfdf4ff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const beamSheathMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      map: tex.trailGradMap,
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  const beamCoreGeo = trackGeo(new THREE.CylinderGeometry(0.022, 0.032, 1, 6, 1, true));
  beamCoreGeo.rotateX(Math.PI * 0.5);
  beamCoreGeo.translate(0, 0, -0.5);
  const beamCoreMesh = new THREE.Mesh(beamCoreGeo, beamCoreMat);
  beamCoreMesh.visible = false;
  muzzleAnchor.add(beamCoreMesh);

  const beamSheathGeo = trackGeo(new THREE.CylinderGeometry(0.085, 0.13, 1, 8, 1, true));
  beamSheathGeo.rotateX(Math.PI * 0.5);
  beamSheathGeo.translate(0, 0, -0.5);
  const beamSheathMesh = new THREE.Mesh(beamSheathGeo, beamSheathMat);
  beamSheathMesh.visible = false;
  muzzleAnchor.add(beamSheathMesh);

  // 3 Hexagonal Focusing Rings that slide forward down the lance barrel while charging!
  const focusRingGeo = trackGeo(new THREE.TorusGeometry(0.32, 0.022, 6, 6));
  const focusRings: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const rMesh = new THREE.Mesh(focusRingGeo, i === 1 ? relicBrassMat : veinGlowMat);
    rMesh.visible = false;
    muzzleAnchor.add(rMesh);
    focusRings.push(rMesh);
  }

  // Impact target flare sphere at exact wall/player distance
  const beamTipFlare = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.16, 0)),
    beamCoreMat
  );
  beamTipFlare.visible = false;
  muzzleAnchor.add(beamTipFlare);

  // =========================================================================
  // 7. LIVE ZERO-GC TWIN WINGTIP ENERGY WAKE TRAILS (attached to root!)
  // =========================================================================
  const leftTrail = createWingRibbonTrail(trailMat);
  const rightTrail = createWingRibbonTrail(trailMat);
  ownedGeos.push(leftTrail.geo, rightTrail.geo);
  root.add(leftTrail.mesh, rightTrail.mesh);

  const updateTrailRibbon = (trail: WingRibbonTrail, tipAnchor: THREE.Object3D, width: number) => {
    tipAnchor.getWorldPosition(_trailTip);
    _trailInvMat.copy(root.matrixWorld).invert();
    _trailLocal.copy(_trailTip).applyMatrix4(_trailInvMat);

    if (!trail.initialized) {
      for (let i = 0; i < TRAIL_SEGMENTS; i++) {
        trail.history[i].copy(_trailLocal);
      }
      trail.initialized = true;
    } else {
      for (let i = TRAIL_SEGMENTS - 1; i > 0; i--) {
        trail.history[i].copy(trail.history[i - 1]);
      }
      trail.history[0].copy(_trailLocal);
    }

    const posArr = trail.positions;
    for (let i = 0; i < TRAIL_SEGMENTS; i++) {
      const p = trail.history[i];
      const taper = (1 - i / (TRAIL_SEGMENTS - 1)) * width;
      // Add slight artificial wake drift backward (+Z local) so trails stay graceful even while hovering slowly!
      const wakeZ = (i / (TRAIL_SEGMENTS - 1)) * 0.42;
      const base = i * 6;
      posArr[base + 0] = p.x;
      posArr[base + 1] = p.y + taper;
      posArr[base + 2] = p.z + wakeZ;
      posArr[base + 3] = p.x;
      posArr[base + 4] = p.y - taper;
      posArr[base + 5] = p.z + wakeZ;
    }
    (trail.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  };

  // =========================================================================
  // 8. PRECISION MULTI-ZONE HITBOXES (weakpoint Heart + sculpted Head + Reliquary Body)
  // =========================================================================
  const hitboxes: THREE.Mesh[] = [];
  const bodyHit = makeHitbox(
    trackGeo(new THREE.CylinderGeometry(0.46, 0.24, 1.9, 8)),
    mats.hitboxInvisible,
    enemyId,
    'body',
    [0, -0.05, 0.08]
  );
  const headHit = makeHitbox(
    trackGeo(new THREE.BoxGeometry(0.5, 0.62, 0.5)),
    mats.hitboxInvisible,
    enemyId,
    'head',
    [0, 0.3, -0.04]
  );
  const wpHit = makeHitbox(
    trackGeo(new THREE.SphereGeometry(0.42, 10, 10)),
    mats.hitboxInvisible,
    enemyId,
    'weakpoint',
    [0, 0, 0]
  );
  chassis.add(bodyHit);
  headPivot.add(headHit);
  heartGroup.add(wpHit);
  hitboxes.push(bodyHit, headHit, wpHit);

  // Live animation state (zero GC!)
  let beamActive = false;
  let beamCharge = 0;
  let formationMode: LevitatorFormationMode = 'seraphic_idle';
  let chaliceCharge = 0;
  let novaCharge = 0;
  let trailTick = 0;

  return {
    root,
    hitboxes,
    weakpointMaterials: [weakpointCoreMat],
    armorFlashMaterials: [basaltArmorMat],

    getMuzzleWorldPos(out: THREE.Vector3) {
      return muzzleAnchor.getWorldPosition(out);
    },

    getWeakpointWorldPos(out: THREE.Vector3) {
      return heartMesh.getWorldPosition(out);
    },

    getShardTipWorldPos(shardIndex: number, out: THREE.Vector3) {
      const idx = Math.max(0, Math.min(shards.length - 1, shardIndex));
      return shards[idx].tipAnchor.getWorldPosition(out);
    },

    getChaliceOrbWorldPos(out: THREE.Vector3) {
      return chaliceOrbGroup.getWorldPosition(out);
    },

    triggerShardRecoil(shardIndex: number) {
      const idx = Math.max(0, Math.min(shards.length - 1, shardIndex));
      shards[idx].recoil = 1.0;
      shards[idx].flash = 1.0;
    },

    setFormationMode(mode: LevitatorFormationMode) {
      formationMode = mode;
    },

    setChaliceOrbCharge(charge: number) {
      chaliceCharge = Math.max(0, Math.min(1, charge));
    },

    setNovaSphereCharge(charge: number) {
      novaCharge = Math.max(0, Math.min(1, charge));
    },

    setGroundDrop(dropMeters: number) {
      groundAnchor.position.y = -Math.max(0.05, dropMeters);
    },

    setTelegraphBeam(active: boolean, length: number, chargeRatio: number) {
      beamActive = active;
      beamCharge = chargeRatio;
      const show = active && length > 0.2;
      beamCoreMesh.visible = show;
      beamSheathMesh.visible = show;
      beamTipFlare.visible = show;

      if (show) {
        const coreWidth = 0.65 + chargeRatio * 1.65;
        const sheathWidth = 1.5 - chargeRatio * 0.55;
        beamCoreMesh.scale.set(coreWidth, coreWidth, length);
        beamSheathMesh.scale.set(sheathWidth, sheathWidth, length);
        beamCoreMat.opacity = 0.35 + chargeRatio * 0.65;
        beamSheathMat.opacity = 0.2 + chargeRatio * 0.58;

        beamTipFlare.position.set(0, 0, -length);
        const flareScale = 0.6 + chargeRatio * 1.45;
        beamTipFlare.scale.setScalar(flareScale);

        for (let i = 0; i < focusRings.length; i++) {
          const r = focusRings[i];
          r.visible = true;
          const phase = (chargeRatio * 1.4 + i * 0.33) % 1;
          r.position.set(0, 0, -0.25 - phase * Math.min(3.2, length * 0.45));
          const ringScale = Math.max(0.28, (1.15 - chargeRatio * 0.52) * (1 - phase * 0.35));
          r.scale.setScalar(ringScale);
        }
      } else {
        for (let i = 0; i < focusRings.length; i++) {
          focusRings[i].visible = false;
        }
      }
    },

    updateAnimation(input: EnemyAnimationInput) {
      const {
        dt,
        elapsed,
        behavior,
        attackProgress,
        staggerTimer,
        deadProgress,
        localMoveX,
        localMoveZ,
        flinchTimer,
        flinchDirX,
        weakpointBroken,
      } = input;

      // Death collapse: spirals downward, shards shatter outward & vanish
      if (deadProgress > 0) {
        chassis.position.y = Math.max(0.18, 1.15 - deadProgress * 1.05);
        chassis.rotation.x = deadProgress * 1.45;
        chassis.rotation.z = deadProgress * 0.95;
        for (let i = 0; i < shards.length; i++) {
          shards[i].pivot.scale.setScalar(Math.max(0.01, 1 - deadProgress * 0.95));
        }
        beamCoreMesh.visible = false;
        beamSheathMesh.visible = false;
        beamTipFlare.visible = false;
        chaliceOrbGroup.visible = false;
        novaSphere.visible = false;
        leftTrail.mesh.visible = false;
        rightTrail.mesh.visible = false;
        return;
      }

      const isStaggered = staggerTimer > 0;
      const isAttacking = behavior === 'windup' || behavior === 'attack';
      const hoverBob = Math.sin(elapsed * 2.55) * 0.14;
      const dampFast = 1 - Math.exp(-11.5 * dt);
      const dampMed = 1 - Math.exp(-7.5 * dt);

      // Hit flinch impulse & banking tilt
      const flinchKick = flinchTimer > 0 ? Math.sin(flinchTimer * 28) * 0.24 : 0;
      const targetChY = (isStaggered ? 0.56 : 1.15) + hoverBob;
      const targetChRotX = isStaggered
        ? 0.42 + Math.sin(elapsed * 15) * 0.18
        : THREE.MathUtils.clamp(-localMoveZ * 0.24, -0.32, 0.32) - Math.abs(flinchKick) * 0.45;
      const targetChRotZ = isStaggered
        ? Math.cos(elapsed * 13) * 0.26
        : THREE.MathUtils.clamp(-localMoveX * 0.28, -0.36, 0.36) + flinchKick * (flinchDirX || 1);

      chassis.position.y += (targetChY - chassis.position.y) * dampMed;
      chassis.rotation.x += (targetChRotX - chassis.rotation.x) * dampFast;
      chassis.rotation.z += (targetChRotZ - chassis.rotation.z) * dampFast;

      // Sculpted Mitre Head tracks threats menacingly
      headPivot.rotation.x = isStaggered
        ? 0.46
        : THREE.MathUtils.clamp(-input.aimPitch * 0.45, -0.35, 0.35) +
          (isAttacking ? -0.1 * attackProgress : 0);
      headPivot.rotation.y = isStaggered
        ? Math.sin(elapsed * 18) * 0.25
        : Math.sin(elapsed * 1.4) * 0.06;

      // Floating Fractured Seraphim Relic Halo gently rotates behind the cowl
      const haloSpd = isStaggered ? 0.35 : isAttacking ? 2.4 : 0.72;
      haloArcL.rotation.z += dt * haloSpd;
      haloArcR.rotation.z += dt * haloSpd;

      // Triple-Slit Ocular Visor flares violently on attacks, dims when staggered/broken
      visorGlowMat.emissiveIntensity = isStaggered
        ? 0.4
        : isAttacking
          ? 3.8 + attackProgress * 2.4
          : 2.8 + Math.sin(elapsed * 4.2) * 0.45;

      // Draped Liturgical Shroud Ribbons billow behind velocity!
      shroudPivot.rotation.x =
        0.18 + Math.min(0.55, Math.abs(localMoveZ) * 0.32) + Math.sin(elapsed * 4.4) * 0.08;
      shroudPivot.rotation.z =
        THREE.MathUtils.clamp(localMoveX * 0.28, -0.38, 0.38) + Math.cos(elapsed * 3.1) * 0.06;

      // Orbiting lower fractured stalactite counterweights
      tailOrbitGroup.rotation.y = -elapsed * (isAttacking ? 3.2 : 1.35);
      for (let i = 0; i < tailFrags.length; i++) {
        tailFrags[i].position.y = Math.sin(elapsed * 3.2 + i * 2.1) * 0.1;
        tailFrags[i].rotation.x = elapsed * 1.8 + i;
      }

      // Ground rune projection rotates slowly
      groundRuneRing.rotation.z = elapsed * 0.9;
      groundRuneMat.opacity = isStaggered ? 0.12 : isAttacking ? 0.48 : 0.26;

      // =====================================================================
      // ASTRAL RESONANCE HEART + 3 ASTROLABE GIMBAL RINGS + 4 IRIS TALONS
      // =====================================================================
      const heartSpin = isStaggered ? 0.8 : isAttacking ? 7.2 : 2.5;
      heartMesh.rotation.y += dt * heartSpin;
      heartMesh.rotation.x = Math.sin(elapsed * 2.1) * 0.35;
      const heartPulse = weakpointBroken
        ? 0.82
        : 1.0 + Math.sin(elapsed * (isAttacking ? 16 : 5.2)) * 0.08 + (isAttacking ? attackProgress * 0.16 : 0);
      heartMesh.scale.set(0.88 * heartPulse, 1.44 * heartPulse, 0.88 * heartPulse);

      heartCage.visible = !weakpointBroken;
      heartCage.rotation.y -= dt * (heartSpin * 0.65);
      heartCage.rotation.z = Math.sin(elapsed * 1.8) * 0.28;
      heartCage.scale.setScalar(heartPulse);

      innerStar.visible = !weakpointBroken;
      innerStar.rotation.y = -elapsed * 5.6;
      innerStar.rotation.z = elapsed * 4.2;

      if (weakpointBroken || isStaggered) {
        // Shattered core: astrolabe rings wobble off-axis erratically
        gimbalA.rotation.set(Math.sin(elapsed * 7) * 0.8, elapsed * 1.4, Math.cos(elapsed * 6) * 0.7);
        gimbalB.rotation.set(Math.cos(elapsed * 8) * 0.9, -elapsed * 1.1, Math.sin(elapsed * 5) * 0.6);
        gimbalC.rotation.set(elapsed * 0.9, elapsed * 1.2, 0.5);
      } else {
        const gSpd = isAttacking ? 3.8 : 1.45;
        gimbalA.rotation.x += dt * gSpd * 1.2;
        gimbalA.rotation.y += dt * gSpd * 0.8;
        gimbalB.rotation.y -= dt * gSpd * 1.45;
        gimbalB.rotation.z += dt * gSpd * 0.95;
        gimbalC.rotation.z -= dt * gSpd * 2.1;
        gimbalC.rotation.x = Math.sin(elapsed * 2.4) * 0.45;
      }

      // 4 Obsidian Iris Talons flare WIDE OPEN during attacks to telegraph & reward weakpoint shots!
      const irisOpen = isStaggered ? 0.85 : isAttacking ? 0.55 + attackProgress * 0.55 : 0.16 + Math.sin(elapsed * 2.6) * 0.06;
      for (let i = 0; i < irisTalons.length; i++) {
        irisTalons[i].rotation.x = -irisOpen;
      }

      // Overhead Chalice Mortar Charge Orb & Supernova Charge Sphere
      if (chaliceCharge > 0.01) {
        chaliceOrbGroup.visible = true;
        const sc = 0.25 + chaliceCharge * 1.25;
        chaliceOrbGroup.scale.setScalar(sc);
        chaliceOrbMat.opacity = 0.3 + chaliceCharge * 0.65;
        chaliceRingMesh.rotation.x = elapsed * 6.5;
        chaliceRingMesh.rotation.y = elapsed * 4.8;
      } else {
        chaliceOrbGroup.visible = false;
      }

      if (novaCharge > 0.01) {
        novaSphere.visible = true;
        const sc = 0.4 + novaCharge * 2.4;
        novaSphere.scale.setScalar(sc);
        novaMat.opacity = 0.22 + novaCharge * 0.55;
        novaSphere.rotation.y = elapsed * 7.0;
      } else {
        novaSphere.visible = false;
      }

      // =====================================================================
      // 6 ARTICULATED TELEKINETIC SCIMITAR WING-SHARDS CHOREOGRAPHY
      // =====================================================================
      const mode: LevitatorFormationMode = isStaggered ? 'seraphic_idle' : formationMode;

      for (let i = 0; i < shards.length; i++) {
        const s = shards[i];
        s.recoil = Math.max(0, s.recoil - dt * 4.8);
        s.flash = Math.max(0, s.flash - dt * 5.2);

        const bob = Math.sin(elapsed * 3.1 + i * 1.05) * 0.09;

        if (isStaggered) {
          // Drooped erratic shards while grounded/stunned
          s.tgtPos.set(s.side * (0.86 + s.tier * 0.18), -0.12 - s.tier * 0.22 + bob * 0.5, 0.22);
          s.tgtRot.set(0.45 + Math.sin(elapsed * 12 + i) * 0.16, 0, -s.side * (1.2 + s.tier * 0.25));
        } else if (mode === 'lance_barrel') {
          // All 6 shards lock tightly into a spinning hexagonal focusing cannon barrel in front of the Heart!
          const angle = (i * Math.PI) / 3 + elapsed * (3.2 + beamCharge * 6.5);
          const ringR = 0.68 - beamCharge * 0.24;
          s.tgtPos.set(Math.cos(angle) * ringR, Math.sin(angle) * ringR - 0.02, -0.78 - beamCharge * 0.28);
          s.tgtRot.set(-Math.PI * 0.5, 0, angle - Math.PI * 0.5);
        } else if (mode === 'volley_fan') {
          // Aggressive forward-pitched gunship halo: each blade points forward at the player & kicks back on recoil!
          const spreadX = s.side * (0.82 + (2 - s.tier) * 0.24);
          const spreadY = 0.52 - s.tier * 0.44 + bob * 0.6;
          const kickZ = s.recoil * 0.48;
          s.tgtPos.set(spreadX, spreadY, -0.26 + s.tier * 0.06 + kickZ);
          s.tgtRot.set(-Math.PI * 0.44 - s.recoil * 0.32, s.side * 0.1, -s.side * (0.14 + s.tier * 0.12));
        } else if (mode === 'scythe_slash') {
          // Predatory Twin Scythe Guillotine: blades lock into curved twin sweeping scythe wings!
          const sweep = behavior === 'attack' ? Math.sin(Math.min(1, attackProgress * 1.4) * Math.PI) : -attackProgress * 0.65;
          const xArc = s.side * (1.05 + s.tier * 0.26 - sweep * 0.55);
          const yArc = 0.36 - s.tier * 0.3 + sweep * 0.12;
          const zArc = -0.35 - sweep * 0.85 + s.tier * 0.08;
          s.tgtPos.set(xArc, yArc, zArc);
          s.tgtRot.set(-0.65 - sweep * 1.05, s.side * (0.35 - sweep * 1.15), -s.side * (1.28 + s.tier * 0.12));
        } else if (mode === 'chalice_mortar') {
          // Ritual Chalice Crown sweeping skyward around the overhead Singularity Mortar Orb!
          const ang = (i * Math.PI) / 3 + elapsed * 2.4;
          const crR = 0.72 + chaliceCharge * 0.22;
          s.tgtPos.set(Math.cos(ang) * crR, 1.18 + Math.sin(elapsed * 4 + i) * 0.08, Math.sin(ang) * crR - 0.12);
          s.tgtRot.set(0.28, -ang, -s.side * 0.25);
        } else if (mode === 'nova_repel') {
          // Implode tightly around the chest on windup, then EXPLODE outward radially on blast!
          const ang = (i * Math.PI) / 3 + elapsed * 4.5;
          const radial = behavior === 'attack' ? 1.75 + attackProgress * 0.55 : 0.68 - attackProgress * 0.22;
          s.tgtPos.set(Math.cos(ang) * radial, Math.sin(ang) * radial * 0.85, behavior === 'attack' ? -0.35 : -0.15);
          s.tgtRot.set(behavior === 'attack' ? -0.55 : 0.15, 0, ang - Math.PI * 0.5);
        } else {
          // Majestic Seraphic Winged Halo behind shoulders
          const wingX = s.side * (0.98 + (2 - s.tier) * 0.32);
          const wingY = 0.62 - s.tier * 0.44 + bob;
          const wingZ = 0.26 + s.tier * 0.08;
          s.tgtPos.set(wingX, wingY, wingZ);
          s.tgtRot.set(0.14 + Math.sin(elapsed * 2.2 + i) * 0.06, s.side * 0.2, -s.side * (0.44 + s.tier * 0.34));
        }

        // Smooth frame-rate independent exponential damping (zero abrupt snaps!)
        s.curPos.lerp(s.tgtPos, dampFast);
        s.curRot.x += (s.tgtRot.x - s.curRot.x) * dampFast;
        s.curRot.y += (s.tgtRot.y - s.curRot.y) * dampFast;
        s.curRot.z += (s.tgtRot.z - s.curRot.z) * dampFast;
        s.pivot.position.copy(s.curPos);
        s.pivot.rotation.copy(s.curRot);

        // Per-shard emissive intensity surges brightly on fire or charge!
        s.fullerMat.emissiveIntensity =
          1.45 + s.flash * 4.5 + (mode === 'lance_barrel' ? beamCharge * 2.6 : 0) + (isAttacking ? 0.85 : 0);
      }

      // Spin focus rings when lance beam is active
      if (beamActive) {
        for (let i = 0; i < focusRings.length; i++) {
          focusRings[i].rotation.z = elapsed * (i % 2 === 0 ? 5.5 : -6.2);
        }
      } else {
        beamCoreMesh.visible = false;
        beamSheathMesh.visible = false;
        beamTipFlare.visible = false;
        for (let i = 0; i < focusRings.length; i++) {
          focusRings[i].visible = false;
        }
      }

      // Step twin live wingtip wake trails at ~30Hz for crisp ribbons with tiny CPU footprint
      trailTick += dt;
      if (trailTick >= 0.032) {
        trailTick = 0;
        root.updateMatrixWorld(true);
        const w = isAttacking ? 0.14 : 0.085;
        updateTrailRibbon(leftTrail, shards[0].tipAnchor, w);
        updateTrailRibbon(rightTrail, shards[3].tipAnchor, w);
      }
    },

    dispose() {
      for (const g of ownedGeos) g.dispose();
      for (const m of ownedMats) m.dispose();
      if (ownsTextures) tex.dispose();
    },
  };
}
