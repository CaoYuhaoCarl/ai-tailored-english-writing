
import { AgentConfig, EssayData, ProcessingStatus, StudentLevel } from "../types";
import {
  APP_NAME,
  APP_URL,
  DEEPSEEK_API_KEY,
  DEEPSEEK_BASE_URL,
  GEMINI_API_KEY,
  GEMINI_BASE_URL,
  OPENAI_API_KEY,
  OPENAI_BASE_URL,
  OPENROUTER_API_KEY,
  OPENROUTER_BASE_URL
} from "./config";
import { transcribeHandwriting } from "./handwritingOcr";
import { DEFAULT_GRADING_PROMPTS } from "./promptDefaults";

type PromptBundle = {
  systemPrompt: string;
  userPrompt: string;
  image?: { base64: string; mimeType: string };
};

const LEVEL_GUIDANCE: Record<StudentLevel, string> = {
  [StudentLevel.ELEMENTARY]:
    "Use simple present/past; short sentences; avoid idioms; target CEFR A1-A2 vocabulary; give 1–2 sentence Chinese explanations.",
  [StudentLevel.MIDDLE]:
    "Use clear simple/compound sentences; encourage basic connectors (because, however); target CEFR A2-B1 vocabulary; highlight tense/article errors.",
  [StudentLevel.HIGH]:
    "Expect varied clauses and cohesive devices; target CEFR B1-B2 vocabulary; encourage precise verbs/adjectives; point out logical gaps.",
  [StudentLevel.COLLEGE]:
    "Expect complex sentences and academic connectors; target CEFR B2-C1 vocabulary; encourage concision and lexical variety; flag argumentation and register issues."
};

const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const [prefix, base64] = reader.result.split(",");
        const mimeType = prefix.split(";")[0].replace("data:", "") || file.type || "image/jpeg";
        resolve({ base64, mimeType });
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

const buildPromptBundle = async (
  essay: EssayData,
  config: AgentConfig,
  providedText?: string
): Promise<PromptBundle> => {
  const focusAreas = config.criteria.focusAreas.length > 0 ? config.criteria.focusAreas.join(", ") : "Grammar, Vocabulary";
  const levelGuidance = LEVEL_GUIDANCE[config.level] || LEVEL_GUIDANCE[StudentLevel.MIDDLE];

  // 使用自定义提示词或默认提示词
  const prompts = config.prompts || DEFAULT_GRADING_PROMPTS;

  const systemPrompt = `
You are an expert English Teacher and AI Assistant. If OCR text is provided, use it directly and do not redo OCR. If only an image is provided, perform OCR first, then grade the essay.
Adapt grading strictness, vocabulary expectations, and suggestions to the student's level: ${levelGuidance}
Use the rubric below; keep feedback concise and actionable.

评分维度-具体描述+示例:
- Grammar: 正确时态/主谓一致/冠词，指出错误并给出替换。例如 “She go to school” -> “She goes to school.” 解释用中文。
- Vocabulary: 词汇多样性与准确性，给出同义词或短语替换。例如 “good” -> “remarkable / impressive”。
- Structure/Coherence: 段落与衔接词使用，指出缺少过渡句并提供示例句。
- Spelling/Punctuation: 标注错误词并给出正确拼写或标点用法。
- Focus Areas (教师自定义): 优先覆盖 ${focusAreas}，若无匹配则按以上通用维度评价。

自定义评价要求（Custom Grading Requirements）:
- Teacher's Summary (summary_cn): ${prompts.summaryPrompt}
- Strengths: ${prompts.strengthsPrompt}
- Areas for Improvement (improvements): ${prompts.improvementsPrompt}

Return a single JSON object with the following keys:
{
  "studentName": string,
  "date": string,
  "ocrText": string,
  "gradingResult": {
    "score": number,
    "summary_cn": string,
    "strengths": string[],
    "improvements": string[],
    "grammar_issues": [
      {"type": "Grammar|Vocabulary|Spelling|Structure|Punctuation", "original": string, "correction": string, "explanation": "Chinese explanation"}
    ]
  }
}
All feedback in "summary_cn" and each "explanation" must be in Chinese. Do not include any text outside of the JSON.
`.trim();

  const sharedContext = `
Student Level: ${config.level}
Focus Areas: ${focusAreas}
Max Score: ${config.criteria.maxScore}
`.trim();

  const baseText = (providedText || essay.rawText || "").trim();

  if (baseText) {
    const userPrompt = `
${sharedContext}
Student Name (provided): ${essay.studentName || "Unknown"}
Topic (provided): ${essay.topic || "General"}

Essay Text (already transcribed or typed):
"""
${baseText}
"""

Use the provided essay text directly as "ocrText" (no OCR needed), infer student name and date from the header when possible, then grade it and return the JSON described in the system prompt.
`.trim();
    return { systemPrompt, userPrompt };
  }

  if (!essay.file) throw new Error("No file provided for image submission");
  const fileData = await fileToBase64(essay.file);
  const userPrompt = `
${sharedContext}
Student Name (provided): ${essay.studentName || "Unknown"}
Topic (provided): ${essay.topic || "General"}

An image of the handwritten essay is attached. Perform OCR to transcribe the essay (preserve natural line breaks) and capture the student's name and date from the header when available. Then grade it and return the JSON described in the system prompt.
`.trim();

  return { systemPrompt, userPrompt, image: fileData };
};

