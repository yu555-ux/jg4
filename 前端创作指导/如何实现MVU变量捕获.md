# 如何实现 MVU 变量捕获指南

在太虚界（以及任何基于 MVU 架构的角色卡）中，实现前端实时捕获并显示 AI 修改的变量，主要遵循以下三个步骤。

## 1. 定义数据结构 (Schema)

首先，你需要在 `schema.ts` 中定义一个 Zod Schema。这个 Schema 是前端与 AI 之间的“协议”，它的键名必须与你在世界书中定义的变量名完全一致。

```typescript
export const Schema = z.object({
  世界信息: z.object({
    时间: z.object({
      年份: z.string().prefault('乾元元年'),
      时辰索引: z.coerce.number().prefault(3),
    }),
    // ... 其他字段
  }),
});
```

## 2. 编写捕获钩子 (useMvuData Hook)

为了在 React 中方便地使用这些变量，我们创建了一个自定义 Hook。它的核心逻辑如下：

- **获取源数据**：使用 `getVariables({ type: 'message', message_id: 'latest' })` 获取最新楼层的变量。
- **定位存储区**：MVU 框架通常将实时变量存在消息变量的 `stat_data` 字段中。
- **监听更新**：订阅酒馆的事件，确保数据是活的。

```typescript
export function useMvuData<T extends z.ZodTypeAny>(schema: T) {
  const [data, setData] = useState(() => {
    const variables = getVariables({ type: 'message', message_id: 'latest' });
    return schema.parse(variables?.stat_data || {});
  });

  useEffect(() => {
    const update = () => {
      const variables = getVariables({ type: 'message', message_id: 'latest' });
      const result = schema.safeParse(variables?.stat_data || {});
      if (result.success) setData(result.data);
    };

    const stops = [
      eventOn(tavern_events.MESSAGE_RECEIVED, update),
      eventOn(tavern_events.MESSAGE_UPDATED, update),
      // ... 其他必要事件
    ];
    return () => stops.forEach(s => s.stop());
  }, [schema]);

  return data;
}
```

## 3. 在组件中使用

在你的主组件（如 `App.tsx`）中调用这个 Hook，并将数据传递给子组件。

```tsx
const App = () => {
  const mvuData = useMvuData(Schema);
  const world = mvuData.世界信息;

  return (
    <Header 
      time={{ year: world.时间.年份, hourIndex: world.时间.时辰索引 }}
      erosion={world.侵蚀度}
    />
  );
};
```

## 注意事项

1. **类型一致性**：如果 Schema 中定义为 `z.coerce.number()`，确保 `initvar.yaml` 中初始值也是数字。
2. **事件监听**：除了 `MESSAGE_RECEIVED`，建议也监听 `PSEUDO_SAME_LAYER_UPDATE`（伪同层更新事件），以支持流式显示后的即时刷新。
3. **默认值**：使用 `.prefault()` 为 Schema 提供默认值，防止在对话刚开始、变量尚未生成时前端崩溃。
