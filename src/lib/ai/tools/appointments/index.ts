import type { ToolDefinition } from "../types";
import { getAppointmentsTool } from "./getAppointments";
import { getAppointmentSlotsTool } from "./getAppointmentSlots";
import { getBranchScheduleTool } from "./getBranchSchedule";
import { rescheduleAppointmentTool } from "./rescheduleAppointment";

export const appointmentTools: ToolDefinition[] = [
  getAppointmentSlotsTool,
  getAppointmentsTool,
  getBranchScheduleTool,
  rescheduleAppointmentTool,
];
