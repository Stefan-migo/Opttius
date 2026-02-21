import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import { AuthorizationError } from "@/lib/api/errors";
import { updateOrganizationSchema } from "@/lib/api/validation/zod-schemas";

/**
 * GET /api/admin/saas-management/organizations/[id]
 * Obtener detalles completos de una organización
 */
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const { id } = params;

    // Obtener organización (sin relaciones complejas para evitar errores)
    const { data: organization, error } = await supabaseServiceRole
      .from("organizations")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !organization) {
      logger.error("Error fetching organization", error);
      return NextResponse.json(
        { error: "Organization not found", details: error?.message },
        { status: 404 },
      );
    }

    // Obtener suscripción activa
    const { data: subscription } = await supabaseServiceRole
      .from("subscriptions")
      .select(
        "id, status, current_period_start, current_period_end, cancel_at, canceled_at, gateway_subscription_id, gateway_customer_id, created_at, updated_at",
      )
      .eq("organization_id", id)
      .eq("status", "active")
      .maybeSingle();

    // Obtener owner si existe
    let owner = null;
    if (organization.owner_id) {
      const { data: ownerProfile } = await supabaseServiceRole
        .from("profiles")
        .select("id, email, first_name, last_name, phone")
        .eq("id", organization.owner_id)
        .maybeSingle();

      if (ownerProfile) {
        owner = ownerProfile;
      }
    }

    // Obtener estadísticas
    const [usersResult, branchesResult, ordersResult, productsResult] =
      await Promise.all([
        supabaseServiceRole
          .from("admin_users")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", id),
        supabaseServiceRole
          .from("branches")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", id),
        supabaseServiceRole
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", id),
        supabaseServiceRole
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", id),
      ]);

    const stats = {
      totalUsers: usersResult.count || 0,
      activeUsers:
        (
          await supabaseServiceRole
            .from("admin_users")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", id)
            .eq("is_active", true)
        ).count || 0,
      branches: branchesResult.count || 0,
      orders: ordersResult.count || 0,
      products: productsResult.count || 0,
    };

    // Obtener usuarios recientes (sin relaciones complejas)
    const { data: recentUsersData } = await supabaseServiceRole
      .from("admin_users")
      .select("id, email, role, is_active, last_login, created_at")
      .eq("organization_id", id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Enriquecer usuarios recientes con perfiles
    const recentUsers = await Promise.all(
      (recentUsersData || []).map(async (user: any) => {
        const { data: profile } = await supabaseServiceRole
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", user.id)
          .maybeSingle();

        return {
          ...user,
          profiles: profile || null,
        };
      }),
    );

    // Obtener sucursales
    const { data: branches } = await supabaseServiceRole
      .from("branches")
      .select("*")
      .eq("organization_id", id)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      organization: {
        ...organization,
        subscription: subscription || null,
        owner: owner || null,
        stats,
        recentUsers: recentUsers || [],
        branches: branches || [],
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error fetching organization details", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/saas-management/organizations/[id]
 * Actualizar organización
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const { id } = params;
    const body = await request.json();
    const parseResult = updateOrganizationSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return NextResponse.json(
        { error: firstError?.message || "Datos inválidos" },
        { status: 400 },
      );
    }
    const { name, slug, owner_id, subscription_tier, status, metadata } =
      parseResult.data;

    // Verificar que la organización existe
    const { data: existingOrg } = await supabaseServiceRole
      .from("organizations")
      .select("id, slug")
      .eq("id", id)
      .single();

    if (!existingOrg) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Preparar updates
    const updates: any = {};

    if (name !== undefined) updates.name = name;
    if (slug !== undefined) {
      // Verificar que el slug no está en uso por otra organización
      if (slug !== existingOrg.slug) {
        const { data: slugExists } = await supabaseServiceRole
          .from("organizations")
          .select("id")
          .eq("slug", slug)
          .neq("id", id)
          .maybeSingle();

        if (slugExists) {
          return NextResponse.json(
            { error: "El slug ya está en uso" },
            { status: 400 },
          );
        }
      }

      updates.slug = slug;
    }
    if (owner_id !== undefined) updates.owner_id = owner_id;
    if (subscription_tier !== undefined)
      updates.subscription_tier = subscription_tier;
    if (status !== undefined) updates.status = status;
    if (metadata !== undefined) updates.metadata = metadata;

    // Actualizar
    const { data: updatedOrg, error: updateError } = await supabaseServiceRole
      .from("organizations")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      logger.error("Error updating organization", updateError);
      return NextResponse.json(
        {
          error: "Failed to update organization",
          details: updateError.message,
        },
        { status: 500 },
      );
    }

    logger.info(`Organization updated: ${id}`);

    return NextResponse.json({ organization: updatedOrg });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error updating organization", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/saas-management/organizations/[id]
 * Eliminar organización completamente (hard delete) con limpieza de todos los datos relacionados
 *
 * Body opcional: { confirm: true } - Requerido para confirmar eliminación
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const { id } = params;

    // Verificar que la organización existe
    const { data: organization, error: orgError } = await supabaseServiceRole
      .from("organizations")
      .select("id, name, slug")
      .eq("id", id)
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Verificar confirmación en el body (opcional pero recomendado)
    let body: { confirm?: boolean } = {};
    try {
      const bodyText = await request.text();
      if (bodyText) {
        body = JSON.parse(bodyText);
      }
    } catch {
      // Si no hay body o no es JSON válido, continuar sin confirmación
    }

    // Obtener estadísticas antes de eliminar para logging
    const [
      usersCount,
      branchesCount,
      ordersCount,
      productsCount,
      customersCount,
    ] = await Promise.all([
      supabaseServiceRole
        .from("admin_users")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", id),
      supabaseServiceRole
        .from("branches")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", id),
      supabaseServiceRole
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", id),
      supabaseServiceRole
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", id),
      supabaseServiceRole
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", id),
    ]);

    logger.info(`Deleting organization ${id} (${organization.name})`, {
      users: usersCount.count || 0,
      branches: branchesCount.count || 0,
      orders: ordersCount.count || 0,
      products: productsCount.count || 0,
      customers: customersCount.count || 0,
    });

    // Eliminar la organización
    // Esto activará CASCADE en todas las tablas relacionadas:
    // - subscriptions (ON DELETE CASCADE)
    // - branches (ON DELETE CASCADE) -> esto eliminará también:
    //   - product_branch_stock
    //   - admin_branch_access
    //   - pos_sessions
    //   - pos_transactions
    //   - cash_register_sessions
    //   - customers (que tienen branch_id)
    // - orders (ON DELETE CASCADE) -> esto eliminará también:
    //   - order_items
    //   - order_payments
    //   - billing_documents
    // - quotes (ON DELETE CASCADE)
    // - lab_work_orders (ON DELETE CASCADE)
    // - appointments (ON DELETE CASCADE)
    // - products (ON DELETE CASCADE) -> esto eliminará también:
    //   - product_variants
    //   - product_images
    //   - product_option_values
    // - customers (ON DELETE CASCADE) -> esto eliminará también:
    //   - prescriptions
    //   - appointments
    //   - quotes
    //   - lab_work_orders
    // - payments (ON DELETE CASCADE)
    // - contact_lens_families (ON DELETE CASCADE)
    // - contact_lens_price_matrices (ON DELETE CASCADE)
    // - lens_families (si tienen organization_id)
    // - lens_price_matrices (si tienen organization_id)
    // - ai_insights (ON DELETE CASCADE)
    // - user_tour_progress (ON DELETE CASCADE)

    // NOTA: admin_users NO se eliminarán automáticamente porque tienen ON DELETE SET NULL
    // Necesitamos limpiar manualmente los admin_users que pertenecen a esta organización
    // Primero, obtener todos los usuarios de esta organización (incluyendo el owner)
    const { data: orgUsers } = await supabaseServiceRole
      .from("admin_users")
      .select("id, email, role")
      .eq("organization_id", id);

    // Obtener también el owner_id de la organización si existe
    const { data: orgData } = await supabaseServiceRole
      .from("organizations")
      .select("owner_id")
      .eq("id", id)
      .single();

    const userIdsToDelete: string[] = [];

    if (orgUsers && orgUsers.length > 0) {
      const userIds = orgUsers.map((u) => u.id);
      userIdsToDelete.push(...userIds);

      // Eliminar admin_branch_access de estos usuarios
      await supabaseServiceRole
        .from("admin_branch_access")
        .delete()
        .in("admin_user_id", userIds);

      // Eliminar admin_users (esto activará CASCADE en admin_activity_log)
      await supabaseServiceRole.from("admin_users").delete().in("id", userIds);
    }

    // Verificar si el owner necesita ser eliminado de auth.users
    // Solo eliminamos el owner si no tiene otras organizaciones
    if (orgData?.owner_id && !userIdsToDelete.includes(orgData.owner_id)) {
      // Verificar si el owner tiene otras organizaciones
      const { data: otherOrgs } = await supabaseServiceRole
        .from("organizations")
        .select("id")
        .eq("owner_id", orgData.owner_id)
        .neq("id", id)
        .limit(1);

      // Solo eliminar si no tiene otras organizaciones
      if (!otherOrgs || otherOrgs.length === 0) {
        userIdsToDelete.push(orgData.owner_id);
        logger.info(
          `Owner ${orgData.owner_id} will be deleted (no other organizations)`,
        );
      } else {
        logger.info(
          `Owner ${orgData.owner_id} will NOT be deleted (has other organizations)`,
        );
      }
    }

    // Eliminar usuarios de auth.users (esto también eliminará profiles por CASCADE)
    // IMPORTANTE: Esto permite que el usuario se registre nuevamente en el futuro
    if (userIdsToDelete.length > 0) {
      logger.info(`Deleting ${userIdsToDelete.length} auth users`);
      for (const userId of userIdsToDelete) {
        try {
          const { error: deleteAuthError } =
            await supabaseServiceRole.auth.admin.deleteUser(userId);
          if (deleteAuthError) {
            logger.warn(
              `Failed to delete auth user ${userId}`,
              deleteAuthError,
            );
            // Continuar con otros usuarios aunque falle uno
          } else {
            logger.info(`Deleted auth user ${userId}`);
          }
        } catch (error) {
          logger.warn(`Error deleting auth user ${userId}`, error);
          // Continuar con otros usuarios aunque falle uno
        }
      }
    }

    // Ahora eliminar la organización (esto activará todos los CASCADE)
    const { error: deleteError } = await supabaseServiceRole
      .from("organizations")
      .delete()
      .eq("id", id);

    if (deleteError) {
      logger.error("Error deleting organization", deleteError);
      return NextResponse.json(
        {
          error: "Failed to delete organization",
          details: deleteError.message,
        },
        { status: 500 },
      );
    }

    logger.info(
      `Organization deleted successfully: ${id} (${organization.name})`,
    );

    return NextResponse.json({
      success: true,
      message:
        "Organización eliminada completamente junto con todos sus datos relacionados",
      deleted: {
        organization: organization.name,
        users: usersCount.count || 0,
        branches: branchesCount.count || 0,
        orders: ordersCount.count || 0,
        products: productsCount.count || 0,
        customers: customersCount.count || 0,
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error deleting organization", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
