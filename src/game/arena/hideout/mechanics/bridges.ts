import * as THREE from 'three';
import {
  buildBatchedBoxesMesh,
  type BoxSpec,
  type HideoutMaterialRegistry,
} from '../materials';
import type { FloorGeometryCollector } from '../stairs';
import type {
  ColliderBox3D,
  RetractableBridgeRig,
  WalkableSlab,
} from '../types';

export function smoothstep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

export interface RetractableBridgeOptions {
  id: string;
  label: string;
  /** Fixed housing anchor point where the bridge retracts INTO */
  anchorX: number;
  /** Top walkable elevation `y` of the bridge deck */
  y: number;
  anchorZ: number;
  /** Direction vector along which bridge telescopes out (must be axis-aligned: ±1 on X or ±1 on Z) */
  extendDirX: -1 | 0 | 1;
  extendDirZ: -1 | 0 | 1;
  /** Full span length when extended */
  length: number;
  /** Walkable deck width perpendicular to extension */
  width: number;
  /** Optional host group (e.g. OcclusionCell) */
  targetGroup?: THREE.Group;
  accentMat: THREE.Material;
}

/**
 * Builds a dramatic AAA Retractable Hydraulic Catwalk Skybridge with dynamic WalkableSlab
 * and dynamic side handrail colliders.
 */
