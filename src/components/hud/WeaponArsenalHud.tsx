import type { HudSnapshot, WeaponId } from '../../game/core/types';

interface WeaponArsenalHudProps {
  hud: HudSnapshot;
  onSelectWeapon: (weapon: WeaponId) => void;
}

/**
 * Detailed multi-layer Gunsmith vector art for SPECTRE-9 Suppressed Tactical Pistol.
 */
function Spectre9Blueprint({ overcharged }: { overcharged: boolean }) {
  const accent = overcharged ? '#67e8f9' : '#22d3ee';
  return (
    <svg viewBox="0 0 184 58" className="w-[162px] h-[50px] shrink-0" aria-hidden="true">
      {/* Suppressor body + baffles */}
      <rect x="122" y="15" width="56" height="9.5" rx="1.5" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.2" />
      <line x1="134" y1="15" x2="134" y2="24.5" stroke="#475569" strokeWidth="1" />
      <line x1="150" y1="15" x2="150" y2="24.5" stroke="#475569" strokeWidth="1" />
      <line x1="166" y1="15" x2="166" y2="24.5" stroke="#475569" strokeWidth="1" />
      <rect x="176" y="16.5" width="4" height="6.5" fill={accent} />

      {/* Micro Red-Dot Reflex Optic */}
      <path d="M40 12 L44 6 H59 L62 12 Z" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.1" />
      <circle cx="52" cy="9" r="1.4" fill={accent} />

      {/* Machined Tactical Slide + Serrations */}
      <path d="M26 12 H122 V25 H26 Z" fill="#334155" stroke="#cbd5e1" strokeWidth="1.25" />
      <rect x="29" y="14.5" width="90" height="2" fill={accent} opacity={overcharged ? 0.95 : 0.68} />
      {[34, 38, 42, 46, 98, 102, 106].map((x) => (
        <line key={x} x1={x} y1="17.5" x2={x - 1.5} y2="23.5" stroke="#0f172a" strokeWidth="1.5" />
      ))}

      {/* Lower Frame + Underbarrel Tactical Laser Module */}
      <path
        d="M28 25 H118 V31 H86 L80 35 H60 L54 53 H33 L41 31 H28 Z"
        fill="#1e293b"
        stroke="#94a3b8"
        strokeWidth="1.2"
      />
      {/* Underbarrel LAM */}
      <rect x="88" y="29" width="28" height="7" rx="1" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
      <rect x="114" y="31" width="3" height="3" fill={accent} />

      {/* Trigger Guard & Trigger */}
      <path d="M62 31 H82 L78 39 H60 Z" fill="none" stroke="#94a3b8" strokeWidth="1.3" />
      <path d="M68 31 Q66 35 69 37" fill="none" stroke="#e2e8f0" strokeWidth="1.3" />

      {/* Grip Texture Panels + Mag Baseplate */}
      <polygon points="42,34 53,34 48,49 38,49" fill="#0f172a" stroke="#475569" strokeWidth="0.9" />
      <rect x="31" y="51.5" width="24" height="3.5" rx="0.8" fill={accent} opacity="0.85" />
    </svg>
  );
}

/**
 * Detailed multi-layer Gunsmith vector art for VIPER-X4 Cryo-Rail SMG.
 */
function ViperX4Blueprint({ heat, overheated }: { heat: number; overheated: boolean }) {
  const glow = overheated ? '#ef4444' : heat >= 65 ? '#f59e0b' : '#22d3ee';
  return (
    <svg viewBox="0 0 184 58" className="w-[162px] h-[50px] shrink-0" aria-hidden="true">
      {/* Collapsible PDW Stock */}
      <path d="M8 17 H30 V29 H14 L8 34 Z" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.2" />
      <line x1="13" y1="21" x2="28" y2="21" stroke="#475569" strokeWidth="2" />

      {/* Holo Sight on Top Rail */}
      <path d="M62 12 L66 5 H90 L94 12 Z" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.15" />
      <rect x="70" y="8" width="16" height="2" fill={glow} />

      {/* Main Rail-SMG Upper Receiver + Compensator */}
      <path d="M30 12 H148 V26 H30 Z" fill="#334155" stroke="#cbd5e1" strokeWidth="1.25" />
      <path d="M148 15 H174 L178 19 V23 L174 26 H148 Z" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.15" />
      <rect x="156" y="17.5" width="4" height="6" fill="#0b111c" />
      <rect x="164" y="17.5" width="4" height="6" fill="#0b111c" />

      {/* Glowing Twin Cryo-Thermal Cooling Vents */}
      {[104, 113, 122, 131, 140].map((x) => (
        <rect key={x} x={x} y="15.5" width="5.5" height="7" rx="0.8" fill={glow} />
      ))}

      {/* Lower Receiver, Angled Foregrip & High-Cap Shrouded Magazine */}
      <path
        d="M32 26 H142 V32 H122 L117 42 H109 L111 32 H96 L91 52 H78 L82 32 H62 L56 50 H42 L48 32 H32 Z"
        fill="#1e293b"
        stroke="#94a3b8"
        strokeWidth="1.2"
      />
      {/* Glowing cryo energy coil along mag well */}
      <rect x="81.5" y="34" width="8" height="14" rx="1" fill="#0f172a" stroke={glow} strokeWidth="1.2" />
      <line x1="85.5" y1="36" x2="85.5" y2="46" stroke={glow} strokeWidth="1.8" />
    </svg>
  );
}

