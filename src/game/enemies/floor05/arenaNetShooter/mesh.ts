import * as THREE from 'three';
import {
  createBeveledBox,
  createCurvedPanelGeometry,
  createLoftedAnatomy,
  createSculptedHand,
  createStrapTube,
} from '../../../core/sculptUtils';
import { createEnemyContactShadow, createEnemyHitboxMesh } from '../../core/enemyMeshShared';
import type { EnemyAnimationInput, EnemyRigHandle } from '../../core/types';
import type { Floor05EnemyMaterials } from '../materials';
import type { NetShooterTextureSuite } from './textures';

export type NetShooterPoseMode =
  | 'aim_hold'
  | 'patrol'
  | 'strafe'
  | 'net_volley'
  | 'snipe_kneel'
  | 'mortar_lob'
  | 'tesla_burst'
  | 'shock_nova'
  | 'trident_cleave'
  | 'blink_vault';

export interface ArenaNetShooterRigHandle extends EnemyRigHandle {
  setAimLaser: (active: boolean, length?: number) => void;
  setChargeLevel: (level: number) => void;
  setPoseMode: (mode: NetShooterPoseMode) => void;
  setEnragedIntensity: (intensity: number) => void;
  getTridentTipWorldPos: (out: THREE.Vector3) => THREE.Vector3;
}

interface BipedLegRig {
  hip: THREE.Group;
  knee: THREE.Group;
  ankle: THREE.Group;
  thrusterCone: THREE.Mesh;
}

interface ArticulatedArmRig {
  shoulder: THREE.Group;
  elbow: THREE.Group;
  wrist: THREE.Group;
  hand: THREE.Group;
}

interface AuraMoteState {
  mesh: THREE.Mesh;
  angleOffset: number;
  radius: number;
  speed: number;
  riseSpeed: number;
  phase: number;
}

const THIGH_LEN = 0.44;
const SHIN_LEN = 0.44;
const FOOT_H = 0.084;
const KNEE_PAD_H = 0.092;
const UPPER_ARM_LEN = 0.295;
const FOREARM_LEN = 0.285;

function damp(curr: number, target: number, lambda: number, dt: number): number {
  const f = 1 - Math.exp(-lambda * Math.min(0.1, Math.max(0.001, dt)));
  return curr + (target - curr) * f;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

/**
 * Exact analytical vertical ground reach from hip center to lowest grounded contact
 * (boot sole or kneeling armored kneecap) so boots NEVER float or sink into the arena floor.
 */
function computeBipedLegDrop(hipX: number, kneeX: number, hipZ: number): number {
  const cosZ = Math.cos(hipZ);
  const kneeDrop = THIGH_LEN * Math.cos(hipX) * cosZ;
  const shinDrop = SHIN_LEN * Math.cos(hipX + kneeX) * cosZ;
  const bootReach = kneeDrop + shinDrop + FOOT_H;
  const kneeReach = kneeDrop + KNEE_PAD_H;
  return Math.max(bootReach, kneeReach);
}

// Reusable scratch vectors/matrices for allocation-free analytical 2-bone arm IK
const _ikD = new THREE.Vector3();
const _ikDir = new THREE.Vector3();
const _ikPolePerp = new THREE.Vector3();
const _ikElbowPos = new THREE.Vector3();
const _ikUDir = new THREE.Vector3();
const _ikFDir = new THREE.Vector3();
const _ikXAxis = new THREE.Vector3();
const _ikYAxis = new THREE.Vector3();
const _ikZAxis = new THREE.Vector3();
const _ikMat = new THREE.Matrix4();
const _ikInvQ = new THREE.Quaternion();
const _ikFLocal = new THREE.Vector3();
const _ikDown = new THREE.Vector3(0, -1, 0);

/**
 * Analytical 2-bone human arm IK in `torso` local space:
 * Keeps both sculpted armored hands locked cleanly onto the Volt-Rete grips in every pose
 * (patrol, kneeling snipe, balcony pitch, mortar lob, shock-nova slam, trident cleave).
 */
function solveTwoBoneArm(
  arm: ArticulatedArmRig,
  shoulderPos: THREE.Vector3,
  targetPos: THREE.Vector3,
  poleHint: THREE.Vector3
): void {
  _ikD.subVectors(targetPos, shoulderPos);
  const rawDist = _ikD.length();
  const maxReach = UPPER_ARM_LEN + FOREARM_LEN - 0.006;
  const minReach = Math.abs(UPPER_ARM_LEN - FOREARM_LEN) + 0.05;
  const d = clamp(rawDist, minReach, maxReach);
  if (rawDist > 1e-4) {
    _ikDir.copy(_ikD).multiplyScalar(1 / rawDist);
  } else {
    _ikDir.set(0, -1, 0);
  }

  const cosAlpha = clamp(
    (UPPER_ARM_LEN * UPPER_ARM_LEN + d * d - FOREARM_LEN * FOREARM_LEN) / (2 * UPPER_ARM_LEN * d),
    -1,
    1
  );
  const sinAlpha = Math.sqrt(Math.max(0, 1 - cosAlpha * cosAlpha));

  const poleDot = poleHint.dot(_ikDir);
  _ikPolePerp.copy(poleHint).addScaledVector(_ikDir, -poleDot);
  if (_ikPolePerp.lengthSq() < 1e-5) {
    _ikPolePerp.set(0, -1, 0.5).addScaledVector(_ikDir, -_ikDir.y);
  }
  _ikPolePerp.normalize();

  _ikElbowPos
    .copy(shoulderPos)
    .addScaledVector(_ikDir, UPPER_ARM_LEN * cosAlpha)
    .addScaledVector(_ikPolePerp, UPPER_ARM_LEN * sinAlpha);

  _ikUDir.subVectors(_ikElbowPos, shoulderPos).normalize();
  _ikFDir.subVectors(targetPos, _ikElbowPos);
  if (_ikFDir.lengthSq() > 1e-6) {
    _ikFDir.normalize();
  } else {
    _ikFDir.copy(_ikUDir);
  }

  _ikYAxis.copy(_ikUDir).negate();
  _ikXAxis.crossVectors(_ikUDir, _ikPolePerp);
  if (_ikXAxis.lengthSq() < 1e-5) {
    _ikXAxis.set(1, 0, 0);
  } else {
    _ikXAxis.normalize();
  }
  _ikZAxis.crossVectors(_ikXAxis, _ikYAxis).normalize();
  _ikXAxis.crossVectors(_ikYAxis, _ikZAxis).normalize();

  _ikMat.makeBasis(_ikXAxis, _ikYAxis, _ikZAxis);
  arm.shoulder.quaternion.setFromRotationMatrix(_ikMat);

  _ikInvQ.copy(arm.shoulder.quaternion).invert();
  _ikFLocal.copy(_ikFDir).applyQuaternion(_ikInvQ).normalize();
  arm.elbow.quaternion.setFromUnitVectors(_ikDown, _ikFLocal);
}

function buildSculptedRetiariusLeg(
  side: -1 | 1,
  armorMat: THREE.Material,
  bronzeMat: THREE.Material,
  carbonSuitMat: THREE.Material,
  darkJointMat: THREE.Material,
  opticCyanMat: THREE.Material,
  ownedGeos: THREE.BufferGeometry[]
): BipedLegRig {
  const hip = new THREE.Group();

  // Muscular athletic thigh in deep dark carbon-weave undersuit (strictly ascending y for outward normals!)
  const thighGeo = createLoftedAnatomy(
    [
      { y: -THIGH_LEN, rx: 0.066, rz: 0.072, squareness: 2.25 },
      { y: -0.32, rx: 0.082, rz: 0.088, squareness: 2.38 },
      { y: -0.14, rx: 0.098, rz: 0.104, squareness: 2.5, pinchFront: 0.015 },
      { y: 0.03, rx: 0.1, rz: 0.106, squareness: 2.35 },
    ],
    14
  );
  ownedGeos.push(thighGeo);
  const thigh = new THREE.Mesh(thighGeo, carbonSuitMat);
  thigh.castShadow = true;
  hip.add(thigh);

  // Sculpted wrap-around obsidian-cobalt cuisse thigh armor shell
  const cuisseGeo = createCurvedPanelGeometry(
    [
      { y: -0.37, rx: 0.086, rz: 0.094, thickness: 0.02 },
      { y: -0.2, rx: 0.105, rz: 0.112, thickness: 0.026 },
      { y: -0.04, rx: 0.106, rz: 0.114, thickness: 0.022 },
    ],
    side < 0 ? Math.PI * 0.42 : -Math.PI * 0.58,
    side < 0 ? Math.PI * 1.58 : Math.PI * 0.58,
    12
  );
  ownedGeos.push(cuisseGeo);
  const cuisse = new THREE.Mesh(cuisseGeo, armorMat);
  cuisse.castShadow = true;
  hip.add(cuisse);

  // Bronze cuisse trim strap + outer thigh stasis-cell holster
  const holsterGeo = createBeveledBox(0.044, 0.16, 0.094, 0.01);
  ownedGeos.push(holsterGeo);
  const holster = new THREE.Mesh(holsterGeo, bronzeMat);
  holster.position.set(side * 0.108, -0.2, 0.005);
  hip.add(holster);

  const cellGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.115, 8);
  ownedGeos.push(cellGeo);
  const cellGlow = new THREE.Mesh(cellGeo, opticCyanMat);
  cellGlow.position.set(side * 0.126, -0.2, -0.016);
  hip.add(cellGlow);

  // Articulated Knee Joint (dark recessed mechanical core hidden inside sculpted winged poleyn!)
  const knee = new THREE.Group();
  knee.position.set(0, -THIGH_LEN, 0);
  hip.add(knee);

  const kneeCoreGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.106, 10);
  ownedGeos.push(kneeCoreGeo);
  const kneeCore = new THREE.Mesh(kneeCoreGeo, darkJointMat);
  kneeCore.rotation.z = Math.PI * 0.5;
  knee.add(kneeCore);

  // Sculpted angular winged Roman cyber-gladiator poleyn kneeguard
  const kneeCapGeo = createBeveledBox(0.114, 0.132, 0.072, 0.016);
  ownedGeos.push(kneeCapGeo);
  const kneeCap = new THREE.Mesh(kneeCapGeo, armorMat);
  kneeCap.position.set(0, 0.014, -0.068);
  kneeCap.rotation.x = 0.12;
  kneeCap.castShadow = true;
  knee.add(kneeCap);

  const kneeBladeGeo = createBeveledBox(0.036, 0.152, 0.042, 0.008);
  ownedGeos.push(kneeBladeGeo);
  const kneeBlade = new THREE.Mesh(kneeBladeGeo, bronzeMat);
  kneeBlade.position.set(0, 0.022, -0.098);
  kneeBlade.rotation.x = -0.1;
  knee.add(kneeBlade);

  const kneeFinGeo = new THREE.ConeGeometry(0.022, 0.095, 5);
  ownedGeos.push(kneeFinGeo);
  const kneeFin = new THREE.Mesh(kneeFinGeo, bronzeMat);
  kneeFin.position.set(0, 0.095, -0.094);
  kneeFin.rotation.x = -0.24;
  knee.add(kneeFin);

  // Sculpted armored shin greave with sharp front crest & athletic calf taper (ascending y!)
  const shinGeo = createLoftedAnatomy(
    [
      { y: -SHIN_LEN, rx: 0.052, rz: 0.06, squareness: 2.25 },
      { y: -0.32, rx: 0.068, rz: 0.078, squareness: 2.45, pinchFront: 0.018 },
      { y: -0.15, rx: 0.082, rz: 0.096, squareness: 2.6, pinchFront: 0.026 },
      { y: 0.01, rx: 0.07, rz: 0.078, squareness: 2.35 },
    ],
    14
  );
  ownedGeos.push(shinGeo);
  const shin = new THREE.Mesh(shinGeo, armorMat);
  shin.castShadow = true;
  knee.add(shin);

  const shinTrimGeo = createBeveledBox(0.03, 0.31, 0.03, 0.006);
  ownedGeos.push(shinTrimGeo);
  const shinTrim = new THREE.Mesh(shinTrimGeo, bronzeMat);
  shinTrim.position.set(0, -0.21, -0.092);
  shinTrim.rotation.x = -0.04;
  knee.add(shinTrim);

  // Rear calf Voltaic Vault-Thruster Housing & Live Ignition Exhaust Cone!
  const calfHousingGeo = createBeveledBox(0.056, 0.175, 0.064, 0.01);
  ownedGeos.push(calfHousingGeo);
  const calfHousing = new THREE.Mesh(calfHousingGeo, darkJointMat);
  calfHousing.position.set(0, -0.165, 0.092);
  calfHousing.rotation.x = 0.22;
  knee.add(calfHousing);

  const calfTrimGeo = createBeveledBox(0.064, 0.042, 0.072, 0.008);
  ownedGeos.push(calfTrimGeo);
  const calfTrim = new THREE.Mesh(calfTrimGeo, bronzeMat);
  calfTrim.position.set(0, -0.225, 0.105);
  calfTrim.rotation.x = 0.22;
  knee.add(calfTrim);

  const thrusterConeGeo = new THREE.ConeGeometry(0.026, 0.17, 7);
  ownedGeos.push(thrusterConeGeo);
  const thrusterCone = new THREE.Mesh(thrusterConeGeo, opticCyanMat);
  thrusterCone.position.set(0, -0.305, 0.125);
  thrusterCone.rotation.x = Math.PI + 0.22;
  thrusterCone.scale.setScalar(0.32);
  knee.add(thrusterCone);

  // Articulated Ankle + Heavy Sculpted Clawed Gladiator Sabaton Boot
  const ankle = new THREE.Group();
  ankle.position.set(0, -SHIN_LEN, 0);
  knee.add(ankle);

  const bootSoleGeo = createBeveledBox(0.124, 0.042, 0.265, 0.01);
  ownedGeos.push(bootSoleGeo);
  const bootSole = new THREE.Mesh(bootSoleGeo, darkJointMat);
  bootSole.position.set(0, -FOOT_H + 0.021, -0.048);
  bootSole.castShadow = true;
  ankle.add(bootSole);

  const bootUpperGeo = createBeveledBox(0.114, 0.064, 0.215, 0.014);
  ownedGeos.push(bootUpperGeo);
  const bootUpper = new THREE.Mesh(bootUpperGeo, armorMat);
  bootUpper.position.set(0, -0.036, -0.042);
  bootUpper.castShadow = true;
  ankle.add(bootUpper);

  const toePlateGeo = createBeveledBox(0.104, 0.048, 0.09, 0.012);
  ownedGeos.push(toePlateGeo);
  const toePlate = new THREE.Mesh(toePlateGeo, bronzeMat);
  toePlate.position.set(0, -0.046, -0.145);
  toePlate.rotation.x = 0.16;
  ankle.add(toePlate);

  // Twin steel catwalk-grip toe claws
  const clawGeo = new THREE.ConeGeometry(0.013, 0.068, 5);
  ownedGeos.push(clawGeo);
  for (const cx of [-0.034, 0.034]) {
    const claw = new THREE.Mesh(clawGeo, darkJointMat);
    claw.rotation.x = -Math.PI * 0.46;
    claw.position.set(cx, -FOOT_H + 0.02, -0.202);
    ankle.add(claw);
  }

  const heelSpurGeo = createBeveledBox(0.044, 0.044, 0.078, 0.008);
  ownedGeos.push(heelSpurGeo);
  const heelSpur = new THREE.Mesh(heelSpurGeo, bronzeMat);
  heelSpur.position.set(0, -0.046, 0.082);
  ankle.add(heelSpur);

  return { hip, knee, ankle, thrusterCone };
}

