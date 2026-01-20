import React, { useMemo } from 'react';
import { EssayData } from '../types';

interface Props {
  essays: EssayData[];
}

const AnalyticsDashboard: React.FC<Props> = ({ essays }) => {
  const completedEssays = essays.filter(e => e.gradingResult);
  
  const stats = useMemo(() => {
    if (completedEssays.length === 0) return null;

    const scores = completedEssays.map(e => e.gradingResult!.score);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    // Grade Distribution
    const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    scores.forEach(s => {
      if (s >= 90) distribution.A++;
      else if (s >= 80) distribution.B++;
      else if (s >= 70) distribution.C++;
      else if (s >= 60) distribution.D++;
      else distribution.F++;
    });

    // Weakness Analysis
    const issueTypes: Record<string, number> = {};
    completedEssays.forEach(e => {
      e.gradingResult?.grammar_issues.forEach(issue => {
        const type = issue.type || "Grammar";
        issueTypes[type] = (issueTypes[type] || 0) + 1;
      });
    });
    // Sort by frequency
    const sortedIssues = Object.entries(issueTypes).sort((a, b) => b[1] - a[1]);

    return { avgScore, maxScore, minScore, distribution, sortedIssues };
  }, [completedEssays]);

  if (completedEssays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-2xl">
            📊
        </div>
        <p>No graded essays to analyze yet.</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 animate-fade-in">
        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="text-sm font-medium text-slate-500 mb-2">Average Score</h4>
                <div className="flex items-end gap-3">
                    <span className="text-4xl font-bold text-slate-900">{stats.avgScore}</span>
                    <span className="text-sm text-emerald-500 font-medium mb-1.5 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Avg
                    </span>
                </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="text-sm font-medium text-slate-500 mb-2">Highest Score</h4>
                <div className="flex items-end gap-3">
                    <span className="text-4xl font-bold text-brand-600">{stats.maxScore}</span>
                    <span className="text-sm text-slate-400 mb-1.5">Top student</span>
                </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="text-sm font-medium text-slate-500 mb-2">Total Processed</h4>
                <div className="flex items-end gap-3">
                    <span className="text-4xl font-bold text-purple-600">{completedEssays.length}</span>
                    <span className="text-sm text-slate-400 mb-1.5">essays</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Grade Distribution Chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-6">Grade Distribution</h3>
                <div className="flex items-end justify-around h-48 pt-4 pb-2">
                    {(['A', 'B', 'C', 'D', 'F'] as const).map((grade) => {
                        const count = stats.distribution[grade];
                        const percentage = (count / completedEssays.length) * 100;
                        const height = percentage === 0 ? 2 : percentage; // min height for visibility
                        
                        let color = 'bg-slate-200';
                        if (grade === 'A') color = 'bg-emerald-400';
                        if (grade === 'B') color = 'bg-brand-400';
                        if (grade === 'C') color = 'bg-yellow-400';
                        if (grade === 'D') color = 'bg-orange-400';
                        if (grade === 'F') color = 'bg-rose-400';

                        return (
                            <div key={grade} className="flex flex-col items-center gap-2 group w-12">
                                <span className="text-xs font-medium text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">{count}</span>
                                <div 
                                    className={`w-full rounded-t-lg transition-all duration-500 ${color}`} 
                                    style={{ height: `${height}%` }}
                                ></div>
                                <span className="font-bold text-slate-700">{grade}</span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Common Issues Horizontal Bar */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                 <h3 className="font-bold text-slate-800 mb-6">Common Weakness Areas</h3>
                 <div className="space-y-4">
                    {stats.sortedIssues.slice(0, 5).map(([type, count], index) => {
                         const maxCount = stats.sortedIssues[0][1];
                         const width = (count / maxCount) * 100;
                         
                         return (
                            <div key={type}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-slate-700">{type}</span>
                                    <span className="text-slate-500">{count} issues</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                    <div 
                                        className="bg-rose-400 h-2.5 rounded-full transition-all duration-1000" 
                                        style={{ width: `${width}%` }}
                                    ></div>
                                </div>
                            </div>
                         )
                    })}
                    {stats.sortedIssues.length === 0 && (
                        <p className="text-slate-400 text-sm text-center">No issues found yet.</p>
                    )}
                 </div>
            </div>
        </div>
    </div>
  );
};

export default AnalyticsDashboard;