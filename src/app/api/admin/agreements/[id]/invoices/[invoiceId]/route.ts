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
  { params }: { params: Promise<{ id: string; invoiceId: string }> },
) {
  try {
    const { id: agreementId, invoiceId } = await params;
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

    const { data: invoice, error: invError } = await supabase
      .from("agreement_institutional_invoices")
      .select("*")
      .eq("id", invoiceId)
      .eq("agreement_id", agreementId)
      .single();

    if (invError || !invoice) {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 },
      );
    }

    const { data: invoiceBalances } = await supabase
      .from("agreement_institutional_invoice_balances")
      .select(
        `
        id,
        amount,
        balance_id,
        agreement_institutional_balances (
          id,
          order_id,
          amount,
          orders (
            order_number,
            customer_name,
            created_at
          ),
          agreement_purchase_orders (
            oc_number
          )
        )
      `,
      )
      .eq("invoice_id", invoiceId);

    const items = (invoiceBalances ?? []).map((ib) => {
      const bal = ib.agreement_institutional_balances as {
        orders?: {
          order_number: string;
          customer_name: string;
          created_at: string;
        } | null;
        agreement_purchase_orders?: { oc_number: string } | null;
      } | null;
      const order = bal?.orders;
      const po = bal?.agreement_purchase_orders;
      return {
        balance_id: ib.balance_id,
        amount: Number(ib.amount),
        order_number: order?.order_number ?? "-",
        oc_number: po?.oc_number ?? null,
        customer_name: order?.customer_name ?? null,
        order_created_at: order?.created_at ?? null,
      };
    });

    return createApiSuccessResponse({
      ...invoice,
      items,
    });
  } catch (error) {
    logger.error("Agreement invoice detail GET error", { error });
    return createApiErrorResponse(error as Error);
  }
}
