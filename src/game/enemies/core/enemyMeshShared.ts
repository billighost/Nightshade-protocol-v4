import * as THREE from 'three';
import { createBeveledBox, createLoftedAnatomy } from '../../core/sculptUtils';
import type { EnemyHitZone } from './types';

import { createEnemyPbrTextureSuite } from './enemyTextures';

export interface Floor08EnemyMaterials {
  armorDark: THREE.MeshStandardMaterial;
  armorSlate: THREE.MeshStandardMaterial;
  armorHeavy: THREE.MeshStandardMaterial;
  armorCrimsonAccent: THREE.MeshStandardMaterial;
  armorGoldTrim: THREE.MeshStandardMaterial;
  undersuit: THREE.MeshStandardMaterial;
  titaniumJoint: THREE.MeshStandardMaterial;
  weaponMetal: THREE.MeshStandardMaterial;
  damascusSteel: THREE.MeshStandardMaterial;
  hiltWrap: THREE.MeshStandardMaterial;
  visorCrimson: THREE.MeshStandardMaterial;
  visorAmber: THREE.MeshStandardMaterial;
  visorCyan: THREE.MeshStandardMaterial;
  energyShield: THREE.MeshPhysicalMaterial;
  energyBlade: THREE.MeshStandardMaterial;
  contactShadow: THREE.MeshBasicMaterial;
  createWeakpointMaterial: (colorHex: number, emissiveIntensity?: number) => THREE.MeshStandardMaterial;
  dispose: () => void;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
    grad.addColorStop(0, 'rgba(0,0,0,0.62)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.3)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}

/**
 * Shared Floor 08 Black-Ops Cyber Vanguard material registry.
 * Uses weathered matte ceramic-carbon PBR maps (albedo + bump + roughness), ribbed matte synth-muscle,
 * brushed titanium sub-frames, folded Damascus steel, and diamond samurai hilt wrap.
 */
export function createFloor08EnemyMaterials(): Floor08EnemyMaterials {
  const pbr = createEnemyPbrTextureSuite();
  const shadowTex = createContactShadowTexture();
  const owned: THREE.Material[] = [];

  const track = <T extends THREE.Material>(m: T): T => {
    owned.push(m);
    return m;
  };

  const armorDark = track(
    new THREE.MeshStandardMaterial({
      color: 0xc2cbd6,
      map: pbr.armorAlbedo,
      bumpMap: pbr.armorBump,
      bumpScale: 0.018,
      roughnessMap: pbr.armorRoughness,
      roughness: 0.84,
      metalness: 0.32,
    })
  );

  const armorSlate = track(
    new THREE.MeshStandardMaterial({
      color: 0xd8e2ee,
      map: pbr.armorAlbedo,
      bumpMap: pbr.armorBump,
      bumpScale: 0.016,
      roughnessMap: pbr.armorRoughness,
      roughness: 0.76,
      metalness: 0.42,
    })
  );

  const armorHeavy = track(
    new THREE.MeshStandardMaterial({
      color: 0xaab4c2,
      map: pbr.armorAlbedo,
      bumpMap: pbr.armorBump,
      bumpScale: 0.022,
      roughnessMap: pbr.armorRoughness,
      roughness: 0.82,
      metalness: 0.48,
    })
  );

  const armorCrimsonAccent = track(
    new THREE.MeshStandardMaterial({
      color: 0x8f1d28,
      bumpMap: pbr.armorBump,
      bumpScale: 0.012,
      roughnessMap: pbr.armorRoughness,
      roughness: 0.62,
      metalness: 0.28,
    })
  );

  const armorGoldTrim = track(
    new THREE.MeshStandardMaterial({
      color: 0xc89238,
      bumpMap: pbr.armorBump,
      bumpScale: 0.008,
      roughness: 0.42,
      metalness: 0.76,
    })
  );

  const undersuit = track(
    new THREE.MeshStandardMaterial({
      color: 0xbac4d0,
      map: pbr.undersuitAlbedo,
      bumpMap: pbr.undersuitBump,
      bumpScale: 0.024,
      roughness: 0.9,
      metalness: 0.08,
    })
  );

  const titaniumJoint = track(
    new THREE.MeshStandardMaterial({
      color: 0x707e90,
      bumpMap: pbr.armorBump,
      bumpScale: 0.01,
      roughness: 0.36,
      metalness: 0.82,
    })
  );

  const weaponMetal = track(
    new THREE.MeshStandardMaterial({
      color: 0x3b4452,
      map: pbr.damascusAlbedo,
      bumpMap: pbr.damascusBump,
      bumpScale: 0.012,
      roughness: 0.44,
      metalness: 0.78,
    })
  );

  const damascusSteel = track(
    new THREE.MeshStandardMaterial({
      color: 0x9aa8ba,
      map: pbr.damascusAlbedo,
      bumpMap: pbr.damascusBump,
      bumpScale: 0.014,
      roughness: 0.28,
      metalness: 0.9,
    })
  );

  const hiltWrap = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: pbr.hiltWrapAlbedo,
      bumpMap: pbr.hiltWrapBump,
      bumpScale: 0.028,
      roughness: 0.92,
      metalness: 0.05,
    })
  );

  const visorCrimson = track(
    new THREE.MeshStandardMaterial({
      color: 0xff3b52,
      emissive: 0xff1e3c,
      emissiveIntensity: 2.4,
      roughness: 0.16,
      metalness: 0.2,
    })
  );

  const visorAmber = track(
    new THREE.MeshStandardMaterial({
      color: 0xffb84d,
      emissive: 0xff9214,
      emissiveIntensity: 2.3,
      roughness: 0.16,
      metalness: 0.2,
    })
  );

  const visorCyan = track(
    new THREE.MeshStandardMaterial({
      color: 0x38e8ff,
      emissive: 0x14d4ff,
      emissiveIntensity: 2.2,
      roughness: 0.16,
      metalness: 0.2,
    })
  );

  const energyShield = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x22d3ee,
      emissive: 0x0891b2,
      emissiveIntensity: 0.95,
      transparent: true,
      opacity: 0.42,
      roughness: 0.12,
      metalness: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );

  const energyBlade = track(
    new THREE.MeshStandardMaterial({
      color: 0xff5a28,
      emissive: 0xff2c12,
      emissiveIntensity: 3.1,
      roughness: 0.14,
      metalness: 0.2,
    })
  );

  const contactShadow = track(
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    })
  );

  const createWeakpointMaterial = (
    colorHex: number,
    emissiveIntensity = 2.4
  ): THREE.MeshStandardMaterial => {
    return track(
      new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity,
        roughness: 0.2,
        metalness: 0.22,
      })
    );
  };

  return {
    armorDark,
    armorSlate,
    armorHeavy,
    armorCrimsonAccent,
    armorGoldTrim,
    undersuit,
    titaniumJoint,
    weaponMetal,
    damascusSteel,
    hiltWrap,
    visorCrimson,
    visorAmber,
    visorCyan,
    energyShield,
    energyBlade,
    contactShadow,
    createWeakpointMaterial,
    dispose: () => {
      pbr.dispose();
      shadowTex.dispose();
      for (const m of owned) m.dispose();
    },
  };
}

