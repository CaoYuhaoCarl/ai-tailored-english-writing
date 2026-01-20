import { ModelSettings } from "../types";

export interface ModelOption extends ModelSettings {
  label: string;
  hint?: string;
}

export const MODEL_OPTIONS: ModelOption[] = [
  {
    provider: "openai",
    model: "gpt-4o-mini",
    label: "OpenAI GPT-4o-mini"
  },
  {
    provider: "gemini",
    model: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash"
  },
  {
    provider: "deepseek",
    model: "deepseek-chat",
    label: "DeepSeek Chat"
  },
  {
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    label: "OpenRouter openai/gpt-4o-mini"
  }
];

export const DEFAULT_MODEL: ModelSettings = MODEL_OPTIONS[0];

export const providerLabels: Record<ModelSettings["provider"], string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  deepseek: "DeepSeek",
  openrouter: "OpenRouter"
};

export const getDefaultModelForProvider = (provider: ModelSettings["provider"]): string => {
  const preset = MODEL_OPTIONS.find((opt) => opt.provider === provider);
  return preset ? preset.model : MODEL_OPTIONS[0].model;
};
