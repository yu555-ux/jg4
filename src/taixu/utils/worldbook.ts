/**
 * 世界书操作相关的工具函数
 */

/**
 * 将当前消息中的 <history> 同步到世界书的“历史记录”条目中
 * @param latestHistory 消息中的历史内容
 * @param messageId 消息 ID
 */
type MemorySettings = {
  segmentedMemoryEnabled: boolean;
  segmentedChatLayers: number;
  segmentedLargeSummaryStart: number;
  deepSummaryEnabled: boolean;
  deepSummaryThreshold: number;
  largeSummaryPrompt: string;
  deepSummaryPrompt: string;
};

type MemoryApiConfig = {
  apiurl: string;
  key: string;
  model: string;
  retries: number;
};

type TianjiApiConfig = {
  apiurl: string;
  key: string;
  model: string;
  retries: number;
};

type MemorySyncOptions = {
  settings?: Partial<MemorySettings>;
  apiEnabled?: boolean;
  apiConfig?: MemoryApiConfig;
  silent?: boolean;
};

const DEFAULT_MEMORY_SETTINGS: MemorySettings = {
  segmentedMemoryEnabled: true,
  segmentedChatLayers: 20,
  segmentedLargeSummaryStart: 50,
  deepSummaryEnabled: true,
  deepSummaryThreshold: 100,
  largeSummaryPrompt: `请根据以下全部序号的小总结，严格按下述格式，每个小总结生成对应的一个大总结。

输出格式：
<sum>
序号|（和对应序号一致）
日期|（和对应序号的日期一致）
地点|（和对应序号的地点一致）
人物|（概况对应序号的在场人物和关系）
概况|（用100字概况对应序号的描述和重要信息）
伏笔|（用40字概况对应序号的伏笔和暗线）
</sum>

以下是需要总结的内容（每条包含序号与对应<history>内容）：
{{content}}`,
  deepSummaryPrompt: `你是一名专业的小说档案管理员。
请阅读 <input_data> 中的历史记录，将其归纳为“章节分卷”档案。
请按"约每10层"或"剧情小节"为单位进行归档，突出太虚界的因果线索与关键变故。

输出格式要求（仅 Key|Value 行，不要额外解释），并包裹在 <large_sum> 标签中：
<large_sum>
章节分卷|第{{range}}层
标题|...
人物|...
地点|...
标签|...
描述|...
重要信息|...
</large_sum>

<input_data>
{{input_data}}
</input_data>`
};

const MEMORY_API_CACHE_KEY = 'taixujie_memory_api_cache';
const MEMORY_LARGE_SUMMARY_KEY = 'taixujie_memory_large_summary_last_end';
const MEMORY_DEEP_SUMMARY_KEY = 'taixujie_memory_deep_summary_last_end';
const MEMORY_DEEP_SUMMARY_VOLUME_KEY = 'taixujie_memory_deep_summary_volume';
const RAW_HISTORY_INDEX_KEY = 'taixujie_raw_history_index';
const MAX_API_CALLS_PER_SYNC = 2;

const normalizeMemorySettings = (input?: Partial<MemorySettings>): MemorySettings => {
  const raw = { ...DEFAULT_MEMORY_SETTINGS, ...(input || {}) } as MemorySettings;
  const segmentedChatLayers = Math.max(0, Number(raw.segmentedChatLayers) || 0);
  const segmentedLargeSummaryStart = Math.max(0, Number(raw.segmentedLargeSummaryStart) || 0);
  const deepSummaryThreshold = Math.max(0, Number(raw.deepSummaryThreshold) || 0);
  return {
    segmentedMemoryEnabled: !!raw.segmentedMemoryEnabled,
    segmentedChatLayers,
    segmentedLargeSummaryStart,
    deepSummaryEnabled: !!raw.deepSummaryEnabled,
    deepSummaryThreshold,
    largeSummaryPrompt: raw.largeSummaryPrompt || DEFAULT_MEMORY_SETTINGS.largeSummaryPrompt,
    deepSummaryPrompt: raw.deepSummaryPrompt || DEFAULT_MEMORY_SETTINGS.deepSummaryPrompt
  };
};

const getRawEntryName = (index: number) => `历史记录${index}（原始）`;

const getCurrentRawIndex = () => {
  const raw = localStorage.getItem(RAW_HISTORY_INDEX_KEY);
  const num = raw ? Number(raw) : 0;
  return Number.isFinite(num) && num >= 0 ? num : 0;
};

const extractSeqSet = (content: string) => {
  const set = new Set<number>();
  const blocks = content.split(/\n(?=序号\|)/g).filter(b => b.trim());
  blocks.forEach(block => {
    const match = block.match(/序号\|(\d+)/);
    if (match) set.add(parseInt(match[1], 10));
  });
  return set;
};

const appendRawHistoryBlocks = async (wbName: string, blocks: string[], rawIndex: number) => {
  if (!blocks.length) return;
  await updateWorldbookWith(wbName, entries => {
    const entryName = getRawEntryName(rawIndex);
    let entry = entries.find(e => e.name === entryName);
    if (!entry) {
      entry = { name: entryName, content: '', enabled: false } as any;
      entries.push(entry);
    }
    entry.enabled = false;
    const existing = entry.content || '';
    const existingSeqs = extractSeqSet(existing);
    const toAppend = blocks.filter(block => {
      const match = block.match(/序号\|(\d+)/);
      if (!match) return false;
      const num = parseInt(match[1], 10);
      return !existingSeqs.has(num);
    });
    if (toAppend.length === 0) return entries;
    const next = existing ? `${existing}\n\n${toAppend.join('\n\n')}` : toAppend.join('\n\n');
    entry.content = next;
    return entries;
  });
};

const stripTags = (text: string) => text.replace(/<[^>]+>/g, '').trim();

const extractTagContent = (text: string, tag: string) => {
  if (!text) return '';
  const match = text.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (match && match[1]) {
    return match[1].trim();
  }
  return '';
};

const extractAllTagBlocks = (text: string, tag: string) => {
  if (!text) return [];
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const blocks: string[] = [];
  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) blocks.push(match[1].trim());
  }
  return blocks;
};

