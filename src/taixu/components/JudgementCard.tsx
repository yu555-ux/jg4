import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Swords, Binary, Sparkles, Zap } from 'lucide-react';
import { JudgementResultType } from '../utils/judgementParser';

interface JudgementCardProps {
  data: any;
}

export const JudgementCard: React.FC<JudgementCardProps> = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCalc, setShowCalc] = useState(false);

  const getResultColor = (result: JudgementResultType, isCombat?: boolean, isHit?: boolean, isCritical?: boolean) => {
    if (isCombat) {
      if (!isHit) return 'text-slate-400 shadow-none';
      if (isCritical) return 'text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]';
      return 'text-emerald-500';
    }
    switch (result) {
      case '大成功': return 'text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]';
      case '极难成功':
      case '成功': return 'text-emerald-500';
      case '失败': return 'text-slate-400';
      case '大失败': return 'text-red-600';
      default: return 'text-slate-600';
    }
  };

  const getResultBg = (result: JudgementResultType, isCombat?: boolean, isHit?: boolean, isCritical?: boolean) => {
    if (isCombat) {
      if (!isHit) return 'bg-slate-50/50 border-slate-200';
      if (isCritical) return 'bg-amber-50/50 border-amber-200';
      return 'bg-emerald-50/50 border-emerald-200';
    }
    switch (result) {
      case '大成功': return 'bg-amber-50/50 border-amber-200';
      case '极难成功':
      case '成功': return 'bg-emerald-50/50 border-emerald-200';
      case '失败': return 'bg-slate-50/50 border-slate-200';
      case '大失败': return 'bg-red-50/50 border-red-200';
      default: return 'bg-white/50 border-slate-100';
    }
  };

  const renderContent = () => {
    switch (data.type) {
      case 'attribute_basic':
        return (
          <div className="space-y-2 text-sm">
            {data.scenario && (
              <div className="text-slate-600 italic mb-2 px-2 border-l-2 border-amber-200">“{data.scenario}”</div>
            )}
            <div className="flex justify-between items-center bg-white/40 p-3 rounded-xl border border-white/60 shadow-inner">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">判定属性</span>
                <span className="font-black text-slate-800 text-base">{data.attribute}</span>
              </div>
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 bg-amber-200/20 blur-xl rounded-full"></div>
                <div className="text-xl font-serif text-amber-600/40 italic font-black relative z-10">VS</div>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">挑战门槛 (DC*10)</span>
                <span className="font-bold text-slate-800 font-number text-2xl leading-none">
                  {data.dc !== undefined ? data.dc * 10 : '???'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/60 border border-white/70 rounded-lg p-2">
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">基础属性值</div>
                <div className="font-number text-xl font-black text-slate-800">{data.currentValue ?? '???'}</div>
              </div>
              <div className="bg-white/60 border border-white/70 rounded-lg p-2">
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">当前气运</div>
                <div className="font-number text-xl font-black text-amber-600">{data.currentLuck ?? '???'}</div>
              </div>
              <div className="bg-white/60 border border-white/70 rounded-lg p-2">
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">最终成功率</div>
                <div className="font-number text-xl font-black text-emerald-600">{data.successRate ?? '???'}</div>
              </div>
              <div className="bg-white/60 border border-white/70 rounded-lg p-2">
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">最终投骰结果</div>
                <div className="font-number text-xl font-black text-blue-600">{data.finalDice ?? data.diceRoll ?? '???'}</div>
              </div>
            </div>
          </div>
        );
      case 'attribute_potential':
        return (
          <div className="space-y-3 text-sm">
            {data.scenario && (
              <div className="text-slate-600 italic mb-2 px-2 border-l-2 border-cyan-200">“{data.scenario}”</div>
            )}
            <div className="bg-linear-to-br from-cyan-50/50 to-blue-50/50 p-4 rounded-xl border border-cyan-100/50 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 text-cyan-100/20 rotate-12 transition-transform group-hover:scale-110">
                <Sparkles size={64} />
              </div>

              <div className="relative z-10">
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-[10px] uppercase text-cyan-600/60 font-black tracking-widest">潜质检定</span>
                  <span className="text-lg font-black text-slate-800">{data.attribute}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/60 border border-white/70 rounded-lg p-2">
                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">潜质属性值</div>
                    <div className="font-number text-xl font-black text-slate-800">{data.currentValue ?? '???'}</div>
                  </div>
                  <div className="bg-white/60 border border-white/70 rounded-lg p-2">
                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">当前气运</div>
                    <div className="font-number text-xl font-black text-amber-600">
                      {data.currentLuck ?? (data.attribute === '气运' ? data.currentValue : undefined) ?? '???'}
                    </div>
                  </div>
                  <div className="bg-white/60 border border-white/70 rounded-lg p-2">
                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">核心判定位</div>
                    <div className="font-number text-xl font-black text-emerald-600">{data.coreValue ?? data.diceRoll ?? '???'}</div>
                  </div>
                  <div className="bg-white/60 border border-white/70 rounded-lg p-2">
                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">最终投骰</div>
                    <div className="font-number text-xl font-black text-blue-600">{data.finalDice ?? data.diceRoll ?? '???'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'daoxin':
        return (
          <div className="space-y-2 text-sm">
            {data.scenario && (
              <div className="text-slate-600 italic mb-2">“{data.scenario}”</div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-indigo-50/30 p-2 rounded-lg border border-indigo-100/50">
                <div className="text-[10px] uppercase text-indigo-400 font-bold">恐怖等阶</div>
                <div className="font-bold text-indigo-900">{data.horrorLevel}</div>
              </div>
              <div className="bg-emerald-50/30 p-2 rounded-lg border border-emerald-100/50">
                <div className="text-[10px] uppercase text-emerald-400 font-bold">当前道心</div>
                <div className="font-bold text-slate-900 font-number text-lg">{data.currentDaoXin}</div>
              </div>
              <div className="bg-white/60 p-2 rounded-lg border border-white/70">
                <div className="text-[10px] uppercase text-slate-400 font-bold">核心判定位</div>
                <div className="font-number text-lg font-black text-emerald-600">{data.coreValue ?? '???'}</div>
              </div>
              <div className="bg-white/60 p-2 rounded-lg border border-white/70">
                <div className="text-[10px] uppercase text-slate-400 font-bold">最终投骰</div>
                <div className="font-number text-lg font-black text-blue-600">{data.finalDice ?? '???'}</div>
              </div>
            </div>
            {(data.loss || data.newState || data.update) && (
              <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1">
                {data.loss && <div className="text-xs text-rose-600 font-bold">道心损耗: <span className="font-number">{data.loss}</span></div>}
                {data.newState && <div className="text-xs text-slate-500">状态更新: <span className="font-number">{data.newState}</span></div>}
                {data.update && <div className="text-xs text-slate-500">更新: <span className="font-number">{data.update}</span></div>}
              </div>
            )}
          </div>
        );
      case 'combat':
        return (
          <div className="space-y-4 text-sm">
            {/* 功法标题栏 */}
            <div className="flex items-center justify-center gap-3 py-2 bg-rose-50/50 border-y border-rose-100/50">
              <span className="text-base font-black text-rose-800 tracking-wider font-serif">{data.method}</span>
              <div className="px-2 py-0.5 bg-rose-100 border border-rose-200 text-rose-700 text-[10px] rounded-md font-bold uppercase tracking-tighter shadow-sm">
                {data.rank}
              </div>
            </div>

            {/* 攻守对峙 */}
            {data.entities && data.entities.length >= 2 && (
              <div className="flex items-center justify-between px-4 py-2 relative">
                {/* Attacker */}
                <div className="flex-1 flex flex-col items-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">攻方</div>
                  <div className="font-black text-slate-800 text-lg text-center">{data.entities[0].name}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] text-slate-400">映射:</span>
                    <span className="font-number font-bold text-slate-600">{data.entities[0].realm}</span>
                  </div>
                </div>

                {/* VS Center */}
                <div className="flex flex-col items-center justify-center px-4 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 bg-rose-100/30 blur-lg rounded-full animate-pulse"></div>
                  </div>
                  <div className="text-rose-400/60 relative z-10"><Swords className="w-6 h-6" /></div>
                  <div className="text-[10px] font-black text-rose-300/60 uppercase tracking-tighter mt-1 relative z-10">Confront</div>
                </div>

                {/* Defender */}
                <div className="flex-1 flex flex-col items-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">防方</div>
                  <div className="font-black text-slate-800 text-lg text-center">{data.entities[1].name}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] text-slate-400">映射:</span>
                    <span className="font-number font-bold text-slate-600">{data.entities[1].realm}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 结果结算 */}
            <div className="space-y-2 pt-2 border-t border-slate-100/50">
              {data.isHit === false ? (
                <div className="p-3 bg-slate-100/80 rounded-xl border border-slate-200 shadow-sm text-center">
                  <div className="text-slate-500 font-black tracking-widest flex items-center justify-center gap-2">
                    <Zap className="w-4 h-4 text-slate-400" />
                    攻击落空 (MISS)
                  </div>
                </div>
              ) : (
                data.damage && (
                  <div className="relative group overflow-hidden p-3 bg-linear-to-br from-rose-50/80 to-red-50/80 rounded-xl border border-rose-100 shadow-sm transition-all hover:shadow-md">
                    <div className="text-rose-700 font-black text-center tracking-wide leading-relaxed flex items-baseline justify-center gap-1">
                      {data.damage.split(/(\d+)/).map((part: string, i: number) =>
                        /\d+/.test(part) ?
                          <span key={i} className="font-number text-xl">{part}</span> :
                          <span key={i}>{part}</span>
                      )}
                    </div>
                  </div>
                )
              )}

              {(data.mpUpdate || data.mpCost) && (
                <div className="text-center">
                  <span className="text-[11px] text-slate-400 font-medium font-number italic tracking-tight">
                    {data.mpCost ? `消耗灵气: ${data.mpCost}` : data.mpUpdate}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return <div className="text-sm text-slate-600 whitespace-pre-wrap">{data.content}</div>;
    }
  };

  const isCombat = data.type === 'combat';
  const isHit = data.isHit;
  const isCritical = data.isCritical;

  return (
    <div className={`my-4 overflow-hidden rounded-xl border transition-all duration-300 shadow-sm hover:shadow-md ${getResultBg(data.result, isCombat, isHit, isCritical)}`}>
      {/* Header - Always Visible */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-3 cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col ml-3">
            <span className={`text-sm font-black ${getResultColor(data.result, isCombat, isHit, isCritical)}`}>
              {data.type === 'attribute_basic' ? `${data.attribute}（基础）` :
               data.type === 'attribute_potential' ? `${data.attribute}（潜质）` :
               data.type === 'daoxin' ? `道心判定（${data.horrorLevel}）` :
               data.type === 'combat' ?
                 (data.isHit === false ? (
                   <span className="flex items-center gap-0">
                     <span className="opacity-90">{data.entities?.[0]?.name || '攻方'}</span>
                     <span className="opacity-90">使用</span>
                     <span className="font-bold text-slate-700 ml-1">{data.method}</span>
                     <span className="opacity-90 ml-1">攻击落空</span>
                   </span>
                 ) : (
                   <span className="flex items-center gap-0">
                     <span className="opacity-90">{data.entities?.[0]?.name || '攻方'}</span>
                     <span className="opacity-90">使用</span>
                     <span className="font-bold text-slate-700 ml-1">{data.method}</span>
                     <span className="opacity-90 ml-1">造成了</span>
                     <span className="font-number font-black text-base leading-none -translate-y-[1.5px] ml-1">{data.damageValue || 0}</span>
                     <span className="opacity-90 ml-1">点伤害</span>
                   </span>
                 )) :
               `[${data.title || '系统判定'}]`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-sm font-black tracking-widest ${getResultColor(data.result, isCombat, isHit, isCritical)}`}>
            {data.type === 'combat' ? (
              !isHit ? '未命中' : (isCritical ? '暴击' : '命中')
            ) : (
              data.result === '未知' ? '进行中' : data.result
            )}
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Expanded Content */}
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-4 pt-0 border-t border-white/40 space-y-4">
          <div className="mt-4">
            {renderContent()}
          </div>

          {/* Calculation Process (Collapsible) */}
          {data.calculation && (
            <div className="mt-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCalc(!showCalc);
                }}
                className="w-full flex items-center justify-between p-2 bg-slate-800/5 hover:bg-slate-800/10 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <Binary className="w-3 h-3" />
                  解析天机 (计算过程)
                </div>
                {showCalc ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
              </button>

              <div className={`transition-all duration-300 overflow-hidden ${showCalc ? 'max-h-96 mt-2 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-400/90 leading-relaxed whitespace-pre-wrap">
                  {data.calculation}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
