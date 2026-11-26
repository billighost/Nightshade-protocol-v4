import * as THREE from 'three';

export interface TurbineJuggernautTextureSuite {
  armorAlbedo: THREE.CanvasTexture;
  armorBump: THREE.CanvasTexture;
  armorRoughness: THREE.CanvasTexture;
  copperCoilAlbedo: THREE.CanvasTexture;
  copperCoilBump: THREE.CanvasTexture;
  hydraulicAlbedo: THREE.CanvasTexture;
  hydraulicBump: THREE.CanvasTexture;
  radiatorCoreMap: THREE.CanvasTexture;
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
 * Dedicated AAA procedural PBR texture suite for Floor 07 Zone Mini-Boss #1:
 * TURBINE JUGGERNAUT "VOLT-VII"
 * - Cast tungsten-slate & weathered industrial hazard-ochre turbine siege plating with weld seams,
 *   hex flange bolts, diagonal high-voltage caution chevrons, soot scorching, and bare-steel edge chips.
 * - Tightly wound enameled copper Tesla induction coils with dark ceramic insulator grooves & heat patina.
 * - Heavy ribbed hydraulic exo-frame dark steel & accordion joint weave.
 * - Blazing honeycomb/slotted molten-amber Dorsal Cooling Radiator furnace core lattice.
 */
export function createTurbineJuggernautTextures(): TurbineJuggernautTextureSuite {
  let seed = 88721;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // 1. Weathered Cast Tungsten-Slate & Industrial Hazard-Ochre Turbine Armor (512x512)
  const [aAlb, aCtx] = makeCanvas(512);
  const [aBmp, bCtx] = makeCanvas(512);
  const [aRgh, rCtx] = makeCanvas(512);

  if (aCtx && bCtx && rCtx) {
    // Upper industrial ochre-gold turbine enamel transitioning into dark tungsten forged steel
    const grad = aCtx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#c28c32');
    grad.addColorStop(0.42, '#a37124');
    grad.addColorStop(0.46, '#262b32');
    grad.addColorStop(0.56, '#48515c');
    grad.addColorStop(1, '#363e48');
    aCtx.fillStyle = grad;
    aCtx.fillRect(0, 0, 512, 512);

    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, 512, 512);

    // Matte industrial painted cast-metal roughness (~0.62 baseline, shiny on bare-steel scratches)
    rCtx.fillStyle = '#9e9e9e';
    rCtx.fillRect(0, 0, 512, 512);

    // Cast-iron micro-pitting & battle-worn grime speckles
    for (let i = 0; i < 1600; i++) {
      const x = rand() * 512;
      const y = rand() * 512;
      const sz = 1 + rand() * 3.5;
      const dark = rand() > 0.44;
      aCtx.fillStyle = dark ? 'rgba(16, 18, 22, 0.14)' : 'rgba(232, 220, 195, 0.08)';
      aCtx.fillRect(x, y, sz, sz);
      bCtx.fillStyle = dark ? 'rgba(60, 60, 60, 0.22)' : 'rgba(175, 175, 175, 0.16)';
      bCtx.fillRect(x, y, sz, sz);
    }

    // High-voltage diagonal hazard chevron band across the waist seam (orientation-safe!)
    aCtx.save();
    aCtx.beginPath();
    aCtx.rect(0, 232, 512, 42);
    aCtx.clip();
    aCtx.fillStyle = '#1b1f25';
    aCtx.fillRect(0, 232, 512, 42);
    aCtx.fillStyle = '#e89d1c';
    for (let x = -64; x < 580; x += 48) {
      aCtx.beginPath();
      aCtx.moveTo(x, 232);
      aCtx.lineTo(x + 24, 232);
      aCtx.lineTo(x + 4, 274);
      aCtx.lineTo(x - 20, 274);
      aCtx.closePath();
      aCtx.fill();
    }
    aCtx.restore();

    // Heavy forged plate weld seams & chamfered panel grooves
    const drawWeldSeam = (x1: number, y1: number, x2: number, y2: number) => {
      aCtx.strokeStyle = 'rgba(14, 16, 20, 0.85)';
      aCtx.lineWidth = 4.5;
      aCtx.beginPath();
      aCtx.moveTo(x1, y1);
      aCtx.lineTo(x2, y2);
      aCtx.stroke();

      // Bare chipped steel highlight along seam lip
      aCtx.strokeStyle = 'rgba(218, 224, 232, 0.42)';
      aCtx.lineWidth = 1.6;
      aCtx.beginPath();
      aCtx.moveTo(x1 + 2.5, y1 + 2.5);
      aCtx.lineTo(x2 + 2.5, y2 + 2.5);
      aCtx.stroke();

      bCtx.strokeStyle = '#242424';
      bCtx.lineWidth = 5;
      bCtx.beginPath();
      bCtx.moveTo(x1, y1);
      bCtx.lineTo(x2, y2);
      bCtx.stroke();

      rCtx.strokeStyle = '#3c3c3c';
      rCtx.lineWidth = 3;
      rCtx.beginPath();
      rCtx.moveTo(x1, y1);
      rCtx.lineTo(x2, y2);
      rCtx.stroke();
    };

    drawWeldSeam(14, 14, 498, 14);
    drawWeldSeam(14, 498, 498, 498);
    drawWeldSeam(14, 14, 14, 498);
    drawWeldSeam(498, 14, 498, 498);
    drawWeldSeam(14, 126, 498, 126);
    drawWeldSeam(14, 232, 498, 232);
    drawWeldSeam(14, 274, 498, 274);
    drawWeldSeam(14, 388, 498, 388);
    drawWeldSeam(256, 14, 256, 498);

    // Heavy recessed industrial hex flange bolts
    const bolts = [
      [34, 34], [236, 34], [276, 34], [478, 34],
      [34, 108], [236, 108], [276, 108], [478, 108],
      [34, 212], [236, 212], [276, 212], [478, 212],
      [34, 294], [236, 294], [276, 294], [478, 294],
      [34, 370], [236, 370], [276, 370], [478, 370],
      [34, 478], [236, 478], [276, 478], [478, 478],
    ];
    for (const [bx, by] of bolts) {
      aCtx.fillStyle = '#1d2229';
      aCtx.beginPath();
      aCtx.arc(bx, by, 7, 0, Math.PI * 2);
      aCtx.fill();
      aCtx.fillStyle = '#8b96a4';
      aCtx.beginPath();
      aCtx.arc(bx - 1, by - 1, 4.2, 0, Math.PI * 2);
      aCtx.fill();

      bCtx.fillStyle = '#d4d4d4';
      bCtx.beginPath();
      bCtx.arc(bx, by, 6, 0, Math.PI * 2);
      bCtx.fill();

      rCtx.fillStyle = '#4a4a4a';
      rCtx.beginPath();
      rCtx.arc(bx, by, 6, 0, Math.PI * 2);
      rCtx.fill();
    }

    // Recessed turbine cooling louver vents on lower steel hull
    for (let s = 0; s < 5; s++) {
      const sy = 406 + s * 14;
      aCtx.fillStyle = '#15191f';
      aCtx.fillRect(62, sy, 134, 7);
      aCtx.fillRect(316, sy, 134, 7);
      bCtx.fillStyle = '#1c1c1c';
      bCtx.fillRect(62, sy, 134, 7);
      bCtx.fillRect(316, sy, 134, 7);
    }

    // Battle-worn bare-steel edge scratches & plasma scorch smudges
    for (let i = 0; i < 65; i++) {
      const sx = rand() * 480 + 16;
      const sy = rand() * 480 + 16;
      const len = 8 + rand() * 32;
      const ang = (rand() - 0.5) * 1.4;
      aCtx.strokeStyle = 'rgba(205, 214, 224, 0.32)';
      aCtx.lineWidth = 1.4;
      aCtx.beginPath();
      aCtx.moveTo(sx, sy);
      aCtx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
      aCtx.stroke();

      rCtx.strokeStyle = '#363636';
      rCtx.lineWidth = 2.0;
      rCtx.beginPath();
      rCtx.moveTo(sx, sy);
      rCtx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
      rCtx.stroke();
    }
  }

