import { Menu, User } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getRuntimeSchema } from './utils/schemaLoader';
import Header from './components/Header';
import LeftSidebar from './components/LeftSidebar';
import MainView from './components/MainView';
import Modal from './components/Modal';
import RightSidebar from './components/RightSidebar';
import StartScreen from './components/StartScreen';
import TitleScreen from './components/TitleScreen';
import LoadingScreen from './components/LoadingScreen';
import SetupConfirmScreen from './components/SetupConfirmScreen';
import SetupWizard, { Selections as SetupSelections } from './components/SetupWizard';
import { hostPresets } from './data/initvarPresets';
import { luckPoolPresets } from './data/luckPoolPresets';
import { hostStatPresets } from './data/hostStatPresets';
import { useMvuData } from './hooks/useMvuData';
import { useTavernInteraction } from './hooks/useTavernInteraction';
import { useTavernSync } from './hooks/useTavernSync';
import { getAllHistoryMessages, getReadingPages, loadFromLatestMessage, parseHistory } from './utils/messageParser';
import { diffVariables, groupChangesByModule, VariableChange } from './utils/variableDiff';
import { calculateCorrectedStats } from './utils/statCalculator';
import { getWorldbookEntryContents, parseWorldbookHistory, pruneHistoryBySeq, pruneTianjiNewsByFloor, runTianjiNewsWithFactionSelection, setActiveHostWorldbookEntry, setModeWorldbookEntries, setMultiApiWorldbookMode, writeTianjiNewsEntry } from './utils/worldbook';

