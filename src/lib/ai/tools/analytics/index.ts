import type { ToolDefinition } from "../types";
import { getDashboardStatsTool } from "./getDashboardStats";
import { getRevenueTrendTool } from "./getRevenueTrend";
import { getSalesReportTool } from "./getSalesReport";
import { getTopProductsTool } from "./getTopProducts";

export const analyticsTools: ToolDefinition[] = [
  getDashboardStatsTool,
  getRevenueTrendTool,
  getTopProductsTool,
  getSalesReportTool,
];
