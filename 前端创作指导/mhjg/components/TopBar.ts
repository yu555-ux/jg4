import { readGameData } from '../utils/variableReader';
import './TopBar.scss';

export interface TopBarState {
  gold: number;
  reputation: number;
  materials: number;
  currentWorld: string;
  innName?: string;
}

export class TopBar {
  private element: HTMLElement | null = null;
  private worldInputOpen: boolean = false;
  private onWorldUpdate?: (worldName: string) => void; // Callback to notify world update
  private state: TopBarState = {
    gold: 0,
    reputation: 0,
    materials: 0,
    currentWorld: '',
    innName: '',
  };

  constructor(initialState?: TopBarState) {
    if (initialState) {
      this.state = initialState;
    } else {
      // 从变量表读取初始状态（异步，不等待，使用默认值）
      this.loadFromVariables();
    }
  }

  /**
   * 从变量表加载数据
   */
  public async loadFromVariables(): Promise<void> {
    const gameData = await readGameData();
    this.state = {
      gold: gameData.gold,
      reputation: gameData.reputation,
      materials: gameData.materials,
      currentWorld: gameData.currentWorld,
      innName: gameData.innName,
    };
    if (this.element) {
      this.render();
    }
  }

  /**
   * 创建顶部栏HTML结构
   */
  public createElement(): HTMLElement {
    const header = document.createElement('header');
    header.className = 'mhjg-topbar';
    header.innerHTML = this.getTopBarHTML();
    this.element = header;
    this.bindEvents();
    return header;
  }

  /**
   * 获取顶部栏HTML
   */
  private getTopBarHTML(): string {
    return `
      <div class="topbar-bg"></div>
      <div class="topbar-content">
        <div class="topbar-title">
          <h1 class="title-text" data-inn-name>${this.state.innName || '诸天便携旅店'}</h1>
          <div class="title-subtitle">
            <div class="subtitle-line"></div>
            <span class="subtitle-text">迷失者的庇护所</span>
            <div class="subtitle-line"></div>
          </div>
        </div>
        <div class="topbar-resources">
          ${this.createResourceHTML('gold', this.state.gold, '金币', 'amber')}
          ${this.createResourceHTML('reputation', this.state.reputation, '声望', 'purple')}
          ${this.createWorldHTML(this.state.currentWorld)}
          <button class="nav-toggle-btn" data-nav-toggle-btn aria-label="显示/隐藏导航" title="显示/隐藏导航">
            ${this.getNavToggleIcon()}
          </button>
          <button class="fullscreen-btn" data-fullscreen-btn aria-label="切换全屏">
            ${this.getFullscreenIcon()}
          </button>
        </div>
      </div>
    `;
  }

