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
import type { Floor07EnemyMaterials } from '../materials';
import { createExoTrooperTextures, type ExoTrooperTextureSuite } from './textures';

export interface ExoCarbineRigHandle extends EnemyRigHandle {
  setLaserSight: (active: boolean, length: number, dangerRatio: number) => void;
  getGrenadeMuzzleWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  getVisorWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  getBoosterNozzleWorldPos: (side: -1 | 1, out: THREE.Vector3) => THREE.Vector3;
}

/**
 * Analytical two-bone arm IK solver in torso local space.
 * Guarantees sculpted gloved hands stay locked onto the carbine pistol grip & foregrip
 * across every single combat stance (burst, braced hyper-burst, elevated grenade launch,
 * airborne jet-flank, and CQC buttstroke) with zero floating hands or forearm clipping!
 */
const _ikDir = new THREE.Vector3();
const _ikSide = new THREE.Vector3();
const _ikPole = new THREE.Vector3();
const _ikElbowPos = new THREE.Vector3();
const _ikUpper = new THREE.Vector3();
const _ikLower = new THREE.Vector3();
const _ikQuatA = new THREE.Quaternion();
const _ikQuatB = new THREE.Quaternion();
const _ikInvParent = new THREE.Quaternion();
const _downY = new THREE.Vector3(0, -1, 0);

function solveArmTwoBoneIK(
  shoulder: THREE.Group,
  elbow: THREE.Group,
  targetInTorso: THREE.Vector3,
  poleHintInTorso: THREE.Vector3,
  upperLen: number,
  lowerLen: number
): void {
  const sPos = shoulder.position;
  _ikDir.copy(targetInTorso).sub(sPos);
  const rawDist = _ikDir.length();
  const maxReach = (upperLen + lowerLen) * 0.985;
  const minReach = Math.abs(upperLen - lowerLen) + 0.03;
  const dist = THREE.MathUtils.clamp(rawDist, minReach, maxReach);
  if (rawDist > 1e-5) {
    _ikDir.multiplyScalar(1 / rawDist);
  } else {
    _ikDir.set(0, -1, 0);
  }

  // Project pole vector perpendicular to shoulder->target axis so elbows flare naturally outward/down
  _ikPole.copy(poleHintInTorso).addScaledVector(_ikDir, -poleHintInTorso.dot(_ikDir));
  if (_ikPole.lengthSq() < 1e-5) {
    _ikPole.set(0, -1, 0.4).addScaledVector(_ikDir, -_ikDir.y);
  }
  _ikPole.normalize();

  // Law of cosines for elbow position in torso space
  const cosAngle = THREE.MathUtils.clamp(
    (upperLen * upperLen + dist * dist - lowerLen * lowerLen) / (2 * upperLen * dist),
    -1,
    1
  );
  const along = upperLen * cosAngle;
  const out = Math.sqrt(Math.max(0, upperLen * upperLen - along * along));

  _ikElbowPos
    .copy(sPos)
    .addScaledVector(_ikDir, along)
    .addScaledVector(_ikPole, out);

  // Align shoulder (-Y axis) along upper arm vector
  _ikUpper.copy(_ikElbowPos).sub(sPos).normalize();
  _ikQuatA.setFromUnitVectors(_downY, _ikUpper);
  shoulder.quaternion.copy(_ikQuatA);

  // Align elbow (-Y axis) along forearm vector in shoulder local space
  _ikLower.copy(targetInTorso).sub(_ikElbowPos).normalize();
  _ikInvParent.copy(_ikQuatA).invert();
  _ikSide.copy(_ikLower).applyQuaternion(_ikInvParent).normalize();
  _ikQuatB.setFromUnitVectors(_downY, _ikSide);
  elbow.quaternion.copy(_ikQuatB);
}

/**
 * Maps `(angleRad, y)` onto the athletic V-tapered torso shell so 45°-chamfered ceramic
 * armor plates shrinkwrap seamlessly onto the ribbed undersuit with zero floating seams.
 */
function mapTorsoSurface(u: number, v: number, offset: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, v / 0.5));
  const rx = 0.158 + Math.sin(t * Math.PI * 0.78) * 0.072 + t * 0.032;
  const rz = 0.118 + Math.sin(t * Math.PI * 0.74) * 0.04;
  const x = Math.sin(u) * (rx + offset);
  const z = -Math.cos(u) * (rz + offset);
  return [x, v, z];
}

