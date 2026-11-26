import * as THREE from 'three';

interface SlashArcSlot {
  active: boolean;
  group: THREE.Group;
  outerMesh: THREE.Mesh;
  bankedMesh: THREE.Mesh;
  innerMesh: THREE.Mesh;
  outerMat: THREE.MeshBasicMaterial;
  bankedMat: THREE.MeshBasicMaterial;
  innerMat: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
  baseScale: number;
  spinSign: number;
}

interface MoltenScarSlot {
  active: boolean;
  group: THREE.Group;
  coreMat: THREE.MeshBasicMaterial;
  glowMat: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
}

interface SparkSlot {
  active: boolean;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  gravity: number;
}

interface PerilGlintSlot {
  active: boolean;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
}

interface MuzzleFlashSlot {
  active: boolean;
  group: THREE.Group;
  coreMat: THREE.MeshBasicMaterial;
  starMat: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
  baseScale: number;
}

interface RailCraterSlot {
  active: boolean;
  group: THREE.Group;
  coreMat: THREE.MeshBasicMaterial;
  ringMat: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
}

const MAX_SLASH_ARCS = 10;
const MAX_MOLTEN_SCARS = 22;
const MAX_SPARKS = 160;
const MAX_GLINTS = 6;
const MAX_MUZZLE_FLASHES = 10;
const MAX_RAIL_CRATERS = 16;

/**
 * Generates a razor-sharp procedural Sekiro / Ghostrunner 4-point diamond Peril Eye-Glint texture:
 * blinding pure-white core + needle-tapered crimson-gold horizontal/vertical flares + soft bloom halo.
 */
function createPerilGlintTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const cx = size * 0.5;
  const cy = size * 0.5;
  ctx.clearRect(0, 0, size, size);

  // Soft outer radial bloom (monochrome white so mat.color tints accurately to crimson, gold, or cyan!)
  const halo = ctx.createRadialGradient(cx, cy, 2, cx, cy, size * 0.44);
  halo.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  halo.addColorStop(0.14, 'rgba(255, 255, 255, 0.92)');
  halo.addColorStop(0.32, 'rgba(255, 255, 255, 0.45)');
  halo.addColorStop(0.65, 'rgba(255, 255, 255, 0.1)');
  halo.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);

  const drawNeedle = (angle: number, halfLen: number, halfWid: number, alphaStr: string) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    const grad = ctx.createLinearGradient(-halfLen, 0, halfLen, 0);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
    grad.addColorStop(0.32, alphaStr);
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.68, alphaStr);
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-halfLen, 0);
    ctx.quadraticCurveTo(0, -halfWid, halfLen, 0);
    ctx.quadraticCurveTo(0, halfWid, -halfLen, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // Dramatic wide horizontal anamorphic glint needle + sharp vertical diamond cross
  drawNeedle(0, size * 0.49, 9.5, 'rgba(255, 255, 255, 0.88)');
  drawNeedle(0, size * 0.42, 3.6, 'rgba(255, 255, 255, 0.98)');
  drawNeedle(Math.PI / 2, size * 0.34, 7.5, 'rgba(255, 255, 255, 0.82)');
  drawNeedle(Math.PI / 2, size * 0.28, 2.8, 'rgba(255, 255, 255, 0.95)');
  drawNeedle(Math.PI / 4, size * 0.19, 4.2, 'rgba(255, 255, 255, 0.62)');
  drawNeedle(-Math.PI / 4, size * 0.19, 4.2, 'rgba(255, 255, 255, 0.62)');

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates a procedural radial plasma slash-wave CanvasTexture (UV u=arc sweep, v=radial edge):
 * razor-bright white-hot leading outer rim + streaked crimson-amber plasma wake tapering softly at tips!
 */
function createSlashCrescentTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const w = 512;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, w, h);

  // Horizontal sweep fade (tapered sharp tips at u=0 and u=1, blazing peak near u=0.68)
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    // v = 0 inner trailing wake -> v = 1 outer razor blade edge
    const v = y / (h - 1);
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1);
      // Taper along arc length (sharp needle tail at u=0, fierce leading tip at u=1)
      const arcEnv = Math.sin(Math.pow(u, 0.72) * Math.PI);
      const streak =
        0.72 +
        0.28 * Math.sin(u * 26 + v * 12) * Math.cos(u * 13 - v * 9) +
        0.16 * Math.sin(v * 32 + u * 8);

      // Radial profile: sharp bright rim near v=0.88, silky flame wake trailing down to v=0.05
      const outerFade = v > 0.92 ? Math.max(0, 1 - (v - 0.92) / 0.08) : 1;
      const innerWake = Math.pow(Math.max(0, v), 1.45) * streak;
      const rimHot = Math.exp(-Math.pow((v - 0.86) / 0.11, 2));

      const alpha = Math.max(0, Math.min(1, arcEnv * outerFade * (innerWake * 0.85 + rimHot * 0.95)));

      // Color blend: deep crimson wake -> molten orange-red -> blazing white-gold cutting edge
      const r = Math.min(255, Math.round(255 * (0.95 + rimHot * 0.05)));
      const g = Math.min(255, Math.round(40 + innerWake * 60 + rimHot * 210));
      const b = Math.min(255, Math.round(64 + rimHot * 185));

      const idx = (y * w + x) * 4;
      d[idx] = r;
      d[idx + 1] = g;
      d[idx + 2] = b;
      d[idx + 3] = Math.round(alpha * 255);
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds a swept curved ribbon BufferGeometry with clean polar UVs (u=angle along arc, v=inner->outer radius)
 * and slight vertical arch camber so the slash wave reads volumetrically from EVERY camera angle!
 */
