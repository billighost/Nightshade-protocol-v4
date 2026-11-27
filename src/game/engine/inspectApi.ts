import * as THREE from 'three';
import type { EightFloorHideout, FloorNumber } from '../arena/hideout';
import type {
  OperativeLocomotionState as LocomotionState,
  WeaponId,
  WeaponSystemState,
} from '../core/types';
import type { TacticalAudioEngine } from '../effects/audio';
import { computeMuzzleBasis, computeRecoilCameraImpulse } from '../effects/ballistics';
import type { CombatVfxPool } from '../effects/vfxPool';
import type { CyberpunkOperativeRig } from '../player';
import type { EnemyHitZone } from '../enemies/core/types';
import type { Floor05EncounterDirector } from '../enemies/floor05';
import { BRUTE_ATTACKS } from '../enemies/floor05/shieldChariotBrute/tactics';
import type { ShieldChariotBruteRigHandle } from '../enemies/floor05/shieldChariotBrute/mesh';
import { EXECUTIONER_ATTACKS } from '../enemies/floor05/dualCleaverExecutioner/tactics';
import { EXECUTIONER_POSES, type DualCleaverExecutionerRigHandle } from '../enemies/floor05/dualCleaverExecutioner/mesh';
import type { Floor06EncounterDirector } from '../enemies/floor06';
import type { Floor07EncounterDirector } from '../enemies/floor07';
import type { Floor08EncounterDirector } from '../enemies/floor08';
import type { PlayerHitReactionState } from '../player/hitReaction';
import type { Floor08TutorialMachine } from '../tutorial';
import type { TacticalCameraRig } from './cameraRig';
import type { CombatController } from './combatController';
import type { EngineInputController } from './inputController';
import type { InspectCameraOverride, InspectPoseOverride } from './types';

export interface InspectApiHost {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  hideout: EightFloorHideout;
  playerRig: CyberpunkOperativeRig;
  vfx: CombatVfxPool;
  audio: TacticalAudioEngine;
  cameraRig: TacticalCameraRig;
  combat: CombatController;
  input: EngineInputController;
  floor08Director: Floor08EncounterDirector;
  floor07Director: Floor07EncounterDirector;
  floor06Director: Floor06EncounterDirector;
  floor05Director: Floor05EncounterDirector;
  tutorial: Floor08TutorialMachine;
  hitReaction: PlayerHitReactionState;
  getLocomotion: () => LocomotionState;
  getWeaponState: () => WeaponSystemState;
  getCharacterYaw: () => number;
  setCharacterYaw: (yaw: number) => void;
  setCameraOverride: (ov: InspectCameraOverride | null) => void;
  setPoseOverride: (pose: InspectPoseOverride | null) => void;
  start: () => void;
  skipTutorial: () => void;
  completeTutorialAndDeploy: () => void;
  applyPlayerHit: (damage: number, fromWorldPos: THREE.Vector3, staggerStrength?: number) => void;
  warpToFloor: (floor: FloorNumber) => void;
  tryInteract: () => boolean;
  showBanner: (text: string, duration?: number) => void;
  stepSimulation: (dt: number) => void;
  updateCamera: (dt: number) => void;
  emitHud: () => void;
}

/**
 * Exposes the non-intrusive multi-angle QA inspection helper (`window.__nightshadeInspect`).
 */
