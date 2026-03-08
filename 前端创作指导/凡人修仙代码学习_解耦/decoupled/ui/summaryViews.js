// Extracted from 前端创作指导/凡人修仙代码学习
// Focus: summary viewer/editor UI handlers

async function openSummaryViewer({
  type,
  db,
  currentArchiveName,
  segmentedMemoryOverlay,
  summaryViewerOverlay,
  openSummaryEditor,
  deleteSelectedSummaries,
}) {
  const modal = document.getElementById('summary-viewer-overlay');
  const modalContainer = modal.querySelector('.modal');

  let buttonGroup = modalContainer.querySelector('.button-group');
  if (!buttonGroup) {
    buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';
    buttonGroup.style.cssText = 'margin-top: 15px; justify-content: flex-end;';
    buttonGroup.innerHTML = `
      <button id="delete-selected-summaries-btn" class="major-action-button" disabled>
        <i class="fas fa-trash-alt"></i> 删除选中
      </button>
    `;
    modalContainer.appendChild(buttonGroup);
  }
  const deleteBtn = document.getElementById('delete-selected-summaries-btn');

  deleteBtn.disabled = true;
  deleteBtn.onclick = () => deleteSelectedSummaries(type);

  const title = type === 'small' ? '小总结记录 (详细)' : '大总结记录 (摘要)';
  const summaryKey = type === 'small' ? 'smallSummary' : 'largeSummary';

  document.getElementById('summary-viewer-title').textContent = title;
  const listEl = document.getElementById('summary-viewer-list');
  listEl.innerHTML = '';

  const archive = await db.archives.get(currentArchiveName);
  const logs = archive ? archive.data.logs : [];

  const floorDisplayMap = new Map();
  let virtualFloorCounter = 1;

  logs.forEach(log => {
    if (log.isSnapshot || log.isUndoSnapshot) return;

    if (log.isDeepSummary) {
      const count = log.mergedCount || 10;
      const start = virtualFloorCounter;
      const end = virtualFloorCounter + count - 1;

      floorDisplayMap.set(
        log.id,
        `第 ${start}-${end} 层 <span style='color:#ffd700; font-size:0.8em;'>(深度合并)</span>`,
      );

      virtualFloorCounter += count;
    } else {
      floorDisplayMap.set(log.id, `第 ${virtualFloorCounter} 层`);
      virtualFloorCounter++;
    }
  });

  const logsWithSummary = logs
    .filter(log => log[summaryKey])
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (logsWithSummary.length === 0) {
    listEl.innerHTML = `<p style="text-align:center; opacity:0.7;">当前存档没有${title}。</p>`;
  } else {
    logsWithSummary.forEach(log => {
      const item = document.createElement('div');
      item.className = 'summary-list-item';
      item.style.cursor = 'default';

      let label = floorDisplayMap.get(log.id) || '未知层级';

      if (log.isGhost && !log.isDeepSummary) {
        label = `<strong style="color: #66bb6a;">[背景记忆/前情提要]</strong>`;
      }

      const fullText = log[summaryKey] || '';
      const previewText = fullText.length > 40 ? fullText.substring(0, 40) + '...' : fullText;

      item.innerHTML = `
        <input type="checkbox" class="summary-checkbox" data-log-id="${log.id}" style="margin-right: 15px; transform: scale(1.2); cursor: pointer;">
        <div class="summary-text-content" style="flex-grow: 1; cursor: pointer; display: flex; flex-direction: column; gap: 5px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight:bold;">${label}</span>
            <small style="color: var(--text-secondary);">${new Date(log.timestamp).toLocaleString()}</small>
          </div>
          <div style="font-size: 0.9em; color: #ccc; opacity: 0.8;">
            ${previewText}
          </div>
        </div>
      `;

      item.querySelector('.summary-text-content').addEventListener('click', () => openSummaryEditor(log.id, type));
      listEl.appendChild(item);
    });
  }

  listEl.onchange = e => {
    if (e.target.classList.contains('summary-checkbox')) {
      const checkedCount = listEl.querySelectorAll('.summary-checkbox:checked').length;
      deleteBtn.disabled = checkedCount === 0;
    }
  };

  if (segmentedMemoryOverlay) segmentedMemoryOverlay.classList.remove('visible');
  summaryViewerOverlay.classList.add('visible');
}

