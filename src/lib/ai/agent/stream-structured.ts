import type {
  AgentScreenContext,
  Block,
  LLMMessage,
  LLMStreamChunk,
  ToolCall,
} from "../types";

/**
 * Build a screen-context string from AgentScreenContext for Layer 3 injection.
 * Extracted from agent.ts private method.
 */
export function screenContextToPrompt(ctx: AgentScreenContext): string {
  const parts: string[] = ["## Contexto de Pantalla"];
  if (ctx.route) parts.push(`- Ruta actual: ${ctx.route}`);
  if (ctx.section) parts.push(`- Sección: ${ctx.section}`);
  if (ctx.branchName) parts.push(`- Sucursal activa: ${ctx.branchName}`);
  else if (ctx.branchId) parts.push(`- Sucursal ID: ${ctx.branchId}`);
  return parts.join("\n");
}

/**
 * streamChatStructured — wraps streamChat() and post-processes the response into Block[].
 *
 * Accepts an optional screenContext injected into Layer 3 of the prompt.
 * Tool calls in the stream are converted to loading → action/success blocks.
 * Returns an AsyncGenerator that yields { blocks, done } for SSE consumption.
 *
 * Does NOT modify the existing streamChat() method.
 */
export async function* streamChatStructuredImpl(
  userMessage: string,
  screenContext: AgentScreenContext | undefined,
  messages: LLMMessage[],
  sessionId: string | undefined,
  deps: {
    streamChat: (
      userMessage: string,
    ) => AsyncGenerator<LLMStreamChunk>;
    screenContextToPrompt: (ctx: AgentScreenContext) => string;
  },
): AsyncGenerator<{
  blocks?: Block[];
  sessionId?: string;
  toolCalls?: ToolCall[];
  done: boolean;
}> {
  // 1. If screenContext provided, inject into Layer 3 of the system prompt
  if (screenContext) {
    const ctxText = deps.screenContextToPrompt(screenContext);
    if (messages.length > 0 && messages[0]?.role === "system") {
      messages[0].content += `\n\n${ctxText}`;
    }
  }

  // 2. Call existing streamChat and collect output
  // ponytail: collects full response then post-processes — incremental yield
  // would need LLM prompt changes to emit blocks during generation.
  let fullContent = "";
  const seenToolCalls = new Map<string, ToolCall>();

  for await (const chunk of deps.streamChat(userMessage)) {
    if (chunk.content) {
      fullContent += chunk.content;
    }
    if (chunk.toolCalls) {
      for (const tc of chunk.toolCalls) {
        if (tc.name && !seenToolCalls.has(tc.id)) {
          seenToolCalls.set(tc.id, tc);
        }
      }
    }
    if (chunk.done) {
      // 3. Post-process: tool_calls → loading/action/success blocks
      const toolBlocks: Block[] = [];
      for (const tc of seenToolCalls.values()) {
        toolBlocks.push({
          type: "loading",
          label: `Ejecutando ${tc.name}...`,
        });
        // ponytail: success blocks when tool results are reported; currently
        // tool results are fed back to LLM, not surfaced as blocks.
        // Add success block parsing from tool results if needed.
      }

      // 4. Parse text content into text blocks (split by double-newline for readability)
      const textBlocks: Block[] = [];
      if (fullContent.trim()) {
        // Split non-tool text responses
        const segments = fullContent.trim().split(/\n\n+/);
        for (const seg of segments) {
          const trimmed = seg.trim();
          if (trimmed) {
            textBlocks.push({ type: "text", content: trimmed });
          }
        }
      }

      const allBlocks = [...toolBlocks, ...textBlocks];

      yield {
        blocks:
          allBlocks.length > 0
            ? allBlocks
            : [{ type: "text", content: fullContent || "Procesado." }],
        sessionId,
        toolCalls:
          seenToolCalls.size > 0
            ? Array.from(seenToolCalls.values())
            : undefined,
        done: false,
      };

      yield {
        sessionId,
        done: true,
      };
    }
  }
}
