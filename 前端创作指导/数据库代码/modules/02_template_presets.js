// NOTE: Extracted from 数据库代码.user.js for initial decoupling.
// This module is not wired by default; it documents a functional slice.

function derivePresetNameFromFilename_ACU(filename) {
      const raw = String(filename || '').trim();
      if (!raw) return '';
      // 去掉最后一个扩展名（.json 等）
      const idx = raw.lastIndexOf('.');
      const base = (idx > 0 ? raw.slice(0, idx) : raw).trim();
      return base;
  }

  function sanitizeFilenameComponent_ACU(name) {
      // Windows/macOS 常见非法字符：\ / : * ? " < > |
      const s = String(name || '').trim();
      const out = s.replace(/[\\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim();
      // 避免过长文件名
      return out.length > 80 ? out.slice(0, 80).trim() : out;
  }

  function getTemplatePresetSelectJQ_ACU() {
      try {
          if (!$popupInstance_ACU || !$popupInstance_ACU.length) return null;
          const $sel = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-template-preset-select`);
          return $sel && $sel.length ? $sel : null;
      } catch (e) {
          return null;
      }
  }

  function refreshTemplatePresetSelectInUI_ACU({ selectName = '', keepValue = false } = {}) {
      const $sel = getTemplatePresetSelectJQ_ACU();
      if (!$sel || !$sel.length) return;
      renderTemplatePresetSelect_ACU($sel, { keepValue: !!keepValue });
      const name = String(selectName || '').trim();
      if (name) $sel.val(name);
  }

  function ensureUniqueTemplatePresetName_ACU(baseNameRaw) {
      const baseName = String(baseNameRaw || '').trim();
      if (!baseName) return '';
      const names = new Set(listTemplatePresetNames_ACU().map(n => String(n)));
      if (!names.has(baseName)) return baseName;
      for (let i = 2; i <= 99; i++) {
          const candidate = `${baseName} (${i})`;
          if (!names.has(candidate)) return candidate;
      }
      return `${baseName} (${Date.now()})`;
  }

  function buildDefaultTemplatePresetsStore_ACU() {
      return { version: 1, presets: {} };
  }

  function loadTemplatePresetsStore_ACU() {
      const store = getConfigStorage_ACU();
      const raw = store?.getItem?.(STORAGE_KEY_TEMPLATE_PRESETS_ACU);
      const parsed = raw ? safeJsonParse_ACU(raw, null) : null;
      const base = buildDefaultTemplatePresetsStore_ACU();
      if (!parsed || typeof parsed !== 'object') return base;
      const out = { ...base, ...parsed };
      if (!out.presets || typeof out.presets !== 'object') out.presets = {};
      return out;
  }

  function saveTemplatePresetsStore_ACU(obj) {
      try {
          const store = getConfigStorage_ACU();
          store?.setItem?.(STORAGE_KEY_TEMPLATE_PRESETS_ACU, safeJsonStringify_ACU(obj, '{}'));
          return true;
      } catch (e) {
          logWarn_ACU('[TemplatePresets] Failed to save:', e);
          return false;
      }
  }

  function listTemplatePresetNames_ACU() {
      const s = loadTemplatePresetsStore_ACU();
      return Object.keys(s.presets || {}).sort((a, b) => String(a).localeCompare(String(b)));
  }

  function getTemplatePreset_ACU(name) {
      const s = loadTemplatePresetsStore_ACU();
      const p = s?.presets?.[String(name || '')];
      return p && typeof p === 'object' ? p : null;
  }

  function upsertTemplatePreset_ACU(nameRaw, templateStr) {
      const name = String(nameRaw || '').trim();
      if (!name) return false;
      const s = loadTemplatePresetsStore_ACU();
      s.presets = s.presets && typeof s.presets === 'object' ? s.presets : {};
      s.presets[name] = { templateStr: String(templateStr || ''), updatedAt: Date.now() };
      return saveTemplatePresetsStore_ACU(s);
  }

  function deleteTemplatePreset_ACU(nameRaw) {
      const name = String(nameRaw || '').trim();
      if (!name) return false;
      const s = loadTemplatePresetsStore_ACU();
      if (!s.presets || typeof s.presets !== 'object') return false;
      if (!Object.prototype.hasOwnProperty.call(s.presets, name)) return false;
      delete s.presets[name];
      return saveTemplatePresetsStore_ACU(s);
  }

  function normalizeTemplateForPresetSave_ACU() {
      // 返回：{ templateObj, templateStr } 或 null
      const obj = parseTableTemplateJson_ACU({ stripSeedRows: false });
      if (!obj || typeof obj !== 'object') return null;
      try {
          const sheetKeys = Object.keys(obj).filter(k => k.startsWith('sheet_'));
          ensureSheetOrderNumbers_ACU(obj, { baseOrderKeys: sheetKeys, forceRebuild: false });
      } catch (e) {}
      const sanitized = sanitizeChatSheetsObject_ACU(obj, { ensureMate: true });
      const str = safeJsonStringify_ACU(sanitized, '');
      if (!str) return null;
      return { templateObj: sanitized, templateStr: str };
  }

  function renderTemplatePresetSelect_ACU($select, { keepValue = true } = {}) {
      try {
          if (!$select || !$select.length) return;
          const prev = keepValue ? String($select.val() || '') : '';
          const names = listTemplatePresetNames_ACU();
          $select.empty();
          $select.append(jQuery_API_ACU('<option/>').val('').text('（选择预设以切换）'));
          names.forEach(n => {
              // 注意：value/text 必须用 DOM 赋值，避免 HTML 转义导致取值失真（比如 &、<、" 等）
              $select.append(jQuery_API_ACU('<option/>').val(String(n)).text(String(n)));
          });
          if (keepValue && prev && names.includes(prev)) {
              $select.val(prev);
          } else {
              $select.val('');
          }
      } catch (e) {}
  }

  async function applyTemplatePresetToCurrent_ACU(presetName) {
      const name = String(presetName || '').trim();
      if (!name) return false;
      const preset = getTemplatePreset_ACU(name);
      const raw = preset?.templateStr;
      if (!raw) return false;
      let obj = safeJsonParse_ACU(raw, null);
      if (!obj || typeof obj !== 'object') return false;
      // 规范化：补齐编号 + 清洗冗余字段（保持与导入/导出一致）
      try {
          const sheetKeys = Object.keys(obj).filter(k => k.startsWith('sheet_'));
          ensureSheetOrderNumbers_ACU(obj, { baseOrderKeys: sheetKeys, forceRebuild: false });
      } catch (e) {}
      const sanitized = sanitizeChatSheetsObject_ACU(obj, { ensureMate: true });
      const normalizedStr = safeJsonStringify_ACU(sanitized, '');
      if (!normalizedStr) return false;

      // 应用为当前模板，并按 profile 保存
      TABLE_TEMPLATE_ACU = normalizedStr;
      saveCurrentProfileTemplate_ACU(TABLE_TEMPLATE_ACU);

      // 需求6：下拉切换也要触发指导表修改逻辑（覆盖写入：表头+参数+seedRows）
      try { await overwriteChatSheetGuideFromTemplate_ACU(sanitized, { reason: 'template_preset_switch' }); } catch (e) {}
      try { await refreshMergedDataAndNotify_ACU(); } catch (e) {}
      return true;
  }

  // 全局元信息：跨标识共享（用于“标识列表/快速切换”）
  let globalMeta_ACU = {
      version: 1,
      activeIsolationCode: '',
      isolationCodeList: [],
      migratedLegacySingleStore: false, // 是否已完成从 legacy(allSettings/customTemplate) 迁移到 profile
  };

