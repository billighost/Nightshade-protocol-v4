import * as THREE from 'three';

export interface BunkerGravityHoundTextureSuite {
  armorMap: THREE.CanvasTexture;
  armorBump: THREE.CanvasTexture;
  armorRoughness: THREE.CanvasTexture;
  bronzeMap: THREE.CanvasTexture;
  bronzeBump: THREE.CanvasTexture;
  underframeMap: THREE.CanvasTexture;
  underframeBump: THREE.CanvasTexture;
  gravFieldAlphaMap: THREE.CanvasTexture;
  beamFluxMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(size = 512): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeTex(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Procedural 512x512 PBR texture suite for BUNKER GRAVITY-HOUND (Floor 06 SW Armory Mini-Boss):
 * - Forged Black-Site Brutalist Siege-Plating (bolted obsidian-gunmetal steel, louvers, crimson-amber hazard chevrons, edge wear)
 * - Aged Relic-Bronze Hydraulic & Shock-Absorber Metallurgy
 * - Carbon-Weave Ribbed Flex Underframe with Glowing Crimson Conduit Seams
 * - Gravitational Distortion Well Field Sigil (alphaMap)
 * - Scrolling Molten Singularity Maw Beam Plasma Stream
 */
export function createBunkerGravityHoundTextures(): BunkerGravityHoundTextureSuite {
  // 1. Forged Black-Site Brutalist Siege-Plating (Albedo + Bump + Roughness)
  const [aColC, aCol] = makeCanvas(512);
  const [aBmpC, aBmp] = makeCanvas(512);
  const [aRghC, aRgh] = makeCanvas(512);

  // Dark slate-gunmetal forged military steel base
  const armorGrad = aCol.createLinearGradient(0, 0, 512, 512);
  armorGrad.addColorStop(0, '#272b35');
  armorGrad.addColorStop(0.48, '#1b1e26');
  armorGrad.addColorStop(1, '#2d323e');
  aCol.fillStyle = armorGrad;
  aCol.fillRect(0, 0, 512, 512);

  aBmp.fillStyle = '#808080';
  aBmp.fillRect(0, 0, 512, 512);

  aRgh.fillStyle = '#7c7c7c';
  aRgh.fillRect(0, 0, 512, 512);

  // Brushed directional steel grain & micro-scratches
  let seed = 60219;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 650; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const len = 18 + rand() * 76;
    const bright = rand() > 0.45;
    aCol.strokeStyle = bright ? 'rgba(135,148,170,0.09)' : 'rgba(6,8,12,0.16)';
    aCol.lineWidth = 1 + rand() * 1.4;
    aCol.beginPath();
    aCol.moveTo(x, y);
    aCol.lineTo(x + len, y + (rand() - 0.5) * 6);
    aCol.stroke();

    aRgh.strokeStyle = bright ? 'rgba(70,70,70,0.22)' : 'rgba(185,185,185,0.18)';
    aRgh.lineWidth = 1.5;
    aRgh.beginPath();
    aRgh.moveTo(x, y);
    aRgh.lineTo(x + len, y);
    aRgh.stroke();
  }

  // Heavy beveled brutalist panel seams + bright metallic edge wear
  const panels: Array<[number, number, number, number]> = [
    [14, 14, 232, 230],
    [264, 14, 234, 166],
    [264, 198, 234, 152],
    [14, 262, 232, 236],
    [264, 368, 234, 130],
  ];
  for (const [px, py, pw, ph] of panels) {
    // Deep recess groove
    aCol.strokeStyle = '#090b10';
    aCol.lineWidth = 5;
    aCol.strokeRect(px, py, pw, ph);

    // Chipped steel highlight bevel on upper-left edge
    aCol.strokeStyle = 'rgba(176,192,216,0.28)';
    aCol.lineWidth = 2;
    aCol.beginPath();
    aCol.moveTo(px + 3, py + ph - 3);
    aCol.lineTo(px + 3, py + 3);
    aCol.lineTo(px + pw - 3, py + 3);
    aCol.stroke();

    aBmp.strokeStyle = '#202020';
    aBmp.lineWidth = 6;
    aBmp.strokeRect(px, py, pw, ph);
    aBmp.strokeStyle = '#d4d4d4';
    aBmp.lineWidth = 2;
    aBmp.strokeRect(px + 4, py + 4, pw - 8, ph - 8);

    aRgh.strokeStyle = '#3c3c3c';
    aRgh.lineWidth = 3;
    aRgh.strokeRect(px + 3, py + 3, pw - 6, ph - 6);

    // Corner hex bolts
    const boltPts: Array<[number, number]> = [
      [px + 14, py + 14],
      [px + pw - 14, py + 14],
      [px + 14, py + ph - 14],
      [px + pw - 14, py + ph - 14],
    ];
    for (const [bx, by] of boltPts) {
      aCol.fillStyle = '#0d1017';
      aCol.beginPath();
      aCol.arc(bx, by, 5.5, 0, Math.PI * 2);
      aCol.fill();
      aCol.fillStyle = '#727d91';
      aCol.beginPath();
      aCol.arc(bx - 1, by - 1, 3.2, 0, Math.PI * 2);
      aCol.fill();

      aBmp.fillStyle = '#dcdcdc';
      aBmp.beginPath();
      aBmp.arc(bx, by, 4.5, 0, Math.PI * 2);
      aBmp.fill();
    }
  }

  // Milled industrial cooling louver slits on upper-right panel
  for (let i = 0; i < 6; i++) {
    const ly = 36 + i * 21;
    aCol.fillStyle = '#08090d';
    aCol.fillRect(292, ly, 178, 9);
    aCol.fillStyle = 'rgba(239,68,68,0.22)';
    aCol.fillRect(296, ly + 3, 170, 3);
    aBmp.fillStyle = '#181818';
    aBmp.fillRect(292, ly, 178, 9);
    aBmp.fillStyle = '#cfcfcf';
    aBmp.fillRect(292, ly + 9, 178, 3);
  }

  // Crimson-amber military bunker hazard chevron band along bottom-right plate
  aCol.save();
  aCol.beginPath();
  aCol.rect(272, 386, 218, 30);
  aCol.clip();
  aCol.fillStyle = '#14161c';
  aCol.fillRect(272, 386, 218, 30);
  aCol.fillStyle = '#d9481e';
  for (let sx = 250; sx < 520; sx += 28) {
    aCol.beginPath();
    aCol.moveTo(sx, 416);
    aCol.lineTo(sx + 14, 416);
    aCol.lineTo(sx + 28, 386);
    aCol.lineTo(sx + 14, 386);
    aCol.closePath();
    aCol.fill();
  }
  aCol.restore();

  // Subtle crimson tactical stripe & SW-06 military stencil mark
  aCol.fillStyle = 'rgba(220,38,38,0.72)';
  aCol.fillRect(32, 214, 196, 8);
  aCol.fillStyle = 'rgba(245,158,11,0.55)';
  aCol.fillRect(32, 226, 118, 4);

  // Battle-scarred scorch scuffs
  for (let i = 0; i < 24; i++) {
    const sx = 20 + rand() * 472;
    const sy = 20 + rand() * 472;
    const r = 4 + rand() * 14;
    aCol.fillStyle = 'rgba(180,196,218,0.12)';
    aCol.beginPath();
    aCol.ellipse(sx, sy, r, r * 0.25, rand() * Math.PI, 0, Math.PI * 2);
    aCol.fill();
    aRgh.fillStyle = 'rgba(40,40,40,0.45)';
    aRgh.beginPath();
    aRgh.ellipse(sx, sy, r, r * 0.25, rand() * Math.PI, 0, Math.PI * 2);
    aRgh.fill();
  }

  // 2. Aged Relic-Bronze Hydraulic & Shock-Absorber Metallurgy
  const [bColC, bCol] = makeCanvas(512);
  const [bBmpC, bBmp] = makeCanvas(512);

  const bronzeGrad = bCol.createLinearGradient(0, 0, 512, 0);
  bronzeGrad.addColorStop(0, '#8d6535');
  bronzeGrad.addColorStop(0.32, '#c89b54');
  bronzeGrad.addColorStop(0.55, '#a4783e');
  bronzeGrad.addColorStop(0.82, '#d5ac67');
  bronzeGrad.addColorStop(1, '#7a552a');
  bCol.fillStyle = bronzeGrad;
  bCol.fillRect(0, 0, 512, 512);

  bBmp.fillStyle = '#808080';
  bBmp.fillRect(0, 0, 512, 512);

  // Turned lathe horizontal grooves & knurled grip bands
  for (let y = 0; y < 512; y += 6) {
    bCol.fillStyle = y % 12 === 0 ? 'rgba(255,232,184,0.12)' : 'rgba(35,20,8,0.16)';
    bCol.fillRect(0, y, 512, 2);
    bBmp.fillStyle = y % 12 === 0 ? '#a8a8a8' : '#585858';
    bBmp.fillRect(0, y, 512, 2);
  }
  for (const bandY of [96, 256, 416]) {
    bCol.fillStyle = '#402c16';
    bCol.fillRect(0, bandY - 5, 512, 10);
    bBmp.fillStyle = '#242424';
    bBmp.fillRect(0, bandY - 5, 512, 10);
  }

  // 3. Carbon-Weave Ribbed Flex Underframe with Glowing Crimson Conduit Lines
  const [uColC, uCol] = makeCanvas(512);
  const [uBmpC, uBmp] = makeCanvas(512);

  uCol.fillStyle = '#121319';
  uCol.fillRect(0, 0, 512, 512);
  uBmp.fillStyle = '#707070';
  uBmp.fillRect(0, 0, 512, 512);

  // Ribbed mechanical muscle corrugations
  for (let y = 0; y < 512; y += 16) {
    uCol.fillStyle = '#1e212b';
    uCol.fillRect(0, y, 512, 9);
    uCol.fillStyle = '#090a0e';
    uCol.fillRect(0, y + 9, 512, 7);

    uBmp.fillStyle = '#c8c8c8';
    uBmp.fillRect(0, y + 1, 512, 7);
    uBmp.fillStyle = '#222222';
    uBmp.fillRect(0, y + 9, 512, 7);
  }
  // Diagonal weave crosshatch
  uCol.strokeStyle = 'rgba(255,255,255,0.04)';
  uCol.lineWidth = 2;
  for (let d = -512; d < 1024; d += 18) {
    uCol.beginPath();
    uCol.moveTo(d, 0);
    uCol.lineTo(d + 512, 512);
    uCol.stroke();
  }
  // Subtle heated plasma vein channels
  for (const vx of [118, 256, 394]) {
    uCol.fillStyle = 'rgba(239,68,68,0.42)';
    uCol.fillRect(vx - 3, 0, 6, 512);
    uCol.fillStyle = 'rgba(253,186,116,0.55)';
    uCol.fillRect(vx - 1, 0, 2, 512);
  }

  // 4. Gravity-Well Floor Distortion Sigil (alphaMap — bright white on black)
  const [gC, g] = makeCanvas(512);
  g.fillStyle = '#000000';
  g.fillRect(0, 0, 512, 512);
  g.translate(256, 256);

  // Concentric gravitational containment rings
  const ringSpecs: Array<[number, number, string]> = [
    [232, 7, '#ffffff'],
    [208, 3, '#c8c8c8'],
    [164, 6, '#f0f0f0'],
    [118, 3, '#b8b8b8'],
    [76, 5, '#ffffff'],
  ];
  for (const [r, w, col] of ringSpecs) {
    g.strokeStyle = col;
    g.lineWidth = w;
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.stroke();
  }

  // 12 radial gravity-pull vector chevrons pointing inward toward the beast
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    g.save();
    g.rotate(ang);
    g.strokeStyle = i % 2 === 0 ? '#ffffff' : '#b8b8b8';
    g.lineWidth = i % 2 === 0 ? 5 : 3;
    g.beginPath();
    g.moveTo(222, -14);
    g.lineTo(176, 0);
    g.lineTo(222, 14);
    g.stroke();

    // Inner hexagonal containment spokes
    if (i % 2 === 0) {
      g.beginPath();
      g.moveTo(82, 0);
      g.lineTo(158, 0);
      g.stroke();
    }
    g.restore();
  }

