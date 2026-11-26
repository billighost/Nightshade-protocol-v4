interface TitleOverlayProps {
  onStart: () => void;
}

export function TitleOverlay({ onStart }: TitleOverlayProps) {
  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between pointer-events-none">
      {/* Directional left-edge scrim keeping typography crisp while right-side operative shines clearly */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(8,11,16,0.88) 0%, rgba(8,11,16,0.52) 34%, rgba(8,11,16,0.04) 64%, rgba(8,11,16,0.14) 100%)',
        }}
      />

      {/* Asymmetric Left-Third Title Emblem & Primary CTA */}
      <div className="relative z-10 flex-1 flex items-center px-8 md:px-16 max-w-2xl">
        <div className="flex flex-col items-start gap-6">
          <div className="flex items-center gap-3.5">
            <svg
              viewBox="0 0 48 48"
              className="w-11 h-11 shrink-0"
              aria-hidden="true"
            >
              <polygon
                points="24,3 44,14 44,34 24,45 4,34 4,14"
                fill="#0b111b"
                stroke="#06b6d4"
                strokeWidth="2.2"
              />
              <polygon
                points="24,11 36,18 36,30 24,37 12,30 12,18"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.4"
                strokeOpacity="0.85"
              />
              <line x1="24" y1="6" x2="24" y2="15" stroke="#22d3ee" strokeWidth="2" />
              <line x1="24" y1="33" x2="24" y2="42" stroke="#22d3ee" strokeWidth="2" />
              <circle cx="24" cy="24" r="3.5" fill="#f59e0b" />
            </svg>
            <span className="font-[family-name:var(--font-mono)] text-xs tracking-[0.26em] uppercase text-cyan-400">
              8-Floor Vertical Hideout · Tactical Proving Ground
            </span>
          </div>

          <h1
            className="font-[family-name:var(--font-display)] font-bold text-5xl md:text-6xl leading-[0.98] tracking-tight text-slate-50"
            style={{
              textWrap: 'balance',
              textShadow: '0 6px 28px rgba(0, 0, 0, 0.72)',
            }}
          >
            NIGHTSHADE
            <span className="block text-cyan-400">PROTOCOL</span>
          </h1>

          <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-md">
            Master fluid third-person gunplay, active-timing reloads, and thermal SMG cryo-venting
            across an 8-floor subterranean hideout.
          </p>

          <div className="flex items-center gap-4 pt-2 pointer-events-auto">
            <button
              type="button"
              data-start="true"
              onClick={onStart}
              className="px-7 py-3.5 rounded-sm bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 font-[family-name:var(--font-display)] font-bold text-base tracking-wider uppercase transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              style={{ boxShadow: '0 0 28px rgba(6, 182, 212, 0.35)' }}
            >
              Enter Firing Bay
            </button>
          </div>
        </div>
      </div>

      {/* Single Flat Borderless Control Hint along Bottom Safe Margin */}
      <div className="relative z-10 px-8 md:px-16 pb-6 text-xs text-slate-400 font-[family-name:var(--font-mono)] tracking-wide">
        WASD Move · Shift Sprint · C Crouch · Space Jump · Shift+Space / V Roll · LMB Fire · RMB Aim · R Reload/Vent · 1-3 Swap · E Interact · Q Shoulder
      </div>
    </div>
  );
}
