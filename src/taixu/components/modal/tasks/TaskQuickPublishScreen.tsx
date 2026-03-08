import { Send, X } from 'lucide-react';
import React from 'react';
import { getCategoryIcon } from './helpers';

interface TaskQuickPublishScreenProps {
  categories: readonly string[];
  quickTaskType: string;
  quickTaskDesc: string;
  onTypeChange: (value: string) => void;
  onDescChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const TaskQuickPublishScreen: React.FC<TaskQuickPublishScreenProps> = ({
  categories,
  quickTaskType,
  quickTaskDesc,
  onTypeChange,
  onDescChange,
  onCancel,
  onConfirm,
}) => (
  <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
    <div className="h-16 border-b border-slate-100 flex items-center justify-between px-8 bg-slate-50/30 mb-8">
      <div className="flex items-center gap-3">
        <Send className="w-5 h-5 text-emerald-500" />
        <h3 className="text-xl font-bold text-slate-800">发布新任务</h3>
      </div>
      <button onClick={onCancel} className="p-2 hover:bg-rose-50 rounded-full transition-colors text-slate-400 hover:text-rose-500">
        <X className="w-6 h-6" />
      </button>
    </div>

    <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full space-y-8 pb-12">
      <div className="w-full space-y-3">
        <label className="text-sm font-black text-slate-500 uppercase tracking-widest ml-1">任务类型</label>
        <div className="grid grid-cols-3 gap-3">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => onTypeChange(category)}
              className={`py-3 rounded-2xl font-bold border-2 transition-all flex flex-col items-center gap-2 ${quickTaskType === category
                ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-100 scale-105'
                : 'bg-white text-slate-400 border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30'
                }`}
            >
              {getCategoryIcon(category)}
              <span className="text-xs">{category.replace('任务', '')}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="w-full space-y-3">
        <label className="text-sm font-black text-slate-500 uppercase tracking-widest ml-1">任务描述</label>
        <textarea
          value={quickTaskDesc}
          onChange={event => onDescChange(event.target.value)}
          placeholder="简单描述想要进行的任务目标，天道将自动衍化细节..."
          className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:border-emerald-400 focus:bg-white focus:outline-hidden transition-all text-lg font-serif min-h-[200px] shadow-inner text-slate-700"
        />
      </div>

      <div className="flex w-full gap-4 pt-4">
        <button
          onClick={onCancel}
          className="flex-1 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-black hover:bg-slate-50 transition-all"
        >
          罢休
        </button>
        <button
          onClick={onConfirm}
          disabled={!quickTaskDesc.trim()}
          className="flex-[2] py-4 rounded-2xl bg-linear-to-r from-emerald-500 to-teal-600 text-white font-black shadow-xl shadow-emerald-100 hover:shadow-emerald-200 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
        >
          确立因果
        </button>
      </div>
    </div>
  </div>
);

export default TaskQuickPublishScreen;
