// 全局函数声明（由酒馆助手提供）
declare function getLastMessageId(): number;
declare function getChatMessages(
  range: string | number,
  options?: { role?: 'user' | 'assistant' | 'system' },
): Array<{ message_id: number; role: string; message?: string }>;
declare function triggerSlash(command: string): Promise<string>;
declare const toastr: {
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
};

/**
 * 显示读档对话框
 */
export function showLoadSave(): void {
  try {
    if (typeof getLastMessageId === 'undefined' || typeof getChatMessages === 'undefined') {
      toastr.error('读档功能不可用', '错误');
      return;
    }

    const lastMessageId = getLastMessageId();
    const messages = getChatMessages(`0-${lastMessageId}`, { role: 'assistant' });

    if (messages.length === 0) {
      toastr.warning('暂无存档点', '提示');
      return;
    }

    // 提取每个消息的 <sum> 标签内容
    const saveItems = messages
      .map(msg => {
        const messageContent = msg.message || '';
        const sumMatch = messageContent.match(/<sum>([\s\S]*?)<\/sum>/i);
        const sum = sumMatch ? sumMatch[1].trim() : '';
        return {
          message_id: msg.message_id,
          sum: sum || '(无摘要)',
        };
      })
      .filter(item => item.sum !== '(无摘要)');

    if (saveItems.length === 0) {
      toastr.warning('暂无存档点', '提示');
      return;
    }

    // 创建对话框
    const dialog = document.createElement('div');
    dialog.className = 'mhjg-load-save-dialog-overlay';
    dialog.innerHTML = `
      <div class="mhjg-load-save-dialog">
        <div class="dialog-header">
          <h2 class="dialog-title">读档</h2>
          <button class="dialog-close-btn" id="load-save-close" aria-label="关闭">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="dialog-content">
          <div class="save-list">
            ${saveItems
              .map(
                item => `
              <button 
                class="save-item"
                data-message-id="${item.message_id}"
              >
                <div class="save-summary">${escapeHtml(item.sum)}</div>
                <div class="save-meta">消息 ID: ${item.message_id}</div>
              </button>
            `,
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    // 绑定关闭事件
    const closeBtn = dialog.querySelector('#load-save-close');
    const closeDialog = () => dialog.remove();
    closeBtn?.addEventListener('click', e => {
      e.stopPropagation();
      closeDialog();
    });
    dialog.addEventListener('click', e => {
      if (e.target === dialog) {
        closeDialog();
      }
    });

    // 绑定存档项点击事件
    dialog.querySelectorAll('[data-message-id]').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const messageId = (e.currentTarget as HTMLElement).getAttribute('data-message-id');
        if (!messageId) return;

        const confirmed = confirm('确认要读档吗？这会回到当时的故事节点，并删除之后的所有故事信息');
        if (!confirmed) return;

        try {
          if (typeof triggerSlash === 'undefined') {
            toastr.error('读档功能不可用', '错误');
            return;
          }
          await triggerSlash(`/branch-create ${messageId}`);
          console.log('✅ 读档成功，消息 ID:', messageId);
          toastr.success('读档成功', '成功');
          closeDialog();
          // 刷新显示
          window.location.reload();
        } catch (error) {
          console.error('❌ 读档失败:', error);
          toastr.error('读档失败: ' + (error instanceof Error ? error.message : String(error)), '错误');
        }
      });
    });
  } catch (error) {
    console.error('❌ 显示读档失败:', error);
    toastr.error('显示读档失败', '错误');
  }
}

/**
 * 显示阅读模式对话框
 */
export function showReviewStory(): void {
  try {
    if (typeof getLastMessageId === 'undefined' || typeof getChatMessages === 'undefined') {
      toastr.error('阅读模式不可用', '错误');
      return;
    }

    const lastMessageId = getLastMessageId();
    const messages = getChatMessages(`0-${lastMessageId}`, { role: 'assistant' });

    if (messages.length === 0) {
      toastr.warning('暂无故事内容', '提示');
      return;
    }

    // 提取每个消息的 maintext
    const storyItems = messages
      .map(msg => {
        const messageContent = msg.message || '';
        const maintextMatch = messageContent.match(/<maintext>([\s\S]*?)<\/maintext>/i);
        const maintext = maintextMatch ? maintextMatch[1].trim() : '';
        return {
          message_id: msg.message_id,
          maintext: maintext || '(无内容)',
        };
      })
      .filter(item => item.maintext !== '(无内容)');

    if (storyItems.length === 0) {
      toastr.warning('暂无故事内容', '提示');
      return;
    }

    // 创建对话框
    const dialog = document.createElement('div');
    dialog.className = 'mhjg-review-story-dialog-overlay';
    dialog.innerHTML = `
      <div class="mhjg-review-story-dialog">
        <div class="dialog-header">
          <h2 class="dialog-title">回顾故事</h2>
          <button class="dialog-close-btn" id="review-story-close" aria-label="关闭">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="dialog-content">
          <div class="story-list">
            ${storyItems
              .map(
                (item, index) => `
              <div class="story-item">
                <div class="story-meta">
                  <span>第 ${index + 1} 层</span>
                  <span>消息 ID: ${item.message_id}</span>
                </div>
                <div class="story-content">${escapeHtml(item.maintext)}</div>
              </div>
            `,
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    // 绑定关闭事件
    const closeBtn = dialog.querySelector('#review-story-close');
    const closeDialog = () => dialog.remove();
    closeBtn?.addEventListener('click', e => {
      e.stopPropagation();
      closeDialog();
    });
    dialog.addEventListener('click', e => {
      if (e.target === dialog) {
        closeDialog();
      }
    });
  } catch (error) {
    console.error('❌ 显示回顾故事失败:', error);
    toastr.error('显示回顾故事失败', '错误');
  }
}

/**
 * HTML 转义函数
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  // 将换行符转换为 <br>，保持文本格式
  return div.innerHTML.replace(/\n/g, '<br>');
}

