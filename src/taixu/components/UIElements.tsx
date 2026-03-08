import React from 'react';

interface ProgressBarProps {
  label: string;
  current: number;
  max: number;
  displayCurrent?: number | string;
  displayMax?: number | string;
  colorClass?: string;
  icon?: React.ReactNode;
  showValues?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  label, current, max, displayCurrent, displayMax, colorClass = "bg-emerald-500", icon, showValues = true
}) => {
  const percentage = Math.min(100, (current / max) * 100);
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1 text-sm font-bold text-slate-800">
        <span className="flex items-center gap-1">{icon}{label}</span>
        {showValues && <span>{displayCurrent ?? current} / {displayMax ?? max}</span>}
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
        <div
          className={`h-full transition-all duration-500 ease-out ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export const AttributeRow: React.FC<{ label: string; current: number; base: number; colorClass?: string }> = ({
  label, current, base, colorClass = "text-slate-800"
}) => (
  <div className="flex justify-between items-center py-1.5 border-b border-emerald-50/50 text-sm">
    <span className="font-bold text-slate-800">{label}</span>
    <div className="flex items-center">
      <span className={`font-bold ${colorClass}`}>{current}</span>
      <span className="text-slate-300 mx-0.5">/</span>
      <span className="font-bold text-slate-400">{base}</span>
    </div>
  </div>
);

export const GridBar: React.FC<{ current: number; max: number; label: string }> = ({ current, max, label }) => {
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs mb-1 font-bold text-slate-800">
        <span>{label}</span>
        <span>{current} AP</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className={`h-4 flex-1 border rounded-sm transition-colors duration-300 ${i < current ? 'bg-emerald-500 border-emerald-600' : 'bg-slate-50 border-slate-200'
              }`}
          />
        ))}
      </div>
    </div>
  );
};
