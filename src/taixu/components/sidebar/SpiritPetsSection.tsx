import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface Props {
  pets: any[];
  onOpenDetail: (item: { label: string; data: any; type: 'pet' }) => void;
}

const SpiritPetsSection: React.FC<Props> = ({ pets = [], onOpenDetail }) => {
  const [isOpen, setIsOpen] = useState(false);
  const list = Array.isArray(pets)
    ? pets
    : pets && typeof pets === 'object'
      ? Object.entries(pets).map(([name, data]) => ({
          ...(data as any),
          名称: (data as any)?.名称 ?? name
        }))
      : [];

  return (
    <section className="mb-8">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between text-emerald-800 font-bold mb-4 border-b border-emerald-200 pb-2"
      >
        契约灵宠
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`space-y-3 transition-all ${isOpen ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
        {list.length === 0 ? (
          <div className="w-full text-left p-3 bg-white/40 border border-emerald-100 rounded-lg text-sm text-slate-400 italic font-bold">
            暂无契约灵宠
          </div>
        ) : (
          list.map((pet, idx) => (
            <button
              key={`${pet.名称 || '灵宠'}-${idx}`}
              onClick={() => onOpenDetail({ label: pet.名称 || '灵宠', data: pet, type: 'pet' })}
              className="w-full p-3 bg-white/40 border border-emerald-100 rounded-lg shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-800 font-bold">{pet.名称 || '未命名灵宠'}</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {pet.境界 || '未知境界'}
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 font-medium text-left">
                状态：{pet.状态 || '正常'}
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
};

export default SpiritPetsSection;
