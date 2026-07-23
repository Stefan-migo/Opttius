import type { ToolDefinition } from "../types";
import { deleteCustomerTool } from "./deleteCustomer";
import { getCustomerByIdTool } from "./getCustomerById";
import { getCustomerOrdersTool } from "./getCustomerOrders";
import { getCustomersTool } from "./getCustomers";
import { getCustomerStatsTool } from "./getCustomerStats";
import { updateCustomerTool } from "./updateCustomer";

export const customerTools: ToolDefinition[] = [
  getCustomersTool,
  getCustomerByIdTool,
  updateCustomerTool,
  getCustomerOrdersTool,
  getCustomerStatsTool,
  deleteCustomerTool,
];
