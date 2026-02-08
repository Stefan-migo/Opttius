export type LLMProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "deepseek"
  | "openrouter"
  | "kilocode"
  | "minimax"
  | "custom";

export interface LLMModel {
  id: string;
  name: string;
  provider: LLMProvider;
  maxTokens?: number;
  supportsStreaming: boolean;
  supportsFunctionCalling: boolean;
  costPer1kTokens?: {
    input: number;
    output: number;
  };
}

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  baseURL?: string;
  groupId?: string; // For Minimax
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: any;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
  model?: string;
  toolCalls?: ToolCall[];
}

export interface LLMStreamChunk {
  content: string;
  done: boolean;
  usage?: LLMResponse["usage"];
  toolCalls?: ToolCall[];
}

export interface LLMTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface LLMProviderInterface {
  name: LLMProvider;
  streamText(
    messages: LLMMessage[],
    tools?: LLMTool[],
    config?: Partial<LLMConfig>,
  ): AsyncGenerator<LLMStreamChunk>;
  generateText(
    messages: LLMMessage[],
    tools?: LLMTool[],
    config?: Partial<LLMConfig>,
  ): Promise<LLMResponse>;
  getAvailableModels(): LLMModel[];
  validateConfig(config: LLMConfig): boolean;
}
