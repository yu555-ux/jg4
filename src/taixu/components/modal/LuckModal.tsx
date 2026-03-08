import { klona } from 'klona';
import { ChevronDown, Crown, Edit3, Gift, Save, Sparkles, Star, Trash2, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import toastr from 'toastr';
import { jsonrepair } from 'jsonrepair';
import { getRuntimeSchema } from '../../utils/schemaLoader';
import { getWorldbookEntryContents } from '../../utils/worldbook';
import { useMvuData } from '../../hooks/useMvuData';

interface LuckModalProps {
  data: any;
  onUpdateMvuData?: (newData: any) => void;
  luckApiConfig?: { apiurl: string; key: string; model: string; retries: number };
}

type PrizeItem = {
  名称: string;
  分类: string;
  出货概率: number;
  数量: number;
  品阶: string;
  描述: string;
  固定加成: string[];
  效果: string[];
  内容: string[];
  灵石类型: string;
  着装类型: string;
  招式: Array<{ 名称: string; 描述: string; 效果: string[] }>;
};

type PoolKey = '丙等卜算' | '乙等卜算' | '甲等卜算';

const buildEmptyPrize = (rank: string): PrizeItem => ({
  名称: '未知物品',
  分类: '未知',
  出货概率: 0,
  数量: 1,
  品阶: rank,
  描述: '暂无描述',
  固定加成: [],
  效果: [],
  内容: [],
  灵石类型: '',
  着装类型: '',
  招式: [],
});

const parseLines = (value: string) =>
  (value || '')
    .split(/\r?\n/)
    .map(v => v.trim())
    .filter(Boolean);

const stringifyLines = (values?: string[]) => (values || []).join('\n');

const RANK_TIERS = ['仙', '天', '地', '玄', '黄', '凡'];

const getRankTier = (rank: string) => String(rank || '').replace('阶', '');

const getSecondaryRankOptions = (highestTier: string) => {
  const idx = RANK_TIERS.indexOf(highestTier);
  if (idx < 0) return [] as string[];
  return RANK_TIERS.slice(idx + 1, idx + 3);
};

const normalizeApiUrl = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/\/v1\/?$/.test(trimmed)) return trimmed.replace(/\/$/, '');
  return `${trimmed.replace(/\/$/, '')}/v1`;
};

const extractJsonObject = (text: string) => {
  const cleaned = (text || '').replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  if (start < 0) throw new Error('未找到JSON对象起始');
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return cleaned.slice(start, i + 1);
      }
    }
  }
  throw new Error('JSON对象未闭合');
};

const normalizeLuckItem = (item: any, rankFallback: string) => {
  const base: any = {
    名称: item?.名称 || '未知物品',
    分类: item?.分类 || '未知',
    出货概率: Math.max(0, Math.min(100, Number(item?.出货概率) || 0)),
    数量: Number(item?.数量) || 1,
    品阶: item?.品阶 || rankFallback,
    描述: item?.描述 || '暂无描述',
  };
  switch (item?.分类) {
    case '武器':
    case '装备':
    case '法宝':
      base.固定加成 = Array.isArray(item?.固定加成) ? item.固定加成 : [];
      base.效果 = Array.isArray(item?.效果) ? item.效果 : [];
      return base;
    case '丹药':
    case '阵符':
      base.效果 = Array.isArray(item?.效果) ? item.效果 : [];
      return base;
    case '着装':
      base.着装类型 = item?.着装类型 || '上衣';
      base.固定加成 = Array.isArray(item?.固定加成) ? item.固定加成 : [];
      base.效果 = Array.isArray(item?.效果) ? item.效果 : [];
      return base;
    case '功法':
      base.固定加成 = Array.isArray(item?.固定加成) ? item.固定加成 : [];
      base.招式 = Array.isArray(item?.招式) ? item.招式 : [];
      return base;
    case '特殊':
      base.内容 = Array.isArray(item?.内容) ? item.内容 : [];
      return base;
    default:
      return base;
  }
};

