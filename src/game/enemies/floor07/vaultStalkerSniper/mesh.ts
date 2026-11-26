import * as THREE from 'three';
import { createBeveledBox, createLoftedAnatomy } from '../../../core/sculptUtils';
import { createEnemyContactShadow, createEnemyHitboxMesh } from '../../core/enemyMeshShared';
import type { EnemyAnimationInput, EnemyRigHandle } from '../../core/types';
import type { Floor07EnemyMaterials } from '../materials';
import { createVaultStalkerTextures } from './textures';

export interface VaultStalkerRigHandle extends EnemyRigHandle {
  setRailLaser: (active: boolean, length: number, lockRatio: number) => void;
  setCamoOpacity: (opacity: number) => void;
  setRailCharge: (charge: number) => void;
  setWristBladeActive: (active: boolean, intensity?: number) => void;
  getBladeTipWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  getSpineThrusterWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  getMineHandWorldPos: (out: THREE.Vector3) => THREE.Vector3;
}

/**
 * Helper to build a tapered extruded stealth coat-tail or asymmetrical shoulder mantle drape.
 */
function createTaperedDrapeGeo(
  topHalfW: number,
  botHalfW: number,
  length: number,
  thickness: number
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-topHalfW, 0);
  shape.lineTo(topHalfW, 0);
  shape.quadraticCurveTo(botHalfW * 1.06, -length * 0.58, botHalfW * 0.82, -length);
  shape.lineTo(-botHalfW * 0.15, -length * 0.92);
  shape.lineTo(-botHalfW * 0.96, -length * 0.98);
  shape.quadraticCurveTo(-topHalfW * 1.04, -length * 0.52, -topHalfW, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.32,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.translate(0, 0, -thickness * 0.5);
  return geo;
}

/**
 * Helper to build the sculpted side profile of the "SPECTRE-VII" bullpup rail-sniper chassis.
 */
function createSniperChassisGeo(): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  // Coordinates in (zForward=-x, yUp=y), later rotated so -Z is forward!
  s.moveTo(-0.44, -0.055); // rear buttstock bottom
  s.lineTo(-0.44, 0.068); // rear buttstock top
  s.lineTo(-0.18, 0.072); // cheek riser
  s.lineTo(-0.08, 0.082); // receiver rail step
  s.lineTo(0.46, 0.076); // upper handguard nose
  s.lineTo(0.52, 0.036); // angled front shroud bevel
  s.lineTo(0.48, -0.032); // lower handguard nose
  s.lineTo(0.14, -0.038); // trigger guard front
  s.lineTo(0.06, -0.145); // angled tactical pistol grip bottom
  s.lineTo(-0.02, -0.14); // pistol grip back
  s.lineTo(0.02, -0.048); // grip neck
  s.lineTo(-0.18, -0.048); // bullpup mag well
  s.lineTo(-0.24, -0.082); // stock toe curve
  s.closePath();

  // Thumbhole cutout in bullpup stock
  const hole = new THREE.Path();
  hole.moveTo(-0.36, -0.032);
  hole.lineTo(-0.16, -0.032);
  hole.lineTo(-0.14, 0.032);
  hole.lineTo(-0.36, 0.028);
  hole.closePath();
  s.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.056,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.006,
    bevelSegments: 2,
  });
  // Rotate so shape +X maps to local -Z (weapon muzzle forward!)
  geo.rotateY(Math.PI / 2);
  geo.translate(-0.028, 0, 0);
  return geo;
}

/**
 * Helper to build the sleek curved Phase-Mantis Wrist-Blade geometry.
 */
function createMantisBladeGeo(): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, -0.016);
  s.lineTo(0.04, 0.028);
  s.quadraticCurveTo(0.32, 0.042, 0.64, -0.006); // razor tip
  s.quadraticCurveTo(0.34, -0.038, 0.02, -0.024);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.01,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
  });
  geo.rotateY(Math.PI / 2);
  geo.translate(-0.005, 0, 0);
  return geo;
}

/**
 * AAA Showcase Rig for VAULT STALKER "PHANTOM-VII" (Floor 07 Zone Mini-Boss #2):
 * - Sleek 2.04m hooded active-camo recon assassin & electromagnetic rail-sniper
 * - Bespoke procedural PBR textures: hex-carbon ceramic plates, optical-camo hex-mesh cloak fabric,
 *   fluted titanium rail chassis, and multi-lens recon visor optic aperture
 * - Sculpted curved sniper hood, asymmetrical draped shoulder mantle + comms antenna mast,
 *   split flowing coat-tails, dorsal Optical-Camo Phase-Capacitor spine, left retractable Phase-Mantis
 *   Wrist-Blade, and two-handed 1.82m "SPECTRE-VII" bullpup rail-sniper rifle with dual-layer laser beam!
 */
