import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  onOpenModal: (type: string, data?: any) => void;
}

const SystemSettingsGroup: React.FC<Props> = ({ onOpenModal }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <section className="mb-8">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between text-emerald-800 font-bold mb-4 border-b border-emerald-200 pb-2"
      >
        系统设置
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`space-y-2 transition-all ${isOpen ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
        <button
          onClick={() => onOpenModal('settings')}
          className="w-full text-left p-3 bg-white/40 border border-emerald-100 rounded-lg hover:bg-emerald-50 transition-colors flex justify-between items-center group"
        >
          <span className="text-sm text-slate-800 font-bold">阅读展示</span>
          <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
        </button>
        <button
          onClick={() => onOpenModal('api_mode')}
          className="w-full text-left p-3 bg-white/40 border border-emerald-100 rounded-lg hover:bg-emerald-50 transition-colors flex justify-between items-center group"
        >
          <span className="text-sm text-slate-800 font-bold">API模式</span>
          <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
        </button>
        <button
          onClick={() => onOpenModal('memory_storage')}
          className="w-full text-left p-3 bg-white/40 border border-emerald-100 rounded-lg hover:bg-emerald-50 transition-colors flex justify-between items-center group"
        >
          <span className="text-sm text-slate-800 font-bold">记忆储存</span>
          <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </section>
  );
};

export default SystemSettingsGroup;
