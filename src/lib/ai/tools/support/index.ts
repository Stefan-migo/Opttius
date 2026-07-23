import type { ToolDefinition } from "../types";
import { createTicketResponseTool } from "./createTicketResponse";
import { getTicketByIdTool } from "./getTicketById";
import { getTicketsTool } from "./getTickets";
import { updateTicketStatusTool } from "./updateTicketStatus";

export const supportTools: ToolDefinition[] = [
  getTicketsTool,
  getTicketByIdTool,
  updateTicketStatusTool,
  createTicketResponseTool,
];
