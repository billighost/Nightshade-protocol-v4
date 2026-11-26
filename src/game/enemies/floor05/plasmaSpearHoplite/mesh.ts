import * as THREE from 'three';
import {
  createBeveledBox,
  createContouredArmorPlate,
  createCurvedPanelGeometry,
  createLoftedAnatomy,
  createSculptedHand,
  createStrapTube,
} from '../../../core/sculptUtils';
import { createEnemyContactShadow, createEnemyHitboxMesh } from '../../core/enemyMeshShared';
import type { EnemyAnimationInput, EnemyRigHandle } from '../../core/types';
import type { Floor05EnemyMaterials } from '../materials';
import type { HopliteTextureSuite } from './textures';

export type HoplitePoseMode =
  | 'march'
  | 'strafe'
  | 'brace'
  | 'lunge'
  | 'sweep'
  | 'javelin'
  | 'flurry'
  | 'shield_bash'
  | 'vault_plunge';

export interface PlasmaSpearHopliteRigHandle extends EnemyRigHandle {
  setPoseMode: (mode: HoplitePoseMode) => void;
  setSpearCharge: (charge: number) => void;
  setEnragedIntensity: (intensity: number) => void;
  getSpearTipWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  getShieldWorldPos: (out: THREE.Vector3) => THREE.Vector3;
}

interface HopliteLegRig {
  hip: THREE.Group;
  knee: THREE.Group;
  ankle: THREE.Group;
}

interface HopliteArmRig {
  shoulder: THREE.Group;
  elbow: THREE.Group;
  wrist: THREE.Group;
}

interface AuraMoteState {
  mesh: THREE.Mesh;
  angleOffset: number;
  radius: number;
  speed: number;
  riseSpeed: number;
  phase: number;
}

function damp(curr: number, target: number, lambda: number, dt: number): number {
  const f = 1 - Math.exp(-lambda * Math.min(0.1, Math.max(0.001, dt)));
  return curr + (target - curr) * f;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

function easeOutCubic(t: number): number {
  const x = 1 - clamp01(t);
  return 1 - x * x * x;
}

function easeInQuad(t: number): number {
  const x = clamp01(t);
  return x * x;
}

function easeOutBack(t: number): number {
  const x = clamp01(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function remapGeoUvV(geo: THREE.BufferGeometry, vMin: number, vMax: number): void {
  const uv = geo.getAttribute('uv');
  if (!uv) return;
  for (let i = 0; i < uv.count; i++) {
    const v = uv.getY(i);
    uv.setY(i, vMin + v * (vMax - vMin));
  }
  uv.needsUpdate = true;
}

/**
 * Analytical torso surface mapper for `createContouredArmorPlate` (zero Z-fighting).
 */
function mapHopliteTorsoSurface(u: number, v: number, offset: number): [number, number, number] {
  const t = clamp01(v / 0.56);
  let rx: number;
  let rz: number;
  let pinchFront: number;
  if (t < 0.36) {
    const k = t / 0.36;
    rx = 0.164 + k * 0.056;
    rz = 0.13 + k * 0.042;
    pinchFront = 0.008 + k * 0.022;
  } else if (t < 0.74) {
    const k = (t - 0.36) / 0.38;
    rx = 0.22 + k * 0.052;
    rz = 0.172 + k * 0.02;
    pinchFront = 0.03 + k * 0.012;
  } else {
    const k = (t - 0.74) / 0.26;
    rx = 0.272 - k * 0.044;
    rz = 0.192 - k * 0.042;
    pinchFront = 0.042 - k * 0.028;
  }

  const cosU = Math.cos(u);
  const sinU = Math.sin(u);
  const sq = 2.55;
  const exp = 2 / sq;
  const sx = Math.sign(cosU) * Math.pow(Math.abs(cosU), exp);
  const sz = Math.sign(sinU) * Math.pow(Math.abs(sinU), exp);
  const frontPinch = sinU < 0 ? Math.pow(-sinU, 4) * pinchFront : 0;

  const baseX = sx * rx;
  const baseZ = sz * rz - frontPinch;
  const radLen = Math.hypot(baseX, baseZ) || 1;
  return [baseX + (baseX / radLen) * offset, v, baseZ + (baseZ / radLen) * offset];
}

function buildSculptedHopliteLeg(
  side: -1 | 1,
  cuirassMat: THREE.Material,
  darkSteelMat: THREE.Material,
  bronzeMat: THREE.Material,
  undersuitMat: THREE.Material,
  jointMat: THREE.Material,
  crimsonMat: THREE.Material,
  plasmaVeinMat: THREE.Material,
  ownedGeos: THREE.BufferGeometry[]
): HopliteLegRig {
  const hip = new THREE.Group();

  // Strictly ascending-Y slices so all vertex normals face OUTWARD!
  const thighGeo = createLoftedAnatomy(
    [
      { y: -0.44, rx: 0.068, rz: 0.072, squareness: 2.2 },
      { y: -0.32, rx: 0.084, rz: 0.09, squareness: 2.35 },
      { y: -0.16, rx: 0.1, rz: 0.108, squareness: 2.45 },
      { y: 0.0, rx: 0.096, rz: 0.102, squareness: 2.3 },
    ],
    18
  );
  ownedGeos.push(thighGeo);
  const thighMesh = new THREE.Mesh(thighGeo, undersuitMat);
  thighMesh.castShadow = true;
  hip.add(thighMesh);

  const cuisseGeo = createCurvedPanelGeometry(
    [
      { y: -0.37, rx: 0.086, rz: 0.092, thickness: 0.022 },
      { y: -0.22, rx: 0.106, rz: 0.114, thickness: 0.026 },
      { y: -0.07, rx: 0.104, rz: 0.11, thickness: 0.024 },
    ],
    side === -1 ? -Math.PI * 1.15 : -Math.PI * 0.48,
    side === -1 ? -Math.PI * 0.52 : Math.PI * 0.15,
    12
  );
  ownedGeos.push(cuisseGeo);
  const cuisse = new THREE.Mesh(cuisseGeo, cuirassMat);
  cuisse.castShadow = true;
  hip.add(cuisse);

  const thighTrim = new THREE.Mesh(createBeveledBox(0.036, 0.24, 0.022, 0.006), bronzeMat);
  thighTrim.position.set(side * 0.048, -0.22, -0.1);
  thighTrim.rotation.y = -side * 0.35;
  hip.add(thighTrim);

  const thighBand = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.012, 8, 18), crimsonMat);
  thighBand.rotation.x = Math.PI * 0.5;
  thighBand.position.set(0, -0.32, 0);
  hip.add(thighBand);

  // Articulated Knee Joint at y = -0.44 (human backward knee bend = negative rotX)
  const knee = new THREE.Group();
  knee.position.set(0, -0.44, 0);
  hip.add(knee);

  const kneeDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.145, 14), jointMat);
  kneeDrum.rotation.z = Math.PI * 0.5;
  knee.add(kneeDrum);

  const kneeCowlGeo = createCurvedPanelGeometry(
    [
      { y: -0.075, rx: 0.08, rz: 0.09, thickness: 0.024 },
      { y: 0.0, rx: 0.096, rz: 0.11, thickness: 0.03 },
      { y: 0.085, rx: 0.076, rz: 0.088, thickness: 0.022 },
    ],
    -Math.PI * 0.86,
    -Math.PI * 0.14,
    12
  );
  ownedGeos.push(kneeCowlGeo);
  const kneeGuard = new THREE.Mesh(kneeCowlGeo, bronzeMat);
  kneeGuard.castShadow = true;
  knee.add(kneeGuard);

  const kneeSpike = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.095, 6), darkSteelMat);
  kneeSpike.rotation.x = -Math.PI * 0.42;
  kneeSpike.position.set(0, 0.015, -0.122);
  knee.add(kneeSpike);

  // Strictly ascending-Y sculpted Spartan Greave Shin
  const shinGeo = createLoftedAnatomy(
    [
      { y: -0.43, rx: 0.052, rz: 0.06, squareness: 2.2 },
      { y: -0.32, rx: 0.062, rz: 0.07, squareness: 2.35 },
      { y: -0.15, rx: 0.084, rz: 0.1, squareness: 2.6, pinchFront: 0.03, backScale: 1.12 },
      { y: 0.0, rx: 0.07, rz: 0.08, squareness: 2.35 },
    ],
    18
  );
  ownedGeos.push(shinGeo);
  const shinMesh = new THREE.Mesh(shinGeo, cuirassMat);
  shinMesh.castShadow = true;
  knee.add(shinMesh);

  const greaveCrest = new THREE.Mesh(createBeveledBox(0.034, 0.34, 0.03, 0.008), bronzeMat);
  greaveCrest.position.set(0, -0.2, -0.1);
  greaveCrest.rotation.x = 0.06;
  knee.add(greaveCrest);

  // Subtle glowing molten plasma heat-vein embedded down the greave shin crest
  const shinVein = new THREE.Mesh(createBeveledBox(0.012, 0.24, 0.016, 0.003), plasmaVeinMat);
  shinVein.position.set(0, -0.2, -0.114);
  shinVein.rotation.x = 0.06;
  knee.add(shinVein);

  const achillesRod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.012, 0.32, 8), jointMat);
  achillesRod.position.set(0, -0.22, 0.09);
  achillesRod.rotation.x = 0.08;
  knee.add(achillesRod);

  const calfGuard = new THREE.Mesh(createBeveledBox(0.074, 0.16, 0.038, 0.01), darkSteelMat);
  calfGuard.position.set(0, -0.14, 0.094);
  knee.add(calfGuard);

  // Articulated Ankle + Flanged Armored Spartan War-Sabaton Boot (sole bottom at y = -0.09 => total 0.96m!)
  const ankle = new THREE.Group();
  ankle.position.set(0, -0.43, 0);
  knee.add(ankle);

  const ankleJoint = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.115, 10), jointMat);
  ankleJoint.rotation.z = Math.PI * 0.5;
  ankle.add(ankleJoint);

  const bootVamp = new THREE.Mesh(createBeveledBox(0.118, 0.066, 0.25, 0.014), darkSteelMat);
  bootVamp.position.set(0, -0.036, -0.044);
  bootVamp.castShadow = true;
  ankle.add(bootVamp);

  const bootToePlate = new THREE.Mesh(createBeveledBox(0.106, 0.048, 0.09, 0.012), bronzeMat);
  bootToePlate.position.set(0, -0.048, -0.144);
  bootToePlate.rotation.x = 0.14;
  ankle.add(bootToePlate);

  const bootHeelSpur = new THREE.Mesh(createBeveledBox(0.09, 0.045, 0.064, 0.008), bronzeMat);
  bootHeelSpur.position.set(0, -0.052, 0.078);
  ankle.add(bootHeelSpur);

  const bootSole = new THREE.Mesh(createBeveledBox(0.134, 0.028, 0.29, 0.006), undersuitMat);
  bootSole.position.set(0, -0.076, -0.046);
  ankle.add(bootSole);

  return { hip, knee, ankle };
}

