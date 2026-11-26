import * as THREE from 'three';
import { createBeveledBox, createCurvedPanelGeometry, createLoftedAnatomy } from '../../../core/sculptUtils';
import { createEnemyContactShadow, createEnemyHitboxMesh } from '../../core/enemyMeshShared';
import type { EnemyAnimationInput, EnemyRigHandle } from '../../core/types';
import type { Floor05EnemyMaterials } from '../materials';
import type { StalkerTextureSuite } from './textures';

export type StalkerPoseMode =
  | 'prowl'
  | 'strafe'
  | 'crouch'
  | 'pounce'
  | 'blitz'
  | 'slash1'
  | 'slash2'
  | 'x_rend'
  | 'tail_whip'
  | 'spit'
  | 'mortar'
  | 'backflip';

export interface LeapingCarapaceStalkerRigHandle extends EnemyRigHandle {
  setPoseMode: (mode: StalkerPoseMode) => void;
  setPredatorCharge: (charge: number, enraged?: boolean) => void;
  getJawWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  getTailTipWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  getLeftBladeWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  getRightBladeWorldPos: (out: THREE.Vector3) => THREE.Vector3;
}

const THIGH_LEN = 0.46;
const SHIN_LEN = 0.46;
const TARSUS_LEN = 0.27;

function damp(cur: number, target: number, lambda: number, dt: number): number {
  return cur + (target - cur) * (1 - Math.exp(-lambda * dt));
}

function easeOutCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - (1 - c) * (1 - c) * (1 - c);
}

function easeInOutQuad(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
}

/** Exact vertical drop from hip pivot to flat-planted raptor foot given leg joint angles. */
function computeLegDrop(hipX: number, kneeX: number, hockX: number, hipZ: number): number {
  const cosZ = Math.cos(hipZ);
  const a1 = hipX;
  const a2 = hipX + kneeX;
  const a3 = hipX + kneeX + hockX;
  return (
    (THIGH_LEN * Math.cos(a1) + SHIN_LEN * Math.cos(a2) + TARSUS_LEN * Math.cos(a3)) * cosZ
  );
}

interface StalkerHindLeg {
  hip: THREE.Group;
  knee: THREE.Group;
  hock: THREE.Group;
  foot: THREE.Group;
}

function buildDigitigradeHunterLeg(
  side: -1 | 1,
  chitinMat: THREE.Material,
  darkChitinMat: THREE.Material,
  sinewMat: THREE.Material,
  boneSteelMat: THREE.Material,
  venomGlowMat: THREE.Material,
  ownedGeos: THREE.BufferGeometry[]
): StalkerHindLeg {
  const hip = new THREE.Group();
  hip.rotation.order = 'YXZ';

  // Sculpted muscular predator thigh (strictly ascending y, 0.46m)
  const thighGeo = createLoftedAnatomy(
    [
      { y: -THIGH_LEN, rx: 0.072, rz: 0.086, squareness: 2.35 },
      { y: -0.3, rx: 0.106, rz: 0.132, squareness: 2.6, pinchFront: 0.018 },
      { y: -0.14, rx: 0.132, rz: 0.16, squareness: 2.7, pinchFront: 0.022 },
      { y: 0.0, rx: 0.122, rz: 0.148, squareness: 2.45 },
    ],
    14
  );
  ownedGeos.push(thighGeo);
  const thigh = new THREE.Mesh(thighGeo, sinewMat);
  thigh.castShadow = true;
  hip.add(thigh);

  // Snug-fitting outer-to-rear chitin thigh carapace plate (seamless 360° muscular wrap!)
  const thighPlateGeo = createCurvedPanelGeometry(
    [
      { y: -0.42, rx: 0.08, rz: 0.096, thickness: 0.022 },
      { y: -0.22, rx: 0.118, rz: 0.144, thickness: 0.026 },
      { y: -0.01, rx: 0.128, rz: 0.154, thickness: 0.024 },
    ],
    side < 0 ? Math.PI * 0.42 : -Math.PI * 0.42,
    side < 0 ? Math.PI * 1.44 : Math.PI * 0.58,
    12
  );
  ownedGeos.push(thighPlateGeo);
  const thighPlate = new THREE.Mesh(thighPlateGeo, chitinMat);
  thighPlate.castShadow = true;
  hip.add(thighPlate);

  // Snug rear hamstring armor keel so back 3/4 view looks seamlessly sculpted
  const hamGeo = createBeveledBox(0.095, 0.34, 0.072, 0.016);
  ownedGeos.push(hamGeo);
  const ham = new THREE.Mesh(hamGeo, darkChitinMat);
  ham.position.set(0, -0.2, 0.112);
  hip.add(ham);

  // Subtle recessed lateral venom gland streak on outer thigh
  const thighVeinGeo = createBeveledBox(0.014, 0.22, 0.018, 0.004);
  ownedGeos.push(thighVeinGeo);
  const thighVein = new THREE.Mesh(thighVeinGeo, venomGlowMat);
  thighVein.position.set(side * 0.12, -0.2, -0.025);
  hip.add(thighVein);

  // Knee joint with razor patella bone spur
  const knee = new THREE.Group();
  knee.position.set(0, -THIGH_LEN, 0);
  hip.add(knee);

  const kneeCapGeo = new THREE.ConeGeometry(0.056, 0.14, 6);
  ownedGeos.push(kneeCapGeo);
  const kneeCap = new THREE.Mesh(kneeCapGeo, boneSteelMat);
  kneeCap.rotation.x = -Math.PI * 0.42;
  kneeCap.position.set(0, 0.01, -0.088);
  knee.add(kneeCap);

  // Athletic digitigrade shin (0.46m along -Y)
  const shinGeo = createLoftedAnatomy(
    [
      { y: -SHIN_LEN, rx: 0.048, rz: 0.056, squareness: 2.3 },
      { y: -0.24, rx: 0.068, rz: 0.086, squareness: 2.55, pinchFront: 0.014 },
      { y: 0.0, rx: 0.076, rz: 0.09, squareness: 2.45 },
    ],
    12
  );
  ownedGeos.push(shinGeo);
  const shin = new THREE.Mesh(shinGeo, darkChitinMat);
  shin.castShadow = true;
  knee.add(shin);

  const shinRidgeGeo = createCurvedPanelGeometry(
    [
      { y: -0.42, rx: 0.054, rz: 0.064, thickness: 0.016 },
      { y: -0.2, rx: 0.072, rz: 0.09, thickness: 0.02 },
      { y: -0.02, rx: 0.076, rz: 0.092, thickness: 0.016 },
    ],
    -Math.PI * 0.85,
    -Math.PI * 0.15,
    8
  );
  ownedGeos.push(shinRidgeGeo);
  const shinRidge = new THREE.Mesh(shinRidgeGeo, chitinMat);
  knee.add(shinRidge);

  // Sculpted rear calf fin blade for menacing side & back silhouette
  const calfFinGeo = createBeveledBox(0.022, 0.24, 0.078, 0.006);
  ownedGeos.push(calfFinGeo);
  const calfFin = new THREE.Mesh(calfFinGeo, chitinMat);
  calfFin.position.set(0, -0.18, 0.082);
  calfFin.rotation.x = 0.16;
  knee.add(calfFin);

  // Hock / digitigrade ankle joint with wicked rear bone spur
  const hock = new THREE.Group();
  hock.position.set(0, -SHIN_LEN, 0);
  knee.add(hock);

  const hockSpurGeo = new THREE.ConeGeometry(0.024, 0.14, 5);
  ownedGeos.push(hockSpurGeo);
  const hockSpur = new THREE.Mesh(hockSpurGeo, boneSteelMat);
  hockSpur.rotation.x = Math.PI * 0.6;
  hockSpur.position.set(0, 0.01, 0.08);
  hock.add(hockSpur);

  // Tapered armored tarsus (0.27m along -Y)
  const tarsusGeo = createLoftedAnatomy(
    [
      { y: -TARSUS_LEN, rx: 0.05, rz: 0.058, squareness: 2.4 },
      { y: -0.14, rx: 0.044, rz: 0.056, squareness: 2.5 },
      { y: 0.0, rx: 0.05, rz: 0.06, squareness: 2.35 },
    ],
    10
  );
  ownedGeos.push(tarsusGeo);
  const tarsus = new THREE.Mesh(tarsusGeo, chitinMat);
  tarsus.castShadow = true;
  hock.add(tarsus);

  // Foot pad + 3 curved grappling raptor talons + rear dewclaw (bottom flush at y = 0!)
  const foot = new THREE.Group();
  foot.position.set(0, -TARSUS_LEN, 0);
  hock.add(foot);

  const footPadGeo = createBeveledBox(0.12, 0.044, 0.14, 0.012);
  ownedGeos.push(footPadGeo);
  const footPad = new THREE.Mesh(footPadGeo, darkChitinMat);
  footPad.position.set(0, 0.022, -0.025);
  foot.add(footPad);

  const talonGeo = new THREE.ConeGeometry(0.022, 0.22, 6);
  ownedGeos.push(talonGeo);
  for (let t = -1; t <= 1; t++) {
    const talon = new THREE.Mesh(talonGeo, boneSteelMat);
    talon.rotation.set(-Math.PI * 0.45, -t * 0.18, 0);
    talon.position.set(t * 0.045, 0.032, -0.15);
    talon.castShadow = true;
    foot.add(talon);
  }
  const dewClaw = new THREE.Mesh(talonGeo, boneSteelMat);
  dewClaw.scale.set(0.75, 0.68, 0.75);
  dewClaw.rotation.x = Math.PI * 0.42;
  dewClaw.position.set(0, 0.036, 0.095);
  foot.add(dewClaw);

  return { hip, knee, hock, foot };
}

interface StalkerScytheArm {
  shoulder: THREE.Group;
  elbow: THREE.Group;
  bladeTip: THREE.Object3D;
  coronaMat: THREE.MeshBasicMaterial;
}

