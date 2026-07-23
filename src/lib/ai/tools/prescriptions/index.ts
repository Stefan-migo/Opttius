import type { ToolDefinition } from "../types";
import { createPrescriptionTool } from "./createPrescription";
import { suggestLensFromPrescriptionTool } from "./suggestLensFromPrescription";

export const prescriptionTools: ToolDefinition[] = [
  suggestLensFromPrescriptionTool,
  createPrescriptionTool,
];
