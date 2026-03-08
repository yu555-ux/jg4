import { parseMaintext, parseOptions } from '../../utils/storyInteraction';
import { parseRichText } from '../../utils/textParser';
import './StoryModal.scss';

// 全局函数声明（这些函数由 TavernHelper 提供）
declare function getChatMessages(
  range: string | number,
  options?: { role?: 'all' | 'system' | 'assistant' | 'user' },
): Array<{ message: string; message_id: number; role: string }>;

declare function createChatMessages(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; message: string; data?: Record<string, any> }>,
  options?: { refresh?: 'none' | 'affected' | 'all' },
): Promise<void>;

// MVU 变量框架声明
declare const Mvu: {
  getMvuData: (options: { type: 'message' | 'chat' | 'character' | 'global'; message_id?: number | 'latest' }) => {
    stat_data: Record<string, any>;
    display_data: Record<string, any>;
    delta_data: Record<string, any>;
  };
  parseMessage: (message: string, old_data: any) => Promise<any | undefined>;
};

declare function deleteChatMessages(message_ids: number[], options?: { refresh?: 'none' | 'all' }): Promise<void>;

declare function getLastMessageId(): number;

declare function generate(config: { user_input?: string; should_stream?: boolean }): Promise<string>;

// 编辑保存需要：更新已存在楼层的 message 内容
declare function setChatMessages(
  chat_messages: Array<{ message_id: number; message?: string; data?: Record<string, any> }>,
  options?: { refresh?: 'none' | 'affected' | 'all' },
): Promise<void>;

declare function eventOn(event: string, callback: (data: any) => void): void;

declare function triggerSlash(command: string): Promise<string>;

declare const tavern_events: {
  MESSAGE_RECEIVED: string;
  MESSAGE_UPDATED: string;
};

export interface StoryModalCallbacks {
  onClose: () => void;
}

export class StoryModal {
  private element: HTMLElement | null = null;
  private callbacks: StoryModalCallbacks;
  public isOpen: boolean = false;
  private currentMaintext: string = '';
  private currentOptions: string[] = [];
  // 流式文本：用于在生成过程中实时展示 maintext 片段（类似 horr 的 streamingText）
  private streamingText: string = '';
  // 当前展示的 assistant 楼层 ID（用于长按操作：重新生成 / 编辑）
  private currentMessageId: number | null = null;
  // 当前 assistant 楼层对应的 user 楼层 ID（用于重新生成）
  private currentUserMessageId: number | null = null;
  // 长按计时器与位置（用于在正文区域长按弹出操作菜单）
  private longPressTimer: number | null = null;
  private longPressPosition: { x: number; y: number } | null = null;
  private messageListenerId: string | null = null;
  private isGenerating: boolean = false;
  private isMessageListenerSetup: boolean = false; // 防止重复注册消息监听器
  private optionsExpanded: boolean = false; // 小屏下选项是否展开

  constructor(callbacks: StoryModalCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * 从聊天消息中加载最新内容
   * 总是从最新楼层读取，优先读取 assistant 消息，如果没有则读取最新消息
   */
  private loadFromChatMessages(): void {
    try {
      // 先尝试获取最新的 assistant 消息
      let messages = getChatMessages(-1, { role: 'assistant' });
      let lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

      // 如果没有 assistant 消息，获取最新消息（不限制 role）
      if (!lastMessage) {
        messages = getChatMessages(-1);
        lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      }

      if (!lastMessage) {
        this.currentMaintext = '等待故事开始...';
        this.currentOptions = [];
        this.currentMessageId = null;
        this.currentUserMessageId = null;
        return;
      }

      const messageContent = lastMessage.message || '';

      // 记录当前 assistant 楼层 ID
      this.currentMessageId = lastMessage.message_id;

      // 查找对应的 user 楼层（当前 assistant 之前的最近一条 user 楼层）
      try {
        const allMessages = getChatMessages(`0-${lastMessage.message_id}`);
        const userMessages = allMessages.filter(m => m.role === 'user');
        const lastUser = userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
        this.currentUserMessageId = lastUser ? lastUser.message_id : null;
      } catch (err) {
        console.warn('⚠️ 从消息历史中查找 user 楼层失败:', err);
        this.currentUserMessageId = null;
      }

      // 解析 maintext 和 options（这是“最终文本”，与流式展示的 streamingText 相互独立）
      // 注意：messageContent 可能已经包含格式化后的HTML（如果使用了formatAsTavernRegexedString）
      // 我们需要提取原始文本内容
      this.currentMaintext = parseMaintext(messageContent);
      this.currentOptions = parseOptions(messageContent);
      
      console.log('📖 解析结果:', {
        maintextLength: this.currentMaintext.length,
        optionsCount: this.currentOptions.length,
        maintextPreview: this.currentMaintext.substring(0, 100),
      });

      // 如果没有解析到 maintext，使用原始消息
      if (!this.currentMaintext && messageContent) {
        this.currentMaintext = messageContent;
      }

      console.log('📖 从最新楼层加载内容:', {
        message_id: lastMessage.message_id,
        role: lastMessage.role,
        maintext: this.currentMaintext.substring(0, 50) + '...',
        options: this.currentOptions,
      });
    } catch (error) {
      console.error('❌ 加载聊天消息失败:', error);
      this.currentMaintext = '加载故事内容时出错...';
      this.currentOptions = [];
    }
  }

  /**
   * 创建模态框HTML结构
   */
  public createElement(): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'mhjg-modal mhjg-modal-story';
    modal.innerHTML = this.getModalHTML();
    this.element = modal;
    this.bindEvents();
    return modal;
  }

