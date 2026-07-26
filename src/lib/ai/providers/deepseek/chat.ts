
import { appLogger } from '@/lib/logger';

import type {
  LLMConfig,
  LLMMessage,
  LLMStreamChunk,
  LLMTool,
  ToolCall,
} from "../../types";
import { formatMessages } from "./helpers";

export async function* streamText(
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
    messages: formatMessages(messages),
    ...(tools && { tools }),
    temperature: config?.temperature ?? 0.7,
    max_tokens: config?.maxTokens,
    stream: true,
  };

  // Log the tools being sent to DeepSeek
  if (tools) {
    appLogger.info("DeepSeek request - tools count:", tools.length);
    appLogger.info(
      "DeepSeek request - tool names:",
      tools.map((t) => t.function?.name).join(", "),
    );
    // Log first tool schema as example
    if (tools[0]) {
      appLogger.info(
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
      appLogger.info("=== DEEPSEEK STREAM ENDED (reader.done) ===");
      // Process any remaining accumulated tool calls
      const finalToolCalls: ToolCall[] = [];
      appLogger.info(
        "Accumulated tool calls at stream end:",
        accumulatedToolCalls.size,
      );

      for (const [id, acc] of accumulatedToolCalls.entries()) {
        appLogger.info("Processing at stream end:", {
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
              appLogger.info("Parsed args at stream end:", args);
            } catch (e) {
              appLogger.warn(
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
        appLogger.info(
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
          appLogger.info("=== DEEPSEEK [DONE] PROCESSING ===");
          appLogger.info(
            "Accumulated tool calls map size:",
            accumulatedToolCalls.size,
          );

          for (const [id, acc] of accumulatedToolCalls.entries()) {
            appLogger.info("Processing accumulated:", {
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
                  appLogger.info("Parsed arguments successfully:", args);
                } catch (e) {
                  appLogger.warn(
                    "Failed to parse tool arguments on [DONE]:",
                    acc.argumentsBuffer,
                  );
                  // Try to extract key-value pairs manually if JSON parse fails
                  try {
                    // Sometimes LLMs send malformed JSON, try to fix common issues
                    const cleaned = acc.argumentsBuffer.trim();
                    if (cleaned.startsWith("{") && !cleaned.endsWith("}")) {
                      args = JSON.parse(cleaned + "}");
                      appLogger.info("Parsed with added closing brace:", args);
                    }
                  } catch (e2) {
                    appLogger.warn("Could not recover arguments:", e2);
                  }
                }
              }
              appLogger.info("Final tool call:", { name: acc.name, args });
              finalToolCalls.push({
                id: acc.id,
                name: acc.name.trim(),
                arguments: args,
              });
            }
          }
          appLogger.info("=================================");

          if (finalToolCalls.length > 0) {
            appLogger.info("=== DEEPSEEK FINAL TOOL CALLS ===");
            for (const tc of finalToolCalls) {
              appLogger.info("Tool call:", tc.name);
              appLogger.info(
                "Tool arguments:",
                JSON.stringify(tc.arguments, null, 2),
              );
            }
            appLogger.info("================================");
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
            appLogger.info("DeepSeek finish_reason:", finishReason);
            appLogger.info(
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
            appLogger.info("DeepSeek RAW chunk:", data.substring(0, 500));
          }

          if (delta?.content) {
            yield {
              content: delta.content,
              done: false,
            };
          }

          if (delta?.tool_calls) {
            appLogger.info(
              "DeepSeek tool_calls delta:",
              JSON.stringify(delta.tool_calls, null, 2),
            );
            // Accumulate tool calls incrementally
            for (const tc of delta.tool_calls) {
              appLogger.info("DeepSeek processing tc:", JSON.stringify(tc));

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
                appLogger.info(
                  "DeepSeek created new tool accumulator for index:",
                  tcIndex,
                );
              }

              const acc = accumulatedToolCalls.get(mapKey)!;

              // Update ID if we get a real one (first chunk has the real id)
              if (tc.id) {
                acc.id = tc.id;
                appLogger.info("DeepSeek set tool call ID to:", tc.id);
              }

              // Accumulate name (comes in first chunk)
              if (tc.function?.name) {
                acc.name = tc.function.name.trim();
                appLogger.info("DeepSeek tool name received:", acc.name);
              }

              // Accumulate arguments (may come in multiple chunks as string)
              if (
                tc.function?.arguments !== undefined &&
                tc.function?.arguments !== null
              ) {
                const argValue = tc.function.arguments;
                appLogger.info(
                  `DeepSeek raw arguments value: ${JSON.stringify(argValue)} type: ${typeof argValue}`,
                );

                if (typeof argValue === "string") {
                  acc.argumentsBuffer += argValue;
                } else if (typeof argValue === "object") {
                  // If it's already an object, convert to string and append
                  acc.argumentsBuffer += JSON.stringify(argValue);
                }
                appLogger.info(
                  "DeepSeek arguments buffer now:",
                  acc.argumentsBuffer,
                );
              }

              appLogger.info("DeepSeek accumulator state:", {
                key: mapKey,
                id: acc.id,
                name: acc.name,
                argsLen: acc.argumentsBuffer.length,
              });
            }
          }
        } catch (e) {
          appLogger.warn("DeepSeek JSON parse error:", e);
          // Skip invalid JSON
        }
      }
    }
  }
}
