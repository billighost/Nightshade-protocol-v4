import * as THREE from 'three';
import {
  createBeveledBox,
  createCurvedPanelGeometry,
  createLoftedAnatomy,
  createSculptedHand,
} from '../../../../core/sculptUtils';
import type { Floor08EnemyMaterials } from '../../../core/enemyMeshShared';

export interface WardenArmRig {
  shoulder: THREE.Group;
  elbow: THREE.Group;
  handMount: THREE.Group;
}

export interface WardenLegRig {
  hip: THREE.Group;
  knee: THREE.Group;
}

export interface WardenLimbsAndSmgs {
  leftLeg: WardenLegRig;
  rightLeg: WardenLegRig;
  leftArm: WardenArmRig;
  rightArm: WardenArmRig;
  smgLeft: THREE.Group;
  smgRight: THREE.Group;
  muzzleLeft: THREE.Object3D;
  muzzleRight: THREE.Object3D;
  coilMatLeft: THREE.MeshStandardMaterial;
  coilMatRight: THREE.MeshStandardMaterial;
  disposables: Array<{ dispose: () => void }>;
}

/**
 * Builds a Gunsmith-Grade VX-9 "SPECTRE-VECTOR" Akimbo Plasma SMG (14+ precision parts):
 * - Signature Kriss-Vector angled lower recoil-mitigation housing + vented upper shroud
 * - Brushed champagne-gold top Picatinny rail & glowing solar-amber twin plasma accelerator rails
 * - Angled 45-round extended magazine with amber charge indicator
 * - Compact micro-reflex sight + fluted rectangular CQB tactical suppressor
 * - Pistol grip centered at (0, -0.068, 0.032) so 5-finger armored gauntlet grips DEAD-CENTER!
 */
function buildVx9VectorSmg(
  mats: Floor08EnemyMaterials,
  champagneGoldMat: THREE.MeshStandardMaterial,
  ivoryCerakoteMat: THREE.MeshStandardMaterial,
  disposables: Array<{ dispose: () => void }>
): {
  smgGroup: THREE.Group;
  muzzlePoint: THREE.Object3D;
  coilMat: THREE.MeshStandardMaterial;
} {
  const smgGroup = new THREE.Group();

  const gunmetalMat = new THREE.MeshStandardMaterial({
    color: 0x222733,
    roughness: 0.44,
    metalness: 0.72,
    bumpMap: mats.armorDark.bumpMap,
    bumpScale: 0.008,
  });
  const polymerMat = new THREE.MeshStandardMaterial({
    color: 0x12151c,
    roughness: 0.82,
    metalness: 0.16,
  });
  const coilMat = new THREE.MeshStandardMaterial({
    color: 0xffe494,
    emissive: 0xffa818,
    emissiveIntensity: 2.8,
    roughness: 0.14,
    metalness: 0.2,
  });
  disposables.push(gunmetalMat, polymerMat, coilMat);

  // 1. Sleek Upper Receiver + Ivory-Cerakote Side Accent Cheek
  const upper = new THREE.Mesh(createBeveledBox(0.058, 0.068, 0.3, 0.009), gunmetalMat);
  upper.position.set(0, 0.044, -0.072);
  upper.castShadow = true;
  smgGroup.add(upper);

  const ivoryPlate = new THREE.Mesh(createBeveledBox(0.062, 0.028, 0.16, 0.005), ivoryCerakoteMat);
  ivoryPlate.position.set(0, 0.05, -0.04);
  smgGroup.add(ivoryPlate);

  // 2. Signature Kriss-Vector Angled Lower Recoil Housing
  const vectorLower = new THREE.Mesh(createBeveledBox(0.052, 0.105, 0.135, 0.008), polymerMat);
  vectorLower.position.set(0, -0.024, -0.142);
  vectorLower.rotation.x = 0.22;
  smgGroup.add(vectorLower);

  // 3. Brushed Champagne-Gold Top Rail + Compact Holographic Micro-Reflex Optic
  const topRail = new THREE.Mesh(createBeveledBox(0.032, 0.015, 0.28, 0.003), champagneGoldMat);
  topRail.position.set(0, 0.084, -0.082);
  smgGroup.add(topRail);

  const opticHood = new THREE.Mesh(createBeveledBox(0.042, 0.04, 0.072, 0.006), polymerMat);
  opticHood.position.set(0, 0.11, -0.045);
  smgGroup.add(opticHood);

  const opticLens = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.022, 0.008), coilMat);
  opticLens.position.set(0, 0.11, -0.082);
  smgGroup.add(opticLens);

  // 4. Compact Rear Folding Brace Cap (clean CQB silhouette for akimbo firing)
  const rearCap = new THREE.Mesh(createBeveledBox(0.048, 0.064, 0.058, 0.008), gunmetalMat);
  rearCap.position.set(0, 0.038, 0.098);
  smgGroup.add(rearCap);

  // 5. Ergonomic Pistol Grip (dead-center at 0, -0.068, 0.032) + Trigger Guard
  const grip = new THREE.Mesh(createBeveledBox(0.036, 0.108, 0.048, 0.008), polymerMat);
  grip.position.set(0, -0.068, 0.032);
  grip.rotation.x = -0.22;
  smgGroup.add(grip);

  const triggerGuard = new THREE.Mesh(createBeveledBox(0.022, 0.012, 0.068, 0.003), gunmetalMat);
  triggerGuard.position.set(0, -0.046, -0.02);
  smgGroup.add(triggerGuard);

  // 6. Signature Angled 45-Round Extended Magazine with Amber Charge Strip
  const extMag = new THREE.Mesh(createBeveledBox(0.034, 0.21, 0.046, 0.006), polymerMat);
  extMag.position.set(0, -0.14, -0.158);
  extMag.rotation.x = 0.26;
  smgGroup.add(extMag);

  const magBase = new THREE.Mesh(createBeveledBox(0.04, 0.024, 0.054, 0.005), champagneGoldMat);
  magBase.position.set(0, -0.242, -0.185);
  magBase.rotation.x = 0.26;
  smgGroup.add(magBase);

  // 7. Twin Side Solar-Amber Plasma Accelerator Strips + Fluted Rectangular Tactical Suppressor
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.014, 0.195), coilMat);
    strip.position.set(side * 0.032, 0.032, -0.155);
    smgGroup.add(strip);
  }

  const suppressor = new THREE.Mesh(createBeveledBox(0.044, 0.052, 0.185, 0.009), mats.titaniumJoint);
  suppressor.position.set(0, 0.024, -0.312);
  suppressor.castShadow = true;
  smgGroup.add(suppressor);

  const muzzleRing = new THREE.Mesh(createBeveledBox(0.048, 0.056, 0.016, 0.004), champagneGoldMat);
  muzzleRing.position.set(0, 0.024, -0.396);
  smgGroup.add(muzzleRing);

  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, 0.024, -0.42);
  smgGroup.add(muzzlePoint);

  return { smgGroup, muzzlePoint, coilMat };
}

