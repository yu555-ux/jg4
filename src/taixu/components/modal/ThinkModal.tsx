import React from 'react';

interface ThinkModalProps {
  thinkContent: string;
  hasUnclosedThink: boolean;
  onBack?: () => void;
}

const normalizeThinkingLines = (input: string) => {
  if (!input) return '';
  const lines = input
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      // remove leading bullet markers like "*", "-", "•"
      let cleaned = line.replace(/^[-*•]+\s*/g, '');
      // collapse bold markers
      cleaned = cleaned.replace(/\*\*/g, '');
      return cleaned;
    });

  return lines.join('\n');
};

const headingRegex = /^(\d+|\d+\.\d+|[一二三四五六七八九十]+)\s*(?:[\.、:：])\s*(.*)$/;

const ThinkModal: React.FC<ThinkModalProps> = ({ thinkContent, hasUnclosedThink, onBack }) => {
  const cleanedContent = normalizeThinkingLines(thinkContent);
  if (hasUnclosedThink) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold text-slate-800">思维链</span>
          {onBack && (
            <button
              onClick={onBack}
              className="text-xs px-3 py-1 rounded-full border border-emerald-100 text-emerald-700 hover:bg-emerald-50 transition-colors"
            >
              返回
            </button>
          )}
        </div>
        <div className="text-sm text-rose-500 font-semibold">思维链尚未完成，内容暂不可用</div>
      </div>
    );
  }
  if (!thinkContent.trim()) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold text-slate-800">思维链</span>
          {onBack && (
            <button
              onClick={onBack}
              className="text-xs px-3 py-1 rounded-full border border-emerald-100 text-emerald-700 hover:bg-emerald-50 transition-colors"
            >
              返回
            </button>
          )}
        </div>
        <div className="text-sm text-slate-500">未发现思维链内容</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-slate-800">思维链</span>
        {onBack && (
          <button
            onClick={onBack}
            className="text-xs px-3 py-1 rounded-full border border-emerald-100 text-emerald-700 hover:bg-emerald-50 transition-colors"
          >
            返回
          </button>
        )}
      </div>
      <div className="space-y-2">
        {cleanedContent.split('\n').map((line, index) => {
          const match = line.match(headingRegex);
          if (match) {
            const title = match[2]?.trim() ? `${match[1]}${line.includes(':') || line.includes('：') ? '：' : '、'}${match[2].trim()}` : line;
            return (
              <div key={`${index}-heading`} className="py-2">
                <div className="text-base font-bold text-slate-800">{title}</div>
              </div>
            );
          }
          return (
            <div key={`${index}-line`} className="text-sm leading-relaxed text-slate-700 font-serif whitespace-pre-wrap">
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ThinkModal;
