import * as THREE from 'three';
import {
  createBeveledBox,
  createCurvedPanelGeometry,
  createLoftedAnatomy,
  createSculptedHand,
} from '../../../../core/sculptUtils';
import type { Floor08EnemyMaterials } from '../../../core/enemyMeshShared';

export interface AegisArmRig {
  shoulder: THREE.Group;
  elbow: THREE.Group;
  handMount: THREE.Group;
}

export interface AegisLegRig {
  hip: THREE.Group;
  knee: THREE.Group;
}

export interface AegisLimbsAndWeapon {
  leftLeg: AegisLegRig;
  rightLeg: AegisLegRig;
  leftArm: AegisArmRig;
  rightArm: AegisArmRig;
  shotgunGroup: THREE.Group;
  muzzlePoint: THREE.Object3D;
  flakCoilMat: THREE.MeshStandardMaterial;
  disposables: Array<{ dispose: () => void }>;
}

/**
 * Builds the gunsmith-grade M90-H "SLEDGEHAMMER" Drum-Fed Riot Flak Auto-Shotgun (15+ parts):
 * - Heavy CNC squared breacher receivers + top rail & reflex sight
 * - Underslung 12-Round Cylindrical Rotary Drum Magazine with glowing cyan shell indicators!
 * - Perforated barrel heat-shield shroud + twin arc-stabilizer rails + wide duckbill breacher brake
 * - Pistol grip centered at (0, -0.07, 0.03) so right armored gauntlet wraps DEAD-CENTER around it!
 */
