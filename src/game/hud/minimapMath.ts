import type { ColliderBox3D, WalkableRamp, WalkableSlab } from '../arena/hideout/types';
import type { FogOfWarGrid } from './fogOfWar';

export interface MinimapRect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  kind: 'floor' | 'wall' | 'cover' | 'elevated' | 'ramp' | 'door';
}

export interface MinimapEnemyBlip {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  tier: 'normal' | 'miniboss' | 'boss';
  alerted: boolean;
  firing: boolean;
}

export interface MinimapMarker {
  x: number;
  y: number;
  z: number;
  state: 'disabled' | 'ready' | 'activated';
}

export interface MinimapSnapshot {
  floorNumber: number;
  zoneName: string;
  playerX: number;
  playerY: number;
  playerZ: number;
  cameraYaw: number;
  characterYaw: number;
  radarRangeMeters: number;
  geometry: readonly MinimapRect[];
  fog?: FogOfWarGrid;
  enemies: readonly MinimapEnemyBlip[];
  ammoCrates: ReadonlyArray<{ x: number; z: number }>;
  controlCenter: MinimapMarker;
  exitDoor: { x: number; z: number; open: boolean };
  objectiveTarget: { x: number; z: number; kind: 'hostile' | 'boss' | 'control_center' | 'exit' } | null;
}

export interface ObjectiveWaypointSnapshot {
  /** Normalized screen coords [0..1] */
  screenX: number;
  screenY: number;
  onScreen: boolean;
  /** Angle in radians for off-screen edge chevron (0 = right, +PI/2 = down) */
  edgeAngleRad: number;
  distanceMeters: number;
  label: string;
  sublabel: string;
  accent: 'cyan' | 'amber' | 'crimson';
  kind: 'control_center' | 'exit' | 'boss' | 'miniboss' | 'hostile';
}

export interface RadarProjectionResult {
  /** Radar-local normalized offset [-1..1] where +X is right of player and -Y is straight ahead */
  rx: number;
  ry: number;
  /** True if point was clamped to outer radar circumference */
  clamped: boolean;
  /** Bearing angle in canvas space (0 = up, +PI/2 = right) */
  angleRad: number;
  distanceMeters: number;
}

/**
 * Transforms a world (x, z) coordinate into player-heading-up radar coordinates!
 * Camera forward vector in Three.js world space: fwd = (-sin(cameraYaw), -cos(cameraYaw)).
 * Camera right vector in Three.js world space: right = (cos(cameraYaw), -sin(cameraYaw)).
 */
export function worldToRadarLocal(
  worldX: number,
  worldZ: number,
  playerX: number,
  playerZ: number,
  cameraYaw: number,
  radarRangeMeters: number,
  clampRadius = 0.92
): RadarProjectionResult {
  const dx = worldX - playerX;
  const dz = worldZ - playerZ;
  const dist = Math.hypot(dx, dz);

  const fwdX = -Math.sin(cameraYaw);
  const fwdZ = -Math.cos(cameraYaw);
  const rightX = Math.cos(cameraYaw);
  const rightZ = -Math.sin(cameraYaw);

  // localRight > 0 => right on radar (+X); localFwd > 0 => UP on radar (-Y)
  const localRight = dx * rightX + dz * rightZ;
  const localFwd = dx * fwdX + dz * fwdZ;

  const invRange = 1 / Math.max(1, radarRangeMeters);
  let rx = localRight * invRange;
  let ry = -localFwd * invRange;
  const normLen = Math.hypot(rx, ry);
  let clamped = false;

  if (normLen > clampRadius) {
    const scale = clampRadius / normLen;
    rx *= scale;
    ry *= scale;
    clamped = true;
  }

  return {
    rx,
    ry,
    clamped,
    angleRad: Math.atan2(localRight, localFwd),
    distanceMeters: dist,
  };
}

export type ElevationBand = 'above' | 'level' | 'below';

export function classifyElevationDelta(targetY: number, playerY: number, threshold = 1.6): ElevationBand {
  const dy = targetY - playerY;
  if (dy >= threshold) return 'above';
  if (dy <= -threshold) return 'below';
  return 'level';
}

/**
 * Converts cameraYaw (where yaw=0 faces North/-Z, yaw=-PI/2 faces East/+X) into compass degrees [0..360).
 */
export function cameraYawToCompassDegrees(cameraYaw: number): number {
  const deg = ((-cameraYaw * 180) / Math.PI) % 360;
  return (deg + 360) % 360;
}

/**
 * Extracts crisp, simplified architectural rectangles (walkable floor rooms, walls, low cover, elevated catwalks, ramps)
 * from a floor's 3D collision geometry once per floor for zero-GC 60fps minimap rendering.
 */
