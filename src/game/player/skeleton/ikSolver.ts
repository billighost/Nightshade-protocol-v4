import * as THREE from 'three';

const _dir = new THREE.Vector3();
const _poleDir = new THREE.Vector3();
const _orthoPole = new THREE.Vector3();
const _sideAxis = new THREE.Vector3();
const _upperDir = new THREE.Vector3();
const _bendAxis = new THREE.Vector3();
const _yNeg = new THREE.Vector3(0, -1, 0);
const _mat = new THREE.Matrix4();
const _qUpper = new THREE.Quaternion();
const _qElbow = new THREE.Quaternion();
const _parentInvQuat = new THREE.Quaternion();
const _shoulderLocalTarget = new THREE.Vector3();
const _shoulderLocalPole = new THREE.Vector3();

/**
 * Analytical 2-Bone Arm Inverse Kinematics Solver (Law of Cosines + Pole Vector).
 * Solves exact `armBone.quaternion` and `foreArmBone.quaternion` in parent (`Shoulder`) space
 * so the wrist lands with millimeter precision on `targetInSpine2` (pistol grip, SMG foregrip,
 * thigh holster, back SMG sling, or magazine pouch) while the elbow points naturally along `poleInSpine2`!
 *
 * Works with our Mixamo bind-pose convention where arm segments extend along local -Y,
 * and positive local +X rotation bends the elbow forward/upward naturally.
 */
export function solveTwoBoneArmIK(
  shoulderBone: THREE.Bone,
  armBone: THREE.Bone,
  foreArmBone: THREE.Bone,
  upperLen: number,
  lowerLen: number,
  targetInSpine2: THREE.Vector3,
  poleInSpine2: THREE.Vector3,
  blendWeight: number
): void {
  if (blendWeight <= 0.001) return;

  // Convert target & pole from Spine2 local space into Shoulder local space
  _parentInvQuat.copy(shoulderBone.quaternion).invert();
  _shoulderLocalTarget
    .copy(targetInSpine2)
    .sub(shoulderBone.position)
    .applyQuaternion(_parentInvQuat)
    .sub(armBone.position);

  _shoulderLocalPole
    .copy(poleInSpine2)
    .sub(shoulderBone.position)
    .applyQuaternion(_parentInvQuat)
    .sub(armBone.position);

  const rawDist = _shoulderLocalTarget.length();
  const minDist = Math.abs(upperLen - lowerLen) + 0.02;
  const maxDist = upperLen + lowerLen - 0.008;
  const dist = THREE.MathUtils.clamp(rawDist, minDist, maxDist);

  if (rawDist < 1e-4) return;
  _dir.copy(_shoulderLocalTarget).divideScalar(rawDist);

  // Law of Cosines for shoulder elevation angle & elbow interior bend angle
  const cosShoulder = THREE.MathUtils.clamp(
    (upperLen * upperLen + dist * dist - lowerLen * lowerLen) / (2 * upperLen * dist),
    -1,
    1
  );
  const shoulderAngle = Math.acos(cosShoulder);

  const cosElbow = THREE.MathUtils.clamp(
    (upperLen * upperLen + lowerLen * lowerLen - dist * dist) / (2 * upperLen * lowerLen),
    -1,
    1
  );
  // Exterior bend angle (0 = straight arm, >0 = bent forearm)
  const elbowBend = Math.PI - Math.acos(cosElbow);

  // Compute orthogonal pole direction (direction elbow should point!)
  _poleDir.copy(_shoulderLocalPole);
  const proj = _poleDir.dot(_dir);
  _orthoPole.copy(_poleDir).addScaledVector(_dir, -proj);
  if (_orthoPole.lengthSq() < 1e-5) {
    _orthoPole.set(0, -1, 0);
  } else {
    _orthoPole.normalize();
  }

  // Upper arm points along _dir rotated toward _orthoPole by shoulderAngle
  _upperDir
    .copy(_dir)
    .multiplyScalar(Math.cos(shoulderAngle))
    .addScaledVector(_orthoPole, Math.sin(shoulderAngle))
    .normalize();

  // Construct orthonormal basis for Upper Arm bone:
  //   local -Y = _upperDir  (so local +Y = -_upperDir)
  //   local +Z = elbow-outward plane normal toward _orthoPole
  //   local +X = bend hinge axis so rotating ForeArm by +elbowBend around +X bends forearm toward target!
  // Let's verify: rotating (0, -1, 0) around +X by +theta moves it to (0, -cos(theta), -sin(theta)) -> toward -Z!
  // So local -Z MUST point toward the forearm/target (opposite to _orthoPole)!
  const zAxis = _poleDir.copy(_orthoPole).sub(
    _bendAxis.copy(_upperDir).multiplyScalar(_orthoPole.dot(_upperDir))
  );
  if (zAxis.lengthSq() < 1e-5) {
    zAxis.set(0, 0, 1);
  } else {
    zAxis.normalize();
  }
  const yAxis = _yNeg.copy(_upperDir).negate(); // local +Y points from elbow back toward shoulder
  _sideAxis.crossVectors(yAxis, zAxis).normalize(); // local +X = y × z (right-handed!)
  // Re-orthogonalize Z = X × Y
  zAxis.crossVectors(_sideAxis, yAxis).normalize();

  _mat.makeBasis(_sideAxis, yAxis, zAxis);
  _qUpper.setFromRotationMatrix(_mat);
  _qElbow.setFromAxisAngle(_bendAxis.set(1, 0, 0), elbowBend);

  if (blendWeight >= 0.999) {
    armBone.quaternion.copy(_qUpper);
    foreArmBone.quaternion.copy(_qElbow);
  } else {
    armBone.quaternion.slerp(_qUpper, blendWeight);
    foreArmBone.quaternion.slerp(_qElbow, blendWeight);
  }
}
