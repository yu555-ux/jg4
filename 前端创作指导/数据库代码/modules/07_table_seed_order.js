// NOTE: Extracted from 数据库代码.user.js for initial decoupling.
// This module is not wired by default; it documents a functional slice.

function getTemplateObjForSeedRows_ACU() {
      try {
          if (_seedRowsTemplateCacheStr_ACU === TABLE_TEMPLATE_ACU && _seedRowsTemplateCacheObj_ACU) return _seedRowsTemplateCacheObj_ACU;
          const obj = parseTableTemplateJson_ACU({ stripSeedRows: false });
          _seedRowsTemplateCacheStr_ACU = TABLE_TEMPLATE_ACU;
          _seedRowsTemplateCacheObj_ACU = obj;
          return obj;
      } catch (e) {
          return null;
      }
  }

  async function ensureChatSheetGuideSeeded_ACU({ reason = 'auto_seed_seedRows', force = false } = {}) {
      try {
          const isolationKey = getCurrentIsolationKey_ACU();
          const existing = getChatSheetGuideDataForIsolationKey_ACU(isolationKey);
          const hasExisting = !!(existing && typeof existing === 'object' && Object.keys(existing).some(k => k.startsWith('sheet_')));
          if (hasExisting && !force) return existing;

          const chat = SillyTavern_API_ACU?.chat;
          if (!chat || !Array.isArray(chat) || chat.length === 0) return existing || null;

          const templateObj = getTemplateObjForSeedRows_ACU();
          if (!templateObj) return existing || null;

          // 用模板构建指导表（content 保留表头；seedRows 写入字段）
          const guideData = buildChatSheetGuideDataFromTemplateObj_ACU(templateObj, { stripSeedRows: true });
          if (!guideData) return existing || null;

          const ok = setChatSheetGuideDataForIsolationKey_ACU(isolationKey, guideData, { reason });
          if (ok) {
              try { await SillyTavern_API_ACU.saveChat(); } catch (e) {}
              logDebug_ACU(`[SheetGuide] Auto-seeded chat sheet guide for tag [${isolationKey || '无标签'}], reason=${reason}`);
          }
          return guideData;
      } catch (e) {
          return null;
      }
  }

  function pickAnyGuideSeedRowsSlot_ACU(sheetKey) {
      try {
          const chat = SillyTavern_API_ACU?.chat;
          const container = getChatSheetGuideContainer_ACU(chat);
          const tags = container?.tags;
          if (!tags || typeof tags !== 'object') return null;
          let best = null; // { ts, seedRows }
          Object.keys(tags).forEach(tagKey => {
              const slot = tags[tagKey];
              const ts = Number(slot?.updatedAt) || 0;
              const data = normalizeGuideData_ACU(slot?.data);
              const sr = data?.[sheetKey]?.[CHAT_SHEET_GUIDE_SEED_ROWS_FIELD_ACU];
              if (Array.isArray(sr) && sr.length > 0) {
                  if (!best || ts > best.ts) best = { ts, seedRows: sr };
              }
          });
          return best ? JSON.parse(JSON.stringify(best.seedRows)) : null;
      } catch (e) {
          return null;
      }
  }

  function getEffectiveSeedRowsForSheet_ACU(sheetKey, { guideData = null, allowTemplateFallback = true } = {}) {
      try {
          if (!sheetKey || !String(sheetKey).startsWith('sheet_')) return [];
          const direct = currentJsonTableData_ACU?.[sheetKey]?.[CHAT_SHEET_GUIDE_SEED_ROWS_FIELD_ACU];
          if (Array.isArray(direct) && direct.length > 0) return JSON.parse(JSON.stringify(direct));

          const g = guideData || (() => {
              const isolationKey = getCurrentIsolationKey_ACU();
              return getChatSheetGuideDataForIsolationKey_ACU(isolationKey);
          })();
          const sr1 = g?.[sheetKey]?.[CHAT_SHEET_GUIDE_SEED_ROWS_FIELD_ACU];
          if (Array.isArray(sr1) && sr1.length > 0) return JSON.parse(JSON.stringify(sr1));

          const any = pickAnyGuideSeedRowsSlot_ACU(sheetKey);
          if (Array.isArray(any) && any.length > 0) return any;

          if (!allowTemplateFallback) return [];
          const templateObj = getTemplateObjForSeedRows_ACU();
          const tplRows = templateObj?.[sheetKey]?.content;
          if (Array.isArray(tplRows) && tplRows.length > 1) return JSON.parse(JSON.stringify(tplRows.slice(1)));
          return [];
      } catch (e) {
          return [];
      }
  }

  function attachSeedRowsToCurrentDataFromGuide_ACU(guideData) {
      try {
          if (!currentJsonTableData_ACU || typeof currentJsonTableData_ACU !== 'object') return false;
          const g = normalizeGuideData_ACU(guideData);
          if (!g) return false;
          let changed = false;
          Object.keys(currentJsonTableData_ACU).forEach(k => {
              if (!k.startsWith('sheet_')) return;
              const table = currentJsonTableData_ACU[k];
              if (!table || typeof table !== 'object') return;
              const existing = table?.[CHAT_SHEET_GUIDE_SEED_ROWS_FIELD_ACU];
              if (Array.isArray(existing) && existing.length > 0) return;
              const sr = g?.[k]?.[CHAT_SHEET_GUIDE_SEED_ROWS_FIELD_ACU];
              if (Array.isArray(sr) && sr.length > 0) {
                  table[CHAT_SHEET_GUIDE_SEED_ROWS_FIELD_ACU] = JSON.parse(JSON.stringify(sr));
                  changed = true;
              }
          });
          return changed;
      } catch (e) {
          return false;
      }
  }

  // [新增] 用“当前数据”构建空白指导表：只保留表头行 + 参数（顺序由 getSortedSheetKeys_ACU 的旧逻辑决定，避免递归）
  function buildChatSheetGuideDataFromData_ACU(dataObj, { preserveSeedRowsFromGuideData = null, seedRowsFromTemplateObj = null } = {}) {
      if (!dataObj || typeof dataObj !== 'object') return null;
      const keys = getSortedSheetKeys_ACU(dataObj, { ignoreChatGuide: true });
      const out = { mate: { type: 'chatSheets', version: CHAT_SHEET_GUIDE_VERSION_ACU } };
      keys.forEach(k => {
          const s = dataObj[k];
          if (!s) return;
          const headerRow = Array.isArray(s.content) && Array.isArray(s.content[0]) ? JSON.parse(JSON.stringify(s.content[0])) : [null];
          const blank = {
              uid: s.uid || k,
              name: s.name || k,
              sourceData: s.sourceData ? JSON.parse(JSON.stringify(s.sourceData)) : { note: '', initNode: '', insertNode: '', updateNode: '', deleteNode: '' },
              content: [headerRow],
              updateConfig: s.updateConfig ? JSON.parse(JSON.stringify(s.updateConfig)) : { uiSentinel: -1, contextDepth: -1, updateFrequency: -1, batchSize: -1, skipFloors: -1 },
              exportConfig: s.exportConfig ? JSON.parse(JSON.stringify(s.exportConfig)) : { enabled: false, splitByRow: false, entryName: s.name || k, entryType: 'constant', keywords: '', preventRecursion: true, injectionTemplate: '' },
          };
          // 需求4：结构/表名/参数变更时，仅更新指导表元信息，不修改“基础数据(seedRows)”
          const preserved = preserveSeedRowsFromGuideData?.[k]?.[CHAT_SHEET_GUIDE_SEED_ROWS_FIELD_ACU];
          if (Array.isArray(preserved)) {
              blank[CHAT_SHEET_GUIDE_SEED_ROWS_FIELD_ACU] = JSON.parse(JSON.stringify(preserved));
          } else {
              // 需求1：首次生成指导表时，把模板预置数据写入 seedRows（仅在未能从既有指导表继承时）
              const tplRows = seedRowsFromTemplateObj?.[k]?.content;
              if (Array.isArray(tplRows) && tplRows.length > 1) {
                  blank[CHAT_SHEET_GUIDE_SEED_ROWS_FIELD_ACU] = JSON.parse(JSON.stringify(tplRows.slice(1)));
              }
          }
          if (Number.isFinite(s?.[TABLE_ORDER_FIELD_ACU])) blank[TABLE_ORDER_FIELD_ACU] = Math.trunc(s[TABLE_ORDER_FIELD_ACU]);
          out[k] = blank;
      });
      return normalizeGuideData_ACU(out);
  }

  // [新增] 用“模板对象”构建空白指导表：只保留表头行 + 参数（模板已有顺序编号）
  function buildChatSheetGuideDataFromTemplateObj_ACU(templateObj, { stripSeedRows = true } = {}) {
      if (!templateObj || typeof templateObj !== 'object') return null;
      const keys = Object.keys(templateObj).filter(k => k.startsWith('sheet_'));
      if (keys.length === 0) return null;
      // 确保模板编号稳定（缺失则补齐）
      try { ensureSheetOrderNumbers_ACU(templateObj, { baseOrderKeys: keys, forceRebuild: false }); } catch (e) {}
      const sorted = keys.sort((a, b) => {
          const ao = Number.isFinite(templateObj?.[a]?.[TABLE_ORDER_FIELD_ACU]) ? Math.trunc(templateObj[a][TABLE_ORDER_FIELD_ACU]) : Infinity;
          const bo = Number.isFinite(templateObj?.[b]?.[TABLE_ORDER_FIELD_ACU]) ? Math.trunc(templateObj[b][TABLE_ORDER_FIELD_ACU]) : Infinity;
          if (ao !== bo) return ao - bo;
          return String(a).localeCompare(String(b));
      });
      const out = { mate: { type: 'chatSheets', version: CHAT_SHEET_GUIDE_VERSION_ACU } };
      sorted.forEach((k, idx) => {
          const base = JSON.parse(JSON.stringify(templateObj[k] || {}));
          base.uid = base.uid || k;
          base.name = base.name || k;
          if (!Array.isArray(base.content) || base.content.length === 0) base.content = [[null]];
          // v2: 保存模板预置数据为 seedRows，但指导表本体 content 仍只保留表头
          if (Array.isArray(base.content) && base.content.length > 1) {
              base[CHAT_SHEET_GUIDE_SEED_ROWS_FIELD_ACU] = JSON.parse(JSON.stringify(base.content.slice(1)));
          }
          if (stripSeedRows && Array.isArray(base.content) && base.content.length > 1) base.content = [base.content[0]];
          if (!Number.isFinite(base[TABLE_ORDER_FIELD_ACU])) base[TABLE_ORDER_FIELD_ACU] = idx;
          out[k] = base;
      });
      return normalizeGuideData_ACU(out);
  }

  // [新增] 覆盖式更新：用模板写入当前聊天第一层“空白指导表”
  async function overwriteChatSheetGuideFromTemplate_ACU(templateObj, { reason = 'template_changed' } = {}) {
      const guideData = buildChatSheetGuideDataFromTemplateObj_ACU(templateObj, { stripSeedRows: true });
      if (!guideData) return false;
      const isolationKey = getCurrentIsolationKey_ACU();
      const ok = setChatSheetGuideDataForIsolationKey_ACU(isolationKey, guideData, { reason });
      if (!ok) return false;
      try { await SillyTavern_API_ACU.saveChat(); } catch (e) {}
      try { await refreshMergedDataAndNotify_ACU(); } catch (e) {}
      return true;
  }

  // [表格顺序新机制] 获取表格 keys：
  // - 若当前聊天已存在“空白指导表”：优先按指导表的 orderNo 顺序（可过滤不在指导表里的表）
  // - 否则：按“编号(orderNo)从小到大”排序；缺编号则回退到模板编号/模板顺序
  function getSortedSheetKeys_ACU(dataObj, { ignoreChatGuide = false, includeMissingFromGuide = false } = {}) {
      if (!dataObj || typeof dataObj !== 'object') return [];
      const existingKeys = Object.keys(dataObj).filter(k => k.startsWith('sheet_'));
      if (existingKeys.length === 0) return [];

      // [新增] 聊天级空白指导表：一旦存在，则该聊天不再按模板顺序合并/显示，而是按此指导表作为总指导
      if (!ignoreChatGuide) {
          try {
              const isolationKey = (typeof getCurrentIsolationKey_ACU === 'function') ? getCurrentIsolationKey_ACU() : '';
              const guideData = getChatSheetGuideDataForIsolationKey_ACU(isolationKey);
              if (guideData && typeof guideData === 'object') {
                  const guideKeys = Object.keys(guideData).filter(k => k.startsWith('sheet_'));
                  if (guideKeys.length > 0) {
                      const sorted = guideKeys.sort((a, b) => {
                          const ao = Number.isFinite(guideData?.[a]?.[TABLE_ORDER_FIELD_ACU]) ? Math.trunc(guideData[a][TABLE_ORDER_FIELD_ACU]) : Infinity;
                          const bo = Number.isFinite(guideData?.[b]?.[TABLE_ORDER_FIELD_ACU]) ? Math.trunc(guideData[b][TABLE_ORDER_FIELD_ACU]) : Infinity;
                          if (ao !== bo) return ao - bo;
                          return String(a).localeCompare(String(b));
                      });
                      return includeMissingFromGuide ? sorted : sorted.filter(k => dataObj[k]);
                  }
              }
          } catch (e) {
              // ignore guide failures; fallback to legacy ordering
          }
      }

      // 尝试拿模板做兜底（比如老数据/导入数据缺编号）
      const templateObj = parseTableTemplateJson_ACU({ stripSeedRows: false });

      // 先对 dataObj 补齐缺失编号（仅在确实缺失/重复时重建）
      // baseOrderKeys 的优先级：模板顺序 > 当前对象键顺序（保证“载入模板编好号”后的稳定性）
      const baseKeys = (() => {
          const tk = templateObj && typeof templateObj === 'object'
              ? Object.keys(templateObj).filter(k => k.startsWith('sheet_'))
              : [];
          return tk.length ? tk : existingKeys;
      })();
      ensureSheetOrderNumbers_ACU(dataObj, { baseOrderKeys: baseKeys, forceRebuild: false });

      const orderValueOf = (k) => {
          const v = dataObj?.[k]?.[TABLE_ORDER_FIELD_ACU];
          if (Number.isFinite(v)) return Math.trunc(v);
          const tv = templateObj?.[k]?.[TABLE_ORDER_FIELD_ACU];
          if (Number.isFinite(tv)) return Math.trunc(tv);
          return Infinity;
      };

      return existingKeys.sort((a, b) => {
          const ao = orderValueOf(a);
          const bo = orderValueOf(b);
          if (ao !== bo) return ao - bo;
          // 稳定排序：同编号时按名称/键
          const an = String(dataObj?.[a]?.name || templateObj?.[a]?.name || a);
          const bn = String(dataObj?.[b]?.name || templateObj?.[b]?.name || b);
          const c = an.localeCompare(bn);
          if (c !== 0) return c;
          return String(a).localeCompare(String(b));
      });
  }

  // [新增] 基于“空白指导表”构建可合并的骨架数据（深拷贝，避免后续修改污染原对象）
  function buildGuidedBaseDataFromSheetGuide_ACU(guideData) {
      const normalized = normalizeGuideData_ACU(guideData);
      if (!normalized) return { mate: { type: 'chatSheets', version: 1 } };
      try { return JSON.parse(JSON.stringify(normalized)); } catch (e) { return normalized; }
  }

  // [修复] 按指定顺序重建对象键，避免 Object.keys()/合并/深拷贝导致的顺序漂移
  function reorderDataBySheetKeys_ACU(dataObj, orderedSheetKeys) {
      if (!dataObj || typeof dataObj !== 'object') return dataObj;
      const out = {};
      // 先保留非 sheet_ 键（mate 等）
      Object.keys(dataObj).forEach(k => {
          if (!k.startsWith('sheet_')) out[k] = dataObj[k];
      });
      // 再按顺序插入 sheet_ 键
      const keys = Array.isArray(orderedSheetKeys) ? orderedSheetKeys : getSortedSheetKeys_ACU(dataObj);
      keys.forEach(k => {
          if (dataObj[k]) out[k] = dataObj[k];
      });
      return out;
  }

  // =========================
  // [瘦身/兼容] ChatSheets 表格对象清洗（用于：导出、写入聊天记录、持久化模板）
  // 目标：
  // - 与旧模板/旧存档兼容：导入时允许存在冗余字段
  // - 从现在开始：导出/保存时不再携带历史遗留冗余字段，降低体积
  // =========================
  const SHEET_KEEP_KEYS_ACU = new Set([
      'uid',
      'name',
      'sourceData',
      'content',
      // [重要] 可视化编辑器/表格配置（更新频率、上下文深度等）依赖该字段
      'updateConfig',
      'exportConfig',
      TABLE_ORDER_FIELD_ACU, // orderNo
  ]);

