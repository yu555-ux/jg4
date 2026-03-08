import { ITEM_CATEGORIES } from './constants';

const currentAttrPattern = /^(当前)(根骨|神海|悟性|魅力|气运|杀伐|神伤|横练|身法|生命|灵气|道心)[+-]\d+(?:\.\d+)?%?$/;
const baseAttrPattern = /^(基础)(根骨|神海|悟性|魅力|杀伐|神伤|横练|身法|生命|灵气|道心)[+-]\d+(?:\.\d+)?%?$/;
const baseLimitedPattern = /^(基础)(生命|灵气)[+-]\d+(?:\.\d+)?%?$/;

export const splitLines = (value: string) => value
  .split(/\r?\n/)
  .map(item => item.trim())
  .filter(Boolean);

export const normalizeItem = (item: any) => {
  const normalized = { ...item };
  if (typeof normalized.固定加成 === 'string') normalized.固定加成 = splitLines(normalized.固定加成);
  if (!Array.isArray(normalized.固定加成)) normalized.固定加成 = [];

  if (typeof normalized.效果 === 'string') normalized.效果 = splitLines(normalized.效果);
  if (!Array.isArray(normalized.效果)) normalized.效果 = [];

  // 兼容旧字段：将特殊效果并入效果
  if (typeof normalized.特殊效果 === 'string') normalized.特殊效果 = splitLines(normalized.特殊效果);
  if (Array.isArray(normalized.特殊效果) && normalized.特殊效果.length > 0) {
    if (!Array.isArray(normalized.效果)) normalized.效果 = [];
    normalized.效果 = [...normalized.效果, ...normalized.特殊效果];
  }
  delete normalized.特殊效果;

  if (typeof normalized.内容 === 'string') normalized.内容 = splitLines(normalized.内容);
  if (!Array.isArray(normalized.内容)) normalized.内容 = [];

  if (Array.isArray(normalized.招式)) {
    normalized.招式 = normalized.招式.map((move: any) => ({
      名称: move?.名称 || '未知招式',
      描述: move?.描述 || '暂无招式描述',
      效果: Array.isArray(move?.效果) ? move.效果 : splitLines(String(move?.效果 || ''))
    }));
  } else {
    normalized.招式 = [];
  }

  if (typeof normalized.价格 === 'string') normalized.价格 = Number(normalized.价格);
  if (typeof normalized.价格 !== 'number' || Number.isNaN(normalized.价格)) normalized.价格 = 0;

  if (typeof normalized.数量 === 'string') normalized.数量 = Number(normalized.数量);
  if (typeof normalized.数量 !== 'number' || Number.isNaN(normalized.数量)) normalized.数量 = 1;
  normalized.数量 = Math.max(1, Math.floor(normalized.数量));

  return normalized;
};

export const pruneItemForShop = (item: any) => {
  const pruned = { ...item };
  if (pruned.分类 === '功法') {
    delete pruned.效果;
    delete pruned.内容;
  } else if (pruned.分类 === '特殊') {
    delete pruned.固定加成;
    delete pruned.效果;
  } else if (pruned.分类 === '着装') {
    delete pruned.内容;
  } else if (pruned.分类 === '丹药' || pruned.分类 === '阵符') {
    delete pruned.固定加成;
    delete pruned.内容;
  } else {
    // 武器/装备/法宝
    delete pruned.内容;
  }
  return pruned;
};

const toStringArray = (value: any) => {
  if (Array.isArray(value)) return value.map(v => String(v)).filter(Boolean);
  if (typeof value === 'string') return splitLines(value);
  return [];
};

