/**
 * 统一请求处理器
 * 处理所有类型的游戏请求：发送选项、自定义信息、招募、升级、世界穿越
 */

// 全局函数声明（由酒馆助手提供）
declare function getChatMessages(
  range: string | number,
  options?: { role?: 'all' | 'system' | 'assistant' | 'user' },
): Array<{ message: string; message_id: number; role: string; data?: Record<string, any> }>;

declare function createChatMessages(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; message: string; data?: Record<string, any> }>,
  options?: { refresh?: 'none' | 'affected' | 'all' },
): Promise<void>;

declare function deleteChatMessages(message_ids: number[], options?: { refresh?: 'none' | 'all' }): Promise<void>;

declare function getLastMessageId(): number;

declare function setChatMessages(
  chat_messages: Array<{ message_id: number; message?: string; data?: Record<string, any> }>,
  options?: { refresh?: 'none' | 'affected' | 'all' },
): Promise<void>;

declare function generate(config: { user_input?: string; should_stream?: boolean }): Promise<string>;

declare function formatAsTavernRegexedString(
  text: string,
  source: 'user_input' | 'ai_output' | 'slash_command' | 'world_info' | 'reasoning',
  destination: 'display' | 'prompt',
  options?: { depth?: number; character_name?: string },
): string;

declare function getWorldbook(
  worldbook_name: string,
): Promise<Array<{ uid: number; name: string; enabled: boolean; [key: string]: any }>>;

declare function updateWorldbookWith(
  worldbook_name: string,
  updater: (
    worldbook: Array<{ uid: number; name: string; enabled: boolean; [key: string]: any }>,
  ) => Array<{ uid: number; name: string; enabled: boolean; [key: string]: any }>,
  options?: { render?: 'debounced' | 'immediate' },
): Promise<Array<{ uid: number; name: string; enabled: boolean; [key: string]: any }>>;

// 流式事件（参考 horr / zhutiangame 实现）
declare function eventOn(event: string, callback: (...args: any[]) => void): void;
declare const iframe_events: {
  STREAM_TOKEN_RECEIVED_FULLY: 'js_stream_token_received_fully';
  GENERATION_ENDED: 'js_generation_ended';
};

export type RequestType = 'option' | 'custom' | 'recruit' | 'upgrade' | 'world-travel' | 'guest-interact';

export interface RequestData {
  type: RequestType;
  // option: 选项文本
  // custom: 自定义文本
  // recruit: 招募信息
  // upgrade: 升级信息
  // world-travel: 世界名称
  content: string | RecruitData | UpgradeData | WorldTravelData;
}

export interface RecruitData {
  position: string;
  salary: string;
  gender: string;
  requirements?: string;
}

export interface UpgradeData {
  facilityName: string;
  facilityLevel: number;
  cost: {
    gold?: number;
    materials?: number;
  };
  description?: string;
}

export interface WorldTravelData {
  worldName: string;
}

/**
 * 获取基础 MVU 数据（用于传递到新楼层）
 * 注意：不解析消息中的 MVU 命令，让 MVU 系统自动处理
 */
async function getBaseMvuData(): Promise<any> {
  try {
    // 确保 MVU 已初始化
    await waitGlobalInitialized('Mvu');

    // 优先从 MVU 系统读取最新楼层的变量数据（确保数据是最新的）
    // 这样与 readGameData() 的读取方式保持一致
    const base = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
    console.log('📊 从 MVU 获取基础数据');

    // 返回基础数据，不进行任何解析
    return (
      base ?? {
        stat_data: {},
        display_data: {},
        delta_data: {},
      }
    );
  } catch (error) {
    console.warn('⚠️ 获取 MVU 数据失败，使用空对象:', error);
    // 如果 MVU 不可用，返回一个基本的 MVU 数据结构
    return {
      stat_data: {},
      display_data: {},
      delta_data: {},
    };
  }
}

/**
 * 构建请求提示词
 */
