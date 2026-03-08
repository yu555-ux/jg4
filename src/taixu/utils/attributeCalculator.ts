import { klona } from 'klona';

/**
 * 属性加成计算器
 * 处理装备、功法、着装对角色基础属性的动态加成
 */

const TARGET_ATTRIBUTES = [
  '根骨', '神海', '身法', '横练', '杀伐', '神伤',
  '生命', '灵气', '道心', '悟性', '气运', '魅力'
];

// 属性映射表，处理同义词或简称
const ATTR_NAME_MAP: Record<string, string> = {
  '当前生命值': '生命',
  '当前生命': '生命',
  '生命值': '生命',
  '最大生命': '生命',
  '当前灵气值': '灵气',
  '当前灵气': '灵气',
  '灵气值': '灵气',
  '最大灵气': '灵气',
  '当前道心': '道心',
  '道心': '道心',
  '当前根骨': '根骨',
  '当前神海': '神海',
  '当前身法': '身法',
  '当前横练': '横练',
  '当前杀伐': '杀伐',
  '当前神伤': '神伤',
  '当前悟性': '悟性',
  '当前魅力': '魅力',
  '当前气运': '气运',
  '身法': '身法',
  '横练': '横练',
  '杀伐': '杀伐',
  '神伤': '神伤',
  '根骨': '根骨',
  '神海': '神海',
  '道心': '道心',
  '悟性': '悟性',
  '魅力': '魅力',
  '气运': '气运'
};

/**
 * 计算并更新角色属性
 */
export function calculateAttributes(data: any): any {
  if (!data || !data.角色基础) return data;

  const newData = klona(data);
  const char = newData.角色基础;

  // 1. 收集所有参与计算的物品
  const items: any[] = [];

  // 当前着装 (Record<string, Item | Item[]>)
  if (newData.当前着装) {
    Object.values(newData.当前着装).forEach(value => {
      if (Array.isArray(value)) {
        value.forEach(item => items.push(item));
      } else {
        items.push(value);
      }
    });
  }

  // 当前功法
  if (newData.当前功法) {
    if (newData.当前功法.主修) items.push(newData.当前功法.主修);
    if (Array.isArray(newData.当前功法.辅修)) {
      newData.当前功法.辅修.forEach((item: any) => items.push(item));
    }
  }

  // 当前装备
  if (newData.当前装备) {
    if (newData.当前装备.武器) items.push(newData.当前装备.武器);
    if (Array.isArray(newData.当前装备.装备)) {
      newData.当前装备.装备.forEach((item: any) => items.push(item));
    }
    if (Array.isArray(newData.当前装备.法宝)) {
      newData.当前装备.法宝.forEach((item: any) => items.push(item));
    }
  }

  // 当前状态 (Record<string, {固定加成: string[]}>)
  if (newData.当前状态) {
    Object.values(newData.当前状态).forEach(status => items.push(status));
  }

  // 2. 初始化每种属性的加成汇总
  const bonuses: Record<string, { flat: number; percent: number }> = {};
  TARGET_ATTRIBUTES.forEach(attr => {
    bonuses[attr] = { flat: 0, percent: 0 };
  });

  // 3. 解析物品的固定加成
  items.forEach(item => {
    if (!item || !Array.isArray(item.固定加成)) return;

    item.固定加成.forEach((bonusStr: string) => {
      // 正则匹配： 属性名 (可选空格) (+/-) 数值 (%)
      const match = bonusStr.match(/^([\u4e00-\u9fa5]+)\s*([+-])\s*(\d+(?:\.\d+)?)(%?)$/);
      if (match) {
        const [_, rawName, op, valStr, isPercent] = match;
        const attrName = ATTR_NAME_MAP[rawName] || rawName;

        if (TARGET_ATTRIBUTES.includes(attrName)) {
          const value = parseFloat(valStr) * (op === '-' ? -1 : 1);
          if (isPercent) {
            bonuses[attrName].percent += value / 100;
          } else {
            bonuses[attrName].flat += value;
          }
        }
      }
    });
  });

  // 4. 应用公式计算最终属性
  // 核心逻辑调整：
  // - 生命、灵气、道心：计算结果写入“基础值”（作为最大值），当前值保持不变（作为当前消耗值）。
  // - 其他属性：计算结果写入“当前值”，基础值保持不变。
  TARGET_ATTRIBUTES.forEach(attr => {
    const isPoolAttr = ['生命', '灵气', '道心'].includes(attr);
    const baseKey = `基础${attr}`;
    const currentKey = `当前${attr}`;
    const realBaseKey = `$真实基础${attr}`;

    // 获取“真正”的基础值。如果是池属性（生命等），尝试从隐藏字段获取以防止递归增长
    let baseValue = 0;
    if (isPoolAttr) {
      // 如果没有真实基础值记录，说明这是第一次计算，将当前的基础值作为种子
      if (char[realBaseKey] === undefined) {
        char[realBaseKey] = parseFloat(char[baseKey]) || 0;
      }
      baseValue = parseFloat(char[realBaseKey]);
    } else {
      baseValue = parseFloat(char[baseKey]) || 0;
    }

    const bonus = bonuses[attr];
    const finalValue = (baseValue + bonus.flat) * (1 + bonus.percent);
    const roundedValue = Math.max(0, Math.round(finalValue));

    if (isPoolAttr) {
      // 生命周期类属性：更新基础值（即最大值上限）
      char[baseKey] = roundedValue;
      // 注意：这里不触碰 char[currentKey]，保留战斗中的当前血量/灵气
    } else {
      // 普通战斗属性：更新当前值（实战数值）
      char[currentKey] = roundedValue;
    }
  });

  return newData;
}
