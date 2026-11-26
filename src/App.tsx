import { useEffect, useRef, useState } from 'react';
import { NightshadeEngine } from './game/NightshadeEngine';
import type { HudSnapshot, WeaponId } from './game/core/types';
import { TitleOverlay } from './components/TitleOverlay';
import { TacticalHud } from './components/TacticalHud';
import { PauseModal } from './components/PauseModal';

const INITIAL_HUD: HudSnapshot = {
  phase: 'title',
  activeWeapon: 'pistol',
  pistolAmmo: 18,
  pistolMaxAmmo: 18,
  pistolOvercharged: 0,
  pistolReloadPhase: 'idle',
  pistolReloadProgress: 0,
  pistolSweetSpotStart: 0.46,
  pistolSweetSpotEnd: 0.68,
  smgHeat: 0,
  smgOverheated: false,
  smgVenting: false,
  smgFlashCoolActive: false,
  heavyAmmo: 20,
  heavyMaxAmmo: 20,
  heavyReserveAmmo: 80,
  heavyMaxReserveAmmo: 120,
  heavyReloading: false,
  heavyReloadProgress: 0,
  reloadBanner: 'none',
  cameraShotPulse: 0,
  cameraHeavyPulse: 0,
  cameraHeatPulse: 0,
  cameraFrostPulse: 0,
  ads: false,
  combatReady: false,
  crouching: false,
  sprinting: false,
  shoulder: 'right',
  spreadPx: 10,
  hitMarkerTimer: 0,
  hitMarkerCritical: false,
  hitMarkerKill: false,
  pointerLocked: false,
  muted: false,
  hits: 0,
  criticalHits: 0,
  shotsFired: 0,
  streak: 0,
  bestStreak: 0,
  score: 0,
  targetsCleared: 0,
  floorNumber: 8,
  floorName: 'APEX TACTICAL PROVING COMPLEX',
  floorBannerText: null,
  interactPrompt: null,
  interactPromptLocked: false,
  controlCenterLocked: true,
  floorExitOpen: false,
  remainingHostilesTotal: 0,
  objectiveTitle: 'PROVING PROTOCOL',
  objectiveSubtext: 'COMPLETE HOLO-STATIONS OR [TAB] DEPLOY',
  objectiveAccent: 'cyan',
  objectiveWaypoint: null,
  cameraYaw: 0,
  playerHp: 100,
  playerMaxHp: 100,
  playerShieldIntegrity: 100,
  playerShieldGhost: 100,
  playerShieldRecharging: false,
  playerBarShake: 0,
  playerHitBearingRad: 0,
  playerHitArcAlpha: 0,
  playerHitsTaken: 0,
  playerDamagePulse: 0,
  playerDamageVignette: { front: 0, back: 0, left: 0, right: 0 },
  minimap: {
    floorNumber: 8,
    zoneName: 'OPS BRIEFING',
    playerX: 0,
    playerY: 98,
    playerZ: 45.5,
    cameraYaw: 0,
    characterYaw: 0,
    radarRangeMeters: 24,
    geometry: [],
    enemies: [],
    ammoCrates: [],
    controlCenter: { x: 6.6, y: 98, z: -11.8, state: 'disabled' },
    exitDoor: { x: 0, z: -17, open: false },
    objectiveTarget: null,
  },
  tutorial: {
    active: true,
    stepId: 'move_sprint',
    stepIndex: 1,
    totalSteps: 5,
    title: 'LOCOMOTION & SPRINT',
    instruction: 'Move into the Firing Hall and sprint with SHIFT',
    keyHint: 'WASD + SHIFT',
    subProgressText: 'MOVE · SPRINT',
  },
  floor08Encounter: {
    liveCombatActive: false,
    remainingNormal: 0,
    totalNormal: 0,
    remainingMiniBosses: 0,
    totalMiniBosses: 0,
    bossSpawned: false,
    bossDefeated: false,
    floorCleared: false,
    activeBossHud: null,
    weakpointIntel: null,
  },
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<NightshadeEngine | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    const engine = new NightshadeEngine(mountEl, (snapshot) => {
      setHud(snapshot);
    });
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#080B10]">
      <div
        ref={mountRef}
        data-testid="webgl-viewport"
        className="w-full h-full cursor-crosshair"
      />

      {hud.phase === 'title' && (
        <TitleOverlay onStart={() => engineRef.current?.start()} />
      )}

      {hud.phase === 'playing' && (
        <TacticalHud
          hud={hud}
          onToggleMute={() => engineRef.current?.setMuted(!hud.muted)}
          onPause={() => engineRef.current?.pause()}
          onSelectWeapon={(w: WeaponId) => engineRef.current?.selectWeapon(w)}
          onSkipTutorial={() => engineRef.current?.skipTutorial()}
        />
      )}

      {hud.phase === 'paused' && (
        <PauseModal
          hud={hud}
          onResume={() => engineRef.current?.resume()}
          onResetRange={() => engineRef.current?.resetRange()}
          onReturnTitle={() => engineRef.current?.returnToTitle()}
        />
      )}
    </main>
  );
}
