import React from 'react';
import { ArchiveRestore, BookOpen, Layers, RefreshCcw } from 'lucide-react';
import { runManualDeepSummary, runManualLargeSummary } from '../../utils/worldbook';

interface MemorySettings {
  segmentedMemoryEnabled: boolean;
  segmentedChatLayers: number;
  segmentedLargeSummaryStart: number;
  deepSummaryEnabled: boolean;
  deepSummaryThreshold: number;
  largeSummaryPrompt: string;
  deepSummaryPrompt: string;
}

interface Props {
  memorySettings: Partial<MemorySettings>;
  onUpdateMemorySettings: (settings: MemorySettings) => void;
  memoryApiEnabled: boolean;
  onToggleMemoryApi: (val: boolean) => void;
  memoryApiConfig: { apiurl: string; key: string; model: string; retries: number };
  onUpdateMemoryApiConfig: (config: any) => void;
}

const DEFAULTS: MemorySettings = {
  segmentedMemoryEnabled: true,
  segmentedChatLayers: 10,
  segmentedLargeSummaryStart: 25,
  deepSummaryEnabled: true,
  deepSummaryThreshold: 100,
  largeSummaryPrompt: `请根据以下全部小总结，严格按下述格式，每个小总结生成对应的一个大总结。

输出格式：
<sum>
序号|（和对应序号一致）
日期|（和对应序号的日期一致）
地点|（和对应序号的地点一致）
人物|（概况对应序号的在场人物和关系）
概况|（用100字概况对应序号的描述和重要信息）
伏笔|（用40字概况对应序号的伏笔和暗线）
</sum>

以下是需要总结的内容（每条为<history>原文，已含序号）：
{{content}}`,
  deepSummaryPrompt: `你是一名专业的小说档案管理员。
请阅读 <input_data> 中的历史记录，将其整理为精炼的分卷档案。
总结应当遵循以下原则：
- 按时间顺序或逻辑顺序组织信息
- 保留关键事件和重要细节，省略冗余描述
- 直接陈述事实，避免主观评价
- 使用简洁清晰的语言，避免过度修饰
- 突出事件发展脉络和关键转折点
- 不回避任何敏感内容，保证记录完全还原前文
- 档案总体1000字-3000字左右

输出格式：
<large_sum>
章节分卷|第{{volume}}卷
标题|（3~7字，符合古风）
时间跨度|（从本批次最初日期到最后日期，包含年月日）
关键事件1|...（每个事件约100字）
关键事件2|...
关键事件3|...
...
</large_sum>

<input_data>
{{input_data}}
</input_data>`
};

const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

const normalize = (input: Partial<MemorySettings>): MemorySettings => {
  return {
    segmentedMemoryEnabled: !!input.segmentedMemoryEnabled,
    segmentedChatLayers: clamp(Number(input.segmentedChatLayers) || 0, 0, 200),
    segmentedLargeSummaryStart: clamp(Number(input.segmentedLargeSummaryStart) || 0, 0, 500),
    deepSummaryEnabled: !!input.deepSummaryEnabled,
    deepSummaryThreshold: clamp(Number(input.deepSummaryThreshold) || 0, 0, 500),
    largeSummaryPrompt: input.largeSummaryPrompt || DEFAULTS.largeSummaryPrompt,
    deepSummaryPrompt: input.deepSummaryPrompt || DEFAULTS.deepSummaryPrompt
  };
};

