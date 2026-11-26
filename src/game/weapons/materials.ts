import * as THREE from 'three';

export interface SharedWeaponMaterials {
  /** CNC-machined dark graphite Cerakote steel (slides, upper receivers) */
  cerakoteSteel: THREE.MeshStandardMaterial;
  /** Matte anodized tactical aluminum (Picatinny rails, handguards, optics shrouds) */
  anodizedRail: THREE.MeshStandardMaterial;
  /** Deep parkerized dark steel (controls, triggers, barrels, compensators, magwells) */
  parkerizedMetal: THREE.MeshStandardMaterial;
  /** Bright machined stainless/nitride steel (fluted barrel accents, bolt face, pins, rods) */
  machinedSteel: THREE.MeshStandardMaterial;
  /** Heat-blued gunmetal (suppressor core, muzzle brake baffles, heat rings) */
  heatBluedSteel: THREE.MeshStandardMaterial;
  /** Diamond/hex micro-stippled tactical polymer (grips, lower frames, foregrips) */
  stippledPolymer: THREE.MeshStandardMaterial;
  /** Matte high-friction vulcanized rubber (stock buttpad, rail covers, mag basepads) */
  matteRubber: THREE.MeshStandardMaterial;
  /** Woven tactical carbon fiber (suppressor sleeve, receiver inlays) */
  carbonFiber: THREE.MeshStandardMaterial;
  /** Polished brass cartridge casing & chambered round rims */
  brassCartridge: THREE.MeshStandardMaterial;
  /** Smoked translucent polycarbonate magazine body (reveals brass rounds inside) */
  smokedPolyMag: THREE.MeshStandardMaterial;
  /** Anti-reflective tinted reflex/holo optic glass (software-WebGL safe) */
  opticGlass: THREE.MeshStandardMaterial;
  /** Dark recessed muzzle bore / port interior */
  boreVoid: THREE.MeshStandardMaterial;
  /** Subtle tan/FDE anodized accent (tactical dials, PEQ-15 selector & body) */
  tacticalFde: THREE.MeshStandardMaterial;
  /** Emissive RMR red-dot reticle plane material */
  rmrReticleMat: THREE.MeshBasicMaterial;
  /** Emissive EOTech holographic ring-dot reticle plane material */
  holoReticleMat: THREE.MeshBasicMaterial;
  /** Bright tactical lens glint (LAM flashlight / PEQ-15 illuminator lens) */
  lensGlass: THREE.MeshStandardMaterial;
}

let cachedMaterials: SharedWeaponMaterials | null = null;

function makeCanvas(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}

