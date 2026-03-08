import React, { useState } from 'react';
import { ScrollText, BookOpen, ChevronDown } from 'lucide-react';

interface Props {
  cultivation: any;
  onOpenDetail: (item: { label: string; data: any; type: 'cultivation' }) => void;
}

const CultivationSection: React.FC<Props> = ({ cultivation = {}, onOpenDetail }) => {
  const [isOpen, setIsOpen] = useState(false);
  const mainSlot = { 
    label: '主修功法', 
    data: cultivation?.主修, 
    icon: <ScrollText className="w-3.5 h-3.5" /> 
  };
  
  const subSlots = [0, 1, 2].map(i => ({
    label: `辅修位 ${i + 1}`,
    data: cultivation?.辅修?.[i],
    icon: <BookOpen className="w-3.5 h-3.5" />
  }));

  const allSlots = [mainSlot, ...subSlots];

  return (
    <section className="mb-8">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between text-emerald-800 font-bold mb-4 border-b border-emerald-200 pb-2"
      >
        当前功法
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`space-y-3 transition-all ${isOpen ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
        {allSlots.map((slot, idx) => (
          <button
            key={idx}
            onClick={() => slot.data && onOpenDetail({ label: slot.label, data: slot.data, type: 'cultivation' })}
            className={`w-full flex justify-between items-center p-3 border-2 rounded-xl transition-all group shadow-sm active:scale-[0.98] ${
              idx === 0 
                ? 'bg-emerald-50/50 border-emerald-400 hover:bg-emerald-100/60' 
                : 'bg-white/40 border-emerald-300 hover:border-emerald-400 hover:bg-white/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="text-emerald-500 opacity-60 group-hover:opacity-100 transition-opacity">
                {slot.icon}
              </div>
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">{slot.label}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className={`text-sm font-bold transition-colors ${slot.data ? 'text-slate-800 group-hover:text-emerald-700' : 'text-slate-300 italic'}`}>
                {slot.data?.名称 || '未参悟'}
              </span>
              {slot.data?.掌握程度 && (
                <span className="text-[9px] text-emerald-600 font-black uppercase tracking-tighter">
                  {slot.data.掌握程度}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default CultivationSection;
