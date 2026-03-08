# 游戏剧情交互流程指南

## 概述

本游戏使用 TavernHelper 的 `createChatMessages` 和 `/trigger` 命令来实现与 LLM 的交互。剧情内容通过聊天消息的形式展示，玩家通过点击选项来推进剧情。

## 核心函数

### 1. `createOpeningStory()`

**功能**：在开局选择完毕后，创建包含 `<maintext>` 和 `<option>` 的 assistant 消息。

**调用时机**：在 `NewGameSetup.handleConfirm()` 中，更新完游戏变量后调用。

**实现逻辑**：
1. 读取当前游戏状态（从 `stat_data` 变量）
2. 构建开局剧情文本（包含 `<maintext>` 和 `<option>` 标签）
3. 使用 `createChatMessages` 创建 assistant 消息
4. 消息会显示在聊天界面中

**示例消息格式**：
```
<maintext>
炉火在石砌的壁炉中噼啪作响，温暖的光芒驱散了夜晚的寒意。你站在虚空炉火旅店的大厅中央，环顾四周。

这里是艾尔利亚大陆，一个充满魔法与奇迹的世界。作为人类·退役冒险者，你刚刚接手了这家旅店。木质的吧台还散发着新漆的味道，几张圆桌散落在大厅中，等待着第一位客人的到来。

*是时候开始经营这家旅店了。*

你走到窗边，望向外面。夜色渐深，街道上偶尔有行人匆匆走过。远处传来酒馆的喧闹声，但这里——你的旅店——还是一片宁静。

*该做些什么呢？*
</maintext>

<option>
A. 开始故事。
</option>
```

### 2. `handlePlayerChoice(optionText: string)`

**功能**：处理玩家选择的选项，创建 user 消息并触发 LLM 回复。

**调用时机**：当玩家点击聊天界面中的选项时调用。

**实现逻辑**：
1. 使用 `createChatMessages` 创建 user 消息，内容是玩家选择的选项文本
2. 使用 `triggerSlash('/trigger')` 触发 LLM 生成回复
3. LLM 会根据提示词模板生成新的剧情（包含 `<maintext>`、`<option>`、`<sum>`、`<UpdateVariable>`）

**示例**：
```typescript
// 玩家点击了 "A. 开始故事。"
await handlePlayerChoice("A. 开始故事。");
// 这会创建一条 user 消息，然后触发 LLM 回复
```

## 交互流程

### 开局流程

1. 玩家完成开局设置（选择旅店名称、店主身份、世界、福利等）
2. `NewGameSetup.handleConfirm()` 被调用
3. 更新 `stat_data` 中的游戏变量
4. 调用 `createOpeningStory()` 创建开局剧情消息
5. 消息显示在聊天界面中，包含剧情文本和选项

### 游戏进行流程

1. 玩家在聊天界面中看到 assistant 消息，包含：
   - `<maintext>`：剧情文本
   - `<option>`：选项列表（A.、B.、C. 等）

2. 玩家点击某个选项

3. 系统调用 `handlePlayerChoice(optionText)`：
   - 创建 user 消息（内容是选项文本）
   - 调用 `/trigger` 触发 LLM 回复

4. LLM 根据提示词模板生成回复，包含：
   - `<maintext>`：新的剧情发展（500-1300字）
   - `<option>`：新的选项列表
   - `<sum>`：剧情总结
   - `<UpdateVariable>`：变量更新

5. 系统自动解析 `<UpdateVariable>` 并更新游戏变量

6. 游戏 UI 刷新，显示最新的游戏状态

7. 重复步骤 1-6，继续游戏

## 提示词模板

LLM 会根据 `src/mhjg/prompts/story_template.txt` 中的提示词模板生成剧情。

**关键要求**：
- `<maintext>` 必须 500-1300 字
- 必须包含对话、行为、行动、外界变化
- 必须体现玩家的选择和决定
- 必须以新的抉择节点结束
- `<option>` 必须基于新的抉择节点设计
- `<UpdateVariable>` 必须根据剧情实际变化更新变量

## 选项点击处理

选项应该可以直接在聊天界面中点击。可以通过以下方式实现：

### 方案1：使用消息监听器

在 assistant 消息创建后，使用 `message-on` 命令为选项添加点击事件：

```typescript
// 在创建 assistant 消息后
const lastMessageId = getLastMessageId();
await triggerSlash(`/message-on event=click callback={: /$ take=textContent {{target}} | /let optionText {{pipe}} | /send {{var::optionText}} | /trigger :} .option-button`);
```

### 方案2：使用正则表达式格式化

在角色卡中配置正则表达式，将选项格式化为可点击的按钮：

```
查找：<option>([\s\S]*?)</option>
替换：<div class="story-options">$1</div>
```

然后在 HTML 插件中处理 `.story-options` 内的选项点击。

### 方案3：使用宏注册

注册一个宏，将选项文本转换为可点击的按钮：

```typescript
registerMacroLike(
  /<option>([\s\S]*?)<\/option>/gi,
  (context, substring, content) => {
    const options = content.split('\n').filter(line => line.trim());
    const buttons = options.map(opt => 
      `<button class="story-option" data-option="${opt.trim()}">${opt.trim()}</button>`
    ).join('');
    return `<div class="story-options">${buttons}</div>`;
  }
);
```

## 变量更新处理

当 LLM 生成包含 `<UpdateVariable>` 的回复时，需要解析并执行变量更新。

可以通过以下方式实现：

1. **使用消息监听器**：监听 `MESSAGE_RECEIVED` 事件
2. **解析消息内容**：提取 `<UpdateVariable>` 标签内的内容
3. **执行更新**：使用 `triggerSlash` 执行变量更新语句

示例：
```typescript
eventOn(tavern_events.MESSAGE_RECEIVED, async (message_id: number) => {
  const messages = getChatMessages(message_id);
  const message = messages[0];
  if (message && message.message) {
    const updateVariable = parseUpdateVariable(message.message);
    if (updateVariable) {
      // 执行变量更新
      await triggerSlash(updateVariable);
    }
  }
});
```

## 注意事项

1. **消息格式**：必须严格按照 `<maintext>`、`<option>`、`<sum>`、`<UpdateVariable>` 的格式输出
2. **选项格式**：选项使用 A.、B.、C. 等字母标识，每个选项一行
3. **变量更新**：所有变量路径必须加上 `[0]` 后缀
4. **错误处理**：如果 LLM 没有按照格式输出，需要提示用户或重试
5. **状态同步**：每次收到新消息后，需要刷新游戏 UI 以反映最新的变量状态

## 相关文件

- `src/mhjg/utils/storyInteraction.ts` - 交互管理器
- `src/mhjg/prompts/story_template.txt` - 提示词模板
- `src/mhjg/components/NewGameSetup.ts` - 开局设置组件
- `src/mhjg/variables/[InitVar]初始变量.json` - 变量定义

