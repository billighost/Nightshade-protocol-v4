import * as THREE from 'three';
import {
  buildBatchedBoxesMesh,
  type HideoutMaterialRegistry,
} from '../materials';
import type { FloorGeometryCollector } from '../stairs';
import type {
  ColliderBox3D,
  ExplosiveBarrelRig,
  WorldSwitchRig,
} from '../types';

export interface WorldSwitchOptions {
  id: string;
  x: number;
  y: number;
  z: number;
  rotY?: number;
  promptLocked: string;
  promptActivated: string;
  bannerText: string;
  deployBridgeId?: string;
  unlockGateId?: string;
  interactRadius?: number;
  targetGroup?: THREE.Group;
}

/**
 * Builds a sleek waist-high interactive [E] Mechanical Override Terminal.
 */
export function buildWorldSwitch(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry,
  opts: WorldSwitchOptions
): WorldSwitchRig {
  const {
    id,
    x,
    y,
    z,
    rotY = 0,
    promptLocked,
    promptActivated,
    bannerText,
    deployBridgeId,
    unlockGateId,
    interactRadius = 2.45,
    targetGroup,
  } = opts;
  const hostGroup = targetGroup ?? collector.group;

  const root = new THREE.Group();
  root.name = `WorldSwitch_${id}`;
  root.position.set(x, y, z);
  root.rotation.y = rotY;
  hostGroup.add(root);

  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 1.45,
    roughness: 0.28,
    metalness: 0.25,
  });

  const bodyMesh = buildBatchedBoxesMesh(
    [
      { w: 0.72, h: 0.12, d: 0.62, x: 0, y: 0.064, z: 0 },
      { w: 0.52, h: 1.04, d: 0.42, x: 0, y: 0.65, z: 0 },
      { w: 0.64, h: 0.12, d: 0.48, x: 0, y: 1.24, z: 0.04 },
      { w: 0.16, h: 0.68, d: 0.14, x: 0, y: 1.66, z: -0.15 },
      { w: 0.22, h: 0.06, d: 0.2, x: 0, y: 2.04, z: -0.15 },
    ],
    mats.structuralSteel,
    { castShadow: true, receiveShadow: true, name: `${id}_SwitchStand` }
  );
  if (bodyMesh) {
    root.add(bodyMesh);
    collector.wallMeshes.push(bodyMesh);
  }

  const keyPanel = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.055, 0.26), beaconMat);
  keyPanel.position.set(0, 1.33, 0.06);
  keyPanel.rotation.x = 0.24;
  root.add(keyPanel);

  const beaconStrip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.48, 0.175), beaconMat);
  beaconStrip.position.set(0, 1.66, -0.15);
  root.add(beaconStrip);

  collector.boxes.push({
    id: `wswitch_${id}`,
    minX: x - 0.38,
    maxX: x + 0.38,
    minY: y,
    maxY: y + 1.4,
    minZ: z - 0.34,
    maxZ: z + 0.34,
    walkableTop: false,
  });

  const rig: WorldSwitchRig = {
    id,
    root,
    x,
    y,
    z,
    interactRadius,
    promptLocked,
    promptActivated,
    bannerText,
    activated: false,
    deployBridgeId,
    unlockGateId,
    beaconMat,
    applyVisuals: () => {
      beaconMat.color.setHex(rig.activated ? 0x06b6d4 : 0xf59e0b);
      beaconMat.emissive.setHex(rig.activated ? 0x0891b2 : 0xd97706);
      beaconMat.emissiveIntensity = rig.activated ? 1.55 : 1.4;
    },
  };

  rig.applyVisuals();
  collector.worldSwitches?.push(rig);
  return rig;
}

export interface ExplosiveBarrelOptions {
  id: string;
  x: number;
  y: number;
  z: number;
  blastRadius?: number;
  targetGroup?: THREE.Group;
}

/**
 * Builds a composite multi-part Pressurized Plasma Hazard Barrel with chain-reaction blast.
 */
export function buildExplosiveBarrel(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry,
  opts: ExplosiveBarrelOptions
): ExplosiveBarrelRig {
  const { id, x, y, z, blastRadius = 5.4, targetGroup } = opts;
  const hostGroup = targetGroup ?? collector.group;

  const root = new THREE.Group();
  root.name = `ExplosiveBarrel_${id}`;
  root.position.set(x, y, z);
  hostGroup.add(root);

  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xff5a1f,
    emissive: 0xf97316,
    emissiveIntensity: 2.6,
    roughness: 0.22,
    metalness: 0.25,
  });

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    roughness: 0.44,
    metalness: 0.58,
  });

  const baseSkirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.42, 0.14, 14),
    mats.structuralSteel
  );
  baseSkirt.position.y = 0.074;
  baseSkirt.castShadow = true;
  baseSkirt.receiveShadow = true;
  root.add(baseSkirt);

  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.94, 16), bodyMat);
  drum.position.y = 0.62;
  drum.castShadow = true;
  drum.receiveShadow = true;
  root.add(drum);

  const lowerRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.37, 0.37, 0.09, 16),
    mats.hazardStripe
  );
  lowerRing.position.y = 0.34;
  root.add(lowerRing);

  const upperRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.37, 0.37, 0.09, 16),
    mats.hazardStripe
  );
  upperRing.position.y = 0.92;
  root.add(upperRing);

  const plasmaCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.355, 0.355, 0.18, 16),
    glowMat
  );
  plasmaCollar.position.y = 0.63;
  root.add(plasmaCollar);

  const topCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.31, 0.36, 0.1, 14),
    mats.structuralSteel
  );
  topCap.position.y = 1.14;
  topCap.castShadow = true;
  root.add(topCap);

  const valveStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 0.14, 10),
    mats.brushedMetal
  );
  valveStem.position.y = 1.24;
  root.add(valveStem);

  const valveRing = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 6, 14), glowMat);
  valveRing.rotation.x = Math.PI * 0.5;
  valveRing.position.y = 1.3;
  root.add(valveRing);

  const hitbox = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.46, 1.38, 10),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitbox.name = `${id}_BarrelHitbox`;
  hitbox.position.y = 0.69;
  hitbox.userData.explosiveBarrelId = id;
  root.add(hitbox);

  const collider: ColliderBox3D = {
    id: `barrel_${id}`,
    minX: x - 0.42,
    maxX: x + 0.42,
    minY: y,
    maxY: y + 1.32,
    minZ: z - 0.42,
    maxZ: z + 0.42,
    active: true,
    walkableTop: false,
    tag: 'explosive_barrel',
  };
  collector.boxes.push(collider);

  const rig: ExplosiveBarrelRig = {
    id,
    root,
    hitbox,
    x,
    y,
    z,
    blastRadius,
    collider,
    glowMat,
    detonated: false,
    respawnTimer: 0,
    applyVisuals: (elapsed: number) => {
      root.visible = !rig.detonated;
      collider.active = !rig.detonated;
      if (!rig.detonated) {
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 5.2 + x * 0.7 + z * 0.5);
        glowMat.emissiveIntensity = 1.85 + pulse * 1.45;
      }
    },
  };

  rig.applyVisuals(0);
  collector.explosiveBarrels?.push(rig);
  return rig;
}
