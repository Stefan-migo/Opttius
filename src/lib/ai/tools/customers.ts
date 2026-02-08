import { z } from "zod";
import type { ToolDefinition, ToolResult } from "./types";

const getCustomersSchema = z.object({
  search: z.string().optional(),
  membershipTier: z.string().optional(),
  limit: z.number().max(100).default(20),
  page: z.number().default(1),
});

const getCustomerByIdSchema = z.object({
  customerId: z.string().uuid(),
});

const updateCustomerSchema = z.object({
  customerId: z.string().uuid(),
  updates: z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    phone: z.string().optional(),
    address_line_1: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
    membership_tier: z.string().optional(),
  }),
});

const getCustomerOrdersSchema = z.object({
  customerId: z.string().uuid(),
  limit: z.number().default(10),
});

const getCustomerStatsSchema = z.object({
  customerId: z.string().uuid(),
});

export const customerTools: ToolDefinition[] = [
  {
    name: "getCustomers",
    description:
      "Search and filter customers by name, email, or membership tier.",
    category: "customers",
    parameters: {
      type: "object",
      properties: {
        search: {
          type: "string",
          description: "Search term for name or email",
        },
        membershipTier: {
          type: "string",
          description: "Filter by membership tier",
        },
        limit: { type: "number", default: 20, maximum: 100 },
        page: { type: "number", default: 1 },
      },
    },
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = getCustomersSchema.parse(params);
        const { supabase, organizationId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        let query = supabase.from("profiles").select("*", { count: "exact" });

        if (validated.search) {
          query = query.or(
            `first_name.ilike.%${validated.search}%,last_name.ilike.%${validated.search}%,email.ilike.%${validated.search}%`,
          );
        }

        if (validated.membershipTier) {
          query = query.eq("membership_tier", validated.membershipTier);
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
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to get customers",
        };
      }
    },
  },
  {
    name: "getCustomerById",
    description: "Get detailed information about a specific customer by ID.",
    category: "customers",
    parameters: {
      type: "object",
      properties: {
        customerId: { type: "string", description: "Customer UUID" },
      },
      required: ["customerId"],
    },
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = getCustomerByIdSchema.parse(params);
        const { supabase, organizationId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", validated.customerId)
          .single();

        if (error) {
          return { success: false, error: error.message };
        }

        if (!data) {
          return { success: false, error: "Customer not found" };
        }

        return {
          success: true,
          data,
          message: `Retrieved customer: ${data.first_name} ${data.last_name || ""}`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to get customer",
        };
      }
    },
  },
  {
    name: "updateCustomer",
    description: "Update customer information.",
    category: "customers",
    parameters: {
      type: "object",
      properties: {
        customerId: { type: "string", description: "Customer UUID" },
        updates: {
          type: "object",
          description: "Fields to update",
          properties: {
            first_name: { type: "string" },
            last_name: { type: "string" },
            phone: { type: "string" },
            address_line_1: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            postal_code: { type: "string" },
            country: { type: "string" },
            membership_tier: { type: "string" },
          },
        },
      },
      required: ["customerId", "updates"],
    },
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = updateCustomerSchema.parse(params);
        const { supabase, organizationId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        const { data, error } = await supabase
          .from("profiles")
          .update({
            ...validated.updates,
            updated_at: new Date().toISOString(),
          })

          .eq("id", validated.customerId)
          .select()
          .single();

        if (error) {
          return { success: false, error: error.message };
        }

        return {
          success: true,
          data,
          message: `Customer updated successfully`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to update customer",
        };
      }
    },
  },
  {
    name: "getCustomerOrders",
    description: "Get order history for a specific customer.",
    category: "customers",
    parameters: {
      type: "object",
      properties: {
        customerId: { type: "string", description: "Customer UUID" },
        limit: { type: "number", default: 10 },
      },
      required: ["customerId"],
    },
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = getCustomerOrdersSchema.parse(params);
        const { supabase, organizationId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        const { data, error } = await supabase
          .from("orders")
          .select(
            `
            id,
            order_number,
            status,
            payment_status,
            total_amount,
            created_at,
            order_items (
              product_name,
              quantity,
              unit_price
            )
          `,
          )
          .eq("user_id", validated.customerId)
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(validated.limit);

        if (error) {
          return { success: false, error: error.message };
        }

        return {
          success: true,
          data: {
            orders: data || [],
          },
          message: `Found ${data?.length || 0} orders for customer`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to get customer orders",
        };
      }
    },
  },
  {
    name: "getCustomerStats",
    description: "Get analytics and statistics for a specific customer.",
    category: "customers",
    parameters: {
      type: "object",
      properties: {
        customerId: { type: "string", description: "Customer UUID" },
      },
      required: ["customerId"],
    },
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = getCustomerStatsSchema.parse(params);
        const { supabase, organizationId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        const { data: orders, error } = await supabase
          .from("orders")
          .select("total_amount, status, payment_status, created_at")
          .eq("user_id", validated.customerId)
          .eq("organization_id", organizationId);

        if (error) {
          return { success: false, error: error.message };
        }

        const paidOrders =
          orders?.filter(
            (o) => o.payment_status === "paid" || o.status === "completed",
          ) || [];
        const totalSpent = paidOrders.reduce(
          (sum, o) => sum + (o.total_amount || 0),
          0,
        );
        const orderCount = orders?.length || 0;
        const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;

        const stats = {
          totalOrders: orderCount,
          totalSpent,
          averageOrderValue: avgOrderValue,
          lastOrderDate:
            orders && orders.length > 0
              ? orders.sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime(),
                )[0].created_at
              : null,
        };

        return {
          success: true,
          data: stats,
          message: `Customer statistics calculated`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Failed to get customer stats",
        };
      }
    },
  },
];
