/**
 * 游戏初始化工具
 */
import { ACCESS_MODE_OPTIONS, GameConfig, INN_STYLE_OPTIONS, PERK_OPTIONS, WORLD_OPTIONS } from '../types/gameConfig';

// 全局函数声明（由酒馆助手提供）
declare function getVariables(option: { type: 'message'; message_id: number | 'latest' }): Record<string, any>;
declare function updateVariablesWith(
  updater: (variables: Record<string, any>) => Record<string, any> | Promise<Record<string, any>>,
  option: { type: 'message'; message_id: number | 'latest' },
): Record<string, any> | Promise<Record<string, any>>;
declare function createChatMessages(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; message: string; data?: Record<string, any> }>,
  options?: { refresh?: 'none' | 'affected' | 'all' },
): Promise<void>;
declare const Mvu: {
  getMvuData: (options: { type: 'message' | 'chat' | 'character' | 'global'; message_id?: number | 'latest' }) => {
    stat_data: Record<string, any>;
    display_data: Record<string, any>;
    delta_data: Record<string, any>;
  };
  parseMessage?: (message: string, old_data: any) => Promise<any | undefined>;
};

/**
 * 根据游戏配置生成开局文本
 */
export function generateOpeningStory(config: GameConfig): string {
  const world = WORLD_OPTIONS.find(w => w.id === config.startingWorld) || WORLD_OPTIONS[0];
  const style = INN_STYLE_OPTIONS.find(s => s.id === config.innStyle) || INN_STYLE_OPTIONS[0];
  const perk = PERK_OPTIONS.find(p => p.id === config.startingPerk) || PERK_OPTIONS[0];

  // 根据世界观生成不同的开局描述
  const worldDescriptions: Record<string, string> = {
    fantasy: `在艾尔利亚大陆的某个角落，魔法与剑交织的古老土地上，${config.innName}悄然出现在一片宁静的森林边缘。`,
    cyberpunk: `霓虹城 2099，酸雨终年不绝的钢铁丛林中，${config.innName}的招牌在霓虹灯海中闪烁着温暖的光芒。`,
    modern: `苍蓝学园的校园一角，和平的现代世界背面隐藏着异能，${config.innName}静静地伫立在那里，等待着特殊的客人。`,
    wasteland: `灰烬废土，极度危险的土地上，${config.innName}如同一座孤岛，为那些在绝望中寻找希望的人提供庇护。`,
  };

  const styleDescriptions: Record<string, string> = {
    oak: `${config.innName}采用了${style.name}的风格。${style.appearance}`,
    street: `${config.innName}采用了${style.name}的风格。${style.appearance}`,
    crimson: `${config.innName}采用了${style.name}的风格。${style.appearance}`,
    bamboo: `${config.innName}采用了${style.name}的风格。${style.appearance}`,
  };

  const perkDescriptions: Record<string, string> = {
    wealth: `虚空赐予你"装修基金"的恩赐，你开局更容易获得高额的金币。`,
    'loyal-guard': `虚空赐予你"忠诚卫士"的恩赐，一名强力的员工已经在这里等待你的到来。`,
  };

  const story = `
${worldDescriptions[config.startingWorld] || worldDescriptions.fantasy}

${styleDescriptions[config.innStyle] || styleDescriptions.oak}

${perkDescriptions[config.startingPerk] || perkDescriptions.wealth}

你站在${config.innName}的门前，感受着来自虚空的契约之力。炉火已经点燃，第一簇火焰在壁炉中跳跃，发出温暖而神秘的光芒。

"欢迎来到${config.innName}。"你对自己说道，"这里是迷失者的庇护所，是跨越位面的驿站。从今天起，这里就是你的家，也是所有旅人的家。"

你推开门，走进了旅店。空气中弥漫着烤肉的香味和淡淡的魔法气息。虽然现在这里还很简陋，但你知道，只要用心经营，这里将成为诸天万界中最著名的旅店之一。

第一天的经营即将开始。你准备好了吗，店主？
`.trim();

  return story;
}

/**
 * 根据游戏配置初始化游戏状态（已废弃，使用 initializeGameVariables 代替）
 * @deprecated 使用 initializeGameVariables 代替
 */
export function initializeGameState(config: GameConfig) {
  const world = WORLD_OPTIONS.find(w => w.id === config.startingWorld) || WORLD_OPTIONS[0];
  const perk = PERK_OPTIONS.find(p => p.id === config.startingPerk) || PERK_OPTIONS[0];

  // 计算初始金币（根据世界和福利）
  let initialGold = world.initialGold;
  if (perk.id === 'wealth') {
    initialGold = Math.floor(initialGold * 3); // 200% 额外 = 300% 总额
  }

  // 计算初始建材
  let initialMaterials = world.initialMaterials;
  if (perk.id === 'wealth') {
    initialMaterials = Math.floor(initialMaterials * 3);
  }

  return {
    gold: initialGold,
    reputation: 0,
    currentWorld: world.name,
    day: 1,
    innName: config.innName,
    innStyle: config.innStyle,
    startingPerk: config.startingPerk,
  };
}