function buildSculptedExoLeg(
  side: -1 | 1,
  armorMat: THREE.Material,
  undersuitMat: THREE.Material,
  titaniumMat: THREE.Material,
  gunmetalMat: THREE.Material,
  chromeMat: THREE.Material,
  hazardMat: THREE.Material,
  opticAmberMat: THREE.Material
) {
  const hip = new THREE.Group();

  // Anatomical sculpted muscular thigh (bottom-to-top Y order for outward normals!)
  const thigh = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: -0.44, rx: 0.062, rz: 0.068, squareness: 2.15 },
        { y: -0.36, rx: 0.072, rz: 0.078, squareness: 2.2 },
        { y: -0.22, rx: 0.086, rz: 0.092, frontScale: 1.05, squareness: 2.28 },
        { y: -0.08, rx: 0.096, rz: 0.104, frontScale: 1.07, squareness: 2.35 },
        { y: 0.06, rx: 0.095, rz: 0.102, squareness: 2.25 },
      ],
      18
    ),
    undersuitMat
  );
  thigh.castShadow = true;
  hip.add(thigh);

  // Tightly fitted contoured thigh cuisse armor shell (hugs exact thigh curvature, zero gap!)
  const cuisse = new THREE.Mesh(
    createCurvedPanelGeometry(
      [
        { y: -0.35, rx: 0.078, rz: 0.083, thickness: 0.015 },
        { y: -0.21, rx: 0.092, rz: 0.097, thickness: 0.018 },
        { y: -0.05, rx: 0.101, rz: 0.108, thickness: 0.017 },
      ],
      side === 1 ? -Math.PI * 0.68 : -Math.PI * 0.94,
      side === 1 ? -Math.PI * 0.06 : -Math.PI * 0.32,
      14
    ),
    armorMat
  );
  cuisse.castShadow = true;
  hip.add(cuisse);

  // Fitted open-ended kevlar drop-leg strap band hugging the exact thigh ellipse
  const thighStrap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.086, 0.028, 16, 1, true),
    gunmetalMat
  );
  thighStrap.position.set(0, -0.21, 0);
  thighStrap.scale.set(1.0, 1.0, 1.07);
  hip.add(thighStrap);

  // Side tactical drop-leg mag/grenade rig + upper exo-frame strut
  const thighPouch = new THREE.Mesh(createBeveledBox(0.044, 0.118, 0.088, 0.009), titaniumMat);
  thighPouch.position.set(side * 0.098, -0.19, 0.01);
  thighPouch.castShadow = true;
  hip.add(thighPouch);

  const upperExoBar = new THREE.Mesh(createBeveledBox(0.022, 0.38, 0.032, 0.005), gunmetalMat);
  upperExoBar.position.set(side * 0.096, -0.24, 0.014);
  hip.add(upperExoBar);

  // Knee assembly (negative rotation.x bends calf naturally backward)
  const knee = new THREE.Group();
  knee.position.set(0, -0.44, 0);
  hip.add(knee);

  const kneeDrum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.038, 0.15, 12),
    gunmetalMat
  );
  kneeDrum.rotation.z = Math.PI / 2;
  knee.add(kneeDrum);

  const kneeGuard = new THREE.Mesh(
    createCurvedPanelGeometry(
      [
        { y: -0.068, rx: 0.068, rz: 0.08, thickness: 0.018 },
        { y: 0.0, rx: 0.074, rz: 0.09, thickness: 0.024 },
        { y: 0.068, rx: 0.066, rz: 0.078, thickness: 0.016 },
      ],
      -Math.PI * 0.78,
      -Math.PI * 0.22,
      12
    ),
    titaniumMat
  );
  kneeGuard.castShadow = true;
  knee.add(kneeGuard);

  const kneeStrip = new THREE.Mesh(createBeveledBox(0.052, 0.016, 0.012, 0.003), hazardMat);
  kneeStrip.position.set(0, 0.036, -0.092);
  knee.add(kneeStrip);

  // Anatomical calf & armored greave (bottom-to-top Y order for outward normals!)
  const shin = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: -0.42, rx: 0.052, rz: 0.06, squareness: 2.2 },
        { y: -0.28, rx: 0.064, rz: 0.078, backScale: 1.08, squareness: 2.35 },
        { y: -0.14, rx: 0.072, rz: 0.088, backScale: 1.14, squareness: 2.4 },
        { y: 0.02, rx: 0.062, rz: 0.072, squareness: 2.3 },
      ],
      16
    ),
    undersuitMat
  );
  shin.castShadow = true;
  knee.add(shin);

  const greave = new THREE.Mesh(
    createCurvedPanelGeometry(
      [
        { y: -0.38, rx: 0.058, rz: 0.068, thickness: 0.017 },
        { y: -0.2, rx: 0.075, rz: 0.09, thickness: 0.021 },
        { y: -0.05, rx: 0.071, rz: 0.081, thickness: 0.017 },
      ],
      -Math.PI * 0.85,
      -Math.PI * 0.15,
      12
    ),
    armorMat
  );
  greave.castShadow = true;
  knee.add(greave);

  // External hydraulic exo-piston strut along outer shin
  const pistonSleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.17, 10),
    gunmetalMat
  );
  pistonSleeve.position.set(side * 0.078, -0.13, 0.016);
  knee.add(pistonSleeve);

  const pistonRod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.011, 0.25, 10),
    chromeMat
  );
  pistonRod.position.set(side * 0.078, -0.28, 0.016);
  knee.add(pistonRod);

  const ankleLed = new THREE.Mesh(createBeveledBox(0.014, 0.026, 0.014, 0.003), opticAmberMat);
  ankleLed.position.set(side * 0.09, -0.12, -0.008);
  knee.add(ankleLed);

  // Articulated ankle + heavy armored exo-boot (seats cleanly at y = 0!)
  const ankle = new THREE.Group();
  ankle.position.set(0, -0.44, 0);
  knee.add(ankle);

  const ankleCuff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.056, 0.064, 0.064, 12),
    gunmetalMat
  );
  ankleCuff.position.set(0, 0.02, 0);
  ankle.add(ankleCuff);

  const bootVamp = new THREE.Mesh(createBeveledBox(0.11, 0.068, 0.215, 0.014), armorMat);
  bootVamp.position.set(0, -0.018, -0.032);
  bootVamp.castShadow = true;
  ankle.add(bootVamp);

  const toeCap = new THREE.Mesh(createBeveledBox(0.104, 0.054, 0.098, 0.016), titaniumMat);
  toeCap.position.set(0, -0.025, -0.118);
  toeCap.castShadow = true;
  ankle.add(toeCap);

  const sole = new THREE.Mesh(createBeveledBox(0.12, 0.028, 0.28, 0.006), gunmetalMat);
  sole.position.set(0, -0.046, -0.04);
  ankle.add(sole);

  const heelSpur = new THREE.Mesh(createBeveledBox(0.066, 0.046, 0.054, 0.008), chromeMat);
  heelSpur.position.set(0, -0.031, 0.096);
  ankle.add(heelSpur);

  return { hip, knee, ankle };
}