function createSweptSlashRibbonGeo(
  innerR: number,
  outerR: number,
  arcStart: number,
  arcSweep: number,
  segments: number,
  verticalCamber = 0.09
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const angle = arcStart + arcSweep * u;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    // Taper crescent width smoothly toward the tips for a true curved blade-moon silhouette!
    const tipPinch = Math.sin(u * Math.PI);
    const rIn = outerR - (outerR - innerR) * (0.28 + 0.72 * tipPinch);
    const rOut = outerR;
    const yLift = Math.sin(u * Math.PI) * verticalCamber;

    // Inner wake vertex (v = 0)
    positions.push(cosA * rIn, -yLift * 0.35, sinA * rIn);
    uvs.push(u, 0);
    // Outer razor rim vertex (v = 1)
    positions.push(cosA * rOut, yLift, sinA * rOut);
    uvs.push(u, 1);
  }

  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, b, c, b, d, c);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Shared AAA Enemy Combat VFX Engine:
 * - Sculpted dual-layer 3D swept crescent plasma katana slash waves (Sekiro / MGR / Ghostrunner style)
 * - Incandescent molten wall/pillar/floor slash scars that cool over 5s + bouncing molten sparks
 * - Crisp 4-point Sekiro radial diamond Peril Eye-Glint starburst (never clips into armor!)
 * - Directional booster jet spark bursts & solid-surface projectile impact sparks
 * Zero per-frame allocations!
 */
export class EnemyCombatVfxPool {
  public readonly group = new THREE.Group();

  private readonly slashArcs: SlashArcSlot[] = [];
  private readonly moltenScars: MoltenScarSlot[] = [];
  private readonly sparks: SparkSlot[] = [];
  private readonly glints: PerilGlintSlot[] = [];
  private readonly muzzleFlashes: MuzzleFlashSlot[] = [];
  private readonly railCraters: RailCraterSlot[] = [];

  private readonly flashLight: THREE.PointLight;
  private flashTimer = 0;

  private readonly arcOuterGeo: THREE.BufferGeometry;
  private readonly arcInnerGeo: THREE.BufferGeometry;
  private readonly scarCoreGeo: THREE.PlaneGeometry;
  private readonly scarGlowGeo: THREE.PlaneGeometry;
  private readonly sparkGeo: THREE.BoxGeometry;
  private readonly glintGeo: THREE.PlaneGeometry;
  private readonly muzzleConeGeo: THREE.ConeGeometry;
  private readonly craterCoreGeo: THREE.CircleGeometry;
  private readonly craterRingGeo: THREE.RingGeometry;
  private readonly glintTex: THREE.CanvasTexture | null;
  private readonly slashTex: THREE.CanvasTexture | null;

  private readonly tmpZ = new THREE.Vector3(0, 0, 1);
  private readonly tmpQuat = new THREE.Quaternion();
  private readonly tmpMat4 = new THREE.Matrix4();
  private readonly tmpRight = new THREE.Vector3();
  private readonly tmpTangent = new THREE.Vector3();
  private readonly tmpVelDir = new THREE.Vector3();

