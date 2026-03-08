// NOTE: Extracted from 数据库代码.user.js for initial decoupling.
// This module is not wired by default; it documents a functional slice.

function sanitizeSheetForStorage_ACU(sheet) {
      if (!sheet || typeof sheet !== 'object') return sheet;
      const out = {};
      SHEET_KEEP_KEYS_ACU.forEach(k => {
          if (sheet[k] !== undefined) out[k] = sheet[k];
      });
      // 兜底：保证结构可被模板导入验证通过
      if (!out.name && sheet.name) out.name = sheet.name;
      if (!out.content && Array.isArray(sheet.content)) out.content = sheet.content;
      if (!out.sourceData && sheet.sourceData) out.sourceData = sheet.sourceData;
      return out;
  }

  function sanitizeChatSheetsObject_ACU(dataObj, { ensureMate = false } = {}) {
      if (!dataObj || typeof dataObj !== 'object') return dataObj;
      const out = {};
      Object.keys(dataObj).forEach(k => {
          if (k.startsWith('sheet_')) {
              out[k] = sanitizeSheetForStorage_ACU(dataObj[k]);
          } else if (k === 'mate') {
              out.mate = dataObj.mate;
          } else {
              // 其它顶层键：为兼容保留
              out[k] = dataObj[k];
          }
      });
      if (ensureMate) {
          if (!out.mate || typeof out.mate !== 'object') out.mate = { type: 'chatSheets', version: 1 };
          if (!out.mate.type) out.mate.type = 'chatSheets';
          if (!out.mate.version) out.mate.version = 1;
      }
      return out;
  }

  function lightenDarkenColor_ACU(col, amt) {
    let usePound = false;
    if (col.startsWith('#')) {
      col = col.slice(1);
      usePound = true;
    }
    let num = parseInt(col, 16);
    let r = (num >> 16) + amt;
    if (r > 255) r = 255;
    else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00ff) + amt;
    if (b > 255) b = 255;
    else if (b < 0) b = 0;
    let g = (num & 0x0000ff) + amt;
    if (g > 255) g = 255;
    else if (g < 0) g = 0;
    return (usePound ? '#' : '') + ('000000' + ((r << 16) | (b << 8) | g).toString(16)).slice(-6);
  }
  function getContrastYIQ_ACU(hexcolor) {
    if (hexcolor.startsWith('#')) hexcolor = hexcolor.slice(1);
    var r = parseInt(hexcolor.substr(0, 2), 16);
    var g = parseInt(hexcolor.substr(2, 2), 16);
    var b = parseInt(hexcolor.substr(4, 2), 16);
    var yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#000000' : '#FFFFFF';
  }


  // [新增] 辅助函数：从上下文中提取指定标签的内容（正文标签提取）
  function extractContextTags_ACU(text, tagNames, excludeUserMessages = false) {
      if (!text || !tagNames || tagNames.length === 0) {
          return text;
      }

      let result = text;

      // 如果排除用户消息，则需要按行处理
      if (excludeUserMessages) {
          const lines = result.split('\n');
          const processedLines = lines.map(line => {
              // 检查是否是用户消息行（通常以特定格式标识）
              if (line.includes('[User]') || line.includes('User:') || line.includes('用户:')) {
                  return line; // 用户消息不处理
              }
              // 对非用户消息行进行标签提取
              return extractTagsFromLine(line, tagNames);
          });
          result = processedLines.join('\n');
      } else {
          result = extractTagsFromLine(result, tagNames);
      }

      return result;
  }

  // 辅助函数：从单行文本中提取标签内容
  function extractTagsFromLine(text, tagNames) {
      if (!text || !tagNames || tagNames.length === 0) {
          return text;
      }

      let result = text;
      const extractedParts = [];

      tagNames.forEach(tagName => {
          const content = extractLastTagContent(text, tagName);
          if (content !== null) {
              extractedParts.push(`<${tagName}>${content}</${tagName}>`);
          }
      });

      if (extractedParts.length > 0) {
          result = extractedParts.join('\n\n');
      }

      return result;
  }

  // 辅助函数：提取文本中最后一个指定标签的内容
  function extractLastTagContent(text, tagName) {
      if (!text || !tagName) return null;
      const lower = text.toLowerCase();
      const open = `<${tagName.toLowerCase()}>`;
      const close = `</${tagName.toLowerCase()}>`;

      const closeIdx = lower.lastIndexOf(close);
      if (closeIdx === -1) return null;

      const openIdx = lower.lastIndexOf(open, closeIdx);
      if (openIdx === -1) return null;

      const contentStart = openIdx + open.length;
      const content = text.slice(contentStart, closeIdx);
      return content;
  }

  // [新增] 标签列表解析：支持英文逗号/中文逗号/空格分隔
  function parseTagList_ACU(input) {
      if (!input || typeof input !== 'string') return [];
      return input
          .split(/[,，\s]+/g)
          .map(t => t.trim())
          .filter(Boolean)
          .map(t => t.replace(/[<>]/g, '')); // 防止用户输入 <tag>
  }

  // [新增] 从文本中移除指定标签块：<tag>...</tag>（大小写不敏感，支持属性）
  function removeTaggedBlocks_ACU(text, tagNames) {
      if (!text || !Array.isArray(tagNames) || tagNames.length === 0) return text;
      let result = String(text);
      tagNames.forEach(tag => {
          if (!tag) return;
          const safe = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const re = new RegExp(`<\\s*${safe}\\b[^>]*>[\\s\\S]*?<\\s*\\/\\s*${safe}\\s*>`, 'gi');
          result = result.replace(re, '');
      });
      // 清理多余空行
      result = result.replace(/\n{3,}/g, '\n\n').trim();
      return result;
  }

  // [新增] 上下文筛选：标签提取 + 标签排除（可单独生效，也可叠加）
  function applyContextTagFilters_ACU(text, { extractTags = '', excludeTags = '' } = {}) {
      let result = String(text ?? '');
      const includeList = parseTagList_ACU(extractTags);
      const excludeList = parseTagList_ACU(excludeTags);
      if (includeList.length > 0) {
          result = extractContextTags_ACU(result, includeList, false);
      }
      if (excludeList.length > 0) {
          result = removeTaggedBlocks_ACU(result, excludeList);
      }
      return result;
  }

  // [新增] 辅助函数：判断表格是否是总结表或总体大纲表
  function isSummaryOrOutlineTable_ACU(tableName) {
      if (!tableName || typeof tableName !== 'string') return false;
      const trimmedName = tableName.trim();
      return trimmedName === '总结表' || trimmedName === '总体大纲';
  }

  // [新增] 辅助函数：判断表格是否是标准表（非总结表和总体大纲表）
  function isStandardTable_ACU(tableName) {
      return !isSummaryOrOutlineTable_ACU(tableName);
  }

  // =========================
  // [新增] 表格更新锁定与总结索引锁定（按聊天+隔离标签存储）
  // =========================
  function getTableLockScopeKey_ACU() {
      const chatKey = (currentChatFileIdentifier_ACU || 'default').trim() || 'default';
      const isolationKey = getCurrentIsolationKey_ACU() || '';
      return `${chatKey}::${isolationKey}`;
  }

  function ensureTableLockStore_ACU() {
      if (!settings_ACU.tableUpdateLocks || typeof settings_ACU.tableUpdateLocks !== 'object') {
          settings_ACU.tableUpdateLocks = {};
      }
      if (!settings_ACU.specialIndexLocks || typeof settings_ACU.specialIndexLocks !== 'object') {
          settings_ACU.specialIndexLocks = {};
      }
  }

  function getTableLocksForSheet_ACU(sheetKey) {
      const scopeKey = getTableLockScopeKey_ACU();
      const bucket = settings_ACU?.tableUpdateLocks?.[scopeKey]?.[sheetKey] || {};
      return {
          rows: new Set(Array.isArray(bucket.rows) ? bucket.rows : []),
          cols: new Set(Array.isArray(bucket.cols) ? bucket.cols : []),
          cells: new Set(Array.isArray(bucket.cells) ? bucket.cells : []),
      };
  }

  function saveTableLocksForSheet_ACU(sheetKey, lockState) {
      if (!sheetKey) return;
      ensureTableLockStore_ACU();
      const scopeKey = getTableLockScopeKey_ACU();
      if (!settings_ACU.tableUpdateLocks[scopeKey]) settings_ACU.tableUpdateLocks[scopeKey] = {};
      settings_ACU.tableUpdateLocks[scopeKey][sheetKey] = {
          rows: Array.from(lockState.rows || []),
          cols: Array.from(lockState.cols || []),
          cells: Array.from(lockState.cells || []),
      };
      saveSettings_ACU();
  }

  function toggleRowLock_ACU(sheetKey, rowIndex) {
      const lockState = getTableLocksForSheet_ACU(sheetKey);
      if (lockState.rows.has(rowIndex)) lockState.rows.delete(rowIndex);
      else lockState.rows.add(rowIndex);
      saveTableLocksForSheet_ACU(sheetKey, lockState);
  }

  function toggleColLock_ACU(sheetKey, colIndex) {
      const lockState = getTableLocksForSheet_ACU(sheetKey);
      if (lockState.cols.has(colIndex)) lockState.cols.delete(colIndex);
      else lockState.cols.add(colIndex);
      saveTableLocksForSheet_ACU(sheetKey, lockState);
  }

  function toggleCellLock_ACU(sheetKey, rowIndex, colIndex) {
      const lockState = getTableLocksForSheet_ACU(sheetKey);
      const key = `${rowIndex}:${colIndex}`;
      if (lockState.cells.has(key)) lockState.cells.delete(key);
      else lockState.cells.add(key);
      saveTableLocksForSheet_ACU(sheetKey, lockState);
  }

  function isSpecialIndexLockEnabled_ACU(sheetKey) {
      const scopeKey = getTableLockScopeKey_ACU();
      const bucket = settings_ACU?.specialIndexLocks?.[scopeKey] || {};
      if (typeof bucket[sheetKey] === 'boolean') return bucket[sheetKey];
      return true; // 默认锁定
  }

  function setSpecialIndexLockEnabled_ACU(sheetKey, enabled) {
      if (!sheetKey) return;
      ensureTableLockStore_ACU();
      const scopeKey = getTableLockScopeKey_ACU();
      if (!settings_ACU.specialIndexLocks[scopeKey]) settings_ACU.specialIndexLocks[scopeKey] = {};
      settings_ACU.specialIndexLocks[scopeKey][sheetKey] = !!enabled;
      saveSettings_ACU();
  }

  function getSummaryIndexColumnIndex_ACU(table) {
      try {
          if (!table || !Array.isArray(table.content) || !Array.isArray(table.content[0])) return -1;
          const headers = table.content[0].slice(1);
          if (!headers.length) return -1;
          let idx = headers.findIndex(h => {
              if (typeof h !== 'string') return false;
              return /编码|索引/.test(h);
          });
          if (idx === -1) idx = headers.length - 1;
          return idx;
      } catch (e) {
          return -1;
      }
  }

  function formatSummaryIndexCode_ACU(num) {
      const n = Math.max(1, parseInt(num, 10) || 1);
      return `AM${String(n).padStart(4, '0')}`;
  }

  function applySummaryIndexSequenceToTable_ACU(table, colIndex) {
      if (!table || !Array.isArray(table.content) || colIndex < 0) return;
      for (let i = 1; i < table.content.length; i++) {
          const row = table.content[i];
          if (!Array.isArray(row)) continue;
          row[colIndex + 1] = formatSummaryIndexCode_ACU(i);
      }
  }

  function applySpecialIndexSequenceToSummaryTables_ACU(dataObj) {
      if (!dataObj || typeof dataObj !== 'object') return;
      Object.keys(dataObj).forEach(sheetKey => {
          if (!sheetKey.startsWith('sheet_')) return;
          const table = dataObj[sheetKey];
          if (!table || !isSummaryOrOutlineTable_ACU(table.name)) return;
          if (!isSpecialIndexLockEnabled_ACU(sheetKey)) return;
          const colIndex = getSummaryIndexColumnIndex_ACU(table);
          if (colIndex < 0) return;
          applySummaryIndexSequenceToTable_ACU(table, colIndex);
      });
  }

  // [重构] 辅助函数：全表数据合并 (从独立存储中恢复完整状态)
  // [数据隔离核心] 严格按照当前隔离标签读取数据，无标签也是标签的一种
  async function mergeAllIndependentTables_ACU() {
      const chat = SillyTavern_API_ACU.chat;
      if (!chat || chat.length === 0) {
          logDebug_ACU('Cannot merge data: Chat history is empty.');
          return null;
      }

      // [数据隔离核心] 获取当前隔离标签键名
      const currentIsolationKey = getCurrentIsolationKey_ACU();
      logDebug_ACU(`[Merge] Loading data for isolation key: [${currentIsolationKey || '无标签'}]`);

      // [新增] 聊天级“空白指导表”：一旦存在，本聊天合并/显示顺序都按指导表，不再按模板
      // 注意：该指导表按隔离标签分槽，因此切换标识时可拥有不同的“参数/表头/顺序总指导”
      const sheetGuideData = getChatSheetGuideDataForIsolationKey_ACU(currentIsolationKey);
      const hasSheetGuide = !!(sheetGuideData && typeof sheetGuideData === 'object' && Object.keys(sheetGuideData).some(k => k.startsWith('sheet_')));

      // 1. [优化] 不使用模板作为基础，动态收集聊天记录中的所有实际数据
      let mergedData = {};
      const foundSheets = {};

      for (let i = chat.length - 1; i >= 0; i--) {
          const message = chat[i];
          if (message.is_user) continue;

          // [优先级1] 检查新版按标签分组存储 TavernDB_ACU_IsolatedData
          if (message.TavernDB_ACU_IsolatedData && message.TavernDB_ACU_IsolatedData[currentIsolationKey]) {
              const tagData = message.TavernDB_ACU_IsolatedData[currentIsolationKey];
              const independentData = tagData.independentData || {};
              const modifiedKeys = tagData.modifiedKeys || [];
              const updateGroupKeys = tagData.updateGroupKeys || [];

              Object.keys(independentData).forEach(storedSheetKey => {
                  if (!foundSheets[storedSheetKey]) {
                      mergedData[storedSheetKey] = JSON.parse(JSON.stringify(independentData[storedSheetKey]));
                      foundSheets[storedSheetKey] = true;

                      // 更新表格状态
                      let wasUpdated = false;
                      if (updateGroupKeys.length > 0 && modifiedKeys.length > 0) {
                          wasUpdated = updateGroupKeys.includes(storedSheetKey);
                      } else if (modifiedKeys.length > 0) {
                          wasUpdated = modifiedKeys.includes(storedSheetKey);
                      } else {
                          wasUpdated = true;
                      }

                      if (wasUpdated) {
                          if (!independentTableStates_ACU[storedSheetKey]) {
                              independentTableStates_ACU[storedSheetKey] = {};
                          }
                          const currentAiFloor = chat.slice(0, i + 1).filter(m => !m.is_user).length;
                          independentTableStates_ACU[storedSheetKey].lastUpdatedAiFloor = currentAiFloor;
                      }
                  }
              });
          }

          // [优先级2] 兼容旧版存储格式 - 严格匹配隔离标签
          // [数据隔离核心逻辑] 无标签也是标签的一种，严格隔离不同标签的数据
          const msgIdentity = message.TavernDB_ACU_Identity;
          let isLegacyMatch = false;
          if (settings_ACU.dataIsolationEnabled) {
              // 开启隔离：严格匹配标识代码
              isLegacyMatch = (msgIdentity === settings_ACU.dataIsolationCode);
          } else {
              // 关闭隔离（无标签模式）：只匹配无标识数据
              isLegacyMatch = !msgIdentity;
          }

          if (isLegacyMatch) {
              // 检查旧版独立数据格式
              if (message.TavernDB_ACU_IndependentData) {
                  const independentData = message.TavernDB_ACU_IndependentData;
                  const modifiedKeys = message.TavernDB_ACU_ModifiedKeys || [];
                  const updateGroupKeys = message.TavernDB_ACU_UpdateGroupKeys || [];

                  Object.keys(independentData).forEach(storedSheetKey => {
                      if (!foundSheets[storedSheetKey]) {
                          mergedData[storedSheetKey] = JSON.parse(JSON.stringify(independentData[storedSheetKey]));
                          foundSheets[storedSheetKey] = true;

                          let wasUpdated = false;
                          if (updateGroupKeys.length > 0 && modifiedKeys.length > 0) {
                              wasUpdated = updateGroupKeys.includes(storedSheetKey);
                          } else if (modifiedKeys.length > 0) {
                              wasUpdated = modifiedKeys.includes(storedSheetKey);
                          } else {
                              wasUpdated = true;
                          }

                          if (wasUpdated) {
                              if (!independentTableStates_ACU[storedSheetKey]) independentTableStates_ACU[storedSheetKey] = {};
                              const currentAiFloor = chat.slice(0, i + 1).filter(m => !m.is_user).length;
                              independentTableStates_ACU[storedSheetKey].lastUpdatedAiFloor = currentAiFloor;
                          }
                      }
                  });
              }

              // 检查旧版标准表/总结表格式
              if (message.TavernDB_ACU_Data) {
                  const standardData = message.TavernDB_ACU_Data;
                  Object.keys(standardData).forEach(k => {
                      if (k.startsWith('sheet_') && !foundSheets[k] && standardData[k].name && !isSummaryOrOutlineTable_ACU(standardData[k].name)) {
                          mergedData[k] = JSON.parse(JSON.stringify(standardData[k]));
                          foundSheets[k] = true;
                          if (!independentTableStates_ACU[k]) independentTableStates_ACU[k] = {};
                          const currentAiFloor = chat.slice(0, i + 1).filter(m => !m.is_user).length;
                          independentTableStates_ACU[k].lastUpdatedAiFloor = currentAiFloor;
                      }
                  });
              }
              if (message.TavernDB_ACU_SummaryData) {
                  const summaryData = message.TavernDB_ACU_SummaryData;
                  Object.keys(summaryData).forEach(k => {
                      if (k.startsWith('sheet_') && !foundSheets[k] && summaryData[k].name && isSummaryOrOutlineTable_ACU(summaryData[k].name)) {
                          mergedData[k] = JSON.parse(JSON.stringify(summaryData[k]));
                          foundSheets[k] = true;
                          if (!independentTableStates_ACU[k]) independentTableStates_ACU[k] = {};
                          const currentAiFloor = chat.slice(0, i + 1).filter(m => !m.is_user).length;
                          independentTableStates_ACU[k].lastUpdatedAiFloor = currentAiFloor;
                      }
                  });
              }
          }
      }

      const foundCount = Object.keys(foundSheets).length;
      logDebug_ACU(`[Merge] Found ${foundCount} tables for tag [${currentIsolationKey || '无标签'}] from chat history.`);

      // 如果没有任何数据：
      // - 若存在"空白指导表"：优先返回“指导表物化结构”（表头+参数；seedRows 仅保留字段，不默认展开到 content）
      // - 否则返回 null，让调用方按旧逻辑处理（例如用完整模板结构作为占位符）
      if (foundCount <= 0) {
          if (hasSheetGuide) {
              // 直接物化：仅表头（seedRows 保留在字段中，但不作为“当前对话真实数据行”展示）
              const base = materializeDataFromSheetGuide_ACU(sheetGuideData, { includeSeedRows: false });
              const orderedKeys = getSortedSheetKeys_ACU(base);
              return reorderDataBySheetKeys_ACU(base, orderedKeys);
          }
          return null;
      }

      // [兼容迁移] 旧版：updateConfig 的 0 表示“沿用UI”；新版：-1 表示“沿用UI”
      // 注意：聊天记录里保存的是“单表对象”，没有 mate 标记，因此用 updateConfig.uiSentinel 作为表级标记。
      Object.keys(mergedData).forEach(k => {
          if (!k.startsWith('sheet_')) return;
          const sheet = mergedData[k];
          const uc = (sheet && typeof sheet === 'object') ? sheet.updateConfig : null;
          if (!uc || typeof uc !== 'object') return;
          if (uc.uiSentinel === -1) return; // 已是新语义
          for (const field of ['contextDepth', 'updateFrequency', 'batchSize', 'skipFloors']) {
              if (Object.prototype.hasOwnProperty.call(uc, field) && uc[field] === 0) {
                  uc[field] = -1;
              }
          }
          uc.uiSentinel = -1;
      });

      // [新增] 若存在"空白指导表"，则：
      // 1) 过滤掉不在指导表里的表（UI/填表只以指导表为准，避免旧表复活）
      // 2) 对指导表中缺失的表：使用指导表结构作为初始值（seedRows 仅保留字段，不默认展开到 content）
      // 3) 对于存在历史数据的表：以历史数据为主，但表名/表头/参数/顺序以指导表为准；不把 seedRows 合并进真实数据行
      if (hasSheetGuide) {
          const guided = materializeDataFromSheetGuide_ACU(sheetGuideData, { includeSeedRows: false });
          const guideKeys = getSortedSheetKeys_ACU(guided, { ignoreChatGuide: true, includeMissingFromGuide: true });
          guideKeys.forEach(k => {
              if (!k || !k.startsWith('sheet_')) return;
              const guideSheet = guided[k];
              const hist = mergedData[k];
              if (hist && typeof hist === 'object') {
                  const next = JSON.parse(JSON.stringify(hist));
                  next.uid = k;
                  // 需求4（视觉编辑器改名/改表头/改参数）：合并展示以指导表为准（不影响历史真实数据行，仅覆盖“元信息/表头/参数/顺序”）
                  if (guideSheet?.name) next.name = guideSheet.name;
                  if (guideSheet?.sourceData) next.sourceData = JSON.parse(JSON.stringify(guideSheet.sourceData));
                  if (guideSheet?.updateConfig) next.updateConfig = JSON.parse(JSON.stringify(guideSheet.updateConfig));
                  if (guideSheet?.exportConfig) next.exportConfig = JSON.parse(JSON.stringify(guideSheet.exportConfig));
                  // 表头：以指导表为准，并对行做简单对齐（pad/truncate）
                  const guideHeader = (guideSheet && Array.isArray(guideSheet.content) && Array.isArray(guideSheet.content[0]))
                      ? JSON.parse(JSON.stringify(guideSheet.content[0]))
                      : null;
                  if (!Array.isArray(next.content)) next.content = guideHeader ? [guideHeader] : [[null]];
                  if (guideHeader) {
                      next.content[0] = guideHeader;
                      const targetLen = guideHeader.length;
                      for (let r = 1; r < next.content.length; r++) {
                          const row = next.content[r];
                          if (!Array.isArray(row)) continue;
                          // [修复] 在对齐行长度之前，保留 auto_merged 标签
                          const hasAutoMergedTag = row.length > 0 && row[row.length - 1] === 'auto_merged';
                          if (row.length < targetLen) {
                              while (row.length < targetLen) row.push('');
                              // 如果原本有 auto_merged 标签，在填充后重新添加
                              if (hasAutoMergedTag && row[row.length - 1] !== 'auto_merged') {
                                  row.push('auto_merged');
                              }
                          } else if (row.length > targetLen) {
                              // [修复] 截断时保留 auto_merged 标签
                              row.splice(targetLen);
                              if (hasAutoMergedTag) {
                                  row.push('auto_merged');
                              }
                          }
                      }
                  }
                  // 顺序编号以指导表为准
                  if (Number.isFinite(guideSheet?.[TABLE_ORDER_FIELD_ACU])) next[TABLE_ORDER_FIELD_ACU] = Math.trunc(guideSheet[TABLE_ORDER_FIELD_ACU]);
                  // 保留 seedRows 字段（不参与实际 content 合并）
                  if (Array.isArray(guideSheet?.seedRows)) next.seedRows = JSON.parse(JSON.stringify(guideSheet.seedRows));
                  guided[k] = next;
              } else {
                  // 无历史数据：直接使用指导表物化结果（不展开 seedRows）
                  if (Number.isFinite(guideSheet?.[TABLE_ORDER_FIELD_ACU])) guided[k][TABLE_ORDER_FIELD_ACU] = Math.trunc(guideSheet[TABLE_ORDER_FIELD_ACU]);
              }
          });
          mergedData = guided;
      }

      // [修复] 合并结果按“用户手动顺序/模板顺序”重排，避免合并过程导致的随机乱序
      const orderedKeys = getSortedSheetKeys_ACU(mergedData);
      mergedData = reorderDataBySheetKeys_ACU(mergedData, orderedKeys);
      return mergedData;
  }

  // [重构] 刷新合并数据并通知前端和更新世界书
  async function refreshMergedDataAndNotify_ACU() {
      // 重新加载聊天记录
    await loadAllChatMessages_ACU();

    // 合并数据 (使用新的独立表合并逻辑)
    let mergedData = await mergeAllIndependentTables_ACU();

    // 当回溯找不到任何表格数据时（mergedData 为 null），
    // 优先用“已保存指导表的物化结构（不展开 seedRows）”作为基底；
    // 若不存在指导表，才使用“模板结构（不展开预置数据）”。
    if (!mergedData) {
        const currentIsolationKey = getCurrentIsolationKey_ACU();
        const guide = getChatSheetGuideDataForIsolationKey_ACU(currentIsolationKey);
        if (guide && typeof guide === 'object' && Object.keys(guide).some(k => k.startsWith('sheet_'))) {
            logDebug_ACU('[回溯空数据] 无历史表格数据：使用已保存指导表物化结构（不展开 seedRows）作为基底。');
            mergedData = materializeDataFromSheetGuide_ACU(guide, { includeSeedRows: false });
            currentJsonTableData_ACU = mergedData;
        } else {
            logDebug_ACU('[回溯空数据] 无历史表格数据且无指导表：使用模板结构（不展开预置数据）。');
            const templateData = parseTableTemplateJson_ACU({ stripSeedRows: true }); // 仅结构，不携带模板预置数据行
            if (templateData) {
                mergedData = templateData;
                currentJsonTableData_ACU = templateData;
            } else {
                // 极端兜底：模板也解析失败，设为空对象
                currentJsonTableData_ACU = { mate: { type: 'chatSheets', version: 1 } };
                logWarn_ACU('[回溯空数据] 模板解析失败，currentJsonTableData_ACU 设为最小空结构。');
            }
        }
        // 刷新 UI 选择器
        if ($manualTableSelector_ACU) {
            renderManualTableSelector_ACU();
        }
        if ($importTableSelector_ACU) {
            renderImportTableSelector_ACU();
        }
    } else {
        // 更新内存中的数据
        // [新增] 数据完整性检查：在加载数据时为AM编码的条目自动添加auto_merged标记
        let integrityFixed = false;
        Object.keys(mergedData).forEach(sheetKey => {
            if (mergedData[sheetKey] && mergedData[sheetKey].content && Array.isArray(mergedData[sheetKey].content)) {
                const table = mergedData[sheetKey];
                table.content.slice(1).forEach((row, idx) => {
                    if (row && row.length > 1 && row[1] && row[1].startsWith('AM') && row[row.length - 1] !== 'auto_merged') {
                        // 发现AM开头的条目缺少auto_merged标记，自动修复
                        row.push('auto_merged');
                        integrityFixed = true;
                        logDebug_ACU(`[数据修复] 为表格${sheetKey}的第${idx + 1}条AM开头的条目添加auto_merged标记`);
                    }
                });
            }
        });

        if (integrityFixed) {
            logDebug_ACU('数据完整性已自动修复，添加了缺失的auto_merged标记');
        }

        // [修复] 强制稳定顺序（用户手动顺序优先，否则模板顺序）
        const stableKeys = getSortedSheetKeys_ACU(mergedData);
        currentJsonTableData_ACU = reorderDataBySheetKeys_ACU(mergedData, stableKeys);
        logDebug_ACU('Updated currentJsonTableData_ACU with independently merged data.');
        if ($manualTableSelector_ACU) {
            renderManualTableSelector_ACU();
        }
        if ($importTableSelector_ACU) {
            renderImportTableSelector_ACU();
        }
    }

    // 更新世界书（此时 currentJsonTableData_ACU 已是最新状态，空数据也会被正确处理）
    await updateReadableLorebookEntry_ACU(true);
    logDebug_ACU('Updated worldbook entries with merged data.');

    // 通知前端进行UI刷新，并等待前端完成数据读取
    return new Promise((resolve) => {
        // 1. 通知前端 (iframe context)
        if (topLevelWindow_ACU.AutoCardUpdaterAPI) {
            topLevelWindow_ACU.AutoCardUpdaterAPI._notifyTableUpdate();
            logDebug_ACU('Notified frontend to refresh UI after data merge.');
        }

        // 2. [修复] 独立检查并刷新可视化编辑器
        // 使用新定义的全局刷新函数，确保逻辑一致性
        setTimeout(() => {
             if (typeof window.ACU_Visualizer_Refresh === 'function') {
                 window.ACU_Visualizer_Refresh();
                 logDebug_ACU('Triggered global visualizer refresh.');
             } else if (jQuery_API_ACU('#acu-visualizer-content').length || ACU_WindowManager.isOpen(`${SCRIPT_ID_PREFIX_ACU}-visualizer-window`)) {
                 // Fallback
                 jQuery_API_ACU(document).trigger('acu-visualizer-refresh-data');
             }
        }, 200); // 稍微增加延迟

        // 3. 刷新当前打开的插件设置弹窗 (UI context)
        if ($popupInstance_ACU && $popupInstance_ACU.is(':visible')) {
             // 刷新状态显示 (消息计数)
             if (typeof updateCardUpdateStatusDisplay_ACU === 'function') {
                 updateCardUpdateStatusDisplay_ACU();
             }
        }

        // [修复] 等待足够的时间，确保前端完成数据读取和UI刷新
        // 使用较长的延迟，确保前端有足够时间处理数据
        setTimeout(() => {
            logDebug_ACU('UI refresh wait period completed. Frontend should have finished reading data.');
            resolve();
        }, 800); // 增加到 800ms，确保前端有足够时间读取数据
    });
  }