export function buildVaultStalkerSniperRig(
  enemyId: string,
  mats: Floor07EnemyMaterials
): VaultStalkerRigHandle {
  const root = new THREE.Group();
  const tex = createVaultStalkerTextures();

  // Per-instance camo-capable PBR materials so Active-Camo smoothly modulates the entire rig!
  const armorMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.armorAlbedo,
    bumpMap: tex.armorBump,
    bumpScale: 0.018,
    roughnessMap: tex.armorRoughness,
    roughness: 0.62,
    metalness: 0.48,
    transparent: true,
    opacity: 1.0,
  });

  const undersuitMat = new THREE.MeshStandardMaterial({
    color: 0x161d26,
    bumpMap: tex.armorBump,
    bumpScale: 0.012,
    roughness: 0.78,
    metalness: 0.22,
    transparent: true,
    opacity: 1.0,
  });

  const cloakMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.cloakAlbedo,
    bumpMap: tex.cloakBump,
    bumpScale: 0.022,
    roughnessMap: tex.cloakRoughness,
    roughness: 0.86,
    metalness: 0.14,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1.0,
  });

  const titaniumMat = new THREE.MeshStandardMaterial({
    color: 0x526578,
    bumpMap: tex.rifleBump,
    bumpScale: 0.012,
    roughness: 0.34,
    metalness: 0.82,
    transparent: true,
    opacity: 1.0,
  });

  const rifleChassisMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.rifleAlbedo,
    bumpMap: tex.rifleBump,
    bumpScale: 0.016,
    roughness: 0.42,
    metalness: 0.66,
    transparent: true,
    opacity: 1.0,
  });

  const obsidianMat = new THREE.MeshStandardMaterial({
    color: 0x0b1017,
    roughness: 0.24,
    metalness: 0.72,
    transparent: true,
    opacity: 1.0,
  });

  // Emissive Recon Visor Optic Weakpoint Material
  const weakpointMat = new THREE.MeshStandardMaterial({
    color: 0x28f0ff,
    map: tex.opticCoreMap,
    emissive: new THREE.Color(0x1ee8ff),
    emissiveMap: tex.opticCoreMap,
    emissiveIntensity: 3.1,
    roughness: 0.14,
    metalness: 0.2,
    transparent: true,
    opacity: 1.0,
  });

  // Dorsal Optical-Camo Phase-Capacitor & Rail Accelerator Coil glow material
  const phaseCoilMat = new THREE.MeshStandardMaterial({
    color: 0x2ceeff,
    emissive: new THREE.Color(0x1cd8ff),
    emissiveIntensity: 2.2,
    roughness: 0.22,
    metalness: 0.35,
    transparent: true,
    opacity: 0.96,
  });

  // Retractable Phase-Mantis Wrist-Blade edge material
  const bladeEdgeMat = new THREE.MeshStandardMaterial({
    color: 0xd8ffff,
    emissive: new THREE.Color(0x22eeff),
    emissiveIntensity: 2.6,
    roughness: 0.12,
    metalness: 0.68,
    transparent: true,
    opacity: 0.96,
  });

  const camoBodyMats = [
    armorMat,
    undersuitMat,
    cloakMat,
    titaniumMat,
    rifleChassisMat,
    obsidianMat,
  ];

  root.add(createEnemyContactShadow(0.62, mats.contactShadow));

  // === PELVIS, TACTICAL UTILITY BELT & SPLIT FLOWING TRENCH-COAT TAILS ===
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 1.04, 0);
  root.add(pelvis);

  const pelvisCore = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: 0.1, rx: 0.165, rz: 0.125, squareness: 2.6 },
        { y: 0.0, rx: 0.175, rz: 0.132, squareness: 2.7 },
        { y: -0.09, rx: 0.138, rz: 0.11, squareness: 2.3 },
      ],
      14
    ),
    undersuitMat
  );
  pelvisCore.castShadow = true;
  pelvis.add(pelvisCore);

  // Sculpted armored tactical belt & groin codpiece plate
  const beltBand = new THREE.Mesh(createBeveledBox(0.37, 0.088, 0.275, 0.014), armorMat);
  beltBand.position.set(0, 0.055, 0);
  pelvis.add(beltBand);

  const beltBuckle = new THREE.Mesh(createBeveledBox(0.095, 0.072, 0.042, 0.008), titaniumMat);
  beltBuckle.position.set(0, 0.055, -0.14);
  pelvis.add(beltBuckle);

  const frontTasset = new THREE.Mesh(createBeveledBox(0.145, 0.165, 0.05, 0.012), armorMat);
  frontTasset.position.set(0, -0.055, -0.122);
  frontTasset.rotation.x = -0.08;
  pelvis.add(frontTasset);

  // Hip utility pouches + twin magnetic Cryo-Shock Flush Mine canisters on rear belt!
  for (const side of [-1, 1] as const) {
    const hipPouch = new THREE.Mesh(createBeveledBox(0.068, 0.125, 0.115, 0.01), armorMat);
    hipPouch.position.set(side * 0.2, 0.01, -0.02);
    pelvis.add(hipPouch);

    const mineGroup = new THREE.Group();
    mineGroup.position.set(side * 0.11, 0.03, 0.155);
    mineGroup.rotation.z = side * 0.18;
    pelvis.add(mineGroup);

    const mineBody = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.12, 10), titaniumMat);
    mineGroup.add(mineBody);
    const mineRing = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.007, 6, 12), phaseCoilMat);
    mineRing.rotation.x = Math.PI / 2;
    mineGroup.add(mineRing);
  }

  // Split twin flowing Optical-Camo Trench-Coat Tails (articulated at rear belt, flaring cleanly BACKWARD -X!)
  const coatTailGeo = createTaperedDrapeGeo(0.115, 0.165, 0.76, 0.018);
  const leftCoatTail = new THREE.Group();
  leftCoatTail.position.set(-0.115, 0.02, 0.142);
  leftCoatTail.rotation.set(-0.24, -0.22, -0.09);
  pelvis.add(leftCoatTail);
  const leftCoatMesh = new THREE.Mesh(coatTailGeo, cloakMat);
  leftCoatMesh.castShadow = true;
  leftCoatTail.add(leftCoatMesh);

  const rightCoatTail = new THREE.Group();
  rightCoatTail.position.set(0.115, 0.02, 0.142);
  rightCoatTail.rotation.set(-0.24, 0.22, 0.09);
  pelvis.add(rightCoatTail);
  const rightCoatMesh = new THREE.Mesh(coatTailGeo, cloakMat);
  rightCoatMesh.castShadow = true;
  rightCoatTail.add(rightCoatMesh);

  // Side hip-skirt stealth flaps angled slightly outward over outer thighs
  const sideFlapGeo = createTaperedDrapeGeo(0.072, 0.092, 0.36, 0.014);
  for (const side of [-1, 1] as const) {
    const flap = new THREE.Mesh(sideFlapGeo, cloakMat);
    flap.position.set(side * 0.205, 0.01, 0.035);
    flap.rotation.set(-0.12, side * (Math.PI * 0.44), side * 0.18);
    pelvis.add(flap);
  }

  // === ATHLETIC PREDATOR STEALTH LEGS (Digitigrade-Inspired Greaves + Talon Boots) ===
  const buildStalkerLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();

    const thighMesh = new THREE.Mesh(
      createLoftedAnatomy(
        [
          { y: 0.02, rx: 0.086, rz: 0.094, squareness: 2.3 },
          { y: -0.18, rx: 0.082, rz: 0.09, squareness: 2.4 },
          { y: -0.36, rx: 0.068, rz: 0.074, squareness: 2.3 },
          { y: -0.48, rx: 0.058, rz: 0.062, squareness: 2.1 },
        ],
        14
      ),
      undersuitMat
    );
    thighMesh.castShadow = true;
    hip.add(thighMesh);

    // Sculpted outer ceramic thigh armor shield + double tactical strap
    const thighPlate = new THREE.Mesh(createBeveledBox(0.058, 0.27, 0.145, 0.012), armorMat);
    thighPlate.position.set(side * 0.072, -0.22, -0.008);
    thighPlate.rotation.z = side * -0.06;
    thighPlate.castShadow = true;
    hip.add(thighPlate);

    const thighStrap = new THREE.Mesh(
      new THREE.TorusGeometry(0.082, 0.01, 6, 14),
      titaniumMat
    );
    thighStrap.rotation.x = Math.PI / 2;
    thighStrap.position.set(0, -0.22, 0);
    hip.add(thighStrap);

    const knee = new THREE.Group();
    knee.position.set(0, -0.48, 0);
    hip.add(knee);

    // Articulated angular knee-blade cap
    const kneeJoint = new THREE.Mesh(new THREE.SphereGeometry(0.056, 10, 10), titaniumMat);
    knee.add(kneeJoint);

    const kneeBlade = new THREE.Mesh(createBeveledBox(0.098, 0.145, 0.068, 0.014), armorMat);
    kneeBlade.position.set(0, 0.015, -0.052);
    kneeBlade.rotation.x = -0.16;
    knee.add(kneeBlade);

    // Sleek sculpted carbon-ceramic shin greave
    const shinMesh = new THREE.Mesh(
      createLoftedAnatomy(
        [
          { y: -0.02, rx: 0.062, rz: 0.072, squareness: 2.4 },
          { y: -0.16, rx: 0.068, rz: 0.082, squareness: 2.6 },
          { y: -0.34, rx: 0.052, rz: 0.064, squareness: 2.4 },
          { y: -0.46, rx: 0.044, rz: 0.054, squareness: 2.2 },
        ],
        14
      ),
      armorMat
    );
    shinMesh.castShadow = true;
    knee.add(shinMesh);

    // Rear Achilles hydraulic spring-dampener piston strut
    const achillesPiston = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.012, 0.36, 8),
      titaniumMat
    );
    achillesPiston.position.set(0, -0.24, 0.068);
    achillesPiston.rotation.x = 0.09;
    knee.add(achillesPiston);

    // Silent split-toe talon stealth combat boot (bottom flush at y = -0.52 -> world y = 0!)
    const bootChassis = new THREE.Mesh(createBeveledBox(0.102, 0.082, 0.245, 0.014), armorMat);
    bootChassis.position.set(side * 0.004, -0.478, -0.042);
    bootChassis.castShadow = true;
    knee.add(bootChassis);

    const toeCap = new THREE.Mesh(createBeveledBox(0.096, 0.048, 0.105, 0.01), titaniumMat);
    toeCap.position.set(side * 0.004, -0.494, -0.152);
    knee.add(toeCap);

    const heelSpur = new THREE.Mesh(createBeveledBox(0.052, 0.046, 0.075, 0.008), titaniumMat);
    heelSpur.position.set(0, -0.492, 0.082);
    knee.add(heelSpur);

    return { hip, knee };
  };

  const leftLeg = buildStalkerLeg(-1);
  leftLeg.hip.position.set(-0.125, -0.04, 0);
  pelvis.add(leftLeg.hip);

  const rightLeg = buildStalkerLeg(1);
  rightLeg.hip.position.set(0.125, -0.04, 0);
  pelvis.add(rightLeg.hip);

  // === V-TAPERED RECON TORSO, ASYMMETRICAL PONCHO MANTLE & DORSAL CLOAK GENERATOR ===
  const torso = new THREE.Group();
  torso.position.set(0, 0.1, 0);
  pelvis.add(torso);

  // Sculpted athletic V-tapered core torso
  const torsoCore = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: 0.0, rx: 0.155, rz: 0.118, squareness: 2.5 },
        { y: 0.18, rx: 0.188, rz: 0.132, squareness: 2.7 },
        { y: 0.38, rx: 0.232, rz: 0.145, squareness: 2.8 },
        { y: 0.5, rx: 0.205, rz: 0.128, squareness: 2.5 },
      ],
      16
    ),
    undersuitMat
  );
  torsoCore.castShadow = true;
  torso.add(torsoCore);

  // Layered faceted hexagonal ceramic chest plates (left/right pectoral glacis + sternum core)
  for (const side of [-1, 1] as const) {
    const pecPlate = new THREE.Mesh(createBeveledBox(0.175, 0.22, 0.068, 0.014), armorMat);
    pecPlate.position.set(side * 0.112, 0.34, -0.118);
    pecPlate.rotation.set(-0.14, side * -0.22, side * 0.08);
    pecPlate.castShadow = true;
    torso.add(pecPlate);

    const ribPlate = new THREE.Mesh(createBeveledBox(0.145, 0.135, 0.058, 0.012), armorMat);
    ribPlate.position.set(side * 0.102, 0.155, -0.106);
    ribPlate.rotation.set(0.06, side * -0.18, 0);
    torso.add(ribPlate);

    // Lower abdominal tactical mag pouch & oblique harness plate closing the midriff gap!
    const abPouch = new THREE.Mesh(createBeveledBox(0.115, 0.095, 0.055, 0.01), armorMat);
    abPouch.position.set(side * 0.096, 0.055, -0.108);
    abPouch.rotation.set(0.04, side * -0.16, 0);
    torso.add(abPouch);
  }

  // Layered armored abdominal lamellar segments connecting sternum to belt
  const abPlateUpper = new THREE.Mesh(createBeveledBox(0.165, 0.072, 0.05, 0.01), armorMat);
  abPlateUpper.position.set(0, 0.12, -0.118);
  torso.add(abPlateUpper);

  const abPlateLower = new THREE.Mesh(createBeveledBox(0.148, 0.072, 0.048, 0.01), titaniumMat);
  abPlateLower.position.set(0, 0.045, -0.114);
  torso.add(abPlateLower);

  // Central recessed telemetry sternum housing + glowing vertical phase slit
  const sternumHousing = new THREE.Mesh(createBeveledBox(0.092, 0.24, 0.055, 0.01), obsidianMat);
  sternumHousing.position.set(0, 0.31, -0.132);
  torso.add(sternumHousing);

  const sternumSlit = new THREE.Mesh(createBeveledBox(0.024, 0.165, 0.024, 0.004), phaseCoilMat);
  sternumSlit.position.set(0, 0.31, -0.152);
  torso.add(sternumSlit);

  // Armored collar / ballistic gorget framing the hood
  const collarRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.138, 0.036, 8, 16),
    cloakMat
  );
  collarRing.rotation.x = Math.PI / 2 + 0.14;
  collarRing.position.set(0, 0.515, -0.008);
  torso.add(collarRing);

  // Asymmetrical Draped Optical-Camo Recon Sniper Mantle over LEFT shoulder & upper back!
  const mantleFront = new THREE.Mesh(createTaperedDrapeGeo(0.125, 0.165, 0.32, 0.018), cloakMat);
  mantleFront.position.set(-0.155, 0.51, -0.098);
  mantleFront.rotation.set(0.22, 0.38, -0.18);
  mantleFront.castShadow = true;
  torso.add(mantleFront);

  const mantleBack = new THREE.Mesh(createTaperedDrapeGeo(0.19, 0.25, 0.52, 0.018), cloakMat);
  mantleBack.position.set(-0.105, 0.52, 0.138);
  mantleBack.rotation.set(-0.26, -0.16, -0.1);
  mantleBack.castShadow = true;
  torso.add(mantleBack);

  const shoulderShawlCap = new THREE.Mesh(createBeveledBox(0.22, 0.072, 0.24, 0.024), cloakMat);
  shoulderShawlCap.position.set(-0.188, 0.5, 0.008);
  shoulderShawlCap.rotation.z = 0.28;
  torso.add(shoulderShawlCap);

  // Left-clavicle tall Recon Telemetry Antenna Mast + micro-beacon tip
  const antennaBase = new THREE.Mesh(createBeveledBox(0.048, 0.075, 0.052, 0.008), titaniumMat);
  antennaBase.position.set(-0.18, 0.545, 0.075);
  torso.add(antennaBase);

  const antennaMast = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.011, 0.42, 8), titaniumMat);
  antennaMast.position.set(-0.19, 0.76, 0.095);
  antennaMast.rotation.set(-0.12, 0, 0.1);
  torso.add(antennaMast);

  const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), phaseCoilMat);
  antennaTip.position.set(-0.21, 0.96, 0.12);
  torso.add(antennaTip);

  // Dorsal Optical-Camo Generator Spine & 3 Glowing Phase-Capacitor Fins
  const dorsalPack = new THREE.Group();
  dorsalPack.position.set(0.02, 0.34, 0.165);
  torso.add(dorsalPack);

  const packChassis = new THREE.Mesh(createBeveledBox(0.24, 0.34, 0.115, 0.018), armorMat);
  packChassis.castShadow = true;
  dorsalPack.add(packChassis);

  const packSpine = new THREE.Mesh(createBeveledBox(0.095, 0.38, 0.135, 0.014), titaniumMat);
  packSpine.position.set(0, 0.02, 0.025);
  dorsalPack.add(packSpine);

  // 3 Angled Glowing Optical-Camo Phase-Capacitor Fins
  const phaseFins: THREE.Mesh[] = [];
  const finConfigs = [
    { x: 0, y: 0.1, z: 0.088, rx: -0.22, rz: 0, h: 0.26 },
    { x: -0.095, y: 0.04, z: 0.072, rx: -0.18, rz: 0.36, h: 0.21 },
    { x: 0.095, y: 0.04, z: 0.072, rx: -0.18, rz: -0.36, h: 0.21 },
  ];
  for (const fc of finConfigs) {
    const fin = new THREE.Mesh(createBeveledBox(0.022, fc.h, 0.075, 0.005), phaseCoilMat);
    fin.position.set(fc.x, fc.y, fc.z);
    fin.rotation.set(fc.rx, 0, fc.rz);
    dorsalPack.add(fin);
    phaseFins.push(fin);
  }

  // Lower micro-thruster vernier jets for Cloak-Flank Dash
  for (const side of [-1, 1] as const) {
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.036, 0.075, 10), titaniumMat);
    nozzle.position.set(side * 0.082, -0.18, 0.042);
    nozzle.rotation.x = 0.38;
    dorsalPack.add(nozzle);

    const jetCore = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, 0.024, 8), phaseCoilMat);
    jetCore.position.set(side * 0.082, -0.215, 0.056);
    jetCore.rotation.x = 0.38;
    dorsalPack.add(jetCore);
  }

  const spineThrusterAnchor = new THREE.Object3D();
  spineThrusterAnchor.position.set(0, -0.16, 0.11);
  dorsalPack.add(spineThrusterAnchor);

  // === ICONIC SCULPTED HOODED SNIPER HEAD & MULTI-LENS TRI-OPTIC VISOR (WEAKPOINT!) ===
  const head = new THREE.Group();
  head.position.set(0, 0.565, -0.015);
  torso.add(head);

  // Inner armored stealth skull & obsidian faceplate
  const helmetCore = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: -0.02, rx: 0.088, rz: 0.095, squareness: 2.1 },
        { y: 0.06, rx: 0.104, rz: 0.122, squareness: 2.3 },
        { y: 0.16, rx: 0.106, rz: 0.124, squareness: 2.2 },
        { y: 0.24, rx: 0.072, rz: 0.088, squareness: 2.0 },
      ],
      14
    ),
    obsidianMat
  );
  helmetCore.castShadow = true;
  head.add(helmetCore);

  // Sculpted angular jaw respirator mask with twin side filtration cartridges
  const jawMask = new THREE.Mesh(createBeveledBox(0.115, 0.088, 0.075, 0.016), armorMat);
  jawMask.position.set(0, 0.038, -0.106);
  jawMask.rotation.x = 0.18;
  head.add(jawMask);

  for (const side of [-1, 1] as const) {
    const filterCan = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.044, 10), titaniumMat);
    filterCan.rotation.set(Math.PI / 2, 0, side * 0.45);
    filterCan.position.set(side * 0.064, 0.032, -0.118);
    head.add(filterCan);
  }

  // Sculpted Tapered Assassin Sniper Hood / Cowl (sleek pointed crown + angled recessed cowl cheeks!)
  const hoodCrown = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: -0.01, rx: 0.134, rz: 0.142, squareness: 2.0 },
        { y: 0.09, rx: 0.136, rz: 0.152, squareness: 2.0 },
        { y: 0.195, rx: 0.114, rz: 0.148, squareness: 1.9 },
        { y: 0.278, rx: 0.048, rz: 0.105, squareness: 1.8 },
      ],
      16
    ),
    cloakMat
  );
  hoodCrown.position.set(0, -0.005, 0.024);
  hoodCrown.castShadow = true;
  head.add(hoodCrown);

  // Sculpted tapered sniper hood brow cowl shading the glowing optic visor
  const hoodPeak = new THREE.Mesh(createBeveledBox(0.185, 0.042, 0.155, 0.018), cloakMat);
  hoodPeak.position.set(0, 0.215, -0.074);
  hoodPeak.rotation.x = 0.28;
  head.add(hoodPeak);

  for (const side of [-1, 1] as const) {
    const hoodCheek = new THREE.Mesh(createBeveledBox(0.032, 0.215, 0.145, 0.014), cloakMat);
    hoodCheek.position.set(side * 0.108, 0.102, -0.032);
    hoodCheek.rotation.set(0.06, side * -0.26, side * 0.16);
    head.add(hoodCheek);
  }

  // SIGNATURE GLOWING MULTI-LENS RECON VISOR OPTIC (WEAKPOINT!)
  const visorBar = new THREE.Mesh(createBeveledBox(0.182, 0.056, 0.034, 0.008), weakpointMat);
  visorBar.position.set(0, 0.122, -0.126);
  head.add(visorBar);

  // Right-eye protruding Telescopic Sniper Rangefinder Macro-Lens
  const macroBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.048, 0.058, 14), titaniumMat);
  macroBezel.rotation.x = Math.PI / 2;
  macroBezel.position.set(0.052, 0.124, -0.145);
  head.add(macroBezel);

  const macroLens = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.022, 14), weakpointMat);
  macroLens.rotation.x = Math.PI / 2;
  macroLens.position.set(0.052, 0.124, -0.172);
  head.add(macroLens);

  // Left-eye dual stacked micro-sensor optics
  const leftOpticUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.038, 10), weakpointMat);
  leftOpticUpper.rotation.x = Math.PI / 2;
  leftOpticUpper.position.set(-0.048, 0.136, -0.145);
  head.add(leftOpticUpper);

  const leftOpticLower = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.038, 10), weakpointMat);
  leftOpticLower.rotation.x = Math.PI / 2;
  leftOpticLower.position.set(-0.058, 0.104, -0.143);
  head.add(leftOpticLower);

  const weakpointAnchor = new THREE.Object3D();
  weakpointAnchor.position.set(0.02, 0.124, -0.185);
  head.add(weakpointAnchor);

  // === LEFT ARM + RETRACTABLE PHASE-MANTIS WRIST-BLADE ===
  const leftShoulder = new THREE.Group();
  leftShoulder.position.set(-0.245, 0.44, -0.01);
  torso.add(leftShoulder);

  const leftShoulderSocket = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), armorMat);
  leftShoulder.add(leftShoulderSocket);

  const leftUpperArm = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: 0, rx: 0.056, rz: 0.058, squareness: 2.2 },
        { y: -0.14, rx: 0.052, rz: 0.056, squareness: 2.2 },
        { y: -0.28, rx: 0.045, rz: 0.048, squareness: 2.1 },
      ],
      12
    ),
    undersuitMat
  );
  leftUpperArm.castShadow = true;
  leftShoulder.add(leftUpperArm);

  const leftElbow = new THREE.Group();
  leftElbow.position.set(0, -0.28, 0);
  leftShoulder.add(leftElbow);

  const leftElbowPad = new THREE.Mesh(createBeveledBox(0.072, 0.082, 0.072, 0.012), titaniumMat);
  leftElbow.add(leftElbowPad);

  // Sculpted stealth gauntlet bracer housing the retractable Phase-Mantis Wrist-Blade
  const leftForearm = new THREE.Mesh(createBeveledBox(0.088, 0.275, 0.098, 0.016), armorMat);
  leftForearm.position.set(0, -0.15, 0);
  leftForearm.castShadow = true;
  leftElbow.add(leftForearm);

  const bladeHousing = new THREE.Mesh(createBeveledBox(0.042, 0.22, 0.064, 0.008), titaniumMat);
  bladeHousing.position.set(-0.048, -0.16, -0.024);
  leftElbow.add(bladeHousing);

  const mantisBladePivot = new THREE.Group();
  mantisBladePivot.position.set(-0.058, -0.24, -0.022);
  mantisBladePivot.rotation.x = Math.PI / 2; // points straight along forearm when extended!
  leftElbow.add(mantisBladePivot);

  const mantisBladeMesh = new THREE.Mesh(createMantisBladeGeo(), bladeEdgeMat);
  mantisBladeMesh.scale.set(1, 1, 0.05); // retracted by default
  mantisBladeMesh.visible = false;
  mantisBladePivot.add(mantisBladeMesh);

  const bladeTipAnchor = new THREE.Object3D();
  bladeTipAnchor.position.set(0, 0, -0.62);
  mantisBladePivot.add(bladeTipAnchor);

  const leftHand = new THREE.Mesh(createBeveledBox(0.068, 0.088, 0.072, 0.012), obsidianMat);
  leftHand.position.set(0, -0.305, -0.01);
  leftElbow.add(leftHand);

  const mineHandAnchor = new THREE.Object3D();
  mineHandAnchor.position.set(0, -0.34, -0.04);
  leftElbow.add(mineHandAnchor);

  // === RIGHT ARM (Low-Profile Sniper Pauldron) + "SPECTRE-VII" ELECTROMAGNETIC RAIL-SNIPER RIFLE ===
  const rightShoulder = new THREE.Group();
  rightShoulder.position.set(0.245, 0.44, -0.01);
  torso.add(rightShoulder);

  const rightPauldron = new THREE.Mesh(createBeveledBox(0.135, 0.125, 0.175, 0.022), armorMat);
  rightPauldron.position.set(0.032, 0.025, 0);
  rightPauldron.rotation.z = -0.26;
  rightPauldron.castShadow = true;
  rightShoulder.add(rightPauldron);

  const rightUpperArm = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: 0, rx: 0.056, rz: 0.058, squareness: 2.2 },
        { y: -0.14, rx: 0.052, rz: 0.056, squareness: 2.2 },
        { y: -0.28, rx: 0.045, rz: 0.048, squareness: 2.1 },
      ],
      12
    ),
    undersuitMat
  );
  rightUpperArm.castShadow = true;
  rightShoulder.add(rightUpperArm);

  const rightElbow = new THREE.Group();
  rightElbow.position.set(0, -0.28, 0);
  rightShoulder.add(rightElbow);

  const rightElbowPad = new THREE.Mesh(createBeveledBox(0.072, 0.082, 0.072, 0.012), titaniumMat);
  rightElbow.add(rightElbowPad);

  const rightForearm = new THREE.Mesh(createBeveledBox(0.084, 0.27, 0.092, 0.014), armorMat);
  rightForearm.position.set(0, -0.15, 0);
  rightForearm.castShadow = true;
  rightElbow.add(rightForearm);

  const rightHand = new THREE.Mesh(createBeveledBox(0.068, 0.086, 0.072, 0.012), obsidianMat);
  rightHand.position.set(0, -0.3, -0.01);
  rightElbow.add(rightHand);

  // "SPECTRE-VII" Long-Barrel Bullpup Electromagnetic Rail-Sniper Rifle (1.82m total length!)
  const railRifle = new THREE.Group();
  railRifle.position.set(0.18, 0.37, -0.34);
  torso.add(railRifle);

  const chassisMesh = new THREE.Mesh(createSniperChassisGeo(), rifleChassisMat);
  chassisMesh.castShadow = true;
  railRifle.add(chassisMesh);

  // Detachable angled magnetic battery cell magazine in bullpup rear well
  const magCell = new THREE.Mesh(createBeveledBox(0.046, 0.145, 0.095, 0.008), obsidianMat);
  magCell.position.set(0, -0.095, 0.195);
  magCell.rotation.x = 0.22;
  railRifle.add(magCell);

  const magStrip = new THREE.Mesh(createBeveledBox(0.05, 0.09, 0.018, 0.004), phaseCoilMat);
  magStrip.position.set(0, -0.09, 0.195);
  magStrip.rotation.x = 0.22;
  railRifle.add(magStrip);

  // Twin parallel fluted titanium electromagnetic accelerator rails (sleek tactical 1.44m anti-materiel profile!)
  const upperRail = new THREE.Mesh(createBeveledBox(0.042, 0.03, 0.72, 0.006), rifleChassisMat);
  upperRail.position.set(0, 0.044, -0.64);
  upperRail.castShadow = true;
  railRifle.add(upperRail);

  const lowerRail = new THREE.Mesh(createBeveledBox(0.042, 0.028, 0.69, 0.006), titaniumMat);
  lowerRail.position.set(0, -0.014, -0.625);
  lowerRail.castShadow = true;
  railRifle.add(lowerRail);

  // Glowing inner magnetic induction plasma channel + 4 ribbed accelerator coil fins
  const plasmaChannelMat = phaseCoilMat.clone();
  const plasmaChannel = new THREE.Mesh(createBeveledBox(0.02, 0.022, 0.64, 0.004), plasmaChannelMat);
  plasmaChannel.position.set(0, 0.015, -0.63);
  railRifle.add(plasmaChannel);

  for (let i = 0; i < 4; i++) {
    const coilBrace = new THREE.Mesh(createBeveledBox(0.062, 0.094, 0.024, 0.005), titaniumMat);
    coilBrace.position.set(0, 0.015, -0.44 - i * 0.155);
    railRifle.add(coilBrace);
  }

  // Aggressive slotted polygonal muzzle brake
  const muzzleBrake = new THREE.Mesh(createBeveledBox(0.058, 0.084, 0.125, 0.01), obsidianMat);
  muzzleBrake.position.set(0, 0.015, -1.04);
  railRifle.add(muzzleBrake);

  // Folded twin precision bipod legs tucked neatly beneath the handguard
  for (const side of [-1, 1] as const) {
    const bipodLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.007, 0.22, 6), titaniumMat);
    bipodLeg.rotation.x = Math.PI / 2 - 0.12;
    bipodLeg.position.set(side * 0.036, -0.052, -0.52);
    railRifle.add(bipodLeg);
  }

  // Long-eye-relief Ballistic Rail-Scope + sunshade hood + turret knobs + glowing objective lens!
  const scopeMount = new THREE.Mesh(createBeveledBox(0.036, 0.048, 0.22, 0.006), obsidianMat);
  scopeMount.position.set(0, 0.096, -0.06);
  railRifle.add(scopeMount);

  const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.36, 12), obsidianMat);
  scopeTube.rotation.x = Math.PI / 2;
  scopeTube.position.set(0, 0.138, -0.08);
  railRifle.add(scopeTube);

  const scopeObjectiveBell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.026, 0.12, 14),
    titaniumMat
  );
  scopeObjectiveBell.rotation.x = Math.PI / 2;
  scopeObjectiveBell.position.set(0, 0.138, -0.3);
  railRifle.add(scopeObjectiveBell);

  const scopeObjectiveLens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.032, 0.014, 14),
    weakpointMat
  );
  scopeObjectiveLens.rotation.x = Math.PI / 2;
  scopeObjectiveLens.position.set(0, 0.138, -0.358);
  railRifle.add(scopeObjectiveLens);

  const scopeEyepiece = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.024, 0.08, 12),
    titaniumMat
  );
  scopeEyepiece.rotation.x = Math.PI / 2;
  scopeEyepiece.position.set(0, 0.138, 0.12);
  railRifle.add(scopeEyepiece);

  const scopeTurretTop = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.026, 8), titaniumMat);
  scopeTurretTop.position.set(0, 0.168, -0.08);
  railRifle.add(scopeTurretTop);

  // Underbarrel Laser Rangefinder Emitter & Dual-Layer Wall-Clipped Targeting Laser Beam!
  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, 0.015, -1.11);
  railRifle.add(muzzlePoint);

  const laserCoreMat = new THREE.MeshBasicMaterial({
    color: 0xe6ffff,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
  const laserGlowMat = new THREE.MeshBasicMaterial({
    color: 0x28f0ff,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });

  const laserCoreGeo = new THREE.CylinderGeometry(0.008, 0.008, 1.0, 6);
  laserCoreGeo.rotateX(Math.PI / 2);
  laserCoreGeo.translate(0, 0, -0.5);
  const laserCoreMesh = new THREE.Mesh(laserCoreGeo, laserCoreMat);
  laserCoreMesh.visible = false;
  muzzlePoint.add(laserCoreMesh);

  const laserGlowGeo = new THREE.CylinderGeometry(0.024, 0.024, 1.0, 6);
  laserGlowGeo.rotateX(Math.PI / 2);
  laserGlowGeo.translate(0, 0, -0.5);
  const laserGlowMesh = new THREE.Mesh(laserGlowGeo, laserGlowMat);
  laserGlowMesh.visible = false;
  muzzlePoint.add(laserGlowMesh);

  // === HITBOXES (Generous head visor optic weakpoint + sleek body hitbox) ===
  const bodyHitbox = createEnemyHitboxMesh(enemyId, 'body', new THREE.BoxGeometry(0.68, 1.52, 0.48));
  bodyHitbox.position.set(0, 0.84, 0);
  root.add(bodyHitbox);

  const wpHitbox = createEnemyHitboxMesh(
    enemyId,
    'weakpoint',
    new THREE.BoxGeometry(0.38, 0.34, 0.4),
    'visor_optic'
  );
  wpHitbox.position.set(0, 0.12, -0.05);
  head.add(wpHitbox);

  let stridePhase = 0;
  let railChargeLevel = 0;
  let currentOpacity = 1.0;
  let bladeExtension = 0;
  let bladeDesired = 0;
  let bladeGlowBoost = 1;

  return {
    root,
    hitboxes: [wpHitbox, bodyHitbox],
    weakpointMaterials: [weakpointMat],
    armorFlashMaterials: [armorMat],
    getMuzzleWorldPos: (out) => {
      muzzlePoint.getWorldPosition(out);
      return out;
    },
    getWeakpointWorldPos: (out) => {
      weakpointAnchor.getWorldPosition(out);
      return out;
    },
    getBladeTipWorldPos: (out) => {
      bladeTipAnchor.getWorldPosition(out);
      return out;
    },
    getSpineThrusterWorldPos: (out) => {
      spineThrusterAnchor.getWorldPosition(out);
      return out;
    },
    getMineHandWorldPos: (out) => {
      mineHandAnchor.getWorldPosition(out);
      return out;
    },
    setRailLaser: (active, length, lockRatio) => {
      laserCoreMesh.visible = active;
      laserGlowMesh.visible = active;
      if (active) {
        const clampedLen = Math.max(0.4, length);
        const thick = 0.85 + lockRatio * 1.45;
        laserCoreMesh.scale.set(thick, thick, clampedLen);
        laserGlowMesh.scale.set(thick * 1.35, thick * 1.35, clampedLen);
        const critical = lockRatio > 0.72;
        laserCoreMat.color.setHex(critical ? 0xffe8ec : 0xe6ffff);
        laserGlowMat.color.setHex(critical ? 0xff1e42 : 0x28f0ff);
        laserCoreMat.opacity = 0.75 + lockRatio * 0.25;
        laserGlowMat.opacity = 0.28 + lockRatio * 0.38;
      }
    },
    setCamoOpacity: (opacity) => {
      currentOpacity = Math.max(0.2, Math.min(1.0, opacity));
      const solid = currentOpacity > 0.88;
      for (const m of camoBodyMats) {
        m.opacity = currentOpacity;
        m.depthWrite = solid;
      }
      // Visor & phase fins keep an eerie translucent cyan shimmer so the player can always track him!
      weakpointMat.opacity = Math.max(0.5, currentOpacity);
      phaseCoilMat.opacity = Math.max(0.55, currentOpacity);
      plasmaChannelMat.opacity = Math.max(0.55, currentOpacity);
    },
    setRailCharge: (charge) => {
      railChargeLevel = Math.max(0, Math.min(1, charge));
    },
    setWristBladeActive: (active, intensity = 1) => {
      bladeDesired = active ? 1 : 0;
      bladeGlowBoost = intensity;
    },
    updateAnimation: (input: EnemyAnimationInput) => {
      const dt = Math.max(0.001, Math.min(0.08, input.dt));
      const lerp = 1 - Math.exp(-14 * dt);
      const isP2 = input.phase >= 2;

      if (input.behavior === 'dead') {
        const p = Math.min(1, input.deadProgress);
        pelvis.position.y = 1.04 * (1 - p * 0.86);
        pelvis.rotation.x = p * 1.48;
        torso.rotation.x = p * 0.35;
        laserCoreMesh.visible = false;
        laserGlowMesh.visible = false;
        mantisBladeMesh.visible = false;
        for (const m of camoBodyMats) {
          m.opacity = 1.0;
          m.depthWrite = true;
        }
        return;
      }

      // Smooth retractable Phase-Mantis Wrist-Blade snap-out
      bladeExtension += (bladeDesired - bladeExtension) * (1 - Math.exp(-22 * dt));
      mantisBladeMesh.visible = bladeExtension > 0.04;
      if (mantisBladeMesh.visible) {
        mantisBladeMesh.scale.set(1, 0.4 + bladeExtension * 0.6, Math.max(0.05, bladeExtension));
        bladeEdgeMat.emissive.setHex(isP2 ? 0xff2c58 : 0x28f0ff);
        bladeEdgeMat.emissiveIntensity = (2.4 + bladeGlowBoost * 1.8) * bladeExtension;
      }

      // Emissive state: Phase 2 Overdrive shifts accents to razor-crimson/electric-cyan pulse!
      const pulse = 0.85 + 0.25 * Math.sin(input.elapsed * (isP2 ? 12 : 6));
      if (input.weakpointBroken) {
        weakpointMat.emissive.setHex(0x164a5c);
        weakpointMat.emissiveIntensity = 0.45;
      } else if (railChargeLevel > 0.72 || isP2) {
        weakpointMat.emissive.setHex(railChargeLevel > 0.72 ? 0xff2244 : 0xff3b68);
        weakpointMat.emissiveIntensity = (3.0 + railChargeLevel * 2.2) * pulse;
      } else {
        weakpointMat.emissive.setHex(0x1ee8ff);
        weakpointMat.emissiveIntensity = (2.6 + railChargeLevel * 1.6) * pulse;
      }

      // Dorsal optical-camo phase fins flare during Cloak-Dash or Phase 2
      const camoBoost = currentOpacity < 0.75 ? 2.4 : 1.0;
      phaseCoilMat.emissive.setHex(isP2 ? 0xff385e : 0x1cd8ff);
      phaseCoilMat.emissiveIntensity = (1.8 * camoBoost + railChargeLevel * 1.4) * pulse;
      for (let i = 0; i < phaseFins.length; i++) {
        phaseFins[i].scale.y = 1 + (camoBoost > 1.5 ? 0.18 : 0) + (isP2 ? 0.14 : 0);
      }

      // Rifle magnetic rail plasma channel charge glow
      plasmaChannelMat.emissive.setHex(railChargeLevel > 0.72 ? 0xff2846 : 0x28f0ff);
      plasmaChannelMat.emissiveIntensity = 1.4 + railChargeLevel * 4.2;

      const speed = Math.min(1.8, input.speedRatio);
      stridePhase += dt * (3.2 + speed * 8.2);
      const stride = Math.sin(stridePhase) * 0.56 * Math.min(1.15, speed);

      if (input.staggerTimer > 0) {
        pelvis.position.y += (0.96 - pelvis.position.y) * lerp;
        pelvis.rotation.x += (-0.12 - pelvis.rotation.x) * lerp;
        torso.rotation.x += (-0.34 - torso.rotation.x) * lerp;
        torso.rotation.y += (Math.sin(input.elapsed * 14) * 0.24 - torso.rotation.y) * lerp;
        torso.rotation.z += (0 - torso.rotation.z) * lerp;
        rightShoulder.rotation.set(0.35, 0.2, -0.35);
        leftShoulder.rotation.set(0.25, -0.2, 0.42);
        railRifle.position.set(0.26, 0.24, -0.22);
        railRifle.rotation.set(0.45, -0.28, -0.2);
        laserCoreMesh.visible = false;
        laserGlowMesh.visible = false;
        return;
      }

      const isRailKneel =
        (input.behavior === 'windup' || input.behavior === 'attack') && input.attackVariant === 0;
      const isAmbushSlash =
        (input.behavior === 'windup' || input.behavior === 'attack') && input.attackVariant === 1;
      const isCloakDash = input.attackVariant === 2 && speed > 0.65;
      const isFlechetteBurst = input.behavior === 'attack' && input.attackVariant === 3;
      const isMineLob =
        (input.behavior === 'windup' || input.behavior === 'attack') && input.attackVariant === 4;

      const crouch = isRailKneel ? 0.25 : isCloakDash ? 0.14 : isAmbushSlash ? 0.12 : 0;
      const bob = Math.abs(Math.cos(stridePhase)) * 0.042 * Math.min(1, speed);

      pelvis.position.y += (1.04 - crouch + bob - pelvis.position.y) * lerp;
      pelvis.rotation.x += ((isCloakDash ? -0.14 : 0) - pelvis.rotation.x) * lerp;

      // Anatomical leg kinematics in Three.js (-Z forward):
      // +hip.rotation.x swings thigh FORWARD (-Z); -knee.rotation.x bends shin BACKWARD (+Z)!
      if (isRailKneel) {
        // Authentic tactical kneeling sniper stance: left foot planted forward, right knee dropped back!
        leftLeg.hip.rotation.x += (0.82 - leftLeg.hip.rotation.x) * lerp;
        leftLeg.knee.rotation.x += (-0.88 - leftLeg.knee.rotation.x) * lerp;
        rightLeg.hip.rotation.x += (-0.34 - rightLeg.hip.rotation.x) * lerp;
        rightLeg.knee.rotation.x += (-0.98 - rightLeg.knee.rotation.x) * lerp;
      } else if (isAmbushSlash) {
        // Aggressive forward assassin lunge stance!
        leftLeg.hip.rotation.x += (0.58 - leftLeg.hip.rotation.x) * lerp;
        leftLeg.knee.rotation.x += (-0.54 - leftLeg.knee.rotation.x) * lerp;
        rightLeg.hip.rotation.x += (-0.42 - rightLeg.hip.rotation.x) * lerp;
        rightLeg.knee.rotation.x += (-0.32 - rightLeg.knee.rotation.x) * lerp;
      } else {
        leftLeg.hip.rotation.x += (stride + crouch * 0.95 - leftLeg.hip.rotation.x) * lerp;
        leftLeg.knee.rotation.x +=
          (-Math.max(0, stride * 1.1) - crouch * 1.35 - leftLeg.knee.rotation.x) * lerp;
        rightLeg.hip.rotation.x += (-stride + crouch * 0.95 - rightLeg.hip.rotation.x) * lerp;
        rightLeg.knee.rotation.x +=
          (-Math.max(0, -stride * 1.1) - crouch * 1.35 - rightLeg.knee.rotation.x) * lerp;
      }

      // Dynamic BACKWARD wind flare (-X rotation!) on split trench-coat tails so they never clip thighs!
      const coatFlare = -(0.24 + speed * 0.28 + (isCloakDash ? 0.34 : 0) + (isAmbushSlash ? 0.24 : 0));
      const coatWave = Math.sin(input.elapsed * 6.5) * 0.05;
      leftCoatTail.rotation.x += (coatFlare + coatWave - leftCoatTail.rotation.x) * lerp;
      rightCoatTail.rotation.x += (coatFlare - coatWave - rightCoatTail.rotation.x) * lerp;

      const aimPitchClamped = Math.max(-0.38, Math.min(0.38, input.aimPitch));
      const flinchKick = input.flinchTimer > 0 ? Math.sin(input.flinchTimer * 28) * 0.14 : 0;

      if (isAmbushSlash) {
        // Close-quarters Phase-Mantis Wrist-Blade lunging slash!
        const p = input.attackProgress;
        const wind = input.behavior === 'windup';
        const torsoTwist = wind ? -0.58 : -0.52 + p * 1.28;
        torso.rotation.x += ((wind ? -0.14 : -0.24) + flinchKick - torso.rotation.x) * lerp;
        torso.rotation.y += (torsoTwist - torso.rotation.y) * lerp;
        torso.rotation.z += ((wind ? -0.1 : 0.12) - torso.rotation.z) * lerp;

        // Left arm slashes fiercely across front with extended glowing mantis blade!
        leftShoulder.rotation.x += ((wind ? 0.68 : 1.38) - leftShoulder.rotation.x) * lerp;
        leftShoulder.rotation.y += ((wind ? -0.9 : 0.68) - leftShoulder.rotation.y) * lerp;
        leftShoulder.rotation.z += ((wind ? 0.55 : -0.28) - leftShoulder.rotation.z) * lerp;
        leftElbow.rotation.x += ((wind ? 0.85 : 0.25) - leftElbow.rotation.x) * lerp;

        // Right arm sweeps the SPECTRE-VII rifle cleanly LOW & BACKWARD (never pointing at ceiling!)
        rightShoulder.rotation.x += (-0.32 - rightShoulder.rotation.x) * lerp;
        rightShoulder.rotation.y += (0.28 - rightShoulder.rotation.y) * lerp;
        rightShoulder.rotation.z += (-0.38 - rightShoulder.rotation.z) * lerp;
        rightElbow.rotation.x += (0.55 - rightElbow.rotation.x) * lerp;

        railRifle.position.lerp(_tmpRiflePos.set(0.34, 0.18, -0.08), lerp);
        railRifle.rotation.x += (-0.68 - railRifle.rotation.x) * lerp;
        railRifle.rotation.y += (-0.65 - railRifle.rotation.y) * lerp;
        railRifle.rotation.z += (-0.18 - railRifle.rotation.z) * lerp;
        head.rotation.set(0.14, -torsoTwist * 0.65, 0);
      } else if (isMineLob) {
        // Left hand arcs overhead pitching a glowing Cryo-Shock Flush Mine!
        const p = input.attackProgress;
        torso.rotation.x += (-0.1 + flinchKick - torso.rotation.x) * lerp;
        torso.rotation.y += (-0.24 + p * 0.42 - torso.rotation.y) * lerp;
        torso.rotation.z += (0 - torso.rotation.z) * lerp;

        leftShoulder.rotation.x += (2.35 - p * 1.45 - leftShoulder.rotation.x) * lerp;
        leftShoulder.rotation.y += (-0.18 - leftShoulder.rotation.y) * lerp;
        leftShoulder.rotation.z += (0.28 - leftShoulder.rotation.z) * lerp;
        leftElbow.rotation.x += (0.42 - leftElbow.rotation.x) * lerp;

        rightShoulder.rotation.x += (0.82 - rightShoulder.rotation.x) * lerp;
        rightShoulder.rotation.y += (0.14 - rightShoulder.rotation.y) * lerp;
        rightShoulder.rotation.z += (-0.14 - rightShoulder.rotation.z) * lerp;
        rightElbow.rotation.x += (0.68 - rightElbow.rotation.x) * lerp;

        railRifle.position.lerp(_tmpRiflePos.set(0.22, 0.3, -0.26), lerp);
        railRifle.rotation.x += (0.1 + aimPitchClamped * 0.6 - railRifle.rotation.x) * lerp;
        railRifle.rotation.y += (-0.08 - railRifle.rotation.y) * lerp;
        railRifle.rotation.z += (0 - railRifle.rotation.z) * lerp;
        head.rotation.set(aimPitchClamped * 0.7, 0.12, 0);
      } else {
        // Authentic two-handed rifleman firing posture (Kneeling Sniper Lock / Fleet Dash / Flechette Scatter)
        const rifleYawStance = isRailKneel ? 0.28 : isCloakDash ? 0.16 : 0.22;
        const leanFwd = isCloakDash ? -0.22 : isRailKneel ? -0.14 : -0.06; // negative X leans torso FORWARD!
        const bank = isCloakDash ? -input.localMoveX * 0.22 : 0;
        const recoil = isFlechetteBurst ? Math.sin(input.elapsed * 32) * 0.08 : 0;

        torso.rotation.x += (leanFwd + flinchKick - torso.rotation.x) * lerp;
        torso.rotation.y += (rifleYawStance - torso.rotation.y) * lerp;
        torso.rotation.z += (bank - torso.rotation.z) * lerp;

        // Right arm tucked cleanly into shoulder pocket gripping the bullpup pistol grip!
        rightShoulder.rotation.x +=
          (0.62 + aimPitchClamped * 0.55 - recoil - rightShoulder.rotation.x) * lerp;
        rightShoulder.rotation.y += (0.18 - rightShoulder.rotation.y) * lerp;
        rightShoulder.rotation.z += (-0.18 - rightShoulder.rotation.z) * lerp;
        rightElbow.rotation.x += (0.98 - rightElbow.rotation.x) * lerp;

        // Left arm reaches across cleanly supporting the forward carbon handguard!
        leftShoulder.rotation.x +=
          (1.02 + aimPitchClamped * 0.55 - leftShoulder.rotation.x) * lerp;
        leftShoulder.rotation.y += (-0.62 - leftShoulder.rotation.y) * lerp;
        leftShoulder.rotation.z += (0.12 - leftShoulder.rotation.z) * lerp;
        leftElbow.rotation.x += (0.58 - leftElbow.rotation.x) * lerp;

        // Rifle locked DEAD HORIZONTAL along forward line of sight (counter-pitched against torso forward lean!)
        railRifle.position.lerp(
          _tmpRiflePos.set(
            isRailKneel ? 0.15 : 0.17,
            isRailKneel ? 0.36 : 0.34,
            -0.24 + recoil * 0.28
          ),
          lerp
        );
        const levelPitch = -leanFwd + aimPitchClamped * 0.85 + recoil * 0.45;
        railRifle.rotation.x += (levelPitch - railRifle.rotation.x) * lerp;
        railRifle.rotation.y += (-rifleYawStance + 0.02 - railRifle.rotation.y) * lerp;
        railRifle.rotation.z += (0 - railRifle.rotation.z) * lerp;

        // Head cheek-welded toward scope, peering straight down range!
        head.rotation.set(-leanFwd * 0.75 + aimPitchClamped * 0.72, -rifleYawStance * 0.85, isRailKneel ? 0.1 : 0);
      }
    },
    dispose: () => {
      tex.dispose();
      for (const m of camoBodyMats) m.dispose();
      weakpointMat.dispose();
      phaseCoilMat.dispose();
      plasmaChannelMat.dispose();
      bladeEdgeMat.dispose();
      laserCoreMat.dispose();
      laserGlowMat.dispose();
      root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
      });
    },
  };
}

const _tmpRiflePos = new THREE.Vector3();
