import { Guest } from '../../types';
import { readGameData } from '../../utils/variableReader';
import './GuestsModal.scss';

export interface GuestsModalCallbacks {
  onClose: () => void;
}

// 客人互动选项配置
interface GuestInteractionOption {
  label: string;
  prompt_template: string;
}

const GUEST_INTERACTION_OPTIONS: GuestInteractionOption[] = [
  {
    label: '鼓励消费',
    prompt_template: '你决定鼓励${guest_name}进行进一步的消费。',
  },
  {
    label: '赠送礼物',
    prompt_template: '你决定对${guest_name}赠送小礼物以示友好。',
  },
  {
    label: '招募员工',
    prompt_template: '你决定试图说服${guest_name}成为员工。',
  },
  {
    label: '打听情报',
    prompt_template: '你决定向${guest_name}打听关于这个世界的情报和传闻。',
  },
  {
    label: '特殊交易',
    prompt_template: '你决定询问${guest_name}是否愿意用身上的物品或能力来抵扣费用。',
  },
  {
    label: '倾听安抚',
    prompt_template: '你决定倾听${guest_name}的烦恼并尝试安抚对方的情绪。',
  },
  {
    label: '警告规劝',
    prompt_template: '你决定严肃警告${guest_name}遵守旅店的规矩。',
  },
  {
    label: '强制驱逐',
    prompt_template: '你决定动用法则权限将${guest_name}强制驱逐出店。',
  },
];

export class GuestsModal {
  private element: HTMLElement | null = null;
  private guests: Guest[] = [];
  private callbacks: GuestsModalCallbacks;
  private isOpen: boolean = false;
  private currentInteractingGuest: Guest | null = null;
  private isProcessing: boolean = false; // 防止重复点击

  constructor(guests: Guest[] | null, callbacks: GuestsModalCallbacks) {
    if (guests) {
      this.guests = guests;
    } else {
      // 从变量表加载数据
      this.loadFromVariables();
    }
    this.callbacks = callbacks;
  }

  /**
   * 从变量表加载客人数据
   */
  public async loadFromVariables(): Promise<void> {
    const gameData = await readGameData();
    console.log('📋 GuestsModal 加载数据:', {
      guestsCount: gameData.guests.length,
      guests: gameData.guests,
    });
    // 转换客人数据格式
    this.guests = gameData.guests.map((guest, index) => {
      // 处理 MVU 格式：如果 guest 是 [值, "描述"] 格式，取第一个元素
      let guestValue = guest;
      if (Array.isArray(guest) && guest.length > 0) {
        guestValue = guest[0];
      }
      return {
        id: String(index + 1),
        name: guestValue?.名称 || '',
        race: guestValue?.种族 || '',
        class: guestValue?.职业名 || '',
        level: guestValue?.职业等级 || 1,
        appearance: guestValue?.外貌描述 || '',
        mood: guestValue?.心情值 || 0,
        gold: guestValue?.消费金额 || 0,
        request: guestValue?.当前想法 || '',
        avatarUrl: `https://picsum.photos/100?random=${index + 1}`,
      };
    });
    console.log('✅ GuestsModal 转换后的客人:', this.guests);
    if (this.isOpen && this.element) {
      this.render();
    }
  }

  /**
   * 重新渲染
   */
  private render(): void {
    if (!this.element) return;
    this.element.innerHTML = this.getModalHTML();
    this.bindEvents();
    $(this.element).addClass('open');
    $('body').addClass('modal-open');
  }