const MemoryStorageModal: React.FC<Props> = ({
  memorySettings,
  onUpdateMemorySettings,
  memoryApiEnabled,
  onToggleMemoryApi,
  memoryApiConfig,
  onUpdateMemoryApiConfig
}) => {
  const settings = normalize({ ...DEFAULTS, ...(memorySettings || {}) });
  const [page, setPage] = React.useState<'settings' | 'api'>('settings');
  const hasModelList = typeof getModelList === 'function';
  const [isFetchingModels, setIsFetchingModels] = React.useState(false);
  const [modelOptions, setModelOptions] = React.useState<string[]>([]);
  const [connectStatus, setConnectStatus] = React.useState('未测试');
  const [outputStatus, setOutputStatus] = React.useState('未测试');
  const [currentFloor, setCurrentFloor] = React.useState<number | null>(null);

  const update = (patch: Partial<MemorySettings>) => {
    onUpdateMemorySettings(normalize({ ...settings, ...patch }));
  };

  React.useEffect(() => {
    try {
      const getter = (window as any).getLastMessageId;
      if (typeof getter === 'function') {
        const lastId = getter();
        if (typeof lastId === 'number' && lastId >= 0) {
          setCurrentFloor(Math.floor(lastId / 2));
        }
      }
    } catch {
    }
  }, [page, settings.segmentedLargeSummaryStart]);

  const nextLargeSummaryIn = React.useMemo(() => {
    const interval = Number(settings.segmentedLargeSummaryStart) || 0;
    if (!interval || currentFloor === null) return null;
    const mod = currentFloor % interval;
    return mod === 0 ? 0 : interval - mod;
  }, [currentFloor, settings.segmentedLargeSummaryStart]);

  const nextDeepSummaryIn = React.useMemo(() => {
    const interval = Number(settings.deepSummaryThreshold) || 0;
    if (!interval || currentFloor === null) return null;
    const mod = currentFloor % interval;
    return mod === 0 ? 0 : interval - mod;
  }, [currentFloor, settings.deepSummaryThreshold]);

  const updateApi = (patch: Partial<{ apiurl: string; key: string; model: string; retries: number }>) => {
    onUpdateMemoryApiConfig({ ...memoryApiConfig, ...patch });
  };

  const getStatusTone = (value: string) => {
    if (value.includes('成功')) return 'success';
    if (value.includes('失败') || value.includes('异常')) return 'error';
    return 'idle';
  };

  const normalizeApiUrl = (raw: string) => {
    const trimmed = (raw || '').trim();
    if (!trimmed) return '';
    if (/\/v1\/?$/.test(trimmed)) return trimmed.replace(/\/$/, '');
    return `${trimmed.replace(/\/$/, '')}/v1`;
  };

  const buildCustomApi = () => {
    const apiurl = normalizeApiUrl(memoryApiConfig.apiurl || '');
    if (!apiurl || !memoryApiConfig.model) return null;
    return {
      apiurl,
      key: memoryApiConfig.key?.trim(),
      model: memoryApiConfig.model,
      source: 'openai'
    };
  };

  const handleFetchModels = async () => {
    const normalizedUrl = normalizeApiUrl(memoryApiConfig.apiurl || '');
    if (!normalizedUrl) {
      setOutputStatus('未测试');
      return;
    }
    setIsFetchingModels(true);
    try {
      let list: string[] = [];
      if (hasModelList) {
        list = await getModelList({ apiurl: normalizedUrl, key: memoryApiConfig.key?.trim() });
      } else {
        const headers: Record<string, string> = {};
        const key = memoryApiConfig.key?.trim();
        if (key) headers.Authorization = `Bearer ${key}`;
        const resp = await fetch(`${normalizedUrl.replace(/\/$/, '')}/models`, { headers });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (Array.isArray(data?.data)) {
          list = data.data.map((item: any) => item?.id).filter(Boolean);
        } else if (Array.isArray(data?.models)) {
          list = data.models.map((item: any) => item?.id || item?.name).filter(Boolean);
        } else if (Array.isArray(data)) {
          list = data.map((item: any) => item?.id || item?.name || item).filter(Boolean);
        }
      }
      setModelOptions(list || []);
      if (normalizedUrl !== memoryApiConfig.apiurl.trim()) {
        updateApi({ apiurl: normalizedUrl });
      }
      setConnectStatus('已获取模型');
    } catch {
      setConnectStatus('获取失败');
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleTestConnection = async () => {
    const normalizedUrl = normalizeApiUrl(memoryApiConfig.apiurl || '');
    if (!normalizedUrl) {
      setConnectStatus('未测试');
      return;
    }
    try {
      if (normalizedUrl !== memoryApiConfig.apiurl.trim()) {
        updateApi({ apiurl: normalizedUrl });
      }
      const headers: Record<string, string> = {};
      const key = memoryApiConfig.key?.trim();
      if (key) headers.Authorization = `Bearer ${key}`;
      const resp = await fetch(`${normalizedUrl.replace(/\/$/, '')}/models`, { headers });
      setConnectStatus(resp.ok ? '连接成功' : `失败(${resp.status})`);
    } catch {
      setConnectStatus('连接失败');
    }
  };

  const handleTestOutput = async () => {
    const customApi = buildCustomApi();
    if (!customApi) {
      setOutputStatus('未测试');
      return;
    }
    try {
      if (customApi.apiurl !== memoryApiConfig.apiurl.trim()) {
        updateApi({ apiurl: customApi.apiurl });
      }
      const raw = await generateRaw({
        user_input: '请输出一个 <sum> 测试结果。\n<sum>\n序号|0\n日期|测试\n地点|测试\n人物|测试\n概况|测试\n伏笔|测试\n</sum>',
        ordered_prompts: ['user_input'],
        custom_api: customApi
      });
      const ok = typeof raw === 'string' && raw.includes('<sum>');
      setOutputStatus(ok ? '输出成功' : '输出异常');
    } catch {
      setOutputStatus('输出失败');
    }
  };

  const handleManualLargeSummary = async () => {
    try {
      const result = await runManualLargeSummary({
        settings,
        apiEnabled: memoryApiEnabled,
        apiConfig: memoryApiConfig
      });
      if (result?.updated) {
        toastr.success('历史总结已全部压缩');
      } else if (!result?.skipped) {
        toastr.error('历史压缩失败');
      }
    } catch {
      toastr.error('历史压缩失败');
    }
  };

  const handleManualDeepSummary = async () => {
    try {
      const result = await runManualDeepSummary({
        settings,
        apiEnabled: memoryApiEnabled,
        apiConfig: memoryApiConfig
      });
      if (result?.updated) {
        toastr.success('章节分卷已完成并写入历史记录');
      } else if (!result?.skipped) {
        toastr.error('章节分卷失败');
      }
    } catch {
      toastr.error('章节分卷失败');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 bg-white/60 border border-emerald-100 rounded-full p-1">
        <button
          onClick={() => setPage('settings')}
          className={`flex-1 px-3 py-2 rounded-full text-xs font-black transition-all ${
            page === 'settings' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-emerald-600'
          }`}
        >
          记忆参数
        </button>
        <button
          onClick={() => setPage('api')}
          className={`flex-1 px-3 py-2 rounded-full text-xs font-black transition-all ${
            page === 'api' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-emerald-600'
          }`}
        >
          API配置
        </button>
      </div>

      {page === 'settings' && (
        <>
          <div className="p-4 bg-white/40 border border-emerald-400/90 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArchiveRestore className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-slate-800">历史压缩</span>
              </div>
              <div className="flex bg-emerald-50/50 p-1 rounded-full border border-emerald-100">
                <button
                  onClick={() => update({ segmentedMemoryEnabled: true })}
                  className={`px-2 py-1 rounded-full text-[10px] font-black transition-all ${
                    settings.segmentedMemoryEnabled ? 'bg-emerald-500 text-white' : 'text-emerald-300 hover:text-emerald-500'
                  }`}
                >
                  启用
                </button>
                <button
                  onClick={() => update({ segmentedMemoryEnabled: false })}
                  className={`px-2 py-1 rounded-full text-[10px] font-black transition-all ${
                    !settings.segmentedMemoryEnabled ? 'bg-slate-500 text-white' : 'text-slate-300 hover:text-slate-500'
                  }`}
                >
                  关闭
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              按间隔自动压缩历史记录，防止“历史记录”无限膨胀。
            </p>
            <p className="text-[10px] text-slate-400">
              N = 序号 = messageId / 2
            </p>
            <NumberField
              label="历史压缩触发间隔"
              value={settings.segmentedLargeSummaryStart}
              min={0}
              max={500}
              hint="当序号为 N 的倍数且 > 0 时触发"
              onChange={(val) => update({ segmentedLargeSummaryStart: val })}
              disabled={!settings.segmentedMemoryEnabled}
            />
            <div className="flex items-center justify-end">
              <button
                onClick={handleManualLargeSummary}
                disabled={!settings.segmentedMemoryEnabled}
                className="px-3 py-1 text-[10px] font-black rounded-full border border-emerald-100 bg-white/70 text-emerald-700 hover:bg-emerald-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                手动触发历史压缩
              </button>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>当前序号：{currentFloor === null ? '未知' : currentFloor}</span>
              <span>
                距离下次压缩：
                {nextLargeSummaryIn === null ? '未知' : `${nextLargeSummaryIn} 次`}
              </span>
            </div>
          </div>

          <div className="p-4 bg-white/40 border border-emerald-400/90 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-slate-800">章节分卷</span>
              </div>
              <div className="flex bg-emerald-50/50 p-1 rounded-full border border-emerald-100">
                <button
                  onClick={() => update({ deepSummaryEnabled: true })}
                  className={`px-2 py-1 rounded-full text-[10px] font-black transition-all ${
                    settings.deepSummaryEnabled ? 'bg-emerald-500 text-white' : 'text-emerald-300 hover:text-emerald-500'
                  }`}
                >
                  启用
                </button>
                <button
                  onClick={() => update({ deepSummaryEnabled: false })}
                  className={`px-2 py-1 rounded-full text-[10px] font-black transition-all ${
                    !settings.deepSummaryEnabled ? 'bg-slate-500 text-white' : 'text-slate-300 hover:text-slate-500'
                  }`}
                >
                  关闭
                </button>
              </div>
            </div>
            <NumberField
              label="章节分卷触发间隔"
              value={settings.deepSummaryThreshold}
              min={0}
              max={500}
              hint="当序号为 N 的倍数且 > 0 时触发"
              onChange={(val) => update({ deepSummaryThreshold: val })}
              disabled={!settings.deepSummaryEnabled}
            />
            <div className="flex items-center justify-end">
              <button
                onClick={handleManualDeepSummary}
                disabled={!settings.deepSummaryEnabled}
                className="px-3 py-1 text-[10px] font-black rounded-full border border-emerald-100 bg-white/70 text-emerald-700 hover:bg-emerald-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                手动触发章节分卷
              </button>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>当前序号：{currentFloor === null ? '未知' : currentFloor}</span>
              <span>
                距离下次分卷：
                {nextDeepSummaryIn === null ? '未知' : `${nextDeepSummaryIn} 次`}
              </span>
            </div>
          </div>

          <div className="p-4 bg-white/40 border border-emerald-400/90 rounded-2xl space-y-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-bold text-slate-800">完整保留楼层</span>
            </div>
            <NumberField
              label="完整保留楼层"
              value={settings.segmentedChatLayers}
              min={0}
              max={200}
              hint="最近N个序号保留原始<history>"
              onChange={(val) => update({ segmentedChatLayers: val })}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-emerald-50/60 border border-emerald-400/90 rounded-2xl">
            <div className="text-[11px] text-emerald-700">
              默认值：保留 10 层 / 历史压缩间隔 25 / 章节分卷间隔 100
            </div>
            <button
              onClick={() => onUpdateMemorySettings(DEFAULTS)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-black rounded-full bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 transition"
            >
              <RefreshCcw className="w-3 h-3" />
              恢复默认
            </button>
          </div>

          <div className="p-4 bg-white/40 border border-emerald-400/90 rounded-2xl space-y-2">
            <div className="text-sm font-bold text-slate-800">历史压缩预设</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              用于批量压缩指定区间的历史记录。支持占位符：
              <code className="mx-1 px-1 rounded bg-emerald-50 text-emerald-700">{'{{content}}'}</code>
              （前端会把多个序号的&lt;history&gt;合并后填入）
            </p>
            <textarea
              value={settings.largeSummaryPrompt}
              onChange={(e) => update({ largeSummaryPrompt: e.target.value })}
              rows={8}
              className="w-full text-xs font-mono text-slate-700 bg-white/70 border border-emerald-100 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div className="p-4 bg-white/40 border border-emerald-400/90 rounded-2xl space-y-2">
            <div className="text-sm font-bold text-slate-800">章节分卷预设</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              用于将多个小总结合并为“章节分卷”。支持占位符：
              <code className="mx-1 px-1 rounded bg-emerald-50 text-emerald-700">{'{{input_data}}'}</code>
              <code className="mx-1 px-1 rounded bg-emerald-50 text-emerald-700">{'{{volume}}'}</code>
            </p>
            <textarea
              value={settings.deepSummaryPrompt}
              onChange={(e) => update({ deepSummaryPrompt: e.target.value })}
              rows={10}
              className="w-full text-xs font-mono text-slate-700 bg-white/70 border border-emerald-100 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
        </>
      )}

      {page === 'api' && (
        <div className="space-y-4">
          <div className="p-4 bg-white/40 border border-emerald-400/90 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-slate-800">大总结 API</span>
              </div>
              <div className="flex bg-emerald-50/50 p-1 rounded-full border border-emerald-100">
                <button
                  onClick={() => onToggleMemoryApi(true)}
                  className={`px-2 py-1 rounded-full text-[10px] font-black transition-all ${
                    memoryApiEnabled ? 'bg-emerald-500 text-white' : 'text-emerald-300 hover:text-emerald-500'
                  }`}
                >
                  启用
                </button>
                <button
                  onClick={() => onToggleMemoryApi(false)}
                  className={`px-2 py-1 rounded-full text-[10px] font-black transition-all ${
                    !memoryApiEnabled ? 'bg-slate-500 text-white' : 'text-slate-300 hover:text-slate-500'
                  }`}
                >
                  关闭
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              开启后，按间隔触发的大总结会使用独立第三 API 后台生成。
            </p>
          </div>

          <div className="p-4 bg-white/30 border border-emerald-400/90 rounded-2xl space-y-3 backdrop-blur-md">
            <div className="text-xs font-bold text-emerald-700 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              大总结 API 配置
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">API URL（OpenAI兼容）</label>
                <input
                  className="w-full px-2.5 py-2 text-xs rounded-xl border border-emerald-100 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="https://api.openai.com/v1 或 https://your-proxy/v1"
                  value={memoryApiConfig.apiurl}
                  onChange={e => updateApi({ apiurl: e.target.value })}
                  onBlur={e => updateApi({ apiurl: normalizeApiUrl(e.target.value) })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">API Key</label>
                <input
                  type="password"
                  className="w-full px-2.5 py-2 text-xs rounded-xl border border-emerald-100 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="sk-..."
                  value={memoryApiConfig.key}
                  onChange={e => updateApi({ key: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">模型</label>
                <input
                  className="w-full px-2.5 py-2 text-xs rounded-xl border border-emerald-100 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="gpt-4o-mini"
                  value={memoryApiConfig.model}
                  onChange={e => updateApi({ model: e.target.value })}
                />
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{hasModelList ? '支持拉取模型列表' : ''}</span>
                  <button
                    onClick={handleFetchModels}
                    className="px-2 py-1 rounded-lg border border-emerald-100 bg-white/60 text-emerald-700 hover:bg-emerald-50 transition-colors"
                    disabled={isFetchingModels}
                  >
                    {isFetchingModels ? '获取中...' : '获取可用模型'}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">最大重试 (0-10)</label>
                <input
                  type="number"
                  className="w-full px-2.5 py-2 text-xs rounded-xl border border-emerald-100 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  min={0}
                  max={10}
                  value={Number(memoryApiConfig.retries || 0)}
                  onChange={e => updateApi({ retries: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })}
                />
              </div>
              {modelOptions.length > 0 && (
                <div className="max-h-36 overflow-y-auto rounded-xl border border-emerald-100 bg-white/70 custom-scrollbar">
                  {modelOptions.map(model => (
                    <button
                      key={model}
                      onClick={() => updateApi({ model })}
                      className={`w-full text-left px-3 py-2 text-xs border-b border-emerald-50 transition-colors ${
                        model === memoryApiConfig.model ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-emerald-50'
                      }`}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleTestConnection}
                  className="px-3 py-2 rounded-xl border border-emerald-100 bg-white/60 text-emerald-700 font-black text-xs hover:bg-emerald-50 transition-colors"
                >
                  尝试连接
                </button>
                <button
                  onClick={handleTestOutput}
                  className="px-3 py-2 rounded-xl border border-emerald-100 bg-white/60 text-emerald-700 font-black text-xs hover:bg-emerald-50 transition-colors"
                >
                  测试输出
                </button>
              </div>
              <div className="space-y-1 text-[10px] text-slate-500">
                <div>
                  连接状态：
                  <span
                    className={`ml-1 font-bold ${
                      getStatusTone(connectStatus) === 'success'
                        ? 'text-emerald-600'
                        : getStatusTone(connectStatus) === 'error'
                          ? 'text-rose-500'
                          : 'text-slate-400'
                    }`}
                  >
                    {connectStatus}
                  </span>
                </div>
                <div>
                  输出状态：
                  <span
                    className={`ml-1 font-bold ${
                      getStatusTone(outputStatus) === 'success'
                        ? 'text-emerald-600'
                        : getStatusTone(outputStatus) === 'error'
                          ? 'text-rose-500'
                          : 'text-slate-400'
                    }`}
                  >
                    {outputStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const NumberField: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  hint: string;
  onChange: (val: number) => void;
  disabled?: boolean;
}> = ({ label, value, min, max, hint, onChange, disabled }) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex flex-col">
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
      <span className="text-[10px] text-slate-400">{hint}</span>
    </div>
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value || 0), min, max))}
        className="w-20 text-right px-2 py-1 rounded-lg border border-emerald-100 bg-white/70 text-sm font-mono text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={disabled}
      />
    </div>
  </div>
);

const ApiField: React.FC<{
  label: string;
  value: string;
  placeholder?: string;
  isSecret?: boolean;
  onChange: (val: string) => void;
}> = ({ label, value, placeholder, isSecret, onChange }) => (
  <div className="space-y-1">
    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    <input
      type={isSecret ? 'password' : 'text'}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-xl border border-emerald-100 bg-white/70 text-sm text-slate-700 font-mono"
    />
  </div>
);

export default MemoryStorageModal;
