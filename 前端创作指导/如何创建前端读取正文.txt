### 创建 `utils/messageParser.ts`

这个工具负责从 assistant 消息中解析 `<maintext>`、`<option>`、`<mission>` 等标签：

```typescript
/**
 * 消息解析工具
 * 从最新楼层消息中解析 maintext 和 option 标签
 */

declare function getChatMessages(
  range: string | number,
  options?: { role?: 'all' | 'system' | 'assistant' | 'user' },
): Array<{ message: string; message_id: number; role: string; data?: Record<string, any> }>;
declare function getLastMessageId(): number;

/**
 * 解析消息中的正文
 * 注意：只提取不在<thinking>或<think>标签内部的<maintext>标签
 */
export function parseMaintext(messageContent: string): string {
  if (!messageContent) return '';
  
  // 先移除所有<thinking>和<think>标签及其内容
  let cleaned = messageContent.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/redacted_reasoning>/gi, '');
  
  // 检查是否有未闭合的标签
  const thinkingStart = cleaned.search(/<thinking>/i);
  if (thinkingStart !== -1) {
    cleaned = cleaned.substring(0, thinkingStart);
  }
  const redactedStart = cleaned.search(/<think>/i);
  if (redactedStart !== -1) {
    cleaned = cleaned.substring(0, redactedStart);
  }
  
  // 提取最后一个 <maintext> 标签
  const matches = cleaned.match(/<maintext>([\s\S]*?)<\/maintext>/gi);
  if (!matches || matches.length === 0) return '';
  const lastMatch = matches[matches.length - 1];
  const content = lastMatch.match(/<maintext>([\s\S]*?)<\/maintext>/i);
  return content ? content[1].trim() : '';
}

/**
 * 解析消息中的选项
 * 支持两种格式：
 * 1. 带 id: <option id="A">选项文本</option>
 * 2. 不带 id: <option>\nA. 选项1\nB. 选项2\n</option>
 */
export interface Option {
  id: string;
  text: string;
}

export function parseOptions(messageContent: string): Option[] {
  if (!messageContent) return [];
  
  // 先移除 thinking 和 redacted_reasoning 标签
  let cleaned = messageContent.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/redacted_reasoning>/gi, '');
  
  const thinkingStart = cleaned.search(/<thinking>/i);
  if (thinkingStart !== -1) {
    cleaned = cleaned.substring(0, thinkingStart);
  }
  const redactedStart = cleaned.search(/<think>/i);
  if (redactedStart !== -1) {
    cleaned = cleaned.substring(0, redactedStart);
  }
  
  // 先尝试匹配带 id 的格式
  const optionWithIdRegex = /<option id="([^"]+)">([^<]+)<\/option>/g;
  const optionsWithId: Option[] = [];
  let match;
  
  while ((match = optionWithIdRegex.exec(cleaned)) !== null) {
    optionsWithId.push({
      id: match[1],
      text: match[2].trim()
    });
  }
  
  if (optionsWithId.length > 0) {
    return optionsWithId;
  }
  
  // 尝试解析不带 id 的格式
  const optionMatch = cleaned.match(/<option>([\s\S]*?)<\/option>/i);
  if (!optionMatch) {
    return [];
  }
  
  const optionText = optionMatch[1].trim();
  const lines = optionText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // 检查是否是 A.、B.、C. 格式
  const optionPattern = /^[A-Z]\.\s*/;
  const hasLetterPrefix = lines.some(line => optionPattern.test(line));
  
  if (hasLetterPrefix) {
    // 按字母开头分割选项
    const options: Option[] = [];
    let currentOption: string[] = [];
    
    for (const line of lines) {
      if (optionPattern.test(line)) {
        if (currentOption.length > 0) {
          const text = currentOption.join('\n');
          const id = text.match(/^([A-Z])\./)?.[1] || String.fromCharCode(65 + options.length);
          options.push({
            id,
            text: text.replace(/^[A-Z]\.\s*/, '').trim()
          });
          currentOption = [];
        }
        currentOption.push(line);
      } else {
        if (currentOption.length > 0) {
          currentOption.push(line);
        }
      }
    }
    
    if (currentOption.length > 0) {
      const text = currentOption.join('\n');
      const id = text.match(/^([A-Z])\./)?.[1] || String.fromCharCode(65 + options.length);
      options.push({
        id,
        text: text.replace(/^[A-Z]\.\s*/, '').trim()
      });
    }
    
    return options;
  } else {
    // 单个选项或简单的多行选项
    return lines.map((line, index) => ({
      id: String.fromCharCode(65 + index),
      text: line
    }));
  }
}

/**
 * 从最新 assistant 消息中读取正文和选项
 */
export function loadFromLatestMessage(): { 
  maintext: string; 
  options: Option[]; 
  messageId?: number; 
  userMessageId?: number;
  fullMessage?: string;
} {
  try {
    const lastMessageId = getLastMessageId();
    if (lastMessageId < 0) {
      return { maintext: '', options: [] };
    }

    // 获取最新 assistant 消息
    const messages = getChatMessages(lastMessageId, { role: 'assistant' });
    if (!messages || messages.length === 0) {
      // 尝试获取任意角色的最新消息
      const allMessages = getChatMessages(lastMessageId);
      if (!allMessages || allMessages.length === 0) {
        return { maintext: '', options: [] };
      }
      const latestMessage = allMessages[0];
      const maintext = parseMaintext(latestMessage.message || '');
      const options = parseOptions(latestMessage.message || '');
      
      // 查找对应的 user 消息
      let userMessageId: number | undefined;
      if (latestMessage.message_id > 0) {
        const userMessages = getChatMessages(latestMessage.message_id - 1, { role: 'user' });
        if (userMessages && userMessages.length > 0) {
          userMessageId = userMessages[0].message_id;
        }
      }
      
      return { 
        maintext, 
        options, 
        messageId: latestMessage.message_id,
        userMessageId,
        fullMessage: latestMessage.message
      };
    }

    const latestAssistantMessage = messages[0];
    const messageContent = latestAssistantMessage.message || '';

    const maintext = parseMaintext(messageContent);
    const options = parseOptions(messageContent);

    // 查找对应的 user 消息
    let userMessageId: number | undefined;
    if (latestAssistantMessage.message_id > 0) {
      const userMessages = getChatMessages(latestAssistantMessage.message_id - 1, { role: 'user' });
      if (userMessages && userMessages.length > 0) {
        userMessageId = userMessages[0].message_id;
      }
    }

    return { 
      maintext, 
      options, 
      messageId: latestAssistantMessage.message_id,
      userMessageId,
      fullMessage: messageContent
    };
  } catch (error) {
    console.error('❌ [messageParser] 加载最新消息失败:', error);
    return { maintext: '', options: [] };
  }