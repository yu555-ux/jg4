import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2, BookOpen, Save, Brain } from 'lucide-react';

interface Props {
  time: { year: number | string; date: string; hour: string };
  location: { domain: string; region: string; place: string; scene: string };
  erosion: number;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenInspect: () => void;
  onToggleReadingMode: () => void;
  onToggleSaveMode: () => void;
}

const Header: React.FC<Props> = ({
  time,
  location,
  erosion,
  isFullscreen,
  onToggleFullscreen,
  onOpenInspect,
  onToggleReadingMode,
  onToggleSaveMode
}) => {
  const [compactLocationOpen, setCompactLocationOpen] = useState(false);
  const [compactTimeOpen, setCompactTimeOpen] = useState(false);

  useEffect(() => {
    if (!compactLocationOpen && !compactTimeOpen) return;
    const handleClick = () => {
      setCompactLocationOpen(false);
      setCompactTimeOpen(false);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [compactLocationOpen, compactTimeOpen]);
  return (
    <header className="absolute top-0 left-0 right-0 glass-panel border-b border-emerald-100 px-2 md:px-6 py-1.5 md:py-0 md:h-20 z-40">
      <div
        className="mx-auto w-full"
        style={{ maxWidth: 'var(--taixujie-app-width, 1200px)' }}
      >
      {/* 手机适配布局（仅小屏） */}
      <div className="md:hidden">
        <div
          className="grid grid-cols-[1fr_auto_1fr] items-center gap-1"
          style={{ columnGap: 'var(--taixujie-topbar-gap, 16px)' }}
        >
          {/* 左侧：位置信息 */}
          <div
            className="flex items-center gap-1 min-w-0"
            style={{ columnGap: 'var(--taixujie-topbar-gap, 16px)' }}
          >
            <div className="relative min-w-0">
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setCompactLocationOpen(prev => !prev);
                  setCompactTimeOpen(false);
                }}
                className="flex flex-col min-w-0 text-left"
                title="查看地点与时间详情"
              >
                <div className="text-sm font-bold text-slate-800 font-serif leading-tight truncate">
                  {location.scene}
                </div>
              </button>
              <div
                onClick={(event) => event.stopPropagation()}
                className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 max-w-[70vw] bg-white/95 backdrop-blur-xl border border-emerald-100 rounded-2xl px-4 py-3 shadow-xl md:hidden transition-all duration-200 ${compactLocationOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none'
                  }`}
              >
                <div className="text-[11px] text-slate-700 font-bold whitespace-normal">
                  <div className="truncate">{location.domain}</div>
                  <div className="truncate">{location.region}</div>
                  <div className="truncate">{location.place}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 中间：侵蚀数值 */}
          <div className="flex flex-col items-center justify-center min-w-[64px]">
            <span className="text-[9px] text-rose-300 font-bold uppercase tracking-tighter">侵蚀</span>
            <span className="text-xs font-mono font-bold text-rose-500 leading-none text-center">
              {erosion.toFixed(4)}%
            </span>
          </div>

          {/* 右侧：时间信息 */}
          <div
            className="flex items-center justify-end gap-1 min-w-0"
            style={{ columnGap: 'var(--taixujie-topbar-gap, 16px)' }}
          >
            <div className="relative min-w-0">
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setCompactTimeOpen(prev => !prev);
                  setCompactLocationOpen(false);
                }}
                className="flex flex-col items-end min-w-0"
                title="查看地点与时间详情"
              >
                <div className="text-sm font-bold text-slate-800 font-serif leading-tight text-right w-full truncate">
                  {time.hour}
                </div>
              </button>
              <div
                onClick={(event) => event.stopPropagation()}
                className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 max-w-[70vw] bg-white/95 backdrop-blur-xl border border-emerald-100 rounded-2xl px-4 py-3 shadow-xl md:hidden transition-all duration-200 ${compactTimeOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none'
                  }`}
              >
                <div className="text-[11px] text-slate-700 font-bold whitespace-normal">
                  <div className="truncate">{typeof time.year === 'number' ? `${time.year}年` : time.year}</div>
                  <div className="truncate">{time.date}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 侵蚀度单独一行 */}
        <div className="mt-1 flex items-center justify-center">
          <div className="h-1.5 bg-rose-50 rounded-full overflow-hidden border border-rose-100/50 shadow-inner w-[140px]">
            <div
              className="h-full bg-linear-to-r from-rose-300 to-rose-500 transition-all duration-1000"
              style={{ width: `${erosion}%` }}
            />
          </div>
        </div>
      </div>

      {/* 电脑/平板保持原方案 */}
      <div
        className="hidden md:flex items-center justify-between gap-4 h-20"
        style={{ columnGap: 'var(--taixujie-topbar-gap, 16px)' }}
      >
        {/* 左侧：位置信息 & 全屏切换 */}
        <div
          className="flex items-center gap-4 flex-1"
          style={{ columnGap: 'var(--taixujie-topbar-gap, 16px)' }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleFullscreen}
              className="p-2 hover:bg-emerald-50 rounded-full transition-colors text-emerald-700"
              title={isFullscreen ? "退出全屏" : "全屏模式"}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onOpenInspect}
              className="p-2 hover:bg-emerald-50 rounded-full transition-colors text-emerald-700"
              title="思维链/变量"
            >
              <Brain className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-[10px] text-slate-700 font-bold">
              <span>{location.domain} · {location.region} · {location.place}</span>
            </div>
            <div className="text-lg font-bold text-slate-800 font-serif leading-tight">
              {location.scene}
            </div>
          </div>
        </div>

        {/* 中间：侵蚀度 */}
        <div className="flex-1 max-w-xs flex flex-col items-center gap-1">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-rose-300 font-bold uppercase tracking-tighter">侵蚀</span>
            <span className="text-sm font-mono font-bold text-rose-500 leading-none">
              {erosion.toFixed(4)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-rose-50 rounded-full overflow-hidden border border-rose-100/50 shadow-inner">
            <div
              className="h-full bg-linear-to-r from-rose-300 to-rose-500 transition-all duration-1000"
              style={{ width: `${erosion}%` }}
            />
          </div>
        </div>

        {/* 右侧：时间信息 & 功能按钮 */}
        <div
          className="flex-1 flex items-center justify-end gap-4"
          style={{ columnGap: 'var(--taixujie-topbar-gap, 16px)' }}
        >
          <div className="flex flex-col items-center">
            <div className="text-[10px] text-slate-700 font-bold text-right w-full">
              {typeof time.year === 'number' ? `${time.year}年` : time.year} · {time.date}
            </div>
            <div className="text-lg font-bold text-slate-800 font-serif leading-tight text-right w-full">
              {time.hour}
            </div>
          </div>
          <div
            className="flex items-center gap-2 ml-2"
            style={{ columnGap: 'var(--taixujie-topbar-gap, 16px)' }}
          >
            <button
              onClick={onToggleReadingMode}
              className="p-2 hover:bg-emerald-50 rounded-full transition-colors text-emerald-700"
              title="阅读模式"
            >
              <BookOpen className="w-5 h-5" />
            </button>
            <button
              onClick={onToggleSaveMode}
              className="p-2 hover:bg-emerald-50 rounded-full transition-colors text-emerald-700"
              title="存档列表"
            >
              <Save className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 小屏详情弹层 */}
      {/* 气泡已移至对应按钮下方 */}
      </div>
    </header>
  );
};

export default Header;
