import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  bonds: any;
  onOpenModal: (type: string, data?: any) => void;
}

const BondsSection: React.FC<Props> = ({ bonds, onOpenModal }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <section className="mb-8">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between text-emerald-800 font-bold mb-4 border-b border-emerald-200 pb-2"
      >
        尘缘羁绊
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`space-y-2 transition-all ${isOpen ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
        {Object.keys(bonds || {}).length === 0 ? (
          <button
            onClick={() => onOpenModal('bonds')}
            className="w-full text-left p-3 bg-white/40 border border-emerald-100 rounded-lg hover:bg-emerald-50 transition-colors flex justify-between items-center group"
          >
            <span className="text-sm text-slate-400 italic font-bold">尚未结识同道...</span>
            <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
          </button>
        ) : (
          Object.keys(bonds).map(name => (
            <button
              key={name}
              onClick={() => onOpenModal('bonds', name)}
              className="w-full text-left p-3 bg-white/40 border border-emerald-100 rounded-lg hover:bg-emerald-50 transition-colors flex justify-between items-center group"
            >
              <span className="text-sm text-slate-800 font-bold">{name}</span>
              <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </button>
          ))
        )}
      </div>
    </section>
  );
};

export default BondsSection;
