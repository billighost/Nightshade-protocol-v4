import type { MinimapRect } from './minimapMath';

export interface FogOfWarGrid {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  readonly cellSize: number;
  readonly cols: number;
  readonly rows: number;
  /** Visibility per cell: 0 = completely unexplored/obscured, 255 = fully revealed. */
  readonly cells: Uint8Array;
  /** Monotonic counter incremented whenever at least one cell increases in visibility. */
  version: number;
}

export interface FogRevealOptions {
  /** Radius (m) around operative cleared 360° smoothly. */
  ambientRadius?: number;
  /** Extended forward sight-cone reach (m) along cameraYaw. */
  visionConeRange?: number;
  /** Half-angle (rad) of the forward sight-cone. */
  visionHalfAngleRad?: number;
}

/**
 * Creates a compact world-space Fog of War grid covering any floor in the 8-floor hideout
 * (default: -64m..+64m at 2.0m resolution -> 64×64 = 4,096 bytes).
 */
export function createFogOfWarGrid(
  minX = -64,
  maxX = 64,
  minZ = -64,
  maxZ = 64,
  cellSize = 2.0
): FogOfWarGrid {
  const cols = Math.max(1, Math.ceil((maxX - minX) / cellSize));
  const rows = Math.max(1, Math.ceil((maxZ - minZ) / cellSize));
  return {
    minX,
    maxX: minX + cols * cellSize,
    minZ,
    maxZ: minZ + rows * cellSize,
    cellSize,
    cols,
    rows,
    cells: new Uint8Array(cols * rows),
    version: 1,
  };
}

/** Resets every cell back to unexplored (0). */
export function resetFogOfWarGrid(grid: FogOfWarGrid): void {
  grid.cells.fill(0);
  grid.version += 1;
}

/**
 * 2D slab ray-vs-AABB intersection check for segment (x0,z0) -> (x1,z1) strictly before t = 0.94.
 * Stopping slightly before t=1 ensures the wall face enclosing the player's current room IS revealed,
 * while rooms hidden BEHIND thick structural walls stay obscured until breached!
 */
function segmentBlockedByWalls(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  walls: readonly MinimapRect[]
): boolean {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const invDx = Math.abs(dx) > 1e-6 ? 1 / dx : 0;
  const invDz = Math.abs(dz) > 1e-6 ? 1 / dz : 0;
  const maxT = 0.92;

  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    if (w.kind !== 'wall') continue;

    // Slight shrink (0.14m) keeps thin doorways generous & reveals wall edges cleanly
    const minX = w.minX + 0.12;
    const maxX = w.maxX - 0.12;
    const minZ = w.minZ + 0.12;
    const maxZ = w.maxZ - 0.12;
    if (minX >= maxX || minZ >= maxZ) continue;

    let tmin = 0;
    let tmax = maxT;

    if (invDx !== 0) {
      let tx1 = (minX - x0) * invDx;
      let tx2 = (maxX - x0) * invDx;
      if (tx1 > tx2) {
        const tmp = tx1;
        tx1 = tx2;
        tx2 = tmp;
      }
      if (tx1 > tmin) tmin = tx1;
      if (tx2 < tmax) tmax = tx2;
      if (tmin > tmax) continue;
    } else if (x0 < minX || x0 > maxX) {
      continue;
    }

    if (invDz !== 0) {
      let tz1 = (minZ - z0) * invDz;
      let tz2 = (maxZ - z0) * invDz;
      if (tz1 > tz2) {
        const tmp = tz1;
        tz1 = tz2;
        tz2 = tmp;
      }
      if (tz1 > tmin) tmin = tz1;
      if (tz2 < tmax) tmax = tz2;
      if (tmin > tmax) continue;
    } else if (z0 < minZ || z0 > maxZ) {
      continue;
    }

    if (tmax >= 0.04 && tmin <= maxT) {
      return true;
    }
  }

  return false;
}

/**
 * Dynamically clears Fog of War around the operative's current position and along their forward
 * camera sight-cone, respecting solid structural walls so unvisited wings remain shrouded until seen!
 * Returns true if any cell increased in visibility.
 */