export function extractFloorMinimapGeometry(
  baseY: number,
  boxes: readonly ColliderBox3D[],
  slabs: readonly WalkableSlab[],
  ramps: readonly WalkableRamp[]
): MinimapRect[] {
  const rects: MinimapRect[] = [];

  for (let i = 0; i < slabs.length; i++) {
    const s = slabs[i];
    if (s.active === false) continue;
    if (s.y >= baseY - 3.0 && s.y < baseY + 1.4) {
      // Base walkable interior floor footprint (includes Floor 06 sunken trench)
      rects.push({
        minX: s.minX,
        maxX: s.maxX,
        minZ: s.minZ,
        maxZ: s.maxZ,
        kind: 'floor',
      });
    } else if (s.y >= baseY + 1.4 && s.y <= baseY + 10.5) {
      rects.push({
        minX: s.minX,
        maxX: s.maxX,
        minZ: s.minZ,
        maxZ: s.maxZ,
        kind: 'elevated',
      });
    }
  }

  for (let i = 0; i < ramps.length; i++) {
    const r = ramps[i];
    const minY = Math.min(r.yStart, r.yEnd);
    if (minY >= baseY - 2 && minY <= baseY + 10) {
      rects.push({
        minX: r.minX,
        maxX: r.maxX,
        minZ: r.minZ,
        maxZ: r.maxZ,
        kind: 'ramp',
      });
    }
  }

  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (b.active === false) continue;
    // Only include geometry on this floor's elevation band (skip ceilings & huge solid floor plates)
    if (b.minY > baseY + 6.0 || b.maxY < baseY + 0.35) continue;
    const width = b.maxX - b.minX;
    const depth = b.maxZ - b.minZ;
    if (width <= 0.1 || depth <= 0.1) continue;
    if (width > 34 && depth > 34) continue; // outer floor slab

    const heightAboveBase = b.maxY - baseY;
    if (b.tag === 'bulkhead_door' || b.tag === 'tactical_door' || b.tag === 'security_gate') {
      rects.push({ minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ, kind: 'door' });
    } else if (heightAboveBase >= 2.25) {
      rects.push({ minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ, kind: 'wall' });
    } else if (heightAboveBase >= 0.55) {
      rects.push({ minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ, kind: 'cover' });
    }
  }

  return rects;
}

/**
 * Spatial sector naming for Floor 08 (and clean fallback for Floors 01-07) displayed on the minimap collar.
 */
export function resolveSectorName(floorNumber: number, x: number, z: number, fallbackFloorName: string): string {
  if (floorNumber === 5) {
    if (x <= -18 && z <= -10) return 'NW ORBITAL ARRAY';
    if (x >= 18 && z <= -10) return 'NE WAR-COUNCIL';
    if (x <= -18 && z >= 10) return 'SW REACTOR GALLERY';
    if (x >= 18 && z >= 10) return 'SE ORDNANCE DEPOT';
    if (x <= -18) return 'WEST SIM-DECK';
    if (x >= 18) return 'EAST MECH-BAY';
    if (z <= -10.4) return 'NORTH ARRIVAL';
    if (z >= 10.4) return 'SOUTH EXTRACTION';
    return 'WAR-PIT COLISEUM';
  }
  if (floorNumber === 6) {
    if (x <= -18 && z >= 14) return 'SW ARMORY BUNKER';
    if (x <= -18 && z <= -8) return 'NW CRYO VAULT';
    if (x <= -18) return 'BLACK-SITE LABS';
    if (x >= 18 && z <= -8) return 'NE GRAV-CORE';
    if (x >= 18) return 'BALLISTIC FOUNDRY';
    if (z >= 9.6) return 'SOUTH ARRIVAL';
    if (z <= -9.6) return 'NORTH EXTRACTION';
    return 'MONOLITH CATHEDRAL';
  }
  if (floorNumber === 7) {
    if (x <= -16 && z <= 10) return 'WEST BARRACKS';
    if (x <= -16 && z > 10) return 'SW CARGO BAY';
    if (x >= 16 && z <= 10) return 'EAST SERVERS';
    if (x >= 16 && z > 10) return 'SE TURBINE HALL';
    if (z <= -13) return 'NORTH CHECKPOINT';
    if (z >= 10.5) return 'SOUTH EXTRACTION';
    return 'SPIRAL ROTUNDA';
  }
  if (floorNumber !== 8) {
    return fallbackFloorName.split(' ')[0] + ' ' + (fallbackFloorName.split(' ')[1] ?? '');
  }
  if (z >= 36.5) return 'OPS BRIEFING';
  if (z <= -2.5) return 'NORTH ATRIUM';
  if (x <= -14.8) return 'CQB KILLHOUSE';
  if (x >= 14.8) return 'TACTICAL ARMORY';
  return 'MAIN FIRING HALL';
}
