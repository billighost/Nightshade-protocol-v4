import * as THREE from 'three';

export interface ArchiveRealityWeaverTextureSuite {
  armorMap: THREE.CanvasTexture;
  armorBump: THREE.CanvasTexture;
  armorRoughness: THREE.CanvasTexture;
  goldMap: THREE.CanvasTexture;
  goldBump: THREE.CanvasTexture;
  vestmentMap: THREE.CanvasTexture;
  vestmentBump: THREE.CanvasTexture;
  maskMap: THREE.CanvasTexture;
  maskBump: THREE.CanvasTexture;
  sigilAlphaMap: THREE.CanvasTexture;
  beamMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(size = 512): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function toTex(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function seededNoise(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

/**
 * Generates the bespoke 512x512 procedural PBR texture suite for the Floor 06
 * Zone Mini-Boss: ARCHIVE REALITY-WEAVER ("Sovereign Celestial Loom-Archivist").
 */
export function createArchiveRealityWeaverTextures(): ArchiveRealityWeaverTextureSuite {
  const S = 512;

  // ── 1. Sovereign Obsidian-Velvet Cathedral Armor (Albedo / Bump / Roughness) ──
  const [armorC, aCtx] = makeCanvas(S);
  const [armorBC, abCtx] = makeCanvas(S);
  const [armorRC, arCtx] = makeCanvas(S);

  const aGrad = aCtx.createLinearGradient(0, 0, S, S);
  aGrad.addColorStop(0, '#161327');
  aGrad.addColorStop(0.5, '#1f1936');
  aGrad.addColorStop(1, '#120f20');
  aCtx.fillStyle = aGrad;
  aCtx.fillRect(0, 0, S, S);

  abCtx.fillStyle = '#808080';
  abCtx.fillRect(0, 0, S, S);

  arCtx.fillStyle = '#5c5c5c';
  arCtx.fillRect(0, 0, S, S);

  // Subtle architectural stone-obsidian micro-grain & metallic directional polish
  for (let i = 0; i < 2400; i++) {
    const x = seededNoise(i * 3) * S;
    const y = seededNoise(i * 3 + 1) * S;
    const len = 8 + seededNoise(i * 3 + 2) * 28;
    const alpha = 0.03 + seededNoise(i * 7) * 0.04;
    aCtx.strokeStyle = i % 2 === 0 ? `rgba(128,112,186,${alpha})` : `rgba(8,6,16,${alpha * 1.4})`;
    aCtx.lineWidth = 1;
    aCtx.beginPath();
    aCtx.moveTo(x, y);
    aCtx.lineTo(x + len * 0.3, y + len);
    aCtx.stroke();

    const gVal = 118 + Math.floor(seededNoise(i * 5) * 22);
    abCtx.fillStyle = `rgb(${gVal},${gVal},${gVal})`;
    abCtx.fillRect(x, y, 2, 4);
  }

  // Carved gothic fluted monolith ribs & gold-inlaid sacred geometry astrolabe channels
  for (let col = 0; col < 8; col++) {
    const cx = col * 64 + 32;
    // Recessed vertical flute shadow
    const fGrad = aCtx.createLinearGradient(cx - 12, 0, cx + 12, 0);
    fGrad.addColorStop(0, 'rgba(6,5,14,0.45)');
    fGrad.addColorStop(0.5, 'rgba(62,50,104,0.22)');
    fGrad.addColorStop(1, 'rgba(6,5,14,0.45)');
    aCtx.fillStyle = fGrad;
    aCtx.fillRect(cx - 12, 0, 24, S);

    abCtx.fillStyle = '#484848';
    abCtx.fillRect(cx - 2, 0, 4, S);
    abCtx.fillStyle = '#a4a4a4';
    abCtx.fillRect(cx - 11, 0, 3, S);
    abCtx.fillRect(cx + 8, 0, 3, S);

    // Delicate recessed hairline gold inlay inside alternate flutes
    if (col % 2 === 0) {
      aCtx.strokeStyle = 'rgba(218, 174, 72, 0.58)';
      aCtx.lineWidth = 1.6;
      aCtx.beginPath();
      aCtx.moveTo(cx, 0);
      aCtx.lineTo(cx, S);
      aCtx.stroke();

      arCtx.fillStyle = '#242424';
      arCtx.fillRect(cx - 1, 0, 2, S);
    }
  }

  // Cathedral diamond-lattice sacred geometry engravings
  aCtx.strokeStyle = 'rgba(224, 182, 82, 0.32)';
  aCtx.lineWidth = 1.5;
  abCtx.strokeStyle = '#c8c8c8';
  abCtx.lineWidth = 2;
  for (let y = 0; y <= S; y += 128) {
    for (let x = 0; x <= S; x += 128) {
      aCtx.beginPath();
      aCtx.moveTo(x, y - 44);
      aCtx.lineTo(x + 44, y);
      aCtx.lineTo(x, y + 44);
      aCtx.lineTo(x - 44, y);
      aCtx.closePath();
      aCtx.stroke();

      abCtx.beginPath();
      abCtx.moveTo(x, y - 44);
      abCtx.lineTo(x + 44, y);
      abCtx.lineTo(x, y + 44);
      abCtx.lineTo(x - 44, y);
      abCtx.closePath();
      abCtx.stroke();

      // Tiny gold celestial rivet node
      aCtx.fillStyle = '#e7c163';
      aCtx.beginPath();
      aCtx.arc(x, y, 3.2, 0, Math.PI * 2);
      aCtx.fill();
    }
  }

  // Subtle violet-starry mineral flecks across the obsidian plates
  for (let i = 0; i < 220; i++) {
    const sx = seededNoise(i * 11 + 4) * S;
    const sy = seededNoise(i * 11 + 9) * S;
    const sr = 0.8 + seededNoise(i * 13) * 1.4;
    aCtx.fillStyle = i % 3 === 0 ? 'rgba(216,148,255,0.42)' : 'rgba(246,214,122,0.34)';
    aCtx.beginPath();
    aCtx.arc(sx, sy, sr, 0, Math.PI * 2);
    aCtx.fill();
  }

  // ── 2. Hammered Sovereign Relic-Gold Filigree (Albedo / Bump) ──
  const [goldC, gCtx] = makeCanvas(S);
  const [goldBC, gbCtx] = makeCanvas(S);

  const gGrad = gCtx.createLinearGradient(0, 0, S, S);
  gGrad.addColorStop(0, '#c6932e');
  gGrad.addColorStop(0.35, '#f0cc6e');
  gGrad.addColorStop(0.65, '#cfa03a');
  gGrad.addColorStop(1, '#9e7020');
  gCtx.fillStyle = gGrad;
  gCtx.fillRect(0, 0, S, S);

  gbCtx.fillStyle = '#808080';
  gbCtx.fillRect(0, 0, S, S);

  // Chased hammered specular dimples & antique bronze crevice patina
  for (let i = 0; i < 900; i++) {
    const x = seededNoise(i * 17) * S;
    const y = seededNoise(i * 17 + 1) * S;
    const r = 3 + seededNoise(i * 17 + 2) * 8;
    const bright = i % 2 === 0;
    gCtx.fillStyle = bright ? 'rgba(255,244,194,0.12)' : 'rgba(92,58,12,0.14)';
    gCtx.beginPath();
    gCtx.arc(x, y, r, 0, Math.PI * 2);
    gCtx.fill();

    gbCtx.fillStyle = bright ? 'rgba(165,165,165,0.22)' : 'rgba(95,95,95,0.22)';
    gbCtx.beginPath();
    gbCtx.arc(x, y, r, 0, Math.PI * 2);
    gbCtx.fill();
  }

  // Horizontal astrolabe calibration ticks & filigree cathedral bands
  for (let band = 0; band < 4; band++) {
    const by = band * 128 + 64;
    gCtx.strokeStyle = '#6c4711';
    gCtx.lineWidth = 3;
    gCtx.beginPath();
    gCtx.moveTo(0, by - 16);
    gCtx.lineTo(S, by - 16);
    gCtx.moveTo(0, by + 16);
    gCtx.lineTo(S, by + 16);
    gCtx.stroke();

    gbCtx.strokeStyle = '#3c3c3c';
    gbCtx.lineWidth = 3;
    gbCtx.beginPath();
    gbCtx.moveTo(0, by - 16);
    gbCtx.lineTo(S, by - 16);
    gbCtx.moveTo(0, by + 16);
    gbCtx.lineTo(S, by + 16);
    gbCtx.stroke();

    // Calibration ticks + raised filigree ovals
    for (let x = 0; x < S; x += 16) {
      gCtx.strokeStyle = x % 32 === 0 ? '#fff0b8' : '#7a5216';
      gCtx.lineWidth = x % 32 === 0 ? 2 : 1.2;
      gCtx.beginPath();
      gCtx.moveTo(x, by - 11);
      gCtx.lineTo(x, by + 11);
      gCtx.stroke();

      gbCtx.strokeStyle = x % 32 === 0 ? '#e6e6e6' : '#555555';
      gbCtx.lineWidth = 2;
      gbCtx.beginPath();
      gbCtx.moveTo(x, by - 11);
      gbCtx.lineTo(x, by + 11);
      gbCtx.stroke();
    }
  }

  // ── 3. Floating Ceremonial Vestment Robe / Stole Cloth (Albedo / Bump) ──
  // NOTE: CanvasTexture has flipY=true, so v=0 (bottom hem) maps to canvas y=S (512)!
  const [vestC, vCtx] = makeCanvas(S);
  const [vestBC, vbCtx] = makeCanvas(S);

  const vGrad = vCtx.createLinearGradient(0, 0, 0, S);
  vGrad.addColorStop(0.0, '#140c22');
  vGrad.addColorStop(0.55, '#201334');
  vGrad.addColorStop(0.84, '#2c1747');
  vGrad.addColorStop(1.0, '#160b26');
  vCtx.fillStyle = vGrad;
  vCtx.fillRect(0, 0, S, S);

  vbCtx.fillStyle = '#808080';
  vbCtx.fillRect(0, 0, S, S);

  // Fine velvet brocade diagonal weave + vertical drapery shadow folds
  for (let i = -S; i < S * 2; i += 6) {
    vCtx.strokeStyle = 'rgba(130, 88, 185, 0.06)';
    vCtx.lineWidth = 1;
    vCtx.beginPath();
    vCtx.moveTo(i, 0);
    vCtx.lineTo(i + S, S);
    vCtx.stroke();

    vbCtx.strokeStyle = 'rgba(148,148,148,0.16)';
    vbCtx.beginPath();
    vbCtx.moveTo(i, 0);
    vbCtx.lineTo(i + S, S);
    vbCtx.stroke();
  }
  for (let f = 0; f < 16; f++) {
    const fx = f * 32 + 16;
    const fGrad = vCtx.createLinearGradient(fx - 16, 0, fx + 16, 0);
    fGrad.addColorStop(0, 'rgba(6,3,14,0.34)');
    fGrad.addColorStop(0.5, 'rgba(116,74,172,0.16)');
    fGrad.addColorStop(1, 'rgba(6,3,14,0.34)');
    vCtx.fillStyle = fGrad;
    vCtx.fillRect(fx - 16, 0, 32, S);
  }

  // Upper celestial star-map constellations embroidered in subtle gilt thread
  vCtx.strokeStyle = 'rgba(234, 194, 92, 0.34)';
  vCtx.lineWidth = 1.4;
  for (let c = 0; c < 4; c++) {
    const ox = c * 128 + 64;
    const oy = 180;
    vCtx.beginPath();
    vCtx.arc(ox, oy, 36, 0, Math.PI * 2);
    vCtx.stroke();
    vCtx.beginPath();
    vCtx.moveTo(ox, oy - 54);
    vCtx.lineTo(ox + 22, oy);
    vCtx.lineTo(ox, oy + 54);
    vCtx.lineTo(ox - 22, oy);
    vCtx.closePath();
    vCtx.stroke();
    // Tiny constellation stars
    vCtx.fillStyle = '#fde68a';
    vCtx.beginPath();
    vCtx.arc(ox, oy, 3.2, 0, Math.PI * 2);
    vCtx.fill();
  }

  // Ornate Gilded Astronomical Hem Embroidery Band near bottom (y = 376..504 -> v = 0.02..0.26)
  vCtx.fillStyle = 'rgba(48, 22, 74, 0.85)';
  vCtx.fillRect(0, 378, S, 124);

  // Double metallic gold trim borders
  const drawGoldLine = (y: number, lw: number, color = '#eab949') => {
    vCtx.strokeStyle = color;
    vCtx.lineWidth = lw;
    vCtx.beginPath();
    vCtx.moveTo(0, y);
    vCtx.lineTo(S, y);
    vCtx.stroke();

    vbCtx.strokeStyle = '#ebebeb';
    vbCtx.lineWidth = lw + 1;
    vbCtx.beginPath();
    vbCtx.moveTo(0, y);
    vbCtx.lineTo(S, y);
    vbCtx.stroke();
  };

  drawGoldLine(382, 5, '#f6d472');
  drawGoldLine(394, 2, '#c89228');
  drawGoldLine(474, 2.5, '#c89228');
  drawGoldLine(488, 6, '#fde68a');

  // Embroidered sacred chevron + diamond sunburst band between y=396 and y=472
  vCtx.strokeStyle = '#f5cf68';
  vCtx.lineWidth = 3;
  vbCtx.strokeStyle = '#dcdcdc';
  vbCtx.lineWidth = 3.5;
  for (let x = 0; x < S; x += 32) {
    vCtx.beginPath();
    vCtx.moveTo(x, 434);
    vCtx.lineTo(x + 16, 404);
    vCtx.lineTo(x + 32, 434);
    vCtx.lineTo(x + 16, 464);
    vCtx.closePath();
    vCtx.stroke();

    vbCtx.beginPath();
    vbCtx.moveTo(x, 434);
    vbCtx.lineTo(x + 16, 404);
    vbCtx.lineTo(x + 32, 434);
    vbCtx.lineTo(x + 16, 464);
    vbCtx.closePath();
    vbCtx.stroke();

    // Glowing amethyst-gold jewel stitch in center of each diamond
    vCtx.fillStyle = x % 64 === 0 ? '#e879f9' : '#fde047';
    vCtx.beginPath();
    vCtx.arc(x + 16, 434, 4.4, 0, Math.PI * 2);
    vCtx.fill();
  }

  // Luminous ley-thread hem fringe at very bottom (y=494..512)
  for (let x = 4; x < S; x += 8) {
    vCtx.fillStyle = x % 16 === 0 ? '#f6d365' : '#d946ef';
    vCtx.fillRect(x, 494, 3, 18);
  }

  // ── 4. Celestial Gilded-Porcelain Mask (Albedo / Bump) ──
  const [maskC, mCtx] = makeCanvas(S);
  const [maskBC, mbCtx] = makeCanvas(S);

  const mGrad = mCtx.createRadialGradient(S * 0.5, S * 0.48, 24, S * 0.5, S * 0.5, S * 0.54);
  mGrad.addColorStop(0, '#dbd4e6');
  mGrad.addColorStop(0.55, '#aba1be');
  mGrad.addColorStop(1, '#4c425e');
  mCtx.fillStyle = mGrad;
  mCtx.fillRect(0, 0, S, S);

  mbCtx.fillStyle = '#848484';
  mbCtx.fillRect(0, 0, S, S);

  // Subtle porcelain sheen + Kintsugi sacred gold crackle lines radiating from mask center
  mCtx.strokeStyle = '#e5b94c';
  mCtx.lineWidth = 2.4;
  mbCtx.strokeStyle = '#d4d4d4';
  mbCtx.lineWidth = 3;
  const crackRays = [
    [256, 240, 195, 165, 128, 122],
    [256, 240, 317, 165, 384, 122],
    [256, 270, 188, 315, 118, 366],
    [256, 270, 324, 315, 394, 366],
    [256, 210, 224, 112, 210, 48],
    [256, 210, 288, 112, 302, 48],
  ];
  for (const r of crackRays) {
    mCtx.beginPath();
    mCtx.moveTo(r[0], r[1]);
    mCtx.lineTo(r[2], r[3]);
    mCtx.lineTo(r[4], r[5]);
    mCtx.stroke();

    mbCtx.beginPath();
    mbCtx.moveTo(r[0], r[1]);
    mbCtx.lineTo(r[2], r[3]);
    mbCtx.lineTo(r[4], r[5]);
    mbCtx.stroke();
  }
  // Delicate gilded brow arch & cheek contour filigree
  mCtx.strokeStyle = 'rgba(218, 174, 70, 0.75)';
  mCtx.lineWidth = 3;
  mCtx.beginPath();
  mCtx.arc(S * 0.5, S * 0.52, 138, Math.PI * 1.15, Math.PI * 1.85);
  mCtx.stroke();

  // ── 5. Celestial Astrolabe Levitation & Phase-2 Mandala Sigil (Alpha Map) ──
  const [sigC, sCtx] = makeCanvas(S);
  sCtx.fillStyle = '#000000';
  sCtx.fillRect(0, 0, S, S);

  const cx = S * 0.5;
  const cy = S * 0.5;
  sCtx.strokeStyle = '#ffffff';
  sCtx.fillStyle = '#ffffff';

  // Concentric astrolabe rings
  const ringRadii = [
    { r: 236, lw: 6 },
    { r: 214, lw: 2.5 },
    { r: 178, lw: 4 },
    { r: 132, lw: 2.5 },
    { r: 84, lw: 4 },
  ];
  for (const ring of ringRadii) {
    sCtx.lineWidth = ring.lw;
    sCtx.beginPath();
    sCtx.arc(cx, cy, ring.r, 0, Math.PI * 2);
    sCtx.stroke();
  }

  // Inscribed 6-point twin equilateral star (Cathedral Hexagram)
  for (let rot = 0; rot < 2; rot++) {
    sCtx.lineWidth = 3.5;
    sCtx.beginPath();
    for (let i = 0; i < 3; i++) {
      const ang = (i * Math.PI * 2) / 3 + (rot * Math.PI) / 3;
      const px = cx + Math.cos(ang) * 212;
      const py = cy + Math.sin(ang) * 212;
      if (i === 0) sCtx.moveTo(px, py);
      else sCtx.lineTo(px, py);
    }
    sCtx.closePath();
    sCtx.stroke();
  }

  // 12 radial compass spokes + outer rune nodes
  for (let i = 0; i < 12; i++) {
    const ang = (i * Math.PI * 2) / 12;
    const inner = i % 2 === 0 ? 84 : 132;
    sCtx.lineWidth = i % 2 === 0 ? 3.2 : 1.8;
    sCtx.beginPath();
    sCtx.moveTo(cx + Math.cos(ang) * inner, cy + Math.sin(ang) * inner);
    sCtx.lineTo(cx + Math.cos(ang) * 236, cy + Math.sin(ang) * 236);
    sCtx.stroke();

    // Small glowing calibration circles on outer ring
    sCtx.lineWidth = 2.4;
    sCtx.beginPath();
    sCtx.arc(cx + Math.cos(ang) * 196, cy + Math.sin(ang) * 196, 10, 0, Math.PI * 2);
    sCtx.stroke();
  }

  // Subtle central halo glow gradient
  const cGrad = sCtx.createRadialGradient(cx, cy, 8, cx, cy, 88);
  cGrad.addColorStop(0, 'rgba(255,255,255,0.65)');
  cGrad.addColorStop(0.6, 'rgba(255,255,255,0.18)');
  cGrad.addColorStop(1, 'rgba(255,255,255,0.0)');
  sCtx.fillStyle = cGrad;
  sCtx.beginPath();
  sCtx.arc(cx, cy, 88, 0, Math.PI * 2);
  sCtx.fill();

  // ── 6. Volumetric Reality-Tear Beam Stream Texture ──
  const [beamC, bCtx] = makeCanvas(256);
  bCtx.fillStyle = '#240836';
  bCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 28; i++) {
    const x = (i / 28) * 256;
    const isGold = i % 4 === 0;
    const grad = bCtx.createLinearGradient(x - 10, 0, x + 10, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, isGold ? 'rgba(254, 240, 138, 0.85)' : 'rgba(232, 121, 249, 0.82)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    bCtx.fillStyle = grad;
    bCtx.fillRect(x - 10, 0, 20, 256);
  }
  // Diagonal plasma shear streaks
  bCtx.strokeStyle = 'rgba(255, 250, 220, 0.65)';
  bCtx.lineWidth = 3;
  for (let y = -128; y < 384; y += 32) {
    bCtx.beginPath();
    bCtx.moveTo(0, y);
    bCtx.lineTo(256, y + 64);
    bCtx.stroke();
  }

  const armorMap = toTex(armorC, true, 1.5, 1.5);
  const armorBump = toTex(armorBC, false, 1.5, 1.5);
  const armorRoughness = toTex(armorRC, false, 1.5, 1.5);
  const goldMap = toTex(goldC, true, 1.5, 1.5);
  const goldBump = toTex(goldBC, false, 1.5, 1.5);
  const vestmentMap = toTex(vestC, true, 1, 1);
  const vestmentBump = toTex(vestBC, false, 1, 1);
  const maskMap = toTex(maskC, true, 1, 1);
  const maskBump = toTex(maskBC, false, 1, 1);
  const sigilAlphaMap = toTex(sigC, false, 1, 1);
  sigilAlphaMap.wrapS = THREE.ClampToEdgeWrapping;
  sigilAlphaMap.wrapT = THREE.ClampToEdgeWrapping;
  const beamMap = toTex(beamC, true, 1, 3);

  return {
    armorMap,
    armorBump,
    armorRoughness,
    goldMap,
    goldBump,
    vestmentMap,
    vestmentBump,
    maskMap,
    maskBump,
    sigilAlphaMap,
    beamMap,
    dispose: () => {
      armorMap.dispose();
      armorBump.dispose();
      armorRoughness.dispose();
      goldMap.dispose();
      goldBump.dispose();
      vestmentMap.dispose();
      vestmentBump.dispose();
      maskMap.dispose();
      maskBump.dispose();
      sigilAlphaMap.dispose();
      beamMap.dispose();
    },
  };
}