function createStippleBumpTexture(): THREE.CanvasTexture | null {
  const c = makeCanvas(256, 256);
  if (!c) return null;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#5a5a5a';
  ctx.fillRect(0, 0, 256, 256);

  // Micro diamond-hex stippling grid with organic hand-stippled variation
  const step = 8;
  for (let y = 0; y < 256; y += step) {
    const rowShift = ((y / step) % 2) * (step * 0.5);
    for (let x = 0; x < 256; x += step) {
      const px = (x + rowShift) % 256;
      const v = 155 + ((Math.sin(px * 12.7 + y * 31.3) * 0.5 + 0.5) * 95);
      ctx.fillStyle = `rgb(${v | 0},${v | 0},${v | 0})`;
      ctx.beginPath();
      ctx.moveTo(px, y + 1);
      ctx.lineTo(px + 3, y + 4);
      ctx.lineTo(px, y + 7);
      ctx.lineTo(px - 3, y + 4);
      ctx.closePath();
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.needsUpdate = true;
  return tex;
}

function createBrushedSteelBumpTexture(): THREE.CanvasTexture | null {
  const c = makeCanvas(256, 256);
  if (!c) return null;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  // Fine CNC horizontal brush grain & subtle gunsmith machining bands
  for (let y = 0; y < 256; y++) {
    const shade = 112 + Math.floor((Math.sin(y * 0.9) * 0.4 + Math.cos(y * 3.7) * 0.6) * 20);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(0, y, 256, 1);
  }
  for (let i = 0; i < 420; i++) {
    const x = (i * 73) % 256;
    const y = (i * 41) % 256;
    const len = 18 + (i % 46);
    const bright = i % 2 === 0 ? 168 : 92;
    ctx.fillStyle = `rgba(${bright},${bright},${bright},0.35)`;
    ctx.fillRect(x, y, len, 1);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.needsUpdate = true;
  return tex;
}

function createCarbonWeaveTexture(): THREE.CanvasTexture | null {
  const c = makeCanvas(128, 128);
  if (!c) return null;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#141921';
  ctx.fillRect(0, 0, 128, 128);
  const cell = 8;
  for (let y = 0; y < 128; y += cell) {
    for (let x = 0; x < 128; x += cell) {
      const alt = ((x + y) / cell) % 2 === 0;
      const g = ctx.createLinearGradient(
        x,
        y,
        alt ? x + cell : x,
        alt ? y : y + cell
      );
      g.addColorStop(0, '#0a0d13');
      g.addColorStop(0.5, '#1d2531');
      g.addColorStop(1, '#080b10');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, cell - 0.5, cell - 0.5);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.needsUpdate = true;
  return tex;
}

function createRmrReticleTexture(): THREE.CanvasTexture | null {
  const c = makeCanvas(128, 128);
  if (!c) return null;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, 128, 128);
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 28);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.22, 'rgba(255, 82, 82, 0.98)');
  grad.addColorStop(0.58, 'rgba(239, 68, 68, 0.42)');
  grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createHoloReticleTexture(): THREE.CanvasTexture | null {
  const c = makeCanvas(128, 128);
  if (!c) return null;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(56, 226, 255, 0.95)';
  ctx.lineWidth = 4;
  ctx.shadowColor = '#06b6d4';
  ctx.shadowBlur = 10;

  // Classic CoD EOTech segmented 65-MOA ring + 4 cardinal ticks + center dot
  ctx.beginPath();
  ctx.arc(64, 64, 34, 0, Math.PI * 2);
  ctx.stroke();

  const ticks: Array<[number, number, number, number]> = [
    [64, 18, 64, 34],
    [64, 94, 64, 110],
    [18, 64, 34, 64],
    [94, 64, 110, 64],
  ];
  for (const [x1, y1, x2, y2] of ticks) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(64, 64, 4.5, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function getSharedWeaponMaterials(): SharedWeaponMaterials {
  if (cachedMaterials) return cachedMaterials;

  const stippleBump = createStippleBumpTexture();
  const steelBump = createBrushedSteelBumpTexture();
  const carbonMap = createCarbonWeaveTexture();
  const rmrTex = createRmrReticleTexture();
  const holoTex = createHoloReticleTexture();

  cachedMaterials = {
    cerakoteSteel: new THREE.MeshStandardMaterial({
      color: 0x353f4d,
      roughness: 0.44,
      metalness: 0.62,
      ...(steelBump ? { bumpMap: steelBump, bumpScale: 0.0025 } : {}),
    }),
    anodizedRail: new THREE.MeshStandardMaterial({
      color: 0x222933,
      roughness: 0.56,
      metalness: 0.54,
      ...(steelBump ? { bumpMap: steelBump, bumpScale: 0.0018 } : {}),
    }),
    parkerizedMetal: new THREE.MeshStandardMaterial({
      color: 0x161b22,
      roughness: 0.64,
      metalness: 0.58,
    }),
    machinedSteel: new THREE.MeshStandardMaterial({
      color: 0x8f9ba8,
      roughness: 0.28,
      metalness: 0.88,
      ...(steelBump ? { bumpMap: steelBump, bumpScale: 0.0015 } : {}),
    }),
    heatBluedSteel: new THREE.MeshStandardMaterial({
      color: 0x252d3a,
      roughness: 0.36,
      metalness: 0.78,
    }),
    stippledPolymer: new THREE.MeshStandardMaterial({
      color: 0x151920,
      roughness: 0.88,
      metalness: 0.08,
      ...(stippleBump ? { bumpMap: stippleBump, bumpScale: 0.0045 } : {}),
    }),
    matteRubber: new THREE.MeshStandardMaterial({
      color: 0x0e1116,
      roughness: 0.95,
      metalness: 0.02,
    }),
    carbonFiber: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      ...(carbonMap ? { map: carbonMap } : {}),
      roughness: 0.38,
      metalness: 0.32,
    }),
    brassCartridge: new THREE.MeshStandardMaterial({
      color: 0xdcb056,
      roughness: 0.24,
      metalness: 0.92,
    }),
    smokedPolyMag: new THREE.MeshStandardMaterial({
      color: 0x1a2029,
      roughness: 0.28,
      metalness: 0.12,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    }),
    opticGlass: new THREE.MeshStandardMaterial({
      color: 0x4fd1e8,
      emissive: 0x083b4c,
      emissiveIntensity: 0.45,
      roughness: 0.08,
      metalness: 0.18,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    boreVoid: new THREE.MeshStandardMaterial({
      color: 0x040507,
      roughness: 0.96,
      metalness: 0.05,
    }),
    tacticalFde: new THREE.MeshStandardMaterial({
      color: 0x6b5c49,
      roughness: 0.72,
      metalness: 0.22,
      ...(stippleBump ? { bumpMap: stippleBump, bumpScale: 0.002 } : {}),
    }),
    rmrReticleMat: new THREE.MeshBasicMaterial({
      color: 0xffffff,
      ...(rmrTex ? { map: rmrTex } : {}),
      transparent: true,
      opacity: 0.96,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    holoReticleMat: new THREE.MeshBasicMaterial({
      color: 0xffffff,
      ...(holoTex ? { map: holoTex } : {}),
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    lensGlass: new THREE.MeshStandardMaterial({
      color: 0xa5f3fc,
      emissive: 0x0e7490,
      emissiveIntensity: 0.85,
      roughness: 0.08,
      metalness: 0.4,
    }),
  };

  return cachedMaterials;
}
