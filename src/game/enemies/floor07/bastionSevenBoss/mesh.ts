import * as THREE from 'three';
import {
  createBeveledBox,
  createCurvedPanelGeometry,
  createStrapTube,
} from '../../../core/sculptUtils';
import { createEnemyContactShadow, createEnemyHitboxMesh } from '../../core/enemyMeshShared';
import type { EnemyAnimationInput, EnemyRigHandle } from '../../core/types';
import type { Floor07EnemyMaterials } from '../materials';
import { createBastionSevenTextures } from './textures';

export interface BastionRigHandle extends EnemyRigHandle {
  getLeftArmMuzzlePos: (out: THREE.Vector3) => THREE.Vector3;
  getRightArmMuzzlePos: (out: THREE.Vector3) => THREE.Vector3;
  getPodMuzzlePos: (side: -1 | 1, out: THREE.Vector3) => THREE.Vector3;
  getReactorWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  getDorsalVentWorldPos: (side: -1 | 1, out: THREE.Vector3) => THREE.Vector3;
  setDualRailLasers: (
    active: boolean,
    leftLen: number,
    rightLen: number,
    chargeRatio: number
  ) => void;
  setBarrelHeat: (heatRatio: number) => void;
  setPodHoodOpen: (openRatio: number) => void;
}

/**
 * Helper to extrude a custom 2D armor silhouette with crisp 45° chamfer bevels.
 */
