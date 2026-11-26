import * as THREE from 'three';
import type { FloorNumber } from '../arena/hideout/types';
import type { GamePhase, WeaponId } from '../core/types';

/**
 * Pure key parser for the dev-testing instant floor teleport shortcut (`Ctrl + 1..8`).
 * Supports both top-row `Digit1..Digit8` and `Numpad1..Numpad8`.
 */
export function resolveDevFloorWarpKey(code: string, ctrlKey: boolean): FloorNumber | null {
  if (!ctrlKey) return null;
  const match = /^(?:Digit|Numpad)([1-8])$/.exec(code);
  if (!match) return null;
  return Number(match[1]) as FloorNumber;
}

/**
 * Pure key parser for weapon switching hotkeys (`1`, `2`, `3`).
 * Deliberately suppressed while `ctrlKey` is held so `Ctrl + 1..3` warps floors cleanly
 * without accidentally swapping weapons.
 */
export function resolveWeaponHotkey(code: string, ctrlKey: boolean): WeaponId | null {
  if (ctrlKey) return null;
  if (code === 'Digit1') return 'pistol';
  if (code === 'Digit2') return 'smg';
  if (code === 'Digit3') return 'heavy';
  return null;
}

export interface InputControllerCallbacks {
  getPhase: () => GamePhase;
  getActiveWeapon: () => WeaponId;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onToggleMute: () => void;
  onToggleShoulder: () => void;
  onInteract: () => void;
  onSelectWeapon: (weapon: WeaponId) => void;
  onWarpToFloor: (floor: FloorNumber) => void;
  onLookDelta: (dYaw: number, dPitch: number) => void;
  onAudioUnlock: () => void;
  onHudDirty: () => void;
  onSkipTutorial?: () => void;
}

/**
 * Unified keyboard, mouse, pointer-lock, and dev-shortcut (`Ctrl + 1..8`) controller.
 */
export class EngineInputController {
  public readonly keysHeld = new Set<string>();
  public fireHeld = false;
  public fireJustPressed = false;
  public adsHeld = false;
  public reloadJustPressed = false;
  public jumpJustPressed = false;
  public rollJustPressed = false;
  public pointerLocked = false;

  private isDraggingLook = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  private readonly domElement: HTMLCanvasElement;
  private readonly cb: InputControllerCallbacks;

  constructor(domElement: HTMLCanvasElement, callbacks: InputControllerCallbacks) {
    this.domElement = domElement;
    this.cb = callbacks;
  }

  public bind(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('wheel', this.onWheel, { passive: true });
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    this.domElement.addEventListener('mousedown', this.onCanvasMouseDown);
    this.domElement.addEventListener('contextmenu', this.onContextMenu);
    this.domElement.addEventListener('webglcontextlost', this.onContextLost);
  }

  public unbind(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('wheel', this.onWheel);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);

