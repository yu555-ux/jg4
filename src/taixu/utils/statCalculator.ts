import _ from 'lodash';

/**
 * 加成项结构
 */
interface Bonus {
  key: string;
  value: number;
  isPercent: boolean;
}

/**
 * 解析固定加成字符串
 * 格式: "属性名+数值" 或 "属性名+数值%" 或 "属性名-数值"
 */
function parseBonus(bonusStr: string): Bonus | null {
  // 增强正则表达式，支持空格
  const match = bonusStr.trim().match(/^(.+?)\s*([+-]\d+(?:\.\d+)?)\s*(%?)$/);
  if (!match) return null;

  const [, key, valStr, percentSign] = match;
  const value = parseFloat(valStr);
  const isPercent = percentSign === '%';

  return {
    key: key.trim(),
    value: isPercent ? value / 100 : value,
    isPercent
  };
}

/**
 * 扫描所有加成来源
 */
function scanAllBonuses(data: any): Bonus[] {
  const bonuses: Bonus[] = [];

  const extract = (item: any) => {
    if (item && Array.isArray(item.固定加成)) {
      item.固定加成.forEach((s: string) => {
        const b = parseBonus(s);
        if (b) bonuses.push(b);
      });
    }
  };

  // 1. 状态
  if (data.当前状态) {
    _.values(data.当前状态).forEach(extract);
  }

  // 2. 灵根
  if (data.天赋灵根) {
    _.values(data.天赋灵根).forEach(extract);
  }

  // 3. 功法
  if (data.当前功法) {
    extract(data.当前功法.主修);
    if (Array.isArray(data.当前功法.辅修)) {
      data.当前功法.辅修.forEach(extract);
    }
  }

  // 4. 装备
  if (data.当前装备) {
    extract(data.当前装备.武器);
    if (Array.isArray(data.当前装备.装备)) {
      data.当前装备.装备.forEach(extract);
    }
    if (Array.isArray(data.当前装备.法宝)) {
      data.当前装备.法宝.forEach(extract);
    }
  }

  // 5. 着装
  if (data.当前着装) {
    _.values(data.当前着装).forEach(value => {
      if (Array.isArray(value)) {
        value.forEach(extract);
      } else {
        extract(value);
      }
    });
  }

  // 6. 成就
  if (data.成就列表) {
    _.values(data.成就列表).forEach(extract);
  }

  return bonuses;
}

/**
 * 计算最终属性值
 */
export function calculateCorrectedStats(data: any) {
  if (!data || !data.角色基础) return data;

  const bonuses = scanAllBonuses(data);
  const char = data.角色基础;
  const corrected = _.cloneDeep(data);
  const newChar = corrected.角色基础;

  // --- A. 生命/灵气/道心 最大值 (基于基础值 + 加成) ---
  const poolStats = [
    { base: '基础生命', max: '最大生命' },
    { base: '基础灵气', max: '最大灵气' },
    { base: '基础道心', max: '最大道心' },
  ];
  poolStats.forEach(({ base, max }) => {
    const baseVal = Number(char[base]) || 0;
    const statBonuses = bonuses.filter(b => b.key === base || b.key === `${base}值`);

    const addSum = _.sumBy(statBonuses.filter(b => !b.isPercent), 'value');
    const mulSum = _.sumBy(statBonuses.filter(b => b.isPercent), 'value');

    // 公式: (基础值 + Σ数值) * (1 + Σ百分比)
    const finalVal = Math.max(0, Math.round((baseVal + addSum) * (1 + mulSum)));
    newChar[max] = finalVal;
  });

  // --- B. 属性类 (基准加成/加法型) ---
  const attributeMapping = [
    { current: '当前根骨', base: '基础根骨' },
    { current: '当前神海', base: '基础神海' },
    { current: '当前身法', base: '基础身法' },
    { current: '当前横练', base: '基础横练' },
    { current: '当前杀伐', base: '基础杀伐' },
    { current: '当前神伤', base: '基础神伤' },
    { current: '当前悟性', base: '基础悟性' },
    { current: '当前魅力', base: '基础魅力' },
    { current: '当前气运', base: '基础气运' },
  ];
  const allAttrTargets = new Set([
    '当前根骨',
    '当前神海',
    '当前身法',
    '当前横练',
    '当前杀伐',
    '当前神伤',
  ]);

  attributeMapping.forEach(({ current, base }) => {
    const baseVal = char[base] || 0;
    // 同时寻找针对 "当前" 和 "基础" 的加成，并兼容带 "值" 后缀的 key
    const statBonuses = bonuses.filter(b =>
      b.key === current ||
      b.key === base ||
      b.key === `${current}值` ||
      b.key === `${base}值` ||
      ((b.key === '全属性' || b.key === '全部属性') && allAttrTargets.has(current))
    );

    const addSum = _.sumBy(statBonuses.filter(b => !b.isPercent), 'value');
    const mulSum = _.sumBy(statBonuses.filter(b => b.isPercent), 'value');

    // 公式改为与数值类一致的复利公式: (基准值 + Σ数值) * (1 + Σ百分比)
    // 这样更符合大部分游戏逻辑，也解决了一些计算不准确的问题
    const finalVal = Math.max(0, Math.round((baseVal + addSum) * (1 + mulSum)));

    if (newChar[current] !== finalVal) {
      console.info(`[StatCalc] 更新属性 ${current}: ${newChar[current]} -> ${finalVal} (基础:${baseVal}, 加成:+${addSum}, 倍率:x${1+mulSum})`);
      newChar[current] = finalVal;
    }
  });

  // --- C. 当前值上限校准 ---
  // 规则：
  // - 当前生命/灵气：若最大值提升，当前值自动回满；否则只做上限裁剪
  // - 当前道心：若最大值提升，当前值自动回满
  const capStats = [
    { current: '当前生命', max: '最大生命', autoRefillOnIncrease: true },
    { current: '当前灵气', max: '最大灵气', autoRefillOnIncrease: true },
    { current: '当前道心', max: '最大道心', autoRefillOnIncrease: true },
  ];

  capStats.forEach(({ current, max, autoRefillOnIncrease }) => {
    const oldCurrentVal = Number(char[current]) || 0;
    const oldMaxVal = Number(char[max]) || 0;
    const newMaxVal = Number(newChar[max]) || 0;

    if (autoRefillOnIncrease && newMaxVal > oldMaxVal) {
      newChar[current] = newMaxVal;
      return;
    }

    newChar[current] = Math.min(oldCurrentVal, newMaxVal);
  });

  return corrected;
}