const buildMessages = (bundle: PromptBundle) => {
  const userContent: any[] = [{ type: "text", text: bundle.userPrompt }];
  if (bundle.image) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${bundle.image.mimeType};base64,${bundle.image.base64}` }
    });
  }
  return [
    { role: "system", content: bundle.systemPrompt },
    { role: "user", content: userContent }
  ];
};

const runOpenAIStyleModel = async (params: {
  bundle: PromptBundle;
  modelId: string;
  apiKey?: string;
  baseUrl: string;
  providerName: string;
  extraHeaders?: Record<string, string>;
  signal?: AbortSignal;
}) => {
  const { bundle, modelId, apiKey, baseUrl, providerName, extraHeaders = {}, signal } = params;
  if (!apiKey) throw new Error(`${providerName} API key is missing`);
  if (signal?.aborted) throw new Error("Processing cancelled");

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders
    },
    signal,
    body: JSON.stringify({
      model: modelId || "gpt-4o-mini",
      messages: buildMessages(bundle),
      temperature: 0.4,
      response_format: { type: "json_object" }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const detail = data?.error?.message || data?.message;
    throw new Error(detail || `${providerName} request failed`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error(`No response from ${providerName}`);
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    const textPart = content.find((part: any) => part.type === "text")?.text;
    if (textPart) return textPart;
  }

  throw new Error(`${providerName} returned unsupported content format`);
};

const runGeminiModel = async (params: {
  bundle: PromptBundle;
  modelId: string;
  apiKey?: string;
  baseUrl: string;
  providerName: string;
  signal?: AbortSignal;
}) => {
  const { bundle, modelId, apiKey, baseUrl, providerName, signal } = params;
  if (!apiKey) throw new Error(`${providerName} API key is missing`);
  if (signal?.aborted) throw new Error("Processing cancelled");

  const parts: any[] = [{ text: bundle.userPrompt }];
  if (bundle.image) {
    parts.push({ inline_data: { mime_type: bundle.image.mimeType, data: bundle.image.base64 } });
  }

  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/models/${modelId}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        system_instruction: { parts: [{ text: bundle.systemPrompt }] },
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.4,
          response_mime_type: "application/json"
        }
      })
    }
  );

  const data = await response.json();
  if (!response.ok) {
    const detail = data?.error?.message || data?.message;
    throw new Error(detail || `${providerName} request failed`);
  }

  const candidateParts = data?.candidates?.[0]?.content?.parts;
  if (Array.isArray(candidateParts)) {
    const textPart = candidateParts.find((part: any) => part.text)?.text;
    if (typeof textPart === "string") return textPart;
  }

  throw new Error(`${providerName} returned unsupported content format`);
};

const routeModel = async (bundle: PromptBundle, config: AgentConfig, signal?: AbortSignal) => {
  const { provider, model } = config.model;
  if (signal?.aborted) throw new Error("Processing cancelled");
  switch (provider) {
    case "openai":
      return runOpenAIStyleModel({
        bundle,
        modelId: model,
        apiKey: OPENAI_API_KEY,
        baseUrl: OPENAI_BASE_URL,
        providerName: "OpenAI",
        signal
      });
    case "gemini":
      return runGeminiModel({
        bundle,
        modelId: model || "gemini-1.5-flash",
        apiKey: GEMINI_API_KEY,
        baseUrl: GEMINI_BASE_URL,
        providerName: "Gemini",
        signal
      });
    case "deepseek":
      return runOpenAIStyleModel({
        bundle,
        modelId: model || "deepseek-chat",
        apiKey: DEEPSEEK_API_KEY,
        baseUrl: DEEPSEEK_BASE_URL,
        providerName: "DeepSeek",
        signal
      });
    case "openrouter":
      return runOpenAIStyleModel({
        bundle,
        modelId: model,
        apiKey: OPENROUTER_API_KEY,
        baseUrl: OPENROUTER_BASE_URL,
        providerName: "OpenRouter",
        extraHeaders: {
          "HTTP-Referer": APP_URL,
          "X-Title": APP_NAME
        },
        signal
      });
    default:
      return runOpenAIStyleModel({
        bundle,
        modelId: model,
        apiKey: OPENAI_API_KEY,
        baseUrl: OPENAI_BASE_URL,
        providerName: "OpenAI",
        signal
      });
  }
};

export const processEssayAgent = async (
  essay: EssayData,
  config: AgentConfig,
  onProgress?: (update: Partial<EssayData>) => void,
  options: { skipOcr?: boolean; signal?: AbortSignal } = {}
): Promise<EssayData> => {
  let textForModel = essay.rawText || essay.ocrText || "";
  try {
    const { skipOcr, signal } = options;

    const setProgress = (update: Partial<EssayData>) => {
      onProgress?.(update);
    };

    if (signal?.aborted) throw new Error("Processing cancelled");

    if (essay.submissionType === "image" && essay.file && !skipOcr) {
      setProgress({ progressStep: "ocr", progressMessage: "正在执行手写OCR..." });
      try {
        textForModel = await transcribeHandwriting(essay.file, { signal });
        setProgress({
          ocrText: textForModel,
          progressStep: "ocr_complete",
          progressMessage: "OCR完成，准备批改"
        });
      } catch (ocrError) {
        console.error("Handwriting OCR error:", ocrError);
        setProgress({ progressStep: "ocr", progressMessage: "OCR失败，继续尝试直接批改" });
        textForModel = textForModel || "";
      }
    }

    if (skipOcr) {
      setProgress({ progressStep: "grading", progressMessage: "AI批改重试中..." });
    } else {
      setProgress({ progressStep: "grading", progressMessage: "AI批改中..." });
    }
    if (signal?.aborted) throw new Error("Processing cancelled");

    const promptBundle = await buildPromptBundle(essay, config, textForModel);
    const jsonText = await routeModel(promptBundle, config, signal);
    const result = JSON.parse(jsonText);

    setProgress({ progressStep: "done", progressMessage: "批改完成" });
    return {
      ...essay,
      status: ProcessingStatus.COMPLETED,
      studentName: result.studentName || essay.studentName || "Unknown Student",
      date: result.date || essay.date || new Date().toLocaleDateString(),
      ocrText: result.ocrText || textForModel || essay.rawText || "",
      gradingResult: result.gradingResult,
      progressStep: "done",
      progressMessage: "批改完成"
    };
  } catch (error: any) {
    console.error("Agent Error:", error);
    const cancelled = error?.message?.toLowerCase().includes("cancelled") || error?.name === "AbortError";

    return {
      ...essay,
      status: cancelled ? ProcessingStatus.CANCELLED : ProcessingStatus.ERROR,
      ocrText: textForModel || essay.ocrText || essay.rawText || "",
      progressStep: cancelled ? "cancelled" : "error",
      progressMessage: cancelled ? "用户已取消批改" : essay.progressMessage,
      errorMessage: cancelled ? "用户已取消批改" : error.message || "Processing failed"
    };
  }
};
