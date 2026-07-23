import type { ToolDefinition } from "../types";
import { getRecentContextTool } from "./getRecentContext";
import { saveMemoryTool } from "./saveMemory";
import { saveSessionSummaryTool } from "./saveSessionSummary";
import { searchOrgMemoryTool } from "./searchOrgMemory";

export const memoryTools: ToolDefinition[] = [
  searchOrgMemoryTool,
  saveMemoryTool,
  getRecentContextTool,
  saveSessionSummaryTool,
];
