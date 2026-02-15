import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "";
    const active_only = searchParams.get("active_only") === "true";
    const category = searchParams.get("category") || "organization";

    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (!adminUser) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const isGlobalAdmin =
      adminUser.role === "root" ||
      adminUser.role === "dev" ||
      adminUser.role === "super_admin";

    // Build the query for system email templates
    let query = supabase.from("system_email_templates").select(`
        id,
        name,
        type,
        subject,
        content,
        variables,
        is_active,
        is_system,
        category,
        organization_id,
        usage_count,
        created_by,
        created_at,
        updated_at
      `);

    // Multi-tenant filtering:
    // 1. If global admin (root/dev/super_admin), they can see everything or filter by category
    // 2. If organization admin, they see: system templates (org_id is null AND category='organization')
    //    OR their own templates.
    if (isGlobalAdmin) {
      if (category && category !== "all") {
        query = query.eq("category", category);
      }
    } else {
      // Organization admin
      const orgId = adminUser.organization_id;
      if (orgId) {
        query = query.or(
          `organization_id.eq.${orgId},and(organization_id.is.null,category.eq.organization)`,
        );
      } else {
        query = query
          .is("organization_id", null)
          .eq("category", "organization");
      }
    }

    // Apply filters
    if (active_only) {
      query = query.eq("is_active", true);
    }

    if (type && type !== "all") {
      query = query.eq("type", type);
    }

    // Order by organization_id (to put custom ones first in list) then type
    const { data: templates, error } = await query
      .order("organization_id", { ascending: false, nullsFirst: false })
      .order("type", { ascending: true });

    if (error) {
      logger.error("Error fetching email templates", { error });
      return NextResponse.json(
        { error: "Failed to fetch email templates" },
        { status: 500 },
      );
    }

    return NextResponse.json({ templates: templates || [] });
  } catch (error) {
    logger.error("Error in email templates API", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      type,
      subject,
      content,
      variables = [],
      is_active = true,
    } = body;

    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (!adminUser) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Validate input
    if (!name || !type || !subject || !content) {
      return NextResponse.json(
        {
          error: "Name, type, subject, and content are required",
        },
        { status: 400 },
      );
    }

    const validTypes = [
      "order_confirmation",
      "order_shipped",
      "order_delivered",
      "password_reset",
      "account_welcome",
      "appointment_confirmation",
      "appointment_reminder",
      "prescription_ready",
      "quote_sent",
      "work_order_ready",
      "low_stock_alert",
      "payment_success",
      "payment_failed",
      "marketing",
      "custom",
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid template type" },
        { status: 400 },
      );
    }

    // Create the template
    const { data: template, error: templateError } = await supabase
      .from("system_email_templates")
      .insert({
        name,
        type,
        subject,
        content,
        variables: JSON.stringify(variables),
        is_active,
        is_system: false,
        organization_id: adminUser.organization_id,
        category: "organization",
        usage_count: 0,
        created_by: user.id,
      })
      .select()
      .single();

    if (templateError) {
      logger.error("Error creating email template", { error: templateError });
      return NextResponse.json(
        { error: "Failed to create email template" },
        { status: 500 },
      );
    }

    // Log admin activity
    await supabase.rpc("log_admin_activity", {
      action: "create_email_template",
      resource_type: "email_template",
      resource_id: template.id,
      details: { template_name: name, template_type: type },
    });

    return NextResponse.json({ template });
  } catch (error) {
    logger.error("Error in create email template API", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