const LuckModal: React.FC<LuckModalProps> = ({ onUpdateMvuData, luckApiConfig }) => {
  const [mvuData, setMvuData] = useMvuData(getRuntimeSchema);
  const [editingPoolKey, setEditingPoolKey] = useState<PoolKey | null>(null);
  const [draft, setDraft] = useState<any>(null);
  const [expandedPools, setExpandedPools] = useState<Record<PoolKey, boolean>>({
    丙等卜算: false,
    乙等卜算: false,
    甲等卜算: false,
  });
  const [refreshExpanded, setRefreshExpanded] = useState(false);
  const [refreshPoolKey, setRefreshPoolKey] = useState<PoolKey>('丙等卜算');
  const [secondaryCount, setSecondaryCount] = useState(3);
  const [refreshKeyword, setRefreshKeyword] = useState('');
  const [eroticEnabled, setEroticEnabled] = useState(false);
  const [eroticKeyword, setEroticKeyword] = useState('');
  const [eroticTier, setEroticTier] = useState<'最高级' | '次高级'>('次高级');
  const [eroticSecondaryCount, setEroticSecondaryCount] = useState(1);
  const [mustHaveEnabled, setMustHaveEnabled] = useState(false);
  const [mustHaveSimple, setMustHaveSimple] = useState(false);
  const [mustHaveTier, setMustHaveTier] = useState<'最高级' | '次高级'>('次高级');
  const [mustHaveForm, setMustHaveForm] = useState({
    名称: '',
    分类: '功法',
    品阶阶位: '凡',
    品阶品级: '上品',
    数量: 1,
    描述: '',
    固定加成: [] as string[],
    效果: [] as string[],
    内容: [] as string[],
    着装类型: '上衣',
    招式: [] as Array<{ 名称: string; 描述: string; 效果: string[] }>,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewPoolKey, setReviewPoolKey] = useState<PoolKey>('丙等卜算');
  const [reviewHighest, setReviewHighest] = useState<any>(null);
  const [reviewSecondary, setReviewSecondary] = useState<any[]>([]);
  const [reviewExistingSecondary, setReviewExistingSecondary] = useState<any[]>([]);
  const [applyMode, setApplyMode] = useState<'append' | 'replace'>('append');
  const [replaceSelections, setReplaceSelections] = useState<number[]>([]);
  const [fixError, setFixError] = useState('');

  const autoResize = (event: React.FormEvent<HTMLTextAreaElement>) => {
    const el = event.currentTarget;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const updateMustHaveForm = (key: string, value: any) => {
    setMustHaveForm(prev => ({ ...prev, [key]: value }));
  };

  const updateMustHaveMove = (index: number, field: '名称' | '描述', value: string) => {
    setMustHaveForm(prev => {
      const nextMoves = [...(prev.招式 || [])];
      if (!nextMoves[index]) nextMoves[index] = { 名称: '', 描述: '', 效果: [''] };
      nextMoves[index] = { ...nextMoves[index], [field]: value };
      return { ...prev, 招式: nextMoves };
    });
  };

  const addMustHaveMove = () => {
    setMustHaveForm(prev => ({ ...prev, 招式: [...(prev.招式 || []), { 名称: '', 描述: '', 效果: [''] }] }));
  };

  const removeMustHaveMove = (index: number) => {
    setMustHaveForm(prev => {
      const nextMoves = (prev.招式 || []).filter((_: any, i: number) => i !== index);
      return { ...prev, 招式: nextMoves };
    });
  };

  const updateMustHaveListItem = (key: '固定加成' | '效果' | '内容', index: number, value: string) => {
    setMustHaveForm(prev => {
      const list = [...(prev[key] || [])];
      list[index] = value;
      return { ...prev, [key]: list };
    });
  };

  const addMustHaveListItem = (key: '固定加成' | '效果' | '内容') => {
    setMustHaveForm(prev => ({ ...prev, [key]: [...(prev[key] || []), ''] }));
  };

  const removeMustHaveListItem = (key: '固定加成' | '效果' | '内容', index: number) => {
    setMustHaveForm(prev => {
      const list = (prev[key] || []).filter((_: string, i: number) => i !== index);
      return { ...prev, [key]: list };
    });
  };

  const updateMustHaveMoveEffect = (moveIndex: number, effectIndex: number, value: string) => {
    setMustHaveForm(prev => {
      const nextMoves = [...(prev.招式 || [])];
      if (!nextMoves[moveIndex]) nextMoves[moveIndex] = { 名称: '', 描述: '', 效果: [''] };
      const effects = [...(nextMoves[moveIndex].效果 || [])];
      effects[effectIndex] = value;
      nextMoves[moveIndex] = { ...nextMoves[moveIndex], 效果: effects };
      return { ...prev, 招式: nextMoves };
    });
  };

  const addMustHaveMoveEffect = (moveIndex: number) => {
    setMustHaveForm(prev => {
      const nextMoves = [...(prev.招式 || [])];
      if (!nextMoves[moveIndex]) nextMoves[moveIndex] = { 名称: '', 描述: '', 效果: [''] };
      nextMoves[moveIndex] = { ...nextMoves[moveIndex], 效果: [...(nextMoves[moveIndex].效果 || []), ''] };
      return { ...prev, 招式: nextMoves };
    });
  };

  const removeMustHaveMoveEffect = (moveIndex: number, effectIndex: number) => {
    setMustHaveForm(prev => {
      const nextMoves = [...(prev.招式 || [])];
      if (!nextMoves[moveIndex]) return prev;
      const nextEffects = (nextMoves[moveIndex].效果 || []).filter((_: string, i: number) => i !== effectIndex);
      nextMoves[moveIndex] = {
        ...nextMoves[moveIndex],
        效果: nextEffects.length ? nextEffects : [''],
      };
      return { ...prev, 招式: nextMoves };
    });
  };

  const pools = useMemo(
    () => [
      { key: '丙等卜算' as PoolKey, label: '丙等卜算', highestRank: '地阶', secondaryRank: '玄阶', accentClass: 'text-emerald-500' },
      { key: '乙等卜算' as PoolKey, label: '乙等卜算', highestRank: '天阶', secondaryRank: '地阶', accentClass: 'text-amber-500' },
      { key: '甲等卜算' as PoolKey, label: '甲等卜算', highestRank: '仙阶', secondaryRank: '天阶', accentClass: 'text-purple-500' },
    ],
    [],
  );

  const mustHaveTierOptions = useMemo(() => {
    const poolMeta = pools.find(p => p.key === refreshPoolKey);
    const highestTier = getRankTier(poolMeta?.highestRank || '凡阶');
    if (mustHaveTier === '最高级') {
      return [highestTier];
    }
    const options = getSecondaryRankOptions(highestTier);
    return options.length ? options : [highestTier];
  }, [pools, refreshPoolKey, mustHaveTier]);

  const isEditing = editingPoolKey !== null;

  useEffect(() => {
    if (!isEditing) {
      setDraft(null);
      return;
    }
    setDraft(klona(mvuData.天运卜算 || {}));
  }, [isEditing, mvuData]);

  useEffect(() => {
    if (!mustHaveTierOptions.length) return;
    if (!mustHaveTierOptions.includes(mustHaveForm.品阶阶位)) {
      setMustHaveForm(prev => ({ ...prev, 品阶阶位: mustHaveTierOptions[0] || '凡' }));
    }
  }, [mustHaveForm.品阶阶位, mustHaveTierOptions]);

  const ensurePool = (poolKey: PoolKey, base?: any) => {
    const pool = base?.[poolKey] || {};
    const highestRaw = pool.最高级奖品;
    const highest =
      highestRaw && !Array.isArray(highestRaw)
        ? highestRaw
        : Array.isArray(highestRaw)
          ? (highestRaw[0] ?? {})
          : {};
    return {
      已抽奖次数: Number(pool?.已抽奖次数) || 0,
      最高级奖品: highest,
      次高级奖品: Array.isArray(pool.次高级奖品) ? pool.次高级奖品 : [],
    };
  };

const getSource = () => (isEditing ? draft : mvuData.天运卜算) || {};

  const updateDraft = (next: any) => {
    setDraft(next);
  };

  const normalizePool = (pool: any) => {
    const highest = pool?.最高级奖品;
    return {
      ...pool,
      最高级奖品: highest && !Array.isArray(highest) ? highest : (Array.isArray(highest) ? (highest[0] ?? {}) : {}),
      次高级奖品: Array.isArray(pool?.次高级奖品) ? pool.次高级奖品 : [],
    };
  };

const saveDraft = () => {
    if (!draft) return;
    const next = klona(draft);
    ['丙等卜算', '乙等卜算', '甲等卜算'].forEach(key => {
      if (next?.[key]) next[key] = normalizePool(next[key]);
    });
    const newData = klona(mvuData);
    newData.天运卜算 = next;
    setMvuData(newData);
    onUpdateMvuData?.(newData);
    setEditingPoolKey(null);
  };

  const updatePrizeField = (
    poolKey: PoolKey,
    target: '最高级奖品' | '次高级奖品',
    index: number | null,
    field: keyof PrizeItem,
    value: any,
  ) => {
    if (!draft) return;
    const next = klona(draft);
    const pool = ensurePool(poolKey, next);
    if (target === '最高级奖品') {
      if (!pool.最高级奖品 || Array.isArray(pool.最高级奖品)) {
        pool.最高级奖品 = buildEmptyPrize(pools.find(p => p.key === poolKey)!.highestRank);
      }
      pool.最高级奖品[field] = value;
    } else {
      if (!Array.isArray(pool.次高级奖品)) pool.次高级奖品 = [];
      if (index === null) return;
      if (!pool.次高级奖品[index]) {
        pool.次高级奖品[index] = buildEmptyPrize(pools.find(p => p.key === poolKey)!.secondaryRank);
      }
      pool.次高级奖品[index][field] = value;
    }
    next[poolKey] = pool;
    updateDraft(next);
  };

  const updateProbability = (
    poolKey: PoolKey,
    target: '最高级奖品' | '次高级奖品',
    index: number | null,
    value: number,
  ) => {
    const nextValue = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
    updatePrizeField(poolKey, target, index, '出货概率', nextValue);
  };

  const addSecondaryPrize = (poolKey: PoolKey) => {
    if (!draft) return;
    const next = klona(draft);
    const pool = ensurePool(poolKey, next);
    pool.次高级奖品 = [...pool.次高级奖品, buildEmptyPrize(pools.find(p => p.key === poolKey)!.secondaryRank)];
    next[poolKey] = pool;
    updateDraft(next);
  };

  const removeSecondaryPrize = (poolKey: PoolKey, index: number) => {
    if (!draft) return;
    const next = klona(draft);
    const pool = ensurePool(poolKey, next);
    pool.次高级奖品 = pool.次高级奖品.filter((_: any, i: number) => i !== index);
    next[poolKey] = pool;
    updateDraft(next);
  };

  const resetHighestPrize = (poolKey: PoolKey, rank: string) => {
    if (!draft) return;
    const next = klona(draft);
    const pool = ensurePool(poolKey, next);
    pool.最高级奖品 = buildEmptyPrize(rank);
    next[poolKey] = pool;
    updateDraft(next);
  };

  const refreshLuckPool = async () => {
    const poolMeta = pools.find(p => p.key === refreshPoolKey);
    if (!poolMeta) return;
    const config = luckApiConfig || { apiurl: '', key: '', model: '', retries: 0 };
    const normalizedUrl = normalizeApiUrl(config.apiurl || '');
    if (!normalizedUrl) {
      alert('请先在 API 设置中填写天运卜算的 API URL');
      return;
    }
    setIsRefreshing(true);
    try {
      const normalizedSecondaryCount = Math.max(0, Math.min(10, Number(secondaryCount) || 0));
      const highestTier = getRankTier(poolMeta.highestRank);
      const secondaryTierOptions = getSecondaryRankOptions(highestTier);
      const secondaryTierText = secondaryTierOptions.length
        ? secondaryTierOptions.map(tier => `${tier}阶`).join('或')
        : poolMeta.secondaryRank;
      const outputRules = [
        '  输出要求:',
        '    - 仅输出 JSON 对象。',
        '    - 不要输出解释、不要使用代码块。',
        '  格式模板:',
        '    {',
        '      "最高级奖品": { "分类": "...", "名称": "...", "出货概率": 0, "数量": 1, "品阶": "...", "描述": "...", "...": "..." },',
        '      "次高级奖品": [',
        '        { "分类": "...", "名称": "...", "出货概率": 0, "数量": 1, "品阶": "...", "描述": "...", "...": "..." }',
        '      ]',
        '    }',
        '  基础约束:',
        '    - 允许分类：功法/武器/装备/法宝/着装/丹药/阵符/特殊。',
        '    - 最高级奖品为对象；次高级奖品为数组。',
        `    - 次高级奖品数量必须为 ${normalizedSecondaryCount}。`,
        '  分类规则:',
        '    - 分类=武器/装备/法宝：固定加成(Array<string>)、效果(Array<string>)。',
        '    - 分类=着装：着装类型(上衣/下衣/内衣/鞋子/袜子/佩戴物)、固定加成(Array<string>)、效果(Array<string>)。',
        '    - 分类=功法：固定加成(Array<string>)、招式(Array<{ 名称, 描述, 效果(Array<string>) }>)。',
        '    - 分类=特殊：内容(Array<string>)。',
        '    - 分类=丹药/阵符：效果(Array<string>)。',
        '  字段要求:',
        '    - 基础字段：名称、分类、品阶、描述、出货概率(number 0~100)、数量(int >= 1)。',
        `    - 最高级奖品品阶必须为 ${poolMeta.highestRank}（上/中/下品可选）。`,
        `    - 次高级奖品品阶仅可为 ${secondaryTierText}（上/中/下品可选）。`,
        '  格式规则:',
        '    - 数量必须为整数且 >= 1。',
        '    - 固定加成格式：当前(根骨|神海|悟性|魅力|气运|杀伐|神伤|横练|身法) ± 数值(可选%); 或 基础(生命|灵气|道心) ± 数值(可选%)。',
        '    - 固定加成仅用于：功法/武器/装备/法宝/着装。',
        '    - 效果仅用于：武器/装备/法宝/着装/丹药/阵符。',
        '    - 内容仅用于：特殊。',
        '    - 若“必定出现奖品”仅提供分类/名称/描述，请补全其余必填字段并满足品阶约束。',
      ];

      const mustHaveItem = mustHaveEnabled
        ? (() => {
            const base = {
              层级: mustHaveTier,
              名称: (mustHaveForm.名称 || '').trim() || '未命名',
              分类: (mustHaveForm.分类 || '').trim() || '未指定',
              描述: (mustHaveForm.描述 || '').trim() || '无',
            } as any;
            if (mustHaveSimple) {
              return base;
            }
            const composedRank = `${mustHaveForm.品阶阶位 || highestTier}阶${mustHaveForm.品阶品级 || '上品'}`;
            const item: any = {
              ...base,
              品阶: composedRank,
              数量: Number(mustHaveForm.数量) || 1,
              固定加成: (mustHaveForm.固定加成 || []).map(text => String(text).trim()).filter(Boolean),
              效果: (mustHaveForm.效果 || []).map(text => String(text).trim()).filter(Boolean),
              内容: (mustHaveForm.内容 || []).map(text => String(text).trim()).filter(Boolean),
              着装类型: (mustHaveForm.着装类型 || '').trim() || '无',
              招式: (mustHaveForm.招式 || []).map((m: any) => ({
                名称: (m?.名称 || '').trim() || '未命名',
                描述: (m?.描述 || '').trim() || '无',
                效果: (m?.效果 || []).map((e: string) => String(e).trim()).filter(Boolean),
              })),
            };
            if (item.分类 === '功法') {
              delete item.效果;
              delete item.内容;
              delete item.着装类型;
            } else if (item.分类 === '特殊') {
              delete item.固定加成;
              delete item.效果;
              delete item.着装类型;
              delete item.招式;
            } else if (item.分类 === '着装') {
              delete item.内容;
              delete item.招式;
            } else if (item.分类 === '丹药' || item.分类 === '阵符') {
              delete item.固定加成;
              delete item.内容;
              delete item.着装类型;
              delete item.招式;
            } else {
              // 武器/装备/法宝
              delete item.内容;
              delete item.着装类型;
              delete item.招式;
            }
            return item;
          })()
        : null;
      const eroticText = eroticEnabled
        ? `${eroticTier}；次高级数量=${eroticTier === '次高级' ? Math.max(1, Number(eroticSecondaryCount) || 1) : 1}；关键词=${eroticKeyword.trim() || '无'}`
        : '否';

      const mustHaveText = mustHaveItem ? JSON.stringify(mustHaveItem, null, 2) : '无';
      const mustHaveYaml = mustHaveText
        .split('\n')
        .map(line => `  ${line}`)
        .join('\n');

      const promptTemplate = [
        '身份与任务: |',
        '  你是名古风修仙类型的RPG游戏设计师，你需要根据以下资料，设计天运卜算奖池中的奖品。',
        '设计背景:',
        `  - 以下是你设计奖品时可以参考的游戏背景。{worldbook:[太虚界]太初天道总纲}{worldbook:[太虚界]宗门速览}`,
        '  - 注意：不要生搬硬套，不是每个奖品都与具体的宗门、人物有关。设计奖品时要注意多样性。',
        '商品基本设定:',
        '  - 以下为天运卜算的基础设定。{worldbook:[仙玉录]天运卜算}',
        '  - 以下为你设计奖品时需要严格参考的数值规范。{worldbook:[数值]物品数值基准}',
        '本次设计奖品的额外要求:',
        `  奖池: ${poolMeta.label}`,
        `  次高级数量: ${normalizedSecondaryCount}`,
        `  主题关键词: ${refreshKeyword.trim() || '无'}`,
        `  色情奖品: ${eroticText}`,
        `  必定出现奖品简版: ${mustHaveEnabled && mustHaveSimple ? '是' : '否'}`,
        '必定出现奖品: |',
        mustHaveYaml,
        '输出规则:',
        ...outputRules,
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

      const retries = Math.max(0, Math.min(10, Number(config.retries) || 0));
      let lastRaw = '';
      let lastError: any = null;
      for (let i = 0; i <= retries; i += 1) {
        try {
          // @ts-ignore - generateRaw is injected by runtime
          lastRaw = await generateRaw({
            user_input: prompt,
            ordered_prompts: ['user_input'],
            custom_api: {
              apiurl: normalizedUrl,
              key: config.key?.trim(),
              model: config.model || 'gpt-4o-mini',
              source: 'openai'
            }
          });
          lastError = null;
          break;
        } catch (error: any) {
          lastError = error;
          if (i === retries) throw error;
        }
      }
      if (lastError) throw lastError;

      const cleaned = (lastRaw || '').trim();
      let data: any = null;
      try {
        const jsonText = extractJsonObject(cleaned);
        const repaired = jsonrepair(jsonText);
        data = JSON.parse(repaired);
      } catch (error: any) {
        console.error('[LuckModal] 解析失败', { error, raw: cleaned });
        throw new Error('解析奖池数据失败，请检查输出是否为有效JSON');
      }
      const highestRaw = Array.isArray(data?.最高级奖品) ? data.最高级奖品[0] : data?.最高级奖品;
      const highest = (highestRaw && typeof highestRaw === 'object') ? highestRaw : {};
      const secondaryRaw = data?.次高级奖品;
      const secondary = Array.isArray(secondaryRaw)
        ? secondaryRaw
        : (secondaryRaw && typeof secondaryRaw === 'object' ? [secondaryRaw] : []);

      setReviewPoolKey(refreshPoolKey);
      setReviewHighest(normalizeLuckItem(highest, poolMeta.highestRank));
      setReviewSecondary(secondary.map((item: any) => normalizeLuckItem(item, poolMeta.secondaryRank)).slice(0, normalizedSecondaryCount));
      setReviewExistingSecondary(
        Array.isArray(mvuData?.天运卜算?.[refreshPoolKey]?.次高级奖品)
          ? mvuData.天运卜算[refreshPoolKey].次高级奖品
          : []
      );
      setApplyMode('append');
      setReplaceSelections([]);
      setFixError('');
      setReviewOpen(true);
    } catch (e: any) {
      toastr.error(e?.message || '刷新失败');
      alert(`刷新失败：${e?.message || '未知错误'}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderPrize = (
    item: PrizeItem | null,
    rank: string,
    editing: boolean,
    onUpdate: (field: keyof PrizeItem, value: any) => void,
    onUpdateProb?: (value: number) => void,
  ) => {
    if (!item) {
      return (
        <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 italic">
          暂无设置
        </div>
      );
    }

      if (!editing) {
        const category = item.分类 || '未知';
        const showFixed = Array.isArray(item.固定加成) && item.固定加成.length > 0;
        const showEffects = Array.isArray(item.效果) && item.效果.length > 0;
        const showContent = Array.isArray(item.内容) && item.内容.length > 0;
        const showMoves = Array.isArray(item.招式) && item.招式.length > 0;
        return (
          <div className="p-5 bg-white border border-emerald-100 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-bold text-slate-800">{item.名称 || '未命名物品'}</div>
                <div className="text-[11px] text-slate-500 mt-1">出货概率：{item.出货概率 ?? 0}% · 数量：{item.数量 ?? 1}</div>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                {rank}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">分类：{category}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">品阶：{item.品阶 || rank}</span>
              {item.着装类型 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">着装类型：{item.着装类型}</span>
              )}
            </div>

            {item.描述 && <div className="text-xs text-slate-600 leading-relaxed">{item.描述}</div>}

            <div className="space-y-2">
              {showFixed && (
                <details className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3">
                  <summary className="cursor-pointer text-xs font-bold text-emerald-700">固定加成</summary>
                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    {item.固定加成.map((eff: string, i: number) => (
                      <div key={i} className="px-2 py-1 rounded-lg bg-white/70 border border-emerald-100">
                        {eff}
                      </div>
                    ))}
                  </div>
                </details>
              )}
              {showEffects && (
                <details className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3">
                  <summary className="cursor-pointer text-xs font-bold text-emerald-700">效果</summary>
                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    {item.效果.map((eff: string, i: number) => (
                      <div key={i} className="px-2 py-1 rounded-lg bg-white/70 border border-emerald-100">
                        {eff}
                      </div>
                    ))}
                  </div>
                </details>
              )}
              {showMoves && (
                <details className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3">
                  <summary className="cursor-pointer text-xs font-bold text-emerald-700">招式</summary>
                  <div className="mt-2 space-y-2 text-xs text-slate-600">
                    {item.招式.map((move: any, i: number) => (
                      <div key={i} className="rounded-lg border border-emerald-100 bg-white/70 p-2 space-y-1">
                        <div className="font-bold text-emerald-700">{move.名称 || '未命名招式'}</div>
                        {move.描述 && <div className="text-slate-600">{move.描述}</div>}
                        {Array.isArray(move.效果) && move.效果.length > 0 && (
                          <div className="space-y-1">
                            {move.效果.map((eff: string, idx: number) => (
                              <div key={idx} className="px-2 py-1 rounded-lg bg-white border border-emerald-100">
                                {eff}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}
              {showContent && (
                <details className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3">
                  <summary className="cursor-pointer text-xs font-bold text-emerald-700">内容</summary>
                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    {item.内容.map((line: string, i: number) => (
                      <div key={i} className="px-2 py-1 rounded-lg bg-white/70 border border-emerald-100">
                        {line}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        );
      }

    const prizeCategories = ['功法', '武器', '装备', '法宝', '着装', '丹药', '阵符', '特殊'];
    const category = item.分类 || '功法';
    const showFixed = ['功法', '武器', '装备', '法宝', '着装'].includes(category);
    const showEffects = ['武器', '装备', '法宝', '着装', '丹药', '阵符'].includes(category);
    const showContent = category === '特殊';
    const showMoves = category === '功法';
    const showWearType = category === '着装';
    const moves = Array.isArray(item.招式) ? item.招式 : [];

    return (
      <div className="p-4 bg-white border border-emerald-100 rounded-2xl shadow-sm space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-slate-500">
            名称
            <input
              value={item.名称 || ''}
              onChange={e => onUpdate('名称', e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs"
            />
          </label>
          <label className="text-xs text-slate-500">
            分类
            <select
              value={category}
              onChange={e => onUpdate('分类', e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white"
            >
              {prizeCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </label>
        </div>

        {showWearType && (
          <label className="text-xs text-slate-500">
            着装类型
            <input
              value={item.着装类型 || ''}
              onChange={e => onUpdate('着装类型', e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs"
            />
          </label>
        )}

        <div className="grid grid-cols-3 gap-3">
          <label className="text-xs text-slate-500">
            品阶
            <input
              value={item.品阶 || rank}
              onChange={e => onUpdate('品阶', e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs"
            />
          </label>
          <label className="text-xs text-slate-500">
            数量
            <input
              type="number"
              value={item.数量 ?? 1}
              onChange={e => onUpdate('数量', Number(e.target.value) || 0)}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs"
            />
          </label>
          <label className="text-xs text-slate-500">
            出货概率(%)
            <div className="mt-1 flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={item.出货概率 ?? 0}
                onChange={e => onUpdateProb?.(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <input
                type="number"
                value={item.出货概率 ?? 0}
                onChange={e => onUpdateProb?.(parseFloat(e.target.value) || 0)}
                className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-xs text-right font-mono"
              />
            </div>
          </label>
        </div>

        <label className="text-xs text-slate-500 block">
          描述
          <textarea
            value={item.描述 || ''}
            onChange={e => onUpdate('描述', e.target.value)}
            onInput={autoResize}
            className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs min-h-[48px] resize-none overflow-hidden"
          />
        </label>

        {showFixed && (
          <label className="text-xs text-slate-500 block">
            固定加成（每行一条）
            <textarea
              value={stringifyLines(item.固定加成)}
              onChange={e => onUpdate('固定加成', parseLines(e.target.value))}
              onInput={autoResize}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs min-h-[48px] resize-none overflow-hidden"
              placeholder="每行一条"
            />
          </label>
        )}

        {showEffects && (
          <label className="text-xs text-slate-500 block">
            效果（每行一条）
            <textarea
              value={stringifyLines(item.效果)}
              onChange={e => onUpdate('效果', parseLines(e.target.value))}
              onInput={autoResize}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs min-h-[48px] resize-none overflow-hidden"
              placeholder="每行一条"
            />
          </label>
        )}

        {showContent && (
          <label className="text-xs text-slate-500 block">
            内容（每行一条）
            <textarea
              value={stringifyLines(item.内容)}
              onChange={e => onUpdate('内容', parseLines(e.target.value))}
              onInput={autoResize}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs min-h-[48px] resize-none overflow-hidden"
              placeholder="每行一条"
            />
          </label>
        )}

        {showMoves && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">招式</span>
              <button
                type="button"
                onClick={() => onUpdate('招式', [...moves, { 名称: '', 描述: '', 效果: [] }])}
                className="px-2 py-1 rounded-full border text-xs font-black text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              >
                添加招式
              </button>
            </div>
            {moves.length === 0 ? (
              <div className="text-xs text-slate-400">暂无招式</div>
            ) : (
              <div className="space-y-2">
                {moves.map((move: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        招式名
                        <input
                          value={move?.名称 || ''}
                          onChange={e => {
                            const next = [...moves];
                            next[idx] = { ...next[idx], 名称: e.target.value };
                            onUpdate('招式', next);
                          }}
                          className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs"
                        />
                      </label>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        描述
                        <input
                          value={move?.描述 || ''}
                          onChange={e => {
                            const next = [...moves];
                            next[idx] = { ...next[idx], 描述: e.target.value };
                            onUpdate('招式', next);
                          }}
                          className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs"
                        />
                      </label>
                    </div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      效果（每行一条）
                      <textarea
                        value={stringifyLines(move?.效果 || [])}
                        onChange={e => {
                          const next = [...moves];
                          next[idx] = { ...next[idx], 效果: parseLines(e.target.value) };
                          onUpdate('招式', next);
                        }}
                        onInput={autoResize}
                        className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs min-h-[40px] resize-none overflow-hidden"
                      />
                    </label>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => onUpdate('招式', moves.filter((_: any, i: number) => i !== idx))}
                        className="px-2 py-1 rounded-full border text-xs font-black text-rose-500 border-rose-200 hover:bg-rose-50"
                      >
                        删除招式
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const reviewModal = reviewOpen ? createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-sm" style={{ zIndex: 2000 }}>
      <div className="bg-white w-[min(94vw,56rem)] max-w-5xl rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden flex flex-col max-h-[calc(100svh-2rem)] sm:max-h-[90vh]">
        <div className="px-8 py-5 border-b border-emerald-50 flex items-center justify-between bg-emerald-50/30">
          <div className="flex items-center gap-3 text-emerald-700">
            <Sparkles className="w-5 h-5" />
            <h3 className="text-lg font-black tracking-widest">刷新结果确认</h3>
          </div>
          <button
            onClick={() => setReviewOpen(false)}
            className="p-2 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 p-6 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="text-xs text-slate-500">奖池：{pools.find(p => p.key === reviewPoolKey)?.label}</div>

          <div className="p-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 space-y-3">
            <div className="text-xs font-black text-emerald-700">写入方式</div>
            <div className="text-[11px] text-emerald-600">最高级奖品始终替换；以下选项仅作用于次高级奖品。</div>
            <div className="flex flex-wrap gap-3 text-xs">
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-200 bg-white cursor-pointer">
                <input
                  type="radio"
                  checked={applyMode === 'append'}
                  onChange={() => setApplyMode('append')}
                />
                追加到现有次高级
              </label>
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-200 bg-white cursor-pointer">
                <input
                  type="radio"
                  checked={applyMode === 'replace'}
                  onChange={() => setApplyMode('replace')}
                />
                替换选中的次高级
              </label>
              <button
                onClick={() => {
                  const poolMeta = pools.find(p => p.key === reviewPoolKey);
                  if (!poolMeta) return;
                  setReviewHighest(normalizeLuckItem(reviewHighest, poolMeta.highestRank));
                  setReviewSecondary((reviewSecondary || []).map(item => normalizeLuckItem(item, poolMeta.secondaryRank)));
                  setFixError('');
                }}
                className="px-3 py-2 rounded-xl border border-emerald-200 bg-white text-emerald-700 font-black hover:bg-emerald-50"
              >
                自动修改
              </button>
            </div>

            {applyMode === 'replace' && (
              <div className="space-y-2">
                <div className="text-xs text-slate-500">请选择要被替换的次高级奖品</div>
                {reviewExistingSecondary.length === 0 ? (
                  <div className="text-xs text-slate-400">当前没有次高级奖品可替换。</div>
                ) : (
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-emerald-100 bg-white">
                    {reviewExistingSecondary.map((item, idx) => {
                      const checked = replaceSelections.includes(idx);
                      return (
                        <label
                          key={idx}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-xs border-b border-emerald-50 cursor-pointer ${
                            checked ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-emerald-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const next = checked
                                ? replaceSelections.filter(i => i !== idx)
                                : [...replaceSelections, idx];
                              setReplaceSelections(next);
                            }}
                          />
                          <span className="truncate">
                            {item?.名称 || '未命名'} · {item?.分类 || '未知'} · {item?.品阶 || '未知'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {fixError && (
            <div className="text-sm text-rose-600 font-bold">{fixError}</div>
          )}

          <div className="space-y-2">
            <div className="text-xs font-black text-slate-500 uppercase tracking-widest">最高级奖品</div>
            {renderPrize(
              reviewHighest,
              pools.find(p => p.key === reviewPoolKey)?.highestRank || '',
              true,
              (field, value) => setReviewHighest((prev: any) => ({ ...(prev || {}), [field]: value })),
              (value) => setReviewHighest((prev: any) => ({ ...(prev || {}), 出货概率: value })),
            )}
          </div>

          <div className="space-y-2">
            <div className="text-xs font-black text-slate-500 uppercase tracking-widest">次高级奖品</div>
            <div className="space-y-3">
              {reviewSecondary.map((item, idx) => (
                <div key={idx}>
                  {renderPrize(
                    item,
                    pools.find(p => p.key === reviewPoolKey)?.secondaryRank || '',
                    true,
                    (field, value) => {
                      const next = [...reviewSecondary];
                      next[idx] = { ...next[idx], [field]: value };
                      setReviewSecondary(next);
                    },
                    (value) => {
                      const next = [...reviewSecondary];
                      next[idx] = { ...next[idx], 出货概率: value };
                      setReviewSecondary(next);
                    },
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-emerald-50 bg-white flex items-center justify-end gap-3">
          <button
            onClick={() => setReviewOpen(false)}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 text-xs font-black hover:bg-slate-50"
          >
            取消
          </button>
          <button
            onClick={() => {
              const poolMeta = pools.find(p => p.key === reviewPoolKey);
              if (!poolMeta) return;
              if (applyMode === 'replace' && replaceSelections.length === 0) {
                setFixError('请先选择要替换的次高级奖品');
                return;
              }
              try {
                const next = klona(draft || mvuData.天运卜算 || {});
                const existingCount =
                  next?.[reviewPoolKey]?.已抽奖次数 ??
                  mvuData?.天运卜算?.[reviewPoolKey]?.已抽奖次数 ??
                  0;
                const existingSecondary = Array.isArray(next?.[reviewPoolKey]?.次高级奖品)
                  ? next[reviewPoolKey].次高级奖品
                  : [];
                let mergedSecondary: any[] = [];
                if (applyMode === 'replace') {
                  const dropSet = new Set(replaceSelections);
                  const preserved = existingSecondary.filter((_item: any, idx: number) => !dropSet.has(idx));
                  mergedSecondary = [...preserved, ...(reviewSecondary || [])];
                } else {
                  mergedSecondary = [...existingSecondary, ...(reviewSecondary || [])];
                }
                const limitCount = Math.max(0, Math.min(10, Number(secondaryCount) || 0));
                next[reviewPoolKey] = {
                  已抽奖次数: existingCount,
                  最高级奖品: normalizeLuckItem(reviewHighest, poolMeta.highestRank),
                  次高级奖品: mergedSecondary.map(item => normalizeLuckItem(item, poolMeta.secondaryRank)).slice(0, limitCount),
                };
                if (isEditing) {
                  updateDraft(next);
                }
                const newData = klona(mvuData);
                newData.天运卜算 = next;
                setMvuData(newData);
                onUpdateMvuData?.(newData);
                toastr.success('天运卜算奖池已写入');
                setReviewOpen(false);
              } catch (error: any) {
                console.error('[LuckModal] 写入失败', error);
                toastr.error(`写入失败: ${error?.message || '未知错误'}`);
              }
            }}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-black hover:bg-emerald-600"
          >
            确认写入
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="flex flex-col h-full space-y-6">
      {reviewModal}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
        {pools.map(pool => {
          const source = getSource();
          const poolData = ensurePool(pool.key, source);
          const isExpanded = !!expandedPools[pool.key];
          const isPoolEditing = editingPoolKey === pool.key;
          return (
            <section key={pool.key} className="bg-white/70 border border-emerald-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => setExpandedPools(prev => ({ ...prev, [pool.key]: !prev[pool.key] }))}
              >
                <div className="flex items-center gap-2 text-slate-800">
                  <Star className={`w-4 h-4 ${pool.accentClass}`} />
                  <h3 className="text-lg font-black">{pool.label}</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isPoolEditing) {
                        saveDraft();
                      } else {
                        setEditingPoolKey(pool.key);
                        setExpandedPools(prev => ({ ...prev, [pool.key]: true }));
                      }
                    }}
                    className={`ml-1 inline-flex items-center justify-center w-6 h-6 transition-colors ${
                      isPoolEditing ? 'text-emerald-600 hover:text-emerald-700' : 'text-emerald-600 hover:text-emerald-700'
                    }`}
                    title={isPoolEditing ? '保存奖池' : '编辑奖池'}
                  >
                    {isPoolEditing ? <Save className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>已抽奖次数：{poolData.已抽奖次数 ?? 0}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {isExpanded && (
                <>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                  <Crown className="w-4 h-4 text-amber-500" />
                  最高级奖品（{pool.highestRank}）
                </div>
                {(!poolData.最高级奖品 || Object.keys(poolData.最高级奖品).length === 0) ? (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 italic">
                    暂无最高级奖品
                  </div>
                ) : (
                  <div className="relative">
                    {renderPrize(
                      poolData.最高级奖品,
                      pool.highestRank,
                      !!isPoolEditing,
                      (field, value) => updatePrizeField(pool.key, '最高级奖品', null, field, value),
                      (value) => updateProbability(pool.key, '最高级奖品', null, value),
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                    <Gift className="w-4 h-4 text-emerald-500" />
                    次高级奖品（{pool.secondaryRank}）
                  </div>
                  {isPoolEditing && (
                    <button
                      onClick={() => addSecondaryPrize(pool.key)}
                      className="text-xs font-bold text-emerald-600 border border-emerald-200 px-3 py-1 rounded-full hover:bg-emerald-50"
                    >
                      添加奖品
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {poolData.次高级奖品.length === 0 && (
                    <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 italic">
                      暂无次高级奖品
                    </div>
                  )}
                  {poolData.次高级奖品.map((item, idx) => (
                    <div key={`${pool.key}-${idx}`} className="relative">
                      {renderPrize(
                        item,
                        pool.secondaryRank,
                        !!isPoolEditing,
                        (field, value) => updatePrizeField(pool.key, '次高级奖品', idx, field, value),
                        (value) => updateProbability(pool.key, '次高级奖品', idx, value),
                      )}
                      {isPoolEditing && (
                        <button
                          onClick={() => removeSecondaryPrize(pool.key, idx)}
                          className="absolute top-3 right-3 p-1.5 rounded-full bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100"
                          title="删除"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
                </>
              )}
            </section>
          );
        })}

        <section className="bg-white/70 border border-emerald-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => setRefreshExpanded(prev => !prev)}
          >
            <div className="text-xs font-bold text-emerald-700 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              奖池刷新
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${refreshExpanded ? 'rotate-180' : ''}`} />
          </div>

          {refreshExpanded && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="text-xs text-slate-500">
                  奖池
                  <select
                    value={refreshPoolKey}
                    onChange={e => setRefreshPoolKey(e.target.value as PoolKey)}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white"
                  >
                    {pools.map(pool => (
                      <option key={pool.key} value={pool.key}>{pool.label}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-slate-500">
                  次高级数量
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={secondaryCount}
                    onChange={e => setSecondaryCount(Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs"
                  />
                </label>
                <label className="text-xs text-slate-500">
                  主题关键词（可选）
                  <input
                    value={refreshKeyword}
                    onChange={e => setRefreshKeyword(e.target.value)}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs"
                    placeholder="如：剑道/合欢/防御/血脉等"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="text-xs text-slate-500">
                  色情奖品
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEroticEnabled(prev => !prev)}
                      className={`px-3 py-1.5 rounded-full border text-xs font-black transition-all ${
                        eroticEnabled
                          ? 'bg-emerald-500 text-white border-emerald-400'
                          : 'bg-white text-slate-400 border-slate-200'
                      }`}
                    >
                      {eroticEnabled ? '已开启' : '未开启'}
                    </button>
                  </div>
                </label>
                <label className="text-xs text-slate-500">
                  色情层级
                  <select
                    value={eroticTier}
                    onChange={e => setEroticTier(e.target.value as '最高级' | '次高级')}
                    disabled={!eroticEnabled}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white disabled:opacity-60"
                  >
                    <option value="最高级">最高级</option>
                    <option value="次高级">次高级</option>
                  </select>
                </label>
                <label className="text-xs text-slate-500">
                  色情次高级数量
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={eroticSecondaryCount}
                    onChange={e => setEroticSecondaryCount(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                    disabled={!eroticEnabled || eroticTier !== '次高级'}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs disabled:opacity-60"
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="text-xs text-slate-500 sm:col-span-3">
                  色情关键词（可选）
                  <input
                    value={eroticKeyword}
                    onChange={e => setEroticKeyword(e.target.value)}
                    disabled={!eroticEnabled}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs disabled:opacity-60"
                    placeholder="如：调教/媚药/束缚等"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="text-xs text-slate-500">
                  必定出现商品
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMustHaveEnabled(prev => !prev)}
                      className={`px-3 py-1.5 rounded-full border text-xs font-black transition-all ${
                        mustHaveEnabled
                          ? 'bg-emerald-500 text-white border-emerald-400'
                          : 'bg-white text-slate-400 border-slate-200'
                      }`}
                    >
                      {mustHaveEnabled ? '已开启' : '未开启'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMustHaveSimple(prev => !prev)}
                      disabled={!mustHaveEnabled}
                      className={`px-3 py-1.5 rounded-full border text-xs font-black transition-all ${
                        mustHaveEnabled
                          ? mustHaveSimple
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : 'bg-white text-slate-400 border-slate-200'
                          : 'bg-white text-slate-300 border-slate-200 cursor-not-allowed'
                      }`}
                    >
                      简版填写
                    </button>
                  </div>
                </label>
                <label className="text-xs text-slate-500">
                  出现层级
                  <select
                    value={mustHaveTier}
                    onChange={e => setMustHaveTier(e.target.value as '最高级' | '次高级')}
                    disabled={!mustHaveEnabled}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white disabled:opacity-60"
                  >
                    <option value="最高级">最高级</option>
                    <option value="次高级">次高级</option>
                  </select>
                </label>
                <label className="text-xs text-slate-500">
                  物品名称
                  <input
                    value={mustHaveForm.名称}
                    onChange={e => updateMustHaveForm('名称', e.target.value)}
                    disabled={!mustHaveEnabled}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs disabled:opacity-60"
                    placeholder="如：霜寒剑"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="text-xs text-slate-500">
                  物品分类
                  <select
                    value={mustHaveForm.分类}
                    onChange={e => updateMustHaveForm('分类', e.target.value)}
                    disabled={!mustHaveEnabled}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white disabled:opacity-60"
                  >
                    {['功法', '武器', '装备', '法宝', '着装', '丹药', '阵符', '特殊'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </label>
                {!mustHaveSimple && (
                  <label className="text-xs text-slate-500">
                    品阶
                    <div className="mt-1 flex items-center gap-2">
                      <div className="relative">
                        <select
                          value={mustHaveForm.品阶阶位 || mustHaveTierOptions[0] || '凡'}
                          onChange={e => updateMustHaveForm('品阶阶位', e.target.value)}
                          disabled={!mustHaveEnabled || mustHaveTier === '最高级'}
                          className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white disabled:opacity-60 appearance-none"
                        >
                          {mustHaveTierOptions.map(tier => (
                            <option key={tier} value={tier}>{tier}</option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 border-l border-slate-200 pl-2">
                          ▾
                        </span>
                      </div>
                      <div className="relative">
                        <select
                          value={mustHaveForm.品阶品级 || '上品'}
                          onChange={e => updateMustHaveForm('品阶品级', e.target.value)}
                          disabled={!mustHaveEnabled}
                          className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white disabled:opacity-60 appearance-none"
                        >
                          <option value="上品">上品</option>
                          <option value="中品">中品</option>
                          <option value="下品">下品</option>
                        </select>
                        <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 border-l border-slate-200 pl-2">
                          ▾
                        </span>
                      </div>
                    </div>
                  </label>
                )}
                {!mustHaveSimple && (
                  <label className="text-xs text-slate-500">
                    数量
                    <input
                      type="number"
                      min={1}
                      value={mustHaveForm.数量}
                      onChange={e => updateMustHaveForm('数量', Math.max(1, Number(e.target.value) || 1))}
                      disabled={!mustHaveEnabled}
                      className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs disabled:opacity-60"
                    />
                  </label>
                )}
              </div>

              {!mustHaveSimple && mustHaveForm.分类 === '着装' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="text-xs text-slate-500">
                    着装类型
                    <select
                      value={mustHaveForm.着装类型}
                      onChange={e => updateMustHaveForm('着装类型', e.target.value)}
                      disabled={!mustHaveEnabled}
                      className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white disabled:opacity-60"
                    >
                      {['上衣', '下衣', '内衣', '鞋子', '袜子', '佩戴物'].map(item => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              <label className="text-xs text-slate-500">
                描述
                <textarea
                  value={mustHaveForm.描述}
                  onChange={e => updateMustHaveForm('描述', e.target.value)}
                  onInput={autoResize}
                  disabled={!mustHaveEnabled}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs min-h-[48px] resize-none overflow-hidden disabled:opacity-60"
                />
              </label>

              {!mustHaveSimple && ['功法', '武器', '装备', '法宝', '着装'].includes(mustHaveForm.分类) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">固定加成</span>
                    <button
                      type="button"
                      onClick={() => addMustHaveListItem('固定加成')}
                      disabled={!mustHaveEnabled}
                      className="px-2 py-1 rounded-full border text-xs font-black transition-all bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50 disabled:opacity-60"
                    >
                      添加一条
                    </button>
                  </div>
                  {(mustHaveForm.固定加成 || []).length === 0 ? (
                    <div className="text-xs text-slate-400">暂无固定加成</div>
                  ) : (
                    <div className="space-y-2">
                      {(mustHaveForm.固定加成 || []).map((item: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                          <textarea
                            value={item}
                            onChange={e => updateMustHaveListItem('固定加成', idx, e.target.value)}
                            onInput={autoResize}
                            disabled={!mustHaveEnabled}
                            className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-xs min-h-[36px] resize-none overflow-hidden disabled:opacity-60"
                            placeholder="如：当前根骨+12"
                          />
                          <button
                            type="button"
                            onClick={() => removeMustHaveListItem('固定加成', idx)}
                            disabled={!mustHaveEnabled}
                            className="px-2 py-1 rounded-full border text-xs font-black text-rose-500 border-rose-200 hover:bg-rose-50 disabled:opacity-60"
                          >
                            删除
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {['武器', '装备', '法宝', '着装'].includes(mustHaveForm.分类) && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">效果</span>
                        <button
                          type="button"
                          onClick={() => addMustHaveListItem('效果')}
                          disabled={!mustHaveEnabled}
                          className="px-2 py-1 rounded-full border text-xs font-black transition-all bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50 disabled:opacity-60"
                        >
                          添加一条
                        </button>
                      </div>
                      {(mustHaveForm.效果 || []).length === 0 ? (
                        <div className="text-xs text-slate-400">暂无效果</div>
                      ) : (
                        <div className="space-y-2">
                          {(mustHaveForm.效果 || []).map((item: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              <textarea
                                value={item}
                                onChange={e => updateMustHaveListItem('效果', idx, e.target.value)}
                                onInput={autoResize}
                                disabled={!mustHaveEnabled}
                                className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-xs min-h-[36px] resize-none overflow-hidden disabled:opacity-60"
                                placeholder="效果描述"
                              />
                              <button
                                type="button"
                                onClick={() => removeMustHaveListItem('效果', idx)}
                                disabled={!mustHaveEnabled}
                                className="px-2 py-1 rounded-full border text-xs font-black text-rose-500 border-rose-200 hover:bg-rose-50 disabled:opacity-60"
                              >
                                删除
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!mustHaveSimple && ['丹药', '阵符'].includes(mustHaveForm.分类) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">效果</span>
                    <button
                      type="button"
                      onClick={() => addMustHaveListItem('效果')}
                      disabled={!mustHaveEnabled}
                      className="px-2 py-1 rounded-full border text-xs font-black transition-all bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50 disabled:opacity-60"
                    >
                      添加一条
                    </button>
                  </div>
                  {(mustHaveForm.效果 || []).length === 0 ? (
                    <div className="text-xs text-slate-400">暂无效果</div>
                  ) : (
                    <div className="space-y-2">
                      {(mustHaveForm.效果 || []).map((item: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                          <textarea
                            value={item}
                            onChange={e => updateMustHaveListItem('效果', idx, e.target.value)}
                            onInput={autoResize}
                            disabled={!mustHaveEnabled}
                            className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-xs min-h-[36px] resize-none overflow-hidden disabled:opacity-60"
                            placeholder="效果描述"
                          />
                          <button
                            type="button"
                            onClick={() => removeMustHaveListItem('效果', idx)}
                            disabled={!mustHaveEnabled}
                            className="px-2 py-1 rounded-full border text-xs font-black text-rose-500 border-rose-200 hover:bg-rose-50 disabled:opacity-60"
                          >
                            删除
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!mustHaveSimple && mustHaveForm.分类 === '特殊' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">内容</span>
                    <button
                      type="button"
                      onClick={() => addMustHaveListItem('内容')}
                      disabled={!mustHaveEnabled}
                      className="px-2 py-1 rounded-full border text-xs font-black transition-all bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50 disabled:opacity-60"
                    >
                      添加一条
                    </button>
                  </div>
                  {(mustHaveForm.内容 || []).length === 0 ? (
                    <div className="text-xs text-slate-400">暂无内容</div>
                  ) : (
                    <div className="space-y-2">
                      {(mustHaveForm.内容 || []).map((item: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                          <textarea
                            value={item}
                            onChange={e => updateMustHaveListItem('内容', idx, e.target.value)}
                            onInput={autoResize}
                            disabled={!mustHaveEnabled}
                            className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-xs min-h-[36px] resize-none overflow-hidden disabled:opacity-60"
                            placeholder="内容描述"
                          />
                          <button
                            type="button"
                            onClick={() => removeMustHaveListItem('内容', idx)}
                            disabled={!mustHaveEnabled}
                            className="px-2 py-1 rounded-full border text-xs font-black text-rose-500 border-rose-200 hover:bg-rose-50 disabled:opacity-60"
                          >
                            删除
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!mustHaveSimple && mustHaveForm.分类 === '功法' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">招式</span>
                    <button
                      type="button"
                      onClick={addMustHaveMove}
                      disabled={!mustHaveEnabled}
                      className="px-2 py-1 rounded-full border text-xs font-black transition-all bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50 disabled:opacity-60"
                    >
                      添加招式
                    </button>
                  </div>
                  {(mustHaveForm.招式 || []).length === 0 && (
                    <div className="text-xs text-slate-400">暂无招式，点击右上角添加。</div>
                  )}
                  {(mustHaveForm.招式 || []).map((move: any, idx: number) => (
                    <div key={idx} className="space-y-2 p-2 border border-slate-200 rounded-xl">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <input
                          value={move.名称 || ''}
                          onChange={e => updateMustHaveMove(idx, '名称', e.target.value)}
                          disabled={!mustHaveEnabled}
                          className="border border-slate-200 rounded-lg px-2 py-1 text-xs disabled:opacity-60"
                          placeholder="招式名"
                        />
                        <input
                          value={move.描述 || ''}
                          onChange={e => updateMustHaveMove(idx, '描述', e.target.value)}
                          disabled={!mustHaveEnabled}
                          className="border border-slate-200 rounded-lg px-2 py-1 text-xs disabled:opacity-60"
                          placeholder="描述"
                        />
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => removeMustHaveMove(idx)}
                            disabled={!mustHaveEnabled}
                            className="px-2 py-1 rounded-full border text-xs font-black text-rose-500 border-rose-200 hover:bg-rose-50 disabled:opacity-60"
                          >
                            删除招式
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500">效果</span>
                        </div>
                        <div className="space-y-2">
                          {(move.效果 && move.效果.length ? move.效果 : ['']).map((effect: string, effectIdx: number) => (
                            <div key={effectIdx} className="flex items-center gap-2">
                              <textarea
                                value={effect}
                                onChange={e => updateMustHaveMoveEffect(idx, effectIdx, e.target.value)}
                                onInput={autoResize}
                                disabled={!mustHaveEnabled}
                                className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-xs min-h-[36px] resize-none overflow-hidden disabled:opacity-60"
                                placeholder="效果描述"
                              />
                              <button
                                type="button"
                                onClick={() => removeMustHaveMoveEffect(idx, effectIdx)}
                                disabled={!mustHaveEnabled}
                                className="px-2 py-1 rounded-full border text-xs font-black text-rose-500 border-rose-200 hover:bg-rose-50 disabled:opacity-60"
                              >
                                删除
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <button
                  onClick={refreshLuckPool}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-bold rounded-xl border border-emerald-100 bg-white/60 text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-60"
                  disabled={isRefreshing}
                >
                  {isRefreshing ? '刷新中...' : '刷新奖池'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default LuckModal;
