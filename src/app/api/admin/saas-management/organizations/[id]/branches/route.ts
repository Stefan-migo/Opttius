import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import { AuthorizationError } from "@/lib/api/errors";
import { createBranchSchema } from "@/lib/api/validation/zod-schemas";

/**
 * GET /api/admin/saas-management/organizations/[id]/branches
 * Listar todas las sucursales de una organización
 */
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const { id: organizationId } = params;

    // Verificar que la organización existe
    const { data: org } = await supabaseServiceRole
      .from("organizations")
      .select("id")
      .eq("id", organizationId)
      .single();

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Obtener sucursales
    const { data: branches, error } = await supabaseServiceRole
      .from("branches")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Error fetching branches", error);
      return NextResponse.json(
        { error: "Failed to fetch branches", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ branches: branches || [] });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error in branches API GET", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/saas-management/organizations/[id]/branches
 * Crear nueva sucursal para una organización
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireRoot(request);
    const supabaseServiceRole = createServiceRoleClient();

    const { id: organizationId } = params;
    const body = await request.json();
    const parseResult = createBranchSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return NextResponse.json(
        { error: firstError?.message || "Datos inválidos" },
        { status: 400 },
      );
    }
    const {
      name,
      code,
      address_line_1,
      address_line_2,
      city,
      state,
      postal_code,
      phone,
      email,
      is_active,
    } = parseResult.data;

    // Verificar que la organización existe
    const { data: org } = await supabaseServiceRole
      .from("organizations")
      .select("id")
      .eq("id", organizationId)
      .single();

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Generar código si no se proporciona
    let finalCode = code;
    if (!finalCode) {
      const { data: orgData } = await supabaseServiceRole
        .from("organizations")
        .select("slug")
        .eq("id", organizationId)
        .single();

      const { count } = await supabaseServiceRole
        .from("branches")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId);

      const branchNumber = (count || 0) + 1;
      finalCode = `${orgData?.slug?.toUpperCase().substring(0, 8) || "ORG"}-${String(branchNumber).padStart(3, "0")}`;
    }

    // Crear sucursal
    const { data: newBranch, error: createError } = await supabaseServiceRole
      .from("branches")
      .insert({
        name,
        code: finalCode,
        organization_id: organizationId,
        address_line_1: address_line_1 || null,
        address_line_2: address_line_2 || null,
        city: city || null,
        state: state || null,
        postal_code: postal_code || null,
        phone: phone || null,
        email: email || null,
        is_active,
      })
      .select()
      .single();

    if (createError) {
      logger.error("Error creating branch", createError);
      return NextResponse.json(
        {
          error: "Failed to create branch",
          details: createError.message,
        },
        { status: 500 },
      );
    }

    logger.info(
      `Branch created: ${newBranch.id} for organization ${organizationId}`,
    );

    return NextResponse.json({ branch: newBranch }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error in branches API POST", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
