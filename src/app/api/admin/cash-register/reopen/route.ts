import { NextRequest, NextResponse } from "next/server";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type {
  GetAdminRoleParams,
  GetAdminRoleResult,
  IsAdminParams,
  IsAdminResult,
} from "@/types/supabase-rpc";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";

/**
 * POST /api/admin/cash-register/reopen
 * Reopen a closed cash register session (admin or super_admin)
 */
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
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

    const { data: adminRole } = (await supabase.rpc("get_admin_role", {
      user_id: user.id,
    } as GetAdminRoleParams)) as {
      data: GetAdminRoleResult | null;
      error: Error | null;
    };
    const canReopen =
      adminRole === "super_admin" ||
      adminRole === "admin" ||
      adminRole === "root" ||
      adminRole === "dev";
    if (!canReopen) {
      return NextResponse.json(
        {
          error:
            "Solo administradores o super administradores pueden reabrir cajas",
        },
        { status: 403 },
      );
    }

    // Get branch context (for non-super-admins we'll validate branch access after loading session)
    const branchContext = await getBranchContext(request, user.id);

    const body = await request.json();
    const { session_id } = body;

    if (!session_id) {
      return NextResponse.json(
        { error: "session_id is required" },
        { status: 400 },
      );
    }

    // Get the session to check its branch and operativo
    const { data: session, error: sessionError } = await supabaseServiceRole
      .from("pos_sessions")
      .select(
        "id, branch_id, field_operation_id, status, reopen_count, opening_time",
      )
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      logger.error("Error fetching session for reopen", sessionError);
      return NextResponse.json(
        {
          error: "Sesión no encontrada",
          details: sessionError?.message,
        },
        { status: 404 },
      );
    }

    // Non-super-admin must have access to the session's branch
    if (!branchContext.isSuperAdmin) {
      const hasAccess = branchContext.accessibleBranches.some(
        (b) => b.id === session.branch_id,
      );
      if (!hasAccess) {
        return NextResponse.json(
          {
            error: "No tienes acceso a la sucursal de esta caja",
          },
          { status: 403 },
        );
      }
    }

    // Check if there's already an open session for this branch (and operativo if applicable)
    let openSessionsQuery = supabaseServiceRole
      .from("pos_sessions")
      .select("id, opening_time")
      .eq("branch_id", session.branch_id)
      .eq("status", "open");
    if (session.field_operation_id) {
      openSessionsQuery = openSessionsQuery.eq(
        "field_operation_id",
        session.field_operation_id,
      );
    } else {
      openSessionsQuery = openSessionsQuery.is("field_operation_id", null);
    }
    const { data: openSessions, error: openSessionsError } =
      await openSessionsQuery;

    if (openSessionsError) {
      logger.error("Error checking open sessions", openSessionsError);
      return NextResponse.json(
        {
          error: "Error al verificar sesiones abiertas",
          details: openSessionsError.message,
        },
        { status: 500 },
      );
    }

    // Filter out the current session if it's already open
    const otherOpenSessions = (openSessions || []).filter(
      (s) => s.id !== session_id,
    );

    if (otherOpenSessions.length > 0) {
      return NextResponse.json(
        {
          error:
            "Ya existe una caja abierta para esta sucursal. Debe cerrarla antes de reabrir otra.",
        },
        { status: 400 },
      );
    }

    // Get the closure associated with this session (fallback by branch/date)
    let closure = null;
    const { data: closureBySession, error: closureError } =
      await supabaseServiceRole
        .from("cash_register_closures")
        .select("id, status, reopen_count, pos_session_id")
        .eq("pos_session_id", session_id)
        .maybeSingle();

    if (closureBySession) {
      closure = closureBySession;
    } else if (session.opening_time) {
      const sessionDateStr = session.opening_time.split("T")[0];
      let closureByDateQuery = supabaseServiceRole
        .from("cash_register_closures")
        .select("id, status, reopen_count, pos_session_id")
        .eq("branch_id", session.branch_id)
        .eq("closure_date", sessionDateStr);
      if (session.field_operation_id) {
        closureByDateQuery = closureByDateQuery.eq(
          "field_operation_id",
          session.field_operation_id,
        );
      } else {
        closureByDateQuery = closureByDateQuery.is("field_operation_id", null);
      }
      const { data: closureByDate } = await closureByDateQuery.maybeSingle();
      closure = closureByDate || null;
    }

    if (closureError && closureError.code !== "PGRST116") {
      logger.error("Error fetching closure for reopen", closureError);
      // Continue anyway - closure might not exist yet
    }

    // Update pos_session to reopen
    const reopenCount = (session.reopen_count || 0) + 1;
    const { data: updatedSession, error: updateError } =
      await supabaseServiceRole
        .from("pos_sessions")
        .update({
          status: "open",
          reopened_at: new Date().toISOString(),
          reopened_by: user.id,
          reopen_count: reopenCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session_id)
        .select()
        .single();

    if (updateError) {
      logger.error("Error reopening cash session", updateError);
      return NextResponse.json(
        {
          error: "Error al reabrir la caja",
          details: updateError.message,
        },
        { status: 500 },
      );
    }

    // Update closure if it exists - change status to 'draft' to allow modifications
    if (closure) {
      const closureReopenCount = (closure.reopen_count || 0) + 1;
      const { error: closureUpdateError } = await supabaseServiceRole
        .from("cash_register_closures")
        .update({
          status: "draft", // Change to draft so it can be modified and closed again
          reopened_at: new Date().toISOString(),
          reopened_by: user.id,
          reopen_count: closureReopenCount,
          reopen_notes: `Reabierta por ${user.email} el ${new Date().toLocaleString("es-CL")}`,
          pos_session_id: session_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", closure.id);

      if (closureUpdateError) {
        logger.error("Error updating closure on reopen", closureUpdateError);
        // Log but don't fail - the session is already reopened
      }
    }

    logger.info("Cash session reopened successfully", {
      session_id,
      branch_id: session.branch_id,
      reopened_by: user.email,
      reopen_count: reopenCount,
      closure_id: closure?.id,
    });

    return NextResponse.json({
      success: true,
      session: updatedSession,
      message: "Caja reabierta correctamente",
    });
  } catch (error: unknown) {
    logger.error("Error in reopen cash register API:", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
