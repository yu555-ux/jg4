import { readGameData } from '../../utils/variableReader';
import './BuildModal.scss';
import { NewFacilityModal, NewFacilityRequest } from './NewFacilityModal';

export interface BuildModalCallbacks {
  onClose: () => void;
}

interface Facility {
  名称: string;
  等级: number;
  当前等级描述: string;
}

export class BuildModal {
  private element: HTMLElement | null = null;
  private callbacks: BuildModalCallbacks;
  private isOpen: boolean = false;
  private facilities: Facility[] = [];
  private newFacilityModal: NewFacilityModal | null = null;
  private isProcessing: boolean = false; // 防止重复点击

  constructor(callbacks: BuildModalCallbacks) {
    this.callbacks = callbacks;
    // 从变量表加载数据
    this.loadFromVariables();
  }

  /**
   * 从变量表加载设施数据
   */
  public async loadFromVariables(): Promise<void> {
    const gameData = await readGameData();
    this.facilities = gameData.facilities;
    if (this.isOpen && this.element) {
      this.render();
    }
  }

  /**
   * 创建模态框HTML结构
   */
  public createElement(): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'mhjg-modal mhjg-modal-build';
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
              ${this.getHammerIcon()}
            </div>
            <div class="modal-title-group">
              <h2 class="modal-title">升级/扩建</h2>
              <p class="modal-subtitle">投入金币和建材来升级你的设施</p>
            </div>
          </div>
          <button class="modal-close" aria-label="关闭">
            <span class="close-text">关闭蓝图</span>
            ${this.getCloseIcon()}
          </button>
        </div>
        <div class="modal-content">
          <div class="facilities-grid">
            ${this.facilities.map((facility, index) => this.createFacilityCard(facility, index)).join('')}
            <div class="facility-placeholder" data-action="new-facility">
              <span class="placeholder-icon">+</span>
              <span class="placeholder-text">新建</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 创建设施卡片
   */
  private createFacilityCard(facility: Facility, index: number): string {
    const maxLevel = 5;
    const canUpgrade = facility.等级 < maxLevel;

    return `
      <div class="facility-card rpg-panel" data-facility-index="${index}">
        <div class="facility-header">
          <h3 class="facility-name">${facility.名称}</h3>
          <div class="facility-level">
            <div class="level-bars">
              ${Array.from(
                { length: maxLevel },
                (_, i) => `<div class="level-bar ${i < facility.等级 ? 'level-bar-filled' : 'level-bar-empty'}"></div>`,
              ).join('')}
            </div>
            <span class="level-text">Lv.${facility.等级}</span>
          </div>
        </div>
        <div class="facility-description">
          <p>${facility.当前等级描述}</p>
        </div>
        <button class="facility-upgrade-btn rpg-btn rpg-btn-primary" ${!canUpgrade ? 'disabled' : ''} data-action="upgrade">
          ${this.getArrowUpIcon()}
          ${canUpgrade ? '升级' : '已达最高等级'}
        </button>
      </div>
    `;
  }

  /**
   * 获取图标
   */
  private getHammerIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9"/><path d="M17.64 15 22 10.64"/><path d="m14.91 7.79 1.77-1.77a1.49 1.49 0 0 0 0-2.12l-3.54-3.54a1.49 1.49 0 0 0-2.12 0L9.12 4.23"/><path d="m8.53 12.91 5.38 5.38"/></svg>';
  }

  private getCloseIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  }

  private getArrowUpIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16 12-4-4-4 4"/><path d="M12 16V8"/></svg>';
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

    // 升级按钮
    $(this.element).on('click', '[data-action="upgrade"]', e => {
      e.stopPropagation();
      if (this.isProcessing) {
        console.warn('⚠️ 正在处理中，忽略重复点击');
        return;
      }
      const card = $(e.currentTarget).closest('.facility-card');
      const index = parseInt(card.attr('data-facility-index') || '0', 10);
      this.handleUpgrade(index);
    });

    // 新建按钮
    $(this.element).on('click', '[data-action="new-facility"]', () => {
      this.showNewFacilityModal();
    });
  }

  /**
   * 处理升级
   */
  private async handleUpgrade(index: number): Promise<void> {
    // 防止重复点击
    if (this.isProcessing) {
      console.warn('⚠️ 正在处理升级请求，忽略重复点击');
      return;
    }

    const facility = this.facilities[index];
    if (!facility) return;

    if (facility.等级 >= 5) {
      alert('该设施已达到最高等级');
      return;
    }

    // 设置处理状态
    this.isProcessing = true;

    try {
      // 读取当前资源（这里简化处理，实际应该从变量表读取）
      const { readGameData } = await import('../../utils/variableReader');
      const gameData = await readGameData();
      
      // 简化的升级费用计算（实际应该从配置读取）
      const upgradeCost = {
        gold: (facility.等级 + 1) * 100,
        materials: (facility.等级 + 1) * 50,
      };

      // 关闭升级界面
      this.close(false);

      const { handleUnifiedRequest } = await import('../../utils/unifiedRequestHandler');
      const { createStoryCallbacks } = await import('../../utils/storyCallbacks');

      await handleUnifiedRequest(
        {
          type: 'upgrade',
          content: {
            facilityName: facility.名称,
            facilityLevel: facility.等级,
            cost: upgradeCost,
            description: `将${facility.名称}从${facility.等级}级升级到${facility.等级 + 1}级`,
          },
        },
        createStoryCallbacks()
      );
    } catch (error) {
      console.error('❌ 升级请求失败:', error);
    } finally {
      // 重置处理状态
      this.isProcessing = false;
    }
  }

  /**
   * 显示新建设施模态框
   */
  private showNewFacilityModal(): void {
    if (!this.newFacilityModal) {
      this.newFacilityModal = new NewFacilityModal({
        onConfirm: (request: NewFacilityRequest) => {
          this.handleNewFacility(request);
        },
        onCancel: () => {
          // 关闭时不做任何操作
        },
      });
      document.body.appendChild(this.newFacilityModal.createElement());
    }
    this.newFacilityModal.show();
  }

  /**
   * 处理新建设施请求
   */
  private handleNewFacility(request: NewFacilityRequest): void {
    console.log('🏗️ 新建设施请求:', request);
    // TODO: 实现新建设施逻辑，更新变量表
    alert(`新建设施：${request.name}\n初始等级：${request.initialLevel}\n描述：${request.description}\n（功能待实现）`);
    // 刷新设施列表
    this.loadFromVariables();
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
   * 重新渲染
   */
  private render(): void {
    if (!this.element) return;
    this.element.innerHTML = this.getModalHTML();
    this.bindEvents();
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
   * 销毁组件
   */
  public destroy(): void {
    if (this.newFacilityModal) {
      this.newFacilityModal.destroy();
      this.newFacilityModal = null;
    }
    if (this.element) {
      $(this.element).off();
      $(this.element).remove();
      this.element = null;
    }
  }
}
