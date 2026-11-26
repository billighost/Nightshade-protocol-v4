import * as THREE from 'three';
import type { EightFloorHideout } from '../arena/hideout';
import type { WeaponId } from '../core/types';
import type { TacticalAudioEngine } from '../effects/audio';
import { computeMuzzleBasis } from '../effects/ballistics';
import type { CombatVfxPool } from '../effects/vfxPool';
import type { CyberpunkOperativeRig } from '../player';
import type { EnemyHitZone } from '../enemies/core/types';
import type { Floor05EncounterDirector } from '../enemies/floor05';
import type { Floor06EncounterDirector } from '../enemies/floor06';
import type { Floor07EncounterDirector } from '../enemies/floor07';
import type { Floor08EncounterDirector } from '../enemies/floor08';
import type { Floor08TutorialProps } from '../tutorial';
import type { TacticalCameraRig } from './cameraRig';

export interface CombatControllerDeps {
  camera: THREE.PerspectiveCamera;
  cameraRig: TacticalCameraRig;
  hideout: EightFloorHideout;
  playerRig: CyberpunkOperativeRig;
  vfx: CombatVfxPool;
  audio: TacticalAudioEngine;
  floor08Director: Floor08EncounterDirector;
  floor07Director: Floor07EncounterDirector;
  floor06Director: Floor06EncounterDirector;
  floor05Director: Floor05EncounterDirector;
  tutorialProps: Floor08TutorialProps;
  onTutorialRelayShot: () => void;
  showBanner: (text: string, duration?: number) => void;
  emitHud: () => void;
}

/**
 * Modular ballistic hit-resolution, explosive barrel splash, shootable security lock,
 * and score/telemetry manager (designed to plug cleanly into Enemy/Boss hitboxes in Phase 3!).
 */
export class CombatController {
  public hits = 0;
  public criticalHits = 0;
  public shotsFired = 0;
  public streak = 0;
  public bestStreak = 0;
  public score = 0;
  public targetsCleared = 0;
  public hitMarkerTimer = 0;
  public hitMarkerCritical = false;
  public hitMarkerKill = false;
  public hitstopTimer = 0;
  public combatReadyTimer = 0;

  private readonly deps: CombatControllerDeps;
  private readonly raycaster = new THREE.Raycaster();
  private readonly aimNdc = new THREE.Vector2(0, 0);
  private readonly tmpVecA = new THREE.Vector3();
  private readonly tmpVecB = new THREE.Vector3();
  private readonly tmpVecC = new THREE.Vector3();
  private readonly tmpMuzzleFwd = new THREE.Vector3();
  private readonly tmpMuzzleRight = new THREE.Vector3();
  private readonly tmpMuzzleUp = new THREE.Vector3();
  private readonly tmpMuzzleQuat = new THREE.Quaternion();
  private readonly tmpNormal = new THREE.Vector3();

  constructor(deps: CombatControllerDeps) {
    this.deps = deps;
  }

  public stepTimers(dt: number): void {
    if (this.hitMarkerTimer > 0) this.hitMarkerTimer = Math.max(0, this.hitMarkerTimer - dt);
    if (this.combatReadyTimer > 0) this.combatReadyTimer = Math.max(0, this.combatReadyTimer - dt);
  }

