import { NextRequest, NextResponse } from "next/server";

import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

export async function batchUpdateSettingsHandler(request: NextRequest) {
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
      ...updateData,
      organization_id: orgId,
      branch_id: brId,
      updated_at: new Date().toISOString(),
    };

    let data;
    let error;

    if (existing) {
      const res = await supabase
        .from("notification_settings")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();
      data = res.data;
      error = res.error;
    } else {
      const res = await supabase
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
      results.push({ notification_type, success: false, error: error.message });
    } else {
      results.push({ notification_type, success: true, setting: data });
    }
  }

  return NextResponse.json({ success: true, results });
}
