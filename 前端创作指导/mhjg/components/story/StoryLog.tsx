import React, { useEffect, useRef, useState } from 'react';
import './StoryScreen.scss';

// MHJG 的 LogEntry 类型（适配 MHJG 的故事格式）
export interface StoryLogEntry {
  id: string;
  sender: 'system' | 'player' | 'narrator';
  text: string;
  timestamp: number;
  messageId?: number; // 对应的消息楼层ID（仅assistant消息有）
  userMessageId?: number; // 对应的user消息ID（仅assistant消息有，用于重新生成）
}

interface StoryLogProps {
  history: StoryLogEntry[];
  streamingText?: string; // 流式显示的文本
  onRegenerate?: (userMessageId: number, assistantMessageId: number) => void; // 重新生成回调
  onEdit?: (messageId: number, currentText: string) => void; // 编辑回调
}

export const StoryLog: React.FC<StoryLogProps> = ({ history, streamingText = '', onRegenerate, onEdit }) => {
  const endRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entry: StoryLogEntry } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressEntryRef = useRef<StoryLogEntry | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, streamingText]);

  // 处理长按事件
  const handleLongPressStart = (entry: StoryLogEntry, event: React.MouseEvent | React.TouchEvent) => {
    // 只对narrator消息（assistant消息）启用长按
    if (entry.sender !== 'narrator' || !entry.messageId) {
      return;
    }

    // 如果已经有菜单打开，先关闭
    if (contextMenu) {
      setContextMenu(null);
      return;
    }

    longPressEntryRef.current = entry;
    
    // 设置长按定时器（500ms）
    longPressTimerRef.current = window.setTimeout(() => {
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
      
      setContextMenu({
        x: clientX,
        y: clientY,
        entry: entry
      });
      
      // 清除定时器引用
      longPressTimerRef.current = null;
    }, 500);
  };

  const handleLongPressEnd = () => {
    // 只清除定时器，不关闭菜单（如果菜单已经显示）
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    // 不清除 longPressEntryRef，因为菜单可能已经显示
  };

  // 处理重新生成
  const handleRegenerate = () => {
    console.log('🔄 [StoryLog] handleRegenerate 被调用', {
      entry: contextMenu?.entry,
      hasUserMessageId: !!contextMenu?.entry?.userMessageId,
      hasMessageId: !!contextMenu?.entry?.messageId,
      hasCallback: !!onRegenerate,
    });
    
    if (contextMenu?.entry && contextMenu.entry.userMessageId && contextMenu.entry.messageId) {
      if (onRegenerate) {
        console.log('🔄 [StoryLog] 调用 onRegenerate 回调', {
          userMessageId: contextMenu.entry.userMessageId,
          assistantMessageId: contextMenu.entry.messageId,
        });
        try {
          onRegenerate(contextMenu.entry.userMessageId, contextMenu.entry.messageId);
        } catch (error) {
          console.error('❌ [StoryLog] 调用 onRegenerate 失败:', error);
        }
      } else {
        console.warn('⚠️ [StoryLog] onRegenerate 回调未提供');
      }
      setContextMenu(null);
    } else {
      console.warn('⚠️ [StoryLog] 无法重新生成：缺少必要的数据', {
        hasEntry: !!contextMenu?.entry,
        hasUserMessageId: !!contextMenu?.entry?.userMessageId,
        hasMessageId: !!contextMenu?.entry?.messageId,
      });
    }
  };

  // 处理编辑
  const handleEdit = () => {
    console.log('✏️ [StoryLog] handleEdit 被调用', {
      entry: contextMenu?.entry,
      hasMessageId: !!contextMenu?.entry?.messageId,
      hasCallback: !!onEdit,
    });
    
    if (contextMenu?.entry && contextMenu.entry.messageId) {
      if (onEdit) {
        console.log('✏️ [StoryLog] 调用 onEdit 回调', {
          messageId: contextMenu.entry.messageId,
          textLength: contextMenu.entry.text?.length,
        });
        try {
          onEdit(contextMenu.entry.messageId, contextMenu.entry.text);
        } catch (error) {
          console.error('❌ [StoryLog] 调用 onEdit 失败:', error);
        }
      } else {
        console.warn('⚠️ [StoryLog] onEdit 回调未提供');
      }
      setContextMenu(null);
    } else {
      console.warn('⚠️ [StoryLog] 无法编辑：缺少必要的数据', {
        hasEntry: !!contextMenu?.entry,
        hasMessageId: !!contextMenu?.entry?.messageId,
      });
    }
  };

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenu) {
        // 检查点击是否在菜单内部
        const target = event.target as HTMLElement;
        const menuElement = target.closest('.story-context-menu');
        // 检查是否在触发长按的文本元素内
        const textElement = target.closest('p');
        if (!menuElement && !textElement) {
          console.log('🖱️ [StoryLog] 点击外部，关闭菜单');
          setContextMenu(null);
        }
      }
    };

    if (contextMenu) {
      // 延迟注册，确保菜单内的点击事件能先触发
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClickOutside, true);
      }, 300);
      
      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleClickOutside, true);
      };
    }
  }, [contextMenu]);

  // Parser function to handle rich text markers（使用 MHJG 的 parseRichText）
  const parseFormattedText = (text: string) => {
    // 导入 parseRichText 并转换为 React 元素
    const { parseRichText } = require('../../utils/textParser');
    const htmlContent = parseRichText(text);
    return <span dangerouslySetInnerHTML={{ __html: htmlContent }} />;
  };

  return (
    <>
      <div className="story-log">
        {history.map((entry) => (
          <div 
            key={entry.id} 
            className={`story-log-entry ${
              entry.sender === 'player' ? 'entry-player' : 
              entry.sender === 'system' ? 'entry-system' : 'entry-narrator'
            }`}
          >
            <div 
              className={`story-message-bubble ${
                entry.sender === 'player' ? 'bubble-player' : 
                entry.sender === 'system' ? 'bubble-system' : 'bubble-narrator'
              }`}
            >
              {entry.sender === 'system' && (
                <div className="system-header">
                  <span className="system-label">System Notification</span>
                  <span className="system-code">ERR_0X92</span>
                </div>
              )}
              
              <div 
                className="message-text"
                onMouseDown={(e) => {
                  if (contextMenu) {
                    return;
                  }
                  e.preventDefault();
                  e.stopPropagation();
                  if (entry.sender === 'narrator' && entry.messageId) {
                    handleLongPressStart(entry, e);
                  }
                }}
                onMouseUp={(e) => {
                  e.stopPropagation();
                  handleLongPressEnd();
                }}
                onTouchStart={(e) => {
                  if (contextMenu) {
                    return;
                  }
                  if (entry.sender === 'narrator' && entry.messageId) {
                    handleLongPressStart(entry, e);
                  }
                }}
                onTouchEnd={() => {
                  handleLongPressEnd();
                }}
                onTouchCancel={() => {
                  handleLongPressEnd();
                }}
              >
                {parseFormattedText(entry.text)}
              </div>

              {entry.sender === 'narrator' && (
                <div className="message-timestamp">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* 流式显示区域 */}
        {streamingText && (
          <div className="story-streaming-bubble">
            <div className="streaming-content">
              <div className="streaming-text">
                {parseFormattedText(streamingText)}
                <span className="streaming-cursor"></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={endRef} />
      </div>

      {/* 交互菜单 */}
      {contextMenu && (
        <div
          className="story-context-menu"
          style={{
            left: `${Math.min(contextMenu!.x, window.innerWidth - 220)}px`,
            top: `${Math.min(contextMenu!.y, window.innerHeight - 100)}px`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
          }}
        >
          {/* 标题栏和关闭按钮 */}
          <div className="story-context-menu-header">
            <span>操作</span>
            <button
              className="story-context-menu-close"
              onClick={(e) => {
                e.stopPropagation();
                console.log('❌ [StoryLog] 点击关闭按钮');
                setContextMenu(null);
              }}
              title="关闭"
              aria-label="关闭菜单"
            >
              ×
            </button>
          </div>
          
          <button
            className="story-context-menu-item"
            onClick={(e) => {
              e.stopPropagation();
              console.log('🔄 [StoryLog] 点击重新生成按钮');
              handleRegenerate();
            }}
          >
            🔄 重新生成本次情节
          </button>
          <button
            className="story-context-menu-item"
            onClick={(e) => {
              e.stopPropagation();
              console.log('✏️ [StoryLog] 点击编辑按钮');
              handleEdit();
            }}
          >
            ✏️ 编辑
          </button>
        </div>
      )}
    </>
  );
};

