import { Sparkles } from 'lucide-react';
import React from 'react';

interface AuthorityModalProps {
  data: any;
  onUseAuthority?: (auth: any) => void;
  onUpgradeAuthority?: (auth: any) => void;
  currentAP?: number;
  onAddCommand?: (name: string, prompt: string) => void;
  onUpdateMvuData?: (newData: any) => void;
}

const AuthorityModal: React.FC<AuthorityModalProps> = ({ data, onUseAuthority, onUpgradeAuthority, currentAP = 0, onAddCommand, onUpdateMvuData }) => {
  if (!data) return null;

  const upgradeCost = data.data.升级所需行动点 || 0;
  const useCost = data.data.使用消耗点数 || 0;
  const canUpgrade = currentAP >= upgradeCost && data.data.当前等级 < data.data.最高等级;
  const canUse = currentAP >= useCost;

  const handleUpgrade = () => {
    if (!canUpgrade) return;
    onUpgradeAuthority?.(data);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
        <div className="p-6 bg-linear-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-2xl font-serif font-bold text-emerald-900">{data.name}</h4>
            <div className="flex items-center gap-2">
              {data.data.持续时间 && (
                <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black border border-emerald-200 uppercase tracking-wider">
                  {data.data.持续时间}
                </span>
              )}
              <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-[10px] font-black shadow-sm uppercase tracking-wider">
                等级 {data.data.当前等级} / {data.data.最高等级}
              </span>
            </div>
          </div>
          <p className="text-slate-600 leading-relaxed font-medium italic border-t border-emerald-100/50 pt-4 mt-4">
            {data.data.描述}
          </p>
        </div>

        <div className="space-y-4">
          <h5 className="text-xs font-black text-emerald-800 uppercase tracking-widest pl-2">权柄效果</h5>
          <div className="flex flex-col gap-3">
            {data.data.效果?.map((eff: string, i: number) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-white border border-emerald-50 rounded-xl shadow-xs group hover:border-emerald-200 transition-all">
                <span className="w-2 h-2 bg-emerald-400 rounded-full group-hover:scale-125 transition-transform shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                <span className="text-sm font-bold text-slate-800">{eff}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex justify-between items-center">
            <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest">升级所需</span>
            <span className="text-sm font-black text-amber-600 flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              {upgradeCost} AP
            </span>
          </div>
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center">
            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">使用消耗</span>
            <span className="text-sm font-black text-emerald-600 flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              {useCost} AP
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-emerald-50 flex justify-end gap-4">
        <button
          onClick={handleUpgrade}
          disabled={!canUpgrade}
          className={`px-8 py-4 rounded-full font-black text-sm transition-all uppercase tracking-widest ${canUpgrade
            ? 'bg-linear-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-100 hover:shadow-amber-200 hover:-translate-y-0.5 active:translate-y-0'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
        >
          {data.data.当前等级 >= data.data.最高等级 ? '已满级' : `升级权柄 (-${data.data.升级所需行动点} AP)`}
        </button>
        <button
          onClick={() => {
            if (!canUse) return;
            onUseAuthority?.(data);
          }}
          disabled={!canUse}
          className={`px-12 py-4 rounded-full font-black text-sm transition-all uppercase tracking-widest ${canUse
            ? 'bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-100 hover:shadow-emerald-200 hover:-translate-y-0.5 active:translate-y-0'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
        >
          使用权柄
        </button>
      </div>
    </div>
  );
};

export default AuthorityModal;
