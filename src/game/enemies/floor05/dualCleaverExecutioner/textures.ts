import * as THREE from 'three';

export interface ExecutionerTextureSuite {
  furnacePlateMap: THREE.CanvasTexture;
  dispose: () => void;
}

/**
 * Scorched furnace-iron armor lacing with molten forge fissures for Dual-Cleaver Executioner.
 */
export function createExecutionerTextures(): ExecutionerTextureSuite {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#5a606e';
  ctx.fillRect(0, 0, size, size);

  // Hammered forged iron bands & ember-hot cracks
  for (let y = 0; y < size; y += 42) {
    ctx.fillStyle = '#747c8c';
    ctx.fillRect(0, y, size, 30);
    ctx.fillStyle = '#9aa3b4';
    ctx.fillRect(0, y + 2, size, 3);
    ctx.fillStyle = '#2a2e38';
    ctx.fillRect(0, y + 30, size, 12);

    ctx.fillStyle = '#c8d0dc';
    for (let x = 16; x < size; x += 32) {
      ctx.beginPath();
      ctx.arc(x, y + 16, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.strokeStyle = 'rgba(255, 118, 48, 0.88)';
  ctx.lineWidth = 3.5;
  for (let i = 0; i < 6; i++) {
    const sx = 24 + i * 40;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx + 14, 72);
    ctx.lineTo(sx - 10, 152);
    ctx.lineTo(sx + 16, 256);
    ctx.stroke();
  }

  const furnacePlateMap = new THREE.CanvasTexture(canvas);
  furnacePlateMap.wrapS = THREE.RepeatWrapping;
  furnacePlateMap.wrapT = THREE.RepeatWrapping;
  furnacePlateMap.colorSpace = THREE.SRGBColorSpace;

  return {
    furnacePlateMap,
    dispose() {
      furnacePlateMap.dispose();
    },
  };
}
