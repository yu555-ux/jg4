import React from 'react';
import { ChevronRight } from 'lucide-react';

export const AuthorityButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between p-3 bg-white/50 border border-emerald-50 rounded-lg hover:border-emerald-300 hover:bg-white transition-all shadow-sm active:scale-95"
  >
    <div className="flex items-center gap-3">
      <span className="text-sm font-bold text-slate-800">{label}</span>
    </div>
    <ChevronRight className="w-4 h-4 text-slate-300" />
  </button>
);

export const EquipSlot = ({ label, name }: { label: string; name: string }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10px] uppercase tracking-wider text-slate-600 font-bold">{label}</span>
    <div className="flex items-center gap-2 p-2 bg-emerald-50/50 rounded border border-emerald-100">
      <span className="text-xs text-emerald-900 font-bold">{name}</span>
    </div>
  </div>
);
