interface FloorClearedBannerProps {
  floorNumber: number;
  bannerText: string;
}

/**
 * Cinematic AAA "SECTOR CLEARED" / "BULKHEAD UNSEALED" Emblem Banner
 * Inspired by Destiny 2, Halo Infinite, and Breath of the Wild shrine unlocks:
 * - Sculpted golden-cyan double-diamond crest with expanding luminous light rules
 * - Zero generic web card chrome — pure floating broadcast typography & feathered scrim
 */
export function FloorClearedBanner({ floorNumber, bannerText }: FloorClearedBannerProps) {
  const isBulkheadOpen = bannerText.includes('UNSEALED') && !bannerText.includes('ACTIVATE CONTROL CENTER');
  const nextFloorCode = floorNumber <= 1 ? 'VAULT 01' : `FLOOR 0${floorNumber - 1}`;
  const headline = isBulkheadOpen
    ? `BULKHEAD 0${floorNumber} UNSEALED`
    : `FLOOR 0${floorNumber} CLEARED`;
  const subline = isBulkheadOpen
    ? `DESCENT ROUTE TO ${nextFloorCode} OPEN · PROCEED THROUGH NORTH GATE`
    : `ALL HOSTILES VANQUISHED · ACTIVATE CONTROL CENTER TO DESCEND TO ${nextFloorCode}`;

  const accentPrimary = isBulkheadOpen ? '#22d3ee' : '#fbbf24';
  const accentSecondary = isBulkheadOpen ? '#67e8f9' : '#38bdf8';

  return (
    <div
      className="hud-cleared-reveal relative flex flex-col items-center pointer-events-none select-none pt-1 pb-2 px-8"
      data-testid="floor-banner"
      data-banner-variant={isBulkheadOpen ? 'unsealed' : 'cleared'}
      style={{
        background:
          'radial-gradient(ellipse at 50% 48%, rgba(4, 9, 18, 0.88) 0%, rgba(4, 9, 18, 0.56) 54%, rgba(4, 9, 18, 0) 84%)',
      }}
    >
      {/* Top Crest + Expanding Luminous Horizon Rules */}
      <div className="flex items-center justify-center gap-3 w-full mb-1">
        <div
          className="hud-rule-expand h-[1.5px] w-24 origin-right"
          style={{
            background: `linear-gradient(90deg, rgba(251,191,36,0) 0%, ${accentPrimary} 100%)`,
          }}
        />

        {/* Sculpted Geometric Shrine / Vanguard Crest */}
        <svg
          viewBox="0 0 40 24"
          className="w-10 h-6 shrink-0"
          aria-hidden="true"
          style={{
            filter: isBulkheadOpen
              ? 'drop-shadow(0 0 10px rgba(34,211,238,0.85))'
              : 'drop-shadow(0 0 10px rgba(251,191,36,0.9))',
          }}
        >
          {/* Flanking chevrons */}
          <polyline
            points="9,6 3,12 9,18"
            fill="none"
            stroke={accentSecondary}
            strokeWidth="1.6"
            strokeLinecap="square"
          />
          <polyline
            points="31,6 37,12 31,18"
            fill="none"
            stroke={accentSecondary}
            strokeWidth="1.6"
            strokeLinecap="square"
          />
          {/* Outer faceted diamond */}
          <polygon
            points="20,2 30,12 20,22 10,12"
            fill="rgba(6, 12, 22, 0.88)"
            stroke={accentPrimary}
            strokeWidth="1.8"
          />
          {/* Luminous inner core */}
          <polygon points="20,6.5 25.5,12 20,17.5 14.5,12" fill={accentPrimary} />
          <polygon points="20,9.5 22.5,12 20,14.5 17.5,12" fill="#ffffff" />
        </svg>

        <div
          className="hud-rule-expand h-[1.5px] w-24 origin-left"
          style={{
            background: `linear-gradient(90deg, ${accentPrimary} 0%, rgba(251,191,36,0) 100%)`,
          }}
        />
      </div>

      {/* Hero Spaced Display Title */}
      <div
        className={`font-[family-name:var(--font-display)] text-[22px] font-bold uppercase tracking-[0.3em] leading-none whitespace-nowrap ${
          isBulkheadOpen ? 'text-cyan-200' : 'text-amber-200'
        }`}
        style={{
          textShadow: isBulkheadOpen
            ? '0 0 22px rgba(34,211,238,0.68), 0 3px 12px rgba(0,0,0,0.98)'
            : '0 0 22px rgba(251,191,36,0.68), 0 3px 12px rgba(0,0,0,0.98)',
        }}
      >
        {headline}
      </div>

      {/* Razor-thin bottom rule + Next-Floor Action Callout */}
      <div
        className="hud-rule-expand mt-2 px-4 py-1 flex items-center gap-2.5"
        style={{
          background:
            'linear-gradient(90deg, rgba(6,12,22,0) 0%, rgba(6,12,22,0.84) 16%, rgba(6,12,22,0.84) 84%, rgba(6,12,22,0) 100%)',
          borderTop: `1px solid ${isBulkheadOpen ? 'rgba(34,211,238,0.45)' : 'rgba(251,191,36,0.48)'}`,
          borderBottom: `1px solid ${isBulkheadOpen ? 'rgba(34,211,238,0.22)' : 'rgba(251,191,36,0.24)'}`,
        }}
      >
        <span
          className={`w-1.5 h-1.5 rotate-45 shrink-0 ${
            isBulkheadOpen ? 'bg-cyan-300' : 'bg-amber-400'
          }`}
        />
        <span
          className="font-[family-name:var(--font-mono)] text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-100 whitespace-nowrap"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.98)' }}
        >
          {subline}
        </span>
        <span
          className={`w-1.5 h-1.5 rotate-45 shrink-0 ${
            isBulkheadOpen ? 'bg-cyan-300' : 'bg-amber-400'
          }`}
        />
      </div>
    </div>
  );
}
