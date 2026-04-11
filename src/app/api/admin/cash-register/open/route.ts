import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  getBranchContext,
  getFieldOperationFromRequest,
  validateBranchAccess,
} from "@/lib/api/branch-middleware";
import { rateLimitConfigs, withRateLimit } from "@/lib/api/middleware";
import { createApiSuccessResponse } from "@/lib/api/response";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";

const openCashRegisterSchema = z.object({
  opening_cash_amount: z.number().min(0).default(0),
  field_operation_id: z.string().uuid().optional().nullable(),
});

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    return await (withRateLimit(rateLimitConfigs.modification) as unknown)(
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

        // Get branch context and optional operativo context
        const branchContext = await getBranchContext(request, user.id);
        let body: Record<string, unknown> = {};
        try {
          body = await request.json();
        } catch {
          // Empty body ok
        }
        const fieldOperationId =
          getFieldOperationFromRequest(request) ||
          (body?.field_operation_id as string | undefined) ||
          null;

        let effectiveBranchId = branchContext.branchId;

        // Operativo mode: resolve branch from field_operations
        if (fieldOperationId) {
          const { data: fieldOp, error: fieldOpError } =
            await supabaseServiceRole
              .from("field_operations")
              .select("id, branch_id")
              .eq("id", fieldOperationId)
              .single();

          if (fieldOpError || !fieldOp) {
            return NextResponse.json(
              { error: "Operativo no encontrado" },
              { status: 404 },
            );
          }

          const hasAccess = await validateBranchAccess(
            user.id,
            fieldOp.branch_id,
          );
          if (!hasAccess) {
            return NextResponse.json(
              { error: "No tiene acceso a este operativo" },
              { status: 403 },
            );
          }
          effectiveBranchId = fieldOp.branch_id;
        }

        // Validate branch for non-super admins
        if (!branchContext.isSuperAdmin && !effectiveBranchId) {
          return NextResponse.json(
            {
              error: fieldOperationId
                ? "Operativo inválido"
                : "Debe seleccionar una sucursal para abrir la caja",
            },
            { status: 400 },
          );
        }

        // Parse and validate request body
        const validatedData = openCashRegisterSchema.parse(body);

        // Build session query: branch + optional field_operation_id
        let sessionQuery = supabaseServiceRole
          .from("pos_sessions")
          .select("id, status, opening_time")
          .eq("branch_id", effectiveBranchId!)
          .eq("status", "open");

        if (fieldOperationId) {
          sessionQuery = sessionQuery.eq(
            "field_operation_id",
            fieldOperationId,
          );
        } else {
          sessionQuery = sessionQuery.is("field_operation_id", null);
        }

        const { data: existingSession, error: checkError } = await sessionQuery
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
              error: fieldOperationId
                ? "Ya existe una caja abierta para este operativo"
                : "Ya existe una caja abierta para esta sucursal",
              session: existingSession,
            },
            { status: 400 },
          );
        }

        const todayStr = new Date().toISOString().split("T")[0];
        let closureQuery = supabaseServiceRole
          .from("cash_register_closures")
          .select("id, status")
          .eq("branch_id", effectiveBranchId!)
          .eq("closure_date", todayStr);

        if (fieldOperationId) {
          closureQuery = closureQuery.eq(
            "field_operation_id",
            fieldOperationId,
          );
        } else {
          closureQuery = closureQuery.is("field_operation_id", null);
        }

        const { data: existingClosure, error: closureError } =
          await closureQuery.maybeSingle();

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
        const insertData: Record<string, unknown> = {
          cashier_id: user.id,
          branch_id: effectiveBranchId!,
          opening_cash_amount: validatedData.opening_cash_amount,
          status: "open",
          opening_time: new Date().toISOString(),
        };
        if (fieldOperationId) {
          insertData.field_operation_id = fieldOperationId;
        }

        const { data: newSession, error: sessionError } =
          await supabaseServiceRole
            .from("pos_sessions")
            .insert(insertData)
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
          branchId: effectiveBranchId,
          fieldOperationId: fieldOperationId || undefined,
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
    return await (withRateLimit(rateLimitConfigs.modification) as unknown)(
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

        // Get branch context and optional operativo context
        const branchContext = await getBranchContext(request, user.id);
        const fieldOperationId = getFieldOperationFromRequest(request);

        let effectiveBranchId = branchContext.branchId;

        // Operativo mode: resolve branch from field_operations
        if (fieldOperationId) {
          const { data: fieldOp, error: fieldOpError } =
            await supabaseServiceRole
              .from("field_operations")
              .select("id, branch_id")
              .eq("id", fieldOperationId)
              .single();

          if (fieldOpError || !fieldOp) {
            return createApiSuccessResponse({
              isOpen: false,
              session: null,
            });
          }

          const hasAccess = await validateBranchAccess(
            user.id,
            fieldOp.branch_id,
          );
          if (!hasAccess) {
            return createApiSuccessResponse({
              isOpen: false,
              session: null,
            });
          }
          effectiveBranchId = fieldOp.branch_id;
        }

        // No branch: return closed state so POS can load
        if (!effectiveBranchId) {
          return createApiSuccessResponse({
            isOpen: false,
            session: null,
          });
        }

        // Check if there's an open session (branch or operativo)
        let sessionQuery = supabaseServiceRole
          .from("pos_sessions")
          .select(
            "id, status, opening_time, opening_cash_amount, branch_id, field_operation_id",
          )
          .eq("branch_id", effectiveBranchId)
          .eq("status", "open");

        if (fieldOperationId) {
          sessionQuery = sessionQuery.eq(
            "field_operation_id",
            fieldOperationId,
          );
        } else {
          sessionQuery = sessionQuery.is("field_operation_id", null);
        }

        const { data: openSession, error: sessionError } = await sessionQuery
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