function buildSculptedExoArm(
  side: -1 | 1,
  armorMat: THREE.Material,
  undersuitMat: THREE.Material,
  titaniumMat: THREE.Material,
  gunmetalMat: THREE.Material,
  hazardMat: THREE.Material
) {
  const shoulder = new THREE.Group();
  const pauldronMount = new THREE.Group();
  const upperLen = 0.26;
  const lowerLen = 0.25;

  // Deltoid socket cap so shoulder-to-torso NEVER shows a dark hole during dramatic IK aiming
  const deltoidCap = new THREE.Mesh(new THREE.SphereGeometry(0.076, 12, 10), undersuitMat);
  shoulder.add(deltoidCap);

  // Layered curved ballistic pauldron seated on torso-stabilized mount (never twists sideways!)
  const pauldron = new THREE.Mesh(
    createCurvedPanelGeometry(
      [
        { y: -0.095, rx: 0.098, rz: 0.106, thickness: 0.018 },
        { y: -0.01, rx: 0.108, rz: 0.116, thickness: 0.022 },
        { y: 0.068, rx: 0.09, rz: 0.098, thickness: 0.018 },
      ],
      side === 1 ? -Math.PI * 0.45 : Math.PI * 0.55,
      side === 1 ? Math.PI * 0.45 : Math.PI * 1.45,
      12
    ),
    armorMat
  );
  pauldron.position.set(side * 0.012, 0.012, 0);
  pauldron.rotation.z = -side * 0.16;
  pauldron.castShadow = true;
  pauldronMount.add(pauldron);

  const pauldronTrim = new THREE.Mesh(createBeveledBox(0.028, 0.024, 0.15, 0.005), hazardMat);
  pauldronTrim.position.set(side * 0.112, -0.01, 0);
  pauldronTrim.rotation.z = -side * 0.16;
  pauldronMount.add(pauldronTrim);

  // Sculpted muscular upper arm (bottom-to-top Y order for outward normals!)
  const bicep = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: -upperLen, rx: 0.05, rz: 0.054, squareness: 2.1 },
        { y: -0.13, rx: 0.06, rz: 0.064, squareness: 2.25 },
        { y: 0.01, rx: 0.062, rz: 0.066, squareness: 2.2 },
      ],
      14
    ),
    undersuitMat
  );
  bicep.castShadow = true;
  shoulder.add(bicep);

  // Elbow assembly
  const elbow = new THREE.Group();
  elbow.position.set(0, -upperLen, 0);
  shoulder.add(elbow);

  const elbowSphere = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), gunmetalMat);
  elbow.add(elbowSphere);

  // Sculpted armored vambrace forearm gauntlet (bottom-to-top Y order for outward normals!)
  const forearm = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: -lowerLen + 0.01, rx: 0.044, rz: 0.048, squareness: 2.35 },
        { y: -0.11, rx: 0.056, rz: 0.06, squareness: 2.45 },
        { y: 0.01, rx: 0.052, rz: 0.056, squareness: 2.3 },
      ],
      14
    ),
    titaniumMat
  );
  forearm.castShadow = true;
  elbow.add(forearm);

  const gauntletPlate = new THREE.Mesh(createBeveledBox(0.038, 0.155, 0.072, 0.01), armorMat);
  gauntletPlate.position.set(side * 0.04, -0.115, 0);
  gauntletPlate.castShadow = true;
  elbow.add(gauntletPlate);

  // Articulated 5-finger armored tactical glove seated at wrist end (-lowerLen)
  const hand = createSculptedHand(side, gunmetalMat, armorMat, undersuitMat);
  hand.position.set(0, -lowerLen + 0.015, 0);
  elbow.add(hand);

  return { shoulder, pauldronMount, elbow, upperLen, lowerLen };
}

/**
 * AAA Showcase Floor 07 EXO-CARBINE TROOPER rig (Round 2 Sculpt & Two-Bone IK Polish):
 * - Seamless athletic anatomy with zero pelvis/waist seam gap & fitted contoured cuisse plates
 * - Aggressive predator-slit panoramic cyan HUD visor framed by dark gunmetal bezel & respirator grille
 * - Two-bone analytical arm IK locking both sculpted 5-finger gloves cleanly onto pistol grip & foregrip
 * - Detailed M7-VX Bullpup Pulse Carbine + under-barrel 40mm plasma flush-grenade launcher + targeting laser
 * - Iconic Dorsal Jet-Exo Thruster Pack weakpoint (superheated amber plasma core + roll-cage + twin flame cones)
 */
