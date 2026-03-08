import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  authorityOptions,
  difficultyOptions,
  hostPresets,
  shopOptions,
  storyStartOptions,
  talentOptions,
  timeOptions,
  AuthorityOption,
  LocationOption,
  ShopOption,
  StoryStartOption,
  TalentOption,
  TimeOption,
} from '../data/initvarPresets';
import { luckPoolPresets, LuckPrizeOption } from '../data/luckPoolPresets';

type Difficulty = typeof difficultyOptions[number];
const talentTierOptions = ['全部', '仙', '天', '地', '玄', '黄', '凡'] as const;
type TalentTier = typeof talentTierOptions[number];
const authorityCategoryOptions = ['全部', '正常', '色情'] as const;
type AuthorityCategory = typeof authorityCategoryOptions[number];
const shopCategoryOrder = ['武器', '装备', '法宝', '丹药', '功法', '着装', '特殊', '阵符'] as const;
type ShopCategory = typeof shopCategoryOrder[number];

export interface Selections {
  difficulty: Difficulty | null;
  sexyMode: boolean;
  time: TimeOption | null;
  location: LocationOption | null;
  storyStart: StoryStartOption | null;
  hostId: string | null;
  talents: TalentOption[];
  authorities: AuthorityOption[];
  luckPools: Record<string, { highestIds: string[]; secondaryIds: string[] }>;
  shopItems: ShopOption[];
}

interface Props {
  onApplyStep: (step: number, selections: Selections) => void;
  onComplete: (selections: Selections) => void;
  onBack?: () => void;
}

