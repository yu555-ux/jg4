import React, { useEffect, useState } from 'react';
import toastr from 'toastr';
import { TASK_CATEGORIES } from './tasks/constants';
import TaskDetailView from './tasks/TaskDetailView';
import TaskEditorPanel from './tasks/TaskEditorPanel';
import TaskListView from './tasks/TaskListView';
import TaskQuickPublishScreen from './tasks/TaskQuickPublishScreen';

interface TasksModalProps {
  data: any;
  onPublishTask?: (instruction: string, updatedTasks?: any) => Promise<void>;
  onUpdateTasksList?: (tasks: any) => void;
  isEditingAll: boolean;
  setIsEditingAll: (val: boolean) => void;
}

const TasksModal: React.FC<TasksModalProps> = ({ data, onPublishTask, onUpdateTasksList, isEditingAll, setIsEditingAll }) => {
  const [activeCategory, setActiveCategory] = useState('主线任务');
  const [selectedTaskName, setSelectedTaskName] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);

  // 快速发布状态
  const [isQuickPublishing, setIsQuickPublishing] = useState(false);
  const [quickTaskType, setQuickTaskType] = useState('主线任务');
  const [quickTaskDesc, setQuickTaskDesc] = useState('');

  const buildTaskInstruction = (payload: {
    mode: 'quick' | 'manual';
    categoryHint?: string;
    description?: string;
    task?: any;
  }) => {
    const { mode, categoryHint, description, task } = payload;
    const baseRules = [
      '发送任务。请按以下结构组织信息：',
      '任务名称、任务分类、任务目标、任务奖励、任务惩罚（可选）、当前状态。',
      '任务目标与奖励请用分条表述，惩罚可缺省。',
    ];

    if (mode === 'quick') {
      return [
        ...baseRules,
        '你需要补完缺失信息：名称/分类/目标/奖励/惩罚（可选）。',
        `任务类型倾向：${categoryHint}。`,
        `任务描述：${description}。`,
        '当前状态默认：进行中。',
      ].join('\n');
    }

    const goalsText = Object.keys(task?.任务目标 || {}).join('、');
    const rewardsText = (task?.任务奖励 || []).join('、');
    const punishText = (task?.任务惩罚 || []).join('、');
    const statusText = task?.状态 || '进行中';

    return [
      ...baseRules,
      `任务名称：${task?.name || ''}。`,
      `任务分类：${task?.分类 || ''}。`,
      `任务目标：${goalsText || '无'}。`,
      `任务奖励：${rewardsText || '无'}。`,
      punishText ? `任务惩罚：${punishText}。` : '任务惩罚：无。',
      `当前状态：${statusText}。`,
    ].join('\n');
  };

  const handleQuickPublish = async () => {
    if (!quickTaskDesc.trim()) {
      toastr.warning('请输入任务描述');
      return;
    }
    const prompt = buildTaskInstruction({
      mode: 'quick',
      categoryHint: quickTaskType,
      description: quickTaskDesc.trim(),
    });

    const snapshot = {
      quickTaskType,
      quickTaskDesc,
    };

    setIsQuickPublishing(false);
    toastr.success('任务发布成功');

    try {
      if (onPublishTask) {
        await onPublishTask(prompt);
        setQuickTaskDesc('');
      } else {
        toastr.error('任务发送接口未配置');
        setIsQuickPublishing(true);
        toastr.clear();
      }
    } catch (error) {
      toastr.error('任务发布失败');
      setQuickTaskType(snapshot.quickTaskType);
      setQuickTaskDesc(snapshot.quickTaskDesc);
      setIsQuickPublishing(true);
    }
  };

  const startPublishing = () => {
    setEditFormData({
      name: '',
      分类: activeCategory,
      状态: '进行中',
      任务目标文本: '',
      任务奖励文本: '',
      任务惩罚文本: ''
    });
    setIsCreating(true);
    setIsEditingAll(true);
  };

  const startEditingTask = (task: any) => {
    setEditFormData({
      ...task,
      任务目标文本: Object.entries(task.任务目标 || {})
        .map(([desc, goal]: [string, any]) => `${desc}|${goal.状态}`)
        .join('\n'),
      任务奖励文本: (task.任务奖励 || []).join('\n'),
      任务惩罚文本: (task.任务惩罚 || []).join('\n')
    });
    setIsCreating(false);
    setIsEditingAll(true);
  };

  const saveEditingTask = async () => {
    const goals: Record<string, any> = {};
    editFormData.任务目标文本.split('\n').forEach((line: string) => {
      const [desc, status] = line.split('|');
      if (desc?.trim()) {
        goals[desc.trim()] = { 状态: (status?.trim() === '已完成' ? '已完成' : '未完成') };
      }
    });

    const updatedTask = {
      ...editFormData,
      任务目标: goals,
      任务奖励: editFormData.任务奖励文本.split('\n').map((s: string) => s.trim()).filter(Boolean),
      任务惩罚: editFormData.任务惩罚文本.split('\n').map((s: string) => s.trim()).filter(Boolean)
    };

    const taskName = editFormData.name;
    const isNew = isCreating;

    delete updatedTask.name;
    delete updatedTask.任务目标文本;
    delete updatedTask.任务奖励文本;
    delete updatedTask.任务惩罚文本;

    const newTasks = { ...tasksSource, [taskName]: updatedTask };

    const snapshot = {
      editFormData,
      isCreating,
      selectedTaskName,
    };

    setIsEditingAll(false);
    setIsCreating(false);
    setEditFormData(null);
    toastr.success(isNew ? '任务发布成功' : '任务修改成功');

    try {
      if (isNew) {
        const instruction = buildTaskInstruction({
          mode: 'manual',
          task: { ...updatedTask, name: taskName }
        });
        if (onPublishTask) {
          await onPublishTask(instruction, newTasks);
          setSelectedTaskName(null);
        } else {
          throw new Error('TASK_PUBLISH_NOT_CONFIGURED');
        }
      } else {
        if (!onUpdateTasksList) {
          throw new Error('TASK_UPDATE_NOT_CONFIGURED');
        }
        onUpdateTasksList(newTasks);
        setSelectedTaskName(taskName);
      }
    } catch (error) {
      toastr.error(isNew ? '任务发布失败' : '任务修改失败');
      setIsEditingAll(true);
      setIsCreating(snapshot.isCreating);
      setEditFormData(snapshot.editFormData);
      setSelectedTaskName(snapshot.selectedTaskName);
    }
  };

  // 兼容逻辑：如果 data 中包含 '任务清单'，则使用 data.任务清单，否则使用 data 本身
  const tasksSource = data?.任务清单 || data || {};
  const allTasks = Object.entries(tasksSource).map(([name, task]: [string, any]) => ({
    name,
    ...task
  }));

  const filteredTasks = allTasks.filter(task => {
    // 首先按分类过滤
    if (task.分类 !== activeCategory) return false;

    // 检查是否所有目标都已完成
    const goals = Object.values(task.任务目标 || {});
    const allGoalsCompleted = goals.length > 0 && goals.every((g: any) => g.状态 === '已完成');

    // 逻辑：如果所有任务目标已完成，并且任务已结算，则不再显示
    if (allGoalsCompleted && task.状态 === '已结算') {
      return false;
    }

    return true;
  });

  // 排序：进行中的在前，已结算的在后
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.状态 === '进行中' && b.状态 === '已结算') return -1;
    if (a.状态 === '已结算' && b.状态 === '进行中') return 1;
    return 0;
  });

  const selectedTask = selectedTaskName ? allTasks.find(t => t.name === selectedTaskName) : null;
  const hasSettledTasks = allTasks.some(task => task.状态 === '已结算');

  useEffect(() => {
    if (!hasSettledTasks) return;
    const remaining = Object.fromEntries(
      Object.entries(tasksSource).filter(([_, task]: [string, any]) => task.状态 !== '已结算')
    );
    onUpdateTasksList?.(remaining);
    if (selectedTaskName && tasksSource[selectedTaskName]?.状态 === '已结算') {
      setSelectedTaskName(null);
    }
  }, [hasSettledTasks, onUpdateTasksList, selectedTaskName, tasksSource]);

  if (isQuickPublishing) {
    return (
      <TaskQuickPublishScreen
        categories={TASK_CATEGORIES}
        quickTaskType={quickTaskType}
        quickTaskDesc={quickTaskDesc}
        onTypeChange={setQuickTaskType}
        onDescChange={setQuickTaskDesc}
        onCancel={() => { setIsQuickPublishing(false); setQuickTaskDesc(''); }}
        onConfirm={handleQuickPublish}
      />
    );
  }

  if (isEditingAll && editFormData) {
    return (
      <TaskEditorPanel
        categories={TASK_CATEGORIES}
        editFormData={editFormData}
        isCreating={isCreating}
        onChange={setEditFormData}
        onCancel={() => { setIsEditingAll(false); setIsCreating(false); }}
        onSave={saveEditingTask}
      />
    );
  }

  if (selectedTask) {
    return (
      <TaskDetailView
        task={selectedTask}
        onBack={() => setSelectedTaskName(null)}
        onEdit={() => startEditingTask(selectedTask)}
      />
    );
  }

  return (
    <TaskListView
      categories={TASK_CATEGORIES}
      activeCategory={activeCategory}
      sortedTasks={sortedTasks}
      quickTaskType={quickTaskType}
      quickTaskDesc={quickTaskDesc}
      isQuickPublishing={isQuickPublishing}
      onCategoryChange={setActiveCategory}
      onSelectTask={setSelectedTaskName}
      onQuickPublishOpen={() => setIsQuickPublishing(true)}
      onQuickPublishClose={() => setIsQuickPublishing(false)}
      onQuickTaskTypeChange={setQuickTaskType}
      onQuickTaskDescChange={setQuickTaskDesc}
      onQuickPublishConfirm={handleQuickPublish}
      onStartPublishing={startPublishing}
    />
  );
};

export default TasksModal;