function buildM90SledgehammerShotgun(
  mats: Floor08EnemyMaterials,
  disposables: Array<{ dispose: () => void }>
): {
  shotgunGroup: THREE.Group;
  muzzlePoint: THREE.Object3D;
  flakCoilMat: THREE.MeshStandardMaterial;
} {
  const shotgunGroup = new THREE.Group();

  const gunmetalMat = new THREE.MeshStandardMaterial({
    color: 0x252e3a,
    roughness: 0.46,
    metalness: 0.72,
    bumpMap: mats.armorDark.bumpMap,
    bumpScale: 0.008,
  });
  const polymerMat = new THREE.MeshStandardMaterial({
    color: 0x141920,
    roughness: 0.84,
    metalness: 0.16,
    bumpMap: mats.undersuit.bumpMap,
    bumpScale: 0.01,
  });
  const flakCoilMat = new THREE.MeshStandardMaterial({
    color: 0x62f2ff,
    emissive: 0x06b6d4,
    emissiveIntensity: 2.6,
    roughness: 0.16,
    metalness: 0.22,
  });
  disposables.push(gunmetalMat, polymerMat, flakCoilMat);

  // 1. Heavy CNC Breacher Upper & Lower Receivers
  const upper = new THREE.Mesh(createBeveledBox(0.082, 0.092, 0.34, 0.011), gunmetalMat);
  upper.position.set(0, 0.052, -0.075);
  upper.castShadow = true;
  shotgunGroup.add(upper);

  const lower = new THREE.Mesh(createBeveledBox(0.072, 0.062, 0.24, 0.009), polymerMat);
  lower.position.set(0, -0.01, -0.04);
  shotgunGroup.add(lower);

  const topRail = new THREE.Mesh(createBeveledBox(0.04, 0.018, 0.44, 0.004), mats.titaniumJoint);
  topRail.position.set(0, 0.104, -0.14);
  shotgunGroup.add(topRail);

  // 2. Compact CQB Folding Exo-Stock bracing against forearm/pauldron
  const stockBar = new THREE.Mesh(createBeveledBox(0.044, 0.036, 0.16, 0.007), gunmetalMat);
  stockBar.position.set(0, 0.046, 0.165);
  shotgunGroup.add(stockBar);

  const buttPlate = new THREE.Mesh(createBeveledBox(0.052, 0.125, 0.032, 0.008), polymerMat);
  buttPlate.position.set(0, 0.018, 0.245);
  shotgunGroup.add(buttPlate);

  // 3. Ergonomic Heavy Pistol Grip + Oversized Armored Trigger Guard
  const grip = new THREE.Mesh(createBeveledBox(0.044, 0.12, 0.058, 0.01), polymerMat);
  grip.position.set(0, -0.072, 0.032);
  grip.rotation.x = -0.24;
  shotgunGroup.add(grip);

  const guard = new THREE.Mesh(createBeveledBox(0.028, 0.016, 0.082, 0.004), gunmetalMat);
  guard.position.set(0, -0.056, -0.025);
  shotgunGroup.add(guard);

  // 4. Iconic Underslung 12-Round Cylindrical Rotary Drum Magazine!
  const drumCyl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.092, 0.092, 0.095, 16),
    polymerMat
  );
  drumCyl.rotation.x = Math.PI / 2;
  drumCyl.position.set(0, -0.102, -0.125);
  drumCyl.castShadow = true;
  shotgunGroup.add(drumCyl);

  const drumHub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.042, 0.108, 12),
    mats.titaniumJoint
  );
  drumHub.rotation.x = Math.PI / 2;
  drumHub.position.set(0, -0.102, -0.125);
  shotgunGroup.add(drumHub);

  const drumGlowRing = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.008, 6, 16), flakCoilMat);
  drumGlowRing.position.set(0, -0.102, -0.174);
  shotgunGroup.add(drumGlowRing);

  // 5. Heavy Perforated Barrel Shroud + Underslung Ribbed Pump Forend + Twin Cyan Flak Coils
  const shroud = new THREE.Mesh(createBeveledBox(0.086, 0.088, 0.25, 0.012), gunmetalMat);
  shroud.position.set(0, 0.052, -0.355);
  shroud.castShadow = true;
  shotgunGroup.add(shroud);

  const pumpForend = new THREE.Mesh(createBeveledBox(0.068, 0.058, 0.175, 0.01), polymerMat);
  pumpForend.position.set(0, -0.01, -0.34);
  shotgunGroup.add(pumpForend);

  for (const side of [-1, 1]) {
    const coil = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.02, 0.21), flakCoilMat);
    coil.position.set(side * 0.046, 0.052, -0.355);
    shotgunGroup.add(coil);
  }

  // 6. Heavy Twin-Bore Flak Barrel + Wide Rectangular Duckbill Breacher Choke Brake
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.16, 10), mats.titaniumJoint);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.056, -0.53);
  shotgunGroup.add(barrel);

  const duckbillBrake = new THREE.Mesh(createBeveledBox(0.088, 0.054, 0.086, 0.008), gunmetalMat);
  duckbillBrake.position.set(0, 0.056, -0.625);
  shotgunGroup.add(duckbillBrake);

  const muzzleGlow = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.024, 0.014), flakCoilMat);
  muzzleGlow.position.set(0, 0.056, -0.67);
  shotgunGroup.add(muzzleGlow);

  // 7. Armored Reflex Holo-Sight on Top Rail
  const sightHood = new THREE.Mesh(createBeveledBox(0.058, 0.054, 0.105, 0.009), polymerMat);
  sightHood.position.set(0, 0.138, -0.085);
  shotgunGroup.add(sightHood);

  const sightLens = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.032, 0.01), flakCoilMat);
  sightLens.position.set(0, 0.138, -0.138);
  shotgunGroup.add(sightLens);

  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, 0.056, -0.69);
  shotgunGroup.add(muzzlePoint);

  return { shotgunGroup, muzzlePoint, flakCoilMat };
}

/**
 * Builds AEGIS-RIOT's hulking sculpted powered-exosuit limbs (seamless overlapping joints,
 * layered asymmetric dome pauldrons, armored elbow/knee shells, 5-finger heavy gauntlets,
 * tucked calf exo-hydraulics, wide magnetic-lock stomp boots at y=0, and M90-H Sledgehammer)!
 */
