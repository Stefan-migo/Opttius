import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import {
  createApiSuccessResponse,
  createApiErrorResponse,
} from "@/lib/api/response";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { withRateLimit, rateLimitConfigs } from "@/lib/api/middleware";
import { z } from "zod";

const openCashRegisterSchema = z.object({
  opening_cash_amount: z.number().min(0).default(0),
});

export async function POST(request: NextRequest) {
  try {
    return await (withRateLimit(rateLimitConfigs.modification) as any)(
      request,
      async () => {
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
        } as IsAdminParams)) as {
          data: IsAdminResult | null;
          error: Error | null;
        };
        if (!isAdmin) {
          return NextResponse.json(
            { error: "Admin access required" },
            { status: 403 },
          );
        }

        // Get branch context
        const branchContext = await getBranchContext(request, user.id);

        // Validate branch access for non-super admins
        if (!branchContext.isSuperAdmin && !branchContext.branchId) {
          return NextResponse.json(
            {
              error: "Debe seleccionar una sucursal para abrir la caja",
            },
            { status: 400 },
          );
        }

        // Parse and validate request body
        const body = await request.json();
        const validatedData = openCashRegisterSchema.parse(body);

        // Check if there's already an open session for this branch
        const { data: existingSession, error: checkError } =
          await supabaseServiceRole
            .from("pos_sessions")
            .select("id, status, opening_time")
            .eq("branch_id", branchContext.branchId!)
            .eq("status", "open")
            .order("opening_time", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (checkError && checkError.code !== "PGRST116") {
          logger.error("Error checking existing session", checkError);
          return NextResponse.json(
            { error: "Error al verificar sesión existente" },
            { status: 500 },
          );
        }

        if (existingSession) {
          return NextResponse.json(
            {
              error: "Ya existe una caja abierta para esta sucursal",
              session: existingSession,
            },
            { status: 400 },
          );
        }

        const todayStr = new Date().toISOString().split("T")[0];
        const { data: existingClosure, error: closureError } =
          await supabaseServiceRole
            .from("cash_register_closures")
            .select("id, status")
            .eq("branch_id", branchContext.branchId!)
            .eq("closure_date", todayStr)
            .maybeSingle();

        if (closureError && closureError.code !== "PGRST116") {
          logger.error("Error checking existing closure", closureError);
          return NextResponse.json(
            { error: "Error al verificar cierres existentes" },
            { status: 500 },
          );
        }

        if (existingClosure?.status === "closed") {
          return NextResponse.json(
            {
              error:
                "La caja ya fue cerrada hoy. Debe reabrirla para continuar.",
            },
            { status: 400 },
          );
        }

        // Create new POS session
        const { data: newSession, error: sessionError } =
          await supabaseServiceRole
            .from("pos_sessions")
            .insert({
              cashier_id: user.id,
              branch_id: branchContext.branchId!,
              opening_cash_amount: validatedData.opening_cash_amount,
              status: "open",
              opening_time: new Date().toISOString(),
            })
            .select()
            .single();

        if (sessionError) {
          logger.error("Error creating POS session", sessionError);
          return NextResponse.json(
            { error: "Error al abrir la caja" },
            { status: 500 },
          );
        }

        logger.info("Cash register opened successfully", {
          sessionId: newSession.id,
          branchId: branchContext.branchId,
          openingCash: validatedData.opening_cash_amount,
        });

        return createApiSuccessResponse({
          session: newSession,
          message: "Caja abierta exitosamente",
        });
      },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    logger.error("Error in cash register open API", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    return await (withRateLimit(rateLimitConfigs.modification) as any)(
      request,
      async () => {
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
        } as IsAdminParams)) as {
          data: IsAdminResult | null;
          error: Error | null;
        };
        if (!isAdmin) {
          return NextResponse.json(
            { error: "Admin access required" },
            { status: 403 },
          );
        }

        // Get branch context
        const branchContext = await getBranchContext(request, user.id);

        // No branch selected (global view or no branches): return closed state so POS can load
        if (!branchContext.branchId) {
          return createApiSuccessResponse({
            isOpen: false,
            session: null,
          });
        }

        // Check if there's an open session for this branch
        const { data: openSession, error: sessionError } =
          await supabaseServiceRole
            .from("pos_sessions")
            .select("id, status, opening_time, opening_cash_amount, branch_id")
            .eq("branch_id", branchContext.branchId)
            .eq("status", "open")
            .order("opening_time", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (sessionError) {
          logger.error("Error checking open session", sessionError);
          return NextResponse.json(
            {
              error: "Error al verificar estado de caja",
              details:
                process.env.NODE_ENV === "development"
                  ? sessionError.message
                  : undefined,
            },
            { status: 500 },
          );
        }

        return createApiSuccessResponse({
          isOpen: !!openSession,
          session: openSession || null,
        });
      },
    );
  } catch (error: unknown) {
    logger.error("Error in cash register open GET API", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        error: "Internal server error",
        ...(process.env.NODE_ENV === "development" && { details: message }),
      },
      { status: 500 },
    );
  }
}
