import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import type {
  IsAdminParams,
  IsAdminResult,
  LogAdminActivityParams,
} from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category_id = searchParams.get("category_id") || "";
    const active_only = searchParams.get("active_only") === "true";

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

    // Build the query
    let query = supabase.from("support_templates").select(`
        *,
        category:support_categories(
          id,
          name
        ),
        creator:admin_users!created_by(
          id,
          email
        )
      `);

    // Apply filters
    if (active_only) {
      query = query.eq("is_active", true);
    }

    if (category_id && category_id !== "all") {
      query = query.eq("category_id", category_id);
    }

    // Order by usage count and name
    const { data: templates, error } = await query
      .order("usage_count", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      logger.error("Error fetching support templates", { error });
      return NextResponse.json(
        { error: "Failed to fetch support templates" },
        { status: 500 },
      );
    }

    return NextResponse.json({ templates: templates || [] });
  } catch (error) {
    logger.error("Error in support templates API", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, subject, content, category_id, variables = [] } = body;

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

    // Create the template
    const { data: template, error: templateError } = await supabase
      .from("support_templates")
      .insert({
        name,
        subject,
        content,
        category_id,
        variables: JSON.stringify(variables),
        created_by: user.id,
        is_active: true,
      })
      .select(
        `
        *,
        category:support_categories(id, name),
        creator:admin_users!created_by(id, email)
      `,
      )
      .single();

    if (templateError) {
      logger.error("Error creating support template", { error: templateError });
      return NextResponse.json(
        { error: "Failed to create support template" },
        { status: 500 },
      );
    }

    // Log admin activity
    const logParams: LogAdminActivityParams = {
      p_action: "create_support_template",
      p_resource_type: "support_template",
      p_resource_id: template.id,
      p_details: JSON.stringify({ template_name: name }),
    };
    await supabase.rpc("log_admin_activity", logParams);

    return NextResponse.json({ template });
  } catch (error) {
    logger.error("Error in create support template API", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Function to render template with variables
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { template_id, variables = {} } = body;

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

    // Get the template
    const { data: template, error: templateError } = await supabase
      .from("support_templates")
      .select("*")
      .eq("id", template_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    // Render template with variables
    let renderedSubject = template.subject || "";
    let renderedContent = template.content || "";

    // Replace variables in subject and content
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      renderedSubject = renderedSubject.replace(
        new RegExp(placeholder, "g"),
        String(value),
      );
      renderedContent = renderedContent.replace(
        new RegExp(placeholder, "g"),
        String(value),
      );
    });

    // Increment usage count
    await supabase
      .from("support_templates")
      .update({ usage_count: (template.usage_count || 0) + 1 })
      .eq("id", template_id);

    return NextResponse.json({
      rendered: {
        subject: renderedSubject,
        content: renderedContent,
        variables_used: Object.keys(variables),
      },
    });
  } catch (error) {
    logger.error("Error in render template API", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