const normalizeBonusText = (raw: string, mode: 'combat' | 'all') => {
  const text = String(raw).replace(/\s+/g, '');
  const match = text.match(/^([\u4e00-\u9fa5]+)([+-])(\d+(?:\.\d+)?)(%?)$/);
  if (!match) return null;
  let [_, name, op, val, pct] = match;

  if (name.startsWith('基础')) {
    const baseAttr = name.replace(/^基础/, '');
    if (mode === 'combat' && ['生命', '灵气'].includes(baseAttr)) {
      return `基础${baseAttr}${op}${val}${pct}`;
    }
    return `当前${baseAttr}${op}${val}${pct}`;
  }

  if (name.startsWith('当前')) {
    return `当前${name.replace(/^当前/, '')}${op}${val}${pct}`;
  }

  if (name === '生命' || name === '灵气') {
    return `当前${name}${op}${val}${pct}`;
  }

  return `当前${name}${op}${val}${pct}`;
};

const normalizeBonusList = (values: string[], mode: 'combat' | 'all') => {
  const parts = values
    .flatMap(text => String(text).split(/[，,；;、]/))
    .map(v => v.trim())
    .filter(Boolean);

  const normalized = parts.map(part => normalizeBonusText(part, mode) || part);
  return normalized.filter(Boolean);
};

export const sanitizeItemForShop = (item: any) => {
  const base = pruneItemForShop(normalizeItem(item));

  const requiresFixedBonus = ['功法', '武器', '装备', '法宝', '着装'].includes(base.分类);
  const requiresEffect = ['武器', '装备', '法宝', '着装', '丹药', '阵符'].includes(base.分类);
  const requiresContent = base.分类 === '特殊';

  if (requiresFixedBonus) {
    const bonuses = toStringArray(base.固定加成);
    const normalized = normalizeBonusList(bonuses, 'combat');
    base.固定加成 = normalized;
  }

  if (requiresEffect) {
    base.效果 = toStringArray(base.效果);
  }

  if (requiresContent) {
    base.内容 = toStringArray(base.内容);
  }

  return base;
};

const validateBonusList = (values: string[], mode: 'combat' | 'all') => {
  const parts = values
    .flatMap(text => String(text).split(/[，,；;、]/))
    .map(v => v.trim())
    .filter(Boolean);
  const invalid = parts.find(part => !normalizeBonusText(part, mode));
  return invalid;
};

export const validateItem = (item: any) => {
  const errors: string[] = [];
  if (!item.名称) errors.push('缺少名称');
  if (!item.分类) errors.push('缺少分类');
  if (!item.描述) errors.push('缺少描述');
  if (item.价格 === undefined) errors.push('缺少价格');
  if (item.数量 === undefined) errors.push('缺少数量');
  if (!item.品阶) errors.push('缺少品阶');

  if (!ITEM_CATEGORIES.includes(item.分类)) errors.push('分类不合法');
  if (item.分类 === '着装' && !item.着装类型) errors.push('着装缺少着装类型');

  const requiresFixedBonus = ['功法', '武器', '装备', '法宝', '着装'].includes(item.分类);
  const requiresEffect = ['武器', '装备', '法宝', '着装', '丹药', '阵符'].includes(item.分类);
  const requiresContent = item.分类 === '特殊';

  if (requiresFixedBonus && !('固定加成' in item)) errors.push('缺少固定加成');
  if (requiresEffect && !('效果' in item)) errors.push('缺少效果');
  if (requiresContent && !('内容' in item)) errors.push('缺少内容');

  if (Array.isArray(item.固定加成) && requiresFixedBonus) {
    const invalid = validateBonusList(item.固定加成, 'combat');
    if (invalid) errors.push(`固定加成格式错误: ${invalid}`);
  }

  return errors;
};

export const extractJsonArray = (raw: string) => {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    const firstBreak = trimmed.indexOf('\n');
    const lastFence = trimmed.lastIndexOf('```');
    if (firstBreak > 0 && lastFence > firstBreak) {
      return trimmed.slice(firstBreak + 1, lastFence).trim();
    }
  }
  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    return trimmed.slice(firstBracket, lastBracket + 1);
  }
  return trimmed;
};
