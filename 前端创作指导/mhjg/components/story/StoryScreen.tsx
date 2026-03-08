import React, { useState, useEffect } from 'react';
import { StoryLog, StoryLogEntry } from './StoryLog';
import { StoryOptions } from './StoryOptions';
import { parseMaintext, parseOptions } from '../../utils/storyInteraction';
import { handleUnifiedRequest, RequestData } from '../../utils/unifiedRequestHandler';
import { registerStoryScreenCallbacks } from '../../utils/storyCallbacks';
import './StoryScreen.scss';

// 全局函数声明（由酒馆助手提供）
declare function getChatMessages(
  range: string | number,
  options?: { role?: 'all' | 'system' | 'assistant' | 'user' },
): Array<{ message: string; message_id: number; role: string; data?: Record<string, any> }>;
declare function deleteChatMessages(message_ids: number[], options?: { refresh?: 'none' | 'all' }): Promise<void>;
declare function setChatMessages(
  chat_messages: Array<{ message_id: number; message?: string }>,
  options?: { refresh?: 'none' | 'affected' | 'all' },
): Promise<void>;
declare function getLastMessageId(): number;
declare function eventOn(event: string, callback: (...args: any[]) => void): void;
declare const tavern_events: {
  MESSAGE_RECEIVED: string;
  MESSAGE_UPDATED: string;
};
declare function triggerSlash(command: string): Promise<string>;

interface StoryScreenState {
  history: StoryLogEntry[];
  options: string[];
  isLoading: boolean;
}

const INITIAL_STATE: StoryScreenState = {
  history: [],
  options: [],
  isLoading: false,
};

