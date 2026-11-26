import * as THREE from 'three';
import type { ProceduralTextureSet } from '../../core/textures';
import {
  resetHeavyAmmoCrates,
  stepHeavyAmmoCrates,
  type HeavyAmmoCrate,
} from '../props/ammoCrates';
import {
  resetBayTargets,
  stepBayTargets,
  type InteractiveTarget,
} from '../props/targets';
import { buildFloor1Complex } from './floors/floor01';
import { buildFloor2Complex } from './floors/floor02';
import { buildFloor3Complex } from './floors/floor03';
import { buildFloor4Complex } from './floors/floor04';
import { buildFloor5Complex } from './floors/floor05';
import { buildFloor6Complex } from './floors/floor06';
import { buildFloor7Complex } from './floors/floor07';
import { buildFloor8Complex } from './floors/floor08';
import {
  FloorStreamer,
  type FloorThresholdSpec,
  type StreamerEvent,
} from './floorStreamer';
import { createHideoutMaterials, type HideoutMaterialRegistry } from './materials';
import { resetTacticalDoors, stepTacticalDoors } from './mechanics';
import {
  FLOOR_CATALOG,
  type CollisionWorld3D,
  type ExplosiveBarrelRig,
  type FloorBuildResult,
  type FloorMeta,
  type FloorNumber,
  type ShootableLockRig,
  type TacticalDoorRig,
} from './types';
import {
  resetWorldMechanics,
  stepWorldMechanics,
  triggerExplosiveBarrelInList,
} from './mechanics';

export { FloorStreamer, type StreamerEvent } from './floorStreamer';
export { FLOOR_CATALOG, FLOOR_PITCH_METERS, getFloorBaseY } from './types';
export type {
  CollisionWorld3D,
  FloorBuildResult,
  FloorMeta,
  FloorNumber,
  TacticalDoorRig,
} from './types';

export interface NearbyInteraction {
  kind: 'control_center' | 'world_switch' | 'express_lift' | 'hint';
  floor: FloorNumber;
  prompt: string;
  activated?: boolean;
  targetFloor?: FloorNumber;
  switchId?: string;
  isLockedGate?: boolean;
}

export interface InteractionResult {
  kind: 'control_center' | 'world_switch' | 'express_lift';
  floor: FloorNumber;
  targetFloor?: FloorNumber;
  switchId?: string;
  bannerText?: string;
  deployedBridge?: boolean;
  unlockedGate?: boolean;
  spawnPoint?: { x: number; y: number; z: number; yaw: number };
}

export interface LockTriggerResult {
  lockId: string;
  floor: FloorNumber;
  bannerText: string;
  deployedBridge: boolean;
  unlockedGate: boolean;
}

export interface EightFloorHideout {
  group: THREE.Group;
  streamer: FloorStreamer;
  floors: Record<FloorNumber, FloorBuildResult>;
  materials: HideoutMaterialRegistry;
  /** Zero-GC aggregated active-floor collision world (rebuilt ONLY when active floor set changes!) */
  readonly activeCollisionWorld: CollisionWorld3D;
  /** Active-floor wall/door raycast meshes */
  readonly activeWallMeshes: THREE.Object3D[];
  /** Active-floor reactive targets */
  readonly activeTargets: InteractiveTarget[];
  /** Active-floor target hitboxes */
  readonly activeTargetHitboxes: THREE.Object3D[];
  /** Active-floor shootable security relay locks */
  readonly activeShootableLocks: ShootableLockRig[];
  /** Active-floor shootable security relay hitboxes */
  readonly activeLockHitboxes: THREE.Object3D[];
  /** Active-floor pressurized explosive plasma barrels */
  readonly activeExplosiveBarrels: ExplosiveBarrelRig[];
  /** Active-floor explosive barrel raycast hitboxes */
  readonly activeBarrelHitboxes: THREE.Object3D[];
  /** Active-floor .50 HV ammo crates */
  readonly activeAmmoCrates: HeavyAmmoCrate[];
  /** Active-floor motorized & jammed tactical doors */
  readonly activeTacticalDoors: TacticalDoorRig[];
  getCurrentFloorMeta: () => FloorMeta;
  getSpawnPoint: (floor: FloorNumber) => { x: number; y: number; z: number; yaw: number };
  getNearbyInteraction: (px: number, py: number, pz: number) => NearbyInteraction | null;
  triggerInteraction: (px: number, py: number, pz: number) => InteractionResult | null;
  triggerShootableLock: (lockId: string) => LockTriggerResult | null;
  triggerExplosiveBarrel: (barrelId: string) => ExplosiveBarrelRig[];
  activateWorldSwitch: (switchId: string) => InteractionResult | null;
  unlockFloorDoor: (floor: FloorNumber) => boolean;
  teleportToFloor: (floor: FloorNumber) => { x: number; y: number; z: number; yaw: number };
  update: (
    dt: number,
    elapsed: number,
    playerPos: THREE.Vector3,
    cameraPos: THREE.Vector3
  ) => StreamerEvent[];
  resetAll: () => void;
  dispose: () => void;
}

