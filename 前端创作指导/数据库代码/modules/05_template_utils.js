// NOTE: Extracted from 数据库代码.user.js for initial decoupling.
// This module is not wired by default; it documents a functional slice.

function stripSeedRowsFromTemplate_ACU(templateObj) {
      if (!templateObj || typeof templateObj !== 'object') return templateObj;
      Object.keys(templateObj).forEach(k => {
          if (!k.startsWith('sheet_')) return;
          const table = templateObj[k];
          if (!table || !Array.isArray(table.content) || table.content.length === 0) return;
          const headerRow = table.content[0];
          // 仅保留表头行，移除所有数据行（包括模板自带的示例/预置数据）
          table.content = [headerRow];
      });
      return templateObj;
  }

  function parseTableTemplateJson_ACU({ stripSeedRows = false } = {}) {
      try {
          let cleanTemplate = TABLE_TEMPLATE_ACU.trim();
          cleanTemplate = cleanTemplate.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
          const obj = JSON.parse(cleanTemplate);
          return stripSeedRows ? stripSeedRowsFromTemplate_ACU(obj) : obj;
      } catch (e) {
          logError_ACU('Failed to parse TABLE_TEMPLATE_ACU.', e);
          return null;
      }
  }

  // [表格顺序新机制] 在数据对象上应用“按给定 keys 顺序重编号”
  function applySheetOrderNumbers_ACU(dataObj, orderedKeys) {
      if (!dataObj || typeof dataObj !== 'object') return false;
      const keys = Array.isArray(orderedKeys) ? orderedKeys : [];
      let changed = false;
      keys.forEach((k, idx) => {
          const sheet = dataObj[k];
          if (!sheet || typeof sheet !== 'object') return;
          if (sheet[TABLE_ORDER_FIELD_ACU] !== idx) {
              sheet[TABLE_ORDER_FIELD_ACU] = idx;
              changed = true;
          }
      });
      return changed;
  }

  // [表格顺序新机制] 确保对象里的所有 sheet_ 都有合法编号（用于模板载入/导入/兼容旧数据）
  function ensureSheetOrderNumbers_ACU(dataObj, { baseOrderKeys = null, forceRebuild = false } = {}) {
      if (!dataObj || typeof dataObj !== 'object') return false;
      const sheetKeys = Array.isArray(baseOrderKeys) && baseOrderKeys.length
          ? baseOrderKeys.filter(k => k && k.startsWith('sheet_') && dataObj[k])
          : Object.keys(dataObj).filter(k => k.startsWith('sheet_'));
      if (sheetKeys.length === 0) return false;

      // 检查现有编号是否合法且不重复
      const seen = new Set();
      let needRebuild = !!forceRebuild;
      for (const k of sheetKeys) {
          const v = dataObj?.[k]?.[TABLE_ORDER_FIELD_ACU];
          if (!Number.isFinite(v)) { needRebuild = true; break; }
          const iv = Math.trunc(v);
          if (seen.has(iv)) { needRebuild = true; break; }
          seen.add(iv);
      }

      if (!needRebuild) return false;
      return applySheetOrderNumbers_ACU(dataObj, sheetKeys);
  }

  // [表格顺序新机制] 读取模板里 sheet_ keys 的顺序（按编号升序；缺失则按当前键顺序并补齐编号）
  function getTemplateSheetKeys_ACU() {
      const templateObj = parseTableTemplateJson_ACU({ stripSeedRows: false });
      if (!templateObj || typeof templateObj !== 'object') return [];

      const keys = Object.keys(templateObj).filter(k => k.startsWith('sheet_'));
      if (keys.length === 0) return [];

      // 如果模板缺编号（或重复），按现有键顺序补齐，并回写到存储，确保“载入模板先编好号”
      const changed = ensureSheetOrderNumbers_ACU(templateObj, { baseOrderKeys: keys, forceRebuild: false });
      if (changed) {
          try {
              TABLE_TEMPLATE_ACU = JSON.stringify(templateObj);
              // [Profile] 模板随“标识代码(profile)”保存
              saveCurrentProfileTemplate_ACU(TABLE_TEMPLATE_ACU);
              logDebug_ACU('[OrderNo] Template order numbers initialized and persisted.');
          } catch (e) {
              logWarn_ACU('[OrderNo] Failed to persist initialized template order numbers:', e);
          }
      }

      // 按 orderNo 排序输出 keys
      return keys.sort((a, b) => {
          const ao = Number.isFinite(templateObj[a]?.[TABLE_ORDER_FIELD_ACU]) ? templateObj[a][TABLE_ORDER_FIELD_ACU] : Infinity;
          const bo = Number.isFinite(templateObj[b]?.[TABLE_ORDER_FIELD_ACU]) ? templateObj[b][TABLE_ORDER_FIELD_ACU] : Infinity;
          if (ao !== bo) return ao - bo;
          return String(templateObj[a]?.name || a).localeCompare(String(templateObj[b]?.name || b));
      });
  }

  // =========================
  // [新增] 聊天记录第一层：空白“指导表”（仅表头+参数，无数据行）
  // 目标：
  // - 不再维护“表头清单”这种轻量结构，而是保存一份“包含所有表格的更新参数/表头/顺序”的空白表集合
  // - 仅用于本插件：为表格编辑/填表参数提供稳定来源；不暴露到 exportTableAsJson 等外部接口
  // - 保存位置：chat[0]（第一层消息对象）上挂载一个内部字段
  // - 按隔离标签分槽：tags[isolationKey]
  // 备注：此处的“空白表”指 content 只保留表头行（content[0]），不含任何数据行
  // =========================
  const CHAT_SHEET_GUIDE_FIELD_ACU = 'TavernDB_ACU_InternalSheetGuide';
  // v2: 在“空白指导表”中额外保存模板的基础数据（seedRows），用于“空数据回溯/占位符注入”时的基底恢复
  const CHAT_SHEET_GUIDE_VERSION_ACU = 2;
  // 兼容：若用户曾使用过旧“表头清单”字段，可在读取时迁移
  const LEGACY_CHAT_TABLE_HEADER_GUIDE_FIELD_ACU = 'TavernDB_ACU_TableHeaderGuide';

