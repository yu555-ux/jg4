import { ConfirmDialog } from './components/ConfirmDialog';
import { Dashboard, DashboardCallbacks } from './components/Dashboard';
import './components/Dashboard.scss';
import { BuildModal, BuildModalCallbacks } from './components/modals/BuildModal';
import './components/modals/BuildModal.scss';
import { GuestsModal, GuestsModalCallbacks } from './components/modals/GuestsModal';
import './components/modals/GuestsModal.scss';
import { StaffModal, StaffModalCallbacks } from './components/modals/StaffModal';
import './components/modals/StaffModal.scss';
import { StoryModal, StoryModalCallbacks } from './components/modals/StoryModal';
import './components/modals/StoryModal.scss';
import { Navigation, NavigationCallbacks } from './components/Navigation';
import './components/Navigation.scss';
import { NewGameSetup, NewGameSetupCallbacks } from './components/NewGameSetup';
import './components/NewGameSetup.scss';
import { SplashScreen, SplashScreenCallbacks } from './components/SplashScreen';
import './components/SplashScreen.scss';
import { StartScreen, StartScreenCallbacks } from './components/StartScreen';
import './components/StartScreen.scss';
import { TopBar } from './components/TopBar';
import './components/TopBar.scss';
import './styles/main.scss';
import { GameTab, Guest, Staff } from './types';
import { GameConfig } from './types/gameConfig';
import { createOpeningStoryMessage, initializeGameState, initializeGameVariables } from './utils/gameInitializer';
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { StoryScreen } from './components/story/StoryScreen';

// 全局函数声明（由酒馆助手提供）
declare function getLastMessageId(): number;

// 页面状态
type PageState = 'start' | 'splash' | 'setup' | 'game';
let currentPage: PageState = 'start';
let startScreen: StartScreen | null = null;
let splashScreen: SplashScreen | null = null;
let newGameSetup: NewGameSetup | null = null;
let confirmDialog: ConfirmDialog | null = null;
let currentGameConfig: GameConfig | null = null;

// 应用状态
let activeTab: GameTab = GameTab.DASHBOARD;
let navigation: Navigation | null = null;
let topBar: TopBar | null = null;
let dashboard: Dashboard | null = null;
let guestsModal: GuestsModal | null = null;
let buildModal: BuildModal | null = null;
let staffModal: StaffModal | null = null;
let storyModal: StoryModal | null = null;
let storyScreenRoot: Root | null = null; // React 故事界面根节点

// Mock 数据
const INITIAL_GUESTS: Guest[] = [
  {
    id: '1',
    name: '艾尔得里克',
    race: '人类',
    class: '流浪骑士',
    mood: 75,
    gold: 150,
    avatarUrl: 'https://picsum.photos/100?random=1',
    request: '给我来一杯最烈的酒，要能忘记过去的那种。',
  },
  {
    id: '2',
    name: '萨拉',
    race: '精灵',
    class: '巡林客',
    mood: 40,
    gold: 80,
    avatarUrl: 'https://picsum.photos/100?random=2',
    request: '这里的空气太浑浊了，有新鲜水果吗？',
  },
  {
    id: '3',
    name: '铜须',
    race: '矮人',
    class: '铁匠',
    mood: 90,
    gold: 300,
    avatarUrl: 'https://picsum.photos/100?random=3',
    request: '炉火烧得不错！再加把劲！',
  },
];

// Mock 员工数据
const INITIAL_STAFF: Staff[] = [
  {
    id: '1',
    name: '艾莉丝',
    race: '精灵',
    combatClass: '法师',
    innRole: '前台接待',
    level: 15,
    appearance: '银白色长发，碧绿眼眸，优雅而神秘。',
    favorability: 85,
    likes: ['安静的环境', '魔法书籍', '花草茶'],
    dislikes: ['吵闹', '粗鲁的客人'],
    avatarUrl: 'https://picsum.photos/100?random=20',
  },
  {
    id: '2',
    name: '铁锤',
    race: '矮人',
    combatClass: '战士',
    innRole: '厨师',
    level: 22,
    appearance: '浓密的红胡子，结实的肌肉，总是围着围裙。',
    favorability: 70,
    likes: ['好酒', '烹饪', '热闹'],
    dislikes: ['浪费食物', '挑剔的食客'],
    avatarUrl: 'https://picsum.photos/100?random=21',
  },
  {
    id: '3',
    name: '影',
    race: '暗精灵',
    combatClass: '盗贼',
    innRole: '保安',
    level: 18,
    appearance: '黑色斗篷，锐利的眼神，行动如影。',
    favorability: 60,
    likes: ['夜晚', '秘密', '秩序'],
    dislikes: ['混乱', '背叛'],
    avatarUrl: 'https://picsum.photos/100?random=22',
  },
];

