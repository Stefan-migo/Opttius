import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

export async function upsertSettingHandler(request: NextRequest) {
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

  let query = supabase
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
    const { data, error } = await supabase
      .from("notification_settings")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    result = { data, error };
  } else {
    const { data, error } = await supabase
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

  return NextResponse.json({ success: true, setting: result.data });
}
