import { getCleanedContent } from './core';

/**
 * 解析消息中的总结
 */
export function parseSum(messageContent: string): string {
  const { content: cleaned } = getCleanedContent(messageContent);
  if (!cleaned) return '';
  const match = cleaned.match(/<sum>([\s\S]*?)<\/sum>/i);
  return match ? match[1].trim() : '';
}

/**
 * 解析消息中的历史
 */
export function parseHistory(messageContent: string): string {
  const { content: cleaned } = getCleanedContent(messageContent);
  if (!cleaned) return '';

  const match = cleaned.match(/<history>([\s\S]*?)<\/history>/i);
  if (match) return match[1].trim();

  // 流式支持
  const startTag = '<history>';
  const startIndex = cleaned.toLowerCase().lastIndexOf(startTag);
  if (startIndex !== -1) {
    let content = cleaned.substring(startIndex + startTag.length);
    const nextTagStart = content.indexOf('<');
    if (nextTagStart !== -1) {
      content = content.substring(0, nextTagStart);
    }
    return content.trim();
  }

  return '';
}