// 游戏状态
let gameState = {
  gold: 1250,
  reputation: 45,
  currentWorld: '奇幻大陆',
  day: 14,
  guests: INITIAL_GUESTS,
  innName: '多次元便携旅店', // 旅店名字
};

/**
 * 刷新所有组件的数据（从变量表重新读取）
 */
function refreshAllComponents(): void {
  // 刷新顶部栏
  if (topBar) {
    topBar.loadFromVariables();
  }

  // 刷新仪表板
  if (dashboard) {
    dashboard.loadFromVariables();
  }

  // 如果模态框已经打开，也要刷新它们的数据
  if (guestsModal && guestsModal.getIsOpen()) {
    guestsModal.loadFromVariables();
  }
  if (staffModal && staffModal.getIsOpen()) {
    staffModal.loadFromVariables();
  }
  if (buildModal && buildModal.getIsOpen()) {
    buildModal.loadFromVariables();
  }
}

// 防止重复注册事件监听器
let isEventListenersInitialized = false;

/**
 * 初始化事件监听
 */
function initializeEventListeners(): void {
  // 防止重复注册
  if (isEventListenersInitialized) {
    console.warn('⚠️ 事件监听器已初始化，跳过重复注册');
    return;
  }

  isEventListenersInitialized = true;

  // 使用标志位防止重复刷新
  let isRefreshing = false;
  let pendingRefreshTimer: number | null = null;

  // 监听消息更新事件（消息被修改时，包括 replaceMvuData 更新变量）
  // 优先使用这个事件，因为它在 replaceMvuData 完成后会触发，数据更可靠
  eventOn(tavern_events.MESSAGE_UPDATED, (message_id: number) => {
    console.log('🔄 消息已更新，刷新游戏数据:', message_id);
    
    // 清除之前的延迟刷新定时器
    if (pendingRefreshTimer !== null) {
      clearTimeout(pendingRefreshTimer);
      pendingRefreshTimer = null;
    }

    // 如果正在刷新，跳过
    if (isRefreshing) {
      console.log('⚠️ 正在刷新中，跳过重复刷新');
      return;
    }

    // 延迟刷新，确保 replaceMvuData 完全完成且数据已写入
    // 增加延迟时间到 300ms，确保数据完全写入
    pendingRefreshTimer = window.setTimeout(async () => {
      isRefreshing = true;
      try {
        // 先检查并更新编年史
        const { checkAndUpdateChronicle } = await import('./utils/chronicleUpdater');
        await checkAndUpdateChronicle();

        // 刷新所有组件
        refreshAllComponents();
        console.log('✅ 已刷新所有组件（MESSAGE_UPDATED）');
      } finally {
        isRefreshing = false;
        pendingRefreshTimer = null;
      }
    }, 300);
  });

  // 监听消息接收事件（LLM返回新消息时）
  // 注意：此时变量可能还未更新（replaceMvuData 可能还未完成）
  // 这个事件主要用于日志记录，实际刷新由 MESSAGE_UPDATED 处理
  eventOn(tavern_events.MESSAGE_RECEIVED, async (message_id: number) => {
    console.log('📨 收到新消息:', message_id);
    // 不在这里刷新，等待 MESSAGE_UPDATED 事件
    // 如果 MESSAGE_UPDATED 没有触发（异常情况），则延迟较长时间后刷新
    setTimeout(() => {
      if (!isRefreshing) {
        console.warn('⚠️ MESSAGE_UPDATED 未触发，使用 MESSAGE_RECEIVED 作为后备刷新');
    refreshAllComponents();
      }
    }, 1000); // 延迟 1 秒，给 MESSAGE_UPDATED 足够的时间
  });
}

/**
 * 处理标签页切换（内部实现）
 */
