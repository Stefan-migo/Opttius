import type { ToolDefinition } from "../types";
import { createProductTool } from "./createProduct";
import { deleteProductTool } from "./deleteProduct";
import { getLowStockProductsTool } from "./getLowStockProducts";
import { getProductByIdTool } from "./getProductById";
import { getProductsTool } from "./getProducts";
import { updateInventoryTool } from "./updateInventory";
import { updateProductTool } from "./updateProduct";

export const productTools: ToolDefinition[] = [
  getProductsTool,
  getProductByIdTool,
  createProductTool,
  updateProductTool,
  deleteProductTool,
  updateInventoryTool,
  getLowStockProductsTool,
];
