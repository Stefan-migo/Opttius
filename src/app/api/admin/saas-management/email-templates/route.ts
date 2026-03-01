import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import { requireRoot } from "@/lib/api/root-middleware";
import {
  ValidationError,
  mapPostgresError,
} from "@/lib/errors/comprehensive-handler";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/saas-management/email-templates
 * List SaaS email templates (root/dev only)
 * Uses service role to bypass RLS (root/dev can access; RLS only allows super_admin).
 */
export async function GET(request: NextRequest) {
  try {
    await requireRoot(request);

    const supabase = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "";
    const templateGroup = searchParams.get("template_group") || "";

    let query = supabase
      .from("system_email_templates")
      .select("*")
      .eq("category", "saas")
      .order("template_group", { ascending: true, nullsFirst: true })
      .order("type", { ascending: true });

    if (type && type !== "all") {
      query = query.eq("type", type);
    }
    if (templateGroup && templateGroup !== "all") {
      query = query.eq("template_group", templateGroup);
    }

    const { data: templates, error } = await query;

    if (error) {
      logger.error("Error fetching SaaS email templates", { error });
      return NextResponse.json(
        { error: "Failed to fetch email templates" },
        { status: 500 },
      );
    }

    return NextResponse.json({ templates: templates || [] });
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { statusCode?: number; message?: string };
      return NextResponse.json(
        { error: err.message || "Unauthorized" },
        { status: err.statusCode || 401 },
      );
    }
    logger.error("Error in SaaS email templates GET", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/saas-management/email-templates
 * Create SaaS email template (root/dev only)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireRoot(request);

    const body = await request.json();
    const {
      name,
      type,
      subject,
      content,
      variables = [],
      is_active = true,
    } = body;

    if (!name || !type || !subject || !content) {
      return NextResponse.json(
        { error: "Name, type, subject, and content are required" },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    const { data: template, error: templateError } = await supabase
      .from("system_email_templates")
      .insert({
        name,
        type,
        subject,
        content,
        variables: Array.isArray(variables) ? JSON.stringify(variables) : "[]",
        is_active: Boolean(is_active),
        is_system: false,
        category: "saas",
        created_by: userId,
      })
      .select()
      .single();

    if (templateError) {
      logger.error("Error creating SaaS email template", {
        error: templateError,
      });
      return NextResponse.json(
        { error: templateError.message || "Failed to create template" },
        { status: 500 },
      );
    }

    logger.info("SaaS email template created", {
      templateId: template.id,
      templateName: template.name,
      createdBy: userId,
    });

    return NextResponse.json({ template });
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const err = error as { statusCode?: number; message?: string };
      return NextResponse.json(
        { error: err.message || "Unauthorized" },
        { status: err.statusCode || 401 },
      );
    }
    logger.error("Error in SaaS email templates POST", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
