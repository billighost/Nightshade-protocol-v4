import * as THREE from 'three';

export interface BastionSevenTextureSuite {
  hullArmorAlbedo: THREE.CanvasTexture;
  hullArmorBump: THREE.CanvasTexture;
  hullArmorRoughness: THREE.CanvasTexture;
  bronzePlatingAlbedo: THREE.CanvasTexture;
  bronzePlatingBump: THREE.CanvasTexture;
  bronzePlatingRoughness: THREE.CanvasTexture;
  hydraulicSteelAlbedo: THREE.CanvasTexture;
  hydraulicSteelBump: THREE.CanvasTexture;
  reactorCoreMap: THREE.CanvasTexture;
  missileCellMap: THREE.CanvasTexture;
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
 * Bespoke AAA procedural PBR texture suite for Floor 07 Final Boss:
 * TITAN-RIG "BASTION-VII" (Round 2 Studio Polish)
 *
 * - Pure forged dark titanium-slate dreadnought ceramic armor (no accidental repeating
 *   stripes!) with deep chamfered panel seams, bolted armored inspection hatches,
 *   recessed cooling louvers, ballistic scorch burns, and chipped bare-titanium edge wear.
 * - Forged dark gunmetal-bronze / oxidized tactical brass siege armor trim (rich metallic
 *   anodized patina, recessed rivet seams, hydraulic oil streaks — zero wood-like grain!).
 * - High-contrast ribbed hydraulic cylinder steel & braided armored flex-hose weave.
 * - Incandescent spinning solar-gold / plasma-orange Chest Reactor Core fusion turbine lattice.
 * - Recessed dark carbon 6-cell missile silo bay faceplate with glowing amber warhead cones.
 */
export function createBastionSevenTextures(): BastionSevenTextureSuite {
  let seed = 70799;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // =========================================================================
  // 1. FORGED TITANIUM-SLATE DREADNOUGHT HULL ARMOR (512x512 Albedo/Bump/Rough)
  // =========================================================================
  const [hAlb, hCtx] = makeCanvas(512);
  const [hBmp, hbCtx] = makeCanvas(512);
  const [hRgh, hrCtx] = makeCanvas(512);

  if (hCtx && hbCtx && hrCtx) {
    // Rich military ceramic titanium-slate tonal gradient
    const grad = hCtx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#3e4c5e');
    grad.addColorStop(0.4, '#303b4a');
    grad.addColorStop(0.75, '#252f3c');
    grad.addColorStop(1, '#344152');
    hCtx.fillStyle = grad;
    hCtx.fillRect(0, 0, 512, 512);

    hbCtx.fillStyle = '#808080';
    hbCtx.fillRect(0, 0, 512, 512);

    // Satin-matte military ceramic coating (~0.58 baseline)
    hrCtx.fillStyle = '#949494';
    hrCtx.fillRect(0, 0, 512, 512);

    // Subtle multi-tone armor sub-panel value breakup (gives sculpted metallic depth!)
    const subPanels: Array<[number, number, number, number, string]> = [
      [8, 8, 154, 154, 'rgba(72, 88, 108, 0.24)'],
      [172, 8, 166, 154, 'rgba(18, 24, 32, 0.20)'],
      [348, 8, 156, 154, 'rgba(58, 72, 92, 0.18)'],
      [8, 174, 242, 164, 'rgba(20, 26, 34, 0.16)'],
      [260, 174, 244, 164, 'rgba(76, 92, 114, 0.22)'],
      [8, 348, 154, 156, 'rgba(64, 78, 96, 0.20)'],
      [172, 348, 332, 156, 'rgba(16, 22, 30, 0.18)'],
    ];
    for (const [px, py, pw, ph, col] of subPanels) {
      hCtx.fillStyle = col;
      hCtx.fillRect(px, py, pw, ph);
    }

    // Cast-titanium micro-grain & battle weathering speckles
    for (let i = 0; i < 2400; i++) {
      const x = rand() * 512;
      const y = rand() * 512;
      const sz = 1 + rand() * 2.8;
      const dark = rand() > 0.45;
      hCtx.fillStyle = dark ? 'rgba(10, 14, 20, 0.15)' : 'rgba(190, 208, 228, 0.07)';
      hCtx.fillRect(x, y, sz, sz);
      hbCtx.fillStyle = dark ? 'rgba(62, 62, 62, 0.18)' : 'rgba(168, 168, 168, 0.14)';
      hbCtx.fillRect(x, y, sz, sz);
    }

    // Heavy armored plate weld seams & chamfered panel grooves
    const drawSeam = (x1: number, y1: number, x2: number, y2: number, width = 4.2) => {
      hCtx.strokeStyle = 'rgba(8, 11, 16, 0.90)';
      hCtx.lineWidth = width;
      hCtx.beginPath();
      hCtx.moveTo(x1, y1);
      hCtx.lineTo(x2, y2);
      hCtx.stroke();

      // Chipped bare-titanium specular highlight along panel lip
      hCtx.strokeStyle = 'rgba(202, 218, 236, 0.34)';
      hCtx.lineWidth = 1.4;
      hCtx.beginPath();
      hCtx.moveTo(x1 + 2.4, y1 + 2.4);
      hCtx.lineTo(x2 + 2.4, y2 + 2.4);
      hCtx.stroke();

      hbCtx.strokeStyle = '#1d1d1d';
      hbCtx.lineWidth = width + 1;
      hbCtx.beginPath();
      hbCtx.moveTo(x1, y1);
      hbCtx.lineTo(x2, y2);
      hbCtx.stroke();

      hrCtx.strokeStyle = '#d8d8d8';
      hrCtx.lineWidth = width;
      hrCtx.beginPath();
      hrCtx.moveTo(x1, y1);
      hrCtx.lineTo(x2, y2);
      hrCtx.stroke();
    };

    drawSeam(0, 168, 512, 168, 4.5);
    drawSeam(0, 342, 512, 342, 4.5);
    drawSeam(168, 0, 168, 168, 4);
    drawSeam(344, 0, 344, 168, 4);
    drawSeam(256, 168, 256, 342, 4.2);
    drawSeam(168, 342, 168, 512, 4);

    // Recessed armored cooling louver slots on two panels
    for (const [vx, vy] of [
      [32, 38],
      [376, 38],
      [294, 210],
    ]) {
      for (let slot = 0; slot < 5; slot++) {
        const sy = vy + slot * 14;
        hCtx.fillStyle = '#0e131a';
        hCtx.fillRect(vx, sy, 86, 6);
        hCtx.fillStyle = 'rgba(176, 196, 218, 0.24)';
        hCtx.fillRect(vx, sy + 6, 86, 1.8);
        hbCtx.fillStyle = '#141414';
        hbCtx.fillRect(vx, sy, 86, 6);
      }
    }

    // Recessed hex armor bolts along panel corners
    const drawBolt = (bx: number, by: number) => {
      hCtx.fillStyle = '#0f141b';
      hCtx.beginPath();
      hCtx.arc(bx, by, 5.2, 0, Math.PI * 2);
      hCtx.fill();

      hCtx.fillStyle = '#6c7e94';
      hCtx.beginPath();
      hCtx.arc(bx - 0.6, by - 0.6, 3.3, 0, Math.PI * 2);
      hCtx.fill();

      hbCtx.fillStyle = '#dcdcdc';
      hbCtx.beginPath();
      hbCtx.arc(bx, by, 4.0, 0, Math.PI * 2);
      hbCtx.fill();

      hrCtx.fillStyle = '#484848';
      hrCtx.beginPath();
      hrCtx.arc(bx, by, 4.0, 0, Math.PI * 2);
      hrCtx.fill();
    };

    const boltCoords = [
      [20, 20], [148, 20], [20, 148], [148, 148],
      [188, 20], [324, 20], [188, 148], [324, 148],
      [364, 20], [492, 20], [364, 148], [492, 148],
      [20, 188], [236, 188], [20, 322], [236, 322],
      [276, 188], [492, 188], [276, 322], [492, 322],
      [20, 362], [148, 362], [188, 362], [492, 362],
      [20, 492], [148, 492], [188, 492], [492, 492],
    ];
    for (const [bx, by] of boltCoords) drawBolt(bx, by);

    // Subtle ballistic soot scorches & chipped bare-steel battle scratches
    for (let i = 0; i < 14; i++) {
      const sx = rand() * 512;
      const sy = rand() * 512;
      const rad = 16 + rand() * 34;
      const soot = hCtx.createRadialGradient(sx, sy, 2, sx, sy, rad);
      soot.addColorStop(0, 'rgba(8, 10, 14, 0.38)');
      soot.addColorStop(1, 'rgba(8, 10, 14, 0)');
      hCtx.fillStyle = soot;
      hCtx.beginPath();
      hCtx.arc(sx, sy, rad, 0, Math.PI * 2);
      hCtx.fill();
    }

    for (let i = 0; i < 42; i++) {
      const sx = rand() * 512;
      const sy = rand() * 512;
      const ang = (rand() - 0.5) * 2.2;
      const len = 8 + rand() * 28;
      hCtx.strokeStyle = 'rgba(214, 226, 240, 0.36)';
      hCtx.lineWidth = 1.0 + rand() * 1.2;
      hCtx.beginPath();
      hCtx.moveTo(sx, sy);
      hCtx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
      hCtx.stroke();

      hrCtx.strokeStyle = '#323232';
      hrCtx.lineWidth = 1.8;
      hrCtx.beginPath();
      hrCtx.moveTo(sx, sy);
      hrCtx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
      hrCtx.stroke();
    }
  }

  // =========================================================================
  // 2. FORGED DARK GUNMETAL-BRONZE SIEGE ALLOY (512x512 Albedo/Bump/Rough)
  // =========================================================================
  const [brAlb, brCtx] = makeCanvas(512);
  const [brBmp, brbCtx] = makeCanvas(512);
  const [brRgh, brrCtx] = makeCanvas(512);

  if (brCtx && brbCtx && brrCtx) {
    // Rich oxidized tactical bronze-gunmetal (deep forged metallic alloy, zero wood look!)
    const grad = brCtx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#8a6c3e');
    grad.addColorStop(0.35, '#725731');
    grad.addColorStop(0.7, '#5a4425');
    grad.addColorStop(1, '#785c34');
    brCtx.fillStyle = grad;
    brCtx.fillRect(0, 0, 512, 512);

    brbCtx.fillStyle = '#808080';
    brbCtx.fillRect(0, 0, 512, 512);

    // Satin machined alloy roughness (~0.40 baseline)
    brrCtx.fillStyle = '#686868';
    brrCtx.fillRect(0, 0, 512, 512);

    // Fine metallic sandblasted grain & oxidation mottling
    for (let i = 0; i < 2000; i++) {
      const x = rand() * 512;
      const y = rand() * 512;
      const sz = 1 + rand() * 2.6;
      const bright = rand() > 0.5;
      brCtx.fillStyle = bright ? 'rgba(230, 198, 138, 0.08)' : 'rgba(20, 14, 8, 0.14)';
      brCtx.fillRect(x, y, sz, sz);
      brbCtx.fillStyle = bright ? 'rgba(155, 155, 155, 0.14)' : 'rgba(92, 92, 92, 0.14)';
      brbCtx.fillRect(x, y, sz, sz);
    }

    // Crisp forged alloy panel seams + bare brass beveled edge sheen
    for (const py of [170, 342]) {
      brCtx.strokeStyle = 'rgba(18, 13, 8, 0.88)';
      brCtx.lineWidth = 4.2;
      brCtx.beginPath();
      brCtx.moveTo(0, py);
      brCtx.lineTo(512, py);
      brCtx.stroke();

      brCtx.strokeStyle = 'rgba(232, 204, 148, 0.36)';
      brCtx.lineWidth = 1.4;
      brCtx.beginPath();
      brCtx.moveTo(0, py + 2.8);
      brCtx.lineTo(512, py + 2.8);
      brCtx.stroke();

      brbCtx.strokeStyle = '#202020';
      brbCtx.lineWidth = 5;
      brbCtx.beginPath();
      brbCtx.moveTo(0, py);
      brbCtx.lineTo(512, py);
      brbCtx.stroke();
    }

    for (const px of [170, 342]) {
      brCtx.strokeStyle = 'rgba(18, 13, 8, 0.84)';
      brCtx.lineWidth = 3.8;
      brCtx.beginPath();
      brCtx.moveTo(px, 0);
      brCtx.lineTo(px, 512);
      brCtx.stroke();

      brbCtx.strokeStyle = '#242424';
      brbCtx.lineWidth = 4.4;
      brbCtx.beginPath();
      brbCtx.moveTo(px, 0);
      brbCtx.lineTo(px, 512);
      brbCtx.stroke();
    }

    // Precision forged armor bolts
    for (const py of [24, 146, 194, 318, 366, 488]) {
      for (const px of [24, 146, 194, 318, 366, 488]) {
        brCtx.fillStyle = 'rgba(18, 12, 6, 0.84)';
        brCtx.beginPath();
        brCtx.arc(px, py, 5.0, 0, Math.PI * 2);
        brCtx.fill();

        brCtx.fillStyle = '#c4a268';
        brCtx.beginPath();
        brCtx.arc(px - 0.7, py - 0.7, 3.0, 0, Math.PI * 2);
        brCtx.fill();

        brbCtx.fillStyle = '#dedede';
        brbCtx.beginPath();
        brbCtx.arc(px, py, 3.8, 0, Math.PI * 2);
        brbCtx.fill();
      }
    }

    // Dark weathered hydraulic oil patina & fine battle scratches
    for (let i = 0; i < 20; i++) {
      const sx = rand() * 512;
      const sy = rand() * 512;
      const rad = 14 + rand() * 28;
      const pat = brCtx.createRadialGradient(sx, sy, 2, sx, sy, rad);
      pat.addColorStop(0, 'rgba(16, 12, 8, 0.34)');
      pat.addColorStop(1, 'rgba(16, 12, 8, 0)');
      brCtx.fillStyle = pat;
      brCtx.beginPath();
      brCtx.arc(sx, sy, rad, 0, Math.PI * 2);
      brCtx.fill();
    }

    for (let i = 0; i < 34; i++) {
      const sx = rand() * 512;
      const sy = rand() * 512;
      const ang = (rand() - 0.5) * 2.0;
      const len = 8 + rand() * 26;
      brCtx.strokeStyle = 'rgba(242, 218, 168, 0.35)';
      brCtx.lineWidth = 1.1;
      brCtx.beginPath();
      brCtx.moveTo(sx, sy);
      brCtx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
      brCtx.stroke();

      brrCtx.strokeStyle = '#303030';
      brrCtx.lineWidth = 1.6;
      brrCtx.beginPath();
      brrCtx.moveTo(sx, sy);
      brrCtx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
      brrCtx.stroke();
    }
  }

  // =========================================================================
  // 3. RIBBED HYDRAULIC STEEL & BRAIDED CONDUIT (256x256 Albedo/Bump)
  // =========================================================================
  const [hyAlb, hyCtx] = makeCanvas(256);
  const [hyBmp, hybCtx] = makeCanvas(256);

  if (hyCtx && hybCtx) {
    hyCtx.fillStyle = '#222830';
    hyCtx.fillRect(0, 0, 256, 256);
    hybCtx.fillStyle = '#606060';
    hybCtx.fillRect(0, 0, 256, 256);

    for (let y = 0; y < 256; y += 16) {
      hyCtx.fillStyle = '#3b4452';
      hyCtx.fillRect(0, y, 256, 8);
      hyCtx.fillStyle = '#13171d';
      hyCtx.fillRect(0, y + 8, 256, 5);
      hyCtx.fillStyle = 'rgba(198, 212, 232, 0.24)';
      hyCtx.fillRect(0, y + 1, 256, 2);

      hybCtx.fillStyle = '#d4d4d4';
      hybCtx.fillRect(0, y, 256, 8);
      hybCtx.fillStyle = '#181818';
      hybCtx.fillRect(0, y + 8, 256, 6);
    }

    hyCtx.strokeStyle = 'rgba(16, 20, 26, 0.45)';
    hyCtx.lineWidth = 2;
    for (let i = -256; i < 512; i += 24) {
      hyCtx.beginPath();
      hyCtx.moveTo(i, 0);
      hyCtx.lineTo(i + 256, 256);
      hyCtx.stroke();
      hyCtx.beginPath();
      hyCtx.moveTo(i + 256, 0);
      hyCtx.lineTo(i, 256);
      hyCtx.stroke();
    }
  }

  // =========================================================================
  // 4. MOLTEN SOLAR-PLASMA CHEST REACTOR CORE LATTICE (256x256 Emissive/Albedo)
  // =========================================================================
  const [rcAlb, rcCtx] = makeCanvas(256);
  if (rcCtx) {
    const radGrad = rcCtx.createRadialGradient(128, 128, 8, 128, 128, 126);
    radGrad.addColorStop(0, '#fffef2');
    radGrad.addColorStop(0.24, '#ffe17a');
    radGrad.addColorStop(0.55, '#ff8e1a');
    radGrad.addColorStop(0.84, '#cc3a0c');
    radGrad.addColorStop(1, '#361008');
    rcCtx.fillStyle = radGrad;
    rcCtx.fillRect(0, 0, 256, 256);

    rcCtx.strokeStyle = 'rgba(30, 14, 8, 0.72)';
    for (const r of [34, 62, 92, 114]) {
      rcCtx.lineWidth = r === 92 ? 6 : 3.5;
      rcCtx.beginPath();
      rcCtx.arc(128, 128, r, 0, Math.PI * 2);
      rcCtx.stroke();
    }

    rcCtx.strokeStyle = 'rgba(42, 18, 8, 0.76)';
    rcCtx.lineWidth = 5;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      rcCtx.beginPath();
      rcCtx.moveTo(128 + Math.cos(a) * 28, 128 + Math.sin(a) * 28);
      rcCtx.lineTo(128 + Math.cos(a + 0.16) * 120, 128 + Math.sin(a + 0.16) * 120);
      rcCtx.stroke();
    }

    rcCtx.strokeStyle = 'rgba(255, 250, 220, 0.85)';
    rcCtx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const a = ((i + 0.5) / 12) * Math.PI * 2;
      rcCtx.beginPath();
      rcCtx.moveTo(128 + Math.cos(a) * 14, 128 + Math.sin(a) * 14);
      rcCtx.lineTo(128 + Math.cos(a) * 86, 128 + Math.sin(a) * 86);
      rcCtx.stroke();
    }
  }

  // =========================================================================
  // 5. 6-CELL SHOULDER MISSILE SILO FACEPLATE MAP (256x256)
  // =========================================================================
  const [msAlb, msCtx] = makeCanvas(256);
  if (msCtx) {
    msCtx.fillStyle = '#181e26';
    msCtx.fillRect(0, 0, 256, 256);

    msCtx.strokeStyle = '#4a586a';
    msCtx.lineWidth = 6;
    msCtx.strokeRect(8, 8, 240, 240);

    const cols = [52, 128, 204];
    const rows = [78, 178];
    for (const cy of rows) {
      for (const cx of cols) {
        msCtx.fillStyle = '#090c10';
        msCtx.beginPath();
        msCtx.arc(cx, cy, 30, 0, Math.PI * 2);
        msCtx.fill();

        msCtx.strokeStyle = '#d98c1e';
        msCtx.lineWidth = 3.5;
        msCtx.beginPath();
        msCtx.arc(cx, cy, 29, 0, Math.PI * 2);
        msCtx.stroke();

        const tip = msCtx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 18);
        tip.addColorStop(0, '#ffefc0');
        tip.addColorStop(0.45, '#ff981c');
        tip.addColorStop(1, '#582008');
        msCtx.fillStyle = tip;
        msCtx.beginPath();
        msCtx.arc(cx, cy, 17, 0, Math.PI * 2);
        msCtx.fill();
      }
    }
  }

  const hullArmorAlbedo = toTex(hAlb, 1, 1, true);
  const hullArmorBump = toTex(hBmp, 1, 1, false);
  const hullArmorRoughness = toTex(hRgh, 1, 1, false);
  const bronzePlatingAlbedo = toTex(brAlb, 1, 1, true);
  const bronzePlatingBump = toTex(brBmp, 1, 1, false);
  const bronzePlatingRoughness = toTex(brRgh, 1, 1, false);
  const hydraulicSteelAlbedo = toTex(hyAlb, 2, 2, true);
  const hydraulicSteelBump = toTex(hyBmp, 2, 2, false);
  const reactorCoreMap = toTex(rcAlb, 1, 1, true);
  const missileCellMap = toTex(msAlb, 1, 1, true);

  return {
    hullArmorAlbedo,
    hullArmorBump,
    hullArmorRoughness,
    bronzePlatingAlbedo,
    bronzePlatingBump,
    bronzePlatingRoughness,
    hydraulicSteelAlbedo,
    hydraulicSteelBump,
    reactorCoreMap,
    missileCellMap,
    dispose: () => {
      hullArmorAlbedo.dispose();
      hullArmorBump.dispose();
      hullArmorRoughness.dispose();
      bronzePlatingAlbedo.dispose();
      bronzePlatingBump.dispose();
      bronzePlatingRoughness.dispose();
      hydraulicSteelAlbedo.dispose();
      hydraulicSteelBump.dispose();
      reactorCoreMap.dispose();
      missileCellMap.dispose();
    },
  };
}