const SetupWizard: React.FC<Props> = ({ onApplyStep, onComplete, onBack }) => {
  const [step, setStep] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [sexyMode, setSexyMode] = useState(false);
  const [time, setTime] = useState<TimeOption | null>(null);
  const [location, setLocation] = useState<LocationOption | null>(null);
  const [storyStartId, setStoryStartId] = useState<string | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [talentIds, setTalentIds] = useState<string[]>([]);
  const [authorityIds, setAuthorityIds] = useState<string[]>([]);
  const [shopIds, setShopIds] = useState<string[]>([]);
  const [luckPoolKey, setLuckPoolKey] = useState<'丙等卜算' | '乙等卜算' | '甲等卜算'>('丙等卜算');
  const [luckHighestIds, setLuckHighestIds] = useState<Record<string, string[]>>({
    丙等卜算: [],
    乙等卜算: [],
    甲等卜算: []
  });
  const [luckSecondaryIds, setLuckSecondaryIds] = useState<Record<string, string[]>>({
    丙等卜算: [],
    乙等卜算: [],
    甲等卜算: []
  });
  const [luckSelectMode, setLuckSelectMode] = useState<'highest' | 'secondary'>('highest');
  const [talentTier, setTalentTier] = useState<TalentTier>('全部');
  const [talentSort, setTalentSort] = useState<'desc' | 'asc'>('desc');
  const [authorityCategory, setAuthorityCategory] = useState<AuthorityCategory>('全部');
  const [shopSortByCategory, setShopSortByCategory] = useState<Record<string, 'desc' | 'asc'>>(
    () => Object.fromEntries(shopCategoryOrder.map(category => [category, 'desc']))
  );
  const [shopCategoryIdx, setShopCategoryIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const preserveScroll = () => {
    const el = scrollRef.current;
    const top = el?.scrollTop ?? 0;
    return () => {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = top;
        }
      });
    };
  };

  const selections = useMemo<Selections>(() => {
    const storyOptions = hostId ? (storyStartOptions[hostId] || []) : [];
    const storyStart = storyOptions.find(s => s.id === storyStartId) || null;
    return {
      difficulty,
      sexyMode,
      time,
      location,
      storyStart,
      hostId,
      talents: talentOptions.filter(t => talentIds.includes(t.id)),
      authorities: authorityOptions.filter(a => authorityIds.includes(a.id)),
      luckPools: {
        丙等卜算: { highestIds: luckHighestIds.丙等卜算, secondaryIds: luckSecondaryIds.丙等卜算 },
        乙等卜算: { highestIds: luckHighestIds.乙等卜算, secondaryIds: luckSecondaryIds.乙等卜算 },
        甲等卜算: { highestIds: luckHighestIds.甲等卜算, secondaryIds: luckSecondaryIds.甲等卜算 },
      },
      shopItems: shopOptions.filter(s => shopIds.includes(s.id)),
    };
  }, [difficulty, sexyMode, time, location, hostId, talentIds, authorityIds, shopIds, storyStartId, luckHighestIds, luckSecondaryIds]);

  const nextStep = () => {
    onApplyStep(step, selections);
    if (step >= 7) {
      onComplete(selections);
      return;
    }
    setStep(step + 1);
  };

  const prevStep = () => {
    if (step === 0) {
      onBack?.();
      return;
    }
    setStep(step - 1);
  };

  const toggleMulti = (id: string, list: string[], setList: (val: string[]) => void) => {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  };

  const tierOrder: Record<string, number> = { 仙: 6, 天: 5, 地: 4, 玄: 3, 黄: 2, 凡: 1 };
  const gradeOrder: Record<string, number> = { 上: 3, 中: 2, 下: 1 };
  const getTierKey = (rank: string) => {
    const key = rank?.[0] || '';
    return tierOrder[key] ? key : '';
  };
  const getGradeKey = (rank: string) => {
    if (rank?.includes('上品')) return '上';
    if (rank?.includes('中品')) return '中';
    if (rank?.includes('下品')) return '下';
    return '';
  };
  const compareByRank = (a: string, b: string, dir: 'asc' | 'desc') => {
    const direction = dir === 'asc' ? 1 : -1;
    const aTier = tierOrder[getTierKey(a)] || 0;
    const bTier = tierOrder[getTierKey(b)] || 0;
    if (aTier !== bTier) return (aTier - bTier) * direction;
    const aGrade = gradeOrder[getGradeKey(a)] || 0;
    const bGrade = gradeOrder[getGradeKey(b)] || 0;
    if (aGrade !== bGrade) return (aGrade - bGrade) * direction;
    return 0;
  };

  const filteredTalents = useMemo(() => {
    const base = talentOptions.map((t, idx) => ({ ...t, _idx: idx }));
    const filtered = talentTier === '全部'
      ? base
      : base.filter(t => getTierKey(t.品阶) === talentTier);
    const dir = talentSort === 'asc' ? 1 : -1;
    return filtered.sort((a, b) => {
      const aTier = tierOrder[getTierKey(a.品阶)] || 0;
      const bTier = tierOrder[getTierKey(b.品阶)] || 0;
      if (aTier !== bTier) return (aTier - bTier) * dir;
      const aGrade = gradeOrder[getGradeKey(a.品阶)] || 0;
      const bGrade = gradeOrder[getGradeKey(b.品阶)] || 0;
      if (aGrade !== bGrade) return (aGrade - bGrade) * dir;
      return a._idx - b._idx;
    });
  }, [talentTier, talentSort]);

  const filteredAuthorities = useMemo(() => {
    return authorityCategory === '全部'
      ? authorityOptions
      : authorityOptions.filter(a => a.分类 === authorityCategory);
  }, [authorityCategory]);

  const shopCategoryGroups = useMemo(() => {
    const bucket: Record<string, Array<ShopOption & { _idx: number }>> = {};
    shopOptions.forEach((item, idx) => {
      const category = item.分类 || '其他';
      if (!bucket[category]) bucket[category] = [];
      bucket[category].push({ ...item, _idx: idx });
    });

    const orderedCategories = [
      ...shopCategoryOrder.filter(category => bucket[category]?.length),
      ...Object.keys(bucket).filter(category => !shopCategoryOrder.includes(category as ShopCategory)).sort(),
    ];

    return orderedCategories.map(category => ({ category, items: bucket[category] || [] }));
  }, []);

  const shopCategoryList = useMemo(() => {
    return shopCategoryGroups.map(group => group.category);
  }, [shopCategoryGroups]);

  const currentShopCategory = shopCategoryList[shopCategoryIdx] || shopCategoryList[0] || '';
  const luckPoolItems = useMemo(() => {
    const pool = luckPoolPresets[luckPoolKey];
    if (!pool) return [];
    return (luckSelectMode === 'highest' ? pool.highest : pool.secondary) as LuckPrizeOption[];
  }, [luckPoolKey, luckSelectMode]);

  const currentLuckItems = useMemo(() => {
    return luckPoolItems.map((item, idx) => ({ ...item, _idx: idx }));
  }, [luckPoolItems]);
  const minLuckHighestCount = 1;
  const minLuckSecondaryCount = 5;
  const currentLuckHighestCount = (luckHighestIds[luckPoolKey] || []).length;
  const currentLuckSecondaryCount = (luckSecondaryIds[luckPoolKey] || []).length;
  const canSwitchLuckPool = currentLuckHighestCount >= minLuckHighestCount && currentLuckSecondaryCount >= minLuckSecondaryCount;
  const luckPoolOrder: Array<'丙等卜算' | '乙等卜算' | '甲等卜算'> = ['丙等卜算', '乙等卜算', '甲等卜算'];
  const allLuckPoolsComplete = luckPoolOrder.every(key => (luckHighestIds[key] || []).length >= minLuckHighestCount && (luckSecondaryIds[key] || []).length >= minLuckSecondaryCount);
  const getNextLuckPoolKey = (currentKey: '丙等卜算' | '乙等卜算' | '甲等卜算') => {
    const idx = luckPoolOrder.indexOf(currentKey);
    if (idx < 0 || idx >= luckPoolOrder.length - 1) return currentKey;
    return luckPoolOrder[idx + 1];
  };
  const tryAdvanceLuckPool = (currentKey: '丙等卜算' | '乙等卜算' | '甲等卜算') => {
    const nextKey = getNextLuckPoolKey(currentKey);
    if (nextKey !== currentKey) {
      setLuckPoolKey(nextKey);
      setLuckSelectMode('highest');
      return true;
    }
    return false;
  };
  const pickRandomLuckIds = (items: LuckPrizeOption[], count: number) => {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, Math.min(count, shuffled.length)).map(item => item.id);
  };
  const applyRandomLuckPools = () => {
    const restoreScroll = preserveScroll();
    const nextHighest: Record<string, string[]> = {};
    const nextSecondary: Record<string, string[]> = {};
    luckPoolOrder.forEach(poolKey => {
      const pool = luckPoolPresets[poolKey];
      if (!pool) {
        nextHighest[poolKey] = [];
        nextSecondary[poolKey] = [];
        return;
      }
      nextHighest[poolKey] = pickRandomLuckIds(pool.highest as LuckPrizeOption[], minLuckHighestCount);
      nextSecondary[poolKey] = pickRandomLuckIds(pool.secondary as LuckPrizeOption[], minLuckSecondaryCount);
    });
    setLuckHighestIds(prev => ({ ...prev, ...nextHighest }));
    setLuckSecondaryIds(prev => ({ ...prev, ...nextSecondary }));
    setLuckSelectMode('highest');
    restoreScroll();
  };
  const currentShopItems = useMemo(() => {
    const group = shopCategoryGroups.find(g => g.category === currentShopCategory);
    const dir = shopSortByCategory[currentShopCategory] || 'desc';
    const items = [...(group?.items || [])].sort((a, b) => {
      const rankCompare = compareByRank(a.品阶 || '', b.品阶 || '', dir);
      if (rankCompare !== 0) return rankCompare;
      return a._idx - b._idx;
    });
    return items;
  }, [currentShopCategory, shopCategoryGroups, shopSortByCategory]);

  const currentShopSelectedIds = useMemo(() => {
    if (!currentShopCategory) return [];
    return shopOptions
      .filter(item => item.分类 === currentShopCategory && shopIds.includes(item.id))
      .map(item => item.id);
  }, [currentShopCategory, shopIds]);
  const minShopSelectCount = 5;
  const isLastShopCategory = shopCategoryIdx >= shopCategoryList.length - 1;
  const canAdvanceShopCategory = currentShopCategory
    ? currentShopSelectedIds.length >= minShopSelectCount
    : true;

  const setShopIdsForCategory = (category: string, nextIds: string[]) => {
    const pool = shopOptions.filter(item => item.分类 === category);
    const poolIds = new Set(pool.map(item => item.id));
    setShopIds(prev => {
      const kept = prev.filter(id => !poolIds.has(id));
      return [...kept, ...nextIds];
    });
    const mergedIds = new Set([...shopIds.filter(id => !poolIds.has(id)), ...nextIds]);
    onApplyStep(7, { ...selections, shopItems: shopOptions.filter(s => mergedIds.has(s.id)) });
  };

  const applyRandomShopItems = (category: string) => {
    const restoreScroll = preserveScroll();
    const pool = shopOptions.filter(item => item.分类 === category);
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const picked = shuffled.slice(0, Math.min(8, shuffled.length));
    const pickedIds = picked.map(item => item.id);
    setShopIdsForCategory(category, pickedIds);
    restoreScroll();
  };

  const applyRandomShopItemsAll = () => {
    const restoreScroll = preserveScroll();
    const nextIds = new Set<string>();
    shopCategoryList.forEach(category => {
      const pool = shopOptions.filter(item => item.分类 === category);
      const shuffled = [...pool];
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const picked = shuffled.slice(0, Math.min(8, shuffled.length));
      picked.forEach(item => nextIds.add(item.id));
    });
    setShopIds([...nextIds]);
    onApplyStep(7, { ...selections, shopItems: shopOptions.filter(s => nextIds.has(s.id)) });
    restoreScroll();
  };

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
  }, [step, shopCategoryIdx]);




  const applyRandomAuthorities = () => {
    const restoreScroll = preserveScroll();
    const mustPickIds = ['autopilot', 'manifest'];
    const mustPick = authorityOptions.filter(item => mustPickIds.includes(item.id));
    const pool = authorityOptions.filter(item => !mustPickIds.includes(item.id));
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const randomPicked = shuffled.slice(0, Math.min(3, shuffled.length));
    const picked = [...mustPick, ...randomPicked];
    const pickedIds = picked.map(item => item.id);
    setAuthorityIds(pickedIds);
    onApplyStep(5, { ...selections, authorities: picked });
    restoreScroll();
  };

  return (
    <div className="fixed inset-0 z-[975] flex items-center justify-center bg-slate-200 text-slate-900">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 24%, rgba(6,78,59,0.45), transparent 58%), radial-gradient(circle at 82% 28%, rgba(13,116,107,0.4), transparent 60%), radial-gradient(circle at 50% 82%, rgba(100,116,139,0.65), transparent 52%)'
        }}
      />
      <div className="absolute inset-0 opacity-[0.14] bg-[radial-gradient(circle_at_1px_1px,_rgba(15,23,42,0.75)_1px,_transparent_0)] [background-size:18px_18px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-500/60 via-transparent to-slate-600/40" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-[5vw] inset-y-[6vh] rounded-[38px] border border-teal-200/45 shadow-[0_50px_140px_rgba(8,47,73,0.35)]" />
        <div className="absolute inset-x-[6.5vw] inset-y-[7.5vh] rounded-[32px] border border-teal-200/30" />
        <div className="absolute left-0 top-0 h-full w-[22vw] bg-gradient-to-r from-slate-500/80 via-slate-400/35 to-transparent" />
        <div className="absolute right-0 top-0 h-full w-[22vw] bg-gradient-to-l from-slate-500/80 via-slate-400/35 to-transparent" />
        <div className="absolute top-10 left-1/2 -translate-x-1/2 h-[2px] w-[70vw] bg-gradient-to-r from-transparent via-teal-300/70 to-transparent" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 h-[2px] w-[70vw] bg-gradient-to-r from-transparent via-teal-300/60 to-transparent" />
      </div>
      <div className="relative w-[94vw] max-w-[980px] rounded-[36px] border border-teal-200/40 bg-slate-900/70 text-slate-100 shadow-[0_40px_120px_rgba(8,47,73,0.45)]">
        <div className="absolute inset-0 rounded-[36px] pointer-events-none">
          <div className="absolute inset-x-10 top-8 h-[2px] bg-gradient-to-r from-transparent via-teal-300/60 to-transparent" />
          <div className="absolute inset-x-10 bottom-8 h-[2px] bg-gradient-to-r from-transparent via-teal-300/60 to-transparent" />
        </div>

        <div className="relative z-10 px-10 py-10">
          <div className="flex items-center justify-between mb-6">
            <div className="text-lg tracking-[0.45em] text-teal-200">开局设定</div>
            <div className="text-sm text-slate-300">步骤 {step + 1} / 8</div>
          </div>

          <div
            ref={scrollRef}
            className="max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-teal-400/40 scrollbar-track-transparent"
          >
            {step === 0 && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div>
                  <div className="text-xl text-teal-100 mb-4">难度选择</div>
                  <div className="flex flex-col gap-4">
                    {difficultyOptions.map(opt => (
                      <button
                        key={opt}
                        className={`rounded-2xl border px-6 py-4 text-lg tracking-wide transition-colors ${difficulty === opt
                          ? 'border-teal-200 bg-teal-500/20 text-teal-100'
                          : 'border-slate-500/60 bg-slate-800/50 text-slate-200 hover:border-teal-200/70'
                          }`}
                        onClick={() => setDifficulty(opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xl text-teal-100 mb-4">色色模式</div>
                  <div className="flex flex-col gap-3">
                    <button
                      className={`rounded-2xl border px-6 py-4 text-lg tracking-wide transition-colors ${sexyMode
                        ? 'border-teal-200 bg-teal-500/20 text-teal-100'
                        : 'border-slate-500/60 bg-slate-800/50 text-slate-200 hover:border-teal-200/70'
                        }`}
                      onClick={() => setSexyMode(!sexyMode)}
                    >
                      色色
                    </button>
                    <div className="text-xs text-slate-400">开启后，宿主将更多遭遇事件。同时需要开启预设中的色色剧情。</div>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div>
                  <div className="text-xl text-teal-100 mb-4">时间选择</div>
                  <div className="flex flex-col gap-4">
                    {timeOptions.map(opt => (
                      <button
                        key={opt.id}
                        className={`rounded-2xl border px-6 py-4 text-left transition-colors ${time?.id === opt.id
                          ? 'border-teal-200 bg-teal-500/20'
                          : 'border-slate-500/60 bg-slate-800/50 hover:border-teal-200/70'
                          }`}
                        onClick={() => setTime(opt)}
                      >
                        <div className="text-lg text-teal-100">{opt.label}</div>
                        <div className="text-sm text-slate-300">{opt.subtitle}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div>
                  <div className="text-xl text-teal-100 mb-4">宿主选择</div>
                  <div className="flex flex-col gap-4">
                    {hostPresets.map(host => (
                      <button
                        key={host.id}
                        className={`rounded-2xl border px-6 py-4 text-left transition-colors ${hostId === host.id
                          ? 'border-teal-200 bg-teal-500/20'
                          : 'border-slate-500/60 bg-slate-800/50 hover:border-teal-200/70'
                          }`}
                        onClick={() => setHostId(host.id)}
                      >
                        <div className="text-lg text-teal-100">{host.name}</div>
                        <div className="text-sm text-slate-300">{host.summary}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div>
                  <div className="text-xl text-teal-100 mb-4">剧情开场</div>
                  <div className="flex flex-col gap-4">
                    {(hostId ? storyStartOptions[hostId] : []).map(opt => (
                      <button
                        key={opt.id}
                        className={`rounded-2xl border px-6 py-4 text-left transition-colors ${storyStartId === opt.id
                          ? 'border-teal-200 bg-teal-500/20'
                          : 'border-slate-500/60 bg-slate-800/50 hover:border-teal-200/70'
                          }`}
                        onClick={() => {
                          setStoryStartId(opt.id);
                          setLocation(opt.location);
                        }}
                      >
                        <div className="text-lg text-teal-100">{opt.title}</div>
                        <div className="text-sm text-slate-300">{opt.hook}</div>
                        <div className="text-xs text-slate-400">{opt.location.大域} · {opt.location.区域} · {opt.location.地点} · {opt.location.具体场景}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div>
                  <div className="text-xl text-teal-100 mb-4">额外天赋</div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {talentTierOptions.map(tier => (
                      <button
                        key={tier}
                        className={`rounded-full border px-3 py-1 text-xs tracking-wide transition-colors ${talentTier === tier
                          ? 'border-teal-200 bg-teal-500/20 text-teal-100'
                          : 'border-slate-500/60 bg-slate-800/50 text-slate-200 hover:border-teal-200/70'
                          }`}
                        onClick={() => setTalentTier(tier)}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-6">
                    <span className="text-xs text-slate-400">排序</span>
                    <button
                      className={`rounded-full border px-3 py-1 text-xs tracking-wide transition-colors ${talentSort === 'desc'
                        ? 'border-teal-200 bg-teal-500/20 text-teal-100'
                        : 'border-slate-500/60 bg-slate-800/50 text-slate-200 hover:border-teal-200/70'
                        }`}
                      onClick={() => setTalentSort('desc')}
                    >
                      品阶高→低
                    </button>
                    <button
                      className={`rounded-full border px-3 py-1 text-xs tracking-wide transition-colors ${talentSort === 'asc'
                        ? 'border-teal-200 bg-teal-500/20 text-teal-100'
                        : 'border-slate-500/60 bg-slate-800/50 text-slate-200 hover:border-teal-200/70'
                        }`}
                      onClick={() => setTalentSort('asc')}
                    >
                      品阶低→高
                    </button>
                  </div>
                  <div className="flex flex-col gap-4">
                    {filteredTalents.map(t => (
                      <button
                        key={t.id}
                        className={`rounded-2xl border px-6 py-4 text-left transition-colors ${talentIds.includes(t.id)
                          ? 'border-teal-200 bg-teal-500/20'
                          : 'border-slate-500/60 bg-slate-800/50 hover:border-teal-200/70'
                          }`}
                        onClick={() => toggleMulti(t.id, talentIds, setTalentIds)}
                      >
                        <div className="flex items-baseline gap-2">
                          <div className="text-lg text-teal-100">{t.名称}</div>
                          <span className="inline-flex items-center rounded-full border border-teal-200/50 bg-teal-500/10 px-2 py-0.5 text-[11px] text-teal-200">
                            {t.品阶}
                          </span>
                        </div>
                        <div className="text-sm text-slate-300">{t.描述}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div>
                  <div className="text-xl text-teal-100 mb-4">仙玉权柄</div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {authorityCategoryOptions.map(cat => (
                      <button
                        key={cat}
                        className={`rounded-full border px-3 py-1 text-xs tracking-wide transition-colors ${authorityCategory === cat
                          ? 'border-teal-200 bg-teal-500/20 text-teal-100'
                          : 'border-slate-500/60 bg-slate-800/50 text-slate-200 hover:border-teal-200/70'
                          }`}
                        onClick={() => setAuthorityCategory(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                      <button
                        className="ml-auto rounded-full border px-3 py-1 text-xs tracking-wide transition-colors border-amber-200/70 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
                        onClick={applyRandomAuthorities}
                      >
                        2+3随机
                      </button>
                  </div>
                <div className="flex flex-col gap-4">
                  {filteredAuthorities.map(a => (
                      <button
                        key={a.id}
                        className={`rounded-2xl border px-5 py-4 text-left transition-colors ${authorityIds.includes(a.id)
                          ? 'border-teal-200 bg-teal-500/20'
                          : 'border-slate-500/60 bg-slate-800/50 hover:border-teal-200/70'
                          }`}
                        onClick={() => toggleMulti(a.id, authorityIds, setAuthorityIds)}
                      >
                        <div className="text-base text-teal-100">{a.名称}</div>
                        <div className="text-xs text-slate-300">{a.描述}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div>
                  <div className="text-xl text-teal-100 mb-4">天运卜算奖池</div>
                  <div className="flex flex-col gap-6 md:flex-row">
                    <div className="w-full shrink-0 space-y-4 md:w-40">
                      <div className="text-xs text-slate-400">奖池等级</div>
                      {luckPoolOrder.map((poolKey, idx) => {
                        const poolHighest = (luckHighestIds[poolKey] || []).length;
                        const poolSecondary = (luckSecondaryIds[poolKey] || []).length;
                        const poolReady = poolHighest >= minLuckHighestCount && poolSecondary >= minLuckSecondaryCount;
                        const prevReady = idx === 0
                          ? true
                          : (luckHighestIds[luckPoolOrder[idx - 1]] || []).length >= minLuckHighestCount
                          && (luckSecondaryIds[luckPoolOrder[idx - 1]] || []).length >= minLuckSecondaryCount;
                        const disabled = !prevReady;
                        return (
                          <button
                            key={poolKey}
                            className={`w-full rounded-2xl border px-4 py-3 text-sm tracking-wide transition-colors ${luckPoolKey === poolKey
                              ? 'border-teal-200 bg-teal-500/20 text-teal-100'
                              : disabled
                                ? 'border-slate-600/40 bg-slate-900/40 text-slate-500 cursor-not-allowed'
                                : 'border-slate-500/60 bg-slate-800/50 text-slate-200 hover:border-teal-200/70'
                              }`}
                            onClick={() => {
                              if (disabled) return;
                              setLuckPoolKey(poolKey);
                            }}
                          >
                            <div>{poolKey}</div>
                            <div className="mt-1 text-[11px] text-slate-400">
                              {poolHighest}/{minLuckHighestCount} · {poolSecondary}/{minLuckSecondaryCount}
                              {poolReady ? ' ✓' : ''}
                            </div>
                          </button>
                        );
                      })}
                      <button
                        className="w-full rounded-2xl border px-4 py-3 text-sm tracking-wide transition-colors border-amber-200/70 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
                        onClick={applyRandomLuckPools}
                      >
                        一键随机
                      </button>
                      <div className="pt-2 text-xs text-slate-400 space-y-1">
                        <div>最高级：{currentLuckHighestCount} / {minLuckHighestCount}</div>
                        <div>次高级：{currentLuckSecondaryCount} / {minLuckSecondaryCount}</div>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="text-sm text-teal-100">{luckPoolKey}</div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          className={`rounded-2xl border px-4 py-2 text-sm tracking-wide transition-colors ${luckSelectMode === 'highest'
                            ? 'border-amber-200 bg-amber-500/20 text-amber-100'
                            : 'border-slate-500/60 bg-slate-800/50 text-slate-200 hover:border-amber-200/70'
                            }`}
                          onClick={() => setLuckSelectMode('highest')}
                        >
                          最高级奖品
                        </button>
                        <button
                          className={`rounded-2xl border px-4 py-2 text-sm tracking-wide transition-colors ${luckSelectMode === 'secondary'
                            ? 'border-emerald-200 bg-emerald-500/20 text-emerald-100'
                            : 'border-slate-500/60 bg-slate-800/50 text-slate-200 hover:border-emerald-200/70'
                            }`}
                          onClick={() => setLuckSelectMode('secondary')}
                        >
                          次高级奖品
                        </button>
                      </div>

                      <div className="flex flex-col gap-4">
                        {currentLuckItems.map(s => {
                          const isHighest = (luckHighestIds[luckPoolKey] || []).includes(s.id);
                          const isSecondary = (luckSecondaryIds[luckPoolKey] || []).includes(s.id);
                          const active = luckSelectMode === 'highest' ? isHighest : isSecondary;
                          return (
                            <button
                              key={s.id}
                              className={`w-full rounded-2xl border px-6 py-4 text-left transition-colors ${active
                                ? 'border-teal-200 bg-teal-500/20'
                                : 'border-slate-500/60 bg-slate-800/50 hover:border-teal-200/70'
                                }`}
                            onClick={() => {
                              if (luckSelectMode === 'highest') {
                                const currentSecondaryCount = (luckSecondaryIds[luckPoolKey] || []).length;
                                setLuckHighestIds(prev => {
                                  const list = prev[luckPoolKey] || [];
                                  const next = list.includes(s.id) ? [] : [s.id];
                                  const nextHighestCount = next.length;
                                  if (nextHighestCount >= minLuckHighestCount) {
                                    if (currentSecondaryCount >= minLuckSecondaryCount) {
                                      tryAdvanceLuckPool(luckPoolKey);
                                    } else {
                                      setLuckSelectMode('secondary');
                                    }
                                  }
                                  return { ...prev, [luckPoolKey]: next };
                                });
                              } else {
                                const currentHighestCount = (luckHighestIds[luckPoolKey] || []).length;
                                setLuckSecondaryIds(prev => {
                                  const list = prev[luckPoolKey] || [];
                                  const next = list.includes(s.id) ? list.filter(id => id !== s.id) : [...list, s.id];
                                  const nextSecondaryCount = next.length;
                                  if (nextSecondaryCount >= minLuckSecondaryCount) {
                                    if (currentHighestCount >= minLuckHighestCount) {
                                      tryAdvanceLuckPool(luckPoolKey);
                                    } else {
                                      setLuckSelectMode('highest');
                                    }
                                  }
                                  return { ...prev, [luckPoolKey]: next };
                                });
                              }
                            }}
                          >
                              <div className="flex items-baseline gap-2">
                                <div className="text-base text-teal-100">{s.名称}</div>
                                <span className="inline-flex items-center rounded-full border border-teal-200/50 bg-teal-500/10 px-2 py-0.5 text-[11px] text-teal-200">
                                  {s.品阶}
                                </span>
                              </div>
                              <div className="text-xs text-slate-300">{s.描述}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div>
                  <div className="text-xl text-teal-100 mb-4">初始商店</div>
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-base text-teal-100">
                        {currentShopCategory || '暂无分类'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {shopCategoryList.length ? `${shopCategoryIdx + 1} / ${shopCategoryList.length}` : ''}
                      </div>
                      <div className="text-xs text-slate-400">
                        已选 {currentShopSelectedIds.length} 项 / 至少 {minShopSelectCount} 项
                      </div>
                    </div>

                    {currentShopCategory && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-400">排序</span>
                        <button
                          className={`rounded-full border px-3 py-1 text-xs tracking-wide transition-colors ${shopSortByCategory[currentShopCategory] === 'desc'
                            ? 'border-teal-200 bg-teal-500/20 text-teal-100'
                            : 'border-slate-500/60 bg-slate-800/50 text-slate-200 hover:border-teal-200/70'
                            }`}
                          onClick={() => setShopSortByCategory(prev => ({ ...prev, [currentShopCategory]: 'desc' }))}
                        >
                          品阶高→低
                        </button>
                        <button
                          className={`rounded-full border px-3 py-1 text-xs tracking-wide transition-colors ${shopSortByCategory[currentShopCategory] === 'asc'
                            ? 'border-teal-200 bg-teal-500/20 text-teal-100'
                            : 'border-slate-500/60 bg-slate-800/50 text-slate-200 hover:border-teal-200/70'
                            }`}
                          onClick={() => setShopSortByCategory(prev => ({ ...prev, [currentShopCategory]: 'asc' }))}
                        >
                          品阶低→高
                        </button>
                        <button
                          className="ml-auto rounded-full border px-3 py-1 text-xs tracking-wide transition-colors border-amber-200/70 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
                          onClick={() => applyRandomShopItems(currentShopCategory)}
                        >
                          随机 8 个
                        </button>
                        <button
                          className="rounded-full border px-3 py-1 text-xs tracking-wide transition-colors border-amber-200/70 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
                          onClick={applyRandomShopItemsAll}
                        >
                          一键选择
                        </button>
                        
                      </div>
                    )}

                    <div className="flex flex-col gap-4">
                      {currentShopItems.map(s => (
                        <button
                          key={s.id}
                          className={`rounded-2xl border px-6 py-4 text-left transition-colors ${shopIds.includes(s.id)
                            ? 'border-teal-200 bg-teal-500/20'
                            : 'border-slate-500/60 bg-slate-800/50 hover:border-teal-200/70'
                            }`}
                          onClick={() => toggleMulti(s.id, shopIds, setShopIds)}
                        >
                          <div className="flex items-baseline gap-2">
                            <div className="text-base text-teal-100">{s.名称}</div>
                            <span className="inline-flex items-center rounded-full border border-teal-200/50 bg-teal-500/10 px-2 py-0.5 text-[11px] text-teal-200">
                              {s.品阶}
                            </span>
                          </div>
                          <div className="text-xs text-slate-300">{s.描述}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-10 flex items-center justify-between">
            <button
              className="px-6 py-3 rounded-full border border-slate-500/60 text-slate-200 hover:border-teal-200/70"
              onClick={prevStep}
            >
              {step === 0 ? '返回标题' : '上一步'}
            </button>
            <button
              className={`px-10 py-3 rounded-full border transition-colors ${((step === 0 && !difficulty) || (step === 1 && !time) || (step === 2 && !hostId) || (step === 3 && (!storyStartId || !location)) || (step === 5 && authorityIds.length === 0) || (step === 6 && !allLuckPoolsComplete) || (step === 7 && !canAdvanceShopCategory))
                ? 'border-slate-500/50 text-slate-400 cursor-not-allowed'
                : 'border-teal-200 bg-teal-500/20 text-teal-100 hover:bg-teal-500/30'
                }`}
              onClick={() => {
                if (step === 0 && !difficulty) return;
                if (step === 1 && !time) return;
                if (step === 2 && !hostId) return;
                if (step === 3 && (!storyStartId || !location)) return;
                if (step === 5 && authorityIds.length === 0) return;
                if (step === 6 && !allLuckPoolsComplete) return;
                if (step === 7) {
                  if (!canAdvanceShopCategory) return;
                  if (!isLastShopCategory) {
                    onApplyStep(7, selections);
                    setShopCategoryIdx(idx => Math.min(idx + 1, shopCategoryList.length - 1));
                    return;
                  }
                }
                nextStep();
              }}
            >
            {step === 7 && !isLastShopCategory ? '下一分类' : step >= 7 ? '进入正文' : '下一步'}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};

  


export default SetupWizard;


