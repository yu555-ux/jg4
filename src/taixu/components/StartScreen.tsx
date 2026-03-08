import React, { useEffect } from 'react';

interface Props {
  onStart: () => void;
}

const StartScreen: React.FC<Props> = ({ onStart }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        onStart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart]);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950 text-slate-100">
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(16,185,129,0.25), transparent 40%), radial-gradient(circle at 80% 30%, rgba(56,189,248,0.2), transparent 45%), radial-gradient(circle at 50% 80%, rgba(129,140,248,0.25), transparent 45%)' }} />
      <div className="relative z-10 flex flex-col items-center">
        <button
          className="text-5xl tracking-[0.45em] font-number text-emerald-200 hover:text-emerald-100 transition-colors"
          onClick={onStart}
          aria-label="进入太虚界"
        >
          太虚界
        </button>
      </div>
    </div>
  );
};

export default StartScreen;
