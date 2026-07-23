import { z } from "zod";

import type { ToolDefinition, ToolResult } from "../types";

const getCustomersSchema = z.object({
  search: z.string().optional(),
  limit: z.number().max(100).default(20),
  page: z.number().default(1),
});

export const getCustomersTool: ToolDefinition = {
  name: "getCustomers",
  description:
    "Search and filter customers by name, email, or membership tier.",
  category: "customers",
  parameters: {
    type: "object",
    properties: {
      search: {
        type: "string",
        description: "Search term for name, email or RUT",
      },
      limit: { type: "number", default: 20, maximum: 100 },
      page: { type: "number", default: 1 },
    },
  },
  zodSchema: getCustomersSchema,
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const validated = getCustomersSchema.parse(params);
      const { supabase, organizationId, currentBranchId } = context;

      if (!organizationId) {
        return {
          success: false,
          error: "Organization ID is missing in context",
        };
      }

      let query = supabase
        .from("customers")
        .select("*", { count: "exact" })
        .eq("is_active", true);

      if (currentBranchId) {
        query = query.eq("branch_id", currentBranchId);
      } else {
        const { data: branches } = await supabase
          .from("branches")
          .select("id")
          .eq("organization_id", organizationId);
        const branchIds = branches?.map((b: { id: string }) => b.id) || [];
        if (branchIds.length > 0) {
          query = query.in("branch_id", branchIds);
        } else {
          return {
            success: true,
            data: {
              customers: [],
              total: 0,
              page: validated.page,
              limit: validated.limit,
            },
            message: "No customers found",
          };
        }
      }

      if (validated.search) {
        query = query.or(
          `first_name.ilike.%${validated.search}%,last_name.ilike.%${validated.search}%,email.ilike.%${validated.search}%,rut.ilike.%${validated.search}%`,
        );
      }

      const offset = (validated.page - 1) * validated.limit;
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + validated.limit - 1);

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: {
          customers: data || [],
          total: count || 0,
          page: validated.page,
          limit: validated.limit,
        },
        message: `Found ${count || 0} customers`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        // @ts-expect-error: Dynamic LLM response shape
        error: error.message || "Failed to get customers",
      };
    }
  },
};