/**
 * Detailed multi-layer Gunsmith vector art for VULCAN-50 Heavy .50 HV Kinetic Rifle.
 */
function Vulcan50Blueprint({ empty }: { empty: boolean }) {
  const accent = empty ? '#ef4444' : '#f59e0b';
  const bright = empty ? '#fca5a5' : '#fcd34d';
  return (
    <svg viewBox="0 0 184 58" className="w-[168px] h-[50px] shrink-0" aria-hidden="true">
      {/* Precision Marksman Stock + Cheek Riser */}
      <path d="M4 17 H36 V32 H20 L10 38 H4 Z" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.2" />
      <rect x="11" y="14.5" width="18" height="3.5" rx="1" fill="#334155" stroke="#94a3b8" strokeWidth="1" />

      {/* Chunky 34mm LPVO Precision Scope + Mount Rings */}
      <rect x="52" y="11" width="4" height="5" fill="#475569" />
      <rect x="84" y="11" width="4" height="5" fill="#475569" />
      <path d="M43 5 H94 L104 3 V13 L94 11 H43 Z" fill="#0f172a" stroke={bright} strokeWidth="1.2" />
      <rect x="102" y="4.5" width="3" height="7" fill={accent} />

      {/* Heavy Upper Receiver + Quad-Rail Handguard */}
      <path d="M36 16 H146 V28 H36 Z" fill="#334155" stroke="#e2e8f0" strokeWidth="1.25" />
      <rect x="40" y="18.5" width="52" height="2" fill={accent} />
      {[100, 108, 116, 124, 132, 140].map((x) => (
        <rect key={x} x={x} y="19" width="4.5" height="5.5" rx="0.6" fill="#0f172a" stroke="#64748b" strokeWidth="0.7" />
      ))}

      {/* Fluted Heavy Barrel + Colossal Twin-Baffle Tank Muzzle Brake */}
      <rect x="146" y="19.5" width="14" height="5" fill="#64748b" />
      <path d="M160 15.5 H181 V28.5 H160 Z" fill="#1e293b" stroke={bright} strokeWidth="1.3" />
      <rect x="164" y="18.5" width="4.5" height="7" fill="#090e17" />
      <rect x="172.5" y="18.5" width="4.5" height="7" fill="#090e17" />

      {/* Lower Receiver, 20-Rd .50 HV Box Magazine & Grip */}
      <path
        d="M38 28 H108 V34 H95 L93 54 H74 L76 34 H58 L52 52 H40 L45 34 H38 Z"
        fill="#1e293b"
        stroke="#94a3b8"
        strokeWidth="1.2"
      />
      {/* Brass ammunition witness strip on .50 HV box mag */}
      <rect x="81" y="36" width="5" height="15" rx="0.8" fill={accent} opacity="0.9" />
    </svg>
  );
}

/**
 * Floating COD / Halo Gunsmith Weapon & Ammo Display (zero website boxes!).
 */
