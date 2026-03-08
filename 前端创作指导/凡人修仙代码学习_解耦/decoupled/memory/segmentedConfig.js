// Extracted from 前端创作指导/凡人修仙代码学习
// Focus: segmented memory config save

function buildSegmentedMemoryConfig(input) {
  const chatLayers = parseInt(input.segmentedChatLayers, 10) || 0;
  const largeSummaryStart = parseInt(input.segmentedLargeSummaryStart, 10) || 0;
  const summaryThreshold = parseInt(input.segmentedSummaryThreshold, 10) || 10;

  if (largeSummaryStart > 0 && largeSummaryStart <= chatLayers) {
    return { error: '错误：大总结的起始层数必须大于完整聊天记录的层数。' };
  }

  return {
    config: {
      segmentedMemoryEnabled: !!input.segmentedMemoryEnabled,
      segmentedChatLayers: chatLayers,
      segmentedLargeSummaryStart: largeSummaryStart,
      segmentedSummaryThreshold: summaryThreshold,
      autoDeepSummaryEnabled: !!input.autoDeepSummaryEnabled,
      autoApiUpdateEnabled: !!input.autoApiUpdateEnabled,
      autoUpdateSmallSummary: !!input.autoUpdateSmallSummary,
      autoUpdateLargeSummary: !!input.autoUpdateLargeSummary,
      autoUpdateRetryEnabled: !!input.autoUpdateRetryEnabled,
    },
  };
}

async function saveSegmentedMemorySettings({
  summaryConfig,
  input,
  dbSet,
  SUMMARY_CONFIG_KEY,
  showCustomAlert,
  closeOverlay,
}) {
  const { error, config } = buildSegmentedMemoryConfig(input);
  if (error) {
    await showCustomAlert(error);
    return;
  }

  Object.assign(summaryConfig, config);
  await dbSet(SUMMARY_CONFIG_KEY, summaryConfig);
  await showCustomAlert('分段记忆设置已保存！');
  if (closeOverlay) closeOverlay();
}

// module.exports = { buildSegmentedMemoryConfig, saveSegmentedMemorySettings };
