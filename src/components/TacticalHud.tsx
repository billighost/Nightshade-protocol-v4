import { Pause, Volume2, VolumeX } from 'lucide-react';
import type { HudSnapshot, WeaponId } from '../game/core/types';
import { TacticalMinimap } from './TacticalMinimap';
import { FloorClearedBanner } from './hud/FloorClearedBanner';
import { ObjectiveWaypoint } from './hud/ObjectiveWaypoint';
import { TacticalCompass } from './hud/TacticalCompass';
import { VitalityBar } from './hud/VitalityBar';
import { WeaponArsenalHud } from './hud/WeaponArsenalHud';

interface TacticalHudProps {
  hud: HudSnapshot;
  onToggleMute: () => void;
  onPause: () => void;
  onSelectWeapon: (weapon: WeaponId) => void;
  onSkipTutorial: () => void;
}

const BANNER_COPY: Record<
  HudSnapshot['reloadBanner'],
  { label: string; colorClass: string } | null
> = {
  none: null,
  perfect_reload: {
    label: 'ACTIVE RELOAD PERFECT · +3 OVERCHARGED',
    colorClass: 'text-cyan-300',
  },
  jammed: {
    label: 'RELOAD JAM · CLEARING SLIDE',
    colorClass: 'text-amber-400',
  },
  flash_cool: {
    label: 'FLASH-COOL PURGE · RPM SURGE',
    colorClass: 'text-cyan-300',
  },
  overheated: {
    label: 'THERMAL LOCKOUT · STEAM PURGE',
    colorClass: 'text-red-400',
  },
  ammo_pickup: {
    label: '+40 .50 HV AMMO · CRATE RESUPPLY',
    colorClass: 'text-amber-300',
  },
  no_heavy_ammo: {
    label: 'OUT OF .50 HV AMMO · LOOT SUPPLY CRATE',
    colorClass: 'text-red-400',
  },
};

