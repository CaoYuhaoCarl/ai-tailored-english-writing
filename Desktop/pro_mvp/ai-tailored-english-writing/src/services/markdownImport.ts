import { EssayData, ProcessingStatus } from '../types';

interface MarkdownMeta {
  studentName?: string;
  date?: string;
  topic?: string;
}

const parseMetadataFromFilename = (fileName: string): MarkdownMeta => {
  const base = fileName.replace(/\.md$/i, '');
  const match = base.match(/^(?<name>[^_]+)_Date_(?<date>\d{8})/i);
  return {
    studentName: match?.groups?.name,
    date: match?.groups?.date
  };
};

const parseMetadataFromContent = (content: string): MarkdownMeta => {
  const nameMatch = content.match(/Name:\s*([^\n]+)/i);
  const dateMatch = content.match(/Date:\s*([0-9]{8}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i);
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const questionLine = lines.find((l) => /^\d+\./.test(l));
  const topicFromQuestion = questionLine?.replace(/^\d+\.\s*/, '').trim();
  const topicFallback = lines.find(
    (l) =>
      !l.startsWith('#') &&
      !/^name:/i.test(l) &&
      !/^date:/i.test(l) &&
      !/^skill:/i.test(l) &&
      !/^students? wanted/i.test(l) &&
      !/^Happy Kids/i.test(l) &&
      l.length > 3
  );

  return {
    studentName: nameMatch?.[1]?.trim(),
    date: dateMatch?.[1]?.trim(),
    topic: topicFromQuestion || topicFallback
  };
};

const buildEssayFromFile = async (file: File): Promise<EssayData> => {
  const text = await file.text();
  const filenameMeta = parseMetadataFromFilename(file.name);
  const contentMeta = parseMetadataFromContent(text);

  const studentName = contentMeta.studentName || filenameMeta.studentName;
  const date = contentMeta.date || filenameMeta.date;

  const rawText = text.trim();

  return {
    id: `md-${Math.random().toString(36).slice(2, 9)}`,
    submissionType: 'markdown',
    file,
    rawText,
    ocrText: rawText,
    addedAt: new Date().toISOString(),
    studentName: studentName || filenameMeta.studentName || file.name.replace(/\.md$/i, ''),
    date,
    topic: contentMeta.topic,
    status: ProcessingStatus.PENDING,
    progressStep: 'queued',
    progressMessage: 'Waiting in queue',
    ocrStatus: 'done',
    gradingStatus: 'idle',
    sourceFileName: file.name,
    // @ts-ignore webkitRelativePath exists when uploading folders
    sourcePath: file.webkitRelativePath || file.name
  };
};

export const parseMarkdownFiles = async (files: File[]): Promise<{ essays: EssayData[]; errors: string[] }> => {
  const errors: string[] = [];
  const essays: EssayData[] = [];

  for (const file of files) {
    try {
      const essay = await buildEssayFromFile(file);
      if (!essay.ocrText) {
        errors.push(`${file.name}: 文件内容为空`);
        continue;
      }
      essays.push(essay);
    } catch (err: any) {
      errors.push(`${file.name}: ${err?.message || '解析失败'}`);
    }
  }

  return { essays, errors };
};
