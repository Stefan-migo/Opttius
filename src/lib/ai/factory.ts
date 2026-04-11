import { getAIConfig, getProviderConfig } from "./config";
import { getProvider } from "./providers";
import type { LLMConfig, LLMProvider, LLMProviderInterface } from "./types";

export class LLMFactory {
  private static instance: LLMFactory;
  private config = getAIConfig();

  static getInstance(): LLMFactory {
    if (!LLMFactory.instance) {
      LLMFactory.instance = new LLMFactory();
    }
    return LLMFactory.instance;
  }

  createProvider(provider?: LLMProvider): LLMProviderInterface {
    const targetProvider = provider || this.config.defaultProvider;
    return getProvider(targetProvider);
  }

  createProviderWithConfig(
    provider?: LLMProvider,
    customConfig?: Partial<LLMConfig>,
  ): {
    provider: LLMProviderInterface;
    config: LLMConfig;
  } {
    const targetProvider = provider || this.config.defaultProvider;
    const providerInstance = getProvider(targetProvider);
    const baseConfig = getProviderConfig(targetProvider);

    if (!baseConfig) {
      throw new Error(
        `Provider ${targetProvider} is not configured or enabled`,
      );
    }

    const config: LLMConfig = {
      ...baseConfig,
      ...customConfig,
    };

    if (!providerInstance.validateConfig(config)) {
      throw new Error(`Invalid configuration for provider ${targetProvider}`);
    }

    return { provider: providerInstance, config };
  }

  async createProviderWithFallback(
    preferredProvider?: LLMProvider,
    customConfig?: Partial<LLMConfig>,
  ): Promise<{ provider: LLMProviderInterface; config: LLMConfig }> {
    const providersToTry = [
      preferredProvider || this.config.defaultProvider,
      ...this.config.fallbackProviders,
    ].filter((p, i, arr) => arr.indexOf(p) === i);

    for (const provider of providersToTry) {
      try {
        const providerConfig = getProviderConfig(provider);
        if (providerConfig) {
          const providerInstance = getProvider(provider);
          const config: LLMConfig = {
            ...providerConfig,
            ...customConfig,
          };

          if (providerInstance.validateConfig(config)) {
            return { provider: providerInstance, config };
          }
        }
      } catch (error) {
        console.warn(`Failed to initialize provider ${provider}:`, error);
        continue;
      }
    }

    throw new Error("No available LLM providers configured");
  }

  getAvailableProviders(): LLMProvider[] {
    return Object.entries(this.config.providers)
      .filter(([_, config]) => config?.enabled && config?.apiKey)
      .map(([provider]) => provider as LLMProvider);
  }

  isProviderEnabled(provider: LLMProvider): boolean {
    const providerConfig = this.config.providers[provider];
    return !!(providerConfig?.enabled && providerConfig?.apiKey);
  }
}