    this.domElement.removeEventListener('mousedown', this.onCanvasMouseDown);
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);
    this.domElement.removeEventListener('webglcontextlost', this.onContextLost);
  }

  public clearInputs(): void {
    this.keysHeld.clear();
    this.fireHeld = false;
    this.adsHeld = false;
    this.isDraggingLook = false;
  }

  public consumeOneShotFlags(): void {
    this.fireJustPressed = false;
    this.reloadJustPressed = false;
    this.jumpJustPressed = false;
    this.rollJustPressed = false;
  }

  public setHeldKeys(codes: string[]): void {
    this.keysHeld.clear();
    for (const c of codes) this.keysHeld.add(c);
  }

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private onContextLost = (e: Event): void => {
    e.preventDefault();
  };

  private onPointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.domElement;
    this.cb.onHudDirty();
  };

  private onWindowBlur = (): void => {
    this.clearInputs();
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) this.clearInputs();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const code = e.code;
    const phase = this.cb.getPhase();

    // Instant dev/testing floor teleport (`Ctrl + 1..8`) works in active gameplay!
    const warpFloor = resolveDevFloorWarpKey(code, e.ctrlKey);
    if (warpFloor !== null && phase === 'playing') {
      e.preventDefault();
      this.keysHeld.delete('ControlLeft');
      this.keysHeld.delete('ControlRight');
      this.cb.onWarpToFloor(warpFloor);
      return;
    }

    if (phase === 'title') {
      if (code === 'Enter' || code === 'Space') {
        e.preventDefault();
        this.cb.onStart();
      }
      return;
    }

    if (code === 'Escape' || code === 'KeyP') {
      if (phase === 'playing') {
        e.preventDefault();
        this.cb.onPause();
      } else if (phase === 'paused') {
        e.preventDefault();
        this.cb.onResume();
      }
      return;
    }

    if (code === 'KeyM') {
      this.cb.onToggleMute();
      return;
    }

    if (phase !== 'playing') return;

    if (!this.keysHeld.has(code)) {
      if (code === 'KeyR') this.reloadJustPressed = true;
      if (code === 'Space') {
        e.preventDefault();
        if (this.keysHeld.has('ShiftLeft') || this.keysHeld.has('ShiftRight')) {
          this.rollJustPressed = true;
        } else {
          this.jumpJustPressed = true;
        }
      }
      if (code === 'KeyV' || code === 'AltLeft') this.rollJustPressed = true;
      if (code === 'KeyQ') {
        this.cb.onToggleShoulder();
      }
      if (code === 'KeyE') {
        this.cb.onInteract();
      }
      if (code === 'Tab' && this.cb.onSkipTutorial) {
        e.preventDefault();
        this.cb.onSkipTutorial();
      }
      const weaponHotkey = resolveWeaponHotkey(code, e.ctrlKey);
      if (weaponHotkey) {
        this.cb.onSelectWeapon(weaponHotkey);
      }
    }

    this.keysHeld.add(code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysHeld.delete(e.code);
  };

  private onCanvasMouseDown = (e: MouseEvent): void => {
    if (this.cb.getPhase() !== 'playing') return;
    this.cb.onAudioUnlock();

    if (e.button === 0) {
      this.fireHeld = true;
      this.fireJustPressed = true;
      this.isDraggingLook = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;

      if (!this.pointerLocked && document.pointerLockElement === null) {
        try {
          const req = this.domElement.requestPointerLock?.() as unknown as Promise<void> | undefined;
          if (req && typeof req.catch === 'function') req.catch(() => {});
        } catch {
          // Drag fallback works smoothly in sandboxed iframes
        }
      }
    } else if (e.button === 2) {
      this.adsHeld = true;
      this.cb.onHudDirty();
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.fireHeld = false;
      this.isDraggingLook = false;
    } else if (e.button === 2) {
      this.adsHeld = false;
      this.cb.onHudDirty();
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (this.cb.getPhase() !== 'playing') return;

    const sensitivity = this.adsHeld ? 0.0017 : 0.0028;
    if (this.pointerLocked) {
      if (Math.abs(e.movementX) > 160 || Math.abs(e.movementY) > 160) return;
      const mx = THREE.MathUtils.clamp(e.movementX, -80, 80);
      const my = THREE.MathUtils.clamp(e.movementY, -80, 80);
      this.cb.onLookDelta(-mx * sensitivity, -my * sensitivity);
    } else if (this.isDraggingLook) {
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.cb.onLookDelta(-dx * sensitivity * 1.4, -dy * sensitivity * 1.4);
    }
  };

  private onWheel = (e: WheelEvent): void => {
    if (this.cb.getPhase() !== 'playing') return;
    if (Math.abs(e.deltaY) < 4) return;
    const order: WeaponId[] = ['pistol', 'smg', 'heavy'];
    const idx = order.indexOf(this.cb.getActiveWeapon());
    const dir = e.deltaY > 0 ? 1 : -1;
    const next = order[(idx + dir + order.length) % order.length];
    this.cb.onSelectWeapon(next);
  };
}