  public consumeHitstop(dt: number): boolean {
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      return true;
    }
    return false;
  }

  public reset(): void {
    this.combatReadyTimer = 0;
    this.hits = 0;
    this.criticalHits = 0;
    this.shotsFired = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.score = 0;
    this.targetsCleared = 0;
    this.hitMarkerTimer = 0;
    this.hitMarkerCritical = false;
    this.hitMarkerKill = false;
    this.hitstopTimer = 0;
  }

  public handleWeaponFired(
    weapon: WeaponId,
    damage: number,
    overcharged: boolean,
    spreadRad: number,
    recoilPitch: number,
    recoilYaw: number,
    heatRatio: number
  ): void {
    const { camera, cameraRig, hideout, playerRig, vfx, audio, showBanner } = this.deps;

    this.shotsFired += 1;
    this.combatReadyTimer = 1.6;
    cameraRig.applyShotImpulse(weapon, overcharged, recoilPitch, recoilYaw);

    if (weapon === 'pistol') {
      audio.playPistolShot(overcharged);
    } else if (weapon === 'smg') {
      audio.playSmgShot(heatRatio, overcharged);
    } else {
      audio.playHeavyShot();
    }

    playerRig.root.updateMatrixWorld(true);
    const muzzlePos = playerRig.getActiveMuzzleWorldPosition(weapon, this.tmpVecA);
    const ejectPos = playerRig.getActiveEjectionWorldPosition(weapon, this.tmpVecB);
    playerRig.getActiveMuzzleWorldQuaternion(weapon, this.tmpMuzzleQuat);
    computeMuzzleBasis(
      this.tmpMuzzleQuat,
      this.tmpMuzzleFwd,
      this.tmpMuzzleRight,
      this.tmpMuzzleUp
    );

    const isCyanTracer = overcharged;
    const flashMode =
      weapon === 'heavy' ? 'heavy_brake' : weapon === 'smg' ? 'compensator' : 'suppressed';
    const flashIntensity = weapon === 'heavy' ? 15.0 : weapon === 'smg' ? 7.8 : 4.8;
    vfx.triggerMuzzleFlash(
      muzzlePos,
      isCyanTracer,
      flashIntensity,
      flashMode,
      this.tmpMuzzleFwd,
      this.tmpMuzzleRight,
      this.tmpMuzzleUp
    );

    vfx.spawnCasing(ejectPos, this.tmpMuzzleRight, weapon === 'heavy' ? 1.68 : 1.0);

    this.aimNdc.set(
      (Math.random() - 0.5) * spreadRad * 1.5,
      (Math.random() - 0.5) * spreadRad * 1.5
    );
    this.raycaster.setFromCamera(this.aimNdc, camera);
    this.raycaster.far = 55;

    const {
      floor08Director,
      floor07Director,
      floor06Director,
      floor05Director,
      tutorialProps,
      onTutorialRelayShot,
    } = this.deps;
    const activeFloorNum = hideout.getCurrentFloorMeta().number;
    const activeEnemyManager =
      activeFloorNum === 5 && floor05Director.progression.liveCombatActive
        ? floor05Director.manager
        : activeFloorNum === 6 && floor06Director.progression.liveCombatActive
          ? floor06Director.manager
          : activeFloorNum === 7 && floor07Director.progression.liveCombatActive
            ? floor07Director.manager
            : activeFloorNum === 8 && floor08Director.progression.liveCombatActive
              ? floor08Director.manager
              : null;

    const enemyHitboxes = activeEnemyManager ? activeEnemyManager.activeHitboxes : [];
    const enemyHits =
      enemyHitboxes.length > 0 ? this.raycaster.intersectObjects(enemyHitboxes, false) : [];
    const relayHits =
      tutorialProps.group.visible && !tutorialProps.relayDestroyed
        ? this.raycaster.intersectObject(tutorialProps.relayHitbox, false)
        : [];
    const dummyHits = tutorialProps.group.visible
      ? this.raycaster.intersectObject(tutorialProps.dummyHitbox, false)
      : [];
    const targetHits = this.raycaster.intersectObjects(hideout.activeTargetHitboxes, false);
    const lockHits = this.raycaster.intersectObjects(hideout.activeLockHitboxes, false);
    const barrelHits = this.raycaster.intersectObjects(hideout.activeBarrelHitboxes, false);
    const wallHits = this.raycaster.intersectObjects(hideout.activeWallMeshes, false);

    // Prefer weakpoint/head hit when ray grazes overlapping enemy hitboxes at near-equal distance!
    const validEnemyHits = enemyHits.filter((h) => {
      if (!activeEnemyManager) return false;
      const eid = h.object.userData.enemyId as string | undefined;
      if (!eid) return false;
      const e = activeEnemyManager.getEnemyById(eid);
      if (!e || !e.state.alive) return false;
      const zone = h.object.userData.hitZone as EnemyHitZone | undefined;
      if (zone === 'shield' && !e.state.shieldActive) return false;
      return true;
    });
    let firstEnemy = validEnemyHits[0];
    if (firstEnemy) {
      for (let i = 1; i < validEnemyHits.length; i++) {
        const cand = validEnemyHits[i];
        if (cand.distance > firstEnemy.distance + 0.35) break;
        const candZone = cand.object.userData.hitZone as EnemyHitZone;
        const curZone = firstEnemy.object.userData.hitZone as EnemyHitZone;
        if (
          cand.object.userData.enemyId === firstEnemy.object.userData.enemyId &&
          candZone === 'weakpoint' &&
          curZone !== 'weakpoint'
        ) {
          firstEnemy = cand;
          break;
        }
      }
    }

    const firstRelay = relayHits[0];
    const firstDummy = dummyHits[0];
    const firstTarget = targetHits.find((h) => {
      const tid = h.object.userData.targetId as string | undefined;
      const t = hideout.activeTargets.find((item) => item.id === tid);
      return t && t.downTimer === 0;
    });
    const firstLock = lockHits.find((h) => {
      const lid = h.object.userData.worldLockId as string | undefined;
      const lk = hideout.activeShootableLocks.find((item) => item.id === lid);
      return lk && !lk.destroyed;
    });
    const firstBarrel = barrelHits.find((h) => {
      const bid = h.object.userData.explosiveBarrelId as string | undefined;
      const br = hideout.activeExplosiveBarrels.find((item) => item.id === bid);
      return br && !br.detonated;
    });
    const firstWall = wallHits[0];

    const impactPower = weapon === 'heavy' ? 1.85 : 1.0;

    let hitPoint: THREE.Vector3;
    const enemyDist = firstEnemy ? firstEnemy.distance : Infinity;
    const relayDist = firstRelay ? firstRelay.distance : Infinity;
    const dummyDist = firstDummy ? firstDummy.distance : Infinity;
    const lockDist = firstLock ? firstLock.distance : Infinity;
    const barrelDist = firstBarrel ? firstBarrel.distance : Infinity;
    const targetDist = firstTarget ? firstTarget.distance : Infinity;
    const wallDist = firstWall ? firstWall.distance : Infinity;

    if (
      firstEnemy &&
      enemyDist <= wallDist &&
      enemyDist <= barrelDist &&
      enemyDist <= lockDist &&
      enemyDist <= targetDist
    ) {
      hitPoint = firstEnemy.point;
      this.tmpNormal.copy(firstEnemy.face?.normal ?? new THREE.Vector3(0, 0, 1));
      this.tmpNormal.transformDirection(firstEnemy.object.matrixWorld).normalize();
      const enemyId = firstEnemy.object.userData.enemyId as string;
      const hitZone = (firstEnemy.object.userData.hitZone as EnemyHitZone) ?? 'body';
      const hitRes = activeEnemyManager
        ? activeEnemyManager.applyHit(
            enemyId,
            damage,
            hitZone,
            hitPoint,
            Math.random() < 0.5 ? -1 : 1
          )
        : null;
      if (hitRes) {
        this.hits += 1;
        this.score += hitRes.scoreDelta;
        if (hitRes.blockedByShield) {
          this.hitMarkerTimer = 0.1;
          this.hitMarkerCritical = false;
          vfx.spawnMetalImpact(hitPoint, this.tmpNormal, false, true, 0.9);
          audio.playImpact('metal');
        } else {
          this.streak += 1;
          if (this.streak > this.bestStreak) this.bestStreak = this.streak;
          if (hitRes.isCritical) this.criticalHits += 1;
          this.hitMarkerTimer = hitRes.killed ? 0.34 : hitRes.weakpointBroken ? 0.28 : 0.18;
          this.hitMarkerCritical = hitRes.isCritical || hitRes.weakpointBroken;
          this.hitMarkerKill = hitRes.killed;
          if (hitRes.weakpointBroken || hitRes.killed) {
            this.hitstopTimer = hitRes.weakpointBroken ? 0.042 : 0.032;
            cameraRig.addTrauma(hitRes.weakpointBroken ? 0.36 : 0.22);
          }
          if (hitRes.killed) {
            this.targetsCleared += 1;
          }
          vfx.spawnMetalImpact(
            hitPoint,
            this.tmpNormal,
            hitRes.isCritical || hitRes.weakpointBroken,
            hitRes.hitWeakpoint,
            hitRes.weakpointBroken ? 2.1 : impactPower
          );
          if (hitRes.weakpointBroken) {
            audio.playWeakpointBreak();
          } else {
            audio.playImpact(hitRes.isCritical ? 'critical' : 'metal');
          }
        }
      }
    } else if (firstRelay && relayDist <= wallDist && relayDist <= dummyDist && relayDist <= targetDist) {
      hitPoint = firstRelay.point;
      this.tmpNormal.set(0, 0, 1);
      const relayPos = tutorialProps.destroyRelay();
      this.hits += 1;
      this.criticalHits += 1;
      this.score += 200;
      this.hitMarkerTimer = 0.26;
      this.hitMarkerCritical = true;
      cameraRig.addTrauma(0.28);
      vfx.spawnMetalImpact(relayPos, this.tmpNormal, true, true, 2.0);
      audio.playLockShatter();
      onTutorialRelayShot();
    } else if (firstDummy && dummyDist <= wallDist && dummyDist <= targetDist) {
      hitPoint = firstDummy.point;
      this.tmpNormal.set(0, 0, 1);
      tutorialProps.triggerDummyHit();
      const isHead = hitPoint.y >= 99.55;
      this.hits += 1;
      if (isHead) this.criticalHits += 1;
      this.streak += 1;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;
      this.score += isHead ? 100 : 50;
      this.hitMarkerTimer = 0.18;
      this.hitMarkerCritical = isHead;
      vfx.spawnMetalImpact(hitPoint, this.tmpNormal, isHead, isHead, impactPower);
      audio.playImpact(isHead ? 'critical' : 'metal');
    } else if (firstLock && lockDist <= wallDist && lockDist <= targetDist && lockDist <= barrelDist) {
      hitPoint = firstLock.point;
      this.tmpNormal.copy(firstLock.face?.normal ?? new THREE.Vector3(0, 0, 1));
      this.tmpNormal.transformDirection(firstLock.object.matrixWorld).normalize();
      const lockId = firstLock.object.userData.worldLockId as string;
      const lockRes = hideout.triggerShootableLock(lockId);
      if (lockRes) {
        this.hits += 1;
        this.streak += 1;
        if (this.streak > this.bestStreak) this.bestStreak = this.streak;
        this.score += 150;
        this.hitMarkerTimer = 0.22;
        this.hitMarkerCritical = true;
        cameraRig.addTrauma(0.24);
        vfx.spawnMetalImpact(hitPoint, this.tmpNormal, true, true, 1.8);
        audio.playLockShatter();
        if (lockRes.deployedBridge) audio.playBridgeDeploy();
        if (lockRes.unlockedGate) audio.playTacticalDoorSlide(true);
        showBanner(lockRes.bannerText, 3.4);
      }
    } else if (firstBarrel && barrelDist <= wallDist && barrelDist <= targetDist) {
      hitPoint = firstBarrel.point;
      const barrelId = firstBarrel.object.userData.explosiveBarrelId as string;
      this.detonateExplosiveBarrel(barrelId);
    } else if (firstTarget && targetDist <= wallDist) {
      hitPoint = firstTarget.point;
      this.tmpNormal.copy(firstTarget.face?.normal ?? new THREE.Vector3(0, 0, 1));
      this.tmpNormal.transformDirection(firstTarget.object.matrixWorld).normalize();
      this.resolveTargetImpact(
        firstTarget.object.userData.targetId as string,
        damage,
        hitPoint,
        this.tmpNormal,
        impactPower
      );
    } else if (firstWall) {
      hitPoint = firstWall.point;
      this.tmpNormal.copy(firstWall.face?.normal ?? new THREE.Vector3(0, 1, 0));
      this.tmpNormal.transformDirection(firstWall.object.matrixWorld).normalize();
      vfx.spawnConcreteImpact(hitPoint, this.tmpNormal, impactPower);
      audio.playImpact('concrete');
      this.streak = 0;
    } else {
      hitPoint = this.tmpVecC
        .copy(this.raycaster.ray.origin)
        .addScaledVector(this.raycaster.ray.direction, 40);
      this.streak = 0;
    }

    const tracerStyle = isCyanTracer ? 'cyan' : weapon === 'heavy' ? 'heavy' : 'standard';
    vfx.spawnTracer(muzzlePos, hitPoint, tracerStyle);
  }

  public detonateExplosiveBarrel(barrelId: string): number {
    const { hideout, cameraRig, audio, vfx, emitHud } = this.deps;
    const detonated = hideout.triggerExplosiveBarrel(barrelId);
    if (detonated.length === 0) return 0;

    this.hits += 1;
    this.criticalHits += detonated.length;
    this.streak += detonated.length;
    if (this.streak > this.bestStreak) this.bestStreak = this.streak;
    this.score += 175 * detonated.length;
    this.hitMarkerTimer = 0.22;
    this.hitMarkerCritical = true;
    cameraRig.addTrauma(0.55);
    this.hitstopTimer = 0.036;
    audio.playBarrelExplosion();

    for (let i = 0; i < detonated.length; i++) {
      const b = detonated[i];
      this.tmpVecC.set(b.x, b.y + 0.7, b.z);
      vfx.spawnExplosionImpact(this.tmpVecC, false);

      // Splash explosive barrel blasts cleanly onto nearby Floor 08 / Floor 07 / Floor 06 enemies!
      const floorNum = hideout.getCurrentFloorMeta().number;
      if (floorNum === 8 && this.deps.floor08Director.progression.liveCombatActive) {
        this.deps.floor08Director.manager.applyExplosiveSplash(
          b.x,
          b.y,
          b.z,
          b.blastRadius + 1.2,
          145
        );
      } else if (floorNum === 7 && this.deps.floor07Director.progression.liveCombatActive) {
        this.deps.floor07Director.manager.applyExplosiveSplash(
          b.x,
          b.y,
          b.z,
          b.blastRadius + 1.2,
          145
        );
      } else if (floorNum === 6 && this.deps.floor06Director.progression.liveCombatActive) {
        this.deps.floor06Director.manager.applyExplosiveSplash(
          b.x,
          b.y,
          b.z,
          b.blastRadius + 1.2,
          155
        );
      } else if (floorNum === 5 && this.deps.floor05Director.progression.liveCombatActive) {
        this.deps.floor05Director.manager.applyExplosiveSplash(
          b.x,
          b.y,
          b.z,
          b.blastRadius + 1.2,
          165
        );
      }

      const rSq = b.blastRadius * b.blastRadius;
      for (let tIdx = 0; tIdx < hideout.activeTargets.length; tIdx++) {
        const tgt = hideout.activeTargets[tIdx];
        if (tgt.downTimer > 0) continue;
        const pos = tgt.root.position;
        const dx = pos.x - b.x;
        const dy = pos.y - b.y;
        const dz = pos.z - b.z;
        if (dx * dx + dy * dy + dz * dz <= rSq) {
          tgt.hp = 0;
          tgt.flashTimer = 0.09;
          if (tgt.kind === 'steel_plate') {
            if (tgt.hingeGroup) tgt.hingeGroup.rotation.x = -0.62;
            this.score += 50;
          } else {
            tgt.downTimer = tgt.kind === 'canister' ? 7.0 : tgt.kind === 'hover_drone' ? 4.5 : 3.2;
            this.targetsCleared += 1;
            this.score += 125;
            const linkedId = tgt.hitboxMesh.userData.linkedTargetId as string | undefined;
            if (linkedId) {
              const linked = hideout.activeTargets.find((item) => item.id === linkedId);
              if (linked) linked.downTimer = tgt.downTimer;
            }
          }
        }
      }
    }

    emitHud();
    return detonated.length;
  }

  private resolveTargetImpact(
    targetId: string,
    damage: number,
    hitPoint: THREE.Vector3,
    hitNormal: THREE.Vector3,
    impactPower = 1
  ): void {
    const { hideout, cameraRig, vfx, audio } = this.deps;
    const target = hideout.activeTargets.find((t) => t.id === targetId);
    if (!target || target.downTimer > 0) return;

    this.hits += 1;
    this.streak += 1;
    if (this.streak > this.bestStreak) this.bestStreak = this.streak;

    const isCrit = target.kind === 'dummy_head' || target.kind === 'canister';
    const finalDamage = isCrit ? damage * 2 : damage;
    target.hp -= finalDamage;
    target.flashTimer = 0.07;

    this.hitMarkerTimer = 0.16;
    this.hitMarkerCritical = isCrit;

    if (target.kind === 'steel_plate') {
      this.score += 50;
      if (target.hingeGroup) target.hingeGroup.rotation.x = impactPower > 1.5 ? -0.58 : -0.35;
      vfx.spawnMetalImpact(hitPoint, hitNormal, false, false, impactPower);
      audio.playImpact('metal');
      return;
    }

    if (target.kind === 'canister' && target.hp <= 0) {
      target.downTimer = 7.0;
      this.criticalHits += 1;
      this.targetsCleared += 1;
      this.score += 250;
      cameraRig.addTrauma(0.65);
      this.hitstopTimer = 0.04;
      vfx.spawnExplosionImpact(hitPoint, false);
      audio.playImpact('explosion');
      return;
    }

    if (target.kind === 'hover_drone') {
      if (target.hp <= 0) {
        target.downTimer = 4.5;
        this.targetsCleared += 1;
        this.score += 200;
        cameraRig.addTrauma(0.42);
        this.hitstopTimer = 0.035;
        vfx.spawnExplosionImpact(hitPoint, true);
        audio.playImpact('explosion');
      } else {
        this.score += 35;
        vfx.spawnMetalImpact(hitPoint, hitNormal, false, true, impactPower);
        audio.playImpact('metal');
      }
      return;
    }

    if (isCrit) {
      this.criticalHits += 1;
      this.score += 150;
      audio.playImpact('critical');
    } else {
      this.score += 65;
      audio.playImpact('metal');
    }
    vfx.spawnMetalImpact(hitPoint, hitNormal, isCrit, isCrit, impactPower);

    if (target.hp <= 0) {
      target.downTimer = 3.2;
      this.targetsCleared += 1;
      this.hitstopTimer = isCrit ? 0.038 : impactPower > 1.5 ? 0.03 : 0.024;
      const linkedId = target.hitboxMesh.userData.linkedTargetId as string | undefined;
      if (linkedId) {
        const linked = hideout.activeTargets.find((t) => t.id === linkedId);
        if (linked) linked.downTimer = 3.2;
      }
    } else if (target.hingeGroup) {
      target.hingeGroup.rotation.x = impactPower > 1.5 ? -0.38 : -0.22;
    }
  }
}
