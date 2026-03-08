import React from 'react';
import { BookOpen, RefreshCcw } from 'lucide-react';
import toastr from 'toastr';
import { getWorldbookEntryContents, listWorldbookEntryNames, runTianjiNewsWithFactionSelection, writeTianjiNewsEntry } from '../../utils/worldbook';
import { loadFromLatestMessage } from '../../utils/messageParser';

interface TianjiSettings {
  refreshInterval: number;
  keepCount: number;
}

interface Props {
  variant: 'news' | 'beauty';
  tianjiSettings?: Partial<TianjiSettings>;
  onUpdateTianjiSettings?: (settings: TianjiSettings) => void;
  tianjiApiEnabled?: boolean;
  onToggleTianjiApi?: (val: boolean) => void;
  tianjiApiConfig?: { apiurl: string; key: string; model: string; retries: number };
  onUpdateTianjiApiConfig?: (config: any) => void;
}

const DEFAULTS: TianjiSettings = {
  refreshInterval: 30,
  keepCount: 5
};

const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

const normalize = (input: Partial<TianjiSettings>): TianjiSettings => {
  return {
    refreshInterval: clamp(Number(input.refreshInterval) || 0, 1, 500),
    keepCount: clamp(Number(input.keepCount) || 0, 1, 50)
  };
};

