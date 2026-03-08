export interface CleanedResult {
  content: string;
  isPending: boolean; // 是否处于思考中或标签未闭合
}

/**
 * 核心过滤机制：预处理消息内容
 * 规则：
 * 1. 如果存在未闭合的 <think> 或 <thinking>，说明正在思考中，返回空字符串（隐藏所有内容）。
 * 2. 如果思考已结束，仅返回思考标签之后的内容。
 * 3. 如果完全没有思考标签，返回原内容。
 */
export function getCleanedContent(content: string): CleanedResult {
  if (!content) return { content: '', isPending: false };

  const thinkStart = content.search(/<(think|thinking)>/i);

  if (thinkStart !== -1) {
    // 找到了思考标签，检查是否闭合
    const thinkEnd = content.search(/<\/(think|thinking)>/i);

    if (thinkEnd === -1) {
      // 思考标签未闭合：如已开始输出 <maintext>，则允许返回正文片段
      const startTag = '<maintext>';
      const mainIndex = content.toLowerCase().lastIndexOf(startTag);
      if (mainIndex !== -1) {
        return { content: content.substring(mainIndex).trim(), isPending: true };
      }
      // 否则忽略全部内容
      return { content: '', isPending: true };
    }
    // 思考标签已闭合 -> 提取闭合标签之后的内容
    const closingTagMatch = content.match(/<\/(think|thinking)>/i);
    const offset = closingTagMatch!.index! + closingTagMatch![0].length;
    return { content: content.substring(offset).trim(), isPending: false };
  }

  // 没有思考标签，直接返回
  return { content: content.trim(), isPending: false };
}
