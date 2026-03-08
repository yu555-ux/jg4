import { BusinessStatus, Facility, GameTab, InnLaw } from '../types';
import { readGameData } from '../utils/variableReader';
import { updateStatDataVariable } from '../utils/variableUpdater';
import './Dashboard.scss';

// 全局函数声明（由酒馆助手提供）
declare function getWorldbook(worldbook_name: string): Promise<WorldbookEntry[]>;
declare function getVariables(option: { type: 'message'; message_id: number | 'latest' }): Record<string, any>;
declare function getLastMessageId(): number;
declare const toastr: {
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
};

type WorldbookEntry = {
  uid: number;
  name: string;
  enabled: boolean;
  strategy: {
    type: 'constant' | 'selective' | 'vectorized';
    keys: (string | RegExp)[];
    keys_secondary: { logic: 'and_any' | 'and_all' | 'not_all' | 'not_any'; keys: (string | RegExp)[] };
    scan_depth: 'same_as_global' | number;
  };
  position: {
    type:
      | 'before_character_definition'
      | 'after_character_definition'
      | 'before_example_messages'
      | 'after_example_messages'
      | 'before_author_note'
      | 'after_author_note'
      | 'at_depth';
    role: 'system' | 'assistant' | 'user';
    depth: number;
    order: number;
  };
  content: string;
  probability: number;
  recursion: {
    prevent_incoming: boolean;
    prevent_outgoing: boolean;
    delay_until: null | number;
  };
  effect: {
    sticky: null | number;
    cooldown: null | number;
    delay: null | number;
  };
  extra?: Record<string, any>;
};

export interface DashboardCallbacks {
  onTabChange: (tab: GameTab) => void;
  onStatusChange?: (status: BusinessStatus) => void;
  onLawChange?: (law: InnLaw) => void;
}

export class Dashboard {
  private element: HTMLElement | null = null;
  private callbacks: DashboardCallbacks;
  private businessStatus: BusinessStatus = '营业中';
  private occupancy: number = 85; // 0-100
  private facilities: Facility[] = [
    { id: '1', name: '客房', level: 3, maxLevel: 5 },
    { id: '2', name: '餐饮', level: 2, maxLevel: 5 },
    { id: '3', name: '调酒', level: 1, maxLevel: 5 },
    { id: '4', name: '温泉', level: 0, maxLevel: 5 },
  ];
  private innLaw: InnLaw = '中立';
  private currentLaw: { 法则名: string; 法则效果: string } | null = null;
  private lawList: Array<{ 法则名: string; 法则效果: string }> = [];
  private currentAccessMode: { 模式名称: string; 条件描述: string } | null = null;
  private accessModeList: Array<{ 模式名称: string; 条件描述: string }> = [];
  private popularity: number = 85; // 0-100
  private innName: string = '多次元便携旅店';
  private innAppearance: string =
    '炉火温暖地噼啪作响，邀请着来自各个维度的疲惫旅人。空气中弥漫着烤肉的香味和臭氧的气息。';
  private cognitiveEffect: string = '';
  private chronicleEntries: Array<{ number: number; text: string }> = [];

  constructor(callbacks: DashboardCallbacks, innName?: string) {
    this.callbacks = callbacks;
    if (innName) {
      this.innName = innName;
    } else {
      // 从变量表加载数据
      this.loadFromVariables();
    }
  }

  /**
   * 从变量表加载数据
   */
  public async loadFromVariables(): Promise<void> {
    const gameData = await readGameData();
    this.innName = gameData.innName;
    this.innAppearance = gameData.innAppearance;
    this.cognitiveEffect = gameData.cognitiveEffect;
    this.businessStatus = gameData.businessStatus as BusinessStatus;
    this.popularity = gameData.popularity;
    this.occupancy = gameData.occupancy;
    this.innLaw = gameData.innLaw as InnLaw;
    this.currentLaw = gameData.currentLaw;
    this.lawList = gameData.lawList;
    this.currentAccessMode = gameData.currentAccessMode;
    this.accessModeList = gameData.accessModeList;

    // 转换设施数据格式（保留当前等级描述）
    this.facilities = gameData.facilities.map((facility, index) => ({
      id: String(index + 1),
      name: facility.名称,
      level: facility.等级,
      maxLevel: 5,
      description: facility.当前等级描述 || '', // 添加描述字段
    }));

    console.log('🏗️ 加载设施数据:', {
      facilitiesCount: this.facilities.length,
      facilities: this.facilities,
      rawFacilities: gameData.facilities,
    });

    if (this.element) {
      this.render();
    }

    // 异步加载编年史
    this.loadChronicleFromWorldbook();
  }

