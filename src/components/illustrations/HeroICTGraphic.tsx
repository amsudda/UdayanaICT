export function HeroICTGraphic({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`landing-tech pointer-events-none absolute inset-0 select-none overflow-hidden ${className}`}
    >
      <svg
        className="landing-tech-circuit absolute inset-0 h-full w-full text-slate-300 dark:text-slate-700"
        viewBox="0 0 1600 760"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <g className="landing-circuit-paths" stroke="currentColor" strokeWidth="1.15" opacity="0.95">
          <path pathLength="1" d="M0 202H42L82 242V302" />
          <path pathLength="1" d="M18 36H228" />
          <path pathLength="1" d="M576 0V102L612 138H688L720 170V286" />
          <path pathLength="1" d="M1440 0V64L1484 108H1600" />
          <path pathLength="1" d="M1436 454H1512L1550 492H1600" />
          <path pathLength="1" d="M1294 760V704L1356 642H1438" />
          <path pathLength="1" d="M560 760V704L598 666H742" />
          <path pathLength="1" d="M38 516V650" />
        </g>

        <g className="landing-circuit-flow" stroke="#f51f43" strokeWidth="2" strokeLinecap="round">
          <path pathLength="1" d="M576 0V102L612 138H688L720 170V286" />
          <path pathLength="1" d="M1440 0V64L1484 108H1600" />
          <path pathLength="1" d="M1294 760V704L1356 642H1438" />
        </g>

        <g className="landing-tech-pixels" fill="#f20d36" opacity="0.82">
          <rect x="25" y="192" width="9" height="9" rx="1" />
          <rect x="573" y="94" width="8" height="8" rx="1" />
          <rect x="1436" y="57" width="8" height="8" rx="1" />
          <rect x="1436" y="636" width="8" height="8" rx="1" />
        </g>

        <g className="landing-circuit-nodes" fill="#5799ed" opacity="0.9">
          <circle cx="82" cy="302" r="4" />
          <circle cx="720" cy="286" r="4" />
          <circle cx="1438" cy="454" r="4" />
          <circle cx="598" cy="666" r="4" />
        </g>

      </svg>

      <div className="landing-tech-code absolute left-[45.5%] top-[31%] hidden flex-col font-mono text-[11px] font-semibold leading-[1.55] text-blue-500/70 lg:flex dark:text-slate-300/70">
        <span className="landing-tech-code-mark" aria-hidden="true">&lt;/&gt;</span>
        <span>const</span>
        <span>function</span>
        <span className="text-red-500">return</span>
        <span>;</span>
      </div>

      <div className="landing-tech-braces absolute right-[8%] top-[20%] hidden font-mono text-4xl text-red-400/65 lg:block dark:text-red-400/55">
        &#123; &#125;
      </div>

      <div className="landing-tech-status absolute right-[1.8%] top-[31%] hidden rounded-2xl border border-slate-200/80 bg-white/85 px-5 py-3 font-mono text-[10px] font-semibold text-blue-500/75 shadow-[0_12px_30px_rgba(36,54,82,0.1)] backdrop-blur-md lg:block dark:border-slate-800/70 dark:bg-slate-900/70 dark:text-slate-300/65">
        <div className="flex items-center gap-2 tracking-wider">
          <span className="h-2 w-2 rounded-full bg-red-400" />
          SYSTEM ONLINE
        </div>
        <div className="mt-1 pl-4 tracking-[0.2em]">01 10 01 00</div>
      </div>

      <div className="landing-tech-api absolute right-[1.6%] top-[52%] hidden rounded-2xl border border-slate-200/80 bg-white/80 px-5 py-3 font-mono text-[10px] font-semibold leading-6 tracking-wider text-blue-500/75 shadow-[0_12px_30px_rgba(36,54,82,0.09)] backdrop-blur-md lg:block dark:border-slate-800/70 dark:bg-slate-900/65 dark:text-slate-300/65">
        <div>API &nbsp; • &nbsp; SQL</div>
        <div>class &nbsp; • &nbsp; if()</div>
      </div>

      <div className="landing-tech-binary absolute bottom-[19%] right-[4.5%] hidden font-mono text-[10px] font-semibold leading-5 tracking-[0.18em] text-blue-500/65 lg:block dark:text-slate-400/60">
        <div>01011001</div>
        <div>10100110</div>
      </div>

      <div className="landing-tech-concept absolute bottom-[12%] left-[11.5%] hidden rounded-xl border border-white/90 bg-white/75 px-5 py-3 shadow-[0_12px_40px_rgba(15,23,42,0.07)] backdrop-blur-md xl:block dark:border-slate-800/70 dark:bg-slate-900/65">
        <div className="flex items-center gap-2 text-[10px] font-bold tracking-wide text-blue-500/70 dark:text-slate-300/65">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          IDEA <span>→</span> CODE <span>→</span> IMPACT
        </div>
        <div className="mt-2 flex items-center gap-1">
          <span className="h-[3px] w-8 rounded-full bg-red-500" />
          <span className="h-[3px] w-16 rounded-full bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>

      <svg className="absolute bottom-0 left-0 h-[36%] w-[16%] text-red-200/40 dark:text-red-950/25" viewBox="0 0 300 300" fill="none" preserveAspectRatio="none">
        <path d="M-90 30C0 -5 35 90 120 170L280 330M100 155L-40 290" stroke="currentColor" strokeWidth="66" />
      </svg>
      <svg className="absolute bottom-0 right-0 h-[25%] w-[13%] text-red-200/50 dark:text-red-950/25" viewBox="0 0 300 220" fill="none" preserveAspectRatio="none">
        <path d="M50 290L240 90Q285 40 330 80" stroke="currentColor" strokeWidth="74" />
      </svg>
    </div>
  );
}
