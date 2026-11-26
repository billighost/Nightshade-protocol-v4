import { useEffect, useRef } from 'react';
import { sampleFogVisibility } from '../game/hud/fogOfWar';
import {
  classifyElevationDelta,
  worldToRadarLocal,
  type MinimapSnapshot,
} from '../game/hud/minimapMath';

interface TacticalMinimapProps {
  minimap: MinimapSnapshot;
  hitBearingRad: number;
  hitArcAlpha: number;
  damagePulse: number;
}

const CANVAS_SIZE = 208;
const HALF = CANVAS_SIZE / 2;
const INNER_RADIUS = 93;

/**
 * Chamfered octagonal tactical radar clip path (mirrors the precision SVG bezel).
 */
function traceOctagonPath(ctx: CanvasRenderingContext2D, size: number, inset: number, cut: number) {
  const a = inset;
  const b = size - inset;
  ctx.beginPath();
  ctx.moveTo(a + cut, a);
  ctx.lineTo(b - cut, a);
  ctx.lineTo(b, a + cut);
  ctx.lineTo(b, b - cut);
  ctx.lineTo(b - cut, b);
  ctx.lineTo(a + cut, b);
  ctx.lineTo(a, b - cut);
  ctx.lineTo(a, a + cut);
  ctx.closePath();
}

/**
 * Flagship AAA Tactical Minimap (COD MWIII / Valorant / Cyberpunk 2077 / Halo Infinite):
 * - Figure-ground architectural blueprint (walkable interior rooms vs deep obsidian void)
 * - Unmistakable luminous enemy blips with facing sight-cones, crimson threat glow, gunfire pings,
 *   elevation carets, AND bright directional edge-chevrons for off-radar enemies!
 * - Zero duplicate degree readout (heading owned cleanly by top-center compass)
 */
