import type { ToolDefinition } from "../types";
import { confirmAppointmentTool } from "./confirmAppointment";
import { getAppointmentStatusTool } from "./getAppointmentStatus";
import { getOrderStatusTool } from "./getOrderStatus";
import { getQuoteStatusTool } from "./getQuoteStatus";

export const customerWhatsAppTools: ToolDefinition[] = [
  getAppointmentStatusTool,
  getQuoteStatusTool,
  getOrderStatusTool,
  confirmAppointmentTool,
];
