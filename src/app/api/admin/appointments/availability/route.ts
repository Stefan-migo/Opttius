import { NextRequest, NextResponse } from "next/server";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";
import type {
  GetAvailableTimeSlotsParams,
  GetAvailableTimeSlotsResult,
  IsAdminParams,
  IsAdminResult,
  TimeSlot,
} from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get("date");
    const duration = parseInt(searchParams.get("duration") || "30");
    const staffId = searchParams.get("staff_id");

    if (!date) {
      return NextResponse.json(
        { error: "Date parameter is required" },
        { status: 400 },
      );
    }

    // Get available time slots
    logger.debug("Fetching availability for:", {
      date,
      duration,
      staffId,
      branchId: branchContext.branchId,
    });

    const { data: slots, error } = (await supabaseServiceRole.rpc(
      "get_available_time_slots",
      {
        p_date: date,
        p_duration_minutes: duration,
        p_staff_id: staffId || null,
        p_branch_id: branchContext.branchId || null,
      } as GetAvailableTimeSlotsParams,
    )) as { data: GetAvailableTimeSlotsResult; error: Error | null };

    if (error) {
      logger.error("Error fetching available slots:", {
        error,
        date,
        duration,
        staffId,
        branchId: branchContext.branchId,
      });
      return NextResponse.json(
        {
          error: "Failed to fetch available slots",
          details: error.message,
        },
        { status: 500 },
      );
    }

    logger.debug("Available slots returned:", {
      count: slots?.length || 0,
      date,
      duration,
    });

    if (!slots || slots.length === 0) {
      logger.warn("No slots returned from RPC function", {
        date,
        duration,
        staffId,
        branchId: branchContext.branchId,
      });
      return NextResponse.json({
        date,
        duration,
        slots: [],
      });
    }

    // Ensure slots are properly formatted
    const formattedSlots = (slots || [])
      .map((slot: TimeSlot) => {
        let timeSlot = "";

        // Handle different TIME formats from PostgreSQL
        if (typeof slot.time_slot === "string") {
          timeSlot = slot.time_slot;
        } else if (slot.time_slot) {
          // If it's a TIME object, convert to string
          const timeValue = slot.time_slot as unknown;
          if (
            typeof timeValue === "object" &&
            timeValue !== null &&
            "hours" in timeValue &&
            "minutes" in timeValue
          ) {
            timeSlot = `${String(timeValue.hours).padStart(2, "0")}:${String(timeValue.minutes).padStart(2, "0")}`;
          } else {
            timeSlot = String(timeValue);
          }
        }

        // Format time to HH:MM (remove seconds if present)
        if (timeSlot.includes(":")) {
          const parts = timeSlot.split(":");
          timeSlot = `${parts[0]}:${parts[1]}`;
        }

        // Handle boolean availability (PostgreSQL returns 't'/'f' as strings sometimes)
        let isAvailable = true;
        if (typeof slot.available === "boolean") {
          isAvailable = slot.available;
        } else if (typeof slot.available === "string") {
          isAvailable = slot.available === "t" || slot.available === "true";
        } else if (slot.available !== undefined && slot.available !== null) {
          isAvailable = Boolean(slot.available);
        }

        return {
          time_slot: timeSlot,
          available: isAvailable,
        };
      })
      .filter((slot) => slot.time_slot); // Filter out empty time slots

    logger.debug("Formatted slots:", {
      sample: formattedSlots.slice(0, 5),
      total: formattedSlots.length,
    });

    return NextResponse.json({
      date,
      duration,
      slots: formattedSlots,
    });
  } catch (error) {
    logger.error("Error in availability API:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
