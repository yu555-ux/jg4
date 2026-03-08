import { jsonrepair } from 'jsonrepair';
import { useEffect, useMemo, useRef, useState } from 'react';
import toastr from 'toastr';
import { getWorldbookEntryContents } from '../../../utils/worldbook';
import { ITEM_CATEGORIES, RANKS, SHOP_CATEGORIES } from './constants';
import { extractJsonArray, normalizeItem, pruneItemForShop, sanitizeItemForShop, splitLines, validateItem } from './utils';

interface ShopRefreshContext {
  targetTypes: string[];
  refreshCount: number;
  mustHaveItem: any | null;
  mustHaveSimple?: boolean;
  refreshAll: boolean;
  existingItems: any[];
}

interface UseShopRefreshOptions {
  data: any;
  onReplaceShopItems?: (items: any[]) => void;
  setIsEditingAll: (val: boolean) => void;
  shopApiConfig?: { apiurl: string; key: string; model: string; retries: number };
  multiApiEnabled?: boolean;
}

export const useShopRefresh = ({ data, onReplaceShopItems, setIsEditingAll, shopApiConfig, multiApiEnabled }: UseShopRefreshOptions) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [refreshTypes, setRefreshTypes] = useState<string[]>(['全部']);
  const [refreshCount, setRefreshCount] = useState(8);
  const [refreshKeyword, setRefreshKeyword] = useState('');
  const [eroticCount, setEroticCount] = useState(0);
  const [eroticKeyword, setEroticKeyword] = useState('');
  const [rankSelections, setRankSelections] = useState<Array<{
    rank: (typeof RANKS)[number];
    grade: '上品' | '中品' | '下品';
    count: number;
  }>>([]);
  const [mustHaveEnabled, setMustHaveEnabled] = useState(false);
  const [mustHaveSimple, setMustHaveSimple] = useState(false);
  const [mustHaveForm, setMustHaveForm] = useState({
    名称: '',
    分类: '功法',
    着装类型: '上衣',
    描述: '',
    价格: 0,
    数量: 1,
    品阶: '凡阶',
    品阶阶位: '凡',
    品阶品级: '上品',
    固定加成文本: '',
    效果文本: '',
    内容文本: '',
    招式文本: ''
  });
  const [fixError, setFixError] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewItems, setReviewItems] = useState<any[]>([]);
  const [reviewErrors, setReviewErrors] = useState<Record<number, string[]>>({});
  const [reviewExistingItems, setReviewExistingItems] = useState<any[]>([]);
  const [applyMode, setApplyMode] = useState<'append' | 'replace'>('append');
  const [replaceSelections, setReplaceSelections] = useState<number[]>([]);
  const lastRefreshRef = useRef<ShopRefreshContext | null>(null);
  const refreshEditingRef = useRef(false);

  useEffect(() => {
    if (isRefreshing) {
      if (!refreshEditingRef.current) {
        setIsEditingAll(true);
        refreshEditingRef.current = true;
      }
      return;
    }
    if (refreshEditingRef.current) {
      setIsEditingAll(false);
      refreshEditingRef.current = false;
    }
  }, [isRefreshing, setIsEditingAll]);

  const normalizeApiUrl = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (/\/v1\/?$/.test(trimmed)) return trimmed.replace(/\/$/, '');
    return `${trimmed.replace(/\/$/, '')}/v1`;
  };

  const buildShopCustomApi = () => {
    if (!multiApiEnabled) return null;
    if (!shopApiConfig?.apiurl?.trim()) return null;
    const normalizedUrl = normalizeApiUrl(shopApiConfig.apiurl || '');
    if (!normalizedUrl) return null;
    return {
      apiurl: normalizedUrl,
      key: shopApiConfig.key?.trim(),
      model: shopApiConfig.model || 'gpt-4o-mini',
      source: 'openai'
    };
  };

  const toggleRefreshType = (type: string) => {
    setRefreshTypes(prev => {
      if (type === '全部') {
        return prev.includes('全部') ? prev.filter(item => item !== '全部') : ['全部'];
      }
      if (prev.includes('全部')) {
        return [type];
      }
      if (prev.includes(type)) {
        return prev.filter(item => item !== type);
      }
      return [...prev, type];
    });
  };

  const buildMustHaveItem = () => {
    if (!mustHaveEnabled) return null;
    if (!mustHaveForm.名称.trim() || !mustHaveForm.描述.trim()) {
      toastr.warning('必定出现商品信息不完整');
      return null;
    }
    if (mustHaveSimple) {
      return {
        名称: mustHaveForm.名称.trim(),
        分类: mustHaveForm.分类,
        描述: mustHaveForm.描述.trim(),
      };
    }
    const parseMoves = (raw: string) => {
      const lines = splitLines(raw);
      return lines
        .map(line => {
          const parts = line.split('|').map(part => part.trim());
          const [name, desc, effectsRaw] = parts;
          const effects = effectsRaw
            ? effectsRaw.split(/[;；,，]/).map(t => t.trim()).filter(Boolean)
            : [];
          const hasContent = !!(name || desc || effects.length > 0);
          if (!hasContent) return null;
          return {
            名称: name || '未知招式',
            描述: desc || '暂无招式描述',
            效果: effects,
          };
        })
        .filter(Boolean);
    };
    const composedRank = `${mustHaveForm.品阶阶位 || '凡'}阶${mustHaveForm.品阶品级 || '上品'}`;
    const item = {
      名称: mustHaveForm.名称.trim(),
      分类: mustHaveForm.分类,
      描述: mustHaveForm.描述.trim(),
      价格: Number(mustHaveForm.价格) || 0,
      数量: Math.max(1, Math.floor(Number(mustHaveForm.数量) || 1)),
      品阶: composedRank,
      固定加成: splitLines(mustHaveForm.固定加成文本),
      效果: splitLines(mustHaveForm.效果文本),
      内容: splitLines(mustHaveForm.内容文本),
      招式: parseMoves(mustHaveForm.招式文本),
    } as any;
    if (item.分类 === '着装') {
      item.着装类型 = mustHaveForm.着装类型;
    }
    if (item.分类 === '功法') {
      delete item.效果;
      delete item.内容;
    } else if (item.分类 === '特殊') {
      delete item.固定加成;
      delete item.效果;
    } else if (item.分类 === '着装') {
      delete item.内容;
    } else if (item.分类 === '丹药' || item.分类 === '阵符') {
      delete item.固定加成;
      delete item.内容;
    } else {
      // 武器/装备/法宝
      delete item.内容;
    }
    return item;
  };

  const applyItemsWithContext = (items: any[], context: ShopRefreshContext) => {
    let merged: any[] = [];
    if (applyMode === 'replace') {
      if (replaceSelections.length === 0) {
        toastr.warning('请先选择要替换的商品');
        setIsRefreshing(false);
        return;
      }
      const dropSet = new Set(replaceSelections);
      const preserved = (reviewExistingItems || []).filter((_item, idx) => !dropSet.has(idx));
      merged = [...preserved, ...items];
    } else {
      merged = [...(reviewExistingItems || context.existingItems || []), ...items];
    }
    try {
      onReplaceShopItems?.(merged);
      toastr.success('商城写入成功');
    } catch (error: any) {
      console.error('[ShopModal] 写入失败', error);
      toastr.error(`商城写入失败: ${error?.message || '未知错误'}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const parseAndValidateItems = (text: string, context: ShopRefreshContext) => {
    const jsonText = extractJsonArray(text);
    const repaired = jsonrepair(jsonText);
    const parsed = JSON.parse(repaired);
    if (!Array.isArray(parsed)) {
      throw new Error('生成结果不是数组');
    }

    const normalized = parsed.map(normalizeItem);
    const filtered = normalized.filter(item => context.targetTypes.includes(item.分类));
    if (filtered.length < context.refreshCount) {
      throw new Error('生成商品数量不足或分类不匹配');
    }

    const finalItems = filtered
      .slice(0, context.refreshCount)
      .map(item => pruneItemForShop(normalizeItem(item)));

    if (context.mustHaveItem) {
      const exists = finalItems.some(item => item.名称 === context.mustHaveItem.名称);
      if (!exists) {
        finalItems.unshift(normalizeItem(context.mustHaveItem));
      }
    }
    const errorsMap: Record<number, string[]> = {};
    finalItems.forEach((item, idx) => {
      const errors = validateItem(item);
      if (errors.length > 0) {
        errorsMap[idx] = errors;
      }
    });

    return { items: finalItems, errorsMap };
  };

  const updateReviewItem = (index: number, patch: any) => {
    setReviewItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const autoFixReviewItems = () => {
    const fixed = reviewItems.map(item => {
      const beforeFixedBonus = Array.isArray(item.固定加成) ? [...item.固定加成] : [];
      const after = sanitizeItemForShop(item);
      const afterFixedBonus = Array.isArray(after.固定加成) ? after.固定加成 : [];
      const normalizedBefore = sanitizeItemForShop({ ...item, 固定加成: beforeFixedBonus }).固定加成 || [];
      const fixedBonusChanged = JSON.stringify(normalizedBefore) !== JSON.stringify(afterFixedBonus);
      return {
        ...after,
        $autoFixed: true,
        $fixedBonusChanged: fixedBonusChanged,
        $fixedBonusOriginal: beforeFixedBonus,
      };
    });
    const errorsMap: Record<number, string[]> = {};
    fixed.forEach((item, idx) => {
      const errors = validateItem(item);
      if (errors.length > 0) {
        errorsMap[idx] = errors;
      }
    });
    setReviewItems(fixed);
    setReviewErrors(errorsMap);
    if (Object.keys(errorsMap).length === 0) {
      setFixError('');
    } else {
      setFixError('已自动修正，但仍有格式错误');
    }
  };

  const handleReviewConfirm = () => {
    if (!lastRefreshRef.current) {
      setShowReviewModal(false);
      return;
    }
    const errorsMap: Record<number, string[]> = {};
    reviewItems.forEach((item, idx) => {
      const errors = validateItem(item);
      if (errors.length > 0) {
        errorsMap[idx] = errors;
      }
    });
    if (Object.keys(errorsMap).length > 0) {
      setReviewErrors(errorsMap);
      setFixError('仍有格式错误，请修正后再确认');
      return;
    }
    applyItemsWithContext(reviewItems, lastRefreshRef.current);
    setShowReviewModal(false);
    setReviewErrors({});
    setFixError('');
  };

  const handleQuickRefresh = async () => {
    if (isGenerating) return;
    if (refreshTypes.length === 0) {
      toastr.warning('请选择刷新类型');
      return;
    }

    const targetTypes = refreshTypes.includes('全部') ? ITEM_CATEGORIES : refreshTypes;
    if (targetTypes.length === 0) {
      toastr.warning('请选择刷新类型');
      return;
    }
    if (!onReplaceShopItems) {
      toastr.error('无法写回商城列表');
      return;
    }

    const mustHavePromptItem = buildMustHaveItem();
    if (mustHaveEnabled && !mustHavePromptItem) {
      return;
    }
    if (mustHavePromptItem && !targetTypes.includes(mustHavePromptItem.分类)) {
      toastr.warning('必定出现商品分类不在刷新类型中');
      return;
    }

    const rankTotal = (rankSelections || []).reduce((sum, item) => sum + (Number(item.count) || 0), 0);
    if (rankTotal > refreshCount) {
      toastr.warning('品阶数量总和超过刷新数量');
      return;
    }
    if (eroticCount > refreshCount) {
      toastr.warning('色情商品数量超过刷新数量');
      return;
    }

    const outputRules = [
      '输出规则:',
      '  输出要求:',
      '    - 仅输出 JSON 数组，仅包含商品对象。',
      '    - 不要输出解释、不要使用代码块。',
      '  基础约束:',
      '    - 允许分类：功法/武器/装备/法宝/着装/丹药/阵符/特殊。',
      '    - 每个商品必须符合商城结构（必填字段齐全）。',
      '    - 基础字段：价格(number)、数量(int >= 1)、名称、分类、品阶、描述。',
      '  分类规则:',
      '    - 分类=武器/装备/法宝：固定加成(Array<string>)、效果(Array<string>)。',
      '    - 分类=着装：着装类型(上衣/下衣/内衣/鞋子/袜子/佩戴物)、固定加成(Array<string>)、效果(Array<string>)。',
      '    - 分类=功法：固定加成(Array<string>)、招式(Array<{ 名称, 描述, 效果(Array<string>) }>)。',
      '    - 分类=特殊：内容(Array<string>)。',
      '    - 分类=丹药/阵符：效果(Array<string>)。',
      '  格式规则:',
      '    - 数量必须为整数且 >= 1。',
      '    - 固定加成格式：当前(根骨|神海|悟性|魅力|气运|杀伐|神伤|横练|身法) ± 数值(可选%); 或 基础(生命|灵气|道心) ± 数值(可选%)。',
      '    - 固定加成仅用于：功法/武器/装备/法宝/着装。',
      '    - 效果仅用于：武器/装备/法宝/着装/丹药/阵符。',
      '    - 内容仅用于：特殊。',
      '    - 若“必定出现商品”仅提供分类/名称/描述，请补全其余必填字段并确保满足分类规则。'
    ];

const typeText = targetTypes.join('、');
    const keywordText = refreshKeyword.trim() ? refreshKeyword.trim() : '无';
    const mustHaveText = mustHavePromptItem ? JSON.stringify(mustHavePromptItem, null, 2) : '无';
    const eroticText = eroticCount > 0
      ? `${eroticCount}（涉及性爱/调教/欲望等主题）。色情关键词：${eroticKeyword.trim() || '无'}。`
      : '0。';
    const rankText = rankTotal > 0
      ? `${(rankSelections || [])
          .filter(item => (Number(item.count) || 0) > 0)
          .map(item => `${item.rank}阶${item.grade} x${item.count}`)
          .join('、')}。`
      : '无明确要求。';
    const promptTemplate = [
      '身份与任务: 你是名古风修仙类型的RPG游戏设计师，你需要根据以下资料，设计游戏商城中不同类型的物品、功法和法宝',
      '设计背景:',
      `  - 以下是你设计商品时可以参考的游戏背景。{worldbook:[太虚界]太初天道总纲}{worldbook:[太虚界]宗门速览}`,
      '  - 注意：不要生搬硬套，不是每个商品都与具体的宗门、人物有关。设计商品时要注意多样性。',
      '商品基本设定:',
      '  - 以下为游戏商城的基础设定。{worldbook:[仙玉录]仙缘商城}',
      '  - 以下为你设计商品时需要严格参考的数值规范。{worldbook:[数值]物品数值基准}',
      '本次设计商品的额外要求:',
      `  刷新类型: ${typeText}`,
      `  刷新数量: ${refreshCount}`,
      `  主题关键词: ${keywordText}`,
      `  情色商品数量: ${eroticText}`,
      `  品阶数量: ${rankText}`,
      `  必定出现商品简版: ${mustHaveEnabled && mustHaveSimple ? '是' : '否'}`,
      `  必定出现商品: ${mustHaveText}`,
      ...outputRules
    ].join('\n');

const worldbookKeys = Array.from(new Set(
      (promptTemplate.match(/\{worldbook:([^}]+)\}/g) || [])
        .map(match => match.replace(/^\{worldbook:/, '').replace(/\}$/, '').trim())
        .filter(Boolean)
    ));
    const wbContents = worldbookKeys.length > 0 ? await getWorldbookEntryContents(worldbookKeys) : {};

    const prompt = promptTemplate.replace(/\{worldbook:([^}]+)\}/g, (_match, key) => {
      const k = String(key || '').trim();
      return (wbContents as any)[k] || '';
    });

    const existingItems = Array.isArray(data?.商品列表) ? data.商品列表 : [];
    lastRefreshRef.current = {
      targetTypes,
      refreshCount,
      mustHaveItem: mustHaveSimple ? null : mustHavePromptItem,
      mustHaveSimple,
      refreshAll: refreshTypes.includes('全部'),
      existingItems
    };

    let lastRaw = '';
    setIsGenerating(true);
    try {
      const customApi = buildShopCustomApi();
      const retries = Math.max(0, Math.min(10, Number(shopApiConfig?.retries) || 0));
      let lastError: any = null;
      for (let i = 0; i <= retries; i += 1) {
        try {
          lastRaw = await generateRaw({
            user_input: prompt,
            ordered_prompts: ['user_input'],
            ...(customApi ? { custom_api: customApi } : {})
          });
          lastError = null;
          break;
        } catch (error: any) {
          lastError = error;
          if (i === retries) {
            throw error;
          }
        }
      }
      if (lastError) {
        throw lastError;
      }
      const { items, errorsMap } = parseAndValidateItems(lastRaw || '', lastRefreshRef.current);
      setReviewItems(items);
      setReviewErrors(errorsMap);
      setReviewExistingItems(existingItems);
      setReplaceSelections([]);
      setApplyMode('append');
      setFixError('');
      setShowReviewModal(true);
      setIsRefreshing(false);
    } catch (error: any) {
      console.error('[ShopModal] 刷新失败', error);
      setReviewItems([]);
      setReviewErrors({});
      setReviewExistingItems(existingItems);
      setReplaceSelections([]);
      setApplyMode('append');
      setFixError(error.message || '格式错误');
      setShowReviewModal(true);
      setIsRefreshing(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const orderedReviewItems = useMemo(() => (
    reviewItems
      .map((item, idx) => ({ item, idx, errors: reviewErrors[idx] }))
      .sort((a, b) => (a.errors ? 0 : 1) - (b.errors ? 0 : 1))
  ), [reviewErrors, reviewItems]);

  return {
    isRefreshing,
    setIsRefreshing,
    isGenerating,
    refreshTypes,
    setRefreshTypes,
    refreshCount,
    setRefreshCount,
    refreshKeyword,
    setRefreshKeyword,
    eroticCount,
    setEroticCount,
    eroticKeyword,
    setEroticKeyword,
    rankSelections,
    setRankSelections,
    mustHaveEnabled,
    setMustHaveEnabled,
    mustHaveSimple,
    setMustHaveSimple,
    mustHaveForm,
    setMustHaveForm,
    fixError,
    setFixError,
    showReviewModal,
    setShowReviewModal,
    reviewExistingItems,
    reviewItems,
    reviewErrors,
    orderedReviewItems,
    applyMode,
    setApplyMode,
    replaceSelections,
    setReplaceSelections,
    toggleRefreshType,
    updateReviewItem,
    autoFixReviewItems,
    handleReviewConfirm,
    handleQuickRefresh,
    categories: SHOP_CATEGORIES,
    itemCategories: ITEM_CATEGORIES,
  };
};
