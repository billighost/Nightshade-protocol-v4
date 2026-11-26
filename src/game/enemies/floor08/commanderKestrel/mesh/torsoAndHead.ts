import * as THREE from 'three';
import {
  createBeveledBox,
  createCurvedPanelGeometry,
  createLoftedAnatomy,
} from '../../../../core/sculptUtils';
import type { Floor08EnemyMaterials } from '../../../core/enemyMeshShared';

export interface KestrelTorsoParts {
  pelvis: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftFrontTasset: THREE.Group;
  rightFrontTasset: THREE.Group;
  leftRearTasset: THREE.Group;
  rightRearTasset: THREE.Group;
  visorGlintAnchor: THREE.Object3D;
  visorMat: THREE.MeshStandardMaterial;
  chestCoreMat: THREE.MeshStandardMaterial;
  goldMat: THREE.MeshStandardMaterial;
  crimsonMat: THREE.MeshStandardMaterial;
  disposables: Array<{ dispose: () => void }>;
}

/**
 * Builds COMMANDER KESTREL-08's towering 2.20m sculpted Valkyrie-Vanguard torso & helmet:
 * - Satin Obsidian-Titanium ceramite plates + Anodized Imperial Gold trim + Deep Vanguard Crimson accents
 * - Pelvis anchored at exact y=1.12 (hip -0.04 -> knee -0.54 -> sole -0.54 => world y=0.00!)
 * - 4 articulated armored command coat-tail tassets (front/rear L&R) with gold bevel trim
 * - Curved breastplate (+20mm radial clearance -> ZERO Z-fighting) + glowing hexagonal overdrive sternum core
 * - 360°-seamless LatheGeometry Valkyrie Helmet + glowing curved V-visor (+16mm proud) + dual swept gold wing-horns
 */
