import * as THREE from 'three';

export interface MarauderTextureSuite {
  sovereignArmorMap: THREE.CanvasTexture;
  mantleMap: THREE.CanvasTexture;
  dispose: () => void;
}

/**
 * Imperial obsidian-bronze engraved Sovereign Champion armor & gilded crimson war-mantle textures.
 */
export function createMarauderTextures(): MarauderTextureSuite {
  const size = 256;
  const aCanvas = document.createElement('canvas');
  aCanvas.width = size;
  aCanvas.height = size;
  const ctx = aCanvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#5f687a');
  grad.addColorStop(0.5, '#4b5364');
  grad.addColorStop(1, '#6b7588');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Imperial engraved gold war-runes & overlapping segment seams
  ctx.strokeStyle = 'rgba(246, 194, 92, 0.9)';
  ctx.lineWidth = 3.5;
  for (let y = 32; y < size; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();

    for (let x = 24; x < size; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 14);
      ctx.lineTo(x, y - 24);
      ctx.lineTo(x + 10, y - 14);
      ctx.lineTo(x, y - 4);
      ctx.closePath();
      ctx.stroke();
    }
  }

  const sovereignArmorMap = new THREE.CanvasTexture(aCanvas);
  sovereignArmorMap.wrapS = THREE.RepeatWrapping;
  sovereignArmorMap.wrapT = THREE.RepeatWrapping;
  sovereignArmorMap.colorSpace = THREE.SRGBColorSpace;

  // Crimson war-mantle fabric with gold hem border
  const mCanvas = document.createElement('canvas');
  mCanvas.width = size;
  mCanvas.height = size;
  const mctx = mCanvas.getContext('2d')!;
  const mGrad = mctx.createLinearGradient(0, 0, 0, size);
  mGrad.addColorStop(0, '#a81b2c');
  mGrad.addColorStop(0.82, '#7d1220');
  mGrad.addColorStop(0.91, '#edb452');
  mGrad.addColorStop(1, '#630e19');
  mctx.fillStyle = mGrad;
  mctx.fillRect(0, 0, size, size);

  // Vertical woven cloth ribs
  mctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let x = 0; x < size; x += 12) {
    mctx.fillRect(x, 0, 4, size);
  }
  const mantleMap = new THREE.CanvasTexture(mCanvas);
  mantleMap.colorSpace = THREE.SRGBColorSpace;

  return {
    sovereignArmorMap,
    mantleMap,
    dispose() {
      sovereignArmorMap.dispose();
      mantleMap.dispose();
    },
  };
}
