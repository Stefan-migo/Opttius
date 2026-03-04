import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { sendQuoteExpiring } from "@/lib/email/templates/optica";
import { appLogger as logger } from "@/lib/logger";

/**
 * GET /api/cron/quote-expiring
 * Triggered by Vercel Cron. Sends quote expiring emails for quotes expiring in 24-48h.
 * Runs daily at 6:00 UTC.
 *
 * Requires CRON_SECRET for authorization.
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    request.headers.get("x-cron-secret") !== process.env.CRON_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();

    const now = new Date();
    const in48h = new Date(now);
    in48h.setDate(in48h.getDate() + 2);
    const in48hStr = in48h.toISOString().split("T")[0];

    const { data: quotes } = await supabase
      .from("quotes")
      .select(
        `
        id,
        quote_number,
        quote_date,
        expiration_date,
        total_amount,
        status,
        customer_id,
        branch_id,
        organization_id,
        customer:customers(id, first_name, last_name, email),
        branch:branches(phone, email)
      `,
      )
      .eq("status", "sent")
      .eq("expiration_date", in48hStr);

    if (!quotes || quotes.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No quotes expiring soon",
        sent: 0,
      });
    }

    let totalSent = 0;

    for (const q of quotes) {
      const customer = q.customer as {
        first_name?: string;
        last_name?: string;
        email?: string;
      } | null;

      const customerEmail = customer?.email;
      if (!customerEmail) continue;

      const customerName =
        `${customer?.first_name || ""} ${customer?.last_name || ""}`.trim() ||
        "Cliente";

      const expiryDateStr =
        typeof q.expiration_date === "string"
          ? q.expiration_date
          : q.expiration_date?.toISOString?.()?.split("T")[0] || "";
      const quoteDateStr =
        typeof q.quote_date === "string"
          ? q.quote_date
          : q.quote_date?.toISOString?.()?.split("T")[0] || expiryDateStr;

      const branch = q.branch as { phone?: string; email?: string } | null;

      const quoteData = {
        id: q.id,
        quote_number: q.quote_number || `COT-${String(q.id).slice(0, 8)}`,
        customer_name: customerName,
        customer_first_name: customer?.first_name || "Cliente",
        customer_email: customerEmail,
        date: quoteDateStr,
        expiry_date: expiryDateStr,
        total: q.total_amount ? String(q.total_amount) : "",
        accept_url: "",
        quote_url: "",
        branch_phone: branch?.phone || "",
        branch_email: branch?.email || "",
      };

      const result = await sendQuoteExpiring(
        quoteData,
        q.organization_id as string | undefined,
      );

      if (result.success) totalSent++;
    }

    logger.info("Quote expiring cron completed", {
      total: quotes.length,
      sent: totalSent,
    });

    return NextResponse.json({
      success: true,
      message: "Quote expiring emails sent",
      sent: totalSent,
    });
  } catch (error) {
    logger.error("Quote expiring cron error", { error });
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