  // Outer notched tectonic ticks
  g.strokeStyle = '#e0e0e0';
  g.lineWidth = 3;
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    g.beginPath();
    g.moveTo(Math.cos(a) * 234, Math.sin(a) * 234);
    g.lineTo(Math.cos(a) * 246, Math.sin(a) * 246);
    g.stroke();
  }

  // 5. Scrolling Molten Singularity Maw Beam Plasma Texture
  const [fC, f] = makeCanvas(512);
  f.fillStyle = '#080102';
  f.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 18; i++) {
    const x = (i / 18) * 512;
    const grd = f.createLinearGradient(x, 0, x + 28, 0);
    grd.addColorStop(0, 'rgba(220,38,38,0)');
    grd.addColorStop(0.5, i % 2 === 0 ? 'rgba(251,146,60,0.92)' : 'rgba(239,68,68,0.85)');
    grd.addColorStop(1, 'rgba(220,38,38,0)');
    f.fillStyle = grd;
    f.fillRect(x, 0, 28, 512);
  }
  for (let y = 0; y < 512; y += 32) {
    f.fillStyle = 'rgba(254,240,138,0.42)';
    f.fillRect(0, y, 512, 6);
  }

  const armorMap = finalizeTex(aColC, true, 1, 1);
  const armorBump = finalizeTex(aBmpC, false, 1, 1);
  const armorRoughness = finalizeTex(aRghC, false, 1, 1);
  const bronzeMap = finalizeTex(bColC, true, 1, 1);
  const bronzeBump = finalizeTex(bBmpC, false, 1, 1);
  const underframeMap = finalizeTex(uColC, true, 2, 2);
  const underframeBump = finalizeTex(uBmpC, false, 2, 2);
  const gravFieldAlphaMap = finalizeTex(gC, false, 1, 1);
  const beamFluxMap = finalizeTex(fC, true, 1, 3);

  return {
    armorMap,
    armorBump,
    armorRoughness,
    bronzeMap,
    bronzeBump,
    underframeMap,
    underframeBump,
    gravFieldAlphaMap,
    beamFluxMap,
    dispose: () => {
      armorMap.dispose();
      armorBump.dispose();
      armorRoughness.dispose();
      bronzeMap.dispose();
      bronzeBump.dispose();
      underframeMap.dispose();
      underframeBump.dispose();
      gravFieldAlphaMap.dispose();
      beamFluxMap.dispose();
    },
  };
}
