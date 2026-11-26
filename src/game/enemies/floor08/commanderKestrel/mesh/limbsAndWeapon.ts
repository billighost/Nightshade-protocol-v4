import * as THREE from 'three';
import {
  createBeveledBox,
  createCurvedPanelGeometry,
  createLoftedAnatomy,
  createSculptedHand,
} from '../../../../core/sculptUtils';
import type { Floor08EnemyMaterials } from '../../../core/enemyMeshShared';

export interface KestrelArmRig {
  shoulder: THREE.Group;
  elbow: THREE.Group;
  handMount: THREE.Group;
}

export interface KestrelLegRig {
  hip: THREE.Group;
  knee: THREE.Group;
}

export interface KestrelLimbsAndWeapons {
  leftLeg: KestrelLegRig;
  rightLeg: KestrelLegRig;
  leftArm: KestrelArmRig;
  rightArm: KestrelArmRig;
  carbine: THREE.Group;
  muzzlePoint: THREE.Object3D;
  bladeGroup: THREE.Group;
  bladeTipAnchor: THREE.Object3D;
  setWeaponPhaseAndBlade: (phase: 1 | 2, bladeDeploy: number, elapsed: number) => void;
  disposables: Array<{ dispose: () => void }>;
}

/**
 * Gunsmith 16-Part "SOVEREIGN-8" OVERDRIVE PULSE CARBINE:
 * - Pistol grip positioned at exact (0, -0.055, 0.055) so when mounted inside rightArm.elbow
 *   at (0, -0.365, -0.055) rotated (-PI/2, 0, 0), the grip sits DEAD-CENTER in the right gauntlet!
 * - Obsidian receiver + Imperial Gold upper rail + dual glowing plasma coils (crimson P1 -> solar-gold P2)
 * - Holographic reflex optic + twin magnetic barrel rails + heavy slotted compensator muzzle brake
 */
function buildSovereignCarbine(
  mats: Floor08EnemyMaterials,
  flashArmorMat: THREE.MeshStandardMaterial,
  goldMat: THREE.MeshStandardMaterial,
  crimsonMat: THREE.MeshStandardMaterial,
  disposables: Array<{ dispose: () => void }>
): {
  carbine: THREE.Group;
  muzzlePoint: THREE.Object3D;
  coilGlowMat: THREE.MeshStandardMaterial;
} {
  const carbine = new THREE.Group();

  const gunmetalMat = new THREE.MeshStandardMaterial({
    color: 0x202530,
    roughness: 0.4,
    metalness: 0.74,
    bumpMap: mats.armorDark.bumpMap,
    bumpScale: 0.009,
  });
  const coilGlowMat = new THREE.MeshStandardMaterial({
    color: 0xff5a68,
    emissive: 0xe61e36,
    emissiveIntensity: 2.4,
    roughness: 0.16,
    metalness: 0.2,
  });
  disposables.push(gunmetalMat, coilGlowMat);

  // Main beveled upper/lower receiver chassis
  const receiver = new THREE.Mesh(createBeveledBox(0.084, 0.132, 0.56, 0.014), gunmetalMat);
  receiver.position.set(0, 0.048, -0.15);
  receiver.castShadow = true;
  carbine.add(receiver);

  // Obsidian cheek-shroud side plates + Imperial Gold top picatinny spine
  const topSpine = new THREE.Mesh(createBeveledBox(0.064, 0.028, 0.52, 0.006), goldMat);
  topSpine.position.set(0, 0.122, -0.19);
  carbine.add(topSpine);

  const shroud = new THREE.Mesh(createBeveledBox(0.094, 0.072, 0.34, 0.012), flashArmorMat);
  shroud.position.set(0, 0.074, -0.32);
  carbine.add(shroud);

  // Dual lateral Overdrive Plasma Capacitor Coils
  for (const side of [-1, 1] as const) {
    const coil = new THREE.Mesh(createBeveledBox(0.016, 0.032, 0.32, 0.004), coilGlowMat);
    coil.position.set(side * 0.049, 0.056, -0.26);
    carbine.add(coil);

    const railTrim = new THREE.Mesh(createBeveledBox(0.012, 0.016, 0.24, 0.003), goldMat);
    railTrim.position.set(side * 0.052, 0.092, -0.3);
    carbine.add(railTrim);
  }

  // Holographic Vanguard Reflex Optic on top rail
  const opticHousing = new THREE.Mesh(createBeveledBox(0.052, 0.056, 0.12, 0.009), flashArmorMat);
  opticHousing.position.set(0, 0.16, -0.11);
  carbine.add(opticHousing);

  const opticLens = new THREE.Mesh(createBeveledBox(0.036, 0.032, 0.014, 0.003), coilGlowMat);
  opticLens.position.set(0, 0.16, -0.168);
  carbine.add(opticLens);

  // Twin Magnetic Accelerator Barrels + Slotted Compensator Muzzle Brake
  for (const dy of [-0.018, 0.026]) {
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.017, 0.34, 10),
      gunmetalMat
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.054 + dy, -0.58);
    carbine.add(barrel);
  }

  const brake = new THREE.Mesh(createBeveledBox(0.056, 0.088, 0.115, 0.01), goldMat);
  brake.position.set(0, 0.056, -0.74);
  carbine.add(brake);

  const boreGlow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.02, 10),
    coilGlowMat
  );
  boreGlow.rotation.x = Math.PI / 2;
  boreGlow.position.set(0, 0.056, -0.798);
  carbine.add(boreGlow);

  // Cantilevered energy magazine + crimson tactical floorplate
  const mag = new THREE.Mesh(createBeveledBox(0.048, 0.145, 0.072, 0.008), gunmetalMat);
  mag.position.set(0, -0.078, -0.2);
  mag.rotation.x = 0.24;
  carbine.add(mag);

  const magBase = new THREE.Mesh(createBeveledBox(0.052, 0.024, 0.078, 0.004), crimsonMat);
  magBase.position.set(0, -0.145, -0.22);
  magBase.rotation.x = 0.24;
  carbine.add(magBase);

  // Rear skeletal stock + Ergonomic Pistol Grip seated DEAD-CENTER at (0, -0.055, 0.055)!
  const stock = new THREE.Mesh(createBeveledBox(0.054, 0.1, 0.18, 0.012), flashArmorMat);
  stock.position.set(0, 0.04, 0.18);
  carbine.add(stock);

  const grip = new THREE.Mesh(createBeveledBox(0.038, 0.116, 0.05, 0.008), gunmetalMat);
  grip.position.set(0, -0.055, 0.055);
  grip.rotation.x = -0.18;
  carbine.add(grip);

  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, 0.056, -0.82);
  carbine.add(muzzlePoint);

  return { carbine, muzzlePoint, coilGlowMat };
}

