// Extracted from 前端创作指导/凡人修仙代码学习
// Focus: archive lifecycle (load/save)

async function saveToLog({ db, archiveName, newEntry }) {
  try {
    const archive = await db.archives.get(archiveName);
    if (!archive) return;
    archive.data.logs.push(newEntry);
    await db.archives.put(archive);
  } catch (e) {
    console.error('保存日志到数据库失败:', e);
  }
}

async function selectAndLoadArchive({
  archiveName,
  db,
  dbSet,
  cloudStorageConfig,
  ACTIVE_ARCHIVE_KEY,
  setCurrentArchiveName,
  setCurrentArchiveId,
  loadState,
  loadChatHistory,
  cultivationPanel,
  splashScreen,
  showCustomAlert,
  toggleCenterView,
  toggleExtremeModeUI,
  setActiveTheaterHTML,
  crypto,
}) {
  let archiveData;
  let loadedFromCloud = false;
  let finalArchiveName = archiveName;

  if (cloudStorageConfig.enabled && cloudStorageConfig.apiUrl) {
    try {
      const response = await fetch(
        `${cloudStorageConfig.apiUrl}/api/load?archiveName=${encodeURIComponent(archiveName)}`,
      );
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          archiveData = result.data;
          finalArchiveName = archiveData._internalName || archiveName;
          loadedFromCloud = true;
        }
      }
      if (!loadedFromCloud) {
        console.log(`云端未找到存档 "${archiveName}"，将尝试从本地加载。`);
      }
    } catch (error) {
      console.warn(`连接云服务器失败，将尝试从本地加载。错误: ${error.message}`);
    }
  }

  if (!archiveData) {
    const localArchive = await db.archives.get(archiveName);
    if (!localArchive || !localArchive.data) {
      await showCustomAlert(`加载存档 "${archiveName}" 失败: 在云端和本地均未找到该存档。`);
      return;
    }
    archiveData = localArchive.data;
    finalArchiveName = archiveName;
    loadedFromCloud = false;
  }

  try {
    await db.archives.put({ name: finalArchiveName, data: archiveData });
  } catch (error) {
    await showCustomAlert(`将存档数据写入本地时失败: ${error.message}`);
    return;
  }

  setCurrentArchiveName(finalArchiveName);
  await dbSet(ACTIVE_ARCHIVE_KEY, finalArchiveName);

  // 【修复】加载或迁移 archiveId，解决向量数据归属为"未知存档"的问题
  if (archiveData.archiveId) {
    setCurrentArchiveId(archiveData.archiveId);
  } else {
    // 旧存档迁移：生成新的 archiveId 并保存
    const newId = crypto.randomUUID();
    archiveData.archiveId = newId;
    setCurrentArchiveId(newId);
    await db.archives.put({ name: finalArchiveName, data: archiveData });
    console.log(`[存档迁移] 为旧存档 "${finalArchiveName}" 生成了 archiveId: ${newId}`);
  }

  const state = archiveData.state || {};
  setActiveTheaterHTML(state.activeTheaterHTML || null);

  if (cultivationPanel.classList.contains('hidden')) {
    splashScreen.classList.add('hidden');
    cultivationPanel.classList.remove('hidden');
  }

  const titleEl = document.getElementById('mobile-header-title');
  if (titleEl) {
    titleEl.innerHTML = `${finalArchiveName} ${loadedFromCloud ? '<i class="fas fa-cloud" title="云存档"></i>' : ''}`;
  }

  await loadState(state, archiveData);
  loadChatHistory(archiveData.logs, { data: archiveData });

  toggleCenterView('chat-view');
  toggleExtremeModeUI(state?.currentState?.isExtreme || false);
}

// module.exports = { saveToLog, selectAndLoadArchive };
