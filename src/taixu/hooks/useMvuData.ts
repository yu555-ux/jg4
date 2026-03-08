import _ from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { loadFromLatestMessage } from '../utils/messageParser';
import { calculateCorrectedStats } from '../utils/statCalculator';

type ApToken =
  | { kind: 'spend'; amount: number; ts: number }
  | { kind: 'reset'; target: number; ts: number };

const getApToken = () => (window as any).taixujie_ap_token as ApToken | undefined;
const clearApToken = () => {
  delete (window as any).taixujie_ap_token;
};

const isRecentToken = (token: ApToken | undefined) => {
  if (!token) return false;
  return Date.now() - token.ts < 8000;
};

const ensureSys = (data: any) => {
  if (!data.仙玉录) {
    data.仙玉录 = { 等级: 1, 经验值: 0, 仙缘: 0, 当前行动点: 0, 最大行动点: 0 };
  }
  return data.仙玉录;
};

const sumApIncreaseForLevels = (fromLevel: number, toLevel: number) => {
  let sum = 0;
  for (let lv = fromLevel + 1; lv <= toLevel; lv += 1) {
    // 升到 Lv2 增加 2，Lv3 增加 4，Lv4 增加 6 ...
    sum += 2 * (lv - 1);
  }
  return sum;
};

/**
 * 检查 stat_data 是否有实际内容（不是空对象）
 */
function hasStatDataContent(stat_data: any): boolean {
  if (!stat_data || typeof stat_data !== 'object') {
    return false;
  }
  return Object.keys(stat_data).length > 0;
}

/**
 * 仿照 mhjg 的多级回退读取逻辑
 */
type EffectiveMvuData = {
  statData: any | null;
  source: { type: 'message'; message_id: 'latest' | number } | null;
};

function getEffectiveMvuData(): EffectiveMvuData {
  // 1. 优先尝试从最新助手消息读取 (最可靠的数据源)
  try {
    const assistantMessages = getChatMessages(-1, { role: 'assistant' });
    if (assistantMessages && assistantMessages.length > 0) {
      const latestAssistant = assistantMessages[assistantMessages.length - 1];
      const messageId = latestAssistant.message_id;

      // 尝试从该消息的 Mvu 数据读取
      if (typeof Mvu !== 'undefined' && typeof Mvu.getMvuData === 'function') {
        const mvuData = Mvu.getMvuData({ type: 'message', message_id: messageId });
        if (mvuData?.stat_data && hasStatDataContent(mvuData.stat_data)) {
          return { statData: mvuData.stat_data, source: { type: 'message', message_id: messageId } };
        }
      }

      // 备选：从 getVariables 读取
      const variables = getVariables({ type: 'message', message_id: messageId });
      if (variables?.stat_data && hasStatDataContent(variables.stat_data)) {
        return { statData: variables.stat_data, source: { type: 'message', message_id: messageId } };
      }

      // 【修正】如果最新助手消息没数据（可能正在生成），尝试读取上一个助手消息
      if (assistantMessages.length > 1) {
        const prevAssistant = assistantMessages[assistantMessages.length - 2];
        const prevVariables = getVariables({ type: 'message', message_id: prevAssistant.message_id });
        if (prevVariables?.stat_data && hasStatDataContent(prevVariables.stat_data)) {
          return { statData: prevVariables.stat_data, source: { type: 'message', message_id: prevAssistant.message_id } };
        }
      }
    }
  } catch {
    /* 忽略读取错误 */
  }

  // 2. 尝试使用 Mvu 全局接口读取最新楼层
  try {
    if (typeof Mvu !== 'undefined' && typeof Mvu.getMvuData === 'function') {
      const mvuData = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
      if (mvuData?.stat_data && hasStatDataContent(mvuData.stat_data)) {
        return { statData: mvuData.stat_data, source: { type: 'message', message_id: 'latest' } };
      }
    }
  } catch {
    /* 忽略读取错误 */
  }

  // 3. 尝试从最新楼层变量直接读取
  try {
    const variables = getVariables({ type: 'message', message_id: 'latest' });
    if (variables?.stat_data && hasStatDataContent(variables.stat_data)) {
      return { statData: variables.stat_data, source: { type: 'message', message_id: 'latest' } };
    }
  } catch {
    /* 忽略读取错误 */
  }

  // 4. 尝试从 0 层（初始层）读取
  try {
    const variables = getVariables({ type: 'message', message_id: 0 });
    if (variables?.stat_data && hasStatDataContent(variables.stat_data)) {
      return { statData: variables.stat_data, source: { type: 'message', message_id: 0 } };
    }
  } catch {
    /* 忽略读取错误 */
  }

  return { statData: null, source: null };
}

