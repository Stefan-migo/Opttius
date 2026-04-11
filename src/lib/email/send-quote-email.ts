/**
 * Service to send quote by email to a client.
 * Used by the quotes send API route and the AI agent sendQuoteByEmail tool.
 */
import businessConfig from "@/config/business";
import { sendEmail } from "@/lib/email/client";
import { createServiceRoleClient } from "@/utils/supabase/server";

export interface SendQuoteEmailContext {
  organizationId: string;
}

export interface SendQuoteEmailResult {
  success: boolean;
  error?: string;
  emailId?: string;
}

export async function sendQuoteEmailToClient(
  quoteId: string,
  email: string,
  context: SendQuoteEmailContext,
): Promise<SendQuoteEmailResult> {
  if (!email || !email.includes("@")) {
    return { success: false, error: "Email válido requerido" };
  }

  const supabase = createServiceRoleClient();

  const { data: quoteData, error: quoteError } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .eq("organization_id", context.organizationId)
    .single();

  if (quoteError || !quoteData) {
    return { success: false, error: "Presupuesto no encontrado" };
  }

  let customer: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    preferred_contact_method?: string;
  } | null = null;
  if (quoteData.customer_id) {
    const { data } = await supabase
      .from("customers")
      .select(
        "id, first_name, last_name, email, phone, preferred_contact_method",
      )
      .eq("id", quoteData.customer_id)
      .single();
    customer = data;
  }

  let prescription: Record<string, unknown> | null = null;
  if (quoteData.prescription_id) {
    const { data } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("id", quoteData.prescription_id)
      .single();
    prescription = data;
  }

  const quote = {
    ...quoteData,
    customer,
    prescription,
  };

  const customerName =
    quote.customer?.first_name && quote.customer?.last_name
      ? `${quote.customer.first_name} ${quote.customer.last_name}`
      : "Cliente";

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: quote.currency || "CLP",
      minimumFractionDigits: 0,
    }).format(amount || 0);

  const treatmentsList =
    quote.lens_treatments && quote.lens_treatments.length > 0
      ? quote.lens_treatments.map((t: string) => `• ${t}`).join("\n")
      : "Ninguno";

  const emailHTML = `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Presupuesto ${quote.quote_number}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
          .container { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { border-bottom: 3px solid #8B5A3C; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { margin: 0; color: #8B5A3C; font-size: 24px; }
          .section { margin-bottom: 25px; }
          .section h2 { color: #8B5A3C; border-bottom: 2px solid #D4A574; padding-bottom: 5px; margin-bottom: 15px; font-size: 18px; }
          .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .pricing-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .pricing-table td { padding: 10px; border-bottom: 1px solid #eee; }
          .pricing-table .total-row { font-weight: bold; font-size: 18px; border-top: 2px solid #8B5A3C; color: #8B5A3C; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #eee; font-size: 12px; color: #666; }
          .highlight { background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #8B5A3C; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>PRESUPUESTO ${quote.quote_number}</h1>
            <p><strong>Fecha:</strong> ${new Date(quote.quote_date).toLocaleDateString("es-CL", { year: "numeric", month: "long", day: "numeric" })}</p>
            ${quote.expiration_date ? `<p><strong>Válido hasta:</strong> ${new Date(quote.expiration_date).toLocaleDateString("es-CL", { year: "numeric", month: "long", day: "numeric" })}</p>` : ""}
          </div>
          <div class="section">
            <h2>Cliente</h2>
            <p><strong>${customerName}</strong></p>
            ${quote.customer?.email ? `<p>Email: ${quote.customer.email}</p>` : ""}
            ${quote.customer?.phone ? `<p>Teléfono: ${quote.customer.phone}</p>` : ""}
          </div>
          <div class="section">
            <h2>Marco</h2>
            <div class="info-row"><span>Nombre:</span><span>${quote.frame_name || "-"}</span></div>
            ${quote.frame_brand ? `<div class="info-row"><span>Marca:</span><span>${quote.frame_brand}</span></div>` : ""}
            <div class="info-row"><span>Precio:</span><span><strong>${formatPrice(quote.frame_price)}</strong></span></div>
          </div>
          <div class="section">
            <h2>Lente</h2>
            ${quote.lens_type ? `<div class="info-row"><span>Tipo:</span><span>${quote.lens_type}</span></div>` : ""}
            <div class="info-row"><span>Tratamientos:</span><span style="white-space: pre-line;">${treatmentsList}</span></div>
          </div>
          <div class="section">
            <h2>Desglose de Precios</h2>
            <table class="pricing-table">
              <tr><td>Costo de Marco:</td><td style="text-align: right;">${formatPrice(quote.frame_cost)}</td></tr>
              <tr><td>Costo de Lente:</td><td style="text-align: right;">${formatPrice(quote.lens_cost)}</td></tr>
              <tr><td>Costo de Tratamientos:</td><td style="text-align: right;">${formatPrice(quote.treatments_cost)}</td></tr>
              <tr><td>Costo de Mano de Obra:</td><td style="text-align: right;">${formatPrice(quote.labor_cost)}</td></tr>
              <tr><td><strong>Subtotal:</strong></td><td style="text-align: right;"><strong>${formatPrice(quote.subtotal)}</strong></td></tr>
              ${quote.discount_amount > 0 ? `<tr><td>Descuento (${quote.discount_percentage}%):</td><td style="text-align: right; color: red;">-${formatPrice(quote.discount_amount)}</td></tr>` : ""}
              <tr><td>IVA (19%):</td><td style="text-align: right;">${formatPrice(quote.tax_amount)}</td></tr>
              <tr class="total-row"><td>TOTAL:</td><td style="text-align: right;">${formatPrice(quote.total_amount)}</td></tr>
            </table>
          </div>
          ${quote.customer_notes ? `<div class="highlight"><h3 style="margin-top: 0; color: #8B5A3C;">Notas</h3><p style="white-space: pre-line; margin: 0;">${quote.customer_notes}</p></div>` : ""}
          <div class="footer">
            <p><strong>${businessConfig.name || "Óptica"}</strong></p>
            <p>Este presupuesto es válido hasta ${quote.expiration_date ? new Date(quote.expiration_date).toLocaleDateString("es-CL", { year: "numeric", month: "long", day: "numeric" }) : "fecha no especificada"}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const emailText = `
PRESUPUESTO ${quote.quote_number}
Fecha: ${new Date(quote.quote_date).toLocaleDateString("es-CL")}
Cliente: ${customerName}

MARCO: ${quote.frame_name || "-"} - ${formatPrice(quote.frame_price)}
LENTE: ${quote.lens_type || "-"}
TOTAL: ${formatPrice(quote.total_amount)}

Válido hasta: ${quote.expiration_date ? new Date(quote.expiration_date).toLocaleDateString("es-CL") : "fecha no especificada"}
  `.trim();

  const emailResult = await sendEmail({
    to: email,
    subject: `Presupuesto ${quote.quote_number} - ${businessConfig.name || "Óptica"}`,
    html: emailHTML,
    text: emailText,
  });

  if (!emailResult.success) {
    return {
      success: false,
      error: emailResult.error || "Error al enviar email",
    };
  }

  await supabase
    .from("quotes")
    .update({
      status: "sent",
      updated_at: new Date().toISOString(),
    })
    .eq("id", quoteId);

  return {
    success: true,
    emailId: emailResult.id,
  };
}
