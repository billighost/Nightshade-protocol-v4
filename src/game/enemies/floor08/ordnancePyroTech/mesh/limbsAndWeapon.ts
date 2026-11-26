import * as THREE from 'three';
import {
  createBeveledBox,
  createCurvedPanelGeometry,
  createLoftedAnatomy,
  createSculptedHand,
} from '../../../../core/sculptUtils';
import type { Floor08EnemyMaterials } from '../../../core/enemyMeshShared';

export interface PyroArmRig {
  shoulder: THREE.Group;
  elbow: THREE.Group;
  handMount: THREE.Group;
}

export interface PyroLegRig {
  hip: THREE.Group;
  knee: THREE.Group;
}

export interface PyroLimbsAndCannon {
  leftLeg: PyroLegRig;
  rightLeg: PyroLegRig;
  leftArm: PyroArmRig;
  rightArm: PyroArmRig;
  cannon: THREE.Group;
  drumCyl: THREE.Group;
  muzzlePoint: THREE.Object3D;
  barrelGlowMat: THREE.MeshStandardMaterial;
  setPilotAndBarrelHeat: (heat: number, elapsed: number) => void;
  disposables: Array<{ dispose: () => void }>;
}

/**
 * Builds the Gunsmith 18-Part "VULCAN-8" HEAVY THERMITE MORTAR-FLAMER CANNON:
 * - Revolving 6-chamber 40mm incendiary drum magazine with glowing orange shell chambers
 * - Heavy perforated industrial thermal barrel shroud + incandescent molten inner bore
 * - Live flickering under-barrel pilot-light flame cone!
 * - Side pressurized igniter bottle, top steel carry handle, forward angled foregrip
 * - Pistol grip seated at exact (0, -0.072, 0.055) so when mounted at (0, -0.345, -0.072)
 *   rotated -PI/2 X inside rightArm.elbow, the right 5-finger gauntlet grips DEAD-CENTER!
 */
