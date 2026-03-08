// Extracted from 前端创作指导/凡人修仙代码学习
// Focus: Dexie DB setup + helper accessors

const db = new Dexie('CultivationDB');

// 【第二阶段】版本 5：添加向量表的元数据索引
// NOTE: Keep version order consistent with original file.
db.version(5).stores({
  archives: '&name',
  settings: '&key',
  backgrounds: '++id',
  npcAvatars: '++id',
  vectors: '++id, source, archiveId, scope, [scope+archiveId]',
});

db.version(4).stores({
  archives: '&name',
  settings: '&key',
  backgrounds: '++id',
  npcAvatars: '++id',
  vectors: '++id, source',
});

db.version(3)
  .stores({
    archives: '&name',
    settings: '&key',
    backgrounds: '++id',
    npcAvatars: '++id',
  })
  .upgrade(tx => {
    // This upgrade function is for migrating from version 2 to 3 if needed.
  });

db.version(2)
  .stores({
    archives: '&name',
    settings: '&key',
    backgrounds: '++id',
  })
  .upgrade(tx => {
    // This upgrade function is for migrating from version 1 to 2 if needed.
  });

db.version(1).stores({
  archives: '&name',
  settings: '&key',
});

function recursivelyParseJsonStrings(data) {
  // 1. 基础类型直接返回，减少栈调用
  if (typeof data !== 'string' && typeof data !== 'object') return data;
  if (data === null) return null;

  if (typeof data === 'string') {
    const trimmed = data.trim();
    const firstChar = trimmed.charAt(0);
    const lastChar = trimmed.charAt(trimmed.length - 1);

    if (!((firstChar === '{' && lastChar === '}') || (firstChar === '[' && lastChar === ']'))) {
      return data;
    }

    try {
      const parsedData = JSON.parse(trimmed);
      return recursivelyParseJsonStrings(parsedData);
    } catch (e) {
      try {
        if (trimmed.includes("'")) {
          const fixedString = trimmed.replace(/'/g, '"');
          const parsedData = JSON.parse(fixedString);
          return recursivelyParseJsonStrings(parsedData);
        }
      } catch (e2) {
        return data;
      }
      return data;
    }
  } else if (Array.isArray(data)) {
    const len = data.length;
    const newArr = new Array(len);
    for (let i = 0; i < len; i++) {
      newArr[i] = recursivelyParseJsonStrings(data[i]);
    }
    return newArr;
  } else if (typeof data === 'object') {
    const newObj = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        newObj[key] = recursivelyParseJsonStrings(data[key]);
      }
    }
    return newObj;
  }
  return data;
}

async function dbGet(key) {
  const setting = await db.settings.get(key);
  return setting ? setting.value : null;
}

async function dbSet(key, value) {
  return await db.settings.put({ key, value });
}

async function dbRemove(key) {
  return await db.settings.delete(key);
}

// Export-style (adapt as needed)
// module.exports = { db, dbGet, dbSet, dbRemove, recursivelyParseJsonStrings };