function buildSculptedHopliteArm(
  side: -1 | 1,
  cuirassMat: THREE.Material,
  darkSteelMat: THREE.Material,
  bronzeMat: THREE.Material,
  crimsonMat: THREE.Material,
  undersuitMat: THREE.Material,
  jointMat: THREE.Material,
  plasmaVeinMat: THREE.Material,
  ownedGeos: THREE.BufferGeometry[]
): HopliteArmRig {
  const shoulder = new THREE.Group();
  // YXZ order lets shoulder.rotation.y cleanly swing the arm across the chest without gimbal-twisting the shield!
  shoulder.rotation.order = 'YXZ';

  const angStart = side === -1 ? Math.PI * 0.48 : -Math.PI * 0.52;
  const angEnd = side === -1 ? Math.PI * 1.52 : Math.PI * 0.52;

  const upperPauldronGeo = createCurvedPanelGeometry(
    [
      { y: -0.08, rx: 0.122, rz: 0.136, thickness: 0.028 },
      { y: 0.025, rx: 0.152, rz: 0.166, thickness: 0.034 },
      { y: 0.128, rx: 0.108, rz: 0.122, thickness: 0.024 },
    ],
    angStart,
    angEnd,
    14
  );
  ownedGeos.push(upperPauldronGeo);
  const upperPauldron = new THREE.Mesh(
    upperPauldronGeo,
    side === -1 ? bronzeMat : crimsonMat
  );
  upperPauldron.position.set(-side * 0.015, 0.042, 0);
  upperPauldron.castShadow = true;
  shoulder.add(upperPauldron);

  const lowerPauldronGeo = createCurvedPanelGeometry(
    [
      { y: -0.158, rx: 0.096, rz: 0.108, thickness: 0.02 },
      { y: -0.072, rx: 0.114, rz: 0.126, thickness: 0.022 },
    ],
    angStart + 0.12,
    angEnd - 0.12,
    12
  );
  ownedGeos.push(lowerPauldronGeo);
  const lowerPauldron = new THREE.Mesh(
    lowerPauldronGeo,
    side === -1 ? darkSteelMat : bronzeMat
  );
  lowerPauldron.position.set(-side * 0.008, 0.012, 0);
  lowerPauldron.castShadow = true;
  shoulder.add(lowerPauldron);

  const shoulderSpike = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.155, 6), bronzeMat);
  shoulderSpike.position.set(side * 0.12, 0.135, 0);
  shoulderSpike.rotation.z = -side * 0.55;
  shoulderSpike.castShadow = true;
  shoulder.add(shoulderSpike);

  if (side === -1) {
    const shoulderCrest = new THREE.Mesh(createBeveledBox(0.036, 0.17, 0.19, 0.008), darkSteelMat);
    shoulderCrest.position.set(-0.072, 0.115, 0);
    shoulderCrest.rotation.z = 0.42;
    shoulder.add(shoulderCrest);
  }

  // Strictly ascending-Y sculpted muscular bicep
  const bicepGeo = createLoftedAnatomy(
    [
      { y: -0.31, rx: 0.054, rz: 0.058, squareness: 2.25 },
      { y: -0.17, rx: 0.07, rz: 0.076, squareness: 2.4 },
      { y: 0.0, rx: 0.068, rz: 0.072, squareness: 2.3 },
    ],
    14
  );
  ownedGeos.push(bicepGeo);
  const bicepMesh = new THREE.Mesh(bicepGeo, undersuitMat);
  bicepMesh.castShadow = true;
  shoulder.add(bicepMesh);

  const bicepBand = new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.07, 0.055, 14), bronzeMat);
  bicepBand.position.set(0, -0.21, 0);
  shoulder.add(bicepBand);

  // Articulated 1-DOF Human Elbow Hinge at y = -0.31
  const elbow = new THREE.Group();
  elbow.position.set(0, -0.31, 0);
  shoulder.add(elbow);

  const elbowServo = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.115, 12), jointMat);
  elbowServo.rotation.z = Math.PI * 0.5;
  elbow.add(elbowServo);

  const elbowGuard = new THREE.Mesh(createBeveledBox(0.078, 0.088, 0.052, 0.012), bronzeMat);
  elbowGuard.position.set(0, 0.0, 0.056);
  elbow.add(elbowGuard);

  // Strictly ascending-Y sculpted armored vambrace forearm
  const forearmGeo = createLoftedAnatomy(
    [
      { y: -0.29, rx: 0.046, rz: 0.05, squareness: 2.35 },
      { y: -0.15, rx: 0.064, rz: 0.07, squareness: 2.55 },
      { y: 0.0, rx: 0.056, rz: 0.062, squareness: 2.4 },
    ],
    14
  );
  ownedGeos.push(forearmGeo);
  const forearmMesh = new THREE.Mesh(forearmGeo, cuirassMat);
  forearmMesh.castShadow = true;
  elbow.add(forearmMesh);

  const vambracePlate = new THREE.Mesh(createBeveledBox(0.036, 0.22, 0.088, 0.01), bronzeMat);
  vambracePlate.position.set(side * 0.056, -0.145, 0.008);
  vambracePlate.castShadow = true;
  elbow.add(vambracePlate);

  const vambraceVein = new THREE.Mesh(createBeveledBox(0.012, 0.15, 0.018, 0.003), plasmaVeinMat);
  vambraceVein.position.set(side * 0.074, -0.145, 0.008);
  elbow.add(vambraceVein);

  const wrist = new THREE.Group();
  wrist.position.set(0, -0.295, -0.01);
  elbow.add(wrist);

  const wristCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.046, 0.042, 12), bronzeMat);
  wrist.add(wristCuff);

  const sculptedHand = createSculptedHand(side, darkSteelMat, bronzeMat, jointMat);
  sculptedHand.scale.setScalar(1.16);
  sculptedHand.rotation.y = side === 1 ? -Math.PI * 0.45 : Math.PI * 0.45;
  wrist.add(sculptedHand);

  return { shoulder, elbow, wrist };
}

