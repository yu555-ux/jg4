import { getCleanedContent } from './core';

export interface Option {
  id: string;
  text: string;
}

/**
 * 解析消息中的选项
 */
export function parseOptions(messageContent: string): Option[] {
  const { content: cleaned } = getCleanedContent(messageContent);
  if (!cleaned) return [];

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

  // 定义前缀模式
  const letterPattern = /^[A-Z][\.、\s]/;
  const numericPattern = /^(?:选项)?\s*(\d+)([\.\|、\s]+)/i;

  // 判断主要使用的前缀类型
  const hasLetterPrefix = lines.some(line => letterPattern.test(line));
  const hasNumericPrefix = lines.some(line => numericPattern.test(line));

  if (hasLetterPrefix || hasNumericPrefix) {
    const options: Option[] = [];
    let currentOption: string[] = [];
    const activePattern = hasLetterPrefix ? letterPattern : numericPattern;

    for (const line of lines) {
      if (activePattern.test(line)) {
        if (currentOption.length > 0) {
          const text = currentOption.join('\n');
          options.push({
            id: hasLetterPrefix
              ? (text.match(/^[A-Z]/)?.[0] || String.fromCharCode(65 + options.length))
              : (text.match(numericPattern)?.[1] || String.fromCharCode(65 + options.length)),
            text: text.replace(activePattern, hasNumericPrefix ? '$1、' : '').trim()
          });
          currentOption = [];
        }
        currentOption.push(line);
      } else if (currentOption.length > 0) {
        currentOption.push(line);
      }
    }

    if (currentOption.length > 0) {
      const text = currentOption.join('\n');
      options.push({
        id: hasLetterPrefix
          ? (text.match(/^[A-Z]/)?.[0] || String.fromCharCode(65 + options.length))
          : (text.match(numericPattern)?.[1] || String.fromCharCode(65 + options.length)),
        text: text.replace(activePattern, hasNumericPrefix ? '$1、' : '').trim()
      });
    }

    return options;
  } else {
    // 兜底处理：完全没有前缀的情况
    return lines.map((line, index) => ({
      id: String.fromCharCode(65 + index),
      text: line
    }));
  }
}
