import * as THREE from 'three';

export interface GrappleDuelistTextureSuite {
  oxideArmorAlbedo: THREE.CanvasTexture;
  oxideArmorBump: THREE.CanvasTexture;
  oxideArmorRoughness: THREE.CanvasTexture;
  obsidianSteelAlbedo: THREE.CanvasTexture;
  obsidianSteelBump: THREE.CanvasTexture;
  carbonUndersuitAlbedo: THREE.CanvasTexture;
  carbonUndersuitBump: THREE.CanvasTexture;
  amberOpticMap: THREE.CanvasTexture;
  plasmaBladeMap: THREE.CanvasTexture;
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
 * Dedicated AAA procedural PBR texture suite for the Floor 07 Grapple-Lance Duelist:
 * - Matte weathered crimson-oxide composite gladiator armor with diagonal carbon-laminate weave,
 *   chipped titanium edge wear, kill-tally stripes, panel rivets, and scorch patina.
 * - Brushed dark obsidian-tungsten alloy for helm shell, lance hardware & exo-struts.
 * - Tight diamond ballistic carbon-kevlar compression undersuit with matte weave.
 * - Molten-amber predatory HUD optic visor lattice.
 * - Superheated thermite-plasma energy vein texture for the 2.35m Shock-Lance blade.
 */
export function createGrappleDuelistTextures(): GrappleDuelistTextureSuite {
  let seed = 72091;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // 1. Weathered Crimson-Oxide Gladiator Composite Armor (512x512 Albedo + Bump + Roughness)
  const [oAlb, aCtx] = makeCanvas(512);
  const [oBmp, bCtx] = makeCanvas(512);
  const [oRgh, rCtx] = makeCanvas(512);

  if (aCtx && bCtx && rCtx) {
    const grad = aCtx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#8d362d');
    grad.addColorStop(0.5, '#762b25');
    grad.addColorStop(1, '#5c211d');
    aCtx.fillStyle = grad;
    aCtx.fillRect(0, 0, 512, 512);

    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, 512, 512);

    // Matte ceramic-oxide finish (~0.62 roughness baseline)
    rCtx.fillStyle = '#9e9e9e';
    rCtx.fillRect(0, 0, 512, 512);

    // Fine diagonal woven composite laminate micro-grain
    aCtx.strokeStyle = 'rgba(28, 12, 12, 0.14)';
    aCtx.lineWidth = 1.2;
    bCtx.strokeStyle = '#717171';
    bCtx.lineWidth = 1;
    for (let i = -512; i < 1024; i += 10) {
      aCtx.beginPath();
      aCtx.moveTo(i, 0);
      aCtx.lineTo(i + 512, 512);
      aCtx.stroke();
      bCtx.beginPath();
      bCtx.moveTo(i, 0);
      bCtx.lineTo(i + 512, 512);
      bCtx.stroke();
    }

    // Organic battle-scorch, oil grime & heat-wear mottling
    for (let i = 0; i < 380; i++) {
      const x = rand() * 512;
      const y = rand() * 512;
      const r = 6 + rand() * 28;
      const dark = rand() > 0.38;
      aCtx.fillStyle = dark ? 'rgba(22, 12, 12, 0.14)' : 'rgba(218, 138, 108, 0.07)';
      aCtx.beginPath();
      aCtx.arc(x, y, r, 0, Math.PI * 2);
      aCtx.fill();

      rCtx.fillStyle = dark ? 'rgba(216, 216, 216, 0.15)' : 'rgba(116, 116, 116, 0.13)';
      rCtx.beginPath();
      rCtx.arc(x, y, r, 0, Math.PI * 2);
      rCtx.fill();
    }

    // Precision armored plate seams + exposed bare brushed-steel edge chipping
    const drawSeam = (x1: number, y1: number, x2: number, y2: number) => {
      aCtx.strokeStyle = 'rgba(18, 10, 10, 0.78)';
      aCtx.lineWidth = 3.2;
      aCtx.beginPath();
      aCtx.moveTo(x1, y1);
      aCtx.lineTo(x2, y2);
      aCtx.stroke();

      aCtx.strokeStyle = 'rgba(210, 198, 186, 0.38)';
      aCtx.lineWidth = 1.3;
      aCtx.beginPath();
      aCtx.moveTo(x1 + 2, y1 + 2);
      aCtx.lineTo(x2 + 2, y2 + 2);
      aCtx.stroke();

      bCtx.strokeStyle = '#343434';
      bCtx.lineWidth = 3.6;
      bCtx.beginPath();
      bCtx.moveTo(x1, y1);
      bCtx.lineTo(x2, y2);
      bCtx.stroke();

      rCtx.strokeStyle = '#525252';
      rCtx.lineWidth = 2.2;
      rCtx.beginPath();
      rCtx.moveTo(x1 + 2, y1 + 2);
      rCtx.lineTo(x2 + 2, y2 + 2);
      rCtx.stroke();
    };

    drawSeam(14, 14, 498, 14);
    drawSeam(14, 498, 498, 498);
    drawSeam(14, 14, 14, 498);
    drawSeam(498, 14, 498, 498);
    drawSeam(14, 210, 498, 260);
    drawSeam(256, 14, 232, 235);
    drawSeam(112, 224, 168, 498);
    drawSeam(396, 248, 344, 498);

    // Recessed titanium hex rivets
    const rivets = [
      [34, 34],
      [478, 34],
      [34, 192],
      [478, 240],
      [34, 234],
      [478, 282],
      [34, 476],
      [478, 476],
      [230, 34],
      [278, 34],
    ];
    for (const [rx, ry] of rivets) {
      aCtx.fillStyle = '#201514';
      aCtx.beginPath();
      aCtx.arc(rx, ry, 5.5, 0, Math.PI * 2);
      aCtx.fill();
      aCtx.fillStyle = '#c4b8aa';
      aCtx.beginPath();
      aCtx.arc(rx - 1, ry - 1, 2.5, 0, Math.PI * 2);
      aCtx.fill();

      bCtx.fillStyle = '#2d2d2d';
      bCtx.beginPath();
      bCtx.arc(rx, ry, 5.5, 0, Math.PI * 2);
      bCtx.fill();
      bCtx.fillStyle = '#bababa';
      bCtx.beginPath();
      bCtx.arc(rx, ry, 2.6, 0, Math.PI * 2);
      bCtx.fill();
    }

    // Blade duel battle-scratches & bright metallic gouges
    for (let i = 0; i < 82; i++) {
      const sx = rand() * 476 + 18;
      const sy = rand() * 476 + 18;
      const ang = -0.7 + rand() * 1.4;
      const len = 10 + rand() * 44;
      aCtx.strokeStyle =
        rand() > 0.3 ? 'rgba(218, 206, 192, 0.38)' : 'rgba(24, 10, 10, 0.44)';
      aCtx.lineWidth = 0.8 + rand() * 1.4;
      aCtx.beginPath();
      aCtx.moveTo(sx, sy);
      aCtx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
      aCtx.stroke();

      rCtx.strokeStyle = 'rgba(66, 66, 66, 0.52)';
      rCtx.lineWidth = 1.3;
      rCtx.beginPath();
      rCtx.moveTo(sx, sy);
      rCtx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
      rCtx.stroke();
    }

    // Gladiator vanguard stripes & stencil marking
    aCtx.fillStyle = 'rgba(242, 184, 72, 0.78)';
    aCtx.fillRect(36, 166, 68, 8);
    aCtx.fillRect(36, 178, 42, 5);
    aCtx.fillStyle = 'rgba(235, 224, 210, 0.62)';
    aCtx.font = 'bold 17px monospace';
    aCtx.fillText('F07 // VALK-2', 36, 156);
  }

