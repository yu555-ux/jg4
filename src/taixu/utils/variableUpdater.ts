import _ from 'lodash';
import { klona } from 'klona';

/**
 * 将 JSON Patch 路径转换为 lodash 路径
 * 处理 / -> . 以及 ~1 -> / 和 ~0 -> ~
 */
function jsonPatchPathToLodash(path: string): string {
  return path
    .replace(/^\//, '')
    .replace(/~1/g, '/')
    .replace(/~0/g, '~')
    .split('/')
    .join('.');
}

/**
 * 应用更新到变量中
 * @param currentData 当前的 stat_data 对象
 * @param updates 解析出来的更新列表 (可以是 JSON Patch 对象，也可以是斜杠命令字符串)
 * @returns 更新后的对象（副本）
 */
export async function applyUpdates(currentData: any, updates: any[]): Promise<any> {
  const newData = klona(currentData);
  let hasChanged = false;

  for (const update of updates) {
    if (typeof update === 'string') {
      // 处理斜杠命令模式 (退化方案)
      // 注意：斜杠命令通常通过 triggerSlash 直接执行，不由这里处理逻辑
      // 但为了兼容性，如果未来需要由前端模拟执行，可以在这里添加逻辑
      continue;
    }

    // 处理 JSON Patch 模式
    try {
      const { op, path, value } = update;
      const lodashPath = jsonPatchPathToLodash(path);

      if (op === 'replace') {
        _.set(newData, lodashPath, value);
        hasChanged = true;
      } else if (op === 'delta') {
        // 增量更新：取当前值并累加
        const currentVal = _.get(newData, lodashPath, 0);
        if (typeof currentVal === 'number' && typeof value === 'number') {
          _.set(newData, lodashPath, currentVal + value);
          hasChanged = true;
        }
      } else if (op === 'insert') {
        // 针对对象：等同于添加键值对；针对数组 (/-)：末尾追加
        if (path.endsWith('/-')) {
          const arrayPath = jsonPatchPathToLodash(path.slice(0, -2));
          const arr = _.get(newData, arrayPath);
          if (Array.isArray(arr)) {
            arr.push(value);
          } else {
            _.set(newData, arrayPath, [value]);
          }
        } else {
          _.set(newData, lodashPath, value);
        }
        hasChanged = true;
      } else if (op === 'remove') {
        _.unset(newData, lodashPath);
        hasChanged = true;
      } else if (op === 'move') {
        const fromPath = jsonPatchPathToLodash(update.from);
        const val = _.get(newData, fromPath);
        _.unset(newData, fromPath);
        _.set(newData, lodashPath, val);
        hasChanged = true;
      }
    } catch (e) {
      console.warn('[variableUpdater] 应用 Patch 失败:', update, e);
    }
  }

  return hasChanged ? newData : currentData;
}

/**
 * 执行所有类型的更新（包括斜杠命令）
 * @param updates 解析出来的更新列表
 * @param currentData 当前变量数据
 * @param onDataUpdate 数据更新后的回调
 */
export async function executeAllUpdates(
  updates: any[],
  currentData: any,
  onDataUpdate: (newData: any) => void
) {
  const jsonPatches = updates.filter(u => typeof u === 'object');
  const slashCommands = updates.filter(u => typeof u === 'string');

  // 1. 执行 JSON Patch 更新
  if (jsonPatches.length > 0) {
    const newData = await applyUpdates(currentData, jsonPatches);
    if (newData !== currentData) {
      onDataUpdate(newData);
    }
  }

  // 2. 执行斜杠命令更新
  for (const cmd of slashCommands) {
    try {
      await triggerSlash(cmd);
    } catch (e) {
      console.warn(`[variableUpdater] 斜杠命令执行失败: ${cmd}`, e);
    }
  }
}
