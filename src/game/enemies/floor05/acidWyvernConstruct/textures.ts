import * as THREE from 'three';

export interface WyvernTextureSuite {
  wingMembraneMap: THREE.CanvasTexture;
  scaleMap: THREE.CanvasTexture;
  dispose: () => void;
}

/**
 * Translucent bioluminescent emerald energy wing membrane & armored wyvern scale textures.
 */
export function createWyvernTextures(): WyvernTextureSuite {
  const size = 256;
  const wCanvas = document.createElement('canvas');
  wCanvas.width = size;
  wCanvas.height = size;
  const wctx = wCanvas.getContext('2d')!;

  const grad = wctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, 'rgba(132, 240, 88, 0.85)');
  grad.addColorStop(0.55, 'rgba(22, 163, 74, 0.52)');
  grad.addColorStop(1, 'rgba(10, 42, 34, 0.2)');
  wctx.fillStyle = grad;
  wctx.fillRect(0, 0, size, size);

  // Glowing geometric wing energy ribs
  wctx.strokeStyle = 'rgba(217, 255, 160, 0.72)';
  wctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    wctx.beginPath();
    wctx.moveTo(0, i * 44);
    wctx.lineTo(size, i * 36 + 24);
    wctx.stroke();
  }
  const wingMembraneMap = new THREE.CanvasTexture(wCanvas);
  wingMembraneMap.colorSpace = THREE.SRGBColorSpace;

  const sCanvas = document.createElement('canvas');
  sCanvas.width = size;
  sCanvas.height = size;
  const sctx = sCanvas.getContext('2d')!;
  sctx.fillStyle = '#4e747c';
  sctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 28) {
    for (let x = 0; x < size; x += 28) {
      sctx.fillStyle = (x + y) % 56 === 0 ? '#68969e' : '#4a6e76';
      sctx.beginPath();
      sctx.moveTo(x + 14, y);
      sctx.lineTo(x + 28, y + 14);
      sctx.lineTo(x + 14, y + 28);
      sctx.lineTo(x, y + 14);
      sctx.closePath();
      sctx.fill();
      sctx.strokeStyle = 'rgba(163, 245, 112, 0.55)';
      sctx.lineWidth = 2;
      sctx.stroke();
    }
  }
  const scaleMap = new THREE.CanvasTexture(sCanvas);
  scaleMap.wrapS = THREE.RepeatWrapping;
  scaleMap.wrapT = THREE.RepeatWrapping;
  scaleMap.colorSpace = THREE.SRGBColorSpace;

  return {
    wingMembraneMap,
    scaleMap,
    dispose() {
      wingMembraneMap.dispose();
      scaleMap.dispose();
    },
  };
}
