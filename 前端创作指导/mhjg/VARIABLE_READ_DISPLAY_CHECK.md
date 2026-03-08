# 变量读取和显示位置严格检查报告

## 📋 检查目标
检查每次更新 LLM 返回的信息后，主页面、员工、客人部分的所有变量显示部分，读取并显示的是哪里的信息。

## 🔄 完整数据流追踪

### 1. LLM 返回信息后的处理流程

#### 步骤 1: 创建 assistant 消息
**位置**: `src/mhjg/utils/unifiedRequestHandler.ts:441-453`
```typescript
// 创建 assistant 消息（先创建，传递基础数据）
await createChatMessages([
  {
    role: 'assistant',
    message: finalMessage, // 包含 <UpdateVariable> 标签
    data: old_data, // 先传递基础数据
  },
], {
  refresh: 'none',
});

// 获取新创建的消息 ID
const assistantMessageId = getLastMessageId();
```

**关键点**:
- 此时消息的 `data` 字段是 `old_data`（更新前的数据）
- `assistantMessageId` 是新创建的 assistant 消息的 ID

#### 步骤 2: 更新变量
**位置**: `src/mhjg/utils/unifiedRequestHandler.ts:451`
```typescript
// 将更新后的变量写回新创建的楼层
await Mvu.replaceMvuData(new_data, { type: 'message', message_id: assistantMessageId });
```

**关键点**:
- `replaceMvuData` 更新的是 `assistantMessageId` 楼层的变量
- 这是**异步操作**，需要等待完成
- 更新完成后，`assistantMessageId` 楼层的变量就是 `new_data`

#### 步骤 3: 触发事件
- `createChatMessages` 可能触发 `MESSAGE_RECEIVED` 事件（在 `replaceMvuData` 之前）
- `replaceMvuData` 完成后可能触发 `MESSAGE_UPDATED` 事件

---

### 2. UI 组件读取数据的位置

#### 2.1 主页面 (Dashboard)

**读取入口**: `src/mhjg/components/Dashboard.ts:88`
```typescript
public async loadFromVariables(): Promise<void> {
  const gameData = await readGameData();
  // ... 使用 gameData 更新 UI
}
```

**数据来源链**:
1. `Dashboard.loadFromVariables()` 
2. → `readGameData()` (`src/mhjg/utils/variableReader.ts:159`)
3. → `getGameMvuData()` (`src/mhjg/utils/variableReader.ts:75`)
4. → `Mvu.getMvuData({ type: 'message', message_id: 'latest' })` (`src/mhjg/utils/variableReader.ts:81`)

**读取的变量位置**:
- **`Mvu.getMvuData({ type: 'message', message_id: 'latest' })`**
- `'latest'` 表示**最新的消息楼层**
- 如果最新楼层是刚才创建的 `assistantMessageId`，并且 `replaceMvuData` 已完成，则读取的是更新后的 `new_data`
- 如果 `replaceMvuData` 还未完成，则读取的可能是旧数据

**显示的数据**:
- `gameData.innName` → `stat_data.旅店.名称`
- `gameData.businessStatus` → `stat_data.旅店.营业状态`
- `gameData.popularity` → `stat_data.旅店.受欢迎度`
- `gameData.occupancy` → `stat_data.旅店.入住率`
- `gameData.innLaw` → `stat_data.旅店.旅馆法则.当前法则`
- `gameData.lawList` → `stat_data.旅店.旅馆法则.法则列表`
- `gameData.currentAccessMode` → `stat_data.旅店.准入条件.当前准入条件`
- `gameData.accessModeList` → `stat_data.旅店.准入条件.准入条件列表`
- `gameData.facilities` → `stat_data.设施.设施列表`
- 编年史从世界书读取（不是从变量读取）

#### 2.2 顶部栏 (TopBar)

**读取入口**: `src/mhjg/components/TopBar.ts:34`
```typescript
public async loadFromVariables(): Promise<void> {
  const gameData = await readGameData();
  this.state = {
    gold: gameData.gold,
    reputation: gameData.reputation,
    materials: gameData.materials,
    currentWorld: gameData.currentWorld,
    innName: gameData.innName,
  };
}
```

