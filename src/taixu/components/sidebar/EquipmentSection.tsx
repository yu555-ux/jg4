import React, { useState } from 'react';
import { Sword, Shield, Sparkles, ChevronDown } from 'lucide-react';

interface Props {
  equipment: any;
  onOpenDetail: (item: { label: string; data: any; type: 'equipment' }) => void;
}

const EquipmentSection: React.FC<Props> = ({ equipment = {}, onOpenDetail }) => {
  const [isOpen, setIsOpen] = useState(false);
  const weaponSlot = { label: '武器', data: equipment?.武器, icon: <Sword className="w-3.5 h-3.5" /> };
  
  const armorSlots = [0, 1, 2, 3].map(i => ({
    label: `装备位 ${i + 1}`,
    data: equipment?.装备?.[i],
    icon: <Shield className="w-3.5 h-3.5" />
  }));

  const treasureSlots = [0, 1].map(i => ({
    label: `法宝位 ${i + 1}`,
    data: equipment?.法宝?.[i],
    icon: <Sparkles className="w-3.5 h-3.5" />
  }));

  const allSlots = [weaponSlot, ...armorSlots, ...treasureSlots];

  return (
    <section className="mb-8">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between text-emerald-800 font-bold mb-4 border-b border-emerald-200 pb-2"
      >
        当前装备
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`space-y-3 transition-all ${isOpen ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
        {allSlots.map((slot, idx) => (
          <button
            key={idx}
            onClick={() => slot.data && onOpenDetail({ label: slot.label, data: slot.data, type: 'equipment' })}
            className="w-full flex justify-between items-center p-3 bg-white/40 border-2 border-emerald-300 rounded-xl hover:border-emerald-400 hover:bg-white/60 transition-all group shadow-sm active:scale-[0.98]"
          >
            <div className="flex items-center gap-2">
              <div className="text-emerald-500 opacity-60 group-hover:opacity-100 transition-opacity">
                {slot.icon}
              </div>
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">{slot.label}</span>
            </div>
            <span className={`text-sm font-bold transition-colors ${slot.data ? 'text-slate-800 group-hover:text-emerald-700' : 'text-slate-300 italic'}`}>
              {slot.data?.名称 || '空置'}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default EquipmentSection;
