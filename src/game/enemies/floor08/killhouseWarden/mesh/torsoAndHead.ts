import * as THREE from 'three';
import {
  createBeveledBox,
  createCurvedPanelGeometry,
  createLoftedAnatomy,
} from '../../../../core/sculptUtils';
import type { Floor08EnemyMaterials } from '../../../core/enemyMeshShared';

export interface WardenTorsoParts {
  pelvis: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftCoatTail: THREE.Group;
  rightCoatTail: THREE.Group;
  visorMat: THREE.MeshStandardMaterial;
  opticGlintOrigin: THREE.Object3D;
  setDashPlume: (intensity: number, elapsed: number) => void;
  disposables: Array<{ dispose: () => void }>;
}

/**
 * AAA Zone Mini-Boss Torso, Layered Spec-Ops Commander Rig, Articulated Split Ballistic
 * Trench-Coattails, Hip Flash-Dash Thruster Vents, and 360°-Seamless Tri-Optic Commander
 * Helmet for WARDEN-08 "SABLE".
 *
 * Distinct visual language from Kage-08 (crimson samurai), Breacher-08 (olive quad-NOD),
 * and Aegis-Riot (navy/cyan juggernaut):
 * - Sleek Obsidian-Graphite Carbon + Brushed Champagne Gold Commander Trim + Warm Ivory Accent Plates
 * - Iconic Splinter-Cell / MaxTac Glowing Solar-Gold Tri-Optic Night-Vision Goggles
 * - Sculpted curved split tactical trench-coattails with gold hem accents that flare during flash-dashes!
 */
