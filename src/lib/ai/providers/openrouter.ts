import type {
  LLMConfig,
  LLMMessage,
  LLMModel,
  LLMProvider,
  LLMResponse,
  LLMStreamChunk,
  LLMTool,
  ToolCall,
} from "../types";
import { BaseLLMProvider } from "./base";

/**
 * OpenRouter Provider
 *
 * OpenRouter aggregates multiple LLM providers (OpenAI, Anthropic, Google, etc.)
 * through a unified API, offering competitive pricing and automatic fallbacks.
 *
 * Key features:
 * - Access to 100+ models through a single API
 * - Automatic fallback if a model is unavailable
 * - Competitive pricing (often cheaper than direct providers)
 * - Usage tracking and analytics
 *
 * The API is OpenAI-compatible, so the implementation is similar to OpenAI.
 */
export class OpenRouterProvider extends BaseLLMProvider {
  name: LLMProvider = "openrouter";

  private readonly models: LLMModel[] = [
    // Anthropic models via OpenRouter
    {
      id: "anthropic/claude-3.5-sonnet",
      name: "Claude 3.5 Sonnet",
      provider: "openrouter",
      maxTokens: 200000,
      supportsStreaming: true,
      supportsFunctionCalling: true,
      costPer1kTokens: { input: 0.003, output: 0.015 },
    },
    {
      id: "anthropic/claude-3-opus",
      name: "Claude 3 Opus",
      provider: "openrouter",
      maxTokens: 200000,
      supportsStreaming: true,
      supportsFunctionCalling: true,
      costPer1kTokens: { input: 0.015, output: 0.075 },
    },
    {
      id: "anthropic/claude-3-haiku",
      name: "Claude 3 Haiku",
      provider: "openrouter",
      maxTokens: 200000,
      supportsStreaming: true,
      supportsFunctionCalling: true,
      costPer1kTokens: { input: 0.00025, output: 0.00125 },
    },
    // OpenAI models via OpenRouter
    {
      id: "openai/gpt-4-turbo",
      name: "GPT-4 Turbo",
      provider: "openrouter",
      maxTokens: 128000,
      supportsStreaming: true,
      supportsFunctionCalling: true,
      costPer1kTokens: { input: 0.01, output: 0.03 },
    },
    {
      id: "openai/gpt-4o",
      name: "GPT-4o",
      provider: "openrouter",
      maxTokens: 128000,
      supportsStreaming: true,
      supportsFunctionCalling: true,
      costPer1kTokens: { input: 0.005, output: 0.015 },
    },
    {
      id: "openai/gpt-3.5-turbo",
      name: "GPT-3.5 Turbo",
      provider: "openrouter",
      maxTokens: 16385,
      supportsStreaming: true,
      supportsFunctionCalling: true,
      costPer1kTokens: { input: 0.0005, output: 0.0015 },
    },
    // Google models via OpenRouter
    {
      id: "google/gemini-pro-1.5",
      name: "Gemini Pro 1.5",
      provider: "openrouter",
      maxTokens: 1000000,
      supportsStreaming: true,
      supportsFunctionCalling: true,
      costPer1kTokens: { input: 0.0025, output: 0.01 },
    },
    {
      id: "google/gemini-flash-1.5",
      name: "Gemini Flash 1.5",
      provider: "openrouter",
      maxTokens: 1000000,
      supportsStreaming: true,
      supportsFunctionCalling: true,
      costPer1kTokens: { input: 0.00025, output: 0.001 },
    },
    // Meta models via OpenRouter
    {
      id: "meta-llama/llama-3.1-70b-instruct",
      name: "Llama 3.1 70B",
      provider: "openrouter",
      maxTokens: 131072,
      supportsStreaming: true,
      supportsFunctionCalling: false,
      costPer1kTokens: { input: 0.00052, output: 0.00075 },
    },
    // DeepSeek via OpenRouter (often cheaper than direct)
    {
      id: "deepseek/deepseek-chat",
      name: "DeepSeek Chat",
      provider: "openrouter",
      maxTokens: 64000,
      supportsStreaming: true,
      supportsFunctionCalling: true,
      costPer1kTokens: { input: 0.00014, output: 0.00028 },
    },
  ];

