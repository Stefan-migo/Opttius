/**
 * Process Auth & Session — auth check, branch context, SII invoice, POS session.
 *
 * Extracted from processSaleHandler.ts. No behavioral changes.
 */

import { NextRequest, NextResponse } from "next/server";

import { getBranchContext, getFieldOperationFromRequest } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";

export interface AuthSessionResult {
  user: { id: string; email?: string };
  effectiveBranchId: string | null;
  fieldOperationId: string | null;
  posSessionId: string | null;
  siiInvoiceNumber: string | null;
  branchContext: {
    branchId: string | null;
    organizationId: string | null;
    isSuperAdmin: boolean;
    isGlobalView: boolean;
    accessibleBranches: { id: string }[];
  };
}

export async function handleAuthSession(
  request: NextRequest,
  validatedBody: Record<string, unknown>,
): Promise<AuthSessionResult | NextResponse> {
  const supabase = await createClient();

  // Check admin authorization
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as NextResponse;
  }

  const { data: isAdmin } = (await supabase.rpc("is_admin", {
    user_id: user.id,
  } as Record<string, unknown>)) as { data: boolean | null };
  if (!isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 }) as NextResponse;
  }

  // Branch context
  const branchContext = await getBranchContext(request, user.id);
  const fieldOperationId: string | null = getFieldOperationFromRequest(request);
  let effectiveBranchId = branchContext.branchId;

  if (fieldOperationId) {
    const { data: fieldOp, error: fieldOpError } = await supabase
      .from("field_operations")
      .select("id, branch_id, organization_id")
      .eq("id", fieldOperationId)
      .single();

    if (fieldOpError || !fieldOp) {
      return NextResponse.json(
        { error: "Operativo no encontrado" },
        { status: 404 },
      ) as NextResponse;
    }
    const fieldOpRecord = fieldOp as { id: string; branch_id: string; organization_id: string };
    if (branchContext.organizationId && fieldOpRecord.organization_id !== branchContext.organizationId) {
      return NextResponse.json(
        { error: "No tiene acceso a este operativo" },
        { status: 403 },
      ) as NextResponse;
    }
    effectiveBranchId = fieldOpRecord.branch_id;
    if (!branchContext.isSuperAdmin &&
      !branchContext.accessibleBranches.some((b: { id: string }) => b.id === fieldOpRecord.branch_id)) {
      return NextResponse.json(
        { error: "No tiene acceso a la sucursal del operativo" },
        { status: 403 },
      ) as NextResponse;
    }
  }

  if (!branchContext.isSuperAdmin && !effectiveBranchId) {
    return NextResponse.json(
      { error: "Debe seleccionar una sucursal para realizar ventas POS" },
      { status: 400 },
    ) as NextResponse;
  }

  const supabaseServiceRole = createServiceRoleClient();

  // SII invoice number
  const sii_invoice_type = validatedBody.sii_invoice_type as string | undefined;
  let siiInvoiceNumber: string | null = null;
  if (sii_invoice_type && sii_invoice_type !== "none") {
    const { data: invoiceNum } = await supabase.rpc("generate_sii_invoice_number", {
      invoice_type: sii_invoice_type,
    });
    if (invoiceNum) siiInvoiceNumber = invoiceNum as string;
  }

  // POS session validation
  const fieldOperationIdFromBody = validatedBody.field_operation_id as string | null;
  let posSessionId: string | null = null;
  if (!branchContext.isSuperAdmin && effectiveBranchId) {
    const todayStart = new Date().toISOString().slice(0, 10);
    let sessionQuery = supabaseServiceRole
      .from("pos_sessions")
      .select("id")
      .eq("branch_id", effectiveBranchId)
      .eq("status", "open")
      .gte("opening_time", todayStart);
    if (fieldOperationIdFromBody) {
      sessionQuery = sessionQuery.eq("field_operation_id", fieldOperationIdFromBody);
    } else {
      sessionQuery = sessionQuery.is("field_operation_id", null);
    }
    const { data: openSession } = await sessionQuery.maybeSingle();
    if (!openSession) {
      return NextResponse.json(
        {
          error: fieldOperationIdFromBody
            ? "Debe abrir la caja del operativo antes de realizar ventas. Abra la caja desde la página del operativo."
            : "Debe abrir la caja antes de realizar ventas. Por favor, abra la caja desde la sección Caja.",
        },
        { status: 400 },
      ) as NextResponse;
    }
    posSessionId = (openSession as { id: string }).id;
  } else {
    let query = supabase
      .from("pos_sessions")
      .select("id")
      .eq("cashier_id", user.id)
      .eq("status", "open");
    query = effectiveBranchId
      ? query.eq("branch_id", effectiveBranchId).eq("field_operation_id", fieldOperationIdFromBody || null)
      : query.is("branch_id", null);
    const { data: activeSession } = await query
      .order("opening_time", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (activeSession) {
      posSessionId = (activeSession as { id: string }).id;
    } else if (branchContext.isSuperAdmin) {
      const { data: newSession } = await supabase
        .from("pos_sessions")
        .insert({
          cashier_id: user.id,
          branch_id: effectiveBranchId,
          opening_cash_amount: 0,
          status: "open",
        })
        .select()
        .single();
      if (newSession) posSessionId = (newSession as { id: string }).id;
    }
  }

  return {
    user,
    effectiveBranchId,
    fieldOperationId,
    posSessionId,
    siiInvoiceNumber,
    branchContext: {
      branchId: branchContext.branchId,
      organizationId: branchContext.organizationId,
      isSuperAdmin: branchContext.isSuperAdmin,
      isGlobalView: branchContext.isGlobalView,
      accessibleBranches: branchContext.accessibleBranches,
    },
  };
}
