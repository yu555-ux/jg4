import React from 'react';

interface Props {
  name: string;
  talents: any;
  thoughts?: string;
  dependencyEval?: string;
  onOpenDetail: (item: { label: string; data: any; type: 'talent' }) => void;
}

const CharacterHeader: React.FC<Props> = ({ name, talents = {}, thoughts, dependencyEval, onOpenDetail }) => {
  const [showThoughts, setShowThoughts] = React.useState(false);
  const bubbleRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(event.target as Node)) {
        setShowThoughts(false);
      }
    };

    if (showThoughts) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showThoughts]);

  return (
    <section className="mb-8 mt-4">
      <h3 className="text-emerald-800 font-bold mb-4 border-b border-emerald-200 pb-2">
        仙缘之人
      </h3>
      <div className="flex flex-col items-center bg-white/40 p-4 rounded-xl border-2 border-emerald-100/50 mb-4 shadow-sm relative">
        <div
          className="cursor-pointer group relative"
          onClick={() => setShowThoughts(true)}
          title="点击查看内心想法"
        >
          <span className="text-2xl font-serif font-bold text-slate-800 tracking-widest mb-3 inline-block">
            {name}
            {dependencyEval && (
              <span className="text-sm italic text-slate-400 font-normal ml-2 tracking-normal">
                ({dependencyEval})
              </span>
            )}
          </span>

          {showThoughts && thoughts && (
            <div
              ref={bubbleRef}
              className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-64 p-4 bg-white/95 backdrop-blur-md border border-emerald-200 rounded-2xl shadow-xl z-50 animate-in fade-in zoom-in duration-200"
            >
              <div className="relative">
                <p className="text-emerald-900 text-sm leading-relaxed italic font-bold text-center">
                  「{thoughts}」
                </p>
                {/* 气泡小三角 */}
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 border-[10px] border-transparent border-b-white/95"></div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-2 mt-3">
          {Object.entries(talents || {}).map(([name, data]: [string, any]) => {
            const isHeaven = data.品阶?.includes('天');
            const isEarth = data.品阶?.includes('地');
            const isMystic = data.品阶?.includes('玄');

            const colorClass = isHeaven
              ? 'bg-amber-500/10 text-amber-700 border-amber-200 hover:bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
              : isEarth
              ? 'bg-purple-500/10 text-purple-700 border-purple-200 hover:bg-purple-500'
              : isMystic
              ? 'bg-blue-500/10 text-blue-700 border-blue-200 hover:bg-blue-500'
              : 'bg-emerald-500/10 text-emerald-700 border-emerald-200 hover:bg-emerald-500';

            return (
              <button
                key={name}
                onClick={() => onOpenDetail({ label: '天赋灵根', data: { 名称: name, ...data }, type: 'talent' })}
                className={`px-3 py-1 text-[10px] font-black rounded-full border transition-all active:scale-95 hover:text-white ${colorClass}`}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CharacterHeader;
