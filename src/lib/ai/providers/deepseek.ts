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

export class DeepSeekProvider extends BaseLLMProvider {
  name: LLMProvider = "deepseek";

  private readonly models: LLMModel[] = [
    {
      id: "deepseek-chat",
      name: "DeepSeek Chat",
      provider: "deepseek",
      maxTokens: 32000,
      supportsStreaming: true,
      supportsFunctionCalling: true,
      costPer1kTokens: { input: 0.00014, output: 0.00028 },
    },
    {
      id: "deepseek-coder",
      name: "DeepSeek Coder",
      provider: "deepseek",
      maxTokens: 16000,
      supportsStreaming: true,
      supportsFunctionCalling: false,
      costPer1kTokens: { input: 0.00014, output: 0.00028 },
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
    const apiKey = config?.apiKey || process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("DeepSeek API key is required");
    }

    const baseURL = config?.baseURL || "https://api.deepseek.com/v1";
    const model = config?.model || "deepseek-chat";

    const requestBody = {
      model,
      messages: this.formatMessages(messages),
      ...(tools && { tools }),
      temperature: config?.temperature ?? 0.7,
      max_tokens: config?.maxTokens,
      stream: true,
    };

    // Log the tools being sent to DeepSeek
    if (tools) {
      console.log("DeepSeek request - tools count:", tools.length);
      console.log(
        "DeepSeek request - tool names:",
        tools.map((t) => t.function?.name).join(", "),
      );
      // Log first tool schema as example
      if (tools[0]) {
        console.log(
          "DeepSeek request - sample tool:",
          JSON.stringify(tools[0], null, 2).substring(0, 500),
        );
      }
    }

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: { message: response.statusText } }));
      throw new Error(
        `DeepSeek API error: ${error.error?.message || response.statusText}`,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get response stream");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    // Accumulate tool calls by ID to handle incremental streaming
    const accumulatedToolCalls = new Map<
      string,
      { id: string; name: string; argumentsBuffer: string }
    >();

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log("=== DEEPSEEK STREAM ENDED (reader.done) ===");
        // Process any remaining accumulated tool calls
        const finalToolCalls: ToolCall[] = [];
        console.log(
          "Accumulated tool calls at stream end:",
          accumulatedToolCalls.size,
        );

        for (const [id, acc] of accumulatedToolCalls.entries()) {
          console.log("Processing at stream end:", {
            id,
            name: acc.name,
            bufferLength: acc.argumentsBuffer.length,
            bufferContent: acc.argumentsBuffer,
          });

          // Only require name - arguments can be empty for some tools
          if (acc.name && acc.name.trim()) {
            let args = {};
            if (acc.argumentsBuffer && acc.argumentsBuffer.trim()) {
              try {
                args = JSON.parse(acc.argumentsBuffer);
                console.log("Parsed args at stream end:", args);
              } catch (e) {
                console.warn(
                  "Failed to parse tool arguments:",
                  acc.argumentsBuffer,
                );
                // Keep as empty object
              }
            }
            finalToolCalls.push({
              id: acc.id,
              name: acc.name.trim(),
              arguments: args,
            });
          }
        }

        if (finalToolCalls.length > 0) {
          console.log(
            "Yielding stream end tool calls:",
            finalToolCalls.map((tc) => ({
              name: tc.name,
              args: tc.arguments,
            })),
          );
          yield {
            content: "",
            done: false,
            toolCalls: finalToolCalls,
          };
        }

        yield { content: "", done: true };
        return;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            // Process accumulated tool calls before finishing
            const finalToolCalls: ToolCall[] = [];
            console.log("=== DEEPSEEK [DONE] PROCESSING ===");
            console.log(
              "Accumulated tool calls map size:",
              accumulatedToolCalls.size,
            );

            for (const [id, acc] of accumulatedToolCalls.entries()) {
              console.log("Processing accumulated:", {
                id,
                name: acc.name,
                argumentsBufferLength: acc.argumentsBuffer.length,
                argumentsBufferRaw: acc.argumentsBuffer,
              });

              // Only require name - arguments can be empty for some tools
              if (acc.name && acc.name.trim()) {
                let args = {};
                if (acc.argumentsBuffer && acc.argumentsBuffer.trim()) {
                  try {
                    args = JSON.parse(acc.argumentsBuffer);
                    console.log("Parsed arguments successfully:", args);
                  } catch (e) {
                    console.warn(
                      "Failed to parse tool arguments on [DONE]:",
                      acc.argumentsBuffer,
                    );
                    // Try to extract key-value pairs manually if JSON parse fails
                    try {
                      // Sometimes LLMs send malformed JSON, try to fix common issues
                      const cleaned = acc.argumentsBuffer.trim();
                      if (cleaned.startsWith("{") && !cleaned.endsWith("}")) {
                        args = JSON.parse(cleaned + "}");
                        console.log("Parsed with added closing brace:", args);
                      }
                    } catch (e2) {
                      console.warn("Could not recover arguments:", e2);
                    }
                  }
                }
                console.log("Final tool call:", { name: acc.name, args });
                finalToolCalls.push({
                  id: acc.id,
                  name: acc.name.trim(),
                  arguments: args,
                });
              }
            }
            console.log("=================================");

            if (finalToolCalls.length > 0) {
              console.log("=== DEEPSEEK FINAL TOOL CALLS ===");
              for (const tc of finalToolCalls) {
                console.log("Tool call:", tc.name);
                console.log(
                  "Tool arguments:",
                  JSON.stringify(tc.arguments, null, 2),
                );
              }
              console.log("================================");
              yield {
                content: "",
                done: false,
                toolCalls: finalToolCalls,
              };
            }

            yield { content: "", done: true };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const choice = parsed.choices?.[0];
            const delta = choice?.delta;
            const finishReason = choice?.finish_reason;

            // Log if this is a finish chunk
            if (finishReason) {
              console.log("DeepSeek finish_reason:", finishReason);
              console.log(
                "DeepSeek accumulated tool calls at finish:",
                Array.from(accumulatedToolCalls.entries()).map(([id, acc]) => ({
                  id,
                  name: acc.name,
                  argsLength: acc.argumentsBuffer.length,
                  argsPreview: acc.argumentsBuffer.substring(0, 100),
                })),
              );
            }

            // Log raw chunk for debugging
            if (delta?.tool_calls) {
              console.log("DeepSeek RAW chunk:", data.substring(0, 500));
            }

            if (delta?.content) {
              yield {
                content: delta.content,
                done: false,
              };
            }

            if (delta?.tool_calls) {
              console.log(
                "DeepSeek tool_calls delta:",
                JSON.stringify(delta.tool_calls, null, 2),
              );
              // Accumulate tool calls incrementally
              for (const tc of delta.tool_calls) {
                console.log("DeepSeek processing tc:", JSON.stringify(tc));

                // IMPORTANT: DeepSeek sends id only in the first chunk, subsequent chunks only have index
                // We MUST use index as the primary key to accumulate all chunks together
                const tcIndex = tc.index !== undefined ? tc.index : 0;
                const mapKey = `index-${tcIndex}`; // Always use index as key

                if (!accumulatedToolCalls.has(mapKey)) {
                  accumulatedToolCalls.set(mapKey, {
                    id: tc.id || `tool-${tcIndex}`,
                    name: "",
                    argumentsBuffer: "",
                  });
                  console.log(
                    "DeepSeek created new tool accumulator for index:",
                    tcIndex,
                  );
                }

                const acc = accumulatedToolCalls.get(mapKey)!;

                // Update ID if we get a real one (first chunk has the real id)
                if (tc.id) {
                  acc.id = tc.id;
                  console.log("DeepSeek set tool call ID to:", tc.id);
                }

                // Accumulate name (comes in first chunk)
                if (tc.function?.name) {
                  acc.name = tc.function.name.trim();
                  console.log("DeepSeek tool name received:", acc.name);
                }

                // Accumulate arguments (may come in multiple chunks as string)
                if (
                  tc.function?.arguments !== undefined &&
                  tc.function?.arguments !== null
                ) {
                  const argValue = tc.function.arguments;
                  console.log(
                    "DeepSeek raw arguments value:",
                    JSON.stringify(argValue),
                    "type:",
                    typeof argValue,
                  );

                  if (typeof argValue === "string") {
                    acc.argumentsBuffer += argValue;
                  } else if (typeof argValue === "object") {
                    // If it's already an object, convert to string and append
                    acc.argumentsBuffer += JSON.stringify(argValue);
                  }
                  console.log(
                    "DeepSeek arguments buffer now:",
                    acc.argumentsBuffer,
                  );
                }

                console.log("DeepSeek accumulator state:", {
                  key: mapKey,
                  id: acc.id,
                  name: acc.name,
                  argsLen: acc.argumentsBuffer.length,
                });
              }
            }
          } catch (e) {
            console.warn("DeepSeek JSON parse error:", e);
            // Skip invalid JSON
          }
        }
      }
    }
  }

  protected formatMessages(messages: LLMMessage[]): unknown[] {
    return messages.map((msg) => {
      const formatted: unknown = {
        role: msg.role,
        content: msg.content || null,
      };

      if (msg.name) {
        formatted.name = msg.name;
      }

      if (msg.toolCallId) {
        formatted.tool_call_id = msg.toolCallId;
      }

      // For assistant messages with tool calls, format them correctly
      if (
        msg.role === "assistant" &&
        msg.toolCalls &&
        msg.toolCalls.length > 0
      ) {
        formatted.tool_calls = msg.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        }));
        // When tool_calls are present, content must be null for DeepSeek
        // DeepSeek requires reasoning_content if content is provided with tool_calls
        formatted.content = null;
      }

      return formatted;
    });
  }

  async generateText(
    messages: LLMMessage[],
    tools?: LLMTool[],
    config?: Partial<LLMConfig>,
  ): Promise<LLMResponse> {
    const apiKey = config?.apiKey || process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("DeepSeek API key is required");
    }

    const baseURL = config?.baseURL || "https://api.deepseek.com/v1";
    const model = config?.model || "deepseek-chat";

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
        `DeepSeek API error: ${error.error?.message || response.statusText}`,
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
          // Handle both string and object arguments
          const argValue = tc.function?.arguments;
          if (typeof argValue === "string") {
            args = argValue ? JSON.parse(argValue) : {};
          } else if (argValue) {
            args = argValue;
          }
        } catch (e) {
          // If parsing fails, use empty object
        }

        const toolName = tc.function?.name?.trim() || "";

        // Only include tool calls with valid names
        if (toolName) {
          toolCalls.push({
            id: tc.id || crypto.randomUUID(),
            name: toolName,
            arguments: args,
          });
        }
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
