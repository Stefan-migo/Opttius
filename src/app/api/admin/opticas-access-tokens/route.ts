/**
 * POST /api/admin/opticas-access-tokens - Create token
 * GET /api/admin/opticas-access-tokens - List active tokens
 *
 * Root only. Tokens for /acceso-opticas?token=XXX
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import { AuthorizationError } from "@/lib/api/errors";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

/** Generate token: opticas_ + 48 hex chars */
function generateToken(): string {
  return `opticas_${randomBytes(24).toString("hex")}`;
}

/**
 * POST - Create new token
 * Body: { expires_in_days?: number, label?: string } (default 90 days)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireRoot(request);
    const supabase = createServiceRoleClient();

    let body: { expires_in_days?: number; label?: string } = {};
    try {
      body = await request.json();
    } catch {
      // empty body ok
    }

    const expiresInDays = body.expires_in_days ?? 90;
    const label = body.label ?? null;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const token = generateToken();

    const { data, error } = await supabase
      .from("opticas_access_tokens")
      .insert({
        token,
        expires_at: expiresAt.toISOString(),
        created_by: userId,
        label,
      })
      .select("id, token, expires_at")
      .single();

    if (error) {
      logger.error("Error creating opticas access token", error);
      return NextResponse.json(
        { error: "Error al crear token", details: error.message },
        { status: 500 },
      );
    }

    const origin =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "";
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const baseUrl = `${protocol}://${origin}`;
    const url = `${baseUrl}/acceso-opticas?token=${token}`;

    logger.info("Opticas access token created", { id: data.id });

    return NextResponse.json({
      id: data.id,
      token,
      url,
      expires_at: data.expires_at,
    });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    logger.error("Error in POST opticas-access-tokens", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

/**
 * GET - List active (non-expired) tokens
 */
export async function GET(request: NextRequest) {
  try {
    await requireRoot(request);
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("opticas_access_tokens")
      .select("id, token, expires_at, label, created_at")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Error listing opticas access tokens", error);
      return NextResponse.json(
        { error: "Error al listar tokens", details: error.message },
        { status: 500 },
      );
    }

    const tokens = (data ?? []).map((row) => ({
      id: row.id,
      token_preview: `${row.token.slice(0, 8)}...`,
      expires_at: row.expires_at,
      label: row.label,
      created_at: row.created_at,
    }));

    return NextResponse.json({ tokens });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    logger.error("Error in GET opticas-access-tokens", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
