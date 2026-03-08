/**
 * 变量读取工具
 * 统一从最新消息楼层变量读取游戏数据
 */

// 全局函数声明（由酒馆助手提供）
declare function getVariables(option: { type: 'message'; message_id: number | 'latest' }): Record<string, any>;
declare function waitGlobalInitialized<T>(global: 'Mvu' | string): Promise<T>;
declare function getChatMessages(range: string | number, options?: { role?: 'user' | 'assistant' | 'system' }): Array<{ message_id: number; role: string; data?: Record<string, any> }>;
declare function getLastMessageId(): number;

// MVU 变量框架声明
declare const Mvu: {
  getMvuData: (options: { type: 'message' | 'chat' | 'character' | 'global'; message_id?: number | 'latest' }) => {
    stat_data: Record<string, any>;
    display_data: Record<string, any>;
    delta_data: Record<string, any>;
  };
};

// MVU 初始化状态
let mvuInitialized: boolean = false;
let mvuInitPromise: Promise<void> | null = null;

type Value = string | number | boolean | Record<string, any> | Array<any> | null | undefined;

/**
 * 从嵌套对象中提取值，支持 MVU 格式 [值, "描述"]
 */
function pick<T extends Value>(obj: any, path: string, fallback: T): T {
  if (!obj) return fallback;
  const parts = path.split('.');
  let cur: any = obj;
  for (const p of parts) {
    if (cur == null) return fallback;
    // 处理 MVU 格式 [值, "描述"]
    if (Array.isArray(cur) && cur.length > 0) {
      cur = cur[0];
    }
    cur = cur[p];
  }
  // 如果最终值是 MVU 格式，返回第一个元素（实际值）
  if (Array.isArray(cur) && cur.length > 0) return (cur[0] as T) ?? fallback;
  return (cur as T) ?? fallback;
}

/**
 * 确保 MVU 已初始化
 */
async function ensureMvuInitialized(): Promise<void> {
  if (mvuInitialized) {
    return;
  }

  if (mvuInitPromise) {
    return mvuInitPromise;
  }

  mvuInitPromise = (async () => {
    try {
      await waitGlobalInitialized('Mvu');
      mvuInitialized = true;
      console.log('✅ MVU 初始化完成');
    } catch (error) {
      console.warn('⚠️ 等待 MVU 初始化失败:', error);
      // 即使失败也标记为已尝试，避免无限等待
      mvuInitialized = true;
    }
  })();

  return mvuInitPromise;
}

/**
 * 从最新消息楼层变量读取 MVU 数据（优先读取最新楼层，如果不存在则读取0层）
 */
/**
 * 检查 stat_data 是否有实际内容（不是空对象）
 */
function hasStatDataContent(stat_data: any): boolean {
  if (!stat_data || typeof stat_data !== 'object') {
    return false;
  }
  // 检查是否有任何键（排除空对象）
  return Object.keys(stat_data).length > 0;
}

