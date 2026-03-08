// NOTE: Extracted from 数据库代码.user.js for initial decoupling.
// This module is not wired by default; it documents a functional slice.

function tryReadBridgeFromTop_ACU() {
      try {
          const bridge = topLevelWindow_ACU?.[TAVERN_BRIDGE_GLOBAL_KEY_ACU];
          if (bridge && typeof bridge === 'object') {
              if (bridge.error && !tavernBridgeErrorReported_ACU) {
                  tavernBridgeErrorReported_ACU = true;
                  console.warn(`[${SCRIPT_ID_PREFIX_ACU}] Tavern bridge 初始化失败：`, bridge.error);
              }
              if (bridge.extension_settings && !tavernExtensionSettingsRoot_ACU) tavernExtensionSettingsRoot_ACU = bridge.extension_settings;
              if (!tavernSaveSettingsFn_ACU) tavernSaveSettingsFn_ACU = bridge.saveSettingsDebounced || bridge.saveSettings || null;
              return !!(tavernExtensionSettingsRoot_ACU);
          }
      } catch (e) { /* ignore */ }
      return false;
  }

  async function injectTavernBridgeIntoTopWindow_ACU() {
      try {
          // 已注入则跳过
          if (topLevelWindow_ACU?.[TAVERN_BRIDGE_INJECTED_FLAG_ACU]) return true;
          topLevelWindow_ACU[TAVERN_BRIDGE_INJECTED_FLAG_ACU] = true;

          const doc = topLevelWindow_ACU.document;
          if (!doc || !doc.createElement) return false;

          const s = doc.createElement('script');
          s.type = 'module';
          s.textContent = `
              (async () => {
                  try {
                      const ext = await import('/scripts/extensions.js');
                      const main = await import('/script.js');
                      window['${TAVERN_BRIDGE_GLOBAL_KEY_ACU}'] = window['${TAVERN_BRIDGE_GLOBAL_KEY_ACU}'] || {};
                      window['${TAVERN_BRIDGE_GLOBAL_KEY_ACU}'].extension_settings = ext?.extension_settings || null;
                      window['${TAVERN_BRIDGE_GLOBAL_KEY_ACU}'].saveSettingsDebounced = main?.saveSettingsDebounced || null;
                      window['${TAVERN_BRIDGE_GLOBAL_KEY_ACU}'].saveSettings = main?.saveSettings || null;
                  } catch (e) {
                      window['${TAVERN_BRIDGE_GLOBAL_KEY_ACU}'] = window['${TAVERN_BRIDGE_GLOBAL_KEY_ACU}'] || {};
                      window['${TAVERN_BRIDGE_GLOBAL_KEY_ACU}'].error = String(e && (e.message || e));
                  }
              })();
          `;
          (doc.head || doc.documentElement || doc.body).appendChild(s);
          return true;
      } catch (e) {
          return false;
      }
  }

  async function initTavernSettingsBridge_ACU() {
      if (!USE_TAVERN_SETTINGS_STORAGE_ACU) return false;
      // 0) 先尝试从顶层 bridge 读取（最可靠：拿到真正的 extension_settings 对象）
      tryReadBridgeFromTop_ACU();
      // 0.1) 先抢救一下 saveSettings*（用于写盘）
      try {
          if (typeof topLevelWindow_ACU.saveSettingsDebounced === 'function') tavernSaveSettingsFn_ACU = topLevelWindow_ACU.saveSettingsDebounced;
          else if (typeof window.saveSettingsDebounced === 'function') tavernSaveSettingsFn_ACU = window.saveSettingsDebounced;
          else if (typeof topLevelWindow_ACU.saveSettings === 'function') tavernSaveSettingsFn_ACU = topLevelWindow_ACU.saveSettings;
          else if (typeof window.saveSettings === 'function') tavernSaveSettingsFn_ACU = window.saveSettings;
      } catch (e) { /* ignore */ }

      // 0.5) 如果运行在 about:srcdoc iframe，直接从顶层桥接（或注入桥接）拿 extension_settings
      tryReadBridgeFromTop_ACU();
      if (!tavernExtensionSettingsRoot_ACU) {
          await injectTavernBridgeIntoTopWindow_ACU();
          // 轮询等待 bridge 填充（最多 ~2s）
          for (let i = 0; i < 40 && !tavernExtensionSettingsRoot_ACU; i++) {
              tryReadBridgeFromTop_ACU();
              if (tavernExtensionSettingsRoot_ACU) break;
              await sleep_ACU(50);
          }
      }

      // 1) 取 saveSettings()
      try {
          const mod = await import('/script.js');
          if (mod) {
              // 优先 debounced（SillyTavern 常用写盘方式）
              if (typeof mod.saveSettingsDebounced === 'function') tavernSaveSettingsFn_ACU = mod.saveSettingsDebounced;
              else if (typeof mod.saveSettings === 'function') tavernSaveSettingsFn_ACU = mod.saveSettings;
          }
      } catch (e) {
          // ignore
      }
      // 2) 取 extension_settings（若可用）
      try {
          const ext = await import('/scripts/extensions.js');
          if (ext && ext.extension_settings) {
              tavernExtensionSettingsRoot_ACU = ext.extension_settings;
          }
      } catch (e) {
          // ignore
      }
      // 注意：不再使用 SillyTavern.extensionSettings 作为兜底（它在部分构建里不一定等于可持久化的 extension_settings）
      return !!tavernExtensionSettingsRoot_ACU;
  }

  function getTavernSettingsNamespace_ACU() {
      // 同步再尝试一次从顶层 bridge 获取（避免 init 未等待完成）
      tryReadBridgeFromTop_ACU();
      const root = tavernExtensionSettingsRoot_ACU;
      if (!root) return null;
      if (!root.__userscripts) root.__userscripts = {};
      if (!root.__userscripts[TAVERN_SETTINGS_NAMESPACE_ACU]) root.__userscripts[TAVERN_SETTINGS_NAMESPACE_ACU] = {};
      return root.__userscripts[TAVERN_SETTINGS_NAMESPACE_ACU];
  }

  function persistTavernSettings_ACU() {
      try {
          // 同步再尝试一次从顶层 bridge 获取
          tryReadBridgeFromTop_ACU();
          if (typeof tavernSaveSettingsFn_ACU === 'function') {
              tavernSaveSettingsFn_ACU();
              return;
          }
          // 兜底：优先 debounced
          if (typeof topLevelWindow_ACU.saveSettingsDebounced === 'function') { topLevelWindow_ACU.saveSettingsDebounced(); return; }
          if (typeof window.saveSettingsDebounced === 'function') { window.saveSettingsDebounced(); return; }
          // 兜底：部分酒馆构建可能把 saveSettings 暴露为全局函数
          if (typeof topLevelWindow_ACU.saveSettings === 'function') topLevelWindow_ACU.saveSettings();
          else if (typeof window.saveSettings === 'function') window.saveSettings();
      } catch (e) {
          console.warn('[ACU] Failed to persist to Tavern settings. Falling back to in-memory only.', e);
      }
  }

  // --- [新增] 配置本地副本：IndexedDB（仅本浏览器） ---
  const CONFIG_IDB_DB_NAME_ACU = `${SCRIPT_ID_PREFIX_ACU}_config_v1`;
  const CONFIG_IDB_STORE_NAME_ACU = 'kv';
  let configIdbPromise_ACU = null;
  const configIdbCache_ACU = new Map();
  const configIdbDeletedKeys_ACU = new Set();
  let configIdbCacheLoaded_ACU = false;
  let configIdbCacheLoadingPromise_ACU = null;
  let configIdbCacheLoadFailed_ACU = false;
  let pendingSettingsReloadFromIdb_ACU = false;

  function openConfigDb_ACU() {
      if (!isIndexedDbAvailable_ACU()) return Promise.resolve(null);
      if (configIdbPromise_ACU) return configIdbPromise_ACU;
      configIdbPromise_ACU = new Promise((resolve, reject) => {
          try {
              const req = topLevelWindow_ACU.indexedDB.open(CONFIG_IDB_DB_NAME_ACU, 1);
              req.onupgradeneeded = () => {
                  const db = req.result;
                  if (!db.objectStoreNames.contains(CONFIG_IDB_STORE_NAME_ACU)) {
                      db.createObjectStore(CONFIG_IDB_STORE_NAME_ACU);
                  }
              };
              req.onsuccess = () => resolve(req.result);
              req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
          } catch (e) {
              reject(e);
          }
      });
      return configIdbPromise_ACU;
  }

  function loadConfigIdbCache_ACU() {
      if (configIdbCacheLoaded_ACU || configIdbCacheLoadFailed_ACU) return Promise.resolve();
      if (configIdbCacheLoadingPromise_ACU) return configIdbCacheLoadingPromise_ACU;
      if (!isIndexedDbAvailable_ACU()) {
          configIdbCacheLoaded_ACU = true;
          return Promise.resolve();
      }
      configIdbCacheLoadingPromise_ACU = new Promise(async (resolve) => {
          try {
              const db = await openConfigDb_ACU();
              if (!db) {
                  configIdbCacheLoaded_ACU = true;
                  resolve();
                  return;
              }
              const tx = db.transaction(CONFIG_IDB_STORE_NAME_ACU, 'readonly');
              const store = tx.objectStore(CONFIG_IDB_STORE_NAME_ACU);
              const req = store.openCursor();
              req.onsuccess = () => {
                  const cursor = req.result;
                  if (cursor) {
                      const key = cursor.key;
                      if (!configIdbDeletedKeys_ACU.has(key) && !configIdbCache_ACU.has(key)) {
                          configIdbCache_ACU.set(key, cursor.value);
                      }
                      cursor.continue();
                  } else {
                      configIdbCacheLoaded_ACU = true;
                      resolve();
                  }
              };
              req.onerror = () => {
                  console.warn('[ACU] IndexedDB config cache load failed:', req.error);
                  configIdbCacheLoadFailed_ACU = true;
                  configIdbCacheLoaded_ACU = true;
                  resolve();
              };
          } catch (e) {
              console.warn('[ACU] IndexedDB config cache load failed:', e);
              configIdbCacheLoadFailed_ACU = true;
              configIdbCacheLoaded_ACU = true;
              resolve();
          }
      });
      return configIdbCacheLoadingPromise_ACU;
  }

  function ensureConfigIdbCacheLoaded_ACU() {
      return loadConfigIdbCache_ACU();
  }

  function configIdbGetCached_ACU(key) {
      return configIdbCache_ACU.has(key) ? configIdbCache_ACU.get(key) : null;
  }

  async function configIdbSetCached_ACU(key, value) {
      configIdbCache_ACU.set(key, value);
      configIdbDeletedKeys_ACU.delete(key);
      try {
          if (!isIndexedDbAvailable_ACU()) return;
          const db = await openConfigDb_ACU();
          if (!db) return;
          const tx = db.transaction(CONFIG_IDB_STORE_NAME_ACU, 'readwrite');
          const store = tx.objectStore(CONFIG_IDB_STORE_NAME_ACU);
          await idbRequestToPromise_ACU(store.put(value, key));
      } catch (e) {
          console.warn('[ACU] IndexedDB config set failed:', e);
      }
  }

  async function configIdbRemoveCached_ACU(key) {
      configIdbCache_ACU.delete(key);
      configIdbDeletedKeys_ACU.add(key);
      try {
          if (!isIndexedDbAvailable_ACU()) return;
          const db = await openConfigDb_ACU();
          if (!db) return;
          const tx = db.transaction(CONFIG_IDB_STORE_NAME_ACU, 'readwrite');
          const store = tx.objectStore(CONFIG_IDB_STORE_NAME_ACU);
          await idbRequestToPromise_ACU(store.delete(key));
      } catch (e) {
          console.warn('[ACU] IndexedDB config delete failed:', e);
      }
  }

  function getConfigStorage_ACU() {
      const ns = USE_TAVERN_SETTINGS_STORAGE_ACU ? getTavernSettingsNamespace_ACU() : null;
      const hasTavern = !!ns;
      return {
          getItem: key => {
              if (hasTavern && Object.prototype.hasOwnProperty.call(ns, key)) return ns[key];
              const cached = configIdbGetCached_ACU(key);
              if (cached !== null && typeof cached !== 'undefined') return cached;
              if (!FORBID_BROWSER_LOCAL_STORAGE_FOR_CONFIG_ACU && storage_ACU?.getItem) return storage_ACU.getItem(key);
              return null;
          },
          setItem: (key, value) => {
              const v = String(value);
              if (hasTavern) {
                  ns[key] = v;
                  persistTavernSettings_ACU();
              } else if (!FORBID_BROWSER_LOCAL_STORAGE_FOR_CONFIG_ACU && storage_ACU?.setItem) {
                  storage_ACU.setItem(key, v);
              }
              void configIdbSetCached_ACU(key, v);
          },
          removeItem: key => {
              if (hasTavern) {
                  delete ns[key];
                  persistTavernSettings_ACU();
              } else if (!FORBID_BROWSER_LOCAL_STORAGE_FOR_CONFIG_ACU && storage_ACU?.removeItem) {
                  storage_ACU.removeItem(key);
              }
              void configIdbRemoveCached_ACU(key);
          },
          _isTavern: hasTavern,
      };
  }

  function migrateKeyToTavernStorageIfNeeded_ACU(key) {
      const store = getConfigStorage_ACU();
      if (!store || !store._isTavern) return false;
      const cur = store.getItem(key);
      if (cur !== null && typeof cur !== 'undefined') return false;
      if (!ALLOW_LEGACY_LOCALSTORAGE_MIGRATION_ACU || !legacyLocalStorage_ACU) return false;
      const legacy = legacyLocalStorage_ACU.getItem(key);
      if (legacy !== null && typeof legacy !== 'undefined') {
          store.setItem(key, legacy);
          try { legacyLocalStorage_ACU.removeItem(key); } catch (e) { /* ignore */ }
          return true;
      }
      return false;
  }

  // --- [New] Profile 化存储工具：标识代码 <-> 存储键 ---
  const DEFAULT_ISOLATION_SLOT_ACU = '__default__'; // 空标识对应的槽位名（不要改）

  function normalizeIsolationCode_ACU(code) {
      return (typeof code === 'string') ? code.trim() : '';
  }

  function getIsolationSlot_ACU(code) {
      const c = normalizeIsolationCode_ACU(code);
      return c ? encodeURIComponent(c) : DEFAULT_ISOLATION_SLOT_ACU;
  }

  function getProfileSettingsKey_ACU(code) {
      return `${STORAGE_KEY_PROFILE_PREFIX_ACU}__${getIsolationSlot_ACU(code)}__settings`;
  }

  function getProfileTemplateKey_ACU(code) {
      return `${STORAGE_KEY_PROFILE_PREFIX_ACU}__${getIsolationSlot_ACU(code)}__template`;
  }

  function safeJsonParse_ACU(str, fallback = null) {
      try { return JSON.parse(str); } catch (e) { return fallback; }
  }

