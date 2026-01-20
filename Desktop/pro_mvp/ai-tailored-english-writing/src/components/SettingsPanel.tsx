import React from 'react';
import { AgentConfig, StudentLevel } from '../types';

interface Props {
  config: AgentConfig;
  setConfig: (c: AgentConfig) => void;
  isProcessing: boolean;
}

const SettingsPanel: React.FC<Props> = ({ config, setConfig, isProcessing }) => {
  
  const handleChangeLevel = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setConfig({ ...config, level: e.target.value as StudentLevel });
  };

  const handleScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ 
      ...config, 
      criteria: { ...config.criteria, maxScore: parseInt(e.target.value) || 100 } 
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

  const availableFocus = ["Grammar", "Vocabulary", "Structure", "Creativity", "Task Response", "Coherence"];

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Grading Parameters</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Level Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-500 mb-1">Student Level</label>
          <div className="relative">
            <select 
              disabled={isProcessing}
              value={config.level}
              onChange={handleChangeLevel}
              className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md bg-slate-50"
            >
              {Object.values(StudentLevel).map((lvl) => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Max Score */}
        <div>
          <label className="block text-sm font-medium text-slate-500 mb-1">Total Score</label>
          <input 
            disabled={isProcessing}
            type="number" 
            value={config.criteria.maxScore}
            onChange={handleScoreChange}
            className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 sm:text-sm bg-slate-50"
          />
        </div>

        {/* Focus Areas */}
        <div>
          <label className="block text-sm font-medium text-slate-500 mb-2">Focus Areas</label>
          <div className="flex flex-wrap gap-2">
            {availableFocus.map(area => (
              <button
                key={area}
                disabled={isProcessing}
                onClick={() => toggleFocusArea(area)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  config.criteria.focusAreas.includes(area)
                    ? 'bg-brand-100 text-brand-600 border border-brand-200'
                    : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;