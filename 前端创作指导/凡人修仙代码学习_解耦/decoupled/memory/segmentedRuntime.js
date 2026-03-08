// Extracted from 前端创作指导/凡人修仙代码学习
// Focus: segmented memory runtime (API updates + deep summary)

function computeFloorDisplayMap(logs) {
  const floorDisplayMap = new Map();
  let virtualFloorCounter = 1;

  logs.forEach(log => {
    if (log.isSnapshot || log.isUndoSnapshot) return;

    if (log.isDeepSummary) {
      const count = log.mergedCount || 10;
      const start = virtualFloorCounter;
      const end = virtualFloorCounter + count - 1;
      floorDisplayMap.set(log.id, {
        displayText: `第 ${start}-${end} 层 (深度合并)`,
        realFloor: start,
        start,
        end,
        isDeepSummary: true,
        timestamp: log.timestamp,
      });
      virtualFloorCounter += count;
    } else {
      floorDisplayMap.set(log.id, {
        displayText: `第 ${virtualFloorCounter} 层`,
        realFloor: virtualFloorCounter,
        floor: virtualFloorCounter,
        isDeepSummary: false,
      });
      virtualFloorCounter++;
    }
  });

  return floorDisplayMap;
}

async function callSummaryApiDirect({ summaryConfig, prompt, signal }) {
  const { apiUrl, apiKey, apiModel } = summaryConfig;
  if (!apiUrl || !apiModel) {
    throw new Error('自定义API配置不完整。');
  }

  let fetchUrl = apiUrl.replace(/\/$/, '');
  if (!fetchUrl.includes('/v1/chat/completions')) {
    if (!fetchUrl.includes('/v1')) {
      fetchUrl += '/v1';
    }
    if (!fetchUrl.endsWith('/chat/completions')) {
      fetchUrl += '/chat/completions';
    }
  }

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const body = {
    model: apiModel,
    messages: [
      { role: 'system', content: 'You are a helpful assistant that summarizes text concisely.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.5,
    max_tokens: 25000,
  };

  const response = await fetch(fetchUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function apiUpdateSummary({
  summaryConfig,
  db,
  currentArchiveName,
  type,
  startLayer,
  endLayer,
  concurrency,
  onlyMissing,
  showCustomAlert,
  showCustomConfirm,
  showDanmaku,
  callSummaryApiDirectFn,
  showApiUpdateResultModal,
}) {
  if (!summaryConfig.apiUrl || !summaryConfig.apiModel) {
    await showCustomAlert('请先在分段记忆设置中配置自定义 API。');
    return;
  }

  const archive = await db.archives.get(currentArchiveName);
  if (!archive) {
    await showCustomAlert('当前没有激活的存档。');
    return;
  }

  if (startLayer < 1 || endLayer < 1 || startLayer > endLayer) {
    await showCustomAlert('请输入有效的层数范围（起始层 ≤ 结束层）。');
    return;
  }

  const allLogs = archive.data.logs;
  const floorDisplayMap = computeFloorDisplayMap(allLogs);

  const validChatLogs = allLogs
    .filter(
      log =>
        !log.isDeepSummary &&
        !log.isSnapshot &&
        !log.isUndoSnapshot &&
        !log.isGhost &&
        log.type === 'ai',
    )
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  if (validChatLogs.length === 0) {
    await showCustomAlert('当前存档中没有可更新的 AI 回复记录。');
    return;
  }

  if (endLayer > validChatLogs.length) {
    await showCustomAlert(`范围超出上限，当前只有 ${validChatLogs.length} 层有效 AI 回复。`);
    return;
  }

  const logsInRange = validChatLogs.slice(startLayer - 1, endLayer);

  const typeName = type === 'small' ? '小总结' : '大总结';
  const summaryField = type === 'small' ? 'smallSummary' : 'largeSummary';
  const promptTemplate = type === 'small' ? summaryConfig.smallSummaryPrompt : summaryConfig.largeSummaryPrompt;

  if (!promptTemplate) {
    await showCustomAlert(`请先在分段记忆设置中配置${typeName}提示词。`);
    return;
  }

  let logsToUpdate = [];
  let updateDetails = [];

  for (let i = 0; i < logsInRange.length; i++) {
    const log = logsInRange[i];
    const floorInfo = floorDisplayMap.get(log.id) || { displayText: `第 ? 层`, realFloor: 0 };

    if (onlyMissing) {
      if (!log[summaryField] || !log[summaryField].trim()) {
        logsToUpdate.push(log);
        updateDetails.push({
          logId: log.id,
          displayFloor: floorInfo.displayText,
          realFloor: floorInfo.realFloor,
          timestamp: log.timestamp,
          success: null,
          error: null,
          summary: null,
        });
      }
    } else {
      logsToUpdate.push(log);
      updateDetails.push({
        logId: log.id,
        displayFloor: floorInfo.displayText,
        realFloor: floorInfo.realFloor,
        timestamp: log.timestamp,
        success: null,
        error: null,
        summary: null,
      });
    }
  }

  if (logsToUpdate.length === 0) {
    await showCustomAlert(`指定范围内没有需要更新的${typeName}。\n${onlyMissing ? '（所有层都已有总结）' : ''}`);
    return;
  }

  let layerListStr = '';
  if (updateDetails.length <= 10) {
    layerListStr = updateDetails.map(d => d.displayFloor).join(', ');
  } else {
    const first5 = updateDetails.slice(0, 5).map(d => d.displayFloor).join(', ');
    const last3 = updateDetails.slice(-3).map(d => d.displayFloor).join(', ');
    layerListStr = `${first5}, ... , ${last3}`;
  }

  const confirmMsg =
    `确定要使用 API 更新以下层的${typeName}吗？\n\n` +
    `📊 将更新 ${logsToUpdate.length} 条记录\n` +
    `📋 具体层号: ${layerListStr}\n` +
    `⚡ 并行数: ${concurrency}\n` +
    `${onlyMissing ? '✅ 仅更新缺失的总结' : '🔄 覆盖所有总结'}`;

  const confirmed = await showCustomConfirm(confirmMsg);
  if (!confirmed) return;

  const statusDanmaku = showDanmaku(`正在更新${typeName}...`, 'status');
  let successCount = 0;
  let failCount = 0;
  let completedCount = 0;

  const updateSingleLog = async (log, detailIndex) => {
    const content = log.unoptimizedContent || log.content || '';

    if (!content.trim()) {
      updateDetails[detailIndex].success = false;
      updateDetails[detailIndex].error = '内容为空';
      return { success: false, error: '内容为空' };
    }

    const prompt = promptTemplate.replace(/\{\{content\}\}/g, content.replace(/<[^>]+>/g, '').trim());

    try {
      const result = await callSummaryApiDirectFn({ summaryConfig, prompt });

      if (result) {
        let parsedContent = result.trim();
        const summaryMatch = result.match(/<summary>([\s\S]*?)<\/summary>/i);
        if (summaryMatch) {
          parsedContent = summaryMatch[1].trim();
        }
        if (!parsedContent) {
          parsedContent = result.trim();
        }

        const originalLogIndex = archive.data.logs.findIndex(l => l.id === log.id);
        if (originalLogIndex !== -1) {
          archive.data.logs[originalLogIndex][summaryField] = parsedContent;
          updateDetails[detailIndex].success = true;
          updateDetails[detailIndex].summary = parsedContent;
          updateDetails[detailIndex].rawResponse = result;
          return { success: true };
        } else {
          updateDetails[detailIndex].success = false;
          updateDetails[detailIndex].error = '找不到原始日志';
          return { success: false, error: '找不到原始日志' };
        }
      } else {
        updateDetails[detailIndex].success = false;
        updateDetails[detailIndex].error = 'API 返回空结果';
        return { success: false, error: 'API 返回空结果' };
      }
    } catch (e) {
      console.error(`更新 ${updateDetails[detailIndex].displayFloor} ${typeName}失败:`, e);
      updateDetails[detailIndex].success = false;
      updateDetails[detailIndex].error = e.message;
      return { success: false, error: e.message };
    }
  };

  try {
    if (concurrency === 1) {
      for (let i = 0; i < logsToUpdate.length; i++) {
        const result = await updateSingleLog(logsToUpdate[i], i);
        if (result.success) successCount++;
        else failCount++;
        completedCount++;
        statusDanmaku.textContent = `正在更新${typeName}... (${completedCount}/${logsToUpdate.length})`;
      }
    } else {
      const chunks = [];
      for (let i = 0; i < logsToUpdate.length; i += concurrency) {
        chunks.push({
          logs: logsToUpdate.slice(i, i + concurrency),
          indices: Array.from({ length: Math.min(concurrency, logsToUpdate.length - i) }, (_, k) => i + k),
        });
      }

      for (const chunk of chunks) {
        const promises = chunk.logs.map((log, idx) => updateSingleLog(log, chunk.indices[idx]));
        const results = await Promise.allSettled(promises);

        for (const result of results) {
          if (result.status === 'fulfilled' && result.value.success) successCount++;
          else failCount++;
          completedCount++;
        }
        statusDanmaku.textContent = `正在更新${typeName}... (${completedCount}/${logsToUpdate.length})`;
      }
    }

    await db.archives.put(archive);

    if (statusDanmaku) statusDanmaku.remove();
    showApiUpdateResultModal(typeName, updateDetails, successCount, failCount);
  } catch (error) {
    if (statusDanmaku) statusDanmaku.remove();
    console.error('API 更新分段记忆失败:', error);
    await showCustomAlert(`更新失败: ${error.message}`);
  }
}

async function autoApiUpdateSummaryForLog({
  summaryConfig,
  db,
  currentArchiveName,
  logEntry,
  showDanmaku,
  callSummaryApiDirectFn,
}) {
  if (!summaryConfig.autoApiUpdateEnabled) return;
  if (!summaryConfig.apiUrl || !summaryConfig.apiModel) return;
  if (!logEntry || logEntry.type !== 'ai') return;

  const content = logEntry.unoptimizedContent || logEntry.content || '';
  if (!content.trim()) return;

  const maxRetries = summaryConfig.autoUpdateRetryEnabled ? 3 : 1;
  let statusDanmaku = null;
  let controller = new AbortController();

  const callWithRetry = async (prompt, typeName) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await callSummaryApiDirectFn({ summaryConfig, prompt });
        if (result) return result.trim();
        throw new Error('API 返回为空');
      } catch (error) {
        console.warn(`[分段记忆] ${typeName}更新失败 (尝试 ${attempt}/${maxRetries}):`, error.message);
        if (attempt < maxRetries && summaryConfig.autoUpdateRetryEnabled) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          throw error;
        }
      }
    }
  };

  const parseSummaryResult = text => {
    if (!text) return '';
    const match = text.match(/<summary>([\s\S]*?)<\/summary>/i);
    return match ? match[1].trim() : text.trim();
  };

  try {
    const taskList = [];
    if (summaryConfig.autoUpdateSmallSummary) taskList.push('小总结');
    if (summaryConfig.autoUpdateLargeSummary) taskList.push('大总结');

    if (taskList.length > 0) {
      statusDanmaku = showDanmaku(`正在自动更新${taskList.join('和')}...`, 'status', controller, true);
    }

    if (summaryConfig.autoUpdateSmallSummary && summaryConfig.smallSummaryPrompt) {
      const prompt = summaryConfig.smallSummaryPrompt.replace(/\{\{content\}\}/g, content.replace(/<[^>]+>/g, '').trim());
      const result = await callWithRetry(prompt, '小总结');
      if (result) logEntry.smallSummary = parseSummaryResult(result);
    }

    if (summaryConfig.autoUpdateLargeSummary && summaryConfig.largeSummaryPrompt) {
      const prompt = summaryConfig.largeSummaryPrompt.replace(/\{\{content\}\}/g, content.replace(/<[^>]+>/g, '').trim());
      const result = await callWithRetry(prompt, '大总结');
      if (result) logEntry.largeSummary = parseSummaryResult(result);
    }

    const archive = await db.archives.get(currentArchiveName);
    if (archive) {
      const logIndex = archive.data.logs.findIndex(l => l.id === logEntry.id);
      if (logIndex !== -1) {
        if (logEntry.smallSummary) archive.data.logs[logIndex].smallSummary = logEntry.smallSummary;
        if (logEntry.largeSummary) archive.data.logs[logIndex].largeSummary = logEntry.largeSummary;
        await db.archives.put(archive);
      }
    }
  } catch (error) {
    console.error('[分段记忆] 自动 API 更新失败:', error);
    showDanmaku(`分段记忆更新失败: ${error.message}`, 'error');
  } finally {
    if (statusDanmaku) statusDanmaku.remove();
  }
}