function buildArticulatedHumanArm(
  side: -1 | 1,
  armorMat: THREE.Material,
  bronzeMat: THREE.Material,
  carbonSuitMat: THREE.Material,
  darkJointMat: THREE.Material,
  opticCyanMat: THREE.Material,
  ownedGeos: THREE.BufferGeometry[]
): ArticulatedArmRig {
  const shoulder = new THREE.Group();

  // Muscular lofted human bicep in dark carbon-weave undersuit (strictly ascending y!)
  const upperArmGeo = createLoftedAnatomy(
    [
      { y: -UPPER_ARM_LEN, rx: 0.052, rz: 0.054, squareness: 2.2 },
      { y: -0.13, rx: 0.068, rz: 0.07, squareness: 2.38 },
      { y: 0.02, rx: 0.074, rz: 0.076, squareness: 2.3 },
    ],
    12
  );
  ownedGeos.push(upperArmGeo);
  const upperArm = new THREE.Mesh(upperArmGeo, carbonSuitMat);
  upperArm.castShadow = true;
  shoulder.add(upperArm);

  // Authentic Roman Retiarius Manica segmented arm-lames (left arm heavily bronze-armored, right obsidian-steel!)
  for (let lame = 0; lame < 3; lame++) {
    const y0 = -0.26 + lame * 0.078;
    const lameGeo = createCurvedPanelGeometry(
      [
        { y: y0, rx: 0.068 + lame * 0.006, rz: 0.072 + lame * 0.006, thickness: 0.017 },
        { y: y0 + 0.068, rx: 0.074 + lame * 0.006, rz: 0.078 + lame * 0.006, thickness: 0.019 },
      ],
      side < 0 ? Math.PI * 0.35 : -Math.PI * 0.65,
      side < 0 ? Math.PI * 1.65 : Math.PI * 0.65,
      10
    );
    ownedGeos.push(lameGeo);
    const lameMesh = new THREE.Mesh(
      lameGeo,
      side < 0 ? (lame === 1 ? armorMat : bronzeMat) : lame === 1 ? bronzeMat : armorMat
    );
    lameMesh.castShadow = true;
    shoulder.add(lameMesh);
  }

  // Articulated Elbow shrouded cleanly by overlapping angular couter armor (ZERO exposed toy ball-joint!)
  const elbow = new THREE.Group();
  elbow.position.set(0, -UPPER_ARM_LEN, 0);
  shoulder.add(elbow);

  const elbowCoreGeo = new THREE.SphereGeometry(0.044, 10, 8);
  ownedGeos.push(elbowCoreGeo);
  const elbowCore = new THREE.Mesh(elbowCoreGeo, darkJointMat);
  elbow.add(elbowCore);

  const couterShellGeo = createCurvedPanelGeometry(
    [
      { y: -0.055, rx: 0.062, rz: 0.066, thickness: 0.018 },
      { y: 0.005, rx: 0.072, rz: 0.076, thickness: 0.022 },
      { y: 0.055, rx: 0.06, rz: 0.064, thickness: 0.016 },
    ],
    -Math.PI * 0.25,
    Math.PI * 1.25,
    10
  );
  ownedGeos.push(couterShellGeo);
  const couterShell = new THREE.Mesh(couterShellGeo, armorMat);
  couterShell.castShadow = true;
  elbow.add(couterShell);

  const couterFinGeo = createBeveledBox(0.058, 0.092, 0.054, 0.012);
  ownedGeos.push(couterFinGeo);
  const couterFin = new THREE.Mesh(couterFinGeo, bronzeMat);
  couterFin.position.set(side * 0.024, 0.004, 0.044);
  elbow.add(couterFin);

  // Sculpted Armored Forearm Vambrace along -Y (ascending y!)
  const forearmGeo = createLoftedAnatomy(
    [
      { y: -FOREARM_LEN, rx: 0.044, rz: 0.046, squareness: 2.3 },
      { y: -0.12, rx: 0.066, rz: 0.072, squareness: 2.55 },
      { y: 0.01, rx: 0.058, rz: 0.062, squareness: 2.35 },
    ],
    12
  );
  ownedGeos.push(forearmGeo);
  const forearm = new THREE.Mesh(forearmGeo, armorMat);
  forearm.castShadow = true;
  elbow.add(forearm);

  const vambraceFinGeo = createBeveledBox(0.026, 0.215, 0.046, 0.007);
  ownedGeos.push(vambraceFinGeo);
  const vambraceFin = new THREE.Mesh(vambraceFinGeo, bronzeMat);
  vambraceFin.position.set(side * 0.062, -0.135, 0);
  elbow.add(vambraceFin);

  const vambraceGlowGeo = createBeveledBox(0.012, 0.165, 0.015, 0.003);
  ownedGeos.push(vambraceGlowGeo);
  const vambraceGlow = new THREE.Mesh(vambraceGlowGeo, opticCyanMat);
  vambraceGlow.position.set(side * 0.074, -0.135, -0.01);
  elbow.add(vambraceGlow);

  // Wrist & Real Sculpted Armored Hand (`createSculptedHand`)
  const wrist = new THREE.Group();
  wrist.position.set(0, -FOREARM_LEN, 0);
  elbow.add(wrist);

  const hand = createSculptedHand(side, carbonSuitMat, bronzeMat, darkJointMat);
  hand.scale.setScalar(1.08);
  wrist.add(hand);

  return { shoulder, elbow, wrist, hand };
}

