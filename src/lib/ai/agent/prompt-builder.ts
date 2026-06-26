/**
 * 4-Layer System Prompt builder for the AI Agent.
 *
 * Each layer is a separate function for testability.
 * Layers are assembled in order: identity → role personality →
 * dynamic context → retrieved memory.
 *
 * @module lib/ai/agent/prompt-builder
 */

import type { ToolDefinition } from "../tools/types";
import type { AgentRole } from "../types";
import type { AgentSession } from "./session";

// ─── Memory context shape returned by the memory loop ───

export interface MemoryContext {
  recentFacts: Array<{ content: string; category?: string }>;
  semanticMatches: Array<{ content: string; similarity: number }>;
}

// ─── Layer builders ───

/**
 * Layer 1 — Base identity + behavioral constraints.
 * This is the immutable core of the agent's personality.
 */
function layer1Identity(): string {
  return [
    "Eres el Agente Inteligente de Opttius, el asistente copiloto del sistema de gestión para ópticas.",
    "",
    "COMPORTAMIENTO:",
    "- Responde SIEMPRE en español profesional, directo y sin rodeos.",
    "- Usa los datos disponibles para dar respuestas precisas y accionables.",
    "- No inventes información — si no sabes algo, usa las herramientas disponibles o admítelo.",
    "- Sé breve. Prefiere una oración clara sobre un párrafo vago.",
    "- Nunca muestres UUIDs, IDs internos, o slugs al usuario.",
    "- Cuando ejecutes herramientas, no expliques lo que vas a hacer antes de hacerlo.",
    "- Después de ejecutar herramientas, SIEMPRE produce una respuesta en texto.",
    "",
    "FORMATO DE RESPUESTA:",
    "- Tus respuestas se renderizan como bloques estructurados (texto, previews, acciones, navegación).",
    "- Si necesitas mostrar una lista, usa viñetas simples.",
    "- Si necesitas que el usuario navegue, usa NavigationBlock.",
    "- Si necesitas confirmación para una acción destructiva, usa ActionBlock con variant: danger.",
  ].join("\n");
}

/**
 * Layer 2 — Role-specific personality.
 */
function layer2Role(role: AgentRole): string {
  const profiles: Record<AgentRole, string> = {
    vendedor: [
      "Tu rol es VENDEDOR — tienes acceso operativo al sistema.",
      "- Puedes buscar clientes, productos, órdenes, y consultar información.",
      "- No puedes eliminar registros ni modificar configuraciones del sistema.",
      "- Enfócate en ayudar con ventas, atención al cliente, y consultas rápidas.",
      "- Si el usuario pide algo que requiere permisos de admin, indícale amablemente que debe consultar a su supervisor.",
    ].join("\n"),
    admin: [
      "Tu rol es ADMINISTRADOR — tienes control total sobre la operación diaria.",
      "- Puedes crear, modificar y eliminar la mayoría de los registros.",
      "- Puedes gestionar usuarios y permisos básicos.",
      "- No puedes modificar configuraciones globales del sistema ni del plan.",
      "- Usa tu criterio para acciones destructivas — siempre pide confirmación antes de eliminar.",
    ].join("\n"),
    dueño: [
      "Tu rol es DUEÑO — tienes acceso completo y sin restricciones.",
      "- Puedes realizar cualquier operación en el sistema.",
      "- Puedes modificar configuraciones de la organización y del plan.",
      "- Con gran poder viene gran responsabilidad — siempre confirma acciones destructivas.",
      "- Puedes acceder a reportes financieros y datos sensibles.",
    ].join("\n"),
  };

  return `## Capa 2 — Personalidad según Rol\n\n${profiles[role] || profiles.vendedor}`;
}

/**
 * Layer 3 — Dynamic screen context (route, branch, alerts).
 */
function layer3Context(session: AgentSession): string {
  const parts: string[] = ["## Capa 3 — Contexto de Pantalla"];

  if (session.context.route) {
    parts.push(`- Ruta actual: ${session.context.route}`);
  }
  if (session.context.section) {
    parts.push(`- Sección: ${session.context.section}`);
  }
  if (session.context.branchName) {
    parts.push(`- Sucursal activa: ${session.context.branchName}`);
  } else if (session.context.branchId) {
    parts.push(`- Sucursal activa ID: ${session.context.branchId}`);
  }

  return parts.join("\n");
}

/**
 * Layer 4 — Retrieved memory (output of memory loop).
 */
function layer4Memory(memory?: MemoryContext | null): string {
  if (!memory) return "";

  const parts: string[] = ["## Capa 4 — Memoria Recuperada"];

  if (memory.recentFacts.length > 0) {
    parts.push("");
    parts.push("Contexto reciente de la organización:");
    for (const fact of memory.recentFacts.slice(0, 5)) {
      const label = fact.category ? `[${fact.category}]` : "";
      parts.push(`- ${label} ${fact.content}`);
    }
  }

  if (memory.semanticMatches.length > 0) {
    parts.push("");
    parts.push("Búsqueda semántica relevante:");
    for (const match of memory.semanticMatches.slice(0, 5)) {
      parts.push(
        `- [${(match.similarity * 100).toFixed(0)}%] ${match.content}`,
      );
    }
  }

  return parts.length > 1 ? parts.join("\n") : "";
}

// ─── Tools section ───

function toolsSection(tools: ToolDefinition[]): string {
  if (tools.length === 0) return "";

  const list = tools
    .map((t) => `- ${t.name}: ${t.description.split("\n")[0]}`)
    .join("\n");

  return [
    "## Herramientas Disponibles",
    "",
    "Tienes las siguientes herramientas a tu disposición. Úsalas cuando necesites datos actualizados:",
    "",
    list,
  ].join("\n");
}

// ─── Public API ───

export interface BuildPromptOptions {
  session: AgentSession;
  memoryContext?: MemoryContext | null;
  tools: ToolDefinition[];
}

/**
 * Build the complete 4-layer system prompt.
 * Each layer is separated by a clear delimiter.
 * Layers without content are omitted.
 */
export function buildSystemPrompt({
  session,
  memoryContext,
  tools,
}: BuildPromptOptions): string {
  const layers: string[] = [];

  layers.push(layer1Identity());
  layers.push(layer2Role(session.role));

  const ctx = layer3Context(session);
  if (ctx) layers.push(ctx);

  const mem = layer4Memory(memoryContext);
  if (mem) layers.push(mem);

  layers.push(toolsSection(tools));

  return layers.join("\n\n---\n\n");
}

// Exported for testing individual layers
export { layer1Identity, layer2Role, layer3Context, layer4Memory };
