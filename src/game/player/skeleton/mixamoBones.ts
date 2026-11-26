import * as THREE from 'three';

/**
 * Standard Mixamo-compatible 24-bone humanoid rig indices.
 * Every bone sits in true 1:1 human scale (operative total height = 1.82m, soles flush at y = 0.000).
 * Character faces -Z, Right = +X, Left = -X, Up = +Y.
 */
export const BONE_IDX = {
  Hips: 0,
  Spine: 1,
  Spine1: 2,
  Spine2: 3,
  Neck: 4,
  Head: 5,
  RightShoulder: 6,
  RightArm: 7,
  RightForeArm: 8,
  RightHand: 9,
  LeftShoulder: 10,
  LeftArm: 11,
  LeftForeArm: 12,
  LeftHand: 13,
  RightUpLeg: 14,
  RightLeg: 15,
  RightFoot: 16,
  RightToeBase: 17,
  LeftUpLeg: 18,
  LeftLeg: 19,
  LeftFoot: 20,
  LeftToeBase: 21,
} as const;

export interface MixamoHumanoidRig {
  skeleton: THREE.Skeleton;
  bones: THREE.Bone[];
  hips: THREE.Bone;
  spine: THREE.Bone;
  spine1: THREE.Bone;
  spine2: THREE.Bone;
  neck: THREE.Bone;
  head: THREE.Bone;
  rightShoulder: THREE.Bone;
  rightArm: THREE.Bone;
  rightForeArm: THREE.Bone;
  rightHand: THREE.Bone;
  leftShoulder: THREE.Bone;
  leftArm: THREE.Bone;
  leftForeArm: THREE.Bone;
  leftHand: THREE.Bone;
  rightUpLeg: THREE.Bone;
  rightLeg: THREE.Bone;
  rightFoot: THREE.Bone;
  rightToeBase: THREE.Bone;
  leftUpLeg: THREE.Bone;
  leftLeg: THREE.Bone;
  leftFoot: THREE.Bone;
  leftToeBase: THREE.Bone;
  /** Equipment attachment sockets bound cleanly to Mixamo bones */
  weaponHandSocket: THREE.Group;
  holsterSocket: THREE.Group;
  backSmgSocket: THREE.Group;
  backHeavySocket: THREE.Group;
  backSmgBaseQuat: THREE.Quaternion;
  backHeavyBaseQuat: THREE.Quaternion;
  /** Exact bone lengths for analytical 2-Bone Arm IK */
  upperArmLen: number;
  foreArmLen: number;
}

/** Exact bind-pose anatomical joint heights & offsets (1 unit = 1.00 meter) */
export const BIND_POSE = {
  hipsY: 0.96,
  spineY: 1.05,
  spine1Y: 1.18,
  spine2Y: 1.32,
  neckY: 1.54,
  headY: 1.62,
  shoulderX: 0.125,
  shoulderY: 1.47,
  armX: 0.228,
  armY: 1.46,
  elbowY: 1.17, // upperArmLen = 0.29m
  wristY: 0.91, // foreArmLen = 0.26m
  hipX: 0.104,
  hipY: 0.91,
  kneeY: 0.49,
  ankleY: 0.1, // boot sole sits at y = 0.000
} as const;