async function openSummaryEditor({
  logId,
  type,
  db,
  currentArchiveName,
  summaryViewerOverlay,
  summaryEditorOverlay,
  setCurrentEditingSummary,
}) {
  setCurrentEditingSummary({ logId, type });
  const title = type === 'small' ? '编辑小总结' : '编辑大总结';
  const summaryKey = type === 'small' ? 'smallSummary' : 'largeSummary';

  document.getElementById('summary-editor-title').textContent = title;

  const archive = await db.archives.get(currentArchiveName);
  const log = archive.data.logs.find(l => l.id === logId);

  document.getElementById('summary-editor-textarea').value = log ? log[summaryKey] || '' : '';
  summaryViewerOverlay.classList.remove('visible');
  summaryEditorOverlay.classList.add('visible');
}

async function saveSummaryFromEditor({
  currentEditingSummary,
  db,
  currentArchiveName,
  showCustomAlert,
  summaryEditorOverlay,
  openSummaryViewer,
}) {
  const { logId, type } = currentEditingSummary;
  if (!logId || !type) return;

  const summaryKey = type === 'small' ? 'smallSummary' : 'largeSummary';
  const newText = document.getElementById('summary-editor-textarea').value;

  const archive = await db.archives.get(currentArchiveName);
  const logIndex = archive.data.logs.findIndex(l => l.id === logId);
  if (logIndex !== -1) {
    archive.data.logs[logIndex][summaryKey] = newText;
    await db.archives.put(archive);
    await showCustomAlert('总结已保存！');
    summaryEditorOverlay.classList.remove('visible');
    await openSummaryViewer(type);
  } else {
    await showCustomAlert('保存失败，找不到对应记录。');
  }
}

async function openManualSegmentedMemoryEditor({ logId, db, currentArchiveName, manualSegmentedMemoryOverlay, setCurrentManualSegmentedLogId }) {
  setCurrentManualSegmentedLogId(logId);
  const archive = await db.archives.get(currentArchiveName);
  const log = archive.data.logs.find(l => l.id === logId);

  document.getElementById('manual-small-summary').value = log?.smallSummary || '';
  document.getElementById('manual-large-summary').value = log?.largeSummary || '';
  manualSegmentedMemoryOverlay.classList.add('visible');
}

async function saveManualSegmentedMemory({
  currentManualSegmentedLogId,
  db,
  currentArchiveName,
  showCustomAlert,
  manualSegmentedMemoryOverlay,
  setCurrentManualSegmentedLogId,
}) {
  if (!currentManualSegmentedLogId) return;

  const smallSummary = document.getElementById('manual-small-summary').value;
  const largeSummary = document.getElementById('manual-large-summary').value;

  const archive = await db.archives.get(currentArchiveName);
  const logIndex = archive.data.logs.findIndex(l => l.id === currentManualSegmentedLogId);

  if (logIndex !== -1) {
    archive.data.logs[logIndex].smallSummary = smallSummary;
    archive.data.logs[logIndex].largeSummary = largeSummary;
    await db.archives.put(archive);
    await showCustomAlert('手动分段记忆已补充！');
    manualSegmentedMemoryOverlay.classList.remove('visible');
  } else {
    await showCustomAlert('保存失败，找不到对应记录。');
  }
  setCurrentManualSegmentedLogId(null);
}

// module.exports = {
//   openSummaryViewer,
//   openSummaryEditor,
//   saveSummaryFromEditor,
//   openManualSegmentedMemoryEditor,
//   saveManualSegmentedMemory,
// };
