import { NextRequest, NextResponse } from "next/server";

import type { InstitutionalInvoiceItem } from "@/lib/billing/adapters/InstitutionalInvoiceAdapter";
import {
  generateInstitutionalInvoiceHTML,
  type InstitutionalInvoiceDocumentData,
} from "@/lib/billing/pdf-generator";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";

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

    const serviceSupabase = createServiceRoleClient();
    const { data: invoice, error: invError } = await serviceSupabase
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

    const { data: invoiceBalances } = await serviceSupabase
      .from("agreement_institutional_invoice_balances")
      .select(
        `
        balance_id,
        amount,
        agreement_institutional_balances (
          orders (
            order_number
          ),
          agreement_purchase_orders (
            oc_number
          )
        )
      `,
      )
      .eq("invoice_id", invoiceId);

    const items: InstitutionalInvoiceItem[] = (invoiceBalances ?? []).map(
      (ib) => {
        const bal = ib.agreement_institutional_balances as {
          orders?: { order_number: string } | null;
          agreement_purchase_orders?: { oc_number: string } | null;
        } | null;
        const order = bal?.orders;
        const po = bal?.agreement_purchase_orders;
        return {
          balance_id: ib.balance_id,
          order_number: order?.order_number ?? "-",
          oc_number: po?.oc_number,
          description: `Servicios ópticos - Orden ${order?.order_number ?? "-"}`,
          amount: Number(ib.amount),
        };
      },
    );

    const { data: org } = await serviceSupabase
      .from("organizations")
      .select("name")
      .eq("id", invoice.organization_id)
      .single();

    const docData: InstitutionalInvoiceDocumentData = {
      folio: invoice.folio,
      emissionDate: new Date(invoice.emitted_at ?? invoice.created_at),
      businessName: org?.name ?? "Óptica",
      businessRUT: "",
      institutionName: invoice.institution_name,
      institutionRUT: invoice.institution_rut,
      periodFrom: invoice.period_from,
      periodTo: invoice.period_to,
      paymentReference: invoice.payment_reference ?? undefined,
      items,
      subtotal: Number(invoice.subtotal),
      taxAmount: Number(invoice.tax_amount),
      totalAmount: Number(invoice.total_amount),
      currency: invoice.currency ?? "CLP",
    };

    const html = generateInstitutionalInvoiceHTML(docData);

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="factura-${invoice.folio}.html"`,
      },
    });
  } catch (error) {
    logger.error("Agreement invoice PDF GET error", { error });
    return NextResponse.json(
      { error: "Error al generar documento" },
      { status: 500 },
    );
  }
}