export function createMixamoSkeleton(root: THREE.Group): MixamoHumanoidRig {
  const makeBone = (name: string, x: number, y: number, z: number): THREE.Bone => {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(x, y, z);
    return b;
  };

  // Core Spine Chain
  const hips = makeBone('mixamorig:Hips', 0, BIND_POSE.hipsY, 0);
  const spine = makeBone('mixamorig:Spine', 0, BIND_POSE.spineY - BIND_POSE.hipsY, 0);
  const spine1 = makeBone('mixamorig:Spine1', 0, BIND_POSE.spine1Y - BIND_POSE.spineY, 0);
  const spine2 = makeBone('mixamorig:Spine2', 0, BIND_POSE.spine2Y - BIND_POSE.spine1Y, 0);
  const neck = makeBone('mixamorig:Neck', 0, BIND_POSE.neckY - BIND_POSE.spine2Y, 0.004);
  const head = makeBone('mixamorig:Head', 0, BIND_POSE.headY - BIND_POSE.neckY, -0.006);

  hips.add(spine);
  spine.add(spine1);
  spine1.add(spine2);
  spine2.add(neck);
  neck.add(head);

  // Right Arm Chain (+X)
  const rightShoulder = makeBone(
    'mixamorig:RightShoulder',
    BIND_POSE.shoulderX,
    BIND_POSE.shoulderY - BIND_POSE.spine2Y,
    0.004
  );
  const rightArm = makeBone(
    'mixamorig:RightArm',
    BIND_POSE.armX - BIND_POSE.shoulderX,
    BIND_POSE.armY - BIND_POSE.shoulderY,
    0
  );
  const rightForeArm = makeBone(
    'mixamorig:RightForeArm',
    0,
    BIND_POSE.elbowY - BIND_POSE.armY,
    0
  );
  const rightHand = makeBone(
    'mixamorig:RightHand',
    0,
    BIND_POSE.wristY - BIND_POSE.elbowY,
    0
  );

  spine2.add(rightShoulder);
  rightShoulder.add(rightArm);
  rightArm.add(rightForeArm);
  rightForeArm.add(rightHand);

  // Left Arm Chain (-X)
  const leftShoulder = makeBone(
    'mixamorig:LeftShoulder',
    -BIND_POSE.shoulderX,
    BIND_POSE.shoulderY - BIND_POSE.spine2Y,
    0.004
  );
  const leftArm = makeBone(
    'mixamorig:LeftArm',
    -(BIND_POSE.armX - BIND_POSE.shoulderX),
    BIND_POSE.armY - BIND_POSE.shoulderY,
    0
  );
  const leftForeArm = makeBone(
    'mixamorig:LeftForeArm',
    0,
    BIND_POSE.elbowY - BIND_POSE.armY,
    0
  );
  const leftHand = makeBone(
    'mixamorig:LeftHand',
    0,
    BIND_POSE.wristY - BIND_POSE.elbowY,
    0
  );

  spine2.add(leftShoulder);
  leftShoulder.add(leftArm);
  leftArm.add(leftForeArm);
  leftForeArm.add(leftHand);

  // Right Leg Chain (+X)
  const rightUpLeg = makeBone('mixamorig:RightUpLeg', BIND_POSE.hipX, BIND_POSE.hipY - BIND_POSE.hipsY, 0);
  const rightLeg = makeBone('mixamorig:RightLeg', 0, BIND_POSE.kneeY - BIND_POSE.hipY, 0);
  const rightFoot = makeBone('mixamorig:RightFoot', 0, BIND_POSE.ankleY - BIND_POSE.kneeY, 0);
  const rightToeBase = makeBone('mixamorig:RightToeBase', 0, -0.06, -0.14);

  hips.add(rightUpLeg);
  rightUpLeg.add(rightLeg);
  rightLeg.add(rightFoot);
  rightFoot.add(rightToeBase);

  // Left Leg Chain (-X)
  const leftUpLeg = makeBone('mixamorig:LeftUpLeg', -BIND_POSE.hipX, BIND_POSE.hipY - BIND_POSE.hipsY, 0);
  const leftLeg = makeBone('mixamorig:LeftLeg', 0, BIND_POSE.kneeY - BIND_POSE.hipY, 0);
  const leftFoot = makeBone('mixamorig:LeftFoot', 0, BIND_POSE.ankleY - BIND_POSE.kneeY, 0);
  const leftToeBase = makeBone('mixamorig:LeftToeBase', 0, -0.06, -0.14);

  hips.add(leftUpLeg);
  leftUpLeg.add(leftLeg);
  leftLeg.add(leftFoot);
  leftFoot.add(leftToeBase);

  // Equipment Sockets bound directly to Mixamo bones
  // Anatomical right-hand pistol grip basis:
  //   Pistol +X (right side) -> Hand -Z (dorsal / knuckles)
  //   Pistol +Y (top of slide) -> Hand -X (thumb web / radial side)
  //   Pistol +Z (rear of grip) -> Hand +Y (wrist)
  // Seated at (-0.010, -0.084, +0.026) so the grip sits DEAD INSIDE the palm & wrapped fingers!
  const weaponHandSocket = new THREE.Group();
  weaponHandSocket.name = 'Socket_RightHand_Weapon';
  weaponHandSocket.position.set(-0.01, -0.084, 0.026);
  const gripBasis = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0)
  );
  weaponHandSocket.quaternion.setFromRotationMatrix(gripBasis);
  rightHand.add(weaponHandSocket);

  const holsterSocket = new THREE.Group();
  holsterSocket.name = 'Socket_RightThigh_Holster';
  holsterSocket.position.set(0.136, -0.155, -0.008);
  holsterSocket.rotation.set(-Math.PI * 0.5, 0, 0);
  rightUpLeg.add(holsterSocket);

  // Left Dorsal Magnetic Rail (`backSmgSocket`) — Ghost Recon / Division 2 left-pack stow:
  //   Barrel (-Z) points DOWN-LEFT; EOTech optic (+Y) faces OUT-LEFT clear of torso;
  //   Curved mag (-Y) angles cleanly REARWARD (+Z) on left side of spine with ZERO backplate clipping!
  const backSmgSocket = new THREE.Group();
  backSmgSocket.name = 'Socket_Back_SMG';
  backSmgSocket.position.set(-0.158, 0.045, 0.218);
  const smgZ = new THREE.Vector3(0.15, 0.986, -0.05).normalize(); // +Z (stock) points UP-LEFT, -Z (barrel) points DOWN-LEFT
  const smgY = new THREE.Vector3(-0.91, 0.14, -0.38).normalize(); // +Y (optic) faces OUT-LEFT; -Y (mag) angles cleanly rearward (+Z) clear of back armor!
  const smgX = new THREE.Vector3().crossVectors(smgY, smgZ).normalize();
  smgY.crossVectors(smgZ, smgX).normalize();
  const smgBasis = new THREE.Matrix4().makeBasis(smgX, smgY, smgZ);
  const backSmgBaseQuat = new THREE.Quaternion().setFromRotationMatrix(smgBasis);
  backSmgSocket.quaternion.copy(backSmgBaseQuat);
  spine2.add(backSmgSocket);

  // Right Dorsal Heavy Sling (`backHeavySocket`) — VULCAN-50 .50-Cal Kinetic Battle Rifle:
  //   Mounted cleanly on right half of upper back (32cm horizontal separation from VIPER-X4!):
  //   Barrel (-Z) rises UP & slightly OUT-RIGHT so the colossal tank muzzle brake peeks heroically
  //   above the operative's right shoulder; LPVO scope (+Y) faces OUT-RIGHT and wide .50 box mag (-Y)
  //   angles cleanly rearward (+Z) strictly on the right side of the spine with ZERO clipping!
  const backHeavySocket = new THREE.Group();
  backHeavySocket.name = 'Socket_Back_Heavy';
  backHeavySocket.position.set(0.165, -0.02, 0.222);
  const heavyZ = new THREE.Vector3(-0.16, -0.985, -0.05).normalize(); // +Z (stock) DOWN-RIGHT, -Z (barrel+tank brake) UP-RIGHT!
  const heavyY = new THREE.Vector3(0.91, -0.15, -0.38).normalize(); // +Y (LPVO scope) faces OUT-RIGHT; -Y (.50 box mag) clears backplate rearward!
  const heavyX = new THREE.Vector3().crossVectors(heavyY, heavyZ).normalize();
  heavyY.crossVectors(heavyZ, heavyX).normalize();
  const heavyBasis = new THREE.Matrix4().makeBasis(heavyX, heavyY, heavyZ);
  const backHeavyBaseQuat = new THREE.Quaternion().setFromRotationMatrix(heavyBasis);
  backHeavySocket.quaternion.copy(backHeavyBaseQuat);
  spine2.add(backHeavySocket);

  // Ordered exactly matching BONE_IDX!
  const bones: THREE.Bone[] = [
    hips,
    spine,
    spine1,
    spine2,
    neck,
    head,
    rightShoulder,
    rightArm,
    rightForeArm,
    rightHand,
    leftShoulder,
    leftArm,
    leftForeArm,
    leftHand,
    rightUpLeg,
    rightLeg,
    rightFoot,
    rightToeBase,
    leftUpLeg,
    leftLeg,
    leftFoot,
    leftToeBase,
  ];

  root.add(hips);
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  skeleton.calculateInverses();

  return {
    skeleton,
    bones,
    hips,
    spine,
    spine1,
    spine2,
    neck,
    head,
    rightShoulder,
    rightArm,
    rightForeArm,
    rightHand,
    leftShoulder,
    leftArm,
    leftForeArm,
    leftHand,
    rightUpLeg,
    rightLeg,
    rightFoot,
    rightToeBase,
    leftUpLeg,
    leftLeg,
    leftFoot,
    leftToeBase,
    weaponHandSocket,
    holsterSocket,
    backSmgSocket,
    backHeavySocket,
    backSmgBaseQuat,
    backHeavyBaseQuat,
    upperArmLen: Math.abs(BIND_POSE.elbowY - BIND_POSE.armY),
    foreArmLen: Math.abs(BIND_POSE.wristY - BIND_POSE.elbowY),
  };
}
