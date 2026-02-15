import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";
import { sendEmail } from "@/lib/email/client";
import businessConfig from "@/config/business";
import { getBranchContext, addBranchFilter } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import {
  createApiSuccessResponse,
  createApiErrorResponse,
} from "@/lib/api/response";
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
  APIError,
} from "@/lib/api/errors";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";

export const dynamic = "force-dynamic";
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return createApiErrorResponse(new AuthenticationError("No autorizado"));
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return createApiErrorResponse(
        new AuthorizationError("Se requiere acceso de administrador"),
      );
    }

    // Fix for Next.js 14 params (not a promise)
    const { id } = params;

    // Get branch context
    const branchContext = await getBranchContext(request, user.id);

    // Build branch filter function
    const applyBranchFilter = (query: any) => {
      return addBranchFilter(
        query,
        branchContext.branchId,
        branchContext.isSuperAdmin,
        branchContext.organizationId,
      );
    };

    const body = await request.json();
    const { email } = body;

    if (!email || !email.includes("@")) {
      return createApiErrorResponse(
        new ValidationError("Email válido requerido"),
      );
    }

    // 1. Fetch quote data first (with branch access check)
    const { data: quoteData, error: quoteError } = await applyBranchFilter(
      supabaseServiceRole.from("quotes").select("*"),
    )
      .eq("id", id)
      .single();

    if (quoteError || !quoteData) {
      logger.error("Quote not found or access denied for sending", {
        quoteId: id,
        error: quoteError,
        branchId: branchContext.branchId,
      });
      return createApiErrorResponse(new NotFoundError("Presupuesto"));
    }

    // 2. Fetch related data separately (safer than complex joins in select string)
    const relations: any = {
      customer: null,
      prescription: null,
    };

    if (quoteData.customer_id) {
      const { data: customerData } = await supabaseServiceRole
        .from("customers")
        .select("id, first_name, last_name, email, phone")
        .eq("id", quoteData.customer_id)
        .single();
      relations.customer = customerData || null;
    }

    if (quoteData.prescription_id) {
      const { data: prescriptionData } = await supabaseServiceRole
        .from("prescriptions")
        .select("*")
        .eq("id", quoteData.prescription_id)
        .single();
      relations.prescription = prescriptionData || null;
    }

    const quote = {
      ...quoteData,
      customer: relations.customer,
      prescription: relations.prescription,
    };

    // Format customer name
    const customerName =
      quote.customer?.first_name && quote.customer?.last_name
        ? `${quote.customer.first_name} ${quote.customer.last_name}`
        : "Cliente";

    // Format prices
    const formatPrice = (amount: number) =>
      new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: quote.currency || "CLP",
        minimumFractionDigits: 0,
      }).format(amount || 0);

    // Build treatments list
    const treatmentsList =
      quote.lens_treatments && quote.lens_treatments.length > 0
        ? quote.lens_treatments.map((t: string) => `• ${t}`).join("\n")
        : "Ninguno";

    // Build email HTML
    const emailHTML = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Presupuesto ${quote.quote_number}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background: white;
              border-radius: 8px;
              padding: 30px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              border-bottom: 3px solid #8B5A3C;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0;
              color: #8B5A3C;
              font-size: 24px;
            }
            .quote-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .section {
              margin-bottom: 25px;
            }
            .section h2 {
              color: #8B5A3C;
              border-bottom: 2px solid #D4A574;
              padding-bottom: 5px;
              margin-bottom: 15px;
              font-size: 18px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #eee;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .pricing-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            .pricing-table td {
              padding: 10px;
              border-bottom: 1px solid #eee;
            }
            .pricing-table .total-row {
              font-weight: bold;
              font-size: 18px;
              border-top: 2px solid #8B5A3C;
              color: #8B5A3C;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #eee;
              font-size: 12px;
              color: #666;
            }
            .highlight {
              background-color: #fff3cd;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
              border-left: 4px solid #8B5A3C;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>PRESUPUESTO ${quote.quote_number}</h1>
              <p><strong>Fecha:</strong> ${new Date(
                quote.quote_date,
              ).toLocaleDateString("es-CL", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}</p>
              ${
                quote.expiration_date
                  ? `<p><strong>Válido hasta:</strong> ${new Date(
                      quote.expiration_date,
                    ).toLocaleDateString("es-CL", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}</p>`
                  : ""
              }
            </div>

            <div class="quote-info">
              <div>
                <h3 style="color: #8B5A3C; margin-top: 0;">Cliente</h3>
                <p><strong>${customerName}</strong></p>
                ${quote.customer?.email ? `<p>Email: ${quote.customer.email}</p>` : ""}
                ${quote.customer?.phone ? `<p>Teléfono: ${quote.customer.phone}</p>` : ""}
              </div>
              <div>
                <h3 style="color: #8B5A3C; margin-top: 0;">Estado</h3>
                <p><strong>${quote.status.toUpperCase()}</strong></p>
              </div>
            </div>

            <div class="section">
              <h2>Marco</h2>
              <div class="info-row">
                <span>Nombre:</span>
                <span>${quote.frame_name || "-"}</span>
              </div>
              ${quote.frame_brand ? `<div class="info-row"><span>Marca:</span><span>${quote.frame_brand}</span></div>` : ""}
              ${quote.frame_model ? `<div class="info-row"><span>Modelo:</span><span>${quote.frame_model}</span></div>` : ""}
              ${quote.frame_color ? `<div class="info-row"><span>Color:</span><span>${quote.frame_color}</span></div>` : ""}
              <div class="info-row">
                <span>Precio:</span>
                <span><strong>${formatPrice(quote.frame_price)}</strong></span>
              </div>
            </div>

            <div class="section">
              <h2>Lente</h2>
              ${quote.lens_type ? `<div class="info-row"><span>Tipo:</span><span>${quote.lens_type}</span></div>` : ""}
              ${quote.lens_material ? `<div class="info-row"><span>Material:</span><span>${quote.lens_material}</span></div>` : ""}
              ${quote.lens_index ? `<div class="info-row"><span>Índice:</span><span>${quote.lens_index}</span></div>` : ""}
              <div class="info-row">
                <span>Tratamientos:</span>
                <span style="white-space: pre-line;">${treatmentsList}</span>
              </div>
            </div>

            <div class="section">
              <h2>Desglose de Precios</h2>
              <table class="pricing-table">
                <tr>
                  <td>Costo de Marco:</td>
                  <td style="text-align: right;">${formatPrice(quote.frame_cost)}</td>
                </tr>
                <tr>
                  <td>Costo de Lente:</td>
                  <td style="text-align: right;">${formatPrice(quote.lens_cost)}</td>
                </tr>
                <tr>
                  <td>Costo de Tratamientos:</td>
                  <td style="text-align: right;">${formatPrice(quote.treatments_cost)}</td>
                </tr>
                <tr>
                  <td>Costo de Mano de Obra:</td>
                  <td style="text-align: right;">${formatPrice(quote.labor_cost)}</td>
                </tr>
                <tr>
                  <td><strong>Subtotal:</strong></td>
                  <td style="text-align: right;"><strong>${formatPrice(quote.subtotal)}</strong></td>
                </tr>
                ${
                  quote.discount_amount > 0
                    ? `
                <tr>
                  <td>Descuento (${quote.discount_percentage}%):</td>
                  <td style="text-align: right; color: red;">-${formatPrice(quote.discount_amount)}</td>
                </tr>
                `
                    : ""
                }
                <tr>
                  <td>IVA (19%):</td>
                  <td style="text-align: right;">${formatPrice(quote.tax_amount)}</td>
                </tr>
                <tr class="total-row">
                  <td>TOTAL:</td>
                  <td style="text-align: right;">${formatPrice(quote.total_amount)}</td>
                </tr>
              </table>
            </div>

            ${
              quote.customer_notes
                ? `
            <div class="highlight">
              <h3 style="margin-top: 0; color: #8B5A3C;">Notas para el Cliente</h3>
              <p style="white-space: pre-line; margin: 0;">${quote.customer_notes}</p>
            </div>
            `
                : ""
            }

            ${
              quote.terms_and_conditions
                ? `
            <div class="section">
              <h2>Términos y Condiciones</h2>
              <p style="white-space: pre-line;">${quote.terms_and_conditions}</p>
            </div>
            `
                : ""
            }

            <div class="footer">
              <p><strong>${businessConfig.name || "Óptica"}</strong></p>
              <p>Este presupuesto es válido hasta ${
                quote.expiration_date
                  ? new Date(quote.expiration_date).toLocaleDateString(
                      "es-CL",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )
                  : "fecha no especificada"
              }</p>
              <p>Para más información, contacte con nosotros.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Build plain text version
    const emailText = `
PRESUPUESTO ${quote.quote_number}

Fecha: ${new Date(quote.quote_date).toLocaleDateString("es-CL")}
${quote.expiration_date ? `Válido hasta: ${new Date(quote.expiration_date).toLocaleDateString("es-CL")}` : ""}

Cliente: ${customerName}
${quote.customer?.email ? `Email: ${quote.customer.email}` : ""}
${quote.customer?.phone ? `Teléfono: ${quote.customer.phone}` : ""}

MARCO:
Nombre: ${quote.frame_name || "-"}
${quote.frame_brand ? `Marca: ${quote.frame_brand}` : ""}
${quote.frame_model ? `Modelo: ${quote.frame_model}` : ""}
${quote.frame_color ? `Color: ${quote.frame_color}` : ""}
Precio: ${formatPrice(quote.frame_price)}

LENTE:
${quote.lens_type ? `Tipo: ${quote.lens_type}` : ""}
${quote.lens_material ? `Material: ${quote.lens_material}` : ""}
${quote.lens_index ? `Índice: ${quote.lens_index}` : ""}
Tratamientos:
${treatmentsList}

DESGLOSE DE PRECIOS:
Costo de Marco: ${formatPrice(quote.frame_cost)}
Costo de Lente: ${formatPrice(quote.lens_cost)}
Costo de Tratamientos: ${formatPrice(quote.treatments_cost)}
Costo de Mano de Obra: ${formatPrice(quote.labor_cost)}
Subtotal: ${formatPrice(quote.subtotal)}
${quote.discount_amount > 0 ? `Descuento (${quote.discount_percentage}%): -${formatPrice(quote.discount_amount)}` : ""}
IVA (19%): ${formatPrice(quote.tax_amount)}
TOTAL: ${formatPrice(quote.total_amount)}

${quote.customer_notes ? `\nNOTAS:\n${quote.customer_notes}\n` : ""}
${quote.terms_and_conditions ? `\nTÉRMINOS Y CONDICIONES:\n${quote.terms_and_conditions}\n` : ""}

Este presupuesto es válido hasta ${quote.expiration_date ? new Date(quote.expiration_date).toLocaleDateString("es-CL") : "fecha no especificada"}.
    `.trim();

    // Send email
    const emailResult = await sendEmail({
      to: email,
      subject: `Presupuesto ${quote.quote_number} - ${businessConfig.name || "Óptica"}`,
      html: emailHTML,
      text: emailText,
    });

    if (!emailResult.success) {
      return createApiErrorResponse(
        new APIError(emailResult.error || "Error al enviar email", 500),
      );
    }

    // Update quote status to 'sent'
    const { error: updateError } = await supabaseServiceRole
      .from("quotes")
      .update({
        status: "sent",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      logger.warn("Error updating quote status", updateError);
      // Don't fail the request if status update fails
    }

    return createApiSuccessResponse({
      message: "Presupuesto enviado exitosamente",
      emailId: emailResult.id,
    });
  } catch (error: any) {
    logger.error("Error sending quote", error);
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Error interno del servidor"),
    );
  }
}
