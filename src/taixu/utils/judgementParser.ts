export type JudgementResultType = '大成功' | '极难成功' | '成功' | '失败' | '大失败' | '未知';

export interface BaseJudgement {
  type: string;
  raw: string;
  content: string;
  result: JudgementResultType;
  calculation?: string;
  scenario?: string;
}

export interface AttributeJudgement extends BaseJudgement {
  attribute: string;
  dc?: number;
  currentValue?: number;
  successRate?: string;
  diceRoll?: number;
  finalDice?: number;
  currentLuck?: number;
  coreValue?: number;
}

export interface DaoXinJudgement extends BaseJudgement {
  horrorLevel: string;
  currentDaoXin: number;
  deductionRule?: string;
  coreValue?: number;
  finalDice?: number;
  resultLevel?: string;
  loss?: string;
  newState?: string;
  update?: string;
}

export interface CombatJudgement extends BaseJudgement {
  attackType: string;
  method: string;
  rank: string;
  isHit: boolean;
  isCritical: boolean;
  resultText?: string;
  attacker: {
    name: string;
    hp?: string;
    mp?: string;
    realm: string;
    stats: string;
  };
  defender: {
    name: string;
    hp?: string;
    mp?: string;
    realm: string;
    stats: string;
  };
  damage?: string;
  damageValue: number;
  mpUpdate?: string;
  mpCost?: string;
}

