# 变量读取和显示位置总结

## 📊 变量读取位置

### 1. `variableReader.ts` - `readGameData()`
**位置**: `src/mhjg/utils/variableReader.ts:159`
**用途**: 所有 UI 组件读取游戏数据的主要入口
**读取方式**:
- 优先从最新消息楼层（`message_id: 'latest'`）读取 MVU 数据
- 如果最新楼层没有数据，则从0层读取（用于初始化）
- 通过 `getGameMvuData()` 获取 `stat_data`，然后解析各个字段

**读取的数据**:
- 旅店信息（名称、世界、状态、受欢迎度、入住率）
- 法则和准入条件
- 资源（金币、声望、建材）
- 时间（天数、当前时间）
- 设施列表
- 客人列表
- 员工列表

### 2. `unifiedRequestHandler.ts` - `getBaseMvuData()`
**位置**: `src/mhjg/utils/unifiedRequestHandler.ts:72`
**用途**: 获取基础 MVU 数据，用于创建新消息时传递变量
**读取方式**:
- 优先从最新 assistant 消息的 `data` 获取
- 如果没有，则从 MVU 获取最新消息的数据（`Mvu.getMvuData({ type: 'message', message_id: 'latest' })`）

### 3. `StoryModal.ts` - `loadFromChatMessages()`
**位置**: `src/mhjg/components/modals/StoryModal.ts:61`
**用途**: 从聊天消息读取文本内容（maintext 和 options）
**读取方式**:
- 使用 `getChatMessages(-1, { role: 'assistant' })` 获取最新 assistant 消息
- 如果没有 assistant 消息，则获取最新消息（不限制 role）
- 解析消息中的 `<maintext>` 和 `<option>` 标签
- **注意**: 不读取变量，只读取消息文本

## 🖥️ 变量显示位置

### 1. `Dashboard.ts` - `loadFromVariables()`
**位置**: `src/mhjg/components/Dashboard.ts:88`
**显示内容**:
- 旅店状态（营业中/休息中）
- 当前法则和法则列表
- 当前准入条件和准入条件列表
- 设施列表（名称、等级、描述）
- 编年史（从世界书读取）

### 2. `TopBar.ts` - `loadFromVariables()`
**位置**: `src/mhjg/components/TopBar.ts:34`
**显示内容**:
- 金币
- 声望
- 建材
- 当前世界名
- 旅店名称

### 3. `GuestsModal.ts` - `loadFromVariables()`
**位置**: `src/mhjg/components/modals/GuestsModal.ts:70`
**显示内容**:
- 客人列表（卡片形式）
- 每个客人的详细信息：名称、种族、职业、等级、外貌、心情值、消费金额、当前想法

### 4. `StaffModal.ts` - `loadFromVariables()`
**位置**: `src/mhjg/components/modals/StaffModal.ts:107`
**显示内容**:
- 员工列表（卡片形式）
- 每个员工的详细信息：名称、种族、职务、战斗职业、等级、外貌、心情值、好感度、工作满意度、工资、喜好、厌恶、当前想法

### 5. `BuildModal.ts` - `loadFromVariables()`
**位置**: `src/mhjg/components/modals/BuildModal.ts:31`
**显示内容**:
- 设施列表（用于升级）

### 6. `StoryModal.ts` - `loadFromChatMessages()`
**位置**: `src/mhjg/components/modals/StoryModal.ts:61`
**显示内容**:
- 剧情文本（maintext）
- 选项按钮（options）
- **注意**: 不显示变量，只显示消息文本

## 🔄 变量更新位置

### 1. `unifiedRequestHandler.ts` - `handleUnifiedRequest()`
**位置**: `src/mhjg/utils/unifiedRequestHandler.ts:281`
**更新流程**:
1. 获取基础 MVU 数据（`getBaseMvuData()`）
2. 创建 user 消息，传递 MVU 数据
3. 调用 LLM 生成回复
4. 解析 LLM 返回的 `<UpdateVariable>` 标签
5. 使用 `Mvu.parseMessage(finalMessage, old_data)` 解析变量更新
6. 创建 assistant 消息，传递基础数据
7. 使用 `Mvu.replaceMvuData(new_data, { type: 'message', message_id: assistantMessageId })` 更新变量

## 🔃 刷新机制

### 1. `index.ts` - `refreshAllComponents()`
**位置**: `src/mhjg/index.ts:139`
**功能**: 刷新所有组件的数据
**刷新的组件**:
- TopBar
- Dashboard
- GuestsModal（如果已打开）
- StaffModal（如果已打开）
- BuildModal（如果已打开）

### 2. `index.ts` - `initializeEventListeners()`
**位置**: `src/mhjg/index.ts:168`
**监听的事件**:
- `tavern_events.MESSAGE_RECEIVED`: 收到新消息时，刷新所有组件
- `tavern_events.MESSAGE_UPDATED`: 消息更新时，刷新所有组件

### 3. `StoryModal.ts` - `refresh()`
**位置**: `src/mhjg/components/modals/StoryModal.ts:466`
**功能**: 重新加载最新消息内容并刷新显示
**触发时机**:
- 消息接收和更新事件（通过 `setupMessageListener()` 监听）
- 手动调用（如 `onRefreshStory` 回调）

## ⚠️ 潜在问题

### 1. 变量读取位置不一致
- **UI 组件**（Dashboard、TopBar、GuestsModal、StaffModal、BuildModal）: 通过 `readGameData()` 从最新楼层读取
- **StoryModal**: 直接从聊天消息读取文本，不读取变量
- **unifiedRequestHandler**: 使用 `getBaseMvuData()` 获取基础数据

### 2. 刷新时机
- UI 组件在 `MESSAGE_RECEIVED` 和 `MESSAGE_UPDATED` 事件时刷新
- StoryModal 有自己的刷新逻辑，通过 `setupMessageListener()` 监听消息事件
- 可能存在刷新时机不一致的问题

### 3. 数据源
- `readGameData()` 优先从最新楼层读取，如果没有则从0层读取
- `getBaseMvuData()` 优先从最新 assistant 消息的 `data` 获取，如果没有则从 MVU 获取
- 两者可能读取到不同的数据源

## ✅ 建议

1. **统一数据读取方式**: 所有组件都应该通过 `readGameData()` 读取数据，确保数据一致性
2. **明确刷新时机**: 确保所有组件在变量更新后都能及时刷新
3. **数据源一致性**: 确保 `readGameData()` 和 `getBaseMvuData()` 读取的数据源一致

