import * as THREE from 'three';
import {
  createBeveledBox,
  createContouredArmorPlate,
  createCurvedPanelGeometry,
  createLoftedAnatomy,
  createSculptedHand,
  createStrapTube,
} from '../../../core/sculptUtils';
import { createEnemyContactShadow, createEnemyHitboxMesh } from '../../core/enemyMeshShared';
import type { EnemyAnimationInput, EnemyRigHandle } from '../../core/types';
import type { Floor07EnemyMaterials } from '../materials';
import { createGrappleDuelistTextures, type GrappleDuelistTextureSuite } from './textures';

export interface GrappleDuelistRigHandle extends EnemyRigHandle {
  setTetherCable: (active: boolean, length: number, tensionRatio: number) => void;
  getGrappleMuzzleWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  getLanceTipWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  getVisorWorldPos: (out: THREE.Vector3) => THREE.Vector3;
  getBoosterNozzleWorldPos: (side: -1 | 1, out: THREE.Vector3) => THREE.Vector3;
}

/**
 * Maps `(angleRad, y)` onto the agile cyber-gladiator V-tapered torso shell
 * so 45°-chamfered crimson-oxide & obsidian armor plates conform seamlessly.
 */
function mapDuelistTorsoSurface(u: number, v: number, offset: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, v / 0.52));
  const rx = 0.146 + Math.sin(t * Math.PI * 0.8) * 0.068 + t * 0.036;
  const rz = 0.112 + Math.sin(t * Math.PI * 0.72) * 0.036;
  const x = Math.sin(u) * (rx + offset);
  const z = -Math.cos(u) * (rz + offset);
  return [x, v, z];
}

function buildDuelistExoLeg(
  side: -1 | 1,
  oxideArmorMat: THREE.Material,
  obsidianMat: THREE.Material,
  undersuitMat: THREE.Material,
  chromeMat: THREE.Material,
  bronzeMat: THREE.Material,
  amberEmissiveMat: THREE.Material
) {
  const hip = new THREE.Group();

  // Sculpted muscular sprinter thigh (strictly bottom-to-top Y order for outward normals!)
  const thigh = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: -0.45, rx: 0.058, rz: 0.064, squareness: 2.15 },
        { y: -0.35, rx: 0.069, rz: 0.078, frontScale: 1.05, squareness: 2.22 },
        { y: -0.2, rx: 0.084, rz: 0.092, frontScale: 1.08, squareness: 2.3 },
        { y: -0.06, rx: 0.092, rz: 0.1, frontScale: 1.06, squareness: 2.32 },
        { y: 0.06, rx: 0.089, rz: 0.096, squareness: 2.2 },
      ],
      18
    ),
    undersuitMat
  );
  thigh.castShadow = true;
  hip.add(thigh);

  // Swept contoured crimson-oxide outer thigh cuisse fin
  const cuisse = new THREE.Mesh(
    createCurvedPanelGeometry(
      [
        { y: -0.36, rx: 0.074, rz: 0.082, thickness: 0.015 },
        { y: -0.2, rx: 0.09, rz: 0.098, thickness: 0.019 },
        { y: -0.04, rx: 0.097, rz: 0.105, thickness: 0.017 },
      ],
      side === 1 ? -Math.PI * 0.68 : -Math.PI * 0.96,
      side === 1 ? -Math.PI * 0.04 : -Math.PI * 0.32,
      14
    ),
    oxideArmorMat
  );
  cuisse.castShadow = true;
  hip.add(cuisse);

  // Aerodynamic lateral thigh stabilizer blade (gives fierce high-speed silhouette)
  const thighFinShape = new THREE.Shape();
  thighFinShape.moveTo(0, -0.15);
  thighFinShape.lineTo(0.055, -0.05);
  thighFinShape.lineTo(0.068, 0.14);
  thighFinShape.lineTo(0.012, 0.16);
  thighFinShape.lineTo(0, 0.04);
  thighFinShape.closePath();
  const thighFinGeo = new THREE.ExtrudeGeometry(thighFinShape, {
    depth: 0.014,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
  });
  thighFinGeo.center();
  const thighFin = new THREE.Mesh(thighFinGeo, obsidianMat);
  thighFin.position.set(side * 0.094, -0.16, 0.03);
  thighFin.rotation.y = side * (Math.PI * 0.5 - 0.18);
  thighFin.castShadow = true;
  hip.add(thighFin);

  // Open-ended ballistic thigh harness strap
  const thighBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.088, 0.084, 0.026, 16, 1, true),
    bronzeMat
  );
  thighBand.position.set(0, -0.24, 0);
  thighBand.scale.set(1.0, 1.0, 1.08);
  hip.add(thighBand);

  // Knee assembly (negative rotation.x bends calf naturally backward)
  const knee = new THREE.Group();
  knee.position.set(0, -0.45, 0);
  hip.add(knee);

  const kneeAxle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.036, 0.144, 12),
    obsidianMat
  );
  kneeAxle.rotation.z = Math.PI / 2;
  knee.add(kneeAxle);

  // Angled predatory knee beak cowl
  const kneeGuard = new THREE.Mesh(
    createCurvedPanelGeometry(
      [
        { y: -0.075, rx: 0.062, rz: 0.078, thickness: 0.018 },
        { y: 0.008, rx: 0.07, rz: 0.094, thickness: 0.024 },
        { y: 0.084, rx: 0.06, rz: 0.076, thickness: 0.016 },
      ],
      -Math.PI * 0.8,
      -Math.PI * 0.2,
      12
    ),
    obsidianMat
  );
  kneeGuard.castShadow = true;
  knee.add(kneeGuard);

  const kneeCrest = new THREE.Mesh(createBeveledBox(0.032, 0.096, 0.024, 0.005), oxideArmorMat);
  kneeCrest.position.set(0, 0.018, -0.094);
  kneeCrest.rotation.x = -0.18;
  knee.add(kneeCrest);

  // Agile digitigrade-inspired sculpted calf (bottom-to-top Y order!)
  const shin = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: -0.44, rx: 0.044, rz: 0.052, offsetZ: 0.014, squareness: 2.1 },
        { y: -0.3, rx: 0.056, rz: 0.072, offsetZ: 0.02, backScale: 1.12, squareness: 2.25 },
        { y: -0.14, rx: 0.068, rz: 0.086, offsetZ: 0.014, backScale: 1.18, squareness: 2.38 },
        { y: 0.02, rx: 0.058, rz: 0.068, squareness: 2.25 },
      ],
      16
    ),
    undersuitMat
  );
  shin.castShadow = true;
  knee.add(shin);

  // Swept blade-profile armored shin greave
  const greave = new THREE.Mesh(
    createCurvedPanelGeometry(
      [
        { y: -0.4, rx: 0.05, rz: 0.062, offsetZ: 0.008, thickness: 0.016 },
        { y: -0.2, rx: 0.07, rz: 0.088, offsetZ: 0.006, thickness: 0.022 },
        { y: -0.04, rx: 0.066, rz: 0.078, offsetZ: 0.002, thickness: 0.017 },
      ],
      -Math.PI * 0.86,
      -Math.PI * 0.14,
      12
    ),
    oxideArmorMat
  );
  greave.castShadow = true;
  knee.add(greave);

  // Reverse-cant hydraulic spring-blade piston along posterior calf (signature high-speed look)
  const pistonHousing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.015, 0.18, 10),
    obsidianMat
  );
  pistonHousing.position.set(side * 0.062, -0.13, 0.044);
  pistonHousing.rotation.x = 0.14;
  knee.add(pistonHousing);

  const pistonRod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.27, 10),
    chromeMat
  );
  pistonRod.position.set(side * 0.062, -0.29, 0.068);
  pistonRod.rotation.x = 0.14;
  knee.add(pistonRod);

  const calfNode = new THREE.Mesh(createBeveledBox(0.016, 0.032, 0.016, 0.003), amberEmissiveMat);
  calfNode.position.set(side * 0.072, -0.15, 0.022);
  knee.add(calfNode);

  // Articulated ankle + serrated magnetic sprint-blade boot (sits flush at y = 0)
  const ankle = new THREE.Group();
  ankle.position.set(0, -0.45, 0);
  knee.add(ankle);

  const ankleJoint = new THREE.Mesh(
    new THREE.CylinderGeometry(0.046, 0.052, 0.06, 12),
    obsidianMat
  );
  ankleJoint.position.set(0, -0.01, 0.01);
  ankle.add(ankleJoint);

  // Sculpted tapered forefoot boot shell (bottom-to-top!)
  const bootUpper = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: -0.07, rx: 0.058, rz: 0.136, offsetZ: -0.042, frontScale: 1.15, squareness: 2.5 },
        { y: -0.032, rx: 0.056, rz: 0.122, offsetZ: -0.036, frontScale: 1.1, squareness: 2.4 },
        { y: 0.015, rx: 0.048, rz: 0.078, offsetZ: -0.006, squareness: 2.2 },
      ],
      14
    ),
    obsidianMat
  );
  bootUpper.castShadow = true;
  ankle.add(bootUpper);

  const toeCap = new THREE.Mesh(createBeveledBox(0.088, 0.042, 0.092, 0.01), oxideArmorMat);
  toeCap.position.set(0, -0.044, -0.125);
  toeCap.rotation.x = 0.12;
  ankle.add(toeCap);

  // Magnetic traction sprint heel spur
  const heelSpur = new THREE.Mesh(createBeveledBox(0.054, 0.048, 0.095, 0.008), bronzeMat);
  heelSpur.position.set(0, -0.044, 0.076);
  heelSpur.rotation.x = -0.18;
  ankle.add(heelSpur);

  const solePlate = new THREE.Mesh(createBeveledBox(0.112, 0.022, 0.295, 0.005), obsidianMat);
  solePlate.position.set(0, -0.068, -0.038);
  ankle.add(solePlate);

  return { hip, knee, ankle };
}