export function parseJudgements(text: string): (AttributeJudgement | DaoXinJudgement | CombatJudgement | BaseJudgement)[] {
  const judgements: any[] = [];
  // 仅支持 [] 包裹方式
  const regex = /\[([\s\S]*?)\]/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const rawContent = match[0];
    const innerContent = match[1].trim();

    // 提取计算过程 (优先找 HTML 注释，找不到则找“计算门槛分级”部分)
    const calcMatch = innerContent.match(/<!--([\s\S]*?)-->/);
    let calculation = calcMatch ? calcMatch[1].trim() : undefined;

    if (!calculation) {
      const calcSectionMatch = innerContent.match(/(?:计算门槛分级|判定门槛分级|计算分级门槛)[\s\S]*/);
      if (calcSectionMatch) {
        calculation = calcSectionMatch[0].trim();
      }
    }

    // 移除注释后的纯文本内容用于解析字段
    const cleanInner = innerContent.replace(/<!--[\s\S]*?-->/g, '').trim();
    const lines = cleanInner.split('\n').map(l => l.trim()).filter(l => l);

    // 基础信息提取
    const firstLine = lines[0] || '';
    const typeMatch = firstLine.match(/类型:\s*([^|]+)/);
    const type = typeMatch ? typeMatch[1].trim() : '未知';

    // 结果提取 (从后往前找包含关键字的行)
    let result: JudgementResultType = '未知';
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (line.includes('大成功')) { result = '大成功'; break; }
      if (line.includes('极难成功')) { result = '极难成功'; break; }
      if (line.includes('大失败')) { result = '大失败'; break; }
      if (line.includes('成功')) { result = '成功'; break; }
      if (line.includes('失败')) { result = '失败'; break; }
    }

    if (type.includes('属性判定') || type.includes('属性检定')) {
      const attrMatch = cleanInner.match(/属性:\s*([^|\]\n]+)/);
      const dcMatch = cleanInner.match(/DC:\s*(\d+)/) || cleanInner.match(/目标难度\(DC\):\s*(\d+)/);
      const valMatch = cleanInner.match(/当前值:\s*(\d+)/) || cleanInner.match(/当前属性值:\s*(\d+)/) || cleanInner.match(/当前数值:\s*(\d+)/) || cleanInner.match(/角色[^:]+:\s*(\d+)/);
      const scenarioMatch = cleanInner.match(/情景:\s*([^|\]\n]+)/);

      // 提取投骰结果
      const originalDiceMatch = cleanInner.match(/本次投骰结果:.*?\(([^)]+)\)/);
      const finalDiceMatch = cleanInner.match(/最终投骰:\s*(\d+)/) || cleanInner.match(/经气运修正后的最终结果:\s*(\d+)/);
      const currentLuckMatch = cleanInner.match(/当前气运[:：]\s*(\d+)/) || cleanInner.match(/气运[:：]\s*(\d+)/);
      const coreValueMatch = cleanInner.match(/核心判定(?:值|位)\s*\(?\s*(\d+)\s*\)?/);
      const successRateLineMatch = cleanInner.match(/最终成功率[:：][^\n]*/);
      let successRate: string | undefined;
      if (successRateLineMatch) {
        const line = successRateLineMatch[0];
        const percentMatches = [...line.matchAll(/(\d+(?:\.\d+)?)(?=%)/g)].map(m => m[1]);
        if (percentMatches.length > 0) {
          successRate = `${percentMatches[percentMatches.length - 1]}%`;
        } else {
          const nums = [...line.matchAll(/(\d+(?:\.\d+)?)/g)].map(m => m[1]);
          if (nums.length > 0) successRate = `${nums[nums.length - 1]}%`;
        }
      }

      const coreValue = coreValueMatch
        ? parseInt(coreValueMatch[1])
        : (originalDiceMatch ? parseInt(originalDiceMatch[1]) : undefined);

      const isPotential = type.includes('潜质') || ['悟性', '魅力', '气运'].includes(attrMatch ? attrMatch[1].trim() : '');

      judgements.push({
        type: isPotential ? 'attribute_potential' : 'attribute_basic',
        raw: rawContent,
        content: cleanInner,
        result,
        calculation,
        attribute: attrMatch ? attrMatch[1].trim() : '未知',
        dc: dcMatch ? parseInt(dcMatch[1]) : undefined,
        currentValue: valMatch ? parseInt(valMatch[1]) : undefined,
        scenario: scenarioMatch ? scenarioMatch[1].trim() : undefined,
        diceRoll: originalDiceMatch ? parseInt(originalDiceMatch[1]) : undefined,
        finalDice: finalDiceMatch ? parseInt(finalDiceMatch[1]) : undefined,
        currentLuck: currentLuckMatch ? parseInt(currentLuckMatch[1]) : undefined,
        coreValue,
        successRate,
      });
    } else if (type.includes('道心判定')) {
      const levelMatch = cleanInner.match(/恐怖等阶:\s*([^|\]\n]+)/);
      const valMatch = cleanInner.match(/当前道心:\s*(\d+)/);
      const scenarioMatch = cleanInner.match(/情景:\s*([^|\]\n]+)/);
      const ruleMatch = cleanInner.match(/当前等级扣除规则[:：]\s*([^|\]\n]+)/);
      const coreValueMatch = cleanInner.match(/核心判定(?:值|位)\s*\(?\s*(\d+)\s*\)?/);
      const finalDiceMatch = cleanInner.match(/最终投骰[:：]\s*(\d+)/);
      const resultLevelMatch = cleanInner.match(/判定结果[:：]\s*([^|\]\n]+)/);
      const lossMatch = cleanInner.match(/道心损耗：?\s*([^|\]\n]+)/) || cleanInner.match(/道心损耗\s*([^|\]\n]+)/);
      const stateMatch = cleanInner.match(/状态更新：?\s*([^|\]\n]+)/) || cleanInner.match(/当前道心结算:\s*([^|\]\n]+)/);
      const updateMatch = cleanInner.match(/更新[:：]\s*([^|\]\n]+)/);

      judgements.push({
        type: 'daoxin',
        raw: rawContent,
        content: cleanInner,
        result,
        calculation,
        horrorLevel: levelMatch ? levelMatch[1].trim() : '未知',
        currentDaoXin: valMatch ? parseInt(valMatch[1]) : 0,
        scenario: scenarioMatch ? scenarioMatch[1].trim() : undefined,
        deductionRule: ruleMatch ? ruleMatch[1].trim() : undefined,
        coreValue: coreValueMatch ? parseInt(coreValueMatch[1]) : undefined,
        finalDice: finalDiceMatch ? parseInt(finalDiceMatch[1]) : undefined,
        resultLevel: resultLevelMatch ? resultLevelMatch[1].trim() : undefined,
        loss: lossMatch ? lossMatch[1].trim() : undefined,
        newState: stateMatch ? stateMatch[1].trim() : undefined,
        update: updateMatch ? updateMatch[1].trim() : undefined,
      });
    } else if (type.includes('斗法对抗')) {
      const attackTypeMatch = cleanInner.match(/攻击方式:\s*([^|\]\n]+)/);
      const methodMatch = cleanInner.match(/所用(?:功法|武器):\s*([^|\]\n]+)/);
      const rankMatch = methodMatch ? methodMatch[1].match(/\(([^)]+)\)/) : null;
      const mpCostMatch = cleanInner.match(/消耗\s*(\d+)\s*点灵气/);

      // 检查命中与暴击
      const hitMatch = cleanInner.match(/- 命中:\s*[^(\n]+\((成功|失败)\)/);
      const critMatch = cleanInner.match(/- 暴击:\s*[^(\n]+\((成功|失败)\)/);
      const isHit = hitMatch ? hitMatch[1] === '成功' : true;
      const isCritical = critMatch ? critMatch[1] === '成功' : false;

      // 提取伤害数值
      const damageMatch = cleanInner.match(/最终伤害:\s*([^|\]\n]+)/) || cleanInner.match(/生命值减少\s*([^|\]\n]+?)\s*点/);
      let damageValue = 0;
      if (damageMatch) {
        const rawDamage = damageMatch[1] || damageMatch[0];
        const equalsMatch = rawDamage.match(/=\s*(\d+)/);
        if (equalsMatch) {
          damageValue = parseInt(equalsMatch[1]);
        } else {
          const valMatch = rawDamage.match(/(\d+)/);
          if (valMatch) damageValue = parseInt(valMatch[1]);
        }
      }

      // 提取结果区段
      let resultText: string | undefined;
      const resultSectionMatch = cleanInner.match(/结果:\s*([\s\S]*)/);
      if (resultSectionMatch) {
        const resultLines = resultSectionMatch[1]
          .split('\n')
          .map(line => line.trim())
          .filter(line => line)
          .filter(line => !line.startsWith('最终伤害'))
          .map(line => line.replace(/^[-•]\s*/, ''));
        if (resultLines.length > 0) {
          resultText = resultLines.join(' / ');
        }
      }

      // 提取攻守方信息 (新格式)
      const attackerNameMatch = cleanInner.match(/境界对照:\s*([^(\s]+)\(/);
      const defenderNameMatch = cleanInner.match(/境界对照:.*?vs\s*([^(\s]+)\(/);
      const attackerRealmMatch = cleanInner.match(/境界对照:\s*[^(\s]+\((\d+)\)/);
      const defenderRealmMatch = cleanInner.match(/境界对照:.*?vs\s*[^(\s]+\((\d+)\)/);

      const entities: any[] = [];
      if (attackerNameMatch && defenderNameMatch) {
        entities.push({
          name: attackerNameMatch[1],
          realm: attackerRealmMatch ? attackerRealmMatch[1] : '?',
        });
        entities.push({
          name: defenderNameMatch[1],
          realm: defenderRealmMatch ? defenderRealmMatch[1] : '?',
        });
      }

      // 如果没有解析到实体，尝试旧格式
      if (entities.length === 0) {
        lines.forEach(line => {
          const entityMatch = line.match(/^([^|]+)\s*\|\s*状态:\s*([^|]+)\s*\|\s*境界映射:\s*([^|]+)/);
          if (entityMatch) {
            entities.push({
              name: entityMatch[1].trim(),
              realm: entityMatch[3].trim(),
            });
          }
        });
      }

      judgements.push({
        type: 'combat',
        raw: rawContent,
        content: cleanInner,
        result: !isHit ? '失败' : (isCritical ? '大成功' : '成功'),
        calculation,
        attackType: attackTypeMatch ? attackTypeMatch[1].trim() : '未知',
        method: methodMatch ? methodMatch[1].replace(/\([^)]+\)/, '').trim() : '未知',
        rank: rankMatch ? rankMatch[1] : '未知',
        damage: damageMatch ? (damageMatch[1].includes('生命值减少') ? damageMatch[1] : damageMatch[0]) : undefined,
        damageValue,
        mpCost: mpCostMatch ? mpCostMatch[1] : undefined,
        isHit,
        isCritical,
        resultText,
        entities
      });
    } else {
      judgements.push({
        type: 'generic',
        raw: rawContent,
        content: cleanInner,
        result,
        calculation,
        title: type
      });
    }
  }

  return judgements;
}
