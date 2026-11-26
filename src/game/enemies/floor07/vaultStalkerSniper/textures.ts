import * as THREE from 'three';

export interface VaultStalkerTextureSuite {
  armorAlbedo: THREE.CanvasTexture;
  armorBump: THREE.CanvasTexture;
  armorRoughness: THREE.CanvasTexture;
  cloakAlbedo: THREE.CanvasTexture;
  cloakBump: THREE.CanvasTexture;
  cloakRoughness: THREE.CanvasTexture;
  rifleAlbedo: THREE.CanvasTexture;
  rifleBump: THREE.CanvasTexture;
  opticCoreMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates bespoke procedural PBR texture maps for VAULT STALKER "PHANTOM-VII":
 * - Hex-carbon & arctic-slate ceramic stealth armor plates with recessed fasteners & subtle cyan/crimson piping
 * - Woven ballistic active-camo optical hex-mesh cloak & hood fabric with weathered hem fraying
 * - Fluted gunmetal/carbon electromagnetic rail-sniper chassis & cooling vents
 * - High-contrast multi-lens recon visor optic aperture array
 * (Zero mirror-prone text markings anywhere so symmetrical limbs & plates read cleanly!)
 */
export function createVaultStalkerTextures(): VaultStalkerTextureSuite {
  // === 1. STEALTH CARBON-CERAMIC ARMOR (Albedo + Bump + Roughness) ===
  const [aColC, aCol] = makeCanvas(512, 512);
  const [aBmpC, aBmp] = makeCanvas(512, 512);
  const [aRghC, aRgh] = makeCanvas(512, 512);

  // Base arctic-graphite & midnight-slate gradient
  const armorGrad = aCol.createLinearGradient(0, 0, 512, 512);
  armorGrad.addColorStop(0, '#2c3948');
  armorGrad.addColorStop(0.45, '#222d3a');
  armorGrad.addColorStop(1, '#1a232e');
  aCol.fillStyle = armorGrad;
  aCol.fillRect(0, 0, 512, 512);

  aBmp.fillStyle = '#808080';
  aBmp.fillRect(0, 0, 512, 512);

  aRgh.fillStyle = '#888888'; // ~0.53 satin ceramic base
  aRgh.fillRect(0, 0, 512, 512);

  // Subtle stealth hex-carbon micro-weave across entire plate
  const hexR = 14;
  const hexH = Math.sqrt(3) * hexR;
  aCol.strokeStyle = 'rgba(14, 20, 28, 0.42)';
  aCol.lineWidth = 1.2;
  aBmp.strokeStyle = '#686868';
  aBmp.lineWidth = 1.2;
  for (let row = -1; row < 512 / (hexH * 0.5) + 2; row++) {
    for (let col = -1; col < 512 / (hexR * 1.5) + 2; col++) {
      const cx = col * hexR * 1.5;
      const cy = row * hexH + (col % 2 === 0 ? 0 : hexH * 0.5);
      aCol.beginPath();
      aBmp.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI / 3) * i;
        const px = cx + Math.cos(ang) * (hexR - 1);
        const py = cy + Math.sin(ang) * (hexR - 1);
        if (i === 0) {
          aCol.moveTo(px, py);
          aBmp.moveTo(px, py);
        } else {
          aCol.lineTo(px, py);
          aBmp.lineTo(px, py);
        }
      }
      aCol.closePath();
      aBmp.closePath();
      aCol.stroke();
      aBmp.stroke();
    }
  }

  // Faceted tactical slate sub-panels with brushed titanium highlight bevels
  const panels = [
    { x: 18, y: 18, w: 226, h: 218, fill: '#334457' },
    { x: 268, y: 18, w: 226, h: 218, fill: '#2a3949' },
    { x: 18, y: 264, w: 476, h: 226, fill: '#253240' },
  ];
  for (const p of panels) {
    aCol.fillStyle = p.fill;
    aCol.fillRect(p.x, p.y, p.w, p.h);

    // Subtle carbon diagonal weave inside panel
    aCol.strokeStyle = 'rgba(180, 215, 240, 0.06)';
    aCol.lineWidth = 1;
    for (let d = -p.h; d < p.w + p.h; d += 12) {
      aCol.beginPath();
      aCol.moveTo(p.x + Math.max(0, d), p.y + Math.max(0, -d));
      aCol.lineTo(p.x + Math.min(p.w, d + p.h), p.y + Math.min(p.h, p.w - d));
      aCol.stroke();
    }

    // Recessed dark seam border
    aCol.strokeStyle = '#0f161f';
    aCol.lineWidth = 5;
    aCol.strokeRect(p.x, p.y, p.w, p.h);

    // Edge-wear machined titanium chamfer highlight
    aCol.strokeStyle = 'rgba(175, 208, 232, 0.34)';
    aCol.lineWidth = 2;
    aCol.strokeRect(p.x + 4, p.y + 4, p.w - 8, p.h - 8);

    aBmp.strokeStyle = '#303030';
    aBmp.lineWidth = 5;
    aBmp.strokeRect(p.x, p.y, p.w, p.h);
    aBmp.strokeStyle = '#b0b0b0';
    aBmp.lineWidth = 2;
    aBmp.strokeRect(p.x + 4, p.y + 4, p.w - 8, p.h - 8);

    // Lower roughness on worn edges so specular light catches edges realistically
    aRgh.strokeStyle = '#484848';
    aRgh.lineWidth = 4;
    aRgh.strokeRect(p.x + 3, p.y + 3, p.w - 6, p.h - 6);

    // Hex-socket recessed titanium bolts at panel corners
    const corners = [
      [p.x + 18, p.y + 18],
      [p.x + p.w - 18, p.y + 18],
      [p.x + 18, p.y + p.h - 18],
      [p.x + p.w - 18, p.y + p.h - 18],
    ];
    for (const [bx, by] of corners) {
      aCol.fillStyle = '#121a24';
      aCol.beginPath();
      aCol.arc(bx, by, 6.5, 0, Math.PI * 2);
      aCol.fill();
      aCol.fillStyle = '#7b93ab';
      aCol.beginPath();
      aCol.arc(bx - 1, by - 1, 3.6, 0, Math.PI * 2);
      aCol.fill();

      aBmp.fillStyle = '#363636';
      aBmp.beginPath();
      aBmp.arc(bx, by, 6.5, 0, Math.PI * 2);
      aBmp.fill();
      aBmp.fillStyle = '#c8c8c8';
      aBmp.beginPath();
      aBmp.arc(bx, by, 3.4, 0, Math.PI * 2);
      aBmp.fill();
    }
  }

  // Crisp tactical arctic-teal optical-circuit trim band & subtle crimson stealth chevron stripe
  aCol.fillStyle = '#24b4cc';
  aCol.fillRect(24, 240, 464, 8);
  aCol.fillStyle = '#0e161f';
  aCol.fillRect(24, 248, 464, 4);
  aCol.fillStyle = '#a83344';
  aCol.fillRect(280, 240, 68, 8);

  // Fine combat scratches & micro-scuffs (deterministic)
  let seed = 70713;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  for (let i = 0; i < 65; i++) {
    const sx = rand() * 512;
    const sy = rand() * 512;
    const len = 10 + rand() * 34;
    const ang = rand() * Math.PI * 2;
    aCol.strokeStyle = `rgba(186, 214, 236, ${0.08 + rand() * 0.16})`;
    aCol.lineWidth = 0.9 + rand() * 1.1;
    aCol.beginPath();
    aCol.moveTo(sx, sy);
    aCol.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    aCol.stroke();

    aRgh.strokeStyle = '#3e3e3e';
    aRgh.lineWidth = 1.4;
    aRgh.beginPath();
    aRgh.moveTo(sx, sy);
    aRgh.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    aRgh.stroke();
  }

  // === 2. ACTIVE-CAMO OPTICAL-MESH CLOAK & HOOD FABRIC ===
  const [cColC, cCol] = makeCanvas(512, 512);
  const [cBmpC, cBmp] = makeCanvas(512, 512);
  const [cRghC, cRgh] = makeCanvas(512, 512);

  const cloakGrad = cCol.createLinearGradient(0, 0, 0, 512);
  cloakGrad.addColorStop(0, '#1d2938');
  cloakGrad.addColorStop(0.65, '#17212e');
  cloakGrad.addColorStop(1, '#111822');
  cCol.fillStyle = cloakGrad;
  cCol.fillRect(0, 0, 512, 512);

  cBmp.fillStyle = '#7a7a7a';
  cBmp.fillRect(0, 0, 512, 512);

  cRgh.fillStyle = '#d4d4d4'; // ~0.83 matte ballistic weave fabric
  cRgh.fillRect(0, 0, 512, 512);

  // Ripstop tactical ballistic-nylon cross-stitch grid
  cCol.strokeStyle = 'rgba(255, 255, 255, 0.045)';
  cCol.lineWidth = 1;
  cBmp.strokeStyle = '#929292';
  cBmp.lineWidth = 1;
  for (let i = 0; i < 512; i += 8) {
    cCol.beginPath();
    cCol.moveTo(i, 0);
    cCol.lineTo(i, 512);
    cCol.moveTo(0, i);
    cCol.lineTo(512, i);
    cCol.stroke();

    cBmp.beginPath();
    cBmp.moveTo(i, 0);
    cBmp.lineTo(i, 512);
    cBmp.moveTo(0, i);
    cBmp.lineTo(512, i);
    cBmp.stroke();
  }

  // Holographic active-camo optical-fiber hex lattice woven into the cloak
  const cHexR = 22;
  const cHexH = Math.sqrt(3) * cHexR;
  for (let row = -1; row < 512 / (cHexH * 0.5) + 2; row++) {
    for (let col = -1; col < 512 / (cHexR * 1.5) + 2; col++) {
      const cx = col * cHexR * 1.5;
      const cy = row * cHexH + (col % 2 === 0 ? 0 : cHexH * 0.5);
      const cellGlow = rand();
      cCol.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI / 3) * i;
        const px = cx + Math.cos(ang) * (cHexR - 1.5);
        const py = cy + Math.sin(ang) * (cHexR - 1.5);
        if (i === 0) cCol.moveTo(px, py);
        else cCol.lineTo(px, py);
      }
      cCol.closePath();
      if (cellGlow > 0.72) {
        cCol.fillStyle = 'rgba(42, 165, 195, 0.14)';
        cCol.fill();
      }
      cCol.strokeStyle =
        cellGlow > 0.55 ? 'rgba(56, 224, 248, 0.28)' : 'rgba(110, 145, 175, 0.14)';
      cCol.lineWidth = 1.4;
      cCol.stroke();
    }
  }

  // Reinforced stitched leather/polymer border trim along bottom hem
  cCol.fillStyle = '#253547';
  cCol.fillRect(0, 456, 512, 24);
  cCol.fillStyle = '#2dc4dc';
  cCol.fillRect(0, 452, 512, 4);
  cCol.strokeStyle = '#0c121a';
  cCol.setLineDash([8, 6]);
  cCol.lineWidth = 2;
  cCol.beginPath();
  cCol.moveTo(0, 468);
  cCol.lineTo(512, 468);
  cCol.stroke();
  cCol.setLineDash([]);

  // === 3. FLUTED ELECTROMAGNETIC RAIL-SNIPER CHASSIS ===
  const [rColC, rCol] = makeCanvas(256, 256);
  const [rBmpC, rBmp] = makeCanvas(256, 256);

  rCol.fillStyle = '#1b222c';
  rCol.fillRect(0, 0, 256, 256);
  rBmp.fillStyle = '#787878';
  rBmp.fillRect(0, 0, 256, 256);

  // Longitudinal machined cooling flutes & rail slots
  for (let y = 12; y < 256; y += 22) {
    rCol.fillStyle = '#0d1218';
    rCol.fillRect(0, y, 256, 7);
    rCol.fillStyle = '#425264';
    rCol.fillRect(0, y + 7, 256, 3);

    rBmp.fillStyle = '#2c2c2c';
    rBmp.fillRect(0, y, 256, 7);
    rBmp.fillStyle = '#b4b4b4';
    rBmp.fillRect(0, y + 7, 256, 3);
  }
  // Vertical magnetic accelerator coil ribs
  for (let x = 20; x < 256; x += 36) {
    rCol.fillStyle = 'rgba(42, 180, 210, 0.28)';
    rCol.fillRect(x, 0, 6, 256);
    rBmp.fillStyle = '#c8c8c8';
    rBmp.fillRect(x, 0, 6, 256);
  }

  // === 4. MULTI-LENS RECON VISOR OPTIC APERTURE MAP ===
  const [oColC, oCol] = makeCanvas(256, 128);
  oCol.fillStyle = '#051520';
  oCol.fillRect(0, 0, 256, 128);

  const oGrad = oCol.createRadialGradient(128, 64, 8, 128, 64, 118);
  oGrad.addColorStop(0, '#e6ffff');
  oGrad.addColorStop(0.35, '#38f0ff');
  oGrad.addColorStop(0.75, '#0b7ea8');
  oGrad.addColorStop(1, '#04263a');
  oCol.fillStyle = oGrad;
  oCol.fillRect(10, 14, 236, 100);

  // Precision rangefinder aperture rings & scanlines
  oCol.strokeStyle = 'rgba(255, 255, 255, 0.72)';
  oCol.lineWidth = 3;
  oCol.beginPath();
  oCol.arc(72, 64, 24, 0, Math.PI * 2);
  oCol.arc(166, 64, 34, 0, Math.PI * 2);
  oCol.stroke();

  oCol.fillStyle = 'rgba(5, 24, 36, 0.45)';
  for (let y = 0; y < 128; y += 8) {
    oCol.fillRect(0, y, 256, 2);
  }

  const armorAlbedo = finalizeTexture(aColC, true, 1, 1);
  const armorBump = finalizeTexture(aBmpC, false, 1, 1);
  const armorRoughness = finalizeTexture(aRghC, false, 1, 1);
  const cloakAlbedo = finalizeTexture(cColC, true, 1, 1);
  const cloakBump = finalizeTexture(cBmpC, false, 1, 1);
  const cloakRoughness = finalizeTexture(cRghC, false, 1, 1);
  const rifleAlbedo = finalizeTexture(rColC, true, 2, 1);
  const rifleBump = finalizeTexture(rBmpC, false, 2, 1);
  const opticCoreMap = finalizeTexture(oColC, true, 1, 1);

  return {
    armorAlbedo,
    armorBump,
    armorRoughness,
    cloakAlbedo,
    cloakBump,
    cloakRoughness,
    rifleAlbedo,
    rifleBump,
    opticCoreMap,
    dispose: () => {
      armorAlbedo.dispose();
      armorBump.dispose();
      armorRoughness.dispose();
      cloakAlbedo.dispose();
      cloakBump.dispose();
      cloakRoughness.dispose();
      rifleAlbedo.dispose();
      rifleBump.dispose();
      opticCoreMap.dispose();
    },
  };
}
