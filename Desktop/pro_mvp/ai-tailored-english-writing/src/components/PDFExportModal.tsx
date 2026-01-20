import React, { useState, useEffect } from 'react';
import { DocumentTextIcon } from './Icons';
import { EssayData } from '../types';

export interface ExportOptions {
  includeImage: boolean;
  includeOCR: boolean;
  includeSummary: boolean;
  includeLists: boolean;
  includeCorrections: boolean;
  fontScale: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: ExportOptions, selectedIds: string[]) => void;
  essays: EssayData[];
}

type ContentOptionKey = 'includeImage' | 'includeOCR' | 'includeSummary' | 'includeLists' | 'includeCorrections';

const PDFExportModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, essays }) => {
  // Content Options
  const [options, setOptions] = useState<Record<ContentOptionKey, boolean>>({
    includeImage: true,
    includeOCR: true,
    includeSummary: true,
    includeLists: true,
    includeCorrections: true
  });
  const [fontScale, setFontScale] = useState<number>(100);

  // Student Selection State
  const [selectionMode, setSelectionMode] = useState<'all' | 'custom'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const validEssays = essays.filter(e => e.gradingResult);
  const validEssayIds = validEssays.map((essay) => essay.id);
  const validEssayIdSet = new Set(validEssayIds);

  // Initialize selectedIds when essays change or modal opens
  useEffect(() => {
    if (isOpen) {
      const initialIds = essays.filter(e => e.gradingResult).map(e => e.id);
      setSelectedIds(new Set(initialIds));
      setSelectionMode('all');
      setFontScale(100);
    }
  }, [isOpen, essays]);

  const toggleOption = (key: ContentOptionKey) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAllOptions = () => {
    const contentKeys: ContentOptionKey[] = ['includeImage', 'includeOCR', 'includeSummary', 'includeLists', 'includeCorrections'];
    setOptions(prev => {
      const allSelected = contentKeys.every(key => prev[key]);
      const next = { ...prev };
      contentKeys.forEach(key => { next[key] = !allSelected; });
      return next;
    });
  };

  const toggleStudent = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectedCount = validEssayIds.reduce((count, id) => count + (selectedIds.has(id) ? 1 : 0), 0);

  const selectAllStudents = () => {
    setSelectedIds(new Set(validEssayIds));
  };

  const invertSelection = () => {
    const next = new Set<string>();
    validEssayIds.forEach((id) => {
      if (!selectedIds.has(id)) next.add(id);
    });
    setSelectedIds(next);
  };

  const handleConfirm = () => {
    // If 'all', pass all current essay IDs, otherwise pass the selected set
    const finalIds = selectionMode === 'all' 
      ? essays.map(e => e.id) 
      : Array.from(selectedIds).filter((id) => validEssayIdSet.has(id));
    
    onConfirm({ ...options, fontScale }, finalIds);
  };

  if (!isOpen) return null;

  const contentOptions: { key: ContentOptionKey; label: string }[] = [
    { key: 'includeImage', label: 'Original Student Image' },
    { key: 'includeOCR', label: 'OCR Text Transcription' },
    { key: 'includeSummary', label: "Teacher's Summary" },
    { key: 'includeLists', label: 'Strengths & Improvements' },
    { key: 'includeCorrections', label: 'Detailed Corrections' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in transform transition-all scale-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-3 flex-shrink-0">
          <div className="bg-brand-100 text-brand-600 p-2 rounded-lg">
            <DocumentTextIcon />
          </div>
          <div>
             <h3 className="text-lg font-bold text-slate-800">Export PDF</h3>
             <p className="text-xs text-slate-500">Customize content and select students</p>
          </div>
        </div>

        {/* Body - Scrollable */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
           
           {/* --- Section 1: Content to Include --- */}
           <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">1. Content Sections</h4>
                  <button 
                      onClick={toggleAllOptions} 
                      className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline"
                  >
                      {Object.values(options).every(Boolean) ? 'Deselect All' : 'Select All'}
                  </button>
           </div>

           <div className="space-y-2">
                {contentOptions.map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                        <span className="text-sm font-medium text-slate-700">{label}</span>
                        <input 
                          type="checkbox" 
                          checked={options[key]} 
                          onChange={() => toggleOption(key)}
                          className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                    </label>
                ))}
            </div>
           </div>

           {/* --- Section 2: Typography / Density --- */}
           <div className="mb-8">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">2. PDF 字体大小</h4>
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 shadow-sm">
                  <div className="flex items-center justify-between">
                      <div>
                          <p className="text-sm font-semibold text-slate-800">调整字体大小</p>
                          <p className="text-xs text-slate-500 mt-0.5">减小字体可减少页数，增大字体提升可读性</p>
                      </div>
                      <span className="text-sm font-bold text-slate-800">{fontScale}%</span>
                  </div>
                  <input 
                    type="range" 
                    min={80} 
                    max={130} 
                    step={5}
                    value={fontScale} 
                    onChange={(e) => setFontScale(parseInt(e.target.value, 10))}
                    className="w-full mt-3 accent-brand-600"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                      <span>更紧凑</span>
                      <span>默认</span>
                      <span>更宽松</span>
                  </div>
              </div>
           </div>

           {/* --- Section 3: Select Students --- */}
           <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">3. Select Students</h4>
              
              <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="selectionMode" 
                        checked={selectionMode === 'all'} 
                        onChange={() => setSelectionMode('all')}
                        className="text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm font-medium text-slate-700">All Students ({essays.length})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="selectionMode" 
                        checked={selectionMode === 'custom'} 
                        onChange={() => setSelectionMode('custom')}
                        className="text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm font-medium text-slate-700">Select Manually</span>
                  </label>
              </div>

              {selectionMode === 'custom' && (
                <>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span>已选择 {selectedCount} / {validEssays.length}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllStudents}
                        className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline"
                      >
                        全选
                      </button>
                      <button
                        type="button"
                        onClick={invertSelection}
                        className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline"
                      >
                        反选
                      </button>
                    </div>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar">
                      {validEssays.length === 0 && (
                          <p className="p-4 text-sm text-slate-400 text-center italic">No essays available.</p>
                      )}
                      {validEssays.map((essay) => (
                          <label key={essay.id} className="flex items-center gap-3 p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors">
                              <input 
                                type="checkbox" 
                                checked={selectedIds.has(essay.id)}
                                onChange={() => toggleStudent(essay.id)}
                                className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                              />
                              <div className="flex-1">
                                  <p className="text-sm font-semibold text-slate-800">{essay.studentName || "Unknown Student"}</p>
                                  <p className="text-xs text-slate-400">{essay.topic || "No Topic"} • Grade: {essay.gradingResult?.score}</p>
                              </div>
                          </label>
                      ))}
                  </div>
                </>
              )}
           </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
            <button 
               onClick={onClose} 
               className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
               Cancel
            </button>
            <button 
               onClick={handleConfirm}
               className="px-4 py-2 text-sm font-bold text-white bg-brand-600 rounded-lg hover:bg-brand-700 shadow-sm shadow-brand-200 flex items-center gap-2 transition-colors"
            >
               Generate PDF
            </button>
        </div>
      </div>
    </div>
  );
};

export default PDFExportModal;
