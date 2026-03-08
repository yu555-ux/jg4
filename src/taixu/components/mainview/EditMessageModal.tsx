import { X } from 'lucide-react';
import React from 'react';

interface EditMessageModalProps {
  editingMessage: { messageId: number; currentText: string; fullMessage: string } | null;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

const EditMessageModal: React.FC<EditMessageModalProps> = ({
  editingMessage,
  onChange,
  onCancel,
  onSave,
}) => {
  if (!editingMessage) return null;

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-emerald-100 flex flex-col max-h-[80vh]">
        <div className="px-8 py-6 border-b border-emerald-50 flex justify-between items-center bg-emerald-50/30">
          <h3 className="text-emerald-900 font-black tracking-[0.2em] uppercase">因果修正</h3>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-8 flex-1 overflow-hidden">
          <textarea
            value={editingMessage.currentText}
            onChange={event => onChange(event.target.value)}
            className="w-full h-full min-h-[300px] p-6 bg-emerald-50/20 border border-emerald-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 font-serif text-lg leading-relaxed resize-none custom-scrollbar"
            placeholder="在此修正此段因果..."
          />
        </div>
        <div className="px-8 py-6 bg-emerald-50/30 border-t border-emerald-50 flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 text-slate-500 font-bold hover:text-slate-800 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onSave}
            className="px-10 py-2.5 bg-linear-to-br from-emerald-600 to-teal-700 text-white font-black tracking-widest rounded-xl shadow-lg shadow-emerald-200 hover:scale-105 active:scale-95 transition-all"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditMessageModal;
