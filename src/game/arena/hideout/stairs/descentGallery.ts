import * as THREE from 'three';
import {
  buildBatchedBoxesMesh,
  type BoxSpec,
  type HideoutMaterialRegistry,
} from '../materials';
import { FLOOR_CATALOG, type FloorNumber } from '../types';
import { buildStraightStairFlight } from './straightStairs';
import type { FloorGeometryCollector } from './types';

/**
 * Builds the Grand Folded U-Turn Descent Airlock Gallery connecting Floor `fromFloor` (`yTop`)
 * smoothly down 14.0m to Floor `toFloor` (`yBot = yTop - 14.0`).
 */
export function buildDescentAirlockGallery(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry,
  fromFloor: FloorNumber,
  toFloor: FloorNumber,
  yTop: number,
  exitSide: 'north' | 'south',
  portalZ = 17.0
): void {
  const dir = exitSide === 'north' ? -1 : 1;
  const yBot = yTop - 14.0;
  const yMid = yTop - 7.0;
  const zPortal = dir * portalZ;
  const zVestEnd = dir * (portalZ + 3.5);
  const zFlightEnd = dir * (portalZ + 15.0);
  const zFarWall = dir * (portalZ + 18.6);

  const wallSpecs: BoxSpec[] = [];
  const floorSpecs: BoxSpec[] = [];
  const trimSpecs: BoxSpec[] = [];
  const lightSpecs: BoxSpec[] = [];

  const minZVest = Math.min(zPortal, zVestEnd);
  const maxZVest = Math.max(zPortal, zVestEnd);
  const minZMid = Math.min(zFlightEnd, zFarWall);
  const maxZMid = Math.max(zFlightEnd, zFarWall);
  const minZAll = Math.min(zPortal, zFarWall);
  const maxZAll = Math.max(zPortal, zFarWall);
  const fullH = 19.6;
  const midWallY = yBot + fullH * 0.5;

  // 1. Upper Airlock Vestibule slab
  floorSpecs.push({
    w: 11.4,
    h: 0.5,
    d: 3.48,
    x: 0,
    y: yTop - 0.252,
    z: (zPortal + zVestEnd) * 0.5 + dir * 0.01,
  });
  collector.slabs.push({
    minX: -5.6,
    maxX: 5.6,
    minZ: minZVest - 0.3,
    maxZ: maxZVest + 0.3,
    y: yTop,
  });

  // 2. Grand Mid-Landing slab
  floorSpecs.push({
    w: 11.4,
    h: 0.55,
    d: 3.54,
    x: 0,
    y: yMid - 0.275,
    z: (zFlightEnd + zFarWall) * 0.5,
  });
  collector.slabs.push({
    minX: -5.6,
    maxX: 5.6,
    minZ: minZMid - 0.3,
    maxZ: maxZMid + 0.3,
    y: yMid,
  });

  // 3. Lower Arrival Hall slab
  floorSpecs.push({
    w: 11.4,
    h: 0.55,
    d: 3.48,
    x: 0,
    y: yBot - 0.278,
    z: (zPortal + zVestEnd) * 0.5 + dir * 0.01,
  });
  collector.slabs.push({
    minX: -5.6,
    maxX: 5.6,
    minZ: minZVest - 1.2,
    maxZ: maxZVest + 1.2,
    y: yBot,
  });

  // 4. Flight 1 (West lane)
  const flightMinZ = Math.min(zVestEnd, zFlightEnd);
  const flightMaxZ = Math.max(zVestEnd, zFlightEnd);
  const flightLen = flightMaxZ - flightMinZ;
  const flightCenterZ = (flightMinZ + flightMaxZ) * 0.5;

  buildStraightStairFlight(collector, mats, {
    x: -3.2,
    z: flightCenterZ,
    width: 4.66,
    length: flightLen,
    yStart: dir === -1 ? yMid : yTop,
    yEnd: dir === -1 ? yTop : yMid,
    axis: 'z',
    steps: 28,
    railMinSide: false,
    railMaxSide: true,
    accentMat: mats.floorAccent[fromFloor],
  });

  // 5. Flight 2 (East lane)
  buildStraightStairFlight(collector, mats, {
    x: 3.2,
    z: flightCenterZ,
    width: 4.66,
    length: flightLen,
    yStart: dir === -1 ? yMid : yBot,
    yEnd: dir === -1 ? yBot : yMid,
    axis: 'z',
    steps: 28,
    railMinSide: true,
    railMaxSide: false,
    accentMat: mats.floorAccent[toFloor],
  });

  // 6. Enclosing architectural shaft walls + central spine divider + roof
  const shaftStartZ = zPortal + dir * 0.31;
  const shaftEndZ = zFarWall + dir * 0.3;
  const shaftLen = Math.abs(shaftEndZ - shaftStartZ);
  const shaftCenterZ = (shaftStartZ + shaftEndZ) * 0.5;
  const sideWallLen = Math.max(0.5, shaftLen - 0.62);
  const sideWallCenterZ = shaftCenterZ - dir * 0.31;
  const sideWallH = fullH - 0.02;

  wallSpecs.push(
    { w: 0.6, h: sideWallH, d: sideWallLen, x: -5.85, y: midWallY - 0.01, z: sideWallCenterZ },
    { w: 0.6, h: sideWallH, d: sideWallLen, x: 5.85, y: midWallY - 0.01, z: sideWallCenterZ }
  );
  wallSpecs.push({ w: 12.3, h: fullH - 0.02, d: 0.6, x: 0, y: midWallY - 0.01, z: zFarWall + dir * 0.3 });
  wallSpecs.push({ w: 12.38, h: 0.6, d: shaftLen + 0.06, x: 0, y: yTop + 5.76, z: shaftCenterZ });
  wallSpecs.push({
    w: 1.4,
    h: fullH - 0.04,
    d: flightLen + 0.2,
    x: 0,
    y: midWallY - 0.02,
    z: flightCenterZ,
  });

  // Upper vestibule east-edge guardrail
  wallSpecs.push({
    w: 4.8,
    h: 1.15,
    d: 0.22,
    x: 3.1,
    y: yTop + 0.58,
    z: zVestEnd,
  });

  collector.boxes.push(
    { minX: -6.2, maxX: -5.5, minY: yBot, maxY: yTop + 6, minZ: minZAll - 0.4, maxZ: maxZAll + 0.4, walkableTop: false },
    { minX: 5.5, maxX: 6.2, minY: yBot, maxY: yTop + 6, minZ: minZAll - 0.4, maxZ: maxZAll + 0.4, walkableTop: false },
    {
      minX: -6.2,
      maxX: 6.2,
      minY: yBot,
      maxY: yTop + 6,
      minZ: dir === -1 ? zFarWall - 0.6 : zFarWall,
      maxZ: dir === -1 ? zFarWall : zFarWall + 0.6,
      walkableTop: false,
    },
    {
      minX: -0.75,
      maxX: 0.75,
      minY: yBot,
      maxY: yTop + 6,
      minZ: flightMinZ - 0.1,
      maxZ: flightMaxZ + 0.1,
      walkableTop: false,
    },
    {
      minX: 0.7,
      maxX: 5.6,
      minY: yTop,
      maxY: yTop + 1.4,
      minZ: zVestEnd - 0.18,
      maxZ: zVestEnd + 0.18,
      walkableTop: false,
    }
  );

  for (let i = 0; i < 6; i++) {
    const t = (i + 0.5) / 6;
    const rz = zPortal + (zFarWall - zPortal) * t;
    trimSpecs.push({ w: 11.2, h: 0.36, d: 0.32, x: 0, y: yTop + 5.3, z: rz });
    lightSpecs.push({ w: 8.4, h: 0.1, d: 0.22, x: 0, y: yTop + 5.1, z: rz });
  }
  lightSpecs.push({
    w: 7.4,
    h: 0.16,
    d: 0.12,
    x: 0,
    y: yMid + 3.4,
    z: zFarWall - dir * 0.08,
  });

  const stencilMat = mats.createStencilMaterial(
    `0${toFloor}`,
    `DESCEND TO FLOOR 0${toFloor}`,
    FLOOR_CATALOG[toFloor].accentHex,
    `FROM FLOOR 0${fromFloor} AIRLOCK`
  );
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2), stencilMat);
  plaque.position.set(0, yMid + 2.1, zFarWall - dir * 0.06);
  if (dir === 1) plaque.rotation.y = Math.PI;
  collector.group.add(plaque);

  const wallMesh = buildBatchedBoxesMesh(wallSpecs, mats.concreteWall, {
    receiveShadow: true,
    name: `DescentWalls_${fromFloor}_to_${toFloor}`,
  });
  if (wallMesh) {
    collector.group.add(wallMesh);
    collector.wallMeshes.push(wallMesh);
  }

  const floorMesh = buildBatchedBoxesMesh(floorSpecs, mats.concreteFloor, {
    receiveShadow: true,
    name: `DescentFloors_${fromFloor}_to_${toFloor}`,
  });
  if (floorMesh) {
    collector.group.add(floorMesh);
    collector.wallMeshes.push(floorMesh);
  }

  const trimMesh = buildBatchedBoxesMesh(trimSpecs, mats.structuralSteel, {
    name: `DescentRibs_${fromFloor}`,
  });
  if (trimMesh) collector.group.add(trimMesh);

  const lightMesh = buildBatchedBoxesMesh(lightSpecs, mats.floorAccent[toFloor], {
    name: `DescentLights_${fromFloor}`,
  });
  if (lightMesh) collector.group.add(lightMesh);
}