  constructor() {
    this.glintTex = createPerilGlintTexture();
    this.slashTex = createSlashCrescentTexture();

    // 1. Sculpted 3D swept crescent blade-wave ribbons (polar UVs + volumetric camber!)
    this.arcOuterGeo = createSweptSlashRibbonGeo(0.42, 1.04, -Math.PI * 0.92, Math.PI * 1.12, 28, 0.14);
    this.arcInnerGeo = createSweptSlashRibbonGeo(0.78, 1.03, -Math.PI * 0.86, Math.PI * 1.02, 24, 0.08);

    for (let i = 0; i < MAX_SLASH_ARCS; i++) {
      const grp = new THREE.Group();
      grp.visible = false;
      const outerMat = new THREE.MeshBasicMaterial({
        color: 0xff2846,
        map: this.slashTex ?? undefined,
        transparent: true,
        opacity: 0.94,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const bankedMat = new THREE.MeshBasicMaterial({
        color: 0xff5a22,
        map: this.slashTex ?? undefined,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const innerMat = new THREE.MeshBasicMaterial({
        color: 0xfff8ee,
        map: this.slashTex ?? undefined,
        transparent: true,
        opacity: 0.98,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const outerMesh = new THREE.Mesh(this.arcOuterGeo, outerMat);
      // Secondary banked crescent ribbon gives genuine 3D thickness from low & eye-level angles!
      const bankedMesh = new THREE.Mesh(this.arcOuterGeo, bankedMat);
      bankedMesh.rotation.x = 0.34;
      bankedMesh.rotation.z = -0.18;
      bankedMesh.scale.setScalar(0.95);

      const innerMesh = new THREE.Mesh(this.arcInnerGeo, innerMat);
      innerMesh.position.y = 0.025;
      grp.add(outerMesh, bankedMesh, innerMesh);
      this.group.add(grp);

      this.slashArcs.push({
        active: false,
        group: grp,
        outerMesh,
        bankedMesh,
        innerMesh,
        outerMat,
        bankedMat,
        innerMat,
        life: 0,
        maxLife: 0.3,
        baseScale: 1.5,
        spinSign: 1,
      });
    }

    // 2. Molten wall / cover / floor katana slash scar decals (blazing core + outer sear)
    this.scarCoreGeo = new THREE.PlaneGeometry(1.22, 0.052);
    this.scarGlowGeo = new THREE.PlaneGeometry(1.42, 0.2);
    for (let i = 0; i < MAX_MOLTEN_SCARS; i++) {
      const grp = new THREE.Group();
      grp.visible = false;

      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xff3b18,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
        blending: THREE.AdditiveBlending,
      });
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xfff3d6,
        transparent: true,
        opacity: 0.98,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
        blending: THREE.AdditiveBlending,
      });

      const glowMesh = new THREE.Mesh(this.scarGlowGeo, glowMat);
      const coreMesh = new THREE.Mesh(this.scarCoreGeo, coreMat);
      coreMesh.position.z = 0.006;
      grp.add(glowMesh, coreMesh);
      this.group.add(grp);

      this.moltenScars.push({
        active: false,
        group: grp,
        coreMat,
        glowMat,
        life: 0,
        maxLife: 4.8,
      });
    }

    // 3. Cascading high-velocity molten steel/concrete impact sparks & booster embers
    this.sparkGeo = new THREE.BoxGeometry(0.022, 0.022, 0.2);
    for (let i = 0; i < MAX_SPARKS; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffb84d,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(this.sparkGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);

      this.sparks.push({
        active: false,
        mesh,
        mat,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.55,
        gravity: 13.5,
      });
    }

    // 4. Razor-sharp Sekiro / Cyberpunk 4-point diamond Peril Eye-Glint starburst (depthTest: false!)
    this.glintGeo = new THREE.PlaneGeometry(1.48, 1.48);
    for (let i = 0; i < MAX_GLINTS; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: this.glintTex ?? undefined,
        transparent: true,
        opacity: 1.0,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(this.glintGeo, mat);
      mesh.visible = false;
      mesh.renderOrder = 25;
      this.group.add(mesh);

      this.glints.push({
        active: false,
        mesh,
        mat,
        life: 0,
        maxLife: 0.46,
      });
    }

    // 5. 3D Volumetric Muzzle Flash Starbursts (axial forward spike + twin side brake plumes!)
    this.muzzleConeGeo = new THREE.ConeGeometry(0.11, 0.56, 8, 1, true);
    this.muzzleConeGeo.rotateX(Math.PI / 2);
    this.muzzleConeGeo.translate(0, 0, 0.28);

    for (let i = 0; i < MAX_MUZZLE_FLASHES; i++) {
      const grp = new THREE.Group();
      grp.visible = false;
      const starMat = new THREE.MeshBasicMaterial({
        color: 0xff8c24,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xfff8e0,
        transparent: true,
        opacity: 0.98,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const fwdPlume = new THREE.Mesh(this.muzzleConeGeo, starMat);
      const fwdCore = new THREE.Mesh(this.muzzleConeGeo, coreMat);
      fwdCore.scale.set(0.55, 0.55, 0.72);
      const sideL = new THREE.Mesh(this.muzzleConeGeo, starMat);
      sideL.rotation.y = Math.PI * 0.42;
      sideL.scale.set(0.65, 0.65, 0.52);
      const sideR = new THREE.Mesh(this.muzzleConeGeo, starMat);
      sideR.rotation.y = -Math.PI * 0.42;
      sideR.scale.set(0.65, 0.65, 0.52);
      grp.add(fwdPlume, fwdCore, sideL, sideR);
      this.group.add(grp);

      this.muzzleFlashes.push({
        active: false,
        group: grp,
        coreMat,
        starMat,
        life: 0,
        maxLife: 0.09,
        baseScale: 1,
      });
    }

    // 6. Glowing Molten Railgun Impact Craters (stamped flush on walls/cover/floors!)
    this.craterCoreGeo = new THREE.CircleGeometry(0.16, 16);
    this.craterRingGeo = new THREE.RingGeometry(0.15, 0.34, 20);
    for (let i = 0; i < MAX_RAIL_CRATERS; i++) {
      const grp = new THREE.Group();
      grp.visible = false;
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xff5a1f,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
        blending: THREE.AdditiveBlending,
      });
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xfff6dc,
        transparent: true,
        opacity: 0.98,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
        blending: THREE.AdditiveBlending,
      });
      const ringMesh = new THREE.Mesh(this.craterRingGeo, ringMat);
      const coreMesh = new THREE.Mesh(this.craterCoreGeo, coreMat);
      coreMesh.position.z = 0.006;
      grp.add(ringMesh, coreMesh);
      this.group.add(grp);

      this.railCraters.push({
        active: false,
        group: grp,
        coreMat,
        ringMat,
        life: 0,
        maxLife: 5.2,
      });
    }

    // Dynamic molten impact flash point light (single pooled light for zero perf hit)
    this.flashLight = new THREE.PointLight(0xff4a1c, 0, 10.5, 1.8);
    this.group.add(this.flashLight);
  }

