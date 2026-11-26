import * as THREE from 'three';
import { createBeveledBox } from '../../../../core/sculptUtils';
import {
  createEnemyHitboxMesh,
  type Floor08EnemyMaterials,
} from '../../../core/enemyMeshShared';
import { KILLHOUSE_WARDEN_CONFIG } from '../config';

export interface WardenWeakpointAssembly {
  coilRack: THREE.Group;
  coilMaterial: THREE.MeshStandardMaterial;
  leftPylon: THREE.Group;
  rightPylon: THREE.Group;
  weakpointHitboxes: THREE.Mesh[];
  setVentVisualState: (exposed: boolean, broken: boolean, elapsed: number, dt: number) => void;
  disposables: Array<{ dispose: () => void }>;
}

/**
 * AAA Signature Weakpoint Rig for WARDEN-08 "SABLE":
 * Sculpted Obsidian-and-Gold Dorsal Overclock Spine Pack carrying Twin Telescoping Shoulder
 * Capacitor Pylons with spinning holographic overload rings!
 * - Tucked sleekly behind shoulders during normal strafing.
 * - Hydraulically pops HIGH (+0.15m) & splays outward (±0.38 rad) blazing incandescent solar-gold
 *   after every Flash-Dash Volley or Cyclone Sweep so players can clearly snipe them from front-3/4 or rear!
 */
