import type { LLMProvider, LLMProviderInterface } from "../types";
import { AnthropicProvider } from "./anthropic";
import { DeepSeekProvider } from "./deepseek";
import { GoogleProvider } from "./google";
import { KilocodeProvider } from "./kilocode";
import { MinimaxProvider } from "./minimax";
import { NvidiaProvider } from "./nvidia";
import { OpenCodeZenProvider } from "./opencodezen";
import { OpenAIProvider } from "./openai";
import { OpenRouterProvider } from "./openrouter";

export const providers: Record<LLMProvider, () => LLMProviderInterface> = {
  openai: () => new OpenAIProvider(),
  anthropic: () => new AnthropicProvider(),
  google: () => new GoogleProvider(),
  deepseek: () => new DeepSeekProvider(),
  openrouter: () => new OpenRouterProvider(),
  kilocode: () => new KilocodeProvider(),
  minimax: () => new MinimaxProvider(),
  nvidia: () => new NvidiaProvider(),
  opencodezen: () => new OpenCodeZenProvider(),
  custom: () => {
    throw new Error("Custom provider not implemented");
  },
};

export function getProvider(provider: LLMProvider): LLMProviderInterface {
  const factory = providers[provider];
  if (!factory) {
    throw new Error(`Provider ${provider} not found`);
  }
  return factory();
}

export function getAvailableProviders(): LLMProvider[] {
  return Object.keys(providers).filter((p) => p !== "custom") as LLMProvider[];
}