  /**
   * Spawns a dramatic sweeping 3D plasma katana slash crescent wave.
   */
  public spawnBladeSlashArc(
    origin: THREE.Vector3,
    yaw: number,
    tiltRoll: number,
    tiltPitch: number,
    radius: number,
    colorHex: number,
    heavy = false,
    spinSign = 1
  ): void {
    let slot = this.slashArcs.find((s) => !s.active);
    if (!slot) slot = this.slashArcs[0];
    slot.active = true;
    slot.life = 0;
    slot.maxLife = heavy ? 0.36 : 0.25;
    slot.baseScale = radius;
    slot.spinSign = spinSign;
    slot.outerMat.color.setHex(colorHex);
    slot.outerMat.opacity = heavy ? 0.96 : 0.86;
    slot.bankedMat.opacity = heavy ? 0.78 : 0.6;
    slot.innerMat.opacity = 1.0;

    slot.group.position.copy(origin);
    slot.group.rotation.set(0, 0, 0);
    slot.group.rotation.order = 'YXZ';
    slot.group.rotation.y = yaw;
    slot.group.rotation.x = tiltPitch;
    slot.group.rotation.z = tiltRoll;
    slot.outerMesh.rotation.y = 0;
    slot.bankedMesh.rotation.y = 0;
    slot.innerMesh.rotation.y = 0;
    slot.group.scale.set(radius * 0.84, radius * 0.55, radius * 0.84);
    slot.group.visible = true;

    this.triggerFlash(origin, colorHex, heavy ? 6.0 : 3.5, 0.16);
  }

