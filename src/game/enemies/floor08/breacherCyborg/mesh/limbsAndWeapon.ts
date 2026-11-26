import * as THREE from 'three';
import {
  createBeveledBox,
  createCurvedPanelGeometry,
  createLoftedAnatomy,
  createSculptedHand,
} from '../../../../core/sculptUtils';
import type { Floor08EnemyMaterials } from '../../../core/enemyMeshShared';

export interface BreacherArmRig {
  shoulder: THREE.Group;
  elbow: THREE.Group;
}

export interface BreacherLegRig {
  hip: THREE.Group;
  knee: THREE.Group;
}

export interface BreacherLimbsAndWeapon {
  leftLeg: BreacherLegRig;
  rightLeg: BreacherLegRig;
  leftArm: BreacherArmRig;
  rightArm: BreacherArmRig;
  rifleGroup: THREE.Group;
  muzzlePoint: THREE.Object3D;
  laserOrigin: THREE.Object3D;
  railGlowMat: THREE.MeshStandardMaterial;
  setLaserSight: (visible: boolean, lengthMeters: number, lockCharge?: number) => void;
  disposables: Array<{ dispose: () => void }>;
}

/**
 * Builds the gunsmith-grade VX-8 "VULCAN" Coil-Assisted Breach Carbine (16+ detailed sub-parts):
 * - Local frame: barrel points along -Z, top optic along +Y, stock along +Z, grip/mag along -Y.
 * - Mounted inside rightArm.elbow with rotation.x = -Math.PI/2 so when right arm is raised +90°
 *   forward, the carbine sits dead-level horizontal pointing straight forward (-Z) into his shoulder!
 * - Includes live volumetric laser sight beam + wall contact dot that clips cleanly to world walls!
 */
