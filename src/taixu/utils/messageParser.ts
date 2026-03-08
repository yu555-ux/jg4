import { jsonrepair } from 'jsonrepair';
import { getCleanedContent } from './parsers/core';
import { parseHistory, parseSum } from './parsers/history';
import { parseMaintext } from './parsers/maintext';
import { parseThinking } from './parsers/thinking';
import { Option, parseOptions } from './parsers/options';

export { Option, parseHistory, parseMaintext, parseOptions, parseSum, parseThinking };

export type ReadingPage = {
  index: number;
  base?: { id: number; role: string; text: string; historyTitle?: string };
  user?: { id: number; role: string; text: string };
};

/**
 * 解析变量更新命令
 * 支持两种模式：
 * 1. 传统的斜杠命令模式（UpdateVariable 标签内）
 * 2. 新型的 JSON Patch 模式（JSONPatch 标签内）
 */
export function parseUpdateVariables(messageContent: string): any[] {
  const { content: cleaned } = getCleanedContent(messageContent);

  // 1. 尝试解析 JSON Patch
  const patchMatch = cleaned.match(/<JSONPatch>([\s\S]*?)<\/JSONPatch>/i);
  if (patchMatch) {
    try {
      const repairedJson = jsonrepair(patchMatch[1].trim());
      const patch = JSON.parse(repairedJson);
      if (Array.isArray(patch)) {
        return patch;
      }
    } catch (e) {
    }
  }

  // 2. 退化：解析传统的斜杠命令
  const match =
    cleaned.match(/<UpdateVariable>([\s\S]*?)<\/UpdateVariable>/i) ||
    cleaned.match(/<updateVarlible>([\s\S]*?)<\/updateVarlible>/i);
  if (match) {
    return match[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('/') && !line.startsWith('//'));
  }

  return [];
}

/**
 * 获取所有消息的阅读模式数据
 */
export function getAllReadingMessages(): Array<{ id: number; text: string; role: string }> {
  try {
    const lastId = getLastMessageId();
    if (lastId < 0) return [];
    const messages = getChatMessages(`0-${lastId}`);
    return messages
      .map(m => ({
        id: m.message_id,
        text: parseMaintext(m.message || ''),
        role: m.role
      }))
      .filter(m => m.text.length > 0);
  } catch (e) {
    return [];
  }
}

function extractHistoryTitle(history: string): string {
  const lines = history
    .split(/\r?\n/)
    .map(part => part.trim())
    .filter(part => part.length > 0);

  const titleLine = lines.find(line => line.startsWith('标题'));
  if (titleLine) {
    const pipeIndex = titleLine.indexOf('|');
    if (pipeIndex !== -1) {
      return titleLine.slice(pipeIndex + 1).trim();
    }
  }

  return '';
}

/**
 * 获取阅读模式分页数据
 */
export function getReadingPages(): ReadingPage[] {
  try {
    const lastId = getLastMessageId();
    if (lastId < 0) return [];
    const messages = getChatMessages(`0-${lastId}`);

    const floor0 = messages.find(m => m.message_id === 0);
    const floor0Text = floor0 ? parseMaintext(floor0.message || '') : '';
    const floor0History = floor0 ? parseHistory(floor0.message || '') : '';
    const floor0HistoryTitle = floor0History ? extractHistoryTitle(floor0History) : '';

    const userMessages = messages
      .filter(m => m.role === 'user')
      .map(m => ({
        id: m.message_id,
        role: m.role,
        text: parseMaintext(m.message || '')
      }))
      .filter(m => m.text.length > 0);

    const assistantMessages = messages
      .filter(m => m.role === 'assistant' && m.message_id !== 0)
      .map(m => {
        const text = parseMaintext(m.message || '');
        const history = parseHistory(m.message || '');
        const historyTitle = extractHistoryTitle(history);
        return { id: m.message_id, role: m.role, text, historyTitle };
      })
      .filter(m => m.text.length > 0);

    const pages: ReadingPage[] = [];
    const firstUser = userMessages[0];
    if (floor0Text.length > 0 || firstUser) {
      pages.push({
        index: 0,
        base: floor0Text.length > 0 && floor0 ? { id: floor0.message_id, role: floor0.role, text: floor0Text, historyTitle: floor0HistoryTitle } : undefined,
        user: firstUser
      });
    }

    const maxPages = Math.max(assistantMessages.length, Math.max(0, userMessages.length - 1));
    for (let i = 0; i < maxPages; i += 1) {
      const base = assistantMessages[i];
      const user = userMessages[i + 1];
      if (!base && !user) continue;
      pages.push({
        index: pages.length,
        base,
        user
      });
    }

    return pages;
  } catch (e) {
    return [];
  }
}

/**
 * 获取所有消息的历史档位数据
 */
export function getAllHistoryMessages(): Array<{ id: number; history: string; role: string }> {
  try {
    const lastId = getLastMessageId();
    if (lastId < 0) return [];
    const messages = getChatMessages(`0-${lastId}`);
    return messages
      .map(m => {
        const parsedHistory = parseHistory(m.message || '');
        return {
          id: m.message_id,
          history: parsedHistory,
          role: m.role
        };
      })
      .filter(m => m.history.length > 0);
  } catch (e) {
    return [];
  }
}

/**
 * 从最新消息中读取结构化数据
 */
export function loadFromLatestMessage(): {
  maintext: string;
  options: Option[];
  sum?: string;
  history?: string;
  messageId?: number;
  userMessageId?: number;
  role?: string;
  fullMessage?: string;
  isPending?: boolean;
} {
  try {
    const lastMessageId = getLastMessageId();
    if (lastMessageId < 0) {
      return { maintext: '', options: [], isPending: false };
    }

    // 获取最新消息（不限定角色，但下方会优先处理 assistant）
    const allMessages = getChatMessages(lastMessageId);
    if (!allMessages || allMessages.length === 0) {
      return { maintext: '', options: [], isPending: false };
    }

    const latestMessage = allMessages[0];
    const messageContent = latestMessage.message || '';

    const { content: cleaned, isPending } = getCleanedContent(messageContent);
    const maintext = parseMaintext(messageContent);
    const options = parseOptions(messageContent);
    const sum = parseSum(messageContent);
    const history = parseHistory(messageContent);
    const hasMaintext = /<maintext>/i.test(messageContent);
    const hasMaintextClose = /<\/maintext>/i.test(messageContent);
    const hasOption = /<option/i.test(messageContent);
    const hasOptionClose = /<\/option>/i.test(messageContent);
    const hasThink = /<(think|thinking)>/i.test(messageContent);
    const hasThinkClose = /<\/(think|thinking)>/i.test(messageContent);

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
      sum,
      history,
      messageId: latestMessage.message_id,
      userMessageId,
      role: latestMessage.role,
      fullMessage: messageContent,
      isPending
    };
  } catch (error) {
    return { maintext: '', options: [], isPending: false };
  }
}