  /**
   * Stamps an incandescent molten thermal katana slash scar flush onto a wall, cover block, or floor
   * AND erupts a massive AAA cascading shower of bouncing molten steel/concrete sparks!
   */
  public spawnSurfaceSlashScar(
    hitPos: THREE.Vector3,
    hitNormal: THREE.Vector3,
    slashDir: THREE.Vector3,
    heavy = false
  ): void {
    let slot = this.moltenScars.find((s) => !s.active);
    if (!slot) {
      slot = this.moltenScars.reduce((a, b) => (a.life > b.life ? a : b));
    }
    slot.active = true;
    slot.life = 0;
    slot.maxLife = heavy ? 6.0 : 4.4;

    this.tmpTangent.copy(slashDir).addScaledVector(hitNormal, -slashDir.dot(hitNormal));
    if (this.tmpTangent.lengthSq() < 1e-4) {
      this.tmpTangent.set(1, 0, 0).addScaledVector(hitNormal, -hitNormal.x);
      if (this.tmpTangent.lengthSq() < 1e-4) this.tmpTangent.set(0, 0, 1);
    }
    this.tmpTangent.normalize();
    this.tmpRight.crossVectors(hitNormal, this.tmpTangent).normalize();
    this.tmpMat4.makeBasis(this.tmpTangent, this.tmpRight, hitNormal);

    slot.group.position.copy(hitPos).addScaledVector(hitNormal, 0.026);
    slot.group.quaternion.setFromRotationMatrix(this.tmpMat4);
    const lenScale = heavy ? 1.62 : 0.98 + Math.random() * 0.3;
    const widthScale = heavy ? 1.55 : 1.05;
    slot.group.scale.set(lenScale, widthScale, 1);
    slot.coreMat.color.setHex(0xfff6e0);
    slot.coreMat.opacity = 1.0;
    slot.glowMat.color.setHex(0xff3a14);
    slot.glowMat.opacity = 0.96;
    slot.group.visible = true;

    const sparkCount = heavy ? 32 : 20;
    for (let i = 0; i < sparkCount; i++) {
      const along = (Math.random() - 0.5) * 0.92 * lenScale;
      const sx = hitPos.x + this.tmpTangent.x * along + hitNormal.x * 0.04;
      const sy = hitPos.y + this.tmpTangent.y * along + hitNormal.y * 0.04;
      const sz = hitPos.z + this.tmpTangent.z * along + hitNormal.z * 0.04;

      const speed = (heavy ? 5.2 : 3.8) + Math.random() * (heavy ? 7.2 : 5.4);
      const vx =
        hitNormal.x * (0.45 + Math.random() * 0.65) +
        this.tmpTangent.x * (0.35 + (Math.random() - 0.35) * 0.9) +
        (Math.random() - 0.5) * 0.55;
      const vy =
        hitNormal.y * (0.45 + Math.random() * 0.65) +
        this.tmpTangent.y * 0.4 +
        0.38 +
        Math.random() * 0.68;
      const vz =
        hitNormal.z * (0.45 + Math.random() * 0.65) +
        this.tmpTangent.z * (0.35 + (Math.random() - 0.35) * 0.9) +
        (Math.random() - 0.5) * 0.55;

      const color = i % 3 === 0 ? 0xfff0c8 : i % 2 === 0 ? 0xff8c24 : 0xff3218;
      this.spawnSpark(sx, sy, sz, vx, vy, vz, speed, color, heavy ? 0.74 : 0.56, 14.5);
    }

    this.triggerFlash(hitPos, 0xff5a1f, heavy ? 8.5 : 5.5, heavy ? 0.26 : 0.16);
  }

  /**
   * Sharp directional spark burst when an enemy bullet/bolt slams into solid cover, a wall, or a floor.
   */
  public spawnProjectileSurfaceImpact(
    hitPos: THREE.Vector3,
    hitNormal: THREE.Vector3,
    colorHex: number
  ): void {
    for (let i = 0; i < 10; i++) {
      const vx = hitNormal.x * (0.55 + Math.random() * 0.6) + (Math.random() - 0.5) * 0.85;
      const vy = hitNormal.y * (0.55 + Math.random() * 0.6) + 0.25 + Math.random() * 0.55;
      const vz = hitNormal.z * (0.55 + Math.random() * 0.6) + (Math.random() - 0.5) * 0.85;
      this.spawnSpark(
        hitPos.x + hitNormal.x * 0.03,
        hitPos.y + hitNormal.y * 0.03,
        hitPos.z + hitNormal.z * 0.03,
        vx,
        vy,
        vz,
        3.2 + Math.random() * 4.2,
        i % 2 === 0 ? 0xffe4a8 : colorHex,
        0.34,
        13.0
      );
    }
    this.triggerFlash(hitPos, colorHex, 3.2, 0.09);
  }

  /**
   * Blinding 4-point Sekiro / Cyberpunk crimson-gold optical glint flare before an Iaijutsu dash or heavy strike!
   */
  public spawnPerilGlint(worldPos: THREE.Vector3, colorHex = 0xff2848): void {
    let slot = this.glints.find((g) => !g.active);
    if (!slot) slot = this.glints[0];
    slot.active = true;
    slot.life = 0;
    slot.maxLife = 0.52;
    slot.mat.color.setHex(colorHex);
    slot.mat.opacity = 1.0;
    slot.mesh.position.copy(worldPos);
    slot.mesh.scale.setScalar(0.5);
    slot.mesh.visible = true;
    this.triggerFlash(worldPos, colorHex, 5.5, 0.24);
  }

