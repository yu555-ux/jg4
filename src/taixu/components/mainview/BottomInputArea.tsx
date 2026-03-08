import { BookOpen, ChevronUp, Eye, Expand, Plus, Save, ScrollText, Send, Square, Brain } from 'lucide-react';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface BottomInputAreaProps {
  options: Array<{ id: string; text: string }>;
  inputValue: string;
  isGenerating: boolean;
  commandSet: Array<{ name: string; prompt: string }>;
  wheelBadgeCount?: number;
  onInputChange: (value: string) => void;
  onSend: (text?: string) => void;
  onStopGenerating?: () => void;
  onOpenStatusEffects?: () => void;
  onOpenCommands?: () => void;
  onToggleFullscreen?: () => void;
  onOpenReading?: () => void;
  onOpenHistory?: () => void;
  onOpenInspect?: () => void;
}

const BottomInputArea: React.FC<BottomInputAreaProps> = ({
  options,
  inputValue,
  isGenerating,
  commandSet,
  wheelBadgeCount = 0,
  onInputChange,
  onSend,
  onStopGenerating,
  onOpenStatusEffects,
  onOpenCommands,
  onToggleFullscreen,
  onOpenReading,
  onOpenHistory,
  onOpenInspect,
}) => {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);
  const commandContainerRef = useRef<HTMLDivElement>(null);
  const inputWrapRef = useRef<HTMLDivElement | null>(null);
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
  const wheelSize = isMobile ? 220 : 180;
  const [wheelBase, setWheelBase] = useState<{ x: number; y: number } | null>(null);
  const [wheelPos, setWheelPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hasStoredPos, setHasStoredPos] = useState(false);
  const storedPosRef = useRef<{ x: number; y: number } | null>(null);
  const dragStateRef = useRef<{ dragging: boolean; moved: boolean }>({ dragging: false, moved: false });
  const dragStartRef = useRef<{ clientX: number; clientY: number; baseX: number; baseY: number } | null>(null);
  const dragPendingRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const handleSend = (text?: string) => {
    setOptionsOpen(false);
    onSend(text);
  };

  const dragMultiplier = isMobile ? 2.6 : 1;
  const wheelStorageKey = 'taixujie_wheel_pos';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(wheelStorageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
        setWheelPos({ x: parsed.x, y: parsed.y });
        setHasStoredPos(true);
        storedPosRef.current = { x: parsed.x, y: parsed.y };
      }
    } catch {
      // ignore
    }
  }, []);

  useLayoutEffect(() => {
    if (!inputWrapRef.current) return;
    const updateBase = () => {
      const rect = inputWrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const nextBase = {
        x: rect.left + rect.width / 2,
        y: rect.top - 32
      };
      setWheelBase(nextBase);
      if (!hasStoredPos) {
        setWheelPos({ x: 0, y: 0 });
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(updateBase));
    window.addEventListener('resize', updateBase);
    return () => window.removeEventListener('resize', updateBase);
  }, [hasStoredPos]);

  const clampWheel = (pos: { x: number; y: number }) => {
    const half = wheelSize / 2;
    const minX = half;
    const maxX = window.innerWidth - half;
    const minY = half;
    const maxY = window.innerHeight - half;
    return {
      x: Math.min(maxX, Math.max(minX, pos.x)),
      y: Math.min(maxY, Math.max(minY, pos.y))
    };
  };

  useEffect(() => {
    if (!wheelBase) return;
    if (!hasStoredPos) return;
    const base = wheelBase;
    const current = storedPosRef.current || wheelPos;
    const clamped = clampWheel({ x: base.x + current.x, y: base.y + current.y });
    const next = { x: clamped.x - base.x, y: clamped.y - base.y };
    if (next.x !== wheelPos.x || next.y !== wheelPos.y) {
      setWheelPos(next);
      storedPosRef.current = next;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(wheelStorageKey, JSON.stringify(next));
      }
    }
  }, [wheelBase, hasStoredPos]);
  const wheelActions = useMemo(() => {
    const actions = [
      { key: 'status', label: '状态', icon: Eye, onClick: onOpenStatusEffects },
      { key: 'commands', label: '指令', icon: ScrollText, onClick: onOpenCommands }
    ];
    if (isMobile) {
      actions.push(
        { key: 'fullscreen', label: '全屏', icon: Expand, onClick: onToggleFullscreen },
        { key: 'reading', label: '阅读', icon: BookOpen, onClick: onOpenReading },
        { key: 'history', label: '存档', icon: Save, onClick: onOpenHistory },
        { key: 'inspect', label: '变量', icon: Brain, onClick: onOpenInspect }
      );
    }
    return actions;
  }, [isMobile, onOpenStatusEffects, onOpenCommands, onToggleFullscreen, onOpenReading, onOpenHistory, onOpenInspect]);

  return (
    <div className="relative flex flex-col items-center pointer-events-none z-50 px-3 sm:px-4 md:px-6 pb-0 sm:pb-1 md:pb-2 mt-auto">
      <div ref={inputWrapRef} className="max-w-[96vw] sm:max-w-[36rem] lg:max-w-2xl w-full flex flex-col pointer-events-auto relative">
        {/* Input Box Section - 玉白主体 + 无缝圆角衔接 */}
        <div className="w-full flex flex-col pointer-events-none">
          {/* Options Section - 横跨状态与输入框 */}
          {options.length > 0 && (
            <div className="w-full flex flex-col z-40 pointer-events-auto">
              {/* 方形 Toggle Button - 横跨全宽 */}
              <button
                onClick={() => setOptionsOpen(!optionsOpen)}
                className="w-full h-9 sm:h-10 bg-slate-50 flex items-center justify-center gap-2 text-slate-800 hover:text-slate-950 transition-colors border border-slate-800/70 border-b-0 rounded-t-xl rounded-b-none shadow-sm relative overflow-hidden"
              >
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase relative z-10">命运抉择</span>
                <div className={`transition-transform duration-300 relative z-10 ${optionsOpen ? 'rotate-180' : ''}`}>
                  <ChevronUp className="w-4 h-4" />
                </div>
              </button>

              {/* Options List - 全宽方形面板 */}
              <div
                className={`bg-slate-50 transition-all duration-500 ease-in-out overflow-hidden ${optionsOpen ? 'max-h-72 opacity-100 pointer-events-auto' : 'max-h-0 opacity-0 pointer-events-none'
                  } border-x border-t border-slate-800/70 shadow-sm flex flex-col`}
              >
                <div className="p-4 space-y-2.5 overflow-y-auto custom-scrollbar flex-1">
                  {options.map((opt, index) => (
                    <button
                      key={opt.id}
                      onClick={() => handleSend(opt.text)}
                      className="w-full text-left px-6 py-4 bg-white/60 hover:bg-linear-to-br hover:from-slate-700 hover:to-slate-900 rounded-lg border border-slate-800/80 transition-all duration-300 group shadow-sm hover:shadow-[0_0_20px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 animate-[slideIn_0.4s_ease-out] relative overflow-hidden"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                      <span className="text-sm text-slate-800 group-hover:text-white font-medium leading-tight relative z-10">
                        {opt.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="w-full pointer-events-none">
            <div className="flex items-stretch gap-0 pointer-events-auto bg-white border-x border-t border-b border-slate-800/70 shadow-sm rounded-b-xl rounded-t-none overflow-visible">
              <div className="flex-1 relative group/input z-20 flex flex-col">
                {/* 玉白主体 - 动态衔接圆角 */}
                <div className="relative flex flex-col bg-white p-1 transition-all duration-300 rounded-b-xl rounded-t-none overflow-visible">
                  <div className="flex items-center w-full min-h-[50px] sm:min-h-[54px]">
                    {/* 内层暗影 */}
                    <div className="absolute inset-0 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.05)] pointer-events-none"></div>

                    <textarea
                      value={inputValue}
                      onChange={event => onInputChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          handleSend(undefined);
                        }
                      }}
                      placeholder="在此书写你的命决..."
                      className="flex-1 min-w-0 bg-transparent border-none px-2 sm:px-5 py-2 sm:py-2.5 focus:outline-none text-slate-800 placeholder:text-slate-400 resize-none font-serif text-sm sm:text-lg leading-relaxed relative z-10"
                      rows={1}
                    />
                    <button
                      onClick={() => {
                        if (isGenerating) {
                          onStopGenerating?.();
                          return;
                        }
                        handleSend(undefined);
                      }}
                      className={`mr-1 w-11 h-11 sm:w-12 sm:h-12 bg-slate-800 text-white rounded-lg shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300 active:scale-90 group relative z-10 overflow-hidden flex items-center justify-center ${isGenerating ? 'bg-rose-600 hover:bg-rose-600' : ''}`}
                      title={isGenerating ? '中止回复' : '发送'}
                    >
                      <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-[shimmer_2s_ease-in-out_infinite]"></div>
                      {isGenerating ? (
                        <div className="relative w-6 h-6 sm:w-7 sm:h-7">
                          <div className="absolute inset-0 border-2 border-white/35 border-t-white rounded-full animate-spin"></div>
                          <Square className="absolute inset-0 m-auto w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                      ) : (
                        <Send className="w-4 h-4 sm:w-5 sm:h-5 relative z-10 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[30] pointer-events-auto"
          style={wheelBase
            ? (() => {
              const clamped = clampWheel({ x: wheelBase.x + wheelPos.x, y: wheelBase.y + wheelPos.y });
              return { left: clamped.x, top: clamped.y };
            })()
            : { left: '50%', top: '20%', transform: 'translate(-50%, -50%)' }
          }
        >
          <div className="relative" ref={commandContainerRef}>
            <div
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 transition-all duration-300 ${wheelOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
              style={{
                width: isMobile ? 220 : 180,
                height: isMobile ? 220 : 180
              }}
            >
              <div className="absolute inset-0 rounded-full bg-white/80 border border-white/70 backdrop-blur-2xl shadow-[0_20px_55px_rgba(15,23,42,0.22)]" />
              {wheelActions.map((action, idx) => {
                const Icon = action.icon;
                const count = wheelActions.length;
                const angle = isMobile
                  ? (Math.PI * 2 * idx) / count - Math.PI / 2
                  : (idx === 0 ? Math.PI : 0);
                const radius = isMobile ? 78 : 64;
                const size = 44;
                const cx = (isMobile ? 220 : 180) / 2;
                const cy = (isMobile ? 220 : 180) / 2;
                const left = cx + radius * Math.cos(angle) - size / 2;
                const top = cy + radius * Math.sin(angle) - size / 2;
                return (
                  <button
                    key={action.key}
                    onClick={() => {
                      action.onClick?.();
                      setWheelOpen(false);
                    }}
                    className="absolute w-11 h-11 rounded-full bg-white/95 border border-white/80 text-emerald-700 shadow-[0_10px_24px_rgba(15,23,42,0.18)] hover:shadow-[0_12px_30px_rgba(15,23,42,0.22)] transition-all"
                    style={{ left, top }}
                    title={action.label}
                  >
                    <Icon className="w-5 h-5 mx-auto" />
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => {
                if (dragStateRef.current.moved) return;
                setWheelOpen(prev => !prev);
              }}
              onPointerDown={(event) => {
                dragStateRef.current.dragging = true;
                dragStateRef.current.moved = false;
                dragStartRef.current = {
                  clientX: event.clientX,
                  clientY: event.clientY,
                  baseX: wheelPos.x,
                  baseY: wheelPos.y
                };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (!dragStateRef.current.dragging) return;
                if (Math.abs(event.movementX) > 0 || Math.abs(event.movementY) > 0) {
                  dragStateRef.current.moved = true;
                }
                const start = dragStartRef.current;
                if (!start) return;
                const dx = (event.clientX - start.clientX) * dragMultiplier;
                const dy = (event.clientY - start.clientY) * dragMultiplier;
                dragPendingRef.current = {
                  x: start.baseX + dx,
                  y: start.baseY + dy
                };
                if (rafRef.current === null) {
                  rafRef.current = requestAnimationFrame(() => {
                    const pending = dragPendingRef.current;
                    if (pending) {
                      const base = wheelBase || { x: 0, y: 0 };
                      const clamped = clampWheel({ x: base.x + pending.x, y: base.y + pending.y });
                      setWheelPos({
                        x: clamped.x - base.x,
                        y: clamped.y - base.y
                      });
                      if (typeof window !== 'undefined') {
                        window.localStorage.setItem(wheelStorageKey, JSON.stringify({
                          x: clamped.x - base.x,
                          y: clamped.y - base.y
                        }));
                      }
                      dragPendingRef.current = null;
                    }
                    rafRef.current = null;
                  });
                }
              }}
              onPointerUp={(event) => {
                if (!dragStateRef.current.dragging) return;
                dragStateRef.current.dragging = false;
                event.currentTarget.releasePointerCapture(event.pointerId);
                dragPendingRef.current = null;
                dragStartRef.current = null;
              }}
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] w-12 h-12 rounded-full shadow-[0_12px_30px_rgba(15,23,42,0.2)] border border-white/70 backdrop-blur-xl transition-all ${wheelOpen ? 'bg-emerald-500 text-white' : 'bg-white/90 text-emerald-700'}`}
              title={wheelOpen ? '关闭' : '快捷操作'}
            >
              <Plus className={`w-5 h-5 mx-auto transition-transform duration-300 ${wheelOpen ? 'rotate-45 text-white' : ''}`} />
              {wheelBadgeCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                  {wheelBadgeCount > 99 ? '99+' : wheelBadgeCount}
                </span>
              )}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default BottomInputArea;
