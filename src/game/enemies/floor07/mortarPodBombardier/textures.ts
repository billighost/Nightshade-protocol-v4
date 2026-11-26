import * as THREE from 'three';

export interface MortarBombardierTextureSuite {
  oliveArmorAlbedo: THREE.CanvasTexture;
  oliveArmorBump: THREE.CanvasTexture;
  oliveArmorRoughness: THREE.CanvasTexture;
  hazardPlateAlbedo: THREE.CanvasTexture;
  hazardPlateBump: THREE.CanvasTexture;
  gunmetalAlbedo: THREE.CanvasTexture;
  gunmetalBump: THREE.CanvasTexture;
  flakUndersuitAlbedo: THREE.CanvasTexture;
  flakUndersuitBump: THREE.CanvasTexture;
  rangefinderLensMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h = w): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
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
 * Dedicated AAA procedural PBR texture suite for the Floor 07 Mortar-Pod Bombardier:
 * - Matte weathered military olive-drab / khaki-tan heavy composite EOD blast armor with
 *   bolted inspection hatches, propellant soot, chipped steel edges, and ordnance stencils.
 * - Weathered industrial amber-black hazard caution striping (scorched by mortar exhaust).
 * - Brushed machined ordnance gunmetal steel for hydraulic outriggers & rifled mortar tubes.
 * - Heavy quilted ballistic Kevlar flak padding undersuit.
 * - Glowing tactical gold-emerald rangefinder optics lens lattice.
 */
