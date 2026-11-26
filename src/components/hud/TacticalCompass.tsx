import { cameraYawToCompassDegrees, type MinimapSnapshot } from '../../game/hud/minimapMath';

interface TacticalCompassProps {
  cameraYaw: number;
  minimap: MinimapSnapshot;
}

const CARDINAL_POINTS: ReadonlyArray<{ deg: number; label: string; major: boolean }> = [
  { deg: 0, label: 'N', major: true },
  { deg: 45, label: 'NE', major: false },
  { deg: 90, label: 'E', major: true },
  { deg: 135, label: 'SE', major: false },
  { deg: 180, label: 'S', major: true },
  { deg: 225, label: 'SW', major: false },
  { deg: 270, label: 'W', major: true },
  { deg: 315, label: 'NW', major: false },
];

function shortestAngleDiffDeg(targetDeg: number, currentDeg: number): number {
  return ((targetDeg - currentDeg + 540) % 360) - 180;
}

/**
 * Floating COD / Breath of the Wild style top-center tactical bearing ribbon.
 * Zero boxy card container — pure razor-crisp floating ticks, cardinals, and live objective diamond!
 */
export function TacticalCompass({ cameraYaw, minimap }: TacticalCompassProps) {
  const headingDeg = cameraYawToCompassDegrees(cameraYaw);
  const headingRounded = Math.round(headingDeg) % 360;
  const visibleHalfSpanDeg = 72; // ±72° visible across the 360px ribbon
  const widthPx = 360;
  const pxPerDeg = widthPx / (visibleHalfSpanDeg * 2);

  // Build crisp 15-degree tick marks in view
  const ticks: Array<{ deg: number; x: number; isCardinal: boolean; label?: string; isNorth?: boolean }> = [];
  for (let deg = 0; deg < 360; deg += 15) {
    const diff = shortestAngleDiffDeg(deg, headingDeg);
    if (Math.abs(diff) > visibleHalfSpanDeg) continue;
    const x = widthPx / 2 + diff * pxPerDeg;
    const cp = CARDINAL_POINTS.find((c) => c.deg === deg);
    ticks.push({
      deg,
      x,
      isCardinal: Boolean(cp?.major),
      label: cp?.label,
      isNorth: deg === 0,
    });
  }

  // Objective bearing pip on compass tape
  let objectivePip: { x: number; clamped: boolean; kind: 'hostile' | 'boss' | 'control_center' | 'exit' } | null = null;
  if (minimap.objectiveTarget) {
    const dx = minimap.objectiveTarget.x - minimap.playerX;
    const dz = minimap.objectiveTarget.z - minimap.playerZ;
    // World bearing: 0° = North (-Z), 90° = East (+X)
    const worldBearingDeg = (((Math.atan2(dx, -dz) * 180) / Math.PI) + 360) % 360;
    const diff = shortestAngleDiffDeg(worldBearingDeg, headingDeg);
    const clampedDiff = Math.max(-visibleHalfSpanDeg + 4, Math.min(visibleHalfSpanDeg - 4, diff));
    objectivePip = {
      x: widthPx / 2 + clampedDiff * pxPerDeg,
      clamped: Math.abs(diff) > visibleHalfSpanDeg - 4,
      kind: minimap.objectiveTarget.kind,
    };
  }

  return (
    <div
      className="relative flex flex-col items-center select-none pointer-events-none"
      data-testid="tactical-compass"
    >
      {/* Floating bearing tape with feathered edge mask (zero opaque box!) */}
      <div
        className="relative h-7 overflow-hidden"
        style={{
          width: `${widthPx}px`,
          maskImage:
            'linear-gradient(to right, transparent 0%, black 16%, black 84%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0%, black 16%, black 84%, transparent 100%)',
        }}
      >
        {/* Hairline horizon baseline */}
        <div
          className="absolute bottom-[5px] inset-x-0 h-[1px]"
          style={{ background: 'rgba(148, 163, 184, 0.28)' }}
        />

        {/* Scrolling tick marks & cardinal labels */}
        {ticks.map((tk) => (
          <div
            key={tk.deg}
            className="absolute bottom-0 flex flex-col items-center"
            style={{ left: `${tk.x}px`, transform: 'translateX(-50%)' }}
          >
            {tk.label ? (
              <span
                className={`font-[family-name:var(--font-display)] leading-none mb-1 ${
                  tk.isNorth
                    ? 'text-[12px] font-bold text-amber-300'
                    : tk.isCardinal
                      ? 'text-[11px] font-bold text-slate-100'
                      : 'text-[9px] font-semibold text-slate-400'
                }`}
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}
              >
                {tk.label}
              </span>
            ) : (
              <span className="h-[11px]" />
            )}
            <span
              className={`block ${
                tk.isNorth
                  ? 'w-[2px] h-2 bg-amber-300'
                  : tk.isCardinal
                    ? 'w-[1.5px] h-1.5 bg-slate-200/85'
                    : 'w-[1px] h-1 bg-slate-400/55'
              }`}
            />
          </div>
        ))}

        {/* Live objective diamond pinned right onto the compass tape */}
        {objectivePip && (
          <div
            className="absolute bottom-[2px]"
            style={{ left: `${objectivePip.x}px`, transform: 'translateX(-50%)' }}
          >
            <div
              className={`w-2.5 h-2.5 rotate-45 border ${
                objectivePip.kind === 'control_center' || objectivePip.kind === 'boss'
                  ? 'bg-amber-400 border-amber-100 shadow-[0_0_8px_rgba(251,191,36,0.9)]'
                  : objectivePip.kind === 'exit'
                    ? 'bg-cyan-300 border-white shadow-[0_0_8px_rgba(34,211,238,0.9)]'
                    : 'bg-red-500 border-red-200 shadow-[0_0_6px_rgba(239,68,68,0.85)]'
              }`}
            />
          </div>
        )}
      </div>

      {/* Center crisp heading pointer + tabular degree chip */}
      <div className="flex flex-col items-center -mt-[2px]">
        <svg viewBox="0 0 12 6" className="w-2.5 h-1.5" aria-hidden="true">
          <polygon points="6,0 11,6 1,6" fill="#38bdf8" />
        </svg>
        <span
          className="font-[family-name:var(--font-mono)] text-[10px] font-semibold tracking-[0.14em] text-slate-200/95 leading-none mt-0.5"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}
        >
          {headingRounded.toString().padStart(3, '0')}°
        </span>
      </div>
    </div>
  );
}