async function checkAndRunLayeredSummary({
  summaryConfig,
  db,
  currentArchiveName,
  callSummaryApi,
  showCustomAlert,
  showCustomConfirm,
  showDanmaku,
  loadChatHistory,
  force = false,
  manualRange = null,
}) {
  if (!summaryConfig.segmentedMemoryEnabled) {
    if (force) await showCustomAlert('请先在设置中启用分段记忆功能。');
    return;
  }

  if (!summaryConfig.apiUrl || !summaryConfig.apiModel) {
    if (force) await showCustomAlert('请先在分段记忆设置中配置自定义 API。');
    return;
  }

  if (!force && !summaryConfig.autoDeepSummaryEnabled) return;

  const archive = await db.archives.get(currentArchiveName);
  if (!archive) return;

  let statusDanmaku = null;
  let controller = new AbortController();

  try {
    const validChatLogs = archive.data.logs
      .filter(
        log =>
          !log.isDeepSummary &&
          !log.isSnapshot &&
          !log.isUndoSnapshot &&
          !log.content.includes('<h4>天道初启</h4>') &&
          !log.isGhost,
      )
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    let batchToCompress = [];
    let rangeStart = 1;
    let rangeEnd = validChatLogs.length;

    if (manualRange) {
      const { start, end } = manualRange;
      if (end > validChatLogs.length) {
        await showCustomAlert(`范围超出上限，当前只有 ${validChatLogs.length} 层有效剧情。`);
        return;
      }
      rangeStart = start;
      rangeEnd = end;
      batchToCompress = validChatLogs.slice(start - 1, end);

      if (batchToCompress.length === 0) {
        await showCustomAlert('指定范围内没有可总结的日志。');
        return;
      }
    } else {
      const threshold = parseInt(summaryConfig.segmentedSummaryThreshold) || 100;
      if (validChatLogs.length < threshold) {
        if (force) await showCustomAlert(`当前积累楼层 (${validChatLogs.length}) 未达到设定阈值 (${threshold})。`);
        return;
      }
      rangeEnd = threshold;
      batchToCompress = validChatLogs.slice(0, threshold);
    }

    const logsWithSmallSummary = batchToCompress.filter(log => log.smallSummary && log.smallSummary.trim().length > 5);

    if (logsWithSmallSummary.length === 0) {
      await showCustomAlert(
        `指定范围 (第 ${rangeStart} 层 — 第 ${rangeEnd} 层) 内没有带有小总结的楼层。\n\n` +
          `请先使用"手动API更新"为相关楼层生成小总结，然后再进行深度总结。`,
      );
      return;
    }

    archive.data.logs = archive.data.logs.filter(log => !log.isUndoSnapshot);

    const undoSnapshot = {
      id: `undo_snapshot_${Date.now()}`,
      timestamp: new Date().toISOString(),
      content: `[系统快照] 深度记忆凝练操作前 (第${rangeStart}-${rangeEnd}层, 含${logsWithSmallSummary.length}条小总结)`,
      type: 'system',
      isUndoSnapshot: true,
      snapshotOfLogs: JSON.parse(JSON.stringify(archive.data.logs.filter(l => !l.isUndoSnapshot))),
    };
    archive.data.logs.push(undoSnapshot);

    statusDanmaku = showDanmaku(
      `正在归纳 ${logsWithSmallSummary.length} 条小总结 (第${rangeStart}-${rangeEnd}层)...`,
      'status',
      controller,
    );

    const textToSummarizeArray = logsWithSmallSummary
      .map((log, index) => {
        const originalIndex = batchToCompress.indexOf(log) + 1;
        let role = log.type === 'user' ? 'Player' : 'NPC/System';
        if (log.type === 'ai') role = 'AI';
        return `[第${rangeStart + originalIndex - 1}层 ${role}]: ${log.smallSummary.trim()}`;
      })
      .filter(Boolean);

    const textToSummarize = textToSummarizeArray.join('\n\n');

    const manualPrompt =
      summaryConfig.deepSummaryPrompt ||
      `你是一名专业的小说档案管理员。请阅读 <input_data> 中的分段记忆小总结，将其归纳整理为精炼的深度总结。`;
    const combinedPrompt = `${manualPrompt}

(注意：输入数据全部为已有的分段记忆小总结，共 ${logsWithSmallSummary.length} 条，请将它们整合成一份连贯的深度记忆档案)

请严格遵守以下输出格式（保留XML标签）：

<small_summary>
(200-500字详细总结，保留关键细节和情节发展)
</small_summary>
<large_summary>
(50-100字精简概括，用于长期记忆索引)
</large_summary>

<input_data>
${textToSummarize}
</input_data>`;

    const combinedSummaryResult = await callSummaryApi(combinedPrompt, controller.signal);

    if (!combinedSummaryResult) throw new Error('API返回为空。');

    const smallSummaryMatch = combinedSummaryResult.match(/<small_summary>([\s\S]*?)<\/small_summary>/i);
    const largeSummaryMatch = combinedSummaryResult.match(/<large_summary>([\s\S]*?)<\/large_summary>/i);

    let deepSmallSummary = smallSummaryMatch ? smallSummaryMatch[1].trim() : '';
    let deepLargeSummary = largeSummaryMatch ? largeSummaryMatch[1].trim() : '';

    if (!deepSmallSummary && !deepLargeSummary) {
      const fallbackText = combinedSummaryResult.replace(/<[^>]+>/g, '').trim();
      if (fallbackText) {
        deepSmallSummary = fallbackText;
        deepLargeSummary = fallbackText.substring(0, 100) + (fallbackText.length > 100 ? '...' : '');
        showDanmaku('AI未按XML返回，已使用全部内容作为总结。', 'warning');
      } else {
        throw new Error('总结失败：AI返回内容为空或无法解析。');
      }
    } else if (!deepSmallSummary) {
      deepSmallSummary = deepLargeSummary;
    } else if (!deepLargeSummary) {
      deepLargeSummary = deepSmallSummary.substring(0, 100) + (deepSmallSummary.length > 100 ? '...' : '');
    }

    const newDeepSummaryLog = {
      id: `deep_summary_${Date.now()}`,
      timestamp: batchToCompress[batchToCompress.length - 1].timestamp,
      type: 'system',
      content: `[深度总结-分段记忆: 第${rangeStart}-${rangeEnd}层, 含 ${logsWithSmallSummary.length} 条小总结]\n<br><strong>概述:</strong> ${deepLargeSummary}\n<hr><details><summary>详细记录</summary>${deepSmallSummary.replace(
        /\n/g,
        '<br>',
      )}</details>`,
      isDeepSummary: true,
      smallSummary: deepSmallSummary,
      largeSummary: deepLargeSummary,
      mergedCount: batchToCompress.length,
      mergedRange: { start: rangeStart, end: rangeEnd },
      summaryCount: logsWithSmallSummary.length,
    };

    const idsToRemove = new Set(batchToCompress.map(l => l.id));
    const finalLogList = [];
    let insertedSummary = false;

    for (const log of archive.data.logs) {
      if (idsToRemove.has(log.id)) {
        if (!insertedSummary) {
          finalLogList.push(newDeepSummaryLog);
          insertedSummary = true;
        }
      } else {
        finalLogList.push(log);
      }
    }

    archive.data.logs = finalLogList;
    await db.archives.put(archive);

    if (archive.name === currentArchiveName) {
      loadChatHistory(archive.data.logs, archive);
    }

    await showCustomAlert(
      `深度总结完成！\n\n` +
        `📊 范围：第 ${rangeStart} 层 — 第 ${rangeEnd} 层\n` +
        `📋 归纳了 ${logsWithSmallSummary.length} 条小总结\n` +
        `✅ 旧楼层已删除，替换为深度记忆点。`,
    );
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('取消操作');
    } else {
      console.error('深度总结失败:', error);
      showDanmaku(`失败: ${error.message}`, 'error');
    }
  } finally {
    if (statusDanmaku) statusDanmaku.remove();
    controller = null;
  }
}

