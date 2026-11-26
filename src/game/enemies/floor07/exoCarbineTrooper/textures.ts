import * as THREE from 'three';

export interface ExoTrooperTextureSuite {
  ceramicAlbedo: THREE.CanvasTexture;
  ceramicBump: THREE.CanvasTexture;
  ceramicRoughness: THREE.CanvasTexture;
  undersuitAlbedo: THREE.CanvasTexture;
  undersuitBump: THREE.CanvasTexture;
  titaniumAlbedo: THREE.CanvasTexture;
  titaniumBump: THREE.CanvasTexture;
  visorHexMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return [c, c.getContext('2d')];
}

function toTex(
  c: HTMLCanvasElement,
  repX: number,
  repY: number,
  isColor: boolean
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repX, repY);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * High-resolution procedural PBR texture suite crafted specifically for the Floor 07
 * Exo-Carbine Trooper: weathered matte cobalt-slate military composite ceramic with
 * edge paint-wear, hex-weave ballistic sublayers, recessed bolts, hazard chevrons,
 * ribbed synthetic musculature, brushed desert-titanium, and a cyan HUD visor matrix.
 */
export function createExoTrooperTextures(): ExoTrooperTextureSuite {
  let seed = 71042;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // 1. Weathered Cobalt-Slate Composite Ceramic Armor (512x512 Albedo + Bump + Roughness)
  const [cAlb, aCtx] = makeCanvas(512);
  const [cBmp, bCtx] = makeCanvas(512);
  const [cRgh, rCtx] = makeCanvas(512);

  if (aCtx && bCtx && rCtx) {
    // Rich tactical slate-blue military composite base (matte, realistic saturation)
    const grad = aCtx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#445e7b');
    grad.addColorStop(0.5, '#3a526d');
    grad.addColorStop(1, '#31465e');
    aCtx.fillStyle = grad;
    aCtx.fillRect(0, 0, 512, 512);

    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, 512, 512);

    // Matte ceramic paint baseline (~0.66 roughness)
    rCtx.fillStyle = '#a8a8a8';
    rCtx.fillRect(0, 0, 512, 512);

    // Subtle hexagonal ballistic Kevlar laminate micro-texture
    aCtx.strokeStyle = 'rgba(20, 30, 42, 0.16)';
    aCtx.lineWidth = 1;
    bCtx.strokeStyle = '#737373';
    bCtx.lineWidth = 1;
    const step = 16;
    for (let y = 0; y < 512; y += step) {
      for (let x = 0; x < 512; x += step) {
        const ox = (Math.floor(y / step) % 2) * (step * 0.5);
        aCtx.strokeRect(x + ox, y, step - 3, step - 3);
        bCtx.strokeRect(x + ox, y, step - 3, step - 3);
      }
    }

    // Organic battle-grime & oxidation mottling
    for (let i = 0; i < 420; i++) {
      const x = rand() * 512;
      const y = rand() * 512;
      const r = 5 + rand() * 26;
      const dark = rand() > 0.42;
      aCtx.fillStyle = dark ? 'rgba(18, 24, 34, 0.11)' : 'rgba(155, 180, 205, 0.065)';
      aCtx.beginPath();
      aCtx.arc(x, y, r, 0, Math.PI * 2);
      aCtx.fill();

      rCtx.fillStyle = dark ? 'rgba(220, 220, 220, 0.16)' : 'rgba(130, 130, 130, 0.12)';
      rCtx.beginPath();
      rCtx.arc(x, y, r, 0, Math.PI * 2);
      rCtx.fill();
    }

    // Precision armor panel seams (dark grooves + bright chipped titanium highlight edges)
    const drawSeam = (x1: number, y1: number, x2: number, y2: number) => {
      aCtx.strokeStyle = 'rgba(14, 20, 28, 0.72)';
      aCtx.lineWidth = 3;
      aCtx.beginPath();
      aCtx.moveTo(x1, y1);
      aCtx.lineTo(x2, y2);
      aCtx.stroke();

      // Subtle chipped bare-metal edge wear along seam
      aCtx.strokeStyle = 'rgba(185, 202, 220, 0.34)';
      aCtx.lineWidth = 1.2;
      aCtx.beginPath();
      aCtx.moveTo(x1 + 2, y1 + 2);
      aCtx.lineTo(x2 + 2, y2 + 2);
      aCtx.stroke();

      bCtx.strokeStyle = '#383838';
      bCtx.lineWidth = 3.5;
      bCtx.beginPath();
      bCtx.moveTo(x1, y1);
      bCtx.lineTo(x2, y2);
      bCtx.stroke();

      rCtx.strokeStyle = '#5a5a5a';
      rCtx.lineWidth = 2;
      rCtx.beginPath();
      rCtx.moveTo(x1 + 2, y1 + 2);
      rCtx.lineTo(x2 + 2, y2 + 2);
      rCtx.stroke();
    };

    drawSeam(12, 12, 500, 12);
    drawSeam(12, 500, 500, 500);
    drawSeam(12, 12, 12, 500);
    drawSeam(500, 12, 500, 500);
    drawSeam(12, 256, 500, 256);
    drawSeam(256, 12, 256, 256);
    drawSeam(128, 256, 180, 500);
    drawSeam(384, 256, 332, 500);

    // Recessed hex fastener bolts at corners
    const bolts = [
      [34, 34],
      [478, 34],
      [34, 236],
      [478, 236],
      [34, 276],
      [478, 276],
      [34, 478],
      [478, 478],
      [234, 34],
      [278, 34],
    ];
    for (const [bx, by] of bolts) {
      aCtx.fillStyle = '#1d2632';
      aCtx.beginPath();
      aCtx.arc(bx, by, 6, 0, Math.PI * 2);
      aCtx.fill();
      aCtx.fillStyle = '#8fa0b5';
      aCtx.beginPath();
      aCtx.arc(bx - 1, by - 1, 2.8, 0, Math.PI * 2);
      aCtx.fill();

      bCtx.fillStyle = '#303030';
      bCtx.beginPath();
      bCtx.arc(bx, by, 6, 0, Math.PI * 2);
      bCtx.fill();
      bCtx.fillStyle = '#b4b4b4';
      bCtx.beginPath();
      bCtx.arc(bx, by, 3, 0, Math.PI * 2);
      bCtx.fill();
    }

    // Fine metallic combat scratches & edge scuffs
    for (let i = 0; i < 65; i++) {
      const sx = rand() * 480 + 16;
      const sy = rand() * 480 + 16;
      const ang = (rand() - 0.5) * 1.4;
      const len = 8 + rand() * 34;
      aCtx.strokeStyle =
        rand() > 0.35 ? 'rgba(185, 200, 215, 0.32)' : 'rgba(16, 22, 30, 0.38)';
      aCtx.lineWidth = 0.8 + rand() * 1.2;
      aCtx.beginPath();
      aCtx.moveTo(sx, sy);
      aCtx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
      aCtx.stroke();

      rCtx.strokeStyle = 'rgba(72, 72, 72, 0.45)';
      rCtx.lineWidth = 1.2;
      rCtx.beginPath();
      rCtx.moveTo(sx, sy);
      rCtx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
      rCtx.stroke();
    }

    // Subtle military stencil markings & hazard strip accent
    aCtx.fillStyle = 'rgba(230, 140, 48, 0.72)';
    aCtx.fillRect(36, 198, 72, 10);
    aCtx.fillStyle = 'rgba(218, 228, 238, 0.58)';
    aCtx.font = 'bold 18px monospace';
    aCtx.fillText('F07 // EXO-1', 36, 188);
  }

  // 2. Ribbed Ballistic Synth-Muscle Undersuit (256x256 Albedo + Bump)
  const [uAlb, uaCtx] = makeCanvas(256);
  const [uBmp, ubCtx] = makeCanvas(256);
  if (uaCtx && ubCtx) {
    uaCtx.fillStyle = '#2b323b';
    uaCtx.fillRect(0, 0, 256, 256);
    ubCtx.fillStyle = '#787878';
    ubCtx.fillRect(0, 0, 256, 256);

    // Tactical ribbed compression bands & micro-carbon mesh
    for (let y = 0; y < 256; y += 12) {
      uaCtx.fillStyle = 'rgba(14, 18, 24, 0.45)';
      uaCtx.fillRect(0, y, 256, 4);
      uaCtx.fillStyle = 'rgba(92, 108, 126, 0.18)';
      uaCtx.fillRect(0, y + 4, 256, 2);

      ubCtx.fillStyle = '#484848';
      ubCtx.fillRect(0, y, 256, 4);
      ubCtx.fillStyle = '#b4b4b4';
      ubCtx.fillRect(0, y + 5, 256, 5);
    }
    // Cross-weave ballistic nylon stipple
    for (let y = 0; y < 256; y += 6) {
      for (let x = 0; x < 256; x += 6) {
        uaCtx.fillStyle = (x + y) % 12 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.07)';
        uaCtx.fillRect(x, y, 3, 3);
      }
    }
  }

  // 3. Brushed Weathered Titanium-Bronze Plating (256x256 Albedo + Bump)
  const [tAlb, taCtx] = makeCanvas(256);
  const [tBmp, tbCtx] = makeCanvas(256);
  if (taCtx && tbCtx) {
    taCtx.fillStyle = '#9c8664';
    taCtx.fillRect(0, 0, 256, 256);
    tbCtx.fillStyle = '#808080';
    tbCtx.fillRect(0, 0, 256, 256);

    // Horizontal brushed machined-titanium grain
    for (let i = 0; i < 360; i++) {
      const y = rand() * 256;
      const x = rand() * 256;
      const w = 24 + rand() * 90;
      const bright = rand() > 0.5;
      taCtx.fillStyle = bright ? 'rgba(235, 222, 196, 0.11)' : 'rgba(42, 34, 24, 0.12)';
      taCtx.fillRect(x, y, w, 1.5);
      tbCtx.fillStyle = bright ? 'rgba(170,170,170,0.22)' : 'rgba(90,90,90,0.22)';
      tbCtx.fillRect(x, y, w, 1.5);
    }

    // Gun-oil grime smudges near edges
    taCtx.strokeStyle = 'rgba(28, 24, 20, 0.45)';
    taCtx.lineWidth = 6;
    taCtx.strokeRect(4, 4, 248, 248);
    tbCtx.strokeStyle = '#404040';
    tbCtx.lineWidth = 4;
    tbCtx.strokeRect(4, 4, 248, 248);
  }

  // 4. Electric-Cyan Tactical Visor Micro-Hex HUD Matrix (128x64)
  const vCanvas = document.createElement('canvas');
  vCanvas.width = 128;
  vCanvas.height = 64;
  const vCtx = vCanvas.getContext('2d');
  if (vCtx) {
    const vGrad = vCtx.createLinearGradient(0, 0, 0, 64);
    vGrad.addColorStop(0, '#62f5ff');
    vGrad.addColorStop(0.5, '#19d8ff');
    vGrad.addColorStop(1, '#0898cc');
    vCtx.fillStyle = vGrad;
    vCtx.fillRect(0, 0, 128, 64);

    // Optical reticle scanlines & micro-hex grid
    vCtx.strokeStyle = 'rgba(4, 28, 44, 0.36)';
    vCtx.lineWidth = 1;
    for (let y = 0; y < 64; y += 6) {
      vCtx.beginPath();
      vCtx.moveTo(0, y);
      vCtx.lineTo(128, y);
      vCtx.stroke();
    }
    for (let x = 0; x < 128; x += 8) {
      vCtx.beginPath();
      vCtx.moveTo(x, 0);
      vCtx.lineTo(x, 64);
      vCtx.stroke();
    }
    // Bright horizontal HUD optic slit highlight
    vCtx.fillStyle = 'rgba(230, 255, 255, 0.78)';
    vCtx.fillRect(10, 26, 108, 7);
  }

  const ceramicAlbedo = toTex(cAlb, 1, 1, true);
  const ceramicBump = toTex(cBmp, 1, 1, false);
  const ceramicRoughness = toTex(cRgh, 1, 1, false);
  const undersuitAlbedo = toTex(uAlb, 2, 2, true);
  const undersuitBump = toTex(uBmp, 2, 2, false);
  const titaniumAlbedo = toTex(tAlb, 1, 1, true);
  const titaniumBump = toTex(tBmp, 1, 1, false);
  const visorHexMap = toTex(vCanvas, 1, 1, true);

  return {
    ceramicAlbedo,
    ceramicBump,
    ceramicRoughness,
    undersuitAlbedo,
    undersuitBump,
    titaniumAlbedo,
    titaniumBump,
    visorHexMap,
    dispose: () => {
      ceramicAlbedo.dispose();
      ceramicBump.dispose();
      ceramicRoughness.dispose();
      undersuitAlbedo.dispose();
      undersuitBump.dispose();
      titaniumAlbedo.dispose();
      titaniumBump.dispose();
      visorHexMap.dispose();
    },
  };
}
