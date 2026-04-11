import { NextRequest, NextResponse } from "next/server";

import { AuthorizationError } from "@/lib/api/errors";
import { requireRoot } from "@/lib/api/root-middleware";
import { parseAndValidateBody } from "@/lib/api/validation/zod-helpers";
import { createSaasSupportTemplateSchema } from "@/lib/api/validation/zod-schemas";
import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

/**
 * GET /api/admin/saas-management/support/templates
 * Listar templates de soporte SaaS (solo root/dev)
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const isActive = searchParams.get("is_active");

    // Construir query
    let query = supabaseServiceRole
      .from("saas_support_templates")
      .select(
        `
        *,
        created_by_user:admin_users!saas_support_templates_created_by_fkey(id, email, role)
      `,
      )
      .order("name", { ascending: true });

    // Aplicar filtros
    if (category) {
      query = query.eq("category", category);
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq("is_active", isActive === "true");
    }

    const { data: templates, error } = await query;

    if (error) {
      logger.error("Error fetching SaaS support templates", error);
      return NextResponse.json(
        { error: "Failed to fetch templates" },
        { status: 500 },
      );
    }

    return NextResponse.json({ templates: templates || [] });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    logger.error(
      "Unexpected error in GET /api/admin/saas-management/support/templates",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/saas-management/support/templates
 * Crear nuevo template (solo root/dev)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    // Validar body
    const body = await parseAndValidateBody(
      request,
      createSaasSupportTemplateSchema,
    );

    // Crear template
    const { data: template, error: templateError } = await supabaseServiceRole
      .from("saas_support_templates")
      .insert({
        name: body.name,
        subject: body.subject || null,
        content: body.content,
        category: body.category || null,
        variables: body.variables || [],
        is_active: body.is_active !== undefined ? body.is_active : true,
        created_by: userId,
      })
      .select(
        `
        *,
        created_by_user:admin_users!saas_support_templates_created_by_fkey(id, email, role)
      `,
      )
      .single();

    if (templateError) {
      logger.error("Error creating SaaS support template", templateError);
      return NextResponse.json(
        { error: "Failed to create template" },
        { status: 500 },
      );
    }

    logger.info(`SaaS support template created: ${template.id}`);

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    logger.error(
      "Unexpected error in POST /api/admin/saas-management/support/templates",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
