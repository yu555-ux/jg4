import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface Props {
  clothing: any;
  onOpenDetail: (item: { label: string; data: any; type: 'clothing' }) => void;
}

const ClothingSection: React.FC<Props> = ({ clothing = {}, onOpenDetail }) => {
  const [isOpen, setIsOpen] = useState(false);
  // 处理单槽位
  const singleSlots = [
    { label: '上衣', data: clothing?.上衣 },
    { label: '下衣', data: clothing?.下衣 },
    { label: '内衣', data: clothing?.内衣 },
    { label: '鞋子', data: clothing?.鞋子 },
    { label: '袜子', data: clothing?.袜子 },
  ];

  // 处理多槽位 (佩戴物)
  const accessories = Array.isArray(clothing?.佩戴物) ? clothing.佩戴物 : [];
  const accessorySlots = [0, 1, 2].map(i => ({
    label: `佩戴物 ${i + 1}`,
    data: accessories[i] || null
  }));

  const allSlots = [...singleSlots, ...accessorySlots];

  return (
    <section className="mb-8">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between text-emerald-800 font-bold mb-4 border-b border-emerald-200 pb-2"
      >
        当前着装
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`space-y-3 transition-all ${isOpen ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
        {allSlots.map((slot, idx) => (
          <button
            key={`${slot.label}-${idx}`}
            onClick={() => slot.data && onOpenDetail({ label: slot.label, data: slot.data, type: 'clothing' })}
            className="w-full flex justify-between items-center p-3 bg-white/40 border-2 border-emerald-300 rounded-xl hover:border-emerald-400 hover:bg-white/60 transition-all group shadow-sm active:scale-[0.98]"
          >
            <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">{slot.label}</span>
            <span className="text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
              {slot.data?.名称 || '空置'}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default ClothingSection;
