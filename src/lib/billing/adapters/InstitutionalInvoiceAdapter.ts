/**
 * Institutional Invoice Adapter Interface
 *
 * Adaptador para facturas institucionales (agrupadas a instituciones).
 * Permite cambiar entre facturación interna y SII sin modificar la lógica.
 */

import type { BillingResult } from "./BillingAdapter";

export interface InstitutionalInvoiceItem {
  order_number: string;
  oc_number?: string;
  description: string;
  amount: number;
  balance_id: string;
}

export interface InstitutionalInvoice {
  agreement_id: string;
  branch_id: string;
  organization_id: string;
  institution_rut: string;
  institution_name: string;
  items: InstitutionalInvoiceItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  period_from: string;
  period_to: string;
  payment_reference?: string;
  paid_at: string;
  emitted_by?: string;
}

export interface InstitutionalInvoiceAdapter {
  /**
   * Emite una factura institucional agrupada
   */
  emitInvoice(
    invoice: InstitutionalInvoice,
  ): Promise<InstitutionalInvoiceBillingResult>;
}

export interface InstitutionalInvoiceBillingResult extends BillingResult {
  invoice_id: string;
}
