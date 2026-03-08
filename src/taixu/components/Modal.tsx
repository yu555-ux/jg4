import { X } from 'lucide-react';
import React, { useState } from 'react';
import AchievementsModal from './modal/AchievementsModal';
import ApiModeModal from './modal/ApiModeModal';
import AuthorityModal from './modal/AuthorityModal';
import BondsModal from './modal/BondsModal';
import DetailModal from './modal/DetailModal';
import ChangesModal from './modal/ChangesModal';
import CommandSetModal from './modal/CommandSetModal';
import MemoryStorageModal from './modal/MemoryStorageModal';
import SettingsModal from './modal/SettingsModal';
import HistoryModal from './modal/HistoryModal';
import LuckModal from './modal/LuckModal';
import InspectModal from './modal/InspectModal';
import ThinkModal from './modal/ThinkModal';
import ReadingModal from './modal/ReadingModal';
import ShopModal from './modal/ShopModal';
import StatusEffectsModal from './modal/StatusEffectsModal';
import StorageModal from './modal/StorageModal';
import TasksModal from './modal/TasksModal';
import TianjiModal from './modal/TianjiModal';

interface Props {
  type: string;
  data?: any;
  onClose: () => void;
  onUseAuthority?: (auth: any) => void;
  onUpgradeAuthority?: (auth: any) => void;
  onUpdateShopItem?: (item: any) => void;
  onReplaceShopItems?: (items: any[]) => void;
  onPublishTask?: (instruction: string, updatedTasks?: any) => Promise<void>;
  onUpdateTasksList?: (tasks: any) => void;
  onPublishAchievement?: (instruction: string, updatedAchievements?: any) => Promise<void>;
  onUpdateAchievementsList?: (achievements: any) => void;
  onUpdateMvuData?: (newData: any) => void;
  onAddCommand?: (name: string, prompt: string) => void;
  onUpdateCommand?: (index: number, next: { name?: string; prompt?: string }) => void;
  onRemoveCommand?: (index: number) => void;
  onBranchCreate?: (id: number) => void;
  currentAP?: number;
  isStreaming?: boolean;
  onToggleStreaming?: (val: boolean) => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: (val: boolean) => void;
  focusSettings?: { hideInterval: number; keepCount: number };
  onUpdateFocusSettings?: (settings: any) => void;
  multiApiEnabled?: boolean;
  onToggleMultiApi?: (val: boolean) => void;
  multiApiConfig?: {
    apiurl: string;
    key: string;
    model: string;
    retries: number;
    promptTemplate?: string;
    worldbookRefs?: string[];
    presetRules?: Array<{
      id: string;
      name: string;
      content: string;
      enabled?: boolean;
      triggerMode?: string;
      keywords?: string[];
      depth?: number;
      role?: string;
      group?: string;
    }>;
  };
  onUpdateMultiApiConfig?: (config: any) => void;
  shopApiConfig?: { apiurl: string; key: string; model: string; retries: number };
  onUpdateShopApiConfig?: (config: any) => void;
  luckApiConfig?: { apiurl: string; key: string; model: string; retries: number };
  onUpdateLuckApiConfig?: (config: any) => void;
  richTextSettings?: any;
  onUpdateRichText?: (settings: any) => void;
  textFont?: string;
  onUpdateFont?: (font: string) => void;
  memorySettings?: any;
  onUpdateMemorySettings?: (settings: any) => void;
  memoryApiEnabled?: boolean;
  onToggleMemoryApi?: (val: boolean) => void;
  memoryApiConfig?: { apiurl: string; key: string; model: string; retries: number };
  onUpdateMemoryApiConfig?: (config: any) => void;
  tianjiSettings?: any;
  onUpdateTianjiSettings?: (settings: any) => void;
  tianjiApiEnabled?: boolean;
  onToggleTianjiApi?: (val: boolean) => void;
  tianjiApiConfig?: { apiurl: string; key: string; model: string; retries: number };
  onUpdateTianjiApiConfig?: (config: any) => void;
  variableChanges?: Record<string, any[]>;
  moduleOrder?: string[];
  onOpenChanges?: () => void;
  onOpenThink?: () => void;
  onOpenInspect?: () => void;
}

