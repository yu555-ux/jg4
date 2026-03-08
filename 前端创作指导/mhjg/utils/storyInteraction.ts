/**
 * 游戏剧情交互管理器
 * 负责处理开局剧情创建和玩家选择后的交互
 */

// 全局函数声明（由酒馆助手提供）
declare function getChatMessages(range: string | number): Array<{ data?: Record<string, any> }>;
declare function createChatMessages(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; message: string; data?: Record<string, any> }>,
  options?: { refresh?: 'none' | 'affected' | 'all' },
): Promise<void>;
declare function deleteChatMessages(message_ids: number[], options?: { refresh?: 'none' | 'all' }): Promise<void>;
declare function getLastMessageId(): number;
declare function setChatMessages(
  chat_messages: Array<{ message_id: number; data?: Record<string, any> }>,
  options?: { refresh?: 'none' | 'affected' | 'all' },
): Promise<void>;
declare function generate(config: { user_input?: string; should_stream?: boolean }): Promise<string>;

// MVU 变量框架声明
declare const Mvu: {
  getMvuData: (options: { type: 'message' | 'chat' | 'character' | 'global'; message_id?: number | 'latest' }) => {
    stat_data: Record<string, any>;
    display_data: Record<string, any>;
    delta_data: Record<string, any>;
  };
  parseMessage: (message: string, old_data: any) => Promise<any | undefined>;
};

function getLatestMessageData(): any {
  try {
    return Mvu.getMvuData({ type: 'message', message_id: 'latest' });
  } catch (err) {
    console.warn('⚠️ Mvu.getMvuData 失败，退化到上一楼 data:', err);
  }

  try {
    const last = getChatMessages(-1)?.[0];
    if (last?.data) return last.data;
  } catch (err) {
    console.error('❌ 无法获取楼层变量，返回空对象', err);
  }

  return { stat_data: {}, display_data: {}, delta_data: {} };
}

/**
 * 验证消息是否符合规范
 * 至少包含完整闭合的 <maintext> 和 <option> 标签
 * @param messageContent 消息内容
 * @returns 是否符合规范
 */
export function validateMessage(messageContent: string): boolean {
  if (!messageContent || typeof messageContent !== 'string') {
    return false;
  }

  // 检查是否包含完整闭合的 <maintext> 标签
  const maintextMatch = messageContent.match(/<maintext>([\s\S]*?)<\/maintext>/i);
  if (!maintextMatch) {
    console.warn('⚠️ 消息缺少 <maintext> 标签');
    return false;
  }

  // 检查是否包含完整闭合的 <option> 标签
  const optionMatch = messageContent.match(/<option>([\s\S]*?)<\/option>/i);
  if (!optionMatch) {
    console.warn('⚠️ 消息缺少 <option> 标签');
    return false;
  }

  // 检查 maintext 内容是否为空
  const maintextContent = maintextMatch[1].trim();
  if (!maintextContent) {
    console.warn('⚠️ <maintext> 标签内容为空');
    return false;
  }

  // 检查 option 内容是否为空
  const optionContent = optionMatch[1].trim();
  if (!optionContent) {
    console.warn('⚠️ <option> 标签内容为空');
    return false;
  }

  return true;
}

/**
 * 解析消息中的选项
 * 从 assistant 消息中提取 <option> 标签内的选项
 * 按 A.、B.、C. 等字母开头来分割选项
 * @param messageContent 消息内容
 * @returns 选项数组
 */
export function parseOptions(messageContent: string): string[] {
  const optionMatch = messageContent.match(/<option>([\s\S]*?)<\/option>/i);
  if (!optionMatch) {
    return [];
  }

  const optionText = optionMatch[1].trim();
  
  // 按 A.、B.、C. 等字母开头来分割选项
  // 匹配模式：字母. 开头（如 A.、B.、C. 等）
  const optionPattern = /^[A-Z]\./m;
  const lines = optionText.split('\n');
  const options: string[] = [];
  let currentOption: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 如果当前行匹配选项模式（A.、B.等开头）
    if (optionPattern.test(line)) {
      // 如果之前有收集的选项，先保存
      if (currentOption.length > 0) {
        options.push(currentOption.join('\n').trim());
        currentOption = [];
      }
      // 开始新的选项
      currentOption.push(line);
    } else if (line.length > 0) {
      // 如果当前行不为空，且不是新选项开头，则属于当前选项的一部分
      if (currentOption.length > 0) {
        currentOption.push(line);
      }
    }
  }
  
  // 保存最后一个选项
  if (currentOption.length > 0) {
    options.push(currentOption.join('\n').trim());
  }

  return options;
}

/**
 * 解析消息中的剧情文本
 * 从 assistant 消息中提取 <maintext> 标签内的文本
 * @param messageContent 消息内容
 * @returns 剧情文本
 */
export function parseMaintext(messageContent: string): string {
  const maintextMatch = messageContent.match(/<maintext>([\s\S]*?)<\/maintext>/i);
  if (!maintextMatch) {
    return '';
  }

  return maintextMatch[1].trim();
}

/**
 * 解析消息中的总结
 * 从 assistant 消息中提取 <sum> 标签内的文本
 * @param messageContent 消息内容
 * @returns 总结文本
 */
export function parseSum(messageContent: string): string {
  const sumMatch = messageContent.match(/<sum>([\s\S]*?)<\/sum>/i);
  if (!sumMatch) {
    return '';
  }

  return sumMatch[1].trim();
}

/**
 * 解析消息中的变量更新
 * 从 assistant 消息中提取 <UpdateVariable> 标签内的内容
 * @param messageContent 消息内容
 * @returns 变量更新文本
 */
export function parseUpdateVariable(messageContent: string): string {
  const updateMatch = messageContent.match(/<UpdateVariable>([\s\S]*?)<\/UpdateVariable>/i);
  if (!updateMatch) {
    return '';
  }

  return updateMatch[1].trim();
}

/**
 * 仅通过 MVU 命令创建一个新楼层，并携带变量更新
 * 用于不想输出文本、只想让变量落盘的场景
 * @param command 例如 `_.set("好感度", 100)`
 */
export async function createMvuOnlyMessage(command: string): Promise<void> {
  // 确保 Mvu 已初始化
  if (typeof waitGlobalInitialized === 'function') {
    await waitGlobalInitialized('Mvu');
  }

  const current = getLatestMessageData();
  const parsed = await Mvu.parseMessage(command, current);
  const data = parsed ?? current;

  // 创建一个内容为空格的 assistant 楼层，把变量附在 data
  await createChatMessages(
    [
      {
        role: 'assistant',
        message: ' ', // 避免空字符串导致的兼容性问题
        data,
      },
    ],
    { refresh: 'none' },
  );

  // 额外步骤：将上一楼层的 data 写入刚创建的新楼层
  try {
    const lastId = getLastMessageId();
    if (typeof lastId === 'number' && lastId > 0) {
      const prevData = getChatMessages(lastId - 1)?.[0]?.data ?? data;
      if (prevData) {
        await setChatMessages([{ message_id: lastId, data: prevData }], { refresh: 'none' });
      }
    }
  } catch (err) {
    console.warn('⚠️ 设置新楼层 data 失败', err);
  }
}
