import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import {
  createApiSuccessResponse,
  createApiErrorResponse,
} from "@/lib/api/response";

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
    const statusFilter = searchParams.get("status") || "pending";

    let query = supabase
      .from("agreement_institutional_balances")
      .select(
        `
        id,
        order_id,
        purchase_order_id,
        amount,
        status,
        paid_at,
        payment_reference,
        created_at,
        orders!inner (
          order_number,
          total_amount,
          customer_name,
          created_at
        )
      `,
      )
      .eq("agreement_id", agreementId);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data: balances, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      logger.error("Error fetching institutional balances", { error });
      return createApiErrorResponse(new Error(error.message));
    }

    const flattened = (balances || []).map((b: any) => ({
      ...b,
      order_number: b.orders?.order_number,
      order_total: b.orders?.total_amount,
      customer_name: b.orders?.customer_name,
      order_created_at: b.orders?.created_at,
      orders: undefined,
    }));

    return createApiSuccessResponse(flattened);
  } catch (error) {
    logger.error("Institutional balances GET error", { error });
    return createApiErrorResponse(error as Error);
  }
}