async function getGameMvuData(): Promise<{ stat_data: Record<string, any>; display_data?: Record<string, any> }> {
  // 确保 MVU 已初始化
  await ensureMvuInitialized();

  // 优先从最新的 assistant 消息读取（与页面加载时的方法一致）
  try {
    const assistantMessages = getChatMessages(-1, { role: 'assistant' });
    if (assistantMessages && assistantMessages.length > 0) {
      const latestAssistant = assistantMessages[assistantMessages.length - 1];
      const messageId = latestAssistant.message_id;
      
      // 尝试从该 assistant 消息读取 MVU 数据
      try {
        const mvuData = Mvu.getMvuData({ type: 'message', message_id: messageId });
        if (mvuData && mvuData.stat_data && hasStatDataContent(mvuData.stat_data)) {
          console.log(`✅ 从最新 assistant 消息（ID: ${messageId}）读取 MVU 数据`);
          return mvuData;
        }
      } catch (err) {
        console.warn(`⚠️ 从 assistant 消息 ${messageId} 读取 MVU 数据失败，尝试其他方式`, err);
      }

      // 尝试从该 assistant 消息的 data 字段读取
      if (latestAssistant.data && latestAssistant.data.stat_data && hasStatDataContent(latestAssistant.data.stat_data)) {
        console.log(`✅ 从最新 assistant 消息（ID: ${messageId}）的 data 字段读取变量数据`);
        return {
          stat_data: latestAssistant.data.stat_data || {},
          display_data: latestAssistant.data?.display_data,
        };
      }
    }
  } catch (err) {
    console.warn('⚠️ 获取最新 assistant 消息失败，尝试其他方式', err);
  }

  // 退化：使用 Mvu.getMvuData 读取最新楼层变量
  try {
    const mvuData = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
    // 确保 stat_data 存在且有实际内容（不是空对象）
    if (mvuData && mvuData.stat_data && hasStatDataContent(mvuData.stat_data)) {
      console.log('✅ 从最新楼层读取 MVU 数据');
      return mvuData;
    } else {
      console.warn('⚠️ 最新楼层的 stat_data 为空或不存在，尝试其他方式');
    }
  } catch (err) {
    console.warn('⚠️ Mvu.getMvuData(latest) 失败，尝试从 getVariables 读取', err);
  }

  // 退化：使用 getVariables 读取最新楼层变量
  try {
    const variables = getVariables({ type: 'message', message_id: 'latest' });
    // 确保 stat_data 存在且有实际内容
    if (variables && variables.stat_data && hasStatDataContent(variables.stat_data)) {
      console.log('✅ 从最新楼层读取变量数据（通过 getVariables）');
      return {
        stat_data: variables.stat_data || {},
        display_data: variables?.display_data,
      };
    } else {
      console.warn('⚠️ 最新楼层的变量 stat_data 为空或不存在');
    }
  } catch (err) {
    console.warn('⚠️ 无法获取最新楼层变量，尝试读取0层', err);
  }

  // 如果最新楼层没有数据，尝试读取0层（用于初始化数据）
  try {
    const mvuData = Mvu.getMvuData({ type: 'message', message_id: 0 });
    if (mvuData && mvuData.stat_data && hasStatDataContent(mvuData.stat_data)) {
      console.log('✅ 从0层读取 MVU 数据（最新楼层无数据）');
      return mvuData;
    } else {
      console.warn('⚠️ 0层的 stat_data 为空或不存在');
    }
  } catch (err) {
    console.warn('⚠️ Mvu.getMvuData(0) 失败', err);
  }

  try {
    const variables = getVariables({ type: 'message', message_id: 0 });
    if (variables && variables.stat_data && hasStatDataContent(variables.stat_data)) {
      console.log('✅ 从0层读取变量数据（通过 getVariables）');
      return {
        stat_data: variables.stat_data || {},
        display_data: variables?.display_data,
      };
    } else {
      console.warn('⚠️ 0层的变量 stat_data 为空或不存在');
    }
  } catch (err) {
    console.warn('⚠️ 无法获取0层变量，返回空对象', err);
  }

  console.warn('⚠️ 无法获取任何楼层的数据，返回空对象');
  return { stat_data: {} };
}

export interface GameData {
  innName: string;
  currentWorld: string;
  businessStatus: string;
  popularity: number;
  occupancy: number;
  innLaw: string;
  currentLaw: { 法则名: string; 法则效果: string } | null;
  lawList: Array<{ 法则名: string; 法则效果: string }>;
  currentAccessMode: { 模式名称: string; 条件描述: string } | null;
  accessModeList: Array<{ 模式名称: string; 条件描述: string }>;
  innAppearance: string;
  cognitiveEffect: string;
  gold: number;
  reputation: number;
  materials: number;
  day: number;
  currentTime: string;
  facilities: Array<{ 名称: string; 等级: number; 当前等级描述: string }>;
  guests: Array<any>;
  staff: Array<any>;
}

/**
 * 从0层消息楼层变量读取游戏数据（stat_data 为主），用于界面展示
 */
