import { NextRequest, NextResponse } from "next/server";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";

/**
 * GET /api/admin/credit-notes
 * List credit notes with optional filters
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const branchContext = await getBranchContext(request, user.id);

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabaseServiceRole
      .from("credit_notes")
      .select(
        `
        id,
        credit_note_number,
        order_id,
        branch_id,
        amount,
        reason,
        refund_method,
        created_at,
        branches(id, name, code)
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (branchContext.branchId) {
      query = query.eq("branch_id", branchContext.branchId);
    } else if (branchContext.organizationId) {
      // Global view or no branch: scope to user's organization
      query = query.eq("organization_id", branchContext.organizationId);
    }
    // When both null (e.g. super_admin without org): no filter, show all

    // Date filter: use wide range to avoid timezone/year mismatches with "antiguas"
    if (dateFrom && dateTo) {
      query = query
        .gte("created_at", `${dateFrom}T00:00:00.000Z`)
        .lt("created_at", `${dateTo}T23:59:59.999Z`);
    }

    const { data: creditNotes, error, count } = await query;

    if (error) {
      logger.error("Error fetching credit notes:", error);
      return NextResponse.json(
        { error: "Error al obtener notas de crédito", details: error.message },
        { status: 500 },
      );
    }

    // Fetch order numbers for credit notes that have order_id
    const orderIds = (creditNotes || [])
      .map((cn: unknown) => cn.order_id)
      .filter(Boolean);
    let orderNumbersMap: Record<string, string> = {};
    if (orderIds.length > 0) {
      const { data: orders } = await supabaseServiceRole
        .from("orders")
        .select("id, order_number")
        .in("id", orderIds);
      if (orders) {
        orderNumbersMap = Object.fromEntries(
          orders.map((o: unknown) => [o.id, o.order_number]),
        );
      }
    }

    const notes = (creditNotes || []).map((cn: unknown) => ({
      ...cn,
      order_number: cn.order_id ? orderNumbersMap[cn.order_id] || null : null,
      branch_name: cn.branches?.name || null,
    }));

    return NextResponse.json({
      credit_notes: notes,
      pagination: {
        total: count ?? 0,
        limit,
        offset,
      },
    });
  } catch (error: unknown) {
    logger.error("Error in credit notes API:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
