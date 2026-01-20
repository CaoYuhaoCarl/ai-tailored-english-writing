import React, { useState } from 'react';
import { AgentConfig, StudentLevel, ModelSettings, WorkflowMode, GradingPrompts } from '../types';
import { PlayIcon, Cog6ToothIcon } from './Icons';
import { MODEL_OPTIONS, getDefaultModelForProvider, providerLabels } from '../services/modelRegistry';
import { DEFAULT_GRADING_PROMPTS } from '../services/promptDefaults';
import PromptConfigPanel from './PromptConfigPanel';

interface Props {
  config: AgentConfig;
  setConfig: (c: AgentConfig) => void;
  pendingCount: number;
  workflowMode: WorkflowMode;
  onWorkflowModeChange: (mode: WorkflowMode) => void;
  onStartAiBatch: () => void;
  aiReadyCount: number;
  isProcessing: boolean;
  onStartProcessing: () => void;
}

const Sidebar: React.FC<Props> = ({
  config,
  setConfig,
  pendingCount,
  workflowMode,
  onWorkflowModeChange,
  onStartAiBatch,
  aiReadyCount,
  isProcessing,
  onStartProcessing
}) => {
  const [newFocus, setNewFocus] = useState("");

  const handleChangeLevel = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setConfig({ ...config, level: e.target.value as StudentLevel });
  };

  const handleScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({
      ...config,
      criteria: { ...config.criteria, maxScore: parseInt(e.target.value) || 20 }
    });
  };

  const toggleFocusArea = (area: string) => {
    const current = config.criteria.focusAreas;
    const next = current.includes(area)
      ? current.filter(a => a !== area)
      : [...current, area];
    setConfig({
      ...config,
      criteria: { ...config.criteria, focusAreas: next }
    });
  };

  const handleAddNewFocus = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFocus.trim() && !config.criteria.focusAreas.includes(newFocus.trim())) {
      setConfig({
        ...config,
        criteria: {
          ...config.criteria,
          focusAreas: [...config.criteria.focusAreas, newFocus.trim()]
        }
      });
      setNewFocus("");
    }
  };

  const defaultFocusOptions = ["单词拼写", "语法正确性", "书写工整", "高级句型", "逻辑连贯", "内容完整"];
  const modeOptions: { value: WorkflowMode; label: string; desc: string }[] = [
    { value: 'auto', label: '自动：OCR后连跑AI', desc: '默认模式，OCR完成后自动AI批改' },
    { value: 'ocr_only', label: '仅OCR', desc: '先保存OCR结果，稍后手动批改' },
    { value: 'ai_only', label: '仅AI批改', desc: '对已有文本/已OCR的稿件直接批改' }
  ];

  const modeLabelMap: Record<WorkflowMode, string> = {
    auto: '自动',
    ocr_only: '仅OCR',
    ai_only: '仅AI批改'
  };
  const startLabel = `开始（${modeLabelMap[workflowMode]}）`;

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value as ModelSettings["provider"];
    const nextModel = getDefaultModelForProvider(provider);
    setConfig({
      ...config,
      model: { provider, model: nextModel }
    });
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({
      ...config,
      model: { ...config.model, model: e.target.value }
    });
  };

  // 提示词配置处理
  const currentPrompts: GradingPrompts = config.prompts || { ...DEFAULT_GRADING_PROMPTS };

  const handlePromptsChange = (prompts: GradingPrompts) => {
    setConfig({ ...config, prompts });
  };

  return (
    <div className="w-80 bg-white border-r border-slate-200 flex-shrink-0 h-screen sticky top-0 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
      {/* Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100 bg-slate-50/50">
        <div className="p-1.5 bg-brand-600 rounded-lg mr-3 shadow-sm shadow-brand-200">
          <Cog6ToothIcon />
        </div>
        <h2 className="font-bold text-slate-800 text-lg">Grading Settings</h2>
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

        {/* Section 1: Basic Settings */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Parameters</h3>

          {/* Model Provider */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-600">AI Provider</label>
            <select
              disabled={isProcessing}
              value={config.model.provider}
              onChange={handleProviderChange}
              className="block w-full px-3 py-2.5 text-sm border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all shadow-sm"
            >
              {MODEL_OPTIONS.map((opt) => (
                <option key={`${opt.provider}-${opt.model}`} value={opt.provider}>
                  {providerLabels[opt.provider]}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">OpenAI/OpenRouter/Gemini/DeepSeek 需要在环境变量中设置对应 API Key。</p>
          </div>

          {/* Model Identifier */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Model ID</label>
            <input
              disabled={isProcessing}
              type="text"
              value={config.model.model}
              onChange={handleModelChange}
              className="block w-full px-3 py-2.5 border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm shadow-sm"
              placeholder="e.g., gpt-4o-mini / gemini-1.5-flash / deepseek-chat / openai/gpt-4o-mini"
            />
          </div>

          {/* Level */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Student Level</label>
            <select
              disabled={isProcessing}
              value={config.level}
              onChange={handleChangeLevel}
              className="block w-full px-3 py-2.5 text-sm border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all shadow-sm"
            >
              {Object.values(StudentLevel).map((lvl) => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
          </div>

          {/* Max Score */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Max Score</label>
            <div className="relative">
              <input
                disabled={isProcessing}
                type="number"
                value={config.criteria.maxScore}
                onChange={handleScoreChange}
                className="block w-full px-3 py-2.5 border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm shadow-sm"
              />
              <span className="absolute right-3 top-2.5 text-slate-400 text-sm">pts</span>
            </div>
          </div>
        </div>

        {/* Section 2: Focus Areas */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Processing Mode</h3>
          <div className="flex flex-col gap-2">
            {modeOptions.map((opt) => {
              const active = workflowMode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isProcessing}
                  onClick={() => onWorkflowModeChange(opt.value)}
                  className={`text-left px-3 py-2 rounded-lg border transition-colors ${active
                      ? 'bg-brand-50 border-brand-200 text-brand-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                >
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>{opt.label}</span>
                    {active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">当前</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Focus Areas</h3>
            <span className="text-xs text-slate-400">{config.criteria.focusAreas.length} selected</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Render Combined Options (Default + Custom) */}
            {Array.from(new Set([...defaultFocusOptions, ...config.criteria.focusAreas])).map(area => {
              const isSelected = config.criteria.focusAreas.includes(area);
              return (
                <button
                  key={area}
                  disabled={isProcessing}
                  onClick={() => toggleFocusArea(area)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${isSelected
                      ? 'bg-brand-50 text-brand-700 border-brand-200 shadow-sm'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                >
                  {area}
                </button>
              )
            })}
          </div>

          {/* Add New */}
          <form onSubmit={handleAddNewFocus} className="relative mt-2">
            <input
              type="text"
              placeholder="+ Add custom criteria..."
              value={newFocus}
              onChange={(e) => setNewFocus(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-dashed border-slate-300 rounded-lg bg-transparent hover:border-brand-300 focus:border-brand-500 focus:outline-none transition-colors"
            />
          </form>
        </div>

        {/* Section 4: Prompt Settings */}
        <PromptConfigPanel
          prompts={currentPrompts}
          onChange={handlePromptsChange}
          disabled={isProcessing}
        />

      </div>

      {/* Footer Action */}
      <div className="p-6 bg-white border-t border-slate-100">
        <button
          onClick={onStartProcessing}
          disabled={pendingCount === 0 || isProcessing}
          className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold shadow-lg transition-all transform active:scale-95 ${pendingCount > 0 && !isProcessing
              ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand-200'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
        >
          {isProcessing ? (
            <span className="animate-pulse">Processing...</span>
          ) : (
            <>
              <PlayIcon />
              {startLabel} ({pendingCount})
            </>
          )}
        </button>
        <button
          onClick={onStartAiBatch}
          disabled={aiReadyCount === 0 || isProcessing}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 mt-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          批量AI批改（{aiReadyCount}）
        </button>
        {pendingCount > 0 && !isProcessing && (
          <p className="text-center text-xs text-slate-500 mt-2">
            {pendingCount} 条可按当前模式处理
          </p>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
