import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import { AuthorizationError } from "@/lib/api/errors";
import { createOrganizationSchema } from "@/lib/api/validation/zod-schemas";
import { EmailNotificationService } from "@/lib/email/notifications";

/**
 * GET /api/admin/saas-management/organizations
 * Listar todas las organizaciones con filtros (solo root/dev)
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const { searchParams } = new URL(request.url);
    const tier = searchParams.get("tier");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // Construir query base (sin relaciones complejas para evitar errores)
    let query = supabaseServiceRole
      .from("organizations")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    // Aplicar filtros
    if (tier && tier !== "all") {
      query = query.eq("subscription_tier", tier);
    }

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    // Paginación
    query = query.range(offset, offset + limit - 1);

    const { data: organizations, error, count } = await query;

    if (error) {
      logger.error("Error fetching organizations", error);
      return NextResponse.json(
        { error: "Failed to fetch organizations" },
        { status: 500 },
      );
    }

    // Obtener estadísticas en batch (evita N+1)
    const orgIds = (organizations || []).map((o) => o.id);
    const ownerIds = (organizations || [])
      .map((o) => o.owner_id)
      .filter(Boolean) as string[];

    const [usersData, branchesData, ownersData, subscriptionsData] =
      await Promise.all([
        orgIds.length > 0
          ? supabaseServiceRole
              .from("admin_users")
              .select("organization_id")
              .in("organization_id", orgIds)
              .eq("is_active", true)
          : Promise.resolve({ data: [] }),
        orgIds.length > 0
          ? supabaseServiceRole
              .from("branches")
              .select("organization_id")
              .in("organization_id", orgIds)
          : Promise.resolve({ data: [] }),
        ownerIds.length > 0
          ? supabaseServiceRole
              .from("profiles")
              .select("id, email, first_name, last_name")
              .in("id", ownerIds)
          : Promise.resolve({ data: [] }),
        orgIds.length > 0
          ? supabaseServiceRole
              .from("subscriptions")
              .select(
                "id, organization_id, status, current_period_start, current_period_end, gateway_subscription_id",
              )
              .in("organization_id", orgIds)
              .eq("status", "active")
          : Promise.resolve({ data: [] }),
      ]);

    const userCountByOrg = (usersData.data || []).reduce(
      (acc: Record<string, number>, row: { organization_id: string }) => {
        acc[row.organization_id] = (acc[row.organization_id] || 0) + 1;
        return acc;
      },
      {},
    );
    const branchCountByOrg = (branchesData.data || []).reduce(
      (acc: Record<string, number>, row: { organization_id: string }) => {
        acc[row.organization_id] = (acc[row.organization_id] || 0) + 1;
        return acc;
      },
      {},
    );
    type OwnerRecord = {
      id: string;
      email?: string;
      first_name?: string;
      last_name?: string;
    };
    const ownerById = (ownersData.data || []).reduce(
      (acc: Record<string, OwnerRecord>, p: OwnerRecord) => {
        acc[p.id] = p;
        return acc;
      },
      {} as Record<string, OwnerRecord>,
    );
    type SubscriptionRecord = {
      id: string;
      organization_id: string;
      status?: string;
      current_period_start?: string;
      current_period_end?: string;
      gateway_subscription_id?: string | null;
    };
    const subscriptionByOrg = (subscriptionsData.data || []).reduce(
      (acc: Record<string, SubscriptionRecord>, s: SubscriptionRecord) => {
        acc[s.organization_id] = s;
        return acc;
      },
      {} as Record<string, SubscriptionRecord>,
    );

    const organizationsWithStats = (organizations || []).map((org) => ({
      ...org,
      owner: org.owner_id ? ownerById[org.owner_id] || null : null,
      subscription: subscriptionByOrg[org.id] || null,
      stats: {
        activeUsers: userCountByOrg[org.id] || 0,
        branches: branchCountByOrg[org.id] || 0,
      },
    }));

    return NextResponse.json({
      organizations: organizationsWithStats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error in organizations API GET", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/saas-management/organizations
 * Crear nueva organización (solo root/dev)
 */
export async function POST(request: NextRequest) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const body = await request.json();
    const parseResult = createOrganizationSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return NextResponse.json(
        { error: firstError?.message || "Datos inválidos" },
        { status: 400 },
      );
    }
    const { name, slug, owner_id, subscription_tier, status, metadata } =
      parseResult.data;

    // Verificar que el slug no existe
    const { data: existingOrg } = await supabaseServiceRole
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existingOrg) {
      return NextResponse.json(
        { error: "El slug ya está en uso" },
        { status: 400 },
      );
    }

    // Verificar que owner_id existe si se proporciona
    if (owner_id) {
      const { data: owner } = await supabaseServiceRole
        .from("profiles")
        .select("id")
        .eq("id", owner_id)
        .maybeSingle();

      if (!owner) {
        return NextResponse.json(
          { error: "El usuario owner no existe" },
          { status: 400 },
        );
      }
    }

    // Crear organización
    const { data: newOrg, error: createError } = await supabaseServiceRole
      .from("organizations")
      .insert({
        name,
        slug,
        owner_id: owner_id || null,
        subscription_tier,
        status,
        metadata,
      })
      .select()
      .single();

    if (createError) {
      logger.error("Error creating organization", createError);
      return NextResponse.json(
        {
          error: "Failed to create organization",
          details: createError.message,
        },
        { status: 500 },
      );
    }

    // Si hay owner_id, asignar organization_id al usuario
    if (owner_id) {
      const { error: updateError } = await supabaseServiceRole
        .from("admin_users")
        .update({ organization_id: newOrg.id })
        .eq("id", owner_id);

      if (updateError) {
        logger.warn("Error assigning organization to owner", updateError);
        // No hacer rollback, solo log warning
      }
    }

    logger.info(`Organization created: ${newOrg.id} (${slug})`);

    // Send SaaS Welcome Email (B2B)
    if (owner_id) {
      try {
        const { data: ownerProfile } = await supabaseServiceRole
          .from("profiles")
          .select("email, first_name")
          .eq("id", owner_id)
          .single();

        if (ownerProfile?.email) {
          await EmailNotificationService.sendSaaSNotification(
            "saas_welcome",
            ownerProfile.email,
            {
              customer_name: ownerProfile.first_name || "Admin",
              organization_name: name,
              dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin`,
            },
          );
        }
      } catch (emailError) {
        logger.error("Failed to send saas_welcome email", emailError);
        // Non-blocking
      }
    }

    return NextResponse.json({ organization: newOrg }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error in organizations API POST", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