  getAvailableModels(): LLMModel[] {
    return this.models;
  }

  validateConfig(config: LLMConfig): boolean {
    // OpenRouter accepts any model ID, so we don't validate against the list
    return this.validateApiKey(config.apiKey);
  }

  async *streamText(
    messages: LLMMessage[],
    tools?: LLMTool[],
    config?: Partial<LLMConfig>,
  ): AsyncGenerator<LLMStreamChunk> {
    const apiKey = config?.apiKey || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OpenRouter API key is required");
    }

    const baseURL = config?.baseURL || "https://openrouter.ai/api/v1";
    const model =
      config?.model ||
      process.env.OPENROUTER_DEFAULT_MODEL ||
      "google/gemini-2.0-flash-exp";

    // OpenRouter-specific headers
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://opttius.com",
      "X-Title": "Opttius AI Assistant",
    };

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: this.formatMessages(messages),
        ...(tools && { tools }),
        temperature: config?.temperature ?? 0.7,
        max_tokens: config?.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: { message: response.statusText } }));
      throw new Error(
        `OpenRouter API error: ${error.error?.message || response.statusText}`,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get response stream");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            yield { content: "", done: true };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const choice = parsed.choices?.[0];
            const delta = choice?.delta;

            if (delta?.content) {
              yield {
                content: delta.content,
                done: false,
              };
            }

            if (delta?.tool_calls) {
              const toolCalls: ToolCall[] = delta.tool_calls.map(
                (tc: unknown) => {
                  let args = {};
                  try {
                    args = tc.function?.arguments
                      ? JSON.parse(tc.function.arguments)
                      : {};
                  } catch (e) {
                    // If parsing fails, use empty object
                  }

                  return {
                    id: tc.id || crypto.randomUUID(),
                    name: tc.function?.name || "",
                    arguments: args,
                  };
                },
              );

              if (toolCalls.length > 0) {
                yield {
                  content: "",
                  done: false,
                  toolCalls,
                };
              }
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    yield { content: "", done: true };
  }

  async generateText(
    messages: LLMMessage[],
    tools?: LLMTool[],
    config?: Partial<LLMConfig>,
  ): Promise<LLMResponse> {
    const apiKey = config?.apiKey || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OpenRouter API key is required");
    }

    const baseURL = config?.baseURL || "https://openrouter.ai/api/v1";
    const model =
      config?.model ||
      process.env.OPENROUTER_DEFAULT_MODEL ||
      "google/gemini-2.0-flash-exp";

    // OpenRouter-specific headers
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://opttius.com",
      "X-Title": "Opttius AI Assistant",
    };

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: this.formatMessages(messages),
        ...(tools && { tools }),
        temperature: config?.temperature ?? 0.7,
        max_tokens: config?.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: { message: response.statusText } }));
      throw new Error(
        `OpenRouter API error: ${error.error?.message || response.statusText}`,
      );
    }

    const data = await response.json();
    const choice = data.choices[0];
    const message = choice.message;

    const toolCalls: ToolCall[] = [];
    if (message.tool_calls) {
      for (const tc of message.tool_calls) {
        let args = {};
        try {
          args = tc.function?.arguments
            ? JSON.parse(tc.function.arguments)
            : {};
        } catch (e) {
          // If parsing fails, use empty object
        }

        toolCalls.push({
          id: tc.id || crypto.randomUUID(),
          name: tc.function?.name || "",
          arguments: args,
        });
      }
    }

    return {
      content: message.content || "",
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
      finishReason: choice.finish_reason,
      model: data.model,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }
}
