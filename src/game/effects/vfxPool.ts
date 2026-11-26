import * as THREE from 'three';
import { computeTravelingBulletSegment } from './ballistics';

export type MuzzleFlashMode = 'suppressed' | 'compensator' | 'heavy_brake';
export type TracerStyle = 'standard' | 'cyan' | 'heavy';

interface SparkItem {
  active: boolean;
  life: number;
  maxLife: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
}

interface DebrisItem {
  active: boolean;
  life: number;
  maxLife: number;
  scale: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Euler;
  spin: THREE.Vector3;
}

interface CasingItem {
  active: boolean;
  life: number;
  bounced: boolean;
  scale: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Euler;
  spin: THREE.Vector3;
}

interface VaporItem {
  active: boolean;
  life: number;
  maxLife: number;
  baseScale: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
}

interface SteamItem {
  active: boolean;
  life: number;
  maxLife: number;
  baseScale: number;
  buoyancy: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rotZ: number;
  spinZ: number;
}

interface TravelingTracerItem {
  active: boolean;
  elapsed: number;
  totalDuration: number;
  speed: number;
  streakLen: number;
  widthScale: number;
  vaporOpacityPeak: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
  bulletMesh: THREE.Mesh;
  bulletMat: THREE.MeshBasicMaterial;
  vaporMesh: THREE.Mesh;
  vaporMat: THREE.MeshBasicMaterial;
}

interface DustItem {
  active: boolean;
  life: number;
  maxLife: number;
  baseScale: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
}

interface ImpactFlashItem {
  active: boolean;
  life: number;
  maxLife: number;
  maxScale: number;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
}

interface HotEmberItem {
  active: boolean;
  life: number;
  maxLife: number;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
}

interface ShockRingItem {
  active: boolean;
  life: number;
  maxLife: number;
  maxRadius: number;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
}

