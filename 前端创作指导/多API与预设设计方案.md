# 多API与预设设计方案

本文记录“第二API变量更新”的配置位置、运行流程，以及前端预设与美术渲染的实现方案，便于后续维护与扩展。

**代码位置速览**
1. 第二API变量更新逻辑：`src/taixu/hooks/useTavernInteraction.ts`
2. 多API世界书启用/禁用：`src/taixu/utils/worldbook.ts`
3. 多API设置与预设UI：`src/taixu/components/modal/ApiModeModal.tsx`
4. 多API配置存储与状态：`src/taixu/App.tsx`
5. 变量更新预设示例：`前端创作指导/变量更新预设.json`

**配置与存储设计**
1. 配置存储在本地 `localStorage`。
2. 多API开关：`taixujie_multi_api_enabled`。
3. 第二API配置：`taixujie_multi_api_config`，结构包含 `apiurl`、`key`、`model`、`retries`、`promptTemplate`、`worldbookRefs`、`presetRules`。
4. UI 中任意字段更新后，直接回写到上述配置对象。

**第二API变量更新流程**
1. 主API产出完整剧情后，从结果中截取 `maintext`。
2. 组装第二API提示词：
   - 合并启用的 `presetRules`。
   - 支持占位符 ` {maintext} `、` {variables_json} `、` {worldbook:条目名} `。
3. 读取世界书条目内容并注入模板。
4. 调用 `generateRaw`：
   - 多API开启时使用 `custom_api`。
   - 多API关闭但允许时可退回主API（用于测试或回退）。
5. 解析第二API输出并抽取 `<UpdateVariable>` 内容。
6. 将变量更新结果附加回主回复并写入楼层。

**多API世界书切换规则**
1. 开启多API时：启用 `多API格式` 条目，关闭 `格式` 与各类 `[mvu_update]` 规则条目。
2. 关闭多API时：反向切换，恢复原有规则条目。
3. 实现位置：`setMultiApiWorldbookMode()` in `src/taixu/utils/worldbook.ts`。

**预设结构设计**
1. 预设文件为 JSON 数组，示例见 `前端创作指导/变量更新预设.json`。
2. 每个预设包含：
   - `rules`：多条规则文本，允许分组与启用/禁用。
   - `worldbook_refs`：预设需要的世界书条目。
3. UI 支持导入/导出预设，导入后会覆盖当前的 `promptTemplate`、`presetRules` 与 `worldbookRefs`。

**前端渲染与交互设计**
1. 多API设置面板：折叠式布局，减少高级配置干扰。
2. 变量更新预设：采用“分组折叠 + 规则卡片”结构。
3. 规则卡片交互：
   - 启用/禁用开关。
   - 内容编辑区。
   - 世界书引用按钮，支持搜索条目并插入 `{worldbook:...}`。
4. 预设导入导出：
   - 导出：生成 `变量更新预设.json`。
   - 导入：读取 JSON 并立即应用。

**美术设计规范（当前实现风格）**
1. 色彩：以青绿/墨绿为主，强调“系统面板感”。
2. 结构：浅色半透明面板 + 圆角 + 细边框。
3. 视觉层级：标题区强调，内容区以小字号分组显示。
4. 交互反馈：按钮 hover 亮化，状态文字用色区分成功/失败。

**功能实现要点**
1. 第二API提示词优先使用 `presetRules`，其次 `promptTemplate`。
2. `presetRules` 支持分组与世界书引用映射。
3. 变量更新结果必须严格产出 `<UpdateVariable>` 内容，不含额外文本。
4. 任何配置变动都应立刻写回 `localStorage`。

**记忆储存与API配置样式调整方案**
1. 记忆储存的“大总结 API 配置”卡片保持常驻展开，不再折叠。
2. 记忆储存 API 配置模块的大外框边框统一为 `border-emerald-400/90`，内部小边框保持 `border-emerald-100`。
3. 记忆参数页各卡片的大外框边框统一为 `border-emerald-400/90`，内部控件边框保持 `border-emerald-100`。
4. 记忆储存默认参数更新为：保留 10 层、历史压缩间隔 25、章节分卷间隔 100。
5. API 模式卡片边框与 API 配置模块保持同色（`border-emerald-400/90`）。

**扩展建议**
1. 增加“预设版本号”与“兼容性提示”，避免导入旧格式出错。
2. 增加“预设预览”与“采样运行”按钮，便于验证输出格式。
3. 对世界书引用提供“缺失条目提示”，防止空白注入。
