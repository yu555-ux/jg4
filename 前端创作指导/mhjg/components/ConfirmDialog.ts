import './ConfirmDialog.scss';

export interface ConfirmDialogCallbacks {
  onConfirm: () => void;
  onCancel: () => void;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
}

export class ConfirmDialog {
  private element: HTMLElement | null = null;
  private callbacks: ConfirmDialogCallbacks;
  private options: ConfirmDialogOptions;
  private isVisible: boolean = false;

  constructor(callbacks: ConfirmDialogCallbacks, options: ConfirmDialogOptions) {
    this.callbacks = callbacks;
    this.options = {
      confirmText: '确定',
      cancelText: '取消',
      confirmVariant: 'primary',
      ...options,
    };
  }

  /**
   * 创建对话框HTML结构
   */
  public createElement(): HTMLElement {
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.innerHTML = this.getDialogHTML();
    this.element = dialog;
    this.bindEvents();
    return dialog;
  }

  /**
   * 获取对话框HTML
   */
  private getDialogHTML(): string {
    if (!this.isVisible) return '';

    const confirmClass = this.options.confirmVariant === 'danger' 
      ? 'glass-btn-danger' 
      : 'glass-btn-primary';

    return `
      <div class="confirm-dialog-backdrop"></div>
      <div class="confirm-dialog-window">
        <div class="confirm-dialog-header">
          <h3 class="confirm-dialog-title">${this.options.title}</h3>
        </div>
        <div class="confirm-dialog-content">
          <p class="confirm-dialog-message">${this.options.message}</p>
        </div>
        <div class="confirm-dialog-actions">
          <button class="glass-btn glass-btn-neutral" data-action="cancel">
            <span class="glass-btn-shine"></span>
            <span class="glass-btn-label">${this.options.cancelText}</span>
          </button>
          <button class="glass-btn ${confirmClass}" data-action="confirm">
            <span class="glass-btn-shine"></span>
            <span class="glass-btn-label">${this.options.confirmText}</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (!this.element) return;

    $(this.element).on('click', '.confirm-dialog-backdrop, [data-action="cancel"]', () => {
      this.hide();
      this.callbacks.onCancel();
    });

    $(this.element).on('click', '[data-action="confirm"]', () => {
      this.hide();
      this.callbacks.onConfirm();
    });
  }

  /**
   * 显示对话框
   */
  public show(): void {
    this.isVisible = true;
    if (this.element) {
      this.element.innerHTML = this.getDialogHTML();
      this.bindEvents();
      $(this.element).addClass('visible');
      $('body').addClass('dialog-open');
    }
  }

  /**
   * 隐藏对话框
   */
  public hide(): void {
    this.isVisible = false;
    if (this.element) {
      $(this.element).removeClass('visible');
      $('body').removeClass('dialog-open');
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

