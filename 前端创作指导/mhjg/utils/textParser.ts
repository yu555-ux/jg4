/**
 * 文本解析工具 - 支持简单的富文本格式
 * 支持不同的标点符号包裹的文字会有不同的字体变色
 */

/**
 * 解析富文本，支持多种标点符号包裹的文字变色：
 * - **文本** -> 加粗/高亮（金色）
 * - *文本* -> 强调（橙色）
 * - _文本_ -> 下划线强调（青色）
 * - ~文本~ -> 删除线（灰色）
 * - #文本# -> 标题/特殊（紫色）
 * - 【文本】 -> 特殊标记（紫色，与 #文本# 相同）
 * - [文本] -> 注释/说明（蓝色）
 * - (文本) -> 括号内容（绿色）
 * - 「文本」 -> 引号内容（粉色）
 * - "文本" 或 "文本" 或 "文本" -> 双引号引用样式（紫色）
 * - '文本' 或 '文本' 或 '文本' -> 单引号引用（浅蓝色）
 * - 『文本』 -> 双书名号（粉色，与「文本」相同）
 * - 《文本》 -> 书名号（可添加新样式）
 * - \n -> 换行
 * 
 * 支持嵌套标记，如 **【文本】** 会生成嵌套的 span 标签
 */
export function parseRichText(text: string): string {
  if (!text) return '';

  // 使用递归解析嵌套标记
  return parseNestedRichText(text);
}

/**
 * 递归解析嵌套的富文本标记
 * 参考 zhutiangame1 的实现方式，使用字符级解析确保嵌套标记正确处理
 */
