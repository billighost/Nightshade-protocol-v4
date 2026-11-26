import type { HudSnapshot } from '../game/core/types';

interface PauseModalProps {
  hud: HudSnapshot;
  onResume: () => void;
  onResetRange: () => void;
  onReturnTitle: () => void;
}

export function PauseModal({
  hud,
  onResume,
  onResetRange,
  onReturnTitle,
}: PauseModalProps) {
  const accuracy =
    hud.shotsFired > 0 ? Math.round((hud.hits / hud.shotsFired) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#06090e]/80 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-modal-title"
    >
      <div className="hud-panel-accent rounded-sm w-[min(420px,92vw)] p-7 flex flex-col gap-6">
        <div>
          <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.22em] text-cyan-400">
            Simulation Suspended
          </span>
          <h2
            id="pause-modal-title"
            className="font-[family-name:var(--font-display)] font-bold text-3xl text-slate-50 mt-1"
          >
            Paused
          </h2>
        </div>

        {/* 3 Clean Tabular Telemetry Stats */}
        <div className="grid grid-cols-3 gap-4 py-4 border-y border-slate-700/60">
          <div>
            <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-slate-400">
              Score
            </div>
            <div className="hud-numeral text-2xl font-bold text-slate-50 mt-1">
              {hud.score}
            </div>
          </div>
          <div>
            <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-slate-400">
              Accuracy
            </div>
            <div className="hud-numeral text-2xl font-bold text-cyan-300 mt-1">
              {accuracy}%
            </div>
          </div>
          <div>
            <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-slate-400">
              Best Streak
            </div>
            <div className="hud-numeral text-2xl font-bold text-amber-400 mt-1">
              {hud.bestStreak}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 rounded-sm bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-[family-name:var(--font-display)] font-bold text-sm uppercase tracking-wider transition-colors cursor-pointer"
          >
            Resume
          </button>

          <button
            type="button"
            onClick={() => {
              onResetRange();
              onResume();
            }}
            className="w-full py-2.5 rounded-sm bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium transition-colors cursor-pointer"
          >
            Reset Range Targets
          </button>

          <button
            type="button"
            onClick={onReturnTitle}
            className="w-full py-2.5 rounded-sm border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-slate-100 text-sm font-medium transition-colors cursor-pointer"
          >
            Title Screen
          </button>
        </div>
      </div>
    </div>
  );
}
