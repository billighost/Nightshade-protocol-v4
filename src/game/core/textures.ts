import * as THREE from 'three';

export interface ProceduralTextureSet {
  concreteColor: THREE.CanvasTexture;
  concreteRoughness: THREE.CanvasTexture;
  concreteBump: THREE.CanvasTexture;
  grateColor: THREE.CanvasTexture;
  grateBump: THREE.CanvasTexture;
  bulkheadColor: THREE.CanvasTexture;
  bulkheadBump: THREE.CanvasTexture;
  hazardColor: THREE.CanvasTexture;
  // High-resolution AAA Operative Armor, Ripstop Tactical Trousers & Combat Shirt Maps
  hexCarbonColor: THREE.CanvasTexture;
  hexCarbonNormal: THREE.CanvasTexture;
  hexCarbonRoughness: THREE.CanvasTexture;
  armorPlateColor: THREE.CanvasTexture;
  armorPlateNormal: THREE.CanvasTexture;
  armorPlateRoughness: THREE.CanvasTexture;
  tacticalTrouserColor: THREE.CanvasTexture;
  tacticalTrouserNormal: THREE.CanvasTexture;
  tacticalTrouserRoughness: THREE.CanvasTexture;
  denimColor: THREE.CanvasTexture;
  denimNormal: THREE.CanvasTexture;
  denimRoughness: THREE.CanvasTexture;
  leatherColor: THREE.CanvasTexture;
  leatherNormal: THREE.CanvasTexture;
  leatherRoughness: THREE.CanvasTexture;
  molleColor: THREE.CanvasTexture;
  molleNormal: THREE.CanvasTexture;
  cyberColor: THREE.CanvasTexture;
  cyberNormal: THREE.CanvasTexture;
  hairNormal: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  holoScreen: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function hash2d(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function valueNoise(x: number, y: number, period = 64): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const x0 = ((xi % period) + period) % period;
  const y0 = ((yi % period) + period) % period;
  const x1 = (x0 + 1) % period;
  const y1 = (y0 + 1) % period;
  const a = hash2d(x0, y0);
  const b = hash2d(x1, y0);
  const c = hash2d(x0, y1);
  const d = hash2d(x1, y1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbmTileable(u: number, v: number, baseFreq: number, octaves = 4): number {
  let sum = 0;
  let amp = 0.5;
  let freq = baseFreq;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(u * freq, v * freq, freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

/**
 * Converts a float heightfield (size x size) into a crisp tangent-space RGB Normal Map canvas
 * using a Sobel gradient filter for authentic 3D lighting on cloth wrinkles, denim twill & leather grain.
 */
function heightfieldToNormalCanvas(
  heights: Float32Array,
  size: number,
  strength: number
): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  const data = img.data;
  const at = (x: number, y: number) =>
    heights[((y + size) % size) * size + ((x + size) % size)];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tl = at(x - 1, y - 1);
      const t = at(x, y - 1);
      const tr = at(x + 1, y - 1);
      const l = at(x - 1, y);
      const r = at(x + 1, y);
      const bl = at(x - 1, y + 1);
      const b = at(x, y + 1);
      const br = at(x + 1, y + 1);

      const dx = (tr + 2 * r + br - (tl + 2 * l + bl)) * strength;
      const dy = (bl + 2 * b + br - (tl + 2 * t + tr)) * strength;
      const dz = 1.0;
      const invLen = 1 / Math.hypot(dx, dy, dz);

      const idx = (y * size + x) * 4;
      data[idx] = Math.round((-dx * invLen * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round((-dy * invLen * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round((dz * invLen * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function configureTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures(renderer: THREE.WebGLRenderer): ProceduralTextureSet {
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const all: THREE.CanvasTexture[] = [];

  // =========================================================================
  // 1. ARENA CONCRETE FLOOR (1.0m x 1.0m slabs on 22m x 28m bay)
  // =========================================================================
  const [cCol, ctxCol] = makeCanvas(512, 512);
  const [cRough, ctxRough] = makeCanvas(512, 512);
  const [cBump, ctxBump] = makeCanvas(512, 512);

  ctxCol.fillStyle = '#141a23';
  ctxCol.fillRect(0, 0, 512, 512);
  ctxRough.fillStyle = '#9a9a9a';
  ctxRough.fillRect(0, 0, 512, 512);
  ctxBump.fillStyle = '#808080';
  ctxBump.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 7000; i++) {
    const x = Math.floor(hash2d(i, 1.3) * 512);
    const y = Math.floor(hash2d(i, 7.9) * 512);
    const s = 1 + Math.floor(hash2d(i, 3.1) * 2);
    const shade = 16 + Math.floor(hash2d(i, 5.7) * 18);
    ctxCol.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 9})`;
    ctxCol.fillRect(x, y, s, s);
    const b = 108 + Math.floor(hash2d(i, 9.2) * 44);
    ctxBump.fillStyle = `rgb(${b},${b},${b})`;
    ctxBump.fillRect(x, y, s, s);
  }

  for (let p = 0; p < 14; p++) {
    const px = hash2d(p, 11.4) * 512;
    const py = hash2d(p, 23.8) * 512;
    const rw = 65 + hash2d(p, 4.2) * 130;
    const rh = 18 + hash2d(p, 8.6) * 32;
    ctxRough.save();
    ctxRough.translate(px, py);
    ctxRough.rotate((hash2d(p, 3.3) - 0.5) * 0.4);
    const grad = ctxRough.createRadialGradient(0, 0, rh * 0.1, 0, 0, rw * 0.5);
    grad.addColorStop(0, 'rgba(34, 34, 34, 0.7)');
    grad.addColorStop(1, 'rgba(154, 154, 154, 0)');
    ctxRough.fillStyle = grad;
    ctxRough.scale(1, rh / rw);
    ctxRough.beginPath();
    ctxRough.arc(0, 0, rw * 0.5, 0, Math.PI * 2);
    ctxRough.fill();
    ctxRough.restore();
  }

  const drawSeam = (ctx: CanvasRenderingContext2D, color: string, width: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    for (const pos of [2, 256]) {
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(512, pos);
      ctx.stroke();
    }
  };
  drawSeam(ctxCol, '#090d13', 4);
  drawSeam(ctxBump, '#222222', 5);
  drawSeam(ctxRough, '#dcdcdc', 4);
  ctxCol.strokeStyle = 'rgba(148, 163, 184, 0.12)';
  ctxCol.lineWidth = 2;
  ctxCol.strokeRect(20, 20, 216, 216);

  const concreteColor = configureTexture(cCol, true, maxAniso, 11, 14);
  const concreteRoughness = configureTexture(cRough, false, maxAniso, 11, 14);
  const concreteBump = configureTexture(cBump, false, maxAniso, 11, 14);
  all.push(concreteColor, concreteRoughness, concreteBump);

  // =========================================================================
  // 2. INDUSTRIAL GRATE, BULKHEAD & HAZARD TRIM
  // =========================================================================
  const [gCol, gCtx] = makeCanvas(256, 256);
  const [gBump, gbCtx] = makeCanvas(256, 256);
  gCtx.fillStyle = '#0c1118';
  gCtx.fillRect(0, 0, 256, 256);
  gbCtx.fillStyle = '#202020';
  gbCtx.fillRect(0, 0, 256, 256);
  gCtx.fillStyle = '#334155';
  gbCtx.fillStyle = '#d8d8d8';
  for (let x = 0; x < 256; x += 32) {
    gCtx.fillRect(x, 0, 8, 256);
    gbCtx.fillRect(x, 0, 8, 256);
  }
  for (let y = 0; y < 256; y += 32) {
    gCtx.fillRect(0, y, 256, 7);
    gbCtx.fillRect(0, y, 256, 7);
  }
  const grateColor = configureTexture(gCol, true, maxAniso, 1, 18);
  const grateBump = configureTexture(gBump, false, maxAniso, 1, 18);
  all.push(grateColor, grateBump);

  const [bCol, bCtx] = makeCanvas(512, 512);
  const [bBump, bbCtx] = makeCanvas(512, 512);
  bCtx.fillStyle = '#18202b';
  bCtx.fillRect(0, 0, 512, 512);
  bbCtx.fillStyle = '#808080';
  bbCtx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 2) {
    const delta = Math.floor(hash2d(y, 4.1) * 10) - 5;
    bCtx.fillStyle = `rgb(${24 + delta}, ${32 + delta}, ${43 + delta})`;
    bCtx.fillRect(0, y, 512, 2);
  }
  const drawPanel = (x: number, y: number, w: number, h: number) => {
    bCtx.strokeStyle = '#0a0f16';
    bCtx.lineWidth = 4;
    bCtx.strokeRect(x, y, w, h);
    bCtx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
    bCtx.lineWidth = 2;
    bCtx.strokeRect(x + 3, y + 3, w - 6, h - 6);
    bbCtx.strokeStyle = '#262626';
    bbCtx.lineWidth = 5;
    bbCtx.strokeRect(x, y, w, h);
  };
  drawPanel(12, 12, 236, 236);
  drawPanel(264, 12, 236, 236);
  drawPanel(12, 264, 488, 236);
  for (let i = 0; i < 6; i++) {
    const ly = 305 + i * 24;
    bCtx.fillStyle = '#0c1118';
    bCtx.fillRect(48, ly, 416, 10);
    bbCtx.fillStyle = '#1d1d1d';
    bbCtx.fillRect(48, ly, 416, 10);
  }
  const bulkheadColor = configureTexture(bCol, true, maxAniso, 8, 2);
  const bulkheadBump = configureTexture(bBump, false, maxAniso, 8, 2);
  all.push(bulkheadColor, bulkheadBump);

  const [hCol, hCtx] = makeCanvas(256, 64);
  hCtx.fillStyle = '#11161f';
  hCtx.fillRect(0, 0, 256, 64);
  hCtx.fillStyle = '#d97706';
  for (let x = -64; x < 320; x += 48) {
    hCtx.beginPath();
    hCtx.moveTo(x, 64);
    hCtx.lineTo(x + 22, 64);
    hCtx.lineTo(x + 48, 0);
    hCtx.lineTo(x + 26, 0);
    hCtx.closePath();
    hCtx.fill();
  }
  const hazardColor = configureTexture(hCol, true, maxAniso, 14, 1);
  all.push(hazardColor);

  // =========================================================================
  // 3. REALISTIC INDIGO-CHARCOAL TACTICAL DENIM (Albedo + Tangent Normal + Roughness)
  //    Authentic 45° fine twill weave, subtle stonewashed organic fading & soft creases
  //    (ZERO horizontal zebra striping!)
  // =========================================================================
  const DSIZE = 512;
  const denimHeight = new Float32Array(DSIZE * DSIZE);
  const [dCol, dCtx] = makeCanvas(DSIZE, DSIZE);
  const [dRough, drCtx] = makeCanvas(DSIZE, DSIZE);
  const dImg = dCtx.createImageData(DSIZE, DSIZE);
  const drImg = drCtx.createImageData(DSIZE, DSIZE);

  for (let y = 0; y < DSIZE; y++) {
    const v = y / DSIZE;
    for (let x = 0; x < DSIZE; x++) {
      const u = x / DSIZE;
      // Crisp micro 45° diagonal denim twill weave
      const twill = Math.sin((x + y) * 1.45) * 0.5 + 0.5;
      const crossWeft = Math.sin((x - y * 0.18) * 2.6) * 0.12;
      const microGrain = hash2d(x, y) * 0.08;

      // Natural organic multi-octave denim wash & soft asymmetric cloth creases
      const washLarge = fbmTileable(u, v, 4, 4);
      const softCrease = fbmTileable(u * 1.5 + washLarge * 0.25, v * 2.5 - washLarge * 0.2, 6, 3);

      // Subtle double-stitched side outseam near u=0.02 and u=0.50
      const distSeamA = Math.min(Math.abs(u - 0.02), Math.abs(u - 0.5));
      const isSeamGroove = distSeamA < 0.0035;
      const isStitchRow = Math.abs(distSeamA - 0.01) < 0.002 && (y % 10 < 5);

      let h = softCrease * 0.44 + washLarge * 0.22 + twill * 0.24 + crossWeft * 0.05 + microGrain;
      if (isSeamGroove) h -= 0.28;
      if (isStitchRow) h += 0.16;
      denimHeight[y * DSIZE + x] = h;

      // Deep weathered charcoal-indigo denim matching operative_outfit_closeup!
      const shade = washLarge * 0.58 + softCrease * 0.42;
      let r = 26 + shade * 24 + twill * 5;
      let g = 33 + shade * 29 + twill * 6;
      let b = 46 + shade * 38 + twill * 8;

      if (isSeamGroove) {
        r *= 0.52;
        g *= 0.52;
        b *= 0.52;
      } else if (isStitchRow) {
        r = 86;
        g = 90;
        b = 98;
      }

      const idx = (y * DSIZE + x) * 4;
      dImg.data[idx] = Math.min(255, Math.max(0, Math.round(r)));
      dImg.data[idx + 1] = Math.min(255, Math.max(0, Math.round(g)));
      dImg.data[idx + 2] = Math.min(255, Math.max(0, Math.round(b)));
      dImg.data[idx + 3] = 255;

      // Consistently matte heavy tactical denim (0.84 .. 0.95)
      const roughVal = Math.round((0.94 - shade * 0.1) * 255);
      drImg.data[idx] = roughVal;
      drImg.data[idx + 1] = roughVal;
      drImg.data[idx + 2] = roughVal;
      drImg.data[idx + 3] = 255;
    }
  }
  dCtx.putImageData(dImg, 0, 0);
  drCtx.putImageData(drImg, 0, 0);
  const dNormCanvas = heightfieldToNormalCanvas(denimHeight, DSIZE, 2.2);

  const denimColor = configureTexture(dCol, true, maxAniso, 1, 1);
  const denimNormal = configureTexture(dNormCanvas, false, maxAniso, 1, 1);
  const denimRoughness = configureTexture(dRough, false, maxAniso, 1, 1);
  all.push(denimColor, denimNormal, denimRoughness);

  // =========================================================================
  // 4. MATTE PEBBLED BIKER LEATHER (Albedo + Tangent Normal + Roughness)
  //    Deep uniform charcoal leather with authentic fine cellular pebble grain &
  //    subtle soft organic tension folds (ZERO blotchy camo or glossy blobs!)
  // =========================================================================
  const LSIZE = 512;
  const leatherHeight = new Float32Array(LSIZE * LSIZE);
  const [lCol, lCtx] = makeCanvas(LSIZE, LSIZE);
  const [lRough, lrCtx] = makeCanvas(LSIZE, LSIZE);
  const lImg = lCtx.createImageData(LSIZE, LSIZE);
  const lrImg = lrCtx.createImageData(LSIZE, LSIZE);

  for (let y = 0; y < LSIZE; y++) {
    const v = y / LSIZE;
    for (let x = 0; x < LSIZE; x++) {
      const u = x / LSIZE;
      // Authentic fine pebbled leather cellular pores (high-freq organic noise)
      const pebbleFine = fbmTileable(u, v, 48, 3);
      const pebbleMid = fbmTileable(u, v, 20, 2);
      // Soft natural leather hide grain variation & gentle organic drape
      const hideTone = fbmTileable(u, v, 5, 3);
      const softFold = fbmTileable(u * 1.2 + hideTone * 0.18, v * 2.0 - hideTone * 0.15, 7, 3);

      // Clean tailored jacket panel seam & stitching
      const seamDist = Math.abs(u - 0.25);
      const seam = seamDist < 0.0035;
      const stitch = Math.abs(seamDist - 0.009) < 0.0018 && (y % 9 < 4);

      let h = pebbleFine * 0.42 + pebbleMid * 0.2 + softFold * 0.38;
      if (seam) h -= 0.25;
      if (stitch) h += 0.14;
      leatherHeight[y * LSIZE + x] = h;

      // Rich uniform matte-charcoal biker leather (matches operative_outfit_closeup!)
      const base = 27 + hideTone * 11 + softFold * 10 + pebbleFine * 6;
      let r = base;
      let g = base + 2;
      let b = base + 5;
      if (seam) {
        r *= 0.55;
        g *= 0.55;
        b *= 0.55;
      } else if (stitch) {
        r = 72;
        g = 77;
        b = 85;
      }

      const idx = (y * LSIZE + x) * 4;
      lImg.data[idx] = Math.min(255, Math.round(r));
      lImg.data[idx + 1] = Math.min(255, Math.round(g));
      lImg.data[idx + 2] = Math.min(255, Math.round(b));
      lImg.data[idx + 3] = 255;

      // Controlled satin-matte pebbled leather sheen (0.58 on worn ridges .. 0.78 in pores)
      const rv = Math.round((0.76 - softFold * 0.12 - pebbleFine * 0.06) * 255);
      lrImg.data[idx] = rv;
      lrImg.data[idx + 1] = rv;
      lrImg.data[idx + 2] = rv;
      lrImg.data[idx + 3] = 255;
    }
  }
  lCtx.putImageData(lImg, 0, 0);
  lrCtx.putImageData(lrImg, 0, 0);
  const lNormCanvas = heightfieldToNormalCanvas(leatherHeight, LSIZE, 2.3);

  const leatherColor = configureTexture(lCol, true, maxAniso, 2, 2);
  const leatherNormal = configureTexture(lNormCanvas, false, maxAniso, 2, 2);
  const leatherRoughness = configureTexture(lRough, false, maxAniso, 2, 2);
  all.push(leatherColor, leatherNormal, leatherRoughness);

  // =========================================================================
  // 5. TACTICAL BALLISTIC CORDURA & MOLLE WEBBING VEST (Albedo + Tangent Normal)
  // =========================================================================
  const MSIZE = 256;
  const molleHeight = new Float32Array(MSIZE * MSIZE);
  const [mCol, mCtx] = makeCanvas(MSIZE, MSIZE);
  const mImg = mCtx.createImageData(MSIZE, MSIZE);

  for (let y = 0; y < MSIZE; y++) {
    const rowBand = y % 42;
    const isMolleStrap = rowBand >= 8 && rowBand <= 30;
    const isBarTack = isMolleStrap && (xModCheck(y) || false);
    void isBarTack;
    for (let x = 0; x < MSIZE; x++) {
      const weave = ((x >> 1) + (y >> 1)) % 2 === 0 ? 0.62 : 0.38;
      const barTack = isMolleStrap && (x % 42 < 4);
      let h = weave * 0.2 + (isMolleStrap ? 0.52 : 0.14);
      if (barTack) h -= 0.15;
      molleHeight[y * MSIZE + x] = h;

      const shade = isMolleStrap ? (barTack ? 18 : 32 + weave * 8) : 20 + weave * 6;
      const idx = (y * MSIZE + x) * 4;
      mImg.data[idx] = Math.round(shade);
      mImg.data[idx + 1] = Math.round(shade + 2);
      mImg.data[idx + 2] = Math.round(shade + 5);
      mImg.data[idx + 3] = 255;
    }
  }
  mCtx.putImageData(mImg, 0, 0);
  const mNormCanvas = heightfieldToNormalCanvas(molleHeight, MSIZE, 2.6);

  const molleColor = configureTexture(mCol, true, maxAniso, 2, 2);
  const molleNormal = configureTexture(mNormCanvas, false, maxAniso, 2, 2);
  all.push(molleColor, molleNormal);

  // =========================================================================
  // 6. WEATHERED BRUSHED TITANIUM CYBERNETIC ARMOR (Albedo + Tangent Normal)
  // =========================================================================
  const CSIZE = 256;
  const cyberHeight = new Float32Array(CSIZE * CSIZE);
  const [cyCol, cyCtx] = makeCanvas(CSIZE, CSIZE);
  const cyImg = cyCtx.createImageData(CSIZE, CSIZE);

  for (let y = 0; y < CSIZE; y++) {
    const streak = hash2d(y, 17.3);
    for (let x = 0; x < CSIZE; x++) {
      const micro = fbmTileable(x / CSIZE, y / CSIZE, 16, 2);
      const panelGroove = y === 84 || y === 172 || x === 128;
      const h = panelGroove ? 0.08 : 0.55 + streak * 0.15 + micro * 0.12;
      cyberHeight[y * CSIZE + x] = h;

      const s = panelGroove ? 28 : 114 + streak * 20 + micro * 16;
      const idx = (y * CSIZE + x) * 4;
      cyImg.data[idx] = Math.round(s * 0.92);
      cyImg.data[idx + 1] = Math.round(s * 0.97);
      cyImg.data[idx + 2] = Math.round(s * 1.05);
      cyImg.data[idx + 3] = 255;
    }
  }
  cyCtx.putImageData(cyImg, 0, 0);
  const cyNormCanvas = heightfieldToNormalCanvas(cyberHeight, CSIZE, 2.2);

  const cyberColor = configureTexture(cyCol, true, maxAniso, 1, 1);
  const cyberNormal = configureTexture(cyNormCanvas, false, maxAniso, 1, 1);
  all.push(cyberColor, cyberNormal);

  // =========================================================================
  // 7. ANISOTROPIC HAIR STRAND NORMAL MAP
  // =========================================================================
  const HSIZE = 256;
  const hairHeight = new Float32Array(HSIZE * HSIZE);
  for (let y = 0; y < HSIZE; y++) {
    for (let x = 0; x < HSIZE; x++) {
      const u = x / HSIZE;
      const v = y / HSIZE;
      const strand = Math.sin(u * Math.PI * 64 + fbmTileable(u, v, 8, 2) * 4.0) * 0.5 + 0.5;
      const clump = fbmTileable(u, v, 14, 3);
      hairHeight[y * HSIZE + x] = strand * 0.45 + clump * 0.55;
    }
  }
  const hairNormCanvas = heightfieldToNormalCanvas(hairHeight, HSIZE, 1.8);
  const hairNormal = configureTexture(hairNormCanvas, false, maxAniso, 2, 2);
  all.push(hairNormal);

  // =========================================================================
  // 8. CONTACT SHADOW & HOLOGRAM PANEL
  // =========================================================================
  const [sCol, sCtx] = makeCanvas(128, 128);
  const sGrad = sCtx.createRadialGradient(64, 64, 8, 64, 64, 60);
  sGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
  sGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.38)');
  sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sCtx.fillStyle = sGrad;
  sCtx.fillRect(0, 0, 128, 128);
  const contactShadow = new THREE.CanvasTexture(sCol);
  contactShadow.colorSpace = THREE.SRGBColorSpace;
  contactShadow.needsUpdate = true;
  all.push(contactShadow);

  const [holoC, holoCtx] = makeCanvas(512, 256);
  holoCtx.fillStyle = '#04141d';
  holoCtx.fillRect(0, 0, 512, 256);
  holoCtx.strokeStyle = 'rgba(6, 182, 212, 0.55)';
  holoCtx.lineWidth = 3;
  holoCtx.strokeRect(10, 10, 492, 236);
  holoCtx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
  holoCtx.lineWidth = 1;
  for (let gx = 32; gx < 512; gx += 32) {
    holoCtx.beginPath();
    holoCtx.moveTo(gx, 12);
    holoCtx.lineTo(gx, 244);
    holoCtx.stroke();
  }
  for (let gy = 32; gy < 256; gy += 32) {
    holoCtx.beginPath();
    holoCtx.moveTo(12, gy);
    holoCtx.lineTo(500, gy);
    holoCtx.stroke();
  }
  holoCtx.strokeStyle = '#06b6d4';
  holoCtx.lineWidth = 2.5;
  holoCtx.beginPath();
  holoCtx.arc(115, 134, 68, 0, Math.PI * 2);
  holoCtx.stroke();
  holoCtx.beginPath();
  holoCtx.arc(115, 134, 42, 0, Math.PI * 2);
  holoCtx.stroke();
  holoCtx.fillStyle = '#f59e0b';
  holoCtx.beginPath();
  holoCtx.arc(138, 112, 5, 0, Math.PI * 2);
  holoCtx.fill();
  holoCtx.fillStyle = '#22d3ee';
  holoCtx.font = 'bold 20px monospace';
  holoCtx.fillText('SECTOR 04 // BALLISTICS BAY', 214, 58);
  holoCtx.fillStyle = 'rgba(34, 211, 238, 0.72)';
  holoCtx.font = '14px monospace';
  holoCtx.fillText('CONTAINMENT: ACTIVE', 214, 92);
  holoCtx.fillText('LIVE FIRE: AUTHORIZED', 214, 116);
  for (let i = 0; i < 6; i++) {
    const w = 85 + ((i * 47) % 140);
    holoCtx.fillStyle = i === 4 ? '#f59e0b' : 'rgba(6, 182, 212, 0.75)';
    holoCtx.fillRect(214, 136 + i * 16, w, 9);
  }
  const holoScreen = new THREE.CanvasTexture(holoC);
  holoScreen.colorSpace = THREE.SRGBColorSpace;
  holoScreen.anisotropy = maxAniso;
  holoScreen.needsUpdate = true;
  all.push(holoScreen);

  // =========================================================================
  // 9. RAW MATTE BALLISTIC CORDURA COMBAT SHIRT FABRIC (Albedo + Normal + Roughness)
  //    Tactical micro-ripstop hex/cordura weave + stitched seams + organic cloth folds
  // =========================================================================
  const HXSIZE = 512;
  const hexHeight = new Float32Array(HXSIZE * HXSIZE);
  const [hxCol, hxCtx] = makeCanvas(HXSIZE, HXSIZE);
  const [hxRough, hxrCtx] = makeCanvas(HXSIZE, HXSIZE);
  const hxImg = hxCtx.createImageData(HXSIZE, HXSIZE);
  const hxrImg = hxrCtx.createImageData(HXSIZE, HXSIZE);

  const hexScale = 52;
  const sqrt3 = Math.sqrt(3);
  for (let y = 0; y < HXSIZE; y++) {
    const v = y / HXSIZE;
    for (let x = 0; x < HXSIZE; x++) {
      const u = x / HXSIZE;
      const px = u * hexScale;
      const py = v * hexScale * (2 / sqrt3);
      const ix = Math.floor(px);
      const iy = Math.floor(py);
      let minDist = 10;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const cx = ix + ox + ((iy + oy) & 1) * 0.5;
          const cy = iy + oy;
          const dx = px - cx;
          const dy = (py - cy) * (sqrt3 * 0.5);
          const hexD = Math.max(Math.abs(dx) * 0.866 + Math.abs(dy) * 0.5, Math.abs(dy));
          if (hexD < minDist) minDist = hexD;
        }
      }
      const cellDome = Math.max(0, Math.min(1, (0.45 - minDist) / 0.14));
      const corduraWeave = ((x % 4 < 2 ? 1 : 0) ^ (y % 4 < 2 ? 1 : 0)) * 0.14;
      const organicFold = fbmTileable(u * 1.4, v * 2.2, 6, 4);
      const fineGrit = hash2d(x * 1.7, y * 1.3) * 0.08;

      // Subtle double-stitched athletic sleeve/torso seam
      const seamDist = Math.abs(u - 0.5);
      const isSeam = seamDist < 0.004;
      const isStitch = Math.abs(seamDist - 0.011) < 0.0022 && (y % 8 < 4);

      let h = cellDome * 0.34 + corduraWeave * 0.2 + organicFold * 0.52 + fineGrit;
      if (isSeam) h -= 0.3;
      if (isStitch) h += 0.18;
      hexHeight[y * HXSIZE + x] = h;

      // Raw matte tactical graphite-charcoal combat cloth with subtle wear
      let shade = 25 + cellDome * 8 + organicFold * 15 + corduraWeave * 5 + fineGrit * 7;
      if (isSeam) shade *= 0.54;
      if (isStitch) shade += 18;
      const idx = (y * HXSIZE + x) * 4;
      hxImg.data[idx] = Math.min(255, Math.round(shade * 0.97));
      hxImg.data[idx + 1] = Math.min(255, Math.round(shade * 1.0));
      hxImg.data[idx + 2] = Math.min(255, Math.round(shade * 1.06));
      hxImg.data[idx + 3] = 255;

      // Bone-dry matte cloth roughness (0.90 .. 0.98 — ZERO plastic shine!)
      const rv = Math.round((0.97 - cellDome * 0.05 - fineGrit * 0.03) * 255);
      hxrImg.data[idx] = rv;
      hxrImg.data[idx + 1] = rv;
      hxrImg.data[idx + 2] = rv;
      hxrImg.data[idx + 3] = 255;
    }
  }
  hxCtx.putImageData(hxImg, 0, 0);
  hxrCtx.putImageData(hxrImg, 0, 0);
  const hxNormCanvas = heightfieldToNormalCanvas(hexHeight, HXSIZE, 1.85);

  const hexCarbonColor = configureTexture(hxCol, true, maxAniso, 2, 2);
  const hexCarbonNormal = configureTexture(hxNormCanvas, false, maxAniso, 2, 2);
  const hexCarbonRoughness = configureTexture(hxRough, false, maxAniso, 2, 2);
  all.push(hexCarbonColor, hexCarbonNormal, hexCarbonRoughness);

  // =========================================================================
  // 10. RAW BATTLE-WORN SANDBLASTED CERAMIC/CARBON BALLISTIC ARMOR
  //     (Albedo + Tangent Normal + Roughness — ZERO shiny smooth plastic!)
  // =========================================================================
  const ASIZE = 512;
  const armorHeight = new Float32Array(ASIZE * ASIZE);
  const [aCol, aCtx] = makeCanvas(ASIZE, ASIZE);
  const [aRough, arCtx] = makeCanvas(ASIZE, ASIZE);
  const aImg = aCtx.createImageData(ASIZE, ASIZE);
  const arImg = arCtx.createImageData(ASIZE, ASIZE);

  // Pre-generate subtle, realistic battle-wear hairline scuffs (NO bright confetti speckles!)
  const scratches: Array<{ x0: number; y0: number; dx: number; dy: number; len: number; w: number }> = [];
  for (let s = 0; s < 16; s++) {
    const x0 = hash2d(s, 3.1) * ASIZE;
    const y0 = hash2d(s, 9.7) * ASIZE;
    const ang = hash2d(s, 14.3) * Math.PI * 2;
    const len = 18 + hash2d(s, 21.5) * 44;
    scratches.push({
      x0,
      y0,
      dx: Math.cos(ang),
      dy: Math.sin(ang),
      len,
      w: 0.65 + hash2d(s, 29.1) * 0.55,
    });
  }

  for (let y = 0; y < ASIZE; y++) {
    const v = y / ASIZE;
    for (let x = 0; x < ASIZE; x++) {
      const u = x / ASIZE;
      // Sandblasted ceramic powder-coat micro-stipple + subtle ballistic carbon weave
      const stipple = fbmTileable(u, v, 44, 3);
      const grit = hash2d(x * 2.1, y * 1.9);
      const weave = ((Math.floor(x / 5) + Math.floor(y / 5)) % 2 === 0 ? 1 : 0) * 0.1;
      const patina = fbmTileable(u, v, 7, 4);
      const grimePatch = fbmTileable(u * 2.0 + 0.31, v * 2.0 + 0.17, 10, 3);

      // Subtle machined ballistic panel seam grooves & countersunk micro-fasteners
      const seamH = Math.abs(v - 0.5) < 0.0045;
      const seamV = Math.abs(u - 0.25) < 0.0045 || Math.abs(u - 0.75) < 0.0045;
      const isSeam = seamH || seamV;

      // Countersunk rivets spaced neatly near horizontal panel seam
      const rivetRx = ((x + 16) % 64) - 32;
      const rivetRy = y - 238;
      const rivetRy2 = y - 274;
      const rDist = Math.min(Math.hypot(rivetRx, rivetRy), Math.hypot(rivetRx, rivetRy2));
      const isRivetRim = rDist >= 2.2 && rDist < 4.0;
      const isRivetPit = rDist < 2.2;

      let h = 0.52 + stipple * 0.24 + grit * 0.12 + weave * 0.16 + patina * 0.14;
      if (isSeam) h -= 0.36;
      if (isRivetRim) h += 0.12;
      if (isRivetPit) h -= 0.28;
      armorHeight[y * ASIZE + x] = h;

      // Raw matte charcoal-gunmetal ceramic composite with natural dust & grime variation
      let base = 44 + patina * 18 + stipple * 10 + grit * 8 + weave * 6;
      if (grimePatch > 0.62) {
        // Subtle dusty concrete/carbon field smudge
        base += (grimePatch - 0.62) * 26;
      }
      if (isSeam) base *= 0.45;
      if (isRivetPit) base *= 0.48;
      if (isRivetRim) base += 12;

      const idx = (y * ASIZE + x) * 4;
      aImg.data[idx] = Math.min(255, Math.round(base * 0.96));
      aImg.data[idx + 1] = Math.min(255, Math.round(base * 1.0));
      aImg.data[idx + 2] = Math.min(255, Math.round(base * 1.05));
      aImg.data[idx + 3] = 255;

      // Ultra-matte battle-worn roughness (0.80 .. 0.96 — kills ALL smooth shiny reflections!)
      let rough = 0.92 - stipple * 0.07 - patina * 0.05 + (grimePatch > 0.62 ? 0.05 : 0);
      if (isSeam || isRivetPit) rough = 0.97;
      const rv = Math.min(255, Math.max(175, Math.round(rough * 255)));
      arImg.data[idx] = rv;
      arImg.data[idx + 1] = rv;
      arImg.data[idx + 2] = rv;
      arImg.data[idx + 3] = 255;
    }
  }

  // Stamp subtle dark hairline wear scuffs into height, albedo & roughness (authentic muted battle wear)
  for (const sc of scratches) {
    const steps = Math.ceil(sc.len * 1.5);
    for (let k = 0; k <= steps; k++) {
      const f = k / steps;
      const fade = Math.sin(f * Math.PI);
      const px = Math.round(sc.x0 + sc.dx * sc.len * f);
      const py = Math.round(sc.y0 + sc.dy * sc.len * f);
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (Math.hypot(ox, oy) > sc.w) continue;
          const xx = ((px + ox) % ASIZE + ASIZE) % ASIZE;
          const yy = ((py + oy) % ASIZE + ASIZE) % ASIZE;
          const pIdx = yy * ASIZE + xx;
          armorHeight[pIdx] -= 0.14 * fade;
          const idx = pIdx * 4;
          // Muted charcoal-steel wear line (subtle +7 lift, never white dots)
          const boost = Math.round(7 * fade);
          aImg.data[idx] = Math.min(255, aImg.data[idx] + boost);
          aImg.data[idx + 1] = Math.min(255, aImg.data[idx + 1] + boost);
          aImg.data[idx + 2] = Math.min(255, aImg.data[idx + 2] + Math.round(boost * 1.05));
          arImg.data[idx] = Math.max(185, arImg.data[idx] - Math.round(16 * fade));
          arImg.data[idx + 1] = arImg.data[idx];
          arImg.data[idx + 2] = arImg.data[idx];
        }
      }
    }
  }

  aCtx.putImageData(aImg, 0, 0);
  arCtx.putImageData(arImg, 0, 0);
  const aNormCanvas = heightfieldToNormalCanvas(armorHeight, ASIZE, 2.25);

  const armorPlateColor = configureTexture(aCol, true, maxAniso, 2, 2);
  const armorPlateNormal = configureTexture(aNormCanvas, false, maxAniso, 2, 2);
  const armorPlateRoughness = configureTexture(aRough, false, maxAniso, 2, 2);
  all.push(armorPlateColor, armorPlateNormal, armorPlateRoughness);

  // =========================================================================
  // 11. CRYE-G3 SPEC-OPS RIPSTOP TACTICAL COMBAT TROUSER TEXTURE SUITE
  //     (Albedo + Tangent Normal + Roughness — visible ripstop crosshatch grid,
  //      double-stitched seams, deep diagonal fabric wrinkles, & field grit!)
  // =========================================================================
  const TSIZE = 512;
  const trouserHeight = new Float32Array(TSIZE * TSIZE);
  const [tCol, tCtx] = makeCanvas(TSIZE, TSIZE);
  const [tRough, trCtx] = makeCanvas(TSIZE, TSIZE);
  const tImg = tCtx.createImageData(TSIZE, TSIZE);
  const trImg = trCtx.createImageData(TSIZE, TSIZE);

  for (let y = 0; y < TSIZE; y++) {
    const v = y / TSIZE;
    for (let x = 0; x < TSIZE; x++) {
      const u = x / TSIZE;

      // Authentic fine military NYCO Ripstop micro-weave (subtle dark-on-dark thread, NOT graph paper!)
      const ripX = x % 8 === 0 ? 1.0 : 0;
      const ripY = y % 8 === 0 ? 1.0 : 0;
      const ripGrid = Math.max(ripX, ripY);
      const microTwill = Math.sin((x + y) * 1.85) * 0.5 + 0.5;
      const threadGrain = hash2d(x * 1.9, y * 1.7) * 0.12;

      // Rich organic trouser drapery wrinkles (deep diagonal pull lines around knee/thigh/hem!)
      const clothWash = fbmTileable(u, v, 4, 4);
      const wrinkleMacro = fbmTileable(u * 1.15 + clothWash * 0.28, v * 3.0 - clothWash * 0.22, 5, 4);
      const wrinkleDiag =
        Math.sin((u * 2.5 + v * 6.5 + clothWash * 1.45) * Math.PI * 2) * 0.5 + 0.5;
      const wrinkleFine = fbmTileable(u * 2.4 - wrinkleMacro * 0.24, v * 4.8 + wrinkleMacro * 0.28, 8, 3);
      const foldField = wrinkleMacro * 0.5 + wrinkleDiag * 0.22 + wrinkleFine * 0.28;

      // Double-needle heavy felled trouser outseam/inseam (at u=0.02 & u=0.50) + subtle knee panel seam
      const distSide = Math.min(Math.abs(u - 0.02), Math.abs(u - 0.5));
      const distHorizSeam = Math.min(Math.abs(v - 0.42), Math.abs(v - 0.76));
      const isSeamGroove = distSide < 0.004 || distHorizSeam < 0.003;
      const isStitchA = Math.abs(distSide - 0.01) < 0.002 && (y % 8 < 4);
      const isStitchB = Math.abs(distSide - 0.017) < 0.002 && ((y + 2) % 8 < 4);
      const isHorizStitch = Math.abs(distHorizSeam - 0.008) < 0.0018 && (x % 8 < 4);
      const isStitch = isStitchA || isStitchB || isHorizStitch;

      // Subtle puckering next to stitched seams for ultra-authentic cloth look!
      const pucker =
        distSide < 0.036 ? Math.sin(y * 0.26 + clothWash * 5.2) * (1 - distSide / 0.036) * 0.2 : 0;

      let h =
        foldField * 0.68 +
        ripGrid * 0.09 +
        microTwill * 0.08 +
        threadGrain * 0.8 +
        pucker;
      if (isSeamGroove) h -= 0.36;
      if (isStitch) h += 0.16;
      trouserHeight[y * TSIZE + x] = h;

      // Raw weathered dark Wolf-Grey / Charcoal Crye-G3 combat cloth with deep fold AO & subtle dust patina
      const dustWear = fbmTileable(u + 0.4, v + 0.2, 6, 3);
      const shade = clothWash * 0.34 + foldField * 0.66;
      let r = 24 + shade * 24 + ripGrid * 2.5 + microTwill * 2.5 + dustWear * 5;
      let g = 27 + shade * 26 + ripGrid * 2.5 + microTwill * 2.5 + dustWear * 5;
      let b = 32 + shade * 29 + ripGrid * 2.8 + microTwill * 3.0 + dustWear * 4.5;

      // Rich ambient occlusion darkening inside deep wrinkle creases so 3D folds pop!
      if (foldField < 0.44) {
        const ao = 0.68 + (foldField / 0.44) * 0.32;
        r *= ao;
        g *= ao;
        b *= ao;
      }

      if (isSeamGroove) {
        r *= 0.46;
        g *= 0.46;
        b *= 0.46;
      } else if (isStitch) {
        r = 66;
        g = 70;
        b = 76;
      }

      const idx = (y * TSIZE + x) * 4;
      tImg.data[idx] = Math.min(255, Math.max(0, Math.round(r)));
      tImg.data[idx + 1] = Math.min(255, Math.max(0, Math.round(g)));
      tImg.data[idx + 2] = Math.min(255, Math.max(0, Math.round(b)));
      tImg.data[idx + 3] = 255;

      // Bone-dry matte cotton-nylon ripstop roughness (0.92 .. 0.99 — ZERO shine!)
      const rv = Math.min(255, Math.round((0.99 - ripGrid * 0.025 - shade * 0.04) * 255));
      trImg.data[idx] = rv;
      trImg.data[idx + 1] = rv;
      trImg.data[idx + 2] = rv;
      trImg.data[idx + 3] = 255;
    }
  }

  tCtx.putImageData(tImg, 0, 0);
  trCtx.putImageData(trImg, 0, 0);
  const tNormCanvas = heightfieldToNormalCanvas(trouserHeight, TSIZE, 2.85);

  const tacticalTrouserColor = configureTexture(tCol, true, maxAniso, 1, 2);
  const tacticalTrouserNormal = configureTexture(tNormCanvas, false, maxAniso, 1, 2);
  const tacticalTrouserRoughness = configureTexture(tRough, false, maxAniso, 1, 2);
  all.push(tacticalTrouserColor, tacticalTrouserNormal, tacticalTrouserRoughness);

  return {
    concreteColor,
    concreteRoughness,
    concreteBump,
    grateColor,
    grateBump,
    bulkheadColor,
    bulkheadBump,
    hazardColor,
    hexCarbonColor,
    hexCarbonNormal,
    hexCarbonRoughness,
    armorPlateColor,
    armorPlateNormal,
    armorPlateRoughness,
    tacticalTrouserColor,
    tacticalTrouserNormal,
    tacticalTrouserRoughness,
    denimColor,
    denimNormal,
    denimRoughness,
    leatherColor,
    leatherNormal,
    leatherRoughness,
    molleColor,
    molleNormal,
    cyberColor,
    cyberNormal,
    hairNormal,
    contactShadow,
    holoScreen,
    dispose: () => {
      all.forEach((t) => t.dispose());
    },
  };
}

function xModCheck(_y: number): boolean {
  return false;
}
