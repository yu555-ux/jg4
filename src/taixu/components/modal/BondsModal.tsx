import React, { useState } from 'react';
import {
  User,
  Heart,
  Compass,
  Flame,
  Ghost,
  Eye,
  EyeOff,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';

interface BondsModalProps {
  data: any;
}

const BondsModal: React.FC<BondsModalProps> = ({ data }) => {
  const bondsSource = data?.source || data || {};
  const [selectedName, setSelectedName] = useState<string | null>(data?.initialName || null);
  const [showSecrets, setShowSecrets] = useState(false);

  // 兼容逻辑：处理 data
  const allBonds = Object.entries(bondsSource).map(([name, detail]: [string, any]) => ({
    name,
    ...detail
  }));

  const selectedBond = selectedName ? allBonds.find(b => b.name === selectedName) : null;

  // 亲密度进度条颜色
  const getAffinityColor = (val: number) => {
    if (val >= 100) return 'bg-linear-to-r from-rose-400 to-pink-500';
    if (val > 0) return 'bg-linear-to-r from-emerald-400 to-teal-500';
    if (val === 0) return 'bg-slate-300';
    return 'bg-linear-to-r from-slate-400 to-slate-600';
  };

  // 列表界面
  if (!selectedBond) {
    return (
      <div className="flex flex-col h-full animate-in fade-in duration-500">
        <div className="grid grid-cols-2 gap-4 pb-4">
          {allBonds.length === 0 ? (
            <div className="col-span-2 h-64 flex flex-col items-center justify-center text-slate-300 gap-4 opacity-40">
              <User className="w-16 h-16" />
              <p className="font-serif italic tracking-widest">红尘寂寥，尚无因果牵绊...</p>
            </div>
          ) : (
            allBonds.map((bond, i) => (
              <button
                key={bond.name}
                onClick={() => setSelectedName(bond.name)}
                className="group relative p-5 bg-white border border-emerald-100 rounded-2xl shadow-sm hover:border-emerald-400 hover:shadow-md transition-all text-left animate-in zoom-in-95"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-bold text-slate-800 truncate">{bond.name}</h4>
                    <p className="text-xs text-slate-500 truncate">{bond.身份 || '未知'}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-emerald-200 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                </div>
                
                {/* 简易亲密度条 */}
                <div className="mt-4 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${getAffinityColor(bond.亲密度)}`}
                    style={{ width: `${Math.abs((bond.亲密度 + 200) / 400 * 100)}%` }}
                  />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // 详情界面
  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500">
      <button
        onClick={() => { setSelectedName(null); setShowSecrets(false); }}
        className="mb-6 flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold text-sm transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" /> 返回羁绊列表
      </button>

      <div className="flex-1 space-y-6">
        {/* 头部卡片 */}
        <div className="p-6 jade-gradient border border-emerald-100 rounded-3xl shadow-sm relative overflow-hidden">
          
          <div className="flex justify-between items-start relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded uppercase tracking-wider">
                  {selectedBond.身份 || '未知'}
                </span>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-black rounded uppercase tracking-wider">
                  {selectedBond.关系 || '未知'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-3xl font-serif font-bold text-slate-900">{selectedBond.name}</h3>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black rounded uppercase tracking-wider">
                  {selectedBond.境界 || '未知'}（{selectedBond.境界映射 ?? '未知'}）
                </span>
              </div>
              <p className="text-sm text-slate-500 font-medium italic">“{selectedBond.核心性格 || '性格莫测'}”</p>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">亲密度</div>
              <div className={`text-2xl font-black flex items-center justify-end gap-1 ${
                selectedBond.亲密度 >= 0 ? 'text-rose-500' : 'text-slate-500'
              }`}>
                <Heart className={`w-5 h-5 ${selectedBond.亲密度 >= 100 ? 'fill-rose-500' : ''}`} />
                {selectedBond.亲密度}
              </div>
            </div>
          </div>

          {/* 亲密度仅保留右上角显示 */}
        </div>

        {/* 修行信息网格 */}
        {/* 天赋灵根 */}
        <div className="space-y-3">
          <h5 className="text-xs font-black text-emerald-800 uppercase tracking-[0.3em] pl-2 border-l-2 border-emerald-400 ml-1">天赋灵根</h5>
          <div className="p-4 bg-white border border-emerald-50 rounded-2xl shadow-xs space-y-2">
            <div className="text-sm text-slate-700 font-medium">{selectedBond.天赋灵根?.描述 || '暂无描述'}</div>
            <div className="flex flex-wrap gap-2">
              {(selectedBond.天赋灵根?.效果 || []).length === 0 ? (
                <span className="text-[10px] text-slate-400 italic">暂无灵根效果</span>
              ) : (
                selectedBond.天赋灵根.效果.map((eff: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded">
                    {eff}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 主修功法 */}
        <div className="space-y-3">
          <h5 className="text-xs font-black text-emerald-800 uppercase tracking-[0.3em] pl-2 border-l-2 border-amber-400 ml-1">主修功法</h5>
          <div className="p-4 bg-white border border-emerald-50 rounded-2xl shadow-xs space-y-2">
            <div className="text-sm font-black text-slate-800">{selectedBond.主修功法?.名称 || '未知功法'}</div>
            <div className="text-xs text-slate-500 italic leading-relaxed">{selectedBond.主修功法?.描述 || '暂无描述'}</div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {(selectedBond.主修功法?.招式 || []).length === 0 ? (
              <div className="p-4 bg-white border border-emerald-50 rounded-2xl shadow-xs text-sm text-slate-400 italic">
                暂无招式
              </div>
            ) : (
              selectedBond.主修功法.招式.map((move: any, idx: number) => (
                <div key={idx} className="p-4 bg-white border border-emerald-50 rounded-2xl shadow-xs space-y-2">
                  <div className="text-sm font-black text-slate-800">{move.名称 || '未知招式'}</div>
                  <div className="text-xs text-slate-500 italic leading-relaxed">{move.描述 || '暂无描述'}</div>
                  <div className="flex flex-wrap gap-2">
                    {(move.效果 || []).map((eff: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded">
                        {eff}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 本命法宝 */}
        <div className="space-y-3">
          <h5 className="text-xs font-black text-emerald-800 uppercase tracking-[0.3em] pl-2 border-l-2 border-cyan-400 ml-1">本命法宝</h5>
          <div className="p-4 bg-white border border-emerald-50 rounded-2xl shadow-xs space-y-2">
            <div className="text-sm font-black text-slate-800">{selectedBond.本命法宝?.名称 || '未知法宝'}</div>
            <div className="text-xs text-slate-500 italic leading-relaxed">{selectedBond.本命法宝?.描述 || '暂无描述'}</div>
            <div className="flex flex-wrap gap-2">
              {(selectedBond.本命法宝?.效果 || []).length === 0 ? (
                <span className="text-[10px] text-slate-400 italic">暂无法宝效果</span>
              ) : (
                selectedBond.本命法宝.效果.map((eff: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 bg-cyan-50 text-cyan-700 text-[10px] font-bold rounded">
                    {eff}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 本命武器 */}
        <div className="space-y-3">
          <h5 className="text-xs font-black text-emerald-800 uppercase tracking-[0.3em] pl-2 border-l-2 border-slate-400 ml-1">本命武器</h5>
          <div className="p-4 bg-white border border-emerald-50 rounded-2xl shadow-xs space-y-2">
            <div className="text-sm font-black text-slate-800">{selectedBond.本命武器?.名称 || '未知武器'}</div>
            <div className="text-xs text-slate-500 italic leading-relaxed">{selectedBond.本命武器?.描述 || '暂无描述'}</div>
            <div className="flex flex-wrap gap-2">
              {(selectedBond.本命武器?.效果 || []).length === 0 ? (
                <span className="text-[10px] text-slate-400 italic">暂无武器效果</span>
              ) : (
                selectedBond.本命武器.效果.map((eff: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-50 text-slate-700 text-[10px] font-bold rounded">
                    {eff}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 深度信息（收起样式） */}
        <div className="space-y-3 pt-2">
          <button 
            onClick={() => setShowSecrets(!showSecrets)}
            className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-xs">
                {showSecrets ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </div>
              <span className="text-sm font-black text-slate-600 uppercase tracking-widest">窥探心渊</span>
            </div>
            <ChevronRight className={`w-5 h-5 text-slate-300 transition-transform duration-300 ${showSecrets ? 'rotate-90' : ''}`} />
          </button>

          {showSecrets && (
            <div className="grid grid-cols-1 gap-3 animate-in slide-in-from-top-2 duration-300">
              <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-1">
                <div className="flex items-center gap-2 text-[10px] font-black text-purple-400 uppercase tracking-widest">
                  <Flame className="w-3 h-3" /> 欲望
                </div>
                <p className="text-sm text-purple-900 font-medium leading-relaxed">{selectedBond.欲望 || '？？？'}</p>
              </div>
              <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl space-y-1">
                <div className="flex items-center gap-2 text-[10px] font-black text-rose-400 uppercase tracking-widest">
                  <Ghost className="w-3 h-3" /> 执念
                </div>
                <p className="text-sm text-rose-900 font-medium leading-relaxed">{selectedBond.执念 || '？？？'}</p>
              </div>
            </div>
          )}
        </div>

        {/* 交互经历列表 */}
        {selectedBond.交互经历 && selectedBond.交互经历.length > 0 && (
          <div className="space-y-3 pt-2 pb-6">
            <h5 className="text-xs font-black text-emerald-800 uppercase tracking-widest pl-2 border-l-2 border-emerald-400">因果往事</h5>
            <div className="space-y-2">
              {selectedBond.交互经历.map((exp: string, idx: number) => (
                <div key={idx} className="p-3 bg-white border border-slate-100 rounded-xl text-xs text-slate-600 leading-relaxed shadow-xs">
                  {exp}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 辅助组件：信息卡片
const InfoCard: React.FC<{ icon: React.ReactNode, label: string, value: string, subValue?: string }> = ({ icon, label, value, subValue }) => (
  <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-xs hover:border-emerald-200 transition-all space-y-1">
    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
      {icon} {label}
    </div>
    <div className="text-sm font-bold text-slate-800">{value || '未知'}</div>
    {subValue && <div className="text-[9px] text-slate-400 font-medium">{subValue}</div>}
  </div>
);

export default BondsModal;
