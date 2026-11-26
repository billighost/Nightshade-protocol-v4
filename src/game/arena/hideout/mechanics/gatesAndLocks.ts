import * as THREE from 'three';
import {
  buildBatchedBoxesMesh,
  type HideoutMaterialRegistry,
} from '../materials';
import type { FloorGeometryCollector } from '../stairs';
import type {
  ColliderBox3D,
  SecurityGateRig,
  ShootableLockRig,
} from '../types';
import { smoothstep01 } from './bridges';

export interface SecurityGateOptions {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  spanAxis: 'x' | 'z';
  lockedHint?: string;
  targetGroup?: THREE.Group;
}

/**
 * Builds a Locked Armored Security Vault Gate that stays sealed until unlocked by a
 * Shootable Security Relay Lock or World Switch, then telescopes cleanly into its jamb pockets
 * (ZERO protrusion into flanking glass windows or adjacent walls).
 */
export function buildLockedSecurityGate(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry,
  opts: SecurityGateOptions
): SecurityGateRig {
  const {
    id,
    label,
    x,
    y,
    z,
    width,
    height,
    spanAxis,
    lockedHint = `${label} SEALED · LOCATE SECURITY RELAY`,
    targetGroup,
  } = opts;
  const hostGroup = targetGroup ?? collector.group;

  const root = new THREE.Group();
  root.name = `SecurityGate_${id}`;
  root.position.set(x, y, z);
  if (spanAxis === 'z') root.rotation.y = Math.PI * 0.5;
  hostGroup.add(root);

  const clearW = Math.max(1.6, width - 0.44);
  const clearH = Math.max(2.4, height - 0.24);
  const leafW = clearW * 0.5 - 0.014;
  const slideDist = leafW * 0.94;
  const doorThick = 0.24;

  const statusMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 2.3,
    roughness: 0.22,
    metalness: 0.25,
  });

  const sideH = clearH - 0.18;
  const trackMesh = buildBatchedBoxesMesh(
    [
      { w: clearW - 0.04, h: 0.12, d: 0.38, x: 0, y: clearH - 0.07, z: 0 },
      { w: 0.06, h: sideH, d: 0.32, x: -(clearW * 0.5 - 0.04), y: 0.02 + sideH * 0.5, z: 0 },
      { w: 0.06, h: sideH, d: 0.32, x: clearW * 0.5 - 0.04, y: 0.02 + sideH * 0.5, z: 0 },
    ],
    mats.structuralSteel,
    { name: `${id}_GateTracks` }
  );
  if (trackMesh) root.add(trackMesh);

  const headerLockBar = new THREE.Mesh(
    new THREE.BoxGeometry(clearW * 0.56, 0.075, 0.46),
    statusMat
  );
  headerLockBar.position.set(0, clearH - 0.07, 0);
  root.add(headerLockBar);

  const raycastMeshes: THREE.Object3D[] = [];
  const makeLeaf = (side: -1 | 1): THREE.Group => {
    const leaf = new THREE.Group();
    leaf.position.set(side * (0.014 + leafW * 0.5), 0, 0);
    const bodyH = clearH - 0.16;
    const body = buildBatchedBoxesMesh(
      [{ w: leafW - 0.08, h: bodyH, d: doorThick, x: 0, y: 0.014 + bodyH * 0.5, z: 0 }],
      mats.armoredSteel,
      { castShadow: true, receiveShadow: true, name: `${id}_GateBody_${side > 0 ? 'R' : 'L'}` }
    );
    if (body) {
      leaf.add(body);
      raycastMeshes.push(body);
    }
    const ribW = Math.max(0.24, leafW - 0.34);
    const ribCx = side * 0.06;
    const ribs = buildBatchedBoxesMesh(
      [
        { w: ribW, h: 0.2, d: doorThick + 0.046, x: ribCx, y: bodyH * 0.32, z: 0 },
        { w: ribW, h: 0.2, d: doorThick + 0.046, x: ribCx, y: bodyH * 0.74, z: 0 },
      ],
      mats.structuralSteel,
      { name: `${id}_GateRibs_${side > 0 ? 'R' : 'L'}` }
    );
    if (ribs) leaf.add(ribs);

    const haz = buildBatchedBoxesMesh(
      [{ w: ribW, h: 0.22, d: doorThick + 0.056, x: ribCx, y: 0.21, z: 0 }],
      mats.hazardStripe,
      { name: `${id}_GateHazard_${side > 0 ? 'R' : 'L'}` }
    );
    if (haz) leaf.add(haz);

    const seam = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, bodyH * 0.64, doorThick + 0.068),
      statusMat
    );
    seam.position.set(-side * (leafW * 0.5 - 0.095), bodyH * 0.5 + 0.014, 0);
    leaf.add(seam);
    return leaf;
  };

  const leftLeaf = makeLeaf(-1);
  const rightLeaf = makeLeaf(1);
  root.add(leftLeaf, rightLeaf);

  const colHalfSpan = clearW * 0.5 + 0.14;
  const colHalfDepth = 0.24;
  const collider: ColliderBox3D =
    spanAxis === 'x'
      ? {
          id: `secgate_${id}`,
          minX: x - colHalfSpan,
          maxX: x + colHalfSpan,
          minY: y,
          maxY: y + height,
          minZ: z - colHalfDepth,
          maxZ: z + colHalfDepth,
          active: true,
          walkableTop: false,
          tag: 'security_gate',
        }
      : {
          id: `secgate_${id}`,
          minX: x - colHalfDepth,
          maxX: x + colHalfDepth,
          minY: y,
          maxY: y + height,
          minZ: z - colHalfSpan,
          maxZ: z + colHalfSpan,
          active: true,
          walkableTop: false,
          tag: 'security_gate',
        };
  collector.boxes.push(collider);

  const rig: SecurityGateRig = {
    id,
    label,
    x,
    y,
    z,
    lockedHint,
    root,
    collider,
    raycastMeshes,
    statusMat,
    openRatio: 0,
    targetRatio: 0,
    unlocked: false,
    applyVisuals: () => {
      const eased = smoothstep01(rig.openRatio);
      const innerEdge = 0.014 + eased * slideDist;
      const pocketLimitX = clearW * 0.5 + 0.04;
      const outerEdge = Math.min(innerEdge + leafW, pocketLimitX);
      const scaleX = Math.max(0.06, (outerEdge - innerEdge) / leafW);
      const centerX = innerEdge + (leafW * scaleX) * 0.5;
      leftLeaf.scale.x = scaleX;
      rightLeaf.scale.x = scaleX;
      leftLeaf.position.x = -centerX;
      rightLeaf.position.x = centerX;

      const isUnlocked = rig.unlocked || rig.openRatio > 0.05;
      statusMat.color.setHex(isUnlocked ? 0x22d3ee : 0xef4444);
      statusMat.emissive.setHex(isUnlocked ? 0x06b6d4 : 0xdc2626);
      statusMat.emissiveIntensity = isUnlocked ? 2.2 : 2.4;

      collider.active = rig.openRatio < 0.72;
    },
  };

  rig.applyVisuals();
  collector.wallMeshes.push(...raycastMeshes);
  collector.securityGates?.push(rig);
  return rig;
}