const ALL_FLOORS: FloorNumber[] = [8, 7, 6, 5, 4, 3, 2, 1];
const DETAIL_CULL_DIST_SQ = 26 * 26;

interface PooledLightingRig {
  hemi: THREE.HemisphereLight;
  key: THREE.DirectionalLight;
  fill: THREE.DirectionalLight;
  points: THREE.PointLight[];
  tmpColor: THREE.Color;
  tmpFogColor: THREE.Color;
  snapToFloor: (floor: FloorBuildResult, anchorX?: number, anchorZ?: number) => void;
  updateLerp: (dt: number, floor: FloorBuildResult, anchorX: number, anchorZ: number) => void;
  dispose: (scene: THREE.Scene) => void;
}

function createPooledLightingRig(
  scene: THREE.Scene,
  isSoftwareGl: boolean
): PooledLightingRig {
  const hemi = new THREE.HemisphereLight(0xaad4f5, 0x263142, 1.0);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xe6f2ff, 2.3);
  key.castShadow = !isSoftwareGl;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1.0;
  key.shadow.camera.far = 54;
  key.shadow.camera.left = -22;
  key.shadow.camera.right = 22;
  key.shadow.camera.top = 22;
  key.shadow.camera.bottom = -22;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.025;
  scene.add(key);
  scene.add(key.target);

  const fill = new THREE.DirectionalLight(0x67e8f9, 0.7);
  fill.position.set(-12, 106, -12);
  scene.add(fill);
  scene.add(fill.target);

  // Strictly 4 pooled PointLights that smoothly track the active floor!
  const points: THREE.PointLight[] = [];
  for (let i = 0; i < 4; i++) {
    const pl = new THREE.PointLight(0x38bdf8, 12, 24, 1.5);
    pl.castShadow = false;
    scene.add(pl);
    points.push(pl);
  }

  const tmpColor = new THREE.Color();
  const tmpFogColor = new THREE.Color();

  const snapToFloor = (floor: FloorBuildResult, anchorX = 0, anchorZ = 0) => {
    const p = floor.lightPreset;
    const baseY = floor.meta.baseY;
    hemi.color.setHex(p.hemiSky);
    hemi.groundColor.setHex(p.hemiGround);
    hemi.intensity = p.hemiIntensity;

    key.color.setHex(p.keyColor);
    key.intensity = p.keyIntensity;
    key.position.set(anchorX + p.keyOffset[0], baseY + p.keyOffset[1], anchorZ + p.keyOffset[2]);
    key.target.position.set(anchorX, baseY + 1.0, anchorZ);
    key.target.updateMatrixWorld();

    fill.color.setHex(p.fillColor);
    fill.intensity = p.fillIntensity;
    fill.position.set(anchorX - p.keyOffset[0] * 0.8, baseY + 6.5, anchorZ - p.keyOffset[2] * 0.8);
    fill.target.position.set(anchorX, baseY + 1.0, anchorZ);
    fill.target.updateMatrixWorld();

    if (scene.background instanceof THREE.Color) {
      scene.background.setHex(p.fogColor);
    }
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.setHex(p.fogColor);
      scene.fog.density = p.fogDensity;
    }

    for (let i = 0; i < points.length; i++) {
      const spec = p.pointLights[i];
      if (spec) {
        points[i].visible = true;
        points[i].color.setHex(spec.color);
        points[i].intensity = spec.intensity;
        points[i].distance = spec.distance;
        points[i].position.set(spec.x, baseY + spec.yOffset, spec.z);
      } else {
        points[i].visible = false;
      }
    }
  };

  const updateLerp = (dt: number, floor: FloorBuildResult, anchorX: number, anchorZ: number) => {
    const p = floor.lightPreset;
    const baseY = floor.meta.baseY;
    const k = 1 - Math.exp(-4.5 * dt);

    hemi.color.lerp(tmpColor.setHex(p.hemiSky), k);
    hemi.groundColor.lerp(tmpColor.setHex(p.hemiGround), k);
    hemi.intensity += (p.hemiIntensity - hemi.intensity) * k;

    key.color.lerp(tmpColor.setHex(p.keyColor), k);
    key.intensity += (p.keyIntensity - key.intensity) * k;
    key.position.x += (anchorX + p.keyOffset[0] - key.position.x) * k;
    key.position.y += (baseY + p.keyOffset[1] - key.position.y) * k;
    key.position.z += (anchorZ + p.keyOffset[2] - key.position.z) * k;
    key.target.position.x += (anchorX - key.target.position.x) * k;
    key.target.position.y += (baseY + 1.0 - key.target.position.y) * k;
    key.target.position.z += (anchorZ - key.target.position.z) * k;
    key.target.updateMatrixWorld();

    fill.color.lerp(tmpColor.setHex(p.fillColor), k);
    fill.intensity += (p.fillIntensity - fill.intensity) * k;
    fill.position.x += (anchorX - p.keyOffset[0] * 0.8 - fill.position.x) * k;
    fill.position.y += (baseY + 6.5 - fill.position.y) * k;
    fill.position.z += (anchorZ - p.keyOffset[2] * 0.8 - fill.position.z) * k;
    fill.target.position.x += (anchorX - fill.target.position.x) * k;
    fill.target.position.y += (baseY + 1.0 - fill.target.position.y) * k;
    fill.target.position.z += (anchorZ - fill.target.position.z) * k;
    fill.target.updateMatrixWorld();

    tmpFogColor.setHex(p.fogColor);
    if (scene.background instanceof THREE.Color) {
      scene.background.lerp(tmpFogColor, k);
    }
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.lerp(tmpFogColor, k);
      scene.fog.density += (p.fogDensity - scene.fog.density) * k;
    }

    for (let i = 0; i < points.length; i++) {
      const spec = p.pointLights[i];
      if (!spec) {
        points[i].visible = false;
        continue;
      }
      points[i].visible = true;
      points[i].color.lerp(tmpColor.setHex(spec.color), k);
      points[i].intensity += (spec.intensity - points[i].intensity) * k;
      points[i].distance += (spec.distance - points[i].distance) * k;
      points[i].position.x += (spec.x - points[i].position.x) * k;
      points[i].position.y += (baseY + spec.yOffset - points[i].position.y) * k;
      points[i].position.z += (spec.z - points[i].position.z) * k;
    }
  };

  const dispose = (s: THREE.Scene) => {
    s.remove(hemi, key, key.target, fill, fill.target, ...points);
  };

  return { hemi, key, fill, points, tmpColor, tmpFogColor, snapToFloor, updateLerp, dispose };
}