export function buildRetractableBridge(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry,
  opts: RetractableBridgeOptions
): RetractableBridgeRig {
  const {
    id,
    label,
    anchorX,
    y,
    anchorZ,
    extendDirX,
    extendDirZ,
    length,
    width,
    targetGroup,
    accentMat,
  } = opts;

  const hostGroup = targetGroup ?? collector.group;
  const alongX = extendDirX !== 0;
  const dir = alongX ? extendDirX : extendDirZ;

  const root = new THREE.Group();
  root.name = `RetractableBridge_${id}`;
  root.position.set(anchorX, y, anchorZ);
  hostGroup.add(root);

  const statusMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 1.8,
    roughness: 0.25,
    metalness: 0.25,
  });

  const housingSpecs: BoxSpec[] = alongX
    ? [
        { w: 0.72, h: 0.56, d: width + 0.56, x: -dir * 0.38, y: -0.24, z: 0 },
        { w: 0.36, h: 0.92, d: 0.28, x: -dir * 0.16, y: 0.48, z: -(width * 0.5 + 0.18) },
        { w: 0.36, h: 0.92, d: 0.28, x: -dir * 0.16, y: 0.48, z: width * 0.5 + 0.18 },
      ]
    : [
        { w: width + 0.56, h: 0.56, d: 0.72, x: 0, y: -0.24, z: -dir * 0.38 },
        { w: 0.28, h: 0.92, d: 0.36, x: -(width * 0.5 + 0.18), y: 0.48, z: -dir * 0.16 },
        { w: 0.28, h: 0.92, d: 0.36, x: width * 0.5 + 0.18, y: 0.48, z: -dir * 0.16 },
      ];
  const housingMesh = buildBatchedBoxesMesh(housingSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: `${id}_BridgeHousing`,
  });
  if (housingMesh) root.add(housingMesh);

  const beaconSpecs: BoxSpec[] = alongX
    ? [
        { w: 0.14, h: 0.54, d: 0.1, x: -dir * 0.16, y: 0.56, z: -(width * 0.5 + 0.34) },
        { w: 0.14, h: 0.54, d: 0.1, x: -dir * 0.16, y: 0.56, z: width * 0.5 + 0.34 },
      ]
    : [
        { w: 0.1, h: 0.54, d: 0.14, x: -(width * 0.5 + 0.34), y: 0.56, z: -dir * 0.16 },
        { w: 0.1, h: 0.54, d: 0.14, x: width * 0.5 + 0.34, y: 0.56, z: -dir * 0.16 },
      ];
  const beaconMesh = buildBatchedBoxesMesh(beaconSpecs, statusMat, {
    name: `${id}_BridgeBeacons`,
  });
  if (beaconMesh) root.add(beaconMesh);

  const deckGroup = new THREE.Group();
  deckGroup.name = `${id}_BridgeDeck`;
  root.add(deckGroup);

  const raycastMeshes: THREE.Object3D[] = [];
  const deckHalfLen = length * 0.5;
  const deckCenterOffset = dir * deckHalfLen;
  const deckThick = 0.32;

  const deckMesh = buildBatchedBoxesMesh(
    [
      alongX
        ? { w: length - 0.04, h: deckThick, d: width - 0.06, x: deckCenterOffset, y: -deckThick * 0.5 - 0.004, z: 0 }
        : { w: width - 0.06, h: deckThick, d: length - 0.04, x: 0, y: -deckThick * 0.5 - 0.004, z: deckCenterOffset },
    ],
    mats.catwalkGrate,
    { castShadow: true, receiveShadow: true, name: `${id}_DeckSurface` }
  );
  if (deckMesh) {
    deckGroup.add(deckMesh);
    raycastMeshes.push(deckMesh);
  }

  const trussSpecs: BoxSpec[] = [];
  const railSpecs: BoxSpec[] = [];
  const accentSpecs: BoxSpec[] = [];
  const sideOffset = width * 0.5 + 0.06;
  const postCount = Math.max(3, Math.round(length / 2.2));

  for (const side of [-1, 1] as const) {
    if (alongX) {
      trussSpecs.push({
        w: length - 0.08,
        h: 0.42,
        d: 0.14,
        x: deckCenterOffset,
        y: -0.17,
        z: side * sideOffset,
      });
      railSpecs.push(
        { w: length - 0.12, h: 0.064, d: 0.064, x: deckCenterOffset, y: 1.04, z: side * sideOffset },
        { w: length - 0.12, h: 0.032, d: 0.032, x: deckCenterOffset, y: 0.54, z: side * sideOffset }
      );
      accentSpecs.push({
        w: length - 0.24,
        h: 0.014,
        d: 0.1,
        x: deckCenterOffset,
        y: 0.014,
        z: side * (width * 0.5 - 0.18),
      });
      for (let p = 0; p <= postCount; p++) {
        const px = dir * (0.25 + ((length - 0.5) * p) / postCount);
        trussSpecs.push({ w: 0.048, h: 0.96, d: 0.048, x: px, y: 0.52, z: side * sideOffset });
      }
    } else {
      trussSpecs.push({
        w: 0.14,
        h: 0.42,
        d: length - 0.08,
        x: side * sideOffset,
        y: -0.17,
        z: deckCenterOffset,
      });
      railSpecs.push(
        { w: 0.064, h: 0.064, d: length - 0.12, x: side * sideOffset, y: 1.04, z: deckCenterOffset },
        { w: 0.032, h: 0.032, d: length - 0.12, x: side * sideOffset, y: 0.54, z: deckCenterOffset }
      );
      accentSpecs.push({
        w: 0.1,
        h: 0.014,
        d: length - 0.24,
        x: side * (width * 0.5 - 0.18),
        y: 0.014,
        z: deckCenterOffset,
      });
      for (let p = 0; p <= postCount; p++) {
        const pz = dir * (0.25 + ((length - 0.5) * p) / postCount);
        trussSpecs.push({ w: 0.048, h: 0.96, d: 0.048, x: side * sideOffset, y: 0.52, z: pz });
      }
    }
  }

  const trussMesh = buildBatchedBoxesMesh(trussSpecs, mats.structuralSteel, {
    name: `${id}_Trusses`,
  });
  if (trussMesh) deckGroup.add(trussMesh);
  const railMesh = buildBatchedBoxesMesh(railSpecs, mats.brushedMetal, {
    name: `${id}_Rails`,
  });
  if (railMesh) deckGroup.add(railMesh);
  const accMesh = buildBatchedBoxesMesh(accentSpecs, accentMat, {
    name: `${id}_Accents`,
  });
  if (accMesh) deckGroup.add(accMesh);

  const minSpan = Math.min(0, dir * length);
  const maxSpan = Math.max(0, dir * length);
  const slab: WalkableSlab = alongX
    ? {
        minX: anchorX + minSpan - 0.35,
        maxX: anchorX + maxSpan + 0.35,
        minZ: anchorZ - width * 0.5,
        maxZ: anchorZ + width * 0.5,
        y,
        active: false,
      }
    : {
        minX: anchorX - width * 0.5,
        maxX: anchorX + width * 0.5,
        minZ: anchorZ + minSpan - 0.35,
        maxZ: anchorZ + maxSpan + 0.35,
        y,
        active: false,
      };
  collector.slabs.push(slab);

  const railColliders: ColliderBox3D[] = [];
  for (const side of [-1, 1] as const) {
    const col: ColliderBox3D = alongX
      ? {
          id: `${id}_rail_${side > 0 ? 'p' : 'n'}`,
          minX: anchorX + minSpan,
          maxX: anchorX + maxSpan,
          minY: y,
          maxY: y + 1.35,
          minZ: anchorZ + side * sideOffset - 0.1,
          maxZ: anchorZ + side * sideOffset + 0.1,
          active: false,
          walkableTop: false,
          tag: 'guardrail',
        }
      : {
          id: `${id}_rail_${side > 0 ? 'p' : 'n'}`,
          minX: anchorX + side * sideOffset - 0.1,
          maxX: anchorX + side * sideOffset + 0.1,
          minY: y,
          maxY: y + 1.35,
          minZ: anchorZ + minSpan,
          maxZ: anchorZ + maxSpan,
          active: false,
          walkableTop: false,
          tag: 'guardrail',
        };
    railColliders.push(col);
    collector.boxes.push(col);
  }

  const rig: RetractableBridgeRig = {
    id,
    label,
    root,
    deckGroup,
    slab,
    railColliders,
    raycastMeshes,
    statusMat,
    deployRatio: 0,
    targetRatio: 0,
    deployed: false,
    applyVisuals: () => {
      const eased = smoothstep01(rig.deployRatio);
      const scaleSpan = Math.max(0.03, eased);
      if (alongX) {
        deckGroup.scale.set(scaleSpan, 1, 1);
      } else {
        deckGroup.scale.set(1, 1, scaleSpan);
      }
      deckGroup.visible = rig.deployRatio > 0.01;

      const isWalkable = rig.deployRatio >= 0.78;
      slab.active = isWalkable;
      for (let i = 0; i < railColliders.length; i++) {
        railColliders[i].active = isWalkable;
      }

      const activeColor = rig.deployed || rig.deployRatio > 0.15;
      statusMat.color.setHex(activeColor ? 0x22d3ee : 0xf59e0b);
      statusMat.emissive.setHex(activeColor ? 0x06b6d4 : 0xd97706);
      statusMat.emissiveIntensity = activeColor ? 2.4 : 1.6;
    },
  };

  rig.applyVisuals();
  collector.wallMeshes.push(...raycastMeshes);
  collector.retractableBridges?.push(rig);
  return rig;
}
