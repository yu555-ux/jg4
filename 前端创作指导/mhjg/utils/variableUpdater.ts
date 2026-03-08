/**
 * 变量更新工具
 * 统一更新最新消息楼层变量的 stat_data
 */

// 全局函数声明（由酒馆助手提供）
declare function getLastMessageId(): number;

/**
 * 更新最新消息楼层变量 stat_data 中的变量值（游戏过程中更新到最新楼层，如果没有最新楼层则更新到0层）
 * @param path 变量路径（相对于 stat_data，例如 '旅店.名称'）
 * @param value 新值
 * @param description 变量描述（可选，如果不提供则保持原有描述）
 */
export async function updateStatDataVariable(
  path: string,
  value: any,
  description?: string,
): Promise<boolean> {
  try {
    // 获取最新楼层 ID，如果不存在则使用0层
    const latestMessageId = getLastMessageId();
    const targetMessageId = latestMessageId >= 0 ? latestMessageId : 0;
    
    console.log(`📝 更新变量到楼层 ${targetMessageId}: stat_data.${path}`);

    // 获取目标楼层的变量表
    const variables = getVariables({ type: 'message', message_id: targetMessageId });
    const statData = variables?.stat_data || {};

    // 获取当前值（用于保持描述）
    const currentValue = getNestedValue(statData, path);
    let finalDescription = description;

    // 如果没有提供描述，尝试从当前值中获取描述
    if (!finalDescription && Array.isArray(currentValue) && currentValue.length === 2) {
      finalDescription = currentValue[1];
    }

    // 构建新值（MVU 格式：[值, "描述"]）
    const newValue = finalDescription ? [value, finalDescription] : value;

    // 使用 updateVariablesWith 更新目标楼层变量
    await updateVariablesWith(variables => {
      // 确保 stat_data 存在
      if (!variables.stat_data) {
        variables.stat_data = {};
      }

      // 设置嵌套值
      setNestedValue(variables.stat_data, path, newValue);

      return variables;
    }, { type: 'message', message_id: targetMessageId });

    console.log(`✅ 成功更新楼层 ${targetMessageId} 变量: stat_data.${path} =`, value);
    return true;
  } catch (error) {
    console.error(`❌ 更新变量失败: stat_data.${path}`, error);
    return false;
  }
}

/**
 * 更新最新消息楼层变量 stat_data 中的对象变量（用于更新嵌套对象，游戏过程中更新到最新楼层）
 * @param path 变量路径（相对于 stat_data）
 * @param updates 要更新的键值对
 */
export async function updateStatDataObject(
  path: string,
  updates: Record<string, any>,
): Promise<boolean> {
  try {
    // 获取最新楼层 ID，如果不存在则使用0层
    const latestMessageId = getLastMessageId();
    const targetMessageId = latestMessageId >= 0 ? latestMessageId : 0;
    
    console.log(`📝 更新对象变量到楼层 ${targetMessageId}: stat_data.${path}`);

    const variables = getVariables({ type: 'message', message_id: targetMessageId });
    const statData = variables?.stat_data || {};

    await updateVariablesWith(variables => {
      if (!variables.stat_data) {
        variables.stat_data = {};
      }

      // 获取当前对象
      const currentObj = getNestedValue(statData, path);
      let objValue: any;
      let objDescription: string | undefined;

      // 处理 MVU 格式 [值, "描述"]
      if (Array.isArray(currentObj) && currentObj.length === 2) {
        objValue = currentObj[0] || {};
        objDescription = currentObj[1];
      } else if (currentObj && typeof currentObj === 'object') {
        objValue = currentObj;
      } else {
        objValue = {};
      }

      // 更新对象
      const updatedObj = { ...objValue, ...updates };

      // 设置新值（保持描述）
      const newValue = objDescription ? [updatedObj, objDescription] : updatedObj;
      setNestedValue(variables.stat_data, path, newValue);

      return variables;
    }, { type: 'message', message_id: targetMessageId });

    console.log(`✅ 成功更新楼层 ${targetMessageId} 对象: stat_data.${path}`, updates);
    return true;
  } catch (error) {
    console.error(`❌ 更新对象失败: stat_data.${path}`, error);
    return false;
  }
}

/**
 * 获取嵌套对象的值
 * 注意：只有叶子节点是 MVU 格式 [值, "描述"]，中间节点都是普通对象
 */
function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.');
  let value = obj;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (value === null || value === undefined) {
      return undefined;
    }
    // 处理 MVU 格式 [值, "描述"]（只对中间节点处理，叶子节点保持原样）
    if (Array.isArray(value) && value.length > 0 && i < keys.length - 1) {
      value = value[0];
    }
    value = value[key];
  }
  return value;
}

/**
 * 设置嵌套对象的值
 * 注意：确保中间节点是对象，叶子节点设置为 MVU 格式 [值, "描述"]
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    // 如果当前键不存在，创建对象
    if (!current[key]) {
      current[key] = {};
    } else {
      // 如果当前键是 MVU 格式 [值, "描述"]，取第一个元素（值）
      if (Array.isArray(current[key]) && current[key].length > 0) {
        current[key] = current[key][0];
      }
      // 确保是对象类型
      if (typeof current[key] !== 'object' || Array.isArray(current[key])) {
        current[key] = {};
      }
    }
    current = current[key];
  }
  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;
}
