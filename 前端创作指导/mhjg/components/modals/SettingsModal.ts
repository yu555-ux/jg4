import './SettingsModal.scss';

export interface SettingsModalCallbacks {
  onClose: () => void;
}

interface FontSettings {
  fontSize: string;
  fontColor: string;
  fontFamily: string;
}

const STORAGE_KEY = 'mhjg-font-settings';

export class SettingsModal {
  private element: HTMLElement | null = null;
  private callbacks: SettingsModalCallbacks;
  public isOpen: boolean = false;
  private settings: FontSettings;

  constructor(callbacks: SettingsModalCallbacks) {
    this.callbacks = callbacks;
    // 从本地缓存加载设置
    this.settings = this.loadSettings();
  }

  /**
   * 从本地缓存加载设置
   */
  private loadSettings(): FontSettings {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('⚠️ 加载设置失败:', error);
    }
    // 默认设置
    return {
      fontSize: '16px',
      fontColor: '#e0e7ff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    };
  }

  /**
   * 保存设置到本地缓存
   */
  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      console.log('✅ 设置已保存到本地缓存');
    } catch (error) {
      console.error('❌ 保存设置失败:', error);
    }
  }

  /**
   * 应用字体设置到页面
   */
  private applyFontSettings(): void {
    const root = document.documentElement;
    root.style.setProperty('--mhjg-font-size', this.settings.fontSize);
    root.style.setProperty('--mhjg-font-color', this.settings.fontColor);
    root.style.setProperty('--mhjg-font-family', this.settings.fontFamily);
    
    // 应用到 body
    document.body.style.fontSize = this.settings.fontSize;
    document.body.style.color = this.settings.fontColor;
    document.body.style.fontFamily = this.settings.fontFamily;
  }

  /**
   * 创建模态框HTML结构
   */
  public createElement(): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'mhjg-modal mhjg-modal-settings';
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

    return `
      <div class="modal-backdrop"></div>
      <div class="modal-window">
        <div class="modal-header">
          <div class="modal-header-left">
            <div class="modal-icon">
              ${this.getSettingsIcon()}
            </div>
            <div class="modal-title-group">
              <h2 class="modal-title">游戏设置</h2>
              <p class="modal-subtitle">字体与显示设置</p>
            </div>
          </div>
          <button class="modal-close" aria-label="关闭">
            关闭
          </button>
        </div>
        <div class="modal-content">
          <div class="settings-section">
            <h3 class="settings-section-title">字体设置</h3>
            
            <div class="setting-item">
              <label class="setting-label">字体大小</label>
              <input 
                type="range" 
                id="font-size-slider" 
                class="setting-slider"
                min="12" 
                max="24" 
                step="1" 
                value="${parseInt(this.settings.fontSize)}"
              />
              <span class="setting-value" id="font-size-value">${this.settings.fontSize}</span>
            </div>

            <div class="setting-item">
              <label class="setting-label">字体颜色</label>
              <input 
                type="color" 
                id="font-color-picker" 
                class="setting-color"
                value="${this.settings.fontColor}"
              />
              <span class="setting-value" id="font-color-value">${this.settings.fontColor}</span>
            </div>

            <div class="setting-item">
              <label class="setting-label">字体类型</label>
              <select id="font-family-select" class="setting-select">
                <option value="system-ui, -apple-system, sans-serif" ${this.settings.fontFamily.includes('system-ui') ? 'selected' : ''}>系统默认</option>
                <option value="'Microsoft YaHei', '微软雅黑', sans-serif" ${this.settings.fontFamily.includes('Microsoft YaHei') ? 'selected' : ''}>微软雅黑</option>
                <option value="'SimSun', '宋体', serif" ${this.settings.fontFamily.includes('SimSun') ? 'selected' : ''}>宋体</option>
                <option value="'KaiTi', '楷体', serif" ${this.settings.fontFamily.includes('KaiTi') ? 'selected' : ''}>楷体</option>
                <option value="'FangSong', '仿宋', serif" ${this.settings.fontFamily.includes('FangSong') ? 'selected' : ''}>仿宋</option>
                <option value="'SimHei', '黑体', sans-serif" ${this.settings.fontFamily.includes('SimHei') ? 'selected' : ''}>黑体</option>
                <option value="'STSong', '华文宋体', serif" ${this.settings.fontFamily.includes('STSong') ? 'selected' : ''}>华文宋体</option>
              </select>
            </div>

            <div class="setting-preview">
              <label class="setting-label">预览效果</label>
              <div class="preview-text" id="font-preview">
                这是字体预览效果：The quick brown fox jumps over the lazy dog. 1234567890
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 获取设置图标
   */
  private getSettingsIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m9-9h-6m-6 0H3m15.364 6.364-4.243-4.243m-4.242-4.242-4.243 4.243m4.242 4.242 4.243-4.243"/></svg>';
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (!this.element) return;

    $(this.element).off('click', '.modal-backdrop, .modal-close');
    $(this.element).off('input', '#font-size-slider');
    $(this.element).off('input', '#font-color-picker');
    $(this.element).off('change', '#font-family-select');

    $(this.element).on('click', '.modal-backdrop, .modal-close', () => {
      this.close();
    });

    // 字体大小滑块
    $(this.element).on('input', '#font-size-slider', (e) => {
      const value = (e.target as HTMLInputElement).value + 'px';
      this.settings.fontSize = value;
      $(this.element!).find('#font-size-value').text(value);
      this.updatePreview();
      this.saveSettings();
      this.applyFontSettings();
    });

    // 字体颜色选择器
    $(this.element).on('input', '#font-color-picker', (e) => {
      const value = (e.target as HTMLInputElement).value;
      this.settings.fontColor = value;
      $(this.element!).find('#font-color-value').text(value);
      this.updatePreview();
      this.saveSettings();
      this.applyFontSettings();
    });

    // 字体类型选择
    $(this.element).on('change', '#font-family-select', (e) => {
      const value = (e.target as HTMLSelectElement).value;
      this.settings.fontFamily = value;
      this.updatePreview();
      this.saveSettings();
      this.applyFontSettings();
    });
  }

  /**
   * 更新预览
   */
  private updatePreview(): void {
    const preview = $(this.element!).find('#font-preview');
    if (preview.length) {
      preview[0].style.fontSize = this.settings.fontSize;
      preview[0].style.color = this.settings.fontColor;
      preview[0].style.fontFamily = this.settings.fontFamily;
    }
  }

  /**
   * 显示模态框
   */
  public show(): void {
    this.isOpen = true;

    if (this.element) {
      $(this.element).off();
      this.element.innerHTML = this.getModalHTML();
      this.bindEvents();
      $(this.element).addClass('open');
      $('body').addClass('modal-open');
      // 更新预览
      setTimeout(() => {
        this.updatePreview();
      }, 100);
    } else {
      const modal = this.createElement();
      document.body.appendChild(modal);
      $(modal).addClass('open');
      $('body').addClass('modal-open');
      setTimeout(() => {
        this.updatePreview();
      }, 100);
    }

    // 应用当前设置
    this.applyFontSettings();
  }

  /**
   * 关闭模态框
   */
  public close(triggerCallback: boolean = true): void {
    this.isOpen = false;

    if (this.element) {
      $(this.element).removeClass('open');
      $('body').removeClass('modal-open');
    }
    if (triggerCallback) {
      this.callbacks.onClose();
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