  // 2. Tightly Wound Enameled Copper Tesla Induction Coils (256x256)
  const [cAlb, caCtx] = makeCanvas(256);
  const [cBmp, cbCtx] = makeCanvas(256);
  if (caCtx && cbCtx) {
    caCtx.fillStyle = '#2d1c14';
    caCtx.fillRect(0, 0, 256, 256);
    cbCtx.fillStyle = '#242424';
    cbCtx.fillRect(0, 0, 256, 256);

    const bandH = 16;
    for (let y = 0; y < 256; y += bandH) {
      const cGrad = caCtx.createLinearGradient(0, y, 0, y + bandH);
      cGrad.addColorStop(0, '#462210');
      cGrad.addColorStop(0.28, '#c86a32');
      cGrad.addColorStop(0.52, '#eb9252');
      cGrad.addColorStop(0.82, '#8e421c');
      cGrad.addColorStop(1, '#26140c');
      caCtx.fillStyle = cGrad;
      caCtx.fillRect(0, y, 256, bandH);

      const bGrad = cbCtx.createLinearGradient(0, y, 0, y + bandH);
      bGrad.addColorStop(0, '#222222');
      bGrad.addColorStop(0.5, '#e8e8e8');
      bGrad.addColorStop(1, '#222222');
      cbCtx.fillStyle = bGrad;
      cbCtx.fillRect(0, y, 256, bandH);
    }

    // Vertical dark ceramic clamping straps holding the copper windings
    for (const sx of [48, 176]) {
      caCtx.fillStyle = '#242a32';
      caCtx.fillRect(sx, 0, 18, 256);
      caCtx.fillStyle = '#5e6875';
      caCtx.fillRect(sx + 3, 0, 3, 256);
      cbCtx.fillStyle = '#c8c8c8';
      cbCtx.fillRect(sx, 0, 18, 256);
    }
  }