export function buildKestrelTorsoAndHead(
  mats: Floor08EnemyMaterials,
  flashArmorMat: THREE.MeshStandardMaterial
): KestrelTorsoParts {
  const disposables: Array<{ dispose: () => void }> = [];

  const undersuitMat = new THREE.MeshStandardMaterial({
    color: 0x262c38,
    roughness: 0.78,
    metalness: 0.22,
    bumpMap: mats.undersuit.bumpMap,
    bumpScale: 0.014,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xdca834,
    roughness: 0.24,
    metalness: 0.86,
    bumpMap: mats.armorDark.bumpMap,
    bumpScale: 0.008,
  });
  const crimsonMat = new THREE.MeshStandardMaterial({
    color: 0x9c1b2c,
    roughness: 0.42,
    metalness: 0.34,
    bumpMap: mats.armorDark.bumpMap,
    bumpScale: 0.01,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0xffd258,
    emissive: 0xff9814,
    emissiveIntensity: 3.4,
    roughness: 0.14,
    metalness: 0.2,
  });
  const chestCoreMat = new THREE.MeshStandardMaterial({
    color: 0xff4658,
    emissive: 0xe61c34,
    emissiveIntensity: 2.6,
    roughness: 0.16,
    metalness: 0.24,
  });
  disposables.push(undersuitMat, goldMat, crimsonMat, visorMat, chestCoreMat);

  // ---------------------------------------------------------------------------
  // 1. PELVIS & ARTICULATED 4-PANEL ARMORED COMMAND COAT-TAILS (y = 1.12)
  // ---------------------------------------------------------------------------
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 1.12, 0);

  const pelvisGeo = createLoftedAnatomy(
    [
      { y: -0.09, rx: 0.185, rz: 0.135, squareness: 2.5 },
      { y: 0.02, rx: 0.21, rz: 0.15, squareness: 2.6 },
      { y: 0.11, rx: 0.195, rz: 0.14, squareness: 2.5 },
    ],
    18
  );
  disposables.push(pelvisGeo);
  const pelvisMesh = new THREE.Mesh(pelvisGeo, undersuitMat);
  pelvisMesh.castShadow = true;
  pelvis.add(pelvisMesh);

  // Imperial Vanguard waist belt + gilded center buckle + sculpted codpiece guard
  const beltGeo = createCurvedPanelGeometry(
    [
      { y: -0.02, rx: 0.228, rz: 0.168, thickness: 0.024 },
      { y: 0.065, rx: 0.224, rz: 0.164, thickness: 0.024 },
    ],
    0,
    Math.PI * 2,
    24
  );
  disposables.push(beltGeo);
  pelvis.add(new THREE.Mesh(beltGeo, flashArmorMat));

  const buckleFrame = new THREE.Mesh(createBeveledBox(0.118, 0.078, 0.044, 0.01), goldMat);
  buckleFrame.position.set(0, 0.025, -0.182);
  pelvis.add(buckleFrame);

  const buckleGem = new THREE.Mesh(createBeveledBox(0.052, 0.036, 0.024, 0.005), chestCoreMat);
  buckleGem.position.set(0, 0.025, -0.198);
  pelvis.add(buckleGem);

  // Sculpted angled front pelvic guard
  const groinGuard = new THREE.Mesh(createBeveledBox(0.14, 0.22, 0.058, 0.016), flashArmorMat);
  groinGuard.position.set(0, -0.095, -0.166);
  groinGuard.rotation.x = 0.08;
  pelvis.add(groinGuard);

  const groinTrim = new THREE.Mesh(createBeveledBox(0.032, 0.18, 0.018, 0.004), goldMat);
  groinTrim.position.set(0, -0.095, -0.194);
  groinTrim.rotation.x = 0.08;
  pelvis.add(groinTrim);

  // 4 Articulated Armored Command Coat-Tails (side-front & rear-flank armored skirts!)
  const buildTasset = (side: -1 | 1, isRear: boolean): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(side * (isRear ? 0.165 : 0.225), 0.01, isRear ? 0.145 : -0.025);
    g.rotation.y = isRear ? side * -0.32 : side * 0.28;
    g.rotation.z = -side * (isRear ? 0.08 : 0.15);
    g.rotation.x = isRear ? 0.12 : -0.04;
    pelvis.add(g);

    const h = isRear ? 0.48 : 0.4;
    const w = isRear ? 0.185 : 0.15;
    const outerPlate = new THREE.Mesh(createBeveledBox(w, h, 0.032, 0.009), flashArmorMat);
    outerPlate.position.set(0, -h * 0.5, 0);
    outerPlate.castShadow = true;
    g.add(outerPlate);

    const innerLining = new THREE.Mesh(
      createBeveledBox(w - 0.034, h - 0.045, 0.014, 0.004),
      crimsonMat
    );
    innerLining.position.set(0, -h * 0.5, isRear ? -0.014 : 0.014);
    g.add(innerLining);

    const goldEdge = new THREE.Mesh(createBeveledBox(w + 0.012, 0.036, 0.038, 0.006), goldMat);
    goldEdge.position.set(0, -h + 0.024, 0);
    g.add(goldEdge);

    const goldSpine = new THREE.Mesh(createBeveledBox(0.022, h - 0.06, 0.038, 0.004), goldMat);
    goldSpine.position.set(0, -h * 0.48, 0);
    g.add(goldSpine);

    return g;
  };

  const leftFrontTasset = buildTasset(-1, false);
  const rightFrontTasset = buildTasset(1, false);
  const leftRearTasset = buildTasset(-1, true);
  const rightRearTasset = buildTasset(1, true);

  // ---------------------------------------------------------------------------
  // 2. HEROIC SCULPTED COMMANDER TORSO + IMPERIAL GOLD V-CHEVRON CUIRASS
  // ---------------------------------------------------------------------------
  const torso = new THREE.Group();
  torso.position.set(0, 0.095, 0);
  pelvis.add(torso);

  const coreGeo = createLoftedAnatomy(
    [
      { y: 0.0, rx: 0.168, rz: 0.125, squareness: 2.4 },
      { y: 0.18, rx: 0.205, rz: 0.145, squareness: 2.5 },
      { y: 0.42, rx: 0.275, rz: 0.17, squareness: 2.65, frontScale: 1.05 },
      { y: 0.57, rx: 0.24, rz: 0.152, squareness: 2.5 },
      { y: 0.65, rx: 0.135, rz: 0.115, squareness: 2.2 },
    ],
    20
  );
  disposables.push(coreGeo);
  const coreMesh = new THREE.Mesh(coreGeo, undersuitMat);
  coreMesh.castShadow = true;
  torso.add(coreMesh);

  // Curved obsidian cuirass breastplate (+20mm radial clearance outside core -> ZERO Z-fighting!)
  const cuirassGeo = createCurvedPanelGeometry(
    [
      { y: 0.24, rx: 0.232, rz: 0.172, thickness: 0.032 },
      { y: 0.42, rx: 0.3, rz: 0.202, thickness: 0.038 },
      { y: 0.56, rx: 0.264, rz: 0.182, thickness: 0.03 },
    ],
    -Math.PI * 0.88,
    -Math.PI * 0.12,
    18
  );
  disposables.push(cuirassGeo);
  const cuirass = new THREE.Mesh(cuirassGeo, flashArmorMat);
  cuirass.castShadow = true;
  torso.add(cuirass);

  // Sculpted pectoral beveled armor facets + iconic Imperial Gold V-Wings on chest
  for (const side of [-1, 1] as const) {
    const pec = new THREE.Mesh(createBeveledBox(0.175, 0.145, 0.068, 0.016), flashArmorMat);
    pec.position.set(side * 0.112, 0.435, -0.194);
    pec.rotation.set(-0.08, -side * 0.24, -side * 0.12);
    pec.castShadow = true;
    torso.add(pec);

    const goldWingBar = new THREE.Mesh(createBeveledBox(0.195, 0.034, 0.03, 0.006), goldMat);
    goldWingBar.position.set(side * 0.128, 0.485, -0.228);
    goldWingBar.rotation.set(-0.06, -side * 0.24, side * 0.26);
    torso.add(goldWingBar);

    const crimsonSlash = new THREE.Mesh(createBeveledBox(0.14, 0.024, 0.024, 0.004), crimsonMat);
    crimsonSlash.position.set(side * 0.118, 0.375, -0.224);
    crimsonSlash.rotation.set(0, -side * 0.24, side * 0.16);
    torso.add(crimsonSlash);
  }

  // Hexagonal Sternum Overdrive Reactor Core (shifts crimson -> blazing gold in Phase 2!)
  const reactorHousing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.066, 0.072, 0.036, 6),
    goldMat
  );
  reactorHousing.rotation.x = Math.PI / 2;
  reactorHousing.position.set(0, 0.415, -0.222);
  torso.add(reactorHousing);

  const reactorCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.044, 0.044, 0.044, 6),
    chestCoreMat
  );
  reactorCore.rotation.x = Math.PI / 2;
  reactorCore.position.set(0, 0.415, -0.226);
  torso.add(reactorCore);

  // Segmented Abdominal Armor Plates (+18mm clear of undersuit)
  for (let i = 0; i < 3; i++) {
    const abY = 0.085 + i * 0.062;
    const abW = 0.225 + i * 0.022;
    const ab = new THREE.Mesh(createBeveledBox(abW, 0.046, 0.036, 0.008), flashArmorMat);
    ab.position.set(0, abY, -0.158 - i * 0.01);
    torso.add(ab);

    const abTrim = new THREE.Mesh(createBeveledBox(abW * 0.42, 0.014, 0.016, 0.003), goldMat);
    abTrim.position.set(0, abY, -0.174 - i * 0.01);
    torso.add(abTrim);
  }

  // Clean Sculpted Backplate Spine Saddle (for Aero-Strike Jump-Pack mounting)
  const backPlateGeo = createCurvedPanelGeometry(
    [
      { y: 0.14, rx: 0.212, rz: 0.162, thickness: 0.028 },
      { y: 0.42, rx: 0.292, rz: 0.194, thickness: 0.032 },
      { y: 0.56, rx: 0.258, rz: 0.178, thickness: 0.026 },
    ],
    Math.PI * 0.14,
    Math.PI * 0.86,
    16
  );
  disposables.push(backPlateGeo);
  torso.add(new THREE.Mesh(backPlateGeo, flashArmorMat));

  // Regal High Commander Gorget Collar (swept obsidian + gold rim framing the helmet!)
  const gorgetGeo = createCurvedPanelGeometry(
    [
      { y: 0.555, rx: 0.225, rz: 0.176, thickness: 0.026 },
      { y: 0.655, rx: 0.205, rz: 0.172, thickness: 0.022 },
    ],
    -Math.PI * 0.22,
    Math.PI * 1.22,
    18
  );
  disposables.push(gorgetGeo);
  torso.add(new THREE.Mesh(gorgetGeo, flashArmorMat));

  const collarGoldRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.188, 0.015, 8, 20, Math.PI * 1.35),
    goldMat
  );
  collarGoldRim.rotation.x = Math.PI / 2;
  collarGoldRim.rotation.z = -Math.PI * 0.18;
  collarGoldRim.position.set(0, 0.658, 0.015);
  torso.add(collarGoldRim);

  // Ribbed cybernetic neck column
  const neckCol = new THREE.Mesh(
    new THREE.CylinderGeometry(0.082, 0.098, 0.125, 14),
    undersuitMat
  );
  neckCol.position.set(0, 0.655, -0.005);
  torso.add(neckCol);

  // ---------------------------------------------------------------------------
  // 3. 360°-SEAMLESS VALKYRIE-VANGUARD HELMET + GOLD WING-HORNS + V-VISOR
  // ---------------------------------------------------------------------------
  const head = new THREE.Group();
  head.position.set(0, 0.705, -0.01);
  torso.add(head);

  // Seamless LatheGeometry aerodynamic helm shell
  const helmProfile = [
    new THREE.Vector2(0.001, 0.0),
    new THREE.Vector2(0.105, 0.015),
    new THREE.Vector2(0.132, 0.075),
    new THREE.Vector2(0.136, 0.155),
    new THREE.Vector2(0.126, 0.225),
    new THREE.Vector2(0.095, 0.278),
    new THREE.Vector2(0.044, 0.305),
    new THREE.Vector2(0.001, 0.312),
  ];
  const helmDomeGeo = new THREE.LatheGeometry(helmProfile, 22);
  helmDomeGeo.scale(0.92, 1.0, 1.12);
  disposables.push(helmDomeGeo);
  const helmDome = new THREE.Mesh(helmDomeGeo, flashArmorMat);
  helmDome.castShadow = true;
  head.add(helmDome);

  // Sculpted angular brow cowl + crimson center crown stripe + gold mohawk crest fin
  const browCowl = new THREE.Mesh(createBeveledBox(0.215, 0.056, 0.115, 0.014), flashArmorMat);
  browCowl.position.set(0, 0.206, -0.102);
  browCowl.rotation.x = 0.22;
  head.add(browCowl);

  const crestFinShape = new THREE.Shape();
  crestFinShape.moveTo(0, 0);
  crestFinShape.lineTo(0.24, 0.04);
  crestFinShape.lineTo(0.29, 0.135);
  crestFinShape.lineTo(0.08, 0.105);
  crestFinShape.lineTo(-0.02, 0.03);
  crestFinShape.closePath();
  const crestFinGeo = new THREE.ExtrudeGeometry(crestFinShape, {
    depth: 0.02,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.004,
    bevelSegments: 2,
  });
  crestFinGeo.center();
  disposables.push(crestFinGeo);
  const crestFin = new THREE.Mesh(crestFinGeo, goldMat);
  crestFin.rotation.y = Math.PI / 2;
  crestFin.position.set(0, 0.292, 0.025);
  head.add(crestFin);

  // Recessed armored faceplate + sharp jaw mandibles + respirator chin guard
  const chinGuard = new THREE.Mesh(createBeveledBox(0.136, 0.092, 0.12, 0.016), flashArmorMat);
  chinGuard.position.set(0, 0.068, -0.105);
  chinGuard.rotation.x = -0.14;
  head.add(chinGuard);

  const chinVent = new THREE.Mesh(createBeveledBox(0.068, 0.034, 0.034, 0.006), goldMat);
  chinVent.position.set(0, 0.052, -0.158);
  head.add(chinVent);

  for (const side of [-1, 1] as const) {
    const mandible = new THREE.Mesh(createBeveledBox(0.048, 0.115, 0.155, 0.012), flashArmorMat);
    mandible.position.set(side * 0.098, 0.104, -0.056);
    mandible.rotation.set(-0.08, -side * 0.18, side * 0.1);
    head.add(mandible);

    const earPod = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.036, 12), goldMat);
    earPod.rotation.z = Math.PI / 2;
    earPod.position.set(side * 0.128, 0.15, 0.005);
    head.add(earPod);
  }

  // Blazing Curved Molten-Amber V-Visor (+16mm proud of helmet face -> ZERO Z-fighting!)
  const visorGeo = createCurvedPanelGeometry(
    [
      { y: 0.128, rx: 0.128, rz: 0.166, thickness: 0.014 },
      { y: 0.178, rx: 0.134, rz: 0.172, thickness: 0.014 },
    ],
    -Math.PI * 0.82,
    -Math.PI * 0.18,
    18
  );
  disposables.push(visorGeo);
  const visorMesh = new THREE.Mesh(visorGeo, visorMat);
  head.add(visorMesh);

  // Crisp black nasal divider giving menacing predatory twin-slit Valkyrie gaze
  const visorBridge = new THREE.Mesh(createBeveledBox(0.022, 0.066, 0.024, 0.004), flashArmorMat);
  visorBridge.position.set(0, 0.154, -0.176);
  head.add(visorBridge);

  // Iconic Swept Imperial Gold Valkyrie Wing-Horns (ExtrudeGeometry tapered blades!)
  const hornShape = new THREE.Shape();
  hornShape.moveTo(0, 0);
  hornShape.lineTo(0.068, 0.025);
  hornShape.lineTo(0.28, 0.255);
  hornShape.lineTo(0.22, 0.275);
  hornShape.lineTo(0.015, 0.085);
  hornShape.closePath();
  const hornGeo = new THREE.ExtrudeGeometry(hornShape, {
    depth: 0.018,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.004,
    bevelSegments: 2,
  });
  disposables.push(hornGeo);

  for (const side of [-1, 1] as const) {
    const horn = new THREE.Mesh(hornGeo, goldMat);
    horn.position.set(side * 0.118, 0.18, -0.025);
    horn.scale.set(side, 1, 1);
    horn.rotation.set(0.32, side * 0.28, -side * 0.14);
    horn.castShadow = true;
    head.add(horn);
  }

  const visorGlintAnchor = new THREE.Object3D();
  visorGlintAnchor.position.set(0, 0.155, -0.195);
  head.add(visorGlintAnchor);

  return {
    pelvis,
    torso,
    head,
    leftFrontTasset,
    rightFrontTasset,
    leftRearTasset,
    rightRearTasset,
    visorGlintAnchor,
    visorMat,
    chestCoreMat,
    goldMat,
    crimsonMat,
    disposables,
  };
}