export function buildAegisLimbsAndWeapon(
  pelvis: THREE.Group,
  torso: THREE.Group,
  mats: Floor08EnemyMaterials,
  flashArmorMat: THREE.MeshStandardMaterial
): AegisLimbsAndWeapon {
  const disposables: Array<{ dispose: () => void }> = [];

  const navyCeramicMat = new THREE.MeshStandardMaterial({
    color: 0x1d2938,
    roughness: 0.78,
    metalness: 0.28,
    bumpMap: mats.armorHeavy.bumpMap,
    bumpScale: 0.016,
  });
  const hazardYellowMat = new THREE.MeshStandardMaterial({
    color: 0xd4961a,
    roughness: 0.54,
    metalness: 0.25,
  });
  disposables.push(navyCeramicMat, hazardYellowMat);

  // Sculpted heavy juggernaut arm lofts with generous joint overlap (zero exposed gaps!)
  const upperArmGeo = createLoftedAnatomy(
    [
      { y: 0.04, rx: 0.084, rz: 0.088, squareness: 2.3 },
      { y: -0.09, rx: 0.092, rz: 0.095, squareness: 2.35 },
      { y: -0.21, rx: 0.076, rz: 0.078, squareness: 2.25 },
      { y: -0.33, rx: 0.066, rz: 0.068, squareness: 2.2 },
    ],
    14
  );
  const forearmGeo = createLoftedAnatomy(
    [
      { y: 0.04, rx: 0.07, rz: 0.072, squareness: 2.25 },
      { y: -0.1, rx: 0.078, rz: 0.08, squareness: 2.35 },
      { y: -0.22, rx: 0.062, rz: 0.064, squareness: 2.25 },
      { y: -0.295, rx: 0.052, rz: 0.05, squareness: 2.15 },
    ],
    14
  );
  disposables.push(upperArmGeo, forearmGeo);

  const buildArm = (side: -1 | 1): AegisArmRig => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.31, 0.45, 0);
    torso.add(shoulder);

    shoulder.add(new THREE.Mesh(new THREE.SphereGeometry(0.086, 12, 10), mats.undersuit));

    // Massive Layered Juggernaut Dome Pauldron (left shield-arm even heavier!)
    const pScale = side === -1 ? 1.12 : 1.0;
    const pauldronGeo = createCurvedPanelGeometry(
      [
        { y: -0.11, rx: 0.136 * pScale, rz: 0.132 * pScale, thickness: 0.026 },
        { y: 0.02, rx: 0.132 * pScale, rz: 0.128 * pScale, thickness: 0.028 },
        { y: 0.115, rx: 0.095 * pScale, rz: 0.098 * pScale, thickness: 0.024 },
      ],
      side < 0 ? Math.PI * 0.48 : -Math.PI * 0.52,
      side < 0 ? Math.PI * 1.52 : Math.PI * 0.52,
      16
    );
    disposables.push(pauldronGeo);
    const pauldron = new THREE.Mesh(pauldronGeo, side === -1 ? navyCeramicMat : flashArmorMat);
    pauldron.castShadow = true;
    shoulder.add(pauldron);

    // Bold industrial hazard yellow shoulder chevron bar
    const pHazard = new THREE.Mesh(createBeveledBox(0.022, 0.036, 0.135, 0.005), hazardYellowMat);
    pHazard.position.set(side * (0.145 * pScale), -0.025, 0);
    shoulder.add(pHazard);

    const upperArm = new THREE.Mesh(upperArmGeo, mats.undersuit);
    upperArm.castShadow = true;
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.y = -0.31;
    shoulder.add(elbow);

    // Seamless undersuit hinge + heavy curved elbow armor cap
    elbow.add(new THREE.Mesh(new THREE.SphereGeometry(0.066, 10, 8), mats.undersuit));
    const elbowCapGeo = createCurvedPanelGeometry(
      [
        { y: -0.055, rx: 0.072, rz: 0.074, thickness: 0.018 },
        { y: 0.0, rx: 0.08, rz: 0.082, thickness: 0.02 },
        { y: 0.05, rx: 0.068, rz: 0.07, thickness: 0.018 },
      ],
      Math.PI * 0.14,
      Math.PI * 0.86,
      10
    );
    disposables.push(elbowCapGeo);
    elbow.add(new THREE.Mesh(elbowCapGeo, navyCeramicMat));

    const forearm = new THREE.Mesh(forearmGeo, mats.undersuit);
    forearm.castShadow = true;
    elbow.add(forearm);

    // Heavy armored juggernaut gauntlet bracer
    const bracerGeo = createCurvedPanelGeometry(
      [
        { y: -0.255, rx: 0.066, rz: 0.068, thickness: 0.02 },
        { y: -0.125, rx: 0.082, rz: 0.084, thickness: 0.022 },
        { y: -0.03, rx: 0.076, rz: 0.078, thickness: 0.02 },
      ],
      side < 0 ? Math.PI * 0.52 : -Math.PI * 0.48,
      side < 0 ? Math.PI * 1.48 : Math.PI * 0.48,
      12
    );
    disposables.push(bracerGeo);
    elbow.add(new THREE.Mesh(bracerGeo, flashArmorMat));

    // Articulated 5-finger heavy armored tactical gauntlet
    const hand = createSculptedHand(side, mats.undersuit, navyCeramicMat, mats.titaniumJoint);
    hand.scale.setScalar(1.16);
    hand.position.set(0, -0.282, 0);
    hand.rotation.y = side * -Math.PI * 0.5;
    elbow.add(hand);

    // Hand mount sits inside elbow so weapons & tower shield share exact elbow alignment!
    const handMount = new THREE.Group();
    handMount.position.set(0, -0.28, 0);
    elbow.add(handMount);

    return { shoulder, elbow, handMount };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // Mount gunsmith M90-H Sledgehammer Auto-Shotgun cleanly inside rightArm.elbow!
  // Pistol grip (0, -0.072, 0.032) maps to rightArm.elbow (0, -0.303, 0) -> dead-center inside right gauntlet!
  const sledge = buildM90SledgehammerShotgun(mats, disposables);
  const shotgunGroup = sledge.shotgunGroup;
  shotgunGroup.position.set(0, -0.335, -0.072);
  shotgunGroup.rotation.set(-Math.PI * 0.5, 0, 0);
  rightArm.elbow.add(shotgunGroup);

  // ---------------------------------------------------------------------------
  // HEAVY POWERED-EXOSUIT LEGS + KNEE BATTERING GUARDS + MAGNETIC BOOTS (y=0)
  // ---------------------------------------------------------------------------
  // Pelvis y = 0.98 -> hip y = -0.04 (world 0.94) -> knee y = -0.47 (world 0.47)
  // -> boot sole exact bottom at y = -0.47 -> world y = 0.00!
  const thighGeo = createLoftedAnatomy(
    [
      { y: 0.045, rx: 0.118, rz: 0.124, squareness: 2.35 },
      { y: -0.14, rx: 0.128, rz: 0.134, squareness: 2.4, frontScale: 1.08 },
      { y: -0.31, rx: 0.106, rz: 0.112, squareness: 2.3 },
      { y: -0.5, rx: 0.086, rz: 0.09, squareness: 2.25 },
    ],
    16
  );
  const calfGeo = createLoftedAnatomy(
    [
      { y: 0.06, rx: 0.084, rz: 0.088, squareness: 2.3 },
      { y: -0.13, rx: 0.096, rz: 0.102, squareness: 2.35, backScale: 1.14 },
      { y: -0.28, rx: 0.076, rz: 0.08, squareness: 2.25 },
      { y: -0.4, rx: 0.068, rz: 0.072, squareness: 2.2 },
    ],
    16
  );
  disposables.push(thighGeo, calfGeo);

  const buildLeg = (side: -1 | 1): AegisLegRig => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.15, -0.04, 0);
    pelvis.add(hip);

    const thigh = new THREE.Mesh(thighGeo, navyCeramicMat);
    thigh.castShadow = true;
    hip.add(thigh);

    // Heavy curved outer-front ballistic cuisse plate
    const thighPlateGeo = createCurvedPanelGeometry(
      [
        { y: -0.36, rx: 0.116, rz: 0.124, thickness: 0.022 },
        { y: -0.19, rx: 0.136, rz: 0.144, thickness: 0.024 },
        { y: -0.07, rx: 0.13, rz: 0.138, thickness: 0.022 },
      ],
      side < 0 ? -Math.PI * 0.96 : -Math.PI * 0.62,
      side < 0 ? -Math.PI * 0.38 : -Math.PI * 0.04,
      12
    );
    disposables.push(thighPlateGeo);
    hip.add(new THREE.Mesh(thighPlateGeo, flashArmorMat));

    const knee = new THREE.Group();
    knee.position.y = -0.47;
    hip.add(knee);

    // Seamless knee joint core tucked inside thigh/calf overlap
    knee.add(new THREE.Mesh(new THREE.SphereGeometry(0.082, 12, 10), mats.undersuit));

    // Massive curved juggernaut knee battering-guard shell
    const kneeGuardGeo = createCurvedPanelGeometry(
      [
        { y: -0.068, rx: 0.098, rz: 0.108, thickness: 0.026 },
        { y: 0.015, rx: 0.112, rz: 0.122, thickness: 0.03 },
        { y: 0.085, rx: 0.092, rz: 0.102, thickness: 0.024 },
      ],
      -Math.PI * 0.84,
      -Math.PI * 0.16,
      12
    );
    disposables.push(kneeGuardGeo);
    knee.add(new THREE.Mesh(kneeGuardGeo, navyCeramicMat));

    const calf = new THREE.Mesh(calfGeo, mats.undersuit);
    calf.castShadow = true;
    knee.add(calf);

    // Heavy curved armored greave plate
    const shinGeo = createCurvedPanelGeometry(
      [
        { y: -0.35, rx: 0.078, rz: 0.086, thickness: 0.022 },
        { y: -0.19, rx: 0.098, rz: 0.106, thickness: 0.026 },
        { y: -0.06, rx: 0.102, rz: 0.11, thickness: 0.024 },
      ],
      -Math.PI * 0.88,
      -Math.PI * 0.12,
      12
    );
    disposables.push(shinGeo);
    knee.add(new THREE.Mesh(shinGeo, flashArmorMat));

    // Twin compact rear calf hydraulic pistons tucked strictly inside calf bounds!
    for (const ps of [-1, 1]) {
      const piston = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.014, 0.22, 8),
        mats.titaniumJoint
      );
      piston.position.set(ps * 0.034, -0.19, 0.078);
      piston.rotation.x = 0.04;
      knee.add(piston);
    }

    // Wide Heavy Magnetic-Lock Juggernaut Stomp Boot (exact bottom at y = -0.47 -> world y = 0.00!)
    const bootUpper = new THREE.Mesh(createBeveledBox(0.135, 0.105, 0.185, 0.022), navyCeramicMat);
    bootUpper.position.set(0, -0.405, 0.005);
    knee.add(bootUpper);

    const toeGuard = new THREE.Mesh(createBeveledBox(0.132, 0.078, 0.145, 0.018), flashArmorMat);
    toeGuard.position.set(0, -0.426, -0.108);
    knee.add(toeGuard);

    const bootSole = new THREE.Mesh(createBeveledBox(0.148, 0.036, 0.29, 0.008), mats.titaniumJoint);
    bootSole.position.set(0, -0.452, -0.036);
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
    shotgunGroup,
    muzzlePoint: sledge.muzzlePoint,
    flakCoilMat: sledge.flakCoilMat,
    disposables,
  };
}
