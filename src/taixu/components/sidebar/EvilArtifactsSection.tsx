import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface Props {
  artifacts: any[];
  onOpenDetail: (item: { label: string; data: any; type: 'evil' }) => void;
}

const EvilArtifactsSection: React.FC<Props> = ({ artifacts = [], onOpenDetail }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="mb-8">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between text-emerald-800 font-bold mb-4 border-b border-emerald-200 pb-2"
      >
        邪物收容
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`space-y-3 transition-all ${isOpen ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
        {artifacts.length === 0 ? (
          <div className="w-full text-left p-3 bg-white/40 border border-emerald-100 rounded-lg text-sm text-slate-400 italic font-bold">
            暂无邪物收容
          </div>
        ) : (
          artifacts.map((artifact, idx) => (
            <button
              key={`${artifact.名称 || '邪物'}-${idx}`}
              onClick={() => onOpenDetail({ label: artifact.名称 || '邪物', data: artifact, type: 'evil' })}
              className="w-full p-3 bg-linear-to-br from-white/90 to-rose-50/70 border border-rose-200/70 rounded-lg shadow-[0_6px_16px_rgba(120,20,20,0.15)] text-left relative overflow-hidden"
            >
              <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#8b1e1e_0.5px,transparent_0.5px)] [background-size:20px_20px] pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-900 font-bold tracking-wide">{artifact.名称 || '未命名邪物'}</span>
                <span className="text-[10px] font-black text-rose-900 bg-rose-100/80 border border-rose-200 px-2 py-0.5 rounded-full">
                  {artifact.危险等级 || '未知等级'}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
};

export default EvilArtifactsSection;