export function createMortarBombardierTextures(): MortarBombardierTextureSuite {
  let seed = 73109;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // 1. Weathered Military Olive-Drab Heavy Composite Blast Armor (512x512 Albedo + Bump + Roughness)
  const [oAlb, aCtx] = makeCanvas(512);
  const [oBmp, bCtx] = makeCanvas(512);
  const [oRgh, rCtx] = makeCanvas(512);

  if (aCtx && bCtx && rCtx) {
    const grad = aCtx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#6a7456');
    grad.addColorStop(0.5, '#596348');
    grad.addColorStop(1, '#49523b');
    aCtx.fillStyle = grad;
    aCtx.fillRect(0, 0, 512, 512);

    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, 512, 512);

    // Matte military parkerized coating (~0.70 roughness baseline)
    rCtx.fillStyle = '#b4b4b4';
    rCtx.fillRect(0, 0, 512, 512);

    // Fine cast-ceramic stipple grain
    for (let i = 0; i < 620; i++) {
      const x = rand() * 512;
      const y = rand() * 512;
      const r = 3 + rand() * 22;
      const dark = rand() > 0.42;
      aCtx.fillStyle = dark ? 'rgba(24, 28, 18, 0.13)' : 'rgba(176, 184, 152, 0.08)';
      aCtx.beginPath();
      aCtx.arc(x, y, r, 0, Math.PI * 2);
      aCtx.fill();

      bCtx.fillStyle = dark ? 'rgba(110,110,110,0.22)' : 'rgba(148,148,148,0.2)';
      bCtx.beginPath();
      bCtx.arc(x, y, r * 0.65, 0, Math.PI * 2);
      bCtx.fill();

      rCtx.fillStyle = dark ? 'rgba(225,225,225,0.16)' : 'rgba(130,130,130,0.14)';
      rCtx.beginPath();
      rCtx.arc(x, y, r, 0, Math.PI * 2);
      rCtx.fill();
    }

    // Heavy armored blast-plate seams with exposed chipped bare-steel edge wear
    const drawSeam = (x1: number, y1: number, x2: number, y2: number) => {
      aCtx.strokeStyle = 'rgba(18, 22, 16, 0.78)';
      aCtx.lineWidth = 4;
      aCtx.beginPath();
      aCtx.moveTo(x1, y1);
      aCtx.lineTo(x2, y2);
      aCtx.stroke();

      aCtx.strokeStyle = 'rgba(202, 206, 196, 0.36)';
      aCtx.lineWidth = 1.4;
      aCtx.beginPath();
      aCtx.moveTo(x1 + 2.5, y1 + 2.5);
      aCtx.lineTo(x2 + 2.5, y2 + 2.5);
      aCtx.stroke();

      bCtx.strokeStyle = '#2d2d2d';
      bCtx.lineWidth = 4.5;
      bCtx.beginPath();
      bCtx.moveTo(x1, y1);
      bCtx.lineTo(x2, y2);
      bCtx.stroke();

      rCtx.strokeStyle = '#525252';
      rCtx.lineWidth = 2.4;
      rCtx.beginPath();
      rCtx.moveTo(x1 + 2, y1 + 2);
      rCtx.lineTo(x2 + 2, y2 + 2);
      rCtx.stroke();
    };

    drawSeam(14, 14, 498, 14);
    drawSeam(14, 498, 498, 498);
    drawSeam(14, 14, 14, 498);
    drawSeam(498, 14, 498, 498);
    drawSeam(14, 240, 498, 240);
    drawSeam(256, 14, 256, 240);
    drawSeam(118, 240, 118, 498);
    drawSeam(394, 240, 394, 498);

    // Heavy hex anchor bolts along blast plate perimeter
    const bolts = [
      [36, 36],
      [234, 36],
      [278, 36],
      [476, 36],
      [36, 218],
      [234, 218],
      [278, 218],
      [476, 218],
      [36, 264],
      [140, 264],
      [372, 264],
      [476, 264],
      [36, 476],
      [140, 476],
      [372, 476],
      [476, 476],
    ];
    for (const [bx, by] of bolts) {
      aCtx.fillStyle = '#242920';
      aCtx.beginPath();
      aCtx.arc(bx, by, 6.5, 0, Math.PI * 2);
      aCtx.fill();
      aCtx.fillStyle = '#b4b8aa';
      aCtx.beginPath();
      aCtx.arc(bx - 1, by - 1, 3.2, 0, Math.PI * 2);
      aCtx.fill();

      bCtx.fillStyle = '#282828';
      bCtx.beginPath();
      bCtx.arc(bx, by, 6.5, 0, Math.PI * 2);
      bCtx.fill();
      bCtx.fillStyle = '#c4c4c4';
      bCtx.beginPath();
      bCtx.arc(bx, by, 3.4, 0, Math.PI * 2);
      bCtx.fill();
    }

    // Shrapnel impacts & ordnance blast scuffs
    for (let i = 0; i < 70; i++) {
      const sx = rand() * 476 + 18;
      const sy = rand() * 476 + 18;
      const ang = rand() * Math.PI;
      const len = 8 + rand() * 34;
      aCtx.strokeStyle =
        rand() > 0.35 ? 'rgba(204, 208, 198, 0.34)' : 'rgba(22, 24, 18, 0.44)';
      aCtx.lineWidth = 1.0 + rand() * 1.4;
      aCtx.beginPath();
      aCtx.moveTo(sx, sy);
      aCtx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
      aCtx.stroke();

      rCtx.strokeStyle = 'rgba(64,64,64,0.5)';
      rCtx.lineWidth = 1.3;
      rCtx.beginPath();
      rCtx.moveTo(sx, sy);
      rCtx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
      rCtx.stroke();
    }

    // Military ordnance stencil markings & yellow warning bar
    aCtx.fillStyle = 'rgba(235, 168, 36, 0.85)';
    aCtx.fillRect(36, 178, 86, 10);
    aCtx.fillStyle = 'rgba(232, 234, 222, 0.68)';
    aCtx.font = 'bold 17px monospace';
    aCtx.fillText('F07 // ORD-03', 36, 168);
    aCtx.font = 'bold 14px monospace';
    aCtx.fillText('HE-MORTAR · BLAST', 142, 294);
  }

  // 2. Weathered Industrial Amber-Black Caution Hazard Plate (256x256 Albedo + Bump)
  const [hAlb, haCtx] = makeCanvas(256);
  const [hBmp, hbCtx] = makeCanvas(256);
  if (haCtx && hbCtx) {
    haCtx.fillStyle = '#d49422';
    haCtx.fillRect(0, 0, 256, 256);
    hbCtx.fillStyle = '#868686';
    hbCtx.fillRect(0, 0, 256, 256);

    haCtx.fillStyle = '#252624';
    for (let i = -256; i < 512; i += 44) {
      haCtx.beginPath();
      haCtx.moveTo(i, 0);
      haCtx.lineTo(i + 22, 0);
      haCtx.lineTo(i + 22 + 256, 256);
      haCtx.lineTo(i + 256, 256);
      haCtx.closePath();
      haCtx.fill();
    }

    // Soot & propellant blast scorching over the stripes
    for (let i = 0; i < 160; i++) {
      const x = rand() * 256;
      const y = rand() * 256;
      const r = 4 + rand() * 18;
      haCtx.fillStyle = rand() > 0.35 ? 'rgba(20, 20, 18, 0.2)' : 'rgba(218, 206, 184, 0.14)';
      haCtx.beginPath();
      haCtx.arc(x, y, r, 0, Math.PI * 2);
      haCtx.fill();
    }

    haCtx.strokeStyle = 'rgba(18, 18, 18, 0.65)';
    haCtx.lineWidth = 6;
    haCtx.strokeRect(3, 3, 250, 250);
    hbCtx.strokeStyle = '#383838';
    hbCtx.lineWidth = 5;
    hbCtx.strokeRect(3, 3, 250, 250);
  }

  // 3. Heavy Machined Ordnance Gunmetal Steel (256x256 Albedo + Bump)
  const [gAlb, gaCtx] = makeCanvas(256);
  const [gBmp, gbCtx] = makeCanvas(256);
  if (gaCtx && gbCtx) {
    const gGrad = gaCtx.createLinearGradient(0, 0, 256, 256);
    gGrad.addColorStop(0, '#5a6066');
    gGrad.addColorStop(0.5, '#464c52');
    gGrad.addColorStop(1, '#373c42');
    gaCtx.fillStyle = gGrad;
    gaCtx.fillRect(0, 0, 256, 256);
    gbCtx.fillStyle = '#808080';
    gbCtx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 340; i++) {
      const y = rand() * 256;
      const x = rand() * 256;
      const w = 18 + rand() * 88;
      const bright = rand() > 0.5;
      gaCtx.fillStyle = bright ? 'rgba(212, 220, 226, 0.1)' : 'rgba(16, 18, 22, 0.14)';
      gaCtx.fillRect(x, y, w, 1.5);
      gbCtx.fillStyle = bright ? 'rgba(176,176,176,0.22)' : 'rgba(84,84,84,0.22)';
      gbCtx.fillRect(x, y, w, 1.5);
    }

    gaCtx.strokeStyle = 'rgba(16, 18, 20, 0.58)';
    gaCtx.lineWidth = 5;
    gaCtx.strokeRect(4, 4, 248, 248);
    gbCtx.strokeStyle = '#3c3c3c';
    gbCtx.lineWidth = 4;
    gbCtx.strokeRect(4, 4, 248, 248);
  }

  // 4. Heavy Quilted Ballistic Flak Padding Undersuit (256x256 Albedo + Bump)
  const [uAlb, uaCtx] = makeCanvas(256);
  const [uBmp, ubCtx] = makeCanvas(256);
  if (uaCtx && ubCtx) {
    uaCtx.fillStyle = '#2d312c';
    uaCtx.fillRect(0, 0, 256, 256);
    ubCtx.fillStyle = '#7c7c7c';
    ubCtx.fillRect(0, 0, 256, 256);

    // Quilted heavy EOD ballistic baffle pads
    const step = 24;
    for (let y = 0; y < 256; y += step) {
      for (let x = 0; x < 256; x += step) {
        uaCtx.strokeStyle = 'rgba(14, 16, 14, 0.52)';
        uaCtx.lineWidth = 2;
        uaCtx.strokeRect(x + 1, y + 1, step - 2, step - 2);
        uaCtx.fillStyle = 'rgba(100, 108, 94, 0.08)';
        uaCtx.fillRect(x + 4, y + 4, step - 8, step - 8);

        ubCtx.strokeStyle = '#3c3c3c';
        ubCtx.lineWidth = 2.5;
        ubCtx.strokeRect(x + 1, y + 1, step - 2, step - 2);
        ubCtx.fillStyle = '#a4a4a4';
        ubCtx.fillRect(x + 5, y + 5, step - 10, step - 10);
      }
    }
  }

  // 5. Ballistic Rangefinder Amber-Gold Tactical Optic Lens (128x64)
  const [vCanvas, vCtx] = makeCanvas(128, 64);
  if (vCtx) {
    const vGrad = vCtx.createLinearGradient(0, 0, 0, 64);
    vGrad.addColorStop(0, '#ffe878');
    vGrad.addColorStop(0.5, '#ffaa18');
    vGrad.addColorStop(1, '#c86408');
    vCtx.fillStyle = vGrad;
    vCtx.fillRect(0, 0, 128, 64);

    // Ballistic rangefinder elevation hash marks
    vCtx.strokeStyle = 'rgba(42, 22, 4, 0.45)';
    vCtx.lineWidth = 1.5;
    for (let x = 16; x < 128; x += 16) {
      vCtx.beginPath();
      vCtx.moveTo(x, 8);
      vCtx.lineTo(x, 56);
      vCtx.stroke();
    }
    vCtx.fillStyle = 'rgba(255, 252, 220, 0.85)';
    vCtx.fillRect(10, 26, 108, 8);
  }

  const oliveArmorAlbedo = toTex(oAlb, 1, 1, true);
  const oliveArmorBump = toTex(oBmp, 1, 1, false);
  const oliveArmorRoughness = toTex(oRgh, 1, 1, false);
  const hazardPlateAlbedo = toTex(hAlb, 1, 1, true);
  const hazardPlateBump = toTex(hBmp, 1, 1, false);
  const gunmetalAlbedo = toTex(gAlb, 1, 1, true);
  const gunmetalBump = toTex(gBmp, 1, 1, false);
  const flakUndersuitAlbedo = toTex(uAlb, 2, 2, true);
  const flakUndersuitBump = toTex(uBmp, 2, 2, false);
  const rangefinderLensMap = toTex(vCanvas, 1, 1, true);

  return {
    oliveArmorAlbedo,
    oliveArmorBump,
    oliveArmorRoughness,
    hazardPlateAlbedo,
    hazardPlateBump,
    gunmetalAlbedo,
    gunmetalBump,
    flakUndersuitAlbedo,
    flakUndersuitBump,
    rangefinderLensMap,
    dispose: () => {
      oliveArmorAlbedo.dispose();
      oliveArmorBump.dispose();
      oliveArmorRoughness.dispose();
      hazardPlateAlbedo.dispose();
      hazardPlateBump.dispose();
      gunmetalAlbedo.dispose();
      gunmetalBump.dispose();
      flakUndersuitAlbedo.dispose();
      flakUndersuitBump.dispose();
      rangefinderLensMap.dispose();
    },
  };
}
