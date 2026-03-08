import React, { useEffect, useState } from 'react';

interface Props {
  onDone?: () => void;
  durationMs?: number;
  title?: string;
  subtitle?: string;
}

const LoadingScreen: React.FC<Props> = ({ onDone, durationMs = 1200, title = '天机推演', subtitle = '正在构筑开局命数' }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setProgress(pct);
      if (pct >= 100) {
        window.clearInterval(timer);
        if (onDone) {
          setTimeout(onDone, 120);
        }
      }
    }, 40);
    return () => window.clearInterval(timer);
  }, [durationMs, onDone]);

  return (
    <div className="fixed inset-0 z-[970] flex items-center justify-center bg-slate-200 text-slate-100">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 24%, rgba(6,78,59,0.45), transparent 58%), radial-gradient(circle at 82% 28%, rgba(13,116,107,0.4), transparent 60%), radial-gradient(circle at 50% 82%, rgba(100,116,139,0.65), transparent 52%)'
        }}
      />
      <div className="absolute inset-0 opacity-[0.14] bg-[radial-gradient(circle_at_1px_1px,_rgba(15,23,42,0.75)_1px,_transparent_0)] [background-size:18px_18px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-500/60 via-transparent to-slate-600/40" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-[5vw] inset-y-[6vh] rounded-[38px] border border-teal-200/45 shadow-[0_50px_140px_rgba(8,47,73,0.35)]" />
        <div className="absolute inset-x-[6.5vw] inset-y-[7.5vh] rounded-[32px] border border-teal-200/30" />
        <div className="absolute left-0 top-0 h-full w-[22vw] bg-gradient-to-r from-slate-500/80 via-slate-400/35 to-transparent" />
        <div className="absolute right-0 top-0 h-full w-[22vw] bg-gradient-to-l from-slate-500/80 via-slate-400/35 to-transparent" />
        <div className="absolute top-10 left-1/2 -translate-x-1/2 h-[2px] w-[70vw] bg-gradient-to-r from-transparent via-teal-300/70 to-transparent" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 h-[2px] w-[70vw] bg-gradient-to-r from-transparent via-teal-300/60 to-transparent" />
      </div>
      <div className="relative z-10 w-[360px] sm:w-[520px] text-center animate-in fade-in duration-500">
        <div className="text-2xl tracking-[0.4em] text-teal-200 mb-6">{title}</div>
        <div className="h-2 w-full rounded-full bg-slate-800/70 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-400 via-cyan-400 to-teal-300 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-3 text-sm text-slate-300">{subtitle} · {progress}%</div>
      </div>
    </div>
  );
};

export default LoadingScreen;
