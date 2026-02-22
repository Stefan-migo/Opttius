import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import { requireRoot } from "@/lib/api/root-middleware";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/saas-management/email-templates/[id]
 * Get single SaaS email template (root/dev only)
 * Uses service role to bypass RLS.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireRoot(request);
    const { id } = params;

    const supabase = createServiceRoleClient();

    const { data: template, error } = await supabase
      .from("system_email_templates")
      .select("*")
      .eq("id", id)
      .eq("category", "saas")
      .single();

    if (error || !template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { statusCode?: number; message?: string };
      return NextResponse.json(
        { error: err.message || "Unauthorized" },
        { status: err.statusCode || 401 },
      );
    }
    logger.error("Error fetching SaaS email template", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/saas-management/email-templates/[id]
 * Update SaaS email template (root/dev only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireRoot(request);
    const { id } = params;

    const body = await request.json();
    const { name, subject, content, is_active, variables } = body;

    const supabase = createServiceRoleClient();

    const { data: existingTemplate, error: fetchError } = await supabase
      .from("system_email_templates")
      .select("id, category")
      .eq("id", id)
      .eq("category", "saas")
      .single();

    if (fetchError || !existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = {
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
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error("Error updating SaaS email template", { error });
      return NextResponse.json(
        { error: error.message || "Failed to update template" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, template });
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { statusCode?: number; message?: string };
      return NextResponse.json(
        { error: err.message || "Unauthorized" },
        { status: err.statusCode || 401 },
      );
    }
    logger.error("Error in SaaS email template PUT", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/saas-management/email-templates/[id]
 * Delete SaaS email template (root/dev only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireRoot(request);
    const { id } = params;

    const supabase = createServiceRoleClient();

    const { data: existingTemplate, error: fetchError } = await supabase
      .from("system_email_templates")
      .select("id, category, is_system")
      .eq("id", id)
      .eq("category", "saas")
      .single();

    if (fetchError || !existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    if (existingTemplate.is_system) {
      return NextResponse.json(
        { error: "Cannot delete system templates" },
        { status: 403 },
      );
    }

    const { error } = await supabase
      .from("system_email_templates")
      .delete()
      .eq("id", id);

    if (error) {
      logger.error("Error deleting SaaS email template", { error });
      return NextResponse.json(
        { error: "Failed to delete template" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { statusCode?: number; message?: string };
      return NextResponse.json(
        { error: err.message || "Unauthorized" },
        { status: err.statusCode || 401 },
      );
    }
    logger.error("Error in SaaS email template DELETE", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
