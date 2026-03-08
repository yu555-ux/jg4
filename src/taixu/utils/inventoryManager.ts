import _ from 'lodash';

/**
 * 自动清理储物空间与装备槽位的冲突
 * 逻辑：如果物品出现在槽位中，则从储物空间中移除。
 * 反之，如果物品从槽位中消失（被卸下），且储物空间中没有同名物品，则将其放回储物空间。
 */
export function reconcileInventory(data: any) {
  // 深度克隆数据以避免直接修改原始对象
  const newData = _.cloneDeep(data);
  const storage = newData.储物空间 || {};

  // 1. 收集所有当前装备/功法/着装中的物品
  const equippedItems = new Map<string, any>();

  const addItem = (item: any) => {
    if (item && typeof item === 'object' && item.名称) {
      equippedItems.set(item.名称, item);
    }
  };

  // 功法
  addItem(newData.当前功法?.主修);
  (newData.当前功法?.辅修 || []).forEach(addItem);

  // 装备/武器/法宝
  addItem(newData.当前装备?.武器);
  (newData.当前装备?.装备 || []).forEach(addItem);
  (newData.当前装备?.法宝 || []).forEach(addItem);

  // 着装
  if (newData.当前着装) {
    Object.values(newData.当前着装).forEach(value => {
      if (Array.isArray(value)) {
        value.forEach(addItem);
      } else {
        addItem(value);
      }
    });
  }

  // 2. 物理隔离：如果在身上，就从戒指里删掉
  equippedItems.forEach((_, name) => {
    if (storage[name]) {
      delete storage[name];
    }
  });

  newData.储物空间 = storage;
  return newData;
}
