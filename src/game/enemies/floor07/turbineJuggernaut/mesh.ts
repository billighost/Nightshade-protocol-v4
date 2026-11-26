import * as THREE from 'three';
import {
  createBeveledBox,
  createCurvedPanelGeometry,
  createLoftedAnatomy,
} from '../../../core/sculptUtils';
import { createEnemyContactShadow, createEnemyHitboxMesh } from '../../core/enemyMeshShared';
import type { EnemyAnimationInput, EnemyRigHandle } from '../../core/types';
import type { Floor07EnemyMaterials } from '../materials';
import {
  createTurbineJuggernautTextures,
  type TurbineJuggernautTextureSuite,
} from './textures';

export interface TurbineJuggernautRigHandle extends EnemyRigHandle {
  setTargetLaser: (active: boolean, length: number, dangerRatio: number) => void;
  getPiledriverWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  getTeslaPylonWorldPos: (side: -1 | 1, out: THREE.Vector3) => THREE.Vector3;
  getRadiatorVentWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  setBarrelHeat: (heat01: number) => void;
}

/**
 * AAA Sculpted Mini-Boss Rig for Floor 07 Zone Mini-Boss #1:
 * TURBINE JUGGERNAUT "VOLT-VII" (SE Coolant Turbine Gallery)
 * - 2.55m colossal industrial power-plant siege exo-suit in weathered tungsten-slate &
 *   hazard-ochre armor plating, tightly wound enameled copper Tesla induction coils,
 *   heavy ribbed hydraulic exo-frame, and blazing molten-amber dorsal thermal core.
 * - Sculpted lofted dreadnought torso with twin spinning chest turbine intake fans, heavy
 *   overhead hydraulic blast roll-cage, and deep-set triple-lens furnace visor helm.
 * - Iconic Dorsal Cooling Radiator Pack (`cooling_radiator` weakpoint): flanked by twin vertical
 *   copper Tesla generator stacks with articulated armored blast-louvre doors that SWING WIDE OPEN
 *   during Thermal Venting, Stagger, and Phase 2 Overdrive!
 * - Left Arm: Heavy Hydraulic Arc-Piledriver Siege Gauntlet & curved forearm buckler shield.
 * - Right Arm: Colossal 6-Barrel "VOLT-VULCAN" Electromagnetic Rotary Autocannon with copper
 *   induction drum, heat-glowing barrels, live wall-clipped targeting laser, and flex ammo belt.
 */
