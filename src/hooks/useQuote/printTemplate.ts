import { formatCurrency, formatDate } from "@/lib/utils";

import type { Quote } from "./types";

export function buildQuotePrintContent(quote: Quote): string {
  const customerName =
    quote.customer?.first_name && quote.customer?.last_name
      ? `${quote.customer.first_name} ${quote.customer.last_name}`
      : "Sin nombre";

  const treatmentsList = quote.lens_treatments?.length
    ? quote.lens_treatments.map((t) => `<li>${t}</li>`).join("")
    : "<li>Ninguno</li>";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Presupuesto ${quote.quote_number}</title>
        <style>
          @media print { @page { margin: 1cm; } }
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
          .header { border-bottom: 3px solid #8B5A3C; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { margin: 0; color: #8B5A3C; font-size: 24px; }
          .quote-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .section { margin-bottom: 25px; }
          .section h2 { color: #8B5A3C; border-bottom: 2px solid #D4A574; padding-bottom: 5px; margin-bottom: 15px; font-size: 18px; }
          .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .pricing-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .pricing-table td { padding: 10px; border-bottom: 1px solid #eee; }
          .pricing-table .total-row { font-weight: bold; font-size: 18px; border-top: 2px solid #8B5A3C; color: #8B5A3C; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #eee; font-size: 12px; color: #666; }
          ul { margin: 10px 0; padding-left: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PRESUPUESTO ${quote.quote_number}</h1>
          <p>Fecha: ${formatDate(quote.quote_date)}</p>
          ${quote.expiration_date ? `<p>Válido hasta: ${formatDate(quote.expiration_date)}</p>` : ""}
        </div>
        <div class="quote-info">
          <div>
            <h3>Cliente</h3>
            <p><strong>${customerName}</strong></p>
            ${quote.customer?.email ? `<p>Email: ${quote.customer.email}</p>` : ""}
            ${quote.customer?.phone ? `<p>Teléfono: ${quote.customer.phone}</p>` : ""}
          </div>
          <div><h3>Estado</h3><p><strong>${quote.status.toUpperCase()}</strong></p></div>
        </div>
        <div class="section">
          <h2>Marco</h2>
          <div class="info-row"><span>Nombre:</span><span>${quote.frame_name || "-"}</span></div>
          ${quote.frame_brand ? `<div class="info-row"><span>Marca:</span><span>${quote.frame_brand}</span></div>` : ""}
          ${quote.frame_model ? `<div class="info-row"><span>Modelo:</span><span>${quote.frame_model}</span></div>` : ""}
          <div class="info-row"><span>Precio:</span><span><strong>${formatCurrency(quote.frame_price)}</strong></span></div>
        </div>
        <div class="section">
          <h2>Lente</h2>
          ${quote.lens_type ? `<div class="info-row"><span>Tipo:</span><span>${quote.lens_type}</span></div>` : ""}
          ${quote.lens_material ? `<div class="info-row"><span>Material:</span><span>${quote.lens_material}</span></div>` : ""}
          ${quote.lens_index ? `<div class="info-row"><span>Índice:</span><span>${quote.lens_index}</span></div>` : ""}
          <div class="info-row"><span>Tratamientos:</span><span><ul>${treatmentsList}</ul></span></div>
        </div>
        <div class="section">
          <h2>Desglose de Precios</h2>
          <table class="pricing-table">
            <tr><td>Costo de Marco:</td><td style="text-align:right">${formatCurrency(quote.frame_cost)}</td></tr>
            <tr><td>Costo de Lente:</td><td style="text-align:right">${formatCurrency(quote.lens_cost)}</td></tr>
            <tr><td>Costo de Tratamientos:</td><td style="text-align:right">${formatCurrency(quote.treatments_cost)}</td></tr>
            <tr><td>Costo de Mano de Obra:</td><td style="text-align:right">${formatCurrency(quote.labor_cost)}</td></tr>
            <tr><td><strong>Subtotal:</strong></td><td style="text-align:right"><strong>${formatCurrency(quote.subtotal)}</strong></td></tr>
            ${quote.discount_amount > 0 ? `<tr><td>Descuento (${quote.discount_percentage}%):</td><td style="text-align:right;color:red">-${formatCurrency(quote.discount_amount)}</td></tr>` : ""}
            <tr><td>IVA (19%):</td><td style="text-align:right">${formatCurrency(quote.tax_amount)}</td></tr>
            <tr class="total-row"><td>TOTAL:</td><td style="text-align:right">${formatCurrency(quote.total_amount)}</td></tr>
          </table>
        </div>
        ${quote.customer_notes ? `<div class="section"><h2>Notas para el Cliente</h2><p>${quote.customer_notes.replace(/\n/g, "<br>")}</p></div>` : ""}
        ${quote.terms_and_conditions ? `<div class="section"><h2>Términos y Condiciones</h2><p>${quote.terms_and_conditions.replace(/\n/g, "<br>")}</p></div>` : ""}
        <div class="footer">
          <p>Este presupuesto es válido hasta ${quote.expiration_date ? formatDate(quote.expiration_date) : "fecha no especificada"}</p>
          <p>Para más información, contacte con nosotros.</p>
        </div>
      </body>
    </html>`;
}