export function buildArenaNetShooterRig(
  enemyId: string,
  mats: Floor05EnemyMaterials,
  textures: NetShooterTextureSuite
): ArenaNetShooterRigHandle {
  const root = new THREE.Group();
  root.name = `ArenaNetShooter_${enemyId}`;
  const ownedGeos: THREE.BufferGeometry[] = [];
  const ownedMats: THREE.Material[] = [];
  const hitboxes: THREE.Mesh[] = [];

  // Rich high-contrast obsidian-cobalt Retiarius hex-snare armor
  const armorMat = mats.createFlashArmorMaterial(0x9fb8d4, 0.68, 0.38, 'none');
  armorMat.map = textures.harnessMap;
  armorMat.bumpMap = textures.harnessBump;
  armorMat.bumpScale = 0.04;
  armorMat.roughnessMap = textures.harnessRoughness;

  // Hammered antique gladiator bronze trim & Galerus blades
  const bronzeMat = mats.createFlashArmorMaterial(0xe0aa54, 0.84, 0.28, 'none');
  bronzeMat.map = textures.bronzeMap;
  bronzeMat.bumpMap = textures.bronzeBump;
  bronzeMat.bumpScale = 0.028;

  // Deep obsidian-slate carbon tactical undersuit (replaces washed-out silver-grey!)
  const carbonSuitMat = new THREE.MeshStandardMaterial({
    color: 0x1b2432,
    metalness: 0.24,
    roughness: 0.66,
  });

  // Dark forged gunmetal joints (blends cleanly under armor plates, never bright toy silver!)
  const darkJointMat = new THREE.MeshStandardMaterial({
    color: 0x263140,
    metalness: 0.78,
    roughness: 0.36,
  });

  // Tattered dark obsidian-indigo Retiarius snare-net half-cloak fabric with dedicated snare-cord weave texture
  const cloakMat = new THREE.MeshStandardMaterial({
    color: 0xbcd4eb,
    map: textures.mantleMap,
    roughness: 0.78,
    metalness: 0.18,
    side: THREE.DoubleSide,
  });

  // Forged gunmetal-obsidian weapon chassis
  const weaponChassisMat = mats.createFlashArmorMaterial(0x7c92ac, 0.78, 0.3, 'none');
  weaponChassisMat.map = textures.weaponMap;

  // Deep matte obsidian skull-mask recess so electric-cyan arachnid optics burn wickedly
  const skullRecessMat = new THREE.MeshStandardMaterial({
    color: 0x070b12,
    metalness: 0.18,
    roughness: 0.9,
  });

  // Calibrated vivid electric-cyan optics/arcs (ACES-safe emissiveIntensity -> saturated cyan, ZERO whiteout!)
  const opticCyanMat = new THREE.MeshStandardMaterial({
    color: 0x00c8ff,
    emissive: 0x00a6ff,
    emissiveIntensity: 1.48,
    metalness: 0.08,
    roughness: 0.16,
  });

  // Dorsal Tesla Snare-Coil weakpoint material
  const weakpointMat = mats.createWeakpointMaterial(0x00d4ff, 0x0284c7);
  weakpointMat.emissiveIntensity = 1.75;

  const laserMat = new THREE.MeshBasicMaterial({
    color: 0x00ccff,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const webArcMat = new THREE.MeshBasicMaterial({
    color: 0x00d8ff,
    transparent: true,
    opacity: 0.54,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const overdriveHaloMat = new THREE.MeshBasicMaterial({
    color: 0x00ccff,
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const auraRingMat = new THREE.MeshBasicMaterial({
    map: textures.auraRingMap,
    color: 0x00d4ff,
    transparent: true,
    opacity: 0.44,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const auraMoteMat = new THREE.MeshBasicMaterial({
    color: 0x00d8ff,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  ownedMats.push(
    armorMat,
    bronzeMat,
    carbonSuitMat,
    darkJointMat,
    cloakMat,
    weaponChassisMat,
    skullRecessMat,
    opticCyanMat,
    weakpointMat,
    laserMat,
    webArcMat,
    overdriveHaloMat,
    auraRingMat,
    auraMoteMat
  );

  // Ground contact shadow + Saturated Electric-Cyan Retiarius Snare-Web Hunter Aura Sigil
  const shadow = createEnemyContactShadow(0.8, mats.shadowDisc);
  root.add(shadow);

  const auraRingGeo = new THREE.PlaneGeometry(2.15, 2.15);
  auraRingGeo.rotateX(-Math.PI * 0.5);
  ownedGeos.push(auraRingGeo);
  const auraRing = new THREE.Mesh(auraRingGeo, auraRingMat);
  auraRing.position.y = 0.025;
  root.add(auraRing);

  // 14 Crisp Electric-Cyan Static Plasma Embers hugging close around the executioner's armor
  const auraMotes: AuraMoteState[] = [];
  const moteGeo = new THREE.OctahedronGeometry(0.015, 0);
  ownedGeos.push(moteGeo);
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(moteGeo, auraMoteMat);
    m.scale.set(0.65, 1.55, 0.65);
    root.add(m);
    auraMotes.push({
      mesh: m,
      angleOffset: (i / 14) * Math.PI * 2,
      radius: 0.32 + (i % 4) * 0.1,
      speed: 1.05 + (i % 4) * 0.34,
      riseSpeed: 0.56 + (i % 3) * 0.24,
      phase: (i * 0.37) % 1,
    });
  }

  // ==================== PELVIS & ARTICULATED HUMAN LEGS ====================
  const pelvis = new THREE.Group();
  pelvis.position.set(0, THIGH_LEN + SHIN_LEN + FOOT_H, 0);
  root.add(pelvis);

  // Sculpted contoured pelvis core (ascending y!)
  const hipsGeo = createLoftedAnatomy(
    [
      { y: -0.1, rx: 0.165, rz: 0.132, squareness: 2.5 },
      { y: 0.0, rx: 0.198, rz: 0.152, squareness: 2.7 },
      { y: 0.11, rx: 0.184, rz: 0.142, squareness: 2.55 },
    ],
    14
  );
  ownedGeos.push(hipsGeo);
  const hipsMesh = new THREE.Mesh(hipsGeo, armorMat);
  hipsMesh.castShadow = true;
  pelvis.add(hipsMesh);

  // Heavy Roman Gladiator Cingulum Belt with Beveled Obsidian Buckle & Glowing Cyan Core
  const beltGeo = createBeveledBox(0.4, 0.088, 0.305, 0.018);
  ownedGeos.push(beltGeo);
  const belt = new THREE.Mesh(beltGeo, bronzeMat);
  belt.position.set(0, 0.055, 0);
  belt.castShadow = true;
  pelvis.add(belt);

  const beltBuckleGeo = createBeveledBox(0.112, 0.102, 0.048, 0.012);
  ownedGeos.push(beltBuckleGeo);
  const beltBuckle = new THREE.Mesh(beltBuckleGeo, darkJointMat);
  beltBuckle.position.set(0, 0.054, -0.154);
  pelvis.add(beltBuckle);

  const beltCoreGeo = createBeveledBox(0.052, 0.046, 0.026, 0.006);
  ownedGeos.push(beltCoreGeo);
  const beltCore = new THREE.Mesh(beltCoreGeo, opticCyanMat);
  beltCore.position.set(0, 0.054, -0.172);
  pelvis.add(beltCore);

  // Layered Retiarius Gladiator Pteruges (front armored groin-tasset + curved wrap-around hip-plates)
  const frontTasset = new THREE.Group();
  frontTasset.position.set(0, -0.015, -0.146);
  pelvis.add(frontTasset);

  const tassetMainGeo = createBeveledBox(0.158, 0.29, 0.032, 0.009);
  ownedGeos.push(tassetMainGeo);
  const tassetMain = new THREE.Mesh(tassetMainGeo, armorMat);
  tassetMain.position.set(0, -0.14, 0);
  tassetMain.castShadow = true;
  frontTasset.add(tassetMain);

  const tassetTrimGeo = createBeveledBox(0.118, 0.255, 0.018, 0.005);
  ownedGeos.push(tassetTrimGeo);
  const tassetTrim = new THREE.Mesh(tassetTrimGeo, bronzeMat);
  tassetTrim.position.set(0, -0.145, -0.016);
  frontTasset.add(tassetTrim);

  const sideTassets: THREE.Group[] = [];
  for (const sx of [-1, 1] as const) {
    const hipTasset = new THREE.Group();
    hipTasset.position.set(sx * 0.11, -0.01, 0);
    pelvis.add(hipTasset);

    const curvedTassetGeo = createCurvedPanelGeometry(
      [
        { y: -0.25, rx: 0.132, rz: 0.148, thickness: 0.022 },
        { y: -0.11, rx: 0.148, rz: 0.162, thickness: 0.026 },
        { y: 0.02, rx: 0.132, rz: 0.148, thickness: 0.022 },
      ],
      sx < 0 ? Math.PI * 0.48 : -Math.PI * 0.52,
      sx < 0 ? Math.PI * 1.52 : Math.PI * 0.52,
      10
    );
    ownedGeos.push(curvedTassetGeo);
    const tassetShell = new THREE.Mesh(curvedTassetGeo, armorMat);
    tassetShell.castShadow = true;
    hipTasset.add(tassetShell);

    const tassetRibGeo = createBeveledBox(0.024, 0.21, 0.056, 0.006);
    ownedGeos.push(tassetRibGeo);
    const tassetRib = new THREE.Mesh(tassetRibGeo, bronzeMat);
    tassetRib.position.set(sx * 0.148, -0.115, 0);
    hipTasset.add(tassetRib);

    sideTassets.push(hipTasset);
  }

  // Athletic Wider-Stance Gladiator Legs
  const leftLeg = buildSculptedRetiariusLeg(
    -1,
    armorMat,
    bronzeMat,
    carbonSuitMat,
    darkJointMat,
    opticCyanMat,
    ownedGeos
  );
  leftLeg.hip.position.set(-0.145, -0.015, 0);
  pelvis.add(leftLeg.hip);

  const rightLeg = buildSculptedRetiariusLeg(
    1,
    armorMat,
    bronzeMat,
    carbonSuitMat,
    darkJointMat,
    opticCyanMat,
    ownedGeos
  );
  rightLeg.hip.position.set(0.145, -0.015, 0);
  pelvis.add(rightLeg.hip);

  // ==================== CONTINUOUS SCULPTED CYBER-GLADIATOR TORSO (ZERO WAIST GAP!) ====================
  const torso = new THREE.Group();
  torso.position.set(0, 0.085, 0);
  pelvis.add(torso);

  // Extends deeply down to y = -0.08 inside the pelvis belt so extreme lean/cleave/stagger NEVER shows a seam!
  const coreTorsoGeo = createLoftedAnatomy(
    [
      { y: -0.08, rx: 0.172, rz: 0.138, squareness: 2.45 },
      { y: 0.05, rx: 0.178, rz: 0.142, squareness: 2.5 },
      { y: 0.19, rx: 0.195, rz: 0.152, squareness: 2.58 },
      { y: 0.36, rx: 0.244, rz: 0.176, squareness: 2.7, pinchFront: 0.028 },
      { y: 0.52, rx: 0.268, rz: 0.182, squareness: 2.8, pinchFront: 0.032 },
      { y: 0.61, rx: 0.212, rz: 0.148, squareness: 2.4 },
    ],
    20
  );
  ownedGeos.push(coreTorsoGeo);
  const coreTorso = new THREE.Mesh(coreTorsoGeo, carbonSuitMat);
  coreTorso.castShadow = true;
  torso.add(coreTorso);

  // Curved Interlocking Abdominal Cuirass Lames wrapping cleanly around front & obliques!
  for (let i = 0; i < 3; i++) {
    const y0 = -0.01 + i * 0.075;
    const abLameGeo = createCurvedPanelGeometry(
      [
        { y: y0, rx: 0.184 + i * 0.008, rz: 0.148 + i * 0.006, thickness: 0.022 },
        { y: y0 + 0.064, rx: 0.192 + i * 0.009, rz: 0.154 + i * 0.006, thickness: 0.024 },
      ],
      -Math.PI * 0.94,
      -Math.PI * 0.06,
      14
    );
    ownedGeos.push(abLameGeo);
    const abLame = new THREE.Mesh(abLameGeo, i === 1 ? bronzeMat : armorMat);
    abLame.castShadow = true;
    torso.add(abLame);
  }

  // Sculpted Lower-Back Dorsal Lumbar Spine Vertebrae & Flanking Ribs (bridges Tesla pack cleanly to rear belt!)
  for (let v = 0; v < 3; v++) {
    const vy = 0.045 + v * 0.072;
    const vertGeo = createBeveledBox(0.116 - v * 0.008, 0.058, 0.056, 0.011);
    ownedGeos.push(vertGeo);
    const vert = new THREE.Mesh(vertGeo, v === 1 ? bronzeMat : armorMat);
    vert.position.set(0, vy, 0.154 + v * 0.007);
    vert.rotation.x = -0.14;
    vert.castShadow = true;
    torso.add(vert);
  }
  const lumbarRibGeo = createBeveledBox(0.044, 0.225, 0.042, 0.009);
  ownedGeos.push(lumbarRibGeo);
  for (const sx of [-1, 1] as const) {
    const lRib = new THREE.Mesh(lumbarRibGeo, darkJointMat);
    lRib.position.set(sx * 0.095, 0.118, 0.148);
    lRib.rotation.set(-0.08, sx * 0.28, sx * 0.06);
    lRib.castShadow = true;
    torso.add(lRib);
  }

  // Dorsal Electric-Cyan Overdrive Corona Halo framing behind shoulders & Tesla pylons in Phase 2 (never slices torso!)
  const overdriveHaloGeo = new THREE.TorusGeometry(0.32, 0.005, 5, 10);
  ownedGeos.push(overdriveHaloGeo);
  const overdriveHalo = new THREE.Mesh(overdriveHaloGeo, overdriveHaloMat);
  overdriveHalo.position.set(0, 0.72, 0.24);
  overdriveHalo.visible = false;
  torso.add(overdriveHalo);

  // Contoured Layered Obsidian-Cobalt Gladiator Pectoral Cuirass
  const cuirassGeo = createCurvedPanelGeometry(
    [
      { y: 0.21, rx: 0.212, rz: 0.164, thickness: 0.028 },
      { y: 0.37, rx: 0.256, rz: 0.188, thickness: 0.034 },
      { y: 0.53, rx: 0.274, rz: 0.19, thickness: 0.03 },
      { y: 0.6, rx: 0.226, rz: 0.158, thickness: 0.022 },
    ],
    -Math.PI * 0.92,
    -Math.PI * 0.08,
    18
  );
  ownedGeos.push(cuirassGeo);
  const cuirass = new THREE.Mesh(cuirassGeo, armorMat);
  cuirass.castShadow = true;
  torso.add(cuirass);

  // Armored Sculpted High Gorget Collar + Bronze Clavicle Flanges
  const gorgetGeo = createCurvedPanelGeometry(
    [
      { y: 0.55, rx: 0.156, rz: 0.14, thickness: 0.024 },
      { y: 0.65, rx: 0.172, rz: 0.154, thickness: 0.024 },
    ],
    -Math.PI * 0.96,
    -Math.PI * 0.04,
    14
  );
  ownedGeos.push(gorgetGeo);
  const gorget = new THREE.Mesh(gorgetGeo, bronzeMat);
  gorget.castShadow = true;
  torso.add(gorget);

  // Body-Hugging Curved Diagonal Retiarius Harness Bandolier (wraps snugly onto cuirass — ZERO floating plank!)
  const bandolierGeo = createStrapTube(
    [
      new THREE.Vector3(-0.175, 0.56, -0.145),
      new THREE.Vector3(-0.085, 0.45, -0.196),
      new THREE.Vector3(0.02, 0.32, -0.192),
      new THREE.Vector3(0.115, 0.18, -0.168),
      new THREE.Vector3(0.185, 0.04, -0.125),
    ],
    0.022,
    0.55,
    18
  );
  ownedGeos.push(bandolierGeo);
  const bandolier = new THREE.Mesh(bandolierGeo, bronzeMat);
  torso.add(bandolier);

  // 3 Flush-Mounted Glowing Stasis Canisters nested along the curved bandolier
  const canisterGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.058, 8);
  ownedGeos.push(canisterGeo);
  const canPositions: Array<[number, number, number]> = [
    [-0.105, 0.475, -0.198],
    [0.068, 0.255, -0.186],
    [0.145, 0.125, -0.16],
  ];
  for (const [cx, cy, cz] of canPositions) {
    const can = new THREE.Mesh(canisterGeo, opticCyanMat);
    can.position.set(cx, cy, cz);
    can.rotation.z = 0.88;
    torso.add(can);
  }

  // Recessed Diamond Sternal Voltaic Reactor Core seated cleanly into the cuirass
  const sternalFrameGeo = createBeveledBox(0.124, 0.124, 0.036, 0.012);
  ownedGeos.push(sternalFrameGeo);
  const sternalFrame = new THREE.Mesh(sternalFrameGeo, bronzeMat);
  sternalFrame.position.set(0, 0.41, -0.192);
  sternalFrame.rotation.z = Math.PI * 0.25;
  torso.add(sternalFrame);

  const sternalInnerGeo = createBeveledBox(0.088, 0.088, 0.038, 0.008);
  ownedGeos.push(sternalInnerGeo);
  const sternalInner = new THREE.Mesh(sternalInnerGeo, darkJointMat);
  sternalInner.position.set(0, 0.41, -0.196);
  sternalInner.rotation.z = Math.PI * 0.25;
  torso.add(sternalInner);

  const sternalCoreGeo = new THREE.OctahedronGeometry(0.042, 1);
  ownedGeos.push(sternalCoreGeo);
  const sternalCore = new THREE.Mesh(sternalCoreGeo, opticCyanMat);
  sternalCore.scale.set(0.95, 1.15, 0.55);
  sternalCore.position.set(0, 0.41, -0.208);
  torso.add(sternalCore);

  // ==================== WINGED LAYERED RETIARIUS GALERUS SHIELD-FIN (LEFT SHOULDER) ====================
  // Lowered & sculpted into a sleek predatory angular wing so BOTH dorsal Tesla pylons shine heroically!
  const galerusGroup = new THREE.Group();
  galerusGroup.position.set(-0.27, 0.49, -0.01);
  galerusGroup.rotation.z = 0.16;
  torso.add(galerusGroup);

  const galerusCoreGeo = createCurvedPanelGeometry(
    [
      { y: -0.12, rx: 0.118, rz: 0.138, thickness: 0.026 },
      { y: 0.05, rx: 0.148, rz: 0.168, thickness: 0.032 },
      { y: 0.2, rx: 0.132, rz: 0.148, thickness: 0.026 },
      { y: 0.29, rx: 0.092, rz: 0.104, thickness: 0.02 },
    ],
    Math.PI * 0.54,
    Math.PI * 1.46,
    14
  );
  ownedGeos.push(galerusCoreGeo);
  const galerusCore = new THREE.Mesh(galerusCoreGeo, armorMat);
  galerusCore.castShadow = true;
  galerusGroup.add(galerusCore);

  // Beveled Hammered-Bronze Trim Frame Ribs flanking the dark obsidian-cobalt Galerus shield face
  for (const rZ of [-0.088, 0.088]) {
    const ribGeo = createBeveledBox(0.032, 0.36, 0.032, 0.007);
    ownedGeos.push(ribGeo);
    const rib = new THREE.Mesh(ribGeo, bronzeMat);
    rib.position.set(-0.128, 0.085, rZ);
    rib.rotation.z = 0.06;
    galerusGroup.add(rib);
  }
  const galTopTrimGeo = createBeveledBox(0.044, 0.034, 0.21, 0.008);
  ownedGeos.push(galTopTrimGeo);
  const galTopTrim = new THREE.Mesh(galTopTrimGeo, bronzeMat);
  galTopTrim.position.set(-0.108, 0.268, 0);
  galTopTrim.rotation.z = -0.18;
  galerusGroup.add(galTopTrim);

  // Glowing electric-cyan snare-grid strip down the center ridge
  const galCyanGeo = createBeveledBox(0.022, 0.3, 0.026, 0.006);
  ownedGeos.push(galCyanGeo);
  const galCyan = new THREE.Mesh(galCyanGeo, opticCyanMat);
  galCyan.position.set(-0.156, 0.08, 0);
  galerusGroup.add(galCyan);

  // 2 Sleek Swept Predatory Bronze Blade-Horns crowning the Galerus!
  const galHornGeo = new THREE.ConeGeometry(0.022, 0.175, 5);
  ownedGeos.push(galHornGeo);
  for (const [hz, rx] of [
    [-0.065, -0.34],
    [0.055, 0.24],
  ]) {
    const horn = new THREE.Mesh(galHornGeo, bronzeMat);
    horn.position.set(-0.115, 0.325, hz);
    horn.rotation.set(rx, 0, 0.36);
    horn.castShadow = true;
    galerusGroup.add(horn);
  }

  // ==================== DYNAMIC CURVED TATTERED RETIARIUS SNARE-NET HALF-CLOAK (LEFT FLANK/BACK!) ====================
  const cloakUpperPivot = new THREE.Group();
  cloakUpperPivot.position.set(-0.14, 0.51, 0.095);
  torso.add(cloakUpperPivot);

  // Curved armored-cloth mantle drapery wrapping organically behind the left shoulder & flank
  const cloakUpperGeo = createCurvedPanelGeometry(
    [
      { y: -0.44, rx: 0.215, rz: 0.172, thickness: 0.012 },
      { y: -0.22, rx: 0.205, rz: 0.165, thickness: 0.013 },
      { y: 0.0, rx: 0.176, rz: 0.142, thickness: 0.014 },
    ],
    Math.PI * 0.24,
    Math.PI * 0.88,
    12
  );
  ownedGeos.push(cloakUpperGeo);
  const cloakUpper = new THREE.Mesh(cloakUpperGeo, cloakMat);
  cloakUpper.position.set(0.08, 0, -0.02);
  cloakUpper.castShadow = true;
  cloakUpperPivot.add(cloakUpper);

  // Sculpted bronze cloak clasp brooch anchoring the mantle beneath the Galerus shield
  const cloakClaspGeo = createBeveledBox(0.054, 0.048, 0.032, 0.008);
  ownedGeos.push(cloakClaspGeo);
  const cloakClasp = new THREE.Mesh(cloakClaspGeo, bronzeMat);
  cloakClasp.position.set(-0.045, -0.015, 0.095);
  cloakUpperPivot.add(cloakClasp);

  const cloakLowerPivot = new THREE.Group();
  cloakLowerPivot.position.set(-0.075, -0.42, 0.118);
  cloakUpperPivot.add(cloakLowerPivot);

  const cloakLowerShape = new THREE.Shape();
  cloakLowerShape.moveTo(-0.155, 0);
  cloakLowerShape.lineTo(0.155, 0);
  cloakLowerShape.lineTo(0.175, -0.44);
  cloakLowerShape.lineTo(0.055, -0.32);
  cloakLowerShape.lineTo(-0.02, -0.52);
  cloakLowerShape.lineTo(-0.1, -0.35);
  cloakLowerShape.lineTo(-0.19, -0.47);
  cloakLowerShape.closePath();
  const cloakLowerGeo = new THREE.ShapeGeometry(cloakLowerShape);
  ownedGeos.push(cloakLowerGeo);
  const cloakLower = new THREE.Mesh(cloakLowerGeo, cloakMat);
  cloakLower.rotation.y = -0.34;
  cloakLower.castShadow = true;
  cloakLowerPivot.add(cloakLower);

  // Right Sleek Cyber-Sniper Layered Pauldron
  const rightPauldronGeo = createCurvedPanelGeometry(
    [
      { y: -0.09, rx: 0.098, rz: 0.112, thickness: 0.024 },
      { y: 0.02, rx: 0.116, rz: 0.128, thickness: 0.028 },
      { y: 0.1, rx: 0.086, rz: 0.096, thickness: 0.02 },
    ],
    -Math.PI * 0.48,
    Math.PI * 0.48,
    12
  );
  ownedGeos.push(rightPauldronGeo);
  const rightPauldron = new THREE.Mesh(rightPauldronGeo, armorMat);
  rightPauldron.position.set(0.275, 0.505, -0.01);
  rightPauldron.rotation.z = -0.12;
  rightPauldron.castShadow = true;
  torso.add(rightPauldron);

  const rightPauldronRidgeGeo = createBeveledBox(0.05, 0.032, 0.175, 0.008);
  ownedGeos.push(rightPauldronRidgeGeo);
  const rightPauldronRidge = new THREE.Mesh(rightPauldronRidgeGeo, bronzeMat);
  rightPauldronRidge.position.set(0.328, 0.578, -0.01);
  rightPauldronRidge.rotation.z = -0.28;
  torso.add(rightPauldronRidge);

  // ==================== DORSAL TWIN-COIL TESLA SNARE-PACK (WEAKPOINT: snare_coils) ====================
  const weakpointAnchor = new THREE.Group();
  weakpointAnchor.position.set(0, 0.46, 0.2);
  torso.add(weakpointAnchor);

  const packHousingGeo = createBeveledBox(0.36, 0.41, 0.175, 0.026);
  ownedGeos.push(packHousingGeo);
  const packHousing = new THREE.Mesh(packHousingGeo, armorMat);
  packHousing.position.set(0, -0.04, 0.01);
  packHousing.castShadow = true;
  weakpointAnchor.add(packHousing);

  const packSpineRidgeGeo = createBeveledBox(0.092, 0.37, 0.062, 0.012);
  ownedGeos.push(packSpineRidgeGeo);
  const packSpineRidge = new THREE.Mesh(packSpineRidgeGeo, bronzeMat);
  packSpineRidge.position.set(0, -0.04, 0.096);
  weakpointAnchor.add(packSpineRidge);

  const packCoreVentGeo = createBeveledBox(0.044, 0.25, 0.032, 0.006);
  ownedGeos.push(packCoreVentGeo);
  const packCoreVent = new THREE.Mesh(packCoreVentGeo, weakpointMat);
  packCoreVent.position.set(0, -0.04, 0.12);
  weakpointAnchor.add(packCoreVent);

  // Hinged Dorsal Radiator Vent Flaps
  const dorsalVents: THREE.Group[] = [];
  for (const sx of [-1, 1] as const) {
    const ventPivot = new THREE.Group();
    ventPivot.position.set(sx * 0.17, -0.02, 0.062);
    weakpointAnchor.add(ventPivot);

    const ventPlateGeo = createBeveledBox(0.032, 0.26, 0.11, 0.008);
    ownedGeos.push(ventPlateGeo);
    const ventPlate = new THREE.Mesh(ventPlateGeo, bronzeMat);
    ventPlate.position.set(sx * 0.02, 0, 0.04);
    ventPlate.rotation.y = sx * 0.35;
    ventPlate.castShadow = true;
    ventPivot.add(ventPlate);

    const ventGlowGeo = createBeveledBox(0.016, 0.2, 0.06, 0.004);
    ownedGeos.push(ventGlowGeo);
    const ventGlow = new THREE.Mesh(ventGlowGeo, weakpointMat);
    ventGlow.position.set(sx * 0.006, 0, 0.036);
    ventPivot.add(ventGlow);
    dorsalVents.push(ventPivot);
  }

  // Twin Towering High-Voltage Tesla Snare Pylons rising visibly above BOTH shoulders!
  const coilOuterRotors: THREE.Mesh[] = [];
  const coilInnerRotors: THREE.Mesh[] = [];
  const coilBulbs: THREE.Mesh[] = [];

  for (const sx of [-1, 1] as const) {
    const pylonGroup = new THREE.Group();
    pylonGroup.position.set(sx * 0.175, 0.15, 0.02);
    pylonGroup.rotation.set(0.14, 0, -sx * 0.25);
    weakpointAnchor.add(pylonGroup);

    const stalkGeo = new THREE.CylinderGeometry(0.038, 0.058, 0.38, 12);
    ownedGeos.push(stalkGeo);
    const stalk = new THREE.Mesh(stalkGeo, darkJointMat);
    stalk.position.y = 0.15;
    stalk.castShadow = true;
    pylonGroup.add(stalk);

    for (let d = 0; d < 3; d++) {
      const discGeo = new THREE.CylinderGeometry(0.074, 0.074, 0.02, 12);
      ownedGeos.push(discGeo);
      const disc = new THREE.Mesh(discGeo, bronzeMat);
      disc.position.y = 0.045 + d * 0.078;
      pylonGroup.add(disc);
    }

    const bulbGeo = new THREE.OctahedronGeometry(0.084, 2);
    ownedGeos.push(bulbGeo);
    const bulb = new THREE.Mesh(bulbGeo, weakpointMat);
    bulb.position.y = 0.365;
    pylonGroup.add(bulb);
    coilBulbs.push(bulb);

    const outerRingGeo = new THREE.TorusGeometry(0.12, 0.016, 8, 20);
    ownedGeos.push(outerRingGeo);
    const outerRing = new THREE.Mesh(outerRingGeo, weakpointMat);
    outerRing.position.y = 0.365;
    outerRing.rotation.x = Math.PI * 0.42;
    pylonGroup.add(outerRing);
    coilOuterRotors.push(outerRing);

    const innerRingGeo = new THREE.TorusGeometry(0.098, 0.013, 8, 18);
    ownedGeos.push(innerRingGeo);
    const innerRing = new THREE.Mesh(innerRingGeo, bronzeMat);
    innerRing.position.y = 0.365;
    innerRing.rotation.x = -Math.PI * 0.32;
    pylonGroup.add(innerRing);
    coilInnerRotors.push(innerRing);

    for (let p = 0; p < 3; p++) {
      const a = (p / 3) * Math.PI * 2;
      const prongGeo = new THREE.ConeGeometry(0.014, 0.145, 6);
      ownedGeos.push(prongGeo);
      const prong = new THREE.Mesh(prongGeo, bronzeMat);
      prong.position.set(Math.cos(a) * 0.07, 0.425, Math.sin(a) * 0.07);
      prong.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
      pylonGroup.add(prong);
    }
  }

  // 3 Live Crackling Electric-Cyan Lightning Filaments arcing between the twin dorsal Tesla pylons!
  const dorsalArcs: THREE.Mesh[] = [];
  const dorsalArcGeo = new THREE.CylinderGeometry(0.0085, 0.0085, 0.58, 5);
  dorsalArcGeo.rotateZ(Math.PI * 0.5);
  ownedGeos.push(dorsalArcGeo);
  for (let a = 0; a < 3; a++) {
    const arc = new THREE.Mesh(dorsalArcGeo, webArcMat);
    arc.position.set(0, 0.49 + (a - 1) * 0.036, 0.072);
    weakpointAnchor.add(arc);
    dorsalArcs.push(arc);
  }

  // Braided dorsal power conduit curving from the Tesla pack around the right waist
  const conduitGeo = createStrapTube(
    [
      new THREE.Vector3(0.16, 0.34, 0.18),
      new THREE.Vector3(0.28, 0.24, 0.12),
      new THREE.Vector3(0.29, 0.17, -0.02),
      new THREE.Vector3(0.21, 0.25, -0.14),
    ],
    0.019,
    1.0,
    18
  );
  ownedGeos.push(conduitGeo);
  const conduitMesh = new THREE.Mesh(conduitGeo, darkJointMat);
  torso.add(conduitMesh);

  // ==================== TERRIFYING HOODED 6-OPTIC ARACHNID EXECUTIONER SKULL HELMET ====================
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.625, -0.012);
  torso.add(headGroup);

  const neckMuscleGeo = new THREE.CylinderGeometry(0.078, 0.098, 0.11, 12);
  ownedGeos.push(neckMuscleGeo);
  const neckMuscle = new THREE.Mesh(neckMuscleGeo, carbonSuitMat);
  neckMuscle.position.y = 0.012;
  headGroup.add(neckMuscle);

  // Sculpted angular inner skull cranium (strictly ascending y!)
  const helmGeo = createLoftedAnatomy(
    [
      { y: 0.02, rx: 0.094, rz: 0.116, squareness: 2.4 },
      { y: 0.125, rx: 0.118, rz: 0.148, squareness: 2.7, pinchFront: 0.046 },
      { y: 0.235, rx: 0.114, rz: 0.144, squareness: 2.5, pinchFront: 0.026 },
      { y: 0.305, rx: 0.074, rz: 0.096, squareness: 2.05 },
    ],
    18
  );
  ownedGeos.push(helmGeo);
  const helm = new THREE.Mesh(helmGeo, darkJointMat);
  helm.castShadow = true;
  headGroup.add(helm);

  // Sinister Sculpted Pointed Armored Executioner Hood / Cowl Mantle framing the skull faceplate!
  const cowlGeo = createCurvedPanelGeometry(
    [
      { y: 0.01, rx: 0.132, rz: 0.158, thickness: 0.022 },
      { y: 0.15, rx: 0.144, rz: 0.172, thickness: 0.026 },
      { y: 0.285, rx: 0.122, rz: 0.164, thickness: 0.024 },
    ],
    -Math.PI * 0.16,
    Math.PI * 1.16,
    16
  );
  ownedGeos.push(cowlGeo);
  const cowl = new THREE.Mesh(cowlGeo, armorMat);
  cowl.castShadow = true;
  headGroup.add(cowl);

  // Sharp Pointed Overhanging Hood Brow Peak casting menacing shadow over the 6 spider optics!
  const hoodPeakGeo = new THREE.ConeGeometry(0.112, 0.21, 4);
  ownedGeos.push(hoodPeakGeo);
  const hoodPeak = new THREE.Mesh(hoodPeakGeo, armorMat);
  hoodPeak.scale.set(1.18, 0.92, 0.58);
  hoodPeak.rotation.set(-Math.PI * 0.45, Math.PI * 0.25, 0);
  hoodPeak.position.set(0, 0.268, -0.105);
  hoodPeak.castShadow = true;
  headGroup.add(hoodPeak);

  // Swept Curved Imperial-Bronze Gladiator Dorsal Shark-Blade Crest Fin
  const crestShape = new THREE.Shape();
  crestShape.moveTo(-0.12, 0);
  crestShape.quadraticCurveTo(-0.02, 0.115, 0.135, 0.09);
  crestShape.lineTo(0.165, 0.01);
  crestShape.lineTo(0.08, -0.02);
  crestShape.closePath();
  const crestGeo = new THREE.ExtrudeGeometry(crestShape, {
    depth: 0.026,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.005,
    bevelSegments: 2,
  });
  crestGeo.translate(0, 0, -0.013);
  crestGeo.rotateY(-Math.PI * 0.5);
  ownedGeos.push(crestGeo);
  const helmCrest = new THREE.Mesh(crestGeo, bronzeMat);
  helmCrest.position.set(0, 0.285, 0.025);
  helmCrest.castShadow = true;
  headGroup.add(helmCrest);

  // Furrowed Scowling Bronze Brow V-Plates
  const browGeo = createBeveledBox(0.098, 0.036, 0.082, 0.008);
  ownedGeos.push(browGeo);
  const browLeft = new THREE.Mesh(browGeo, bronzeMat);
  browLeft.position.set(-0.044, 0.216, -0.136);
  browLeft.rotation.set(0.24, 0.2, -0.28);
  headGroup.add(browLeft);

  const browRight = new THREE.Mesh(browGeo, bronzeMat);
  browRight.position.set(0.044, 0.216, -0.136);
  browRight.rotation.set(0.24, -0.2, 0.28);
  headGroup.add(browRight);

  // Deep Matte-Obsidian Recessed Skull-Visor Socket
  const visorSocketGeo = createBeveledBox(0.172, 0.112, 0.056, 0.012);
  ownedGeos.push(visorSocketGeo);
  const visorSocket = new THREE.Mesh(visorSocketGeo, skullRecessMat);
  visorSocket.position.set(0, 0.15, -0.138);
  headGroup.add(visorSocket);

  // 6 TERRIFYING ARACHNID-SNIPER OPTICS: Razor-sharp slanted diamond main eyes + 4 flanking spider lenses!
  const mainOpticGeo = new THREE.OctahedronGeometry(1, 0);
  const subOpticGeo = new THREE.SphereGeometry(1, 8, 8);
  ownedGeos.push(mainOpticGeo, subOpticGeo);

  for (const sgn of [-1, 1] as const) {
    // Wicked angry slanted diamond main predator eye slit (proud of visor recess so it burns menacingly!)
    const mainEye = new THREE.Mesh(mainOpticGeo, opticCyanMat);
    mainEye.position.set(sgn * 0.046, 0.146, -0.175);
    mainEye.scale.set(0.038, 0.015, 0.014);
    mainEye.rotation.set(0, -sgn * 0.18, sgn * 0.34);
    headGroup.add(mainEye);

    // Outer upper spider rangefinder optic
    const outerEye = new THREE.Mesh(subOpticGeo, opticCyanMat);
    outerEye.position.set(sgn * 0.074, 0.178, -0.164);
    outerEye.scale.set(0.015, 0.015, 0.012);
    headGroup.add(outerEye);

    // Inner brow sniper micro-optic
    const innerEye = new THREE.Mesh(subOpticGeo, opticCyanMat);
    innerEye.position.set(sgn * 0.022, 0.184, -0.175);
    innerEye.scale.set(0.012, 0.012, 0.011);
    headGroup.add(innerEye);
  }

  // Hollow-Cheek Obsidian Skull Faceplate & Serrated Bronze Predator Rebreather Fang-Grill!
  const jawPlateGeo = createBeveledBox(0.132, 0.086, 0.072, 0.012);
  ownedGeos.push(jawPlateGeo);
  const jawPlate = new THREE.Mesh(jawPlateGeo, skullRecessMat);
  jawPlate.position.set(0, 0.072, -0.132);
  jawPlate.rotation.x = 0.16;
  headGroup.add(jawPlate);

  // Glowing cyan rebreather slit behind the serrated bronze teeth!
  const mouthGlowGeo = createBeveledBox(0.095, 0.022, 0.014, 0.003);
  ownedGeos.push(mouthGlowGeo);
  const mouthGlow = new THREE.Mesh(mouthGlowGeo, opticCyanMat);
  mouthGlow.position.set(0, 0.068, -0.162);
  headGroup.add(mouthGlow);

  // 5 Sharp Serrated Metallic Fang-Bars framing the executioner mouth grill
  const toothGeo = new THREE.ConeGeometry(0.01, 0.058, 4);
  ownedGeos.push(toothGeo);
  for (let g = -2; g <= 2; g++) {
    const tooth = new THREE.Mesh(toothGeo, bronzeMat);
    tooth.position.set(g * 0.022, 0.07, -0.17);
    tooth.rotation.x = Math.PI;
    headGroup.add(tooth);
  }

  // Sculpted angular bronze cheekbone predator fang-mandibles
  const cheekFangGeo = createBeveledBox(0.036, 0.104, 0.096, 0.008);
  ownedGeos.push(cheekFangGeo);
  for (const sx of [-1, 1] as const) {
    const cheekFang = new THREE.Mesh(cheekFangGeo, bronzeMat);
    cheekFang.position.set(sx * 0.088, 0.092, -0.098);
    cheekFang.rotation.set(0.28, sx * 0.26, sx * 0.18);
    headGroup.add(cheekFang);
  }

  // Right-Temple Tucked Ballistic Sniper Rangefinder Pod + Glowing Cyan Sensor Lens (flush with cowl)
  const rfStalkGeo = createBeveledBox(0.018, 0.022, 0.068, 0.004);
  const rfPodGeo = new THREE.CylinderGeometry(0.014, 0.016, 0.056, 10);
  const rfLensGeo = new THREE.CylinderGeometry(0.0095, 0.0095, 0.012, 10);
  ownedGeos.push(rfStalkGeo, rfPodGeo, rfLensGeo);
  const rfStalk = new THREE.Mesh(rfStalkGeo, bronzeMat);
  rfStalk.position.set(0.114, 0.166, -0.068);
  rfStalk.rotation.y = -0.14;
  headGroup.add(rfStalk);

  const rfPod = new THREE.Mesh(rfPodGeo, darkJointMat);
  rfPod.rotation.x = Math.PI * 0.5;
  rfPod.position.set(0.118, 0.168, -0.114);
  headGroup.add(rfPod);

  const rfLens = new THREE.Mesh(rfLensGeo, opticCyanMat);
  rfLens.rotation.x = Math.PI * 0.5;
  rfLens.position.set(0.118, 0.168, -0.144);
  headGroup.add(rfLens);

  // ==================== ARTICULATED HUMAN ARMS + VOLTAIC TRIDENT-HARPOON RAIL-LAUNCHER ====================
  const leftShoulderPos = new THREE.Vector3(-0.28, 0.495, -0.01);
  const rightShoulderPos = new THREE.Vector3(0.28, 0.495, -0.01);

  const leftArm = buildArticulatedHumanArm(
    -1,
    armorMat,
    bronzeMat,
    carbonSuitMat,
    darkJointMat,
    opticCyanMat,
    ownedGeos
  );
  leftArm.shoulder.position.copy(leftShoulderPos);
  torso.add(leftArm.shoulder);

  const rightArm = buildArticulatedHumanArm(
    1,
    armorMat,
    bronzeMat,
    carbonSuitMat,
    darkJointMat,
    opticCyanMat,
    ownedGeos
  );
  rightArm.shoulder.position.copy(rightShoulderPos);
  torso.add(rightArm.shoulder);

  // Weapon Mount inside `torso` — drives weapon pose while 2-bone IK locks BOTH human hands onto grips!
  const weaponMount = new THREE.Group();
  weaponMount.position.set(0.145, 0.35, -0.22);
  torso.add(weaponMount);

  const gunGroup = new THREE.Group();
  weaponMount.add(gunGroup);

  const buttStockGeo = createBeveledBox(0.086, 0.132, 0.28, 0.016);
  ownedGeos.push(buttStockGeo);
  const buttStock = new THREE.Mesh(buttStockGeo, armorMat);
  buttStock.position.set(0, -0.02, 0.16);
  buttStock.castShadow = true;
  gunGroup.add(buttStock);

  const stockPadGeo = createBeveledBox(0.094, 0.144, 0.036, 0.008);
  ownedGeos.push(stockPadGeo);
  const stockPad = new THREE.Mesh(stockPadGeo, bronzeMat);
  stockPad.position.set(0, -0.02, 0.295);
  gunGroup.add(stockPad);

  const receiverGeo = createBeveledBox(0.142, 0.156, 0.56, 0.022);
  ownedGeos.push(receiverGeo);
  const receiver = new THREE.Mesh(receiverGeo, weaponChassisMat);
  receiver.position.set(0, 0.01, -0.2);
  receiver.castShadow = true;
  gunGroup.add(receiver);

  // Chamfered side bronze heat-shroud ribs & electric plasma channels on receiver
  const shroudSideGeo = createBeveledBox(0.022, 0.064, 0.44, 0.006);
  ownedGeos.push(shroudSideGeo);
  for (const sx of [-1, 1] as const) {
    const sh = new THREE.Mesh(shroudSideGeo, bronzeMat);
    sh.position.set(sx * 0.078, 0.022, -0.24);
    gunGroup.add(sh);
  }

  const topRailGeo = createBeveledBox(0.068, 0.038, 0.5, 0.008);
  ownedGeos.push(topRailGeo);
  const topRail = new THREE.Mesh(topRailGeo, bronzeMat);
  topRail.position.set(0, 0.098, -0.24);
  gunGroup.add(topRail);

  const scopeBodyGeo = new THREE.CylinderGeometry(0.032, 0.036, 0.24, 10);
  ownedGeos.push(scopeBodyGeo);
  const scopeBody = new THREE.Mesh(scopeBodyGeo, darkJointMat);
  scopeBody.rotation.x = Math.PI * 0.5;
  scopeBody.position.set(0, 0.144, -0.22);
  gunGroup.add(scopeBody);

  const scopeLensGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.018, 10);
  ownedGeos.push(scopeLensGeo);
  const scopeLens = new THREE.Mesh(scopeLensGeo, opticCyanMat);
  scopeLens.rotation.x = Math.PI * 0.5;
  scopeLens.position.set(0, 0.144, -0.342);
  gunGroup.add(scopeLens);

  // Pistol Grip (Right Hand IK Anchor) & Angled Tactical Foregrip (Left Hand IK Anchor)
  const pistolGripGeo = createBeveledBox(0.056, 0.15, 0.072, 0.01);
  ownedGeos.push(pistolGripGeo);
  const pistolGrip = new THREE.Mesh(pistolGripGeo, darkJointMat);
  pistolGrip.position.set(0, -0.1, -0.04);
  pistolGrip.rotation.x = 0.28;
  gunGroup.add(pistolGrip);

  const foreGripGeo = createBeveledBox(0.078, 0.09, 0.16, 0.014);
  ownedGeos.push(foreGripGeo);
  const foreGrip = new THREE.Mesh(foreGripGeo, bronzeMat);
  foreGrip.position.set(0, -0.088, -0.38);
  gunGroup.add(foreGrip);

  const rightGripAnchor = new THREE.Object3D();
  rightGripAnchor.position.set(0.028, -0.095, -0.025);
  gunGroup.add(rightGripAnchor);

  const leftGripAnchor = new THREE.Object3D();
  leftGripAnchor.position.set(-0.048, -0.088, -0.375);
  gunGroup.add(leftGripAnchor);

  // Spinning Central Voltaic Plasma Capacitor Drum
  const capacitorDrum = new THREE.Group();
  capacitorDrum.position.set(0, 0.012, -0.52);
  gunGroup.add(capacitorDrum);

  const drumCoreGeo = new THREE.CylinderGeometry(0.046, 0.046, 0.24, 12);
  ownedGeos.push(drumCoreGeo);
  const drumCore = new THREE.Mesh(drumCoreGeo, opticCyanMat);
  drumCore.rotation.x = Math.PI * 0.5;
  capacitorDrum.add(drumCore);

  const drumRibGeo = createBeveledBox(0.018, 0.022, 0.26, 0.004);
  ownedGeos.push(drumRibGeo);
  for (let fin = 0; fin < 4; fin++) {
    const a = (fin / 4) * Math.PI * 2;
    const rib = new THREE.Mesh(drumRibGeo, bronzeMat);
    rib.position.set(Math.cos(a) * 0.056, Math.sin(a) * 0.056, 0);
    rib.rotation.z = a;
    capacitorDrum.add(rib);
  }

  // ==================== 3-PRONGED VOLTAIC TRIDENT-HARPOON MUZZLE + LIVE PLASMA-WEB LATTICE ====================
  const prongBaseGeo = createBeveledBox(0.044, 0.068, 0.56, 0.01);
  const harpoonTipGeo = new THREE.ConeGeometry(0.036, 0.23, 6);
  const barbHookGeo = new THREE.ConeGeometry(0.018, 0.125, 5);
  const railStripGeo = createBeveledBox(0.018, 0.024, 0.52, 0.004);
  const tipNodeGeo = new THREE.OctahedronGeometry(0.034, 1);
  ownedGeos.push(prongBaseGeo, harpoonTipGeo, barbHookGeo, railStripGeo, tipNodeGeo);

  for (const sx of [-1, 1] as const) {
    const prongBase = new THREE.Mesh(prongBaseGeo, bronzeMat);
    prongBase.position.set(sx * 0.135, 0.012, -0.74);
    prongBase.rotation.y = sx * 0.1;
    prongBase.castShadow = true;
    gunGroup.add(prongBase);

    const harpoonTip = new THREE.Mesh(harpoonTipGeo, mats.crucibleSteel);
    harpoonTip.rotation.x = -Math.PI * 0.5;
    harpoonTip.position.set(sx * 0.165, 0.012, -1.11);
    harpoonTip.castShadow = true;
    gunGroup.add(harpoonTip);

    const barbHook = new THREE.Mesh(barbHookGeo, bronzeMat);
    barbHook.position.set(sx * 0.198, 0.012, -0.97);
    barbHook.rotation.set(Math.PI * 0.5, 0, -sx * 0.58);
    gunGroup.add(barbHook);

    const railStrip = new THREE.Mesh(railStripGeo, opticCyanMat);
    railStrip.position.set(sx * 0.112, 0.012, -0.74);
    railStrip.rotation.y = sx * 0.1;
    gunGroup.add(railStrip);

    const tipNode = new THREE.Mesh(tipNodeGeo, opticCyanMat);
    tipNode.position.set(sx * 0.155, 0.012, -1.01);
    gunGroup.add(tipNode);
  }

  // Central razor-sharp electro-trident bayonet spike
  const centerSpikeGeo = new THREE.ConeGeometry(0.03, 0.4, 6);
  ownedGeos.push(centerSpikeGeo);
  const centerSpike = new THREE.Mesh(centerSpikeGeo, mats.crucibleSteel);
  centerSpike.rotation.x = -Math.PI * 0.5;
  centerSpike.position.set(0, 0.012, -0.86);
  centerSpike.castShadow = true;
  gunGroup.add(centerSpike);

  const centerEdgeGlowGeo = createBeveledBox(0.014, 0.016, 0.32, 0.003);
  ownedGeos.push(centerEdgeGlowGeo);
  const centerEdgeGlow = new THREE.Mesh(centerEdgeGlowGeo, opticCyanMat);
  centerEdgeGlow.position.set(0, 0.012, -0.83);
  gunGroup.add(centerEdgeGlow);

  // Live Crackling 3D Electric-Cyan Plasma-Web Lattice spanning across the Trident Prongs!
  const muzzleArcFilaments: THREE.Mesh[] = [];
  const muzzleArcGeo = new THREE.CylinderGeometry(0.0075, 0.0075, 0.3, 6);
  muzzleArcGeo.rotateZ(Math.PI * 0.5);
  const crossWebGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.22, 5);
  ownedGeos.push(muzzleArcGeo, crossWebGeo);
  for (let m = 0; m < 3; m++) {
    const arc = new THREE.Mesh(muzzleArcGeo, webArcMat);
    arc.position.set(0, 0.012 + (m - 1) * 0.02, -0.93 - m * 0.032);
    gunGroup.add(arc);
    muzzleArcFilaments.push(arc);
  }
  // Angled V-web energy filaments bridging outer barbed harpoon tips to the central bayonet spike
  for (const sx of [-1, 1] as const) {
    const diagWeb = new THREE.Mesh(crossWebGeo, webArcMat);
    diagWeb.position.set(sx * 0.082, 0.012, -0.945);
    diagWeb.rotation.set(Math.PI * 0.5, 0, sx * 0.72);
    gunGroup.add(diagWeb);
    muzzleArcFilaments.push(diagWeb);
  }

  // Sleek 3D Hexagonal Snare-Web Energy Wire Torus nestled tightly inside Trident forks
  const muzzleWebRingGeo = new THREE.TorusGeometry(0.084, 0.0048, 5, 6);
  ownedGeos.push(muzzleWebRingGeo);
  const muzzleWebRing = new THREE.Mesh(muzzleWebRingGeo, webArcMat);
  muzzleWebRing.position.set(0, 0.012, -0.96);
  gunGroup.add(muzzleWebRing);

  const muzzleAnchor = new THREE.Object3D();
  muzzleAnchor.position.set(0, 0.012, -1.08);
  gunGroup.add(muzzleAnchor);

  const tridentTipAnchor = new THREE.Object3D();
  tridentTipAnchor.position.set(0, 0.012, -1.22);
  gunGroup.add(tridentTipAnchor);

  // Razor-sharp dual-core additive cyan targeting laser beam
  const laserGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.0, 6);
  laserGeo.rotateX(Math.PI * 0.5);
  laserGeo.translate(0, 0, -0.5);
  const laserCoreGeo = new THREE.CylinderGeometry(0.006, 0.006, 1.0, 6);
  laserCoreGeo.rotateX(Math.PI * 0.5);
  laserCoreGeo.translate(0, 0, -0.5);
  const laserCoreMat = new THREE.MeshBasicMaterial({
    color: 0xe0f7ff,
    transparent: true,
    opacity: 0.94,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  ownedGeos.push(laserGeo, laserCoreGeo);
  ownedMats.push(laserCoreMat);
  const laserBeam = new THREE.Mesh(laserGeo, laserMat);
  laserBeam.position.copy(muzzleAnchor.position);
  laserBeam.visible = false;
  laserBeam.add(new THREE.Mesh(laserCoreGeo, laserCoreMat));
  gunGroup.add(laserBeam);

  // ==================== HITBOXES ====================
  const bodyHb = createEnemyHitboxMesh(enemyId, 'body', new THREE.BoxGeometry(0.66, 1.36, 0.54));
  bodyHb.position.set(0, 0.2, 0);
  pelvis.add(bodyHb);

  const headHb = createEnemyHitboxMesh(enemyId, 'head', new THREE.BoxGeometry(0.36, 0.38, 0.38));
  headHb.position.set(0, 0.16, 0);
  headGroup.add(headHb);

  const wpHb = createEnemyHitboxMesh(
    enemyId,
    'weakpoint',
    new THREE.BoxGeometry(0.68, 0.54, 0.42),
    'snare_coils'
  );
  wpHb.position.set(0, 0.31, 0.04);
  weakpointAnchor.add(wpHb);
  hitboxes.push(bodyHb, headHb, wpHb);

  // ==================== SMOOTH DAMPED ANIMATION STATE ====================
  let poseMode: NetShooterPoseMode = 'aim_hold';
  let chargeLevel = 0;
  let enragedIntensity = 0;

  const anim = {
    pelvisX: 0,
    pelvisY: THIGH_LEN + SHIN_LEN + FOOT_H,
    pelvisZ: 0,
    pelvisRotX: 0,
    pelvisRotY: -0.28,
    pelvisRotZ: 0,
    torsoRotX: 0.08,
    torsoRotY: 0.26,
    torsoRotZ: 0.02,
    headRotX: -0.05,
    headRotY: 0.02,
    headRotZ: 0,
    lHipX: 0.28,
    lHipZ: -0.1,
    lKneeX: -0.38,
    lAnkleX: 0.1,
    rHipX: -0.18,
    rHipZ: 0.11,
    rKneeX: -0.26,
    rAnkleX: 0.44,
    wPosX: 0.145,
    wPosY: 0.355,
    wPosZ: -0.23,
    wRotX: 0,
    wRotY: 0.04,
    wRotZ: 0,
    gunRecoilZ: 0,
    ventFlare: 0,
    leftHandGripBlend: 1,
    cloakSwing1: 0.14,
    cloakSwing2: 0.12,
    thrusterScale: 0.32,
  };

  const _rGripTorso = new THREE.Vector3();
  const _lGripTorso = new THREE.Vector3();
  const _rPole = new THREE.Vector3();
  const _lPole = new THREE.Vector3();
  const _freeLTarget = new THREE.Vector3();

  return {
    root,
    hitboxes,
    weakpointMaterials: [weakpointMat],
    armorFlashMaterials: [armorMat, bronzeMat, weaponChassisMat],
    setAimLaser(active, length = 24) {
      laserBeam.visible = active;
      if (active) laserBeam.scale.set(1, 1, Math.max(2, length));
    },
    setChargeLevel(level) {
      chargeLevel = Math.max(0, level);
    },
    setPoseMode(mode) {
      poseMode = mode;
    },
    setEnragedIntensity(intensity) {
      enragedIntensity = clamp(intensity, 0, 1);
    },
    getMuzzleWorldPos(out) {
      return muzzleAnchor.getWorldPosition(out);
    },
    getWeakpointWorldPos(out) {
      return weakpointAnchor.getWorldPosition(out);
    },
    getTridentTipWorldPos(out) {
      return tridentTipAnchor.getWorldPosition(out);
    },
    updateAnimation(input: EnemyAnimationInput) {
      const {
        dt,
        elapsed,
        behavior,
        speedRatio,
        localMoveX,
        aimPitch,
        attackProgress,
        attackVariant,
        flinchTimer,
        flinchDirX,
        staggerTimer,
        deadProgress,
        weakpointBroken,
        phase,
        airborneHeight,
      } = input;

      const overdriven = phase === 2 ? Math.max(enragedIntensity, 0.88) : enragedIntensity;
      const clampedPitch = clamp(aimPitch, -0.75, 0.62);

      // ---- 1. DEATH COLLAPSE (2-Stage Realistic Human Crumple) ----
      if (behavior === 'dead') {
        laserBeam.visible = false;
        const d = clamp(deadProgress, 0, 1);
        const kneelPhase = smoothstep(d / 0.42);
        const fallPhase = smoothstep((d - 0.35) / 0.65);

        pelvis.position.set(0, 0.94 - kneelPhase * 0.34 - fallPhase * 0.46, fallPhase * 0.24);
        pelvis.rotation.set(-fallPhase * 1.48, fallPhase * 0.28, fallPhase * 0.32);
        torso.rotation.set(0.32 * kneelPhase - 0.18 * fallPhase, 0, -0.18 * fallPhase);
        headGroup.rotation.set(0.45 * kneelPhase, 0.25 * fallPhase, 0.28 * fallPhase);

        leftLeg.hip.rotation.set(0.95 * kneelPhase - 0.4 * fallPhase, 0, -0.14);
        leftLeg.knee.rotation.set(-1.35 * kneelPhase + 0.55 * fallPhase, 0, 0);
        rightLeg.hip.rotation.set(-0.25 * kneelPhase - 0.1 * fallPhase, 0, 0.16);
        rightLeg.knee.rotation.set(-1.25 * kneelPhase + 0.4 * fallPhase, 0, 0);
        leftLeg.thrusterCone.scale.setScalar(0.1);
        rightLeg.thrusterCone.scale.setScalar(0.1);

        weaponMount.position.set(0.18 + fallPhase * 0.16, 0.22 - fallPhase * 0.1, -0.24);
        weaponMount.rotation.set(0.55 + fallPhase * 0.4, -0.35 * fallPhase, -0.45 * fallPhase);
        weaponMount.updateMatrix();
        gunGroup.position.set(0, 0, 0);
        gunGroup.updateMatrix();

        _rGripTorso.copy(rightGripAnchor.position).applyMatrix4(gunGroup.matrix).applyMatrix4(weaponMount.matrix);
        _lGripTorso.set(-0.34, 0.12 - fallPhase * 0.06, -0.28);
        _rPole.set(0.75, -0.45, 0.45);
        _lPole.set(-0.85, -0.35, 0.35);
        solveTwoBoneArm(rightArm, rightShoulderPos, _rGripTorso, _rPole);
        solveTwoBoneArm(leftArm, leftShoulderPos, _lGripTorso, _lPole);

        shadow.scale.setScalar(Math.max(0.25, 1 - d * 0.35));
        auraRingMat.opacity = Math.max(0, 0.45 * (1 - d * 1.4));
        auraMoteMat.opacity = Math.max(0, 0.7 * (1 - d * 1.5));
        webArcMat.opacity = Math.max(0, 0.5 * (1 - d * 1.5));
        weakpointMat.emissiveIntensity = Math.max(0.08, 1.5 * (1 - d));
        opticCyanMat.emissiveIntensity = Math.max(0.08, 1.8 * (1 - d));
        return;
      }

      // ---- 2. COMPUTE TARGET ATHLETIC HUMAN POSE CHANNELS ----
      const breathe = Math.sin(elapsed * 2.5);
      const spd = clamp(speedRatio, 0, 1.45);
      const strideFreq = 6.2 + spd * 3.8;
      const stridePhase = elapsed * strideFreq;

      // Wide, grounded, predatory Retiarius bladed marksman stance (negative rotX = aggressive forward lean!)
      let tPelvisX = 0;
      let tPelvisZ = 0;
      let tPelvisRotX = -0.05;
      let tPelvisRotY = -0.3;
      let tPelvisRotZ = 0;

      let tTorsoRotX = -0.11 + breathe * 0.016;
      let tTorsoRotY = 0.28;
      let tTorsoRotZ = 0.02;

      let tHeadRotX = clampedPitch * 0.44 + 0.11;
      let tHeadRotY = 0.02;
      let tHeadRotZ = 0;

      // Athletic wide stance: lead left foot planted forward, rear right foot braced back & out!
      let tLHipX = 0.32;
      let tLHipZ = -0.11;
      let tLKneeX = -0.44;
      let tRHipX = -0.2;
      let tRHipZ = 0.12;
      let tRKneeX = -0.3;

      let tWPosX = 0.145;
      let tWPosY = 0.355 + breathe * 0.008;
      let tWPosZ = -0.23;
      let tDesiredWorldPitch = clampedPitch - 0.05;
      let tWRotY = 0.03;
      let tWRotZ = 0;
      let tRecoilZ = 0;
      let tLeftGripBlend = 1.0;
      let tVentFlare = 0.14 + chargeLevel * 0.48 + overdriven * 0.38;
      let tCloak1 = 0.14 + Math.sin(elapsed * 2.3) * 0.04;
      let tCloak2 = 0.12 + Math.sin(elapsed * 2.3 - 0.8) * 0.06;
      let tThruster = 0.3;

      // Locomotion blending (patrol / sprint / agile tactical strafe)
      if (behavior === 'patrol' || behavior === 'chase' || behavior === 'strafe') {
        const isStrafe = behavior === 'strafe' || poseMode === 'strafe';
        const swing = Math.sin(stridePhase) * (isStrafe ? 0.48 : 0.64) * spd;
        const lLift = Math.max(0, Math.cos(stridePhase));
        const rLift = Math.max(0, -Math.cos(stridePhase));

        tPelvisRotY = isStrafe ? -0.18 - localMoveX * 0.16 : -0.12 + Math.sin(stridePhase) * 0.12 * spd;
        tPelvisRotZ = isStrafe ? -localMoveX * 0.14 : Math.sin(stridePhase) * 0.045 * spd;
        tTorsoRotX = -(isStrafe ? 0.14 : 0.2) * spd - 0.08;
        tTorsoRotY = -tPelvisRotY * 0.85;
        tTorsoRotZ = isStrafe ? -localMoveX * 0.12 : -Math.sin(stridePhase) * 0.04 * spd;
        tHeadRotX = clampedPitch * 0.44 + 0.14 * spd + 0.08;

        tLHipX = 0.18 + swing;
        tLKneeX = -0.26 - lLift * 0.68 * spd;
        tRHipX = 0.08 - swing;
        tRKneeX = -0.26 - rLift * 0.68 * spd;
        tLHipZ = isStrafe ? -0.13 - Math.max(0, -localMoveX) * 0.16 * Math.abs(Math.sin(stridePhase)) : -0.08;
        tRHipZ = isStrafe ? 0.13 + Math.max(0, localMoveX) * 0.16 * Math.abs(Math.sin(stridePhase)) : 0.08;

        tWPosY = 0.345 + Math.abs(Math.sin(stridePhase)) * 0.025 * spd;
        tWPosX = 0.15 + Math.cos(stridePhase) * 0.015 * spd;
        tCloak1 = 0.26 + spd * 0.22 + Math.sin(stridePhase) * 0.09;
        tCloak2 = 0.24 + spd * 0.2 + Math.sin(stridePhase - 0.8) * 0.11;
        if (isStrafe) tThruster = 0.85;

        if (behavior === 'patrol' && spd < 0.7 && poseMode === 'patrol') {
          tWPosY = 0.29;
          tDesiredWorldPitch = -0.22;
          tWRotY = 0.22;
          tHeadRotY = Math.sin(elapsed * 1.1) * 0.22;
        }
      }

      // ---- 3. SIGNATURE FLOOR 05 COMBAT POSE OVERRIDES ----
      const p = clamp(attackProgress, 0, 1);

      if (staggerTimer > 0 || behavior === 'staggered') {
        laserBeam.visible = false;
        const convulse = Math.sin(elapsed * 24) * 0.08;
        tPelvisRotX = 0.14;
        tPelvisRotY = 0.14;
        tTorsoRotX = 0.32 + convulse;
        tTorsoRotZ = Math.sin(elapsed * 17) * 0.16;
        tHeadRotX = 0.42;
        tHeadRotY = Math.sin(elapsed * 14) * 0.24;
        tLHipX = 0.44;
        tLKneeX = -0.8;
        tRHipX = 0.2;
        tRKneeX = -0.64;
        tWPosX = 0.24;
        tWPosY = 0.22;
        tWPosZ = -0.18;
        tDesiredWorldPitch = -0.45;
        tWRotY = -0.32;
        tWRotZ = -0.38;
        tLeftGripBlend = 0.0;
        tVentFlare = 0.92;
        tCloak1 = 0.36;
      } else if (behavior === 'windup' || behavior === 'attack') {
        const isWindup = behavior === 'windup';

        if (poseMode === 'snipe_kneel' || attackVariant === 1) {
          // VARIANT 1: AUTHENTIC HUMAN KNEELING MARKSMAN ARC-RAIL SNIPE (Dead-level laser lock!)
          const kBlend = isWindup ? smoothstep(p / 0.52) : 1.0 - smoothstep((p - 0.62) / 0.38) * 0.35;
          tPelvisRotX = -0.06 * kBlend;
          tPelvisRotY = -0.46 * kBlend;
          tTorsoRotX = -0.16 * kBlend;
          tTorsoRotY = 0.46 * kBlend;
          tHeadRotX = clampedPitch * 0.55 + 0.18 * kBlend;
          tHeadRotZ = 0.14 * kBlend;

          // Front left boot flat planted, rear right armored knee dropped low & grounded cleanly!
          tLHipX = 0.28 + 1.08 * kBlend;
          tLKneeX = -0.38 - 1.0 * kBlend;
          tLHipZ = -0.14 * kBlend;
          tRHipX = -0.16 + 0.08 * kBlend;
          tRKneeX = -0.26 - 1.18 * kBlend;
          tRHipZ = 0.14 * kBlend;

          tWPosX = 0.11;
          tWPosY = 0.435;
          tWPosZ = -0.25;
          tDesiredWorldPitch = clampedPitch - 0.03;
          tWRotY = 0.01;
          if (!isWindup) {
            const kick = Math.sin(Math.min(1, p * 2.2) * Math.PI);
            tRecoilZ = kick * 0.16;
            tDesiredWorldPitch += kick * 0.2;
            tTorsoRotX += kick * 0.18;
          }
          tVentFlare = 0.55 + kBlend * 0.45;
          tCloak1 = 0.26;
        } else if (poseMode === 'mortar_lob' || attackVariant === 2) {
          // VARIANT 2: HIGH-ARC ANTI-COVER SHOCK-BOLA MORTAR LOB (Skyward artillery elevation!)
          const eBlend = isWindup ? smoothstep(p) : 1.0 - smoothstep((p - 0.5) / 0.5) * 0.4;
          tPelvisRotX = 0.06 * eBlend;
          tPelvisRotY = -0.34;
          tTorsoRotX = 0.18 * eBlend;
          tTorsoRotY = 0.34;
          tHeadRotX = 0.26 * eBlend;
          tLHipX = 0.52;
          tLKneeX = -0.84;
          tRHipX = -0.3;
          tRKneeX = -0.52;
          tWPosX = 0.14;
          tWPosY = 0.42;
          tWPosZ = -0.22;
          tDesiredWorldPitch = 0.58 * eBlend;
          if (!isWindup) {
            const kick = Math.sin(Math.min(1, p * 2.0) * Math.PI);
            tRecoilZ = kick * 0.15;
            tPelvisRotX += kick * 0.12;
          }
          tVentFlare = 0.85;
          tCloak1 = 0.28;
        } else if (poseMode === 'shock_nova' || attackVariant === 3) {
          // VARIANT 3: CLOSE-QUARTERS VOLTAIC SHOCK NOVA (Raises Trident overhead then SLAMS straight into stone!)
          if (isWindup) {
            const lift = smoothstep(p);
            tPelvisRotX = 0.08 * lift;
            tPelvisRotY = -0.12;
            tTorsoRotX = 0.22 * lift;
            tTorsoRotY = 0.12;
            tHeadRotX = 0.14 * lift;
            tLHipX = 0.48;
            tLKneeX = -0.84;
            tRHipX = 0.24;
            tRKneeX = -0.68;
            tWPosX = 0.06;
            tWPosY = 0.56 + lift * 0.14;
            tWPosZ = -0.28;
            tDesiredWorldPitch = -0.85 - lift * 0.32;
            tVentFlare = 0.72 + lift * 0.45;
            tCloak1 = 0.42;
          } else {
            const slam = smoothstep(Math.min(1, p / 0.35));
            const settle = smoothstep((p - 0.55) / 0.45);
            const depth = slam * (1 - settle * 0.35);
            tPelvisRotX = -0.14 * depth;
            tPelvisRotY = 0;
            tTorsoRotX = -0.46 * depth;
            tTorsoRotY = 0;
            tHeadRotX = 0.36 * depth;
            tLHipX = 0.94 * depth + 0.22 * (1 - depth);
            tLKneeX = -1.34 * depth - 0.32 * (1 - depth);
            tRHipX = 0.76 * depth;
            tRKneeX = -1.24 * depth - 0.22 * (1 - depth);
            tLHipZ = -0.2 * depth;
            tRHipZ = 0.2 * depth;
            tWPosX = 0.02;
            tWPosY = 0.38 - 0.06 * depth;
            tWPosZ = -0.34;
            tDesiredWorldPitch = -1.16 * depth;
            tVentFlare = 1.0;
            tCloak1 = 0.58 * depth;
          }
        } else if (poseMode === 'trident_cleave' || attackVariant === 4) {
          // VARIANT 4: BRUTAL POINT-BLANK TRIDENT ARC CLEAVE (Wide 2-handed executioner polearm torque!)
          if (isWindup) {
            const coil = smoothstep(p);
            tPelvisRotX = -0.08;
            tPelvisRotY = -0.62 * coil;
            tTorsoRotX = -0.18;
            tTorsoRotY = -0.78 * coil;
            tHeadRotX = 0.16;
            tHeadRotY = 0.75 * coil;
            tLHipX = 0.54;
            tLKneeX = -0.88;
            tRHipX = -0.24;
            tRKneeX = -0.48;
            tWPosX = 0.26;
            tWPosY = 0.38;
            tWPosZ = -0.16;
            tDesiredWorldPitch = -0.12;
            tWRotY = -0.68 * coil;
            tWRotZ = -0.38 * coil;
            tCloak1 = 0.45;
          } else {
            const slash = smoothstep(Math.min(1, p / 0.52));
            const sweepAngle = -0.78 + slash * 1.92;
            tPelvisRotX = -0.1;
            tPelvisRotY = -0.42 + slash * 0.92;
            tTorsoRotX = -0.24;
            tTorsoRotY = sweepAngle;
            tHeadRotX = 0.2;
            tHeadRotY = -sweepAngle * 0.72;
            tLHipX = 0.62 - slash * 0.24;
            tLKneeX = -0.92;
            tRHipX = -0.18 + slash * 0.54;
            tRKneeX = -0.58;
            tWPosX = 0.22 - slash * 0.38;
            tWPosY = 0.35;
            tWPosZ = -0.28 - Math.sin(slash * Math.PI) * 0.14;
            tDesiredWorldPitch = -0.06;
            tWRotY = -0.62 + slash * 1.56;
            tWRotZ = -0.32 + slash * 0.64;
            tVentFlare = 0.92;
            tCloak1 = 0.65;
            tCloak2 = 0.55;
          }
        } else if (poseMode === 'blink_vault' || attackVariant === 5) {
          // VARIANT 5: AIRBORNE ARC-BLINK THRUSTER EVADE + MID-AIR PARTING SNARE SHOT!
          const airPeak = Math.sin(p * Math.PI);
          tPelvisRotX = 0.18 * airPeak;
          tPelvisRotY = -0.32;
          tPelvisRotZ = -0.26 * airPeak;
          tTorsoRotX = -0.24 * airPeak;
          tTorsoRotY = 0.34;
          tHeadRotX = 0.14 * airPeak;
          tLHipX = 0.98 * airPeak + 0.22;
          tLKneeX = -1.46 * airPeak - 0.28;
          tRHipX = 0.42 * airPeak;
          tRKneeX = -1.16 * airPeak - 0.24;
          tWPosX = 0.13;
          tWPosY = 0.36;
          tWPosZ = -0.26;
          tDesiredWorldPitch = clampedPitch - 0.2 * airPeak;
          tRecoilZ = p > 0.35 && p < 0.65 ? Math.sin(((p - 0.35) / 0.3) * Math.PI) * 0.12 : 0;
          tVentFlare = 1.0;
          tThruster = 1.55;
          tCloak1 = 0.85;
          tCloak2 = 0.72;
        } else if (poseMode === 'tesla_burst' || attackVariant === 6) {
          // VARIANT 6: RAPID 3-ROUND SWEEPING TESLA BURST
          const sweepOsc = isWindup ? -0.22 * p : -0.22 + p * 0.44;
          const pulseKick = !isWindup ? Math.abs(Math.sin(p * Math.PI * 3)) : 0;
          tPelvisRotX = -0.06;
          tPelvisRotY = -0.34;
          tTorsoRotX = -0.14;
          tTorsoRotY = 0.34 + sweepOsc * 0.65;
          tHeadRotX = clampedPitch * 0.45 + 0.14;
          tLHipX = 0.44;
          tLKneeX = -0.74;
          tRHipX = -0.2;
          tRKneeX = -0.46;
          tWPosX = 0.13;
          tWPosY = 0.38;
          tWPosZ = -0.24;
          tDesiredWorldPitch = clampedPitch + pulseKick * 0.06;
          tWRotY = sweepOsc * 0.5;
          tRecoilZ = pulseKick * 0.08;
          tThruster = 0.75;
        } else {
          // VARIANT 0: WIDE ELECTRIC SNARE-NET VOLLEY
          const brace = isWindup ? smoothstep(p) : 1.0 - smoothstep((p - 0.55) / 0.45) * 0.35;
          tPelvisRotX = -0.06 * brace;
          tPelvisRotY = -0.38;
          tTorsoRotX = -0.15 * brace;
          tTorsoRotY = 0.36;
          tHeadRotX = clampedPitch * 0.45 + 0.16 * brace;
          tLHipX = 0.48 * brace + 0.2;
          tLKneeX = -0.78 * brace - 0.24;
          tRHipX = -0.26 * brace - 0.04;
          tRKneeX = -0.42 * brace - 0.2;
          tLHipZ = -0.14;
          tRHipZ = 0.14;
          tWPosX = 0.13;
          tWPosY = 0.37;
          tWPosZ = -0.25;
          tDesiredWorldPitch = clampedPitch - 0.04;
          if (!isWindup) {
            const kick = Math.sin(Math.min(1, p * 2.2) * Math.PI);
            tRecoilZ = kick * 0.14;
            tDesiredWorldPitch += kick * 0.14;
            tTorsoRotX += kick * 0.14;
          }
          tVentFlare = 0.55 + brace * 0.45;
          tCloak1 = 0.24;
        }
      }

      const tWRotX = tDesiredWorldPitch - (tPelvisRotX + tTorsoRotX);

      if (flinchTimer > 0) {
        const fl = Math.min(1, flinchTimer * 2.6);
        tTorsoRotX += fl * 0.36;
        tTorsoRotZ += flinchDirX * fl * 0.26;
        tHeadRotX += fl * 0.3;
      }

      // ---- 4. EXPONENTIAL JOINT DAMPING (Crisp Yet Fluid Human Motion) ----
      const legRate = behavior === 'attack' ? 18 : 13;
      const bodyRate = behavior === 'attack' ? 19 : 14;
      const gunRate = behavior === 'attack' ? 24 : 16;

      anim.lHipX = damp(anim.lHipX, tLHipX, legRate, dt);
      anim.lHipZ = damp(anim.lHipZ, tLHipZ, legRate, dt);
      anim.lKneeX = damp(anim.lKneeX, tLKneeX, legRate, dt);
      anim.lAnkleX = damp(anim.lAnkleX, -(tLHipX + tLKneeX), legRate, dt);

      anim.rHipX = damp(anim.rHipX, tRHipX, legRate, dt);
      anim.rHipZ = damp(anim.rHipZ, tRHipZ, legRate, dt);
      anim.rKneeX = damp(anim.rKneeX, tRKneeX, legRate, dt);
      const rAnkleTarget = poseMode === 'snipe_kneel' || attackVariant === 1 ? 0.42 : -(tRHipX + tRKneeX);
      anim.rAnkleX = damp(anim.rAnkleX, rAnkleTarget, legRate, dt);

      // Analytical exact pelvis height so boots/kneecap kiss y = 0 with ZERO floating or floor clipping!
      const dropL = computeBipedLegDrop(anim.lHipX, anim.lKneeX, anim.lHipZ);
      const dropR = computeBipedLegDrop(anim.rHipX, anim.rKneeX, anim.rHipZ);
      const groundedPelvisY = Math.max(dropL, dropR) + (airborneHeight ?? 0);

      anim.pelvisX = damp(anim.pelvisX, tPelvisX, bodyRate, dt);
      anim.pelvisY = damp(anim.pelvisY, groundedPelvisY, 22, dt);
      anim.pelvisZ = damp(anim.pelvisZ, tPelvisZ, bodyRate, dt);
      anim.pelvisRotX = damp(anim.pelvisRotX, tPelvisRotX, bodyRate, dt);
      anim.pelvisRotY = damp(anim.pelvisRotY, tPelvisRotY, bodyRate, dt);
      anim.pelvisRotZ = damp(anim.pelvisRotZ, tPelvisRotZ, bodyRate, dt);

      anim.torsoRotX = damp(anim.torsoRotX, tTorsoRotX, bodyRate, dt);
      anim.torsoRotY = damp(anim.torsoRotY, tTorsoRotY, bodyRate, dt);
      anim.torsoRotZ = damp(anim.torsoRotZ, tTorsoRotZ, bodyRate, dt);

      anim.headRotX = damp(anim.headRotX, tHeadRotX, bodyRate, dt);
      anim.headRotY = damp(anim.headRotY, tHeadRotY, bodyRate, dt);
      anim.headRotZ = damp(anim.headRotZ, tHeadRotZ, bodyRate, dt);

      anim.wPosX = damp(anim.wPosX, tWPosX, gunRate, dt);
      anim.wPosY = damp(anim.wPosY, tWPosY, gunRate, dt);
      anim.wPosZ = damp(anim.wPosZ, tWPosZ, gunRate, dt);
      anim.wRotX = damp(anim.wRotX, tWRotX, gunRate, dt);
      anim.wRotY = damp(anim.wRotY, tWRotY, gunRate, dt);
      anim.wRotZ = damp(anim.wRotZ, tWRotZ, gunRate, dt);
      anim.gunRecoilZ = damp(anim.gunRecoilZ, tRecoilZ, 28, dt);
      anim.ventFlare = damp(anim.ventFlare, tVentFlare, 10, dt);
      anim.leftHandGripBlend = damp(anim.leftHandGripBlend, tLeftGripBlend, 14, dt);
      anim.cloakSwing1 = damp(anim.cloakSwing1, tCloak1, 10, dt);
      anim.cloakSwing2 = damp(anim.cloakSwing2, tCloak2, 10, dt);
      anim.thrusterScale = damp(anim.thrusterScale, tThruster, 14, dt);

      // Apply transforms
      pelvis.position.set(anim.pelvisX, anim.pelvisY, anim.pelvisZ);
      pelvis.rotation.set(anim.pelvisRotX, anim.pelvisRotY, anim.pelvisRotZ);
      torso.rotation.set(anim.torsoRotX, anim.torsoRotY, anim.torsoRotZ);
      headGroup.rotation.set(anim.headRotX, anim.headRotY, anim.headRotZ);

      leftLeg.hip.rotation.set(anim.lHipX, 0, anim.lHipZ);
      leftLeg.knee.rotation.set(anim.lKneeX, 0, 0);
      leftLeg.ankle.rotation.set(anim.lAnkleX, 0, -anim.lHipZ);
      leftLeg.thrusterCone.scale.setScalar(anim.thrusterScale);

      rightLeg.hip.rotation.set(anim.rHipX, 0, anim.rHipZ);
      rightLeg.knee.rotation.set(anim.rKneeX, 0, 0);
      rightLeg.ankle.rotation.set(anim.rAnkleX, 0, -anim.rHipZ);
      rightLeg.thrusterCone.scale.setScalar(anim.thrusterScale);

      // Secondary cloth-armor pteruges & half-cloak physics
      frontTasset.rotation.x = Math.max(0.06, Math.max(anim.lHipX, anim.rHipX) * 0.52);
      sideTassets[0].rotation.z = -Math.max(0, -anim.lHipZ) * 0.55;
      sideTassets[1].rotation.z = Math.max(0, anim.rHipZ) * 0.55;
      cloakUpperPivot.rotation.x = anim.cloakSwing1;
      cloakLowerPivot.rotation.x = anim.cloakSwing2;

      // Apply weapon transform and solve exact 2-bone analytical arm IK to grips!
      weaponMount.position.set(anim.wPosX, anim.wPosY, anim.wPosZ);
      weaponMount.rotation.set(anim.wRotX, anim.wRotY, anim.wRotZ);
      weaponMount.updateMatrix();
      gunGroup.position.set(0, 0, anim.gunRecoilZ);
      gunGroup.updateMatrix();

      _rGripTorso.copy(rightGripAnchor.position).applyMatrix4(gunGroup.matrix).applyMatrix4(weaponMount.matrix);
      _lGripTorso.copy(leftGripAnchor.position).applyMatrix4(gunGroup.matrix).applyMatrix4(weaponMount.matrix);

      if (anim.leftHandGripBlend < 0.99) {
        _freeLTarget.set(-0.34, 0.25, -0.22);
        _lGripTorso.lerp(_freeLTarget, 1 - anim.leftHandGripBlend);
      }

      _rPole.set(0.68, -0.58, 0.44);
      _lPole.set(-0.74, -0.56, 0.36);
      solveTwoBoneArm(rightArm, rightShoulderPos, _rGripTorso, _rPole);
      solveTwoBoneArm(leftArm, leftShoulderPos, _lGripTorso, _lPole);

      rightArm.wrist.rotation.set(0.18, 0.22, -0.12);
      leftArm.wrist.rotation.set(0.24, -0.35, 0.18);

      // ---- 5. DORSAL TESLA COIL SPINNERS, LIVE LIGHTNING ARCS, PLASMA-WEB LATTICE & AURA ----
      const spinRate = 3.2 + chargeLevel * 9.5 + overdriven * 4.5;
      const spin = elapsed * spinRate;
      coilOuterRotors[0].rotation.z = spin;
      coilOuterRotors[1].rotation.z = -spin;
      coilInnerRotors[0].rotation.y = -spin * 1.35;
      coilInnerRotors[1].rotation.y = spin * 1.35;

      capacitorDrum.rotation.z = elapsed * (2.6 + chargeLevel * 14.0 + overdriven * 3.5);

      dorsalVents[0].rotation.y = -anim.ventFlare * 0.55;
      dorsalVents[1].rotation.y = anim.ventFlare * 0.55;

      // Live crackling 3-strand dorsal Tesla lightning arcs
      for (let a = 0; a < dorsalArcs.length; a++) {
        const arc = dorsalArcs[a];
        const fl = Math.sin(elapsed * (28 + a * 9) + a * 2.1);
        arc.visible = !weakpointBroken && (chargeLevel > 0.2 || overdriven > 0.35 || fl > -0.1);
        arc.rotation.y = Math.sin(elapsed * 22 + a) * 0.16;
        arc.rotation.z = Math.cos(elapsed * 19 + a * 1.7) * 0.12;
        const sc = 0.75 + chargeLevel * 0.65 + overdriven * 0.35;
        arc.scale.set(1, sc, sc);
      }

      // Live crackling 3D Trident muzzle plasma-web lattice + spinning 3D hex energy wire torus
      for (let m = 0; m < muzzleArcFilaments.length; m++) {
        const mf = muzzleArcFilaments[m];
        mf.visible = !weakpointBroken || chargeLevel > 0.2;
        if (m < 3) {
          mf.rotation.y = Math.sin(elapsed * (30 + m * 8) + m) * 0.14;
        }
        const msc = 0.8 + chargeLevel * 0.6;
        mf.scale.set(1, msc, msc);
      }
      muzzleWebRing.rotation.z = elapsed * (4.5 + chargeLevel * 10.5);
      muzzleWebRing.scale.setScalar(0.84 + chargeLevel * 0.28 + Math.sin(elapsed * 22) * 0.04);
      webArcMat.opacity = clamp(0.38 + chargeLevel * 0.34 + overdriven * 0.14, 0.24, 0.76);

      // Dorsal Electric-Cyan Overdrive Corona Halo framing behind the Tesla coils in Phase 2
      const haloActive = !weakpointBroken && (overdriven > 0.45 || chargeLevel > 0.85);
      overdriveHalo.visible = haloActive;
      if (haloActive) {
        overdriveHalo.rotation.z = elapsed * 4.4;
        overdriveHalo.rotation.y = Math.sin(elapsed * 3.6) * 0.16;
        overdriveHalo.rotation.x = Math.cos(elapsed * 3.1) * 0.12;
        const hSc = 0.94 + Math.sin(elapsed * 16) * 0.05 + chargeLevel * 0.1;
        overdriveHalo.scale.setScalar(hSc);
        overdriveHaloMat.opacity = clamp(0.28 + chargeLevel * 0.24 + overdriven * 0.14, 0.22, 0.6);
      }

      // Calibrated ACES-safe electric-cyan luminescence (vivid cyan glow without whiteout)
      weakpointMat.emissiveIntensity = weakpointBroken
        ? 0.18
        : 1.55 + chargeLevel * 0.85 + overdriven * 0.42 + Math.sin(elapsed * 8.5) * 0.25;
      opticCyanMat.emissiveIntensity = 1.42 + chargeLevel * 0.38 + overdriven * 0.32;

      const bulbPulse = weakpointBroken ? 0.84 : 1.0 + Math.sin(elapsed * 10) * 0.06 + chargeLevel * 0.14;
      coilBulbs[0].scale.setScalar(bulbPulse);
      coilBulbs[1].scale.setScalar(bulbPulse);

      const sternumPulse = 1 + Math.sin(elapsed * (overdriven > 0.5 ? 11 : 5.5)) * 0.1;
      sternalCore.scale.set(0.95 * sternumPulse, 1.15 * sternumPulse, 0.55 * sternumPulse);

      // Menacing Ground Aura Sigil & Rising Electric-Cyan Spark Motes
      const airFade = clamp(1 - (airborneHeight ?? 0) * 0.32, 0.22, 1);
      shadow.scale.setScalar(airFade);
      auraRing.rotation.y = elapsed * (0.45 + overdriven * 0.55 + chargeLevel * 0.4);
      const auraScale = 0.95 + chargeLevel * 0.16 + overdriven * 0.16 + Math.sin(elapsed * 4.2) * 0.04;
      auraRing.scale.setScalar(auraScale * airFade);
      auraRingMat.opacity = (0.4 + chargeLevel * 0.24 + overdriven * 0.22) * airFade;

      auraMoteMat.opacity = 0.55 + chargeLevel * 0.25 + overdriven * 0.2;
      for (let i = 0; i < auraMotes.length; i++) {
        const m = auraMotes[i];
        const tCycle = (elapsed * m.riseSpeed * (1 + overdriven * 0.5) + m.phase) % 1;
        const ang = m.angleOffset + elapsed * m.speed * (1 + chargeLevel * 0.6);
        const rad = m.radius * (1.0 - tCycle * 0.22) + Math.sin(elapsed * 7 + i) * 0.05;
        m.mesh.position.set(
          Math.cos(ang) * rad,
          0.12 + tCycle * 2.15 + (airborneHeight ?? 0) * 0.5,
          Math.sin(ang) * rad
        );
        m.mesh.rotation.y = ang * 2;
        const sc = Math.sin(tCycle * Math.PI) * (0.75 + chargeLevel * 0.45 + overdriven * 0.35);
        m.mesh.scale.set(0.55 * sc, 1.85 * sc, 0.55 * sc);
      }
    },
    dispose() {
      for (const g of ownedGeos) g.dispose();
      for (const m of ownedMats) m.dispose();
    },
  };
}
