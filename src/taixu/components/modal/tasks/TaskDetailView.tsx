import {
  AlertTriangle,
  ArrowLeft,
  Award,
  CheckCircle2,
  Circle,
  Clock,
  Pencil,
} from 'lucide-react';
import React from 'react';
import { getCategoryColor, getCategoryIcon } from './helpers';

interface TaskDetailViewProps {
  task: any;
  onBack: () => void;
  onEdit: () => void;
}

const TaskDetailView: React.FC<TaskDetailViewProps> = ({ task, onBack, onEdit }) => {
  const goals = Object.entries(task.任务目标 || {});
  const completedGoals = goals.filter(([_, g]: [any, any]) => g.状态 === '已完成').length;
  const totalGoals = goals.length;
  const progress = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold text-sm transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" /> 返回任务列表
      </button>

      <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
        {/* 任务头部 */}
        <div className="p-6 bg-linear-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            {getCategoryIcon(task.分类)}
          </div>

          <div className="flex justify-between items-start mb-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black border flex items-center gap-1 ${getCategoryColor(task.分类)}`}>
                  {getCategoryIcon(task.分类)}
                  {task.分类}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black border flex items-center gap-1 ${task.状态 === '进行中'
                  ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                  : 'text-slate-500 bg-slate-100 border-slate-200'
                  }`}
                >
                  {task.状态 === '进行中' ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                  {task.状态}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <h4 className="text-3xl font-serif font-bold text-slate-900">{task.name}</h4>
                <button
                  onClick={onEdit}
                  className="p-1.5 bg-white border border-emerald-100 rounded-lg text-emerald-500 hover:bg-emerald-50 hover:shadow-sm transition-all shadow-xs"
                  title="编辑任务信息"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 进度条 */}
          <div className="space-y-1.5 mt-4">
            <div className="flex justify-between text-[10px] font-black text-emerald-800/60 uppercase tracking-widest">
              <span>完成进度</span>
              <span>{completedGoals} / {totalGoals}</span>
            </div>
            <div className="h-1.5 bg-white/50 rounded-full overflow-hidden border border-emerald-100/50">
              <div
                className="h-full bg-linear-to-r from-emerald-400 to-teal-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* 任务目标 */}
          <div className="space-y-3">
            <h5 className="text-xs font-black text-emerald-800 uppercase tracking-widest pl-2 border-l-2 border-emerald-400">任务目标</h5>
            <div className="space-y-2">
              {goals.map(([desc, goal]: [string, any], i) => (
                <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${goal.状态 === '已完成'
                  ? 'bg-emerald-50/30 border-emerald-100 opacity-70'
                  : 'bg-white border-slate-100 shadow-xs'
                  }`}
                >
                  {goal.状态 === '已完成' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300 shrink-0" />
                  )}
                  <span className={`text-sm font-bold ${goal.状态 === '已完成' ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                    {desc}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* 任务奖励 */}
            <div className="space-y-3">
              <h5 className="text-xs font-black text-emerald-800 uppercase tracking-widest pl-2 border-l-2 border-amber-400">任务奖励</h5>
              <div className="space-y-2">
                {task.任务奖励?.map((reward: string, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-amber-50/30 border border-amber-100 rounded-xl">
                    <Award className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-xs font-bold text-amber-900">{reward}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 任务惩罚 */}
            {task.任务惩罚 && task.任务惩罚.length > 0 && (
              <div className="space-y-3">
                <h5 className="text-xs font-black text-emerald-800 uppercase tracking-widest pl-2 border-l-2 border-rose-400">任务惩罚</h5>
                <div className="space-y-2">
                  {task.任务惩罚.map((punish: string, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-rose-50/30 border border-rose-100 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span className="text-xs font-bold text-rose-900">{punish}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailView;
