/**
 * PDF Generator for Billing Documents
 * Generates PDFs for boletas, facturas, and internal tickets
 * Supports customization (logo, header, footer)
 */

import { OrderItem } from "./adapters/BillingAdapter";
import type { InstitutionalInvoiceItem } from "./adapters/InstitutionalInvoiceAdapter";

export interface BillingDocumentData {
  // Document info
  folio: string;
  documentType: "boleta" | "factura" | "internal_ticket";
  emissionDate: Date;

  // Business info
  businessName: string;
  businessRUT: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  logoUrl?: string;

  // Customer info
  customerName?: string;
  customerRUT?: string;
  customerAddress?: string;
  customerEmail?: string;

  // Order info
  orderNumber: string;
  orderDate: Date;

  // Items
  items: OrderItem[];

  // Totals
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;

  // Customization
  customHeaderText?: string;
  customFooterText?: string;
  termsAndConditions?: string;
}

export interface PDFGenerationOptions {
  includeLogo?: boolean;
  logoUrl?: string;
  customHeader?: string;
  customFooter?: string;
  template?: "default" | "minimal" | "detailed";
}

/**
 * Generates a PDF for a billing document
 * TODO: Implement actual PDF generation using pdfkit or react-pdf
 * For now, returns a URL placeholder
 */
export async function generateBillingPDF(
  data: BillingDocumentData,
  options: PDFGenerationOptions = {},
): Promise<string> {
  // TODO: Implement actual PDF generation
  // This is a placeholder that will be implemented with:
  // - pdfkit (Node.js) or react-pdf (browser)
  // - Template system for customization
  // - Logo support
  // - Storage in Supabase Storage

  const documentTypeLabel = {
    boleta: "Boleta",
    factura: "Factura",
    internal_ticket: "Ticket Interno",
  }[data.documentType];

  // Placeholder: In production, this would generate an actual PDF
  // and upload it to Supabase Storage
  const pdfUrl = `/api/admin/billing/documents/${data.folio}/pdf`;

  return pdfUrl;
}

/**
 * Generates PDF content as HTML (for preview or conversion)
 */