/**
 * 将游戏配置写入0层消息楼层变量
 * 在开局创建完成后调用，用于初始化游戏变量
 */
export async function initializeGameVariables(config: GameConfig): Promise<boolean> {
  try {
    const world = WORLD_OPTIONS.find(w => w.id === config.startingWorld) || WORLD_OPTIONS[0];
    const style = INN_STYLE_OPTIONS.find(s => s.id === config.innStyle) || INN_STYLE_OPTIONS[0];
    const perk = PERK_OPTIONS.find(p => p.id === config.startingPerk) || PERK_OPTIONS[0];

    // 计算初始资源（根据世界和福利）
    let initialGold = world.initialGold;
    let initialMaterials = world.initialMaterials;
    if (perk.id === 'wealth') {
      initialGold = Math.floor(initialGold * 3); // 200% 额外 = 300% 总额
      initialMaterials = Math.floor(initialMaterials * 3);
    }

    // 获取0层变量表（如果不存在则创建）
    let variables: any;
    try {
      variables = getVariables({ type: 'message', message_id: 0 });
    } catch (err) {
      // 如果0层消息不存在，创建一个空的变量结构
      console.warn('⚠️ 0层消息不存在，将在更新时创建', err);
      variables = { stat_data: {} };
    }

    // 使用 updateVariablesWith 更新0层变量
    await updateVariablesWith(
      vars => {
        // 确保 stat_data 存在
        if (!vars) {
          vars = { stat_data: {} };
        }
        if (!vars.stat_data) {
          vars.stat_data = {};
        }

        // 更新旅店名称（根据用户配置动态设置）
        if (!vars.stat_data.旅店) vars.stat_data.旅店 = {};
        vars.stat_data.旅店.名称 = config.innName;

        // 更新当前世界
        if (!vars.stat_data.旅店.当前世界) vars.stat_data.旅店.当前世界 = {};
        vars.stat_data.旅店.当前世界.世界名 = world.name;
        vars.stat_data.旅店.当前世界.世界介绍 = world.desc;

        // 更新旅店风格信息（如果存在初始风格字段）
        if (!vars.stat_data.旅店.初始风格) vars.stat_data.旅店.初始风格 = {};
        vars.stat_data.旅店.初始风格.风格名称 = style.name;
        vars.stat_data.旅店.初始风格.风格关键词 = style.keywords;
        vars.stat_data.旅店.初始风格.外观描述 = style.appearance;
        vars.stat_data.旅店.初始风格.认知修正效果 = style.cognitiveEffect;
        vars.stat_data.旅店.初始风格.初始增益名称 = style.bonusName;
        vars.stat_data.旅店.初始风格.初始增益描述 = style.initialBonus;

        // 根据选择的风格设置初始设施
        if (!vars.stat_data.设施) vars.stat_data.设施 = {};
        if (!vars.stat_data.设施.设施列表) {
          vars.stat_data.设施.设施列表 = {};
        }

        // 获取当前设施列表（对象格式）
        const facilityList: Record<string, any> = vars.stat_data.设施.设施列表 || {};

        // 根据风格设置设施
        const facilities = style.facilities;

        // 更新或添加设施（使用对象格式，以设施名称为 key）
        facilityList['客房'] = {
          名称: '客房',
          等级: facilities.客房.等级,
          当前等级描述: facilities.客房.当前等级描述,
        };

        facilityList['餐饮'] = {
          名称: '餐饮',
          等级: facilities.餐饮.等级,
          当前等级描述: facilities.餐饮.当前等级描述,
        };

        facilityList['调酒'] = {
          名称: '调酒',
          等级: facilities.调酒.等级,
          当前等级描述: facilities.调酒.当前等级描述,
        };

        vars.stat_data.设施.设施列表 = facilityList;
        // 更新店主初始福利（根据用户配置动态设置）
        if (!vars.stat_data.店主) vars.stat_data.店主 = {};
        vars.stat_data.店主.初始福利 = perk.name;

        // 更新准入条件
        if (!vars.stat_data.旅店.准入条件) vars.stat_data.旅店.准入条件 = {};
        const accessMode = ACCESS_MODE_OPTIONS.find(m => m.id === config.accessMode) || ACCESS_MODE_OPTIONS[0];

        // 设置当前准入条件对象
        vars.stat_data.旅店.准入条件.当前准入条件 = {
          模式名称: accessMode.mode_name,
          条件描述: accessMode.condition,
        };

        // 如果准入条件列表不存在，初始化它（包含所有可用的准入条件，使用对象格式）
        if (!vars.stat_data.旅店.准入条件.准入条件列表) {
          const accessModeList: Record<string, { 条件描述: string }> = {};
          for (const mode of ACCESS_MODE_OPTIONS) {
            accessModeList[mode.mode_name] = {
              条件描述: mode.condition,
            };
          }
          vars.stat_data.旅店.准入条件.准入条件列表 = accessModeList;
        }

        // 更新初始资源（根据世界和福利计算的值）
        if (!vars.stat_data.资源) vars.stat_data.资源 = {};
        vars.stat_data.资源.金币 = initialGold;
        vars.stat_data.资源.建材 = initialMaterials;

        return vars;
      },
      { type: 'message', message_id: 0 },
    );

    console.log('✅ 成功初始化0层游戏变量:', {
      innName: config.innName,
      world: world.name,
      style: style.name,
      perk: perk.name,
      initialGold,
      initialMaterials,
    });

    return true;
  } catch (error) {
    console.error('❌ 初始化0层游戏变量失败:', error);
    return false;
  }
}

