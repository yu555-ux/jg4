import { ShoppingBag, X } from 'lucide-react';
import React from 'react';
import { CLOTHING_TYPES, RANKS } from './constants';

interface ShopRefreshPanelProps {
  categories: readonly string[];
  itemCategories: readonly string[];
  isGenerating: boolean;
  refreshTypes: string[];
  refreshCount: number;
  refreshKeyword: string;
  eroticCount: number;
  eroticKeyword: string;
  rankSelections: Array<{
    rank: (typeof RANKS)[number];
    grade: '上品' | '中品' | '下品';
    count: number;
  }>;
  mustHaveEnabled: boolean;
  mustHaveSimple: boolean;
  mustHaveForm: any;
  onClose: () => void;
  onToggleRefreshType: (type: string) => void;
  onRefreshCountChange: (value: number) => void;
  onRefreshKeywordChange: (value: string) => void;
  onEroticCountChange: (value: number) => void;
  onEroticKeywordChange: (value: string) => void;
  onRankSelectionsChange: (value: Array<{
    rank: (typeof RANKS)[number];
    grade: '上品' | '中品' | '下品';
    count: number;
  }>) => void;
  onToggleMustHave: () => void;
  onToggleMustHaveSimple: () => void;
  onMustHaveFormChange: (value: any) => void;
  onQuickRefresh: () => void;
}