function handleTabChangeInternal(tab: GameTab): void {
  // 如果已经是当前标签页，不需要重复操作
  if (activeTab === tab) {
    return;
  }

  activeTab = tab;
  
  // 同步到 tabManager
  (async () => {
    const { setActiveTab } = await import('./utils/tabManager');
    setActiveTab(tab);
  })();
  
  if (navigation) {
    navigation.setActiveTab(tab);
  }

  // 切换主内容区域显示：仪表板 vs React 故事界面
  const app = document.getElementById('app');
  const dashboardContainer = app?.querySelector('.mhjg-dashboard-container') as HTMLElement | null;
  const storyContainer = app?.querySelector('.mhjg-story-container') as HTMLElement | null;

  if (dashboardContainer && storyContainer) {
    if (tab === GameTab.STORY) {
      dashboardContainer.style.display = 'none';
      storyContainer.style.display = 'block';

      // 初始化 React 故事界面（只初始化一次）
      if (!storyScreenRoot) {
        storyScreenRoot = createRoot(storyContainer);
        storyScreenRoot.render(React.createElement(StoryScreen));
      }
    } else {
      dashboardContainer.style.display = '';
      storyContainer.style.display = 'none';
    }
  }

  // 关闭所有模态框（不触发回调，避免无限递归）
  if (guestsModal) guestsModal.close(false);
  if (buildModal) buildModal.close(false);
  if (staffModal) staffModal.close(false);
  // STORY 现在使用 React StoryScreen，不再使用 StoryModal 弹窗

  // 显示对应的模态框（会自动从变量表加载最新数据）
  switch (tab) {
    case GameTab.GUESTS:
      if (guestsModal) {
        guestsModal.show();
      }
      break;
    case GameTab.BUILD:
      if (buildModal) {
        buildModal.show();
      }
      break;
    case GameTab.STAFF:
      if (staffModal) {
        staffModal.show();
      }
      break;
    case GameTab.STORY:
      if (storyModal) {
        storyModal.show();
      }
      break;
    case GameTab.DASHBOARD:
      // Dashboard 始终显示，刷新数据
      refreshAllComponents();
      break;
  }
}

/**
 * 处理标签页切换（导出函数，通过tabManager）
 */
export function handleTabChange(tab: GameTab): void {
  handleTabChangeInternal(tab);
}

// storyModal 通过 appState 导出，避免循环依赖

/**
 * 初始化应用
 */
