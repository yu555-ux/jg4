import { useEffect, useRef, useState } from 'react';
import {
  getAllHistoryMessages,
  getReadingPages,
  loadFromLatestMessage,
  parseThinking,
  Option,
  ReadingPage
} from '../utils/messageParser';
import { getRawWorldbookHistoryMap, getWorldbookEntryContents, mergeHistoryWithRaw, parseWorldbookHistory, syncHistoryToWorldbook } from '../utils/worldbook';

export function useTavernSync(
  mvuData: any,
  activeModal: string | null,
  richTextSettings?: any,
  memorySettings?: any,
  memoryApiEnabled?: boolean,
  memoryApiConfig?: { apiurl: string; key: string; model: string; retries: number }
) {
  const [history, setHistory] = useState<Array<{ role: 'model' | 'user'; text: string }>>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [latestMessageId, setLatestMessageId] = useState<number | undefined>(undefined);
  const [userMessageId, setUserMessageId] = useState<number | undefined>(undefined);
  const [fullMessage, setFullMessage] = useState<string | undefined>(undefined);
  const [thinking, setThinking] = useState<string>('');
  const [readingMessages, setReadingMessages] = useState<any>([]);
  const [historyMessages, setHistoryMessages] = useState<Array<{ id: number; history: string; role: string }>>([]);
  const pendingHistoryRef = useRef<Map<number, { history: string; messageId: number }>>(new Map());
  const historyFlushTimerRef = useRef<any>(null);
  const historyFlushingRef = useRef(false);

  // 用于防止死循环的 Ref
  const lastProcessedRef = useRef<{ id: number | undefined, content: string }>({ id: undefined, content: '' });

  // 使用 Ref 避免事件监听器中的闭包陷阱
  const mvuDataRef = useRef(mvuData);
  useEffect(() => {
    mvuDataRef.current = mvuData;
  }, [mvuData]);

  const refreshHistoryList = () => {
    (async () => {
      let wbParsed: Array<{ id: number; history: string; role: string }> = [];
      let mergedFromRaw: Array<{ id: number; history: string; role: string }> | null = null;
      try {
        const contents = await getWorldbookEntryContents(['历史记录', '历史']);
        const content = contents['历史记录'] || contents['历史'] || '';
        wbParsed = parseWorldbookHistory(content);
        const rawMap = await getRawWorldbookHistoryMap();
        const keepRecent = Number(memorySettings?.segmentedChatLayers || 0);
        mergedFromRaw = mergeHistoryWithRaw(wbParsed, rawMap, keepRecent);
      } catch {
      }

      const localParsed = getAllHistoryMessages();
      const merged = new Map<number, { id: number; history: string; role: string }>();

      // 先放本地解析，确保完整楼层覆盖
      localParsed.forEach(item => {
        merged.set(item.id, item);
      });
      // 再放世界书解析（同楼层则覆盖，用于保留结构化修订）
      const wbList = mergedFromRaw || wbParsed;
      wbList.forEach(item => {
        merged.set(item.id, item);
      });

      const finalList = Array.from(merged.values()).sort((a, b) => b.id - a.id);
      setHistoryMessages(finalList);
    })();
  };

  const scheduleHistoryFlush = (delay = 800) => {
    if (historyFlushTimerRef.current) {
      clearTimeout(historyFlushTimerRef.current);
    }
    historyFlushTimerRef.current = setTimeout(() => {
      flushPendingHistory('timer');
    }, delay);
  };

  const enqueueHistorySync = (history: string, messageId: number) => {
    if (!history || messageId === undefined) return;
    pendingHistoryRef.current.set(messageId, { history, messageId });
    scheduleHistoryFlush();
  };

  const flushPendingHistory = async (_reason: string) => {
    if (historyFlushingRef.current) return;
    if (pendingHistoryRef.current.size === 0) return;
    historyFlushingRef.current = true;
    try {
      const pending = Array.from(pendingHistoryRef.current.values()).sort((a, b) => a.messageId - b.messageId);
      pendingHistoryRef.current.clear();
      for (const item of pending) {
        await syncHistoryToWorldbook(item.history, item.messageId, {
          settings: memorySettings,
          apiEnabled: memoryApiEnabled,
          apiConfig: memoryApiConfig,
          silent: true
        });
      }
    } catch {
    } finally {
      historyFlushingRef.current = false;
      if (pendingHistoryRef.current.size > 0) {
        scheduleHistoryFlush(300);
      }
    }
  };

  const updateFromTavern = (force = false) => {
    const { maintext, options: parsedOptions, fullMessage, messageId, userMessageId: userMsgId, role, history: latestHistory, isPending } = loadFromLatestMessage();

    // 【关键修复】只允许 assistant 角色消息进入正文历史，防止回档时的用户消息污染正文
    if (role && role !== 'assistant') {
      return;
    }

    // 【流式保护】如果正在思考中，跳过 UI 更新以防止闪烁或错误解析
    if (isPending && !fullMessage?.includes('</think>')) {
      return;
    }

    // 防止死循环：如果消息 ID 和内容都没变，跳过逻辑处理
    const currentContent = fullMessage || '';
    if (!force && lastProcessedRef.current.id === messageId && lastProcessedRef.current.content === currentContent) {
      return;
    }
    lastProcessedRef.current = { id: messageId, content: currentContent };

    // A: 流式支持
    if (maintext !== undefined) {
      setHistory([{ role: 'model', text: maintext }]);
      setOptions(parsedOptions.slice(0, 4));
      setLatestMessageId(messageId);
      setUserMessageId(userMsgId);
      setFullMessage(currentContent);
      setThinking(parseThinking(currentContent));
    } else if (fullMessage) {
      setHistory([{ role: 'model', text: fullMessage }]);
      setOptions(parsedOptions.slice(0, 4));
      setLatestMessageId(messageId);
      setUserMessageId(userMsgId);
      setFullMessage(currentContent);
      setThinking(parseThinking(currentContent));
    }

    // 如果阅读模式或读档模式开启，也同步更新
    if (activeModal === 'reading') {
      setReadingMessages({
        pages: getReadingPages(),
        richTextSettings,
        stat_data: (mvuDataRef.current && (mvuDataRef.current.stat_data || mvuDataRef.current)) || {}
      });
    }
    if (activeModal === 'history_list') {
      refreshHistoryList();
    }

    // F: 读档与回档同步
    if (fullMessage && fullMessage.includes('</history>') && latestHistory && messageId !== undefined) {
      enqueueHistorySync(latestHistory, messageId);
    }

    // B: 变量同步 (前端不再解析 Patch，交给酒馆 MVU 框架处理)
    // 仅保留事件通知或必要的副作用逻辑
  };

  useEffect(() => {
    // 初始加载
    updateFromTavern();

    // 监听酒馆消息变化事件
    const stops = [
      eventOn(tavern_events.MESSAGE_RECEIVED, updateFromTavern),
      eventOn(tavern_events.MESSAGE_UPDATED, updateFromTavern),
      eventOn(tavern_events.MESSAGE_EDITED, updateFromTavern),
      eventOn(tavern_events.CHAT_CHANGED, updateFromTavern),
      eventOn('PSEUDO_SAME_LAYER_UPDATE', () => updateFromTavern(true))
    ];

    return () => {
      stops.forEach(s => s.stop());
    };
  }, [activeModal]); // 当 modal 切换时也尝试刷新

  useEffect(() => {
    let stop: EventOnReturn | null = null;
    const init = async () => {
      try {
        if (typeof waitGlobalInitialized === 'function') {
          await waitGlobalInitialized('Mvu');
        }
        if (typeof Mvu !== 'undefined' && Mvu?.events?.VARIABLE_UPDATE_ENDED) {
          stop = eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, () => {
            flushPendingHistory('mvu');
          });
        }
      } catch {
      }
    };
    init();
    return () => {
      if (stop) stop.stop();
      if (historyFlushTimerRef.current) {
        clearTimeout(historyFlushTimerRef.current);
      }
    };
  }, [memorySettings, memoryApiEnabled, memoryApiConfig]);


  return {
    history,
    options,
    latestMessageId,
    userMessageId,
    fullMessage,
    thinking,
    readingMessages,
    historyMessages,
    updateFromTavern,
    setReadingMessages,
    setHistoryMessages
  };
}
