import React, { useState } from 'react';
import { ChevronUp, ScrollText, Trash2 } from 'lucide-react';

interface CommandSetModalProps {
  commandSet: Array<{ name: string; prompt: string }>;
  onUpdateCommand?: (index: number, next: { name?: string; prompt?: string }) => void;
  onRemoveCommand?: (index: number) => void;
}

const CommandSetModal: React.FC<CommandSetModalProps> = ({
  commandSet,
  onUpdateCommand,
  onRemoveCommand
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!commandSet || commandSet.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-slate-400 tracking-widest">
        暂无指令
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {commandSet.map((cmd, idx) => {
        const expanded = expandedIndex === idx;
        return (
          <div key={`${cmd.name}-${idx}`} className="rounded-2xl border border-emerald-100 bg-white/90 shadow-sm">
            <button
              onClick={() => setExpandedIndex(expanded ? null : idx)}
              className="w-full flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-900">{cmd.name}</span>
              </div>
              <ChevronUp className={`w-4 h-4 text-emerald-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
            {expanded && (
              <div className="px-4 pb-4 space-y-3">
                <textarea
                  value={cmd.prompt}
                  onChange={(event) => onUpdateCommand?.(idx, { prompt: event.target.value })}
                  className="w-full min-h-[90px] rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 resize-y"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onRemoveCommand?.(idx)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    删除
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CommandSetModal;