export function TacticalMinimap({
  minimap,
  hitBearingRad,
  hitArcAlpha,
  damagePulse,
}: TacticalMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trailRef = useRef<Array<{ x: number; z: number }>>([]);
  // Cached low-res fog mask canvas (64x64) + version key so we only upload pixels when fog clears!
  const fogMaskRef = useRef<{
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    imgData: ImageData;
    version: number;
    floorNumber: number;
  } | null>(null);
  const fogScratchRef = useRef<{
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    hatchPattern: CanvasPattern | null;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetPx = Math.round(CANVAS_SIZE * dpr);
    if (canvas.width !== targetPx || canvas.height !== targetPx) {
      canvas.width = targetPx;
      canvas.height = targetPx;
    }

    // Subtle movement breadcrumb trail behind player (resets on teleports > 6m)
    const trail = trailRef.current;
    const last = trail[trail.length - 1];
    if (!last) {
      trail.push({ x: minimap.playerX, z: minimap.playerZ });
    } else {
      const moved = Math.hypot(minimap.playerX - last.x, minimap.playerZ - last.z);
      if (moved > 6.0) {
        trail.length = 0;
        trail.push({ x: minimap.playerX, z: minimap.playerZ });
      } else if (moved > 0.9) {
        trail.push({ x: minimap.playerX, z: minimap.playerZ });
        if (trail.length > 6) trail.shift();
      }
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const t = (performance.now() * 0.001) % 60;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Clip cleanly inside the chamfered tactical octagon
    traceOctagonPath(ctx, CANVAS_SIZE, 6, 25);
    ctx.clip();

    // 1. Deep obsidian exterior void backdrop (high figure-ground contrast with lit walkable rooms!)
    const voidGrad = ctx.createRadialGradient(HALF, HALF, 10, HALF, HALF, INNER_RADIUS + 18);
    voidGrad.addColorStop(0, 'rgba(6, 12, 22, 0.96)');
    voidGrad.addColorStop(0.75, 'rgba(3, 7, 15, 0.98)');
    voidGrad.addColorStop(1, 'rgba(2, 4, 10, 0.99)');
    ctx.fillStyle = voidGrad;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const scalePxPerMeter = INNER_RADIUS / minimap.radarRangeMeters;
    const yaw = minimap.cameraYaw;

    // 2. World-rotated architectural floor-plan pass (player-heading-up)
    ctx.save();
    ctx.translate(HALF, HALF);
    ctx.rotate(-yaw);

    // Pass 2a: Walkable interior room floor plates (COD / Valorant lit room silhouette vs dark void!)
    for (let i = 0; i < minimap.geometry.length; i++) {
      const r = minimap.geometry[i];
      if (r.kind !== 'floor') continue;
      const x = (r.minX - minimap.playerX) * scalePxPerMeter;
      const y = (r.minZ - minimap.playerZ) * scalePxPerMeter;
      const w = (r.maxX - r.minX) * scalePxPerMeter;
      const h = (r.maxZ - r.minZ) * scalePxPerMeter;
      ctx.fillStyle = 'rgba(28, 46, 72, 0.88)';
      ctx.fillRect(x, y, w, h);
    }

    // Subtle 5m tactical blueprint coordinate grid over interior rooms
    const gridSpacing = 5;
    const startX =
      Math.floor((minimap.playerX - minimap.radarRangeMeters * 1.45) / gridSpacing) * gridSpacing;
    const endX =
      Math.ceil((minimap.playerX + minimap.radarRangeMeters * 1.45) / gridSpacing) * gridSpacing;
    const startZ =
      Math.floor((minimap.playerZ - minimap.radarRangeMeters * 1.45) / gridSpacing) * gridSpacing;
    const endZ =
      Math.ceil((minimap.playerZ + minimap.radarRangeMeters * 1.45) / gridSpacing) * gridSpacing;

    ctx.strokeStyle = 'rgba(125, 211, 252, 0.065)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (let gx = startX; gx <= endX; gx += gridSpacing) {
      const px = (gx - minimap.playerX) * scalePxPerMeter;
      ctx.moveTo(px, -INNER_RADIUS * 1.55);
      ctx.lineTo(px, INNER_RADIUS * 1.55);
    }
    for (let gz = startZ; gz <= endZ; gz += gridSpacing) {
      const py = (gz - minimap.playerZ) * scalePxPerMeter;
      ctx.moveTo(-INNER_RADIUS * 1.55, py);
      ctx.lineTo(INNER_RADIUS * 1.55, py);
    }
    ctx.stroke();

    // Pass 2b: Elevated mezzanines & catwalks (luminous blueprint cyan tint + dashed perimeter)
    for (let i = 0; i < minimap.geometry.length; i++) {
      const r = minimap.geometry[i];
      if (r.kind !== 'elevated') continue;
      const x = (r.minX - minimap.playerX) * scalePxPerMeter;
      const y = (r.minZ - minimap.playerZ) * scalePxPerMeter;
      const w = (r.maxX - r.minX) * scalePxPerMeter;
      const h = (r.maxZ - r.minZ) * scalePxPerMeter;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.44)';
      ctx.lineWidth = 0.85;
      ctx.setLineDash([3, 2.5]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }

    // Pass 2c: Stairways & ramps
    for (let i = 0; i < minimap.geometry.length; i++) {
      const r = minimap.geometry[i];
      if (r.kind !== 'ramp') continue;
      const x = (r.minX - minimap.playerX) * scalePxPerMeter;
      const y = (r.minZ - minimap.playerZ) * scalePxPerMeter;
      const w = (r.maxX - r.minX) * scalePxPerMeter;
      const h = (r.maxZ - r.minZ) * scalePxPerMeter;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.65)';
      ctx.lineWidth = 0.9;
      ctx.strokeRect(x, y, w, h);
    }

    // Pass 2d: Low tactical cover blocks
    for (let i = 0; i < minimap.geometry.length; i++) {
      const r = minimap.geometry[i];
      if (r.kind !== 'cover') continue;
      const x = (r.minX - minimap.playerX) * scalePxPerMeter;
      const y = (r.minZ - minimap.playerZ) * scalePxPerMeter;
      const w = Math.max(2.2, (r.maxX - r.minX) * scalePxPerMeter);
      const h = Math.max(2.2, (r.maxZ - r.minZ) * scalePxPerMeter);
      ctx.fillStyle = 'rgba(84, 118, 154, 0.86)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(186, 214, 242, 0.62)';
      ctx.lineWidth = 0.85;
      ctx.strokeRect(x, y, w, h);
    }

    // Pass 2e: Full-height structural walls (crisp dark core + bright white-ice architectural rim)
    for (let i = 0; i < minimap.geometry.length; i++) {
      const r = minimap.geometry[i];
      if (r.kind !== 'wall') continue;
      const x = (r.minX - minimap.playerX) * scalePxPerMeter;
      const y = (r.minZ - minimap.playerZ) * scalePxPerMeter;
      const w = Math.max(2.3, (r.maxX - r.minX) * scalePxPerMeter);
      const h = Math.max(2.3, (r.maxZ - r.minZ) * scalePxPerMeter);
      ctx.fillStyle = 'rgba(9, 16, 28, 0.98)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(218, 236, 255, 0.92)';
      ctx.lineWidth = 1.25;
      ctx.strokeRect(x, y, w, h);
    }

    // Pass 2f: Blast doors & shutters
    for (let i = 0; i < minimap.geometry.length; i++) {
      const r = minimap.geometry[i];
      if (r.kind !== 'door') continue;
      const x = (r.minX - minimap.playerX) * scalePxPerMeter;
      const y = (r.minZ - minimap.playerZ) * scalePxPerMeter;
      const w = Math.max(2.4, (r.maxX - r.minX) * scalePxPerMeter);
      const h = Math.max(2.4, (r.maxZ - r.minZ) * scalePxPerMeter);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.68)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.92)';
      ctx.lineWidth = 1.1;
      ctx.strokeRect(x, y, w, h);
    }

    // Subtle movement trail behind operative
    if (trail.length > 1) {
      for (let i = 0; i < trail.length - 1; i++) {
        const pt = trail[i];
        const px = (pt.x - minimap.playerX) * scalePxPerMeter;
        const py = (pt.z - minimap.playerZ) * scalePxPerMeter;
        const alpha = ((i + 1) / trail.length) * 0.36;
        ctx.fillStyle = `rgba(103, 232, 249, ${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    // 2.5 DYNAMIC FOG OF WAR SHROUD (obscures unvisited/unseen areas, dynamically clears as operative explores!)
    if (minimap.fog) {
      const fog = minimap.fog;
      let mask = fogMaskRef.current;
      if (!mask || mask.canvas.width !== fog.cols || mask.canvas.height !== fog.rows) {
        const c = document.createElement('canvas');
        c.width = fog.cols;
        c.height = fog.rows;
        const mctx = c.getContext('2d');
        if (mctx) {
          mask = {
            canvas: c,
            ctx: mctx,
            imgData: mctx.createImageData(fog.cols, fog.rows),
            version: -1,
            floorNumber: -1,
          };
          fogMaskRef.current = mask;
        }
      }

      if (mask && (mask.version !== fog.version || mask.floorNumber !== minimap.floorNumber)) {
        const data = mask.imgData.data;
        const cells = fog.cells;
        for (let i = 0; i < cells.length; i++) {
          const obscured = 255 - cells[i]; // 255 = hidden, 0 = fully revealed
          const o = i * 4;
          data[o] = 3;
          data[o + 1] = 7;
          data[o + 2] = 14;
          // Deep tactical shroud opacity (~93%) so unexplored wings are clearly obscured
          data[o + 3] = Math.round(obscured * 0.935);
        }
        mask.ctx.putImageData(mask.imgData, 0, 0);
        mask.version = fog.version;
        mask.floorNumber = minimap.floorNumber;
      }

      // Scratch canvas for smooth bilinear fog mask + subtle encrypted diagonal radar hatch
      let scratch = fogScratchRef.current;
      if (!scratch) {
        const sc = document.createElement('canvas');
        sc.width = CANVAS_SIZE;
        sc.height = CANVAS_SIZE;
        const sctx = sc.getContext('2d');
        if (sctx) {
          // Tiny 8x8 diagonal tactical hatch tile for unexplored classified sectors
          const tile = document.createElement('canvas');
          tile.width = 8;
          tile.height = 8;
          const tctx = tile.getContext('2d');
          if (tctx) {
            tctx.strokeStyle = 'rgba(56, 189, 248, 0.085)';
            tctx.lineWidth = 1;
            tctx.beginPath();
            tctx.moveTo(0, 8);
            tctx.lineTo(8, 0);
            tctx.moveTo(-2, 2);
            tctx.lineTo(2, -2);
            tctx.moveTo(6, 10);
            tctx.lineTo(10, 6);
            tctx.stroke();
          }
          scratch = {
            canvas: sc,
            ctx: sctx,
            hatchPattern: sctx.createPattern(tile, 'repeat'),
          };
          fogScratchRef.current = scratch;
        }
      }

      if (mask && scratch) {
        const sctx = scratch.ctx;
        sctx.save();
        sctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        sctx.translate(HALF, HALF);
        sctx.rotate(-yaw);
        sctx.imageSmoothingEnabled = true;

        const fx = (fog.minX - minimap.playerX) * scalePxPerMeter;
        const fy = (fog.minZ - minimap.playerZ) * scalePxPerMeter;
        const fw = (fog.maxX - fog.minX) * scalePxPerMeter;
        const fh = (fog.maxZ - fog.minZ) * scalePxPerMeter;
        sctx.drawImage(mask.canvas, fx, fy, fw, fh);

        // Stamp subtle classified diagonal hatch strictly onto shrouded regions
        if (scratch.hatchPattern) {
          sctx.globalCompositeOperation = 'source-atop';
          sctx.fillStyle = scratch.hatchPattern;
          sctx.fillRect(-CANVAS_SIZE, -CANVAS_SIZE, CANVAS_SIZE * 2, CANVAS_SIZE * 2);
        }
        sctx.restore();

        ctx.drawImage(scratch.canvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      }
    }

    // 3. Concentric Halo Motion-Tracker Range Rings (12m & 24m) + subtle sonar sweep
    ctx.save();
    const r12 = 12 * scalePxPerMeter;
    const r24 = 24 * scalePxPerMeter;

    ctx.strokeStyle = 'rgba(125, 211, 252, 0.14)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(HALF, HALF, r12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.arc(HALF, HALF, r24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Gentle expanding tactical pulse wave every 3.8s
    const sweepRatio = (t % 3.8) / 3.8;
    const sweepR = 8 + sweepRatio * (INNER_RADIUS - 10);
    ctx.strokeStyle = `rgba(56, 189, 248, ${(1 - sweepRatio) * 0.16})`;
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.arc(HALF, HALF, sweepR, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Translucent player camera FOV cone (points straight UP on heading-up radar)
    const fovHalf = (34 * Math.PI) / 180;
    const fovGrad = ctx.createRadialGradient(HALF, HALF, 2, HALF, HALF, 68);
    fovGrad.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
    fovGrad.addColorStop(0.55, 'rgba(56, 189, 248, 0.09)');
    fovGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = fovGrad;
    ctx.beginPath();
    ctx.moveTo(HALF, HALF);
    ctx.arc(HALF, HALF, 68, -Math.PI / 2 - fovHalf, -Math.PI / 2 + fovHalf);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(125, 211, 252, 0.26)';
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(HALF, HALF);
    ctx.lineTo(HALF - Math.sin(fovHalf) * 58, HALF - Math.cos(fovHalf) * 58);
    ctx.moveTo(HALF, HALF);
    ctx.lineTo(HALF + Math.sin(fovHalf) * 58, HALF - Math.cos(fovHalf) * 58);
    ctx.stroke();
    ctx.restore();

    // 5. Animated Objective Guidance Vector (Control Center Ready or Exit Bulkhead Open!)
    if (
      minimap.objectiveTarget &&
      (minimap.objectiveTarget.kind === 'control_center' || minimap.objectiveTarget.kind === 'exit')
    ) {
      const proj = worldToRadarLocal(
        minimap.objectiveTarget.x,
        minimap.objectiveTarget.z,
        minimap.playerX,
        minimap.playerZ,
        yaw,
        minimap.radarRangeMeters,
        0.78
      );
      const tx = HALF + proj.rx * INNER_RADIUS;
      const ty = HALF + proj.ry * INNER_RADIUS;
      const isExit = minimap.objectiveTarget.kind === 'exit';
      ctx.save();
      ctx.strokeStyle = isExit ? 'rgba(34, 211, 238, 0.9)' : 'rgba(251, 191, 36, 0.92)';
      ctx.lineWidth = 1.9;
      ctx.setLineDash([5, 3.5]);
      ctx.lineDashOffset = -(t * 20);
      ctx.beginPath();
      ctx.moveTo(HALF, HALF);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 6. Ammo Crates (only visible once their sector has been revealed out of Fog of War!)
    for (let i = 0; i < minimap.ammoCrates.length; i++) {
      const c = minimap.ammoCrates[i];
      if (minimap.fog && sampleFogVisibility(minimap.fog, c.x, c.z) < 0.35) continue;
      const p = worldToRadarLocal(
        c.x,
        c.z,
        minimap.playerX,
        minimap.playerZ,
        yaw,
        minimap.radarRangeMeters,
        0.95
      );
      if (p.clamped) continue;
      const cx = HALF + p.rx * INNER_RADIUS;
      const cy = HALF + p.ry * INNER_RADIUS;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = 'rgba(8, 14, 26, 0.94)';
      ctx.fillRect(-3.8, -3.8, 7.6, 7.6);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
      ctx.lineWidth = 0.75;
      ctx.strokeRect(-3.8, -3.8, 7.6, 7.6);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(-2.1, 0);
      ctx.lineTo(2.1, 0);
      ctx.moveTo(0, -2.1);
      ctx.lineTo(0, 2.1);
      ctx.stroke();
      ctx.restore();
    }

    // 7. Exit Bulkhead Portal Marker
    {
      const p = worldToRadarLocal(
        minimap.exitDoor.x,
        minimap.exitDoor.z,
        minimap.playerX,
        minimap.playerZ,
        yaw,
        minimap.radarRangeMeters,
        0.86
      );
      const ex = HALF + p.rx * INNER_RADIUS;
      const ey = HALF + p.ry * INNER_RADIUS;
      if (!p.clamped || minimap.exitDoor.open) {
        ctx.save();
        ctx.translate(ex, ey);
        if (minimap.exitDoor.open) {
          const pulse = 0.5 + 0.5 * Math.sin(t * 5.2);
          ctx.strokeStyle = `rgba(34, 211, 238, ${0.44 + pulse * 0.52})`;
          ctx.lineWidth = 1.7;
          ctx.beginPath();
          ctx.arc(0, 0, 7.5 + pulse * 4.5, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = minimap.exitDoor.open ? '#22d3ee' : 'rgba(100, 116, 139, 0.8)';
        ctx.strokeStyle = '#04080f';
        ctx.lineWidth = 1;
        ctx.fillRect(-5, -2.4, 10, 4.8);
        ctx.strokeRect(-5, -2.4, 10, 4.8);
        ctx.restore();
      }
    }

    // 8. Control Center Marker (Crimson Lock -> Radiant Pulsing Gold Shrine Beacon -> Cyan Active)
    {
      const cc = minimap.controlCenter;
      const p = worldToRadarLocal(
        cc.x,
        cc.z,
        minimap.playerX,
        minimap.playerZ,
        yaw,
        minimap.radarRangeMeters,
        0.78
      );
      const cx = HALF + p.rx * INNER_RADIUS;
      const cy = HALF + p.ry * INNER_RADIUS;
      ctx.save();
      ctx.translate(cx, cy);

      if (cc.state === 'ready') {
        const pulse = (t * 1.45) % 1;
        ctx.strokeStyle = `rgba(251, 191, 36, ${(1 - pulse) * 0.96})`;
        ctx.lineWidth = 2.1;
        ctx.beginPath();
        ctx.arc(0, 0, 7 + pulse * 13, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(251, 191, 36, 0.28)';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();

        if (p.clamped) {
          ctx.save();
          ctx.rotate(p.angleRad);
          ctx.fillStyle = '#fbbf24';
          ctx.strokeStyle = '#04080f';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, -12.5);
          ctx.lineTo(5.2, -5.5);
          ctx.lineTo(-5.2, -5.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#fbbf24';
        ctx.strokeStyle = '#04080f';
        ctx.lineWidth = 1.6;
        ctx.fillRect(-5.4, -5.4, 10.8, 10.8);
        ctx.strokeRect(-5.4, -5.4, 10.8, 10.8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-2.1, -2.1, 4.2, 4.2);
      } else if (cc.state === 'disabled') {
        if (!p.clamped) {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
          ctx.strokeStyle = 'rgba(248, 113, 113, 0.92)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 6.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = '#f87171';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-2.7, -2.7);
          ctx.lineTo(2.7, 2.7);
          ctx.moveTo(2.7, -2.7);
          ctx.lineTo(-2.7, 2.7);
          ctx.stroke();
        }
      } else {
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#22d3ee';
        ctx.strokeStyle = '#04080f';
        ctx.lineWidth = 1.3;
        ctx.fillRect(-4.2, -4.2, 8.4, 8.4);
        ctx.strokeRect(-4.2, -4.2, 8.4, 8.4);
      }
      ctx.restore();
    }

    // 9. UNMISTAKABLE ENEMY BLIPS:
    //    - On-radar: crimson glow halo + enemy facing cone + razor directional chevron + white core pip + gunfire ping + elevation carets!
    //    - Off-radar: crisp luminous directional edge-chevrons pointing straight toward every off-range enemy!
    for (let i = 0; i < minimap.enemies.length; i++) {
      const e = minimap.enemies[i];
      const clampEdge = e.tier === 'boss' || e.tier === 'miniboss' ? 0.78 : 0.81;
      const p = worldToRadarLocal(
        e.x,
        e.z,
        minimap.playerX,
        minimap.playerZ,
        yaw,
        minimap.radarRangeMeters,
        clampEdge
      );
      const ex = HALF + p.rx * INNER_RADIUS;
      const ey = HALF + p.ry * INNER_RADIUS;
      const elev = classifyElevationDelta(e.y, minimap.playerY, 1.8);

      ctx.save();
      ctx.translate(ex, ey);

      if (e.tier === 'boss') {
        const pulse = 0.5 + 0.5 * Math.sin(t * 5.2);
        // Radiant boss threat aura
        const aura = ctx.createRadialGradient(0, 0, 2, 0, 0, 15);
        aura.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
        aura.addColorStop(0.55, 'rgba(239, 68, 68, 0.25)');
        aura.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(251, 191, 36, ${0.52 + pulse * 0.46})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, 9.2 + pulse * 2.8, 0, Math.PI * 2);
        ctx.stroke();

        if (p.clamped) {
          ctx.save();
          ctx.rotate(p.angleRad);
          ctx.fillStyle = '#fbbf24';
          ctx.strokeStyle = '#04080f';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, -12.5);
          ctx.lineTo(4.8, -6.5);
          ctx.lineTo(-4.8, -6.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        // Crowned Boss Diamond + Gold Core
        ctx.fillStyle = '#ef4444';
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -7.4);
        ctx.lineTo(6.6, 0);
        ctx.lineTo(0, 7.4);
        ctx.lineTo(-6.6, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 2.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.tier === 'miniboss') {
        const pulse = 0.5 + 0.5 * Math.sin(t * 4.4 + i);
        const aura = ctx.createRadialGradient(0, 0, 1.5, 0, 0, 12);
        aura.addColorStop(0, 'rgba(249, 115, 22, 0.46)');
        aura.addColorStop(1, 'rgba(249, 115, 22, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();

        if (p.clamped) {
          ctx.save();
          ctx.rotate(p.angleRad);
          ctx.fillStyle = '#fb923c';
          ctx.strokeStyle = '#04080f';
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(0, -7.8);
          ctx.lineTo(5.6, 3.2);
          ctx.lineTo(0, 0.6);
          ctx.lineTo(-5.6, 3.2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.strokeStyle = `rgba(253, 224, 71, ${0.4 + pulse * 0.45})`;
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          ctx.arc(0, 0, 7.6 + pulse * 1.8, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#f97316';
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(0, -6);
          ctx.lineTo(5.4, 0);
          ctx.lineTo(0, 6);
          ctx.lineTo(-5.4, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, 1.7, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (p.clamped) {
        // Off-radar standard enemy: luminous red directional edge-chevron pointing straight toward the hostile!
        ctx.save();
        ctx.rotate(p.angleRad);
        ctx.fillStyle = 'rgba(255, 59, 48, 0.32)';
        ctx.beginPath();
        ctx.arc(0, -1, 6.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff3b30';
        ctx.strokeStyle = '#03060c';
        ctx.lineWidth = 1.15;
        ctx.beginPath();
        ctx.moveTo(0, -6.5);
        ctx.lineTo(4.8, 2.8);
        ctx.lineTo(0, 0.6);
        ctx.lineTo(-4.8, 2.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fecaca';
        ctx.beginPath();
        ctx.arc(0, -1.6, 1.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // On-radar standard enemy: soft crimson glow halo + facing vision cone + high-contrast directional dart!
        const aura = ctx.createRadialGradient(0, 0, 1, 0, 0, 11.5);
        aura.addColorStop(0, e.firing ? 'rgba(255, 69, 58, 0.54)' : 'rgba(255, 59, 48, 0.38)');
        aura.addColorStop(1, 'rgba(255, 59, 48, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, 0, 11.5, 0, Math.PI * 2);
        ctx.fill();

        // Gunfire / active-alert ping ring
        if (e.firing || e.alerted) {
          const speed = e.firing ? 2.4 : 1.35;
          const ping = (t * speed + i * 0.37) % 1;
          ctx.strokeStyle = e.firing
            ? `rgba(255, 92, 84, ${(1 - ping) * 0.94})`
            : `rgba(255, 59, 48, ${(1 - ping) * 0.45})`;
          ctx.lineWidth = e.firing ? 1.55 : 1.1;
          ctx.beginPath();
          ctx.arc(0, 0, 5 + ping * (e.firing ? 10 : 6.5), 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.save();
        ctx.rotate(-(e.yaw - yaw));

        // Enemy directional vision / facing cone (Cyberpunk / Valorant tactical clarity!)
        const sightGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 17);
        sightGrad.addColorStop(0, 'rgba(255, 59, 48, 0.32)');
        sightGrad.addColorStop(1, 'rgba(255, 59, 48, 0)');
        ctx.fillStyle = sightGrad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 17, -Math.PI / 2 - 0.42, -Math.PI / 2 + 0.42);
        ctx.closePath();
        ctx.fill();

        // Razor-sharp crimson hostile directional chevron + bright core pip
        ctx.fillStyle = e.firing ? '#ff5a52' : '#ff3b30';
        ctx.strokeStyle = '#03060c';
        ctx.lineWidth = 1.35;
        ctx.beginPath();
        ctx.moveTo(0, -6.4);
        ctx.lineTo(5.1, 4.4);
        ctx.lineTo(0, 1.8);
        ctx.lineTo(-5.1, 4.4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffe4e6';
        ctx.beginPath();
        ctx.arc(0, -0.6, 1.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Crisp elevation caret (▲ above / ▼ below)
      if (!p.clamped && elev !== 'level') {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#03060c';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        if (elev === 'above') {
          ctx.moveTo(0, -12);
          ctx.lineTo(3.1, -8.2);
          ctx.lineTo(-3.1, -8.2);
        } else {
          ctx.moveTo(0, 12);
          ctx.lineTo(3.1, 8.2);
          ctx.lineTo(-3.1, 8.2);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }

    // 10. Center Player Operative Chevron with luminous cyan aura
    ctx.save();
    ctx.translate(HALF, HALF);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.26)';
    ctx.beginPath();
    ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.65;
    ctx.beginPath();
    ctx.moveTo(0, -8.2);
    ctx.lineTo(6.1, 5.5);
    ctx.lineTo(0, 2.3);
    ctx.lineTo(-6.1, 5.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 11. Subtle inner octagonal vignette shadow for glass optical depth
    const rimShadow = ctx.createRadialGradient(
      HALF,
      HALF,
      INNER_RADIUS - 16,
      HALF,
      HALF,
      INNER_RADIUS + 8
    );
    rimShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
    rimShadow.addColorStop(1, 'rgba(2, 5, 11, 0.56)');
    ctx.fillStyle = rimShadow;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // 12. Rotating Perimeter Cardinal Ring (N in luminous gold badge, subtle E/S/W pips)
    const cardinals: Array<{ label: string; worldAngle: number; gold?: boolean }> = [
      { label: 'N', worldAngle: 0, gold: true },
      { label: 'E', worldAngle: Math.PI / 2 },
      { label: 'S', worldAngle: Math.PI },
      { label: 'W', worldAngle: -Math.PI / 2 },
    ];
    ctx.save();
    ctx.font = '700 9.5px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const c of cardinals) {
      const a = c.worldAngle - yaw;
      const rx = HALF + Math.sin(a) * (INNER_RADIUS - 7);
      const ry = HALF - Math.cos(a) * (INNER_RADIUS - 7);
      if (c.gold) {
        ctx.fillStyle = 'rgba(6, 11, 20, 0.96)';
        ctx.beginPath();
        ctx.arc(rx, ry, 7.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.88)';
        ctx.lineWidth = 1.15;
        ctx.stroke();
        ctx.fillStyle = '#fbbf24';
      } else {
        ctx.fillStyle = 'rgba(186, 206, 228, 0.78)';
      }
      ctx.fillText(c.label, rx, ry + 0.5);
    }
    ctx.restore();

    // 13. Incoming-Fire Directional Threat Arc along outer radar rim
    if (hitArcAlpha > 0.02) {
      const arcAngle = -Math.PI / 2 + hitBearingRad;
      ctx.save();
      ctx.strokeStyle = `rgba(255, 59, 48, ${Math.min(0.96, hitArcAlpha)})`;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(HALF, HALF, INNER_RADIUS - 2, arcAngle - 0.55, arcAngle + 0.55);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }, [minimap, hitBearingRad, hitArcAlpha]);

  const ccReady = minimap.controlCenter.state === 'ready';
  const hitFlare = damagePulse > 0.08;
  const enemyCount = minimap.enemies.length;

  return (
    <div
      className="relative flex flex-col items-start select-none"
      data-testid="tactical-minimap"
    >
      {/* Chamfered Octagonal Radar Housing */}
      <div className="relative w-[208px] h-[208px]">
        <canvas
          ref={canvasRef}
          className="w-[208px] h-[208px] block"
          aria-label="Tactical Radar Minimap"
        />

        {/* Precision Machined Octagonal SVG Bezel */}
        <svg
          viewBox="0 0 208 208"
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        >
          <polygon
            points="31,6 177,6 202,31 202,177 177,202 31,202 6,177 6,31"
            fill="none"
            stroke="rgba(2, 6, 12, 0.94)"
            strokeWidth="4"
          />
          <polygon
            points="31,6 177,6 202,31 202,177 177,202 31,202 6,177 6,31"
            fill="none"
            stroke={
              hitFlare
                ? 'rgba(255, 59, 48, 0.95)'
                : ccReady
                  ? 'rgba(251, 191, 36, 0.86)'
                  : 'rgba(56, 189, 248, 0.6)'
            }
            strokeWidth="1.5"
          />
          {/* Top-center forward calibration pip */}
          <polygon
            points="104,1 108.5,7.5 99.5,7.5"
            fill={ccReady ? '#fbbf24' : '#38bdf8'}
          />
          {/* Machined corner rail brackets */}
          <path
            d="M 19 11.5 L 31 3.5 L 47 3.5 M 161 3.5 L 177 3.5 L 189 11.5 M 189 196.5 L 177 204.5 L 161 204.5 M 47 204.5 L 31 204.5 L 19 196.5"
            fill="none"
            stroke={hitFlare ? '#ff5a52' : ccReady ? '#fbbf24' : '#38bdf8'}
            strokeWidth="1.8"
            opacity="0.9"
          />
          {/* Precision edge micro-ticks */}
          <line x1="2.5" y1="104" x2="7.5" y2="104" stroke="#38bdf8" strokeWidth="1.3" opacity="0.72" />
          <line x1="200.5" y1="104" x2="205.5" y2="104" stroke="#38bdf8" strokeWidth="1.3" opacity="0.72" />
          <line x1="104" y1="200.5" x2="104" y2="205.5" stroke="#38bdf8" strokeWidth="1.3" opacity="0.72" />
        </svg>
      </div>

      {/* Minimal High-Contrast Sector Tag (zero duplicate degree readout!) */}
      <div
        className={`mt-1 flex items-center justify-between min-w-[208px] w-max px-2 py-1 border-l-2 ${
          ccReady ? 'border-amber-400' : 'border-cyan-400'
        }`}
        style={{
          background:
            'linear-gradient(90deg, rgba(5, 11, 20, 0.88) 0%, rgba(5, 11, 20, 0.68) 76%, rgba(5, 11, 20, 0.14) 100%)',
        }}
      >
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className={`font-[family-name:var(--font-display)] text-[10px] font-bold tracking-[0.14em] shrink-0 ${
              ccReady ? 'text-amber-300' : 'text-cyan-300'
            }`}
            data-testid="hud-floor"
          >
            FL 0{minimap.floorNumber}
          </span>
          <span className="text-slate-500 text-[9px]">·</span>
          <span className="font-[family-name:var(--font-display)] text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-100">
            {minimap.zoneName}
          </span>
        </div>

        {/* Clean live enemy radar pip count (or gold READY icon when cleared) */}
        {enemyCount > 0 ? (
          <div
            className="flex items-center gap-1 shrink-0 ml-2"
            data-testid="minimap-enemy-count"
          >
            <span className="w-1.5 h-1.5 rotate-45 bg-red-500 shadow-[0_0_6px_rgba(255,59,48,0.95)]" />
            <span className="font-[family-name:var(--font-mono)] text-[10px] font-bold text-red-300 tabular-nums">
              {enemyCount}
            </span>
          </div>
        ) : ccReady ? (
          <span className="w-2 h-2 rotate-45 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.95)] shrink-0 ml-2" />
        ) : null}
      </div>
    </div>
  );
}