function buildRequestPrompt(request: RequestData): string {
  switch (request.type) {
    case 'option':
      // 发送选项：直接使用选项文本
      return typeof request.content === 'string' ? request.content : '';

    case 'custom':
      // 自定义信息：直接使用自定义文本
      return typeof request.content === 'string' ? request.content : '';

    case 'recruit': {
      // 招募：构建招募提示词
      const recruitData = request.content as RecruitData;
      const genderText =
        recruitData.gender === 'any'
          ? '不限'
          : recruitData.gender === 'male'
            ? '男性'
            : recruitData.gender === 'female'
              ? '女性'
              : '其他';
      const requirements = recruitData.requirements ? `，${recruitData.requirements}` : '';
      return `你决定招募一名${recruitData.position}，工资为${recruitData.salary}金币/月，性别要求：${genderText}${requirements}。由于旅馆的超自然效应，符合要求的应聘者很快就会来到。`;
    }

    case 'upgrade': {
      // 升级：构建升级提示词
      const upgradeData = request.content as UpgradeData;
      const costText = [];
      if (upgradeData.cost.gold) {
        costText.push(`${upgradeData.cost.gold}金币`);
      }
      if (upgradeData.cost.materials) {
        costText.push(`${upgradeData.cost.materials}建材`);
      }
      const costDesc = costText.length > 0 ? `（花费：${costText.join('、')}）` : '';
      const desc =
        upgradeData.description ||
        `将${upgradeData.facilityName}从${upgradeData.facilityLevel}级升级到${upgradeData.facilityLevel + 1}级`;
      return `你决定对酒馆进行一番升级，${desc}${costDesc}。由于旅馆的超自然特性，这些升级将会自动化地进行。`;
    }

    case 'guest-interact': {
      // 客人互动：直接使用互动提示词
      return typeof request.content === 'string' ? request.content : '';
    }

    case 'world-travel': {
      // 世界穿越：构建穿越提示词
      const worldData = request.content as WorldTravelData;
      return `你决定让旅店穿越到${worldData.worldName}。由于旅馆的超自然特性，旅店将自动完成世界穿越。`;
    }

    default:
      return '';
  }
}

/**
 * 移除 <thinking> 标签及其内部所有内容（用于最终结果）
 */
function removeThinkingTags(text: string): string {
  if (!text) return '';

  // 匹配 <thinking>...</thinking> 标签（包括简单嵌套情况）
  let result = text;
  let lastResult = '';

  // 循环处理，直到没有更多的 <thinking> 标签
  while (result !== lastResult) {
    lastResult = result;
    result = result.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  }

  return result;
}

/**
 * 从流式文本中移除 <thinking> 内容
 * - 先移除所有完整的 <thinking>...</thinking>
 * - 如果还有未闭合的 <thinking>，则隐藏从最后一个 <thinking> 开始的所有内容
 * （参考 horr 的 removeThinkingTagsFromStream 实现）
 */
function removeThinkingTagsFromStream(text: string): string {
  if (!text) return '';

  // 先移除所有完整的 <thinking>...</thinking> 标签对
  let cleaned = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');

  // 检查是否还有未闭合的 <thinking> 标签
  const lastThinkingStart = cleaned.lastIndexOf('<thinking>');

  // 如果找到了未闭合的 <thinking>，隐藏从它开始的所有内容
  if (lastThinkingStart !== -1) {
    cleaned = cleaned.substring(0, lastThinkingStart).trim();
  }

  return cleaned;
}

/**
 * 提取最后一次出现的 <maintext> 标签内容
 */
function extractLastMaintext(text: string): string {
  const matches = text.match(/<maintext>([\s\S]*?)<\/maintext>/gi);
  if (!matches || matches.length === 0) {
    return '';
  }
  // 获取最后一个匹配
  const lastMatch = matches[matches.length - 1];
  const contentMatch = lastMatch.match(/<maintext>([\s\S]*?)<\/maintext>/i);
  return contentMatch ? contentMatch[1].trim() : '';
}

/**
 * 提取最后一次出现的 <option> 标签内容
 */
