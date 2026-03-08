import React, { useMemo, useState } from 'react';
import type { VariableChange } from '../../utils/variableDiff';

interface ChangesModalProps {
  variableChanges: Record<string, VariableChange[]>;
  moduleOrder: string[];
  onBack?: () => void;
}

const ChangesModal: React.FC<ChangesModalProps> = ({ variableChanges, moduleOrder, onBack }) => {
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});

  const orderedModules = useMemo(() => {
    const ordered: [string, VariableChange[]][] = [];
    moduleOrder.forEach((name) => {
      if (variableChanges[name]) ordered.push([name, variableChanges[name]]);
    });
    Object.entries(variableChanges).forEach(([name, list]) => {
      if (!ordered.find(([key]) => key === name)) ordered.push([name, list]);
    });
    return ordered;
  }, [moduleOrder, variableChanges]);

  const formatValue = (value: any) => {
    if (value === undefined) return '空';
    if (value === null) return '空';
    if (typeof value === 'string') {
      return value.length > 30 ? `${value.slice(0, 30)}…` : value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return `数组(${value.length})`;
    if (typeof value === 'object') return `对象(${Object.keys(value).length})`;
    return String(value);
  };

  const trimPath = (path: string, moduleName: string) => {
    if (path === moduleName) return '（整体）';
    if (path.startsWith(`${moduleName}.`)) return path.slice(moduleName.length + 1);
    return path;
  };

  const changeBadgeClass = (kind: VariableChange['kind']) => {
    if (kind === 'added') return 'bg-emerald-100 text-emerald-700';
    if (kind === 'removed') return 'bg-rose-100 text-rose-700';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
        <div className="p-4 bg-white/40 border border-emerald-100 rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-emerald-50 pb-2">
            <span className="text-sm text-slate-800 font-bold">变量变动监视器</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest">
                {orderedModules.reduce((sum, [, list]) => sum + list.length, 0)} 条
              </span>
              {onBack && (
                <button
                  onClick={onBack}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-100 text-emerald-700 hover:bg-emerald-50 transition-colors"
                >
                  返回
                </button>
              )}
            </div>
          </div>

          {orderedModules.length === 0 ? (
            <div className="text-[12px] text-slate-400 italic py-6 text-center">本轮暂无变更</div>
          ) : (
            <div className="space-y-2">
              {orderedModules.map(([moduleName, list]) => {
                const isOpen = openModules[moduleName] ?? true;
                return (
                  <div key={moduleName} className="border border-emerald-50 rounded-lg bg-white/50">
                    <button
                      onClick={() => setOpenModules(prev => ({ ...prev, [moduleName]: !isOpen }))}
                      className="w-full flex items-center justify-between px-3 py-2 text-left"
                    >
                      <span className="text-xs font-black text-emerald-800 tracking-widest uppercase">
                        {moduleName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">{list.length}</span>
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-3 space-y-2">
                        {list.map((change, idx) => (
                          <div key={`${change.path}-${idx}`} className="p-2 rounded-md border border-emerald-50 bg-white">
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-xs text-slate-700 font-bold break-all">
                                {trimPath(change.path, moduleName)}
                              </div>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded ${changeBadgeClass(change.kind)}`}>
                                {change.kind}
                              </span>
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500 flex flex-wrap gap-1">
                              <span className="text-slate-400">旧:</span>
                              <span className="text-slate-700 font-medium">{formatValue(change.before)}</span>
                              <span className="text-slate-300 mx-1">→</span>
                              <span className="text-slate-700 font-medium">{formatValue(change.after)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangesModal;