function buildVulcanThermiteCannon(
  mats: Floor08EnemyMaterials,
  flashArmorMat: THREE.MeshStandardMaterial,
  charcoalSteelMat: THREE.MeshStandardMaterial,
  hazardYellowMat: THREE.MeshStandardMaterial,
  brassValveMat: THREE.MeshStandardMaterial,
  disposables: Array<{ dispose: () => void }>
): {
  cannon: THREE.Group;
  drumCyl: THREE.Group;
  muzzlePoint: THREE.Object3D;
  barrelGlowMat: THREE.MeshStandardMaterial;
  setPilotAndBarrelHeat: (heat: number, elapsed: number) => void;
} {
  const cannon = new THREE.Group();

  const gunmetalMat = new THREE.MeshStandardMaterial({
    color: 0x262a33,
    roughness: 0.46,
    metalness: 0.68,
    bumpMap: mats.armorDark.bumpMap,
    bumpScale: 0.01,
  });
  const barrelGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffd088,
    emissive: 0xff5a12,
    emissiveIntensity: 2.2,
    roughness: 0.2,
    metalness: 0.25,
  });
  const pilotCoreMat = new THREE.MeshBasicMaterial({
    color: 0xfff6d4,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const pilotOuterMat = new THREE.MeshBasicMaterial({
    color: 0xff6a14,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  disposables.push(gunmetalMat, barrelGlowMat, pilotCoreMat, pilotOuterMat);

  // 1. Heavy Industrial Main Receiver Chassis + Orange Ceramic Heat-Shield Cowl
  const receiver = new THREE.Mesh(createBeveledBox(0.11, 0.135, 0.46, 0.016), gunmetalMat);
  receiver.position.set(0, 0.045, -0.14);
  receiver.castShadow = true;
  cannon.add(receiver);

  const heatShield = new THREE.Mesh(createBeveledBox(0.122, 0.068, 0.34, 0.012), flashArmorMat);
  heatShield.position.set(0, 0.088, -0.2);
  cannon.add(heatShield);

  const hazardTrim = new THREE.Mesh(createBeveledBox(0.126, 0.022, 0.14, 0.004), hazardYellowMat);
  hazardTrim.position.set(0, 0.09, -0.1);
  cannon.add(hazardTrim);

  // 2. Heavy Top Steel Carry-Rail Handle (iconic heavy-ordnance silhouette!)
  const handleTop = new THREE.Mesh(createBeveledBox(0.034, 0.026, 0.28, 0.006), charcoalSteelMat);
  handleTop.position.set(0, 0.182, -0.16);
  cannon.add(handleTop);
  for (const hz of [-0.04, -0.28]) {
    const post = new THREE.Mesh(createBeveledBox(0.032, 0.072, 0.032, 0.005), charcoalSteelMat);
    post.position.set(0, 0.145, hz);
    cannon.add(post);
  }

  // 3. Massive Revolving 6-Chamber 40mm Incendiary Mortar Drum Magazine!
  const drumCyl = new THREE.Group();
  drumCyl.position.set(0, -0.055, -0.165);
  cannon.add(drumCyl);

  const drumBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.106, 0.106, 0.155, 16),
    charcoalSteelMat
  );
  drumBody.rotation.x = Math.PI / 2;
  drumBody.castShadow = true;
  drumCyl.add(drumBody);

  const drumRingF = new THREE.Mesh(
    new THREE.TorusGeometry(0.106, 0.012, 6, 16),
    brassValveMat
  );
  drumRingF.position.z = -0.074;
  drumCyl.add(drumRingF);

  const drumRingB = new THREE.Mesh(
    new THREE.TorusGeometry(0.106, 0.012, 6, 16),
    brassValveMat
  );
  drumRingB.position.z = 0.074;
  drumCyl.add(drumRingB);

  // 6 Recessed Glowing 40mm Thermite Shells inside the revolving drum!
  for (let s = 0; s < 6; s++) {
    const ang = (s / 6) * Math.PI * 2;
    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.164, 8),
      barrelGlowMat
    );
    shell.rotation.x = Math.PI / 2;
    shell.position.set(Math.cos(ang) * 0.068, Math.sin(ang) * 0.068, 0);
    drumCyl.add(shell);
  }

  // 4. Wide-Bore Perforated Thermal Mortar Barrel + Glowing Inner Furnace Core + Flared Muzzle Brake
  const outerBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.056, 0.062, 0.44, 14),
    gunmetalMat
  );
  outerBarrel.rotation.x = Math.PI / 2;
  outerBarrel.position.set(0, 0.052, -0.56);
  outerBarrel.castShadow = true;
  cannon.add(outerBarrel);

  // Twin cooling jacket collars + incandescent vent slots along barrel
  for (const bz of [-0.44, -0.56, -0.68]) {
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.066, 0.066, 0.026, 14),
      charcoalSteelMat
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.052, bz);
    cannon.add(collar);
  }

  for (const side of [-1, 1]) {
    const ventGlow = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.022, 0.28), barrelGlowMat);
    ventGlow.position.set(side * 0.054, 0.052, -0.56);
    cannon.add(ventGlow);
  }

  // Heavy flared industrial muzzle brake + glowing bore cavity
  const muzzleBrake = new THREE.Mesh(
    new THREE.CylinderGeometry(0.074, 0.058, 0.11, 14),
    charcoalSteelMat
  );
  muzzleBrake.rotation.x = Math.PI / 2;
  muzzleBrake.position.set(0, 0.052, -0.81);
  cannon.add(muzzleBrake);

  const boreCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.044, 0.044, 0.024, 12),
    barrelGlowMat
  );
  boreCore.rotation.x = Math.PI / 2;
  boreCore.position.set(0, 0.052, -0.86);
  cannon.add(boreCore);

  // 5. Underslung Ignition Tube + Live Flickering Pilot-Light Flame Cone!
  const igniterTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, 0.38, 8),
    brassValveMat
  );
  igniterTube.rotation.x = Math.PI / 2;
  igniterTube.position.set(0, -0.025, -0.62);
  cannon.add(igniterTube);

  const pilotGroup = new THREE.Group();
  pilotGroup.position.set(0, -0.025, -0.825);
  cannon.add(pilotGroup);

  const pilotOuterGeo = new THREE.ConeGeometry(0.042, 0.18, 8, 1, true);
  pilotOuterGeo.rotateX(Math.PI * 0.12);
  pilotOuterGeo.translate(0, 0.06, -0.04);
  const pilotCoreGeo = new THREE.ConeGeometry(0.022, 0.11, 8, 1, true);
  pilotCoreGeo.rotateX(Math.PI * 0.12);
  pilotCoreGeo.translate(0, 0.04, -0.025);
  disposables.push(pilotOuterGeo, pilotCoreGeo);

  const pilotOuter = new THREE.Mesh(pilotOuterGeo, pilotOuterMat);
  const pilotCore = new THREE.Mesh(pilotCoreGeo, pilotCoreMat);
  pilotGroup.add(pilotOuter, pilotCore);

  // 6. Side-Mounted Pressurized Red Igniter Canister on right receiver flank
  const sideTank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.036, 0.24, 10),
    flashArmorMat
  );
  sideTank.rotation.x = Math.PI / 2;
  sideTank.position.set(0.088, 0.02, -0.26);
  cannon.add(sideTank);

  // 7. Rear Stock Buffer + Ergonomic Pistol Grip (dead-center at 0, -0.072, 0.055!) + Forward Foregrip
  const rearStock = new THREE.Mesh(createBeveledBox(0.078, 0.11, 0.16, 0.014), charcoalSteelMat);
  rearStock.position.set(0, 0.036, 0.145);
  cannon.add(rearStock);

  const grip = new THREE.Mesh(createBeveledBox(0.042, 0.118, 0.054, 0.009), charcoalSteelMat);
  grip.position.set(0, -0.072, 0.055);
  grip.rotation.x = -0.2;
  cannon.add(grip);

  const triggerGuard = new THREE.Mesh(createBeveledBox(0.028, 0.014, 0.075, 0.003), gunmetalMat);
  triggerGuard.position.set(0, -0.048, -0.005);
  cannon.add(triggerGuard);

  // Left-side heavy support foregrip + receiver bracket for exact two-handed cannon cradle
  const foreGripBracket = new THREE.Mesh(
    createBeveledBox(0.072, 0.032, 0.044, 0.006),
    gunmetalMat
  );
  foreGripBracket.position.set(-0.088, -0.022, -0.125);
  cannon.add(foreGripBracket);

  const foreGrip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.024, 0.138, 10),
    charcoalSteelMat
  );
  foreGrip.position.set(-0.132, -0.024, -0.125);
  foreGrip.rotation.z = 0.28;
  cannon.add(foreGrip);

  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, 0.052, -0.9);
  cannon.add(muzzlePoint);

  const setPilotAndBarrelHeat = (heat: number, elapsed: number): void => {
    const flicker = 0.84 + Math.sin(elapsed * 46) * 0.16 + Math.cos(elapsed * 73) * 0.08;
    const scaleY = (0.78 + heat * 0.85) * flicker;
    const scaleXZ = (0.82 + heat * 0.45) * (0.92 + Math.sin(elapsed * 38) * 0.08);
    pilotOuter.scale.set(scaleXZ, scaleY, scaleXZ);
    pilotCore.scale.set(scaleXZ * 0.88, scaleY * 0.92, scaleXZ * 0.88);
    pilotOuterMat.opacity = Math.min(0.92, 0.56 + heat * 0.34);
    barrelGlowMat.emissiveIntensity = 1.85 + heat * 3.2 + Math.sin(elapsed * 18) * 0.25;
  };

  return { cannon, drumCyl, muzzlePoint, barrelGlowMat, setPilotAndBarrelHeat };
}

