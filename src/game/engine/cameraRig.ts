import * as THREE from 'three';
import type { OperativeLocomotionState as LocomotionState, ShoulderSide, WeaponId } from '../core/types';
import { computeRecoilCameraImpulse } from '../effects/ballistics';
import type { InspectCameraOverride } from './types';

/**
 * Modular third-person Over-the-Shoulder (OTS) camera rig with:
 * - Smooth ADS zoom & shoulder swap
 * - Wall pull-in occlusion raycast against active floor walls
 * - CoD-grade recoil FOV kick, Z-punch, roll kick, thermal shudder & trauma shake
 */
export class TacticalCameraRig {
  public yaw = 0;
  public pitch = -0.04;
  public shoulder: ShoulderSide = 'right';
  public shoulderLerp = 1;
  public adsBlend = 0;

  public recoilKick = 0;
  public recoilPitchOffset = 0;
  public recoilYawOffset = 0;
  public recoilFovKick = 0;
  public recoilRollOffset = 0;
  public recoilRollSign = 1;
  public recoilZPunch = 0;

  public shotPulse = 0;
  public heavyPulse = 0;
  public heatPulse = 0;
  public frostPulse = 0;
  public trauma = 0;

  private readonly raycaster = new THREE.Raycaster();
  private readonly camAnchor = new THREE.Vector3();
  private readonly camDesired = new THREE.Vector3();
  private readonly camCurrent = new THREE.Vector3(0.45, 99.14, 7.55);
  private readonly camLookCurrent = new THREE.Vector3(0.62, 98.96, 10.5);
  private readonly camLookDesired = new THREE.Vector3();
  private readonly tmpVec = new THREE.Vector3();

  public snapToTitleStart(x: number, y: number, z: number, yaw: number): void {
    this.yaw = yaw;
    this.pitch = -0.04;
    this.camCurrent.set(x + 0.45, y + 1.14, z - 2.95);
    this.camLookCurrent.set(x + 0.62, y + 0.96, z);
  }

  public snapToGameStart(x: number, y: number, z: number): void {
    this.camCurrent.set(x + 0.52, y + 1.66, z + 2.42);
    this.camLookCurrent.set(x + 0.22, y + 1.42, z - 18);
  }

  public snapToFloorSpawn(x: number, y: number, z: number, yaw: number): void {
    this.yaw = yaw;
    this.pitch = -0.04;
    const sinY = Math.sin(yaw);
    const cosY = Math.cos(yaw);
    this.camCurrent.set(x + sinY * 2.45 + cosY * 0.52, y + 1.66, z + cosY * 2.45 - sinY * 0.52);
    this.camLookCurrent.set(x - sinY * 18, y + 1.42, z - cosY * 18);
  }

