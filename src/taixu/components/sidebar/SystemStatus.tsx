import React from 'react';
import { GridBar, ProgressBar } from '../UIElements';

interface Props {
  state: any;
}

const SystemStatus: React.FC<Props> = ({ state }) => {
  const safeState = state || {};
  let userName = '玩家';
  try {
    // @ts-ignore
    if (typeof substitudeMacros === 'function') {
      // @ts-ignore
      userName = substitudeMacros('{{user}}') || userName;
    }
  } catch {
  }

  return (
    <>
      <section className="mb-8 mt-4">
        <h3 className="text-emerald-800 font-bold mb-4 border-b border-emerald-200 pb-2">
          仙玉录 ({userName})
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-800">仙玉录等级</span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">Lv.{safeState.等级 ?? 1}</span>
          </div>
          <ProgressBar label="经验值" current={safeState.$当前经验 ?? safeState.经验值 ?? 0} max={1000} colorClass="bg-emerald-500" />
          <div className="flex justify-between mt-2">
            <span className="font-bold text-slate-800">仙缘</span>
            <span className="font-bold text-amber-600 flex items-center gap-1">{safeState.仙缘 ?? 0}</span>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <GridBar label="当前行动点数 (AP)" current={safeState.当前行动点 ?? 0} max={safeState.最大行动点 ?? 10} />
      </section>
    </>
  );
};

export default SystemStatus;
