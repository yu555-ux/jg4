import React from 'react';
import { ProgressBar } from '../UIElements';
import { CategoryIcon, EffectList } from './shared';

interface DetailModalProps {
  data: any; // 包含 { label, data (item), type }
}

const DetailModal: React.FC<DetailModalProps> = ({ data }) => {
  if (!data) return null;
  const item = data.data;
  const isPet = data.type === 'pet';
  const isEvil = data.type === 'evil';
  const isTalent = data.type === 'talent';
  const isSkill = item.分类 === '功法';
  const masteryLabel = item.$掌握程度 || item.掌握程度;

  if (isEvil) {
    const rules = item.歪理 || [];
    return (
      <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-300 font-serif">
        <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          <div className="p-6 bg-linear-to-br from-white/90 to-rose-50/70 rounded-2xl border border-rose-200/70 shadow-[0_6px_16px_rgba(120,20,20,0.15)] relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#8b1e1e_0.5px,transparent_0.5px)] [background-size:20px_20px] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs text-slate-400 font-bold tracking-[0.2em] uppercase">{data.label}</span>
                <span className="px-2 py-0.5 bg-rose-700 text-white text-[10px] font-black rounded uppercase tracking-wider">
                  {item.危险等级 || '未知等级'}
                </span>
              </div>
              <h4 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">{item.名称 || '未命名邪物'}</h4>
              <p className="text-slate-600 text-sm leading-relaxed font-medium italic mt-4 border-t border-rose-200/60 pt-4">
                {item.描述 || '暂无描述'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="text-xs font-black text-rose-800 uppercase tracking-[0.3em] pl-2 border-l-2 border-rose-400 ml-1">代价</h5>
            <div className="p-4 bg-white/80 border border-rose-100 rounded-xl shadow-[0_4px_12px_rgba(120,20,20,0.08)] text-sm text-slate-700 font-medium">
              {item.代价 || '暂无代价'}
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="text-xs font-black text-rose-800 uppercase tracking-[0.3em] pl-2 border-l-2 border-rose-400 ml-1">歪理</h5>
            <div className="grid grid-cols-1 gap-2">
              {rules.length === 0 ? (
                <div className="p-4 bg-white/80 border border-rose-100 rounded-xl shadow-[0_4px_12px_rgba(120,20,20,0.08)] text-sm text-slate-400 italic">
                  暂无歪理
                </div>
              ) : (
                rules.map((text: string, i: number) => (
                  <div key={i} className="p-4 bg-white/80 border border-rose-100 rounded-xl shadow-[0_4px_12px_rgba(120,20,20,0.08)] group hover:border-rose-200 transition-all">
                    <div className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 bg-rose-400 rounded-full mt-1.5 shadow-[0_0_6px_rgba(190,30,30,0.35)]" />
                      <span className="text-sm font-medium text-slate-700 leading-relaxed">{text}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isPet) {
    const bloodline = item.血脉 || {};
    const bloodlineEffects = bloodline.效果 || [];
    const abilities = item.神通 || [];
    const traits = item.特性 || [];

    return (
      <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          <div className="p-6 bg-linear-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs text-slate-400 font-bold tracking-[0.2em] uppercase">{data.label}</span>
                <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded uppercase tracking-wider">
                  {item.境界 || '未知境界'}（{item.境界映射 ?? '未知'}）
                </span>
              </div>
              <h4 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">{item.名称 || '未命名灵宠'}</h4>
              <p className="text-slate-600 text-sm leading-relaxed font-medium italic mt-4 border-t border-emerald-100/50 pt-4">
                种族：{item.种族 || '未知'} · 灵根：{item.灵根 || '未知'} · 寿元：{item.寿元 || '未知'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="space-y-3">
              <h5 className="text-xs font-black text-emerald-800 uppercase tracking-[0.3em] pl-2 border-l-2 border-emerald-400 ml-1">特性</h5>
              <div className="flex flex-wrap gap-2">
                {traits.length === 0 ? (
                  <span className="text-[11px] text-slate-400 italic">暂无特性</span>
                ) : (
                  traits.map((trait: string, i: number) => (
                    <span key={i} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded">
                      {trait}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="text-xs font-black text-emerald-800 uppercase tracking-[0.3em] pl-2 border-l-2 border-emerald-400 ml-1">当前状态</h5>
              <div className="p-4 bg-white border border-emerald-50 rounded-xl shadow-xs">
                <div className="text-sm font-medium text-slate-700">{item.状态 || '正常'}</div>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="text-xs font-black text-emerald-800 uppercase tracking-[0.3em] pl-2 border-l-2 border-cyan-400 ml-1">血脉</h5>
              <div className="p-4 bg-white border border-emerald-50 rounded-xl shadow-xs space-y-2">
                <div className="text-sm text-slate-700 font-medium">{bloodline.描述 || '暂无描述'}</div>
                <div className="flex flex-wrap gap-2">
                  {bloodlineEffects.length === 0 ? (
                    <span className="text-[10px] text-slate-400 italic">暂无血脉效果</span>
                  ) : (
                    bloodlineEffects.map((eff: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-cyan-50 text-cyan-700 text-[10px] font-bold rounded">
                        {eff}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="text-xs font-black text-emerald-800 uppercase tracking-[0.3em] pl-2 border-l-2 border-amber-400 ml-1">神通</h5>
              <div className="grid grid-cols-1 gap-3">
                {abilities.length === 0 ? (
                  <div className="p-4 bg-white border border-emerald-50 rounded-xl shadow-xs text-sm text-slate-400 italic">
                    暂无神通
                  </div>
                ) : (
                  abilities.map((ability: any, idx: number) => (
                    <div key={idx} className="p-4 bg-white border border-emerald-50 rounded-xl shadow-xs space-y-2">
                      <div className="text-sm font-black text-slate-800">{ability.名称 || '未知神通'}</div>
                      <div className="text-xs text-slate-500 italic leading-relaxed">{ability.描述 || '暂无描述'}</div>
                      <div className="flex flex-wrap gap-2">
                        {(ability.效果 || []).map((eff: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded">
                            {eff}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="text-xs font-black text-emerald-800 uppercase tracking-[0.3em] pl-2 border-l-2 border-emerald-400 ml-1">契约伊始</h5>
              <div className="p-4 bg-white border border-emerald-50 rounded-xl shadow-xs">
                <div className="text-sm font-medium text-slate-700">{item.契约伊始 || '未知'}</div>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="text-xs font-black text-emerald-800 uppercase tracking-[0.3em] pl-2 border-l-2 border-emerald-400 ml-1">关键经历</h5>
              <div className="grid grid-cols-1 gap-2">
                {(item.关键经历 || []).length === 0 ? (
                  <div className="p-4 bg-white border border-emerald-50 rounded-xl shadow-xs text-sm text-slate-400 italic">
                    暂无关键经历
                  </div>
                ) : (
                  item.关键经历.map((text: string, i: number) => (
                    <div key={i} className="p-4 bg-white border border-emerald-50 rounded-xl shadow-xs group hover:border-emerald-200 transition-all">
                      <div className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shadow-[0_0_6px_rgba(16,185,129,0.35)]" />
                        <span className="text-sm font-medium text-slate-700 leading-relaxed">{text}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
        {/* 头部展示 */}
        <div className="p-6 bg-linear-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            {isTalent ? (
              <>
                <div className="flex items-center gap-3 mb-2">
                  {item.品阶 && (
                    <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded uppercase tracking-wider">
                      {item.品阶}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-bold tracking-[0.2em] uppercase">{data.label}</span>
                </div>
                <h4 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">{item.名称 || item.name}</h4>
              </>
            ) : isSkill ? (
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 flex gap-4 items-center">
                  <div className="p-3 bg-white rounded-xl shadow-xs border border-emerald-100">
                    <CategoryIcon category={item.分类} className="w-10 h-10" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {item.品阶 && (
                        <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded uppercase tracking-wider">
                          {item.品阶}
                        </span>
                      )}
                      <span className="text-xs text-slate-400 font-bold tracking-widest">{data.label}</span>
                      {masteryLabel && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded uppercase tracking-wider">
                          {masteryLabel}
                        </span>
                      )}
                    </div>
                    <h4 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">{item.名称 || item.name}</h4>
                  </div>
                </div>
                <div className="text-right min-w-[100px]">
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-tighter mb-1">掌握境界</div>
                  <div className="text-2xl font-black text-emerald-600">{masteryLabel || '初窥门径'}</div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-2">
                  {item.品阶 && data.type !== 'clothing' && (
                    <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded uppercase tracking-wider">
                      {item.品阶}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-bold tracking-[0.2em] uppercase">{data.label}</span>
                  {item.掌握程度 && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded uppercase tracking-wider">
                      {item.掌握程度}
                    </span>
                  )}
                </div>

                <h4 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">{item.名称 || item.name}</h4>
              </>
            )}

            <p className="text-slate-600 text-sm leading-relaxed font-medium italic mt-4 border-t border-emerald-100/50 pt-4">
              {item.描述 || '暂无详细描述。'}
            </p>
          </div>
        </div>

        {/* 核心内容 - 竖向排列 */}
        <div className="flex flex-col gap-6">
          {/* 特殊内容区块 */}
          {item.分类 === '特殊' && item.内容?.length > 0 && (
            <div className="space-y-3">
              <h5 className="text-xs font-black text-emerald-800 uppercase tracking-[0.3em] pl-2 border-l-2 border-emerald-400 ml-1">记载内容</h5>
              <div className="grid grid-cols-1 gap-2">
                {item.内容.map((text: string, i: number) => (
                  <div key={i} className="p-4 bg-white border border-emerald-50 rounded-xl shadow-xs group hover:border-emerald-200 transition-all">
                    <div className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shadow-[0_0_6px_rgba(16,185,129,0.35)]" />
                      <span className="text-sm font-medium text-slate-700 leading-relaxed">{text}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isSkill && (
            <div className="space-y-3">
              <h5 className="text-xs font-black text-emerald-800 uppercase tracking-widest pl-2 border-l-2 border-emerald-400 ml-1">掌握进度</h5>
              <div className="bg-white border border-emerald-50 rounded-xl p-4 shadow-xs space-y-3">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-500">掌握境界</span>
                  <span className="text-emerald-600">{masteryLabel || '初窥门径'}</span>
                </div>
                <ProgressBar
                  label="熟练度"
                  current={item.熟练度 || 0}
                  max={500}
                  colorClass="bg-emerald-500"
                />
              </div>
            </div>
          )}

          {/* 固定加成区块 */}
          {(item.分类 !== '特殊') && item.固定加成?.length > 0 && (
            <div className="space-y-3">
              <h5 className="text-xs font-black text-emerald-800 uppercase tracking-[0.3em] pl-2 border-l-2 border-cyan-400 ml-1">固定加成</h5>
              <div className="grid grid-cols-1 gap-2">
                {item.固定加成.map((eff: string, i: number) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-white border border-emerald-50 rounded-xl shadow-xs group hover:border-cyan-200 transition-all">
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full group-hover:scale-125 transition-transform shadow-[0_0_8px_rgba(34,211,238,0.4)]" />
                    <span className="text-sm font-bold text-slate-800">{eff}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isTalent && item.神通 && Object.keys(item.神通).length > 0 && (
            <div className="space-y-3">
              <h5 className="text-xs font-black text-emerald-800 uppercase tracking-widest pl-2 border-l-2 border-orange-400 ml-1">神通</h5>
              <div className="grid grid-cols-1 gap-3">
                {Object.entries(item.神通).map(([name, desc]: [string, any], i) => (
                  <div key={`${name}-${i}`} className="p-4 bg-white border border-emerald-50 rounded-xl shadow-xs space-y-2 group hover:border-orange-200 transition-all">
                    <div className="flex items-center gap-3">
                      <span className="w-1.5 h-1.5 bg-orange-400 rounded-full group-hover:scale-125 transition-transform shadow-[0_0_8px_rgba(251,146,60,0.4)]" />
                      <span className="text-sm font-black text-slate-800">{name}</span>
                    </div>
                    <div className="text-xs text-slate-500 pl-4.5 italic leading-relaxed">
                      {String(desc || '暂无描述')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(isSkill && Array.isArray(item.招式) && item.招式.length > 0) ? (
            <div className="space-y-3">
              <h5 className="text-xs font-black text-emerald-800 uppercase tracking-widest pl-2 border-l-2 border-orange-400 ml-1">招式神通</h5>
              <div className="grid grid-cols-1 gap-3">
                {item.招式.map((move: any, i: number) => (
                  <div key={i} className="p-4 bg-white border border-emerald-50 rounded-xl shadow-xs space-y-2 group hover:border-orange-200 transition-all">
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
          ) : (!isTalent && item.分类 !== '特殊') ? (
            <EffectList effects={item.效果} specialEffects={item.特殊效果} />
          ) : null}

          {/* 招式区块 (功法专属) */}
          {!isSkill && !isTalent && Array.isArray(item.招式) && item.招式.length > 0 && (
            <div className="space-y-3">
              <h5 className="text-xs font-black text-emerald-800 uppercase tracking-[0.3em] pl-2 border-l-2 border-amber-400 ml-1">参悟招式</h5>
              <div className="grid grid-cols-1 gap-3">
                {item.招式.map((move: any, i: number) => (
                  <div key={i} className="p-4 bg-white border border-amber-50 rounded-2xl shadow-xs hover:border-amber-200 transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <CategoryIcon category="功法" className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-black text-slate-900">{move.名称 || '未知招式'}</span>
                    </div>
                    <p className="text-xs text-slate-500 italic mb-3">{move.描述}</p>
                    <div className="flex flex-wrap gap-2">
                      {move.效果?.map((eff: string, idx: number) => (
                        <span key={idx} className="px-2 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-lg border border-amber-100 flex items-center gap-1.5">
                          {eff}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default DetailModal;