/**
 * Builds WARDEN-08 "SABLE"'s bespoke tall athletic limbs (sculpted layered pauldrons,
 * seamless overlapping joints, 5-finger armored gauntlets, sleek armored shins,
 * tactical combat boots planted at exact y=0.00) and Dual Akimbo VX-9 Vector Plasma SMGs!
 */
export function buildWardenLimbsAndSmgs(
  pelvis: THREE.Group,
  torso: THREE.Group,
  mats: Floor08EnemyMaterials,
  flashArmorMat: THREE.MeshStandardMaterial
): WardenLimbsAndSmgs {
  const disposables: Array<{ dispose: () => void }> = [];

  const obsidianCarbonMat = new THREE.MeshStandardMaterial({
    color: 0x1b1e28,
    roughness: 0.64,
    metalness: 0.34,
    bumpMap: mats.armorDark.bumpMap,
    bumpScale: 0.012,
  });
  const champagneGoldMat = new THREE.MeshStandardMaterial({
    color: 0xdca536,
    roughness: 0.28,
    metalness: 0.82,
  });
  const ivoryCerakoteMat = new THREE.MeshStandardMaterial({
    color: 0xcbd2dc,
    roughness: 0.44,
    metalness: 0.28,
  });
  disposables.push(obsidianCarbonMat, champagneGoldMat, ivoryCerakoteMat);

  // ---------------------------------------------------------------------------
  // 1. SLEEK ATHLETIC ARMS + LAYERED COMMANDER PAULDRONS + 5-FINGER GAUNTLETS
  // ---------------------------------------------------------------------------
  const upperArmGeo = createLoftedAnatomy(
    [
      { y: 0.04, rx: 0.072, rz: 0.074, squareness: 2.3 },
      { y: -0.09, rx: 0.078, rz: 0.08, squareness: 2.35 },
      { y: -0.22, rx: 0.068, rz: 0.07, squareness: 2.25 },
      { y: -0.34, rx: 0.06, rz: 0.062, squareness: 2.2 },
    ],
    14
  );
  const forearmGeo = createLoftedAnatomy(
    [
      { y: 0.045, rx: 0.062, rz: 0.064, squareness: 2.25 },
      { y: -0.1, rx: 0.066, rz: 0.068, squareness: 2.3 },
      { y: -0.22, rx: 0.052, rz: 0.054, squareness: 2.2 },
      { y: -0.295, rx: 0.044, rz: 0.042, squareness: 2.1 },
    ],
    14
  );
  disposables.push(upperArmGeo, forearmGeo);

  const buildArm = (side: -1 | 1): WardenArmRig => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.258, 0.455, 0);
    torso.add(shoulder);

    shoulder.add(new THREE.Mesh(new THREE.SphereGeometry(0.072, 12, 10), mats.undersuit));

    // Swept Asymmetric Commander Pauldron (obsidian carbon + champagne gold trim + ivory chevron)
    const pauldronGeo = createCurvedPanelGeometry(
      [
        { y: -0.13, rx: 0.112, rz: 0.106, thickness: 0.02 },
        { y: 0.01, rx: 0.108, rz: 0.104, thickness: 0.022 },
        { y: 0.1, rx: 0.076, rz: 0.078, thickness: 0.018 },
      ],
      side < 0 ? Math.PI * 0.46 : -Math.PI * 0.54,
      side < 0 ? Math.PI * 1.54 : Math.PI * 0.54,
      14
    );
    disposables.push(pauldronGeo);
    const pauldron = new THREE.Mesh(pauldronGeo, flashArmorMat);
    pauldron.castShadow = true;
    shoulder.add(pauldron);

    const pGold = new THREE.Mesh(createBeveledBox(0.018, 0.026, 0.118, 0.004), champagneGoldMat);
    pGold.position.set(side * 0.114, -0.032, 0);
    shoulder.add(pGold);

    const pIvory = new THREE.Mesh(createBeveledBox(0.016, 0.052, 0.088, 0.004), ivoryCerakoteMat);
    pIvory.position.set(side * 0.106, 0.028, 0);
    shoulder.add(pIvory);

    const upperArm = new THREE.Mesh(upperArmGeo, mats.undersuit);
    upperArm.castShadow = true;
    shoulder.add(upperArm);

    // Sculpted armored bicep sleeve plate bridging pauldron cleanly to elbow!
    const bicepPlateGeo = createCurvedPanelGeometry(
      [
        { y: -0.275, rx: 0.07, rz: 0.072, thickness: 0.014 },
        { y: -0.18, rx: 0.078, rz: 0.08, thickness: 0.016 },
        { y: -0.105, rx: 0.082, rz: 0.084, thickness: 0.015 },
      ],
      side < 0 ? Math.PI * 0.45 : -Math.PI * 0.55,
      side < 0 ? Math.PI * 1.55 : Math.PI * 0.55,
      12
    );
    disposables.push(bicepPlateGeo);
    shoulder.add(new THREE.Mesh(bicepPlateGeo, obsidianCarbonMat));

    const elbow = new THREE.Group();
    elbow.position.y = -0.32;
    shoulder.add(elbow);

    elbow.add(new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 10), mats.undersuit));

    // Full-wrap sculpted armored elbow cop (eliminates any visible joint seam from front or rear!)
    const elbowCapGeo = createCurvedPanelGeometry(
      [
        { y: -0.058, rx: 0.066, rz: 0.068, thickness: 0.016 },
        { y: 0.0, rx: 0.074, rz: 0.076, thickness: 0.018 },
        { y: 0.054, rx: 0.064, rz: 0.066, thickness: 0.016 },
      ],
      -Math.PI * 0.12,
      Math.PI * 1.12,
      14
    );
    disposables.push(elbowCapGeo);
    elbow.add(new THREE.Mesh(elbowCapGeo, obsidianCarbonMat));

    const elbowBolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 0.148, 8),
      champagneGoldMat
    );
    elbowBolt.rotation.z = Math.PI / 2;
    elbow.add(elbowBolt);

    const forearm = new THREE.Mesh(forearmGeo, mats.undersuit);
    forearm.castShadow = true;
    elbow.add(forearm);

    // Sleek Gun-Kata Forearm Bracer with Gold Trim Band
    const bracerGeo = createCurvedPanelGeometry(
      [
        { y: -0.25, rx: 0.056, rz: 0.058, thickness: 0.016 },
        { y: -0.125, rx: 0.07, rz: 0.072, thickness: 0.018 },
        { y: -0.02, rx: 0.068, rz: 0.07, thickness: 0.016 },
      ],
      side < 0 ? Math.PI * 0.5 : -Math.PI * 0.5,
      side < 0 ? Math.PI * 1.5 : Math.PI * 0.5,
      12
    );
    disposables.push(bracerGeo);
    elbow.add(new THREE.Mesh(bracerGeo, flashArmorMat));

    const cuffGold = new THREE.Mesh(
      new THREE.TorusGeometry(0.054, 0.008, 6, 14),
      champagneGoldMat
    );
    cuffGold.rotation.x = Math.PI / 2;
    cuffGold.position.y = -0.238;
    elbow.add(cuffGold);

    // Articulated 5-finger sculpted spec-ops combat glove
    const hand = createSculptedHand(side, mats.undersuit, obsidianCarbonMat, champagneGoldMat);
    hand.scale.setScalar(1.04);
    hand.position.set(0, -0.285, 0);
    hand.rotation.y = side * -Math.PI * 0.5;
    elbow.add(hand);

    const handMount = new THREE.Group();
    handMount.position.set(0, -0.285, 0);
    elbow.add(handMount);

    return { shoulder, elbow, handMount };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // Mount BOTH Gunsmith VX-9 Vector Plasma SMGs cleanly inside leftArm.elbow & rightArm.elbow!
  // Exact math: grip (0, -0.068, 0.032) -> rotated -PI/2 X -> (0, +0.032, +0.068)
  // Positioned at (0, -0.317, -0.068) -> grip sits DEAD CENTER at (0, -0.285, 0) inside each 5-finger glove!
  const vxLeft = buildVx9VectorSmg(mats, champagneGoldMat, ivoryCerakoteMat, disposables);
  vxLeft.smgGroup.position.set(0, -0.317, -0.068);
  vxLeft.smgGroup.rotation.set(-Math.PI * 0.5, 0, 0);
  leftArm.elbow.add(vxLeft.smgGroup);

  const vxRight = buildVx9VectorSmg(mats, champagneGoldMat, ivoryCerakoteMat, disposables);
  vxRight.smgGroup.position.set(0, -0.317, -0.068);
  vxRight.smgGroup.rotation.set(-Math.PI * 0.5, 0, 0);
  rightArm.elbow.add(vxRight.smgGroup);

  // ---------------------------------------------------------------------------
  // 2. TALL ATHLETIC SPEC-OPS LEGS + ARMORED KNEE GUARDS + BOOTS AT EXACT y=0.00
  // ---------------------------------------------------------------------------
  // Pelvis y = 1.02 -> hip y = -0.04 (0.98) -> knee y = -0.49 (0.49) -> boot sole bottom at -0.49 (y = 0.00!)
  const thighGeo = createLoftedAnatomy(
    [
      { y: 0.045, rx: 0.094, rz: 0.1, squareness: 2.3 },
      { y: -0.15, rx: 0.102, rz: 0.108, squareness: 2.35, frontScale: 1.06 },
      { y: -0.33, rx: 0.084, rz: 0.088, squareness: 2.25 },
      { y: -0.52, rx: 0.068, rz: 0.072, squareness: 2.2 },
    ],
    16
  );
  const calfGeo = createLoftedAnatomy(
    [
      { y: 0.06, rx: 0.068, rz: 0.072, squareness: 2.25 },
      { y: -0.14, rx: 0.076, rz: 0.082, squareness: 2.3, backScale: 1.14 },
      { y: -0.3, rx: 0.06, rz: 0.064, squareness: 2.2 },
      { y: -0.42, rx: 0.054, rz: 0.058, squareness: 2.15 },
    ],
    16
  );
  disposables.push(thighGeo, calfGeo);

  const buildLeg = (side: -1 | 1): WardenLegRig => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.132, -0.04, 0);
    pelvis.add(hip);

    const thigh = new THREE.Mesh(thighGeo, obsidianCarbonMat);
    thigh.castShadow = true;
    hip.add(thigh);

    // Sculpted outer-front ballistic thigh plate + snug dual drop-leg holster straps & mag rig
    const thighPlateGeo = createCurvedPanelGeometry(
      [
        { y: -0.36, rx: 0.094, rz: 0.1, thickness: 0.018 },
        { y: -0.19, rx: 0.108, rz: 0.114, thickness: 0.02 },
        { y: -0.08, rx: 0.104, rz: 0.11, thickness: 0.018 },
      ],
      side < 0 ? -Math.PI * 0.96 : -Math.PI * 0.62,
      side < 0 ? -Math.PI * 0.38 : -Math.PI * 0.04,
      12
    );
    disposables.push(thighPlateGeo);
    hip.add(new THREE.Mesh(thighPlateGeo, flashArmorMat));

    // Snug elliptical drop-leg harness bands hugging thigh flush (ZERO floating gap!)
    for (const [sy, rScale] of [
      [-0.175, 0.96],
      [-0.255, 0.89],
    ] as const) {
      const strap = new THREE.Mesh(
        new THREE.TorusGeometry(0.098 * rScale, 0.007, 6, 16),
        obsidianCarbonMat
      );
      strap.rotation.x = Math.PI / 2;
      strap.scale.set(0.96, 1.04, 1.0);
      strap.position.y = sy;
      hip.add(strap);
    }

    // Flush outer-thigh quick-draw mag/holster dock with champagne-gold latch
    const thighDock = new THREE.Mesh(
      createBeveledBox(0.032, 0.125, 0.072, 0.007),
      obsidianCarbonMat
    );
    thighDock.position.set(side * 0.098, -0.215, 0.006);
    hip.add(thighDock);

    const dockLatch = new THREE.Mesh(
      createBeveledBox(0.036, 0.024, 0.056, 0.004),
      champagneGoldMat
    );
    dockLatch.position.set(side * 0.102, -0.188, 0.006);
    hip.add(dockLatch);

    const knee = new THREE.Group();
    knee.position.y = -0.49;
    hip.add(knee);

    knee.add(new THREE.Mesh(new THREE.SphereGeometry(0.066, 12, 10), mats.undersuit));

    // Angled Ivory-and-Obsidian Spec-Ops Knee Guard
    const kneeGuardGeo = createCurvedPanelGeometry(
      [
        { y: -0.06, rx: 0.078, rz: 0.086, thickness: 0.02 },
        { y: 0.012, rx: 0.09, rz: 0.098, thickness: 0.024 },
        { y: 0.075, rx: 0.074, rz: 0.082, thickness: 0.018 },
      ],
      -Math.PI * 0.84,
      -Math.PI * 0.16,
      12
    );
    disposables.push(kneeGuardGeo);
    knee.add(new THREE.Mesh(kneeGuardGeo, ivoryCerakoteMat));

    const calf = new THREE.Mesh(calfGeo, mats.undersuit);
    calf.castShadow = true;
    knee.add(calf);

    // Sculpted greave shin guard with gold commander strip
    const shinGeo = createCurvedPanelGeometry(
      [
        { y: -0.37, rx: 0.064, rz: 0.07, thickness: 0.018 },
        { y: -0.2, rx: 0.08, rz: 0.086, thickness: 0.02 },
        { y: -0.06, rx: 0.082, rz: 0.088, thickness: 0.018 },
      ],
      -Math.PI * 0.86,
      -Math.PI * 0.14,
      12
    );
    disposables.push(shinGeo);
    knee.add(new THREE.Mesh(shinGeo, flashArmorMat));

    const shinGold = new THREE.Mesh(createBeveledBox(0.022, 0.24, 0.016, 0.004), champagneGoldMat);
    shinGold.position.set(0, -0.21, -0.092);
    knee.add(shinGold);

    // Sleek Spec-Ops Agile Combat Boot (exact sole bottom at y = -0.49 -> world y = 0.00!)
    const bootUpper = new THREE.Mesh(
      createBeveledBox(0.112, 0.096, 0.168, 0.02),
      obsidianCarbonMat
    );
    bootUpper.position.set(0, -0.422, 0.005);
    knee.add(bootUpper);

    const toeCap = new THREE.Mesh(createBeveledBox(0.106, 0.068, 0.132, 0.016), flashArmorMat);
    toeCap.position.set(0, -0.442, -0.098);
    knee.add(toeCap);

    const bootSole = new THREE.Mesh(
      createBeveledBox(0.122, 0.036, 0.268, 0.007),
      mats.titaniumJoint
    );
    bootSole.position.set(0, -0.472, -0.032);
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
    smgLeft: vxLeft.smgGroup,
    smgRight: vxRight.smgGroup,
    muzzleLeft: vxLeft.muzzlePoint,
    muzzleRight: vxRight.muzzlePoint,
    coilMatLeft: vxLeft.coilMat,
    coilMatRight: vxRight.coilMat,
    disposables,
  };
}
