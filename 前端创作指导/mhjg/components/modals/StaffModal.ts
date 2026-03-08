import { Staff } from '../../types';
import { readGameData } from '../../utils/variableReader';
import { RecruitStaffModal, RecruitStaffRequest } from './RecruitStaffModal';
import './StaffModal.scss';

interface StaffInteractionOption {
  label: string;
  prompt_template: string;
}

interface StaffManageOption {
  label: string;
  prompt_template: string;
}

const STAFF_INTERACTION_OPTIONS: StaffInteractionOption[] = [
  {
    label: '鼓励工作',
    prompt_template: '你决定鼓励${staff_name}更加努力地工作。',
  },
  {
    label: '赠送礼物',
    prompt_template: '你决定对${staff_name}赠送小礼物以示感谢。',
  },
  {
    label: '倾听烦恼',
    prompt_template: '你决定倾听${staff_name}的烦恼并尝试帮助对方。',
  },
  {
    label: '询问意见',
    prompt_template: '你决定向${staff_name}询问关于旅店经营的意见和建议。',
  },
  {
    label: '安排任务',
    prompt_template: '你决定给${staff_name}安排一个特殊的任务。',
  },
  {
    label: '表扬称赞',
    prompt_template: '你决定表扬${staff_name}的工作表现。',
  },
  {
    label: '提醒警告',
    prompt_template: '你决定提醒${staff_name}注意工作态度和表现。',
  },
  {
    label: '谈心交流',
    prompt_template: '你决定与${staff_name}进行一次深入的谈心交流。',
  },
];

const STAFF_MANAGE_OPTIONS: StaffManageOption[] = [
  {
    label: '调整工资',
    prompt_template: '你决定调整${staff_name}的工资待遇。',
  },
  {
    label: '调换职务',
    prompt_template: '你决定为${staff_name}调换工作职务。',
  },
  {
    label: '安排培训',
    prompt_template: '你决定为${staff_name}安排技能培训。',
  },
  {
    label: '给予奖励',
    prompt_template: '你决定给予${staff_name}额外的奖励。',
  },
  {
    label: '安排休息',
    prompt_template: '你决定让${staff_name}休息一段时间。',
  },
  {
    label: '解雇员工',
    prompt_template: '你决定解雇${staff_name}。',
  },
];

export interface StaffModalCallbacks {
  onClose: () => void;
  onInteract?: (staffId: string) => void;
  onManage?: (staffId: string) => void;
}

export class StaffModal {
  private element: HTMLElement | null = null;
  private staff: Staff[] = [];
  private callbacks: StaffModalCallbacks;
  private isOpen: boolean = false;
  private selectedStaff: Staff | null = null;
  private recruitModal: RecruitStaffModal | null = null;
  private isProcessing: boolean = false; // 防止重复点击
  private currentInteractingStaff: Staff | null = null;
  private currentManagingStaff: Staff | null = null;

  constructor(staff: Staff[] | null, callbacks: StaffModalCallbacks) {
    if (staff) {
      this.staff = staff;
    } else {
      // 从变量表加载数据
      this.loadFromVariables();
    }
    this.callbacks = callbacks;
  }

  /**
   * 从变量表加载员工数据
   */
  public async loadFromVariables(): Promise<void> {
    const gameData = await readGameData();
    // 转换员工数据格式
    this.staff = gameData.staff.map((staff, index) => {
      // 处理 MVU 格式：如果 staff 是 [值, "描述"] 格式，取第一个元素
      let staffValue = staff;
      if (Array.isArray(staff) && staff.length > 0) {
        staffValue = staff[0];
      }
      return {
      id: String(index + 1),
        name: staffValue?.名称 || '',
        race: staffValue?.种族 || '',
        // 兼容：优先使用 旅馆担任的职务，如果没有则使用 职业
        innRole: staffValue?.旅馆担任的职务 || staffValue?.职业 || '',
        // 兼容：优先使用 战斗职业名，如果没有则为空
        combatClass: staffValue?.战斗职业名 || '',
        level: staffValue?.职业等级 || 1,
        appearance: staffValue?.外貌描述 || '',
        mood: staffValue?.心情值 || 0,
        favorability: staffValue?.对玩家的好感度 || 0,
        workSatisfaction: staffValue?.工作满意度 || 0,
        salary: staffValue?.工资 || 0,
        likes: staffValue?.喜好 || [],
        dislikes: staffValue?.厌恶 || [],
        currentThought: staffValue?.当前想法 || '',
      avatarUrl: `https://picsum.photos/100?random=${index + 20}`,
      };
    });
    if (this.isOpen && this.element) {
      this.render();
    }
  }

