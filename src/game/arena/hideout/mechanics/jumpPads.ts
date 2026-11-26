import * as THREE from 'three';
import {
  buildBatchedBoxesMesh,
  type HideoutMaterialRegistry,
} from '../materials';
import type { FloorGeometryCollector } from '../stairs';
import type { JumpPadRig } from '../types';

export interface JumpPadOptions {
  id: string;
  x: number;
  y: number;
  z: number;
  launchVy?: number;
  launchVx?: number;
  launchVz?: number;
  radius?: number;
  targetGroup?: THREE.Group;
}

/**
 * Builds a Pneumatic Tactical Jump-Boost Pad (Halo / Titanfall 2 vertical flank booster).
 */
export function buildJumpPad(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry,
  opts: JumpPadOptions
): JumpPadRig {
  const {
    id,
    x,
    y,
    z,
    launchVy = 13.4,
    launchVx = 0,
    launchVz = 0,
    radius = 0.74,
    targetGroup,
  } = opts;

  const hostGroup = targetGroup ?? collector.group;
  const root = new THREE.Group();
  root.name = `JumpPad_${id}`;
  root.position.set(x, y, z);
  hostGroup.add(root);

  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x06b6d4,
    emissiveIntensity: 2.6,
    roughness: 0.2,
    metalness: 0.2,
  });

  const baseMesh = buildBatchedBoxesMesh(
    [
      { w: 1.96, h: 0.06, d: 1.96, x: 0, y: 0.036, z: 0 },
      { w: 0.3, h: 0.1, d: 0.3, x: -0.86, y: 0.062, z: -0.86 },
      { w: 0.3, h: 0.1, d: 0.3, x: 0.86, y: 0.062, z: -0.86 },
      { w: 0.3, h: 0.1, d: 0.3, x: -0.86, y: 0.062, z: 0.86 },
      { w: 0.3, h: 0.1, d: 0.3, x: 0.86, y: 0.062, z: 0.86 },
    ],
    mats.structuralSteel,
    { receiveShadow: true, name: `${id}_PadBase` }
  );
  if (baseMesh) root.add(baseMesh);

  const grateMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.74, 0.048, 16), mats.armoredSteel);
  grateMesh.position.y = 0.098;
  root.add(grateMesh);

  const emitterRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.065, 8, 24), ringMat);
  emitterRing.rotation.x = Math.PI * 0.5;
  emitterRing.position.y = 0.135;
  root.add(emitterRing);

  const floatHalo = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.035, 8, 24), ringMat);
  floatHalo.rotation.x = Math.PI * 0.5;
  floatHalo.position.y = 0.42;
  root.add(floatHalo);

  const rig: JumpPadRig = {
    id,
    root,
    x,
    y,
    z,
    radius,
    launchVy,
    launchVx,
    launchVz,
    cooldown: 0,
    ringMat,
    applyVisuals: (elapsed: number) => {
      const cycle = (elapsed * 1.45) % 1;
      floatHalo.position.y = 0.18 + cycle * 0.88;
      const scale = 1.05 - cycle * 0.32;
      floatHalo.scale.set(scale, scale, 1);
      const ready = rig.cooldown <= 0;
      ringMat.emissiveIntensity = ready ? 2.1 + Math.sin(elapsed * 6.0) * 0.55 : 0.7;
    },
  };

  rig.applyVisuals(0);
  collector.jumpPads?.push(rig);
  return rig;
}
