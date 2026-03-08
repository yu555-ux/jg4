import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';

export const Schema = z.object({
  // ==========================================
  // 世界环境模块
  // ==========================================
  世界信息: z.object({
    时间: z
      .object({
        年份: z.string().prefault('乾元元年'),
        日期: z.string().prefault('正月初一'),
        时辰: z.string().prefault('辰时一刻'),
      })
      .prefault({ 年份: '乾元元年', 日期: '正月初一', 时辰: '辰时一刻' }),

    地点: z
      .object({
        大域: z.string().prefault('东灵域'),
        区域: z.string().prefault('青云宗'),
        地点: z.string().prefault('后山'),
        具体场景: z.string().prefault('寒庐'),
      })
      .prefault({ 大域: '东灵域', 区域: '青云宗', 地点: '后山', 具体场景: '寒庐' }),

    侵蚀度: z.coerce
      .number()
      .prefault(0)
      .transform(v => Math.max(0, Math.min(100, v))),
  }),

  // ==========================================
  // 角色核心模块
  // ==========================================
  角色基础: z
    .object({
      宿主: z.string().prefault('顾昀'),
      寿元: z.coerce.number().prefault(0),

      当前生命: z.coerce.number().prefault(100),
      基础生命: z.coerce.number().prefault(100),
      最大生命: z.coerce.number().prefault(100),
      当前灵气: z.coerce.number().prefault(100),
      基础灵气: z.coerce.number().prefault(100),
      最大灵气: z.coerce.number().prefault(100),
      当前道心: z.coerce.number().prefault(100),
      基础道心: z.coerce.number().prefault(100),
      最大道心: z.coerce.number().prefault(100),

      境界: z.string().prefault('凡人'),
      境界映射: z.coerce.number().prefault(0),
      修行进度: z.coerce
        .number()
        .prefault(0)
        .transform(v => Math.max(0, Math.min(100, v))),

      当前根骨: z.coerce.number().prefault(10),
      基础根骨: z.coerce.number().prefault(10),
      当前神海: z.coerce.number().prefault(10),
      基础神海: z.coerce.number().prefault(10),
      当前身法: z.coerce.number().prefault(10),
      基础身法: z.coerce.number().prefault(10),
      当前横练: z.coerce.number().prefault(10),
      基础横练: z.coerce.number().prefault(10),
      当前杀伐: z.coerce.number().prefault(10),
      基础杀伐: z.coerce.number().prefault(10),
      当前神伤: z.coerce.number().prefault(10),
      基础神伤: z.coerce.number().prefault(10),

      当前悟性: z.coerce.number().prefault(10),
      基础悟性: z.coerce.number().prefault(10),
      当前魅力: z.coerce.number().prefault(10),
      基础魅力: z.coerce.number().prefault(10),
      当前气运: z.coerce.number().prefault(10),
      基础气运: z.coerce.number().prefault(10),

      总堕落值: z.coerce.number().prefault(0),
      兴奋值: z.coerce.number().prefault(0),
      内心想法: z.string().prefault('无'),
      依存度: z.coerce
        .number()
        .prefault(0)
        .transform(v => Math.max(-200, Math.min(200, v))),
    })
    .transform(data => {
      const corruption = data.总堕落值 || 0;
      const stages = [
        '清纯少女',
        '渐染尘埃',
        '欲望萌芽',
        '禁果初尝',
        '灵肉沉沦',
        '欲海浮沉',
        '绝世尤物',
        '淫心入骨',
        '倾世淫仙',
        '堕落神女',
      ];
      const idx = Math.min(9, Math.max(0, Math.floor(corruption / 100)));

      const dependency = data.依存度 || 0;
      const depStages = ['反抗', '敌视', '戒备', '中立', '顺从', '依赖', '痴迷', '狂热'];
      const depIdx = Math.min(7, Math.max(0, Math.floor((dependency + 200) / 50)));

      return { ...data, $堕落评价: stages[idx], $依存评价: depStages[depIdx] };
    }),

  事件标志: z.record(z.string().describe('标志名称'), z.boolean().describe('是否触发')),

  // ==========================================
  // 身体与状态模块
  // ==========================================
  身体开发: z
    .object({
      嘴巴: z.object({
        状态描述: z.string().prefault('温润如玉'),
        开发等级: z.coerce.number().prefault(1),
        使用次数: z.coerce.number().prefault(0),
      }),
      胸部: z.object({
        状态描述: z.string().prefault('娇羞欲放'),
        开发等级: z.coerce.number().prefault(1),
        使用次数: z.coerce.number().prefault(0),
      }),
      小穴: z.object({
        状态描述: z.string().prefault('幽径初探'),
        开发等级: z.coerce.number().prefault(1),
        使用次数: z.coerce.number().prefault(0),
      }),
      屁穴: z.object({
        状态描述: z.string().prefault('封闭之地'),
        开发等级: z.coerce.number().prefault(1),
        使用次数: z.coerce.number().prefault(0),
      }),
    })
    .transform(data => {
      const processPart = part => {
        const count = part.使用次数 || 0;
        const lv = count >= 600 ? 5 : count >= 300 ? 4 : count >= 100 ? 3 : count >= 20 ? 2 : 1;
        const evalMap = ['', '初涉', '熟稔', '沦陷', '玩坏', '彻底崩坏'];
        return { ...part, 开发等级: lv, $开发评价: evalMap[lv] };
      };
      return {
        嘴巴: processPart(data.嘴巴),
        胸部: processPart(data.胸部),
        小穴: processPart(data.小穴),
        屁穴: processPart(data.屁穴),
      };
    }),

  子宫: z.object({
    最大容量: z.coerce.number().prefault(500),
    当前容量: z.coerce.number().prefault(0),
    状态描述: z.string().prefault('纯净空盈'),
  }),

  当前状态: z.record(
    z.string().describe('状态名称'),
    z.object({
      描述: z.string().prefault('暂无详细描述。'),
      固定加成: z.array(z.string()).prefault([]),
      效果: z.array(z.string()).prefault([]),
      持续时间: z.string().prefault('未知'),
    }),
  ),

  天赋灵根: z.record(
    z.string().describe('灵根名称'),
    z.object({
      品阶: z.string().prefault('未知'),
      描述: z.string().prefault('暂无描述'),
      固定加成: z.array(z.string()).prefault([]),
      神通: z.record(z.string().describe('神通名称'), z.string().describe('描述')).prefault({}),
    }),
  ),

  // ==========================================
  // 分类明确的个人装备/功法模块
  // ==========================================
  当前功法: z
    .object({
      主修: z
        .object({
          名称: z.string().prefault('未知功法'),
          分类: z.literal('功法').prefault('功法'),
          品阶: z.string().prefault('凡阶'),
          描述: z.string().prefault('暂无描述'),
          固定加成: z.array(z.string()).prefault([]),
          熟练度: z.coerce.number().prefault(0),
          掌握程度: z.string().prefault('初窥门径'),
          招式: z
            .array(
              z.object({
                名称: z.string().prefault('未知招式'),
                描述: z.string().prefault('暂无招式描述'),
                效果: z.array(z.string()).prefault([]),
              }),
            )
            .prefault([]),
        })
        .nullable()
        .prefault(null),
      辅修: z
        .array(
          z.object({
            名称: z.string().prefault('未知功法'),
            分类: z.literal('功法').prefault('功法'),
            品阶: z.string().prefault('凡阶'),
            描述: z.string().prefault('暂无描述'),
            固定加成: z.array(z.string()).prefault([]),
            熟练度: z.coerce.number().prefault(0),
            掌握程度: z.string().prefault('初窥门径'),
            招式: z
              .array(
                z.object({
                  名称: z.string().prefault('未知招式'),
                  描述: z.string().prefault('暂无招式描述'),
                  效果: z.array(z.string()).prefault([]),
                }),
              )
              .prefault([]),
          }),
        )
        .prefault([]),
    })
    .transform(data => {
      const processSkill = item => {
        if (!item) return null;
        const prof = item.熟练度 || 0;
        const stages = ['初窥门径', '略有小成', '炉火纯青', '登峰造极', '天人合一'];
        const idx = Math.min(4, Math.max(0, Math.floor(prof / 200)));
        return { ...item, 掌握程度: stages[idx] };
      };
      return {
        主修: processSkill(data.主修),
        辅修: (data.辅修 || []).slice(0, 3).map(processSkill).filter(Boolean),
      };
    }),

  当前装备: z
    .object({
      武器: z
        .array(
          z.object({
            名称: z.string().prefault('未知武器'),
            分类: z.literal('武器').prefault('武器'),
            品阶: z.string().prefault('凡阶'),
            描述: z.string().prefault('暂无描述'),
            固定加成: z.array(z.string()).prefault([]),
            效果: z.array(z.string()).prefault([]),
          }),
        )
        .prefault([]),
      装备: z
        .array(
          z.object({
            名称: z.string().prefault('未知装备'),
            分类: z.literal('装备').prefault('装备'),
            品阶: z.string().prefault('凡阶'),
            描述: z.string().prefault('暂无描述'),
            固定加成: z.array(z.string()).prefault([]),
            效果: z.array(z.string()).prefault([]),
          }),
        )
        .prefault([]),
      法宝: z
        .array(
          z.object({
            名称: z.string().prefault('未知法宝'),
            分类: z.literal('法宝').prefault('法宝'),
            品阶: z.string().prefault('凡阶'),
            描述: z.string().prefault('暂无描述'),
            固定加成: z.array(z.string()).prefault([]),
            效果: z.array(z.string()).prefault([]),
          }),
        )
        .prefault([]),
    })
    .transform(data => {
      return {
        武器: (data.武器 || []).slice(0, 2),
        装备: (data.装备 || []).slice(0, 4),
        法宝: (data.法宝 || []).slice(0, 2),
      };
    }),

  当前着装: z
    .object({
      上衣: z
        .object({
          名称: z.string().prefault('未知着装'),
          分类: z.literal('着装').prefault('着装'),
          着装类型: z.literal('上衣').prefault('上衣'),
          品阶: z.string().prefault('凡阶'),
          描述: z.string().prefault('暂无描述'),
          固定加成: z.array(z.string()).prefault([]),
          效果: z.array(z.string()).prefault([]),
        })
        .nullable()
        .prefault(null),
      下衣: z
        .object({
          名称: z.string().prefault('未知着装'),
          分类: z.literal('着装').prefault('着装'),
          着装类型: z.literal('下衣').prefault('下衣'),
          品阶: z.string().prefault('凡阶'),
          描述: z.string().prefault('暂无描述'),
          固定加成: z.array(z.string()).prefault([]),
          效果: z.array(z.string()).prefault([]),
        })
        .nullable()
        .prefault(null),
      内衣: z
        .object({
          名称: z.string().prefault('未知着装'),
          分类: z.literal('着装').prefault('着装'),
          着装类型: z.literal('内衣').prefault('内衣'),
          品阶: z.string().prefault('凡阶'),
          描述: z.string().prefault('暂无描述'),
          固定加成: z.array(z.string()).prefault([]),
          效果: z.array(z.string()).prefault([]),
        })
        .nullable()
        .prefault(null),
      鞋子: z
        .object({
          名称: z.string().prefault('未知着装'),
          分类: z.literal('着装').prefault('着装'),
          着装类型: z.literal('鞋子').prefault('鞋子'),
          品阶: z.string().prefault('凡阶'),
          描述: z.string().prefault('暂无描述'),
          固定加成: z.array(z.string()).prefault([]),
          效果: z.array(z.string()).prefault([]),
        })
        .nullable()
        .prefault(null),
      袜子: z
        .object({
          名称: z.string().prefault('未知着装'),
          分类: z.literal('着装').prefault('着装'),
          着装类型: z.literal('袜子').prefault('袜子'),
          品阶: z.string().prefault('凡阶'),
          描述: z.string().prefault('暂无描述'),
          固定加成: z.array(z.string()).prefault([]),
          效果: z.array(z.string()).prefault([]),
        })
        .nullable()
        .prefault(null),
      佩戴物: z
        .array(
          z.object({
            名称: z.string().prefault('未知着装'),
            分类: z.literal('着装').prefault('着装'),
            着装类型: z.literal('佩戴物').prefault('佩戴物'),
            品阶: z.string().prefault('凡阶'),
            描述: z.string().prefault('暂无描述'),
            固定加成: z.array(z.string()).prefault([]),
            效果: z.array(z.string()).prefault([]),
          }),
        )
        .prefault([]),
    })
    .transform(data => {
      const ensureEffects = item => {
        if (!item) return null;
        return { ...item, 效果: item.效果 ?? [] };
      };
      return {
        上衣: ensureEffects(data.上衣),
        下衣: ensureEffects(data.下衣),
        内衣: ensureEffects(data.内衣),
        鞋子: ensureEffects(data.鞋子),
        袜子: ensureEffects(data.袜子),
        佩戴物: (data.佩戴物 || []).slice(0, 3).map(ensureEffects).filter(Boolean),
      };
    }),

  // ==========================================
  // 异构物品合集（多态分类分离应用）
  // ==========================================
  储物空间: z
    .record(
      z.string().describe('物品名称'),
      z
        .union([
          z.object({
            分类: z.enum(['武器', '装备', '法宝']).prefault('武器'),
            品阶: z.string().prefault('凡阶'),
            描述: z.string().prefault('暂无描述'),
            固定加成: z.array(z.string()).prefault([]),
            效果: z.array(z.string()).prefault([]),
            数量: z.coerce.number().prefault(1),
          }),
          z.object({
            分类: z.enum(['丹药', '阵符']).prefault('丹药'),
            品阶: z.string().prefault('凡阶'),
            描述: z.string().prefault('暂无描述'),
            效果: z.array(z.string()).prefault([]),
            数量: z.coerce.number().prefault(1),
          }),
          z.object({
            分类: z.literal('灵石').prefault('灵石'),
            灵石类型: z.enum(['上品', '中品', '下品', '特殊', '']).prefault('下品'),
            描述: z.string().prefault('暂无描述'),
            数量: z.coerce.number().prefault(1),
          }),
          z.object({
            分类: z.literal('着装').prefault('着装'),
            着装类型: z.enum(['上衣', '下衣', '内衣', '鞋子', '袜子', '佩戴物', '']).prefault('上衣'),
            品阶: z.string().prefault('凡阶'),
            描述: z.string().prefault('暂无描述'),
            固定加成: z.array(z.string()).prefault([]),
            效果: z.array(z.string()).prefault([]),
            数量: z.coerce.number().prefault(1),
          }),
          z.object({
            分类: z.literal('功法').prefault('功法'),
            品阶: z.string().prefault('凡阶'),
            描述: z.string().prefault('暂无描述'),
            固定加成: z.array(z.string()).prefault([]),
            熟练度: z.coerce.number().prefault(0),
            掌握程度: z.string().optional(),
            招式: z
              .array(
                z.object({
                  名称: z.string().prefault('未知招式'),
                  描述: z.string().prefault('暂无招式描述'),
                  效果: z.array(z.string()).prefault([]),
                }),
              )
              .prefault([]),
            数量: z.coerce.number().prefault(1),
          }),
          z.object({
            分类: z.literal('特殊').prefault('特殊'),
            品阶: z.string().prefault('凡阶'),
            描述: z.string().prefault('暂无描述'),
            内容: z.array(z.string()).prefault([]),
            数量: z.coerce.number().prefault(1),
          }),
        ])
        .or(
          z.object({
            分类: z.string().prefault('未知'),
            描述: z.string().prefault('暂无描述'),
            数量: z.coerce.number().prefault(1),
          }),
        )
        .prefault({ 分类: '特殊', 数量: 1, 描述: '暂无描述' }),
    )
    .transform(data => {
      const filtered = {};
      for (const [key, item] of Object.entries(data || {})) {
        if (item.数量 > 0) filtered[key] = item;
      }
      return filtered;
    }),

  仙缘商城: z.object({
    商品列表: z
      .array(
        z
          .union([
            z.object({
              分类: z.enum(['武器', '装备', '法宝']).prefault('武器'),
              名称: z.string().prefault('未知物品'),
              价格: z.coerce.number().prefault(0),
              数量: z.coerce.number().prefault(1),
              品阶: z.string().prefault('凡阶'),
              描述: z.string().prefault('暂无描述'),
              固定加成: z.array(z.string()).prefault([]),
              效果: z.array(z.string()).prefault([]),
            }),
            z.object({
              分类: z.enum(['丹药', '阵符']).prefault('丹药'),
              名称: z.string().prefault('未知物品'),
              价格: z.coerce.number().prefault(0),
              数量: z.coerce.number().prefault(1),
              品阶: z.string().prefault('凡阶'),
              描述: z.string().prefault('暂无描述'),
              效果: z.array(z.string()).prefault([]),
            }),
            z.object({
              分类: z.literal('着装').prefault('着装'),
              名称: z.string().prefault('未知物品'),
              价格: z.coerce.number().prefault(0),
              数量: z.coerce.number().prefault(1),
              着装类型: z.enum(['上衣', '下衣', '内衣', '鞋子', '袜子', '佩戴物', '']).prefault('上衣'),
              品阶: z.string().prefault('凡阶'),
              描述: z.string().prefault('暂无描述'),
              固定加成: z.array(z.string()).prefault([]),
              效果: z.array(z.string()).prefault([]),
            }),
            z.object({
              分类: z.literal('功法').prefault('功法'),
              名称: z.string().prefault('未知物品'),
              价格: z.coerce.number().prefault(0),
              数量: z.coerce.number().prefault(1),
              品阶: z.string().prefault('凡阶'),
              描述: z.string().prefault('暂无描述'),
              固定加成: z.array(z.string()).prefault([]),
              熟练度: z.coerce.number().prefault(0),
              掌握程度: z.string().optional(),
              招式: z
                .array(
                  z.object({
                    名称: z.string().prefault('未知招式'),
                    描述: z.string().prefault('暂无招式描述'),
                    效果: z.array(z.string()).prefault([]),
                  }),
                )
                .prefault([]),
            }),
            z.object({
              分类: z.literal('特殊').prefault('特殊'),
              名称: z.string().prefault('未知物品'),
              价格: z.coerce.number().prefault(0),
              数量: z.coerce.number().prefault(1),
              品阶: z.string().prefault('凡阶'),
              描述: z.string().prefault('暂无描述'),
              内容: z.array(z.string()).prefault([]),
            }),
          ])
          .or(
            z.object({
              分类: z.string().prefault('未知'),
              名称: z.string().prefault('未知物品'),
              价格: z.coerce.number().prefault(0),
              数量: z.coerce.number().prefault(1),
              描述: z.string().prefault('暂无描述'),
            }),
          )
          .prefault({ 分类: '特殊', 名称: '未知商品', 价格: 0, 数量: 1 }),
      )
      .prefault([]),
  }),

  天运卜算: z.object({
    丙等卜算: z
      .object({
        已抽奖次数: z.coerce.number().prefault(0),
        最高级奖品: z
          .union([
                z.object({
                  分类: z.enum(['武器', '装备', '法宝']).prefault('武器'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  品阶: z.string().prefault('地阶'),
                  描述: z.string().prefault('暂无描述'),
                  固定加成: z.array(z.string()).prefault([]),
                  效果: z.array(z.string()).prefault([]),
                }),
                z.object({
                  分类: z.enum(['丹药', '阵符']).prefault('丹药'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  品阶: z.string().prefault('地阶'),
                  描述: z.string().prefault('暂无描述'),
                  效果: z.array(z.string()).prefault([]),
                }),
                z.object({
                  分类: z.literal('着装').prefault('着装'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  着装类型: z.enum(['上衣', '下衣', '内衣', '鞋子', '袜子', '佩戴物', '']).prefault('上衣'),
                  品阶: z.string().prefault('地阶'),
                  描述: z.string().prefault('暂无描述'),
                  固定加成: z.array(z.string()).prefault([]),
                  效果: z.array(z.string()).prefault([]),
                }),
                z.object({
                  分类: z.literal('功法').prefault('功法'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  品阶: z.string().prefault('地阶'),
                  描述: z.string().prefault('暂无描述'),
                  固定加成: z.array(z.string()).prefault([]),
                  熟练度: z.coerce.number().prefault(0),
                  招式: z
                    .array(
                      z.object({
                        名称: z.string().prefault('未知招式'),
                        描述: z.string().prefault('暂无招式描述'),
                        效果: z.array(z.string()).prefault([]),
                      }),
                    )
                    .prefault([]),
                }),
                z.object({
                  分类: z.literal('特殊').prefault('特殊'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  品阶: z.string().prefault('地阶'),
                  描述: z.string().prefault('暂无描述'),
                  内容: z.array(z.string()).prefault([]),
                }),
              ])
              .or(
                z.object({
                  分类: z.string().prefault('未知'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                }),
              )
              .prefault({}),
        次高级奖品: z
          .array(
            z
              .union([
                z.object({
                  分类: z.enum(['武器', '装备', '法宝']).prefault('武器'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  品阶: z.string().prefault('玄阶'),
                  描述: z.string().prefault('暂无描述'),
                  固定加成: z.array(z.string()).prefault([]),
                  效果: z.array(z.string()).prefault([]),
                }),
                z.object({
                  分类: z.enum(['丹药', '阵符']).prefault('丹药'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  品阶: z.string().prefault('玄阶'),
                  描述: z.string().prefault('暂无描述'),
                  效果: z.array(z.string()).prefault([]),
                }),
                z.object({
                  分类: z.literal('着装').prefault('着装'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  着装类型: z.enum(['上衣', '下衣', '内衣', '鞋子', '袜子', '佩戴物', '']).prefault('上衣'),
                  品阶: z.string().prefault('玄阶'),
                  描述: z.string().prefault('暂无描述'),
                  固定加成: z.array(z.string()).prefault([]),
                  效果: z.array(z.string()).prefault([]),
                }),
                z.object({
                  分类: z.literal('功法').prefault('功法'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  品阶: z.string().prefault('玄阶'),
                  描述: z.string().prefault('暂无描述'),
                  固定加成: z.array(z.string()).prefault([]),
                  熟练度: z.coerce.number().prefault(0),
                  招式: z
                    .array(
                      z.object({
                        名称: z.string().prefault('未知招式'),
                        描述: z.string().prefault('暂无招式描述'),
                        效果: z.array(z.string()).prefault([]),
                      }),
                    )
                    .prefault([]),
                }),
                z.object({
                  分类: z.literal('特殊').prefault('特殊'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  品阶: z.string().prefault('玄阶'),
                  描述: z.string().prefault('暂无描述'),
                  内容: z.array(z.string()).prefault([]),
                }),
              ])
              .or(
                z.object({
                  分类: z.string().prefault('未知'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                }),
              ),
          )
          .prefault([]),
      })
      .transform(data => ({
        最高级奖品: data.最高级奖品 || {},
        次高级奖品: (data.次高级奖品 || []).slice(0, 5),
      })),

    乙等卜算: z
      .object({
        已抽奖次数: z.coerce.number().prefault(0),
        最高级奖品: z
          .union([
                z.object({
                  分类: z.enum(['武器', '装备', '法宝']).prefault('武器'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  品阶: z.string().prefault('天阶'),
                  描述: z.string().prefault('暂无描述'),
                  固定加成: z.array(z.string()).prefault([]),
                  效果: z.array(z.string()).prefault([]),
                }),
                z.object({
                  分类: z.enum(['丹药', '阵符']).prefault('丹药'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  品阶: z.string().prefault('天阶'),
                  描述: z.string().prefault('暂无描述'),
                  效果: z.array(z.string()).prefault([]),
                }),
                z.object({
                  分类: z.literal('着装').prefault('着装'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  着装类型: z.enum(['上衣', '下衣', '内衣', '鞋子', '袜子', '佩戴物', '']).prefault('上衣'),
                  品阶: z.string().prefault('天阶'),
                  描述: z.string().prefault('暂无描述'),
                  固定加成: z.array(z.string()).prefault([]),
                  效果: z.array(z.string()).prefault([]),
                }),
                z.object({
                  分类: z.literal('功法').prefault('功法'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  品阶: z.string().prefault('天阶'),
                  描述: z.string().prefault('暂无描述'),
                  固定加成: z.array(z.string()).prefault([]),
                  熟练度: z.coerce.number().prefault(0),
                  招式: z
                    .array(
                      z.object({
                        名称: z.string().prefault('未知招式'),
                        描述: z.string().prefault('暂无招式描述'),
                        效果: z.array(z.string()).prefault([]),
                      }),
                    )
                    .prefault([]),
                }),
                z.object({
                  分类: z.literal('特殊').prefault('特殊'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  品阶: z.string().prefault('天阶'),
                  描述: z.string().prefault('暂无描述'),
                  内容: z.array(z.string()).prefault([]),
                }),
              ])
              .or(
                z.object({
                  分类: z.string().prefault('未知'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                }),
              )
              .prefault({}),
        次高级奖品: z
          .array(
            z
              .union([
                z.object({
                  分类: z.enum(['武器', '装备', '法宝']).prefault('武器'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  品阶: z.string().prefault('地阶'),
                  描述: z.string().prefault('暂无描述'),
                  固定加成: z.array(z.string()).prefault([]),
                  效果: z.array(z.string()).prefault([]),
                }),
                z.object({
                  分类: z.enum(['丹药', '阵符']).prefault('丹药'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  品阶: z.string().prefault('地阶'),
                  描述: z.string().prefault('暂无描述'),
                  效果: z.array(z.string()).prefault([]),
                }),
                z.object({
                  分类: z.literal('着装').prefault('着装'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  着装类型: z.enum(['上衣', '下衣', '内衣', '鞋子', '袜子', '佩戴物', '']).prefault('上衣'),
                  品阶: z.string().prefault('地阶'),
                  描述: z.string().prefault('暂无描述'),
                  固定加成: z.array(z.string()).prefault([]),
                  效果: z.array(z.string()).prefault([]),
                }),
                z.object({
                  分类: z.literal('功法').prefault('功法'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  品阶: z.string().prefault('地阶'),
                  描述: z.string().prefault('暂无描述'),
                  固定加成: z.array(z.string()).prefault([]),
                  熟练度: z.coerce.number().prefault(0),
                  招式: z
                    .array(
                      z.object({
                        名称: z.string().prefault('未知招式'),
                        描述: z.string().prefault('暂无招式描述'),
                        效果: z.array(z.string()).prefault([]),
                      }),
                    )
                    .prefault([]),
                }),
                z.object({
                  分类: z.literal('特殊').prefault('特殊'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  品阶: z.string().prefault('地阶'),
                  描述: z.string().prefault('暂无描述'),
                  内容: z.array(z.string()).prefault([]),
                }),
              ])
              .or(
                z.object({
                  分类: z.string().prefault('未知'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                }),
              ),
          )
          .prefault([]),
      })
      .transform(data => ({
        最高级奖品: data.最高级奖品 || {},
        次高级奖品: (data.次高级奖品 || []).slice(0, 5),
      })),

    甲等卜算: z
      .object({
        已抽奖次数: z.coerce.number().prefault(0),
        最高级奖品: z
          .union([
                z.object({
                  分类: z.enum(['武器', '装备', '法宝']).prefault('武器'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  品阶: z.string().prefault('仙阶'),
                  描述: z.string().prefault('暂无描述'),
                  固定加成: z.array(z.string()).prefault([]),
                  效果: z.array(z.string()).prefault([]),
                }),
                z.object({
                  分类: z.enum(['丹药', '阵符']).prefault('丹药'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  品阶: z.string().prefault('仙阶'),
                  描述: z.string().prefault('暂无描述'),
                  效果: z.array(z.string()).prefault([]),
                }),
                z.object({
                  分类: z.literal('着装').prefault('着装'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  着装类型: z.enum(['上衣', '下衣', '内衣', '鞋子', '袜子', '佩戴物', '']).prefault('上衣'),
                  品阶: z.string().prefault('仙阶'),
                  描述: z.string().prefault('暂无描述'),
                  固定加成: z.array(z.string()).prefault([]),
                  效果: z.array(z.string()).prefault([]),
                }),
                z.object({
                  分类: z.literal('功法').prefault('功法'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  品阶: z.string().prefault('仙阶'),
                  描述: z.string().prefault('暂无描述'),
                  固定加成: z.array(z.string()).prefault([]),
                  熟练度: z.coerce.number().prefault(0),
                  招式: z
                    .array(
                      z.object({
                        名称: z.string().prefault('未知招式'),
                        描述: z.string().prefault('暂无招式描述'),
                        效果: z.array(z.string()).prefault([]),
                      }),
                    )
                    .prefault([]),
                }),
                z.object({
                  分类: z.literal('特殊').prefault('特殊'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  品阶: z.string().prefault('仙阶'),
                  描述: z.string().prefault('暂无描述'),
                  内容: z.array(z.string()).prefault([]),
                }),
              ])
              .or(
                z.object({
                  分类: z.string().prefault('未知'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                }),
              )
              .prefault({}),
        次高级奖品: z
          .array(
            z
              .union([
                z.object({
                  分类: z.enum(['武器', '装备', '法宝']).prefault('武器'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  品阶: z.string().prefault('天阶'),
                  描述: z.string().prefault('暂无描述'),
                  固定加成: z.array(z.string()).prefault([]),
                  效果: z.array(z.string()).prefault([]),
                }),
                z.object({
                  分类: z.enum(['丹药', '阵符']).prefault('丹药'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  品阶: z.string().prefault('天阶'),
                  描述: z.string().prefault('暂无描述'),
                  效果: z.array(z.string()).prefault([]),
                }),
                z.object({
                  分类: z.literal('着装').prefault('着装'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  着装类型: z.enum(['上衣', '下衣', '内衣', '鞋子', '袜子', '佩戴物', '']).prefault('上衣'),
                  品阶: z.string().prefault('天阶'),
                  描述: z.string().prefault('暂无描述'),
                  固定加成: z.array(z.string()).prefault([]),
                  效果: z.array(z.string()).prefault([]),
                }),
                z.object({
                  分类: z.literal('功法').prefault('功法'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  品阶: z.string().prefault('天阶'),
                  描述: z.string().prefault('暂无描述'),
                  固定加成: z.array(z.string()).prefault([]),
                  熟练度: z.coerce.number().prefault(0),
                  招式: z
                    .array(
                      z.object({
                        名称: z.string().prefault('未知招式'),
                        描述: z.string().prefault('暂无招式描述'),
                        效果: z.array(z.string()).prefault([]),
                      }),
                    )
                    .prefault([]),
                }),
                z.object({
                  分类: z.literal('特殊').prefault('特殊'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                  品阶: z.string().prefault('天阶'),
                  描述: z.string().prefault('暂无描述'),
                  内容: z.array(z.string()).prefault([]),
                }),
              ])
              .or(
                z.object({
                  分类: z.string().prefault('未知'),
                  名称: z.string().prefault('未知物品'),
                  出货概率: z.coerce.number().prefault(0),
                  数量: z.coerce.number().prefault(1),
                }),
              ),
          )
          .prefault([]),
      })
      .transform(data => ({
        最高级奖品: data.最高级奖品 || {},
        次高级奖品: (data.次高级奖品 || []).slice(0, 5),
      })),
  }),

  // ==========================================
  // 系统与任务模块
  // ==========================================
  仙玉录: z
    .object({
      等级: z.coerce.number().prefault(1),
      经验值: z.coerce.number().prefault(0),
      仙缘: z.coerce.number().prefault(0),
      当前行动点: z.coerce.number().prefault(10),
      最大行动点: z.coerce.number().prefault(10),
    })
    .transform(data => {
      const exp = data.经验值 || 0;
      const level = 1 + Math.floor(exp / 1000);
      const relativeExp = exp % 1000;
      return { ...data, 等级: level, $当前经验: relativeExp };
    }),

  仙玉权柄: z.record(
    z.string().describe('权柄名称'),
    z.object({
      当前等级: z.coerce.number().prefault(1),
      最高等级: z.coerce.number().prefault(10),
      描述: z.string().prefault('暂无描述'),
      效果: z.array(z.string()).prefault([]),
      使用消耗点数: z.coerce.number().prefault(5),
      升级所需行动点: z.coerce.number().prefault(10),
      持续时间: z.string().nullable().prefault(null),
    }),
  ),

  任务清单: z.record(
    z.string().describe('任务名称'),
    z.object({
      分类: z.enum(['主线任务', '支线任务', '情趣任务']).prefault('主线任务'),
      状态: z.enum(['进行中', '已结算']).prefault('进行中'),
      任务目标: z
        .record(z.string().describe('目标内容'), z.object({ 状态: z.enum(['已完成', '未完成']).prefault('未完成') }))
        .prefault({}),
      任务奖励: z.array(z.string()).prefault([]),
      任务惩罚: z.array(z.string()).prefault([]),
    }),
  ),

  成就列表: z.record(
    z.string().describe('成就名称'),
    z.object({
      描述: z.string().prefault('暂无描述'),
      固定加成: z.array(z.string()).prefault([]),
      获得天赋: z.string().prefault('无'),
    }),
  ),

  // ==========================================
  // 其他扩展模块
  // ==========================================
  灵宠列表: z.array(
    z.object({
      名称: z.string().prefault('未命名灵宠'),
      种族: z.string().prefault('未知'),
      血脉: z
        .object({
          描述: z.string().prefault('暂无描述'),
          效果: z.array(z.string()).prefault([]),
        })
        .prefault({ 描述: '暂无描述', 效果: [] }),
      境界: z.string().prefault('练气境'),
      境界映射: z.coerce.number().prefault(1),
      灵根: z.string().prefault('未知'),
      神通: z
        .array(
          z.object({
            名称: z.string().prefault('未知神通'),
            描述: z.string().prefault('暂无描述'),
            效果: z.array(z.string()).prefault([]),
          }),
        )
        .prefault([]),
      状态: z.string().prefault('正常'),
      特性: z.array(z.string()).prefault([]),
      契约伊始: z.string().prefault('未知'),
      关键经历: z.array(z.string()).prefault([]),
      寿元: z.string().prefault('一岁'),
    }),
  ),

  邪物收容: z.array(
    z.object({
      名称: z.string().prefault('未命名邪物'),
      描述: z.string().prefault('暂无描述'),
      危险等级: z.enum(['危', '险', '厄', '劫', '祸', '灾']).prefault('危'),
      歪理: z.array(z.string()).prefault([]),
      代价: z.string().prefault('无'),
    }),
  ),

  尘缘羁绊: z.record(
    z.string().describe('角色名称'),
    z.object({
      身份: z.string().prefault('未知'),
      关系: z.string().prefault('未知'),
      亲密度: z.coerce
        .number()
        .prefault(0)
        .transform(v => Math.max(-200, Math.min(200, v))),
      核心性格: z.string().prefault('未知'),
      境界: z.string().prefault('未知'),
      境界映射: z.coerce.number().prefault(0),
      天赋灵根: z
        .object({
          描述: z.string().prefault('暂无描述'),
          效果: z.array(z.string()).prefault([]),
        })
        .prefault({ 描述: '暂无描述', 效果: [] }),
      主修功法: z
        .object({
          名称: z.string().prefault('未知功法'),
          描述: z.string().prefault('暂无描述'),
          招式: z
            .array(
              z.object({
                名称: z.string().prefault('未知招式'),
                描述: z.string().prefault('暂无描述'),
                效果: z.array(z.string()).prefault([]),
              }),
            )
            .prefault([]),
        })
        .prefault({ 名称: '未知功法', 描述: '暂无描述', 招式: [] }),
      本命法宝: z
        .object({
          名称: z.string().prefault('未知法宝'),
          描述: z.string().prefault('暂无描述'),
          效果: z.array(z.string()).prefault([]),
        })
        .prefault({ 名称: '未知法宝', 描述: '暂无描述', 效果: [] }),
      本命武器: z
        .object({
          名称: z.string().prefault('未知武器'),
          描述: z.string().prefault('暂无描述'),
          效果: z.array(z.string()).prefault([]),
        })
        .prefault({ 名称: '未知武器', 描述: '暂无描述', 效果: [] }),
      欲望: z.string().prefault('？？？'),
      执念: z.string().prefault('？？？'),
      交互经历: z.array(z.string()).prefault([]),
    }),
  ),
});

$(() => {
  registerMvuSchema(Schema);
});
