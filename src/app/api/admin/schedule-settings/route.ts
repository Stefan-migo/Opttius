import { NextRequest, NextResponse } from "next/server";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { createApiSuccessResponse } from "@/lib/api/response";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";

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

    // Get branch context
    const branchContext = await getBranchContext(request, user.id);

    if (!branchContext.organizationId) {
      return NextResponse.json(
        { error: "Organization ID not found" },
        { status: 404 },
      );
    }

    // Get schedule settings for current branch (or default if no branch selected)
    // RLS handles org security for the 'supabase' client
    let query = supabase
      .from("schedule_settings")
      .select("*")
      .eq("organization_id", branchContext.organizationId);

    if (branchContext.branchId) {
      query = query.eq("branch_id", branchContext.branchId);
    } else {
      query = query.is("branch_id", null);
    }

    const { data: settings, error } = await query.limit(1).maybeSingle();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      logger.error("Error fetching schedule settings:", {
        error,
        branchId: branchContext.branchId,
      });
      return NextResponse.json(
        {
          error: "Failed to fetch schedule settings",
          details: error.message,
        },
        { status: 500 },
      );
    }

    // Return default settings if none exist
    const defaultSettings = {
      slot_duration_minutes: 15,
      default_appointment_duration: 30,
      buffer_time_minutes: 0,
      working_hours: {
        monday: {
          enabled: true,
          start_time: "09:00",
          end_time: "18:00",
          lunch_start: null,
          lunch_end: null,
        },
        tuesday: {
          enabled: true,
          start_time: "09:00",
          end_time: "18:00",
          lunch_start: null,
          lunch_end: null,
        },
        wednesday: {
          enabled: true,
          start_time: "09:00",
          end_time: "18:00",
          lunch_start: null,
          lunch_end: null,
        },
        thursday: {
          enabled: true,
          start_time: "09:00",
          end_time: "18:00",
          lunch_start: null,
          lunch_end: null,
        },
        friday: {
          enabled: true,
          start_time: "09:00",
          end_time: "18:00",
          lunch_start: null,
          lunch_end: null,
        },
        saturday: {
          enabled: false,
          start_time: "09:00",
          end_time: "13:00",
          lunch_start: null,
          lunch_end: null,
        },
        sunday: {
          enabled: false,
          start_time: "09:00",
          end_time: "13:00",
          lunch_start: null,
          lunch_end: null,
        },
      },
      blocked_dates: [],
      min_advance_booking_hours: 2,
      max_advance_booking_days: 90,
      staff_specific_settings: {},
    };

    const settingsToReturn = settings ?? defaultSettings;
    return createApiSuccessResponse(settingsToReturn);
  } catch (error) {
    logger.error("Error in schedule settings API:", { error });
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

    // Get branch context
    const branchContext = await getBranchContext(request, user.id);

    if (!branchContext.organizationId) {
      return NextResponse.json(
        { error: "Organization ID not found" },
        { status: 404 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    // Check if settings exist for this branch/org
    // Use service role to bypass RLS, so MUST filter by organization_id
    let existingQuery = supabaseServiceRole
      .from("schedule_settings")
      .select("id")
      .eq("organization_id", branchContext.organizationId);

    if (branchContext.branchId) {
      existingQuery = existingQuery.eq("branch_id", branchContext.branchId);
    } else {
      existingQuery = existingQuery.is("branch_id", null);
    }

    const { data: existingSettings } = await existingQuery
      .limit(1)
      .maybeSingle();

    const updateData: unknown = {
      updated_at: new Date().toISOString(),
      // updated_by will be set only if user.id is valid (FK constraint may fail)
    };

    // Only add updated_by if we have a valid user id (FK constraint)
    if (user.id) {
      updateData.updated_by = user.id;
    }

    if (body.slot_duration_minutes !== undefined)
      updateData.slot_duration_minutes = body.slot_duration_minutes;
    if (body.default_appointment_duration !== undefined)
      updateData.default_appointment_duration =
        body.default_appointment_duration;
    if (body.buffer_time_minutes !== undefined)
      updateData.buffer_time_minutes = body.buffer_time_minutes;
    if (body.working_hours !== undefined)
      updateData.working_hours = body.working_hours;
    if (body.blocked_dates !== undefined)
      updateData.blocked_dates = body.blocked_dates;
    if (body.min_advance_booking_hours !== undefined)
      updateData.min_advance_booking_hours = body.min_advance_booking_hours;
    if (body.max_advance_booking_days !== undefined)
      updateData.max_advance_booking_days = body.max_advance_booking_days;
    if (body.staff_specific_settings !== undefined)
      updateData.staff_specific_settings = body.staff_specific_settings;

    let result;

    // 1. Update or Insert the specific record
    if (existingSettings) {
      // Update existing
      const { data, error } = await supabaseServiceRole
        .from("schedule_settings")
        .update({
          ...updateData,
          organization_id: branchContext.organizationId,
        })
        .eq("id", existingSettings.id)
        .select()
        .single();

      if (error) {
        logger.error("Error updating schedule settings:", {
          error,
          branchId: branchContext.branchId,
          settingsId: existingSettings.id,
        });
        return NextResponse.json(
          {
            error: "Failed to update schedule settings",
            details: error.message,
          },
          { status: 500 },
        );
      }
      result = data;
    } else {
      // Insert new
      const { data, error } = await supabaseServiceRole
        .from("schedule_settings")
        .insert({
          ...updateData,
          organization_id: branchContext.organizationId,
          branch_id: branchContext.branchId || null,
        })
        .select()
        .single();

      if (error) {
        logger.error("Error creating schedule settings:", {
          error,
          branchId: branchContext.branchId,
        });
        return NextResponse.json(
          {
            error: "Failed to create schedule settings",
            details: error.message,
          },
          { status: 500 },
        );
      }
      result = data;
    }

    // 2. If GLOBAL update by Super Admin, SYNC to all branches
    if (!branchContext.branchId && branchContext.isSuperAdmin) {
      logger.info("Syncing Global schedule settings to all branches", {
        organizationId: branchContext.organizationId,
      });

      const { data: branches } = await supabase
        .from("branches")
        .select("id")
        .eq("organization_id", branchContext.organizationId);

      if (branches && branches.length > 0) {
        for (const branch of branches) {
          await supabaseServiceRole.from("schedule_settings").upsert(
            {
              organization_id: branchContext.organizationId,
              branch_id: branch.id,
              ...updateData,
            },
            { onConflict: "organization_id,branch_id" },
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      settings: result,
    });
  } catch (error) {
    logger.error("Error in schedule settings PUT API:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