  /**
   * 3D directional enemy muzzle flash plume + compensator brake jets + hot muzzle embers!
   */
  public spawnMuzzleFlash(
    worldPos: THREE.Vector3,
    dir: THREE.Vector3,
    colorHex = 0xff7a24,
    heavy = false
  ): void {
    let slot = this.muzzleFlashes.find((m) => !m.active);
    if (!slot) slot = this.muzzleFlashes[0];
    slot.active = true;
    slot.life = 0;
    slot.maxLife = heavy ? 0.14 : 0.085;
    slot.baseScale = heavy ? 1.65 : 0.92;
    slot.starMat.color.setHex(colorHex);
    slot.starMat.opacity = 0.95;
    slot.coreMat.opacity = 1.0;

    slot.group.position.copy(worldPos);
    this.tmpVelDir.copy(dir).normalize();
    this.tmpQuat.setFromUnitVectors(this.tmpZ, this.tmpVelDir);
    slot.group.quaternion.copy(this.tmpQuat);
    slot.group.rotateZ(Math.random() * Math.PI * 2);
    slot.group.scale.setScalar(slot.baseScale);
    slot.group.visible = true;

    const emberCount = heavy ? 12 : 4;
    for (let i = 0; i < emberCount; i++) {
      this.spawnSpark(
        worldPos.x,
        worldPos.y,
        worldPos.z,
        this.tmpVelDir.x + (Math.random() - 0.5) * 0.55,
        this.tmpVelDir.y + (Math.random() - 0.5) * 0.45 + 0.1,
        this.tmpVelDir.z + (Math.random() - 0.5) * 0.55,
        5.0 + Math.random() * 6.5,
        i % 2 === 0 ? 0xfff0c0 : colorHex,
        heavy ? 0.36 : 0.22,
        8.5
      );
    }
    this.triggerFlash(worldPos, colorHex, heavy ? 7.5 : 4.2, heavy ? 0.14 : 0.07);
  }

  /**
   * Incandescent molten railgun impact crater decal stamped flush onto a wall, cover block, or floor
   * + explosive shower of bouncing white-gold sparks!
   */
  public spawnRailImpactCrater(
    hitPos: THREE.Vector3,
    hitNormal: THREE.Vector3,
    colorHex = 0xff6a1a
  ): void {
    let slot = this.railCraters.find((c) => !c.active);
    if (!slot) slot = this.railCraters.reduce((a, b) => (a.life > b.life ? a : b));
    slot.active = true;
    slot.life = 0;
    slot.maxLife = 5.4;

    this.tmpTangent.set(1, 0, 0).addScaledVector(hitNormal, -hitNormal.x);
    if (this.tmpTangent.lengthSq() < 1e-4) this.tmpTangent.set(0, 0, 1);
    this.tmpTangent.normalize();
    this.tmpRight.crossVectors(hitNormal, this.tmpTangent).normalize();
    this.tmpMat4.makeBasis(this.tmpTangent, this.tmpRight, hitNormal);

    slot.group.position.copy(hitPos).addScaledVector(hitNormal, 0.028);
    slot.group.quaternion.setFromRotationMatrix(this.tmpMat4);
    slot.group.scale.setScalar(1.0 + Math.random() * 0.28);
    slot.coreMat.color.setHex(0xfff8e2);
    slot.coreMat.opacity = 1.0;
    slot.ringMat.color.setHex(colorHex);
    slot.ringMat.opacity = 0.96;
    slot.group.visible = true;

    for (let i = 0; i < 28; i++) {
      const vx = hitNormal.x * (0.55 + Math.random() * 0.75) + (Math.random() - 0.5) * 1.15;
      const vy = hitNormal.y * (0.55 + Math.random() * 0.75) + 0.35 + Math.random() * 0.75;
      const vz = hitNormal.z * (0.55 + Math.random() * 0.75) + (Math.random() - 0.5) * 1.15;
      this.spawnSpark(
        hitPos.x + hitNormal.x * 0.04,
        hitPos.y + hitNormal.y * 0.04,
        hitPos.z + hitNormal.z * 0.04,
        vx,
        vy,
        vz,
        4.5 + Math.random() * 7.5,
        i % 3 === 0 ? 0xfff6d4 : i % 2 === 0 ? 0xffa624 : 0xff3b18,
        0.65,
        14.5
      );
    }
    this.triggerFlash(hitPos, colorHex, 8.5, 0.22);
  }