/**
 * Invisible raycast hitbox mesh factory with standardized userData for `CombatController`.
 */
export function createEnemyHitboxMesh(
  enemyId: string,
  hitZone: EnemyHitZone,
  geometry: THREE.BufferGeometry,
  weakpointId?: string
): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({
    visible: false,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.userData = {
    enemyId,
    hitZone,
    weakpointId,
  };
  return mesh;
}

/**
 * Grounded soft radial contact shadow that anchors every Floor 08 enemy cleanly to the slab.
 */
export function createEnemyContactShadow(
  radius: number,
  mat: THREE.MeshBasicMaterial
): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(radius * 2.2, radius * 2.2);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.018;
  mesh.renderOrder = 1;
  return mesh;
}

/**
 * Sculpted cybernetic articulated leg (thigh -> knee servo -> armored shin greave -> tactical boot).
 * Designed with `createLoftedAnatomy` + `createBeveledBox` for authentic AAA silhouette (zero stick-figures!).
 */
export interface SculptedLegRig {
  hip: THREE.Group;
  knee: THREE.Group;
  ankle: THREE.Group;
}

export function buildSculptedCyberLeg(
  side: -1 | 1,
  scale: number,
  bulk: number,
  mats: Floor08EnemyMaterials,
  accentMat: THREE.Material
): SculptedLegRig {
  const hip = new THREE.Group();
  const s = scale;
  const b = bulk;

  // Sculpted thigh armor & undersuit
  const thighGeo = createLoftedAnatomy(
    [
      { y: 0.0, rx: 0.088 * b, rz: 0.095 * b, squareness: 2.3 },
      { y: -0.14 * s, rx: 0.092 * b, rz: 0.1 * b, squareness: 2.45 },
      { y: -0.34 * s, rx: 0.074 * b, rz: 0.08 * b, squareness: 2.4 },
      { y: -0.44 * s, rx: 0.064 * b, rz: 0.068 * b, squareness: 2.2 },
    ],
    14
  );
  const thighMesh = new THREE.Mesh(thighGeo, mats.undersuit);
  thighMesh.castShadow = true;
  hip.add(thighMesh);

  // Outer armored thigh plate
  const thighPlate = new THREE.Mesh(
    createBeveledBox(0.055 * b, 0.28 * s, 0.145 * b, 0.012),
    mats.armorDark
  );
  thighPlate.position.set(side * 0.065 * b, -0.2 * s, -0.008 * b);
  thighPlate.castShadow = true;
  hip.add(thighPlate);

  // Front thigh accent strip
  const thighTrim = new THREE.Mesh(
    createBeveledBox(0.075 * b, 0.18 * s, 0.025 * b, 0.006),
    accentMat
  );
  thighTrim.position.set(0, -0.18 * s, -0.09 * b);
  hip.add(thighTrim);

  // Knee servo joint
  const knee = new THREE.Group();
  knee.position.set(0, -0.44 * s, 0);
  hip.add(knee);

  const kneeServo = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052 * b, 0.052 * b, 0.13 * b, 12),
    mats.titaniumJoint
  );
  kneeServo.rotation.z = Math.PI / 2;
  knee.add(kneeServo);

  const kneeCap = new THREE.Mesh(
    createBeveledBox(0.098 * b, 0.11 * s, 0.052 * b, 0.014),
    mats.armorSlate
  );
  kneeCap.position.set(0, 0.01 * s, -0.068 * b);
  kneeCap.castShadow = true;
  knee.add(kneeCap);

  // Sculpted lower shin + armored greave
  const shinGeo = createLoftedAnatomy(
    [
      { y: 0.0, rx: 0.064 * b, rz: 0.072 * b, squareness: 2.3 },
      { y: -0.15 * s, rx: 0.072 * b, rz: 0.084 * b, squareness: 2.5, pinchFront: 0.015 },
      { y: -0.34 * s, rx: 0.054 * b, rz: 0.062 * b, squareness: 2.4 },
      { y: -0.42 * s, rx: 0.048 * b, rz: 0.055 * b, squareness: 2.2 },
    ],
    14
  );
  const shinMesh = new THREE.Mesh(shinGeo, mats.armorHeavy);
  shinMesh.castShadow = true;
  knee.add(shinMesh);

  // Hydraulic calf piston rod on rear (+Z)
  const piston = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016 * b, 0.014 * b, 0.3 * s, 8),
    mats.titaniumJoint
  );
  piston.position.set(0, -0.2 * s, 0.078 * b);
  piston.rotation.x = 0.08;
  knee.add(piston);

  // Ankle + Armored Combat Boot (sole sits flush at y = -0.08 * s => total leg height = 0.94 * s)
  const ankle = new THREE.Group();
  ankle.position.set(0, -0.42 * s, 0);
  knee.add(ankle);

  const bootUpper = new THREE.Mesh(
    createBeveledBox(0.11 * b, 0.062 * s, 0.24 * s, 0.012),
    mats.armorDark
  );
  bootUpper.position.set(0, -0.032 * s, -0.042 * s);
  bootUpper.castShadow = true;
  ankle.add(bootUpper);

  const bootSole = new THREE.Mesh(
    createBeveledBox(0.122 * b, 0.032 * s, 0.265 * s, 0.008),
    mats.undersuit
  );
  bootSole.position.set(0, -0.064 * s, -0.042 * s);
  ankle.add(bootSole);

  const toeCap = new THREE.Mesh(
    createBeveledBox(0.104 * b, 0.046 * s, 0.075 * s, 0.01),
    mats.titaniumJoint
  );
  toeCap.position.set(0, -0.042 * s, -0.145 * s);
  ankle.add(toeCap);

  return { hip, knee, ankle };
}