function parseNestedRichText(text: string): string {
  if (!text) return '';

  const result: string[] = [];
  let i = 0;

  while (i < text.length) {
    const remaining = text.substring(i);
    let matched = false;

    // 1. 处理 **文本** 加粗/高亮（金色）- 优先处理，避免与 * 冲突
    if (remaining.startsWith('**')) {
      const end = remaining.indexOf('**', 2);
      if (end > 0) {
        const content = remaining.substring(2, end);
        const parsedContent = parseNestedRichText(content); // 递归解析嵌套内容
        result.push(`<span class="text-highlight">${parsedContent}</span>`);
        i += end + 2;
        matched = true;
      }
    }

    // 2. 处理 *文本* 强调（橙色）- 确保不会匹配 **
    if (!matched && remaining.startsWith('*') && !remaining.startsWith('**')) {
      const end = remaining.indexOf('*', 1);
      if (end > 0 && (end >= remaining.length - 1 || remaining[end + 1] !== '*')) {
        const content = remaining.substring(1, end);
        const parsedContent = parseNestedRichText(content); // 递归解析嵌套内容
        result.push(`<span class="text-emphasis">${parsedContent}</span>`);
        i += end + 1;
        matched = true;
      }
    }

    // 3. 处理 _文本_ 下划线强调（青色）
    if (!matched && remaining.startsWith('_')) {
      const end = remaining.indexOf('_', 1);
      if (end > 0) {
        const content = remaining.substring(1, end);
        const parsedContent = parseNestedRichText(content);
        result.push(`<span class="text-underline">${parsedContent}</span>`);
        i += end + 1;
        matched = true;
      }
    }

    // 4. 处理 ~文本~ 删除线（灰色）
    if (!matched && remaining.startsWith('~')) {
      const end = remaining.indexOf('~', 1);
      if (end > 0) {
        const content = remaining.substring(1, end);
        const parsedContent = parseNestedRichText(content);
        result.push(`<span class="text-strikethrough">${parsedContent}</span>`);
        i += end + 1;
        matched = true;
      }
    }

    // 5. 处理 #文本# 标题/特殊（紫色）
    if (!matched && remaining.startsWith('#')) {
      const end = remaining.indexOf('#', 1);
      if (end > 0) {
        const content = remaining.substring(1, end);
        const parsedContent = parseNestedRichText(content);
        result.push(`<span class="text-special">${parsedContent}</span>`);
        i += end + 1;
        matched = true;
      }
    }

    // 6. 处理 【文本】 特殊标记（紫色，与 #文本# 相同）
    if (!matched && remaining.startsWith('【')) {
      const end = remaining.indexOf('】');
      if (end > 0) {
        const content = remaining.substring(1, end);
        const parsedContent = parseNestedRichText(content);
        result.push(`<span class="text-special">${parsedContent}</span>`);
        i += end + 1;
        matched = true;
      }
    }

    // 7. 处理 [文本] 注释/说明（蓝色）
    if (!matched && remaining.startsWith('[')) {
      const end = remaining.indexOf(']');
      if (end > 0) {
        const content = remaining.substring(1, end);
        const parsedContent = parseNestedRichText(content);
        result.push(`<span class="text-note">${parsedContent}</span>`);
        i += end + 1;
        matched = true;
      }
    }

    // 8. 处理 (文本) 括号内容（绿色）
    if (!matched && remaining.startsWith('(')) {
      const end = remaining.indexOf(')');
      if (end > 0) {
        const content = remaining.substring(1, end);
        const parsedContent = parseNestedRichText(content);
        result.push(`<span class="text-bracket">${parsedContent}</span>`);
        i += end + 1;
        matched = true;
      }
    }

    // 9. 处理 「文本」 引号内容（粉色）
    if (!matched && remaining.startsWith('「')) {
      const end = remaining.indexOf('」');
      if (end > 0) {
        const content = remaining.substring(1, end);
        const parsedContent = parseNestedRichText(content);
        result.push(`<span class="text-quote-cn">${parsedContent}</span>`);
        i += end + 1;
        matched = true;
      }
    }

    // 9.5. 处理 『文本』 双书名号（粉色，与「文本」相同）
    if (!matched && remaining.startsWith('『')) {
      const end = remaining.indexOf('』');
      if (end > 0) {
        const content = remaining.substring(1, end);
        const parsedContent = parseNestedRichText(content);
        result.push(`<span class="text-quote-cn">${parsedContent}</span>`);
        i += end + 1;
        matched = true;
      }
    }

    // 9.6. 处理 《文本》 书名号（紫色，与特殊标记相同）
    if (!matched && remaining.startsWith('《')) {
      const end = remaining.indexOf('》');
      if (end > 0) {
        const content = remaining.substring(1, end);
        const parsedContent = parseNestedRichText(content);
        result.push(`<span class="text-special">${parsedContent}</span>`);
        i += end + 1;
        matched = true;
      }
    }

    // 10. 处理双引号包裹的文本（引用样式，紫色）
    // 匹配中文双引号 "..." 和 "..." 或英文双引号 "..."
    if (!matched) {
      // 中文左双引号 " (U+201C)
      if (remaining.startsWith('\u201C')) {
        const end = remaining.indexOf('\u201D', 1);
        if (end > 0) {
          const content = remaining.substring(1, end);
          const parsedContent = parseNestedRichText(content);
          result.push(`<span class="text-quote">${parsedContent}</span>`);
          i += end + 1;
          matched = true;
        }
      }
      // 中文右双引号 " (U+201D)（作为开始引号）
      else if (remaining.startsWith('\u201D')) {
        const end = remaining.indexOf('\u201C', 1);
        if (end > 0) {
          const content = remaining.substring(1, end);
          const parsedContent = parseNestedRichText(content);
          result.push(`<span class="text-quote">${parsedContent}</span>`);
          i += end + 1;
          matched = true;
        }
      }
      // 英文双引号 "
      else if (remaining.startsWith('"')) {
        const end = remaining.indexOf('"', 1);
        if (end > 0) {
          const content = remaining.substring(1, end);
          const parsedContent = parseNestedRichText(content);
          result.push(`<span class="text-quote">${parsedContent}</span>`);
          i += end + 1;
          matched = true;
        }
      }
    }

    // 11. 处理单引号引用（浅蓝色）
    // 匹配中文单引号 '...' 和 '...' 或英文单引号 '...'
    if (!matched) {
      // 中文左单引号 ' (U+2018)
      if (remaining.startsWith('\u2018')) {
        const end = remaining.indexOf('\u2019', 1);
        if (end > 0) {
          const content = remaining.substring(1, end);
          const parsedContent = parseNestedRichText(content);
          result.push(`<span class="text-quote-single">${parsedContent}</span>`);
          i += end + 1;
          matched = true;
        }
      }
      // 中文右单引号 ' (U+2019)（作为开始引号）
      else if (remaining.startsWith('\u2019')) {
        const end = remaining.indexOf('\u2018', 1);
        if (end > 0) {
          const content = remaining.substring(1, end);
          const parsedContent = parseNestedRichText(content);
          result.push(`<span class="text-quote-single">${parsedContent}</span>`);
          i += end + 1;
          matched = true;
        }
      }
      // 英文单引号 '
      else if (remaining.startsWith("'")) {
        const end = remaining.indexOf("'", 1);
        if (end > 0) {
          const content = remaining.substring(1, end);
          const parsedContent = parseNestedRichText(content);
          result.push(`<span class="text-quote-single">${parsedContent}</span>`);
          i += end + 1;
          matched = true;
        }
      }
    }

    // 12. 处理换行符
    if (!matched && remaining.startsWith('\n')) {
      result.push('<br>');
      i += 1;
      matched = true;
    }

    // 如果没有匹配到任何标记，添加普通字符
    if (!matched) {
      // HTML 转义特殊字符
      const char = text[i];
      if (char === '<') {
        result.push('&lt;');
      } else if (char === '>') {
        result.push('&gt;');
      } else if (char === '&') {
        result.push('&amp;');
      } else {
        result.push(char);
      }
      i++;
    }
  }

  return result.join('');
}

