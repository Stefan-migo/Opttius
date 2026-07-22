import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

import { batchUpdateSettingsHandler } from "./_handlers/batchUpdateSettings";
import { upsertSettingHandler } from "./_handlers/upsertSetting";

const ALL_NOTIFICATION_TYPES = [
  "quote_new",
  "quote_status_change",
  "quote_converted",
  "work_order_new",
  "work_order_status_change",
  "work_order_completed",
  "appointment_new",
  "appointment_cancelled",
  "new_customer",
  "sale_new",
  "order_new",
  "order_status_change",
  "low_stock",
  "out_of_stock",
  "payment_received",
  "payment_failed",
  "support_ticket_new",
  "support_ticket_update",
  "system_alert",
  "system_update",
  "security_alert",
  "custom",
] as const;

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const url = new URL(request.url);
    const organizationId = url.searchParams.get("organization_id") || undefined;
    const branchId = url.searchParams.get("branch_id") || undefined;

    const queries = [
      supabase
        .from("notification_settings")
        .select("*")
        .is("organization_id", null)
        .is("branch_id", null),
      ...(organizationId
        ? [
            supabase
              .from("notification_settings")
              .select("*")
              .eq("organization_id", organizationId)
              .is("branch_id", null),
            ...(branchId
              ? [
                  supabase
                    .from("notification_settings")
                    .select("*")
                    .eq("organization_id", organizationId)
                    .eq("branch_id", branchId),
                ]
              : []),
          ]
        : []),
    ];

    const results = (await Promise.all(queries)) as {
      data: unknown[] | null;
      error: unknown;
    }[];
    const error = results.find((r) => r.error)?.error as
      | { code?: string; message?: string }
      | undefined;
    const rawSettings = results.flatMap((r) => r.data || []);

    if (error) {
      logger.error("Error fetching notification settings:", { error });

      if (
        error.code === "PGRST205" ||
        error.message?.includes("Could not find the table")
      ) {
        return NextResponse.json(
          {
            error: "Table not found",
            message:
              "The notification_settings table does not exist. Please run the database migration: 20250129000000_add_optical_notification_types.sql",
            settings: [],
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { error: "Failed to fetch settings", details: error.message },
        { status: 500 },
      );
    }

    const rows = (rawSettings || []) as Array<{
      id: string;
      notification_type: string;
      enabled: boolean;
      priority: string | null;
      organization_id: string | null;
      branch_id: string | null;
      [key: string]: unknown;
    }>;

    const effectiveMap = new Map<
      string,
      {
        id: string;
        enabled: boolean;
        priority: string | null;
        [key: string]: unknown;
      }
    >();

    for (const type of ALL_NOTIFICATION_TYPES) {
      const branchRow = branchId
        ? rows.find(
            (r) =>
              r.notification_type === type &&
              r.organization_id === organizationId &&
              r.branch_id === branchId,
          )
        : null;
      const orgRow = organizationId
        ? rows.find(
            (r) =>
              r.notification_type === type &&
              r.organization_id === organizationId &&
              r.branch_id === null,
          )
        : null;
      const globalRow = rows.find(
        (r) =>
          r.notification_type === type &&
          r.organization_id === null &&
          r.branch_id === null,
      );

      const effective = branchRow ?? orgRow ?? globalRow;
      if (effective) {
        effectiveMap.set(type, {
          ...effective,
          enabled: effective.enabled,
          priority: effective.priority,
        });
      } else {
        effectiveMap.set(type, {
          id: "",
          notification_type: type,
          enabled: true,
          priority: null,
          organization_id: organizationId || null,
          branch_id: branchId || null,
        });
      }
    }

    const settings = Array.from(effectiveMap.values());

    return NextResponse.json({
      settings,
      scope: {
        organization_id: organizationId || null,
        branch_id: branchId || null,
      },
    });
  } catch (error) {
    logger.error("Error in notification settings GET API:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  return upsertSettingHandler(request);
}

export async function PATCH(request: NextRequest) {
  return batchUpdateSettingsHandler(request);
}
