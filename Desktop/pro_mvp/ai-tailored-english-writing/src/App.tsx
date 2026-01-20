import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { AgentConfig, EssayData, ProcessingStatus, StudentLevel, WorkflowMode } from './types';
import { processEssayAgent } from './services/aiAgent';
import { transcribeHandwriting } from './services/handwritingOcr';
import { DEFAULT_MODEL } from './services/modelRegistry';
import { parseMarkdownFiles } from './services/markdownImport';
import { loadPersistedEssays, persistEssays } from './services/persistence';
import UploadZone from './components/UploadZone';
import EssayCard from './components/EssayCard';
import Sidebar from './components/Sidebar';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import PDFExportModal, { ExportOptions } from './components/PDFExportModal';
import { DownloadIcon, PrinterIcon, DocumentTextIcon, ChartBarIcon, ListBulletIcon, ChevronDownIcon, ChevronUpIcon } from './components/Icons';

declare global {
  interface Window {
    html2pdf?: any;
  }
}

const HTML2PDF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';

// --- Initial Config State ---
const INITIAL_CONFIG: AgentConfig = {
  level: StudentLevel.MIDDLE,
  criteria: {
    maxScore: 20, // Default 20 points
    focusAreas: ["Grammar", "Vocabulary"] // Default focus
  },
  model: { ...DEFAULT_MODEL }
};

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

const ensureHtml2Pdf = (): Promise<any> => {
  if (typeof window === 'undefined') return Promise.reject(new Error('PDF export is only available in the browser'));
  if (window.html2pdf) return Promise.resolve(window.html2pdf);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-html2pdf]');
    const handleLoad = () => window.html2pdf ? resolve(window.html2pdf) : reject(new Error('html2pdf failed to initialize'));
    const handleError = () => reject(new Error('无法加载PDF导出组件，请检查网络后重试'));

    if (existing) {
      existing.addEventListener('load', handleLoad, { once: true });
      existing.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = HTML2PDF_CDN;
    script.async = true;
    script.dataset.html2pdf = 'true';
    script.onload = handleLoad;
    script.onerror = handleError;
    document.head.appendChild(script);
  });
};