function buildVx8VulcanCarbine(
  mats: Floor08EnemyMaterials,
  disposables: Array<{ dispose: () => void }>
): {
  rifleGroup: THREE.Group;
  muzzlePoint: THREE.Object3D;
  laserOrigin: THREE.Object3D;
  railGlowMat: THREE.MeshStandardMaterial;
  setLaserSight: (visible: boolean, lengthMeters: number, lockCharge?: number) => void;
} {
  const rifleGroup = new THREE.Group();

  const gunmetalMat = new THREE.MeshStandardMaterial({
    color: 0x262c34,
    roughness: 0.44,
    metalness: 0.72,
    bumpMap: mats.armorDark.bumpMap,
    bumpScale: 0.008,
  });
  const polymerMat = new THREE.MeshStandardMaterial({
    color: 0x161a20,
    roughness: 0.84,
    metalness: 0.16,
    bumpMap: mats.undersuit.bumpMap,
    bumpScale: 0.01,
  });
  const railGlowMat = new THREE.MeshStandardMaterial({
    color: 0xff8c24,
    emissive: 0xff5a12,
    emissiveIntensity: 2.6,
    roughness: 0.15,
    metalness: 0.2,
  });
  const laserBeamMat = new THREE.MeshBasicMaterial({
    color: 0xff2838,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const laserDotMat = new THREE.MeshBasicMaterial({
    color: 0xffc0a0,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  disposables.push(gunmetalMat, polymerMat, railGlowMat, laserBeamMat, laserDotMat);

  // 1. Sculpted Upper & Lower CNC Receivers (centered around grip/trigger at z=0)
  const upperReceiver = new THREE.Mesh(createBeveledBox(0.062, 0.072, 0.34, 0.009), gunmetalMat);
  upperReceiver.position.set(0, 0.048, -0.06);
  upperReceiver.castShadow = true;
  rifleGroup.add(upperReceiver);

  const lowerReceiver = new THREE.Mesh(createBeveledBox(0.056, 0.056, 0.24, 0.008), polymerMat);
  lowerReceiver.position.set(0, -0.008, -0.045);
  rifleGroup.add(lowerReceiver);

  // Top full-length Picatinny rail spine
  const topRail = new THREE.Mesh(createBeveledBox(0.032, 0.016, 0.56, 0.003), mats.titaniumJoint);
  topRail.position.set(0, 0.088, -0.175);
  rifleGroup.add(topRail);

  // 2. Adjustable Skeletal CQB Buttstock extending back (+Z) into shoulder pocket!
  const bufferTube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.24, 10), gunmetalMat);
  bufferTube.rotation.x = Math.PI / 2;
  bufferTube.position.set(0, 0.042, 0.21);
  rifleGroup.add(bufferTube);

  const cheekRest = new THREE.Mesh(createBeveledBox(0.046, 0.048, 0.17, 0.009), polymerMat);
  cheekRest.position.set(0, 0.058, 0.23);
  rifleGroup.add(cheekRest);

  const buttPad = new THREE.Mesh(createBeveledBox(0.044, 0.135, 0.034, 0.008), polymerMat);
  buttPad.position.set(0, 0.012, 0.325);
  rifleGroup.add(buttPad);

  const stockStrut = new THREE.Mesh(createBeveledBox(0.026, 0.024, 0.16, 0.005), gunmetalMat);
  stockStrut.position.set(0, -0.024, 0.235);
  stockStrut.rotation.x = 0.24;
  rifleGroup.add(stockStrut);

  // 3. Ergonomic Pistol Grip + Trigger Guard
  const pistolGrip = new THREE.Mesh(createBeveledBox(0.038, 0.115, 0.052, 0.009), polymerMat);
  pistolGrip.position.set(0, -0.072, 0.032);
  pistolGrip.rotation.x = -0.26;
  rifleGroup.add(pistolGrip);

  const triggerGuard = new THREE.Mesh(createBeveledBox(0.022, 0.014, 0.072, 0.003), gunmetalMat);
  triggerGuard.position.set(0, -0.052, -0.022);
  rifleGroup.add(triggerGuard);

  // 4. Curved 30-Round Tactical Magazine with Amber Witness Strip
  const magUpper = new THREE.Mesh(createBeveledBox(0.038, 0.115, 0.074, 0.006), polymerMat);
  magUpper.position.set(0, -0.088, -0.105);
  magUpper.rotation.x = 0.16;
  rifleGroup.add(magUpper);

  const magLower = new THREE.Mesh(createBeveledBox(0.036, 0.095, 0.07, 0.006), polymerMat);
  magLower.position.set(0, -0.172, -0.128);
  magLower.rotation.x = 0.34;
  rifleGroup.add(magLower);

  const magWitness = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.068, 0.016), railGlowMat);
  magWitness.position.set(0, -0.125, -0.115);
  magWitness.rotation.x = 0.24;
  rifleGroup.add(magWitness);

  // 5. Perforated M-LOK Rail-Accelerator Handguard + Twin Glowing Electromagnetic Coils
  const handguard = new THREE.Mesh(createBeveledBox(0.068, 0.074, 0.3, 0.01), gunmetalMat);
  handguard.position.set(0, 0.042, -0.355);
  handguard.castShadow = true;
  rifleGroup.add(handguard);

  for (const side of [-1, 1]) {
    const railCoil = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.018, 0.25), railGlowMat);
    railCoil.position.set(side * 0.036, 0.042, -0.36);
    rifleGroup.add(railCoil);

    // Cooling vent ribs along coil shroud
    for (let r = 0; r < 3; r++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.042, 0.014), mats.titaniumJoint);
      rib.position.set(side * 0.035, 0.042, -0.28 - r * 0.075);
      rifleGroup.add(rib);
    }
  }

  // Angled Tactical Foregrip (positioned for exact left-hand two-handed CQB grip!)
  const foregrip = new THREE.Mesh(createBeveledBox(0.038, 0.086, 0.044, 0.008), polymerMat);
  foregrip.position.set(0, -0.024, -0.255);
  foregrip.rotation.x = 0.26;
  rifleGroup.add(foregrip);

  // 6. Heavy Fluted Precision Barrel + Dual-Port Tank Compensator Muzzle Brake
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.24, 10), mats.titaniumJoint);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.044, -0.57);
  rifleGroup.add(barrel);

  const compBrake = new THREE.Mesh(createBeveledBox(0.048, 0.042, 0.088, 0.007), gunmetalMat);
  compBrake.position.set(0, 0.044, -0.685);
  rifleGroup.add(compBrake);

  const muzzleGlowRing = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 6, 10), railGlowMat);
  muzzleGlowRing.position.set(0, 0.044, -0.73);
  rifleGroup.add(muzzleGlowRing);

  // 7. Cantilevered Holographic / ACOG Tactical Optic on Top Rail
  const opticMount = new THREE.Mesh(createBeveledBox(0.036, 0.024, 0.095, 0.004), mats.titaniumJoint);
  opticMount.position.set(0, 0.104, -0.065);
  rifleGroup.add(opticMount);

  const opticHood = new THREE.Mesh(createBeveledBox(0.052, 0.056, 0.135, 0.009), polymerMat);
  opticHood.position.set(0, 0.136, -0.075);
  rifleGroup.add(opticHood);

  const opticLens = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.032, 0.012), railGlowMat);
  opticLens.position.set(0, 0.136, -0.142);
  rifleGroup.add(opticLens);

  // 8. Side-Mounted PEQ-15 Laser Target Designator + Live Volumetric Wall-Clipped Laser Sight Beam!
  const peqBox = new THREE.Mesh(createBeveledBox(0.036, 0.034, 0.088, 0.006), polymerMat);
  peqBox.position.set(-0.045, 0.068, -0.43);
  rifleGroup.add(peqBox);

  const laserOrigin = new THREE.Object3D();
  laserOrigin.position.set(-0.045, 0.068, -0.48);
  rifleGroup.add(laserOrigin);

  // Cylinder of unit length 1m extending along -Z from laserOrigin!
  const laserGeo = new THREE.CylinderGeometry(0.0065, 0.0065, 1.0, 6);
  laserGeo.rotateX(Math.PI / 2);
  laserGeo.translate(0, 0, -0.5);
  const dotGeo = new THREE.SphereGeometry(0.048, 8, 6);
  disposables.push(laserGeo, dotGeo);

  const laserBeamMesh = new THREE.Mesh(laserGeo, laserBeamMat);
  laserBeamMesh.visible = false;
  laserOrigin.add(laserBeamMesh);

  const laserDotMesh = new THREE.Mesh(dotGeo, laserDotMat);
  laserDotMesh.visible = false;
  laserOrigin.add(laserDotMesh);

  const setLaserSight = (visible: boolean, lengthMeters: number, lockCharge = 0): void => {
    const show = visible && lengthMeters > 0.2;
    laserBeamMesh.visible = show;
    laserDotMesh.visible = show;
    if (!show) return;

    const len = Math.max(0.25, Math.min(28, lengthMeters));
    const thick = 0.85 + lockCharge * 2.15;
    laserBeamMesh.scale.set(thick, thick, len);
    laserDotMesh.position.set(0, 0, -len + 0.04);
    laserDotMesh.scale.setScalar(0.8 + lockCharge * 1.15);

    // Shift color from tactical crimson tracking beam -> blazing molten white-amber when rail-locked!
    if (lockCharge > 0.65) {
      laserBeamMat.color.setHex(0xffb830);
      laserBeamMat.opacity = 0.78 + Math.sin(lockCharge * 42) * 0.2;
    } else {
      laserBeamMat.color.setHex(0xff2644);
      laserBeamMat.opacity = 0.48 + lockCharge * 0.35;
    }
  };

  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, 0.044, -0.75);
  rifleGroup.add(muzzlePoint);

  return { rifleGroup, muzzlePoint, laserOrigin, railGlowMat, setLaserSight };
}

