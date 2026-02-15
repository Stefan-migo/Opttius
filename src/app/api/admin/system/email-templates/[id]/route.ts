import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let query = supabase
      .from("system_email_templates")
      .select("*")
      .eq("id", params.id);

    // Apply tenant isolation
    if (adminUser.role !== "super_admin") {
      const orgId = adminUser.organization_id;
      if (orgId) {
        query = query.or(`organization_id.eq.${orgId},organization_id.is.null`);
      } else {
        query = query.is("organization_id", null);
      }
    }

    const { data: template, error } = await query.single();

    if (error) {
      logger.error("Error fetching email template", {
        error,
        templateId: params.id,
      });
      return NextResponse.json(
        {
          error: "Failed to fetch email template",
        },
        { status: 500 },
      );
    }

    if (!template) {
      return NextResponse.json(
        {
          error: "Template not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    logger.error("Error in email template API", {
      error,
      templateId: params.id,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const { name, subject, content, is_active, variables } = body;

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if user owns the template OR is super admin
    const { data: existingTemplate } = await supabase
      .from("system_email_templates")
      .select("organization_id, is_system")
      .eq("id", params.id)
      .single();

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    const canUpdate =
      adminUser.role === "super_admin" ||
      existingTemplate.organization_id === adminUser.organization_id ||
      (existingTemplate.organization_id === null &&
        !existingTemplate.is_system);

    if (!canUpdate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Organizations cannot update system-level templates (is_system = true)
    if (adminUser.role !== "super_admin" && existingTemplate.is_system) {
      return NextResponse.json(
        {
          error: "Cannot modify system templates. Create a custom one instead.",
        },
        { status: 403 },
      );
    }

    // Build update object
    const updateData: {
      name?: string;
      type?: string;
      subject?: string;
      content?: string;
      variables?: Record<string, unknown>;
      is_active?: boolean;
      updated_at?: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (subject !== undefined) updateData.subject = subject;
    if (content !== undefined) updateData.content = content;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (variables !== undefined)
      updateData.variables = Array.isArray(variables)
        ? variables
        : JSON.parse(variables || "[]");

    const { data: template, error } = await supabase
      .from("system_email_templates")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      logger.error("Error updating email template", {
        error,
        templateId: params.id,
      });
      return NextResponse.json(
        {
          error: "Failed to update email template",
          details: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    logger.error("Error in update email template API", {
      error,
      templateId: params.id,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check ownership and system flag
    const { data: existingTemplate } = await supabase
      .from("system_email_templates")
      .select("organization_id, is_system")
      .eq("id", params.id)
      .single();

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    if (
      adminUser.role !== "super_admin" &&
      (existingTemplate.organization_id !== adminUser.organization_id ||
        existingTemplate.is_system)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("system_email_templates")
      .delete()
      .eq("id", params.id);

    if (error) {
      logger.error("Error deleting email template", {
        error,
        templateId: params.id,
      });
      return NextResponse.json(
        {
          error: "Failed to delete email template",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    logger.error("Error in delete email template API", {
      error,
      templateId: params.id,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
