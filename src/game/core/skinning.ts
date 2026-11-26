import * as THREE from 'three';

export interface BoneWeightSample {
  indices: [number, number, number, number];
  weights: [number, number, number, number];
}

export type WeightResolver = (x: number, y: number, z: number) => BoneWeightSample;

/**
 * Normalizes up to 4 bone weights so they sum cleanly to 1.0.
 */
export function makeWeights(
  pairs: Array<[number, number]>
): BoneWeightSample {
  const sorted = pairs
    .filter(([, w]) => w > 1e-4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  if (sorted.length === 0) {
    return { indices: [0, 0, 0, 0], weights: [1, 0, 0, 0] };
  }

  let sum = 0;
  for (const [, w] of sorted) sum += w;
  const inv = sum > 1e-5 ? 1 / sum : 1;

  const indices: [number, number, number, number] = [0, 0, 0, 0];
  const weights: [number, number, number, number] = [0, 0, 0, 0];
  for (let i = 0; i < sorted.length; i++) {
    indices[i] = sorted[i][0];
    weights[i] = sorted[i][1] * inv;
  }
  return { indices, weights };
}

/**
 * Smooth hermite step 0..1 between edge0 and edge1.
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Attaches skinIndex and skinWeight BufferAttributes to a BufferGeometry authored in bind-pose root space.
 */
export function applySkinWeights(
  geo: THREE.BufferGeometry,
  resolve: WeightResolver
): THREE.BufferGeometry {
  const pos = geo.getAttribute('position');
  const count = pos.count;
  const skinIndices = new Uint16Array(count * 4);
  const skinWeights = new Float32Array(count * 4);

  for (let i = 0; i < count; i++) {
    const sample = resolve(pos.getX(i), pos.getY(i), pos.getZ(i));
    const o = i * 4;
    skinIndices[o] = sample.indices[0];
    skinIndices[o + 1] = sample.indices[1];
    skinIndices[o + 2] = sample.indices[2];
    skinIndices[o + 3] = sample.indices[3];
    skinWeights[o] = sample.weights[0];
    skinWeights[o + 1] = sample.weights[1];
    skinWeights[o + 2] = sample.weights[2];
    skinWeights[o + 3] = sample.weights[3];
  }

  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  return geo;
}

/**
 * Merges multiple indexed or non-indexed BufferGeometries (all already in bind-pose root space)
 * into a single continuous BufferGeometry preserving position, normal, uv, skinIndex, and skinWeight.
 */
export function mergeSkinnedGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let totalVerts = 0;
  let totalIndices = 0;

  for (const g of geos) {
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    totalVerts += g.getAttribute('position').count;
    totalIndices += g.index ? g.index.count : g.getAttribute('position').count;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const skinIndices = new Uint16Array(totalVerts * 4);
  const skinWeights = new Float32Array(totalVerts * 4);
  const indices = new Uint32Array(totalIndices);

  let vOffset = 0;
  let iOffset = 0;

  for (const g of geos) {
    const pos = g.getAttribute('position');
    const norm = g.getAttribute('normal');
    const uv = g.getAttribute('uv');
    const sIdx = g.getAttribute('skinIndex');
    const sWgt = g.getAttribute('skinWeight');
    const count = pos.count;

    for (let i = 0; i < count; i++) {
      const vo = vOffset + i;
      positions[vo * 3] = pos.getX(i);
      positions[vo * 3 + 1] = pos.getY(i);
      positions[vo * 3 + 2] = pos.getZ(i);

      normals[vo * 3] = norm.getX(i);
      normals[vo * 3 + 1] = norm.getY(i);
      normals[vo * 3 + 2] = norm.getZ(i);

      if (uv) {
        uvs[vo * 2] = uv.getX(i);
        uvs[vo * 2 + 1] = uv.getY(i);
      }

      if (sIdx && sWgt) {
        skinIndices[vo * 4] = sIdx.getX(i);
        skinIndices[vo * 4 + 1] = sIdx.getY(i);
        skinIndices[vo * 4 + 2] = sIdx.getZ(i);
        skinIndices[vo * 4 + 3] = sIdx.getW(i);
        skinWeights[vo * 4] = sWgt.getX(i);
        skinWeights[vo * 4 + 1] = sWgt.getY(i);
        skinWeights[vo * 4 + 2] = sWgt.getZ(i);
        skinWeights[vo * 4 + 3] = sWgt.getW(i);
      } else {
        skinIndices[vo * 4] = 0;
        skinWeights[vo * 4] = 1;
      }
    }

    if (g.index) {
      const src = g.index;
      for (let i = 0; i < src.count; i++) {
        indices[iOffset + i] = src.getX(i) + vOffset;
      }
      iOffset += src.count;
    } else {
      for (let i = 0; i < count; i++) {
        indices[iOffset + i] = vOffset + i;
      }
      iOffset += count;
    }

    vOffset += count;
    g.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  merged.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  merged.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  return merged;
}

/**
 * Creates a frustum-safe shadow-casting SkinnedMesh bound cleanly to a Skeleton.
 */
export function createBoundSkinnedMesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  skeleton: THREE.Skeleton,
  name: string
): THREE.SkinnedMesh {
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false; // Critical: animated limbs/rolls never cull against static bind AABB
  mesh.bind(skeleton);
  return mesh;
}
