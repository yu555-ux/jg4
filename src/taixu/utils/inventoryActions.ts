import _ from 'lodash';
import { klona } from 'klona';

/**
 * 装备/功法/着装操作工具
 */

export type TargetSlot =
  | '主修' | '辅修'
  | '武器' | '装备' | '法宝'
  | '上衣' | '下衣' | '内衣' | '鞋子' | '袜子' | '佩戴物';

/**
 * 装备物品
 * @param data 全量 MVU 数据
 * @param itemName 物品名称
 * @param slot 目标槽位
 */
export function equipItem(data: any, itemName: string, slot: TargetSlot): any {
  const newData = klona(data);
  const storage = newData.储物空间 || {};
  const item = storage[itemName];

  if (!item) return data;

  const stripCount = (src: any) => {
    if (!src) return src;
    const { 数量, ...rest } = src;
    return rest;
  };
  const normalizeEquipped = (src: any) => {
    const base = stripCount(src);
    if (base?.分类 === '功法') {
      return { 熟练度: 0, ...base, 熟练度: base.熟练度 ?? 0 };
    }
    return base;
  };

  // 1. 根据分类和槽位逻辑处理
  if (slot === '主修') {
    const oldItem = newData.当前功法.主修;
    if (oldItem) storage[oldItem.名称] = { ...oldItem, 数量: 1 };
    newData.当前功法.主修 = normalizeEquipped(item);
  }
  else if (slot === '辅修') {
    if (!newData.当前功法.辅修) newData.当前功法.辅修 = [];
    if (newData.当前功法.辅修.length < 3) {
      newData.当前功法.辅修.push(normalizeEquipped(item));
    } else {
      // 槽位已满，不操作或替换第一个？暂定不操作
      return data;
    }
  }
  else if (slot === '武器') {
    const oldItem = newData.当前装备.武器;
    if (oldItem) storage[oldItem.名称] = { ...oldItem, 数量: 1 };
    newData.当前装备.武器 = normalizeEquipped(item);
  }
  else if (slot === '装备') {
    if (!newData.当前装备.装备) newData.当前装备.装备 = [];
    if (newData.当前装备.装备.length < 4) {
      newData.当前装备.装备.push(normalizeEquipped(item));
    } else {
      return data;
    }
  }
  else if (slot === '法宝') {
    if (!newData.当前装备.法宝) newData.当前装备.法宝 = [];
    if (newData.当前装备.法宝.length < 2) {
      newData.当前装备.法宝.push(normalizeEquipped(item));
    } else {
      return data;
    }
  }
  else if (['上衣', '下衣', '内衣', '鞋子', '袜子', '佩戴物'].includes(slot)) {
    if (!newData.当前着装) newData.当前着装 = {};
    if (slot === '佩戴物') {
      if (!Array.isArray(newData.当前着装.佩戴物)) newData.当前着装.佩戴物 = [];
      if (newData.当前着装.佩戴物.length >= 3) return data;
      newData.当前着装.佩戴物.push(normalizeEquipped(item));
    } else {
      const oldItem = newData.当前着装[slot];
      if (oldItem) storage[oldItem.名称] = { ...oldItem, 数量: 1 };
      newData.当前着装[slot] = normalizeEquipped(item);
    }
  }

  // 2. 扣除库存
  if (item.数量 > 1) {
    item.数量 -= 1;
  } else {
    delete storage[itemName];
  }

  newData.储物空间 = storage;
  return newData;
}

/**
 * 卸下物品
 */
export function unequipItem(data: any, slot: TargetSlot, index?: number): any {
  const newData = klona(data);
  const storage = newData.储物空间 || {};
  let removedItem: any = null;

  if (slot === '主修') {
    removedItem = newData.当前功法.主修;
    newData.当前功法.主修 = null;
  }
  else if (slot === '辅修' && index !== undefined) {
    removedItem = newData.当前功法.辅修.splice(index, 1)[0];
  }
  else if (slot === '武器') {
    removedItem = newData.当前装备.武器;
    newData.当前装备.武器 = null;
  }
  else if (slot === '装备' && index !== undefined) {
    removedItem = newData.当前装备.装备.splice(index, 1)[0];
  }
  else if (slot === '法宝' && index !== undefined) {
    removedItem = newData.当前装备.法宝.splice(index, 1)[0];
  }
  else if (['上衣', '下衣', '内衣', '鞋子', '袜子', '佩戴物'].includes(slot)) {
    if (slot === '佩戴物' && index !== undefined) {
      removedItem = newData.当前着装.佩戴物.splice(index, 1)[0];
    } else {
      removedItem = newData.当前着装[slot];
      delete newData.当前着装[slot];
    }
  }

  if (removedItem) {
    const name = removedItem.名称;
    if (storage[name]) {
      storage[name].数量 = (storage[name].数量 || 0) + 1;
    } else {
      storage[name] = { ...removedItem, 数量: 1 };
    }
  }

  newData.储物空间 = storage;
  return newData;
}
