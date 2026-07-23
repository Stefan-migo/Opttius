import type { ToolDefinition } from "../types";
import { getOrderByIdTool } from "./getOrderById";
import { getOrdersTool } from "./getOrders";
import { getOrderStatsTool } from "./getOrderStats";
import { getPendingOrdersTool } from "./getPendingOrders";

export const orderTools: ToolDefinition[] = [
  getOrdersTool,
  getOrderByIdTool,
  getPendingOrdersTool,
  getOrderStatsTool,
];