/**
 * Node-safe & browser-ready Eight-Floor Hideout orchestrator.
 * Pass `scene` in browser runtime to mount the Single Pooled Lighting & Tight Shadow-Frustum Rig.
 */
export function createEightFloorHideout(
  textures?: ProceduralTextureSet | null,
  scene?: THREE.Scene | null,
  isSoftwareGl = false
): EightFloorHideout {
  const group = new THREE.Group();
  group.name = 'NIGHTSHADE_EIGHT_FLOOR_HIDEOUT';

  const materials = createHideoutMaterials(textures);

  const floors: Record<FloorNumber, FloorBuildResult> = {
    8: buildFloor8Complex(materials),
    7: buildFloor7Complex(materials),
    6: buildFloor6Complex(materials),
    5: buildFloor5Complex(materials),
    4: buildFloor4Complex(materials),
    3: buildFloor3Complex(materials),
    2: buildFloor2Complex(materials),
    1: buildFloor1Complex(materials),
  };

  const thresholds: Partial<Record<FloorNumber, FloorThresholdSpec>> = {};
  for (const num of ALL_FLOORS) {
    group.add(floors[num].group);
    thresholds[num] = floors[num].entryThreshold;
  }

  const streamer = new FloorStreamer(thresholds);
  const lightingRig = scene ? createPooledLightingRig(scene, isSoftwareGl) : null;

  // Reusable zero-GC aggregated collections (mutated in-place ONLY when active floor set changes!)
  const activeCollisionWorld: CollisionWorld3D = {
    boxes: [],
    slabs: [],
    ramps: [],
    arcRamps: [],
    ringSlabs: [],
    bounds: { minX: -26, maxX: 26, minZ: -38, maxZ: 38 },
    minSafeY: floors[8].meta.baseY - 9.0,
    fallbackSpawn: {
      x: floors[8].spawnPoint.x,
      y: floors[8].spawnPoint.y,
      z: floors[8].spawnPoint.z,
    },
  };
  const activeWallMeshes: THREE.Object3D[] = [];
  const activeTargets: InteractiveTarget[] = [];
  const activeTargetHitboxes: THREE.Object3D[] = [];
  const activeShootableLocks: ShootableLockRig[] = [];
  const activeLockHitboxes: THREE.Object3D[] = [];
  const activeExplosiveBarrels: ExplosiveBarrelRig[] = [];
  const activeBarrelHitboxes: THREE.Object3D[] = [];
  const activeAmmoCrates: HeavyAmmoCrate[] = [];
  const activeTacticalDoors: TacticalDoorRig[] = [];

  let activeFloorMask = -1;

  const computeActiveMask = (): number => {
    let mask = 0;
    for (const num of ALL_FLOORS) {
      if (streamer.isFloorActive(num)) mask |= 1 << num;
    }
    return mask | (streamer.currentFloor << 12);
  };

  const rebuildActiveBuffers = (): void => {
    activeCollisionWorld.boxes.length = 0;
    activeCollisionWorld.slabs.length = 0;
    activeCollisionWorld.ramps.length = 0;
    activeCollisionWorld.arcRamps.length = 0;
    activeCollisionWorld.ringSlabs.length = 0;
    activeWallMeshes.length = 0;
    activeTargets.length = 0;
    activeTargetHitboxes.length = 0;
    activeShootableLocks.length = 0;
    activeLockHitboxes.length = 0;
    activeExplosiveBarrels.length = 0;
    activeBarrelHitboxes.length = 0;
    activeAmmoCrates.length = 0;
    activeTacticalDoors.length = 0;

    let minActiveBaseY = Infinity;
    let customMinSafeY = Infinity;
    let bMinX = -26;
    let bMaxX = 26;
    let bMinZ = -38;
    let bMaxZ = 38;

    for (const num of ALL_FLOORS) {
      const f = floors[num];
      const active = streamer.isFloorActive(num);
      f.group.visible = active;
      if (!active) continue;

      if (f.meta.baseY < minActiveBaseY) minActiveBaseY = f.meta.baseY;
      if (f.minSafeY !== undefined && f.minSafeY < customMinSafeY) customMinSafeY = f.minSafeY;
      if (f.bounds) {
        if (f.bounds.minX < bMinX) bMinX = f.bounds.minX;
        if (f.bounds.maxX > bMaxX) bMaxX = f.bounds.maxX;
        if (f.bounds.minZ < bMinZ) bMinZ = f.bounds.minZ;
        if (f.bounds.maxZ > bMaxZ) bMaxZ = f.bounds.maxZ;
      }

      for (let i = 0; i < f.boxes.length; i++) activeCollisionWorld.boxes.push(f.boxes[i]);
      for (let i = 0; i < f.slabs.length; i++) activeCollisionWorld.slabs.push(f.slabs[i]);
      for (let i = 0; i < f.ramps.length; i++) activeCollisionWorld.ramps.push(f.ramps[i]);
      for (let i = 0; i < f.arcRamps.length; i++) activeCollisionWorld.arcRamps.push(f.arcRamps[i]);
      for (let i = 0; i < f.ringSlabs.length; i++) activeCollisionWorld.ringSlabs.push(f.ringSlabs[i]);
      for (let i = 0; i < f.wallMeshes.length; i++) activeWallMeshes.push(f.wallMeshes[i]);
      for (let i = 0; i < f.targets.length; i++) activeTargets.push(f.targets[i]);
      for (let i = 0; i < f.targetHitboxes.length; i++) activeTargetHitboxes.push(f.targetHitboxes[i]);
      if (f.shootableLocks) {
        for (let i = 0; i < f.shootableLocks.length; i++) {
          activeShootableLocks.push(f.shootableLocks[i]);
          activeLockHitboxes.push(f.shootableLocks[i].hitbox);
        }
      }
      if (f.explosiveBarrels) {
        for (let i = 0; i < f.explosiveBarrels.length; i++) {
          activeExplosiveBarrels.push(f.explosiveBarrels[i]);
          activeBarrelHitboxes.push(f.explosiveBarrels[i].hitbox);
        }
      }
      for (let i = 0; i < f.ammoCrates.length; i++) activeAmmoCrates.push(f.ammoCrates[i]);
      if (f.tacticalDoors) {
        for (let i = 0; i < f.tacticalDoors.length; i++) activeTacticalDoors.push(f.tacticalDoors[i]);
      }
    }

    const cur = floors[streamer.currentFloor];
    activeCollisionWorld.bounds.minX = bMinX;
    activeCollisionWorld.bounds.maxX = bMaxX;
    activeCollisionWorld.bounds.minZ = bMinZ;
    activeCollisionWorld.bounds.maxZ = bMaxZ;
    const defaultMinSafeY =
      (Number.isFinite(minActiveBaseY) ? minActiveBaseY : cur.meta.baseY) - 9.0;
    activeCollisionWorld.minSafeY = Math.min(defaultMinSafeY, customMinSafeY);
    activeCollisionWorld.fallbackSpawn.x = cur.spawnPoint.x;
    activeCollisionWorld.fallbackSpawn.y = cur.spawnPoint.y;
    activeCollisionWorld.fallbackSpawn.z = cur.spawnPoint.z;

    activeFloorMask = computeActiveMask();
  };

  const syncAllDoorVisuals = (): void => {
    for (const num of ALL_FLOORS) {
      const f = floors[num];
      const st = streamer.getDoorState(num);
      const ratio = streamer.getDoorOpenRatio(num);
      const unlocked = st === 'opening' || st === 'open';
      f.exitDoor.setOpenRatio(ratio, unlocked);
      f.controlCenter.setActivated(unlocked || ratio > 0.02);

      // Synchronize arrival bulkhead door on Floor N with Floor N+1's exit door during descent!
      if (f.arrivalDoor && num < 8) {
        const upperFloor = (num + 1) as FloorNumber;
        const upperRatio = streamer.getDoorOpenRatio(upperFloor);
        const upperSt = streamer.getDoorState(upperFloor);
        const upperUnlocked = upperSt === 'opening' || upperSt === 'open';
        const isIncoming =
          streamer.transitioningFrom === upperFloor &&
          (streamer.transitioningTo === num || streamer.currentFloor === num);
        if (isIncoming || upperRatio > 0.001) {
          f.arrivalDoor.setOpenRatio(upperRatio, upperUnlocked);
        } else {
          f.arrivalDoor.setOpenRatio(0, false);
        }
      }
    }
  };

  // Initial steady state: ONLY Floor 8 visible & active!
  syncAllDoorVisuals();
  rebuildActiveBuffers();
  lightingRig?.snapToFloor(floors[8], floors[8].spawnPoint.x, floors[8].spawnPoint.z);

  const activateLinkedMechanics = (
    floor: FloorBuildResult,
    deployBridgeId?: string,
    unlockGateId?: string
  ): { deployedBridge: boolean; unlockedGate: boolean } => {
    let deployedBridge = false;
    let unlockedGate = false;
    if (deployBridgeId && floor.retractableBridges) {
      for (const br of floor.retractableBridges) {
        if (br.id === deployBridgeId) {
          br.deployed = true;
          br.targetRatio = 1;
          br.applyVisuals();
          deployedBridge = true;
        }
      }
      // Also mark any switch controlling the same bridge as activated so prompts stay synced!
      if (floor.worldSwitches) {
        for (const sw of floor.worldSwitches) {
          if (sw.deployBridgeId === deployBridgeId) {
            sw.activated = true;
            sw.applyVisuals();
          }
        }
      }
    }
    if (unlockGateId && floor.securityGates) {
      for (const gt of floor.securityGates) {
        if (gt.id === unlockGateId) {
          gt.unlocked = true;
          gt.targetRatio = 1;
          gt.applyVisuals();
          unlockedGate = true;
        }
      }
      if (floor.worldSwitches) {
        for (const sw of floor.worldSwitches) {
          if (sw.unlockGateId === unlockGateId) {
            sw.activated = true;
            sw.applyVisuals();
          }
        }
      }
    }
    return { deployedBridge, unlockedGate };
  };

  const getNearbyInteraction = (px: number, py: number, pz: number): NearbyInteraction | null => {
    for (const num of ALL_FLOORS) {
      if (!streamer.isFloorActive(num)) continue;
      const f = floors[num];

      // 1. Check Floor Control Center proximity
      const cc = f.controlCenter;
      if (Math.abs(py - cc.position.y) < 2.2) {
        const dist = Math.hypot(px - cc.position.x, pz - cc.position.z);
        if (dist <= cc.interactRadius) {
          const st = streamer.getDoorState(num);
          const alreadyOpen = st === 'opening' || st === 'open';
          return {
            kind: 'control_center',
            floor: num,
            prompt: alreadyOpen ? cc.promptUnlocked : cc.promptLocked,
            activated: alreadyOpen,
          };
        }
      }

      // 2. Check interactive World Switches (skybridge overrides / shortcut unlocks)
      if (f.worldSwitches) {
        for (let i = 0; i < f.worldSwitches.length; i++) {
          const sw = f.worldSwitches[i];
          if (Math.abs(py - sw.y) < 2.1) {
            const dist = Math.hypot(px - sw.x, pz - sw.z);
            if (dist <= sw.interactRadius) {
              return {
                kind: 'world_switch',
                floor: num,
                switchId: sw.id,
                prompt: sw.activated ? sw.promptActivated : sw.promptLocked,
                activated: sw.activated,
              };
            }
          }
        }
      }

      // 3. Check sealed Security Gate proximity for clear locked-gate HUD feedback!
      if (f.securityGates) {
        for (let i = 0; i < f.securityGates.length; i++) {
          const gt = f.securityGates[i];
          if (gt.unlocked) continue;
          if (Math.abs(py - gt.y) < 2.1) {
            const dist = Math.hypot(px - gt.x, pz - gt.z);
            if (dist <= 3.6) {
              return {
                kind: 'hint',
                floor: num,
                prompt: gt.lockedHint,
                isLockedGate: true,
              };
            }
          }
        }
      }

      // 4. Check jammed blast shutter proximity for clear HUD dodge-roll cue!
      if (f.tacticalDoors) {
        for (let i = 0; i < f.tacticalDoors.length; i++) {
          const td = f.tacticalDoors[i];
          if (td.mode !== 'jammed_roll') continue;
          if (Math.abs(py - td.position.y) < 1.8) {
            const dist = Math.hypot(px - td.position.x, pz - td.position.z);
            if (dist <= 3.8) {
              return {
                kind: 'hint',
                floor: num,
                prompt: 'SHUTTER JAMMED · PRESS [V] OR [SHIFT+SPACE] TO DODGE ROLL UNDER',
              };
            }
          }
        }
      }
    }
    return null;
  };

  const unlockFloorDoor = (floor: FloorNumber): boolean => {
    const triggered = streamer.activateFloorControl(floor);
    if (triggered) {
      syncAllDoorVisuals();
      rebuildActiveBuffers();
    }
    return triggered;
  };

  const triggerShootableLock = (lockId: string): LockTriggerResult | null => {
    for (const num of ALL_FLOORS) {
      if (!streamer.isFloorActive(num)) continue;
      const f = floors[num];
      if (!f.shootableLocks) continue;
      const lock = f.shootableLocks.find((l) => l.id === lockId);
      if (!lock || lock.destroyed) continue;
      lock.destroyed = true;
      lock.applyVisuals(0);
      const { deployedBridge, unlockedGate } = activateLinkedMechanics(
        f,
        lock.deployBridgeId,
        lock.unlockGateId
      );
      return {
        lockId: lock.id,
        floor: num,
        bannerText: lock.bannerText,
        deployedBridge,
        unlockedGate,
      };
    }
    return null;
  };

  const activateWorldSwitch = (switchId: string): InteractionResult | null => {
    for (const num of ALL_FLOORS) {
      if (!streamer.isFloorActive(num)) continue;
      const f = floors[num];
      if (!f.worldSwitches) continue;
      const sw = f.worldSwitches.find((s) => s.id === switchId);
      if (!sw || sw.activated) continue;
      sw.activated = true;
      sw.applyVisuals();
      const { deployedBridge, unlockedGate } = activateLinkedMechanics(
        f,
        sw.deployBridgeId,
        sw.unlockGateId
      );
      return {
        kind: 'world_switch',
        floor: num,
        switchId: sw.id,
        bannerText: sw.bannerText,
        deployedBridge,
        unlockedGate,
      };
    }
    return null;
  };

  const triggerExplosiveBarrel = (barrelId: string): ExplosiveBarrelRig[] => {
    for (const num of ALL_FLOORS) {
      if (!streamer.isFloorActive(num)) continue;
      const f = floors[num];
      if (!f.explosiveBarrels) continue;
      const detonated = triggerExplosiveBarrelInList(f.explosiveBarrels, barrelId);
      if (detonated.length > 0) return detonated;
    }
    return [];
  };

  const teleportToFloor = (floor: FloorNumber) => {
    streamer.teleportToFloor(floor);
    for (const num of ALL_FLOORS) {
      const f = floors[num];
      resetTacticalDoors(f.tacticalDoors);
      resetWorldMechanics(
        f.retractableBridges,
        f.securityGates,
        f.shootableLocks,
        f.jumpPads,
        f.worldSwitches,
        f.explosiveBarrels
      );
    }
    syncAllDoorVisuals();
    rebuildActiveBuffers();
    lightingRig?.snapToFloor(floors[floor], floors[floor].spawnPoint.x, floors[floor].spawnPoint.z);
    return { ...floors[floor].spawnPoint };
  };

  const triggerInteraction = (px: number, py: number, pz: number): InteractionResult | null => {
    const near = getNearbyInteraction(px, py, pz);
    if (!near) return null;
    if (near.kind === 'control_center') {
      if (near.activated) return null;
      const ok = unlockFloorDoor(near.floor);
      if (!ok) return null;
      return {
        kind: 'control_center',
        floor: near.floor,
        targetFloor: near.floor > 1 ? ((near.floor - 1) as FloorNumber) : undefined,
      };
    }
    if (near.kind === 'world_switch' && near.switchId) {
      if (near.activated) return null;
      return activateWorldSwitch(near.switchId);
    }
    return null;
  };

  const update = (
    dt: number,
    elapsed: number,
    playerPos: THREE.Vector3,
    cameraPos: THREE.Vector3
  ): StreamerEvent[] => {
    const events = streamer.step(dt, playerPos.x, playerPos.y, playerPos.z);

    // Sync doors & rebuild active buffers whenever active floor set or current floor changed
    syncAllDoorVisuals();
    const mask = computeActiveMask();
    if (mask !== activeFloorMask) {
      rebuildActiveBuffers();
    }

    // Update ONLY active floors (0 CPU updates on inactive floors!)
    for (const num of ALL_FLOORS) {
      if (!streamer.isFloorActive(num)) continue;
      const f = floors[num];

      stepBayTargets(f.targets, dt, elapsed);
      stepHeavyAmmoCrates(f.ammoCrates, dt, elapsed, cameraPos);
      f.controlCenter.updateVisuals(elapsed);

      // Step interior motorized proximity sliding doors & jammed dodge-roll blast shutters
      const doorEvents = stepTacticalDoors(
        f.tacticalDoors,
        dt,
        elapsed,
        playerPos.x,
        playerPos.y,
        playerPos.z
      );
      for (let d = 0; d < doorEvents.length; d++) {
        const dev = doorEvents[d];
        events.push({
          kind:
            dev.kind === 'slide_open'
              ? 'tactical_door_open'
              : dev.kind === 'slide_close'
                ? 'tactical_door_close'
                : 'tactical_door_jam',
          floor: num,
          doorId: dev.doorId,
        });
      }

      // Step interactive world mechanics (retractable skybridges, security gates, shootable locks, jump pads, explosive barrels, kinetic spinners)
      const mechEvents = stepWorldMechanics(
        f.retractableBridges,
        f.securityGates,
        f.shootableLocks,
        f.jumpPads,
        dt,
        elapsed,
        playerPos.x,
        playerPos.y,
        playerPos.z,
        f.explosiveBarrels,
        f.animatedSpinners
      );
      for (let m = 0; m < mechEvents.length; m++) {
        const mev = mechEvents[m];
        events.push({
          kind: mev.kind,
          floor: num,
          mechanicId: mev.id,
          launchVy: mev.launchVy,
          launchVx: mev.launchVx,
          launchVz: mev.launchVz,
        });
      }

      // Sub-floor OcclusionCell culling: hide unseen side alcoves / Inner Sanctum when distant!
      for (let i = 0; i < f.occlusionCells.length; i++) {
        const cell = f.occlusionCells[i];
        const b = cell.triggerBounds;
        const insideTrigger =
          playerPos.x >= b.minX &&
          playerPos.x <= b.maxX &&
          playerPos.z >= b.minZ &&
          playerPos.z <= b.maxZ;
        const dx = cameraPos.x - cell.center.x;
        const dz = cameraPos.z - cell.center.z;
        const closeEnough = dx * dx + dz * dz <= cell.maxViewDistance * cell.maxViewDistance;
        // Also reveal Floor 1 Inner Sanctum immediately once Final Core Vault 01 starts opening!
        const sanctumOpen =
          cell.id === 'floor1_inner_sanctum' && streamer.getDoorOpenRatio(1) > 0.02;
        cell.group.visible = insideTrigger || closeEnough || sanctumOpen;
      }

      // Detail distance culling on secondary architectural trim meshes (active floor always renders full detail across all vertical tiers!)
      const dy = cameraPos.y - (f.meta.baseY + 2.0);
      f.detailGroup.visible = num === streamer.currentFloor || dy * dy <= DETAIL_CULL_DIST_SQ;
    }

    // Smoothly transition the single pooled lighting & shadow-frustum rig to follow the player on the active floor
    lightingRig?.updateLerp(dt, floors[streamer.currentFloor], playerPos.x, playerPos.z);

    return events;
  };

  const resetAll = (): void => {
    for (const num of ALL_FLOORS) {
      const f = floors[num];
      resetBayTargets(f.targets);
      resetHeavyAmmoCrates(f.ammoCrates);
      resetTacticalDoors(f.tacticalDoors);
      resetWorldMechanics(
        f.retractableBridges,
        f.securityGates,
        f.shootableLocks,
        f.jumpPads,
        f.worldSwitches,
        f.explosiveBarrels
      );
    }
    streamer.reset();
    syncAllDoorVisuals();
    rebuildActiveBuffers();
    lightingRig?.snapToFloor(floors[8], floors[8].spawnPoint.x, floors[8].spawnPoint.z);
  };

  const dispose = (): void => {
    if (lightingRig && scene) lightingRig.dispose(scene);
    for (const num of ALL_FLOORS) {
      floors[num].dispose();
    }
    materials.dispose();
  };

  return {
    group,
    streamer,
    floors,
    materials,
    activeCollisionWorld,
    activeWallMeshes,
    activeTargets,
    activeTargetHitboxes,
    activeShootableLocks,
    activeLockHitboxes,
    activeExplosiveBarrels,
    activeBarrelHitboxes,
    activeAmmoCrates,
    activeTacticalDoors,
    getCurrentFloorMeta: () => floors[streamer.currentFloor].meta,
    getSpawnPoint: (floor) => ({ ...floors[floor].spawnPoint }),
    getNearbyInteraction,
    triggerInteraction,
    triggerShootableLock,
    triggerExplosiveBarrel,
    activateWorldSwitch,
    unlockFloorDoor,
    teleportToFloor,
    update,
    resetAll,
    dispose,
  };
}
