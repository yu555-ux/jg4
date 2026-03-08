import {
  ACCESS_MODE_OPTIONS,
  GameConfig,
  INN_STYLE_OPTIONS,
  PERK_OPTIONS,
  RANDOM_INN_NAMES,
  WORLD_OPTIONS,
} from '../types/gameConfig';
import './NewGameSetup.scss';

export interface NewGameSetupCallbacks {
  onCancel: () => void;
  onConfirm: (config: GameConfig) => void;
}

export class NewGameSetup {
  private element: HTMLElement | null = null;
  private callbacks: NewGameSetupCallbacks;
  private config: Partial<GameConfig> = {
    innName: RANDOM_INN_NAMES[0],
    innStyle: 'oak',
    startingWorld: 'fantasy',
    startingPerk: 'wealth',
    accessMode: 'physical',
    seed: Date.now(),
  };
  private fullscreenListenerAttached: boolean = false;

  constructor(callbacks: NewGameSetupCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * 创建组件HTML结构
   */
  public createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'new-game-setup';
    container.innerHTML = this.getHTML();
    this.element = container;
    this.bindEvents();

    // 动画入场
    requestAnimationFrame(() => {
      container.classList.add('visible');
    });

    return container;
  }

  /**
   * 获取HTML内容
   */
  private getHTML(): string {
    return `
      <div class="setup-bg"></div>
      <div class="setup-particles"></div>
      
      <div class="setup-container">
        <div class="setup-utility-buttons">
          <button class="setup-utility-btn setup-fullscreen-btn" data-fullscreen-btn aria-label="切换全屏" title="切换全屏">
            ${this.getFullscreenIcon()}
          </button>
        </div>
        
        <header class="setup-header">
            <div class="header-left">
                <button class="back-btn" data-action="cancel">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                    <span>返回</span>
                </button>
                <h1 class="page-title">创建新旅店</h1>
            </div>
        </header>

        <div class="setup-content">
            <div class="setup-form-scroll">
                ${this.getFormHTML()}
            </div>
            
            <div class="preview-panel">
                <div class="preview-header">
                    <h3>契约预览</h3>
                </div>
                <div class="preview-content" id="preview-content">
                    ${this.getPreviewContentHTML()}
                </div>
                <div class="preview-footer">
                    <button class="confirm-btn" data-action="confirm">签署契约 (开始游戏)</button>
                </div>
            </div>
        </div>
      </div>
    `;
  }

  /**
   * 获取表单HTML
   */
  private getFormHTML(): string {
    return `
      <!-- 1. Inn Name -->
      <div class="form-section">
        <div class="section-header">
            <div class="step-number">1</div>
            <div class="section-title">旅店命名</div>
        </div>
        <div class="input-group">
            <input type="text" id="inn-name" value="${this.config.innName}" placeholder="输入旅店名称..." maxlength="30">
            <button class="random-btn" data-action="random-name" title="随机生成">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
            </button>
        </div>
      </div>

      <!-- 2. World Selection -->
      <div class="form-section">
        <div class="section-header">
            <div class="step-number">2</div>
            <div class="section-title">选择世界位面</div>
        </div>
        <div class="cards-grid">
            ${WORLD_OPTIONS.map(
              world => `
                <label class="selection-card ${this.config.startingWorld === world.id ? 'selected' : ''}">
                    <input type="radio" name="world" value="${world.id}" ${this.config.startingWorld === world.id ? 'checked' : ''}>
                    <div class="card-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                    </div>
                    <div class="card-title">${world.name}</div>
                    <div class="card-desc">${world.desc}</div>
                </label>
            `,
            ).join('')}
        </div>
      </div>

      <!-- 3. Inn Style -->
      <div class="form-section">
        <div class="section-header">
            <div class="step-number">3</div>
            <div class="section-title">初始旅店风格</div>
        </div>
        <div class="cards-grid">
            ${INN_STYLE_OPTIONS.map(
              style => `
                <label class="selection-card ${this.config.innStyle === style.id ? 'selected' : ''}">
                    <input type="radio" name="inn-style" value="${style.id}" ${this.config.innStyle === style.id ? 'checked' : ''}>
                    <div class="card-icon">
                        ${this.getInnStyleIcon(style.icon)}
                    </div>
                    <div class="card-title">${style.name}</div>
                    <div class="card-desc">${style.desc}</div>
                </label>
            `,
            ).join('')}
        </div>
      </div>

      <!-- 4. Starting Perk -->
      <div class="form-section">
        <div class="section-header">
            <div class="step-number">4</div>
            <div class="section-title">初始恩赐</div>
        </div>
        <div class="cards-grid">
            ${PERK_OPTIONS.map(
              perk => `
                <label class="selection-card ${this.config.startingPerk === perk.id ? 'selected' : ''}">
                    <input type="radio" name="perk" value="${perk.id}" ${this.config.startingPerk === perk.id ? 'checked' : ''}>
                    <div class="card-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                    </div>
                    <div class="card-title">${perk.name}</div>
                    <div class="card-desc">${perk.desc}</div>
                </label>
            `,
            ).join('')}
        </div>
      </div>

      <!-- 5. Access Mode -->
      <div class="form-section">
        <div class="section-header">
            <div class="step-number">5</div>
            <div class="section-title">准入条件</div>
        </div>
        <div class="cards-grid">
            ${ACCESS_MODE_OPTIONS.map(
              mode => `
                <label class="selection-card ${this.config.accessMode === mode.id ? 'selected' : ''}">
                    <input type="radio" name="access-mode" value="${mode.id}" ${this.config.accessMode === mode.id ? 'checked' : ''}>
                    <div class="card-icon">
                        ${this.getAccessModeIcon(mode.icon)}
                    </div>
                    <div class="card-title">${mode.mode_name}</div>
                    <div class="card-desc">${mode.condition}</div>
                </label>
            `,
            ).join('')}
        </div>
      </div>
    `;
  }

