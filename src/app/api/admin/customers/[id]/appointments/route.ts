import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { NotificationService } from "@/lib/notifications/notification-service";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";

// GET - Get all appointments for a customer
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const upcoming = searchParams.get("upcoming") === "true";

    let query = supabase.from("appointments").select("*").eq("customer_id", id);

    if (status) {
      query = query.eq("status", status);
    }

    if (upcoming) {
      query = query.gte(
        "appointment_date",
        new Date().toISOString().split("T")[0],
      );
    }

    const { data: appointments, error } = await query
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true });

    if (error) {
      logger.error("Error fetching appointments", error);
      return NextResponse.json(
        { error: "Failed to fetch appointments" },
        { status: 500 },
      );
    }

    return NextResponse.json({ appointments: appointments || [] });
  } catch (error) {
    logger.error("Error in appointments API GET", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST - Create a new appointment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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

    const body = await request.json();

    const { data: appointment, error } = await supabase
      .from("appointments")
      .insert({
        customer_id: id,
        appointment_date: body.appointment_date,
        appointment_time: body.appointment_time,
        duration_minutes: body.duration_minutes || 30,
        appointment_type: body.appointment_type || "consultation",
        status: body.status || "scheduled",
        assigned_to: body.assigned_to || null,
        notes: body.notes || null,
        reason: body.reason || null,
        outcome: body.outcome || null,
        follow_up_required: body.follow_up_required || false,
        follow_up_date: body.follow_up_date || null,
        prescription_id: body.prescription_id || null,
        order_id: body.order_id || null,
        created_by: user.id,
      })
      .select(
        `
        *,
        customer:profiles!appointments_customer_id_fkey(id, first_name, last_name, email, phone)
      `,
      )
      .single();

    if (error) {
      logger.error("Error creating appointment", error);
      return NextResponse.json(
        { error: "Failed to create appointment" },
        { status: 500 },
      );
    }

    // Create notification for new appointment (non-blocking)
    if (appointment) {
      const customerName = appointment.customer
        ? `${appointment.customer.first_name || ""} ${appointment.customer.last_name || ""}`.trim() ||
          appointment.customer.email ||
          "Cliente"
        : "Cliente";

      NotificationService.notifyNewAppointment(
        appointment.id,
        customerName,
        appointment.appointment_date,
        appointment.appointment_time,
        appointment.branch_id ?? undefined,
      ).catch((err) => logger.warn("Error creating notification", err));
    }

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    logger.error("Error in create appointment API", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