export function TacticalHud({
  hud,
  onToggleMute,
  onPause,
  onSelectWeapon,
  onSkipTutorial,
}: TacticalHudProps) {
  const banner = BANNER_COPY[hud.reloadBanner];
  const isPistol = hud.activeWeapon === 'pistol';
  const isSmg = hud.activeWeapon === 'smg';
  const isHeavy = hud.activeWeapon === 'heavy';
  const showPistolReload = isPistol && hud.pistolReloadPhase !== 'idle';
  const showHeavyReload = isHeavy && hud.heavyReloading;
  const smgHot = hud.smgHeat >= 65;
  const smgCritical = hud.smgHeat >= 90 || hud.smgOverheated;

  // CoD Screen-Space Optical Camera Effect opacities
  const shotRimOpacity = Math.min(0.54, hud.cameraShotPulse * 0.26 + hud.cameraHeavyPulse * 0.4);
  const heatEdgeOpacity = Math.min(0.62, hud.cameraHeatPulse * 0.56);
  const frostEdgeOpacity = Math.min(0.44, hud.cameraFrostPulse * 0.4);

  const isBannerAlert =
    hud.floorBannerText?.includes('DISABLED') || hud.floorBannerText?.includes('VANQUISHED FIRST');
  const isBannerCleared =
    hud.floorBannerText?.includes('ACTIVATE CONTROL CENTER') ||
    hud.floorBannerText?.includes('UNSEALED');

  const objAccentBar =
    hud.objectiveAccent === 'amber'
      ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.85)]'
      : hud.objectiveAccent === 'crimson'
        ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
        : 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]';

  const objAccentText =
    hud.objectiveAccent === 'amber'
      ? 'text-amber-300'
      : hud.objectiveAccent === 'crimson'
        ? 'text-red-300'
        : 'text-cyan-300';

  return (
    <div
      className="fixed inset-0 z-10 pointer-events-none select-none"
      data-testid="tactical-hud"
    >
      {/* CoD OPTICAL CAMERA OVERLAYS */}
      {shotRimOpacity > 0.01 && (
        <div
          className="fixed inset-0 pointer-events-none transition-none"
          data-testid="camera-shot-optical"
          style={{
            opacity: shotRimOpacity,
            background:
              hud.cameraHeavyPulse > 0.15
                ? 'radial-gradient(circle at 54% 58%, rgba(255,214,130,0) 44%, rgba(245,158,11,0.2) 82%, rgba(180,83,9,0.4) 100%)'
                : 'radial-gradient(circle at 52% 56%, rgba(255,230,170,0) 58%, rgba(251,191,36,0.15) 100%)',
          }}
        />
      )}

      {heatEdgeOpacity > 0.01 && (
        <div
          className="fixed inset-0 pointer-events-none transition-none"
          data-testid="camera-heat-optical"
          style={{
            opacity: heatEdgeOpacity,
            background:
              'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 48%, rgba(234,88,12,0.24) 80%, rgba(220,38,38,0.52) 100%)',
          }}
        />
      )}

      {frostEdgeOpacity > 0.01 && (
        <div
          className="fixed inset-0 pointer-events-none transition-none"
          style={{
            opacity: frostEdgeOpacity,
            background:
              'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 52%, rgba(56,189,248,0.26) 88%, rgba(186,230,253,0.4) 100%)',
          }}
        />
      )}

      {/* DIRECTIONAL RED/AMBER DAMAGE VIGNETTE FLASH */}
      {hud.playerDamagePulse > 0.01 && (
        <div
          className="fixed inset-0 pointer-events-none transition-none"
          data-testid="player-damage-vignette"
        >
          <div
            className="fixed inset-0"
            style={{
              opacity: Math.min(0.8, hud.playerDamagePulse * 0.72),
              background:
                'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 48%, rgba(220,38,38,0.34) 82%, rgba(185,28,28,0.68) 100%)',
            }}
          />
          {hud.playerDamageVignette.front > 0.04 && (
            <div
              className="fixed top-0 inset-x-0 h-20"
              style={{
                opacity: hud.playerDamageVignette.front * 0.85,
                background:
                  'linear-gradient(to bottom, rgba(239,68,68,0.72), rgba(245,158,11,0.22) 55%, rgba(0,0,0,0))',
              }}
            />
          )}
          {hud.playerDamageVignette.back > 0.04 && (
            <div
              className="fixed bottom-0 inset-x-0 h-20"
              style={{
                opacity: hud.playerDamageVignette.back * 0.85,
                background:
                  'linear-gradient(to top, rgba(239,68,68,0.72), rgba(245,158,11,0.22) 55%, rgba(0,0,0,0))',
              }}
            />
          )}
          {hud.playerDamageVignette.left > 0.04 && (
            <div
              className="fixed inset-y-0 left-0 w-24"
              style={{
                opacity: hud.playerDamageVignette.left * 0.85,
                background:
                  'linear-gradient(to right, rgba(239,68,68,0.74), rgba(245,158,11,0.22) 55%, rgba(0,0,0,0))',
              }}
            />
          )}
          {hud.playerDamageVignette.right > 0.04 && (
            <div
              className="fixed inset-y-0 right-0 w-24"
              style={{
                opacity: hud.playerDamageVignette.right * 0.85,
                background:
                  'linear-gradient(to left, rgba(239,68,68,0.74), rgba(245,158,11,0.22) 55%, rgba(0,0,0,0))',
              }}
            />
          )}
        </div>
      )}

      {/* 3D-TO-2D PROJECTED DIEGETIC OBJECTIVE WAYPOINT (Halo / BOTW / COD) */}
      <ObjectiveWaypoint waypoint={hud.objectiveWaypoint} />

      {/* TOP-LEFT: Flagship Architectural Minimap + Unboxed Active Objective Readout */}
      <div className="fixed top-4 left-5 flex flex-col items-start gap-2.5">
        <TacticalMinimap
          minimap={hud.minimap}
          hitBearingRad={hud.playerHitBearingRad}
          hitArcAlpha={hud.playerHitArcAlpha}
          damagePulse={hud.playerDamagePulse}
        />

        {/* Clean Unboxed Mission Objective Line */}
        <div
          className="flex items-start gap-2 pl-2 pr-3 py-1 w-[216px]"
          data-testid="hud-floor08-threats"
          style={{
            background:
              'linear-gradient(90deg, rgba(5, 11, 20, 0.78) 0%, rgba(5, 11, 20, 0.44) 72%, rgba(5, 11, 20, 0) 100%)',
          }}
        >
          <div className={`mt-[4px] w-2 h-2 rotate-45 shrink-0 ${objAccentBar}`} />
          <div className="flex flex-col leading-tight">
            <span
              className={`font-[family-name:var(--font-display)] text-[11px] font-bold uppercase tracking-[0.14em] ${objAccentText}`}
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.98)' }}
            >
              {hud.objectiveTitle}
            </span>
            <span
              className="font-[family-name:var(--font-mono)] text-[9px] font-medium uppercase tracking-[0.11em] text-slate-200/95 mt-0.5"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.98)' }}
            >
              {hud.objectiveSubtext}
            </span>
          </div>
        </div>
      </div>

      {/* TOP-CENTER: Floating COD/BOTW Compass Tape + Sculpted Angled Boss Bar + Cinematic Banner */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 max-w-[min(560px,56vw)]">
        <TacticalCompass cameraYaw={hud.cameraYaw} minimap={hud.minimap} />

        {/* Sculpted Halo/Souls Angled Boss Health Bar (no bulky web card!) */}
        {((hud.floorNumber === 8 && !hud.tutorial.active) ||
          hud.floorNumber === 7 ||
          hud.floorNumber === 6 ||
          hud.floorNumber === 5) &&
          hud.floor08Encounter.activeBossHud && (
            <div
              className="w-[min(460px,46vw)] flex flex-col gap-1 mt-0.5"
              data-testid="boss-hud"
            >
              <div className="flex items-baseline justify-between gap-3 px-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-2 h-2 rotate-45 shrink-0 ${
                      hud.floor08Encounter.activeBossHud.tier === 'boss'
                        ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]'
                        : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.85)]'
                    }`}
                  />
                  <span
                    className={`font-[family-name:var(--font-display)] text-[13px] font-bold tracking-[0.18em] uppercase truncate ${
                      hud.floor08Encounter.activeBossHud.tier === 'boss'
                        ? 'text-amber-300'
                        : 'text-red-300'
                    }`}
                    style={{ textShadow: '0 2px 10px rgba(0,0,0,0.96)' }}
                  >
                    {hud.floor08Encounter.activeBossHud.name}
                  </span>
                </div>
                <span
                  className="font-[family-name:var(--font-mono)] text-[10px] font-bold tracking-[0.16em] text-slate-100 shrink-0 uppercase"
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.96)' }}
                >
                  {hud.floor08Encounter.activeBossHud.staggered
                    ? 'STAGGERED'
                    : hud.floor08Encounter.activeBossHud.weakpointExposed
                      ? 'WEAKPOINT OPEN'
                      : hud.floor08Encounter.activeBossHud.tier === 'boss'
                        ? `PHASE ${hud.floor08Encounter.activeBossHud.phase}`
                        : `${hud.floor08Encounter.activeBossHud.hp}/${hud.floor08Encounter.activeBossHud.maxHp}`}
                </span>
              </div>

              <div
                className="relative w-full h-[10px] overflow-hidden"
                style={{
                  transform: 'skewX(-18deg)',
                  background: 'rgba(6, 10, 18, 0.88)',
                  border:
                    hud.floor08Encounter.activeBossHud.tier === 'boss'
                      ? '1px solid rgba(251, 191, 36, 0.58)'
                      : '1px solid rgba(248, 113, 113, 0.52)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.75)',
                }}
              >
                <div
                  className="h-full transition-none"
                  style={{
                    width: `${hud.floor08Encounter.activeBossHud.hpRatio * 100}%`,
                    background: hud.floor08Encounter.activeBossHud.staggered
                      ? 'linear-gradient(90deg, #f59e0b, #fde047)'
                      : hud.floor08Encounter.activeBossHud.tier === 'boss' &&
                          hud.floor08Encounter.activeBossHud.phase === 2
                        ? 'linear-gradient(90deg, #ea580c, #fbbf24)'
                        : 'linear-gradient(90deg, #b91c1c, #ef4444 65%, #f97316)',
                  }}
                />
                <div
                  className="absolute top-0 inset-x-0 h-[2px] pointer-events-none"
                  style={{ background: 'rgba(255,255,255,0.25)' }}
                />
                {hud.floor08Encounter.activeBossHud.tier === 'boss' && (
                  <div
                    className="absolute top-0 bottom-0 w-[2px] bg-slate-950"
                    style={{ left: '55%' }}
                  />
                )}
              </div>
            </div>
          )}

        {/* Cinematic Transient Mission / Lockout / Floor-Cleared Celebration Banner */}
        {hud.floorBannerText &&
          (isBannerCleared ? (
            <FloorClearedBanner
              floorNumber={hud.floorNumber}
              bannerText={hud.floorBannerText}
            />
          ) : (
            <div
              className="flex flex-col items-center pt-1"
              data-testid="floor-banner"
            >
              <div
                className={`h-[2px] w-32 mb-1.5 ${
                  isBannerAlert
                    ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)]'
                    : 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.85)]'
                }`}
              />
              <span
                className={`font-[family-name:var(--font-display)] text-[13px] font-bold uppercase tracking-[0.22em] text-center whitespace-nowrap px-3 py-1 ${
                  isBannerAlert
                    ? 'text-red-300 bg-red-950/75 border-x-2 border-red-500'
                    : 'text-slate-100'
                }`}
                style={{ textShadow: '0 2px 12px rgba(0,0,0,0.96)' }}
              >
                {hud.floorBannerText}
              </span>
            </div>
          ))}
      </div>

      {/* TOP-RIGHT: Minimal Utility Controls (+ Kill Streak ONLY when active >= 2) */}
      <div className="fixed top-4 right-5 flex items-center gap-3 pointer-events-auto">
        {hud.streak >= 2 && (
          <div className="hidden sm:flex items-baseline gap-1.5 pointer-events-none">
            <span
              className="font-[family-name:var(--font-mono)] text-[9.5px] uppercase tracking-[0.18em] text-amber-400/90"
              style={{ textShadow: '0 1px 6px rgba(0,0,0,0.95)' }}
            >
              STREAK
            </span>
            <span className="hud-numeral text-lg font-bold text-amber-300 leading-none">
              ×{hud.streak}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={hud.muted ? 'Unmute audio' : 'Mute audio'}
            className="w-9 h-9 hud-chamfer bg-slate-950/80 border border-slate-600/45 flex items-center justify-center text-slate-200 hover:border-cyan-400/70 hover:text-cyan-300 transition-colors cursor-pointer"
          >
            {hud.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            aria-label="Pause game"
            className="w-9 h-9 hud-chamfer bg-slate-950/80 border border-slate-600/45 flex items-center justify-center text-slate-200 hover:border-cyan-400/70 hover:text-cyan-300 transition-colors cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CENTER GAZE ZONE: Precision Crosshair, 360° Directional Hit Arc, Kill-Confirm Hitmarker & Skill Gauges */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
        <div className="relative w-36 h-36 flex items-center justify-center">
          {/* 360° COD / Halo Directional Incoming-Damage Arc around Reticle */}
          {hud.playerHitArcAlpha > 0.02 && (
            <svg
              viewBox="0 0 120 120"
              className="absolute inset-0 w-full h-full pointer-events-none"
              data-testid="reticle-threat-arc"
              style={{
                opacity: hud.playerHitArcAlpha,
                transform: `rotate(${(hud.playerHitBearingRad * 180) / Math.PI}deg)`,
              }}
              aria-hidden="true"
            >
              <path
                d="M 38 14 A 50 50 0 0 1 82 14"
                fill="none"
                stroke="#ef4444"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              <polygon points="60,4 66,14 54,14" fill="#fca5a5" />
            </svg>
          )}

          {/* Center Pip */}
          <div
            className={`w-1 h-1 rounded-full ${
              hud.pistolOvercharged > 0 && isPistol
                ? 'bg-cyan-300'
                : smgCritical && isSmg
                  ? 'bg-red-400'
                  : isHeavy
                    ? 'bg-amber-300'
                    : 'bg-slate-50'
            }`}
            style={{ boxShadow: '0 0 4px rgba(0,0,0,0.95)' }}
          />

          {/* Crisp Dynamic Spread Ticks */}
          <div
            className={`absolute h-[2px] ${
              isHeavy ? 'w-3.5 bg-amber-300/95' : 'w-2.5 bg-cyan-200/90'
            }`}
            style={{
              transform: `translateX(-${hud.spreadPx}px)`,
              boxShadow: '0 0 3px rgba(0,0,0,0.9)',
            }}
          />
          <div
            className={`absolute h-[2px] ${
              isHeavy ? 'w-3.5 bg-amber-300/95' : 'w-2.5 bg-cyan-200/90'
            }`}
            style={{
              transform: `translateX(${hud.spreadPx}px)`,
              boxShadow: '0 0 3px rgba(0,0,0,0.9)',
            }}
          />
          <div
            className={`absolute w-[2px] ${
              isHeavy ? 'h-3.5 bg-amber-300/95' : 'h-2.5 bg-cyan-200/90'
            }`}
            style={{
              transform: `translateY(-${hud.spreadPx}px)`,
              boxShadow: '0 0 3px rgba(0,0,0,0.9)',
            }}
          />
          <div
            className={`absolute w-[2px] ${
              isHeavy ? 'h-3.5 bg-amber-300/95' : 'h-2.5 bg-cyan-200/90'
            }`}
            style={{
              transform: `translateY(${hud.spreadPx}px)`,
              boxShadow: '0 0 3px rgba(0,0,0,0.9)',
            }}
          />

          {/* Hitmarker (White hit / Amber crit / Double-stroke Crimson kill-confirm!) */}
          {hud.hitMarkerTimer > 0 && (
            <svg viewBox="0 0 36 36" className="absolute w-9 h-9" aria-hidden="true">
              <g
                stroke={
                  hud.hitMarkerKill
                    ? '#ef4444'
                    : hud.hitMarkerCritical
                      ? '#fbbf24'
                      : '#f8fafc'
                }
                strokeWidth={hud.hitMarkerKill ? '2.6' : '2.1'}
                strokeLinecap="square"
              >
                <line x1="7" y1="7" x2="14" y2="14" />
                <line x1="29" y1="7" x2="22" y2="14" />
                <line x1="7" y1="29" x2="14" y2="22" />
                <line x1="29" y1="29" x2="22" y2="22" />
              </g>
              {hud.hitMarkerKill && (
                <g stroke="#fca5a5" strokeWidth="1.2" strokeLinecap="square">
                  <line x1="4" y1="4" x2="8" y2="8" />
                  <line x1="32" y1="4" x2="28" y2="8" />
                  <line x1="4" y1="32" x2="8" y2="28" />
                  <line x1="32" y1="32" x2="28" y2="28" />
                </g>
              )}
            </svg>
          )}
        </div>

        {/* Active Reload / Heavy Reload / SMG Heat Gauges tucked cleanly beneath crosshair */}
        {showPistolReload && (
          <div
            className="-mt-4 w-44 flex flex-col items-center gap-1"
            data-testid="active-reload-bar"
          >
            <div
              className="relative w-full h-2.5 bg-slate-950/90 border border-slate-500/70 overflow-hidden"
              style={{ transform: 'skewX(-16deg)' }}
            >
              {hud.pistolReloadPhase === 'active' && (
                <div
                  className="absolute top-0 bottom-0 bg-cyan-400/55 border-x border-cyan-200"
                  style={{
                    left: `${hud.pistolSweetSpotStart * 100}%`,
                    width: `${(hud.pistolSweetSpotEnd - hud.pistolSweetSpotStart) * 100}%`,
                  }}
                />
              )}
              {hud.pistolReloadPhase === 'jammed' && (
                <div
                  className="absolute top-0 bottom-0 left-0 bg-amber-500/75"
                  style={{ width: `${hud.pistolReloadProgress * 100}%` }}
                />
              )}
              <div
                className={`absolute top-0 bottom-0 w-1 ${
                  hud.pistolReloadPhase === 'jammed' ? 'bg-red-400' : 'bg-white'
                }`}
                style={{ left: `calc(${Math.min(1, hud.pistolReloadProgress) * 100}% - 2px)` }}
              />
            </div>
            <span
              className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.18em] uppercase text-cyan-300"
              style={{ textShadow: '0 2px 6px rgba(0,0,0,0.95)' }}
            >
              {hud.pistolReloadPhase === 'jammed' ? 'CLEARING JAM' : 'PRESS [R] IN CYAN ZONE'}
            </span>
          </div>
        )}

        {showHeavyReload && (
          <div
            className="-mt-4 w-44 flex flex-col items-center gap-1"
            data-testid="heavy-reload-bar"
          >
            <div
              className="relative w-full h-2 bg-slate-950/90 border border-amber-500/60 overflow-hidden"
              style={{ transform: 'skewX(-16deg)' }}
            >
              <div
                className="absolute top-0 bottom-0 left-0 bg-amber-400"
                style={{ width: `${Math.min(1, hud.heavyReloadProgress) * 100}%` }}
              />
            </div>
            <span
              className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.18em] uppercase text-amber-300"
              style={{ textShadow: '0 2px 6px rgba(0,0,0,0.95)' }}
            >
              LOADING .50 HV MAG
            </span>
          </div>
        )}

        {isSmg && (hud.smgHeat > 5 || hud.smgVenting || hud.smgOverheated) && (
          <div
            className="-mt-4 w-44 flex flex-col items-center gap-1"
            data-testid="smg-heat-bar"
          >
            <div
              className="relative w-full h-2 bg-slate-950/90 border border-slate-500/70 overflow-hidden"
              style={{ transform: 'skewX(-16deg)' }}
            >
              <div
                className="absolute top-0 bottom-0 border-x border-amber-300/70 bg-amber-500/20"
                style={{ left: '65%', width: '30%' }}
              />
              <div
                className={`absolute top-0 bottom-0 left-0 transition-none ${
                  hud.smgOverheated
                    ? 'bg-red-500'
                    : hud.smgVenting
                      ? 'bg-cyan-400'
                      : smgHot
                        ? 'bg-amber-400'
                        : 'bg-cyan-400'
                }`}
                style={{ width: `${hud.smgHeat}%` }}
              />
            </div>
            <span
              className={`font-[family-name:var(--font-mono)] text-[10px] tracking-[0.16em] uppercase whitespace-nowrap ${
                hud.smgOverheated
                  ? 'text-red-400'
                  : hud.smgVenting
                    ? 'text-cyan-300'
                    : smgHot
                      ? 'text-amber-300'
                      : 'text-slate-300'
              }`}
              style={{ textShadow: '0 2px 6px rgba(0,0,0,0.95)' }}
            >
              {hud.smgOverheated
                ? 'OVERHEATED · STEAM PURGE'
                : hud.smgVenting
                  ? 'VENTING CRYO STEAM'
                  : smgHot
                    ? 'PRESS [R] FLASH-COOL'
                    : `HEAT ${hud.smgHeat}%`}
            </span>
          </div>
        )}

        {banner && (
          <div
            className="mt-2 font-[family-name:var(--font-mono)] text-[11px] font-semibold tracking-[0.2em] uppercase"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.95)' }}
          >
            <span className={banner.colorClass}>{banner.label}</span>
          </div>
        )}
      </div>

      {/* LOWER-CENTER: Whisper-clean unboxed tactical weakpoint cue (cleanly bounded so it never touches corner clusters) */}
      {((hud.floorNumber === 8 && !hud.tutorial.active) ||
        hud.floorNumber === 7 ||
        hud.floorNumber === 6 ||
        hud.floorNumber === 5) &&
        !hud.floor08Encounter.floorCleared &&
        hud.floor08Encounter.weakpointIntel && (
          <div
            className={`fixed left-1/2 -translate-x-1/2 pointer-events-none flex items-center justify-center gap-2 max-w-[min(390px,36vw)] px-4 py-1 text-center ${
              hud.interactPrompt ? 'bottom-32' : 'bottom-7'
            }`}
            data-testid="weakpoint-intel-callout"
            style={{
              background:
                'radial-gradient(ellipse at 50% 50%, rgba(4, 9, 18, 0.72) 0%, rgba(4, 9, 18, 0.34) 62%, rgba(4, 9, 18, 0) 88%)',
            }}
          >
            <span
              className={`w-1.5 h-1.5 rotate-45 shrink-0 ${
                hud.floor08Encounter.weakpointIntel.accent === 'cyan'
                  ? 'bg-cyan-400'
                  : hud.floor08Encounter.weakpointIntel.accent === 'crimson'
                    ? 'bg-red-400'
                    : 'bg-amber-400'
              }`}
            />
            <span
              className="font-[family-name:var(--font-mono)] text-[9.5px] font-semibold tracking-[0.11em] uppercase text-slate-200/95 leading-snug"
              style={{ textShadow: '0 2px 10px rgba(0,0,0,0.98)' }}
            >
              {hud.floor08Encounter.weakpointIntel.hint}
            </span>
          </div>
        )}

      {/* LOWER-CENTER: Compact Two-Tier Gamey BOTW / Halo Hexagonal [E] Interaction & Lockout Prompt */}
      {hud.interactPrompt && (
        <div
          className="fixed bottom-16 left-1/2 -translate-x-1/2 pointer-events-none max-w-[min(450px,44vw)]"
          data-testid="interact-prompt"
          data-locked={hud.interactPromptLocked ? 'true' : 'false'}
        >
          <div
            className={`hud-chamfer px-4 py-2 flex items-center gap-3 border ${
              hud.interactPromptLocked
                ? 'bg-red-950/92 border-red-500/85 shadow-[0_0_24px_rgba(239,68,68,0.34)]'
                : 'bg-slate-950/92 border-amber-400/80 shadow-[0_0_24px_rgba(251,191,36,0.28)]'
            }`}
          >
            {/* Hexagonal Keycap or Crimson Lock Emblem */}
            <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 28 28" className="w-7 h-7" aria-hidden="true">
                <polygon
                  points="14,1.5 25.5,7.8 25.5,20.2 14,26.5 2.5,20.2 2.5,7.8"
                  fill={hud.interactPromptLocked ? 'rgba(239,68,68,0.24)' : 'rgba(251,191,36,0.22)'}
                  stroke={hud.interactPromptLocked ? '#f87171' : '#fbbf24'}
                  strokeWidth="1.8"
                />
              </svg>
              <span
                className={`absolute font-[family-name:var(--font-display)] text-xs font-bold ${
                  hud.interactPromptLocked ? 'text-red-300' : 'text-amber-200'
                }`}
              >
                {hud.interactPromptLocked ? '✕' : 'E'}
              </span>
            </div>

            {(() => {
              const cleaned = hud.interactPrompt.replace(/^\[E\]\s*/i, '');
              const parts = cleaned.split(' · ');
              const headline = parts[0] ?? cleaned;
              const detail = parts.slice(1).join(' · ');
              return (
                <div className="flex flex-col leading-tight">
                  <span
                    className={`font-[family-name:var(--font-display)] text-[12.5px] font-bold tracking-[0.16em] uppercase ${
                      hud.interactPromptLocked ? 'text-red-200' : 'text-amber-200'
                    }`}
                    style={{ textShadow: '0 2px 8px rgba(0,0,0,0.96)' }}
                  >
                    {headline}
                  </span>
                  {detail && (
                    <span
                      className={`font-[family-name:var(--font-mono)] text-[10px] font-semibold tracking-[0.12em] uppercase mt-0.5 ${
                        hud.interactPromptLocked ? 'text-red-300/95' : 'text-slate-200'
                      }`}
                    >
                      {detail}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* BOTTOM-LEFT: Hero Reactive Vitality & Kinetic Shield Bar (+ quiet tutorial skip only during training) */}
      <div className="fixed bottom-6 left-7 flex flex-col items-start gap-2">
        {hud.floorNumber === 8 && hud.tutorial.active && (
          <button
            type="button"
            tabIndex={-1}
            data-testid="tutorial-skip-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onSkipTutorial();
            }}
            className="pointer-events-auto font-[family-name:var(--font-mono)] text-[11px] font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-4 cursor-pointer uppercase tracking-[0.16em]"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}
          >
            [Tab] Skip Training & Deploy Combat
          </button>
        )}

        <VitalityBar
          hp={hud.playerHp}
          maxHp={hud.playerMaxHp}
          shieldIntegrity={hud.playerShieldIntegrity}
          shieldGhost={hud.playerShieldGhost}
          shieldRecharging={hud.playerShieldRecharging}
          barShake={hud.playerBarShake}
          damagePulse={hud.playerDamagePulse}
        />
      </div>

      {/* BOTTOM-RIGHT: Amazing Floating Gunsmith Weapon & Ammo Display */}
      <div className="fixed bottom-6 right-7">
        <WeaponArsenalHud hud={hud} onSelectWeapon={onSelectWeapon} />
      </div>
    </div>
  );
}
