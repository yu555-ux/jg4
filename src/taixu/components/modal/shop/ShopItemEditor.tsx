import { Pencil, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { CLOTHING_TYPES } from './constants';

interface ShopItemEditorProps {
  item: any;
  onCancel: () => void;
  onSave: (item: any) => void;
}

const buildEditForm = (item: any) => ({
  ...item,
  数量: Number.isFinite(Number(item.数量)) ? Number(item.数量) : 1,
  固定加成文本: (item.固定加成 || []).join('\n'),
  效果文本: (item.效果 || []).join('\n'),
  内容文本: (item.内容 || []).join('\n'),
});

const ShopItemEditor: React.FC<ShopItemEditorProps> = ({ item, onCancel, onSave }) => {
  const [editFormData, setEditFormData] = useState<any>(() => buildEditForm(item));

  useEffect(() => {
    setEditFormData(buildEditForm(item));
  }, [item]);

  const saveEditingAll = () => {
    const updatedItem = {
      ...editFormData,
      数量: Math.max(1, Math.floor(Number(editFormData.数量) || 1)),
      固定加成: editFormData.固定加成文本.split('\n').map((text: string) => text.trim()).filter(Boolean),
      效果: editFormData.效果文本.split('\n').map((text: string) => text.trim()).filter(Boolean),
      内容: editFormData.内容文本.split('\n').map((text: string) => text.trim()).filter(Boolean),
    };

    delete updatedItem.固定加成文本;
    delete updatedItem.效果文本;
    delete updatedItem.内容文本;

    // 按分类清理不需要的字段以适配最新 schema
    if (updatedItem.分类 === '功法') {
      delete updatedItem.效果;
      delete updatedItem.内容;
    } else if (updatedItem.分类 === '特殊') {
      delete updatedItem.固定加成;
      delete updatedItem.效果;
    } else if (updatedItem.分类 === '着装') {
      delete updatedItem.内容;
    } else if (updatedItem.分类 === '丹药' || updatedItem.分类 === '阵符') {
      delete updatedItem.固定加成;
      delete updatedItem.内容;
    } else {
      // 武器/装备/法宝
      delete updatedItem.内容;
    }

    onSave(updatedItem);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
      <div className="h-16 border-b border-slate-100 flex items-center justify-between px-8 bg-slate-50/30">
        <div className="flex items-center gap-3">
          <Pencil className="w-5 h-5 text-emerald-500" />
          <h3 className="text-xl font-bold text-slate-800">编辑商品信息</h3>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-rose-50 rounded-full transition-colors text-slate-400 hover:text-rose-500">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">名称</label>
            <input
              type="text"
              value={editFormData.名称}
              onChange={event => setEditFormData({ ...editFormData, 名称: event.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden transition-all font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">价格 (仙缘)</label>
            <input
              type="number"
              value={editFormData.价格}
              onChange={event => setEditFormData({ ...editFormData, 价格: Number(event.target.value) })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden transition-all font-bold text-amber-600"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">数量</label>
            <input
              type="number"
              min={1}
              value={editFormData.数量}
              onChange={event => setEditFormData({ ...editFormData, 数量: Number(event.target.value) })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden transition-all font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">品阶</label>
            <input
              type="text"
              value={editFormData.品阶}
              onChange={event => setEditFormData({ ...editFormData, 品阶: event.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden transition-all font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">分类</label>
            <select
              value={editFormData.分类}
              onChange={event => setEditFormData({ ...editFormData, 分类: event.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden transition-all font-bold"
            >
              {['功法', '武器', '装备', '法宝', '着装', '丹药', '阵符', '特殊'].map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        {editFormData.分类 === '着装' && (
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">着装类型</label>
            <select
              value={editFormData.着装类型 || '上衣'}
              onChange={event => setEditFormData({ ...editFormData, 着装类型: event.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden transition-all font-bold"
            >
              {CLOTHING_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">描述</label>
          <textarea
            value={editFormData.描述}
            onChange={event => setEditFormData({ ...editFormData, 描述: event.target.value })}
            rows={3}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden transition-all text-sm leading-relaxed"
          />
        </div>

        {editFormData.分类 === '特殊' ? (
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">记载内容 (每行一个)</label>
            <textarea
              value={editFormData.内容文本}
              onChange={event => setEditFormData({ ...editFormData, 内容文本: event.target.value })}
              rows={6}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden transition-all text-sm"
              placeholder="输入此特殊物品记载的内容，例如：
内容一：关于克苏鲁的定义...
内容二：阅读后道心降低2"
            />
          </div>
        ) : (
          <>
            {['功法', '武器', '装备', '法宝', '着装'].includes(editFormData.分类) && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">固定加成 (每行一个)</label>
                <textarea
                  value={editFormData.固定加成文本}
                  onChange={event => setEditFormData({ ...editFormData, 固定加成文本: event.target.value })}
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden transition-all text-sm font-mono"
                  placeholder="格式：属性 +/-数值 (例如：根骨 +10)"
                />
              </div>
            )}

            {['武器', '装备', '法宝', '着装', '丹药', '阵符'].includes(editFormData.分类) && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">效果 (每行一个)</label>
                <textarea
                  value={editFormData.效果文本}
                  onChange={event => setEditFormData({ ...editFormData, 效果文本: event.target.value })}
                  rows={4}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-hidden transition-all text-sm"
                  placeholder="直接输入自然语言描述即可，系统将自动识别为效果列表"
                />
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
        >
          取消
        </button>
        <button
          onClick={saveEditingAll}
          className="px-8 py-2.5 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 text-white font-black text-sm shadow-lg shadow-emerald-100 hover:shadow-emerald-200 hover:-translate-y-0.5 transition-all"
        >
          保存修改
        </button>
      </div>
    </div>
  );
};

export default ShopItemEditor;