  // 2. Anodized Brushed Obsidian-Tungsten Alloy (256x256 Albedo + Bump)
  const [sAlb, saCtx] = makeCanvas(256);
  const [sBmp, sbCtx] = makeCanvas(256);
  if (saCtx && sbCtx) {
    const sGrad = saCtx.createLinearGradient(0, 0, 256, 256);
    sGrad.addColorStop(0, '#4c535e');
    sGrad.addColorStop(0.5, '#3b424c');
    sGrad.addColorStop(1, '#2f353e');
    saCtx.fillStyle = sGrad;
    saCtx.fillRect(0, 0, 256, 256);

    sbCtx.fillStyle = '#808080';
    sbCtx.fillRect(0, 0, 256, 256);

    // Horizontal CNC brushed alloy grain
    for (let i = 0; i < 400; i++) {
      const y = rand() * 256;
      const x = rand() * 256;
      const w = 18 + rand() * 96;
      const bright = rand() > 0.5;
      saCtx.fillStyle = bright ? 'rgba(205, 218, 232, 0.09)' : 'rgba(14, 18, 24, 0.14)';
      saCtx.fillRect(x, y, w, 1.4);
      sbCtx.fillStyle = bright ? 'rgba(176,176,176,0.22)' : 'rgba(84,84,84,0.22)';
      sbCtx.fillRect(x, y, w, 1.4);
    }

    // Subtle machined panel groove & chamfer highlight
    saCtx.strokeStyle = 'rgba(14, 18, 24, 0.62)';
    saCtx.lineWidth = 4;
    saCtx.strokeRect(5, 5, 246, 246);
    saCtx.strokeStyle = 'rgba(195, 208, 222, 0.25)';
    saCtx.lineWidth = 1.4;
    saCtx.strokeRect(9, 9, 238, 238);

    sbCtx.strokeStyle = '#3a3a3a';
    sbCtx.lineWidth = 4;
    sbCtx.strokeRect(5, 5, 246, 246);
  }

