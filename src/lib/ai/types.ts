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
  arguments: unknown;
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
    parameters: Record<string, unknown>;
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

// ─── Agent Harness Types (Phase 1 — Agent Bubble UI) ────────────────────────

/** Bubble visual state machine states */
export type BubbleState =
  | "collapsed"
  | "repose"
  | "conversation"
  | "notification"
  | "docked";

/** Agent context collected from the current screen */
export interface AgentContext {
  route: string;
  branchId: string | null;
  branchName: string;
  role: string;
  orgId: string;
  userId: string;
}

/** Screen context metadata sent with every agent request */
export interface AgentScreenContext {
  route: string;
  section?: string;
  branchId: string | null;
  branchName?: string;
  role: string;
  orgId: string;
}

/** Preview action item */
export interface BlockAction {
  label: string;
  variant: "primary" | "danger" | "ghost";
  action: string;
  params?: Record<string, unknown>;
}

// ─── Block Types ─────────────────────────────────────────────────────────────

export interface TextBlock {
  type: "text";
  content: string;
}

export interface PreviewBlock {
  type: "preview";
  entity: string;
  id: string;
  title: string;
  subtitle?: string;
  actions?: BlockAction[];
}

export interface ActionBlock {
  type: "action";
  label: string;
  variant: "primary" | "danger" | "ghost";
  action: string;
  params?: Record<string, unknown>;
}

export interface NavigationBlock {
  type: "navigation";
  label: string;
  path: string;
}

export interface LoadingBlock {
  type: "loading";
  label: string;
}

export interface ErrorBlock {
  type: "error";
  content: string;
}

export interface SuccessBlock {
  type: "success";
  content: string;
}

/** Union discriminated by `type` — the only block shape the frontend can render */
export type Block =
  | TextBlock
  | PreviewBlock
  | ActionBlock
  | NavigationBlock
  | LoadingBlock
  | ErrorBlock
  | SuccessBlock;

/** Tool type category for tool registry */
export type ToolType = "db" | "navigation" | "context" | "memory";

/** Agent roles for tool filtering */
export type AgentRole = "vendedor" | "admin" | "dueño";
