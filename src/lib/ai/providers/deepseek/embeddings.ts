import type {
  LLMConfig,
  LLMMessage,
  LLMResponse,
  LLMTool,
  ToolCall,
} from "../../types";
import { formatMessages } from "./helpers";

export async function generateText(
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
      messages: formatMessages(messages),
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