const parseHistoryKeyValues = (history: string) => {
  const normalized = (history || '').replace(/｜/g, '|');
  const lines = normalized.split('\n').map(line => line.trim()).filter(Boolean);
  const data: Record<string, string> = {};
  let currentKey: string | null = null;

  lines.forEach(line => {
    const pipeIndex = line.indexOf('|');
    const colonIndex = line.indexOf('：');
    const asciiColonIndex = line.indexOf(':');
    const hasPipe = pipeIndex !== -1;
    const hasColon = colonIndex !== -1 || asciiColonIndex !== -1;

    if (hasPipe || hasColon) {
      let key = '';
      let value = '';
      if (hasPipe) {
        key = line.slice(0, pipeIndex).trim();
        value = line.slice(pipeIndex + 1).trim();
      } else {
        const idx = colonIndex !== -1 ? colonIndex : asciiColonIndex;
        key = line.slice(0, idx).trim();
        value = line.slice(idx + 1).trim();
      }
      if (key) {
        currentKey = key;
        data[key] = value;
      }
      return;
    }

    if (currentKey) {
      data[currentKey] = data[currentKey] ? `${data[currentKey]}\n${line}` : line;
    }
  });

  return data;
};

const trimToLength = (text: string, limit: number) => {
  const cleaned = stripTags(text || '');
  if (cleaned.length <= limit) return cleaned;
  return `${cleaned.slice(0, limit)}…`;
};

const compressHistoryContent = (history: string, level: 'small' | 'large') => {
  const limit = level === 'large' ? 120 : 200;
  return trimToLength(history || '', limit);
};

const buildChapterSummary = (items: Array<{ id: number; history: string }>, volume: number) => {
  const joined = items.map(item => item.history).filter(Boolean).join('；');
  const summaryText = trimToLength(joined, 260);
  return `章节分卷|第${volume}卷\n描述|${summaryText}`;
};

const readApiCache = () => {
  try {
    const raw = localStorage.getItem(MEMORY_API_CACHE_KEY);
    if (!raw) return { large: {}, chapter: {} } as Record<string, any>;
    return JSON.parse(raw);
  } catch {
    return { large: {}, chapter: {} } as Record<string, any>;
  }
};

const writeApiCache = (cache: any) => {
  try {
    localStorage.setItem(MEMORY_API_CACHE_KEY, JSON.stringify(cache));
  } catch {
  }
};

const normalizeApiUrl = (raw: string) => {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  if (/\/v1\/?$/.test(trimmed)) return trimmed.replace(/\/$/, '');
  return `${trimmed.replace(/\/$/, '')}/v1`;
};

const buildMemoryCustomApi = (apiConfig?: MemoryApiConfig) => {
  if (!apiConfig?.apiurl?.trim()) return null;
  const normalizedUrl = normalizeApiUrl(apiConfig.apiurl);
  if (!normalizedUrl) return null;
  return {
    apiurl: normalizedUrl,
    key: apiConfig.key?.trim(),
    model: apiConfig.model || 'gpt-4o-mini',
    source: 'openai'
  };
};

const callMemoryApi = async (prompt: string, apiConfig?: MemoryApiConfig, retries = 0) => {
  const customApi = buildMemoryCustomApi(apiConfig);
  if (!customApi) return '';
  let lastError: any = null;
  for (let i = 0; i <= retries; i += 1) {
    try {
      const raw = await generateRaw({
        user_input: prompt,
        ordered_prompts: ['user_input'],
        custom_api: customApi
      });
      return raw || '';
    } catch (error: any) {
      lastError = error;
      if (i === retries) {
        throw error;
      }
    }
  }
  if (lastError) {
    throw lastError;
  }
  return '';
};

const buildTianjiCustomApi = (apiConfig?: TianjiApiConfig) => {
  if (!apiConfig?.apiurl?.trim()) return null;
  const normalizedUrl = normalizeApiUrl(apiConfig.apiurl);
  if (!normalizedUrl) return null;
  return {
    apiurl: normalizedUrl,
    key: apiConfig.key?.trim(),
    model: apiConfig.model || 'gpt-4o-mini',
    source: 'openai'
  };
};

const callTianjiApi = async (prompt: string, apiConfig?: TianjiApiConfig, retries = 0) => {
  const customApi = buildTianjiCustomApi(apiConfig);
  if (!customApi) return '';
  let lastError: any = null;
  for (let i = 0; i <= retries; i += 1) {
    try {
      const raw = await generateRaw({
        user_input: prompt,
        ordered_prompts: ['user_input'],
        custom_api: customApi
      });
      return raw || '';
    } catch (error: any) {
      lastError = error;
      if (i === retries) {
        throw error;
      }
    }
  }
  if (lastError) {
    throw lastError;
  }
  return '';
};

