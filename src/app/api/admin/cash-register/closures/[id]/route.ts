import { NextRequest, NextResponse } from "next/server";

import {
  getBranchContext,
  validateBranchAccess,
} from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";

/**
 * GET /api/admin/cash-register/closures/[id]
 * Get a specific cash register closure with details
 */
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    // Check admin authorization
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

    // Get closure
    const { data: closure, error } = await supabaseServiceRole
      .from("cash_register_closures")
      .select(
        `
        *,
        branch:branches(id, name, code)
      `,
      )
      .eq("id", id)
      .single();

    if (error || !closure) {
      return NextResponse.json(
        {
          error: "Cierre de caja no encontrado",
        },
        { status: 404 },
      );
    }

    // Fetch user profile separately
    let closedByUser = null;
    if (closure.closed_by) {
      const { data: profile } = await supabaseServiceRole
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("id", closure.closed_by)
        .single();

      closedByUser = profile;
    }

    const closureWithUser = {
      ...closure,
      closed_by_user: closedByUser,
    };

    // Validate branch access
    const branchContext = await getBranchContext(request, user.id);
    const hasAccess = await validateBranchAccess(user.id, closure.branch_id);

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: "No tiene acceso a este cierre de caja",
        },
        { status: 403 },
      );
    }

    // Get orders for this closure date
    const dateStr = closure.closure_date;
    const ordersQuery = supabaseServiceRole
      .from("orders")
      .select(
        `
        *,
        order_items(*)
      `,
      )
      .eq("is_pos_sale", true)
      .eq("branch_id", closure.branch_id)
      .gte("created_at", `${dateStr}T00:00:00`)
      .lt("created_at", `${dateStr}T23:59:59`)
      .order("created_at", { ascending: false });

    const { data: orders } = await ordersQuery;

    return NextResponse.json({
      closure: closureWithUser,
      orders: orders || [],
    });
  } catch (error: unknown) {
    logger.error("Error fetching cash register closure:", {
      error,
      closureId: id,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/cash-register/closures/[id]
 * Update a cash register closure (e.g., confirm, add notes)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    // Check admin authorization
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

    const body = await request.json();

    // Get existing closure
    const { data: existingClosure } = await supabaseServiceRole
      .from("cash_register_closures")
      .select("branch_id, status")
      .eq("id", id)
      .single();

    if (!existingClosure) {
      return NextResponse.json(
        { error: "Cierre de caja no encontrado" },
        { status: 404 },
      );
    }

    // Validate branch access
    const branchContext = await getBranchContext(request, user.id);
    const hasAccess = await validateBranchAccess(
      user.id,
      existingClosure.branch_id,
    );

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: "No tiene acceso a este cierre de caja",
        },
        { status: 403 },
      );
    }

    // Prepare update data
    const updateData: unknown = {
      updated_at: new Date().toISOString(),
    };

    if (body.actual_cash !== undefined)
      updateData.actual_cash = Number(body.actual_cash);
    if (body.card_machine_debit_total !== undefined)
      updateData.card_machine_debit_total = Number(
        body.card_machine_debit_total,
      );
    if (body.card_machine_credit_total !== undefined)
      updateData.card_machine_credit_total = Number(
        body.card_machine_credit_total,
      );
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.discrepancies !== undefined)
      updateData.discrepancies = body.discrepancies;
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === "confirmed") {
        updateData.confirmed_at = new Date().toISOString();
      }
    }

    // Recalculate differences if cash amounts changed
    if (
      body.actual_cash !== undefined ||
      body.card_machine_debit_total !== undefined ||
      body.card_machine_credit_total !== undefined
    ) {
      const expectedCash =
        Number((existingClosure as unknown).opening_cash_amount || 0) +
        Number((existingClosure as unknown).cash_sales || 0);
      if (updateData.actual_cash !== undefined) {
        updateData.cash_difference =
          Number(updateData.actual_cash) - expectedCash;
        updateData.closing_cash_amount = Number(updateData.actual_cash);
      }

      if (
        updateData.card_machine_debit_total !== undefined ||
        updateData.card_machine_credit_total !== undefined
      ) {
        const debitTotal =
          updateData.card_machine_debit_total !== undefined
            ? Number(updateData.card_machine_debit_total)
            : Number(
                (existingClosure as unknown).card_machine_debit_total || 0,
              );
        const creditTotal =
          updateData.card_machine_credit_total !== undefined
            ? Number(updateData.card_machine_credit_total)
            : Number(
                (existingClosure as unknown).card_machine_credit_total || 0,
              );
        const expectedDebit = Number(
          (existingClosure as unknown).debit_card_sales || 0,
        );
        const expectedCredit = Number(
          (existingClosure as unknown).credit_card_sales || 0,
        );
        updateData.card_machine_difference =
          debitTotal - expectedDebit + (creditTotal - expectedCredit);
      }
    }

    // Update closure
    const { data: updatedClosure, error: updateError } =
      await supabaseServiceRole
        .from("cash_register_closures")
        .update(updateData)
        .eq("id", id)
        .select(
          `
        *,
        branch:branches(id, name, code)
      `,
        )
        .single();

    if (updateError) {
      logger.error("Error updating closure:", {
        error: updateError,
        closureId: id,
      });
      return NextResponse.json(
        {
          error: "Error al actualizar el cierre de caja",
          details: updateError.message,
        },
        { status: 500 },
      );
    }

    // Fetch user profile separately
    let closedByUser = null;
    if (updatedClosure.closed_by) {
      const { data: profile } = await supabaseServiceRole
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("id", updatedClosure.closed_by)
        .single();

      closedByUser = profile;
    }

    const closureWithUser = {
      ...updatedClosure,
      closed_by_user: closedByUser,
    };

    return NextResponse.json({
      success: true,
      closure: closureWithUser,
    });
  } catch (error: unknown) {
    logger.error("Error updating cash register closure:", {
      error,
      closureId: id,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
