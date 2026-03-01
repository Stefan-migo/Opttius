import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";
import { sendQuoteWhatsApp } from "@/lib/whatsapp/notifications-b2b";
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
import { sendQuoteEmailToClient } from "@/lib/email/send-quote-email";

export const dynamic = "force-dynamic";
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

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

    const { id } = params;
    const branchContext = await getBranchContext(request, user.id);

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

    const { data: quoteData, error: quoteError } = await applyBranchFilter(
      supabaseServiceRole.from("quotes").select("id, organization_id"),
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

    const result = await sendQuoteEmailToClient(id, email, {
      organizationId: quoteData.organization_id,
    });

    if (!result.success) {
      return createApiErrorResponse(
        new APIError(result.error || "Error al enviar email", 500),
      );
    }

    const { data: quoteForWhatsApp } = await supabaseServiceRole
      .from("quotes")
      .select("customer_id, quote_number, total_amount, currency")
      .eq("id", id)
      .single();

    if (quoteForWhatsApp?.customer_id) {
      const { data: customerData } = await supabaseServiceRole
        .from("customers")
        .select("phone, preferred_contact_method")
        .eq("id", quoteForWhatsApp.customer_id)
        .maybeSingle();

      const customer = customerData as {
        phone?: string;
        preferred_contact_method?: string;
      } | null;
      if (
        customer?.phone &&
        customer?.preferred_contact_method === "whatsapp"
      ) {
        sendQuoteWhatsApp(
          customer.phone,
          quoteForWhatsApp.quote_number,
          quoteForWhatsApp.total_amount,
          quoteForWhatsApp.currency ?? "CLP",
        ).catch((err) => logger.warn("WhatsApp quote send failed", err));
      }
    }

    return createApiSuccessResponse({
      message: "Presupuesto enviado exitosamente",
      emailId: result.emailId,
    });
  } catch (error: unknown) {
    logger.error("Error sending quote", error);
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Error interno del servidor"),
    );
  }
}
