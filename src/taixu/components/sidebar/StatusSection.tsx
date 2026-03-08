import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ProgressBar } from '../UIElements';

interface Props {
  char: any;
  body: any;
  uterus: any;
}

const StatusSection: React.FC<Props> = ({ char = {}, body = {}, uterus = {} }) => {
  const [isBodyOpen, setIsBodyOpen] = useState(false);
  const totalCorruption = char?.总堕落值 || 0;
  const progressValue = totalCorruption > 0 && totalCorruption % 100 === 0 ? 100 : totalCorruption % 100;
  const displayMax = Math.max(100, Math.ceil(totalCorruption / 100) * 100);
  const stageName = char?.$堕落评价;

  return (
    <>
      <section className="mb-8 p-4 bg-rose-50/50 rounded-lg border border-rose-100">
        <h3 className="text-rose-800 font-bold mb-3">
          {stageName}
        </h3>
        <div className="mb-4">
          <ProgressBar
            label="堕落进度"
            current={progressValue}
            max={100}
            displayCurrent={totalCorruption}
            displayMax={displayMax}
            colorClass="bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
            showValues={true}
          />
        </div>
        <ProgressBar label="兴奋值" current={char?.兴奋值} max={100} colorClass="bg-orange-400" />
      </section>

      <section className="mb-8">
        <button
          onClick={() => setIsBodyOpen(prev => !prev)}
          className="w-full flex items-center justify-between text-emerald-800 font-bold mb-4 border-b border-emerald-200 pb-2"
        >
          身体开发
          <ChevronDown className={`w-4 h-4 transition-transform ${isBodyOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className={`space-y-4 transition-all ${isBodyOpen ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
          {[
            { name: '嘴巴', data: body?.嘴巴 },
            { name: '胸部', data: body?.胸部 },
            { name: '小穴', data: body?.小穴 },
            { name: '屁穴', data: body?.屁穴 }
          ].map(part => (
            <div key={part.name} className="bg-white/50 p-3 rounded-lg border border-emerald-50">
              <div className="flex justify-between mb-2 text-xs font-medium text-slate-400">
                <span className="flex items-center gap-1">
                  {part.name}
                  {part.data?.$开发评价 && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-sm text-[10px] font-black">{part.data.$开发评价}</span>}
                </span>
                <span>Lv.{part?.data?.开发等级} / 使用: {part?.data?.使用次数}次</span>
              </div>
              <p className="text-sm text-slate-800 font-bold leading-relaxed">
                {part?.data?.状态描述}
              </p>
            </div>
          ))}
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
            <div className="text-sm font-bold text-purple-400 mb-2">子宫</div>
            <ProgressBar label="容量" current={uterus?.当前容量} max={uterus?.max || uterus?.最大容量} colorClass="bg-purple-400" />
            <div className="mt-2 text-sm text-slate-800 font-bold leading-relaxed">
              {uterus?.状态描述}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default StatusSection;
