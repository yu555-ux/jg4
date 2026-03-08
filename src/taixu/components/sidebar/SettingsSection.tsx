import React from 'react';
import { Zap, ZapOff } from 'lucide-react';

interface Props {
  isStreaming: boolean;
  onToggleStreaming: (val: boolean) => void;
  isFocusMode: boolean;
  onToggleFocusMode: (val: boolean) => void;
  focusSettings?: {
    hideInterval: number;
    keepCount: number;
  };
  onUpdateFocusSettings?: (settings: any) => void;
  richTextSettings: {
    quoteColor: string;
    singleStarColor: string;
    doubleStarColor: string;
    bracketColor: string;
    quoteBold: boolean;
    quoteItalic: boolean;
    singleStarBold: boolean;
    singleStarItalic: boolean;
    doubleStarBold: boolean;
    doubleStarItalic: boolean;
    bracketBold: boolean;
    bracketItalic: boolean;
    uiHeight?: number;
    uiWidth?: number;
    sidebarWidth?: number;
    secondaryModalWidth?: number;
    secondaryModalHeight?: number;
    topBarGap?: number;
  };
  textFont: string;
  onUpdateRichText: (settings: any) => void;
  onUpdateFont: (font: string) => void;
}

const SettingsSection: React.FC<Props> = ({
  isStreaming,
  onToggleStreaming,
  isFocusMode,
  onToggleFocusMode,
  focusSettings,
  onUpdateFocusSettings,
  richTextSettings,
  textFont,
  onUpdateRichText,
  onUpdateFont
}) => {
  const colorOptions = [
    { name: '默认', value: '' },
    { name: '蓝色', value: 'text-blue-500' },
    { name: '红色', value: 'text-rose-500' },
    { name: '粉色', value: 'text-pink-400' },
    { name: '紫色', value: 'text-purple-500' },
    { name: '金色', value: 'text-amber-500' },
    { name: '翡翠', value: 'text-emerald-500' },
    { name: '深灰', value: 'text-slate-600' },
  ];

  const updateColor = (key: string, color: string) => {
    onUpdateRichText({ ...richTextSettings, [key]: color });
  };

  const fontOptions = [
    { name: '默认（宋体风格）', value: "'Noto Serif SC', serif" },
    { name: '手写', value: "'Zhi Mang Xing', cursive" },
    { name: '黑体', value: "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif" },
    { name: '宋体', value: "'SimSun', 'STSong', serif" },
  ];

  const updateRichStyle = (key: string, value: boolean) => {
    onUpdateRichText({ ...richTextSettings, [key]: value });
  };

  const updateNumber = (key: string, value: number) => {
    onUpdateRichText({ ...richTextSettings, [key]: value });
  };

  const uiHeight = Number(richTextSettings.uiHeight || 1200);
  const uiWidth = Number(richTextSettings.uiWidth || 1200);
  const sidebarWidth = Number(richTextSettings.sidebarWidth || 320);
  const secondaryModalWidth = Number(richTextSettings.secondaryModalWidth || 672);
  const secondaryModalHeight = Number(richTextSettings.secondaryModalHeight || 85);
  const topBarGap = Number(richTextSettings.topBarGap || 16);
  const focusDefaults = {
    hideInterval: 100,
    keepCount: 10
  };
  const focus = { ...focusDefaults, ...(focusSettings || {}) };
  const updateFocusNumber = (key: 'hideInterval' | 'keepCount', value: number) => {
    if (!onUpdateFocusSettings) return;
    onUpdateFocusSettings({ ...focus, [key]: value });
  };

  return (
    <div className="space-y-3">
        {/* 字体设置 */}
        <div className="p-3 bg-white/40 border border-emerald-400/90 rounded-lg space-y-3">
          <span className="text-sm text-slate-800 font-bold block border-b border-emerald-50 pb-1">字体设置</span>
          <div className="grid grid-cols-2 gap-2">
            {fontOptions.map(opt => (
              <button
                key={opt.name}
                onClick={() => onUpdateFont(opt.value)}
                className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                  textFont === opt.value
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                    : 'bg-white/60 text-slate-600 border-emerald-100 hover:border-emerald-300'
                }`}
                style={{ fontFamily: opt.value }}
              >
                {opt.name}
              </button>
            ))}
          </div>
        </div>

        {/* 输出模式 */}
        <div className="flex items-center justify-between p-3 bg-white/40 border border-emerald-400/90 rounded-lg">
          <div className="flex flex-col">
            <span className="text-sm text-slate-800 font-bold">输出模式</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-tighter">
              {isStreaming ? '流式显示 (实时加载)' : '非流式 (完整显示)'}
            </span>
          </div>
          <div className="flex bg-emerald-50/50 p-1 rounded-full border border-emerald-100">
            <button
              onClick={() => onToggleStreaming(true)}
              className={`p-1.5 rounded-full transition-all ${isStreaming ? 'bg-emerald-500 text-white shadow-sm' : 'text-emerald-300 hover:text-emerald-500'}`}
              title="开启流式"
            >
              <Zap className="w-4 h-4" />
            </button>
            <button
              onClick={() => onToggleStreaming(false)}
              className={`p-1.5 rounded-full transition-all ${!isStreaming ? 'bg-slate-500 text-white shadow-sm' : 'text-slate-300 hover:text-slate-500'}`}
              title="关闭流式"
            >
              <ZapOff className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 专注模式 */}
        <div className="flex items-center justify-between p-3 bg-white/40 border border-emerald-400/90 rounded-lg">
          <div className="flex flex-col">
            <span className="text-sm text-slate-800 font-bold">专注模式</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-tighter">
              {isFocusMode
                ? `达到${focus.hideInterval}层后开始隐藏，保留最近${focus.keepCount}层`
                : '完整上下文 (全量发送)'}
            </span>
          </div>
          <div className="flex bg-emerald-50/50 p-1 rounded-full border border-emerald-100">
            <button
              onClick={() => onToggleFocusMode(true)}
              className={`p-1.5 rounded-full transition-all ${isFocusMode ? 'bg-indigo-500 text-white shadow-sm' : 'text-indigo-300 hover:text-indigo-500'}`}
              title="开启专注模式"
            >
              <Zap className="w-4 h-4" />
            </button>
            <button
              onClick={() => onToggleFocusMode(false)}
              className={`p-1.5 rounded-full transition-all ${!isFocusMode ? 'bg-slate-500 text-white shadow-sm' : 'text-slate-300 hover:text-slate-500'}`}
              title="关闭专注模式"
            >
              <ZapOff className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-3 bg-white/40 border border-emerald-400/90 rounded-lg space-y-2">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">专注模式设置</div>
          <NumberField
            label="隐藏阈值"
            value={focus.hideInterval}
            min={1}
            max={5000}
            hint="达到该楼层后开始隐藏历史"
            onChange={(val) => updateFocusNumber('hideInterval', val)}
          />
          <NumberField
            label="保护楼层"
            value={focus.keepCount}
            min={1}
            max={5000}
            hint="始终保留最近 N 层不被隐藏"
            onChange={(val) => updateFocusNumber('keepCount', val)}
          />
          <div className="text-[10px] text-slate-400">
            触发后会隐藏：0 ~ (当前楼层 - 保护楼层)
          </div>
        </div>

        {/* 富文本设置 */}
        <div className="p-3 bg-white/40 border border-emerald-400/90 rounded-lg space-y-4">
          <span className="text-sm text-slate-800 font-bold block border-b border-emerald-50 pb-1">富文本颜色</span>

          <div className="space-y-3">
            <ColorPicker
              label="“对话内容”"
              value={richTextSettings.quoteColor}
              options={colorOptions}
              onChange={(val) => updateColor('quoteColor', val)}
            />
            <ColorPicker
              label="*心理描写*"
              value={richTextSettings.singleStarColor}
              options={colorOptions}
              onChange={(val) => updateColor('singleStarColor', val)}
            />
            <ColorPicker
              label="**危险情况**"
              value={richTextSettings.doubleStarColor}
              options={colorOptions}
              onChange={(val) => updateColor('doubleStarColor', val)}
            />
            <ColorPicker
              label="「特殊内容」"
              value={richTextSettings.bracketColor}
              options={colorOptions}
              onChange={(val) => updateColor('bracketColor', val)}
            />
          </div>

          <div className="space-y-2 pt-1">
            {[
              { label: '“对话内容”', boldKey: 'quoteBold', italicKey: 'quoteItalic' },
              { label: '*心理描写*', boldKey: 'singleStarBold', italicKey: 'singleStarItalic' },
              { label: '**危险情况**', boldKey: 'doubleStarBold', italicKey: 'doubleStarItalic' },
              { label: '「特殊内容」', boldKey: 'bracketBold', italicKey: 'bracketItalic' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => updateRichStyle(item.boldKey, !(richTextSettings as any)[item.boldKey])}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all ${
                      (richTextSettings as any)[item.boldKey]
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-white/60 text-slate-500 border-emerald-100 hover:border-emerald-300'
                    }`}
                  >
                    加粗
                  </button>
                  <button
                    onClick={() => updateRichStyle(item.italicKey, !(richTextSettings as any)[item.italicKey])}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all ${
                      (richTextSettings as any)[item.italicKey]
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-white/60 text-slate-500 border-emerald-100 hover:border-emerald-300'
                    }`}
                  >
                    斜体
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 布局设置 */}
        <div className="p-3 bg-white/40 border border-emerald-400/90 rounded-lg space-y-4">
          <span className="text-sm text-slate-800 font-bold block border-b border-emerald-50 pb-1">布局设置</span>

          <div className="space-y-3">
            <SliderField
              label="界面高度"
              value={uiHeight}
              unit="px"
              min={600}
              max={2000}
              step={20}
              onChange={(val) => updateNumber('uiHeight', val)}
            />
            <SliderField
              label="顶栏按钮间隙"
              value={topBarGap}
              unit="px"
              min={4}
              max={64}
              step={2}
              onChange={(val) => updateNumber('topBarGap', val)}
            />
            <SliderField
              label="侧边栏宽度"
              value={sidebarWidth}
              unit="px"
              min={240}
              max={520}
              step={10}
              onChange={(val) => updateNumber('sidebarWidth', val)}
            />
            <SliderField
              label="二级弹窗宽度"
              value={secondaryModalWidth}
              unit="px"
              min={280}
              max={1200}
              step={20}
              onChange={(val) => updateNumber('secondaryModalWidth', val)}
            />
            <SliderField
              label="二级弹窗高度"
              value={secondaryModalHeight}
              unit="vh"
              min={50}
              max={95}
              step={1}
              onChange={(val) => updateNumber('secondaryModalHeight', val)}
            />
          </div>
        </div>

    </div>
  );
};

const ColorPicker: React.FC<{ label: string, value: string, options: any[], onChange: (val: string) => void }> = ({ label, value, options, onChange }) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex justify-between items-center">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <span className={`text-[10px] font-bold ${value || 'text-slate-400'}`}>{options.find(o => o.value === value)?.name || '默认'}</span>
    </div>
    <div className="flex flex-wrap gap-1">
      {options.map(opt => (
        <button
          key={opt.name}
          onClick={() => onChange(opt.value)}
          className={`w-5 h-5 rounded-full border transition-all ${
            value === opt.value
              ? 'border-emerald-500 scale-110 shadow-sm'
              : 'border-transparent hover:scale-105'
          } ${opt.value ? opt.value.replace('text-', 'bg-') : 'bg-slate-200'}`}
          title={opt.name}
        />
      ))}
    </div>
  </div>
);

const SliderField: React.FC<{
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
}> = ({ label, value, unit, min, max, step, onChange }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <span className="text-[10px] font-bold text-emerald-600">{value}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-emerald-500"
    />
  </div>
);

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
        onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value || 0))))}
        className="w-20 text-right px-2 py-1 rounded-lg border border-emerald-100 bg-white/70 text-sm font-mono text-slate-700"
      />
    </div>
  </div>
);

export default SettingsSection;
