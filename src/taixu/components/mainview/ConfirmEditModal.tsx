import { Pencil } from 'lucide-react';
import React from 'react';

interface ConfirmEditModalProps {
  show: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmEditModal: React.FC<ConfirmEditModalProps> = ({ show, onCancel, onConfirm }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 border border-emerald-100 text-center">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Pencil className="w-7 h-7 text-emerald-600" />
        </div>
        <h3 className="text-xl font-black text-emerald-900 mb-4 tracking-widest">修正因果？</h3>
        <p className="text-slate-600 mb-8 leading-relaxed">
          因果牵一发而动全身，<br />你确定要修正这段已成之实吗？
        </p>
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-emerald-600 text-white font-black tracking-widest rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmEditModal;
