import { Pencil, Send, X } from 'lucide-react';
import React from 'react';

interface TaskEditorPanelProps {
  categories: readonly string[];
  editFormData: any;
  isCreating: boolean;
  onChange: (next: any) => void;
  onCancel: () => void;
  onSave: () => void;
}

const TaskEditorPanel: React.FC<TaskEditorPanelProps> = ({
  categories,
  editFormData,
  isCreating,
  onChange,
  onCancel,
  onSave,
}) => (
  <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
    <div className="h-16 border-b border-slate-100 flex items-center justify-between px-8 bg-slate-50/30 mb-8">
      <div className="flex items-center gap-3">
        {isCreating ? <Send className="w-5 h-5 text-emerald-500" /> : <Pencil className="w-5 h-5 text-emerald-500" />}
        <h3 className="text-xl font-bold text-slate-800">{isCreating ? '发布新任务' : '编辑任务信息'}</h3>
      </div>
      <button onClick={onCancel} className="p-2 hover:bg-rose-50 rounded-full transition-colors text-slate-400 hover:text-rose-500">
        <X className="w-6 h-6" />
      </button>
    </div>

    <div className="flex-1 overflow-y-auto p-2 space-y-6 custom-scrollbar pr-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">任务名称</label>
          <input
            type="text"
            value={editFormData.name}
            onChange={event => onChange({ ...editFormData, name: event.target.value })}
            disabled={!isCreating}
            placeholder="输入任务名称..."
            className={`w-full p-3 border border-slate-200 rounded-xl font-bold transition-all ${!isCreating ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden'}`}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">分类</label>
          <select
            value={editFormData.分类}
            onChange={event => onChange({ ...editFormData, 分类: event.target.value })}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden transition-all font-bold"
          >
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">状态</label>
        <select
          value={editFormData.状态}
          onChange={event => onChange({ ...editFormData, 状态: event.target.value })}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden transition-all font-bold"
        >
          <option value="进行中">进行中</option>
          <option value="已结算">已结算</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">任务目标 (格式: 目标内容|状态)</label>
        <textarea
          value={editFormData.任务目标文本}
          onChange={event => onChange({ ...editFormData, 任务目标文本: event.target.value })}
          rows={4}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden transition-all text-sm font-mono"
          placeholder="例如: 前往青云镇|未完成"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">任务奖励 (每行一个)</label>
          <textarea
            value={editFormData.任务奖励文本}
            onChange={event => onChange({ ...editFormData, 任务奖励文本: event.target.value })}
            rows={3}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden transition-all text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">任务惩罚 (每行一个)</label>
          <textarea
            value={editFormData.任务惩罚文本}
            onChange={event => onChange({ ...editFormData, 任务惩罚文本: event.target.value })}
            rows={3}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden transition-all text-sm"
          />
        </div>
      </div>

      <div className="pt-4 flex justify-end gap-3 pb-8">
        <button
          onClick={onCancel}
          className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
        >
          取消
        </button>
        <button
          onClick={onSave}
          disabled={!editFormData.name.trim()}
          className="px-8 py-2.5 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 text-white font-black text-sm shadow-lg shadow-emerald-100 hover:shadow-emerald-200 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0"
        >
          {isCreating ? '确认发布' : '确认修改'}
        </button>
      </div>
    </div>
  </div>
);

export default TaskEditorPanel;