export function installNightshadeInspectApi(host: InspectApiHost): void {
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const tmpC = new THREE.Vector3();
  const tmpFwd = new THREE.Vector3();
  const tmpRight = new THREE.Vector3();
  const tmpUp = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();
  const tmpNormal = new THREE.Vector3();
  const tmpVentPosL = new THREE.Vector3();
  const tmpVentPosR = new THREE.Vector3();
  const tmpVentDirL = new THREE.Vector3();
  const tmpVentDirR = new THREE.Vector3();
  const tmpVentUp = new THREE.Vector3();

  (window as unknown as Record<string, unknown>).__nightshadeInspect = {
    setCamera: (
      pos: [number, number, number] | null,
      lookAt?: [number, number, number],
      fov?: number
    ) => {
      host.setCameraOverride(!pos || !lookAt ? null : { pos, lookAt, fov });
      host.updateCamera(0);
      host.renderer.render(host.scene, host.camera);
    },
    setPose: (pose: InspectPoseOverride | null) => {
      host.setPoseOverride(pose);
      if (pose?.weapon) {
        host.getWeaponState().activeWeapon = pose.weapon;
      }
    },
    startGame: () => host.start(),
    getPlayerPos: () => {
      const l = host.getLocomotion();
      return {
        x: l.x,
        y: l.y,
        z: l.z,
        vy: l.vy,
        grounded: l.grounded,
        supportY: l.supportY,
        rollTimer: l.rollTimer,
        sprinting: l.sprinting,
      };
    },
    spawnLandingDust: (intensity = 0.95) => {
      const l = host.getLocomotion();
      host.vfx.spawnJumpDustRing(new THREE.Vector3(l.x, l.y, l.z), intensity, true);
    },
    fireInspectShot: (opts?: {
      weapon?: WeaponId;
      overcharged?: boolean;
      impactKind?: 'concrete' | 'metal' | 'critical';
      impactDistance?: number;
    }) => {
      const ws = host.getWeaponState();
      const w = opts?.weapon ?? ws.activeWeapon;
      const overcharged = opts?.overcharged ?? false;
      ws.activeWeapon = w;
      host.combat.combatReadyTimer = 1.6;
      const imp = computeRecoilCameraImpulse(w, overcharged, 1);
      host.cameraRig.recoilKick = Math.min(1, host.cameraRig.recoilKick + imp.recoilKick);
      host.cameraRig.recoilFovKick = Math.min(4.8, host.cameraRig.recoilFovKick + imp.fovKickDeg);
      host.cameraRig.recoilZPunch = Math.min(0.14, host.cameraRig.recoilZPunch + imp.zPunchMeters);
      host.cameraRig.shotPulse = Math.max(host.cameraRig.shotPulse, imp.opticalShotPulse);
      if (w === 'heavy') host.cameraRig.heavyPulse = 1.0;

      host.playerRig.root.updateMatrixWorld(true);
      const muzzlePos = host.playerRig.getActiveMuzzleWorldPosition(w, tmpA);
      const ejectPos = host.playerRig.getActiveEjectionWorldPosition(w, tmpB);
      host.playerRig.getActiveMuzzleWorldQuaternion(w, tmpQuat);
      computeMuzzleBasis(tmpQuat, tmpFwd, tmpRight, tmpUp);

      const isCyan = overcharged;
      const mode = w === 'heavy' ? 'heavy_brake' : w === 'smg' ? 'compensator' : 'suppressed';
      const lightPeak = w === 'heavy' ? 15.0 : w === 'smg' ? 7.8 : 4.8;
      host.vfx.triggerMuzzleFlash(muzzlePos, isCyan, lightPeak, mode, tmpFwd, tmpRight, tmpUp);
      host.vfx.spawnCasing(ejectPos, tmpRight, w === 'heavy' ? 1.68 : 1.0);

      const dist = opts?.impactDistance ?? 5.5;
      const hitPos = tmpC.copy(muzzlePos).addScaledVector(tmpFwd, dist);
      const hitNormal = tmpNormal.copy(tmpFwd).negate();
      const tracerStyle = isCyan ? 'cyan' : w === 'heavy' ? 'heavy' : 'standard';
      host.vfx.spawnTracer(muzzlePos, hitPos, tracerStyle);

      const power = w === 'heavy' ? 1.85 : 1.0;
      const kind = opts?.impactKind ?? 'metal';
      if (kind === 'concrete') {
        host.vfx.spawnConcreteImpact(hitPos, hitNormal, power);
      } else {
        host.vfx.spawnMetalImpact(hitPos, hitNormal, kind === 'critical', overcharged, power);
      }
      host.emitHud();
      host.updateCamera(0.016);
      host.renderer.render(host.scene, host.camera);
      return { muzzlePos: muzzlePos.toArray(), hitPos: hitPos.toArray() };
    },
    triggerOverheatPreview: () => {
      const ws = host.getWeaponState();
      ws.activeWeapon = 'smg';
      ws.smg.heat = 100;
      ws.smg.overheated = true;
      ws.smg.venting = true;
      ws.bannerKind = 'overheated';
      ws.bannerTimer = 2.0;
      host.cameraRig.heatPulse = 0.95;
      host.combat.combatReadyTimer = 1.6;
      host.playerRig.root.updateMatrixWorld(true);
      for (let step = 0; step < 6; step++) {
        host.playerRig.getSmgVentWorldBasis(
          tmpVentPosL,
          tmpVentPosR,
          tmpVentDirL,
          tmpVentDirR,
          tmpVentUp
        );
        host.vfx.spawnOverheatSteamAndSparks(
          tmpVentPosL,
          tmpVentPosR,
          tmpVentDirL,
          tmpVentDirR,
          tmpVentUp,
          true,
          1.25
        );
        host.vfx.update(0.045);
      }
      host.emitHud();
      host.updateCamera(0.016);
      host.renderer.render(host.scene, host.camera);
    },
    teleportPlayer: (x: number, z: number, y?: number) => {
      const l = host.getLocomotion();
      l.x = x;
      l.z = z;
      if (typeof y === 'number') {
        l.y = y;
        l.supportY = y;
        l.vy = 0;
        l.grounded = true;
      }
      host.playerRig.root.position.set(x, l.y, z);
    },
    teleportToFloor: (floorNum: FloorNumber) => {
      host.warpToFloor(floorNum);
      host.updateCamera(0.016);
      host.renderer.render(host.scene, host.camera);
      return host.hideout.getCurrentFloorMeta();
    },
    unlockFloorDoor: (floorNum: FloorNumber) => {
      const ok = host.hideout.unlockFloorDoor(floorNum);
      if (ok) {
        host.audio.playConsoleActivate();
        host.audio.playBulkheadDoorOpen();
        host.showBanner(
          floorNum === 1
            ? 'FINAL CORE VAULT 01 UNSEALED'
            : `BULKHEAD 0${floorNum} UNSEALED · FLOOR 0${floorNum - 1} READY`
        );
        host.emitHud();
      }
      return ok;
    },
    triggerInteract: () => host.tryInteract(),
    triggerLock: (lockId: string) => {
      const res = host.hideout.triggerShootableLock(lockId);
      if (res) {
        host.audio.playLockShatter();
        if (res.deployedBridge) host.audio.playBridgeDeploy();
        if (res.unlockedGate) host.audio.playTacticalDoorSlide(true);
        host.showBanner(res.bannerText, 3.2);
        host.emitHud();
      }
      return res;
    },
    activateSwitch: (switchId: string) => {
      const res = host.hideout.activateWorldSwitch(switchId);
      if (res) {
        host.audio.playConsoleActivate();
        if (res.deployedBridge) host.audio.playBridgeDeploy();
        if (res.unlockedGate) host.audio.playTacticalDoorSlide(true);
        if (res.bannerText) host.showBanner(res.bannerText, 3.2);
        host.emitHud();
      }
      return res;
    },
    triggerBarrel: (barrelId: string) => host.combat.detonateExplosiveBarrel(barrelId),
    getExplosiveBarrels: () =>
      host.hideout.activeExplosiveBarrels.map((b) => ({
        id: b.id,
        x: b.x,
        y: b.y,
        z: b.z,
        detonated: b.detonated,
        colliderActive: b.collider.active !== false,
      })),
    getActiveFloors: () => host.hideout.streamer.getActiveFloorList(),
    getCurrentFloor: () => {
      const m = host.hideout.getCurrentFloorMeta();
      return { number: m.number, name: m.name, baseY: m.baseY };
    },
    getDrawCalls: () => host.renderer.info.render.calls,
    getDoorOpenRatio: (floorNum: FloorNumber) => host.hideout.streamer.getDoorOpenRatio(floorNum),
    getTacticalDoors: () =>
      host.hideout.activeTacticalDoors.map((d) => ({
        id: d.id,
        mode: d.mode,
        x: d.position.x,
        y: d.position.y,
        z: d.position.z,
        spanAxis: d.spanAxis,
        openRatio: d.openRatio,
        targetRatio: d.targetRatio,
        jamTriggered: d.jamTriggered,
        colliderActive: d.collider.active !== false,
        colliderMinY: d.collider.minY,
        colliderMaxY: d.collider.maxY,
      })),
    setCameraYaw: (yaw: number) => {
      host.cameraRig.yaw = yaw;
      host.setCharacterYaw(yaw);
    },
    getCharacterYaw: () => host.getCharacterYaw(),
    getCameraYaw: () => host.cameraRig.yaw,
    setHeldKeys: (codes: string[]) => host.input.setHeldKeys(codes),
    triggerRoll: () => {
      host.input.rollJustPressed = true;
    },
    stepSim: (seconds: number, stepDt = 0.05) => {
      const dt = Math.max(0.01, Math.min(0.05, stepDt));
      const steps = Math.max(1, Math.ceil(seconds / dt));
      for (let i = 0; i < steps; i++) {
        host.stepSimulation(dt);
      }
      host.renderer.render(host.scene, host.camera);
      return true;
    },
    getCrateStatus: () =>
      host.hideout.activeAmmoCrates.map((c) => ({
        id: c.id,
        x: c.position.x,
        y: c.position.y,
        z: c.position.z,
        available: c.available,
        cooldownRemaining: c.cooldownRemaining,
      })),
    getWeaponState: () => {
      const ws = host.getWeaponState();
      return {
        activeWeapon: ws.activeWeapon,
        pistolAmmo: ws.pistol.ammo,
        pistolMaxAmmo: ws.pistol.maxAmmo,
        smgHeat: ws.smg.heat,
        smgOverheated: ws.smg.overheated,
        heavyAmmo: ws.heavy.ammo,
        heavyMaxAmmo: ws.heavy.maxAmmo,
        heavyReserveAmmo: ws.heavy.reserveAmmo,
        heavyMaxReserveAmmo: ws.heavy.maxReserveAmmo,
      };
    },
    // --- Phase 3: Floor 08 Interactive Tutorial, Enemies, Boss & Hit-Reaction QA Hooks ---
    getTutorialState: () => host.tutorial.getHudState(),
    skipTutorial: () => {
      host.skipTutorial();
      host.updateCamera(0.016);
      host.renderer.render(host.scene, host.camera);
      return host.tutorial.getHudState();
    },
    completeTutorial: () => {
      host.completeTutorialAndDeploy();
      host.updateCamera(0.016);
      host.renderer.render(host.scene, host.camera);
      return host.floor08Director.manager.getInspectSnapshot();
    },
    getEnemies: () => {
      const floorNum = host.hideout.getCurrentFloorMeta().number;
      if (floorNum === 5) return host.floor05Director.manager.getInspectSnapshot();
      if (floorNum === 6) return host.floor06Director.manager.getInspectSnapshot();
      return floorNum === 7
        ? host.floor07Director.manager.getInspectSnapshot()
        : host.floor08Director.manager.getInspectSnapshot();
    },
    getFloor08Encounter: () => {
      const l = host.getLocomotion();
      return host.floor08Director.getHudState(l.x, l.z);
    },
    getFloor07Encounter: () => {
      const l = host.getLocomotion();
      return host.floor07Director.getHudState(l.x, l.z);
    },
    getFloor06Encounter: () => {
      const l = host.getLocomotion();
      return host.floor06Director.getHudState(l.x, l.z);
    },
    getFloor05Encounter: () => {
      const l = host.getLocomotion();
      return host.floor05Director.getHudState(l.x, l.z);
    },
    spawnBossNow: () => {
      const floorNum = host.hideout.getCurrentFloorMeta().number;
      if (floorNum === 5) {
        const spawned = host.floor05Director.spawnFloorBossNow();
        host.emitHud();
        host.renderer.render(host.scene, host.camera);
        return spawned ? 'f5_boss_apex_marauder' : null;
      }
      if (floorNum === 6) {
        const spawned = host.floor06Director.spawnFloorBossNow();
        host.emitHud();
        host.renderer.render(host.scene, host.camera);
        return spawned ? 'f6_boss_monolith_archon' : null;
      }
      if (floorNum === 7) {
        const spawned = host.floor07Director.spawnFloorBossNow();
        host.emitHud();
        host.renderer.render(host.scene, host.camera);
        return spawned ? 'f7_boss_bastion' : null;
      }
      const boss = host.floor08Director.spawnFloorBossNow();
      host.emitHud();
      host.renderer.render(host.scene, host.camera);
      return boss ? boss.id : null;
    },
    spawnFloor07BossNow: () => {
      const spawned = host.floor07Director.spawnFloorBossNow();
      host.emitHud();
      host.renderer.render(host.scene, host.camera);
      return spawned ? 'f7_boss_bastion' : null;
    },
    spawnFloor06BossNow: () => {
      const spawned = host.floor06Director.spawnFloorBossNow();
      host.emitHud();
      host.renderer.render(host.scene, host.camera);
      return spawned ? 'f6_boss_monolith_archon' : null;
    },
    spawnFloor05BossNow: () => {
      const spawned = host.floor05Director.spawnFloorBossNow();
      host.emitHud();
      host.renderer.render(host.scene, host.camera);
      return spawned ? 'f5_boss_apex_marauder' : null;
    },
    damageEnemy: (enemyId: string, damage: number, hitZone: EnemyHitZone = 'weakpoint') => {
      const mgr = host.floor05Director.manager.getEnemyById(enemyId)
        ? host.floor05Director.manager
        : host.floor06Director.manager.getEnemyById(enemyId)
          ? host.floor06Director.manager
          : host.floor07Director.manager.getEnemyById(enemyId)
            ? host.floor07Director.manager
            : host.floor08Director.manager;
      const e = mgr.getEnemyById(enemyId);
      if (!e) return null;
      if (hitZone === 'weakpoint' && e.config.weakpoint.requiresExposedWindow) {
        e.state.weakpoint.exposed = true;
        e.state.weakpoint.exposedTimer = 3.0;
      }
      const wpPos = e.rig.getWeakpointWorldPos(tmpA);
      const res = mgr.applyHit(enemyId, damage, hitZone, wpPos, 1);
      host.emitHud();
      host.renderer.render(host.scene, host.camera);
      return res;
    },
    clearAllFloor08Enemies: () => {
      // Eliminate all current enemies, trigger Commander Kestrel-08, then eliminate Kestrel-08 too!
      for (let pass = 0; pass < 3; pass++) {
        const list = [...host.floor08Director.manager.allEnemies];
        for (const e of list) {
          if (!e.state.alive) continue;
          const pos = e.rig.getWeakpointWorldPos(tmpA);
          host.floor08Director.manager.applyHit(e.id, 99999, 'body', pos, 1);
        }
        host.stepSimulation(0.05);
      }
      host.emitHud();
      host.renderer.render(host.scene, host.camera);
      const l = host.getLocomotion();
      return host.floor08Director.getHudState(l.x, l.z);
    },
    clearAllFloor07Enemies: () => {
      // Eliminate all 20 initial Floor 07 enemies, trigger TITAN-RIG "BASTION-VII", then eliminate Bastion-VII too!
      for (let pass = 0; pass < 3; pass++) {
        const list = [...host.floor07Director.manager.allEnemies];
        for (const e of list) {
          if (!e.state.alive) continue;
          const pos = e.rig.getWeakpointWorldPos(tmpA);
          host.floor07Director.manager.applyHit(e.id, 99999, 'body', pos, 1);
        }
        host.stepSimulation(0.05);
      }
      host.emitHud();
      host.renderer.render(host.scene, host.camera);
      const l = host.getLocomotion();
      return host.floor07Director.getHudState(l.x, l.z);
    },
    clearAllFloor06Enemies: () => {
      // Eliminate all 23 initial Floor 06 enemies, trigger THE MONOLITH ARCHON, then eliminate THE MONOLITH ARCHON too!
      for (let pass = 0; pass < 3; pass++) {
        const list = [...host.floor06Director.manager.allEnemies];
        for (const e of list) {
          if (!e.state.alive) continue;
          const pos = e.rig.getWeakpointWorldPos(tmpA);
          host.floor06Director.manager.applyHit(e.id, 99999, 'body', pos, 1);
        }
        host.stepSimulation(0.05);
      }
      host.emitHud();
      host.renderer.render(host.scene, host.camera);
      const l = host.getLocomotion();
      return host.floor06Director.getHudState(l.x, l.z);
    },
    clearAllFloor05Enemies: () => {
      // Eliminate all 27 initial Floor 05 hostiles, trigger APEX ARENA MARAUDER, then eliminate APEX ARENA MARAUDER too!
      for (let pass = 0; pass < 3; pass++) {
        const list = [...host.floor05Director.manager.allEnemies];
        for (const e of list) {
          if (!e.state.alive) continue;
          const pos = e.rig.getWeakpointWorldPos(tmpA);
          host.floor05Director.manager.applyHit(e.id, 99999, 'body', pos, 1);
        }
        host.stepSimulation(0.05);
      }
      host.emitHud();
      host.renderer.render(host.scene, host.camera);
      const l = host.getLocomotion();
      return host.floor05Director.getHudState(l.x, l.z);
    },
    selectWeapon: (w: WeaponId) => {
      host.getWeaponState().activeWeapon = w;
      host.emitHud();
      host.renderer.render(host.scene, host.camera);
    },
    focusEnemy: (enemyId: string, dist = 3.1, heightOffset = 1.25, angleOffset = 0.32) => {
      const e =
        host.floor05Director.manager.getEnemyById(enemyId) ??
        host.floor06Director.manager.getEnemyById(enemyId) ??
        host.floor07Director.manager.getEnemyById(enemyId) ??
        host.floor08Director.manager.getEnemyById(enemyId);
      if (!e) return false;
      const yaw = e.spatial.yaw + angleOffset;
      const fx = -Math.sin(yaw);
      const fz = -Math.cos(yaw);
      const camX = e.spatial.x + fx * dist;
      const camY = e.spatial.y + heightOffset;
      const camZ = e.spatial.z + fz * dist;
      host.setCameraOverride({
        pos: [camX, camY, camZ],
        lookAt: [e.spatial.x, e.spatial.y + e.spatial.height * 0.54, e.spatial.z],
        fov: 44,
      });
      host.updateCamera(0.016);
      host.renderer.render(host.scene, host.camera);
      return true;
    },
    triggerPlayerHitTest: (fromOffsetX = 0, fromOffsetZ = -4, staggerStrength = 0.85) => {
      const l = host.getLocomotion();
      host.applyPlayerHit(
        22,
        tmpA.set(l.x + fromOffsetX, l.y + 1.2, l.z + fromOffsetZ),
        staggerStrength
      );
      host.stepSimulation(0.03);
      host.renderer.render(host.scene, host.camera);
      return {
        hp: host.hitReaction.hp,
        maxHp: host.hitReaction.maxHp,
        hitsTaken: host.hitReaction.hitsTaken,
        damagePulse: host.hitReaction.damagePulse,
        flinchTimer: host.hitReaction.flinchTimer,
        vignette: { ...host.hitReaction.vignette },
      };
    },
    showcaseKatanaAction: (
      enemyId: string,
      mode: 'guard' | 'iaijutsu' | 'slash_scar' | 'release' = 'guard'
    ) => {
      if (mode === 'release') {
        host.floor08Director.manager.setShowcaseLock(null);
        return true;
      }
      const e = host.floor08Director.manager.getEnemyById(enemyId);
      if (!e) return false;
      host.floor08Director.manager.setShowcaseLock(enemyId);
      const vfx = host.floor08Director.manager.vfx;
      const rigExt = e.rig as unknown as {
        setDashTelegraph?: (visible: boolean, length?: number, pulse?: number) => void;
        getEyeGlintWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
      };
      const fx = -Math.sin(e.spatial.yaw);
      const fz = -Math.cos(e.spatial.yaw);

      if (mode === 'guard') {
        vfx.clear();
        rigExt.setDashTelegraph?.(false);
        e.state.weakpoint.exposed = false;
        for (let i = 0; i < 20; i++) {
          e.rig.updateAnimation({
            dt: 0.04,
            elapsed: 1.2 + i * 0.04,
            behavior: 'chase',
            speedRatio: 0.04,
            localMoveX: 0,
            localMoveZ: 0.04,
            aimPitch: 0,
            attackProgress: 0,
            attackVariant: 0,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: false,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
            boosterIntensity: 0.14,
          });
        }
      } else if (mode === 'iaijutsu') {
        vfx.clear();
        rigExt.setDashTelegraph?.(true, 6.4, 0.95);
        e.state.weakpoint.exposed = false;
        for (let i = 0; i < 22; i++) {
          e.rig.updateAnimation({
            dt: 0.04,
            elapsed: 2.0 + i * 0.04,
            behavior: 'windup',
            speedRatio: 0,
            localMoveX: 0,
            localMoveZ: 0,
            aimPitch: 0,
            attackProgress: 0.78,
            attackVariant: 3,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: false,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
            boosterIntensity: 1.05,
          });
        }
        e.rig.root.updateMatrixWorld(true);
        const glintPos = rigExt.getEyeGlintWorldPos
          ? rigExt.getEyeGlintWorldPos(tmpA)
          : tmpA.set(e.spatial.x, e.spatial.y + 1.45, e.spatial.z);
        vfx.spawnPerilGlint(glintPos, 0xffffff);
        vfx.update(0.06, host.camera.position);
      } else {
        vfx.clear();
        rigExt.setDashTelegraph?.(false);
        e.state.weakpoint.exposed = true;
        e.state.weakpoint.exposedTimer = 4.0;
        for (let i = 0; i < 22; i++) {
          e.rig.updateAnimation({
            dt: 0.04,
            elapsed: 3.1 + i * 0.04,
            behavior: 'attack',
            speedRatio: 0.45,
            localMoveX: 0,
            localMoveZ: 0.45,
            aimPitch: 0,
            attackProgress: 0.5,
            attackVariant: 3,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
            boosterIntensity: 1.4,
          });
        }
        e.rig.root.updateMatrixWorld(true);
        vfx.spawnBladeSlashArc(
          tmpA.set(e.spatial.x + fx * 0.55, e.spatial.y + 1.15, e.spatial.z + fz * 0.55),
          e.spatial.yaw,
          -0.28,
          0.12,
          2.65,
          0xff2846,
          true,
          1
        );
        vfx.spawnSurfaceSlashScar(
          tmpB.set(e.spatial.x + fx * 1.45, e.spatial.y + 0.04, e.spatial.z + fz * 1.45),
          tmpNormal.set(0, 1, 0),
          tmpFwd.set(fx, 0, fz).normalize(),
          true
        );
        vfx.spawnBoosterBurst(
          tmpC.set(e.spatial.x - fx * 0.34, e.spatial.y + 1.12, e.spatial.z - fz * 0.34),
          tmpRight.set(-fx, -0.55, -fz).normalize(),
          0xff4a1f,
          22
        );
        vfx.update(0.05, host.camera.position);
      }
      host.renderer.render(host.scene, host.camera);
      return true;
    },
    showcaseBreacherAction: (
      enemyId: string,
      mode: 'aim' | 'rail_lock' | 'jet_dash' | 'release' = 'aim'
    ) => {
      if (mode === 'release') {
        host.floor08Director.manager.setShowcaseLock(null);
        return true;
      }
      const e = host.floor08Director.manager.getEnemyById(enemyId);
      if (!e) return false;
      host.floor08Director.manager.setShowcaseLock(enemyId);
      const vfx = host.floor08Director.manager.vfx;
      const rigExt = e.rig as unknown as {
        setLaserSight?: (visible: boolean, length?: number, charge?: number) => void;
        getLaserOriginWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
        getOpticGlintWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
      };
      const fx = -Math.sin(e.spatial.yaw);
      const fz = -Math.cos(e.spatial.yaw);
      const rx = Math.cos(e.spatial.yaw);
      const rz = -Math.sin(e.spatial.yaw);

      if (mode === 'aim') {
        vfx.clear();
        e.state.weakpoint.exposed = true;
        for (let i = 0; i < 22; i++) {
          e.rig.updateAnimation({
            dt: 0.04,
            elapsed: 1.4 + i * 0.04,
            behavior: 'attack',
            speedRatio: 0.08,
            localMoveX: 0,
            localMoveZ: 0,
            aimPitch: 0,
            attackProgress: 0.25,
            attackVariant: 0,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
            boosterIntensity: 0,
          });
        }
        rigExt.setLaserSight?.(true, 6.2, 0.28);
        e.rig.root.updateMatrixWorld(true);
        const muzzle = e.rig.getMuzzleWorldPos(tmpA);
        vfx.spawnMuzzleFlash(muzzle, tmpFwd.set(fx, 0, fz).normalize(), 0xff5a2c, false);
        vfx.update(0.025, host.camera.position);
      } else if (mode === 'rail_lock') {
        vfx.clear();
        e.state.weakpoint.exposed = true;
        for (let i = 0; i < 24; i++) {
          e.rig.updateAnimation({
            dt: 0.04,
            elapsed: 2.2 + i * 0.04,
            behavior: 'windup',
            speedRatio: 0,
            localMoveX: 0,
            localMoveZ: 0,
            aimPitch: 0,
            attackProgress: 0.84,
            attackVariant: 1,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
            boosterIntensity: 0,
          });
        }
        rigExt.setLaserSight?.(true, 5.2, 0.96);
        e.rig.root.updateMatrixWorld(true);
        const glintPos = rigExt.getOpticGlintWorldPos
          ? rigExt.getOpticGlintWorldPos(tmpA)
          : tmpA.set(e.spatial.x, e.spatial.y + 1.32, e.spatial.z);
        vfx.spawnPerilGlint(glintPos, 0xffd27a);
        const muzzle = e.rig.getMuzzleWorldPos(tmpB);
        vfx.spawnMuzzleFlash(muzzle, tmpFwd.set(fx, 0, fz).normalize(), 0xffb84a, true);
        vfx.spawnRailImpactCrater(
          tmpC.set(e.spatial.x + fx * 1.45 - rx * 0.35, e.spatial.y + 0.03, e.spatial.z + fz * 1.45 - rz * 0.35),
          tmpNormal.set(0, 1, 0),
          0xff6a1a
        );
        vfx.update(0.05, host.camera.position);
      } else {
        vfx.clear();
        rigExt.setLaserSight?.(false);
        e.state.weakpoint.exposed = true;
        for (let i = 0; i < 22; i++) {
          e.rig.updateAnimation({
            dt: 0.04,
            elapsed: 3.1 + i * 0.04,
            behavior: 'attack',
            speedRatio: 0.92,
            localMoveX: 1,
            localMoveZ: -0.25,
            aimPitch: 0,
            attackProgress: 0.45,
            attackVariant: 2,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0.14,
            boosterIntensity: 1.15,
          });
        }
        e.rig.root.updateMatrixWorld(true);
        vfx.spawnBoosterBurst(
          tmpA.set(e.spatial.x - fx * 0.28, e.spatial.y + 1.24, e.spatial.z - fz * 0.28),
          tmpRight.set(-fx - rx * 0.55, -0.45, -fz - rz * 0.55).normalize(),
          0x48e8ff,
          24
        );
        vfx.update(0.04, host.camera.position);
      }
      host.renderer.render(host.scene, host.camera);
      return true;
    },
    showcaseAegisAction: (
      enemyId: string,
      mode: 'guard' | 'bull_rush' | 'shield_slam' | 'shattered' | 'release' = 'guard'
    ) => {
      if (mode === 'release') {
        host.floor08Director.manager.setShowcaseLock(null);
        return true;
      }
      const e = host.floor08Director.manager.getEnemyById(enemyId);
      if (!e) return false;
      host.floor08Director.manager.setShowcaseLock(enemyId);
      const vfx = host.floor08Director.manager.vfx;
      const projectiles = host.floor08Director.manager.projectiles;
      const rigExt = e.rig as unknown as {
        getVisorGlintWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
      };
      const fx = -Math.sin(e.spatial.yaw);
      const fz = -Math.cos(e.spatial.yaw);

      if (mode === 'guard') {
        vfx.clear();
        projectiles.clear();
        e.state.shieldActive = true;
        for (let i = 0; i < 24; i++) {
          e.rig.updateAnimation({
            dt: 0.04,
            elapsed: 1.4 + i * 0.04,
            behavior: 'windup',
            speedRatio: 0.05,
            localMoveX: 0,
            localMoveZ: 0.05,
            aimPitch: 0,
            attackProgress: 0.65,
            attackVariant: 0,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: true,
            phase: 1,
            airborneHeight: 0,
            boosterIntensity: 0,
          });
        }
        e.rig.root.updateMatrixWorld(true);
        const muzzle = e.rig.getMuzzleWorldPos(tmpA);
        vfx.spawnMuzzleFlash(muzzle, tmpFwd.set(fx, 0, fz).normalize(), 0x38e8ff, false);
        vfx.update(0.025, host.camera.position);
      } else if (mode === 'bull_rush') {
        vfx.clear();
        projectiles.clear();
        e.state.shieldActive = true;
        for (let i = 0; i < 24; i++) {
          e.rig.updateAnimation({
            dt: 0.04,
            elapsed: 2.2 + i * 0.04,
            behavior: 'attack',
            speedRatio: 1.0,
            localMoveX: 0,
            localMoveZ: 1.0,
            aimPitch: 0,
            attackProgress: 0.5,
            attackVariant: 1,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: true,
            phase: 1,
            airborneHeight: 0,
            boosterIntensity: 1.35,
          });
        }
        e.rig.root.updateMatrixWorld(true);
        const glintPos = rigExt.getVisorGlintWorldPos
          ? rigExt.getVisorGlintWorldPos(tmpA)
          : tmpA.set(e.spatial.x, e.spatial.y + 1.55, e.spatial.z);
        vfx.spawnPerilGlint(glintPos, 0x7ef6ff);
        vfx.spawnBoosterBurst(
          tmpB.set(e.spatial.x - fx * 0.38, e.spatial.y + 1.24, e.spatial.z - fz * 0.38),
          tmpRight.set(-fx, -0.35, -fz).normalize(),
          0x22d3ee,
          24
        );
        vfx.update(0.04, host.camera.position);
      } else if (mode === 'shield_slam') {
        vfx.clear();
        projectiles.clear();
        e.state.shieldActive = true;
        for (let i = 0; i < 24; i++) {
          e.rig.updateAnimation({
            dt: 0.04,
            elapsed: 3.1 + i * 0.04,
            behavior: 'attack',
            speedRatio: 0,
            localMoveX: 0,
            localMoveZ: 0,
            aimPitch: 0,
            attackProgress: 0.52,
            attackVariant: 2,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: true,
            phase: 1,
            airborneHeight: 0,
            boosterIntensity: 0,
          });
        }
        e.rig.root.updateMatrixWorld(true);
        const slamX = e.spatial.x + fx * 0.72;
        const slamZ = e.spatial.z + fz * 0.72;
        projectiles.spawnShockwave({
          center: tmpA.set(slamX, e.spatial.y, slamZ),
          maxRadius: 5.8,
          expandSpeed: 12.0,
          damage: 20,
          color: 0x38e8ff,
          staggerStrength: 0.88,
        });
        projectiles.update(0.14, tmpB.set(999, 999, 999), true, false, host.hideout.activeCollisionWorld);
        vfx.spawnRailImpactCrater(
          tmpC.set(slamX, e.spatial.y + 0.03, slamZ),
          tmpNormal.set(0, 1, 0),
          0x38e8ff
        );
        vfx.update(0.04, host.camera.position);
      } else {
        vfx.clear();
        projectiles.clear();
        e.state.shieldActive = false;
        for (let i = 0; i < 24; i++) {
          e.rig.updateAnimation({
            dt: 0.04,
            elapsed: 4.0 + i * 0.04,
            behavior: 'attack',
            speedRatio: 0.55,
            localMoveX: 0,
            localMoveZ: 0.55,
            aimPitch: 0,
            attackProgress: 0.3,
            attackVariant: 3,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: false,
            weakpointBroken: true,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
            boosterIntensity: 0,
          });
        }
        e.rig.root.updateMatrixWorld(true);
      }
      host.renderer.render(host.scene, host.camera);
      return true;
    },
    showcaseWardenAction: (
      enemyId: string,
      mode: 'akimbo' | 'flash_dash' | 'cyclone_sweep' | 'vent_weakpoint' | 'release'
    ) => {
      if (mode === 'release') {
        host.floor08Director.manager.setShowcaseLock(null);
        return true;
      }
      const e = host.floor08Director.manager.getEnemyById(enemyId);
      if (!e) return false;
      host.floor08Director.manager.setShowcaseLock(enemyId);
      const vfx = host.floor08Director.manager.vfx;
      const projectiles = host.floor08Director.manager.projectiles;
      const rigExt = e.rig as unknown as {
        getLeftMuzzleWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
        getRightMuzzleWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
        getOpticGlintWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
      };
      const fx = -Math.sin(e.spatial.yaw);
      const fz = -Math.cos(e.spatial.yaw);
      const rx = Math.cos(e.spatial.yaw);
      const rz = -Math.sin(e.spatial.yaw);

      if (mode === 'akimbo') {
        vfx.clear();
        projectiles.clear();
        for (let i = 0; i < 24; i++) {
          e.rig.updateAnimation({
            dt: 0.04,
            elapsed: 1.5 + i * 0.04,
            behavior: 'attack',
            speedRatio: 0.35,
            localMoveX: 0.2,
            localMoveZ: 0.3,
            aimPitch: 0,
            attackProgress: 0.42,
            attackVariant: 1,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: false,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
            boosterIntensity: 0,
          });
        }
        e.rig.root.updateMatrixWorld(true);
        const mL = rigExt.getLeftMuzzleWorldPos
          ? rigExt.getLeftMuzzleWorldPos(tmpA)
          : e.rig.getMuzzleWorldPos(tmpA);
        const mR = rigExt.getRightMuzzleWorldPos
          ? rigExt.getRightMuzzleWorldPos(tmpB)
          : e.rig.getMuzzleWorldPos(tmpB);
        tmpFwd.set(fx, 0, fz).normalize();
        vfx.spawnMuzzleFlash(mL, tmpFwd, 0xffd044, false);
        vfx.spawnMuzzleFlash(mR, tmpFwd, 0xffd044, false);
        vfx.update(0.025, host.camera.position);
      } else if (mode === 'flash_dash') {
        vfx.clear();
        projectiles.clear();
        for (let i = 0; i < 24; i++) {
          e.rig.updateAnimation({
            dt: 0.04,
            elapsed: 2.4 + i * 0.04,
            behavior: 'windup',
            speedRatio: 1.0,
            localMoveX: 1.0,
            localMoveZ: 0.15,
            aimPitch: 0,
            attackProgress: 0.55,
            attackVariant: 0,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: false,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
            boosterIntensity: 1.35,
          });
        }
        e.rig.root.updateMatrixWorld(true);
        const glintPos = rigExt.getOpticGlintWorldPos
          ? rigExt.getOpticGlintWorldPos(tmpA)
          : tmpA.set(e.spatial.x, e.spatial.y + 1.62, e.spatial.z);
        vfx.spawnPerilGlint(glintPos, 0xffd248);
        vfx.spawnBoosterBurst(
          tmpB.set(
            e.spatial.x - fx * 0.24 - rx * 0.12,
            e.spatial.y + 0.96,
            e.spatial.z - fz * 0.24 - rz * 0.12
          ),
          tmpRight.set(-rx * 0.8 - fx * 0.55, -0.15, -rz * 0.8 - fz * 0.55).normalize(),
          0xffb824,
          26
        );
        vfx.update(0.035, host.camera.position);
      } else if (mode === 'cyclone_sweep') {
        vfx.clear();
        projectiles.clear();
        for (let i = 0; i < 24; i++) {
          e.rig.updateAnimation({
            dt: 0.04,
            elapsed: 3.1 + i * 0.04,
            behavior: 'attack',
            speedRatio: 0.4,
            localMoveX: 0,
            localMoveZ: 0,
            aimPitch: 0,
            attackProgress: 0.34,
            attackVariant: 2,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: false,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
            boosterIntensity: 0.95,
          });
        }
        e.rig.root.updateMatrixWorld(true);
        projectiles.spawnShockwave({
          center: tmpC.set(e.spatial.x, e.spatial.y + 0.04, e.spatial.z),
          maxRadius: 5.6,
          expandSpeed: 13.0,
          damage: 16,
          color: 0xffb824,
          staggerStrength: 0.72,
        });
        projectiles.update(0.14, tmpB.set(999, 999, 999), true, false, host.hideout.activeCollisionWorld);
        const mL = rigExt.getLeftMuzzleWorldPos
          ? rigExt.getLeftMuzzleWorldPos(tmpA)
          : e.rig.getMuzzleWorldPos(tmpA);
        const mR = rigExt.getRightMuzzleWorldPos
          ? rigExt.getRightMuzzleWorldPos(tmpB)
          : e.rig.getMuzzleWorldPos(tmpB);
        vfx.spawnMuzzleFlash(mL, tmpFwd.set(-rx, 0, -rz).normalize(), 0xffd044, false);
        vfx.spawnMuzzleFlash(mR, tmpRight.set(rx, 0, rz).normalize(), 0xffd044, false);
        vfx.update(0.03, host.camera.position);
      } else {
        // vent_weakpoint: dorsal capacitor pylons popped up & splayed blazing solar gold
        vfx.clear();
        projectiles.clear();
        e.state.weakpoint.exposed = true;
        e.state.weakpoint.broken = false;
        for (let i = 0; i < 30; i++) {
          e.rig.updateAnimation({
            dt: 0.04,
            elapsed: 4.0 + i * 0.04,
            behavior: 'recover',
            speedRatio: 0,
            localMoveX: 0,
            localMoveZ: 0,
            aimPitch: 0,
            attackProgress: 0.5,
            attackVariant: 3,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
            boosterIntensity: 0,
          });
        }
        e.rig.root.updateMatrixWorld(true);
        const wp = e.rig.getWeakpointWorldPos(tmpA);
        vfx.spawnBoosterBurst(
          tmpVentPosL.set(wp.x - rx * 0.24, wp.y + 0.22, wp.z - rz * 0.24),
          tmpVentDirL.set(-rx * 0.45, 0.88, -rz * 0.45).normalize(),
          0xffc838,
          6
        );
        vfx.spawnBoosterBurst(
          tmpVentPosR.set(wp.x + rx * 0.24, wp.y + 0.22, wp.z + rz * 0.24),
          tmpVentDirR.set(rx * 0.45, 0.88, rz * 0.45).normalize(),
          0xffc838,
          6
        );
        vfx.update(0.04, host.camera.position);
      }
      host.renderer.render(host.scene, host.camera);
      return true;
    },
    showcasePyroAction: (
      enemyId: string,
      mode: 'thermal_sweep' | 'mortar_lob' | 'napalm_slam' | 'back_tank' | 'release'
    ) => {
      if (mode === 'release') {
        host.floor08Director.manager.setShowcaseLock(null);
        return true;
      }
      const e = host.floor08Director.manager.getEnemyById(enemyId);
      if (!e) return false;
      host.floor08Director.manager.setShowcaseLock(enemyId);
      const vfx = host.floor08Director.manager.vfx;
      const projectiles = host.floor08Director.manager.projectiles;
      const rigExt = e.rig as unknown as {
        getVisorGlintWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
      };
      const fx = -Math.sin(e.spatial.yaw);
      const fz = -Math.cos(e.spatial.yaw);

      if (mode === 'thermal_sweep') {
        vfx.clear();
        projectiles.clear();
        for (let i = 0; i < 24; i++) {
          e.rig.updateAnimation({
            dt: 0.04,
            elapsed: 1.5 + i * 0.04,
            behavior: 'attack',
            speedRatio: 0.25,
            localMoveX: 0,
            localMoveZ: 0.25,
            aimPitch: 0,
            attackProgress: 0.48,
            attackVariant: 1,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
            boosterIntensity: 0.5,
          });
        }
        e.rig.root.updateMatrixWorld(true);
        const m = e.rig.getMuzzleWorldPos(tmpA);
        vfx.spawnMuzzleFlash(m, tmpFwd.set(fx, 0, fz).normalize(), 0xff6a18, false);
        vfx.update(0.025, host.camera.position);
      } else if (mode === 'mortar_lob') {
        vfx.clear();
        projectiles.clear();
        for (let i = 0; i < 24; i++) {
          e.rig.updateAnimation({
            dt: 0.04,
            elapsed: 2.2 + i * 0.04,
            behavior: 'windup',
            speedRatio: 0,
            localMoveX: 0,
            localMoveZ: 0,
            aimPitch: 0,
            attackProgress: 0.92,
            attackVariant: 0,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
            boosterIntensity: 1.05,
          });
        }
        e.rig.root.updateMatrixWorld(true);
        const m = e.rig.getMuzzleWorldPos(tmpA);
        vfx.spawnMuzzleFlash(m, tmpFwd.set(fx * 0.78, 0.62, fz * 0.78).normalize(), 0xff7824, true);
        projectiles.spawnProjectile({
          origin: m,
          direction: tmpFwd.set(fx * 0.65, 0.76, fz * 0.65).normalize(),
          speed: 12.0,
          damage: 24,
          radius: 0.22,
          color: 0xff5a1f,
          kind: 'mortar_canister',
          gravity: 15.2,
          splashRadius: 2.9,
          targetPos: new THREE.Vector3(e.spatial.x + fx * 3.8, e.spatial.y + 0.04, e.spatial.z + fz * 3.8),
          staggerStrength: 0.86,
        });
        projectiles.update(0.12, tmpB.set(999, 999, 999), true, false, host.hideout.activeCollisionWorld);
        vfx.update(0.025, host.camera.position);
      } else if (mode === 'napalm_slam') {
        vfx.clear();
        projectiles.clear();
        for (let i = 0; i < 24; i++) {
          e.rig.updateAnimation({
            dt: 0.04,
            elapsed: 3.1 + i * 0.04,
            behavior: 'attack',
            speedRatio: 0,
            localMoveX: 0,
            localMoveZ: 0,
            aimPitch: 0,
            attackProgress: 0.45,
            attackVariant: 2,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
            boosterIntensity: 1.35,
          });
        }
        e.rig.root.updateMatrixWorld(true);
        projectiles.spawnShockwave({
          center: tmpC.set(e.spatial.x, e.spatial.y + 0.04, e.spatial.z),
          maxRadius: 6.2,
          expandSpeed: 12.2,
          damage: 24,
          color: 0xff6218,
          staggerStrength: 0.9,
        });
        projectiles.update(0.14, tmpB.set(999, 999, 999), true, false, host.hideout.activeCollisionWorld);
        vfx.spawnRailImpactCrater(
          tmpC.set(e.spatial.x, e.spatial.y + 0.03, e.spatial.z),
          tmpNormal.set(0, 1, 0),
          0xff5a18
        );
        if (rigExt.getVisorGlintWorldPos) {
          vfx.spawnPerilGlint(rigExt.getVisorGlintWorldPos(tmpA), 0xff7824);
        }
        vfx.update(0.035, host.camera.position);
      } else {
        // back_tank: thermal vent hunch showcasing the giant crimson pressurized fuel tank & exhaust flame stacks!
        vfx.clear();
        projectiles.clear();
        for (let i = 0; i < 24; i++) {
          e.rig.updateAnimation({
            dt: 0.04,
            elapsed: 4.0 + i * 0.04,
            behavior: 'recover',
            speedRatio: 0,
            localMoveX: 0,
            localMoveZ: 0,
            aimPitch: 0,
            attackProgress: 0.45,
            attackVariant: 3,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
            boosterIntensity: 1.15,
          });
        }
        e.rig.root.updateMatrixWorld(true);
      }
      host.renderer.render(host.scene, host.camera);
      return true;
    },
    showcaseKestrelAction: (
      enemyId: string,
      mode: 'combat_stance' | 'jet_blade' | 'aerial_hover' | 'vent_overdrive' | 'release'
    ) => {
      if (mode === 'release') {
        host.floor08Director.manager.setShowcaseLock(null);
        return true;
      }
      const e = host.floor08Director.manager.getEnemyById(enemyId);
      if (!e) return false;
      host.floor08Director.manager.setShowcaseLock(enemyId);
      const vfx = host.floor08Director.manager.vfx;
      const projectiles = host.floor08Director.manager.projectiles;
      const rigExt = e.rig as unknown as {
        getVisorGlintWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
      };
      const fx = -Math.sin(e.spatial.yaw);
      const fz = -Math.cos(e.spatial.yaw);

      if (mode === 'combat_stance') {
        vfx.clear();
        projectiles.clear();
        e.state.phase = 1;
        e.state.weakpoint.exposed = false;
        e.state.weakpoint.broken = false;
        for (let i = 0; i < 24; i++) {
          e.rig.updateAnimation({
            dt: 0.04,
            elapsed: 1.5 + i * 0.04,
            behavior: 'attack',
            speedRatio: 0.15,
            localMoveX: 0,
            localMoveZ: 0.15,
            aimPitch: 0,
            attackProgress: 0.35,
            attackVariant: 0,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: false,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
            boosterIntensity: 0.42,
          });
        }
        e.rig.root.updateMatrixWorld(true);
        const m = e.rig.getMuzzleWorldPos(tmpA);
        vfx.spawnMuzzleFlash(m, tmpFwd.set(fx, 0, fz).normalize(), 0xff3b52, false);
        vfx.update(0.025, host.camera.position);
      } else if (mode === 'jet_blade') {
        vfx.clear();
        projectiles.clear();
        e.state.phase = 1;
        e.state.weakpoint.exposed = false;
        for (let i = 0; i < 24; i++) {
          e.rig.updateAnimation({
            dt: 0.04,
            elapsed: 2.3 + i * 0.04,
            behavior: 'attack',
            speedRatio: 0.9,
            localMoveX: 0,
            localMoveZ: 0.9,
            aimPitch: 0,
            attackProgress: 0.48,
            attackVariant: 1,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: false,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
            boosterIntensity: 1.3,
          });
        }
        e.rig.root.updateMatrixWorld(true);
        vfx.spawnBladeSlashArc(
          tmpA.set(e.spatial.x + fx * 0.72, e.spatial.y + 1.24, e.spatial.z + fz * 0.72),
          e.spatial.yaw,
          -0.24,
          0.08,
          2.9,
          0xff2c48,
          true,
          -1
        );
        vfx.spawnSurfaceSlashScar(
          tmpB.set(e.spatial.x + fx * 1.4, e.spatial.y + 0.04, e.spatial.z + fz * 1.4),
          tmpNormal.set(0, 1, 0),
          tmpFwd.set(fx, 0, fz).normalize(),
          true
        );
        if (rigExt.getVisorGlintWorldPos) {
          vfx.spawnPerilGlint(rigExt.getVisorGlintWorldPos(tmpC), 0xff4658);
        }
        vfx.update(0.035, host.camera.position);
      } else if (mode === 'aerial_hover') {
        vfx.clear();
        projectiles.clear();
        e.state.phase = 2;
        e.state.weakpoint.exposed = false;
        for (let i = 0; i < 26; i++) {
          e.rig.updateAnimation({
            dt: 0.04,
            elapsed: 3.1 + i * 0.04,
            behavior: 'windup',
            speedRatio: 0,
            localMoveX: 0,
            localMoveZ: 0,
            aimPitch: 0,
            attackProgress: 0.85,
            attackVariant: 2,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: false,
            weakpointBroken: false,
            shieldActive: false,
            phase: 2,
            airborneHeight: 1.55,
            boosterIntensity: 1.3,
          });
        }
        e.rig.root.updateMatrixWorld(true);
        projectiles.spawnShockwave({
          center: tmpC.set(e.spatial.x, e.spatial.y + 0.04, e.spatial.z),
          maxRadius: 11.5,
          expandSpeed: 12.0,
          damage: 26,
          color: 0xffb824,
          staggerStrength: 0.95,
        });
        projectiles.update(0.18, tmpB.set(999, 999, 999), true, false, host.hideout.activeCollisionWorld);
        if (rigExt.getVisorGlintWorldPos) {
          vfx.spawnPerilGlint(rigExt.getVisorGlintWorldPos(tmpA), 0xffd248);
        }
        vfx.update(0.035, host.camera.position);
      } else {
        // vent_overdrive: Phase 2 hunched cooling recovery with wings flared & dorsal gold shutters wide open!
        vfx.clear();
        projectiles.clear();
        e.state.phase = 2;
        e.state.weakpoint.exposed = true;
        e.state.weakpoint.broken = false;
        for (let i = 0; i < 28; i++) {
          e.rig.updateAnimation({
            dt: 0.04,
            elapsed: 4.1 + i * 0.04,
            behavior: 'recover',
            speedRatio: 0,
            localMoveX: 0,
            localMoveZ: 0,
            aimPitch: 0,
            attackProgress: 0.5,
            attackVariant: 2,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: false,
            phase: 2,
            airborneHeight: 0,
            boosterIntensity: 0.2,
          });
        }
        e.rig.root.updateMatrixWorld(true);
      }
      host.emitHud();
      host.renderer.render(host.scene, host.camera);
      return true;
    },
    showcaseExoTrooperAction: (
      enemyId: string,
      mode: 'combat_stance' | 'jet_flank' | 'hyper_burst' | 'flush_grenade' | 'cqc_bash' | 'release'
    ) => {
      if (mode === 'release') {
        host.floor07Director.manager.setShowcaseLock(null);
        return true;
      }
      const e = host.floor07Director.manager.getEnemyById(enemyId);
      if (!e) return false;
      host.floor07Director.manager.setShowcaseLock(enemyId);
      const vfx = host.floor07Director.manager.vfx;
      const projectiles = host.floor07Director.manager.projectiles;
      const rigExt = e.rig as unknown as {
        setLaserSight?: (active: boolean, length: number, dangerRatio: number) => void;
        getVisorWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
        getGrenadeMuzzleWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
        getBoosterNozzleWorldPos?: (side: -1 | 1, out: THREE.Vector3) => THREE.Vector3;
      };
      const fx = -Math.sin(e.spatial.yaw);
      const fz = -Math.cos(e.spatial.yaw);

      vfx.clear();
      projectiles.clear();
      rigExt.setLaserSight?.(false, 0, 0);

      if (mode === 'combat_stance') {
        e.rig.updateAnimation({
          dt: 0.04,
          elapsed: 1.2,
          behavior: 'attack',
          speedRatio: 0.25,
          localMoveX: 0.2,
          localMoveZ: 0.1,
          aimPitch: 0,
          attackProgress: 0.35,
          attackVariant: 0,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: false,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
          boosterIntensity: 0,
        });
        e.rig.root.updateMatrixWorld(true);
        const m = e.rig.getMuzzleWorldPos(tmpA);
        vfx.spawnMuzzleFlash(m, tmpFwd.set(fx, 0, fz).normalize(), 0x38e8ff, false);
        vfx.update(0.02, host.camera.position);
      } else if (mode === 'jet_flank') {
        e.rig.updateAnimation({
          dt: 0.04,
          elapsed: 2.1,
          behavior: 'attack',
          speedRatio: 1.2,
          localMoveX: 1.15,
          localMoveZ: 0.2,
          aimPitch: -0.06,
          attackProgress: 0.5,
          attackVariant: 1,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: false,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0.52,
          boosterIntensity: 1.15,
        });
        e.rig.root.updateMatrixWorld(true);
        if (rigExt.getBoosterNozzleWorldPos) {
          const nL = rigExt.getBoosterNozzleWorldPos(-1, tmpA);
          const nR = rigExt.getBoosterNozzleWorldPos(1, tmpB);
          vfx.spawnBoosterBurst(nL, tmpFwd.set(-fx, -0.6, -fz).normalize(), 0x38e8ff, 8);
          vfx.spawnBoosterBurst(nR, tmpFwd.set(-fx, -0.6, -fz).normalize(), 0x38e8ff, 8);
        }
        vfx.update(0.03, host.camera.position);
      } else if (mode === 'hyper_burst') {
        e.rig.updateAnimation({
          dt: 0.04,
          elapsed: 3.1,
          behavior: 'windup',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0.02,
          attackProgress: 0.85,
          attackVariant: 2,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: false,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
          boosterIntensity: 0,
        });
        rigExt.setLaserSight?.(true, 11.5, 0.92);
        e.rig.root.updateMatrixWorld(true);
        if (rigExt.getVisorWorldPos) {
          vfx.spawnPerilGlint(rigExt.getVisorWorldPos(tmpC), 0xff2842);
        }
        vfx.update(0.025, host.camera.position);
      } else if (mode === 'flush_grenade') {
        e.rig.updateAnimation({
          dt: 0.04,
          elapsed: 4.1,
          behavior: 'attack',
          speedRatio: 0.15,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0.08,
          attackProgress: 0.45,
          attackVariant: 3,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: false,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
          boosterIntensity: 0,
        });
        e.rig.root.updateMatrixWorld(true);
        if (rigExt.getGrenadeMuzzleWorldPos) {
          const gm = rigExt.getGrenadeMuzzleWorldPos(tmpA);
          vfx.spawnMuzzleFlash(gm, tmpFwd.set(fx, 0.45, fz).normalize(), 0xffaa24, true);
        }
        vfx.update(0.025, host.camera.position);
      } else if (mode === 'cqc_bash') {
        e.rig.updateAnimation({
          dt: 0.04,
          elapsed: 5.1,
          behavior: 'attack',
          speedRatio: 0.8,
          localMoveX: 0,
          localMoveZ: 0.8,
          aimPitch: 0,
          attackProgress: 0.5,
          attackVariant: 4,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: false,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
          boosterIntensity: 0,
        });
        e.rig.root.updateMatrixWorld(true);
        vfx.spawnBladeSlashArc(
          tmpA.set(e.spatial.x + fx * 0.72, e.spatial.y + 1.24, e.spatial.z + fz * 0.72),
          e.spatial.yaw,
          0.08,
          0.04,
          2.0,
          0x38e8ff,
          false,
          1
        );
        vfx.update(0.03, host.camera.position);
      }

      host.renderer.render(host.scene, host.camera);
      return true;
    },
    showcaseDuelistAction: (
      enemyId: string,
      mode: 'combat_stance' | 'tether_zip' | 'lance_combo' | 'vault_slam' | 'plasma_wave' | 'sidestep_feint' | 'release'
    ) => {
      if (mode === 'release') {
        host.floor07Director.manager.setShowcaseLock(null);
        return true;
      }
      const f7 = host.floor07Director;
      const e = f7.manager.getEnemyById(enemyId);
      if (!e || !e.state.alive) return false;
      f7.manager.setShowcaseLock(enemyId);
      const vfx = f7.manager.vfx;
      const projectiles = f7.manager.projectiles;
      const rigExt = e.rig as typeof e.rig & {
        setTetherCable?: (active: boolean, length: number, tensionRatio: number) => void;
        getLanceTipWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
        getVisorWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
        getBoosterNozzleWorldPos?: (side: -1 | 1, out: THREE.Vector3) => THREE.Vector3;
      };
      const fx = -Math.sin(e.spatial.yaw);
      const fz = -Math.cos(e.spatial.yaw);

      vfx.clear();
      projectiles.clear();
      rigExt.setTetherCable?.(false, 0, 0);

      if (mode === 'combat_stance') {
        e.rig.updateAnimation({
          dt: 0.04,
          elapsed: 1.2,
          behavior: 'chase',
          speedRatio: 0.25,
          localMoveX: 0.12,
          localMoveZ: 0.1,
          aimPitch: 0,
          attackProgress: 0,
          attackVariant: 0,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: false,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
          boosterIntensity: 0,
        });
        e.rig.root.updateMatrixWorld(true);
      } else if (mode === 'tether_zip') {
        e.rig.updateAnimation({
          dt: 0.04,
          elapsed: 2.0,
          behavior: 'attack',
          speedRatio: 1.3,
          localMoveX: 0,
          localMoveZ: 1.2,
          aimPitch: 0,
          attackProgress: 0.65,
          attackVariant: 2,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0.56,
          boosterIntensity: 1.15,
        });
        rigExt.setTetherCable?.(true, 6.2, 0.9);
        e.rig.root.updateMatrixWorld(true);
        if (rigExt.getBoosterNozzleWorldPos) {
          const nL = rigExt.getBoosterNozzleWorldPos(-1, tmpA);
          const nR = rigExt.getBoosterNozzleWorldPos(1, tmpB);
          vfx.spawnBoosterBurst(nL, tmpFwd.set(-fx, -0.35, -fz).normalize(), 0x3ae8ff, 8);
          vfx.spawnBoosterBurst(nR, tmpFwd.set(-fx, -0.35, -fz).normalize(), 0x3ae8ff, 8);
        }
        vfx.spawnPerilGlint(e.rig.getWeakpointWorldPos(tmpC), 0x38e8ff);
        vfx.update(0.03, host.camera.position);
      } else if (mode === 'lance_combo') {
        e.rig.updateAnimation({
          dt: 0.04,
          elapsed: 3.0,
          behavior: 'attack',
          speedRatio: 0.9,
          localMoveX: 0,
          localMoveZ: 0.85,
          aimPitch: 0,
          attackProgress: 0.55,
          attackVariant: 0,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: false,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
          boosterIntensity: 0.25,
        });
        e.rig.root.updateMatrixWorld(true);
        vfx.spawnBladeSlashArc(
          tmpA.set(e.spatial.x, e.spatial.y + 1.28, e.spatial.z),
          e.spatial.yaw,
          0.38,
          0.08,
          2.65,
          0xff5a20,
          true,
          1
        );
        vfx.update(0.03, host.camera.position);
      } else if (mode === 'vault_slam') {
        e.rig.updateAnimation({
          dt: 0.04,
          elapsed: 4.0,
          behavior: 'windup',
          speedRatio: 1.0,
          localMoveX: 0,
          localMoveZ: 0.9,
          aimPitch: 0,
          attackProgress: 0.9,
          attackVariant: 3,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0.72,
          boosterIntensity: 1.05,
        });
        e.rig.root.updateMatrixWorld(true);
        projectiles.spawnShockwave({
          center: tmpA.set(e.spatial.x + fx * 0.9, e.spatial.y + 0.06, e.spatial.z + fz * 0.9),
          maxRadius: 4.8,
          expandSpeed: 13.5,
          damage: 26,
          color: 0xff5a18,
          staggerStrength: 0.78,
        });
        projectiles.update(0.14, tmpB.set(999, 999, 999), true, false, host.hideout.activeCollisionWorld);
        if (rigExt.getLanceTipWorldPos) {
          vfx.spawnPerilGlint(rigExt.getLanceTipWorldPos(tmpC), 0xff7a1a);
        }
        vfx.update(0.025, host.camera.position);
      } else if (mode === 'plasma_wave') {
        e.rig.updateAnimation({
          dt: 0.04,
          elapsed: 5.0,
          behavior: 'attack',
          speedRatio: 0.2,
          localMoveX: 0,
          localMoveZ: 0.15,
          aimPitch: 0,
          attackProgress: 0.58,
          attackVariant: 4,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: false,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
          boosterIntensity: 0,
        });
        e.rig.root.updateMatrixWorld(true);
        vfx.spawnBladeSlashArc(
          tmpA.set(e.spatial.x, e.spatial.y + 1.24, e.spatial.z),
          e.spatial.yaw,
          0.08,
          0.02,
          2.6,
          0xff6a1a,
          true,
          1
        );
        vfx.update(0.03, host.camera.position);
      } else if (mode === 'sidestep_feint') {
        e.rig.updateAnimation({
          dt: 0.04,
          elapsed: 6.0,
          behavior: 'attack',
          speedRatio: 1.4,
          localMoveX: 1.2,
          localMoveZ: 0.2,
          aimPitch: 0,
          attackProgress: 0.5,
          attackVariant: 5,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: false,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0.22,
          boosterIntensity: 0.95,
        });
        e.rig.root.updateMatrixWorld(true);
        vfx.update(0.025, host.camera.position);
      }

      host.renderer.render(host.scene, host.camera);
      return true;
    },
    showcaseBombardierAction: (
      enemyId: string,
      mode:
        | 'combat_stance'
        | 'carpet_barrage'
        | 'bracket_salvo'
        | 'flak_burst'
        | 'shrapnel_fan'
        | 'shock_stomp'
        | 'release'
    ) => {
      const f7 = host.floor07Director;
      if (mode === 'release') {
        f7.manager.setShowcaseLock(null);
        f7.manager.vfx.clear();
        f7.manager.projectiles.clear();
        return true;
      }
      const e = f7.manager.getEnemyById(enemyId);
      if (!e || !e.state.alive) return false;
      f7.manager.setShowcaseLock(enemyId);
      const vfx = f7.manager.vfx;
      const projectiles = f7.manager.projectiles;
      const rigExt = e.rig as typeof e.rig & {
        setTargetLaser?: (active: boolean, length: number, dangerRatio: number) => void;
        getPodMuzzleWorldPos?: (side: -1 | 1, out: THREE.Vector3) => THREE.Vector3;
        getFlakMuzzleWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
        triggerPodRecoil?: (side: -1 | 1) => void;
        triggerFlakSpin?: () => void;
      };
      const fx = -Math.sin(e.spatial.yaw);
      const fz = -Math.cos(e.spatial.yaw);

      vfx.clear();
      projectiles.clear();
      rigExt.setTargetLaser?.(false, 0, 0);

      // Step a few ticks when bracing so outriggerBlend smoothly finishes full deployment
      const runAnim = (
        params: Parameters<typeof e.rig.updateAnimation>[0],
        steps = 1
      ) => {
        for (let i = 0; i < steps; i++) {
          e.rig.updateAnimation(params);
        }
        e.rig.root.updateMatrixWorld(true);
      };

      if (mode === 'combat_stance') {
        runAnim(
          {
            dt: 0.05,
            elapsed: 1.2,
            behavior: 'strafe',
            speedRatio: 0.15,
            localMoveX: 0,
            localMoveZ: 0.1,
            aimPitch: 0,
            attackProgress: 0,
            attackVariant: 0,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
          },
          10
        );
      } else if (mode === 'carpet_barrage') {
        rigExt.triggerPodRecoil?.(1);
        runAnim(
          {
            dt: 0.05,
            elapsed: 2.2,
            behavior: 'attack',
            speedRatio: 0,
            localMoveX: 0,
            localMoveZ: 0,
            aimPitch: 0,
            attackProgress: 0.65,
            attackVariant: 1,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
          },
          12
        );
        rigExt.setTargetLaser?.(true, 10.5, 0.92);
        e.rig.root.updateMatrixWorld(true);
        if (rigExt.getPodMuzzleWorldPos) {
          const mR = rigExt.getPodMuzzleWorldPos(1, tmpA);
          vfx.spawnMuzzleFlash(mR, tmpFwd.set(fx * 0.45, 0.88, fz * 0.45).normalize(), 0xff6a14, true);
        }
        vfx.spawnPerilGlint(e.rig.getWeakpointWorldPos(tmpC), 0xff8c18);
        vfx.update(0.025, host.camera.position);
      } else if (mode === 'bracket_salvo') {
        rigExt.triggerPodRecoil?.(-1);
        runAnim(
          {
            dt: 0.05,
            elapsed: 3.0,
            behavior: 'attack',
            speedRatio: 0,
            localMoveX: 0,
            localMoveZ: 0,
            aimPitch: 0,
            attackProgress: 0.55,
            attackVariant: 0,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
          },
          12
        );
        if (rigExt.getPodMuzzleWorldPos) {
          const mL = rigExt.getPodMuzzleWorldPos(-1, tmpA);
          vfx.spawnMuzzleFlash(mL, tmpFwd.set(fx * 0.55, 0.82, fz * 0.55).normalize(), 0xffaa18, true);
        }
        vfx.update(0.025, host.camera.position);
      } else if (mode === 'flak_burst') {
        rigExt.triggerFlakSpin?.();
        runAnim(
          {
            dt: 0.05,
            elapsed: 4.0,
            behavior: 'attack',
            speedRatio: 0.2,
            localMoveX: 0,
            localMoveZ: 0.15,
            aimPitch: 0,
            attackProgress: 0.42,
            attackVariant: 2,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
          },
          10
        );
        rigExt.setTargetLaser?.(true, 9.0, 0.78);
        e.rig.root.updateMatrixWorld(true);
        if (rigExt.getFlakMuzzleWorldPos) {
          const mF = rigExt.getFlakMuzzleWorldPos(tmpA);
          vfx.spawnMuzzleFlash(mF, tmpFwd.set(fx, 0, fz).normalize(), 0xffaa24, true);
        }
        vfx.update(0.025, host.camera.position);
      } else if (mode === 'shrapnel_fan') {
        runAnim(
          {
            dt: 0.05,
            elapsed: 4.8,
            behavior: 'attack',
            speedRatio: 0.1,
            localMoveX: 0,
            localMoveZ: 0.1,
            aimPitch: 0,
            attackProgress: 0.52,
            attackVariant: 3,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
          },
          10
        );
        if (rigExt.getFlakMuzzleWorldPos) {
          const mF = rigExt.getFlakMuzzleWorldPos(tmpA);
          vfx.spawnMuzzleFlash(mF, tmpFwd.set(fx, 0, fz).normalize(), 0xffb830, true);
        }
        vfx.update(0.025, host.camera.position);
      } else if (mode === 'shock_stomp') {
        runAnim(
          {
            dt: 0.05,
            elapsed: 5.5,
            behavior: 'attack',
            speedRatio: 0,
            localMoveX: 0,
            localMoveZ: 0,
            aimPitch: 0,
            attackProgress: 0.55,
            attackVariant: 4,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
          },
          10
        );
        projectiles.spawnShockwave({
          center: tmpA.set(e.spatial.x, e.spatial.y + 0.06, e.spatial.z),
          maxRadius: 5.4,
          expandSpeed: 13.0,
          damage: 25,
          color: 0xff9a18,
          staggerStrength: 0.85,
        });
        projectiles.update(0.14, tmpB.set(999, 999, 999), true, false, host.hideout.activeCollisionWorld);
        vfx.update(0.025, host.camera.position);
      }

      host.renderer.render(host.scene, host.camera);
      return true;
    },
    showcaseValkyrieAction: (
      enemyId: string,
      mode:
        | 'hover_stance'
        | 'rail_lock'
        | 'dive_strafe'
        | 'rocket_salvo'
        | 'emp_pulse'
        | 'release'
    ) => {
      const f7 = host.floor07Director;
      if (mode === 'release') {
        f7.manager.setShowcaseLock(null);
        f7.manager.vfx.clear();
        f7.manager.projectiles.clear();
        return true;
      }
      const e = f7.manager.getEnemyById(enemyId);
      if (!e || !e.state.alive) return false;
      f7.manager.setShowcaseLock(enemyId);
      const vfx = f7.manager.vfx;
      const projectiles = f7.manager.projectiles;
      const rigExt = e.rig as typeof e.rig & {
        setRailBeam?: (active: boolean, length: number, chargeRatio: number) => void;
        getGunMuzzleWorldPos?: (side: -1 | 1, out: THREE.Vector3) => THREE.Vector3;
        getRocketPodWorldPos?: (side: -1 | 1, out: THREE.Vector3) => THREE.Vector3;
        getThrusterExhaustWorldPos?: (side: -1 | 1, out: THREE.Vector3) => THREE.Vector3;
        triggerGunRecoil?: (side: -1 | 1) => void;
      };
      const fx = -Math.sin(e.spatial.yaw);
      const fz = -Math.cos(e.spatial.yaw);

      vfx.clear();
      projectiles.clear();
      rigExt.setRailBeam?.(false, 0, 0);

      const runAnim = (
        params: Parameters<typeof e.rig.updateAnimation>[0],
        steps = 10
      ) => {
        for (let i = 0; i < steps; i++) {
          e.rig.updateAnimation(params);
        }
        e.rig.root.updateMatrixWorld(true);
      };

      if (mode === 'hover_stance') {
        runAnim(
          {
            dt: 0.04,
            elapsed: 1.4,
            behavior: 'strafe',
            speedRatio: 0.25,
            localMoveX: 0.15,
            localMoveZ: 0.12,
            aimPitch: -0.1,
            attackProgress: 0,
            attackVariant: 0,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 3.2,
            boosterIntensity: 0.65,
          },
          10
        );
      } else if (mode === 'rail_lock') {
        runAnim(
          {
            dt: 0.04,
            elapsed: 2.3,
            behavior: 'windup',
            speedRatio: 0.05,
            localMoveX: 0,
            localMoveZ: 0,
            aimPitch: -0.06,
            attackProgress: 0.85,
            attackVariant: 1,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 3.4,
            boosterIntensity: 0.95,
          },
          12
        );
        rigExt.setRailBeam?.(true, 11.5, 0.92);
        e.rig.root.updateMatrixWorld(true);
        vfx.spawnPerilGlint(e.rig.getWeakpointWorldPos(tmpC), 0x2cecff);
        vfx.update(0.02, host.camera.position);
      } else if (mode === 'dive_strafe') {
        rigExt.triggerGunRecoil?.(1);
        runAnim(
          {
            dt: 0.04,
            elapsed: 3.6,
            behavior: 'attack',
            speedRatio: 1.0,
            localMoveX: 0.9,
            localMoveZ: 1.15,
            aimPitch: -0.22,
            attackProgress: 0.55,
            attackVariant: 2,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 2.6,
            boosterIntensity: 1.4,
          },
          12
        );
        if (rigExt.getGunMuzzleWorldPos) {
          const mR = rigExt.getGunMuzzleWorldPos(1, tmpA);
          vfx.spawnMuzzleFlash(mR, tmpFwd.set(fx, -0.22, fz).normalize(), 0x32ecff, true);
        }
        if (rigExt.getThrusterExhaustWorldPos) {
          tmpFwd.set(-fx, -0.55, -fz).normalize();
          const tL = rigExt.getThrusterExhaustWorldPos(-1, tmpA);
          vfx.spawnBoosterBurst(tL, tmpFwd, 0x26e6ff);
          const tR = rigExt.getThrusterExhaustWorldPos(1, tmpB);
          vfx.spawnBoosterBurst(tR, tmpFwd, 0x26e6ff);
        }
        vfx.update(0.025, host.camera.position);
      } else if (mode === 'rocket_salvo') {
        runAnim(
          {
            dt: 0.04,
            elapsed: 4.5,
            behavior: 'attack',
            speedRatio: 0.35,
            localMoveX: -0.25,
            localMoveZ: 0.25,
            aimPitch: -0.14,
            attackProgress: 0.52,
            attackVariant: 3,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 3.1,
            boosterIntensity: 1.0,
          },
          10
        );
        if (rigExt.getRocketPodWorldPos) {
          const pL = rigExt.getRocketPodWorldPos(-1, tmpA);
          vfx.spawnMuzzleFlash(pL, tmpFwd.set(fx, -0.1, fz).normalize(), 0xff8c24, true);
          const pR = rigExt.getRocketPodWorldPos(1, tmpB);
          vfx.spawnMuzzleFlash(pR, tmpFwd.set(fx, -0.1, fz).normalize(), 0xff8c24, true);
        }
        vfx.update(0.025, host.camera.position);
      } else if (mode === 'emp_pulse') {
        runAnim(
          {
            dt: 0.04,
            elapsed: 5.4,
            behavior: 'attack',
            speedRatio: 0.05,
            localMoveX: 0,
            localMoveZ: 0,
            aimPitch: 0,
            attackProgress: 0.45,
            attackVariant: 4,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 2.8,
            boosterIntensity: 1.35,
          },
          10
        );
        projectiles.spawnShockwave({
          center: tmpA.set(e.spatial.x, e.spatial.y + 0.1, e.spatial.z),
          maxRadius: 5.8,
          expandSpeed: 14.0,
          damage: 24,
          color: 0x28e8ff,
          staggerStrength: 0.85,
        });
        projectiles.update(0.14, tmpB.set(999, 999, 999), true, false, host.hideout.activeCollisionWorld);
        vfx.update(0.025, host.camera.position);
      }

      host.renderer.render(host.scene, host.camera);
      return true;
    },
    showcaseJuggernautAction: (
      enemyId: string,
      mode:
        | 'combat_stance'
        | 'rotary_sweep'
        | 'seismic_slam'
        | 'bull_rush'
        | 'thermal_vent'
        | 'phase2_arc'
        | 'release'
    ) => {
      const f7 = host.floor07Director;
      if (mode === 'release') {
        f7.manager.setShowcaseLock(null);
        f7.manager.vfx.clear();
        f7.manager.projectiles.clear();
        return true;
      }
      const e = f7.manager.getEnemyById(enemyId);
      if (!e || !e.state.alive) return false;
      f7.manager.setShowcaseLock(enemyId);
      const vfx = f7.manager.vfx;
      const projectiles = f7.manager.projectiles;
      const rigExt = e.rig as typeof e.rig & {
        setTargetLaser?: (active: boolean, length: number, dangerRatio: number) => void;
        getPiledriverWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
        getTeslaPylonWorldPos?: (side: -1 | 1, out: THREE.Vector3) => THREE.Vector3;
        getRadiatorVentWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
        setBarrelHeat?: (heat01: number) => void;
      };
      const fx = -Math.sin(e.spatial.yaw);
      const fz = -Math.cos(e.spatial.yaw);

      vfx.clear();
      projectiles.clear();
      rigExt.setTargetLaser?.(false, 0, 0);
      rigExt.setBarrelHeat?.(0);

      const runAnim = (
        params: Parameters<typeof e.rig.updateAnimation>[0],
        steps = 12
      ) => {
        for (let i = 0; i < steps; i++) {
          e.rig.updateAnimation(params);
        }
        e.rig.root.updateMatrixWorld(true);
      };

      if (mode === 'combat_stance') {
        runAnim(
          {
            dt: 0.04,
            elapsed: 1.5,
            behavior: 'chase',
            speedRatio: 0.15,
            localMoveX: 0,
            localMoveZ: 0.15,
            aimPitch: 0,
            attackProgress: 0,
            attackVariant: 0,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: false,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
          },
          12
        );
      } else if (mode === 'rotary_sweep') {
        rigExt.setBarrelHeat?.(0.88);
        runAnim(
          {
            dt: 0.04,
            elapsed: 2.6,
            behavior: 'attack',
            speedRatio: 0.05,
            localMoveX: 0,
            localMoveZ: 0,
            aimPitch: -0.04,
            attackProgress: 0.55,
            attackVariant: 0,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: false,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
          },
          12
        );
        rigExt.setTargetLaser?.(true, 11.5, 0.85);
        e.rig.root.updateMatrixWorld(true);
        const mPos = e.rig.getMuzzleWorldPos(tmpA);
        vfx.spawnMuzzleFlash(mPos, tmpFwd.set(fx, -0.04, fz).normalize(), 0xffaa2c, true);
        vfx.update(0.02, host.camera.position);
      } else if (mode === 'seismic_slam') {
        runAnim(
          {
            dt: 0.04,
            elapsed: 3.5,
            behavior: 'attack',
            speedRatio: 0,
            localMoveX: 0,
            localMoveZ: 0,
            aimPitch: 0,
            attackProgress: 0.45,
            attackVariant: 1,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: false,
            weakpointBroken: false,
            shieldActive: false,
            phase: 2,
            airborneHeight: 0,
          },
          14
        );
        projectiles.spawnShockwave({
          center: tmpA.set(e.spatial.x, e.spatial.y + 0.12, e.spatial.z),
          maxRadius: 8.8,
          expandSpeed: 13.5,
          damage: 28,
          color: 0xff6818,
          staggerStrength: 0.9,
        });
        projectiles.update(0.14, tmpB.set(999, 999, 999), true, false, host.hideout.activeCollisionWorld);
        vfx.update(0.02, host.camera.position);
      } else if (mode === 'bull_rush') {
        runAnim(
          {
            dt: 0.04,
            elapsed: 4.3,
            behavior: 'attack',
            speedRatio: 1.5,
            localMoveX: 0,
            localMoveZ: 1.5,
            aimPitch: 0,
            attackProgress: 0.65,
            attackVariant: 2,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: false,
            weakpointBroken: false,
            shieldActive: true,
            phase: 1,
            airborneHeight: 0,
          },
          14
        );
        if (rigExt.getPiledriverWorldPos) {
          vfx.spawnPerilGlint(rigExt.getPiledriverWorldPos(tmpA), 0xffa624);
        }
        vfx.update(0.02, host.camera.position);
      } else if (mode === 'thermal_vent') {
        rigExt.setBarrelHeat?.(0.75);
        runAnim(
          {
            dt: 0.04,
            elapsed: 5.2,
            behavior: 'recover',
            speedRatio: 0,
            localMoveX: 0,
            localMoveZ: 0,
            aimPitch: 0,
            attackProgress: 0,
            attackVariant: 0,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
          },
          16
        );
        if (rigExt.getRadiatorVentWorldPos) {
          const ventPos = rigExt.getRadiatorVentWorldPos(tmpA);
          tmpFwd.set(-fx, 0.35, -fz).normalize();
          vfx.spawnBoosterBurst(ventPos, tmpFwd, 0xff7020);
        }
        vfx.update(0.025, host.camera.position);
      } else if (mode === 'phase2_arc') {
        runAnim(
          {
            dt: 0.04,
            elapsed: 6.1,
            behavior: 'attack',
            speedRatio: 0.1,
            localMoveX: 0,
            localMoveZ: 0,
            aimPitch: 0,
            attackProgress: 0.55,
            attackVariant: 3,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: false,
            weakpointBroken: false,
            shieldActive: false,
            phase: 2,
            airborneHeight: 0,
          },
          14
        );
        if (rigExt.getTeslaPylonWorldPos) {
          vfx.spawnPerilGlint(rigExt.getTeslaPylonWorldPos(-1, tmpA), 0xffa828);
          vfx.spawnPerilGlint(rigExt.getTeslaPylonWorldPos(1, tmpB), 0xffa828);
        }
        vfx.update(0.02, host.camera.position);
      }

      host.renderer.render(host.scene, host.camera);
      return true;
    },
    showcaseStalkerAction: (
      enemyId: string,
      mode: 'combat_stance' | 'rail_lock' | 'cloak_dash' | 'ambush_slash' | 'phase2_sweep' | 'release'
    ) => {
      if (mode === 'release') {
        host.floor07Director.manager.setShowcaseLock(null);
        return true;
      }
      const e = host.floor07Director.manager.getEnemyById(enemyId);
      if (!e) return false;
      host.floor07Director.manager.setShowcaseLock(enemyId);
      const vfx = host.floor07Director.manager.vfx;
      const projectiles = host.floor07Director.manager.projectiles;
      const rigExt = e.rig as unknown as {
        setRailLaser?: (active: boolean, length: number, lockRatio: number) => void;
        setCamoOpacity?: (opacity: number) => void;
        setRailCharge?: (charge: number) => void;
        setWristBladeActive?: (active: boolean, intensity?: number) => void;
        getSpineThrusterWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
      };
      const fx = -Math.sin(e.spatial.yaw);
      const fz = -Math.cos(e.spatial.yaw);
      const rx = Math.cos(e.spatial.yaw);
      const rz = -Math.sin(e.spatial.yaw);

      vfx.clear();
      projectiles.clear();
      rigExt.setRailLaser?.(false, 1, 0);
      rigExt.setCamoOpacity?.(1.0);
      rigExt.setRailCharge?.(0);
      rigExt.setWristBladeActive?.(false, 0);

      const runAnim = (
        params: Parameters<typeof e.rig.updateAnimation>[0],
        steps = 16
      ) => {
        for (let i = 0; i < steps; i++) {
          e.rig.updateAnimation(params);
        }
        e.rig.root.updateMatrixWorld(true);
      };

      if (mode === 'combat_stance') {
        runAnim({
          dt: 0.04,
          elapsed: 1.4,
          behavior: 'chase',
          speedRatio: 0.12,
          localMoveX: 0,
          localMoveZ: 0.12,
          aimPitch: 0,
          attackProgress: 0,
          attackVariant: 0,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
      } else if (mode === 'rail_lock') {
        rigExt.setRailCharge?.(0.92);
        runAnim({
          dt: 0.04,
          elapsed: 2.3,
          behavior: 'windup',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: -0.02,
          attackProgress: 0.88,
          attackVariant: 0,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
        rigExt.setRailLaser?.(true, 10.5, 0.92);
        e.rig.root.updateMatrixWorld(true);
        const wp = e.rig.getWeakpointWorldPos(tmpA);
        vfx.spawnPerilGlint(wp, 0xff2846);
        const mPos = e.rig.getMuzzleWorldPos(tmpB);
        vfx.spawnMuzzleFlash(mPos, tmpFwd.set(fx, -0.02, fz).normalize(), 0xff2846, true);
        vfx.update(0.025, host.camera.position);
      } else if (mode === 'cloak_dash') {
        rigExt.setCamoOpacity?.(0.28);
        runAnim({
          dt: 0.04,
          elapsed: 3.1,
          behavior: 'strafe',
          speedRatio: 1.55,
          localMoveX: 1.1,
          localMoveZ: 0.6,
          aimPitch: 0,
          attackProgress: 0.5,
          attackVariant: 2,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
        if (rigExt.getSpineThrusterWorldPos) {
          const tPos = rigExt.getSpineThrusterWorldPos(tmpA);
          vfx.spawnBoosterBurst(tPos, tmpRight.set(-rx * 0.85 - fx * 0.35, 0.15, -rz * 0.85 - fz * 0.35).normalize(), 0x28f0ff, 22);
        }
        vfx.update(0.03, host.camera.position);
      } else if (mode === 'ambush_slash') {
        rigExt.setWristBladeActive?.(true, 2.0);
        runAnim({
          dt: 0.04,
          elapsed: 4.0,
          behavior: 'attack',
          speedRatio: 0.9,
          localMoveX: 0,
          localMoveZ: 0.9,
          aimPitch: 0,
          attackProgress: 0.52,
          attackVariant: 1,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 2,
          airborneHeight: 0,
        });
        vfx.spawnBladeSlashArc(
          tmpA.set(e.spatial.x + fx * 0.72, e.spatial.y + 1.24, e.spatial.z + fz * 0.72),
          e.spatial.yaw,
          -0.22,
          0.08,
          2.65,
          0xff2c58,
          true,
          1
        );
        vfx.spawnSurfaceSlashScar(
          tmpB.set(e.spatial.x + fx * 1.4, e.spatial.y + 0.04, e.spatial.z + fz * 1.4),
          tmpNormal.set(0, 1, 0),
          tmpFwd.set(fx, 0, fz).normalize(),
          true
        );
        vfx.update(0.03, host.camera.position);
      } else if (mode === 'phase2_sweep') {
        rigExt.setRailCharge?.(0.82);
        runAnim({
          dt: 0.04,
          elapsed: 5.1,
          behavior: 'attack',
          speedRatio: 0.2,
          localMoveX: 0,
          localMoveZ: 0.2,
          aimPitch: 0,
          attackProgress: 0.45,
          attackVariant: 0,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 2,
          airborneHeight: 0,
        });
        rigExt.setRailLaser?.(true, 11.0, 0.85);
        vfx.update(0.025, host.camera.position);
      }

      host.renderer.render(host.scene, host.camera);
      return true;
    },
    showcaseBastionAction: (
      enemyId: string,
      mode:
        | 'combat_stance'
        | 'rail_convergence'
        | 'missile_barrage'
        | 'reactor_vent'
        | 'seismic_stomp'
        | 'phase2_overdrive'
        | 'release'
    ) => {
      if (mode === 'release') {
        host.floor07Director.manager.setShowcaseLock(null);
        return true;
      }
      const e = host.floor07Director.manager.getEnemyById(enemyId);
      if (!e) return false;
      host.floor07Director.manager.setShowcaseLock(enemyId);
      const vfx = host.floor07Director.manager.vfx;
      const projectiles = host.floor07Director.manager.projectiles;
      const rigExt = e.rig as unknown as {
        getLeftArmMuzzlePos?: (out: THREE.Vector3) => THREE.Vector3;
        getRightArmMuzzlePos?: (out: THREE.Vector3) => THREE.Vector3;
        getPodMuzzlePos?: (side: -1 | 1, out: THREE.Vector3) => THREE.Vector3;
        getDorsalVentWorldPos?: (side: -1 | 1, out: THREE.Vector3) => THREE.Vector3;
        setDualRailLasers?: (
          active: boolean,
          leftLen: number,
          rightLen: number,
          chargeRatio: number
        ) => void;
        setBarrelHeat?: (heatRatio: number) => void;
        setPodHoodOpen?: (openRatio: number) => void;
      };
      const fx = -Math.sin(e.spatial.yaw);
      const fz = -Math.cos(e.spatial.yaw);

      vfx.clear();
      projectiles.clear();
      rigExt.setDualRailLasers?.(false, 0, 0, 0);
      rigExt.setBarrelHeat?.(0);
      rigExt.setPodHoodOpen?.(0);

      const runAnim = (
        params: Parameters<typeof e.rig.updateAnimation>[0],
        steps = 22
      ) => {
        for (let i = 0; i < steps; i++) {
          e.rig.updateAnimation(params);
        }
        e.rig.root.updateMatrixWorld(true);
      };

      if (mode === 'combat_stance') {
        e.state.phase = 1;
        e.state.weakpoint.exposed = false;
        runAnim({
          dt: 0.04,
          elapsed: 1.4,
          behavior: 'chase',
          speedRatio: 0.08,
          localMoveX: 0,
          localMoveZ: 0.08,
          aimPitch: 0,
          attackProgress: 0,
          attackVariant: 0,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: false,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
          boosterIntensity: 0,
        });
      } else if (mode === 'rail_convergence') {
        e.state.phase = 1;
        e.state.weakpoint.exposed = false;
        rigExt.setBarrelHeat?.(0.75);
        runAnim({
          dt: 0.04,
          elapsed: 2.2,
          behavior: 'windup',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: -0.02,
          attackProgress: 0.88,
          attackVariant: 3,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: false,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
          boosterIntensity: 0,
        });
        rigExt.setDualRailLasers?.(true, 11.5, 11.5, 0.92);
        e.rig.root.updateMatrixWorld(true);
        if (rigExt.getLeftArmMuzzlePos && rigExt.getRightArmMuzzlePos) {
          const mL = rigExt.getLeftArmMuzzlePos(tmpA);
          const mR = rigExt.getRightArmMuzzlePos(tmpB);
          vfx.spawnPerilGlint(mL, 0xffaa24);
          vfx.spawnPerilGlint(mR, 0xffaa24);
        }
        vfx.update(0.025, host.camera.position);
      } else if (mode === 'missile_barrage') {
        e.state.phase = 1;
        e.state.weakpoint.exposed = false;
        rigExt.setPodHoodOpen?.(1);
        runAnim({
          dt: 0.04,
          elapsed: 3.1,
          behavior: 'attack',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0,
          attackProgress: 0.55,
          attackVariant: 1,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: false,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
          boosterIntensity: 0,
        });
        if (rigExt.getPodMuzzlePos) {
          const pL = rigExt.getPodMuzzlePos(-1, tmpA);
          const pR = rigExt.getPodMuzzlePos(1, tmpB);
          vfx.spawnMuzzleFlash(pL, tmpFwd.set(fx * 0.6, 0.8, fz * 0.6).normalize(), 0xffaa24, true);
          vfx.spawnMuzzleFlash(pR, tmpFwd.set(fx * 0.6, 0.8, fz * 0.6).normalize(), 0xffaa24, true);
        }
        vfx.update(0.025, host.camera.position);
      } else if (mode === 'reactor_vent') {
        e.state.phase = 2;
        e.state.weakpoint.exposed = true;
        rigExt.setBarrelHeat?.(0.95);
        runAnim({
          dt: 0.04,
          elapsed: 4.1,
          behavior: 'recover',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0,
          attackProgress: 0.5,
          attackVariant: 0,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 2,
          airborneHeight: 0,
          boosterIntensity: 0.2,
        }, 30);
        if (rigExt.getDorsalVentWorldPos) {
          const vL = rigExt.getDorsalVentWorldPos(-1, tmpVentPosL);
          const vR = rigExt.getDorsalVentWorldPos(1, tmpVentPosR);
          vfx.spawnBoosterBurst(vL, tmpVentUp.set(0, 1, 0), 0xff4218, 12);
          vfx.spawnBoosterBurst(vR, tmpVentUp.set(0, 1, 0), 0xff4218, 12);
        }
        vfx.update(0.03, host.camera.position);
      } else if (mode === 'seismic_stomp') {
        e.state.phase = 2;
        e.state.weakpoint.exposed = false;
        runAnim({
          dt: 0.04,
          elapsed: 5.0,
          behavior: 'attack',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0,
          attackProgress: 0.25,
          attackVariant: 2,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: false,
          weakpointBroken: false,
          shieldActive: false,
          phase: 2,
          airborneHeight: 0,
          boosterIntensity: 0,
        });
        projectiles.spawnShockwave({
          center: tmpC.set(e.spatial.x, e.spatial.y + 0.14, e.spatial.z),
          maxRadius: 12.2,
          expandSpeed: 15.0,
          damage: 32,
          color: 0xff3c18,
          staggerStrength: 0.94,
        });
        projectiles.update(0.16, tmpB.set(999, 999, 999), true, false, host.hideout.activeCollisionWorld);
        vfx.update(0.03, host.camera.position);
      } else if (mode === 'phase2_overdrive') {
        e.state.phase = 2;
        e.state.weakpoint.exposed = false;
        rigExt.setBarrelHeat?.(0.85);
        runAnim({
          dt: 0.04,
          elapsed: 6.0,
          behavior: 'attack',
          speedRatio: 1.25,
          localMoveX: 0,
          localMoveZ: 1.25,
          aimPitch: 0,
          attackProgress: 0.5,
          attackVariant: 4,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: false,
          weakpointBroken: false,
          shieldActive: false,
          phase: 2,
          airborneHeight: 0,
          boosterIntensity: 1.35,
        });
        if (rigExt.getDorsalVentWorldPos) {
          const vL = rigExt.getDorsalVentWorldPos(-1, tmpVentPosL);
          const vR = rigExt.getDorsalVentWorldPos(1, tmpVentPosR);
          vfx.spawnBoosterBurst(vL, tmpVentDirL.set(-fx, -0.35, -fz).normalize(), 0xff3414, 16);
          vfx.spawnBoosterBurst(vR, tmpVentDirR.set(-fx, -0.35, -fz).normalize(), 0xff3414, 16);
        }
        vfx.update(0.03, host.camera.position);
      }

      host.emitHud();
      host.renderer.render(host.scene, host.camera);
      return true;
    },
    showcaseLevitatorAction: (
      enemyId: string,
      mode: 'lance_beam' | 'scythe_slash' | 'chalice_mortar' | 'hex_barrage' | 'shattered' | 'release'
    ) => {
      const f6 = host.floor06Director;
      if (mode === 'release') {
        f6.manager.setShowcaseLock(null);
        f6.manager.vfx.clear();
        f6.manager.projectiles.clear();
        return true;
      }
      const e = f6.manager.getEnemyById(enemyId);
      if (!e || !e.state.alive) return false;
      f6.manager.setShowcaseLock(enemyId);
      const vfx = f6.manager.vfx;
      const projectiles = f6.manager.projectiles;
      const rigExt = e.rig as typeof e.rig & {
        setTelegraphBeam?: (active: boolean, length: number, chargeRatio: number) => void;
        setFormationMode?: (m: string) => void;
        setChaliceOrbCharge?: (c: number) => void;
        setNovaSphereCharge?: (c: number) => void;
        triggerShardRecoil?: (idx: number) => void;
        getShardTipWorldPos?: (idx: number, out: THREE.Vector3) => THREE.Vector3;
        getChaliceOrbWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
      };
      const fx = -Math.sin(e.spatial.yaw);
      const fz = -Math.cos(e.spatial.yaw);

      vfx.clear();
      projectiles.clear();
      rigExt.setTelegraphBeam?.(false, 0, 0);
      rigExt.setChaliceOrbCharge?.(0);
      rigExt.setNovaSphereCharge?.(0);

      const runAnim = (
        params: Parameters<typeof e.rig.updateAnimation>[0],
        steps = 12
      ) => {
        for (let i = 0; i < steps; i++) {
          e.rig.updateAnimation({ ...params, elapsed: params.elapsed + i * params.dt });
        }
        e.rig.root.updateMatrixWorld(true);
      };

      if (mode === 'lance_beam') {
        rigExt.setFormationMode?.('lance_barrel');
        rigExt.setTelegraphBeam?.(true, 11.5, 0.92);
        runAnim({
          dt: 0.04,
          elapsed: 1.8,
          behavior: 'windup',
          speedRatio: 0.08,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: -0.05,
          attackProgress: 0.92,
          attackVariant: 1,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 3.1,
        });
        const muz = e.rig.getMuzzleWorldPos(tmpA);
        vfx.spawnPerilGlint(muz, 0xe879f9);
        vfx.update(0.04, host.camera.position);
      } else if (mode === 'scythe_slash') {
        rigExt.setFormationMode?.('scythe_slash');
        runAnim({
          dt: 0.04,
          elapsed: 2.2,
          behavior: 'attack',
          speedRatio: 0.9,
          localMoveX: 0,
          localMoveZ: 1.0,
          aimPitch: 0,
          attackProgress: 0.72,
          attackVariant: 2,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 2.5,
        });
        const slashPos = e.rig.getMuzzleWorldPos(tmpA).addScaledVector(tmpFwd.set(fx, 0, fz), 0.75);
        vfx.spawnBladeSlashArc(slashPos, e.spatial.yaw, 0.52, 0.08, 2.75, 0xd946ef, true, 1);
        vfx.spawnBladeSlashArc(slashPos, e.spatial.yaw, -0.52, -0.06, 2.55, 0xc084fc, true, -1);
        vfx.update(0.05, host.camera.position);
      } else if (mode === 'chalice_mortar') {
        rigExt.setFormationMode?.('chalice_mortar');
        rigExt.setChaliceOrbCharge?.(0.95);
        runAnim({
          dt: 0.04,
          elapsed: 2.6,
          behavior: 'windup',
          speedRatio: 0.1,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0.15,
          attackProgress: 0.9,
          attackVariant: 3,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 3.4,
        });
        if (rigExt.getChaliceOrbWorldPos) {
          const orb = rigExt.getChaliceOrbWorldPos(tmpA);
          vfx.spawnPerilGlint(orb, 0xe879f9);
        }
        vfx.update(0.04, host.camera.position);
      } else if (mode === 'hex_barrage') {
        rigExt.setFormationMode?.('volley_fan');
        for (let i = 0; i < 6; i++) rigExt.triggerShardRecoil?.(i);
        runAnim({
          dt: 0.04,
          elapsed: 3.1,
          behavior: 'attack',
          speedRatio: 0.35,
          localMoveX: 0.4,
          localMoveZ: 0.2,
          aimPitch: -0.05,
          attackProgress: 0.65,
          attackVariant: 0,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 3.1,
        });
        for (let i = 0; i < 6; i++) {
          const tip = rigExt.getShardTipWorldPos ? rigExt.getShardTipWorldPos(i, tmpA) : e.rig.getMuzzleWorldPos(tmpA);
          const yawOff = (i - 2.5) * 0.14;
          const dir = tmpFwd.set(-Math.sin(e.spatial.yaw + yawOff), -0.06, -Math.cos(e.spatial.yaw + yawOff)).normalize();
          projectiles.spawnProjectile({
            origin: tip,
            direction: dir,
            speed: 22,
            damage: 14,
            kind: 'plasma_bolt',
            color: i % 2 === 0 ? 0xe879f9 : 0xa855f7,
            radius: 0.14,
            staggerStrength: 0.2,
          });
          vfx.spawnMuzzleFlash(tip, dir, 0xe879f9, false);
        }
        projectiles.update(0.08, tmpB.set(999, 999, 999), true, false, host.hideout.activeCollisionWorld);
        vfx.update(0.03, host.camera.position);
      } else if (mode === 'shattered') {
        rigExt.setFormationMode?.('seraphic_idle');
        e.state.weakpoint.broken = true;
        e.state.staggerTimer = 2.4;
        runAnim({
          dt: 0.04,
          elapsed: 3.6,
          behavior: 'staggered',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0.4,
          attackProgress: 0,
          attackVariant: 0,
          flinchTimer: 0.15,
          flinchDirX: 1,
          staggerTimer: 2.4,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: true,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
        const wp = e.rig.getWeakpointWorldPos(tmpA);
        vfx.spawnBoosterBurst(wp, tmpFwd.set(0, 0.85, -0.5).normalize(), 0xc084fc, 16);
        vfx.spawnPerilGlint(wp, 0xf0abfc);
        vfx.update(0.08, host.camera.position);
      }

      host.emitHud();
      host.renderer.render(host.scene, host.camera);
      return true;
    },
    showcaseClaymoreKnightAction: (
      enemyId: string,
      mode:
        | 'idle_stance'
        | 'guard_stance'
        | 'cleave_combo'
        | 'seismic_slam'
        | 'vault_crash'
        | 'crescent_wave'
        | 'shattered'
        | 'release'
    ) => {
      const f6 = host.floor06Director;
      if (mode === 'release') {
        f6.manager.setShowcaseLock(null);
        f6.manager.vfx.clear();
        f6.manager.projectiles.clear();
        return true;
      }
      const e = f6.manager.getEnemyById(enemyId);
      if (!e || !e.state.alive) return false;
      f6.manager.setShowcaseLock(enemyId);
      const vfx = f6.manager.vfx;
      const projectiles = f6.manager.projectiles;
      const rigExt = e.rig as typeof e.rig & {
        setPoseMode?: (m: string) => void;
        setBladeCharge?: (c: number) => void;
        setAegisGuard?: (active: boolean, intensity?: number) => void;
        setGroundTelegraph?: (active: boolean, radius: number, progress: number) => void;
        setBladeTrailActive?: (active: boolean) => void;
        getBladeTipWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
        getBladeMidWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
        getShieldCenterWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
      };
      const fx = -Math.sin(e.spatial.yaw);
      const fz = -Math.cos(e.spatial.yaw);

      vfx.clear();
      projectiles.clear();
      e.state.weakpoint.broken = false;
      e.state.staggerTimer = 0;
      e.state.shieldActive = false;
      rigExt.setAegisGuard?.(false, 0);
      rigExt.setGroundTelegraph?.(false, 0, 0);
      rigExt.setBladeCharge?.(0.35);
      rigExt.setBladeTrailActive?.(false);

      const runAnim = (
        params: Parameters<typeof e.rig.updateAnimation>[0],
        steps = 14
      ) => {
        for (let i = 0; i < steps; i++) {
          e.rig.updateAnimation({ ...params, elapsed: params.elapsed + i * params.dt });
        }
        e.rig.root.updateMatrixWorld(true);
      };

      if (mode === 'idle_stance') {
        rigExt.setPoseMode?.('idle_march');
        rigExt.setBladeCharge?.(0.42);
        runAnim({
          dt: 0.04,
          elapsed: 1.4,
          behavior: 'idle',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0,
          attackProgress: 0,
          attackVariant: 0,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
      } else if (mode === 'guard_stance') {
        rigExt.setPoseMode?.('aegis_guard');
        rigExt.setAegisGuard?.(true, 1.0);
        rigExt.setBladeCharge?.(0.65);
        e.state.shieldActive = true;
        runAnim({
          dt: 0.04,
          elapsed: 2.1,
          behavior: 'chase',
          speedRatio: 0.45,
          localMoveX: 0,
          localMoveZ: 0.6,
          aimPitch: 0,
          attackProgress: 0.5,
          attackVariant: 5,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: true,
          phase: 1,
          airborneHeight: 0,
        });
        if (rigExt.getShieldCenterWorldPos) {
          const sc = rigExt.getShieldCenterWorldPos(tmpA);
          vfx.spawnPerilGlint(sc, 0x38bdf8);
        }
        vfx.update(0.04, host.camera.position);
      } else if (mode === 'cleave_combo') {
        rigExt.setPoseMode?.('cleave_1');
        rigExt.setBladeCharge?.(1.0);
        rigExt.setBladeTrailActive?.(true);
        // Step dynamically across the cleave arc so the 14-segment 3D blade ribbon trail fills cleanly!
        for (let i = 0; i < 14; i++) {
          const prog = 0.06 + (i / 13) * 0.78;
          e.rig.updateAnimation({
            dt: 0.025,
            elapsed: 2.0 + i * 0.025,
            behavior: 'attack',
            speedRatio: 0.5,
            localMoveX: 0,
            localMoveZ: 0.6,
            aimPitch: 0,
            attackProgress: prog,
            attackVariant: 0,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
          });
          e.rig.root.updateMatrixWorld(true);
        }
        tmpA.set(e.spatial.x + fx * 1.15, e.spatial.y + 1.38, e.spatial.z + fz * 1.15);
        vfx.spawnBladeSlashArc(tmpA, e.spatial.yaw, 0.16, 0.04, 3.35, 0x38bdf8, true, 1);
        vfx.spawnBladeSlashArc(tmpA, e.spatial.yaw, -0.28, -0.04, 2.95, 0x7dd3fc, true, -1);
        vfx.update(0.04, host.camera.position);
      } else if (mode === 'seismic_slam') {
        rigExt.setPoseMode?.('seismic_slam');
        rigExt.setBladeCharge?.(1.0);
        rigExt.setGroundTelegraph?.(true, 7.6, 0.88);
        runAnim({
          dt: 0.04,
          elapsed: 2.6,
          behavior: 'windup',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0,
          attackProgress: 0.88,
          attackVariant: 1,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
        if (rigExt.getBladeTipWorldPos) {
          const tip = rigExt.getBladeTipWorldPos(tmpA);
          vfx.spawnPerilGlint(tip, 0x7dd3fc);
          vfx.spawnBoosterBurst(tip, tmpFwd.set(0, 1, 0), 0x38bdf8, 12);
        }
        vfx.update(0.04, host.camera.position);
      } else if (mode === 'vault_crash') {
        rigExt.setPoseMode?.('vault_crash');
        rigExt.setBladeCharge?.(1.0);
        rigExt.setBladeTrailActive?.(true);
        for (let i = 0; i < 12; i++) {
          const prog = 0.25 + (i / 11) * 0.52;
          e.rig.updateAnimation({
            dt: 0.025,
            elapsed: 3.0 + i * 0.025,
            behavior: 'attack',
            speedRatio: 1.0,
            localMoveX: 0,
            localMoveZ: 1.0,
            aimPitch: 0.15,
            attackProgress: prog,
            attackVariant: 4,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 2.35,
          });
          e.rig.root.updateMatrixWorld(true);
        }
        tmpA.set(e.spatial.x, e.spatial.y + 0.08, e.spatial.z);
        projectiles.spawnShockwave({
          center: tmpA,
          maxRadius: 8.6,
          expandSpeed: 13.5,
          damage: 24,
          color: 0x38bdf8,
          staggerStrength: 0.9,
        });
        projectiles.update(0.16, tmpB.set(999, 999, 999), true, false, host.hideout.activeCollisionWorld);
        vfx.update(0.04, host.camera.position);
      } else if (mode === 'crescent_wave') {
        rigExt.setPoseMode?.('crescent_wave');
        rigExt.setBladeCharge?.(1.0);
        rigExt.setBladeTrailActive?.(true);
        for (let i = 0; i < 12; i++) {
          const prog = 0.12 + (i / 11) * 0.72;
          e.rig.updateAnimation({
            dt: 0.025,
            elapsed: 3.4 + i * 0.025,
            behavior: 'attack',
            speedRatio: 0.2,
            localMoveX: 0,
            localMoveZ: 0.2,
            aimPitch: 0,
            attackProgress: prog,
            attackVariant: 3,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0,
            weakpointExposed: true,
            weakpointBroken: false,
            shieldActive: false,
            phase: 1,
            airborneHeight: 0,
          });
          e.rig.root.updateMatrixWorld(true);
        }
        tmpA.set(e.spatial.x + fx * 1.15, e.spatial.y + 1.4, e.spatial.z + fz * 1.15);
        vfx.spawnBladeSlashArc(tmpA, e.spatial.yaw, 0.06, 0.02, 3.6, 0x38bdf8, true, 1);
        for (const off of [-0.19, 0, 0.19]) {
          const yaw = e.spatial.yaw + off;
          tmpFwd.set(-Math.sin(yaw), -0.02, -Math.cos(yaw)).normalize();
          projectiles.spawnProjectile({
            origin: tmpA,
            direction: tmpFwd,
            speed: 25,
            damage: 18,
            kind: 'rail_slug',
            color: off === 0 ? 0x7dd3fc : 0x38bdf8,
            radius: 0.22,
            staggerStrength: 0.45,
          });
        }
        projectiles.update(0.09, tmpB.set(999, 999, 999), true, false, host.hideout.activeCollisionWorld);
        vfx.update(0.04, host.camera.position);
      } else if (mode === 'shattered') {
        rigExt.setPoseMode?.('idle_march');
        rigExt.setBladeCharge?.(0.05);
        e.state.weakpoint.broken = true;
        e.state.staggerTimer = 2.6;
        runAnim({
          dt: 0.04,
          elapsed: 4.0,
          behavior: 'staggered',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0,
          attackProgress: 0,
          attackVariant: 0,
          flinchTimer: 0.12,
          flinchDirX: 1,
          staggerTimer: 2.6,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: true,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
        const wp = e.rig.getWeakpointWorldPos(tmpA);
        vfx.spawnBoosterBurst(wp, tmpFwd.set(0, 0.85, 0.4).normalize(), 0x38bdf8, 16);
        vfx.spawnPerilGlint(wp, 0x7dd3fc);
        vfx.update(0.06, host.camera.position);
      }

      host.emitHud();
      host.renderer.render(host.scene, host.camera);
      return true;
    },
    showcaseBeamPrismAction: (
      enemyId: string,
      mode:
        | 'idle_scan'
        | 'rail_charge'
        | 'sweeping_laser'
        | 'refracted_fan'
        | 'refraction_shield'
        | 'bloom_mortar'
        | 'shattered'
        | 'release'
    ) => {
      const f6 = host.floor06Director;
      if (mode === 'release') {
        f6.manager.setShowcaseLock(null);
        f6.manager.vfx.clear();
        f6.manager.projectiles.clear();
        return true;
      }
      const e = f6.manager.getEnemyById(enemyId);
      if (!e || !e.state.alive) return false;
      f6.manager.setShowcaseLock(enemyId);
      const vfx = f6.manager.vfx;
      const projectiles = f6.manager.projectiles;
      const rigExt = e.rig as typeof e.rig & {
        setApertureMode?: (m: string) => void;
        setTargetingLaser?: (
          active: boolean,
          length: number,
          chargeRatio: number,
          firingBeam?: boolean
        ) => void;
        setRefractionShield?: (active: boolean, intensity?: number) => void;
        setNovaTelegraph?: (active: boolean, radius: number, progress: number) => void;
        setMortarOrbCharge?: (charge: number) => void;
        triggerWingRecoil?: () => void;
        getCrownOrbWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
        getShieldCenterWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
      };

      vfx.clear();
      projectiles.clear();
      e.state.weakpoint.broken = false;
      e.state.staggerTimer = 0;
      e.state.shieldActive = false;
      rigExt.setApertureMode?.('scan_idle');
      rigExt.setTargetingLaser?.(false, 0, 0, false);
      rigExt.setRefractionShield?.(false, 0);
      rigExt.setNovaTelegraph?.(false, 0, 0);
      rigExt.setMortarOrbCharge?.(0);

      const runAnim = (
        params: Parameters<typeof e.rig.updateAnimation>[0],
        steps = 14
      ) => {
        for (let i = 0; i < steps; i++) {
          e.rig.updateAnimation({ ...params, elapsed: params.elapsed + i * params.dt });
        }
        e.rig.root.updateMatrixWorld(true);
      };

      if (mode === 'idle_scan') {
        rigExt.setApertureMode?.('scan_idle');
        runAnim({
          dt: 0.04,
          elapsed: 1.5,
          behavior: 'idle',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: -0.04,
          attackProgress: 0,
          attackVariant: 0,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
      } else if (mode === 'rail_charge') {
        rigExt.setApertureMode?.('rail_barrel');
        rigExt.setTargetingLaser?.(true, 14.0, 0.92, false);
        runAnim({
          dt: 0.04,
          elapsed: 2.2,
          behavior: 'windup',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: -0.08,
          attackProgress: 0.92,
          attackVariant: 0,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
        const muz = e.rig.getMuzzleWorldPos(tmpA);
        vfx.spawnPerilGlint(muz, 0xfef08a);
        vfx.update(0.04, host.camera.position);
      } else if (mode === 'sweeping_laser') {
        rigExt.setApertureMode?.('sweep_fan');
        rigExt.setTargetingLaser?.(true, 16.0, 1.2, true);
        runAnim({
          dt: 0.04,
          elapsed: 2.8,
          behavior: 'attack',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: -0.1,
          attackProgress: 0.55,
          attackVariant: 1,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
        const muz = e.rig.getMuzzleWorldPos(tmpA);
        vfx.spawnPerilGlint(muz, 0xfef08a);
        vfx.spawnMuzzleFlash(
          muz,
          tmpFwd.set(-Math.sin(e.spatial.yaw), -0.1, -Math.cos(e.spatial.yaw)).normalize(),
          0x2dd4bf,
          true
        );
        vfx.update(0.03, host.camera.position);
      } else if (mode === 'refraction_shield') {
        rigExt.setApertureMode?.('refraction_shield');
        rigExt.setRefractionShield?.(true, 1.0);
        e.state.shieldActive = true;
        runAnim({
          dt: 0.04,
          elapsed: 3.1,
          behavior: 'chase',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: -0.05,
          attackProgress: 0.5,
          attackVariant: 3,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: true,
          phase: 1,
          airborneHeight: 0,
        });
        if (rigExt.getShieldCenterWorldPos) {
          const sc = rigExt.getShieldCenterWorldPos(tmpA);
          vfx.spawnPerilGlint(sc, 0x5eead4);
        }
        vfx.update(0.04, host.camera.position);
      } else if (mode === 'refracted_fan') {
        rigExt.setApertureMode?.('sweep_fan');
        rigExt.triggerWingRecoil?.();
        runAnim({
          dt: 0.04,
          elapsed: 3.5,
          behavior: 'attack',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: -0.06,
          attackProgress: 0.65,
          attackVariant: 2,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
        const muz = e.rig.getMuzzleWorldPos(tmpA);
        for (const [i, off] of [-0.2, -0.1, 0, 0.1, 0.2].entries()) {
          const yaw = e.spatial.yaw + off;
          const dir = tmpFwd.set(-Math.sin(yaw), -0.05, -Math.cos(yaw)).normalize();
          projectiles.spawnProjectile({
            origin: muz,
            direction: dir,
            speed: 24,
            damage: 14,
            kind: 'plasma_bolt',
            color: i % 2 === 0 ? 0x2dd4bf : 0xfef08a,
            radius: 0.16,
            staggerStrength: 0.24,
          });
        }
        projectiles.update(0.08, tmpB.set(999, 999, 999), true, false, host.hideout.activeCollisionWorld);
        vfx.update(0.03, host.camera.position);
      } else if (mode === 'bloom_mortar') {
        rigExt.setApertureMode?.('bloom_mortar');
        rigExt.setMortarOrbCharge?.(1.0);
        runAnim({
          dt: 0.04,
          elapsed: 3.9,
          behavior: 'windup',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: -0.4,
          attackProgress: 0.88,
          attackVariant: 4,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
        if (rigExt.getCrownOrbWorldPos) {
          const orb = rigExt.getCrownOrbWorldPos(tmpA);
          vfx.spawnPerilGlint(orb, 0xfef08a);
        }
        vfx.update(0.04, host.camera.position);
      } else if (mode === 'shattered') {
        rigExt.setApertureMode?.('scan_idle');
        e.state.weakpoint.broken = true;
        e.state.staggerTimer = 2.6;
        runAnim({
          dt: 0.04,
          elapsed: 4.3,
          behavior: 'staggered',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0.3,
          attackProgress: 0,
          attackVariant: 0,
          flinchTimer: 0.15,
          flinchDirX: 1,
          staggerTimer: 2.6,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: true,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
        const wp = e.rig.getWeakpointWorldPos(tmpA);
        vfx.spawnBoosterBurst(wp, tmpFwd.set(0, 0.85, -0.4).normalize(), 0x2dd4bf, 16);
        vfx.spawnPerilGlint(wp, 0xfef08a);
        vfx.update(0.06, host.camera.position);
      }

      host.emitHud();
      host.renderer.render(host.scene, host.camera);
      return true;
    },
    showcasePhaseBlinkWardenAction: (
      enemyId: string,
      mode:
        | 'idle_stance'
        | 'blink_charge'
        | 'mantis_slash'
        | 'rift_barrage'
        | 'akimbo_burst'
        | 'shattered'
        | 'release' = 'idle_stance'
    ) => {
      if (mode === 'release') {
        host.floor06Director.manager.setShowcaseLock(null);
        return true;
      }
      const e = host.floor06Director.manager.getEnemyById(enemyId);
      if (!e) return false;
      host.floor06Director.manager.setShowcaseLock(enemyId);
      const vfx = host.floor06Director.manager.vfx;
      const projectiles = host.floor06Director.manager.projectiles;
      const rigExt = e.rig as unknown as {
        getLeftMuzzleWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
        getRightMuzzleWorldPos?: (out: THREE.Vector3) => THREE.Vector3;
        setWardenVisualState?: (patch: {
          bladeExtend?: number;
          riftIntensity?: number;
          phaseFade?: number;
          casterCharge?: number;
          gyroAlert?: number;
        }) => void;
        triggerCasterRecoil?: (side: -1 | 1) => void;
      };

      vfx.clear();
      projectiles.clear();
      e.state.shieldActive = false;
      e.state.weakpoint.broken = false;
      e.state.weakpoint.exposed = true;
      e.state.staggerTimer = 0;

      const runAnim = (input: Parameters<typeof e.rig.updateAnimation>[0], steps = 26) => {
        for (let i = 0; i < steps; i++) {
          e.rig.updateAnimation({ ...input, elapsed: input.elapsed + i * 0.04 });
        }
        e.rig.root.updateMatrixWorld(true);
      };

      const fx = -Math.sin(e.spatial.yaw);
      const fz = -Math.cos(e.spatial.yaw);
      const rx = -fz;
      const rz = fx;

      if (mode === 'idle_stance') {
        rigExt.setWardenVisualState?.({
          bladeExtend: 0.24,
          riftIntensity: 0,
          phaseFade: 0,
          casterCharge: 0.25,
          gyroAlert: 0.2,
        });
        runAnim({
          dt: 0.04,
          elapsed: 1.2,
          behavior: 'strafe',
          speedRatio: 0.12,
          localMoveX: 0,
          localMoveZ: 0.05,
          aimPitch: 0,
          attackProgress: 0,
          attackVariant: 0,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
      } else if (mode === 'blink_charge') {
        rigExt.setWardenVisualState?.({
          bladeExtend: 0.88,
          riftIntensity: 1.15,
          phaseFade: 0.72,
          casterCharge: 0.9,
          gyroAlert: 1.35,
        });
        runAnim({
          dt: 0.04,
          elapsed: 2.0,
          behavior: 'windup',
          speedRatio: 0.25,
          localMoveX: 0,
          localMoveZ: 0.2,
          aimPitch: 0,
          attackProgress: 0.85,
          attackVariant: 1,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
        const wp = e.rig.getWeakpointWorldPos(tmpA);
        vfx.spawnPerilGlint(wp, 0xfbbf24);
        vfx.spawnBoosterBurst(
          tmpB.set(e.spatial.x, e.spatial.y + 1.15, e.spatial.z),
          tmpFwd.set(-fx, 0.35, -fz).normalize(),
          0xe879f9,
          14
        );
        vfx.update(0.04, host.camera.position);
      } else if (mode === 'mantis_slash') {
        rigExt.setWardenVisualState?.({
          bladeExtend: 1.14,
          riftIntensity: 0.85,
          phaseFade: 0.25,
          casterCharge: 0.6,
          gyroAlert: 1.1,
        });
        runAnim({
          dt: 0.04,
          elapsed: 2.8,
          behavior: 'attack',
          speedRatio: 0.85,
          localMoveX: 0,
          localMoveZ: 0.9,
          aimPitch: 0,
          attackProgress: 0.48,
          attackVariant: 2,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
        const origin = tmpA.set(e.spatial.x, e.spatial.y + 1.24, e.spatial.z);
        vfx.spawnBladeSlashArc(origin, e.spatial.yaw, 0.34, 0.08, 2.7, 0xe879f9, true, 1);
        vfx.spawnBladeSlashArc(origin, e.spatial.yaw, -0.34, 0.08, 2.7, 0xc084fc, true, -1);
        vfx.spawnSurfaceSlashScar(
          tmpB.set(e.spatial.x + fx * 1.45, e.spatial.y + 0.04, e.spatial.z + fz * 1.45),
          tmpNormal.set(0, 1, 0),
          tmpRight.set(rx, 0, rz).normalize(),
          true
        );
        vfx.update(0.04, host.camera.position);
      } else if (mode === 'rift_barrage') {
        rigExt.setWardenVisualState?.({
          bladeExtend: 0.32,
          riftIntensity: 0.72,
          phaseFade: 0.15,
          casterCharge: 1.4,
          gyroAlert: 1.0,
        });
        runAnim({
          dt: 0.04,
          elapsed: 3.4,
          behavior: 'attack',
          speedRatio: 0.1,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0,
          attackProgress: 0.45,
          attackVariant: 3,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
        const muzL = rigExt.getLeftMuzzleWorldPos
          ? rigExt.getLeftMuzzleWorldPos(tmpA)
          : e.rig.getMuzzleWorldPos(tmpA);
        const muzR = rigExt.getRightMuzzleWorldPos
          ? rigExt.getRightMuzzleWorldPos(tmpB)
          : e.rig.getMuzzleWorldPos(tmpB);
        const mid = tmpC.addVectors(muzL, muzR).multiplyScalar(0.5);
        vfx.spawnMuzzleFlash(mid, tmpFwd.set(fx, 0, fz).normalize(), 0xe879f9, true);
        for (const [i, off] of [-0.24, -0.12, 0, 0.12, 0.24].entries()) {
          const yaw = e.spatial.yaw + off;
          const dir = tmpRight.set(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
          projectiles.spawnProjectile({
            origin: mid.clone(),
            direction: dir.clone(),
            speed: 22,
            damage: 14,
            radius: 0.17,
            color: i % 2 === 0 ? 0xe879f9 : 0xfbbf24,
            kind: 'plasma_bolt',
            staggerStrength: 0.26,
          });
        }
        projectiles.update(0.08, tmpNormal.set(999, 999, 999), true, false, host.hideout.activeCollisionWorld);
        vfx.update(0.04, host.camera.position);
      } else if (mode === 'akimbo_burst') {
        rigExt.setWardenVisualState?.({
          bladeExtend: 0.24,
          riftIntensity: 0.12,
          phaseFade: 0,
          casterCharge: 1.1,
          gyroAlert: 0.45,
        });
        rigExt.triggerCasterRecoil?.(1);
        runAnim({
          dt: 0.04,
          elapsed: 3.9,
          behavior: 'attack',
          speedRatio: 0.6,
          localMoveX: 0.8,
          localMoveZ: 0.1,
          aimPitch: 0,
          attackProgress: 0.5,
          attackVariant: 0,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
        const muzR = rigExt.getRightMuzzleWorldPos
          ? rigExt.getRightMuzzleWorldPos(tmpA)
          : e.rig.getMuzzleWorldPos(tmpA);
        vfx.spawnMuzzleFlash(muzR, tmpFwd.set(fx, 0, fz).normalize(), 0xe879f9, false);
        vfx.update(0.03, host.camera.position);
      } else if (mode === 'shattered') {
        rigExt.setWardenVisualState?.({
          bladeExtend: 0.14,
          riftIntensity: 0,
          phaseFade: 0,
          casterCharge: 0,
          gyroAlert: 0,
        });
        e.state.weakpoint.broken = true;
        e.state.staggerTimer = 2.6;
        runAnim({
          dt: 0.04,
          elapsed: 4.4,
          behavior: 'staggered',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0.25,
          attackProgress: 0,
          attackVariant: 0,
          flinchTimer: 0.16,
          flinchDirX: 1,
          staggerTimer: 2.6,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: true,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
        const wp = e.rig.getWeakpointWorldPos(tmpA);
        vfx.spawnBoosterBurst(wp, tmpFwd.set(0, 0.85, -0.4).normalize(), 0xfbbf24, 16);
        vfx.spawnPerilGlint(wp, 0xfef08a);
        vfx.update(0.05, host.camera.position);
      }

      host.emitHud();
      host.renderer.render(host.scene, host.camera);
      return true;
    },
    showcaseRealityWeaverAction: (
      enemyId: string,
      mode:
        | 'idle_p1'
        | 'beam_lance'
        | 'stave_helix'
        | 'mortar_bloom'
        | 'rift_scythe'
        | 'phase2_overdrive'
        | 'shattered'
        | 'release'
    ) => {
      const f6 = host.floor06Director;
      if (mode === 'release') {
        f6.manager.setShowcaseLock(null);
        f6.manager.vfx.clear();
        f6.manager.projectiles.clear();
        return true;
      }
      const e = f6.manager.getEnemyById(enemyId);
      if (!e || !e.state.alive) return false;
      f6.manager.setShowcaseLock(enemyId);
      const vfx = f6.manager.vfx;
      const projectiles = f6.manager.projectiles;
      const rigExt = e.rig as typeof e.rig & {
        setBeamTelegraph?: (
          active: boolean,
          length: number,
          chargeRatio: number,
          firing?: boolean,
          sweepYawOffset?: number
        ) => void;
        setWeaverVisualState?: (state: {
          formation?:
            | 'orbit_serene'
            | 'beam_prism_lock'
            | 'mortar_crown_bloom'
            | 'rift_scythe_spread'
            | 'repel_implode'
            | 'phase2_overdrive_star';
          phase2Aura?: number;
          castGlow?: number;
          riftIntensity?: number;
          repelImplode?: number;
          blinkPhase?: number;
        }) => void;
        getStaveTipWorldPos?: (index: number, out: THREE.Vector3) => THREE.Vector3;
        getHandFocusWorldPos?: (side: -1 | 1, out: THREE.Vector3) => THREE.Vector3;
      };
      const fx = -Math.sin(e.spatial.yaw);
      const fz = -Math.cos(e.spatial.yaw);

      vfx.clear();
      projectiles.clear();
      rigExt.setBeamTelegraph?.(false, 0, 0, false, 0);
      e.state.weakpoint.broken = false;
      e.state.staggerTimer = 0;

      const runAnim = (
        params: Parameters<typeof e.rig.updateAnimation>[0],
        steps = 16
      ) => {
        for (let i = 0; i < steps; i++) {
          e.rig.updateAnimation({
            ...params,
            elapsed: params.elapsed + i * params.dt,
          });
        }
        e.rig.root.updateMatrixWorld(true);
      };

      if (mode === 'idle_p1') {
        e.state.phase = 1;
        rigExt.setWeaverVisualState?.({
          formation: 'orbit_serene',
          phase2Aura: 0,
          castGlow: 0.15,
          riftIntensity: 0,
          repelImplode: 0,
          blinkPhase: 0,
        });
        runAnim({
          dt: 0.04,
          elapsed: 1.0,
          behavior: 'strafe',
          speedRatio: 0.2,
          localMoveX: 0.1,
          localMoveZ: 0.05,
          aimPitch: 0,
          attackProgress: 0,
          attackVariant: 0,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
      } else if (mode === 'beam_lance') {
        e.state.phase = 2;
        rigExt.setWeaverVisualState?.({
          formation: 'beam_prism_lock',
          phase2Aura: 1.0,
          castGlow: 1.3,
          riftIntensity: 0.4,
          repelImplode: 0,
          blinkPhase: 0,
        });
        rigExt.setBeamTelegraph?.(true, 12.0, 1.25, true, 0);
        runAnim({
          dt: 0.04,
          elapsed: 2.0,
          behavior: 'attack',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0,
          attackProgress: 0.55,
          attackVariant: 1,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 2,
          airborneHeight: 0,
        });
        const muz = e.rig.getMuzzleWorldPos(tmpA);
        vfx.spawnMuzzleFlash(muz, tmpFwd.set(fx, 0, fz).normalize(), 0xfef08a, true);
        vfx.update(0.03, host.camera.position);
      } else if (mode === 'stave_helix') {
        e.state.phase = 2;
        rigExt.setWeaverVisualState?.({
          formation: 'phase2_overdrive_star',
          phase2Aura: 1.0,
          castGlow: 1.15,
          riftIntensity: 0.5,
          repelImplode: 0,
          blinkPhase: 0,
        });
        runAnim({
          dt: 0.04,
          elapsed: 2.8,
          behavior: 'attack',
          speedRatio: 0.1,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0,
          attackProgress: 0.5,
          attackVariant: 2,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 2,
          airborneHeight: 0,
        });
        for (let i = 0; i < 6; i++) {
          const tip = rigExt.getStaveTipWorldPos
            ? rigExt.getStaveTipWorldPos(i, tmpA)
            : e.rig.getMuzzleWorldPos(tmpA);
          const yaw = e.spatial.yaw + (i - 2.5) * 0.07;
          const dir = tmpFwd.set(-Math.sin(yaw), 0.02, -Math.cos(yaw)).normalize();
          projectiles.spawnProjectile({
            origin: tip.clone(),
            direction: dir.clone(),
            speed: 22,
            damage: 15,
            radius: 0.16,
            color: i % 2 === 0 ? 0xfde047 : 0xe879f9,
            kind: i % 2 === 0 ? 'boss_overdrive' : 'plasma_bolt',
            staggerStrength: 0.3,
          });
        }
        projectiles.update(0.08, tmpNormal.set(999, 999, 999), true, false, host.hideout.activeCollisionWorld);
        vfx.update(0.03, host.camera.position);
      } else if (mode === 'mortar_bloom') {
        e.state.phase = 2;
        rigExt.setWeaverVisualState?.({
          formation: 'mortar_crown_bloom',
          phase2Aura: 0.9,
          castGlow: 1.1,
          riftIntensity: 0,
          repelImplode: 0,
          blinkPhase: 0,
        });
        runAnim({
          dt: 0.04,
          elapsed: 3.4,
          behavior: 'attack',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0,
          attackProgress: 0.5,
          attackVariant: 3,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 2,
          airborneHeight: 0,
        });
        const wp = e.rig.getWeakpointWorldPos(tmpA);
        vfx.spawnPerilGlint(wp, 0xf59e0b);
        vfx.update(0.03, host.camera.position);
      } else if (mode === 'rift_scythe') {
        e.state.phase = 2;
        rigExt.setWeaverVisualState?.({
          formation: 'rift_scythe_spread',
          phase2Aura: 1.0,
          castGlow: 1.15,
          riftIntensity: 1.25,
          repelImplode: 0,
          blinkPhase: 0,
        });
        runAnim({
          dt: 0.04,
          elapsed: 4.0,
          behavior: 'attack',
          speedRatio: 0.15,
          localMoveX: 0,
          localMoveZ: 0.15,
          aimPitch: 0,
          attackProgress: 0.42,
          attackVariant: 4,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 2,
          airborneHeight: 0,
        });
        const origin = tmpA.set(e.spatial.x, e.spatial.y + 1.72, e.spatial.z);
        vfx.spawnBladeSlashArc(origin, e.spatial.yaw, 0.34, 0.08, 3.6, 0xe879f9, true, 1);
        vfx.spawnBladeSlashArc(origin, e.spatial.yaw, -0.34, 0.08, 3.6, 0xfde047, true, -1);
        vfx.spawnSurfaceSlashScar(
          tmpB.set(e.spatial.x + fx * 2.2, e.spatial.y + 0.04, e.spatial.z + fz * 2.2),
          tmpNormal.set(0, 1, 0),
          tmpFwd.set(fx, 0, fz).normalize(),
          true
        );
        vfx.update(0.04, host.camera.position);
      } else if (mode === 'phase2_overdrive') {
        e.state.phase = 2;
        rigExt.setWeaverVisualState?.({
          formation: 'phase2_overdrive_star',
          phase2Aura: 1.0,
          castGlow: 1.2,
          riftIntensity: 0.6,
          repelImplode: 0.85,
          blinkPhase: 0,
        });
        runAnim({
          dt: 0.04,
          elapsed: 4.8,
          behavior: 'attack',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0,
          attackProgress: 0.35,
          attackVariant: 5,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 2,
          airborneHeight: 0,
        });
        projectiles.spawnShockwave({
          center: tmpA.set(e.spatial.x, e.spatial.y + 0.14, e.spatial.z),
          maxRadius: 9.8,
          expandSpeed: 14.0,
          damage: 28,
          color: 0xf0abfc,
          staggerStrength: 0.9,
        });
        projectiles.update(0.18, tmpB.set(999, 999, 999), true, false, host.hideout.activeCollisionWorld);
        vfx.update(0.03, host.camera.position);
      } else if (mode === 'shattered') {
        e.state.phase = 1;
        e.state.weakpoint.broken = true;
        e.state.staggerTimer = 2.8;
        rigExt.setWeaverVisualState?.({
          formation: 'orbit_serene',
          phase2Aura: 0,
          castGlow: 0,
          riftIntensity: 0,
          repelImplode: 0,
          blinkPhase: 0,
        });
        runAnim({
          dt: 0.04,
          elapsed: 5.5,
          behavior: 'staggered',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0.2,
          attackProgress: 0,
          attackVariant: 0,
          flinchTimer: 0.16,
          flinchDirX: 1,
          staggerTimer: 2.8,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: true,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
        const wp = e.rig.getWeakpointWorldPos(tmpA);
        vfx.spawnBoosterBurst(wp, tmpFwd.set(0, 0.9, -0.35).normalize(), 0xfde047, 18);
        vfx.spawnPerilGlint(wp, 0xfef08a);
        vfx.update(0.05, host.camera.position);
      }

      host.emitHud();
      host.renderer.render(host.scene, host.camera);
      return true;
    },
    showcaseGravityHoundAction: (
      enemyId: string,
      mode:
        | 'idle_p1'
        | 'pounce_leap'
        | 'maw_beam'
        | 'tail_cleave'
        | 'mortar_salvo'
        | 'bull_charge'
        | 'phase2_nova'
        | 'shattered'
        | 'release'
    ) => {
      if (mode === 'release') {
        host.floor06Director.manager.setShowcaseLock(null);
        return true;
      }
      const e = host.floor06Director.manager.getEnemyById(enemyId);
      if (!e) return false;
      host.floor06Director.manager.setShowcaseLock(enemyId);
      const vfx = host.floor06Director.manager.vfx;
      const projectiles = host.floor06Director.manager.projectiles;
      const rigExt = e.rig as unknown as {
        setMawBeamTelegraph?: (
          active: boolean,
          length: number,
          chargeRatio: number,
          firing?: boolean,
          sweepYawOffset?: number
        ) => void;
        setHoundVisualState?: (st: {
          stance?: string;
          phase2Aura?: number;
          jawOpen?: number;
          shutterOpen?: number;
          gravFieldIntensity?: number;
          tuskCharge?: number;
          tailSpinAngle?: number;
          mortarPitch?: number;
        }) => void;
        getTuskTipWorldPos?: (side: -1 | 1, out: THREE.Vector3) => THREE.Vector3;
        getShoulderPodWorldPos?: (side: -1 | 1, out: THREE.Vector3) => THREE.Vector3;
      };

      vfx.clear();
      projectiles.clear();
      rigExt.setMawBeamTelegraph?.(false, 0, 0, false, 0);
      e.state.weakpoint.broken = false;
      e.state.staggerTimer = 0;

      const fx = -Math.sin(e.spatial.yaw);
      const fz = -Math.cos(e.spatial.yaw);

      const runAnim = (input: Parameters<typeof e.rig.updateAnimation>[0], steps = 28) => {
        for (let i = 0; i < steps; i++) {
          e.rig.updateAnimation({ ...input, elapsed: input.elapsed + i * 0.04 });
        }
        e.rig.root.updateMatrixWorld(true);
      };

      if (mode === 'idle_p1') {
        e.state.phase = 1;
        rigExt.setHoundVisualState?.({
          stance: 'stalk',
          phase2Aura: 0,
          jawOpen: 0.14,
          shutterOpen: 0.42,
          gravFieldIntensity: 0.35,
          tuskCharge: 0.35,
          tailSpinAngle: 0,
          mortarPitch: 0,
        });
        runAnim({
          dt: 0.04,
          elapsed: 1.0,
          behavior: 'chase',
          speedRatio: 0.0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0,
          attackProgress: 0,
          attackVariant: 0,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: false,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
      } else if (mode === 'pounce_leap') {
        e.state.phase = 2;
        rigExt.setHoundVisualState?.({
          stance: 'pounce_leap',
          phase2Aura: 0.9,
          jawOpen: 0.58,
          shutterOpen: 0.92,
          gravFieldIntensity: 0.85,
          tuskCharge: 1.0,
          tailSpinAngle: 0,
          mortarPitch: 0,
        });
        runAnim({
          dt: 0.04,
          elapsed: 2.0,
          behavior: 'attack',
          speedRatio: 1.2,
          localMoveX: 0,
          localMoveZ: 1.2,
          aimPitch: 0,
          attackProgress: 0.36,
          attackVariant: 1,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 2,
          airborneHeight: 1.45,
        });
        vfx.spawnBoosterBurst(
          tmpA.set(e.spatial.x - fx * 0.6, e.spatial.y + 1.85, e.spatial.z - fz * 0.6),
          tmpFwd.set(-fx, -0.3, -fz).normalize(),
          0xf97316,
          22
        );
        vfx.update(0.03, host.camera.position);
      } else if (mode === 'maw_beam') {
        e.state.phase = 2;
        rigExt.setHoundVisualState?.({
          stance: 'maw_beam',
          phase2Aura: 1.0,
          jawOpen: 0.72,
          shutterOpen: 0.98,
          gravFieldIntensity: 1.0,
          tuskCharge: 1.3,
          tailSpinAngle: 0,
          mortarPitch: 0,
        });
        rigExt.setMawBeamTelegraph?.(true, 11.5, 1.25, true, 0);
        runAnim({
          dt: 0.04,
          elapsed: 3.0,
          behavior: 'attack',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0,
          attackProgress: 0.5,
          attackVariant: 7,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 2,
          airborneHeight: 0,
        });
        const muz = e.rig.getMuzzleWorldPos(tmpA);
        vfx.spawnMuzzleFlash(muz, tmpFwd.set(fx, 0, fz).normalize(), 0xfb923c, true);
        vfx.update(0.03, host.camera.position);
      } else if (mode === 'tail_cleave') {
        e.state.phase = 2;
        rigExt.setHoundVisualState?.({
          stance: 'tail_whip',
          phase2Aura: 0.85,
          jawOpen: 0.5,
          shutterOpen: 0.65,
          gravFieldIntensity: 0.7,
          tuskCharge: 0.6,
          tailSpinAngle: 1.15,
          mortarPitch: 0,
        });
        runAnim({
          dt: 0.04,
          elapsed: 3.8,
          behavior: 'attack',
          speedRatio: 0.2,
          localMoveX: 0,
          localMoveZ: 0.2,
          aimPitch: 0,
          attackProgress: 0.45,
          attackVariant: 3,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: false,
          weakpointBroken: false,
          shieldActive: false,
          phase: 2,
          airborneHeight: 0,
        });
        const origin = tmpA.set(e.spatial.x, e.spatial.y + 1.05, e.spatial.z);
        vfx.spawnBladeSlashArc(origin, e.spatial.yaw, 0.08, 0.04, 4.1, 0xef4444, true, 1);
        vfx.spawnBladeSlashArc(origin, e.spatial.yaw + Math.PI, -0.08, 0.04, 4.1, 0xfb923c, true, 1);
        vfx.spawnSurfaceSlashScar(
          tmpB.set(e.spatial.x + fx * 2.1, e.spatial.y + 0.04, e.spatial.z + fz * 2.1),
          tmpNormal.set(0, 1, 0),
          tmpFwd.set(fx, 0, fz).normalize(),
          true
        );
        vfx.update(0.04, host.camera.position);
      } else if (mode === 'mortar_salvo') {
        e.state.phase = 2;
        rigExt.setHoundVisualState?.({
          stance: 'mortar_salvo',
          phase2Aura: 0.9,
          jawOpen: 0.34,
          shutterOpen: 0.88,
          gravFieldIntensity: 0.65,
          tuskCharge: 0.5,
          tailSpinAngle: 0,
          mortarPitch: 1.0,
        });
        runAnim({
          dt: 0.04,
          elapsed: 4.5,
          behavior: 'attack',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0,
          attackProgress: 0.5,
          attackVariant: 5,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 2,
          airborneHeight: 0,
        });
        for (const side of [-1, 1] as const) {
          const pod = rigExt.getShoulderPodWorldPos
            ? rigExt.getShoulderPodWorldPos(side, tmpA)
            : e.rig.getMuzzleWorldPos(tmpA);
          const dir = tmpFwd.set(fx * 0.65, 0.76, fz * 0.65).normalize();
          vfx.spawnMuzzleFlash(pod, dir, 0xf59e0b, true);
          projectiles.spawnProjectile({
            origin: pod.clone(),
            direction: dir.clone(),
            speed: 14.5,
            damage: 22,
            radius: 0.24,
            color: 0xf97316,
            kind: 'mortar_canister',
            gravity: 16.5,
            splashRadius: 2.8,
            staggerStrength: 0.55,
          });
        }
        projectiles.update(0.1, tmpB.set(999, 999, 999), true, false, host.hideout.activeCollisionWorld);
        vfx.update(0.03, host.camera.position);
      } else if (mode === 'bull_charge') {
        e.state.phase = 2;
        rigExt.setHoundVisualState?.({
          stance: 'bull_charge',
          phase2Aura: 1.0,
          jawOpen: 0.44,
          shutterOpen: 0.52,
          gravFieldIntensity: 0.85,
          tuskCharge: 1.35,
          tailSpinAngle: 0,
          mortarPitch: 0,
        });
        runAnim({
          dt: 0.04,
          elapsed: 5.2,
          behavior: 'attack',
          speedRatio: 1.35,
          localMoveX: 0,
          localMoveZ: 1.35,
          aimPitch: 0,
          attackProgress: 0.48,
          attackVariant: 6,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: false,
          weakpointBroken: false,
          shieldActive: false,
          phase: 2,
          airborneHeight: 0,
        });
        vfx.spawnBoosterBurst(
          tmpA.set(e.spatial.x - fx * 0.65, e.spatial.y + 1.38, e.spatial.z - fz * 0.65),
          tmpFwd.set(-fx, 0.15, -fz).normalize(),
          0xfb923c,
          24
        );
        vfx.update(0.03, host.camera.position);
      } else if (mode === 'phase2_nova') {
        e.state.phase = 2;
        rigExt.setHoundVisualState?.({
          stance: 'grav_pulse',
          phase2Aura: 1.0,
          jawOpen: 0.66,
          shutterOpen: 1.0,
          gravFieldIntensity: 1.3,
          tuskCharge: 1.1,
          tailSpinAngle: 0,
          mortarPitch: 0,
        });
        runAnim({
          dt: 0.04,
          elapsed: 6.0,
          behavior: 'attack',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0,
          attackProgress: 0.4,
          attackVariant: 2,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 2,
          airborneHeight: 0,
        });
        projectiles.spawnShockwave({
          center: tmpA.set(e.spatial.x, e.spatial.y + 0.14, e.spatial.z),
          maxRadius: 10.6,
          expandSpeed: 15.0,
          damage: 28,
          color: 0xf97316,
          staggerStrength: 0.9,
        });
        projectiles.update(0.18, tmpB.set(999, 999, 999), true, false, host.hideout.activeCollisionWorld);
        vfx.update(0.03, host.camera.position);
      } else if (mode === 'shattered') {
        e.state.phase = 1;
        e.state.weakpoint.broken = true;
        e.state.staggerTimer = 2.8;
        rigExt.setHoundVisualState?.({
          stance: 'stalk',
          phase2Aura: 0,
          jawOpen: 0.45,
          shutterOpen: 1.0,
          gravFieldIntensity: 0.1,
          tuskCharge: 0,
          tailSpinAngle: 0,
          mortarPitch: 0,
        });
        runAnim({
          dt: 0.04,
          elapsed: 6.8,
          behavior: 'staggered',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0,
          attackProgress: 0,
          attackVariant: 0,
          flinchTimer: 0.16,
          flinchDirX: 1,
          staggerTimer: 2.8,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: true,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
        const wp = e.rig.getWeakpointWorldPos(tmpA);
        vfx.spawnBoosterBurst(wp, tmpFwd.set(0, 0.92, -0.25).normalize(), 0xf97316, 20);
        vfx.spawnPerilGlint(wp, 0xfef08a);
        vfx.update(0.05, host.camera.position);
      }

      host.emitHud();
      host.renderer.render(host.scene, host.camera);
      return true;
    },
    showcaseMonolithArchonAction: (
      enemyId: string,
      mode:
        | 'idle_p1'
        | 'rail_scissor'
        | 'cataclysm_slam'
        | 'scythe_cleave'
        | 'meteor_salvo'
        | 'vent_exposed'
        | 'phase2_supernova'
        | 'shattered'
        | 'death_collapse'
        | 'release'
    ) => {
      const mgr = host.floor06Director.manager;
      if (mode === 'release') {
        mgr.setShowcaseLock(null);
        return true;
      }
      if (!mgr.allEnemies.some((x) => x.id === enemyId)) {
        host.floor06Director.spawnFloorBossNow();
      }
      const e = mgr.allEnemies.find((x) => x.id === enemyId);
      if (!e) return false;

      mgr.setShowcaseLock(enemyId);
      const rigExt = e.rig as unknown as {
        setArchonVisualState?: (s: Record<string, unknown>) => void;
        setDualArchonLasers?: (
          active: boolean,
          leftLen: number,
          rightLen: number,
          chargeRatio: number,
          firing?: boolean,
          leftYawOffset?: number,
          rightYawOffset?: number
        ) => void;
        getLeftPylonMuzzlePos?: (out: THREE.Vector3) => THREE.Vector3;
        getRightPylonMuzzlePos?: (out: THREE.Vector3) => THREE.Vector3;
      };

      const vfx = mgr.vfx;
      const projectiles = mgr.projectiles;
      vfx.clear();
      projectiles.clear();
      const fx = -Math.sin(e.spatial.yaw);
      const fz = -Math.cos(e.spatial.yaw);

      e.spatial.x = 0.0;
      e.spatial.y = 70.65;
      e.spatial.z = 0.0;
      e.spatial.yaw = Math.PI;
      e.rig.root.position.set(e.spatial.x, e.spatial.y, e.spatial.z);
      e.rig.root.rotation.y = e.spatial.yaw;
      e.state.alive = true;
      e.state.staggerTimer = 0;
      e.state.weakpoint.broken = false;
      e.state.weakpoint.exposed = false;
      rigExt.setDualArchonLasers?.(false, 0, 0, 0);

      const runAnim = (
        input: Parameters<typeof e.rig.updateAnimation>[0],
        steps = 12
      ) => {
        const groundedHeight = Math.max(0, e.spatial.y - 70.0);
        for (let i = 0; i < steps; i++) {
          e.rig.updateAnimation({
            ...input,
            airborneHeight: groundedHeight,
            elapsed: input.elapsed + i * input.dt,
          });
        }
        e.rig.root.updateMatrixWorld(true);
      };

      if (mode === 'idle_p1') {
        e.state.phase = 1;
        rigExt.setArchonVisualState?.({
          stance: 'hover_stalk',
          phase2Aura: 0,
          shutterOpen: 0,
          scytheGlow: 0,
          scytheSwingAngle: 0,
          sanctuaryIntensity: 0.45,
          wingSpreadBoost: 0.05,
          pylonPitchBoost: 0,
          supernovaCharge: 0,
        });
        runAnim({
          dt: 0.04,
          elapsed: 1.4,
          behavior: 'strafe',
          speedRatio: 0.25,
          localMoveX: 0,
          localMoveZ: 0.25,
          aimPitch: 0,
          attackProgress: 0,
          attackVariant: 0,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: false,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
      } else if (mode === 'vent_exposed') {
        e.state.phase = 1;
        e.state.weakpoint.exposed = true;
        rigExt.setArchonVisualState?.({
          stance: 'resonance_vent',
          phase2Aura: 0,
          shutterOpen: 1.0,
          scytheGlow: 0,
          scytheSwingAngle: 0,
          sanctuaryIntensity: 0.65,
          wingSpreadBoost: 0.14,
          pylonPitchBoost: -0.1,
          supernovaCharge: 0,
        });
        runAnim({
          dt: 0.04,
          elapsed: 2.2,
          behavior: 'recover',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0,
          attackProgress: 0,
          attackVariant: 0,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
        const wp = e.rig.getWeakpointWorldPos(tmpA);
        vfx.spawnBoosterBurst(wp, tmpFwd.set(fx, 0.35, fz).normalize(), 0xfde047, 14);
        vfx.update(0.03, host.camera.position);
      } else if (mode === 'rail_scissor') {
        e.state.phase = 2;
        rigExt.setArchonVisualState?.({
          stance: 'rail_scissor',
          phase2Aura: 1.0,
          shutterOpen: 0,
          scytheGlow: 0,
          scytheSwingAngle: 0,
          sanctuaryIntensity: 1.2,
          wingSpreadBoost: 0.25,
          pylonPitchBoost: -0.08,
          supernovaCharge: 0,
        });
        rigExt.setDualArchonLasers?.(true, 16.5, 16.5, 1.15, true, -0.16, 0.16);
        runAnim({
          dt: 0.04,
          elapsed: 3.1,
          behavior: 'attack',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: -0.06,
          attackProgress: 0.55,
          attackVariant: 1,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: false,
          weakpointBroken: false,
          shieldActive: false,
          phase: 2,
          airborneHeight: 0,
        });
      } else if (mode === 'scythe_cleave') {
        e.state.phase = 2;
        rigExt.setArchonVisualState?.({
          stance: 'scythe_cleave',
          phase2Aura: 1.0,
          shutterOpen: 0,
          scytheGlow: 1.4,
          scytheSwingAngle: 0.45,
          sanctuaryIntensity: 1.0,
          wingSpreadBoost: 0.22,
          pylonPitchBoost: -0.15,
          supernovaCharge: 0,
        });
        runAnim({
          dt: 0.04,
          elapsed: 4.0,
          behavior: 'attack',
          speedRatio: 0.85,
          localMoveX: 0,
          localMoveZ: 0.85,
          aimPitch: 0,
          attackProgress: 0.52,
          attackVariant: 2,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: false,
          weakpointBroken: false,
          shieldActive: false,
          phase: 2,
          airborneHeight: 0,
        });
        const slashOrigin = tmpA.set(e.spatial.x, e.spatial.y + 1.85, e.spatial.z + 1.1);
        vfx.spawnBladeSlashArc(slashOrigin, e.spatial.yaw, 0.36, -0.1, 5.2, 0xf97316, true, 1);
        vfx.spawnBladeSlashArc(slashOrigin, e.spatial.yaw, -0.36, 0.1, 5.2, 0xfde047, true, -1);
        vfx.update(0.04, host.camera.position);
      } else if (mode === 'cataclysm_slam') {
        e.state.phase = 2;
        e.spatial.y = 70.1;
        e.rig.root.position.y = e.spatial.y;
        rigExt.setArchonVisualState?.({
          stance: 'cataclysm_slam',
          phase2Aura: 1.0,
          shutterOpen: 0.3,
          scytheGlow: 0,
          scytheSwingAngle: 0,
          sanctuaryIntensity: 1.4,
          wingSpreadBoost: 0.38,
          pylonPitchBoost: -0.22,
          supernovaCharge: 0,
        });
        runAnim({
          dt: 0.04,
          elapsed: 4.9,
          behavior: 'attack',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0,
          attackProgress: 0.72,
          attackVariant: 3,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: false,
          weakpointBroken: false,
          shieldActive: false,
          phase: 2,
          airborneHeight: 0,
        });
        projectiles.spawnShockwave({
          center: tmpA.set(e.spatial.x, 70.15, e.spatial.z),
          maxRadius: 14.5,
          expandSpeed: 16.5,
          damage: 28,
          color: 0xf97316,
          staggerStrength: 0.9,
        });
        projectiles.update(0.22, tmpB.set(999, 999, 999), true, false, host.hideout.activeCollisionWorld);
        vfx.update(0.03, host.camera.position);
      } else if (mode === 'meteor_salvo') {
        e.state.phase = 1;
        rigExt.setArchonVisualState?.({
          stance: 'meteor_salvo',
          phase2Aura: 0,
          shutterOpen: 0,
          scytheGlow: 0,
          scytheSwingAngle: 0,
          sanctuaryIntensity: 0.85,
          wingSpreadBoost: 0.32,
          pylonPitchBoost: 0.72,
          supernovaCharge: 0,
        });
        runAnim({
          dt: 0.04,
          elapsed: 5.5,
          behavior: 'attack',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0,
          attackProgress: 0.5,
          attackVariant: 4,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: false,
          weakpointBroken: false,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
        const meteorOffsets: [number, number][] = [
          [-2.6, 5.2],
          [2.6, 5.2],
        ];
        [rigExt.getLeftPylonMuzzlePos, rigExt.getRightPylonMuzzlePos].forEach((fn, idx) => {
          const m = fn ? fn(tmpA) : e.rig.getMuzzleWorldPos(tmpA);
          const d = tmpFwd.set(idx === 0 ? -0.22 : 0.22, 0.84, 0.5).normalize();
          vfx.spawnBoosterBurst(m, d, 0xc084fc, 12);
          vfx.spawnPerilGlint(m, 0xfde047);
          projectiles.spawnShockwave({
            center: tmpB.set(e.spatial.x + meteorOffsets[idx][0], 70.08, e.spatial.z + meteorOffsets[idx][1]).clone(),
            maxRadius: 3.6,
            expandSpeed: 10.5,
            damage: 0,
            color: 0xc084fc,
            staggerStrength: 0,
          });
          projectiles.spawnProjectile({
            origin: m.clone(),
            direction: d.clone(),
            speed: 14.5,
            damage: 22,
            radius: 0.25,
            color: 0xc084fc,
            kind: 'mortar_canister',
            gravity: 16.2,
            splashRadius: 4.1,
            staggerStrength: 0.7,
          });
        });
        projectiles.update(0.18, tmpB.set(999, 999, 999), true, false, host.hideout.activeCollisionWorld);
        vfx.update(0.03, host.camera.position);
      } else if (mode === 'phase2_supernova') {
        e.state.phase = 2;
        e.spatial.y = 71.05;
        e.rig.root.position.y = e.spatial.y;
        rigExt.setArchonVisualState?.({
          stance: 'supernova_cascade',
          phase2Aura: 1.0,
          shutterOpen: 0.92,
          scytheGlow: 0,
          scytheSwingAngle: 0,
          sanctuaryIntensity: 1.4,
          wingSpreadBoost: 0.45,
          pylonPitchBoost: 0.12,
          supernovaCharge: 1.25,
        });
        runAnim({
          dt: 0.04,
          elapsed: 6.4,
          behavior: 'attack',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0,
          attackProgress: 0.6,
          attackVariant: 5,
          flinchTimer: 0,
          flinchDirX: 0,
          staggerTimer: 0,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: false,
          shieldActive: false,
          phase: 2,
          airborneHeight: Math.max(0, e.spatial.y - 70.0),
        });
        projectiles.spawnShockwave({
          center: tmpA.set(e.spatial.x, 70.16, e.spatial.z),
          maxRadius: 15.8,
          expandSpeed: 16.5,
          damage: 24,
          color: 0xf97316,
          staggerStrength: 0.82,
        });
        projectiles.update(0.24, tmpB.set(999, 999, 999), true, false, host.hideout.activeCollisionWorld);
        vfx.update(0.03, host.camera.position);
      } else if (mode === 'shattered') {
        e.state.phase = 1;
        e.state.weakpoint.exposed = true;
        e.state.weakpoint.broken = true;
        e.state.staggerTimer = 3.2;
        rigExt.setArchonVisualState?.({
          stance: 'resonance_vent',
          phase2Aura: 0,
          shutterOpen: 1.0,
          scytheGlow: 0,
          scytheSwingAngle: 0,
          sanctuaryIntensity: 0.15,
          wingSpreadBoost: -0.25,
          pylonPitchBoost: -0.22,
          supernovaCharge: 0,
        });
        runAnim({
          dt: 0.04,
          elapsed: 7.2,
          behavior: 'staggered',
          speedRatio: 0,
          localMoveX: 0,
          localMoveZ: 0,
          aimPitch: 0,
          attackProgress: 0,
          attackVariant: 0,
          flinchTimer: 0.18,
          flinchDirX: 1,
          staggerTimer: 3.2,
          deadProgress: 0,
          weakpointExposed: true,
          weakpointBroken: true,
          shieldActive: false,
          phase: 1,
          airborneHeight: 0,
        });
        const wp = e.rig.getWeakpointWorldPos(tmpA);
        vfx.spawnBoosterBurst(wp, tmpFwd.set(0, 0.35, 0.92).normalize(), 0xfde047, 22);
        vfx.spawnPerilGlint(wp, 0xfef08a);
        vfx.update(0.04, host.camera.position);
      } else if (mode === 'death_collapse') {
        e.state.phase = 2;
        e.state.weakpoint.exposed = true;
        e.state.weakpoint.broken = true;
        runAnim(
          {
            dt: 0.04,
            elapsed: 8.4,
            behavior: 'dead',
            speedRatio: 0,
            localMoveX: 0,
            localMoveZ: 0,
            aimPitch: 0,
            attackProgress: 0,
            attackVariant: 0,
            flinchTimer: 0,
            flinchDirX: 0,
            staggerTimer: 0,
            deadProgress: 0.65,
            weakpointExposed: true,
            weakpointBroken: true,
            shieldActive: false,
            phase: 2,
            airborneHeight: Math.max(0, e.spatial.y - 70.0),
          },
          4
        );
        const wp = e.rig.getWeakpointWorldPos(tmpA);
        vfx.spawnBoosterBurst(wp, tmpFwd.set(0, 0.65, 0.75).normalize(), 0xf97316, 28);
        vfx.update(0.04, host.camera.position);
      }

      host.emitHud();
      host.renderer.render(host.scene, host.camera);
      return true;
    },
    showcaseFloor05Pose: (
      enemyId: string,
      mode:
        | 'idle'
        | 'sprint'
        | 'strafe'
        | 'windup'
        | 'attack'
        | 'stagger'
        | 'dead'
        | 'release' = 'idle',
      variant = 0,
      progress = 0.55,
      phase: 1 | 2 = 1
    ) => {
      if (mode === 'release') {
        host.floor05Director.manager.setShowcaseLock(null);
        return true;
      }
      const e = host.floor05Director.manager.getEnemyById(enemyId);
      if (!e) return false;
      host.floor05Director.manager.setShowcaseLock(enemyId);
      const isBrute = e.config.id === 'shield_chariot_brute';
      const isExecutioner = e.config.id === 'dual_cleaver_executioner';
      if (!isBrute && !isExecutioner) e.state.phase = phase;
      let executionerAir = 0;
      if (isExecutioner) {
        const rig = e.rig as DualCleaverExecutionerRigHandle;
        const move = EXECUTIONER_ATTACKS[variant] ?? EXECUTIONER_ATTACKS[0];
        const attacking = mode === 'windup' || mode === 'attack';
        rig.setPoseMode(attacking ? EXECUTIONER_POSES[move] : 'stalk');
        rig.setCleaverHeat(attacking ? 1.35 : phase === 2 ? 0.53 : 0.18);
        if (move === 'berserker_leap_slam' && mode === 'attack') {
          const t = Math.min(1, progress / 0.76);
          executionerAir = 4 * t * (1-t) * 2.8;
        }
      }
      if (isBrute) {
        const rig = e.rig as ShieldChariotBruteRigHandle;
        const attacking = mode === 'windup' || mode === 'attack';
        const move = BRUTE_ATTACKS[variant] ?? BRUTE_ATTACKS[0];
        rig.setPoseMode(attacking ? move : 'march');
        rig.setBoosterFlame(attacking && move === 'chariot_bull_rush' ? (mode === 'attack' ? 1.35 : progress * 0.9) : 0);
      }
      const hopliteRig = e.rig as { setPoseMode?: (m: string) => void; setSpearCharge?: (c: number) => void };
      if (e.config.id === 'plasma_spear_hoplite' && hopliteRig.setPoseMode) {
        hopliteRig.setPoseMode(mode === 'strafe' ? 'strafe' : variant === 6 && mode !== 'idle' && mode !== 'stagger' ? 'brace' : 'march');
        hopliteRig.setSpearCharge?.(mode === 'windup' || mode === 'attack' ? 1.15 : 0.25);
      }
      const stalkerRig = e.rig as {
        setPoseMode?: (m: string) => void;
        setPredatorCharge?: (c: number, enraged?: boolean) => void;
      };
      if (e.config.id === 'leaping_carapace_stalker' && stalkerRig.setPoseMode) {
        const sMode =
          mode === 'idle' || mode === 'sprint' || mode === 'stagger' || mode === 'dead'
            ? 'prowl'
            : mode === 'strafe'
              ? 'strafe'
              : mode === 'windup' && variant === 0
                ? 'crouch'
                : variant === 0
                  ? 'pounce'
                  : variant === 1
                    ? 'slash1'
                    : variant === 2
                      ? 'x_rend'
                      : variant === 3
                        ? 'tail_whip'
                        : variant === 4
                          ? 'spit'
                          : variant === 5
                            ? 'blitz'
                            : 'backflip';
        stalkerRig.setPoseMode(sMode);
        stalkerRig.setPredatorCharge?.(mode === 'windup' || mode === 'attack' ? 1.2 : 0.3, phase === 2);
      }
      const netRig = e.rig as {
        setPoseMode?: (m: string) => void;
        setAimLaser?: (active: boolean, length?: number) => void;
        setChargeLevel?: (level: number) => void;
        setEnragedIntensity?: (intensity: number) => void;
      };
      if (e.config.id === 'arena_net_shooter' && netRig.setPoseMode) {
        const nMode =
          mode === 'idle' || mode === 'stagger' || mode === 'dead'
            ? 'aim_hold'
            : mode === 'sprint'
              ? 'patrol'
              : mode === 'strafe'
                ? 'strafe'
                : variant === 1
                  ? 'snipe_kneel'
                  : variant === 2
                    ? 'mortar_lob'
                    : variant === 3
                      ? 'shock_nova'
                      : variant === 4
                        ? 'trident_cleave'
                        : variant === 5
                          ? 'blink_vault'
                          : variant === 6
                            ? 'tesla_burst'
                            : 'net_volley';
        netRig.setPoseMode(nMode);
        netRig.setAimLaser?.(
          (mode === 'windup' || mode === 'attack') && (variant === 0 || variant === 1 || variant === 6),
          18
        );
        netRig.setChargeLevel?.(mode === 'windup' || mode === 'attack' ? 1.15 : 0.25);
        netRig.setEnragedIntensity?.(phase === 2 ? 1.0 : 0);
      }
      const behavior =
        mode === 'idle'
          ? 'patrol'
          : mode === 'sprint'
            ? 'chase'
            : mode === 'strafe'
              ? 'strafe'
              : mode === 'windup'
                ? 'windup'
                : mode === 'attack'
                  ? 'attack'
                  : mode === 'stagger'
                    ? 'staggered'
                    : 'dead';
      const exposeWp = isExecutioner ? mode === 'stagger' || (mode === 'attack' &&
        ((variant === 2 && progress >= 0.76) || (variant === 4 && progress >= 0.51))) :
        mode === 'windup' || mode === 'stagger' || phase === 2;
      if (!isBrute && !isExecutioner) {
        e.state.weakpoint.exposed = exposeWp;
        e.state.weakpoint.broken = mode === 'stagger';
      }
      const hopliteShieldOn =
        e.config.id === 'plasma_spear_hoplite' &&
        mode !== 'stagger' &&
        mode !== 'dead' &&
        (variant === 4 || variant === 6);
      const hopliteVaultAir =
        e.config.id === 'plasma_spear_hoplite' && mode === 'attack' && variant === 5
          ? progress < 0.72
            ? Math.sin((progress / 0.72) * Math.PI) * 2.15
            : 0
          : 0;
      const stalkerLeapAir =
        e.config.id === 'leaping_carapace_stalker' && mode === 'attack' && (variant === 0 || variant === 6)
          ? Math.sin(progress * Math.PI) * (variant === 0 ? 2.2 : 1.85)
          : 0;
      const netVaultAir =
        e.config.id === 'arena_net_shooter' && mode === 'attack' && variant === 5
          ? Math.sin(progress * Math.PI) * 1.55
          : 0;
      for (let i = 0; i < 24; i++) {
        e.rig.updateAnimation({
          dt: 0.04,
          elapsed: 2.0 + i * 0.04,
          behavior,
          speedRatio: mode === 'sprint' ? 1.15 : mode === 'strafe' ? 0.92 : mode === 'idle' ? 0 : 0.35,
          localMoveX: mode === 'strafe' ? 1 : 0,
          localMoveZ: mode === 'sprint' ? 1.15 : 0,
          aimPitch: 0,
          attackProgress: mode === 'windup' || mode === 'attack' ? progress : 0,
          attackVariant: variant,
          flinchTimer: mode === 'stagger' ? 0.14 : 0,
          flinchDirX: mode === 'stagger' ? 1 : 0,
          staggerTimer: mode === 'stagger' ? 2.4 : 0,
          deadProgress: mode === 'dead' ? 0.85 : 0,
          weakpointExposed: exposeWp,
          weakpointBroken: mode === 'stagger',
          shieldActive:
            (Boolean(e.config.startsWithShield) && mode !== 'stagger' && mode !== 'dead') ||
            hopliteShieldOn,
          phase,
          airborneHeight:
            e.config.id === 'acid_wyvern_construct'
              ? 2.6
              : hopliteVaultAir || stalkerLeapAir || netVaultAir || executionerAir,
        });
      }
      e.rig.root.position.set(e.spatial.x, e.spatial.y, e.spatial.z);
      e.rig.root.rotation.y = e.spatial.yaw;
      e.rig.root.updateMatrixWorld(true);
      host.emitHud();
      host.renderer.render(host.scene, host.camera);
      return true;
    },
    getPlayerHitState: () => ({
      hp: host.hitReaction.hp,
      maxHp: host.hitReaction.maxHp,
      hitsTaken: host.hitReaction.hitsTaken,
      damagePulse: host.hitReaction.damagePulse,
      flinchTimer: host.hitReaction.flinchTimer,
      vignette: { ...host.hitReaction.vignette },
    }),
  };
}
