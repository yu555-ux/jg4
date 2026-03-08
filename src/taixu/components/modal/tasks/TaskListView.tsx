import { ChevronRight, Flag, Plus, Send } from 'lucide-react';
import React from 'react';
import { getCategoryIcon } from './helpers';

interface TaskListViewProps {
  categories: readonly string[];
  activeCategory: string;
  sortedTasks: any[];
  quickTaskType: string;
  quickTaskDesc: string;
  isQuickPublishing: boolean;
  onCategoryChange: (category: string) => void;
  onSelectTask: (name: string) => void;
  onQuickPublishOpen: () => void;
  onQuickPublishClose: () => void;
  onQuickTaskTypeChange: (value: string) => void;
  onQuickTaskDescChange: (value: string) => void;
  onQuickPublishConfirm: () => void;
  onStartPublishing: () => void;
}

const TaskListView: React.FC<TaskListViewProps> = ({
  categories,
  activeCategory,
  sortedTasks,
  quickTaskType,
  quickTaskDesc,
  isQuickPublishing,
  onCategoryChange,
  onSelectTask,
  onQuickPublishOpen,
  onQuickPublishClose,
  onQuickTaskTypeChange,
  onQuickTaskDescChange,
  onQuickPublishConfirm,
  onStartPublishing,
}) => (
  <div className="flex h-full flex-col">
    {/* 移动端：顶部横向分类 */}
    <div className="md:hidden mb-4">
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(84px, 1fr))' }}
      >
        {categories.map(category => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`w-full px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-2 ${activeCategory === category
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-100 font-bold'
              : 'bg-white/70 text-slate-500 border border-emerald-100 hover:bg-emerald-50'
              }`}
          >
            {getCategoryIcon(category)}
            {category.replace('任务', '')}
          </button>
        ))}
      </div>
    </div>

    <div className="flex flex-1 min-h-0">
      {/* 桌面端侧边栏 */}
      <div className="hidden md:flex w-48 border-r border-emerald-100 pr-4 flex-col gap-4 overflow-y-auto custom-scrollbar">
        <div className="space-y-1">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all flex items-center gap-3 ${activeCategory === category
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-100 font-bold translate-x-1'
                : 'hover:bg-emerald-50 text-slate-500'
                }`}
            >
              {getCategoryIcon(category)}
              {category.replace('任务', '')}
            </button>
          ))}
        </div>
      </div>

      {/* 列表区域 */}
      <div className="flex-1 md:pl-6 overflow-y-auto custom-scrollbar relative">
      {/* 快速发布弹窗 Overlay */}
      {isQuickPublishing && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-xs rounded-3xl animate-in fade-in duration-200">
          <div className="bg-white border-2 border-emerald-400 shadow-2xl rounded-2xl p-6 max-w-[320px] w-full space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-emerald-600 mb-2">
              <Send className="w-6 h-6" />
              <h4 className="font-black text-lg">发布任务</h4>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">任务类型</label>
                <div className="flex gap-2">
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => onQuickTaskTypeChange(category)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${quickTaskType === category
                        ? 'bg-emerald-500 text-white border-emerald-400'
                        : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'
                        }`}
                    >
                      {category.replace('任务', '')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">任务描述</label>
                <textarea
                  value={quickTaskDesc}
                  onChange={event => onQuickTaskDescChange(event.target.value)}
                  placeholder="简单描述想要进行的任务目标..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden transition-all text-sm min-h-[100px] resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={onQuickPublishClose}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-400 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={onQuickPublishConfirm}
                className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all"
              >
                确立因果
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end mb-6 gap-3">
        <button
          onClick={onQuickPublishOpen}
          className="flex items-center gap-2 px-6 py-2.5 bg-linear-to-r from-emerald-500 to-teal-600 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-100 hover:shadow-emerald-200 hover:-translate-y-0.5 transition-all active:scale-95"
        >
          <Send className="w-4 h-4" />
          发布任务
        </button>
        <button
          onClick={onStartPublishing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-emerald-100 text-emerald-600 font-bold text-xs rounded-xl hover:bg-emerald-50 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          手动录入
        </button>
      </div>

      {sortedTasks.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-40">
          <Flag className="w-16 h-16" />
          <p className="font-serif italic tracking-widest">暂无此类任务...</p>
        </div>
      ) : (
        <div className="space-y-4 pb-4">
          {sortedTasks.map((task, i) => {
            const goals = Object.values(task.任务目标 || {});
            const completed = goals.filter((g: any) => g.状态 === '已完成').length;
            const total = goals.length;

            return (
              <button
                key={task.name}
                onClick={() => onSelectTask(task.name)}
                className={`w-full text-left p-5 rounded-2xl border transition-all flex items-center justify-between group hover:shadow-md animate-in slide-in-from-bottom-2 ${task.状态 === '已结算'
                  ? 'bg-slate-50/50 border-slate-100 opacity-60'
                  : 'bg-white border-emerald-100 hover:border-emerald-400'
                  }`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-serif font-bold text-lg ${task.状态 === '已结算' ? 'text-slate-500' : 'text-slate-800'}`}>
                      {task.name}
                    </h4>
                    {task.状态 === '已结算' && (
                      <span className="px-1.5 py-0.5 bg-slate-200 text-slate-500 text-[8px] font-black rounded uppercase">已结算</span>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                      <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${task.状态 === '已结算' ? 'bg-slate-300' : 'bg-emerald-400'}`}
                          style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
                        />
                      </div>
                      <span>{completed}/{total}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 transition-all ${task.状态 === '已结算'
                  ? 'text-slate-200'
                  : 'text-emerald-300 group-hover:text-emerald-500 group-hover:translate-x-1'
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}
      </div>
    </div>
  </div>
);

export default TaskListView;