const TianjiModal: React.FC<Props> = ({
  variant,
  tianjiSettings,
  onUpdateTianjiSettings,
  tianjiApiEnabled = false,
  onToggleTianjiApi,
  tianjiApiConfig,
  onUpdateTianjiApiConfig
}) => {
  const settings = normalize({ ...DEFAULTS, ...(tianjiSettings || {}) });
  const [page, setPage] = React.useState<'overview' | 'settings' | 'api'>('overview');
  const [currentFloor, setCurrentFloor] = React.useState<number | null>(null);
  const [currentSeq, setCurrentSeq] = React.useState<number | null>(null);
  const presetLibrary = [
    {
      id: 'tianji_news_preset_v1',
      name: '天下大事-演化预设',
      description: '',
      rules: [
        {
          id: 'rule_identity_mission',
          name: '身份定义与核心使命',
          content: '你是由造物主设定的【世界意志 - 后台演化模块】。你的职责专注于宗门大事、世界大势、重要NPC的动态信息与演化结果。你需要将宏观变化转化为可被记录与传播的天下大事。'
        },
        {
          id: 'rule_logic_authenticity',
          name: '演化的真实性与逻辑性',
          content: '确保天下大事具备真实因果链：事件必须由势力资源、角色动机、地缘冲突或历史积累所驱动。大事不空降：每条大事必须能追溯到至少一个可验证的触发条件或背景冲突。时间跨度决定颗粒度：短周期（数日/数月）输出1-3条具体事件，长周期（数年/数十年）输出阶段性大势与结构性变化。'
        },
        {
          id: 'rule_task_logic',
          name: '任务与推演逻辑',
          content: '围绕宗门、势力与重要NPC构建【长期目标 → 短期目标 → 当前动作】链条，并据此生成事件：\n- 势力层面：扩张、结盟、战争、资源争夺、秘境争夺。\n- 宗门层面：掌门更替、内斗、传承争夺、重大试炼。\n- 重要NPC：突破、陨落、背叛、名望变动、势力归属变化。\n若与上条逻辑重复，则本条补充为“事件聚焦清单与输出范围”。'
        },
        {
          id: 'rule_maintext_exclude',
          name: '人物隔离',
          content: '天下大事中不得出现<maintext>中已经出场的人物姓名。若不可避免，请改写为匿名称呼（如“某宗门弟子/某城修士”）。'
        },
        {
          id: 'rule_news_format',
          name: '天下大事格式',
          content: '只输出一个事件。\n将事件正文包裹在<event>中，且每一行必须是“字段名|内容”的格式：\n<event>\n序号|（必填）\n事件标题|（4-6个字）\n时间|（具体时间，包括年月日）\n地点|（从大域开始，依次写到详细地点，中间用·连接）\n事件类型|（人物事件/宗门事件/世界事件/诡异事件）\n事件内容|（150-200字）\n</event>'
        },
        {
          id: 'rule_ref_start',
          name: '-----参考',
          content: '<参考>'
        },
        {
          id: 'rule_reference_sources',
          name: '参考资料',
          content: 'getWorldbookEntryContents(["[太虚界]太初天道总纲", "[太虚界]主要地图", "[太虚界]宗门速览", "[太虚界]邪物体系", "[太虚界]外道孽种体系", "[太虚界]境界体系", "[天机阁]天下大事"])'
        },
        {
          id: 'rule_story_text',
          name: '剧情原文',
          content: '<maintext>\n${mainText}\n</maintext>'
        },
        {
          id: 'rule_ref_end',
          name: '-----参考结束',
          content: '</参考>'
        },
        {
          id: 'rule_faction_selection',
          name: '势力选择与二段读取',
          content: '第一步：基于参考资料判断是否需要选择势力（可返回 none）。\n第二步：如需势力，则调用 getWorldbookEntryContents(["[势力]势力名"]) 读取对应条目，并追加到上下文后生成天下大事；若为 none，则直接用参考资料上下文生成天下大事。'
        },
        {
          id: 'rule_anti_omniscience',
          name: '防全知',
          content: '<防全知>\n1. 信息必须通过合理渠道得知，不允许凭空获知。\n2. 感官：只描述当前可观测信息，禁止全域视角。\n3. 认知：严格基于角色履历与当前经历，允许误判。\n4. 重要NPC与宗门的动机必须有前置情报支撑。\n</防全知>'
        },
        {
          id: 'rule_cot_start',
          name: '-----COT开始----',
          content: '接下来按照以下步骤进行思考：\n<thinking>'
        },
        {
          id: 'rule_step0_receive',
          name: '前置接收',
          content: '0.\n接收<参考>中的世界观资料与<maintext>剧情原文。'
        },
        {
          id: 'rule_step1_scan',
          name: '第一步，扫描与归因',
          content: '1.\n梳理宗门大事、世界大势、重要NPC的可用信息，确认事件的触发因与逻辑链条。'
        },
        {
          id: 'rule_step2_faction',
          name: '第二步，势力判定',
          content: '2.\n判断是否需要指定势力条目：如需要，给出势力名；如不需要，标记 none。'
        },
        {
          id: 'rule_step3_output',
          name: '第三步，事件产出',
          content: '3.\n生成若干条“天下大事”，确保每条都能从参考资料或势力资料中找到因果支撑。'
        },
        {
          id: 'rule_step4_check',
          name: '第四步，自检',
          content: '4.\n检查是否违反防全知，是否有空降事件与逻辑断裂。'
        },
        {
          id: 'rule_cot_end',
          name: '-----COT结束',
          content: '思考结束，输出天下大事正文。\n</thinking>'
        }
      ]
    }
  ];
  const [activePresetId, setActivePresetId] = React.useState('');
  const [presetDraft, setPresetDraft] = React.useState<any[]>([]);

  const apiConfig = tianjiApiConfig || { apiurl: '', key: '', model: '', retries: 0 };
  const hasModelList = typeof getModelList === 'function';
  const [isFetchingModels, setIsFetchingModels] = React.useState(false);
  const [modelOptions, setModelOptions] = React.useState<string[]>([]);
  const [connectStatus, setConnectStatus] = React.useState('未测试');
  const [outputStatus, setOutputStatus] = React.useState('未测试');
  const [tianjiNewsContent, setTianjiNewsContent] = React.useState('');
  const [isGeneratingNow, setIsGeneratingNow] = React.useState(false);
  const [openEventIndex, setOpenEventIndex] = React.useState<number | null>(null);
  const [presetGroupOpen, setPresetGroupOpen] = React.useState<Record<string, boolean>>({});
  const [presetOpen, setPresetOpen] = React.useState(false);
  const importPresetInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isFetchingWorldbook, setIsFetchingWorldbook] = React.useState(false);
  const [worldbookOptions, setWorldbookOptions] = React.useState<string[]>([]);
  const [worldbookSelections, setWorldbookSelections] = React.useState<Record<number, string[]>>({});
  const [worldbookPanelOpen, setWorldbookPanelOpen] = React.useState<Record<number, boolean>>({});
  const [worldbookPickerOpen, setWorldbookPickerOpen] = React.useState<Record<number, boolean>>({});
  const [worldbookSearch, setWorldbookSearch] = React.useState<Record<number, string>>({});

  const getStatusTone = (value: string) => {
    if (value.includes('成功')) return 'success';
    if (value.includes('失败') || value.includes('异常')) return 'error';
    return 'idle';
  };

  React.useEffect(() => {
    try {
      localStorage.setItem('taixujie_tianji_preset_draft', JSON.stringify(presetDraft));
    } catch {
    }
  }, [presetDraft]);
  const getLatestMaintext = React.useCallback(() => {
    const latest = loadFromLatestMessage();
    if (latest?.role !== 'assistant') return '';
    return latest.maintext || '';
  }, []);
  const getCurrentFloorNow = React.useCallback(() => {
    const latest = loadFromLatestMessage();
    if (!latest || latest.role !== 'assistant') return null;
    if (typeof latest.messageId !== 'number' || latest.messageId < 0) return null;
    const floor = Math.floor(latest.messageId / 2);
    console.info('[TianjiManual] floor from latest assistant message', {
      messageId: latest.messageId,
      floor,
      maintextLen: latest.maintext?.length || 0
    });
    return floor;
  }, []);

  const parseNewsBlocks = React.useCallback((raw: string) => {
    if (!raw) return [];
    const normalized = raw.replace(/｜/g, '|');
    const blocks = normalized.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    return blocks.map((block) => {
      const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
      const data: Record<string, string> = {};
      lines.forEach((line) => {
        const pipeIndex = line.indexOf('|');
        if (pipeIndex !== -1) {
          const key = line.slice(0, pipeIndex).trim();
          const value = line.slice(pipeIndex + 1).trim();
          if (key) data[key] = value;
        }
      });
      delete data['楼层'];
      return data;
    });
  }, []);
  const extractLatestSeq = React.useCallback((raw: string) => {
    if (!raw) return null;
    const normalized = raw.replace(/｜/g, '|');
    const blocks = normalized.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    let maxSeq: number | null = null;
    blocks.forEach((block) => {
      const match = block.match(/序号\|(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (Number.isFinite(num)) {
          maxSeq = maxSeq === null ? num : Math.max(maxSeq, num);
        }
      }
    });
    return maxSeq;
  }, []);

  const update = (patch: Partial<TianjiSettings>) => {
    if (!onUpdateTianjiSettings) return;
    onUpdateTianjiSettings(normalize({ ...settings, ...patch }));
  };

  React.useEffect(() => {
    if (page !== 'settings') return;
    let cancelled = false;
    const computeFloor = () => {
      try {
        const latest = loadFromLatestMessage();
        if (!latest || latest.role !== 'assistant') return;
        if (typeof latest.messageId !== 'number' || latest.messageId < 0) return;
        const floor = Math.floor(latest.messageId / 2);
        if (!cancelled) {
          setCurrentFloor(floor);
          setCurrentSeq(floor);
        }
      } catch {
      }
    };
    computeFloor();
    const stopHandlers = [
      eventOn(tavern_events.MESSAGE_RECEIVED, computeFloor),
      eventOn(tavern_events.MESSAGE_UPDATED, computeFloor),
      eventOn(tavern_events.MESSAGE_EDITED, computeFloor),
      eventOn(tavern_events.CHAT_CHANGED, computeFloor)
    ];
    return () => {
      cancelled = true;
      stopHandlers.forEach(stop => stop.stop());
    };
  }, [page, extractLatestSeq]);

  const nextRefreshIn = React.useMemo(() => {
    const interval = Number(settings.refreshInterval) || 0;
    if (!interval || currentFloor === null) return null;
    const mod = currentFloor % interval;
    return mod === 0 ? 0 : interval - mod;
  }, [currentFloor, settings.refreshInterval]);
  const autoGateReason = React.useMemo(() => {
    if (!tianjiApiEnabled) return '自动生成未启用';
    if (!tianjiApiConfig?.apiurl || !tianjiApiConfig?.model) return 'API 配置不完整';
    const latest = loadFromLatestMessage();
    if (!latest) return '未检测到最新消息';
    if (latest.role !== 'assistant') return '最新消息不是 assistant';
    if (latest.isPending) return '最新消息仍在生成';
    if (!latest.maintext) return '最新消息缺少 <maintext>';
    return '';
  }, [tianjiApiConfig, tianjiApiEnabled, currentFloor]);

  React.useEffect(() => {
    if (page !== 'overview') return;
    let cancelled = false;
    const load = async () => {
      const result = await getWorldbookEntryContents(['[天机阁]天下大事']);
      if (cancelled) return;
      setTianjiNewsContent(result['[天机阁]天下大事'] || '');
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [page]);

  const updateApi = (patch: Partial<{ apiurl: string; key: string; model: string; retries: number }>) => {
    if (!onUpdateTianjiApiConfig) return;
    onUpdateTianjiApiConfig({ ...apiConfig, ...patch });
  };

  const normalizeApiUrl = (raw: string) => {
    const trimmed = (raw || '').trim();
    if (!trimmed) return '';
    if (/\/v1\/?$/.test(trimmed)) return trimmed.replace(/\/$/, '');
    return `${trimmed.replace(/\/$/, '')}/v1`;
  };

  const handleFetchModels = async () => {
    const normalizedUrl = normalizeApiUrl(apiConfig.apiurl || '');
    if (!normalizedUrl) {
      setOutputStatus('未测试');
      return;
    }
    setIsFetchingModels(true);
    try {
      let list: string[] = [];
      if (hasModelList) {
        list = await getModelList({ apiurl: normalizedUrl, key: apiConfig.key?.trim() });
      } else {
        const headers: Record<string, string> = {};
        const key = apiConfig.key?.trim();
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
      if (normalizedUrl !== apiConfig.apiurl.trim()) {
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
    const normalizedUrl = normalizeApiUrl(apiConfig.apiurl || '');
    if (!normalizedUrl) {
      setConnectStatus('未测试');
      return;
    }
    try {
      if (normalizedUrl !== apiConfig.apiurl.trim()) {
        updateApi({ apiurl: normalizedUrl });
      }
      const headers: Record<string, string> = {};
      const key = apiConfig.key?.trim();
      if (key) headers.Authorization = `Bearer ${key}`;
      const resp = await fetch(`${normalizedUrl.replace(/\/$/, '')}/models`, { headers });
      setConnectStatus(resp.ok ? '连接成功' : `失败(${resp.status})`);
    } catch {
      setConnectStatus('连接失败');
    }
  };

  const handleTestOutput = async () => {
    const normalizedUrl = normalizeApiUrl(apiConfig.apiurl || '');
    if (!normalizedUrl || !apiConfig.model) {
      setOutputStatus('未测试');
      toastr.error('请先填写 API URL 与模型');
      return;
    }
    try {
      if (normalizedUrl !== apiConfig.apiurl.trim()) {
        updateApi({ apiurl: normalizedUrl });
      }
      const maintext = getLatestMaintext();
      if (!maintext) {
        toastr.warning('未检测到最新楼层的 <maintext>');
      }
      const presetText = presetDraft
        .filter(rule => (rule as any).enabled ?? true)
        .map(rule => `【${rule.name}】\n${rule.content}`)
        .join('\n\n');
      const result = await runTianjiNewsWithFactionSelection({
        apiConfig: {
          ...apiConfig,
          apiurl: normalizedUrl
        },
        presetText,
        maintext
      });
      const ok = typeof result?.output === 'string' && result.output.trim().length > 0 && !result?.error;
      if (ok) {
        const floorNow = getCurrentFloorNow();
        await writeTianjiNewsEntry(result.output.trim(), {
          keepCount: settings.keepCount,
          floor: floorNow ?? undefined
        });
        setTianjiNewsContent(result.output.trim());
        toastr.success('天下大事生成成功');
      } else {
        toastr.error('天下大事生成失败');
      }
      setOutputStatus(ok ? '输出成功' : '输出异常');
    } catch {
      setOutputStatus('输出失败');
      toastr.error('天下大事生成失败');
    }
  };

  const handleGenerateNow = async () => {
    if (isGeneratingNow) return;
    const normalizedUrl = normalizeApiUrl(apiConfig.apiurl || '');
    if (!normalizedUrl || !apiConfig.model) {
      toastr.error('请先填写 API URL 与模型');
      return;
    }
    setIsGeneratingNow(true);
    try {
      if (normalizedUrl !== apiConfig.apiurl.trim()) {
        updateApi({ apiurl: normalizedUrl });
      }
      const maintext = getLatestMaintext();
      if (!maintext) {
        toastr.warning('未检测到最新楼层的 <maintext>');
      }
      const presetText = presetDraft
        .filter(rule => (rule as any).enabled ?? true)
        .map(rule => `【${rule.name}】\n${rule.content}`)
        .join('\n\n');
      const result = await runTianjiNewsWithFactionSelection({
        apiConfig: {
          ...apiConfig,
          apiurl: normalizedUrl
        },
        presetText,
        maintext
      });
      const ok = typeof result?.output === 'string' && result.output.trim().length > 0 && !result?.error;
      if (ok) {
        const floorNow = getCurrentFloorNow();
        await writeTianjiNewsEntry(result.output.trim(), {
          keepCount: settings.keepCount,
          floor: floorNow ?? undefined
        });
        setTianjiNewsContent(result.output.trim());
        toastr.success('天下大事生成成功');
      } else {
        toastr.error('天下大事生成失败');
      }
    } catch {
      toastr.error('天下大事生成失败');
    } finally {
      setIsGeneratingNow(false);
    }
  };

  const buildTianjiPreset = () => ([
    {
      id: activePresetId || 'tianji_news_preset',
      name: presetLibrary.find(preset => preset.id === activePresetId)?.name || '天下大事预设',
      description: '',
      created_at: new Date().toISOString(),
      rules: presetDraft,
      worldbook_refs: []
    }
  ]);

  const handleExportTianjiPreset = () => {
    try {
      const preset = buildTianjiPreset();
      const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '天下大事预设.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toastr.success('预设已导出');
    } catch (e: any) {
      toastr.error(`导出失败: ${e?.message || '未知错误'}`);
    }
  };

  const applyTianjiPreset = (preset: any) => {
    const record = Array.isArray(preset) ? preset[0] : preset;
    const rules = Array.isArray(record?.rules) ? record.rules : [];
    const next = rules.map((rule: any) => ({ ...rule, enabled: rule.enabled ?? true }));
    setPresetDraft(next);
    if (record?.id) setActivePresetId(record.id);
  };

  const handleImportTianjiPreset = async (file?: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      applyTianjiPreset(data);
      toastr.success('预设已导入');
    } catch (e: any) {
      toastr.error(`导入失败: ${e?.message || '文件格式错误'}`);
    }
  };

  const getRuleGroup = (rule: any) => {
    if (rule.group) return rule.group;
    const name = rule.name || '';
    if (['身份定义与核心使命', '演化的真实性与逻辑性', '任务与推演逻辑'].includes(name)) {
      return '核心规则';
    }
    if (name.includes('格式')) return '输出格式';
    if (name.includes('参考') || name.includes('世界书')) return '参考资料';
    return '其他规则';
  };

  const extractWorldbookRefs = (content?: string) => {
    if (!content) return [] as string[];
    const matches = content.match(/\{worldbook:([^}]+)\}/g);
    if (!matches) return [] as string[];
    return Array.from(new Set(matches.map(m => m.replace(/^\{worldbook:/, '').replace(/\}$/, '').trim()).filter(Boolean)));
  };

  const stripWorldbookRefs = (content?: string) => {
    if (!content) return '';
    return content.replace(/\{worldbook:[^}]+\}/g, '').trim();
  };

  const refreshWorldbookOptions = async () => {
    setIsFetchingWorldbook(true);
    try {
      const names = await listWorldbookEntryNames();
      setWorldbookOptions(names || []);
      if (!names || names.length === 0) {
        toastr.warning('未读取到角色卡绑定的世界书条目');
      } else {
        toastr.success(`已读取 ${names.length} 条世界书条目`);
      }
    } catch (e: any) {
      toastr.error(`读取世界书失败: ${e?.message || '未知错误'}`);
    } finally {
      setIsFetchingWorldbook(false);
    }
  };

  const updateRule = (index: number, patch: Partial<any>) => {
    const next = [...presetDraft];
    next[index] = { ...next[index], ...patch };
    setPresetDraft(next);
  };

  const groupedRules = React.useMemo(() => {
    const groups: Record<string, Array<{ rule: any; index: number }>> = {};
    presetDraft.forEach((rule, index) => {
      const group = getRuleGroup(rule);
      if (!groups[group]) groups[group] = [];
      groups[group].push({ rule, index });
    });
    return groups;
  }, [presetDraft]);

  const renderApiConfigPanel = (title: string, desc: string) => (
    <div className="space-y-4">
      <div className="p-4 bg-white/40 border border-emerald-400/90 rounded-2xl space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-slate-800">{title}</span>
          </div>
          <div className="flex bg-emerald-50/50 p-1 rounded-full border border-emerald-100">
            <button
              onClick={() => onToggleTianjiApi && onToggleTianjiApi(true)}
              className={`px-2 py-1 rounded-full text-[10px] font-black transition-all ${
                tianjiApiEnabled ? 'bg-emerald-500 text-white' : 'text-emerald-300 hover:text-emerald-500'
              }`}
            >
              启用
            </button>
            <button
              onClick={() => onToggleTianjiApi && onToggleTianjiApi(false)}
              className={`px-2 py-1 rounded-full text-[10px] font-black transition-all ${
                !tianjiApiEnabled ? 'bg-slate-500 text-white' : 'text-slate-300 hover:text-slate-500'
              }`}
            >
              关闭
            </button>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          {desc}
        </p>
      </div>

      <div className="p-4 bg-white/30 border border-emerald-400/90 rounded-2xl space-y-3 backdrop-blur-md">
        <div className="text-xs font-bold text-emerald-700 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {title}配置
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">API URL（OpenAI兼容）</label>
            <input
              className="w-full px-2.5 py-2 text-xs rounded-xl border border-emerald-100 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              placeholder="https://api.openai.com/v1 或 https://your-proxy/v1"
              value={apiConfig.apiurl}
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
              value={apiConfig.key}
              onChange={e => updateApi({ key: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">模型</label>
            <input
              className="w-full px-2.5 py-2 text-xs rounded-xl border border-emerald-100 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              placeholder="gpt-4o-mini"
              value={apiConfig.model}
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
            {modelOptions.length > 0 && (
              <div className="max-h-36 overflow-y-auto rounded-xl border border-emerald-100 bg-white/70 custom-scrollbar">
                {modelOptions.map(model => (
                  <button
                    key={model}
                    onClick={() => updateApi({ model })}
                    className={`w-full text-left px-3 py-2 text-xs border-b border-emerald-50 transition-colors ${
                      model === apiConfig.model ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-emerald-50'
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
              className="w-full px-2.5 py-2 text-xs rounded-xl border border-emerald-100 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              min={0}
              max={10}
              value={Number(apiConfig.retries || 0)}
              onChange={e => updateApi({ retries: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })}
            />
          </div>
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
  );

  if (variant === 'beauty') {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-emerald-400/90 bg-emerald-50/40 p-6">
          <div className="text-lg font-bold text-emerald-800 mb-2">美人榜</div>
          <p className="text-sm text-slate-600 leading-relaxed">
            此处将展示天下美人榜单与相关轶事。
          </p>
        </div>
        {renderApiConfigPanel('美人榜 API', '开启后，美人榜刷新将使用独立第4 API 生成。')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 bg-white/60 border border-emerald-100 rounded-full p-1">
        <button
          onClick={() => setPage('overview')}
          className={`flex-1 px-3 py-2 rounded-full text-xs font-black transition-all ${
            page === 'overview' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-emerald-600'
          }`}
        >
          概览
        </button>
        <button
          onClick={() => setPage('settings')}
          className={`flex-1 px-3 py-2 rounded-full text-xs font-black transition-all ${
            page === 'settings' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-emerald-600'
          }`}
        >
          设置
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

      {page === 'overview' && (
        <div className="space-y-4">
          {tianjiNewsContent ? (
            <div className="space-y-3">
              {parseNewsBlocks(tianjiNewsContent).map((entry, idx) => (
                <div
                  key={idx}
                  className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/40 to-white p-5 shadow-[0_12px_30px_-22px_rgba(16,185,129,0.5)]"
                >
                  <button
                    onClick={() => setOpenEventIndex(openEventIndex === idx ? null : idx)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-emerald-800">
                          {entry['事件标题'] || '天下大事'}
                        </div>
                        <div className="text-xs text-emerald-700/80">
                          {entry['时间'] || '未知时间'}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-emerald-600">
                        {openEventIndex === idx ? '收起' : '展开'}
                      </span>
                    </div>
                  </button>
                  {openEventIndex === idx && (
                    <>
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-emerald-800">
                        <span className="px-2 py-1 rounded-full bg-emerald-100/70">
                          {entry['地点'] || '未知地点'}
                        </span>
                        <span className="px-2 py-1 rounded-full bg-emerald-100/70">
                          {entry['事件类型'] || '未知类型'}
                        </span>
                      </div>
                      <div className="mt-3 border-t border-emerald-100/60 pt-4 text-[13px] leading-7 text-slate-700">
                        {entry['事件内容'] || ''}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white/60 p-6 text-sm text-slate-400 italic">
              暂无天下大事内容。
            </div>
          )}
        </div>
      )}

      {page === 'settings' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-400/90 bg-emerald-50/40 p-6">
            <div className="text-lg font-bold text-emerald-800 mb-2">天下大事</div>
            <p className="text-sm text-slate-600 leading-relaxed">
              立即生成将读取最新楼层&lt;maintext&gt;并写入世界书。
            </p>
            <div className="mt-4">
              <button
                onClick={handleGenerateNow}
                disabled={isGeneratingNow}
                className="px-4 py-2 text-xs font-black rounded-full border border-emerald-100 bg-white/80 text-emerald-700 hover:bg-emerald-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingNow ? '生成中...' : '立即生成'}
              </button>
            </div>
          </div>
          <div className="p-4 bg-white/40 border border-emerald-100 rounded-2xl space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-bold text-slate-800">刷新设置</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              按间隔自动生成天下大事，写入世界书：<span className="font-semibold">[天机阁]天下大事</span>
            </p>
            <p className="text-[10px] text-slate-400">
              N = 序号 = messageId / 2
            </p>
            <NumberField
              label="刷新触发间隔"
              value={settings.refreshInterval}
              min={1}
              max={500}
              hint="当序号为 N 的倍数且 > 0 时触发"
              onChange={(val) => update({ refreshInterval: val })}
            />
            <NumberField
              label="保留事件条数"
              value={settings.keepCount}
              min={1}
              max={50}
              hint="只保留最近 N 条（旧的会被裁剪）"
              onChange={(val) => update({ keepCount: val })}
            />
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>当前序号：{currentSeq === null ? '未知' : currentSeq}</span>
              <span>
                距离下次刷新：
                {nextRefreshIn === null ? '未知' : `${nextRefreshIn} 次`}
              </span>
            </div>
            {nextRefreshIn === 0 && autoGateReason && (
              <div className="text-[10px] text-amber-600">
                自动触发受阻：{autoGateReason}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
            <div className="text-[11px] text-emerald-700">
              默认值：刷新间隔 30
            </div>
            <button
              onClick={() => onUpdateTianjiSettings && onUpdateTianjiSettings(DEFAULTS)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-black rounded-full bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 transition"
            >
              <RefreshCcw className="w-3 h-3" />
              恢复默认
            </button>
          </div>

          <div className="p-4 bg-white/30 border border-emerald-400/90 rounded-2xl space-y-3 backdrop-blur-md">
            <button
              onClick={() => setPresetOpen(val => !val)}
              className="w-full flex items-center text-left relative"
              title={presetOpen ? '收起' : '展开'}
            >
              <div className="text-xs font-bold text-emerald-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                天下大事预设
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
                  <span>共 {presetDraft.length} 条规则 / 启用 {presetDraft.filter(rule => (rule as any).enabled ?? true).length}</span>
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
                  onClick={handleExportTianjiPreset}
                  className="px-2 py-1 text-[10px] font-bold rounded-lg border border-emerald-100 bg-white/70 text-emerald-700 hover:bg-emerald-50 transition-colors"
                >
                  导出预设
                </button>
                <input
                  ref={importPresetInputRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={e => handleImportTianjiPreset(e.target.files?.[0])}
                />
              </div>
              <div className="text-[10px] text-slate-400">
                当前预设：{presetLibrary.find(preset => preset.id === activePresetId)?.name || '未选择'}
              </div>
              <div className="space-y-3">
                {Object.keys(groupedRules).length === 0 && (
                  <div className="text-[10px] text-slate-400">暂无预设规则。</div>
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
                            const enabled = (rule as any).enabled ?? true;
                            const refs = extractWorldbookRefs(rule.content);
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
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = [...presetDraft];
                                      next[index] = { ...rule, enabled: !enabled };
                                      setPresetDraft(next);
                                    }}
                                    className={`ml-auto px-2 py-1 text-[10px] font-black rounded-full border transition-colors ${
                                      enabled
                                        ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                                        : 'border-slate-200 bg-white text-slate-400'
                                    }`}
                                  >
                                    {enabled ? '已启用' : '已停用'}
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
                                                    const baseContent = stripWorldbookRefs(rule.content);
                                                    const nextContent = nextSelected.length
                                                      ? `${baseContent}\n${nextSelected.map(n => `{worldbook:${n}}`).join('')}`
                                                      : baseContent;
                                                    updateRule(index, { content: nextContent.trim() });
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
                                    {refs.map(ref => (
                                      <span
                                        key={ref}
                                        className="px-3 py-1 rounded-full border border-emerald-100 bg-emerald-50 text-emerald-700"
                                      >
                                        {ref}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <textarea
                                  value={rule.content}
                                  rows={6}
                                  onChange={(e) => updateRule(index, { content: e.target.value })}
                                  className="w-full text-xs font-mono text-slate-700 bg-white/80 border border-emerald-100 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-200"
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
        </div>
      )}

      {page === 'api' && (
        renderApiConfigPanel('天下大事 API', '开启后，天下大事刷新将使用独立第4 API 生成。')
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
}> = ({ label, value, min, max, hint, onChange }) => (
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
        className="w-20 text-right px-2 py-1 rounded-lg border border-emerald-100 bg-white/70 text-sm font-mono text-slate-700"
      />
    </div>
  </div>
);

export default TianjiModal;