  // 3. Heavy Ribbed Hydraulic Exo-Frame Dark Forged Steel (256x256)
  const [hAlb, haCtx] = makeCanvas(256);
  const [hBmp, hbCtx] = makeCanvas(256);
  if (haCtx && hbCtx) {
    haCtx.fillStyle = '#2c333d';
    haCtx.fillRect(0, 0, 256, 256);
    hbCtx.fillStyle = '#606060';
    hbCtx.fillRect(0, 0, 256, 256);

    for (let y = 0; y < 256; y += 16) {
      haCtx.fillStyle = '#3e4754';
      haCtx.fillRect(0, y + 2, 256, 8);
      haCtx.fillStyle = '#1b2028';
      haCtx.fillRect(0, y + 11, 256, 4);

      hbCtx.fillStyle = '#b4b4b4';
      hbCtx.fillRect(0, y + 2, 256, 8);
      hbCtx.fillStyle = '#262626';
      hbCtx.fillRect(0, y + 11, 256, 4);
    }
    // Cross machining grooves
    for (let i = 0; i < 160; i++) {
      const x = rand() * 256;
      const y = rand() * 256;
      haCtx.fillStyle = rand() > 0.5 ? 'rgba(220,230,242,0.08)' : 'rgba(10,12,16,0.14)';
      haCtx.fillRect(x, y, 28, 1.5);
    }
  }

  // 4. Blazing Molten-Orange & White-Hot Dorsal Cooling Radiator Furnace Lattice (256x256)
  const [rCanvas, radCtx] = makeCanvas(256);
  if (radCtx) {
    const rGrad = radCtx.createRadialGradient(128, 128, 12, 128, 128, 145);
    rGrad.addColorStop(0, '#fffce6');
    rGrad.addColorStop(0.32, '#ffb638');
    rGrad.addColorStop(0.68, '#ff4d12');
    rGrad.addColorStop(1, '#7a1204');
    radCtx.fillStyle = rGrad;
    radCtx.fillRect(0, 0, 256, 256);

    // Crisp horizontal titanium heat-sink fin bars over the blazing thermal furnace core
    radCtx.fillStyle = 'rgba(28, 12, 8, 0.72)';
    for (let y = 12; y < 256; y += 22) {
      radCtx.fillRect(0, y, 256, 6);
    }
    // Vertical structural brace bars
    radCtx.fillStyle = 'rgba(34, 16, 10, 0.65)';
    radCtx.fillRect(78, 0, 10, 256);
    radCtx.fillRect(168, 0, 10, 256);
  }

  const armorAlbedo = toTex(aAlb, 1, 1, true);
  const armorBump = toTex(aBmp, 1, 1, false);
  const armorRoughness = toTex(aRgh, 1, 1, false);
  const copperCoilAlbedo = toTex(cAlb, 1, 1, true);
  const copperCoilBump = toTex(cBmp, 1, 1, false);
  const hydraulicAlbedo = toTex(hAlb, 2, 2, true);
  const hydraulicBump = toTex(hBmp, 2, 2, false);
  const radiatorCoreMap = toTex(rCanvas, 1, 1, true);

  return {
    armorAlbedo,
    armorBump,
    armorRoughness,
    copperCoilAlbedo,
    copperCoilBump,
    hydraulicAlbedo,
    hydraulicBump,
    radiatorCoreMap,
    dispose: () => {
      armorAlbedo.dispose();
      armorBump.dispose();
      armorRoughness.dispose();
      copperCoilAlbedo.dispose();
      copperCoilBump.dispose();
      hydraulicAlbedo.dispose();
      hydraulicBump.dispose();
      radiatorCoreMap.dispose();
    },
  };
}
