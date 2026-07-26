import { z } from "zod";

import { appLogger } from '@/lib/logger';

import { resolveBranchByName } from "../resolvers";
import type { ToolDefinition, ToolResult } from "../types";
const updateInventorySchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().min(0),
  adjustmentType: z.enum(["set", "add", "subtract"]).default("add"),
  branchId: z.string().uuid().optional(),
  branchName: z.string().optional(),
});

export const updateInventoryTool: ToolDefinition = {
  name: "updateInventory",
  description:
    "Update product inventory quantity in a specific branch. Can set, add, or subtract from current stock. IMPORTANT: Before calling, use getProductById to check product_branch_stock. If product is in multiple branches and user is in global view, you MUST ask which branch or use branchName. Never assume a branch when in global mode.",
  category: "products",
  parameters: {
    type: "object",
    properties: {
      productId: { type: "string", description: "Product UUID" },
      quantity: { type: "number", description: "Quantity value" },
      adjustmentType: {
        type: "string",
        enum: ["set", "add", "subtract"],
        default: "add",
        description:
          "How to adjust inventory (add = add to current, set = replace, subtract = remove)",
      },
      branchId: {
        type: "string",
        description:
          "Branch UUID where to update stock (required when user is in global view)",
      },
      branchName: {
        type: "string",
        description:
          "Branch name (alternative to branchId, e.g. 'Sucursal Centro')",
      },
    },
    required: ["productId", "quantity"],
  },
  zodSchema: updateInventorySchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = updateInventorySchema.parse(params);
      const { supabase, organizationId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      // Check for organization_id
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("id, organization_id")
        .eq("id", validated.productId)
        .eq("organization_id", organizationId)
        .single();

      if (productError || !productData) {
        return {
          success: false,
          error: "Product not found or access denied",
        };
      }

      let branchId = validated.branchId ?? context.currentBranchId ?? null;

      if (validated.branchName && !branchId) {
        branchId = await resolveBranchByName(
          supabase,
          organizationId,
          validated.branchName,
        );
      }

      if (!branchId || branchId === "global") {
        return {
          success: false,
          error:
            "Vista global activa: debes indicar en qué sucursal agregar las unidades. Usa branchName (ej. 'Sucursal Centro') o branchId. Primero consulta getProductById para ver en qué sucursales está el producto.",
        };
      }
      let newQuantity = 0;

      if (branchId) {
        // Get current stock
        const { data: currentStock } = await supabase
          .from("product_branch_stock")
          .select("quantity")
          .eq("product_id", validated.productId)
          .eq("branch_id", branchId)
          .single();

        const currentQty = currentStock?.quantity || 0;

        if (validated.adjustmentType === "set") {
          newQuantity = validated.quantity;
        } else if (validated.adjustmentType === "add") {
          newQuantity = currentQty + validated.quantity;
        } else if (validated.adjustmentType === "subtract") {
          newQuantity = Math.max(0, currentQty - validated.quantity);
        }

        // Upsert stock
        const { error: stockError } = await supabase
          .from("product_branch_stock")
          .upsert(
            {
              product_id: validated.productId,
              branch_id: branchId,
              quantity: newQuantity,
              low_stock_threshold: 5,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "product_id, branch_id" },
          );

        if (stockError) {
          appLogger.error("Stock update error:", stockError);
          return {
            success: false,
            error: "Failed to update branch stock: " + stockError.message,
          };
        }
      }

      // Stock lives ONLY in product_branch_stock. Do NOT update products.inventory_quantity
      // (legacy column) - it would leak one branch's stock to global view and other branches.
      return {
        success: true,
        data: {
          product_id: validated.productId,
          branch_id: branchId,
          quantity: newQuantity,
        },
        message: `Inventario actualizado a ${newQuantity} unidades en la sucursal indicada`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update inventory",
      };
    }
  },
};
