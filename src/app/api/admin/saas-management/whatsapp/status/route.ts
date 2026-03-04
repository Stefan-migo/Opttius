/**
 * GET /api/admin/saas-management/whatsapp/status
 * Lista números WhatsApp conectados (root solo)
 * Query: ?organization_id=uuid (opcional, filtra por org)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireRoot(request);
    const supabase = createServiceRoleClient();

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organization_id");

    let query = supabase
      .from("whatsapp_phone_numbers")
      .select(
        "id, organization_id, phone_number_id, waba_id, display_phone_number, created_at",
      )
      .order("created_at", { ascending: false });

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    const { data: numbers, error } = await query;

    if (error) {
      logger.error("WhatsApp status fetch error", { error: error.message });
      return NextResponse.json(
        { error: "Error al obtener estado de WhatsApp" },
        { status: 500 },
      );
    }

    const orgIds = [...new Set((numbers || []).map((n) => n.organization_id))];
    let organizations: Record<string, { name: string; slug: string }> = {};

    if (orgIds.length > 0) {
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name, slug")
        .in("id", orgIds);
      organizations = (orgs || []).reduce(
        (acc, o) => {
          acc[o.id] = { name: o.name, slug: o.slug };
          return acc;
        },
        {} as Record<string, { name: string; slug: string }>,
      );
    }

    const numbersWithOrg = (numbers || []).map((n) => ({
      ...n,
      organization: organizations[n.organization_id] ?? null,
    }));

    return NextResponse.json({
      connected: numbersWithOrg.length > 0,
      numbers: numbersWithOrg,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("WhatsApp status error", err);
    return NextResponse.json(
      { error: err.message || "Error interno" },
      { status: 500 },
    );
  }
}