async function initializeApp(): Promise<void> {
  // 等待 MVU 初始化完成
  try {
    console.log('⏳ 等待 MVU 初始化...');
    await waitGlobalInitialized('Mvu');
    console.log('✅ MVU 初始化完成');
  } catch (error) {
    console.warn('⚠️ 等待 MVU 初始化失败，继续执行:', error);
  }
  const app = document.getElementById('app');
  if (!app) {
    console.error('找不到 #app 元素');
    return;
  }

  // 创建主布局
  app.innerHTML = `
    <div class="mhjg-app">
      <div class="mhjg-background">
        <div class="background-image"></div>
        <div class="background-overlay"></div>
      </div>
      <div class="mhjg-main">
        <div class="mhjg-navigation-container"></div>
        <div class="mhjg-content">
          <div class="mhjg-topbar-container"></div>
          <main class="mhjg-main-content">
            <div class="mhjg-dashboard-container"></div>
            <div class="mhjg-story-container" style="display: none;"></div>
          </main>
        </div>
      </div>
    </div>
  `;

  // 创建导航栏
  const navContainer = app.querySelector('.mhjg-navigation-container');
  if (navContainer) {
    const navCallbacks: NavigationCallbacks = {
      onTabChange: handleTabChange,
    };
    navigation = new Navigation(navCallbacks);
    navContainer.appendChild(navigation.createElement());
  }

  // 如果有新游戏配置，初始化游戏状态
  if (currentGameConfig) {
    const initialState = initializeGameState(currentGameConfig);
    gameState = {
      ...gameState,
      gold: initialState.gold,
      reputation: initialState.reputation,
      currentWorld: initialState.currentWorld,
      day: initialState.day,
      innName: initialState.innName,
    };
  }

  // 创建顶部栏（从变量表读取数据）
  const topBarContainer = app.querySelector('.mhjg-topbar-container');
  if (topBarContainer) {
    topBar = new TopBar(); // 不传初始状态，让组件从变量表读取
    topBarContainer.appendChild(topBar.createElement());
    
    // 连接 TopBar 和 Navigation：双向通信
    if (navigation && topBar) {
      // Navigation 点击世界按钮时，调用 TopBar 的输入框
      navigation.setWorldClickHandler(() => {
        topBar?.showWorldInput();
      });
      
      // TopBar 更新世界名称时，同步更新 Navigation
      topBar.setWorldUpdateHandler((worldName: string) => {
        navigation?.updateWorld(worldName);
      });
    }
  }

  // 创建仪表板（从变量表读取数据）
  const dashboardContainer = app.querySelector('.mhjg-dashboard-container');
  if (dashboardContainer) {
    const dashboardCallbacks: DashboardCallbacks = {
      onTabChange: handleTabChange,
    };
    dashboard = new Dashboard(dashboardCallbacks); // 不传初始状态，让组件从变量表读取
    dashboardContainer.appendChild(dashboard.createElement());
  }

  // 创建模态框（但不立即显示）
  const modalContainer = document.body;

  // Guests Modal（从变量表读取数据）
  const guestsModalCallbacks: GuestsModalCallbacks = {
    onClose: () => {
      handleTabChange(GameTab.DASHBOARD);
    },
  };
  guestsModal = new GuestsModal(null, guestsModalCallbacks); // 传 null，让组件从变量表读取
  modalContainer.appendChild(guestsModal.createElement());

  // Build Modal
  const buildModalCallbacks: BuildModalCallbacks = {
    onClose: () => {
      handleTabChange(GameTab.DASHBOARD);
    },
  };
  buildModal = new BuildModal(buildModalCallbacks);
  modalContainer.appendChild(buildModal.createElement());

  // Staff Modal（从变量表读取数据）
  const staffModalCallbacks: StaffModalCallbacks = {
    onClose: () => {
      handleTabChange(GameTab.DASHBOARD);
    },
    onInteract: (staffId: string) => {
      console.log('Interact with staff:', staffId);
      // TODO: 实现交互逻辑
    },
    onManage: (staffId: string) => {
      console.log('Manage staff:', staffId);
      // TODO: 实现管理逻辑
    },
  };
  staffModal = new StaffModal(null, staffModalCallbacks); // 传 null，让组件从变量表读取
  modalContainer.appendChild(staffModal.createElement());

  // React StoryScreen：初始化根节点（保持隐藏，切换到 STORY 标签时显示）
  const storyContainer = app.querySelector('.mhjg-story-container');
  if (storyContainer && !storyScreenRoot) {
    storyScreenRoot = createRoot(storyContainer);
    storyScreenRoot.render(React.createElement(StoryScreen));
  }

  // 注册到应用状态和标签页管理器（延迟执行，避免循环依赖）
  (async () => {
    // 保留原有 tabManager 回调注册
    const { setTabChangeCallback } = await import('./utils/tabManager');
    setTabChangeCallback(handleTabChangeInternal);
  })();

  // 初始化事件监听（监听LLM消息事件）
  initializeEventListeners();

  // 页面加载时检查并更新编年史
  (async () => {
    const { checkAndUpdateChronicle } = await import('./utils/chronicleUpdater');
    await checkAndUpdateChronicle();
  })();

  console.log('✅ MHJG 应用初始化完成');
}

/**
 * 清理应用
 */
function destroyApp(): void {
  if (navigation) {
    navigation.destroy();
    navigation = null;
  }
  if (topBar) {
    topBar.destroy();
    topBar = null;
  }
  if (dashboard) {
    dashboard.destroy();
    dashboard = null;
  }
  if (storyScreenRoot) {
    storyScreenRoot.unmount();
    storyScreenRoot = null;
  }
  if (guestsModal) {
    guestsModal.destroy();
    guestsModal = null;
  }
  if (buildModal) {
    buildModal.destroy();
    buildModal = null;
  }
  if (staffModal) {
    staffModal.destroy();
    staffModal = null;
  }
  if (newGameSetup) {
    newGameSetup.destroy();
    newGameSetup = null;
  }
  if (confirmDialog) {
    confirmDialog.destroy();
    confirmDialog = null;
  }
}

