/**
 * GET /api/admin/saas-management/whatsapp/conversations
 * Lista sesiones WhatsApp (root solo)
 * Query: ?organization_id=uuid&limit=50&offset=0
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
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("chat_sessions")
      .select(
        "id, title, metadata, organization_id, message_count, last_message_preview, updated_at, created_at",
      )
      .eq("metadata->>channel", "whatsapp")
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    const { data: sessions, error } = await query;

    if (error) {
      logger.error("WhatsApp conversations fetch error", {
        error: error.message,
      });
      return NextResponse.json(
        { error: "Error al obtener conversaciones" },
        { status: 500 },
      );
    }

    const orgIds = [
      ...new Set(
        (sessions || [])
          .map((s) => s.organization_id)
          .filter(Boolean) as string[],
      ),
    ];
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

    const sessionsWithOrg = (sessions || []).map((s) => ({
      ...s,
      wa_id: (s.metadata as Record<string, unknown>)?.wa_id ?? null,
      organization:
        s.organization_id && organizations[s.organization_id]
          ? organizations[s.organization_id]
          : null,
    }));

    return NextResponse.json({
      sessions: sessionsWithOrg,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("WhatsApp conversations error", err);
    return NextResponse.json(
      { error: err.message || "Error interno" },
      { status: 500 },
    );
  }
}
