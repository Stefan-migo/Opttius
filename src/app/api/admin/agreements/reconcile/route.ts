import { NextRequest, NextResponse } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { rateLimitConfigs, withRateLimit } from "@/lib/api/middleware";
import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from "@/lib/api/response";
import {
  parseAndValidateBody,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";
import { reconcileSchema } from "@/lib/api/validation/zod-schemas";
import type { InstitutionalInvoice } from "@/lib/billing/adapters/InstitutionalInvoiceAdapter";
import { InternalInstitutionalBilling } from "@/lib/billing/adapters/InternalInstitutionalBilling";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    return await (withRateLimit(rateLimitConfigs.agreements) as unknown)(
      request,
      async () => {
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

        let body;
        try {
          body = await parseAndValidateBody(request, reconcileSchema);
        } catch (error) {
          if (error instanceof ValidationError) {
            return validationErrorResponse(error);
          }
          throw error;
        }

        const paidAt =
          typeof body.paid_at === "string"
            ? body.paid_at
            : (body.paid_at as Date).toISOString();

        const { data: updated, error } = await supabase
          .from("agreement_institutional_balances")
          .update({
            status: "paid",
            paid_at: paidAt,
            payment_reference: body.payment_reference || null,
          })
          .in("id", body.balance_ids)
          .eq("status", "pending")
          .select();

        if (error) {
          logger.error("Error reconciling balances", { error });
          return createApiErrorResponse(new Error(error.message));
        }

        let invoice: { id: string; folio: string; pdf_url: string } | undefined;

        if (body.emit_invoice && updated && updated.length > 0) {
          try {
            const serviceSupabase = createServiceRoleClient();
            const { data: balancesWithDetails } = await serviceSupabase
              .from("agreement_institutional_balances")
              .select(
                `
                id,
                amount,
                created_at,
                agreement_id,
                orders!inner (
                  order_number,
                  branch_id
                ),
                agreement_purchase_orders (
                  oc_number
                )
              `,
              )
              .in("id", body.balance_ids);

            if (
              balancesWithDetails &&
              balancesWithDetails.length > 0 &&
              (balancesWithDetails[0] as unknown).agreement_id
            ) {
              const first = balancesWithDetails[0] as unknown;
              const agreementId = first.agreement_id;

              const { data: agreement } = await serviceSupabase
                .from("agreements")
                .select(
                  "institution_rut, institution_name, organization_id, branch_id",
                )
                .eq("id", agreementId)
                .single();

              if (agreement) {
                const branchId =
                  agreement.branch_id ??
                  (first.orders?.branch_id as string | undefined);
                if (branchId) {
                  const dates = (balancesWithDetails as unknown[])
                    .map((b) => b.created_at)
                    .filter(Boolean);
                  const periodFrom = dates.length
                    ? new Date(
                        Math.min(...dates.map((d) => new Date(d).getTime())),
                      )
                        .toISOString()
                        .slice(0, 10)
                    : new Date().toISOString().slice(0, 10);
                  const periodTo = dates.length
                    ? new Date(
                        Math.max(...dates.map((d) => new Date(d).getTime())),
                      )
                        .toISOString()
                        .slice(0, 10)
                    : new Date().toISOString().slice(0, 10);

                  const items = (balancesWithDetails as unknown[]).map((b) => ({
                    order_number: b.orders?.order_number ?? b.id,
                    oc_number: b.agreement_purchase_orders?.oc_number,
                    description: `Servicios ópticos - Orden ${b.orders?.order_number ?? b.id}`,
                    amount: Number(b.amount),
                    balance_id: b.id,
                  }));

                  const subtotal = items.reduce((s, i) => s + i.amount, 0);
                  const taxAmount = Math.round(subtotal * 0.19);
                  const totalAmount = subtotal + taxAmount;

                  const institutionalInvoice: InstitutionalInvoice = {
                    agreement_id: agreementId,
                    branch_id: branchId,
                    organization_id: agreement.organization_id,
                    institution_rut: agreement.institution_rut,
                    institution_name: agreement.institution_name,
                    items,
                    subtotal,
                    tax_amount: taxAmount,
                    total_amount: totalAmount,
                    period_from: periodFrom,
                    period_to: periodTo,
                    payment_reference: body.payment_reference ?? undefined,
                    paid_at: paidAt,
                    emitted_by: user.id,
                  };

                  const billing = new InternalInstitutionalBilling();
                  const result =
                    await billing.emitInvoice(institutionalInvoice);
                  invoice = {
                    id: result.invoice_id,
                    folio: result.folio,
                    pdf_url: result.pdfUrl,
                  };
                }
              }
            }
          } catch (invErr) {
            logger.error("Error emitting institutional invoice", invErr);
            // Don't fail reconcile; invoice emission is best-effort
          }
        }

        return createApiSuccessResponse({
          reconciled_count: updated?.length ?? 0,
          balances: updated,
          invoice,
        });
      },
    );
  } catch (error) {
    logger.error("Reconcile POST error", { error });
    return createApiErrorResponse(error as Error);
  }
}
