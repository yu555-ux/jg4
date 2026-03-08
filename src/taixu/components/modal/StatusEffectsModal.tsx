import React, { useState } from 'react';
import { EffectList } from './shared';
import { X, ShieldAlert } from 'lucide-react';

interface StatusEffectsModalProps {
  data: Record<string, any>;
}

const StatusEffectsModal: React.FC<StatusEffectsModalProps> = ({ data }) => {
  const [selectedItem, setSelectedItem] = useState<{ name: string; data: any } | null>(null);

  const statuses = Object.entries(data || {}).map(([name, status]) => ({
    name,
    data: status
  }));

  if (selectedItem) {
    const item = selectedItem.data;
    return (
      <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
        <button
          onClick={() => setSelectedItem(null)}
          className="mb-6 flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold text-sm transition-colors"
        >
          <X className="w-4 h-4 rotate-45" /> 返回列表
        </button>

        <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          <div className="p-6 bg-linear-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-0.5 text-white text-[10px] font-black rounded uppercase tracking-wider bg-amber-500">
                  当前状态
                </span>
                <span className="px-2 py-0.5 text-[10px] font-black rounded uppercase tracking-wider bg-emerald-500/10 text-emerald-700 border border-emerald-200">
                  {item.持续时间 || '未知'}
                </span>
              </div>
              <h4 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">{selectedItem.name}</h4>
              <p className="text-slate-600 text-sm leading-relaxed font-medium italic mt-4 border-t border-emerald-100/50 pt-4">
                {item.描述 || '暂无详细描述。'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {(item.固定加成?.length > 0) && (
              <div className="space-y-3">
                <h5 className="text-xs font-black text-emerald-800 uppercase tracking-[0.3em] pl-2 border-l-2 border-cyan-400 ml-1">固定加成</h5>
                <div className="grid grid-cols-1 gap-2">
                  {item.固定加成.map((eff: string, i: number) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-white border border-emerald-50 rounded-xl shadow-xs group hover:border-cyan-200 transition-all">
                      <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full group-hover:scale-125 transition-transform" />
                      <span className="text-sm font-bold text-slate-800">{eff}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <EffectList effects={item.效果} specialEffects={item.特殊效果} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {statuses.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
          <ShieldAlert className="w-16 h-16 opacity-10" />
          <p className="font-serif italic tracking-widest">目前无任何特殊状态...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {statuses.map((item, i) => (
            <div
              key={item.name}
              onClick={() => setSelectedItem(item)}
              className="p-4 bg-white border border-emerald-100 rounded-2xl group hover:border-emerald-400 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden flex items-center gap-4 animate-in zoom-in-95"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="p-3 rounded-xl bg-amber-50 text-amber-500">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                   <span className="text-[8px] font-black uppercase tracking-tighter text-amber-400">
                    STATUS
                  </span>
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {item.data?.持续时间 || '未知'}
                  </span>
                </div>
                <h5 className="text-base font-bold text-slate-800 truncate">{item.name}</h5>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StatusEffectsModal;
