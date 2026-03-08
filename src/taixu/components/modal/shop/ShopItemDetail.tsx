import { Pencil, Sparkles, X } from 'lucide-react';
import React from 'react';
import { EffectList } from '../shared';

interface ShopItemDetailProps {
  item: any;
  onBack: () => void;
  onEdit: () => void;
}

const ShopItemDetail: React.FC<ShopItemDetailProps> = ({ item, onBack, onEdit }) => (
  <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
    <button
      onClick={onBack}
      className="mb-6 flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold text-sm transition-colors"
    >
      <X className="w-4 h-4 rotate-45" /> 返回商城列表
    </button>

    <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
      <div className="p-6 bg-linear-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded uppercase">{item.品阶}</span>
              <span className="text-xs text-slate-400 font-bold tracking-widest">{item.分类}</span>
            </div>
            <div className="flex items-center gap-3">
              <h4 className="text-3xl font-serif font-bold text-slate-900">{item.名称}</h4>
              <button
                onClick={onEdit}
                className="p-1.5 bg-white border border-emerald-100 rounded-lg text-emerald-500 hover:bg-emerald-50 hover:shadow-sm transition-all shadow-xs"
                title="编辑全部信息"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="text-right min-w-[100px]">
            <div className="text-[10px] text-slate-400 font-black uppercase tracking-tighter mb-1">仙缘价格</div>
            <div className="text-2xl font-black text-amber-500 flex items-center justify-end gap-1">
              <Sparkles className="w-5 h-5" />
              {item.价格}
            </div>
          </div>
        </div>
        <p className="text-slate-600 leading-relaxed font-medium italic border-t border-emerald-100/50 pt-4 mt-4">
          {item.描述}
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {item.分类 === '特殊' && item.内容?.length > 0 && (
          <div className="space-y-3">
            <h5 className="text-xs font-black text-emerald-800 uppercase tracking-widest pl-2 border-l-2 border-emerald-400 ml-1">记载内容</h5>
            <div className="flex flex-col gap-2">
              {item.内容.map((text: string, index: number) => (
                <div key={index} className="p-4 bg-white border border-emerald-50 rounded-xl shadow-xs group hover:border-emerald-200 transition-all">
                  <div className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shadow-[0_0_6px_rgba(16,185,129,0.35)]" />
                    <span className="text-sm font-medium text-slate-700 leading-relaxed">{text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {['功法', '武器', '装备', '法宝', '着装'].includes(item.分类) && (
          <div className="space-y-3">
            <h5 className="text-xs font-black text-emerald-800 uppercase tracking-widest pl-2 border-l-2 border-cyan-400 ml-1">固定加成</h5>
            <div className="flex flex-col gap-2">
              {(item.固定加成?.length > 0) ? item.固定加成.map((eff: string, index: number) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-white border border-emerald-50 rounded-xl shadow-xs group hover:border-cyan-200 transition-all">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full group-hover:scale-125 transition-transform shadow-[0_0_8px_rgba(34,211,238,0.4)]" />
                  <span className="text-sm font-bold text-slate-700">{eff}</span>
                </div>
              )) : (
                <div className="text-xs text-slate-300 italic pl-4">暂无固定加成</div>
              )}
            </div>
          </div>
        )}
        {(item.分类 === '功法' && Array.isArray(item.招式) && item.招式.length > 0) ? (
          <div className="space-y-3">
            <h5 className="text-xs font-black text-emerald-800 uppercase tracking-widest pl-2 border-l-2 border-orange-400 ml-1">招式神通</h5>
            <div className="flex flex-col gap-3">
              {item.招式.map((move: any, index: number) => (
                <div key={index} className="p-4 bg-white border border-emerald-50 rounded-xl shadow-xs space-y-2 group hover:border-orange-200 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full group-hover:scale-125 transition-transform shadow-[0_0_8px_rgba(251,146,60,0.4)]" />
                    <span className="text-sm font-black text-slate-800">{move.名称 || '未知招式'}</span>
                  </div>
                  <div className="text-xs text-slate-500 pl-4.5 italic leading-relaxed">
                    {move.描述}
                  </div>
                  <div className="flex flex-wrap gap-2 pl-4.5">
                    {move.效果?.map((eff: string, idx: number) => (
                      <span key={idx} className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-bold rounded">
                        {eff}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : item.分类 !== '特殊' ? (
          <EffectList
            effects={['武器', '装备', '法宝', '着装', '丹药', '阵符'].includes(item.分类) ? item.效果 : []}
          />
        ) : null}
      </div>
    </div>
  </div>
);

export default ShopItemDetail;
