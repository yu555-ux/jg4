import { Sparkles, X } from 'lucide-react';
import React from 'react';
import { createPortal } from 'react-dom';
import { CLOTHING_TYPES } from './constants';
import { splitLines } from './utils';

interface ShopReviewModalProps {
  show: boolean;
  fixError: string;
  orderedReviewItems: { item: any; idx: number; errors?: string[] }[];
  reviewExistingItems: any[];
  applyMode: 'append' | 'replace';
  onApplyModeChange: (mode: 'append' | 'replace') => void;
  replaceSelections: number[];
  onReplaceSelectionsChange: (next: number[]) => void;
  itemCategories: readonly string[];
  onClose: () => void;
  onUpdateReviewItem: (index: number, patch: any) => void;
  onConfirm: () => void;
  onAutoFix: () => void;
}

const ShopReviewModal: React.FC<ShopReviewModalProps> = ({
  show,
  fixError,
  orderedReviewItems,
  reviewExistingItems,
  applyMode,
  onApplyModeChange,
  replaceSelections,
  onReplaceSelectionsChange,
  itemCategories,
  onClose,
  onUpdateReviewItem,
  onConfirm,
  onAutoFix,
}) => {
  if (!show) return null;

  const modal = (
    <div
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-sm"
      style={{ zIndex: 2000 }}
    >
      <div className="bg-white w-[min(94vw,56rem)] max-w-5xl rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden flex flex-col max-h-[calc(100svh-2rem)] sm:max-h-[90vh]">
        <div className="px-8 py-5 border-b border-emerald-50 flex items-center justify-between bg-emerald-50/30">
          <div className="flex items-center gap-3 text-emerald-700">
            <Sparkles className="w-5 h-5" />
            <h3 className="text-lg font-black tracking-widest">刷新结果确认</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 p-6 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="p-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 space-y-3">
            <div className="text-xs font-black text-emerald-700">写入方式</div>
            <div className="flex flex-wrap gap-3 text-xs">
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-200 bg-white cursor-pointer">
                <input
                  type="radio"
                  checked={applyMode === 'append'}
                  onChange={() => onApplyModeChange('append')}
                />
                追加到现有列表
              </label>
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-200 bg-white cursor-pointer">
                <input
                  type="radio"
                  checked={applyMode === 'replace'}
                  onChange={() => onApplyModeChange('replace')}
                />
                替换选中的旧商品
              </label>
            </div>

            {applyMode === 'replace' && (
              <div className="space-y-2">
                <div className="text-xs text-slate-500">请选择要被替换的旧商品：</div>
                {reviewExistingItems.length === 0 ? (
                  <div className="text-xs text-slate-400">当前没有旧商品可替换。</div>
                ) : (
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-emerald-100 bg-white">
                    {reviewExistingItems.map((item, idx) => {
                      const checked = replaceSelections.includes(idx);
                      return (
                        <label
                          key={idx}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-xs border-b border-emerald-50 cursor-pointer ${
                            checked ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-emerald-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const next = checked
                                ? replaceSelections.filter(i => i !== idx)
                                : [...replaceSelections, idx];
                              onReplaceSelectionsChange(next);
                            }}
                          />
                          <span className="truncate">
                            {item?.名称 || '未命名'} · {item?.分类 || '未知'} · {item?.品阶 || '未知'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {fixError && (
            <div className="text-sm text-rose-600 font-bold">{fixError}</div>
          )}

          {orderedReviewItems.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              暂无法解析刷新结果，请尝试重新刷新。
            </div>
          ) : (
            <div className="space-y-4">
              {orderedReviewItems.map(({ item, idx, errors }) => (
                <div key={idx} className={`rounded-2xl border p-4 ${errors ? 'border-rose-300 bg-rose-50/30' : 'border-emerald-100 bg-white'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-emerald-700">#{idx + 1}</span>
                      {errors && <span className="text-[10px] font-black text-rose-600">格式错误</span>}
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.分类}</span>
                  </div>

                  {errors && (
                    <div className="text-xs text-rose-600 font-bold mb-2">
                      {errors.join('、')}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">名称</label>
                      <input
                        type="text"
                        value={item.名称 || ''}
                        onChange={event => onUpdateReviewItem(idx, { 名称: event.target.value })}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">分类</label>
                      <select
                        value={item.分类 || '功法'}
                        onChange={event => onUpdateReviewItem(idx, { 分类: event.target.value })}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden"
                      >
                        {itemCategories.map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {item.分类 === '着装' && (
                    <div className="space-y-1 mt-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">着装类型</label>
                      <select
                        value={item.着装类型 || '上衣'}
                        onChange={event => onUpdateReviewItem(idx, { 着装类型: event.target.value })}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden"
                      >
                        {CLOTHING_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">价格</label>
                      <input
                        type="number"
                        value={item.价格 ?? 0}
                        onChange={event => onUpdateReviewItem(idx, { 价格: Number(event.target.value) })}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">数量</label>
                      <input
                        type="number"
                        min={1}
                        value={item.数量 ?? 1}
                        onChange={event => onUpdateReviewItem(idx, { 数量: Math.max(1, Number(event.target.value) || 1) })}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">品阶</label>
                      <input
                        type="text"
                        value={item.品阶 || ''}
                        onChange={event => onUpdateReviewItem(idx, { 品阶: event.target.value })}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 mt-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">描述</label>
                    <textarea
                      value={item.描述 || ''}
                      onChange={event => onUpdateReviewItem(idx, { 描述: event.target.value })}
                      rows={2}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 mt-3">
                    {['功法', '武器', '装备', '法宝', '着装'].includes(item.分类) && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">固定加成（每行一条）</label>
                        <textarea
                          value={(item.固定加成 || []).join('\n')}
                          onChange={event => onUpdateReviewItem(idx, { 固定加成: splitLines(event.target.value) })}
                          rows={2}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden font-mono text-xs"
                        />
                        {item.$autoFixed && item.$fixedBonusChanged && (
                          <div className="mt-2 text-[10px] text-emerald-700 font-bold">
                            自动修正预览：
                            <div className="mt-1 space-y-1">
                              {(item.固定加成 || []).map((text: string, i: number) => (
                                <div key={i} className="px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 font-mono text-[10px]">
                                  {String(text).split('当前').map((seg, j, arr) => (
                                    <span key={j}>
                                      {seg}
                                      {j < arr.length - 1 && <span className="text-amber-600 font-black">当前</span>}
                                    </span>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {['武器', '装备', '法宝', '着装', '丹药', '阵符'].includes(item.分类) && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">效果（每行一条）</label>
                        <textarea
                          value={(item.效果 || []).join('\n')}
                          onChange={event => onUpdateReviewItem(idx, { 效果: splitLines(event.target.value) })}
                          rows={2}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden"
                        />
                      </div>
                    )}
                    {item.分类 === '特殊' && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">内容（每行一条）</label>
                        <textarea
                          value={(item.内容 || []).join('\n')}
                          onChange={event => onUpdateReviewItem(idx, { 内容: splitLines(event.target.value) })}
                          rows={2}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-8 py-4 border-t border-emerald-50 flex justify-end gap-3 bg-emerald-50/20">
          <button
            onClick={onAutoFix}
            className="px-6 py-2 rounded-xl border border-emerald-200 text-emerald-700 font-bold hover:bg-emerald-50 transition-all"
          >
            自动修正
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-all"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-8 py-2 rounded-xl bg-emerald-600 text-white font-black hover:bg-emerald-700 transition-all"
          >
            确认写入
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return modal;
  return createPortal(modal, document.body);
};

export default ShopReviewModal;
