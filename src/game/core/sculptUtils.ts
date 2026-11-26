import * as THREE from 'three';

export interface LoftSlice {
  y: number;
  rx: number; // half-width (X)
  rz: number; // half-depth (Z)
  offsetX?: number;
  offsetZ?: number;
  frontScale?: number; // multiplier for -Z (front)
  backScale?: number; // multiplier for +Z (back)
  squareness?: number; // 2.0 = ellipse, >2 = subtly squared/anatomical, <2 = pinched
  pinchFront?: number; // optional sternum/shin ridge pinch along -Z
  foldAmp?: number; // subtle cloth fold amplitude
  foldFreq?: number; // cloth fold harmonic frequency
  foldPhase?: number;
  /** Real 3D accordion cloth bunching amplitude (wrinkled leather sleeves, bunched denim knees/ankles) */
  wrinkleAmp?: number;
  wrinkleTilt?: number; // diagonal tilt of cloth tension fold around circumference
}

/**
 * Generates a high-density, Blender-SubSurf-style anatomical lofted BufferGeometry
 * with optional real 3D vertex-displaced cloth wrinkles & tension creases so sleeves,
 * leather jackets, and tactical jeans show genuine organic fabric folds in silhouette!
 */
export function createLoftedAnatomy(
  slices: LoftSlice[],
  radialSegments = 26,
  capBottom = true,
  capTop = true
): THREE.BufferGeometry {
  const numRings = slices.length;
  const cols = radialSegments + 1;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const yMin = slices[0].y;
  const yMax = slices[numRings - 1].y;
  const ySpan = Math.max(1e-5, yMax - yMin);

  for (let r = 0; r < numRings; r++) {
    const s = slices[r];
    const v = (s.y - yMin) / ySpan;
    const ox = s.offsetX ?? 0;
    const oz = s.offsetZ ?? 0;
    const frontScale = s.frontScale ?? 1;
    const backScale = s.backScale ?? 1;
    const sq = s.squareness ?? 2.0;
    const pinch = s.pinchFront ?? 0;
    const foldAmp = s.foldAmp ?? 0;
    const foldFreq = s.foldFreq ?? 4;
    const foldPhase = s.foldPhase ?? 0;
    const wrinkleAmp = s.wrinkleAmp ?? 0;
    const wrinkleTilt = s.wrinkleTilt ?? 0;

    for (let c = 0; c <= radialSegments; c++) {
      const u = c / radialSegments;
      const theta = u * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const exp = 2 / sq;
      const sx = Math.sign(cosT) * Math.pow(Math.abs(cosT), exp);
      const sz = Math.sign(sinT) * Math.pow(Math.abs(sinT), exp);

      const zScale = sinT < 0 ? frontScale : backScale;

      // Multi-harmonic radial drapery folds + diagonal accordion cloth ridges
      let fold = 1;
      if (foldAmp > 0) {
        fold +=
          Math.sin(theta * foldFreq + foldPhase) * foldAmp +
          Math.sin(theta * (foldFreq * 2 - 1) - foldPhase * 1.4) * foldAmp * 0.38;
      }
      if (wrinkleAmp > 0) {
        // Organic asymmetric multi-harmonic tailored cloth bunching (no uniform corrugated rings!)
        const ridge =
          Math.sin(v * Math.PI * 4.5 + Math.cos(theta + wrinkleTilt) * 1.9) * 0.52 +
          Math.sin(v * Math.PI * 7.5 - Math.sin(theta * 2 - wrinkleTilt) * 1.4) * 0.3 +
          Math.cos(theta * 3 + v * 5.2 + wrinkleTilt) * 0.18;
        fold += ridge * wrinkleAmp * 0.62;
      }

      const frontFactor = sinT < 0 ? Math.pow(-sinT, 4) * pinch : 0;

      const x = ox + sx * s.rx * fold;
      const yOffset = wrinkleAmp > 0 ? Math.sin(theta * 2 + wrinkleTilt) * wrinkleAmp * 0.008 : 0;
      const z = oz + (sz * s.rz * zScale - frontFactor) * fold;

      positions.push(x, s.y + yOffset, z);
      uvs.push(u, v);
    }
  }

  for (let r = 0; r < numRings - 1; r++) {
    const rowA = r * cols;
    const rowB = (r + 1) * cols;
    for (let c = 0; c < radialSegments; c++) {
      const a = rowA + c;
      const b = rowA + c + 1;
      const d = rowB + c;
      const e = rowB + c + 1;
      indices.push(a, d, b);
      indices.push(b, d, e);
    }
  }

  if (capBottom && slices[0].rx > 1e-4 && slices[0].rz > 1e-4) {
    const centerIdx = positions.length / 3;
    positions.push(slices[0].offsetX ?? 0, slices[0].y, slices[0].offsetZ ?? 0);
    uvs.push(0.5, 0);
    for (let c = 0; c < radialSegments; c++) {
      indices.push(centerIdx, c + 1, c);
    }
  }

  if (capTop && slices[numRings - 1].rx > 1e-4 && slices[numRings - 1].rz > 1e-4) {
    const centerIdx = positions.length / 3;
    const top = slices[numRings - 1];
    positions.push(top.offsetX ?? 0, top.y, top.offsetZ ?? 0);
    uvs.push(0.5, 1);
    const lastRow = (numRings - 1) * cols;
    for (let c = 0; c < radialSegments; c++) {
      indices.push(centerIdx, lastRow + c, lastRow + c + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Generates a curved contoured armor shell / visor / wrinkled leather jacket panel
 * with optional subtle cloth crease displacement along the outer surface.
 */
export function createCurvedPanelGeometry(
  slices: Array<{
    y: number;
    rx: number;
    rz: number;
    thickness: number;
    offsetZ?: number;
    creaseAmp?: number;
  }>,
  angleStart: number,
  angleEnd: number,
  arcSegments = 20
): THREE.BufferGeometry {
  const numRings = slices.length;
  const cols = arcSegments + 1;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const yMin = slices[0].y;
  const ySpan = Math.max(1e-5, slices[numRings - 1].y - yMin);
  const ringVerts = numRings * cols;

  for (let side = 0; side < 2; side++) {
    const isOuter = side === 0;
    for (let r = 0; r < numRings; r++) {
      const s = slices[r];
      const v = (s.y - yMin) / ySpan;
      const radAdd = isOuter ? s.thickness * 0.5 : -s.thickness * 0.5;
      const oz = s.offsetZ ?? 0;
      const cAmp = isOuter ? (s.creaseAmp ?? 0) : 0;

      for (let c = 0; c <= arcSegments; c++) {
        const u = c / arcSegments;
        const theta = angleStart + (angleEnd - angleStart) * u;
        const crease =
          cAmp > 0
            ? (Math.sin(theta * 5 + v * 9) * 0.6 + Math.sin(theta * 11 - v * 14) * 0.4) * cAmp
            : 0;
        const x = Math.cos(theta) * (s.rx + radAdd + crease);
        const z = oz + Math.sin(theta) * (s.rz + radAdd + crease);
        positions.push(x, s.y, z);
        uvs.push(u, v);
      }
    }
  }

  for (let r = 0; r < numRings - 1; r++) {
    for (let c = 0; c < arcSegments; c++) {
      const a = r * cols + c;
      const b = a + 1;
      const d = (r + 1) * cols + c;
      const e = d + 1;
      indices.push(a, d, b, b, d, e);
    }
  }

  for (let r = 0; r < numRings - 1; r++) {
    for (let c = 0; c < arcSegments; c++) {
      const a = ringVerts + r * cols + c;
      const b = a + 1;
      const d = ringVerts + (r + 1) * cols + c;
      const e = d + 1;
      indices.push(a, b, d, b, e, d);
    }
  }

  for (let r = 0; r < numRings - 1; r++) {
    const o0 = r * cols;
    const o1 = (r + 1) * cols;
    const i0 = ringVerts + o0;
    const i1 = ringVerts + o1;
    indices.push(o0, i0, o1, o1, i0, i1);

    const oe0 = r * cols + arcSegments;
    const oe1 = (r + 1) * cols + arcSegments;
    const ie0 = ringVerts + oe0;
    const ie1 = ringVerts + oe1;
    indices.push(oe0, oe1, ie0, oe1, ie1, ie0);
  }

  for (let c = 0; c < arcSegments; c++) {
    const ob0 = c;
    const ob1 = c + 1;
    const ib0 = ringVerts + c;
    const ib1 = ringVerts + c + 1;
    indices.push(ob0, ob1, ib0, ob1, ib1, ib0);

    const topOff = (numRings - 1) * cols;
    const ot0 = topOff + c;
    const ot1 = topOff + c + 1;
    const it0 = ringVerts + ot0;
    const it1 = ringVerts + ot1;
    indices.push(ot0, it0, ot1, ot1, it0, it1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function createStrapTube(
  points: THREE.Vector3[],
  radius = 0.011,
  _scaleZ = 0.45,
  segments = 24
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, segments, radius, 8, false);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Blender-Style Shrinkwrap + Solidify + 45° Chamfer Bevel Hard-Surface Armor Plate Builder!
 *
 * Takes an arbitrary 2D stealth armor polygon `contour` in `(u, v)` surface coordinates
 * (e.g. `(angleRad, yMeters)` wrapped around an anatomical torso/shoulder/shin/helmet shell),
 * conforms it seamlessly onto `mapSurface(u, v, normalOffset)`, and builds:
 * - A subdivided curved outer face (follows body curvature cleanly without flat facets)
 * - Crisp 45° chamfered bevel edges that catch AAA studio rim highlights!
 * - A flush base skirt seating directly onto the tactical undersuit (ZERO floating gaps!)
 * - Optional crisp hard-edge shading via split vertices on bevel seams!
 */
export function createContouredArmorPlate(
  contour: Array<[number, number]>,
  mapSurface: (u: number, v: number, offset: number) => [number, number, number],
  thickness = 0.014,
  bevelInset = 0.14,
  bevelHeight = 0.0055,
  edgeSubdivs = 3
): THREE.BufferGeometry {
  // 1. Subdivide polygon edges so curved armor follows body arcs smoothly!
  const pts: Array<[number, number]> = [];
  const nRaw = contour.length;
  for (let i = 0; i < nRaw; i++) {
    const a = contour[i];
    const b = contour[(i + 1) % nRaw];
    for (let s = 0; s < edgeSubdivs; s++) {
      const f = s / edgeSubdivs;
      pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
    }
  }
  const n = pts.length;

  // Compute centroid & bounding box for clean UVs and inward chamfer shrink
  let cu = 0;
  let cv = 0;
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (let i = 0; i < n; i++) {
    cu += pts[i][0];
    cv += pts[i][1];
    if (pts[i][0] < minU) minU = pts[i][0];
    if (pts[i][0] > maxU) maxU = pts[i][0];
    if (pts[i][1] < minV) minV = pts[i][1];
    if (pts[i][1] > maxV) maxV = pts[i][1];
  }
  cu /= n;
  cv /= n;
  const spanU = Math.max(1e-4, maxU - minU);
  const spanV = Math.max(1e-4, maxV - minV);

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  const computeSmoothNormal = (u: number, v: number, off: number): [number, number, number] => {
    const p0 = mapSurface(u, v, off);
    const p1 = mapSurface(u, v, off + 0.006);
    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    const dz = p1[2] - p0[2];
    const len = Math.hypot(dx, dy, dz) || 1;
    return [dx / len, dy / len, dz / len];
  };

  const computeFlatNormal = (
    p0: [number, number, number],
    p1: [number, number, number],
    p2: [number, number, number]
  ): [number, number, number] => {
    const ux = p1[0] - p0[0];
    const uy = p1[1] - p0[1];
    const uz = p1[2] - p0[2];
    const vx = p2[0] - p0[0];
    const vy = p2[1] - p0[1];
    const vz = p2[2] - p0[2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    return [nx / len, ny / len, nz / len];
  };

  const pushTriSmooth = (
    p0: [number, number, number],
    p1: [number, number, number],
    p2: [number, number, number],
    n0: [number, number, number],
    n1: [number, number, number],
    n2: [number, number, number],
    uv0: [number, number],
    uv1: [number, number],
    uv2: [number, number]
  ) => {
    positions.push(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]);
    normals.push(n0[0], n0[1], n0[2], n1[0], n1[1], n1[2], n2[0], n2[1], n2[2]);
    uvs.push(uv0[0], uv0[1], uv1[0], uv1[1], uv2[0], uv2[1]);
  };

  const pushTriFlat = (
    p0: [number, number, number],
    p1: [number, number, number],
    p2: [number, number, number],
    uv0: [number, number],
    uv1: [number, number],
    uv2: [number, number]
  ) => {
    const fn = computeFlatNormal(p0, p1, p2);
    pushTriSmooth(p0, p1, p2, fn, fn, fn, uv0, uv1, uv2);
  };

  const toUV = (u: number, v: number): [number, number] => [
    (u - minU) / spanU,
    (v - minV) / spanV,
  ];

  // Build concentric rings:
  // Ring 0 (base): sits flush at offset = -0.0025 (tucked gently into undersuit)
  // Ring 1 (shoulder of bevel): sits at outer contour, offset = thickness - bevelHeight
  // Ring 2 (top chamfer edge): inset by `bevelInset` toward centroid, offset = thickness
  // Ring 3 (mid dome): inset 0.55 toward centroid, offset = thickness + 0.0022
  // Center: centroid at offset = thickness + 0.003
  const ringBase: Array<[number, number, number]> = [];
  const ringMid: Array<[number, number, number]> = [];
  const ringTop: Array<[number, number, number]> = [];
  const ringInner: Array<[number, number, number]> = [];
  const normTop: Array<[number, number, number]> = [];
  const normInner: Array<[number, number, number]> = [];
  const uvBase: Array<[number, number]> = [];
  const uvTop: Array<[number, number]> = [];
  const uvInner: Array<[number, number]> = [];

  for (let i = 0; i < n; i++) {
    const [u, v] = pts[i];
    const tu = u + (cu - u) * bevelInset;
    const tv = v + (cv - v) * bevelInset;
    const iu = u + (cu - u) * 0.55;
    const iv = v + (cv - v) * 0.55;

    ringBase.push(mapSurface(u, v, -0.0025));
    ringMid.push(mapSurface(u, v, Math.max(0.001, thickness - bevelHeight)));
    ringTop.push(mapSurface(tu, tv, thickness));
    ringInner.push(mapSurface(iu, iv, thickness + 0.002));

    normTop.push(computeSmoothNormal(tu, tv, thickness));
    normInner.push(computeSmoothNormal(iu, iv, thickness + 0.002));

    uvBase.push(toUV(u, v));
    uvTop.push(toUV(tu, tv));
    uvInner.push(toUV(iu, iv));
  }
  const centerPos = mapSurface(cu, cv, thickness + 0.0028);
  const centerNorm = computeSmoothNormal(cu, cv, thickness + 0.0028);
  const centerUV = toUV(cu, cv);

  // Check surface winding using center vs first triangle so outward normal ALWAYS faces +offset!
  const cOut = mapSurface(cu, cv, thickness + 0.02);
  const nRef = new THREE.Vector3(
    cOut[0] - centerPos[0],
    cOut[1] - centerPos[1],
    cOut[2] - centerPos[2]
  );
  const vA = new THREE.Vector3(...ringTop[0]).sub(new THREE.Vector3(...centerPos));
  const vB = new THREE.Vector3(...ringTop[1]).sub(new THREE.Vector3(...centerPos));
  const flipWinding = vA.cross(vB).dot(nRef) < 0;

  const emitFlatQuad = (
    p0: [number, number, number],
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number],
    u0: [number, number],
    u1: [number, number],
    u2: [number, number],
    u3: [number, number]
  ) => {
    if (flipWinding) {
      pushTriFlat(p0, p3, p2, u0, u3, u2);
      pushTriFlat(p0, p2, p1, u0, u2, u1);
    } else {
      pushTriFlat(p0, p1, p2, u0, u1, u2);
      pushTriFlat(p0, p2, p3, u0, u2, u3);
    }
  };

  const emitSmoothQuad = (
    p0: [number, number, number],
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number],
    n0: [number, number, number],
    n1: [number, number, number],
    n2: [number, number, number],
    n3: [number, number, number],
    u0: [number, number],
    u1: [number, number],
    u2: [number, number],
    u3: [number, number]
  ) => {
    if (flipWinding) {
      pushTriSmooth(p0, p3, p2, n0, n3, n2, u0, u3, u2);
      pushTriSmooth(p0, p2, p1, n0, n2, n1, u0, u2, u1);
    } else {
      pushTriSmooth(p0, p1, p2, n0, n1, n2, u0, u1, u2);
      pushTriSmooth(p0, p2, p3, n0, n2, n3, u0, u2, u3);
    }
  };

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    // Vertical base skirt (crisp flat facet normal!)
    emitFlatQuad(ringBase[i], ringBase[j], ringMid[j], ringMid[i], uvBase[i], uvBase[j], uvBase[j], uvBase[i]);
    // 45° Chamfer Bevel Skirt (crisp studio edge rim highlight!)
    emitFlatQuad(ringMid[i], ringMid[j], ringTop[j], ringTop[i], uvBase[i], uvBase[j], uvTop[j], uvTop[i]);
    // Sculpted Top Face outer ring -> inner ring (BUTTER-SMOOTH analytical surface normals!)
    emitSmoothQuad(
      ringTop[i],
      ringTop[j],
      ringInner[j],
      ringInner[i],
      normTop[i],
      normTop[j],
      normInner[j],
      normInner[i],
      uvTop[i],
      uvTop[j],
      uvInner[j],
      uvInner[i]
    );
    // Inner ring -> center crown (BUTTER-SMOOTH analytical surface normals!)
    if (flipWinding) {
      pushTriSmooth(
        centerPos,
        ringInner[j],
        ringInner[i],
        centerNorm,
        normInner[j],
        normInner[i],
        centerUV,
        uvInner[j],
        uvInner[i]
      );
    } else {
      pushTriSmooth(
        centerPos,
        ringInner[i],
        ringInner[j],
        centerNorm,
        normInner[i],
        normInner[j],
        centerUV,
        uvInner[i],
        uvInner[j]
      );
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  return geo;
}

/**
 * Builds a chamfered, beveled hard-surface tactical pouch / housing box
 * (replaces sharp raw BoxGeometry cubes with authentic AAA beveled silhouettes!).
 */
export function createBeveledBox(
  width: number,
  height: number,
  depth: number,
  bevel = 0.006
): THREE.BufferGeometry {
  const b = Math.min(bevel, width * 0.25, height * 0.25, depth * 0.25);
  const hw = width * 0.5 - b;
  const hh = height * 0.5 - b;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, -hh);
  shape.lineTo(hw, -hh);
  shape.lineTo(hw, hh);
  shape.lineTo(-hw, hh);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.002, depth - b * 2),
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 2,
  });
  geo.center();
  // Convert to non-indexed/consistent attribute layout cleanly
  const out = geo.index ? geo.toNonIndexed() : geo;
  out.computeVertexNormals();
  return out;
}

/**
 * Builds an articulated, anatomically sculpted 5-finger gloved or cybernetic hand.
 * Local frame: wrist at y=0, fingers extend down along -Y, palm faces +Z, back/knuckles face -Z.
 */
export function createSculptedHand(
  side: -1 | 1,
  palmMat: THREE.Material,
  knuckleMat: THREE.Material,
  fingerMat: THREE.Material
): THREE.Group {
  const hand = new THREE.Group();

  const palmGeo = createLoftedAnatomy(
    [
      { y: 0.016, rx: 0.031, rz: 0.024, squareness: 2.3 },
      { y: -0.006, rx: 0.035, rz: 0.023, squareness: 2.4 },
      { y: -0.042, rx: 0.041, rz: 0.022, squareness: 2.65 },
      { y: -0.084, rx: 0.039, rz: 0.018, squareness: 2.85 },
    ],
    16
  );
  const palm = new THREE.Mesh(palmGeo, palmMat);
  palm.castShadow = true;
  hand.add(palm);

  // Sleek low-profile molded carbon knuckle pad seated flush across dorsal -Z surface
  const knuckleGuard = new THREE.Mesh(
    createBeveledBox(0.056, 0.014, 0.008, 0.003),
    knuckleMat
  );
  knuckleGuard.position.set(0, -0.072, -0.016);
  hand.add(knuckleGuard);

  // Anatomically packed gloved fingers with natural knuckle arch & progressive curl toward palm (+Z)
  const fingerSpecs = [
    { x: -side * 0.024, y: -0.082, len1: 0.036, len2: 0.029, r: 0.0092, curl1: 0.28, curl2: 0.56 },
    { x: -side * 0.008, y: -0.085, len1: 0.04, len2: 0.032, r: 0.0094, curl1: 0.36, curl2: 0.66 },
    { x: side * 0.008, y: -0.083, len1: 0.037, len2: 0.029, r: 0.009, curl1: 0.44, curl2: 0.72 },
    { x: side * 0.023, y: -0.079, len1: 0.03, len2: 0.024, r: 0.0082, curl1: 0.52, curl2: 0.78 },
  ];

  for (const f of fingerSpecs) {
    const fBase = new THREE.Group();
    fBase.position.set(f.x, f.y, 0.002);
    fBase.rotation.x = -f.curl1;
    hand.add(fBase);

    const seg1 = new THREE.Mesh(
      new THREE.CapsuleGeometry(f.r, f.len1 * 0.62, 4, 8),
      fingerMat
    );
    seg1.position.y = -f.len1 * 0.48;
    fBase.add(seg1);

    const fTip = new THREE.Group();
    fTip.position.set(0, -f.len1 * 0.96, 0);
    fTip.rotation.x = -f.curl2;
    fBase.add(fTip);

    const seg2 = new THREE.Mesh(
      new THREE.CapsuleGeometry(f.r * 0.86, f.len2 * 0.58, 4, 8),
      fingerMat
    );
    seg2.position.y = -f.len2 * 0.46;
    fTip.add(seg2);
  }

  // Opposing thumb anchored on the anterior/palm (+Z) radial side, curving naturally forward & inward
  const thumbBase = new THREE.Group();
  thumbBase.position.set(-side * 0.036, -0.034, 0.012);
  thumbBase.rotation.set(-0.42, -side * 0.36, -side * 0.34);
  hand.add(thumbBase);

  const thumbSeg1 = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.0102, 0.024, 4, 8),
    fingerMat
  );
  thumbSeg1.position.y = -0.017;
  thumbBase.add(thumbSeg1);

  const thumbSeg2 = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.0088, 0.02, 4, 8),
    fingerMat
  );
  thumbSeg2.position.set(side * 0.004, -0.041, 0.007);
  thumbSeg2.rotation.set(-0.48, 0, side * 0.24);
  thumbBase.add(thumbSeg2);

  return hand;
}