function createExtrudedArmor(
  pts: Array<[number, number]>,
  depth: number,
  bevel = 0.02
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  pts.forEach(([x, y], idx) => {
    if (idx === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.004, depth - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
  });
  geo.center();
  const out = geo.index ? geo.toNonIndexed() : geo;
  // Normalize ExtrudeGeometry UVs into clean [0, 1] box-projected space so PBR panel textures never stretch!
  out.computeBoundingBox();
  const bb = out.boundingBox;
  const posAttr = out.getAttribute('position');
  const uvAttr = out.getAttribute('uv');
  if (bb && posAttr && uvAttr) {
    const sx = Math.max(0.001, bb.max.x - bb.min.x);
    const sy = Math.max(0.001, bb.max.y - bb.min.y);
    for (let i = 0; i < posAttr.count; i++) {
      const u = (posAttr.getX(i) - bb.min.x) / sx;
      const v = (posAttr.getY(i) - bb.min.y) / sy;
      uvAttr.setXY(i, u, v);
    }
    uvAttr.needsUpdate = true;
  }
  out.computeVertexNormals();
  return out;
}

/**
 * Floor 07 Final Boss — TITAN-RIG "BASTION-VII" (~3.85m Apex Reverse-Joint Siege Mech)
 *
 * Sculpted flagship dreadnought rig:
 * - Articulated reverse-joint walker legs with layered titanium/bronze thigh glacis,
 *   heavy knee-ram prows, dual chrome hydraulic rams, braided knee cables, and
 *   counter-rotated triple-talon seismic stomp feet planted flush at y = 0.
 * - Swept angular battleship-hull torso with waist turret ring & hydraulic pistons,
 *   recessed spinning fusion-turbine Chest Reactor Core weakpoint, and twin interlocking
 *   sliding/hinging hydraulic Blast-Doors that open wide during thermal venting/stagger.
 * - Armored dreadnought sensor head with triple-slit cyclops visor, rangefinder cheek
 *   pods, comm whip antennas, and armored roll-cage gorget collar.
 * - Twin towering articulated 6-cell shoulder missile pods with animated flip-open
 *   blast-hoods and glowing amber warhead cells.
 * - Twin dorsal thermal exhaust chimneys + lower jump-charge rocket thruster bells that
 *   blaze fiery crimson in Phase 2 Apex Overdrive.
 * - Dual heavy siege cannon arms with curved layered ERA pauldrons, reciprocating twin
 *   rotary autocannon barrels with dynamic heat glow, and underbarrel Rail-Lance
 *   accelerators with live wall-clipped dual convergence targeting lasers!
 */
export function buildBastionSevenBossRig(
  enemyId: string,
  mats: Floor07EnemyMaterials
): BastionRigHandle {
  const root = new THREE.Group();
  const tex = createBastionSevenTextures();

  // =========================================================================
  // BESPOKE PROCEDURAL PBR MATERIALS
  // =========================================================================
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0xdce4ee,
    map: tex.hullArmorAlbedo,
    bumpMap: tex.hullArmorBump,
    bumpScale: 0.032,
    roughnessMap: tex.hullArmorRoughness,
    roughness: 0.66,
    metalness: 0.6,
  });

  const hullDarkMat = new THREE.MeshStandardMaterial({
    color: 0x627082,
    map: tex.hullArmorAlbedo,
    bumpMap: tex.hullArmorBump,
    bumpScale: 0.026,
    roughnessMap: tex.hullArmorRoughness,
    roughness: 0.72,
    metalness: 0.56,
  });

  const bronzeMat = new THREE.MeshStandardMaterial({
    color: 0xf4e4cc,
    map: tex.bronzePlatingAlbedo,
    bumpMap: tex.bronzePlatingBump,
    bumpScale: 0.024,
    roughnessMap: tex.bronzePlatingRoughness,
    roughness: 0.44,
    metalness: 0.74,
  });

  const hydraulicMat = new THREE.MeshStandardMaterial({
    color: 0x9aa6b6,
    map: tex.hydraulicSteelAlbedo,
    bumpMap: tex.hydraulicSteelBump,
    bumpScale: 0.03,
    roughness: 0.42,
    metalness: 0.78,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xd4dfe8,
    roughness: 0.18,
    metalness: 0.92,
  });

  const gunmetalMat = new THREE.MeshStandardMaterial({
    color: 0x252c36,
    bumpMap: tex.hullArmorBump,
    bumpScale: 0.018,
    roughness: 0.46,
    metalness: 0.82,
  });

  const hazardMat = new THREE.MeshStandardMaterial({
    color: 0xe8941c,
    roughness: 0.52,
    metalness: 0.28,
  });

  const reactorMat = new THREE.MeshStandardMaterial({
    color: 0xffd27a,
    map: tex.reactorCoreMap,
    emissive: 0xff9a1c,
    emissiveMap: tex.reactorCoreMap,
    emissiveIntensity: 3.2,
    roughness: 0.22,
    metalness: 0.15,
  });

  const overdriveMat = new THREE.MeshStandardMaterial({
    color: 0xff6e24,
    emissive: 0xff7818,
    emissiveIntensity: 0.85,
    roughness: 0.28,
    metalness: 0.2,
  });

  const visorMat = new THREE.MeshStandardMaterial({
    color: 0xffd670,
    emissive: 0xffa818,
    emissiveIntensity: 2.8,
    roughness: 0.14,
    metalness: 0.1,
  });

  const barrelHeatMat = new THREE.MeshStandardMaterial({
    color: 0x3b414c,
    emissive: 0xff4210,
    emissiveIntensity: 0.0,
    roughness: 0.36,
    metalness: 0.86,
  });

  const railCoilMat = new THREE.MeshStandardMaterial({
    color: 0xffc658,
    emissive: 0xff8c1a,
    emissiveIntensity: 0.75,
    roughness: 0.2,
    metalness: 0.3,
  });

  const boosterFlameMat = new THREE.MeshStandardMaterial({
    color: 0xffc864,
    emissive: 0xff6a14,
    emissiveIntensity: 0.6,
    roughness: 0.2,
    metalness: 0.0,
    transparent: true,
    opacity: 0.0,
  });

  const missileFaceMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.missileCellMap,
    emissive: 0xff8818,
    emissiveMap: tex.missileCellMap,
    emissiveIntensity: 0.45,
    roughness: 0.45,
    metalness: 0.45,
  });

  const laserCoreMat = new THREE.MeshBasicMaterial({
    color: 0xffd878,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const laserGlowMat = new THREE.MeshBasicMaterial({
    color: 0xff5a18,
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const ownedMaterials: THREE.Material[] = [
    hullMat,
    hullDarkMat,
    bronzeMat,
    hydraulicMat,
    chromeMat,
    gunmetalMat,
    hazardMat,
    reactorMat,
    overdriveMat,
    visorMat,
    barrelHeatMat,
    railCoilMat,
    boosterFlameMat,
    missileFaceMat,
    laserCoreMat,
    laserGlowMat,
  ];

  // Ground contact shadow
  root.add(createEnemyContactShadow(1.88, mats.contactShadow));

  // =========================================================================
  // 1. PELVIS CHASSIS & ARTICULATED REVERSE-JOINT WALKER LEGS (y = 1.62 -> 0)
  // =========================================================================
  const BASE_PELVIS_Y = 1.62;
  const pelvis = new THREE.Group();
  pelvis.position.set(0, BASE_PELVIS_Y, 0);
  root.add(pelvis);

  // Sculpted angular armored codpiece keel prow
  const pelvisCoreGeo = createExtrudedArmor(
    [
      [-0.44, 0.16],
      [0.44, 0.16],
      [0.36, -0.14],
      [0.18, -0.26],
      [-0.18, -0.26],
      [-0.36, -0.14],
    ],
    0.72,
    0.032
  );
  const pelvisCore = new THREE.Mesh(pelvisCoreGeo, hullMat);
  pelvisCore.castShadow = true;
  pelvis.add(pelvisCore);

  // Heavy bronze front codpiece glacis shield
  const codpieceGeo = createExtrudedArmor(
    [
      [-0.22, 0.14],
      [0.22, 0.14],
      [0.15, -0.24],
      [-0.15, -0.24],
    ],
    0.16,
    0.02
  );
  const codpiece = new THREE.Mesh(codpieceGeo, bronzeMat);
  codpiece.position.set(0, -0.04, -0.34);
  codpiece.rotation.x = -0.16;
  codpiece.castShadow = true;
  pelvis.add(codpiece);

  // Heavy transverse hip axle beam
  const hipAxle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 1.18, 16),
    hydraulicMat
  );
  hipAxle.rotation.z = Math.PI / 2;
  hipAxle.position.set(0, -0.06, 0);
  pelvis.add(hipAxle);

  // Waist hydraulic swivel turret ring + dual rear stabilizer cylinders
  const waistTurret = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.48, 0.28, 20),
    gunmetalMat
  );
  waistTurret.position.set(0, 0.22, 0.02);
  pelvis.add(waistTurret);

  const waistBronzeCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.46, 0.07, 20),
    bronzeMat
  );
  waistBronzeCollar.position.set(0, 0.2, 0.02);
  pelvis.add(waistBronzeCollar);

  for (const side of [-1, 1] as const) {
    const waistPiston = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.34, 10),
      chromeMat
    );
    waistPiston.position.set(side * 0.34, 0.22, -0.22);
    waistPiston.rotation.z = side * 0.14;
    pelvis.add(waistPiston);

    // Braided power umbilical curving from hip flank up into torso underside
    const cable = new THREE.Mesh(
      createStrapTube(
        [
          new THREE.Vector3(side * 0.38, 0.02, 0.2),
          new THREE.Vector3(side * 0.48, 0.16, 0.28),
          new THREE.Vector3(side * 0.4, 0.38, 0.2),
        ],
        0.032,
        1,
        14
      ),
      hydraulicMat
    );
    pelvis.add(cable);
  }

  // Articulated Reverse-Joint Walker Leg Builder
  // Hip at y = 1.56 -> Knee at (side*0.08, -0.58, -0.28) [world y=0.98]
  // -> Ankle at (0, -0.76, +0.34) [world y=0.22] -> Foot sole at y = -0.22 [world y=0.00]
  const buildWalkerLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();

    // Heavy armored hip drum housing + bronze rim cap
    const hipDrum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.3, 18),
      gunmetalMat
    );
    hipDrum.rotation.z = Math.PI / 2;
    hipDrum.castShadow = true;
    hip.add(hipDrum);

    const hipCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.17, 0.07, 16),
      bronzeMat
    );
    hipCap.rotation.z = Math.PI / 2;
    hipCap.position.set(side * 0.16, 0, 0);
    hip.add(hipCap);

    // Armored hip skirt tasset plate shielding the outer hip joint
    const hipTasset = new THREE.Mesh(
      createExtrudedArmor(
        [
          [-0.18, 0.18],
          [0.18, 0.16],
          [0.14, -0.22],
          [-0.14, -0.18],
        ],
        0.09,
        0.016
      ),
      hullMat
    );
    hipTasset.position.set(side * 0.22, -0.02, -0.02);
    hipTasset.rotation.y = side * (Math.PI / 2);
    hipTasset.rotation.z = -side * 0.12;
    hip.add(hipTasset);

    // Forward-sloped Upper Thigh assembly (hip (0,0,0) -> knee (side*0.08, -0.58, -0.28))
    const thighGroup = new THREE.Group();
    thighGroup.position.set(side * 0.04, -0.29, -0.14);
    thighGroup.rotation.x = 0.45; // +X swings bottom (-Y) forward toward -Z!
    thighGroup.rotation.z = side * 0.12;
    hip.add(thighGroup);

    const thighInnerStrut = new THREE.Mesh(
      createBeveledBox(0.24, 0.68, 0.28, 0.028),
      hullDarkMat
    );
    thighInnerStrut.castShadow = true;
    thighGroup.add(thighInnerStrut);

    // Sculpted bronze outer thigh glacis armor plate
    const thighGlacis = new THREE.Mesh(
      createExtrudedArmor(
        [
          [-0.17, 0.32],
          [0.17, 0.32],
          [0.14, -0.32],
          [-0.14, -0.32],
        ],
        0.16,
        0.024
      ),
      bronzeMat
    );
    thighGlacis.position.set(side * 0.04, 0.02, -0.14);
    thighGlacis.castShadow = true;
    thighGroup.add(thighGlacis);

    // Dual chrome hydraulic thigh pistons on rear face
    for (const px of [-0.075, 0.075]) {
      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.036, 0.036, 0.6, 10),
        chromeMat
      );
      rod.position.set(px, 0, 0.16);
      thighGroup.add(rod);
    }

    // Reverse-Joint Knee Pivot
    const knee = new THREE.Group();
    knee.position.set(side * 0.08, -0.58, -0.28);
    hip.add(knee);

    // Heavy circular reverse-knee actuator drum
    const kneeDrum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.17, 0.36, 18),
      gunmetalMat
    );
    kneeDrum.rotation.z = Math.PI / 2;
    kneeDrum.castShadow = true;
    knee.add(kneeDrum);

    const kneeBoltCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.11, 0.4, 14),
      bronzeMat
    );
    kneeBoltCap.rotation.z = Math.PI / 2;
    knee.add(kneeBoltCap);

    // Heavy beveled angular Knee-Ram Prow Shield facing -Z
    const kneeRamGeo = createExtrudedArmor(
      [
        [-0.2, 0.18],
        [0.2, 0.18],
        [0.15, -0.18],
        [0.0, -0.24],
        [-0.15, -0.18],
      ],
      0.18,
      0.024
    );
    const kneeRam = new THREE.Mesh(kneeRamGeo, hullMat);
    kneeRam.position.set(0, 0.02, -0.2);
    kneeRam.rotation.x = 0.12;
    kneeRam.castShadow = true;
    knee.add(kneeRam);

    const kneeHazard = new THREE.Mesh(
      createBeveledBox(0.28, 0.075, 0.06, 0.012),
      hazardMat
    );
    kneeHazard.position.set(0, 0.1, -0.29);
    knee.add(kneeHazard);

    // Rear-swept Hydraulic Shin assembly (knee (0,0,0) -> ankle (0, -0.76, +0.34))
    const shinGroup = new THREE.Group();
    shinGroup.position.set(0, -0.38, 0.17);
    shinGroup.rotation.x = -0.42; // -X swings bottom (-Y) backward toward +Z!
    knee.add(shinGroup);

    // Twin parallel heavy hydraulic leg struts
    for (const sx of [-0.09, 0.09]) {
      const strut = new THREE.Mesh(
        createBeveledBox(0.11, 0.82, 0.24, 0.018),
        gunmetalMat
      );
      strut.position.set(sx, 0, 0);
      strut.castShadow = true;
      shinGroup.add(strut);
    }

    // Layered beveled titanium front shin greave armor
    const shinGreave = new THREE.Mesh(
      createExtrudedArmor(
        [
          [-0.17, 0.34],
          [0.17, 0.34],
          [0.19, -0.26],
          [0.12, -0.38],
          [-0.12, -0.38],
          [-0.19, -0.26],
        ],
        0.14,
        0.022
      ),
      hullMat
    );
    shinGreave.position.set(0, -0.02, -0.14);
    shinGreave.castShadow = true;
    shinGroup.add(shinGreave);

    // Bronze shin rib clamp
    const shinClamp = new THREE.Mesh(
      createBeveledBox(0.36, 0.11, 0.3, 0.018),
      bronzeMat
    );
    shinClamp.position.set(0, -0.14, -0.02);
    shinGroup.add(shinClamp);

    // Heavy chrome rear hydraulic shock cylinder + sleeve
    const shockSleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.062, 0.42, 12),
      hydraulicMat
    );
    shockSleeve.position.set(0, 0.16, 0.18);
    shinGroup.add(shockSleeve);

    const shockRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.042, 0.46, 12),
      chromeMat
    );
    shockRod.position.set(0, -0.18, 0.18);
    shinGroup.add(shockRod);

    // Flex hydraulic hose routing cleanly around outer knee
    const legHose = new THREE.Mesh(
      createStrapTube(
        [
          new THREE.Vector3(side * 0.16, 0.28, 0.12),
          new THREE.Vector3(side * 0.24, 0.02, 0.2),
          new THREE.Vector3(side * 0.16, -0.28, 0.12),
        ],
        0.024,
        1,
        12
      ),
      hydraulicMat
    );
    shinGroup.add(legHose);

    // Ankle Pivot (counter-rotated so giant stomp foot stays planted flush at y = 0!)
    const ankle = new THREE.Group();
    ankle.position.set(0, -0.76, 0.34);
    knee.add(ankle);

    const ankleJoint = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.15, 0.32, 16),
      gunmetalMat
    );
    ankleJoint.rotation.z = Math.PI / 2;
    ankle.add(ankleJoint);

    // Heavy armored foot chassis block (local y from -0.22 to -0.06 -> world bottom y = 0.00!)
    const footBase = new THREE.Mesh(
      createBeveledBox(0.46, 0.16, 0.54, 0.024),
      hullDarkMat
    );
    footBase.position.set(0, -0.14, 0.02);
    footBase.castShadow = true;
    ankle.add(footBase);

    // Armored bronze instep cap
    const instep = new THREE.Mesh(
      createBeveledBox(0.38, 0.12, 0.34, 0.02),
      bronzeMat
    );
    instep.position.set(0, -0.05, -0.06);
    instep.rotation.x = 0.18;
    ankle.add(instep);

    // Twin splayed forward seismic toe talons (resting dead flush at local y = -0.22!)
    const talonGeo = createExtrudedArmor(
      [
        [-0.085, 0.075],
        [0.085, 0.075],
        [0.065, -0.075],
        [-0.065, -0.075],
      ],
      0.34,
      0.018
    );
    for (const tx of [-0.17, 0.17]) {
      const talon = new THREE.Mesh(talonGeo, hullMat);
      talon.position.set(tx, -0.145, -0.32);
      talon.rotation.y = tx > 0 ? -0.18 : 0.18;
      talon.castShadow = true;
      ankle.add(talon);

      // Hazard steel claw tip cap
      const clawTip = new THREE.Mesh(
        createBeveledBox(0.11, 0.09, 0.12, 0.014),
        hazardMat
      );
      clawTip.position.set(tx * 1.12, -0.175, -0.47);
      ankle.add(clawTip);
    }

    // Center wedge seismic bumper toe
    const centerToe = new THREE.Mesh(
      createBeveledBox(0.14, 0.12, 0.24, 0.018),
      bronzeMat
    );
    centerToe.position.set(0, -0.16, -0.3);
    ankle.add(centerToe);

    // Heavy rear hydraulic heel anchor spur (resting flush at local y = -0.22!)
    const heelSpur = new THREE.Mesh(
      createBeveledBox(0.28, 0.14, 0.32, 0.02),
      gunmetalMat
    );
    heelSpur.position.set(0, -0.15, 0.32);
    heelSpur.castShadow = true;
    ankle.add(heelSpur);

    const heelPiston = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.036, 0.26, 10),
      chromeMat
    );
    heelPiston.position.set(0, -0.02, 0.24);
    heelPiston.rotation.x = -0.48;
    ankle.add(heelPiston);

    return { hip, knee, ankle };
  };

  const leftLeg = buildWalkerLeg(-1);
  leftLeg.hip.position.set(-0.54, -0.06, 0);
  pelvis.add(leftLeg.hip);

  const rightLeg = buildWalkerLeg(1);
  rightLeg.hip.position.set(0.54, -0.06, 0);
  pelvis.add(rightLeg.hip);

  // =========================================================================
  // 2. TOWERING DREADNOUGHT TORSO CHASSIS (world y = 1.88 .. 3.45)
  // =========================================================================
  const torso = new THREE.Group();
  torso.position.set(0, 0.26, 0);
  pelvis.add(torso);

  // Sculpted angular battleship core hull (tapered waist flaring out to wide dreadnought chest!)
  const hullCoreGeo = createExtrudedArmor(
    [
      [-0.48, 0.04],
      [0.48, 0.04],
      [0.74, 0.42],
      [0.78, 1.08],
      [0.58, 1.3],
      [-0.58, 1.3],
      [-0.78, 1.08],
      [-0.74, 0.42],
    ],
    0.96,
    0.045
  );
  const hullCore = new THREE.Mesh(hullCoreGeo, hullMat);
  hullCore.position.set(0, 0.67, 0.04);
  hullCore.castShadow = true;
  torso.add(hullCore);

  // Swept sloped upper bronze command glacis deck
  const upperDeckGeo = createExtrudedArmor(
    [
      [-0.64, -0.14],
      [0.64, -0.14],
      [0.54, 0.18],
      [-0.54, 0.18],
    ],
    0.88,
    0.032
  );
  const upperDeck = new THREE.Mesh(upperDeckGeo, bronzeMat);
  upperDeck.position.set(0, 1.32, 0.04);
  upperDeck.castShadow = true;
  torso.add(upperDeck);

  // Sloped angular armored dreadnought upper prow hood overhanging the reactor bay
  const prowHood = new THREE.Mesh(
    createExtrudedArmor(
      [
        [-0.58, 0.1],
        [0.58, 0.1],
        [0.48, -0.09],
        [-0.48, -0.09],
      ],
      0.24,
      0.022
    ),
    bronzeMat
  );
  prowHood.position.set(0, 1.15, -0.52);
  prowHood.rotation.x = 0.28;
  prowHood.castShadow = true;
  torso.add(prowHood);

  // Heavy angled front cheek glacis sponsons flanking the recessed reactor aperture
  for (const side of [-1, 1] as const) {
    const cheek = new THREE.Mesh(
      createExtrudedArmor(
        [
          [-0.26, 0.48],
          [0.26, 0.42],
          [0.22, -0.4],
          [-0.18, -0.44],
        ],
        0.3,
        0.028
      ),
      hullMat
    );
    cheek.position.set(side * 0.6, 0.72, -0.42);
    cheek.rotation.y = side * 0.34;
    cheek.castShadow = true;
    torso.add(cheek);

    // Sculpted bronze oblique armor cheek guard + glowing diagnostic status slit
    const cheekTrim = new THREE.Mesh(
      createBeveledBox(0.32, 0.1, 0.12, 0.016),
      bronzeMat
    );
    cheekTrim.position.set(side * 0.58, 1.06, -0.52);
    cheekTrim.rotation.y = side * 0.34;
    cheekTrim.rotation.z = -side * 0.18;
    torso.add(cheekTrim);

    const statusSlit = new THREE.Mesh(
      createBeveledBox(0.16, 0.036, 0.04, 0.006),
      overdriveMat
    );
    statusSlit.position.set(side * 0.61, 0.9, -0.56);
    statusSlit.rotation.y = side * 0.34;
    torso.add(statusSlit);

    // Lower rib-cage bronze bumper bar + compact amber caution accent
    const bellyBar = new THREE.Mesh(
      createBeveledBox(0.34, 0.095, 0.16, 0.015),
      bronzeMat
    );
    bellyBar.position.set(side * 0.42, 0.24, -0.47);
    bellyBar.rotation.y = side * 0.26;
    torso.add(bellyBar);

    const bellyCaution = new THREE.Mesh(
      createBeveledBox(0.14, 0.048, 0.05, 0.008),
      hazardMat
    );
    bellyCaution.position.set(side * 0.44, 0.24, -0.54);
    bellyCaution.rotation.y = side * 0.26;
    torso.add(bellyCaution);

    // Side hull radiator grille vents
    const sideVent = new THREE.Mesh(
      createBeveledBox(0.14, 0.46, 0.42, 0.018),
      gunmetalMat
    );
    sideVent.position.set(side * 0.77, 0.62, 0.14);
    torso.add(sideVent);
  }

  // Heavy Armored Gorget Roll-Cage Collar rising behind & around the command sensor head
  const collarBack = new THREE.Mesh(
    createExtrudedArmor(
      [
        [-0.44, 0.0],
        [0.44, 0.0],
        [0.36, 0.42],
        [-0.36, 0.42],
      ],
      0.16,
      0.022
    ),
    hullDarkMat
  );
  collarBack.position.set(0, 1.56, 0.18);
  collarBack.rotation.x = 0.2;
  collarBack.castShadow = true;
  torso.add(collarBack);

  for (const side of [-1, 1] as const) {
    const collarCheek = new THREE.Mesh(
      createBeveledBox(0.14, 0.34, 0.44, 0.02),
      bronzeMat
    );
    collarCheek.position.set(side * 0.42, 1.48, -0.06);
    collarCheek.rotation.z = -side * 0.22;
    torso.add(collarCheek);
  }

  // =========================================================================
  // 3. CHEST REACTOR CORE WEAKPOINT + ARTICULATED HYDRAULIC BLAST-DOORS
  // =========================================================================
  const reactorHousing = new THREE.Group();
  reactorHousing.position.set(0, 0.69, -0.45);
  torso.add(reactorHousing);

  // Heavy armored octagonal bezel collar framing the recessed reactor well cleanly
  const containmentWell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.37, 0.41, 0.24, 20),
    gunmetalMat
  );
  containmentWell.rotation.x = Math.PI / 2;
  containmentWell.position.set(0, 0, -0.02);
  reactorHousing.add(containmentWell);

  // Heavy beveled bronze outer containment ring + 6 radial locking clamps
  const outerRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.058, 12, 24),
    bronzeMat
  );
  outerRing.position.set(0, 0, -0.09);
  reactorHousing.add(outerRing);

  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const clamp = new THREE.Mesh(
      createBeveledBox(0.1, 0.08, 0.12, 0.012),
      hullDarkMat
    );
    clamp.position.set(Math.cos(ang) * 0.36, Math.sin(ang) * 0.36, -0.09);
    clamp.rotation.z = ang;
    reactorHousing.add(clamp);
  }

  // Spinning Molten Fusion-Turbine Reactor Core (recessed cleanly behind closed blast-doors!)
  const reactorSpinner = new THREE.Group();
  reactorSpinner.position.set(0, 0, 0.01);
  reactorHousing.add(reactorSpinner);

  const reactorOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 24, 18),
    reactorMat
  );
  reactorOrb.scale.set(1, 1, 0.54);
  reactorSpinner.add(reactorOrb);

  const innerPlasmaRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.26, 0.024, 10, 24),
    overdriveMat
  );
  innerPlasmaRing.position.set(0, 0, -0.05);
  reactorSpinner.add(innerPlasmaRing);

  // 6 sculpted turbine vane spokes spinning across the reactor core
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const vane = new THREE.Mesh(
      createBeveledBox(0.034, 0.24, 0.036, 0.006),
      gunmetalMat
    );
    vane.position.set(Math.cos(a) * 0.14, Math.sin(a) * 0.14, -0.1);
    vane.rotation.z = a + 0.35;
    reactorSpinner.add(vane);
  }

  // Housed upper & lower armored bronze door rail tracks (clean integrated silhouette!)
  for (const ry of [-0.36, 0.36]) {
    const railTrack = new THREE.Mesh(
      createBeveledBox(0.84, 0.068, 0.13, 0.012),
      gunmetalMat
    );
    railTrack.position.set(0, ry, -0.16);
    reactorHousing.add(railTrack);

    const railRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.76, 10),
      chromeMat
    );
    railRod.rotation.z = Math.PI / 2;
    railRod.position.set(0, ry, -0.2);
    reactorHousing.add(railRod);
  }

  // Twin Articulated Interlocking Hydraulic Blast-Doors (seated cleanly at z = -0.185!)
  const buildBlastDoor = (side: -1 | 1) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.195, 0, -0.185);

    // Interlocking armored door slab
    const slab = new THREE.Mesh(
      createExtrudedArmor(
        [
          [-0.19, 0.33],
          [0.19, 0.29],
          [0.19, -0.29],
          [-0.19, -0.33],
        ],
        0.095,
        0.018
      ),
      bronzeMat
    );
    if (side === -1) slab.scale.x = -1;
    slab.castShadow = true;
    pivot.add(slab);

    // Recessed titanium outer armor appliqué on door face
    const plate = new THREE.Mesh(
      createBeveledBox(0.24, 0.44, 0.045, 0.012),
      hullMat
    );
    plate.position.set(side * 0.02, 0, -0.05);
    pivot.add(plate);

    // Inner hazard warning edge strip visible as doors crack open!
    const hazardEdge = new THREE.Mesh(
      createBeveledBox(0.036, 0.54, 0.085, 0.008),
      hazardMat
    );
    hazardEdge.position.set(-side * 0.172, 0, -0.01);
    pivot.add(hazardEdge);

    return pivot;
  };

  const doorL = buildBlastDoor(-1);
  const doorR = buildBlastDoor(1);
  reactorHousing.add(doorL, doorR);

  const weakpointAnchor = new THREE.Object3D();
  weakpointAnchor.position.set(0, 0, -0.26);
  reactorHousing.add(weakpointAnchor);

  // =========================================================================
  // 4. PREDATORY ARMORED COMMAND SENSOR TURRET HEAD
  // =========================================================================
  const head = new THREE.Group();
  head.position.set(0, 1.46, -0.24);
  torso.add(head);

  // Swept faceted dreadnought helmet cowl
  const helmetGeo = createExtrudedArmor(
    [
      [-0.26, -0.14],
      [0.26, -0.14],
      [0.28, 0.04],
      [0.18, 0.19],
      [-0.18, 0.19],
      [-0.28, 0.04],
    ],
    0.5,
    0.028
  );
  const helmet = new THREE.Mesh(helmetGeo, hullMat);
  helmet.castShadow = true;
  head.add(helmet);

  // Angular bronze brow crest visor hood
  const browCrest = new THREE.Mesh(
    createBeveledBox(0.46, 0.1, 0.44, 0.02),
    bronzeMat
  );
  browCrest.position.set(0, 0.13, -0.08);
  browCrest.rotation.x = 0.16;
  head.add(browCrest);

  // Dark recessed visor faceplate housing
  const visorRecess = new THREE.Mesh(
    createBeveledBox(0.42, 0.14, 0.08, 0.012),
    gunmetalMat
  );
  visorRecess.position.set(0, 0.01, -0.24);
  head.add(visorRecess);

  // Predatory glowing triple-slit cyclops tactical visor array
  const visorMain = new THREE.Mesh(
    createBeveledBox(0.38, 0.055, 0.05, 0.008),
    visorMat
  );
  visorMain.position.set(0, 0.015, -0.275);
  head.add(visorMain);

  const cyclopsIris = new THREE.Mesh(
    new THREE.CylinderGeometry(0.044, 0.044, 0.05, 14),
    visorMat
  );
  cyclopsIris.rotation.x = Math.PI / 2;
  cyclopsIris.position.set(0, 0.015, -0.282);
  head.add(cyclopsIris);

  // Armored mandible chin guard
  const mandible = new THREE.Mesh(
    createBeveledBox(0.32, 0.09, 0.14, 0.015),
    hullDarkMat
  );
  mandible.position.set(0, -0.11, -0.22);
  head.add(mandible);

  // Side rangefinder optic cheek pods + swept-back tactical comm whip antennas
  for (const side of [-1, 1] as const) {
    const pod = new THREE.Mesh(
      createBeveledBox(0.11, 0.16, 0.24, 0.014),
      gunmetalMat
    );
    pod.position.set(side * 0.28, 0.01, -0.06);
    head.add(pod);

    const sideLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.04, 10),
      visorMat
    );
    sideLens.rotation.x = Math.PI / 2;
    sideLens.position.set(side * 0.28, 0.02, -0.18);
    head.add(sideLens);

    // Swept-back comm antenna fin + whip mast
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.018, 0.44, 8),
      chromeMat
    );
    antenna.position.set(side * 0.24, 0.3, 0.16);
    antenna.rotation.x = -0.38;
    antenna.rotation.z = -side * 0.14;
    head.add(antenna);
  }

  // =========================================================================
  // 5. TWIN DORSAL THERMAL EXHAUST STACKS & JUMP-CHARGE BOOSTER THRUSTERS
  // =========================================================================
  const dorsalVentAnchors: THREE.Object3D[] = [];
  const boosterFlames: THREE.Group[] = [];

  // Lathe bell nozzle geometry for jump-charge rocket thrusters
  const nozzlePts = [
    new THREE.Vector2(0.06, 0.0),
    new THREE.Vector2(0.11, 0.05),
    new THREE.Vector2(0.15, 0.16),
    new THREE.Vector2(0.18, 0.28),
    new THREE.Vector2(0.15, 0.28),
    new THREE.Vector2(0.11, 0.12),
    new THREE.Vector2(0.05, 0.02),
  ];
  const nozzleGeo = new THREE.LatheGeometry(nozzlePts, 16);

  // Dorsal armored reactor backpack spine
  const backpack = new THREE.Mesh(
    createBeveledBox(0.96, 0.96, 0.42, 0.04),
    hullDarkMat
  );
  backpack.position.set(0, 0.82, 0.62);
  backpack.castShadow = true;
  torso.add(backpack);

  // Central dorsal bronze power core drum
  const dorsalDrum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.52, 16),
    bronzeMat
  );
  dorsalDrum.position.set(0, 0.84, 0.84);
  torso.add(dorsalDrum);

  for (const side of [-1, 1] as const) {
    // Towering angled industrial thermal exhaust chimney
    const stackGroup = new THREE.Group();
    stackGroup.position.set(side * 0.46, 1.04, 0.68);
    stackGroup.rotation.x = -0.18;
    stackGroup.rotation.z = -side * 0.1;
    torso.add(stackGroup);

    const chimney = new THREE.Mesh(
      createExtrudedArmor(
        [
          [-0.15, -0.38],
          [0.15, -0.38],
          [0.13, 0.44],
          [-0.13, 0.44],
        ],
        0.3,
        0.022
      ),
      gunmetalMat
    );
    chimney.castShadow = true;
    stackGroup.add(chimney);

    // Stepped bronze thermal cooling louver fins
    for (let f = 0; f < 4; f++) {
      const fin = new THREE.Mesh(
        createBeveledBox(0.34, 0.045, 0.34, 0.008),
        bronzeMat
      );
      fin.position.set(0, -0.1 + f * 0.15, 0.02);
      stackGroup.add(fin);
    }

    // Glowing dorsal thermal radiator core slit + dark armored heat-cage grille bars!
    const ventCore = new THREE.Mesh(
      createBeveledBox(0.18, 0.54, 0.11, 0.012),
      overdriveMat
    );
    ventCore.position.set(0, 0.06, 0.14);
    stackGroup.add(ventCore);

    for (const gx of [-0.055, 0.055]) {
      const cageBar = new THREE.Mesh(
        createBeveledBox(0.022, 0.58, 0.035, 0.004),
        gunmetalMat
      );
      cageBar.position.set(gx, 0.06, 0.2);
      stackGroup.add(cageBar);
    }
    for (let gy = -0.14; gy <= 0.28; gy += 0.14) {
      const crossBar = new THREE.Mesh(
        createBeveledBox(0.22, 0.024, 0.036, 0.004),
        gunmetalMat
      );
      crossBar.position.set(0, gy, 0.2);
      stackGroup.add(crossBar);
    }

    const ventAnchor = new THREE.Object3D();
    ventAnchor.position.set(0, 0.46, 0.04);
    stackGroup.add(ventAnchor);
    dorsalVentAnchors.push(ventAnchor);

    // Lower Vector Jump-Charge Rocket Booster Bell Nozzle
    const thruster = new THREE.Group();
    thruster.position.set(side * 0.36, 0.36, 0.78);
    thruster.rotation.x = 0.62; // points downward and backward (+Z / -Y)
    torso.add(thruster);

    const bell = new THREE.Mesh(nozzleGeo, gunmetalMat);
    bell.rotation.x = Math.PI; // open mouth faces -Y (down/back) at local y = -0.28
    thruster.add(bell);

    // Anchor jet plume pivot strictly at the nozzle exit rim so scaling never pokes through bell top!
    const flamePivot = new THREE.Group();
    flamePivot.position.set(0, -0.26, 0);
    thruster.add(flamePivot);

    const flameCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.125, 0.56, 12),
      boosterFlameMat
    );
    flameCone.rotation.x = Math.PI;
    flameCone.position.set(0, -0.28, 0);
    flamePivot.add(flameCone);
    boosterFlames.push(flamePivot);
  }

  // =========================================================================
  // 6. TWIN TOWERING ARTICULATED 6-CELL SHOULDER SIEGE MISSILE PODS
  // =========================================================================
  const buildMissilePod = (side: -1 | 1) => {
    // Articulated hydraulic pylon arm attaching pod to upper torso deck
    const pylon = new THREE.Mesh(
      createBeveledBox(0.2, 0.34, 0.22, 0.02),
      hydraulicMat
    );
    pylon.position.set(side * 0.66, 1.44, 0.12);
    pylon.rotation.z = -side * 0.34;
    torso.add(pylon);

    const pod = new THREE.Group();
    pod.position.set(side * 0.86, 1.66, 0.1);

    // Chamfered angular 6-cell siege missile rack chassis
    const podHullGeo = createExtrudedArmor(
      [
        [-0.31, -0.22],
        [0.31, -0.22],
        [0.27, 0.24],
        [-0.27, 0.24],
      ],
      0.66,
      0.03
    );
    const podHull = new THREE.Mesh(podHullGeo, hullMat);
    podHull.castShadow = true;
    pod.add(podHull);

    // Bronze side armor cheek plates + hazard stripe trim
    const outerCheek = new THREE.Mesh(
      createBeveledBox(0.08, 0.38, 0.56, 0.014),
      bronzeMat
    );
    outerCheek.position.set(side * 0.32, 0, 0);
    pod.add(outerCheek);

    const hazardBand = new THREE.Mesh(
      createBeveledBox(0.64, 0.07, 0.52, 0.01),
      hazardMat
    );
    hazardBand.position.set(0, -0.15, 0);
    pod.add(hazardBand);

    // Textured 6-cell missile bay faceplate
    const facePlate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.36),
      missileFaceMat
    );
    facePlate.position.set(0, 0.01, -0.335);
    facePlate.rotation.y = Math.PI; // faces -Z!
    pod.add(facePlate);

    // 6 sculpted 3D recessed launch tube rims + glowing amber warhead nose-cones
    const rimGeo = new THREE.TorusGeometry(0.056, 0.012, 8, 14);
    const noseGeo = new THREE.ConeGeometry(0.042, 0.08, 10);
    for (let r = 0; r < 2; r++) {
      for (let c = -1; c <= 1; c++) {
        const tx = c * 0.155;
        const ty = r === 0 ? 0.09 : -0.075;
        const rim = new THREE.Mesh(rimGeo, gunmetalMat);
        rim.position.set(tx, ty, -0.34);
        pod.add(rim);

        const nose = new THREE.Mesh(noseGeo, visorMat);
        nose.rotation.x = -Math.PI / 2;
        nose.position.set(tx, ty, -0.36);
        pod.add(nose);
      }
    }

    // Rear missile exhaust blow-out grate
    const exhaustGrate = new THREE.Mesh(
      createBeveledBox(0.46, 0.32, 0.06, 0.01),
      gunmetalMat
    );
    exhaustGrate.position.set(0, 0, 0.34);
    pod.add(exhaustGrate);

    // Articulated Flip-Open Armored Blast-Hood Lid hinged at top-front-rear (+Z/+Y)
    const hoodPivot = new THREE.Group();
    hoodPivot.position.set(0, 0.24, 0.26);
    pod.add(hoodPivot);

    const hoodCap = new THREE.Mesh(
      createBeveledBox(0.58, 0.065, 0.62, 0.014),
      bronzeMat
    );
    hoodCap.position.set(0, 0.03, -0.3);
    hoodCap.castShadow = true;
    hoodPivot.add(hoodCap);

    // Front visor lip on blast-hood
    const hoodLip = new THREE.Mesh(
      createBeveledBox(0.54, 0.14, 0.055, 0.01),
      hullDarkMat
    );
    hoodLip.position.set(0, -0.05, -0.61);
    hoodPivot.add(hoodLip);

    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0.04, -0.44);
    pod.add(muzzle);

    return { pod, hoodPivot, muzzle };
  };

  const leftPod = buildMissilePod(-1);
  const rightPod = buildMissilePod(1);
  torso.add(leftPod.pod, rightPod.pod);

  // =========================================================================
  // 7. DUAL HEAVY SIEGE CANNON ARMS + UNDERBARREL RAIL-LANCE ACCELERATORS
  // =========================================================================
  const buildCannonArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 1.04, 0.94, 0.02);

    // Heavy hydraulic shoulder ball-drum joint
    const shoulderDrum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.34, 18),
      gunmetalMat
    );
    shoulderDrum.rotation.z = Math.PI / 2;
    shoulder.add(shoulderDrum);

    // Sculpted Curved Layered Siege Pauldron Shield (curved panel + bronze crest + ERA blocks!)
    const pauldronGroup = new THREE.Group();
    pauldronGroup.position.set(side * 0.1, 0.08, 0);
    pauldronGroup.rotation.z = -side * 0.16;
    shoulder.add(pauldronGroup);

    const pauldronShellGeo = createCurvedPanelGeometry(
      [
        { y: -0.24, rx: 0.32, rz: 0.36, thickness: 0.065 },
        { y: 0.0, rx: 0.35, rz: 0.39, thickness: 0.07 },
        { y: 0.22, rx: 0.3, rz: 0.34, thickness: 0.065 },
        { y: 0.34, rx: 0.21, rz: 0.26, thickness: 0.055 },
      ],
      side === 1 ? -Math.PI * 0.58 : Math.PI * 0.42,
      side === 1 ? Math.PI * 0.58 : Math.PI * 1.58,
      16
    );
    const pauldronShell = new THREE.Mesh(pauldronShellGeo, hullMat);
    pauldronShell.castShadow = true;
    pauldronGroup.add(pauldronShell);

    // Heavy bronze upper pauldron ridge crest
    const pauldronCrest = new THREE.Mesh(
      createBeveledBox(0.32, 0.1, 0.64, 0.02),
      bronzeMat
    );
    pauldronCrest.position.set(side * 0.04, 0.31, 0);
    pauldronCrest.castShadow = true;
    pauldronGroup.add(pauldronCrest);

    // 3 bolted reactive ERA armor bricks on outer shoulder flank
    for (let e = -1; e <= 1; e++) {
      const era = new THREE.Mesh(
        createBeveledBox(0.075, 0.22, 0.16, 0.012),
        e === 0 ? bronzeMat : hullDarkMat
      );
      era.position.set(side * 0.35, 0.02, e * 0.19);
      pauldronGroup.add(era);
    }

    // Sculpted heavy armored hydraulic bicep sleeve + dual pistons (beefy dreadnought arm!)
    const upperArm = new THREE.Mesh(
      createBeveledBox(0.36, 0.54, 0.36, 0.032),
      hullDarkMat
    );
    upperArm.position.set(side * 0.06, -0.32, 0.02);
    upperArm.castShadow = true;
    shoulder.add(upperArm);

    const bicepArmor = new THREE.Mesh(
      createBeveledBox(0.14, 0.42, 0.3, 0.018),
      bronzeMat
    );
    bicepArmor.position.set(side * 0.24, -0.32, 0.02);
    bicepArmor.castShadow = true;
    shoulder.add(bicepArmor);

    const armPiston = new THREE.Mesh(
      new THREE.CylinderGeometry(0.044, 0.044, 0.46, 10),
      chromeMat
    );
    armPiston.position.set(side * 0.2, -0.32, -0.14);
    shoulder.add(armPiston);

    // Heavy Elbow Drum Pivot -> Siege Weapon Pod
    const cannonPod = new THREE.Group();
    cannonPod.position.set(side * 0.08, -0.62, -0.22);
    shoulder.add(cannonPod);

    const elbowHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.32, 16),
      bronzeMat
    );
    elbowHub.rotation.z = Math.PI / 2;
    elbowHub.position.set(0, 0.02, 0.24);
    cannonPod.add(elbowHub);

    // Heavy angular Siege Weapon Receiver Housing
    const receiverGeo = createExtrudedArmor(
      [
        [-0.2, -0.19],
        [0.2, -0.19],
        [0.18, 0.2],
        [-0.18, 0.2],
      ],
      0.92,
      0.028
    );
    const receiver = new THREE.Mesh(receiverGeo, hullMat);
    receiver.position.set(0, 0.02, -0.14);
    receiver.castShadow = true;
    cannonPod.add(receiver);

    // Side cylindrical rotary ammo drum magazine + bronze clamp
    const ammoDrum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.24, 16),
      gunmetalMat
    );
    ammoDrum.rotation.z = Math.PI / 2;
    ammoDrum.position.set(side * 0.24, -0.02, 0.02);
    ammoDrum.castShadow = true;
    cannonPod.add(ammoDrum);

    const drumCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.26, 12),
      bronzeMat
    );
    drumCap.rotation.z = Math.PI / 2;
    drumCap.position.set(side * 0.24, -0.02, 0.02);
    cannonPod.add(drumCap);

    // Braided coolant feed hose curving from bicep to weapon receiver
    const coolantHose = new THREE.Mesh(
      createStrapTube(
        [
          new THREE.Vector3(-side * 0.04, 0.34, 0.26),
          new THREE.Vector3(-side * 0.16, 0.16, 0.34),
          new THREE.Vector3(-side * 0.12, 0.04, 0.12),
        ],
        0.024,
        1,
        12
      ),
      hydraulicMat
    );
    cannonPod.add(coolantHose);

    // Perforated cooling shroud around twin heavy rotary autocannon barrels
    const shroud = new THREE.Mesh(
      createBeveledBox(0.32, 0.24, 0.44, 0.018),
      bronzeMat
    );
    shroud.position.set(0, 0.08, -0.68);
    cannonPod.add(shroud);

    // Twin independently reciprocating heavy autocannon barrels (top-left & top-right)
    const buildBarrel = (bx: number, by: number) => {
      const bGrp = new THREE.Group();
      bGrp.position.set(bx, by, -0.64);

      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.048, 0.056, 0.96, 12),
        gunmetalMat
      );
      tube.rotation.x = Math.PI / 2;
      tube.position.set(0, 0, -0.44);
      tube.castShadow = true;
      bGrp.add(tube);

      // Dynamic glowing heat-jacket sleeve near muzzle
      const heatSleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(0.058, 0.058, 0.32, 12),
        barrelHeatMat
      );
      heatSleeve.rotation.x = Math.PI / 2;
      heatSleeve.position.set(0, 0, -0.74);
      bGrp.add(heatSleeve);

      // Slotted heavy siege muzzle brake
      const muzzleBrake = new THREE.Mesh(
        createBeveledBox(0.115, 0.115, 0.16, 0.014),
        gunmetalMat
      );
      muzzleBrake.position.set(0, 0, -0.96);
      bGrp.add(muzzleBrake);

      return bGrp;
    };

    const barrelA = buildBarrel(-0.082, 0.09);
    const barrelB = buildBarrel(0.082, 0.09);
    cannonPod.add(barrelA, barrelB);

    // Underbarrel Slotted Electromagnetic Rail-Lance Accelerator!
    const railGroup = new THREE.Group();
    railGroup.position.set(0, -0.1, -0.64);
    cannonPod.add(railGroup);

    for (const rx of [-0.07, 0.07]) {
      const railBar = new THREE.Mesh(
        createBeveledBox(0.042, 0.085, 0.92, 0.008),
        hullDarkMat
      );
      railBar.position.set(rx, 0, -0.42);
      railGroup.add(railBar);
    }

    // Glowing electromagnetic charge coils running along the center slot
    const railCore = new THREE.Mesh(
      createBeveledBox(0.058, 0.048, 0.86, 0.008),
      railCoilMat
    );
    railCore.position.set(0, 0, -0.4);
    railGroup.add(railCore);

    // Live Wall-Clipped Rail-Lance Convergence Targeting Laser!
    const laserPivot = new THREE.Group();
    laserPivot.position.set(0, -0.1, -1.52);
    laserPivot.visible = false;
    cannonPod.add(laserPivot);

    const laserCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 1, 8),
      laserCoreMat
    );
    laserCore.rotation.x = Math.PI / 2;
    laserCore.position.set(0, 0, -0.5);
    laserPivot.add(laserCore);

    const laserHalo = new THREE.Mesh(
      new THREE.CylinderGeometry(0.044, 0.044, 1, 8),
      laserGlowMat
    );
    laserHalo.rotation.x = Math.PI / 2;
    laserHalo.position.set(0, 0, -0.5);
    laserPivot.add(laserHalo);

    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0.02, -1.62);
    cannonPod.add(muzzle);

    return { shoulder, cannonPod, barrelA, barrelB, laserPivot, muzzle };
  };

  const leftArm = buildCannonArm(-1);
  const rightArm = buildCannonArm(1);
  torso.add(leftArm.shoulder, rightArm.shoulder);

  // =========================================================================
  // 8. PRECISION COMBAT HITBOXES (Weakpoint prioritized first!)
  // =========================================================================
  const bodyHitbox = createEnemyHitboxMesh(
    enemyId,
    'body',
    new THREE.BoxGeometry(2.35, 3.55, 1.55)
  );
  bodyHitbox.position.set(0, 1.85, 0);
  root.add(bodyHitbox);

  const headHitbox = createEnemyHitboxMesh(
    enemyId,
    'head',
    new THREE.BoxGeometry(0.66, 0.46, 0.56)
  );
  head.add(headHitbox);

  const wpHitbox = createEnemyHitboxMesh(
    enemyId,
    'weakpoint',
    new THREE.BoxGeometry(0.84, 0.78, 0.48),
    'chest_reactor_core'
  );
  wpHitbox.position.set(0, 0, -0.12);
  reactorHousing.add(wpHitbox);

  // =========================================================================
  // 9. ANIMATION STATE & REALTIME CONTROLS
  // =========================================================================
  let stridePhase = 0;
  let doorOpen = 0;
  let podHoodTarget = 0;
  let podHoodCur = 0;
  let railChargeGlow = 0;

  return {
    root,
    hitboxes: [wpHitbox, headHitbox, bodyHitbox],
    weakpointMaterials: [reactorMat],
    armorFlashMaterials: [hullMat, bronzeMat],
    getMuzzleWorldPos: (out) => {
      rightArm.muzzle.getWorldPosition(out);
      return out;
    },
    getLeftArmMuzzlePos: (out) => {
      leftArm.muzzle.getWorldPosition(out);
      return out;
    },
    getRightArmMuzzlePos: (out) => {
      rightArm.muzzle.getWorldPosition(out);
      return out;
    },
    getPodMuzzlePos: (side, out) => {
      (side === -1 ? leftPod.muzzle : rightPod.muzzle).getWorldPosition(out);
      return out;
    },
    getReactorWorldPos: (out) => {
      weakpointAnchor.getWorldPosition(out);
      return out;
    },
    getDorsalVentWorldPos: (side, out) => {
      (side === -1 ? dorsalVentAnchors[0] : dorsalVentAnchors[1]).getWorldPosition(out);
      return out;
    },
    getWeakpointWorldPos: (out) => {
      weakpointAnchor.getWorldPosition(out);
      return out;
    },
    setDualRailLasers: (active, leftLen, rightLen, chargeRatio) => {
      railChargeGlow = active ? Math.max(0, Math.min(1, chargeRatio)) : 0;
      leftArm.laserPivot.visible = active && leftLen > 0.25;
      rightArm.laserPivot.visible = active && rightLen > 0.25;
      if (active) {
        const thick = 0.75 + railChargeGlow * 1.15;
        leftArm.laserPivot.scale.set(thick, thick, Math.max(0.25, leftLen));
        rightArm.laserPivot.scale.set(thick, thick, Math.max(0.25, rightLen));
        laserCoreMat.color.setHex(railChargeGlow > 0.78 ? 0xfff4d0 : 0xffaa28);
        laserGlowMat.color.setHex(railChargeGlow > 0.78 ? 0xff2614 : 0xff7818);
        laserGlowMat.opacity = 0.28 + railChargeGlow * 0.42;
      }
    },
    setBarrelHeat: (heatRatio) => {
      const h = Math.max(0, Math.min(1, heatRatio));
      barrelHeatMat.emissiveIntensity = h * 3.1;
      barrelHeatMat.emissive.setHex(h > 0.65 ? 0xff6e18 : 0xff320a);
    },
    setPodHoodOpen: (openRatio) => {
      podHoodTarget = Math.max(0, Math.min(1, openRatio));
    },
    updateAnimation: (input: EnemyAnimationInput) => {
      const dt = Math.min(0.1, input.dt);

      // Death collapse
      if (input.behavior === 'dead') {
        const p = Math.min(1, input.deadProgress);
        leftArm.laserPivot.visible = false;
        rightArm.laserPivot.visible = false;
        pelvis.position.y = BASE_PELVIS_Y * (1 - p * 0.76);
        pelvis.rotation.x = p * 1.12;
        torso.rotation.x = p * 0.36;
        doorL.position.x = -0.2 - p * 0.25;
        doorR.position.x = 0.2 + p * 0.25;
        boosterFlameMat.opacity = 0;
        return;
      }

      const isP2 = input.phase === 2;
      const speed = Math.min(1.8, input.speedRatio);
      const booster = input.boosterIntensity ?? 0;

      // Phase 2 Apex Overdrive visual escalation (dorsal stacks & visor shift to fiery crimson!)
      const pulse = 0.5 + 0.5 * Math.sin(input.elapsed * (isP2 ? 14 : 5));
      if (isP2) {
        overdriveMat.color.setHex(0xff3818);
        overdriveMat.emissive.setHex(0xff1e0c);
        overdriveMat.emissiveIntensity = 2.6 + pulse * 1.4;
        visorMat.emissive.setHex(0xff2814);
        visorMat.emissiveIntensity = 3.2 + pulse * 0.9;
      } else {
        overdriveMat.color.setHex(0xff8c28);
        overdriveMat.emissive.setHex(0xff7818);
        overdriveMat.emissiveIntensity = 0.75 + pulse * 0.45;
        visorMat.emissive.setHex(0xffaa18);
        visorMat.emissiveIntensity = 2.6 + pulse * 0.5;
      }

      // Rail accelerator coil glow
      railCoilMat.emissiveIntensity =
        0.55 + railChargeGlow * 3.4 + (isP2 ? 0.5 : 0);
      railCoilMat.emissive.setHex(
        railChargeGlow > 0.75 || isP2 ? 0xff3614 : 0xff981c
      );

      // Dorsal Jump-Charge rocket thruster cones
      boosterFlameMat.opacity = Math.min(0.95, booster * 0.85);
      boosterFlameMat.emissiveIntensity = 1.4 + booster * 2.4;
      for (const fl of boosterFlames) {
        fl.visible = booster > 0.08;
        const flicker = 0.85 + Math.sin(input.elapsed * 42) * 0.2;
        fl.scale.set(0.85 + booster * 0.3, (0.65 + booster * 0.95) * flicker, 0.85 + booster * 0.3);
      }

      // Chest Reactor Blast-Doors slide + hinge wide open when venting or staggered!
      const targetDoor = input.weakpointExposed || input.staggerTimer > 0 ? 1 : 0;
      doorOpen += (targetDoor - doorOpen) * Math.min(1, dt * 8.5);
      doorL.position.x = -0.195 - doorOpen * 0.31;
      doorR.position.x = 0.195 + doorOpen * 0.31;
      doorL.position.z = -0.185 + doorOpen * 0.02;
      doorR.position.z = -0.185 + doorOpen * 0.02;
      doorL.rotation.y = doorOpen * 0.44;
      doorR.rotation.y = -doorOpen * 0.44;

      // Spin molten Chest Reactor fusion turbine core faster when exposed or Phase 2!
      const spinRate = 1.4 + doorOpen * 9.5 + (isP2 ? 3.5 : 0);
      reactorSpinner.rotation.z += dt * spinRate;
      reactorMat.emissiveIntensity =
        (doorOpen > 0.15 ? 3.8 : 1.6) + Math.sin(input.elapsed * 16) * 0.65;

      // Shoulder missile pod blast-hood articulation (+X lifts front edge upward!)
      const effectiveHood =
        (input.behavior === 'windup' || input.behavior === 'attack') && input.attackVariant === 1
          ? 1
          : podHoodTarget;
      podHoodCur += (effectiveHood - podHoodCur) * Math.min(1, dt * 9.0);
      leftPod.hoodPivot.rotation.x = podHoodCur * 0.92;
      rightPod.hoodPivot.rotation.x = podHoodCur * 0.92;

      // Smoothly reset barrel recoil unless actively firing
      leftArm.barrelA.position.z += (-0.64 - leftArm.barrelA.position.z) * Math.min(1, dt * 16);
      leftArm.barrelB.position.z += (-0.64 - leftArm.barrelB.position.z) * Math.min(1, dt * 16);
      rightArm.barrelA.position.z += (-0.64 - rightArm.barrelA.position.z) * Math.min(1, dt * 16);
      rightArm.barrelB.position.z += (-0.64 - rightArm.barrelB.position.z) * Math.min(1, dt * 16);

      // DRAMATIC KNEEL-STAGGER when Chest Reactor Core ruptures!
      if (input.staggerTimer > 0) {
        const shudder = Math.sin(input.elapsed * 14) * 0.12;
        pelvis.position.y = BASE_PELVIS_Y - 0.26;
        pelvis.rotation.x = 0.08;
        leftLeg.hip.rotation.x = 0.36;
        leftLeg.knee.rotation.x = -0.68;
        leftLeg.ankle.rotation.x = 0.32;
        rightLeg.hip.rotation.x = 0.36;
        rightLeg.knee.rotation.x = -0.68;
        rightLeg.ankle.rotation.x = 0.32;

        // Torso leans forward (-X leans forward!) exposing the blazing open chest core
        torso.rotation.x = -0.12;
        torso.rotation.y = shudder;
        head.rotation.x = -0.22;
        leftArm.shoulder.rotation.set(-0.18, 0.22, -0.34);
        rightArm.shoulder.rotation.set(-0.18, -0.22, 0.34);
        leftPod.pod.rotation.x = 0;
        rightPod.pod.rotation.x = 0;
        return;
      }

      // Reverse-joint heavy bipedal walking gait (counter-rotated ankles stay flush on floor!)
      stridePhase += dt * (1.8 + speed * 4.4);
      const walkAmp = Math.min(1, speed);
      const stride = Math.sin(stridePhase) * 0.32 * walkAmp;
      const bob = Math.abs(Math.cos(stridePhase)) * 0.065 * walkAmp;

      pelvis.position.y = BASE_PELVIS_Y + bob;
      pelvis.rotation.x = 0;
      pelvis.rotation.z = Math.sin(stridePhase) * 0.035 * walkAmp;

      leftLeg.hip.rotation.x = stride;
      leftLeg.knee.rotation.x = -Math.max(0, stride * 0.65);
      leftLeg.ankle.rotation.x = -(leftLeg.hip.rotation.x + leftLeg.knee.rotation.x);

      rightLeg.hip.rotation.x = -stride;
      rightLeg.knee.rotation.x = -Math.max(0, -stride * 0.65);
      rightLeg.ankle.rotation.x = -(rightLeg.hip.rotation.x + rightLeg.knee.rotation.x);

      const pitch = Math.max(-0.34, Math.min(0.38, input.aimPitch));
      const p = Math.max(0, Math.min(1, input.attackProgress));

      // Default combat stance resets
      torso.rotation.set(-0.04, 0, 0);
      head.rotation.set(pitch * 0.4, 0, 0);
      leftPod.pod.rotation.x = 0;
      rightPod.pod.rotation.x = 0;
      leftArm.shoulder.rotation.set(pitch * 0.6, 0, -0.06);
      rightArm.shoulder.rotation.set(pitch * 0.6, 0, 0.06);
      leftArm.cannonPod.rotation.set(0, 0, 0);
      rightArm.cannonPod.rotation.set(0, 0, 0);

      // Variant-driven AAA boss combat choreography!
      if (input.behavior === 'windup') {
        if (input.attackVariant === 2) {
          // SEISMIC HYDRAULIC STOMP windup: lift right walker leg high & brace torso back!
          const lift = Math.sin(p * Math.PI * 0.5);
          pelvis.position.y = BASE_PELVIS_Y + lift * 0.14;
          torso.rotation.x = 0.14 * lift; // +X leans back to balance heavy raised foot
          rightLeg.hip.rotation.x = 0.68 * lift;
          rightLeg.knee.rotation.x = -0.58 * lift;
          rightLeg.ankle.rotation.x = -0.1 * lift;
          leftArm.shoulder.rotation.set(0.28 * lift, 0, -0.26 * lift);
          rightArm.shoulder.rotation.set(0.28 * lift, 0, 0.26 * lift);
        } else if (input.attackVariant === 1) {
          // CARPET MISSILE BARRAGE windup: elevate pods & brace shoulders!
          torso.rotation.x = 0.1 * p;
          leftPod.pod.rotation.x = 0.42 * p; // +X tilts front (-Z) of missile pod UPWARD!
          rightPod.pod.rotation.x = 0.42 * p;
          leftArm.shoulder.rotation.set(-0.14, 0, -0.18);
          rightArm.shoulder.rotation.set(-0.14, 0, 0.18);
        } else if (input.attackVariant === 3) {
          // TWIN SIEGE RAIL-LANCE CONVERGENCE: crouch low & converge both rail cannons forward!
          pelvis.position.y = BASE_PELVIS_Y - 0.12 * p;
          leftLeg.hip.rotation.x = 0.22 * p;
          leftLeg.knee.rotation.x = -0.44 * p;
          leftLeg.ankle.rotation.x = 0.22 * p;
          rightLeg.hip.rotation.x = 0.22 * p;
          rightLeg.knee.rotation.x = -0.44 * p;
          rightLeg.ankle.rotation.x = 0.22 * p;
          torso.rotation.x = -0.08 * p;
          leftArm.shoulder.rotation.set(pitch * 0.8 + 0.08, -0.12 * p, -0.04);
          rightArm.shoulder.rotation.set(pitch * 0.8 + 0.08, 0.12 * p, 0.04);
        } else if (input.attackVariant === 4) {
          // OVERDRIVE TITAN CHARGE windup: drop prow menacingly forward & flare thrusters!
          pelvis.position.y = BASE_PELVIS_Y - 0.16 * p;
          torso.rotation.x = -0.24 * p; // -X leans prow aggressively FORWARD!
          leftArm.shoulder.rotation.set(-0.34 * p, 0, -0.22 * p);
          rightArm.shoulder.rotation.set(-0.34 * p, 0, 0.22 * p);
        } else if (input.attackVariant === 5) {
          // ARC PLASMA FAN windup: spread both siege arms wide!
          torso.rotation.x = -0.06;
          leftArm.shoulder.rotation.set(pitch * 0.6 + 0.12, 0.28 * p, -0.22 * p);
          rightArm.shoulder.rotation.set(pitch * 0.6 + 0.12, -0.28 * p, 0.22 * p);
        } else {
          // DUAL ROTARY windup: raise twin cannons into level firing lock
          torso.rotation.x = -0.06;
          leftArm.shoulder.rotation.set(pitch * 0.75 + 0.14 * p, 0, -0.04);
          rightArm.shoulder.rotation.set(pitch * 0.75 + 0.14 * p, 0, 0.04);
        }
      } else if (input.behavior === 'attack') {
        if (input.attackVariant === 2) {
          // SEISMIC STOMP SLAM IMPACT!
          pelvis.position.y = BASE_PELVIS_Y - 0.16 * (1 - p);
          torso.rotation.x = -0.18 * (1 - p);
          leftArm.shoulder.rotation.set(-0.2, 0, -0.28);
          rightArm.shoulder.rotation.set(-0.2, 0, 0.28);
        } else if (input.attackVariant === 1) {
          // CARPET MISSILE LAUNCH RECOIL!
          const podKick = Math.sin(input.elapsed * 22) * 0.08;
          torso.rotation.x = 0.12;
          leftPod.pod.rotation.x = 0.42 + podKick;
          rightPod.pod.rotation.x = 0.42 - podKick;
          leftArm.shoulder.rotation.set(-0.1, 0, -0.16);
          rightArm.shoulder.rotation.set(-0.1, 0, 0.16);
        } else if (input.attackVariant === 3) {
          // TWIN RAIL-LANCE RECOIL KICK!
          const kick = Math.max(0, 1 - p * 2.2);
          torso.rotation.x = 0.16 * kick;
          leftArm.shoulder.rotation.set(pitch * 0.75 + 0.26 * kick, -0.08, -0.08);
          rightArm.shoulder.rotation.set(pitch * 0.75 + 0.26 * kick, 0.08, 0.08);
        } else if (input.attackVariant === 4) {
          // OVERDRIVE TITAN CHARGE BULL-RUSH!
          pelvis.position.y = BASE_PELVIS_Y - 0.14 + bob * 1.4;
          torso.rotation.x = -0.26;
          leftArm.shoulder.rotation.set(-0.42, 0, -0.24);
          rightArm.shoulder.rotation.set(-0.42, 0, 0.24);
        } else if (input.attackVariant === 5) {
          // ARC PLASMA FAN SWEEP!
          const sweep = (p - 0.5) * 0.42;
          torso.rotation.x = 0.06;
          leftArm.shoulder.rotation.set(pitch * 0.75 + 0.1, -sweep, -0.12);
          rightArm.shoulder.rotation.set(pitch * 0.75 + 0.1, sweep, 0.12);
        } else {
          // DUAL ROTARY SUPPRESSION: alternating high-cadence barrel reciprocation!
          const cycle = input.elapsed * 28;
          const kickL = Math.max(0, Math.sin(cycle));
          const kickR = Math.max(0, -Math.sin(cycle));
          torso.rotation.x = 0.04;
          torso.rotation.y = Math.sin(cycle * 0.5) * 0.05;
          leftArm.shoulder.rotation.set(pitch * 0.8 + 0.12 + kickL * 0.08, 0, -0.05);
          rightArm.shoulder.rotation.set(pitch * 0.8 + 0.12 + kickR * 0.08, 0, 0.05);
          leftArm.barrelA.position.z = -0.64 + kickL * 0.14;
          leftArm.barrelB.position.z = -0.64 + kickR * 0.14;
          rightArm.barrelA.position.z = -0.64 + kickR * 0.14;
          rightArm.barrelB.position.z = -0.64 + kickL * 0.14;
        }
      } else if (input.behavior === 'recover') {
        // THERMAL REACTOR VENTING WINDOW: splay siege arms wide, lean slightly back & open chest core!
        pelvis.position.y = BASE_PELVIS_Y - 0.08;
        torso.rotation.x = 0.08;
        head.rotation.x = -0.14;
        leftArm.shoulder.rotation.set(-0.24, 0.22, -0.44);
        rightArm.shoulder.rotation.set(-0.24, -0.22, 0.44);
      } else {
        // Heavy menacing stalk/combat stance
        torso.rotation.x = -0.05;
        leftArm.shoulder.rotation.set(pitch * 0.55 + 0.08, 0, -0.08);
        rightArm.shoulder.rotation.set(pitch * 0.55 + 0.08, 0, 0.08);
      }

      // Apply subtle ballistic flinch kick
      if (input.flinchTimer > 0) {
        torso.rotation.z += input.flinchDirX * input.flinchTimer * 0.45;
      }
    },
    dispose: () => {
      root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
      });
      for (const m of ownedMaterials) m.dispose();
      tex.dispose();
    },
  };
}
