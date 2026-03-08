import './RecruitStaffModal.scss';

export interface RecruitStaffRequest {
  gender: 'any' | 'male' | 'female' | 'other';
  personality: string;
  specialRequirements: string;
  salary: number;
  position: string;
}

export interface RecruitStaffModalCallbacks {
  onConfirm: (request: RecruitStaffRequest) => void;
  onCancel: () => void;
}

export class RecruitStaffModal {
  private element: HTMLElement | null = null;
  private callbacks: RecruitStaffModalCallbacks;
  private isOpen: boolean = false;

  constructor(callbacks: RecruitStaffModalCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * 创建模态框HTML结构
   */
  public createElement(): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'mhjg-modal mhjg-modal-recruit-staff';
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
              ${this.getRecruitIcon()}
            </div>
            <div class="modal-title-group">
              <h2 class="modal-title">招募员工</h2>
              <p class="modal-subtitle">发布你的招募需求，寻找合适的员工</p>
            </div>
          </div>
          <button class="modal-close" aria-label="关闭">
            ${this.getCloseIcon()}
          </button>
        </div>
        <div class="modal-content">
          <form class="recruit-form" id="recruit-staff-form">
            <div class="form-section">
              <label class="form-label">
                <span class="label-text">性别要求</span>
                <span class="label-hint">选择你希望的员工性别</span>
              </label>
              <div class="gender-options">
                <label class="gender-option">
                  <input type="radio" name="gender" value="any" checked>
                  <span class="option-label">不限</span>
                </label>
                <label class="gender-option">
                  <input type="radio" name="gender" value="male">
                  <span class="option-label">男性</span>
                </label>
                <label class="gender-option">
                  <input type="radio" name="gender" value="female">
                  <span class="option-label">女性</span>
                </label>
                <label class="gender-option">
                  <input type="radio" name="gender" value="other">
                  <span class="option-label">其他</span>
                </label>
              </div>
            </div>

            <div class="form-section">
              <label class="form-label" for="personality">
                <span class="label-text">性格要求</span>
                <span class="label-hint">描述你希望的员工性格（如：开朗、细心、负责等）</span>
              </label>
              <textarea
                id="personality"
                name="personality"
                class="form-textarea"
                rows="3"
                placeholder="例如：开朗外向，善于沟通，工作认真负责..."
              ></textarea>
            </div>

            <div class="form-section">
              <label class="form-label" for="position">
                <span class="label-text">招募职位</span>
                <span class="label-hint">员工在旅店中担任的职务</span>
              </label>
              <input
                type="text"
                id="position"
                name="position"
                class="form-input"
                placeholder="例如：前台接待、厨师、保安、服务员..."
                maxlength="20"
              />
            </div>

            <div class="form-section">
              <label class="form-label" for="special-requirements">
                <span class="label-text">特殊要求</span>
                <span class="label-hint">其他特殊要求或偏好（可选）</span>
              </label>
              <textarea
                id="special-requirements"
                name="specialRequirements"
                class="form-textarea"
                rows="3"
                placeholder="例如：需要有战斗经验、擅长魔法、会多国语言..."
              ></textarea>
            </div>

            <div class="form-section">
              <label class="form-label" for="salary">
                <span class="label-text">工资待遇</span>
                <span class="label-hint">每月支付的工资（金币）</span>
              </label>
              <div class="salary-input-wrapper">
                <input
                  type="number"
                  id="salary"
                  name="salary"
                  class="form-input form-input-number"
                  placeholder="0"
                  min="0"
                  step="10"
                  value="100"
                />
                <span class="salary-unit">金币/月</span>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="form-btn form-btn-cancel" data-action="cancel">
                取消
              </button>
              <button type="submit" class="form-btn form-btn-submit" data-action="submit">
                ${this.getSubmitIcon()}
                发布招募
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
    $(this.element).on('submit', '#recruit-staff-form', e => {
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

    const form = $(this.element).find('#recruit-staff-form')[0] as HTMLFormElement;
    if (!form) return;

    const formData = new FormData(form);
    const gender = (formData.get('gender') as string) || 'any';
    const personality = (formData.get('personality') as string)?.trim() || '';
    const position = (formData.get('position') as string)?.trim() || '';
    const specialRequirements = (formData.get('specialRequirements') as string)?.trim() || '';
    const salary = parseInt((formData.get('salary') as string) || '100', 10) || 100;

    // 验证必填字段
    if (!position) {
      this.showError('请填写招募职位');
      return;
    }

    if (salary < 0) {
      this.showError('工资不能为负数');
      return;
    }

    const request: RecruitStaffRequest = {
      gender: gender as 'any' | 'male' | 'female' | 'other',
      personality,
      specialRequirements,
      salary,
      position,
    };

    console.log('📝 招募需求:', request);
    this.callbacks.onConfirm(request);
    this.close();
  }

  /**
   * 显示错误提示
   */
  private showError(message: string): void {
    // 简单的错误提示，可以后续优化为更美观的提示框
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
  private getRecruitIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><line x1="22" y1="6" x2="18" y2="10"/><line x1="18" y1="6" x2="22" y2="10"/></svg>';
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

