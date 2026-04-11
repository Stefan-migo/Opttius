import type {
  LLMConfig,
  LLMMessage,
  LLMModel,
  LLMProvider,
  LLMResponse,
  LLMStreamChunk,
  LLMTool,
} from "../types";
import { BaseLLMProvider } from "./base";

export class AnthropicProvider extends BaseLLMProvider {
  name: LLMProvider = "anthropic";

  private readonly models: LLMModel[] = [
    {
      id: "claude-3-opus-20240229",
      name: "Claude 3 Opus",
      provider: "anthropic",
      maxTokens: 200000,
      supportsStreaming: true,
      supportsFunctionCalling: true,
      costPer1kTokens: { input: 0.015, output: 0.075 },
    },
    {
      id: "claude-3-sonnet-20240229",
      name: "Claude 3 Sonnet",
      provider: "anthropic",
      maxTokens: 200000,
      supportsStreaming: true,
      supportsFunctionCalling: true,
      costPer1kTokens: { input: 0.003, output: 0.015 },
    },
    {
      id: "claude-3-haiku-20240307",
      name: "Claude 3 Haiku",
      provider: "anthropic",
      maxTokens: 200000,
      supportsStreaming: true,
      supportsFunctionCalling: true,
      costPer1kTokens: { input: 0.00025, output: 0.00125 },
    },
  ];

  getAvailableModels(): LLMModel[] {
    return this.models;
  }

  validateConfig(config: LLMConfig): boolean {
    return (
      this.validateApiKey(config.apiKey) &&
      this.models.some((m) => m.id === config.model)
    );
  }

  async *streamText(
    messages: LLMMessage[],
    tools?: LLMTool[],
    config?: Partial<LLMConfig>,
  ): AsyncGenerator<LLMStreamChunk> {
    const apiKey = config?.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("Anthropic API key is required");
    }

    const model = config?.model || "claude-3-sonnet-20240229";
    const baseURL = "https://api.anthropic.com/v1/messages";

    const systemMessage = messages.find((m) => m.role === "system");
    const userMessages = messages.filter((m) => m.role !== "system");

    const response = await fetch(baseURL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        ...(systemMessage && { system: systemMessage.content }),
        messages: userMessages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
        ...(tools && {
          tools: tools.map((t) => ({
            name: t.function.name,
            description: t.function.description,
            input_schema: t.function.parameters,
          })),
        }),
        temperature: config?.temperature ?? 0.7,
        max_tokens: config?.maxTokens ?? 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: { message: response.statusText } }));
      throw new Error(
        `Anthropic API error: ${error.error?.message || response.statusText}`,
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
            if (parsed.type === "content_block_delta") {
              const text = parsed.delta?.text;
              if (text) {
                yield {
                  content: text,
                  done: false,
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
    const apiKey = config?.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("Anthropic API key is required");
    }

    const model = config?.model || "claude-3-sonnet-20240229";
    const baseURL = "https://api.anthropic.com/v1/messages";

    const systemMessage = messages.find((m) => m.role === "system");
    const userMessages = messages.filter((m) => m.role !== "system");

    const response = await fetch(baseURL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        ...(systemMessage && { system: systemMessage.content }),
        messages: userMessages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
        ...(tools && {
          tools: tools.map((t) => ({
            name: t.function.name,
            description: t.function.description,
            input_schema: t.function.parameters,
          })),
        }),
        temperature: config?.temperature ?? 0.7,
        max_tokens: config?.maxTokens ?? 4096,
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: { message: response.statusText } }));
      throw new Error(
        `Anthropic API error: ${error.error?.message || response.statusText}`,
      );
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "";

    return {
      content,
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens: data.usage.input_tokens + data.usage.output_tokens,
          }
        : undefined,
      finishReason: data.stop_reason,
      model: data.model,
    };
  }
}