async function undoLastDeepSummary({ db, currentArchiveName, showCustomAlert, showCustomConfirm, loadChatHistory, showDanmaku }) {
  const archive = await db.archives.get(currentArchiveName);
  if (!archive) {
    await showCustomAlert('当前没有激活的存档。');
    return;
  }

  const lastUndoSnapshot = [...archive.data.logs].reverse().find(log => log.isUndoSnapshot === true);

  if (!lastUndoSnapshot) {
    await showCustomAlert('未找到可用于撤销的记忆快照。');
    return;
  }

  const userConfirmed = await showCustomConfirm('确定要撤销上次的深度记忆凝练，并恢复到操作前的状态吗？');
  if (!userConfirmed) return;

  archive.data.logs = lastUndoSnapshot.snapshotOfLogs;
  archive.data.logs = archive.data.logs.filter(log => !log.isUndoSnapshot);

  await db.archives.put(archive);
  loadChatHistory(archive.data.logs, archive);
  showDanmaku('时光回溯成功，上次的记忆凝练已被撤销。', 'success');
}

async function refreshDeepSummaryInfo({ db, currentArchiveName, render }) {
  const archive = await db.archives.get(currentArchiveName);
  if (!archive) return;

  const allLogs = archive.data.logs;
  const floorDisplayMap = computeFloorDisplayMap(allLogs);

  const deepSummaryLogs = allLogs.filter(log => log.isDeepSummary);

  const floorsWithSmallSummary = [];
  allLogs.forEach(log => {
    if (log.isDeepSummary || log.isSnapshot || log.isUndoSnapshot || log.isGhost) return;
    if (log.content && log.content.includes('<h4>天道初启</h4>')) return;
    if (log.smallSummary && log.smallSummary.trim().length > 5) {
      const floorInfo = floorDisplayMap.get(log.id);
      if (floorInfo && !floorInfo.isDeepSummary) floorsWithSmallSummary.push(floorInfo.floor);
    }
  });

  render({ deepSummaryLogs, floorDisplayMap, floorsWithSmallSummary });
}

// module.exports = {
//   computeFloorDisplayMap,
//   callSummaryApiDirect,
//   apiUpdateSummary,
//   autoApiUpdateSummaryForLog,
//   checkAndRunLayeredSummary,
//   undoLastDeepSummary,
//   refreshDeepSummaryInfo,
// };
