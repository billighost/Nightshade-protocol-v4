import * as THREE from 'three';

export interface MonolithArchonTextureSuite {
  obsidianMap: THREE.CanvasTexture;
  obsidianBump: THREE.CanvasTexture;
  obsidianRoughness: THREE.CanvasTexture;
  obsidianVeinEmissive: THREE.CanvasTexture;
  titaniumMap: THREE.CanvasTexture;
  titaniumBump: THREE.CanvasTexture;
  titaniumRoughness: THREE.CanvasTexture;
  goldMap: THREE.CanvasTexture;
  goldBump: THREE.CanvasTexture;
  goldRoughness: THREE.CanvasTexture;
  mantleMap: THREE.CanvasTexture;
  mantleBump: THREE.CanvasTexture;
  mantleRoughness: THREE.CanvasTexture;
  singularityMap: THREE.CanvasTexture;
  crystalMap: THREE.CanvasTexture;
  sanctuarySigilMap: THREE.CanvasTexture;
  beamFluxMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) {
    throw new Error('Could not acquire 2D canvas context for Monolith Archon textures');
  }
  return [c, ctx];
}

function hash2(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

/** Smooth tileable 2D value noise for photorealistic mineral & metal micro-variation. */
function tileNoise(u: number, v: number, period: number, seed: number): number {
  const x = u * period;
  const y = v * period;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const ix0 = ((x0 % period) + period) % period;
  const iy0 = ((y0 % period) + period) % period;
  const ix1 = (ix0 + 1) % period;
  const iy1 = (iy0 + 1) % period;
  const a = hash2(ix0, iy0, seed);
  const b = hash2(ix1, iy0, seed);
  const c = hash2(ix0, iy1, seed);
  const d = hash2(ix1, iy1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function tileFbm(u: number, v: number, basePeriod: number, seed: number): number {
  let sum = 0;
  let amp = 0.52;
  let p = basePeriod;
  let norm = 0;
  for (let oct = 0; oct < 4; oct++) {
    sum += tileNoise(u, v, p, seed + oct * 19) * amp;
    norm += amp;
    p *= 2;
    amp *= 0.5;
  }
  return sum / norm;
}

function configureTex(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  srgb: boolean
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  if (srgb) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates museum-grade photorealistic procedural PBR CanvasTextures for
 * Floor 06 Final Boss — THE MONOLITH ARCHON:
 * 1. Veined Nero-Marquina Volcanic Obsidian Stone (1024×1024 albedo + bump + roughness + Phase-2 molten vein emissive mask)
 *    using true 4-octave FBM mineral turbulence & organic golden-quartz kintsugi fractures (zero tiled brick stripes!).
 * 2. Brushed Aerospace Gunmetal-Titanium Plating (1024×1024 albedo + bump + roughness) for stark material contrast.
 * 3. Hand-Hammered & Chased Sovereign Cathedral Antique Gold (1024×1024 albedo + bump + roughness) with realistic patina.
 * 4. Royal Obsidian-Velvet Cathedral Brocade Mantle (512×512 albedo + bump + roughness) with woven gold damask.
 * 5. Gravitational Event-Horizon Singularity Core (512×512 swirling accretion vortex + obsidian center).
 * 6. Faceted Astral-Crystal Refraction Map (512×512) for wing pinion crystals & jewels.
 * 7. Sacred Cathedral Astrolabe Floor Sanctuary Sigil (1024×1024) + Volumetric Plasma Beam Flux Sheet (512×512).
 */
export function createMonolithArchonTextures(): MonolithArchonTextureSuite {
  const S = 1024;
  const M = 512;

  // ── 1. Veined Nero-Marquina Volcanic Obsidian Stone (1024×1024) ──
  const [obsC, obsCtx] = makeCanvas(S, S);
  const [obsBumpC, obsBumpCtx] = makeCanvas(S, S);
  const [obsRoughC, obsRoughCtx] = makeCanvas(S, S);
  const [obsVeinC, obsVeinCtx] = makeCanvas(S, S);

  // Pixel-level 4-octave FBM mineral cloud base (rendered at 256×256 and smoothly upscaled to 1024×1024)
  const N = 256;
  const [tmpC, tmpCtx] = makeCanvas(N, N);
  const [tmpBumpC, tmpBumpCtx] = makeCanvas(N, N);
  const [tmpRoughC, tmpRoughCtx] = makeCanvas(N, N);
  const imgA = tmpCtx.createImageData(N, N);
  const imgB = tmpBumpCtx.createImageData(N, N);
  const imgR = tmpRoughCtx.createImageData(N, N);

  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const n1 = tileFbm(u, v, 5, 13);
      const n2 = tileFbm(u + n1 * 0.22, v - n1 * 0.18, 9, 41);
      const ridge = 1.0 - Math.abs(n2 * 2 - 1);
      const idx = (y * N + x) * 4;

      // Deep volcanic obsidian with subtle mineral slate clouds & warm iron undertone
      const baseLum = 13 + n1 * 22 + ridge * ridge * 16;
      imgA.data[idx] = Math.min(255, Math.floor(baseLum * 0.94));
      imgA.data[idx + 1] = Math.min(255, Math.floor(baseLum * 0.98));
      imgA.data[idx + 2] = Math.min(255, Math.floor(baseLum * 1.18 + n2 * 6));
      imgA.data[idx + 3] = 255;

      // Natural fractured basalt surface micro-relief
      const bVal = Math.max(0, Math.min(255, Math.floor(96 + n1 * 48 + ridge * 38)));
      imgB.data[idx] = bVal;
      imgB.data[idx + 1] = bVal;
      imgB.data[idx + 2] = bVal;
      imgB.data[idx + 3] = 255;

      // Contrast between glassy obsidian facets (low roughness ~54) and mineral matte grain (~150)
      const rVal = Math.max(38, Math.min(210, Math.floor(148 - ridge * 78 + (1 - n1) * 32)));
      imgR.data[idx] = rVal;
      imgR.data[idx + 1] = rVal;
      imgR.data[idx + 2] = rVal;
      imgR.data[idx + 3] = 255;
    }
  }
  tmpCtx.putImageData(imgA, 0, 0);
  tmpBumpCtx.putImageData(imgB, 0, 0);
  tmpRoughCtx.putImageData(imgR, 0, 0);

  obsCtx.imageSmoothingEnabled = true;
  obsCtx.drawImage(tmpC, 0, 0, S, S);
  obsBumpCtx.imageSmoothingEnabled = true;
  obsBumpCtx.drawImage(tmpBumpC, 0, 0, S, S);
  obsRoughCtx.imageSmoothingEnabled = true;
  obsRoughCtx.drawImage(tmpRoughC, 0, 0, S, S);

  obsVeinCtx.fillStyle = '#000000';
  obsVeinCtx.fillRect(0, 0, S, S);

  // Fine volcanic micro-crystalline quartz flecks & specular obsidian chips
  for (let i = 0; i < 6500; i++) {
    const x = hash2(i, 1, 29) * S;
    const y = hash2(i, 2, 29) * S;
    const sz = 1 + hash2(i, 3, 29) * 2.2;
    const pick = hash2(i, 4, 29);
    if (pick > 0.84) {
      obsCtx.fillStyle = 'rgba(135, 148, 172, 0.16)';
      obsRoughCtx.fillStyle = 'rgba(32, 32, 32, 0.55)';
      obsBumpCtx.fillStyle = 'rgba(165, 165, 165, 0.3)';
    } else if (pick < 0.22) {
      obsCtx.fillStyle = 'rgba(4, 5, 8, 0.44)';
      obsRoughCtx.fillStyle = 'rgba(205, 205, 205, 0.48)';
      obsBumpCtx.fillStyle = 'rgba(64, 64, 64, 0.42)';
    } else {
      obsCtx.fillStyle = 'rgba(36, 40, 52, 0.14)';
      obsRoughCtx.fillStyle = 'rgba(115, 115, 115, 0.22)';
      obsBumpCtx.fillStyle = 'rgba(128, 128, 128, 0.18)';
    }
    obsCtx.fillRect(x, y, sz, sz);
    obsRoughCtx.fillRect(x, y, sz, sz);
    obsBumpCtx.fillRect(x, y, sz, sz);
  }

  // Organic Nero-Marquina Kintsugi Golden-Quartz Veins (wandering natural stone fractures!)
  const drawNaturalVein = (
    startX: number,
    startY: number,
    dirAngle: number,
    steps: number,
    maxWidth: number,
    seed: number,
    goldVein: boolean
  ) => {
    let px = startX;
    let py = startY;
    let ang = dirAngle;

    for (let st = 0; st < steps; st++) {
      const frac = st / steps;
      const taper = Math.sin(frac * Math.PI) * 0.85 + 0.15;
      const lw = Math.max(0.7, maxWidth * taper);
      ang += (hash2(st, seed, 77) - 0.5) * 0.62;
      const segLen = 14 + hash2(st, seed + 5, 77) * 18;
      const nx = px + Math.cos(ang) * segLen;
      const ny = py + Math.sin(ang) * segLen;

      // Subtle dark fracture shadow edge
      obsCtx.strokeStyle = 'rgba(4, 4, 6, 0.72)';
      obsCtx.lineWidth = lw + 2.6;
      obsCtx.beginPath();
      obsCtx.moveTo(px, py);
      obsCtx.lineTo(nx, ny);
      obsCtx.stroke();

      // Main mineral / kintsugi gold-quartz vein
      obsCtx.strokeStyle = goldVein
        ? `rgba(202, 154, 62, ${0.42 + taper * 0.44})`
        : `rgba(118, 126, 146, ${0.18 + taper * 0.24})`;
      obsCtx.lineWidth = lw;
      obsCtx.beginPath();
      obsCtx.moveTo(px, py);
      obsCtx.lineTo(nx, ny);
      obsCtx.stroke();

      // Recessed fracture groove in bump map
      obsBumpCtx.strokeStyle = 'rgba(26, 26, 26, 0.78)';
      obsBumpCtx.lineWidth = lw + 1.8;
      obsBumpCtx.beginPath();
      obsBumpCtx.moveTo(px, py);
      obsBumpCtx.lineTo(nx, ny);
      obsBumpCtx.stroke();

      // Polished metallic gold specular glint inside kintsugi vein
      if (goldVein) {
        obsRoughCtx.strokeStyle = 'rgba(34, 34, 34, 0.85)';
        obsRoughCtx.lineWidth = lw;
        obsRoughCtx.beginPath();
        obsRoughCtx.moveTo(px, py);
        obsRoughCtx.lineTo(nx, ny);
        obsRoughCtx.stroke();

        // Phase 2 molten magma emissive mask follows the primary golden stone fractures!
        obsVeinCtx.strokeStyle = `rgba(255, 196, 86, ${0.35 + taper * 0.65})`;
        obsVeinCtx.lineWidth = Math.max(1.2, lw * 1.15);
        obsVeinCtx.beginPath();
        obsVeinCtx.moveTo(px, py);
        obsVeinCtx.lineTo(nx, ny);
        obsVeinCtx.stroke();
      }

      // Occasional fine offshoot hair-crack
      if (st > 3 && st % 7 === 0 && maxWidth > 1.8) {
        const bAng = ang + (hash2(st, seed + 13, 77) > 0.5 ? 0.68 : -0.68);
        const bx = nx + Math.cos(bAng) * 34;
        const by = ny + Math.sin(bAng) * 34;
        obsCtx.strokeStyle = goldVein ? 'rgba(186, 138, 52, 0.36)' : 'rgba(102, 110, 128, 0.2)';
        obsCtx.lineWidth = lw * 0.45;
        obsCtx.beginPath();
        obsCtx.moveTo(nx, ny);
        obsCtx.lineTo(bx, by);
        obsCtx.stroke();
        if (goldVein) {
          obsVeinCtx.strokeStyle = 'rgba(255, 145, 52, 0.42)';
          obsVeinCtx.lineWidth = Math.max(0.8, lw * 0.5);
          obsVeinCtx.beginPath();
          obsVeinCtx.moveTo(nx, ny);
          obsVeinCtx.lineTo(bx, by);
          obsVeinCtx.stroke();
        }
      }

      px = nx;
      py = ny;
    }
  };

  // 14 major organic obsidian fractures & kintsugi gold-leaf mineral veins
  for (let i = 0; i < 14; i++) {
    const sx = hash2(i, 1, 103) * S;
    const sy = hash2(i, 2, 103) * S;
    const dir = hash2(i, 3, 103) * Math.PI * 2;
    const isGold = i < 8;
    drawNaturalVein(sx, sy, dir, 22 + Math.floor(hash2(i, 4, 103) * 18), isGold ? 2.6 : 1.7, i * 17, isGold);
  }

  // Subtle architectural stone seam lines (wide spacing — 2x2 monumental slabs, NOT busy bricks!)
  const drawSubtleStoneSeam = (x1: number, y1: number, x2: number, y2: number) => {
    obsCtx.strokeStyle = 'rgba(4, 5, 8, 0.78)';
    obsCtx.lineWidth = 4;
    obsCtx.beginPath();
    obsCtx.moveTo(x1, y1);
    obsCtx.lineTo(x2, y2);
    obsCtx.stroke();

    obsCtx.strokeStyle = 'rgba(128, 138, 160, 0.16)';
    obsCtx.lineWidth = 1.5;
    obsCtx.beginPath();
    obsCtx.moveTo(x1 + 3, y1 + 3);
    obsCtx.lineTo(x2 + 3, y2 + 3);
    obsCtx.stroke();

    obsBumpCtx.strokeStyle = '#242424';
    obsBumpCtx.lineWidth = 5;
    obsBumpCtx.beginPath();
    obsBumpCtx.moveTo(x1, y1);
    obsBumpCtx.lineTo(x2, y2);
    obsBumpCtx.stroke();

    obsRoughCtx.strokeStyle = '#c8c8c8';
    obsRoughCtx.lineWidth = 5;
    obsRoughCtx.beginPath();
    obsRoughCtx.moveTo(x1, y1);
    obsRoughCtx.lineTo(x2, y2);
    obsRoughCtx.stroke();
  };
  drawSubtleStoneSeam(0, 512, S, 512);
  drawSubtleStoneSeam(512, 0, 512, S);

  // ── 2. Brushed Aerospace Gunmetal-Titanium Armor Plating (1024×1024) ──
  const [titC, titCtx] = makeCanvas(S, S);
  const [titBumpC, titBumpCtx] = makeCanvas(S, S);
  const [titRoughC, titRoughCtx] = makeCanvas(S, S);

  const titGrad = titCtx.createLinearGradient(0, 0, 0, S);
  titGrad.addColorStop(0, '#222834');
  titGrad.addColorStop(0.5, '#2b3242');
  titGrad.addColorStop(1, '#1d222d');
  titCtx.fillStyle = titGrad;
  titCtx.fillRect(0, 0, S, S);

  titBumpCtx.fillStyle = '#808080';
  titBumpCtx.fillRect(0, 0, S, S);
  titRoughCtx.fillStyle = '#5a5a5a';
  titRoughCtx.fillRect(0, 0, S, S);

  // Ultra-fine anisotropic CNC brushed metal grain
  for (let i = 0; i < 3200; i++) {
    const x = hash2(i, 1, 211) * S;
    const y = hash2(i, 2, 211) * S;
    const len = 40 + hash2(i, 3, 211) * 260;
    const b = hash2(i, 4, 211);
    titCtx.strokeStyle = b > 0.5 ? 'rgba(186, 198, 222, 0.08)' : 'rgba(8, 10, 16, 0.14)';
    titCtx.lineWidth = 1;
    titCtx.beginPath();
    titCtx.moveTo(x, y);
    titCtx.lineTo(x + len, y);
    titCtx.stroke();

    const rv = Math.floor(42 + b * 68);
    titRoughCtx.strokeStyle = `rgba(${rv}, ${rv}, ${rv}, 0.25)`;
    titRoughCtx.beginPath();
    titRoughCtx.moveTo(x, y);
    titRoughCtx.lineTo(x + len, y);
    titRoughCtx.stroke();
  }

  // Machined armor seam lines + recessed hexagonal fasteners
  for (const pos of [256, 768]) {
    titCtx.strokeStyle = 'rgba(7, 9, 14, 0.82)';
    titCtx.lineWidth = 4;
    titCtx.beginPath();
    titCtx.moveTo(0, pos);
    titCtx.lineTo(S, pos);
    titCtx.moveTo(pos, 0);
    titCtx.lineTo(pos, S);
    titCtx.stroke();

    titCtx.strokeStyle = 'rgba(190, 204, 226, 0.22)';
    titCtx.lineWidth = 1.5;
    titCtx.beginPath();
    titCtx.moveTo(0, pos + 3);
    titCtx.lineTo(S, pos + 3);
    titCtx.moveTo(pos + 3, 0);
    titCtx.lineTo(pos + 3, S);
    titCtx.stroke();

    titBumpCtx.strokeStyle = '#222222';
    titBumpCtx.lineWidth = 5;
    titBumpCtx.beginPath();
    titBumpCtx.moveTo(0, pos);
    titBumpCtx.lineTo(S, pos);
    titBumpCtx.moveTo(pos, 0);
    titBumpCtx.lineTo(pos, S);
    titBumpCtx.stroke();
  }
  for (const bx of [32, 224, 288, 736, 800, 992]) {
    for (const by of [32, 224, 288, 736, 800, 992]) {
      titCtx.fillStyle = '#0d1017';
      titCtx.beginPath();
      titCtx.arc(bx, by, 5.5, 0, Math.PI * 2);
      titCtx.fill();
      titCtx.fillStyle = '#717f96';
      titCtx.beginPath();
      titCtx.arc(bx - 1, by - 1, 2.8, 0, Math.PI * 2);
      titCtx.fill();
      titBumpCtx.fillStyle = '#282828';
      titBumpCtx.beginPath();
      titBumpCtx.arc(bx, by, 6, 0, Math.PI * 2);
      titBumpCtx.fill();
      titBumpCtx.fillStyle = '#dcdcdc';
      titBumpCtx.beginPath();
      titBumpCtx.arc(bx, by, 2.6, 0, Math.PI * 2);
      titBumpCtx.fill();
    }
  }

  // ── 3. Hand-Hammered & Chased Sovereign Cathedral Antique Gold (1024×1024) ──
  const [goldC, goldCtx] = makeCanvas(S, S);
  const [goldBumpC, goldBumpCtx] = makeCanvas(S, S);
  const [goldRoughC, goldRoughCtx] = makeCanvas(S, S);

  const gGrad = goldCtx.createLinearGradient(0, 0, S, S);
  gGrad.addColorStop(0, '#aa7e2e');
  gGrad.addColorStop(0.32, '#cfa34a');
  gGrad.addColorStop(0.64, '#926722');
  gGrad.addColorStop(1, '#c4963f');
  goldCtx.fillStyle = gGrad;
  goldCtx.fillRect(0, 0, S, S);

  goldBumpCtx.fillStyle = '#848484';
  goldBumpCtx.fillRect(0, 0, S, S);
  goldRoughCtx.fillStyle = '#4c4c4c';
  goldRoughCtx.fillRect(0, 0, S, S);

  // Subtle hand-hammered planishing facets (authentic forged cathedral goldsmith look)
  for (let i = 0; i < 650; i++) {
    const x = hash2(i, 1, 317) * S;
    const y = hash2(i, 2, 317) * S;
    const rad = 14 + hash2(i, 3, 317) * 34;
    const bright = hash2(i, 4, 317);
    const rg = goldCtx.createRadialGradient(x - rad * 0.25, y - rad * 0.25, 1, x, y, rad);
    rg.addColorStop(0, bright > 0.5 ? 'rgba(255, 236, 178, 0.12)' : 'rgba(72, 46, 12, 0.14)');
    rg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    goldCtx.fillStyle = rg;
    goldCtx.beginPath();
    goldCtx.arc(x, y, rad, 0, Math.PI * 2);
    goldCtx.fill();

    const bg = goldBumpCtx.createRadialGradient(x, y, 1, x, y, rad);
    bg.addColorStop(0, 'rgba(98, 98, 98, 0.22)');
    bg.addColorStop(0.8, 'rgba(148, 148, 148, 0.15)');
    bg.addColorStop(1, 'rgba(132, 132, 132, 0)');
    goldBumpCtx.fillStyle = bg;
    goldBumpCtx.beginPath();
    goldBumpCtx.arc(x, y, rad, 0, Math.PI * 2);
    goldBumpCtx.fill();
  }

  // Fine satin brushed metallic streaks & subtle wear scratches
  for (let i = 0; i < 2000; i++) {
    const y = hash2(i, 1, 53) * S;
    const x = hash2(i, 2, 53) * S;
    const len = 24 + hash2(i, 3, 53) * 160;
    const bright = hash2(i, 4, 53);
    goldCtx.strokeStyle =
      bright > 0.55 ? 'rgba(255, 240, 188, 0.13)' : 'rgba(64, 38, 10, 0.15)';
    goldCtx.lineWidth = 1;
    goldCtx.beginPath();
    goldCtx.moveTo(x, y);
    goldCtx.lineTo(x + len, y + (bright - 0.5) * 4);
    goldCtx.stroke();

    const rv = Math.floor(32 + bright * 72);
    goldRoughCtx.strokeStyle = `rgba(${rv}, ${rv}, ${rv}, 0.28)`;
    goldRoughCtx.beginPath();
    goldRoughCtx.moveTo(x, y);
    goldRoughCtx.lineTo(x + len, y);
    goldRoughCtx.stroke();
  }

  // Delicate chased cathedral astrolabe border engravings & filigree relief
  for (const by of [128, 384, 640, 896]) {
    goldCtx.strokeStyle = 'rgba(54, 32, 8, 0.45)';
    goldCtx.lineWidth = 3;
    goldCtx.beginPath();
    goldCtx.moveTo(0, by - 26);
    goldCtx.lineTo(S, by - 26);
    goldCtx.moveTo(0, by + 26);
    goldCtx.lineTo(S, by + 26);
    goldCtx.stroke();

    goldBumpCtx.strokeStyle = '#363636';
    goldBumpCtx.lineWidth = 3.5;
    goldBumpCtx.beginPath();
    goldBumpCtx.moveTo(0, by - 26);
    goldBumpCtx.lineTo(S, by - 26);
    goldBumpCtx.moveTo(0, by + 26);
    goldBumpCtx.lineTo(S, by + 26);
    goldBumpCtx.stroke();

    for (let tx = 0; tx < S; tx += 32) {
      const major = tx % 128 === 0;
      goldCtx.strokeStyle = major ? 'rgba(46, 26, 6, 0.6)' : 'rgba(62, 38, 10, 0.32)';
      goldCtx.lineWidth = major ? 2.5 : 1.2;
      goldCtx.beginPath();
      goldCtx.moveTo(tx, by - (major ? 22 : 12));
      goldCtx.lineTo(tx, by + (major ? 22 : 12));
      goldCtx.stroke();

      goldBumpCtx.strokeStyle = '#3e3e3e';
      goldBumpCtx.lineWidth = major ? 2.5 : 1.2;
      goldBumpCtx.beginPath();
      goldBumpCtx.moveTo(tx, by - (major ? 22 : 12));
      goldBumpCtx.lineTo(tx, by + (major ? 22 : 12));
      goldBumpCtx.stroke();
    }
  }

  // ── 4. Royal Obsidian-Velvet Cathedral Brocade Mantle (512×512) ──
  const [mantleC, mantleCtx] = makeCanvas(M, M);
  const [mantleBumpC, mantleBumpCtx] = makeCanvas(M, M);
  const [mantleRoughC, mantleRoughCtx] = makeCanvas(M, M);

  mantleCtx.fillStyle = '#08090f';
  mantleCtx.fillRect(0, 0, M, M);
  mantleBumpCtx.fillStyle = '#787878';
  mantleBumpCtx.fillRect(0, 0, M, M);
  // Deep plush matte royal velvet base (~0.92) so it never catches harsh cyan specular glare
  mantleRoughCtx.fillStyle = '#ebebeb';
  mantleRoughCtx.fillRect(0, 0, M, M);

  // Fine diagonal woven twill fabric micro-threads
  for (let y = 0; y < M; y += 4) {
    for (let x = 0; x < M; x += 4) {
      const weave = (x + y) % 8 === 0 ? 1 : 0;
      mantleCtx.fillStyle = weave ? 'rgba(22, 24, 34, 0.36)' : 'rgba(4, 5, 8, 0.48)';
      mantleCtx.fillRect(x, y, 2, 2);
      mantleBumpCtx.fillStyle = weave ? '#929292' : '#585858';
      mantleBumpCtx.fillRect(x, y, 2, 2);
    }
  }

  // Woven gothic cathedral antique-gold brocade lattice & royal diamonds
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const cx = col * 128 + 64;
      const cy = row * 128 + 64;
      mantleCtx.strokeStyle = 'rgba(202, 152, 56, 0.58)';
      mantleCtx.lineWidth = 2.6;
      mantleCtx.beginPath();
      mantleCtx.moveTo(cx, cy - 46);
      mantleCtx.lineTo(cx + 34, cy);
      mantleCtx.lineTo(cx, cy + 46);
      mantleCtx.lineTo(cx - 34, cy);
      mantleCtx.closePath();
      mantleCtx.stroke();

      mantleCtx.fillStyle = 'rgba(72, 24, 96, 0.32)';
      mantleCtx.beginPath();
      mantleCtx.moveTo(cx, cy - 18);
      mantleCtx.lineTo(cx + 12, cy);
      mantleCtx.lineTo(cx, cy + 18);
      mantleCtx.lineTo(cx - 12, cy);
      mantleCtx.closePath();
      mantleCtx.fill();

      mantleBumpCtx.strokeStyle = '#d4d4d4';
      mantleBumpCtx.lineWidth = 3;
      mantleBumpCtx.beginPath();
      mantleBumpCtx.moveTo(cx, cy - 46);
      mantleBumpCtx.lineTo(cx + 34, cy);
      mantleBumpCtx.lineTo(cx, cy + 46);
      mantleBumpCtx.lineTo(cx - 34, cy);
      mantleBumpCtx.closePath();
      mantleBumpCtx.stroke();

      mantleRoughCtx.strokeStyle = '#525252';
      mantleRoughCtx.lineWidth = 3;
      mantleRoughCtx.beginPath();
      mantleRoughCtx.moveTo(cx, cy - 46);
      mantleRoughCtx.lineTo(cx + 34, cy);
      mantleRoughCtx.lineTo(cx, cy + 46);
      mantleRoughCtx.lineTo(cx - 34, cy);
      mantleRoughCtx.closePath();
      mantleRoughCtx.stroke();
    }
  }
  for (const bx of [20, M - 20]) {
    mantleCtx.strokeStyle = '#c99b40';
    mantleCtx.lineWidth = 7;
    mantleCtx.beginPath();
    mantleCtx.moveTo(bx, 0);
    mantleCtx.lineTo(bx, M);
    mantleCtx.stroke();
    mantleRoughCtx.strokeStyle = '#404040';
    mantleRoughCtx.lineWidth = 7;
    mantleRoughCtx.beginPath();
    mantleRoughCtx.moveTo(bx, 0);
    mantleRoughCtx.lineTo(bx, M);
    mantleRoughCtx.stroke();
  }

  // ── 5. Gravitational Event-Horizon Singularity Core (512×512) ──
  const [singC, singCtx] = makeCanvas(M, M);
  singCtx.fillStyle = '#07020e';
  singCtx.fillRect(0, 0, M, M);

  const scx = M * 0.5;
  const scy = M * 0.5;
  // Swirling stellar plasma accretion bands wrapping the spherical UV
  for (let i = 0; i < 46; i++) {
    const y = (i / 46) * M;
    const distEq = Math.abs(i / 46 - 0.5) * 2;
    const grad = singCtx.createLinearGradient(0, y, M, y);
    const alpha = Math.max(0.08, 0.88 - distEq * 0.72);
    grad.addColorStop(0, `rgba(116, 28, 212, ${alpha * 0.72})`);
    grad.addColorStop(0.28, `rgba(245, 158, 11, ${alpha})`);
    grad.addColorStop(0.5, `rgba(255, 250, 224, ${alpha})`);
    grad.addColorStop(0.72, `rgba(249, 115, 22, ${alpha * 0.96})`);
    grad.addColorStop(1, `rgba(116, 28, 212, ${alpha * 0.72})`);
    singCtx.strokeStyle = grad;
    singCtx.lineWidth = 2.8 + hash2(i, 2, 419) * 7.5;
    singCtx.beginPath();
    for (let x = 0; x <= M; x += 16) {
      const wave = Math.sin((x / M) * Math.PI * 4 + i * 0.65) * 16;
      if (x === 0) singCtx.moveTo(x, y + wave);
      else singCtx.lineTo(x, y + wave);
    }
    singCtx.stroke();
  }
  // Abyssal event-horizon center encircled by a crisp golden Einstein photon ring
  const horizonGrad = singCtx.createRadialGradient(scx, scy, 12, scx, scy, 185);
  horizonGrad.addColorStop(0, 'rgba(3, 1, 8, 0.98)');
  horizonGrad.addColorStop(0.3, 'rgba(12, 3, 24, 0.84)');
  horizonGrad.addColorStop(0.48, 'rgba(255, 232, 146, 0.92)');
  horizonGrad.addColorStop(0.62, 'rgba(245, 130, 22, 0.48)');
  horizonGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  singCtx.fillStyle = horizonGrad;
  singCtx.fillRect(0, 0, M, M);

  // ── 6. Neutral Faceted Crystal Refraction Luminance Map (512×512) ──
  // Neutral silver-quartz base so material.color + material.emissive cleanly shift P1 Amethyst <-> P2 Molten Crimson!
  const [crysC, crysCtx] = makeCanvas(M, M);
  const cGrad = crysCtx.createLinearGradient(0, 0, 0, M);
  cGrad.addColorStop(0, '#3a3a44');
  cGrad.addColorStop(0.38, '#9696a6');
  cGrad.addColorStop(0.75, '#e2e2ee');
  cGrad.addColorStop(1, '#ffffff');
  crysCtx.fillStyle = cGrad;
  crysCtx.fillRect(0, 0, M, M);
  for (let i = 0; i < 54; i++) {
    const x1 = hash2(i, 1, 509) * M;
    const y1 = hash2(i, 2, 509) * M;
    const x2 = x1 + (hash2(i, 3, 509) - 0.5) * 210;
    const y2 = y1 + (hash2(i, 4, 509) - 0.5) * 210;
    const x3 = x1 + (hash2(i, 5, 509) - 0.5) * 180;
    const y3 = y1 + (hash2(i, 6, 509) - 0.5) * 180;
    crysCtx.fillStyle =
      i % 2 === 0 ? 'rgba(255, 255, 255, 0.22)' : 'rgba(20, 20, 28, 0.34)';
    crysCtx.beginPath();
    crysCtx.moveTo(x1, y1);
    crysCtx.lineTo(x2, y2);
    crysCtx.lineTo(x3, y3);
    crysCtx.closePath();
    crysCtx.fill();
  }
  crysCtx.strokeStyle = 'rgba(255, 255, 255, 0.58)';
  crysCtx.lineWidth = 2;
  for (let i = 0; i < 18; i++) {
    const x = (i / 18) * M;
    crysCtx.beginPath();
    crysCtx.moveTo(x, 0);
    crysCtx.lineTo(x + 48, M);
    crysCtx.stroke();
  }

  // ── 7. Sacred Cathedral Astrolabe Floor Sanctuary Sigil (1024×1024) ──
  const [sigC, sigCtx] = makeCanvas(S, S);
  sigCtx.fillStyle = '#000000';
  sigCtx.fillRect(0, 0, S, S);
  const cx = S * 0.5;
  const cy = S * 0.5;

  const halo = sigCtx.createRadialGradient(cx, cy, 40, cx, cy, S * 0.48);
  halo.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
  halo.addColorStop(0.45, 'rgba(255, 255, 255, 0.12)');
  halo.addColorStop(0.84, 'rgba(255, 255, 255, 0.36)');
  halo.addColorStop(0.95, 'rgba(255, 255, 255, 0.08)');
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sigCtx.fillStyle = halo;
  sigCtx.fillRect(0, 0, S, S);

  const ringRadii: Array<[number, number, number]> = [
    [474, 7, 0.96],
    [442, 3, 0.72],
    [388, 6, 0.92],
    [320, 3, 0.65],
    [250, 5, 0.85],
    [168, 3, 0.72],
    [94, 4, 0.85],
  ];
  for (const [rad, lw, alpha] of ringRadii) {
    sigCtx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    sigCtx.lineWidth = lw;
    sigCtx.beginPath();
    sigCtx.arc(cx, cy, rad, 0, Math.PI * 2);
    sigCtx.stroke();
  }
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const major = i % 6 === 0;
    const r0 = major ? 388 : 442;
    const r1 = 474;
    sigCtx.strokeStyle = major ? 'rgba(255, 255, 255, 0.96)' : 'rgba(255, 255, 255, 0.54)';
    sigCtx.lineWidth = major ? 5 : 2;
    sigCtx.beginPath();
    sigCtx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    sigCtx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    sigCtx.stroke();
  }
  const drawPoly = (sides: number, rad: number, rot: number, lw: number, alpha: number) => {
    sigCtx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    sigCtx.lineWidth = lw;
    sigCtx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const a = rot + (i / sides) * Math.PI * 2;
      const px = cx + Math.cos(a) * rad;
      const py = cy + Math.sin(a) * rad;
      if (i === 0) sigCtx.moveTo(px, py);
      else sigCtx.lineTo(px, py);
    }
    sigCtx.stroke();
  };
  drawPoly(4, 386, 0, 5, 0.86);
  drawPoly(4, 386, Math.PI / 4, 5, 0.86);
  drawPoly(3, 316, -Math.PI / 2, 4, 0.78);
  drawPoly(3, 316, Math.PI / 2, 4, 0.78);
  drawPoly(6, 248, 0, 3.5, 0.76);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    sigCtx.fillStyle = 'rgba(255, 255, 255, 0.96)';
    sigCtx.beginPath();
    sigCtx.arc(cx + Math.cos(a) * 388, cy + Math.sin(a) * 388, i % 2 === 0 ? 11 : 7, 0, Math.PI * 2);
    sigCtx.fill();
  }

  // ── 8. Volumetric Scrolling Plasma Beam & Scythe Flux Sheet (512×512) ──
  const [fluxC, fluxCtx] = makeCanvas(M, M);
  fluxCtx.fillStyle = '#080510';
  fluxCtx.fillRect(0, 0, M, M);
  for (let i = 0; i < 64; i++) {
    const x = (i / 64) * M;
    const bandW = 5 + hash2(i, 1, 91) * 14;
    const grad = fluxCtx.createLinearGradient(x, 0, x, M);
    const bright = 0.35 + hash2(i, 2, 91) * 0.65;
    grad.addColorStop(0, `rgba(255, 245, 210, ${bright * 0.85})`);
    grad.addColorStop(0.25, `rgba(255, 196, 92, ${bright * 0.5})`);
    grad.addColorStop(0.5, `rgba(255, 255, 255, ${bright})`);
    grad.addColorStop(0.75, `rgba(232, 121, 249, ${bright * 0.55})`);
    grad.addColorStop(1, `rgba(255, 245, 210, ${bright * 0.85})`);
    fluxCtx.fillStyle = grad;
    fluxCtx.fillRect(x, 0, bandW, M);
  }
  for (let j = 0; j < 28; j++) {
    const y = (j / 28) * M;
    fluxCtx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    fluxCtx.fillRect(0, y, M, 3 + (j % 3) * 2);
  }

  const obsidianMap = configureTex(obsC, 1, 1, true);
  const obsidianBump = configureTex(obsBumpC, 1, 1, false);
  const obsidianRoughness = configureTex(obsRoughC, 1, 1, false);
  const obsidianVeinEmissive = configureTex(obsVeinC, 1, 1, true);

  const titaniumMap = configureTex(titC, 1, 1, true);
  const titaniumBump = configureTex(titBumpC, 1, 1, false);
  const titaniumRoughness = configureTex(titRoughC, 1, 1, false);

  const goldMap = configureTex(goldC, 1, 1, true);
  const goldBump = configureTex(goldBumpC, 1, 1, false);
  const goldRoughness = configureTex(goldRoughC, 1, 1, false);

  const mantleMap = configureTex(mantleC, 1, 2, true);
  const mantleBump = configureTex(mantleBumpC, 1, 2, false);
  const mantleRoughness = configureTex(mantleRoughC, 1, 2, false);

  const singularityMap = configureTex(singC, 1, 1, true);
  const crystalMap = configureTex(crysC, 1, 1, true);

  const sanctuarySigilMap = configureTex(sigC, 1, 1, false);
  sanctuarySigilMap.wrapS = THREE.ClampToEdgeWrapping;
  sanctuarySigilMap.wrapT = THREE.ClampToEdgeWrapping;

  const beamFluxMap = configureTex(fluxC, 1, 3, true);

  return {
    obsidianMap,
    obsidianBump,
    obsidianRoughness,
    obsidianVeinEmissive,
    titaniumMap,
    titaniumBump,
    titaniumRoughness,
    goldMap,
    goldBump,
    goldRoughness,
    mantleMap,
    mantleBump,
    mantleRoughness,
    singularityMap,
    crystalMap,
    sanctuarySigilMap,
    beamFluxMap,
    dispose: () => {
      obsidianMap.dispose();
      obsidianBump.dispose();
      obsidianRoughness.dispose();
      obsidianVeinEmissive.dispose();
      titaniumMap.dispose();
      titaniumBump.dispose();
      titaniumRoughness.dispose();
      goldMap.dispose();
      goldBump.dispose();
      goldRoughness.dispose();
      mantleMap.dispose();
      mantleBump.dispose();
      mantleRoughness.dispose();
      singularityMap.dispose();
      crystalMap.dispose();
      sanctuarySigilMap.dispose();
      beamFluxMap.dispose();
    },
  };
}
