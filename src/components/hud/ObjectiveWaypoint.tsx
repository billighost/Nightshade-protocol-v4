import type { ObjectiveWaypointSnapshot } from '../../game/hud/minimapMath';

interface ObjectiveWaypointProps {
  waypoint: ObjectiveWaypointSnapshot | null;
}

/**
 * Refined Halo / Breath of the Wild / Destiny 3D-to-2D Projected Waypoint Crest:
 * - High-priority Control Center / Exit waypoints use a crisp double-diamond shrine emblem
 *   with animated pulse halo & clean non-overlapping distance callout
 * - Standard hostile waypoints stay ultra-minimal so combat sightlines remain spotless
 */
export function ObjectiveWaypoint({ waypoint }: ObjectiveWaypointProps) {
  if (!waypoint) return null;

  // Hide hostile waypoint when close so combat sightline stays completely unobstructed
  if (waypoint.kind === 'hostile' && waypoint.distanceMeters < 6) return null;

  const isControlCenter = waypoint.kind === 'control_center';
  const isExit = waypoint.kind === 'exit';
  const isBoss = waypoint.kind === 'boss';
  const isShrine = isControlCenter || isExit;

  const strokeHex =
    waypoint.accent === 'amber'
      ? '#fbbf24'
      : waypoint.accent === 'crimson'
        ? '#f87171'
        : '#38bdf8';

  const textColor =
    waypoint.accent === 'amber'
      ? 'text-amber-300'
      : waypoint.accent === 'crimson'
        ? 'text-red-300'
        : 'text-cyan-300';

  const ringColor =
    waypoint.accent === 'amber'
      ? 'border-amber-300'
      : waypoint.accent === 'crimson'
        ? 'border-red-400'
        : 'border-cyan-300';

  return (
    <div
      className="fixed pointer-events-none select-none z-10 flex flex-col items-center"
      data-testid="objective-waypoint"
      data-waypoint-kind={waypoint.kind}
      style={{
        left: `${waypoint.screenX * 100}%`,
        top: `${waypoint.screenY * 100}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Sculpted Shrine / Objective Reticle */}
      <div className="relative flex items-center justify-center w-9 h-9">
        {(isShrine || isBoss) && (
          <div className={`hud-beacon-pulse absolute w-6 h-6 rotate-45 border-[1.6px] ${ringColor}`} />
        )}

        <svg
          viewBox="0 0 32 32"
          className={isShrine ? 'w-8 h-8' : 'w-6 h-6'}
          aria-hidden="true"
          style={{
            filter: `drop-shadow(0 0 ${isShrine ? '9px' : '5px'} ${strokeHex}aa)`,
          }}
        >
          {/* Outer faceted diamond */}
          <polygon
            points="16,3 29,16 16,29 3,16"
            fill="rgba(5, 11, 20, 0.84)"
            stroke={strokeHex}
            strokeWidth={isShrine ? '1.8' : '1.6'}
          />
          {isShrine ? (
            <>
              {/* Inner shrine chevron / descent marker */}
              <polygon points="16,8.5 23.5,16 16,23.5 8.5,16" fill="none" stroke={strokeHex} strokeWidth="1" opacity="0.65" />
              <polyline
                points="12.5,14.5 16,18.2 19.5,14.5"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="square"
              />
            </>
          ) : (
            <polygon points="16,11.5 20.5,16 16,20.5 11.5,16" fill={strokeHex} />
          )}
        </svg>

        {/* Off-screen directional edge arrow pointing toward the objective */}
        {!waypoint.onScreen && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: `rotate(${(waypoint.edgeAngleRad * 180) / Math.PI + 90}deg)`,
            }}
          >
            <svg viewBox="0 0 14 10" className="w-3.5 h-2.5 -translate-y-5" aria-hidden="true">
              <polygon points="7,0 13,9 7,6.5 1,9" fill={strokeHex} />
            </svg>
          </div>
        )}
      </div>

      {/* Crisp Non-Overlapping Label & Live Distance */}
      <div className="mt-0.5 flex flex-col items-center">
        <div
          className={`font-[family-name:var(--font-display)] text-[11px] font-bold uppercase tracking-[0.16em] whitespace-nowrap leading-none ${textColor}`}
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.98)' }}
        >
          {waypoint.label} · {waypoint.distanceMeters}M
        </div>
        {isShrine && (
          <div
            className="font-[family-name:var(--font-mono)] text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-100 whitespace-nowrap mt-0.5"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.98)' }}
          >
            {waypoint.sublabel}
          </div>
        )}
      </div>
    </div>
  );
}
