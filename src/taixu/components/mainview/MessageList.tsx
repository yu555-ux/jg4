import React from 'react';
import MessageContent from './MessageContent';
import { RichTextSettings } from './types';

interface MessageListProps {
  history: Array<{ role: 'model' | 'user'; text: string }>;
  richTextSettings?: RichTextSettings;
  onLongPressStart: (event: React.TouchEvent, role: string) => void;
  onLongPressEnd: () => void;
  onContextMenuOpen: (event: React.MouseEvent, role: string) => void;
  endRef: React.RefObject<HTMLDivElement>;
  bottomInset?: number;
}

const MessageList: React.FC<MessageListProps> = ({
  history,
  richTextSettings,
  onLongPressStart,
  onLongPressEnd,
  onContextMenuOpen,
  endRef,
  bottomInset,
}) => (
  <div
    className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 md:px-6 pt-8 md:pt-10 pb-0 flex flex-col items-center custom-scrollbar"
    style={bottomInset ? { paddingBottom: `${bottomInset}px` } : undefined}
  >
    <div className="max-w-[92vw] sm:max-w-[36rem] lg:max-w-2xl w-full space-y-10 md:space-y-12 pb-0">
      {history.map((msg, i) => (
        <div
          key={i}
          className={`animate-in fade-in slide-in-from-bottom-4 duration-700 ${msg.role === 'user' ? 'self-end text-right' : 'self-start'}`}
          onContextMenu={event => onContextMenuOpen(event, msg.role)}
          onTouchStart={event => onLongPressStart(event, msg.role)}
          onTouchEnd={onLongPressEnd}
          onTouchCancel={onLongPressEnd}
        >
          {msg.role === 'model' ? (
            <div className="relative group">
              <MessageContent text={msg.text} richTextSettings={richTextSettings} />
            </div>
          ) : (
            <div className="bg-white/80 border border-slate-800/80 rounded-2xl px-6 py-3 inline-block shadow-sm">
              <p className="text-slate-900 font-medium italic">
                「{msg.text}」
              </p>
            </div>
          )}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  </div>
);

export default MessageList;
