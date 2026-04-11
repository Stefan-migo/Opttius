import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";

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

    const supabaseServiceRole = createServiceRoleClient();

    const queries = [
      supabaseServiceRole
        .from("notification_settings")
        .select("*")
        .is("organization_id", null)
        .is("branch_id", null),
      ...(organizationId
        ? [
            supabaseServiceRole
              .from("notification_settings")
              .select("*")
              .eq("organization_id", organizationId)
              .is("branch_id", null),
            ...(branchId
              ? [
                  supabaseServiceRole
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
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

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

    const body = await request.json();
    const {
      notification_type,
      enabled,
      priority,
      notify_all_admins,
      notify_specific_roles,
      organization_id,
      branch_id,
    } = body;

    if (!notification_type) {
      return NextResponse.json(
        { error: "Notification type is required" },
        { status: 400 },
      );
    }

    const orgId = organization_id || null;
    const brId = branch_id || null;

    let query = supabaseServiceRole
      .from("notification_settings")
      .select("*")
      .eq("notification_type", notification_type);

    if (orgId) {
      query = query.eq("organization_id", orgId);
    } else {
      query = query.is("organization_id", null);
    }
    if (brId) {
      query = query.eq("branch_id", brId);
    } else {
      query = query.is("branch_id", null);
    }

    const { data: existing } = await query.maybeSingle();

    const payload = {
      notification_type,
      enabled: enabled !== undefined ? enabled : true,
      priority: priority || null,
      notify_all_admins:
        notify_all_admins !== undefined ? notify_all_admins : true,
      notify_specific_roles: notify_specific_roles || null,
      organization_id: orgId,
      branch_id: brId,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existing) {
      const { data, error } = await supabaseServiceRole
        .from("notification_settings")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();
      result = { data, error };
    } else {
      const { data, error } = await supabaseServiceRole
        .from("notification_settings")
        .insert({ ...payload, created_at: new Date().toISOString() })
        .select()
        .single();
      result = { data, error };
    }

    if (result.error) {
      logger.error("Error updating notification setting:", {
        error: result.error,
        notificationType: notification_type,
      });
      return NextResponse.json(
        { error: "Failed to update setting" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      setting: result.data,
    });
  } catch (error) {
    logger.error("Error in notification settings PUT API:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

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

    const body = await request.json();
    const { updates, organization_id, branch_id } = body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "Updates array is required" },
        { status: 400 },
      );
    }

    const orgId = organization_id || null;
    const brId = branch_id || null;

    const results = [];
    for (const update of updates) {
      const { notification_type, ...updateData } = update;

      if (!notification_type) {
        results.push({
          notification_type: null,
          success: false,
          error: "Notification type is required",
        });
        continue;
      }

      let query = supabaseServiceRole
        .from("notification_settings")
        .select("*")
        .eq("notification_type", notification_type);

      if (orgId) {
        query = query.eq("organization_id", orgId);
      } else {
        query = query.is("organization_id", null);
      }
      if (brId) {
        query = query.eq("branch_id", brId);
      } else {
        query = query.is("branch_id", null);
      }

      const { data: existing } = await query.maybeSingle();

      const payload = {
        ...updateData,
        organization_id: orgId,
        branch_id: brId,
        updated_at: new Date().toISOString(),
      };

      let data;
      let error;

      if (existing) {
        const res = await supabaseServiceRole
          .from("notification_settings")
          .update(payload)
          .eq("id", existing.id)
          .select()
          .single();
        data = res.data;
        error = res.error;
      } else {
        const res = await supabaseServiceRole
          .from("notification_settings")
          .insert({
            notification_type,
            ...payload,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
        data = res.data;
        error = res.error;
      }

      if (error) {
        results.push({
          notification_type,
          success: false,
          error: error.message,
        });
      } else {
        results.push({ notification_type, success: true, setting: data });
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    logger.error("Error in notification settings PATCH API:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
