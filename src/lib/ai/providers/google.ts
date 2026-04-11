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

export class GoogleProvider extends BaseLLMProvider {
  name: LLMProvider = "google";

  private readonly models: LLMModel[] = [
    {
      id: "gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      provider: "google",
      maxTokens: 32768,
      supportsStreaming: true,
      supportsFunctionCalling: true,
      costPer1kTokens: { input: 0.0005, output: 0.0015 },
    },
    {
      id: "gemini-pro",
      name: "Gemini Pro",
      provider: "google",
      maxTokens: 32768,
      supportsStreaming: true,
      supportsFunctionCalling: true,
      costPer1kTokens: { input: 0.0005, output: 0.0015 },
    },
    {
      id: "gemini-pro-vision",
      name: "Gemini Pro Vision",
      provider: "google",
      maxTokens: 16384,
      supportsStreaming: true,
      supportsFunctionCalling: false,
      costPer1kTokens: { input: 0.0005, output: 0.0015 },
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

  private formatMessagesForGemini(messages: LLMMessage[]): unknown[] {
    return messages.map((msg) => {
      if (msg.role === "tool") {
        // Tool responses in Gemini format
        return {
          role: "function",
          parts: [
            {
              functionResponse: {
                name: msg.name || "",
                response: msg.content,
              },
            },
          ],
        };
      }

      const role =
        msg.role === "assistant"
          ? "model"
          : msg.role === "system"
            ? "user"
            : msg.role;
      return {
        role,
        parts: [{ text: msg.content }],
      };
    });
  }

  async *streamText(
    messages: LLMMessage[],
    tools?: LLMTool[],
    config?: Partial<LLMConfig>,
  ): AsyncGenerator<LLMStreamChunk> {
    const apiKey = config?.apiKey || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("Google API key is required");
    }

    const model = config?.model || "gemini-2.5-flash";
    // Use v1beta for all Gemini models including 2.5-flash
    const baseURL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent`;

    const systemMessage = messages.find((m) => m.role === "system");
    const userMessages = messages.filter((m) => m.role !== "system");

    const functionDeclarations = tools
      ? tools.map((t) => ({
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
        }))
      : undefined;

    const response = await fetch(`${baseURL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: this.formatMessagesForGemini(userMessages),
        ...(systemMessage && {
          systemInstruction: { parts: [{ text: systemMessage.content }] },
        }),
        ...(functionDeclarations &&
          functionDeclarations.length > 0 && {
            tools: [{ functionDeclarations }],
          }),
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: { message: response.statusText } }));
      throw new Error(
        `Google API error: ${error.error?.message || response.statusText}`,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get response stream");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let jsonBuffer = "";
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;

    const processCompleteJSON = (jsonStr: string) => {
      try {
        const parsed = JSON.parse(jsonStr);

        // Check for errors first
        if (parsed.error) {
          console.error("Gemini API error:", parsed.error);
          throw new Error(
            `Gemini API error: ${parsed.error.message || JSON.stringify(parsed.error)}`,
          );
        }

        // Handle different response formats
        const candidate = parsed.candidates?.[0] || parsed.candidate;
        const content = candidate?.content;
        const finishReason = candidate?.finishReason;

        // Process content first, even if finishReason is present
        // (the finishReason might be in the same chunk as the last text)
        let textContent = "";
        const toolCalls: ToolCall[] = [];

        if (content?.parts) {
          for (const part of content.parts) {
            if (part.text) {
              textContent += part.text;
            }
            if (part.functionCall) {
              toolCalls.push({
                id: crypto.randomUUID(),
                name: part.functionCall.name,
                arguments: part.functionCall.args || {},
              });
            }
          }
        }

        // Check if stream is done AFTER processing content
        // Only mark as done if finishReason is STOP, MAX_TOKENS, or SAFETY
        if (
          finishReason &&
          (finishReason === "STOP" ||
            finishReason === "MAX_TOKENS" ||
            finishReason === "SAFETY")
        ) {
          console.log(
            "Stream finished with reason:",
            finishReason,
            "Final text length:",
            textContent.length,
          );
          return { done: true, text: textContent, toolCalls };
        }

        // Return content if we have any
        if (textContent || toolCalls.length > 0) {
          return { done: false, text: textContent, toolCalls };
        }

        return null;
      } catch (e) {
        // If it's an error we threw, re-throw it
        if (e instanceof Error && e.message.includes("Gemini API error")) {
          throw e;
        }
        // Otherwise, ignore parse errors
        return null;
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // Try to parse any remaining buffer
        if (jsonBuffer.trim()) {
          const result = processCompleteJSON(jsonBuffer);
          if (result) {
            if (result.text) {
              yield { content: result.text, done: false };
            }
            if (result.toolCalls && result.toolCalls.length > 0) {
              console.log(
                "Yielding remaining tool calls:",
                result.toolCalls.map((tc) => tc.name).join(", "),
              );
              yield { content: "", done: false, toolCalls: result.toolCalls };
            }
          }
        }
        yield { content: "", done: true };
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Process character by character to build complete JSON objects
      for (let i = 0; i < buffer.length; i++) {
        const char = buffer[i];

        if (escapeNext) {
          jsonBuffer += char;
          escapeNext = false;
          continue;
        }

        if (char === "\\") {
          escapeNext = true;
          jsonBuffer += char;
          continue;
        }

        if (char === '"') {
          inString = !inString;
          jsonBuffer += char;
          continue;
        }

        if (!inString) {
          if (char === "{") {
            if (braceCount === 0) {
              jsonBuffer = "{";
            } else {
              jsonBuffer += char;
            }
            braceCount++;
          } else if (char === "}") {
            jsonBuffer += char;
            braceCount--;

            if (braceCount === 0) {
              // We have a complete JSON object
              const result = processCompleteJSON(jsonBuffer);
              if (result) {
                // First yield any text content
                if (result.text) {
                  console.log(
                    "Yielding text chunk:",
                    result.text.substring(0, 50) + "...",
                  );
                  yield { content: result.text, done: false };
                }

                // Then yield tool calls if any (BEFORE marking done)
                if (result.toolCalls && result.toolCalls.length > 0) {
                  console.log(
                    "Yielding tool calls:",
                    result.toolCalls.map((tc) => tc.name).join(", "),
                  );
                  yield {
                    content: "",
                    done: false,
                    toolCalls: result.toolCalls,
                  };
                }

                // Finally, if done, mark as done
                if (result.done) {
                  console.log("Gemini stream finished");
                  yield { content: "", done: true };
                  return;
                }
              }
              jsonBuffer = "";
            }
          } else {
            if (braceCount > 0) {
              jsonBuffer += char;
            }
          }
        } else {
          jsonBuffer += char;
        }
      }

      buffer = "";
    }

    yield { content: "", done: true };
  }

  async generateText(
    messages: LLMMessage[],
    tools?: LLMTool[],
    config?: Partial<LLMConfig>,
  ): Promise<LLMResponse> {
    const apiKey = config?.apiKey || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("Google API key is required");
    }

    const model = config?.model || "gemini-2.5-flash";
    // Use v1beta for all Gemini models including 2.5-flash
    const baseURL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const systemMessage = messages.find((m) => m.role === "system");
    const userMessages = messages.filter((m) => m.role !== "system");

    const functionDeclarations = tools
      ? tools.map((t) => ({
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
        }))
      : undefined;

    const response = await fetch(`${baseURL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: this.formatMessagesForGemini(userMessages),
        ...(systemMessage && {
          systemInstruction: { parts: [{ text: systemMessage.content }] },
        }),
        ...(functionDeclarations &&
          functionDeclarations.length > 0 && {
            tools: [{ functionDeclarations }],
          }),
        generationConfig: {
          temperature: config?.temperature ?? 0.7,
          maxOutputTokens: config?.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: { message: response.statusText } }));
      throw new Error(
        `Google API error: ${error.error?.message || response.statusText}`,
      );
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const contentParts = candidate?.content?.parts || [];

    let textContent = "";
    const toolCalls: ToolCall[] = [];

    for (const part of contentParts) {
      if (part.text) {
        textContent += part.text;
      }
      if (part.functionCall) {
        toolCalls.push({
          id: crypto.randomUUID(),
          name: part.functionCall.name,
          arguments: part.functionCall.args || {},
        });
      }
    }

    return {
      content: textContent,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount,
            completionTokens: data.usageMetadata.candidatesTokenCount,
            totalTokens: data.usageMetadata.totalTokenCount,
          }
        : undefined,
      finishReason: candidate?.finishReason,
      model: model,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }
}