function extractLastOption(text: string): string {
  const matches = text.match(/<option>([\s\S]*?)<\/option>/gi);
  if (!matches || matches.length === 0) {
    return '';
  }
  // 获取最后一个匹配
  const lastMatch = matches[matches.length - 1];
  const contentMatch = lastMatch.match(/<option>([\s\S]*?)<\/option>/i);
  return contentMatch ? contentMatch[1].trim() : '';
}

/**
 * 提取最后一次出现的 <sum> 标签内容
 */
function extractLastSum(text: string): string {
  const matches = text.match(/<sum>([\s\S]*?)<\/sum>/gi);
  if (!matches || matches.length === 0) {
    return '';
  }
  // 获取最后一个匹配
  const lastMatch = matches[matches.length - 1];
  const contentMatch = lastMatch.match(/<sum>([\s\S]*?)<\/sum>/i);
  return contentMatch ? contentMatch[1].trim() : '';
}

/**
 * 提取最后一次出现的 <UpdateVariable> 标签内容
 */
function extractLastUpdateVariable(text: string): string {
  const matches = text.match(/<UpdateVariable>([\s\S]*?)<\/UpdateVariable>/gi);
  if (!matches || matches.length === 0) {
    return '';
  }
  // 获取最后一个匹配
  const lastMatch = matches[matches.length - 1];
  const contentMatch = lastMatch.match(/<UpdateVariable>([\s\S]*?)<\/UpdateVariable>/i);
  if (!contentMatch) {
    return '';
  }

  const content = contentMatch[1].trim();

  // 直接返回原始内容，不进行任何转换
  // MVU 系统可能直接支持 JSONPatch 格式，转换反而会导致问题
  console.log('📝 提取到 <UpdateVariable> 原始内容，直接保留，不进行转换');
  return content;
}

/**
 * 验证消息是否符合规范（至少包含 maintext 和 option）
 */
function validateMessage(messageContent: string): boolean {
  if (!messageContent || typeof messageContent !== 'string') {
    return false;
  }

  // 移除 thinking 标签后再验证
  const cleaned = removeThinkingTags(messageContent);
  const maintext = extractLastMaintext(cleaned);
  const option = extractLastOption(cleaned);

  if (!maintext || !option) {
    console.warn('⚠️ 消息缺少 <maintext> 或 <option> 标签');
    return false;
  }

  return true;
}

/**
 * 统一请求处理函数
 * @param request 请求数据
 * @param callbacks 回调函数
 */
