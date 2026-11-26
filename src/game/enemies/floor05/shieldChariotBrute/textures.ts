import * as THREE from 'three';

export interface BruteTextureSuite {
  prowMap: THREE.CanvasTexture;
  prowBump: THREE.CanvasTexture;
  armorMap: THREE.CanvasTexture;
  armorBump: THREE.CanvasTexture;
  armorRoughness: THREE.CanvasTexture;
  crimsonMap: THREE.CanvasTexture;
  bronzeMap: THREE.CanvasTexture;
  bronzeBump: THREE.CanvasTexture;
  cannonMap: THREE.CanvasTexture;
  bannerMap: THREE.CanvasTexture;
  auraRingMap: THREE.CanvasTexture;
  dispose: () => void;
}

function configureTex(tex: THREE.CanvasTexture, isColor: boolean, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Full procedural PBR texture suite for the Floor 05 Shield-Chariot Brute:
 * battle-scarred crimson/obsidian V-Prow chevrons, forged iron siege plates,
 * antique hammered imperial bronze, scorched war-banner, and molten chariot-wheel aura sigil.
 */
export function createBruteTextures(): BruteTextureSuite {
  const size = 512;

  // 1. V-PROW CHARIOT SIEGE SHIELD ALBEDO + BUMP (Riveted crimson-iron + golden bull-ram chevrons + battle scars)
  const prowCanvas = document.createElement('canvas');
  prowCanvas.width = size;
  prowCanvas.height = size;
  const pCtx = prowCanvas.getContext('2d')!;

  const prowBumpCanvas = document.createElement('canvas');
  prowBumpCanvas.width = size;
  prowBumpCanvas.height = size;
  const pbCtx = prowBumpCanvas.getContext('2d')!;

  // Dark forged iron base
  const prowGrad = pCtx.createLinearGradient(0, 0, size, size);
  prowGrad.addColorStop(0, '#2a2f3a');
  prowGrad.addColorStop(0.5, '#1d212b');
  prowGrad.addColorStop(1, '#141720');
  pCtx.fillStyle = prowGrad;
  pCtx.fillRect(0, 0, size, size);

  pbCtx.fillStyle = '#808080';
  pbCtx.fillRect(0, 0, size, size);

  // Blood-crimson imperial siege enamel centerpiece band
  const crimGrad = pCtx.createLinearGradient(0, 72, 0, 388);
  crimGrad.addColorStop(0, '#8a1420');
  crimGrad.addColorStop(0.5, '#a81c28');
  crimGrad.addColorStop(1, '#680e18');
  pCtx.fillStyle = crimGrad;
  pCtx.fillRect(28, 72, size - 56, 316);

  // Recessed armored plate seam border
  pCtx.strokeStyle = '#0e1017';
  pCtx.lineWidth = 8;
  pCtx.strokeRect(28, 72, size - 56, 316);
  pbCtx.strokeStyle = '#242424';
  pbCtx.lineWidth = 10;
  pbCtx.strokeRect(28, 72, size - 56, 316);

  // Bold horned war-chariot bull chevrons in hammered gold-bronze
  pCtx.strokeStyle = '#dfa042';
  pCtx.lineWidth = 20;
  pCtx.lineCap = 'square';
  pbCtx.strokeStyle = '#d4d4d4';
  pbCtx.lineWidth = 22;
  for (let y = 132; y <= 318; y += 64) {
    pCtx.beginPath();
    pCtx.moveTo(48, y + 36);
    pCtx.lineTo(256, y - 24);
    pCtx.lineTo(464, y + 36);
    pCtx.stroke();

    pbCtx.beginPath();
    pbCtx.moveTo(48, y + 36);
    pbCtx.lineTo(256, y - 24);
    pbCtx.lineTo(464, y + 36);
    pbCtx.stroke();
  }

  // Subtle molten-orange inner warning accent line
  pCtx.strokeStyle = '#ff6a1a';
  pCtx.lineWidth = 5;
  pCtx.beginPath();
  pCtx.moveTo(64, 366);
  pCtx.lineTo(256, 314);
  pCtx.lineTo(448, 366);
  pCtx.stroke();

  // Heavy dome steel rivets framing top, bottom, and side flanges
  for (let x = 28; x <= size - 28; x += 46) {
    for (const y of [32, size - 32]) {
      pCtx.fillStyle = '#12151c';
      pCtx.beginPath();
      pCtx.arc(x + 2, y + 2, 10, 0, Math.PI * 2);
      pCtx.fill();
      pCtx.fillStyle = '#c4ccd8';
      pCtx.beginPath();
      pCtx.arc(x, y, 8, 0, Math.PI * 2);
      pCtx.fill();

      pbCtx.fillStyle = '#ececec';
      pbCtx.beginPath();
      pbCtx.arc(x, y, 9, 0, Math.PI * 2);
      pbCtx.fill();
    }
  }

  // Battle-worn laser scorch marks & metallic claw gouges across the ram face
  for (let i = 0; i < 26; i++) {
    const sx = ((i * 97) % 440) + 36;
    const sy = ((i * 131) % 410) + 48;
    const ang = -0.45 + (i % 5) * 0.22;
    const len = 34 + (i % 4) * 26;
    pCtx.strokeStyle = i % 3 === 0 ? 'rgba(225, 232, 245, 0.36)' : 'rgba(10, 12, 18, 0.55)';
    pCtx.lineWidth = i % 3 === 0 ? 2.5 : 4.5;
    pCtx.beginPath();
    pCtx.moveTo(sx, sy);
    pCtx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    pCtx.stroke();

    pbCtx.strokeStyle = '#383838';
    pbCtx.lineWidth = 3.5;
    pbCtx.beginPath();
    pbCtx.moveTo(sx, sy);
    pbCtx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    pbCtx.stroke();
  }

  // 2. FORGED OBSIDIAN-IRON SIEGE ARMOR (Albedo + Bump + Roughness)
  const armorCanvas = document.createElement('canvas');
  armorCanvas.width = size;
  armorCanvas.height = size;
  const aCtx = armorCanvas.getContext('2d')!;

  const armorBumpCanvas = document.createElement('canvas');
  armorBumpCanvas.width = size;
  armorBumpCanvas.height = size;
  const abCtx = armorBumpCanvas.getContext('2d')!;

  const armorRoughCanvas = document.createElement('canvas');
  armorRoughCanvas.width = size;
  armorRoughCanvas.height = size;
  const arCtx = armorRoughCanvas.getContext('2d')!;

  aCtx.fillStyle = '#303644';
  aCtx.fillRect(0, 0, size, size);
  abCtx.fillStyle = '#808080';
  abCtx.fillRect(0, 0, size, size);
  arCtx.fillStyle = '#707070';
  arCtx.fillRect(0, 0, size, size);

  // Heavy horizontal laminated siege armor plates + recessed bolts
  for (let y = 0; y < size; y += 64) {
    const shade = 44 + ((y / 64) % 2) * 10;
    aCtx.fillStyle = `rgb(${shade}, ${shade + 6}, ${shade + 16})`;
    aCtx.fillRect(0, y, size, 60);

    aCtx.fillStyle = '#151922';
    aCtx.fillRect(0, y + 60, size, 4);
    abCtx.fillStyle = '#282828';
    abCtx.fillRect(0, y + 59, size, 5);
    arCtx.fillStyle = '#b4b4b4';
    arCtx.fillRect(0, y + 59, size, 5);

    // Subtle brushed highlight at top bevel of each armor lame
    aCtx.fillStyle = 'rgba(180, 198, 224, 0.14)';
    aCtx.fillRect(0, y + 1, size, 3);
    abCtx.fillStyle = '#b2b2b2';
    abCtx.fillRect(0, y + 1, size, 3);

    // Hex-bolt studs along seam
    for (let x = 32; x < size; x += 64) {
      aCtx.fillStyle = '#8d98ab';
      aCtx.beginPath();
      aCtx.arc(x, y + 14, 4.5, 0, Math.PI * 2);
      aCtx.fill();
      abCtx.fillStyle = '#dedede';
      abCtx.beginPath();
      abCtx.arc(x, y + 14, 5, 0, Math.PI * 2);
      abCtx.fill();
      arCtx.fillStyle = '#404040';
      arCtx.beginPath();
      arCtx.arc(x, y + 14, 5, 0, Math.PI * 2);
      arCtx.fill();
    }
  }

  // Diagonal carbon-iron crosshatch micro-grain
  aCtx.strokeStyle = 'rgba(12, 16, 24, 0.28)';
  aCtx.lineWidth = 2;
  for (let d = -size; d < size * 2; d += 22) {
    aCtx.beginPath();
    aCtx.moveTo(d, 0);
    aCtx.lineTo(d + size, size);
    aCtx.stroke();
  }

  // 3. BLOOD-CRIMSON IMPERIAL GLADIATOR ENAMEL PLATE
  const crimsonCanvas = document.createElement('canvas');
  crimsonCanvas.width = 256;
  crimsonCanvas.height = 256;
  const cCtx = crimsonCanvas.getContext('2d')!;
  const cGrad = cCtx.createLinearGradient(0, 0, 256, 256);
  cGrad.addColorStop(0, '#9e1925');
  cGrad.addColorStop(0.5, '#7c111c');
  cGrad.addColorStop(1, '#580b13');
  cCtx.fillStyle = cGrad;
  cCtx.fillRect(0, 0, 256, 256);
  cCtx.strokeStyle = 'rgba(236, 174, 82, 0.25)';
  cCtx.lineWidth = 4;
  for (let y = 32; y < 256; y += 64) {
    cCtx.beginPath();
    cCtx.moveTo(0, y);
    cCtx.lineTo(256, y);
    cCtx.stroke();
  }
  for (let i = 0; i < 20; i++) {
    cCtx.strokeStyle = 'rgba(255, 220, 195, 0.16)';
    cCtx.lineWidth = 2;
    const x0 = (i * 53) % 240;
    const y0 = (i * 71) % 240;
    cCtx.beginPath();
    cCtx.moveTo(x0, y0);
    cCtx.lineTo(x0 + 26, y0 + 14);
    cCtx.stroke();
  }

  // 4. HAMMERED IMPERIAL WAR-BRONZE ALBEDO + BUMP
  const bronzeCanvas = document.createElement('canvas');
  bronzeCanvas.width = 256;
  bronzeCanvas.height = 256;
  const bCtx = bronzeCanvas.getContext('2d')!;
  const bronzeBumpCanvas = document.createElement('canvas');
  bronzeBumpCanvas.width = 256;
  bronzeBumpCanvas.height = 256;
  const bbCtx = bronzeBumpCanvas.getContext('2d')!;

  const bGrad = bCtx.createLinearGradient(0, 0, 256, 256);
  bGrad.addColorStop(0, '#c68a3e');
  bGrad.addColorStop(0.5, '#9d682a');
  bGrad.addColorStop(1, '#784c1d');
  bCtx.fillStyle = bGrad;
  bCtx.fillRect(0, 0, 256, 256);
  bbCtx.fillStyle = '#808080';
  bbCtx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 120; i++) {
    const bx = (i * 47) % 256;
    const by = (i * 83) % 256;
    const r = 6 + (i % 8);
    bCtx.fillStyle = i % 2 === 0 ? 'rgba(255, 214, 140, 0.08)' : 'rgba(42, 24, 10, 0.1)';
    bCtx.beginPath();
    bCtx.arc(bx, by, r, 0, Math.PI * 2);
    bCtx.fill();

    bbCtx.fillStyle = i % 2 === 0 ? '#969696' : '#686868';
    bbCtx.beginPath();
    bbCtx.arc(bx, by, r, 0, Math.PI * 2);
    bbCtx.fill();
  }

  // 5. ROTARY FLAK-CANNON HEAT-SCORCHED GUNMETAL
  const cannonCanvas = document.createElement('canvas');
  cannonCanvas.width = 256;
  cannonCanvas.height = 256;
  const gCtx = cannonCanvas.getContext('2d')!;
  gCtx.fillStyle = '#252a34';
  gCtx.fillRect(0, 0, 256, 256);
  // Industrial hazard caution chevrons near breech
  gCtx.fillStyle = '#c87d28';
  for (let x = -64; x < 320; x += 36) {
    gCtx.beginPath();
    gCtx.moveTo(x, 180);
    gCtx.lineTo(x + 18, 180);
    gCtx.lineTo(x - 10, 224);
    gCtx.lineTo(x - 28, 224);
    gCtx.closePath();
    gCtx.fill();
  }
  gCtx.strokeStyle = '#12151d';
  gCtx.lineWidth = 6;
  gCtx.strokeRect(6, 6, 244, 244);

  // 6. SCORCHED IMPERIAL WAR-BANNER / WAIST CAPE
  const bannerCanvas = document.createElement('canvas');
  bannerCanvas.width = 256;
  bannerCanvas.height = 256;
  const bnCtx = bannerCanvas.getContext('2d')!;
  const bnGrad = bnCtx.createLinearGradient(0, 0, 0, 256);
  bnGrad.addColorStop(0, '#6a0f18');
  bnGrad.addColorStop(0.65, '#460a12');
  bnGrad.addColorStop(1, '#1a0a0e');
  bnCtx.fillStyle = bnGrad;
  bnCtx.fillRect(0, 0, 256, 256);

  // Woven diamond cloth grain
  bnCtx.strokeStyle = 'rgba(20, 6, 8, 0.35)';
  bnCtx.lineWidth = 2;
  for (let d = -256; d < 512; d += 14) {
    bnCtx.beginPath();
    bnCtx.moveTo(d, 0);
    bnCtx.lineTo(d + 256, 256);
    bnCtx.stroke();
    bnCtx.beginPath();
    bnCtx.moveTo(d, 256);
    bnCtx.lineTo(d + 256, 0);
    bnCtx.stroke();
  }
  // Ornate bronze gladiator hem border
  bnCtx.strokeStyle = '#d4943a';
  bnCtx.lineWidth = 10;
  bnCtx.strokeRect(14, 14, 228, 224);
  bnCtx.strokeStyle = '#ff6a18';
  bnCtx.lineWidth = 3;
  bnCtx.strokeRect(24, 24, 208, 204);

  // 7. MOLTEN CHARIOT-WHEEL GROUND AURA SIGIL (Spoked Siege Wheel + Bull-Horn Runes, ACES-safe orange-red)
  const auraCanvas = document.createElement('canvas');
  auraCanvas.width = size;
  auraCanvas.height = size;
  const auCtx = auraCanvas.getContext('2d')!;
  auCtx.clearRect(0, 0, size, size);

  const cx = size * 0.5;
  const cy = size * 0.5;

  // Soft molten ember glow halo
  const haloGrad = auCtx.createRadialGradient(cx, cy, 48, cx, cy, 244);
  haloGrad.addColorStop(0, 'rgba(255, 72, 16, 0.0)');
  haloGrad.addColorStop(0.55, 'rgba(255, 84, 20, 0.22)');
  haloGrad.addColorStop(0.78, 'rgba(255, 118, 28, 0.44)');
  haloGrad.addColorStop(0.92, 'rgba(210, 42, 14, 0.24)');
  haloGrad.addColorStop(1, 'rgba(180, 20, 8, 0.0)');
  auCtx.fillStyle = haloGrad;
  auCtx.beginPath();
  auCtx.arc(cx, cy, 244, 0, Math.PI * 2);
  auCtx.fill();

  // Outer chariot iron rim ring
  auCtx.strokeStyle = 'rgba(255, 132, 36, 0.92)';
  auCtx.lineWidth = 6;
  auCtx.beginPath();
  auCtx.arc(cx, cy, 212, 0, Math.PI * 2);
  auCtx.stroke();

  // Inner siege ring
  auCtx.strokeStyle = 'rgba(255, 92, 24, 0.78)';
  auCtx.lineWidth = 4;
  auCtx.beginPath();
  auCtx.arc(cx, cy, 152, 0, Math.PI * 2);
  auCtx.stroke();

  // 8 Spoked war-chariot wheel struts + outer ram teeth
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    auCtx.strokeStyle = 'rgba(255, 120, 32, 0.74)';
    auCtx.lineWidth = 4;
    auCtx.beginPath();
    auCtx.moveTo(cx + cos * 116, cy + sin * 116);
    auCtx.lineTo(cx + cos * 212, cy + sin * 212);
    auCtx.stroke();

    // Jagged war-wheel blade tooth protruding outward
    const aL = a - 0.11;
    const aR = a + 0.11;
    auCtx.fillStyle = 'rgba(255, 148, 48, 0.88)';
    auCtx.beginPath();
    auCtx.moveTo(cx + Math.cos(aL) * 210, cy + Math.sin(aL) * 210);
    auCtx.lineTo(cx + cos * 242, cy + sin * 242);
    auCtx.lineTo(cx + Math.cos(aR) * 210, cy + Math.sin(aR) * 210);
    auCtx.closePath();
    auCtx.fill();
  }

  // Segmented dashed mid-track ring
  auCtx.setLineDash([22, 16]);
  auCtx.strokeStyle = 'rgba(255, 168, 64, 0.78)';
  auCtx.lineWidth = 3.5;
  auCtx.beginPath();
  auCtx.arc(cx, cy, 182, 0, Math.PI * 2);
  auCtx.stroke();
  auCtx.setLineDash([]);

  const prowMap = configureTex(new THREE.CanvasTexture(prowCanvas), true, 1, 1);
  const prowBump = configureTex(new THREE.CanvasTexture(prowBumpCanvas), false, 1, 1);
  const armorMap = configureTex(new THREE.CanvasTexture(armorCanvas), true, 2, 2);
  const armorBump = configureTex(new THREE.CanvasTexture(armorBumpCanvas), false, 2, 2);
  const armorRoughness = configureTex(new THREE.CanvasTexture(armorRoughCanvas), false, 2, 2);
  const crimsonMap = configureTex(new THREE.CanvasTexture(crimsonCanvas), true, 1, 1);
  const bronzeMap = configureTex(new THREE.CanvasTexture(bronzeCanvas), true, 1, 1);
  const bronzeBump = configureTex(new THREE.CanvasTexture(bronzeBumpCanvas), false, 1, 1);
  const cannonMap = configureTex(new THREE.CanvasTexture(cannonCanvas), true, 1, 1);
  const bannerMap = configureTex(new THREE.CanvasTexture(bannerCanvas), true, 1, 1);
  const auraRingMap = configureTex(new THREE.CanvasTexture(auraCanvas), true, 1, 1);

  return {
    prowMap,
    prowBump,
    armorMap,
    armorBump,
    armorRoughness,
    crimsonMap,
    bronzeMap,
    bronzeBump,
    cannonMap,
    bannerMap,
    auraRingMap,
    dispose() {
      prowMap.dispose();
      prowBump.dispose();
      armorMap.dispose();
      armorBump.dispose();
      armorRoughness.dispose();
      crimsonMap.dispose();
      bronzeMap.dispose();
      bronzeBump.dispose();
      cannonMap.dispose();
      bannerMap.dispose();
      auraRingMap.dispose();
    },
  };
}
