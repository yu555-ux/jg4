import React, { useEffect, useRef, useState } from 'react';
import { useTavernInteraction } from '../hooks/useTavernInteraction';
import BottomInputArea from './mainview/BottomInputArea';
import ConfirmEditModal from './mainview/ConfirmEditModal';
import ContextMenu from './mainview/ContextMenu';
import EditMessageModal from './mainview/EditMessageModal';
import MessageList from './mainview/MessageList';
import { RichTextSettings } from './mainview/types';

interface Props {
  mvuData: any;
  history: Array<{ role: 'model' | 'user', text: string }>;
  options?: Array<{ id: string; text: string }>;
  latestMessageId?: number;
  userMessageId?: number;
  fullMessage?: string;
  isFocusMode: boolean;
  focusSettings?: {
    hideInterval: number;
    keepCount: number;
  };
  multiApiEnabled: boolean;
  multiApiConfig: {
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
  onUpdateMvuData: (newData: any) => void;
  commandSet?: Array<{ name: string; prompt: string }>;
  richTextSettings?: RichTextSettings;
  onRemoveCommand?: (index: number) => void;
  onAddCommand?: (name: string, prompt: string) => void;
  onOpenStatusEffects?: () => void;
  onOpenCommands?: () => void;
  wheelBadgeCount?: number;
  onToggleFullscreen?: () => void;
  onOpenReading?: () => void;
  onOpenHistory?: () => void;
  onOpenInspect?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const MainView: React.FC<Props> = ({
  mvuData,
  history,
  options = [],
  latestMessageId,
  userMessageId,
  fullMessage,
  isFocusMode,
  focusSettings,
  multiApiEnabled,
  multiApiConfig,
  onUpdateMvuData,
  commandSet = [],
  richTextSettings,
  onRemoveCommand,
  onAddCommand,
  onOpenStatusEffects,
  onOpenCommands,
  wheelBadgeCount,
  onToggleFullscreen,
  onOpenReading,
  onOpenHistory,
  onOpenInspect,
  className,
  style
}) => {
  const endRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<any>(null);

  const [inputValue, setInputValue] = useState('');
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  // 上下文菜单状态
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showConfirmEdit, setShowConfirmEdit] = useState(false);
  // 编辑状态
  const [editingMessage, setEditingMessage] = useState<{
    messageId: number;
    currentText: string;
    fullMessage: string;
  } | null>(null);

  const { isGenerating, sendMessage, regenerateFromUserMessage, rerollVariablesFromMessage, stopGeneration } = useTavernInteraction(mvuData, isFocusMode, focusSettings, {
    multiApiEnabled,
    multiApiConfig,
    onUpdateMvuData
  });

  // 解析并还原用户消息内容（正文 + 指令集）
  const recoverMessageContent = (raw: string) => {
    let text = '';
    let instructions: string[] = [];

    const parts = raw.split('\n\n');
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1].trim();
      text = lastPart === '（确定因果）' ? '' : lastPart;

      const instructionPart = parts.slice(0, -1).join('\n\n');
      const lines = instructionPart.split('\n');
      instructions = lines
        .map(line => {
          const match = line.match(/^\d+、(.*)$/);
          return match ? match[1].trim() : line.trim();
        })
        .filter(line => line);
    } else {
      const singlePart = parts[0].trim();
      text = singlePart === '（确定因果）' ? '' : singlePart;
    }

