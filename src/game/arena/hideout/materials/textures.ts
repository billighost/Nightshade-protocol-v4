import * as THREE from 'three';

export function makeGreyboxGridTexture(
  baseHex: string,
  lineHex: string,
  subLineHex: string,
  repeatX: number,
  repeatY: number
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle architectural concrete micro-grain
  for (let i = 0; i < 1800; i++) {
    const x = (i * 73) % 512;
    const y = (i * 199) % 512;
    const alpha = (i % 7) * 0.008 + 0.01;
    ctx.fillStyle = i % 2 === 0 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha * 1.4})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Secondary 1m architectural blockout sub-grid
  ctx.strokeStyle = subLineHex;
  ctx.lineWidth = 2;
  for (let p = 128; p < 512; p += 128) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(512, p);
    ctx.stroke();
  }

  // Primary 2m poured-concrete form-tie seam lines
  ctx.strokeStyle = lineHex;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 508, 508);
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 256);
  ctx.lineTo(512, 256);
  ctx.stroke();

  // Architectural form-tie dots (brutalist Control / Halo concrete read!)
  ctx.fillStyle = lineHex;
  for (const fx of [64, 192, 320, 448]) {
    for (const fy of [64, 192, 320, 448]) {
      ctx.beginPath();
      ctx.arc(fx, fy, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  return tex;
}

export function makeBallisticPanelTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  // Warm tactical composite-plywood / ballistic rubber board tone (CoD Shoot House contrast!)
  ctx.fillStyle = '#5c4d3c';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle horizontal ballistic board grain & tactical wear streaks
  for (let i = 0; i < 160; i++) {
    const y = (i * 19) % 512;
    const h = 2 + (i % 5);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,245,230,0.035)' : 'rgba(20,14,8,0.06)';
    ctx.fillRect(0, y, 512, h);
  }

  // Modular plywood/ballistic-tile sheet seams (1.2m × 2.4m panels)
  ctx.strokeStyle = '#2d251d';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 508, 508);
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 256);
  ctx.lineTo(512, 256);
  ctx.stroke();

  // Recessed steel fastener bolts along panel perimeters
  ctx.fillStyle = '#1f2937';
  for (const bx of [22, 234, 278, 490]) {
    for (const by of [24, 128, 232, 280, 384, 488]) {
      ctx.beginPath();
      ctx.arc(bx, by, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Subtle tactical lower scuff-band
  ctx.fillStyle = 'rgba(18, 15, 12, 0.22)';
  ctx.fillRect(0, 440, 512, 72);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1.4);
  tex.needsUpdate = true;
  return tex;
}

export function makeFloorStencilTexture(
  bigCode: string,
  title: string,
  accentHex: number,
  subtitle?: string
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const accentCss = '#' + accentHex.toString(16).padStart(6, '0');

  // Deep architectural matte slate plate
  ctx.fillStyle = '#111720';
  ctx.fillRect(0, 0, 1024, 256);

  // Subtle metallic brushed horizontal scanlines
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  for (let y = 18; y < 240; y += 8) {
    ctx.fillRect(14, y, 996, 2);
  }

  // Top & bottom glowing architectural trim bars
  ctx.fillStyle = accentCss;
  ctx.fillRect(0, 0, 1024, 14);
  ctx.fillRect(0, 244, 1024, 12);
  ctx.strokeStyle = 'rgba(203, 213, 225, 0.22)';
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 24, 1000, 208);

  // Left badge compartment [24 .. 288]: auto-scaled so 2-char ("08") AND 5-char ("KH-08", "EX-01", "FL-07") NEVER overflow!
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.fillRect(16, 28, 276, 200);

  const codeLen = bigCode.length;
  const codeFontPx = codeLen <= 2 ? 132 : codeLen <= 3 ? 106 : codeLen <= 4 ? 86 : 74;
  ctx.fillStyle = accentCss;
  ctx.font = `800 ${codeFontPx}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(bigCode, 154, 132, 252);

  // Crisp vertical divider
  ctx.fillStyle = accentCss;
  ctx.fillRect(298, 44, 4, 168);

  // Right text column [328 .. 992] — generous width, auto-clamped via maxWidth so ZERO clipping or overlap!
  const textX = 330;
  const maxTextW = 660;
  ctx.textAlign = 'left';

  ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
  ctx.font = '700 22px sans-serif';
  ctx.fillText('NIGHTSHADE FACILITY · SECTOR DESIGNATION', textX, 66, maxTextW);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 44px monospace';
  ctx.fillText(title.toUpperCase(), textX, 128, maxTextW);

  if (subtitle) {
    ctx.fillStyle = accentCss;
    ctx.font = '700 23px monospace';
    ctx.fillText(subtitle.toUpperCase(), textX, 184, maxTextW);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export function makeLaneMarkerTexture(
  label: string,
  accentHex: number
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const accentCss = '#' + accentHex.toString(16).padStart(6, '0');
  ctx.fillStyle = '#0f151e';
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = accentCss;
  ctx.fillRect(0, 0, 256, 10);
  ctx.fillRect(0, 118, 256, 10);
  ctx.strokeStyle = 'rgba(203,213,225,0.28)';
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 16, 240, 96);

  ctx.fillStyle = '#f8fafc';
  ctx.font = label.length <= 2 ? '800 68px monospace' : '800 44px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label.toUpperCase(), 128, 66, 224);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}
