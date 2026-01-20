
export enum ProcessingStatus {
  IDLE = 'IDLE',
  PENDING = 'PENDING', // Uploaded but not yet sent to AI
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
  CANCELLED = 'CANCELLED'
}

export type StepStatus = 'idle' | 'processing' | 'done' | 'error' | 'skipped';
export type WorkflowMode = 'auto' | 'ocr_only' | 'ai_only';

export enum StudentLevel {
  ELEMENTARY = '小学 (Elementary)',
  MIDDLE = '初中 (Middle School)',
  HIGH = '高中 (High School)',
  COLLEGE = '大学/雅思 (College/IELTS)'
}

export type ProcessingStep = 'queued' | 'ocr' | 'ocr_complete' | 'grading' | 'done' | 'error' | 'cancelled';

export interface GradingCriteria {
  maxScore: number;
  focusAreas: string[]; // e.g., "Grammar", "Creativity"
}

export interface GradingSchema {
  score: number;
  grade?: string; // Custom grade letter (e.g., "A", "B+"), overrides auto-calculated grade
  summary_cn: string; // Chinese summary
  grammar_issues: {
    type?: string; // e.g., "Grammar", "Vocabulary", "Spelling", "Structure"
    original: string;
    correction: string;
    explanation: string;
  }[];
  strengths: string[];
  improvements: string[];
}

export interface EssayData {
  id: string;
  submissionType: 'image' | 'text' | 'markdown';
  file?: File;
  imagePreview?: string; // Base64 or ObjectURL (optional if text submission)

  // Content
  rawText?: string; // For direct text input
  ocrText: string; // Final text used for grading

  status: ProcessingStatus;
  progressStep?: ProcessingStep;
  progressMessage?: string;

  // Metadata
  studentName?: string;
  date?: string;
  topic?: string;
  addedAt?: string;
  batchId?: string;
  ocrStatus?: StepStatus;
  gradingStatus?: StepStatus;
  sourceFileName?: string;
  sourcePath?: string;

  // Grading
  gradingResult?: GradingSchema;
  errorMessage?: string;
}

export type AIProvider = 'openai' | 'openrouter' | 'gemini' | 'deepseek';

export interface ModelSettings {
  provider: AIProvider;
  model: string; // e.g., "gpt-4o-mini", "openai/gpt-4o-mini"
}

// 自定义批改提示词配置
export interface GradingPrompts {
  summaryPrompt: string;      // Teacher's Summary 提示词
  strengthsPrompt: string;    // Strengths 提示词  
  improvementsPrompt: string; // Areas for Improvement 提示词
}

export interface AgentConfig {
  level: StudentLevel;
  criteria: GradingCriteria;
  model: ModelSettings;
  prompts?: GradingPrompts; // 可选的自定义提示词
}
