// 世界类型枚举
export type WorldType = 'fantasy' | 'cyberpunk' | 'modern' | 'wasteland';

// 初始旅店风格类型
export type InnStyle = 'oak' | 'street' | 'crimson' | 'bamboo';

// 初始福利类型
export type StartingPerk = 'wealth' | 'loyal-guard';

// 准入条件类型
export type AccessMode = 'physical' | 'desperation' | 'temporal' | 'fated';

// 游戏配置接口
export interface GameConfig {
  innName: string;
  innStyle: InnStyle;
  startingWorld: WorldType;
  startingPerk: StartingPerk;
  accessMode: AccessMode;
  seed: number;
}

// 世界选项配置
export interface WorldOption {
  id: WorldType;
  name: string;
  desc: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  previewImage: string;
  initialGold: number;
  initialMaterials: number;
}

// 初始旅店风格选项
export interface InnStyleOption {
  id: InnStyle;
  name: string;
  nameEn: string;
  desc: string;
  keywords: string;
  appearance: string;
  cognitiveEffect: string;
  initialBonus: string;
  bonusName: string;
  icon: string;
  facilities: {
    客房: { 等级: number; 当前等级描述: string };
    餐饮: { 等级: number; 当前等级描述: string };
    调酒: { 等级: number; 当前等级描述: string };
  };
}

// 初始福利选项
export interface PerkOption {
  id: StartingPerk;
  name: string;
  desc: string;
  icon: string;
}

// 世界选项数据
export const WORLD_OPTIONS: WorldOption[] = [
  {
    id: 'fantasy',
    name: '艾尔利亚大陆',
    desc: '经典的奇幻世界。客源稳定，特产是魔法草药和龙肉。适合新手。',
    difficulty: 'Easy',
    tags: ['#剑与魔法', '#冒险者', '#魔兽'],
    previewImage: 'https://picsum.photos/800/600?random=fantasy',
    initialGold: 500,
    initialMaterials: 100,
  },
  {
    id: 'cyberpunk',
    name: '霓虹城 2099',
    desc: '酸雨终年不绝的钢铁丛林。客人们富有但暴躁，特产是合成食物和能量块。',
    difficulty: 'Medium',
    tags: ['#高科技', '#义体改造', '#企业战争'],
    previewImage: 'https://picsum.photos/800/600?random=cyberpunk',
    initialGold: 800,
    initialMaterials: 150,
  },
  {
    id: 'modern',
    name: '苍蓝学园',
    desc: '和平的现代世界背面隐藏着异能。客人大多是学生和除灵师，适合发展“好朋友法则”。',
    difficulty: 'Easy',
    tags: ['#轻松', '#恋爱', '#校园怪谈'],
    previewImage: 'https://picsum.photos/800/600?random=modern',
    initialGold: 400,
    initialMaterials: 80,
  },
  {
    id: 'wasteland',
    name: '灰烬废土',
    desc: '极度危险。这里的人为了水和食物可以付出一切。高风险高回报。',
    difficulty: 'Hard',
    tags: ['#生存', '#辐射', '#变异'],
    previewImage: 'https://picsum.photos/800/600?random=wasteland',
    initialGold: 300,
    initialMaterials: 200,
  },
];

