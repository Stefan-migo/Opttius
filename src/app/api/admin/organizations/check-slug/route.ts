import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import { organizationSlugSchema } from "@/lib/api/validation/organization-schemas";

/**
 * GET /api/admin/organizations/check-slug
 *
 * Verifica si un slug está disponible para usar en una nueva organización.
 *
 * Query params:
 * - slug: string (requerido) - El slug a verificar
 *
 * Returns:
 * - { available: boolean, slug: string }
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Obtener slug de query params
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "El parámetro 'slug' es requerido" },
        { status: 400 },
      );
    }

    // Validar formato del slug
    const validationResult = organizationSlugSchema.safeParse(slug);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          available: false,
          slug,
          error:
            validationResult.error.errors[0]?.message ||
            "Formato de slug inválido",
        },
        { status: 400 },
      );
    }

    const normalizedSlug = validationResult.data;

    // Verificar si el slug ya existe
    const { data: existingOrg, error: checkError } = await supabase
      .from("organizations")
      .select("id, slug")
      .eq("slug", normalizedSlug)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 = no rows returned (slug disponible)
      logger.error("Error checking slug availability", checkError);
      return NextResponse.json(
        { error: "Error al verificar disponibilidad del slug" },
        { status: 500 },
      );
    }

    const available = !existingOrg;

    return NextResponse.json({
      available,
      slug: normalizedSlug,
    });
  } catch (error) {
    logger.error("Error in check-slug endpoint", { error });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
