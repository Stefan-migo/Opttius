import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import { AuthorizationError } from "@/lib/api/errors";
import { updateSaasSupportTemplateSchema } from "@/lib/api/validation/zod-schemas";
import { parseAndValidateBody } from "@/lib/api/validation/zod-helpers";

/**
 * PATCH /api/admin/saas-management/support/templates/[id]
 * Actualizar template (solo root/dev)
 */
export const dynamic = "force-dynamic";
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    // Validar body
    const body = await parseAndValidateBody(
      request,
      updateSaasSupportTemplateSchema,
    );

    // Preparar actualización
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      updates.name = body.name;
    }

    if (body.subject !== undefined) {
      updates.subject = body.subject;
    }

    if (body.content !== undefined) {
      updates.content = body.content;
    }

    if (body.category !== undefined) {
      updates.category = body.category;
    }

    if (body.variables !== undefined) {
      updates.variables = body.variables;
    }

    if (body.is_active !== undefined) {
      updates.is_active = body.is_active;
    }

    // Actualizar template
    const { data: template, error: updateError } = await supabaseServiceRole
      .from("saas_support_templates")
      .update(updates)
      .eq("id", params.id)
      .select(
        `
        *,
        created_by_user:admin_users!saas_support_templates_created_by_fkey(id, email, role)
      `,
      )
      .single();

    if (updateError) {
      if (updateError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 },
        );
      }

      logger.error("Error updating SaaS support template", updateError);
      return NextResponse.json(
        { error: "Failed to update template" },
        { status: 500 },
      );
    }

    logger.info(`SaaS support template updated: ${template.id}`);

    return NextResponse.json({ template });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    logger.error(
      "Unexpected error in PATCH /api/admin/saas-management/support/templates/[id]",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
