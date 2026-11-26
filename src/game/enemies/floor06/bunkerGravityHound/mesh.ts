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
  createBunkerGravityHoundTextures,
  type BunkerGravityHoundTextureSuite,
} from './textures';

export type GravityHoundStance =
  | 'stalk'
  | 'pounce_crouch'
  | 'pounce_leap'
  | 'grav_pulse'
  | 'tail_whip'
  | 'tusk_surge'
  | 'mortar_salvo'
  | 'bull_charge'
  | 'maw_beam'
  | 'phase2_overdrive';

export interface GravityHoundVisualState {
  stance?: GravityHoundStance;
  phase2Aura?: number;
  jawOpen?: number;
  shutterOpen?: number;
  gravFieldIntensity?: number;
  tuskCharge?: number;
  tailSpinAngle?: number;
  mortarPitch?: number;
}

export interface BunkerGravityHoundRigHandle extends EnemyRigHandle {
  setMawBeamTelegraph: (
    active: boolean,
    length: number,
    chargeRatio: number,
    firing?: boolean,
    sweepYawOffset?: number
  ) => void;
  setHoundVisualState: (state: GravityHoundVisualState) => void;
  getTuskTipWorldPos: (side: -1 | 1, out: THREE.Vector3) => THREE.Vector3;
  getShoulderPodWorldPos: (side: -1 | 1, out: THREE.Vector3) => THREE.Vector3;
  getTailTipWorldPos: (out: THREE.Vector3) => THREE.Vector3;
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

/** Sleek, razor-tapered Sabre-Curved War-Hound Plasma-Tusk (0.56m long, extends -Z and curves +Y). */
function buildCurvedTuskSpineGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.036);
  shape.quadraticCurveTo(0.22, -0.044, 0.42, 0.042);
  shape.quadraticCurveTo(0.51, 0.11, 0.56, 0.21);
  shape.quadraticCurveTo(0.41, 0.125, 0.24, 0.068);
  shape.quadraticCurveTo(0.1, 0.042, 0, 0.048);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.036,
    bevelEnabled: true,
    bevelThickness: 0.011,
    bevelSize: 0.009,
    bevelSegments: 2,
    curveSegments: 14,
  });
  geo.translate(0, 0, -0.018);
  geo.rotateY(Math.PI / 2); // Shape +X extends forward along -Z!
  geo.computeVertexNormals();
  return geo;
}

/** Razor plasma cutting edge riding flush along the lower/outer belly of each curved sabre tusk. */
function buildCurvedTuskEdgeGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0.06, -0.042);
  shape.quadraticCurveTo(0.25, -0.056, 0.45, 0.036);
  shape.quadraticCurveTo(0.54, 0.112, 0.59, 0.235);
  shape.quadraticCurveTo(0.46, 0.125, 0.31, 0.035);
  shape.quadraticCurveTo(0.18, -0.018, 0.06, -0.012);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.018,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.005,
    bevelSegments: 1,
    curveSegments: 14,
  });
  geo.translate(0, 0, -0.009);
  geo.rotateY(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/** Sculpted swept cyber-wolf predatory V-Brow Visor Hood (replaces boxy gold brow slab!). */
function buildPredatorBrowHoodGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.34);
  shape.lineTo(0.32, 0.18);
  shape.lineTo(0.36, -0.14);
  shape.lineTo(0.18, -0.34);
  shape.lineTo(0, -0.22);
  shape.lineTo(-0.18, -0.34);
  shape.lineTo(-0.36, -0.14);
  shape.lineTo(-0.32, 0.18);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.055,
    bevelEnabled: true,
    bevelThickness: 0.022,
    bevelSize: 0.018,
    bevelSegments: 2,
  });
  geo.rotateX(-Math.PI / 2); // Shape +Y points forward along -Z!
  geo.computeVertexNormals();
  return geo;
}

/** Sculpted tapered angled nasal bridge armor crest sweeping cleanly down the snout. */
function buildSnoutCrestGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.48, -0.03);
  shape.lineTo(0.56, -0.09);
  shape.lineTo(0.44, -0.11);
  shape.lineTo(0.06, -0.075);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.014,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.06);
  geo.rotateY(Math.PI / 2); // Extends forward along -Z!
  geo.computeVertexNormals();
  return geo;
}

/** Sculpted hinged dorsal blast-shield carapace wing with carved tactical louver slot. */
function buildDorsalShutterWingGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.96, 0.04);
  shape.lineTo(0.84, 0.44);
  shape.quadraticCurveTo(0.46, 0.56, 0.08, 0.48);
  shape.lineTo(-0.1, 0.16);
  shape.closePath();

  const slot = new THREE.Path();
  slot.moveTo(0.22, 0.18);
  slot.lineTo(0.7, 0.2);
  slot.lineTo(0.64, 0.32);
  slot.lineTo(0.24, 0.3);
  slot.closePath();
  shape.holes.push(slot);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.048,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.013,
    bevelSegments: 2,
    curveSegments: 10,
  });
  geo.translate(-0.42, 0, -0.024);
  geo.rotateY(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/** Swept aggressive predator ear/sensor crest fin. */
function buildPredatorEarCrestGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.38, 0.26);
  shape.lineTo(0.48, 0.18);
  shape.lineTo(0.22, -0.04);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.032,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.016);
  geo.rotateY(-Math.PI / 2); // Sweeps backward along +Z!
  geo.computeVertexNormals();
  return geo;
}

/** Sculpted swept armored Shoulder Bumper Fin integrating shoulder pods cleanly onto thorax. */
function buildShoulderCowlFinGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.48, 0.04);
  shape.lineTo(0.36, 0.22);
  shape.lineTo(0.06, 0.18);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.012,
    bevelSegments: 2,
  });
  geo.translate(-0.24, -0.08, -0.03);
  geo.rotateY(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/** Sculpted twin-pronged Magnetic Flail / Gravity-Anchor Harpoon Tail Blade. */
function buildTailHarpoonBladeGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.04);
  shape.lineTo(0.24, -0.18);
  shape.lineTo(0.68, 0.0);
  shape.lineTo(0.24, 0.18);
  shape.lineTo(0, 0.04);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.03,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.015);
  geo.rotateY(-Math.PI / 2); // Points backward along +Z!
  geo.computeVertexNormals();
  return geo;
}

/** Sculpted curved armored Siege-Paw Claw talon. */
function buildClawTalonGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.048);
  shape.quadraticCurveTo(0.15, 0.044, 0.27, -0.058);
  shape.quadraticCurveTo(0.12, -0.026, 0, -0.032);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.04,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.007,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.translate(0, 0, -0.02);
  geo.rotateY(Math.PI / 2); // Points forward along -Z!
  geo.computeVertexNormals();
  return geo;
}

/** Sculpted sloped angular Cyber-Wolf Armored Nose-Prow (eliminates blunt cylinder nosecap!). */
function buildSnoutProwGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.11);
  shape.lineTo(0.2, 0.055);
  shape.lineTo(0.27, -0.045);
  shape.lineTo(0.16, -0.105);
  shape.lineTo(0, -0.095);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.21,
    bevelEnabled: true,
    bevelThickness: 0.028,
    bevelSize: 0.024,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.105);
  geo.rotateY(Math.PI / 2); // Extends forward along -Z!
  geo.computeVertexNormals();
  return geo;
}

/** Sculpted tapered armored Lower Mandible Chin-Prow. */
function buildChinProwGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.045);
  shape.lineTo(0.22, 0.03);
  shape.lineTo(0.16, -0.055);
  shape.lineTo(0, -0.058);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.17,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.085);
  geo.rotateY(Math.PI / 2); // Extends forward along -Z!
  geo.computeVertexNormals();
  return geo;
}

/** Sculpted swept angular Zygomatic Cheek-Blade framing each Sabre-Tusk socket. */
function buildCheekBladeGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.18, -0.05);
  shape.lineTo(0.16, -0.075);
  shape.lineTo(0.22, 0.01);
  shape.lineTo(0.06, 0.075);
  shape.lineTo(-0.22, 0.05);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.046,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.023);
  geo.rotateY(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/** Sculpted swept-back predator dorsal spine blade for each tail segment. */
function buildTailDorsalFinGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.24, 0);
  shape.lineTo(0.32, 0.095);
  shape.lineTo(0.11, 0.075);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.022,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.005,
    bevelSegments: 1,
  });
  geo.translate(-0.08, 0, -0.011);
  geo.rotateY(-Math.PI / 2); // Sweeps backward along +Z!
  geo.computeVertexNormals();
  return geo;
}