**数据来源链**:
1. `TopBar.loadFromVariables()`
2. → `readGameData()` (`src/mhjg/utils/variableReader.ts:159`)
3. → `getGameMvuData()` (`src/mhjg/utils/variableReader.ts:75`)
4. → `Mvu.getMvuData({ type: 'message', message_id: 'latest' })` (`src/mhjg/utils/variableReader.ts:81`)

**读取的变量位置**:
- **`Mvu.getMvuData({ type: 'message', message_id: 'latest' })`**
- 与 Dashboard 相同，读取最新楼层的变量

**显示的数据**:
- `gameData.gold` → `stat_data.资源.金币`
- `gameData.reputation` → `stat_data.资源.声望`
- `gameData.materials` → `stat_data.资源.建材`
- `gameData.currentWorld` → `stat_data.旅店.当前世界.世界名`
- `gameData.innName` → `stat_data.旅店.名称`

#### 2.3 员工部分 (StaffModal)

**读取入口**: `src/mhjg/components/modals/StaffModal.ts:107`
```typescript
public async loadFromVariables(): Promise<void> {
  const gameData = await readGameData();
  // 转换员工数据格式
  this.staff = gameData.staff.map((staff, index) => {
    // ... 处理员工数据
  });
}
```

**数据来源链**:
1. `StaffModal.loadFromVariables()`
2. → `readGameData()` (`src/mhjg/utils/variableReader.ts:159`)
3. → `getGameMvuData()` (`src/mhjg/utils/variableReader.ts:75`)
4. → `Mvu.getMvuData({ type: 'message', message_id: 'latest' })` (`src/mhjg/utils/variableReader.ts:81`)
5. → `readGameData()` 中处理员工数据 (`src/mhjg/utils/variableReader.ts:394-405`)

**读取的变量位置**:
- **`Mvu.getMvuData({ type: 'message', message_id: 'latest' })`**
- 然后从 `stat_data.员工.员工列表` 读取员工数据

**显示的数据**:
- `gameData.staff` → `stat_data.员工.员工列表`
- 每个员工的字段：
  - `名称` → `stat_data.员工.员工列表[员工名].名称`
  - `种族` → `stat_data.员工.员工列表[员工名].种族`
  - `旅馆担任的职务` → `stat_data.员工.员工列表[员工名].旅馆担任的职务`
  - `战斗职业名` → `stat_data.员工.员工列表[员工名].战斗职业名`
  - `职业等级` → `stat_data.员工.员工列表[员工名].职业等级`
  - `外貌描述` → `stat_data.员工.员工列表[员工名].外貌描述`
  - `心情值` → `stat_data.员工.员工列表[员工名].心情值`
  - `对玩家的好感度` → `stat_data.员工.员工列表[员工名].对玩家的好感度`
  - `工作满意度` → `stat_data.员工.员工列表[员工名].工作满意度`
  - `工资` → `stat_data.员工.员工列表[员工名].工资`
  - `喜好` → `stat_data.员工.员工列表[员工名].喜好`
  - `厌恶` → `stat_data.员工.员工列表[员工名].厌恶`
  - `当前想法` → `stat_data.员工.员工列表[员工名].当前想法`

#### 2.4 客人部分 (GuestsModal)

**读取入口**: `src/mhjg/components/modals/GuestsModal.ts:70`
```typescript
public async loadFromVariables(): Promise<void> {
  const gameData = await readGameData();
  // 转换客人数据格式
  this.guests = gameData.guests.map((guest, index) => {
    // ... 处理客人数据
  });
}
```

**数据来源链**:
1. `GuestsModal.loadFromVariables()`
2. → `readGameData()` (`src/mhjg/utils/variableReader.ts:159`)
3. → `getGameMvuData()` (`src/mhjg/utils/variableReader.ts:75`)
4. → `Mvu.getMvuData({ type: 'message', message_id: 'latest' })` (`src/mhjg/utils/variableReader.ts:81`)
5. → `readGameData()` 中处理客人数据 (`src/mhjg/utils/variableReader.ts:347-392`)