export function buildPlasmaSpearHopliteRig(
  enemyId: string,
  mats: Floor05EnemyMaterials,
  textures: HopliteTextureSuite
): PlasmaSpearHopliteRigHandle {
  const root = new THREE.Group();
  root.name = `Hoplite_${enemyId}`;
  const ownedGeos: THREE.BufferGeometry[] = [];
  const ownedMats: THREE.Material[] = [];
  const hitboxes: THREE.Mesh[] = [];

  // Darker, deadlier, battle-forged steel & blackened-bronze PBR palette!
  const cuirassSteelMat = new THREE.MeshStandardMaterial({
    color: 0x6c7484,
    map: textures.cuirassMap,
    bumpMap: textures.cuirassBump,
    bumpScale: 0.04,
    roughnessMap: textures.cuirassRoughness,
    metalness: 0.78,
    roughness: 0.32,
    emissive: 0x000000,
    emissiveIntensity: 0,
  });

  const darkBronzeMat = new THREE.MeshStandardMaterial({
    color: 0xd49640,
    map: textures.cuirassMap,
    bumpMap: textures.cuirassBump,
    bumpScale: 0.028,
    roughnessMap: textures.cuirassRoughness,
    metalness: 0.84,
    roughness: 0.26,
    emissive: 0x000000,
    emissiveIntensity: 0,
  });

  const obsidianArmorMat = new THREE.MeshStandardMaterial({
    color: 0x353b48,
    map: textures.cuirassMap,
    bumpMap: textures.cuirassBump,
    bumpScale: 0.032,
    metalness: 0.68,
    roughness: 0.38,
    emissive: 0x000000,
    emissiveIntensity: 0,
  });

  const bloodCrimsonMat = new THREE.MeshStandardMaterial({
    color: 0xa81624,
    map: textures.cuirassMap,
    bumpMap: textures.cuirassBump,
    bumpScale: 0.026,
    metalness: 0.36,
    roughness: 0.38,
    emissive: 0x000000,
    emissiveIntensity: 0,
  });

  const cloakFabricMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.cloakMap,
    bumpMap: textures.cloakBump,
    bumpScale: 0.034,
    metalness: 0.05,
    roughness: 0.86,
    side: THREE.DoubleSide,
  });

  const bucklerFaceMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.shieldMap,
    bumpMap: textures.shieldBump,
    bumpScale: 0.042,
    metalness: 0.62,
    roughness: 0.34,
  });

  const weakpointMat = mats.createWeakpointMaterial(0xfbbf24, 0xf59e0b);
  const spearEnergyMat = mats.createWeakpointMaterial(0xfef08a, 0xff8c1a);

  const demonEyeMat = new THREE.MeshStandardMaterial({
    color: 0xff7020,
    emissive: 0xff2200,
    emissiveIntensity: 5.0,
    roughness: 0.08,
    metalness: 0.04,
  });

  const plasmaVeinMat = new THREE.MeshStandardMaterial({
    color: 0xffb347,
    emissive: 0xff5a12,
    emissiveIntensity: 2.6,
    roughness: 0.16,
    metalness: 0.1,
  });

  const aegisDomeMat = new THREE.MeshBasicMaterial({
    map: textures.aegisHexMap,
    color: 0xff9a38,
    transparent: true,
    opacity: 0.68,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const spearAuraMat = new THREE.MeshBasicMaterial({
    color: 0xffae2b,
    transparent: true,
    opacity: 0.38,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const auraDiscMat = new THREE.MeshBasicMaterial({
    map: textures.auraRingMap,
    color: 0xff5a1a,
    transparent: true,
    opacity: 0.62,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const auraMoteMat = new THREE.MeshBasicMaterial({
    color: 0xffaa33,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const maskVoidMat = new THREE.MeshStandardMaterial({
    color: 0x070609,
    roughness: 0.96,
    metalness: 0.08,
  });

  ownedMats.push(
    cuirassSteelMat,
    darkBronzeMat,
    obsidianArmorMat,
    bloodCrimsonMat,
    cloakFabricMat,
    bucklerFaceMat,
    weakpointMat,
    spearEnergyMat,
    demonEyeMat,
    plasmaVeinMat,
    aegisDomeMat,
    spearAuraMat,
    auraDiscMat,
    auraMoteMat,
    maskVoidMat
  );

  // Ground contact shadow + Scary Menacing Ground War-Aura Halo
  const shadow = createEnemyContactShadow(0.88, mats.shadowDisc);
  root.add(shadow);

  const auraDiscGeo = new THREE.PlaneGeometry(2.48, 2.48);
  auraDiscGeo.rotateX(-Math.PI * 0.5);
  ownedGeos.push(auraDiscGeo);
  const auraDisc = new THREE.Mesh(auraDiscGeo, auraDiscMat);
  auraDisc.position.y = 0.026;
  auraDisc.renderOrder = 2;
  root.add(auraDisc);

  // Orbiting Molten Ember Aura Motes around the Hoplite silhouette (16 fiery shards)
  const auraMotesGroup = new THREE.Group();
  root.add(auraMotesGroup);
  const moteGeo = new THREE.OctahedronGeometry(0.036, 0);
  ownedGeos.push(moteGeo);
  const auraMotes: AuraMoteState[] = [];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(moteGeo, auraMoteMat);
    auraMotesGroup.add(m);
    auraMotes.push({
      mesh: m,
      angleOffset: (i / 16) * Math.PI * 2,
      radius: 0.5 + (i % 3) * 0.2,
      speed: (i % 2 === 0 ? 1 : -1) * (0.95 + (i % 4) * 0.35),
      riseSpeed: 0.46 + (i % 3) * 0.22,
      phase: i * 1.13,
    });
  }

  // ---------------------------------------------------------------------------
  // PELVIS, SCULPTED CONTOURED WAR-BELT & ARTICULATED PTERUGES WAR-SKIRT (y = 0.96m)
  // ---------------------------------------------------------------------------
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 0.96, 0);
  root.add(pelvis);

  const waistGeo = createLoftedAnatomy(
    [
      { y: -0.1, rx: 0.162, rz: 0.128, squareness: 2.35 },
      { y: 0.03, rx: 0.194, rz: 0.15, squareness: 2.55 },
      { y: 0.13, rx: 0.172, rz: 0.134, squareness: 2.45 },
    ],
    20
  );
  ownedGeos.push(waistGeo);
  const waistMesh = new THREE.Mesh(waistGeo, mats.gladiatorUndersuit);
  pelvis.add(waistMesh);

  const sculptedBeltGeo = createLoftedAnatomy(
    [
      { y: 0.0, rx: 0.196, rz: 0.152, squareness: 2.55, pinchFront: 0.012 },
      { y: 0.048, rx: 0.208, rz: 0.164, squareness: 2.6, pinchFront: 0.018 },
      { y: 0.095, rx: 0.192, rz: 0.148, squareness: 2.5, pinchFront: 0.012 },
    ],
    22
  );
  ownedGeos.push(sculptedBeltGeo);
  const sculptedBelt = new THREE.Mesh(sculptedBeltGeo, obsidianArmorMat);
  sculptedBelt.castShadow = true;
  pelvis.add(sculptedBelt);

  const beltRimTop = new THREE.Mesh(new THREE.TorusGeometry(0.184, 0.011, 8, 24), darkBronzeMat);
  beltRimTop.rotation.x = Math.PI * 0.5;
  beltRimTop.scale.set(1.08, 0.84, 1);
  beltRimTop.position.y = 0.088;
  pelvis.add(beltRimTop);

  const beltRimBot = beltRimTop.clone();
  beltRimBot.position.y = 0.008;
  pelvis.add(beltRimBot);

  const beltBuckle = new THREE.Mesh(createBeveledBox(0.115, 0.11, 0.044, 0.014), darkBronzeMat);
  beltBuckle.position.set(0, 0.048, -0.172);
  pelvis.add(beltBuckle);

  const beltCore = new THREE.Mesh(createBeveledBox(0.038, 0.046, 0.022, 0.005), plasmaVeinMat);
  beltCore.position.set(0, 0.048, -0.192);
  pelvis.add(beltCore);

  for (const sgn of [-1, 1] as const) {
    const fauldGeo = createCurvedPanelGeometry(
      [
        { y: -0.17, rx: 0.215, rz: 0.15, thickness: 0.02 },
        { y: -0.01, rx: 0.202, rz: 0.148, thickness: 0.022 },
      ],
      sgn === -1 ? Math.PI * 0.72 : -Math.PI * 0.28,
      sgn === -1 ? Math.PI * 1.28 : Math.PI * 0.28,
      10
    );
    ownedGeos.push(fauldGeo);
    const fauld = new THREE.Mesh(fauldGeo, cuirassSteelMat);
    fauld.castShadow = true;
    pelvis.add(fauld);
  }

  // Articulated Pteruges Tassets
  const tassetPivots: THREE.Group[] = [];
  const tassetSpecs: Array<{ x: number; z: number; rotY: number; len: number }> = [
    { x: -0.142, z: -0.148, rotY: 0.26, len: 0.27 },
    { x: -0.072, z: -0.16, rotY: 0.1, len: 0.31 },
    { x: 0.0, z: -0.165, rotY: 0, len: 0.34 },
    { x: 0.072, z: -0.16, rotY: -0.1, len: 0.31 },
    { x: 0.142, z: -0.148, rotY: -0.26, len: 0.27 },
    { x: -0.11, z: 0.15, rotY: Math.PI - 0.18, len: 0.26 },
    { x: 0.0, z: 0.156, rotY: Math.PI, len: 0.28 },
    { x: 0.11, z: 0.15, rotY: Math.PI + 0.18, len: 0.26 },
  ];
  for (const ts of tassetSpecs) {
    const tp = new THREE.Group();
    tp.position.set(ts.x, 0.015, ts.z);
    tp.rotation.y = ts.rotY;
    pelvis.add(tp);
    const strip = new THREE.Mesh(createBeveledBox(0.064, ts.len, 0.02, 0.006), bloodCrimsonMat);
    strip.position.set(0, -ts.len * 0.5, 0);
    strip.castShadow = true;
    tp.add(strip);
    const tipStud = new THREE.Mesh(createBeveledBox(0.056, 0.042, 0.024, 0.006), darkBronzeMat);
    tipStud.position.set(0, -ts.len + 0.022, -0.004);
    tp.add(tipStud);
    tassetPivots.push(tp);
  }

  // Sculpted Articulated Legs
  const leftLeg = buildSculptedHopliteLeg(
    -1,
    cuirassSteelMat,
    obsidianArmorMat,
    darkBronzeMat,
    mats.gladiatorUndersuit,
    mats.gunmetalJoint,
    bloodCrimsonMat,
    plasmaVeinMat,
    ownedGeos
  );
  leftLeg.hip.position.set(-0.155, 0, 0);
  pelvis.add(leftLeg.hip);

  const rightLeg = buildSculptedHopliteLeg(
    1,
    cuirassSteelMat,
    obsidianArmorMat,
    darkBronzeMat,
    mats.gladiatorUndersuit,
    mats.gunmetalJoint,
    bloodCrimsonMat,
    plasmaVeinMat,
    ownedGeos
  );
  rightLeg.hip.position.set(0.155, 0, 0);
  pelvis.add(rightLeg.hip);

  // ---------------------------------------------------------------------------
  // SCULPTED ANATOMICAL TORSO + CONTOURED MUSCLE-CUIRASS (ZERO Z-FIGHTING!)
  // ---------------------------------------------------------------------------
  const torso = new THREE.Group();
  torso.position.set(0, 0.12, 0);
  pelvis.add(torso);

  const torsoCoreGeo = createLoftedAnatomy(
    [
      { y: 0.0, rx: 0.164, rz: 0.13, squareness: 2.45 },
      { y: 0.2, rx: 0.22, rz: 0.172, squareness: 2.55, pinchFront: 0.03 },
      { y: 0.41, rx: 0.272, rz: 0.192, squareness: 2.6, pinchFront: 0.042 },
      { y: 0.56, rx: 0.228, rz: 0.15, squareness: 2.45 },
    ],
    22
  );
  ownedGeos.push(torsoCoreGeo);
  const torsoCoreMesh = new THREE.Mesh(torsoCoreGeo, mats.gladiatorUndersuit);
  torsoCoreMesh.castShadow = true;
  torso.add(torsoCoreMesh);

  const leftPecGeo = createContouredArmorPlate(
    [
      [-Math.PI * 0.535, 0.27],
      [-Math.PI * 0.545, 0.5],
      [-Math.PI * 0.79, 0.515],
      [-Math.PI * 0.93, 0.39],
      [-Math.PI * 0.85, 0.25],
    ],
    mapHopliteTorsoSurface,
    0.025,
    0.16,
    0.008,
    3
  );
  const rightPecGeo = createContouredArmorPlate(
    [
      [-Math.PI * 0.465, 0.27],
      [-Math.PI * 0.15, 0.25],
      [-Math.PI * 0.07, 0.39],
      [-Math.PI * 0.21, 0.515],
      [-Math.PI * 0.455, 0.5],
    ],
    mapHopliteTorsoSurface,
    0.025,
    0.16,
    0.008,
    3
  );
  ownedGeos.push(leftPecGeo, rightPecGeo);

  const leftPec = new THREE.Mesh(leftPecGeo, darkBronzeMat);
  leftPec.castShadow = true;
  torso.add(leftPec);

  const rightPec = new THREE.Mesh(rightPecGeo, darkBronzeMat);
  rightPec.castShadow = true;
  torso.add(rightPec);

  const abHeights: Array<[number, number, number]> = [
    [0.18, 0.258, 0.29],
    [0.1, 0.176, 0.25],
    [0.02, 0.096, 0.22],
  ];
  for (let i = 0; i < abHeights.length; i++) {
    const [y0, y1, span] = abHeights[i];
    const abGeo = createContouredArmorPlate(
      [
        [-Math.PI * 0.5 - span, y0 + 0.012],
        [-Math.PI * 0.5, y0 - 0.014],
        [-Math.PI * 0.5 + span, y0 + 0.012],
        [-Math.PI * 0.5 + span * 0.92, y1],
        [-Math.PI * 0.5, y1 - 0.01],
        [-Math.PI * 0.5 - span * 0.92, y1],
      ],
      mapHopliteTorsoSurface,
      0.02,
      0.16,
      0.006,
      3
    );
    ownedGeos.push(abGeo);
    const abPlate = new THREE.Mesh(abGeo, i % 2 === 0 ? cuirassSteelMat : obsidianArmorMat);
    abPlate.castShadow = true;
    torso.add(abPlate);
  }

  for (const sgn of [-1, 1] as const) {
    const yoke = new THREE.Mesh(createBeveledBox(0.088, 0.044, 0.25, 0.01), darkBronzeMat);
    yoke.position.set(sgn * 0.165, 0.545, -0.01);
    yoke.rotation.set(0.16, -sgn * 0.18, -sgn * 0.16);
    yoke.castShadow = true;
    torso.add(yoke);

    const ventSlit = new THREE.Mesh(createBeveledBox(0.092, 0.016, 0.022, 0.004), plasmaVeinMat);
    ventSlit.position.set(sgn * 0.128, 0.485, -0.2);
    ventSlit.rotation.set(0.15, -sgn * 0.38, -sgn * 0.22);
    torso.add(ventSlit);
  }

  const sternumBezel = new THREE.Mesh(createBeveledBox(0.076, 0.2, 0.024, 0.006), obsidianArmorMat);
  sternumBezel.position.set(0, 0.38, -0.218);
  torso.add(sternumBezel);

  const sternumCore = new THREE.Mesh(createBeveledBox(0.042, 0.172, 0.028, 0.008), plasmaVeinMat);
  sternumCore.position.set(0, 0.38, -0.23);
  torso.add(sternumCore);

  const gorgetGeo = createCurvedPanelGeometry(
    [
      { y: 0.5, rx: 0.188, rz: 0.158, thickness: 0.028 },
      { y: 0.59, rx: 0.16, rz: 0.138, thickness: 0.022 },
    ],
    -Math.PI * 1.15,
    Math.PI * 0.15,
    18
  );
  ownedGeos.push(gorgetGeo);
  const gorget = new THREE.Mesh(gorgetGeo, darkBronzeMat);
  gorget.castShadow = true;
  torso.add(gorget);

  // ---------------------------------------------------------------------------
  // DORSAL PHALANX CAPACITOR (WEAKPOINT ON BACK +Z) + CONDUITS + CONTAINMENT RINGS
  // ---------------------------------------------------------------------------
  const weakpointAnchor = new THREE.Group();
  weakpointAnchor.position.set(0, 0.36, 0.225);
  torso.add(weakpointAnchor);

  const wpHousing = new THREE.Mesh(createBeveledBox(0.26, 0.31, 0.145, 0.022), obsidianArmorMat);
  wpHousing.castShadow = true;
  weakpointAnchor.add(wpHousing);

  const wpCore = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.255, 16), weakpointMat);
  wpCore.position.set(0, 0.01, 0.07);
  weakpointAnchor.add(wpCore);

  const wpRingA = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 8, 20), darkBronzeMat);
  wpRingA.position.set(0, 0.06, 0.07);
  wpRingA.rotation.x = Math.PI * 0.5;
  weakpointAnchor.add(wpRingA);

  const wpRingB = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 8, 20), darkBronzeMat);
  wpRingB.position.set(0, -0.05, 0.07);
  wpRingB.rotation.x = Math.PI * 0.5;
  weakpointAnchor.add(wpRingB);

  const wpFinL = new THREE.Mesh(createBeveledBox(0.036, 0.27, 0.1, 0.008), darkBronzeMat);
  wpFinL.position.set(-0.125, 0.02, 0.048);
  wpFinL.rotation.y = 0.22;
  weakpointAnchor.add(wpFinL);

  const wpFinR = new THREE.Mesh(createBeveledBox(0.036, 0.27, 0.1, 0.008), darkBronzeMat);
  wpFinR.position.set(0.125, 0.02, 0.048);
  wpFinR.rotation.y = -0.22;
  weakpointAnchor.add(wpFinR);

  for (const sgn of [-1, 1] as const) {
    const conduitGeo = createStrapTube(
      [
        new THREE.Vector3(sgn * 0.075, 0.44, 0.245),
        new THREE.Vector3(sgn * 0.17, 0.52, 0.18),
        new THREE.Vector3(sgn * 0.25, 0.5, 0.06),
      ],
      0.015,
      0.9,
      14
    );
    ownedGeos.push(conduitGeo);
    const conduit = new THREE.Mesh(conduitGeo, plasmaVeinMat);
    torso.add(conduit);
  }

  // ---------------------------------------------------------------------------
  // SEAMLESS 2-STAGE 3D DRAPED CRIMSON SPARTAN WAR-CLOAK (Continuous UV Split!)
  // Upper panel samples v in [0.50 .. 1.00], Lower panel samples v in [0.00 .. 0.50]!
  // ---------------------------------------------------------------------------
  const cloakUpper = new THREE.Group();
  cloakUpper.position.set(0, 0.53, 0.145);
  torso.add(cloakUpper);

  for (const sgn of [-1, 1] as const) {
    const clasp = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.026, 10), darkBronzeMat);
    clasp.rotation.x = Math.PI * 0.5;
    clasp.position.set(sgn * 0.195, 0.01, -0.01);
    cloakUpper.add(clasp);
  }

  const cloakUpperGeo = createCurvedPanelGeometry(
    [
      { y: -0.48, rx: 0.34, rz: 0.16, thickness: 0.016, offsetZ: -0.02, creaseAmp: 0.022 },
      { y: -0.24, rx: 0.28, rz: 0.12, thickness: 0.016, offsetZ: -0.01, creaseAmp: 0.014 },
      { y: 0.0, rx: 0.23, rz: 0.08, thickness: 0.016, offsetZ: 0.0, creaseAmp: 0.006 },
    ],
    Math.PI * 0.14,
    Math.PI * 0.86,
    18
  );
  remapGeoUvV(cloakUpperGeo, 0.5, 1.0);
  ownedGeos.push(cloakUpperGeo);
  const cloakUpperMesh = new THREE.Mesh(cloakUpperGeo, cloakFabricMat);
  cloakUpperMesh.castShadow = true;
  cloakUpper.add(cloakUpperMesh);

  const cloakLower = new THREE.Group();
  cloakLower.position.set(0, -0.47, 0.02);
  cloakUpper.add(cloakLower);

  const cloakLowerGeo = createCurvedPanelGeometry(
    [
      { y: -0.48, rx: 0.42, rz: 0.22, thickness: 0.014, offsetZ: 0.04, creaseAmp: 0.032 },
      { y: -0.22, rx: 0.37, rz: 0.18, thickness: 0.014, offsetZ: 0.02, creaseAmp: 0.026 },
      { y: 0.0, rx: 0.34, rz: 0.15, thickness: 0.015, offsetZ: 0.0, creaseAmp: 0.02 },
    ],
    Math.PI * 0.12,
    Math.PI * 0.88,
    18
  );
  remapGeoUvV(cloakLowerGeo, 0.0, 0.5);
  ownedGeos.push(cloakLowerGeo);
  const cloakLowerMesh = new THREE.Mesh(cloakLowerGeo, cloakFabricMat);
  cloakLowerMesh.castShadow = true;
  cloakLower.add(cloakLowerMesh);

  // ---------------------------------------------------------------------------
  // TERRIFYING CORINTHIAN DEATH-MASK WAR-HELM + HORNS + RAZOR-GLOW DEMON EYES
  // ---------------------------------------------------------------------------
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.59, -0.01);
  torso.add(headGroup);

  const neckGeo = createLoftedAnatomy(
    [
      { y: -0.04, rx: 0.088, rz: 0.092, squareness: 2.2 },
      { y: 0.06, rx: 0.074, rz: 0.078, squareness: 2.15 },
    ],
    14
  );
  ownedGeos.push(neckGeo);
  const neckMesh = new THREE.Mesh(neckGeo, mats.gladiatorUndersuit);
  headGroup.add(neckMesh);

  for (const sgn of [-1, 1] as const) {
    const tendon = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.015, 0.11, 8), mats.gunmetalJoint);
    tendon.position.set(sgn * 0.058, 0.005, -0.048);
    tendon.rotation.z = sgn * 0.22;
    headGroup.add(tendon);
  }

  const helmDomeGeo = createLoftedAnatomy(
    [
      { y: 0.02, rx: 0.104, rz: 0.126, squareness: 2.4 },
      { y: 0.13, rx: 0.134, rz: 0.156, squareness: 2.6, pinchFront: 0.028, backScale: 1.14 },
      { y: 0.24, rx: 0.124, rz: 0.144, squareness: 2.35, backScale: 1.08 },
      { y: 0.315, rx: 0.068, rz: 0.084, squareness: 2.0 },
    ],
    20
  );
  ownedGeos.push(helmDomeGeo);
  const helmDome = new THREE.Mesh(helmDomeGeo, darkBronzeMat);
  helmDome.castShadow = true;
  headGroup.add(helmDome);

  // Recessed Pitch-Black Inner Death-Mask Face Void
  const maskVoid = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.088, 0.19, 14), maskVoidMat);
  maskVoid.position.set(0, 0.125, -0.062);
  headGroup.add(maskVoid);

  for (const sgn of [-1, 1] as const) {
    const browPlate = new THREE.Mesh(createBeveledBox(0.115, 0.04, 0.084, 0.01), darkBronzeMat);
    browPlate.position.set(sgn * 0.055, 0.21, -0.126);
    browPlate.rotation.set(0.28, -sgn * 0.34, sgn * 0.28);
    headGroup.add(browPlate);

    // Swept Obsidian-Iron Temple War-Horns framing the Corinthian helmet!
    const templeHorn = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.155, 6), obsidianArmorMat);
    templeHorn.position.set(sgn * 0.138, 0.245, -0.02);
    templeHorn.rotation.set(-0.42, 0, -sgn * 0.65);
    headGroup.add(templeHorn);

    const cheekBlade = new THREE.Mesh(createBeveledBox(0.054, 0.155, 0.105, 0.01), darkBronzeMat);
    cheekBlade.position.set(sgn * 0.096, 0.072, -0.094);
    cheekBlade.rotation.set(-0.08, -sgn * 0.42, -sgn * 0.14);
    cheekBlade.castShadow = true;
    headGroup.add(cheekBlade);

    const cheekFang = new THREE.Mesh(new THREE.ConeGeometry(0.019, 0.088, 5), obsidianArmorMat);
    cheekFang.position.set(sgn * 0.09, 0.015, -0.142);
    cheekFang.rotation.set(-Math.PI * 0.44, 0, -sgn * 0.22);
    headGroup.add(cheekFang);

    // RAZOR-SHARP BLAZING MOLTEN-CRIMSON PREDATOR EYE SLITS (unmistakable & terrifying!)
    const eyeSlit = new THREE.Mesh(createBeveledBox(0.074, 0.028, 0.032, 0.005), demonEyeMat);
    eyeSlit.position.set(sgn * 0.054, 0.156, -0.156);
    eyeSlit.rotation.set(0, -sgn * 0.36, sgn * 0.3);
    headGroup.add(eyeSlit);
  }

  const nasalBlade = new THREE.Mesh(createBeveledBox(0.022, 0.092, 0.034, 0.005), obsidianArmorMat);
  nasalBlade.position.set(0, 0.142, -0.162);
  nasalBlade.rotation.x = 0.12;
  headGroup.add(nasalBlade);

  const jawFurnace = new THREE.Mesh(createBeveledBox(0.104, 0.072, 0.028, 0.005), plasmaVeinMat);
  jawFurnace.position.set(0, 0.055, -0.14);
  headGroup.add(jawFurnace);

  for (let t = -2; t <= 2; t++) {
    const fangBar = new THREE.Mesh(createBeveledBox(0.013, 0.088, 0.028, 0.003), obsidianArmorMat);
    fangBar.position.set(t * 0.022, 0.055, -0.156);
    fangBar.rotation.x = -0.14;
    headGroup.add(fangBar);
  }

  const chinGuard = new THREE.Mesh(createBeveledBox(0.114, 0.034, 0.072, 0.008), darkBronzeMat);
  chinGuard.position.set(0, 0.012, -0.13);
  headGroup.add(chinGuard);

  const crestHolder = new THREE.Mesh(createBeveledBox(0.044, 0.065, 0.23, 0.008), obsidianArmorMat);
  crestHolder.position.set(0, 0.31, 0.01);
  headGroup.add(crestHolder);

  const plumePivot = new THREE.Group();
  plumePivot.position.set(0, 0.315, 0.02);
  headGroup.add(plumePivot);

  const plumeShape = new THREE.Shape();
  plumeShape.moveTo(-0.15, -0.02);
  plumeShape.quadraticCurveTo(-0.07, 0.22, 0.15, 0.19);
  plumeShape.lineTo(0.25, 0.13);
  plumeShape.lineTo(0.21, 0.06);
  plumeShape.lineTo(0.31, -0.04);
  plumeShape.lineTo(0.23, -0.12);
  plumeShape.lineTo(0.29, -0.26);
  plumeShape.lineTo(0.16, -0.19);
  plumeShape.quadraticCurveTo(0.12, -0.02, -0.04, -0.01);
  plumeShape.closePath();
  const plumeGeo = new THREE.ExtrudeGeometry(plumeShape, {
    depth: 0.046,
    bevelEnabled: true,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    bevelSegments: 2,
  });
  plumeGeo.translate(0, 0, -0.023);
  plumeGeo.rotateY(Math.PI * 0.5);
  ownedGeos.push(plumeGeo);
  const plumeMesh = new THREE.Mesh(plumeGeo, bloodCrimsonMat);
  plumeMesh.castShadow = true;
  plumePivot.add(plumeMesh);

  for (let r = 0; r < 4; r++) {
    const rib = new THREE.Mesh(createBeveledBox(0.056, 0.026, 0.048, 0.004), darkBronzeMat);
    rib.position.set(0, 0.05 + r * 0.032 - r * r * 0.012, -0.06 + r * 0.068);
    rib.rotation.x = -0.35 * r;
    plumePivot.add(rib);
  }

  // ---------------------------------------------------------------------------
  // LEFT ARM + PROPERLY MOUNTED OUTER-FOREARM SPIKED HOPLON BUCKLER (ZERO CLIPPING!)
  // leftArm.shoulder uses YXZ rotation order & 1-DOF elbow hinge (elbow.rotX ONLY!).
  // shieldGroup sits cleanly outside left forearm (-X = -0.105), front face pointing -X!
  // Swinging shoulder.rotY negative brings the vertical shield squarely across the front (-Z)!
  // ---------------------------------------------------------------------------
  const leftArm = buildSculptedHopliteArm(
    -1,
    cuirassSteelMat,
    obsidianArmorMat,
    darkBronzeMat,
    bloodCrimsonMat,
    mats.gladiatorUndersuit,
    mats.gunmetalJoint,
    plasmaVeinMat,
    ownedGeos
  );
  leftArm.shoulder.position.set(-0.315, 0.49, 0);
  torso.add(leftArm.shoulder);

  const shieldGroup = new THREE.Group();
  shieldGroup.position.set(-0.105, -0.165, -0.01);
  // Local -Z of shieldGroup (Lambda face & boss spike) aligns strictly with outer -X of left forearm!
  shieldGroup.rotation.y = Math.PI * 0.5;
  leftArm.elbow.add(shieldGroup);

  const gripStrap = new THREE.Mesh(createBeveledBox(0.14, 0.065, 0.095, 0.008), obsidianArmorMat);
  gripStrap.position.set(0, 0.04, 0.062);
  shieldGroup.add(gripStrap);

  const gripBar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.18, 8), darkBronzeMat);
  gripBar.position.set(0, -0.14, 0.068);
  shieldGroup.add(gripBar);

  const bucklerDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.52, 0.048, 28), bucklerFaceMat);
  bucklerDisc.rotation.set(Math.PI * 0.5, Math.PI, 0);
  bucklerDisc.castShadow = true;
  shieldGroup.add(bucklerDisc);

  const bucklerRim = new THREE.Mesh(new THREE.TorusGeometry(0.51, 0.038, 10, 28), darkBronzeMat);
  shieldGroup.add(bucklerRim);

  const bossBase = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.118, 0.042, 14), darkBronzeMat);
  bossBase.rotation.x = Math.PI * 0.5;
  bossBase.position.z = -0.036;
  shieldGroup.add(bossBase);

  const bossSpike = new THREE.Mesh(new THREE.ConeGeometry(0.046, 0.145, 8), obsidianArmorMat);
  bossSpike.rotation.x = -Math.PI * 0.5;
  bossSpike.position.z = -0.108;
  shieldGroup.add(bossSpike);

  const rimSpikeGeo = new THREE.ConeGeometry(0.025, 0.115, 5);
  ownedGeos.push(rimSpikeGeo);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const sp = new THREE.Mesh(rimSpikeGeo, obsidianArmorMat);
    sp.position.set(Math.cos(a) * 0.56, Math.sin(a) * 0.56, -0.005);
    sp.rotation.z = a - Math.PI * 0.5;
    shieldGroup.add(sp);
  }

  // Sleek Hexagonal Holographic Kinetic Aegis Energy Dome
  const bucklerEnergyGroup = new THREE.Group();
  bucklerEnergyGroup.visible = false;
  shieldGroup.add(bucklerEnergyGroup);

  const aegisDomeGeo = new THREE.SphereGeometry(0.76, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.34);
  aegisDomeGeo.rotateX(-Math.PI * 0.5);
  ownedGeos.push(aegisDomeGeo);
  const aegisDome = new THREE.Mesh(aegisDomeGeo, aegisDomeMat);
  aegisDome.position.z = 0.32;
  bucklerEnergyGroup.add(aegisDome);

  const aegisThinRim = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.011, 8, 32), spearAuraMat);
  aegisThinRim.position.z = -0.075;
  bucklerEnergyGroup.add(aegisThinRim);

  // ---------------------------------------------------------------------------
  // RIGHT ARM + 2.7m FORGED SERRATED PLASMA WAR-SPEAR (Axial Grip Slide Group!)
  // `spearPivot` aligns orientation; `spearSlideGroup` slides STRICTLY ALONG the shaft
  // through the clenched gauntlet so the spear NEVER detaches from the hand!
  // ---------------------------------------------------------------------------
  const rightArm = buildSculptedHopliteArm(
    1,
    cuirassSteelMat,
    obsidianArmorMat,
    darkBronzeMat,
    bloodCrimsonMat,
    mats.gladiatorUndersuit,
    mats.gunmetalJoint,
    plasmaVeinMat,
    ownedGeos
  );
  rightArm.shoulder.position.set(0.315, 0.49, 0);
  torso.add(rightArm.shoulder);

  const spearPivot = new THREE.Group();
  spearPivot.position.set(0, -0.045, -0.012);
  rightArm.wrist.add(spearPivot);

  const spearSlideGroup = new THREE.Group();
  spearPivot.add(spearSlideGroup);

  const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 2.1, 12), mats.crucibleSteel);
  haft.rotation.x = Math.PI * 0.5;
  haft.position.z = -0.32;
  haft.castShadow = true;
  spearSlideGroup.add(haft);

  const gripWrap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.54, 12), bloodCrimsonMat);
  gripWrap.rotation.x = Math.PI * 0.5;
  gripWrap.position.z = -0.02;
  spearSlideGroup.add(gripWrap);

  for (const zOff of [-0.3, 0.26, -1.14]) {
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.034, 0.055, 12), darkBronzeMat);
    collar.rotation.x = Math.PI * 0.5;
    collar.position.z = zOff;
    spearSlideGroup.add(collar);
  }

  const buttSpike = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.25, 6), darkBronzeMat);
  buttSpike.rotation.x = Math.PI * 0.5;
  buttSpike.position.z = 0.82;
  spearSlideGroup.add(buttSpike);

  const spearSocket = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.036, 0.28, 12), darkBronzeMat);
  spearSocket.rotation.x = Math.PI * 0.5;
  spearSocket.position.z = -1.4;
  spearSlideGroup.add(spearSocket);

  const guardFangL = new THREE.Mesh(createBeveledBox(0.022, 0.22, 0.26, 0.006), obsidianArmorMat);
  guardFangL.position.set(-0.062, 0, -1.52);
  guardFangL.rotation.y = 0.34;
  spearSlideGroup.add(guardFangL);

  const guardFangR = guardFangL.clone();
  guardFangR.position.x = 0.062;
  guardFangR.rotation.y = -0.34;
  spearSlideGroup.add(guardFangR);

  const outerBladeShape = new THREE.Shape();
  outerBladeShape.moveTo(0, 0);
  outerBladeShape.lineTo(0.08, 0.098);
  outerBladeShape.lineTo(0.16, 0.068);
  outerBladeShape.lineTo(0.24, 0.118);
  outerBladeShape.lineTo(0.36, 0.074);
  outerBladeShape.lineTo(0.68, 0);
  outerBladeShape.lineTo(0.36, -0.074);
  outerBladeShape.lineTo(0.24, -0.118);
  outerBladeShape.lineTo(0.16, -0.068);
  outerBladeShape.lineTo(0.08, -0.098);
  outerBladeShape.closePath();
  const outerBladeGeo = new THREE.ExtrudeGeometry(outerBladeShape, {
    depth: 0.016,
    bevelEnabled: true,
    bevelSize: 0.004,
    bevelThickness: 0.004,
    bevelSegments: 2,
  });
  outerBladeGeo.translate(0, 0, -0.008);
  outerBladeGeo.rotateY(Math.PI * 0.5);
  ownedGeos.push(outerBladeGeo);
  const outerBladeMesh = new THREE.Mesh(outerBladeGeo, obsidianArmorMat);
  outerBladeMesh.position.z = -1.48;
  spearSlideGroup.add(outerBladeMesh);

  const innerBladeShape = new THREE.Shape();
  innerBladeShape.moveTo(0.02, 0);
  innerBladeShape.quadraticCurveTo(0.2, 0.084, 0.71, 0);
  innerBladeShape.quadraticCurveTo(0.2, -0.084, 0.02, 0);
  const innerBladeGeo = new THREE.ExtrudeGeometry(innerBladeShape, {
    depth: 0.024,
    bevelEnabled: true,
    bevelSize: 0.004,
    bevelThickness: 0.004,
    bevelSegments: 2,
  });
  innerBladeGeo.translate(0, 0, -0.012);
  innerBladeGeo.rotateY(Math.PI * 0.5);
  ownedGeos.push(innerBladeGeo);
  const bladeCore = new THREE.Mesh(innerBladeGeo, spearEnergyMat);
  bladeCore.position.z = -1.48;
  spearSlideGroup.add(bladeCore);

  const bladeAuraGeo = new THREE.ConeGeometry(0.125, 0.84, 8, 1, true);
  bladeAuraGeo.rotateX(-Math.PI * 0.5);
  ownedGeos.push(bladeAuraGeo);
  const spearEnergyAura = new THREE.Mesh(bladeAuraGeo, spearAuraMat);
  spearEnergyAura.position.z = -1.84;
  spearSlideGroup.add(spearEnergyAura);

  const chargeRingA = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.009, 6, 18), spearEnergyMat);
  chargeRingA.position.z = -1.48;
  spearSlideGroup.add(chargeRingA);

  const chargeRingB = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.007, 6, 18), plasmaVeinMat);
  chargeRingB.position.z = -1.58;
  spearSlideGroup.add(chargeRingB);

  const spearTip = new THREE.Object3D();
  spearTip.position.set(0, 0, -2.2);
  spearSlideGroup.add(spearTip);

  // ---------------------------------------------------------------------------
  // HITBOXES (Body, Head, Weakpoint, Shield)
  // ---------------------------------------------------------------------------
  const bodyHb = createEnemyHitboxMesh(enemyId, 'body', new THREE.BoxGeometry(0.72, 1.4, 0.58));
  bodyHb.position.set(0, 0.18, 0);
  pelvis.add(bodyHb);

  const headHb = createEnemyHitboxMesh(enemyId, 'head', new THREE.BoxGeometry(0.4, 0.44, 0.4));
  headHb.position.set(0, 0.18, 0);
  headGroup.add(headHb);

  const wpHb = createEnemyHitboxMesh(
    enemyId,
    'weakpoint',
    new THREE.BoxGeometry(0.44, 0.46, 0.34),
    'dorsal_capacitor'
  );
  wpHb.position.set(0, 0, 0.05);
  weakpointAnchor.add(wpHb);

  const shieldHb = createEnemyHitboxMesh(enemyId, 'shield', new THREE.CylinderGeometry(0.64, 0.64, 0.24, 12));
  shieldHb.rotation.x = Math.PI * 0.5;
  shieldGroup.add(shieldHb);
  hitboxes.push(bodyHb, headHb, wpHb, shieldHb);

  // ---------------------------------------------------------------------------
  // PERSISTENT SMOOTHED HUMAN ANIMATION STATE (Zero GC Allocations!)
  // Left arm uses YXZ shoulder order + 1-DOF elbow hinge (lElX ONLY!) so buckler
  // stays strictly vertical and arm stays 100% BEHIND the shield in every single pose!
  // ---------------------------------------------------------------------------
  let poseMode: HoplitePoseMode = 'march';
  let spearCharge = 0;
  let enragedIntensity = 0;

  const s = {
    pelvisY: 0.94,
    pelvisRotX: 0,
    pelvisRotY: 0.14,
    pelvisRotZ: 0,
    torsoRotX: 0.09,
    torsoRotY: 0.26,
    torsoRotZ: 0,
    headRotX: -0.05,
    headRotY: -0.36,
    headRotZ: 0,
    lHipX: 0.24,
    lHipZ: -0.11,
    lKneeX: -0.34,
    lAnkleX: 0.1,
    rHipX: -0.16,
    rHipZ: 0.12,
    rKneeX: -0.26,
    rAnkleX: 0.42,
    // Left arm YXZ shoulder + 1-DOF elbow hinge -> vertical Spartan Hoplon guard!
    lShX: 0.24,
    lShY: -0.82,
    lShZ: -0.14,
    lElX: 1.42,
    // Right arm YXZ shoulder + 1-DOF elbow hinge + axial spear slide!
    rShX: 0.28,
    rShY: -0.14,
    rShZ: 0.18,
    rElX: 0.96,
    spRotX: -1.08,
    spRotY: 0.12,
    spSlideZ: 0,
    cloakUpX: -0.18,
    cloakLowX: -0.08,
    plumeX: -0.06,
  };

  function resolveEffectivePose(input: EnemyAnimationInput): HoplitePoseMode {
    if (input.behavior === 'strafe') return 'strafe';
    if (input.behavior === 'windup' || input.behavior === 'attack') {
      if (poseMode !== 'march' && poseMode !== 'strafe') return poseMode;
      switch (input.attackVariant) {
        case 0:
          return 'lunge';
        case 1:
          return 'sweep';
        case 2:
          return 'javelin';
        case 3:
          return 'flurry';
        case 4:
          return 'shield_bash';
        case 5:
          return 'vault_plunge';
        case 6:
          return 'brace';
        default:
          return 'lunge';
      }
    }
    if (poseMode === 'brace' || input.shieldActive) return 'brace';
    return poseMode;
  }

  return {
    root,
    hitboxes,
    shieldGroup: bucklerEnergyGroup,
    weakpointMaterials: [weakpointMat],
    armorFlashMaterials: [cuirassSteelMat, darkBronzeMat, bloodCrimsonMat, obsidianArmorMat],
    setPoseMode(mode) {
      poseMode = mode;
    },
    setSpearCharge(charge) {
      spearCharge = charge;
    },
    setEnragedIntensity(intensity) {
      enragedIntensity = clamp01(intensity);
    },
    getMuzzleWorldPos(out) {
      return spearTip.getWorldPosition(out);
    },
    getSpearTipWorldPos(out) {
      return spearTip.getWorldPosition(out);
    },
    getShieldWorldPos(out) {
      return shieldGroup.getWorldPosition(out);
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
        shieldActive,
        airborneHeight,
      } = input;

      const effPose = resolveEffectivePose(input);
      const isDead = behavior === 'dead';
      const showAegis =
        !isDead &&
        (shieldActive ||
          effPose === 'brace' ||
          (effPose === 'shield_bash' && (behavior === 'windup' || behavior === 'attack')));

      bucklerEnergyGroup.visible = showAegis;
      if (showAegis) {
        const pulse = 1 + Math.sin(elapsed * 14) * 0.04 + (effPose === 'shield_bash' ? 0.1 : 0);
        aegisThinRim.scale.setScalar(pulse);
        aegisDome.rotation.z = elapsed * 0.65;
        aegisDomeMat.opacity = effPose === 'shield_bash' ? 0.85 : 0.62 + Math.sin(elapsed * 8) * 0.08;
      }

      // -----------------------------------------------------------------------
      // MULTI-STAGE HUMAN DEATH COLLAPSE
      // -----------------------------------------------------------------------
      if (isDead) {
        const d = clamp01(deadProgress);
        const stage1 = smoothstep(d / 0.42);
        const stage2 = smoothstep((d - 0.34) / 0.66);

        pelvis.position.y = 0.94 - stage1 * 0.34 - stage2 * 0.45;
        pelvis.rotation.set(stage1 * 0.36 + stage2 * 1.14, stage2 * 0.24, stage2 * 0.32);
        torso.rotation.set(stage1 * 0.34 - stage2 * 0.1, 0, stage2 * 0.18);
        headGroup.rotation.set(stage1 * 0.52, 0.24 * stage2, 0.22 * stage2);

        leftLeg.hip.rotation.set(stage1 * 0.65, 0, -0.18);
        leftLeg.knee.rotation.set(-stage1 * 1.48, 0, 0);
        rightLeg.hip.rotation.set(stage1 * 0.45 - stage2 * 0.35, 0, 0.18);
        rightLeg.knee.rotation.set(-stage1 * 1.25, 0, 0);

        leftArm.shoulder.rotation.set(-0.2 * d, -0.25 * d, -0.55 * d);
        leftArm.elbow.rotation.set(0.45 * (1 - stage2), 0, 0);
        rightArm.shoulder.rotation.set(-0.3 * d, -0.35 * d, 0.65 * d);
        rightArm.elbow.rotation.set(0.3 * (1 - stage2), 0, 0);

        cloakUpper.rotation.x = -0.16 - stage2 * 0.45;
        cloakLower.rotation.x = -0.08;

        shadow.scale.setScalar(Math.max(0.28, 1 - d * 0.32));
        auraDisc.visible = false;
        auraMotesGroup.visible = false;
        spearEnergyAura.visible = false;
        chargeRingA.visible = false;
        chargeRingB.visible = false;
        demonEyeMat.emissiveIntensity = Math.max(0, (1 - d * 1.6) * 3.4);
        weakpointMat.emissiveIntensity = Math.max(0.05, (1 - d * 1.5) * 0.8);
        spearEnergyMat.emissiveIntensity = Math.max(0.1, (1 - d * 1.4) * 1.5);
        return;
      }

      // -----------------------------------------------------------------------
      // COMPUTE TARGET BIOMECHANICAL HUMAN POSE
      // -----------------------------------------------------------------------
      const clampedSpd = Math.min(1.55, Math.max(0, speedRatio));
      const isMoving = clampedSpd > 0.08 && airborneHeight < 0.08;
      const isStrafing = effPose === 'strafe' || Math.abs(localMoveX) > 0.35;

      const breath = Math.sin(elapsed * 2.65);
      const sway = Math.sin(elapsed * 1.35);

      let tPelvisY = 0.935 + airborneHeight + breath * 0.012;
      let tPelvisRotX = 0;
      let tPelvisRotY = 0.14;
      let tPelvisRotZ = sway * 0.018;

      let tTorsoRotX = 0.09 + breath * 0.022;
      let tTorsoRotY = 0.26;
      let tTorsoRotZ = -sway * 0.015;

      let tHeadRotX = -0.06 - breath * 0.02;
      let tHeadRotY = -0.38 + Math.sin(elapsed * 0.85) * 0.06;
      let tHeadRotZ = 0;

      // Wide grounded Spartan warrior legs
      let tLHipX = 0.24;
      let tLHipZ = -0.11;
      let tLKneeX = -0.34;
      let tLAnkleX = -(tLHipX + tLKneeX);

      let tRHipX = -0.16;
      let tRHipZ = 0.12;
      let tRKneeX = -0.26;
      let tRAnkleX = -(tRHipX + tRKneeX);

      // Left Arm (YXZ shoulder + 1-DOF elbow hinge):
      // lShY = -0.85 swings forearm across chest & aims the vertical Hoplon Buckler 45° forward-left!
      // Arm & hand stay 100% BEHIND the shield!
      let tLShX = 0.26 + breath * 0.025;
      let tLShY = -0.84;
      let tLShZ = -0.14;
      let tLElX = 1.42;

      // Right Arm: plasma war-spear poised menacingly forward!
      let tRShX = 0.28 - breath * 0.025;
      let tRShY = -0.14;
      let tRShZ = 0.18;
      let tRElX = 0.96;
      let tSpRotX = -1.08;
      let tSpRotY = 0.12;
      let tSpSlideZ = 0;

      let tCloakUpX = -0.18 - Math.abs(breath) * 0.04;
      let tCloakLowX = -0.08 - Math.sin(elapsed * 3.0) * 0.05;
      let tPlumeX = -0.06 - clampedSpd * 0.14;

      // 1. Human Locomotion (Athletic Bipedal March/Sprint OR Lateral Cross-Step Combat Strafe)
      if (isMoving && staggerTimer <= 0) {
        if (isStrafing) {
          const strafeSign = localMoveX >= 0 ? 1 : -1;
          const stepPhase = elapsed * (7.2 + clampedSpd * 2.5);
          const sWave = Math.sin(stepPhase);
          const cWave = Math.cos(stepPhase);

          tPelvisY = 0.9 + Math.abs(cWave) * 0.04;
          tPelvisRotZ = -strafeSign * 0.07;
          tTorsoRotX = 0.16;
          tTorsoRotY = 0.34;
          tHeadRotY = -0.36;

          tLHipZ = -0.16 - sWave * 0.22 * strafeSign;
          tRHipZ = 0.16 + sWave * 0.22 * strafeSign;
          tLHipX = 0.26 + cWave * 0.24;
          tRHipX = 0.1 - cWave * 0.24;
          tLKneeX = -0.38 - Math.max(0, -sWave) * 0.42;
          tRKneeX = -0.38 - Math.max(0, sWave) * 0.42;
          tLAnkleX = -(tLHipX + tLKneeX) * 0.7;
          tRAnkleX = -(tRHipX + tRKneeX) * 0.7;

          // Buckler locked across front-left while strafing
          tLShX = 0.32;
          tLShY = -1.12;
          tLShZ = -0.08;
          tLElX = 1.48;

          tRShX = 0.36;
          tRElX = 1.02;
          tSpRotX = -1.32;

          tCloakUpX = -0.32 - clampedSpd * 0.18;
          tCloakLowX = -0.18;
        } else {
          const strideFreq = 6.2 + clampedSpd * 3.4;
          const ph = elapsed * strideFreq;
          const sinP = Math.sin(ph);
          const cosP = Math.cos(ph);
          const amp = Math.min(1.15, 0.45 + clampedSpd * 0.56);

          tPelvisY = 0.93 + Math.abs(cosP) * 0.052 * clampedSpd - clampedSpd * 0.03;
          tPelvisRotY = -sinP * 0.12 * clampedSpd;
          tPelvisRotZ = sinP * 0.04 * clampedSpd;

          tTorsoRotX = 0.14 + clampedSpd * 0.16;
          tTorsoRotY = 0.24 + sinP * 0.16 * clampedSpd;
          tHeadRotX = -tTorsoRotX * 0.7;
          tHeadRotY = -(tPelvisRotY + tTorsoRotY) * 0.88;

          tLHipX = sinP * 0.64 * amp + 0.08;
          tLKneeX = -Math.max(0.14, (-cosP * 0.78 + 0.28) * amp);
          tLAnkleX = -(tLHipX + tLKneeX) * 0.55 - sinP * 0.16;
          tLHipZ = -0.08;

          tRHipX = -sinP * 0.64 * amp + 0.08;
          tRKneeX = -Math.max(0.14, (cosP * 0.78 + 0.28) * amp);
          tRAnkleX = -(tRHipX + tRKneeX) * 0.55 + sinP * 0.16;
          tRHipZ = 0.08;

          // Shield braced steadily forward-left as he marches/sprints
          tLShX = 0.28 - sinP * 0.12 * clampedSpd;
          tLShY = -0.96;
          tLShZ = -0.12;
          tLElX = 1.44;

          tRShX = 0.22 + sinP * 0.2 * clampedSpd;
          tRElX = 1.04;
          tSpRotX = -1.24;

          tCloakUpX = -0.28 - clampedSpd * 0.34 + Math.sin(ph * 2) * 0.05;
          tCloakLowX = -0.18 - clampedSpd * 0.22 + Math.cos(ph * 2) * 0.07;
        }
      }

      // 2. Combat States & Crisp Human Attack Animations
      let blendSpeed = 14;
      if (staggerTimer > 0) {
        blendSpeed = 12;
        const wobble = Math.sin(elapsed * 14) * 0.11;
        tPelvisY = 0.74;
        tPelvisRotX = 0.18;
        tTorsoRotX = 0.58;
        tTorsoRotY = wobble * 0.6;
        tTorsoRotZ = wobble;
        tHeadRotX = 0.44;
        tHeadRotY = -wobble * 1.2;

        tLHipX = 0.74;
        tLHipZ = -0.18;
        tLKneeX = -1.28;
        tLAnkleX = 0.52;

        tRHipX = -0.28;
        tRHipZ = 0.18;
        tRKneeX = -0.92;
        tRAnkleX = 0.65;

        // Guard blown wide open (lShY positive opens shield arm outward left!)
        tLShX = -0.1;
        tLShY = 0.35;
        tLShZ = -0.68;
        tLElX = 0.48;

        tRShX = -0.18;
        tRShY = -0.35;
        tRShZ = 0.68;
        tRElX = 0.42;
        tSpRotX = -0.25;
        tCloakUpX = -0.46;
      } else if (effPose === 'brace') {
        // Phalanx Shield-Wall Advance: vertical Hoplon + Hex Aegis Dome locked DEAD-CENTER FRONT!
        blendSpeed = 14;
        tPelvisY = Math.min(tPelvisY, 0.86);
        tTorsoRotX = 0.2;
        tTorsoRotY = 0.36;
        tHeadRotX = -0.15;
        tHeadRotY = -0.38;
        tLHipX = Math.max(tLHipX, 0.42);
        tLKneeX = Math.min(tLKneeX, -0.58);
        tRKneeX = Math.min(tRKneeX, -0.48);

        // lShY = -1.28 swings forearm horizontally across torso so shield face is VERTICAL & DEAD-FORWARD!
        tLShX = 0.24;
        tLShY = -1.28;
        tLShZ = -0.06;
        tLElX = 1.54;

        tRShX = 0.74;
        tRShY = -0.14;
        tRShZ = 0.16;
        tRElX = 0.92;
        tSpRotX = -1.58;
      } else if (effPose === 'lunge' && (behavior === 'windup' || behavior === 'attack')) {
        blendSpeed = 22;
        if (behavior === 'windup') {
          const p = smoothstep(attackProgress);
          tPelvisY = 0.93 - p * 0.16;
          tTorsoRotX = 0.24 * p;
          tTorsoRotY = -0.55 * p;
          tHeadRotY = 0.52 * p;

          tLHipX = 0.56 * p;
          tLHipZ = -0.14;
          tLKneeX = -0.82 * p;
          tLAnkleX = 0.26 * p;
          tRHipX = -0.44 * p;
          tRHipZ = 0.14;
          tRKneeX = -0.52 * p;
          tRAnkleX = 0.65 * p;

          // Shield locked forward-left guarding approach
          tLShX = 0.24;
          tLShY = -1.05;
          tLShZ = -0.1;
          tLElX = 1.48;

          // Spear coiled far back behind right hip, sliding cleanly along leather grip!
          tRShX = 0.15 - p * 0.58;
          tRShY = -0.22 * p;
          tRShZ = 0.22;
          tRElX = 1.42;
          tSpRotX = -(tRShX + tRElX) - 0.14;
          tSpSlideZ = p * 0.22;
          tCloakUpX = -0.26 - p * 0.22;
        } else {
          // Explosive full-body Spartan skewer extension! Hand stays LOCKED onto the spear leather grip!
          const p = clamp01(attackProgress);
          const thrust = easeOutBack(Math.min(1, p * 2.1));
          const settle = p > 0.62 ? smoothstep((p - 0.62) / 0.38) : 0;
          const ext = thrust * (1 - settle * 0.28);

          tPelvisY = 0.8 + settle * 0.08;
          tTorsoRotX = 0.32 * ext;
          tTorsoRotY = 0.58 * ext;
          tHeadRotX = -0.24 * ext;
          tHeadRotY = -0.56 * ext;

          tLHipX = 0.68 * ext;
          tLHipZ = -0.14;
          tLKneeX = -0.92 * ext;
          tLAnkleX = 0.24 * ext;
          tRHipX = -0.58 * ext;
          tRHipZ = 0.14;
          tRKneeX = -0.26 * ext;
          tRAnkleX = 0.72 * ext;

          // Shield opens smoothly outward-left for full hip-and-shoulder skewer torque!
          tLShX = 0.22;
          tLShY = -0.45;
          tLShZ = -0.28;
          tLElX = 1.28;

          // Right arm shoots DEAD-FORWARD extending the blazing spearhead straight into prey!
          tRShX = 1.32 * ext + 0.12;
          tRShY = 0.16 * ext;
          tRShZ = 0.06;
          tRElX = 0.14 + settle * 0.42;
          tSpRotX = -(tRShX + tRElX) - tTorsoRotX + 0.02;
          tSpSlideZ = -ext * 0.22; // Slides STRICTLY ALONG spear shaft through closed fist!
          tCloakUpX = -0.78 * ext - 0.18;
          tCloakLowX = -0.48 * ext;
        }
      } else if (effPose === 'sweep' && (behavior === 'windup' || behavior === 'attack')) {
        blendSpeed = 24;
        if (behavior === 'windup') {
          const p = smoothstep(attackProgress);
          tPelvisY = 0.92 - p * 0.1;
          tTorsoRotX = 0.18 * p;
          tTorsoRotY = -0.82 * p;
          tHeadRotY = 0.76 * p;
          tLHipX = 0.34 * p;
          tLKneeX = -0.56 * p;
          tRHipX = -0.28 * p;
          tRKneeX = -0.46 * p;

          tLShX = 0.24;
          tLShY = -0.62;
          tLShZ = -0.22;
          tLElX = 1.38;

          tRShX = 0.88;
          tRShY = -0.92 * p;
          tRShZ = 0.55 * p;
          tRElX = 0.58;
          tSpRotX = -1.42;
          tSpRotY = -0.25 * p;
          tCloakUpX = -0.35;
        } else {
          const p = easeOutCubic(attackProgress);
          const arc = -0.95 + p * 2.05;
          tPelvisY = 0.86;
          tPelvisRotY = arc * 0.26;
          tTorsoRotX = 0.24;
          tTorsoRotY = arc * 0.78;
          tHeadRotY = -(tPelvisRotY + tTorsoRotY) * 0.85;

          tLShX = 0.22;
          tLShY = -0.42;
          tLShZ = -0.32;
          tLElX = 1.25;

          tRShX = 1.12;
          tRShY = arc * 0.92;
          tRShZ = 0.34;
          tRElX = 0.28;
          tSpRotX = -1.35;
          tSpRotY = arc * 0.25;
          tCloakUpX = -0.62;
          tCloakLowX = -0.38;
        }
      } else if (effPose === 'flurry' && (behavior === 'windup' || behavior === 'attack')) {
        blendSpeed = 28;
        if (behavior === 'windup') {
          const p = smoothstep(attackProgress);
          tPelvisY = 0.86;
          tTorsoRotX = 0.22;
          tTorsoRotY = -0.45 * p;
          tHeadRotY = 0.42 * p;
          tLHipX = 0.48;
          tLKneeX = -0.68;
          tRHipX = -0.32;
          tRKneeX = -0.44;

          tLShX = 0.26;
          tLShY = -1.16;
          tLShZ = -0.08;
          tLElX = 1.5;

          tRShX = 0.22;
          tRElX = 1.38;
          tSpRotX = -1.58;
          tSpSlideZ = 0.18 * p;
        } else {
          const beat = (attackProgress * 3) % 1;
          const hitIndex = Math.min(2, Math.floor(attackProgress * 3));
          const jab = Math.sin(beat * Math.PI);
          const fin = hitIndex === 2 ? 1.3 : 1.0;

          tPelvisY = 0.85 - jab * 0.05 * fin;
          tTorsoRotX = 0.2 + jab * 0.18 * fin;
          tTorsoRotY = -0.22 + jab * 0.7 * fin;
          tHeadRotY = -tTorsoRotY * 0.88;

          tLHipX = 0.46 + jab * 0.2;
          tLKneeX = -0.66 - jab * 0.2;
          tRHipX = -0.34 - jab * 0.16;
          tRKneeX = -0.42;

          tLShX = 0.26;
          tLShY = -1.14;
          tLShZ = -0.08;
          tLElX = 1.48;

          tRShX = 0.46 + jab * 0.96 * fin;
          tRShY = -0.12 + jab * 0.28 + (hitIndex === 1 ? -0.16 : 0.08);
          tRShZ = 0.1;
          tRElX = 1.24 - jab * 1.02;
          tSpRotX = -(tRShX + tRElX) - tTorsoRotX + 0.04;
          tSpSlideZ = 0.14 - jab * 0.34 * fin;
          tCloakUpX = -0.45 - jab * 0.28;
        }
      } else if (effPose === 'shield_bash' && (behavior === 'windup' || behavior === 'attack')) {
        // Brutal Spiked Hoplon Buckler Ram! Vertical shield + Hex Aegis Dome slammed DEAD-FORWARD!
        blendSpeed = 24;
        if (behavior === 'windup') {
          const p = smoothstep(attackProgress);
          tPelvisY = 0.92 - p * 0.14;
          tTorsoRotX = 0.14 * p;
          tTorsoRotY = 0.62 * p;
          tHeadRotY = -0.56 * p;

          tLHipX = 0.36 * p;
          tLKneeX = -0.58 * p;
          tRHipX = -0.3 * p;
          tRKneeX = -0.45 * p;

          // Coil vertical Hoplon back slightly to the left
          tLShX = 0.16;
          tLShY = -0.95;
          tLShZ = -0.12;
          tLElX = 1.45;

          tRShX = 0.16;
          tRShY = -0.42 * p;
          tRElX = 1.12;
          tSpRotX = -1.22;
        } else {
          const p = clamp01(attackProgress);
          const ram = easeOutBack(Math.min(1, p * 2.2));
          tPelvisY = 0.82;
          tTorsoRotX = 0.26 * ram;
          tTorsoRotY = 0.32 - ram * 0.72; // Drive left shoulder violently forward!
          tHeadRotX = -0.18 * ram;
          tHeadRotY = -tTorsoRotY * 0.86;

          tLHipX = 0.64 * ram;
          tLHipZ = -0.16;
          tLKneeX = -0.88 * ram;
          tLAnkleX = 0.24 * ram;
          tRHipX = -0.54 * ram;
          tRHipZ = 0.16;
          tRKneeX = -0.34;
          tRAnkleX = 0.72;

          // Keep lShX moderate (+0.26) & lShY = -1.32 so shield face stays VERTICAL & DEAD-FORWARD (zero saucer tilt!)
          tLShX = 0.26;
          tLShY = -1.34;
          tLShZ = -0.06;
          tLElX = 1.54;

          // Right spear cocked back low for instant follow-up sweep!
          tRShX = -0.22;
          tRShY = -0.45;
          tRShZ = 0.32;
          tRElX = 1.12;
          tSpRotX = -0.92;
          tCloakUpX = -0.68 * ram - 0.16;
        }
      } else if (effPose === 'javelin' && (behavior === 'windup' || behavior === 'attack')) {
        blendSpeed = 20;
        if (behavior === 'windup') {
          const p = smoothstep(attackProgress);
          tPelvisY = 0.92 - p * 0.08;
          tTorsoRotX = -0.2 * p;
          tTorsoRotY = -0.78 * p;
          tHeadRotX = 0.16 * p;
          tHeadRotY = 0.74 * p;

          tLHipX = 0.42 * p;
          tLKneeX = -0.42 * p;
          tRHipX = -0.46 * p;
          tRKneeX = -0.58 * p;

          tLShX = 0.45 * p + 0.2;
          tLShY = -0.78;
          tLShZ = -0.18;
          tLElX = 1.15;

          tRShX = 2.36 * p + 0.24;
          tRShY = -0.26 * p;
          tRShZ = 0.32 * p;
          tRElX = 0.72 * p;
          tSpRotX = -(tRShX + tRElX) + 0.16;
          tCloakUpX = -0.24;
        } else {
          const p = easeOutCubic(attackProgress);
          tPelvisY = 0.88;
          tTorsoRotX = -0.16 + p * 0.52;
          tTorsoRotY = -0.65 + p * 1.32;
          tHeadRotX = -0.18 * p;
          tHeadRotY = -tTorsoRotY * 0.86;

          tLShX = 0.22;
          tLShY = -0.48;
          tLShZ = -0.28;
          tLElX = 1.25;

          tRShX = 2.4 - p * 1.65;
          tRShY = 0.28 * p;
          tRShZ = 0.12;
          tRElX = 0.22;
          tSpRotX = -(tRShX + tRElX) + 0.2;
          tCloakUpX = -0.62 * p - 0.15;
        }
      } else if (effPose === 'vault_plunge' && (behavior === 'windup' || behavior === 'attack')) {
        blendSpeed = 24;
        if (behavior === 'windup') {
          const p = smoothstep(attackProgress);
          tPelvisY = 0.94 - p * 0.28;
          tTorsoRotX = 0.44 * p;
          tTorsoRotY = -0.24 * p;
          tHeadRotX = -0.34 * p;

          tLHipX = 0.82 * p;
          tLHipZ = -0.16;
          tLKneeX = -1.36 * p;
          tLAnkleX = 0.52 * p;
          tRHipX = 0.62 * p;
          tRHipZ = 0.16;
          tRKneeX = -1.2 * p;
          tRAnkleX = 0.52 * p;

          tLShX = 0.26;
          tLShY = -1.1;
          tLShZ = -0.1;
          tLElX = 1.48;

          tRShX = 0.24;
          tRElX = 1.2;
          tSpRotX = -1.25;
          tCloakUpX = -0.35 - p * 0.25;
        } else {
          const p = clamp01(attackProgress);
          if (p < 0.72) {
            const airT = smoothstep(p / 0.72);
            tPelvisY = 0.96 + airborneHeight;
            tPelvisRotX = -0.08 + airT * 0.34;
            tTorsoRotX = -0.16 + airT * 0.44;
            tTorsoRotY = -0.46 + airT * 0.26;
            tHeadRotX = 0.12;
            tHeadRotY = 0.38;

            tLHipX = 0.85;
            tLHipZ = -0.18;
            tLKneeX = -1.35;
            tLAnkleX = -0.32;
            tRHipX = -0.48;
            tRHipZ = 0.16;
            tRKneeX = -0.82;
            tRAnkleX = -0.38;

            // Vertical shield held tightly forward-left during mid-air dive!
            tLShX = 0.3;
            tLShY = -1.08;
            tLShZ = -0.12;
            tLElX = 1.46;

            tRShX = 2.46 - airT * 0.25;
            tRShY = -0.22;
            tRShZ = 0.26;
            tRElX = 0.52;
            tSpRotX = -(tRShX + tRElX) + 0.64 + airT * 0.36;

            tCloakUpX = -1.12;
            tCloakLowX = -0.58;
            tPlumeX = -0.45;
          } else {
            const slamT = easeInQuad((p - 0.72) / 0.28);
            tPelvisY = 0.72 + airborneHeight * (1 - slamT);
            tTorsoRotX = 0.52;
            tTorsoRotY = 0.48;
            tHeadRotX = -0.26;
            tHeadRotY = -0.44;

            tLHipX = 0.88;
            tLHipZ = -0.18;
            tLKneeX = -1.44;
            tLAnkleX = 0.56;
            tRHipX = -0.46;
            tRHipZ = 0.18;
            tRKneeX = -1.18;
            tRAnkleX = 0.65;

            tLShX = 0.22;
            tLShY = -0.55;
            tLShZ = -0.28;
            tLElX = 1.32;

            tRShX = 1.24;
            tRShY = 0.25;
            tRElX = 0.22;
            tSpRotX = -0.62;
            tSpSlideZ = -0.18;
            tCloakUpX = -0.82;
            tCloakLowX = -0.42;
          }
        }
      }

      // 3. Smooth Damped Interpolation
      s.pelvisY = damp(s.pelvisY, tPelvisY, blendSpeed + 4, dt);
      s.pelvisRotX = damp(s.pelvisRotX, tPelvisRotX, blendSpeed, dt);
      s.pelvisRotY = damp(s.pelvisRotY, tPelvisRotY, blendSpeed, dt);
      s.pelvisRotZ = damp(s.pelvisRotZ, tPelvisRotZ, blendSpeed, dt);

      s.torsoRotX = damp(s.torsoRotX, tTorsoRotX, blendSpeed, dt);
      s.torsoRotY = damp(s.torsoRotY, tTorsoRotY, blendSpeed, dt);
      s.torsoRotZ = damp(s.torsoRotZ, tTorsoRotZ, blendSpeed, dt);

      s.headRotX = damp(s.headRotX, tHeadRotX, blendSpeed, dt);
      s.headRotY = damp(s.headRotY, tHeadRotY, blendSpeed, dt);
      s.headRotZ = damp(s.headRotZ, tHeadRotZ, blendSpeed, dt);

      s.lHipX = damp(s.lHipX, tLHipX, blendSpeed, dt);
      s.lHipZ = damp(s.lHipZ, tLHipZ, blendSpeed, dt);
      s.lKneeX = damp(s.lKneeX, tLKneeX, blendSpeed, dt);
      s.lAnkleX = damp(s.lAnkleX, tLAnkleX, blendSpeed, dt);

      s.rHipX = damp(s.rHipX, tRHipX, blendSpeed, dt);
      s.rHipZ = damp(s.rHipZ, tRHipZ, blendSpeed, dt);
      s.rKneeX = damp(s.rKneeX, tRKneeX, blendSpeed, dt);
      s.rAnkleX = damp(s.rAnkleX, tRAnkleX, blendSpeed, dt);

      s.lShX = damp(s.lShX, tLShX, blendSpeed, dt);
      s.lShY = damp(s.lShY, tLShY, blendSpeed, dt);
      s.lShZ = damp(s.lShZ, tLShZ, blendSpeed, dt);
      s.lElX = damp(s.lElX, tLElX, blendSpeed, dt);

      s.rShX = damp(s.rShX, tRShX, blendSpeed, dt);
      s.rShY = damp(s.rShY, tRShY, blendSpeed, dt);
      s.rShZ = damp(s.rShZ, tRShZ, blendSpeed, dt);
      s.rElX = damp(s.rElX, tRElX, blendSpeed, dt);
      s.spRotX = damp(s.spRotX, tSpRotX, blendSpeed, dt);
      s.spRotY = damp(s.spRotY, tSpRotY, blendSpeed, dt);
      s.spSlideZ = damp(s.spSlideZ, tSpSlideZ, blendSpeed + 6, dt);

      s.cloakUpX = damp(s.cloakUpX, tCloakUpX, 10, dt);
      s.cloakLowX = damp(s.cloakLowX, tCloakLowX, 9, dt);
      s.plumeX = damp(s.plumeX, tPlumeX, 11, dt);

      const flinchX = flinchTimer > 0 ? -flinchTimer * 1.15 : 0;
      const flinchZ = flinchTimer > 0 ? flinchDirX * flinchTimer * 0.85 : 0;

      pelvis.position.y = s.pelvisY;
      pelvis.rotation.set(s.pelvisRotX, s.pelvisRotY, s.pelvisRotZ);
      torso.rotation.set(s.torsoRotX + flinchX, s.torsoRotY, s.torsoRotZ + flinchZ);
      headGroup.rotation.set(s.headRotX + flinchX * 0.7, s.headRotY, s.headRotZ - flinchZ * 0.5);

      leftLeg.hip.rotation.set(s.lHipX, 0, s.lHipZ);
      leftLeg.knee.rotation.set(s.lKneeX, 0, 0);
      leftLeg.ankle.rotation.set(s.lAnkleX, 0, 0);

      rightLeg.hip.rotation.set(s.rHipX, 0, s.rHipZ);
      rightLeg.knee.rotation.set(s.rKneeX, 0, 0);
      rightLeg.ankle.rotation.set(s.rAnkleX, 0, 0);

      // 1-DOF human elbow hinges + YXZ shoulder order!
      leftArm.shoulder.rotation.set(s.lShX, s.lShY, s.lShZ);
      leftArm.elbow.rotation.set(s.lElX, 0, 0);

      rightArm.shoulder.rotation.set(s.rShX, s.rShY, s.rShZ);
      rightArm.elbow.rotation.set(s.rElX, 0, 0);
      spearPivot.rotation.set(s.spRotX, s.spRotY, 0);
      spearSlideGroup.position.z = s.spSlideZ;

      cloakUpper.rotation.x = Math.min(-0.14, s.cloakUpX);
      cloakLower.rotation.x = Math.min(-0.04, s.cloakLowX);
      plumePivot.rotation.x = s.plumeX + Math.sin(elapsed * 5.2) * 0.035;

      for (let i = 0; i < tassetPivots.length; i++) {
        const tp = tassetPivots[i];
        const legDrive = i < 2 ? Math.max(0, s.lHipX) : i < 5 ? Math.max(0, s.rHipX) : 0;
        tp.rotation.x = -0.14 - legDrive * 0.45 - clampedSpd * 0.08;
      }

      // -----------------------------------------------------------------------
      // SCARY AURA, WEAKPOINT REACTOR & LIVE SPEAR PLASMA VFX
      // -----------------------------------------------------------------------
      const effectiveCharge =
        spearCharge > 0
          ? spearCharge
          : behavior === 'windup'
            ? 0.5 + attackProgress * 0.85
            : behavior === 'attack'
              ? 1.3
              : 0.22 + enragedIntensity * 0.5;

      const groundScale = Math.max(0.45, 1 - airborneHeight * 0.16);
      shadow.scale.setScalar(groundScale);

      auraDisc.visible = true;
      const auraScale =
        (0.96 + Math.sin(elapsed * 3.8) * 0.06 + effectiveCharge * 0.18 + enragedIntensity * 0.14) *
        groundScale;
      auraDisc.scale.setScalar(auraScale);
      auraDisc.rotation.y = elapsed * (0.45 + effectiveCharge * 1.15);
      auraDiscMat.opacity = (0.42 + effectiveCharge * 0.28 + enragedIntensity * 0.2) * groundScale;

      auraMotesGroup.visible = true;
      const moteSpinBoost = 1 + effectiveCharge * 1.9 + enragedIntensity * 1.25;
      for (let i = 0; i < auraMotes.length; i++) {
        const m = auraMotes[i];
        const ang = m.angleOffset + elapsed * m.speed * moteSpinBoost;
        const rad = m.radius * (1 - effectiveCharge * 0.1) + Math.sin(elapsed * 2.4 + m.phase) * 0.08;
        const yOff = ((elapsed * m.riseSpeed * moteSpinBoost + m.phase) % 1.95) + 0.18 + airborneHeight;
        m.mesh.position.set(Math.cos(ang) * rad, yOff, Math.sin(ang) * rad);
        m.mesh.rotation.set(elapsed * 2.2 + m.phase, ang, 0);
        const fade = Math.sin(((yOff - 0.18 - airborneHeight) / 1.95) * Math.PI);
        const sc = Math.max(0.05, fade * (0.85 + effectiveCharge * 0.55));
        m.mesh.scale.set(0.55 * sc, 1.55 * sc, 0.55 * sc);
      }
      auraMoteMat.opacity = 0.62 + effectiveCharge * 0.32;

      const wpBroken = input.weakpointBroken;
      weakpointMat.emissiveIntensity = wpBroken
        ? 0.18
        : 2.1 + Math.sin(elapsed * 7.8) * 0.55 + (input.weakpointExposed ? 1.25 : 0) + enragedIntensity * 0.6;
      wpRingA.rotation.z = elapsed * (wpBroken ? 0.3 : 2.8 + effectiveCharge * 3.5);
      wpRingB.rotation.z = -elapsed * (wpBroken ? 0.2 : 3.2 + effectiveCharge * 4.0);
      wpFinL.rotation.y = wpBroken ? 0.68 : 0.22;
      wpFinR.rotation.y = wpBroken ? -0.68 : -0.22;

      demonEyeMat.emissiveIntensity =
        4.6 + Math.sin(elapsed * 9.5) * 0.65 + effectiveCharge * 1.6 + enragedIntensity * 1.2;
      plasmaVeinMat.emissiveIntensity = 2.1 + Math.sin(elapsed * 6.2) * 0.45 + effectiveCharge * 1.1;

      spearEnergyMat.emissiveIntensity = 2.2 + effectiveCharge * 2.6 + Math.sin(elapsed * 13) * 0.35;
      spearEnergyAura.visible = true;
      const auraRadial = 0.72 + effectiveCharge * 0.62 + Math.sin(elapsed * 18) * 0.08;
      spearEnergyAura.scale.set(auraRadial, auraRadial, 0.88 + effectiveCharge * 0.34);
      spearEnergyAura.rotation.z = elapsed * (4.5 + effectiveCharge * 6);
      spearAuraMat.opacity = Math.min(0.75, 0.24 + effectiveCharge * 0.42);

      chargeRingA.visible = effectiveCharge > 0.24;
      chargeRingB.visible = effectiveCharge > 0.38;
      if (chargeRingA.visible) {
        const ringScale = 0.78 + effectiveCharge * 0.48;
        chargeRingA.scale.setScalar(ringScale);
        chargeRingA.rotation.set(elapsed * 5.2, elapsed * 3.1, 0);
      }
      if (chargeRingB.visible) {
        const ringScaleB = 0.72 + effectiveCharge * 0.58;
        chargeRingB.scale.setScalar(ringScaleB);
        chargeRingB.rotation.set(-elapsed * 4.4, 0, elapsed * 5.6);
      }
    },
    dispose() {
      for (const g of ownedGeos) g.dispose();
      for (const m of ownedMats) m.dispose();
    },
  };
}
