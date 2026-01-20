import { EssayData, ProcessingStatus } from '@/types';

const STORAGE_KEY = 'essayflow_ai_records_v1';

type PersistableEssay = Omit<EssayData, 'file'>;

interface PersistedPayload {
  version: number;
  savedAt: string;
  essays: PersistableEssay[];
}

const stripTransientFields = (essays: EssayData[]): PersistableEssay[] => {
  return essays.map(({ file, ...rest }) => rest);
};

const resetIfInterrupted = (essay: PersistableEssay): PersistableEssay => {
  if (essay.status !== ProcessingStatus.PROCESSING) return essay;
  return {
    ...essay,
    status: ProcessingStatus.PENDING,
    ocrStatus: essay.ocrStatus === 'processing' ? 'idle' : essay.ocrStatus,
    gradingStatus: essay.gradingStatus === 'processing' ? 'idle' : essay.gradingStatus,
    progressStep: 'queued',
    progressMessage: '刷新后可重新开始批改'
  };
};

const markMissingSource = (essay: PersistableEssay): PersistableEssay => {
  const lacksText = !essay.ocrText && !essay.rawText;
  if (essay.submissionType !== 'image' || !lacksText) return essay;
  return {
    ...essay,
    status: ProcessingStatus.ERROR,
    ocrStatus: 'error',
    gradingStatus: 'skipped',
    progressStep: 'error',
    progressMessage: '源图片不可用，请重新上传后再试',
    errorMessage: essay.errorMessage || '源图片不可用，请重新上传后再试'
  };
};

const reviveEssay = (essay: PersistableEssay, fallbackAddedAt?: string): EssayData => {
  const withDefaults: EssayData = {
    ...essay,
    ocrText: essay.ocrText || '',
    rawText: essay.rawText,
    progressStep: essay.progressStep || 'queued',
    progressMessage: essay.progressMessage || 'Waiting in queue',
    ocrStatus: essay.ocrStatus || 'idle',
    gradingStatus: essay.gradingStatus || 'idle',
    status: essay.status || ProcessingStatus.PENDING,
    addedAt: essay.addedAt || fallbackAddedAt
  };

  const reset = resetIfInterrupted(withDefaults);
  return markMissingSource(reset);
};

export const loadPersistedEssays = (): EssayData[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistedPayload;
    if (!parsed?.essays || !Array.isArray(parsed.essays)) return [];
    const fallbackAddedAt = parsed.savedAt || new Date().toISOString();
    return parsed.essays.map((essay) => reviveEssay(essay, fallbackAddedAt));
  } catch (err) {
    console.warn('Failed to load essays from storage', err);
    return [];
  }
};

export const persistEssays = (essays: EssayData[]) => {
  if (typeof window === 'undefined') return;
  try {
    if (!essays.length) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const payload: PersistedPayload = {
      version: 1,
      savedAt: new Date().toISOString(),
      essays: stripTransientFields(essays)
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Failed to persist essays', err);
  }
};

export { STORAGE_KEY };