  /**
   * 从世界书加载编年史
   */
  private async loadChronicleFromWorldbook(): Promise<void> {
    const WORLDBOOK_NAME = '0诸天便携旅店';
    const ENTRY_NAME = '编年史';

    try {
      const worldbook = await getWorldbook(WORLDBOOK_NAME);
      const chronicleEntry = worldbook.find((entry: WorldbookEntry) => entry.name === ENTRY_NAME);

      if (!chronicleEntry || !chronicleEntry.content) {
        console.log('📝 世界书中未找到编年史条目或内容为空');
        this.chronicleEntries = [];
        if (this.element) {
          this.render();
        }
        return;
      }

      // 解析编年史内容
      this.chronicleEntries = this.parseChronicleContent(chronicleEntry.content);

      // 按编号由大到小排序
      this.chronicleEntries.sort((a, b) => b.number - a.number);

      console.log('✅ 成功加载编年史，条目数:', this.chronicleEntries.length);

      if (this.element) {
        this.render();
      }
    } catch (error) {
      console.error('❌ 加载编年史失败:', error);
      this.chronicleEntries = [];
    }
  }

  /**
   * 解析编年史内容
   */
  private parseChronicleContent(content: string): Array<{ number: number; text: string }> {
    const entries: Array<{ number: number; text: string }> = [];
    const lines = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    for (const line of lines) {
      // 匹配格式：数字.文本
      const match = line.match(/^(\d+)\.(.+)$/);
      if (match) {
        const number = parseInt(match[1], 10);
        const text = match[2].trim();
        if (!isNaN(number) && text) {
          entries.push({ number, text });
        }
      }
    }

    return entries;
  }

  /**
   * 重新渲染
   */
  private render(): void {
    if (!this.element) return;
    this.element.innerHTML = this.getDashboardHTML();
    this.bindEvents();
  }

  /**
   * 创建仪表板HTML结构
   */
  public createElement(): HTMLElement {
    const dashboard = document.createElement('div');
    dashboard.className = 'mhjg-dashboard';
    dashboard.innerHTML = this.getDashboardHTML();
    this.element = dashboard;
    this.bindEvents();
    return dashboard;
  }

  /**
   * 获取仪表板HTML
   */
  private getDashboardHTML(): string {
    return `
      <div class="dashboard-content">
        <div class="dashboard-left">
          ${this.createStatusBanner()}
          ${this.createActionsGrid()}
        </div>
        <div class="dashboard-right">
          ${this.createQuickStats()}
          ${this.createActivityLog()}
        </div>
      </div>
    `;
  }