export async function readGameData(): Promise<GameData> {
  const m = await getGameMvuData();
  const stat = m?.stat_data || {};

  const innName = pick(stat, '旅店.名称', '多次元便携旅店');
  const currentWorld = pick(stat, '旅店.当前世界.世界名', '艾尔利亚大陆');
  const businessStatus = pick(stat, '旅店.营业状态', '营业中');
  const popularity = pick(stat, '旅店.受欢迎度', 20);
  const occupancy = pick(stat, '旅店.入住率', 0);

  // 处理法则列表（对象格式，以法则名为 key）
  let lawList: Array<{ 法则名: string; 法则效果: string }> = [];
  const lawsListRaw = pick(stat, '旅店.旅馆法则.法则列表', {});
  if (typeof lawsListRaw === 'object' && lawsListRaw !== null && !Array.isArray(lawsListRaw)) {
    // 对象格式：{ "禁魔": { "法则效果": "..." }, ... }
    lawList = Object.entries(lawsListRaw).map(([法则名, value]) => {
      const lawValue = value as any;
      return {
        法则名: 法则名,
        法则效果: (lawValue && typeof lawValue === 'object' && lawValue.法则效果) || '',
      };
    });
  } else if (Array.isArray(lawsListRaw)) {
    // 兼容旧格式：数组格式
    lawList = lawsListRaw.map((law: any) => {
      if (typeof law === 'object' && law !== null) {
        return {
          法则名: law.法则名 || '',
          法则效果: law.法则效果 || '',
        };
      }
      return { 法则名: '', 法则效果: '' };
    });
  }

  // 处理当前法则
  const currentLawRaw = pick(stat, '旅店.旅馆法则.当前法则', null);
  let currentLaw: { 法则名: string; 法则效果: string } | null = null;
  if (currentLawRaw && typeof currentLawRaw === 'object' && !Array.isArray(currentLawRaw)) {
    // 对象格式：{ "法则名": "...", "法则效果": "..." }
    currentLaw = {
      法则名: (currentLawRaw as any).法则名 || '',
      法则效果: (currentLawRaw as any).法则效果 || '',
    };
  } else if (typeof currentLawRaw === 'string') {
    // 兼容旧格式：只有法则名
    const lawName = currentLawRaw;
    const lawEffect =
      lawsListRaw && typeof lawsListRaw === 'object' && !Array.isArray(lawsListRaw)
        ? (lawsListRaw as any)[lawName]?.法则效果 || ''
        : '';
    currentLaw = { 法则名: lawName, 法则效果: lawEffect };
  }

  // 处理当前准入条件
  const currentAccessModeRaw: any = pick(stat, '旅店.准入条件.当前准入条件', null);
  let currentAccessMode: { 模式名称: string; 条件描述: string } | null = null;
  if (currentAccessModeRaw) {
    let modeObj: any = currentAccessModeRaw;
    // 处理 MVU 格式 [值, "描述"]
    if (Array.isArray(currentAccessModeRaw)) {
      if (currentAccessModeRaw.length > 0) {
        modeObj = currentAccessModeRaw[0];
      }
    }
    if (modeObj && typeof modeObj === 'object' && !Array.isArray(modeObj)) {
      currentAccessMode = {
        模式名称: modeObj.模式名称 || '',
        条件描述: modeObj.条件描述 || '',
      };
    }
  }

  // 处理准入条件列表（对象格式，以模式名称为 key）
  let accessModeList: Array<{ 模式名称: string; 条件描述: string }> = [];
  const accessModeListRaw = pick(stat, '旅店.准入条件.准入条件列表', {});
  if (typeof accessModeListRaw === 'object' && accessModeListRaw !== null && !Array.isArray(accessModeListRaw)) {
    // 对象格式：{ "实体显现": { "条件描述": "..." }, ... }
    accessModeList = Object.entries(accessModeListRaw).map(([模式名称, value]) => {
      const modeValue = value as any;
      return {
        模式名称: 模式名称,
        条件描述: (modeValue && typeof modeValue === 'object' && modeValue.条件描述) || '',
      };
    });
  } else if (Array.isArray(accessModeListRaw)) {
    // 兼容旧格式：数组格式
    let accessModeListValue: any = accessModeListRaw;
    if (Array.isArray(accessModeListRaw) && accessModeListRaw.length > 0 && Array.isArray(accessModeListRaw[0])) {
      accessModeListValue = accessModeListRaw[0];
    }
    if (Array.isArray(accessModeListValue)) {
      accessModeList = accessModeListValue.map((mode: any) => {
        if (typeof mode === 'object' && mode !== null) {
          return {
            模式名称: mode.模式名称 || '',
            条件描述: mode.条件描述 || '',
          };
        }
        return { 模式名称: '', 条件描述: '' };
      });
    }
  }

  // 读取旅店外观描述
  const innAppearanceRaw: any = pick(stat, '旅店.外观描述', '');
  let innAppearance = '';
  if (typeof innAppearanceRaw === 'string') {
    innAppearance = innAppearanceRaw;
  } else if (Array.isArray(innAppearanceRaw)) {
    if (innAppearanceRaw.length > 0) {
      innAppearance = innAppearanceRaw[0] || '';
    }
  }
  // 如果没有外观描述，使用默认值
  if (!innAppearance) {
    innAppearance = '炉火温暖地噼啪作响，邀请着来自各个维度的疲惫旅人。空气中弥漫着烤肉的香味和臭氧的气息。';
  }

  // 读取认知修正效果
  const cognitiveEffectRaw: any = pick(stat, '旅店.认知修正效果', '');
  let cognitiveEffect = '';
  if (typeof cognitiveEffectRaw === 'string') {
    cognitiveEffect = cognitiveEffectRaw;
  } else if (Array.isArray(cognitiveEffectRaw)) {
    if (cognitiveEffectRaw.length > 0) {
      cognitiveEffect = cognitiveEffectRaw[0] || '';
    }
  }

  const gold = pick(stat, '资源.金币', 0);
  const reputation = pick(stat, '资源.声望', 0);
  const materials = pick(stat, '资源.建材', 0);

  const day = pick(stat, '时间.天数', 1);
  const currentTime = pick(stat, '时间.当前时间', '09:00');

  // 处理设施数据（对象格式，以设施名称为 key）
  // 直接访问 stat.设施.设施列表，因为 pick 函数可能无法正确处理嵌套对象
  let facilitiesListRaw: any = null;
  if (stat.设施 && stat.设施.设施列表) {
    // 处理 MVU 格式：如果 设施列表 是 [值, "描述"] 格式，取第一个元素
    if (Array.isArray(stat.设施.设施列表) && stat.设施.设施列表.length > 0) {
      facilitiesListRaw = stat.设施.设施列表[0];
    } else {
      facilitiesListRaw = stat.设施.设施列表;
    }
  }

  console.log('📋 读取设施数据:', {
    facilitiesListRaw,
    type: typeof facilitiesListRaw,
    isArray: Array.isArray(facilitiesListRaw),
    isObject: typeof facilitiesListRaw === 'object' && facilitiesListRaw !== null,
    stat_设施: stat.设施,
    stat_设施_设施列表: stat.设施?.设施列表,
  });

  let facilities: Array<{ 名称: string; 等级: number; 当前等级描述: string }> = [];
  if (typeof facilitiesListRaw === 'object' && facilitiesListRaw !== null && !Array.isArray(facilitiesListRaw)) {
    // 对象格式：{ "客房": { "名称": "客房", ... }, ... }
    facilities = Object.entries(facilitiesListRaw)
      .map(([, facilityValue]: [string, any]) => {
        // 处理 MVU 格式：如果 facilityValue 是 [值, "描述"] 格式，取第一个元素
        let facility = facilityValue;
        if (Array.isArray(facilityValue) && facilityValue.length > 0) {
          facility = facilityValue[0];
        }
        // 如果 facility 是对象且有名称属性，返回处理后的对象
        if (facility && typeof facility === 'object' && facility.名称) {
          return {
            名称: facility.名称 || '',
            等级: facility.等级 || 1,
            当前等级描述: facility.当前等级描述 || '',
          };
        }
        return null;
      })
      .filter((fac: any) => fac !== null);
    console.log('✅ 处理后的设施数组:', facilities);
  } else if (Array.isArray(facilitiesListRaw)) {
    // 兼容旧格式：数组格式
    facilities = facilitiesListRaw
      .map((fac: any) => {
        if (typeof fac === 'object' && fac !== null) {
          return {
            名称: fac.名称 || '',
            等级: fac.等级 || 1,
            当前等级描述: fac.当前等级描述 || '',
          };
        }
        return null;
      })
      .filter((fac: any) => fac !== null && fac.名称 !== '');
    console.log('✅ 使用数组格式的设施数据:', facilities);
  } else {
    console.warn('⚠️ 设施数据格式不正确:', facilitiesListRaw);
  }

  // 处理客人数据（对象格式，以客人名称为 key）
  // 直接访问 stat.客人.客人列表，因为 pick 函数可能无法正确处理嵌套对象
  let guestsListRaw: any = null;
  if (stat.客人 && stat.客人.客人列表) {
    // 处理 MVU 格式：如果 客人列表 是 [值, "描述"] 格式，取第一个元素
    if (Array.isArray(stat.客人.客人列表) && stat.客人.客人列表.length > 0) {
      guestsListRaw = stat.客人.客人列表[0];
    } else {
      guestsListRaw = stat.客人.客人列表;
    }
  }

  console.log('📋 读取客人数据:', {
    guestsListRaw,
    type: typeof guestsListRaw,
    isArray: Array.isArray(guestsListRaw),
    isObject: typeof guestsListRaw === 'object' && guestsListRaw !== null,
    stat_客人: stat.客人,
    stat_客人_客人列表: stat.客人?.客人列表,
  });

  let guests: Array<any> = [];
  if (typeof guestsListRaw === 'object' && guestsListRaw !== null && !Array.isArray(guestsListRaw)) {
    // 对象格式：{ "卢卡斯": { "名称": "卢卡斯", ... }, ... }
    guests = Object.entries(guestsListRaw)
      .map(([, guestValue]: [string, any]) => {
        // 处理 MVU 格式：如果 guestValue 是 [值, "描述"] 格式，取第一个元素
        let guest = guestValue;
        if (Array.isArray(guestValue) && guestValue.length > 0) {
          guest = guestValue[0];
        }
        // 如果 guest 是对象且有名称属性，返回处理后的对象
        if (guest && typeof guest === 'object' && guest.名称) {
          return guest;
    }
        return null;
      })
      .filter((guest: any) => guest !== null);
    console.log('✅ 处理后的客人数组:', guests);
  } else if (Array.isArray(guestsListRaw)) {
    // 兼容旧格式：数组格式
    guests = guestsListRaw;
    console.log('✅ 使用数组格式的客人数据:', guests);
  } else {
    console.warn('⚠️ 客人数据格式不正确或为空:', guestsListRaw);
  }

  // 处理员工数据（对象格式，以员工名称为 key）
  const staffListRaw = pick(stat, '员工.员工列表', {});
  let staff: Array<any> = [];
  if (typeof staffListRaw === 'object' && staffListRaw !== null && !Array.isArray(staffListRaw)) {
    // 对象格式：{ "员工名": { "名称": "员工名", ... }, ... }
    staff = Object.values(staffListRaw).filter((employee: any) => {
      return employee && typeof employee === 'object' && employee.名称;
    });
  } else if (Array.isArray(staffListRaw)) {
    // 兼容旧格式：数组格式
    staff = staffListRaw;
  }

  return {
    innName: typeof innName === 'string' ? innName : '多次元便携旅店',
    currentWorld: typeof currentWorld === 'string' ? currentWorld : '艾尔利亚大陆',
    businessStatus: typeof businessStatus === 'string' ? businessStatus : '营业中',
    popularity: Number(popularity) || 0,
    occupancy: Number(occupancy) || 0,
    innLaw: currentLaw?.法则名 || '中立',
    currentLaw,
    lawList,
    currentAccessMode,
    accessModeList,
    innAppearance:
      typeof innAppearance === 'string'
        ? innAppearance
        : '炉火温暖地噼啪作响，邀请着来自各个维度的疲惫旅人。空气中弥漫着烤肉的香味和臭氧的气息。',
    gold: Number(gold) || 0,
    reputation: Number(reputation) || 0,
    materials: Number(materials) || 0,
    day: Number(day) || 1,
    currentTime: typeof currentTime === 'string' ? currentTime : '09:00',
    facilities,
    guests,
    staff,
  };
}
