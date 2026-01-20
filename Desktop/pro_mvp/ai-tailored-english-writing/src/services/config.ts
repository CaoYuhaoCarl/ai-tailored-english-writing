// Centralized env access for service layer (OpenAI + OpenRouter only).
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
export const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const GEMINI_BASE_URL =
  process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
export const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
export const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1";
export const HANDWRITING_OCR_API_KEY = process.env.HANDWRITING_OCR_API_KEY;
export const HANDWRITING_OCR_BASE_URL =
  process.env.HANDWRITING_OCR_BASE_URL || "https://www.handwritingocr.com/api/v3";
export const OCR_SAVE_ENDPOINT =
  process.env.OCR_SAVE_ENDPOINT || "http://localhost:8788/api/save-ocr";

// Used for optional OpenRouter headers. Keep defaults light to avoid runtime surprises.
export const APP_URL =
  (typeof window !== "undefined" && window.location?.origin) || process.env.APP_URL || "http://localhost";
export const APP_NAME = process.env.APP_NAME || "EssayFlow AI";
