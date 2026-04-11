import { NextRequest, NextResponse } from "next/server";

import { EmailNotificationService } from "@/lib/email/notifications";
import { appLogger as logger } from "@/lib/logger";
import { sendLowStockAlertWhatsApp } from "@/lib/whatsapp/notifications-b2b";
import { createServiceRoleClient } from "@/utils/supabase/server";

/**
 * GET /api/cron/low-stock-alerts
 * Triggered by Vercel Cron. Sends low stock alert emails to org admins/owners.
 * Runs daily at 7:00 UTC.
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

    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, owner_id, metadata")
      .eq("status", "active");

    if (!orgs || orgs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No organizations to process",
        sent: 0,
      });
    }

    let totalSent = 0;

    for (const org of orgs) {
      const { data: orgConfig } = await supabase
        .from("system_config")
        .select("config_value")
        .eq("config_key", "auto_low_stock_alerts")
        .eq("organization_id", org.id)
        .maybeSingle();

      const { data: globalConfig } = await supabase
        .from("system_config")
        .select("config_value")
        .eq("config_key", "auto_low_stock_alerts")
        .is("organization_id", null)
        .maybeSingle();

      const configValue = orgConfig?.config_value ?? globalConfig?.config_value;
      const autoAlerts =
        configValue === false || configValue === "false" ? false : true;
      if (!autoAlerts) continue;

      const { data: branches } = await supabase
        .from("branches")
        .select("id")
        .eq("organization_id", org.id);

      const branchIds = (branches || []).map((b) => b.id);
      if (branchIds.length === 0) continue;

      const { data: stockRows } = await supabase
        .from("product_branch_stock")
        .select("product_id, branch_id, quantity, low_stock_threshold")
        .in("branch_id", branchIds);

      const lowStock = (stockRows || []).filter(
        (r: {
          quantity: number;
          low_stock_threshold: number | null;
          product_id: string;
        }) => {
          const qty = r.quantity ?? 0;
          const threshold = r.low_stock_threshold ?? 5;
          return qty <= threshold && qty >= 0;
        },
      );

      if (lowStock.length === 0) continue;

      const productIds = [...new Set(lowStock.map((r) => r.product_id))];
      const { data: productsData } = await supabase
        .from("products")
        .select("id, name")
        .in("id", productIds);

      const productMap = new Map(
        (productsData || []).map((p) => [p.id, p.name]),
      );

      const products = lowStock.map(
        (r: {
          quantity: number;
          low_stock_threshold: number | null;
          product_id: string;
        }) => ({
          name: productMap.get(r.product_id) || "Producto",
          current_stock: r.quantity ?? 0,
          min_stock: r.low_stock_threshold ?? 5,
        }),
      );

      // Prefer optica email (contact_email or support_email) over admin emails
      let recipientEmails: string[] = [];

      const { data: contactConfig } = await supabase
        .from("system_config")
        .select("config_value")
        .eq("config_key", "contact_email")
        .eq("organization_id", org.id)
        .maybeSingle();

      const { data: globalContactConfig } = contactConfig
        ? { data: null }
        : await supabase
            .from("system_config")
            .select("config_value")
            .eq("config_key", "contact_email")
            .is("organization_id", null)
            .maybeSingle();

      const contactEmailRow = contactConfig ?? globalContactConfig;
      const contactEmail =
        contactEmailRow?.config_value != null
          ? typeof contactEmailRow.config_value === "string"
            ? contactEmailRow.config_value
            : String(contactEmailRow.config_value)
          : "";

      const meta = (org.metadata as Record<string, unknown>) || {};
      const supportEmail = (meta.support_email as string) || "";

      const opticaEmail = (contactEmail || supportEmail || "").trim();
      if (opticaEmail) {
        recipientEmails = [opticaEmail];
      } else {
        const { data: admins } = await supabase
          .from("admin_users")
          .select("id")
          .eq("organization_id", org.id)
          .eq("is_active", true)
          .in("role", ["admin", "super_admin"]);

        const adminIds = (admins || []).map((a) => a.id);
        if (org.owner_id && !adminIds.includes(org.owner_id)) {
          adminIds.push(org.owner_id);
        }

        if (adminIds.length === 0) continue;

        const { data: profiles } = await supabase
          .from("profiles")
          .select("email")
          .in("id", adminIds);

        recipientEmails = (profiles || [])
          .map((p) => p.email)
          .filter((e): e is string => !!e);
      }

      if (recipientEmails.length === 0) continue;

      const result = await EmailNotificationService.sendLowStockAlert(
        recipientEmails,
        products,
        org.id,
      );

      if (result.success) totalSent++;

      const whatsappSent = await sendLowStockAlertWhatsApp(
        org.id,
        products,
        supabase,
      );
      if (whatsappSent) totalSent++;
    }

    logger.info("Low stock alerts cron completed", { totalSent });

    return NextResponse.json({
      success: true,
      message: "Low stock alerts sent",
      sent: totalSent,
    });
  } catch (error) {
    logger.error("Low stock alerts cron error", { error });
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
