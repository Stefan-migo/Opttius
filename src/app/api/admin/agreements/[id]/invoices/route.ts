import { NextRequest, NextResponse } from "next/server";

import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from "@/lib/api/response";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: agreementId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const { data: agreement } = await supabase
      .from("agreements")
      .select("id")
      .eq("id", agreementId)
      .single();

    if (!agreement) {
      return NextResponse.json(
        { error: "Convenio no encontrado" },
        { status: 404 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "20", 10) || 20,
      100,
    );
    const page = Math.max(
      parseInt(searchParams.get("page") ?? "1", 10) || 1,
      1,
    );
    const statusFilter = searchParams.get("status");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("agreement_institutional_invoices")
      .select(
        "id, folio, status, total_amount, period_from, period_to, emitted_at, pdf_url, created_at",
        {
          count: "exact",
        },
      )
      .eq("agreement_id", agreementId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data: invoices, error, count } = await query;

    if (error) {
      logger.error("Error fetching agreement invoices", { error });
      return createApiErrorResponse(new Error(error.message));
    }

    const total = count ?? invoices?.length ?? 0;
    return createApiSuccessResponse(invoices ?? [], {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    logger.error("Agreement invoices GET error", { error });
    return createApiErrorResponse(error as Error);
  }
}
