import type { ToolDefinition } from "../types";
import { createCategoryTool } from "./createCategory";
import { deleteCategoryTool } from "./deleteCategory";
import { getCategoriesTool } from "./getCategories";
import { getCategoryByIdTool } from "./getCategoryById";
import { getCategoryTreeTool } from "./getCategoryTree";
import { updateCategoryTool } from "./updateCategory";

export const categoryTools: ToolDefinition[] = [
  getCategoriesTool,
  getCategoryByIdTool,
  createCategoryTool,
  updateCategoryTool,
  deleteCategoryTool,
  getCategoryTreeTool,
];