function makeCanvas(w: number, h: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function createFlamePlumeTexture(): THREE.CanvasTexture | null {
  const c = makeCanvas(128, 256);
  if (!c) return null;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, 128, 256);

  // Outer fiery tapered flame envelope (base at bottom y=248 -> fiery tip at top y=12)
  const outer = ctx.createRadialGradient(64, 198, 6, 64, 130, 118);
  outer.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  outer.addColorStop(0.22, 'rgba(255, 236, 170, 0.95)');
  outer.addColorStop(0.52, 'rgba(255, 148, 38, 0.65)');
  outer.addColorStop(0.82, 'rgba(220, 68, 16, 0.18)');
  outer.addColorStop(1.0, 'rgba(180, 32, 0, 0.0)');

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(64, 10);
  ctx.bezierCurveTo(108, 86, 116, 196, 64, 248);
  ctx.bezierCurveTo(12, 196, 20, 86, 64, 10);
  ctx.closePath();
  ctx.fillStyle = outer;
  ctx.fill();

  // White-hot supersonic Mach diamond inner core
  const core = ctx.createRadialGradient(64, 204, 2, 64, 178, 56);
  core.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  core.addColorStop(0.45, 'rgba(255, 248, 215, 0.9)');
  core.addColorStop(1.0, 'rgba(255, 180, 70, 0.0)');
  ctx.fillStyle = core;
  ctx.fillRect(24, 120, 80, 128);
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createStarFlashTexture(): THREE.CanvasTexture | null {
  const c = makeCanvas(128, 128);
  if (!c) return null;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, 128, 128);
  ctx.translate(64, 64);

  // 4-lobe CoD muzzle star + soft central plasma bloom
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 58);
  glow.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  glow.addColorStop(0.28, 'rgba(255, 232, 160, 0.92)');
  glow.addColorStop(0.62, 'rgba(255, 138, 36, 0.42)');
  glow.addColorStop(1.0, 'rgba(255, 90, 12, 0.0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 58, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 2);
    const spike = ctx.createLinearGradient(0, 0, 62, 0);
    spike.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
    spike.addColorStop(0.35, 'rgba(255, 210, 110, 0.72)');
    spike.addColorStop(1, 'rgba(255, 120, 20, 0)');
    ctx.fillStyle = spike;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(62, 0);
    ctx.lineTo(0, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createCraterDecalTexture(): THREE.CanvasTexture | null {
  const c = makeCanvas(128, 128);
  if (!c) return null;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, 128, 128);
  const halo = ctx.createRadialGradient(64, 64, 8, 64, 64, 58);
  halo.addColorStop(0.0, 'rgba(4, 6, 8, 0.96)');
  halo.addColorStop(0.32, 'rgba(18, 22, 27, 0.86)');
  halo.addColorStop(0.64, 'rgba(34, 40, 48, 0.36)');
  halo.addColorStop(1.0, 'rgba(20, 24, 30, 0.0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 128, 128);

  // Radial concrete micro-cracks & chipped crater rim
  ctx.strokeStyle = 'rgba(10, 12, 16, 0.82)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + (i % 2) * 0.2;
    ctx.beginPath();
    ctx.moveTo(64 + Math.cos(a) * 10, 64 + Math.sin(a) * 10);
    ctx.lineTo(64 + Math.cos(a + 0.08) * 34, 64 + Math.sin(a + 0.08) * 34);
    ctx.lineTo(64 + Math.cos(a - 0.06) * 50, 64 + Math.sin(a - 0.06) * 50);
    ctx.stroke();
  }

  // Deep central bullet pit
  ctx.fillStyle = '#030406';
  ctx.beginPath();
  ctx.arc(64, 64, 15, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createSoftSmokePuffTexture(): THREE.CanvasTexture | null {
  const c = makeCanvas(128, 128);
  if (!c) return null;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, 128, 128);
  const lobes: Array<[number, number, number, number]> = [
    [64, 64, 54, 0.34],
    [48, 56, 38, 0.28],
    [80, 58, 36, 0.26],
    [58, 76, 36, 0.24],
    [72, 46, 32, 0.22],
  ];
  for (const [cx, cy, r, a] of lobes) {
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
    g.addColorStop(0.0, `rgba(226, 232, 240, ${a})`);
    g.addColorStop(0.45, `rgba(203, 213, 225, ${a * 0.58})`);
    g.addColorStop(1.0, 'rgba(180, 192, 208, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Procedural Pressurized Cryo-Steam Plume Texture:
 * Luminous boiling-white filamentous vapor core with turbulent curling wisps & soft feathering
 * (distinct from flat gray dust/smoke puffs — reads unmistakably as superheated pressurized steam!).
 */
function createRealisticSteamTexture(): THREE.CanvasTexture | null {
  const c = makeCanvas(128, 128);
  if (!c) return null;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, 128, 128);

  // Soft luminous outer steam halo
  const halo = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
  halo.addColorStop(0.0, 'rgba(248, 253, 255, 0.72)');
  halo.addColorStop(0.32, 'rgba(224, 246, 255, 0.44)');
  halo.addColorStop(0.68, 'rgba(206, 236, 248, 0.16)');
  halo.addColorStop(1.0, 'rgba(186, 224, 242, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 128, 128);

  // Overlapping turbulent curling steam billow pockets for organic billowing silhouette
  const wisps: Array<[number, number, number, number]> = [
    [64, 60, 32, 0.56],
    [45, 52, 26, 0.44],
    [83, 55, 25, 0.42],
    [54, 78, 27, 0.38],
    [76, 75, 24, 0.36],
    [62, 38, 22, 0.34],
    [36, 68, 20, 0.28],
    [90, 66, 19, 0.26],
  ];
  for (const [cx, cy, r, a] of wisps) {
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
    g.addColorStop(0.0, `rgba(255, 255, 255, ${a})`);
    g.addColorStop(0.42, `rgba(232, 248, 255, ${a * 0.58})`);
    g.addColorStop(1.0, 'rgba(205, 236, 248, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createCrossedCloudGeometry(size: number): THREE.BufferGeometry {
  const half = size * 0.5;
  const positions = new Float32Array([
    -half, -half, 0, half, -half, 0, half, half, 0,
    -half, -half, 0, half, half, 0, -half, half, 0,
    0, -half, -half, 0, -half, half, 0, half, half,
    0, -half, -half, 0, half, half, 0, half, -half,
  ]);
  const uvs = new Float32Array([
    0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

/**
 * CoD MW-Inspired Zero-GC Pre-Allocated Combat VFX Pool.
 * - Multi-plane volumetric muzzle flashes:
 *   - `compensator` (VIPER-X4): crossed forward flame petals + 4-lobe star + twin lateral side-port flame jets!
 *   - `suppressed` (SPECTRE-9): tight pressurized baffle jet + hot core star + rising gunsmoke!
 * - High-speed traveling incandescent 3D bullet tracers + lingering supersonic vapor ribbons
 * - Material-aware impact bursts:
 *   - Concrete: cratered scorch decal + hot glowing slag ember + dust cloud + bouncing stone chips + flash
 *   - Metal / Crit: intense starburst flash + high-velocity molten spark shower + dynamic impact PointLight
 * - Tumbling brass shell casings with floor clink + cryo-vent vapor + landing dust rings
 */
export class CombatVfxPool {
  public readonly group = new THREE.Group();
  public readonly muzzleLight: THREE.PointLight;
  public readonly impactLight: THREE.PointLight;

  // Volumetric multi-plane Muzzle Flash Rig
  private readonly muzzleRig = new THREE.Group();
  private readonly forwardFlames: THREE.Mesh[] = [];
  private readonly lateralJets: THREE.Mesh[] = [];
  private readonly muzzleStar: THREE.Mesh;
  private readonly muzzleFlameMat: THREE.MeshBasicMaterial;
  private readonly muzzleStarMat: THREE.MeshBasicMaterial;
  private muzzleFlashTimer = 0;
  private muzzleFlashDuration = 0.055;
  private muzzleLightPeak = 6;
  private impactLightTimer = 0;

  private readonly maxSparks = 200;
  private readonly sparkMesh: THREE.InstancedMesh;
  private readonly sparks: SparkItem[] = [];
  private sparkCursor = 0;

  private readonly maxDebris = 96;
  private readonly debrisMesh: THREE.InstancedMesh;
  private readonly debrisItems: DebrisItem[] = [];
  private debrisCursor = 0;

  private readonly maxCasings = 56;
  private readonly casingMesh: THREE.InstancedMesh;
  private readonly casings: CasingItem[] = [];
  private casingCursor = 0;

  private readonly maxVapors = 84;
  private readonly vaporMesh: THREE.InstancedMesh;
  private readonly vapors: VaporItem[] = [];
  private vaporCursor = 0;

  private readonly maxSteam = 128;
  private readonly steamMesh: THREE.InstancedMesh;
  private readonly steamItems: SteamItem[] = [];
  private steamCursor = 0;

  private readonly maxDecals = 48;
  private readonly decalMesh: THREE.InstancedMesh;
  private decalCursor = 0;

  private readonly tracers: TravelingTracerItem[] = [];
  private tracerCursor = 0;

  private readonly maxDust = 96;
  private readonly dustMesh: THREE.InstancedMesh;
  private readonly dustItems: DustItem[] = [];
  private dustCursor = 0;

  private readonly impactFlashes: ImpactFlashItem[] = [];
  private impactFlashCursor = 0;

  private readonly hotEmbers: HotEmberItem[] = [];
  private hotEmberCursor = 0;

  private readonly shockRings: ShockRingItem[] = [];
  private shockRingCursor = 0;

  // Reusable scratch math objects (zero per-frame GC!)
  private readonly dummy = new THREE.Object3D();
  private readonly tmpDir = new THREE.Vector3();
  private readonly tmpMid = new THREE.Vector3();
  private readonly tmpHead = new THREE.Vector3();
  private readonly tmpTail = new THREE.Vector3();
  private readonly tmpBasis = new THREE.Matrix4();
  private readonly upVec = new THREE.Vector3(0, 1, 0);
  private readonly tmpQuat = new THREE.Quaternion();
  private readonly sparkColorGold = new THREE.Color(0xffb84d);
  private readonly sparkColorHot = new THREE.Color(0xfff1c9);
  private readonly sparkColorCyan = new THREE.Color(0x38bdf8);
  private readonly sparkColorOverheat = new THREE.Color(0xff6b2b);
  private readonly steamColorBright = new THREE.Color(0xf8fdff);
  private readonly steamColorCryo = new THREE.Color(0xbef2ff);
  private readonly steamColorHot = new THREE.Color(0xffe6cc);

  private readonly flameTex: THREE.CanvasTexture | null;
  private readonly starTex: THREE.CanvasTexture | null;
  private readonly craterTex: THREE.CanvasTexture | null;
  private readonly smokeTex: THREE.CanvasTexture | null;
  private readonly steamTex: THREE.CanvasTexture | null;

  constructor(private readonly onCasingBounce?: () => void) {
    this.group.name = 'COMBAT_VFX_POOL';

    this.flameTex = createFlamePlumeTexture();
    this.starTex = createStarFlashTexture();
    this.craterTex = createCraterDecalTexture();
    this.smokeTex = createSoftSmokePuffTexture();
    this.steamTex = createRealisticSteamTexture();

    // 1. Dynamic Muzzle & Impact PointLights (lights hands, weapon metal, and concrete bay walls!)
    this.muzzleLight = new THREE.PointLight(0xffb454, 0, 15.5, 1.8);
    this.group.add(this.muzzleLight);

    this.impactLight = new THREE.PointLight(0xffaa44, 0, 7.5, 2.0);
    this.group.add(this.impactLight);

    // 2. CoD Volumetric Multi-Plane Muzzle Flash Rig (barrel points along -Z in local rig space!)
    this.muzzleRig.name = 'COD_MUZZLE_FLASH_RIG';
    this.muzzleRig.visible = false;

    this.muzzleFlameMat = new THREE.MeshBasicMaterial({
      color: 0xffd28a,
      map: this.flameTex ?? undefined,
      transparent: true,
      opacity: 0.96,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.muzzleStarMat = new THREE.MeshBasicMaterial({
      color: 0xffe4a8,
      map: this.starTex ?? undefined,
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // Forward flame plume: 3 crossed radial planes oriented along -Z (pivot at base y=0)
    const fwdPlaneGeo = new THREE.PlaneGeometry(0.24, 0.56);
    fwdPlaneGeo.translate(0, 0.28, 0);
    fwdPlaneGeo.rotateX(-Math.PI / 2); // now extends along -Z!
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(fwdPlaneGeo, this.muzzleFlameMat);
      m.rotation.z = (i * Math.PI) / 3;
      this.muzzleRig.add(m);
      this.forwardFlames.push(m);
    }

    // Twin Lateral Compensator Side-Port Flame Jets (shoot out +X and -X from VIPER-X4 brake!)
    const sidePlaneGeo = new THREE.PlaneGeometry(0.18, 0.4);
    sidePlaneGeo.translate(0, 0.2, 0);
    for (const side of [-1, 1] as const) {
      for (const roll of [0, Math.PI / 2]) {
        const jet = new THREE.Mesh(sidePlaneGeo, this.muzzleFlameMat);
        // Position slightly back on the compensator ports
        jet.position.set(side * 0.016, 0, 0.036);
        jet.rotation.z = -side * (Math.PI / 2);
        jet.rotation.y = side * 0.24; // angled slightly rearward like a real 3-chamber brake!
        jet.rotation.x = roll;
        this.muzzleRig.add(jet);
        this.lateralJets.push(jet);
      }
    }

    // Front-facing 4-lobe CoD blazing muzzle star cross
    const starGeo = new THREE.PlaneGeometry(0.42, 0.42);
    this.muzzleStar = new THREE.Mesh(starGeo, this.muzzleStarMat);
    this.muzzleStar.position.set(0, 0, -0.03);
    this.muzzleRig.add(this.muzzleStar);

    this.group.add(this.muzzleRig);

    // 3. Pooled High-Velocity Molten Sparks (razor-sharp elongated incandescent streaks)
    const sparkGeo = new THREE.BoxGeometry(0.0085, 0.0085, 0.15);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.96,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.sparkMesh = new THREE.InstancedMesh(sparkGeo, sparkMat, this.maxSparks);
    this.sparkMesh.frustumCulled = false;
    for (let i = 0; i < this.maxSparks; i++) {
      this.sparks.push({
        active: false,
        life: 0,
        maxLife: 0.35,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
      });
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.sparkMesh.setMatrixAt(i, this.dummy.matrix);
      this.sparkMesh.setColorAt(i, this.sparkColorGold);
    }
    this.group.add(this.sparkMesh);

    // 4. Pooled Gravity-Bouncing Concrete Stone Chips / Impact Debris
    const debrisGeo = new THREE.DodecahedronGeometry(0.022, 0);
    const debrisMat = new THREE.MeshStandardMaterial({
      color: 0x67707c,
      roughness: 0.92,
      metalness: 0.06,
    });
    this.debrisMesh = new THREE.InstancedMesh(debrisGeo, debrisMat, this.maxDebris);
    this.debrisMesh.frustumCulled = false;
    for (let i = 0; i < this.maxDebris; i++) {
      this.debrisItems.push({
        active: false,
        life: 0,
        maxLife: 0.85,
        scale: 1,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rot: new THREE.Euler(),
        spin: new THREE.Vector3(),
      });
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.debrisMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.group.add(this.debrisMesh);

    // 5. Pooled Spinning Metallic Brass Shell Casings
    const casingGeo = new THREE.CylinderGeometry(0.0075, 0.008, 0.032, 7);
    const casingMat = new THREE.MeshStandardMaterial({
      color: 0xe2b454,
      roughness: 0.22,
      metalness: 0.94,
    });
    this.casingMesh = new THREE.InstancedMesh(casingGeo, casingMat, this.maxCasings);
    this.casingMesh.frustumCulled = false;
    for (let i = 0; i < this.maxCasings; i++) {
      this.casings.push({
        active: false,
        life: 0,
        bounced: false,
        scale: 1,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rot: new THREE.Euler(),
        spin: new THREE.Vector3(),
      });
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.casingMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.group.add(this.casingMesh);

    // 6. Pooled Soft Volumetric Cryo-Vent Steam & Wispy Gunsmoke Plumes (zero hard polygon edges!)
    const vaporGeo = createCrossedCloudGeometry(0.28);
    const vaporMat = new THREE.MeshBasicMaterial({
      color: 0xd8eef8,
      ...(this.smokeTex ? { map: this.smokeTex } : {}),
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.vaporMesh = new THREE.InstancedMesh(vaporGeo, vaporMat, this.maxVapors);
    this.vaporMesh.frustumCulled = false;
    for (let i = 0; i < this.maxVapors; i++) {
      this.vapors.push({
        active: false,
        life: 0,
        maxLife: 0.55,
        baseScale: 1,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
      });
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.vaporMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.group.add(this.vaporMesh);

    // 6B. Dedicated Pressurized Overheat Cryo-Steam Plumes (luminous billowing vapor + buoyancy!)
    const steamGeo = createCrossedCloudGeometry(0.28);
    const steamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      ...(this.steamTex ? { map: this.steamTex } : {}),
      transparent: true,
      opacity: 0.66,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.steamMesh = new THREE.InstancedMesh(steamGeo, steamMat, this.maxSteam);
    this.steamMesh.frustumCulled = false;
    for (let i = 0; i < this.maxSteam; i++) {
      this.steamItems.push({
        active: false,
        life: 0,
        maxLife: 0.65,
        baseScale: 1,
        buoyancy: 1.65,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rotZ: 0,
        spinZ: 0,
      });
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.steamMesh.setMatrixAt(i, this.dummy.matrix);
      this.steamMesh.setColorAt(i, this.steamColorBright);
    }
    this.group.add(this.steamMesh);

    // 7. Textured Cratered Bullet Impact Scorch Decals (polygonOffset prevents Z-fighting)
    const decalGeo = new THREE.PlaneGeometry(0.19, 0.19);
    const decalMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: this.craterTex ?? undefined,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.decalMesh = new THREE.InstancedMesh(decalGeo, decalMat, this.maxDecals);
    this.decalMesh.frustumCulled = false;
    for (let i = 0; i < this.maxDecals; i++) {
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.decalMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.group.add(this.decalMesh);

    // 8. Pooled Traveling Incandescent 3D Bullet Tracers + Lingering Supersonic Vapor Ribbons
    const bulletGeo = new THREE.CylinderGeometry(0.0085, 0.0155, 1, 6);
    const vaporRibbonGeo = new THREE.CylinderGeometry(0.018, 0.009, 1, 5);
    for (let i = 0; i < 18; i++) {
      const bulletMat = new THREE.MeshBasicMaterial({
        color: 0xffe096,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const bulletMesh = new THREE.Mesh(bulletGeo, bulletMat);
      bulletMesh.visible = false;
      this.group.add(bulletMesh);

      const vaporMat = new THREE.MeshBasicMaterial({
        color: 0xcbd5e1,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const vaporMesh = new THREE.Mesh(vaporRibbonGeo, vaporMat);
      vaporMesh.visible = false;
      this.group.add(vaporMesh);

      this.tracers.push({
        active: false,
        elapsed: 0,
        totalDuration: 0.24,
        speed: 118,
        streakLen: 2.2,
        widthScale: 1.15,
        vaporOpacityPeak: 0.22,
        start: new THREE.Vector3(),
        end: new THREE.Vector3(),
        bulletMesh,
        bulletMat,
        vaporMesh,
        vaporMat,
      });
    }

    // 9. Pooled Frame-1 Impact Flash Stars + Cooling Hot Slag Embers
    const impactFlashGeo = new THREE.PlaneGeometry(0.38, 0.38);
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffd280,
        map: this.starTex ?? undefined,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(impactFlashGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.impactFlashes.push({ active: false, life: 0, maxLife: 0.09, maxScale: 1, mesh, mat });
    }

    const emberGeo = new THREE.CircleGeometry(0.036, 8);
    for (let i = 0; i < 16; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff7b1c,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      });
      const mesh = new THREE.Mesh(emberGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.hotEmbers.push({ active: false, life: 0, maxLife: 0.52, mesh, mat });
    }

    // 10. Pooled Soft Volumetric Concrete Impact & Footstep Dust Billows
    const dustGeo = createCrossedCloudGeometry(0.46);
    const dustMat = new THREE.MeshBasicMaterial({
      color: 0xc8d0da,
      ...(this.smokeTex ? { map: this.smokeTex } : {}),
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.dustMesh = new THREE.InstancedMesh(dustGeo, dustMat, this.maxDust);
    this.dustMesh.frustumCulled = false;
    for (let i = 0; i < this.maxDust; i++) {
      this.dustItems.push({
        active: false,
        life: 0,
        maxLife: 0.45,
        baseScale: 1,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
      });
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.dustMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.group.add(this.dustMesh);

    // 11. Pooled Expanding Air-Shock & Impact Rings
    let ringTex: THREE.CanvasTexture | null = null;
    const ringCanvas = makeCanvas(128, 128);
    if (ringCanvas) {
      const rCtx = ringCanvas.getContext('2d')!;
      const rGrad = rCtx.createRadialGradient(64, 64, 24, 64, 64, 62);
      rGrad.addColorStop(0.0, 'rgba(203, 213, 225, 0)');
      rGrad.addColorStop(0.55, 'rgba(203, 213, 225, 0.25)');
      rGrad.addColorStop(0.76, 'rgba(226, 232, 240, 0.68)');
      rGrad.addColorStop(0.92, 'rgba(203, 213, 225, 0.16)');
      rGrad.addColorStop(1.0, 'rgba(203, 213, 225, 0)');
      rCtx.fillStyle = rGrad;
      rCtx.fillRect(0, 0, 128, 128);
      ringTex = new THREE.CanvasTexture(ringCanvas);
      ringTex.colorSpace = THREE.SRGBColorSpace;
    }

    const ringGeo = new THREE.PlaneGeometry(2.0, 2.0);
    ringGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: ringTex ?? undefined,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.shockRings.push({
        active: false,
        life: 0,
        maxLife: 0.34,
        maxRadius: 0.9,
        mesh,
        mat,
      });
    }
  }

  /**
   * Triggers a weapon-specific volumetric CoD muzzle flash aligned to the gun's exact barrel basis.
   * - `heavy_brake` (VULCAN-50): COLOSSAL dual-baffle tank-brake flame wings + scorching cone + blinding star!
   * - `compensator` (VIPER-X4): fiery forward cone + blazing 4-lobe star + twin lateral side-port flame jets!
   * - `suppressed` (SPECTRE-9): compact pressurized gas plume + hot core star + subtle wispy suppressor smoke!
   */
  public triggerMuzzleFlash(
    pos: THREE.Vector3,
    isCyan: boolean,
    intensity = 6.2,
    mode: MuzzleFlashMode = 'suppressed',
    forward?: THREE.Vector3,
    right?: THREE.Vector3,
    up?: THREE.Vector3
  ): void {
    const isHeavy = mode === 'heavy_brake';
    const isComp = mode === 'compensator';

    this.muzzleLight.position.copy(pos);
    this.muzzleLight.color.setHex(isCyan ? 0x38bdf8 : isHeavy ? 0xff9d2e : 0xffaa44);
    this.muzzleLightPeak = isHeavy ? Math.max(intensity, 14.5) : intensity;
    this.muzzleLight.intensity = this.muzzleLightPeak;

    this.muzzleRig.position.copy(pos);
    if (forward && right && up) {
      this.tmpDir.copy(forward).negate();
      this.tmpBasis.makeBasis(right, up, this.tmpDir);
      this.muzzleRig.quaternion.setFromRotationMatrix(this.tmpBasis);
    }

    const flameHex = isCyan ? 0x7dd3fc : isHeavy ? 0xffb347 : isComp ? 0xffcc66 : 0xffdf9e;
    const starHex = isCyan ? 0xe0f2fe : isHeavy ? 0xfff5d6 : 0xfff0c2;
    this.muzzleFlameMat.color.setHex(flameHex);
    this.muzzleFlameMat.opacity = isHeavy ? 1.0 : isComp ? 0.96 : 0.85;
    this.muzzleStarMat.color.setHex(starHex);
    this.muzzleStarMat.opacity = isHeavy ? 1.0 : isComp ? 0.98 : 0.82;

    const jitterScale = 0.88 + Math.random() * 0.28;
    const fwdScale = isHeavy ? 1.62 * jitterScale : isComp ? 1.15 * jitterScale : 0.62 * jitterScale;
    const fwdLen = isHeavy ? 1.72 * jitterScale : isComp ? 1.18 * jitterScale : 0.72 * jitterScale;
    const rollJitter = Math.random() * Math.PI * 2;
    for (let i = 0; i < this.forwardFlames.length; i++) {
      this.forwardFlames[i].rotation.z = rollJitter + (i * Math.PI) / 3;
      this.forwardFlames[i].scale.set(fwdScale, fwdScale, fwdLen);
    }

    // Twin lateral side-port flame jets on VIPER-X4 compensator & COLOSSAL wings on VULCAN-50 tank brake!
    const showLateral = isComp || isHeavy;
    const latMul = isHeavy ? 1.92 : 1.0;
    for (let i = 0; i < this.lateralJets.length; i++) {
      this.lateralJets[i].visible = showLateral;
      this.lateralJets[i].scale.set(
        latMul * jitterScale * (0.9 + Math.random() * 0.24),
        latMul * jitterScale * (0.98 + Math.random() * 0.35),
        1
      );
    }

    this.muzzleStar.rotation.z = Math.random() * Math.PI;
    this.muzzleStar.scale.setScalar((isHeavy ? 1.72 : isComp ? 1.18 : 0.72) * jitterScale);

    this.muzzleRig.visible = true;
    this.muzzleFlashDuration = isHeavy ? 0.135 : isComp ? 0.1 : 0.085;
    this.muzzleFlashTimer = this.muzzleFlashDuration;

    // Rising hot gunsmoke wisp (+ concussive side-baffle gas billows for VULCAN-50!)
    const smokeCount = isHeavy ? 6 : isComp ? 2 : 3;
    for (let i = 0; i < smokeCount; i++) {
      const v = this.vapors[this.vaporCursor];
      this.vaporCursor = (this.vaporCursor + 1) % this.maxVapors;
      v.active = true;
      v.life = 0;
      v.maxLife = (isHeavy ? 0.62 : 0.42) + Math.random() * 0.35;
      v.baseScale = isHeavy ? 1.45 : isComp ? 0.85 : 0.68;
      v.pos.copy(pos);
      if (forward && right && isHeavy && i >= 2) {
        const side = i % 2 === 0 ? 1 : -1;
        v.vel
          .copy(right)
          .multiplyScalar(side * (2.2 + Math.random() * 1.4))
          .addScaledVector(forward, 0.45)
          .add(this.tmpDir.set(0, 0.55 + Math.random() * 0.5, 0));
      } else if (forward) {
        v.vel
          .copy(forward)
          .multiplyScalar((isHeavy ? 2.4 : 1.3) + Math.random() * 1.0)
          .add(
            this.tmpDir.set(
              (Math.random() - 0.5) * 0.45,
              0.75 + Math.random() * 0.55,
              (Math.random() - 0.5) * 0.45
            )
          );
      } else {
        v.vel.set((Math.random() - 0.5) * 0.5, 0.85 + Math.random() * 0.45, (Math.random() - 0.5) * 0.5);
      }
    }

    // Concussive .50-cal glowing unburnt powder sparks spraying from the dual-chamber brake!
    if (isHeavy && forward) {
      this.spawnSparks(pos, forward, 10, false, 1.35);
    }
  }

  /**
   * Launches a high-speed incandescent 3D bullet tracer traveling from muzzle -> impact
   * plus a subtle lingering supersonic smoke/vapor ribbon behind the flight path!
   */
  public spawnTracer(
    start: THREE.Vector3,
    end: THREE.Vector3,
    style: TracerStyle = 'standard'
  ): void {
    const t = this.tracers[this.tracerCursor];
    this.tracerCursor = (this.tracerCursor + 1) % this.tracers.length;

    const dist = start.distanceTo(end);
    if (dist < 0.08) return;

    const isCyan = style === 'cyan';
    const isHeavy = style === 'heavy';

    t.start.copy(start);
    t.end.copy(end);
    t.elapsed = 0;
    t.speed = isHeavy ? 148 : isCyan ? 132 : 112;
    t.streakLen = Math.min(dist * 0.72, isHeavy ? 3.8 : isCyan ? 2.6 : 2.1);
    t.widthScale = isHeavy ? 2.25 : 1.15;
    t.vaporOpacityPeak = isHeavy ? 0.36 : 0.22;
    const flightTime = (dist + t.streakLen) / t.speed;
    t.totalDuration = Math.max(isHeavy ? 0.34 : 0.18, flightTime + (isHeavy ? 0.24 : 0.14));

    // Orient lingering vapor trail along full flight path
    this.tmpMid.addVectors(start, end).multiplyScalar(0.5);
    this.tmpDir.subVectors(end, start).normalize();
    this.tmpQuat.setFromUnitVectors(this.upVec, this.tmpDir);

    t.vaporMesh.position.copy(this.tmpMid);
    t.vaporMesh.quaternion.copy(this.tmpQuat);
    t.vaporMesh.scale.set(isHeavy ? 1.85 : 1, dist, isHeavy ? 1.85 : 1);
    t.vaporMat.color.setHex(isCyan ? 0xbae6fd : isHeavy ? 0xfef3c7 : 0xd6dde6);
    t.vaporMat.opacity = t.vaporOpacityPeak;
    t.vaporMesh.visible = true;

    const seg = computeTravelingBulletSegment(
      t.start,
      t.end,
      0.014,
      t.speed,
      t.streakLen,
      this.tmpHead,
      this.tmpTail
    );
    this.tmpMid.addVectors(seg.tail, seg.head).multiplyScalar(0.5);
    t.bulletMesh.position.copy(this.tmpMid);
    t.bulletMesh.quaternion.copy(this.tmpQuat);
    t.bulletMesh.scale.set(t.widthScale, Math.max(0.28, seg.length), t.widthScale);
    t.bulletMat.color.setHex(isCyan ? 0x7dd3fc : isHeavy ? 0xffd166 : 0xffe49e);
    t.bulletMat.opacity = 0.98;
    t.bulletMesh.visible = true;

    t.active = true;
  }

  /**
   * CoD Concrete Wall / Cover Impact (scaled by `power`, e.g., `1.85` for VULCAN-50 .50-cal hits!):
   * Cratered scorch decal + hot glowing slag core + bright impact flash + billowing concrete dust
   * + gravity-bouncing stone debris chips + dynamic impact light!
   */
  public spawnConcreteImpact(pos: THREE.Vector3, normal: THREE.Vector3, power = 1): void {
    const isHeavy = power >= 1.5;
    this.spawnImpactDecal(pos, normal, isHeavy ? 1.6 : 1.0);
    this.spawnHotEmber(pos, normal, isHeavy ? 0xff6b1a : 0xff8c2b, isHeavy ? 0.72 : 0.44);
    this.spawnImpactFlash(pos, normal, isHeavy ? 0xffe096 : 0xffd185, 0.88 * power, isHeavy ? 0.12 : 0.085);
    this.triggerImpactLight(pos, 0xffaa44, 4.2 * power);

    if (isHeavy) {
      this.spawnImpactRing(pos, normal, 0.68, 0xfde68a);
    }

    const dustCount = Math.round(8 * power);
    for (let i = 0; i < dustCount; i++) {
      const d = this.dustItems[this.dustCursor];
      this.dustCursor = (this.dustCursor + 1) % this.maxDust;
      d.active = true;
      d.life = 0;
      d.maxLife = (isHeavy ? 0.56 : 0.38) + Math.random() * 0.3;
      d.baseScale = (0.65 + Math.random() * 0.65) * (isHeavy ? 1.48 : 1);
      d.pos.copy(pos).addScaledVector(normal, 0.06);
      d.vel
        .copy(normal)
        .multiplyScalar((1.3 + Math.random() * 2.1) * (isHeavy ? 1.35 : 1))
        .add(
          this.tmpDir.set(
            (Math.random() - 0.5) * 2.4 * power,
            0.35 + Math.random() * 1.3 * power,
            (Math.random() - 0.5) * 2.4 * power
          )
        );
    }

    const chipCount = Math.round(12 * power);
    for (let i = 0; i < chipCount; i++) {
      const ch = this.debrisItems[this.debrisCursor];
      this.debrisCursor = (this.debrisCursor + 1) % this.maxDebris;
      ch.active = true;
      ch.life = 0;
      ch.maxLife = 0.55 + Math.random() * 0.48;
      ch.scale = (0.55 + Math.random() * 0.95) * (isHeavy ? 1.35 : 1);
      ch.pos.copy(pos).addScaledVector(normal, 0.04);
      ch.vel
        .copy(normal)
        .multiplyScalar((2.6 + Math.random() * 3.4) * (isHeavy ? 1.3 : 1))
        .add(
          this.tmpDir.set(
            (Math.random() - 0.5) * 4.5 * power,
            1.2 + Math.random() * 3.2 * power,
            (Math.random() - 0.5) * 4.5 * power
          )
        );
      ch.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      ch.spin.set(12 + Math.random() * 14, 12 + Math.random() * 14, 12 + Math.random() * 14);
    }

    this.spawnSparks(pos, normal, Math.round(7 * power), false, 0.85 * Math.min(1.5, power));
  }

  /**
   * CoD Steel Target / Armor / Drone Impact (scaled by `power` for massive .50-cal hits!):
   * Intense molten flash star + hot ember + rich shower of glowing ricochet sparks + impact PointLight!
   */
  public spawnMetalImpact(
    pos: THREE.Vector3,
    normal: THREE.Vector3,
    isCrit = false,
    cyanTint = false,
    power = 1
  ): void {
    const isHeavy = power >= 1.5;
    const flashColor = cyanTint ? 0x7dd3fc : isCrit || isHeavy ? 0xfff3b0 : 0xffcb74;
    const lightColor = cyanTint ? 0x38bdf8 : isCrit || isHeavy ? 0xffd166 : 0xff9f38;
    this.spawnImpactFlash(
      pos,
      normal,
      flashColor,
      (isCrit ? 1.55 : 1.1) * (isHeavy ? 1.45 : 1),
      isCrit || isHeavy ? 0.13 : 0.085
    );
    this.spawnHotEmber(pos, normal, lightColor, isCrit || isHeavy ? 0.68 : 0.42);
    this.triggerImpactLight(pos, lightColor, (isCrit ? 7.2 : 5.0) * (isHeavy ? 1.5 : 1));
    this.spawnSparks(
      pos,
      normal,
      Math.round((isCrit ? 24 : 16) * (isHeavy ? 1.5 : 1)),
      cyanTint,
      (isCrit ? 1.38 : 1.12) * (isHeavy ? 1.32 : 1)
    );

    if (isCrit || isHeavy) {
      this.spawnImpactRing(pos, normal, isHeavy ? 0.72 : 0.46, cyanTint ? 0x7dd3fc : 0xffe08a);
    }
  }

  /**
   * Heavy Canister / Drone Explosion Impact:
   * Blinding flash + massive molten spark nova + expanding blast ring + billowing smoke cloud!
   */
  public spawnExplosionImpact(pos: THREE.Vector3, cyanTint = false): void {
    const up = this.upVec;
    this.spawnImpactFlash(pos, up, cyanTint ? 0xbae6fd : 0xffe49e, 2.8, 0.16);
    this.triggerImpactLight(pos, cyanTint ? 0x38bdf8 : 0xff8c2b, 14.0);
    this.spawnSparks(pos, up, 38, cyanTint, 1.85);
    this.spawnCryoVapor(pos, 10);
    this.spawnImpactRing(pos, up, 1.35, cyanTint ? 0x7dd3fc : 0xffb347);
  }

  /**
   * Realistic Pressurized Overheat Cryo-Steam + Crackling Short-Circuit Sparks!
   * Blasts dense billowing white-cyan steam jets sideways out of BOTH open VIPER-X4 vent flaps
   * that decelerate, swirl, and curl upward with thermal buoyancy — laced with hot orange-gold
   * and electric cyan-white overheat sparks INSIDE the billowing steam when overheated!
   */
  public spawnOverheatSteamAndSparks(
    posL: THREE.Vector3,
    posR: THREE.Vector3,
    dirL: THREE.Vector3,
    dirR: THREE.Vector3,
    upDir: THREE.Vector3,
    isOverheated: boolean,
    intensity = 1
  ): void {
    const steamPerSide = Math.max(3, Math.round((isOverheated ? 6 : 4) * intensity));

    for (let side = 0; side < 2; side++) {
      const origin = side === 0 ? posL : posR;
      const jetDir = side === 0 ? dirL : dirR;

      for (let i = 0; i < steamPerSide; i++) {
        const idx = this.steamCursor;
        const st = this.steamItems[idx];
        this.steamCursor = (this.steamCursor + 1) % this.maxSteam;

        const isTightCore = i < 2;
        st.active = true;
        st.life = 0;
        st.maxLife = (isTightCore ? 0.36 : 0.62) + Math.random() * 0.28;
        st.baseScale = (isTightCore ? 0.44 : 0.72) + Math.random() * 0.36;
        st.buoyancy = (isTightCore ? 0.95 : 1.35) + Math.random() * 0.55;
        st.rotZ = Math.random() * Math.PI * 2;
        st.spinZ = (Math.random() - 0.5) * 4.2;

        // Spawn along the vent slit so continuous pressurized steam pours directly out of both openings
        st.pos
          .copy(origin)
          .addScaledVector(jetDir, 0.01 + Math.random() * 0.05)
          .addScaledVector(upDir, (Math.random() - 0.35) * 0.03);

        // Layered sideways pressurized jet that decelerates rapidly into swirling curling steam clouds
        const jetSpeed = (isTightCore ? 0.52 : 0.95) + Math.random() * (isTightCore ? 0.55 : 0.85);
        st.vel
          .copy(jetDir)
          .multiplyScalar(jetSpeed)
          .addScaledVector(upDir, (isTightCore ? 0.22 : 0.45) + Math.random() * 0.52)
          .add(
            this.tmpDir.set(
              (Math.random() - 0.5) * 0.36,
              0,
              (Math.random() - 0.5) * 0.36
            )
          );

        // Luminous boiling white-cyan steam + warm thermal core tint right at the overheated vent mouth
        const steamCol =
          isOverheated && i === 0
            ? this.steamColorHot
            : i % 2 === 0
              ? this.steamColorBright
              : this.steamColorCryo;
        this.steamMesh.setColorAt(idx, steamCol);
      }

      // Emit crackling short-circuit sparks RIGHT INSIDE the billowing steam plumes!
      if (isOverheated) {
        const sparkCount = Math.max(3, Math.round(5 * intensity));
        for (let k = 0; k < sparkCount; k++) {
          const idx = this.sparkCursor;
          const s = this.sparks[idx];
          this.sparkCursor = (this.sparkCursor + 1) % this.maxSparks;

          s.active = true;
          s.life = 0;
          s.maxLife = 0.16 + Math.random() * 0.16;
          // Distribute sparks inside the active steam plume right next to the open vents
          s.pos
            .copy(origin)
            .addScaledVector(jetDir, 0.02 + Math.random() * 0.12)
            .addScaledVector(upDir, Math.random() * 0.1);
          s.vel
            .copy(jetDir)
            .multiplyScalar(0.68 + Math.random() * 1.15)
            .addScaledVector(upDir, 0.72 + Math.random() * 1.35)
            .add(
              this.tmpDir.set(
                (Math.random() - 0.5) * 0.95,
                0,
                (Math.random() - 0.5) * 0.95
              )
            );

          // Mix scorching orange-red, white-hot gold, and electric cyan-white short-circuit sparks!
          const col =
            k % 3 === 0
              ? this.sparkColorHot
              : k % 3 === 1
                ? this.sparkColorOverheat
                : this.sparkColorCyan;
          this.sparkMesh.setColorAt(idx, col);
        }
      }
    }

    if (this.steamMesh.instanceColor) {
      this.steamMesh.instanceColor.needsUpdate = true;
    }
    if (isOverheated && this.sparkMesh.instanceColor) {
      this.sparkMesh.instanceColor.needsUpdate = true;
    }

    // Subtle pulsing fiery thermal light illuminating the steam plumes & gloved hands during overheat!
    if (isOverheated && this.impactLightTimer <= 0.015) {
      this.tmpMid.addVectors(posL, posR).multiplyScalar(0.5);
      this.triggerImpactLight(this.tmpMid, 0xff5a1f, 4.4 * intensity);
    }
  }

  private triggerImpactLight(pos: THREE.Vector3, colorHex: number, intensity: number): void {
    this.impactLight.position.copy(pos);
    this.impactLight.color.setHex(colorHex);
    this.impactLight.intensity = intensity;
    this.impactLightTimer = 0.085;
  }

  private spawnImpactFlash(
    pos: THREE.Vector3,
    normal: THREE.Vector3,
    colorHex: number,
    scale: number,
    duration: number
  ): void {
    const f = this.impactFlashes[this.impactFlashCursor];
    this.impactFlashCursor = (this.impactFlashCursor + 1) % this.impactFlashes.length;
    f.active = true;
    f.life = 0;
    f.maxLife = duration;
    f.maxScale = scale;
    f.mesh.position.copy(pos).addScaledVector(normal, 0.045);
    this.tmpDir.copy(pos).add(normal);
    f.mesh.lookAt(this.tmpDir);
    f.mesh.rotateZ(Math.random() * Math.PI * 2);
    f.mesh.scale.setScalar(scale * 0.75);
    f.mat.color.setHex(colorHex);
    f.mat.opacity = 0.98;
    f.mesh.visible = true;
  }

  private spawnHotEmber(
    pos: THREE.Vector3,
    normal: THREE.Vector3,
    colorHex: number,
    duration: number
  ): void {
    const e = this.hotEmbers[this.hotEmberCursor];
    this.hotEmberCursor = (this.hotEmberCursor + 1) % this.hotEmbers.length;
    e.active = true;
    e.life = 0;
    e.maxLife = duration;
    e.mesh.position.copy(pos).addScaledVector(normal, 0.028);
    this.tmpDir.copy(pos).add(normal);
    e.mesh.lookAt(this.tmpDir);
    e.mesh.scale.setScalar(0.85 + Math.random() * 0.4);
    e.mat.color.setHex(colorHex);
    e.mat.opacity = 0.95;
    e.mesh.visible = true;
  }

  private spawnImpactRing(
    pos: THREE.Vector3,
    normal: THREE.Vector3,
    maxRadius: number,
    colorHex: number
  ): void {
    const ring = this.shockRings[this.shockRingCursor];
    this.shockRingCursor = (this.shockRingCursor + 1) % this.shockRings.length;
    ring.active = true;
    ring.life = 0;
    ring.maxLife = 0.24;
    ring.maxRadius = maxRadius;
    ring.mesh.position.copy(pos).addScaledVector(normal, 0.04);
    this.tmpQuat.setFromUnitVectors(this.upVec, normal);
    ring.mesh.quaternion.copy(this.tmpQuat);
    ring.mesh.scale.setScalar(0.14);
    ring.mat.color.setHex(colorHex);
    ring.mat.opacity = 0.65;
    ring.mesh.visible = true;
  }

  public spawnSparks(
    origin: THREE.Vector3,
    normal: THREE.Vector3,
    count: number,
    cyanTint = false,
    speedScale = 1
  ): void {
    for (let i = 0; i < count; i++) {
      const s = this.sparks[this.sparkCursor];
      const idx = this.sparkCursor;
      this.sparkCursor = (this.sparkCursor + 1) % this.maxSparks;

      s.active = true;
      s.life = 0;
      s.maxLife = 0.22 + Math.random() * 0.3;
      s.pos.copy(origin);
      s.vel
        .copy(normal)
        .multiplyScalar(2.8 + Math.random() * 4.4)
        .add(
          this.tmpDir.set(
            (Math.random() - 0.5) * 5.8,
            1.4 + Math.random() * 4.2,
            (Math.random() - 0.5) * 5.8
          )
        )
        .multiplyScalar(speedScale);

      const col = cyanTint
        ? this.sparkColorCyan
        : i % 3 === 0
          ? this.sparkColorHot
          : this.sparkColorGold;
      this.sparkMesh.setColorAt(idx, col);
    }
    if (this.sparkMesh.instanceColor) {
      this.sparkMesh.instanceColor.needsUpdate = true;
    }
  }

  public spawnCasing(origin: THREE.Vector3, rightVec: THREE.Vector3, scale = 1): void {
    const c = this.casings[this.casingCursor];
    this.casingCursor = (this.casingCursor + 1) % this.maxCasings;

    c.active = true;
    c.life = 0;
    c.bounced = false;
    c.scale = scale;
    c.pos.copy(origin);
    c.vel
      .copy(rightVec)
      .multiplyScalar((1.65 + Math.random() * 1.15) * (scale > 1.3 ? 1.15 : 1))
      .add(
        this.tmpDir.set(
          (Math.random() - 0.5) * 0.55,
          1.6 + Math.random() * 0.75,
          (Math.random() - 0.5) * 0.55
        )
      );
    c.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    c.spin.set(16 + Math.random() * 12, 12 + Math.random() * 10, 14 + Math.random() * 10);
  }

  public spawnCryoVapor(origin: THREE.Vector3, count = 4): void {
    for (let i = 0; i < count; i++) {
      const idx = this.steamCursor;
      const st = this.steamItems[idx];
      this.steamCursor = (this.steamCursor + 1) % this.maxSteam;

      st.active = true;
      st.life = 0;
      st.maxLife = 0.42 + Math.random() * 0.34;
      st.baseScale = 0.9 + Math.random() * 0.45;
      st.buoyancy = 1.5 + Math.random() * 0.7;
      st.rotZ = Math.random() * Math.PI * 2;
      st.spinZ = (Math.random() - 0.5) * 3.8;
      st.pos.copy(origin);
      st.vel.set(
        (Math.random() - 0.5) * 1.8,
        1.15 + Math.random() * 1.35,
        (Math.random() - 0.5) * 1.8
      );
      this.steamMesh.setColorAt(idx, i % 2 === 0 ? this.steamColorBright : this.steamColorCryo);
    }
    if (this.steamMesh.instanceColor) {
      this.steamMesh.instanceColor.needsUpdate = true;
    }
  }

  public spawnImpactDecal(pos: THREE.Vector3, normal: THREE.Vector3, scaleMul = 1): void {
    const idx = this.decalCursor;
    this.decalCursor = (this.decalCursor + 1) % this.maxDecals;

    this.dummy.position.copy(pos).addScaledVector(normal, 0.022);
    this.tmpDir.copy(pos).add(normal);
    this.dummy.lookAt(this.tmpDir);
    this.dummy.rotateZ(Math.random() * Math.PI * 2);
    const sc = (0.75 + Math.random() * 0.55) * scaleMul;
    this.dummy.scale.set(sc, sc, 1);
    this.dummy.updateMatrix();
    this.decalMesh.setMatrixAt(idx, this.dummy.matrix);
    this.decalMesh.instanceMatrix.needsUpdate = true;
  }

  public spawnJumpDustRing(pos: THREE.Vector3, intensity = 0.85, isLanding = true): void {
    const clamped = Math.max(0.35, Math.min(1.4, intensity));

    const ring = this.shockRings[this.shockRingCursor];
    this.shockRingCursor = (this.shockRingCursor + 1) % this.shockRings.length;
    ring.active = true;
    ring.life = 0;
    ring.maxLife = isLanding ? 0.36 + clamped * 0.12 : 0.26;
    ring.maxRadius = isLanding ? 0.65 + clamped * 0.55 : 0.56 + clamped * 0.24;
    ring.mesh.position.set(pos.x, pos.y + 0.032, pos.z);
    ring.mesh.quaternion.identity();
    ring.mesh.scale.setScalar(0.18);
    ring.mat.color.setHex(0xffffff);
    ring.mat.opacity = isLanding ? 0.34 : 0.24;
    ring.mesh.visible = true;

    const count = isLanding ? Math.round(10 + clamped * 8) : 8;
    for (let i = 0; i < count; i++) {
      const d = this.dustItems[this.dustCursor];
      this.dustCursor = (this.dustCursor + 1) % this.maxDust;

      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.38;
      const radialSpeed = (isLanding ? 1.15 + clamped * 1.1 : 0.85) * (0.7 + Math.random() * 0.65);
      d.active = true;
      d.life = 0;
      d.maxLife = (isLanding ? 0.42 : 0.32) + Math.random() * 0.24;
      d.baseScale = (isLanding ? 0.85 + clamped * 0.55 : 0.68) * (0.75 + Math.random() * 0.5);
      d.pos.set(
        pos.x + Math.cos(angle) * 0.18,
        pos.y + 0.05 + Math.random() * 0.06,
        pos.z + Math.sin(angle) * 0.18
      );
      d.vel.set(
        Math.cos(angle) * radialSpeed,
        (isLanding ? 0.48 + clamped * 0.35 : 0.32) + Math.random() * 0.4,
        Math.sin(angle) * radialSpeed
      );
    }
  }

  public update(dt: number, groundY = 0): void {
    // 1. Volumetric Muzzle Flash decay
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer = Math.max(0, this.muzzleFlashTimer - dt);
      const ratio = this.muzzleFlashTimer / Math.max(0.001, this.muzzleFlashDuration);
      this.muzzleLight.intensity = this.muzzleLightPeak * ratio * ratio;
      this.muzzleFlameMat.opacity = 0.96 * ratio;
      this.muzzleStarMat.opacity = 0.98 * ratio;
      if (this.muzzleFlashTimer === 0) {
        this.muzzleLight.intensity = 0;
        this.muzzleRig.visible = false;
      }
    }

    // Dynamic impact light decay
    if (this.impactLightTimer > 0) {
      this.impactLightTimer = Math.max(0, this.impactLightTimer - dt);
      const r = this.impactLightTimer / 0.085;
      this.impactLight.intensity *= r;
      if (this.impactLightTimer === 0) this.impactLight.intensity = 0;
    }

    // 2. Traveling Incandescent Bullets + Lingering Supersonic Vapor Ribbons
    for (let i = 0; i < this.tracers.length; i++) {
      const t = this.tracers[i];
      if (!t.active) continue;
      t.elapsed += dt;
      if (t.elapsed >= t.totalDuration) {
        t.active = false;
        t.bulletMesh.visible = false;
        t.vaporMesh.visible = false;
        continue;
      }

      const seg = computeTravelingBulletSegment(
        t.start,
        t.end,
        t.elapsed + 0.014,
        t.speed,
        t.streakLen,
        this.tmpHead,
        this.tmpTail
      );
      if (seg.finished || seg.length < 0.04) {
        t.bulletMesh.visible = false;
      } else {
        this.tmpMid.addVectors(seg.tail, seg.head).multiplyScalar(0.5);
        t.bulletMesh.position.copy(this.tmpMid);
        t.bulletMesh.scale.set(t.widthScale, seg.length, t.widthScale);
        t.bulletMesh.visible = true;
      }

      const vaporFade = Math.max(0, 1 - t.elapsed / t.totalDuration);
      t.vaporMat.opacity = t.vaporOpacityPeak * vaporFade * vaporFade;
    }

    // 3. Impact Flash Stars
    for (let i = 0; i < this.impactFlashes.length; i++) {
      const f = this.impactFlashes[i];
      if (!f.active) continue;
      f.life += dt;
      if (f.life >= f.maxLife) {
        f.active = false;
        f.mesh.visible = false;
      } else {
        const k = f.life / f.maxLife;
        f.mesh.scale.setScalar(f.maxScale * (0.7 + k * 0.75));
        f.mat.opacity = 0.98 * (1 - k);
      }
    }

    // 4. Cooling Hot Impact Slag Embers
    for (let i = 0; i < this.hotEmbers.length; i++) {
      const e = this.hotEmbers[i];
      if (!e.active) continue;
      e.life += dt;
      if (e.life >= e.maxLife) {
        e.active = false;
        e.mesh.visible = false;
      } else {
        const k = e.life / e.maxLife;
        e.mat.opacity = 0.95 * (1 - k) * (1 - k);
      }
    }

    // 5. High-Velocity Molten Sparks
    let sparksDirty = false;
    for (let i = 0; i < this.maxSparks; i++) {
      const s = this.sparks[i];
      if (!s.active) continue;
      sparksDirty = true;
      s.life += dt;
      if (s.life >= s.maxLife) {
        s.active = false;
        this.dummy.scale.setScalar(0);
        this.dummy.updateMatrix();
        this.sparkMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      s.vel.y -= 15.0 * dt;
      s.pos.addScaledVector(s.vel, dt);
      if (s.pos.y < groundY + 0.03) {
        s.pos.y = groundY + 0.03;
        s.vel.y = Math.abs(s.vel.y) * 0.45;
        s.vel.x *= 0.72;
        s.vel.z *= 0.72;
      }

      const fade = 1 - s.life / s.maxLife;
      this.dummy.position.copy(s.pos);
      this.tmpDir.copy(s.pos).add(s.vel);
      this.dummy.lookAt(this.tmpDir);
      this.dummy.scale.set(fade, fade, fade * 1.65);
      this.dummy.updateMatrix();
      this.sparkMesh.setMatrixAt(i, this.dummy.matrix);
    }
    if (sparksDirty) this.sparkMesh.instanceMatrix.needsUpdate = true;

    // 6. Concrete Stone Chips / Impact Debris
    let debrisDirty = false;
    for (let i = 0; i < this.maxDebris; i++) {
      const ch = this.debrisItems[i];
      if (!ch.active) continue;
      debrisDirty = true;
      ch.life += dt;
      if (ch.life >= ch.maxLife) {
        ch.active = false;
        this.dummy.scale.setScalar(0);
        this.dummy.updateMatrix();
        this.debrisMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      ch.vel.y -= 14.2 * dt;
      ch.pos.addScaledVector(ch.vel, dt);
      ch.rot.x += ch.spin.x * dt;
      ch.rot.y += ch.spin.y * dt;
      ch.rot.z += ch.spin.z * dt;
      if (ch.pos.y < groundY + 0.025) {
        ch.pos.y = groundY + 0.025;
        ch.vel.y = Math.abs(ch.vel.y) * 0.34;
        ch.vel.x *= 0.58;
        ch.vel.z *= 0.58;
        ch.spin.multiplyScalar(0.5);
      }

      const fade = ch.life > ch.maxLife * 0.75 ? 1 - (ch.life - ch.maxLife * 0.75) / (ch.maxLife * 0.25) : 1;
      this.dummy.position.copy(ch.pos);
      this.dummy.rotation.copy(ch.rot);
      this.dummy.scale.setScalar(Math.max(0.001, ch.scale * fade));
      this.dummy.updateMatrix();
      this.debrisMesh.setMatrixAt(i, this.dummy.matrix);
    }
    if (debrisDirty) this.debrisMesh.instanceMatrix.needsUpdate = true;

    // 7. Spinning Brass Shell Casings
    let casingsDirty = false;
    for (let i = 0; i < this.maxCasings; i++) {
      const c = this.casings[i];
      if (!c.active) continue;
      casingsDirty = true;
      c.life += dt;
      if (c.life >= 3.4) {
        c.active = false;
        this.dummy.scale.setScalar(0);
        this.dummy.updateMatrix();
        this.casingMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      if (c.pos.y > groundY + 0.02 || c.vel.y > 0) {
        c.vel.y -= 13.5 * dt;
        c.pos.addScaledVector(c.vel, dt);
        c.rot.x += c.spin.x * dt;
        c.rot.y += c.spin.y * dt;
        c.rot.z += c.spin.z * dt;

        if (c.pos.y <= groundY + 0.02) {
          c.pos.y = groundY + 0.02;
          if (!c.bounced) {
            c.bounced = true;
            this.onCasingBounce?.();
          }
          c.vel.y = Math.abs(c.vel.y) > 0.65 ? Math.abs(c.vel.y) * 0.38 : 0;
          c.vel.x *= 0.55;
          c.vel.z *= 0.55;
          c.spin.multiplyScalar(0.5);
        }
      }

      const shrink = c.life > 2.8 ? 1 - (c.life - 2.8) / 0.6 : 1;
      this.dummy.position.copy(c.pos);
      this.dummy.rotation.copy(c.rot);
      this.dummy.scale.setScalar(Math.max(0.001, shrink * c.scale));
      this.dummy.updateMatrix();
      this.casingMesh.setMatrixAt(i, this.dummy.matrix);
    }
    if (casingsDirty) this.casingMesh.instanceMatrix.needsUpdate = true;

    // 8. Gunsmoke Wisps
    let vaporDirty = false;
    for (let i = 0; i < this.maxVapors; i++) {
      const v = this.vapors[i];
      if (!v.active) continue;
      vaporDirty = true;
      v.life += dt;
      if (v.life >= v.maxLife) {
        v.active = false;
        this.dummy.scale.setScalar(0);
        this.dummy.updateMatrix();
        this.vaporMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      v.pos.addScaledVector(v.vel, dt);
      v.vel.multiplyScalar(0.94);
      const t = v.life / v.maxLife;
      const scale = v.baseScale * (0.4 + t * 2.1) * (1 - t);
      this.dummy.position.copy(v.pos);
      this.dummy.rotation.set(t * 2, t * 1.4, 0);
      this.dummy.scale.setScalar(Math.max(0.001, scale));
      this.dummy.updateMatrix();
      this.vaporMesh.setMatrixAt(i, this.dummy.matrix);
    }
    if (vaporDirty) this.vaporMesh.instanceMatrix.needsUpdate = true;

    // 8B. Pressurized Overheat Cryo-Steam Plumes (rapid jet drag + upward thermal curl + billowing expansion!)
    let steamDirty = false;
    const steamDrag = Math.exp(-5.4 * dt);
    for (let i = 0; i < this.maxSteam; i++) {
      const st = this.steamItems[i];
      if (!st.active) continue;
      steamDirty = true;
      st.life += dt;
      if (st.life >= st.maxLife) {
        st.active = false;
        this.dummy.scale.setScalar(0);
        this.dummy.updateMatrix();
        this.steamMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      st.vel.x *= steamDrag;
      st.vel.z *= steamDrag;
      st.vel.y = st.vel.y * Math.exp(-1.6 * dt) + st.buoyancy * dt;
      st.pos.addScaledVector(st.vel, dt);
      st.rotZ += st.spinZ * dt;

      const t = st.life / st.maxLife;
      const fadeEnv = t < 0.14 ? t / 0.14 : 1 - (t - 0.14) / 0.86;
      const billowScale = st.baseScale * (0.24 + Math.pow(t, 0.56) * 1.52) * Math.max(0.05, fadeEnv);
      this.dummy.position.copy(st.pos);
      this.dummy.rotation.set(t * 1.5, t * 2.1, st.rotZ);
      this.dummy.scale.setScalar(Math.max(0.001, billowScale));
      this.dummy.updateMatrix();
      this.steamMesh.setMatrixAt(i, this.dummy.matrix);
    }
    if (steamDirty) this.steamMesh.instanceMatrix.needsUpdate = true;

    // 9. Concrete Dust & Boot Dust Billows
    let dustDirty = false;
    for (let i = 0; i < this.maxDust; i++) {
      const d = this.dustItems[i];
      if (!d.active) continue;
      dustDirty = true;
      d.life += dt;
      if (d.life >= d.maxLife) {
        d.active = false;
        this.dummy.scale.setScalar(0);
        this.dummy.updateMatrix();
        this.dustMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      d.pos.addScaledVector(d.vel, dt);
      const drag = Math.exp(-4.2 * dt);
      d.vel.x *= drag;
      d.vel.z *= drag;
      d.vel.y = Math.max(-0.25, d.vel.y - 1.6 * dt);

      const t = d.life / d.maxLife;
      const envelope = Math.sin(t * Math.PI);
      const scale = d.baseScale * (0.45 + t * 1.55) * Math.max(0.05, envelope);
      this.dummy.position.copy(d.pos);
      this.dummy.rotation.set(t * 1.6, t * 2.1, t * 0.8);
      this.dummy.scale.setScalar(Math.max(0.001, scale));
      this.dummy.updateMatrix();
      this.dustMesh.setMatrixAt(i, this.dummy.matrix);
    }
    if (dustDirty) this.dustMesh.instanceMatrix.needsUpdate = true;

    // 10. Expanding Shock & Blast Rings
    for (let i = 0; i < this.shockRings.length; i++) {
      const r = this.shockRings[i];
      if (!r.active) continue;
      r.life += dt;
      if (r.life >= r.maxLife) {
        r.active = false;
        r.mesh.visible = false;
      } else {
        const t = r.life / r.maxLife;
        const eased = 1 - Math.pow(1 - t, 3);
        const radius = 0.16 + (r.maxRadius - 0.16) * eased;
        r.mesh.scale.setScalar(radius);
        r.mat.opacity = 0.42 * (1 - t) * (1 - t);
      }
    }
  }

  public dispose(): void {
    this.sparkMesh.geometry.dispose();
    (this.sparkMesh.material as THREE.Material).dispose();
    this.debrisMesh.geometry.dispose();
    (this.debrisMesh.material as THREE.Material).dispose();
    this.casingMesh.geometry.dispose();
    (this.casingMesh.material as THREE.Material).dispose();
    this.vaporMesh.geometry.dispose();
    (this.vaporMesh.material as THREE.Material).dispose();
    this.steamMesh.geometry.dispose();
    (this.steamMesh.material as THREE.Material).dispose();
    this.decalMesh.geometry.dispose();
    (this.decalMesh.material as THREE.Material).dispose();
    this.dustMesh.geometry.dispose();
    (this.dustMesh.material as THREE.Material).dispose();
    this.forwardFlames[0]?.geometry.dispose();
    this.lateralJets[0]?.geometry.dispose();
    this.muzzleStar.geometry.dispose();
    this.muzzleFlameMat.dispose();
    this.muzzleStarMat.dispose();
    this.flameTex?.dispose();
    this.starTex?.dispose();
    this.craterTex?.dispose();
    this.smokeTex?.dispose();
    this.steamTex?.dispose();
    this.tracers.forEach((t) => {
      t.bulletMesh.geometry.dispose();
      t.bulletMat.dispose();
      t.vaporMesh.geometry.dispose();
      t.vaporMat.dispose();
    });
    this.impactFlashes.forEach((f) => {
      f.mesh.geometry.dispose();
      f.mat.dispose();
    });
    this.hotEmbers.forEach((e) => {
      e.mesh.geometry.dispose();
      e.mat.dispose();
    });
    this.shockRings.forEach((r) => {
      r.mesh.geometry.dispose();
      r.mat.map?.dispose();
      r.mat.dispose();
    });
  }
}
