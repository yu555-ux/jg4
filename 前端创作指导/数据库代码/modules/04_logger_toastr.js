// NOTE: Extracted from 数据库代码.user.js for initial decoupling.
// This module is not wired by default; it documents a functional slice.

function logDebug_ACU(...args) {
    if (DEBUG_MODE_ACU) console.log(`[${SCRIPT_ID_PREFIX_ACU}]`, ...args);
  }
  function logError_ACU(...args) {
    console.error(`[${SCRIPT_ID_PREFIX_ACU}]`, ...args);
  }
  function logWarn_ACU(...args) {
    console.warn(`[${SCRIPT_ID_PREFIX_ACU}]`, ...args);
  }

  // --- Toast / 通知（仅影响本插件的提示外观，不改变业务逻辑） ---
  const ACU_TOAST_TITLE_ACU = '魔·数据库';
  const _acuToastDedup_ACU = new Map(); // key -> ts
  let _acuToastStyleInjected_ACU = false;

  function ensureAcuToastStylesInjected_ACU() {
    if (_acuToastStyleInjected_ACU) return;
    try {
      const doc = topLevelWindow_ACU?.document || document;
      const styleId = `${SCRIPT_ID_PREFIX_ACU}-acu-toast-style`;
      if (doc.getElementById(styleId)) {
        _acuToastStyleInjected_ACU = true;
        return;
      }
      const style = doc.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* ACU Toast Theme (scoped to .acu-toast) */
        .acu-toast.toast {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "HarmonyOS Sans SC", "MiSans", Roboto, Helvetica, Arial, sans-serif;
          /* 左侧色条（不靠伪元素，避免与 toastr 默认图标机制冲突） */
          --acu-toast-accent: #7bb7ff;
          /* 重要：避免半透明在白底上发灰，看不清 */
          background: linear-gradient(90deg, var(--acu-toast-accent) 0 4px, #0f1623 4px) !important;
          color: #f2f6ff !important;
          border: 1px solid rgba(255,255,255,0.18) !important;
          border-radius: 12px !important;
          box-shadow: 0 18px 60px rgba(0,0,0,0.55) !important;
          padding: 12px 14px 12px 50px !important; /* 给图标徽章留位 */
          width: min(420px, calc(100vw - 24px)) !important;
          opacity: 1 !important; /* 覆盖 toastr 可能的淡化 */
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          position: relative !important;
          overflow: hidden !important;
        }
        /* 强制覆盖 Toastr/SillyTavern 更高优先级背景（你反馈“背景没变化”的根因多在这里） */
        #toast-container .acu-toast.toast,
        #toast-container .acu-toast.toast.toast-success,
        #toast-container .acu-toast.toast.toast-info,
        #toast-container .acu-toast.toast.toast-warning,
        #toast-container .acu-toast.toast.toast-error {
          background: linear-gradient(90deg, var(--acu-toast-accent) 0 4px, #0f1623 4px) !important;
          background-color: #0f1623 !important;
          background-image: none !important;
          opacity: 1 !important;
        }
        #toast-container .acu-toast.toast .toast-title,
        #toast-container .acu-toast.toast .toast-message {
          background: transparent !important;
        }
        /* 清掉 Toastr 默认的“背景图标/纹理”(你截图里的对勾棋盘格) */
        .acu-toast.toast,
        .acu-toast.toast.toast-success,
        .acu-toast.toast.toast-info,
        .acu-toast.toast.toast-warning,
        .acu-toast.toast.toast-error {
          background-image: none !important;
          background-repeat: no-repeat !important;
          background-position: 0 0 !important;
        }
        /* 图标徽章：统一位置与样式（解决✓/! 位置难看问题） */
        .acu-toast.toast::before {
          content: "i";
          position: absolute;
          left: 12px;
          top: 12px;
          width: 28px;
          height: 28px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 14px;
          color: #f2f6ff;
          background: #182235; /* 完全不透明 */
          border: 1px solid rgba(255,255,255,0.18);
          box-shadow: 0 8px 18px rgba(0,0,0,0.28);
        }
        .acu-toast.acu-toast--success { --acu-toast-accent: #4ad19f; }
        .acu-toast.acu-toast--info { --acu-toast-accent: #7bb7ff; }
        .acu-toast.acu-toast--warning { --acu-toast-accent: #ffb85c; }
        .acu-toast.acu-toast--error { --acu-toast-accent: #ff6b6b; }

        .acu-toast.acu-toast--success::before { content: "✓"; }
        .acu-toast.acu-toast--info::before { content: "i"; }
        .acu-toast.acu-toast--warning::before { content: "!"; }
        .acu-toast.acu-toast--error::before { content: "×"; }
        .acu-toast.toast .toast-title {
          font-weight: 750 !important;
          letter-spacing: 0.2px;
          margin-bottom: 4px !important;
          opacity: 0.95;
          text-shadow: 0 1px 2px rgba(0,0,0,0.45);
        }
        .acu-toast.toast .toast-message {
          line-height: 1.45;
          color: rgba(242,246,255,0.86) !important;
          text-shadow: 0 1px 2px rgba(0,0,0,0.45);
        }
        .acu-toast.toast .toast-close-button {
          color: rgba(255,255,255,0.65) !important;
          text-shadow: none !important;
          opacity: 0.85 !important;
        }
        .acu-toast.toast .toast-progress {
          background: rgba(123,183,255,0.55) !important;
        }
        .acu-toast.acu-toast--success { border-color: rgba(74,209,159,0.35) !important; }
        .acu-toast.acu-toast--info { border-color: rgba(123,183,255,0.35) !important; }
        .acu-toast.acu-toast--warning { border-color: rgba(255,184,92,0.35) !important; }
        .acu-toast.acu-toast--error { border-color: rgba(255,107,107,0.35) !important; }

        /* Plot abort button inside toast */
        .acu-toast .qrf-abort-btn {
          padding: 4px 10px !important;
          border-radius: 999px !important;
          border: 1px solid rgba(255,107,107,0.35) !important;
          background: rgba(255,107,107,0.18) !important;
          color: rgba(255,255,255,0.92) !important;
          font-weight: 650 !important;
          cursor: pointer !important;
        }
        .acu-toast .qrf-abort-btn:hover { background: rgba(255,107,107,0.26) !important; }
      `;
      doc.head.appendChild(style);
      _acuToastStyleInjected_ACU = true;
    } catch (e) {
      // 不影响功能
      _acuToastStyleInjected_ACU = true;
    }
  }

  function _acuNormalizeToastArgs_ACU(type, message, titleOrOptions = {}, maybeOptions = {}) {
    let title = ACU_TOAST_TITLE_ACU;
    let options = {};
    if (typeof titleOrOptions === 'string') {
      title = titleOrOptions || title;
      options = (maybeOptions && typeof maybeOptions === 'object') ? maybeOptions : {};
    } else {
      options = (titleOrOptions && typeof titleOrOptions === 'object') ? titleOrOptions : {};
    }

    // defaults
    const defaultTimeOut =
      type === 'success' ? 2500 :
      type === 'info' ? 2500 :
      type === 'warning' ? 3500 :
      type === 'error' ? 5000 : 2500;

    const isNarrow = (() => {
      try {
        const w = (topLevelWindow_ACU && typeof topLevelWindow_ACU.innerWidth === 'number')
          ? topLevelWindow_ACU.innerWidth
          : window.innerWidth;
        return w <= 520;
      } catch (e) { return false; }
    })();

    const finalOptions = {
      escapeHtml: false,
      closeButton: true,
      progressBar: true,
      newestOnTop: true,
      timeOut: defaultTimeOut,
      extendedTimeOut: 1000,
      tapToDismiss: true,
      // 让样式只作用于本插件 toast
      toastClass: `toast acu-toast acu-toast--${type}`,
      // 宽屏右上角，窄屏顶部居中（避免挡住关键 UI）
      positionClass: isNarrow ? 'toast-top-center' : 'toast-top-right',
      ...options,
    };
    return { title, finalOptions };
  }

  // =========================
  // [新增] Toast 静默门控（全局）
  // 需求：主界面新增勾选项（默认不勾选），勾选后除指定几类提示框外其它全部静默不显示。
  // 允许显示的类别（按用户要求）：
  // - 填表/规划成功提示框
  // - 正在规划提示框
  // - 任意报错提示框
  // - 手动填表/合并填表/外部导入提示框
  // 实现方式：在 showToastr_ACU 统一门控；调用方通过 options.acuToastCategory 打标。
  // =========================
  const ACU_TOAST_CATEGORY_ACU = {
    ERROR: 'error',
    TABLE_OK: 'table_ok',
    PLAN_OK: 'plan_ok',
    PLANNING: 'planning',
    MANUAL_TABLE: 'manual_table',
    MERGE_TABLE: 'merge_table',
    IMPORT: 'import',
  };

  function _acuShouldShowToast_ACU(type, title, message, options = {}) {
    try {
      if (!settings_ACU?.toastMuteEnabled) return true;
      if (String(type).toLowerCase() === 'error') return true;
      const cat = options?.acuToastCategory || null;
      const allow = new Set([
        ACU_TOAST_CATEGORY_ACU.ERROR,
        ACU_TOAST_CATEGORY_ACU.TABLE_OK,
        ACU_TOAST_CATEGORY_ACU.PLAN_OK,
        ACU_TOAST_CATEGORY_ACU.PLANNING,
        ACU_TOAST_CATEGORY_ACU.MANUAL_TABLE,
        ACU_TOAST_CATEGORY_ACU.MERGE_TABLE,
        ACU_TOAST_CATEGORY_ACU.IMPORT,
      ]);
      if (cat && allow.has(cat)) return true;
      // 兼容旧调用点：未打标时，根据文案进行“严格白名单”兜底，避免关键流程在静默模式下完全无反馈
      try {
        const raw = `${title || ''}\n${message || ''}`;
        const text = String(raw)
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .toLowerCase();
        const t = String(type).toLowerCase();
        const has = (s) => text.includes(String(s).toLowerCase());

        // 正在规划提示（长驻）
        if (has('正在规划')) return true;

        // 填表/规划成功
        if (t === 'success' && (has('填表') || has('规划'))) return true;
        if (t === 'success' && (has('更新') && has('成功'))) return true;

        // 手动填表/合并填表/外部导入提示
        const allowKeywords = ['手动填表', '手动更新', '合并', '外部导入', '导入', '注入'];
        if (allowKeywords.some(k => has(k))) return true;
      } catch (e) {}
      return false;
    } catch (e) {
      // 出错时不阻断提示
      return true;
    }
  }

  function showToastr_ACU(type, message, titleOrOptions = {}, maybeOptions = {}) {
    if (!toastr_API_ACU) {
      logDebug_ACU(`Toastr (${type}): ${message}`);
      return null;
    }

    ensureAcuToastStylesInjected_ACU();
    const { title, finalOptions } = _acuNormalizeToastArgs_ACU(type, message, titleOrOptions, maybeOptions);

    // [新增] 静默门控：在实际弹出之前统一拦截
    if (!_acuShouldShowToast_ACU(type, title, message, finalOptions)) return null;

    // 去重防刷屏：同样内容在短时间内只显示一次
    try {
      const key = `${type}|${title}|${String(message).replace(/<[^>]*>/g, '').slice(0, 120)}`;
      const now = Date.now();
      const last = _acuToastDedup_ACU.get(key) || 0;
      if (now - last < 1200) return null;
      _acuToastDedup_ACU.set(key, now);
    } catch (e) {}

    return toastr_API_ACU[type](message, title, finalOptions);
  }

