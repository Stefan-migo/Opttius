import type {
  LLMConfig,
  LLMMessage,
  LLMModel,
  LLMProvider,
  LLMProviderInterface,
  LLMResponse,
  LLMStreamChunk,
  LLMTool,
} from "../types";

export abstract class BaseLLMProvider implements LLMProviderInterface {
  abstract name: LLMProvider;

  abstract streamText(
    messages: LLMMessage[],
    tools?: LLMTool[],
    config?: Partial<LLMConfig>,
  ): AsyncGenerator<LLMStreamChunk>;

  abstract generateText(
    messages: LLMMessage[],
    tools?: LLMTool[],
    config?: Partial<LLMConfig>,
  ): Promise<LLMResponse>;

  abstract getAvailableModels(): LLMModel[];

  abstract validateConfig(config: LLMConfig): boolean;

  protected validateApiKey(apiKey: string | undefined): boolean {
    return !!apiKey && apiKey.length > 0;
  }

  protected formatMessages(messages: LLMMessage[]): unknown[] {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      ...(msg.name && { name: msg.name }),
      ...(msg.toolCallId && { tool_call_id: msg.toolCallId }),
    }));
  }
}
