// Extracted from 前端创作指导/凡人修仙代码学习
// Focus: segmented memory context construction

function getLogsForContext(allLogs, summaryConfig) {
  const openingLog = allLogs.find(log => log.content.includes('<h4>天道初启</h4>'));

  const finalLogsForPrompt = [];
  // 【修改】收集所有过往记忆内容，最后统一包裹
  const pastMemoriesContent = [];

  if (openingLog && !openingLog.isGhost) {
    const cleanOpening = openingLog.content.replace(/<[^>]+>/g, '').trim();
    finalLogsForPrompt.push({
      type: 'system',
      content: `[世界背景设定]:\n${cleanOpening}`,
    });
  }

  const validLogs = allLogs
    .filter(log => !log.isSnapshot && !log.isUndoSnapshot && (!openingLog || log.id !== openingLog.id))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // 预计算分段记忆配置
  const segmentedEnabled = summaryConfig.segmentedMemoryEnabled;
  const chatLayers = segmentedEnabled ? (parseInt(summaryConfig.segmentedChatLayers, 10) || 20) : 0;
  const largeSummaryStart = segmentedEnabled ? (parseInt(summaryConfig.segmentedLargeSummaryStart, 10) || 50) : 0;

  validLogs.forEach((log, index) => {
    // 计算当前日志的倒序索引（从最新开始计数）
    const reverseIndex = validLogs.length - 1 - index;

    if (log.isDeepSummary === true) {
      // 深度总结日志：直接发送摘要
      const summaryText = `[历史记忆档案 (Time: ${new Date(log.timestamp).toLocaleString()})]:\n<overview>${
        log.largeSummary
      }</overview>\n<details>${log.smallSummary}</details>`;

      finalLogsForPrompt.push({
        type: 'system',
        content: summaryText,
      });
    } else if (segmentedEnabled) {
      // === 分段记忆启用时的处理逻辑 ===

      if (reverseIndex < chatLayers) {
        // 最新的 X 层：发送完整聊天记录（包括玩家输入和 AI 回复）
        let clean = log.content;
        if (log.type === 'ai') {
          clean = clean
            .replace(/<image>[\s\S]*?<\/image>/g, '')
            .replace(/image###[\s\S]*?###/g, '')
            .replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
        } else if (log.type === 'user') {
          clean = clean.replace(/^> /, '');
        }
        clean = clean.replace(/<[^>]+>/g, '').trim();
        if (clean) {
          finalLogsForPrompt.push({ type: log.type, content: clean });
        }
      } else {
        // 超过 chatLayers 的层：只发送 AI 回复的总结，跳过玩家输入
        if (log.type === 'ai') {
          // 判断使用小总结还是大总结
          const useLargeSummary = reverseIndex >= largeSummaryStart && log.largeSummary;
          const contentToUse = useLargeSummary ? log.largeSummary : (log.smallSummary || log.largeSummary);

          if (contentToUse) {
            // 【修改】收集过往记忆内容，不再单独添加
            pastMemoriesContent.push(contentToUse);
          }
          // 如果 AI 回复没有总结，则不发送任何内容（跳过）
        }
        // 玩家输入（type: 'user'）在此处被完全跳过
      }
    } else {
      // === 分段记忆未启用时的处理逻辑（保持原有行为）===
      let cleanContent = log.content;
      if (log.type === 'ai') {
        cleanContent = log.content
          .replace(/<thinking>[\s\S]*?<\/thinking>/g, '')
          .replace(/<image>[\s\S]*?<\/image>/g, '')
          .replace(/image###[\s\S]*?###/g, '')
          .replace(/<[^>]+>/g, '')
          .trim();
      } else if (log.type === 'user') {
        cleanContent = log.content.replace(/^> /, '').trim();
      }

      if (cleanContent) {
        finalLogsForPrompt.push({
          type: log.type || 'system',
          content: cleanContent,
        });
      }
    }
  });

  // 【修改】如果有过往记忆，用 <过往记忆> 标签统一包裹后添加
  if (pastMemoriesContent.length > 0) {
    const wrappedMemories = `<过往记忆>\n${pastMemoriesContent.join('\n\n')}\n</过往记忆>`;
    let insertIndex = finalLogsForPrompt.findIndex(l => l.type !== 'system');
    if (insertIndex === -1) insertIndex = finalLogsForPrompt.length;

    finalLogsForPrompt.splice(insertIndex, 0, {
      type: 'system',
      content: wrappedMemories,
    });
  }

  return {
    openingLog,
    summaryLogs: [],
    hiddenChatLogs: [],
    visibleChatLogs: validLogs.filter(l => !l.isDeepSummary),
    logsForPrompt: finalLogsForPrompt,
  };
}

// module.exports = { getLogsForContext };
