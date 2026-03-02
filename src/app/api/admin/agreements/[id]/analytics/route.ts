import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
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

    const serviceSupabase = createServiceRoleClient();

    const searchParams = request.nextUrl.searchParams;
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    let ordersQuery = serviceSupabase
      .from("orders")
      .select(
        "id, customer_id, total_amount, copago_amount, institutional_amount, created_at",
      )
      .eq("agreement_id", agreementId);

    if (fromDate) {
      ordersQuery = ordersQuery.gte("created_at", fromDate);
    }
    if (toDate) {
      ordersQuery = ordersQuery.lte("created_at", toDate + "T23:59:59.999Z");
    }

    const { data: orders } = await ordersQuery;

    const totalSales = (orders || []).reduce(
      (s, o) => s + (o.total_amount || 0),
      0,
    );
    const totalCopago = (orders || []).reduce(
      (s, o) => s + (o.copago_amount || 0),
      0,
    );
    const totalInstitutional = (orders || []).reduce(
      (s, o) => s + (o.institutional_amount || 0),
      0,
    );

    const { data: balances } = await serviceSupabase
      .from("agreement_institutional_balances")
      .select("amount, status")
      .eq("agreement_id", agreementId);

    const pendingAmount = (balances || [])
      .filter((b) => b.status === "pending")
      .reduce((s, b) => s + (b.amount || 0), 0);
    const paidAmount = (balances || [])
      .filter((b) => b.status === "paid")
      .reduce((s, b) => s + (b.amount || 0), 0);

    const uniqueCustomers = new Set(
      (orders || []).map((o: any) => o.customer_id).filter(Boolean),
    ).size;

    return NextResponse.json({
      success: true,
      data: {
        total_orders: orders?.length ?? 0,
        unique_customers: uniqueCustomers,
        total_sales: totalSales,
        total_copago: totalCopago,
        total_institutional: totalInstitutional,
        pending_amount: pendingAmount,
        paid_amount: paidAmount,
        collection_efficiency:
          totalInstitutional > 0
            ? Math.round((paidAmount / totalInstitutional) * 100)
            : 100,
      },
    });
  } catch (error) {
    logger.error("Analytics GET error", { error });
    return NextResponse.json(
      { error: "Error al obtener analítica" },
      { status: 500 },
    );
  }
}