/** Sculpted sloped Armored Paw-Knuckle Hood replacing boxy cube feet. */
function buildPawHoodGeo(width: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.14, -0.065);
  shape.lineTo(0.18, -0.065);
  shape.lineTo(0.16, 0.015);
  shape.lineTo(0.03, 0.068);
  shape.lineTo(-0.12, 0.055);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.016,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -width * 0.5);
  geo.rotateY(Math.PI / 2); // Slopes forward along -Z!
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds the AAA sculpted BUNKER GRAVITY-HOUND (Floor 06 Zone Mini-Boss #2 — Round 2 Sculpt):
 * - Forged Black-Site Brutalist Siege-Plating, Relic-Bronze Hydraulics & Ribbed Plasma Underframe
 * - Layered sculpted thorax rib-carapace armor plates + articulated hip/shoulder pauldrons
 * - Hinged Clamshell Dorsal Grav-Singularity Reactor (WEAKPOINT) with volcanic crimson-gold faceted core
 * - Cyber-Cerberus head with swept V-Brow Visor Hood, recessed 3-slit optics, articulated jaw & sleek sabre Plasma-Tusks
 * - 4 mathematically grounded 3-joint digitigrade hydraulic legs with dynamic leap-claw articulation
 * - 4-segment articulated whip-blade Grav-Tail with armored pelvis tail-cowling fairing
 * - Twin gimbal-mounted shoulder Gravity-Mine mortar pods + Ground Gravity-Well sigil + Volumetric Maw Beam
 */
export function buildBunkerGravityHoundRig(
  enemyId: string,
  mats: Floor06EnemyMaterials,
  sharedTextures?: BunkerGravityHoundTextureSuite
): BunkerGravityHoundRigHandle {
  const ownsTextures = !sharedTextures;
  const tex = sharedTextures ?? createBunkerGravityHoundTextures();

  // ── Bespoke Brutalist Siege-Beast PBR Materials (color=0xffffff with CanvasTexture maps!) ──
  const armorMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.armorMap,
    bumpMap: tex.armorBump,
    bumpScale: 0.03,
    roughnessMap: tex.armorRoughness,
    roughness: 0.42,
    metalness: 0.7,
    side: THREE.DoubleSide,
  });

  const bronzeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.bronzeMap,
    bumpMap: tex.bronzeBump,
    bumpScale: 0.024,
    roughness: 0.28,
    metalness: 0.86,
  });

  const underframeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.underframeMap,
    bumpMap: tex.underframeBump,
    bumpScale: 0.022,
    roughness: 0.62,
    metalness: 0.32,
  });

  const darkJointMat = new THREE.MeshStandardMaterial({
    color: 0x161820,
    roughness: 0.36,
    metalness: 0.78,
  });

  const steelFangMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.22,
    metalness: 0.9,
  });

  // Rich volcanic crimson & molten amber crystal emissives (calibrated for sculpted facets, never flat washout!)
  const crimsonEnergyMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xb91c1c,
    emissiveIntensity: 1.25,
    roughness: 0.18,
    metalness: 0.28,
    flatShading: true,
  });

  const amberPlasmaMat = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    emissive: 0xd9480f,
    emissiveIntensity: 1.18,
    roughness: 0.16,
    metalness: 0.32,
    flatShading: true,
  });

  const reactorCoreMat = new THREE.MeshStandardMaterial({
    color: 0x2b0408,
    emissive: 0xdc2626,
    emissiveIntensity: 1.55,
    roughness: 0.14,
    metalness: 0.35,
    flatShading: true,
  });

  const reactorCageMat = new THREE.MeshStandardMaterial({
    color: 0x1e1314,
    emissive: 0xef4444,
    emissiveIntensity: 0.65,
    roughness: 0.24,
    metalness: 0.85,
    wireframe: true,
  });

  const reactorRingMat = new THREE.MeshStandardMaterial({
    color: 0xd4a373,
    map: tex.bronzeMap,
    bumpMap: tex.bronzeBump,
    bumpScale: 0.02,
    emissive: 0x9a3412,
    emissiveIntensity: 0.36,
    roughness: 0.24,
    metalness: 0.9,
  });

  const whiteHotMat = new THREE.MeshBasicMaterial({
    color: 0xfff7ed,
  });

  const gravFieldMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    alphaMap: tex.gravFieldAlphaMap,
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const gravFieldInnerMat = new THREE.MeshBasicMaterial({
    color: 0xfb923c,
    alphaMap: tex.gravFieldAlphaMap,
    transparent: true,
    opacity: 0.24,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const beamCoreMat = new THREE.MeshBasicMaterial({
    color: 0xfffbeb,
    transparent: true,
    opacity: 0.96,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const beamSheathMat = new THREE.MeshBasicMaterial({
    color: 0xf97316,
    map: tex.beamFluxMap,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const beamHelixMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const beamMuzzleConeMat = new THREE.MeshBasicMaterial({
    color: 0xf97316,
    transparent: true,
    opacity: 0.54,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const beamFlareMat = new THREE.MeshBasicMaterial({
    color: 0xfdba74,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const root = new THREE.Group();
  root.name = `bunker_gravity_hound_${enemyId}`;

  // ── 1. Grounded Contact Shadow + Gravity-Well Distortion Field Sigil ──
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 4.1), mats.shadowDisc);
  shadow.rotation.x = -Math.PI * 0.5;
  shadow.position.y = 0.02;
  root.add(shadow);

  const gravFieldGroup = new THREE.Group();
  gravFieldGroup.position.y = 0.045;
  root.add(gravFieldGroup);

  const gravFieldOuter = new THREE.Mesh(new THREE.CircleGeometry(1.95, 48), gravFieldMat);
  gravFieldOuter.rotation.x = -Math.PI / 2;
  gravFieldGroup.add(gravFieldOuter);

  const gravFieldInner = new THREE.Mesh(new THREE.CircleGeometry(1.32, 40), gravFieldInnerMat);
  gravFieldInner.rotation.x = -Math.PI / 2;
  gravFieldInner.position.y = 0.008;
  gravFieldGroup.add(gravFieldInner);

  const orbitDebris: THREE.Mesh[] = [];
  const debrisGeo = new THREE.OctahedronGeometry(0.08, 0);
  for (let i = 0; i < 4; i++) {
    const d = new THREE.Mesh(debrisGeo, i % 2 === 0 ? armorMat : amberPlasmaMat);
    d.scale.set(1.2, 0.7, 1.5);
    gravFieldGroup.add(d);
    orbitDebris.push(d);
  }

  // ── 2. Articulated 2-Segment Predatory Chassis Spine (Base y = 1.18 -> paws hit y = 0.00!) ──
  const chassis = new THREE.Group();
  chassis.position.set(0, 1.18, 0);
  root.add(chassis);

  // 2A. Front Muscular Armored Thorax Pivot
  const frontThoraxPivot = new THREE.Group();
  frontThoraxPivot.position.set(0, 0.06, -0.34);
  chassis.add(frontThoraxPivot);

  // Sculpted muscular deep-chested siege-hound ribcage core (lofted along -Z -> +Z)
  const thoraxCoreGeo = createLoftedAnatomy(
    [
      { y: -0.78, rx: 0.44, rz: 0.36, squareness: 2.4, frontScale: 1.08 },
      { y: -0.44, rx: 0.65, rz: 0.5, squareness: 2.55, frontScale: 1.14 },
      { y: -0.05, rx: 0.67, rz: 0.48, squareness: 2.5, frontScale: 1.1 },
      { y: 0.36, rx: 0.52, rz: 0.39, squareness: 2.35 },
      { y: 0.66, rx: 0.34, rz: 0.28, squareness: 2.2 },
    ],
    24
  );
  thoraxCoreGeo.rotateX(Math.PI / 2);
  const thoraxCore = new THREE.Mesh(thoraxCoreGeo, underframeMat);
  thoraxCore.castShadow = true;
  thoraxCore.receiveShadow = true;
  frontThoraxPivot.add(thoraxCore);

  // 3 Overlapping Sculpted Brutalist Dorsal Rib-Carapace Armor Shells wrapping FLUSH over TOP & UPPER FLANKS!
  // NOTE: createCurvedPanelGeometry uses (x=cos*rx, z=sin*rz); after rotateX(+PI/2), y'=-z=-sin*rz,
  // so TOP (+Y) is theta in [-Math.PI, 0] (centered at -Math.PI/2)!
  const ribSlices: Array<[number, number, number, number, number, number]> = [
    [-0.66, -0.22, 0.54, 0.68, 0.44, 0.52],
    [-0.26, 0.18, 0.69, 0.64, 0.52, 0.49],
    [0.14, 0.52, 0.62, 0.48, 0.47, 0.38],
  ];
  for (let i = 0; i < ribSlices.length; i++) {
    const [z0, z1, rx0, rx1, rz0, rz1] = ribSlices[i];
    const shellGeo = createCurvedPanelGeometry(
      [
        { y: z0, rx: rx0, rz: rz0, thickness: 0.044 },
        { y: (z0 + z1) * 0.5, rx: (rx0 + rx1) * 0.515, rz: (rz0 + rz1) * 0.52, thickness: 0.048 },
        { y: z1, rx: rx1, rz: rz1, thickness: 0.042 },
      ],
      -Math.PI * 1.15,
      Math.PI * 0.15,
      24
    );
    shellGeo.rotateX(Math.PI / 2);
    const shell = new THREE.Mesh(shellGeo, armorMat);
    shell.castShadow = true;
    shell.receiveShadow = true;
    frontThoraxPivot.add(shell);

    // Chased bronze dorsal rib-seam trim accentuating each overlapping brutalist armor segment
    const seamGeo = createCurvedPanelGeometry(
      [
        { y: z1 - 0.032, rx: rx1 + 0.015, rz: rz1 + 0.014, thickness: 0.022 },
        { y: z1 + 0.012, rx: rx1 + 0.011, rz: rz1 + 0.01, thickness: 0.02 },
      ],
      -Math.PI * 1.12,
      Math.PI * 0.12,
      20
    );
    seamGeo.rotateX(Math.PI / 2);
    const seam = new THREE.Mesh(seamGeo, bronzeMat);
    frontThoraxPivot.add(seam);
  }

  // Swept Armored Shoulder Cowling Fins, Glowing Flank Rib-Vents & Dorsal Thruster Bells
  const shoulderFinGeo = buildShoulderCowlFinGeo();
  for (const side of [-1, 1] as const) {
    const fin = new THREE.Mesh(shoulderFinGeo, armorMat);
    fin.position.set(side * 0.62, 0.34, -0.34);
    fin.rotation.z = -side * 0.52;
    fin.castShadow = true;
    frontThoraxPivot.add(fin);

    // Flank molten thermal rib-vents tucked cleanly into the lower armor seam
    for (let r = 0; r < 3; r++) {
      const vent = new THREE.Mesh(
        createBeveledBox(0.036, 0.065, 0.19, 0.008),
        r === 1 ? amberPlasmaMat : crimsonEnergyMat
      );
      vent.position.set(side * (0.65 - r * 0.045), -0.06 - r * 0.025, -0.32 + r * 0.26);
      vent.rotation.z = side * 0.24;
      frontThoraxPivot.add(vent);
    }

    // Dual Angled Rear-Thorax Thruster Exhaust Bells (fire during Pounce & Bull-Gore Charge!)
    const thrusterBell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.082, 0.122, 0.24, 12),
      darkJointMat
    );
    thrusterBell.rotation.x = Math.PI / 2 - 0.26;
    thrusterBell.position.set(side * 0.54, 0.34, 0.28);
    frontThoraxPivot.add(thrusterBell);

    const thrusterRim = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.015, 6, 14), bronzeMat);
    thrusterRim.position.set(side * 0.54, 0.37, 0.39);
    thrusterRim.rotation.x = -0.26;
    frontThoraxPivot.add(thrusterRim);

    const thrusterGlow = new THREE.Mesh(new THREE.CircleGeometry(0.082, 12), amberPlasmaMat);
    thrusterGlow.position.set(side * 0.54, 0.37, 0.395);
    thrusterGlow.rotation.x = -0.26;
    frontThoraxPivot.add(thrusterGlow);
  }

  // Heavy Solid Layered Sternum Armored Ram-Keel & Throat Bulkhead (zero hollow chest gaps!)
  const sternumKeel = new THREE.Mesh(createBeveledBox(0.68, 0.44, 0.78, 0.035), armorMat);
  sternumKeel.position.set(0, -0.2, -0.44);
  sternumKeel.rotation.x = 0.24;
  sternumKeel.castShadow = true;
  frontThoraxPivot.add(sternumKeel);

  const bellyBellyplate = new THREE.Mesh(createBeveledBox(0.74, 0.24, 0.88, 0.03), darkJointMat);
  bellyBellyplate.position.set(0, -0.34, 0.02);
  frontThoraxPivot.add(bellyBellyplate);

  const sternumBronze = new THREE.Mesh(createBeveledBox(0.32, 0.32, 0.66, 0.022), bronzeMat);
  sternumBronze.position.set(0, -0.22, -0.52);
  sternumBronze.rotation.x = 0.28;
  frontThoraxPivot.add(sternumBronze);

  for (const gx of [-0.08, 0.08]) {
    const grill = new THREE.Mesh(createBeveledBox(0.044, 0.22, 0.06, 0.008), crimsonEnergyMat);
    grill.position.set(gx, -0.18, -0.84);
    frontThoraxPivot.add(grill);
  }

  // ── 3. WEAKPOINT: Hinged Clamshell DORSAL GRAV-SINGULARITY REACTOR (y = 0.62 on Thorax!) ──
  const dorsalReactorGroup = new THREE.Group();
  dorsalReactorGroup.position.set(0, 0.62, 0.04);
  frontThoraxPivot.add(dorsalReactorGroup);

  const reactorBaseRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.052, 10, 6),
    reactorRingMat
  );
  reactorBaseRing.rotation.x = Math.PI / 2;
  reactorBaseRing.position.y = -0.1;
  dorsalReactorGroup.add(reactorBaseRing);

  const reactorBasePlinth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.44, 0.14, 12),
    darkJointMat
  );
  reactorBasePlinth.position.y = -0.14;
  dorsalReactorGroup.add(reactorBasePlinth);

  for (let i = 0; i < 4; i++) {
    const pa = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const prong = new THREE.Mesh(createBeveledBox(0.058, 0.34, 0.068, 0.01), bronzeMat);
    prong.position.set(Math.cos(pa) * 0.34, 0.08, Math.sin(pa) * 0.34);
    prong.rotation.z = Math.cos(pa) * 0.35;
    prong.rotation.x = -Math.sin(pa) * 0.35;
    dorsalReactorGroup.add(prong);

    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.042, 0), crimsonEnergyMat);
    tip.position.set(Math.cos(pa) * 0.28, 0.24, Math.sin(pa) * 0.28);
    dorsalReactorGroup.add(tip);
  }

  const reactorGimbalOuter = new THREE.Mesh(
    new THREE.TorusGeometry(0.33, 0.026, 10, 28),
    reactorRingMat
  );
  reactorGimbalOuter.position.y = 0.14;
  dorsalReactorGroup.add(reactorGimbalOuter);

  const reactorGimbalInner = new THREE.Mesh(
    new THREE.TorusGeometry(0.245, 0.02, 8, 24),
    crimsonEnergyMat
  );
  reactorGimbalInner.position.y = 0.14;
  dorsalReactorGroup.add(reactorGimbalInner);

  // Sculpted Volcanic Dark-Crimson Faceted Singularity Core + Rotating Geodesic Containment Cage
  const reactorCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.185, 1), reactorCoreMat);
  reactorCore.position.y = 0.14;
  dorsalReactorGroup.add(reactorCore);

  const reactorCage = new THREE.Mesh(new THREE.IcosahedronGeometry(0.23, 0), reactorCageMat);
  reactorCage.position.y = 0.14;
  dorsalReactorGroup.add(reactorCage);

  const reactorWhiteCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.072, 0), whiteHotMat);
  reactorWhiteCore.position.y = 0.14;
  dorsalReactorGroup.add(reactorWhiteCore);

  // Twin Articulated Hinged Armored Dorsal Clamshell Blast-Shields
  const shutterGeo = buildDorsalShutterWingGeo();
  const shutterPivotL = new THREE.Group();
  shutterPivotL.position.set(-0.42, -0.06, 0.0);
  dorsalReactorGroup.add(shutterPivotL);
  const shutterMeshL = new THREE.Mesh(shutterGeo, armorMat);
  shutterMeshL.castShadow = true;
  shutterPivotL.add(shutterMeshL);
  const shutterTrimL = new THREE.Mesh(createBeveledBox(0.04, 0.05, 0.82, 0.008), bronzeMat);
  shutterTrimL.position.set(-0.02, 0.48, 0.02);
  shutterPivotL.add(shutterTrimL);

  const shutterPivotR = new THREE.Group();
  shutterPivotR.position.set(0.42, -0.06, 0.0);
  dorsalReactorGroup.add(shutterPivotR);
  const shutterMeshR = new THREE.Mesh(shutterGeo, armorMat);
  shutterMeshR.scale.x = -1;
  shutterMeshR.castShadow = true;
  shutterPivotR.add(shutterMeshR);
  const shutterTrimR = new THREE.Mesh(createBeveledBox(0.04, 0.05, 0.82, 0.008), bronzeMat);
  shutterTrimR.position.set(0.02, 0.48, 0.02);
  shutterPivotR.add(shutterTrimR);

  const weakpointCollider = makeHitbox(
    new THREE.SphereGeometry(0.54, 12, 10),
    mats.hitboxInvisible,
    enemyId,
    'weakpoint',
    [0, 0.16, 0]
  );
  dorsalReactorGroup.add(weakpointCollider);

  // ── 4. Twin Gimbal-Mounted Shoulder Gravity-Mine Micro-Mortar Pods ──
  const buildShoulderPod = (side: -1 | 1) => {
    const trunnion = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.075, 0.18, 10),
      bronzeMat
    );
    trunnion.rotation.z = Math.PI / 2;
    trunnion.position.set(side * 0.62, 0.44, -0.44);
    frontThoraxPivot.add(trunnion);

    const pivot = new THREE.Group();
    pivot.position.set(side * 0.72, 0.44, -0.44);
    frontThoraxPivot.add(pivot);

    const podBody = new THREE.Mesh(createBeveledBox(0.22, 0.2, 0.36, 0.022), armorMat);
    podBody.castShadow = true;
    pivot.add(podBody);

    const podHood = new THREE.Mesh(createBeveledBox(0.24, 0.055, 0.3, 0.012), bronzeMat);
    podHood.position.y = 0.095;
    pivot.add(podHood);

    for (const bx of [-0.052, 0.052]) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.046, 0.18, 10), darkJointMat);
      tube.rotation.x = Math.PI / 2;
      tube.position.set(bx, 0.015, -0.2);
      pivot.add(tube);

      const bore = new THREE.Mesh(new THREE.CircleGeometry(0.03, 10), amberPlasmaMat);
      bore.position.set(bx, 0.015, -0.292);
      bore.rotation.y = Math.PI;
      pivot.add(bore);
    }

    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0.04, -0.32);
    pivot.add(muzzle);

    return { pivot, muzzle };
  };
  const shoulderPodL = buildShoulderPod(-1);
  const shoulderPodR = buildShoulderPod(1);

  // ── 5. Articulated Rear Pelvis, Tail-Cowling Fairing & 4-Segment Whip-Blade Grav-Tail ──
  const rearPelvisPivot = new THREE.Group();
  rearPelvisPivot.position.set(0, 0.04, 0.56);
  chassis.add(rearPelvisPivot);

  const pelvisCoreGeo = createLoftedAnatomy(
    [
      { y: -0.44, rx: 0.38, rz: 0.32, squareness: 2.25 },
      { y: 0.02, rx: 0.51, rz: 0.39, squareness: 2.4 },
      { y: 0.44, rx: 0.43, rz: 0.33, squareness: 2.35 },
      { y: 0.68, rx: 0.22, rz: 0.18, squareness: 2.1 },
      { y: 0.78, rx: 0.08, rz: 0.07, squareness: 2.0 },
    ],
    20
  );
  pelvisCoreGeo.rotateX(Math.PI / 2);
  const pelvisCore = new THREE.Mesh(pelvisCoreGeo, underframeMat);
  pelvisCore.castShadow = true;
  rearPelvisPivot.add(pelvisCore);

  // Dorsal-wrapped Rear Pelvis Armored Carapace Plate (wraps flush over TOP & UPPER HAUNCHES!)
  const pelvisPlateGeo = createCurvedPanelGeometry(
    [
      { y: -0.34, rx: 0.45, rz: 0.36, thickness: 0.038 },
      { y: 0.12, rx: 0.535, rz: 0.415, thickness: 0.042 },
      { y: 0.54, rx: 0.4, rz: 0.315, thickness: 0.036 },
    ],
    -Math.PI * 1.14,
    Math.PI * 0.14,
    20
  );
  pelvisPlateGeo.rotateX(Math.PI / 2);
  const pelvisPlate = new THREE.Mesh(pelvisPlateGeo, armorMat);
  pelvisPlate.castShadow = true;
  rearPelvisPivot.add(pelvisPlate);

  // Solid Armored Tail-Socket Housing & Chased Bronze Collar sealing the rear rump 100%!
  const tailHousing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.24, 0.24, 12),
    darkJointMat
  );
  tailHousing.rotation.x = Math.PI / 2;
  tailHousing.position.set(0, 0.14, 0.62);
  rearPelvisPivot.add(tailHousing);

  const tailSocketRing = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.026, 8, 16), bronzeMat);
  tailSocketRing.position.set(0, 0.16, 0.7);
  rearPelvisPivot.add(tailSocketRing);

  for (let i = 0; i < 3; i++) {
    const vert = new THREE.Mesh(
      createBeveledBox(0.32 - i * 0.04, 0.12, 0.16, 0.016),
      i === 1 ? bronzeMat : armorMat
    );
    vert.position.set(0, 0.39 - i * 0.025, -0.34 + i * 0.22);
    rearPelvisPivot.add(vert);
  }
  for (const side of [-1, 1] as const) {
    const cable = new THREE.Mesh(
      createStrapTube(
        [
          new THREE.Vector3(side * 0.34, 0.06, -0.58),
          new THREE.Vector3(side * 0.26, -0.1, -0.22),
          new THREE.Vector3(side * 0.32, 0.02, 0.18),
        ],
        0.036,
        1,
        12
      ),
      bronzeMat
    );
    rearPelvisPivot.add(cable);
  }

  // 4-Segment Articulated Whip-Blade Grav-Tail extending backward (+Z) with sculpted swept dorsal spines!
  const tailFinGeo = buildTailDorsalFinGeo();
  const tailSegments: THREE.Group[] = [];
  let tailParent: THREE.Object3D = rearPelvisPivot;
  const tailSegLengths = [0.42, 0.4, 0.38, 0.36];
  for (let i = 0; i < tailSegLengths.length; i++) {
    const segLen = tailSegLengths[i];
    const segPivot = new THREE.Group();
    segPivot.position.set(0, i === 0 ? 0.17 : 0, i === 0 ? 0.68 : tailSegLengths[i - 1] * 0.92);
    tailParent.add(segPivot);

    const rTop = 0.125 - i * 0.022;
    const rBot = 0.1 - i * 0.02;
    const segGeo = createLoftedAnatomy(
      [
        { y: 0, rx: rTop, rz: rTop * 0.9, squareness: 2.3 },
        { y: segLen, rx: rBot, rz: rBot * 0.9, squareness: 2.3 },
      ],
      12
    );
    segGeo.rotateX(Math.PI / 2);
    const segMesh = new THREE.Mesh(segGeo, i % 2 === 0 ? armorMat : darkJointMat);
    segMesh.castShadow = true;
    segPivot.add(segMesh);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(rTop * 0.96, 0.016, 6, 14), bronzeMat);
    collar.position.z = segLen * 0.48;
    segPivot.add(collar);

    const dorsalFin = new THREE.Mesh(tailFinGeo, i === 3 ? crimsonEnergyMat : bronzeMat);
    const finScale = 1 - i * 0.14;
    dorsalFin.scale.set(finScale, finScale, finScale);
    dorsalFin.position.set(0, rTop * 0.82, segLen * 0.38);
    segPivot.add(dorsalFin);

    tailSegments.push(segPivot);
    tailParent = segPivot;
  }

  const tailBladeGeo = buildTailHarpoonBladeGeo();
  const tailBlade = new THREE.Mesh(tailBladeGeo, armorMat);
  tailBlade.position.set(0, 0, 0.32);
  tailBlade.castShadow = true;
  tailParent.add(tailBlade);

  const tailPlasmaEdge = new THREE.Mesh(tailBladeGeo, crimsonEnergyMat);
  tailPlasmaEdge.position.set(0, 0, 0.34);
  tailPlasmaEdge.scale.set(0.62, 1.12, 1.04);
  tailParent.add(tailPlasmaEdge);

  const tailTipAnchor = new THREE.Object3D();
  tailTipAnchor.position.set(0, 0, 0.94);
  tailParent.add(tailTipAnchor);

  // ── 6. Terrifying Sculpted Cyber-Cerberus Siege Head, V-Brow Hood & Sleek Sabre Plasma-Tusks ──
  const neckPivot = new THREE.Group();
  neckPivot.position.set(0, 0.24, -0.76);
  frontThoraxPivot.add(neckPivot);

  const neckGeo = createLoftedAnatomy(
    [
      { y: -0.46, rx: 0.29, rz: 0.27, squareness: 2.35 },
      { y: -0.22, rx: 0.35, rz: 0.33, squareness: 2.4 },
      { y: 0.1, rx: 0.42, rz: 0.37, squareness: 2.45 },
    ],
    18
  );
  neckGeo.rotateX(Math.PI / 2);
  const neckMesh = new THREE.Mesh(neckGeo, underframeMat);
  neckMesh.castShadow = true;
  neckPivot.add(neckMesh);

  // Dorsal-wrapped Contoured Armored Neck Scute Collars (hugging TOP & SIDES of neck, ZERO hollow underside!)
  for (let i = 0; i < 2; i++) {
    const collarGeo = createCurvedPanelGeometry(
      [
        { y: 0.04 - i * 0.2, rx: 0.42 - i * 0.035, rz: 0.37 - i * 0.03, thickness: 0.032 },
        { y: -0.14 - i * 0.2, rx: 0.37 - i * 0.035, rz: 0.34 - i * 0.03, thickness: 0.028 },
      ],
      -Math.PI * 1.1,
      Math.PI * 0.1,
      16
    );
    collarGeo.rotateX(Math.PI / 2);
    const collarMesh = new THREE.Mesh(collarGeo, i === 0 ? armorMat : bronzeMat);
    collarMesh.castShadow = true;
    neckPivot.add(collarMesh);
  }
  // Solid armored under-throat gorget sealing the lower cervical spine cleanly!
  const throatGorget = new THREE.Mesh(createBeveledBox(0.38, 0.14, 0.44, 0.022), darkJointMat);
  throatGorget.position.set(0, -0.26, -0.18);
  throatGorget.rotation.x = 0.18;
  neckPivot.add(throatGorget);

  for (const side of [-1, 1] as const) {
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.042, 0.44, 10), bronzeMat);
    piston.rotation.x = Math.PI / 2 - 0.14;
    piston.position.set(side * 0.34, 0.02, -0.18);
    neckPivot.add(piston);
  }

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.04, -0.42);
  neckPivot.add(headPivot);

  // Sculpted Angular Predatory Cyber-Wolf Cranium (tapered nose tip -> ZERO flat chrome pipe cap!)
  const skullGeo = createLoftedAnatomy(
    [
      { y: -0.78, rx: 0.055, rz: 0.035, squareness: 2.3 },
      { y: -0.66, rx: 0.17, rz: 0.12, squareness: 2.5, frontScale: 1.04 },
      { y: -0.44, rx: 0.31, rz: 0.21, squareness: 2.5, frontScale: 1.12 },
      { y: -0.18, rx: 0.41, rz: 0.28, squareness: 2.55, frontScale: 1.15 },
      { y: 0.1, rx: 0.35, rz: 0.25, squareness: 2.35 },
    ],
    20
  );
  skullGeo.rotateX(Math.PI / 2);
  const skullMesh = new THREE.Mesh(skullGeo, armorMat);
  skullMesh.position.y = 0.08;
  skullMesh.castShadow = true;
  headPivot.add(skullMesh);

  // Sculpted Dark Obsidian Cyber-Wolf Chisel Nose-Prow + Recessed Nostril Intake Slits
  const snoutProw = new THREE.Mesh(buildSnoutProwGeo(), darkJointMat);
  snoutProw.position.set(0, 0.1, -0.56);
  snoutProw.castShadow = true;
  headPivot.add(snoutProw);

  for (const side of [-1, 1] as const) {
    const nostril = new THREE.Mesh(createBeveledBox(0.032, 0.026, 0.09, 0.004), crimsonEnergyMat);
    nostril.position.set(side * 0.11, 0.1, -0.72);
    nostril.rotation.y = -side * 0.34;
    headPivot.add(nostril);
  }

  // Sculpted Swept V-Brow Visor Hood & Tapered Snout Armor Crest
  const browHood = new THREE.Mesh(buildPredatorBrowHoodGeo(), armorMat);
  browHood.position.set(0, 0.29, -0.24);
  browHood.rotation.x = 0.14;
  browHood.castShadow = true;
  headPivot.add(browHood);

  const snoutCrest = new THREE.Mesh(buildSnoutCrestGeo(), bronzeMat);
  snoutCrest.position.set(0, 0.32, -0.2);
  snoutCrest.castShadow = true;
  headPivot.add(snoutCrest);

  // Recessed 3-Slit Fierce Crimson-Amber Predator Optical Array tucked cleanly beneath V-Brow!
  const centerOptic = new THREE.Mesh(new THREE.OctahedronGeometry(0.044, 0), amberPlasmaMat);
  centerOptic.scale.set(1.15, 0.46, 0.65);
  centerOptic.position.set(0, 0.175, -0.64);
  headPivot.add(centerOptic);

  const earGeo = buildPredatorEarCrestGeo();
  const cheekBladeGeo = buildCheekBladeGeo();
  for (const side of [-1, 1] as const) {
    // Recessed dark armored eye socket bezel + glowing crimson predator visor slit flush inside cheek
    const socket = new THREE.Mesh(createBeveledBox(0.18, 0.068, 0.075, 0.01), darkJointMat);
    socket.position.set(side * 0.22, 0.185, -0.45);
    socket.rotation.y = -side * 0.48;
    socket.rotation.z = side * 0.2;
    headPivot.add(socket);

    const eyeSlit = new THREE.Mesh(createBeveledBox(0.15, 0.036, 0.035, 0.005), crimsonEnergyMat);
    eyeSlit.position.set(side * 0.232, 0.185, -0.475);
    eyeSlit.rotation.y = -side * 0.48;
    eyeSlit.rotation.z = side * 0.2;
    headPivot.add(eyeSlit);

    const eyeCore = new THREE.Mesh(createBeveledBox(0.09, 0.014, 0.025, 0.002), whiteHotMat);
    eyeCore.position.set(side * 0.238, 0.185, -0.488);
    eyeCore.rotation.y = -side * 0.48;
    eyeCore.rotation.z = side * 0.2;
    headPivot.add(eyeCore);

    // Sculpted Swept Zygomatic Cheek-Blade framing each Sabre-Tusk socket
    const cheekBlade = new THREE.Mesh(cheekBladeGeo, bronzeMat);
    cheekBlade.position.set(side * 0.34, 0.01, -0.26);
    cheekBlade.rotation.y = -side * 0.22;
    cheekBlade.rotation.z = side * 0.16;
    cheekBlade.castShadow = true;
    headPivot.add(cheekBlade);

    // Swept Armored Predator Ear/Sensor Crest Fins pinned back aggressively with flush inner bronze rib
    const ear = new THREE.Mesh(earGeo, armorMat);
    ear.position.set(side * 0.32, 0.25, -0.06);
    ear.rotation.z = -side * 0.32;
    ear.rotation.y = side * 0.18;
    ear.castShadow = true;
    headPivot.add(ear);

    const earInnerRib = new THREE.Mesh(earGeo, bronzeMat);
    earInnerRib.position.set(side * 0.315, 0.255, -0.055);
    earInnerRib.rotation.z = -side * 0.32;
    earInnerRib.rotation.y = side * 0.18;
    earInnerRib.scale.set(0.45, 0.82, 0.86);
    headPivot.add(earInnerRib);

    // Upper Jagged Metallic Predator Fangs
    for (let f = 0; f < 3; f++) {
      const fang = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.12 - f * 0.016, 4), steelFangMat);
      fang.rotation.x = Math.PI;
      fang.position.set(side * (0.155 + f * 0.044), -0.05, -0.6 + f * 0.13);
      headPivot.add(fang);
    }
  }

  // Blazing Molten Throat Singularity Igniter Core (revealed when jaw roars wide open!)
  const throatIgniter = new THREE.Mesh(new THREE.OctahedronGeometry(0.145, 1), amberPlasmaMat);
  throatIgniter.position.set(0, -0.06, -0.34);
  headPivot.add(throatIgniter);
  const throatWhite = new THREE.Mesh(new THREE.OctahedronGeometry(0.072, 0), whiteHotMat);
  throatWhite.position.set(0, -0.06, -0.36);
  headPivot.add(throatWhite);

  // Articulated Hinged Lower Mechanical Jaw (tapered tip + sculpted chin-prow -> ZERO chrome cap!)
  const lowerJawPivot = new THREE.Group();
  lowerJawPivot.position.set(0, -0.1, -0.1);
  headPivot.add(lowerJawPivot);

  const jawGeo = createLoftedAnatomy(
    [
      { y: -0.64, rx: 0.048, rz: 0.026, squareness: 2.3 },
      { y: -0.52, rx: 0.14, rz: 0.072, squareness: 2.5 },
      { y: -0.3, rx: 0.25, rz: 0.115, squareness: 2.45 },
      { y: 0.02, rx: 0.31, rz: 0.125, squareness: 2.35 },
    ],
    16
  );
  jawGeo.rotateX(Math.PI / 2);
  const jawMesh = new THREE.Mesh(jawGeo, armorMat);
  jawMesh.position.y = -0.05;
  jawMesh.castShadow = true;
  lowerJawPivot.add(jawMesh);

  const chinProw = new THREE.Mesh(buildChinProwGeo(), darkJointMat);
  chinProw.position.set(0, -0.06, -0.45);
  chinProw.castShadow = true;
  lowerJawPivot.add(chinProw);

  const chinBronzeRidge = new THREE.Mesh(createBeveledBox(0.12, 0.04, 0.24, 0.008), bronzeMat);
  chinBronzeRidge.position.set(0, -0.105, -0.42);
  lowerJawPivot.add(chinBronzeRidge);

  for (const side of [-1, 1] as const) {
    for (let f = 0; f < 3; f++) {
      const fang = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.11 - f * 0.015, 4), steelFangMat);
      fang.position.set(side * (0.135 + f * 0.04), 0.05, -0.48 + f * 0.12);
      lowerJawPivot.add(fang);
    }
  }

  // Twin Sleek Sabre-Curved Plasma-Tusks (Armored dark-metal spine + glowing crimson-orange razor plasma belly edge!)
  const tuskSpineGeo = buildCurvedTuskSpineGeo();
  const tuskEdgeGeo = buildCurvedTuskEdgeGeo();
  const tuskTipAnchors: Record<-1 | 1, THREE.Object3D> = {
    [-1]: new THREE.Object3D(),
    [1]: new THREE.Object3D(),
  };
  for (const side of [-1, 1] as const) {
    const tuskSocket = new THREE.Group();
    tuskSocket.position.set(side * 0.34, -0.04, -0.36);
    tuskSocket.rotation.y = -side * 0.16;
    headPivot.add(tuskSocket);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.078, 0.14, 10), bronzeMat);
    collar.rotation.x = Math.PI / 2;
    tuskSocket.add(collar);

    const tuskSpine = new THREE.Mesh(tuskSpineGeo, darkJointMat);
    tuskSpine.castShadow = true;
    tuskSocket.add(tuskSpine);

    const tuskPlasma = new THREE.Mesh(tuskEdgeGeo, amberPlasmaMat);
    tuskSocket.add(tuskPlasma);

    const tip = tuskTipAnchors[side];
    tip.position.set(0, 0.22, -0.6);
    tuskSocket.add(tip);
  }

  // Volumetric Sweeping Molten Singularity Maw Beam + Convergence Muzzle Cone
  const mawBeamRoot = new THREE.Group();
  mawBeamRoot.position.set(0, -0.11, -0.7);
  mawBeamRoot.visible = false;
  headPivot.add(mawBeamRoot);

  const mawIrisGroup = new THREE.Group();
  mawBeamRoot.add(mawIrisGroup);
  const mawIrisRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.018, 8, 28), amberPlasmaMat);
  mawIrisGroup.add(mawIrisRing);
  const mawIrisInner = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.014, 8, 20), crimsonEnergyMat);
  mawIrisGroup.add(mawIrisInner);

  const beamCoreGeo = new THREE.CylinderGeometry(0.052, 0.052, 1, 12);
  beamCoreGeo.rotateX(Math.PI / 2);
  beamCoreGeo.translate(0, 0, -0.5);
  const mawBeamCore = new THREE.Mesh(beamCoreGeo, beamCoreMat);
  mawBeamRoot.add(mawBeamCore);

  const beamSheathGeo = new THREE.CylinderGeometry(0.165, 0.205, 1, 16, 1, true);
  beamSheathGeo.rotateX(Math.PI / 2);
  beamSheathGeo.translate(0, 0, -0.5);
  const mawBeamSheath = new THREE.Mesh(beamSheathGeo, beamSheathMat);
  mawBeamRoot.add(mawBeamSheath);

  // Luminous Muzzle Convergence Flare Cone right at the roaring jaws!
  const muzzleConeGeo = new THREE.CylinderGeometry(0.38, 0.06, 0.64, 16, 1, true);
  muzzleConeGeo.rotateX(Math.PI / 2);
  muzzleConeGeo.translate(0, 0, -0.32);
  const mawMuzzleCone = new THREE.Mesh(muzzleConeGeo, beamMuzzleConeMat);
  mawBeamRoot.add(mawMuzzleCone);

  const mawBeamHelix = new THREE.Group();
  mawBeamRoot.add(mawBeamHelix);
  for (let strand = 0; strand < 2; strand++) {
    const pts: THREE.Vector3[] = [];
    for (let s = 0; s <= 32; s++) {
      const frac = s / 32;
      const ang = frac * Math.PI * 6 + strand * Math.PI;
      const r = 0.22 + Math.sin(frac * Math.PI) * 0.04;
      pts.push(new THREE.Vector3(Math.cos(ang) * r, Math.sin(ang) * r, -frac));
    }
    const hGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.015, 5, false);
    mawBeamHelix.add(new THREE.Mesh(hGeo, beamHelixMat));
  }

  const mawMuzzleFlare = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 1), beamFlareMat);
  mawMuzzleFlare.position.set(0, 0, -0.05);
  mawBeamRoot.add(mawMuzzleFlare);

  const mawImpactFlare = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), beamFlareMat);
  mawBeamRoot.add(mawImpactFlare);

  const muzzleAnchor = new THREE.Object3D();
  muzzleAnchor.position.set(0, -0.1, -0.78);
  headPivot.add(muzzleAnchor);

  // ── 7. 4 Mathematically Grounded 3-Joint Digitigrade Hydraulic Siege Legs + Articulated Pauldrons ──
  const clawGeo = buildClawTalonGeo();
  const frontPawHoodGeo = buildPawHoodGeo(0.32);
  const rearPawHoodGeo = buildPawHoodGeo(0.27);

  const buildSiegePaw = (heavyFront: boolean) => {
    const pawGroup = new THREE.Group();
    const pawW = heavyFront ? 0.34 : 0.29;
    const pawHood = new THREE.Mesh(heavyFront ? frontPawHoodGeo : rearPawHoodGeo, armorMat);
    pawHood.position.set(0, -0.012, -0.04);
    pawHood.castShadow = true;
    pawGroup.add(pawHood);

    const knuckleBridge = new THREE.Mesh(
      createBeveledBox(pawW * 0.86, 0.036, 0.09, 0.008),
      bronzeMat
    );
    knuckleBridge.position.set(0, 0.02, -0.14);
    pawGroup.add(knuckleBridge);

    const gravPad = new THREE.Mesh(
      createBeveledBox(pawW * 0.72, 0.028, 0.24, 0.006),
      crimsonEnergyMat
    );
    gravPad.position.set(0, -0.072, -0.04);
    pawGroup.add(gravPad);

    for (let c = -1; c <= 1; c++) {
      const claw = new THREE.Mesh(clawGeo, steelFangMat);
      claw.position.set(c * (heavyFront ? 0.105 : 0.088), -0.035, -0.18);
      claw.rotation.y = -c * 0.16;
      claw.castShadow = true;
      pawGroup.add(claw);
    }

    // Rear armored heel-spur anchor
    const heelSpur = new THREE.Mesh(clawGeo, darkJointMat);
    heelSpur.scale.set(0.7, 0.72, 0.65);
    heelSpur.rotation.y = Math.PI;
    heelSpur.position.set(0, -0.025, 0.12);
    pawGroup.add(heelSpur);

    return pawGroup;
  };

  // Front Forelegs + Sculpted Articulated Shoulder Pauldron Armor Shields & Contoured Shin Greaves!
  const buildFrontLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.78, -0.14, -0.4);
    frontThoraxPivot.add(hip);

    const shoulderDrum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.26, 14),
      darkJointMat
    );
    shoulderDrum.rotation.z = Math.PI / 2;
    hip.add(shoulderDrum);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.29, 10), bronzeMat);
    cap.rotation.z = Math.PI / 2;
    hip.add(cap);

    // Sculpted bronze-rimmed Armored Shoulder Pauldron Shield moving with the foreleg!
    const pauldronGeo = createCurvedPanelGeometry(
      [
        { y: -0.22, rx: 0.24, rz: 0.27, thickness: 0.034 },
        { y: 0.04, rx: 0.25, rz: 0.28, thickness: 0.036 },
        { y: 0.18, rx: 0.17, rz: 0.21, thickness: 0.03 },
      ],
      side === 1 ? -Math.PI * 0.42 : Math.PI * 0.58,
      side === 1 ? Math.PI * 0.42 : Math.PI * 1.42,
      12
    );
    const pauldron = new THREE.Mesh(pauldronGeo, armorMat);
    pauldron.castShadow = true;
    hip.add(pauldron);

    const pauldronLip = new THREE.Mesh(
      createCurvedPanelGeometry(
        [
          { y: -0.24, rx: 0.252, rz: 0.282, thickness: 0.02 },
          { y: -0.19, rx: 0.248, rz: 0.278, thickness: 0.02 },
        ],
        side === 1 ? -Math.PI * 0.42 : Math.PI * 0.58,
        side === 1 ? Math.PI * 0.42 : Math.PI * 1.42,
        12
      ),
      bronzeMat
    );
    hip.add(pauldronLip);

    const upperGeo = createLoftedAnatomy(
      [
        { y: -0.56, rx: 0.14, rz: 0.16, squareness: 2.35 },
        { y: -0.28, rx: 0.19, rz: 0.22, squareness: 2.45 },
        { y: 0.04, rx: 0.21, rz: 0.24, squareness: 2.4 },
      ],
      16
    );
    const upperMesh = new THREE.Mesh(upperGeo, armorMat);
    upperMesh.castShadow = true;
    hip.add(upperMesh);

    const damper = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.046, 0.46, 10), bronzeMat);
    damper.position.set(side * 0.05, -0.28, 0.16);
    hip.add(damper);

    const knee = new THREE.Group();
    knee.position.set(0, -0.56, 0);
    hip.add(knee);

    const elbowJoint = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.22, 12), bronzeMat);
    elbowJoint.rotation.z = Math.PI / 2;
    knee.add(elbowJoint);

    const lowerGeo = createLoftedAnatomy(
      [
        { y: -0.48, rx: 0.1, rz: 0.12, squareness: 2.4 },
        { y: -0.22, rx: 0.135, rz: 0.155, squareness: 2.45 },
        { y: 0.02, rx: 0.145, rz: 0.165, squareness: 2.4 },
      ],
      14
    );
    const lowerMesh = new THREE.Mesh(lowerGeo, armorMat);
    lowerMesh.castShadow = true;
    knee.add(lowerMesh);

    // Sculpted curved front Armored Shin Greave + sleek bronze keel ridge (replaces boxy slab!)
    const greaveGeo = createCurvedPanelGeometry(
      [
        { y: -0.42, rx: 0.125, rz: 0.145, thickness: 0.026 },
        { y: -0.2, rx: 0.155, rz: 0.18, thickness: 0.03 },
        { y: -0.02, rx: 0.15, rz: 0.175, thickness: 0.026 },
      ],
      -Math.PI * 0.85,
      -Math.PI * 0.15,
      10
    );
    const shinGreave = new THREE.Mesh(greaveGeo, armorMat);
    shinGreave.castShadow = true;
    knee.add(shinGreave);

    const shinKeel = new THREE.Mesh(createBeveledBox(0.045, 0.34, 0.048, 0.008), bronzeMat);
    shinKeel.position.set(0, -0.21, -0.175);
    knee.add(shinKeel);

    const ankle = new THREE.Group();
    ankle.position.set(0, -0.48, 0);
    knee.add(ankle);

    const paw = buildSiegePaw(true);
    ankle.add(paw);

    return { hip, knee, ankle };
  };

  // Rear Hindlegs + Sculpted Articulated Haunch Hip Shields!
  const buildRearLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.7, -0.12, 0.28);
    rearPelvisPivot.add(hip);

    const hipDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.22, 14), darkJointMat);
    hipDrum.rotation.z = Math.PI / 2;
    hip.add(hipDrum);
    const hipCap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.25, 10), bronzeMat);
    hipCap.rotation.z = Math.PI / 2;
    hip.add(hipCap);

    // Sculpted bronze-rimmed Armored Haunch Hip Shield hugging rear hip socket flush!
    const haunchShieldGeo = createCurvedPanelGeometry(
      [
        { y: -0.2, rx: 0.215, rz: 0.26, thickness: 0.03 },
        { y: 0.02, rx: 0.222, rz: 0.268, thickness: 0.032 },
        { y: 0.14, rx: 0.165, rz: 0.205, thickness: 0.026 },
      ],
      side === 1 ? -Math.PI * 0.38 : Math.PI * 0.62,
      side === 1 ? Math.PI * 0.38 : Math.PI * 1.38,
      10
    );
    const haunchShield = new THREE.Mesh(haunchShieldGeo, armorMat);
    haunchShield.castShadow = true;
    hip.add(haunchShield);

    const haunchLip = new THREE.Mesh(
      createCurvedPanelGeometry(
        [
          { y: -0.22, rx: 0.225, rz: 0.27, thickness: 0.018 },
          { y: -0.17, rx: 0.222, rz: 0.266, thickness: 0.018 },
        ],
        side === 1 ? -Math.PI * 0.38 : Math.PI * 0.62,
        side === 1 ? Math.PI * 0.38 : Math.PI * 1.38,
        10
      ),
      bronzeMat
    );
    hip.add(haunchLip);

    const thighGeo = createLoftedAnatomy(
      [
        { y: -0.52, rx: 0.135, rz: 0.16, squareness: 2.35 },
        { y: -0.24, rx: 0.2, rz: 0.25, squareness: 2.45 },
        { y: 0.06, rx: 0.21, rz: 0.26, squareness: 2.4 },
      ],
      16
    );
    const thighMesh = new THREE.Mesh(thighGeo, armorMat);
    thighMesh.castShadow = true;
    hip.add(thighMesh);

    const knee = new THREE.Group();
    knee.position.set(0, -0.52, 0);
    hip.add(knee);

    const kneeJoint = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 12), bronzeMat);
    kneeJoint.rotation.z = Math.PI / 2;
    knee.add(kneeJoint);

    const tibiaGeo = createLoftedAnatomy(
      [
        { y: -0.44, rx: 0.095, rz: 0.11, squareness: 2.3 },
        { y: -0.2, rx: 0.125, rz: 0.145, squareness: 2.4 },
        { y: 0.02, rx: 0.13, rz: 0.15, squareness: 2.35 },
      ],
      14
    );
    const tibiaMesh = new THREE.Mesh(tibiaGeo, darkJointMat);
    tibiaMesh.castShadow = true;
    knee.add(tibiaMesh);

    const springPiston = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.04, 0.36, 8), bronzeMat);
    springPiston.position.set(side * 0.04, -0.2, -0.11);
    knee.add(springPiston);

    const hock = new THREE.Group();
    hock.position.set(0, -0.44, 0);
    knee.add(hock);

    const hockJoint = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.18, 10), bronzeMat);
    hockJoint.rotation.z = Math.PI / 2;
    hock.add(hockJoint);

    const metaMesh = new THREE.Mesh(createBeveledBox(0.16, 0.24, 0.15, 0.016), armorMat);
    metaMesh.position.y = -0.11;
    metaMesh.castShadow = true;
    hock.add(metaMesh);

    const ankle = new THREE.Group();
    ankle.position.set(0, -0.22, 0);
    hock.add(ankle);

    const paw = buildSiegePaw(false);
    ankle.add(paw);

    return { hip, knee, hock, ankle };
  };

  const legFL = buildFrontLeg(-1);
  const legFR = buildFrontLeg(1);
  const legRL = buildRearLeg(-1);
  const legRR = buildRearLeg(1);

  // ── 8. Dedicated Invisible Raycast Hitboxes & Hit-Zone Tagging ──
  const bodyHit = makeHitbox(
    new THREE.BoxGeometry(1.64, 1.32, 2.7),
    mats.hitboxInvisible,
    enemyId,
    'body',
    [0, 0.04, 0.06]
  );
  const headHit = makeHitbox(
    new THREE.BoxGeometry(1.04, 0.88, 1.12),
    mats.hitboxInvisible,
    enemyId,
    'head',
    [0, 0.04, -0.36]
  );
  chassis.add(bodyHit);
  headPivot.add(headHit);

  tagHitZone(root, enemyId, 'body');
  tagHitZone(headPivot, enemyId, 'head');
  tagHitZone(dorsalReactorGroup, enemyId, 'weakpoint');
  tagHitZone(shutterPivotL, enemyId, 'body');
  tagHitZone(shutterPivotR, enemyId, 'body');
  bodyHit.material = mats.hitboxInvisible;
  headHit.material = mats.hitboxInvisible;
  weakpointCollider.material = mats.hitboxInvisible;

  const hitboxes: THREE.Mesh[] = [bodyHit, headHit, weakpointCollider];
  const weakpointMaterials: THREE.MeshStandardMaterial[] = [reactorCoreMat, reactorRingMat];
  const armorFlashMaterials: THREE.MeshStandardMaterial[] = [armorMat, bronzeMat, underframeMat];

  // ── Runtime Visual State & Smooth Blends (zero per-frame allocations!) ──
  let stance: GravityHoundStance = 'stalk';
  let phase2Aura = 0;
  let jawOpenOverride = 0;
  let shutterOpenOverride = 0;
  let gravFieldIntensity = 0;
  let tuskCharge = 0;
  let tailSpinAngle = 0;
  let mortarPitch = 0;

  let beamActive = false;
  let beamLength = 0;
  let beamCharge = 0;
  let beamFiring = false;
  let beamSweepYawOffset = 0;

  let smoothCrouch = 0;
  let smoothLeap = 0;
  let smoothPulse = 0;
  let smoothTailWhip = 0;
  let smoothCharge = 0;
  let smoothBeam = 0;
  let smoothMortar = 0;
  let smoothP2 = 0;
  let smoothShutter = 0.22;
  let gaitPhase = 0;

  return {
    root,
    hitboxes,
    weakpointMaterials,
    armorFlashMaterials,
    setMawBeamTelegraph: (active, length, chargeRatio, firing = false, sweepYawOffset = 0) => {
      beamActive = active;
      beamLength = Math.max(0.5, length);
      beamCharge = Math.max(0, Math.min(1.5, chargeRatio));
      beamFiring = firing;
      beamSweepYawOffset = sweepYawOffset;
    },
    setHoundVisualState: (st: GravityHoundVisualState) => {
      if (st.stance !== undefined) stance = st.stance;
      if (st.phase2Aura !== undefined) phase2Aura = st.phase2Aura;
      if (st.jawOpen !== undefined) jawOpenOverride = st.jawOpen;
      if (st.shutterOpen !== undefined) shutterOpenOverride = st.shutterOpen;
      if (st.gravFieldIntensity !== undefined) gravFieldIntensity = st.gravFieldIntensity;
      if (st.tuskCharge !== undefined) tuskCharge = st.tuskCharge;
      if (st.tailSpinAngle !== undefined) tailSpinAngle = st.tailSpinAngle;
      if (st.mortarPitch !== undefined) mortarPitch = st.mortarPitch;
    },
    getTuskTipWorldPos: (side, out) => tuskTipAnchors[side].getWorldPosition(out),
    getShoulderPodWorldPos: (side, out) =>
      (side === -1 ? shoulderPodL : shoulderPodR).muzzle.getWorldPosition(out),
    getTailTipWorldPos: (out) => tailTipAnchor.getWorldPosition(out),
    getMuzzleWorldPos: (out) => muzzleAnchor.getWorldPosition(out),
    getWeakpointWorldPos: (out) => reactorCore.getWorldPosition(out),
    updateAnimation: (input: EnemyAnimationInput) => {
      const t = input.elapsed;
      const dt = Math.min(0.08, Math.max(0.001, input.dt));
      const isP2 = input.phase === 2;
      const isStaggered = input.behavior === 'staggered' || input.staggerTimer > 0;
      const isDead = input.behavior === 'dead' || input.deadProgress > 0;

      if (isDead) {
        const dp = Math.min(1, input.deadProgress);
        chassis.position.y = THREE.MathUtils.lerp(1.18, 0.42, dp);
        chassis.rotation.z = dp * 1.18;
        chassis.rotation.x = -dp * 0.25;
        mawBeamRoot.visible = false;
        gravFieldGroup.scale.setScalar(Math.max(0.01, 1 - dp));
        gravFieldMat.opacity = Math.max(0, 0.34 * (1 - dp));
        return;
      }

      const blend = Math.min(1, dt * 9.5);
      const tgtCrouch = stance === 'pounce_crouch' ? 1 : 0;
      const tgtLeap = stance === 'pounce_leap' || input.airborneHeight > 0.15 ? 1 : 0;
      const tgtPulse = stance === 'grav_pulse' ? 1 : 0;
      const tgtTail = stance === 'tail_whip' ? 1 : 0;
      const tgtCharge = stance === 'bull_charge' ? 1 : 0;
      const tgtBeam = stance === 'maw_beam' || beamActive ? 1 : 0;
      const tgtMortar = stance === 'mortar_salvo' ? 1 : 0;
      const tgtP2 =
        isP2 || phase2Aura > 0.1 || stance === 'phase2_overdrive'
          ? Math.max(isP2 ? 1 : 0, phase2Aura)
          : 0;

      smoothCrouch += (tgtCrouch - smoothCrouch) * blend;
      smoothLeap += (tgtLeap - smoothLeap) * blend;
      smoothPulse += (tgtPulse - smoothPulse) * blend;
      smoothTailWhip += (tgtTail - smoothTailWhip) * blend;
      smoothCharge += (tgtCharge - smoothCharge) * blend;
      smoothBeam += (tgtBeam - smoothBeam) * blend;
      smoothMortar += (tgtMortar - smoothMortar) * blend;
      smoothP2 += (tgtP2 - smoothP2) * blend;

      // 1. Ground Gravity-Well Distortion Sigil & Orbiting Debris Shards
      gravFieldOuter.rotation.z = t * (0.45 + smoothP2 * 0.7 + smoothPulse * 1.4);
      gravFieldInner.rotation.z = -t * (0.8 + smoothP2 * 1.1 + smoothPulse * 2.1);
      const fieldBoost = Math.max(gravFieldIntensity, smoothPulse, smoothP2 * 0.65);
      const fieldScale = 0.88 + fieldBoost * 0.45 + Math.sin(t * 4.2) * 0.04;
      gravFieldGroup.scale.setScalar(fieldScale);
      gravFieldMat.opacity = isStaggered ? 0.08 : 0.22 + fieldBoost * 0.44;
      gravFieldInnerMat.opacity = isStaggered ? 0.05 : 0.14 + fieldBoost * 0.34;
      gravFieldMat.color.setHex(smoothP2 > 0.45 ? 0xf97316 : 0xef4444);

      for (let i = 0; i < orbitDebris.length; i++) {
        const d = orbitDebris[i];
        const ang = t * (1.8 + smoothP2 * 1.6 + smoothPulse * 2.2) + (i * Math.PI) / 2;
        const rad = 1.25 + fieldBoost * 0.45;
        d.position.set(
          Math.cos(ang) * rad,
          0.14 + fieldBoost * 0.48 + Math.sin(t * 5 + i * 1.7) * 0.12,
          Math.sin(ang) * rad
        );
        d.rotation.set(t * 2.2 + i, t * 3.1, i);
        d.visible = !isStaggered && (fieldBoost > 0.15 || smoothP2 > 0.2);
      }

      // 2. Chassis Elevation, Predator Spine Arching & Bounding Gait
      const speedClamped = Math.min(1.45, Math.max(0, input.speedRatio));
      gaitPhase += dt * (2.6 + speedClamped * 7.8 + smoothCharge * 6.5);

      const crouchDrop = isStaggered
        ? 0.34
        : smoothCrouch * 0.3 + smoothCharge * 0.14 + smoothPulse * 0.12;
      const gallopBob =
        smoothLeap < 0.2 && !isStaggered
          ? Math.abs(Math.sin(gaitPhase)) * 0.075 * Math.min(1, speedClamped)
          : 0;
      const idleBreath = !isStaggered ? Math.sin(t * (isP2 ? 4.2 : 2.6)) * 0.022 : 0;

      chassis.position.y = 1.18 + input.airborneHeight - crouchDrop + gallopBob + idleBreath;
      chassis.rotation.z =
        input.flinchTimer > 0 ? input.flinchDirX * input.flinchTimer * 0.28 : 0;
      chassis.rotation.y = smoothTailWhip * tailSpinAngle;

      const leapPitch = smoothLeap * (0.34 - input.attackProgress * 0.68);
      const tgtChassisPitch = isStaggered
        ? -0.24
        : leapPitch +
          smoothCrouch * -0.24 +
          smoothPulse * 0.22 +
          smoothCharge * -0.14 +
          smoothBeam * 0.1;
      chassis.rotation.x += (tgtChassisPitch - chassis.rotation.x) * blend;

      frontThoraxPivot.rotation.x = isStaggered
        ? -0.14
        : Math.sin(gaitPhase) * 0.06 * Math.min(1, speedClamped) +
          smoothPulse * 0.14 -
          smoothCrouch * 0.1;
      rearPelvisPivot.rotation.x = isStaggered
        ? 0.18
        : -Math.sin(gaitPhase) * 0.08 * Math.min(1, speedClamped) +
          smoothCrouch * 0.24 -
          smoothLeap * 0.18;

      // 3. Hinged Clamshell Dorsal Grav-Singularity Reactor (WEAKPOINT)
      const wantShutter = isStaggered || input.weakpointBroken
        ? 1.0
        : Math.max(
            shutterOpenOverride,
            input.weakpointExposed ? 0.92 : 0.22,
            smoothPulse * 0.96,
            smoothBeam * 0.85,
            smoothMortar * 0.72,
            smoothP2 * 0.52
          );
      smoothShutter += (wantShutter - smoothShutter) * Math.min(1, dt * 8);
      const shutterAngle = THREE.MathUtils.lerp(0.18, 1.05, smoothShutter);
      shutterPivotL.rotation.z = shutterAngle;
      shutterPivotR.rotation.z = -shutterAngle;

      if (input.weakpointBroken) {
        reactorGimbalOuter.rotation.set(0.45, t * 0.8, 0.55);
        reactorGimbalInner.rotation.set(-0.5, -t * 1.1, 0.4);
        reactorCage.rotation.set(0.3, -t * 0.9, 0.2);
        reactorCore.scale.setScalar(0.62 + Math.sin(t * 18) * 0.09);
        reactorCage.scale.setScalar(0.75);
        reactorCoreMat.emissive.setHex(0x7f1d1d);
        reactorCoreMat.emissiveIntensity = 0.48;
        reactorCageMat.emissiveIntensity = 0.2;
        reactorRingMat.emissiveIntensity = 0.1;
      } else {
        const spin = 1.6 + smoothP2 * 2.2 + smoothPulse * 3.4 + smoothBeam * 2.6;
        reactorGimbalOuter.rotation.y = t * spin;
        reactorGimbalOuter.rotation.x = Math.sin(t * 2.4) * 0.35;
        reactorGimbalInner.rotation.z = -t * spin * 1.6;
        reactorGimbalInner.rotation.x = t * spin * 0.8;
        reactorCore.rotation.y = t * (spin * 1.3);
        reactorCage.rotation.y = -t * (spin * 1.5);
        reactorCage.rotation.x = t * (spin * 0.7);
        const coreScale = 1 + Math.sin(t * 7.2) * 0.1 + smoothPulse * 0.26 + smoothP2 * 0.12;
        reactorCore.scale.setScalar(coreScale);
        reactorCage.scale.setScalar(coreScale * 1.04);
        reactorCoreMat.emissive.setHex(smoothP2 > 0.45 ? 0xd9480f : 0xdc2626);
        reactorCoreMat.emissiveIntensity =
          1.45 + smoothP2 * 0.42 + smoothPulse * 0.52 + smoothBeam * 0.35;
        reactorCageMat.emissiveIntensity = 0.65 + smoothP2 * 0.45 + smoothPulse * 0.4;
        reactorRingMat.emissiveIntensity = 0.36 + smoothP2 * 0.35 + smoothPulse * 0.28;
      }

      // 4. Twin Elevating Shoulder Gravity-Mine Mortar Pods
      const tgtPodPitch = smoothMortar * 0.72 + mortarPitch * 0.5 + smoothP2 * 0.14;
      shoulderPodL.pivot.rotation.x += (tgtPodPitch - shoulderPodL.pivot.rotation.x) * blend;
      shoulderPodR.pivot.rotation.x += (tgtPodPitch - shoulderPodR.pivot.rotation.x) * blend;

      // 5. Cyber-Cerberus Head, Neck, Articulated Mechanical Jaw & Throat Igniter
      const tgtNeckPitch = isStaggered
        ? -0.34
        : smoothCrouch * 0.22 +
          smoothPulse * 0.32 +
          smoothCharge * -0.22 +
          smoothBeam * 0.08 +
          Math.sin(t * 2.4) * 0.04;
      neckPivot.rotation.x += (tgtNeckPitch - neckPivot.rotation.x) * blend;

      const tgtHeadPitch = isStaggered
        ? -0.26
        : smoothCrouch * 0.14 +
          smoothCharge * -0.18 +
          smoothPulse * 0.2 +
          THREE.MathUtils.clamp(-input.aimPitch * 0.45, -0.35, 0.35);
      headPivot.rotation.x += (tgtHeadPitch - headPivot.rotation.x) * blend;
      headPivot.rotation.y = isStaggered
        ? Math.sin(t * 7.5) * 0.16
        : smoothBeam > 0.1 && beamActive
          ? beamSweepYawOffset * 0.55
          : 0;

      const wantJaw = isStaggered
        ? 0.42
        : Math.max(
            jawOpenOverride,
            smoothBeam * 0.64,
            smoothPulse * 0.56,
            smoothLeap * 0.48,
            smoothCrouch * 0.28,
            tuskCharge * 0.46,
            0.06 + Math.sin(t * 3.1) * 0.03
          );
      lowerJawPivot.rotation.x = -wantJaw;

      const throatScale = 0.72 + wantJaw * 0.78 + smoothBeam * 0.45 + tuskCharge * 0.35;
      throatIgniter.scale.setScalar(throatScale);
      throatIgniter.rotation.y = t * 5.2;

      amberPlasmaMat.emissiveIntensity =
        1.14 + smoothP2 * 0.32 + tuskCharge * 0.52 + smoothBeam * 0.42;
      crimsonEnergyMat.emissiveIntensity =
        1.22 + smoothP2 * 0.36 + smoothPulse * 0.52;

      // 6. 4 Digitigrade 3-Joint Hydraulic Legs (Grounded Idle + Predator Leap Reach & Trail!)
      const stride = Math.min(1.1, speedClamped) * (smoothCharge > 0.3 ? 0.68 : 0.52);
      const crouchFlex = crouchDrop * 1.45;

      const updateFrontLeg = (leg: typeof legFL, phaseOff: number) => {
        const swing = smoothLeap > 0.25 ? 0 : Math.sin(gaitPhase + phaseOff) * stride;
        const lift = smoothLeap > 0.25 ? 0 : Math.max(0, Math.cos(gaitPhase + phaseOff)) * stride * 0.45;
        let hipX = THREE.MathUtils.lerp(-0.24 + swing - crouchFlex * 0.55, 0.96, smoothLeap);
        let kneeX = THREE.MathUtils.lerp(0.4 + lift + crouchFlex * 1.05, -0.28, smoothLeap);
        if (isStaggered) {
          hipX = -0.52;
          kneeX = 0.98;
        }
        leg.hip.rotation.x = hipX;
        leg.knee.rotation.x = kneeX;
        leg.ankle.rotation.x = THREE.MathUtils.lerp(
          -(hipX + kneeX + chassis.rotation.x * 0.5),
          -0.46,
          smoothLeap
        );
      };
      updateFrontLeg(legFL, 0);
      updateFrontLeg(legFR, Math.PI * 0.82);

      const updateRearLeg = (leg: typeof legRL, phaseOff: number) => {
        const swing = smoothLeap > 0.25 ? 0 : Math.sin(gaitPhase + phaseOff) * stride * 0.9;
        let hipX = THREE.MathUtils.lerp(0.44 + swing + crouchFlex * 0.62, -0.58, smoothLeap);
        let kneeX = THREE.MathUtils.lerp(-1.06 - crouchFlex * 1.08, -0.34, smoothLeap);
        let hockX = THREE.MathUtils.lerp(0.8 + crouchFlex * 0.48, 0.42, smoothLeap);
        if (isStaggered) {
          hipX = 0.68;
          kneeX = -1.34;
          hockX = 0.88;
        }
        leg.hip.rotation.x = hipX;
        leg.knee.rotation.x = kneeX;
        leg.hock.rotation.x = hockX;
        leg.ankle.rotation.x = THREE.MathUtils.lerp(
          -(hipX + kneeX + hockX + chassis.rotation.x * 0.4),
          0.54,
          smoothLeap
        );
      };
      updateRearLeg(legRL, Math.PI * 0.95);
      updateRearLeg(legRR, Math.PI * 1.75);

      // 7. 4-Segment Articulated Whip-Blade Grav-Tail
      for (let i = 0; i < tailSegments.length; i++) {
        const seg = tailSegments[i];
        const wave = Math.sin(t * (isP2 ? 5.2 : 3.2) - i * 0.75);
        if (isStaggered) {
          seg.rotation.x = 0.18 + i * 0.06;
          seg.rotation.y = wave * 0.08;
        } else if (smoothTailWhip > 0.2) {
          seg.rotation.x = THREE.MathUtils.lerp(-0.18, 0.04, smoothTailWhip);
          seg.rotation.y = 0.34 * smoothTailWhip;
        } else {
          const baseLift = i === 0 ? -0.34 : i === 1 ? -0.22 : i === 2 ? 0.1 : 0.22;
          seg.rotation.x = baseLift - smoothPulse * 0.14 + wave * 0.06;
          seg.rotation.y = Math.cos(t * (isP2 ? 4.4 : 2.6) - i * 0.85) * (0.18 + smoothCharge * 0.08);
        }
      }

      // 8. Volumetric Sweeping Molten Singularity Maw Beam + Muzzle Convergence Cone
      mawBeamRoot.visible = beamActive;
      if (beamActive) {
        mawBeamRoot.rotation.set(
          THREE.MathUtils.clamp(input.aimPitch, -0.45, 0.45),
          beamSweepYawOffset * 0.45,
          0
        );
        mawIrisGroup.rotation.z = t * (beamFiring ? 8.5 : 3.6 + beamCharge * 3.5);
        const irisSc = 0.72 + beamCharge * 0.48 + (beamFiring ? 0.26 : 0);
        mawIrisGroup.scale.setScalar(irisSc);

        const coreR = beamFiring ? 1.55 + Math.sin(t * 36) * 0.2 : 0.3 + beamCharge * 0.52;
        const sheathR = beamFiring ? 1.48 + Math.sin(t * 28) * 0.18 : 0.28 + beamCharge * 0.4;
        mawBeamCore.scale.set(coreR, coreR, beamLength);
        mawBeamSheath.scale.set(sheathR, sheathR, beamLength);
        beamCoreMat.opacity = beamFiring ? 0.96 : 0.36 + beamCharge * 0.48;
        beamSheathMat.opacity = beamFiring ? 0.52 : 0.18 + beamCharge * 0.24;

        const mPulse = beamFiring ? 1.25 + Math.sin(t * 34) * 0.2 : 0.45 + beamCharge * 0.55;
        mawMuzzleCone.scale.set(mPulse, mPulse, beamFiring ? 1.35 : 0.75);
        mawMuzzleCone.rotation.z = t * 6.5;
        beamMuzzleConeMat.opacity = beamFiring ? 0.52 : 0.18 + beamCharge * 0.28;

        mawBeamHelix.visible = beamFiring || beamCharge > 0.45;
        mawBeamHelix.rotation.z = -t * (beamFiring ? 15.0 : 6.0);
        const hRad = beamFiring ? 1.15 + Math.sin(t * 26) * 0.12 : 0.65;
        mawBeamHelix.scale.set(hRad, hRad, beamLength);
        beamHelixMat.opacity = beamFiring ? 0.82 : Math.max(0, (beamCharge - 0.45) * 0.85);

        mawMuzzleFlare.scale.setScalar(mPulse);
        mawMuzzleFlare.rotation.y = t * 9.5;
        mawMuzzleFlare.rotation.z = t * 6.5;

        tex.beamFluxMap.offset.y = -t * (beamFiring ? 6.2 : 2.5);

        mawImpactFlare.visible = beamFiring || beamCharge > 0.68;
        mawImpactFlare.position.set(0, 0, -beamLength);
        mawImpactFlare.scale.setScalar(beamFiring ? 1.28 + Math.sin(t * 30) * 0.22 : 0.58);
      }
    },
    dispose: () => {
      if (ownsTextures) tex.dispose();
      armorMat.dispose();
      bronzeMat.dispose();
      underframeMat.dispose();
      darkJointMat.dispose();
      steelFangMat.dispose();
      crimsonEnergyMat.dispose();
      amberPlasmaMat.dispose();
      reactorCoreMat.dispose();
      reactorCageMat.dispose();
      reactorRingMat.dispose();
      whiteHotMat.dispose();
      gravFieldMat.dispose();
      gravFieldInnerMat.dispose();
      beamCoreMat.dispose();
      beamSheathMat.dispose();
      beamHelixMat.dispose();
      beamMuzzleConeMat.dispose();
      beamFlareMat.dispose();
      root.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).geometry.dispose();
        }
      });
    },
  };
}