**读取的变量位置**:
- **`Mvu.getMvuData({ type: 'message', message_id: 'latest' })`**
- 然后从 `stat_data.客人.客人列表` 读取客人数据

**显示的数据**:
- `gameData.guests` → `stat_data.客人.客人列表`
- 每个客人的字段：
  - `名称` → `stat_data.客人.客人列表[客人名].名称`
  - `种族` → `stat_data.客人.客人列表[客人名].种族`
  - `职业名` → `stat_data.客人.客人列表[客人名].职业名`
  - `职业等级` → `stat_data.客人.客人列表[客人名].职业等级`
  - `外貌描述` → `stat_data.客人.客人列表[客人名].外貌描述`
  - `心情值` → `stat_data.客人.客人列表[客人名].心情值`
  - `消费金额` → `stat_data.客人.客人列表[客人名].消费金额`
  - `当前想法` → `stat_data.客人.客人列表[客人名].当前想法`

---

### 3. 刷新时机

#### 3.1 事件监听

**位置**: `src/mhjg/index.ts:177-201`

**MESSAGE_RECEIVED 事件**:
```typescript
eventOn(tavern_events.MESSAGE_RECEIVED, async (message_id: number) => {
  // 延迟 200ms 刷新，确保 replaceMvuData 完成
  setTimeout(() => {
    refreshAllComponents();
  }, 200);
});
```

**MESSAGE_UPDATED 事件**:
```typescript
eventOn(tavern_events.MESSAGE_UPDATED, (message_id: number) => {
  // 延迟 100ms 刷新，确保数据完全写入
  setTimeout(() => {
    refreshAllComponents();
  }, 100);
});
```

**关键点**:
- `MESSAGE_RECEIVED` 可能在 `replaceMvuData` 完成之前触发，所以延迟 200ms
- `MESSAGE_UPDATED` 在 `replaceMvuData` 完成后触发，延迟 100ms 即可
- `refreshAllComponents()` 会刷新所有组件（TopBar、Dashboard、已打开的模态框）

---

## ✅ 结论

### 所有组件读取的数据位置

**统一数据源**: 所有 UI 组件（Dashboard、TopBar、StaffModal、GuestsModal）都通过以下路径读取数据：

1. `组件.loadFromVariables()`
2. → `readGameData()` 
3. → `getGameMvuData()`
4. → **`Mvu.getMvuData({ type: 'message', message_id: 'latest' })`**

### 关键发现

1. **数据读取位置**: 所有组件都读取**最新消息楼层**（`'latest'`）的变量
2. **数据更新位置**: `replaceMvuData` 更新的是**特定消息楼层**（`assistantMessageId`）的变量
3. **一致性**: 如果 `assistantMessageId` 就是最新楼层，并且 `replaceMvuData` 已完成，则读取的是更新后的数据
4. **时序问题**: 通过延迟刷新（200ms/100ms）确保 `replaceMvuData` 完成后再读取

### 潜在问题

1. **如果 `MESSAGE_RECEIVED` 在 `replaceMvuData` 完成之前触发**:
   - 虽然延迟了 200ms，但如果 `replaceMvuData` 执行时间超过 200ms，仍可能读取到旧数据
   - **建议**: 监听 `MESSAGE_UPDATED` 事件更可靠，因为它是在 `replaceMvuData` 完成后触发的

2. **如果最新楼层不是 `assistantMessageId`**:
   - 例如，如果用户在其他地方创建了新消息，`'latest'` 可能指向其他楼层
   - 这种情况下，读取的可能是其他楼层的变量，而不是更新后的变量
   - **建议**: 考虑使用 `assistantMessageId` 而不是 `'latest'`，但需要确保该楼层确实是最新的 assistant 消息

### 建议改进

1. **优先使用 `MESSAGE_UPDATED` 事件**: 这个事件在 `replaceMvuData` 完成后触发，更可靠
2. **考虑使用特定消息 ID**: 如果可能，使用 `assistantMessageId` 而不是 `'latest'`，确保读取的是更新后的数据
3. **添加数据验证**: 在读取数据后，验证数据是否是最新的（例如，检查时间戳或版本号）