/**
 * Deployable Left-Gauntlet "SERAPH-EDGE" HARD-LIGHT THERMAL GREATSWORD:
 * - Mounted flush onto outer-left forearm bracer (`leftArm.elbow`) so it never floats off the wrist!
 * - Sculpted obsidian-and-gold twin-prong projector emitter + flared crossguard fins
 * - Tapered beveled ExtrudeGeometry plasma greatsword blade (molten white core + crimson/gold plasma edge!)
 */
function buildSeraphThermalBlade(
  flashArmorMat: THREE.MeshStandardMaterial,
  goldMat: THREE.MeshStandardMaterial,
  disposables: Array<{ dispose: () => void }>
): {
  bladeGroup: THREE.Group;
  bladePivot: THREE.Group;
  bladeTipAnchor: THREE.Object3D;
  bladeOuterMat: THREE.MeshStandardMaterial;
  bladeCoreMat: THREE.MeshBasicMaterial;
} {
  const bladeGroup = new THREE.Group();

  // Sleek obsidian + gold forearm projector cowl
  const cowl = new THREE.Mesh(createBeveledBox(0.068, 0.078, 0.24, 0.012), flashArmorMat);
  cowl.position.set(0, 0, -0.06);
  bladeGroup.add(cowl);

  const goldEmitter = new THREE.Mesh(createBeveledBox(0.078, 0.052, 0.12, 0.009), goldMat);
  goldEmitter.position.set(0, 0.012, -0.155);
  bladeGroup.add(goldEmitter);

  // Angled golden crossguard projector prongs
  for (const dy of [-1, 1] as const) {
    const prong = new THREE.Mesh(createBeveledBox(0.03, 0.078, 0.095, 0.006), goldMat);
    prong.position.set(0, dy * 0.062, -0.2);
    prong.rotation.x = dy * 0.36;
    bladeGroup.add(prong);
  }

  // Telescoping hard-light thermal greatsword blade
  const bladePivot = new THREE.Group();
  bladePivot.position.set(0, 0, -0.21);
  bladeGroup.add(bladePivot);

  // Tapered cyber-greatsword profile along +X (then rotated to project along -Z!)
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, -0.042);
  bladeShape.lineTo(0.84, -0.032);
  bladeShape.lineTo(1.12, 0.012);
  bladeShape.lineTo(0.92, 0.056);
  bladeShape.lineTo(0.06, 0.052);
  bladeShape.lineTo(0, 0.034);
  bladeShape.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.004,
    bevelSegments: 2,
  });
  bladeGeo.translate(0, 0, -0.006);
  bladeGeo.rotateY(Math.PI / 2); // +X becomes -Z!
  disposables.push(bladeGeo);

  const bladeOuterMat = new THREE.MeshStandardMaterial({
    color: 0xff4658,
    emissive: 0xff2238,
    emissiveIntensity: 2.8,
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.9,
  });
  const bladeCoreMat = new THREE.MeshBasicMaterial({
    color: 0xfff8e2,
    transparent: true,
    opacity: 0.95,
  });
  disposables.push(bladeOuterMat, bladeCoreMat);

  const outerMesh = new THREE.Mesh(bladeGeo, bladeOuterMat);
  bladePivot.add(outerMesh);

  const coreSpine = new THREE.Mesh(createBeveledBox(0.008, 0.022, 0.96, 0.003), bladeCoreMat);
  coreSpine.position.set(0, 0.008, -0.5);
  bladePivot.add(coreSpine);

  const bladeTipAnchor = new THREE.Object3D();
  bladeTipAnchor.position.set(0, 0.01, -1.1);
  bladePivot.add(bladeTipAnchor);

  return { bladeGroup, bladePivot, bladeTipAnchor, bladeOuterMat, bladeCoreMat };
}