  public applyLookDelta(dYaw: number, dPitch: number): void {
    this.yaw += dYaw;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dPitch, -0.55, 0.5);
  }

  public addTrauma(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  public applyDamageImpulse(trauma: number, rollKickRad: number): void {
    this.trauma = Math.min(1, this.trauma + trauma);
    this.recoilRollOffset = THREE.MathUtils.clamp(
      this.recoilRollOffset + rollKickRad,
      -0.068,
      0.068
    );
    this.recoilZPunch = Math.min(0.16, this.recoilZPunch + 0.065);
    this.recoilFovKick = Math.min(5.2, this.recoilFovKick + 1.85);
  }

  public toggleShoulder(): void {
    this.shoulder = this.shoulder === 'right' ? 'left' : 'right';
  }

  public applyShotImpulse(
    weapon: WeaponId,
    overcharged: boolean,
    recoilPitch: number,
    recoilYaw: number
  ): void {
    this.recoilRollSign = -this.recoilRollSign;
    const impulse = computeRecoilCameraImpulse(weapon, overcharged, this.recoilRollSign);
    this.recoilKick = Math.min(1, this.recoilKick + impulse.recoilKick);
    this.trauma = Math.min(1, this.trauma + impulse.trauma);
    this.recoilFovKick = Math.min(4.8, this.recoilFovKick + impulse.fovKickDeg);
    this.recoilZPunch = Math.min(0.14, this.recoilZPunch + impulse.zPunchMeters);
    this.shotPulse = Math.max(this.shotPulse, impulse.opticalShotPulse);
    if (weapon === 'heavy') {
      this.heavyPulse = 1.0;
    }
    this.recoilRollOffset = THREE.MathUtils.clamp(
      this.recoilRollOffset + impulse.rollRad,
      -0.042,
      0.042
    );
    this.recoilPitchOffset = Math.min(0.14, this.recoilPitchOffset + recoilPitch * 0.8);
    this.recoilYawOffset = THREE.MathUtils.clamp(
      this.recoilYawOffset + recoilYaw * 0.8,
      -0.065,
      0.065
    );
  }

  public stepDecay(
    dt: number,
    activeWeapon: WeaponId,
    smgHeat: number,
    smgOverheated: boolean
  ): void {
    if (this.trauma > 0) this.trauma = Math.max(0, this.trauma - dt * 2.4);
    if (this.recoilKick > 0) this.recoilKick = Math.max(0, this.recoilKick - dt * 7.5);
    const recoilRecover = 1 - Math.exp(-10.5 * dt);
    this.recoilPitchOffset += (0 - this.recoilPitchOffset) * recoilRecover;
    this.recoilYawOffset += (0 - this.recoilYawOffset) * recoilRecover;
    this.recoilFovKick += (0 - this.recoilFovKick) * (1 - Math.exp(-15 * dt));
    this.recoilRollOffset += (0 - this.recoilRollOffset) * (1 - Math.exp(-13 * dt));
    this.recoilZPunch += (0 - this.recoilZPunch) * (1 - Math.exp(-14 * dt));
    this.shotPulse = Math.max(0, this.shotPulse - dt * 8.5);
    this.heavyPulse = Math.max(0, this.heavyPulse - dt * 5.2);
    this.frostPulse = Math.max(0, this.frostPulse - dt * 2.2);

    const smgHotTarget =
      activeWeapon === 'smg'
        ? smgOverheated
          ? 0.92
          : Math.max(0, (smgHeat - 68) / 32) * 0.62
        : 0;
    this.heatPulse += (smgHotTarget - this.heatPulse) * (1 - Math.exp(-6.5 * dt));
  }

  public updateTitleCamera(
    camera: THREE.PerspectiveCamera,
    dt: number,
    elapsed: number,
    locoY: number,
    locoZ: number,
    override: InspectCameraOverride | null
  ): void {
    if (override) {
      camera.position.set(override.pos[0], override.pos[1], override.pos[2]);
      if (override.fov && Math.abs(camera.fov - override.fov) > 0.1) {
        camera.fov = override.fov;
        camera.updateProjectionMatrix();
      }
      camera.lookAt(override.lookAt[0], override.lookAt[1], override.lookAt[2]);
      return;
    }

    const sway = Math.sin(elapsed * 0.4) * 0.12;
    this.camDesired.set(0.42 + sway, locoY + 1.14, locoZ - 2.95);
    this.camLookDesired.set(0.62, locoY + 0.96, locoZ);

    const k = 1 - Math.exp(-5 * dt);
    this.camCurrent.lerp(this.camDesired, k);
    this.camLookCurrent.lerp(this.camLookDesired, k);
    camera.position.copy(this.camCurrent);
    camera.lookAt(this.camLookCurrent);
    if (Math.abs(camera.fov - 42) > 0.1) {
      camera.fov += (42 - camera.fov) * k;
      camera.updateProjectionMatrix();
    }
  }

  public updateGameplayCamera(
    camera: THREE.PerspectiveCamera,
    dt: number,
    elapsed: number,
    locomotion: LocomotionState,
    adsHeld: boolean,
    activeWallMeshes: THREE.Object3D[],
    override: InspectCameraOverride | null
  ): void {
    if (override) {
      camera.position.set(override.pos[0], override.pos[1], override.pos[2]);
      if (override.fov && Math.abs(camera.fov - override.fov) > 0.1) {
        camera.fov = override.fov;
        camera.updateProjectionMatrix();
      }
      camera.lookAt(override.lookAt[0], override.lookAt[1], override.lookAt[2]);
      return;
    }

    const damp = 1 - Math.exp(-14 * dt);
    const targetShoulder = this.shoulder === 'right' ? 1 : -1;
    this.shoulderLerp += (targetShoulder - this.shoulderLerp) * (1 - Math.exp(-11 * dt));

    const targetAds = adsHeld ? 1 : 0;
    this.adsBlend += (targetAds - this.adsBlend) * (1 - Math.exp(-15 * dt));

    const targetFov =
      THREE.MathUtils.lerp(locomotion.sprinting ? 58 : 52, 38, this.adsBlend) +
      this.recoilFovKick;
    if (Math.abs(camera.fov - targetFov) > 0.04) {
      camera.fov += (targetFov - camera.fov) * damp;
      camera.updateProjectionMatrix();
    }

    const eyeHeight = locomotion.crouching ? 1.12 : 1.5;
    this.camAnchor.set(locomotion.x, locomotion.y + eyeHeight, locomotion.z);

    const effectiveYaw = this.yaw + this.recoilYawOffset;
    const effectivePitch = THREE.MathUtils.clamp(
      this.pitch + this.recoilPitchOffset,
      -0.55,
      0.5
    );
    const sinY = Math.sin(effectiveYaw);
    const cosY = Math.cos(effectiveYaw);
    const sinP = Math.sin(effectivePitch);
    const cosP = Math.cos(effectivePitch);

    const forwardX = -sinY * cosP;
    const forwardY = sinP;
    const forwardZ = -cosY * cosP;
    const rightX = cosY;
    const rightZ = -sinY;

    const backDist = THREE.MathUtils.lerp(2.42, 1.48, this.adsBlend) + this.recoilZPunch;
    const sideOffset = THREE.MathUtils.lerp(0.54, 0.5, this.adsBlend) * this.shoulderLerp;
    const upOffset = THREE.MathUtils.lerp(0.18, 0.12, this.adsBlend);

    this.camDesired.set(
      this.camAnchor.x - forwardX * backDist + rightX * sideOffset,
      Math.max(locomotion.y + 0.36, this.camAnchor.y - forwardY * backDist + upOffset),
      this.camAnchor.z - forwardZ * backDist + rightZ * sideOffset
    );

    this.tmpVec.subVectors(this.camDesired, this.camAnchor);
    const desiredLen = this.tmpVec.length();
    if (desiredLen > 0.05) {
      this.tmpVec.divideScalar(desiredLen);
      this.raycaster.set(this.camAnchor, this.tmpVec);
      this.raycaster.far = desiredLen;
      const wallHits = this.raycaster.intersectObjects(activeWallMeshes, false);
      if (wallHits.length > 0 && wallHits[0].distance < desiredLen) {
        const safeDist = Math.max(0.62, wallHits[0].distance - 0.22);
        this.camDesired.copy(this.camAnchor).addScaledVector(this.tmpVec, safeDist);
      }
    }

    this.camCurrent.lerp(this.camDesired, 1 - Math.exp(-18 * dt));

    this.camLookDesired.set(
      this.camAnchor.x + forwardX * 24 + rightX * sideOffset * 0.42,
      this.camAnchor.y + forwardY * 24,
      this.camAnchor.z + forwardZ * 24 + rightZ * sideOffset * 0.42
    );
    this.camLookCurrent.lerp(this.camLookDesired, 1 - Math.exp(-22 * dt));

    const shakeAmt = this.trauma * this.trauma * 0.095;
    const heatShudder = this.heatPulse * 0.0085;
    const shakeX =
      (Math.sin(elapsed * 67) * 0.6 + Math.cos(elapsed * 93) * 0.4) * shakeAmt +
      Math.sin(elapsed * 138) * heatShudder;
    const shakeY =
      (Math.cos(elapsed * 79) * 0.6 + Math.sin(elapsed * 111) * 0.4) * shakeAmt +
      Math.cos(elapsed * 154) * heatShudder;

    camera.position.set(
      this.camCurrent.x + shakeX,
      this.camCurrent.y + shakeY,
      this.camCurrent.z
    );
    camera.lookAt(this.camLookCurrent);
    const heatRoll = Math.sin(elapsed * 52) * this.heatPulse * 0.0045;
    if (Math.abs(this.recoilRollOffset + heatRoll) > 0.0002) {
      camera.rotateZ(this.recoilRollOffset + heatRoll);
    }
  }
}
