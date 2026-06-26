import type { LLMConfig, LLMModel } from "../types";
import { OpenAIProvider } from "./openai";

export class NvidiaProvider extends OpenAIProvider {
  name = "nvidia" as const;

  getAvailableModels(): LLMModel[] {
    return [
      {
        id: "moonshotai/kimi-k2.5",
        name: "Kimi K2.5",
        provider: "nvidia",
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