const App: React.FC = () => {
  const [config, setConfig] = useState<AgentConfig>(INITIAL_CONFIG);
  const [essays, setEssays] = useState<EssayData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list');
  const [sortOption, setSortOption] = useState<'added-desc' | 'added-asc' | 'name-asc' | 'name-desc'>('added-desc');
  const [batchFilter, setBatchFilter] = useState<'all' | 'batched' | 'unbatched'>('all');
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>(() => {
    if (typeof window === 'undefined') return 'auto';
    const saved = localStorage.getItem('workflowMode');
    return (saved as WorkflowMode) || 'auto';
  });
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);
  const hasScrolledAfterRestore = useRef(false);
  const abortControllers = useRef<Record<string, AbortController>>({});
  const persistTimeoutRef = useRef<number | undefined>(undefined);

  // Workflow Layout State
  const [isInputExpanded, setIsInputExpanded] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem('workflowMode', workflowMode);
    } catch (err) {
      console.warn('Could not persist workflow mode', err);
    }
  }, [workflowMode]);

  useEffect(() => {
    const restored = loadPersistedEssays();
    if (restored.length > 0) {
      setEssays(restored);
      setRestoredFromStorage(true);
    }
  }, []);

  useEffect(() => {
    if (persistTimeoutRef.current) {
      window.clearTimeout(persistTimeoutRef.current);
    }
    persistTimeoutRef.current = window.setTimeout(() => {
      persistEssays(essays);
    }, 600);

    return () => {
      if (persistTimeoutRef.current) {
        window.clearTimeout(persistTimeoutRef.current);
      }
    };
  }, [essays]);

  useEffect(() => {
    if (!restoredFromStorage || hasScrolledAfterRestore.current || essays.length === 0) return;
    hasScrolledAfterRestore.current = true;
    requestAnimationFrame(() => {
      const lastEssayId = essays[essays.length - 1].id;
      const el = document.getElementById(`essay-card-${lastEssayId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }, [restoredFromStorage, essays]);

  // --- Handler: File Upload (Images) ---
  const handleUploadFiles = useCallback(async (files: FileList) => {
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;
    const newEssays: EssayData[] = await Promise.all(fileArr.map(async (file) => {
      let imagePreview = '';
      try {
        imagePreview = await readFileAsDataUrl(file);
      } catch (err) {
        console.warn('Could not read file for preview', err);
        imagePreview = URL.createObjectURL(file);
      }
      return {
        id: Math.random().toString(36).substr(2, 9),
        submissionType: 'image',
        file,
        imagePreview,
        addedAt: new Date().toISOString(),
        sourceFileName: file.name,
        status: ProcessingStatus.PENDING,
        ocrText: "",
        ocrStatus: 'idle',
        gradingStatus: 'idle',
        progressStep: 'queued',
        progressMessage: 'Waiting in queue'
      };
    }));
    setEssays(prev => [...prev, ...newEssays]);
  }, []);

  // --- Handler: Markdown Upload ---
  const handleUploadMarkdown = useCallback(async (files: FileList) => {
    const fileArr = Array.from(files).slice(0, 100);
    if (fileArr.length === 0) return;
    const { essays: parsed, errors } = await parseMarkdownFiles(fileArr);
    if (errors.length) {
      console.warn('Markdown parse errors', errors);
      alert(`部分MD解析失败：\n${errors.join('\n')}`);
    }
    setEssays(prev => [...prev, ...parsed]);
  }, []);

  // --- Handler: Text Submission ---
  const handleTextSubmission = useCallback((data: { name: string; topic: string; text: string }) => {
    const newEssay: EssayData = {
      id: Math.random().toString(36).substr(2, 9),
      submissionType: 'text',
      status: ProcessingStatus.PENDING,
      studentName: data.name,
      topic: data.topic,
      addedAt: new Date().toISOString(),
      ocrText: "",
      ocrStatus: 'skipped',
      gradingStatus: 'idle',
      progressStep: 'queued',
      progressMessage: 'Waiting in queue',
      rawText: data.text
    };
    setEssays(prev => [...prev, newEssay]);
  }, []);

  const updateEssay = (id: string, payload: Partial<EssayData>) => {
    setEssays(prev => prev.map(e => e.id === id ? { ...e, ...payload } : e));
  };

  const registerController = (id: string) => {
    const controller = new AbortController();
    abortControllers.current[id] = controller;
    return controller;
  };

  const cleanupController = (id: string) => {
    delete abortControllers.current[id];
  };

  const hasTextContent = (essay: EssayData) => {
    return Boolean((essay.rawText && essay.rawText.trim()) || (essay.ocrText && essay.ocrText.trim()));
  };

  const markBatchTargets = (ids: string[], batchId: string) => {
    if (!ids.length) return;
    const idSet = new Set(ids);
    setEssays(prev => prev.map(e => (idSet.has(e.id) ? { ...e, batchId } : e)));
  };

  const visibleEssays = useMemo(() => {
    const filtered = essays.filter((essay) => {
      if (batchFilter === 'batched') return Boolean(essay.batchId);
      if (batchFilter === 'unbatched') return !essay.batchId;
      return true;
    });
    const entries = filtered.map((essay, index) => ({ essay, index }));
    const getAddedAtMs = (essay: EssayData) => {
      const parsed = essay.addedAt ? Date.parse(essay.addedAt) : Number.NaN;
      return Number.isNaN(parsed) ? 0 : parsed;
    };
    const getFileKey = (essay: EssayData) => {
      return (essay.sourceFileName || essay.studentName || essay.topic || essay.id || '').toLowerCase();
    };

    entries.sort((a, b) => {
      let cmp = 0;
      switch (sortOption) {
        case 'added-asc':
          cmp = getAddedAtMs(a.essay) - getAddedAtMs(b.essay);
          break;
        case 'added-desc':
          cmp = getAddedAtMs(b.essay) - getAddedAtMs(a.essay);
          break;
        case 'name-asc':
          cmp = getFileKey(a.essay).localeCompare(getFileKey(b.essay), undefined, { numeric: true, sensitivity: 'base' });
          break;
        case 'name-desc':
          cmp = getFileKey(b.essay).localeCompare(getFileKey(a.essay), undefined, { numeric: true, sensitivity: 'base' });
          break;
        default:
          cmp = 0;
      }
      return cmp === 0 ? a.index - b.index : cmp;
    });

    return entries.map((entry) => entry.essay);
  }, [essays, sortOption, batchFilter]);

  const pickTargetsForMode = (mode: WorkflowMode) => {
    return essays.filter((e) => {
      if (e.status === ProcessingStatus.PROCESSING) return false;
      const needsOcr = e.submissionType === 'image' && e.ocrStatus !== 'done';
      const needsAi = e.gradingStatus !== 'done';
      if (mode === 'ocr_only') return needsOcr;
      if (mode === 'ai_only') return needsAi && hasTextContent(e);
      return needsOcr || needsAi;
    });
  };

  const runOcrStep = async (essay: EssayData, options: { continueToAi?: boolean } = {}) => {
    if (essay.submissionType !== 'image' || !essay.file) return essay;
    const controller = registerController(essay.id);
    updateEssay(essay.id, {
      status: ProcessingStatus.PROCESSING,
      ocrStatus: 'processing',
      progressStep: 'ocr',
      progressMessage: '正在执行手写OCR...'
    });

    try {
      const text = await transcribeHandwriting(essay.file, { signal: controller.signal });
      const updated: EssayData = {
        ...essay,
        ocrText: text,
        ocrStatus: 'done',
        progressStep: 'ocr_complete',
        progressMessage: options.continueToAi ? 'OCR完成，准备AI批改' : 'OCR完成，等待AI',
        status: options.continueToAi ? ProcessingStatus.PROCESSING : ProcessingStatus.PENDING
      };
      updateEssay(essay.id, updated);
      return updated;
    } catch (err: any) {
      const cancelled = err?.message?.toLowerCase().includes('cancelled') || err?.name === 'AbortError';
      updateEssay(essay.id, {
        status: cancelled ? ProcessingStatus.CANCELLED : ProcessingStatus.ERROR,
        ocrStatus: cancelled ? 'skipped' : 'error',
        progressStep: cancelled ? 'cancelled' : 'error',
        progressMessage: cancelled ? '用户已取消批改' : err?.message || 'OCR失败',
        errorMessage: err?.message
      });
      throw err;
    } finally {
      cleanupController(essay.id);
    }
  };

  const runGradingStep = async (essay: EssayData) => {
    const controller = registerController(essay.id);
    updateEssay(essay.id, {
      status: ProcessingStatus.PROCESSING,
      gradingStatus: 'processing',
      progressStep: 'grading',
      progressMessage: `AI批改中（${config.model.provider}:${config.model.model}）`
    });

    try {
      const result = await processEssayAgent(
        { ...essay, ocrText: essay.ocrText || essay.rawText || '' },
        config,
        (update) => {
          updateEssay(essay.id, {
            ...update,
            gradingStatus: update.progressStep === 'done' ? 'done' : 'processing'
          });
        },
        { skipOcr: true, signal: controller.signal }
      );

      const updated: EssayData = {
        ...essay,
        ...result,
        status: ProcessingStatus.COMPLETED,
        gradingStatus: 'done',
        ocrStatus: result.ocrText ? (essay.ocrStatus || 'done') : essay.ocrStatus,
        progressStep: 'done',
        progressMessage: '批改完成'
      };
      updateEssay(essay.id, updated);
      return updated;
    } catch (err: any) {
      const cancelled = err?.message?.toLowerCase().includes('cancelled') || err?.name === 'AbortError';
      updateEssay(essay.id, {
        status: cancelled ? ProcessingStatus.CANCELLED : ProcessingStatus.ERROR,
        gradingStatus: cancelled ? 'skipped' : 'error',
        progressStep: cancelled ? 'cancelled' : 'error',
        progressMessage: cancelled ? '用户已取消批改' : err?.message || 'AI批改失败',
        errorMessage: err?.message
      });
      throw err;
    } finally {
      cleanupController(essay.id);
    }
  };

  // --- Handler: Start Processing Queue ---
  const handleStartProcessing = async () => {
    const targets = pickTargetsForMode(workflowMode);
    if (targets.length === 0) return;
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    markBatchTargets(targets.map((essay) => essay.id), batchId);

    setIsProcessing(true);
    setActiveTab('list');
    setIsInputExpanded(false); // Auto collapse input to focus on results

    try {
      for (const essay of targets) {
        try {
          let current = essay;
          const needsOcr = current.submissionType === 'image' && current.ocrStatus !== 'done';
          const needsAi = current.gradingStatus !== 'done';

          if (workflowMode !== 'ai_only' && needsOcr) {
            current = await runOcrStep(current, { continueToAi: workflowMode === 'auto' });
          }

          const shouldGrade = workflowMode !== 'ocr_only' && needsAi;
          if (shouldGrade) {
            if (!hasTextContent(current)) {
              updateEssay(current.id, {
                status: ProcessingStatus.ERROR,
                gradingStatus: 'error',
                progressStep: 'error',
                progressMessage: '缺少可批改的文本，请先完成OCR',
                errorMessage: '缺少可批改的文本，请先完成OCR'
              });
              continue;
            }
            await runGradingStep(current);
          }
        } catch (err) {
          console.error('Processing failed', err);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = async (id: string) => {
    const target = essays.find((e) => e.id === id);
    if (!target) return;

    setIsProcessing(true);
    setActiveTab('list');
    try {
      await runGradingStep(target);
    } catch (err) {
      console.error('Retry failed', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartAiForEssay = async (id: string) => {
    const target = essays.find((e) => e.id === id);
    if (!target) return;
    if (!hasTextContent(target)) {
      updateEssay(id, {
        progressStep: 'error',
        progressMessage: '缺少可批改的文本，请先完成OCR',
        status: ProcessingStatus.ERROR,
        gradingStatus: 'error',
        errorMessage: '缺少可批改的文本，请先完成OCR'
      });
      return;
    }
    setIsProcessing(true);
    setActiveTab('list');
    try {
      await runGradingStep(target);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchAi = async () => {
    const aiTargets = essays.filter(
      (e) => e.gradingStatus !== 'done' && e.status !== ProcessingStatus.PROCESSING && hasTextContent(e)
    );
    if (aiTargets.length === 0) return;
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    markBatchTargets(aiTargets.map((essay) => essay.id), batchId);
    setIsProcessing(true);
    setActiveTab('list');
    try {
      await Promise.all(
        aiTargets.map(async (essay) => {
          try {
            await runGradingStep(essay);
          } catch (err) {
            console.error('Batch AI failed for', essay.id, err);
          }
        })
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = (id: string) => {
    const controller = abortControllers.current[id];
    controller?.abort();
    setEssays(prev => prev.map(e => e.id === id ? {
      ...e,
      status: ProcessingStatus.CANCELLED,
      ocrStatus: 'skipped',
      gradingStatus: 'skipped',
      progressStep: 'cancelled',
      progressMessage: '批改已取消',
      errorMessage: '用户已取消批改'
    } : e));
  };

  // --- Handler: Delete Essay ---
  const handleDelete = (id: string) => {
    setEssays(prev => prev.filter(e => e.id !== id));
  };

  const handleClearAll = () => {
    if (!essays.length) return;
    const confirmClear = window.confirm('确定清空所有AI批改记录？此操作不可撤销。');
    if (!confirmClear) return;
    setEssays([]);
    persistEssays([]);
  };

  // --- Handler: Update Essay (Edit) ---
  const handleUpdate = (id: string, newData: Partial<EssayData>) => {
    setEssays(prev => prev.map(e => e.id === id ? { ...e, ...newData } : e));
  };

  // --- Handler: Batch Download (JSON) ---
  const handleDownloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(essays, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "essay_grading_results.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // --- Handler: Open PDF Modal ---
  const handleOpenPdfModal = () => {
    if (isExporting || completedCount === 0) return;
    setShowPdfModal(true);
  };

  // --- Handler: Execute PDF Export with Options ---
  const executePdfExport = async (options: ExportOptions, selectedIds: string[]) => {
    // 1. Close Modal Immediately to prevent it from being captured or causing overlay issues
    setShowPdfModal(false);
    setIsExporting(true);

    // Apply temporary CSS classes to body based on options
    if (!options.includeImage) document.body.classList.add('export-hide-image');
    if (!options.includeOCR) document.body.classList.add('export-hide-ocr');
    if (!options.includeSummary) document.body.classList.add('export-hide-summary');
    if (!options.includeLists) document.body.classList.add('export-hide-lists');
    if (!options.includeCorrections) document.body.classList.add('export-hide-corrections');

    if (!options.includeImage && !options.includeOCR) {
      document.body.classList.add('export-hide-col-left');
    }

    document.body.classList.add('exporting-pdf');
    const root = document.documentElement;
    const previousRootFontSize = root.style.fontSize;
    root.style.fontSize = `${options.fontScale || 100}%`;

    // 2. Filtering Logic: Hide essays that are NOT in selectedIds
    const essaysToHide = essays.filter(e => !selectedIds.includes(e.id));
    essaysToHide.forEach(e => {
      const el = document.getElementById(`essay-card-${e.id}`);
      if (el) el.classList.add('export-hidden');
    });

    // 3. Force white background on container for clean PDF
    const container = document.getElementById('essays-container');
    const previousFontSize = container?.style.fontSize;
    if (container) {
      container.style.fontSize = `${options.fontScale || 100}%`;
    }
    if (container) {
      container.classList.add('export-force-white');
      // Note: removed 'export-contrast' class to preserve text sharpness
    }

    // Wait for DOM to update
    await Promise.all([
      new Promise(resolve => setTimeout(resolve, 1000)),
      // Ensure web fonts have finished loading so weights render correctly in the snapshot
      (document.fonts?.ready ?? Promise.resolve())
    ]);

    if (!container) {
      cleanupPdfExport(essaysToHide, container, undefined, previousRootFontSize);
      return;
    }

    const opt = {
      margin: [10, 10],
      filename: `EssayFlow_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'png', quality: 1 },
      html2canvas: {
        scale: Math.max(window.devicePixelRatio * 2, 2),  // Adaptive to device, minimum 2x
        useCORS: true,
        scrollY: 0,
        scrollX: 0,
        backgroundColor: '#ffffff',
        width: container.scrollWidth,   // Capture full content width
        height: container.scrollHeight, // Capture full content height
        letterRendering: true,    // Better text quality
        logging: false,           // Cleaner console
        onclone: (clonedDoc: Document) => {
          // Make sure cloned snapshot keeps the same export flags and forces full opacity
          clonedDoc.body.classList.add('exporting-pdf');
          clonedDoc.documentElement.style.fontSize = `${options.fontScale || 100}%`;
          const clonedContainer = clonedDoc.getElementById('essays-container');
          if (clonedContainer) {
            clonedContainer.classList.add('export-force-white');
            // Note: removed 'export-contrast' class to preserve text sharpness
            clonedContainer.setAttribute('data-export-font-scale', `${options.fontScale || 100}`);
            (clonedContainer as HTMLElement).style.fontSize = `${options.fontScale || 100}%`;
          }
        }
      }, // Higher scale for clarity + force solid bg
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], after: '.print-break-after' }
    };

    let html2pdfLib: any;
    try {
      html2pdfLib = await ensureHtml2Pdf();
    } catch (error) {
      console.error('Failed to load html2pdf library', error);
      alert(error instanceof Error ? error.message : '无法加载PDF导出组件，请稍后再试');
      cleanupPdfExport(essaysToHide, container, previousFontSize, previousRootFontSize);
      return;
    }

    try {
      await html2pdfLib()
        .set({
          margin: [10, 10],
          filename: `EssayFlow_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
          image: { type: 'png', quality: 1 },
          html2canvas: {
            scale: Math.min(Math.max((window.devicePixelRatio || 1) * 1.5, 2), 3),
            useCORS: true,
            scrollY: 0,
            scrollX: 0,
            backgroundColor: '#ffffff',
            letterRendering: true,
            logging: false,
            onclone: (clonedDoc: Document) => {
              clonedDoc.body.classList.add('exporting-pdf');
              clonedDoc.documentElement.style.fontSize = `${options.fontScale || 100}%`;
              const clonedContainer = clonedDoc.getElementById('essays-container');
              if (clonedContainer) {
                clonedContainer.classList.add('export-force-white');
                clonedContainer.setAttribute('data-export-font-scale', `${options.fontScale || 100}`);
                (clonedContainer as HTMLElement).style.fontSize = `${options.fontScale || 100}%`;
              }
            }
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'], after: '.print-break-after' }
        })
        .from(container)
        .save();
    } catch (error) {
      console.error("PDF generation failed", error);
      alert("Could not generate PDF. Please try the Print option.");
    } finally {
      cleanupPdfExport(essaysToHide, container, previousFontSize, previousRootFontSize);
    }
  };

  const cleanupPdfExport = (hiddenEssays: EssayData[], containerEl?: HTMLElement | null, previousFontSize?: string, previousRootFontSize?: string) => {
    document.body.classList.remove(
      'exporting-pdf',
      'export-hide-image',
      'export-hide-ocr',
      'export-hide-summary',
      'export-hide-lists',
      'export-hide-corrections',
      'export-hide-col-left'
    );

    // Remove filtering classes
    hiddenEssays.forEach(e => {
      const el = document.getElementById(`essay-card-${e.id}`);
      if (el) el.classList.remove('export-hidden');
    });

    if (containerEl) {
      containerEl.style.fontSize = previousFontSize || '';
    }
    if (previousRootFontSize !== undefined) {
      document.documentElement.style.fontSize = previousRootFontSize || '';
    }

    // Remove bg forcing
    const container = document.getElementById('essays-container');
    if (container) {
      container.classList.remove('export-force-white');
      container.classList.remove('export-contrast');
    }

    setIsExporting(false);
  };

  const handlePrint = () => window.print();

  const completedCount = essays.filter(e => e.status === ProcessingStatus.COMPLETED).length;
  const startableCount = pickTargetsForMode(workflowMode).length;
  const aiReadyCount = essays.filter(
    (e) => e.gradingStatus !== 'done' && e.status !== ProcessingStatus.PROCESSING && hasTextContent(e)
  ).length;
  const visibleCount = visibleEssays.length;

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">

      {/* Left Sidebar: Configuration */}
      <Sidebar
        config={config}
        setConfig={setConfig}
        pendingCount={startableCount}
        workflowMode={workflowMode}
        onWorkflowModeChange={setWorkflowMode}
        onStartAiBatch={handleBatchAi}
        aiReadyCount={aiReadyCount}
        isProcessing={isProcessing}
        onStartProcessing={handleStartProcessing}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Top Navigation Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 no-print z-10 shadow-sm">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">EssayFlow AI</h1>

            {/* Tab Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('list')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <ListBulletIcon /> Results
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                disabled={completedCount === 0}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'analytics' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700 disabled:opacity-50'}`}
              >
                <ChartBarIcon /> Analytics
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {completedCount > 0 && (
              <>
                <button onClick={handleDownloadJSON} className="icon-btn" title="Export JSON"><DownloadIcon /></button>
                <button onClick={handleOpenPdfModal} disabled={isExporting} className="icon-btn disabled:opacity-50" title="Export PDF"><DocumentTextIcon /></button>
                <button onClick={handlePrint} className="icon-btn" title="Print"><PrinterIcon /></button>
              </>
            )}
          </div>
        </header>

        {/* Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

          {/* --- TAB: LIST VIEW --- */}
          {activeTab === 'list' && (
            <div className="max-w-5xl mx-auto space-y-8 pb-20">

              {/* --- STEP 1: INPUT WORKSPACE (Collapsible) --- */}
              <div className="no-print">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">1</span>
                    Submission Workspace
                  </h2>
                  <button
                    onClick={() => setIsInputExpanded(!isInputExpanded)}
                    className="text-slate-400 hover:text-brand-600 transition-colors p-1"
                  >
                    {isInputExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                  </button>
                </div>

                {isInputExpanded && (
                  <div className="animate-fade-in">
                    <UploadZone
                      onUploadFiles={handleUploadFiles}
                      onSubmitText={handleTextSubmission}
                      onUploadMarkdown={handleUploadMarkdown}
                      disabled={isProcessing}
                    />
                  </div>
                )}
                {!isInputExpanded && (
                  <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                    {/* Hint of hidden content */}
                  </div>
                )}
              </div>

              {/* --- STEP 2: RESULTS BOARD --- */}
              <div id="essays-container" className="space-y-6">
                <div className="flex items-center justify-between mb-4 no-print">
                  <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs">2</span>
                    Results Board
                    {essays.length > 0 && (
                      <span className="ml-2 text-xs font-normal normal-case bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">
                        {batchFilter === 'all' ? `${essays.length} items` : `${visibleCount}/${essays.length} items`}
                      </span>
                    )}
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">排序</span>
                      <select
                        value={sortOption}
                        onChange={(event) => setSortOption(event.target.value as typeof sortOption)}
                        className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-600 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all shadow-sm"
                      >
                        <option value="added-desc">添加日期：新 → 旧</option>
                        <option value="added-asc">添加日期：旧 → 新</option>
                        <option value="name-asc">文件名：A → Z</option>
                        <option value="name-desc">文件名：Z → A</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">筛选</span>
                      <select
                        value={batchFilter}
                        onChange={(event) => setBatchFilter(event.target.value as typeof batchFilter)}
                        className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-600 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all shadow-sm"
                      >
                        <option value="all">全部</option>
                        <option value="batched">已批量</option>
                        <option value="unbatched">未批量</option>
                      </select>
                    </div>
                    <button
                      onClick={handleBatchAi}
                      disabled={isProcessing || aiReadyCount === 0}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${aiReadyCount > 0 && !isProcessing
                        ? 'bg-brand-50 text-brand-700 border-brand-200 hover:bg-brand-100'
                        : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                        }`}
                    >
                      批量AI批改（{aiReadyCount}）
                    </button>
                    <button
                      onClick={handleClearAll}
                      disabled={essays.length === 0 || isProcessing}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${essays.length > 0 && !isProcessing
                        ? 'bg-white text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
                        : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                        }`}
                    >
                      清空记录
                    </button>
                  </div>
                </div>

                {/* Empty State */}
                {essays.length === 0 && (
                  <div className="text-center py-20 opacity-40 select-none border-2 border-dashed border-slate-200 rounded-xl">
                    <div className="text-6xl mb-4 grayscale">📝</div>
                    <p className="text-slate-400 font-medium">Waiting for submissions...</p>
                  </div>
                )}

                {/* List of Cards */}
                {visibleEssays.map((essay) => (
                  <EssayCard
                    key={essay.id}
                    data={essay}
                    onDelete={handleDelete}
                    onUpdate={handleUpdate}
                    onRetry={handleRetry}
                    onCancel={handleCancel}
                    onStartAi={handleStartAiForEssay}
                  />
                ))}
              </div>
            </div>
          )}

          {/* --- TAB: ANALYTICS --- */}
          {activeTab === 'analytics' && (
            <div className="max-w-6xl mx-auto pb-20">
              <AnalyticsDashboard essays={essays} />
            </div>
          )}

        </div>
      </main>

      {/* PDF Configuration Modal */}
      <PDFExportModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        onConfirm={executePdfExport}
        essays={essays}
      />

    </div>
  );
};

export default App;