/**
 * 创建开局介绍楼层
 * 在开局配置完成后调用，创建包含 <maintext> 和 <option> 的介绍楼层
 */
export async function createOpeningStoryMessage(config: GameConfig): Promise<boolean> {
  try {
    const world = WORLD_OPTIONS.find(w => w.id === config.startingWorld) || WORLD_OPTIONS[0];
    const style = INN_STYLE_OPTIONS.find(s => s.id === config.innStyle) || INN_STYLE_OPTIONS[0];
    const perk = PERK_OPTIONS.find(p => p.id === config.startingPerk) || PERK_OPTIONS[0];
    const accessMode = ACCESS_MODE_OPTIONS.find(m => m.id === config.accessMode) || ACCESS_MODE_OPTIONS[0];

    // 构建 maintext 内容
    const maintext = `<maintext>
你是${config.innName}的店主。那些过往已经不重要，你已经签订了灵魂契约，${config.innName}将陪伴你此后的人生。

${config.innName}采用了${style.name}的风格。${style.appearance}

${config.innName}是一座特殊的旅店，它拥有三个不可改变的特性：

第一，${config.innName}不可被毁灭。无论遭遇怎样的灾难、战争或魔法冲击，这座旅店不会被破坏。当然，餐具、食物、水杯等器具和消耗品并没有这个性质，具备超凡特性的只有旅店的建筑部分。

第二，${config.innName}可以穿越诸天万界。通过伟大之力，旅店可以在不同的世界位面之间穿梭，从奇幻大陆到赛博都市，从现代校园到废土荒野，旅店能够出现在任何需要它的地方。

第三，${config.innName}内自带法则。所有的客人和员工，无论是神祇还是凡夫，都会被旅店内制定的法则暂时性地影响，这些影响将在他们离开旅馆后失效。法则由你掌控，可以是禁魔法则、高魔法则，也可以是其他特殊的规则，例如所有人都无法心生恶意或者歹念，即使是仇敌也必须好好相处的"好朋友法则"。店主不受法则影响。

关于${config.innName}的准入条件，你选择了"${accessMode.mode_name}"。${accessMode.condition}

目前，${config.innName}位于${world.name}。${world.desc}

虽然旅店目前一切都才刚刚起步，但好在你拥有一个开局福利：${perk.name}。${perk.desc}这将帮助你更好地度过前期，在诸天万界中建立属于你的传奇。
</maintext>`;

    // 构建 option 内容
    const option = `<option>
A. 开始这场有趣的历程吧。
</option>`;

    // 添加<sum>标签
    const sum = `<sum>你成为了${config.innName}的主人。准备好营业吧！</sum>`;

    // 组合完整消息
    const message = `${maintext}\n\n${sum}\n\n${option}`;

    // 获取0层的data（携带变量）
    let layer0Data: any = { stat_data: {}, display_data: {}, delta_data: {} };
    try {
      const mvuData = Mvu.getMvuData({ type: 'message', message_id: 0 });
      // 确保返回的数据结构完整
      if (mvuData && mvuData.stat_data) {
        layer0Data = mvuData;
      } else {
        console.warn('⚠️ 0层MVU数据的 stat_data 不存在，使用空对象');
      }
    } catch (err) {
      console.warn('⚠️ 获取0层MVU数据失败，尝试从getVariables读取', err);
      try {
        const vars = getVariables({ type: 'message', message_id: 0 });
        if (vars && vars.stat_data) {
          layer0Data = {
            stat_data: vars.stat_data || {},
            display_data: vars.display_data || {},
            delta_data: vars.delta_data || {},
          };
        } else {
          console.warn('⚠️ 0层变量的 stat_data 不存在，使用空对象');
        }
      } catch (err2) {
        console.warn('⚠️ 获取0层变量失败，使用空对象', err2);
      }
    }

    // 创建1层assistant消息，携带0层的data
    await createChatMessages(
      [
        {
          role: 'assistant',
          message: message,
          data: layer0Data, // 携带0层的data
        },
      ],
      {
        refresh: 'none', // 不刷新显示，由魔典自己读取
      },
    );

    console.log('✅ 成功创建开局介绍楼层（1层）');

    // 创建完成后，更新编年史
    const { checkAndUpdateChronicle } = await import('./chronicleUpdater');
    await checkAndUpdateChronicle();

    return true;
  } catch (error) {
    console.error('❌ 创建开局介绍楼层失败:', error);
    return false;
  }
}
