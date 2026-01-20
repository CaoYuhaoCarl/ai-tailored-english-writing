import React, { useState } from 'react';
import { EssayData, ProcessingStatus } from '../types';
import { TrashIcon, BookOpenIcon, CheckCircleIcon, ExclamationCircleIcon, ArrowRightIcon, PencilSquareIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon } from './Icons';

interface Props {
  data: EssayData;
  onDelete: (id: string) => void;
  onUpdate: (id: string, newData: Partial<EssayData>) => void;
  onRetry?: (id: string) => void;
  onCancel?: (id: string) => void;
  onStartAi?: (id: string) => void;
}

const EssayCard: React.FC<Props> = ({ data, onDelete, onUpdate, onRetry, onCancel, onStartAi }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // State to toggle between List/Card view

  // Helper to handle nested updates (e.g. user manually editing a grade)
  const handleGradeChange = (field: string, value: any) => {
    if (!data.gradingResult) return;
    onUpdate(data.id, {
      gradingResult: {
        ...data.gradingResult,
        [field]: value
      }
    });
  };

  // Helper for root level updates (OCR text)
  const handleRootChange = (field: keyof EssayData, value: any) => {
    onUpdate(data.id, { [field]: value });
  };

  // Grammar specific handlers
  const handleGrammarChange = (index: number, field: 'original' | 'correction' | 'explanation' | 'type', value: string) => {
    if (!data.gradingResult) return;
    const newIssues = [...(data.gradingResult.grammar_issues || [])];
    newIssues[index] = { ...newIssues[index], [field]: value };
    handleGradeChange('grammar_issues', newIssues);
  };

  const handleDeleteGrammarIssue = (index: number) => {
    if (!data.gradingResult) return;
    const newIssues = (data.gradingResult.grammar_issues || []).filter((_, i) => i !== index);
    handleGradeChange('grammar_issues', newIssues);
  };

  const handleAddGrammarIssue = () => {
    if (!data.gradingResult) return;
    const newIssue = {
      type: "Grammar",
      original: "Error",
      correction: "Correction",
      explanation: "Explanation in Chinese"
    };
    const newIssues = [...(data.gradingResult.grammar_issues || []), newIssue];
    handleGradeChange('grammar_issues', newIssues);
  };

  // Lists (Strengths/Improvements) handlers
  const handleListChange = (field: 'strengths' | 'improvements', index: number, value: string) => {
    if (!data.gradingResult) return;
    const newList = [...(data.gradingResult[field] || [])];
    newList[index] = value;
    handleGradeChange(field, newList);
  };

  const handleDeleteListItem = (field: 'strengths' | 'improvements', index: number) => {
    if (!data.gradingResult) return;
    const newList = (data.gradingResult[field] || []).filter((_, i) => i !== index);
    handleGradeChange(field, newList);
  };

  const handleAddListItem = (field: 'strengths' | 'improvements') => {
    if (!data.gradingResult) return;
    const newList = [...(data.gradingResult[field] || []), "New point..."];
    handleGradeChange(field, newList);
  };

  // Calculate Grade Letter
  const getGradeLetter = (score: number, maxScore: number = 100) => {
    // Normalize to percentage if maxScore is different
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const getScoreColor = (score: number, maxScore: number = 20) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (percentage >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  // Color mapping for tags
  const getTagStyle = (type: string = 'Grammar') => {
    const t = type.toLowerCase();
    if (t.includes('vocab')) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (t.includes('grammar')) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (t.includes('struct')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (t.includes('spell')) return 'bg-rose-100 text-rose-700 border-rose-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const getProgressLabel = () => {
    switch (data.progressStep) {
      case 'ocr':
        return 'OCRing...';
      case 'ocr_complete':
        return 'OCR完成';
      case 'grading':
        return '批改中';
      case 'done':
        return '已完成';
      case 'cancelled':
        return '已取消';
      default:
        return '处理中';
    }
  };

  const hasTextReady = Boolean((data.ocrText && data.ocrText.trim()) || (data.rawText && data.rawText.trim()));
  const stepLabel = (status?: string) => {
    switch (status) {
      case 'processing':
        return '进行中';
      case 'done':
        return '完成';
      case 'error':
        return '错误';
      case 'skipped':
        return '跳过';
      default:
        return '待处理';
    }
  };

  const stepStyle = (status?: string) => {
    switch (status) {
      case 'done':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'processing':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'error':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'skipped':
        return 'bg-slate-50 text-slate-500 border-slate-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };
  const queuedOnly =
    data.status === ProcessingStatus.PENDING &&
    (!data.ocrStatus || data.ocrStatus === 'idle') &&
    (!data.gradingStatus || data.gradingStatus === 'idle');

  // --- LOADING STATE ---
  if (queuedOnly) {
    return (
      <div id={`essay-card-${data.id}`} className="bg-slate-50 rounded-xl border border-slate-200 border-dashed p-3 flex items-center justify-between opacity-70 hover:opacity-100 transition-opacity mb-3">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-200 rounded-lg overflow-hidden flex items-center justify-center text-xs text-slate-400">
            {data.imagePreview ? <img src={data.imagePreview} className="w-full h-full object-cover grayscale" alt="Thumbnail" /> : "TXT"}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-700">{data.studentName || "Submission"}</h4>
            <p className="text-xs text-slate-500">Waiting in queue...</p>
          </div>
        </div>
        <button onClick={() => onDelete(data.id)} className="text-slate-400 hover:text-rose-500 p-2">
          <TrashIcon />
        </button>
      </div>
    );
  }

  if (data.status === ProcessingStatus.PROCESSING) {
    return (
      <div id={`essay-card-${data.id}`} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 animate-pulse mb-4 flex items-center gap-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-1/2 skew-x-12 animate-[shimmer_1.5s_infinite] translate-x-[-150%]"></div>
        <div className="w-8 h-8 border-2 border-brand-100 border-t-brand-500 rounded-full animate-spin shrink-0"></div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-100 font-semibold">{getProgressLabel()}</span>
            <p className="text-slate-700 font-medium text-sm">{data.progressMessage || `AI Teacher is grading ${data.studentName ? `for ${data.studentName}` : ''}...`}</p>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full mt-2 w-full overflow-hidden">
            <div className="h-full bg-brand-400 w-2/3 animate-[shimmer_2s_infinite]"></div>
          </div>
        </div>
        {onCancel && (
          <button
            onClick={() => onCancel(data.id)}
            className="text-xs text-rose-600 hover:text-rose-700 font-medium px-3 py-1 border border-rose-200 rounded-md bg-white shadow-none"
          >
            取消批改
          </button>
        )}
      </div>
    );
  }

  if (data.status === ProcessingStatus.CANCELLED) {
    return (
      <div id={`essay-card-${data.id}`} className="bg-white rounded-xl shadow-sm border border-yellow-100 p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-50 p-2 rounded-full">
            <span className="text-yellow-600 font-bold text-lg">⏹</span>
          </div>
          <div>
            <p className="text-yellow-700 font-medium text-sm">批改已取消</p>
            <p className="text-xs text-slate-500 truncate max-w-xs">{data.errorMessage}</p>
            {data.ocrText && (
              <div className="mt-2 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded p-2 whitespace-pre-line max-h-24 overflow-hidden export-scroll-reset">
                <div className="font-semibold mb-1 text-slate-700">OCR 已完成，文本已保存：</div>
                {data.ocrText}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onRetry && (
            <button
              onClick={() => onRetry(data.id)}
              className="text-xs text-white bg-brand-600 hover:bg-brand-700 font-medium px-3 py-1 rounded-md shadow-sm"
            >
              重改
            </button>
          )}
          <button onClick={() => onDelete(data.id)} className="text-xs text-slate-600 hover:text-slate-900 font-medium px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-50">关闭</button>
        </div>
      </div>
    );
  }

  if (data.status === ProcessingStatus.ERROR) {
    return (
      <div id={`essay-card-${data.id}`} className="bg-white rounded-xl shadow-sm border border-rose-100 p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-rose-50 p-2 rounded-full">
            <span className="text-rose-500 font-bold text-lg">!</span>
          </div>
          <div>
            <p className="text-rose-700 font-medium text-sm">Analysis Failed</p>
            <p className="text-xs text-slate-500 truncate max-w-xs">{data.errorMessage}</p>
            {data.ocrText && (
              <div className="mt-2 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded p-2 whitespace-pre-line max-h-24 overflow-hidden export-scroll-reset">
                <div className="font-semibold mb-1 text-slate-700">OCR 已完成，文本已保存：</div>
                {data.ocrText}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onRetry && (
            <button
              onClick={() => onRetry(data.id)}
              className="text-xs text-white bg-brand-600 hover:bg-brand-700 font-medium px-3 py-1 rounded-md shadow-sm"
            >
              重改
            </button>
          )}
          <button onClick={() => onDelete(data.id)} className="text-xs text-rose-600 hover:text-rose-800 font-medium px-3 py-1 border border-rose-200 rounded-md hover:bg-rose-50">Dismiss</button>
        </div>
      </div>
    );
  }

  if (data.status === ProcessingStatus.IDLE) return null;

  // --- COMPACT MODE (Default) ---
  if (!isExpanded) {
    const maxScore = data.gradingResult?.score && data.gradingResult.score > 20 ? 100 : 20;
    const scoreValue = data.gradingResult?.score;
    const scoreClass = getScoreColor(scoreValue || 0, maxScore);
    const gradeLetter = typeof scoreValue === 'number' ? getGradeLetter(scoreValue, maxScore) : '--';
    const scoreDisplay = typeof scoreValue === 'number' ? scoreValue : '—';

    return (
      <div
        id={`essay-card-${data.id}`}
        className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer mb-3 relative overflow-hidden"
        onClick={() => setIsExpanded(true)}
      >
        {/* Hover indicator strip */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

        <div className="flex items-center p-4 gap-4">
          {/* Score Badge */}
          <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center border ${scoreClass} shrink-0`}>
            <span className="text-lg font-bold leading-none">{scoreDisplay}</span>
            <span className="text-[9px] uppercase font-bold opacity-60">{gradeLetter}</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 truncate">{data.studentName || "Unknown Student"}</h3>
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500 font-medium border border-slate-200">{data.date}</span>
            </div>
            <p className="text-sm text-slate-500 truncate mt-0.5 pr-4">
              {data.topic ? <span className="font-medium text-slate-600">{data.topic}: </span> : ""}
              {data.gradingResult?.summary_cn || "Click to view feedback..."}
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${stepStyle(data.gradingStatus)}`}>Carl：批改</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onStartAi && data.gradingStatus !== 'done' && hasTextReady && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartAi(data.id);
                }}
                className="px-2 py-1 text-xs text-white bg-brand-600 border border-brand-600 rounded-md hover:bg-brand-700 transition-colors"
              >
                开始AI
              </button>
            )}
            {onRetry && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry(data.id);
                }}
                className="px-2 py-1 text-xs text-brand-600 border border-brand-200 rounded-md bg-brand-50 hover:bg-brand-100 transition-colors"
              >
                重改
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onDelete(data.id); }} className="p-2 text-slate-300 hover:text-rose-500 transition-colors rounded-full hover:bg-rose-50" title="Delete">
              <TrashIcon />
            </button>
            <div className="text-slate-300 group-hover:text-brand-500 transition-colors pl-2 border-l border-slate-100">
              <ChevronDownIcon />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- EXPANDED MODE (Full Details) ---
  const expandedMaxScore = data.gradingResult?.score && data.gradingResult.score > 20 ? 100 : 20;
  const expandedScoreValue = data.gradingResult?.score;
  const expandedGradeLetter =
    typeof expandedScoreValue === 'number' ? getGradeLetter(expandedScoreValue, expandedMaxScore) : '--';
  return (
    <div id={`essay-card-${data.id}`} className="bg-[#FDFBF7] rounded-2xl shadow-md border border-slate-200 overflow-hidden print-break-after mb-8 relative animate-fade-in">

      {/* --- Header Section --- */}
      <div className="bg-[#FFF8F0] border-b border-slate-100 relative group">
        <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-sky-500 rounded-r-full"></div>

        <div className="px-8 py-6 flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(false)}>
          <div>
            {isEditing ? (
              <input
                type="text"
                className="font-bold text-slate-900 text-2xl tracking-tight bg-transparent border-b border-slate-300 focus:border-sky-400 focus:outline-none w-full"
                value={data.studentName || ""}
                placeholder="Student Name"
                onChange={(e) => handleRootChange('studentName', e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h3 className="font-bold text-slate-900 text-2xl tracking-tight">{data.studentName || "Unknown Student"}</h3>
            )}
            <div className="text-sm text-slate-500 mt-1 flex items-center gap-1">
              <span>Topic:</span>
              {isEditing ? (
                <input
                  type="text"
                  className="bg-transparent border-b border-slate-300 focus:border-sky-400 focus:outline-none text-slate-600 flex-1"
                  value={data.topic || ""}
                  placeholder="Topic"
                  onChange={(e) => handleRootChange('topic', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="text-slate-600">{data.topic || "General Submission"}</span>
              )}
              <span className="mx-1">•</span>
              <span>{data.date}</span>
            </div>
            <div className="flex gap-2 mt-2">
              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${stepStyle(data.gradingStatus)}`}>Carl：批改</span>
            </div>
          </div>

          <div className="flex items-center gap-6" onClick={e => e.stopPropagation()}>
            {/* --- Controls --- */}
            <div className="flex gap-2 no-print">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`p-2 rounded-full transition-all shadow-sm border ${isEditing ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-400 border-slate-200 hover:text-brand-600 hover:border-brand-200'}`}
                title={isEditing ? "Save Grading" : "Edit Grading"}
              >
                {isEditing ? <CheckIcon /> : <PencilSquareIcon />}
              </button>
              <button onClick={() => onDelete(data.id)} className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors shadow-sm" title="Delete Essay">
                <TrashIcon />
              </button>
              {onStartAi && data.gradingStatus !== 'done' && hasTextReady && (
                <button
                  onClick={(e) => { e.stopPropagation(); onStartAi(data.id); }}
                  className="p-2 bg-brand-600 border border-brand-600 rounded-full text-white hover:bg-brand-700 transition-colors shadow-sm"
                  title="开始AI批改"
                >
                  <ArrowRightIcon />
                </button>
              )}
              {onRetry && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRetry(data.id); }}
                  className="p-2 bg-white border border-brand-200 rounded-full text-brand-600 hover:text-brand-700 hover:bg-brand-50 transition-colors shadow-sm"
                  title="重改"
                >
                  重改
                </button>
              )}
            </div>

            <div className="w-px h-12 bg-slate-200/60 hidden sm:block"></div>

            {/* Score Box */}
            <div className="text-right">
              <div className="flex items-baseline justify-end gap-1">
                {isEditing ? (
                  <input
                    type="number"
                    step="0.1"
                    className="text-4xl font-bold text-sky-600 w-24 text-right bg-transparent border-b border-sky-200 focus:outline-none"
                    value={data.gradingResult?.score}
                    onChange={(e) => handleGradeChange('score', parseFloat(e.target.value) || 0)}
                  />
                ) : (
                  <span className="text-5xl font-bold text-sky-600 tracking-tighter">{expandedScoreValue ?? '—'}</span>
                )}
                <span className="text-lg text-slate-400 font-medium">/ {expandedMaxScore}</span>
              </div>
              <div className="text-slate-800 font-bold text-lg mt-1 flex items-center gap-1">
                <span>Grade:</span>
                {isEditing ? (
                  <input
                    type="text"
                    className="w-12 text-center bg-transparent border-b border-slate-300 focus:border-sky-400 focus:outline-none"
                    value={data.gradingResult?.grade || expandedGradeLetter}
                    placeholder="A"
                    onChange={(e) => handleGradeChange('grade', e.target.value.toUpperCase())}
                  />
                ) : (
                  <span>{data.gradingResult?.grade || expandedGradeLetter}</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 bg-white border border-slate-100 rounded-full p-1 shadow-sm text-slate-300 group-hover:text-brand-500 transition-colors cursor-pointer" onClick={() => setIsExpanded(false)}>
          <ChevronUpIcon />
        </div>
      </div>


      <div className="grid grid-cols-1 xl:grid-cols-12 gap-0">

        {/* --- Left Column: Source & OCR (4 cols) --- */}
        <div className="xl:col-span-5 p-8 border-r border-slate-200/60 bg-white/50 export-col-left">

          {/* Image Preview (Only if submission type is image or has preview) */}
          <div className="mb-8 export-section-image">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              Source
            </h4>
            {data.submissionType === 'image' && data.imagePreview ? (
              <div className="aspect-[3/4] w-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-inner group/image relative">
                <img src={data.imagePreview} alt="Student Work" className="w-full h-full object-cover transition-transform duration-500 group-hover/image:scale-105" />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors cursor-pointer" onClick={() => window.open(data.imagePreview, '_blank')}></div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-sm italic text-center">
                Submitted via Text Input
              </div>
            )}
          </div>

          {/* OCR / Raw Text Card */}
          <div className="bg-[#FFFDF5] border border-orange-100 rounded-xl overflow-hidden export-section-ocr">
            <div className="px-4 py-3 border-b border-orange-100/50 bg-orange-50/30 flex items-center gap-2">
              <BookOpenIcon />
              <h4 className="text-sm font-semibold text-slate-700">{data.submissionType === 'text' ? 'Essay Content' : 'OCR Transcription'}</h4>
            </div>

            <div className="p-4">
              {isEditing ? (
                <textarea
                  className="w-full h-64 p-3 bg-white rounded-lg border border-orange-200 text-base text-slate-700 font-serif leading-relaxed focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none resize-none shadow-inner"
                  value={data.ocrText}
                  onChange={(e) => handleRootChange('ocrText', e.target.value)}
                />
              ) : (
                <div className="text-base text-slate-700 font-serif leading-relaxed whitespace-pre-wrap h-auto max-h-[500px] overflow-y-auto pr-2 custom-scrollbar export-scroll-reset">
                  {data.ocrText}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- Right Column: Feedback & Grading (8 cols) --- */}
        <div className="xl:col-span-7 p-8 bg-[#FDFBF7] export-col-right">

          {/* Summary */}
          <div className="mb-8 export-section-summary">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Teacher's Summary</h4>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
              <div className="absolute left-0 top-4 bottom-4 w-1 bg-sky-400 rounded-r-full"></div>
              {isEditing ? (
                <textarea
                  className="w-full min-h-[80px] p-2 text-slate-700 border border-slate-200 rounded focus:outline-none focus:border-sky-400 resize-none"
                  value={data.gradingResult?.summary_cn}
                  onChange={(e) => handleGradeChange('summary_cn', e.target.value)}
                />
              ) : (
                <p className="text-slate-700 leading-relaxed pl-2">{data.gradingResult?.summary_cn}</p>
              )}
            </div>
          </div>

          {/* Strengths & Improvements Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 export-section-lists">

            {/* Strengths */}
            <div className="bg-emerald-50/50 rounded-xl border border-emerald-100 p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-emerald-100">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon />
                  <h5 className="font-bold text-emerald-800">Strengths</h5>
                </div>
                {isEditing && <button onClick={() => handleAddListItem('strengths')} className="text-xs text-emerald-600 hover:underline">+ Add</button>}
              </div>
              <ul className="space-y-3">
                {data.gradingResult?.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-emerald-900">
                    <span className="mt-1.5 w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0"></span>
                    {isEditing ? (
                      <div className="flex w-full gap-1">
                        <input
                          className="flex-1 bg-white/80 border-b border-emerald-200 focus:outline-none px-1 text-sm"
                          value={s}
                          onChange={(e) => handleListChange('strengths', i, e.target.value)}
                        />
                        <button onClick={() => handleDeleteListItem('strengths', i)} className="text-emerald-400 hover:text-emerald-700"><TrashIcon /></button>
                      </div>
                    ) : (
                      <span className="leading-snug">{s}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Areas for Improvement */}
            <div className="bg-rose-50/50 rounded-xl border border-rose-100 p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-rose-100">
                <div className="flex items-center gap-2">
                  <ExclamationCircleIcon />
                  <h5 className="font-bold text-rose-800">Areas for Improvement</h5>
                </div>
                {isEditing && <button onClick={() => handleAddListItem('improvements')} className="text-xs text-rose-600 hover:underline">+ Add</button>}
              </div>
              <ul className="space-y-3">
                {data.gradingResult?.improvements.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-rose-900">
                    <span className="mt-1.5 w-1.5 h-1.5 bg-rose-400 rounded-full shrink-0"></span>
                    {isEditing ? (
                      <div className="flex w-full gap-1">
                        <input
                          className="flex-1 bg-white/80 border-b border-rose-200 focus:outline-none px-1 text-sm"
                          value={s}
                          onChange={(e) => handleListChange('improvements', i, e.target.value)}
                        />
                        <button onClick={() => handleDeleteListItem('improvements', i)} className="text-rose-400 hover:text-rose-700"><TrashIcon /></button>
                      </div>
                    ) : (
                      <span className="leading-snug">{s}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Detailed Corrections */}
          <div className="export-section-corrections">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Detailed Corrections</h4>
              {isEditing && (
                <button onClick={handleAddGrammarIssue} className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-600 transition-colors">
                  + Add Correction
                </button>
              )}
            </div>

            <div className="flex flex-col gap-0 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm divide-y divide-slate-100">
              {data.gradingResult?.grammar_issues.map((issue, idx) => (
                <div key={idx} className="p-5 hover:bg-slate-50 transition-colors group/item relative">
                  {isEditing ? (
                    // --- EDIT MODE ROW ---
                    <div className="flex flex-col gap-3 pr-8">
                      <div className="flex gap-2">
                        <select
                          className="text-xs border border-slate-200 rounded p-1 bg-slate-50"
                          value={issue.type || "Grammar"}
                          onChange={(e) => handleGrammarChange(idx, 'type', e.target.value)}
                        >
                          <option value="Grammar">Grammar</option>
                          <option value="Vocabulary">Vocabulary</option>
                          <option value="Spelling">Spelling</option>
                          <option value="Structure">Structure</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          className="text-sm border border-slate-200 rounded px-2 py-1 text-rose-600 bg-rose-50/50"
                          value={issue.original}
                          placeholder="Original Error"
                          onChange={(e) => handleGrammarChange(idx, 'original', e.target.value)}
                        />
                        <input
                          className="text-sm border border-slate-200 rounded px-2 py-1 text-emerald-600 bg-emerald-50/50 font-medium"
                          value={issue.correction}
                          placeholder="Correction"
                          onChange={(e) => handleGrammarChange(idx, 'correction', e.target.value)}
                        />
                      </div>
                      <input
                        className="text-sm border border-slate-200 rounded px-2 py-1 text-slate-600 w-full"
                        value={issue.explanation}
                        placeholder="Explanation (Chinese)"
                        onChange={(e) => handleGrammarChange(idx, 'explanation', e.target.value)}
                      />
                      <button
                        onClick={() => handleDeleteGrammarIssue(idx)}
                        className="absolute top-3 right-3 text-slate-300 hover:text-rose-500"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ) : (
                    // --- VIEW MODE ROW ---
                    <div>
                      <div className="flex items-start gap-4 mb-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getTagStyle(issue.type)}`}>
                          {issue.type || "Grammar"}
                        </span>

                        <div className="flex-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                          <span className="text-rose-500 bg-rose-50 px-1 rounded-md error-strike">
                            {issue.original}
                          </span>
                          <ArrowRightIcon />
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-1 rounded-md">
                            {issue.correction}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 pl-[calc(60px+1rem)] leading-relaxed">
                        {issue.explanation}
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {(!data.gradingResult?.grammar_issues || data.gradingResult.grammar_issues.length === 0) && (
                <div className="p-8 text-center text-slate-400 italic">
                  No corrections needed. Great job!
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EssayCard;
