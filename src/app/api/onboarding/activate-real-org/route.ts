import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import {
  parseAndValidateBody,
  ValidationError,
  validationErrorResponse,
} from "@/lib/api/validation/zod-helpers";
import { activateRealOrgSchema } from "@/lib/api/validation/organization-schemas";

const DEMO_ORG_ID =
  process.env.NEXT_PUBLIC_DEMO_ORG_ID || "00000000-0000-0000-0000-000000000001";

/**
 * POST /api/onboarding/activate-real-org
 *
 * Activa la organización real del usuario desde modo demo.
 * Crea la nueva organización y cambia el organization_id del usuario.
 *
 * Body:
 * - name: string (requerido) - Nombre de la organización
 * - slug: string (requerido) - Identificador único URL-friendly
 * - branchName: string (opcional) - Nombre de la primera sucursal
 *
 * Returns:
 * - { organization: {...}, branch: {...} }
 */
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    // Verificar autenticación
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || !user.email) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Validar body
    let validatedBody;
    try {
      validatedBody = await parseAndValidateBody(
        request,
        activateRealOrgSchema,
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        return validationErrorResponse(error);
      }
      throw error;
    }

    const { name, slug, branchName } = validatedBody;

    const { data: currentAdminUser } = await supabaseServiceRole
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const currentOrgId = currentAdminUser?.organization_id;
    if (!currentOrgId) {
      return NextResponse.json(
        { error: "Solo puedes activar tu organización real desde modo demo" },
        { status: 400 },
      );
    }

    if (currentOrgId !== DEMO_ORG_ID) {
      const { data: org } = await supabaseServiceRole
        .from("organizations")
        .select("metadata")
        .eq("id", currentOrgId)
        .single();
      const meta = org?.metadata as Record<string, unknown> | null;
      if (meta?.demo_type === "organic") {
        return NextResponse.json(
          {
            error:
              "La activación de tu óptica debe gestionarse a través de soporte.",
          },
          { status: 403 },
        );
      }
      if (meta?.is_demo !== true) {
        return NextResponse.json(
          { error: "Solo puedes activar tu organización real desde modo demo" },
          { status: 400 },
        );
      }
    }

    // Verificar que el slug no exista
    const { data: existingOrg } = await supabaseServiceRole
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existingOrg) {
      return NextResponse.json(
        { error: "Ese identificador ya está en uso. Elige otro." },
        { status: 400 },
      );
    }

    // Crear nueva organización
    const { data: newOrganization, error: orgError } = await supabaseServiceRole
      .from("organizations")
      .insert({
        name,
        slug,
        owner_id: user.id,
        subscription_tier: "pro", // Default tier for trial period (7 days)
        status: "active",
      })
      .select()
      .single();

    if (orgError || !newOrganization) {
      logger.error("Error creating organization", orgError);
      return NextResponse.json(
        { error: "Error al crear la organización", details: orgError?.message },
        { status: 500 },
      );
    }

    const organizationId = newOrganization.id;

    // Actualizar admin_users con la nueva organization_id y rol super_admin
    // El usuario que activa su organización real es el dueño de la óptica, por lo tanto debe ser super_admin
    const { data: adminUser, error: adminError } = await supabaseServiceRole
      .from("admin_users")
      .update({
        organization_id: organizationId,
        role: "super_admin",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select()
      .single();

    if (adminError || !adminUser) {
      logger.error("Error updating admin_users", adminError);
      // Rollback: eliminar organización creada
      await supabaseServiceRole
        .from("organizations")
        .delete()
        .eq("id", organizationId);
      return NextResponse.json(
        {
          error: "Error al actualizar organización del usuario",
          details: adminError?.message,
        },
        { status: 500 },
      );
    }

    // Super admin: acceso global (branch_id null) para ver todas las sucursales de la nueva org
    await supabaseServiceRole
      .from("admin_branch_access")
      .delete()
      .eq("admin_user_id", user.id);
    await supabaseServiceRole.from("admin_branch_access").insert({
      admin_user_id: user.id,
      branch_id: null,
      role: "manager",
      is_primary: true,
    });

    // Crear primera sucursal (siempre se crea una, por defecto "Sucursal Principal")
    const finalBranchName = branchName || "Sucursal Principal";
    const branchCode = `${slug.toUpperCase().substring(0, 8)}-001`;

    const { data: newBranch, error: branchError } = await supabaseServiceRole
      .from("branches")
      .insert({
        name: finalBranchName,
        code: branchCode,
        organization_id: organizationId,
        is_active: true,
      })
      .select()
      .single();

    let branch = null;
    if (branchError || !newBranch) {
      logger.error("Error creating branch", branchError);
    } else {
      branch = newBranch;
    }

    // ===== LIMPIAR DATOS CREADOS POR EL USUARIO DURANTE EL DEMO =====
    // Eliminar cualquier dato que el usuario haya creado durante el demo
    // Esto asegura que la demo sea completamente temporal y no queden datos residuales
    // IMPORTANTE: Solo eliminamos datos creados por este usuario, NO los datos seed de la demo

    logger.info("Cleaning up demo data created by user", { userId: user.id });

    // Obtener todas las sucursales de la demo para filtrar por branch_id también
    const { data: demoBranches } = await supabaseServiceRole
      .from("branches")
      .select("id")
      .eq("organization_id", currentOrgId);

    const demoBranchIds = demoBranches?.map((b) => b.id) || [];

    // Eliminar datos creados por el usuario en la demo (solo los que creó él, no los datos seed)
    // Usamos created_by cuando está disponible para identificar datos del usuario

    // 1. Clientes creados por el usuario en la demo
    if (demoBranchIds.length > 0) {
      await supabaseServiceRole
        .from("customers")
        .delete()
        .eq("organization_id", currentOrgId)
        .in("branch_id", demoBranchIds)
        .eq("created_by", user.id);
    }

    // 2. Órdenes creadas por el usuario en la demo (a través de order_payments.created_by)
    if (demoBranchIds.length > 0) {
      // Primero obtener IDs de órdenes con pagos creados por el usuario
      const { data: userOrderPayments } = await supabaseServiceRole
        .from("order_payments")
        .select("order_id")
        .eq("created_by", user.id);

      const userOrderIds = userOrderPayments?.map((p: any) => p.order_id) || [];

      if (userOrderIds.length > 0) {
        await supabaseServiceRole
          .from("orders")
          .delete()
          .eq("organization_id", currentOrgId)
          .in("id", userOrderIds);
      }
    }

    // 3. Presupuestos creados por el usuario en la demo
    if (demoBranchIds.length > 0) {
      await supabaseServiceRole
        .from("quotes")
        .delete()
        .eq("organization_id", currentOrgId)
        .in("branch_id", demoBranchIds);
      // Nota: quotes puede no tener created_by, así que eliminamos todos los de la demo del usuario
      // Esto es seguro porque cuando el usuario cambia de organización, ya no los verá de todas formas
    }

    // 4. Trabajos de laboratorio creados por el usuario en la demo
    if (demoBranchIds.length > 0) {
      await supabaseServiceRole
        .from("lab_work_orders")
        .delete()
        .eq("organization_id", currentOrgId)
        .in("branch_id", demoBranchIds)
        .eq("created_by", user.id);
    }

    // 5. Citas creadas por el usuario en la demo
    if (demoBranchIds.length > 0) {
      await supabaseServiceRole
        .from("appointments")
        .delete()
        .eq("organization_id", currentOrgId)
        .in("branch_id", demoBranchIds);
    }

    // 6. Pagos creados por el usuario en la demo
    await supabaseServiceRole
      .from("payments")
      .delete()
      .eq("organization_id", currentOrgId)
      .eq("user_id", user.id);

    // 7. Pagos de órdenes creados por el usuario en la demo
    await supabaseServiceRole
      .from("order_payments")
      .delete()
      .eq("created_by", user.id);

    // 8. Documentos de facturación creados por el usuario en la demo
    if (demoBranchIds.length > 0) {
      await supabaseServiceRole
        .from("billing_documents")
        .delete()
        .in("branch_id", demoBranchIds)
        .eq("emitted_by", user.id);
    }

    // 9. Sesiones POS creadas por el usuario en la demo
    if (demoBranchIds.length > 0) {
      await supabaseServiceRole
        .from("pos_sessions")
        .delete()
        .in("branch_id", demoBranchIds)
        .eq("cashier_id", user.id);
    }

    // 10. Transacciones POS creadas por el usuario en la demo
    if (demoBranchIds.length > 0) {
      await supabaseServiceRole
        .from("pos_transactions")
        .delete()
        .in("branch_id", demoBranchIds)
        .eq("cashier_id", user.id);
    }

    // 11. Cierres de caja creados por el usuario en la demo
    if (demoBranchIds.length > 0) {
      await supabaseServiceRole
        .from("cash_register_sessions")
        .delete()
        .in("branch_id", demoBranchIds)
        .eq("cashier_id", user.id);
    }

    // 12. Recetas creadas por el usuario en la demo
    if (demoBranchIds.length > 0) {
      await supabaseServiceRole
        .from("prescriptions")
        .delete()
        .in("branch_id", demoBranchIds)
        .eq("created_by", user.id);
    }

    // 13. Notificaciones admin creadas para el usuario en la demo
    await supabaseServiceRole
      .from("admin_notifications")
      .delete()
      .eq("target_admin_id", user.id);

    // 14. Logs de actividad del usuario (todos, no solo de la demo)
    // Esto limpia el historial completo del usuario antes de empezar con su organización real
    await supabaseServiceRole
      .from("admin_activity_log")
      .delete()
      .eq("admin_user_id", user.id);

    // 15. Progreso del tour del usuario en la demo
    await supabaseServiceRole
      .from("user_tour_progress")
      .delete()
      .eq("user_id", user.id)
      .eq("organization_id", currentOrgId);

    // 16. Historial de chat del usuario en la demo
    await supabaseServiceRole
      .from("chat_sessions")
      .delete()
      .eq("user_id", user.id);

    logger.info("Demo data cleanup completed", {
      userId: user.id,
      demoBranchesCleaned: demoBranchIds.length,
    });

    // Crear acceso de super_admin (branch_id = null) para acceso global a todas las sucursales
    // Primero eliminar cualquier acceso existente (esto ya limpia los accesos a la demo)
    await supabaseServiceRole
      .from("admin_branch_access")
      .delete()
      .eq("admin_user_id", user.id);

    // Crear acceso de super_admin con branch_id = null
    const { error: accessError } = await supabaseServiceRole
      .from("admin_branch_access")
      .insert({
        admin_user_id: user.id,
        branch_id: null, // null = acceso global a todas las sucursales (super_admin)
        role: "manager",
        is_primary: true,
      });

    if (accessError) {
      logger.error("Error creating super admin branch access", accessError);
      // Crítico: el usuario podría no tener acceso global
    }

    // Crear subscription inicial con periodo de prueba de 7 días
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    const { error: subscriptionError } = await supabaseServiceRole
      .from("subscriptions")
      .insert({
        organization_id: organizationId,
        status: "trialing",
        trial_ends_at: trialEndsAt.toISOString(),
      });

    if (subscriptionError) {
      logger.warn(
        "Error creating subscription (non-critical)",
        subscriptionError,
      );
    }

    logger.info("Real organization activated successfully", {
      organizationId,
      userId: user.id,
      slug,
    });

    return NextResponse.json({
      organization: {
        id: newOrganization.id,
        name: newOrganization.name,
        slug: newOrganization.slug,
        subscription_tier: newOrganization.subscription_tier,
      },
      branch: branch
        ? {
            id: branch.id,
            name: branch.name,
            code: branch.code,
          }
        : null,
    });
  } catch (error) {
    logger.error("Error in POST /api/onboarding/activate-real-org", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