/**
 * Builds BREACHER-08's sculpted anatomical limbs (`createLoftedAnatomy` + `createCurvedPanelGeometry`
 * + `createSculptedHand`), asymmetric armored breach-pauldrons, tactical holo-wristpad,
 * treaded spec-ops combat boots flush at exact y=0, and the gunsmith-grade VX-8 Vulcan Carbine!
 */
export function buildBreacherLimbsAndWeapon(
  pelvis: THREE.Group,
  torso: THREE.Group,
  mats: Floor08EnemyMaterials,
  flashArmorMat: THREE.MeshStandardMaterial
): BreacherLimbsAndWeapon {
  const disposables: Array<{ dispose: () => void }> = [];

  const tacticalOliveMat = new THREE.MeshStandardMaterial({
    color: 0x2c332d,
    roughness: 0.86,
    metalness: 0.14,
    bumpMap: mats.armorDark.bumpMap,
    bumpScale: 0.015,
  });
  const amberAccentMat = new THREE.MeshStandardMaterial({
    color: 0xc26d18,
    roughness: 0.56,
    metalness: 0.35,
  });
  const wristScreenMat = new THREE.MeshStandardMaterial({
    color: 0xffa824,
    emissive: 0xff7a12,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });
  disposables.push(tacticalOliveMat, amberAccentMat, wristScreenMat);

  // Shared sculpted anatomical upper-arm & forearm loft geometries (overlap joints cleanly!)
  const upperArmGeo = createLoftedAnatomy(
    [
      { y: 0.035, rx: 0.068, rz: 0.07, squareness: 2.2 },
      { y: -0.08, rx: 0.072, rz: 0.074, squareness: 2.25 },
      { y: -0.19, rx: 0.06, rz: 0.062, squareness: 2.2 },
      { y: -0.305, rx: 0.052, rz: 0.054, squareness: 2.15 },
    ],
    14
  );
  const forearmGeo = createLoftedAnatomy(
    [
      { y: 0.035, rx: 0.056, rz: 0.058, squareness: 2.2 },
      { y: -0.09, rx: 0.058, rz: 0.06, squareness: 2.25 },
      { y: -0.2, rx: 0.046, rz: 0.048, squareness: 2.2 },
      { y: -0.27, rx: 0.038, rz: 0.036, squareness: 2.1 },
    ],
    14
  );
  disposables.push(upperArmGeo, forearmGeo);

  const buildArm = (side: -1 | 1): BreacherArmRig => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.26, 0.43, 0);
    torso.add(shoulder);

    shoulder.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), mats.undersuit));

    // Heavy contoured spec-ops tactical ballistic pauldron
    const pauldronGeo = createCurvedPanelGeometry(
      [
        { y: -0.08, rx: 0.106, rz: 0.102, thickness: 0.018 },
        { y: 0.025, rx: 0.1, rz: 0.098, thickness: 0.02 },
        { y: 0.088, rx: 0.072, rz: 0.076, thickness: 0.018 },
      ],
      side < 0 ? Math.PI * 0.52 : -Math.PI * 0.48,
      side < 0 ? Math.PI * 1.48 : Math.PI * 0.48,
      14
    );
    disposables.push(pauldronGeo);
    const pauldron = new THREE.Mesh(pauldronGeo, side < 0 ? tacticalOliveMat : flashArmorMat);
    pauldron.castShadow = true;
    shoulder.add(pauldron);

    // Amber unit chevron stripe on outer pauldron
    const pStripe = new THREE.Mesh(createBeveledBox(0.018, 0.026, 0.095, 0.004), amberAccentMat);
    pStripe.position.set(side * 0.11, -0.02, 0);
    shoulder.add(pStripe);

    const upperArm = new THREE.Mesh(upperArmGeo, mats.undersuit);
    upperArm.castShadow = true;
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.y = -0.285;
    shoulder.add(elbow);

    // Seamless undersuit hinge + contoured curved tactical elbow armor shell
    elbow.add(new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), mats.undersuit));
    const elbowPadGeo = createCurvedPanelGeometry(
      [
        { y: -0.045, rx: 0.058, rz: 0.06, thickness: 0.014 },
        { y: 0.0, rx: 0.064, rz: 0.066, thickness: 0.016 },
        { y: 0.042, rx: 0.054, rz: 0.056, thickness: 0.014 },
      ],
      Math.PI * 0.16,
      Math.PI * 0.84,
      10
    );
    disposables.push(elbowPadGeo);
    elbow.add(new THREE.Mesh(elbowPadGeo, mats.armorSlate));

    const forearm = new THREE.Mesh(forearmGeo, mats.undersuit);
    forearm.castShadow = true;
    elbow.add(forearm);

    // Curved armored gauntlet bracer
    const bracerGeo = createCurvedPanelGeometry(
      [
        { y: -0.23, rx: 0.052, rz: 0.054, thickness: 0.015 },
        { y: -0.11, rx: 0.064, rz: 0.065, thickness: 0.016 },
        { y: -0.03, rx: 0.06, rz: 0.062, thickness: 0.015 },
      ],
      side < 0 ? Math.PI * 0.56 : -Math.PI * 0.44,
      side < 0 ? Math.PI * 1.44 : Math.PI * 0.44,
      12
    );
    disposables.push(bracerGeo);
    elbow.add(new THREE.Mesh(bracerGeo, flashArmorMat));

    // Left forearm glowing tactical rangefinder wrist-pad!
    if (side === -1) {
      const wristPad = new THREE.Mesh(createBeveledBox(0.022, 0.092, 0.052, 0.005), mats.armorDark);
      wristPad.position.set(-0.062, -0.155, -0.01);
      elbow.add(wristPad);

      const wristGlow = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.064, 0.036), wristScreenMat);
      wristGlow.position.set(-0.074, -0.155, -0.01);
      elbow.add(wristGlow);
    }

    // Articulated 5-finger tactical gloved hand!
    const hand = createSculptedHand(side, mats.undersuit, mats.armorSlate, tacticalOliveMat);
    hand.position.set(0, -0.258, 0);
    hand.rotation.y = side * -Math.PI * 0.5;
    elbow.add(hand);

    return { shoulder, elbow };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // Mount gunsmith VX-8 Vulcan Carbine inside rightArm.elbow:
  // Pistol grip (0, -0.072, 0.032) lands dead-center inside right gloved fingers (-0.008, -0.283, 0)!
  const carbine = buildVx8VulcanCarbine(mats, disposables);
  const rifleGroup = carbine.rifleGroup;
  rifleGroup.position.set(-0.008, -0.315, -0.072);
  rifleGroup.rotation.set(-Math.PI * 0.5, 0, 0.16);
  rightArm.elbow.add(rifleGroup);

  // ---------------------------------------------------------------------------
  // SCULPTED ANATOMICAL SPEC-OPS LEGS + BALLISTIC KNEEPADS + TREADED BOOTS (y=0)
  // ---------------------------------------------------------------------------
  // Pelvis y = 0.94 -> hip y = -0.04 (world 0.90) -> knee y = -0.45 (world 0.45)
  // -> boot sole exact bottom at y = -0.45 -> world y = 0.00!
  // Generous overlap around y=-0.45 / y=+0.05 prevents any joint gap even at deep -1.45 rad knee flex!
  const thighGeo = createLoftedAnatomy(
    [
      { y: 0.04, rx: 0.094, rz: 0.1, squareness: 2.25 },
      { y: -0.13, rx: 0.102, rz: 0.108, squareness: 2.3, frontScale: 1.08 },
      { y: -0.29, rx: 0.084, rz: 0.088, squareness: 2.2 },
      { y: -0.475, rx: 0.068, rz: 0.072, squareness: 2.15 },
    ],
    16
  );
  const calfGeo = createLoftedAnatomy(
    [
      { y: 0.055, rx: 0.066, rz: 0.07, squareness: 2.2 },
      { y: -0.12, rx: 0.076, rz: 0.082, squareness: 2.25, backScale: 1.15 },
      { y: -0.26, rx: 0.058, rz: 0.062, squareness: 2.15 },
      { y: -0.39, rx: 0.052, rz: 0.056, squareness: 2.1 },
    ],
    16
  );
  disposables.push(thighGeo, calfGeo);

  const buildLeg = (side: -1 | 1): BreacherLegRig => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.124, -0.04, 0);
    pelvis.add(hip);

    const thigh = new THREE.Mesh(thighGeo, tacticalOliveMat);
    thigh.castShadow = true;
    hip.add(thigh);

    // Contoured ballistic thigh armor plate + drop-leg tactical holster/sub-load on right thigh!
    const thighPlateGeo = createCurvedPanelGeometry(
      [
        { y: -0.34, rx: 0.09, rz: 0.096, thickness: 0.016 },
        { y: -0.18, rx: 0.108, rz: 0.114, thickness: 0.018 },
        { y: -0.08, rx: 0.104, rz: 0.11, thickness: 0.016 },
      ],
      side < 0 ? -Math.PI * 0.96 : -Math.PI * 0.62,
      side < 0 ? -Math.PI * 0.38 : -Math.PI * 0.04,
      12
    );
    disposables.push(thighPlateGeo);
    hip.add(new THREE.Mesh(thighPlateGeo, flashArmorMat));

    const dropRig = new THREE.Mesh(createBeveledBox(0.048, 0.15, 0.092, 0.01), mats.armorSlate);
    dropRig.position.set(side * 0.106, -0.19, 0.005);
    hip.add(dropRig);

    const knee = new THREE.Group();
    knee.position.y = -0.45;
    hip.add(knee);

    // Seamless inner knee joint sphere hidden inside thigh/calf overlap + contoured knee pad
    knee.add(new THREE.Mesh(new THREE.SphereGeometry(0.066, 12, 10), mats.undersuit));

    // Molded curved tactical knee-pad shell
    const kneePadGeo = createCurvedPanelGeometry(
      [
        { y: -0.055, rx: 0.076, rz: 0.086, thickness: 0.02 },
        { y: 0.015, rx: 0.086, rz: 0.096, thickness: 0.022 },
        { y: 0.075, rx: 0.072, rz: 0.082, thickness: 0.018 },
      ],
      -Math.PI * 0.8,
      -Math.PI * 0.2,
      10
    );
    disposables.push(kneePadGeo);
    knee.add(new THREE.Mesh(kneePadGeo, mats.armorSlate));

    const calf = new THREE.Mesh(calfGeo, mats.undersuit);
    calf.castShadow = true;
    knee.add(calf);

    // Curved armored shin greave + compact rear hydraulic ankle servo strut tucked inside calf!
    const shinGeo = createCurvedPanelGeometry(
      [
        { y: -0.34, rx: 0.06, rz: 0.066, thickness: 0.016 },
        { y: -0.18, rx: 0.078, rz: 0.084, thickness: 0.018 },
        { y: -0.06, rx: 0.08, rz: 0.086, thickness: 0.018 },
      ],
      -Math.PI * 0.86,
      -Math.PI * 0.14,
      12
    );
    disposables.push(shinGeo);
    knee.add(new THREE.Mesh(shinGeo, flashArmorMat));

    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.21, 8), mats.titaniumJoint);
    strut.position.set(0, -0.185, 0.058);
    strut.rotation.x = 0.05;
    knee.add(strut);

    // Heavy Spec-Ops Combat Boot (exact bottom at y = -0.45 -> world y = 0.00!)
    const bootUpper = new THREE.Mesh(createBeveledBox(0.104, 0.088, 0.155, 0.018), mats.armorDark);
    bootUpper.position.set(0, -0.396, 0.004);
    knee.add(bootUpper);

    const toeCap = new THREE.Mesh(createBeveledBox(0.102, 0.066, 0.125, 0.016), mats.armorSlate);
    toeCap.position.set(0, -0.415, -0.095);
    knee.add(toeCap);

    // Chunky armored boot sole lug flush at y = -0.45
    const bootSole = new THREE.Mesh(createBeveledBox(0.112, 0.028, 0.25, 0.006), mats.titaniumJoint);
    bootSole.position.set(0, -0.436, -0.032);
    knee.add(bootSole);

    return { hip, knee };
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  return {
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    rifleGroup,
    muzzlePoint: carbine.muzzlePoint,
    laserOrigin: carbine.laserOrigin,
    railGlowMat: carbine.railGlowMat,
    setLaserSight: carbine.setLaserSight,
    disposables,
  };
}
