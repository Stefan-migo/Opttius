/**
 * Internal Institutional Billing
 *
 * Emite facturas institucionales agrupadas (sin SII).
 * Usa folio secuencial FAC-INST-XXXXXX por sucursal.
 */

import type {
  InstitutionalInvoice,
  InstitutionalInvoiceAdapter,
  InstitutionalInvoiceBillingResult,
} from "./InstitutionalInvoiceAdapter";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";

export class InternalInstitutionalBilling
  implements InstitutionalInvoiceAdapter
{
  private supabase = createServiceRoleClient();

  async emitInvoice(
    invoice: InstitutionalInvoice,
  ): Promise<InstitutionalInvoiceBillingResult> {
    const folio = await this.generateFolio(invoice.branch_id);

    const { data: inv, error: invError } = await this.supabase
      .from("agreement_institutional_invoices")
      .insert({
        agreement_id: invoice.agreement_id,
        branch_id: invoice.branch_id,
        organization_id: invoice.organization_id,
        institution_rut: invoice.institution_rut,
        institution_name: invoice.institution_name,
        period_from: invoice.period_from,
        period_to: invoice.period_to,
        subtotal: invoice.subtotal,
        tax_amount: invoice.tax_amount,
        total_amount: invoice.total_amount,
        document_type: "factura",
        folio,
        status: "emitted",
        payment_reference: invoice.payment_reference ?? null,
        paid_at: invoice.paid_at,
        emitted_at: new Date().toISOString(),
        emitted_by: invoice.emitted_by ?? null,
      })
      .select("id")
      .single();

    if (invError || !inv) {
      logger.error("Error creating institutional invoice", invError);
      throw new Error(
        `Failed to create institutional invoice: ${invError?.message ?? "Unknown"}`,
      );
    }

    const invoiceId = inv.id;

    for (const item of invoice.items) {
      const { error: balError } = await this.supabase
        .from("agreement_institutional_invoice_balances")
        .insert({
          invoice_id: invoiceId,
          balance_id: item.balance_id,
          amount: item.amount,
        });

      if (balError) {
        logger.error("Error linking balance to invoice", balError);
        throw new Error(`Failed to link balance: ${balError.message}`);
      }
    }

    const pdfUrl = `/api/admin/agreements/${invoice.agreement_id}/invoices/${invoiceId}/pdf`;

    const { error: updateError } = await this.supabase
      .from("agreement_institutional_invoices")
      .update({ pdf_url: pdfUrl, updated_at: new Date().toISOString() })
      .eq("id", invoiceId);

    if (updateError) {
      logger.warn("Failed to update pdf_url on invoice", updateError);
    }

    const { error: balUpdateError } = await this.supabase
      .from("agreement_institutional_balances")
      .update({ invoice_id: invoiceId })
      .in(
        "id",
        invoice.items.map((i) => i.balance_id),
      );

    if (balUpdateError) {
      logger.warn("Failed to set invoice_id on balances", balUpdateError);
    }

    return {
      folio,
      pdfUrl,
      type: "internal",
      timestamp: new Date(),
      invoice_id: invoiceId,
    };
  }

  private async generateFolio(branchId: string): Promise<string> {
    const { data: folio, error } = await this.supabase.rpc(
      "generate_agreement_institutional_invoice_folio",
      { p_branch_id: branchId },
    );

    if (error || !folio) {
      logger.error("Error generating institutional invoice folio", error);
      return this.fallbackFolio(branchId);
    }

    return folio;
  }

  private async fallbackFolio(branchId: string): Promise<string> {
    const prefix = "FAC-INST-";
    const { data: last } = await this.supabase
      .from("agreement_institutional_invoices")
      .select("folio")
      .eq("branch_id", branchId)
      .like("folio", `${prefix}%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let next = 1;
    if (last?.folio) {
      const m = last.folio.match(/\d+$/);
      if (m) next = parseInt(m[0], 10) + 1;
    }
    return `${prefix}${String(next).padStart(6, "0")}`;
  }
}
