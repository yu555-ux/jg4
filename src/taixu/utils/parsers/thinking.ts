/**
 * 解析消息中的思维链内容
 * 注意：优先提取已闭合标签，未闭合则不输出内容
 */
export function parseThinking(messageContent: string): string {
  if (!messageContent) return '';

  // 1. 优先提取已闭合的 <think>/<thinking>
  const closedMatch = messageContent.match(/<(think|thinking)>([\s\S]*?)<\/\1>/i);
  if (closedMatch) return closedMatch[2].trim();

  // 2. 流式支持：找到最后一个开始标签但未闭合
  const startMatch = [...messageContent.matchAll(/<(think|thinking)>/ig)].pop();
  if (startMatch && typeof startMatch.index === 'number') {
    let content = messageContent.substring(startMatch.index + startMatch[0].length);
    const nextTagStart = content.indexOf('<');
    if (nextTagStart !== -1) {
      content = content.substring(0, nextTagStart);
    }
    return content.trim();
  }

  return '';
}
