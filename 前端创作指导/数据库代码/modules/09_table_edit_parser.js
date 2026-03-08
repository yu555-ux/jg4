// NOTE: Extracted from 数据库代码.user.js for initial decoupling.
// This module is not wired by default; it documents a functional slice.

function normalizeAiResponseForTableEditParsing_ACU(text) {
    if (typeof text !== 'string') return '';
    let cleaned = text.trim();
    // 移除JS风格的字符串拼接：'...' + '...'
    cleaned = cleaned.replace(/'\s*\+\s*'/g, '');
    // 移除可能包裹整个响应的单引号
    if (cleaned.startsWith("'") && cleaned.endsWith("'")) cleaned = cleaned.slice(1, -1);
    // 将 "\\n" 转换为真实换行
    cleaned = cleaned.replace(/\\n/g, '\n');
    // 修复由JS字符串转义符（\\）导致的解析失败
    cleaned = cleaned.replace(/\\\\"/g, '\\"');
    // 修复全角冒号导致的 JSON 解析失败
    cleaned = cleaned.replace(/：/g, ':');
    return cleaned;
  }

  function extractTableEditInner_ACU(text, options = {}) {
    const { allowNoTableEditTags = true } = options;
    const cleaned = normalizeAiResponseForTableEditParsing_ACU(text);
    if (!cleaned) return null;

    // 1) 标准格式：<tableEdit>...</tableEdit>
    const fullMatch = cleaned.match(/<tableEdit>([\s\S]*?)<\/tableEdit>/i);
    if (fullMatch && typeof fullMatch[1] === 'string') {
      return { inner: fullMatch[1], cleaned, mode: 'full' };
    }

    // 2) 宽松格式：缺失开/闭标签，但 <!-- --> 包裹完整
    const hasOpen = /<tableEdit>/i.test(cleaned);
    const hasClose = /<\/tableEdit>/i.test(cleaned);
    const hasAnyTag = hasOpen || hasClose;

    const commentRe = /<!--([\s\S]*?)-->/g;
    const commentBlocks = [];
    let m;
    while ((m = commentRe.exec(cleaned)) !== null) {
      commentBlocks.push({
        start: m.index,
        end: commentRe.lastIndex,
        raw: m[0],
        content: m[1] || ''
      });
    }

    const hasCommands = (s) => /(insertRow|updateRow|deleteRow)\s*\(/.test(s);
    const candidates = commentBlocks.filter(b => hasCommands(b.content));
    if (!candidates.length) return null;

    let chosen = null;
    if (hasOpen && !hasClose) {
      const openIdx = cleaned.search(/<tableEdit>/i);
      chosen = candidates.find(b => b.start > openIdx) || candidates[0];
    } else if (!hasOpen && hasClose) {
      const closeIdx = cleaned.search(/<\/tableEdit>/i);
      for (let i = candidates.length - 1; i >= 0; i--) {
        if (candidates[i].end < closeIdx) { chosen = candidates[i]; break; }
      }
      chosen = chosen || candidates[candidates.length - 1];
    } else if (hasAnyTag) {
      const tagIdx = hasOpen ? cleaned.search(/<tableEdit>/i) : cleaned.search(/<\/tableEdit>/i);
      let bestDist = Infinity;
      candidates.forEach(b => {
        const dist = Math.min(Math.abs(b.start - tagIdx), Math.abs(b.end - tagIdx));
        if (dist < bestDist) { bestDist = dist; chosen = b; }
      });
    } else if (allowNoTableEditTags) {
      chosen = candidates[0];
    }

    if (!chosen) return null;
    return { inner: chosen.raw, cleaned, mode: 'comment_fallback', hasOpen, hasClose };
  }

  function parseAndApplyTableEdits_ACU(aiResponse, updateMode = 'standard') {
    // updateMode: 'standard' 表示更新标准表，'summary' 表示更新总结表和总体大纲
    if (!currentJsonTableData_ACU) {
        logError_ACU('Cannot apply edits, currentJsonTableData_ACU is not loaded.');
        return false;
    }

    const extracted = extractTableEditInner_ACU(aiResponse, { allowNoTableEditTags: true });
    if (!extracted || !extracted.inner) {
        logWarn_ACU('No recognizable table edit block found (missing <tableEdit> boundary and/or incomplete <!-- --> wrapper).');
        return true; // Not a failure, just no edits to apply.
    }

    const editsString = extracted.inner.replace(/<!--|-->/g, '').trim();
    if (!editsString) {
        logDebug_ACU('Empty <tableEdit> block. No edits to apply.');
        return true;
    }

    // [核心修复] 增加指令重组步骤，处理AI生成的多行指令
    const originalLines = editsString.split('\n');
    const commandLines = [];
    let commandReconstructor = '';
    let isInJsonBlock = false; // [新增] 追踪是否在JSON对象块中

    originalLines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine === '') return;

        // [稳健性强化] 移除行尾的注释
        // 注意：如果是在JSON字符串内部的 // 应该保留，但在指令级应该移除
        // 这里简单处理：如果不在JSON块中，且包含 //，则移除 // 之后的内容
        let lineContent = trimmedLine;
        if (!isInJsonBlock && lineContent.includes('//') && !lineContent.includes('"//') && !lineContent.includes("'//")) {
             lineContent = lineContent.split('//')[0].trim();
        }
        if (lineContent === '') return;

        // 检查大括号平衡，判断是否进入或离开JSON块
        // 简单计数：{ +1, } -1
        // 注意：这只是简单的启发式方法，处理跨行JSON
        const openBraces = (lineContent.match(/{/g) || []).length;
        const closeBraces = (lineContent.match(/}/g) || []).length;

        // 如果当前行以指令开头，并且不在JSON块中
        if ((lineContent.startsWith('insertRow') || lineContent.startsWith('deleteRow') || lineContent.startsWith('updateRow')) && !isInJsonBlock) {
            if (commandReconstructor) {
                commandLines.push(commandReconstructor);
            }
            commandReconstructor = lineContent;
        } else {
            // 如果不是指令开头，或者是上一条指令的JSON参数延续，拼接到缓存
             // 在拼接时添加空格，防止粘连
            commandReconstructor += ' ' + lineContent;
        }

        // 更新JSON块状态
        // 只有当指令包含 '{' 但不包含 '}' 时，或者虽然包含 '}' 但数量少于 '{' 时，才认为是多行JSON的开始
        // 但考虑到一行内可能有完整的 {}, 我们需要维护一个累积计数
        // 这里的 isInJsonBlock 逻辑需要更精细：
        // 我们可以统计 reconstructor 中的 { 和 } 数量
        if (commandReconstructor) {
            const totalOpen = (commandReconstructor.match(/{/g) || []).length;
            const totalClose = (commandReconstructor.match(/}/g) || []).length;
            // 如果有左括号，且左括号多于右括号，说明JSON未闭合
            if (totalOpen > totalClose) {
                isInJsonBlock = true;
            } else {
                isInJsonBlock = false;
            }
        }
    });

    // 将最后一条缓存的指令推入
    if (commandReconstructor) {
        commandLines.push(commandReconstructor);
    }

    // [新增] 二次处理：处理挤在一行里的多条指令
    // 有时AI会输出：[0:全局数据表]- Update: ... [1:主要地点表]- Delete: ... 这种非标准格式
    // 或者标准的：insertRow(...); insertRow(...);
    const finalCommandLines = [];
    commandLines.forEach(rawLine => {
        // 1. 尝试分割用分号分隔的多个标准指令
        // 使用正则匹配 ; 后紧跟 insertRow/deleteRow/updateRow 的情况
        // 为了避免分割JSON内部的分号，我们先替换指令间的分号为特殊标记
        let processedLine = rawLine.replace(/;\s*(?=(insertRow|deleteRow|updateRow))/g, '___COMMAND_SPLIT___');

        // 2. [针对特定错误的修复] 处理非标准格式的指令堆叠
        // 错误示例: "[0:全局数据表]- Update: ... [1:主要地点表]- Delete: ..."
        // 这种格式非常难以直接解析，因为它是描述性语言而非函数调用。
        // 我们检测到这种格式时，尝试将其转换为标准指令或跳过并警告
        if (processedLine.match(/\[\d+:.*?\]-\s*(Update|Insert|Delete):/)) {
            logWarn_ACU(`Detected unstructured AI response format: "${rawLine}". Skipping this line as it is not a valid function call.`);
            return;
        }

        const splitLines = processedLine.split('___COMMAND_SPLIT___');
        splitLines.forEach(l => {
             if (l.trim()) finalCommandLines.push(l.trim());
        });
    });

    let appliedEdits = 0;
    const editCountsByTable = {}; // Map<tableName, count>

    const sheetKeysForIndexing = getSortedSheetKeys_ACU(currentJsonTableData_ACU);
    const sheets = sheetKeysForIndexing.map(k => currentJsonTableData_ACU[k]).filter(Boolean);

    // [新增] 统一解析指令（供预检查与正式应用复用）
    const parseTableEditCommandLine_ACU = (rawLine) => {
        try {
            let commandLineWithoutComment = rawLine;
            if (commandLineWithoutComment.match(/\)\s*;?\s*\/\/.*$/)) {
                commandLineWithoutComment = commandLineWithoutComment.replace(/\/\/.*$/, '').trim();
            }
            if (!commandLineWithoutComment) return null;
            const match = commandLineWithoutComment.match(/^(insertRow|deleteRow|updateRow)\s*\((.*)\);?$/);
            if (!match) return null;
            const command = match[1];
            const argsString = match[2];
            let args;
            const firstBracket = argsString.indexOf('{');
            if (firstBracket === -1) {
                args = JSON.parse(`[${argsString}]`);
            } else {
                const paramsPart = argsString.substring(0, firstBracket).trim();
                let jsonPart = argsString.substring(firstBracket);
                const initialArgs = JSON.parse(`[${paramsPart.replace(/,$/, '')}]`);
                try {
                    const jsonData = JSON.parse(jsonPart);
                    args = [...initialArgs, jsonData];
                } catch (jsonError) {
                    logError_ACU(`Primary JSON parse failed for: "${jsonPart}". Attempting sanitization...`, jsonError);
                    let sanitizedJson = jsonPart;
                    sanitizedJson = sanitizedJson.replace(/,\s*([}\]])/g, '$1');
                    sanitizedJson = sanitizedJson.replace(/,\s*("[^"]*"\s*)}/g, '}');
                    sanitizedJson = sanitizedJson.replace(/(:\s*)"((?:\\.|[^"\\])*)"/g, (match, prefix, content) => {
                        return `${prefix}"${content.replace(/(?<!\\)"/g, '\\"')}"`;
                    });
                    sanitizedJson = sanitizedJson.replace(/([,{]\s*)"(\d+):"\s*"/g, '$1"$2":"');
                    const jsonData = JSON.parse(sanitizedJson);
                    args = [...initialArgs, jsonData];
                }
            }
            return { command, args, line: commandLineWithoutComment };
        } catch (e) {
            logError_ACU(`Failed to parse command line: "${rawLine}"`, e);
            return null;
        }
    };

    // [新增] 总结表/总体大纲必须“同时新增一行”才允许写入
    let summaryInsertCount = 0;
    let outlineInsertCount = 0;
    const standardizedFillEnabled = settings_ACU?.standardizedTableFillEnabled !== false;
    if (standardizedFillEnabled) {
        finalCommandLines.forEach(line => {
            try {
                const parsed = parseTableEditCommandLine_ACU(line);
                if (!parsed || parsed.command !== 'insertRow') return;
                const tableIndex = parsed.args?.[0];
                const table = sheets[tableIndex];
                if (!table || !table.name) return;
                if (!isSummaryOrOutlineTable_ACU(table.name)) return;
                if (table.name === '总结表') summaryInsertCount++;
                if (table.name === '总体大纲') outlineInsertCount++;
            } catch (e) {
                // 解析失败的不计入，避免“半条成功半条失败”导致误放行
            }
        });
    }
    const allowSummaryOutlineInsert = !standardizedFillEnabled ||
        (summaryInsertCount === 1 && outlineInsertCount === 1) ||
        (summaryInsertCount === 0 && outlineInsertCount === 0);
    if (standardizedFillEnabled && !allowSummaryOutlineInsert && (summaryInsertCount > 0 || outlineInsertCount > 0)) {
        logWarn_ACU(`[屏蔽] 总结表/总体大纲新增不同步：总结=${summaryInsertCount}, 大纲=${outlineInsertCount}，本轮两表均不写入。`);
    }

    // 如果某表 content 为空，但指导表/模板提供了 seedRows，则在真正应用编辑前先物化到 content，
    // 避免 AI 基于 $0 中的 seed rows 进行 updateRow/deleteRow 时“找不到行”。
    const materializeSeedRowsIfNeeded_ACU = (table) => {
        try {
            if (!table || typeof table !== 'object') return;
            if (!Array.isArray(table.content) || table.content.length !== 1) return;
            // [修复] seedRows 可能未挂到表对象：这里按 uid(sheetKey) 再兜底一次
            let sr = (Array.isArray(table.seedRows) && table.seedRows.length > 0) ? table.seedRows : null;
            if (!sr && table.uid && String(table.uid).startsWith('sheet_')) {
                sr = getEffectiveSeedRowsForSheet_ACU(String(table.uid), { guideData: null, allowTemplateFallback: true });
                if (Array.isArray(sr) && sr.length > 0) {
                    try { table.seedRows = JSON.parse(JSON.stringify(sr)); } catch (e) {}
                }
            }
            if (!Array.isArray(sr) || sr.length === 0) return;
            const headerRow = Array.isArray(table.content[0]) ? JSON.parse(JSON.stringify(table.content[0])) : [null];
            const seed = JSON.parse(JSON.stringify(sr));
            table.content = [headerRow, ...seed];
        } catch (e) {}
    };

    // [新增] 重置本次参与更新的表格的统计信息
    // 由于我们不知道哪些表会更新，只能在实际更新时设置。
    // 但为了清除旧状态，也许应该在保存时处理？
    // 不，这里是应用编辑。我们只记录本次编辑的数量。

    finalCommandLines.forEach(line => {
        const parsed = parseTableEditCommandLine_ACU(line);
        if (!parsed) {
            logWarn_ACU(`Skipping malformed or truncated command line: "${line}"`);
            return;
        }
        const { command, args } = parsed;

        try {
            switch (command) {
                case 'insertRow': {
                    const [tableIndex, data] = args;
                    const table = sheets[tableIndex];
                    if (!table || !table.name) {
                        logWarn_ACU(`Table at index ${tableIndex} not found or has no name. Skipping insertRow.`);
                        break;
                    }
                    materializeSeedRowsIfNeeded_ACU(table);
                    const sheetKey = sheetKeysForIndexing[tableIndex];
                    // [新增] 根据更新模式和表格名称屏蔽不相关的表格操作
                    // [修复] 统一更新模式（'full'）允许所有操作，不阻止任何表
                    const isSummaryTable = isSummaryOrOutlineTable_ACU(table.name);
                    // [逻辑优化] 使用更明确的模式匹配
                    const isUnifiedMode = (updateMode === 'full' || updateMode === 'manual_unified' || updateMode === 'auto_unified');
                    const isStandardMode = (updateMode === 'standard' || updateMode === 'auto_standard' || updateMode === 'manual_standard');
                    const isSummaryMode = (updateMode === 'summary' || updateMode === 'auto_summary' || updateMode === 'auto_summary_silent' || updateMode === 'manual_summary');
                    const isManualMode = (updateMode && updateMode.startsWith('manual'));

                    if (isUnifiedMode) {
                        // 统一更新模式：允许所有操作，不阻止任何表
                        // 继续处理
                    } else if (isStandardMode && isSummaryTable) {
                        if (isManualMode) {
                            logDebug_ACU(`[屏蔽] 标准表更新模式(手动)：忽略总结表/总体大纲的insertRow操作 (tableIndex: ${tableIndex}, tableName: ${table.name})`);
                            break;
                        }
                        // 自动模式下不再屏蔽
                    } else if (isSummaryMode && !isSummaryTable) {
                        if (isManualMode) {
                            logDebug_ACU(`[屏蔽] 总结表更新模式(手动)：忽略标准表的insertRow操作 (tableIndex: ${tableIndex}, tableName: ${table.name})`);
                            break;
                        }
                        // 自动模式下不再屏蔽
                    }
                    // [新增] 总结表/总体大纲必须“同时新增一行”
                    if (isSummaryTable && !allowSummaryOutlineInsert) {
                        logDebug_ACU(`[屏蔽] 总结表/总体大纲新增不同步：忽略 insertRow (tableIndex: ${tableIndex}, tableName: ${table.name})`);
                        break;
                    }
                    if (table && table.content && typeof data === 'object') {
                        const newRow = [null];
                        const headers = table.content[0].slice(1);
                        const specialIndexCol = (isSummaryTable && sheetKey && isSpecialIndexLockEnabled_ACU(sheetKey))
                            ? getSummaryIndexColumnIndex_ACU(table)
                            : -1;
                        headers.forEach((_, colIndex) => {
                            let nextVal = data[colIndex] || (data[String(colIndex)] || "");
                            if (colIndex === specialIndexCol) {
                                nextVal = formatSummaryIndexCode_ACU(table.content.length);
                            }
                            newRow.push(nextVal);
                        });
                        table.content.push(newRow);
                        if (isSummaryTable && specialIndexCol >= 0) {
                            applySummaryIndexSequenceToTable_ACU(table, specialIndexCol);
                        }
                        logDebug_ACU(`Applied insertRow to table ${tableIndex} (${table.name}) with data:`, data);
                        appliedEdits++;
                        editCountsByTable[table.name] = (editCountsByTable[table.name] || 0) + 1;
                    }
                    break;
                }
                case 'deleteRow': {
                    const [tableIndex, rowIndex] = args;
                    const table = sheets[tableIndex];
                    if (!table || !table.name) {
                        logWarn_ACU(`Table at index ${tableIndex} not found or has no name. Skipping deleteRow.`);
                        break;
                    }
                    materializeSeedRowsIfNeeded_ACU(table);
                    // [新增] 根据更新模式和表格名称屏蔽不相关的表格操作
                    // [修复] 统一更新模式（'full'）允许所有操作，不阻止任何表
                    const isSummaryTable = isSummaryOrOutlineTable_ACU(table.name);

                    // [优化] 总结表只允许 insertRow 操作，屏蔽 deleteRow 和 updateRow
                    // 注意：这里是对总结表本身的限制，不论何种模式都生效（总结表不应该被删除行，只能新增）
                    if (isSummaryTable) {
                        logDebug_ACU(`[屏蔽] 总结表/总体大纲忽略 deleteRow 操作 (tableIndex: ${tableIndex}, tableName: ${table.name})`);
                        break;
                    }

                    // [逻辑优化] 使用更明确的模式匹配
                    const isUnifiedMode = (updateMode === 'full' || updateMode === 'manual_unified' || updateMode === 'auto_unified');
                    const isStandardMode = (updateMode === 'standard' || updateMode === 'auto_standard' || updateMode === 'manual_standard');
                    const isSummaryMode = (updateMode === 'summary' || updateMode === 'auto_summary' || updateMode === 'auto_summary_silent' || updateMode === 'manual_summary');
                    const isManualMode = (updateMode && updateMode.startsWith('manual'));

                    if (isUnifiedMode) {
                        // 统一更新模式：允许所有操作，不阻止任何表
                        // 继续处理
                    } else if (isStandardMode && isSummaryTable) {
                        if (isManualMode) {
                            logDebug_ACU(`[屏蔽] 标准表更新模式(手动)：忽略总结表/总体大纲的deleteRow操作 (tableIndex: ${tableIndex}, tableName: ${table.name})`);
                            break;
                        }
                        // 自动模式下不再屏蔽
                    } else if (isSummaryMode && !isSummaryTable) {
                        if (isManualMode) {
                            logDebug_ACU(`[屏蔽] 总结表更新模式(手动)：忽略标准表的deleteRow操作 (tableIndex: ${tableIndex}, tableName: ${table.name})`);
                            break;
                        }
                        // 自动模式下不再屏蔽
                    }
                    if (table && table.content && table.content.length > rowIndex + 1) {
                        table.content.splice(rowIndex + 1, 1);
                        logDebug_ACU(`Applied deleteRow to table ${tableIndex} (${table.name}) at index ${rowIndex}`);
                        appliedEdits++;
                        editCountsByTable[table.name] = (editCountsByTable[table.name] || 0) + 1;
                    }
                    break;
                }
                case 'updateRow': {
                    const [tableIndex, rowIndex, data] = args;
                    const table = sheets[tableIndex];
                    if (!table || !table.name) {
                        logWarn_ACU(`Table at index ${tableIndex} not found or has no name. Skipping updateRow.`);
                        break;
                    }
                    materializeSeedRowsIfNeeded_ACU(table);
                    const sheetKey = sheetKeysForIndexing[tableIndex];
                    // [新增] 根据更新模式和表格名称屏蔽不相关的表格操作
                    // [修复] 统一更新模式（'full'）允许所有操作，不阻止任何表
                    const isSummaryTable = isSummaryOrOutlineTable_ACU(table.name);

                    // [优化] 总结表只允许 insertRow 操作，屏蔽 deleteRow 和 updateRow
                    if (isSummaryTable) {
                        logDebug_ACU(`[屏蔽] 总结表/总体大纲忽略 updateRow 操作 (tableIndex: ${tableIndex}, tableName: ${table.name})`);
                        break;
                    }

                    // [逻辑优化] 使用更明确的模式匹配
                    const isUnifiedMode = (updateMode === 'full' || updateMode === 'manual_unified' || updateMode === 'auto_unified');
                    const isStandardMode = (updateMode === 'standard' || updateMode === 'auto_standard' || updateMode === 'manual_standard');
                    const isSummaryMode = (updateMode === 'summary' || updateMode === 'auto_summary' || updateMode === 'auto_summary_silent' || updateMode === 'manual_summary');
                    const isManualMode = (updateMode && updateMode.startsWith('manual'));

                    if (isUnifiedMode) {
                        // 统一更新模式：允许所有操作，不阻止任何表
                        // 继续处理
                    } else if (isStandardMode && isSummaryTable) {
                        if (isManualMode) {
                            logDebug_ACU(`[屏蔽] 标准表更新模式(手动)：忽略总结表/总体大纲的updateRow操作 (tableIndex: ${tableIndex}, tableName: ${table.name})`);
                            break;
                        }
                        // 自动模式下不再屏蔽
                    } else if (isSummaryMode && !isSummaryTable) {
                        if (isManualMode) {
                            logDebug_ACU(`[屏蔽] 总结表更新模式(手动)：忽略标准表的updateRow操作 (tableIndex: ${tableIndex}, tableName: ${table.name})`);
                            break;
                        }
                        // 自动模式下不再屏蔽
                    }
                    if (table && table.content && table.content.length > rowIndex + 1 && typeof data === 'object') {
                        const lockState = sheetKey ? getTableLocksForSheet_ACU(sheetKey) : { rows: new Set(), cols: new Set(), cells: new Set() };
                        if (lockState.rows.has(rowIndex)) {
                            logDebug_ACU(`[锁定] 行锁定阻止 updateRow (tableIndex: ${tableIndex}, rowIndex: ${rowIndex})`);
                            break;
                        }
                        Object.keys(data).forEach(colIndexStr => {
                            const colIndex = parseInt(colIndexStr, 10);
                            if (isNaN(colIndex)) return;
                            if (lockState.cols.has(colIndex)) return;
                            if (lockState.cells.has(`${rowIndex}:${colIndex}`)) return;
                            if (table.content[rowIndex + 1].length > colIndex + 1) {
                                table.content[rowIndex + 1][colIndex + 1] = data[colIndexStr];
                            }
                        });
                        if (isSummaryTable && sheetKey && isSpecialIndexLockEnabled_ACU(sheetKey)) {
                            const specialIndexCol = getSummaryIndexColumnIndex_ACU(table);
                            if (specialIndexCol >= 0) applySummaryIndexSequenceToTable_ACU(table, specialIndexCol);
                        }
                        logDebug_ACU(`Applied updateRow to table ${tableIndex} (${table.name}) at index ${rowIndex} with data:`, data);
                        appliedEdits++;
                        editCountsByTable[table.name] = (editCountsByTable[table.name] || 0) + 1;
                    }
                    break;
                }
            }
        } catch (e) {
            logError_ACU(`Failed to parse or apply command: "${line}"`, e);
        }
    });

    // [新增] 将统计信息写入表格对象，以便保存和展示
    Object.keys(editCountsByTable).forEach(tableName => {
        const sheetKey = Object.keys(currentJsonTableData_ACU).find(k => currentJsonTableData_ACU[k].name === tableName);
        if (sheetKey) {
            if (!currentJsonTableData_ACU[sheetKey]._lastUpdateStats) {
                currentJsonTableData_ACU[sheetKey]._lastUpdateStats = {};
            }
            currentJsonTableData_ACU[sheetKey]._lastUpdateStats.changes = editCountsByTable[tableName];
        }
    });

    // [新增] 收集所有被修改的表格 key
    const modifiedSheetKeys = [];
    Object.keys(editCountsByTable).forEach(tableName => {
        if (editCountsByTable[tableName] > 0) {
            const sheetKey = Object.keys(currentJsonTableData_ACU).find(k => currentJsonTableData_ACU[k].name === tableName);
            if (sheetKey) modifiedSheetKeys.push(sheetKey);
        }
    });

    showToastr_ACU('success', `从AI响应中成功应用了 ${appliedEdits} 个数据库更新。`, { acuToastCategory: ACU_TOAST_CATEGORY_ACU.TABLE_OK });
    return { success: true, modifiedKeys: modifiedSheetKeys };
}

  async function processUpdates_ACU(indicesToUpdate, mode = 'auto', options = {}) {
      if (!indicesToUpdate || indicesToUpdate.length === 0) {
          return true;
      }

      const { targetSheetKeys, batchSize: specificBatchSize, requestOptions } = options;

      isAutoUpdatingCard_ACU = true;

      // [新增] 根据更新模式选择不同的批处理大小和阈值
      const isSummaryMode = (mode && (mode.includes('summary') || mode === 'manual_summary')) || false;
      // 优先使用传入的 specificBatchSize，否则使用全局批处理大小
      const batchSize = specificBatchSize || (settings_ACU.updateBatchSize || 2);

      const batches = [];
      for (let i = 0; i < indicesToUpdate.length; i += batchSize) {
          batches.push(indicesToUpdate.slice(i, i + batchSize));
      }

      logDebug_ACU(`[${mode}] Processing ${indicesToUpdate.length} updates in ${batches.length} batches of size ${batchSize} (${isSummaryMode ? '总结表模式' : '标准表模式'}). Target Sheets: ${targetSheetKeys ? targetSheetKeys.length : 'All'}`);

      let overallSuccess = true;
      const chatHistory = SillyTavern_API_ACU.chat || [];

          for (let i = 0; i < batches.length; i++) {
              const batchIndices = batches[i];
              const batchNumber = i + 1;
              const totalBatches = batches.length;
              const firstMessageIndexOfBatch = batchIndices[0];
              const lastMessageIndexOfBatch = batchIndices[batchIndices.length - 1];

          // [逻辑修正] 保存目标应始终是当前处理批次的最后一个消息。
          // “跳过楼层”参数仅影响触发时机和读取的上下文，不影响保存位置。
          const finalSaveTargetIndex = lastMessageIndexOfBatch;

          // 1. 加载基础数据库：从当前批次开始的位置往前找每个表格的最新记录
          // [核心修复] 多批次更新时，必须为每个表格单独查找其最新数据
          // 这确保了即使上一批次只更新了部分表格，当前批次也能获得所有表格的完整数据

          // Step 1: 优先使用聊天记录的"空白指导表"作为基础，否则回退到模板
          // [关键修复] 用户切换模板后回到聊天记录时，应使用该聊天的指导表，而不是新模板
          let mergedBatchData = null;
          try {
              const batchIsoKey = getCurrentIsolationKey_ACU();
              const sheetGuideForBatch = getChatSheetGuideDataForIsolationKey_ACU(batchIsoKey);
              if (sheetGuideForBatch && typeof sheetGuideForBatch === 'object' && Object.keys(sheetGuideForBatch).some(k => k.startsWith('sheet_'))) {
                  // 使用聊天记录的指导表作为基础（深拷贝）
                  mergedBatchData = buildGuidedBaseDataFromSheetGuide_ACU(sheetGuideForBatch);
                  logDebug_ACU(`[Batch ${batchNumber}] Using chat sheet guide as merge base.`);
              } else {
                  // [兜底] 没有指导表时使用模板（header-only）
                  mergedBatchData = parseTableTemplateJson_ACU({ stripSeedRows: true });
                  logDebug_ACU(`[Batch ${batchNumber}] No chat sheet guide found, using template as merge base.`);
              }
          } catch (e) {
              logError_ACU(`[Batch ${batchNumber}] Failed to build merge base from guide/template.`, e);
              showToastr_ACU('error', "无法构建合并基底，操作已终止。");
              overallSuccess = false;
              break;
          }
          if (!mergedBatchData) {
              showToastr_ACU('error', "无法构建合并基底，操作已终止。");
              overallSuccess = false;
              break;
          }

          // [修复] 使用指导表感知的排序获取 keys
          const batchSheetKeys = getSortedSheetKeys_ACU(mergedBatchData);

          // [数据隔离核心] 获取当前隔离标签键名
          const batchIsolationKey = getCurrentIsolationKey_ACU();

          // Step 2: 为每个表格单独查找该批次开始位置之前的最新数据
          // 使用 map 跟踪每个表格是否已找到
          const batchFoundSheets = {};
          batchSheetKeys.forEach(k => batchFoundSheets[k] = false);

          // 遍历当前批次开始位置之前的所有消息
          for (let j = firstMessageIndexOfBatch - 1; j >= 0; j--) {
              const msg = chatHistory[j];
              if (msg.is_user) continue;

              // [优先级1] 检查新版按标签分组存储 TavernDB_ACU_IsolatedData
              if (msg.TavernDB_ACU_IsolatedData && msg.TavernDB_ACU_IsolatedData[batchIsolationKey]) {
                  const tagData = msg.TavernDB_ACU_IsolatedData[batchIsolationKey];
                  const independentData = tagData.independentData || {};

                  Object.keys(independentData).forEach(storedSheetKey => {
                      if (batchFoundSheets[storedSheetKey] === false && mergedBatchData[storedSheetKey]) {
                          mergedBatchData[storedSheetKey] = JSON.parse(JSON.stringify(independentData[storedSheetKey]));
                          batchFoundSheets[storedSheetKey] = true;
                      }
                  });
              }

              // [优先级2] 兼容旧版存储格式 - 严格匹配隔离标签
              // [数据隔离核心逻辑] 无标签也是标签的一种，严格隔离不同标签的数据
              const msgIdentity = msg.TavernDB_ACU_Identity;
              let isLegacyMatch = false;
              if (settings_ACU.dataIsolationEnabled) {
                  isLegacyMatch = (msgIdentity === settings_ACU.dataIsolationCode);
              } else {
                  // 关闭隔离（无标签模式）：只匹配无标识数据
                  isLegacyMatch = !msgIdentity;
              }

              if (isLegacyMatch) {
                  // 检查旧版独立数据格式
                  if (msg.TavernDB_ACU_IndependentData) {
                      const independentData = msg.TavernDB_ACU_IndependentData;
                      Object.keys(independentData).forEach(storedSheetKey => {
                          if (batchFoundSheets[storedSheetKey] === false && mergedBatchData[storedSheetKey]) {
                              mergedBatchData[storedSheetKey] = JSON.parse(JSON.stringify(independentData[storedSheetKey]));
                              batchFoundSheets[storedSheetKey] = true;
                          }
                      });
                  }

                  // 检查旧版标准表存储格式
                  if (msg.TavernDB_ACU_Data) {
                      const standardData = msg.TavernDB_ACU_Data;
                      Object.keys(standardData).forEach(k => {
                          if (k.startsWith('sheet_') && batchFoundSheets[k] === false && mergedBatchData[k]) {
                              mergedBatchData[k] = JSON.parse(JSON.stringify(standardData[k]));
                              batchFoundSheets[k] = true;
                          }
                      });
                  }

                  // 检查旧版总结表存储格式
                  if (msg.TavernDB_ACU_SummaryData) {
                      const summaryData = msg.TavernDB_ACU_SummaryData;
                      Object.keys(summaryData).forEach(k => {
                          if (k.startsWith('sheet_') && batchFoundSheets[k] === false && mergedBatchData[k]) {
                              mergedBatchData[k] = JSON.parse(JSON.stringify(summaryData[k]));
                              batchFoundSheets[k] = true;
                          }
                      });
                  }
              }

              // 如果所有表格都找到了，提前结束搜索
              if (Object.values(batchFoundSheets).every(v => v === true)) {
                  break;
              }
          }

          // 将合并后的数据赋值给全局变量
          currentJsonTableData_ACU = mergedBatchData;

          // 统计找到的表格数量
          const foundCount = Object.values(batchFoundSheets).filter(v => v === true).length;
          const totalCount = batchSheetKeys.length;
          logDebug_ACU(`[Batch ${batchNumber}] Loaded ${foundCount}/${totalCount} tables from history before index ${firstMessageIndexOfBatch}. Missing tables will use template structure (header-only).`);

          // 2. 计算上下文范围
          // [修复] 在批量处理模式下，上下文应仅包含当前批次的消息（以及其前置的用户消息），
          // 而不是基于 threshold 回溯包含之前批次的消息。
          // 数据库状态已经通过上面的加载逻辑更新到了上一批次的结尾，因此AI只需要阅读当前批次的增量内容。

          let sliceStartIndex = firstMessageIndexOfBatch;

          // 尝试包含当前批次第一条AI消息之前的用户消息（如果是用户发言的话）
          // 这有助于AI理解对话上下文
          if (sliceStartIndex > 0 && chatHistory[sliceStartIndex - 1]?.is_user) {
              sliceStartIndex--;
              logDebug_ACU(`[Batch ${batchNumber}] Adjusted slice start to ${sliceStartIndex} to include preceding user message.`);
          }

          const messagesForContext = chatHistory.slice(sliceStartIndex, lastMessageIndexOfBatch + 1);

          // [优化] 检测最新AI回复的长度，而非整个上下文
          // 获取当前批次中最后一条AI消息的内容长度
          const lastAiMessageInBatch = chatHistory[lastMessageIndexOfBatch];
          const lastAiMessageContent = lastAiMessageInBatch?.mes || lastAiMessageInBatch?.message || '';
          const lastAiMessageLength = lastAiMessageContent.length;
          const minReplyLength = settings_ACU.autoUpdateTokenThreshold || 0;

          // [新增] 静默模式判断逻辑：
          // - 自动更新模式 (auto_*) + 用户开启静默开关：不显示进度框
          // - 手动更新模式 (manual_*)：无论静默开关如何，始终显示进度框
          const isAutoUpdateMode = mode && mode.startsWith('auto');
          const isSilentMode = isAutoUpdateMode && !!settings_ACU.toastMuteEnabled;

          // [修复] 检查最新AI回复长度阈值，仅适用于自动更新模式
                 // 手动更新模式 (manual_*) 强制执行，忽略阈值
                 const isManualMode = mode && mode.startsWith('manual');
          if (!isManualMode && (mode === 'auto' || mode === 'auto_unified' || mode === 'auto_standard' || mode === 'auto_summary_silent') && lastAiMessageLength < minReplyLength) {
              logDebug_ACU(`[Auto] Batch ${batchNumber}/${totalBatches} skipped: Last AI reply length (${lastAiMessageLength}) is below threshold (${minReplyLength}).`);
              // [新增] 静默模式下不显示跳过提示
              if (!isSilentMode) {
                  showToastr_ACU('info', `最新AI回复过短 (${lastAiMessageLength} 字符)，跳过自动更新。`);
              }
              continue; // 跳过此批次，但不算失败
          }

          // 3. 执行更新并保存
          // [修复] 根据 mode 判断更新模式：
          // - 'auto_unified' 表示参数一致时的统一更新模式，使用 'full'，不屏蔽任何表
          // - 'auto_standard' 或 'auto' 表示标准表更新模式，使用 'standard'，屏蔽总结表
          // - 包含 'summary' 或 'manual_summary' 表示总结表更新模式，使用 'summary'，屏蔽标准表
          // [修复] 根据 mode 判断更新模式：
          // - 'auto_unified' 或 'manual_unified' 表示参数一致时的统一更新模式，使用 'full'，不屏蔽任何表
          // - 其他模式保留 auto/manual 前缀，以便 downstream 区分
          let updateMode = 'auto_standard'; // Default
          if (mode === 'auto_unified' || mode === 'manual_unified' || mode === 'full') {
              updateMode = mode;
          } else if (mode === 'auto_summary_silent') {
              updateMode = 'auto_summary_silent';
          } else if (mode && mode.startsWith('manual')) {
            // manual_standard, manual_summary, manual_independent
            if (mode.includes('summary')) updateMode = 'manual_summary';
            else if (mode === 'manual_independent') updateMode = 'manual_independent';
            else updateMode = 'manual_standard';
        } else {
              // auto_independent, auto, etc.
              if (mode && mode.includes('summary')) updateMode = 'auto_summary';
              else updateMode = 'auto_standard';
          }

          // [新增] 总结表静默更新时不显示toast提示
          const toastMessage = isSilentMode ? '' : `正在处理 ${isManualMode ? '手动' : '自动'} 更新 (${batchNumber}/${totalBatches})...`;
          // [修复] 传递 targetSheetKeys 到 proceedWithCardUpdate_ACU
          const success = await proceedWithCardUpdate_ACU(messagesForContext, toastMessage, finalSaveTargetIndex, false, updateMode, isSilentMode, targetSheetKeys, requestOptions);

          if (!success) {
              // [新增] 静默模式下不显示错误提示
              if (!isSilentMode) {
                  showToastr_ACU('error', `批处理在第 ${batchNumber} 批时失败或被终止。`);
              }
              overallSuccess = false;
                          break;
                      }
      }

      // 自动合并总结检测已移至更高层级调用处

      isAutoUpdatingCard_ACU = false;
      return overallSuccess;
  }

  // [新增] 自动合并总结检测函数
  async function checkAndTriggerAutoMergeSummary_ACU() {
      if (!settings_ACU.autoMergeEnabled) return;

      const summaryKey = Object.keys(currentJsonTableData_ACU).find(k => currentJsonTableData_ACU[k].name === '总结表');
      const outlineKey = Object.keys(currentJsonTableData_ACU).find(k => currentJsonTableData_ACU[k].name === '总体大纲');

      if (!summaryKey && !outlineKey) return;

      // 计算条目数时排除自动合并生成的条目（以auto_merged标记结尾的行）
      const summaryCount = summaryKey ? (currentJsonTableData_ACU[summaryKey].content || [])
          .slice(1)
          .filter(row => !row || row[row.length - 1] !== 'auto_merged')
          .length : 0;

      const outlineCount = outlineKey ? (currentJsonTableData_ACU[outlineKey].content || [])
          .slice(1)
          .filter(row => !row || row[row.length - 1] !== 'auto_merged')
          .length : 0;

      const threshold = settings_ACU.autoMergeThreshold || 20;
      const reserve = settings_ACU.autoMergeReserve || 0;

      // 检查是否达到触发条件：两个表都超过阈值+保留条数
      const triggerThreshold = threshold + reserve;
      if (summaryCount >= triggerThreshold && outlineCount >= triggerThreshold) {
          // 计算实际需要合并的条数（保留条数）
          const mergeCount = Math.min(summaryCount - reserve, outlineCount - reserve);

          if (mergeCount > 0) {
              logDebug_ACU(`触发自动合并总结: 总结表${summaryCount}条, 大纲表${outlineCount}条, 保留${reserve}条, 合并${mergeCount}条`);

              // 显示等待提示（合并类白名单）
              const waitMessage = `检测到数据条数已达到自动合并阈值，正在进行合并总结...\n\n请务必等待合并总结完成后再进入下个AI楼层！\n\n(合并前: 总结${summaryCount}条 → 保留后${reserve}条 + 合并前${mergeCount}条精简为1条)`;
              const waitToast = showToastr_ACU('info', waitMessage, {
                timeOut: 0,
                extendedTimeOut: 0,
                tapToDismiss: false,
                acuToastCategory: ACU_TOAST_CATEGORY_ACU.MERGE_TABLE,
              });

              try {
                  // 准备自动合并参数
                  const autoMergeOptions = {
                      startIndex: 0, // 从开头开始合并（前mergeCount条）
                      endIndex: mergeCount, // 合并前mergeCount条
                      targetCount: 1, // 默认合并为1条
                      batchSize: settings_ACU.mergeBatchSize || 5,
                      promptTemplate: settings_ACU.mergeSummaryPrompt || DEFAULT_MERGE_SUMMARY_PROMPT_ACU,
                      isAutoMode: true // 标记为自动模式
                  };

                  await performAutoMergeSummary_ACU(autoMergeOptions);

                  // 清除等待提示框
                  if (waitToast && toastr_API_ACU) {
                      toastr_API_ACU.clear(waitToast);
                  }

                  showToastr_ACU('success', '自动合并总结完成！', { acuToastCategory: ACU_TOAST_CATEGORY_ACU.MERGE_TABLE });
              } catch (e) {
                  logError_ACU('自动合并总结失败:', e);

                  // 清除等待提示框
                  if (waitToast && toastr_API_ACU) {
                      toastr_API_ACU.clear(waitToast);
                  }

                  showToastr_ACU('error', '自动合并总结失败: ' + e.message, { acuToastCategory: ACU_TOAST_CATEGORY_ACU.ERROR });
              }
          }
      }
  }

  // [新增] 执行自动合并总结函数
  async function performAutoMergeSummary_ACU(options) {
      const { startIndex, endIndex, targetCount, batchSize, promptTemplate, isAutoMode } = options;

      const summaryKey = Object.keys(currentJsonTableData_ACU).find(k => currentJsonTableData_ACU[k].name === '总结表');
      const outlineKey = Object.keys(currentJsonTableData_ACU).find(k => currentJsonTableData_ACU[k].name === '总体大纲');

      if (!summaryKey && !outlineKey) throw new Error('未找到总结表或总体大纲');

      // 获取指定范围的数据（排除自动合并生成的条目）
      let allSummaryRows = summaryKey ? (currentJsonTableData_ACU[summaryKey].content || [])
          .slice(1)
          .filter(row => !row || row[row.length - 1] !== 'auto_merged') : [];
      let allOutlineRows = outlineKey ? (currentJsonTableData_ACU[outlineKey].content || [])
          .slice(1)
          .filter(row => !row || row[row.length - 1] !== 'auto_merged') : [];

      // 提取指定范围的数据
      allSummaryRows = allSummaryRows.slice(startIndex, endIndex);
      allOutlineRows = allOutlineRows.slice(startIndex, endIndex);

      if (allSummaryRows.length === 0 && allOutlineRows.length === 0) return;

      const maxRows = Math.max(allSummaryRows.length, allOutlineRows.length);
      const totalBatches = Math.ceil(maxRows / batchSize);

      let accumulatedSummary = [];
      let accumulatedOutline = [];
      let progressToast = null;

      try {
          // 处理批次
          for (let i = 0; i < totalBatches; i++) {
              const startIdx = i * batchSize;
              const endIdx = startIdx + batchSize;
              const batchSummaryRows = allSummaryRows.slice(startIdx, endIdx);
              const batchOutlineRows = allOutlineRows.slice(startIdx, endIdx);

              // 更新进度提示
              if (progressToast) {
                  progressToast.remove();
              }
              const progressMessage = `自动合并总结进行中... (批次 ${i + 1}/${totalBatches})`;
              if (isAutoMode) {
                  progressToast = showToastr_ACU('info', progressMessage, {
                    timeOut: 0,
                    extendedTimeOut: 0,
                    tapToDismiss: false,
                    acuToastCategory: ACU_TOAST_CATEGORY_ACU.MERGE_TABLE,
                  });
              }

          const formatRows = (rows, globalStartIndex) => rows.map((r, idx) => `[${globalStartIndex + idx}] ${r.slice(1).join(', ')}`).join('\n');
          const textA = batchSummaryRows.length > 0 ? formatRows(batchSummaryRows, (startIndex + 1) + startIdx) : "(本批次无新增总结数据)";
          const textB = batchOutlineRows.length > 0 ? formatRows(batchOutlineRows, (startIndex + 1) + startIdx) : "(本批次无新增大纲数据)";

          let textBase = "";
          const summaryTableObj = currentJsonTableData_ACU[summaryKey];
          const outlineTableObj = currentJsonTableData_ACU[outlineKey];

          const formatTableStructure = (tableName, currentRows, originalTableObj, tableIndex) => {
              let str = `[${tableIndex}:${tableName}]\n`;
              const headers = originalTableObj.content[0] ? originalTableObj.content[0].slice(1).map((h, i) => `[${i}:${h}]`).join(', ') : 'No Headers';
              str += `  Columns: ${headers}\n`;
              if (originalTableObj.sourceData) {
                  str += `  - Note: ${originalTableObj.sourceData.note || 'N/A'}\n`;
              }
              if (currentRows && currentRows.length > 0) {
                  currentRows.forEach((row, rIdx) => { str += `  [${rIdx}] ${row.join(', ')}\n`; });
              } else {
                  str += `  (Table Empty - No rows yet)\n`;
              }
              return str + "\n";
          };

          // [修复] 自动合并总结：$BASE_DATA 的“固定基底”要取“最新的 auto_merged”。
          // 重要：auto_merged 行的 ID 列（row[0]）在部分路径下会是 null，导致基于 row[0]/autoMergedOrder 的排序失效，
          // 从而可能误选到最早的 AM0001。这里改为优先按“编码索引 AMxxxx”的数值大小排序，取最大者作为最新。
          // 若无法解析 AM 编码，则回退到存储顺序的末尾 N 条。
          const getExistingAutoMergedRows = (tableKey, tableObj, count = 1) => {
              if (!tableObj || !tableObj.content) return [];

              const allRows = tableObj.content.slice(1); // 排除表头
              const autoMergedRows = allRows.filter(row => row && row[row.length - 1] === 'auto_merged');
               if (!autoMergedRows.length) return [];

               const n = Number.isFinite(count) ? Math.max(0, count) : 0;
               if (n <= 0) return [];

               // 1) 优先按 AM 编码排序（更符合“最新合并总结”的语义）
               const parseAmNumber = (row) => {
                   if (!Array.isArray(row)) return null;
                   // 常见：最后一列是 'auto_merged'，其前一列是 'AM0001' / 'AM0012' 等
                   const candidates = row.slice(1).filter(v => typeof v === 'string');
                   for (let i = candidates.length - 1; i >= 0; i--) {
                       const m = candidates[i].trim().match(/^AM(\d+)\b/i);
                       if (m) return parseInt(m[1], 10);
                   }
                   // 兜底：整行拼接再找
                   const joined = row.slice(1).join(' ');
                   const m2 = joined.match(/AM(\d+)/i);
                   return m2 ? parseInt(m2[1], 10) : null;
               };

               const withAm = autoMergedRows
                   .map(r => ({ row: r, am: parseAmNumber(r) }))
                   .filter(x => Number.isFinite(x.am));

               if (withAm.length) {
                   withAm.sort((a, b) => a.am - b.am); // 旧→新
                   return withAm.slice(-n).map(x => x.row);
               }

               // 2) 回退：如果解析不到 AM 编码，再尝试 autoMergedOrder（可能也会因为 row[0]=null 而失效）
               const autoMergedOrder = settings_ACU.autoMergedOrder && settings_ACU.autoMergedOrder[tableKey] ? settings_ACU.autoMergedOrder[tableKey] : [];

              // 按照固定顺序排列 auto_merged 条目
              const sortedAutoMergedRows = [];
              autoMergedOrder.forEach(rowIndex => {
                  const row = autoMergedRows.find(r => r && r[0] === rowIndex);
                  if (row) sortedAutoMergedRows.push(row);
              });

              // 添加新生成的 auto_merged 条目（如果有的话）
              autoMergedRows.forEach(row => {
                  if (row && !sortedAutoMergedRows.some(r => r && r[0] === row[0])) {
                      sortedAutoMergedRows.push(row);
                  }
              });

               const fallbackBase = sortedAutoMergedRows.length ? sortedAutoMergedRows : autoMergedRows;
               return fallbackBase.slice(-n); // 末尾(最新)N条（按当前存储顺序）
          };

          // [关键] 自动合并时，$BASE_DATA = 数据库中已有的 auto_merged 条目 + 本次任务之前批次生成的条目
          const existingSummaryAutoMerged = summaryTableObj ? getExistingAutoMergedRows(summaryKey, summaryTableObj, 1) : [];
          const existingOutlineAutoMerged = outlineTableObj ? getExistingAutoMergedRows(outlineKey, outlineTableObj, 1) : [];

          // 合并已有的 auto_merged 条目和本次任务之前批次生成的条目
          const summaryBaseData = [...existingSummaryAutoMerged, ...accumulatedSummary];
          const outlineBaseData = [...existingOutlineAutoMerged, ...accumulatedOutline];

          if(summaryTableObj) textBase += formatTableStructure(summaryTableObj.name, summaryBaseData, summaryTableObj, 0);
          if(outlineTableObj) textBase += formatTableStructure(outlineTableObj.name, outlineBaseData, outlineTableObj, 1);

          let currentPrompt = promptTemplate.replace('$TARGET_COUNT', targetCount).replace('$A', textA).replace('$B', textB).replace('$BASE_DATA', textBase);

          // 调用AI API（复用现有的逻辑）
          let aiResponseText = "";
          const maxRetries = 3;

          for (let attempt = 1; attempt <= maxRetries; attempt++) {
              try {
                  const messagesToUse = JSON.parse(JSON.stringify(settings_ACU.charCardPrompt || [DEFAULT_CHAR_CARD_PROMPT_ACU]));
                  const mainPromptSegment =
                      messagesToUse.find(m => (String(m?.mainSlot || '').toUpperCase() === 'A') || m?.isMain) ||
                      messagesToUse.find(m => m && m.content && m.content.includes("你接下来需要扮演一个填表用的美杜莎"));
                  if (mainPromptSegment) {
                      mainPromptSegment.content = currentPrompt;
                  } else {
                      messagesToUse.push({ role: 'USER', content: currentPrompt });
                  }
                  const finalMessages = messagesToUse.map(m => ({ role: m.role.toLowerCase(), content: m.content }));

                  if (settings_ACU.apiMode === 'tavern') {
                      const result = await SillyTavern_API_ACU.ConnectionManagerRequestService.sendRequest(settings_ACU.tavernProfile, finalMessages, settings_ACU.apiConfig.max_tokens || 4096);
                      if (result && result.ok) aiResponseText = result.result.choices[0].message.content;
                      else throw new Error('API请求返回不成功状态');
                  } else {
                      if (settings_ACU.apiConfig.useMainApi) {
                          aiResponseText = await TavernHelper_API_ACU.generateRaw({ ordered_prompts: finalMessages, should_stream: false });
                      } else {
                          const res = await fetch(`/api/backends/chat-completions/generate`, {
                              method: 'POST',
                              headers: { ...SillyTavern.getRequestHeaders(), 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                  "messages": finalMessages, "model": settings_ACU.apiConfig.model, "temperature": settings_ACU.apiConfig.temperature,
                                  "max_tokens": settings_ACU.apiConfig.max_tokens || 4096, "stream": false, "chat_completion_source": "custom",
                                  "reverse_proxy": settings_ACU.apiConfig.url, "custom_url": settings_ACU.apiConfig.url,
                                  "custom_include_headers": settings_ACU.apiConfig.apiKey ? `Authorization: Bearer ${settings_ACU.apiConfig.apiKey}` : ""
                              })
                          });
                          if (!res.ok) throw new Error(`API请求失败: ${res.status} ${await res.text()}`);
                          const data = await res.json();
                          if (data?.choices?.[0]?.message?.content) aiResponseText = data.choices[0].message.content;
                          else throw new Error('API返回的数据格式不正确');
                      }
                  }

                  const extractResult = extractTableEditInner_ACU(aiResponseText, { allowNoTableEditTags: true });
                  if (!extractResult || !extractResult.inner) {
                      throw new Error('AI未返回有效的 <tableEdit> 块（缺少 <tableEdit> 边界或 <!-- --> 注释块不完整）。');
                  }

                  const editsString = extractResult.inner;
                  const newSummaryRows = [];
                  const newOutlineRows = [];

                  editsString.split('\n').forEach(line => {
                      const match = line.trim().match(/insertRow\s*\(\s*(\d+)\s*,\s*(\{.*?\}|\[.*?\])\s*\)/);
                      if (match) {
                          try {
                              const tableIdx = parseInt(match[1], 10);
                              let rowData = JSON.parse(match[2].replace(/'/g, '"'));
                              if (typeof rowData === 'object' && !Array.isArray(rowData)) {
                                  const sortedKeys = Object.keys(rowData).sort((a,b) => parseInt(a) - parseInt(b));
                                  const dataColumns = sortedKeys.map(k => rowData[k]);
                                  rowData = [null, ...dataColumns];
                              }

                              // [新增] 为自动合并总结生成的条目添加标记，防止重复参与合并
                              if (isAutoMode) {
                                  rowData.push('auto_merged');
                              }

                              if (tableIdx === 0 && summaryKey) newSummaryRows.push(rowData);
                              else if (tableIdx === 1 && outlineKey) newOutlineRows.push(rowData);
                          } catch (e) { logWarn_ACU('解析行失败:', line, e); }
                      }
                  });

                  if (newSummaryRows.length === 0 && newOutlineRows.length === 0) {
                      throw new Error('AI返回了内容，但未能解析出任何有效的数据行。');
                  }

                  accumulatedSummary = accumulatedSummary.concat(newSummaryRows);
                  accumulatedOutline = accumulatedOutline.concat(newOutlineRows);
                  break;

              } catch (e) {
                  logWarn_ACU(`自动合并批次 ${i + 1} 尝试 ${attempt} 失败: ${e.message}`);
                  if (attempt < maxRetries) await new Promise(resolve => setTimeout(resolve, 2000));
              }
          }

          if (accumulatedSummary.length === 0 && accumulatedOutline.length === 0) {
              throw new Error(`批次 ${i + 1} 在 ${maxRetries} 次尝试后均失败`);
          }
      }

      // 应用合并结果：保留后面的数据，替换前面的合并结果
      // 注意：endIndex是基于过滤后的数据索引，需要转换为原始数据的索引
      if (summaryKey && accumulatedSummary.length > 0) {
          const table = currentJsonTableData_ACU[summaryKey];
          const originalContent = table.content.slice(1);

          // 找到原始数据中第endIndex个非auto_merged条目的位置
          let actualEndIndex = 0;
          let foundCount = 0;
          for (let i = 0; i < originalContent.length; i++) {
              const row = originalContent[i];
              if (!row || row[row.length - 1] !== 'auto_merged') {
                  foundCount++;
                  if (foundCount === endIndex) {
                      actualEndIndex = i + 1; // +1因为slice是到该位置之前
                      break;
                  }
              }
          }

          // 重新组织数据：保留原有auto_merged条目，然后添加新的合并结果
          const existingAutoMergedRows = originalContent.filter(row => row && row[row.length - 1] === 'auto_merged');
          const remainingRows = originalContent.slice(actualEndIndex);

          const newSummaryContent = [
              ...existingAutoMergedRows, // 原有的auto_merged条目
              ...accumulatedSummary, // 新的合并结果
              ...remainingRows.filter(row => !row || row[row.length - 1] !== 'auto_merged') // 剩余的非auto_merged条目
          ];
          table.content = [table.content[0], ...newSummaryContent];

          // [优化] 更新 auto_merged 顺序记录，为新生成的条目添加顺序记录
          if (!settings_ACU.autoMergedOrder) settings_ACU.autoMergedOrder = {};
          if (!settings_ACU.autoMergedOrder[summaryKey]) settings_ACU.autoMergedOrder[summaryKey] = [];

          const orderList = settings_ACU.autoMergedOrder[summaryKey];
          accumulatedSummary.forEach(row => {
              if (row && row[row.length - 1] === 'auto_merged' && row[0] !== null && row[0] !== undefined && !orderList.includes(row[0])) {
                  orderList.push(row[0]);
              }
          });
      }

      if (outlineKey && accumulatedOutline.length > 0) {
          const table = currentJsonTableData_ACU[outlineKey];
          const originalContent = table.content.slice(1);

          // 找到原始数据中第endIndex个非auto_merged条目的位置
          let actualEndIndex = 0;
          let foundCount = 0;
          for (let i = 0; i < originalContent.length; i++) {
              const row = originalContent[i];
              if (!row || row[row.length - 1] !== 'auto_merged') {
                  foundCount++;
                  if (foundCount === endIndex) {
                      actualEndIndex = i + 1; // +1因为slice是到该位置之前
                      break;
                  }
              }
          }

          // 重新组织数据：保留原有auto_merged条目，然后添加新的合并结果
          const existingAutoMergedRows = originalContent.filter(row => row && row[row.length - 1] === 'auto_merged');
          const remainingRows = originalContent.slice(actualEndIndex);

          const newOutlineContent = [
              ...existingAutoMergedRows, // 原有的auto_merged条目
              ...accumulatedOutline, // 新的合并结果
              ...remainingRows.filter(row => !row || row[row.length - 1] !== 'auto_merged') // 剩余的非auto_merged条目
          ];
          table.content = [table.content[0], ...newOutlineContent];

          // [优化] 更新 auto_merged 顺序记录，为新生成的条目添加顺序记录
          if (!settings_ACU.autoMergedOrder) settings_ACU.autoMergedOrder = {};
          if (!settings_ACU.autoMergedOrder[outlineKey]) settings_ACU.autoMergedOrder[outlineKey] = [];

          const orderList = settings_ACU.autoMergedOrder[outlineKey];
          accumulatedOutline.forEach(row => {
              if (row && row[row.length - 1] === 'auto_merged' && row[0] !== null && row[0] !== undefined && !orderList.includes(row[0])) {
                  orderList.push(row[0]);
              }
          });
      }

      // 保存并更新
      const keysToSave = [summaryKey, outlineKey].filter(Boolean);
      await saveIndependentTableToChatHistory_ACU(SillyTavern_API_ACU.chat.length - 1, keysToSave, keysToSave);
      await updateReadableLorebookEntry_ACU(true);

      topLevelWindow_ACU.AutoCardUpdaterAPI._notifyTableUpdate();
      if (typeof updateCardUpdateStatusDisplay_ACU === 'function') updateCardUpdateStatusDisplay_ACU();

      // 清除进度提示框
      if (progressToast) {
          progressToast.remove();
      }
      } catch (e) {
          // 清除进度提示框
          if (progressToast) {
              progressToast.remove();
          }
          throw e;
      }
  }

  async function proceedWithCardUpdate_ACU(messagesToUse, batchToastMessage = '正在填表，请稍候...', saveTargetIndex = -1, isImportMode = false, updateMode = 'standard', isSilentMode = false, targetSheetKeys = null, requestOptions = null) {
    if (!$statusMessageSpan_ACU && $popupInstance_ACU)
        $statusMessageSpan_ACU = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-status-message`);

    const statusUpdate = (text) => {
        // [新增] 静默模式下不更新状态消息
        if (!isSilentMode && $statusMessageSpan_ACU) $statusMessageSpan_ACU.text(text);
    };

    const localAbortController = new AbortController();
    let loadingToast = null;
    let success = false;
    let modifiedKeys = []; // [修复] 提升作用域
    const maxRetries = 3;

    try {
        // [新增] 静默模式下不通知填表开始
        if (!isSilentMode) {
            topLevelWindow_ACU.AutoCardUpdaterAPI._notifyTableFillStart();
        }

        // [新增] 静默模式下不显示toast提示
        if (!isSilentMode && batchToastMessage) {
        const stopButtonHtml = `
            <button id="acu-stop-update-btn"
                    style="border: 1px solid #ffc107; color: #ffc107; background: transparent; padding: 5px 10px; border-radius: 4px; cursor: pointer; float: right; margin-left: 15px; font-size: 0.9em; transition: all 0.2s ease;"
                    onmouseover="this.style.backgroundColor='#ffc107'; this.style.color='#1a1d24';"
                    onmouseout="this.style.backgroundColor='transparent'; this.style.color='#ffc107';">
                终止
            </button>`;
        const toastMessage = `<div>${batchToastMessage}${stopButtonHtml}</div>`;

            loadingToast = showToastr_ACU('info', toastMessage, {
                timeOut: 0,
                extendedTimeOut: 0,
                tapToDismiss: false,
                acuToastCategory: ACU_TOAST_CATEGORY_ACU.MANUAL_TABLE,
                onShown: function() {
                    const $stopButton = jQuery_API_ACU('#acu-stop-update-btn');
                    if ($stopButton.length) {
                        $stopButton.off('click.acu_stop').on('click.acu_stop', function(e) {
                            e.stopPropagation();
                            e.preventDefault();

                            // [修复] 设置标志，告知事件监听器跳过因终止操作而触发的下一次更新检查
                            // 但只跳过一次，之后自动恢复正常
                            wasStoppedByUser_ACU = true;

                            // 1. Abort network requests
                            abortAllActiveRequests_ACU();
                            // [修复] 不再调用 SillyTavern_API_ACU.stopGeneration()，
                            // 因为这会停止酒馆的生成，但填表是独立的API调用，不应影响酒馆
                            // if (SillyTavern_API_ACU && typeof SillyTavern_API_ACU.stopGeneration === 'function') {
                            //     SillyTavern_API_ACU.stopGeneration();
                            //     logDebug_ACU('Called SillyTavern_API_ACU.stopGeneration()');
                            // }

                            // 2. Immediately reset UI state
                            isAutoUpdatingCard_ACU = false;
                            if ($manualUpdateCardButton_ACU) {
                                $manualUpdateCardButton_ACU.prop('disabled', false).text('立即手动更新');
                            }
                            if ($statusMessageSpan_ACU) {
                                 $statusMessageSpan_ACU.text('操作已终止。');
                            }

                            // 3. Remove toast and show confirmation
                            jQuery_API_ACU(this).closest('.toast').remove();
                            showToastr_ACU('warning', '填表操作已由用户终止。');

                            // [修复] 延迟重置标志，确保只跳过因本次终止操作触发的事件
                            // 而不会影响后续正常的自动更新
                            setTimeout(() => {
                                wasStoppedByUser_ACU = false;
                                logDebug_ACU('ACU: wasStoppedByUser_ACU reset after abort timeout.');
                            }, 3000);
                        });
                    } else {
                        logError_ACU('Could not find the stop button in the toast.');
                    }
                }
            });
        }

        if (!isSilentMode) {
            statusUpdate('准备AI输入...');
        }
        // [修复] 传递 targetSheetKeys
        const dynamicContent = await prepareAIInput_ACU(messagesToUse, updateMode, targetSheetKeys);
        if (!dynamicContent) throw new Error('无法准备AI输入，数据库未加载。');

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            // [修复] 检查用户是否已经终止操作，如果是则立即退出重试循环
            if (wasStoppedByUser_ACU) {
                logDebug_ACU('ACU: User abort detected, exiting retry loop.');
                throw new DOMException('Aborted by user', 'AbortError');
            }

            if (!isSilentMode) {
                statusUpdate(`第 ${attempt}/${maxRetries} 次调用AI进行增量更新...`);
            }

            let aiResponse = null;
            let apiError = null;

            // [新增] 将 API 调用放在 try-catch 中，以便在失败时重试
            try {
                aiResponse = await callCustomOpenAI_ACU(dynamicContent, localAbortController, requestOptions);
            } catch (error) {
                apiError = error;
                logWarn_ACU(`第 ${attempt} 次尝试失败：API调用失败 - ${error.message}`);

                if (localAbortController.signal.aborted) {
                    throw new DOMException('Aborted by user', 'AbortError');
                }

                // 如果不是最后一次尝试，等待后重试
                if (attempt < maxRetries) {
                    const waitTime = 1000 * attempt; // 递增等待时间：1秒、2秒、3秒
                    logDebug_ACU(`等待 ${waitTime}ms 后重试...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                } else {
                    // 最后一次尝试也失败，抛出错误
                    throw new Error(`API调用在 ${maxRetries} 次尝试后仍失败: ${error.message}`);
                }
            }

            if (localAbortController.signal.aborted) {
                 throw new DOMException('Aborted by user', 'AbortError');
            }

            if (!aiResponse || !aiResponse.includes('<tableEdit>') || !aiResponse.includes('</tableEdit>')) {
                logWarn_ACU(`第 ${attempt} 次尝试失败：AI响应中未找到完整有效的 <tableEdit> 标签。`);
                if (attempt === maxRetries) {
                    throw new Error(`AI在 ${maxRetries} 次尝试后仍未能返回有效指令。`);
                }
                await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒后重试
                continue;
            }

            if (!isSilentMode) {
                statusUpdate('解析并应用AI返回的更新...');
            }
            const parseResult = parseAndApplyTableEdits_ACU(aiResponse, updateMode);

            let parseSuccess = false;
            modifiedKeys = []; // Reset for this attempt

            if (typeof parseResult === 'object' && parseResult !== null) {
                parseSuccess = parseResult.success;
                modifiedKeys = parseResult.modifiedKeys || [];
            } else {
                parseSuccess = !!parseResult;
                modifiedKeys = targetSheetKeys || [];
            }

            if (!parseSuccess) throw new Error('解析或应用AI更新时出错。');

            success = true;
            break;
        }

        if (success) {
            // [修正] 在导入模式下，不保存到聊天记录，而是由父函数在最后统一处理
            if (!isImportMode) {
                if (!isSilentMode) {
                    statusUpdate('正在将更新后的数据库保存到聊天记录...');
                }
                // [新增] 根据更新模式选择不同的保存标记
                // updateMode 在这里仅用于逻辑判断，实际保存使用新的独立函数
                // 如果是 import 模式，不需要在这里保存

                // [核心修复] 仅保存实际发生变化的表格
                let keysToPersist = modifiedKeys;
                if (targetSheetKeys && Array.isArray(targetSheetKeys)) {
                    keysToPersist = keysToPersist.filter(k => targetSheetKeys.includes(k));
                }

                // [优化] 检查是否是首次初始化（聊天记录中没有任何数据库记录）
                // 如果是首次初始化，即使某些表没有被AI修改，也需要保存完整的模板结构
                const isFirstTimeInit = await checkIfFirstTimeInit_ACU();

                if (keysToPersist.length > 0 || isFirstTimeInit) {
                    // [优化] 首次初始化时，保存所有表格的完整结构
                    // 对于没有被AI修改的表，使用模板中的原始数据（包括预置数据）
                    let keysToActuallySave = keysToPersist;
                    if (isFirstTimeInit) {
                        // 获取所有表格的 key
                        const allSheetKeys = getSortedSheetKeys_ACU(currentJsonTableData_ACU);
                        keysToActuallySave = allSheetKeys;

                        // [关键] 获取完整模板（包含预置数据），用于填充没有被AI更新的表
                        const fullTemplate = parseTableTemplateJson_ACU({ stripSeedRows: false });
                        if (fullTemplate) {
                            allSheetKeys.forEach(sheetKey => {
                                // 如果这个表没有被AI修改，使用模板中的原始数据
                                if (!keysToPersist.includes(sheetKey) && fullTemplate[sheetKey]) {
                                    currentJsonTableData_ACU[sheetKey] = JSON.parse(JSON.stringify(fullTemplate[sheetKey]));
                                    logDebug_ACU(`[Init] Table ${sheetKey} not modified by AI, using template data (may include seed rows).`);
                                }
                            });
                        }

                        logDebug_ACU('[Init] First time initialization detected. Saving complete template structure with all tables.');
                    }

                    // [合并更新逻辑] 传递 targetSheetKeys 作为合并更新组
                    // 只要组内有任意一个表被修改，整组表都视为已更新
                    // 首次初始化时，updateGroupKeys 使用实际被修改的表
                    // [新增] 仅对总结表/总体大纲：未写入则视为未更新
                    const updateGroupKeysRaw = isFirstTimeInit ? keysToPersist : targetSheetKeys;
                    const updateGroupKeysToUse = Array.isArray(updateGroupKeysRaw)
                        ? updateGroupKeysRaw.filter(sheetKey => {
                            const table = currentJsonTableData_ACU?.[sheetKey];
                            if (!table || !isSummaryOrOutlineTable_ACU(table.name)) return true;
                            return keysToActuallySave.includes(sheetKey);
                        })
                        : updateGroupKeysRaw;
                    const saveSuccess = await saveIndependentTableToChatHistory_ACU(saveTargetIndex, keysToActuallySave, updateGroupKeysToUse);
                    if (!saveSuccess) throw new Error('无法将更新后的数据库保存到聊天记录。');
                } else {
                    logDebug_ACU("No tables were modified by AI, skipping save to chat history.");
                }

                await updateReadableLorebookEntry_ACU(true);
            } else {
                if (!isSilentMode) {
                    statusUpdate('分块处理成功...');
                }
                logDebug_ACU("Import mode: skipping save to chat history for this chunk.");
            }

            // [新增] 静默模式下不通知UI刷新（注意：saveJsonTableToChatHistory_ACU 已经在合并后通知UI刷新了）
            // 这里保留是为了兼容性，但主要通知在 saveJsonTableToChatHistory_ACU 中
            if (!isSilentMode) {
            setTimeout(() => {
                topLevelWindow_ACU.AutoCardUpdaterAPI._notifyTableUpdate();
                logDebug_ACU('Delayed notification sent after saving.');
            }, 250);
            }

            if (!isSilentMode) {
                statusUpdate('数据库增量更新成功！');
                if (typeof updateCardUpdateStatusDisplay_ACU === 'function') {
                    updateCardUpdateStatusDisplay_ACU();
                }
            }
        }
        return success;

    } catch (error) {
        if (error.name === 'AbortError') {
            logDebug_ACU('Fetch request was aborted by the user.');
            // UI state is now reset in the click handler, so we just need to log and return
        } else {
            logError_ACU(`数据库增量更新流程失败: ${error.message}`);
            // [新增] 静默模式下不显示错误提示
            if (!isSilentMode) {
            showToastr_ACU('error', `更新失败: ${error.message}`);
                if (statusUpdate) {
            statusUpdate('错误：更新失败。');
                }
            } else {
                logError_ACU(`[静默模式] 总结表更新失败: ${error.message}`);
            }
        }
        return false;
    } finally {
        // The toast is removed by the click handler on abort, so this only clears it on success/error
        if (loadingToast && toastr_API_ACU) {
            toastr_API_ACU.clear(loadingToast);
        }
        // currentAbortController_ACU 由 callCustomOpenAI_ACU 内部管理
        // [修改] 不在此处重置 isAutoUpdatingCard_ACU 和按钮状态，交由上层调用函数管理
        // isAutoUpdatingCard_ACU = false;
        // if ($manualUpdateCardButton_ACU) {
        //     $manualUpdateCardButton_ACU.prop('disabled', false).text('立即手动更新');
        // }
    }
  }

  // [重构] 手动合并总结功能处理函数 (Medusa 模式)
  // 关键点：
  // 1. 所有批次必须全部成功完成后，才会统一写入数据库并触发世界书注入；任意一批失败都会终止并不落盘。
  // 2. AI 请求与 <tableEdit> 解析一体化放入同一重试循环，解析失败同样会触发重试而不是被视为成功。
  // 3. 明确的批次完成计数与进度文案，避免“首批成功即整体成功”的误判。
  async function handleManualMergeSummary_ACU() {
      if (isAutoUpdatingCard_ACU) {
          showToastr_ACU('info', '后台已有任务在运行，请稍候。', { acuToastCategory: ACU_TOAST_CATEGORY_ACU.MERGE_TABLE });
          return;
      }

      wasStoppedByUser_ACU = false;

      // [关键修复] 手动合并总结在开始前强制刷新一次内存数据库。
      // 目的：避免 UI 已显示有数据，但 currentJsonTableData_ACU 仍停留在旧状态，导致合并时读取到空表。
      // 注意：使用 loadOrCreateJsonTableFromChatHistory_ACU() + refreshMergedDataAndNotify_ACU() 的既有链路，
      // 该链路不会触发自动合并总结（自动合并只在手动/自动更新后显式 checkAndTriggerAutoMergeSummary_ACU 调用）。
      try {
          await loadAllChatMessages_ACU();
          await loadOrCreateJsonTableFromChatHistory_ACU();
      } catch (e) {
          logWarn_ACU('[手动合并总结] 合并前刷新数据库失败，将继续使用当前内存数据:', e);
      }

      const $countInput = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-merge-target-count`);
      const $batchInput = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-merge-batch-size`);
      const $startInput = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-merge-start-index`);
      const $endInput = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-merge-end-index`);
      const $promptInput = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-merge-prompt-template`);
      const $btn = $popupInstance_ACU.find(`#${SCRIPT_ID_PREFIX_ACU}-start-merge-summary`);

      const targetCount = settings_ACU.mergeTargetCount || 1;
      const batchSize = settings_ACU.mergeBatchSize || 5;
      const startIndex = Math.max(0, (settings_ACU.mergeStartIndex || 1) - 1); // 转换为0-based索引
      const endIndex = settings_ACU.mergeEndIndex ? Math.max(startIndex + 1, settings_ACU.mergeEndIndex) : null; // null表示到最后
      let promptTemplate = settings_ACU.mergeSummaryPrompt || DEFAULT_MERGE_SUMMARY_PROMPT_ACU;

      if (!promptTemplate) {
          showToastr_ACU('error', '提示词模板不能为空。');
          return;
      }

      const apiIsConfigured = (settings_ACU.apiMode === 'custom' && (settings_ACU.apiConfig.useMainApi || (settings_ACU.apiConfig.url && settings_ACU.apiConfig.model))) || (settings_ACU.apiMode === 'tavern' && settings_ACU.tavernProfile);
      if (!apiIsConfigured) {
          showToastr_ACU('warning', '请先配置API连接。');
          return;
      }

      if (!currentJsonTableData_ACU) {
          showToastr_ACU('error', '数据库未加载。');
          return;
      }

      const summaryKey = Object.keys(currentJsonTableData_ACU).find(k => currentJsonTableData_ACU[k].name === '总结表');
      const outlineKey = Object.keys(currentJsonTableData_ACU).find(k => currentJsonTableData_ACU[k].name === '总体大纲');

      if (!summaryKey && !outlineKey) {
          showToastr_ACU('warning', '未找到"总结表"或"总体大纲"，无法进行合并。');
          return;
      }

      let fullSummaryRows = summaryKey ? (currentJsonTableData_ACU[summaryKey].content || []).slice(1) : [];
      let fullOutlineRows = outlineKey ? (currentJsonTableData_ACU[outlineKey].content || []).slice(1) : [];

      if (fullSummaryRows.length === 0 && fullOutlineRows.length === 0) {
          showToastr_ACU('info', `当前没有总结或大纲数据需要合并。`);
          return;
      }

      // 验证并调整范围
      const maxSummaryRows = fullSummaryRows.length;
      const maxOutlineRows = fullOutlineRows.length;
      const maxRows = Math.max(maxSummaryRows, maxOutlineRows);

      if (startIndex >= maxRows) {
          showToastr_ACU('error', `起始条数超出可用数据范围。可用数据: ${maxRows} 条`);
          return;
      }

      const actualEndIndex = endIndex ? Math.min(endIndex, maxRows) : maxRows;
      if (startIndex >= actualEndIndex) {
          showToastr_ACU('error', '起始条数不能大于或等于终止条数。');
          return;
      }

      // 提取指定范围的数据
      let allSummaryRows = fullSummaryRows.slice(startIndex, actualEndIndex);
      let allOutlineRows = fullOutlineRows.slice(startIndex, actualEndIndex);
      const selectedRange = actualEndIndex - startIndex;

      if (allSummaryRows.length === 0 && allOutlineRows.length === 0) {
          showToastr_ACU('info', `指定范围内没有总结或大纲数据需要合并。范围: 第${startIndex + 1}条 到 第${actualEndIndex}条`);
          return;
      }

      if (!confirm(`即将开始合并总结。\n\n源数据范围: 第${startIndex + 1}条 到 第${actualEndIndex}条 (${selectedRange} 条数据)\n处理数据: ${allSummaryRows.length} 条总结 + ${allOutlineRows.length} 条大纲\n目标: 精简为 ${targetCount} 条\n\n注意：此操作将使用AI重写指定范围内的总结和大纲数据，其他数据不受影响。操作不可逆！\n建议先导出JSON备份。`)) {
          return;
      }

      isAutoUpdatingCard_ACU = true;
      $btn.prop('disabled', true).text('正在合并 (0%)...');

      const stopButtonHtml = `<button id="acu-merge-stop-btn" style="border: 1px solid #ffc107; color: #ffc107; background: transparent; padding: 5px 10px; border-radius: 4px; cursor: pointer; float: right; margin-left: 15px; font-size: 0.9em; transition: all 0.2s ease;" onmouseover="this.style.backgroundColor='#ffc107'; this.style.color='#1a1d24';" onmouseout="this.style.backgroundColor='transparent'; this.style.color='#ffc107';">终止</button>`;
      let progressToast = showToastr_ACU('info', `<div>正在合并总结与大纲...${stopButtonHtml}</div>`, {
          timeOut: 0, extendedTimeOut: 0, tapToDismiss: false,
          acuToastCategory: ACU_TOAST_CATEGORY_ACU.MERGE_TABLE,
          onShown: function() {
              jQuery_API_ACU('#acu-merge-stop-btn').off('click.acu_stop').on('click.acu_stop', function(e) {
                  e.stopPropagation();
                  e.preventDefault();
                  wasStoppedByUser_ACU = true;
                  abortAllActiveRequests_ACU();
                  if (SillyTavern_API_ACU && typeof SillyTavern_API_ACU.stopGeneration === 'function') SillyTavern_API_ACU.stopGeneration();
                  jQuery_API_ACU(this).closest('.toast').remove();
                  showToastr_ACU('warning', '合并操作已由用户终止。');
                  isAutoUpdatingCard_ACU = false;
                  $btn.prop('disabled', false).text('开始合并总结');
              });
          }
      });

      try {
          const maxRows = Math.max(allSummaryRows.length, allOutlineRows.length);
          const totalBatches = Math.ceil(maxRows / batchSize);

          let accumulatedSummary = [];
          let accumulatedOutline = [];

          // [新增] 手动合并总结：为“第一批次”提供一个稳定的索引锚点。
          // 规则：第一批次的两个基础表（总结表/总体大纲）从“本次合并范围起点 startIndex 之前”的已有表格数据中，
          // 各自抽取最近 2 条作为填表基础；若不足 2 条则取现有全部；若没有则留空。
          // 注意：该逻辑仅用于手动合并总结，不影响自动合并总结 performAutoMergeSummary_ACU。
          const pickLastRowsBeforeIndex_ACU = (allRows, beforeIndex, count) => {
              if (!Array.isArray(allRows) || allRows.length === 0) return [];
              const end = Math.max(0, Math.min(Number.isFinite(beforeIndex) ? beforeIndex : 0, allRows.length));
              const start = Math.max(0, end - (Number.isFinite(count) ? count : 0));
              return allRows.slice(start, end);
          };

          for (let i = 0; i < totalBatches; i++) {
              if (wasStoppedByUser_ACU) throw new Error('用户终止操作');

              const startIdx = i * batchSize;
              const endIdx = startIdx + batchSize;
              const batchSummaryRows = allSummaryRows.slice(startIdx, endIdx);
              const batchOutlineRows = allOutlineRows.slice(startIdx, endIdx);

              const formatRows = (rows, displayStartIndex) => rows.map((r, idx) => `[${displayStartIndex + idx}] ${r.slice(1).join(', ')}`).join('\n');
              const textA = batchSummaryRows.length > 0 ? formatRows(batchSummaryRows, (startIndex + 1) + startIdx) : "(本批次无新增总结数据)";
              const textB = batchOutlineRows.length > 0 ? formatRows(batchOutlineRows, (startIndex + 1) + startIdx) : "(本批次无新增大纲数据)";

              let textBase = "";
              const summaryTableObj = currentJsonTableData_ACU[summaryKey];
              const outlineTableObj = currentJsonTableData_ACU[outlineKey];

              const formatTableStructure = (tableName, currentRows, originalTableObj, tableIndex) => {
                  let str = `[${tableIndex}:${tableName}]\n`;
                  const headers = originalTableObj.content[0] ? originalTableObj.content[0].slice(1).map((h, i) => `[${i}:${h}]`).join(', ') : 'No Headers';
                  str += `  Columns: ${headers}\n`;
                  if (originalTableObj.sourceData) {
                      str += `  - Note: ${originalTableObj.sourceData.note || 'N/A'}\n`;
                  }
                  if (currentRows && currentRows.length > 0) {
                      currentRows.forEach((row, rIdx) => { str += `  [${rIdx}] ${row.join(', ')}\n`; });
                  } else {
                      str += `  (Table Empty - No rows yet)\n`;
                  }
                  return str + "\n";
              };

              // [优化] 为 $BASE_DATA 准备数据（仅手动合并总结）：
              // - 第一批次：使用 startIndex 之前“原表格”中最近 2 条记录做基础（如无则为空）
              // - 后续批次：使用之前批次生成的累积条目做基础
              const summaryBaseData = (i === 0)
                  ? pickLastRowsBeforeIndex_ACU(fullSummaryRows, startIndex, 2)
                  : accumulatedSummary.slice();
              const outlineBaseData = (i === 0)
                  ? pickLastRowsBeforeIndex_ACU(fullOutlineRows, startIndex, 2)
                  : accumulatedOutline.slice();

              if(summaryTableObj) textBase += formatTableStructure(summaryTableObj.name, summaryBaseData, summaryTableObj, 0);
              if(outlineTableObj) textBase += formatTableStructure(outlineTableObj.name, outlineBaseData, outlineTableObj, 1);

              let currentPrompt = promptTemplate.replace('$TARGET_COUNT', targetCount).replace('$A', textA).replace('$B', textB).replace('$BASE_DATA', textBase);

              let aiResponseText = "";
              let lastError = null;
              const maxRetries = 3;

              for (let attempt = 1; attempt <= maxRetries; attempt++) {
                  if (wasStoppedByUser_ACU) throw new Error('用户终止操作');

                  const percent = Math.floor((i / totalBatches) * 100);
                  const progressText = `正在处理批次 ${i + 1}/${totalBatches} (尝试 ${attempt}/${maxRetries})...`;
                  $btn.text(progressText);

                  // 更新toast消息显示批次进度
                  if (progressToast) {
                      const toastMessage = `<div>正在合并总结与大纲... (批次 ${i + 1}/${totalBatches})${stopButtonHtml}</div>`;
                      progressToast.find('.toast-message').html(toastMessage);
                      // 重新绑定终止按钮事件
                      jQuery_API_ACU('#acu-merge-stop-btn').off('click.acu_stop').on('click.acu_stop', function(e) {
                          e.stopPropagation();
                          e.preventDefault();
                          wasStoppedByUser_ACU = true;
                          abortAllActiveRequests_ACU();
                          if (SillyTavern_API_ACU && typeof SillyTavern_API_ACU.stopGeneration === 'function') SillyTavern_API_ACU.stopGeneration();
                          jQuery_API_ACU(this).closest('.toast').remove();
                          showToastr_ACU('warning', '合并操作已由用户终止。');
                          isAutoUpdatingCard_ACU = false;
                          $btn.prop('disabled', false).text('开始合并总结');
                      });
                  }

                  let messagesToUse = JSON.parse(JSON.stringify(settings_ACU.charCardPrompt || [DEFAULT_CHAR_CARD_PROMPT_ACU]));
                  let mainPromptSegment =
                      messagesToUse.find(m => (String(m?.mainSlot || '').toUpperCase() === 'A') || m?.isMain) ||
                      messagesToUse.find(m => m && m.content && m.content.includes("你接下来需要扮演一个填表用的美杜莎"));
                  if (mainPromptSegment) {
                      mainPromptSegment.content = currentPrompt;
                  } else {
                      messagesToUse.push({ role: 'USER', content: currentPrompt });
                  }
                  const finalMessages = messagesToUse.map(m => ({ role: m.role.toLowerCase(), content: m.content }));

                  try {
                      if (settings_ACU.apiMode === 'tavern') {
                           const result = await SillyTavern_API_ACU.ConnectionManagerRequestService.sendRequest(settings_ACU.tavernProfile, finalMessages, settings_ACU.apiConfig.max_tokens || 4096);
                          if (result && result.ok) aiResponseText = result.result.choices[0].message.content;
                          else throw new Error('API请求返回不成功状态');
                      } else {
                          if (settings_ACU.apiConfig.useMainApi) {
                              aiResponseText = await TavernHelper_API_ACU.generateRaw({ ordered_prompts: finalMessages, should_stream: false });
                          } else {
                               const res = await fetch(`/api/backends/chat-completions/generate`, {
                                   method: 'POST',
                                   headers: { ...SillyTavern.getRequestHeaders(), 'Content-Type': 'application/json' },
                                   body: JSON.stringify({
                                       "messages": finalMessages, "model": settings_ACU.apiConfig.model, "temperature": settings_ACU.apiConfig.temperature,
                                       "max_tokens": settings_ACU.apiConfig.max_tokens || 4096, "stream": false, "chat_completion_source": "custom",
                                       "reverse_proxy": settings_ACU.apiConfig.url, "custom_url": settings_ACU.apiConfig.url,
                                       "custom_include_headers": settings_ACU.apiConfig.apiKey ? `Authorization: Bearer ${settings_ACU.apiConfig.apiKey}` : ""
                                   })
                               });
                               if (!res.ok) throw new Error(`API请求失败: ${res.status} ${await res.text()}`);
                               const data = await res.json();
                               if (data?.choices?.[0]?.message?.content) aiResponseText = data.choices[0].message.content;
                               else throw new Error('API返回的数据格式不正确');
                          }
                      }

                      const extractResult = extractTableEditInner_ACU(aiResponseText, { allowNoTableEditTags: true });
                      if (!extractResult || !extractResult.inner) {
                          throw new Error('AI未返回有效的 <tableEdit> 块（缺少 <tableEdit> 边界或 <!-- --> 注释块不完整）。');
                      }

                      const editsString = extractResult.inner;
                      const newSummaryRows = [];
                      const newOutlineRows = [];

                      editsString.split('\n').forEach(line => {
                          const match = line.trim().match(/insertRow\s*\(\s*(\d+)\s*,\s*(\{.*?\}|\[.*?\])\s*\)/);
                          if (match) {
                              try {
                                  const tableIdx = parseInt(match[1], 10);
                                  let rowData = JSON.parse(match[2].replace(/'/g, '"'));
                                  if (typeof rowData === 'object' && !Array.isArray(rowData)) {
                                      // 将对象格式转换为数组格式，添加null作为ID列
                                      const sortedKeys = Object.keys(rowData).sort((a,b) => parseInt(a) - parseInt(b));
                                      const dataColumns = sortedKeys.map(k => rowData[k]);
                                      rowData = [null, ...dataColumns]; // ID列(null) + 数据列
                                  }
                                  if (tableIdx === 0 && summaryKey) newSummaryRows.push(rowData);
                                  else if (tableIdx === 1 && outlineKey) newOutlineRows.push(rowData);
                              } catch (e) { logWarn_ACU('解析行失败:', line, e); }
                          }
                      });

                      if (newSummaryRows.length === 0 && newOutlineRows.length === 0) {
                          throw new Error('AI返回了内容，但未能解析出任何有效的数据行。');
                      }

                      // [修复] 将新批次的数据追加到累积数据中，而不是替换
                      accumulatedSummary = accumulatedSummary.concat(newSummaryRows);
                      accumulatedOutline = accumulatedOutline.concat(newOutlineRows);

                      lastError = null;
                      break;
                  } catch (e) {
                      lastError = e;
                      logWarn_ACU(`批次 ${i + 1} 尝试 ${attempt} 失败: ${e.message}`);
                      if (attempt < maxRetries) await new Promise(resolve => setTimeout(resolve, 2000));
                  }
              }
              if (lastError) throw new Error(`批次 ${i + 1} 在 ${maxRetries} 次尝试后均失败: ${lastError.message}`);
          }

          // FINALIZATION: Only write if all batches succeeded.
          // 只替换指定范围内的数据，保持其他数据不变
          if (summaryKey && accumulatedSummary.length > 0) {
              const table = currentJsonTableData_ACU[summaryKey];
              const originalContent = table.content.slice(1); // 排除表头
              // 替换指定范围内的数据
              const newSummaryContent = [
                  ...originalContent.slice(0, startIndex), // 起始之前的保持不变
                  ...accumulatedSummary, // 替换的范围 (accumulatedSummary已经是完整行数据)
                  ...originalContent.slice(actualEndIndex) // 结束之后的保持不变
              ];
              table.content = [table.content[0], ...newSummaryContent];
          }
          if (outlineKey && accumulatedOutline.length > 0) {
              const table = currentJsonTableData_ACU[outlineKey];
              const originalContent = table.content.slice(1); // 排除表头
              // 替换指定范围内的数据
              const newOutlineContent = [
                  ...originalContent.slice(0, startIndex), // 起始之前的保持不变
                  ...accumulatedOutline, // 替换的范围 (accumulatedOutline已经是完整行数据)
                  ...originalContent.slice(actualEndIndex) // 结束之后的保持不变
              ];
              table.content = [table.content[0], ...newOutlineContent];
          }

          const keysToSave = [summaryKey, outlineKey].filter(Boolean);
          await saveIndependentTableToChatHistory_ACU(SillyTavern_API_ACU.chat.length - 1, keysToSave, keysToSave);
          await updateReadableLorebookEntry_ACU(true);

          topLevelWindow_ACU.AutoCardUpdaterAPI._notifyTableUpdate();
          if (typeof updateCardUpdateStatusDisplay_ACU === 'function') updateCardUpdateStatusDisplay_ACU();

          showToastr_ACU('success', '所有批次处理完毕，数据库已更新！', { acuToastCategory: ACU_TOAST_CATEGORY_ACU.MERGE_TABLE });

      } catch (e) {
          logError_ACU('合并过程出错:', e);
          showToastr_ACU('error', '合并过程出错: ' + e.message, { acuToastCategory: ACU_TOAST_CATEGORY_ACU.ERROR });
      } finally {
          isAutoUpdatingCard_ACU = false;
          $btn.prop('disabled', false).text('开始合并总结');
          wasStoppedByUser_ACU = false;
          if (progressToast && toastr_API_ACU) toastr_API_ACU.clear(progressToast);
      }
  }

  async function handleManualUpdateCard_ACU() {
    if (isAutoUpdatingCard_ACU) {
      showToastr_ACU('info', '已有更新任务在后台进行中。', { acuToastCategory: ACU_TOAST_CATEGORY_ACU.MANUAL_TABLE });
      return;
    }

    const apiIsConfigured = (settings_ACU.apiMode === 'custom' && (settings_ACU.apiConfig.useMainApi || (settings_ACU.apiConfig.url && settings_ACU.apiConfig.model))) || (settings_ACU.apiMode === 'tavern' && settings_ACU.tavernProfile);

    if (!apiIsConfigured) {
      showToastr_ACU('warning', '请先完成当前API模式的配置。');
      if ($popupInstance_ACU && $apiConfigAreaDiv_ACU && $apiConfigAreaDiv_ACU.is(':hidden')) {
        if ($apiConfigSectionToggle_ACU) $apiConfigSectionToggle_ACU.trigger('click');
      }
      return;
    }

    isAutoUpdatingCard_ACU = true;
    if ($manualUpdateCardButton_ACU) $manualUpdateCardButton_ACU.prop('disabled', true).text('更新中...');

    await loadAllChatMessages_ACU();
    const liveChat = SillyTavern_API_ACU.chat || [];
    const threshold = getEffectiveAutoUpdateThreshold_ACU('manual_update');

    // 1. 严格按照“上下文层数”从最新消息往前读取，找出这个范围内的所有AI楼层
    const allAiMessageIndices = liveChat
        .map((msg, index) => !msg.is_user ? index : -1)
        .filter(index => index !== -1);

    // [优化] 从用户设置的读取上下文层数的最开始的楼层开始
    // slice(-threshold) 返回最后 threshold 个元素，顺序为 [oldest, ..., newest]
    // 这保证了按照时间顺序从最旧到最新进行处理
    const messagesToProcessIndices = allAiMessageIndices.slice(-threshold);

    // [重要修正] 确保顺序是从最旧的批次到最新的批次
    // slice(-threshold) 已经按时间正序返回了 [oldest...newest]，所以不需要 reverse
    // processUpdates_ACU 内部会按照 batchSize 切片，也是顺序处理
    // 举例：threshold=10, batchSize=2
    // indices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] (0是10条里最旧的)
    // batch 1: [0, 1] -> 处理并保存到 1
    // batch 2: [2, 3] -> 读取 1 的数据库，处理 2,3，保存到 3
    // ...
    // batch 5: [8, 9] -> 读取 7 的数据库，处理 8,9，保存到 9
    // 逻辑是正确的。如果用户感觉反了，可能是因为之前的逻辑是倒序的，或者哪里有误解。
    // 现在的逻辑：messagesToProcessIndices[0] 是最旧的消息。

    if (messagesToProcessIndices.length === 0) {
        showToastr_ACU('info', '在指定的上下文层数内没有找到AI消息可供处理。');
        isAutoUpdatingCard_ACU = false;
        if ($manualUpdateCardButton_ACU) $manualUpdateCardButton_ACU.prop('disabled', false).text('立即手动更新');
        return;
    }

    // [手动更新模式] 强制使用UI参数，忽略表格模板中的独立配置（频率、上下文深度、批次大小等）
    // 使用合并模式，保存时仅记录实际被修改的表，避免将未修改的表也标记为已更新
    const batchSize = settings_ACU.updateBatchSize || 2;

    // 获取所有表的 key（手动更新时更新所有表，但各表独立处理）
    const allSheetKeys = getSortedSheetKeys_ACU(currentJsonTableData_ACU);

    // 2. 将这些楼层作为待办列表，调用统一的处理器
    // processUpdates_ACU 会根据 UI 设置的 batchSize 分成批次，按顺序处理
    // 每一批次处理完后，会将结果保存到该批次的最后一个楼层 (latest floor of the batch)
    // manual_* 模式下，processUpdates_ACU 会忽略 token 阈值，且强制覆盖
    showToastr_ACU('info', `手动更新已启动 (合并模式)，将处理最近的 ${messagesToProcessIndices.length} 条AI消息。`);

    // [修改] 使用 manual_independent 模式，传入所有表的 key
    const success = await processUpdates_ACU(messagesToProcessIndices, 'manual_independent', {
        targetSheetKeys: allSheetKeys,
        batchSize: batchSize
    });

    isAutoUpdatingCard_ACU = false;
    if ($manualUpdateCardButton_ACU) $manualUpdateCardButton_ACU.prop('disabled', false).text('立即手动更新');

    if (success) {
        showToastr_ACU('success', '手动更新已成功完成！');
        await loadAllChatMessages_ACU();
        await refreshMergedDataAndNotify_ACU();

        // [新增] 在手动更新全部完成后检测自动合并总结
        try {
            await checkAndTriggerAutoMergeSummary_ACU();
        } catch (e) {
            logWarn_ACU('自动合并总结检测失败:', e);
        }
    } else {
        showToastr_ACU('error', '手动更新失败或被中断。');
    }
  }