export function WeaponArsenalHud({ hud, onSelectWeapon }: WeaponArsenalHudProps) {
  const isPistol = hud.activeWeapon === 'pistol';
  const isSmg = hud.activeWeapon === 'smg';
  const isHeavy = hud.activeWeapon === 'heavy';
  const smgHot = hud.smgHeat >= 65;
  const heavyEmpty = hud.heavyAmmo === 0 && hud.heavyReserveAmmo === 0;
  const heavyLow = hud.heavyAmmo <= 4 && !heavyEmpty;

  // Tactile recoil kickback on the weapon blueprint SVG when firing
  const recoilPx = Math.min(12, hud.cameraShotPulse * 10 + hud.cameraHeavyPulse * 12);

  const slots: Array<{ id: WeaponId; keyNum: string; name: string; accent: string }> = [
    { id: 'pistol', keyNum: '1', name: 'SPECTRE-9', accent: 'border-cyan-400 text-cyan-300' },
    { id: 'smg', keyNum: '2', name: 'VIPER-X4', accent: smgHot ? 'border-amber-400 text-amber-300' : 'border-cyan-400 text-cyan-300' },
    { id: 'heavy', keyNum: '3', name: 'VULCAN-50', accent: heavyEmpty ? 'border-red-400 text-red-400' : 'border-amber-400 text-amber-300' },
  ];

  return (
    <div
      className="flex flex-col items-end gap-2 select-none pointer-events-auto px-3.5 py-2.5 -mr-3 -mb-2"
      data-testid="weapon-arsenal-hud"
      style={{
        background:
          'radial-gradient(ellipse at 78% 72%, rgba(4, 9, 18, 0.76) 0%, rgba(4, 9, 18, 0.42) 56%, rgba(4, 9, 18, 0) 84%)',
      }}
    >
      {/* Hero Unboxed Gunsmith Silhouette + Huge Tabular Ammo/Thermal Readout */}
      <div className="flex items-end gap-4 pr-0.5">
        {/* Left: Detailed Gunsmith Blueprint & Weapon Designation */}
        <div className="flex flex-col items-end">
          <div
            style={{
              transform: `translateX(${recoilPx.toFixed(1)}px)`,
              filter: 'drop-shadow(0 5px 14px rgba(0,0,0,0.92))',
            }}
          >
            {isPistol ? (
              <Spectre9Blueprint overcharged={hud.pistolOvercharged > 0} />
            ) : isSmg ? (
              <ViperX4Blueprint heat={hud.smgHeat} overheated={hud.smgOverheated} />
            ) : (
              <Vulcan50Blueprint empty={heavyEmpty} />
            )}
          </div>

          <div className="flex items-center gap-2 -mt-0.5">
            {isPistol && hud.pistolOvercharged > 0 && (
              <span
                className="font-[family-name:var(--font-mono)] text-[9.5px] font-semibold uppercase tracking-[0.18em] text-cyan-300"
                style={{ textShadow: '0 2px 6px rgba(0,0,0,0.95)' }}
              >
                +{hud.pistolOvercharged} OVERCHARGED
              </span>
            )}
            {isSmg && (hud.smgFlashCoolActive || hud.smgOverheated) && (
              <span
                className={`font-[family-name:var(--font-mono)] text-[9.5px] font-semibold uppercase tracking-[0.18em] ${
                  hud.smgOverheated ? 'text-red-400' : 'text-cyan-300'
                }`}
                style={{ textShadow: '0 2px 6px rgba(0,0,0,0.95)' }}
              >
                {hud.smgOverheated ? 'OVERHEATED' : 'CRYO SURGE'}
              </span>
            )}
            <span
              className="font-[family-name:var(--font-display)] text-xs font-bold tracking-[0.18em] text-slate-100"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}
            >
              {isPistol ? 'SPECTRE-9' : isSmg ? 'VIPER-X4' : 'VULCAN-50'}
            </span>
          </div>
        </div>

        {/* Crisp Vertical Accent Divider */}
        <div
          className={`w-[2px] h-12 self-center ${
            isHeavy
              ? heavyEmpty
                ? 'bg-red-500/80'
                : 'bg-amber-400/85'
              : isSmg && (smgHot || hud.smgOverheated)
                ? 'bg-amber-400/85'
                : 'bg-cyan-400/85'
          }`}
        />

        {/* Right: Hero Ammo / Heat Numerals */}
        <div className="flex flex-col items-end min-w-[88px]">
          {isPistol ? (
            <div className="flex items-baseline gap-1" data-testid="hud-ammo">
              <span
                className={`hud-numeral text-[44px] font-bold leading-[0.9] tracking-tight ${
                  hud.pistolAmmo <= 4
                    ? 'text-amber-400'
                    : hud.pistolOvercharged > 0
                      ? 'text-cyan-300'
                      : 'text-slate-50'
                }`}
              >
                {hud.pistolAmmo}
              </span>
              <span
                className="font-[family-name:var(--font-mono)] text-sm font-medium text-slate-400"
                style={{ textShadow: '0 2px 6px rgba(0,0,0,0.95)' }}
              >
                /{hud.pistolMaxAmmo}
              </span>
            </div>
          ) : isSmg ? (
            <div className="flex items-baseline gap-0.5" data-testid="hud-heat">
              <span
                className={`hud-numeral text-[44px] font-bold leading-[0.9] tracking-tight ${
                  hud.smgOverheated
                    ? 'text-red-400'
                    : smgHot
                      ? 'text-amber-400'
                      : 'text-cyan-300'
                }`}
              >
                {hud.smgHeat}
              </span>
              <span
                className="font-[family-name:var(--font-mono)] text-sm font-semibold text-slate-400"
                style={{ textShadow: '0 2px 6px rgba(0,0,0,0.95)' }}
              >
                %
              </span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1" data-testid="hud-heavy-ammo">
              <span
                className={`hud-numeral text-[44px] font-bold leading-[0.9] tracking-tight ${
                  heavyEmpty
                    ? 'text-red-400'
                    : heavyLow
                      ? 'text-amber-400'
                      : 'text-amber-300'
                }`}
              >
                {hud.heavyAmmo}
              </span>
              <span
                className="font-[family-name:var(--font-mono)] text-sm font-medium text-slate-400"
                style={{ textShadow: '0 2px 6px rgba(0,0,0,0.95)' }}
              >
                /{hud.heavyReserveAmmo}
              </span>
            </div>
          )}

          {/* Contextual action prompt ONLY when ammo is low/empty or SMG is hot */}
          {(isPistol && hud.pistolAmmo <= 4) ||
          (isSmg && smgHot) ||
          (isHeavy && (heavyEmpty || heavyLow)) ? (
            <span
              className={`font-[family-name:var(--font-mono)] text-[9.5px] font-semibold uppercase tracking-[0.16em] mt-1 ${
                heavyEmpty || hud.smgOverheated ? 'text-red-400' : 'text-amber-300'
              }`}
              style={{ textShadow: '0 1px 6px rgba(0,0,0,0.95)' }}
            >
              {isSmg
                ? '[R] FLASH-COOL'
                : isHeavy && heavyEmpty
                  ? 'LOOT .50 CRATE'
                  : '[R] RELOAD'}
            </span>
          ) : null}
        </div>
      </div>

      {/* Slanted Bullet-Stack Pips or Cryo-Thermal Gauge */}
      <div className="w-[274px] flex items-center justify-end">
        {isPistol ? (
          <div className="flex items-center gap-[3px]" style={{ transform: 'skewX(-16deg)' }}>
            {Array.from({ length: hud.pistolMaxAmmo }).map((_, i) => {
              const filled = i < hud.pistolAmmo;
              const over = filled && i >= hud.pistolAmmo - hud.pistolOvercharged;
              return (
                <span
                  key={i}
                  className={`h-[9px] w-[6px] ${
                    over
                      ? 'bg-cyan-300 shadow-[0_0_6px_rgba(34,211,238,0.85)]'
                      : filled
                        ? 'bg-slate-100'
                        : 'bg-slate-900/80 border border-slate-700/70'
                  }`}
                />
              );
            })}
          </div>
        ) : isSmg ? (
          <div
            className="relative w-full h-[9px] overflow-hidden"
            style={{
              transform: 'skewX(-16deg)',
              background: 'rgba(6, 12, 22, 0.86)',
              border: '1px solid rgba(148, 163, 184, 0.34)',
            }}
          >
            <div
              className="absolute inset-y-0 bg-amber-500/20 border-x border-amber-300/65"
              style={{ left: '65%', width: '30%' }}
            />
            <div
              className="absolute inset-y-0 left-0"
              style={{
                width: `${hud.smgHeat}%`,
                background: hud.smgOverheated
                  ? 'linear-gradient(90deg, #dc2626, #f87171)'
                  : smgHot
                    ? 'linear-gradient(90deg, #d97706, #fbbf24)'
                    : 'linear-gradient(90deg, #0ea5e9, #38bdf8)',
              }}
            />
          </div>
        ) : (
          <div className="flex items-center gap-[3px]" style={{ transform: 'skewX(-16deg)' }}>
            {Array.from({ length: hud.heavyMaxAmmo }).map((_, i) => {
              const filled = i < hud.heavyAmmo;
              return (
                <span
                  key={i}
                  className={`h-[10px] w-[7px] ${
                    filled
                      ? 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.55)]'
                      : 'bg-slate-900/80 border border-slate-700/70'
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Minimal Razor-Slim 3-Slot Weapon Switcher Strip (zero clunky cards!) */}
      <div className="flex items-center gap-3 pt-0.5">
        {slots.map((slot) => {
          const active = hud.activeWeapon === slot.id;
          return (
            <button
              key={slot.id}
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onSelectWeapon(slot.id);
              }}
              className={`pb-1 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                active
                  ? slot.accent
                  : 'border-transparent text-slate-400/80 hover:text-slate-200'
              }`}
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}
            >
              <span className="font-[family-name:var(--font-mono)] text-[10px] opacity-80">
                [{slot.keyNum}]
              </span>
              <span className="font-[family-name:var(--font-display)] text-[11px] font-bold tracking-[0.14em]">
                {slot.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