/**
 * Builds COMMANDER KESTREL-08's towering sculpted limbs (tiered Imperial Gold Valkyrie pauldrons,
 * full-wrap arm armor, front-only cleared leg greaves with ZERO rear Z-fighting, grounded
 * aero-thruster combat boots at exact y=0.00) + Sovereign-8 Carbine + Seraph-Edge Greatsword!
 */
export function buildKestrelLimbsAndWeapons(
  pelvis: THREE.Group,
  torso: THREE.Group,
  mats: Floor08EnemyMaterials,
  flashArmorMat: THREE.MeshStandardMaterial,
  goldMat: THREE.MeshStandardMaterial,
  crimsonMat: THREE.MeshStandardMaterial
): KestrelLimbsAndWeapons {
  const disposables: Array<{ dispose: () => void }> = [];

  const undersuitMat = new THREE.MeshStandardMaterial({
    color: 0x262c38,
    roughness: 0.78,
    metalness: 0.22,
    bumpMap: mats.undersuit.bumpMap,
    bumpScale: 0.014,
  });
  const bootTrimMat = new THREE.MeshStandardMaterial({
    color: 0x161a22,
    roughness: 0.56,
    metalness: 0.52,
  });
  disposables.push(undersuitMat, bootTrimMat);

  // ---------------------------------------------------------------------------
  // 1. TOWERING SCULPTED ARMS + TIERED VALKYRIE GOLD PAULDRONS
  // ---------------------------------------------------------------------------
  const upperArmGeo = createLoftedAnatomy(
    [
      { y: 0.04, rx: 0.076, rz: 0.078, squareness: 2.3 },
      { y: -0.1, rx: 0.084, rz: 0.086, squareness: 2.35 },
      { y: -0.24, rx: 0.072, rz: 0.074, squareness: 2.25 },
      { y: -0.36, rx: 0.064, rz: 0.066, squareness: 2.2 },
    ],
    14
  );
  const forearmGeo = createLoftedAnatomy(
    [
      { y: 0.045, rx: 0.066, rz: 0.068, squareness: 2.25 },
      { y: -0.11, rx: 0.074, rz: 0.076, squareness: 2.35 },
      { y: -0.23, rx: 0.058, rz: 0.06, squareness: 2.2 },
      { y: -0.31, rx: 0.048, rz: 0.048, squareness: 2.15 },
    ],
    14
  );
  disposables.push(upperArmGeo, forearmGeo);

  const buildArm = (side: -1 | 1): KestrelArmRig => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.305, 0.515, 0);
    torso.add(shoulder);

    shoulder.add(new THREE.Mesh(new THREE.SphereGeometry(0.078, 12, 10), undersuitMat));

    // Tiered Valkyrie Pauldron: obsidian curved dome + swept Imperial Gold wing-fin crest!
    const pauldronGeo = createCurvedPanelGeometry(
      [
        { y: -0.145, rx: 0.124, rz: 0.122, thickness: 0.024 },
        { y: 0.015, rx: 0.122, rz: 0.12, thickness: 0.026 },
        { y: 0.11, rx: 0.088, rz: 0.09, thickness: 0.022 },
      ],
      side < 0 ? Math.PI * 0.42 : -Math.PI * 0.58,
      side < 0 ? Math.PI * 1.58 : Math.PI * 0.58,
      14
    );
    disposables.push(pauldronGeo);
    const pauldron = new THREE.Mesh(pauldronGeo, flashArmorMat);
    pauldron.castShadow = true;
    shoulder.add(pauldron);

    // Sweeping upper gold shoulder crest fin + crimson inlay bar
    const wingFin = new THREE.Mesh(createBeveledBox(0.18, 0.038, 0.22, 0.009), goldMat);
    wingFin.position.set(side * 0.115, 0.115, 0.01);
    wingFin.rotation.z = side * 0.34;
    wingFin.castShadow = true;
    shoulder.add(wingFin);

    const pCrimson = new THREE.Mesh(createBeveledBox(0.02, 0.038, 0.145, 0.004), crimsonMat);
    pCrimson.position.set(side * 0.126, -0.045, 0);
    shoulder.add(pCrimson);

    const upperArm = new THREE.Mesh(upperArmGeo, undersuitMat);
    upperArm.castShadow = true;
    shoulder.add(upperArm);

    // Armored bicep sleeve
    const bicepGeo = createCurvedPanelGeometry(
      [
        { y: -0.29, rx: 0.078, rz: 0.08, thickness: 0.016 },
        { y: -0.18, rx: 0.088, rz: 0.09, thickness: 0.018 },
        { y: -0.11, rx: 0.09, rz: 0.092, thickness: 0.016 },
      ],
      side < 0 ? Math.PI * 0.42 : -Math.PI * 0.58,
      side < 0 ? Math.PI * 1.58 : Math.PI * 0.58,
      12
    );
    disposables.push(bicepGeo);
    shoulder.add(new THREE.Mesh(bicepGeo, flashArmorMat));

    const elbow = new THREE.Group();
    elbow.position.y = -0.35;
    shoulder.add(elbow);

    elbow.add(new THREE.Mesh(new THREE.SphereGeometry(0.066, 12, 10), undersuitMat));

    // Full-wrap angular obsidian elbow guard + gold pivot ring
    const elbowCapGeo = createCurvedPanelGeometry(
      [
        { y: -0.058, rx: 0.072, rz: 0.074, thickness: 0.018 },
        { y: 0.0, rx: 0.082, rz: 0.084, thickness: 0.02 },
        { y: 0.054, rx: 0.07, rz: 0.072, thickness: 0.016 },
      ],
      -Math.PI * 0.15,
      Math.PI * 1.15,
      14
    );
    disposables.push(elbowCapGeo);
    elbow.add(new THREE.Mesh(elbowCapGeo, flashArmorMat));

    const elbowBolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.162, 8),
      goldMat
    );
    elbowBolt.rotation.z = Math.PI / 2;
    elbow.add(elbowBolt);

    const forearm = new THREE.Mesh(forearmGeo, undersuitMat);
    forearm.castShadow = true;
    elbow.add(forearm);

    // Sleek armored forearm bracer with gold trim ridge
    const bracerGeo = createCurvedPanelGeometry(
      [
        { y: -0.26, rx: 0.064, rz: 0.066, thickness: 0.018 },
        { y: -0.13, rx: 0.08, rz: 0.082, thickness: 0.02 },
        { y: -0.02, rx: 0.076, rz: 0.078, thickness: 0.018 },
      ],
      side < 0 ? Math.PI * 0.45 : -Math.PI * 0.55,
      side < 0 ? Math.PI * 1.55 : Math.PI * 0.55,
      12
    );
    disposables.push(bracerGeo);
    elbow.add(new THREE.Mesh(bracerGeo, flashArmorMat));

    const wristCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.058, 0.052, 0.036, 14),
      goldMat
    );
    wristCollar.position.y = -0.268;
    elbow.add(wristCollar);

    const hand = createSculptedHand(side, undersuitMat, flashArmorMat, goldMat);
    hand.scale.setScalar(1.12);
    hand.position.set(0, -0.31, 0);
    hand.rotation.y = side * -Math.PI * 0.5;
    elbow.add(hand);

    const handMount = new THREE.Group();
    handMount.position.set(0, -0.31, 0);
    elbow.add(handMount);

    return { shoulder, elbow, handMount };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // Mount Right-Hand "SOVEREIGN-8" Overdrive Pulse Carbine inside rightArm.elbow!
  // Grip at (0, -0.055, 0.055) rotated -PI/2 X -> (0, +0.055, +0.055)
  // Seated at (0, -0.365, -0.055) -> grip sits DEAD-CENTER at (0, -0.31, 0) in right gauntlet!
  const sov = buildSovereignCarbine(mats, flashArmorMat, goldMat, crimsonMat, disposables);
  sov.carbine.position.set(0, -0.365, -0.055);
  sov.carbine.rotation.set(-Math.PI * 0.5, 0, 0);
  rightArm.elbow.add(sov.carbine);

  // Mount Left-Gauntlet "SERAPH-EDGE" Hard-Light Thermal Greatsword flush onto left forearm!
  const seraph = buildSeraphThermalBlade(flashArmorMat, goldMat, disposables);
  seraph.bladeGroup.position.set(-0.076, -0.21, -0.015);
  seraph.bladeGroup.rotation.set(-Math.PI * 0.5, 0, 0);
  leftArm.elbow.add(seraph.bladeGroup);

  // ---------------------------------------------------------------------------
  // 2. TOWERING AERO-VANGUARD LEGS + GROUNDED THRUSTER BOOTS AT EXACT y=0.00
  // ---------------------------------------------------------------------------
  // Pelvis y = 1.12 -> hip y = -0.04 (1.08) -> knee y = -0.54 (0.54) -> bootSole bottom at -0.54 (y = 0.00!)
  const thighGeo = createLoftedAnatomy(
    [
      { y: 0.05, rx: 0.106, rz: 0.112, squareness: 2.35 },
      { y: -0.17, rx: 0.114, rz: 0.12, squareness: 2.4, frontScale: 1.08 },
      { y: -0.36, rx: 0.094, rz: 0.1, squareness: 2.3 },
      { y: -0.56, rx: 0.078, rz: 0.084, squareness: 2.25 },
    ],
    16
  );
  const calfGeo = createLoftedAnatomy(
    [
      { y: 0.065, rx: 0.08, rz: 0.086, squareness: 2.3 },
      { y: -0.16, rx: 0.092, rz: 0.098, squareness: 2.35, backScale: 1.12 },
      { y: -0.34, rx: 0.072, rz: 0.078, squareness: 2.25 },
      { y: -0.46, rx: 0.064, rz: 0.07, squareness: 2.2 },
    ],
    16
  );
  disposables.push(thighGeo, calfGeo);

  const buildLeg = (side: -1 | 1): KestrelLegRig => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.148, -0.04, 0);
    pelvis.add(hip);

    const thigh = new THREE.Mesh(thighGeo, undersuitMat);
    thigh.castShadow = true;
    hip.add(thigh);

    // Front-outer sculpted obsidian thigh cuisse (+18mm clearance -> ZERO rear Z-fighting!)
    const cuisseGeo = createCurvedPanelGeometry(
      [
        { y: -0.4, rx: 0.114, rz: 0.124, thickness: 0.018 },
        { y: -0.2, rx: 0.132, rz: 0.142, thickness: 0.02 },
        { y: -0.08, rx: 0.126, rz: 0.136, thickness: 0.018 },
      ],
      side < 0 ? -Math.PI * 0.92 : -Math.PI * 0.64,
      side < 0 ? -Math.PI * 0.36 : -Math.PI * 0.08,
      12
    );
    disposables.push(cuisseGeo);
    hip.add(new THREE.Mesh(cuisseGeo, flashArmorMat));

    const thighFin = new THREE.Mesh(createBeveledBox(0.022, 0.24, 0.064, 0.005), goldMat);
    thighFin.position.set(side * 0.128, -0.22, -0.02);
    hip.add(thighFin);

    const knee = new THREE.Group();
    knee.position.y = -0.54;
    hip.add(knee);

    knee.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), undersuitMat));

    // Angular Valkyrie Gold-Crowned Knee Guard
    const kneeGeo = createCurvedPanelGeometry(
      [
        { y: -0.072, rx: 0.096, rz: 0.108, thickness: 0.022 },
        { y: 0.02, rx: 0.112, rz: 0.124, thickness: 0.024 },
        { y: 0.095, rx: 0.092, rz: 0.104, thickness: 0.02 },
      ],
      -Math.PI * 0.84,
      -Math.PI * 0.16,
      12
    );
    disposables.push(kneeGeo);
    knee.add(new THREE.Mesh(kneeGeo, goldMat));

    const kneeCrest = new THREE.Mesh(createBeveledBox(0.056, 0.092, 0.026, 0.006), flashArmorMat);
    kneeCrest.position.set(0, 0.028, -0.138);
    knee.add(kneeCrest);

    const calf = new THREE.Mesh(calfGeo, undersuitMat);
    calf.castShadow = true;
    knee.add(calf);

    // Sculpted Front Aero-Greave Shin (+18mm radial clearance -> ZERO rear Z-fighting!)
    const greaveGeo = createCurvedPanelGeometry(
      [
        { y: -0.4, rx: 0.09, rz: 0.1, thickness: 0.018 },
        { y: -0.21, rx: 0.11, rz: 0.122, thickness: 0.02 },
        { y: -0.06, rx: 0.112, rz: 0.124, thickness: 0.018 },
      ],
      -Math.PI * 0.82,
      -Math.PI * 0.18,
      12
    );
    disposables.push(greaveGeo);
    knee.add(new THREE.Mesh(greaveGeo, flashArmorMat));

    // Gold shin spine & rear aero-calf stabilizer fin
    const shinSpine = new THREE.Mesh(createBeveledBox(0.024, 0.28, 0.022, 0.004), goldMat);
    shinSpine.position.set(0, -0.22, -0.134);
    knee.add(shinSpine);

    const calfThruster = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.036, 0.11, 10),
      bootTrimMat
    );
    calfThruster.position.set(0, -0.24, 0.108);
    calfThruster.rotation.x = 0.28;
    knee.add(calfThruster);

    // Armored Aero-Vanguard Combat Boot (exact sole bottom at y = -0.54 -> world y = 0.00!)
    const bootUpper = new THREE.Mesh(createBeveledBox(0.132, 0.105, 0.19, 0.02), flashArmorMat);
    bootUpper.position.set(0, -0.464, 0.004);
    knee.add(bootUpper);

    const toeCap = new THREE.Mesh(createBeveledBox(0.124, 0.072, 0.155, 0.018), flashArmorMat);
    toeCap.position.set(0, -0.484, -0.116);
    knee.add(toeCap);

    const toeGold = new THREE.Mesh(createBeveledBox(0.128, 0.022, 0.048, 0.004), goldMat);
    toeGold.position.set(0, -0.464, -0.145);
    knee.add(toeGold);

    const bootSole = new THREE.Mesh(createBeveledBox(0.142, 0.042, 0.305, 0.008), bootTrimMat);
    bootSole.position.set(0, -0.519, -0.036);
    knee.add(bootSole);

    return { hip, knee };
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  const p1Color = new THREE.Color(0xff384c);
  const p1Emissive = new THREE.Color(0xe61830);
  const p2Color = new THREE.Color(0xffd048);
  const p2Emissive = new THREE.Color(0xff9212);

  const setWeaponPhaseAndBlade = (phase: 1 | 2, bladeDeploy: number, elapsed: number): void => {
    const isP2 = phase === 2;
    const pulse = 0.9 + Math.sin(elapsed * (isP2 ? 22 : 12)) * 0.14;
    sov.coilGlowMat.color.copy(isP2 ? p2Color : p1Color);
    sov.coilGlowMat.emissive.copy(isP2 ? p2Emissive : p1Emissive);
    sov.coilGlowMat.emissiveIntensity = (isP2 ? 3.2 : 2.2) * pulse;

    const scaleZ = THREE.MathUtils.clamp(bladeDeploy, 0.1, 1.08);
    seraph.bladePivot.scale.set(1, 0.55 + scaleZ * 0.45, scaleZ);
    seraph.bladeOuterMat.color.copy(isP2 ? p2Color : p1Color);
    seraph.bladeOuterMat.emissive.copy(isP2 ? p2Emissive : p1Emissive);
    seraph.bladeOuterMat.emissiveIntensity = (isP2 ? 3.4 : 2.6) * pulse * (0.4 + scaleZ * 0.6);
    seraph.bladeCoreMat.opacity = Math.min(0.98, 0.25 + scaleZ * 0.75);
  };

  return {
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    carbine: sov.carbine,
    muzzlePoint: sov.muzzlePoint,
    bladeGroup: seraph.bladeGroup,
    bladeTipAnchor: seraph.bladeTipAnchor,
    setWeaponPhaseAndBlade,
    disposables,
  };
}
