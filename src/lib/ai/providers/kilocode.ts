import { BaseLLMProvider } from "./base";
import type {
  LLMProvider,
  LLMMessage,
  LLMTool,
  LLMConfig,
  LLMModel,
  LLMResponse,
  LLMStreamChunk,
  ToolCall,
} from "../types";

export class KilocodeProvider extends BaseLLMProvider {
  name: LLMProvider = "kilocode";

  private readonly models: LLMModel[] = [
    {
      id: "kilocode-frontier",
      name: "Kilocode Frontier",
      provider: "kilocode",
      maxTokens: 128000,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    {
      id: "kilocode-coder",
      name: "Kilocode Coder",
      provider: "kilocode",
      maxTokens: 32768,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
  ];

  getAvailableModels(): LLMModel[] {
    return this.models;
  }

  validateConfig(config: LLMConfig): boolean {
    // Kilocode is OpenAI compatible, so we just need an API key
    // We allow models not in the hardcoded list because Kilocode might add more
    return this.validateApiKey(config.apiKey);
  }

  async *streamText(
    messages: LLMMessage[],
    tools?: LLMTool[],
    config?: Partial<LLMConfig>,
  ): AsyncGenerator<LLMStreamChunk> {
    const apiKey = config?.apiKey || process.env.KILOCODE_API_KEY;
    if (!apiKey) {
      throw new Error("Kilocode API key is required (KILOCODE_API_KEY)");
    }

    const baseURL =
      config?.baseURL ||
      process.env.KILOCODE_BASE_URL ||
      "https://api.kilo.ai/v1";
    const model =
      config?.model ||
      process.env.KILOCODE_DEFAULT_MODEL ||
      "kilocode-frontier";

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
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
        `Kilocode API error: ${error.error?.message || response.statusText}`,
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
              const toolCalls: ToolCall[] = delta.tool_calls.map((tc: any) => {
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
              });

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
    const apiKey = config?.apiKey || process.env.KILOCODE_API_KEY;
    if (!apiKey) {
      throw new Error("Kilocode API key is required (KILOCODE_API_KEY)");
    }

    const baseURL =
      config?.baseURL ||
      process.env.KILOCODE_BASE_URL ||
      "https://api.kilo.ai/v1";
    const model =
      config?.model ||
      process.env.KILOCODE_DEFAULT_MODEL ||
      "kilocode-frontier";

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
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
        `Kilocode API error: ${error.error?.message || response.statusText}`,
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
