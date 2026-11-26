import * as THREE from 'three';
import {
  createBeveledBox,
  createCurvedPanelGeometry,
  createLoftedAnatomy,
} from '../../../../core/sculptUtils';
import type { Floor08EnemyMaterials } from '../../../core/enemyMeshShared';

export interface PyroTorsoParts {
  pelvis: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  visorMat: THREE.MeshStandardMaterial;
  visorGlintOrigin: THREE.Object3D;
  disposables: Array<{ dispose: () => void }>;
}

/**
 * AAA Zone 2 Armory Mini-Boss Torso, Heavy EOD Blast-Suit Rig, Incendiary Grenade Belt,
 * Ribbed Nomex Neck Seal, and 360°-Seamless Hazmat Welding Blast-Dome Helmet for
 * FORGE-08 "PYRO-TECH".
 *
 * Distinct visual language:
 * - Scorched Ceramic Hazard-Orange + Weathered Industrial Charcoal + Insulated Silver-Ash Nomex
 * - Wide Curved Molten-Amber Welding Visor Slit + Dual Cheek Rebreather Canisters + Corrugated Hoses
 * - Industrial EOD blast-apron, bolted shoulder lift-rings, chest pressure gauge, and hip thermite canisters
 */
export function buildPyroTorsoAndHead(
  mats: Floor08EnemyMaterials,
  flashArmorMat: THREE.MeshStandardMaterial
): PyroTorsoParts {
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
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0xffd584,
    emissive: 0xff5a12,
    emissiveIntensity: 3.4,
    roughness: 0.12,
    metalness: 0.2,
  });
  disposables.push(charcoalSteelMat, nomexAshMat, hazardYellowMat, brassValveMat, visorMat);

  // ---------------------------------------------------------------------------
  // 1. HEAVY EOD PELVIS, BLAST-TASSET APRON & THERMITE GRENADE UTILITY BELT
  // ---------------------------------------------------------------------------
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 1.04, 0);

  const pelvisGeo = createLoftedAnatomy(
    [
      { y: -0.1, rx: 0.162, rz: 0.132, squareness: 2.35 },
      { y: 0.0, rx: 0.205, rz: 0.158, squareness: 2.5 },
      { y: 0.08, rx: 0.2, rz: 0.152, squareness: 2.5 },
      { y: 0.13, rx: 0.184, rz: 0.142, squareness: 2.4 },
    ],
    18
  );
  disposables.push(pelvisGeo);
  const pelvisMesh = new THREE.Mesh(pelvisGeo, nomexAshMat);
  pelvisMesh.castShadow = true;
  pelvis.add(pelvisMesh);

  // Heavy industrial harness belt
  const beltGeo = createLoftedAnatomy(
    [
      { y: 0.015, rx: 0.218, rz: 0.17, squareness: 2.6 },
      { y: 0.06, rx: 0.224, rz: 0.176, squareness: 2.65 },
      { y: 0.105, rx: 0.212, rz: 0.166, squareness: 2.55 },
    ],
    18
  );
  disposables.push(beltGeo);
  pelvis.add(new THREE.Mesh(beltGeo, charcoalSteelMat));

  const beltBuckle = new THREE.Mesh(
    createBeveledBox(0.115, 0.072, 0.044, 0.01),
    hazardYellowMat
  );
  beltBuckle.position.set(0, 0.06, -0.176);
  pelvis.add(beltBuckle);

  // Curved EOD groin blast-shield tasset + hazard yellow trim strip
  const groinGeo = createCurvedPanelGeometry(
    [
      { y: -0.22, rx: 0.135, rz: 0.174, thickness: 0.024 },
      { y: -0.02, rx: 0.188, rz: 0.186, thickness: 0.026 },
    ],
    -Math.PI * 0.72,
    -Math.PI * 0.28,
    12
  );
  disposables.push(groinGeo);
  pelvis.add(new THREE.Mesh(groinGeo, flashArmorMat));

  // Curved side hip blast-skirts (protecting upper thighs cleanly without clipping!)
  for (const side of [-1, 1]) {
    const startAng = side < 0 ? Math.PI * 0.74 : -Math.PI * 0.24;
    const endAng = side < 0 ? Math.PI * 1.24 : Math.PI * 0.26;
    const hipGuardGeo = createCurvedPanelGeometry(
      [
        { y: -0.24, rx: 0.245, rz: 0.19, thickness: 0.02 },
        { y: -0.02, rx: 0.225, rz: 0.176, thickness: 0.022 },
      ],
      startAng,
      endAng,
      10
    );
    disposables.push(hipGuardGeo);
    pelvis.add(new THREE.Mesh(hipGuardGeo, charcoalSteelMat));
  }

  // 3 Clipped Incendiary Thermite Canister Grenades on left-front hip belt!
  for (let g = 0; g < 3; g++) {
    const gren = new THREE.Group();
    gren.position.set(-0.155 - g * 0.042, 0.015, -0.145 + g * 0.042);
    gren.rotation.y = 0.45 + g * 0.25;
    gren.rotation.z = -0.14;
    pelvis.add(gren);

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.105, 10),
      charcoalSteelMat
    );
    gren.add(body);
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 0.026, 10),
      visorMat
    );
    gren.add(band);
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.022, 0.018, 10),
      brassValveMat
    );
    cap.position.y = 0.06;
    gren.add(cap);
  }

  // ---------------------------------------------------------------------------
  // 2. MASSIVE EOD THERMITE BREACHER TORSO + HIGH BLAST-COLLAR GORGET
  // ---------------------------------------------------------------------------
  const torso = new THREE.Group();
  torso.position.set(0, 0.1, 0);
  pelvis.add(torso);

  const coreGeo = createLoftedAnatomy(
    [
      { y: -0.02, rx: 0.178, rz: 0.138, squareness: 2.35 },
      { y: 0.15, rx: 0.208, rz: 0.156, squareness: 2.45 },
      { y: 0.32, rx: 0.244, rz: 0.172, squareness: 2.5 },
      { y: 0.46, rx: 0.26, rz: 0.178, squareness: 2.55 },
      { y: 0.55, rx: 0.228, rz: 0.158, squareness: 2.4 },
      { y: 0.6, rx: 0.162, rz: 0.132, squareness: 2.25 },
    ],
    22
  );
  disposables.push(coreGeo);
  const coreMesh = new THREE.Mesh(coreGeo, nomexAshMat);
  coreMesh.castShadow = true;
  torso.add(coreMesh);

  // Heavy Curved Hazard-Orange Ceramic EOD Breastplate (clean +22mm radial clearance outside undersuit!)
  const breastPlateGeo = createCurvedPanelGeometry(
    [
      { y: 0.095, rx: 0.228, rz: 0.184, thickness: 0.028 },
      { y: 0.29, rx: 0.27, rz: 0.206, thickness: 0.03 },
      { y: 0.45, rx: 0.28, rz: 0.212, thickness: 0.028 },
      { y: 0.525, rx: 0.238, rz: 0.186, thickness: 0.024 },
    ],
    -Math.PI * 0.88,
    -Math.PI * 0.12,
    18
  );
  disposables.push(breastPlateGeo);
  const breastPlate = new THREE.Mesh(breastPlateGeo, flashArmorMat);
  breastPlate.castShadow = true;
  torso.add(breastPlate);

  // Sculpted Charcoal-Steel Upper Blast-Bib Overlay (clean +18mm proud of orange breastplate, zero Z-fighting!)
  const bibGeo = createCurvedPanelGeometry(
    [
      { y: 0.34, rx: 0.29, rz: 0.228, thickness: 0.02 },
      { y: 0.465, rx: 0.296, rz: 0.232, thickness: 0.022 },
      { y: 0.515, rx: 0.256, rz: 0.204, thickness: 0.018 },
    ],
    -Math.PI * 0.72,
    -Math.PI * 0.28,
    14
  );
  disposables.push(bibGeo);
  torso.add(new THREE.Mesh(bibGeo, charcoalSteelMat));

  // Industrial Hazard-Yellow Warning Bars across chest bevel
  for (const side of [-1, 1]) {
    const hazBar = new THREE.Mesh(
      createBeveledBox(0.088, 0.024, 0.018, 0.004),
      hazardYellowMat
    );
    hazBar.position.set(side * 0.105, 0.435, -0.244);
    hazBar.rotation.y = side * -0.24;
    hazBar.rotation.z = side * 0.18;
    torso.add(hazBar);

    // Heavy bolted steel EOD shoulder lift-rings / harness brackets
    const harnessStrap = new THREE.Mesh(
      createBeveledBox(0.056, 0.22, 0.036, 0.008),
      charcoalSteelMat
    );
    harnessStrap.position.set(side * 0.165, 0.495, -0.095);
    harnessStrap.rotation.x = 0.28;
    torso.add(harnessStrap);

    const liftRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.028, 0.007, 6, 12),
      brassValveMat
    );
    liftRing.position.set(side * 0.165, 0.56, -0.055);
    liftRing.rotation.y = Math.PI / 2;
    torso.add(liftRing);
  }

  // Center Chest Thermite Pressure Gauge + Glowing Molten Dial
  const gaugeRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.044, 0.048, 0.028, 14),
    brassValveMat
  );
  gaugeRing.rotation.x = Math.PI / 2;
  gaugeRing.position.set(0, 0.405, -0.244);
  torso.add(gaugeRing);

  const gaugeFace = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.032, 0.012, 12),
    visorMat
  );
  gaugeFace.rotation.x = Math.PI / 2;
  gaugeFace.position.set(0, 0.405, -0.256);
  torso.add(gaugeFace);

  // Curved lower abdominal charcoal-steel blast ribs (proud of breastplate, zero clipping!)
  for (let r = 0; r < 3; r++) {
    const yBot = 0.115 + r * 0.062;
    const rx = 0.242 + r * 0.015;
    const rz = 0.204 + r * 0.008;
    const abGeo = createCurvedPanelGeometry(
      [
        { y: yBot, rx, rz, thickness: 0.018 },
        { y: yBot + 0.042, rx: rx + 0.005, rz: rz + 0.004, thickness: 0.018 },
      ],
      -Math.PI * 0.66,
      -Math.PI * 0.34,
      10
    );
    disposables.push(abGeo);
    torso.add(new THREE.Mesh(abGeo, charcoalSteelMat));
  }

  // Heavy curved rear harness backplate (clean +20mm clearance outside rear nomex core!)
  const backPlateGeo = createCurvedPanelGeometry(
    [
      { y: 0.11, rx: 0.232, rz: 0.184, thickness: 0.026 },
      { y: 0.33, rx: 0.272, rz: 0.204, thickness: 0.028 },
      { y: 0.51, rx: 0.246, rz: 0.188, thickness: 0.024 },
    ],
    Math.PI * 0.14,
    Math.PI * 0.86,
    16
  );
  disposables.push(backPlateGeo);
  torso.add(new THREE.Mesh(backPlateGeo, charcoalSteelMat));

  // Snug Insulated Ribbed Nomex Neck Seal (zero hollow gap inside blast collar!)
  const neckSealGeo = createLoftedAnatomy(
    [
      { y: 0.52, rx: 0.168, rz: 0.148, squareness: 2.2 },
      { y: 0.59, rx: 0.132, rz: 0.122, squareness: 2.1 },
      { y: 0.635, rx: 0.102, rz: 0.1, squareness: 2.0 },
    ],
    14
  );
  disposables.push(neckSealGeo);
  torso.add(new THREE.Mesh(neckSealGeo, nomexAshMat));

  // Thick EOD Armored Blast-Gorget Collar (wraps jaw & neck cleanly)
  const collarGeo = createCurvedPanelGeometry(
    [
      { y: 0.51, rx: 0.182, rz: 0.168, thickness: 0.032 },
      { y: 0.625, rx: 0.188, rz: 0.174, thickness: 0.028 },
    ],
    -Math.PI * 0.88,
    Math.PI * 0.88,
    18
  );
  const collarLipGeo = createCurvedPanelGeometry(
    [
      { y: 0.612, rx: 0.19, rz: 0.176, thickness: 0.03 },
      { y: 0.636, rx: 0.192, rz: 0.178, thickness: 0.03 },
    ],
    -Math.PI * 0.86,
    Math.PI * 0.86,
    18
  );
  disposables.push(collarGeo, collarLipGeo);
  torso.add(new THREE.Mesh(collarGeo, flashArmorMat));
  torso.add(new THREE.Mesh(collarLipGeo, charcoalSteelMat));

  // ---------------------------------------------------------------------------
  // 3. 360°-SEAMLESS EOD WELDING BLAST-DOME HELMET + DUAL REBREATHER FILTERS
  // ---------------------------------------------------------------------------
  const head = new THREE.Group();
  head.position.set(0, 0.61, -0.01);
  torso.add(head);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.098, 0.12, 12), nomexAshMat);
  neck.position.y = 0.028;
  head.add(neck);

  // Solid sealed inner helmet core
  const innerHead = new THREE.Mesh(new THREE.SphereGeometry(0.126, 16, 12), charcoalSteelMat);
  innerHead.scale.set(0.98, 1.04, 1.1);
  innerHead.position.set(0, 0.162, 0.006);
  head.add(innerHead);

  // Heavy Rounded EOD Hazmat Blast-Dome (LatheGeometry, 360° seamless!)
  const domePts = [
    new THREE.Vector2(0.0, 0.305),
    new THREE.Vector2(0.082, 0.296),
    new THREE.Vector2(0.132, 0.258),
    new THREE.Vector2(0.148, 0.195),
    new THREE.Vector2(0.146, 0.125),
    new THREE.Vector2(0.13, 0.085),
  ];
  const domeGeo = new THREE.LatheGeometry(domePts, 20);
  disposables.push(domeGeo);
  const helmetDome = new THREE.Mesh(domeGeo, flashArmorMat);
  helmetDome.scale.set(1.0, 1.0, 1.12);
  helmetDome.position.set(0, 0.005, 0.008);
  helmetDome.castShadow = true;
  head.add(helmetDome);

  // Heavy Riveted Welding Blast-Brow Shield Overhang + Center Ridge Crest
  const browShieldGeo = createCurvedPanelGeometry(
    [
      { y: 0.198, rx: 0.166, rz: 0.184, thickness: 0.022 },
      { y: 0.258, rx: 0.158, rz: 0.174, thickness: 0.02 },
    ],
    -Math.PI * 0.86,
    -Math.PI * 0.14,
    14
  );
  disposables.push(browShieldGeo);
  head.add(new THREE.Mesh(browShieldGeo, charcoalSteelMat));

  const helmetCrest = new THREE.Mesh(
    createBeveledBox(0.044, 0.036, 0.23, 0.008),
    hazardYellowMat
  );
  helmetCrest.position.set(0, 0.296, 0.008);
  head.add(helmetCrest);

  // Iconic Wide Curved Molten-Amber Welding Visor Slit (proud +16mm outside bezel -> ZERO Z-fighting!)
  const visorFrameGeo = createCurvedPanelGeometry(
    [
      { y: 0.132, rx: 0.146, rz: 0.162, thickness: 0.016 },
      { y: 0.198, rx: 0.15, rz: 0.166, thickness: 0.016 },
    ],
    -Math.PI * 0.82,
    -Math.PI * 0.18,
    14
  );
  const visorLensGeo = createCurvedPanelGeometry(
    [
      { y: 0.148, rx: 0.162, rz: 0.18, thickness: 0.008 },
      { y: 0.184, rx: 0.164, rz: 0.182, thickness: 0.008 },
    ],
    -Math.PI * 0.77,
    -Math.PI * 0.23,
    14
  );
  disposables.push(visorFrameGeo, visorLensGeo);
  head.add(new THREE.Mesh(visorFrameGeo, charcoalSteelMat));
  head.add(new THREE.Mesh(visorLensGeo, visorMat));

  // Heavy Lower EOD Respirator Jawplate + Twin Industrial Dual-Canister Gas-Mask Filters!
  const jawGeo = createCurvedPanelGeometry(
    [
      { y: 0.056, rx: 0.118, rz: 0.152, thickness: 0.024 },
      { y: 0.132, rx: 0.138, rz: 0.164, thickness: 0.024 },
    ],
    -Math.PI * 0.8,
    -Math.PI * 0.2,
    12
  );
  disposables.push(jawGeo);
  head.add(new THREE.Mesh(jawGeo, charcoalSteelMat));

  const snout = new THREE.Mesh(createBeveledBox(0.072, 0.064, 0.068, 0.014), charcoalSteelMat);
  snout.position.set(0, 0.092, -0.152);
  snout.rotation.x = 0.24;
  head.add(snout);

  const snoutGrill = new THREE.Mesh(
    createBeveledBox(0.048, 0.016, 0.014, 0.003),
    hazardYellowMat
  );
  snoutGrill.position.set(0, 0.09, -0.184);
  head.add(snoutGrill);

  for (const side of [-1, 1]) {
    // Dual angled cylindrical industrial gas-mask filter canisters on cheeks
    const filterGrp = new THREE.Group();
    filterGrp.position.set(side * 0.088, 0.088, -0.135);
    filterGrp.rotation.set(0.32, side * -0.58, side * 0.18);
    head.add(filterGrp);

    const can = new THREE.Mesh(
      new THREE.CylinderGeometry(0.034, 0.036, 0.066, 12),
      charcoalSteelMat
    );
    can.rotation.x = Math.PI / 2;
    filterGrp.add(can);

    const canBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.036, 0.016, 12),
      hazardYellowMat
    );
    canBand.rotation.x = Math.PI / 2;
    canBand.position.z = -0.016;
    filterGrp.add(canBand);

    const canFace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 0.01, 10),
      brassValveMat
    );
    canFace.rotation.x = Math.PI / 2;
    canFace.position.z = -0.034;
    filterGrp.add(canFace);

    // Side blast ear-cups
    const ear = new THREE.Mesh(createBeveledBox(0.046, 0.104, 0.104, 0.016), charcoalSteelMat);
    ear.position.set(side * 0.146, 0.155, 0.012);
    head.add(ear);
  }

  // Right-side helmet tactical floodlamp housing
  const lampMount = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.026, 0.075, 10),
    charcoalSteelMat
  );
  lampMount.rotation.x = Math.PI / 2;
  lampMount.position.set(0.158, 0.215, -0.045);
  head.add(lampMount);

  const lampLens = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.012, 10), visorMat);
  lampLens.rotation.x = Math.PI / 2;
  lampLens.position.set(0.158, 0.215, -0.084);
  head.add(lampLens);

  const visorGlintOrigin = new THREE.Object3D();
  visorGlintOrigin.position.set(0, 0.168, -0.215);
  head.add(visorGlintOrigin);

  return {
    pelvis,
    torso,
    head,
    visorMat,
    visorGlintOrigin,
    disposables,
  };
}