  // 3. Ballistic Diamond Carbon-Kevlar Compression Undersuit (256x256 Albedo + Bump)
  const [uAlb, uaCtx] = makeCanvas(256);
  const [uBmp, ubCtx] = makeCanvas(256);
  if (uaCtx && ubCtx) {
    uaCtx.fillStyle = '#252930';
    uaCtx.fillRect(0, 0, 256, 256);
    ubCtx.fillStyle = '#767676';
    ubCtx.fillRect(0, 0, 256, 256);

    // High-speed kinetic diamond weave
    const cell = 12;
    for (let y = 0; y < 256; y += cell) {
      for (let x = 0; x < 256; x += cell) {
        uaCtx.strokeStyle = 'rgba(88, 98, 114, 0.24)';
        uaCtx.lineWidth = 1;
        uaCtx.beginPath();
        uaCtx.moveTo(x + cell * 0.5, y);
        uaCtx.lineTo(x + cell, y + cell * 0.5);
        uaCtx.lineTo(x + cell * 0.5, y + cell);
        uaCtx.lineTo(x, y + cell * 0.5);
        uaCtx.closePath();
        uaCtx.stroke();

        ubCtx.fillStyle = (x + y) % (cell * 2) === 0 ? '#9e9e9e' : '#585858';
        ubCtx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
      }
    }
    // Horizontal synthetic muscle-cord seams
    for (let y = 0; y < 256; y += 32) {
      uaCtx.fillStyle = 'rgba(12, 14, 18, 0.52)';
      uaCtx.fillRect(0, y, 256, 3);
      ubCtx.fillStyle = '#383838';
      ubCtx.fillRect(0, y, 256, 3);
    }
  }

  // 4. Molten-Amber Predatory HUD Visor Matrix (128x64)
  const [vCanvas, vCtx] = makeCanvas(128, 64);
  if (vCtx) {
    const vGrad = vCtx.createLinearGradient(0, 0, 0, 64);
    vGrad.addColorStop(0, '#ffe066');
    vGrad.addColorStop(0.5, '#ff9818');
    vGrad.addColorStop(1, '#d64508');
    vCtx.fillStyle = vGrad;
    vCtx.fillRect(0, 0, 128, 64);

    vCtx.strokeStyle = 'rgba(48, 14, 4, 0.4)';
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
    vCtx.fillStyle = 'rgba(255, 250, 210, 0.84)';
    vCtx.fillRect(8, 25, 112, 8);
  }

  // 5. Superheated Thermite-Plasma Blade Vein Flow Map (128x256)
  const [pCanvas, pCtx] = makeCanvas(128, 256);
  if (pCtx) {
    const pGrad = pCtx.createLinearGradient(0, 0, 128, 0);
    pGrad.addColorStop(0, '#ff3812');
    pGrad.addColorStop(0.28, '#ff7e1a');
    pGrad.addColorStop(0.5, '#fff4cc');
    pGrad.addColorStop(0.72, '#ff7e1a');
    pGrad.addColorStop(1, '#ff3812');
    pCtx.fillStyle = pGrad;
    pCtx.fillRect(0, 0, 128, 256);

    // Crackling longitudinal energy filaments
    pCtx.strokeStyle = 'rgba(255, 255, 240, 0.65)';
    pCtx.lineWidth = 2;
    for (let f = 0; f < 6; f++) {
      let cx = 24 + f * 16;
      pCtx.beginPath();
      pCtx.moveTo(cx, 0);
      for (let y = 16; y <= 256; y += 16) {
        cx += (rand() - 0.5) * 14;
        pCtx.lineTo(cx, y);
      }
      pCtx.stroke();
    }
  }

  const oxideArmorAlbedo = toTex(oAlb, 1, 1, true);
  const oxideArmorBump = toTex(oBmp, 1, 1, false);
  const oxideArmorRoughness = toTex(oRgh, 1, 1, false);
  const obsidianSteelAlbedo = toTex(sAlb, 1, 1, true);
  const obsidianSteelBump = toTex(sBmp, 1, 1, false);
  const carbonUndersuitAlbedo = toTex(uAlb, 2, 2, true);
  const carbonUndersuitBump = toTex(uBmp, 2, 2, false);
  const amberOpticMap = toTex(vCanvas, 1, 1, true);
  const plasmaBladeMap = toTex(pCanvas, 1, 1, true);

  return {
    oxideArmorAlbedo,
    oxideArmorBump,
    oxideArmorRoughness,
    obsidianSteelAlbedo,
    obsidianSteelBump,
    carbonUndersuitAlbedo,
    carbonUndersuitBump,
    amberOpticMap,
    plasmaBladeMap,
    dispose: () => {
      oxideArmorAlbedo.dispose();
      oxideArmorBump.dispose();
      oxideArmorRoughness.dispose();
      obsidianSteelAlbedo.dispose();
      obsidianSteelBump.dispose();
      carbonUndersuitAlbedo.dispose();
      carbonUndersuitBump.dispose();
      amberOpticMap.dispose();
      plasmaBladeMap.dispose();
    },
  };
}
