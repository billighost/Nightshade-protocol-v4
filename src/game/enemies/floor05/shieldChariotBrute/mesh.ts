import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createBeveledBox, createContouredArmorPlate, createCurvedPanelGeometry, createLoftedAnatomy } from '../../../core/sculptUtils';
import { createEnemyContactShadow, createEnemyHitboxMesh } from '../../core/enemyMeshShared';
import type { EnemyAnimationInput, EnemyRigHandle } from '../../core/types';
import type { Floor05EnemyMaterials } from '../materials';
import { bruteSpinYaw, type BruteAttack } from './tactics';
import type { BruteTextureSuite } from './textures';

export type BrutePoseMode = BruteAttack | 'march' | 'rush_windup' | 'rush_charge' | 'slam' | 'flak' | 'bash';
export interface ShieldChariotBruteRigHandle extends EnemyRigHandle {
  setPoseMode(mode: BrutePoseMode): void;
  setBoosterFlame(intensity: number): void;
  getMortarWorldPos(out: THREE.Vector3, side: number): THREE.Vector3;
  getProwWorldPos(out: THREE.Vector3): THREE.Vector3;
}

type Vec3 = [number, number, number];
type Outline = [number, number][];
const sides = [-1, 1] as const;
const tau = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const smooth = (p: number) => THREE.MathUtils.smoothstep(p, 0, 1);

function joint(parent: THREE.Object3D, name: string, x: number, y: number, z: number) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, y, z);
  parent.add(group);
  return group;
}

