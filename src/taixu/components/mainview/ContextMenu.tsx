import React from 'react';

interface ContextMenuProps {
  contextMenu: { x: number; y: number } | null;
  onEditOpen: () => void;
  onRegenerate: () => void;
  onVariableRegenerate: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  contextMenu,
  onEditOpen,
  onRegenerate,
  onVariableRegenerate,
}) => {
  if (!contextMenu) return null;

  return (
    <div
      className="context-menu-panel fixed z-100 bg-white/95 backdrop-blur-xl border border-emerald-100 rounded-2xl shadow-2xl py-2 min-w-[140px] animate-in fade-in zoom-in-95 duration-200"
      style={{
        left: `${Math.min(contextMenu.x, window.innerWidth - 160)}px`,
        top: `${Math.min(contextMenu.y, window.innerHeight - 120)}px`,
      }}
      onClick={event => event.stopPropagation()}
    >
      <button
        onClick={onEditOpen}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-emerald-50 text-slate-700 transition-colors"
      >
        <span className="text-sm font-bold tracking-widest">正文修改</span>
      </button>
      <button
        onClick={onRegenerate}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-rose-50 text-slate-700 transition-colors"
      >
        <span className="text-sm font-bold tracking-widest">全部重roll</span>
      </button>
      <button
        onClick={onVariableRegenerate}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-amber-50 text-slate-700 transition-colors"
      >
        <span className="text-sm font-bold tracking-widest">变量重roll</span>
      </button>
    </div>
  );
};

export default ContextMenu;
