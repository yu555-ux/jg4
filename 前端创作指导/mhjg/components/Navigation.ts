import { GameTab } from '../types';
import { showLoadSave, showReviewStory } from '../utils/saveLoadUtils';
import '../utils/saveLoadUtils.scss';
import './Navigation.scss';

export interface NavigationCallbacks {
  onTabChange: (tab: GameTab) => void;
}

export class Navigation {
  private element: HTMLElement | null = null;
  private activeTab: GameTab = GameTab.DASHBOARD;
  private callbacks: NavigationCallbacks;
  private currentWorld: string = '';
  private onWorldClick?: () => void; // Callback to show world input

  constructor(callbacks: NavigationCallbacks) {
    this.callbacks = callbacks;
    // Load world name from variables
    this.loadWorldFromVariables();
  }

  /**
   * 从变量表加载世界名称
   */
  private async loadWorldFromVariables(): Promise<void> {
    try {
      const { readGameData } = await import('../utils/variableReader');
      const gameData = await readGameData();
      this.currentWorld = gameData.currentWorld || '';
      this.updateWorldDisplay();
    } catch (error) {
      console.warn('Failed to load world name:', error);
    }
  }

  /**
   * 设置世界点击回调
   */
  public setWorldClickHandler(handler: () => void): void {
    this.onWorldClick = handler;
  }

  /**
   * 更新世界显示
   */
  private updateWorldDisplay(): void {
    if (!this.element) return;
    const worldBtn = this.element.querySelector('[data-world-selector]') as HTMLElement;
    if (worldBtn) {
      const valueEl = worldBtn.querySelector('.world-value');
      if (valueEl) {
        valueEl.textContent = this.currentWorld;
      }
    }
  }

  /**
   * 更新世界名称（公开方法，供 TopBar 调用）
   */
  public updateWorld(worldName: string): void {
    this.currentWorld = worldName;
    this.updateWorldDisplay();
  }

  /**
   * 创建导航栏HTML结构
   */
  public createElement(): HTMLElement {
    const nav = document.createElement('nav');
    nav.className = 'mhjg-navigation';
    nav.innerHTML = this.getNavigationHTML();
    this.element = nav;
    this.bindEvents();
    return nav;
  }

  /**
   * 获取导航栏HTML
   */
  private getNavigationHTML(): string {
    const navItems = [
      { id: GameTab.DASHBOARD, label: '总览', icon: 'dashboard' },
      { id: GameTab.STORY, label: '魔典', icon: 'book' },
      { id: GameTab.GUESTS, label: '宾客', icon: 'users' },
      { id: GameTab.STAFF, label: '员工', icon: 'users' },
      { id: GameTab.BUILD, label: '扩建', icon: 'hammer' },
    ];

    const navItemsHTML = navItems.map(item => {
      const isActive = this.activeTab === item.id;
      return `
        <button
          class="nav-item ${isActive ? 'active' : ''}"
          data-tab="${item.id}"
          aria-label="${item.label}"
        >
          <div class="nav-icon">
            ${this.getIconSVG(item.icon)}
          </div>
          <span class="nav-label">${item.label}</span>
        </button>
      `;
    }).join('');

    return `
      <div class="nav-logo" id="nav-settings-btn">
        <div class="logo-bg"></div>
        ${this.getSettingsIcon()}
      </div>
      <div class="nav-items">
        ${navItemsHTML}
      </div>
      <div class="nav-status">
        <!-- Desktop: show online status -->
        <div class="status-online">
          <div class="status-indicator"></div>
          <span class="status-text">在线</span>
        </div>
        <!-- Utility buttons: Load Save and Review Story -->
        <div class="nav-utility-buttons">
          <button class="nav-utility-btn" data-load-save-btn aria-label="读档" title="读档">
            <div class="nav-icon">
              ${this.getLoadSaveIcon()}
            </div>
            <span class="nav-label">读档</span>
          </button>
          <button class="nav-utility-btn" data-review-story-btn aria-label="阅读模式" title="阅读模式">
            <div class="nav-icon">
              ${this.getReviewStoryIcon()}
            </div>
            <span class="nav-label">阅读</span>
          </button>
        </div>
        <!-- Mobile: show world selector (replaces online status) -->
        <button class="nav-world-btn" data-world-selector aria-label="穿越世界">
          <div class="world-icon">
            ${this.getWorldIcon()}
          </div>
          <span class="world-label">当前世界</span>
          <span class="world-value">${this.currentWorld || '未知'}</span>
        </button>
      </div>
    `;
  }

  /**
   * 获取图标SVG
   */
  private getIconSVG(iconName: string): string {
    const icons: Record<string, string> = {
      dashboard: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
      book: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>',
      users: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      utensils: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z"/><path d="M21 15v7"/></svg>',
      hammer: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9"/><path d="M17.64 15 22 10.64"/><path d="m14.91 7.79 1.77-1.77a1.49 1.49 0 0 0 0-2.12l-3.54-3.54a1.49 1.49 0 0 0-2.12 0L9.12 4.23"/><path d="m8.53 12.91 5.38 5.38"/></svg>',
    };
    return icons[iconName] || '';
  }

  /**
   * 获取设置图标（系统图标）
   */
  private getSettingsIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="logo-icon"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m9-9h-6m-6 0H3m15.364 6.364-4.243-4.243m-4.242-4.242-4.243 4.243m4.242 4.242 4.243-4.243"/></svg>';
  }

  /**
   * 获取世界图标
   */
  private getWorldIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
  }

  /**
   * 获取读档图标
   */
  private getLoadSaveIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3s3 1.34 3 3s-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>';
  }

  /**
   * 获取阅读模式图标
   */
  private getReviewStoryIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>';
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (!this.element) return;

    $(this.element).on('click', '.nav-item', (e) => {
      const button = e.currentTarget as HTMLElement;
      const tab = button.getAttribute('data-tab') as GameTab;
      if (tab) {
        this.setActiveTab(tab);
        this.callbacks.onTabChange(tab);
      }
    });

    // 设置按钮点击事件
    $(this.element).on('click', '#nav-settings-btn', () => {
      this.showSettings();
    });

    // 世界选择器点击事件（小屏下在导航栏底部）
    $(this.element).on('click', '[data-world-selector]', (e) => {
      e.stopPropagation();
      if (this.onWorldClick) {
        this.onWorldClick();
      }
    });

    // 读档按钮点击事件
    $(this.element).on('click', '[data-load-save-btn]', (e) => {
      e.stopPropagation();
      showLoadSave();
    });

    // 阅读模式按钮点击事件
    $(this.element).on('click', '[data-review-story-btn]', (e) => {
      e.stopPropagation();
      showReviewStory();
    });
  }

  /**
   * 显示设置页面
   */
  private showSettings(): void {
    // 动态导入设置模态框
    import('./modals/SettingsModal').then(({ SettingsModal }) => {
      const settingsModal = new SettingsModal({
        onClose: () => {
          settingsModal.destroy();
        },
      });
      settingsModal.show();
    });
  }

  /**
   * 设置活动标签页
   */
  public setActiveTab(tab: GameTab): void {
    this.activeTab = tab;
    this.updateActiveState();
  }

  /**
   * 更新活动状态
   */
  private updateActiveState(): void {
    if (!this.element) return;

    $(this.element).find('.nav-item').each((_, el) => {
      const $el = $(el);
      const tab = $el.attr('data-tab') as GameTab;
      if (tab === this.activeTab) {
        $el.addClass('active');
      } else {
        $el.removeClass('active');
      }
    });
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

