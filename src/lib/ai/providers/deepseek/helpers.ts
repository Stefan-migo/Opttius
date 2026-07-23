import type {
  LLMConfig,
  LLMMessage,
  LLMModel,
} from "../../types";

export const DEEPSEEK_MODELS: LLMModel[] = [
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

export function getAvailableModels(): LLMModel[] {
  return DEEPSEEK_MODELS;
}

export function validateConfig(config: LLMConfig): boolean {
  return (
    !!config.apiKey &&
    config.apiKey.length > 0 &&
    DEEPSEEK_MODELS.some((m) => m.id === config.model)
  );
}

export function formatMessages(messages: LLMMessage[]): unknown[] {
  return messages.map((msg) => {
    const formatted: Record<string, unknown> = {
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