  /**
   * 重新渲染模态框
   */
  private render(): void {
    if (!this.element) return;
    // 先移除旧事件，防止重复绑定
    $(this.element).off();
    this.element.innerHTML = this.getModalHTML();
    this.bindEvents();
  }

  /**
   * 创建模态框HTML结构
   */
  public createElement(): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'mhjg-modal mhjg-modal-staff';
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
              ${this.getStaffIcon()}
            </div>
            <div class="modal-title-group">
              <h2 class="modal-title">员工管理</h2>
              <p class="modal-subtitle">当前有 ${this.staff.length} 位员工在岗</p>
            </div>
          </div>
          <button class="modal-close" aria-label="关闭">
            ${this.getCloseIcon()}
          </button>
        </div>
        <div class="modal-content">
          <div class="staff-grid">
            ${this.staff.map(staff => this.createStaffCard(staff)).join('')}
            <div class="staff-placeholder" data-action="recruit">
              <span class="placeholder-icon">+</span>
              <span class="placeholder-text">招募员工</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 创建员工卡片
   */
  private createStaffCard(staff: Staff): string {
    const favorabilityColor = this.getFavorabilityColor(staff.favorability);
    const favorabilityText = this.getFavorabilityText(staff.favorability);
    const moodColor = this.getMoodColor(staff.mood || 0);
    const moodText = this.getMoodText(staff.mood || 0);
    const satisfactionColor = this.getSatisfactionColor(staff.workSatisfaction || 0);
    const satisfactionText = this.getSatisfactionText(staff.workSatisfaction || 0);

    return `
      <div class="staff-card rpg-panel" data-staff-id="${staff.id}">
        <div class="staff-header">
          <div class="staff-avatar-wrapper">
            <img 
              src="${staff.avatarUrl}" 
              alt="${staff.name}" 
              class="staff-avatar"
            />
            <div class="staff-level-badge">Lv.${staff.level}</div>
            <div class="staff-favorability-badge" style="background: ${favorabilityColor}">
              ${staff.favorability}
            </div>
          </div>
          <div class="staff-info">
            <h3 class="staff-name">${staff.name}</h3>
            <div class="staff-tags">
              <span class="staff-tag staff-tag-race">${staff.race}</span>
              ${staff.combatClass ? `<span class="staff-tag staff-tag-combat">${staff.combatClass}</span>` : ''}
              ${staff.innRole ? `<span class="staff-tag staff-tag-role">${staff.innRole}</span>` : ''}
            </div>
            <div class="staff-stats">
              <div class="staff-stat-item">
                <span class="stat-label">好感度</span>
                <div class="stat-bar">
                  <div class="stat-bar-fill" style="width: ${staff.favorability}%; background: ${favorabilityColor}"></div>
                </div>
                <span class="stat-text">${favorabilityText}</span>
              </div>
              ${staff.mood !== undefined ? `
              <div class="staff-stat-item">
                <span class="stat-label">心情</span>
                <div class="stat-bar">
                  <div class="stat-bar-fill" style="width: ${staff.mood}%; background: ${moodColor}"></div>
                </div>
                <span class="stat-text">${moodText}</span>
              </div>
              ` : ''}
              ${staff.workSatisfaction !== undefined ? `
              <div class="staff-stat-item">
                <span class="stat-label">工作满意度</span>
                <div class="stat-bar">
                  <div class="stat-bar-fill" style="width: ${staff.workSatisfaction}%; background: ${satisfactionColor}"></div>
                </div>
                <span class="stat-text">${satisfactionText}</span>
              </div>
              ` : ''}
              <div class="staff-stat-item">
                <span class="stat-label">工资</span>
                <span class="stat-value stat-salary">${staff.salary || 0} 金币/月</span>
              </div>
            </div>
          </div>
        </div>
        <div class="staff-appearance">
          <div class="appearance-label">
            ${this.getEyeIcon()}
            <span>外貌</span>
          </div>
          <p class="appearance-text">${staff.appearance}</p>
        </div>
        ${staff.currentThought ? `
        <div class="staff-thought">
          <div class="thought-quote">"</div>
          <p class="thought-text">${staff.currentThought}</p>
        </div>
        ` : ''}
        <div class="staff-preferences">
          <div class="preferences-section">
            <div class="preferences-label">
              ${this.getHeartIcon()}
              <span>喜好</span>
            </div>
            <div class="preferences-list">
              ${
                staff.likes && staff.likes.length > 0
                  ? staff.likes.map(like => `<span class="preference-tag preference-like">${like}</span>`).join('')
                  : '<span class="preference-empty">暂无</span>'
              }
            </div>
          </div>
          <div class="preferences-section">
            <div class="preferences-label">
              ${this.getXIcon()}
              <span>厌恶</span>
            </div>
            <div class="preferences-list">
              ${
                staff.dislikes && staff.dislikes.length > 0
                  ? staff.dislikes
                      .map(dislike => `<span class="preference-tag preference-dislike">${dislike}</span>`)
                      .join('')
                  : '<span class="preference-empty">暂无</span>'
              }
            </div>
          </div>
        </div>
        <div class="staff-actions">
          <button class="staff-btn staff-btn-interact">
            ${this.getMessageIcon()}
            互动
          </button>
          <button class="staff-btn staff-btn-manage">
            ${this.getSettingsIcon()}
            管理
          </button>
          <button class="staff-btn staff-btn-more">
            ${this.getMoreIcon()}
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 获取心情颜色
   */
  private getMoodColor(mood: number): string {
    if (mood >= 80) return 'rgba(16, 185, 129, 0.2)'; // emerald
    if (mood >= 60) return 'rgba(99, 102, 241, 0.2)'; // indigo
    if (mood >= 40) return 'rgba(251, 191, 36, 0.2)'; // amber
    return 'rgba(239, 68, 68, 0.2)'; // red
  }

  /**
   * 获取心情文本
   */
  private getMoodText(mood: number): string {
    if (mood >= 80) return '非常愉快';
    if (mood >= 60) return '愉快';
    if (mood >= 40) return '一般';
    if (mood >= 20) return '低落';
    return '非常低落';
  }

  /**
   * 获取工作满意度颜色
   */
  private getSatisfactionColor(satisfaction: number): string {
    if (satisfaction >= 80) return 'rgba(16, 185, 129, 0.2)'; // emerald
    if (satisfaction >= 60) return 'rgba(99, 102, 241, 0.2)'; // indigo
    if (satisfaction >= 40) return 'rgba(251, 191, 36, 0.2)'; // amber
    return 'rgba(239, 68, 68, 0.2)'; // red
  }

  /**
   * 获取工作满意度文本
   */
  private getSatisfactionText(satisfaction: number): string {
    if (satisfaction >= 80) return '非常满意';
    if (satisfaction >= 60) return '满意';
    if (satisfaction >= 40) return '一般';
    if (satisfaction >= 20) return '不满意';
    return '非常不满意';
  }

  /**
   * 获取好感度颜色
   */
  private getFavorabilityColor(favorability: number): string {
    if (favorability >= 80) return 'rgba(16, 185, 129, 0.2)'; // emerald
    if (favorability >= 60) return 'rgba(99, 102, 241, 0.2)'; // indigo
    if (favorability >= 40) return 'rgba(251, 191, 36, 0.2)'; // amber
    return 'rgba(239, 68, 68, 0.2)'; // red
  }

  /**
   * 获取好感度文本
   */
  private getFavorabilityText(favorability: number): string {
    if (favorability >= 80) return '非常友好';
    if (favorability >= 60) return '友好';
    if (favorability >= 40) return '一般';
    return '冷淡';
  }

  /**
   * 获取图标
   */
  private getStaffIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
  }

  private getCloseIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  }

  private getMessageIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  }

  private getSettingsIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/></svg>';
  }

  private getMoreIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>';
  }

  private getEyeIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  }

  private getHeartIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
  }

  private getXIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (!this.element) return;

    // 先清理旧事件，防止重复绑定
    $(this.element).off();

    $(this.element).on('click', '.modal-backdrop, .modal-close', () => {
      this.close();
    });

    $(this.element).on('click', '.staff-btn-interact', e => {
      e.stopPropagation();
      const card = $(e.currentTarget).closest('.staff-card');
      const staffId = card.attr('data-staff-id');
      const staff = this.staff.find(s => s.id === staffId);
      if (staff) {
        this.showInteractionMenu(staff);
      }
    });

    $(this.element).on('click', '.staff-btn-manage', e => {
      e.stopPropagation();
      const card = $(e.currentTarget).closest('.staff-card');
      const staffId = card.attr('data-staff-id');
      const staff = this.staff.find(s => s.id === staffId);
      if (staff) {
        this.showManageMenu(staff);
      }
    });

    // 点击互动选项
    $(this.element).on('click', '.interaction-option', e => {
      e.stopPropagation();
      const optionIndex = parseInt($(e.currentTarget).attr('data-option-index') || '0', 10);
      const option = STAFF_INTERACTION_OPTIONS[optionIndex];
      if (option && this.currentInteractingStaff) {
        this.handleInteraction(option, this.currentInteractingStaff);
      }
    });

    // 点击管理选项
    $(this.element).on('click', '.manage-option', e => {
      e.stopPropagation();
      const optionIndex = parseInt($(e.currentTarget).attr('data-option-index') || '0', 10);
      const option = STAFF_MANAGE_OPTIONS[optionIndex];
      if (option && this.currentManagingStaff) {
        this.handleManage(option, this.currentManagingStaff);
      }
    });

    // 点击关闭互动菜单
    $(this.element).on('click', '.interaction-menu-backdrop, .interaction-menu-close', () => {
      this.hideInteractionMenu();
    });

    // 点击关闭管理菜单
    $(this.element).on('click', '.manage-menu-backdrop, .manage-menu-close', () => {
      this.hideManageMenu();
    });

    $(this.element).on('click', '.staff-card', e => {
      if ($(e.target).closest('.staff-btn').length) return;
      const card = $(e.currentTarget);
      const staffId = card.attr('data-staff-id');
      if (staffId) {
        const staff = this.staff.find(s => s.id === staffId);
        if (staff) {
          this.selectedStaff = staff;
          card.addClass('selected');
          card.siblings().removeClass('selected');
        }
      }
    });

    // 招募员工按钮
    $(this.element).on('click', '[data-action="recruit"]', () => {
      if (this.isProcessing) {
        console.warn('⚠️ 正在处理中，忽略重复点击');
        return;
      }
      this.showRecruitModal();
    });
  }

  /**
   * 显示模态框
   */
  public show(): void {
    this.isOpen = true;
    // 每次显示时重新从变量表加载数据
    this.loadFromVariables();
    if (this.element) {
      this.render();
      $(this.element).addClass('open');
      $('body').addClass('modal-open');
    }
  }

  /**
   * 检查模态框是否打开
   */
  public getIsOpen(): boolean {
    return this.isOpen;
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
   * 更新员工列表
   */
  public updateStaff(staff: Staff[]): void {
    this.staff = staff;
    if (this.isOpen && this.element) {
      this.element.innerHTML = this.getModalHTML();
    }
  }

  /**
   * 显示招募员工模态框
   */
  private showRecruitModal(): void {
    if (!this.recruitModal) {
      this.recruitModal = new RecruitStaffModal({
        onConfirm: (request: RecruitStaffRequest) => {
          this.handleRecruitRequest(request);
        },
        onCancel: () => {
          // 关闭时不做任何操作
        },
      });
      document.body.appendChild(this.recruitModal.createElement());
    }
    this.recruitModal.show();
  }

  /**
   * 处理招募请求
   */
  private async handleRecruitRequest(request: RecruitStaffRequest): Promise<void> {
    // 防止重复点击
    if (this.isProcessing) {
      console.warn('⚠️ 正在处理招募请求，忽略重复点击');
      return;
    }

    // 设置处理状态
    this.isProcessing = true;

    try {
      // 关闭招募界面
      if (this.recruitModal) {
        this.recruitModal.close();
      }
      
      const { handleUnifiedRequest } = await import('../../utils/unifiedRequestHandler');
      const { createStoryCallbacks } = await import('../../utils/storyCallbacks');

      await handleUnifiedRequest(
        {
          type: 'recruit',
          content: {
            position: request.position,
            salary: request.salary,
            gender: request.gender,
            requirements: request.requirements,
          },
        },
        createStoryCallbacks()
      );
    } catch (error) {
      console.error('❌ 招募请求失败:', error);
    } finally {
      // 重置处理状态
      this.isProcessing = false;
    }
  }

  /**
   * 获取性别文本
   */
  private getGenderText(gender: string): string {
    const genderMap: Record<string, string> = {
      any: '不限',
      male: '男性',
      female: '女性',
      other: '其他',
    };
    return genderMap[gender] || '不限';
  }

  /**
   * 显示互动菜单
   */
  private showInteractionMenu(staff: Staff): void {
    this.currentInteractingStaff = staff;
    if (!this.element) return;

    const menuHTML = `
      <div class="interaction-menu-backdrop"></div>
      <div class="interaction-menu">
        <div class="interaction-menu-header">
          <h3>与 ${staff.name} 互动</h3>
          <button class="interaction-menu-close">×</button>
        </div>
        <div class="interaction-menu-content">
          ${STAFF_INTERACTION_OPTIONS.map(
            (option, index) => `
            <button class="interaction-option" data-option-index="${index}">
              ${option.label}
            </button>
          `,
          ).join('')}
        </div>
      </div>
    `;

    $(this.element).append(menuHTML);
  }

  /**
   * 隐藏互动菜单
   */
  private hideInteractionMenu(): void {
    if (!this.element) return;
    $(this.element).find('.interaction-menu-backdrop, .interaction-menu').remove();
    this.currentInteractingStaff = null;
  }

  /**
   * 显示管理菜单
   */
  private showManageMenu(staff: Staff): void {
    this.currentManagingStaff = staff;
    if (!this.element) return;

    const menuHTML = `
      <div class="interaction-menu-backdrop manage-menu-backdrop"></div>
      <div class="interaction-menu manage-menu">
        <div class="interaction-menu-header">
          <h3>管理 ${staff.name}</h3>
          <button class="interaction-menu-close manage-menu-close">×</button>
        </div>
        <div class="interaction-menu-content">
          ${STAFF_MANAGE_OPTIONS.map(
            (option, index) => `
            <button class="interaction-option manage-option" data-option-index="${index}">
              ${option.label}
            </button>
          `,
          ).join('')}
        </div>
      </div>
    `;

    $(this.element).append(menuHTML);
  }

  /**
   * 隐藏管理菜单
   */
  private hideManageMenu(): void {
    if (!this.element) return;
    $(this.element).find('.manage-menu-backdrop, .manage-menu').remove();
    this.currentManagingStaff = null;
  }

  /**
   * 处理互动
   */
  private async handleInteraction(option: StaffInteractionOption, staff: Staff): Promise<void> {
    if (this.isProcessing) {
      console.warn('⚠️ 正在处理中，忽略重复点击');
      return;
    }

    this.isProcessing = true;
    const prompt = option.prompt_template.replace('${staff_name}', staff.name);
    this.hideInteractionMenu();

    try {
      const { handleUnifiedRequest } = await import('../../utils/unifiedRequestHandler');
      const { createStoryCallbacks } = await import('../../utils/storyCallbacks');

      await handleUnifiedRequest(
        {
          type: 'custom',
          content: prompt,
        },
        createStoryCallbacks()
      );
    } catch (error) {
      console.error('❌ 员工互动异常:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 处理管理
   */
  private async handleManage(option: StaffManageOption, staff: Staff): Promise<void> {
    if (this.isProcessing) {
      console.warn('⚠️ 正在处理中，忽略重复点击');
      return;
    }

    this.isProcessing = true;
    const prompt = option.prompt_template.replace('${staff_name}', staff.name);
    this.hideManageMenu();

    try {
      const { handleUnifiedRequest } = await import('../../utils/unifiedRequestHandler');
      const { createStoryCallbacks } = await import('../../utils/storyCallbacks');

      await handleUnifiedRequest(
        {
          type: 'custom',
          content: prompt,
        },
        createStoryCallbacks()
      );
    } catch (error) {
      console.error('❌ 员工管理异常:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 销毁组件
   */
  public destroy(): void {
    if (this.recruitModal) {
      this.recruitModal.destroy();
      this.recruitModal = null;
    }
    if (this.element) {
      $(this.element).off();
      $(this.element).remove();
      this.element = null;
    }
  }
}