const Modal: React.FC<Props> = ({
  type,
  data,
  onClose,
  onUseAuthority,
  onUpgradeAuthority,
  onUpdateShopItem,
  onReplaceShopItems,
  onPublishTask,
  onUpdateTasksList,
  onPublishAchievement,
  onUpdateAchievementsList,
  onUpdateMvuData,
  onAddCommand,
  onUpdateCommand,
  onRemoveCommand,
  onBranchCreate,
  currentAP,
  isStreaming,
  onToggleStreaming,
  isFocusMode,
  onToggleFocusMode,
  focusSettings,
  onUpdateFocusSettings,
  multiApiEnabled,
  onToggleMultiApi,
  multiApiConfig,
  onUpdateMultiApiConfig,
  shopApiConfig,
  onUpdateShopApiConfig,
  luckApiConfig,
  onUpdateLuckApiConfig,
  richTextSettings,
  onUpdateRichText,
  textFont,
  onUpdateFont,
  memorySettings,
  onUpdateMemorySettings,
  memoryApiEnabled,
  onToggleMemoryApi,
  memoryApiConfig,
  onUpdateMemoryApiConfig,
  tianjiSettings,
  onUpdateTianjiSettings,
  tianjiApiEnabled,
  onToggleTianjiApi,
  tianjiApiConfig,
  onUpdateTianjiApiConfig,
  variableChanges,
  moduleOrder,
  onOpenChanges,
  onOpenThink,
  onOpenInspect
}) => {
  const [isEditingAll, setIsEditingAll] = useState(false);
  const isEvilDetail = type === 'detail' && data?.type === 'evil';

  const getTitle = () => {
    switch (type) {
      case 'storage': return '储物空间';
      case 'shop': return '仙缘商城';
      case 'luck': return '天运卜算';
      case 'tasks': return '任务清单';
      case 'achievements': return '成就奖励';
      case 'bonds': return '尘缘羁绊';
      case 'changes': return '天机变化';
      case 'inspect': return '观测面板';
      case 'think': return '思维链';
      case 'settings': return '阅读展示';
      case 'api_mode': return 'API模式';
      case 'memory_storage': return '记忆储存';
      case 'authority_detail': return '权柄详情';
      case 'detail': return '详细信息';
      case 'status_effects': return '当前状态';
      case 'reading': return '阅读模式';
      case 'history_list': return '历史溯源';
      case 'commands': return '指令集';
      case 'tianji_news': return '天下大事';
      case 'tianji_beauty': return '美人榜';
      default: return '系统界面';
    }
  };

  const renderContent = () => {
    switch (type) {
      case 'shop':
        return (
          <ShopModal
            data={data}
            onUpdateShopItem={onUpdateShopItem}
            onReplaceShopItems={onReplaceShopItems}
            isEditingAll={isEditingAll}
            setIsEditingAll={setIsEditingAll}
            onAddCommand={onAddCommand}
            shopApiConfig={shopApiConfig}
            multiApiEnabled={multiApiEnabled}
          />
        );
      case 'authority_detail':
        return (
          <AuthorityModal
            data={data}
            onUseAuthority={onUseAuthority}
            onUpgradeAuthority={onUpgradeAuthority}
            currentAP={currentAP}
            onAddCommand={onAddCommand}
            onUpdateMvuData={onUpdateMvuData}
          />
        );
      case 'detail':
        return <DetailModal data={data} />;
      case 'changes':
        return (
          <ChangesModal
            variableChanges={variableChanges || {}}
            moduleOrder={moduleOrder || []}
            onBack={onOpenInspect}
          />
        );
      case 'inspect':
        return (
          <InspectModal
            onOpenThink={onOpenThink || (() => {})}
            onOpenChanges={onOpenChanges || (() => {})}
          />
        );
      case 'think':
        return (
          <ThinkModal
            thinkContent={data?.thinkContent || ''}
            hasUnclosedThink={!!data?.hasUnclosedThink}
            onBack={onOpenInspect}
          />
        );
      case 'commands':
        return (
          <CommandSetModal
            commandSet={data?.commandSet || []}
            onUpdateCommand={onUpdateCommand}
            onRemoveCommand={onRemoveCommand}
          />
        );
      case 'settings':
        return (
          <SettingsModal
            isStreaming={!!isStreaming}
            onToggleStreaming={onToggleStreaming || (() => {})}
            isFocusMode={!!isFocusMode}
            onToggleFocusMode={onToggleFocusMode || (() => {})}
            focusSettings={focusSettings}
            onUpdateFocusSettings={onUpdateFocusSettings || (() => {})}
            richTextSettings={richTextSettings}
            onUpdateRichText={onUpdateRichText || (() => {})}
            textFont={textFont || "'Noto Serif SC', serif"}
            onUpdateFont={onUpdateFont || (() => {})}
          />
        );
      case 'api_mode':
        return (
          <ApiModeModal
            multiApiEnabled={!!multiApiEnabled}
            onToggleMultiApi={onToggleMultiApi || (() => {})}
            multiApiConfig={multiApiConfig || { apiurl: '', key: '', model: '', retries: 0 }}
            onUpdateMultiApiConfig={onUpdateMultiApiConfig || (() => {})}
            shopApiConfig={shopApiConfig || { apiurl: '', key: '', model: '', retries: 0 }}
            onUpdateShopApiConfig={onUpdateShopApiConfig || (() => {})}
            luckApiConfig={luckApiConfig || { apiurl: '', key: '', model: '', retries: 0 }}
            onUpdateLuckApiConfig={onUpdateLuckApiConfig || (() => {})}
          />
        );
      case 'memory_storage':
        return (
          <MemoryStorageModal
            memorySettings={memorySettings || {}}
            onUpdateMemorySettings={onUpdateMemorySettings || (() => {})}
            memoryApiEnabled={!!memoryApiEnabled}
            onToggleMemoryApi={onToggleMemoryApi || (() => {})}
            memoryApiConfig={memoryApiConfig || { apiurl: '', key: '', model: '', retries: 0 }}
            onUpdateMemoryApiConfig={onUpdateMemoryApiConfig || (() => {})}
          />
        );
      case 'storage':
        return <StorageModal data={data} />;
      case 'luck':
        return (
          <LuckModal
            data={data}
            onUpdateMvuData={onUpdateMvuData}
            luckApiConfig={luckApiConfig || { apiurl: '', key: '', model: '', retries: 0 }}
          />
        );
      case 'tasks':
        return (
          <TasksModal
            data={data}
            onPublishTask={onPublishTask}
            onUpdateTasksList={onUpdateTasksList}
            isEditingAll={isEditingAll}
            setIsEditingAll={setIsEditingAll}
          />
        );
      case 'achievements':
        return (
          <AchievementsModal
            data={data}
            onPublishAchievement={onPublishAchievement}
            onUpdateAchievementsList={onUpdateAchievementsList}
            isEditingAll={isEditingAll}
            setIsEditingAll={setIsEditingAll}
          />
        );
      case 'bonds':
        return <BondsModal data={data} />;
      case 'status_effects':
        return <StatusEffectsModal data={data} />;
      case 'reading':
        return <ReadingModal data={data} />;
      case 'history_list':
        return <HistoryModal data={data} onBranchCreate={onBranchCreate} />;
      case 'tianji_news':
        return (
          <TianjiModal
            variant="news"
            tianjiSettings={tianjiSettings}
            onUpdateTianjiSettings={onUpdateTianjiSettings}
            tianjiApiEnabled={!!tianjiApiEnabled}
            onToggleTianjiApi={onToggleTianjiApi}
            tianjiApiConfig={tianjiApiConfig}
            onUpdateTianjiApiConfig={onUpdateTianjiApiConfig}
          />
        );
      case 'tianji_beauty':
        return <TianjiModal variant="beauty" />;
      default:
        return <div className="flex items-center justify-center h-64 text-slate-300 italic">天道运转中，请静候此处显现…</div>;
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-8 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
      <div
        className={`bg-white w-full rounded-3xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 ${isEvilDetail
          ? 'shadow-[0_0_30px_rgba(220,38,38,0.45)] border-2 border-rose-500'
          : `shadow-[0_0_30px_rgba(16,185,129,0.4)] border-2 ${
              ['settings', 'api_mode', 'memory_storage'].includes(type) ? 'border-emerald-400/90' : 'border-emerald-400'
            }`
          }`}
        style={{
          maxWidth: 'var(--taixujie-modal-width, 42rem)',
          maxHeight: 'var(--taixujie-modal-height, 85vh)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {!isEditingAll && (
          <div className={`h-16 border-b flex items-center justify-between px-8 ${isEvilDetail
            ? 'border-rose-100 bg-rose-50/30'
            : 'border-emerald-100 bg-emerald-50/30'
            }`}>
            <div className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full animate-pulse ${isEvilDetail ? 'bg-rose-500' : 'bg-emerald-500'}`} />
              <h2 className="text-xl font-bold text-slate-800">{getTitle()}</h2>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-full transition-colors text-slate-400 hover:text-rose-500 ${isEvilDetail ? 'hover:bg-rose-100' : 'hover:bg-emerald-100'}`}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        )}

        <div className={`flex-1 overflow-y-auto ${isEditingAll ? 'p-0' : 'p-8'} custom-scrollbar`}>
          <div key={type} className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
