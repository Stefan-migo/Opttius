import { z } from "zod";
import type { ToolDefinition, ToolResult } from "./types";
import { resolveBranchByName } from "./resolvers";

const WORK_ORDER_STATUSES = [
  "quote",
  "ordered",
  "on_hold_payment",
  "sent_to_lab",
  "in_progress_lab",
  "ready_at_lab",
  "received_from_lab",
  "mounted",
  "quality_check",
  "ready_for_pickup",
  "delivered",
  "cancelled",
  "returned",
] as const;

const getWorkOrdersSchema = z.object({
  status: z.enum(WORK_ORDER_STATUSES).optional(),
  statuses: z.array(z.enum(WORK_ORDER_STATUSES)).optional(),
  branchId: z.string().uuid().optional().nullable(),
  branchName: z.string().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional(),
  limit: z.number().max(100).default(50),
  offset: z.number().default(0),
});

const getWorkOrderByIdSchema = z.object({
  workOrderId: z.string().uuid(),
});

export const workOrderTools: ToolDefinition[] = [
  {
    name: "getWorkOrders",
    description:
      "Lista órdenes de trabajo (trabajos de laboratorio) con filtros opcionales por estado, sucursal y fechas. Usar para consultar trabajos pendientes, en lab, listos para retiro, etc.",
    category: "work_orders",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: [...WORK_ORDER_STATUSES],
          description: "Filtrar por un estado del trabajo",
        },
        statuses: {
          type: "array",
          items: { type: "string", enum: [...WORK_ORDER_STATUSES] },
          description:
            "Filtrar por varios estados (ej. ['sent_to_lab','in_progress_lab','ready_at_lab'] para 'en laboratorio')",
        },
        branchId: {
          type: "string",
          description:
            "UUID de sucursal (requerido para Super Admin con vista global)",
        },
        branchName: {
          type: "string",
          description: "Nombre de sucursal (alternativa a branchId)",
        },
        startDate: {
          type: "string",
          description: "Fecha inicio YYYY-MM-DD",
        },
        endDate: {
          type: "string",
          description: "Fecha fin YYYY-MM-DD",
        },
        limit: { type: "number", default: 50, maximum: 100 },
        offset: { type: "number", default: 0 },
      },
    },
    zodSchema: getWorkOrdersSchema,
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = getWorkOrdersSchema.parse(params);
        const { supabase, organizationId, currentBranchId, userData } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        // "global" means no branch selected - treat as null (do NOT use as branch_id)
        const effectiveBranchContext =
          currentBranchId && currentBranchId !== "global"
            ? currentBranchId
            : null;

        let branchId = validated.branchId ?? effectiveBranchContext ?? null;
        if (!branchId && validated.branchName) {
          branchId = await resolveBranchByName(
            supabase,
            organizationId,
            validated.branchName,
          );
        }

        const isSuperAdmin = userData?.isSuperAdmin === true;
        const isGlobalView = !effectiveBranchContext;

        if (!branchId && !(isSuperAdmin && isGlobalView)) {
          return {
            success: false,
            error:
              "Selecciona una sucursal para consultar órdenes de trabajo. Si eres Super Admin con vista global, indica branchName (ej. 'Casa Matriz') para ver órdenes de esa sucursal.",
          };
        }

        // Resolve branch IDs to filter: demo data may have organization_id NULL, so filter by branch_id
        // (branch belongs to org). When Super Admin all-branches: get org branch IDs.
        let branchIdsToFilter: string[] | null = null;
        if (branchId) {
          branchIdsToFilter = [branchId];
        } else if (isSuperAdmin && isGlobalView) {
          const { data: orgBranches } = await supabase
            .from("branches")
            .select("id")
            .eq("organization_id", organizationId);
          branchIdsToFilter = orgBranches?.map((b) => b.id) || [];
        }

        let query = supabase
          .from("lab_work_orders")
          .select(
            `
            id,
            work_order_number,
            work_order_date,
            status,
            payment_status,
            total_amount,
            currency,
            customer_id,
            frame_name,
            lens_type,
            branch_id,
            branch:branches(name),
            customers(first_name, last_name)
          `,
            { count: "exact" },
          )
          .order("work_order_date", { ascending: false });

        if (branchIdsToFilter && branchIdsToFilter.length > 0) {
          query = query.in("branch_id", branchIdsToFilter);
        } else if (
          Array.isArray(branchIdsToFilter) &&
          branchIdsToFilter.length === 0
        ) {
          query = query.eq("branch_id", "00000000-0000-0000-0000-000000000000");
        }

        if (validated.status) {
          query = query.eq("status", validated.status);
        } else if (
          validated.statuses &&
          Array.isArray(validated.statuses) &&
          validated.statuses.length > 0
        ) {
          query = query.in("status", validated.statuses);
        }

        if (validated.startDate) {
          query = query.gte("work_order_date", validated.startDate);
        }

        if (validated.endDate) {
          query = query.lte("work_order_date", validated.endDate);
        }

        const { data, error, count } = await query.range(
          validated.offset,
          validated.offset + validated.limit - 1,
        );

        if (error) {
          return { success: false, error: error.message };
        }

        return {
          success: true,
          data: {
            workOrders: data || [],
            total: count || 0,
          },
          message: `Encontradas ${count || 0} órdenes de trabajo`,
        };
      } catch (error: unknown) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to get work orders",
        };
      }
    },
  },
  {
    name: "getWorkOrderById",
    description:
      "Obtiene el detalle completo de una orden de trabajo por ID. Incluye cliente, sucursal, marco, lentes y montos.",
    category: "work_orders",
    parameters: {
      type: "object",
      properties: {
        workOrderId: {
          type: "string",
          description: "UUID de la orden de trabajo",
        },
      },
      required: ["workOrderId"],
    },
    zodSchema: getWorkOrderByIdSchema,
    execute: async (params, context): Promise<ToolResult> => {
      try {
        const validated = getWorkOrderByIdSchema.parse(params);
        const { supabase, organizationId } = context;

        if (!organizationId) {
          return {
            success: false,
            error: "Organization ID is missing in context",
          };
        }

        const { data, error } = await supabase
          .from("lab_work_orders")
          .select(
            `
            id,
            work_order_number,
            work_order_date,
            status,
            payment_status,
            total_amount,
            currency,
            subtotal,
            tax_amount,
            discount_amount,
            frame_name,
            frame_brand,
            frame_model,
            frame_color,
            lens_type,
            lens_material,
            lens_treatments,
            presbyopia_solution,
            frame_cost,
            lens_cost,
            labor_cost,
            treatments_cost,
            customer_id,
            branch_id,
            prescription_id,
            branch:branches(name),
            customers(first_name, last_name, phone, email),
            ready_at,
            delivered_at,
            ordered_at,
            sent_to_lab_at,
            internal_notes
          `,
          )
          .eq("id", validated.workOrderId)
          .eq("organization_id", organizationId)
          .single();

        if (error) {
          return { success: false, error: error.message };
        }

        if (!data) {
          return { success: false, error: "Orden de trabajo no encontrada" };
        }

        return {
          success: true,
          data,
          message: `Orden de trabajo ${data.work_order_number}`,
        };
      } catch (error: unknown) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to get work order",
        };
      }
    },
  },
];
