// NOTE: Extracted from 数据库代码.user.js for initial decoupling.
// This module is not wired by default; it documents a functional slice.

function buildDefaultGlobalMeta_ACU() {
      return {
          version: 1,
          activeIsolationCode: '',
          isolationCodeList: [],
          migratedLegacySingleStore: false,
      };
  }

  function loadGlobalMeta_ACU() {
      const store = getConfigStorage_ACU();
      const raw = store?.getItem?.(STORAGE_KEY_GLOBAL_META_ACU);
      if (!raw) {
          globalMeta_ACU = buildDefaultGlobalMeta_ACU();
          return globalMeta_ACU;
      }
      const parsed = safeJsonParse_ACU(raw, null);
      if (!parsed || typeof parsed !== 'object') {
          globalMeta_ACU = buildDefaultGlobalMeta_ACU();
          return globalMeta_ACU;
      }
      globalMeta_ACU = { ...buildDefaultGlobalMeta_ACU(), ...parsed };
      globalMeta_ACU.activeIsolationCode = normalizeIsolationCode_ACU(globalMeta_ACU.activeIsolationCode);
      if (!Array.isArray(globalMeta_ACU.isolationCodeList)) globalMeta_ACU.isolationCodeList = [];
      return globalMeta_ACU;
  }

  function saveGlobalMeta_ACU() {
      try {
          const store = getConfigStorage_ACU();
          const payload = safeJsonStringify_ACU(globalMeta_ACU, '{}');
          store.setItem(STORAGE_KEY_GLOBAL_META_ACU, payload);
          return true;
      } catch (e) {
          logWarn_ACU('[GlobalMeta] Failed to save:', e);
          return false;
      }
  }

  function readProfileSettingsFromStorage_ACU(code) {
      const store = getConfigStorage_ACU();
      const raw = store?.getItem?.(getProfileSettingsKey_ACU(code));
      if (!raw) return null;
      const parsed = safeJsonParse_ACU(raw, null);
      return (parsed && typeof parsed === 'object') ? parsed : null;
  }

  function writeProfileSettingsToStorage_ACU(code, settingsObj) {
      const store = getConfigStorage_ACU();
      store.setItem(getProfileSettingsKey_ACU(code), safeJsonStringify_ACU(settingsObj, '{}'));
  }

  function readProfileTemplateFromStorage_ACU(code) {
      const store = getConfigStorage_ACU();
      const raw = store?.getItem?.(getProfileTemplateKey_ACU(code));
      return (typeof raw === 'string' && raw.trim()) ? raw : null;
  }

  function writeProfileTemplateToStorage_ACU(code, templateStr) {
      const store = getConfigStorage_ACU();
      store.setItem(getProfileTemplateKey_ACU(code), String(templateStr || ''));
  }

  // 保存当前运行态模板到“当前标识 profile”
  function saveCurrentProfileTemplate_ACU(templateStr = TABLE_TEMPLATE_ACU) {
      const code = normalizeIsolationCode_ACU(settings_ACU?.dataIsolationCode || '');
      writeProfileTemplateToStorage_ACU(code, String(templateStr || ''));
  }

  // 将 settings 对象清洗为“仅 profile 内保存的内容”（标识列表/历史改为 globalMeta 统一保存）
  function sanitizeSettingsForProfileSave_ACU(settingsObj) {
      const cloned = safeJsonParse_ACU(safeJsonStringify_ACU(settingsObj, '{}'), {});
      // 标识列表不再跟随 profile，避免切换后“看不到别的标识”
      delete cloned.dataIsolationHistory;
      // dataIsolationEnabled 由 code 派生，避免存档里出现不一致
      delete cloned.dataIsolationEnabled;
      return cloned;
  }

  // --- [外部导入] 临时储存：仅 IndexedDB（不再回退到 localStorage） ---
  // 说明：
  // - 仅“外部导入”的暂存数据（分块内容、断点状态）使用 IndexedDB
  // - 其它配置/模板：走酒馆服务端设置（getConfigStorage_ACU）
  const IMPORT_TEMP_DB_NAME_ACU = `${SCRIPT_ID_PREFIX_ACU}_importTemp_v1`;
  const IMPORT_TEMP_STORE_NAME_ACU = 'kv';
  let importTempDbPromise_ACU = null;
  const importTempMem_ACU = new Map(); // IndexedDB 不可用时的“仅内存”兜底（不落盘）

