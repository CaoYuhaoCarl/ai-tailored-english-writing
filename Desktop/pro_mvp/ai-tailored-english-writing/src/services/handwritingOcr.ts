import { HANDWRITING_OCR_API_KEY, HANDWRITING_OCR_BASE_URL, OCR_SAVE_ENDPOINT } from "./config";

const API_BASE = HANDWRITING_OCR_BASE_URL || "https://www.handwritingocr.com/api/v3";

type DocumentResult = {
  status?: string;
  results?: { page_number?: number; transcript?: string }[];
  message?: string;
  retryAfterMs?: number;
  httpStatus?: number;
};

const normalizeSlashes = (value: string) => value.replace(/\\/g, "/");
const sanitizeSegment = (value: string) =>
  value
    .trim()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .slice(0, 50)
    .replace(/^_+|_+$/g, "") || undefined;

const throwIfCancelled = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new Error("Processing cancelled");
  }
};

const delay = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(new Error("Processing cancelled"));
        },
        { once: true }
      );
    }
  });

const uploadDocument = async (file: File, signal?: AbortSignal): Promise<string> => {
  if (!HANDWRITING_OCR_API_KEY) {
    throw new Error("Handwriting OCR API key is missing");
  }

  throwIfCancelled(signal);
  const form = new FormData();
  form.append("file", file);
  form.append("action", "transcribe");
  form.append("delete_after", "604800"); // 7 days auto-delete; adjust as needed

  const response = await fetch(`${API_BASE}/documents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HANDWRITING_OCR_API_KEY}`,
      Accept: "application/json"
    },
    body: form,
    signal
  });

  const data = await response.json();
  if (!response.ok) {
    const detail = data?.message || data?.errors?.[0];
    throw new Error(detail || "OCR upload failed");
  }

  if (!data?.id) {
    throw new Error("OCR upload did not return an id");
  }

  return data.id as string;
};

const fetchDocumentStatus = async (id: string, signal?: AbortSignal): Promise<DocumentResult> => {
  if (!HANDWRITING_OCR_API_KEY) {
    throw new Error("Handwriting OCR API key is missing");
  }

  throwIfCancelled(signal);
  const response = await fetch(`${API_BASE}/documents/${id}`, {
    headers: {
      Authorization: `Bearer ${HANDWRITING_OCR_API_KEY}`,
      Accept: "application/json"
    },
    signal
  });

  let data: any = {};
  try {
    data = await response.json();
  } catch (err) {
    data = {};
  }

  const retryAfterHeader = response.headers?.get("retry-after");
  const retryAfterMs =
    retryAfterHeader && !Number.isNaN(Number.parseFloat(retryAfterHeader))
      ? Number.parseFloat(retryAfterHeader) * 1000
      : undefined;

  return {
    status: data?.status || (response.status === 202 ? "processing" : undefined),
    results: data?.results,
    message: data?.message || data?.errors?.[0],
    retryAfterMs,
    httpStatus: response.status
  };
};

const collectTranscript = (results?: { transcript?: string }[]) => {
  if (!results || !Array.isArray(results)) return "";
  return results
    .map((page) => page?.transcript || "")
    .filter(Boolean)
    .join("\n\n")
    .trim();
};

const extractNameAndDate = (content: string) => {
  const nameMatch = content.match(/(?:Name|姓名)\s*[:：]\s*([^\n\r]+)/i);
  const dateMatch = content.match(/(?:Date|日期)\s*[:：]\s*([0-9]{4}[./-]?[0-9]{2}[./-]?[0-9]{2}|[0-9]{8})/i);
  const studentName = nameMatch?.[1]?.trim();
  let writingDate = dateMatch?.[1]?.trim();

  if (writingDate) {
    const digits = writingDate.replace(/[^0-9]/g, "");
    if (digits.length === 8) {
      writingDate = digits;
    }
  }

  return { studentName, writingDate };
};

