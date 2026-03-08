import React, { useState } from 'react';
import { ArrowRight, Clock, ChevronDown, ChevronUp, ShieldAlert, Zap } from 'lucide-react';

interface HistoryModalProps {
  data: any[];
  onBranchCreate?: (id: number) => void;
}

const resolveSeq = (m: any): number => {
  if (Number.isFinite(m?.messageId)) return Math.floor(m.messageId / 2);
  if (Number.isFinite(m?.id)) return Math.floor(m.id / 2);
  return Number.POSITIVE_INFINITY;
};

const HistoryItem: React.FC<{ m: any; i: number; onBranchCreate?: (id: number) => void; isChild?: boolean; seq?: number | null }> = ({ m, i, onBranchCreate, isChild, seq }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSecretOpen, setIsSecretOpen] = useState(false);

  // 解析 Key|Value 格式（兼容“：”与多行内容）
  const normalizedHistory = (m.history || '').replace(/｜/g, '|');
  const lines = normalizedHistory.split('\n').map((l: string) => l.trim()).filter(Boolean);
  const historyData: Record<string, string> = {};
  let currentKey: string | null = null;
  lines.forEach((line: string) => {
    if (currentKey === '重要信息' && /^\d+\./.test(line)) {
      historyData[currentKey] = historyData[currentKey]
        ? `${historyData[currentKey]}\n${line}`
        : line;
      return;
    }
    const pipeIndex = line.indexOf('|');
    const colonIndex = line.indexOf('：');
    const asciiColonIndex = line.indexOf(':');
    const hasPipe = pipeIndex !== -1;
    const hasColon = colonIndex !== -1 || asciiColonIndex !== -1;

    if (hasPipe || hasColon) {
      let key = '';
      let value = '';
      if (hasPipe) {
        key = line.slice(0, pipeIndex).trim();
        value = line.slice(pipeIndex + 1).trim();
      } else {
        const idx = colonIndex !== -1 ? colonIndex : asciiColonIndex;
        key = line.slice(0, idx).trim();
        value = line.slice(idx + 1).trim();
      }
      if (key) {
        currentKey = key;
        historyData[key] = value;
      }
      return;
    }

    if (currentKey) {
      historyData[currentKey] = historyData[currentKey]
        ? `${historyData[currentKey]}\n${line}`
        : line;
    }
  });

  const hasStructuredData = Object.keys(historyData).length > 0;

  const titleText = historyData['标题'] || '开始';
  const subtitle = `${historyData['日期'] || '未知时间'} · ${historyData['地点'] || '未知地点'}`;
  const branchId = Number.isFinite(m?.messageId) ? m.messageId : null;

  return (
    <div
      className={`group relative bg-white/70 backdrop-blur-md border border-emerald-200/80 rounded-2xl p-6 shadow-sm hover:border-emerald-300 hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-left-4 ${
        isChild ? 'ml-6 bg-emerald-50/40' : ''
      }`}
      style={{ animationDelay: `${i * 50}ms` }}
    >
      <button
        onClick={() => {
          setIsExpanded(prev => {
            const next = !prev;
            if (!next) setIsSecretOpen(false);
            return next;
          });
        }}
        className="w-full text-left"
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50/80 backdrop-blur-sm flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-200/70">
              <span className="font-mono font-bold text-base leading-none">{Number.isFinite(seq as number) ? seq : '-'}</span>
            </div>
            <div className="flex flex-col">
              <h4 className="text-base font-serif font-bold text-slate-800 leading-tight">
                {titleText}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {subtitle}
                </span>
              </div>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-emerald-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      <div className={`grid grid-cols-1 gap-4 mt-4 ${isExpanded ? 'block' : 'hidden'}`}>
        {hasStructuredData ? (
          <>
            <div className="flex flex-wrap gap-2 mb-2">
              {(historyData['人物'] || '').split(/[，,]/).filter(Boolean).map((p, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">@{p.trim()}</span>
              ))}
              {(historyData['标签'] || '').split('|').filter(Boolean).map((t, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold">#{t.trim()}</span>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block mb-1">事件摘要</label>
                <p className="text-slate-600 text-sm leading-relaxed font-serif bg-emerald-50/30 p-3 rounded-xl border border-emerald-100/30">
                  {historyData['描述']}
                </p>
              </div>

              {historyData['重要信息'] && (
                <div>
                  <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest block mb-1">关键情报</label>
                  <p className="text-slate-500 text-xs leading-relaxed italic">
                    {historyData['重要信息']}
                  </p>
                </div>
              )}

              {historyData['人物关系'] && (
                <div>
                  <label className="text-[10px] font-black text-blue-700 uppercase tracking-widest block mb-1">因果牵缠</label>
                  <p className="text-slate-500 text-[11px] leading-relaxed italic">
                    {historyData['人物关系']}
                  </p>
                </div>
              )}

              {/* 折叠区域 */}
              {(historyData['暗线与伏笔'] || historyData['自动化系统']) && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setIsSecretOpen(!isSecretOpen)}
                    className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-emerald-600 transition-colors"
                  >
                    {isSecretOpen ? (
                      <>收起隐秘信息 <ChevronUp className="w-3 h-3" /></>
                    ) : (
                      <>展开隐秘信息 <ChevronDown className="w-3 h-3" /></>
                    )}
                  </button>

                  {isSecretOpen && (
                    <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      {historyData['暗线与伏笔'] && (
                        <div className="bg-slate-900/5 p-3 rounded-xl border border-dashed border-slate-200">
                          <div className="flex items-center gap-2 mb-1">
                            <ShieldAlert className="w-3 h-3 text-slate-400" />
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">暗流涌动</label>
                          </div>
                          <p className="text-slate-400 text-[11px] leading-relaxed italic">
                            {historyData['暗线与伏笔']}
                          </p>
                        </div>
                      )}
                      {historyData['自动化系统'] && (
                        <div className="bg-emerald-900/5 p-3 rounded-xl border border-dashed border-emerald-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Zap className="w-3 h-3 text-emerald-400" />
                            <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">天道运行</label>
                          </div>
                          <div className="text-emerald-600/70 text-[10px] font-mono leading-tight break-all">
                            {historyData['自动化系统']}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-slate-600 text-sm leading-relaxed font-serif italic pl-4 border-l-2 border-emerald-100">
            {normalizedHistory}
          </p>
        )}
      </div>
      {!isChild && isExpanded && Number.isFinite(branchId as number) && (
        <div className="mt-4">
          <button
            onClick={() => onBranchCreate?.(branchId as number)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-full text-xs font-black shadow-md shadow-emerald-100 hover:shadow-lg hover:bg-emerald-600 hover:-translate-y-0.5 transition-all"
          >
            跳转分支 <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

const HistoryModal: React.FC<HistoryModalProps> = ({ data, onBranchCreate }) => {
  const sortedData = [...(data || [])].sort((a, b) => {
    const aSeq = resolveSeq(a);
    const bSeq = resolveSeq(b);
    if (aSeq !== bSeq) return aSeq - bSeq;
    return (a.id || 0) - (b.id || 0);
  });

  const parsedItems = sortedData.map((m, idx) => {
    const normalizedHistory = (m.history || '').replace(/｜/g, '|');
    const lines = normalizedHistory.split('\n').map((l: string) => l.trim()).filter(Boolean);
    const historyData: Record<string, string> = {};
    lines.forEach((line: string) => {
      const pipeIndex = line.indexOf('|');
      if (pipeIndex !== -1) {
        const key = line.slice(0, pipeIndex).trim();
        const value = line.slice(pipeIndex + 1).trim();
        if (key) historyData[key] = value;
      }
    });
    const seq = resolveSeq(m);
    const chapterMatch = normalizedHistory.match(/章节分卷\|第(\d+)-(\d+)层/);
    const chapterRange = chapterMatch
      ? { start: parseInt(chapterMatch[1], 10), end: parseInt(chapterMatch[2], 10) }
      : null;
    const title = historyData['标题'] || (chapterRange ? `章节分卷 第${chapterRange.start}-${chapterRange.end}层` : '');
    return { m, idx, seq, chapterRange, title };
  });

  const chapterGroups = parsedItems.filter(item => item.chapterRange);
  const hiddenSeqs = new Set<number>();
  const groupMap = new Map<number, { group: any; items: any[] }>();
  chapterGroups.forEach(groupItem => {
    const range = groupItem.chapterRange!;
    const children = parsedItems.filter(item => item.seq >= range.start && item.seq <= range.end && item !== groupItem);
    children.forEach(child => hiddenSeqs.add(child.seq));
    groupMap.set(groupItem.seq, { group: groupItem, items: children });
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2 custom-scrollbar space-y-4">
      {sortedData.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-300 gap-4">
          <Clock className="w-12 h-12 opacity-20" />
          <p className="font-serif italic tracking-widest">岁月未留痕迹...</p>
        </div>
      ) : (
        parsedItems.map((item, i) => {
          const group = groupMap.get(item.seq);
          if (group) {
            return (
              <ChapterGroup
                key={`chapter-${item.seq}`}
                group={group}
                onBranchCreate={onBranchCreate}
              />
            );
          }
          if (hiddenSeqs.has(item.seq)) return null;
          return (
            <HistoryItem
              key={item.m.id}
              m={item.m}
              i={i}
              onBranchCreate={onBranchCreate}
              seq={Number.isFinite(item.seq) ? item.seq : null}
            />
          );
        })
      )}
    </div>
  );
};

const ChapterGroup: React.FC<{ group: { group: any; items: any[] }; onBranchCreate?: (id: number) => void }> = ({ group, onBranchCreate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const title = group.group.title || '章节分卷';
  const range = group.group.chapterRange;

  return (
    <div className="bg-white/70 backdrop-blur-md border border-emerald-200/80 rounded-2xl p-4 shadow-sm">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500">章节分卷</div>
          <div className="text-base font-serif font-bold text-slate-800">{title}</div>
          {range && (
            <div className="text-[10px] text-slate-400 mt-1">第 {range.start} - {range.end} 层</div>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-emerald-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="mt-4 space-y-3">
          <HistoryItem
            m={group.group.m}
            i={0}
            onBranchCreate={onBranchCreate}
            seq={Number.isFinite(group.group.seq) ? group.group.seq : null}
          />
          {group.items.length === 0 && (
            <div className="text-xs text-slate-400 italic">暂无可展开的历史条目</div>
          )}
          {group.items.map((child, idx) => (
            <HistoryItem
              key={`child-${child.m.id}`}
              m={child.m}
              i={idx}
              onBranchCreate={onBranchCreate}
              isChild
              seq={Number.isFinite(child.seq) ? child.seq : null}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryModal;
