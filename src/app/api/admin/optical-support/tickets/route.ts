import { NextRequest, NextResponse } from "next/server";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { opticalInternalSupportTicketFiltersSchema } from "@/lib/api/validation/zod-schemas";
import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";
// eslint-disable-next-line no-restricted-imports
import { createServiceRoleClient } from "@/utils/supabase/service-role";

import { createTicketHandler } from "./_handlers/createTicket";

/**
 * GET /api/admin/optical-support/tickets
 * Listar tickets de soporte interno de la óptica con filtros
 * - Usuarios normales: solo tickets de su sucursal
 * - Super Admin: todos los tickets de la org (vista global) o de la sucursal seleccionada
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    // Obtener usuario autenticado
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Obtener información del usuario admin y su organización
    const { data: adminUser, error: adminError } = await supabaseServiceRole
      .from("admin_users")
      .select("id, role, organization_id")
      .eq("id", user.id)
      .single();

    if (adminError || !adminUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Resolver organization_id: usuarios normales usan el suyo; root/dev sin org usan optica-root para testing
    const isRoot = adminUser.role === "root" || adminUser.role === "dev";
    let organizationId = adminUser.organization_id;

    if (!organizationId && isRoot) {
      organizationId =
        (process.env.NEXT_PUBLIC_ROOT_ORG_ID as string) || undefined;
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "No organization assigned" },
        { status: 403 },
      );
    }

    // Obtener contexto de sucursal: Super Admin puede ver todas; usuarios normales solo su sucursal
    const branchContext = await getBranchContext(request, user.id);
    const { branchId, isSuperAdmin, isGlobalView } = branchContext;

    const { searchParams } = new URL(request.url);
    const queryBranchId = searchParams.get("branch_id");

    // Determinar branch_id efectivo para el filtro
    let effectiveBranchId: string | null = null;
    if (isSuperAdmin) {
      // Super Admin: si hay branch en query/header y no es "global", filtrar por esa sucursal
      if (queryBranchId && queryBranchId !== "global") {
        effectiveBranchId = queryBranchId;
      } else if (!isGlobalView && branchId) {
        effectiveBranchId = branchId;
      }
      // Si isGlobalView o branch_id=global: effectiveBranchId queda null → mostrar todas las sucursales
    } else {
      // Usuario normal: SIEMPRE filtrar por sucursal (solo ve la suya)
      effectiveBranchId = branchId || queryBranchId || null;
      if (!effectiveBranchId) {
        const primaryBranch = branchContext.accessibleBranches.find(
          (b: { isPrimary?: boolean }) => b.isPrimary,
        );
        effectiveBranchId =
          primaryBranch?.id || branchContext.accessibleBranches[0]?.id || null;
      }
      if (!effectiveBranchId) {
        return NextResponse.json(
          { error: "Debe seleccionar una sucursal para ver los tickets" },
          { status: 400 },
        );
      }
    }

    // Validar y parsear filtros
    const filters = opticalInternalSupportTicketFiltersSchema.parse({
      branch_id: queryBranchId || undefined,
      customer_id: searchParams.get("customer_id") || undefined,
      status: searchParams.get("status") || undefined,
      priority: searchParams.get("priority") || undefined,
      category: searchParams.get("category") || undefined,
      assigned_to: searchParams.get("assigned_to") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
      sort_by: searchParams.get("sort_by") || "created_at",
      sort_order: searchParams.get("sort_order") || "desc",
    });

    const offset = ((filters.page ?? 1) - 1) * (filters.limit ?? 20);

    // Construir query base
    let query = supabaseServiceRole
      .from("optical_internal_support_tickets")
      .select(
        `
        *,
        customer:customers(id, first_name, last_name, email),
        assigned_to_user:admin_users!optical_internal_support_tickets_assigned_to_fkey(id, email, role),
        created_by_user:admin_users!optical_internal_support_tickets_created_by_user_id_fkey(id, email, role),
        branch:branches(id, name, code),
        related_order:orders(id, order_number),
        related_work_order:lab_work_orders(id, work_order_number),
        related_appointment:appointments(id, appointment_date, appointment_time),
        related_quote:quotes(id, quote_number)
      `,
        { count: "exact" },
      )
      .eq("organization_id", organizationId) // Solo tickets de su organización
      .order(filters.sort_by || "created_at", {
        ascending: filters.sort_order === "asc",
      });

    // Filtro por sucursal (obligatorio para usuarios normales; opcional para Super Admin)
    if (effectiveBranchId) {
      query = query.eq("branch_id", effectiveBranchId);
    }

    if (filters.customer_id) {
      query = query.eq("customer_id", filters.customer_id);
    }

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.priority) {
      query = query.eq("priority", filters.priority);
    }

    if (filters.category) {
      query = query.eq("category", filters.category);
    }

    if (filters.assigned_to) {
      query = query.eq("assigned_to", filters.assigned_to);
    }

    if (filters.search) {
      query = query.or(
        `subject.ilike.%${filters.search}%,description.ilike.%${filters.search}%,ticket_number.ilike.%${filters.search}%`,
      );
    }

    // Aplicar paginación
    query = query.range(offset, offset + (filters.limit ?? 20) - 1);

    const { data: tickets, error, count } = await query;

    if (error) {
      logger.error("Error fetching optical internal support tickets", error);
      return NextResponse.json(
        { error: "Failed to fetch tickets" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      tickets: tickets || [],
      pagination: {
        total: count || 0,
        page: filters.page,
        limit: filters.limit ?? 20,
        totalPages: Math.ceil((count || 0) / (filters.limit ?? 20)),
      },
    });
  } catch (error) {
    logger.error(
      "Unexpected error in GET /api/admin/optical-support/tickets",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/optical-support/tickets
 * Crear nuevo ticket de soporte interno
 */
export async function POST(request: NextRequest) {
  return createTicketHandler(request);
}
