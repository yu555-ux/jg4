import './NewFacilityModal.scss';

export interface NewFacilityRequest {
  name: string;
  description: string;
  initialLevel: number;
}

export interface NewFacilityModalCallbacks {
  onConfirm: (request: NewFacilityRequest) => void;
  onCancel: () => void;
}

export class NewFacilityModal {
  private element: HTMLElement | null = null;
  private callbacks: NewFacilityModalCallbacks;
  private isOpen: boolean = false;

  constructor(callbacks: NewFacilityModalCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * 创建模态框HTML结构
   */
  public createElement(): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'mhjg-modal mhjg-modal-new-facility';
    modal.innerHTML = this.getModalHTML();
    this.element = modal;
    this.bindEvents();
    return modal;
  }

  /**
   * 获取模态框HTML
   */
  private getModalHTML(): string {
    return `
      <div class="modal-backdrop"></div>
      <div class="modal-window">
        <div class="modal-header">
          <div class="modal-header-left">
            <div class="modal-icon">
              ${this.getFacilityIcon()}
            </div>
            <div class="modal-title-group">
              <h2 class="modal-title">新建设施/区域</h2>
              <p class="modal-subtitle">规划新的设施或区域，扩展你的旅店</p>
            </div>
          </div>
          <button class="modal-close" aria-label="关闭">
            ${this.getCloseIcon()}
          </button>
        </div>
        <div class="modal-content">
          <form class="facility-form" id="new-facility-form">
            <div class="form-section">
              <label class="form-label" for="facility-name">
                <span class="label-text">设施名称</span>
                <span class="label-hint">新设施或区域的名称（必填）</span>
              </label>
              <input
                type="text"
                id="facility-name"
                name="name"
                class="form-input"
                placeholder="例如：温泉、图书馆、训练场..."
                maxlength="20"
                required
              />
            </div>

            <div class="form-section">
              <label class="form-label" for="facility-description">
                <span class="label-text">设施描述</span>
                <span class="label-hint">描述这个设施的功能和特点（必填）</span>
              </label>
              <textarea
                id="facility-description"
                name="description"
                class="form-textarea"
                rows="4"
                placeholder="例如：一个温暖的温泉池，可以缓解客人的疲劳，提升心情..."
                required
              ></textarea>
            </div>

            <div class="form-section">
              <label class="form-label" for="initial-level">
                <span class="label-text">初始等级</span>
                <span class="label-hint">新建设施的初始等级（1-5）</span>
              </label>
              <div class="level-input-wrapper">
                <input
                  type="number"
                  id="initial-level"
                  name="initialLevel"
                  class="form-input form-input-number"
                  placeholder="1"
                  min="1"
                  max="5"
                  value="1"
                  required
                />
                <span class="level-unit">级</span>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="form-btn form-btn-cancel" data-action="cancel">
                取消
              </button>
              <button type="submit" class="form-btn form-btn-submit" data-action="submit">
                ${this.getSubmitIcon()}
                创建设施
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (!this.element) return;

    // 关闭按钮
    $(this.element).on('click', '.modal-backdrop, .modal-close, [data-action="cancel"]', () => {
      this.close();
    });

    // 表单提交
    $(this.element).on('submit', '#new-facility-form', e => {
      e.preventDefault();
      this.handleSubmit();
    });

    // 阻止点击模态框内容区域关闭
    $(this.element).on('click', '.modal-window', e => {
      e.stopPropagation();
    });
  }

  /**
   * 处理表单提交
   */
  private handleSubmit(): void {
    if (!this.element) return;

    const form = $(this.element).find('#new-facility-form')[0] as HTMLFormElement;
    if (!form) return;

    const formData = new FormData(form);
    const name = (formData.get('name') as string)?.trim() || '';
    const description = (formData.get('description') as string)?.trim() || '';
    const initialLevel = parseInt((formData.get('initialLevel') as string) || '1', 10) || 1;

    // 验证必填字段
    if (!name) {
      this.showError('请填写设施名称');
      return;
    }

    if (!description) {
      this.showError('请填写设施描述');
      return;
    }

    if (initialLevel < 1 || initialLevel > 5) {
      this.showError('初始等级必须在 1-5 之间');
      return;
    }

    const request: NewFacilityRequest = {
      name,
      description,
      initialLevel,
    };

    console.log('🏗️ 新建设施请求:', request);
    this.callbacks.onConfirm(request);
    this.close();
  }

  /**
   * 显示错误提示
   */
  private showError(message: string): void {
    alert(message);
  }

  /**
   * 显示模态框
   */
  public show(): void {
    this.isOpen = true;
    if (this.element) {
      $(this.element).addClass('open');
      $('body').addClass('modal-open');
    }
  }

  /**
   * 关闭模态框
   */
  public close(): void {
    this.isOpen = false;
    if (this.element) {
      $(this.element).removeClass('open');
      $('body').removeClass('modal-open');
    }
    this.callbacks.onCancel();
  }

  /**
   * 获取图标
   */
  private getFacilityIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9"/><path d="M17.64 15 22 10.64"/><path d="m14.91 7.79 1.77-1.77a1.49 1.49 0 0 0 0-2.12l-3.54-3.54a1.49 1.49 0 0 0-2.12 0L9.12 4.23"/><path d="m8.53 12.91 5.38 5.38"/></svg>';
  }

  private getCloseIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  }

  private getSubmitIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
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