function buildPredatorScytheArm(
  side: -1 | 1,
  chitinMat: THREE.Material,
  darkChitinMat: THREE.Material,
  sinewMat: THREE.Material,
  bladeMat: THREE.Material,
  boneSteelMat: THREE.Material,
  venomGlowMat: THREE.Material,
  ownedGeos: THREE.BufferGeometry[],
  ownedMats: THREE.Material[]
): StalkerScytheArm {
  const shoulder = new THREE.Group();
  shoulder.rotation.order = 'YXZ';

  // Sculpted armored chitin pauldron with twin jagged backward-swept bone spurs
  const pauldronGeo = createCurvedPanelGeometry(
    [
      { y: -0.09, rx: 0.11, rz: 0.128, thickness: 0.024 },
      { y: 0.02, rx: 0.138, rz: 0.158, thickness: 0.03 },
      { y: 0.12, rx: 0.102, rz: 0.118, thickness: 0.022 },
    ],
    side < 0 ? Math.PI * 0.48 : -Math.PI * 0.52,
    side < 0 ? Math.PI * 1.52 : Math.PI * 0.52,
    12
  );
  ownedGeos.push(pauldronGeo);
  const pauldron = new THREE.Mesh(pauldronGeo, chitinMat);
  pauldron.position.set(side * 0.015, 0.02, 0);
  pauldron.castShadow = true;
  shoulder.add(pauldron);

  const spurGeo = new THREE.ConeGeometry(0.024, 0.24, 5);
  ownedGeos.push(spurGeo);
  for (let sp = 0; sp < 2; sp++) {
    const spur = new THREE.Mesh(spurGeo, boneSteelMat);
    spur.position.set(side * (0.115 - sp * 0.025), 0.12 + sp * 0.04, 0.04 + sp * 0.075);
    spur.rotation.set(0.68 + sp * 0.18, 0, -side * (0.52 - sp * 0.14));
    shoulder.add(spur);
  }

  // Fibrous muscular bicep (0.34m along -Y)
  const bicepGeo = createLoftedAnatomy(
    [
      { y: -0.34, rx: 0.056, rz: 0.062, squareness: 2.35 },
      { y: -0.17, rx: 0.08, rz: 0.09, squareness: 2.55 },
      { y: 0.0, rx: 0.076, rz: 0.084, squareness: 2.4 },
    ],
    12
  );
  ownedGeos.push(bicepGeo);
  const bicep = new THREE.Mesh(bicepGeo, sinewMat);
  bicep.castShadow = true;
  shoulder.add(bicep);

  const elbow = new THREE.Group();
  elbow.position.set(0, -0.34, 0);
  shoulder.add(elbow);

  // Rear elbow bone-blade spur
  const elbowSpurGeo = new THREE.ConeGeometry(0.025, 0.2, 5);
  ownedGeos.push(elbowSpurGeo);
  const elbowSpur = new THREE.Mesh(elbowSpurGeo, boneSteelMat);
  elbowSpur.position.set(side * 0.015, 0.02, 0.1);
  elbowSpur.rotation.x = Math.PI * 0.62;
  elbow.add(elbowSpur);

  // Sculpted armored vambrace forearm (0.36m along -Y)
  const forearmGeo = createLoftedAnatomy(
    [
      { y: -0.36, rx: 0.05, rz: 0.058, squareness: 2.35 },
      { y: -0.18, rx: 0.076, rz: 0.094, squareness: 2.7, pinchFront: 0.02 },
      { y: 0.0, rx: 0.066, rz: 0.076, squareness: 2.45 },
    ],
    12
  );
  ownedGeos.push(forearmGeo);
  const forearm = new THREE.Mesh(forearmGeo, darkChitinMat);
  forearm.castShadow = true;
  elbow.add(forearm);

  const vambraceGeo = createCurvedPanelGeometry(
    [
      { y: -0.33, rx: 0.056, rz: 0.066, thickness: 0.016 },
      { y: -0.16, rx: 0.082, rz: 0.098, thickness: 0.02 },
      { y: -0.02, rx: 0.07, rz: 0.08, thickness: 0.016 },
    ],
    side < 0 ? Math.PI * 0.52 : -Math.PI * 0.48,
    side < 0 ? Math.PI * 1.48 : Math.PI * 0.48,
    10
  );
  ownedGeos.push(vambraceGeo);
  const vambrace = new THREE.Mesh(vambraceGeo, chitinMat);
  elbow.add(vambrace);

  const conduitGeo = createBeveledBox(0.018, 0.26, 0.022, 0.005);
  ownedGeos.push(conduitGeo);
  const conduit = new THREE.Mesh(conduitGeo, venomGlowMat);
  conduit.position.set(side * 0.072, -0.18, -0.032);
  elbow.add(conduit);

  // Articulated 4-talon predator claw hand at wrist (y = -0.36)
  const clawHand = new THREE.Group();
  clawHand.position.set(0, -0.36, -0.01);
  elbow.add(clawHand);

  const palmGeo = createBeveledBox(0.076, 0.072, 0.078, 0.014);
  ownedGeos.push(palmGeo);
  const palm = new THREE.Mesh(palmGeo, sinewMat);
  clawHand.add(palm);

  const fingerClawGeo = new THREE.ConeGeometry(0.014, 0.165, 5);
  ownedGeos.push(fingerClawGeo);
  for (let f = -1.5; f <= 1.5; f += 1) {
    const finger = new THREE.Mesh(fingerClawGeo, boneSteelMat);
    finger.position.set(f * 0.022, -0.085, -0.036);
    finger.rotation.x = Math.PI + 0.34;
    clawHand.add(finger);
  }

  // FORGED DAMASCUS OBSIDIAN-STEEL SERRATED MANTIS-SCYTHE WRIST-BLADE
  const scytheShape = new THREE.Shape();
  scytheShape.moveTo(0.01, -0.04);
  scytheShape.lineTo(0.115, -0.18);
  scytheShape.quadraticCurveTo(0.16, -0.46, 0.3, -0.88); // Wicked sweeping mantis sickle tip
  // Razor serrated inner killing edge with 3 predator hook-teeth
  scytheShape.quadraticCurveTo(0.145, -0.72, 0.082, -0.62);
  scytheShape.lineTo(0.128, -0.54);
  scytheShape.lineTo(0.048, -0.47);
  scytheShape.lineTo(0.088, -0.38);
  scytheShape.lineTo(0.018, -0.32);
  scytheShape.lineTo(-0.02, -0.14);
  scytheShape.closePath();

  const scytheGeo = new THREE.ExtrudeGeometry(scytheShape, {
    depth: 0.024,
    bevelEnabled: true,
    bevelSize: 0.006,
    bevelThickness: 0.006,
    bevelSegments: 2,
  });
  scytheGeo.translate(0, 0, -0.012);
  scytheGeo.rotateY(Math.PI * 0.5);
  ownedGeos.push(scytheGeo);

  const primaryScythe = new THREE.Mesh(scytheGeo, bladeMat);
  primaryScythe.position.set(side * 0.066, -0.08, -0.018);
  primaryScythe.castShadow = true;
  elbow.add(primaryScythe);

  // Dark obsidian-chitin structural spine reinforcement bracket anchoring blade cleanly into vambrace
  const mountGeo = createBeveledBox(0.048, 0.28, 0.08, 0.009);
  ownedGeos.push(mountGeo);
  const mount = new THREE.Mesh(mountGeo, darkChitinMat);
  mount.position.set(side * 0.065, -0.19, -0.032);
  elbow.add(mount);

  // Secondary parallel inner fang-blade for double-clawed predator silhouette
  const secondaryScythe = new THREE.Mesh(scytheGeo, darkChitinMat);
  secondaryScythe.scale.set(0.76, 0.72, 0.72);
  secondaryScythe.position.set(side * 0.026, -0.16, -0.048);
  elbow.add(secondaryScythe);

  // Razor-sharp acid-venom edge sheen hugging ONLY the outer cutting edge of the dark forged steel!
  const coronaShape = new THREE.Shape();
  coronaShape.moveTo(0.114, -0.18);
  coronaShape.quadraticCurveTo(0.172, -0.46, 0.318, -0.9);
  coronaShape.quadraticCurveTo(0.142, -0.47, 0.094, -0.2);
  coronaShape.closePath();

  const coronaGeo = new THREE.ShapeGeometry(coronaShape);
  coronaGeo.rotateY(Math.PI * 0.5);
  ownedGeos.push(coronaGeo);

  const coronaMat = new THREE.MeshBasicMaterial({
    color: 0x39ff14,
    transparent: true,
    opacity: 0.52,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  ownedMats.push(coronaMat);

  const bladeCorona = new THREE.Mesh(coronaGeo, coronaMat);
  bladeCorona.position.set(side * 0.066, -0.08, -0.018);
  elbow.add(bladeCorona);

  const bladeTip = new THREE.Object3D();
  bladeTip.position.set(side * 0.066, -0.92, -0.3);
  elbow.add(bladeTip);

  return { shoulder, elbow, bladeTip, coronaMat };
}

export function buildLeapingCarapaceStalkerRig(
  enemyId: string,
  mats: Floor05EnemyMaterials,
  textures: StalkerTextureSuite
): LeapingCarapaceStalkerRigHandle {
  const root = new THREE.Group();
  root.name = `CarapaceStalker_${enemyId}`;
  const ownedGeos: THREE.BufferGeometry[] = [];
  const ownedMats: THREE.Material[] = [];
  const hitboxes: THREE.Mesh[] = [];

  // ── Iteration 2 High-Contrast Sculpted Bio-Chitin & Forged Steel PBR Materials ──
  const chitinMat = new THREE.MeshPhysicalMaterial({
    color: 0xdaf0eb, // Crisp readable tint over sculpted slate-jade carapaceMap
    map: textures.carapaceMap,
    bumpMap: textures.carapaceBump,
    bumpScale: 0.055,
    roughnessMap: textures.carapaceRoughness,
    roughness: 0.44,
    metalness: 0.36,
    clearcoat: 0.72,
    clearcoatRoughness: 0.2,
    emissive: 0x000000,
    emissiveIntensity: 0,
  });

  const darkChitinMat = new THREE.MeshPhysicalMaterial({
    color: 0x6c888e,
    map: textures.carapaceMap,
    bumpMap: textures.carapaceBump,
    bumpScale: 0.048,
    roughness: 0.4,
    metalness: 0.44,
    clearcoat: 0.58,
    clearcoatRoughness: 0.24,
    emissive: 0x000000,
    emissiveIntensity: 0,
  });

  const sinewMat = new THREE.MeshStandardMaterial({
    color: 0x7e97a3,
    map: textures.sinewMap,
    bumpMap: textures.sinewBump,
    bumpScale: 0.055,
    roughness: 0.66,
    metalness: 0.24,
  });

  const boneSteelMat = new THREE.MeshStandardMaterial({
    color: 0xd0dad4,
    roughness: 0.24,
    metalness: 0.76,
  });

  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0x92aab8,
    map: textures.bladeMap,
    roughness: 0.22,
    metalness: 0.92,
    emissive: 0x052e16,
    emissiveIntensity: 0.08,
  });

  const venomGlowMat = new THREE.MeshStandardMaterial({
    color: 0x4dff3b,
    emissive: 0x16d93c,
    emissiveIntensity: 2.05,
    roughness: 0.16,
    metalness: 0.08,
  });

  // Saturated venomous acid-emerald predator eyes (glows fiercely green without ACES whiteout!)
  const eyeGlowMat = new THREE.MeshStandardMaterial({
    color: 0x39ff14,
    emissive: 0x12e028,
    emissiveIntensity: 1.95,
    roughness: 0.08,
    metalness: 0.05,
  });

  // Dark abyssal obsidian-crimson inner throat cavity (tucked deep behind fangs — zero protruding red ball!)
  const mawFleshMat = new THREE.MeshStandardMaterial({
    color: 0x1e050b,
    emissive: 0x3a0712,
    emissiveIntensity: 0.25,
    roughness: 0.42,
    metalness: 0.1,
  });

  const acidCoreMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x16a34a,
    emissiveIntensity: 1.55,
    roughness: 0.2,
    metalness: 0.05,
  });

  const weakpointMat = mats.createWeakpointMaterial(0x7aff2e, 0x16a34a);

  ownedMats.push(
    chitinMat,
    darkChitinMat,
    sinewMat,
    boneSteelMat,
    bladeMat,
    venomGlowMat,
    eyeGlowMat,
    mawFleshMat,
    acidCoreMat,
    weakpointMat
  );

  // Ground contact shadow + Terrifying Toxic-Emerald Predator Hunting-Aura Halo
  const shadow = createEnemyContactShadow(1.04, mats.shadowDisc);
  root.add(shadow);

  const auraMat = new THREE.MeshBasicMaterial({
    map: textures.auraRingMap,
    color: 0x84ff4d,
    transparent: true,
    opacity: 0.56,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  ownedMats.push(auraMat);
  const auraGeo = new THREE.PlaneGeometry(2.75, 2.75);
  auraGeo.rotateX(-Math.PI * 0.5);
  ownedGeos.push(auraGeo);
  const auraRing = new THREE.Mesh(auraGeo, auraMat);
  auraRing.position.y = 0.025;
  root.add(auraRing);

  // 14 Rising Bioluminescent Venom Spore Motes
  const sporeGeo = new THREE.OctahedronGeometry(0.032, 0);
  ownedGeos.push(sporeGeo);
  const sporeMat = new THREE.MeshBasicMaterial({
    color: 0xb8ff4d,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  ownedMats.push(sporeMat);
  const spores: Array<{ mesh: THREE.Mesh; radius: number; phase: number; speed: number; maxH: number }> = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(sporeGeo, sporeMat);
    m.scale.set(0.85, 1.55, 0.85);
    root.add(m);
    spores.push({
      mesh: m,
      radius: 0.36 + (i % 5) * 0.22,
      phase: (i / 14) * Math.PI * 2,
      speed: 0.58 + (i % 4) * 0.24,
      maxH: 1.55 + (i % 3) * 0.45,
    });
  }

  // ── Articulated Semi-Upright Apex Predator Skeleton ──
  const bodyRoot = new THREE.Group();
  bodyRoot.position.set(0, 1.06, 0);
  root.add(bodyRoot);

  // Sculpted armored pelvic girdle with hip-socket tasset cowls (zero hip gap from rear 3/4!)
  const pelvisGeo = createLoftedAnatomy(
    [
      { y: -0.1, rx: 0.168, rz: 0.155, squareness: 2.55 },
      { y: 0.02, rx: 0.238, rz: 0.195, squareness: 2.75, pinchFront: 0.03 },
      { y: 0.15, rx: 0.2, rz: 0.168, squareness: 2.55 },
    ],
    14
  );
  ownedGeos.push(pelvisGeo);
  const pelvis = new THREE.Mesh(pelvisGeo, darkChitinMat);
  pelvis.castShadow = true;
  bodyRoot.add(pelvis);

  // Curved overlapping chitin hip-socket cowls bridging pelvis smoothly over both thighs
  for (const sgn of [-1, 1] as const) {
    const hipCowlGeo = createCurvedPanelGeometry(
      [
        { y: -0.1, rx: 0.138, rz: 0.162, thickness: 0.024 },
        { y: 0.01, rx: 0.15, rz: 0.172, thickness: 0.028 },
        { y: 0.09, rx: 0.125, rz: 0.145, thickness: 0.022 },
      ],
      sgn < 0 ? Math.PI * 0.45 : -Math.PI * 0.45,
      sgn < 0 ? Math.PI * 1.45 : Math.PI * 0.55,
      10
    );
    ownedGeos.push(hipCowlGeo);
    const hipCowl = new THREE.Mesh(hipCowlGeo, chitinMat);
    hipCowl.position.set(sgn * 0.175, -0.01, 0.05);
    hipCowl.castShadow = true;
    bodyRoot.add(hipCowl);
  }

  const hipFinGeo = new THREE.ConeGeometry(0.044, 0.25, 5);
  ownedGeos.push(hipFinGeo);
  for (const sgn of [-1, 1] as const) {
    const hipFin = new THREE.Mesh(hipFinGeo, chitinMat);
    hipFin.position.set(sgn * 0.255, 0.07, 0.08);
    hipFin.rotation.set(0.55, 0, -sgn * 0.65);
    bodyRoot.add(hipFin);
  }

  // Articulated muscular predator abdomen with curved chitin abs & continuous Xenomorph spinal armor!
  const abdomen = new THREE.Group();
  abdomen.position.set(0, 0.13, -0.02);
  bodyRoot.add(abdomen);

  const absGeo = createLoftedAnatomy(
    [
      { y: 0.0, rx: 0.188, rz: 0.155, squareness: 2.55 },
      { y: 0.15, rx: 0.176, rz: 0.148, squareness: 2.65, pinchFront: 0.024 },
      { y: 0.3, rx: 0.218, rz: 0.178, squareness: 2.7, pinchFront: 0.032 },
    ],
    14
  );
  ownedGeos.push(absGeo);
  const absMesh = new THREE.Mesh(absGeo, sinewMat);
  absMesh.castShadow = true;
  abdomen.add(absMesh);

  // Curved overlapping ventral abdominal chitin plates (front) & Xenomorph armored dorsal chevrons (back!)
  for (let a = 0; a < 3; a++) {
    const absPanelGeo = createCurvedPanelGeometry(
      [
        { y: -0.036, rx: 0.195 - a * 0.005, rz: 0.165, thickness: 0.022 },
        { y: 0.0, rx: 0.205 - a * 0.005, rz: 0.178, thickness: 0.026 },
        { y: 0.036, rx: 0.192 - a * 0.005, rz: 0.162, thickness: 0.02 },
      ],
      -Math.PI * 0.84,
      -Math.PI * 0.16,
      10
    );
    ownedGeos.push(absPanelGeo);
    const absPanel = new THREE.Mesh(absPanelGeo, a % 2 === 0 ? chitinMat : darkChitinMat);
    absPanel.position.set(0, 0.055 + a * 0.095, -0.006);
    abdomen.add(absPanel);

    // Continuous sculpted dorsal lumbar armor chevron plate wrapping rear spine (+Z)
    const backChevGeo = createCurvedPanelGeometry(
      [
        { y: -0.044, rx: 0.196, rz: 0.168, thickness: 0.026 },
        { y: 0.0, rx: 0.212, rz: 0.186, thickness: 0.032 },
        { y: 0.044, rx: 0.192, rz: 0.164, thickness: 0.024 },
      ],
      Math.PI * 0.18,
      Math.PI * 0.82,
      10
    );
    ownedGeos.push(backChevGeo);
    const backChev = new THREE.Mesh(backChevGeo, a % 2 === 0 ? chitinMat : darkChitinMat);
    backChev.position.set(0, 0.05 + a * 0.096, 0.012);
    backChev.castShadow = true;
    abdomen.add(backChev);

    // Prominent Xenomorph bone-steel vertebra keel fin emerging from each lumbar chevron
    const lumbarSpine = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.165, 5), boneSteelMat);
    lumbarSpine.position.set(0, 0.055 + a * 0.096, 0.185);
    lumbarSpine.rotation.x = Math.PI * 0.4;
    abdomen.add(lumbarSpine);
  }

  // Broad Muscular Predator Thorax (leans forward via negative rotation.x)
  const thorax = new THREE.Group();
  thorax.position.set(0, 0.28, -0.03);
  abdomen.add(thorax);

  const chestCoreGeo = createLoftedAnatomy(
    [
      { y: 0.0, rx: 0.205, rz: 0.175, squareness: 2.55 },
      { y: 0.2, rx: 0.282, rz: 0.212, squareness: 2.75, pinchFront: 0.025 },
      { y: 0.42, rx: 0.322, rz: 0.228, squareness: 2.8, pinchFront: 0.028 },
      { y: 0.56, rx: 0.22, rz: 0.17, squareness: 2.45 },
    ],
    16
  );
  ownedGeos.push(chestCoreGeo);
  const chestCore = new THREE.Mesh(chestCoreGeo, sinewMat);
  chestCore.castShadow = true;
  thorax.add(chestCore);

  // Pulsing Radioactive Bio-Venom Heart blazing PROUD & UNOBSTRUCTED inside the ribcage cradle!
  const heartCradleGeo = createBeveledBox(0.175, 0.23, 0.06, 0.018);
  ownedGeos.push(heartCradleGeo);
  const heartCradle = new THREE.Mesh(heartCradleGeo, darkChitinMat);
  heartCradle.position.set(0, 0.255, -0.205);
  thorax.add(heartCradle);

  const heartGeo = new THREE.OctahedronGeometry(0.092, 1);
  ownedGeos.push(heartGeo);
  const venomHeart = new THREE.Mesh(heartGeo, venomGlowMat);
  venomHeart.scale.set(0.92, 1.48, 0.72);
  venomHeart.position.set(0, 0.255, -0.242);
  thorax.add(venomHeart);

  // 4 Glowing Braided Bio-Venom Arteries snaking out from the Heart toward shoulders & obliques!
  const arteryGeo = new THREE.CylinderGeometry(0.012, 0.009, 0.22, 6);
  ownedGeos.push(arteryGeo);
  for (const sgn of [-1, 1] as const) {
    const upperArt = new THREE.Mesh(arteryGeo, venomGlowMat);
    upperArt.position.set(sgn * 0.12, 0.34, -0.215);
    upperArt.rotation.set(0.18, sgn * 0.28, -sgn * 1.02);
    thorax.add(upperArt);

    const lowerArt = new THREE.Mesh(arteryGeo, venomGlowMat);
    lowerArt.scale.set(0.85, 0.85, 0.85);
    lowerArt.position.set(sgn * 0.11, 0.16, -0.208);
    lowerArt.rotation.set(-0.15, sgn * 0.25, sgn * 0.96);
    thorax.add(lowerArt);
  }

  // Sculpted Curved Overlapping Chitin Pectoral Breastplates + Armored Clavicle Collar!
  for (const sgn of [-1, 1] as const) {
    const pecPanelGeo = createCurvedPanelGeometry(
      [
        { y: -0.075, rx: 0.328, rz: 0.246, thickness: 0.028 },
        { y: 0.01, rx: 0.348, rz: 0.262, thickness: 0.034 },
        { y: 0.09, rx: 0.295, rz: 0.224, thickness: 0.026 },
      ],
      sgn < 0 ? -Math.PI * 0.94 : -Math.PI * 0.42,
      sgn < 0 ? -Math.PI * 0.58 : -Math.PI * 0.06,
      10
    );
    ownedGeos.push(pecPanelGeo);
    const pecPanel = new THREE.Mesh(pecPanelGeo, chitinMat);
    pecPanel.position.set(0, 0.43, -0.012);
    pecPanel.castShadow = true;
    thorax.add(pecPanel);

    // Jagged clavicle armor ridge framing the neck gorget
    const clavGeo = createBeveledBox(0.16, 0.052, 0.095, 0.012);
    ownedGeos.push(clavGeo);
    const clav = new THREE.Mesh(clavGeo, darkChitinMat);
    clav.position.set(sgn * 0.14, 0.545, -0.115);
    clav.rotation.set(0.22, -sgn * 0.32, sgn * 0.18);
    thorax.add(clav);
  }

  // 6 Prominent Curved Bone-Steel Ribcage Arches cradling the exposed blazing Venom Heart!
  const ribGeo = new THREE.TorusGeometry(0.192, 0.022, 7, 14, Math.PI * 0.68);
  ownedGeos.push(ribGeo);
  for (let r = 0; r < 3; r++) {
    const rScale = 1.02 - r * 0.07;
    for (const sgn of [-1, 1] as const) {
      const rib = new THREE.Mesh(ribGeo, boneSteelMat);
      rib.scale.setScalar(rScale);
      rib.position.set(sgn * 0.078, 0.11 + r * 0.105, -0.088);
      rib.rotation.set(Math.PI * 0.42, sgn * 0.24, sgn < 0 ? Math.PI * 0.78 : -Math.PI * 0.42);
      thorax.add(rib);
    }
  }

  // Cascading overlapping curved dorsal carapace armor plates along back (+Z)
  for (let p = 0; p < 3; p++) {
    const scale = 1 - p * 0.12;
    const dorsalGeo = createCurvedPanelGeometry(
      [
        { y: -0.08, rx: 0.285 * scale, rz: 0.215 * scale, thickness: 0.028 },
        { y: 0.02, rx: 0.325 * scale, rz: 0.248 * scale, thickness: 0.034 },
        { y: 0.11, rx: 0.255 * scale, rz: 0.195 * scale, thickness: 0.026 },
      ],
      Math.PI * 0.12,
      Math.PI * 0.88,
      12
    );
    ownedGeos.push(dorsalGeo);
    const dorsalPlate = new THREE.Mesh(dorsalGeo, p % 2 === 0 ? chitinMat : darkChitinMat);
    dorsalPlate.position.set(0, 0.45 - p * 0.14, 0.025);
    dorsalPlate.castShadow = true;
    thorax.add(dorsalPlate);
  }

  // Twin jagged scapular predator shoulder-blade spikes rising fiercely from upper back
  const scapSpikeGeo = new THREE.ConeGeometry(0.04, 0.36, 6);
  ownedGeos.push(scapSpikeGeo);
  for (const sgn of [-1, 1] as const) {
    const scap = new THREE.Mesh(scapSpikeGeo, boneSteelMat);
    scap.position.set(sgn * 0.23, 0.57, 0.14);
    scap.rotation.set(0.52, 0, -sgn * 0.34);
    scap.castShadow = true;
    thorax.add(scap);
  }

  // ── Blazing EMERALD DORSAL CARAPACE CREST (Weakpoint!) with Hinged Chitin Shrouds ──
  const weakpointAnchor = new THREE.Group();
  weakpointAnchor.position.set(0, 0.33, 0.245);
  thorax.add(weakpointAnchor);

  const crestSacGeo = new THREE.OctahedronGeometry(0.14, 1);
  ownedGeos.push(crestSacGeo);
  const crestSac = new THREE.Mesh(crestSacGeo, weakpointMat);
  crestSac.scale.set(0.92, 1.42, 0.84);
  weakpointAnchor.add(crestSac);

  for (let f = 0; f < 3; f++) {
    const finGeo = new THREE.ConeGeometry(0.054 - f * 0.008, 0.34 - f * 0.04, 6);
    ownedGeos.push(finGeo);
    const fin = new THREE.Mesh(finGeo, weakpointMat);
    fin.position.set(0, 0.14 - f * 0.12, 0.08);
    fin.rotation.x = Math.PI * 0.36 + f * 0.16;
    weakpointAnchor.add(fin);
  }

  const shroudGeo = createBeveledBox(0.068, 0.34, 0.13, 0.014);
  ownedGeos.push(shroudGeo);
  const leftShroud = new THREE.Group();
  leftShroud.position.set(-0.14, 0.02, -0.02);
  const leftShroudMesh = new THREE.Mesh(shroudGeo, chitinMat);
  leftShroudMesh.position.set(0, 0, 0.05);
  leftShroud.add(leftShroudMesh);
  weakpointAnchor.add(leftShroud);

  const rightShroud = new THREE.Group();
  rightShroud.position.set(0.14, 0.02, -0.02);
  const rightShroudMesh = new THREE.Mesh(shroudGeo, chitinMat);
  rightShroudMesh.position.set(0, 0, 0.05);
  rightShroud.add(rightShroudMesh);
  weakpointAnchor.add(rightShroud);

  // ── Articulated Stalking Neck with Armored Gorget & CHILLING PREDATOR-DEMON CRANIUM ──
  const neck = new THREE.Group();
  neck.position.set(0, 0.54, -0.04);
  thorax.add(neck);

  const neckGeo = createLoftedAnatomy(
    [
      { y: 0.0, rx: 0.115, rz: 0.118, squareness: 2.35 },
      { y: 0.1, rx: 0.095, rz: 0.102, squareness: 2.45 },
      { y: 0.19, rx: 0.1, rz: 0.108, squareness: 2.35 },
    ],
    12
  );
  ownedGeos.push(neckGeo);
  const neckMesh = new THREE.Mesh(neckGeo, sinewMat);
  neck.add(neckMesh);

  // Armored chitin gorget collar framing the base of the neck cleanly
  const gorgetGeo = createCurvedPanelGeometry(
    [
      { y: -0.01, rx: 0.155, rz: 0.145, thickness: 0.024 },
      { y: 0.065, rx: 0.128, rz: 0.126, thickness: 0.022 },
    ],
    -Math.PI * 0.92,
    Math.PI * 0.92,
    12
  );
  ownedGeos.push(gorgetGeo);
  const gorget = new THREE.Mesh(gorgetGeo, darkChitinMat);
  neck.add(gorget);

  for (let n = 0; n < 2; n++) {
    const nSpike = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.13, 5), boneSteelMat);
    nSpike.position.set(0, 0.06 + n * 0.08, 0.11);
    nSpike.rotation.x = Math.PI * 0.38;
    neck.add(nSpike);
  }

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.18, -0.05);
  neck.add(headGroup);

  // Swept-back Xenomorph/Predator Armored Cranium Dome (strictly ascending y rotated -PI/2 -> points -Z!)
  const skullGeo = createLoftedAnatomy(
    [
      { y: -0.34, rx: 0.052, rz: 0.046, squareness: 2.3 }, // Swept back occipital spike (+Z)
      { y: -0.1, rx: 0.132, rz: 0.118, squareness: 2.65 }, // Armored cranium dome
      { y: 0.08, rx: 0.15, rz: 0.126, squareness: 2.85, pinchFront: 0.028 }, // Temple & brow crest
      { y: 0.22, rx: 0.104, rz: 0.072, squareness: 2.7, pinchFront: 0.032 }, // Tapered upper snout bridge
      { y: 0.33, rx: 0.052, rz: 0.038, squareness: 2.4 }, // Razor predator nose tip (-Z)
    ],
    16
  );
  ownedGeos.push(skullGeo);
  const skull = new THREE.Mesh(skullGeo, chitinMat);
  skull.rotation.x = -Math.PI * 0.5;
  skull.position.set(0, 0.08, 0.02);
  skull.castShadow = true;
  headGroup.add(skull);

  // Swept tapered angular brow-blade crests overhanging the 6 neon-emerald eyes (zero blocky boxes!)
  const browBladeGeo = new THREE.ConeGeometry(0.036, 0.24, 5);
  ownedGeos.push(browBladeGeo);
  for (const sgn of [-1, 1] as const) {
    const brow = new THREE.Mesh(browBladeGeo, darkChitinMat);
    brow.scale.set(1.15, 1.0, 0.65);
    brow.position.set(sgn * 0.078, 0.105, -0.145);
    brow.rotation.set(Math.PI * 0.58, sgn * 0.36, -sgn * 0.28);
    headGroup.add(brow);
  }

  // Serrated cranial ridge fin sweeping backward over skull
  const crownGeo = createBeveledBox(0.04, 0.092, 0.48, 0.01);
  ownedGeos.push(crownGeo);
  const crown = new THREE.Mesh(crownGeo, darkChitinMat);
  crown.position.set(0, 0.188, 0.06);
  crown.rotation.x = -0.22;
  headGroup.add(crown);

  // Twin wicked swept-back bone-steel predator horns + cheekbone scythe-crests
  const hornGeo = new THREE.ConeGeometry(0.038, 0.44, 6);
  ownedGeos.push(hornGeo);
  for (const sgn of [-1, 1] as const) {
    const horn = new THREE.Mesh(hornGeo, boneSteelMat);
    horn.position.set(sgn * 0.118, 0.182, 0.125);
    horn.rotation.set(1.08, 0, -sgn * 0.28);
    horn.castShadow = true;
    headGroup.add(horn);

    const cheekHorn = new THREE.Mesh(hornGeo, darkChitinMat);
    cheekHorn.scale.set(0.62, 0.58, 0.62);
    cheekHorn.position.set(sgn * 0.145, 0.035, 0.0);
    cheekHorn.rotation.set(1.36, 0, -sgn * 0.48);
    headGroup.add(cheekHorn);
  }

  // Dark obsidian recessed orbital faceplate + 6 FIERCELY VISIBLE NEON-EMERALD PREDATOR EYES!
  const faceMaskGeo = createBeveledBox(0.225, 0.085, 0.11, 0.016);
  ownedGeos.push(faceMaskGeo);
  const faceMask = new THREE.Mesh(faceMaskGeo, darkChitinMat);
  faceMask.position.set(0, 0.044, -0.195);
  headGroup.add(faceMask);

  const mainEyeGeo = new THREE.OctahedronGeometry(0.028, 0);
  ownedGeos.push(mainEyeGeo);
  const sideEyeGeo = new THREE.SphereGeometry(0.017, 8, 8);
  ownedGeos.push(sideEyeGeo);

  for (const sgn of [-1, 1] as const) {
    // Fierce angry slanted primary predator slit-eye proud of dark orbital recess!
    const mainEye = new THREE.Mesh(mainEyeGeo, eyeGlowMat);
    mainEye.scale.set(1.62, 0.52, 0.88);
    mainEye.position.set(sgn * 0.056, 0.05, -0.258);
    mainEye.rotation.set(0, -sgn * 0.24, -sgn * 0.36);
    headGroup.add(mainEye);

    // Outer flanking arachnid hunter eye
    const outerEye = new THREE.Mesh(sideEyeGeo, eyeGlowMat);
    outerEye.position.set(sgn * 0.106, 0.06, -0.228);
    headGroup.add(outerEye);

    // Upper brow-sensor eye
    const upperEye = new THREE.Mesh(sideEyeGeo, eyeGlowMat);
    upperEye.scale.setScalar(0.82);
    upperEye.position.set(sgn * 0.082, 0.082, -0.246);
    headGroup.add(upperEye);
  }

  // Upper serrated bone-steel needle fangs lining upper predator maxilla!
  const toothGeo = new THREE.ConeGeometry(0.011, 0.074, 5);
  ownedGeos.push(toothGeo);
  for (let t = -2; t <= 2; t++) {
    const tooth = new THREE.Mesh(toothGeo, boneSteelMat);
    tooth.position.set(t * 0.025, -0.012, -0.262 + Math.abs(t) * 0.016);
    tooth.rotation.x = Math.PI + 0.2;
    headGroup.add(tooth);
  }

  // Dark Abyssal Inner Throat Cavity + Deep-Recessed Acid-Gland Emitter (cleanly tucked behind fangs!)
  const mawCavityGeo = new THREE.SphereGeometry(0.048, 10, 8);
  ownedGeos.push(mawCavityGeo);
  const mawCavity = new THREE.Mesh(mawCavityGeo, mawFleshMat);
  mawCavity.scale.set(0.95, 0.62, 1.0);
  mawCavity.position.set(0, -0.04, -0.145);
  headGroup.add(mawCavity);

  const gulletGeo = new THREE.OctahedronGeometry(0.03, 1);
  ownedGeos.push(gulletGeo);
  const venomGullet = new THREE.Mesh(gulletGeo, acidCoreMat);
  venomGullet.scale.set(0.8, 0.58, 0.95);
  venomGullet.position.set(0, -0.042, -0.17);
  headGroup.add(venomGullet);

  // Articulated Hinged Lower Toothed Predator Jaw with Armored Chin Beak (snaps open when shrieking!)
  const lowerJaw = new THREE.Group();
  lowerJaw.position.set(0, -0.056, -0.148);
  headGroup.add(lowerJaw);

  const jawBoneGeo = createBeveledBox(0.115, 0.032, 0.145, 0.008);
  ownedGeos.push(jawBoneGeo);
  const jawBone = new THREE.Mesh(jawBoneGeo, darkChitinMat);
  jawBone.position.set(0, -0.012, -0.068);
  lowerJaw.add(jawBone);

  const chinBeakGeo = new THREE.ConeGeometry(0.036, 0.11, 5);
  ownedGeos.push(chinBeakGeo);
  const chinBeak = new THREE.Mesh(chinBeakGeo, chitinMat);
  chinBeak.rotation.x = -Math.PI * 0.52;
  chinBeak.position.set(0, -0.018, -0.145);
  lowerJaw.add(chinBeak);

  for (let t = -2; t <= 2; t++) {
    const lTooth = new THREE.Mesh(toothGeo, boneSteelMat);
    lTooth.scale.set(0.92, 0.95, 0.92);
    lTooth.position.set(t * 0.022, 0.022, -0.12 + Math.abs(t) * 0.015);
    lTooth.rotation.x = -0.18;
    lowerJaw.add(lTooth);
  }

  // 4 Articulated Curved Pincer Mandibles (2-segment curved Predator jaws!)
  const mandRootGeo = new THREE.ConeGeometry(0.028, 0.175, 6);
  ownedGeos.push(mandRootGeo);
  const mandTipGeo = new THREE.ConeGeometry(0.018, 0.15, 5);
  ownedGeos.push(mandTipGeo);

  const buildCurvedMandible = (sgnX: -1 | 1, sgnY: -1 | 1) => {
    const pivot = new THREE.Group();
    pivot.position.set(sgnX * 0.078, sgnY > 0 ? -0.016 : -0.065, -0.185);
    headGroup.add(pivot);

    const base = new THREE.Mesh(mandRootGeo, sgnY > 0 ? darkChitinMat : chitinMat);
    base.rotation.set(-Math.PI * 0.48, -sgnX * 0.36, 0);
    base.position.set(sgnX * 0.026, 0, -0.078);
    pivot.add(base);

    // Inward-curving bone-steel pincer fang tip!
    const tip = new THREE.Mesh(mandTipGeo, boneSteelMat);
    tip.position.set(sgnX * 0.024, -sgnY * 0.008, -0.198);
    tip.rotation.set(-Math.PI * 0.44, sgnX * 0.48, 0);
    pivot.add(tip);

    return pivot;
  };

  const mandUL = buildCurvedMandible(-1, 1);
  const mandUR = buildCurvedMandible(1, 1);
  const mandLL = buildCurvedMandible(-1, -1);
  const mandLR = buildCurvedMandible(1, -1);

  const jawAnchor = new THREE.Object3D();
  jawAnchor.position.set(0, -0.032, -0.38);
  headGroup.add(jawAnchor);

  // ── 4-Segment Articulated Barbed Scorpion-Raptor Tail (+Z, NEGATIVE rotX arches UPWARD!) ──
  const tail1 = new THREE.Group();
  tail1.position.set(0, 0.06, 0.18);
  bodyRoot.add(tail1);

  const makeTailSeg = (parent: THREE.Group, rStart: number, rEnd: number, len: number, mat: THREE.Material) => {
    // Seamless armored ball-joint vertebra knuckle so bending tail segments never show miter gaps!
    const jointGeo = new THREE.SphereGeometry(rStart * 1.03, 10, 8);
    ownedGeos.push(jointGeo);
    const joint = new THREE.Mesh(jointGeo, darkChitinMat);
    parent.add(joint);

    const g = createLoftedAnatomy(
      [
        { y: 0, rx: rStart, rz: rStart * 1.06, squareness: 2.35 },
        { y: len * 0.5, rx: (rStart + rEnd) * 0.52, rz: (rStart + rEnd) * 0.56, squareness: 2.5 },
        { y: len, rx: rEnd, rz: rEnd * 1.04, squareness: 2.25 },
      ],
      10
    );
    ownedGeos.push(g);
    const m = new THREE.Mesh(g, mat);
    m.rotation.x = Math.PI * 0.5;
    m.castShadow = true;
    parent.add(m);

    const sp = new THREE.Mesh(new THREE.ConeGeometry(rEnd * 0.52, len * 0.48, 5), boneSteelMat);
    sp.position.set(0, rStart * 0.96, len * 0.54);
    sp.rotation.x = 0.44;
    parent.add(sp);
  };

  makeTailSeg(tail1, 0.096, 0.075, 0.44, darkChitinMat);

  const tail2 = new THREE.Group();
  tail2.position.set(0, 0, 0.43);
  tail1.add(tail2);
  makeTailSeg(tail2, 0.075, 0.058, 0.42, chitinMat);

  const tail3 = new THREE.Group();
  tail3.position.set(0, 0, 0.41);
  tail2.add(tail3);
  makeTailSeg(tail3, 0.058, 0.044, 0.4, darkChitinMat);

  const tail4 = new THREE.Group();
  tail4.position.set(0, 0, 0.39);
  tail3.add(tail4);
  makeTailSeg(tail4, 0.044, 0.028, 0.32, chitinMat);

  // Twin-barbed forged Damascus Obsidian-Steel Scorpion Stinger Spearhead + Glowing Venom Duct!
  const stingerShape = new THREE.Shape();
  stingerShape.moveTo(0, 0.02);
  stingerShape.lineTo(0.088, 0.14);
  stingerShape.lineTo(0.042, 0.18);
  stingerShape.lineTo(0, 0.5);
  stingerShape.lineTo(-0.042, 0.18);
  stingerShape.lineTo(-0.088, 0.14);
  stingerShape.closePath();
  const stingerGeo = new THREE.ExtrudeGeometry(stingerShape, {
    depth: 0.024,
    bevelEnabled: true,
    bevelSize: 0.006,
    bevelThickness: 0.006,
    bevelSegments: 2,
  });
  stingerGeo.translate(0, 0, -0.012);
  stingerGeo.rotateX(Math.PI * 0.5);
  ownedGeos.push(stingerGeo);
  const tailStinger = new THREE.Mesh(stingerGeo, bladeMat);
  tailStinger.position.set(0, 0, 0.28);
  tailStinger.castShadow = true;
  tail4.add(tailStinger);

  // Glowing central acid-venom channel running down the dark forged steel stinger
  const stingerDuctGeo = new THREE.ConeGeometry(0.016, 0.34, 5);
  ownedGeos.push(stingerDuctGeo);
  const stingerDuct = new THREE.Mesh(stingerDuctGeo, venomGlowMat);
  stingerDuct.rotation.x = Math.PI * 0.5;
  stingerDuct.position.set(0, 0.016, 0.5);
  tail4.add(stingerDuct);

  const tailVenomBulb = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 1), venomGlowMat);
  tailVenomBulb.scale.set(0.78, 0.78, 1.45);
  tailVenomBulb.position.set(0, 0.022, 0.31);
  tail4.add(tailVenomBulb);

  const tailTipAnchor = new THREE.Object3D();
  tailTipAnchor.position.set(0, 0, 0.76);
  tail4.add(tailTipAnchor);

  // ── Digitigrade Athletic Hind Legs ──
  const leftLeg = buildDigitigradeHunterLeg(
    -1,
    chitinMat,
    darkChitinMat,
    sinewMat,
    boneSteelMat,
    venomGlowMat,
    ownedGeos
  );
  leftLeg.hip.position.set(-0.23, 0.0, 0.06);
  bodyRoot.add(leftLeg.hip);

  const rightLeg = buildDigitigradeHunterLeg(
    1,
    chitinMat,
    darkChitinMat,
    sinewMat,
    boneSteelMat,
    venomGlowMat,
    ownedGeos
  );
  rightLeg.hip.position.set(0.23, 0.0, 0.06);
  bodyRoot.add(rightLeg.hip);

  // ── Muscular Predator Scythe Forearms ──
  const leftArm = buildPredatorScytheArm(
    -1,
    chitinMat,
    darkChitinMat,
    sinewMat,
    bladeMat,
    boneSteelMat,
    venomGlowMat,
    ownedGeos,
    ownedMats
  );
  leftArm.shoulder.position.set(-0.34, 0.44, -0.02);
  thorax.add(leftArm.shoulder);

  const rightArm = buildPredatorScytheArm(
    1,
    chitinMat,
    darkChitinMat,
    sinewMat,
    bladeMat,
    boneSteelMat,
    venomGlowMat,
    ownedGeos,
    ownedMats
  );
  rightArm.shoulder.position.set(0.34, 0.44, -0.02);
  thorax.add(rightArm.shoulder);

  // ── Crisp Raycast Hitboxes ──
  const bodyHb = createEnemyHitboxMesh(enemyId, 'body', new THREE.BoxGeometry(0.84, 1.05, 0.96));
  bodyHb.position.set(0, 0.24, 0.0);
  thorax.add(bodyHb);

  const headHb = createEnemyHitboxMesh(enemyId, 'head', new THREE.BoxGeometry(0.44, 0.4, 0.56));
  headHb.position.set(0, 0.04, -0.14);
  headGroup.add(headHb);

  const wpHb = createEnemyHitboxMesh(
    enemyId,
    'weakpoint',
    new THREE.BoxGeometry(0.5, 0.52, 0.48),
    'carapace_crest'
  );
  wpHb.position.set(0, 0.02, 0.08);
  weakpointAnchor.add(wpHb);
  hitboxes.push(bodyHb, headHb, wpHb);

  // ── Smooth Damped Animation State ──
  let poseMode: StalkerPoseMode = 'prowl';
  let predatorCharge = 0.2;
  let isEnraged = false;

  const anim = {
    bodyY: 1.06,
    bodyRotX: 0,
    bodyRotY: 0,
    bodyRotZ: 0,
    absX: -0.14,
    absY: 0,
    absZ: 0,
    thoraxX: -0.32,
    thoraxY: 0,
    thoraxZ: 0,
    neckX: -0.16,
    neckY: 0,
    headX: 0.46,
    headY: 0,
    headZ: 0,
    jawOpen: 0.18,
    shroudFlare: 0.16,
    lHipX: 0.46,
    lHipZ: -0.11,
    lKneeX: -1.04,
    lHockX: 0.86,
    rHipX: 0.46,
    rHipZ: 0.11,
    rKneeX: -1.04,
    rHockX: 0.86,
    lShX: 0.55,
    lShY: 0.22,
    lShZ: -0.26,
    lElX: 1.08,
    rShX: 0.55,
    rShY: -0.22,
    rShZ: 0.26,
    rElX: 1.08,
    // NEGATIVE tail X angles arch the scorpion-raptor tail dramatically UPWARD over its back!
    t1X: -0.32,
    t1Y: 0,
    t2X: -0.44,
    t2Y: 0,
    t3X: -0.52,
    t3Y: 0,
    t4X: -0.44,
    t4Y: 0,
  };

  return {
    root,
    hitboxes,
    weakpointMaterials: [weakpointMat],
    armorFlashMaterials: [chitinMat, darkChitinMat],
    setPoseMode(mode) {
      poseMode = mode;
    },
    setPredatorCharge(charge, enraged = false) {
      predatorCharge = charge;
      isEnraged = enraged;
    },
    getMuzzleWorldPos(out) {
      return jawAnchor.getWorldPosition(out);
    },
    getJawWorldPos(out) {
      return jawAnchor.getWorldPosition(out);
    },
    getTailTipWorldPos(out) {
      return tailTipAnchor.getWorldPosition(out);
    },
    getLeftBladeWorldPos(out) {
      return leftArm.bladeTip.getWorldPosition(out);
    },
    getRightBladeWorldPos(out) {
      return rightArm.bladeTip.getWorldPosition(out);
    },
    getWeakpointWorldPos(out) {
      return weakpointAnchor.getWorldPosition(out);
    },
    updateAnimation(input: EnemyAnimationInput) {
      const {
        dt,
        elapsed,
        behavior,
        speedRatio,
        localMoveX,
        attackProgress,
        flinchTimer,
        flinchDirX,
        staggerTimer,
        deadProgress,
        airborneHeight,
        weakpointExposed,
        weakpointBroken,
        phase,
      } = input;
      const stepDt = Math.min(0.08, Math.max(0.001, dt || 0.016));
      const frenzied = isEnraged || phase === 2;

      // Ground contact shadow & toxic predator aura halo
      shadow.position.y = 0.018;
      const airScale = Math.max(0.42, 1 - airborneHeight * 0.14);
      shadow.scale.setScalar(airScale);

      const auraPulse = 0.86 + Math.sin(elapsed * (frenzied ? 9.5 : 5.2)) * 0.14;
      const attackingAura = behavior === 'windup' || behavior === 'attack' ? 0.36 : 0;
      auraRing.position.y = 0.025;
      auraRing.rotation.y = elapsed * (frenzied ? 1.45 : 0.65);
      const auraScale =
        behavior === 'dead'
          ? Math.max(0.1, 1 - deadProgress)
          : (0.95 + attackingAura * 0.45 + (frenzied ? 0.18 : 0)) * auraPulse;
      auraRing.scale.setScalar(auraScale);
      auraMat.opacity =
        behavior === 'dead'
          ? Math.max(0, 0.45 * (1 - deadProgress))
          : Math.min(0.92, (0.46 + attackingAura + (frenzied ? 0.22 : 0)) * auraPulse);

      for (let i = 0; i < spores.length; i++) {
        const sp = spores[i];
        if (behavior === 'dead' && deadProgress > 0.7) {
          sp.mesh.visible = false;
          continue;
        }
        sp.mesh.visible = true;
        const cycle = (elapsed * sp.speed + sp.phase) % 1;
        const ang = sp.phase * 2.1 + elapsed * (frenzied ? 1.9 : 1.0);
        const rad = sp.radius * (1 - cycle * 0.25);
        sp.mesh.position.set(
          Math.cos(ang) * rad,
          0.12 + cycle * sp.maxH + airborneHeight * 0.65,
          Math.sin(ang) * rad
        );
        sp.mesh.rotation.y = elapsed * 3.5 + sp.phase;
        const sc = Math.sin(cycle * Math.PI) * (frenzied ? 1.25 : 0.92);
        sp.mesh.scale.set(sc * 0.75, sc * 1.45, sc * 0.75);
      }

      // ── 2-Stage Predator Collapse Death Animation ──
      if (behavior === 'dead') {
        const d = Math.min(1, deadProgress);
        const drop1 = easeOutCubic(Math.min(1, d / 0.42));
        const fall2 = easeInOutQuad(Math.max(0, (d - 0.35) / 0.65));
        bodyRoot.position.y = 1.06 - drop1 * 0.46 - fall2 * 0.36;
        bodyRoot.rotation.set(drop1 * 0.22 + fall2 * 0.18, 0, fall2 * 1.38);
        abdomen.rotation.set(-0.2 + fall2 * 0.45, 0, 0);
        thorax.rotation.set(-0.3 + fall2 * 0.52, 0, fall2 * 0.22);
        headGroup.rotation.set(0.1 - fall2 * 0.45, 0, 0);
        leftArm.shoulder.rotation.set(0.2 - fall2 * 0.5, 0.35, -0.85 * fall2);
        rightArm.shoulder.rotation.set(0.2 - fall2 * 0.5, -0.35, 0.85 * fall2);
        leftLeg.hip.rotation.set(0.95 * drop1, 0, -0.2);
        rightLeg.hip.rotation.set(0.75 * drop1, 0, 0.25);
        tail1.rotation.set(-0.1, fall2 * 0.65, 0);
        tail2.rotation.set(-0.05, fall2 * 0.5, 0);
        leftArm.coronaMat.opacity = Math.max(0, 0.3 * (1 - d));
        rightArm.coronaMat.opacity = Math.max(0, 0.3 * (1 - d));
        weakpointMat.emissiveIntensity = Math.max(0.08, 1.5 * (1 - d));
        eyeGlowMat.emissiveIntensity = Math.max(0.05, 2.5 * (1 - d));
        shadow.scale.setScalar(Math.max(0.25, 1 - d * 0.32));
        return;
      }

      // ── Compute Target Joint Angles for Fierce Coiled Asymmetric Apex Predator Stance ──
      const breath = Math.sin(elapsed * (frenzied ? 5.6 : 3.2));
      const chitter = Math.sin(elapsed * 9.5) * Math.max(0, Math.sin(elapsed * 2.1));
      const spd = Math.min(1.5, speedRatio);
      const isMoving = spd > 0.14;

      let bodyRotX = 0;
      let bodyRotY = 0;
      let bodyRotZ = 0;
      let bodyYBounce = breath * 0.022;
      let useAnalyticalGround = true;

      let absX = -0.22 + breath * 0.026;
      let absY = 0.12;
      let absZ = 0;
      let thoraxX = -0.38 + breath * 0.036;
      let thoraxY = -0.16;
      let thoraxZ = 0.03 * breath;
      let neckX = -0.14;
      let neckY = 0.06;
      let headX = 0.56 - breath * 0.025;
      let headY = 0.04 + Math.sin(elapsed * 1.75) * 0.09;
      let headZ = -0.05 + Math.cos(elapsed * 1.3) * 0.045;
      let jawOpen = 0.22 + Math.abs(chitter) * 0.16 + (frenzied ? 0.22 : 0);
      let shroudFlare = 0.18 + (weakpointExposed ? 0.52 : 0) + (frenzied ? 0.28 : 0);

      // Coiled asymmetric stalker stance: left talon forward, right talon planted back for instant spring!
      let lHipX = 0.64;
      let lHipZ = -0.14;
      let lKneeX = -1.24;
      let lHockX = 0.94;
      let rHipX = 0.44;
      let rHipZ = 0.14;
      let rKneeX = -1.14;
      let rHockX = 0.92;

      // Deadly Asymmetric Mantis-Scythe Guard: left blade low-forward ready to gut, right blade cocked high-back!
      let lShX = 0.84 + breath * 0.05;
      let lShY = 0.38;
      let lShZ = -0.24;
      let lElX = 0.86;
      let rShX = 0.34 - breath * 0.05;
      let rShY = -0.36;
      let rShZ = 0.44;
      let rElX = 1.24;

      // Expressive UPWARD-ARCHING Scorpion-Raptor Tail poised high & weaving like a viper!
      let t1X = -0.32 + Math.cos(elapsed * 3.4) * 0.07;
      let t1Y = Math.sin(elapsed * 3.1) * 0.28;
      let t2X = -0.52 + Math.cos(elapsed * 3.4 - 0.7) * 0.09;
      let t2Y = Math.sin(elapsed * 3.1 - 0.8) * 0.36;
      let t3X = -0.62 + Math.cos(elapsed * 3.4 - 1.4) * 0.11;
      let t3Y = Math.sin(elapsed * 3.1 - 1.5) * 0.4;
      let t4X = -0.5;
      let t4Y = Math.sin(elapsed * 3.1 - 2.1) * 0.34;

      let dampRate = 15;
      let bladeAura = 0.32 + predatorCharge * 0.26 + (frenzied ? 0.18 : 0);

      // Locomotion: Athletic Predatory Stalk-Sprint & Lateral Stalk-Weave
      if (isMoving && staggerTimer <= 0 && behavior !== 'attack' && behavior !== 'windup') {
        const strideFreq = behavior === 'strafe' ? 9.5 : 8.2 + spd * 4.8;
        const cyc = elapsed * strideFreq;
        const s = Math.sin(cyc);
        const c = Math.cos(cyc);

        if (behavior === 'strafe' || poseMode === 'strafe') {
          const sideSign = localMoveX < -0.05 ? -1 : 1;
          bodyYBounce = Math.abs(c) * 0.055;
          bodyRotZ = -sideSign * 0.16;
          absY = sideSign * 0.26;
          thoraxX = -0.44;
          thoraxY = -sideSign * 0.14;
          headY = sideSign * 0.12;
          lHipX = 0.58 + s * 0.44;
          lKneeX = -1.16 - Math.max(0, -c) * 0.32;
          lHockX = 0.92;
          lHipZ = -0.18;
          rHipX = 0.58 - s * 0.44;
          rKneeX = -1.16 - Math.max(0, c) * 0.32;
          rHockX = 0.92;
          rHipZ = 0.18;
          lShX = 0.72 - s * 0.28;
          lShY = 0.35;
          lShZ = -0.34;
          lElX = 1.18;
          rShX = 0.72 + s * 0.28;
          rShY = -0.35;
          rShZ = 0.34;
          rElX = 1.18;
          t1X = -0.32;
          t1Y = -sideSign * 0.48 + Math.sin(cyc) * 0.22;
          t2X = -0.44;
          t2Y = -sideSign * 0.36;
          t3X = -0.5;
          t3Y = -sideSign * 0.28;
        } else {
          const amp = Math.min(1.0, spd * 0.78);
          bodyYBounce = Math.abs(c) * 0.095 * amp;
          absX = -0.22 - amp * 0.12 + c * 0.05 * amp;
          thoraxX = -0.42 - amp * 0.18;
          thoraxY = -s * 0.22 * amp;
          headX = 0.62 + amp * 0.12;
          headY = s * 0.14 * amp;

          lHipX = 0.52 + s * 0.68 * amp;
          lKneeX = -1.04 - Math.max(0, -s) * 0.48 * amp + Math.max(0, s) * 0.2 * amp;
          lHockX = 0.88 + Math.max(0, -c) * 0.22 * amp;

          rHipX = 0.52 - s * 0.68 * amp;
          rKneeX = -1.04 - Math.max(0, s) * 0.48 * amp + Math.max(0, -s) * 0.2 * amp;
          rHockX = 0.88 + Math.max(0, c) * 0.22 * amp;

          lShX = 0.62 - s * 0.66 * amp;
          lShY = 0.16;
          lShZ = -0.24;
          lElX = 1.12 + Math.max(0, -s) * 0.26 * amp;

          rShX = 0.62 + s * 0.66 * amp;
          rShY = -0.16;
          rShZ = 0.24;
          rElX = 1.12 + Math.max(0, s) * 0.26 * amp;

          t1X = -0.14 - c * 0.1 * amp;
          t1Y = -s * 0.34 * amp;
          t2X = -0.22;
          t2Y = -s * 0.36 * amp;
          t3X = -0.3;
          t4X = -0.32;
        }
      }

      // ── Priority Combat States & Crisp Expressive Attack Poses ──
      if (staggerTimer > 0) {
        const tremor = Math.sin(elapsed * 22);
        bodyRotX = 0.08;
        bodyRotZ = tremor * 0.08;
        absX = 0.24;
        thoraxX = 0.34;
        thoraxZ = tremor * 0.1;
        neckX = 0.28;
        headX = 0.32 + tremor * 0.08;
        headY = Math.sin(elapsed * 11) * 0.24;
        jawOpen = 0.96;
        shroudFlare = 1.0;

        lHipX = 0.92;
        lKneeX = -1.68;
        lHockX = 0.95;
        rHipX = 0.44;
        rKneeX = -1.28;
        rHockX = 0.88;

        lShX = -0.28;
        lShY = 0.55;
        lShZ = -0.92;
        lElX = 0.65;
        rShX = -0.28;
        rShY = -0.55;
        rShZ = 0.92;
        rElX = 0.65;

        t1X = -0.05;
        t2X = -0.18;
        t3X = -0.26;
        t4X = -0.22;
        dampRate = 18;
      } else if (poseMode === 'crouch') {
        // Coiled Panther-Mantis Ambush Crouch: drops ultra-low with talons gripped FLUSH on floor, scorpion tail poised high!
        const p = easeOutCubic(attackProgress);
        const tremble = Math.sin(elapsed * 32) * 0.025 * p;
        absX = -0.26 - p * 0.24;
        thoraxX = -0.38 - p * 0.3;
        neckX = -0.1;
        headX = 0.52 + p * 0.42;
        jawOpen = 0.3 + p * 0.72;
        shroudFlare = 0.35 + p * 0.7;

        lHipX = 0.52 + p * 0.56;
        lKneeX = -1.1 - p * 0.48;
        lHockX = 0.86 + p * 0.28;
        lHipZ = -0.14 - p * 0.1;

        rHipX = 0.52 + p * 0.56;
        rKneeX = -1.1 - p * 0.48;
        rHockX = 0.86 + p * 0.28;
        rHipZ = 0.14 + p * 0.1;

        lShX = 0.42 - p * 0.95 + tremble;
        lShY = 0.44;
        lShZ = -0.58;
        lElX = 1.38;
        rShX = 0.42 - p * 0.95 - tremble;
        rShY = -0.44;
        rShZ = 0.58;
        rElX = 1.38;

        // Scorpion tail arches high & forward over dorsal crest ready to strike!
        t1X = -0.48 - p * 0.44;
        t2X = -0.6 - p * 0.38;
        t3X = -0.68 - p * 0.32;
        t4X = -0.52 - p * 0.24;
        bladeAura = 0.72 + p * 0.36;
        dampRate = 18;
      } else if (poseMode === 'pounce') {
        useAnalyticalGround = false;
        const p = Math.min(1, attackProgress);
        bodyRotX = -0.3 + p * 0.64;
        absX = -0.35;
        thoraxX = -0.46;
        headX = 0.72;
        jawOpen = 0.95;
        shroudFlare = 0.85;

        const legExt = p < 0.65 ? -0.66 : -0.66 + ((p - 0.65) / 0.35) * 1.44;
        lHipX = legExt;
        lKneeX = -0.78 - Math.max(0, p - 0.5) * 0.6;
        lHockX = 0.52;
        rHipX = legExt + 0.14;
        rKneeX = -0.72 - Math.max(0, p - 0.5) * 0.6;
        rHockX = 0.52;

        const rake = p > 0.62 ? ((p - 0.62) / 0.38) * 1.15 : 0;
        lShX = 1.95 - rake;
        lShY = 0.24 - rake * 0.25;
        lShZ = -0.32;
        lElX = 0.38 + rake * 0.65;
        rShX = 1.95 - rake;
        rShY = -0.24 + rake * 0.25;
        rShZ = 0.32;
        rElX = 0.38 + rake * 0.65;

        t1X = -0.06;
        t2X = -0.14;
        t3X = -0.18;
        t4X = -0.22;
        bladeAura = 1.0;
        dampRate = 24;
      } else if (poseMode === 'blitz') {
        const p = Math.min(1, attackProgress);
        const zig = Math.sin(p * Math.PI * 2);
        bodyRotZ = -zig * 0.24;
        absX = -0.42;
        thoraxX = -0.56;
        thoraxY = zig * 0.38;
        headX = 0.88;
        jawOpen = 0.88;
        shroudFlare = 0.74;

        lHipX = 0.78 + zig * 0.38;
        lKneeX = -1.35;
        lHockX = 1.02;
        rHipX = 0.78 - zig * 0.38;
        rKneeX = -1.35;
        rHockX = 1.02;

        lShX = 1.25 - zig * 0.55;
        lShY = 0.42;
        lShZ = -0.82;
        lElX = 0.45;
        rShX = 1.25 + zig * 0.55;
        rShY = -0.42;
        rShZ = 0.82;
        rElX = 0.45;

        t1X = -0.16;
        t1Y = -zig * 0.62;
        t2X = -0.2;
        t2Y = -zig * 0.55;
        bladeAura = 1.0;
        dampRate = 24;
      } else if (poseMode === 'slash1' || poseMode === 'slash2') {
        const isLeft = poseMode === 'slash1';
        const sgn = isLeft ? -1 : 1;
        const p = Math.min(1, attackProgress);
        const swing = behavior === 'windup' ? -easeOutCubic(p) : -1.0 + easeOutCubic(p) * 2.35;

        absY = -sgn * swing * 0.32;
        thoraxX = -0.38 - Math.max(0, swing) * 0.18;
        thoraxY = -sgn * swing * 0.52;
        thoraxZ = sgn * swing * 0.12;
        headX = 0.56;
        headY = sgn * swing * 0.38;
        jawOpen = behavior === 'windup' ? 0.45 + p * 0.4 : 0.9;
        shroudFlare = 0.55;

        lHipX = isLeft ? 0.82 : 0.24;
        lKneeX = isLeft ? -1.24 : -0.92;
        rHipX = isLeft ? 0.24 : 0.82;
        rKneeX = isLeft ? -0.92 : -1.24;

        if (isLeft) {
          lShX = 1.05 + swing * 0.85;
          lShY = 0.36 - swing * 0.72;
          lShZ = -0.48 - Math.max(0, -swing) * 0.4;
          lElX = behavior === 'windup' ? 1.32 : 0.34;
          rShX = 0.25;
          rShY = -0.45;
          rShZ = 0.42;
          rElX = 1.25;
        } else {
          rShX = 1.05 + swing * 0.85;
          rShY = -0.36 + swing * 0.72;
          rShZ = 0.48 + Math.max(0, -swing) * 0.4;
          rElX = behavior === 'windup' ? 1.32 : 0.34;
          lShX = 0.25;
          lShY = 0.45;
          lShZ = -0.42;
          lElX = 1.25;
        }

        t1X = -0.28;
        t1Y = sgn * swing * 0.55;
        t2X = -0.38;
        t2Y = sgn * swing * 0.48;
        bladeAura = 0.94;
        dampRate = 24;
      } else if (poseMode === 'x_rend') {
        const p = Math.min(1, attackProgress);
        if (behavior === 'windup') {
          const e = easeOutCubic(p);
          absX = 0.12 * e;
          thoraxX = -0.1 + e * 0.28;
          headX = 0.35 - e * 0.22;
          jawOpen = 0.5 + e * 0.5;
          shroudFlare = 0.78;

          lShX = 1.85 + e * 0.55;
          lShY = 0.25;
          lShZ = -0.78 - e * 0.35;
          lElX = 0.95;
          rShX = 1.85 + e * 0.55;
          rShY = -0.25;
          rShZ = 0.78 + e * 0.35;
          rElX = 0.95;

          t1X = -0.65;
          t2X = -0.68;
          t3X = -0.66;
        } else {
          const e = easeOutCubic(p);
          absX = -0.38 * e;
          thoraxX = -0.58 * e;
          headX = 0.78;
          jawOpen = 0.96;
          shroudFlare = 0.92;

          lHipX = 0.82;
          lKneeX = -1.32;
          rHipX = 0.36;
          rKneeX = -1.0;

          lShX = 2.05 - e * 1.75;
          lShY = -0.34 * e;
          lShZ = -0.92 + e * 0.72;
          lElX = 0.34 + e * 0.42;
          rShX = 2.22 - e * 1.9;
          rShY = 0.34 * e;
          rShZ = 0.92 - e * 0.72;
          rElX = 0.34 + e * 0.42;

          t1X = -0.45;
          t2X = -0.54;
          t3X = -0.58;
        }
        bladeAura = 1.0;
        dampRate = 26;
      } else if (poseMode === 'tail_whip') {
        const p = Math.min(1, attackProgress);
        if (behavior === 'windup') {
          const e = easeOutCubic(p);
          bodyRotY = -0.68 * e;
          absX = -0.32;
          thoraxX = -0.45;
          thoraxY = -0.42 * e;
          headY = 0.75 * e;
          jawOpen = 0.72;
          lHipX = 0.74;
          lKneeX = -1.32;
          rHipX = 0.74;
          rKneeX = -1.32;
          t1X = -0.04;
          t1Y = -0.95 * e;
          t2X = -0.04;
          t2Y = -0.72 * e;
          t3X = -0.04;
          t3Y = -0.58 * e;
          t4X = -0.04;
          t4Y = -0.45 * e;
        } else {
          const spin = easeOutCubic(p) * Math.PI * 2;
          bodyRotY = -0.68 + spin;
          absX = -0.36;
          thoraxX = -0.48;
          headX = 0.66;
          jawOpen = 0.95;
          lHipX = 0.68;
          lKneeX = -1.26;
          rHipX = 0.68;
          rKneeX = -1.26;
          // Tail whips straight out horizontally at lethal torso height (1.75m radius!)
          t1X = -0.08;
          t1Y = 0.38;
          t2X = -0.04;
          t2Y = 0.28;
          t3X = -0.02;
          t3Y = 0.22;
          t4X = 0.0;
          t4Y = 0.18;
          lShX = 0.42;
          lShZ = -0.75;
          rShX = 0.42;
          rShZ = 0.75;
        }
        bladeAura = 0.9;
        dampRate = 28;
      } else if (poseMode === 'spit' || poseMode === 'mortar') {
        const p = Math.min(1, attackProgress);
        const isMortar = poseMode === 'mortar';
        if (behavior === 'windup') {
          const e = easeOutCubic(p);
          absX = e * (isMortar ? 0.34 : 0.22);
          thoraxX = -0.18 + e * (isMortar ? 0.56 : 0.42);
          neckX = e * 0.3;
          headX = 0.35 + e * (isMortar ? 0.45 : 0.2);
          jawOpen = 0.35 + e * 0.68;
          shroudFlare = 0.55 + e * 0.45;
          lShX = 0.35 - e * 0.45;
          lShZ = -0.62 - e * 0.32;
          lElX = 1.25;
          rShX = 0.35 - e * 0.45;
          rShZ = 0.62 + e * 0.32;
          rElX = 1.25;
          t1X = -0.58 - e * 0.32;
          t2X = -0.64 - e * 0.28;
          t3X = -0.62;
        } else {
          const e = easeOutCubic(p);
          absX = -0.24 * e;
          thoraxX = isMortar ? 0.18 - e * 0.36 : -0.42 * e;
          neckX = -0.26 * e;
          headX = isMortar ? 0.48 : 0.58;
          jawOpen = 1.0 - e * 0.25;
          shroudFlare = 0.88;
          lShX = 0.85;
          lShZ = -0.78;
          lElX = 0.72;
          rShX = 0.85;
          rShZ = 0.78;
          rElX = 0.72;
          t1X = -0.42;
          t2X = -0.48;
          t3X = -0.52;
        }
        dampRate = 22;
      } else if (poseMode === 'backflip') {
        useAnalyticalGround = false;
        const p = Math.min(1, attackProgress);
        bodyRotX = easeInOutQuad(p) * Math.PI * 2;
        absX = -0.35;
        thoraxX = -0.4;
        headX = 0.48;
        jawOpen = 0.9;
        lHipX = 1.05;
        lKneeX = -1.65;
        rHipX = 0.95;
        rKneeX = -1.55;
        lShX = 1.25;
        lShZ = -0.58;
        lElX = 0.85;
        rShX = 1.25;
        rShZ = 0.58;
        rElX = 0.85;
        t1X = -0.45;
        t2X = -0.55;
        dampRate = 32;
      }

      if (flinchTimer > 0) {
        thoraxX += flinchTimer * 0.65;
        thoraxZ += flinchDirX * flinchTimer * 0.55;
        jawOpen = Math.min(1, jawOpen + flinchTimer * 1.4);
      }

      // Compute exact grounded hip height from supporting leg angles so talons NEVER sink into the floor!
      const leftDrop = computeLegDrop(lHipX, lKneeX, lHockX, lHipZ);
      const rightDrop = computeLegDrop(rHipX, rKneeX, rHockX, rHipZ);
      const supportDrop = Math.max(0.58, Math.max(leftDrop, rightDrop));
      const bodyY = useAnalyticalGround
        ? supportDrop + airborneHeight + bodyYBounce
        : 1.06 + airborneHeight;

      // ── Smooth Exponential Damping Across Every Articulated Joint ──
      if (poseMode === 'tail_whip' && behavior === 'attack') {
        anim.bodyRotY = bodyRotY;
      } else {
        anim.bodyRotY = damp(anim.bodyRotY, bodyRotY, dampRate, stepDt);
      }
      if (poseMode === 'backflip') {
        anim.bodyRotX = bodyRotX;
      } else {
        anim.bodyRotX = damp(anim.bodyRotX, bodyRotX, dampRate, stepDt);
      }

      anim.bodyY = damp(anim.bodyY, bodyY, dampRate + 6, stepDt);
      anim.bodyRotZ = damp(anim.bodyRotZ, bodyRotZ, dampRate, stepDt);
      anim.absX = damp(anim.absX, absX, dampRate, stepDt);
      anim.absY = damp(anim.absY, absY, dampRate, stepDt);
      anim.absZ = damp(anim.absZ, absZ, dampRate, stepDt);
      anim.thoraxX = damp(anim.thoraxX, thoraxX, dampRate, stepDt);
      anim.thoraxY = damp(anim.thoraxY, thoraxY, dampRate, stepDt);
      anim.thoraxZ = damp(anim.thoraxZ, thoraxZ, dampRate, stepDt);
      anim.neckX = damp(anim.neckX, neckX, dampRate, stepDt);
      anim.neckY = damp(anim.neckY, neckY, dampRate, stepDt);
      anim.headX = damp(anim.headX, headX, dampRate, stepDt);
      anim.headY = damp(anim.headY, headY, dampRate, stepDt);
      anim.headZ = damp(anim.headZ, headZ, dampRate, stepDt);
      anim.jawOpen = damp(anim.jawOpen, jawOpen, 18, stepDt);
      anim.shroudFlare = damp(anim.shroudFlare, shroudFlare, 14, stepDt);

      anim.lHipX = damp(anim.lHipX, lHipX, dampRate, stepDt);
      anim.lHipZ = damp(anim.lHipZ, lHipZ, dampRate, stepDt);
      anim.lKneeX = damp(anim.lKneeX, lKneeX, dampRate, stepDt);
      anim.lHockX = damp(anim.lHockX, lHockX, dampRate, stepDt);
      anim.rHipX = damp(anim.rHipX, rHipX, dampRate, stepDt);
      anim.rHipZ = damp(anim.rHipZ, rHipZ, dampRate, stepDt);
      anim.rKneeX = damp(anim.rKneeX, rKneeX, dampRate, stepDt);
      anim.rHockX = damp(anim.rHockX, rHockX, dampRate, stepDt);

      anim.lShX = damp(anim.lShX, lShX, dampRate, stepDt);
      anim.lShY = damp(anim.lShY, lShY, dampRate, stepDt);
      anim.lShZ = damp(anim.lShZ, lShZ, dampRate, stepDt);
      anim.lElX = damp(anim.lElX, lElX, dampRate, stepDt);
      anim.rShX = damp(anim.rShX, rShX, dampRate, stepDt);
      anim.rShY = damp(anim.rShY, rShY, dampRate, stepDt);
      anim.rShZ = damp(anim.rShZ, rShZ, dampRate, stepDt);
      anim.rElX = damp(anim.rElX, rElX, dampRate, stepDt);

      anim.t1X = damp(anim.t1X, t1X, dampRate, stepDt);
      anim.t1Y = damp(anim.t1Y, t1Y, dampRate, stepDt);
      anim.t2X = damp(anim.t2X, t2X, dampRate, stepDt);
      anim.t2Y = damp(anim.t2Y, t2Y, dampRate, stepDt);
      anim.t3X = damp(anim.t3X, t3X, dampRate, stepDt);
      anim.t3Y = damp(anim.t3Y, t3Y, dampRate, stepDt);
      anim.t4X = damp(anim.t4X, t4X, dampRate, stepDt);
      anim.t4Y = damp(anim.t4Y, t4Y, dampRate, stepDt);

      // Apply transforms to hierarchy
      bodyRoot.position.y = anim.bodyY;
      bodyRoot.rotation.set(anim.bodyRotX, anim.bodyRotY, anim.bodyRotZ);
      abdomen.rotation.set(anim.absX, anim.absY, anim.absZ);
      thorax.rotation.set(anim.thoraxX, anim.thoraxY, anim.thoraxZ);
      neck.rotation.set(anim.neckX, anim.neckY, 0);
      headGroup.rotation.set(anim.headX, anim.headY, anim.headZ);

      // 4-part Predator Curved Pincer Mandibles + Articulated Hinged Lower Toothed Jaw!
      const j = anim.jawOpen;
      mandUL.rotation.set(j * 0.44, j * 0.58, j * 0.34);
      mandUR.rotation.set(j * 0.44, -j * 0.58, -j * 0.34);
      mandLL.rotation.set(-j * 0.56, j * 0.5, -j * 0.28);
      mandLR.rotation.set(-j * 0.56, -j * 0.5, j * 0.28);
      lowerJaw.rotation.x = 0.12 + j * 0.78;
      venomGullet.scale.set(0.68 + j * 0.35, 0.5 + j * 0.42, 0.9 + j * 0.32);

      // Dorsal carapace weakpoint shrouds flare open!
      leftShroud.rotation.set(0, -anim.shroudFlare * 0.65, anim.shroudFlare * 0.28);
      rightShroud.rotation.set(0, anim.shroudFlare * 0.65, -anim.shroudFlare * 0.28);

      // Digitigrade legs + ground-level foot pitch compensation
      leftLeg.hip.rotation.set(anim.lHipX, 0, anim.lHipZ);
      leftLeg.knee.rotation.set(anim.lKneeX, 0, 0);
      leftLeg.hock.rotation.set(anim.lHockX, 0, 0);
      leftLeg.foot.rotation.set(
        airborneHeight > 0.25 ? -0.35 : -(anim.lHipX + anim.lKneeX + anim.lHockX),
        0,
        -anim.lHipZ
      );

      rightLeg.hip.rotation.set(anim.rHipX, 0, anim.rHipZ);
      rightLeg.knee.rotation.set(anim.rKneeX, 0, 0);
      rightLeg.hock.rotation.set(anim.rHockX, 0, 0);
      rightLeg.foot.rotation.set(
        airborneHeight > 0.25 ? -0.35 : -(anim.rHipX + anim.rKneeX + anim.rHockX),
        0,
        -anim.rHipZ
      );

      // Scythe arms (strict 1-DOF human elbow hinges)
      leftArm.shoulder.rotation.set(anim.lShX, anim.lShY, anim.lShZ);
      leftArm.elbow.rotation.set(anim.lElX, 0, 0);
      rightArm.shoulder.rotation.set(anim.rShX, anim.rShY, anim.rShZ);
      rightArm.elbow.rotation.set(anim.rElX, 0, 0);

      // 4-segment scorpion-raptor tail
      tail1.rotation.set(anim.t1X, anim.t1Y, 0);
      tail2.rotation.set(anim.t2X, anim.t2Y, 0);
      tail3.rotation.set(anim.t3X, anim.t3Y, 0);
      tail4.rotation.set(anim.t4X, anim.t4Y, 0);

      // Live pulsing bio-luminescence (vivid toxic emerald without ACES white clipping!)
      const heartPulse = 1 + Math.sin(elapsed * (frenzied ? 13 : 6.5)) * 0.14;
      venomHeart.scale.set(0.92 * heartPulse, 1.48 * heartPulse, 0.72 * heartPulse);
      venomGlowMat.emissiveIntensity =
        (frenzied ? 2.65 : 1.95) + Math.sin(elapsed * 8.5) * 0.35 + predatorCharge * 0.65;
      eyeGlowMat.emissiveIntensity =
        (frenzied ? 2.55 : 1.95) + (behavior === 'windup' || behavior === 'attack' ? 0.65 : 0);

      const coronaOp = Math.min(0.84, bladeAura * (0.86 + Math.sin(elapsed * 14) * 0.14));
      leftArm.coronaMat.opacity = coronaOp;
      rightArm.coronaMat.opacity = coronaOp;
      bladeMat.emissiveIntensity = 0.06 + coronaOp * 0.18;

      weakpointMat.emissiveIntensity = weakpointBroken
        ? 0.22
        : 2.15 + Math.sin(elapsed * 10.5) * 0.65 + (weakpointExposed ? 1.15 : 0) + (frenzied ? 0.6 : 0);
    },
    dispose() {
      for (const g of ownedGeos) g.dispose();
      for (const m of ownedMats) m.dispose();
    },
  };
}
