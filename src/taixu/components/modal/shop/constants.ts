export const SHOP_CATEGORIES = ['全部', '功法', '武器', '装备', '法宝', '着装', '丹药', '阵符', '特殊'] as const;
export const ITEM_CATEGORIES = SHOP_CATEGORIES.filter(category => category !== '全部');
export const CLOTHING_TYPES = ['上衣', '下衣', '内衣', '鞋子', '袜子', '佩戴物'] as const;
export const RANKS = ['仙', '天', '地', '玄', '黄', '凡'] as const;
export const ITEMS_PER_PAGE = 8;
