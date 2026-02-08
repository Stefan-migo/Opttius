import type { LLMProvider, LLMConfig } from "./types";

export interface AIConfig {
  defaultProvider: LLMProvider;
  defaultModel: string;
  fallbackProviders: LLMProvider[];
  providers: {
    [key in LLMProvider]?: {
      apiKey?: string;
      baseURL?: string;
      groupId?: string; // For Minimax
      defaultModel?: string;
      enabled: boolean;
    };
  };
}

export function getAIConfig(): AIConfig {
  return {
    // Default to DeepSeek which has generous rate limits and good tool support
    defaultProvider:
      (process.env.AI_DEFAULT_PROVIDER as LLMProvider) || "deepseek",
    defaultModel: process.env.AI_DEFAULT_MODEL || "deepseek-chat",
    fallbackProviders: (process.env.AI_FALLBACK_PROVIDERS?.split(
      ",",
    ) as LLMProvider[]) || ["google", "openai"],
    providers: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_BASE_URL,
        defaultModel: process.env.OPENAI_DEFAULT_MODEL || "gpt-4-turbo-preview",
        enabled: !!process.env.OPENAI_API_KEY,
      },
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseURL: process.env.ANTHROPIC_BASE_URL,
        defaultModel:
          process.env.ANTHROPIC_DEFAULT_MODEL || "claude-3-sonnet-20240229",
        enabled: !!process.env.ANTHROPIC_API_KEY,
      },
      google: {
        apiKey: process.env.GOOGLE_API_KEY,
        baseURL: process.env.GOOGLE_BASE_URL,
        defaultModel: process.env.GOOGLE_DEFAULT_MODEL || "gemini-2.5-flash",
        enabled: !!process.env.GOOGLE_API_KEY,
      },
      deepseek: {
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
        defaultModel: process.env.DEEPSEEK_DEFAULT_MODEL || "deepseek-chat",
        enabled: !!process.env.DEEPSEEK_API_KEY,
      },
      openrouter: {
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL:
          process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
        defaultModel:
          process.env.OPENROUTER_DEFAULT_MODEL || "anthropic/claude-3.5-sonnet",
        enabled: !!process.env.OPENROUTER_API_KEY,
      },
      kilocode: {
        apiKey: process.env.KILOCODE_API_KEY,
        baseURL: process.env.KILOCODE_BASE_URL || "https://api.kilo.ai/v1",
        defaultModel: process.env.KILOCODE_DEFAULT_MODEL || "kilocode-frontier",
        enabled: !!process.env.KILOCODE_API_KEY,
      },
      minimax: {
        apiKey: process.env.MINIMAX_API_KEY,
        baseURL: process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1",
        groupId: process.env.MINIMAX_GROUP_ID,
        defaultModel: process.env.MINIMAX_DEFAULT_MODEL || "minimax-m2.1",
        enabled: !!process.env.MINIMAX_API_KEY,
      },
    },
  };
}

export function getProviderConfig(provider: LLMProvider): LLMConfig | null {
  const aiConfig = getAIConfig();
  const providerConfig = aiConfig.providers[provider];

  if (!providerConfig || !providerConfig.enabled || !providerConfig.apiKey) {
    return null;
  }

  return {
    provider,
    model: providerConfig.defaultModel || aiConfig.defaultModel,
    apiKey: providerConfig.apiKey,
    baseURL: providerConfig.baseURL,
    groupId: providerConfig.groupId,
    temperature: 0.7,
    maxTokens: 4096,
  };
}