const applyMemoryPolicy = async (
  historyMap: Map<number, string>,
  settings: MemorySettings,
  apiEnabled?: boolean,
  apiConfig?: MemoryApiConfig,
  currentFloor?: number,
  wbName?: string,
  options?: { forceLargeEnd?: number; forceDeepEnd?: number; bypassLastEnd?: boolean }
) => {
  if (!settings.segmentedMemoryEnabled) return {
    largeSummaryUpdated: false,
    deepSummaryUpdated: false,
    largeSummaryAttempted: false,
    deepSummaryAttempted: false,
    largeSummaryFailed: false,
    deepSummaryFailed: false,
    largeSummaryShouldTrigger: false,
    deepSummaryShouldTrigger: false,
    largeSummarySkipped: false,
    deepSummarySkipped: false
  };

  const sortedNumsAsc = Array.from(historyMap.keys()).sort((a, b) => a - b);
  const total = sortedNumsAsc.length;
  if (total === 0) return {
    largeSummaryUpdated: false,
    deepSummaryUpdated: false,
    largeSummaryAttempted: false,
    deepSummaryAttempted: false,
    largeSummaryFailed: false,
    deepSummaryFailed: false,
    largeSummaryShouldTrigger: false,
    deepSummaryShouldTrigger: false,
    largeSummarySkipped: false,
    deepSummarySkipped: false
  };

  const keepRecent = settings.segmentedChatLayers;
  const largeInterval = settings.segmentedLargeSummaryStart;
  const apiCache = apiEnabled ? readApiCache() : null;
  let apiCallCount = 0;
  let largeSummaryUpdated = false;
  let deepSummaryUpdated = false;
  let largeSummaryAttempted = false;
  let deepSummaryAttempted = false;
  let largeSummaryFailed = false;
  let deepSummaryFailed = false;
  let largeSummaryShouldTrigger = false;
  let deepSummaryShouldTrigger = false;
  let largeSummarySkipped = false;
  let deepSummarySkipped = false;

  // Interval-based large summary trigger (protect latest N floors)
  const largeEnd =
    typeof options?.forceLargeEnd === 'number' ? options.forceLargeEnd : currentFloor;
  const shouldLargeTrigger =
    typeof largeEnd === 'number' &&
    largeInterval > 0 &&
    largeEnd >= 0 &&
    (typeof options?.forceLargeEnd === 'number' ||
      (largeEnd > 0 && largeEnd % largeInterval === 0));

  if (shouldLargeTrigger) {
    largeSummaryShouldTrigger = true;
    const lastEndRaw = localStorage.getItem(MEMORY_LARGE_SUMMARY_KEY);
    const lastEnd = lastEndRaw ? Number(lastEndRaw) : -1;
    if (!options?.bypassLastEnd && Number.isFinite(lastEnd) && lastEnd === largeEnd) {
      largeSummarySkipped = true;
      return {
        largeSummaryUpdated,
        deepSummaryUpdated,
        largeSummaryAttempted,
        deepSummaryAttempted,
        largeSummaryFailed,
        deepSummaryFailed,
        largeSummaryShouldTrigger,
        deepSummaryShouldTrigger,
        largeSummarySkipped,
        deepSummarySkipped
      };
    }
    const start = largeEnd - largeInterval + 1;
    const end = largeEnd;
    // Protect latest N floors from compression (only skip overlapping numbers)
    let protectedSet = new Set<number>();
    if (keepRecent > 0) {
      const recentNums = sortedNumsAsc.slice(Math.max(0, total - keepRecent));
      protectedSet = new Set(recentNums);
    }
    const rangeNums = [];
    for (let i = start; i <= end; i += 1) {
      if (historyMap.has(i)) rangeNums.push(i);
    }

    const eligibleNums = rangeNums.filter(num => !protectedSet.has(num));
    if (eligibleNums.length === 0) {
      largeSummarySkipped = true;
      return {
        largeSummaryUpdated,
        deepSummaryUpdated,
        largeSummaryAttempted,
        deepSummaryAttempted,
        largeSummaryFailed,
        deepSummaryFailed,
        largeSummaryShouldTrigger,
        deepSummaryShouldTrigger,
        largeSummarySkipped,
        deepSummarySkipped
      };
    }
    largeSummaryAttempted = true;

    if (wbName) {
      const rawBlocks = eligibleNums.map(num => historyMap.get(num)).filter(Boolean) as string[];
      await appendRawHistoryBlocks(wbName, rawBlocks, getCurrentRawIndex());
    }

    let apiSucceeded = false;
    if (rangeNums.length === largeInterval && apiEnabled && apiCache && apiCallCount < MAX_API_CALLS_PER_SYNC) {
      const items = eligibleNums
        .map(num => historyMap.get(num) || '')
        .filter(Boolean)
        .join('\n\n');

      const promptTemplate = settings.largeSummaryPrompt || DEFAULT_MEMORY_SETTINGS.largeSummaryPrompt;
      const prompt = promptTemplate.includes('{{content}}')
        ? promptTemplate.replace(/\{\{content\}\}/g, items)
        : `${promptTemplate}\n\n${items}`;

      try {
        const raw = await callMemoryApi(prompt, apiConfig, Math.max(0, Math.min(10, Number(apiConfig?.retries) || 0)));
        const blocks = extractAllTagBlocks(raw, 'sum');
        const map = new Map<number, string>();
        blocks.forEach(block => {
          const match = block.match(/序号\|(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            const cleaned = block.replace(/^序号\|\d+\n?/, '').trim();
            if (cleaned) map.set(num, cleaned);
          }
        });

        eligibleNums.forEach(num => {
          if (map.has(num)) {
            historyMap.set(num, `序号|${num}\n${map.get(num)}`);
            apiCache.large[num] = true;
          }
        });
        apiCallCount += 1;
        apiSucceeded = map.size > 0;
      } catch {
      }
    }

    if (!apiSucceeded) {
      eligibleNums.forEach(num => {
        const block = historyMap.get(num) || '';
        const content = block.replace(/^序号\|\d+\n?/, '');
        historyMap.set(num, `序号|${num}\n${compressHistoryContent(content, 'large')}`);
      });
    }

    largeSummaryUpdated = true;
    localStorage.setItem(MEMORY_LARGE_SUMMARY_KEY, String(largeEnd));
  }

  // No additional fallback compression here; interval-triggered large summary handles compression.

  if (!settings.deepSummaryEnabled || settings.deepSummaryThreshold <= 0 || total < settings.deepSummaryThreshold) {
    if (apiCache && apiCallCount > 0) {
      writeApiCache(apiCache);
    }
    return {
      largeSummaryUpdated,
      deepSummaryUpdated,
      largeSummaryAttempted,
      deepSummaryAttempted,
      largeSummaryFailed,
      deepSummaryFailed,
      largeSummaryShouldTrigger,
      deepSummaryShouldTrigger,
      largeSummarySkipped,
      deepSummarySkipped
    };
  }

  const deepInterval = settings.deepSummaryThreshold;
  const deepEnd =
    typeof options?.forceDeepEnd === 'number' ? options.forceDeepEnd : currentFloor;
  const shouldDeepTrigger =
    typeof deepEnd === 'number' &&
    deepInterval > 0 &&
    deepEnd >= 0 &&
    (typeof options?.forceDeepEnd === 'number' ||
      (deepEnd > 0 && deepEnd % deepInterval === 0));

  if (shouldDeepTrigger) {
    deepSummaryShouldTrigger = true;
    const lastEndRaw = localStorage.getItem(MEMORY_DEEP_SUMMARY_KEY);
    const lastEnd = lastEndRaw ? Number(lastEndRaw) : -1;
    if (!options?.bypassLastEnd && Number.isFinite(lastEnd) && lastEnd === deepEnd) {
      deepSummarySkipped = true;
      return {
        largeSummaryUpdated,
        deepSummaryUpdated,
        largeSummaryAttempted,
        deepSummaryAttempted,
        largeSummaryFailed,
        deepSummaryFailed,
        largeSummaryShouldTrigger,
        deepSummaryShouldTrigger,
        largeSummarySkipped,
        deepSummarySkipped
      };
    }

    const start = deepEnd - deepInterval + 1;
    const end = deepEnd;
    const rangeNums: number[] = [];
    for (let i = start; i <= end; i += 1) {
      if (historyMap.has(i)) rangeNums.push(i);
    }
    if (rangeNums.length === 0) {
      deepSummarySkipped = true;
      return {
        largeSummaryUpdated,
        deepSummaryUpdated,
        largeSummaryAttempted,
        deepSummaryAttempted,
        largeSummaryFailed,
        deepSummaryFailed,
        largeSummaryShouldTrigger,
        deepSummaryShouldTrigger,
        largeSummarySkipped,
        deepSummarySkipped
      };
    }

    const protectedSet = keepRecent > 0
      ? new Set(sortedNumsAsc.slice(Math.max(0, total - keepRecent)))
      : new Set<number>();
    const eligibleNums = rangeNums.filter(num => !protectedSet.has(num));
    if (eligibleNums.length === 0) {
      deepSummarySkipped = true;
      return {
        largeSummaryUpdated,
        deepSummaryUpdated,
        largeSummaryAttempted,
        deepSummaryAttempted,
        largeSummaryFailed,
        deepSummaryFailed,
        largeSummaryShouldTrigger,
        deepSummaryShouldTrigger,
        largeSummarySkipped,
        deepSummarySkipped
      };
    }
    deepSummaryAttempted = true;

    const anchorNum = eligibleNums[0];
    const anchorBlock = historyMap.get(anchorNum) || '';
    if (anchorBlock.includes('章节分卷|第')) {
      deepSummarySkipped = true;
      return {
        largeSummaryUpdated,
        deepSummaryUpdated,
        largeSummaryAttempted,
        deepSummaryAttempted,
        largeSummaryFailed,
        deepSummaryFailed,
        largeSummaryShouldTrigger,
        deepSummaryShouldTrigger,
        largeSummarySkipped,
        deepSummarySkipped
      };
    }

    const items = eligibleNums.map(num => {
      const block = historyMap.get(num) || '';
      const content = block.replace(/^序号\|\d+\n?/, '');
      return { id: num, history: content };
    });

    let chapterContent = '';
    if (wbName) {
      const rawBlocks = eligibleNums.map(num => historyMap.get(num)).filter(Boolean) as string[];
      await appendRawHistoryBlocks(wbName, rawBlocks, getCurrentRawIndex());
    }

    let apiSucceeded = false;
    if (apiEnabled && apiCache && !apiCache.chapter?.[`${start}-${end}`] && apiCallCount < MAX_API_CALLS_PER_SYNC) {
      const inputText = eligibleNums.map(num => historyMap.get(num) || '').filter(Boolean).join('\n\n');
      const promptTemplate = settings.deepSummaryPrompt || DEFAULT_MEMORY_SETTINGS.deepSummaryPrompt;
      let prompt = promptTemplate;
      const volumeRaw = localStorage.getItem(MEMORY_DEEP_SUMMARY_VOLUME_KEY);
      const volume = volumeRaw ? Number(volumeRaw) : 1;
      prompt = prompt.replace(/\{\{range\}\}/g, `${start}-${end}`);
      prompt = prompt.replace(/\{\{volume\}\}/g, String(volume));
      if (prompt.includes('{{input_data}}')) {
        prompt = prompt.replace(/\{\{input_data\}\}/g, inputText);
      } else if (prompt.includes('{{content}}')) {
        prompt = prompt.replace(/\{\{content\}\}/g, inputText);
      } else {
        prompt = `${prompt}\n\n${inputText}`;
      }
      try {
        const raw = await callMemoryApi(prompt, apiConfig, Math.max(0, Math.min(10, Number(apiConfig?.retries) || 0)));
        const cleaned = extractTagContent(raw, 'large_sum') || stripTags(raw);
        if (cleaned) {
          chapterContent = cleaned.split('\n').map(line => line.trim()).filter(Boolean).join('\n');
          apiCache.chapter[`${start}-${end}`] = true;
          apiCallCount += 1;
          apiSucceeded = true;
        }
      } catch {
      }
    }

    if (!chapterContent) {
      const volumeRaw = localStorage.getItem(MEMORY_DEEP_SUMMARY_VOLUME_KEY);
      const volume = volumeRaw ? Number(volumeRaw) : 1;
      chapterContent = buildChapterSummary(items, volume);
    }

    historyMap.set(anchorNum, `序号|${anchorNum}\n${chapterContent}`);
    eligibleNums.slice(1).forEach(num => historyMap.delete(num));
    deepSummaryUpdated = true;
    const currentVolumeRaw = localStorage.getItem(MEMORY_DEEP_SUMMARY_VOLUME_KEY);
    const currentVolume = currentVolumeRaw ? Number(currentVolumeRaw) : 1;
    localStorage.setItem(MEMORY_DEEP_SUMMARY_VOLUME_KEY, String(currentVolume + 1));
    localStorage.setItem(MEMORY_DEEP_SUMMARY_KEY, String(deepEnd));
    localStorage.setItem(RAW_HISTORY_INDEX_KEY, String(getCurrentRawIndex() + 1));

    if (!apiSucceeded && !chapterContent) {
      deepSummaryFailed = true;
    }
  }

  if (apiCache) {
    writeApiCache(apiCache);
  }
  if (largeSummaryAttempted && !largeSummaryUpdated) {
    largeSummaryFailed = true;
  }
  if (deepSummaryAttempted && !deepSummaryUpdated) {
    deepSummaryFailed = true;
  }
  return {
    largeSummaryUpdated,
    deepSummaryUpdated,
    largeSummaryAttempted,
    deepSummaryAttempted,
    largeSummaryFailed,
    deepSummaryFailed,
    largeSummaryShouldTrigger,
    deepSummaryShouldTrigger,
    largeSummarySkipped,
    deepSummarySkipped
  };
};

export const syncHistoryToWorldbook = async (
  latestHistory: string,
  messageId: number,
  options?: MemorySyncOptions
) => {
  try {
    if (!latestHistory || messageId === undefined) return;

    const floorNum = Math.floor(messageId / 2);
    let latestFloor: number | null = null;
    try {
      const latestMessageId = getLastMessageId();
      if (latestMessageId >= 0) {
        latestFloor = Math.floor(latestMessageId / 2);
      }
    } catch {
    }
    let wbName = getChatWorldbookName('current');

    // 如果没有当前聊天的专用世界书，尝试查找名为“太虚界”的世界书
    if (!wbName) {
      const allWbNames = getWorldbookNames();
      wbName = allWbNames.find((name: string) => name.includes('太虚界')) || null;
    }

    if (!wbName) return;

    if (messageId === 0) {
      await updateWorldbookWith(wbName, entries => {
        return entries.filter(e => !(typeof e.name === 'string' && /历史记录\d+（原始）/.test(e.name)));
      });
    }

    let entryContent: string | null = null;
    let entryName: string | null = null;

    await updateWorldbookWith(wbName, (entries) => {
      let entry = entries.find(e => e.name === '历史记录');
      if (!entry) entry = entries.find(e => e.name.includes('历史'));
      if (!entry) return entries;
      entryContent = entry.content || '';
      entryName = entry.name;
      return entries;
    });

    if (!entryContent || !entryName) return;

    const blocks = entryContent.split(/\n(?=序号\|)/g).filter(b => b.trim());
    const historyMap = new Map<number, string>();

    blocks.forEach(block => {
      const match = block.match(/序号\|(\d+)/);
      if (match) historyMap.set(parseInt(match[1], 10), block.trim());
    });

    const existingNums = Array.from(historyMap.keys());
    const maxFloorInMap = existingNums.length > 0 ? Math.max(...existingNums) : -1;

    const shouldPruneNewer =
      typeof latestFloor === 'number' ? floorNum >= latestFloor : maxFloorInMap <= floorNum;
    if (shouldPruneNewer && maxFloorInMap >= floorNum) {
      for (const num of existingNums) {
        if (num >= floorNum) historyMap.delete(num);
      }
    }

    let normalizedHistory = latestHistory.trim();
    // 序号由前端计算并强制写入（基于楼层/2）
    normalizedHistory = normalizedHistory.replace(/^序号\|\d+\n?/, '');
    const finalEntry = `序号|${floorNum}\n${normalizedHistory}`;
    historyMap.set(floorNum, finalEntry);

    const settings = normalizeMemorySettings(options?.settings);
    const result = await applyMemoryPolicy(historyMap, settings, options?.apiEnabled, options?.apiConfig, floorNum, wbName);

    const sortedNums = Array.from(historyMap.keys()).sort((a, b) => b - a);
    const newContent = sortedNums.map(n => historyMap.get(n)).join('\n\n');

    await updateWorldbookWith(wbName, (entries) => {
      let entry = entries.find(e => e.name === entryName);
      if (!entry) entry = entries.find(e => e.name === '历史记录') || entries.find(e => e.name.includes('历史'));
      if (!entry) return entries;
      entry.content = newContent;
      return entries;
    });
    if (result?.largeSummaryUpdated) {
      try {
        toastr.success('历史总结已全部压缩');
      } catch {
      }
    }
    if (result?.deepSummaryUpdated) {
      try {
        toastr.success('章节分卷已完成并写入历史记录');
      } catch {
      }
    }
    if (result?.largeSummaryShouldTrigger && !result?.largeSummaryUpdated && !result?.largeSummarySkipped) {
      try {
        toastr.error('历史压缩失败');
      } catch {
      }
    }
    if (result?.deepSummaryShouldTrigger && !result?.deepSummaryUpdated && !result?.deepSummarySkipped) {
      try {
        toastr.error('章节分卷失败');
      } catch {
      }
    }
  } catch {
  }
};

export const runManualLargeSummary = async (options?: MemorySyncOptions) => {
  const wbName = resolveTaixujieWorldbookName();
  if (!wbName) return { updated: false, skipped: true };

  let entryContent: string | null = null;
  let entryName: string | null = null;
  await updateWorldbookWith(wbName, entries => {
    let entry = entries.find(e => e.name === '历史记录');
    if (!entry) entry = entries.find(e => e.name?.includes('历史'));
    if (!entry) return entries;
    entryContent = entry.content || '';
    entryName = entry.name;
    return entries;
  });

  if (!entryContent || !entryName) return { updated: false, skipped: true };

  const blocks = entryContent.split(/\n(?=序号\|)/g).filter(b => b.trim());
  const historyMap = new Map<number, string>();
  blocks.forEach(block => {
    const match = block.match(/序号\|(\d+)/);
    if (match) historyMap.set(parseInt(match[1], 10), block.trim());
  });

  const nums = Array.from(historyMap.keys());
  if (nums.length === 0) return { updated: false, skipped: true };
  const currentFloor = Math.max(...nums);

  const settings = normalizeMemorySettings(options?.settings);
  const result = await applyMemoryPolicy(
    historyMap,
    settings,
    options?.apiEnabled,
    options?.apiConfig,
    currentFloor,
    wbName,
    { forceLargeEnd: currentFloor, bypassLastEnd: true }
  );

  const sortedNums = Array.from(historyMap.keys()).sort((a, b) => b - a);
  const newContent = sortedNums.map(n => historyMap.get(n)).join('\n\n');
  await updateWorldbookWith(wbName, entries => {
    let entry = entries.find(e => e.name === entryName);
    if (!entry) entry = entries.find(e => e.name === '历史记录') || entries.find(e => e.name?.includes('历史'));
    if (!entry) return entries;
    entry.content = newContent;
    return entries;
  });

  return {
    updated: !!result?.largeSummaryUpdated,
    skipped: !!result?.largeSummarySkipped,
    result
  };
};

export const runManualDeepSummary = async (options?: MemorySyncOptions) => {
  const wbName = resolveTaixujieWorldbookName();
  if (!wbName) return { updated: false, skipped: true };

  let entryContent: string | null = null;
  let entryName: string | null = null;
  await updateWorldbookWith(wbName, entries => {
    let entry = entries.find(e => e.name === '历史记录');
    if (!entry) entry = entries.find(e => e.name?.includes('历史'));
    if (!entry) return entries;
    entryContent = entry.content || '';
    entryName = entry.name;
    return entries;
  });

  if (!entryContent || !entryName) return { updated: false, skipped: true };

  const blocks = entryContent.split(/\n(?=序号\|)/g).filter(b => b.trim());
  const historyMap = new Map<number, string>();
  blocks.forEach(block => {
    const match = block.match(/序号\|(\d+)/);
    if (match) historyMap.set(parseInt(match[1], 10), block.trim());
  });

  const nums = Array.from(historyMap.keys());
  if (nums.length === 0) return { updated: false, skipped: true };
  const currentFloor = Math.max(...nums);

  const settings = normalizeMemorySettings(options?.settings);
  const result = await applyMemoryPolicy(
    historyMap,
    settings,
    options?.apiEnabled,
    options?.apiConfig,
    currentFloor,
    wbName,
    { forceDeepEnd: currentFloor, bypassLastEnd: true }
  );

  const sortedNums = Array.from(historyMap.keys()).sort((a, b) => b - a);
  const newContent = sortedNums.map(n => historyMap.get(n)).join('\n\n');
  await updateWorldbookWith(wbName, entries => {
    let entry = entries.find(e => e.name === entryName);
    if (!entry) entry = entries.find(e => e.name === '历史记录') || entries.find(e => e.name?.includes('历史'));
    if (!entry) return entries;
    entry.content = newContent;
    return entries;
  });

  return {
    updated: !!result?.deepSummaryUpdated,
    skipped: !!result?.deepSummarySkipped,
    result
  };
};

const resolveTaixujieWorldbookName = () => {
  let wbName = getChatWorldbookName('current');
  if (wbName) return wbName;
  const allWbNames = getWorldbookNames();
  return allWbNames.find((name: string) => name.includes('太虚界')) || null;
};

export const parseWorldbookHistory = (content: string) => {
  const blocks = content
    .split(/\n(?=序号\|)/g)
    .map(block => block.trim())
    .filter(Boolean);

  return blocks
    .map(block => {
      const match = block.match(/序号\|(\d+)/);
      const id = match ? parseInt(match[1], 10) : -1;
      return { id, history: block, role: 'assistant' };
    })
    .filter(item => item.id >= 0 && item.history.length > 0)
    .sort((a, b) => b.id - a.id);
};

export const getRawWorldbookHistoryMap = async () => {
  try {
    const wbName = resolveTaixujieWorldbookName();
    if (!wbName) return new Map<number, string>();
    let rawContents: string[] = [];
    await updateWorldbookWith(wbName, entries => {
      rawContents = entries
        .filter(e => typeof e.name === 'string' && /历史记录\d+（原始）/.test(e.name))
        .map(e => e.content || '');
      return entries;
    });
    const map = new Map<number, string>();
    rawContents.forEach(content => {
      const blocks = content.split(/\n(?=序号\|)/g).map(b => b.trim()).filter(Boolean);
      blocks.forEach(block => {
        const match = block.match(/序号\|(\d+)/);
        if (match) {
          const id = parseInt(match[1], 10);
          map.set(id, block);
        }
      });
    });
    return map;
  } catch {
    return new Map<number, string>();
  }
};

export const mergeHistoryWithRaw = (
  compressed: Array<{ id: number; history: string; role: string }>,
  rawMap: Map<number, string>,
  keepRecent: number
) => {
  const compressedMap = new Map<number, { id: number; history: string; role: string }>();
  compressed.forEach(item => compressedMap.set(item.id, item));
  const allIds = new Set<number>([...compressedMap.keys(), ...rawMap.keys()]);
  if (allIds.size === 0) return [];
  const maxId = Math.max(...Array.from(allIds.values()));
  const minRecent = keepRecent > 0 ? Math.max(0, maxId - keepRecent + 1) : Infinity;

  const merged: Array<{ id: number; history: string; role: string }> = [];
  allIds.forEach(id => {
    if (id >= minRecent && rawMap.has(id)) {
      merged.push({ id, history: rawMap.get(id) as string, role: 'assistant' });
      return;
    }
    if (compressedMap.has(id)) {
      merged.push(compressedMap.get(id) as any);
    } else if (rawMap.has(id)) {
      merged.push({ id, history: rawMap.get(id) as string, role: 'assistant' });
    }
  });

  return merged.sort((a, b) => b.id - a.id);
};

export const getWorldbookEntryContents = async (names: string[]) => {
  try {
    const wbName = resolveTaixujieWorldbookName();
    if (!wbName) return {} as Record<string, string>;
    const result: Record<string, string> = {};
    await updateWorldbookWith(wbName, entries => {
      names.forEach(name => {
        const entry = entries.find(e => e.name === name) || entries.find(e => e.name?.includes(name));
        if (entry) result[name] = entry.content || '';
      });
      return entries;
    });
    return result;
  } catch {
    return {} as Record<string, string>;
  }
};

export const listWorldbookEntryNames = async () => {
  try {
    const wbName = resolveTaixujieWorldbookName();
    if (!wbName) return [] as string[];
    let names: string[] = [];
    await updateWorldbookWith(wbName, entries => {
      names = entries
        .map(e => (typeof e.name === 'string' ? e.name.trim() : ''))
        .filter(Boolean);
      return entries;
    });
    return names;
  } catch {
    return [] as string[];
  }
};

// 只启用选中的宿主条目，其余 [宿主]xx 条目全部禁用
export const setActiveHostWorldbookEntry = async (hostName: string) => {
  try {
    const wbName = resolveTaixujieWorldbookName();
    if (!wbName) return;
    await updateWorldbookWith(wbName, entries => {
      entries.forEach((entry: any) => {
        if (typeof entry.name === 'string' && entry.name.startsWith('[宿主]')) {
          entry.enabled = entry.name === `[宿主]${hostName}`;
        }
      });
      return entries;
    });
  } catch {
  }
};

type ModeName = '爽文' | '普通' | '困难';

// 难度互斥，色色模式可独立开关
export const setModeWorldbookEntries = async (mode: ModeName, sexyEnabled: boolean) => {
  try {
    const wbName = resolveTaixujieWorldbookName();
    if (!wbName) return;
    await updateWorldbookWith(wbName, entries => {
      entries.forEach((entry: any) => {
        if (typeof entry.name !== 'string') return;
        if (entry.name === `[模式]爽文` || entry.name === `[模式]普通` || entry.name === `[模式]困难`) {
          entry.enabled = entry.name === `[模式]${mode}`;
          return;
        }
        if (entry.name === `[模式]色色`) {
          entry.enabled = !!sexyEnabled;
        }
      });
      return entries;
    });
  } catch {
  }
};

const DEFAULT_TIANJI_REFERENCE_ENTRIES = [
  '[太虚界]太初天道总纲',
  '[太虚界]主要地图',
  '[太虚界]宗门速览',
  '[太虚界]邪物体系',
  '[太虚界]外道孽种体系',
  '[太虚界]境界体系'
];

const parseSelectedFaction = (raw: string) => {
  if (!raw) return null;
  const trimmed = raw.trim();
  try {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (typeof parsed?.selected_faction === 'string') {
        return parsed.selected_faction.trim();
      }
      if (typeof parsed?.faction === 'string') {
        return parsed.faction.trim();
      }
    }
  } catch {
  }

  const keyMatch = trimmed.match(/selected_faction\s*[:=]\s*([^\s,\n]+)/i);
  if (keyMatch) return keyMatch[1].replace(/["']/g, '').trim();
  const bracketMatch = trimmed.match(/\[势力\]([^\s,\n]+)/);
  if (bracketMatch) return bracketMatch[1].trim();
  return null;
};

export const runTianjiNewsWithFactionSelection = async (options?: {
  apiConfig?: TianjiApiConfig;
  referenceEntries?: string[];
  selectionPrompt?: string;
  generationPrompt?: string;
  presetText?: string;
  maintext?: string;
}) => {
  const referenceEntries = options?.referenceEntries?.length
    ? options.referenceEntries
    : DEFAULT_TIANJI_REFERENCE_ENTRIES;
  const refContents = await getWorldbookEntryContents(referenceEntries);
  const referenceContext = referenceEntries
    .map((name) => `【${name}】\n${refContents[name] || ''}`)
    .join('\n\n');
  const maintextBlock = options?.maintext
    ? `<maintext>\n${options.maintext}\n</maintext>`
    : '<maintext>\n\n</maintext>';

  const presetPrefix = options?.presetText ? `${options.presetText}\n\n` : '';
  const selectionPrompt = options?.selectionPrompt || [
    presetPrefix,
    maintextBlock,
    '你将根据<参考资料>决定是否需要额外读取某个势力条目。',
    '若需要，请输出 JSON：{"selected_faction":"势力名"}；若不需要，输出 {"selected_faction":"none"}。',
    '请只输出 JSON。'
  ].join('\n');

  const selectionRaw = await callTianjiApi(
    `${selectionPrompt}\n\n<参考资料>\n${referenceContext}\n</参考资料>`,
    options?.apiConfig,
    options?.apiConfig?.retries ?? 0
  );
  let selectedFaction = parseSelectedFaction(selectionRaw);
  if (selectedFaction && selectedFaction.toLowerCase() === 'none') {
    selectedFaction = null;
  }
  if (selectedFaction && selectedFaction.startsWith('[势力]')) {
    selectedFaction = selectedFaction.slice('[势力]'.length).trim();
  }

  let factionContext = '';
  if (selectedFaction) {
    const entryName = `[势力]${selectedFaction}`;
    const factionContents = await getWorldbookEntryContents([entryName]);
    factionContext = factionContents[entryName] || '';
  }

  const generationPrompt = options?.generationPrompt || [
    presetPrefix,
    maintextBlock,
    '你是天下大事记录者，请根据<参考资料>与可选的<势力资料>生成天下大事。',
    '若<势力资料>为空，则忽略之。',
    '只输出一个事件，并包裹在<event>...</event>中；不要输出<thinking>。'
  ].join('\n');

  const finalPrompt = [
    generationPrompt,
    '<参考资料>',
    referenceContext,
    '</参考资料>',
    '<势力资料>',
    factionContext,
    '</势力资料>'
  ].join('\n');

  const output = await callTianjiApi(
    finalPrompt,
    options?.apiConfig,
    options?.apiConfig?.retries ?? 0
  );
  const rawText = output || '';
  const hasError = /(请求失败|No capacity|rate limit|错误|Error|失败)/i.test(rawText);
  const extractedEvent = extractTagContent(rawText, 'event');
  const singleOutput = extractedEvent || '';

  return {
    selectedFaction,
    selectionRaw,
    referenceContext,
    factionContext,
    output: singleOutput,
    error: hasError || !extractedEvent
  };
};

const normalizeTianjiBlock = (block: string) => {
  return (block || '').replace(/<\/?event>/gi, '').trim();
};

const splitTianjiBlocks = (content: string) => {
  const normalized = normalizeTianjiBlock(content);
  if (!normalized) return [];
  return normalized.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
};

const extractTianjiFloor = (block: string) => {
  const match = (block || '').match(/楼层\|(\d+)/);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  return Number.isFinite(num) ? num : null;
};

const insertFloorAfterSeq = (block: string, floor?: number) => {
  if (!block) return '';
  if (!Number.isFinite(floor as number)) return block;
  const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
  const floorLine = `楼层|${floor}`;
  if (lines.some(line => line.startsWith('楼层|'))) {
    return lines.join('\n');
  }
  const seqIndex = lines.findIndex(line => line.startsWith('序号|'));
  if (seqIndex === -1) {
    return [...lines, floorLine].join('\n');
  }
  const next = [...lines];
  next.splice(seqIndex + 1, 0, floorLine);
  return next.join('\n');
};

const ensureFirstSeqZero = (block: string) => {
  const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
  const seqIndex = lines.findIndex(line => line.startsWith('序号|'));
  if (seqIndex === -1) return block;
  const value = lines[seqIndex].slice('序号|'.length).trim();
  if (value === '0') return lines.join('\n');
  lines[seqIndex] = '序号|0';
  return lines.join('\n');
};

const upsertTianjiSeq = (block: string, seq: number) => {
  const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
  const seqIndex = lines.findIndex(line => line.startsWith('序号|'));
  if (seqIndex === -1) {
    return [`序号|${seq}`, ...lines].join('\n');
  }
  const next = [...lines];
  next[seqIndex] = `序号|${seq}`;
  return next.join('\n');
};

export const writeTianjiNewsEntry = async (
  content: string,
  options?: { keepCount?: number; floor?: number }
) => {
  const wbName = resolveTaixujieWorldbookName();
  if (!wbName) return false;
  const entryName = '[天机阁]天下大事';
  await updateWorldbookWith(wbName, entries => {
    let entry = entries.find(e => e.name === entryName);
    if (!entry) {
      entry = { name: entryName, content: '', enabled: true } as any;
      entries.push(entry);
    }
    entry.enabled = true;
    const existingBlocks = splitTianjiBlocks(entry.content || '');
    const cleanedNew = normalizeTianjiBlock(content || '');
    const normalizedNew = cleanedNew;
    const newBlock = normalizedNew
      ? insertFloorAfterSeq(normalizedNew, options?.floor)
      : '';
    const allBlocks = newBlock ? [...existingBlocks, newBlock] : existingBlocks;

    const keepCount = Math.max(1, Number(options?.keepCount) || 1);
    const sorted = allBlocks
      .map(block => ({
        block,
        floor: extractTianjiFloor(block) ?? 0
      }))
      .sort((a, b) => a.floor - b.floor)
      .map(item => item.block);
    const trimmed = sorted.slice(-keepCount);
    const renumbered = trimmed.map((block, idx) => upsertTianjiSeq(block, idx));
    entry.content = renumbered.join('\n\n');
    console.info('[TianjiWrite] write entry', {
      keepCount,
      floor: options?.floor,
      existingBlocks: existingBlocks.length,
      wroteBlock: !!newBlock
    });
    return entries;
  });
  return true;
};

const extractTianjiSeq = (block: string) => {
  const match = (block || '').match(/序号\|(\d+)/);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  return Number.isFinite(num) ? num : null;
};

export const pruneTianjiNewsBySeq = async (maxSeq: number) => {
  const wbName = resolveTaixujieWorldbookName();
  if (!wbName) return false;
  const entryName = '[天机阁]天下大事';
  await updateWorldbookWith(wbName, entries => {
    const entry = entries.find(e => e.name === entryName);
    if (!entry) return entries;
    const blocks = splitTianjiBlocks(entry.content || '');
    const kept = blocks.filter(block => {
      const seq = extractTianjiSeq(block);
      if (seq === null) return true;
      return seq <= maxSeq;
    });
    entry.content = kept.join('\n\n');
    return entries;
  });
  return true;
};

export const pruneTianjiNewsByFloor = async (maxFloor: number) => {
  const wbName = resolveTaixujieWorldbookName();
  if (!wbName) return false;
  const entryName = '[天机阁]天下大事';
  await updateWorldbookWith(wbName, entries => {
    const entry = entries.find(e => e.name === entryName);
    if (!entry) return entries;
    const blocks = splitTianjiBlocks(entry.content || '');
    const kept = blocks.filter(block => {
      const floor = extractTianjiFloor(block);
      if (floor === null) return true;
      return floor <= maxFloor;
    });
    entry.content = kept.join('\n\n');
    return entries;
  });
  return true;
};

export const pruneHistoryBySeq = async (maxSeq: number) => {
  const wbName = resolveTaixujieWorldbookName();
  if (!wbName) return false;
  await updateWorldbookWith(wbName, entries => {
    const entry =
      entries.find(e => e.name === '历史记录') ||
      entries.find(e => typeof e.name === 'string' && e.name.includes('历史记录'));
    if (!entry) return entries;
    const content = entry.content || '';
    const blocks = content.split(/\n(?=序号\|)/g).map(b => b.trim()).filter(Boolean);
    const kept = blocks.filter(block => {
      const match = block.match(/序号\|(\d+)/);
      if (!match) return true;
      const num = parseInt(match[1], 10);
      if (!Number.isFinite(num)) return true;
      return num <= maxSeq;
    });
    entry.content = kept.join('\n\n');
    return entries;
  });
  return true;
};

export const setMultiApiWorldbookMode = async (enabled: boolean) => {
  try {
    const wbName = resolveTaixujieWorldbookName();
    if (!wbName) {
      return { worldbook: null, updated: 0, missing: [] as string[] };
    }

    const enableNames = new Set(['多API格式']);
    const disableNames = new Set([
      '格式',
      '[mvu_update]变量更新规则',
      '[mvu_update]变量输出格式',
      '[mvu_update]依存度变化规则',
      '[mvu_update]总堕落值变化规则'
    ]);
    const missingNames = new Set<string>([...enableNames, ...disableNames]);

    await updateWorldbookWith(wbName, entries => {
      return entries.map(entry => {
        if (enableNames.has(entry.name)) {
          missingNames.delete(entry.name);
          return { ...entry, enabled };
        }
        if (disableNames.has(entry.name)) {
          missingNames.delete(entry.name);
          return { ...entry, enabled: !enabled };
        }
        return entry;
      });
    });

    return {
      worldbook: wbName,
      updated: enableNames.size + disableNames.size - missingNames.size,
      missing: Array.from(missingNames)
    };
  } catch {
    return { worldbook: null, updated: 0, missing: [] as string[] };
  }
};
