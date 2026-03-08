import React, { useState } from 'react';
import React, { useState } from 'react';
import toastr from 'toastr';
import { listWorldbookEntryNames } from '../../utils/worldbook';

type PresetRule = {
  id: string;
  name: string;
  content: string;
  enabled?: boolean;
  triggerMode?: string;
  keywords?: string[];
  depth?: number;
  role?: string;
  group?: string;
};

interface ApiModeModalProps {
  multiApiEnabled: boolean;
  onToggleMultiApi: (val: boolean) => void;
  multiApiConfig: {
    apiurl: string;
    key: string;
    model: string;
    retries: number;
    promptTemplate?: string;
    worldbookRefs?: string[];
    presetRules?: PresetRule[];
  };
  onUpdateMultiApiConfig: (config: any) => void;
  shopApiConfig: {
    apiurl: string;
    key: string;
    model: string;
    retries: number;
  };
  onUpdateShopApiConfig: (config: any) => void;
  luckApiConfig: {
    apiurl: string;
    key: string;
    model: string;
    retries: number;
  };
  onUpdateLuckApiConfig: (config: any) => void;
}

const ApiModeModal: React.FC<ApiModeModalProps> = ({
  multiApiEnabled,
  onToggleMultiApi,
  multiApiConfig,
  onUpdateMultiApiConfig,
  shopApiConfig,
  onUpdateShopApiConfig,
  luckApiConfig,
  onUpdateLuckApiConfig
}) => {
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [outputStatus, setOutputStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [outputMessage, setOutputMessage] = useState('');
  const [secondApiOpen, setSecondApiOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [shopApiOpen, setShopApiOpen] = useState(false);
  const [luckApiOpen, setLuckApiOpen] = useState(false);
  const [isTestingShopApi, setIsTestingShopApi] = useState(false);
  const [isFetchingShopModels, setIsFetchingShopModels] = useState(false);
  const [shopModelOptions, setShopModelOptions] = useState<string[]>([]);
  const [shopConnectionStatus, setShopConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [shopConnectionMessage, setShopConnectionMessage] = useState('');
  const [shopOutputStatus, setShopOutputStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [shopOutputMessage, setShopOutputMessage] = useState('');
  const [isTestingLuckApi, setIsTestingLuckApi] = useState(false);
  const [isFetchingLuckModels, setIsFetchingLuckModels] = useState(false);
  const [luckModelOptions, setLuckModelOptions] = useState<string[]>([]);
  const [luckConnectionStatus, setLuckConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [luckConnectionMessage, setLuckConnectionMessage] = useState('');
  const [luckOutputStatus, setLuckOutputStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [luckOutputMessage, setLuckOutputMessage] = useState('');
  const importPresetInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isFetchingWorldbook, setIsFetchingWorldbook] = useState(false);
  const [worldbookOptions, setWorldbookOptions] = useState<string[]>([]);
  const [worldbookSelections, setWorldbookSelections] = useState<Record<number, string[]>>({});
  const [worldbookPanelOpen, setWorldbookPanelOpen] = useState<Record<number, boolean>>({});
  const [worldbookPickerOpen, setWorldbookPickerOpen] = useState<Record<number, boolean>>({});
  const [worldbookSearch, setWorldbookSearch] = useState<Record<number, string>>({});
  const [presetGroupOpen, setPresetGroupOpen] = useState<Record<string, boolean>>({});
  const hasModelList = typeof getModelList === 'function';


  const normalizeApiUrl = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (/\/v1\/?$/.test(trimmed)) return trimmed.replace(/\/$/, '');
    return `${trimmed.replace(/\/$/, '')}/v1`;
  };

  const updateMultiApi = (patch: Partial<ApiModeModalProps['multiApiConfig']>) => {
    onUpdateMultiApiConfig({ ...multiApiConfig, ...patch });
  };
  const updateShopApi = (patch: Partial<ApiModeModalProps['shopApiConfig']>) => {
    onUpdateShopApiConfig({ ...shopApiConfig, ...patch });
  };
  const updateLuckApi = (patch: Partial<ApiModeModalProps['luckApiConfig']>) => {
    onUpdateLuckApiConfig({ ...luckApiConfig, ...patch });
  };

  const buildVariablePreset = () => {
    const rules = Array.isArray(multiApiConfig.presetRules)
      ? multiApiConfig.presetRules
      : [
        {
          id: 'rule_variable_update_template',
          name: '变量更新模板',
          content: multiApiConfig.promptTemplate || '',
          enabled: true,
          triggerMode: 'blue',
          keywords: [],
          depth: 5,
          role: 'user'
        }
      ];
    return [
      {
        id: 'builtin_variable_update_v1',
        name: '变量更新-第二API提示词预设',
        description: '用于第二API执行变量更新的提示词模板，支持占位符与世界书引用。',
        is_builtin: true,
        created_at: new Date().toISOString(),
        rules,
        worldbook_refs: multiApiConfig.worldbookRefs || []
      }
    ];
  };

  const handleExportVariablePreset = () => {
    try {
      const preset = buildVariablePreset();
      const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '变量更新预设.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toastr.success('预设已导出');
    } catch (e: any) {
      toastr.error(`导出失败: ${e?.message || '未知错误'}`);
    }
  };

  const applyVariablePreset = (preset: any) => {
    const record = Array.isArray(preset) ? preset[0] : preset;
    const rules = Array.isArray(record?.rules) ? record.rules : [];
    const promptTemplate = rules
      .filter((rule: any) => rule && (rule.enabled ?? true))
      .map((rule: any) => String(rule.content || '').trim())
      .filter(Boolean)
      .join('\n\n');
    const worldbookRefs = Array.isArray(record?.worldbook_refs)
      ? record.worldbook_refs.map((v: any) => String(v).trim()).filter(Boolean)
      : [];
    updateMultiApi({ promptTemplate, worldbookRefs, presetRules: rules });
  };

  const getRuleGroup = (rule: PresetRule) => {
    if (rule.group) return rule.group;
    const name = rule.name || '';
    if (['身份与任务', '故事背景参考', '数值基准参考', '游戏剧情'].includes(name)) {
      return '核心规则';
    }
    if (name.includes('MVU')) return 'MVU变量更新';
    return '其他规则';
  };

  const extractWorldbookRefs = (content?: string) => {
    if (!content) return [] as string[];
    const matches = content.match(/\{worldbook:([^}]+)\}/g);
    if (!matches) return [] as string[];
    return Array.from(new Set(matches.map(m => m.replace(/^\{worldbook:/, '').replace(/\}$/, '').trim()).filter(Boolean)));
  };

  const presetRules = Array.isArray(multiApiConfig.presetRules) ? multiApiConfig.presetRules : [];
  const enabledCount = presetRules.filter(rule => rule && (rule.enabled ?? true)).length;
  const worldbookRuleMap = presetRules.reduce<Record<string, PresetRule>>((acc, rule) => {
    const name = (rule?.name || '').trim();
    if (!name.includes('世界书')) return acc;
    const baseName = name.replace(/-?世界书$/, '').trim();
    if (baseName) acc[baseName] = rule;
    return acc;
  }, {});
  const groupedRules = presetRules.reduce<Record<string, Array<{ rule: PresetRule; index: number }>>>((acc, rule, index) => {
    const key = getRuleGroup(rule);
    if (!acc[key]) acc[key] = [];
    acc[key].push({ rule, index });
    return acc;
  }, {});

  const updateRule = (index: number, patch: Partial<PresetRule>) => {
    const next = [...presetRules];
    next[index] = { ...next[index], ...patch };
    updateMultiApi({ presetRules: next });
  };

  const refreshWorldbookOptions = async () => {
    setIsFetchingWorldbook(true);
    try {
      const names = await listWorldbookEntryNames();
      setWorldbookOptions(names || []);
      if (!names || names.length === 0) {
        toastr.warning('\u672a\u8bfb\u53d6\u5230\u89d2\u8272\u5361\u7ed1\u5b9a\u7684\u4e16\u754c\u4e66\u6761\u76ee');
      } else {
        toastr.success(`\u5df2\u8bfb\u53d6 ${names.length} \u6761\u4e16\u754c\u4e66\u6761\u76ee`);
      }
    } catch (e: any) {
      toastr.error(`\u8bfb\u53d6\u4e16\u754c\u4e66\u5931\u8d25: ${e?.message || '\u672a\u77e5\u9519\u8bef'}`);
    } finally {
      setIsFetchingWorldbook(false);
    }
  };

  const appendWorldbookToRule = (ruleIndex: number, entryNames: string[]) => {
    const names = (entryNames || []).map(v => v.trim()).filter(Boolean);
    if (names.length === 0) return;
    const placeholders = names.map(name => `{worldbook:${name}}`);
    const current = presetRules[ruleIndex]?.content || '';
    const nextContent = current.trim()
      ? current + '\n' + placeholders.join('\n')
      : placeholders.join('\n');
    updateRule(ruleIndex, { content: nextContent });
    const nextRefs = Array.from(new Set([...(multiApiConfig.worldbookRefs || []), ...names]));
    updateMultiApi({ worldbookRefs: nextRefs });
  };

  const upsertWorldbookRule = (ruleIndex: number, entryNames: string[]) => {
    const names = (entryNames || []).map(v => v.trim()).filter(Boolean);
    const ruleName = (presetRules[ruleIndex]?.name || '').trim();
    if (!ruleName) return;
    const baseName = ruleName.replace(/-?要求$/, '');
    if (!baseName) return;
    const worldbookRuleName = `${baseName}-世界书`;
    const next = [...presetRules];
    const existingIndex = next.findIndex(item => (item?.name || '') === worldbookRuleName);
    if (names.length === 0) {
      if (existingIndex !== -1) {
        next.splice(existingIndex, 1);
        updateMultiApi({ presetRules: next });
      }
      return;
    }
    const placeholders = names.map(name => `{worldbook:${name}}`);
    if (existingIndex !== -1) {
      const existing = next[existingIndex];
      const merged = Array.from(new Set([...names]));
      const mergedContent = merged.map(name => `{worldbook:${name}}`).join('\n');
      next[existingIndex] = {
        ...existing,
        content: mergedContent
      };
      if (existingIndex !== ruleIndex + 1) {
        const [moved] = next.splice(existingIndex, 1);
        next.splice(ruleIndex + 1, 0, moved);
      }
    } else {
      next.splice(ruleIndex + 1, 0, {
        id: `rule_${baseName}_worldbook_${Date.now()}`,
        name: worldbookRuleName,
        content: placeholders.join('\n'),
        enabled: true,
        triggerMode: 'blue',
        keywords: [],
        depth: 5,
        role: 'user',
        group: presetRules[ruleIndex]?.group
      });
    }
    const nextRefs = Array.from(new Set([...(multiApiConfig.worldbookRefs || []), ...names]));
    updateMultiApi({ presetRules: next, worldbookRefs: nextRefs });
  };


  React.useEffect(() => {
    if (presetRules.length > 0) return;
    const legacy = (multiApiConfig.promptTemplate || '').trim();
    if (!legacy) return;
    updateMultiApi({
      presetRules: [
        {
          id: 'rule_variable_update_template',
          name: '变量更新模板',
          content: legacy,
          enabled: true,
          triggerMode: 'blue',
          keywords: [],
          depth: 5,
          role: 'user'
        }
      ]
    });
  }, [multiApiConfig.promptTemplate, presetRules.length]);

  const handleImportVariablePreset = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || ''));
        applyVariablePreset(data);
        toastr.success('预设已导入');
      } catch (e: any) {
        toastr.error(`导入失败: ${e?.message || '文件格式错误'}`);
      }
    };
    reader.readAsText(file, 'utf-8');
  };
  const handleTestConnection = async () => {
    const normalizedUrl = normalizeApiUrl(multiApiConfig.apiurl || '');
    if (!normalizedUrl) {
      toastr.warning('请先填写 API URL');
      return;
    }
    setIsTestingApi(true);
    setConnectionStatus('idle');
    setConnectionMessage('测试中...');
    try {
      if (normalizedUrl !== multiApiConfig.apiurl.trim()) {
        updateMultiApi({ apiurl: normalizedUrl });
      }
      await generateRaw({
        user_input: 'ping',
        ordered_prompts: ['user_input'],
        custom_api: {
          apiurl: normalizedUrl,
          key: multiApiConfig.key?.trim(),
          model: multiApiConfig.model || 'gpt-4o-mini',
          source: 'openai'
        }
      });
      setConnectionStatus('success');
      setConnectionMessage('连接正常');
      toastr.success('连接测试成功');
    } catch (e: any) {
      setConnectionStatus('error');
      setConnectionMessage(e.message || '未知错误');
      toastr.error(`连接测试失败: ${e.message || '未知错误'}`);
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleTestOutput = async () => {
    const normalizedUrl = normalizeApiUrl(multiApiConfig.apiurl || '');
    if (!normalizedUrl) {
      toastr.warning('请先填写 API URL');
      return;
    }
    setOutputStatus('idle');
    setOutputMessage('测试中...');
    try {
      if (normalizedUrl !== multiApiConfig.apiurl.trim()) {
        updateMultiApi({ apiurl: normalizedUrl });
      }
      await generateRaw({
        user_input: '请输出“测试通过”四个字，不要输出其他内容。',
        ordered_prompts: ['user_input'],
        custom_api: {
          apiurl: normalizedUrl,
          key: multiApiConfig.key?.trim(),
          model: multiApiConfig.model || 'gpt-4o-mini',
          source: 'openai'
        }
      });
      setOutputStatus('success');
      setOutputMessage('测试输出成功');
      toastr.success('测试输出成功');
    } catch (e: any) {
      setOutputStatus('error');
      setOutputMessage(e.message || '未知错误');
      toastr.error(`测试输出失败: ${e.message || '未知错误'}`);
    }
  };

  const handleFetchModels = async () => {
    const normalizedUrl = normalizeApiUrl(multiApiConfig.apiurl || '');
    if (!normalizedUrl) {
      toastr.warning('请先填写 API URL');
      return;
    }
    setIsFetchingModels(true);
    try {
      let list: string[] = [];
      if (hasModelList) {
        list = await getModelList({ apiurl: normalizedUrl, key: multiApiConfig.key?.trim() });
      } else {
        const headers: Record<string, string> = {};
        const key = multiApiConfig.key?.trim();
        if (key) headers.Authorization = `Bearer ${key}`;
        const resp = await fetch(`${normalizedUrl.replace(/\/$/, '')}/models`, { headers });
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        const data = await resp.json();
        if (Array.isArray(data?.data)) {
          list = data.data.map((item: any) => item?.id).filter(Boolean);
        } else if (Array.isArray(data?.models)) {
          list = data.models.map((item: any) => item?.id || item?.name).filter(Boolean);
        } else if (Array.isArray(data)) {
          list = data.map((item: any) => item?.id || item?.name || item).filter(Boolean);
        } else {
          throw new Error('未知的模型列表返回格式');
        }
      }
      setModelOptions(list || []);
      if (normalizedUrl !== multiApiConfig.apiurl.trim()) {
        updateMultiApi({ apiurl: normalizedUrl });
      }
      toastr.success('模型列表已获取');
    } catch (e: any) {
      toastr.error(`获取模型失败: ${e.message || '未知错误'}`);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleTestShopConnection = async () => {
    const normalizedUrl = normalizeApiUrl(shopApiConfig.apiurl || '');
    if (!normalizedUrl) {
      toastr.warning('请先填写 API URL');
      return;
    }
    setIsTestingShopApi(true);
    setShopConnectionStatus('idle');
    setShopConnectionMessage('测试中...');
    try {
      if (normalizedUrl !== shopApiConfig.apiurl.trim()) {
        updateShopApi({ apiurl: normalizedUrl });
      }
      await generateRaw({
        user_input: 'ping',
        ordered_prompts: ['user_input'],
        custom_api: {
          apiurl: normalizedUrl,
          key: shopApiConfig.key?.trim(),
          model: shopApiConfig.model || 'gpt-4o-mini',
          source: 'openai'
        }
      });
      setShopConnectionStatus('success');
      setShopConnectionMessage('连接正常');
      toastr.success('连接测试成功');
    } catch (e: any) {
      setShopConnectionStatus('error');
      setShopConnectionMessage(e.message || '未知错误');
      toastr.error(`连接测试失败: ${e.message || '未知错误'}`);
    } finally {
      setIsTestingShopApi(false);
    }
  };

  const handleTestShopOutput = async () => {
    const normalizedUrl = normalizeApiUrl(shopApiConfig.apiurl || '');
    if (!normalizedUrl) {
      toastr.warning('请先填写 API URL');
      return;
    }
    setShopOutputStatus('idle');
    setShopOutputMessage('测试中...');
    try {
      if (normalizedUrl !== shopApiConfig.apiurl.trim()) {
        updateShopApi({ apiurl: normalizedUrl });
      }
      await generateRaw({
        user_input: '请输出“测试通过”四个字，不要输出其他内容。',
        ordered_prompts: ['user_input'],
        custom_api: {
          apiurl: normalizedUrl,
          key: shopApiConfig.key?.trim(),
          model: shopApiConfig.model || 'gpt-4o-mini',
          source: 'openai'
        }
      });
      setShopOutputStatus('success');
      setShopOutputMessage('测试输出成功');
      toastr.success('测试输出成功');
    } catch (e: any) {
      setShopOutputStatus('error');
      setShopOutputMessage(e.message || '未知错误');
      toastr.error(`测试输出失败: ${e.message || '未知错误'}`);
    }
  };

  const handleFetchShopModels = async () => {
    const normalizedUrl = normalizeApiUrl(shopApiConfig.apiurl || '');
    if (!normalizedUrl) {
      toastr.warning('请先填写 API URL');
      return;
    }
    setIsFetchingShopModels(true);
    try {
      let list: string[] = [];
      if (hasModelList) {
        list = await getModelList({ apiurl: normalizedUrl, key: shopApiConfig.key?.trim() });
      } else {
        const headers: Record<string, string> = {};
        const key = shopApiConfig.key?.trim();
        if (key) headers.Authorization = `Bearer ${key}`;
        const resp = await fetch(`${normalizedUrl.replace(/\/$/, '')}/models`, { headers });
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        const data = await resp.json();
        if (Array.isArray(data?.data)) {
          list = data.data.map((item: any) => item?.id).filter(Boolean);
        } else if (Array.isArray(data?.models)) {
          list = data.models.map((item: any) => item?.id || item?.name).filter(Boolean);
        } else if (Array.isArray(data)) {
          list = data.map((item: any) => item?.id || item?.name || item).filter(Boolean);
        } else {
          throw new Error('未知的模型列表返回格式');
        }
      }
      setShopModelOptions(list || []);
      if (normalizedUrl !== shopApiConfig.apiurl.trim()) {
        updateShopApi({ apiurl: normalizedUrl });
      }
      toastr.success('模型列表已获取');
    } catch (e: any) {
      toastr.error(`获取模型失败: ${e.message || '未知错误'}`);
    } finally {
      setIsFetchingShopModels(false);
    }
  };

  const handleTestLuckConnection = async () => {
    const normalizedUrl = normalizeApiUrl(luckApiConfig.apiurl || '');
    if (!normalizedUrl) {
      toastr.warning('请先填写 API URL');
      return;
    }
    setIsTestingLuckApi(true);
    setLuckConnectionStatus('idle');
    setLuckConnectionMessage('测试中...');
    try {
      if (normalizedUrl !== luckApiConfig.apiurl.trim()) {
        updateLuckApi({ apiurl: normalizedUrl });
      }
      await generateRaw({
        user_input: 'ping',
        ordered_prompts: ['user_input'],
        custom_api: {
          apiurl: normalizedUrl,
          key: luckApiConfig.key?.trim(),
          model: luckApiConfig.model || 'gpt-4o-mini',
          source: 'openai'
        }
      });
      setLuckConnectionStatus('success');
      setLuckConnectionMessage('连接正常');
      toastr.success('连接测试成功');
    } catch (e: any) {
      setLuckConnectionStatus('error');
      setLuckConnectionMessage(e.message || '未知错误');
      toastr.error(`连接测试失败: ${e.message || '未知错误'}`);
    } finally {
      setIsTestingLuckApi(false);
    }
  };

  const handleTestLuckOutput = async () => {
    const normalizedUrl = normalizeApiUrl(luckApiConfig.apiurl || '');
    if (!normalizedUrl) {
      toastr.warning('请先填写 API URL');
      return;
    }
    setLuckOutputStatus('idle');
    setLuckOutputMessage('测试中...');
    try {
      if (normalizedUrl !== luckApiConfig.apiurl.trim()) {
        updateLuckApi({ apiurl: normalizedUrl });
      }
      await generateRaw({
        user_input: '请输出“测试通过”四个字，不要输出其他内容。',
        ordered_prompts: ['user_input'],
        custom_api: {
          apiurl: normalizedUrl,
          key: luckApiConfig.key?.trim(),
          model: luckApiConfig.model || 'gpt-4o-mini',
          source: 'openai'
        }
      });
      setLuckOutputStatus('success');
      setLuckOutputMessage('测试输出成功');
      toastr.success('测试输出成功');
    } catch (e: any) {
      setLuckOutputStatus('error');
      setLuckOutputMessage(e.message || '未知错误');
      toastr.error(`测试输出失败: ${e.message || '未知错误'}`);
    }
  };

  const handleFetchLuckModels = async () => {
    const normalizedUrl = normalizeApiUrl(luckApiConfig.apiurl || '');
    if (!normalizedUrl) {
      toastr.warning('请先填写 API URL');
      return;
    }
    setIsFetchingLuckModels(true);
    try {
      let list: string[] = [];
      if (hasModelList) {
        list = await getModelList({ apiurl: normalizedUrl, key: luckApiConfig.key?.trim() });
      } else {
        const headers: Record<string, string> = {};
        const key = luckApiConfig.key?.trim();
        if (key) headers.Authorization = `Bearer ${key}`;
        const resp = await fetch(`${normalizedUrl.replace(/\/$/, '')}/models`, { headers });
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        const data = await resp.json();
        if (Array.isArray(data?.data)) {
          list = data.data.map((item: any) => item?.id).filter(Boolean);
        } else if (Array.isArray(data?.models)) {
          list = data.models.map((item: any) => item?.id || item?.name).filter(Boolean);
        } else if (Array.isArray(data)) {
          list = data.map((item: any) => item?.id || item?.name || item).filter(Boolean);
        } else {
          throw new Error('未知的模型列表返回格式');
        }
      }
      setLuckModelOptions(list || []);
      if (normalizedUrl !== luckApiConfig.apiurl.trim()) {
        updateLuckApi({ apiurl: normalizedUrl });
      }
      toastr.success('模型列表已获取');
    } catch (e: any) {
      toastr.error(`获取模型失败: ${e.message || '未知错误'}`);
    } finally {
      setIsFetchingLuckModels(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
        <div className="space-y-3">
          <div className="p-4 bg-white/40 border border-emerald-400/90 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm text-slate-800 font-bold">API模式</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-tighter">
                  {multiApiEnabled ? '主API正文+历史，第二API仅更新变量' : '单API完整输出'}
                </span>
              </div>
              <div className="flex bg-emerald-50/50 p-1 rounded-full border border-emerald-100">
                <button
                  onClick={() => onToggleMultiApi(true)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                    multiApiEnabled ? 'bg-emerald-500 text-white shadow-sm' : 'text-emerald-300 hover:text-emerald-500'
                  }`}
                  title="开启多API模式"
                >
                  多
                </button>
                <button
                  onClick={() => onToggleMultiApi(false)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                    !multiApiEnabled ? 'bg-slate-500 text-white shadow-sm' : 'text-slate-300 hover:text-slate-500'
                  }`}
                  title="关闭多API模式"
                >
                  单
                </button>
              </div>
            </div>
            <div className="p-3 rounded-xl border border-emerald-100 bg-white/60 text-[10px] text-slate-500">
              变量更新 API 使用独立配置（不跟随酒馆当前 API）
            </div>
          </div>

          {multiApiEnabled && (
            <div className="space-y-3">
              <div className="p-4 bg-white/30 border border-emerald-400/90 rounded-2xl space-y-3 backdrop-blur-md">
                <button
                  onClick={() => setSecondApiOpen(val => !val)}
                  className="w-full flex items-center text-left relative"
                  title={secondApiOpen ? '收起' : '展开'}
                >
                  <div className="text-xs font-bold text-emerald-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    变量更新 API 配置
                  </div>
                  <span className="absolute right-0 top-[58%] -translate-y-1/2 text-sm text-emerald-600 font-bold px-2 py-1 rounded-full bg-white/60">
                    {secondApiOpen ? '收起' : '展开'}
                  </span>
                </button>
                {!secondApiOpen && null}
                {secondApiOpen && (
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">API URL（OpenAI兼容）</label>
                    <input
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-emerald-100 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      placeholder="https://api.openai.com/v1 或 https://your-proxy/v1"
                      value={multiApiConfig.apiurl}
                      onChange={e => updateMultiApi({ apiurl: e.target.value })}
                      onBlur={e => updateMultiApi({ apiurl: normalizeApiUrl(e.target.value) })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">API Key</label>
                    <input
                      type="password"
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-emerald-100 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      placeholder="sk-..."
                      value={multiApiConfig.key}
                      onChange={e => updateMultiApi({ key: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">模型</label>
                    <input
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-emerald-100 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      placeholder="gpt-4o-mini"
                      value={multiApiConfig.model}
                      onChange={e => updateMultiApi({ model: e.target.value })}
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
                    {modelOptions.length > 0 && (
                      <div className="max-h-36 overflow-y-auto rounded-xl border border-emerald-100 bg-white/70 custom-scrollbar">
                        {modelOptions.map(model => (
                          <button
                            key={model}
                            onClick={() => updateMultiApi({ model })}
                            className={`w-full text-left px-3 py-2 text-xs border-b border-emerald-50 transition-colors ${
                              model === multiApiConfig.model ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-emerald-50'
                            }`}
                          >
                            {model}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">最大重试 (0-10)</label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-emerald-100 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      value={multiApiConfig.retries}
                      onChange={e => updateMultiApi({ retries: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleTestConnection}
                      className="px-3 py-2 text-xs font-bold rounded-xl border border-emerald-100 bg-white/60 text-emerald-700 hover:bg-emerald-50 transition-colors"
                      disabled={isTestingApi}
                    >
                      {isTestingApi ? '测试中...' : '尝试连接'}
                    </button>
                    <button
                      onClick={handleTestOutput}
                      className="px-3 py-2 text-xs font-bold rounded-xl border border-emerald-100 bg-white/60 text-emerald-700 hover:bg-emerald-50 transition-colors"
                    >
                      测试输出
                    </button>
                  </div>
                  <div className="space-y-1 text-[10px] text-slate-500">
                    <div>
                      连接状态：
                      <span
                        className={`ml-1 font-bold ${
                          connectionStatus === 'success'
                            ? 'text-emerald-600'
                            : connectionStatus === 'error'
                              ? 'text-rose-500'
                              : 'text-slate-400'
                        }`}
                      >
                        {connectionStatus === 'idle' ? '未测试' : connectionMessage}
                      </span>
                    </div>
                  
                    <div>
                      输出状态：
                      <span
                        className={`ml-1 font-bold ${
                          outputStatus === 'success'
                            ? 'text-emerald-600'
                            : outputStatus === 'error'
                              ? 'text-rose-500'
                              : 'text-slate-400'
                        }`}
                      >
                        {outputStatus === 'idle' ? '未测试' : outputMessage}
                      </span>
                    </div>
                  </div>
                </div>
                )}
              </div>
              <div className="p-4 bg-white/30 border border-emerald-400/90 rounded-2xl space-y-3 backdrop-blur-md">
                <button
                  onClick={() => setPresetOpen(val => !val)}
                  className="w-full flex items-center text-left relative"
                  title={presetOpen ? '收起' : '展开'}
                >
                  <div className="text-xs font-bold text-emerald-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    变量更新预设
                  </div>
                  <span className="absolute right-0 top-[58%] -translate-y-1/2 text-sm text-emerald-600 font-bold px-2 py-1 rounded-full bg-white/60">
                    {presetOpen ? '收起' : '展开'}
                  </span>
                </button>
                {!presetOpen && null}
                {presetOpen && (
                  <div className="mt-2 p-3 rounded-xl border border-emerald-100 bg-white/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span>共 {presetRules.length} 条规则 / 启用 {enabledCount}</span>
                        <button
                          onClick={refreshWorldbookOptions}
                          className="px-2 py-1 rounded-lg border border-emerald-100 bg-white/70 text-emerald-700 hover:bg-emerald-50 transition-colors"
                          disabled={isFetchingWorldbook}
                        >
                          {isFetchingWorldbook ? '读取中...' : '读取世界书'}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => importPresetInputRef.current?.click()}
                        className="px-2 py-1 text-[10px] font-bold rounded-lg border border-emerald-100 bg-white/70 text-emerald-700 hover:bg-emerald-50 transition-colors"
                      >
                        导入预设
                      </button>
                      <button
                        onClick={handleExportVariablePreset}
                        className="px-2 py-1 text-[10px] font-bold rounded-lg border border-emerald-100 bg-white/70 text-emerald-700 hover:bg-emerald-50 transition-colors"
                      >
                        导出预设
                      </button>
                      <input
                        ref={importPresetInputRef}
                        type="file"
                        accept="application/json"
                        className="hidden"
                        onChange={e => handleImportVariablePreset(e.target.files?.[0])}
                      />
                    </div>
                    <div className="space-y-3">
                      {Object.keys(groupedRules).length === 0 && (
                        <div className="text-[10px] text-slate-400">
                          暂无预设规则，请导入预设或手动添加。
                        </div>
                      )}
                      {Object.entries(groupedRules).map(([groupName, rules]) => {
                        const groupOpen = presetGroupOpen[groupName] ?? true;
                        return (
                          <div key={groupName} className="rounded-xl border border-emerald-100 bg-white/70">
                            <button
                              type="button"
                              onClick={() => setPresetGroupOpen(prev => ({ ...prev, [groupName]: !groupOpen }))}
                              className="w-full px-3 py-2 text-[11px] font-black text-emerald-700 uppercase tracking-widest border-b border-emerald-100 flex items-center justify-between"
                            >
                              <span>{groupName}（{rules.length}）</span>
                              <span className="text-emerald-600">{groupOpen ? '收起' : '展开'}</span>
                            </button>
                            {groupOpen && (
                              <div className="divide-y divide-emerald-200/50">
                                {rules.map(({ rule, index }) => {
                                  const ruleName = rule.name || '';
                                  const isWorldbookRule = ruleName.includes('世界书');
                                  if (isWorldbookRule) return null;

                                  const baseName = ruleName.replace(/-?要求$/, '');
                                  const relatedWorldbookRule = worldbookRuleMap[baseName];

                                  const refs = relatedWorldbookRule
                                    ? extractWorldbookRefs(relatedWorldbookRule.content)
                                    : extractWorldbookRefs(rule.content);
                                  return (
                                    <div key={rule.id || index} className="p-3 space-y-2">
                                      <div className="flex items-center gap-2">
                                        <div className="text-[11px] font-bold text-emerald-700">
                                          {rule.name || '未命名规则'}
                                        </div>
                                        <button
                                          type="button"
                                          className="ml-1 inline-flex items-center justify-center w-7 h-7 rounded-full border border-emerald-100 bg-white/70 text-emerald-700 hover:bg-emerald-50 transition-colors"
                                          title="引用世界书"
                                          onClick={() => {
                                            setWorldbookPanelOpen(prev => ({ ...prev, [index]: !prev[index] }));
                                            if (!(worldbookSelections[index]?.length)) {
                                              setWorldbookSelections(prev => ({ ...prev, [index]: refs }));
                                            }
                                          }}
                                        >
                                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" aria-hidden="true">
                                            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
                                            <path d="M3 12h18M12 3a13 13 0 0 0 0 18M12 3a13 13 0 0 1 0 18" fill="none" stroke="currentColor" strokeWidth="1.4" />
                                          </svg>
                                        </button>
                                      </div>
                                      {worldbookPanelOpen[index] && (
                                        <div className="rounded-xl border border-emerald-100 bg-white/70 p-2 space-y-2">
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-emerald-100 bg-white/70 text-emerald-700 hover:bg-emerald-50 transition-colors"
                                              onClick={() => setWorldbookPickerOpen(prev => ({ ...prev, [index]: !prev[index] }))}
                                            >
                                              插入世界书
                                            </button>
                                            <div className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-emerald-100 bg-white/80 text-slate-400">
                                              点击选择世界书条目...
                                            </div>
                                          </div>
                                          {worldbookPickerOpen[index] && (
                                            <div className="mt-2 p-2 rounded-lg border border-emerald-100 bg-white/80 space-y-2">
                                              <input
                                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-emerald-100 bg-white"
                                                placeholder="搜索世界书条目..."
                                                value={worldbookSearch[index] || ''}
                                                onChange={e => setWorldbookSearch(prev => ({ ...prev, [index]: e.target.value }))}
                                              />
                                              <div className="max-h-40 overflow-y-auto rounded-lg border border-emerald-100 bg-white">
                                                {(worldbookOptions || [])
                                                  .filter(name => name.includes((worldbookSearch[index] || '').trim()))
                                                  .map(name => {
                                                    const selected = (worldbookSelections[index] || []).includes(name);
                                                    return (
                                                      <button
                                                        key={name}
                                                        type="button"
                                                        className={`w-full flex items-center gap-2 px-2.5 py-2 text-xs text-left border-b border-emerald-200/50 ${
                                                          selected ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-emerald-50'
                                                        }`}
                                                        onClick={() => {
                                                          const current = worldbookSelections[index] || [];
                                                          const nextSelected = selected
                                                            ? current.filter(item => item !== name)
                                                            : [...current, name];
                                                          setWorldbookSelections({ ...worldbookSelections, [index]: nextSelected });
                                                          upsertWorldbookRule(index, nextSelected);
                                                        }}
                                                      >
                                                        <span
                                                          className={`w-3.5 h-3.5 rounded border ${
                                                            selected ? 'bg-emerald-500 border-emerald-500' : 'border-emerald-100'
                                                          }`}
                                                        />
                                                        {name}
                                                      </button>
                                                    );
                                                  })}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      {refs.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                          <span className="text-emerald-700 font-semibold text-[12px]">引用世界书：</span>
                                          {refs.map(ref => {
                                            const missing = !worldbookOptions.includes(ref);
                                            return (
                                              <span
                                                key={ref}
                                                className={`px-3 py-1 rounded-full border ${
                                                  missing
                                                    ? 'border-rose-300 bg-rose-50 text-rose-600'
                                                    : 'border-emerald-100 bg-emerald-50 text-emerald-700'
                                                }`}
                                                title={missing ? `未找到：${ref}` : '已绑定'}
                                              >
                                                {ref}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      )}
                                      <textarea
                                        className="w-full min-h-[120px] px-2.5 py-2 text-xs rounded-xl border border-emerald-100 bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                        value={rule.content || ''}
                                        onChange={e => updateRule(index, { content: e.target.value })}
                                        placeholder="规则内容"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 bg-white/30 border border-emerald-400/90 rounded-2xl space-y-3 backdrop-blur-md">
                <button
                  onClick={() => setShopApiOpen(val => !val)}
                  className="w-full flex items-center text-left relative"
                  title={shopApiOpen ? '收起' : '展开'}
                >
                  <div className="text-xs font-bold text-emerald-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    仙缘商城刷新 API 配置
                  </div>
                  <span className="absolute right-0 top-[58%] -translate-y-1/2 text-sm text-emerald-600 font-bold px-2 py-1 rounded-full bg-white/60">
                    {shopApiOpen ? '收起' : '展开'}
                  </span>
                </button>
                {!shopApiOpen && null}
                {shopApiOpen && (
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">API URL（OpenAI兼容）</label>
                    <input
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-emerald-100 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      placeholder="https://api.openai.com/v1 或 https://your-proxy/v1"
                      value={shopApiConfig.apiurl}
                      onChange={e => updateShopApi({ apiurl: e.target.value })}
                      onBlur={e => updateShopApi({ apiurl: normalizeApiUrl(e.target.value) })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">API Key</label>
                    <input
                      type="password"
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-emerald-100 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      placeholder="sk-..."
                      value={shopApiConfig.key}
                      onChange={e => updateShopApi({ key: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">模型</label>
                    <input
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-emerald-100 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      placeholder="gpt-4o-mini"
                      value={shopApiConfig.model}
                      onChange={e => updateShopApi({ model: e.target.value })}
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{hasModelList ? '支持拉取模型列表' : ''}</span>
                      <button
                        onClick={handleFetchShopModels}
                        className="px-2 py-1 rounded-lg border border-emerald-100 bg-white/60 text-emerald-700 hover:bg-emerald-50 transition-colors"
                        disabled={isFetchingShopModels}
                      >
                        {isFetchingShopModels ? '获取中...' : '获取可用模型'}
                      </button>
                    </div>
                    {shopModelOptions.length > 0 && (
                      <div className="max-h-36 overflow-y-auto rounded-xl border border-emerald-100 bg-white/70 custom-scrollbar">
                        {shopModelOptions.map(model => (
                          <button
                            key={model}
                            onClick={() => updateShopApi({ model })}
                            className={`w-full text-left px-3 py-2 text-xs border-b border-emerald-50 transition-colors ${
                              model === shopApiConfig.model ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-emerald-50'
                            }`}
                          >
                            {model}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">最大重试 (0-10)</label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-emerald-100 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      value={shopApiConfig.retries}
                      onChange={e => updateShopApi({ retries: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleTestShopConnection}
                      className="px-3 py-2 text-xs font-bold rounded-xl border border-emerald-100 bg-white/60 text-emerald-700 hover:bg-emerald-50 transition-colors"
                      disabled={isTestingShopApi}
                    >
                      {isTestingShopApi ? '测试中...' : '尝试连接'}
                    </button>
                    <button
                      onClick={handleTestShopOutput}
                      className="px-3 py-2 text-xs font-bold rounded-xl border border-emerald-100 bg-white/60 text-emerald-700 hover:bg-emerald-50 transition-colors"
                    >
                      测试输出
                    </button>
                  </div>
                  <div className="space-y-1 text-[10px] text-slate-500">
                    <div>
                      连接状态：
                      <span
                        className={`ml-1 font-bold ${
                          shopConnectionStatus === 'success'
                            ? 'text-emerald-600'
                            : shopConnectionStatus === 'error'
                              ? 'text-rose-500'
                              : 'text-slate-400'
                        }`}
                      >
                        {shopConnectionStatus === 'idle' ? '未测试' : shopConnectionMessage}
                      </span>
                    </div>
                    <div>
                      输出状态：
                      <span
                        className={`ml-1 font-bold ${
                          shopOutputStatus === 'success'
                            ? 'text-emerald-600'
                            : shopOutputStatus === 'error'
                              ? 'text-rose-500'
                              : 'text-slate-400'
                        }`}
                      >
                        {shopOutputStatus === 'idle' ? '未测试' : shopOutputMessage}
                      </span>
                    </div>
                  </div>
                </div>
                )}
              </div>
              <div className="p-4 bg-white/30 border border-emerald-400/90 rounded-2xl space-y-3 backdrop-blur-md">
                <button
                  onClick={() => setLuckApiOpen(val => !val)}
                  className="w-full flex items-center text-left relative"
                  title={luckApiOpen ? '收起' : '展开'}
                >
                  <div className="text-xs font-bold text-emerald-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    天运卜算刷新 API 配置
                  </div>
                  <span className="absolute right-0 top-[58%] -translate-y-1/2 text-sm text-emerald-600 font-bold px-2 py-1 rounded-full bg-white/60">
                    {luckApiOpen ? '收起' : '展开'}
                  </span>
                </button>
                {!luckApiOpen && null}
                {luckApiOpen && (
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">API URL（OpenAI兼容）</label>
                    <input
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-emerald-100 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      placeholder="https://api.openai.com/v1 或 https://your-proxy/v1"
                      value={luckApiConfig.apiurl}
                      onChange={e => updateLuckApi({ apiurl: e.target.value })}
                      onBlur={e => updateLuckApi({ apiurl: normalizeApiUrl(e.target.value) })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">API Key</label>
                    <input
                      type="password"
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-emerald-100 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      placeholder="sk-..."
                      value={luckApiConfig.key}
                      onChange={e => updateLuckApi({ key: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">模型</label>
                    <input
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-emerald-100 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      placeholder="gpt-4o-mini"
                      value={luckApiConfig.model}
                      onChange={e => updateLuckApi({ model: e.target.value })}
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{hasModelList ? '支持拉取模型列表' : ''}</span>
                      <button
                        onClick={handleFetchLuckModels}
                        className="px-2 py-1 rounded-lg border border-emerald-100 bg-white/60 text-emerald-700 hover:bg-emerald-50 transition-colors"
                        disabled={isFetchingLuckModels}
                      >
                        {isFetchingLuckModels ? '获取中...' : '获取可用模型'}
                      </button>
                    </div>
                    {luckModelOptions.length > 0 && (
                      <div className="max-h-36 overflow-y-auto rounded-xl border border-emerald-100 bg-white/70 custom-scrollbar">
                        {luckModelOptions.map(model => (
                          <button
                            key={model}
                            onClick={() => updateLuckApi({ model })}
                            className={`w-full text-left px-3 py-2 text-xs border-b border-emerald-50 transition-colors ${
                              model === luckApiConfig.model ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-emerald-50'
                            }`}
                          >
                            {model}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">最大重试 (0-10)</label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-emerald-100 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      value={luckApiConfig.retries}
                      onChange={e => updateLuckApi({ retries: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleTestLuckConnection}
                      className="px-3 py-2 text-xs font-bold rounded-xl border border-emerald-100 bg-white/60 text-emerald-700 hover:bg-emerald-50 transition-colors"
                      disabled={isTestingLuckApi}
                    >
                      {isTestingLuckApi ? '测试中...' : '尝试连接'}
                    </button>
                    <button
                      onClick={handleTestLuckOutput}
                      className="px-3 py-2 text-xs font-bold rounded-xl border border-emerald-100 bg-white/60 text-emerald-700 hover:bg-emerald-50 transition-colors"
                    >
                      测试输出
                    </button>
                  </div>
                  <div className="space-y-1 text-[10px] text-slate-500">
                    <div>
                      连接状态：
                      <span
                        className={`ml-1 font-bold ${
                          luckConnectionStatus === 'success'
                            ? 'text-emerald-600'
                            : luckConnectionStatus === 'error'
                              ? 'text-rose-500'
                              : 'text-slate-400'
                        }`}
                      >
                        {luckConnectionStatus === 'idle' ? '未测试' : luckConnectionMessage}
                      </span>
                    </div>
                    <div>
                      输出状态：
                      <span
                        className={`ml-1 font-bold ${
                          luckOutputStatus === 'success'
                            ? 'text-emerald-600'
                            : luckOutputStatus === 'error'
                              ? 'text-rose-500'
                              : 'text-slate-400'
                        }`}
                      >
                        {luckOutputStatus === 'idle' ? '未测试' : luckOutputMessage}
                      </span>
                    </div>
                  </div>
                </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiModeModal;