export function buildWardenWeakpointRig(
  enemyId: string,
  torso: THREE.Group,
  mats: Floor08EnemyMaterials
): WardenWeakpointAssembly {
  const disposables: Array<{ dispose: () => void }> = [];

  const obsidianCarbonMat = new THREE.MeshStandardMaterial({
    color: 0x1b1e28,
    roughness: 0.62,
    metalness: 0.36,
    bumpMap: mats.armorDark.bumpMap,
    bumpScale: 0.012,
  });
  const champagneGoldMat = new THREE.MeshStandardMaterial({
    color: 0xdca536,
    roughness: 0.28,
    metalness: 0.82,
  });
  const coilMaterial = mats.createWeakpointMaterial(0xffb824, 2.2);
  const haloRingMat = new THREE.MeshBasicMaterial({
    color: 0xffe484,
    transparent: true,
    opacity: 0.82,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  disposables.push(obsidianCarbonMat, champagneGoldMat, coilMaterial, haloRingMat);

  const coilRack = new THREE.Group();
  coilRack.position.set(0, 0.36, 0.175);
  torso.add(coilRack);

  // Armored dorsal overclock spine chassis with dark heat-sink louvers & warm gold telemetry bar
  const packChassis = new THREE.Mesh(
    createBeveledBox(0.3, 0.34, 0.115, 0.02),
    obsidianCarbonMat
  );
  packChassis.castShadow = true;
  coilRack.add(packChassis);

  const spineHousing = new THREE.Mesh(
    createBeveledBox(0.14, 0.28, 0.132, 0.016),
    mats.armorSlate
  );
  coilRack.add(spineHousing);

  for (let l = 0; l < 4; l++) {
    const louver = new THREE.Mesh(
      createBeveledBox(0.115, 0.022, 0.024, 0.004),
      obsidianCarbonMat
    );
    louver.position.set(0, 0.08 - l * 0.052, 0.064);
    louver.rotation.x = 0.28;
    coilRack.add(louver);
  }

  const spineStatusBar = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.21, 0.016), coilMaterial);
  spineStatusBar.position.set(0, -0.01, 0.072);
  coilRack.add(spineStatusBar);

  const spineGoldBand = new THREE.Mesh(
    createBeveledBox(0.26, 0.028, 0.128, 0.005),
    champagneGoldMat
  );
  spineGoldBand.position.set(0, 0.115, 0.004);
  coilRack.add(spineGoldBand);

  // Twin armored pylon receiver sockets on upper left & right shoulders of the dorsal pack
  const buildPylon = (
    side: -1 | 1
  ): {
    grp: THREE.Group;
    haloRing: THREE.Mesh;
    haloRing2: THREE.Mesh;
    hitbox: THREE.Mesh;
  } => {
    const socket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.056, 0.064, 0.09, 12),
      obsidianCarbonMat
    );
    socket.position.set(side * 0.155, 0.17, -0.008);
    socket.rotation.z = -side * 0.24;
    coilRack.add(socket);

    const grp = new THREE.Group();
    grp.position.set(side * 0.185, 0.23, -0.015);
    grp.rotation.z = -side * 0.24;
    coilRack.add(grp);

    // Incandescent solar-gold plasma capacitor cylinder core
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.056, 0.29, 14),
      coilMaterial
    );
    grp.add(core);

    // Top armored emitter crown cap + bottom piston rod
    const topCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.054, 0.042, 12),
      champagneGoldMat
    );
    topCap.position.y = 0.158;
    grp.add(topCap);

    const pistonRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.028, 0.14, 10),
      mats.titaniumJoint
    );
    pistonRod.position.y = -0.18;
    grp.add(pistonRod);

    // 3 Brushed Gold Cooling Coils encircling the glowing core
    for (const ry of [-0.085, 0.0, 0.085]) {
      const fin = new THREE.Mesh(
        new THREE.TorusGeometry(0.06, 0.009, 6, 16),
        champagneGoldMat
      );
      fin.rotation.x = Math.PI / 2;
      fin.position.y = ry;
      grp.add(fin);
    }

    // Twin counter-oscillating additive energy rings active ONLY during thermal vent weakpoint window!
    const haloRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.106, 0.014, 8, 22),
      haloRingMat
    );
    haloRing.rotation.x = Math.PI / 2;
    haloRing.position.y = 0.06;
    haloRing.visible = false;
    grp.add(haloRing);

    const haloRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.088, 0.011, 8, 20),
      haloRingMat
    );
    haloRing2.rotation.x = Math.PI / 2;
    haloRing2.position.y = -0.04;
    haloRing2.visible = false;
    grp.add(haloRing2);

    const hitbox = createEnemyHitboxMesh(
      enemyId,
      'weakpoint',
      new THREE.SphereGeometry(0.21, 10, 8),
      KILLHOUSE_WARDEN_CONFIG.weakpoint.id
    );
    hitbox.position.y = 0.03;
    grp.add(hitbox);

    return { grp, haloRing, haloRing2, hitbox };
  };

  const left = buildPylon(-1);
  const right = buildPylon(1);

  const setVentVisualState = (
    exposed: boolean,
    broken: boolean,
    elapsed: number,
    dt: number
  ): void => {
    const smooth = Math.min(1, dt * 12);
    const targetY = exposed ? 0.375 : 0.225;
    const targetX = exposed ? 0.23 : 0.175;
    const targetZRot = exposed ? 0.38 : 0.22;

    left.grp.position.y += (targetY - left.grp.position.y) * smooth;
    right.grp.position.y += (targetY - right.grp.position.y) * smooth;
    left.grp.position.x += (-targetX - left.grp.position.x) * smooth;
    right.grp.position.x += (targetX - right.grp.position.x) * smooth;
    left.grp.rotation.z += (targetZRot - left.grp.rotation.z) * smooth;
    right.grp.rotation.z += (-targetZRot - right.grp.rotation.z) * smooth;

    const showHalo = exposed && !broken;
    left.haloRing.visible = showHalo;
    right.haloRing.visible = showHalo;
    left.haloRing2.visible = showHalo;
    right.haloRing2.visible = showHalo;
    if (showHalo) {
      const pulse = 0.94 + Math.sin(elapsed * 18) * 0.12;
      left.haloRing.scale.setScalar(pulse);
      right.haloRing.scale.setScalar(pulse);
      left.haloRing.position.y = 0.04 + Math.sin(elapsed * 10) * 0.06;
      right.haloRing.position.y = 0.04 - Math.sin(elapsed * 10) * 0.06;
      left.haloRing2.position.y = -0.04 - Math.sin(elapsed * 10) * 0.05;
      right.haloRing2.position.y = -0.04 + Math.sin(elapsed * 10) * 0.05;
      haloRingMat.opacity = 0.78 + Math.sin(elapsed * 22) * 0.18;
      coilMaterial.emissive.setHex(0xffd248);
      coilMaterial.emissiveIntensity = 3.6 + Math.sin(elapsed * 20) * 0.9;
    } else if (broken) {
      coilMaterial.emissive.setHex(0x6e4412);
      coilMaterial.emissiveIntensity = 0.55;
    } else {
      coilMaterial.emissive.setHex(0xd98412);
      coilMaterial.emissiveIntensity = 1.45;
    }
  };

  return {
    coilRack,
    coilMaterial,
    leftPylon: left.grp,
    rightPylon: right.grp,
    weakpointHitboxes: [left.hitbox, right.hitbox],
    setVentVisualState,
    disposables,
  };
}
