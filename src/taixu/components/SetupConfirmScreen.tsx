import React from 'react';

interface Props {
  message: string;
  onChangeMessage: (value: string) => void;
  onBack: () => void;
  onConfirm: () => void;
}

const SetupConfirmScreen: React.FC<Props> = ({ message, onChangeMessage, onBack, onConfirm }) => {
  return (
    <div className="fixed inset-0 z-[976] flex items-center justify-center bg-slate-200 text-slate-900">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 24%, rgba(6,78,59,0.45), transparent 58%), radial-gradient(circle at 82% 28%, rgba(13,116,107,0.4), transparent 60%), radial-gradient(circle at 50% 82%, rgba(100,116,139,0.65), transparent 52%)'
        }}
      />
      <div className="absolute inset-0 opacity-[0.14] bg-[radial-gradient(circle_at_1px_1px,_rgba(15,23,42,0.75)_1px,_transparent_0)] [background-size:18px_18px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-500/60 via-transparent to-slate-600/40" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-[5vw] inset-y-[6vh] rounded-[38px] border border-teal-200/45 shadow-[0_50px_140px_rgba(8,47,73,0.35)]" />
        <div className="absolute inset-x-[6.5vw] inset-y-[7.5vh] rounded-[32px] border border-teal-200/30" />
        <div className="absolute left-0 top-0 h-full w-[22vw] bg-gradient-to-r from-slate-500/80 via-slate-400/35 to-transparent" />
        <div className="absolute right-0 top-0 h-full w-[22vw] bg-gradient-to-l from-slate-500/80 via-slate-400/35 to-transparent" />
        <div className="absolute top-10 left-1/2 -translate-x-1/2 h-[2px] w-[70vw] bg-gradient-to-r from-transparent via-teal-300/70 to-transparent" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 h-[2px] w-[70vw] bg-gradient-to-r from-transparent via-teal-300/60 to-transparent" />
      </div>

      <div className="relative w-[94vw] max-w-[980px] rounded-[36px] border border-teal-200/40 bg-slate-900/70 text-slate-100 shadow-[0_40px_120px_rgba(8,47,73,0.45)]">
        <div className="absolute inset-0 rounded-[36px] pointer-events-none">
          <div className="absolute inset-x-10 top-8 h-[2px] bg-gradient-to-r from-transparent via-teal-300/60 to-transparent" />
          <div className="absolute inset-x-10 bottom-8 h-[2px] bg-gradient-to-r from-transparent via-teal-300/60 to-transparent" />
        </div>

        <div className="relative z-10 px-10 py-10">
          <div className="flex items-center justify-between mb-6">
            <div className="text-lg tracking-[0.45em] text-teal-200">开局确认</div>
          </div>

          <div className="text-sm text-slate-300 mb-3">即将发送的消息（可修改）：</div>
          <textarea
            className="w-full h-[42vh] rounded-2xl border border-slate-600/60 bg-slate-900/80 p-4 text-sm leading-6 text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/60"
            value={message}
            onChange={(e) => onChangeMessage(e.target.value)}
          />

          <div className="mt-8 flex items-center justify-between">
            <button
              className="px-6 py-3 rounded-full border border-slate-500/60 text-slate-200 hover:border-teal-200/70"
              onClick={onBack}
            >
              返回修改
            </button>
            <button
              className="px-10 py-3 rounded-full border border-amber-200/70 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
              onClick={onConfirm}
            >
              确认发送
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupConfirmScreen;
