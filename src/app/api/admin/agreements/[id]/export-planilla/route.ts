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

    const searchParams = request.nextUrl.searchParams;
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    const serviceSupabase = createServiceRoleClient();

    let query = serviceSupabase
      .from("agreement_institutional_balances")
      .select(
        `
        id,
        amount,
        orders!inner (
          order_number,
          customer_name,
          sii_rut,
          created_at
        )
      `,
      )
      .eq("agreement_id", agreementId)
      .eq("status", "pending");

    const { data: balances, error } = await query;

    if (error) {
      logger.error("Error fetching balances for export", { error });
      return NextResponse.json(
        { error: "Error al obtener datos" },
        { status: 500 },
      );
    }

    const rows = (balances || []).map((b: any) => {
      const order = b.orders || {};
      const created = order.created_at
        ? new Date(order.created_at).toISOString().split("T")[0]
        : "";
      return {
        rut: order.sii_rut || "",
        nombre: order.customer_name || "",
        monto: b.amount,
        orden: order.order_number || "",
        fecha: created,
      };
    });

    const csvHeader =
      "RUT;Nombre;Monto a descontar;Número de orden;Fecha de compra\n";
    const csvRows = rows
      .map((r: any) => `${r.rut};${r.nombre};${r.monto};${r.orden};${r.fecha}`)
      .join("\n");
    const csv = csvHeader + csvRows;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="planilla-convenio-${agreementId}.csv"`,
      },
    });
  } catch (error) {
    logger.error("Export planilla error", { error });
    return NextResponse.json(
      { error: "Error al exportar planilla" },
      { status: 500 },
    );
  }
}
