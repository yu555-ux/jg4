import { Award, Pencil, Plus, Send, Sparkles, Star, X } from 'lucide-react';
import React, { useState } from 'react';

interface AchievementsModalProps {
  data: any;
  onPublishAchievement?: (instruction: string, updatedAchievements?: any) => Promise<void>;
  onUpdateAchievementsList?: (achievements: any) => void;
  isEditingAll: boolean;
  setIsEditingAll: (val: boolean) => void;
}

const AchievementsModal: React.FC<AchievementsModalProps> = ({ data, onPublishAchievement, onUpdateAchievementsList, isEditingAll, setIsEditingAll }) => {
  const [editFormData, setEditFormData] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isQuickPublishing, setIsQuickPublishing] = useState(false);
  const [quickDesc, setQuickDesc] = useState('');

  const buildAchievementInstruction = (payload: { mode: 'quick' | 'manual'; description?: string; achievement?: any }) => {
    const { mode, description, achievement } = payload;
    const baseRules = [
      '发布成就。请按以下结构组织信息：',
      '成就名称、成就描述、成就固定加成（可选）、获得天赋（可选）。',
      '固定加成请用分条表述，可为空；获得天赋为单条字符串。',
    ];

    if (mode === 'quick') {
      return [
        ...baseRules,
        '你需要补完缺失信息：名称/固定加成（可选）/获得天赋（可选）。',
        `成就描述：${description}。`,
      ].join('\n');
    }

    const bonusText = (achievement?.固定加成 || []).join('、');
    return [
      ...baseRules,
      `成就名称：${achievement?.name || ''}。`,
      `成就描述：${achievement?.描述 || ''}。`,
      bonusText ? `成就固定加成：${bonusText}。` : '成就固定加成：无。',
      achievement?.获得天赋 ? `获得天赋：${achievement.获得天赋}。` : '获得天赋：无。',
    ].join('\n');
  };

  const handleQuickPublish = async () => {
    if (!quickDesc.trim()) {
      toastr.warning('请输入成就描述');
      return;
    }

    const prompt = buildAchievementInstruction({
      mode: 'quick',
      description: quickDesc.trim(),
    });

    const snapshot = quickDesc;
    setIsQuickPublishing(false);
    toastr.success('成就发布成功');

    try {
      if (onPublishAchievement) {
        await onPublishAchievement(prompt);
        setQuickDesc('');
      } else {
        toastr.error('成就发送接口未配置');
        setIsQuickPublishing(true);
        toastr.clear();
      }
    } catch (error) {
      toastr.error('成就发布失败');
      setQuickDesc(snapshot);
      setIsQuickPublishing(true);
    }
  };

  const startCreating = () => {
    setEditFormData({
      name: '',
      描述: '',
      固定加成文本: '',
      获得天赋: ''
    });
    setIsCreating(true);
    setIsEditingAll(true);
  };

  const startEditing = (achievement: any) => {
    setEditFormData({
      ...achievement,
      固定加成文本: (achievement.固定加成 || []).join('\n')
    });
    setIsCreating(false);
    setIsEditingAll(true);
  };

  const saveAchievement = async () => {
    const updatedAchievement = {
      描述: editFormData.描述,
      固定加成: editFormData.固定加成文本.split('\n').map((s: string) => s.trim()).filter(Boolean),
      获得天赋: editFormData.获得天赋?.trim() || undefined
    };

    const achievementName = editFormData.name;
    const isNew = isCreating;
    const newAchievements = { ...data, [achievementName]: updatedAchievement };

    const snapshot = editFormData;

    setIsEditingAll(false);
    setIsCreating(false);
    setEditFormData(null);
    toastr.success(isNew ? '成就发布成功' : '成就修改成功');

    try {
      if (isNew) {
        const instruction = buildAchievementInstruction({
          mode: 'manual',
          achievement: { ...updatedAchievement, name: achievementName }
        });
        if (onPublishAchievement) {
          await onPublishAchievement(instruction, newAchievements);
        } else {
          throw new Error('ACHIEVEMENT_PUBLISH_NOT_CONFIGURED');
        }
      } else {
        if (!onUpdateAchievementsList) {
          throw new Error('ACHIEVEMENT_UPDATE_NOT_CONFIGURED');
        }
        onUpdateAchievementsList(newAchievements);
      }
    } catch (error) {
      toastr.error(isNew ? '成就发布失败' : '成就修改失败');
      setIsEditingAll(true);
      setIsCreating(isNew);
      setEditFormData(snapshot);
    }
  };

  const achievements = Object.entries(data || {}).map(([name, detail]: [string, any]) => ({
    name,
    ...detail
  }));

  if (isQuickPublishing) {
    return (
      <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
        <div className="h-16 border-b border-slate-100 flex items-center justify-between px-8 bg-slate-50/30 mb-8">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="text-xl font-bold text-slate-800">快速发布成就</h3>
          </div>
          <button onClick={() => setIsQuickPublishing(false)} className="p-2 hover:bg-rose-50 rounded-full transition-colors text-slate-400 hover:text-rose-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full space-y-8 pb-12">
          <div className="w-full space-y-3">
            <label className="text-sm font-black text-slate-500 uppercase tracking-widest ml-1">成就描述</label>
            <textarea
              value={quickDesc}
              onChange={e => setQuickDesc(e.target.value)}
              placeholder="简单描述成就达成的条件或故事..."
              className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:border-amber-400 focus:bg-white focus:outline-hidden transition-all text-lg font-serif min-h-[200px] shadow-inner text-slate-700"
            />
          </div>

          <div className="flex w-full gap-4 pt-4">
            <button
              onClick={() => setIsQuickPublishing(false)}
              className="flex-1 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-black hover:bg-slate-50 transition-all"
            >
              取消
            </button>
            <button
              onClick={handleQuickPublish}
              disabled={!quickDesc.trim()}
              className="flex-[2] py-4 rounded-2xl bg-linear-to-r from-amber-500 to-orange-600 text-white font-black shadow-xl shadow-amber-100 hover:shadow-amber-200 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
            >
              确认发布
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isEditingAll && editFormData) {
    return (
      <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
        <div className="h-16 border-b border-slate-100 flex items-center justify-between px-8 bg-slate-50/30 mb-8">
          <div className="flex items-center gap-3">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="text-xl font-bold text-slate-800">{isCreating ? '给予成就' : '编辑成就'}</h3>
          </div>
          <button onClick={() => setIsEditingAll(false)} className="p-2 hover:bg-rose-50 rounded-full transition-colors text-slate-400 hover:text-rose-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-6 custom-scrollbar pr-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">成就名称</label>
            <input
              type="text"
              value={editFormData.name}
              onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
              placeholder="例如：万剑归宗"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-hidden transition-all font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">获得描述 (达成原因)</label>
            <textarea
              value={editFormData.描述}
              onChange={e => setEditFormData({ ...editFormData, 描述: e.target.value })}
              rows={3}
              placeholder="描述该成就是如何获得的..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-hidden transition-all text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">固定加成 (每行一个)</label>
            <textarea
              value={editFormData.固定加成文本}
              onChange={e => setEditFormData({ ...editFormData, 固定加成文本: e.target.value })}
              rows={4}
              placeholder="例如：杀伐 +10"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-hidden transition-all text-sm font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">获得天赋 (可选)</label>
            <input
              type="text"
              value={editFormData.获得天赋 || ''}
              onChange={e => setEditFormData({ ...editFormData, 获得天赋: e.target.value })}
              placeholder="例如：剑心通明"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-hidden transition-all font-bold"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 pb-8">
            <button
              onClick={() => setIsEditingAll(false)}
              className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
            >
              取消
            </button>
            <button
              onClick={saveAchievement}
              disabled={!editFormData.name.trim()}
              className="px-8 py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-600 text-white font-black text-sm shadow-lg shadow-amber-100 hover:shadow-amber-200 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0"
            >
              {isCreating ? '确定给予' : '确认修改'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-end mb-6 gap-3">
        <button
          onClick={() => setIsQuickPublishing(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-linear-to-r from-amber-400 to-orange-500 text-white font-black text-sm rounded-xl shadow-lg shadow-amber-100 hover:shadow-amber-200 hover:-translate-y-0.5 transition-all active:scale-95"
        >
          <Send className="w-4 h-4" />
          给予成就
        </button>
        <button
          onClick={startCreating}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-amber-100 text-amber-600 font-bold text-xs rounded-xl hover:bg-amber-50 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          手动发布
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 overflow-y-auto pr-2 custom-scrollbar pb-4">
        {achievements.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-300 gap-4 opacity-40">
            <Award className="w-16 h-16" />
            <p className="font-serif italic tracking-widest">尚未达成任何成就...</p>
          </div>
        ) : (
          achievements.map((achievement, i) => (
            <div
              key={achievement.name}
              className="group relative p-6 bg-white border border-emerald-100 rounded-2xl shadow-sm hover:border-amber-300 hover:shadow-md transition-all animate-in zoom-in-95"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {/* 背景装饰 */}
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Award className="w-16 h-16 text-amber-500" />
              </div>

              <div className="flex items-start gap-5">
                {/* 图标容器 */}
                <div className="shrink-0 w-14 h-14 rounded-2xl bg-linear-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-100 group-hover:scale-110 transition-transform">
                  <Star className="w-7 h-7 text-white fill-white/20" />
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xl font-serif font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                      {achievement.name}
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEditing(achievement)}
                        className="p-1.5 bg-white border border-amber-100 rounded-lg text-amber-500 hover:bg-amber-50 hover:shadow-sm transition-all opacity-0 group-hover:opacity-100"
                        title="编辑成就"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <span className="flex items-center gap-1 text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                        <Sparkles className="w-3 h-3" />
                        已达成
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 leading-relaxed italic">
                    {achievement.描述}
                  </p>

                  {achievement.固定加成 && achievement.固定加成.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {achievement.固定加成.map((bonus: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-100 flex items-center gap-1.5"
                        >
                          <div className="w-1 h-1 bg-emerald-400 rounded-full" />
                          {bonus}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AchievementsModal;
