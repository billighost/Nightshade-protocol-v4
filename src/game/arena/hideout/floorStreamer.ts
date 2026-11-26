import { FLOOR_CATALOG, type FloorNumber } from './types';

export type DoorMotionState = 'locked' | 'opening' | 'open' | 'closing';

export type StreamerEventKind =
  | 'door_opening'
  | 'door_open'
  | 'door_closing'
  | 'door_sealed'
  | 'arrived_floor'
  | 'floor_unloaded'
  | 'tactical_door_open'
  | 'tactical_door_close'
  | 'tactical_door_jam'
  | 'bridge_deployed'
  | 'gate_opened'
  | 'jump_pad_launch';

export interface StreamerEvent {
  kind: StreamerEventKind;
  floor: FloorNumber;
  targetFloor?: FloorNumber;
  doorId?: string;
  mechanicId?: string;
  launchVy?: number;
  launchVx?: number;
  launchVz?: number;
}

export interface FloorThresholdSpec {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  maxY: number;
}

export const BULKHEAD_OPEN_DURATION_SEC = 2.2;
export const BULKHEAD_CLOSE_DURATION_SEC = 1.65;

const ALL_FLOORS: FloorNumber[] = [8, 7, 6, 5, 4, 3, 2, 1];

/**
 * Pure AAA Airlock / Portal Single-Floor Streaming State Machine.
 * - Steady State: ONLY `currentFloor` is active (`activeFloors.size === 1`). All other 7 floors are strictly culled!
 * - On-Demand Pre-Wake: Activating Floor N's Control Center opens Bulkhead N and immediately wakes Floor N-1
 *   (`activeFloors = {N, N-1}`) so there is ZERO pop-in or void behind the parting blast leaves.
 * - Auto-Seal & Unload: Crossing Floor N-1's entry threshold switches `currentFloor = N-1` and triggers Bulkhead N
 *   to auto-close. The exact frame Bulkhead N reaches `openRatio === 0`, Floor N is immediately culled/unloaded
 *   so ONLY Floor N-1 remains active!
 */
export class FloorStreamer {
  public currentFloor: FloorNumber = 8;
  public readonly activeFloors = new Set<FloorNumber>([8]);
  public readonly unlockedFloors = new Set<FloorNumber>([8]);
  public transitioningFrom: FloorNumber | null = null;
  public transitioningTo: FloorNumber | null = null;

  private readonly doorState = new Map<FloorNumber, DoorMotionState>();
  private readonly doorOpenRatio = new Map<FloorNumber, number>();
  private readonly thresholds = new Map<FloorNumber, FloorThresholdSpec>();
  private readonly pendingEvents: StreamerEvent[] = [];

  constructor(thresholds?: Partial<Record<FloorNumber, FloorThresholdSpec>>) {
    for (const f of ALL_FLOORS) {
      this.doorState.set(f, 'locked');
      this.doorOpenRatio.set(f, 0);
      if (thresholds?.[f]) {
        this.thresholds.set(f, thresholds[f]!);
      } else {
        const baseY = FLOOR_CATALOG[f].baseY;
        this.thresholds.set(f, {
          minX: -16.5,
          maxX: 16.5,
          minZ: -15.6,
          maxZ: 15.6,
          maxY: baseY + 4.8,
        });
      }
    }
  }

  public getDoorState(floor: FloorNumber): DoorMotionState {
    return this.doorState.get(floor) ?? 'locked';
  }

  public getDoorOpenRatio(floor: FloorNumber): number {
    return this.doorOpenRatio.get(floor) ?? 0;
  }

  public isFloorActive(floor: FloorNumber): boolean {
    return this.activeFloors.has(floor);
  }

  public getActiveFloorList(): FloorNumber[] {
    const list: FloorNumber[] = [];
    for (const f of ALL_FLOORS) {
      if (this.activeFloors.has(f)) list.push(f);
    }
    return list;
  }

