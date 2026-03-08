import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { parseJudgements } from '../../utils/judgementParser';
import { JudgementCard } from '../JudgementCard';

type ReadingPage = {
  index: number;
  base?: { id: number; role: string; text: string; historyTitle?: string };
  user?: { id: number; role: string; text: string };
};

interface ReadingModalProps {
  data: any;
}

const ReadingModal: React.FC<ReadingModalProps> = ({ data }) => {
  const payload = Array.isArray(data) ? { pages: data } : (data || {});
  const pages = (payload.pages || []) as ReadingPage[];
  const chapterRanges = (payload.chapterRanges || []) as Array<{ start: number; end: number; title: string }>;
  const statData = payload.stat_data || {};
  const hostName = statData?.角色基础?.宿主 || statData?.角色基础?.姓名 || '无名';
  const richTextSettings = {
    quoteColor: 'text-slate-800',
    singleStarColor: 'text-pink-400',
    doubleStarColor: 'text-rose-500',
    bracketColor: 'text-blue-500',
    quoteBold: true,
    quoteItalic: true,
    singleStarBold: false,
    singleStarItalic: true,
    doubleStarBold: true,
    doubleStarItalic: false,
    bracketBold: false,
    bracketItalic: false,
    ...(payload.richTextSettings || {})
  };
  const [pageIndex, setPageIndex] = useState(0);
  const [expandedUser, setExpandedUser] = useState<Record<number, boolean>>({});
  const [expandedChapters, setExpandedChapters] = useState<Record<number, boolean>>({});
  const titleRef = useRef<HTMLSpanElement | null>(null);

  const fitTitle = (maxSize = 28, minSize = 14) => {
    const el = titleRef.current;
    if (!el) return;
    let size = maxSize;
    el.style.fontSize = `${size}px`;
    while (size > minSize && el.scrollWidth > el.clientWidth) {
      size -= 1;
      el.style.fontSize = `${size}px`;
    }
  };

  useEffect(() => {
    if (!Array.isArray(pages) || pages.length === 0) {
      setPageIndex(0);
      setExpandedUser({});
      setExpandedChapters({});
    }
  }, [pages]);

  const totalPages = pages.length;
  const totalDisplayPages = totalPages + 1; // +1 for directory page
  const isDirectoryPage = pageIndex === 0;
  const page = isDirectoryPage ? undefined : pages[pageIndex - 1];
  const canPrev = pageIndex > 0;
  const canNext = pageIndex < totalDisplayPages - 1;

  const chapterGroups = useMemo(() => {
    return chapterRanges.map((range, idx) => {
      const pageIndices = pages
        .map((p, pageIdx) => {
          const baseId = p?.base?.id;
          if (typeof baseId !== 'number') return null;
          const floor = Math.floor(baseId / 2);
          return floor >= range.start && floor <= range.end ? pageIdx + 1 : null;
        })
        .filter((p) => typeof p === 'number') as number[];
      return {
        id: idx,
        title: range.title || `章节分卷 第${range.start}-${range.end}层`,
        range,
        pageIndices
      };
    }).filter(group => group.pageIndices.length > 0);
  }, [chapterRanges, pages]);

  const hiddenPageIndices = useMemo(() => {
    const hidden = new Set<number>();
    chapterGroups.forEach(group => group.pageIndices.forEach(i => hidden.add(i)));
    return hidden;
  }, [chapterGroups]);

  const chapterEntries = useMemo(() => {
    const entries: Array<{ chapterNo: number; title: string; pageIndex: number }> = [];
    pages.forEach((p, idx) => {
      const title = p?.base?.historyTitle;
      if (!title) return;
      const pageIndex = idx + 1;
      if (hiddenPageIndices.has(pageIndex)) return;
      entries.push({
        chapterNo: entries.length + 1,
        title,
        pageIndex
      });
    });
    return entries;
  }, [hiddenPageIndices, pages]);

  const userCollapsed = useMemo(() => {
    if (!page?.user) return true;
    return !expandedUser[pageIndex];
  }, [expandedUser, page, pageIndex]);

  useEffect(() => {
    if (!page?.base?.historyTitle) return;
    const el = titleRef.current;
    if (!el) return;
    fitTitle();
    const observer = new ResizeObserver(() => fitTitle());
    observer.observe(el);
    return () => observer.disconnect();
  }, [page?.base?.historyTitle]);

  const renderRichText = (text: string) => {
    const buildClass = (color: string, bold: boolean, italic: boolean) => {
      return `${color}${bold ? ' font-bold' : ''}${italic ? ' italic' : ''}`.trim();
    };

    type TokenType = 'double' | 'single' | 'quote' | 'bracket';
    type Node =
      | { type: 'text'; value: string }
      | { type: 'token'; token: TokenType; children: Node[] }
      | { type: 'root'; children: Node[] };

    const tokenDefs = [
      {
        token: 'double' as const,
        open: '**',
        close: '**',
        className: buildClass(richTextSettings.doubleStarColor, richTextSettings.doubleStarBold, richTextSettings.doubleStarItalic),
        wrap: (nodes: React.ReactNode[]) => <>{nodes}</>,
      },
      {
        token: 'single' as const,
        open: '*',
        close: '*',
        className: buildClass(richTextSettings.singleStarColor, richTextSettings.singleStarBold, richTextSettings.singleStarItalic),
        wrap: (nodes: React.ReactNode[]) => <>{nodes}</>,
      },
      {
        token: 'quote' as const,
        open: '“',
        close: '”',
        className: buildClass(richTextSettings.quoteColor, richTextSettings.quoteBold, richTextSettings.quoteItalic),
        wrap: (nodes: React.ReactNode[]) => <>“{nodes}”</>,
      },
      {
        token: 'bracket' as const,
        open: '「',
        close: '」',
        className: buildClass(richTextSettings.bracketColor, richTextSettings.bracketBold, richTextSettings.bracketItalic),
        wrap: (nodes: React.ReactNode[]) => <>「{nodes}」</>,
      },
    ];

    const root: Node = { type: 'root', children: [] };
    const stack: Node[] = [root];
    let buffer = '';

    const flush = () => {
      if (!buffer) return;
      const current = stack[stack.length - 1];
      if (current.type === 'token' || current.type === 'root') {
        current.children.push({ type: 'text', value: buffer });
      }
      buffer = '';
    };

    const sortedDefs = [...tokenDefs].sort((a, b) => b.open.length - a.open.length);
    let i = 0;
    while (i < text.length) {
      let matched = false;
      for (const def of sortedDefs) {
        if (text.startsWith(def.open, i)) {
          const top = stack[stack.length - 1];
          const isSymmetric = def.open === def.close;
          if (isSymmetric && top.type === 'token' && top.token === def.token) {
            flush();
            stack.pop();
          } else {
            flush();
            const node: Node = { type: 'token', token: def.token, children: [] };
            if (top.type === 'token' || top.type === 'root') top.children.push(node);
            stack.push(node);
          }
          i += def.open.length;
          matched = true;
          break;
        }
        if (def.open !== def.close && text.startsWith(def.close, i)) {
          const top = stack[stack.length - 1];
          if (top.type === 'token' && top.token === def.token) {
            flush();
            stack.pop();
            i += def.close.length;
            matched = true;
            break;
          }
        }
      }
      if (!matched) {
        buffer += text[i];
        i += 1;
      }
    }
    flush();
    while (stack.length > 1) {
      const unclosed = stack.pop();
      if (unclosed?.type === 'token') {
        const parent = stack[stack.length - 1];
        if (parent.type === 'token' || parent.type === 'root') {
          parent.children.push({
            type: 'text',
            value: unclosed.children.map(node => (node.type === 'text' ? node.value : '')).join('')
          });
        }
      }
    }

    const renderNodes = (nodes: Node[]): React.ReactNode[] => {
      const rendered: React.ReactNode[] = [];
      let keyIndex = 0;
      for (const node of nodes) {
        if (node.type === 'text') {
          rendered.push(node.value);
        } else if (node.type === 'token') {
          const def = tokenDefs.find(d => d.token === node.token);
          if (!def) {
            rendered.push(node.children.map(child => (child.type === 'text' ? child.value : '')));
          } else {
            rendered.push(
              <span key={`rt-${keyIndex++}`} className={def.className}>
                {def.wrap(renderNodes(node.children))}
              </span>
            );
          }
        }
      }
      return rendered;
    };

    return <>{renderNodes(root.children)}</>;
  };

  const renderMessageContent = (text: string) => {
    const judgements = parseJudgements(text);
    if (judgements.length === 0) {
      return (
        <div className="text-lg leading-relaxed text-slate-800 font-serif space-y-4">
          {text.split("\n").filter(p => p.trim()).map((paragraph, idx) => (
            <p key={idx} className="indent-8 text-justify">
              {renderRichText(paragraph.trim())}
            </p>
          ))}
        </div>
      );
    }

    const blocks = text.split(/(\[[\s\S]*?\])/g);
    return (
      <div className="text-lg leading-relaxed text-slate-800 font-serif space-y-4">
        {blocks.map((block, idx) => {
          if (block.startsWith("[") && block.endsWith("]")) {
            const parsed = parseJudgements(block);
            if (parsed.length > 0) {
              return <JudgementCard key={idx} data={parsed[0]} />;
            }
          }

          if (!block.trim()) return null;

          return block.split("\n").filter(p => p.trim()).map((paragraph, pIdx) => (
            <p key={`${idx}-${pIdx}`} className="indent-8 text-justify">
              {renderRichText(paragraph.trim())}
            </p>
          ));
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full pb-8">
      {totalPages === 0 && (
        <div className="h-64 flex flex-col items-center justify-center text-slate-300 gap-4">
          <BookOpen className="w-12 h-12 opacity-20" />
          <p className="font-serif italic tracking-widest">暂无文字记录...</p>
        </div>
      )}

      {totalPages > 0 && (
        <>
          <div className="flex items-center justify-between px-4 pb-4 border-b border-emerald-50">
            <button
              onClick={() => setPageIndex(prev => Math.max(0, prev - 1))}
              disabled={!canPrev}
              className={`p-2 rounded-full border ${canPrev ? 'border-emerald-100 text-emerald-700 hover:bg-emerald-50' : 'border-slate-100 text-slate-300 cursor-not-allowed'}`}
              title="上一页"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-black tracking-[0.3em] text-emerald-700 uppercase">
              第 {pageIndex + 1} / {totalDisplayPages} 页
            </span>
            <button
              onClick={() => setPageIndex(prev => Math.min(totalDisplayPages - 1, prev + 1))}
              disabled={!canNext}
              className={`p-2 rounded-full border ${canNext ? 'border-emerald-100 text-emerald-700 hover:bg-emerald-50' : 'border-slate-100 text-slate-300 cursor-not-allowed'}`}
              title="下一页"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-8 pt-6">
            {isDirectoryPage && (
              <div className="px-6 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-6">
                  <div className="text-2xl font-serif font-black text-emerald-800 tracking-[0.2em]">
                    《太虚诡话—{hostName}传》
                  </div>
                </div>
                <div className="space-y-3">
                  {chapterGroups.map(group => {
                    const isOpen = !!expandedChapters[group.id];
                    return (
                      <div key={`group-${group.id}`} className="border border-emerald-100 rounded-xl bg-white/60">
                        <button
                          onClick={() => setExpandedChapters(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                          className="w-full text-left px-4 py-3 rounded-xl hover:bg-emerald-50 transition-colors"
                        >
                          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500">章节分卷</div>
                          <div className="text-base font-serif font-bold text-slate-800 mt-1">{group.title}</div>
                          <div className="text-[10px] text-slate-400 mt-1">第 {group.range.start} - {group.range.end} 层</div>
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-3 space-y-2">
                            {group.pageIndices.map((pageIdx) => {
                              const p = pages[pageIdx - 1];
                              const title = p?.base?.historyTitle || `第 ${pageIdx} 页`;
                              return (
                                <button
                                  key={`group-${group.id}-page-${pageIdx}`}
                                  onClick={() => setPageIndex(pageIdx)}
                                  className="w-full text-left px-3 py-2 rounded-lg border border-emerald-50 bg-white/70 hover:bg-emerald-50 transition-colors"
                                >
                                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">卷内篇章</div>
                                  <div className="text-sm font-serif font-bold text-slate-700">{title}</div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {chapterEntries.map(entry => (
                    <button
                      key={`toc-${entry.chapterNo}`}
                      onClick={() => setPageIndex(entry.pageIndex)}
                      className="w-full text-left px-4 py-3 rounded-xl border border-emerald-100 bg-white/60 hover:bg-emerald-50 transition-colors"
                    >
                      <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500">第 {entry.chapterNo} 章</div>
                      <div className="text-base font-serif font-bold text-slate-800 mt-1">{entry.title}</div>
                    </button>
                  ))}
                  {chapterEntries.length === 0 && (
                    <div className="text-sm text-slate-400 text-center">暂无章节标题</div>
                  )}
                </div>
              </div>
            )}

            {!isDirectoryPage && page?.base && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {page.base.role === 'assistant' && page.base.historyTitle && (
                  <div className="px-4 mb-5 flex items-center gap-4">
                    <span className="h-px flex-1 bg-emerald-100" />
                    <span
                      ref={titleRef}
                      className="flex-1 italic font-serif font-bold text-emerald-700 tracking-[0.12em] whitespace-nowrap text-center"
                    >
                      {page.base.historyTitle}
                    </span>
                    <span className="h-px flex-1 bg-emerald-100" />
                  </div>
                )}
                <div className="px-4">
                  {renderMessageContent(page.base.text)}
                </div>
              </div>
            )}

            {!isDirectoryPage && page?.user && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="px-4 mb-2 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">玩家消息</span>
                  <button
                    onClick={() => setExpandedUser(prev => ({ ...prev, [pageIndex]: !prev[pageIndex] }))}
                    className="text-[10px] font-black text-emerald-600 hover:text-emerald-700"
                  >
                    {userCollapsed ? '展开' : '收起'}
                  </button>
                </div>
                {userCollapsed ? (
                  <div className="mx-4 p-4 border border-emerald-50 bg-white/60 rounded-xl text-slate-400 text-sm italic">
                    玩家消息已折叠
                  </div>
                ) : (
                  <div className="px-4">
                    {renderMessageContent(page.user.text)}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ReadingModal;
