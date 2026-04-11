/**
 * GET /api/admin/opticas-access-tokens/[id] - Get full URL for copy (root only)
 * DELETE /api/admin/opticas-access-tokens/[id] - Revoke token (root only)
 */
import { NextRequest, NextResponse } from "next/server";

import { AuthorizationError } from "@/lib/api/errors";
import { requireRoot } from "@/lib/api/root-middleware";
import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const dynamic = "force-dynamic";

/** GET - Return full URL for copy action (token not exposed in list) */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRoot(request);
    const { id } = await params;
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("opticas_access_tokens")
      .select("token, expires_at")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Token no encontrado" },
        { status: 404 },
      );
    }

    const expiresAt = new Date(data.expires_at);
    if (expiresAt <= new Date()) {
      return NextResponse.json({ error: "Token expirado" }, { status: 410 });
    }

    const origin =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "";
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const baseUrl = `${protocol}://${origin}`;
    const url = `${baseUrl}/acceso-opticas?token=${data.token}`;

    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    logger.error("Error in GET opticas-access-tokens/[id]", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRoot(request);
    const { id } = await params;
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from("opticas_access_tokens")
      .delete()
      .eq("id", id);

    if (error) {
      logger.error("Error revoking opticas access token", error);
      return NextResponse.json(
        { error: "Error al revocar token", details: error.message },
        { status: 500 },
      );
    }

    logger.info("Opticas access token revoked", { id });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    logger.error("Error in DELETE opticas-access-tokens", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