function part(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function plate(parent: THREE.Object3D, mat: THREE.Material, outline: Outline, surface: (x: number, y: number) => number,
  thickness = 0.025) {
  return part(parent, createContouredArmorPlate(outline, (x, y, offset) => [x, y, surface(x, y) - offset],
    thickness, 0.08, thickness * 0.4, 2), mat);
}

// Taper a single swept surface all the way around the bend. The tip stays continuous in silhouette.
function horn(parent: THREE.Object3D, mat: THREE.Material, points: Vec3[], radius: number) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const geo = new THREE.TubeGeometry(curve, 20, radius, 12, false);
  const position = geo.attributes.position;
  const center = new THREE.Vector3(), vertex = new THREE.Vector3();
  for (let ring = 0; ring <= 20; ring++) {
    const t = ring / 20;
    curve.getPointAt(t, center);
    const scale = Math.pow(1 - t * 0.997, 0.76) * (1 + 0.045 * Math.sin(t * 15 * Math.PI));
    for (let j = 0; j <= 12; j++) {
      const i = ring * 13 + j;
      vertex.fromBufferAttribute(position, i).sub(center).multiplyScalar(scale).add(center);
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
  }
  geo.computeVertexNormals();
  return part(parent, geo, mat);
}

function axisTube(parent: THREE.Object3D, mat: THREE.Material, radius: number, length: number, x: number, y: number, z: number,
  axis: 'x' | 'z' = 'z', open = false) {
  const tube = part(parent, new THREE.CylinderGeometry(radius, radius, length, 14, 1, open), mat, x, y, z);
  if (axis === 'x') tube.rotation.z = Math.PI / 2;
  else tube.rotation.x = Math.PI / 2;
  return tube;
}

// Only weld pieces attached rigidly to the same joint. Moving barrels, cloth, shutters and hitboxes stay independent.
function weldJoint(group: THREE.Object3D) {
  const batches = new Map<THREE.Material, THREE.Mesh[]>();
  for (const child of group.children) {
    if (!(child instanceof THREE.Mesh) || Array.isArray(child.material) || child.userData.hitZone || child.name) continue;
    const list = batches.get(child.material) ?? [];
    list.push(child);
    batches.set(child.material, list);
  }
  for (const [material, meshes] of batches) {
    if (meshes.length < 2) continue;
    const geos = meshes.map(mesh => {
      mesh.updateMatrix();
      const geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      return geo.applyMatrix4(mesh.matrix);
    });
    const merged = mergeGeometries(geos, false);
    geos.forEach(g => g.dispose());
    if (!merged) continue;
    for (const mesh of meshes) {
      group.remove(mesh);
      mesh.geometry.dispose();
    }
    part(group, merged, material);
  }
}

function buildLeg(parent: THREE.Group, side: number, iron: THREE.Material, bronze: THREE.Material, jointMat: THREE.Material) {
  const hip = joint(parent, 'Hip', side * 0.267, 0, 0);
  part(hip, createLoftedAnatomy([
    { y: -0.47, rx: 0.106, rz: 0.107 }, { y: -0.32, rx: 0.155, rz: 0.156, offsetZ: -0.019 },
    { y: -0.14, rx: 0.177, rz: 0.171, squareness: 2.6 }, { y: 0, rx: 0.132, rz: 0.128 },
  ], 18), iron);
  const knee = joint(hip, 'Knee', 0, -0.47, 0);
  axisTube(knee, jointMat, 0.105, 0.24, 0, 0, 0, 'x');
  part(knee, createLoftedAnatomy([
    { y: -0.48, rx: 0.097, rz: 0.099 }, { y: -0.31, rx: 0.125, rz: 0.135, offsetZ: 0.012 },
    { y: -0.13, rx: 0.148, rz: 0.146, offsetZ: 0.028 }, { y: -0.016, rx: 0.105, rz: 0.113 },
  ], 16), iron);
  plate(knee, bronze, [[0,0.1],[0.13,0.03],[0.115,-0.16],[0,-0.39],[-0.103,-0.17],[-0.135,0.035]],
    (x,y) => -0.135 + 2.2*x*x - 0.05*y);
  const ankle = joint(knee, 'Ankle', 0, -0.48, 0);
  part(ankle, createLoftedAnatomy([
    { y: -0.105, rx: 0.143, rz: 0.226, offsetZ: -0.056, squareness: 3.2 },
    { y: -0.055, rx: 0.148, rz: 0.229, offsetZ: -0.056, squareness: 3.2 },
    { y: 0.03, rx: 0.108, rz: 0.134, squareness: 2.8 },
  ], 16), jointMat);
  for (const toe of sides) {
    const cap = part(ankle, createLoftedAnatomy([
      { y:-0.094,rx:0.071,rz:0.096,offsetZ:-0.026,squareness:2.8 },
      { y:-0.067,rx:0.077,rz:0.108,offsetZ:-0.02 }, { y:-0.021,rx:0.058,rz:0.067 },
      { y:-0.008,rx:0.025,rz:0.035,offsetZ:0.022 },
    ],14), bronze, toe * 0.073, 0, -0.173);
    cap.rotation.y = toe * 0.075;
  }
  return { hip, knee, ankle };
}

function buildArm(parent: THREE.Group, side: number, iron: THREE.Material, enamel: THREE.Material, bronze: THREE.Material,
  jointMat: THREE.Material) {
  const shoulder = joint(parent, 'Shoulder', side * 0.49, 0.65, -0.015);
  part(shoulder, createLoftedAnatomy([
    { y: -0.35, rx: 0.088, rz: 0.098 }, { y: -0.21, rx: 0.135, rz: 0.142 },
    { y: -0.065, rx: 0.158, rz: 0.17 }, { y: 0.085, rx: 0.123, rz: 0.134 },
  ], 16), iron);
  const cap = part(shoulder, createLoftedAnatomy([
    { y: -0.105, rx: 0.206, rz: 0.223 }, { y: -0.018, rx: 0.239, rz: 0.247, squareness: 2.5 },
    { y: 0.11, rx: 0.204, rz: 0.214 }, { y: 0.175, rx: 0.092, rz: 0.131 }, { y:0.19,rx:0.002,rz:0.003 },
  ], 20), enamel, side * 0.042, 0, 0);
  cap.rotation.z = -side * 0.21;
  axisTube(shoulder, bronze, 0.104, 0.035, side * 0.262, -0.022, -0.008, 'x');
  const elbow = joint(shoulder, 'Elbow', 0, -0.34, 0);
  axisTube(elbow, jointMat, 0.095, 0.235, 0, 0, 0, 'x');
  part(elbow, createLoftedAnatomy([
    { y: -0.305, rx: 0.081, rz: 0.089 }, { y: -0.242, rx: 0.124, rz: 0.123, squareness: 3 },
    { y: -0.082, rx: 0.143, rz: 0.143, squareness: 2.7 }, { y: -0.015, rx: 0.091, rz: 0.095 },
  ], 16), iron);
  part(elbow, createLoftedAnatomy([
    { y:-0.391,rx:0.055,rz:0.064,offsetZ:-0.03 }, { y:-0.357,rx:0.09,rz:0.081,squareness:3 },
    { y:-0.29,rx:0.087,rz:0.089,squareness:3 }, { y:-0.27,rx:0.07,rz:0.07 },
  ],14), jointMat);
  for (let finger = 0; finger < 4; finger++) {
    const knuckle = part(elbow,new THREE.CapsuleGeometry(0.024,0.05,3,7),iron,(finger-1.5)*0.042,-0.355,-0.062);
    knuckle.rotation.x = -0.48;
  }
  const mount = joint(elbow, 'Wrist mount', 0, -0.29, -0.04);
  return { shoulder, elbow, mount };
}

export function buildShieldChariotBruteRig(enemyId: string, mats: Floor05EnemyMaterials, tex: BruteTextureSuite): ShieldChariotBruteRigHandle {
  const root = new THREE.Group();
  root.name = 'ShieldChariotBrute_' + enemyId;
  const iron = new THREE.MeshStandardMaterial({ color: 0xf6f7ff, map: tex.armorMap, bumpMap: tex.armorBump, bumpScale: 0.009,
    roughnessMap: tex.armorRoughness, roughness: 0.95, metalness: 0.47, emissive: 0xffa96a, emissiveIntensity: 0 });
  const crimson = new THREE.MeshStandardMaterial({ map: tex.crimsonMap, metalness: 0.4, roughness: 0.42, emissive: 0xff9266, emissiveIntensity: 0 });
  const bronze = new THREE.MeshStandardMaterial({ map: tex.bronzeMap, bumpMap: tex.bronzeBump, bumpScale: 0.006, metalness: 0.55, roughness: 0.46 });
  const prowMat = new THREE.MeshStandardMaterial({ map: tex.prowMap, bumpMap: tex.prowBump, bumpScale: 0.012, metalness: 0.43, roughness: 0.48 });
  const gun = new THREE.MeshStandardMaterial({ map: tex.cannonMap, metalness: 0.5, roughness: 0.46 });
  const fabric = new THREE.MeshStandardMaterial({ map: tex.bannerMap, side: THREE.DoubleSide, metalness: 0.06, roughness: 0.93 });
  const reactor = mats.createWeakpointMaterial(0xffb25d, 0xff611b);
  const eyes = mats.createWeakpointMaterial(0xffe2b0, 0xff380d);
  const exhaust = mats.createWeakpointMaterial(0xffc486, 0xff680e);
  const auraMat = new THREE.MeshBasicMaterial({ map: tex.auraRingMap, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const owned = [iron, crimson, bronze, prowMat, gun, fabric, reactor, eyes, exhaust, auraMat];
  const shadow = createEnemyContactShadow(0.89, mats.shadowDisc);
  root.add(shadow);
  const aura = part(root, new THREE.PlaneGeometry(2.35, 2.35).rotateX(-Math.PI / 2), auraMat, 0, 0.03, 0);
  aura.name = 'Furnace wheel';
  aura.renderOrder = 2;
  aura.castShadow = false;
  const pelvis = joint(root, 'Pelvis', 0, 0.99, 0);
  const legs = sides.map(s => buildLeg(pelvis, s, iron, bronze, mats.gunmetalJoint));
  part(pelvis, createLoftedAnatomy([
    { y:-0.13, rx:0.29, rz:0.19 }, { y:0.025, rx:0.365, rz:0.225, squareness:2.7 }, { y:0.17, rx:0.268, rz:0.21 },
  ], 20), iron);
  part(pelvis, createCurvedPanelGeometry([{ y:0.01, rx:0.361, rz:0.235, thickness:0.034 },
    { y:0.094, rx:0.346, rz:0.228, thickness:0.033 }], -Math.PI, Math.PI, 24), bronze);
  for (const s of sides) {
    const hipGuard = part(pelvis, createCurvedPanelGeometry([
      { y:-0.207,rx:0.324,rz:0.219,thickness:0.028 },{ y:-0.076,rx:0.382,rz:0.261,thickness:0.037 },
      { y:0.056,rx:0.369,rz:0.235,thickness:0.039 },
    ],s<0?2.55:-0.6,s<0?3.76:0.605,10),crimson);
    hipGuard.rotation.z = s*0.09;
  }
  const apron = joint(pelvis, 'Split war apron', 0, 0.02, -0.22);
  for (const s of sides) {
    const cloth = new THREE.PlaneGeometry(0.236, 0.51, 8, 7);
    const p = cloth.attributes.position;
    for (let i=0; i<p.count; i++) {
      const x = p.getX(i), y = p.getY(i), drop = 0.5-y/0.51;
      p.setXYZ(i, x*(1-0.22*drop)+s*(0.122+0.048*drop), y-0.255+drop**4*(0.06+0.45*s*x),
        -0.018*Math.cos(x*49)-0.068*drop*drop);
    }
    cloth.computeVertexNormals();
    part(apron, cloth, fabric);
  }
  const torso = joint(pelvis, 'Spine', 0, 0.19, 0);
  part(torso, createLoftedAnatomy([
    { y:-0.05, rx:0.265, rz:0.212 }, { y:0.18, rx:0.324, rz:0.261, squareness:2.6 },
    { y:0.47, rx:0.427, rz:0.312 }, { y:0.66, rx:0.459, rz:0.304, offsetZ:0.014 },
    { y:0.81, rx:0.33, rz:0.242, offsetZ:0.036 },
  ], 22), iron);
  for (const s of sides) {
    plate(torso,crimson,[[s*0.035,0.49],[s*0.36,0.57],[s*0.451,0.68],[s*0.337,0.783],[s*0.087,0.746]],
      (x,y)=>-0.324+0.7*x*x+0.07*(y-0.6),0.041);
    for (let i=0; i<3; i++) {
      const h = 0.13+i*0.158, w = 0.31+i*0.043;
      plate(torso, i === 2 ? crimson : bronze, [[s*0.021,h+0.01],[s*w,h+0.126],[s*(w+0.015),h+0.212],[s*0.045,h+0.123]],
        (x,y) => -0.26-y*0.13+0.76*x*x, 0.033);
    }
  }
  const back = joint(torso, 'Dorsal furnace', 0, 0.53, 0.335);
  axisTube(back, iron, 0.229, 0.226, 0, 0, 0.062);
  axisTube(back, bronze, 0.182, 0.076, 0, 0, 0.193);
  const core = part(back, new THREE.SphereGeometry(0.149, 22, 14), reactor, 0, 0, 0.224);
  core.scale.z = 0.48;
  for (const y of [-0.086,0,0.086]) {
    const grille = part(back,createBeveledBox(0.236-Math.abs(y)*0.46,0.017,0.027,0.005),mats.gunmetalJoint,0,y,0.29-Math.abs(y)*0.16);
    grille.rotation.z = 0.19;
  }
  const shutters = sides.map(s => {
    const shutter = joint(back, 'Furnace shutter', s*0.144, 0, 0.244);
    const lip = part(shutter, new THREE.SphereGeometry(0.115, 14, 10), gun, -s*0.014, 0, 0);
    lip.scale.set(0.52,1.42,0.48);
    return shutter;
  });
  const mortars: THREE.Group[] = [], tubes: THREE.Group[] = [], flames: THREE.Mesh[] = [];
  for (const s of sides) {
    const tube = joint(torso, 'Dorsal mortar', s*0.279, 0.64, 0.233);
    tube.rotation.x = 0.18;
    tube.rotation.z = -s*0.11;
    part(tube, new THREE.CylinderGeometry(0.095, 0.111, 0.43, 14), gun, 0, 0.118, 0);
    part(tube, new THREE.CylinderGeometry(0.111, 0.109, 0.077, 14, 1, true), bronze, 0, 0.336, 0);
    part(tube, new THREE.CylinderGeometry(0.073, 0.073, 0.015, 14), mats.gunmetalJoint, 0, 0.341, 0);
    mortars.push(joint(tube, 'Mortar mouth', 0, 0.383, 0));
    tubes.push(tube);
    const jet = joint(back, 'Exhaust nozzle', s*0.225, -0.156, 0.042);
    jet.rotation.x = 0.26;
    axisTube(jet, bronze, 0.078, 0.175, 0, 0, 0.051);
    axisTube(jet, mats.gunmetalJoint, 0.059, 0.015, 0, 0, 0.142);
    const flame = part(jet, new THREE.ConeGeometry(0.058, 0.42, 12).rotateX(Math.PI/2).translate(0,0,0.21), exhaust, 0, 0, 0.14);
    flame.name = 'Exhaust plume';
    flame.castShadow = false;
    flames.push(flame);
  }
  const head = joint(torso, 'Bull mask', 0, 0.813, -0.103);
  part(head, createLoftedAnatomy([
    { y:-0.062, rx:0.104, rz:0.128 }, { y:0.04, rx:0.165, rz:0.169, offsetZ:-0.024 },
    { y:0.166, rx:0.197, rz:0.184, squareness:2.5 }, { y:0.26, rx:0.163, rz:0.16 },
    { y:0.316, rx:0.087, rz:0.105 }, { y:0.335, rx:0.002, rz:0.002 },
  ], 22), iron);
  for (const s of sides) {
    horn(head, bronze, [[s*0.154,0.175,0],[s*0.291,0.155,0.023],[s*0.411,0.222,0.026],
      [s*0.484,0.331,-0.032],[s*0.502,0.422,-0.136],[s*0.47,0.455,-0.217]], 0.084);
    axisTube(head, mats.crucibleSteel, 0.088, 0.046, s*0.205, 0.168, 0.009, 'x');
    const browSurface = (x: number, y: number) => -0.216+0.94*x*x+0.10*y;
    plate(head, eyes, [[s*0.028,0.13],[s*0.165,0.172],[s*0.147,0.13],[s*0.05,0.099]], browSurface);
    plate(head, bronze, [[s*0.01,0.16],[s*0.139,0.232],[s*0.19,0.219],[s*0.161,0.177],[s*0.035,0.136]],
      (x,y) => browSurface(x,y)-0.018);
    plate(head, crimson, [[s*0.178,0.121],[s*0.157,0.004],[s*0.073,-0.08],[s*0.072,0.055]], browSurface);
  }
  plate(head, bronze, [[0,0.297],[0.056,0.207],[0.041,0.095],[0.085,0.022],[0.073,-0.032],
    [0,-0.052],[-0.073,-0.032],[-0.085,0.022],[-0.041,0.095],[-0.056,0.207]],
    (x,y) => -0.247+0.39*y+0.33*Math.abs(x), 0.035);
  for (const s of sides) axisTube(head, mats.gunmetalJoint, 0.021, 0.014, s*0.041, -0.0005, -0.267);
  const left = buildArm(torso,-1,iron,crimson,bronze,mats.gunmetalJoint);
  const right = buildArm(torso,1,iron,crimson,bronze,mats.gunmetalJoint);
  const shield = joint(left.mount, 'V-prow shield', 0.022, -0.085, -0.129);
  const surface = (x: number, y: number) => -0.165+0.46*Math.abs(x)+0.048*y*y;
  for (const s of sides) {
    const contour: Outline = [[0,0.56],[s*0.29,0.602],[s*0.532,0.51],[s*0.558,0.22],[s*0.48,-0.36],[s*0.32,-0.55],[0,-0.708]];
    plate(shield,bronze,contour,surface,0.069);
    const face = plate(shield,prowMat,contour.map(([x,y]) => [x*0.90+s*0.017,y*0.913]),(x,y)=>surface(x,y)-0.066,0.023);
    const uv = face.geometry.attributes.uv;
    for (let i=0; i<uv.count; i++) uv.setX(i,(uv.getX(i)+(s>0 ? 1 : 0))*0.5);
    horn(shield, mats.crucibleSteel, [[s*0.341,-0.34,surface(s*0.341,-0.34)-0.06],
      [s*0.362,-0.37,-0.176],[s*0.349,-0.344,-0.326],[s*0.301,-0.278,-0.445]],0.065);
  }
  plate(shield, bronze, [[0,0.603],[0.066,0.49],[0.043,-0.449],[0,-0.733],[-0.043,-0.449],[-0.066,0.49]],
    (x,y)=>surface(x,y)-0.103,0.035);
  // A small bull's head cast into the boss of the shield, with amber eyes inset under its brow.
  const boss = joint(shield, 'Ram boss', 0, 0.136, -0.277);
  part(boss, createLoftedAnatomy([
    { y:-0.131,rx:0.052,rz:0.049,offsetZ:-0.078 },{ y:-0.075,rx:0.077,rz:0.068,offsetZ:-0.06 },
    { y:0.041,rx:0.126,rz:0.079 },{ y:0.105,rx:0.082,rz:0.042 },
  ],16),bronze);
  for(const s of sides) {
    horn(boss,bronze,[[s*0.082,0.052,0],[s*0.151,0.045,-0.008],[s*0.202,0.081,0],[s*0.228,0.153,-0.028]],0.039);
    plate(boss,eyes,[[s*0.032,0.031],[s*0.096,0.056],[s*0.069,0.021]],()=>-0.064,0.009);
  }
  const prowAnchor = joint(shield,'Prow impact',0,-0.095,-0.335);
  const cannon = joint(right.mount, 'Flak receiver', 0,-0.024,-0.093);
  axisTube(cannon, gun, 0.144, 0.43, 0, 0, -0.126);
  part(cannon, createBeveledBox(0.221,0.069,0.357,0.015),bronze,0,0.123,-0.13);
  const rotor = joint(cannon,'Six barrel rotor',0,0,-0.328);
  for (let i=0; i<6; i++) {
    const a = i*tau/6, x = 0.084*Math.cos(a), y = 0.084*Math.sin(a);
    axisTube(rotor,mats.crucibleSteel,0.034,0.442,x,y,-0.196,'z',true);
    axisTube(rotor,gun,0.024,0.01,x,y,-0.387);
  }
  axisTube(rotor,bronze,0.137,0.057,0,0,-0.257);
  const muzzle = joint(rotor,'Flak muzzle',0,0,-0.43);
  const hitboxes: THREE.Mesh[] = [];
  function hit(parent: THREE.Group, zone: 'body'|'head'|'weakpoint'|'shield', size: Vec3, pos: Vec3) {
    const box = createEnemyHitboxMesh(enemyId,zone,new THREE.BoxGeometry(...size),zone === 'weakpoint' ? 'dorsal_booster' : undefined);
    box.position.set(...pos);
    hitboxes.push(box);
    parent.add(box);
    return box;
  }
  hit(torso,'body',[0.87,0.93,0.6],[0,0.32,0]);
  hit(pelvis,'body',[0.72,0.87,0.42],[0,-0.46,0]);
  hit(head,'head',[0.389,0.411,0.41],[0,0.123,-0.03]);
  hit(back,'weakpoint',[0.389,0.372,0.228],[0,0,0.169]);
  for (const s of sides) {
    const hb = hit(shield,'shield',[0.547,1.23,0.137],[s*0.253,-0.008,-0.108]);
    hb.rotation.y = -s*0.429;
    const raycast = hb.raycast;
    hb.raycast = function(ray, hits) { if (shield.visible) raycast.call(this, ray, hits); };
  }
  const groups: THREE.Group[] = [];
  root.traverse(o => { if (o instanceof THREE.Group) groups.push(o); });
  for (const g of groups) weldJoint(g);

  let pose: BrutePoseMode = 'march', booster = 0, gait = 0, pace = 0, heat = 0;
  const damp = (now: number, next: number, rate: number, dt: number) => THREE.MathUtils.damp(now,next,rate,dt);
  return {
    root, hitboxes, shieldGroup:shield, armorFlashMaterials:[iron,crimson], weakpointMaterials:[reactor],
    setPoseMode(mode) { pose = mode; },
    setBoosterFlame(level) { booster = level; },
    getMuzzleWorldPos(out) { return muzzle.getWorldPosition(out); },
    getWeakpointWorldPos(out) { return core.getWorldPosition(out); },
    getMortarWorldPos(out,side) { return mortars[side < 0 ? 0 : 1].getWorldPosition(out); },
    getProwWorldPos(out) {
      return (shield.visible ? prowAnchor : left.mount).getWorldPosition(out);
    },
    updateAnimation(input: EnemyAnimationInput) {
      const { behavior, dt, elapsed, phase, shieldActive, weakpointBroken } = input;
      const dead = behavior === 'dead', stagger = behavior === 'staggered';
      const wind = behavior === 'windup', active = behavior === 'attack', rest = behavior === 'recover';
      const p = clamp(input.attackProgress,0,1), t = smooth(p);
      const settle = rest ? 1-smooth(p) : 1;
      const blend = 1-Math.exp(-dt*(active ? 31 : 15));
      const mix = (value: number, next: number) => value+(next-value)*blend;
      shield.visible = shieldActive && !dead;
      pace = damp(pace,dead || stagger ? 0 : Math.min(1.65,input.speedRatio),10,dt);
      gait += dt*(pace > 0.015 ? 2.6+4.35*pace : 0);
      heat = damp(heat,dead ? 0 : (phase === 2 ? 0.78 : 0.17)+(wind ? 0.48*t : active ? 0.45 : 0),8,dt);
      const breath = Math.sin(elapsed*2.6);
      let drop = 0, lean = -0.071, twist = 0, roll = 0, headDip = 0;
      let guard = 0.24, leftBend = 0.93, rightLift = 0.11, rightBend = 0.98;
      let shieldYaw = -0.09, shieldTip = 0, spread = 0.025, recoil = 0, gunPitch = -0.14, spin = 0, tubeTilt = 0.18;
      switch (pose) {
        case 'chariot_bull_rush': case 'rush_windup': case 'rush_charge':
          drop = (wind ? 0.135*t : 0.14)*settle;
          lean -= (wind ? 0.34*t : 0.38)*settle;
          guard += 0.46*settle; leftBend -= 0.25*settle; shieldYaw += 0.31*settle;
          rightLift -= 0.39*settle; headDip = 0.22*settle; break;
        case 'seismic_prow_slam': case 'slam': {
          const down = active ? smooth(p/0.43) : rest ? 1 : 0;
          const lift = wind ? t : (1-down);
          guard += 2.12*lift; leftBend -= 0.39*lift; rightLift += 0.47*lift;
          lean += 0.23*lift-0.57*down*settle;
          drop += 0.245*down*settle; roll -= 0.15*down*settle;
          shieldTip = -0.48*down*settle;
          break;
        }
        case 'ram_shield_bash': case 'bash': {
          const strike = active ? smooth(p/0.38) : rest ? settle : 0;
          twist = (wind ? -0.46*t : -0.46+1.05*strike)*settle;
          guard += 1.02*strike; leftBend -= 0.64*strike;
          lean -= 0.21*strike; drop += 0.059*settle; break;
        }
        case 'incendiary_mortar_salvo':
          drop = 0.135*(wind ? t : settle); lean += 0.117*settle;
          guard += 0.24*settle; headDip = 0.16*settle;
          tubeTilt = 0.18-(wind ? t : settle)*0.81;
          recoil = active ? Math.max(0,1-Math.abs(((p*0.84-0.09+0.28)%0.28)-0.028)/0.086) : 0;
          lean += 0.065*recoil; break;
        case 'juggernaut_spin_cleave':
          spin = wind ? -0.75*t : active ? bruteSpinYaw(p) : -0.75*settle;
          guard += (wind ? 0.46*t : 0.87*settle); leftBend -= 0.43*settle;
          spread = (wind ? 0.31*t : 0.98*settle); drop = 0.11*settle; roll = -0.105*settle; break;
        case 'fortress_advance_barrage':
        case 'flak_scatter_barrage': case 'flak': {
          const fortress = pose === 'fortress_advance_barrage';
          const level = wind ? t : settle;
          drop = (fortress ? 0.125 : 0.083)*level;
          guard += (fortress ? 0.72 : 0.18)*level;
          shieldYaw += (fortress ? 0.37 : -0.12)*level;
          rightLift += 0.56*level; rightBend -= 0.19*level; twist = 0.085*level;
          gunPitch = clamp(input.aimPitch,-0.48,0.64)*level;
          const secondsAfterFirstShot = p*1.52-0.22;
          const shotTime = fortress
            ? secondsAfterFirstShot - 0.48 * clamp(Math.floor(secondsAfterFirstShot / 0.48), 0, 2)
            : (p-0.25)*0.43;
          recoil = active && shotTime >= 0 ? Math.max(0,1-shotTime/0.145) : 0;
          rightLift += 0.16*recoil; gunPitch += 0.105*recoil;
          break;
        }
      }
      if (stagger) {
        drop = 0.298; lean = -0.34; roll = -0.14; headDip = -0.22;
        guard = -0.18; rightLift = -0.22; leftBend = 0.6; spread = 0.37;
      }
      const death = dead ? smooth(input.deadProgress) : 0;
      if (dead) {
        drop = 0.58*death; lean = -0.94*death; roll = -0.61*death;
        guard = -0.32; rightLift = -0.34; headDip = -0.19;
      }
      const travel = Math.min(1.17,pace);
      pelvis.position.y = mix(pelvis.position.y,0.984-drop+0.016*Math.cos(2*gait)*travel+0.005*breath*(1-death));
      pelvis.position.x = mix(pelvis.position.x,0.031*Math.cos(gait)*travel-0.115*death);
      // Turn the whole stance through the sweep. Keep the winding continuous at the recovery seam.
      const spinDelta = Math.atan2(Math.sin(spin-pelvis.rotation.y),Math.cos(spin-pelvis.rotation.y));
      pelvis.rotation.y += spinDelta*(pose === 'juggernaut_spin_cleave' && active ? 1 : blend);
      pelvis.rotation.z = mix(pelvis.rotation.z,-0.23*death);
      const forward = clamp(input.localMoveZ,-1,1), lateral = clamp(input.localMoveX,-1,1);
      legs.forEach((leg,i) => {
        const side = sides[i], cycle = gait+i*Math.PI;
        const lift = Math.max(0,Math.sin(cycle))*0.145*travel;
        const z = 0.066*side - Math.cos(cycle)*0.255*forward;
        const x = side*0.038 + Math.cos(cycle)*0.168*lateral;
        const h = pelvis.position.y-0.105-lift+(stagger && i === 0 ? -0.085 : 0);
        const vertical = Math.hypot(h,x);
        const length = clamp(Math.hypot(vertical,z),0.12,0.949);
        const kneeAngle = Math.acos(clamp((length*length-0.47**2-0.48**2)/(2*0.47*0.48),-1,1));
        const hipAngle = Math.atan2(-z,vertical)+Math.atan2(0.48*Math.sin(kneeAngle),0.47+0.48*Math.cos(kneeAngle));
        leg.hip.rotation.z = Math.atan2(x,Math.max(0.18,h));
        leg.hip.rotation.x = hipAngle;
        leg.knee.rotation.x = -kneeAngle;
        leg.ankle.rotation.set(kneeAngle-hipAngle,-side*0.035,-leg.hip.rotation.z);
      });
      torso.rotation.set(mix(torso.rotation.x,lean+0.012*breath-input.flinchTimer*0.47),
        mix(torso.rotation.y,twist+0.075*Math.sin(gait)*travel),mix(torso.rotation.z,roll+input.flinchDirX*input.flinchTimer*0.48));
      head.rotation.set(mix(head.rotation.x,headDip-lean*0.36),mix(head.rotation.y,-twist*0.42+0.027*Math.sin(elapsed*1.6)),
        mix(head.rotation.z,-roll*0.28));
      left.shoulder.rotation.set(mix(left.shoulder.rotation.x,guard+0.14*Math.cos(gait)*travel),0,mix(left.shoulder.rotation.z,-spread));
      right.shoulder.rotation.set(mix(right.shoulder.rotation.x,rightLift-0.13*Math.cos(gait)*travel),0,mix(right.shoulder.rotation.z,spread*0.61));
      left.elbow.rotation.x = mix(left.elbow.rotation.x,leftBend);
      right.elbow.rotation.x = mix(right.elbow.rotation.x,rightBend);
      shield.rotation.set(shieldTip-left.elbow.rotation.x-left.shoulder.rotation.x*0.82,shieldYaw,spread*0.48);
      cannon.rotation.x = gunPitch-right.elbow.rotation.x-right.shoulder.rotation.x-torso.rotation.x;
      rotor.position.z = -0.328+0.083*recoil;
      rotor.rotation.z += dt*(1.7+heat*4+((pose === 'flak_scatter_barrage' || pose === 'fortress_advance_barrage') && (wind || active) ? 18 : 0))*(1-death);
      apron.rotation.x = mix(apron.rotation.x,0.09+0.14*Math.sin(gait+0.6)*travel+drop*0.45);
      apron.rotation.z = mix(apron.rotation.z,-roll*0.46+0.09*lateral);
      tubes.forEach(tube => tube.rotation.x = mix(tube.rotation.x,tubeTilt));
      shutters.forEach((shutter,i) => shutter.rotation.y = mix(shutter.rotation.y,sides[i]*(weakpointBroken ? 1.48 : rest ? 1.15 : 0.19+0.13*breath)));
      for (const flame of flames) {
        flame.visible = booster > 0.1 && !dead && !stagger;
        flame.scale.z = booster*(0.91+0.11*Math.sin(elapsed*32));
      }
      aura.visible = !dead;
      aura.rotation.y += dt*(0.13+0.41*heat);
      auraMat.opacity = 0.17+0.22*heat+0.036*breath;
      eyes.emissiveIntensity = (1-death)*(1.35+heat*1.65);
      reactor.emissiveIntensity = weakpointBroken ? 0.25 : 1.65+0.6*breath+1.6*heat;
    },
    dispose() {
      root.traverse(child => { if (child instanceof THREE.Mesh) child.geometry.dispose(); });
      hitboxes.forEach(hb => (hb.material as THREE.Material).dispose());
      owned.forEach(mat => mat.dispose());
    },
  };
}
