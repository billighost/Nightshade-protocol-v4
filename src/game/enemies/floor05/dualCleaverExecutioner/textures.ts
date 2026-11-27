import * as THREE from 'three';

export interface ExecutionerTextureSuite {
  furnacePlateMap: THREE.CanvasTexture;
  ironBump: THREE.CanvasTexture;
  bladeMap: THREE.CanvasTexture;
  leatherMap: THREE.CanvasTexture;
  hoodMap: THREE.CanvasTexture;
  dispose(): void;
}

export function createExecutionerTextures(): ExecutionerTextureSuite {
  const size = 384;
  let seed = 728813;
  const grain = () => ((seed = (Math.imul(seed,1664525)+1013904223)>>>0) / 4294967296);
  function surface(base: string) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = base;
    ctx.fillRect(0,0,size,size);
    return ctx;
  }
  const iron = surface('#50525a'), height = surface('#858585'), blade = surface('#787c84');
  const leather = surface('#54322c'), cloth = surface('#343038');
  for (let i=0; i<9700; i++) {
    const x = grain()*size, y = grain()*size, width = 0.5+grain()*3.3;
    const high = grain()>0.54;
    iron.fillStyle = high ? 'rgba(196,185,164,.12)' : 'rgba(20,23,31,.16)';
    iron.fillRect(x,y,width,0.6+grain()*1.5);
    height.fillStyle = high ? '#999999' : '#757575';
    height.fillRect(x,y,width,1.2);
    blade.fillStyle = high ? 'rgba(219,208,193,.075)' : 'rgba(44,33,37,.11)';
    blade.fillRect(x,y,5+grain()*32,0.5+grain()*0.9);
    leather.fillStyle = high ? 'rgba(181,133,109,.11)' : 'rgba(16,13,17,.16)';
    leather.fillRect(x,y,width,0.5+grain()*2);
  }
  for (let i=0; i<90; i++) {
    const x=grain()*size,y=grain()*size;
    iron.strokeStyle = i%3 ? 'rgba(34,29,27,.32)' : 'rgba(174,165,143,.32)';
    iron.lineWidth = 0.5+grain()*1.1;
    iron.beginPath(); iron.moveTo(x,y); iron.lineTo(x+3+grain()*21,y-grain()*8); iron.stroke();
  }
  for (let i=0; i<size; i+=3) {
    cloth.fillStyle = 'rgba(202,174,143,.055)'; cloth.fillRect(i,0,1,size);
    cloth.fillStyle = 'rgba(10,9,13,.21)'; cloth.fillRect(0,i,size,1);
  }
  // Hand-stitched apron side hems; the center stays quiet behind the moving chains.
  for (const x of [18,25,size-25,size-18]) {
    leather.strokeStyle = '#352423'; leather.lineWidth = 3;
    leather.beginPath(); leather.moveTo(x,0); leather.lineTo(x,size); leather.stroke();
    leather.fillStyle = '#a77c58';
    for (let y=3;y<size;y+=11) leather.fillRect(x-0.75,y,1.5,5);
  }
  function texture(ctx: CanvasRenderingContext2D, color=true) {
    const t = new THREE.CanvasTexture(ctx.canvas);
    t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  }
  const furnacePlateMap=texture(iron), ironBump=texture(height,false), bladeMap=texture(blade);
  const leatherMap=texture(leather), hoodMap=texture(cloth);
  return { furnacePlateMap,ironBump,bladeMap,leatherMap,hoodMap,
    dispose() { for (const t of [furnacePlateMap,ironBump,bladeMap,leatherMap,hoodMap]) t.dispose(); } };
}