  /**
   * 创建状态横幅
   */
  private createStatusBanner(): string {
    const statusClass = this.getStatusClass(this.businessStatus);
    const popularityText = this.getPopularityText(this.popularity);

    return `
      <div class="status-banner">
        <div class="banner-overlay"></div>
        <img 
          src="https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=2544&auto=format&fit=crop" 
          alt="Status Banner" 
          class="banner-image"
        />
        <div class="banner-gradient"></div>
        <div class="banner-content">
          <div class="banner-badges">
            <div class="badge badge-status ${statusClass}" data-status-selector>
              ${this.businessStatus}
            </div>
            <div class="badge badge-warning">
              ${this.getStarIcon()}
              ${popularityText}
            </div>
          </div>
          <h2 class="banner-title" data-inn-name>${this.innName}</h2>
          <p class="banner-description">
            ${this.innAppearance}
          </p>
          ${this.cognitiveEffect ? `<p class="banner-cognitive-effect">${this.cognitiveEffect}</p>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * 获取状态样式类
   */
  private getStatusClass(status: BusinessStatus): string {
    switch (status) {
      case '营业中':
        return 'badge-success';
      case '休息中':
        return 'badge-warning';
      default:
        return 'badge-success';
    }
  }

  /**
   * 获取欢迎度文本
   */
  private getPopularityText(popularity: number): string {
    if (popularity >= 80) return '极受欢迎';
    if (popularity >= 60) return '受欢迎';
    if (popularity >= 40) return '一般';
    return '冷清';
  }

  /**
   * 创建操作网格
   */
  private createActionsGrid(): string {
    const actions = [
      {
        id: GameTab.GUESTS,
        title: '宾客登记',
        desc: '管理来访的旅人和他们的需求。',
        icon: 'users',
        stat: '12 位活跃',
        bgImage: 'https://picsum.photos/400/300?random=10',
      },
      {
        id: GameTab.STAFF,
        title: '员工',
        desc: '管理你的员工团队。',
        icon: 'users',
        stat: '3 位员工',
        bgImage: 'https://picsum.photos/400/300?random=11',
      },
      {
        id: GameTab.BUILD,
        title: '扩建',
        desc: '升级设施和附魔。',
        icon: 'hammer',
        stat: '新蓝图',
        bgImage: 'https://picsum.photos/400/300?random=12',
      },
      {
        id: GameTab.STORY,
        title: '魔典',
        desc: '咨询命运，编织故事。',
        icon: 'book',
        stat: '命运等待',
        bgImage: 'https://picsum.photos/400/300?random=13',
      },
    ];

    const actionsHTML = actions
      .map(
        action => `
      <div class="dashboard-card" data-tab="${action.id}">
        <div class="card-bg">
          <img src="${action.bgImage}" alt="" class="card-bg-image" />
          <div class="card-bg-overlay"></div>
        </div>
        <div class="card-content">
          <div class="card-header">
            <div class="card-icon card-icon-${action.icon}">
              ${this.getActionIcon(action.icon)}
            </div>
            <span class="card-stat">${action.stat}</span>
          </div>
          <div class="card-body">
            <h3 class="card-title">${action.title}</h3>
            <p class="card-desc">${action.desc}</p>
            <div class="card-action">
              <span>进入</span>
              <span class="card-arrow">→</span>
            </div>
          </div>
        </div>
      </div>
    `,
      )
      .join('');

    return `<div class="actions-grid">${actionsHTML}</div>`;
  }

  /**
   * 获取操作图标
   */
  private getActionIcon(iconName: string): string {
    const icons: Record<string, string> = {
      users:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      utensils:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z"/><path d="M21 15v7"/></svg>',
      hammer:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9"/><path d="M17.64 15 22 10.64"/><path d="m14.91 7.79 1.77-1.77a1.49 1.49 0 0 0 0-2.12l-3.54-3.54a1.49 1.49 0 0 0-2.12 0L9.12 4.23"/><path d="m8.53 12.91 5.38 5.38"/></svg>',
      book: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>',
    };
    return icons[iconName] || '';
  }

  /**
   * 创建快速统计
   */
  private createQuickStats(): string {
    const facilitiesHTML = this.facilities.map(facility => this.createFacilityRow(facility)).join('');

    return `
      <div class="quick-stats rpg-panel">
        <h3 class="stats-title">旅店状态</h3>
        <div class="facilities-section">
          <h4 class="facilities-title">设施/区域</h4>
          <div class="facilities-list">
            ${facilitiesHTML}
          </div>
        </div>
        <div class="inn-law-section">
          <h4 class="inn-law-title">旅馆法则</h4>
          <div class="inn-law-selector" data-law-selector>
            <div class="inn-law-info">
              <span class="inn-law-current">${this.currentLaw?.法则名 || this.innLaw}</span>
              ${this.currentLaw?.法则效果 ? `<span class="inn-law-desc">${this.currentLaw.法则效果}</span>` : ''}
            </div>
            ${this.getLawIcon()}
          </div>
          <button class="add-rule-btn" data-add-law-btn>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>增加规则</span>
          </button>
        </div>
        <div class="inn-law-section">
          <h4 class="inn-law-title">准入条件</h4>
          <div class="inn-law-selector" data-access-mode-selector>
            <div class="inn-law-info">
              <span class="inn-law-current">${this.currentAccessMode?.模式名称 || '实体显现'}</span>
              ${this.currentAccessMode?.条件描述 ? `<span class="inn-law-desc">${this.currentAccessMode.条件描述}</span>` : ''}
            </div>
            ${this.getAccessModeIcon()}
          </div>
          <button class="add-rule-btn" data-add-access-mode-btn>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>增加规则</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 创建设施行
   */
  private createFacilityRow(facility: Facility & { description?: string }): string {
    const levelBars = Array.from({ length: facility.maxLevel }, (_, i) =>
      i < facility.level ? 'level-bar-filled' : 'level-bar-empty',
    ).join('');

    return `
      <div class="facility-row">
        <div class="facility-header">
          <span class="facility-name">${facility.name}</span>
          <div class="facility-level">
            <div class="level-bars">
              ${Array.from(
                { length: facility.maxLevel },
                (_, i) =>
                  `<div class="level-bar ${i < facility.level ? 'level-bar-filled' : 'level-bar-empty'}"></div>`,
              ).join('')}
            </div>
            <span class="level-text">Lv.${facility.level}</span>
          </div>
        </div>
        ${facility.description ? `<div class="facility-description">${facility.description}</div>` : ''}
      </div>
    `;
  }

  /**
   * 获取法则图标
   */
  private getLawIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
  }

  /**
   * 获取准入条件图标
   */
  private getAccessModeIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
  }

  /**
   * 创建统计行
   */
  private createStatRow(label: string, value: string, color: string): string {
    const colorClass = `text-${color}-400`;
    return `
      <div class="stat-row">
        <span class="stat-label">${label}</span>
        <span class="stat-value ${colorClass}">${value}</span>
      </div>
    `;
  }

  /**
   * 创建活动日志
   */
  private createActivityLog(): string {
    // 如果没有编年史条目，显示空状态
    if (this.chronicleEntries.length === 0) {
      return `
        <div class="activity-log rpg-panel">
          <div class="log-header">
            <span class="log-title">编年史</span>
            ${this.getClockIcon()}
          </div>
          <div class="log-list">
            <div class="log-item">
              <div class="log-timeline">
                <div class="log-dot log-dot-info"></div>
              </div>
              <div class="log-content">
                <div class="log-text" style="color: rgba(255, 255, 255, 0.5);">暂无编年史记录</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // 按编号由大到小排序（确保最新在上）
    const sortedEntries = [...this.chronicleEntries].sort((a, b) => b.number - a.number);

    const logsHTML = sortedEntries
      .map(
        entry => `
      <div class="log-item">
        <div class="log-timeline">
          <div class="log-dot log-dot-info"></div>
        </div>
        <div class="log-content">
          <div class="log-time">#${entry.number}</div>
          <div class="log-text">${entry.text}</div>
        </div>
      </div>
    `,
      )
      .join('');

    return `
      <div class="activity-log rpg-panel">
        <div class="log-header">
          <span class="log-title">编年史</span>
          ${this.getClockIcon()}
        </div>
        <div class="log-list">
          ${logsHTML}
        </div>
      </div>
    `;
  }

  /**
   * 获取时钟图标
   */
  private getClockIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  }