  /**
   * 获取旅店风格图标
   */
  private getInnStyleIcon(iconName: string): string {
    const icons: Record<string, string> = {
      oak: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/><path d="M6 3v18M18 3v18"/><path d="M9 9h6v6H9z"/><circle cx="12" cy="12" r="2"/></svg>',
      street:
        '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/><circle cx="12" cy="12" r="2"/><path d="M6 6h12v12H6z"/></svg>',
      crimson:
        '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"/><path d="M4 8h16M8 4v16"/><path d="M12 12h4v4h-4z"/><circle cx="10" cy="10" r="1"/><circle cx="14" cy="14" r="1"/></svg>',
      bamboo:
        '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/><path d="M6 3v18M18 3v18"/><circle cx="12" cy="12" r="3"/><path d="M9 9l6 6M15 9l-6 6"/></svg>',
    };
    return icons[iconName] || icons.oak;
  }

  /**
   * 获取准入条件图标
   */
  private getAccessModeIcon(iconName: string): string {
    const icons: Record<string, string> = {
      door: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M9 4v18"/><path d="M9 12h6"/></svg>',
      heart:
        '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 4c-1.76 0 3 .5 4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 11 8.5c0 2.29 1.51 4.04 3 5.5l-7 7Z"/></svg>',
      clock:
        '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      star: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    };
    return icons[iconName] || icons.door;
  }

  /**
   * 获取预览HTML内容 (供 updatePreview 调用)
   */
  private getPreviewContentHTML(): string {
    const selectedWorld = WORLD_OPTIONS.find(w => w.id === this.config.startingWorld) || WORLD_OPTIONS[0];
    const selectedStyle = INN_STYLE_OPTIONS.find(s => s.id === this.config.innStyle) || INN_STYLE_OPTIONS[0];
    const selectedPerk = PERK_OPTIONS.find(p => p.id === this.config.startingPerk) || PERK_OPTIONS[0];
    const selectedAccessMode = ACCESS_MODE_OPTIONS.find(m => m.id === this.config.accessMode) || ACCESS_MODE_OPTIONS[0];

    return `
        <div class="preview-item">
            <div class="label">旅店名称</div>
            <div class="value highlight">${this.config.innName || '???'}</div>
        </div>

        <div class="preview-item">
            <div class="label">所在世界</div>
            <div class="value">${selectedWorld.name}</div>
            <div class="desc-box">${selectedWorld.desc}</div>
        </div>

        <div class="preview-item">
            <div class="label">初始旅店风格</div>
            <div class="value">${selectedStyle.name}</div>
            <div class="desc-box">${selectedStyle.desc}</div>
        </div>

        <div class="preview-item">
            <div class="label">初始恩赐</div>
            <div class="value">${selectedPerk.name}</div>
            <div class="desc-box">${selectedPerk.desc}</div>
        </div>

        <div class="preview-item">
            <div class="label">准入条件</div>
            <div class="value">${selectedAccessMode.mode_name}</div>
            <div class="desc-box">${selectedAccessMode.condition}</div>
        </div>
    `;
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (!this.element) return;

    // 返回按钮
    $(this.element).on('click', '[data-action="cancel"]', () => {
      this.hide(() => this.callbacks.onCancel());
    });

    // 随机名称
    $(this.element).on('click', '[data-action="random-name"]', () => {
      const randomName = RANDOM_INN_NAMES[Math.floor(Math.random() * RANDOM_INN_NAMES.length)];
      const input = $(this.element!).find('#inn-name') as JQuery<HTMLInputElement>;
      input.val(randomName);
      this.config.innName = randomName;
      this.updatePreview();

      // Animation
      input.addClass('flash');
      setTimeout(() => input.removeClass('flash'), 300);
    });

    // 名称输入
    $(this.element).on('input', '#inn-name', e => {
      const value = (e.target as HTMLInputElement).value.trim();
      this.config.innName = value;
      this.updatePreview();
    });

    // Radio selection (Delegation)
    $(this.element).on('change', 'input[type="radio"]', e => {
      const input = e.target as HTMLInputElement;
      const name = input.name;
      const value = input.value;

      // Update config
      if (name === 'world') this.config.startingWorld = value as any;
      if (name === 'inn-style') this.config.innStyle = value as any;
      if (name === 'perk') this.config.startingPerk = value as any;
      if (name === 'access-mode') this.config.accessMode = value as any;

      // Update visual selection state
      const groupCards = $(this.element!).find(`input[name="${name}"]`).closest('.selection-card');
      groupCards.removeClass('selected');
      $(input).closest('.selection-card').addClass('selected');

      this.updatePreview();
    });

    // 确认按钮
    $(this.element).on('click', '[data-action="confirm"]', () => {
      this.handleConfirm();
    });

    // 全屏按钮
    $(this.element).on('click', '[data-fullscreen-btn]', () => {
      this.toggleFullscreen();
    });

    // 初始化全屏监听
    this.attachFullscreenListeners();
    this.updateFullscreenIcon();
  }

  /**
   * 更新预览面板
   */
  private updatePreview(): void {
    if (!this.element) return;
    const content = $(this.element).find('#preview-content');
    content.html(this.getPreviewContentHTML());
  }

  /**
   * 隐藏并回调
   */
  public hide(callback?: () => void): void {
    if (!this.element) return;
    this.element.classList.remove('visible');
    setTimeout(() => {
      if (callback) callback();
    }, 600);
  }

  /**
   * 获取全屏图标
   */
  private getFullscreenIcon(): string {
    const isFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );

    if (isFullscreen) {
      return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>';
    } else {
      return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
    }
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
        document.exitFullscreen().catch(err => {
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
        doc.requestFullscreen().catch(err => {
          console.log('全屏请求失败:', err);
        });
        return;
      }
      if ((doc as any).webkitRequestFullscreen) {
        (doc as any).webkitRequestFullscreen();
        return;
      }
      if ((doc as any).mozRequestFullScreen) {
        (doc as any).mozRequestFullScreen();
        return;
      }
      if ((doc as any).msRequestFullscreen) {
        (document as any).msRequestFullscreen();
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
   * 附加全屏状态监听器
   */
  private attachFullscreenListeners(): void {
    if (this.fullscreenListenerAttached) return;

    const handleFullscreenChange = () => {
      this.updateFullscreenIcon();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    this.fullscreenListenerAttached = true;
  }

  /**
   * 销毁
   */
  public destroy(): void {
    if (this.element) {
      this.fullscreenListenerAttached = false;
      $(this.element).off();
      this.element.remove();
      this.element = null;
    }
  }

  /**
   * 处理确认
   */
  private handleConfirm(): void {
    const innName = this.config.innName?.trim();
    if (!innName || innName.length === 0) {
      // Simple toast or alert replacement could be better, but alert is fine for now
      alert('请为您的旅店起一个名字！');
      $(this.element!).find('#inn-name').focus();
      return;
    }

    const config: GameConfig = {
      innName: innName,
      innStyle: this.config.innStyle || 'oak',
      startingWorld: this.config.startingWorld || 'fantasy',
      startingPerk: this.config.startingPerk || 'wealth',
      accessMode: this.config.accessMode || 'physical',
      seed: Date.now(),
    };

    this.hide(() => this.callbacks.onConfirm(config));
  }
}