export function generateBillingHTML(
  data: BillingDocumentData,
  options: PDFGenerationOptions = {},
): string {
  const documentTypeLabel = {
    boleta: "Boleta",
    factura: "Factura",
    internal_ticket: "Ticket Interno",
  }[data.documentType];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${documentTypeLabel} ${data.folio}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .logo { max-width: 150px; max-height: 80px; }
        .document-info { text-align: right; }
        .customer-info { margin: 20px 0; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .items-table th { background-color: #f2f2f2; }
        .totals { text-align: right; margin-top: 20px; }
        .footer { margin-top: 40px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          ${options.logoUrl ? `<img src="${options.logoUrl}" alt="Logo" class="logo" />` : ""}
          <h2>${data.businessName}</h2>
          <p>RUT: ${data.businessRUT}</p>
          ${data.businessAddress ? `<p>${data.businessAddress}</p>` : ""}
        </div>
        <div class="document-info">
          <h1>${documentTypeLabel}</h1>
          <p><strong>Folio:</strong> ${data.folio}</p>
          <p><strong>Fecha:</strong> ${data.emissionDate.toLocaleDateString("es-CL")}</p>
        </div>
      </div>
      
      ${options.customHeader ? `<div class="custom-header">${options.customHeader}</div>` : ""}
      
      <div class="customer-info">
        <h3>Cliente</h3>
        ${data.customerName ? `<p><strong>Nombre:</strong> ${data.customerName}</p>` : ""}
        ${data.customerRUT ? `<p><strong>RUT:</strong> ${data.customerRUT}</p>` : ""}
        ${data.customerAddress ? `<p><strong>Dirección:</strong> ${data.customerAddress}</p>` : ""}
      </div>
      
      <table class="items-table">
        <thead>
          <tr>
            <th>Cantidad</th>
            <th>Descripción</th>
            <th>Precio Unit.</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.items
            .map(
              (item) => `
            <tr>
              <td>${item.quantity}</td>
              <td>${item.product_name}</td>
              <td>${formatCurrency(item.unit_price, data.currency)}</td>
              <td>${formatCurrency(item.total_price, data.currency)}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
      
      <div class="totals">
        <p>Subtotal: ${formatCurrency(data.subtotal, data.currency)}</p>
        <p>IVA: ${formatCurrency(data.taxAmount, data.currency)}</p>
        ${data.discountAmount > 0 ? `<p>Descuento: ${formatCurrency(data.discountAmount, data.currency)}</p>` : ""}
        <p><strong>Total: ${formatCurrency(data.totalAmount, data.currency)}</strong></p>
      </div>
      
      ${options.customFooter ? `<div class="custom-footer">${options.customFooter}</div>` : ""}
      ${data.termsAndConditions ? `<div class="footer"><p>${data.termsAndConditions}</p></div>` : ""}
    </body>
    </html>
  `;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: currency || "CLP",
    minimumFractionDigits: 0,
  }).format(amount);
}

// ============================================================================
// Institutional Invoice PDF (facturas agrupadas a instituciones)
// ============================================================================

export interface InstitutionalInvoiceDocumentData {
  folio: string;
  emissionDate: Date;
  businessName: string;
  businessRUT: string;
  businessAddress?: string;
  institutionName: string;
  institutionRUT: string;
  periodFrom: string;
  periodTo: string;
  paymentReference?: string;
  items: InstitutionalInvoiceItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
}

/**
 * Generates PDF for institutional invoice (agrupada a institución)
 * Returns placeholder URL; actual PDF generation TBD
 */
export async function generateInstitutionalInvoicePDF(
  data: InstitutionalInvoiceDocumentData,
): Promise<string> {
  // Placeholder: same pattern as generateBillingPDF
  return `/api/admin/agreements/invoices/${data.folio}/pdf`;
}

/**
 * Generates HTML for institutional invoice (preview or conversion)
 */
export function generateInstitutionalInvoiceHTML(
  data: InstitutionalInvoiceDocumentData,
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Factura Institucional ${data.folio}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .document-info { text-align: right; }
        .customer-info { margin: 20px 0; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .items-table th { background-color: #f2f2f2; }
        .totals { text-align: right; margin-top: 20px; }
        .period { margin: 8px 0; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h2>${data.businessName}</h2>
          <p>RUT: ${data.businessRUT}</p>
          ${data.businessAddress ? `<p>${data.businessAddress}</p>` : ""}
        </div>
        <div class="document-info">
          <h1>Factura Institucional</h1>
          <p><strong>Folio:</strong> ${data.folio}</p>
          <p><strong>Fecha:</strong> ${data.emissionDate.toLocaleDateString("es-CL")}</p>
        </div>
      </div>
      
      <div class="customer-info">
        <h3>Cliente (Institución)</h3>
        <p><strong>Razón social:</strong> ${data.institutionName}</p>
        <p><strong>RUT:</strong> ${data.institutionRUT}</p>
        <p class="period"><strong>Período:</strong> ${data.periodFrom} - ${data.periodTo}</p>
        ${data.paymentReference ? `<p><strong>Ref. pago:</strong> ${data.paymentReference}</p>` : ""}
      </div>
      
      <table class="items-table">
        <thead>
          <tr>
            <th>Orden</th>
            <th>OC</th>
            <th>Descripción</th>
            <th>Monto</th>
          </tr>
        </thead>
        <tbody>
          ${data.items
            .map(
              (item) => `
            <tr>
              <td>${item.order_number}</td>
              <td>${item.oc_number || "-"}</td>
              <td>${item.description}</td>
              <td>${formatCurrency(item.amount, data.currency)}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
      
      <div class="totals">
        <p>Subtotal: ${formatCurrency(data.subtotal, data.currency)}</p>
        <p>IVA: ${formatCurrency(data.taxAmount, data.currency)}</p>
        <p><strong>Total: ${formatCurrency(data.totalAmount, data.currency)}</strong></p>
      </div>
    </body>
    </html>
  `;
}
