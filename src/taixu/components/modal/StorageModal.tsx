import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import React, { useState } from 'react';
import { ProgressBar } from '../UIElements';
import { CategoryIcon, EffectList, PackageIcon } from './shared';

interface StorageModalProps {
  data: any;
}

const StorageModal: React.FC<StorageModalProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState('总览');
  const [subTab, setSubTab] = useState('全部');
  const [selectedStorageItem, setSelectedStorageItem] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  // 兼容逻辑：如果 data 中包含 '储物空间'，则使用 data.储物空间，否则使用 data 本身
  const ringSource = data?.储物空间 || data || {};

  const inventoryItems = Object.entries(ringSource).map(([name, item]: [string, any]) => ({
    name,
    ...item
  }));

  const filteredItems = inventoryItems.filter(item => {
    if (activeTab === '总览') return true;
    if (item.分类 !== activeTab) return false;
    if (subTab === '全部') return true;
    // 灵石不再进行子分类过滤
    if (activeTab === '灵石') return true;
    if (activeTab === '着装') return item.着装类型 === subTab;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const paginatedItems = filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleTabChange = (cat: string) => {
    setActiveTab(cat);
    setSubTab('全部');
    setCurrentPage(1);
  };

  const handleSubTabChange = (sub: string) => {
    setSubTab(sub);
    setCurrentPage(1);
  };

  if (selectedStorageItem) {
    return (
      <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
        <button
          onClick={() => setSelectedStorageItem(null)}
          className="mb-6 flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold text-sm transition-colors"
        >
          <X className="w-4 h-4 rotate-45" /> 返回储物列表
        </button>

        <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          <div className="p-6 bg-linear-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 flex gap-4 items-center">
                <div className="p-3 bg-white rounded-xl shadow-xs border border-emerald-100">
                  <CategoryIcon category={selectedStorageItem.分类} className="w-10 h-10" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {selectedStorageItem.分类 !== '着装' && (
                      <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded uppercase">{selectedStorageItem.品阶}</span>
                    )}
                    {selectedStorageItem.来源 && (
                      <span className="px-2 py-0.5 bg-slate-500 text-white text-[10px] font-black rounded uppercase">{selectedStorageItem.来源}</span>
                    )}
                    <span className="text-xs text-slate-400 font-bold tracking-widest">
                      {selectedStorageItem.分类 === '着装'
                        ? selectedStorageItem.着装类型
                        : `${selectedStorageItem.分类}${selectedStorageItem.灵石类型 ? ` · ${selectedStorageItem.灵石类型}` : ''}`}
                    </span>
                  </div>
                  <h4 className="text-3xl font-serif font-bold text-slate-900">{selectedStorageItem.name}</h4>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-black uppercase tracking-tighter mb-1">持有数量</div>
                <div className="text-2xl font-black text-emerald-600">{selectedStorageItem.数量}</div>
              </div>
            </div>
            <p className="text-slate-600 leading-relaxed font-medium italic border-t border-emerald-100/50 pt-4 mt-4">
              {selectedStorageItem.描述}
            </p>
          </div>

          <div className="space-y-4">
            {(selectedStorageItem.分类 === '特殊' && selectedStorageItem.内容?.length > 0) && (
              <div className="space-y-3">
                <h5 className="text-xs font-black text-emerald-800 uppercase tracking-widest pl-2 border-l-2 border-emerald-400">记载内容</h5>
                <div className="flex flex-col gap-2">
                  {selectedStorageItem.内容.map((text: string, i: number) => (
                    <div key={i} className="p-4 bg-white border border-emerald-50 rounded-xl shadow-xs group hover:border-emerald-200 transition-all">
                      <div className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shadow-[0_0_6px_rgba(16,185,129,0.35)]" />
                        <span className="text-sm font-medium text-slate-700 leading-relaxed">{text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(selectedStorageItem.分类 !== '特殊' && selectedStorageItem.固定加成?.length > 0) && (
              <div className="space-y-3">
                <h5 className="text-xs font-black text-emerald-800 uppercase tracking-widest pl-2 border-l-2 border-cyan-400">固定加成</h5>
                <div className="flex flex-col gap-2">
                  {selectedStorageItem.固定加成.map((eff: string, i: number) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-white border border-emerald-50 rounded-xl shadow-xs group hover:border-cyan-200 transition-all">
                      <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full group-hover:scale-125 transition-transform" />
                      <span className="text-sm font-bold text-slate-700">{eff}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(selectedStorageItem.分类 === '功法' && Array.isArray(selectedStorageItem.招式) && selectedStorageItem.招式.length > 0) ? (
              <div className="space-y-3">
                <h5 className="text-xs font-black text-emerald-800 uppercase tracking-widest pl-2 border-l-2 border-orange-400">招式神通</h5>
                <div className="flex flex-col gap-3">
                  {selectedStorageItem.招式.map((move: any, i: number) => (
                    <div key={i} className="p-4 bg-white border border-emerald-50 rounded-xl shadow-xs space-y-2 group hover:border-orange-200 transition-all">
                      <div className="flex items-center gap-3">
                        <span className="w-1.5 h-1.5 bg-orange-400 rounded-full group-hover:scale-125 transition-transform shadow-[0_0_8px_rgba(251,146,60,0.4)]" />
                        <span className="text-sm font-black text-slate-800">{move.名称 || '未知招式'}</span>
                      </div>
                      <div className="text-xs text-slate-500 pl-4.5 italic leading-relaxed">
                        {move.描述}
                      </div>
                      <div className="flex flex-wrap gap-2 pl-4.5">
                        {move.效果?.map((eff: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-bold rounded">
                            {eff}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : selectedStorageItem.分类 !== '特殊' ? (
              <EffectList effects={selectedStorageItem.效果} specialEffects={selectedStorageItem.特殊效果} />
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* 移动端：顶部横向分类 */}
      <div className="md:hidden mb-4">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(76px, 1fr))' }}
        >
          {['总览', '灵石', '功法', '武器', '装备', '法宝', '着装', '丹药', '阵符', '特殊'].map(cat => (
            <button
              key={cat}
              onClick={() => handleTabChange(cat)}
              className={`w-full px-3 py-2 rounded-xl text-xs transition-all ${activeTab === cat
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-100 font-bold'
                : 'bg-white/70 text-slate-500 border border-emerald-100 hover:bg-emerald-50'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
        {activeTab === '着装' && (
          <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))' }}>
            {['上衣', '下衣', '内衣', '鞋子', '袜子', '佩戴物'].map(sub => (
              <button
                key={sub}
                onClick={() => handleSubTabChange(sub)}
                className={`w-full px-2 py-1.5 rounded-lg text-[10px] transition-colors ${subTab === sub
                  ? 'text-emerald-700 font-black bg-emerald-50 border border-emerald-200'
                  : 'text-slate-400 bg-white/60 border border-slate-100 hover:text-emerald-500 hover:bg-slate-50'
                  }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="hidden md:flex w-48 border-r border-emerald-100 pr-4 flex-col gap-4 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            {['总览', '灵石', '功法', '武器', '装备', '法宝', '着装', '丹药', '阵符', '特殊'].map(cat => (
              <React.Fragment key={cat}>
                <button
                  onClick={() => handleTabChange(cat)}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === cat ? 'bg-emerald-500 text-white shadow-md shadow-emerald-100' : 'hover:bg-emerald-50 text-slate-600'}`}
                >
                  {cat}
                </button>

                {activeTab === cat && cat === '着装' && (
                  <div className="pl-4 py-2 space-y-1 border-l-2 border-emerald-100 animate-in slide-in-from-top-2 duration-200">
                    {['上衣', '下衣', '内衣', '鞋子', '袜子', '佩戴物'].map(sub => (
                      <button
                        key={sub}
                        onClick={() => handleSubTabChange(sub)}
                        className={`w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors ${subTab === sub ? 'text-emerald-600 font-black bg-emerald-50' : 'text-slate-400 hover:text-emerald-500 hover:bg-slate-50'}`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex-1 md:pl-6 overflow-y-auto custom-scrollbar">
          {paginatedItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
              <PackageIcon className="w-16 h-16 opacity-10" />
              <p className="font-serif italic tracking-widest">此间空空如也...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
              {paginatedItems.map((item, i) => (
                <div
                  key={item.name}
                  onClick={() => setSelectedStorageItem(item)}
                  className="aspect-square bg-white border border-emerald-100 rounded-2xl flex flex-col items-center justify-center p-3 group hover:border-emerald-400 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden animate-in zoom-in-95 shadow-xs"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-emerald-50 text-[10px] font-black text-emerald-600 rounded-md border border-emerald-100/50">
                    {item.数量}
                  </div>
                  <CategoryIcon category={item.分类} className="w-10 h-10 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs text-slate-800 font-bold text-center line-clamp-2 px-1 leading-tight font-serif">{item.name}</span>
                  {item.分类 !== '着装' && (
                    <span className="mt-1 text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">{item.品阶}</span>
                  )}
                </div>
              ))}
              {paginatedItems.length < 9 && Array.from({ length: 9 - paginatedItems.length }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square bg-slate-50/20 border border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center p-4 opacity-50">
                  <PackageIcon className="w-8 h-8 text-slate-200 mb-2" />
                  <span className="text-[10px] text-slate-300 font-medium italic">虚位以待</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 分页控制 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-4 border-t border-emerald-50 mt-2 bg-white/50 backdrop-blur-sm rounded-b-3xl">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="p-2 rounded-full hover:bg-emerald-50 text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-2 h-2 rounded-full transition-all ${currentPage === i + 1 ? 'bg-emerald-500 w-6' : 'bg-emerald-200 hover:bg-emerald-300'}`}
              />
            ))}
          </div>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="p-2 rounded-full hover:bg-emerald-50 text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default StorageModal;