export function buildExoCarbineTrooperRig(
  enemyId: string,
  mats: Floor07EnemyMaterials,
  sharedTextures?: ExoTrooperTextureSuite
): ExoCarbineRigHandle {
  const ownsTextures = !sharedTextures;
  const tex = sharedTextures ?? createExoTrooperTextures();

  const root = new THREE.Group();
  const ownedMats: THREE.Material[] = [];
  const trackMat = <T extends THREE.Material>(m: T): T => {
    ownedMats.push(m);
    return m;
  };

  const armorFlashMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffaa38,
      emissiveIntensity: 0,
      map: tex.ceramicAlbedo,
      bumpMap: tex.ceramicBump,
      bumpScale: 0.022,
      roughnessMap: tex.ceramicRoughness,
      roughness: 0.68,
      metalness: 0.32,
    })
  );

  const undersuitMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.undersuitAlbedo,
      bumpMap: tex.undersuitBump,
      bumpScale: 0.026,
      roughness: 0.88,
      metalness: 0.1,
    })
  );

  const titaniumFlashMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffaa38,
      emissiveIntensity: 0,
      map: tex.titaniumAlbedo,
      bumpMap: tex.titaniumBump,
      bumpScale: 0.018,
      roughness: 0.54,
      metalness: 0.4,
    })
  );

  const gunmetalMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2e3844,
      bumpMap: tex.titaniumBump,
      bumpScale: 0.012,
      roughness: 0.5,
      metalness: 0.46,
    })
  );

  const chromeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc8d4e0,
      roughness: 0.28,
      metalness: 0.6,
    })
  );

  const hazardMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe87b22,
      bumpMap: tex.ceramicBump,
      bumpScale: 0.012,
      roughness: 0.54,
      metalness: 0.2,
    })
  );

  const visorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x4af2ff,
      map: tex.visorHexMap,
      emissive: 0x0ed8ff,
      emissiveMap: tex.visorHexMap,
      emissiveIntensity: 2.5,
      roughness: 0.14,
      metalness: 0.22,
    })
  );

  const weakpointMat = mats.createWeakpointMaterial(0xff961c, 2.8);
  const weakpointAccentMat = mats.createWeakpointMaterial(0xff5e12, 2.3);

  const outerPlumeMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x2be6ff,
      transparent: true,
      opacity: 0.76,
      depthWrite: false,
    })
  );
  const innerPlumeMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xf0ffff,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
    })
  );

  root.add(createEnemyContactShadow(0.6, mats.contactShadow));

  // Pelvis & Fitted Tactical Belt Rig (seats boots cleanly at y = 0)
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 0.94, 0);
  root.add(pelvis);

  const pelvisCore = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: -0.1, rx: 0.165, rz: 0.118, squareness: 2.4 },
        { y: 0.0, rx: 0.178, rz: 0.128, squareness: 2.5 },
        { y: 0.1, rx: 0.166, rz: 0.12, squareness: 2.4 },
      ],
      20
    ),
    undersuitMat
  );
  pelvisCore.castShadow = true;
  pelvis.add(pelvisCore);

  // Tightly fitted contoured tactical belt (zero floating shelf!) + armored groin & side hip tassets
  const belt = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: 0.015, rx: 0.184, rz: 0.135, squareness: 2.65 },
        { y: 0.088, rx: 0.18, rz: 0.132, squareness: 2.65 },
      ],
      20
    ),
    gunmetalMat
  );
  pelvis.add(belt);

  const beltBuckle = new THREE.Mesh(createBeveledBox(0.084, 0.062, 0.032, 0.008), titaniumFlashMat);
  beltBuckle.position.set(0, 0.052, -0.138);
  pelvis.add(beltBuckle);

  const codpiece = new THREE.Mesh(createBeveledBox(0.138, 0.165, 0.068, 0.016), armorFlashMat);
  codpiece.position.set(0, -0.035, -0.112);
  codpiece.rotation.x = 0.1;
  codpiece.castShadow = true;
  pelvis.add(codpiece);

  for (const side of [-1, 1] as const) {
    // Angled armored hip-flank skirt bridging waist-to-thigh cleanly
    const hipTasset = new THREE.Mesh(createBeveledBox(0.054, 0.14, 0.145, 0.012), armorFlashMat);
    hipTasset.position.set(side * 0.186, -0.02, 0);
    hipTasset.rotation.z = side * 0.14;
    hipTasset.castShadow = true;
    pelvis.add(hipTasset);

    const hipPouch = new THREE.Mesh(createBeveledBox(0.048, 0.095, 0.09, 0.01), titaniumFlashMat);
    hipPouch.position.set(side * 0.194, 0.042, -0.045);
    pelvis.add(hipPouch);
  }

  // Sculpted Legs
  const leftLeg = buildSculptedExoLeg(
    -1,
    armorFlashMat,
    undersuitMat,
    titaniumFlashMat,
    gunmetalMat,
    chromeMat,
    hazardMat,
    mats.opticAmber
  );
  leftLeg.hip.position.set(-0.128, -0.04, 0);
  pelvis.add(leftLeg.hip);

  const rightLeg = buildSculptedExoLeg(
    1,
    armorFlashMat,
    undersuitMat,
    titaniumFlashMat,
    gunmetalMat,
    chromeMat,
    hazardMat,
    mats.opticAmber
  );
  rightLeg.hip.position.set(0.128, -0.04, 0);
  pelvis.add(rightLeg.hip);

  // Sculpted Athletic V-Tapered Torso (starts at y = -0.03 overlapping deeply into pelvis!)
  const torso = new THREE.Group();
  torso.position.set(0, 0.07, 0);
  pelvis.add(torso);

  const torsoAnatomy = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: -0.03, rx: 0.162, rz: 0.118, squareness: 2.35 },
        { y: 0.12, rx: 0.174, rz: 0.126, frontScale: 1.05, squareness: 2.42 },
        { y: 0.28, rx: 0.222, rz: 0.148, frontScale: 1.09, squareness: 2.52 },
        { y: 0.44, rx: 0.238, rz: 0.142, squareness: 2.48 },
        { y: 0.52, rx: 0.136, rz: 0.108, squareness: 2.25 },
      ],
      22
    ),
    undersuitMat
  );
  torsoAnatomy.castShadow = true;
  torso.add(torsoAnatomy);

  // Contoured 45°-chamfered ceramic chest cuirass + armored ribcage side-plates
  const pecLeft = new THREE.Mesh(
    createContouredArmorPlate(
      [
        [-0.07, 0.23],
        [-0.74, 0.25],
        [-0.84, 0.43],
        [-0.14, 0.47],
      ],
      mapTorsoSurface,
      0.024,
      0.16,
      0.008,
      3
    ),
    armorFlashMat
  );
  pecLeft.castShadow = true;
  torso.add(pecLeft);

  const pecRight = new THREE.Mesh(
    createContouredArmorPlate(
      [
        [0.07, 0.23],
        [0.14, 0.47],
        [0.84, 0.43],
        [0.74, 0.25],
      ],
      mapTorsoSurface,
      0.024,
      0.16,
      0.008,
      3
    ),
    armorFlashMat
  );
  pecRight.castShadow = true;
  torso.add(pecRight);

  // Central sternum carrier plate + 3 angled tactical mag pouches + shoulder harness straps
  const sternumCarrier = new THREE.Mesh(
    createContouredArmorPlate(
      [
        [-0.4, 0.08],
        [0.4, 0.08],
        [0.48, 0.27],
        [0.0, 0.34],
        [-0.48, 0.27],
      ],
      mapTorsoSurface,
      0.026,
      0.16,
      0.008,
      3
    ),
    titaniumFlashMat
  );
  sternumCarrier.castShadow = true;
  torso.add(sternumCarrier);

  for (const px of [-0.076, 0, 0.076]) {
    const chestMag = new THREE.Mesh(createBeveledBox(0.054, 0.112, 0.044, 0.007), gunmetalMat);
    chestMag.position.set(px, 0.165, -0.17);
    chestMag.rotation.x = 0.08;
    torso.add(chestMag);
  }

  for (const side of [-1, 1] as const) {
    const harnessStrap = new THREE.Mesh(createBeveledBox(0.068, 0.042, 0.26, 0.008), gunmetalMat);
    harnessStrap.position.set(side * 0.135, 0.47, 0.01);
    harnessStrap.rotation.z = -side * 0.18;
    torso.add(harnessStrap);
  }

  // High flared ballistic clavicle collar guard (hides neck seam cleanly!)
  const collarGuard = new THREE.Mesh(
    createCurvedPanelGeometry(
      [
        { y: 0.45, rx: 0.172, rz: 0.152, thickness: 0.024 },
        { y: 0.525, rx: 0.142, rz: 0.134, thickness: 0.02 },
      ],
      -Math.PI * 0.94,
      Math.PI * 0.94,
      18
    ),
    armorFlashMat
  );
  collarGuard.castShadow = true;
  torso.add(collarGuard);

  const collarStripe = new THREE.Mesh(createBeveledBox(0.14, 0.024, 0.026, 0.004), hazardMat);
  collarStripe.position.set(0, 0.492, -0.154);
  torso.add(collarStripe);

  // =========================================================================
  // SCULPTED PREDATOR RECON EXO-HELMET (sleek angular visor + respirator jaw)
  // =========================================================================
  const head = new THREE.Group();
  head.position.set(0, 0.54, -0.012);
  torso.add(head);

  const neckSeal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.068, 0.084, 0.095, 14),
    undersuitMat
  );
  neckSeal.position.set(0, 0.018, 0.005);
  head.add(neckSeal);

  const helmetShell = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: 0.025, rx: 0.094, rz: 0.108, frontScale: 1.08, squareness: 2.35 },
        { y: 0.095, rx: 0.112, rz: 0.13, frontScale: 1.12, squareness: 2.45 },
        { y: 0.18, rx: 0.116, rz: 0.138, frontScale: 1.06, squareness: 2.4 },
        { y: 0.25, rx: 0.094, rz: 0.12, squareness: 2.25 },
        { y: 0.285, rx: 0.048, rz: 0.072, squareness: 2.0 },
      ],
      20
    ),
    armorFlashMat
  );
  helmetShell.castShadow = true;
  head.add(helmetShell);

  const helmetCrest = new THREE.Mesh(createBeveledBox(0.048, 0.036, 0.205, 0.01), titaniumFlashMat);
  helmetCrest.position.set(0, 0.272, 0.012);
  helmetCrest.rotation.x = -0.08;
  head.add(helmetCrest);

  // Sleek Menacing Panoramic Electric-Cyan HUD Visor Slit framed by dark gunmetal bezel!
  const visorBezel = new THREE.Mesh(
    createCurvedPanelGeometry(
      [
        { y: 0.114, rx: 0.114, rz: 0.14, thickness: 0.016 },
        { y: 0.194, rx: 0.114, rz: 0.14, thickness: 0.016 },
      ],
      -Math.PI * 0.84,
      -Math.PI * 0.16,
      16
    ),
    gunmetalMat
  );
  head.add(visorBezel);

  const visor = new THREE.Mesh(
    createCurvedPanelGeometry(
      [
        { y: 0.132, rx: 0.117, rz: 0.146, thickness: 0.012 },
        { y: 0.156, rx: 0.12, rz: 0.151, thickness: 0.013 },
        { y: 0.178, rx: 0.116, rz: 0.145, thickness: 0.012 },
      ],
      -Math.PI * 0.78,
      -Math.PI * 0.22,
      16
    ),
    visorMat
  );
  head.add(visor);

  // Sharp angled dark brow cowl overhang + nose bridge divider
  const browShield = new THREE.Mesh(
    createCurvedPanelGeometry(
      [
        { y: 0.184, rx: 0.122, rz: 0.156, thickness: 0.018 },
        { y: 0.214, rx: 0.115, rz: 0.142, thickness: 0.015 },
      ],
      -Math.PI * 0.85,
      -Math.PI * 0.15,
      14
    ),
    titaniumFlashMat
  );
  head.add(browShield);

  const noseBridge = new THREE.Mesh(createBeveledBox(0.022, 0.068, 0.032, 0.005), gunmetalMat);
  noseBridge.position.set(0, 0.148, -0.154);
  noseBridge.rotation.x = 0.2;
  head.add(noseBridge);

  // Sculpted mandibular respirator jaw + sleek angled dark gunmetal intake grilles (zero silly cheek balls!)
  const chinMask = new THREE.Mesh(
    createCurvedPanelGeometry(
      [
        { y: 0.03, rx: 0.088, rz: 0.122, thickness: 0.024 },
        { y: 0.116, rx: 0.108, rz: 0.142, thickness: 0.024 },
      ],
      -Math.PI * 0.78,
      -Math.PI * 0.22,
      14
    ),
    gunmetalMat
  );
  head.add(chinMask);

  const chinVent = new THREE.Mesh(createBeveledBox(0.064, 0.044, 0.028, 0.006), titaniumFlashMat);
  chinVent.position.set(0, 0.072, -0.142);
  chinVent.rotation.x = -0.18;
  head.add(chinVent);

  for (const side of [-1, 1] as const) {
    const intake = new THREE.Mesh(createBeveledBox(0.034, 0.042, 0.056, 0.008), gunmetalMat);
    intake.position.set(side * 0.074, 0.078, -0.112);
    intake.rotation.y = side * 0.45;
    head.add(intake);

    const earPod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.042, 0.032, 12),
      gunmetalMat
    );
    earPod.rotation.z = Math.PI / 2;
    earPod.position.set(side * 0.118, 0.152, 0.015);
    head.add(earPod);
  }

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.008, 0.24, 6), chromeMat);
  antenna.position.set(0.128, 0.275, 0.042);
  antenna.rotation.set(-0.18, 0, -0.12);
  head.add(antenna);

  const rangefinder = new THREE.Mesh(createBeveledBox(0.034, 0.042, 0.095, 0.006), gunmetalMat);
  rangefinder.position.set(-0.124, 0.175, -0.04);
  head.add(rangefinder);

  const rfLens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.011, 0.015, 8),
    mats.opticAmber
  );
  rfLens.rotation.x = Math.PI / 2;
  rfLens.position.set(-0.124, 0.175, -0.09);
  head.add(rfLens);

  const visorAnchor = new THREE.Object3D();
  visorAnchor.position.set(0, 0.156, -0.165);
  head.add(visorAnchor);

  // =========================================================================
  // SIGNATURE DORSAL JET-EXO THRUSTER PACK (WEAKPOINT!)
  // =========================================================================
  const exoPackGroup = new THREE.Group();
  exoPackGroup.position.set(0, 0.32, 0.215);
  torso.add(exoPackGroup);

  const packChassis = new THREE.Mesh(createBeveledBox(0.3, 0.35, 0.12, 0.022), gunmetalMat);
  packChassis.castShadow = true;
  exoPackGroup.add(packChassis);

  for (const side of [-1, 1] as const) {
    const cowling = new THREE.Mesh(createBeveledBox(0.096, 0.32, 0.155, 0.02), titaniumFlashMat);
    cowling.position.set(side * 0.142, 0.01, 0.022);
    cowling.rotation.y = -side * 0.22;
    cowling.castShadow = true;
    exoPackGroup.add(cowling);

    const cowlingStripe = new THREE.Mesh(createBeveledBox(0.1, 0.028, 0.158, 0.004), hazardMat);
    cowlingStripe.position.set(side * 0.144, 0.112, 0.024);
    cowlingStripe.rotation.y = -side * 0.22;
    exoPackGroup.add(cowlingStripe);

    const hose = new THREE.Mesh(
      createStrapTube(
        [
          new THREE.Vector3(side * 0.1, 0.14, -0.01),
          new THREE.Vector3(side * 0.16, 0.19, -0.08),
          new THREE.Vector3(side * 0.13, 0.13, -0.19),
        ],
        0.013,
        0.5,
        14
      ),
      gunmetalMat
    );
    exoPackGroup.add(hose);
  }

  const packCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.074, 0.074, 0.24, 16),
    weakpointMat
  );
  packCore.position.set(0, 0.015, 0.078);
  exoPackGroup.add(packCore);

  for (const ry of [-0.072, 0.015, 0.102]) {
    const coreRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.079, 0.01, 8, 16),
      gunmetalMat
    );
    coreRing.rotation.x = Math.PI / 2;
    coreRing.position.set(0, ry, 0.078);
    exoPackGroup.add(coreRing);
  }

  const topThermalVent = new THREE.Mesh(
    createBeveledBox(0.185, 0.07, 0.112, 0.014),
    weakpointAccentMat
  );
  topThermalVent.position.set(0, 0.18, 0.038);
  exoPackGroup.add(topThermalVent);

  const buildNozzle = (side: -1 | 1) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.13, -0.155, 0.042);
    pivot.rotation.set(0.32, 0, side * 0.16);

    const bell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.058, 0.12, 14),
      gunmetalMat
    );
    bell.position.y = -0.04;
    pivot.add(bell);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.008, 8, 14), chromeMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.098;
    pivot.add(rim);

    const outerPlume = new THREE.Mesh(new THREE.ConeGeometry(0.062, 0.56, 12), outerPlumeMat);
    outerPlume.position.y = -0.38;
    outerPlume.rotation.x = Math.PI;
    outerPlume.visible = false;
    pivot.add(outerPlume);

    const innerPlume = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.34, 8), innerPlumeMat);
    innerPlume.position.y = -0.26;
    innerPlume.rotation.x = Math.PI;
    innerPlume.visible = false;
    pivot.add(innerPlume);

    const tipAnchor = new THREE.Object3D();
    tipAnchor.position.set(0, -0.115, 0);
    pivot.add(tipAnchor);

    exoPackGroup.add(pivot);
    return { pivot, outerPlume, innerPlume, tipAnchor };
  };

  const nozzleL = buildNozzle(-1);
  const nozzleR = buildNozzle(1);

  const weakpointAnchor = new THREE.Object3D();
  weakpointAnchor.position.set(0, 0.03, 0.12);
  exoPackGroup.add(weakpointAnchor);

  // =========================================================================
  // SCULPTED ARMS + M7-VX BULLPUP PULSE CARBINE WITH ANALYTICAL 2-BONE IK!
  // =========================================================================
  const leftArm = buildSculptedExoArm(
    -1,
    armorFlashMat,
    undersuitMat,
    titaniumFlashMat,
    gunmetalMat,
    hazardMat
  );
  leftArm.shoulder.position.set(-0.255, 0.415, 0.01);
  leftArm.pauldronMount.position.set(-0.255, 0.415, 0.01);
  torso.add(leftArm.shoulder, leftArm.pauldronMount);

  const rightArm = buildSculptedExoArm(
    1,
    armorFlashMat,
    undersuitMat,
    titaniumFlashMat,
    gunmetalMat,
    hazardMat
  );
  rightArm.shoulder.position.set(0.255, 0.415, 0.01);
  rightArm.pauldronMount.position.set(0.255, 0.415, 0.01);
  torso.add(rightArm.shoulder, rightArm.pauldronMount);

  const weaponRig = new THREE.Group();
  weaponRig.position.set(0.155, 0.315, -0.34);
  torso.add(weaponRig);

  const carbine = new THREE.Group();
  weaponRig.add(carbine);

  const mainBody = new THREE.Mesh(createBeveledBox(0.068, 0.118, 0.64, 0.012), gunmetalMat);
  mainBody.castShadow = true;
  carbine.add(mainBody);

  const upperShroud = new THREE.Mesh(createBeveledBox(0.074, 0.056, 0.44, 0.01), armorFlashMat);
  upperShroud.position.set(0, 0.044, -0.08);
  upperShroud.castShadow = true;
  carbine.add(upperShroud);

  const railL = new THREE.Mesh(createBeveledBox(0.014, 0.022, 0.36, 0.003), mats.opticCyan);
  railL.position.set(-0.036, 0.032, -0.26);
  carbine.add(railL);

  const railR = new THREE.Mesh(createBeveledBox(0.014, 0.022, 0.36, 0.003), mats.opticCyan);
  railR.position.set(0.036, 0.032, -0.26);
  carbine.add(railR);

  const barrelTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.017, 0.02, 0.28, 10),
    chromeMat
  );
  barrelTube.rotation.x = Math.PI / 2;
  barrelTube.position.set(0, 0.024, -0.39);
  carbine.add(barrelTube);

  const muzzleBrake = new THREE.Mesh(createBeveledBox(0.044, 0.048, 0.075, 0.007), gunmetalMat);
  muzzleBrake.position.set(0, 0.024, -0.53);
  carbine.add(muzzleBrake);

  const glTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.026, 0.28, 10),
    titaniumFlashMat
  );
  glTube.rotation.x = Math.PI / 2;
  glTube.position.set(0, -0.046, -0.29);
  carbine.add(glTube);

  const glChargeGlow = new THREE.Mesh(
    createBeveledBox(0.052, 0.016, 0.06, 0.003),
    mats.opticAmber
  );
  glChargeGlow.position.set(0, -0.046, -0.22);
  carbine.add(glChargeGlow);

  const opticHousing = new THREE.Mesh(createBeveledBox(0.048, 0.058, 0.125, 0.008), gunmetalMat);
  opticHousing.position.set(0, 0.1, -0.02);
  carbine.add(opticHousing);

  const opticGlass = new THREE.Mesh(createBeveledBox(0.034, 0.034, 0.012, 0.002), mats.opticCyan);
  opticGlass.position.set(0, 0.104, -0.078);
  carbine.add(opticGlass);

  const pistolGrip = new THREE.Mesh(createBeveledBox(0.042, 0.115, 0.056, 0.008), gunmetalMat);
  pistolGrip.position.set(0, -0.088, 0.06);
  pistolGrip.rotation.x = -0.26;
  carbine.add(pistolGrip);

  const foregrip = new THREE.Mesh(createBeveledBox(0.038, 0.095, 0.048, 0.007), gunmetalMat);
  foregrip.position.set(-0.01, -0.092, -0.18);
  foregrip.rotation.x = 0.24;
  carbine.add(foregrip);

  const bullpupMag = new THREE.Mesh(createBeveledBox(0.048, 0.165, 0.092, 0.008), hazardMat);
  bullpupMag.position.set(0, -0.1, 0.21);
  bullpupMag.rotation.x = 0.18;
  carbine.add(bullpupMag);

  // Exact hand-lock IK targets attached directly to the carbine pistol grip & foregrip!
  const rightGripAnchor = new THREE.Object3D();
  rightGripAnchor.position.set(0.015, -0.082, 0.065);
  carbine.add(rightGripAnchor);

  const leftGripAnchor = new THREE.Object3D();
  leftGripAnchor.position.set(-0.025, -0.085, -0.175);
  carbine.add(leftGripAnchor);

  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, 0.024, -0.58);
  carbine.add(muzzlePoint);

  const grenadeMuzzle = new THREE.Object3D();
  grenadeMuzzle.position.set(0, -0.046, -0.45);
  carbine.add(grenadeMuzzle);

  const laserMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xff2842,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    })
  );
  const laserGeo = new THREE.CylinderGeometry(0.01, 0.01, 1.0, 6);
  laserGeo.rotateX(Math.PI / 2);
  laserGeo.translate(0, 0, -0.5);
  const laserMesh = new THREE.Mesh(laserGeo, laserMat);
  laserMesh.visible = false;
  muzzlePoint.add(laserMesh);

  // Raycast hitboxes
  const bodyHitbox = createEnemyHitboxMesh(enemyId, 'body', new THREE.BoxGeometry(0.62, 1.38, 0.44));
  bodyHitbox.position.set(0, 0.78, 0);
  root.add(bodyHitbox);

  const headHitbox = createEnemyHitboxMesh(enemyId, 'head', new THREE.BoxGeometry(0.28, 0.31, 0.32));
  headHitbox.position.set(0, 0.14, 0);
  head.add(headHitbox);

  const wpHitbox = createEnemyHitboxMesh(
    enemyId,
    'weakpoint',
    new THREE.BoxGeometry(0.42, 0.44, 0.28),
    'exo_pack'
  );
  wpHitbox.position.set(0, 0.04, 0.08);
  exoPackGroup.add(wpHitbox);

  let stridePhase = 0;
  const _rightHandTarget = new THREE.Vector3();
  const _leftHandTarget = new THREE.Vector3();
  const _rightPole = new THREE.Vector3(0.65, -0.45, 0.55);
  const _leftPole = new THREE.Vector3(-0.62, -0.58, 0.42);

  const lockHandsToCarbine = () => {
    weaponRig.updateMatrix();
    _rightHandTarget.copy(rightGripAnchor.position).applyMatrix4(weaponRig.matrix);
    _leftHandTarget.copy(leftGripAnchor.position).applyMatrix4(weaponRig.matrix);
    solveArmTwoBoneIK(
      rightArm.shoulder,
      rightArm.elbow,
      _rightHandTarget,
      _rightPole,
      rightArm.upperLen,
      rightArm.lowerLen
    );
    solveArmTwoBoneIK(
      leftArm.shoulder,
      leftArm.elbow,
      _leftHandTarget,
      _leftPole,
      leftArm.upperLen,
      leftArm.lowerLen
    );
  };

  // Initialize crisp idle aim pose immediately on build
  lockHandsToCarbine();

  return {
    root,
    hitboxes: [wpHitbox, headHitbox, bodyHitbox],
    weakpointMaterials: [weakpointMat, weakpointAccentMat],
    armorFlashMaterials: [armorFlashMat, titaniumFlashMat],
    getMuzzleWorldPos: (out) => {
      muzzlePoint.getWorldPosition(out);
      return out;
    },
    getGrenadeMuzzleWorldPos: (out) => {
      grenadeMuzzle.getWorldPosition(out);
      return out;
    },
    getWeakpointWorldPos: (out) => {
      weakpointAnchor.getWorldPosition(out);
      return out;
    },
    getVisorWorldPos: (out) => {
      visorAnchor.getWorldPosition(out);
      return out;
    },
    getBoosterNozzleWorldPos: (side, out) => {
      (side === -1 ? nozzleL.tipAnchor : nozzleR.tipAnchor).getWorldPosition(out);
      return out;
    },
    setLaserSight: (active, length, dangerRatio) => {
      laserMesh.visible = active;
      if (active) {
        const w = 1.0 + dangerRatio * 1.45;
        laserMesh.scale.set(w, w, Math.max(0.5, length));
        laserMat.color.setHex(dangerRatio > 0.55 ? 0xff2644 : 0x38e8ff);
        laserMat.opacity = 0.55 + dangerRatio * 0.42;
      }
    },
    updateAnimation: (input: EnemyAnimationInput) => {
      if (input.behavior === 'dead') {
        const p = Math.min(1, input.deadProgress);
        pelvis.position.y = 0.94 * (1 - p * 0.84);
        pelvis.rotation.x = p * 1.44;
        pelvis.rotation.z = 0;
        torso.rotation.x = p * 0.25;
        laserMesh.visible = false;
        nozzleL.outerPlume.visible = false;
        nozzleL.innerPlume.visible = false;
        nozzleR.outerPlume.visible = false;
        nozzleR.innerPlume.visible = false;
        return;
      }

      const speed = Math.min(1.4, input.speedRatio);
      stridePhase += input.dt * (2.7 + speed * 8.2);
      const stride = Math.sin(stridePhase) * 0.54 * Math.min(1, speed);
      const bob = Math.abs(Math.cos(stridePhase)) * 0.04 * Math.min(1, speed);

      const isHyperBrace =
        (input.behavior === 'windup' || input.behavior === 'attack') && input.attackVariant === 2;
      const isGrenadeArc =
        (input.behavior === 'windup' || input.behavior === 'attack') && input.attackVariant === 3;
      const isCqcBash =
        (input.behavior === 'windup' || input.behavior === 'attack') && input.attackVariant === 4;
      const isJetAirborne = (input.boosterIntensity ?? 0) > 0.15;

      const crouchDrop = isHyperBrace ? 0.08 : 0;
      pelvis.position.y = 0.94 - crouchDrop + bob + input.airborneHeight;
      pelvis.rotation.x = isJetAirborne ? 0.16 : 0;
      pelvis.rotation.z = THREE.MathUtils.clamp(-input.localMoveX * 0.22, -0.34, 0.34);

      if (isJetAirborne) {
        // Dynamic airborne Titanfall thruster-flank tuck!
        leftLeg.hip.rotation.x = 0.38;
        leftLeg.knee.rotation.x = -0.64;
        leftLeg.ankle.rotation.x = 0.26;
        rightLeg.hip.rotation.x = -0.22;
        rightLeg.knee.rotation.x = -0.36;
        rightLeg.ankle.rotation.x = 0.42;
      } else if (isHyperBrace) {
        // Grounded wide-stance tactical braced combat squat (both boots firmly on floor!)
        leftLeg.hip.rotation.x = 0.34;
        leftLeg.knee.rotation.x = -0.46;
        leftLeg.ankle.rotation.x = 0.12;
        rightLeg.hip.rotation.x = -0.24;
        rightLeg.knee.rotation.x = -0.22;
        rightLeg.ankle.rotation.x = 0.46;
      } else {
        leftLeg.hip.rotation.x = stride;
        leftLeg.knee.rotation.x = -Math.max(0.06, -stride * 1.05);
        leftLeg.ankle.rotation.x = -(leftLeg.hip.rotation.x + leftLeg.knee.rotation.x) * 0.4;
        rightLeg.hip.rotation.x = -stride;
        rightLeg.knee.rotation.x = -Math.max(0.06, stride * 1.05);
        rightLeg.ankle.rotation.x = -(rightLeg.hip.rotation.x + rightLeg.knee.rotation.x) * 0.4;
      }

      const stagger = input.staggerTimer > 0 ? Math.sin(input.elapsed * 16) * 0.22 : 0;
      const flinch = input.flinchTimer > 0 ? (input.flinchTimer / 0.18) * 0.22 : 0;
      const aimPitch = THREE.MathUtils.clamp(input.aimPitch, -0.45, 0.48);

      if (input.staggerTimer > 0) {
        torso.rotation.x = -0.34;
        torso.rotation.y = stagger;
        weaponRig.position.set(0.18, 0.24, -0.34);
        weaponRig.rotation.set(-0.35, -0.28, -0.18);
        laserMesh.visible = false;
      } else {
        const recoil =
          input.behavior === 'attack'
            ? Math.sin(input.attackProgress * Math.PI * (isHyperBrace ? 6 : 4)) *
              (isHyperBrace ? 0.12 : 0.075)
            : 0;

        const cqcSwing = isCqcBash
          ? input.behavior === 'windup'
            ? -0.52 * input.attackProgress
            : 0.95 * Math.sin(input.attackProgress * Math.PI)
          : 0;

        torso.rotation.x = 0.06 + speed * 0.06 + (isHyperBrace ? 0.1 : 0) - flinch * 0.4;
        torso.rotation.y =
          (isHyperBrace ? -0.16 : 0) + input.localMoveX * 0.14 + cqcSwing * 0.8;
        head.rotation.x = aimPitch;
        head.rotation.y = -torso.rotation.y * 0.55;

        const glTilt = isGrenadeArc ? 0.36 : 0;
        weaponRig.position.set(
          0.145 - (isCqcBash ? cqcSwing * 0.22 : 0),
          0.32 + (isGrenadeArc ? 0.05 : 0),
          -0.34 - (isCqcBash && input.behavior === 'attack' ? 0.14 : 0)
        );
        weaponRig.rotation.set(
          aimPitch * 0.8 + glTilt + recoil,
          cqcSwing * 1.05,
          isCqcBash ? -0.3 : 0
        );
      }

      // Lock both 5-finger gloved hands precisely onto pistol grip & foregrip via two-bone IK!
      lockHandsToCarbine();

      // Dorsal Jet-Exo Thruster Flame Cones & Nozzle Gimbal Vectoring!
      const boostIntensity = input.weakpointBroken ? 0 : input.boosterIntensity ?? 0;
      const boostOn = boostIntensity > 0.15;
      nozzleL.outerPlume.visible = boostOn;
      nozzleL.innerPlume.visible = boostOn;
      nozzleR.outerPlume.visible = boostOn;
      nozzleR.innerPlume.visible = boostOn;

      const gimbalZ = THREE.MathUtils.clamp(-input.localMoveX * 0.35, -0.45, 0.45);
      nozzleL.pivot.rotation.z = -0.16 + gimbalZ;
      nozzleR.pivot.rotation.z = 0.16 + gimbalZ;

      if (boostOn) {
        const flicker = Math.sin(input.elapsed * 52) * 0.14;
        const scaleY = 0.82 + boostIntensity * 0.88 + flicker;
        nozzleL.outerPlume.scale.set(1, scaleY, 1);
        nozzleL.innerPlume.scale.set(1, scaleY * 0.9, 1);
        nozzleR.outerPlume.scale.set(1, scaleY, 1);
        nozzleR.innerPlume.scale.set(1, scaleY * 0.9, 1);
      }
    },
    dispose: () => {
      for (const m of ownedMats) m.dispose();
      if (ownsTextures) tex.dispose();
      root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
      });
    },
  };
}