/**
 * 这是一个适配 React 的 MVU 数据捕获 Hook
 * 参考 mhjg 的稳健读取机制进行重构
 */
type SchemaInput<T extends z.ZodTypeAny> = T | (() => T);

function resolveSchema<T extends z.ZodTypeAny>(input: SchemaInput<T>): T {
  if (typeof input === 'function') {
    try {
      return (input as () => T)();
    } catch {
      return z.object({}).passthrough() as T;
    }
  }
  return input;
}

export function useMvuData<T extends z.ZodTypeAny>(schemaInput: SchemaInput<T>) {
  const schema = useMemo(() => resolveSchema(schemaInput), [schemaInput]);
  const [data, setData] = useState<z.infer<T>>(() => {
    const { statData } = getEffectiveMvuData();
    const effective = statData || {};
    const result = schema.safeParse(effective);
    if (result.success) return result.data;

    // 如果解析失败，尝试解析空对象以获取默认值
    const defaultResult = schema.safeParse({});
    if (defaultResult.success) return defaultResult.data;
    return effective as any;
  });

  const isCorrectingRef = useRef(false);
  const sexyFlagRef = useRef<boolean | null>(null);

  const getSexyFlag = (target: any) => {
    const val = target?.事件标志?.色色模式;
    return typeof val === 'boolean' ? val : null;
  };

  const updateData = useCallback(() => {
    // 使用变量记录定时器，实现防抖
    if ((window as any).taixujie_mvu_timer) {
      clearTimeout((window as any).taixujie_mvu_timer);
    }

    (window as any).taixujie_mvu_timer = setTimeout(() => {
      try {
        const { isPending } = loadFromLatestMessage();

        // 【流式保护】如果当前正在思考或标签未闭合，且不是由 MVU 事件触发的更新，拒绝更新变量
        // 注意：如果是 VARIABLE_UPDATE_ENDED 触发的，说明 MVU 已经处理完了一波变量，此时应该更新 UI
        if (isPending) {
          // 检查是否有 stat_data 可读，如果有，说明 MVU 已经处理过一部分了
          const { statData } = getEffectiveMvuData();
          if (!statData) return;
        }

        let { statData, source } = getEffectiveMvuData();

        // 【稳健性保护】如果没读到有效内容，跳过更新，保持当前 UI 状态
        if (!statData) {
          return;
        }

        const lockedSexy = sexyFlagRef.current;
        if (typeof lockedSexy === 'boolean') {
          const nextFlags = { ...(statData.事件标志 || {}) };
          if (nextFlags.色色模式 !== lockedSexy) {
            nextFlags.色色模式 = lockedSexy;
            statData = { ...statData, 事件标志: nextFlags };

            const target = source ?? { type: 'message', message_id: 'latest' as const };
            const variables = getVariables(target) || {};
            variables.stat_data = statData;
            if (typeof Mvu !== 'undefined' && typeof Mvu.replaceMvuData === 'function') {
              Mvu.replaceMvuData({ stat_data: statData } as any, target);
            } else {
              replaceVariables(variables, target);
            }
            eventEmit('PSEUDO_SAME_LAYER_UPDATE');
          }
        } else {
          const initSexy = getSexyFlag(statData);
          if (typeof initSexy === 'boolean') {
            sexyFlagRef.current = initSexy;
          }
        }

        // --- 自动纠正逻辑 ---
        if (!isCorrectingRef.current) {
          const correctedData = calculateCorrectedStats(statData);
          if (!_.isEqual(statData, correctedData)) {
            console.info('[MVU Hook] 检测到数值偏差，正在自动纠正并同步回酒馆...');
            isCorrectingRef.current = true;

            // 局部更新 stat_data 并写回（写回到真实来源楼层）
            const target = source ?? { type: 'message', message_id: 'latest' as const };
            const variables = getVariables(target) || {};
            variables.stat_data = correctedData;

            // 优先使用 Mvu 接口写回
            if (typeof Mvu !== 'undefined' && typeof Mvu.replaceMvuData === 'function') {
              Mvu.replaceMvuData({ stat_data: correctedData } as any, target);
            } else {
              replaceVariables(variables, target);
            }

            // 触发内部更新事件
            eventEmit('PSEUDO_SAME_LAYER_UPDATE');

            // 1秒后重置纠正锁，防止死循环
            setTimeout(() => { isCorrectingRef.current = false; }, 1000);
            return;
          }
        }

        // 核心逻辑：读取变量，前端显示变量
        const result = schema.safeParse(statData);
        if (result.success) {
          const nextSexy = getSexyFlag(result.data);
          if (typeof nextSexy === 'boolean') {
            sexyFlagRef.current = nextSexy;
          }
          setData(prev => {
            if (_.isEqual(prev, result.data)) return prev;
            console.info('[MVU Hook] 数据已同步至界面');
            return result.data;
          });
        } else {
          console.warn('[MVU Hook] 运行时数据校验未通过，保持旧状态:', result.error.format());
        }
      } catch (e) {
        console.error('[MVU Hook] 数据同步失败:', e);
      } finally {
        (window as any).taixujie_mvu_timer = null;
      }
    }, 150); // 降低延迟到 150ms 并配合防抖，响应更快
  }, [schema]);

  // 保存数据到最新楼层（仅用于前端 UI 交互触发的修改）
  const saveData = useCallback((newData: z.infer<T>) => {
    try {
      const result = schema.safeParse(newData);
      if (result.success) {
        const nextSexy = getSexyFlag(result.data);
        if (typeof nextSexy === 'boolean') {
          sexyFlagRef.current = nextSexy;
        }
        setData(result.data);
        const target = { type: 'message', message_id: 'latest' as const };
        if (typeof Mvu !== 'undefined' && typeof Mvu.replaceMvuData === 'function') {
          let nextMvuData: any = null;
          try {
            if (typeof Mvu.getMvuData === 'function') {
              nextMvuData = Mvu.getMvuData(target);
            }
          } catch {
            nextMvuData = null;
          }
          if (!nextMvuData || typeof nextMvuData !== 'object') {
            nextMvuData = {};
          }
          nextMvuData.stat_data = result.data;
          Mvu.replaceMvuData(nextMvuData as any, target);
        } else {
          const variables = getVariables(target) || {};
          variables.stat_data = result.data;
          replaceVariables(variables, target);
        }
        eventEmit('PSEUDO_SAME_LAYER_UPDATE');
      }
    } catch (e) {
      console.error('[MVU Hook] 数据保存失败:', e);
    }
  }, [schema]);

  useEffect(() => {
    const stops: EventOnReturn[] = [
      eventOn(tavern_events.MESSAGE_RECEIVED, updateData),
      eventOn(tavern_events.MESSAGE_UPDATED, updateData),
      eventOn(tavern_events.MESSAGE_EDITED, updateData),
      eventOn(tavern_events.CHAT_CHANGED, updateData),
      eventOn('PSEUDO_SAME_LAYER_UPDATE', updateData)
    ];

    // 确保 MVU 框架初始化完成后再进行首次数据同步及监听 MVU 事件
    const initMvu = async () => {
      try {
        if (typeof waitGlobalInitialized === 'function') {
          await waitGlobalInitialized('Mvu');

          // Mvu 初始化后，注册相关事件
          if (typeof Mvu !== 'undefined' && Mvu.events) {
            stops.push(eventOn(Mvu.events.VARIABLE_UPDATE_STARTED, (variables: any) => {
              try {
                if (!variables || typeof variables !== 'object') return;
                if (!variables.delta_data || typeof variables.delta_data !== 'object') {
                  variables.delta_data = {};
                }
                const ensureDeltaObject = (path: string) => {
                  const value = _.get(variables.delta_data, path);
                  if (!value || typeof value !== 'object' || Array.isArray(value)) {
                    _.set(variables.delta_data, path, {});
                  }
                };
                ensureDeltaObject('任务清单');
                ensureDeltaObject('当前状态');
                ensureDeltaObject('储物空间');
                ensureDeltaObject('尘缘羁绊');
                ensureDeltaObject('天赋灵根');
                ensureDeltaObject('仙玉权柄');
                ensureDeltaObject('成就列表');
              } catch (e) {
                console.warn('[MVU Hook] 预设 delta_data 父对象失败:', e);
              }
            }));
            stops.push(eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, (newVariables: any, oldVariables: any) => {
              try {
                if (!newVariables?.stat_data || !oldVariables?.stat_data) return;
                const next = newVariables.stat_data;
                const prev = oldVariables.stat_data;

                const ensureObject = (path: string) => {
                  const value = _.get(next, path);
                  if (!value || typeof value !== 'object' || Array.isArray(value)) {
                    _.set(next, path, {});
                  }
                };
                ensureObject('任务清单');
                ensureObject('当前状态');
                ensureObject('储物空间');
                ensureObject('尘缘羁绊');
                ensureObject('天赋灵根');
                ensureObject('仙玉权柄');
                ensureObject('成就列表');

                const ensureArray = (path: string) => {
                  const value = _.get(next, path);
                  if (!Array.isArray(value)) {
                    _.set(next, path, []);
                  }
                };
                ensureArray('灵宠列表');
                ensureArray('邪物收容');

                const tasks = next.任务清单;
                if (tasks && typeof tasks === 'object') {
                  const cleaned = Object.fromEntries(
                    Object.entries(tasks).filter(([_, task]: [string, any]) => task?.状态 !== '已结算')
                  );
                  if (!_.isEqual(cleaned, tasks)) {
                    next.任务清单 = cleaned;
                  }
                }

                // --- 规则约束：禁止更新字段 & 数值范围限制（不含仙缘商城） ---
                const revertPaths = [
                  '角色基础.最大生命',
                  '角色基础.最大灵气',
                  '角色基础.最大道心',
                  '角色基础.当前根骨',
                  '角色基础.当前神海',
                  '角色基础.当前身法',
                  '角色基础.当前横练',
                  '角色基础.当前杀伐',
                  '角色基础.当前神伤',
                  '角色基础.当前悟性',
                  '角色基础.当前魅力',
                  '角色基础.当前气运',
                  '仙玉录.经验值',
                  '仙玉录.当前行动点',
                  '仙玉录.最大行动点',
                ];
                revertPaths.forEach(path => {
                  if (!_.has(prev, path)) return;
                  _.set(next, path, _.get(prev, path));
                });

                const clampPath = (path: string, min: number, max: number) => {
                  const value = Number(_.get(next, path));
                  if (Number.isNaN(value)) return;
                  _.set(next, path, _.clamp(value, min, max));
                };
                clampPath('世界信息.侵蚀度', 0, 100);
                clampPath('角色基础.修行进度', 0, 100);
                clampPath('角色基础.兴奋值', 0, 100);
                clampPath('角色基础.依存度', -200, 200);

                // --- 经验值：仅由依存度/总堕落值增量驱动 ---
                const prevDep = Number(_.get(prev, '角色基础.依存度') ?? 0);
                const nextDep = Number(_.get(next, '角色基础.依存度') ?? 0);
                const prevCor = Number(_.get(prev, '角色基础.总堕落值') ?? 0);
                const nextCor = Number(_.get(next, '角色基础.总堕落值') ?? 0);

                const depDelta = Math.max(0, nextDep - prevDep);
                const corDelta = Math.max(0, nextCor - prevCor);

                const prevSys = ensureSys(prev);
                const nextSys = ensureSys(next);

                const expIncrease = depDelta * 30 + corDelta * 10;
                const nextExp = Math.max(0, Number(prevSys.经验值 ?? 0) + expIncrease);
                nextSys.经验值 = nextExp;

                // 由经验值决定等级
                const computedLevel = 1 + Math.floor(nextExp / 1000);
                const prevLevel = Number(prevSys.等级 ?? 1);
                nextSys.等级 = computedLevel;

                // --- 最大行动点：仅在等级提升时增加 ---
                const prevMaxAp = Number(prevSys.最大行动点 ?? 0);
                let nextMaxAp = prevMaxAp;
                if (computedLevel > prevLevel) {
                  nextMaxAp = prevMaxAp + sumApIncreaseForLevels(prevLevel, computedLevel);
                }
                nextSys.最大行动点 = nextMaxAp;

                // --- 当前行动点：仅允许前端扣除 / 子时恢复 / 升级回满 ---
                const prevCurAp = Number(prevSys.当前行动点 ?? 0);
                const nextCurAp = Number(nextSys.当前行动点 ?? 0);
                const token = getApToken();
                const allowToken = isRecentToken(token);

                let allowCurrentAp = false;
                if (computedLevel > prevLevel) {
                  // 升级时回满
                  nextSys.当前行动点 = nextMaxAp;
                  allowCurrentAp = true;
                } else if (allowToken && token?.kind === 'spend') {
                  if (nextCurAp === prevCurAp - token.amount) {
                    allowCurrentAp = true;
                  }
                } else if (allowToken && token?.kind === 'reset') {
                  if (nextCurAp === token.target) {
                    allowCurrentAp = true;
                  }
                }

                if (!allowCurrentAp) {
                  nextSys.当前行动点 = prevCurAp;
                }

                if (allowToken) {
                  clearApToken();
                }
              } catch (e) {
                console.warn('[MVU Hook] 仙玉录修正失败:', e);
              }
            }));
            stops.push(eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, updateData));
            stops.push(eventOn(Mvu.events.VARIABLE_INITIALIZED, updateData));
          }
        }
      } catch (e) {
        console.warn('[MVU Hook] 等待 Mvu 初始化超时或失败:', e);
      }
      updateData();
    };

    initMvu();

    return () => {
      stops.forEach(s => s.stop());
    };
  }, [updateData]);

  return [data, saveData] as const;
}