/**
 * Builds the iconic 2.35m Thermite-Plasma Shock-Lance:
 * Segmented dark-carbon & brushed-titanium haft, weighted rear spike counterweight,
 * glowing plasma energy conduit coils, swept winged emitter crossguard, and sculpted
 * twin-prong superheated spearhead with incandescent core + translucent plasma heat sheath.
 */
function buildThermitePlasmaLance(
  oxideArmorMat: THREE.Material,
  obsidianMat: THREE.Material,
  bronzeMat: THREE.Material,
  chromeMat: THREE.Material,
  plasmaCoreMat: THREE.MeshStandardMaterial,
  plasmaSheathMat: THREE.MeshBasicMaterial
) {
  const lance = new THREE.Group();

  // Main segmented haft shaft (y from -0.82 to +1.05, gripped around y = 0)
  const shaftMain = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.022, 1.82, 12),
    obsidianMat
  );
  shaftMain.position.set(0, 0.12, 0);
  shaftMain.castShadow = true;
  lance.add(shaftMain);

  // Textured knurled grip collars (upper and lower hand holds)
  const gripLower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.027, 0.027, 0.24, 12),
    bronzeMat
  );
  gripLower.position.set(0, -0.02, 0);
  lance.add(gripLower);

  const gripUpper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, 0.18, 12),
    bronzeMat
  );
  gripUpper.position.set(0, 0.34, 0);
  lance.add(gripUpper);

  // Rear counterweight pommel & diamond balance spike
  const pommelCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.028, 0.09, 10),
    oxideArmorMat
  );
  pommelCollar.position.set(0, -0.78, 0);
  lance.add(pommelCollar);

  const pommelSpike = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.22, 6), chromeMat);
  pommelSpike.rotation.x = Math.PI;
  pommelSpike.position.set(0, -0.92, 0);
  lance.add(pommelSpike);

  // Braided external thermite power conduit tubes running along upper haft
  for (const s of [-1, 1] as const) {
    const conduit = new THREE.Mesh(
      createStrapTube(
        [
          new THREE.Vector3(s * 0.024, 0.42, 0.01),
          new THREE.Vector3(s * 0.038, 0.64, -0.015),
          new THREE.Vector3(s * 0.034, 0.88, 0.01),
          new THREE.Vector3(s * 0.045, 1.04, 0),
        ],
        0.0085,
        1,
        14
      ),
      bronzeMat
    );
    lance.add(conduit);
  }

  // Heavy plasma emitter barrel housing & twin swept wing crossguards
  const emitterBody = new THREE.Mesh(createBeveledBox(0.096, 0.24, 0.084, 0.012), oxideArmorMat);
  emitterBody.position.set(0, 1.02, 0);
  emitterBody.castShadow = true;
  lance.add(emitterBody);

  const emitterRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.056, 0.048, 0.07, 12),
    obsidianMat
  );
  emitterRing.position.set(0, 1.15, 0);
  lance.add(emitterRing);

  // Swept crossguard emitter wings
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, -0.05);
  wingShape.lineTo(0.145, 0.09);
  wingShape.lineTo(0.115, 0.14);
  wingShape.lineTo(0.02, 0.06);
  wingShape.lineTo(0, 0.04);
  wingShape.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.022,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
  });
  wingGeo.center();

  for (const s of [-1, 1] as const) {
    const wing = new THREE.Mesh(wingGeo, obsidianMat);
    wing.position.set(s * 0.088, 1.09, 0);
    wing.scale.x = s;
    wing.castShadow = true;
    lance.add(wing);

    const wingEdge = new THREE.Mesh(createBeveledBox(0.016, 0.14, 0.014, 0.003), plasmaCoreMat);
    wingEdge.position.set(s * 0.11, 1.14, 0);
    wingEdge.rotation.z = -s * 0.52;
    lance.add(wingEdge);
  }

  // Sculpted serrated metal central spear spine flanked by incandescent plasma edge blades!
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, 0);
  bladeShape.lineTo(0.068, 0.12);
  bladeShape.lineTo(0.052, 0.26);
  bladeShape.lineTo(0.064, 0.34);
  bladeShape.lineTo(0.032, 0.54);
  bladeShape.lineTo(0, 0.72);
  bladeShape.lineTo(-0.032, 0.54);
  bladeShape.lineTo(-0.064, 0.34);
  bladeShape.lineTo(-0.052, 0.26);
  bladeShape.lineTo(-0.068, 0.12);
  bladeShape.closePath();

  const bladeCoreGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.016,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 2,
  });
  bladeCoreGeo.translate(0, 0, -0.008);

  const plasmaEdgeBlade = new THREE.Mesh(bladeCoreGeo, plasmaCoreMat);
  plasmaEdgeBlade.position.set(0, 1.16, 0);
  lance.add(plasmaEdgeBlade);

  // Machined obsidian center fuller rib inset over the glowing spearhead
  const spineGeo = new THREE.ConeGeometry(0.026, 0.52, 4);
  const bladeSpine = new THREE.Mesh(spineGeo, obsidianMat);
  bladeSpine.position.set(0, 1.4, 0);
  bladeSpine.scale.set(0.95, 1.0, 0.58);
  lance.add(bladeSpine);

  // Translucent superheated outer plasma aura sheath (flares fiercely during windup & combos!)
  const plasmaAura = new THREE.Mesh(bladeCoreGeo, plasmaSheathMat);
  plasmaAura.position.set(0, 1.155, 0);
  plasmaAura.scale.set(1.24, 1.04, 1.45);
  lance.add(plasmaAura);

  const lanceTip = new THREE.Object3D();
  lanceTip.position.set(0, 1.84, 0);
  lance.add(lanceTip);

  return { lance, lanceTip, plasmaAura };
}