export function revealFogAt(
  grid: FogOfWarGrid,
  playerX: number,
  playerZ: number,
  cameraYaw: number,
  geometry: readonly MinimapRect[],
  opts?: FogRevealOptions
): boolean {
  const ambientRadius = opts?.ambientRadius ?? 10.5;
  const visionConeRange = opts?.visionConeRange ?? 21.0;
  const visionHalfAngleRad = opts?.visionHalfAngleRad ?? 0.68; // ~39° half-angle

  const maxR = Math.max(ambientRadius, visionConeRange);
  const minCol = Math.max(0, Math.floor((playerX - maxR - grid.minX) / grid.cellSize));
  const maxCol = Math.min(grid.cols - 1, Math.floor((playerX + maxR - grid.minX) / grid.cellSize));
  const minRow = Math.max(0, Math.floor((playerZ - maxR - grid.minZ) / grid.cellSize));
  const maxRow = Math.min(grid.rows - 1, Math.floor((playerZ + maxR - grid.minZ) / grid.cellSize));

  // Camera forward vector in Three.js world space: (-sin(yaw), -cos(yaw))
  const fwdX = -Math.sin(cameraYaw);
  const fwdZ = -Math.cos(cameraYaw);
  const cosConeOuter = Math.cos(visionHalfAngleRad);
  const cosConeInner = Math.cos(visionHalfAngleRad * 0.72);
  const ambientCore = ambientRadius * 0.68;
  const coneCore = visionConeRange * 0.72;

  let changed = false;

  for (let row = minRow; row <= maxRow; row++) {
    const cz = grid.minZ + (row + 0.5) * grid.cellSize;
    const dz = cz - playerZ;
    const rowOffset = row * grid.cols;

    for (let col = minCol; col <= maxCol; col++) {
      const idx = rowOffset + col;
      const prev = grid.cells[idx];
      if (prev === 255) continue;

      const cx = grid.minX + (col + 0.5) * grid.cellSize;
      const dx = cx - playerX;
      const distSq = dx * dx + dz * dz;
      if (distSq > maxR * maxR) continue;

      const dist = Math.sqrt(distSq);
      let candidate = 0;

      // 1. 360° proximity discovery bubble (smooth radial feather)
      if (dist <= ambientRadius) {
        if (dist <= ambientCore) {
          candidate = 1;
        } else {
          const t = (dist - ambientCore) / Math.max(0.01, ambientRadius - ambientCore);
          candidate = Math.max(candidate, 1 - t * t);
        }
      }

      // 2. Forward tactical vision cone along cameraYaw
      if (dist <= visionConeRange && dist > 0.25) {
        const dot = (dx * fwdX + dz * fwdZ) / dist;
        if (dot >= cosConeOuter) {
          const angWeight =
            dot >= cosConeInner
              ? 1
              : (dot - cosConeOuter) / Math.max(1e-4, cosConeInner - cosConeOuter);
          const distWeight =
            dist <= coneCore
              ? 1
              : 1 - Math.pow((dist - coneCore) / Math.max(0.01, visionConeRange - coneCore), 1.6);
          candidate = Math.max(candidate, angWeight * distWeight);
        }
      }

      if (candidate <= 0.04) continue;
      const nextVal = Math.min(255, Math.round(candidate * 255));
      if (nextVal <= prev) continue;

      // Always reveal immediate personal space (< 2.6m); check wall LOS beyond that!
      if (dist > 2.6 && segmentBlockedByWalls(playerX, playerZ, cx, cz, geometry)) {
        continue;
      }

      grid.cells[idx] = nextVal;
      changed = true;
    }
  }

  if (changed) {
    grid.version += 1;
  }
  return changed;
}

/** Samples normalized fog visibility [0 = obscured .. 1 = fully explored] at a world coordinate. */
export function sampleFogVisibility(grid: FogOfWarGrid, worldX: number, worldZ: number): number {
  const col = Math.floor((worldX - grid.minX) / grid.cellSize);
  const row = Math.floor((worldZ - grid.minZ) / grid.cellSize);
  if (col < 0 || col >= grid.cols || row < 0 || row >= grid.rows) return 0;
  return grid.cells[row * grid.cols + col] / 255;
}
