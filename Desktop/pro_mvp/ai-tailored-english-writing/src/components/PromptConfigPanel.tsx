import React, { useState } from 'react';
import { GradingPrompts } from '../types';
import { DEFAULT_GRADING_PROMPTS } from '../services/promptDefaults';
import { ChevronDownIcon, ChevronUpIcon } from './Icons';

interface Props {
    prompts: GradingPrompts;
    onChange: (prompts: GradingPrompts) => void;
    disabled?: boolean;
}

const PromptConfigPanel: React.FC<Props> = ({ prompts, onChange, disabled }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleChange = (field: keyof GradingPrompts, value: string) => {
        onChange({ ...prompts, [field]: value });
    };

    const handleReset = () => {
        onChange({ ...DEFAULT_GRADING_PROMPTS });
    };

    const isDefault =
        prompts.summaryPrompt === DEFAULT_GRADING_PROMPTS.summaryPrompt &&
        prompts.strengthsPrompt === DEFAULT_GRADING_PROMPTS.strengthsPrompt &&
        prompts.improvementsPrompt === DEFAULT_GRADING_PROMPTS.improvementsPrompt;

    const promptFields: { key: keyof GradingPrompts; label: string; placeholder: string }[] = [
        {
            key: 'summaryPrompt',
            label: "Teacher's Summary",
            placeholder: '描述如何生成教师总评...'
        },
        {
            key: 'strengthsPrompt',
            label: 'Strengths',
            placeholder: '描述如何生成亮点列表...'
        },
        {
            key: 'improvementsPrompt',
            label: 'Areas for Improvement',
            placeholder: '描述如何生成改进建议...'
        }
    ];

    return (
        <div className="space-y-3">
            <div
                className="flex justify-between items-center cursor-pointer group"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-600 transition-colors">
                    Prompt Settings
                </h3>
                <div className="flex items-center gap-2">
                    {!isDefault && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            已修改
                        </span>
                    )}
                    <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                        {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    </span>
                </div>
            </div>

            {isExpanded && (
                <div className="space-y-4 animate-fade-in">
                    <p className="text-xs text-slate-400">
                        自定义批改提示词，用于指导 AI 生成批改报告的各个部分。
                    </p>

                    {promptFields.map(({ key, label, placeholder }) => (
                        <div key={key} className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-600">
                                {label}
                            </label>
                            <textarea
                                disabled={disabled}
                                value={prompts[key]}
                                onChange={(e) => handleChange(key, e.target.value)}
                                placeholder={placeholder}
                                rows={3}
                                className="block w-full px-3 py-2 text-xs border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all shadow-sm resize-none disabled:opacity-50"
                            />
                        </div>
                    ))}

                    <button
                        type="button"
                        disabled={disabled || isDefault}
                        onClick={handleReset}
                        className="w-full py-2 px-3 text-xs font-medium text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        重置为默认
                    </button>
                </div>
            )}
        </div>
    );
};

export default PromptConfigPanel;
