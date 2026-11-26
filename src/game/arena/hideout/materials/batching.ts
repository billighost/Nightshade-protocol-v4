import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BoxSpec } from './types';

/**
 * Merges an array of static greybox boxes sharing one material into a single draw-call `THREE.Mesh`
 * with accurate bounding volumes for frustum culling (`frustumCulled = true`).
 */
export function buildBatchedBoxesMesh(
  specs: BoxSpec[],
  material: THREE.Material,
  opts?: { castShadow?: boolean; receiveShadow?: boolean; name?: string }
): THREE.Mesh | null {
  if (specs.length === 0) return null;
  const geos: THREE.BufferGeometry[] = [];
  const mat4 = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3(1, 1, 1);

  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    const g = new THREE.BoxGeometry(s.w, s.h, s.d);
    if (s.rotX || s.rotY || s.rotZ) {
      euler.set(s.rotX ?? 0, s.rotY ?? 0, s.rotZ ?? 0, 'YXZ');
      quat.setFromEuler(euler);
    } else {
      quat.identity();
    }
    pos.set(s.x, s.y, s.z);
    mat4.compose(pos, quat, scale);
    g.applyMatrix4(mat4);
    geos.push(g);
  }

  const merged = mergeGeometries(geos, false);
  for (let i = 0; i < geos.length; i++) geos[i].dispose();
  if (!merged) return null;

  merged.computeBoundingBox();
  merged.computeBoundingSphere();

  const mesh = new THREE.Mesh(merged, material);
  mesh.castShadow = opts?.castShadow ?? false;
  mesh.receiveShadow = opts?.receiveShadow ?? true;
  mesh.frustumCulled = true;
  if (opts?.name) mesh.name = opts.name;
  return mesh;
}

/**
 * Builds an `InstancedMesh` of unit-box transforms (each spec supplies position, scale w/h/d, and rotation)
 * with bounding sphere computed so frustum culling stays rock-solid.
 */
export function buildInstancedBoxes(
  specs: BoxSpec[],
  material: THREE.Material,
  opts?: { castShadow?: boolean; receiveShadow?: boolean; name?: string }
): THREE.InstancedMesh | null {
  if (specs.length === 0) return null;
  const unitGeo = new THREE.BoxGeometry(1, 1, 1);
  const inst = new THREE.InstancedMesh(unitGeo, material, specs.length);
  const dummy = new THREE.Object3D();
  dummy.rotation.order = 'YXZ';

  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    dummy.position.set(s.x, s.y, s.z);
    dummy.rotation.set(s.rotX ?? 0, s.rotY ?? 0, s.rotZ ?? 0);
    dummy.scale.set(s.w, s.h, s.d);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  }
  inst.instanceMatrix.needsUpdate = true;
  inst.computeBoundingBox();
  inst.computeBoundingSphere();
  inst.castShadow = opts?.castShadow ?? false;
  inst.receiveShadow = opts?.receiveShadow ?? true;
  inst.frustumCulled = true;
  if (opts?.name) inst.name = opts.name;
  return inst;
}
