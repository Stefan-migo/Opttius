import { productTools } from "./products";
import { categoryTools } from "./categories";
import { orderTools } from "./orders";
import { customerTools } from "./customers";
import { analyticsTools } from "./analytics";
import { supportTools } from "./support";
import { businessFlowTools } from "./analyzeBusinessFlow";
import { diagnoseSystemTools } from "./diagnoseSystem";
import { marketTrendsTools } from "./analyzeMarketTrends";
import { inventoryTools } from "./optimizeInventory";
import { recommendationTools } from "./generateRecommendations";
import { importBulkTools } from "./importBulk";
import { customerWhatsAppTools } from "./customerWhatsApp";
import { appointmentTools } from "./appointments";
import { workOrderTools } from "./workOrders";
import { quoteTools } from "./quotes";
import { prescriptionTools } from "./prescriptions";
import type { ToolDefinition } from "./types";
import type { LLMTool } from "../types";

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
];

export function getAllTools(): ToolDefinition[] {
  return allTools;
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
  params: any,
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
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

function getZodSchemaForTool(
  toolName: string,
): import("zod").ZodTypeAny | null {
  const tool = getToolByName(toolName);
  return tool?.zodSchema ?? null;
}
