// NOTE: Extracted from 数据库代码.user.js for initial decoupling.
// This module is not wired by default; it documents a functional slice.

function getChatFirstLayerMessage_ACU(chat) {
      if (!Array.isArray(chat) || chat.length === 0) return null;
      return chat[0] || null;
  }

  function getChatSheetGuideContainer_ACU(chat) {
      const first = getChatFirstLayerMessage_ACU(chat);
      if (!first) return null;
      const raw = first[CHAT_SHEET_GUIDE_FIELD_ACU];
      if (!raw) return null;
      const obj = (typeof raw === 'string') ? safeJsonParse_ACU(raw, null) : raw;
      return (obj && typeof obj === 'object') ? obj : null;
  }

  const CHAT_SHEET_GUIDE_SEED_ROWS_FIELD_ACU = 'seedRows';

  function normalizeGuideData_ACU(dataObj) {
      if (!dataObj || typeof dataObj !== 'object') return null;
      const out = { mate: { type: 'chatSheets', version: CHAT_SHEET_GUIDE_VERSION_ACU } };
      // mate 允许覆盖
      if (dataObj.mate && typeof dataObj.mate === 'object') {
          out.mate = dataObj.mate;
      }
      // 兜底补齐 mate 关键字段（避免旧调用方传入 version=1 导致无法识别新结构）
      if (!out.mate || typeof out.mate !== 'object') out.mate = { type: 'chatSheets', version: CHAT_SHEET_GUIDE_VERSION_ACU };
      if (!out.mate.type) out.mate.type = 'chatSheets';
      if (!Number.isFinite(out.mate.version) || Math.trunc(out.mate.version) < CHAT_SHEET_GUIDE_VERSION_ACU) out.mate.version = CHAT_SHEET_GUIDE_VERSION_ACU;
      Object.keys(dataObj).forEach(k => {
          if (!k.startsWith('sheet_')) return;
          const s = dataObj[k];
          if (!s || typeof s !== 'object') return;
          // content 只保留表头行
          const headerRow = Array.isArray(s.content) && Array.isArray(s.content[0]) ? s.content[0] : [null];
          const keep = {
              uid: s.uid || k,
              name: s.name || k,
              sourceData: s.sourceData || { note: '', initNode: '', insertNode: '', updateNode: '', deleteNode: '' },
              content: [headerRow],
              updateConfig: s.updateConfig || { uiSentinel: -1, contextDepth: -1, updateFrequency: -1, batchSize: -1, skipFloors: -1 },
              exportConfig: s.exportConfig || { enabled: false, splitByRow: false, entryName: s.name || k, entryType: 'constant', keywords: '', preventRecursion: true, injectionTemplate: '' },
          };
          // v2: 基础数据（仅模板预置/seedRows）；注意：这里绝不从 content 派生，避免把真实数据误当作“基础数据”写入指导表
          if (Array.isArray(s[CHAT_SHEET_GUIDE_SEED_ROWS_FIELD_ACU])) {
              try {
                  keep[CHAT_SHEET_GUIDE_SEED_ROWS_FIELD_ACU] = JSON.parse(JSON.stringify(s[CHAT_SHEET_GUIDE_SEED_ROWS_FIELD_ACU]));
              } catch (e) {
                  keep[CHAT_SHEET_GUIDE_SEED_ROWS_FIELD_ACU] = [];
              }
          }
          if (s[TABLE_ORDER_FIELD_ACU] !== undefined) keep[TABLE_ORDER_FIELD_ACU] = s[TABLE_ORDER_FIELD_ACU];
          out[k] = keep;
      });
      return out;
  }

  function materializeDataFromSheetGuide_ACU(guideData, { includeSeedRows = true } = {}) {
      const normalized = normalizeGuideData_ACU(guideData);
      if (!normalized) return { mate: { type: 'chatSheets', version: 1 } };
      const out = { mate: normalized.mate || { type: 'chatSheets', version: 1 } };
      Object.keys(normalized).forEach(k => {
          if (!k.startsWith('sheet_')) return;
          const s = normalized[k];
          const headerRow = Array.isArray(s?.content?.[0]) ? JSON.parse(JSON.stringify(s.content[0])) : [null];
          const next = JSON.parse(JSON.stringify(s));
          // content: header + (可选) seedRows
          const seedRows = includeSeedRows && Array.isArray(s?.[CHAT_SHEET_GUIDE_SEED_ROWS_FIELD_ACU])
              ? JSON.parse(JSON.stringify(s[CHAT_SHEET_GUIDE_SEED_ROWS_FIELD_ACU]))
              : [];
          next.content = [headerRow, ...seedRows];
          // 保留 seedRows 字段本身（便于后续再次写回/二次处理），但不会影响表格使用者（他们只看 content）
          out[k] = next;
      });
      return out;
  }

  function getChatSheetGuideDataForIsolationKey_ACU(isolationKey) {
      const chat = SillyTavern_API_ACU?.chat;
      const container = getChatSheetGuideContainer_ACU(chat);
      if (container && typeof container === 'object') {
          const tags = container.tags;
          const slot = (tags && typeof tags === 'object') ? tags[String(isolationKey ?? '')] : null;
          const data = slot?.data;
          const normalized = normalizeGuideData_ACU(data);
          if (normalized && Object.keys(normalized).some(k => k.startsWith('sheet_'))) return normalized;
      }

      // 兼容迁移：旧字段仅保存表头清单，这里按清单顺序从模板构建空白指导表（不强制持久化）
      try {
          const first = getChatFirstLayerMessage_ACU(chat);
          const legacyRaw = first ? first[LEGACY_CHAT_TABLE_HEADER_GUIDE_FIELD_ACU] : null;
          const legacyObj = legacyRaw ? ((typeof legacyRaw === 'string') ? safeJsonParse_ACU(legacyRaw, null) : legacyRaw) : null;
          const legacyTags = legacyObj?.tags;
          const legacySlot = (legacyTags && typeof legacyTags === 'object') ? legacyTags[String(isolationKey ?? '')] : null;
          const legacyHeaders = Array.isArray(legacySlot?.headers) ? legacySlot.headers : null;
          if (legacyHeaders && legacyHeaders.length > 0) {
              const orderedUids = legacyHeaders
                  .map(h => h?.uid)
                  .filter(uid => typeof uid === 'string' && uid.startsWith('sheet_'));
              if (orderedUids.length > 0) {
                  const templateObj = parseTableTemplateJson_ACU({ stripSeedRows: true });
                  const out = { mate: { type: 'chatSheets', version: 1 } };
                  orderedUids.forEach((uid, idx) => {
                      const base = (templateObj && templateObj[uid]) ? JSON.parse(JSON.stringify(templateObj[uid])) : { uid, name: uid, content: [[null]], sourceData: {}, updateConfig: {}, exportConfig: {} };
                      // 空白化 + 编号
                      if (Array.isArray(base.content) && base.content.length > 1) base.content = [base.content[0]];
                      if (!Array.isArray(base.content) || base.content.length === 0) base.content = [[null]];
                      base.uid = uid;
                      if (!Number.isFinite(base[TABLE_ORDER_FIELD_ACU])) base[TABLE_ORDER_FIELD_ACU] = idx;
                      out[uid] = base;
                  });
                  return normalizeGuideData_ACU(out);
              }
          }
      } catch (e) {}

      return null;
  }

  function setChatSheetGuideDataForIsolationKey_ACU(isolationKey, guideData, { reason = '' } = {}) {
      const chat = SillyTavern_API_ACU?.chat;
      const first = getChatFirstLayerMessage_ACU(chat);
      if (!first) return false;

      const normalized = normalizeGuideData_ACU(guideData);
      if (!normalized || !Object.keys(normalized).some(k => k.startsWith('sheet_'))) return false;
      const container = getChatSheetGuideContainer_ACU(chat) || { version: CHAT_SHEET_GUIDE_VERSION_ACU, tags: {} };
      if (!container.tags || typeof container.tags !== 'object') container.tags = {};
      container.version = CHAT_SHEET_GUIDE_VERSION_ACU;
      container.tags[String(isolationKey ?? '')] = {
          data: normalized,
          updatedAt: Date.now(),
          reason: String(reason || ''),
      };
      first[CHAT_SHEET_GUIDE_FIELD_ACU] = container;
      return true;
  }

  // =========================
  // [新增] seedRows 解析/兜底：用于 $0 注入与“无数据初始化”场景
  // 目标：
  // - 新对话首次填表时，即使 currentJsonTableData_ACU 仅有表结构，也能从“内部指导表/模板”取到 seedRows
  // - 支持隔离标签切换或初始化早期 chat 尚未加载导致的“指导表未命中”情况
  // 注意：这里只把 seedRows 挂在表对象字段上，不会写入 content（不把模板基础数据当作真实聊天数据）
  // =========================
  let _seedRowsTemplateCacheStr_ACU = null;
  let _seedRowsTemplateCacheObj_ACU = null;