export const StoryScreen: React.FC = () => {
  const [state, setState] = useState<StoryScreenState>(INITIAL_STATE);
  const [streamingText, setStreamingText] = useState<string>('');
  const [editingMessage, setEditingMessage] = useState<{ messageId: number; currentText: string; fullMessage: string } | null>(null);

  // 从最新楼层读取 maintext 和 options
  // 限制只显示最近8层楼的信息
  const loadFromChatMessages = () => {
    try {
      const lastMessageId = getLastMessageId();
      if (lastMessageId < 0) {
        return;
      }

      // 获取最近8层楼的消息
      const maxLayers = 8;
      const allMessages: Array<{ message_id: number; role: string; message: string }> = [];
      
      for (let i = 0; i < maxLayers && lastMessageId - i >= 0; i++) {
        try {
          const messages = getChatMessages(lastMessageId - i);
          if (messages && messages.length > 0) {
            const msg = messages[0];
            allMessages.push({
              message_id: msg.message_id,
              role: msg.role,
              message: msg.message || ''
            });
          }
        } catch (err) {
          continue;
        }
      }

      // 按message_id排序（从旧到新）
      allMessages.sort((a, b) => a.message_id - b.message_id);

      // 构建历史记录
      const newHistory: StoryLogEntry[] = [];
      const seenMessageIds = new Set<string>();
      let lastUserMessageId: number | undefined = undefined;
      
      for (const msg of allMessages) {
        if (msg.role === 'user') {
          const entryId = `user-${msg.message_id}`;
          if (!seenMessageIds.has(entryId)) {
            seenMessageIds.add(entryId);
            lastUserMessageId = msg.message_id;
            newHistory.push({
              id: entryId,
              sender: 'player',
              text: msg.message,
              timestamp: Date.now()
            });
          }
        } else if (msg.role === 'assistant') {
          const maintext = parseMaintext(msg.message);
          if (maintext) {
            const entryId = `maintext-${msg.message_id}`;
            if (!seenMessageIds.has(entryId)) {
              seenMessageIds.add(entryId);
              const correspondingUserMessage = allMessages
                .filter(m => m.role === 'user' && m.message_id < msg.message_id)
                .sort((a, b) => b.message_id - a.message_id)[0];
              
              newHistory.push({
                id: entryId,
                sender: 'narrator',
                text: maintext,
                timestamp: Date.now(),
                messageId: msg.message_id,
                userMessageId: correspondingUserMessage?.message_id
              });
            }
          }
        }
      }

      // 更新历史记录
      setState(prev => ({
        ...prev,
        history: newHistory
      }));

      // 处理最新assistant消息的options
      const lastAssistantMessage = allMessages.filter(m => m.role === 'assistant').pop();
      if (lastAssistantMessage) {
        const messageContent = lastAssistantMessage.message || '';
        const options = parseOptions(messageContent);
        setState(prev => ({
          ...prev,
          options: options
        }));
      }
    } catch (error) {
      console.error('❌ 加载聊天消息失败:', error);
    }
  };

  // 从最新楼层读取消息
  useEffect(() => {
    loadFromChatMessages();

    const handleMessageReceived = async () => {
      setTimeout(() => {
        loadFromChatMessages();
      }, 100);
    };

    if (typeof eventOn !== 'undefined' && typeof tavern_events !== 'undefined') {
      eventOn(tavern_events.MESSAGE_RECEIVED, handleMessageReceived);
      eventOn(tavern_events.MESSAGE_UPDATED, handleMessageReceived);
    }

    // 注册回调函数，供其他模块调用
    registerStoryScreenCallbacks({
      setLoading: (loading: boolean) => {
        setState(prev => ({ ...prev, isLoading: loading }));
      },
      refreshStory: loadFromChatMessages,
      setStreamingText: setStreamingText,
    });

    return () => {
      // 清理事件监听器（如果需要）
    };
  }, []);

  const handleAction = async (actionText: string, type: 'option' | 'custom') => {
    setState(prev => ({ ...prev, isLoading: true }));

    const requestType: RequestData['type'] = type === 'option' ? 'option' : 'custom';
    
    const success = await handleUnifiedRequest(
      {
        type: requestType,
        content: actionText,
      },
      {
        onDisableOptions: () => {
          setState(prev => ({ ...prev, isLoading: true }));
        },
        onShowGenerating: () => {
          setState(prev => ({ ...prev, isLoading: true }));
        },
        onHideGenerating: () => {
          setState(prev => ({ ...prev, isLoading: false }));
        },
        onEnableOptions: () => {
          setState(prev => ({ ...prev, isLoading: false }));
        },
        onError: (error: string) => {
          console.error('❌ 处理请求失败:', error);
          setState(prev => ({ ...prev, isLoading: false }));
        },
        onRefreshStory: () => {
          setTimeout(() => {
            loadFromChatMessages();
          }, 100);
        },
        onStreamingUpdate: (text: string) => {
          setStreamingText(text);
        },
      }
    );

    if (!success) {
      setState(prev => ({ ...prev, isLoading: false }));
    } else {
      // 清空流式文本
      setStreamingText('');
    }
  };

  const handleOptionClick = async (optionText: string) => {
    await handleAction(optionText, 'option');
  };

  const handleCustomInput = async (text: string) => {
    await handleAction(text, 'custom');
  };

  // 处理重新生成
  const handleRegenerate = async (userMessageId: number, assistantMessageId: number) => {
    try {
      console.log('🔄 [StoryScreen] 开始重新生成，user消息ID:', userMessageId, 'assistant消息ID:', assistantMessageId);
      
      const userMessages = getChatMessages(userMessageId);
      if (!userMessages || userMessages.length === 0) {
        alert('无法找到要重新生成的消息');
        return;
      }
      const userMessageText = userMessages[0].message || '';

      await deleteChatMessages([assistantMessageId], { refresh: 'none' });
      console.log('🗑️ [StoryScreen] 已删除assistant消息');

      await handleAction(userMessageText, 'custom');
    } catch (error) {
      console.error('❌ [StoryScreen] 重新生成失败:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      alert(`重新生成失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // 处理编辑
  const handleEdit = async (messageId: number, currentText: string) => {
    try {
      console.log('✏️ [StoryScreen] 开始编辑消息，消息ID:', messageId);
      
      const messages = getChatMessages(messageId);
      if (!messages || messages.length === 0) {
        alert('无法找到要编辑的消息');
        return;
      }
      const fullMessage = messages[0].message || '';

      const maintextMatch = fullMessage.match(/<maintext>([\s\S]*?)<\/maintext>/i);
      if (!maintextMatch) {
        alert('无法提取要编辑的文本内容');
        return;
      }

      setEditingMessage({ messageId, currentText, fullMessage });
    } catch (error) {
      console.error('❌ [StoryScreen] 编辑消息失败:', error);
      alert(`编辑消息失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingMessage) return;

    try {
      const { messageId, currentText, fullMessage } = editingMessage;

      const updatedMessage = fullMessage.replace(
        /<maintext>[\s\S]*?<\/maintext>/i,
        `<maintext>${currentText}</maintext>`
      );

      await setChatMessages([{ message_id: messageId, message: updatedMessage }], { refresh: 'affected' });
      console.log('✅ 消息已更新');

      setEditingMessage(null);
      setTimeout(() => {
        loadFromChatMessages();
      }, 100);
    } catch (error) {
      console.error('❌ 保存编辑失败:', error);
    }
  };

  return (
    <div className="story-screen">
      {/* Loading Overlay */}
      {state.isLoading && (
        <div className="story-loading-overlay">
          <div className="loading-content">
            <div className="loading-dot"></div>
            <span>剧情正在生成...</span>
          </div>
        </div>
      )}

      {/* 正文区域 - 可滚动 */}
      <StoryLog 
        history={state.history} 
        streamingText={streamingText}
        onRegenerate={handleRegenerate}
        onEdit={handleEdit}
      />
      
      {/* 选项控制栏 - 固定在底部 */}
      <StoryOptions 
        options={state.options}
        onOptionClick={handleOptionClick}
        onCustomInput={handleCustomInput}
        isLoading={state.isLoading}
      />

      {/* Edit Modal */}
      {editingMessage && (
        <div className="story-edit-overlay" onClick={() => setEditingMessage(null)}>
          <div className="story-edit-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="story-edit-header">
              <h3>编辑文本</h3>
              <button 
                className="story-edit-close"
                onClick={() => setEditingMessage(null)}
                aria-label="关闭"
              >
                ×
              </button>
            </div>
            <div className="story-edit-body">
              <textarea
                className="story-edit-textarea"
                value={editingMessage.currentText}
                onChange={(e) => setEditingMessage({ ...editingMessage, currentText: e.target.value })}
              />
            </div>
            <div className="story-edit-footer">
              <button
                className="save-button"
                onClick={handleSaveEdit}
              >
                保存
              </button>
              <button
                className="cancel-button"
                onClick={() => setEditingMessage(null)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