  /**
   * Called when the player activates Floor `floor`'s Control Center (`[E]`).
   * Pre-wakes the destination floor (`floor - 1`) immediately BEFORE the blast leaves begin parting!
   */
  public activateFloorControl(floor: FloorNumber): boolean {
    const state = this.getDoorState(floor);
    if (state === 'opening' || state === 'open') return false;

    this.doorState.set(floor, 'opening');

    if (floor > 1) {
      const nextFloor = (floor - 1) as FloorNumber;
      // Pre-wake destination floor immediately so zero void is visible behind the opening door!
      this.activeFloors.add(nextFloor);
      this.unlockedFloors.add(nextFloor);
      this.transitioningFrom = floor;
      this.transitioningTo = nextFloor;
      this.pendingEvents.push({ kind: 'door_opening', floor, targetFloor: nextFloor });
    } else {
      // Floor 1 opens the colossal Final Core Vault Door into the Inner Sanctum (same floor!)
      this.pendingEvents.push({ kind: 'door_opening', floor });
    }
    return true;
  }

  /**
   * Instant floor warp (used by Express Return Lift & QA `teleportToFloor`).
   * Ensures strict single-floor active state immediately!
   */
  public teleportToFloor(targetFloor: FloorNumber): void {
    this.currentFloor = targetFloor;
    this.unlockedFloors.add(targetFloor);
    this.transitioningFrom = null;
    this.transitioningTo = null;

    this.activeFloors.clear();
    this.activeFloors.add(targetFloor);

    for (const f of ALL_FLOORS) {
      this.doorState.set(f, 'locked');
      this.doorOpenRatio.set(f, 0);
    }

    this.pendingEvents.push({ kind: 'arrived_floor', floor: targetFloor });
  }

  /**
   * Resets streamer to initial Floor 8 steady state.
   */
  public reset(): void {
    this.unlockedFloors.clear();
    this.unlockedFloors.add(8);
    this.teleportToFloor(8);
    this.pendingEvents.length = 0;
  }

  /**
   * Advances door animations, checks entry threshold on destination floor, and auto-seals/unloads former floor.
   * Returns a slice of events emitted during this frame.
   */
  public step(dt: number, playerX: number, playerY: number, playerZ: number): StreamerEvent[] {
    const clampedDt = Math.max(0, Math.min(dt, 0.05));

    // 1. Check if player has crossed the destination floor's entry threshold
    if (this.transitioningTo !== null && this.transitioningFrom !== null) {
      const dest = this.transitioningTo;
      const from = this.transitioningFrom;
      const th = this.thresholds.get(dest);
      const destBaseY = FLOOR_CATALOG[dest].baseY;
      if (
        th &&
        playerX >= th.minX &&
        playerX <= th.maxX &&
        playerZ >= th.minZ &&
        playerZ <= th.maxZ &&
        playerY >= destBaseY - 2.5 &&
        playerY <= th.maxY
      ) {
        this.currentFloor = dest;
        this.transitioningTo = null;
        // Keep `transitioningFrom` set until its bulkhead door finishes sealing shut!
        this.doorState.set(from, 'closing');
        this.pendingEvents.push({ kind: 'arrived_floor', floor: dest });
        this.pendingEvents.push({ kind: 'door_closing', floor: from });
      }
    }

    // 2. Step door open/close animation ratios
    for (const f of ALL_FLOORS) {
      const st = this.doorState.get(f);
      if (st === 'opening') {
        const nextRatio = Math.min(1, (this.doorOpenRatio.get(f) ?? 0) + clampedDt / BULKHEAD_OPEN_DURATION_SEC);
        this.doorOpenRatio.set(f, nextRatio);
        if (nextRatio >= 1) {
          this.doorState.set(f, 'open');
          this.pendingEvents.push({ kind: 'door_open', floor: f });
        }
      } else if (st === 'closing') {
        const nextRatio = Math.max(0, (this.doorOpenRatio.get(f) ?? 0) - clampedDt / BULKHEAD_CLOSE_DURATION_SEC);
        this.doorOpenRatio.set(f, nextRatio);
        if (nextRatio <= 0) {
          this.doorState.set(f, 'locked');
          this.pendingEvents.push({ kind: 'door_sealed', floor: f });

          // The exact moment the airlock door seals behind the player, unload the former floor!
          if (this.transitioningFrom === f && this.currentFloor !== f) {
            this.activeFloors.delete(f);
            this.transitioningFrom = null;
            this.pendingEvents.push({ kind: 'floor_unloaded', floor: f });
          }
        }
      }
    }

    if (this.pendingEvents.length === 0) return [];
    const emitted = this.pendingEvents.slice();
    this.pendingEvents.length = 0;
    return emitted;
  }
}
