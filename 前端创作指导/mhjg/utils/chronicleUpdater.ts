/**
 * 编年史更新工具
 * 负责从消息中提取<sum>标签并更新世界书中的编年史条目
 */

// 全局函数声明（由酒馆助手提供）
declare function getChatMessages(
  range: string | number,
  options?: { role?: 'all' | 'system' | 'assistant' | 'user' },
): Array<{ message: string; message_id: number; role: string }>;

declare function getLastMessageId(): number;

declare function getWorldbook(worldbook_name: string): Promise<WorldbookEntry[]>;

declare function replaceWorldbook(
  worldbook_name: string,
  worldbook: PartialDeep<WorldbookEntry>[],
  options?: { render?: 'debounced' | 'immediate' },
): Promise<void>;

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

type PartialDeep<T> = {
  [P in keyof T]?: T[P] extends object ? PartialDeep<T[P]> : T[P];
};

/**
 * 解析消息中的<sum>标签
 */
function parseSum(message: string): string {
  const sumMatch = message.match(/<sum>([\s\S]*?)<\/sum>/i);
  if (!sumMatch) {
    return '';
  }
  return sumMatch[1].trim();
}

/**
 * 从指定楼层开始向上查找包含<sum>标签的消息
 * @param startMessageId 起始楼层号（从该楼层开始向上查找）
 * @returns 找到的楼层号和<sum>内容，如果没找到返回null
 */
function findLatestSumMessage(startMessageId: number): { messageId: number; sumText: string } | null {
  for (let messageId = startMessageId; messageId >= 0; messageId--) {
    try {
      const messages = getChatMessages(messageId);
      if (messages && messages.length > 0) {
        const message = messages[0];
        if (message && message.message) {
          const sumText = parseSum(message.message);
          if (sumText) {
            return { messageId, sumText };
          }
        }
      }
    } catch (err) {
      // 楼层不存在，继续向上查找
      continue;
    }
  }
  return null;
}

/**
 * 解析编年史内容，提取所有条目
 * @param content 编年史内容
 * @returns 条目数组，每个条目包含编号和文本
 */
function parseChronicleContent(content: string): Array<{ number: number; text: string }> {
  const entries: Array<{ number: number; text: string }> = [];
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
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
 * 格式化编年史内容
 * @param entries 条目数组
 * @returns 格式化后的编年史内容
 */
function formatChronicleContent(entries: Array<{ number: number; text: string }>): string {
  // 按编号倒序排列（最新的在上）
  entries.sort((a, b) => b.number - a.number);
  return entries.map(entry => `${entry.number}.${entry.text}`).join('\n\n');
}

/**
 * 更新编年史条目
 * @param content 当前编年史内容
 * @param entryNumber 要更新/添加的条目编号
 * @param entryText 条目文本
 * @returns 更新后的编年史内容
 */
function updateChronicleEntry(content: string, entryNumber: number, entryText: string): string {
  const entries = parseChronicleContent(content);
  
  // 查找是否已存在该编号的条目
  const existingIndex = entries.findIndex(e => e.number === entryNumber);
  
  if (existingIndex >= 0) {
    // 替换现有条目
    entries[existingIndex].text = entryText;
  } else {
    // 添加新条目
    entries.push({ number: entryNumber, text: entryText });
  }
  
  // 根据用户示例，只保留编号小于等于entryNumber的条目
  // 过滤掉编号大于entryNumber的条目
  const filteredEntries = entries.filter(e => e.number <= entryNumber);
  
  return formatChronicleContent(filteredEntries);
}

/**
 * 更新世界书中的编年史条目
 * @param messageId LLM返回消息的楼层号
 * @param sumText <sum>标签内的文本
 */
async function updateChronicleInWorldbook(messageId: number, sumText: string): Promise<void> {
  const WORLDBOOK_NAME = '0诸天便携旅店';
  const ENTRY_NAME = '编年史';
  
  try {
    // 计算条目编号：使用 Math.ceil 确保1层显示为条目1
    // 1层 → 条目1, 3层 → 条目2, 5层 → 条目3, ...
    const entryNumber = Math.ceil(messageId / 2);
    
    if (entryNumber <= 0) {
      console.warn(`⚠️ 楼层${messageId}的条目编号${entryNumber}无效，跳过更新`);
      return;
    }
    
    // 获取世界书
    let worldbook: WorldbookEntry[];
    try {
      worldbook = await getWorldbook(WORLDBOOK_NAME);
    } catch (err) {
      console.warn(`⚠️ 世界书"${WORLDBOOK_NAME}"不存在，跳过更新:`, err);
      return;
    }
    
    // 查找编年史条目
    let chronicleEntry = worldbook.find(entry => entry.name === ENTRY_NAME);
    
    if (!chronicleEntry) {
      console.warn(`⚠️ 世界书"${WORLDBOOK_NAME}"中未找到条目"${ENTRY_NAME}"，跳过更新`);
      return;
    }
    
    // 更新编年史内容
    const currentContent = chronicleEntry.content || '';
    const updatedContent = updateChronicleEntry(currentContent, entryNumber, sumText);
    
    // 更新条目
    chronicleEntry = {
      ...chronicleEntry,
      content: updatedContent,
    };
    
    // 更新世界书
    const updatedWorldbook = worldbook.map(entry =>
      entry.name === ENTRY_NAME ? chronicleEntry : entry
    );
    
    await replaceWorldbook(WORLDBOOK_NAME, updatedWorldbook, { render: 'debounced' });
    
    console.log(`✅ 成功更新编年史：${entryNumber}.${sumText}`);
  } catch (error) {
    console.error('❌ 更新编年史失败:', error);
  }
}

/**
 * 检查并更新编年史
 * 从最新楼层开始向上查找包含<sum>的消息，然后更新编年史
 */
export async function checkAndUpdateChronicle(): Promise<void> {
  try {
    // 获取最新楼层号
    const latestMessageId = getLastMessageId();
    
    if (latestMessageId < 0) {
      console.warn('⚠️ 没有消息楼层，跳过编年史更新');
      return;
    }
    
    // 从最新楼层开始向上查找包含<sum>的消息
    const sumInfo = findLatestSumMessage(latestMessageId);
    
    if (!sumInfo) {
      console.log('📝 未找到包含<sum>标签的消息，跳过编年史更新');
      return;
    }
    
    console.log(`📖 找到<sum>标签，楼层${sumInfo.messageId}，内容：${sumInfo.sumText}`);
    
    // 更新编年史
    await updateChronicleInWorldbook(sumInfo.messageId, sumInfo.sumText);
  } catch (error) {
    console.error('❌ 检查并更新编年史失败:', error);
  }
}