/**
 * Builds FORGE-08 "PYRO-TECH"'s heavy armored EOD limbs (massive hazard-orange rounded pauldrons,
 * full-wrap bicep/elbow armor with zero joint gaps, heat-resistant 5-finger gauntlets,
 * reinforced blast-greaves & weighted steel-toe boots planted at exact y=0.00) and the
 * two-handed "VULCAN-8" Heavy Thermite Mortar-Flamer Cannon!
 */
export function buildPyroLimbsAndCannon(
  pelvis: THREE.Group,
  torso: THREE.Group,
  mats: Floor08EnemyMaterials,
  flashArmorMat: THREE.MeshStandardMaterial
): PyroLimbsAndCannon {
  const disposables: Array<{ dispose: () => void }> = [];

  const charcoalSteelMat = new THREE.MeshStandardMaterial({
    color: 0x22262e,
    roughness: 0.62,
    metalness: 0.44,
    bumpMap: mats.armorDark.bumpMap,
    bumpScale: 0.014,
  });
  const nomexAshMat = new THREE.MeshStandardMaterial({
    color: 0x525864,
    roughness: 0.84,
    metalness: 0.14,
    bumpMap: mats.undersuit.bumpMap,
    bumpScale: 0.016,
  });
  const hazardYellowMat = new THREE.MeshStandardMaterial({
    color: 0xe6a622,
    roughness: 0.42,
    metalness: 0.34,
  });
  const brassValveMat = new THREE.MeshStandardMaterial({
    color: 0xc28a32,
    roughness: 0.34,
    metalness: 0.78,
  });
  disposables.push(charcoalSteelMat, nomexAshMat, hazardYellowMat, brassValveMat);

  // ---------------------------------------------------------------------------
  // 1. HEAVY EOD ARMS + OVERSIZED ROUNDED BLAST PAULDRONS + 5-FINGER GAUNTLETS
  // ---------------------------------------------------------------------------
  const upperArmGeo = createLoftedAnatomy(
    [
      { y: 0.045, rx: 0.082, rz: 0.084, squareness: 2.3 },
      { y: -0.095, rx: 0.09, rz: 0.092, squareness: 2.35 },
      { y: -0.225, rx: 0.078, rz: 0.08, squareness: 2.25 },
      { y: -0.35, rx: 0.07, rz: 0.072, squareness: 2.2 },
    ],
    14
  );
  const forearmGeo = createLoftedAnatomy(
    [
      { y: 0.05, rx: 0.072, rz: 0.074, squareness: 2.25 },
      { y: -0.1, rx: 0.08, rz: 0.082, squareness: 2.35 },
      { y: -0.22, rx: 0.064, rz: 0.066, squareness: 2.2 },
      { y: -0.3, rx: 0.052, rz: 0.05, squareness: 2.15 },
    ],
    14
  );
  disposables.push(upperArmGeo, forearmGeo);

  const buildArm = (side: -1 | 1): PyroArmRig => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.295, 0.46, 0);
    torso.add(shoulder);

    shoulder.add(new THREE.Mesh(new THREE.SphereGeometry(0.082, 12, 10), nomexAshMat));

    // Heavy Rounded EOD Hazard-Orange Dome Pauldron + Charcoal Edge Trim + Hazard Strip
    const pauldronGeo = createCurvedPanelGeometry(
      [
        { y: -0.15, rx: 0.132, rz: 0.126, thickness: 0.026 },
        { y: 0.01, rx: 0.128, rz: 0.124, thickness: 0.028 },
        { y: 0.118, rx: 0.09, rz: 0.092, thickness: 0.024 },
      ],
      side < 0 ? Math.PI * 0.42 : -Math.PI * 0.58,
      side < 0 ? Math.PI * 1.58 : Math.PI * 0.58,
      14
    );
    disposables.push(pauldronGeo);
    const pauldron = new THREE.Mesh(pauldronGeo, flashArmorMat);
    pauldron.castShadow = true;
    shoulder.add(pauldron);

    const pStripe = new THREE.Mesh(
      createBeveledBox(0.022, 0.032, 0.135, 0.004),
      hazardYellowMat
    );
    pStripe.position.set(side * 0.134, -0.04, 0);
    shoulder.add(pStripe);

    const pGuard = new THREE.Mesh(
      createBeveledBox(0.02, 0.044, 0.142, 0.005),
      charcoalSteelMat
    );
    pGuard.position.set(side * 0.132, -0.11, 0);
    shoulder.add(pGuard);

    const upperArm = new THREE.Mesh(upperArmGeo, nomexAshMat);
    upperArm.castShadow = true;
    shoulder.add(upperArm);

    // Armored bicep sleeve bridging pauldron to elbow (zero stick-arm gap!)
    const bicepSleeveGeo = createCurvedPanelGeometry(
      [
        { y: -0.28, rx: 0.084, rz: 0.086, thickness: 0.016 },
        { y: -0.18, rx: 0.094, rz: 0.096, thickness: 0.018 },
        { y: -0.11, rx: 0.098, rz: 0.1, thickness: 0.016 },
      ],
      side < 0 ? Math.PI * 0.42 : -Math.PI * 0.58,
      side < 0 ? Math.PI * 1.58 : Math.PI * 0.58,
      12
    );
    disposables.push(bicepSleeveGeo);
    shoulder.add(new THREE.Mesh(bicepSleeveGeo, charcoalSteelMat));

    const elbow = new THREE.Group();
    elbow.position.y = -0.33;
    shoulder.add(elbow);

    elbow.add(new THREE.Mesh(new THREE.SphereGeometry(0.072, 12, 10), nomexAshMat));

    // Full-wrap heavy EOD elbow cop + brass hinge bolt
    const elbowCapGeo = createCurvedPanelGeometry(
      [
        { y: -0.064, rx: 0.078, rz: 0.08, thickness: 0.02 },
        { y: 0.0, rx: 0.088, rz: 0.09, thickness: 0.022 },
        { y: 0.06, rx: 0.074, rz: 0.076, thickness: 0.018 },
      ],
      -Math.PI * 0.15,
      Math.PI * 1.15,
      14
    );
    disposables.push(elbowCapGeo);
    elbow.add(new THREE.Mesh(elbowCapGeo, charcoalSteelMat));

    const hingeBolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.174, 8),
      brassValveMat
    );
    hingeBolt.rotation.z = Math.PI / 2;
    elbow.add(hingeBolt);

    const forearm = new THREE.Mesh(forearmGeo, nomexAshMat);
    forearm.castShadow = true;
    elbow.add(forearm);

    // Heavy Heat-Shield Forearm Bracer
    const bracerGeo = createCurvedPanelGeometry(
      [
        { y: -0.255, rx: 0.068, rz: 0.07, thickness: 0.02 },
        { y: -0.13, rx: 0.086, rz: 0.088, thickness: 0.022 },
        { y: -0.02, rx: 0.082, rz: 0.084, thickness: 0.02 },
      ],
      side < 0 ? Math.PI * 0.45 : -Math.PI * 0.55,
      side < 0 ? Math.PI * 1.55 : Math.PI * 0.55,
      12
    );
    disposables.push(bracerGeo);
    elbow.add(new THREE.Mesh(bracerGeo, flashArmorMat));

    const wristCuff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.062, 0.056, 0.036, 14),
      charcoalSteelMat
    );
    wristCuff.position.y = -0.258;
    elbow.add(wristCuff);

    // Insulated 5-finger heavy blast gauntlet
    const hand = createSculptedHand(side, nomexAshMat, charcoalSteelMat, hazardYellowMat);
    hand.scale.setScalar(1.14);
    hand.position.set(0, -0.29, 0);
    hand.rotation.y = side * -Math.PI * 0.5;
    elbow.add(hand);

    const handMount = new THREE.Group();
    handMount.position.set(0, -0.29, 0);
    elbow.add(handMount);

    return { shoulder, elbow, handMount };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // Mount "VULCAN-8" Heavy Thermite Cannon cleanly inside rightArm.elbow!
  // Grip at (0, -0.072, 0.055) rotated -PI/2 X -> (0, +0.055, +0.072)
  // Positioned at (0, -0.345, -0.072) -> grip sits DEAD CENTER at (0, -0.29, 0) in right gauntlet!
  const vulcan = buildVulcanThermiteCannon(
    mats,
    flashArmorMat,
    charcoalSteelMat,
    hazardYellowMat,
    brassValveMat,
    disposables
  );
  vulcan.cannon.position.set(0, -0.345, -0.072);
  vulcan.cannon.rotation.set(-Math.PI * 0.5, 0, 0);
  rightArm.elbow.add(vulcan.cannon);

  // ---------------------------------------------------------------------------
  // 2. HEAVY REINFORCED EOD LEGS + BLAST KNEE GUARDS + STEEL-TOE BOOTS AT y=0.00
  // ---------------------------------------------------------------------------
  // Pelvis y = 1.04 -> hip y = -0.04 (1.00) -> knee y = -0.50 (0.50) -> bootSole bottom at -0.50 (y = 0.00!)
  const thighGeo = createLoftedAnatomy(
    [
      { y: 0.05, rx: 0.114, rz: 0.12, squareness: 2.35 },
      { y: -0.15, rx: 0.124, rz: 0.13, squareness: 2.4, frontScale: 1.08 },
      { y: -0.34, rx: 0.104, rz: 0.11, squareness: 2.3 },
      { y: -0.53, rx: 0.086, rz: 0.09, squareness: 2.25 },
    ],
    16
  );
  const calfGeo = createLoftedAnatomy(
    [
      { y: 0.065, rx: 0.086, rz: 0.09, squareness: 2.3 },
      { y: -0.14, rx: 0.098, rz: 0.104, squareness: 2.35, backScale: 1.12 },
      { y: -0.31, rx: 0.078, rz: 0.082, squareness: 2.25 },
      { y: -0.43, rx: 0.07, rz: 0.074, squareness: 2.2 },
    ],
    16
  );
  disposables.push(thighGeo, calfGeo);

  const buildLeg = (side: -1 | 1): PyroLegRig => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.148, -0.04, 0);
    pelvis.add(hip);

    const thigh = new THREE.Mesh(thighGeo, nomexAshMat);
    thigh.castShadow = true;
    hip.add(thigh);

    // Curved EOD front-outer thigh blast-plates (clean +18mm radial clearance -> ZERO rear Z-fighting!)
    const thighPlateGeo = createCurvedPanelGeometry(
      [
        { y: -0.37, rx: 0.122, rz: 0.132, thickness: 0.02 },
        { y: -0.19, rx: 0.142, rz: 0.152, thickness: 0.022 },
        { y: -0.08, rx: 0.134, rz: 0.144, thickness: 0.02 },
      ],
      side < 0 ? -Math.PI * 0.92 : -Math.PI * 0.64,
      side < 0 ? -Math.PI * 0.36 : -Math.PI * 0.08,
      12
    );
    disposables.push(thighPlateGeo);
    hip.add(new THREE.Mesh(thighPlateGeo, flashArmorMat));

    const knee = new THREE.Group();
    knee.position.y = -0.5;
    hip.add(knee);

    knee.add(new THREE.Mesh(new THREE.SphereGeometry(0.084, 12, 10), nomexAshMat));

    // Heavy Reinforced Charcoal-Steel + Yellow Hazard EOD Knee Pads
    const kneeGuardGeo = createCurvedPanelGeometry(
      [
        { y: -0.072, rx: 0.102, rz: 0.114, thickness: 0.024 },
        { y: 0.015, rx: 0.118, rz: 0.128, thickness: 0.028 },
        { y: 0.085, rx: 0.098, rz: 0.108, thickness: 0.022 },
      ],
      -Math.PI * 0.84,
      -Math.PI * 0.16,
      12
    );
    disposables.push(kneeGuardGeo);
    knee.add(new THREE.Mesh(kneeGuardGeo, charcoalSteelMat));

    const kneeStripe = new THREE.Mesh(
      createBeveledBox(0.086, 0.022, 0.018, 0.004),
      hazardYellowMat
    );
    kneeStripe.position.set(0, 0.018, -0.142);
    knee.add(kneeStripe);

    const calf = new THREE.Mesh(calfGeo, nomexAshMat);
    calf.castShadow = true;
    knee.add(calf);

    // Heavy Hazard-Orange EOD Front Blast Greave Shins (clean +18mm clearance outside calf -> ZERO rear Z-fighting!)
    const shinGeo = createCurvedPanelGeometry(
      [
        { y: -0.37, rx: 0.096, rz: 0.104, thickness: 0.02 },
        { y: -0.2, rx: 0.116, rz: 0.126, thickness: 0.022 },
        { y: -0.06, rx: 0.118, rz: 0.128, thickness: 0.02 },
      ],
      -Math.PI * 0.82,
      -Math.PI * 0.18,
      12
    );
    disposables.push(shinGeo);
    knee.add(new THREE.Mesh(shinGeo, flashArmorMat));

    // Weighted Steel-Toe Hazmat Stomp Boot (exact sole bottom at y = -0.50 -> world y = 0.00!)
    const bootUpper = new THREE.Mesh(
      createBeveledBox(0.142, 0.11, 0.195, 0.024),
      charcoalSteelMat
    );
    bootUpper.position.set(0, -0.422, 0.005);
    knee.add(bootUpper);

    const toeCap = new THREE.Mesh(createBeveledBox(0.136, 0.08, 0.148, 0.02), charcoalSteelMat);
    toeCap.position.set(0, -0.442, -0.112);
    knee.add(toeCap);

    const toeBand = new THREE.Mesh(createBeveledBox(0.14, 0.02, 0.044, 0.004), hazardYellowMat);
    toeBand.position.set(0, -0.425, -0.148);
    knee.add(toeBand);

    const bootSole = new THREE.Mesh(
      createBeveledBox(0.154, 0.044, 0.305, 0.008),
      mats.armorDark
    );
    bootSole.position.set(0, -0.478, -0.036);
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
    cannon: vulcan.cannon,
    drumCyl: vulcan.drumCyl,
    muzzlePoint: vulcan.muzzlePoint,
    barrelGlowMat: vulcan.barrelGlowMat,
    setPilotAndBarrelHeat: vulcan.setPilotAndBarrelHeat,
    disposables,
  };
}