const extractClassSlug = (imageRelativePath?: string) => {
  if (!imageRelativePath) return undefined;
  const normalized = normalizeSlashes(imageRelativePath.replace(/^(\.\.\/)+/, "").replace(/^\.?\//, ""));
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length < 2) return undefined;
  const parentDir = segments[segments.length - 2];
  const cleaned = parentDir.replace(/[^a-zA-Z0-9]+/g, "");
  return cleaned || undefined;
};

const deriveImageRelativePath = (file?: File) => {
  if (!file) return undefined;
  const anyFile = file as any;
  const relativeFromPicker =
    typeof anyFile?.webkitRelativePath === "string" && anyFile.webkitRelativePath.trim();
  if (relativeFromPicker) {
    const normalized = normalizeSlashes(relativeFromPicker.replace(/^\/+/, ""));
    const withTasksPrefix = normalized.startsWith("tasks/") ? normalized : `tasks/${normalized}`;
    return `../${withTasksPrefix}`;
  }

  const absolutePath =
    typeof anyFile?.path === "string" && anyFile.path.trim()
      ? normalizeSlashes(anyFile.path.trim())
      : undefined;
  if (absolutePath) {
    const marker = "/tasks/";
    const markerIndex = absolutePath.toLowerCase().lastIndexOf(marker);
    if (markerIndex >= 0) {
      const relativeFromTasks = absolutePath.slice(markerIndex + 1);
      return `../${relativeFromTasks}`;
    }
  }

  return undefined;
};

const extractImageSlug = (fileName?: string) => {
  if (!fileName) return undefined;
  const base = fileName.replace(/\.[^/.]+$/, "");
  const cleaned = base.replace(/[^a-zA-Z0-9]+/g, "");
  return cleaned || undefined;
};

const appendImageLink = (payload: string, imageRelativePath?: string) => {
  if (!imageRelativePath) return payload;
  const normalizedPath = normalizeSlashes(imageRelativePath);
  const linkLine = `![500](${normalizedPath})`;
  if (payload.includes(linkLine)) return payload;

  const trimmed = payload.trimEnd();
  return `${trimmed}\n${linkLine}\n`;
};

const buildMarkdownPayload = (content: string, file?: File, imageRelativePath?: string) => {
  const { studentName, writingDate } = extractNameAndDate(content);
  const studentSlug = studentName ? sanitizeSegment(studentName) : "unknown_student";
  const classSlug = extractClassSlug(imageRelativePath) || "unknownclass";
  const imageSlug = extractImageSlug(file?.name) || "image";
  const dateSlug = writingDate
    ? writingDate.replace(/[^0-9]/g, "") || sanitizeSegment(writingDate) || "unknown_date"
    : "unknown_date";
  const filename = `${studentSlug}_${classSlug}_${imageSlug}_${dateSlug}.md`;
  const basePayload = `# OCR Transcript\n\n${content}\n`;
  const payload = appendImageLink(basePayload, imageRelativePath);
  return { filename, payload };
};

const persistTranscript = (transcript: string, file: File, imageRelativePath?: string) => {
  const { filename, payload } = buildMarkdownPayload(transcript, file, imageRelativePath);
  downloadMarkdown(payload, filename);
  persistMarkdownRemote(payload, filename, {
    imageFilename: file.name,
    imageRelativePath
  });
};

const downloadMarkdown = (payload: string, filename: string) => {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const triggerDownload = (href: string) => {
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  try {
    const blob = new Blob([payload], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url);
    URL.revokeObjectURL(url);
  } catch (err) {
    // Fallback to data URI download if Blob fails
    const dataUri = `data:text/markdown;charset=utf-8,${encodeURIComponent(payload)}`;
    triggerDownload(dataUri);
  }

  // Cache a copy locally so the text is still accessible if download is blocked
  try {
    localStorage.setItem(`ocr_md_${filename}`, payload);
  } catch (storageErr) {
    console.warn("Could not persist OCR markdown to localStorage", storageErr);
  }
};

const persistMarkdownRemote = async (
  payload: string,
  filename: string,
  meta?: { imageFilename?: string; imageRelativePath?: string }
) => {
  if (typeof fetch === "undefined") return;
  try {
    await fetch(OCR_SAVE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename,
        content: payload,
        imageFilename: meta?.imageFilename,
        imageRelativePath: meta?.imageRelativePath
      })
    });
  } catch (err) {
    console.warn("Could not persist OCR markdown to backend", err);
  }
};

export const transcribeHandwriting = async (
  file: File,
  options: { pollIntervalMs?: number; maxAttempts?: number; maxWaitMs?: number; signal?: AbortSignal } = {}
): Promise<string> => {
  const { signal } = options;
  const pollIntervalMs = options.pollIntervalMs ?? 2000;
  const maxAttempts = options.maxAttempts ?? 120; // allow longer polling to survive rate limits
  const maxWaitMs = options.maxWaitMs ?? 4 * 60 * 1000; // 4 minutes safety cap
  const imageRelativePath = deriveImageRelativePath(file);
  const startedAt = Date.now();

  throwIfCancelled(signal);
  const documentId = await uploadDocument(file, signal);

  let attempt = 0;
  let dynamicDelay = pollIntervalMs;

  while (attempt < maxAttempts && Date.now() - startedAt < maxWaitMs) {
    const result = await fetchDocumentStatus(documentId, signal);
    if (result.status === "processed") {
      const transcript = collectTranscript(result.results);
      if (transcript) {
        persistTranscript(transcript, file, imageRelativePath);
        return transcript;
      }
      throw new Error("OCR finished but returned empty transcript");
    }

    if (result.status === "failed") {
      throw new Error(result.message || "Handwriting OCR processing failed");
    }

    const rateLimited = result.httpStatus === 429;
    const missing = result.httpStatus === 404;
    const waitMs = rateLimited
      ? result.retryAfterMs ?? Math.min(dynamicDelay * 2, 30000)
      : missing
        ? Math.max(dynamicDelay, pollIntervalMs * 2)
        : dynamicDelay;

    dynamicDelay = Math.min(waitMs + pollIntervalMs, rateLimited ? 45000 : 20000);
    attempt += 1;
    await delay(waitMs, signal);
  }

  const finalResult = await fetchDocumentStatus(documentId, signal);
  if (finalResult.status === "processed") {
    const transcript = collectTranscript(finalResult.results);
    if (transcript) {
      persistTranscript(transcript, file, imageRelativePath);
      return transcript;
    }
  }

  throw new Error(`OCR request timed out before completion (document id: ${documentId}). 请稍后重试。`);
};