export async function handleUnifiedRequest(
  request: RequestData,
  callbacks: {
    onSwitchToStory?: () => void;
    onRefreshStoryIfOpen?: () => void; // 如果魔典已打开则刷新，否则不操作
    onDisableOptions?: () => void;
    onShowGenerating?: () => void;
    onHideGenerating?: () => void;
    onEnableOptions?: () => void;
    onError?: (error: string) => void;
    onRefreshStory?: () => void; // 刷新魔典的回调（最终结果落盘后）
    onStreamingUpdate?: (text: string) => void; // 流式更新 maintext 的回调
  },
): Promise<boolean> {
  let userMessageId: number | null = null;

  try {
    // 1. 检查当前是否在魔典页面
    const { getActiveTab } = await import('../utils/tabManager');
    const { GameTab } = await import('../types');
    const currentTab = getActiveTab();
    const isInStoryTab = currentTab === GameTab.STORY;

    // 2. 如果不在魔典页面，切换到魔典页面
    if (!isInStoryTab) {
      if (callbacks.onSwitchToStory) {
        callbacks.onSwitchToStory();
      }
    }

    // 3. 禁用所有选项按钮
    if (callbacks.onDisableOptions) {
      callbacks.onDisableOptions();
    }

    // 4. 显示"剧情正在生成"提示框
    if (callbacks.onShowGenerating) {
      callbacks.onShowGenerating();
    }

    // 5. 构建提示词
    const prompt = buildRequestPrompt(request);
    if (!prompt) {
      throw new Error('无法构建提示词');
    }

    console.log('📝 构建的提示词:', prompt);

    // 6. 检测和操作世界书条目（在创建 user 消息之前）
    try {
      const currentMessageId = getLastMessageId();
      // 检测：游戏处于开局创建后，且发送消息时楼层为1或2（创建前是0或1）
      const isOpeningPhase = currentMessageId >= 0 && currentMessageId <= 1;

      console.log(`🔍 检测世界书条目：当前楼层 ${currentMessageId}，${isOpeningPhase ? '开局阶段' : '正常阶段'}`);

      // 获取世界书条目
      const worldbookName = '0诸天便携旅店';
      const worldbookEntries = await getWorldbook(worldbookName);

      // 查找"开局COT"和"COT"条目
      const openingCotEntry = worldbookEntries.find(entry => entry.name === '开局COT');
      const cotEntry = worldbookEntries.find(entry => entry.name === 'COT');

      // 准备更新列表
      const updates: Array<{ uid: number; enabled: boolean }> = [];

      if (isOpeningPhase) {
        // 开局阶段：启用"开局COT"，关闭"COT"
        if (openingCotEntry) {
          if (!openingCotEntry.enabled) {
            updates.push({ uid: openingCotEntry.uid, enabled: true });
            console.log('✅ 启用条目: 开局COT');
          }
        } else {
          console.warn('⚠️ 未找到"开局COT"条目');
        }

        if (cotEntry) {
          if (cotEntry.enabled) {
            updates.push({ uid: cotEntry.uid, enabled: false });
            console.log('❌ 关闭条目: COT');
          }
        } else {
          console.warn('⚠️ 未找到"COT"条目');
        }
      } else {
        // 其他时候：关闭"开局COT"，开启"COT"
        if (openingCotEntry) {
          if (openingCotEntry.enabled) {
            updates.push({ uid: openingCotEntry.uid, enabled: false });
            console.log('❌ 关闭条目: 开局COT');
          }
        } else {
          console.warn('⚠️ 未找到"开局COT"条目');
        }

        if (cotEntry) {
          if (!cotEntry.enabled) {
            updates.push({ uid: cotEntry.uid, enabled: true });
            console.log('✅ 启用条目: COT');
          }
        } else {
          console.warn('⚠️ 未找到"COT"条目');
        }
      }

      // 应用更新
      if (updates.length > 0) {
        await updateWorldbookWith(worldbookName, worldbook => {
          return worldbook.map(entry => {
            const update = updates.find(u => u.uid === entry.uid);
            if (update) {
              return { ...entry, enabled: update.enabled };
            }
            return entry;
          });
        });
        console.log(`✅ 世界书条目更新完成，共更新 ${updates.length} 个条目`);
      } else {
        console.log('ℹ️ 没有需要更新的世界书条目');
      }
    } catch (error) {
      console.error('❌ 更新世界书条目失败:', error);
      // 不抛出错误，继续执行后续流程
    }

    // 7. 获取基础 MVU 数据（用于传递到 user 消息）
    // 注意：不解析消息，让 MVU 系统自动处理
    const mvu_data = await getBaseMvuData();

    // 8. 创建 user 消息，传递 MVU 数据
    await createChatMessages(
      [
        {
          role: 'user',
          message: prompt,
          data: mvu_data, // 传递 MVU 数据，确保变量正确传递到新楼层
        },
      ],
      {
        refresh: 'none', // 不更新显示，由魔典自己读取
      },
    );

    // 9. 获取刚创建的 user 消息 ID
    userMessageId = getLastMessageId();
    console.log('📝 创建 user 消息，ID:', userMessageId);

    // 10. 如果当前在魔典页面，刷新魔典显示刚发送的消息
    // 添加延迟确保消息已创建完成，并验证消息是否存在
    if (isInStoryTab) {
      // 使用轮询方式确保消息已创建
      const checkAndRefresh = async (retries = 5) => {
        const checkMessageId = getLastMessageId();
        if (checkMessageId === userMessageId) {
          // 验证消息是否存在
          const messages = getChatMessages(checkMessageId);
          if (messages && messages.length > 0 && messages[0].role === 'user') {
            if (callbacks.onRefreshStoryIfOpen) {
              callbacks.onRefreshStoryIfOpen();
              console.log('✅ 已在魔典页面，刷新显示用户消息，ID:', userMessageId);
            }
            return;
          }
        }
        
        // 如果消息还未创建，重试
        if (retries > 0) {
          setTimeout(() => checkAndRefresh(retries - 1), 50);
        } else {
          // 即使验证失败，也尝试刷新
          if (callbacks.onRefreshStoryIfOpen) {
            callbacks.onRefreshStoryIfOpen();
            console.log('⚠️ 验证消息失败，但仍尝试刷新显示');
          }
        }
      };
      
      setTimeout(() => checkAndRefresh(), 50);
    }

    // 11. 注册流式事件监听器（在调用 generate 之前）
    let streamingHandler: ((fullText: string) => void) | null = null;
    if (typeof eventOn !== 'undefined' && iframe_events?.STREAM_TOKEN_RECEIVED_FULLY) {
      streamingHandler = (fullText: string) => {
        // 实时剔除 <thinking> 标签（包括未闭合的）
        const cleanedText = removeThinkingTagsFromStream(fullText);

        // 如果清理后文本为空（说明正在 thinking 标签内），不显示任何内容
        if (!cleanedText || cleanedText.trim().length === 0) {
          if (callbacks.onStreamingUpdate) {
            callbacks.onStreamingUpdate('');
          }
          return;
        }

        // 尝试提取 maintext 部分用于流式显示
        const maintextMatch = cleanedText.match(/<maintext>([\s\S]*?)(?:<\/maintext>|$)/i);
        if (maintextMatch && maintextMatch[1]) {
          const streamingMaintext = maintextMatch[1].trim();
          if (callbacks.onStreamingUpdate) {
            callbacks.onStreamingUpdate(streamingMaintext);
          }
        } else {
          // 如果还没有 <maintext> 标签，显示清理后的全文（可能还在生成开头）
          if (callbacks.onStreamingUpdate) {
            callbacks.onStreamingUpdate(cleanedText);
          }
        }
      };

      eventOn(iframe_events.STREAM_TOKEN_RECEIVED_FULLY, streamingHandler);
      console.log('✅ [MHJG unifiedRequestHandler] 已注册流式输出监听器');
    } else {
      console.log('ℹ️ [MHJG unifiedRequestHandler] 流式事件不可用，退化为非流式模式');
    }

    // 12. 使用 generate 生成 LLM 回复（支持流式生成）
    console.log('🚀 开始调用 generate 生成回复...');
    const result = await generate({
      user_input: prompt,
      should_stream: true, // 启用流式生成
    });

    console.log('📨 generate 返回结果，长度:', result?.length || 0);

    // 无论成功或失败，最终都会通过后续逻辑清空 streaming 文本

    // 12. 移除 <thinking> 标签
    const cleanedResult = removeThinkingTags(result);

    // 13. 验证返回结果是否符合规范
    if (!cleanedResult || !validateMessage(cleanedResult)) {
      console.error('❌ generate 返回的消息不符合规范');
      // 删除 user 消息
      if (userMessageId !== null) {
        await deleteChatMessages([userMessageId], { refresh: 'none' });
        console.log('🗑️ 已删除不合规的 user 消息');
      }
      // 隐藏生成提示框
      if (callbacks.onHideGenerating) {
        callbacks.onHideGenerating();
      }
      // 重新启用选项按钮
      if (callbacks.onEnableOptions) {
        callbacks.onEnableOptions();
      }
      if (callbacks.onError) {
        callbacks.onError('生成的消息不符合规范');
      }
      return false;
    }

    // 14. 提取最后一次出现的 <maintext>、<option>、<sum> 和 <UpdateVariable>
    const maintext = extractLastMaintext(cleanedResult);
    const option = extractLastOption(cleanedResult);
    const sum = extractLastSum(cleanedResult);
    const updateVariable = extractLastUpdateVariable(cleanedResult);

    if (!maintext || !option) {
      console.error('❌ 无法提取 maintext 或 option');
      // 删除 user 消息
      if (userMessageId !== null) {
        await deleteChatMessages([userMessageId], { refresh: 'none' });
        console.log('🗑️ 已删除不合规的 user 消息');
      }
      // 隐藏生成提示框
      if (callbacks.onHideGenerating) {
        callbacks.onHideGenerating();
      }
      // 重新启用选项按钮
      if (callbacks.onEnableOptions) {
        callbacks.onEnableOptions();
      }
      if (callbacks.onError) {
        callbacks.onError('无法提取 maintext 或 option');
      }
      return false;
    }

    // 15. 重新组合消息（包含最后一次的 maintext、option、sum（如果有）和 UpdateVariable（如果有））
    // 注意：不再进行格式化，直接使用原始内容
    let finalMessage = `<maintext>${maintext}</maintext>\n\n<option>${option}</option>`;
    if (sum) {
      finalMessage += `\n\n<sum>${sum}</sum>`;
      console.log('📝 提取到 <sum> 标签:', sum);
    }
    if (updateVariable) {
      finalMessage += `\n\n<UpdateVariable>${updateVariable}</UpdateVariable>`;
      console.log('📝 提取到 <UpdateVariable> 标签:', updateVariable);
    }

    // 16. 步骤1：确保 MVU 已初始化
    console.log('🔧 [步骤1] 等待 MVU 系统初始化...');
    await waitGlobalInitialized('Mvu');
    console.log('✅ [步骤1] MVU 系统已初始化');

    // 17. 步骤2：获取基础 MVU 数据（优先从刚创建的 user 消息读取，确保数据是最新的）
    // 注意：此时最新的消息是刚创建的 user 消息，应该从它读取 data
    console.log('📊 [步骤2] 开始获取基础 MVU 数据...');
    console.log('📊 [步骤2] user 消息 ID:', userMessageId);
    let base: any;
    if (userMessageId !== null) {
      const userMessage = getChatMessages(userMessageId)?.[0];
      if (userMessage?.data) {
        base = userMessage.data;
        console.log('✅ [步骤2] 从刚创建的 user 消息读取基础数据');
        console.log('📊 [步骤2] 基础数据摘要:', {
          has_stat_data: !!base.stat_data,
          has_display_data: !!base.display_data,
          has_delta_data: !!base.delta_data,
          initialized_lorebooks_count: base.initialized_lorebooks?.length || 0,
        });
      } else {
        console.log('⚠️ [步骤2] user 消息没有 data 字段');
      }
    }

    // 如果 user 消息没有 data，则从最新的 assistant 消息或 MVU 读取
    if (!base) {
      console.log('📊 [步骤2] 尝试从最新的 assistant 消息或 MVU 读取...');
      base =
        getChatMessages(-1, { role: 'assistant' })?.[0]?.data ??
        Mvu.getMvuData({ type: 'message', message_id: 'latest' });
      console.log('✅ [步骤2] 从最新的 assistant 消息或 MVU 读取基础数据');
      console.log('📊 [步骤2] 基础数据摘要:', {
        has_stat_data: !!base?.stat_data,
        has_display_data: !!base?.display_data,
        has_delta_data: !!base?.delta_data,
        initialized_lorebooks_count: base?.initialized_lorebooks?.length || 0,
      });
    }

    // 确保 base 数据结构完整
    if (!base || typeof base !== 'object') {
      console.log('⚠️ [步骤2] base 数据无效，使用空对象');
      base = { stat_data: {}, display_data: {}, delta_data: {} };
    }
    if (!base.stat_data) base.stat_data = {};
    if (!base.display_data) base.display_data = {};
    if (!base.delta_data) base.delta_data = {};
    if (!base.initialized_lorebooks) base.initialized_lorebooks = [];
    console.log('✅ [步骤2] 基础数据结构已确保完整');

    // 18. 步骤3：先解析消息中的 MVU 命令（按照示例用法：先解析，再创建消息）
    console.log('🔍 [步骤3] 开始解析消息中的 MVU 命令...');
    console.log('🔍 [步骤3] 解析基础数据摘要:', {
      has_stat_data: !!base.stat_data,
      stat_data_keys: Object.keys(base.stat_data || {}),
    });
    console.log('🔍 [步骤3] 消息内容摘要:', {
      message_length: finalMessage?.length || 0,
      contains_updatevariable: finalMessage?.includes('<UpdateVariable>') || false,
      contains_jsonpatch: finalMessage?.includes('<JSONPatch>') || false,
    });
    console.log('🔍 [步骤3] 调用 Mvu.parseMessage(finalMessage, base)...');
    const parsed = await Mvu.parseMessage(finalMessage, base);
    console.log('🔍 [步骤3] parseMessage 返回结果:', parsed ? '有解析结果' : '无解析结果（undefined）');

    // 使用解析后的数据，如果没有解析结果则使用基础数据
    const finalData = parsed ?? base;
    console.log('📊 [步骤3] 最终使用的数据:', parsed ? '解析后的数据' : '基础数据');
    if (parsed) {
      console.log('📊 [步骤3] 解析后的数据摘要:', {
        has_stat_data: !!parsed.stat_data,
        has_display_data: !!parsed.display_data,
        has_delta_data: !!parsed.delta_data,
        stat_data_keys: Object.keys(parsed.stat_data || {}),
        delta_data_keys: Object.keys(parsed.delta_data || {}),
      });
    }

    // 19. 步骤4：创建 assistant 消息，直接传入解析后的数据（按照示例用法）
    console.log('📝 [步骤4] 开始创建 assistant 消息（传入解析后的数据）...');
    console.log('📝 [步骤4] 消息长度:', finalMessage?.length || 0);
    await createChatMessages(
      [
        {
          role: 'assistant',
          message: finalMessage ?? '',
          data: finalData, // 直接传入解析后的数据，如果没有解析结果则使用基础数据
        },
      ],
      {
        refresh: 'none',
      },
    );
    console.log('✅ [步骤4] assistant 消息已创建（已传入解析后的数据）');

    // 20. 步骤5：获取新创建的消息 ID
    const assistantMessageId = getLastMessageId();
    console.log('🆔 [步骤5] 获取新创建的消息 ID:', assistantMessageId);

    // 验证消息的 data 字段是否正确
    const verifyMessage = getChatMessages(assistantMessageId)?.[0];
    if (verifyMessage?.data) {
      console.log('✅ [步骤5] 验证：消息 data 字段已存在');
      console.log('📊 [步骤5] 消息 data 字段摘要:', {
        has_stat_data: !!verifyMessage.data.stat_data,
        stat_data_keys: Object.keys(verifyMessage.data.stat_data || {}),
      });
    } else {
      console.warn('⚠️ [步骤5] 验证：消息 data 字段不存在');
    }

    // 21. 更新编年史
    const { checkAndUpdateChronicle } = await import('./chronicleUpdater');
    await checkAndUpdateChronicle();

    // 22. 隐藏生成提示框（先重置生成状态，这样刷新时不会被延迟）
    if (callbacks.onHideGenerating) {
      callbacks.onHideGenerating();
    }

    // 20. 从新创建的消息中读取内容并刷新魔典显示
    // 延迟一下，确保消息已经完全创建和更新，并且生成状态已重置
    setTimeout(() => {
      if (callbacks.onRefreshStory) {
        callbacks.onRefreshStory();
        console.log('✅ 已从新创建的消息刷新魔典显示');
      }
    }, 300);

    // 23. 重新启用选项按钮（如果需要）
    // 注意：选项按钮会在消息更新后自动刷新，这里不需要手动启用

    return true;
  } catch (error) {
    console.error('❌ 处理统一请求失败:', error);

    // 如果创建了 user 消息，删除它
    if (userMessageId !== null) {
      try {
        await deleteChatMessages([userMessageId], { refresh: 'none' });
        console.log('🗑️ 已删除失败的 user 消息');
      } catch (deleteError) {
        console.error('❌ 删除 user 消息失败:', deleteError);
      }
    }

    // 隐藏生成提示框
    if (callbacks.onHideGenerating) {
      callbacks.onHideGenerating();
    }

    // 重新启用选项按钮
    if (callbacks.onEnableOptions) {
      callbacks.onEnableOptions();
    }

    // 显示错误信息
    if (callbacks.onError) {
      callbacks.onError(error instanceof Error ? error.message : '处理请求失败');
    }

    return false;
  }
}
