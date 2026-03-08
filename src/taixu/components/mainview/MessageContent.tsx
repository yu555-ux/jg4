import React from 'react';
import { parseJudgements } from '../../utils/judgementParser';
import { JudgementCard } from '../JudgementCard';
import { RichTextSettings } from './types';

interface MessageContentProps {
  text: string;
  richTextSettings?: RichTextSettings;
}

const MessageContent: React.FC<MessageContentProps> = ({ text, richTextSettings }) => {
  const renderRichText = (content: string) => {
    if (!richTextSettings) return <>{content}</>;

    const buildClass = (color: string, bold: boolean, italic: boolean) => {
      return `${color}${bold ? ' font-bold' : ''}${italic ? ' italic' : ''}`.trim();
    };

    type TokenType = 'double' | 'single' | 'quote' | 'bracket';
    type Node =
      | { type: 'text'; value: string }
      | { type: 'token'; token: TokenType; children: Node[] }
      | { type: 'root'; children: Node[] };

    const tokenDefs = [
      {
        token: 'double' as const,
        open: '**',
        close: '**',
        className: buildClass(richTextSettings.doubleStarColor, richTextSettings.doubleStarBold, richTextSettings.doubleStarItalic),
        wrap: (nodes: React.ReactNode[]) => <>{nodes}</>,
      },
      {
        token: 'single' as const,
        open: '*',
        close: '*',
        className: buildClass(richTextSettings.singleStarColor, richTextSettings.singleStarBold, richTextSettings.singleStarItalic),
        wrap: (nodes: React.ReactNode[]) => <>{nodes}</>,
      },
      {
        token: 'quote' as const,
        open: '“',
        close: '”',
        className: buildClass(richTextSettings.quoteColor, richTextSettings.quoteBold, richTextSettings.quoteItalic),
        wrap: (nodes: React.ReactNode[]) => <>“{nodes}”</>,
      },
      {
        token: 'bracket' as const,
        open: '「',
        close: '」',
        className: buildClass(richTextSettings.bracketColor, richTextSettings.bracketBold, richTextSettings.bracketItalic),
        wrap: (nodes: React.ReactNode[]) => <>「{nodes}」</>,
      },
    ];

    const root: Node = { type: 'root', children: [] };
    const stack: Node[] = [root];
    let buffer = '';

    const flush = () => {
      if (!buffer) return;
      const current = stack[stack.length - 1];
      if (current.type === 'token' || current.type === 'root') {
        current.children.push({ type: 'text', value: buffer });
      }
      buffer = '';
    };

    const sortedDefs = [...tokenDefs].sort((a, b) => b.open.length - a.open.length);
    let i = 0;
    while (i < content.length) {
      let matched = false;
      for (const def of sortedDefs) {
        if (content.startsWith(def.open, i)) {
          const top = stack[stack.length - 1];
          const isSymmetric = def.open === def.close;
          if (isSymmetric && top.type === 'token' && top.token === def.token) {
            flush();
            stack.pop();
          } else {
            flush();
            const node: Node = { type: 'token', token: def.token, children: [] };
            if (top.type === 'token' || top.type === 'root') top.children.push(node);
            stack.push(node);
          }
          i += def.open.length;
          matched = true;
          break;
        }
        if (def.open !== def.close && content.startsWith(def.close, i)) {
          const top = stack[stack.length - 1];
          if (top.type === 'token' && top.token === def.token) {
            flush();
            stack.pop();
            i += def.close.length;
            matched = true;
            break;
          }
        }
      }
      if (!matched) {
        buffer += content[i];
        i += 1;
      }
    }
    flush();
    while (stack.length > 1) {
      const unclosed = stack.pop();
      if (unclosed?.type === 'token') {
        const parent = stack[stack.length - 1];
        if (parent.type === 'token' || parent.type === 'root') {
          parent.children.push({
            type: 'text',
            value: unclosed.children.map(node => (node.type === 'text' ? node.value : '')).join('')
          });
        }
      }
    }

    const renderNodes = (nodes: Node[]): React.ReactNode[] => {
      const rendered: React.ReactNode[] = [];
      let keyIndex = 0;
      for (const node of nodes) {
        if (node.type === 'text') {
          rendered.push(node.value);
        } else if (node.type === 'token') {
          const def = tokenDefs.find(d => d.token === node.token);
          if (!def) {
            rendered.push(node.children.map(child => (child.type === 'text' ? child.value : '')));
          } else {
            rendered.push(
              <span key={`rt-${keyIndex++}`} className={def.className}>
                {def.wrap(renderNodes(node.children))}
              </span>
            );
          }
        }
      }
      return rendered;
    };

    return <>{renderNodes(root.children)}</>;
  };

  const renderMessageContent = (content: string) => {
    // 1. 首先解析并提取判定内容
    const judgements = parseJudgements(content);

    if (judgements.length === 0) {
      // 如果没有判定内容，走原本的段落渲染逻辑
      return (
        <div className="text-lg leading-relaxed text-slate-800 font-serif space-y-4">
          {content.split('\n').filter(p => p.trim()).map((paragraph, idx) => (
            <p key={idx} className="indent-8 text-justify">
              {renderRichText(paragraph.trim())}
            </p>
          ))}
        </div>
      );
    }

    // 2. 如果有判定内容，需要按顺序混合渲染文字和卡片
    const blocks = content.split(/(\[[\s\S]*?\])/g);

    return (
      <div className="text-lg leading-relaxed text-slate-800 font-serif space-y-4">
        {blocks.map((block, idx) => {
          if (block.startsWith('[') && block.endsWith(']')) {
            const parsed = parseJudgements(block);
            if (parsed.length > 0) {
              return <JudgementCard key={idx} data={parsed[0]} />;
            }
          }

          // 非判定块，作为普通段落处理
          if (!block.trim()) return null;

          return block.split('\n').filter(p => p.trim()).map((paragraph, pIdx) => (
            <p key={`${idx}-${pIdx}`} className="indent-8 text-justify">
              {renderRichText(paragraph.trim())}
            </p>
          ));
        })}
      </div>
    );
  };

  return renderMessageContent(text);
};

export default MessageContent;