export interface ShootableLockOptions {
  id: string;
  bannerText: string;
  x: number;
  y: number;
  z: number;
  rotY?: number;
  unlockGateId?: string;
  deployBridgeId?: string;
  targetGroup?: THREE.Group;
}

/**
 * Builds an unmistakable Shootable Security Relay Box with generous bullet hitbox
 * (`userData.worldLockId = id`) for unlocking security gates or deploying skybridges.
 */
export function buildShootableLock(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry,
  opts: ShootableLockOptions
): ShootableLockRig {
  const { id, bannerText, x, y, z, rotY = 0, unlockGateId, deployBridgeId, targetGroup } = opts;
  const hostGroup = targetGroup ?? collector.group;

  const root = new THREE.Group();
  root.name = `ShootableLock_${id}`;
  root.position.set(x, y, z);
  root.rotation.y = rotY;
  hostGroup.add(root);

  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xef4444,
    emissiveIntensity: 1.55,
    roughness: 0.28,
    metalness: 0.2,
  });

  const frameMesh = buildBatchedBoxesMesh(
    [
      { w: 0.62, h: 0.78, d: 0.16, x: 0, y: 0, z: -0.02 },
      { w: 0.68, h: 0.08, d: 0.28, x: 0, y: 0.43, z: 0.04 },
      { w: 0.68, h: 0.08, d: 0.28, x: 0, y: -0.43, z: 0.04 },
      { w: 0.08, h: 0.56, d: 0.24, x: -0.28, y: 0.06, z: 0.08 },
      { w: 0.08, h: 0.56, d: 0.24, x: 0.28, y: 0.06, z: 0.08 },
    ],
    mats.structuralSteel,
    { name: `${id}_LockHousing` }
  );
  if (frameMesh) root.add(frameMesh);

  const hazMesh = buildBatchedBoxesMesh(
    [{ w: 0.54, h: 0.09, d: 0.14, x: 0, y: -0.27, z: 0.11 }],
    mats.hazardStripe,
    { name: `${id}_LockHazard` }
  );
  if (hazMesh) root.add(hazMesh);

  const coreMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.36, 0.14), coreMat);
  coreMesh.name = `${id}_LockCore`;
  coreMesh.position.set(0, 0.06, 0.14);
  root.add(coreMesh);

  const crossBar = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.045, 0.04), mats.armoredSteel);
  crossBar.position.set(0, 0.06, 0.22);
  root.add(crossBar);

  const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitbox = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.96, 0.52), hitboxMat);
  hitbox.name = `${id}_LockHitbox`;
  hitbox.position.set(0, 0.02, 0.1);
  hitbox.userData.worldLockId = id;
  root.add(hitbox);

  const rig: ShootableLockRig = {
    id,
    bannerText,
    root,
    hitbox,
    coreMat,
    destroyed: false,
    unlockGateId,
    deployBridgeId,
    applyVisuals: (elapsed: number) => {
      if (rig.destroyed) {
        coreMat.color.setHex(0x1e293b);
        coreMat.emissive.setHex(0x0f172a);
        coreMat.emissiveIntensity = 0.15;
        coreMesh.scale.set(0.86, 0.86, 0.6);
      } else {
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 7.2);
        coreMat.color.setHex(0xdc2626);
        coreMat.emissive.setHex(0xef4444);
        coreMat.emissiveIntensity = 1.15 + pulse * 0.95;
        coreMesh.scale.set(1, 1, 1);
      }
    },
  };

  rig.applyVisuals(0);
  collector.shootableLocks?.push(rig);
  return rig;
}
