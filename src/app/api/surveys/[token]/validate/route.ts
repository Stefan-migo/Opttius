import { NextRequest, NextResponse } from "next/server";

import { createServiceRoleClient } from "@/utils/supabase/server";

/**
 * GET /api/surveys/[token]/validate
 * Public - validate token and return org name for display (no auth)
 */
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { data: invitation, error } = await supabase
      .from("survey_invitations")
      .select("id, used_at, expires_at, organization_id")
      .eq("token", token)
      .single();

    if (error || !invitation) {
      return NextResponse.json({ valid: false }, { status: 404 });
    }

    if (invitation.used_at) {
      return NextResponse.json({ valid: false, reason: "already_used" });
    }

    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < now) {
      return NextResponse.json({ valid: false, reason: "expired" });
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", invitation.organization_id)
      .single();
    return NextResponse.json({
      valid: true,
      organization_name:
        (org as { name?: string } | null)?.name || "Nuestra Óptica",
    });
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