export function buildGrappleLanceDuelistRig(
  enemyId: string,
  mats: Floor07EnemyMaterials,
  sharedTextures?: GrappleDuelistTextureSuite
): GrappleDuelistRigHandle {
  const root = new THREE.Group();
  const ownsTextures = !sharedTextures;
  const tex = sharedTextures ?? createGrappleDuelistTextures();

  // Dedicated high-key PBR materials (color 0xffffff so procedural albedos never darken!)
  const oxideArmorMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.oxideArmorAlbedo,
    bumpMap: tex.oxideArmorBump,
    bumpScale: 0.026,
    roughnessMap: tex.oxideArmorRoughness,
    roughness: 0.72,
    metalness: 0.36,
  });

  const obsidianMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.obsidianSteelAlbedo,
    bumpMap: tex.obsidianSteelBump,
    bumpScale: 0.02,
    roughness: 0.44,
    metalness: 0.78,
  });

  const undersuitMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex.carbonUndersuitAlbedo,
    bumpMap: tex.carbonUndersuitBump,
    bumpScale: 0.028,
    roughness: 0.86,
    metalness: 0.08,
  });

  const bronzeMat = new THREE.MeshStandardMaterial({
    color: 0xa68964,
    bumpMap: tex.obsidianSteelBump,
    bumpScale: 0.014,
    roughness: 0.42,
    metalness: 0.72,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xd0d8e0,
    roughness: 0.24,
    metalness: 0.9,
  });

  const visorMat = new THREE.MeshStandardMaterial({
    color: 0xffd27a,
    map: tex.amberOpticMap,
    emissive: 0xff8c1a,
    emissiveMap: tex.amberOpticMap,
    emissiveIntensity: 2.8,
    roughness: 0.15,
    metalness: 0.2,
  });

  const plasmaCoreMat = new THREE.MeshStandardMaterial({
    color: 0xffd8b0,
    map: tex.plasmaBladeMap,
    emissive: 0xff5a18,
    emissiveMap: tex.plasmaBladeMap,
    emissiveIntensity: 3.1,
    roughness: 0.2,
    metalness: 0.1,
  });

  const plasmaSheathMat = new THREE.MeshBasicMaterial({
    color: 0xff6220,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  const weakpointMat = mats.createWeakpointMaterial(0xff381c, 3.0);

  const boosterFlameMat = new THREE.MeshBasicMaterial({
    color: 0x3ae8ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  const cableCoreMat = new THREE.MeshBasicMaterial({
    color: 0x56f0ff,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  root.add(createEnemyContactShadow(0.62, mats.contactShadow));

  // === PELVIS & AGILE WAIST ===
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 0.97, 0);
  root.add(pelvis);

  // Sculpted athletic pelvis core (strictly bottom-to-top!)
  const pelvisCore = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: -0.1, rx: 0.115, rz: 0.088, squareness: 2.3 },
        { y: -0.02, rx: 0.152, rz: 0.106, squareness: 2.5 },
        { y: 0.075, rx: 0.146, rz: 0.104, squareness: 2.45 },
      ],
      18
    ),
    undersuitMat
  );
  pelvisCore.castShadow = true;
  pelvis.add(pelvisCore);

  // Contoured front groin armor codpiece + tactical gladiator belt
  const codpiece = new THREE.Mesh(createBeveledBox(0.135, 0.15, 0.082, 0.016), oxideArmorMat);
  codpiece.position.set(0, -0.025, -0.094);
  codpiece.rotation.x = 0.12;
  pelvis.add(codpiece);

  const battleBelt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.158, 0.164, 0.068, 18),
    obsidianMat
  );
  battleBelt.position.set(0, 0.042, 0);
  battleBelt.scale.set(1.0, 1.0, 0.74);
  pelvis.add(battleBelt);

  const beltBuckle = new THREE.Mesh(createBeveledBox(0.086, 0.056, 0.036, 0.008), bronzeMat);
  beltBuckle.position.set(0, 0.044, -0.126);
  pelvis.add(beltBuckle);

  // Articulated swept armored hip tassets (gladiator skirt plates flanking hips)
  for (const s of [-1, 1] as const) {
    const tasset = new THREE.Mesh(createBeveledBox(0.032, 0.21, 0.16, 0.009), oxideArmorMat);
    tasset.position.set(s * 0.184, -0.055, 0.008);
    tasset.rotation.z = s * 0.22;
    tasset.castShadow = true;
    pelvis.add(tasset);

    const tetherCanister = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 0.11, 10),
      bronzeMat
    );
    tetherCanister.position.set(s * 0.165, 0.04, 0.085);
    tetherCanister.rotation.z = s * 0.35;
    pelvis.add(tetherCanister);
  }

  // === LEGS ===
  const leftLeg = buildDuelistExoLeg(
    -1,
    oxideArmorMat,
    obsidianMat,
    undersuitMat,
    chromeMat,
    bronzeMat,
    visorMat
  );
  leftLeg.hip.position.set(-0.118, -0.01, 0);
  pelvis.add(leftLeg.hip);

  const rightLeg = buildDuelistExoLeg(
    1,
    oxideArmorMat,
    obsidianMat,
    undersuitMat,
    chromeMat,
    bronzeMat,
    visorMat
  );
  rightLeg.hip.position.set(0.118, -0.01, 0);
  pelvis.add(rightLeg.hip);

  // === ATHLETIC SCULPTED TORSO ===
  const torso = new THREE.Group();
  torso.position.set(0, 0.075, 0);
  pelvis.add(torso);

  // V-tapered carbon-kevlar compression torso (extends to y=-0.055 to seat seamlessly into pelvis!)
  const torsoCore = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: -0.055, rx: 0.144, rz: 0.104, squareness: 2.35 },
        { y: 0.02, rx: 0.148, rz: 0.108, squareness: 2.4 },
        { y: 0.13, rx: 0.172, rz: 0.122, frontScale: 1.06, squareness: 2.48 },
        { y: 0.27, rx: 0.21, rz: 0.138, frontScale: 1.09, squareness: 2.55 },
        { y: 0.4, rx: 0.228, rz: 0.144, frontScale: 1.07, squareness: 2.55 },
        { y: 0.5, rx: 0.184, rz: 0.118, squareness: 2.3 },
      ],
      22
    ),
    undersuitMat
  );
  torsoCore.castShadow = true;
  torso.add(torsoCore);

  // Interlocking segmented abdominal armor lames (eliminates bare waist notch & adds AAA cyborg layering!)
  for (let i = 0; i < 3; i++) {
    const yBase = 0.015 + i * 0.056;
    const abLame = new THREE.Mesh(
      createCurvedPanelGeometry(
        [
          { y: yBase, rx: 0.152 + i * 0.008, rz: 0.114 + i * 0.005, thickness: 0.016 },
          { y: yBase + 0.044, rx: 0.158 + i * 0.008, rz: 0.118 + i * 0.005, thickness: 0.018 },
        ],
        -Math.PI * 0.78,
        -Math.PI * 0.22,
        12
      ),
      i === 1 ? oxideArmorMat : obsidianMat
    );
    abLame.castShadow = true;
    torso.add(abLame);
  }

  // 45°-Chamfered Contoured Pectoral & Collar Cuirass Plates framing the Chest Tether Winch!
  for (const s of [-1, 1] as const) {
    const pecContour: Array<[number, number]> =
      s === 1
        ? [
            [0.24, 0.21],
            [0.98, 0.22],
            [1.12, 0.42],
            [0.72, 0.49],
            [0.2, 0.45],
            [0.34, 0.34],
          ]
        : [
            [-0.24, 0.21],
            [-0.34, 0.34],
            [-0.2, 0.45],
            [-0.72, 0.49],
            [-1.12, 0.42],
            [-0.98, 0.22],
          ];
    const pecPlate = new THREE.Mesh(
      createContouredArmorPlate(pecContour, mapDuelistTorsoSurface, 0.022, 0.18, 0.008, 3),
      oxideArmorMat
    );
    pecPlate.castShadow = true;
    torso.add(pecPlate);

    // Lower oblique ribcage obsidian plate
    const ribContour: Array<[number, number]> =
      s === 1
        ? [
            [0.32, 0.05],
            [1.06, 0.08],
            [1.04, 0.2],
            [0.28, 0.19],
          ]
        : [
            [-0.32, 0.05],
            [-0.28, 0.19],
            [-1.04, 0.2],
            [-1.06, 0.08],
          ];
    const ribPlate = new THREE.Mesh(
      createContouredArmorPlate(ribContour, mapDuelistTorsoSurface, 0.016, 0.16, 0.006, 2),
      obsidianMat
    );
    torso.add(ribPlate);
  }

  // Sculpted high armored collar gorget framing the neck
  const collarGorget = new THREE.Mesh(
    createCurvedPanelGeometry(
      [
        { y: 0.455, rx: 0.132, rz: 0.118, thickness: 0.024 },
        { y: 0.535, rx: 0.116, rz: 0.108, thickness: 0.02 },
      ],
      -Math.PI * 0.25,
      Math.PI * 1.25,
      18
    ),
    obsidianMat
  );
  collarGorget.castShadow = true;
  torso.add(collarGorget);

  // === ICONIC WEAKPOINT: CHEST MAGNETIC TETHER-WINCH DRUM ===
  const winchAssembly = new THREE.Group();
  winchAssembly.position.set(0, 0.31, -0.145);
  torso.add(winchAssembly);

  const winchBezel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.112, 0.118, 0.068, 16),
    obsidianMat
  );
  winchBezel.rotation.x = Math.PI / 2;
  winchAssembly.add(winchBezel);

  // Inner grooved bronze flywheel collar
  const winchFlywheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.082, 0.018, 10, 20),
    bronzeMat
  );
  winchFlywheel.position.set(0, 0, -0.028);
  winchAssembly.add(winchFlywheel);

  // Glowing molten-crimson magnetic dynamo core (WEAKPOINT TARGET!)
  const winchCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.072, 0.072, 0.085, 16),
    weakpointMat
  );
  winchCore.rotation.x = Math.PI / 2;
  winchCore.position.set(0, 0, -0.02);
  winchAssembly.add(winchCore);

  // Rotating dynamo inner fin cross inside the glowing core
  const winchRotor = new THREE.Group();
  winchRotor.position.set(0, 0, -0.065);
  winchAssembly.add(winchRotor);
  for (let i = 0; i < 3; i++) {
    const spoke = new THREE.Mesh(createBeveledBox(0.125, 0.016, 0.016, 0.003), obsidianMat);
    spoke.rotation.z = (i * Math.PI) / 3;
    winchRotor.add(spoke);
  }

  // 4 Articulated Hydraulic Cooling Petals that FLARE OPEN when superheated after Tether-Zip!
  const winchPetals: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2 + Math.PI / 4;
    const pivot = new THREE.Group();
    pivot.rotation.z = ang;
    pivot.position.set(Math.cos(ang) * 0.095, Math.sin(ang) * 0.095, -0.026);
    const petal = new THREE.Mesh(createBeveledBox(0.056, 0.032, 0.022, 0.004), oxideArmorMat);
    petal.position.set(-0.02, 0, -0.012);
    pivot.add(petal);
    winchAssembly.add(pivot);
    winchPetals.push(pivot);
  }

  // Braided steel tether guide conduit routing from chest winch toward left shoulder/launcher
  const winchConduit = new THREE.Mesh(
    createStrapTube(
      [
        new THREE.Vector3(-0.095, 0.31, -0.15),
        new THREE.Vector3(-0.18, 0.34, -0.11),
        new THREE.Vector3(-0.24, 0.37, -0.03),
      ],
      0.011,
      1,
      12
    ),
    chromeMat
  );
  torso.add(winchConduit);

  const weakpointAnchor = new THREE.Object3D();
  weakpointAnchor.position.set(0, 0.31, -0.2);
  torso.add(weakpointAnchor);

  // === DORSAL SPINE KEEL & SWEPT THRUSTER STABILIZER V-WINGS ===
  const dorsalPack = new THREE.Group();
  dorsalPack.position.set(0, 0.29, 0.135);
  torso.add(dorsalPack);

  const spineKeel = new THREE.Mesh(createBeveledBox(0.175, 0.34, 0.11, 0.02), obsidianMat);
  spineKeel.castShadow = true;
  dorsalPack.add(spineKeel);

  const spineCap = new THREE.Mesh(createBeveledBox(0.11, 0.25, 0.052, 0.012), oxideArmorMat);
  spineCap.position.set(0, 0.02, 0.052);
  dorsalPack.add(spineCap);

  // Swept wing blade shape for twin dorsal thruster stabilizers
  const stabWingShape = new THREE.Shape();
  stabWingShape.moveTo(0, -0.05);
  stabWingShape.lineTo(0.28, 0.24);
  stabWingShape.lineTo(0.24, 0.31);
  stabWingShape.lineTo(0.02, 0.12);
  stabWingShape.lineTo(0, 0.02);
  stabWingShape.closePath();
  const stabWingGeo = new THREE.ExtrudeGeometry(stabWingShape, {
    depth: 0.018,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
  });
  stabWingGeo.center();

  const dorsalWings: THREE.Group[] = [];
  const boosterFlames: THREE.Mesh[] = [];
  const boosterNozzles: THREE.Object3D[] = [];

  for (const s of [-1, 1] as const) {
    const wingPivot = new THREE.Group();
    wingPivot.position.set(s * 0.088, 0.09, 0.032);
    dorsalPack.add(wingPivot);

    const wingMesh = new THREE.Mesh(stabWingGeo, oxideArmorMat);
    wingMesh.position.set(s * 0.11, 0.1, 0.03);
    wingMesh.scale.x = s;
    wingMesh.rotation.y = -s * 0.28;
    wingMesh.castShadow = true;
    wingPivot.add(wingMesh);

    const wingTrim = new THREE.Mesh(createBeveledBox(0.018, 0.24, 0.022, 0.003), obsidianMat);
    wingTrim.position.set(s * 0.085, 0.09, 0.044);
    wingTrim.rotation.z = -s * 0.72;
    wingPivot.add(wingTrim);
    dorsalWings.push(wingPivot);

    // Angled dorsal vector thruster pod
    const nozzleHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.034, 0.044, 0.12, 12),
      obsidianMat
    );
    nozzleHousing.position.set(s * 0.082, -0.075, 0.048);
    nozzleHousing.rotation.x = 0.42;
    nozzleHousing.rotation.z = -s * 0.24;
    dorsalPack.add(nozzleHousing);

    const nozzleTip = new THREE.Object3D();
    nozzleTip.position.set(s * 0.094, -0.14, 0.078);
    dorsalPack.add(nozzleTip);
    boosterNozzles.push(nozzleTip);

    // Tapered jet-plume cone with base seated in nozzle & tip trailing DOWN-BACK (+Z, -Y)!
    const flameGeo = new THREE.ConeGeometry(0.036, 0.42, 10, 1, true);
    flameGeo.rotateX(Math.PI); // apex at -Y, open base at +Y
    flameGeo.translate(0, -0.21, 0); // pivot at nozzle mouth!
    const flameCone = new THREE.Mesh(flameGeo, boosterFlameMat);
    flameCone.position.set(s * 0.09, -0.125, 0.072);
    flameCone.rotation.x = 0.48;
    flameCone.rotation.z = -s * 0.22;
    dorsalPack.add(flameCone);
    boosterFlames.push(flameCone);
  }

  // === SWEPT PREDATOR-CREST DUELIST HELM ===
  const head = new THREE.Group();
  head.position.set(0, 0.555, -0.012);
  torso.add(head);

  // Ribbed armored neck (bottom-to-top!)
  const neck = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: -0.06, rx: 0.07, rz: 0.068, squareness: 2.1 },
        { y: 0.018, rx: 0.058, rz: 0.06, squareness: 2.1 },
      ],
      14
    ),
    undersuitMat
  );
  head.add(neck);

  // Sculpted aerodynamic rounded cranium dome (sleek valkyrie-predator proportions, bottom-to-top!)
  const helmDome = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: 0.005, rx: 0.082, rz: 0.104, offsetZ: -0.012, frontScale: 1.22, pinchFront: 0.018, squareness: 2.25 },
        { y: 0.068, rx: 0.102, rz: 0.128, offsetZ: -0.006, frontScale: 1.18, pinchFront: 0.026, squareness: 2.38 },
        { y: 0.132, rx: 0.104, rz: 0.134, offsetZ: 0.006, frontScale: 1.1, squareness: 2.2 },
        { y: 0.188, rx: 0.082, rz: 0.114, offsetZ: 0.018, squareness: 2.0 },
        { y: 0.218, rx: 0.032, rz: 0.058, offsetZ: 0.024, squareness: 2.0 },
      ],
      20
    ),
    obsidianMat
  );
  helmDome.castShadow = true;
  head.add(helmDome);

  // Sculpted angular brow cowl shading the twin molten-amber optic lenses
  const browCowl = new THREE.Mesh(
    createCurvedPanelGeometry(
      [
        { y: 0.106, rx: 0.106, rz: 0.134, offsetZ: -0.014, thickness: 0.022 },
        { y: 0.148, rx: 0.102, rz: 0.128, offsetZ: -0.008, thickness: 0.02 },
      ],
      -Math.PI * 0.88,
      -Math.PI * 0.12,
      14
    ),
    oxideArmorMat
  );
  browCowl.castShadow = true;
  head.add(browCowl);

  // Swept-back crimson-oxide hawk crest fin
  const crestShape = new THREE.Shape();
  crestShape.moveTo(-0.07, 0.0);
  crestShape.lineTo(0.14, 0.015);
  crestShape.lineTo(0.24, 0.095);
  crestShape.lineTo(0.08, 0.11);
  crestShape.lineTo(-0.1, 0.045);
  crestShape.closePath();
  const crestGeo = new THREE.ExtrudeGeometry(crestShape, {
    depth: 0.024,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.005,
    bevelSegments: 2,
  });
  crestGeo.center();
  const crest = new THREE.Mesh(crestGeo, oxideArmorMat);
  crest.rotation.y = Math.PI / 2;
  crest.position.set(0, 0.202, 0.05);
  crest.castShadow = true;
  head.add(crest);

  // Swept tapered cheek mandible guards + menacing angled molten-amber twin V-visor eyes!
  for (const s of [-1, 1] as const) {
    const cheek = new THREE.Mesh(createBeveledBox(0.032, 0.078, 0.132, 0.009), oxideArmorMat);
    cheek.position.set(s * 0.082, 0.056, -0.058);
    cheek.rotation.y = -s * 0.34;
    cheek.rotation.x = 0.22;
    head.add(cheek);

    // Sharp glowing amber V-chevron predator visor lens tucked beneath brow cowl
    const opticSlit = new THREE.Mesh(createBeveledBox(0.078, 0.022, 0.024, 0.004), visorMat);
    opticSlit.position.set(s * 0.046, 0.094, -0.132);
    opticSlit.rotation.y = -s * 0.38;
    opticSlit.rotation.z = s * 0.26;
    head.add(opticSlit);

    // Swept communications whip-antennae
    const earPod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.03, 10), bronzeMat);
    earPod.rotation.z = Math.PI / 2;
    earPod.position.set(s * 0.102, 0.105, 0.015);
    head.add(earPod);

    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.007, 0.17, 6), obsidianMat);
    antenna.position.set(s * 0.112, 0.185, 0.068);
    antenna.rotation.x = 0.56;
    antenna.rotation.z = -s * 0.14;
    head.add(antenna);
  }

  // Sculpted nose bridge & angled respirator jaw beak
  const browBridge = new THREE.Mesh(createBeveledBox(0.03, 0.062, 0.042, 0.006), obsidianMat);
  browBridge.position.set(0, 0.094, -0.142);
  browBridge.rotation.x = -0.24;
  head.add(browBridge);

  const chinVent = new THREE.Mesh(createBeveledBox(0.072, 0.056, 0.064, 0.01), bronzeMat);
  chinVent.position.set(0, 0.032, -0.118);
  chinVent.rotation.x = 0.28;
  head.add(chinVent);

  const visorAnchor = new THREE.Object3D();
  visorAnchor.position.set(0, 0.095, -0.155);
  head.add(visorAnchor);

  // === TORSO-STABILIZED ASYMMETRIC PAULDRONS (never twist sideways during swings!) ===
  // Left Assault Pauldron: Heavy layered horned crimson-oxide gladiator guard
  const leftPauldronMount = new THREE.Group();
  leftPauldronMount.position.set(-0.238, 0.435, 0.0);
  torso.add(leftPauldronMount);

  const leftPauldronUpper = new THREE.Mesh(
    createCurvedPanelGeometry(
      [
        { y: -0.095, rx: 0.118, rz: 0.122, thickness: 0.024 },
        { y: 0.01, rx: 0.128, rz: 0.132, thickness: 0.028 },
        { y: 0.092, rx: 0.096, rz: 0.102, thickness: 0.022 },
      ],
      Math.PI * 0.45,
      Math.PI * 1.55,
      14
    ),
    oxideArmorMat
  );
  leftPauldronUpper.position.set(0.02, 0.01, 0);
  leftPauldronUpper.rotation.z = 0.22;
  leftPauldronUpper.castShadow = true;
  leftPauldronMount.add(leftPauldronUpper);

  // Flush-mounted titanium collar ridge + swept gladiator horn fin growing organically from pauldron
  const hornBase = new THREE.Mesh(createBeveledBox(0.088, 0.042, 0.135, 0.008), obsidianMat);
  hornBase.position.set(-0.048, 0.088, 0);
  hornBase.rotation.z = 0.28;
  leftPauldronMount.add(hornBase);

  const hornShape = new THREE.Shape();
  hornShape.moveTo(0.02, -0.01);
  hornShape.lineTo(-0.11, 0.095);
  hornShape.lineTo(-0.055, 0.14);
  hornShape.lineTo(0.045, 0.045);
  hornShape.closePath();
  const hornGeo = new THREE.ExtrudeGeometry(hornShape, {
    depth: 0.026,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.005,
    bevelSegments: 2,
  });
  hornGeo.center();
  const leftPauldronHorn = new THREE.Mesh(hornGeo, obsidianMat);
  leftPauldronHorn.position.set(-0.072, 0.128, 0);
  leftPauldronHorn.castShadow = true;
  leftPauldronMount.add(leftPauldronHorn);

  // Right Duelist Pauldron: Sleek agile layered obsidian shoulder guard for rapid lance swings
  const rightPauldronMount = new THREE.Group();
  rightPauldronMount.position.set(0.232, 0.43, 0.0);
  torso.add(rightPauldronMount);

  const rightPauldronShell = new THREE.Mesh(
    createCurvedPanelGeometry(
      [
        { y: -0.078, rx: 0.096, rz: 0.102, thickness: 0.02 },
        { y: 0.01, rx: 0.106, rz: 0.11, thickness: 0.024 },
        { y: 0.072, rx: 0.082, rz: 0.088, thickness: 0.018 },
      ],
      -Math.PI * 0.55,
      Math.PI * 0.55,
      14
    ),
    obsidianMat
  );
  rightPauldronShell.position.set(-0.015, 0.01, 0);
  rightPauldronShell.rotation.z = -0.18;
  rightPauldronShell.castShadow = true;
  rightPauldronMount.add(rightPauldronShell);

  const rightPauldronRidge = new THREE.Mesh(createBeveledBox(0.048, 0.036, 0.165, 0.007), oxideArmorMat);
  rightPauldronRidge.position.set(0.042, 0.064, 0);
  rightPauldronRidge.rotation.z = -0.35;
  rightPauldronMount.add(rightPauldronRidge);

  // === LEFT ARM: 3-PRONG MAGNETIC GRAPPLE-CLAW LAUNCHER + LIVE ANIMATED TETHER CABLE ===
  const leftShoulder = new THREE.Group();
  leftShoulder.position.set(-0.245, 0.415, 0);
  torso.add(leftShoulder);

  // Sculpted upper arm (strictly bottom-to-top Y order!)
  const leftBicep = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: -0.28, rx: 0.044, rz: 0.048, squareness: 2.1 },
        { y: -0.14, rx: 0.056, rz: 0.06, squareness: 2.2 },
        { y: 0.02, rx: 0.058, rz: 0.062, squareness: 2.15 },
      ],
      14
    ),
    undersuitMat
  );
  leftBicep.castShadow = true;
  leftShoulder.add(leftBicep);

  const leftElbow = new THREE.Group();
  leftElbow.position.set(0, -0.28, 0);
  leftShoulder.add(leftElbow);

  const leftElbowCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.048, 12, 10),
    obsidianMat
  );
  leftElbow.add(leftElbowCap);

  // Sculpted armored left vambrace (bottom-to-top!)
  const leftForearm = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: -0.27, rx: 0.046, rz: 0.052, squareness: 2.25 },
        { y: -0.14, rx: 0.058, rz: 0.064, squareness: 2.35 },
        { y: 0.0, rx: 0.052, rz: 0.056, squareness: 2.2 },
      ],
      14
    ),
    obsidianMat
  );
  leftForearm.castShadow = true;
  leftElbow.add(leftForearm);

  // Left sculpted 5-finger gloved hand
  const leftHand = createSculptedHand(-1, undersuitMat, obsidianMat, undersuitMat);
  leftHand.position.set(0, -0.265, 0);
  leftElbow.add(leftHand);

  // Forearm-mounted Magnetic Grapple-Claw Launcher Assembly!
  const grapplePod = new THREE.Group();
  grapplePod.position.set(-0.028, -0.16, -0.058);
  leftElbow.add(grapplePod);

  const podHousing = new THREE.Mesh(createBeveledBox(0.095, 0.24, 0.09, 0.012), oxideArmorMat);
  podHousing.castShadow = true;
  grapplePod.add(podHousing);

  const podSpool = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.11, 12), bronzeMat);
  podSpool.rotation.z = Math.PI / 2;
  podSpool.position.set(0, 0.02, -0.02);
  grapplePod.add(podSpool);

  const emitterRingLeft = new THREE.Mesh(
    new THREE.TorusGeometry(0.038, 0.008, 8, 16),
    cableCoreMat
  );
  emitterRingLeft.rotation.x = Math.PI / 2;
  emitterRingLeft.position.set(0, -0.125, 0);
  grapplePod.add(emitterRingLeft);

  // 3 Articulated Barbed Grapple Prongs mounted around launcher muzzle
  const grappleProngs: THREE.Group[] = [];
  for (let i = 0; i < 3; i++) {
    const ang = (i * Math.PI * 2) / 3;
    const prongPivot = new THREE.Group();
    prongPivot.position.set(Math.cos(ang) * 0.038, -0.12, Math.sin(ang) * 0.038);
    prongPivot.rotation.y = -ang;

    const prongBlade = new THREE.Mesh(createBeveledBox(0.018, 0.115, 0.024, 0.004), chromeMat);
    prongBlade.position.set(0.014, -0.055, 0);
    prongBlade.rotation.z = 0.24;
    prongPivot.add(prongBlade);

    grapplePod.add(prongPivot);
    grappleProngs.push(prongPivot);
  }

  const grappleMuzzle = new THREE.Object3D();
  grappleMuzzle.position.set(0, -0.14, 0);
  grapplePod.add(grappleMuzzle);

  // Live Animated Magnetic Grapple Tether Cable + Fired Barbed Anchor Head (extends along -Y of grapplePod!)
  const tetherCableGroup = new THREE.Group();
  tetherCableGroup.position.set(0, -0.14, 0);
  tetherCableGroup.visible = false;
  grapplePod.add(tetherCableGroup);

  const cableCoreMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.011, 1, 8),
    cableCoreMat
  );
  cableCoreMesh.position.set(0, -0.5, 0);
  tetherCableGroup.add(cableCoreMesh);

  const cableAuraMat = new THREE.MeshBasicMaterial({
    color: 0xff5a24,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const cableAuraMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.022, 1, 8, 1, true),
    cableAuraMat
  );
  cableAuraMesh.position.set(0, -0.5, 0);
  tetherCableGroup.add(cableAuraMesh);

  const anchorHead = new THREE.Group();
  const anchorTip = new THREE.Mesh(new THREE.ConeGeometry(0.044, 0.16, 6), chromeMat);
  anchorTip.rotation.x = Math.PI;
  anchorHead.add(anchorTip);
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const barb = new THREE.Mesh(createBeveledBox(0.016, 0.11, 0.02, 0.003), oxideArmorMat);
    barb.position.set(Math.cos(a) * 0.048, 0.04, Math.sin(a) * 0.048);
    barb.rotation.z = -Math.cos(a) * 0.55;
    barb.rotation.x = Math.sin(a) * 0.55;
    anchorHead.add(barb);
  }
  tetherCableGroup.add(anchorHead);

  // === RIGHT ARM + 2.35m THERMITE-PLASMA SHOCK-LANCE ===
  const rightShoulder = new THREE.Group();
  rightShoulder.position.set(0.245, 0.415, 0);
  torso.add(rightShoulder);

  // Sculpted upper arm (bottom-to-top!)
  const rightBicep = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: -0.28, rx: 0.046, rz: 0.05, squareness: 2.12 },
        { y: -0.14, rx: 0.058, rz: 0.062, squareness: 2.22 },
        { y: 0.02, rx: 0.06, rz: 0.064, squareness: 2.18 },
      ],
      14
    ),
    undersuitMat
  );
  rightBicep.castShadow = true;
  rightShoulder.add(rightBicep);

  const rightElbow = new THREE.Group();
  rightElbow.position.set(0, -0.28, 0);
  rightShoulder.add(rightElbow);

  const rightElbowCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.048, 12, 10),
    obsidianMat
  );
  rightElbow.add(rightElbowCap);

  // Sculpted crimson-oxide right duelist vambrace (bottom-to-top!)
  const rightForearm = new THREE.Mesh(
    createLoftedAnatomy(
      [
        { y: -0.27, rx: 0.048, rz: 0.052, squareness: 2.25 },
        { y: -0.14, rx: 0.06, rz: 0.066, squareness: 2.38 },
        { y: 0.0, rx: 0.054, rz: 0.058, squareness: 2.2 },
      ],
      14
    ),
    oxideArmorMat
  );
  rightForearm.castShadow = true;
  rightElbow.add(rightForearm);

  const rightVambraceFin = new THREE.Mesh(createBeveledBox(0.024, 0.22, 0.048, 0.005), obsidianMat);
  rightVambraceFin.position.set(0.054, -0.135, 0.02);
  rightElbow.add(rightVambraceFin);

  const rightWrist = new THREE.Group();
  rightWrist.position.set(0, -0.265, 0);
  rightElbow.add(rightWrist);

  const rightHand = createSculptedHand(1, undersuitMat, obsidianMat, undersuitMat);
  rightWrist.add(rightHand);

  // Mount 2.35m Thermite-Plasma Shock-Lance securely into the clenched right armored fist!
  // Negative X rotation aligns +Y plasma spearhead UPWARD & FORWARD (-Z) instead of into the floor!
  const { lance, lanceTip, plasmaAura } = buildThermitePlasmaLance(
    oxideArmorMat,
    obsidianMat,
    bronzeMat,
    chromeMat,
    plasmaCoreMat,
    plasmaSheathMat
  );
  lance.position.set(-0.008, -0.055, 0.015);
  lance.rotation.set(-Math.PI * 0.56, 0, 0);
  rightWrist.add(lance);

  // === HITBOXES ===
  const bodyHitbox = createEnemyHitboxMesh(enemyId, 'body', new THREE.BoxGeometry(0.64, 1.46, 0.46));
  bodyHitbox.position.set(0, 0.82, 0);
  root.add(bodyHitbox);

  const headHitbox = createEnemyHitboxMesh(enemyId, 'head', new THREE.BoxGeometry(0.28, 0.3, 0.32));
  headHitbox.position.set(0, 0.11, -0.01);
  head.add(headHitbox);

  const wpHitbox = createEnemyHitboxMesh(
    enemyId,
    'weakpoint',
    new THREE.BoxGeometry(0.3, 0.3, 0.26),
    'tether_winch'
  );
  wpHitbox.position.set(0, 0.31, -0.17);
  torso.add(wpHitbox);

  let stridePhase = 0;

  return {
    root,
    hitboxes: [wpHitbox, headHitbox, bodyHitbox],
    weakpointMaterials: [weakpointMat],
    armorFlashMaterials: [oxideArmorMat],
    setTetherCable: (active: boolean, length: number, tensionRatio: number) => {
      tetherCableGroup.visible = active && length > 0.12;
      if (!tetherCableGroup.visible) return;
      const clampedLen = Math.max(0.2, Math.min(24, length));
      const pulse = 1 + Math.sin(performance.now() * 0.04) * 0.18;
      cableCoreMesh.scale.set(pulse, clampedLen, pulse);
      cableCoreMesh.position.set(0, -clampedLen * 0.5, 0);
      cableAuraMesh.scale.set(1 + tensionRatio * 0.65, clampedLen, 1 + tensionRatio * 0.65);
      cableAuraMesh.position.set(0, -clampedLen * 0.5, 0);
      anchorHead.position.set(0, -clampedLen, 0);
      cableCoreMat.color.setHex(tensionRatio > 0.65 ? 0xff7038 : 0x4ef0ff);
      cableAuraMat.opacity = 0.26 + tensionRatio * 0.42;
    },
    getMuzzleWorldPos: (out) => {
      lanceTip.getWorldPosition(out);
      return out;
    },
    getLanceTipWorldPos: (out) => {
      lanceTip.getWorldPosition(out);
      return out;
    },
    getGrappleMuzzleWorldPos: (out) => {
      grappleMuzzle.getWorldPosition(out);
      return out;
    },
    getVisorWorldPos: (out) => {
      visorAnchor.getWorldPosition(out);
      return out;
    },
    getBoosterNozzleWorldPos: (side, out) => {
      boosterNozzles[side === -1 ? 0 : 1].getWorldPosition(out);
      return out;
    },
    getWeakpointWorldPos: (out) => {
      weakpointAnchor.getWorldPosition(out);
      return out;
    },
    updateAnimation: (input: EnemyAnimationInput) => {
      const booster = input.boosterIntensity ?? 0;

      // Animate dorsal thruster plasma plumes & dynamic V-wing flare
      boosterFlameMat.opacity = booster > 0.04 ? Math.min(0.92, booster * 0.85) : 0;
      const flamePulse = 0.85 + Math.sin(input.elapsed * 42) * 0.22;
      for (let i = 0; i < boosterFlames.length; i++) {
        boosterFlames[i].visible = booster > 0.04;
        boosterFlames[i].scale.set(
          0.85 + booster * 0.45,
          (0.65 + booster * 0.95) * flamePulse,
          0.85 + booster * 0.45
        );
        const s = i === 0 ? -1 : 1;
        dorsalWings[i].rotation.z = s * (0.04 + booster * 0.34);
      }

      // Spin chest tether winch rotor & flare hydraulic cooling petals when superheated/exposed!
      if (!input.weakpointBroken) {
        const spinSpeed = input.weakpointExposed ? 12.0 : booster > 0.1 ? 18.0 : 2.6;
        winchRotor.rotation.z += input.dt * spinSpeed;
      }
      const petalOpen = input.weakpointBroken ? 0.65 : input.weakpointExposed ? 0.52 : 0.06;
      for (let i = 0; i < winchPetals.length; i++) {
        winchPetals[i].rotation.y = petalOpen;
      }

      // Superheated plasma spearhead intensity flare during windup/attacks
      const plasmaHeat =
        input.behavior === 'attack' ? 4.4 : input.behavior === 'windup' ? 3.8 : 2.8;
      plasmaCoreMat.emissiveIntensity = plasmaHeat + Math.sin(input.elapsed * 16) * 0.35;
      plasmaSheathMat.opacity =
        input.behavior === 'attack' ? 0.48 : input.behavior === 'windup' ? 0.38 : 0.22;

      if (input.behavior === 'dead') {
        const p = Math.min(1, input.deadProgress);
        pelvis.position.y = 0.97 * (1 - p * 0.84);
        pelvis.rotation.x = p * 1.48;
        pelvis.rotation.z = p * 0.24;
        torso.rotation.set(0.15 * p, 0, 0);
        tetherCableGroup.visible = false;
        return;
      }

      const speed = Math.min(1.5, input.speedRatio);
      stridePhase += input.dt * (3.2 + speed * 9.2);
      const stride = Math.sin(stridePhase) * 0.72 * Math.min(1, speed);

      // Default neutral athletic stance resets
      pelvis.position.y =
        0.97 + Math.abs(Math.cos(stridePhase)) * 0.055 * Math.min(1, speed) + input.airborneHeight;
      pelvis.rotation.set(0, 0, -input.localMoveX * 0.22);
      head.rotation.set(0, 0, 0);
      leftWristReset();
      rightWrist.rotation.set(0, 0, 0);
      lance.rotation.set(-Math.PI * 0.56, 0, 0);

      function leftWristReset() {
        for (let i = 0; i < grappleProngs.length; i++) {
          grappleProngs[i].rotation.z = 0;
        }
      }

      // Grounded sprint leg stride (knee bends naturally backward via negative X!)
      if (input.airborneHeight > 0.14) {
        // Tuck legs dynamically while airborne (Tether-Zip or Vault Shock-Slam!)
        leftLeg.hip.rotation.set(0.52, 0, -0.08);
        leftLeg.knee.rotation.set(-0.95, 0, 0);
        leftLeg.ankle.rotation.set(0.32, 0, 0);
        rightLeg.hip.rotation.set(-0.34, 0, 0.08);
        rightLeg.knee.rotation.set(-0.62, 0, 0);
        rightLeg.ankle.rotation.set(0.28, 0, 0);
      } else {
        leftLeg.hip.rotation.set(stride, 0, -0.04);
        leftLeg.knee.rotation.set(-Math.max(0, -stride * 1.18) - 0.1, 0, 0);
        leftLeg.ankle.rotation.set(Math.max(0, -stride * 0.35), 0, 0);

        rightLeg.hip.rotation.set(-stride, 0, 0.04);
        rightLeg.knee.rotation.set(-Math.max(0, stride * 1.18) - 0.1, 0, 0);
        rightLeg.ankle.rotation.set(Math.max(0, stride * 0.35), 0, 0);
      }

      if (input.staggerTimer > 0) {
        const wobble = Math.sin(input.elapsed * 14) * 0.24;
        pelvis.position.y = 0.89;
        torso.rotation.set(-0.34, wobble, wobble * 0.35);
        head.rotation.set(-0.22, -wobble * 0.8, 0);
        leftShoulder.rotation.set(-0.42, 0, -0.58);
        leftElbow.rotation.set(-0.48, 0, 0);
        rightShoulder.rotation.set(-0.28, 0, 0.56);
        rightElbow.rotation.set(-0.42, 0, 0);
        leftPauldronMount.rotation.z = 0.2;
        rightPauldronMount.rotation.z = -0.2;
        return;
      }

      const v = input.attackVariant;
      const p = THREE.MathUtils.clamp(input.attackProgress, 0, 1);

      if (v === 2 && (input.behavior === 'windup' || input.behavior === 'attack')) {
        // === VARIANT 2: TETHER-ZIP LUNGE (Left Grapple Claw dead-horizontal forward, Plasma-Lance couched for joust impale!) ===
        const thrust = input.behavior === 'windup' ? p : 1;
        pelvis.rotation.x = 0.18 * thrust;
        torso.rotation.set(0.24 * thrust, -0.34 * thrust, 0);
        head.rotation.set(-0.22 * thrust, 0.32 * thrust, 0);

        // Total X rotation = 0.18 + 0.24 + 1.05 + 0.10 = +1.57 rad (+90°) -> Tether Cable shoots DEAD-STRAIGHT FORWARD (-Z)!
        leftShoulder.rotation.set(1.05 * thrust, 0.28 * thrust, -0.06);
        leftElbow.rotation.set(0.1, 0, 0);
        for (let i = 0; i < grappleProngs.length; i++) {
          grappleProngs[i].rotation.z = -0.45 * thrust;
        }

        // Right Plasma-Lance couched horizontally at hip with glowing spearhead pointing DEAD-AHEAD (-Z)!
        rightShoulder.rotation.set(-0.32, 0.24, 0.2);
        rightElbow.rotation.set(0.22, 0, 0);
        lance.rotation.set(-Math.PI * 0.62, 0, 0);
      } else if (v === 3 && (input.behavior === 'windup' || input.behavior === 'attack')) {
        // === VARIANT 3: VAULT SHOCK-SLAM (Airborne overhead spearhead poised to impale floor!) ===
        if (input.behavior === 'windup') {
          torso.rotation.set(-0.18 * p, -0.32 * p, 0);
          head.rotation.set(0.16 * p, 0.28 * p, 0);
          rightShoulder.rotation.set(2.35 * p, 0, 0.26);
          rightElbow.rotation.set(0.35 * p, 0, 0);
          // Total X = -0.18 + 2.35 + 0.35 - 3.65 = -1.13 rad -> glowing spearhead poised high overhead angled down-forward!
          lance.rotation.set(-Math.PI * 1.15, 0, 0);
          leftShoulder.rotation.set(0.95 * p, 0, -0.42 * p);
          leftElbow.rotation.set(0.58, 0, 0);
        } else {
          const slam = Math.min(1, p * 1.45);
          pelvis.position.y = Math.max(0.76, 0.97 + input.airborneHeight - slam * 0.18);
          torso.rotation.set(-0.18 + slam * 0.62, -0.3 + slam * 0.62, 0);
          head.rotation.set(-0.18 * slam, -0.24 * slam, 0);
          rightShoulder.rotation.set(2.35 - slam * 1.85, 0, 0.26 - slam * 0.32);
          rightElbow.rotation.set(0.42, 0, 0);
          lance.rotation.set(-Math.PI * (1.15 - slam * 0.32), 0, 0);
          leftShoulder.rotation.set(0.65 - slam * 1.15, 0, -0.52);
          leftElbow.rotation.set(0.72, 0, 0);
        }
      } else if (v === 4 && (input.behavior === 'windup' || input.behavior === 'attack')) {
        // === VARIANT 4: PLASMA ARC WAVE (Planted horizontal crescent whip-slash!) ===
        if (input.behavior === 'windup') {
          torso.rotation.set(0.14, -0.92 * p, 0);
          head.rotation.set(-0.08, 0.85 * p, 0);
          rightShoulder.rotation.set(0.38 * p, -0.55 * p, 0.92 * p);
          rightElbow.rotation.set(0.36, 0, 0);
          lance.rotation.set(-Math.PI * 0.64, 0, -0.28 * p);
          leftShoulder.rotation.set(0.82 * p, 0.32, -0.3);
          leftElbow.rotation.set(0.78, 0, 0);
        } else {
          const sweep = Math.sin(Math.min(1, p * 1.25) * Math.PI * 0.5);
          torso.rotation.set(0.22, -0.92 + sweep * 1.85, 0);
          head.rotation.set(-0.1, 0.85 - sweep * 1.6, 0);
          rightShoulder.rotation.set(0.38 + sweep * 0.65, -0.55 + sweep * 1.35, 0.92 - sweep * 1.38);
          rightElbow.rotation.set(0.32, 0, 0);
          lance.rotation.set(-Math.PI * 0.68, 0, -0.28 + sweep * 0.68);
          leftShoulder.rotation.set(-0.48, 0, -0.55);
          leftElbow.rotation.set(0.62, 0, 0);
        }
      } else if (v === 5 && input.behavior === 'attack') {
        // === VARIANT 5: EVASIVE SIDESTEP FEINT (Low aerodynamic lateral thruster dash!) ===
        const lean = Math.sign(input.localMoveX || 1);
        pelvis.position.y = 0.86 + input.airborneHeight;
        pelvis.rotation.z = -lean * 0.42;
        torso.rotation.set(0.32, lean * 0.32, -lean * 0.14);
        head.rotation.set(-0.22, -lean * 0.28, lean * 0.24);
        leftShoulder.rotation.set(0.55, 0, -0.42);
        leftElbow.rotation.set(0.95, 0, 0);
        rightShoulder.rotation.set(-0.42, 0, 0.44);
        rightElbow.rotation.set(0.65, 0, 0);
        lance.rotation.set(-Math.PI * 0.6, 0, 0);
      } else if (input.behavior === 'windup') {
        // === VARIANT 0/1: 2-HIT PLASMA-LANCE FLURRY COMBO WINDUP ===
        const reverse = v === 1;
        torso.rotation.set(0.18, (reverse ? 0.78 : -0.78) * p, 0);
        head.rotation.set(-0.1, (reverse ? -0.68 : 0.68) * p, 0);
        rightShoulder.rotation.set(
          reverse ? 0.62 * p : 1.45 * p,
          reverse ? 0.68 * p : -0.35 * p,
          reverse ? -0.38 * p : 0.52 * p
        );
        rightElbow.rotation.set(0.45, 0, 0);
        lance.rotation.set(-Math.PI * 0.62, 0, 0);
        leftShoulder.rotation.set(0.88 * p, 0.25, -0.25);
        leftElbow.rotation.set(0.76, 0, 0);
      } else if (input.behavior === 'attack') {
        // === VARIANT 0/1: 2-HIT PLASMA-LANCE FLURRY COMBO CLEAVE / REAP ===
        const reverse = v === 1;
        const swing = Math.sin(Math.min(1, p * 1.15) * Math.PI * 0.5);
        torso.rotation.set(0.28, reverse ? 0.78 - swing * 1.65 : -0.78 + swing * 1.68, 0);
        head.rotation.set(-0.14, reverse ? -0.65 + swing * 1.35 : 0.65 - swing * 1.38, 0);
        rightShoulder.rotation.set(
          reverse ? 0.62 + swing * 0.38 : 1.45 - swing * 1.25,
          reverse ? 0.68 - swing * 1.35 : -0.35 + swing * 1.1,
          reverse ? -0.38 + swing * 1.15 : 0.52 - swing * 0.95
        );
        rightElbow.rotation.set(0.32, 0, 0);
        lance.rotation.set(-Math.PI * (reverse ? 0.66 : 0.62), 0, reverse ? 0.25 : -0.18);
        leftShoulder.rotation.set(-0.32, 0, -0.45);
        leftElbow.rotation.set(0.82, 0, 0);
      } else {
        // === PREDATORY DUELIST COMBAT STANCE / HIGH-SPEED PURSUIT ===
        const breathe = Math.sin(input.elapsed * 3.1) * 0.025;
        torso.rotation.set(0.14 + speed * 0.12, -0.22, 0);
        head.rotation.set(-0.1 - speed * 0.08, 0.22, 0);

        // Left grapple-claw raised in forward-ready duelist guard
        leftShoulder.rotation.set(0.56 + Math.sin(stridePhase) * 0.22, 0.14, -0.16);
        leftElbow.rotation.set(0.88 + breathe, 0, 0);

        // Right Plasma-Lance held heroically forward & upward with incandescent spearhead towering above!
        rightShoulder.rotation.set(0.22 - Math.sin(stridePhase) * 0.16, -0.16, 0.22);
        rightElbow.rotation.set(0.64 - breathe, 0, 0);
        lance.rotation.set(-Math.PI * 0.42, 0, -0.1);
      }

      // Subtle torso-stabilized pauldron elevation tracking (zero unnatural twisting!)
      leftPauldronMount.rotation.z = 0.08 + Math.max(0, leftShoulder.rotation.x) * 0.14;
      rightPauldronMount.rotation.z = -0.08 - Math.max(0, rightShoulder.rotation.x) * 0.14;
    },
    dispose: () => {
      root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
      });
      oxideArmorMat.dispose();
      obsidianMat.dispose();
      undersuitMat.dispose();
      bronzeMat.dispose();
      chromeMat.dispose();
      visorMat.dispose();
      plasmaCoreMat.dispose();
      plasmaSheathMat.dispose();
      boosterFlameMat.dispose();
      cableCoreMat.dispose();
      cableAuraMat.dispose();
      if (ownsTextures) tex.dispose();
    },
  };
}