/**
 * Sculpted cybernetic articulated arm (shoulder pauldron -> bicep -> elbow servo -> armored gauntlet).
 */
export interface SculptedArmRig {
  shoulder: THREE.Group;
  elbow: THREE.Group;
  handMount: THREE.Group;
}

export function buildSculptedCyberArm(
  side: -1 | 1,
  scale: number,
  bulk: number,
  mats: Floor08EnemyMaterials,
  pauldronMat: THREE.Material
): SculptedArmRig {
  const shoulder = new THREE.Group();
  const s = scale;
  const b = bulk;

  // Multi-tiered shoulder pauldron armor
  const pauldron = new THREE.Mesh(
    createBeveledBox(0.14 * b, 0.145 * s, 0.175 * b, 0.022),
    pauldronMat
  );
  pauldron.position.set(side * 0.045 * b, 0.015 * s, 0);
  pauldron.rotation.z = -side * 0.22;
  pauldron.castShadow = true;
  shoulder.add(pauldron);

  // Upper arm bicep loft
  const upperGeo = createLoftedAnatomy(
    [
      { y: 0.0, rx: 0.062 * b, rz: 0.065 * b, squareness: 2.3 },
      { y: -0.15 * s, rx: 0.058 * b, rz: 0.06 * b, squareness: 2.4 },
      { y: -0.29 * s, rx: 0.048 * b, rz: 0.052 * b, squareness: 2.2 },
    ],
    12
  );
  const upperMesh = new THREE.Mesh(upperGeo, mats.undersuit);
  upperMesh.castShadow = true;
  shoulder.add(upperMesh);

  // Elbow joint & armored gauntlet forearm
  const elbow = new THREE.Group();
  elbow.position.set(0, -0.29 * s, 0);
  shoulder.add(elbow);

  const elbowServo = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042 * b, 0.042 * b, 0.1 * b, 10),
    mats.titaniumJoint
  );
  elbowServo.rotation.z = Math.PI / 2;
  elbow.add(elbowServo);

  const forearmGeo = createLoftedAnatomy(
    [
      { y: 0.0, rx: 0.052 * b, rz: 0.056 * b, squareness: 2.4 },
      { y: -0.14 * s, rx: 0.056 * b, rz: 0.06 * b, squareness: 2.5 },
      { y: -0.27 * s, rx: 0.044 * b, rz: 0.048 * b, squareness: 2.4 },
    ],
    12
  );
  const forearmMesh = new THREE.Mesh(forearmGeo, mats.armorDark);
  forearmMesh.castShadow = true;
  elbow.add(forearmMesh);

  const vambrace = new THREE.Mesh(
    createBeveledBox(0.072 * b, 0.19 * s, 0.042 * b, 0.01),
    mats.armorSlate
  );
  vambrace.position.set(side * 0.025 * b, -0.14 * s, -0.045 * b);
  elbow.add(vambrace);

  const handMount = new THREE.Group();
  handMount.position.set(0, -0.29 * s, -0.02 * s);
  elbow.add(handMount);

  const fist = new THREE.Mesh(
    createBeveledBox(0.068 * b, 0.08 * s, 0.075 * b, 0.012),
    mats.titaniumJoint
  );
  handMount.add(fist);

  return { shoulder, elbow, handMount };
}
