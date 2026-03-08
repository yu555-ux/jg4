import React, { useEffect } from 'react';

interface Props {
  onStartNewGame: () => void;
  onContinueGame: () => void;
  onExit?: () => void;
}

const TitleScreen: React.FC<Props> = ({ onStartNewGame, onContinueGame, onExit }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        onContinueGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onContinueGame]);

  const handleExit = () => {
    if (onExit) onExit();
  };

  return (
    <div className="fixed inset-0 z-[980] flex items-center justify-center bg-slate-400 text-slate-900">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 22% 24%, rgba(6,78,59,0.6), transparent 58%), radial-gradient(circle at 78% 28%, rgba(13,116,107,0.5), transparent 60%), radial-gradient(circle at 50% 80%, rgba(100,116,139,0.7), transparent 52%)'
        }}
      />
      <div className="absolute inset-0 opacity-[0.16] bg-[radial-gradient(circle_at_1px_1px,_rgba(15,23,42,0.75)_1px,_transparent_0)] [background-size:18px_18px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-500/60 via-transparent to-slate-600/40" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-[4vw] inset-y-[4vh] rounded-[40px] border border-teal-200/55 shadow-[0_50px_140px_rgba(8,47,73,0.35)]" />
        <div className="absolute inset-x-[5.5vw] inset-y-[5.5vh] rounded-[34px] border border-teal-200/35" />
        <div className="absolute inset-x-[7vw] inset-y-[7vh] rounded-[28px] border border-teal-200/20" />
        <div className="absolute left-0 top-0 h-full w-[24vw] bg-gradient-to-r from-slate-500/80 via-slate-400/40 to-transparent" />
        <div className="absolute right-0 top-0 h-full w-[24vw] bg-gradient-to-l from-slate-500/80 via-slate-400/40 to-transparent" />
        <div className="absolute top-8 left-1/2 -translate-x-1/2 h-[3px] w-[72vw] bg-gradient-to-r from-transparent via-teal-300/80 to-transparent" />
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 h-[3px] w-[72vw] bg-gradient-to-r from-transparent via-teal-300/70 to-transparent" />
        <div className="absolute left-[5vw] top-[14vh] h-60 w-60 rounded-full border border-teal-200/55 blur-[1px]" />
        <div className="absolute right-[7vw] bottom-[12vh] h-72 w-72 rounded-full border border-teal-200/50 blur-[1px]" />
        <div className="absolute left-[9vw] bottom-[24vh] h-52 w-[2px] bg-gradient-to-b from-teal-300/80 via-teal-200/40 to-transparent" />
        <div className="absolute right-[11vw] top-[20vh] h-52 w-[2px] bg-gradient-to-b from-teal-300/80 via-teal-200/40 to-transparent" />
        <div className="absolute left-1/2 top-[10vh] -translate-x-1/2 h-28 w-28 rounded-full border border-teal-200/45 blur-[1px]" />
        <div className="absolute left-1/2 bottom-[10vh] -translate-x-1/2 h-24 w-24 rounded-full border border-teal-200/40 blur-[1px]" />
        <div className="absolute left-[18vw] top-[34vh] h-16 w-16 rounded-full border border-teal-200/35" />
        <div className="absolute right-[20vw] bottom-[32vh] h-20 w-20 rounded-full border border-teal-200/30" />
        <div className="absolute left-[24vw] bottom-[18vh] h-[1px] w-[14vw] bg-gradient-to-r from-teal-300/70 to-transparent" />
        <div className="absolute right-[26vw] top-[18vh] h-[1px] w-[14vw] bg-gradient-to-l from-teal-300/70 to-transparent" />
        <div className="absolute left-1/2 top-[26vh] -translate-x-1/2 h-[1px] w-[22vw] bg-gradient-to-r from-transparent via-teal-300/70 to-transparent" />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-10">
        <div className="text-6xl tracking-[0.44em] font-number text-teal-950 drop-shadow-[0_14px_28px_rgba(13,148,136,0.45)]">
          太虚界
        </div>
        <div className="text-sm tracking-[0.5em] text-teal-900/80">云影玄门 · 天机未启</div>
        <div className="flex flex-col items-center gap-6 w-full">
          <button
            className="w-[360px] sm:w-[500px] px-16 py-6 rounded-[34px] border border-teal-300/90 text-teal-950 text-2xl tracking-wider bg-gradient-to-b from-teal-50/95 via-teal-50/85 to-teal-100/70 backdrop-blur-md shadow-[0_26px_70px_rgba(13,148,136,0.35)] hover:from-teal-50 hover:to-teal-100/80 hover:border-teal-200 transition-colors"
            onClick={onStartNewGame}
            aria-label="开启游戏"
          >
            开启游戏
          </button>
          <button
            className="w-[360px] sm:w-[500px] px-16 py-6 rounded-[34px] border border-teal-300/75 text-teal-950 text-2xl tracking-wider bg-gradient-to-b from-teal-50/90 via-teal-50/80 to-teal-100/65 backdrop-blur-md shadow-[0_26px_70px_rgba(13,148,136,0.3)] hover:from-teal-50 hover:to-teal-100/75 hover:border-teal-200 transition-colors"
            onClick={onContinueGame}
            aria-label="继续游戏"
          >
            继续游戏
          </button>
          <button
            className="w-[360px] sm:w-[500px] px-16 py-6 rounded-[34px] border border-teal-300/60 text-teal-900 text-2xl tracking-wider bg-gradient-to-b from-teal-50/80 via-teal-50/70 to-teal-100/55 backdrop-blur-md shadow-[0_24px_64px_rgba(13,148,136,0.26)] hover:from-teal-50 hover:to-teal-100/68 hover:border-teal-200 transition-colors"
            onClick={handleExit}
            aria-label="退出"
          >
            退出
          </button>
        </div>
      </div>
    </div>
  );
};

export default TitleScreen;
