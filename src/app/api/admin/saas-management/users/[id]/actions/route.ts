import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import { AuthorizationError } from "@/lib/api/errors";

/**
 * POST /api/admin/saas-management/users/[id]/actions
 * Acciones sobre usuarios: cambiar organización, activar/desactivar, resetear contraseña
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const { id } = params;
    const body = await request.json();
    const { action, value } = body;

    // Verificar que el usuario existe
    const { data: user } = await supabaseServiceRole
      .from("admin_users")
      .select("id, email, is_active, organization_id")
      .eq("id", id)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: any = {};

    switch (action) {
      case "activate":
        updateData.is_active = true;
        break;

      case "deactivate":
        updateData.is_active = false;
        break;

      case "change_organization":
        if (!value) {
          return NextResponse.json(
            { error: "organization_id es requerido" },
            { status: 400 },
          );
        }

        // Validar que la organización existe
        const { data: org } = await supabaseServiceRole
          .from("organizations")
          .select("id")
          .eq("id", value)
          .maybeSingle();

        if (!org) {
          return NextResponse.json(
            { error: "Organization not found" },
            { status: 400 },
          );
        }

        updateData.organization_id = value;
        break;

      case "reset_password":
        // Enviar email de reset de contraseña usando Supabase Auth Admin API
        const { error: resetError } =
          await supabaseServiceRole.auth.admin.generateLink({
            type: "recovery",
            email: user.email,
          });

        if (resetError) {
          logger.error("Error generating password reset link", resetError);
          return NextResponse.json(
            {
              error: "Failed to generate password reset link",
              details: resetError.message,
            },
            { status: 500 },
          );
        }

        return NextResponse.json({
          success: true,
          message: "Password reset link generated. Check user email.",
        });

      default:
        return NextResponse.json(
          { error: `Acción inválida: ${action}` },
          { status: 400 },
        );
    }

    // Aplicar actualización si hay cambios
    if (Object.keys(updateData).length > 0) {
      const { data: updatedUser, error: updateError } =
        await supabaseServiceRole
          .from("admin_users")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();

      if (updateError) {
        logger.error("Error performing action on user", updateError);
        return NextResponse.json(
          { error: "Failed to perform action", details: updateError.message },
          { status: 500 },
        );
      }

      logger.info(`User action performed: ${action} on ${id}`);

      return NextResponse.json({
        success: true,
        user: updatedUser,
        action,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error in user action", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
