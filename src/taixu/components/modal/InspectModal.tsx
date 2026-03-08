import React from 'react';

interface InspectModalProps {
  onOpenThink: () => void;
  onOpenChanges: () => void;
}

const InspectModal: React.FC<InspectModalProps> = ({
  onOpenThink,
  onOpenChanges
}) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-3">
        <button
          onClick={onOpenThink}
          className="px-4 py-3 rounded-xl border border-emerald-100 bg-white/70 text-sm font-bold text-slate-700 hover:bg-emerald-50 transition-colors"
        >
          查看思维链
        </button>
        <button
          onClick={onOpenChanges}
          className="px-4 py-3 rounded-xl border border-emerald-100 bg-white/70 text-sm font-bold text-slate-700 hover:bg-emerald-50 transition-colors"
        >
          查看变量
        </button>
      </div>
    </div>
  );
};

export default InspectModal;
