import { ChevronLeft, ChevronRight, RefreshCcw, ShoppingBag, Sparkles } from 'lucide-react';
import React from 'react';
import { CLOTHING_TYPES, ITEMS_PER_PAGE } from './constants';

interface ShopListViewProps {
  data: any;
  shopCategory: string;
  subCategory: string;
  currentPage: number;
  onSelectItem: (item: any) => void;
  onCategoryChange: (category: string) => void;
  onSubCategoryChange: (category: string) => void;
  onPageChange: (page: number) => void;
  onOpenRefresh: () => void;
}

const ShopListView: React.FC<ShopListViewProps> = ({
  data,
  shopCategory,
  subCategory,
  currentPage,
  onSelectItem,
  onCategoryChange,
  onSubCategoryChange,
  onPageChange,
  onOpenRefresh,
}) => {
  const filteredShopItems = (data?.商品列表 || []).filter((item: any) => {
    if (item.分类 !== shopCategory) return false;
    if (shopCategory === '着装') {
      if (subCategory === '全部') return true;
      return item.着装类型 === subCategory;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredShopItems.length / ITEMS_PER_PAGE));
  const paginatedShopItems = filteredShopItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="flex h-full flex-col">
      {/* 移动端：顶部横向分类 */}
      <div className="md:hidden mb-4">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))' }}
        >
          {['功法', '武器', '装备', '法宝', '着装', '丹药', '阵符', '特殊'].map(category => (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`w-full px-3 py-2 rounded-xl text-xs transition-all ${shopCategory === category
                ? 'bg-linear-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-100 font-bold'
                : 'bg-white/70 text-slate-500 border border-emerald-100 hover:bg-emerald-50'
                }`}
            >
              {category}
            </button>
          ))}
        </div>
        {shopCategory === '着装' && (
          <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))' }}>
            {['全部', ...CLOTHING_TYPES].map(sub => (
              <button
                key={sub}
                onClick={() => onSubCategoryChange(sub)}
                className={`w-full px-2 py-1.5 rounded-lg text-[10px] transition-colors ${subCategory === sub
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

      <div className="flex flex-1 min-h-0 gap-0 relative">
        <div className="hidden md:flex w-44 flex-col gap-1 pr-8 overflow-y-auto custom-scrollbar">
          {['功法', '武器', '装备', '法宝', '着装', '丹药', '阵符', '特殊'].map(category => (
            <React.Fragment key={category}>
              <button
                onClick={() => onCategoryChange(category)}
                className={`group flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all duration-300 shrink-0 ${shopCategory === category
                  ? 'bg-linear-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-100 translate-x-2'
                  : 'hover:bg-emerald-50/80 text-slate-500 hover:text-emerald-700'
                  }`}
              >
                <span className={`text-sm font-bold ${shopCategory === category ? 'tracking-widest' : ''}`}>{category}</span>
                {shopCategory === category && <Sparkles className="w-3.5 h-3.5 animate-pulse" />}
              </button>

              {shopCategory === category && category === '着装' && (
                <div className="pl-4 py-2 space-y-1 border-l-2 border-emerald-100 animate-in slide-in-from-top-2 duration-200">
                  {['全部', ...CLOTHING_TYPES].map(sub => (
                    <button
                      key={sub}
                      onClick={() => onSubCategoryChange(sub)}
                      className={`w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors ${subCategory === sub ? 'text-emerald-600 font-black bg-emerald-50' : 'text-slate-400 hover:text-emerald-500 hover:bg-slate-50'}`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="hidden md:block w-px self-stretch bg-linear-to-b from-transparent via-emerald-200 to-transparent relative mx-2">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-300 rounded-full blur-[1px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
          <div className="absolute top-3/4 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-300 rounded-full blur-[1px]" />
        </div>

        <div className="flex-1 overflow-y-auto md:pl-8 pr-2 custom-scrollbar relative">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{shopCategory} · {subCategory}</span>
            </div>
            <button
              onClick={onOpenRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-emerald-100 text-emerald-600 font-bold text-xs rounded-xl hover:bg-emerald-50 transition-all shadow-xs active:scale-95"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              刷新商品
            </button>
          </div>

          {paginatedShopItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
              <ShoppingBag className="w-16 h-16 opacity-20" />
              <p className="font-serif italic tracking-widest">缘分未至，此柜空空如也</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 pb-4">
              {paginatedShopItems.map((item: any, index: number) => (
                <button
                  key={index}
                  onClick={() => onSelectItem(item)}
                  className="flex items-center justify-between p-4 bg-white border border-emerald-100 rounded-2xl shadow-xs hover:border-emerald-400 hover:shadow-md hover:-translate-y-0.5 transition-all group text-left h-[110px] relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {Number(item.数量) > 1 && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded-full shadow-sm">
                      x{item.数量}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 pr-2 flex flex-col justify-center h-full">
                    <div className="text-[10px] text-emerald-600 font-black uppercase tracking-widest opacity-70 truncate mb-1">{item.品阶}</div>
                    <div className="text-base font-serif font-bold text-slate-900 group-hover:text-emerald-800 transition-colors leading-tight line-clamp-2">{item.名称}</div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 bg-emerald-50/40 p-2 rounded-xl group-hover:bg-emerald-50 transition-colors min-w-[70px]">
                    <div className="text-[8px] text-slate-400 font-black tracking-tighter uppercase mb-0.5">所需仙缘</div>
                    <div className="text-lg font-black text-amber-500 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      {item.价格}
                    </div>
                  </div>
                </button>
              ))}
              {paginatedShopItems.length < ITEMS_PER_PAGE && Array.from({ length: ITEMS_PER_PAGE - paginatedShopItems.length }).map((_, index) => (
                <div key={`empty-${index}`} className="h-[110px] bg-slate-50/20 border border-dashed border-slate-100 rounded-2xl flex items-center justify-center opacity-40">
                  <Sparkles className="w-6 h-6 text-slate-200" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-4 border-t border-emerald-50 mt-2 bg-white/50 backdrop-blur-sm rounded-b-3xl">
          <button
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="p-2 rounded-full hover:bg-emerald-50 text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => onPageChange(index + 1)}
                className={`w-2 h-2 rounded-full transition-all ${currentPage === index + 1 ? 'bg-emerald-500 w-6' : 'bg-emerald-200 hover:bg-emerald-300'}`}
              />
            ))}
          </div>
          <button
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="p-2 rounded-full hover:bg-emerald-50 text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ShopListView;