const App: React.FC = () => {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalData, setModalData] = useState<any>(null);
  const [selectedAuthority, setSelectedAuthority] = useState<{ name: string; data: any } | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<{ label: string; data: any; type: 'clothing' | 'talent' } | null>(null);
  const [commandSet, setCommandSet] = useState<Array<{ name: string; prompt: string }>>([]);
  const [lastSeenCommandCount, setLastSeenCommandCount] = useState<number | null>(null);
  const [lastSeenStatusCount, setLastSeenStatusCount] = useState<number | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [showTitleScreen, setShowTitleScreen] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showSetupConfirm, setShowSetupConfirm] = useState(false);
  const [showPostLoading, setShowPostLoading] = useState(false);
  const [setupDraftMessage, setSetupDraftMessage] = useState('');

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isStreaming, setIsStreaming] = useState(() => {
    return localStorage.getItem('taixujie_streaming') !== 'false'; // 默认开启
  });

  const [isFocusMode, setIsFocusMode] = useState(() => {
    return localStorage.getItem('taixujie_focus_mode') === 'true'; // 默认关闭
  });
    const [focusSettings, setFocusSettings] = useState(() => {
      const saved = localStorage.getItem('taixujie_focus_settings');
      const defaults = {
        hideInterval: 100,
        keepCount: 10
      };
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    });
  const handleUpdateFocusSettings = (newSettings: any) => {
    setFocusSettings(newSettings);
    localStorage.setItem('taixujie_focus_settings', JSON.stringify(newSettings));
  };
  const apResetKeyRef = useRef<string | null>(localStorage.getItem('taixujie_ap_reset_key'));
  const multiApiInitRef = useRef(false);
  const [multiApiEnabled, setMultiApiEnabled] = useState(() => {
    return localStorage.getItem('taixujie_multi_api_enabled') === 'true';
  });
  const [multiApiConfig, setMultiApiConfig] = useState(() => {
    const saved = localStorage.getItem('taixujie_multi_api_config');
    const defaults = {
      apiurl: '',
      key: '',
      model: '',
      retries: 3,
      promptTemplate: '',
      worldbookRefs: [],
      presetRules: []
    };
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  });

  const [shopApiConfig, setShopApiConfig] = useState(() => {
    const saved = localStorage.getItem('taixujie_shop_api_config');
    const defaults = {
      apiurl: '',
      key: '',
      model: '',
      retries: 3
    };
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  });
  const [luckApiConfig, setLuckApiConfig] = useState(() => {
    const saved = localStorage.getItem('taixujie_luck_api_config');
    const defaults = {
      apiurl: '',
      key: '',
      model: '',
      retries: 3
    };
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  });

  const [richTextSettings, setRichTextSettings] = useState(() => {
    const saved = localStorage.getItem('taixujie_rich_text');
    const defaults = {
      quoteColor: 'text-slate-800',
      singleStarColor: 'text-pink-400',
      doubleStarColor: 'text-rose-500',
      bracketColor: 'text-blue-500',
      quoteBold: true,
      quoteItalic: true,
      singleStarBold: false,
      singleStarItalic: true,
      doubleStarBold: true,
      doubleStarItalic: false,
      bracketBold: false,
      bracketItalic: false,
      uiHeight: 1200,
      uiWidth: 1200,
      sidebarWidth: 320,
      secondaryModalWidth: 672,
      secondaryModalHeight: 85,
      topBarGap: 16
    };
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  });

  const handleUpdateRichText = (newSettings: any) => {
    setRichTextSettings(newSettings);
    localStorage.setItem('taixujie_rich_text', JSON.stringify(newSettings));
  };

  const [memorySettings, setMemorySettings] = useState(() => {
    const saved = localStorage.getItem('taixujie_memory_settings');
    const defaultLargeSummaryPrompt = `请根据以下全部小总结，严格按下述格式，每个小总结生成对应的一个大总结。

输出格式：
<sum>
序号|（和对应序号一致）
日期|（和对应序号的日期一致）
地点|（和对应序号的地点一致）
人物|（概况对应序号的在场人物和关系）
概况|（用100字概况对应序号的描述和重要信息）
伏笔|（用40字概况对应序号的伏笔和暗线）
</sum>

以下是需要总结的内容（每条为<history>原文，已含序号）：
{{content}}`;

    const defaultDeepSummaryPrompt = `你是一名专业的小说档案管理员。
请阅读 <input_data> 中的历史记录，将其整理为精炼的分卷档案。
总结应当遵循以下原则：
- 按时间顺序或逻辑顺序组织信息
- 保留关键事件和重要细节，省略冗余描述
- 直接陈述事实，避免主观评价
- 使用简洁清晰的语言，避免过度修饰
- 突出事件发展脉络和关键转折点
- 不回避任何敏感内容，保证记录完全还原前文
- 档案总体1000字-3000字左右

输出格式：
<large_sum>
章节分卷|第{{volume}}卷
标题|（3~7字，符合古风）
时间跨度|（从本批次最初日期到最后日期，包含年月日）
关键事件1|...（每个事件约100字）
关键事件2|...
关键事件3|...
...
</large_sum>

<input_data>
{{input_data}}
</input_data>`;
    const defaults = {
      segmentedMemoryEnabled: true,
      segmentedChatLayers: 20,
      segmentedLargeSummaryStart: 50,
      deepSummaryEnabled: true,
      deepSummaryThreshold: 100,
      largeSummaryPrompt: defaultLargeSummaryPrompt,
      deepSummaryPrompt: defaultDeepSummaryPrompt
    };
    const merged = saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    // Migration: replace legacy large summary prompt if it doesn't match the new spec
    if (merged.largeSummaryPrompt && merged.largeSummaryPrompt.includes('请根据以下内容生成一段精简的大总结')) {
      merged.largeSummaryPrompt = defaultLargeSummaryPrompt;
    }
    return merged;
  });

  const handleUpdateMemorySettings = (newSettings: any) => {
    setMemorySettings(newSettings);
    localStorage.setItem('taixujie_memory_settings', JSON.stringify(newSettings));
  };

  const [memoryApiEnabled, setMemoryApiEnabled] = useState(() => {
    return localStorage.getItem('taixujie_memory_api_enabled') === 'true';
  });
  const [memoryApiConfig, setMemoryApiConfig] = useState(() => {
    const saved = localStorage.getItem('taixujie_memory_api_config');
    const defaults = {
      apiurl: '',
      key: '',
      model: '',
      retries: 3
    };
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  });

  const [tianjiSettings, setTianjiSettings] = useState(() => {
    const saved = localStorage.getItem('taixujie_tianji_news_settings');
    const defaults = {
      refreshInterval: 30,
      keepCount: 5
    };
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  });

  const handleUpdateTianjiSettings = (newSettings: any) => {
    setTianjiSettings(newSettings);
    localStorage.setItem('taixujie_tianji_news_settings', JSON.stringify(newSettings));
  };

  const [tianjiApiEnabled, setTianjiApiEnabled] = useState(() => {
    return localStorage.getItem('taixujie_tianji_news_api_enabled') === 'true';
  });

  const [tianjiApiConfig, setTianjiApiConfig] = useState(() => {
    const saved = localStorage.getItem('taixujie_tianji_news_api_config');
    const defaults = {
      apiurl: '',
      key: '',
      model: '',
      retries: 3
    };
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  });

  const tianjiAutoRef = useRef(false);
  const normalizeTianjiApiUrl = (raw: string) => {
    const trimmed = (raw || '').trim();
    if (!trimmed) return '';
    if (/\/v1\/?$/.test(trimmed)) return trimmed.replace(/\/$/, '');
    return `${trimmed.replace(/\/$/, '')}/v1`;
  };

  const buildTianjiPresetText = () => {
    try {
      const raw = localStorage.getItem('taixujie_tianji_preset_draft');
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return '';
      return parsed
        .map((rule: any) => `【${rule?.name || ''}】\n${rule?.content || ''}`.trim())
        .filter((text: string) => text.length > 0)
        .join('\n\n');
    } catch {
      return '';
    }
  };

  const tryAutoTianjiNews = React.useCallback(async () => {
    if (tianjiAutoRef.current) return;
    if (!tianjiApiEnabled) {
      console.info('[TianjiAuto] skip: api disabled');
      return;
    }
    if (!tianjiApiConfig?.apiurl || !tianjiApiConfig?.model) {
      console.info('[TianjiAuto] skip: api config incomplete', {
        hasApiUrl: !!tianjiApiConfig?.apiurl,
        hasModel: !!tianjiApiConfig?.model
      });
      return;
    }
    const latest = loadFromLatestMessage();
    if (!latest) {
      console.info('[TianjiAuto] skip: no latest message');
      return;
    }
    if (latest.role !== 'assistant') {
      console.info('[TianjiAuto] skip: latest not assistant', { role: latest.role });
      return;
    }
    if (latest.isPending) {
      console.info('[TianjiAuto] skip: message pending');
      return;
    }
    if (!latest.maintext) {
      console.info('[TianjiAuto] skip: no maintext');
      return;
    }
    const interval = Math.max(1, Number(tianjiSettings.refreshInterval) || 1);
    const lastId = getLastMessageId();
    if (typeof lastId !== 'number' || lastId < 0) {
      console.info('[TianjiAuto] skip: invalid last message id');
      return;
    }
    const floorSeq = typeof latest.messageId === 'number' && latest.messageId >= 0
      ? Math.floor(latest.messageId / 2)
      : null;
    if (floorSeq === null) {
      console.info('[TianjiAuto] skip: invalid floor seq');
      return;
    }
    if (floorSeq <= 0 || floorSeq % interval !== 0) {
      const mod = floorSeq % interval;
      const nextIn = mod === 0 ? 0 : interval - mod;
      console.info('[TianjiAuto] skip: interval not reached', {
        floorSeq,
        interval,
        nextIn
      });
      return;
    }

    const normalizedUrl = normalizeTianjiApiUrl(tianjiApiConfig.apiurl || '');
    if (!normalizedUrl) {
      console.info('[TianjiAuto] skip: invalid api url');
      return;
    }

    const lastKey = 'taixujie_tianji_last_floor';
    const lastSeq = Number(localStorage.getItem(lastKey) || -1);
    if (floorSeq === lastSeq) {
      console.info('[TianjiAuto] skip: already generated on this seq', { floorSeq });
      return;
    }
    const floorForEntry = typeof latest.messageId === 'number' ? Math.floor(latest.messageId / 2) : undefined;

    tianjiAutoRef.current = true;
    try {
      console.info('[TianjiAuto] start', { floorSeq, interval });
      const result = await runTianjiNewsWithFactionSelection({
        apiConfig: {
          ...tianjiApiConfig,
          apiurl: normalizedUrl
        },
        presetText: buildTianjiPresetText(),
        maintext: latest.maintext
      });
      if (result?.output?.trim() && !result?.error) {
        await writeTianjiNewsEntry(result.output.trim(), {
          keepCount: tianjiSettings.keepCount,
          floor: floorForEntry
        });
        localStorage.setItem('taixujie_tianji_last_floor', String(floorSeq));
        console.info('[TianjiAuto] done', { floorSeq });
      } else {
        console.info('[TianjiAuto] skip: empty output');
      }
    } finally {
      tianjiAutoRef.current = false;
    }
  }, [tianjiApiConfig, tianjiApiEnabled, tianjiSettings.keepCount, tianjiSettings.refreshInterval]);

  const [textFont, setTextFont] = useState(() => {
    return localStorage.getItem('taixujie_font') || "'Noto Serif SC', serif";
  });

  const markApSpend = (amount: number) => {
    (window as any).taixujie_ap_token = { kind: 'spend', amount, ts: Date.now() };
  };

  const markApReset = (target: number) => {
    (window as any).taixujie_ap_token = { kind: 'reset', target, ts: Date.now() };
  };

  const handleUpdateFont = (font: string) => {
    setTextFont(font);
    localStorage.setItem('taixujie_font', font);
  };

  const buildSetupPrompt = (selections: SetupSelections) => {
    const host = hostPresets.find(h => h.id === selections.hostId);
    const hostName = host?.name || '未知宿主';
    const hostIdentity = host?.identity || '未知身份';
    const story = selections.storyStart;
    const storyTitle = story?.title || '未知剧情';
    const storyHook = story?.hook || '未知因果';

    return [
      `<user>本次绑定的宿主是${hostName}，是${hostIdentity}`,
      `当前剧情为${storyTitle}（${storyHook}），机缘巧合下找到或者捡到了仙玉录`,
      `你需要描述：${hostName}捡到玉简，并发现玉简化作流光进入神识。<user>与${hostName}对峙，尝试伪装身份。`
    ].join('\n');
  };


  // 使用 MVU Hook 获取实时变量
  const [mvuData, saveMvuData] = useMvuData(getRuntimeSchema);
  const statusCount = useMemo(() => {
    return Object.keys((mvuData as any)?.['\u5f53\u524d\u72b6\u6001'] || {}).length;
  }, [mvuData]);
  const [variableChanges, setVariableChanges] = useState<Record<string, VariableChange[]>>({});
  const [floatingMessages, setFloatingMessages] = useState<Array<{
    id: string;
    text: string;
    top: number;
    kind: 'exp' | 'excite' | 'corrupt' | 'usage' | 'dependency' | 'other';
    delay: number;
    createdAt: number;
    batchId: number;
  }>>([]);
  const prevMvuRef = useRef<any>(null);
  const prevFloatRef = useRef<{
    dependency: number;
    corruption: number;
    excitement: number;
    exp: number;
    bodyCounts: Record<string, number>;
  } | null>(null);
  const floatBatchRef = useRef(0);
  const floatSeenRef = useRef<Record<string, true>>({});
  const floatIdRef = useRef(0);
  const floatLaneRef = useRef(0);
  const displayData = useMemo(() => calculateCorrectedStats(mvuData), [mvuData]);
  const moduleOrder = useMemo(() => Object.keys(displayData || {}), [displayData]);

  useEffect(() => {
    if (lastSeenCommandCount === null) {
      setLastSeenCommandCount(commandSet.length);
      return;
    }
    if (commandSet.length < lastSeenCommandCount) {
      setLastSeenCommandCount(commandSet.length);
    }
  }, [commandSet.length, lastSeenCommandCount]);

  useEffect(() => {
    if (lastSeenStatusCount === null) {
      setLastSeenStatusCount(statusCount);
      return;
    }
    if (statusCount < lastSeenStatusCount) {
      setLastSeenStatusCount(statusCount);
    }
  }, [statusCount, lastSeenStatusCount]);

  const wheelBadgeCount = Math.max(0, commandSet.length - (lastSeenCommandCount ?? commandSet.length))
    + Math.max(0, statusCount - (lastSeenStatusCount ?? statusCount));

  // 使用自定义 Hook 同步酒馆数据
  const {
    history,
    options,
    latestMessageId,
    userMessageId,
    fullMessage,
    thinking,
    readingMessages,
    historyMessages,
    setReadingMessages,
    setHistoryMessages
  } = useTavernSync(mvuData, activeModal, richTextSettings, memorySettings, memoryApiEnabled, memoryApiConfig);
  const { sendMessage } = useTavernInteraction(mvuData, isFocusMode, focusSettings, {
    multiApiEnabled,
    multiApiConfig,
    onUpdateMvuData: saveMvuData
  });

  const extractThinkStatus = (message?: string) => {
    if (!message) return { hasUnclosedThink: false };
    const hasOpen = /<(think|thinking)>/i.test(message);
    const hasClose = /<\/(think|thinking)>/i.test(message);
    return { hasUnclosedThink: hasOpen && !hasClose };
  };
  const thinkSnapshot = { thinkContent: thinking, ...extractThinkStatus(fullMessage) };

  const world = mvuData.世界信息;
  const char = mvuData.角色基础;
  const body = mvuData.身体开发;
  const uterus = mvuData.子宫;
  const clothing = mvuData.当前着装;
  const sys = mvuData.仙玉录 || { 当前行动点: 0, 最大行动点: 0 };
  const shopData = mvuData.仙缘商城;

  useEffect(() => {
    // 监听全屏变化
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const query = '(max-width: 768px), (max-height: 520px) and (orientation: landscape)';
    const media = window.matchMedia(query);
    const update = () => setIsMobile(media.matches);
    update();
    if (media.addEventListener) {
      media.addEventListener('change', update);
    } else {
      media.addListener(update);
    }
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', update);
      } else {
        media.removeListener(update);
      }
    };
  }, []);

  useEffect(() => {
    const query = '(min-width: 769px) and (max-width: 1024px)';
    const media = window.matchMedia(query);
    const update = () => setIsTablet(media.matches);
    update();
    if (media.addEventListener) {
      media.addEventListener('change', update);
    } else {
      media.addListener(update);
    }
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', update);
      } else {
        media.removeListener(update);
      }
    };
  }, []);

  useEffect(() => {
    if (multiApiInitRef.current) return;
    multiApiInitRef.current = true;
    if (!multiApiEnabled) return;
    setMultiApiWorldbookMode(true).catch((e: any) => {
    });
  }, [multiApiEnabled]);

  const buildFloatSnapshot = React.useCallback((data: any) => {
    const bodyCounts: Record<string, number> = {};
    const bodyData = data?.身体开发;
    if (bodyData && typeof bodyData === 'object') {
      Object.keys(bodyData).forEach((part) => {
        const count = Number(bodyData?.[part]?.使用次数 ?? 0);
        if (Number.isFinite(count)) bodyCounts[part] = count;
      });
    }

    return {
      dependency: Number(data?.角色基础?.依存度 ?? 0),
      corruption: Number(data?.角色基础?.总堕落值 ?? 0),
      excitement: Number(data?.角色基础?.兴奋值 ?? 0),
      exp: Number(data?.仙玉录?.经验值 ?? 0),
      bodyCounts
    };
  }, []);

  const emitFloatChanges = React.useCallback((data: any) => {
    if (!data) return;
    const nextFloat = buildFloatSnapshot(data);
    const prevFloat = prevFloatRef.current;

    if (!prevFloat) {
      prevFloatRef.current = nextFloat;
      return;
    }

    const nextBatchId = floatBatchRef.current + 1;
    let hasAny = false;

    const pushFloating = (text: string, kind: 'exp' | 'excite' | 'corrupt' | 'usage' | 'dependency' | 'other') => {
      const now = Date.now();
      const seenKey = `${kind}|${text}`;
      if (floatSeenRef.current[seenKey]) {
        return;
      }
      floatSeenRef.current[seenKey] = true;

      if (!hasAny) {
        // 新一波弹幕开始时，清空上一波，避免旧弹幕与新弹幕同屏
        setFloatingMessages([]);
      }

      const id = `float_${Date.now()}_${floatIdRef.current++}`;
      const createdAt = now;
      const laneCount = 6;
      const baseTop = 6;
      const gap = 6;
      const lane = floatLaneRef.current % laneCount;
      floatLaneRef.current += 1;
      const top = baseTop + lane * gap;
      const delay = Math.random() * 2.2;
      hasAny = true;
      setFloatingMessages(prev => [...prev, { id, text, top, kind, delay, createdAt, batchId: nextBatchId }]);
      window.setTimeout(() => {
        setFloatingMessages(prev => prev.filter(item => item.id !== id));
      }, 20200 + delay * 1000);
    };

    const charName = data?.角色基础?.宿主 || '角色';
    const formatDelta = (delta: number) => (delta > 0 ? `+${delta}` : `${delta}`);

    const depDelta = nextFloat.dependency - prevFloat.dependency;
    if (Number.isFinite(depDelta) && depDelta !== 0) {
      pushFloating(`${charName}依存度${formatDelta(depDelta)}`, 'dependency');
    }

    const corDelta = nextFloat.corruption - prevFloat.corruption;
    if (Number.isFinite(corDelta) && corDelta !== 0) {
      pushFloating(`${charName}堕落值${formatDelta(corDelta)}`, 'corrupt');
    }

    const excDelta = nextFloat.excitement - prevFloat.excitement;
    if (Number.isFinite(excDelta) && excDelta !== 0) {
      pushFloating(`${charName}兴奋值${formatDelta(excDelta)}`, 'excite');
    }

    const expDelta = nextFloat.exp - prevFloat.exp;
    if (Number.isFinite(expDelta) && expDelta !== 0) {
      pushFloating(`仙玉录经验值${formatDelta(expDelta)}`, 'exp');
    }

    Object.keys(nextFloat.bodyCounts).forEach((part) => {
      const nextCount = nextFloat.bodyCounts[part];
      const prevCount = prevFloat.bodyCounts[part] ?? 0;
      const delta = nextCount - prevCount;
      if (Number.isFinite(delta) && delta !== 0) {
        pushFloating(`${charName}${part}使用次数${formatDelta(delta)}`, 'usage');
      }
    });

    if (hasAny) {
      floatBatchRef.current = nextBatchId;
    }

    prevFloatRef.current = nextFloat;
  }, [buildFloatSnapshot]);

  useEffect(() => {
    if (!prevMvuRef.current) {
      prevMvuRef.current = displayData;
      return;
    }

    const changes = diffVariables(prevMvuRef.current, displayData);
    const grouped = groupChangesByModule(changes, moduleOrder);
    setVariableChanges(grouped);

    emitFloatChanges(displayData);
    prevMvuRef.current = displayData;
  }, [displayData, moduleOrder, emitFloatChanges]);

  useEffect(() => {
    let stop: EventOnReturn | null = null;
    const init = async () => {
      try {
        if (typeof waitGlobalInitialized === 'function') {
          await waitGlobalInitialized('Mvu');
        }
        if (typeof Mvu !== 'undefined' && Mvu?.events?.VARIABLE_UPDATE_ENDED) {
          stop = eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, () => {
            try {
            const fromMvu = typeof Mvu.getMvuData === 'function'
              ? Mvu.getMvuData({ type: 'message', message_id: 'latest' })
              : null;
            const fromVars = getVariables({ type: 'message', message_id: 'latest' });
            const statData = fromMvu?.stat_data || fromVars?.stat_data;
            if (statData) {
              emitFloatChanges(statData);
            }
            void tryAutoTianjiNews();
          } catch (e) {
            console.warn('[Float] 读取最新变量失败', e);
          }
        });
        }
      } catch (e) {
        console.warn('[Float] MVU 初始化失败或超时', e);
      }
    };

    init();
    return () => {
      if (stop) stop.stop();
    };
  }, [emitFloatChanges]);

  useEffect(() => {
    let timer: number | null = null;
    const schedule = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      timer = window.setTimeout(() => {
        timer = null;
        void tryAutoTianjiNews();
      }, 60);
    };
    schedule();
    const stopHandlers = [
      eventOn(tavern_events.MESSAGE_RECEIVED, schedule),
      eventOn(tavern_events.MESSAGE_UPDATED, schedule),
      eventOn(tavern_events.MESSAGE_EDITED, schedule),
      eventOn(tavern_events.CHAT_CHANGED, schedule)
    ];
    return () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      stopHandlers.forEach(stop => stop.stop());
    };
  }, [tryAutoTianjiNews]);

  useEffect(() => {
    const stop = eventOn(tavern_events.CHAT_CHANGED, async () => {
      setVariableChanges({});
      setFloatingMessages([]);
      prevMvuRef.current = null;
      prevFloatRef.current = null;
      floatSeenRef.current = {};
    });

    return () => stop.stop();
  }, []);

  useEffect(() => {
    const time = world?.时间;
    if (!time || !sys) return;
    if (!time.时辰?.includes('子时')) return;

    const resetKey = `${time.年份}|${time.日期}|子时`;
    if (apResetKeyRef.current === resetKey) return;

    apResetKeyRef.current = resetKey;
    localStorage.setItem('taixujie_ap_reset_key', resetKey);

    if (sys.当前行动点 >= sys.最大行动点) return;

    markApReset(sys.最大行动点);
    saveMvuData({
      ...mvuData,
      仙玉录: {
        ...sys,
        当前行动点: sys.最大行动点
      }
    });
  }, [
    world?.时间?.时辰,
    world?.时间?.日期,
    world?.时间?.年份,
    sys?.当前行动点,
    sys?.最大行动点,
    mvuData,
    saveMvuData
  ]);


  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => {
        toastr.error(`进入全屏失败: ${e.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const openReadingMode = async () => {
    const pages = getReadingPages();
    let chapterRanges: Array<{ start: number; end: number; title: string }> = [];
    try {
      const contents = await getWorldbookEntryContents(['历史记录', '历史']);
      const content = contents['历史记录'] || contents['历史'] || '';
      const wbParsed = parseWorldbookHistory(content);
      const ranges = wbParsed
        .map(item => {
          const history = item.history || '';
          const match = history.match(/章节分卷\|第(\d+)-(\d+)层/);
          if (!match) return null;
          const start = parseInt(match[1], 10);
          const end = parseInt(match[2], 10);
          const titleLine = history.split('\n').find(line => line.trim().startsWith('标题|'));
          const title = titleLine ? titleLine.split('|').slice(1).join('|').trim() : `章节分卷 第${start}-${end}层`;
          return { start, end, title };
        })
        .filter(Boolean) as Array<{ start: number; end: number; title: string }>;
      chapterRanges = ranges;
    } catch {
    }
    setReadingMessages({ pages, richTextSettings, stat_data: mvuData, chapterRanges });
    setActiveModal('reading');
  };

  const openHistoryList = () => {
    setHistoryMessages(getAllHistoryMessages());
    setActiveModal('history_list');
  };

  const resolveLatestFloor = () => {
    try {
      const lastId = getLastMessageId();
      if (typeof lastId !== 'number' || !Number.isFinite(lastId)) return 0;
      return Math.max(0, lastId);
    } catch {
      return 0;
    }
  };

  const handleStart = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        // 保底：全屏失败也允许进入
      });
    }

    const latestFloor = resolveLatestFloor();
    if (latestFloor === 0) {
      setHasStarted(true);
      setShowTitleScreen(true);
      return;
    }
    setHasStarted(true);
  };

  const handleStartNewGame = () => {
    setShowTitleScreen(false);
    setShowLoadingScreen(true);
  };

  const handleContinueGame = () => {
    setShowTitleScreen(false);
    setShowLoadingScreen(false);
    setShowSetupWizard(false);
    setHasStarted(true);
  };

  const updateMvuLayer0 = async (updater: (data: any) => any) => {
    const target = { type: 'message', message_id: 0 as const };
    let nextStat: any = null;
    try {
      await updateVariablesWith(vars => {
        const nextVars = vars && typeof vars === 'object' ? { ...vars } : {};
        if (!nextVars.stat_data || typeof nextVars.stat_data !== 'object') {
          nextVars.stat_data = {};
        }
        const base = { ...nextVars.stat_data };
        const updated = updater(base);
        nextStat = updated;
        nextVars.stat_data = updated;
        return nextVars;
      }, target);
    } catch (e) {
      console.warn('[Setup] updateVariablesWith(0) failed:', e);
    }

    if (!nextStat) return;

    if (typeof Mvu !== 'undefined' && typeof Mvu.replaceMvuData === 'function') {
      let mvuData0: any = null;
      try {
        if (typeof Mvu.getMvuData === 'function') {
          mvuData0 = Mvu.getMvuData(target);
        }
      } catch {
        mvuData0 = null;
      }
      if (!mvuData0 || typeof mvuData0 !== 'object') {
        mvuData0 = {};
      }
      mvuData0.stat_data = nextStat;
      Mvu.replaceMvuData(mvuData0 as any, target);
    } else {
      const vars0 = getVariables(target) || {};
      vars0.stat_data = nextStat;
      replaceVariables(vars0, target);
    }
    eventEmit('PSEUDO_SAME_LAYER_UPDATE');
  };

  const handleApplySetupStep = async (step: number, selections: any) => {
    if (!mvuData) return;

    const parseChineseNumber = (raw: string) => {
      if (!raw) return null;
      const map: Record<string, number> = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
      let total = 0;
      let num = 0;
      for (const ch of raw) {
        if (ch === '十') {
          total += (num || 1) * 10;
          num = 0;
          continue;
        }
        if (ch === '百') {
          total += (num || 1) * 100;
          num = 0;
          continue;
        }
        if (map[ch] !== undefined) {
          num = map[ch];
        }
      }
      total += num;
      return total || null;
    };

    const getYearNumber = (label?: string) => {
      if (!label) return null;
      const digitMatch = label.match(/(\d+)/);
      if (digitMatch) return Number(digitMatch[1]);
      const cnMatch = label.match(/([零一二两三四五六七八九十百]+)/);
      if (!cnMatch) return null;
      return parseChineseNumber(cnMatch[1]);
    };

    const baseAgeByHost: Record<string, { baseYear: number; baseAge: number }> = {
      guyun: { baseYear: 3, baseAge: 19 },
      wenwanyun: { baseYear: 3, baseAge: 517 },
    };

    const calcHostAge = (hostId: string | null | undefined, yearLabel?: string) => {
      if (!hostId || !baseAgeByHost[hostId]) return null;
      const yearNum = getYearNumber(yearLabel);
      if (!yearNum) return baseAgeByHost[hostId].baseAge;
      return baseAgeByHost[hostId].baseAge + (yearNum - baseAgeByHost[hostId].baseYear);
    };

    if (step === 0) {
      if (!selections.difficulty) return;
      setModeWorldbookEntries(selections.difficulty, selections.sexyMode);
      const nextFlags = {
        ...(mvuData.事件标志 || {}),
        色色模式: !!selections.sexyMode
      };
      await updateMvuLayer0(prev => ({
        ...prev,
        事件标志: nextFlags
      }));
      return;
    }

    if (step === 1) {
      const time = selections.time;
      if (!time) return;
      const hostIdByName = hostPresets.find(h => h.name === mvuData.角色基础?.宿主)?.id;
      const nextAge = calcHostAge(hostIdByName, time.年份);
      await updateMvuLayer0(prev => ({
        ...prev,
        世界信息: {
          ...prev.世界信息,
          时间: {
            ...prev.世界信息?.时间,
            年份: time.年份,
            日期: time.日期,
            时辰: time.时辰
          },
          侵蚀度: time.侵蚀度 ?? prev.世界信息?.侵蚀度
        },
        角色基础: nextAge !== null
          ? { ...prev.角色基础, 寿元: nextAge }
          : prev.角色基础,
      }));
      return;
    }

    if (step === 2) {
      if (!selections.hostId) return;
      const hostPreset = hostPresets.find(h => h.id === selections.hostId);
      const hostStatPreset = selections.hostId ? hostStatPresets[selections.hostId] : null;
      const nextAge = calcHostAge(selections.hostId, mvuData.世界信息?.时间?.年份);

      const prevFlags = mvuData.事件标志 || {};
      const hostFlags = hostStatPreset?.事件标志 ? { ...hostStatPreset.事件标志 } : {};
      const sexyFlag = typeof prevFlags.色色模式 === 'boolean' ? prevFlags.色色模式 : !!selections.sexyMode;

      const nextData: any = {
        角色基础: hostStatPreset?.角色基础
          ? { ...mvuData.角色基础, ...hostStatPreset.角色基础 }
          : {
            ...mvuData.角色基础,
            宿主: hostPreset?.name || mvuData.角色基础?.宿主
          },
        事件标志: {
          ...hostFlags,
          ...prevFlags,
          色色模式: sexyFlag
        },
      };
      if (nextAge !== null) {
        nextData.角色基础 = { ...nextData.角色基础, 寿元: nextAge };
      }

      if (hostStatPreset?.身体开发) nextData.身体开发 = hostStatPreset.身体开发;
      if (hostStatPreset?.子宫) nextData.子宫 = hostStatPreset.子宫;
      if (hostStatPreset?.当前状态) nextData.当前状态 = hostStatPreset.当前状态;
      if (hostStatPreset?.天赋灵根) nextData.天赋灵根 = hostStatPreset.天赋灵根;
      if (hostStatPreset?.当前功法) nextData.当前功法 = hostStatPreset.当前功法;
      if (hostStatPreset?.当前装备) nextData.当前装备 = hostStatPreset.当前装备;
      if (hostStatPreset?.当前着装) nextData.当前着装 = hostStatPreset.当前着装;
      if (hostStatPreset?.尘缘羁绊) nextData.尘缘羁绊 = hostStatPreset.尘缘羁绊;

      await updateMvuLayer0(prev => ({
        ...prev,
        ...nextData
      }));
      if (hostPreset?.name) {
        setActiveHostWorldbookEntry(hostPreset.name);
      }
      return;
    }

    if (step === 3) {
      const location = selections.storyStart?.location || selections.location;
      if (!location) return;
      await updateMvuLayer0(prev => ({
        ...prev,
        世界信息: {
          ...prev.世界信息,
          地点: {
            ...prev.世界信息?.地点,
            大域: location.大域,
            区域: location.区域,
            地点: location.地点,
            具体场景: location.具体场景
          }
        }
      }));
      return;
    }

    if (step === 4) {
      const talents = selections.talents || [];
      if (talents.length === 0) {
        return;
      }
      const nextTalents = talents.reduce((acc: any, t: any) => {
        acc[t.名称] = {
          品阶: t.品阶,
          描述: t.描述,
          固定加成: t.固定加成 || [],
          神通: t.神通 || {}
        };
        return acc;
      }, {} as Record<string, any>);
      await updateMvuLayer0(prev => ({
        ...prev,
        天赋灵根: {
          ...(prev.天赋灵根 || {}),
          ...nextTalents
        }
      }));
      return;
    }

      if (step === 5) {
        const authorities = selections.authorities || [];
        const nextAuthorities = authorities.reduce((acc: any, a: any) => {
          acc[a.名称] = {
            当前等级: a.当前等级,
            最高等级: a.最高等级,
            描述: a.描述,
            效果: a.效果,
            持续时间: a.持续时间 ?? null,
            使用消耗点数: a.使用消耗点数,
            升级所需行动点: a.升级所需行动点
          };
          return acc;
        }, {});
        await updateMvuLayer0(prev => ({
          ...prev,
          仙玉权柄: nextAuthorities
        }));
        return;
      }

      if (step === 6) {
        const luckPools = selections.luckPools || {};
        const buildPrize = (item: any, fallbackRank: string) => {
          const base = {
            名称: item?.名称 || '未知物品',
            分类: item?.分类 || '未知',
            出货概率: 0,
            数量: item?.数量 ?? 1,
            品阶: item?.品阶 || fallbackRank,
            描述: item?.描述 || '暂无描述',
          } as any;

          switch (item?.分类) {
            case '武器':
            case '装备':
            case '法宝':
              base.固定加成 = item?.固定加成 || [];
              base.效果 = item?.效果 || [];
              return base;
            case '丹药':
            case '阵符':
              base.效果 = item?.效果 || [];
              return base;
            case '着装':
              base.着装类型 = item?.着装类型 || '上衣';
              base.固定加成 = item?.固定加成 || [];
              base.效果 = item?.效果 || [];
              return base;
            case '功法':
              base.固定加成 = item?.固定加成 || [];
              base.招式 = item?.招式 || [];
              return base;
            case '特殊':
              base.内容 = item?.内容 || [];
              return base;
            default:
              return base;
          }
        };

        const findLuckItem = (id: string | null | undefined, poolKey: string, tier: 'highest' | 'secondary') => {
          if (!id) return null;
          const pool = luckPoolPresets[poolKey as keyof typeof luckPoolPresets];
          if (!pool) return null;
          const list = tier === 'highest' ? pool.highest : pool.secondary;
          return list.find(item => item.id === id) || null;
        };

        await updateMvuLayer0(prev => {
          const buildPool = (key: string, highestRank: string, secondaryRank: string) => {
            const pool = luckPools[key] || { highestIds: [], secondaryIds: [] };
            const highestItems = (pool.highestIds || [])
              .map((id: string) => findLuckItem(id, key, 'highest'))
              .filter(Boolean);
            const secondaryItems = (pool.secondaryIds || [])
              .map((id: string) => findLuckItem(id, key, 'secondary'))
              .filter(Boolean);
            const highestPrize = highestItems[0] ? buildPrize(highestItems[0], highestRank) : {};
            return {
              已抽奖次数: prev.天运卜算?.[key]?.已抽奖次数 ?? 0,
              最高级奖品: highestPrize,
              次高级奖品: secondaryItems.map(item => buildPrize(item, secondaryRank))
            };
          };
          return {
            ...prev,
            天运卜算: {
              ...(prev.天运卜算 || {}),
              丙等卜算: buildPool('丙等卜算', '地阶', '玄阶'),
              乙等卜算: buildPool('乙等卜算', '天阶', '地阶'),
              甲等卜算: buildPool('甲等卜算', '仙阶', '天阶')
            }
          };
        });
        return;
      }

      if (step === 7) {
        const shopItems = selections.shopItems || [];
        const nextShopItems = shopItems.map((item: any) => {
          const base = {
            名称: item.名称,
            分类: item.分类,
          品阶: item.品阶,
          描述: item.描述,
          价格: item.价格,
          数量: item.数量
        } as any;
        if (['功法', '武器', '装备', '法宝', '着装'].includes(item.分类)) {
          base.固定加成 = item.固定加成 || [];
        }
        if (item.分类 === '着装') {
          base.着装类型 = item.着装类型 || '上衣';
          base.效果 = item.效果 || [];
        } else if (item.分类 === '丹药' || item.分类 === '阵符') {
          base.效果 = item.效果 || [];
        } else if (item.分类 === '功法') {
          base.招式 = item.招式 || [];
        } else if (item.分类 === '特殊') {
          base.内容 = item.内容 || [];
        } else {
          base.特殊效果 = item.特殊效果 || [];
        }
        return base;
      });
        await updateMvuLayer0(prev => ({
          ...prev,
          仙缘商城: {
            ...prev.仙缘商城,
            商品列表: nextShopItems
          }
        }));
      }
  };

  useEffect(() => {
    const root = document.documentElement;
    const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

    const uiHeight = clamp(Number(richTextSettings.uiHeight) || 1200, 600, 2000);
    const uiWidth = clamp(Number(richTextSettings.uiWidth) || 1200, 320, 2400);
    const sidebarWidth = clamp(Number(richTextSettings.sidebarWidth) || 320, 240, 520);
    const modalWidth = clamp(Number(richTextSettings.secondaryModalWidth) || 672, 280, 1200);
    const modalHeight = clamp(Number(richTextSettings.secondaryModalHeight) || 85, 50, 95);
    const topBarGap = clamp(Number(richTextSettings.topBarGap) || 16, 4, 64);

    root.style.setProperty('--taixujie-app-height', isFullscreen ? '100vh' : `${uiHeight}px`);
    root.style.setProperty('--taixujie-app-width', isFullscreen ? '100vw' : `${uiWidth}px`);
    root.style.setProperty('--taixujie-sidebar-width', `${sidebarWidth}px`);
    root.style.setProperty('--taixujie-modal-width', `${modalWidth}px`);
    root.style.setProperty('--taixujie-modal-height', `${modalHeight}vh`);
    root.style.setProperty('--taixujie-topbar-gap', `${topBarGap}px`);
  }, [richTextSettings, isFullscreen]);

  const layoutMode = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
  const dockSidebars = layoutMode === 'desktop' && isFullscreen;
  const effectiveLeftOpen = (!isMobile && isFullscreen) ? true : leftOpen;
  const effectiveRightOpen = (!isMobile && isFullscreen) ? true : rightOpen;
  const dockedSidebarWidth = 'min(var(--taixujie-sidebar-width, 320px), 30vw)';
  const mainPaddingStyle = dockSidebars ? {
    paddingLeft: effectiveLeftOpen ? dockedSidebarWidth : undefined,
    paddingRight: effectiveRightOpen ? dockedSidebarWidth : undefined
  } : undefined;
  const floatingNow = Date.now();
  const visibleFloatingMessages = floatingMessages.filter(
    msg => msg.batchId === floatBatchRef.current && floatingNow - msg.createdAt < 23000
  );

  return (
    <div className="h-full relative flex" style={{ fontFamily: textFont }}>
      <style>
        {`
          @keyframes taixujie-barrage-edge {
            0% { transform: translateX(110vw); opacity: 0; }
            10% { opacity: 1; }
            100% { transform: translateX(0); opacity: 0; }
          }
        `}
      </style>
      <div className="pointer-events-none fixed inset-0 z-[80]">
        {visibleFloatingMessages.map((msg) => (
          <div
            key={msg.id}
            className={`absolute left-0 text-lg font-black ${msg.kind === 'exp'
              ? 'text-emerald-600'
              : msg.kind === 'excite'
                ? 'text-orange-500'
                : msg.kind === 'corrupt'
                  ? 'text-red-500'
                  : msg.kind === 'usage'
                    ? 'text-pink-500'
                    : msg.kind === 'dependency'
                      ? 'text-yellow-500'
                      : 'text-emerald-600'
            }`}
            style={{
              top: `${msg.top}%`,
              whiteSpace: 'nowrap',
              textShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
              transform: 'translateX(110vw)',
              opacity: 0,
              animation: `taixujie-barrage-edge 20s linear forwards`,
              animationDelay: `${msg.delay}s`,
              animationFillMode: 'both'
            }}
            onAnimationEnd={() => {
              setFloatingMessages(prev => prev.filter(item => item.id !== msg.id));
            }}
          >
            {msg.text}
          </div>
        ))}
      </div>
      <Header
        time={{
          year: world.时间.年份,
          date: world.时间.日期,
          hour: world.时间.时辰
        }}
        location={{
          domain: world.地点.大域,
          region: world.地点.区域,
          place: world.地点.地点,
          scene: world.地点.具体场景
        }}
        erosion={world.侵蚀度}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onOpenInspect={() => setActiveModal('inspect')}
        onToggleReadingMode={openReadingMode}
        onToggleSaveMode={openHistoryList}
      />

      <LeftSidebar
        char={char}
        body={body}
        uterus={uterus}
        clothing={clothing}
        talents={mvuData.天赋灵根}
        isOpen={effectiveLeftOpen}
        isFullscreen={isFullscreen}
        onOpenDetail={(item) => {
          setSelectedDetail(item);
          setActiveModal('detail');
        }}
      />

      <div className="flex-1 relative transition-all duration-300" style={mainPaddingStyle}>
        <MainView
          mvuData={mvuData}
          history={history}
          options={options}
          latestMessageId={latestMessageId}
          userMessageId={userMessageId}
          fullMessage={fullMessage}
          isFocusMode={isFocusMode}
          focusSettings={focusSettings}
          multiApiEnabled={multiApiEnabled}
          multiApiConfig={multiApiConfig}
          onUpdateMvuData={saveMvuData}
          commandSet={commandSet}
          wheelBadgeCount={wheelBadgeCount}
          richTextSettings={richTextSettings}
          onRemoveCommand={(index) => {
            setCommandSet(prev => prev.filter((_, i) => i !== index));
          }}
          onAddCommand={(name, prompt) => {
            setCommandSet(prev => [...prev, { name, prompt }]);
          }}
          onOpenStatusEffects={() => {
            setLastSeenStatusCount(statusCount);
            setActiveModal('status_effects');
          }}
          onOpenCommands={() => {
            setLastSeenCommandCount(commandSet.length);
            setModalData({ commandSet });
            setActiveModal('commands');
          }}
          onToggleFullscreen={toggleFullscreen}
          onOpenReading={openReadingMode}
          onOpenHistory={openHistoryList}
          onOpenInspect={() => setActiveModal('inspect')}
          className="pt-24 md:pt-20"
        />
      </div>

      <RightSidebar
        state={sys}
        inventory={mvuData.储物空间}
        bonds={mvuData.尘缘羁绊}
        equipment={mvuData.当前装备}
        pets={mvuData.灵宠列表 || []}
        evilArtifacts={mvuData.邪物收容 || []}
        cultivation={mvuData.当前功法}
        onOpenDetail={(item) => {
          setSelectedDetail(item);
          setActiveModal('detail');
        }}
        authorities={mvuData.仙玉权柄}
        isOpen={effectiveRightOpen}
        isFullscreen={isFullscreen}
        onOpenModal={(type, data) => {
          setActiveModal(type);
          setModalData(data);
        }}
        onOpenAuthority={(name, data) => {
          setSelectedAuthority({ name, data });
          setActiveModal('authority_detail');
        }}
      />

      {/* 侧边栏切换按钮 - 左 */}
      <button
        onClick={() => setLeftOpen(true)}
        className={`fixed left-3 md:left-6 top-24 z-40 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white/90 backdrop-blur-md border border-emerald-100 rounded-full shadow-lg text-emerald-700 transition-all duration-300 hover:scale-110 hover:bg-emerald-50 ${effectiveLeftOpen ? 'opacity-0 scale-0 pointer-events-none' : 'opacity-100 scale-100'}`}
      >
        <User className="w-6 h-6" />
      </button>

      {/* 侧边栏切换按钮 - 右 */}
      <button
        onClick={() => setRightOpen(true)}
        className={`fixed right-3 md:right-6 top-24 z-40 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white/90 backdrop-blur-md border border-emerald-100 rounded-full shadow-lg text-emerald-700 transition-all duration-300 hover:scale-110 hover:bg-emerald-50 ${effectiveRightOpen ? 'opacity-0 scale-0 pointer-events-none' : 'opacity-100 scale-100'}`}
      >
        <Menu className="w-6 h-6" />
      </button>

      {activeModal && (
        <Modal
          type={activeModal}
          data={
            activeModal === 'shop' ? shopData :
              activeModal === 'detail' ? selectedDetail :
                activeModal === 'reading' ? readingMessages :
                    activeModal === 'history_list' ? historyMessages :
                    activeModal === 'commands' ? { commandSet } :
                    activeModal === 'storage' ? mvuData.储物空间 :
                      activeModal === 'tasks' ? mvuData.任务清单 :
                          activeModal === 'achievements' ? mvuData.成就列表 :
                            activeModal === 'status_effects' ? mvuData.当前状态 :
                              activeModal === 'luck' ? { ...mvuData, commandSet } :
                            activeModal === 'bonds' ? { source: mvuData.尘缘羁绊, initialName: modalData } :
                                activeModal === 'changes' ? null :
                                activeModal === 'inspect' ? thinkSnapshot :
                                activeModal === 'think' ? thinkSnapshot :
                                activeModal === 'settings' ? null :
                              activeModal === 'tianji_news' ? null :
                              activeModal === 'tianji_beauty' ? null :
                              selectedAuthority
          }
          onClose={() => setActiveModal(null)}
          onUpdateShopItem={(updatedItem) => {
            if (activeModal === 'shop') {
              // 找到被修改的商品并更新
              const newItems = [...shopData.商品列表];
              const idx = newItems.findIndex(it => it.名称 === updatedItem.名称);
              if (idx !== -1) {
                newItems[idx] = updatedItem;
                saveMvuData({
                  ...mvuData,
                  仙缘商城: {
                    ...shopData,
                    商品列表: newItems
                  }
                });
              }
            }
          }}
          onReplaceShopItems={(items) => {
            if (activeModal === 'shop') {
              saveMvuData({
                ...mvuData,
                仙缘商城: {
                  ...shopData,
                  商品列表: items
                }
              });
            }
          }}
          onPublishTask={async (instruction, updatedTasks) => {
            await sendMessage('', { instructions: [instruction] });
            if (updatedTasks) {
              saveMvuData({
                ...mvuData,
                任务清单: updatedTasks
              });
            }
          }}
          onUpdateTasksList={(updatedTasks) => {
            saveMvuData({
              ...mvuData,
              任务清单: updatedTasks
            });
          }}
          onPublishAchievement={async (instruction, updatedAchievements) => {
            await sendMessage('', { instructions: [instruction] });
            if (updatedAchievements) {
              saveMvuData({
                ...mvuData,
                成就列表: updatedAchievements
              });
            }
          }}
          onUpdateAchievementsList={(updatedAchievements) => {
            saveMvuData({
              ...mvuData,
              成就列表: updatedAchievements
            });
          }}
          onUseAuthority={(auth) => {
            const cost = auth.data.使用消耗点数 || 0;
            if (sys.当前行动点 < cost) {
              toastr.error('当前行动点不足！');
              return;
            }

            markApSpend(cost);
            const newSys = { ...sys, 当前行动点: sys.当前行动点 - cost };
            saveMvuData({
              ...mvuData,
              仙玉录: newSys
            });

            const prompt = `【使用权柄：${auth.name}】\n消耗 ${cost} AP。\n描述：${auth.data.描述}\n效果：\n${auth.data.效果.map((e: string) => `- ${e}`).join('\n')}`;
            setCommandSet(prev => [...prev, { name: auth.name, prompt }]);
            setActiveModal(null);
          }}
          onUpgradeAuthority={(auth) => {
            const cost = auth.data.升级所需行动点 || 10;
            if (sys.当前行动点 < cost) {
              toastr.error('当前行动点不足！');
              return;
            }

            // 扣除行动点，提升等级
            markApSpend(cost);
            const newSys = { ...sys, 当前行动点: sys.当前行动点 - cost };
            const newAuthorities = { ...mvuData.仙玉权柄 };
            newAuthorities[auth.name] = {
              ...auth.data,
              当前等级: auth.data.当前等级 + 1
            };

            saveMvuData({
              ...mvuData,
              仙玉录: newSys,
              仙玉权柄: newAuthorities
            });

            const prompt = `【升级权柄：${auth.name}】\n消耗 ${cost} AP，将其等级从 Lv.${auth.data.当前等级} 提升至 Lv.${auth.data.当前等级 + 1}。请根据等级提升描述新的效果或增强现有效果。`;
            setCommandSet(prev => [...prev, { name: `升级${auth.name}`, prompt }]);
            toastr.success(`${auth.name} 已升级至 Lv.${auth.data.当前等级 + 1}`);
          }}
          onUpdateMvuData={(newData) => saveMvuData(newData)}
          onAddCommand={(name, prompt) => {
            setCommandSet(prev => [...prev, { name, prompt }]);
          }}
          onUpdateCommand={(index, next) => {
            setCommandSet(prev => prev.map((cmd, i) => (
              i === index ? { ...cmd, ...next } : cmd
            )));
          }}
          onRemoveCommand={(index) => {
            setCommandSet(prev => prev.filter((_, i) => i !== index));
          }}
          isStreaming={isStreaming}
          onToggleStreaming={(val) => {
            setIsStreaming(val);
            localStorage.setItem('taixujie_streaming', String(val));
            toastr.success(`输出模式已切换为: ${val ? '流式' : '非流式'}`);
          }}
          isFocusMode={isFocusMode}
          onToggleFocusMode={(val) => {
            setIsFocusMode(val);
            localStorage.setItem('taixujie_focus_mode', String(val));
            toastr.success(`专注模式已${val ? `开启 (隐藏${focusSettings.hideInterval}层，保护最近${focusSettings.keepCount}层)` : '关闭'}`);
          }}
          focusSettings={focusSettings}
          onUpdateFocusSettings={handleUpdateFocusSettings}
          multiApiEnabled={multiApiEnabled}
          onToggleMultiApi={async (val) => {
            try {
              setMultiApiEnabled(val);
              localStorage.setItem('taixujie_multi_api_enabled', String(val));
              const result = await setMultiApiWorldbookMode(val);
              if (result.missing.length > 0) {
                toastr.warning(`世界书条目缺失: ${result.missing.join('、')}`);
              }
              toastr.success(`多API模式已${val ? '开启' : '关闭'}`);
            } catch (e: any) {
              toastr.error(`多API切换失败: ${e.message || '未知错误'}`);
            }
          }}
          multiApiConfig={multiApiConfig}
          onUpdateMultiApiConfig={(config) => {
            setMultiApiConfig(config);
            localStorage.setItem('taixujie_multi_api_config', JSON.stringify(config));
          }}
          shopApiConfig={shopApiConfig}
          onUpdateShopApiConfig={(config) => {
            setShopApiConfig(config);
            localStorage.setItem('taixujie_shop_api_config', JSON.stringify(config));
          }}
          luckApiConfig={luckApiConfig}
          onUpdateLuckApiConfig={(config) => {
            setLuckApiConfig(config);
            localStorage.setItem('taixujie_luck_api_config', JSON.stringify(config));
          }}
          luckApiConfig={luckApiConfig}
          onUpdateLuckApiConfig={(config) => {
            setLuckApiConfig(config);
            localStorage.setItem('taixujie_luck_api_config', JSON.stringify(config));
          }}
          richTextSettings={richTextSettings}
          onUpdateRichText={handleUpdateRichText}
          textFont={textFont}
          onUpdateFont={handleUpdateFont}
          memorySettings={memorySettings}
          onUpdateMemorySettings={handleUpdateMemorySettings}
          memoryApiEnabled={memoryApiEnabled}
          onToggleMemoryApi={(val) => {
            setMemoryApiEnabled(val);
            localStorage.setItem('taixujie_memory_api_enabled', String(val));
          }}
          memoryApiConfig={memoryApiConfig}
          onUpdateMemoryApiConfig={(config) => {
            setMemoryApiConfig(config);
            localStorage.setItem('taixujie_memory_api_config', JSON.stringify(config));
          }}
          tianjiSettings={tianjiSettings}
          onUpdateTianjiSettings={handleUpdateTianjiSettings}
          tianjiApiEnabled={tianjiApiEnabled}
          onToggleTianjiApi={(val) => {
            setTianjiApiEnabled(val);
            localStorage.setItem('taixujie_tianji_news_api_enabled', String(val));
          }}
          tianjiApiConfig={tianjiApiConfig}
          onUpdateTianjiApiConfig={(config) => {
            setTianjiApiConfig(config);
            localStorage.setItem('taixujie_tianji_news_api_config', JSON.stringify(config));
          }}
          variableChanges={variableChanges}
          moduleOrder={moduleOrder}
          onOpenChanges={() => setActiveModal('changes')}
          onOpenThink={() => setActiveModal('think')}
          onOpenInspect={() => setActiveModal('inspect')}
        onBranchCreate={async (id) => {
            try {
              toastr.info(`正在尝试跳转至楼层 ${id} 并创建分支...`);
              // 修正语法：/branch-create ${id} (使用位置参数，避免被误解析为0)
              await triggerSlash(`/branch-create ${id}`);

              try {
                const seq = Math.floor(id / 2);
                if (Number.isFinite(seq)) {
                  await pruneHistoryBySeq(seq);
                    await pruneTianjiNewsByFloor(Math.floor(id / 2));
                }
              } catch {
              }

              // 关闭 Modal
              setActiveModal(null);

              // 给酒馆一定的切换时间，然后刷新页面以确保获取新分支的数据
              setTimeout(() => {
                window.location.reload();
              }, 800);
            } catch (e: any) {
              toastr.error(`跳转失败: ${e.message}`);
            }
          }}
          currentAP={sys.当前行动点}
        />
      )}

      {!hasStarted && <StartScreen onStart={handleStart} />}
      {hasStarted && showTitleScreen && (
        <TitleScreen
          onStartNewGame={handleStartNewGame}
          onContinueGame={handleContinueGame}
          onExit={() => {
            try {
              if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen();
              }
            } catch {
            }
            setShowTitleScreen(false);
            setHasStarted(false);
          }}
        />
      )}

      {hasStarted && showLoadingScreen && (
        <LoadingScreen onDone={() => {
          setShowLoadingScreen(false);
          setShowSetupWizard(true);
        }} />
      )}

      {hasStarted && showSetupConfirm && (
        <SetupConfirmScreen
          message={setupDraftMessage}
          onChangeMessage={setSetupDraftMessage}
          onBack={() => {
            setShowSetupConfirm(false);
            setShowSetupWizard(true);
          }}
          onConfirm={async () => {
            setShowSetupConfirm(false);
            setShowPostLoading(true);
            const draft = setupDraftMessage.trim();
            if (draft) {
              try {
                await sendMessage(draft);
              } catch {
              }
            }
            setShowPostLoading(false);
            setHasStarted(true);
          }}
        />
      )}

      {hasStarted && showPostLoading && (
        <LoadingScreen
          title="天书校验"
          subtitle="正在写入开局命数"
          durationMs={900}
        />
      )}

      {hasStarted && showSetupWizard && (
        <SetupWizard
          onApplyStep={handleApplySetupStep}
          onComplete={async (selections) => {
            setShowSetupWizard(false);
            setSetupDraftMessage(buildSetupPrompt(selections));
            setShowSetupConfirm(true);
          }}
          onBack={() => {
            setShowSetupWizard(false);
            setShowTitleScreen(true);
          }}
        />
      )}

      {/* Overlay - 正文遮幕 */}
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-[1px] z-50 transition-opacity duration-300 ${(leftOpen || rightOpen) && !(isFullscreen && !isMobile) ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={() => {
          setLeftOpen(false);
          setRightOpen(false);
        }}
      />
    </div>
  );
};

export default App;