  /**
   * High-energy dorsal booster thruster exhaust spark stream when dashing, flash-stepping, or leaping!
   */
  public spawnBoosterBurst(
    worldPos: THREE.Vector3,
    exhaustDir: THREE.Vector3,
    colorHex = 0xff6a1a,
    count = 12
  ): void {
    for (let i = 0; i < count; i++) {
      const vx = exhaustDir.x + (Math.random() - 0.5) * 0.55;
      const vy = exhaustDir.y + (Math.random() - 0.5) * 0.45 + 0.1;
      const vz = exhaustDir.z + (Math.random() - 0.5) * 0.55;
      this.spawnSpark(
        worldPos.x,
        worldPos.y,
        worldPos.z,
        vx,
        vy,
        vz,
        3.8 + Math.random() * 5.0,
        i % 3 === 0 ? 0xffe4a8 : colorHex,
        0.34 + Math.random() * 0.18,
        3.5
      );
    }
  }

  public update(dt: number, cameraPos?: THREE.Vector3): void {
    // 1. Update sculpted 3D swept crescent slash waves
    for (let i = 0; i < this.slashArcs.length; i++) {
      const s = this.slashArcs[i];
      if (!s.active) continue;
      s.life += dt;
      if (s.life >= s.maxLife) {
        s.active = false;
        s.group.visible = false;
        continue;
      }
      const p = s.life / s.maxLife;
      const grow = s.baseScale * (0.82 + p * 0.45);
      s.group.scale.set(grow, grow * 0.62, grow);
      s.outerMesh.rotation.y += s.spinSign * dt * 7.2;
      s.bankedMesh.rotation.y += s.spinSign * dt * 6.8;
      s.innerMesh.rotation.y += s.spinSign * dt * 8.4;
      const fade = (1 - p) * (1 - p);
      s.outerMat.opacity = fade * 0.96;
      s.bankedMat.opacity = fade * 0.78;
      s.innerMat.opacity = fade;
    }

    // 2. Cool incandescent molten wall/floor slash scars smoothly
    for (let i = 0; i < this.moltenScars.length; i++) {
      const sc = this.moltenScars[i];
      if (!sc.active) continue;
      sc.life += dt;
      if (sc.life >= sc.maxLife) {
        sc.active = false;
        sc.group.visible = false;
        continue;
      }
      const p = sc.life / sc.maxLife;
      const coreFade = Math.max(0, 1 - p * 2.2);
      const glowFade = Math.max(0, 1 - p);
      sc.coreMat.opacity = coreFade * 0.98;
      sc.glowMat.opacity = glowFade * glowFade * 0.92;
      if (p > 0.35) {
        sc.glowMat.color.setHex(0xb81d13);
      }
    }

    // 3. Step gravity-arcing molten sparks
    for (let i = 0; i < this.sparks.length; i++) {
      const sp = this.sparks[i];
      if (!sp.active) continue;
      sp.life += dt;
      if (sp.life >= sp.maxLife) {
        sp.active = false;
        sp.mesh.visible = false;
        continue;
      }
      sp.vel.y -= sp.gravity * dt;
      sp.pos.addScaledVector(sp.vel, dt);
      if (sp.pos.y < 98.03 && sp.vel.y < 0) {
        sp.pos.y = 98.03;
        sp.vel.y = -sp.vel.y * 0.42;
        sp.vel.x *= 0.72;
        sp.vel.z *= 0.72;
      }
      sp.mesh.position.copy(sp.pos);
      if (sp.vel.lengthSq() > 1e-4) {
        this.tmpVelDir.copy(sp.vel).normalize();
        this.tmpQuat.setFromUnitVectors(this.tmpZ, this.tmpVelDir);
        sp.mesh.quaternion.copy(this.tmpQuat);
      }
      const p = sp.life / sp.maxLife;
      sp.mat.opacity = 1 - p * p;
      const sScale = Math.max(0.25, 1 - p * 0.65);
      sp.mesh.scale.set(sScale, sScale, 0.8 + sp.vel.length() * 0.14);
    }

    // 4. Step Sekiro Peril Eye-Glint starbursts (billboarded toward camera!)
    for (let i = 0; i < this.glints.length; i++) {
      const g = this.glints[i];
      if (!g.active) continue;
      g.life += dt;
      if (g.life >= g.maxLife) {
        g.active = false;
        g.mesh.visible = false;
        continue;
      }
      const p = g.life / g.maxLife;
      const pop = p < 0.24 ? 0.55 + (p / 0.24) * 0.72 : 1.27 - ((p - 0.24) / 0.76) * 0.85;
      g.mesh.scale.setScalar(Math.max(0.15, pop));
      g.mat.opacity = Math.max(0, 1 - p * p);
      if (cameraPos) {
        g.mesh.lookAt(cameraPos);
      }
    }

    // 5. Step 3D volumetric muzzle flashes
    for (let i = 0; i < this.muzzleFlashes.length; i++) {
      const m = this.muzzleFlashes[i];
      if (!m.active) continue;
      m.life += dt;
      if (m.life >= m.maxLife) {
        m.active = false;
        m.group.visible = false;
        continue;
      }
      const p = m.life / m.maxLife;
      const s = m.baseScale * (1.15 - p * 0.55);
      m.group.scale.set(s, s, s * (1 + p * 0.45));
      m.starMat.opacity = (1 - p) * 0.94;
      m.coreMat.opacity = Math.max(0, 1 - p * 1.3);
    }

    // 6. Cool glowing railgun impact craters
    for (let i = 0; i < this.railCraters.length; i++) {
      const c = this.railCraters[i];
      if (!c.active) continue;
      c.life += dt;
      if (c.life >= c.maxLife) {
        c.active = false;
        c.group.visible = false;
        continue;
      }
      const p = c.life / c.maxLife;
      c.coreMat.opacity = Math.max(0, 1 - p * 2.1);
      c.ringMat.opacity = Math.max(0, (1 - p) * (1 - p) * 0.92);
      if (p > 0.4) c.ringMat.color.setHex(0xb82414);
    }

    // 7. Decay pooled flash light
    if (this.flashTimer > 0) {
      this.flashTimer = Math.max(0, this.flashTimer - dt);
      if (this.flashTimer === 0) {
        this.flashLight.intensity = 0;
      } else {
        this.flashLight.intensity *= Math.exp(-12 * dt);
      }
    }
  }

