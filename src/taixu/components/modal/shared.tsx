import React from 'react';
import { 
  Gem, 
  BookOpen, 
  Sword, 
  Shield, 
  Zap, 
  Shirt, 
  Pill, 
  Scroll, 
  Star,
  Package,
  Compass
} from 'lucide-react';

// 辅助组件：渲染效果列表
export const EffectList = ({ effects, specialEffects }: { effects?: any; specialEffects?: any }) => {
  const allEffects: React.ReactNode[] = [];

  const processEffect = (eff: any, keyPrefix: string) => {
    if (typeof eff === 'string') {
      return (
        <div key={`${keyPrefix}`} className="flex items-center gap-4 p-3 bg-white border border-emerald-50 rounded-xl shadow-xs group hover:border-emerald-200 transition-all">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full group-hover:scale-125 transition-transform shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
          <span className="text-sm font-bold text-slate-700">{eff}</span>
        </div>
      );
    } else if (typeof eff === 'object' && eff !== null) {
      return Object.entries(eff).map(([name, val]: [string, any], idx) => {
        const isComplex = typeof val === 'object' && val !== null && (val.效果 || val.描述);
        return (
          <div key={`${keyPrefix}-${idx}`} className="p-4 bg-white border border-emerald-50 rounded-xl shadow-xs space-y-2 group hover:border-orange-200 transition-all">
            <div className="flex items-center gap-3">
              <span className={`w-1.5 h-1.5 ${isComplex ? 'bg-orange-400' : 'bg-emerald-400'} rounded-full group-hover:scale-125 transition-transform`} />
              <span className="text-sm font-black text-slate-800">{name}</span>
              {!isComplex && <span className="text-sm font-bold text-slate-600">: {String(val)}</span>}
            </div>
            {isComplex && (
              <>
                <div className="text-[10px] text-slate-500 pl-4.5 italic leading-relaxed">
                  {val.描述 || (Array.isArray(val.效果) ? val.效果.join('；') : String(val.效果 || ''))}
                </div>
                {Array.isArray(val.效果) && val.效果.length > 1 && (
                  <div className="flex flex-wrap gap-2 pl-4.5">
                    {val.效果.map((e: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded">{e}</span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        );
      });
    }
    return null;
  };

  if (Array.isArray(effects)) {
    effects.forEach((eff, i) => allEffects.push(processEffect(eff, `eff-${i}`)));
  } else if (effects && typeof effects === 'object') {
    allEffects.push(processEffect(effects, 'eff-obj'));
  }

  if (Array.isArray(specialEffects)) {
    specialEffects.forEach((eff, i) => allEffects.push(processEffect(eff, `spec-${i}`)));
  } else if (specialEffects && typeof specialEffects === 'object') {
    allEffects.push(processEffect(specialEffects, 'spec-obj'));
  }

  const flattened = allEffects.flat().filter(Boolean);
  if (flattened.length === 0) return null;

  return (
    <div className="space-y-3">
      <h5 className="text-xs font-black text-emerald-800 uppercase tracking-widest pl-2 border-l-2 border-emerald-400 ml-1">效果</h5>
      <div className="flex flex-col gap-3">
        {flattened}
      </div>
    </div>
  );
};

// 自定义宝塔图标 (Pagoda/Tower)
const PagodaIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {/* 顶端 */}
    <path d="M12 2v2" />
    {/* 第一层屋顶 */}
    <path d="M7 7l5-3 5 3" />
    <path d="M8 7v3h8V7" />
    {/* 第二层屋顶 */}
    <path d="M5 12l7-4 7 4" />
    <path d="M6 12v4h12v-4" />
    {/* 第三层屋顶 */}
    <path d="M3 19l9-5 9 5" />
    <path d="M4 19v3h16v-3" />
  </svg>
);

export const CategoryIcon = ({ category, className }: { category: string; className?: string }) => {
  const iconMap: Record<string, any> = {
    '灵石': Gem,
    '功法': BookOpen,
    '武器': Sword,
    '装备': Shield,
    '法宝': PagodaIcon,
    '着装': Shirt,
    '丹药': Pill,
    '阵符': Compass,
    '特殊': Star,
  };

  const colorMap: Record<string, string> = {
    '灵石': 'text-cyan-400',
    '功法': 'text-amber-500',
    '武器': 'text-rose-400',
    '装备': 'text-slate-400',
    '法宝': 'text-purple-400',
    '着装': 'text-pink-400',
    '丹药': 'text-emerald-400',
    '阵符': 'text-orange-400',
    '特殊': 'text-indigo-400',
  };

  const IconComponent = iconMap[category] || Package;
  const colorClass = colorMap[category] || 'text-emerald-200';

  return <IconComponent className={`${colorClass} ${className}`} />;
};

export const PackageIcon = ({ className }: any) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);