  /**
   * 获取模态框HTML
   */
  private getModalHTML(): string {
    if (!this.isOpen) return '';

    // 注意：正文可能已经是格式化后的HTML（如果使用了 formatAsTavernRegexedString）
    // 优先显示流式文本 streamingText；如果没有流式文本，则显示最终的 currentMaintext
    const baseText = this.streamingText || this.currentMaintext;
    let parsedMaintext: string;
    if (baseText.includes('<') && baseText.includes('>')) {
      // 看起来已经是HTML格式，直接使用
      parsedMaintext = baseText;
    } else {
      // 纯文本，使用 parseRichText 处理
      parsedMaintext = parseRichText(baseText);
    }

    // 生成选项按钮HTML
    const optionsHTML = this.createOptionsHTML();

    return `
      <div class="modal-backdrop"></div>
      <div class="modal-window">
        <div class="modal-header">
          <div class="modal-header-left">
            <div class="modal-icon">
              ${this.getBookIcon()}
            </div>
            <div class="modal-title-group">
              <h2 class="modal-title">命运魔典</h2>
              <p class="modal-subtitle">编织你的故事</p>
            </div>
          </div>
          <div class="modal-header-actions">
            <button class="modal-action-btn" id="review-story-btn" aria-label="回顾故事" title="回顾故事">
              ${this.getReviewIcon()}
              <span>回顾故事</span>
            </button>
            <button class="modal-action-btn" id="load-save-btn" aria-label="读档" title="读档">
              ${this.getLoadIcon()}
              <span>读档</span>
            </button>
            <button class="modal-close" aria-label="关闭">
              关闭魔典
            </button>
          </div>
        </div>
        <div class="modal-content" id="story-content">
          <div class="story-maintext">
            ${parsedMaintext}
          </div>
          ${this.isGenerating ? this.createGeneratingOverlay() : ''}
        </div>
        <div class="modal-options ${this.optionsExpanded ? 'expanded' : 'collapsed'}" id="story-options">
          <button class="options-toggle-btn" id="options-toggle-btn" aria-label="${this.optionsExpanded ? '收起选项' : '展开选项'}">
            <span class="toggle-text">${this.optionsExpanded ? '收起选项' : '展开选项'}</span>
            <svg class="toggle-icon ${this.optionsExpanded ? 'expanded' : ''}" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <div class="story-options-wrapper">
            ${optionsHTML}
          </div>
        </div>
        <div class="modal-input">
          <div class="input-wrapper">
            <input 
              type="text" 
              id="story-input"
              placeholder="描述你的行动..."
              class="story-input"
            />
            <button 
              id="story-send"
              class="story-send-btn"
            >
              ${this.getSendIcon()}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 创建选项按钮HTML
   */
  private createOptionsHTML(): string {
    if (this.currentOptions.length === 0) {
      return '';
    }

    const buttons = this.currentOptions
      .map((option, index) => {
        const optionText = option.trim();
        // 检查是否是HTML格式，如果是则直接使用，否则用parseRichText处理
        let parsedOption: string;
        if (optionText.includes('<') && optionText.includes('>')) {
          // 看起来已经是HTML格式，直接使用
          parsedOption = optionText;
        } else {
          // 纯文本，使用parseRichText处理
          parsedOption = parseRichText(optionText);
        }
        
        return `
        <button 
          class="story-option-btn" 
          data-option="${optionText.replace(/"/g, '&quot;')}"
          data-option-index="${index}"
        >
          ${parsedOption}
        </button>
      `;
      })
      .join('');

    return `
      <div class="story-options-container">
        ${buttons}
      </div>
    `;
  }

  /**
   * 获取图标
   */
  private getBookIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>';
  }

  private getCloseIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  }

  private getSendIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>';
  }

  private getReviewIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>';
  }

  private getLoadIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (!this.element) return;

    // 先移除所有旧的事件监听器，防止重复绑定
    $(this.element).off('click', '.modal-backdrop, .modal-close');
    $(this.element).off('click', '.story-option-btn');
    $(this.element).off('click', '#story-send');
    $(this.element).off('click', '#review-story-btn');
    $(this.element).off('click', '#load-save-btn');
    $(this.element).off('click', '#options-toggle-btn');
    $(this.element).off('keydown', '#story-input');

    $(this.element).on('click', '.modal-backdrop, .modal-close', () => {
      this.close();
    });

    // 回顾故事按钮
    $(this.element).on('click', '#review-story-btn', (e) => {
      e.stopPropagation();
      this.showReviewStory();
    });

    // 读档按钮
    $(this.element).on('click', '#load-save-btn', (e) => {
      e.stopPropagation();
      this.showLoadSave();
    });

    // 选项展开/收起按钮（小屏）
    $(this.element).on('click', '#options-toggle-btn', (e) => {
      e.stopPropagation();
      this.toggleOptions();
    });

    // 长按正文区域：弹出“重新生成 / 编辑”操作菜单（仅对当前 assistant 楼层生效）
    const startLongPress = (event: JQuery.TriggeredEvent) => {
      // 如果没有可操作的楼层，或正在生成中，则忽略
      if (this.isGenerating || this.currentMessageId === null) {
        return;
      }

      // 避免重复计时
      if (this.longPressTimer !== null) {
        return;
      }

      let clientX = 0;
      let clientY = 0;
      const originalEvent = event.originalEvent as MouseEvent | TouchEvent;
      if ('touches' in originalEvent && originalEvent.touches.length > 0) {
        clientX = originalEvent.touches[0].clientX;
        clientY = originalEvent.touches[0].clientY;
      } else if ('clientX' in originalEvent) {
        clientX = (originalEvent as MouseEvent).clientX;
        clientY = (originalEvent as MouseEvent).clientY;
      }

      this.longPressPosition = { x: clientX, y: clientY };

      this.longPressTimer = window.setTimeout(() => {
        this.longPressTimer = null;
        if (this.longPressPosition) {
          this.showContextMenu(this.longPressPosition.x, this.longPressPosition.y);
        }
      }, 500); // 500ms 长按
    };

    const clearLongPress = () => {
      if (this.longPressTimer !== null) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
      this.longPressPosition = null;
    };

    // 鼠标长按
    $(this.element).on('mousedown', '.story-maintext', (e) => {
      // 只处理左键
      const me = e as unknown as MouseEvent;
      if (me.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      startLongPress(e);
    });
    $(this.element).on('mouseup mouseleave', '.story-maintext', () => {
      clearLongPress();
    });

    // 触摸长按
    $(this.element).on('touchstart', '.story-maintext', (e) => {
      e.stopPropagation();
      startLongPress(e);
    });
    $(this.element).on('touchend touchcancel', '.story-maintext', () => {
      clearLongPress();
    });

    // 选项按钮点击事件
    $(this.element).on('click', '.story-option-btn', async e => {
      e.stopPropagation(); // 防止事件冒泡
      const button = e.currentTarget as HTMLButtonElement;
      
      // 防止重复点击
      if (this.isGenerating || button.disabled) {
        return;
      }
      
      const optionText = button.getAttribute('data-option');
      if (optionText) {
        await this.handleOptionClick(optionText);
      }
    });

    // 发送按钮点击事件
    $(this.element).on('click', '#story-send', e => {
      e.stopPropagation(); // 防止事件冒泡
      this.handleSend();
    });

    // 输入框回车事件
    $(this.element).on('keydown', '#story-input', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });
  }

  /**
   * 处理选项点击
   */
  private async handleOptionClick(optionText: string): Promise<void> {
    // 防止重复点击
    if (this.isGenerating) {
      console.warn('⚠️ 正在生成中，忽略重复点击');
      return;
    }

    const { handleUnifiedRequest } = await import('../../utils/unifiedRequestHandler');
    const { handleTabChange } = await import('../../utils/tabManager');
    const { GameTab } = await import('../../types');

    // 立即设置生成状态，防止重复点击
    this.isGenerating = true;
    this.disableOptions();

    try {
      // 确保已经切换到Story页面
      handleTabChange(GameTab.STORY);
      this.show();

      await handleUnifiedRequest(
        {
          type: 'option',
          content: optionText,
        },
        {
          onSwitchToStory: () => {
            // 已经在Story页面，不需要再次切换
          },
          onRefreshStoryIfOpen: () => {
            // 如果魔典已打开，刷新显示
            if (this.isOpen) {
              this.refresh();
            }
          },
          onDisableOptions: () => {
            this.disableOptions();
          },
          onShowGenerating: () => {
            this.showGenerating();
          },
          onHideGenerating: () => {
            this.hideGenerating();
            // 生成结束时清空流式文本，恢复为最终文本显示
            this.streamingText = '';
            this.isGenerating = false; // 生成完成后重置状态
          },
          onEnableOptions: () => {
            this.enableOptions();
          },
          onError: (error: string) => {
            console.error('❌ 选项处理失败:', error);
            this.isGenerating = false; // 出错时重置状态
            this.enableOptions();
          },
          onRefreshStory: () => {
            this.refresh();
          },
          onStreamingUpdate: (text: string) => {
            // 更新流式文本并重新渲染（只在魔典打开时进行）
            this.streamingText = text;
            if (this.element && this.isOpen) {
              this.render();
              this.scrollToBottom();
            }
          },
        },
      );
    } catch (error) {
      console.error('❌ 选项处理异常:', error);
      this.isGenerating = false; // 异常时重置状态
      this.enableOptions();
    }
  }


  /**
   * 处理发送消息（自由输入）
   */
  private async handleSend(): Promise<void> {
    // 防止重复点击
    if (this.isGenerating) {
      console.warn('⚠️ 正在生成中，忽略重复发送');
      return;
    }

    const input = $(this.element!).find('#story-input') as JQuery<HTMLInputElement>;
    const text = input.val()?.toString().trim();

    if (!text) return;

    // 立即设置生成状态，防止重复点击
    this.isGenerating = true;
    this.disableOptions();

    // 清空输入框
    input.val('');

    const { handleUnifiedRequest } = await import('../../utils/unifiedRequestHandler');
    const { handleTabChange } = await import('../../utils/tabManager');
    const { GameTab } = await import('../../types');

    try {
      // 确保已经切换到Story页面
      handleTabChange(GameTab.STORY);
      this.show();

      await handleUnifiedRequest(
        {
          type: 'custom',
          content: text,
        },
        {
          onSwitchToStory: () => {
            // 已经在Story页面，不需要再次切换
          },
          onRefreshStoryIfOpen: () => {
            // 如果魔典已打开，刷新显示
            if (this.isOpen) {
              this.refresh();
            }
          },
          onDisableOptions: () => {
            this.disableOptions();
          },
          onShowGenerating: () => {
            this.showGenerating();
          },
          onHideGenerating: () => {
            this.hideGenerating();
            // 生成结束时清空流式文本，恢复为最终文本显示
            this.streamingText = '';
            this.isGenerating = false; // 生成完成后重置状态
          },
          onEnableOptions: () => {
            this.enableOptions();
          },
          onError: (error: string) => {
            console.error('❌ 发送消息失败:', error);
        // 回退输入框内容
            input.val(text);
            this.isGenerating = false; // 出错时重置状态
            this.enableOptions();
          },
          onRefreshStory: () => {
            this.refresh();
          },
          onStreamingUpdate: (streamText: string) => {
            // 更新流式文本并重新渲染（只在魔典打开时进行）
            this.streamingText = streamText;
            if (this.element && this.isOpen) {
              this.render();
              this.scrollToBottom();
            }
          },
        },
      );
    } catch (error) {
      console.error('❌ 发送消息异常:', error);
      // 回退输入框内容
      input.val(text);
      this.isGenerating = false; // 异常时重置状态
      this.enableOptions();
    }
  }

  /**
   * 滚动到底部
   */
  private scrollToBottom(): void {
    const content = $(this.element!).find('.modal-content');
    if (content.length) {
      content[0].scrollTop = content[0].scrollHeight;
    }
  }

  /**
   * 显示长按操作菜单（重新生成 / 编辑）
   */
  private showContextMenu(clientX: number, clientY: number): void {
    if (!this.element) return;
    if (this.currentMessageId === null) {
      console.warn('⚠️ 当前没有可操作的剧情楼层，忽略长按菜单');
      return;
    }

    // 先移除旧菜单
    $(this.element).find('.story-context-menu').remove();

    const menu = $(`
      <div class="story-context-menu">
        <div class="story-context-menu-header">
          <span>操作</span>
          <button class="story-context-menu-close" aria-label="关闭">×</button>
        </div>
        <button class="story-context-menu-item" data-action="regenerate">
          🔄 重新生成本次情节
        </button>
        <button class="story-context-menu-item" data-action="edit">
          ✏️ 编辑文本
        </button>
      </div>
    `);

    menu.css({
      position: 'fixed',
      left: `${Math.min(clientX, window.innerWidth - 220)}px`,
      top: `${Math.min(clientY, window.innerHeight - 120)}px`,
      zIndex: 200,
    });

    $(this.element).append(menu);

    // 关闭按钮
    menu.on('click', '.story-context-menu-close', (e) => {
      e.stopPropagation();
      this.hideContextMenu();
    });

    // 重新生成
    menu.on('click', '[data-action="regenerate"]', async (e) => {
      e.stopPropagation();
      await this.handleRegenerateCurrent();
      this.hideContextMenu();
    });

    // 编辑
    menu.on('click', '[data-action="edit"]', async (e) => {
      e.stopPropagation();
      await this.handleEditCurrent();
      this.hideContextMenu();
    });

    // 点击菜单外部关闭
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.story-context-menu')) {
        this.hideContextMenu();
        document.removeEventListener('click', closeOnOutsideClick, true);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', closeOnOutsideClick, true);
    }, 100);
  }

  /**
   * 隐藏长按操作菜单
   */
  private hideContextMenu(): void {
    if (!this.element) return;
    $(this.element).find('.story-context-menu').remove();
  }

  /**
   * 重新生成当前剧情楼层（参考 horr：删除当前 assistant 楼层，然后复用统一请求处理器）
   */
  private async handleRegenerateCurrent(): Promise<void> {
    if (this.currentMessageId === null) {
      alert('无法重新生成：当前没有可操作的剧情楼层');
      return;
    }

    try {
      console.log('🔄 [StoryModal] 开始重新生成，assistant 消息 ID:', this.currentMessageId, 'user 消息 ID:', this.currentUserMessageId);

      // 获取当前 assistant 消息，以便确认存在
      const assistantMessages = getChatMessages(this.currentMessageId, { role: 'assistant' });
      const assistantMessage = assistantMessages && assistantMessages.length > 0 ? assistantMessages[0] : null;
      if (!assistantMessage) {
        alert('无法找到要重新生成的剧情楼层');
        return;
      }

      // 查找对应的 user 楼层文本：优先使用 currentUserMessageId，其次扫描历史
      let userText = '';
      if (this.currentUserMessageId !== null) {
        const userMessages = getChatMessages(this.currentUserMessageId, { role: 'user' });
        const userMsg = userMessages && userMessages.length > 0 ? userMessages[0] : null;
        if (userMsg && userMsg.message) {
          userText = userMsg.message;
        }
      }

      // 如果还没有拿到 user 文本，则回退到从 0 到当前楼层扫描
      if (!userText) {
        try {
          const allMessages = getChatMessages(`0-${this.currentMessageId}`);
          const userMessages = allMessages.filter(m => m.role === 'user');
          const lastUser = userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
          if (lastUser && lastUser.message) {
            userText = lastUser.message;
          }
        } catch (err) {
          console.warn('⚠️ [StoryModal] 回退扫描 user 楼层失败:', err);
        }
      }

      if (!userText) {
        alert('无法找到用于重新生成的玩家输入内容');
        return;
      }

      // 删除当前 assistant 楼层（不立即刷新，由后续流程统一刷新）
      await deleteChatMessages([this.currentMessageId], { refresh: 'none' });
      console.log('🗑️ [StoryModal] 已删除原有 assistant 楼层:', this.currentMessageId);

      // 使用统一请求处理器重新生成剧情（复用 handleSend 的回调配置）
      const { handleUnifiedRequest } = await import('../../utils/unifiedRequestHandler');
      const { handleTabChange } = await import('../../utils/tabManager');
      const { GameTab } = await import('../../types');

      // 确保处于 STORY 页签并显示魔典
      handleTabChange(GameTab.STORY);
      this.show();

      this.isGenerating = true;
      this.disableOptions();

      await handleUnifiedRequest(
        {
          type: 'custom',
          content: userText,
        },
        {
          onSwitchToStory: () => {
            // 已经在 STORY，不额外切换
          },
          onRefreshStoryIfOpen: () => {
            if (this.isOpen) {
              this.refresh();
            }
          },
          onDisableOptions: () => {
            this.disableOptions();
          },
          onShowGenerating: () => {
            this.showGenerating();
          },
          onHideGenerating: () => {
            this.hideGenerating();
            // 生成结束时清空流式文本，恢复为最终文本显示
            this.streamingText = '';
            this.isGenerating = false;
          },
          onEnableOptions: () => {
            this.enableOptions();
          },
          onError: (error: string) => {
            console.error('❌ [StoryModal] 重新生成失败:', error);
            this.isGenerating = false;
            this.enableOptions();
            alert(`重新生成失败: ${error}`);
          },
          onRefreshStory: () => {
            this.refresh();
          },
          onStreamingUpdate: (streamText: string) => {
            // 更新流式文本并重新渲染（只在魔典打开时进行）
            this.streamingText = streamText;
            if (this.element && this.isOpen) {
              this.render();
              this.scrollToBottom();
            }
          },
        },
      );

      console.log('✅ [StoryModal] 重新生成完成');
    } catch (error) {
      console.error('❌ [StoryModal] 重新生成异常:', error);
      this.isGenerating = false;
      this.enableOptions();
      alert(`重新生成失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 编辑当前剧情楼层的 <maintext> 文本（参考 horr 的编辑实现）
   */
  private async handleEditCurrent(): Promise<void> {
    if (this.currentMessageId === null) {
      alert('无法编辑：当前没有可操作的剧情楼层');
      return;
    }

    try {
      console.log('✏️ [StoryModal] 开始编辑消息，消息 ID:', this.currentMessageId);

      const messages = getChatMessages(this.currentMessageId, { role: 'assistant' });
      if (!messages || messages.length === 0) {
        console.error('❌ [StoryModal] 无法找到要编辑的消息，消息 ID:', this.currentMessageId);
        alert('无法找到要编辑的消息');
        return;
      }

      const fullMessage = messages[0].message || '';
      const maintextMatch = fullMessage.match(/<maintext>([\s\S]*?)<\/maintext>/i);
      if (!maintextMatch) {
        console.error('❌ [StoryModal] 无法提取 maintext，消息内容前 200 字:', fullMessage.substring(0, 200));
        alert('无法提取要编辑的文本内容');
        return;
      }

      const originalMaintext = maintextMatch[1].trim();

      // 创建编辑对话框（覆盖层）
      const overlay = $(`
        <div class="story-edit-overlay">
          <div class="story-edit-dialog">
            <div class="story-edit-header">
              <h3>编辑文本</h3>
              <button class="story-edit-close" aria-label="关闭">×</button>
            </div>
            <div class="story-edit-body">
              <textarea class="story-edit-textarea"></textarea>
            </div>
            <div class="story-edit-footer">
              <button class="story-edit-save">保存</button>
              <button class="story-edit-cancel">取消</button>
            </div>
          </div>
        </div>
      `);

      // 初始内容
      overlay.find('.story-edit-textarea').val(originalMaintext);

      // 挂载到 body，避免被模态框裁剪
      $('body').append(overlay);

      const closeOverlay = () => {
        overlay.remove();
      };

      // 关闭按钮 / 取消
      overlay.on('click', '.story-edit-close, .story-edit-cancel', (e) => {
        e.stopPropagation();
        closeOverlay();
      });

      // 点击遮罩关闭
      overlay.on('click', (e) => {
        if (e.target === overlay[0]) {
          closeOverlay();
        }
      });

      // 阻止点击对话框本身冒泡关闭
      overlay.on('click', '.story-edit-dialog', (e) => {
        e.stopPropagation();
      });

      // 保存
      overlay.on('click', '.story-edit-save', async (e) => {
        e.stopPropagation();
        const newText = overlay.find('.story-edit-textarea').val()?.toString() ?? '';

        try {
          // 用新的 maintext 替换原有内容
          const updatedMessage = fullMessage.replace(
            /<maintext>[\s\S]*?<\/maintext>/i,
            `<maintext>${newText}</maintext>`,
          );

          await setChatMessages(
            [
              {
                message_id: this.currentMessageId as number,
                message: updatedMessage,
              },
            ],
            { refresh: 'affected' },
          );

          console.log('✅ [StoryModal] 消息已更新');
          closeOverlay();

          // 刷新魔典内容
          this.refresh();
        } catch (err) {
          console.error('❌ [StoryModal] 保存编辑失败:', err);
          alert('保存编辑失败');
        }
      });
    } catch (error) {
      console.error('❌ [StoryModal] 编辑消息异常:', error);
      alert(`编辑消息失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 切换选项展开/收起状态（小屏）
   */
  private toggleOptions(): void {
    this.optionsExpanded = !this.optionsExpanded;
    this.updateOptionsToggle();
  }

  /**
   * 更新选项展开/收起按钮状态
   */
  private updateOptionsToggle(): void {
    if (!this.element) return;
    const optionsContainer = $(this.element).find('#story-options');
    const toggleBtn = $(this.element).find('#options-toggle-btn');
    const toggleText = toggleBtn.find('.toggle-text');
    const toggleIcon = toggleBtn.find('.toggle-icon');
    
    if (this.optionsExpanded) {
      optionsContainer.addClass('expanded').removeClass('collapsed');
      toggleText.text('收起选项');
      toggleIcon.addClass('expanded');
    } else {
      optionsContainer.addClass('collapsed').removeClass('expanded');
      toggleText.text('展开选项');
      toggleIcon.removeClass('expanded');
    }
  }

  /**
   * 重新渲染
   */
  private render(): void {
    if (!this.element) return;
    // 先移除旧事件，防止重复绑定
    $(this.element).off();
    this.element.innerHTML = this.getModalHTML();
    this.bindEvents();
    // 更新选项展开状态
    this.updateOptionsToggle();
  }

  /**
   * 刷新内容（从聊天消息重新加载）
   * 添加防抖，避免频繁刷新
   */
  private refreshTimer: number | null = null;
  public refresh(): void {
    // 防抖：如果正在生成中，延迟刷新
    if (this.isGenerating) {
      // 清除之前的定时器
      if (this.refreshTimer !== null) {
        clearTimeout(this.refreshTimer);
      }
      // 延迟刷新，等待生成完成
      this.refreshTimer = window.setTimeout(() => {
        this.refresh();
        this.refreshTimer = null;
      }, 300);
      return;
    }

    // 加载最新消息内容
    this.loadFromChatMessages();
    // 刷新时，清空流式文本（以最终落盘内容为准）
    this.streamingText = '';
    
    // 小屏下默认收起选项，给正文更多空间
    this.optionsExpanded = false;
    
    // 如果魔典打开，重新渲染
    if (this.element && this.isOpen) {
      this.render();
      this.scrollToBottom();
      console.log('✅ 魔典内容已刷新');
    }
  }

  /**
   * 检查魔典是否打开
   */
  public getIsOpen(): boolean {
    return this.isOpen;
  }

  /**
   * 显示模态框
   */
  public show(): void {
    this.isOpen = true;

    // 加载最新内容
    this.loadFromChatMessages();
    
    // 小屏下默认收起选项，给正文更多空间
    this.optionsExpanded = false;

    // 设置消息监听器（只设置一次）
    this.setupMessageListener();

    if (this.element) {
      // 先移除旧事件，再重新绑定
      $(this.element).off();
      this.element.innerHTML = this.getModalHTML();
      this.bindEvents();
      $(this.element).addClass('open');
      $('body').addClass('modal-open');
      this.scrollToBottom();
    }
  }

  /**
   * 设置消息监听器
   * 防止重复注册监听器
   */
  private setupMessageListener(): void {
    // 如果已经设置过监听器，不再重复设置
    // 注意：eventOn 可能不支持移除，所以使用标志位防止重复注册
    if (this.isMessageListenerSetup) {
      console.log('⚠️ 消息监听器已设置，跳过重复注册');
      return;
    }

    this.isMessageListenerSetup = true;

    // 监听消息接收和更新事件
    // 注意：由于 eventOn 可能不支持移除，这些监听器会一直存在
    // 但通过标志位确保只注册一次
    eventOn(tavern_events.MESSAGE_RECEIVED, (message_id: number) => {
      // 检查消息是否包含 maintext 和 option
      const messages = getChatMessages(-1);
      const latestMessage = messages.find(m => m.message_id === message_id);
      
      if (latestMessage && latestMessage.role === 'assistant') {
        const hasMaintext = /<maintext>[\s\S]*?<\/maintext>/i.test(latestMessage.message);
        const hasOption = /<option>[\s\S]*?<\/option>/i.test(latestMessage.message);
        
        if (hasMaintext && hasOption) {
          console.log('📨 收到包含 maintext 和 option 的新消息，刷新魔典:', message_id);
          // 延迟一下，确保消息已经完全写入
          setTimeout(() => {
            if (this.isOpen) {
      this.refresh();
            }
          }, 100);
        } else {
          console.log('📨 收到新消息，但不包含 maintext 和 option，跳过刷新:', message_id);
        }
      }
    });

    eventOn(tavern_events.MESSAGE_UPDATED, (message_id: number) => {
      // 检查消息是否包含 maintext 和 option
      const messages = getChatMessages(-1);
      const updatedMessage = messages.find(m => m.message_id === message_id);
      
      if (updatedMessage && updatedMessage.role === 'assistant') {
        const hasMaintext = /<maintext>[\s\S]*?<\/maintext>/i.test(updatedMessage.message);
        const hasOption = /<option>[\s\S]*?<\/option>/i.test(updatedMessage.message);
        
        if (hasMaintext && hasOption) {
          console.log('🔄 消息已更新且包含 maintext 和 option，刷新魔典:', message_id);
          // 延迟一下，确保消息已经完全更新
          setTimeout(() => {
            if (this.isOpen) {
      this.refresh();
            }
          }, 100);
        } else {
          console.log('🔄 消息已更新，但不包含 maintext 和 option，跳过刷新:', message_id);
        }
      }
    });

    // 注意：GENERATION_ENDED 事件可能不存在，移除该监听
    // 消息接收和更新事件已经足够处理生成完成的情况
  }

  /**
   * 创建生成中提示框
   */
  private createGeneratingOverlay(): string {
    return `
      <div class="generating-overlay">
        <div class="generating-content">
          <div class="generating-spinner"></div>
          <div class="generating-text">剧情正在生成</div>
        </div>
      </div>
    `;
  }

  /**
   * 显示生成中提示框
   */
  public showGenerating(): void {
    this.isGenerating = true;
    if (this.element && this.isOpen) {
      const content = $(this.element).find('#story-content');
      if (content.length) {
        content.append(this.createGeneratingOverlay());
      }
    }
  }

  /**
   * 隐藏生成中提示框
   */
  public hideGenerating(): void {
    this.isGenerating = false;
    if (this.element) {
      $(this.element).find('.generating-overlay').remove();
    }
  }

  /**
   * 禁用所有选项按钮
   */
  public disableOptions(): void {
    if (this.element) {
      $(this.element).find('.story-option-btn').prop('disabled', true).addClass('disabled');
    }
  }

  /**
   * 启用所有选项按钮
   */
  public enableOptions(): void {
    if (this.element) {
      $(this.element).find('.story-option-btn').prop('disabled', false).removeClass('disabled');
    }
  }

  /**
   * 关闭模态框
   */
  public close(triggerCallback: boolean = true): void {
    this.isGenerating = false;
    this.isOpen = false;

    // 移除消息监听器（如果支持的话）
    // 注意：eventOn 可能不支持移除，这里暂时保留

    if (this.element) {
      $(this.element).removeClass('open');
      $('body').removeClass('modal-open');
      $(this.element).find('.generating-overlay').remove();
    }
    if (triggerCallback) {
      this.callbacks.onClose();
    }
  }

  /**
   * 显示回顾故事对话框
   */
  private showReviewStory(): void {
    try {
      // 获取所有 assistant 消息
      const lastMessageId = getLastMessageId();
      const messages = getChatMessages(`0-${lastMessageId}`, { role: 'assistant' });
      
      if (messages.length === 0) {
        alert('暂无故事内容');
        return;
      }

      // 提取每个消息的 maintext
      const storyItems = messages
        .map(msg => {
          const maintextMatch = msg.message.match(/<maintext>([\s\S]*?)<\/maintext>/i);
          const maintext = maintextMatch ? maintextMatch[1].trim() : '';
          return {
            message_id: msg.message_id,
            maintext: maintext || '(无内容)',
          };
        })
        .filter(item => item.maintext !== '(无内容)');

      if (storyItems.length === 0) {
        alert('暂无故事内容');
        return;
      }

      // 创建对话框 HTML
      const dialogHTML = `
        <div class="review-story-dialog">
          <div class="review-story-header">
            <h3>回顾故事</h3>
            <button class="review-story-close">×</button>
          </div>
          <div class="review-story-content">
            ${storyItems
              .map(
                (item, index) => `
              <div class="review-story-item">
                <div class="review-story-item-header">
                  <span class="review-story-index">第 ${index + 1} 层</span>
                  <span class="review-story-id">消息 ID: ${item.message_id}</span>
                </div>
                <div class="review-story-maintext">${parseRichText(item.maintext)}</div>
              </div>
            `,
              )
              .join('')}
          </div>
        </div>
      `;

      // 创建并显示对话框
      const dialog = document.createElement('div');
      dialog.className = 'review-story-overlay';
      dialog.innerHTML = dialogHTML;
      document.body.appendChild(dialog);

      // 绑定关闭事件
      $(dialog).on('click', '.review-story-close, .review-story-overlay', (e) => {
        if (e.target === dialog || $(e.target).closest('.review-story-close').length) {
          $(dialog).remove();
        }
      });

      // 点击对话框内容时不关闭
      $(dialog).on('click', '.review-story-dialog', (e) => {
        e.stopPropagation();
      });
    } catch (error) {
      console.error('❌ 显示回顾故事失败:', error);
      alert('显示回顾故事失败');
    }
  }

  /**
   * 显示读档对话框
   */
  private showLoadSave(): void {
    try {
      // 获取所有非玩家楼层的 assistant 消息
      const lastMessageId = getLastMessageId();
      const messages = getChatMessages(`0-${lastMessageId}`, { role: 'assistant' });

      if (messages.length === 0) {
        alert('暂无存档点');
        return;
      }

      // 提取每个消息的 sum
      const saveItems = messages
        .map(msg => {
          const sumMatch = msg.message.match(/<sum>([\s\S]*?)<\/sum>/i);
          const sum = sumMatch ? sumMatch[1].trim() : '';
          return {
            message_id: msg.message_id,
            sum: sum || '(无摘要)',
          };
        })
        .filter(item => item.sum !== '(无摘要)');

      if (saveItems.length === 0) {
        alert('暂无存档点');
        return;
      }

      // 创建对话框 HTML
      const dialogHTML = `
        <div class="load-save-dialog">
          <div class="load-save-header">
            <h3>读档</h3>
            <button class="load-save-close">×</button>
          </div>
          <div class="load-save-content">
            ${saveItems
              .map(
                (item, index) => `
              <button class="load-save-item" data-message-id="${item.message_id}">
                <div class="load-save-sum">${parseRichText(item.sum)}</div>
                <div class="load-save-id">消息 ID: ${item.message_id}</div>
              </button>
            `,
              )
              .join('')}
          </div>
        </div>
      `;

      // 创建并显示对话框
      const dialog = document.createElement('div');
      dialog.className = 'load-save-overlay';
      dialog.innerHTML = dialogHTML;
      document.body.appendChild(dialog);

      // 绑定关闭事件
      $(dialog).on('click', '.load-save-close, .load-save-overlay', (e) => {
        if (e.target === dialog || $(e.target).closest('.load-save-close').length) {
          $(dialog).remove();
        }
      });

      // 点击对话框内容时不关闭
      $(dialog).on('click', '.load-save-dialog', (e) => {
        e.stopPropagation();
      });

      // 绑定存档项点击事件
      $(dialog).on('click', '.load-save-item', async (e) => {
        e.stopPropagation();
        const button = e.currentTarget as HTMLButtonElement;
        const messageId = button.getAttribute('data-message-id');

        if (!messageId) return;

        // 确认对话框
        const confirmed = confirm('确认要读档吗？这会回到当时的故事节点，并删除之后的所有故事信息');
        if (!confirmed) return;

        try {
          // 执行读档命令
          await triggerSlash(`/branch-create ${messageId}`);
          console.log('✅ 读档成功，消息 ID:', messageId);
          
          // 关闭对话框
          $(dialog).remove();
          
          // 刷新魔典
          this.refresh();
        } catch (error) {
          console.error('❌ 读档失败:', error);
          alert('读档失败: ' + (error instanceof Error ? error.message : String(error)));
        }
      });
    } catch (error) {
      console.error('❌ 显示读档失败:', error);
      alert('显示读档失败');
    }
  }

  /**
   * 销毁组件
   */
  public destroy(): void {
    if (this.element) {
      $(this.element).off();
      $(this.element).remove();
      this.element = null;
    }
  }
}