  public clear(): void {
    for (const s of this.slashArcs) {
      s.active = false;
      s.group.visible = false;
    }
    for (const sc of this.moltenScars) {
      sc.active = false;
      sc.group.visible = false;
    }
    for (const sp of this.sparks) {
      sp.active = false;
      sp.mesh.visible = false;
    }
    for (const g of this.glints) {
      g.active = false;
      g.mesh.visible = false;
    }
    for (const m of this.muzzleFlashes) {
      m.active = false;
      m.group.visible = false;
    }
    for (const c of this.railCraters) {
      c.active = false;
      c.group.visible = false;
    }
    this.flashLight.intensity = 0;
    this.flashTimer = 0;
  }

  public dispose(): void {
    this.arcOuterGeo.dispose();
    this.arcInnerGeo.dispose();
    this.scarCoreGeo.dispose();
    this.scarGlowGeo.dispose();
    this.sparkGeo.dispose();
    this.glintGeo.dispose();
    this.muzzleConeGeo.dispose();
    this.craterCoreGeo.dispose();
    this.craterRingGeo.dispose();
    this.glintTex?.dispose();
    this.slashTex?.dispose();
    for (const s of this.slashArcs) {
      s.outerMat.dispose();
      s.bankedMat.dispose();
      s.innerMat.dispose();
    }
    for (const sc of this.moltenScars) {
      sc.coreMat.dispose();
      sc.glowMat.dispose();
    }
    for (const sp of this.sparks) sp.mat.dispose();
    for (const g of this.glints) g.mat.dispose();
    for (const m of this.muzzleFlashes) {
      m.coreMat.dispose();
      m.starMat.dispose();
    }
    for (const c of this.railCraters) {
      c.coreMat.dispose();
      c.ringMat.dispose();
    }
  }

  private spawnSpark(
    x: number,
    y: number,
    z: number,
    dx: number,
    dy: number,
    dz: number,
    speed: number,
    colorHex: number,
    maxLife: number,
    gravity: number
  ): void {
    const slot = this.sparks.find((s) => !s.active);
    if (!slot) return;
    slot.active = true;
    slot.life = 0;
    slot.maxLife = maxLife;
    slot.gravity = gravity;
    slot.pos.set(x, y, z);
    slot.vel.set(dx, dy, dz).normalize().multiplyScalar(speed);
    slot.mat.color.setHex(colorHex);
    slot.mat.opacity = 1;
    slot.mesh.position.copy(slot.pos);
    slot.mesh.visible = true;
  }

  private triggerFlash(pos: THREE.Vector3, colorHex: number, intensity: number, duration: number): void {
    this.flashLight.position.copy(pos);
    this.flashLight.color.setHex(colorHex);
    this.flashLight.intensity = intensity;
    this.flashTimer = Math.max(this.flashTimer, duration);
  }
}
