import { getCleanedContent } from './core';

/**
 * 解析消息中的正文
 * 注意：优先处理已闭合的标签，若未闭合则支持流式提取
 */
export function parseMaintext(messageContent: string): string {
  const { content: cleaned, isPending } = getCleanedContent(messageContent);
  if (!cleaned) return '';

  // 1. 尝试提取已闭合的 <maintext>
  const closedMatch = cleaned.match(/<maintext>([\s\S]*?)<\/maintext>/i);
  if (closedMatch) return closedMatch[1].trim();

  // 2. 流式支持：如果发现了 <maintext> 但还没闭合
  const startTag = '<maintext>';
  const startIndex = cleaned.toLowerCase().lastIndexOf(startTag);
  if (startIndex !== -1) {
    // 提取标签之后的所有内容
    let content = cleaned.substring(startIndex + startTag.length);

    // D: 容错与格式修复 - 移除可能已经开始输出但还没闭合的其他标签
    const nextTagStart = content.indexOf('<');
    if (nextTagStart !== -1) {
      content = content.substring(0, nextTagStart);
    }

    return content.trim();
  }

  // 3. 退化处理：如果完全没有 <maintext> 标签
  if (/<(stat_data|option|history|sum|UpdateVariable|JSONPatch)>/.test(cleaned)) {
    return '';
  }

  if (cleaned.startsWith('<')) {
    return '';
  }

  return cleaned;
}
