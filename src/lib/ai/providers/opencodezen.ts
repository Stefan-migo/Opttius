import type { LLMConfig, LLMModel } from "../types";
import { OpenAIProvider } from "./openai";

export class OpenCodeZenProvider extends OpenAIProvider {
  name = "opencodezen" as const;

  getAvailableModels(): LLMModel[] {
    return [
      {
        id: "minimax-m2.5-free",
        name: "MiniMax M2.5 Free",
        provider: "opencodezen",
        maxTokens: 128000,
        supportsStreaming: true,
        supportsFunctionCalling: true,
      },
    ];
  }

  validateConfig(config: LLMConfig): boolean {
    return this.validateApiKey(config.apiKey);
  }
}