/**
 * 初始化第0页（开始屏幕）
 */
function initializeStartScreen(): void {
  const app = document.getElementById('app');
  if (!app) {
    console.error('找不到 #app 元素');
    return;
  }

  app.innerHTML = '';

  const startCallbacks: StartScreenCallbacks = {
    onStart: () => {
      // 检查当前游戏的楼层数
      try {
        const lastMessageId = getLastMessageId();
        console.log('📊 当前楼层数:', lastMessageId);

        if (lastMessageId > 0) {
          // 如果楼层数 > 0，直接进入游戏页面
          console.log('✅ 检测到已有游戏进度，直接进入游戏页面');
          currentPage = 'game';
          startScreen?.hide();
          initializeApp();
        } else {
          // 如果楼层数 = 0，进入标题页面
          console.log('📝 未检测到游戏进度，进入标题页面');
          currentPage = 'splash';
          startScreen?.hide();
          initializeSplashScreen();
        }
      } catch (error) {
        // 如果获取楼层数失败，默认进入标题页面
        console.warn('⚠️ 获取楼层数失败，默认进入标题页面:', error);
      currentPage = 'splash';
      startScreen?.hide();
      initializeSplashScreen();
      }
    },
  };

  startScreen = new StartScreen(startCallbacks);
  app.appendChild(startScreen.createElement());
  startScreen.show();
}

/**
 * 初始化标题页面
 */
function initializeSplashScreen(): void {
  const app = document.getElementById('app');
  if (!app) return;

  // 检查是否有存档数据（这里可以改为实际检查逻辑）
  const hasSaveData = false; // TODO: 实现实际的存档检查

  const splashCallbacks: SplashScreenCallbacks = {
    onStartNewGame: () => {
      // 直接进入创建页面
            currentGameConfig = null;
            currentPage = 'setup';
            splashScreen?.hide();
            initializeNewGameSetup();
    },
    onContinueGame: () => {
      currentPage = 'game';
      splashScreen?.hide();
      initializeApp();
    },
    onOpenSettings: () => {
      console.log('打开设置');
      // TODO: 实现设置功能
    },
    onExit: () => {
      if (window.confirm('确定要退出吗？')) {
        window.close();
      }
    },
  };

  splashScreen = new SplashScreen(splashCallbacks, {
    title: '诸天便携旅店',
    subtitle: '迷失者的庇护所',
    hasSaveData: hasSaveData,
    backgroundImage: 'https://pub-0f03753252fb439e966a538d805f20ef.r2.dev/docs/1765458743425.png',
    showSettings: false,
    showExit: false,
  });

  app.appendChild(splashScreen.createElement());
  splashScreen.show();
}

/**
 * 初始化开局创建页面
 */
function initializeNewGameSetup(): void {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = '';

  const callbacks: NewGameSetupCallbacks = {
    onCancel: () => {
      // 返回标题页
      currentPage = 'splash';
      app.innerHTML = '';
      initializeSplashScreen();
    },
    onConfirm: async (config: GameConfig) => {
      currentGameConfig = config;

      // 将开局配置写入0层消息楼层变量
      console.log('🎮 开始初始化游戏变量...');
      const initSuccess = await initializeGameVariables(config);
      if (!initSuccess) {
        console.error('❌ 初始化游戏变量失败，但继续进入游戏');
      }

      // 创建开局介绍楼层（1层），携带0层的data
      console.log('📖 开始创建开局介绍楼层...');
      const storySuccess = await createOpeningStoryMessage(config);
      if (!storySuccess) {
        console.error('❌ 创建开局介绍楼层失败，但继续进入游戏');
      }

      currentPage = 'game';
      app.innerHTML = '';
      initializeApp();
    },
  };

  newGameSetup = new NewGameSetup(callbacks);
  app.appendChild(newGameSetup.createElement());
}

// 使用 jQuery 进行页面加载
$(() => {
  initializeStartScreen();
});

// 页面卸载时清理
$(window).on('beforeunload', () => {
  if (startScreen) {
    startScreen.destroy();
    startScreen = null;
  }
  if (splashScreen) {
    splashScreen.destroy();
    splashScreen = null;
  }
  destroyApp();
});