export function buildWardenTorsoAndHead(
  mats: Floor08EnemyMaterials,
  flashArmorMat: THREE.MeshStandardMaterial
): WardenTorsoParts {
  const disposables: Array<{ dispose: () => void }> = [];

  // Sleek obsidian-graphite ballistic weave
  const obsidianCarbonMat = new THREE.MeshStandardMaterial({
    color: 0x1b1e28,
    roughness: 0.64,
    metalness: 0.34,
    bumpMap: mats.armorDark.bumpMap,
    bumpScale: 0.012,
  });
  // Warm champagne-gold brushed commander trim (distinct high-status mini-boss accent!)
  const champagneGoldMat = new THREE.MeshStandardMaterial({
    color: 0xdca536,
    roughness: 0.28,
    metalness: 0.82,
    bumpMap: mats.armorGoldTrim.bumpMap,
    bumpScale: 0.006,
  });
  // Warm ivory-silver cerakote highlight plates so silhouette pops sharply inside dark Killhouse!
  const ivoryCerakoteMat = new THREE.MeshStandardMaterial({
    color: 0xcbd2dc,
    roughness: 0.44,
    metalness: 0.28,
    bumpMap: mats.armorHeavy.bumpMap,
    bumpScale: 0.008,
  });
  // Blazing solar-amber tri-optic goggles & tactical LED strips
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0xffe498,
    emissive: 0xffa818,
    emissiveIntensity: 3.6,
    roughness: 0.1,
    metalness: 0.15,
  });
  disposables.push(obsidianCarbonMat, champagneGoldMat, ivoryCerakoteMat, visorMat);

  // ---------------------------------------------------------------------------
  // 1. ATHLETIC SPEC-OPS PELVIS, UTILITY BELT & SPLIT ARMORED TRENCH-COATTAILS
  // ---------------------------------------------------------------------------
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 1.02, 0);

  const pelvisGeo = createLoftedAnatomy(
    [
      { y: -0.09, rx: 0.135, rz: 0.106, squareness: 2.3 },
      { y: 0.0, rx: 0.172, rz: 0.128, squareness: 2.45 },
      { y: 0.075, rx: 0.168, rz: 0.124, squareness: 2.45 },
      { y: 0.12, rx: 0.154, rz: 0.114, squareness: 2.35 },
    ],
    18
  );
  disposables.push(pelvisGeo);
  const pelvisMesh = new THREE.Mesh(pelvisGeo, mats.undersuit);
  pelvisMesh.castShadow = true;
  pelvis.add(pelvisMesh);

  // Tailored Spec-Ops Gunfighter Belt with Gold Buckle & Twin Spare SMG Mag Pouches
  const beltGeo = createLoftedAnatomy(
    [
      { y: 0.015, rx: 0.184, rz: 0.138, squareness: 2.55 },
      { y: 0.055, rx: 0.19, rz: 0.144, squareness: 2.6 },
      { y: 0.095, rx: 0.18, rz: 0.136, squareness: 2.5 },
    ],
    18
  );
  disposables.push(beltGeo);
  pelvis.add(new THREE.Mesh(beltGeo, obsidianCarbonMat));

  const buckle = new THREE.Mesh(createBeveledBox(0.095, 0.058, 0.036, 0.008), champagneGoldMat);
  buckle.position.set(0, 0.055, -0.146);
  pelvis.add(buckle);

  // Sculpted front armored groin apron with gold edge trim
  const groinGeo = createCurvedPanelGeometry(
    [
      { y: -0.16, rx: 0.1, rz: 0.138, thickness: 0.018 },
      { y: -0.03, rx: 0.148, rz: 0.15, thickness: 0.02 },
    ],
    -Math.PI * 0.68,
    -Math.PI * 0.32,
    12
  );
  disposables.push(groinGeo);
  pelvis.add(new THREE.Mesh(groinGeo, obsidianCarbonMat));

  // Front-hip quick-draw VX-9 spare extended magazine pouches (2 per side)
  for (const side of [-1, 1]) {
    for (let m = 0; m < 2; m++) {
      const magPouch = new THREE.Mesh(
        createBeveledBox(0.032, 0.115, 0.044, 0.006),
        mats.armorSlate
      );
      magPouch.position.set(side * (0.115 + m * 0.045), 0.01, -0.138 + m * 0.02);
      magPouch.rotation.z = side * 0.08;
      pelvis.add(magPouch);
    }
  }

  // Twin Sculpted Curved Split Tactical Trench-Coattails (Zero flat boxes, generous thigh clearance!)
  const buildCoatTail = (side: -1 | 1): THREE.Group => {
    const tailGrp = new THREE.Group();
    tailGrp.position.set(side * 0.028, 0.015, 0.032);
    pelvis.add(tailGrp);

    const startAng = side < 0 ? Math.PI * 0.53 : Math.PI * 0.03;
    const endAng = side < 0 ? Math.PI * 0.97 : Math.PI * 0.47;
    const panelGeo = createCurvedPanelGeometry(
      [
        { y: -0.63, rx: 0.288, rz: 0.258, thickness: 0.018 },
        { y: -0.34, rx: 0.246, rz: 0.214, thickness: 0.02 },
        { y: -0.04, rx: 0.204, rz: 0.168, thickness: 0.02 },
      ],
      startAng,
      endAng,
      16
    );
    const hemGeo = createCurvedPanelGeometry(
      [
        { y: -0.646, rx: 0.294, rz: 0.264, thickness: 0.022 },
        { y: -0.594, rx: 0.285, rz: 0.255, thickness: 0.022 },
      ],
      startAng,
      endAng,
      16
    );
    const innerStripeGeo = createCurvedPanelGeometry(
      [
        { y: -0.57, rx: 0.28, rz: 0.25, thickness: 0.021 },
        { y: -0.14, rx: 0.222, rz: 0.184, thickness: 0.021 },
      ],
      side < 0 ? Math.PI * 0.9 : Math.PI * 0.03,
      side < 0 ? Math.PI * 0.97 : Math.PI * 0.1,
      6
    );
    disposables.push(panelGeo, hemGeo, innerStripeGeo);

    const coatMesh = new THREE.Mesh(panelGeo, obsidianCarbonMat);
    coatMesh.castShadow = true;
    tailGrp.add(coatMesh);
    tailGrp.add(new THREE.Mesh(hemGeo, champagneGoldMat));
    tailGrp.add(new THREE.Mesh(innerStripeGeo, ivoryCerakoteMat));

    return tailGrp;
  };

  const leftCoatTail = buildCoatTail(-1);
  const rightCoatTail = buildCoatTail(1);

  // Twin Rear-Hip Kinetic Flash-Dash Micro-Thrusters + Volumetric Amber-Gold Jet Plumes!
  const nozzleGeo = new THREE.CylinderGeometry(0.032, 0.048, 0.11, 10);
  const throatGeo = new THREE.CircleGeometry(0.038, 10);
  throatGeo.rotateX(Math.PI / 2);
  const plumeCoreGeo = new THREE.ConeGeometry(0.026, 0.34, 8, 1, true);
  plumeCoreGeo.rotateX(Math.PI);
  plumeCoreGeo.translate(0, -0.17, 0);
  const plumeOuterGeo = new THREE.ConeGeometry(0.056, 0.56, 10, 1, true);
  plumeOuterGeo.rotateX(Math.PI);
  plumeOuterGeo.translate(0, -0.28, 0);
  disposables.push(nozzleGeo, throatGeo, plumeCoreGeo, plumeOuterGeo);

  const plumeCoreMat = new THREE.MeshBasicMaterial({
    color: 0xfff8dc,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const plumeOuterMat = new THREE.MeshBasicMaterial({
    color: 0xffa818,
    transparent: true,
    opacity: 0.74,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  disposables.push(plumeCoreMat, plumeOuterMat);

  const buildHipThruster = (side: -1 | 1) => {
    const noz = new THREE.Group();
    noz.position.set(side * 0.155, 0.045, 0.142);
    noz.rotation.set(-1.18, 0, side * 0.28);
    pelvis.add(noz);

    noz.add(new THREE.Mesh(nozzleGeo, mats.titaniumJoint));
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.007, 6, 12), visorMat);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = -0.052;
    noz.add(lip);

    const throat = new THREE.Mesh(throatGeo, plumeCoreMat);
    throat.position.y = -0.048;
    throat.visible = false;
    noz.add(throat);

    const pCore = new THREE.Mesh(plumeCoreGeo, plumeCoreMat);
    pCore.position.y = -0.05;
    pCore.visible = false;
    noz.add(pCore);

    const pOuter = new THREE.Mesh(plumeOuterGeo, plumeOuterMat);
    pOuter.position.y = -0.048;
    pOuter.visible = false;
    noz.add(pOuter);

    return { throat, pCore, pOuter };
  };

  const thrL = buildHipThruster(-1);
  const thrR = buildHipThruster(1);

  const setDashPlume = (intensity: number, elapsed: number): void => {
    const throatOn = intensity > 0.15;
    const conesOn = intensity > 0.28;
    thrL.throat.visible = throatOn;
    thrR.throat.visible = throatOn;
    thrL.pCore.visible = conesOn;
    thrL.pOuter.visible = conesOn;
    thrR.pCore.visible = conesOn;
    thrR.pOuter.visible = conesOn;
    if (!conesOn) return;

    const power = Math.min(1.4, (intensity - 0.22) / 0.85);
    const fL = 0.86 + Math.sin(elapsed * 64) * 0.14;
    const fR = 0.86 + Math.cos(elapsed * 59) * 0.14;
    const len = 0.55 + power * 0.72;
    const wid = 0.75 + power * 0.3;

    thrL.pCore.scale.set(wid * 0.82, len * fL * 0.9, wid * 0.82);
    thrL.pOuter.scale.set(wid, len * fL, wid);
    thrR.pCore.scale.set(wid * 0.82, len * fR * 0.9, wid * 0.82);
    thrR.pOuter.scale.set(wid, len * fR, wid);
    plumeOuterMat.opacity = Math.min(0.84, 0.4 + power * 0.38);
    plumeCoreMat.opacity = Math.min(0.98, 0.62 + power * 0.34);
  };

  // ---------------------------------------------------------------------------
  // 2. ATHLETIC V-TAPER SPEC-OPS COMMANDER TORSO & HIGH TACTICAL COLLAR SHROUD
  // ---------------------------------------------------------------------------
  const torso = new THREE.Group();
  torso.position.set(0, 0.09, 0);
  pelvis.add(torso);

  const coreGeo = createLoftedAnatomy(
    [
      { y: -0.02, rx: 0.15, rz: 0.114, squareness: 2.35 },
      { y: 0.14, rx: 0.175, rz: 0.132, squareness: 2.45, frontScale: 1.06 },
      { y: 0.3, rx: 0.215, rz: 0.148, squareness: 2.55, frontScale: 1.1 },
      { y: 0.44, rx: 0.238, rz: 0.154, squareness: 2.6, frontScale: 1.12 },
      { y: 0.53, rx: 0.212, rz: 0.138, squareness: 2.4 },
      { y: 0.58, rx: 0.148, rz: 0.112, squareness: 2.2 },
    ],
    22
  );
  disposables.push(coreGeo);
  const coreMesh = new THREE.Mesh(coreGeo, mats.undersuit);
  coreMesh.castShadow = true;
  torso.add(coreMesh);

  // Curved multi-plate MaxTac / Spec-Ops Ballistic Breastplate
  const chestPlateGeo = createCurvedPanelGeometry(
    [
      { y: 0.1, rx: 0.184, rz: 0.144, thickness: 0.026 },
      { y: 0.28, rx: 0.228, rz: 0.166, thickness: 0.03 },
      { y: 0.43, rx: 0.242, rz: 0.172, thickness: 0.028 },
      { y: 0.51, rx: 0.195, rz: 0.148, thickness: 0.024 },
    ],
    -Math.PI * 0.86,
    -Math.PI * 0.14,
    18
  );
  disposables.push(chestPlateGeo);
  const chestPlate = new THREE.Mesh(chestPlateGeo, flashArmorMat);
  chestPlate.castShadow = true;
  torso.add(chestPlate);

  // Sculpted Curved Upper Pectoral Spec-Ops Armor Overlay + Recessed Ivory Clavicle Accents
  const upperChestCapGeo = createCurvedPanelGeometry(
    [
      { y: 0.31, rx: 0.234, rz: 0.174, thickness: 0.022 },
      { y: 0.425, rx: 0.248, rz: 0.182, thickness: 0.024 },
      { y: 0.485, rx: 0.216, rz: 0.162, thickness: 0.018 },
    ],
    -Math.PI * 0.78,
    -Math.PI * 0.22,
    16
  );
  disposables.push(upperChestCapGeo);
  torso.add(new THREE.Mesh(upperChestCapGeo, obsidianCarbonMat));

  // Sleek curved ivory-cerakote upper clavicle trim bands (flush with chest curvature!)
  const ivoryAccentGeo = createCurvedPanelGeometry(
    [
      { y: 0.432, rx: 0.244, rz: 0.18, thickness: 0.024 },
      { y: 0.474, rx: 0.22, rz: 0.166, thickness: 0.022 },
    ],
    -Math.PI * 0.72,
    -Math.PI * 0.28,
    14
  );
  disposables.push(ivoryAccentGeo);
  torso.add(new THREE.Mesh(ivoryAccentGeo, ivoryCerakoteMat));

  // Sculpted Brushed Gold Commander V-Chevron Insignia + Harness Straps
  for (const side of [-1, 1]) {
    const chev = new THREE.Mesh(createBeveledBox(0.115, 0.022, 0.018, 0.004), champagneGoldMat);
    chev.position.set(side * 0.048, 0.372, -0.194);
    chev.rotation.z = side * 0.34;
    chev.rotation.y = side * -0.16;
    torso.add(chev);

    // Shoulder-to-chest tactical load-bearing harness straps
    const strap = new THREE.Mesh(createBeveledBox(0.042, 0.22, 0.028, 0.006), obsidianCarbonMat);
    strap.position.set(side * 0.132, 0.455, -0.112);
    strap.rotation.x = 0.24;
    strap.rotation.z = side * -0.12;
    torso.add(strap);

    const strapClasp = new THREE.Mesh(
      createBeveledBox(0.048, 0.024, 0.032, 0.004),
      champagneGoldMat
    );
    strapClasp.position.set(side * 0.128, 0.425, -0.152);
    torso.add(strapClasp);

    // Angled side-rib oblique armor bolsters
    const oblique = new THREE.Mesh(createBeveledBox(0.055, 0.145, 0.036, 0.008), obsidianCarbonMat);
    oblique.position.set(side * 0.132, 0.21, -0.135);
    oblique.rotation.y = side * -0.45;
    torso.add(oblique);
  }

  const chestTelemetryBar = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.014, 0.012), visorMat);
  chestTelemetryBar.position.set(0, 0.415, -0.195);
  torso.add(chestTelemetryBar);

  // Curved segmented abdominal ceramic armor panels (conforms seamlessly to torso contour!)
  for (let r = 0; r < 3; r++) {
    const yBot = 0.115 + r * 0.056;
    const rx = 0.186 + r * 0.014;
    const rz = 0.15 + r * 0.008;
    const abGeo = createCurvedPanelGeometry(
      [
        { y: yBot, rx, rz, thickness: 0.02 },
        { y: yBot + 0.042, rx: rx + 0.005, rz: rz + 0.004, thickness: 0.02 },
      ],
      -Math.PI * 0.68,
      -Math.PI * 0.32,
      10
    );
    disposables.push(abGeo);
    torso.add(new THREE.Mesh(abGeo, obsidianCarbonMat));
  }

  // Curved rear ballistic backplate
  const backPlateGeo = createCurvedPanelGeometry(
    [
      { y: 0.12, rx: 0.188, rz: 0.142, thickness: 0.024 },
      { y: 0.32, rx: 0.226, rz: 0.162, thickness: 0.026 },
      { y: 0.49, rx: 0.198, rz: 0.146, thickness: 0.022 },
    ],
    Math.PI * 0.14,
    Math.PI * 0.86,
    16
  );
  disposables.push(backPlateGeo);
  torso.add(new THREE.Mesh(backPlateGeo, obsidianCarbonMat));

  // Snug Ribbed Tactical Neck-Seal Undersuit (eliminates any hollow gap inside collar!)
  const neckSealGeo = createLoftedAnatomy(
    [
      { y: 0.51, rx: 0.142, rz: 0.126, squareness: 2.15 },
      { y: 0.575, rx: 0.112, rz: 0.104, squareness: 2.05 },
      { y: 0.615, rx: 0.088, rz: 0.088, squareness: 2.0 },
    ],
    14
  );
  disposables.push(neckSealGeo);
  torso.add(new THREE.Mesh(neckSealGeo, mats.undersuit));

  // Swept High-Collar Spec-Ops Trench Shroud (Tightened around neck seal, zero gaps!)
  const collarGeo = createCurvedPanelGeometry(
    [
      { y: 0.495, rx: 0.15, rz: 0.136, thickness: 0.024 },
      { y: 0.605, rx: 0.156, rz: 0.142, thickness: 0.02 },
    ],
    -Math.PI * 0.86,
    Math.PI * 0.86,
    18
  );
  const collarTrimGeo = createCurvedPanelGeometry(
    [
      { y: 0.592, rx: 0.158, rz: 0.144, thickness: 0.022 },
      { y: 0.614, rx: 0.16, rz: 0.146, thickness: 0.022 },
    ],
    -Math.PI * 0.84,
    Math.PI * 0.84,
    18
  );
  disposables.push(collarGeo, collarTrimGeo);
  torso.add(new THREE.Mesh(collarGeo, obsidianCarbonMat));
  torso.add(new THREE.Mesh(collarTrimGeo, champagneGoldMat));

  // ---------------------------------------------------------------------------
  // 3. 360°-SEAMLESS SPEC-OPS COMMANDER HELMET + TRI-OPTIC SOLAR-GOLD GOGGLES
  // ---------------------------------------------------------------------------
  const head = new THREE.Group();
  head.position.set(0, 0.59, -0.008);
  torso.add(head);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.088, 0.125, 12), mats.undersuit);
  neck.position.y = 0.032;
  head.add(neck);

  // Solid sealed inner head core (zero gaps from any 360° angle!)
  const innerHead = new THREE.Mesh(new THREE.SphereGeometry(0.114, 16, 12), mats.undersuit);
  innerHead.scale.set(0.95, 1.05, 1.08);
  innerHead.position.set(0, 0.16, 0.006);
  head.add(innerHead);

  // Aerodynamic Sculpted Tactical Commander Helmet Dome (LatheGeometry)
  const domePts = [
    new THREE.Vector2(0.0, 0.285),
    new THREE.Vector2(0.068, 0.278),
    new THREE.Vector2(0.116, 0.244),
    new THREE.Vector2(0.132, 0.185),
    new THREE.Vector2(0.128, 0.125),
    new THREE.Vector2(0.112, 0.092),
  ];
  const domeGeo = new THREE.LatheGeometry(domePts, 18);
  disposables.push(domeGeo);
  const helmetDome = new THREE.Mesh(domeGeo, flashArmorMat);
  helmetDome.scale.set(0.98, 1.0, 1.12);
  helmetDome.position.set(0, 0.006, 0.01);
  helmetDome.castShadow = true;
  head.add(helmetDome);

  // Sleek ivory-cerakote forehead crown strip & champagne-gold central commander crest
  const crownStrip = new THREE.Mesh(createBeveledBox(0.106, 0.028, 0.205, 0.008), ivoryCerakoteMat);
  crownStrip.position.set(0, 0.268, 0.008);
  head.add(crownStrip);

  const goldCrest = new THREE.Mesh(createBeveledBox(0.032, 0.024, 0.225, 0.006), champagneGoldMat);
  goldCrest.position.set(0, 0.284, 0.005);
  head.add(goldCrest);

  // Sleek Angled Tactical NVG Brow Shroud + Lethal Tri-Optic Solar-Gold Lenses!
  const nvgBridge = new THREE.Mesh(createBeveledBox(0.172, 0.048, 0.066, 0.012), obsidianCarbonMat);
  nvgBridge.position.set(0, 0.182, -0.112);
  head.add(nvgBridge);

  const nvgGoldRim = new THREE.Mesh(createBeveledBox(0.158, 0.012, 0.022, 0.003), champagneGoldMat);
  nvgGoldRim.position.set(0, 0.208, -0.135);
  head.add(nvgGoldRim);

  // Signature Splinter-Cell / MaxTac Tri-Optic Goggle Barrels (Tighter, sleeker predator ratio!)
  const opticCoords: ReadonlyArray<[number, number, number]> = [
    [-0.044, 0.162, 0.0185],
    [0.044, 0.162, 0.0185],
    [0.0, 0.204, 0.0205],
  ];
  for (const [ox, oy, rad] of opticCoords) {
    const housing = new THREE.Mesh(
      new THREE.CylinderGeometry(rad + 0.008, rad + 0.01, 0.056, 12),
      obsidianCarbonMat
    );
    housing.rotation.x = Math.PI / 2;
    housing.position.set(ox, oy, -0.132);
    head.add(housing);

    const bezel = new THREE.Mesh(
      new THREE.TorusGeometry(rad + 0.004, 0.0035, 6, 14),
      champagneGoldMat
    );
    bezel.position.set(ox, oy, -0.156);
    head.add(bezel);

    const lens = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 0.014, 12), visorMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(ox, oy, -0.156);
    head.add(lens);
  }

  // Sculpted Angled V-Shaped Ballistic Respirator Half-Mask + Cheek Filter Vents
  const maskGeo = createCurvedPanelGeometry(
    [
      { y: 0.06, rx: 0.092, rz: 0.128, thickness: 0.022 },
      { y: 0.132, rx: 0.118, rz: 0.136, thickness: 0.022 },
    ],
    -Math.PI * 0.78,
    -Math.PI * 0.22,
    12
  );
  disposables.push(maskGeo);
  head.add(new THREE.Mesh(maskGeo, obsidianCarbonMat));

  const chinPlate = new THREE.Mesh(createBeveledBox(0.068, 0.042, 0.044, 0.01), flashArmorMat);
  chinPlate.position.set(0, 0.088, -0.126);
  chinPlate.rotation.x = 0.22;
  head.add(chinPlate);

  const chinGoldVent = new THREE.Mesh(createBeveledBox(0.044, 0.01, 0.014, 0.002), champagneGoldMat);
  chinGoldVent.position.set(0, 0.086, -0.148);
  head.add(chinGoldVent);

  for (const side of [-1, 1]) {
    const cheekFilter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.02, 0.022, 10),
      obsidianCarbonMat
    );
    cheekFilter.rotation.set(Math.PI / 2, 0, side * -0.42);
    cheekFilter.position.set(side * 0.062, 0.096, -0.116);
    head.add(cheekFilter);
  }

  // Side tactical comms headsets + right-side stub commander whip antenna
  for (const side of [-1, 1]) {
    const earPod = new THREE.Mesh(createBeveledBox(0.04, 0.096, 0.09, 0.012), obsidianCarbonMat);
    earPod.position.set(side * 0.128, 0.15, 0.01);
    head.add(earPod);

    const earGold = new THREE.Mesh(createBeveledBox(0.044, 0.026, 0.056, 0.005), champagneGoldMat);
    earGold.position.set(side * 0.13, 0.15, 0.01);
    head.add(earGold);
  }

  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.008, 0.19, 6),
    mats.titaniumJoint
  );
  antenna.position.set(0.132, 0.275, 0.04);
  antenna.rotation.x = -0.14;
  head.add(antenna);

  const rearBattery = new THREE.Mesh(createBeveledBox(0.122, 0.075, 0.062, 0.012), obsidianCarbonMat);
  rearBattery.position.set(0, 0.145, 0.142);
  head.add(rearBattery);

  const opticGlintOrigin = new THREE.Object3D();
  opticGlintOrigin.position.set(0, 0.204, -0.195);
  head.add(opticGlintOrigin);

  return {
    pelvis,
    torso,
    head,
    leftCoatTail,
    rightCoatTail,
    visorMat,
    opticGlintOrigin,
    setDashPlume,
    disposables,
  };
}