export function buildTurbineJuggernautRig(
  enemyId: string,
  mats: Floor07EnemyMaterials,
  sharedTextures?: TurbineJuggernautTextureSuite
): TurbineJuggernautRigHandle {
  const tex = sharedTextures ?? createTurbineJuggernautTextures();
  const ownsTextures = !sharedTextures;

  const root = new THREE.Group();
  const disposedGeos: THREE.BufferGeometry[] = [];
  const disposedMats: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposedGeos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposedMats.push(m);
    return m;
  };

  // High-key PBR materials (color: 0xffffff so procedural albedo textures keep full contrast!)
  const armorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.armorAlbedo,
      bumpMap: tex.armorBump,
      bumpScale: 0.024,
      roughnessMap: tex.armorRoughness,
      roughness: 0.78,
      metalness: 0.42,
    })
  );

  const darkSteelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.hydraulicAlbedo,
      bumpMap: tex.hydraulicBump,
      bumpScale: 0.022,
      roughness: 0.56,
      metalness: 0.68,
    })
  );

  const copperMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.copperCoilAlbedo,
      bumpMap: tex.copperCoilBump,
      bumpScale: 0.026,
      roughness: 0.34,
      metalness: 0.86,
    })
  );

  const ochreAccentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.armorAlbedo,
      bumpMap: tex.armorBump,
      bumpScale: 0.022,
      roughnessMap: tex.armorRoughness,
      roughness: 0.76,
      metalness: 0.44,
    })
  );

  const chromeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd4dce6,
      roughness: 0.22,
      metalness: 0.92,
    })
  );

  const rotaryBarrelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x6c7582,
      emissive: 0xff5410,
      emissiveIntensity: 0.0,
      roughness: 0.34,
      metalness: 0.88,
    })
  );

  const weakpointMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.radiatorCoreMap,
      emissive: 0xff5a12,
      emissiveMap: tex.radiatorCoreMap,
      emissiveIntensity: 2.2,
      roughness: 0.24,
      metalness: 0.2,
    })
  );

  const arcCoilGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x4ae8ff,
      emissive: 0x1cd8ff,
      emissiveIntensity: 1.85,
      roughness: 0.2,
      metalness: 0.15,
    })
  );

  const visorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x62f2ff,
      emissive: 0x20d8ff,
      emissiveIntensity: 2.3,
      roughness: 0.12,
      metalness: 0.2,
    })
  );

  const laserCoreMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffd27a,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );

  const laserHaloMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xff4c12,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );

  const reg = (m: THREE.Mesh): THREE.Mesh => {
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  // Ground contact shadow (always pass mats.contactShadow!)
  root.add(createEnemyContactShadow(1.06, mats.contactShadow));

  // Child rigBody group (NEVER mutate root.position/rotation — owned by EnemyManager!)
  const rigBody = new THREE.Group();
  root.add(rigBody);

  // =========================================================================
  // 1. HEAVY HYDRAULIC PELVIS & REINFORCED SIEGE LEGS
  // =========================================================================
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 1.12, 0);
  rigBody.add(pelvis);

  // Sculpted armored siege pelvis & wide tactical belt girdle (strictly increasing y!)
  const pelvisGeo = trackGeo(
    createLoftedAnatomy(
      [
        { y: -0.2, rx: 0.2, rz: 0.2, squareness: 2.6 },
        { y: -0.04, rx: 0.34, rz: 0.27, squareness: 2.7 },
        { y: 0.12, rx: 0.38, rz: 0.29, squareness: 2.75 },
        { y: 0.22, rx: 0.36, rz: 0.27, squareness: 2.6 },
      ],
      18
    )
  );
  pelvis.add(reg(new THREE.Mesh(pelvisGeo, darkSteelMat)));

  // Heavy bolted tactical armored waist belt & front sloped armored codpiece plate
  const waistBelt = reg(
    new THREE.Mesh(trackGeo(createBeveledBox(0.8, 0.16, 0.6, 0.024)), armorMat)
  );
  waistBelt.position.set(0, 0.14, -0.01);
  pelvis.add(waistBelt);

  const beltBuckle = reg(
    new THREE.Mesh(trackGeo(createBeveledBox(0.24, 0.18, 0.1, 0.016)), darkSteelMat)
  );
  beltBuckle.position.set(0, 0.14, -0.31);
  pelvis.add(beltBuckle);

  const codpiece = reg(
    new THREE.Mesh(trackGeo(createBeveledBox(0.32, 0.32, 0.14, 0.024)), armorMat)
  );
  codpiece.position.set(0, -0.08, -0.26);
  codpiece.rotation.x = 0.16;
  pelvis.add(codpiece);

  // Twin heavy side hip armored tasset skirts, ammo canisters & hip axle bearings
  for (const side of [-1, 1] as const) {
    const hipAxle = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.115, 0.115, 0.16, 14)),
      chromeMat
    );
    hipAxle.rotation.z = Math.PI * 0.5;
    hipAxle.position.set(side * 0.31, -0.04, 0);
    pelvis.add(hipAxle);

    const hipSkirt = reg(
      new THREE.Mesh(trackGeo(createBeveledBox(0.11, 0.34, 0.42, 0.02)), armorMat)
    );
    hipSkirt.position.set(side * 0.43, -0.01, -0.02);
    hipSkirt.rotation.z = -side * 0.15;
    pelvis.add(hipSkirt);
  }

  // Reusable sculpted heavy thigh & greave loft geometries (strictly increasing y!)
  const thighGeo = trackGeo(
    createLoftedAnatomy(
      [
        { y: -0.5, rx: 0.14, rz: 0.16, squareness: 2.4 },
        { y: -0.3, rx: 0.185, rz: 0.21, squareness: 2.6 },
        { y: -0.1, rx: 0.195, rz: 0.22, squareness: 2.6 },
        { y: 0.04, rx: 0.155, rz: 0.175, squareness: 2.3 },
      ],
      16
    )
  );

  const shinGeo = trackGeo(
    createLoftedAnatomy(
      [
        { y: -0.48, rx: 0.165, rz: 0.19, squareness: 2.5 },
        { y: -0.28, rx: 0.18, rz: 0.215, squareness: 2.65 },
        { y: -0.06, rx: 0.16, rz: 0.185, squareness: 2.5 },
        { y: 0.04, rx: 0.135, rz: 0.155, squareness: 2.3 },
      ],
      16
    )
  );

  const kneeShieldGeo = trackGeo(
    createCurvedPanelGeometry(
      [
        { y: -0.12, rx: 0.17, rz: 0.22, thickness: 0.048 },
        { y: 0.02, rx: 0.2, rz: 0.245, thickness: 0.056 },
        { y: 0.15, rx: 0.16, rz: 0.21, thickness: 0.042 },
      ],
      -Math.PI * 0.36,
      Math.PI * 0.36,
      12
    )
  );
  kneeShieldGeo.rotateY(Math.PI); // convex shield faces -Z forward!

  const buildJuggLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();

    const thigh = reg(new THREE.Mesh(thighGeo, armorMat));
    hip.add(thigh);

    // Outer thigh copper hydraulic capacitor rod
    const thighPiston = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.036, 0.036, 0.42, 10)),
      copperMat
    );
    thighPiston.position.set(side * 0.18, -0.25, 0.04);
    hip.add(thighPiston);

    const knee = new THREE.Group();
    knee.position.set(0, -0.52, 0);
    hip.add(knee);

    // Heavy horizontal knee trunnion pin
    const kneeAxle = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.078, 0.078, 0.32, 12)),
      darkSteelMat
    );
    kneeAxle.rotation.z = Math.PI * 0.5;
    knee.add(kneeAxle);

    const kneeShield = reg(new THREE.Mesh(kneeShieldGeo, ochreAccentMat));
    kneeShield.position.set(0, 0.02, 0.02);
    knee.add(kneeShield);

    const shin = reg(new THREE.Mesh(shinGeo, darkSteelMat));
    shin.position.set(0, -0.02, 0.02);
    knee.add(shin);

    // Twin rear chrome hydraulic shock pistons driving the ankle
    for (const px of [-0.075, 0.075]) {
      const pistonTube = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.03, 0.034, 0.24, 10)),
        darkSteelMat
      );
      pistonTube.position.set(px, -0.18, 0.2);
      pistonTube.rotation.x = 0.12;
      knee.add(pistonTube);

      const pistonRod = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.018, 0.018, 0.32, 8)),
        chromeMat
      );
      pistonRod.position.set(px, -0.36, 0.17);
      pistonRod.rotation.x = 0.12;
      knee.add(pistonRod);
    }

    // Heavy splayed 3-pad industrial stabilizer boot & heel spur
    const ankle = new THREE.Group();
    ankle.position.set(0, -0.52, 0);
    knee.add(ankle);

    const bootMain = reg(
      new THREE.Mesh(trackGeo(createBeveledBox(0.28, 0.13, 0.34, 0.022)), darkSteelMat)
    );
    bootMain.position.set(0, -0.02, -0.02);
    ankle.add(bootMain);

    for (const toeX of [-0.095, 0.095]) {
      const toeClaw = reg(
        new THREE.Mesh(trackGeo(createBeveledBox(0.11, 0.1, 0.22, 0.016)), armorMat)
      );
      toeClaw.position.set(toeX, -0.04, -0.2);
      toeClaw.rotation.y = -toeX * 0.85;
      ankle.add(toeClaw);
    }

    const heelSpur = reg(
      new THREE.Mesh(trackGeo(createBeveledBox(0.16, 0.1, 0.16, 0.014)), ochreAccentMat)
    );
    heelSpur.position.set(0, -0.04, 0.18);
    ankle.add(heelSpur);

    return { hip, knee, ankle };
  };

  const leftLeg = buildJuggLeg(-1);
  leftLeg.hip.position.set(-0.29, -0.04, 0);
  pelvis.add(leftLeg.hip);

  const rightLeg = buildJuggLeg(1);
  rightLeg.hip.position.set(0.29, -0.04, 0);
  pelvis.add(rightLeg.hip);

  // =========================================================================
  // 2. COLOSSAL V-TAPERED DREADNOUGHT TURBINE TORSO & BLAST-FURNACE HELM
  // =========================================================================
  const torso = new THREE.Group();
  torso.position.set(0, 0.2, 0);
  pelvis.add(torso);

  // Articulated ribbed hydraulic waist column with twin abdominal armor plates
  const waistCore = reg(
    new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.32, 0.3, 0.26, 16)), darkSteelMat)
  );
  waistCore.position.y = 0.08;
  torso.add(waistCore);

  const absPlate = reg(
    new THREE.Mesh(trackGeo(createBeveledBox(0.46, 0.22, 0.16, 0.022)), armorMat)
  );
  absPlate.position.set(0, 0.14, -0.26);
  absPlate.rotation.x = 0.12;
  torso.add(absPlate);

  // Inner dark-steel V-tapered thoracic chassis core (strictly recessed behind bolted outer glacis plates!)
  const chestCoreGeo = trackGeo(
    createLoftedAnatomy(
      [
        { y: 0.1, rx: 0.34, rz: 0.27, squareness: 2.7 },
        { y: 0.34, rx: 0.44, rz: 0.31, squareness: 2.85 },
        { y: 0.62, rx: 0.52, rz: 0.34, squareness: 2.95 },
        { y: 0.82, rx: 0.48, rz: 0.31, squareness: 2.85 },
        { y: 0.92, rx: 0.36, rz: 0.26, squareness: 2.6 },
      ],
      20
    )
  );
  torso.add(reg(new THREE.Mesh(chestCoreGeo, darkSteelMat)));

  // Fierce angular V-tapered sloped pectoral glacis plates (left & right — zero clipping, zero egg belly!)
  for (const side of [-1, 1] as const) {
    const pecPlate = reg(
      new THREE.Mesh(trackGeo(createBeveledBox(0.38, 0.46, 0.16, 0.028)), armorMat)
    );
    pecPlate.position.set(side * 0.28, 0.54, -0.31);
    pecPlate.rotation.set(-0.14, -side * 0.28, -side * 0.1);
    torso.add(pecPlate);

    // Lower angled ribcage flank plate tying chest smoothly into waist
    const ribPlate = reg(
      new THREE.Mesh(trackGeo(createBeveledBox(0.24, 0.28, 0.22, 0.02)), armorMat)
    );
    ribPlate.position.set(side * 0.36, 0.28, -0.18);
    ribPlate.rotation.set(0.08, -side * 0.45, side * 0.14);
    torso.add(ribPlate);

    // Heavy diagonal copper high-voltage chest conduit feeding from dorsal stacks to breastplate
    const chestConduit = reg(
      new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.044, 0.044, 0.36, 12)), copperMat)
    );
    chestConduit.position.set(side * 0.44, 0.56, -0.12);
    chestConduit.rotation.set(0.35, 0, -side * 0.25);
    torso.add(chestConduit);
  }

  // Heavy upper collar breastplate beam bridging both pectoral plates
  const upperCollarPlate = reg(
    new THREE.Mesh(trackGeo(createBeveledBox(0.76, 0.14, 0.22, 0.024)), armorMat)
  );
  upperCollarPlate.position.set(0, 0.78, -0.28);
  upperCollarPlate.rotation.x = -0.22;
  torso.add(upperCollarPlate);

  // CENTRAL RECESSED ARMORED THERMAL REACTOR STERNUM GRILLE (intimidating vertical furnace slits + spinning core!)
  const sternumFrame = reg(
    new THREE.Mesh(trackGeo(createBeveledBox(0.24, 0.38, 0.12, 0.02)), darkSteelMat)
  );
  sternumFrame.position.set(0, 0.48, -0.36);
  sternumFrame.rotation.x = -0.1;
  torso.add(sternumFrame);

  const sternumGlow = new THREE.Mesh(
    trackGeo(createBeveledBox(0.15, 0.29, 0.05, 0.008)),
    arcCoilGlowMat
  );
  sternumGlow.position.set(0, 0.48, -0.405);
  sternumGlow.rotation.x = -0.1;
  torso.add(sternumGlow);

  // 4 armored horizontal blast-louver bars shielding the glowing sternum furnace!
  for (let b = 0; b < 4; b++) {
    const bar = reg(
      new THREE.Mesh(trackGeo(createBeveledBox(0.19, 0.026, 0.045, 0.004)), chromeMat)
    );
    bar.position.set(0, 0.38 + b * 0.068, -0.425);
    bar.rotation.x = -0.1;
    torso.add(bar);
  }

  // Twin spinning shoulder-mount exhaust impeller turbines tucked under the collar arch
  const chestImpellers: THREE.Group[] = [];
  for (const side of [-1, 1] as const) {
    const impGroup = new THREE.Group();
    impGroup.position.set(side * 0.32, 0.85, -0.16);
    impGroup.rotation.x = -0.45;
    torso.add(impGroup);

    const impRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.082, 0.018, 8, 14)),
      darkSteelMat
    );
    impGroup.add(impRing);

    for (let b = 0; b < 4; b++) {
      const blade = new THREE.Mesh(
        trackGeo(createBeveledBox(0.13, 0.018, 0.012, 0.003)),
        chromeMat
      );
      blade.rotation.z = (b * Math.PI) / 4;
      impGroup.add(blade);
    }
    chestImpellers.push(impGroup);
  }

  // Heavy industrial armored cowl & overhead hydraulic blast roll-cage arch framing the head!
  const neckCowl = reg(
    new THREE.Mesh(
      trackGeo(
        createCurvedPanelGeometry(
          [
            { y: 0.72, rx: 0.34, rz: 0.32, thickness: 0.065 },
            { y: 0.94, rx: 0.36, rz: 0.34, thickness: 0.062 },
            { y: 1.08, rx: 0.31, rz: 0.3, thickness: 0.05 },
          ],
          -Math.PI * 0.62,
          Math.PI * 0.62,
          16
        )
      ),
      darkSteelMat
    )
  );
  neckCowl.position.set(0, 0.02, 0.03);
  torso.add(neckCowl);

  // Heavy arched industrial roll-bar pipe arching over the helm cowl
  const rollBar = reg(
    new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.35, 0.032, 10, 20, Math.PI)),
      copperMat
    )
  );
  rollBar.position.set(0, 0.86, -0.02);
  torso.add(rollBar);

  // Deep-set armored juggernaut blast-furnace helm (`head`)
  const head = new THREE.Group();
  head.position.set(0, 0.88, -0.12);
  torso.add(head);

  const helmGeo = trackGeo(
    createLoftedAnatomy(
      [
        { y: -0.13, rx: 0.145, rz: 0.16, squareness: 2.5 },
        { y: 0.0, rx: 0.175, rz: 0.195, squareness: 2.65 },
        { y: 0.12, rx: 0.16, rz: 0.175, squareness: 2.4 },
        { y: 0.19, rx: 0.1, rz: 0.11, squareness: 2.1 },
      ],
      18
    )
  );
  head.add(reg(new THREE.Mesh(helmGeo, darkSteelMat)));

  // Slotted mandible blast guard + glowing triple-lens electric-cyan furnace visor
  const browGuard = reg(
    new THREE.Mesh(trackGeo(createBeveledBox(0.3, 0.065, 0.12, 0.012)), armorMat)
  );
  browGuard.position.set(0, 0.085, -0.155);
  browGuard.rotation.x = 0.18;
  head.add(browGuard);

  const jawGuard = reg(
    new THREE.Mesh(trackGeo(createBeveledBox(0.24, 0.095, 0.11, 0.014)), armorMat)
  );
  jawGuard.position.set(0, -0.075, -0.16);
  jawGuard.rotation.x = -0.14;
  head.add(jawGuard);

  // Recessed black visor bay + triple blazing cyan optical slits (zero z-fighting!)
  const visorRecess = new THREE.Mesh(
    trackGeo(createBeveledBox(0.23, 0.075, 0.04, 0.006)),
    darkSteelMat
  );
  visorRecess.position.set(0, 0.015, -0.182);
  head.add(visorRecess);

  const visorCenter = new THREE.Mesh(
    trackGeo(createBeveledBox(0.11, 0.044, 0.025, 0.005)),
    visorMat
  );
  visorCenter.position.set(0, 0.015, -0.204);
  head.add(visorCenter);

  for (const side of [-1, 1] as const) {
    const sideEye = new THREE.Mesh(
      trackGeo(createBeveledBox(0.052, 0.032, 0.024, 0.004)),
      visorMat
    );
    sideEye.position.set(side * 0.092, 0.016, -0.198);
    sideEye.rotation.y = -side * 0.25;
    head.add(sideEye);

    // Stubby copper acoustic/voltage ear horns on helm flanks
    const earCoil = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.032, 0.042, 0.11, 10)),
      copperMat
    );
    earCoil.rotation.z = Math.PI * 0.5;
    earCoil.position.set(side * 0.19, 0.03, -0.02);
    head.add(earCoil);
  }

  // =========================================================================
  // 3. ICONIC DORSAL WEAKPOINT: TWIN-TURBINE COOLING RADIATOR + BLAST DOORS
  // =========================================================================
  const radiatorGroup = new THREE.Group();
  radiatorGroup.position.set(0, 0.52, 0.42);
  torso.add(radiatorGroup);

  // Heavy cast-steel radiator housing cradle
  const radCradle = reg(
    new THREE.Mesh(trackGeo(createBeveledBox(0.68, 0.68, 0.26, 0.026)), darkSteelMat)
  );
  radiatorGroup.add(radCradle);

  // Twin massive vertical Copper-Wound Tesla Generator Stacks flanking the radiator core!
  const pylonAnchors: THREE.Object3D[] = [];
  for (const side of [-1, 1] as const) {
    const stackGroup = new THREE.Group();
    stackGroup.position.set(side * 0.36, 0.14, 0.02);
    radiatorGroup.add(stackGroup);

    const coilCylinder = reg(
      new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.115, 0.125, 0.72, 16)), copperMat)
    );
    stackGroup.add(coilCylinder);

    // Top & bottom turbine flange caps + glowing cyan arc insulator rings
    for (const fy of [-0.34, 0.34]) {
      const cap = reg(
        new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 14)), darkSteelMat)
      );
      cap.position.y = fy;
      stackGroup.add(cap);
    }
    for (const ry of [-0.14, 0.12, 0.39]) {
      const arcRing = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.125, 0.018, 8, 16)),
        arcCoilGlowMat
      );
      arcRing.rotation.x = Math.PI * 0.5;
      arcRing.position.y = ry;
      stackGroup.add(arcRing);
    }

    // Top exhaust crown dome emitting arcs
    const crownCap = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.085, 12, 10)),
      chromeMat
    );
    crownCap.position.y = 0.42;
    stackGroup.add(crownCap);

    const pylonAnchor = new THREE.Object3D();
    pylonAnchor.position.set(0, 0.48, 0);
    stackGroup.add(pylonAnchor);
    pylonAnchors.push(pylonAnchor);
  }

  // Blazing Molten-Orange Honeycomb Cooling Radiator Furnace Core (`cooling_radiator` weakpoint!)
  const radCoreBlock = new THREE.Mesh(
    trackGeo(createBeveledBox(0.46, 0.52, 0.14, 0.018)),
    weakpointMat
  );
  radCoreBlock.position.set(0, 0, 0.11);
  radiatorGroup.add(radCoreBlock);

  // 4 sculpted horizontal radiator heat-exchange fins protruding across the glowing core
  for (let f = 0; f < 4; f++) {
    const fy = -0.18 + f * 0.12;
    const finBar = reg(
      new THREE.Mesh(trackGeo(createBeveledBox(0.48, 0.026, 0.075, 0.005)), chromeMat)
    );
    finBar.position.set(0, fy, 0.17);
    radiatorGroup.add(finBar);
  }

  // Twin Articulated Armored Thermal Blast-Louvre Doors that SWING WIDE OPEN during Thermal Venting!
  const buildBlastDoor = (side: -1 | 1) => {
    const hinge = new THREE.Group();
    hinge.position.set(side * 0.25, 0, 0.19);
    radiatorGroup.add(hinge);

    const doorPlate = reg(
      new THREE.Mesh(trackGeo(createBeveledBox(0.22, 0.56, 0.055, 0.012)), armorMat)
    );
    doorPlate.position.set(-side * 0.11, 0, 0.02);
    hinge.add(doorPlate);

    const doorTrim = new THREE.Mesh(
      trackGeo(createBeveledBox(0.05, 0.48, 0.065, 0.006)),
      ochreAccentMat
    );
    doorTrim.position.set(-side * 0.18, 0, 0.025);
    hinge.add(doorTrim);

    return hinge;
  };
  const ventDoorL = buildBlastDoor(-1);
  const ventDoorR = buildBlastDoor(1);

  const weakpointAnchor = new THREE.Object3D();
  weakpointAnchor.position.set(0, 0, 0.26);
  radiatorGroup.add(weakpointAnchor);

  // =========================================================================
  // 4. LEFT ARM — HYDRAULIC ARC-PILEDRIVER SIEGE GAUNTLET & BUCKLER SHIELD
  // =========================================================================
  const leftShoulder = new THREE.Group();
  leftShoulder.position.set(-0.56, 0.68, -0.02);
  torso.add(leftShoulder);

  // Heavy dark-steel shoulder socket drum eliminating any floating pauldron gap!
  const leftSocket = reg(
    new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.16, 0.16, 0.24, 14)), darkSteelMat)
  );
  leftSocket.rotation.z = Math.PI * 0.5;
  leftSocket.position.set(0.06, 0.02, 0);
  leftShoulder.add(leftSocket);

  // Snug curved layered industrial siege pauldron (`createCurvedPanelGeometry`)
  const pauldronGeo = trackGeo(
    createCurvedPanelGeometry(
      [
        { y: -0.18, rx: 0.23, rz: 0.25, thickness: 0.056 },
        { y: 0.04, rx: 0.26, rz: 0.28, thickness: 0.064 },
        { y: 0.22, rx: 0.21, rz: 0.23, thickness: 0.052 },
      ],
      -Math.PI * 0.45,
      Math.PI * 0.45,
      14
    )
  );
  const leftPauldron = reg(new THREE.Mesh(pauldronGeo, armorMat));
  leftPauldron.rotation.y = -Math.PI * 0.5;
  leftPauldron.rotation.z = 0.24;
  leftPauldron.position.set(-0.01, 0.06, 0);
  leftShoulder.add(leftPauldron);

  const leftPauldronCap = reg(
    new THREE.Mesh(trackGeo(createBeveledBox(0.32, 0.09, 0.36, 0.018)), darkSteelMat)
  );
  leftPauldronCap.position.set(-0.06, 0.24, 0);
  leftPauldronCap.rotation.z = 0.22;
  leftShoulder.add(leftPauldronCap);

  // Copper shoulder capacitor fin atop left pauldron
  const leftShoulderCap = reg(
    new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.062, 0.072, 0.22, 12)), copperMat)
  );
  leftShoulderCap.position.set(-0.11, 0.34, 0.02);
  leftShoulderCap.rotation.z = 0.26;
  leftShoulder.add(leftShoulderCap);

  // Sculpted muscular hydraulic upper arm
  const upperArmGeo = trackGeo(
    createLoftedAnatomy(
      [
        { y: -0.36, rx: 0.115, rz: 0.125, squareness: 2.3 },
        { y: -0.18, rx: 0.145, rz: 0.155, squareness: 2.5 },
        { y: 0.02, rx: 0.135, rz: 0.145, squareness: 2.4 },
      ],
      14
    )
  );
  leftShoulder.add(reg(new THREE.Mesh(upperArmGeo, darkSteelMat)));

  const leftElbow = new THREE.Group();
  leftElbow.position.set(-0.02, -0.38, 0);
  leftShoulder.add(leftElbow);

  // Heavy elbow drum hinge
  const leftElbowJoint = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.082, 0.082, 0.24, 12)),
    chromeMat
  );
  leftElbowJoint.rotation.z = Math.PI * 0.5;
  leftElbow.add(leftElbowJoint);

  // Colossal Arc-Piledriver Siege Gauntlet & Curved Outer-Front Forearm Deflector Buckler!
  const gauntletGeo = trackGeo(
    createLoftedAnatomy(
      [
        { y: -0.46, rx: 0.175, rz: 0.195, squareness: 2.7 },
        { y: -0.24, rx: 0.165, rz: 0.185, squareness: 2.6 },
        { y: -0.02, rx: 0.13, rz: 0.145, squareness: 2.4 },
      ],
      16
    )
  );
  leftElbow.add(reg(new THREE.Mesh(gauntletGeo, armorMat)));

  // Heavy armored Bull-Rush Deflector Buckler bolted squarely on outer-front forearm face!
  const bucklerGroup = new THREE.Group();
  bucklerGroup.position.set(-0.12, -0.22, -0.07);
  bucklerGroup.rotation.y = 0.42;
  leftElbow.add(bucklerGroup);

  const bucklerPlate = reg(
    new THREE.Mesh(trackGeo(createBeveledBox(0.1, 0.54, 0.36, 0.022)), armorMat)
  );
  bucklerGroup.add(bucklerPlate);

  const bucklerEdge = reg(
    new THREE.Mesh(trackGeo(createBeveledBox(0.12, 0.56, 0.07, 0.012)), darkSteelMat)
  );
  bucklerEdge.position.set(0, 0, -0.17);
  bucklerGroup.add(bucklerEdge);

  for (const sy of [-0.14, 0, 0.14]) {
    const arcStud = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.026, 0.026, 0.06, 10)),
      arcCoilGlowMat
    );
    arcStud.rotation.z = Math.PI * 0.5;
    arcStud.position.set(-0.055, sy, -0.04);
    bucklerGroup.add(arcStud);
  }

  // Twin chrome telescoping hydraulic piledriver impact rams + glowing arc knuckles!
  const piledriverRam = new THREE.Group();
  piledriverRam.position.set(0, -0.47, -0.02);
  leftElbow.add(piledriverRam);

  const impactPlate = reg(
    new THREE.Mesh(trackGeo(createBeveledBox(0.28, 0.085, 0.28, 0.016)), darkSteelMat)
  );
  piledriverRam.add(impactPlate);

  const arcKnuckleGlow = new THREE.Mesh(
    trackGeo(createBeveledBox(0.25, 0.045, 0.25, 0.01)),
    arcCoilGlowMat
  );
  arcKnuckleGlow.position.y = -0.045;
  piledriverRam.add(arcKnuckleGlow);

  for (const rx of [-0.085, 0.085]) {
    const ramPiston = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.028, 0.028, 0.26, 10)),
      chromeMat
    );
    ramPiston.position.set(rx, 0.12, -0.14);
    piledriverRam.add(ramPiston);
  }

  const piledriverAnchor = new THREE.Object3D();
  piledriverAnchor.position.set(0, -0.12, 0);
  piledriverRam.add(piledriverAnchor);

  // =========================================================================
  // 5. RIGHT ARM — COLOSSAL 6-BARREL "VOLT-VULCAN" ROTARY AUTOCANNON
  // =========================================================================
  const rightShoulder = new THREE.Group();
  rightShoulder.position.set(0.56, 0.68, -0.02);
  torso.add(rightShoulder);

  const rightSocket = reg(
    new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.16, 0.16, 0.24, 14)), darkSteelMat)
  );
  rightSocket.rotation.z = Math.PI * 0.5;
  rightSocket.position.set(-0.06, 0.02, 0);
  rightShoulder.add(rightSocket);

  const rightPauldron = reg(new THREE.Mesh(pauldronGeo, armorMat));
  rightPauldron.rotation.y = Math.PI * 0.5;
  rightPauldron.rotation.z = -0.24;
  rightPauldron.position.set(0.01, 0.06, 0);
  rightShoulder.add(rightPauldron);

  const rightPauldronCap = reg(
    new THREE.Mesh(trackGeo(createBeveledBox(0.32, 0.09, 0.36, 0.018)), darkSteelMat)
  );
  rightPauldronCap.position.set(0.06, 0.24, 0);
  rightPauldronCap.rotation.z = -0.22;
  rightShoulder.add(rightPauldronCap);

  const rightShoulderCap = reg(
    new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.062, 0.072, 0.22, 12)), copperMat)
  );
  rightShoulderCap.position.set(0.11, 0.34, 0.02);
  rightShoulderCap.rotation.z = -0.26;
  rightShoulder.add(rightShoulderCap);

  rightShoulder.add(reg(new THREE.Mesh(upperArmGeo, darkSteelMat)));

  const rightElbow = new THREE.Group();
  rightElbow.position.set(0.02, -0.38, 0);
  rightShoulder.add(rightElbow);

  const rightElbowJoint = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.082, 0.082, 0.24, 12)),
    chromeMat
  );
  rightElbowJoint.rotation.z = Math.PI * 0.5;
  rightElbow.add(rightElbowJoint);

  // Underslung 6-Barrel Electromagnetic Rotary Autocannon ("VOLT-VULCAN")
  const cannonGroup = new THREE.Group();
  cannonGroup.position.set(-0.04, -0.16, -0.34);
  rightElbow.add(cannonGroup);

  // Heavy rotary motor housing & copper electromagnetic induction jacket
  const cannonMotor = reg(
    new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.165, 0.18, 0.44, 16)), darkSteelMat)
  );
  cannonMotor.rotation.x = Math.PI * 0.5;
  cannonMotor.position.z = 0.06;
  cannonGroup.add(cannonMotor);

  const cannonCopperJacket = reg(
    new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.185, 0.185, 0.22, 16)), copperMat)
  );
  cannonCopperJacket.rotation.x = Math.PI * 0.5;
  cannonCopperJacket.position.z = -0.02;
  cannonGroup.add(cannonCopperJacket);

  // Top heavy chainsaw-style carry handle & armored shroud hood
  const carryBar = reg(
    new THREE.Mesh(trackGeo(createBeveledBox(0.18, 0.042, 0.46, 0.008)), ochreAccentMat)
  );
  carryBar.position.set(0, 0.23, -0.08);
  cannonGroup.add(carryBar);

  for (const cz of [-0.26, 0.1]) {
    const stanchion = new THREE.Mesh(
      trackGeo(createBeveledBox(0.048, 0.14, 0.056, 0.006)),
      darkSteelMat
    );
    stanchion.position.set(0, 0.16, cz);
    cannonGroup.add(stanchion);
  }

  // Underslung high-capacity rotary drum magazine
  const ammoDrum = reg(
    new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.145, 0.145, 0.24, 14)), armorMat)
  );
  ammoDrum.rotation.z = Math.PI * 0.5;
  ammoDrum.position.set(0.08, -0.18, 0.08);
  cannonGroup.add(ammoDrum);

  // Spinning 6-barrel cluster with triple perforated cooling collars!
  const barrelCluster = new THREE.Group();
  barrelCluster.position.set(0, 0, -0.58);
  cannonGroup.add(barrelCluster);

  const singleBarrelGeo = trackGeo(new THREE.CylinderGeometry(0.022, 0.024, 0.92, 10));
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const b = reg(new THREE.Mesh(singleBarrelGeo, rotaryBarrelMat));
    b.rotation.x = Math.PI * 0.5;
    b.position.set(Math.cos(ang) * 0.095, Math.sin(ang) * 0.095, 0);
    barrelCluster.add(b);
  }

  // Central drive spindle & 3 cooling baffle clamps along the 6-barrel cluster
  const spindle = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.036, 0.036, 0.86, 10)),
    chromeMat
  );
  spindle.rotation.x = Math.PI * 0.5;
  barrelCluster.add(spindle);

  for (const [cz, mat] of [
    [0.24, darkSteelMat],
    [-0.08, ochreAccentMat],
    [-0.36, darkSteelMat],
  ] as const) {
    const clamp = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.132, 0.132, 0.068, 14)),
      mat
    );
    clamp.rotation.x = Math.PI * 0.5;
    clamp.position.z = cz;
    barrelCluster.add(clamp);
  }

  // Live wall-clipped Targeting Laser Sight projecting cleanly along -Z!
  const laserGroup = new THREE.Group();
  laserGroup.position.set(0, 0.14, -0.35);
  laserGroup.visible = false;
  cannonGroup.add(laserGroup);

  const lCoreGeo = trackGeo(new THREE.CylinderGeometry(0.012, 0.012, 1, 8));
  lCoreGeo.rotateX(Math.PI * 0.5);
  lCoreGeo.translate(0, 0, -0.5);
  laserGroup.add(new THREE.Mesh(lCoreGeo, laserCoreMat));

  const lHaloGeo = trackGeo(new THREE.CylinderGeometry(0.034, 0.034, 1, 8));
  lHaloGeo.rotateX(Math.PI * 0.5);
  lHaloGeo.translate(0, 0, -0.5);
  laserGroup.add(new THREE.Mesh(lHaloGeo, laserHaloMat));

  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, 0, -1.08);
  cannonGroup.add(muzzlePoint);

  // =========================================================================
  // 6. DEDICATED RAYCAST HITBOXES (Cooling Radiator Weakpoint, Head, Body)
  // =========================================================================
  const bodyHitbox = createEnemyHitboxMesh(
    enemyId,
    'body',
    trackGeo(new THREE.BoxGeometry(1.24, 2.08, 0.86))
  );
  bodyHitbox.position.set(0, 1.12, 0);
  rigBody.add(bodyHitbox);

  const headHitbox = createEnemyHitboxMesh(
    enemyId,
    'head',
    trackGeo(new THREE.BoxGeometry(0.4, 0.36, 0.38))
  );
  head.add(headHitbox);

  const wpHitbox = createEnemyHitboxMesh(
    enemyId,
    'weakpoint',
    trackGeo(new THREE.BoxGeometry(0.74, 0.72, 0.42)),
    'cooling_radiator'
  );
  wpHitbox.position.set(0, 0, 0.16);
  radiatorGroup.add(wpHitbox);

  // =========================================================================
  // 7. PROCEDURAL HEAVY KINEMATICS, BLAST-DOOR VENTING & 6-ATTACK CHOREOGRAPHY
  // =========================================================================
  let stridePhase = 0;
  let doorOpenBlend = 0.25;
  let currentHeat = 0;

  const updateAnimation = (input: EnemyAnimationInput) => {
    const t = input.elapsed;
    const dt = Math.min(0.05, Math.max(0.001, input.dt));

    // Spin chest micro-impeller intake fans continuously (faster in Phase 2 Overdrive!)
    const fanRate = input.phase === 2 ? 18 : 10;
    chestImpellers[0].rotation.z += dt * fanRate;
    chestImpellers[1].rotation.z -= dt * fanRate;

    // Dying heavy collapse animation (animates child rigBody / pelvis only!)
    if (input.behavior === 'dead') {
      const p = THREE.MathUtils.clamp(input.deadProgress, 0, 1);
      pelvis.position.set(0, 1.12 * (1 - p * 0.84), 0);
      pelvis.rotation.set(p * 1.44, 0, p * 0.18);
      laserGroup.visible = false;
      weakpointMat.emissiveIntensity = Math.max(0, 2.0 * (1 - p));
      arcCoilGlowMat.emissiveIntensity = Math.max(0, 1.6 * (1 - p));
      return;
    }

    const isPhase2 = input.phase === 2;
    const speed = Math.min(1.8, input.speedRatio);
    stridePhase += dt * (2.2 + speed * 5.0);
    const stride = Math.sin(stridePhase) * 0.44 * Math.min(1.2, speed);

    // Phase 2 Overdrive shifts arc coils electric-gold/hot-cyan and intensifies thermal radiator glow
    if (isPhase2) {
      arcCoilGlowMat.color.setHex(0xffc23c);
      arcCoilGlowMat.emissive.setHex(0xff8418);
      arcCoilGlowMat.emissiveIntensity = 2.4 + Math.sin(t * 14) * 0.5;
    } else {
      arcCoilGlowMat.color.setHex(0x4ae8ff);
      arcCoilGlowMat.emissive.setHex(0x1cd8ff);
      arcCoilGlowMat.emissiveIntensity = 1.65 + Math.sin(t * 8) * 0.25;
    }

    // Default heavy marching posture
    let pelvisY = 1.12 + Math.abs(Math.cos(stridePhase)) * 0.045 * Math.min(1, speed);
    let pelvisPitch = 0;
    let torsoPitch = 0.08;
    let torsoYaw = 0;
    let lShoulderX = -0.34;
    let lShoulderZ = 0.12;
    let lElbowX = -0.45;
    let rShoulderX = -0.26;
    let rShoulderZ = -0.08;
    let rElbowX = -0.22;
    let ramExtend = 0;
    let targetDoorOpen = isPhase2 ? 0.58 : 0.24;
    let barrelSpinSpeed = isPhase2 ? 3.5 : 1.2;

    leftLeg.hip.rotation.x = stride;
    leftLeg.knee.rotation.x = Math.max(0, -stride * 1.05);
    rightLeg.hip.rotation.x = -stride;
    rightLeg.knee.rotation.x = Math.max(0, stride * 1.05);

    // Knee-buckling Thermal Meltdown Stagger when Dorsal Cooling Radiator ruptures!
    if (input.behavior === 'staggered' || input.staggerTimer > 0) {
      pelvisY = 0.88;
      leftLeg.hip.rotation.x = -0.48;
      leftLeg.knee.rotation.x = 0.92;
      rightLeg.hip.rotation.x = -0.42;
      rightLeg.knee.rotation.x = 0.86;
      torsoPitch = 0.42;
      torsoYaw = Math.sin(t * 11) * 0.22;
      lShoulderX = 0.25;
      lElbowX = -0.18;
      rShoulderX = 0.34;
      rElbowX = -0.1;
      targetDoorOpen = 1.22;
      laserGroup.visible = false;
      weakpointMat.emissiveIntensity = 0.75 + Math.abs(Math.sin(t * 22)) * 1.1;
    } else if (input.behavior === 'recover') {
      // THERMAL VENTING WINDOW — Hunches forward & SWINGS DORSAL BLAST DOORS WIDE OPEN!
      pelvisY = 1.04;
      leftLeg.hip.rotation.x = -0.22;
      leftLeg.knee.rotation.x = 0.42;
      rightLeg.hip.rotation.x = -0.18;
      rightLeg.knee.rotation.x = 0.36;
      torsoPitch = 0.38;
      lShoulderX = 0.12;
      lShoulderZ = 0.28;
      rShoulderX = 0.18;
      rShoulderZ = -0.22;
      targetDoorOpen = 1.24;
      weakpointMat.emissiveIntensity = 3.1 + Math.sin(t * 16) * 0.55;
    } else if (input.behavior === 'windup' || input.behavior === 'attack') {
      const p = THREE.MathUtils.clamp(input.attackProgress, 0, 1);
      const isWindup = input.behavior === 'windup';

      if (input.attackVariant === 1) {
        // VARIANT 1: SEISMIC ARC-SLAM — Raises massive Left Piledriver Gauntlet HIGH, then SMASHES FLOOR!
        if (isWindup) {
          pelvisY = 1.15 + p * 0.06;
          torsoPitch = -0.18 * p;
          torsoYaw = -0.34 * p;
          lShoulderX = -0.4 - p * 2.05; // raises left piledriver arm high overhead!
          lShoulderZ = 0.32 * p;
          lElbowX = -0.35 - p * 0.45;
          rShoulderX = -0.32;
          rShoulderZ = -0.28;
          ramExtend = p * 0.08;
        } else {
          const slamEase = Math.min(1, p * 2.6);
          pelvisY = 1.12 - slamEase * 0.26;
          leftLeg.hip.rotation.x = -0.52 * slamEase;
          leftLeg.knee.rotation.x = 0.96 * slamEase;
          rightLeg.hip.rotation.x = 0.24 * slamEase;
          rightLeg.knee.rotation.x = 0.38 * slamEase;
          torsoPitch = 0.5 * slamEase;
          torsoYaw = 0.36 * slamEase;
          lShoulderX = -2.45 + slamEase * 1.48; // drives left piledriver fist straight down & forward onto deck!
          lShoulderZ = -0.14;
          lElbowX = -0.18;
          rShoulderX = -0.36; // braces right rotary cannon low & outward to counterbalance!
          rShoulderZ = -0.36;
          rElbowX = -0.25;
          ramExtend = 0.16;
          targetDoorOpen = 0.88;
        }
      } else if (input.attackVariant === 2) {
        // VARIANT 2: JUGGERNAUT BULL-RUSH CHARGE — Slams forearm Buckler Shield across front & charges!
        pelvisY = 1.04 + Math.abs(Math.cos(stridePhase)) * 0.05;
        torsoPitch = 0.34;
        torsoYaw = -0.32;
        lShoulderX = -1.18;
        lShoulderZ = -0.48; // swings curved buckler shield straight across chest as a battering ram!
        lElbowX = -0.95;
        rShoulderX = 0.24;
        rShoulderZ = -0.26; // tucks rotary cannon tight to right flank
        ramExtend = 0.12;
        targetDoorOpen = 0.72;
      } else if (input.attackVariant === 3) {
        // VARIANT 3: VOLT-ARC PLASMA BARRAGE — Widens stance & discharges twin shoulder Tesla pylons!
        pelvisY = 1.06;
        torsoPitch = isWindup ? -0.12 * p : 0.12;
        lShoulderX = -1.12;
        lShoulderZ = 0.34;
        lElbowX = -0.32;
        rShoulderX = -0.58 + input.aimPitch * 0.5;
        rShoulderZ = -0.22;
        barrelSpinSpeed = 24;
        targetDoorOpen = 0.78;
        arcCoilGlowMat.emissiveIntensity = 3.4;
      } else if (input.attackVariant === 4) {
        // VARIANT 4: OVERCHARGE RAIL-LANCE — Two-handed braced heavy aim with intense targeting laser!
        pelvisY = 1.05;
        torsoPitch = isWindup ? 0.06 : -0.12 * (1 - p);
        torsoYaw = 0.16;
        rShoulderX = -0.44 + input.aimPitch * 0.55;
        rShoulderZ = -0.06;
        rElbowX = -0.22;
        lShoulderX = -0.82;
        lShoulderZ = -0.34;
        lElbowX = -0.88;
        barrelSpinSpeed = isWindup ? 28 : 40;
      } else if (input.attackVariant === 5) {
        // VARIANT 5: COVER-FLUSH ARC-MORTAR — Pitches torso back & lobs twin arcing plasma canisters!
        torsoPitch = -0.22;
        lShoulderX = -1.45;
        lShoulderZ = 0.3;
        rShoulderX = -0.68;
        targetDoorOpen = 0.88;
        arcCoilGlowMat.emissiveIntensity = 3.2;
      } else {
        // VARIANT 0: VOLT-VULCAN 6-BARREL ROTARY SUPPRESSION SWEEP!
        pelvisY = 1.06;
        torsoPitch = 0.1 + (isWindup ? 0 : Math.sin(t * 36) * 0.025);
        torsoYaw = isWindup ? 0.12 : 0.12 + Math.sin(t * 5.2) * 0.18;
        rShoulderX = -0.38 + input.aimPitch * 0.55;
        rElbowX = -0.18;
        lShoulderX = -0.78;
        lShoulderZ = -0.28; // braces left arm across to steady the heavy rotary gun!
        lElbowX = -0.78;
        barrelSpinSpeed = isWindup ? 20 : 38;
        targetDoorOpen = isPhase2 ? 0.72 : 0.42;
      }
      weakpointMat.emissiveIntensity = (isPhase2 ? 2.8 : 2.15) + Math.sin(t * 10) * 0.3;
    } else {
      weakpointMat.emissiveIntensity = (isPhase2 ? 2.5 : 1.85) + Math.sin(t * 7) * 0.25;
    }

    // Subtle hit flinch shudder
    if (input.flinchTimer > 0) {
      const f = Math.min(1, input.flinchTimer / 0.14);
      torsoPitch -= 0.08 * f;
      torsoYaw += input.flinchDirX * 0.16 * f;
    }

    // Smoothly articulate dorsal radiator blast doors
    doorOpenBlend += (targetDoorOpen - doorOpenBlend) * Math.min(1, dt * 8.5);
    ventDoorL.rotation.y = -doorOpenBlend;
    ventDoorR.rotation.y = doorOpenBlend;

    // Spin 6-barrel rotary cluster & apply glowing heat tint
    barrelCluster.rotation.z += dt * barrelSpinSpeed;
    rotaryBarrelMat.emissiveIntensity = currentHeat * 2.2;

    pelvis.position.set(0, pelvisY, 0);
    pelvis.rotation.set(pelvisPitch, 0, 0);
    torso.rotation.set(torsoPitch, torsoYaw, 0);

    leftShoulder.rotation.set(lShoulderX, 0, lShoulderZ);
    leftElbow.rotation.set(lElbowX, 0, 0);
    piledriverRam.position.y = -0.47 - ramExtend;

    rightShoulder.rotation.set(rShoulderX, 0, rShoulderZ);
    rightElbow.rotation.set(rElbowX, 0, 0);
  };

  return {
    root,
    hitboxes: [wpHitbox, headHitbox, bodyHitbox],
    weakpointMaterials: [weakpointMat],
    armorFlashMaterials: [armorMat],
    updateAnimation,
    getMuzzleWorldPos: (out: THREE.Vector3) => muzzlePoint.getWorldPosition(out),
    getWeakpointWorldPos: (out: THREE.Vector3) => weakpointAnchor.getWorldPosition(out),
    getPiledriverWorldPos: (out: THREE.Vector3) => piledriverAnchor.getWorldPosition(out),
    getTeslaPylonWorldPos: (side: -1 | 1, out: THREE.Vector3) =>
      (side < 0 ? pylonAnchors[0] : pylonAnchors[1]).getWorldPosition(out),
    getRadiatorVentWorldPos: (out: THREE.Vector3) => weakpointAnchor.getWorldPosition(out),
    setBarrelHeat: (heat01: number) => {
      currentHeat = THREE.MathUtils.clamp(heat01, 0, 1);
      rotaryBarrelMat.emissiveIntensity = currentHeat * 2.2;
    },
    setTargetLaser: (active: boolean, length: number, dangerRatio: number) => {
      laserGroup.visible = active && length > 0.25;
      if (!laserGroup.visible) return;
      const d = THREE.MathUtils.clamp(dangerRatio, 0, 1);
      const width = 0.75 + d * 1.4;
      laserGroup.scale.set(width, width, Math.max(0.25, length));
      laserCoreMat.color.setRGB(1.0, 0.82 - d * 0.5, 0.35 - d * 0.25);
      laserCoreMat.opacity = 0.55 + d * 0.45;
      laserHaloMat.opacity = 0.22 + d * 0.42;
    },
    dispose: () => {
      for (const g of disposedGeos) g.dispose();
      for (const m of disposedMats) m.dispose();
      if (ownsTextures) tex.dispose();
    },
  };
}