  private getNavToggleIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  }

  /**
   * 创建资源HTML
   */
  private createResourceHTML(id: string, value: number, label: string, color: string): string {
    const colorClasses: Record<string, { text: string; bg: string; border: string }> = {
      amber: {
        text: 'text-amber-400',
        bg: 'from-amber-950/40 to-slate-900/40',
        border: 'border-amber-500/20',
      },
      purple: {
        text: 'text-purple-400',
        bg: 'from-purple-950/40 to-slate-900/40',
        border: 'border-purple-500/20',
      },
      cyan: {
        text: 'text-cyan-400',
        bg: 'from-cyan-950/40 to-slate-900/40',
        border: 'border-cyan-500/20',
      },
    };

    const colors = colorClasses[color] || colorClasses.amber;
    const icon = this.getResourceIcon(id);

    return `
      <div class="resource-item ${colors.text} ${colors.bg} ${colors.border}">
        <div class="resource-icon">
          ${icon}
        </div>
        <div class="resource-info">
          <span class="resource-label">${label}</span>
          <span class="resource-value">${value.toLocaleString()}</span>
        </div>
      </div>
    `;
  }

  /**
   * 获取资源图标
   */
  private getResourceIcon(id: string): string {
    const icons: Record<string, string> = {
      gold: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M15 9a3 3 0 1 1-6 0"/></svg>',
      reputation:
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 .794.588l6.148.886a.5.5 0 0 1 .277.853l-4.45 4.34a1 1 0 0 0-.288.885l1.05 6.12a.5.5 0 0 1-.725.527l-5.494-2.89a1 1 0 0 0-.931 0l-5.494 2.89a.5.5 0 0 1-.725-.527l1.05-6.12a1 1 0 0 0-.288-.885L2.39 11.197a.5.5 0 0 1 .277-.853l6.148-.886a1 1 0 0 0 .794-.588z"/></svg>',
      materials:
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
      mana: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    };
    return icons[id] || '';
  }

  /**
   * 创建世界HTML
   */
  private createWorldHTML(worldName: string): string {
    return `
      <div class="world-item text-cyan-400 from-cyan-950/40 to-slate-900/40 border-cyan-500/20" data-world-selector>
        <div class="resource-icon">
          ${this.getWorldIcon()}
        </div>
        <div class="resource-info">
          <span class="resource-label">当前世界</span>
          <span class="resource-value">${worldName}</span>
        </div>
      </div>
    `;
  }

  /**
   * 获取世界图标
   */
  private getWorldIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
  }

  /**
   * 获取全屏图标
   */
  private getFullscreenIcon(): string {
    // 检查当前是否全屏
    const isFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
    
    if (isFullscreen) {
      // 退出全屏图标
      return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>';
    } else {
      // 进入全屏图标
      return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
    }
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (!this.element) return;

    // 世界选择器
    $(this.element).on('click', '[data-world-selector]', e => {
      e.stopPropagation();
      this.showWorldInput();
    });

    // 全屏按钮
    $(this.element).on('click', '[data-fullscreen-btn]', e => {
      e.stopPropagation();
      this.toggleFullscreen();
    });

    // 导航显示/隐藏（小屏腾空间）
    $(this.element).on('click', '[data-nav-toggle-btn]', e => {
      e.stopPropagation();
      const app = document.querySelector('.mhjg-app');
      if (app) {
        app.classList.toggle('nav-collapsed');
      }
      // 图标本身不需要切换（保持统一）
    });
    
    // 监听全屏状态变化，更新图标
    document.addEventListener('fullscreenchange', () => {
      this.updateFullscreenIcon();
    });
    document.addEventListener('webkitfullscreenchange', () => {
      this.updateFullscreenIcon();
    });
    document.addEventListener('mozfullscreenchange', () => {
      this.updateFullscreenIcon();
    });
    document.addEventListener('MSFullscreenChange', () => {
      this.updateFullscreenIcon();
    });
  }

  /**
   * 设置世界更新回调
   */
  public setWorldUpdateHandler(handler: (worldName: string) => void): void {
    this.onWorldUpdate = handler;
  }

  /**
   * 显示世界输入框（公开方法，供 Navigation 调用）
   */
  public showWorldInput(): void {
    // 防止重复打开
    if (this.worldInputOpen) {
      return;
    }

    // 如果已经存在输入框，先移除
    $('.world-input-overlay').remove();

    this.worldInputOpen = true;

    const input = $(`
      <div class="world-input-overlay">
        <div class="world-input">
          <h4>穿越到新世界</h4>
          <p class="world-input-desc">输入新世界的名称，旅店将穿越到该世界观</p>
          <input type="text" class="world-input-field" placeholder="例如：现代都市、魔法学院、赛博朋克..." value="${this.state.currentWorld}" />
          <div class="world-input-actions">
            <button class="world-input-cancel">取消</button>
            <button class="world-input-confirm">确认穿越</button>
          </div>
        </div>
      </div>
    `);

    input.on('click', '.world-input-cancel, .world-input-overlay', e => {
      if (e.target === input[0] || $(e.target).hasClass('world-input-cancel')) {
        input.remove();
        this.worldInputOpen = false;
      }
    });

    input.on('click', '.world-input-confirm', async () => {
      const newWorld = input.find('.world-input-field').val()?.toString().trim();
      if (newWorld && newWorld !== this.state.currentWorld) {
        // 关闭世界输入框
        input.remove();
        this.worldInputOpen = false;
        
        const { handleUnifiedRequest } = await import('../utils/unifiedRequestHandler');
        const { handleTabChange } = await import('../utils/tabManager');
        const { GameTab } = await import('../types');
        const { getStoryModal } = await import('../utils/appState');

        await handleUnifiedRequest(
          {
            type: 'world-travel',
            content: {
              worldName: newWorld,
            },
          },
          {
            onSwitchToStory: () => {
              handleTabChange(GameTab.STORY);
              const storyModal = getStoryModal();
              if (storyModal) {
                storyModal.show();
              }
            },
            onRefreshStoryIfOpen: () => {
              const storyModal = getStoryModal();
              if (storyModal && storyModal.isOpen) {
                storyModal.refresh();
              }
            },
            onDisableOptions: () => {
              const storyModal = getStoryModal();
              if (storyModal) {
                storyModal.disableOptions();
              }
            },
            onShowGenerating: () => {
              const storyModal = getStoryModal();
              if (storyModal) {
                storyModal.showGenerating();
              }
            },
            onHideGenerating: () => {
              const storyModal = getStoryModal();
              if (storyModal) {
                storyModal.hideGenerating();
              }
            },
            onEnableOptions: () => {
              const storyModal = getStoryModal();
              if (storyModal) {
                storyModal.enableOptions();
              }
            },
            onError: (error: string) => {
              console.error('❌ 世界穿越失败:', error);
            },
            onRefreshStory: () => {
              const storyModal = getStoryModal();
              if (storyModal) {
                storyModal.refresh();
              }
            },
          },
        );

        // 更新本地状态
        this.state.currentWorld = newWorld;
        this.render();
        
        // 通知 Navigation 更新世界名称
        if (this.onWorldUpdate) {
          this.onWorldUpdate(newWorld);
        }
      } else {
        // 如果没有输入或相同，也关闭输入框
        input.remove();
        this.worldInputOpen = false;
      }
    });

    $('body').append(input);
    input.find('.world-input-field').focus().select();
  }

  /**
   * 切换全屏
   */
  private toggleFullscreen(): void {
    const doc = document.documentElement;
    
    // 检查当前是否全屏
    const isFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
    
    if (isFullscreen) {
      // 退出全屏
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.log('退出全屏失败:', err);
        });
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    } else {
      // 进入全屏
      if (doc.requestFullscreen) {
        doc.requestFullscreen().catch((err) => {
          console.log('全屏请求失败:', err);
        });
      } else if ((doc as any).webkitRequestFullscreen) {
        (doc as any).webkitRequestFullscreen();
      } else if ((doc as any).mozRequestFullScreen) {
        (doc as any).mozRequestFullScreen();
      } else if ((doc as any).msRequestFullscreen) {
        (doc as any).msRequestFullscreen();
      }
    }
  }
  
  /**
   * 更新全屏图标
   */
  private updateFullscreenIcon(): void {
    if (!this.element) return;
    const btn = $(this.element).find('[data-fullscreen-btn]');
    if (btn.length) {
      btn.html(this.getFullscreenIcon());
    }
  }

  /**
   * 更新状态
   */
  public updateState(newState: Partial<TopBarState>): void {
    this.state = { ...this.state, ...newState };
    this.render();
  }

  /**
   * 重新渲染
   */
  private render(): void {
    if (!this.element) return;
    this.element.innerHTML = this.getTopBarHTML();
    this.bindEvents();
  }

  /**
   * 更新状态
   */
  public updateState(newState: Partial<TopBarState>): void {
    this.state = { ...this.state, ...newState };
    if (this.element) {
      this.render();
    }
  }

  /**
   * 销毁组件
   */
  public destroy(): void {
    if (this.element) {
      $(this.element).off();
      this.element = null;
    }
  }
}