  /**
   * 创建模态框HTML结构
   */
  public createElement(): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'mhjg-modal mhjg-modal-guests';
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
              ${this.getUsersIcon()}
            </div>
            <div class="modal-title-group">
              <h2 class="modal-title">宾客登记</h2>
              <p class="modal-subtitle">今晚有 ${this.guests.length} 位寻求庇护的旅人</p>
            </div>
          </div>
          <button class="modal-close" aria-label="关闭">
            ${this.getCloseIcon()}
          </button>
        </div>
        <div class="modal-content">
          <div class="guests-grid">
            ${this.guests.map(guest => this.createGuestCard(guest)).join('')}
            <div class="guest-placeholder">
              <span class="placeholder-icon">+</span>
              <span class="placeholder-text">等待宾客</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 创建宾客卡片
   */
  private createGuestCard(guest: Guest): string {
    const moodColor = this.getMoodColor(guest.mood);
    const moodText = this.getMoodText(guest.mood);
    
    return `
      <div class="guest-card rpg-panel" data-guest-id="${guest.id}">
        <div class="guest-header">
          <div class="guest-avatar-wrapper">
            <img 
              src="${guest.avatarUrl}" 
              alt="${guest.name}" 
              class="guest-avatar"
            />
            <div class="guest-level-badge">Lv.${guest.level || 1}</div>
            <div class="guest-mood-badge" style="background: ${moodColor}">
              ${guest.mood || 0}
            </div>
          </div>
          <div class="guest-info">
            <h3 class="guest-name">${guest.name}</h3>
            <div class="guest-tags">
              <span class="guest-tag guest-tag-race">${guest.race}</span>
              <span class="guest-tag guest-tag-class">${guest.class}</span>
            </div>
            <div class="guest-stats">
              <div class="guest-stat-item">
                <span class="stat-label">心情</span>
                <div class="stat-bar">
                  <div class="stat-bar-fill" style="width: ${guest.mood || 0}%; background: ${moodColor}"></div>
                </div>
                <span class="stat-text">${moodText}</span>
              </div>
              <div class="guest-stat-item">
                <span class="stat-label">消费</span>
                <span class="stat-value stat-gold">${guest.gold || 0} 金币</span>
              </div>
            </div>
          </div>
        </div>
        ${guest.appearance ? `
        <div class="guest-appearance">
          <div class="appearance-label">
            ${this.getEyeIcon()}
            <span>外貌</span>
          </div>
          <p class="appearance-text">${guest.appearance}</p>
        </div>
        ` : ''}
        <div class="guest-request">
          <div class="request-quote">"</div>
          <p class="request-text">${guest.request || '哼...'}</p>
        </div>
        <div class="guest-actions">
          <button class="guest-btn guest-btn-interact">
            ${this.getMessageIcon()}
            互动
          </button>
          <button class="guest-btn guest-btn-more">
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
   * 获取眼睛图标
   */
  private getEyeIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  }

  /**
   * 获取图标
   */
  private getUsersIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
  }

  private getCloseIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  }

  private getMessageIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  }

  private getMoreIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>';
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

    $(this.element).on('click', '.guest-btn-interact', e => {
      e.stopPropagation();
      const card = $(e.currentTarget).closest('.guest-card');
      const guestId = card.attr('data-guest-id');
      const guest = this.guests.find(g => g.id === guestId);
      if (guest) {
        this.showInteractionMenu(guest);
      }
    });

    // 点击互动选项
    $(this.element).on('click', '.interaction-option', e => {
      e.stopPropagation();
      const optionIndex = parseInt($(e.currentTarget).attr('data-option-index') || '0', 10);
      const option = GUEST_INTERACTION_OPTIONS[optionIndex];
      if (option && this.currentInteractingGuest) {
        this.handleInteraction(option, this.currentInteractingGuest);
      }
    });

    // 点击关闭互动菜单
    $(this.element).on('click', '.interaction-menu-backdrop', () => {
      this.hideInteractionMenu();
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
    }
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
   * 检查模态框是否打开
   */
  public getIsOpen(): boolean {
    return this.isOpen;
  }

  /**
   * 更新宾客列表
   */
  public updateGuests(guests: Guest[]): void {
    this.guests = guests;
    if (this.isOpen && this.element) {
      this.element.innerHTML = this.getModalHTML();
    }
  }

  /**
   * 显示互动菜单
   */
  private showInteractionMenu(guest: Guest): void {
    this.currentInteractingGuest = guest;
    if (!this.element) return;

    const menuHTML = `
      <div class="interaction-menu-backdrop"></div>
      <div class="interaction-menu">
        <div class="interaction-menu-header">
          <h3>与 ${guest.name} 互动</h3>
          <button class="interaction-menu-close">×</button>
        </div>
        <div class="interaction-menu-content">
          ${GUEST_INTERACTION_OPTIONS.map(
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

    // 绑定关闭按钮
    $(this.element).on('click', '.interaction-menu-close', () => {
      this.hideInteractionMenu();
    });
  }

  /**
   * 隐藏互动菜单
   */
  private hideInteractionMenu(): void {
    if (!this.element) return;
    $(this.element).find('.interaction-menu-backdrop, .interaction-menu').remove();
    this.currentInteractingGuest = null;
  }

  /**
   * 处理互动
   */
  private async handleInteraction(option: GuestInteractionOption, guest: Guest): Promise<void> {
    if (this.isProcessing) {
      console.warn('⚠️ 正在处理中，忽略重复点击');
      return;
    }

    this.isProcessing = true;
    // 构建提示词，替换 ${guest_name} 占位符
    const prompt = option.prompt_template.replace('${guest_name}', guest.name);

    // 隐藏互动菜单
    this.hideInteractionMenu();

    try {
      const { handleUnifiedRequest } = await import('../../utils/unifiedRequestHandler');
      const { createStoryCallbacks } = await import('../../utils/storyCallbacks');

      await handleUnifiedRequest(
        {
          type: 'guest-interact',
          content: prompt,
        },
        createStoryCallbacks()
      );
    } catch (error) {
      console.error('❌ 客人互动异常:', error);
    } finally {
      this.isProcessing = false;
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
