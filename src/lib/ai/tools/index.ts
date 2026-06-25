import type { AgentRole, LLMTool } from "../types";
import { analyticsTools } from "./analytics";
import { businessFlowTools } from "./analyzeBusinessFlow";
import { marketTrendsTools } from "./analyzeMarketTrends";
import { appointmentTools } from "./appointments";
import { categoryTools } from "./categories";
import { contextTools } from "./context";
import { customerTools } from "./customers";
import { customerWhatsAppTools } from "./customerWhatsApp";
import { diagnoseSystemTools } from "./diagnoseSystem";
import { recommendationTools } from "./generateRecommendations";
import { importBulkTools } from "./importBulk";
import { memoryTools } from "./memory";
import { navigationTools } from "./navigation";
import { inventoryTools } from "./optimizeInventory";
import { orderTools } from "./orders";
import { prescriptionTools } from "./prescriptions";
import { productTools } from "./products";
import { quoteTools } from "./quotes";
import { supportTools } from "./support";
import type { ToolDefinition } from "./types";
import { workOrderTools } from "./workOrders";

export const allTools: ToolDefinition[] = [
  ...productTools,
  ...categoryTools,
  ...orderTools,
  ...workOrderTools,
  ...customerTools,
  ...customerWhatsAppTools,
  ...appointmentTools,
  ...quoteTools,
  ...prescriptionTools,
  ...analyticsTools,
  ...supportTools,
  ...businessFlowTools,
  ...diagnoseSystemTools,
  ...marketTrendsTools,
  ...inventoryTools,
  ...recommendationTools,
  ...importBulkTools,
  ...navigationTools,
  ...contextTools,
  ...memoryTools,
];

const ROLE_HIERARCHY: Record<AgentRole, number> = {
  vendedor: 0,
  admin: 1,
  dueño: 2,
};

/**
 * Returns all tools, optionally filtered by the user's role.
 * Tools without `minRole` are visible to everyone (default: vendedor).
 * When `role` is undefined, returns all tools (backward-compatible).
 */
export function getAllTools(role?: AgentRole): ToolDefinition[] {
  if (!role) return allTools;

  const userLevel = ROLE_HIERARCHY[role] ?? 0;

  return allTools.filter((tool) => {
    if (!tool.minRole) return true; // no restriction — everyone can use
    return ROLE_HIERARCHY[tool.minRole] <= userLevel;
  });
}

export function getToolsByCategory(category: string): ToolDefinition[] {
  return allTools.filter((tool) => tool.category === category);
}

export function getToolByName(name: string): ToolDefinition | undefined {
  return allTools.find((tool) => tool.name === name);
}

export function convertToolsToLLMTools(tools: ToolDefinition[]): LLMTool[] {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

export function validateToolCall(
  toolName: string,
  params: unknown,
): { valid: boolean; error?: string } {
  const tool = getToolByName(toolName);
  if (!tool) {
    return { valid: false, error: `Tool ${toolName} not found` };
  }

  try {
    const zodSchema = getZodSchemaForTool(toolName);
    if (zodSchema) {
      zodSchema.parse(params);
    }
    return { valid: true };
  } catch (error: unknown) {
    return { valid: false, error: error.message };
  }
}

function getZodSchemaForTool(
  toolName: string,
): import("zod").ZodTypeAny | null {
  const tool = getToolByName(toolName);
  return tool?.zodSchema ?? null;
}