  /**
   * 获取星星图标
   */
  private getStarIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (!this.element) return;

    // 先移除所有旧的事件监听器，防止重复绑定
    $(this.element).off('click', '.dashboard-card');
    $(this.element).off('click', '[data-status-selector]');
    $(this.element).off('click', '[data-law-selector]');
    $(this.element).off('click', '[data-access-mode-selector]');

    $(this.element).on('click', '.dashboard-card', e => {
      const card = e.currentTarget as HTMLElement;
      const tab = card.getAttribute('data-tab') as GameTab;
      if (tab) {
        this.callbacks.onTabChange(tab);
      }
    });

    // 营业状态切换
    $(this.element).on('click', '[data-status-selector]', e => {
      e.stopPropagation();
      this.showStatusSelector();
    });

    // 旅馆法则切换
    $(this.element).on('click', '[data-law-selector]', e => {
      e.stopPropagation();
      this.showLawSelector();
    });

    // 准入条件切换
    $(this.element).on('click', '[data-access-mode-selector]', e => {
      e.stopPropagation();
      this.showAccessModeSelector();
    });

    // 增加法则规则
    $(this.element).on('click', '[data-add-law-btn]', e => {
      e.stopPropagation();
      this.showAddLawDialog();
    });

    // 增加准入条件规则
    $(this.element).on('click', '[data-add-access-mode-btn]', e => {
      e.stopPropagation();
      this.showAddAccessModeDialog();
    });
  }

  /**
   * 显示状态选择器
   */
  private showStatusSelector(): void {
    const statuses: BusinessStatus[] = ['营业中', '休息中'];
    const options = statuses
      .map(
        status =>
          `<div class="status-option ${status === this.businessStatus ? 'active' : ''}" data-status="${status}">${status}</div>`,
      )
      .join('');

    const selector = $(`
      <div class="status-selector-overlay">
        <div class="status-selector">
          <div class="selector-header">
          <h4>选择营业状态</h4>
            <button class="selector-close-btn" data-close-selector aria-label="关闭">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="status-options">${options}</div>
        </div>
      </div>
    `);

    selector.on('click', '.status-option', async e => {
      const status = $(e.currentTarget).attr('data-status') as BusinessStatus;
      if (status && status !== this.businessStatus) {
        // 更新 stat_data 中的营业状态
        try {
          await updateStatDataVariable('旅店.营业状态', status);
          console.log('✅ 成功更新营业状态:', status);
        } catch (error) {
          console.error('❌ 更新营业状态失败:', error);
        }

        this.businessStatus = status;
        if (this.callbacks.onStatusChange) {
          this.callbacks.onStatusChange(status);
        }
        this.render();
      }
      selector.remove();
    });

    selector.on('click', '.status-selector-overlay', e => {
      if (e.target === selector[0]) {
        selector.remove();
      }
    });

    selector.on('click', '[data-close-selector]', () => {
      selector.remove();
    });

    $('body').append(selector);
  }

  /**
   * 显示法则选择器
   */
  private async showLawSelector(): Promise<void> {
    // 如果选择器已经存在，先移除它
    $('.law-selector-overlay').remove();

    // 从变量表重新加载法则列表和当前法则（确保获取最新数据）
    const gameData = await readGameData();
    this.lawList = gameData.lawList;
    this.currentLaw = gameData.currentLaw;
    this.innLaw = gameData.innLaw as InnLaw;

    console.log('📋 加载法则数据:', {
      lawList: this.lawList,
      currentLaw: this.currentLaw,
      innLaw: this.innLaw,
    });

    // 如果法则列表为空，使用默认法则
    if (this.lawList.length === 0) {
      console.warn('⚠️ 法则列表为空，使用默认法则');
      this.lawList = [{ 法则名: '中立', 法则效果: '平衡的魔法环境' }];
    }

    // 使用当前法则的名称来判断哪个选项应该高亮
    const currentLawName = this.currentLaw?.法则名 || this.innLaw;

    const options = this.lawList
      .map(
        law =>
          `<div class="law-option ${law.法则名 === currentLawName ? 'active' : ''}" data-law="${law.法则名}">
        <span class="law-name">${law.法则名}</span>
        <span class="law-desc">${law.法则效果}</span>
      </div>`,
      )
      .join('');

    const selector = $(`
      <div class="law-selector-overlay">
        <div class="law-selector">
          <div class="selector-header">
          <h4>选择旅馆法则</h4>
            <button class="selector-close-btn" data-close-selector aria-label="关闭">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="law-options">${options}</div>
        </div>
      </div>
    `);

    // 使用 one() 确保事件只触发一次，或者使用命名空间
    selector.on('click.law-selector', '.law-option', async e => {
      e.stopPropagation();
      const lawName = $(e.currentTarget).attr('data-law') as InnLaw;
      if (lawName) {
        // 从法则列表中找到对应的法则对象
        const selectedLaw = this.lawList.find(law => law.法则名 === lawName);
        if (selectedLaw && (selectedLaw.法则名 !== this.innLaw || !this.currentLaw)) {
          // 更新 stat_data 中的当前法则
          try {
            await updateStatDataVariable('旅店.旅馆法则.当前法则', selectedLaw);
            console.log('✅ 成功更新当前法则:', selectedLaw);
          } catch (error) {
            console.error('❌ 更新当前法则失败:', error);
          }

          this.innLaw = lawName as InnLaw;
          this.currentLaw = selectedLaw;
          if (this.callbacks.onLawChange) {
            this.callbacks.onLawChange(lawName);
          }
          selector.remove();
          this.render();
        }
      }
    });

    selector.on('click.law-selector', '.law-selector-overlay', e => {
      if (e.target === selector[0]) {
        selector.remove();
      }
    });

    selector.on('click.law-selector', '[data-close-selector]', e => {
      e.stopPropagation();
      selector.remove();
    });

    $('body').append(selector);
  }

  /**
   * 显示准入条件选择器
   */
  private async showAccessModeSelector(): Promise<void> {
    // 如果选择器已经存在，先移除它
    $('.law-selector-overlay').remove();

    // 从变量表重新加载准入条件列表和当前准入条件（确保获取最新数据）
    const gameData = await readGameData();
    this.accessModeList = gameData.accessModeList;
    this.currentAccessMode = gameData.currentAccessMode;

    console.log('📋 加载准入条件数据:', {
      accessModeList: this.accessModeList,
      currentAccessMode: this.currentAccessMode,
    });

    // 如果准入条件列表为空，使用默认准入条件
    if (this.accessModeList.length === 0) {
      console.warn('⚠️ 准入条件列表为空，使用默认准入条件');
      this.accessModeList = [
        {
          模式名称: '实体显现',
          条件描述:
            '无条件开放。旅店作为实体建筑存在于当地（如闹市区），任何路过的生物都能看到招牌、大门并推门而入。适合广纳客源。',
        },
      ];
    }

    // 使用当前准入条件的模式名称来判断哪个选项应该高亮
    const currentModeName = this.currentAccessMode?.模式名称 || '实体显现';

    const options = this.accessModeList
      .map(
        mode =>
          `<div class="law-option ${mode.模式名称 === currentModeName ? 'active' : ''}" data-access-mode="${mode.模式名称}">
        <span class="law-name">${mode.模式名称}</span>
        <span class="law-desc">${mode.条件描述}</span>
      </div>`,
      )
      .join('');

    const selector = $(`
      <div class="law-selector-overlay">
        <div class="law-selector">
          <div class="selector-header">
            <h4>选择准入条件</h4>
            <button class="selector-close-btn" data-close-selector aria-label="关闭">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="law-options">${options}</div>
        </div>
      </div>
    `);

    // 使用命名空间确保事件只绑定一次
    selector.on('click.access-mode-selector', '.law-option', async e => {
      e.stopPropagation();
      const modeName = $(e.currentTarget).attr('data-access-mode');
      if (modeName) {
        // 从准入条件列表中找到对应的准入条件对象
        const selectedMode = this.accessModeList.find(mode => mode.模式名称 === modeName);
        if (selectedMode && selectedMode.模式名称 !== this.currentAccessMode?.模式名称) {
          // 更新 stat_data 中的当前准入条件
          try {
            await updateStatDataVariable('旅店.准入条件.当前准入条件', selectedMode);
            console.log('✅ 成功更新当前准入条件:', selectedMode);
          } catch (error) {
            console.error('❌ 更新当前准入条件失败:', error);
          }

          this.currentAccessMode = selectedMode;
          selector.remove();
          this.render();
        }
      }
    });

    selector.on('click.access-mode-selector', '.law-selector-overlay', e => {
      if (e.target === selector[0]) {
        selector.remove();
      }
    });

    selector.on('click.access-mode-selector', '[data-close-selector]', e => {
      e.stopPropagation();
      selector.remove();
    });

    $('body').append(selector);
  }

  /**
   * 显示增加法则规则对话框
   */
  private async showAddLawDialog(): Promise<void> {
    // 如果对话框已经存在，先移除它
    $('.add-rule-dialog-overlay').remove();

    const dialog = $(`
      <div class="add-rule-dialog-overlay">
        <div class="add-rule-dialog">
          <div class="dialog-header">
            <h4>增加旅馆法则</h4>
            <button class="dialog-close-btn" data-close-dialog aria-label="关闭">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="dialog-content">
            <div class="form-group">
              <label for="law-name-input">法则名称</label>
              <input type="text" id="law-name-input" class="form-input" placeholder="例如：禁魔、高魔" />
            </div>
            <div class="form-group">
              <label for="law-effect-input">法则效果</label>
              <textarea id="law-effect-input" class="form-textarea" rows="3" placeholder="描述这个法则的效果..."></textarea>
            </div>
          </div>
          <div class="dialog-actions">
            <button class="dialog-btn cancel-btn" data-cancel-dialog>取消</button>
            <button class="dialog-btn save-btn" data-save-law>保存</button>
          </div>
        </div>
      </div>
    `);

    // 绑定保存事件
    dialog.on('click', '[data-save-law]', async () => {
      const lawName = (dialog.find('#law-name-input').val() as string)?.trim();
      const lawEffect = (dialog.find('#law-effect-input').val() as string)?.trim();

      if (!lawName) {
        toastr.warning('请输入法则名称', '提示');
        return;
      }

      if (!lawEffect) {
        toastr.warning('请输入法则效果', '提示');
        return;
      }

      try {
        // 读取当前的法则列表（优先从最新楼层读取，如果没有则从0层读取）
        const latestMessageId = getLastMessageId();
        const targetMessageId = latestMessageId >= 0 ? latestMessageId : 0;
        const variables = getVariables({ type: 'message', message_id: targetMessageId });
        const statData = variables?.stat_data || {};
        const lawsListRaw = statData.旅店?.旅馆法则?.法则列表 || {};

        // 处理 MVU 格式 [值, "描述"]
        let lawsList: Record<string, { 法则效果: string }> = {};
        if (Array.isArray(lawsListRaw) && lawsListRaw.length > 0) {
          lawsList = lawsListRaw[0] || {};
        } else if (typeof lawsListRaw === 'object' && lawsListRaw !== null) {
          lawsList = lawsListRaw;
        }

        // 添加新法则
        lawsList[lawName] = { 法则效果: lawEffect };

        // 更新变量表
        await updateStatDataVariable('旅店.旅馆法则.法则列表', lawsList);
        console.log('✅ 成功添加新法则:', { 法则名: lawName, 法则效果: lawEffect });

        // 重新加载数据并刷新界面
        await this.loadFromVariables();
        dialog.remove();
        toastr.success('法则已成功添加！', '成功');
      } catch (error) {
        console.error('❌ 添加法则失败:', error);
        toastr.error('添加法则失败，请重试', '错误');
      }
    });

    // 绑定取消和关闭事件
    dialog.on('click', '[data-cancel-dialog], [data-close-dialog], .add-rule-dialog-overlay', e => {
      if (e.target === dialog[0] || $(e.target).closest('[data-cancel-dialog], [data-close-dialog]').length) {
        dialog.remove();
      }
    });

    // 点击对话框内容时不关闭
    dialog.on('click', '.add-rule-dialog', e => {
      e.stopPropagation();
    });

    $('body').append(dialog);
    // 聚焦到第一个输入框
    setTimeout(() => {
      dialog.find('#law-name-input').focus();
    }, 100);
  }

  /**
   * 显示增加准入条件规则对话框
   */
  private async showAddAccessModeDialog(): Promise<void> {
    // 如果对话框已经存在，先移除它
    $('.add-rule-dialog-overlay').remove();

    const dialog = $(`
      <div class="add-rule-dialog-overlay">
        <div class="add-rule-dialog">
          <div class="dialog-header">
            <h4>增加准入条件</h4>
            <button class="dialog-close-btn" data-close-dialog aria-label="关闭">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="dialog-content">
            <div class="form-group">
              <label for="access-mode-name-input">模式名称</label>
              <input type="text" id="access-mode-name-input" class="form-input" placeholder="例如：实体显现、绝境救赎" />
            </div>
            <div class="form-group">
              <label for="access-mode-desc-input">条件描述</label>
              <textarea id="access-mode-desc-input" class="form-textarea" rows="3" placeholder="描述这个准入条件的详细说明..."></textarea>
            </div>
          </div>
          <div class="dialog-actions">
            <button class="dialog-btn cancel-btn" data-cancel-dialog>取消</button>
            <button class="dialog-btn save-btn" data-save-access-mode>保存</button>
          </div>
        </div>
      </div>
    `);

    // 绑定保存事件
    dialog.on('click', '[data-save-access-mode]', async () => {
      const modeName = (dialog.find('#access-mode-name-input').val() as string)?.trim();
      const modeDesc = (dialog.find('#access-mode-desc-input').val() as string)?.trim();

      if (!modeName) {
        toastr.warning('请输入模式名称', '提示');
        return;
      }

      if (!modeDesc) {
        toastr.warning('请输入条件描述', '提示');
        return;
      }

      try {
        // 读取当前的准入条件列表（优先从最新楼层读取，如果没有则从0层读取）
        const latestMessageId = getLastMessageId();
        const targetMessageId = latestMessageId >= 0 ? latestMessageId : 0;
        const variables = getVariables({ type: 'message', message_id: targetMessageId });
        const statData = variables?.stat_data || {};
        const accessModeListRaw = statData.旅店?.准入条件?.准入条件列表 || {};

        // 处理 MVU 格式 [值, "描述"]
        let accessModeList: Record<string, { 条件描述: string }> = {};
        if (Array.isArray(accessModeListRaw) && accessModeListRaw.length > 0) {
          accessModeList = accessModeListRaw[0] || {};
        } else if (typeof accessModeListRaw === 'object' && accessModeListRaw !== null) {
          accessModeList = accessModeListRaw;
        }

        // 添加新准入条件
        accessModeList[modeName] = { 条件描述: modeDesc };

        // 更新变量表
        await updateStatDataVariable('旅店.准入条件.准入条件列表', accessModeList);
        console.log('✅ 成功添加新准入条件:', { 模式名称: modeName, 条件描述: modeDesc });

        // 重新加载数据并刷新界面
        await this.loadFromVariables();
        dialog.remove();
        toastr.success('准入条件已成功添加！', '成功');
      } catch (error) {
        console.error('❌ 添加准入条件失败:', error);
        toastr.error('添加准入条件失败，请重试', '错误');
      }
    });

    // 绑定取消和关闭事件
    dialog.on('click', '[data-cancel-dialog], [data-close-dialog], .add-rule-dialog-overlay', e => {
      if (e.target === dialog[0] || $(e.target).closest('[data-cancel-dialog], [data-close-dialog]').length) {
        dialog.remove();
      }
    });

    // 点击对话框内容时不关闭
    dialog.on('click', '.add-rule-dialog', e => {
      e.stopPropagation();
    });

    $('body').append(dialog);
    // 聚焦到第一个输入框
    setTimeout(() => {
      dialog.find('#access-mode-name-input').focus();
    }, 100);
  }

  /**
   * 更新旅店名字
   */
  public updateInnName(innName: string): void {
    this.innName = innName;
    if (this.element) {
      const innNameElement = $(this.element).find('[data-inn-name]');
      if (innNameElement.length) {
        innNameElement.text(innName);
      }
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
