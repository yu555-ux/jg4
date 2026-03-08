import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AuthorityButton } from './SidebarUI';

interface Props {
  authorities: any;
  onOpenAuthority: (name: string, data: any) => void;
  onOpenModal: (type: string) => void;
}

const PowerSection: React.FC<Props> = ({ authorities, onOpenAuthority, onOpenModal }) => {
  const [isAuthorityOpen, setIsAuthorityOpen] = useState(false);
  const [isBlessingOpen, setIsBlessingOpen] = useState(false);
  return (
    <>
      <section className="mb-8">
        <button
          onClick={() => setIsAuthorityOpen(prev => !prev)}
          className="w-full flex items-center justify-between text-emerald-800 font-bold mb-4 border-b border-emerald-200 pb-2"
        >
          仙玉权柄
          <ChevronDown className={`w-4 h-4 transition-transform ${isAuthorityOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className={`space-y-3 transition-all ${isAuthorityOpen ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
          {Object.entries(authorities || {}).map(([name, data]: [string, any]) => (
            <button
              key={name}
              onClick={() => onOpenAuthority(name, data)}
              className="w-full flex justify-between items-center p-3 bg-white/50 border border-emerald-100 rounded-xl hover:border-emerald-400 hover:bg-emerald-50/50 transition-all group shadow-sm active:scale-[0.98]"
            >
              <div className="flex flex-col">
                <span className="text-sm font-bold text-emerald-900 group-hover:text-emerald-600 transition-colors">{name}</span>
                {data?.持续时间 && (
                  <span className="text-[10px] text-emerald-600 mt-0.5">{data.持续时间}</span>
                )}
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-black group-hover:bg-emerald-500 group-hover:text-white transition-all">
                Lv.{data.当前等级}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <button
          onClick={() => setIsBlessingOpen(prev => !prev)}
          className="w-full flex items-center justify-between text-emerald-800 font-bold mb-4 border-b border-emerald-200 pb-2"
        >
          仙缘恩赐
          <ChevronDown className={`w-4 h-4 transition-transform ${isBlessingOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className={`space-y-2 transition-all ${isBlessingOpen ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
          <AuthorityButton label="仙缘商城" onClick={() => onOpenModal('shop')} />
          <AuthorityButton label="天运卜算" onClick={() => onOpenModal('luck')} />
          <AuthorityButton label="任务清单" onClick={() => onOpenModal('tasks')} />
          <AuthorityButton label="成就奖赏" onClick={() => onOpenModal('achievements')} />
          <AuthorityButton label="储物空间" onClick={() => onOpenModal('storage')} />
        </div>
      </section>
    </>
  );
};

export default PowerSection;