// 初始旅店风格选项数据
export const INN_STYLE_OPTIONS: InnStyleOption[] = [
  {
    id: 'oak',
    name: '橡木旅店',
    nameEn: 'The Oak Inn',
    desc: '西式经典、结实、传统、标准化。一栋维护良好的两层砖木建筑，门口挂着擦得锃亮的铜制招牌。',
    keywords: '西式经典、结实、传统、标准化',
    appearance:
      '一栋维护良好的两层砖木建筑，门口挂着擦得锃亮的铜制招牌。窗户玻璃明净，透出暖黄色的灯光。推门而入，大厅铺着整齐的木地板，虽然有些旧但打磨得很光滑，给人一种踏实、稳重的感觉。',
    cognitiveEffect: '人们会认为这是一家"口碑不错的老牌旅店"，价格适中，服务规矩，是大多数普通旅客的首选。',
    initialBonus: '因为形象正规且亲民，旅店的基础客流量提升 10%，更容易吸引普通市民和过路商队。',
    bonusName: '客源稳定',
    icon: 'oak',
    facilities: {
      客房: {
        等级: 1,
        当前等级描述: '标准的单人间，配有一张结实的木床和干净的亚麻床单，有一个小衣柜和书桌，整洁舒适。',
      },
      餐饮: {
        等级: 1,
        当前等级描述: '提供标准的家庭式料理，如烤面包、热炖菜和烤肉，食材新鲜，分量十足。',
      },
      调酒: {
        等级: 1,
        当前等级描述: '吧台供应当地常见的麦芽啤酒和普通葡萄酒，口感标准，价格公道。',
      },
    },
  },
  {
    id: 'street',
    name: '街角旅舍',
    nameEn: 'The Street Corner Motel',
    desc: '现代简约、高效、整洁、功能主义。典型的现代快捷酒店风格，拥有明亮的玻璃门和干净的白色外墙。',
    keywords: '现代简约、高效、整洁、功能主义',
    appearance:
      '典型的现代快捷酒店风格，拥有明亮的玻璃门和干净的白色外墙。大厅内设有前台接待处和几张供人休息的布艺沙发。照明充足，温度适宜，虽然缺乏装饰感，但胜在看起来非常卫生、正规。',
    cognitiveEffect: '人们会认为这是一家"连锁快捷酒店"，虽然没有特色，但胜在标准统一，不会踩雷，让人感到安心。',
    initialBonus: '现代化的设施布局让服务流程非常快，员工的工作效率提升 10%（如清洁房间、办理入住的速度更快）。',
    bonusName: '效率至上',
    icon: 'street',
    facilities: {
      客房: {
        等级: 1,
        当前等级描述: '紧凑的商务房，配有一张柔软度适中的弹簧床、床头柜和独立卫浴（淋浴），提供24小时热水。',
      },
      餐饮: {
        等级: 1,
        当前等级描述: '干净的用餐区，提供三明治、咖啡、简餐套餐，虽然像是半成品加热，但味道稳定且卫生。',
      },
      调酒: {
        等级: 1,
        当前等级描述: '一个玻璃冷柜，整齐陈列着各种罐装啤酒、苏打水和功能饮料。',
      },
    },
  },
  {
    id: 'crimson',
    name: '绯红民宿',
    nameEn: 'The Crimson B&B',
    desc: '居家、温馨、私密、小资。一栋看起来很温馨的红砖小楼，门口种着几盆修剪整齐的花草。',
    keywords: '居家、温馨、私密、小资',
    appearance:
      '一栋看起来很温馨的红砖小楼，门口种着几盆修剪整齐的花草。内部铺着地毯，墙上挂着几幅风景画。大厅里有一个不大的壁炉和几张舒适的扶手椅，氛围比较安静，像是在拜访一位朋友的家。',
    cognitiveEffect: '人们会认为这是一家"注重口碑的家庭旅馆"，通常接待那些不喜欢喧闹、追求品质的客人。',
    initialBonus: '温馨的氛围让客人更容易放松防备，入住客人对旅店的初始好感度 +10，更容易触发支线任务或打赏。',
    bonusName: '好感加成',
    icon: 'crimson',
    facilities: {
      客房: {
        等级: 1,
        当前等级描述: '充满居家气息的卧室，床铺柔软蓬松，窗帘遮光性很好，甚至还有一个小梳妆台。',
      },
      餐饮: {
        等级: 1,
        当前等级描述: '提供手工制作的家常菜，比如肉派、浓汤和刚出炉的饼干，味道很温馨。',
      },
      调酒: {
        等级: 1,
        当前等级描述: '只有几种店主私藏风格的红酒和花果茶，虽然种类少，但品质尚可。',
      },
    },
  },
  {
    id: 'bamboo',
    name: '青竹客栈',
    nameEn: 'The Bamboo Inn',
    desc: '东方、清爽、雅致、透气。一座干净清爽的木质小楼，周围有一圈竹篱笆。',
    keywords: '东方、清爽、雅致、透气',
    appearance:
      '一座干净清爽的木质小楼，周围有一圈竹篱笆。建筑通风采光很好，大厅摆放着几张方桌和长凳，擦拭得一尘不染。角落里点着淡淡的熏香，环境比普通酒馆要安静雅致不少。',
    cognitiveEffect: '人们会认为这是一家"格调不错的休息处"，适合那些想要远离喧嚣、静下心来吃顿饭睡个觉的人。',
    initialBonus: '清幽的环境有助于恢复精力，客人在店内休息时，体力和精力的恢复速度微幅提升（+5%）。',
    bonusName: '疲劳缓解',
    icon: 'bamboo',
    facilities: {
      客房: {
        等级: 1,
        当前等级描述: '铺设着木地板或榻榻米的房间，被褥干净整洁，窗外能看到一点绿植，令人心旷神怡。',
      },
      餐饮: {
        等级: 1,
        当前等级描述: '提供清淡可口的饭菜，如白米饭、炒时蔬、清蒸鱼和热茶，健康且落胃。',
      },
      调酒: {
        等级: 1,
        当前等级描述: '提供清酒、米酒和高品质的茶水，用瓷碗或陶杯盛装。',
      },
    },
  },
];

// 初始福利选项数据
export const PERK_OPTIONS: PerkOption[] = [
  {
    id: 'wealth',
    name: '装修基金',
    desc: '开局更容易获得高额的金币。',
    icon: 'gem',
  },
  {
    id: 'loyal-guard',
    name: '忠诚卫士',
    desc: '开局自带一名强力员工（高等级保镖或女仆）。',
    icon: 'shield',
  },
];

// 准入条件选项
export interface AccessModeOption {
  id: AccessMode;
  mode_name: string;
  condition: string;
  icon: string;
}

export const ACCESS_MODE_OPTIONS: AccessModeOption[] = [
  {
    id: 'physical',
    mode_name: '实体显现',
    condition:
      '无条件开放。旅店作为实体建筑存在于当地（如闹市区），任何路过的生物都能看到招牌、大门并推门而入。适合广纳客源。',
    icon: 'door',
  },
  {
    id: 'desperation',
    mode_name: '绝境救赎',
    condition:
      '唯心触发。旅店在物理层面不可见（或处于折叠空间）。只有当某一个体陷入极度绝望、濒死或强烈祈求时，旅店的大门才会突兀地出现在其面前（无论是在深海、坠落的半空还是万军丛中）。',
    icon: 'heart',
  },
  {
    id: 'temporal',
    mode_name: '抉择时刻',
    condition: '只有生活面临巨大分岔道路的抉择之人，才会看见旅馆的大门。',
    icon: 'clock',
  },
  {
    id: 'fated',
    mode_name: '命运节点',
    condition:
      '因果律筛选。旅店自动扫描位面，仅对"身负大气运者"、"即将改变世界线者"或"剧情关键角色"开放视野。普通人即便擦肩而过也无法察觉。',
    icon: 'star',
  },
];

// 随机旅店名称
export const RANDOM_INN_NAMES: string[] = [
  '多次元便携旅店',
  '无尽客栈',
  '位面尽头',
  '黑猫旅社',
  '星辰驿站',
  '时光酒馆',
  '命运之门',
  '虚空之眼',
  '跨域庇护所',
  '多元旅店',
];