const ShopRefreshPanel: React.FC<ShopRefreshPanelProps> = ({
  categories,
  itemCategories,
  isGenerating,
  refreshTypes,
  refreshCount,
  refreshKeyword,
  eroticCount,
  eroticKeyword,
  rankSelections,
  mustHaveEnabled,
  mustHaveSimple,
  mustHaveForm,
  onClose,
  onToggleRefreshType,
  onRefreshCountChange,
  onRefreshKeywordChange,
  onEroticCountChange,
  onEroticKeywordChange,
  onRankSelectionsChange,
  onToggleMustHave,
  onToggleMustHaveSimple,
  onMustHaveFormChange,
  onQuickRefresh,
}) => {
  const autoResize = (event: React.FormEvent<HTMLTextAreaElement>) => {
    const el = event.currentTarget;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const updateMustHaveText = (key: string, value: string) => {
    onMustHaveFormChange({ ...mustHaveForm, [key]: value });
  };

  const splitLinesForList = (value: string) => {
    if (!value) return [] as string[];
    return String(value).split(/\r?\n/).map(item => {
      const raw = String(item ?? '');
      return raw.trim() === '' ? '' : raw;
    });
  };

  const serializeListForText = (list: string[]) => {
    const safe = (list || []).map(value => {
      const text = String(value ?? '');
      return text.trim() === '' ? ' ' : text;
    });
    return safe.join('\n');
  };

  const updateMustHaveList = (key: string, list: string[]) => {
    updateMustHaveText(key, serializeListForText(list));
  };

  const parseMoves = (raw: string) => splitLinesForList(raw || '').map(line => {
    const parts = line.split('|').map(part => part.trim());
    const [name, desc, effectsRaw] = parts;
    const effects = effectsRaw
      ? effectsRaw.split(/[;；,，]/).map(t => t.trim()).filter(Boolean)
      : [];
    return {
      名称: name || '',
      描述: desc || '',
      效果: effects,
    };
  });

  const serializeMoves = (moves: Array<{ 名称: string; 描述: string; 效果: string[] }>) => (
    moves
      .map(move => {
        const name = (move.名称 || '').trim();
        const desc = (move.描述 || '').trim();
        const effects = (move.效果 || []).map(t => String(t).trim()).filter(Boolean).join(';');
        if (!name && !desc && !effects) return ' | ';
        if (effects) return `${name || '未知招式'} | ${desc || '暂无招式描述'} | ${effects}`;
        return `${name || '未知招式'} | ${desc || '暂无招式描述'}`;
      })
      .join('\n')
  );

  const fixedBonusList = splitLinesForList(mustHaveForm.固定加成文本 || '');
  const effectList = splitLinesForList(mustHaveForm.效果文本 || '');
  const contentList = splitLinesForList(mustHaveForm.内容文本 || '');
  const moves = parseMoves(mustHaveForm.招式文本 || '');

  const updateMoves = (nextMoves: Array<{ 名称: string; 描述: string; 效果: string[] }>) => {
    updateMustHaveText('招式文本', serializeMoves(nextMoves));
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
    <div className="h-16 border-b border-slate-100 flex items-center justify-between px-8 bg-slate-50/30 mb-6">
      <h3 className="text-xl font-bold text-slate-800">刷新商品</h3>
      <button onClick={onClose} className="p-2 hover:bg-rose-50 rounded-full transition-colors text-slate-400 hover:text-rose-500">
        <X className="w-6 h-6" />
      </button>
    </div>

    <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-8 custom-scrollbar">
      <div className="space-y-3">
        <label className="text-sm font-black text-slate-500 uppercase tracking-widest">刷新类型（可多选）</label>
        <div className="grid grid-cols-3 gap-3">
          {categories.map(category => {
            const selected = refreshTypes.includes(category);
            return (
              <button
                key={category}
                onClick={() => onToggleRefreshType(category)}
                className={`py-3 rounded-2xl font-bold border-2 transition-all flex flex-col items-center gap-2 ${selected
                  ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-100 scale-105'
                  : 'bg-white text-slate-400 border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30'}`}
              >
                <ShoppingBag className="w-5 h-5" />
                <span className="text-xs">{category}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-sm font-black text-slate-500 uppercase tracking-widest">刷新数量</label>
        </div>
        <div className="flex items-center gap-6">
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={refreshCount}
            onChange={event => onRefreshCountChange(Number(event.target.value))}
            className="flex-1 h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center">
            <span className="text-xl font-black text-emerald-700">{refreshCount}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-black text-slate-500 uppercase tracking-widest">主题关键词（可选）</label>
        <input
          type="text"
          value={refreshKeyword}
          onChange={event => onRefreshKeywordChange(event.target.value)}
          placeholder="如：火系、妖族、仙宫遗物"
          className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden transition-all"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-black text-slate-500 uppercase tracking-widest">品阶数量（可选）</label>
          <button
            type="button"
            onClick={() => onRankSelectionsChange([...(rankSelections || []), { rank: '仙', grade: '上品', count: 1 }])}
            className="px-3 py-1.5 rounded-full border text-xs font-black transition-all bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50"
          >
            添加品阶
          </button>
        </div>

        {(rankSelections || []).length === 0 ? (
          <div className="text-xs text-slate-400">未设置品阶限制，可点击右上角添加。</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(rankSelections || []).map((item, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-1.5 p-2.5 bg-slate-100/50 border border-slate-300 rounded-xl backdrop-blur-md">
                <div className="relative">
                  <select
                    value={item.rank}
                    onChange={event => {
                      const next = [...rankSelections];
                      next[idx] = { ...next[idx], rank: event.target.value as (typeof RANKS)[number] };
                      onRankSelectionsChange(next);
                    }}
                    className="w-18 p-2 pr-8 bg-white border border-slate-300 rounded-lg text-xs appearance-none"
                  >
                    {RANKS.map(rank => (
                      <option key={rank} value={rank}>{rank}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 border-l border-slate-300 pl-2">
                    ▾
                  </span>
                </div>
                <div className="relative">
                  <select
                    value={item.grade}
                    onChange={event => {
                      const next = [...rankSelections];
                      next[idx] = { ...next[idx], grade: event.target.value as '上品' | '中品' | '下品' };
                      onRankSelectionsChange(next);
                    }}
                    className="w-20 p-2 pr-8 bg-white border border-slate-300 rounded-lg text-xs appearance-none"
                  >
                    <option value="上品">上品</option>
                    <option value="中品">中品</option>
                    <option value="下品">下品</option>
                  </select>
                  <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 border-l border-slate-300 pl-2">
                    ▾
                  </span>
                </div>
                <input
                  type="number"
                  min={0}
                  value={item.count}
                  onChange={event => {
                    const next = [...rankSelections];
                    next[idx] = { ...next[idx], count: Math.max(0, Number(event.target.value)) };
                    onRankSelectionsChange(next);
                  }}
                  className="number-spinner w-12 p-2 bg-white border border-slate-300 rounded-lg text-center text-xs"
                />
                <button
                  type="button"
                  onClick={() => onRankSelectionsChange(rankSelections.filter((_, i) => i !== idx))}
                  className="ml-auto px-2 py-2 text-[10px] font-black rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-sm font-black text-slate-500 uppercase tracking-widest">色情商品数量</label>
        </div>
        <div className="flex items-center gap-6">
          <input
            type="range"
            min={0}
            max={refreshCount}
            step={1}
            value={eroticCount}
            onChange={event => onEroticCountChange(Math.max(0, Number(event.target.value)))}
            className="flex-1 h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center">
            <span className="text-xl font-black text-emerald-700">{eroticCount}</span>
          </div>
        </div>
        <div className="text-[10px] text-slate-400">
          约束：涉及性爱/调教/欲望等主题
        </div>
        {eroticCount > 0 && (
          <input
            type="text"
            value={eroticKeyword}
            onChange={event => onEroticKeywordChange(event.target.value)}
            placeholder="色情关键词（可选，如：调教、媚药、束缚）"
          className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden transition-all"
          />
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-black text-slate-500 uppercase tracking-widest">必定出现商品</label>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMustHave}
              className={`px-4 py-1.5 rounded-full border text-xs font-black transition-all ${mustHaveEnabled
                ? 'bg-emerald-500 text-white border-emerald-400'
                : 'bg-white text-slate-400 border-slate-300 hover:border-emerald-200'}`}
            >
              {mustHaveEnabled ? '已开启' : '未开启'}
            </button>
            <button
              onClick={onToggleMustHaveSimple}
              disabled={!mustHaveEnabled}
              className={`px-4 py-1.5 rounded-full border text-xs font-black transition-all ${
                mustHaveEnabled
                  ? mustHaveSimple
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : 'bg-white text-slate-400 border-slate-300 hover:border-emerald-200'
                  : 'bg-white text-slate-300 border-slate-200 cursor-not-allowed'
              }`}
            >
              简版填写
            </button>
          </div>
        </div>

        {mustHaveEnabled && (
          <div className="space-y-4 p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl backdrop-blur-md">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">名称</label>
                <input
                  type="text"
                  value={mustHaveForm.名称}
                  onChange={event => onMustHaveFormChange({ ...mustHaveForm, 名称: event.target.value })}
                  className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">分类</label>
                <div className="relative">
                  <select
                    value={mustHaveForm.分类}
                    onChange={event => onMustHaveFormChange({ ...mustHaveForm, 分类: event.target.value })}
                    className="w-full h-11 px-3 pr-9 bg-white border border-slate-300 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden appearance-none"
                  >
                    {itemCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 border-l border-slate-300 pl-2">
                    ▾
                  </span>
                </div>
              </div>
            </div>

            {!mustHaveSimple && mustHaveForm.分类 === '着装' && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">着装类型</label>
                  <select
                    value={mustHaveForm.着装类型}
                    onChange={event => onMustHaveFormChange({ ...mustHaveForm, 着装类型: event.target.value })}
                    className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden"
                  >
                  {CLOTHING_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            )}

            {!mustHaveSimple && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-1 items-end">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">价格</label>
                <input
                  type="number"
                  value={mustHaveForm.价格}
                  onChange={event => onMustHaveFormChange({ ...mustHaveForm, 价格: Number(event.target.value) })}
                  className="number-spinner w-full max-w-[84px] h-11 px-3 bg-white border border-slate-300 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">数量</label>
                <input
                  type="number"
                  min={1}
                  value={mustHaveForm.数量}
                  onChange={event => onMustHaveFormChange({ ...mustHaveForm, 数量: Math.max(1, Number(event.target.value) || 1) })}
                  className="number-spinner w-full max-w-[68px] h-11 px-3 bg-white border border-slate-300 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">品阶</label>
                <div className="flex items-center gap-1">
                  <div className="relative">
                    <select
                      value={mustHaveForm.品阶阶位 || '凡'}
                      onChange={event => onMustHaveFormChange({ ...mustHaveForm, 品阶阶位: event.target.value })}
                      className="w-16 h-11 px-3 pr-8 bg-white border border-slate-300 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden text-xs appearance-none"
                    >
                      {RANKS.map(rank => (
                        <option key={rank} value={rank}>{rank}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 border-l border-slate-300 pl-2">
                      ▾
                    </span>
                  </div>
                  <div className="relative">
                    <select
                      value={mustHaveForm.品阶品级 || '上品'}
                      onChange={event => onMustHaveFormChange({ ...mustHaveForm, 品阶品级: event.target.value })}
                      className="w-20 h-11 px-3 pr-8 bg-white border border-slate-300 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden text-xs appearance-none"
                    >
                      <option value="上品">上品</option>
                      <option value="中品">中品</option>
                      <option value="下品">下品</option>
                    </select>
                    <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 border-l border-slate-300 pl-2">
                      ▾
                    </span>
                  </div>
                </div>
              </div>
            </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">描述</label>
              <textarea
                value={mustHaveForm.描述}
                onChange={event => onMustHaveFormChange({ ...mustHaveForm, 描述: event.target.value })}
                onInput={autoResize}
                className="w-full min-h-[48px] px-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden resize-none overflow-hidden"
              />
            </div>

            {!mustHaveSimple && (
            <div className="grid grid-cols-1 gap-3">
              {['功法', '武器', '装备', '法宝', '着装'].includes(mustHaveForm.分类) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">固定加成</label>
                    <button
                      type="button"
                      onClick={() => updateMustHaveList('固定加成文本', [...fixedBonusList, ''])}
                      className="px-2.5 py-1 text-[10px] font-black rounded-full border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                      添加一条
                    </button>
                  </div>
                  <div className="space-y-2">
                    {fixedBonusList.length === 0 && (
                      <div className="text-[10px] text-slate-400">暂无固定加成，点击右上角添加。</div>
                    )}
                    {fixedBonusList.map((value, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={value}
                          onChange={event => {
                            const next = [...fixedBonusList];
                            next[idx] = event.target.value;
                            updateMustHaveList('固定加成文本', next);
                          }}
                          placeholder="如：当前根骨+12 或 基础灵气+50"
                          className="flex-1 p-2.5 bg-white border border-slate-300 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden font-mono text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => updateMustHaveList('固定加成文本', fixedBonusList.filter((_, i) => i !== idx))}
                          className="px-2.5 py-2 text-[10px] font-black rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50"
                        >
                          删除
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {mustHaveForm.分类 === '功法' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">招式</label>
                    <button
                      type="button"
                      onClick={() => updateMoves([...moves, { 名称: '', 描述: '', 效果: [] }])}
                      className="px-2.5 py-1 text-[10px] font-black rounded-full border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                      添加招式
                    </button>
                  </div>
                  {moves.length === 0 && (
                    <div className="text-[10px] text-slate-400">暂无招式，点击右上角添加。</div>
                  )}
                  <div className="space-y-3">
                    {moves.map((move, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-slate-300 bg-white space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <span>招式名</span>
                          <span>描述</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={move.名称}
                            onChange={event => {
                              const next = [...moves];
                              next[idx] = { ...next[idx], 名称: event.target.value };
                              updateMoves(next);
                            }}
                            placeholder="填写招式名"
                            className="flex-1 p-2.5 bg-white border border-slate-300 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden text-xs"
                          />
                          <input
                            type="text"
                            value={move.描述}
                            onChange={event => {
                              const next = [...moves];
                              next[idx] = { ...next[idx], 描述: event.target.value };
                              updateMoves(next);
                            }}
                            placeholder="填写招式描述"
                            className="flex-[1.2] p-2.5 bg-white border border-slate-300 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => updateMoves(moves.filter((_, i) => i !== idx))}
                            className="px-2.5 py-2 text-[10px] font-black rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50"
                          >
                            删除
                          </button>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">效果</span>
                          </div>
                          <input
                            type="text"
                            value={(move.效果 || []).join(';')}
                            onChange={event => {
                              const raw = event.target.value;
                              const list = raw
                                .split(/[;；,，]/)
                                .map(t => t.trim())
                                .filter(Boolean);
                              const next = [...moves];
                              next[idx] = { ...next[idx], 效果: list };
                              updateMoves(next);
                            }}
                            placeholder="效果描述（可用 ; 分隔多条）"
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {['武器', '装备', '法宝', '着装', '丹药', '阵符'].includes(mustHaveForm.分类) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">效果</label>
                    <button
                      type="button"
                      onClick={() => updateMustHaveList('效果文本', [...effectList, ''])}
                      className="px-2.5 py-1 text-[10px] font-black rounded-full border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                      添加一条
                    </button>
                  </div>
                  <div className="space-y-2">
                    {effectList.length === 0 && (
                      <div className="text-[10px] text-slate-400">暂无效果，点击右上角添加。</div>
                    )}
                    {effectList.map((value, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <textarea
                          value={value}
                          onChange={event => {
                            const next = [...effectList];
                            next[idx] = event.target.value;
                            updateMustHaveList('效果文本', next);
                          }}
                          onInput={autoResize}
                          placeholder="效果描述"
                          className="flex-1 p-2.5 bg-white border border-slate-300 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden text-xs min-h-[36px] resize-none overflow-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => updateMustHaveList('效果文本', effectList.filter((_, i) => i !== idx))}
                          className="px-2.5 py-2 text-[10px] font-black rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50"
                        >
                          删除
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {mustHaveForm.分类 === '特殊' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">内容</label>
                    <button
                      type="button"
                      onClick={() => updateMustHaveList('内容文本', [...contentList, ''])}
                      className="px-2.5 py-1 text-[10px] font-black rounded-full border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                      添加一条
                    </button>
                  </div>
                  <div className="space-y-2">
                    {contentList.length === 0 && (
                      <div className="text-[10px] text-slate-400">暂无内容，点击右上角添加。</div>
                    )}
                    {contentList.map((value, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <textarea
                          value={value}
                          onChange={event => {
                            const next = [...contentList];
                            next[idx] = event.target.value;
                            updateMustHaveList('内容文本', next);
                          }}
                          onInput={autoResize}
                          placeholder="内容描述"
                          className="flex-1 p-2.5 bg-white border border-slate-300 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden text-xs min-h-[36px] resize-none overflow-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => updateMustHaveList('内容文本', contentList.filter((_, i) => i !== idx))}
                          className="px-2.5 py-2 text-[10px] font-black rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50"
                        >
                          删除
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
        )}
      </div>

      <div className="flex w-full gap-4 pt-2">
        <button
          onClick={onQuickRefresh}
          disabled={isGenerating}
          className={`flex-1 py-3 rounded-2xl bg-linear-to-r from-emerald-500 to-teal-600 text-white font-black shadow-xl shadow-emerald-100 hover:shadow-emerald-200 hover:-translate-y-1 transition-all active:scale-95 ${isGenerating ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {isGenerating ? '刷新中...' : '刷新商品'}
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-2xl border-2 border-slate-100 text-slate-400 font-black hover:bg-slate-50 transition-all"
        >
          罢休
        </button>
      </div>
    </div>
  </div>
  );
};

export default ShopRefreshPanel;
