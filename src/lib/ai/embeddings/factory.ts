/**
 * Embedding Factory
 *
 * Provides a unified interface for embedding generation with automatic fallback.
 * Primary: Google Embeddings (fast, cloud-based)
 * Fallback: Transformers.js (local, offline-capable)
 */

import { GoogleEmbeddingProvider } from "./google";
import { TransformersEmbeddingProvider } from "./transformers";
import type {
  EmbeddingBatchResult,
  EmbeddingFactoryConfig,
  EmbeddingProvider,
  EmbeddingResult,
} from "./types";

export class EmbeddingFactory {
  private static instance: EmbeddingFactory | null = null;

  private googleProvider: GoogleEmbeddingProvider;
  private transformersProvider: TransformersEmbeddingProvider;
  private config: EmbeddingFactoryConfig;

  constructor(config?: Partial<EmbeddingFactoryConfig>) {
    this.config = {
      primaryProvider: config?.primaryProvider || "google",
      fallbackProvider: config?.fallbackProvider || "transformers",
      forceProvider: config?.forceProvider,
      offlineMode: config?.offlineMode || false,
    };

    this.googleProvider = new GoogleEmbeddingProvider();
    this.transformersProvider = new TransformersEmbeddingProvider();
  }

  static getInstance(
    config?: Partial<EmbeddingFactoryConfig>,
  ): EmbeddingFactory {
    if (!EmbeddingFactory.instance) {
      EmbeddingFactory.instance = new EmbeddingFactory(config);
    }
    return EmbeddingFactory.instance;
  }

  static resetInstance(): void {
    EmbeddingFactory.instance = null;
  }

  /**
   * Get the primary provider based on config
   */
  private getPrimaryProvider(): EmbeddingProvider {
    if (this.config.forceProvider) {
      return this.config.forceProvider === "google"
        ? this.googleProvider
        : this.transformersProvider;
    }

    if (this.config.offlineMode) {
      return this.transformersProvider;
    }

    return this.config.primaryProvider === "google"
      ? this.googleProvider
      : this.transformersProvider;
  }

  /**
   * Get the fallback provider
   */
  private getFallbackProvider(): EmbeddingProvider | null {
    if (this.config.forceProvider || this.config.offlineMode) {
      return null; // No fallback when forcing a provider or in offline mode
    }

    return this.config.fallbackProvider === "google"
      ? this.googleProvider
      : this.transformersProvider;
  }

  /**
   * Check which providers are available
   */
  getAvailableProviders(): { google: boolean; transformers: boolean } {
    return {
      google: this.googleProvider.isAvailable(),
      transformers: this.transformersProvider.isAvailable(),
    };
  }

  /**
   * Get the dimensions of the current primary provider
   */
  getDimensions(): number {
    return this.getPrimaryProvider().dimensions;
  }

  /**
   * Get the name of the current primary provider
   */
  getProviderName(): string {
    return this.getPrimaryProvider().name;
  }

  /**
   * Generate embedding for a single text with automatic fallback
   */
  async embed(text: string): Promise<EmbeddingResult> {
    const primary = this.getPrimaryProvider();
    const fallback = this.getFallbackProvider();

    // Try primary provider
    if (primary.isAvailable()) {
      try {
        const result = await primary.embed(text);
        return result;
      } catch (error: unknown) {
        console.warn(
          `Primary embedding provider (${primary.name}) failed:`,
          error.message,
        );

        // Try fallback if available (and it's not the same as primary)
        if (fallback && fallback.name !== primary.name) {
          try {
            // Check availability again as it might have changed
            if (fallback.isAvailable()) {
              console.log(`Falling back to ${fallback.name} for embeddings`);
              return await fallback.embed(text);
            }
          } catch (fallbackError: unknown) {
            console.warn(
              `Fallback provider (${fallback.name}) also failed:`,
              fallbackError.message,
            );
            // Continue to throw the original error
          }
        }

        throw error;
      }
    }

    // Primary not available, try fallback directly
    if (fallback && fallback.name !== primary.name) {
      try {
        if (fallback.isAvailable()) {
          console.log(
            `Primary provider (${primary.name}) not available, using ${fallback.name}`,
          );
          return await fallback.embed(text);
        }
      } catch (error: unknown) {
        console.warn(
          `Fallback provider (${fallback.name}) failed:`,
          error.message,
        );
        throw error;
      }
    }

    throw new Error(
      `No embedding providers available. Primary: ${primary.name}, Fallback: ${fallback?.name || "none"}`,
    );
  }

  /**
   * Generate embeddings for multiple texts with automatic fallback
   */
  async embedBatch(texts: string[]): Promise<EmbeddingBatchResult> {
    if (texts.length === 0) {
      return {
        embeddings: [],
        provider: this.getProviderName(),
      };
    }

    const primary = this.getPrimaryProvider();
    const fallback = this.getFallbackProvider();

    // Try primary provider
    if (primary.isAvailable()) {
      try {
        return await primary.embedBatch(texts);
      } catch (error: unknown) {
        console.warn(
          `Primary embedding provider (${primary.name}) failed:`,
          error.message,
        );

        // Try fallback if available (and it's not the same as primary)
        if (fallback && fallback.name !== primary.name) {
          try {
            if (fallback.isAvailable()) {
              console.log(
                `Falling back to ${fallback.name} for batch embeddings`,
              );
              return await fallback.embedBatch(texts);
            }
          } catch (fallbackError: unknown) {
            console.warn(
              `Fallback provider (${fallback.name}) also failed:`,
              fallbackError.message,
            );
          }
        }

        throw error;
      }
    }

    // Primary not available, try fallback directly
    if (fallback && fallback.name !== primary.name) {
      try {
        if (fallback.isAvailable()) {
          console.log(
            `Primary provider (${primary.name}) not available, using ${fallback.name}`,
          );
          return await fallback.embedBatch(texts);
        }
      } catch (error: unknown) {
        console.warn(
          `Fallback provider (${fallback.name}) failed:`,
          error.message,
        );
        throw error;
      }
    }

    throw new Error(
      `No embedding providers available. Primary: ${primary.name}, Fallback: ${fallback?.name || "none"}`,
    );
  }

  /**
   * Set offline mode (only use local Transformers.js)
   */
  setOfflineMode(enabled: boolean): void {
    this.config.offlineMode = enabled;
  }

  /**
   * Force a specific provider (no fallback)
   */
  setForceProvider(provider: "google" | "transformers" | undefined): void {
    this.config.forceProvider = provider;
  }
}

// Export singleton getter for convenience
export function getEmbeddingFactory(
  config?: Partial<EmbeddingFactoryConfig>,
): EmbeddingFactory {
  return EmbeddingFactory.getInstance(config);
}
