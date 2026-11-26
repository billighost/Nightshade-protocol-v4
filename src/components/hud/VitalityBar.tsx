interface VitalityBarProps {
  hp: number;
  maxHp: number;
  shieldIntegrity: number;
  shieldGhost: number;
  shieldRecharging: boolean;
  barShake: number;
  damagePulse: number;
}

/**
 * Pure AAA Reactive Vitality & Kinetic Shield Bar (Halo / COD / Apex inspired):
 * - Zero stance clutter, zero boxy web cards
 * - 3 beveled kinetic shield plates with trailing white-amber-red damage ghost,
 *   impact tremor shake, crimson flare rim, Halo recharge sweep, and full-width hull strip underneath
 */
export function VitalityBar({
  hp,
  maxHp,
  shieldIntegrity,
  shieldGhost,
  shieldRecharging,
  barShake,
  damagePulse,
}: VitalityBarProps) {
  const shieldPct = Math.max(0, Math.min(100, shieldIntegrity));
  const ghostPct = Math.max(shieldPct, Math.min(100, shieldGhost));
  const hpPct = Math.max(0, Math.min(100, (hp / Math.max(1, maxHp)) * 100));

  const isCritical = shieldPct < 30;
  const isWarn = !isCritical && shieldPct < 60;
  const isFlashing = damagePulse > 0.08;

  const shakeAmp = Math.min(1, barShake / 0.28);
  const t = barShake * 92;
  const shakeX = shakeAmp > 0.01 ? Math.sin(t * 1.7) * 5.2 * shakeAmp : 0;
  const shakeY = shakeAmp > 0.01 ? Math.cos(t * 2.3) * 3.1 * shakeAmp : 0;

  const segments = [0, 1, 2].map((idx) => {
    const start = idx * (100 / 3);
    const span = 100 / 3;
    const fill = Math.max(0, Math.min(100, ((shieldPct - start) / span) * 100));
    const ghost = Math.max(fill, Math.min(100, ((ghostPct - start) / span) * 100));
    return { idx, fill, ghost };
  });

  const shieldColor = isFlashing
    ? 'linear-gradient(90deg, #ef4444 0%, #f97316 100%)'
    : isCritical
      ? 'linear-gradient(90deg, #dc2626 0%, #f87171 100%)'
      : isWarn
        ? 'linear-gradient(90deg, #d97706 0%, #fbbf24 100%)'
        : 'linear-gradient(90deg, #0284c7 0%, #38bdf8 58%, #a5f3fc 100%)';

  const shieldGlow = isFlashing
    ? '0 0 18px rgba(239, 68, 68, 0.8)'
    : isCritical
      ? '0 0 14px rgba(239, 68, 68, 0.6)'
      : isWarn
        ? '0 0 14px rgba(245, 158, 11, 0.48)'
        : '0 0 12px rgba(56, 189, 248, 0.42)';

  const statusTag = isFlashing
    ? 'IMPACT'
    : shieldRecharging
      ? 'RECHARGING'
      : isCritical
        ? 'CRITICAL'
        : null;

  return (
    <div
      className="relative flex flex-col items-start select-none pointer-events-none px-3 py-2 -ml-3 -mb-2"
      data-testid="vitality-bar"
      style={{
        transform: `translate3d(${shakeX.toFixed(1)}px, ${shakeY.toFixed(1)}px, 0)`,
        background:
          'radial-gradient(ellipse at 22% 76%, rgba(4, 9, 18, 0.68) 0%, rgba(4, 9, 18, 0.3) 56%, rgba(4, 9, 18, 0) 82%)',
      }}
    >
      {/* Ultra-clean top row: Hex shield icon + optional transient status + crisp hero numeral */}
      <div className="flex items-end justify-between w-[258px] mb-1.5 px-0.5">
        <div className="flex items-center gap-2">
          <svg
            viewBox="0 0 20 20"
            className="w-[17px] h-[17px] shrink-0"
            aria-hidden="true"
            style={{
              filter: isFlashing
                ? 'drop-shadow(0 0 7px rgba(239,68,68,0.92))'
                : 'drop-shadow(0 0 5px rgba(56,189,248,0.78))',
            }}
          >
            <polygon
              points="10,1.5 18,5.5 16.5,14 10,18.5 3.5,14 2,5.5"
              fill={isFlashing ? 'rgba(239,68,68,0.28)' : 'rgba(56,189,248,0.18)'}
              stroke={isFlashing ? '#f87171' : isWarn ? '#fbbf24' : '#38bdf8'}
              strokeWidth="1.6"
            />
            <polygon
              points="10,5.2 13.5,7.2 12.6,12.2 10,14.2 7.4,12.2 6.5,7.2"
              fill={isFlashing ? '#fca5a5' : isWarn ? '#fcd34d' : '#a5f3fc'}
            />
          </svg>

          {statusTag && (
            <span
              className={`font-[family-name:var(--font-display)] text-[10.5px] font-bold uppercase tracking-[0.22em] ${
                isFlashing || isCritical ? 'text-red-300' : 'text-cyan-300'
              }`}
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.98)' }}
            >
              {statusTag}
            </span>
          )}
        </div>

        <span
          className={`hud-numeral text-[28px] font-bold leading-none tracking-tight ${
            isFlashing
              ? 'text-red-300'
              : isCritical
                ? 'text-red-400'
                : isWarn
                  ? 'text-amber-300'
                  : 'text-slate-50'
          }`}
          data-testid="hud-shield-value"
        >
          {Math.round(shieldPct)}
        </span>
      </div>

      {/* Primary 3-Plate Slanted Kinetic Shield Bar */}
      <div
        className="relative flex items-center gap-[5px] w-[258px] h-[13px]"
        style={{
          transform: 'skewX(-18deg)',
          filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.9))',
        }}
      >
        {segments.map((seg) => (
          <div
            key={seg.idx}
            className="relative flex-1 h-full overflow-hidden"
            style={{
              background: 'rgba(5, 11, 20, 0.9)',
              border: isFlashing
                ? '1px solid rgba(248, 113, 113, 0.92)'
                : '1px solid rgba(148, 163, 184, 0.36)',
              boxShadow: seg.fill > 2 ? shieldGlow : 'none',
            }}
          >
            {/* Trailing white-amber-crimson damage ghost bar */}
            {seg.ghost > seg.fill + 0.5 && (
              <div
                className="absolute inset-y-0 left-0"
                data-testid="vitality-ghost-segment"
                style={{
                  width: `${seg.ghost}%`,
                  background: 'linear-gradient(90deg, rgba(254,240,138,0.95), rgba(248,113,113,0.96))',
                }}
              />
            )}

            {/* Live kinetic shield plate fill */}
            <div
              className="absolute inset-y-0 left-0"
              style={{
                width: `${seg.fill}%`,
                background: shieldColor,
              }}
            />

            {/* Machined specular top highlight */}
            <div
              className="absolute top-0 inset-x-0 h-[3px] pointer-events-none"
              style={{ background: 'rgba(255, 255, 255, 0.28)' }}
            />

            {/* Animated Halo recharge sweep */}
            {shieldRecharging && seg.fill > 0 && (
              <div className="hud-recharge-sweep absolute inset-y-0 w-10 pointer-events-none" />
            )}
          </div>
        ))}
      </div>

      {/* Full-Width Sleek Hull Vitality Strip directly beneath shield plates (zero stance clutter!) */}
      <div
        className="mt-[5px] relative w-[258px] h-[5px] overflow-hidden"
        style={{
          transform: 'skewX(-18deg)',
          background: 'rgba(5, 11, 20, 0.88)',
          border: '1px solid rgba(148, 163, 184, 0.28)',
        }}
      >
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${hpPct}%`,
            background: 'linear-gradient(90deg, #cbd5e1 0%, #f8fafc 100%)',
          }}
        />
      </div>
    </div>
  );
}