    return { text, instructions };
  };

  // 开始长按（移动端）
  const handleLongPressStart = (event: React.TouchEvent, role: string) => {
    // 仅针对 AI 回复（model 角色）开启长按
    if (role !== 'model' || isGenerating || contextMenu) return;

    longPressTimerRef.current = setTimeout(() => {
      const clientX = event.touches[0].clientX;
      const clientY = event.touches[0].clientY;

      setContextMenu({ x: clientX, y: clientY });
      longPressTimerRef.current = null;
    }, 600);
  };

  // 结束长按
  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // 右键打开菜单（桌面端）
  const handleContextMenuOpen = (event: React.MouseEvent, role: string) => {
    if (role !== 'model' || isGenerating) return;
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY });
  };

  // 处理重roll
  const handleRegenerate = React.useCallback(async () => {
    if (latestMessageId === undefined || userMessageId === undefined) {
      toastr.error('无法重新生成：缺少楼层信息');
      setContextMenu(null);
      return;
    }

    // 预先获取用户原始输入与指令集（用于失败回退）
    let recoveredText = '';
    let recoveredInstructions: string[] = [];
    try {
      const userMessages = getChatMessages(userMessageId, { role: 'user' });
      if (userMessages && userMessages.length > 0) {
        const { text, instructions } = recoverMessageContent(userMessages[0].message);
        recoveredText = text;
        recoveredInstructions = instructions;
      }
    } catch (error) {
      console.warn('[MainView] 获取原始文本失败', error);
    }
    try {
      setContextMenu(null);

      // --- 干净的真正重roll：删 AI 消息后用原用户消息重新生成 ---
      await regenerateFromUserMessage(userMessageId, latestMessageId);
    } catch (error: any) {
      console.error('[MainView] 重roll失败:', error);

      try {
        // 删除错误的 assistant + user 楼层
        await deleteChatMessages([latestMessageId, userMessageId], { refresh: 'none' });
      } catch (deleteError) {
        console.warn('[MainView] 删除楼层失败', deleteError);
      }

      // 恢复输入框与指令集
      setInputValue(recoveredText);
      if (onAddCommand) {
        recoveredInstructions.forEach(instr => onAddCommand('回溯指令', instr));
      }

      toastr.error(`重roll失败: ${error.message}`);
      eventEmit('PSEUDO_SAME_LAYER_UPDATE');
    }
  }, [latestMessageId, userMessageId, regenerateFromUserMessage]);

  // 变量重roll（仅多 API 模式）
  const handleVariableRegenerate = () => {
    if (latestMessageId === undefined || !fullMessage) {
      toastr.error('无法变量重roll：内容未就绪');
      setContextMenu(null);
      return;
    }
    setContextMenu(null);
    void rerollVariablesFromMessage(latestMessageId, fullMessage);
  };

  // 暴露重roll方法给外部
  useEffect(() => {
    (window as any).taixujie_regenerate = handleRegenerate;
    return () => {
      // 不再主动删除，防止并发渲染时的竞态问题
      // (window as any).taixujie_regenerate = null;
    };
  }, [handleRegenerate]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let rafId: number | null = null;
    const update = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const raw = window.innerHeight - vv.height - vv.offsetTop;
        const next = Math.max(0, Math.round(raw));
        setKeyboardOffset(prev => (Math.abs(prev - next) <= 1 ? prev : next));
      });
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  // 打开编辑模态框
  const handleEditOpen = () => {
    setShowConfirmEdit(true);
  };

  const proceedToEdit = () => {
    if (latestMessageId === undefined || !fullMessage) {
      toastr.error('无法编辑：内容未就绪');
      setContextMenu(null);
      setShowConfirmEdit(false);
      return;
    }

    // 提取 <maintext>
    const maintextMatch = fullMessage.match(/<maintext>([\s\S]*?)<\/maintext>/i);
    const currentText = maintextMatch ? maintextMatch[1].trim() : fullMessage;

    setEditingMessage({
      messageId: latestMessageId,
      currentText,
      fullMessage
    });
    setContextMenu(null);
    setShowConfirmEdit(false);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingMessage) return;

    try {
      const { messageId, currentText, fullMessage: oldFull } = editingMessage;

      // 替换 <maintext> 内容，如果没有标签则直接替换全文
      let updatedMessage = '';
      if (oldFull.includes('<maintext>')) {
        updatedMessage = oldFull.replace(/<maintext>[\s\S]*?<\/maintext>/i, `<maintext>${currentText}</maintext>`);
      } else {
        updatedMessage = currentText;
      }

      await setChatMessages([{ message_id: messageId, message: updatedMessage }], { refresh: 'affected' });
      toastr.success('因果已修正');
      setEditingMessage(null);

      // 触发同步更新
      eventEmit('PSEUDO_SAME_LAYER_UPDATE');
    } catch (error: any) {
      toastr.error(`修正失败: ${error.message}`);
    }
  };

  // 点击外部关闭菜单
  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // 检查点击的是不是菜单本身或其子元素
      const isMenuClick = target.closest('.context-menu-panel');
      if (!isMenuClick) {
        setContextMenu(null);
      }
    };

    // 延迟 100ms 注册，防止长按释放瞬间的 click 事件触发关闭
    const timer = setTimeout(() => {
      window.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (isGenerating) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isGenerating]);

  const handleSend = async (text?: string) => {
    // 明确区分来源：如 text 是字符串类型（来自点击选项），则使用 text；
    // 如 text 不是字符串（来自点击发送按钮，此时 text 是 React 的事件对象），则使用 inputValue
    const message = typeof text === 'string' ? text : inputValue;
    const hasCommands = commandSet.length > 0;

    if (isGenerating || (!message.trim() && !hasCommands)) return;

    // Point C: 提取当前指令集的所有 prompt
    const instructions = commandSet.map(cmd => cmd.prompt);

    // 先清空输入，如失败了再填回去
    setInputValue('');

    try {
      // 传递指令集
      await sendMessage(message, { instructions });

      // 发送成功后，清空已发送的指令集
      if (instructions.length > 0 && onRemoveCommand) {
        for (let i = commandSet.length - 1; i >= 0; i--) {
          onRemoveCommand(i);
        }
      }
    } catch (error) {
      // 生成失败时，恢复输入内容
      setInputValue(message);
      console.warn('[MainView] 检测到生成失败，已还原输入内容');
    }
  };

  const adjustedKeyboardOffset = keyboardOffset > 0 ? keyboardOffset : 0;

  return (
    <main
      className={`flex-1 relative pt-20 h-full overflow-hidden flex flex-col bg-[#fdfdfd] ${className || ''}`}
      style={style}
    >
      <style>
        {`
          @keyframes taixujie-barrage {
            0% { transform: translateX(100%); opacity: 0; }
            10% { opacity: 1; }
            100% { transform: translateX(-120%); opacity: 0; }
          }
        `}
      </style>
      {/* Background patterns */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#10b981 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }}
      />


      <MessageList
        history={history}
        richTextSettings={richTextSettings}
        onLongPressStart={handleLongPressStart}
        onLongPressEnd={handleLongPressEnd}
        onContextMenuOpen={handleContextMenuOpen}
        endRef={endRef}
        bottomInset={adjustedKeyboardOffset}
      />
      <ContextMenu
        contextMenu={contextMenu}
        onEditOpen={handleEditOpen}
        onRegenerate={handleRegenerate}
        onVariableRegenerate={handleVariableRegenerate}
      />
      <ConfirmEditModal
        show={showConfirmEdit}
        onCancel={() => setShowConfirmEdit(false)}
        onConfirm={proceedToEdit}
      />
      <EditMessageModal
        editingMessage={editingMessage}
        onChange={value => setEditingMessage(prev => (prev ? { ...prev, currentText: value } : prev))}
        onCancel={() => setEditingMessage(null)}
        onSave={handleSaveEdit}
      />

      <div
        style={{
          transform: `translateY(-${adjustedKeyboardOffset}px)`,
          transition: 'transform 160ms ease',
          willChange: 'transform'
        }}
      >
        <BottomInputArea
          options={options}
          inputValue={inputValue}
          isGenerating={isGenerating}
          commandSet={commandSet}
          wheelBadgeCount={wheelBadgeCount}
          onInputChange={setInputValue}
          onSend={handleSend}
          onStopGenerating={stopGeneration}
          onOpenStatusEffects={onOpenStatusEffects}
          onOpenCommands={onOpenCommands}
          onToggleFullscreen={onToggleFullscreen}
          onOpenReading={onOpenReading}
          onOpenHistory={onOpenHistory}
          onOpenInspect={onOpenInspect}
        />
      </div>
    </main>
  );
};

export default MainView;
