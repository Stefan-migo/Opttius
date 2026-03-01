/**
 * POST /api/admin/saas-management/demo-requests/[id]/approve
 * Approve a demo request: create user (invite) if needed, create demo org, send email (root only)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";
import { sendDemoApprovedEmail } from "@/lib/email/templates/saas";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireRoot(request);
    const { id } = await params;
    const supabase = createServiceRoleClient();

    const { data: req, error: fetchError } = await supabase
      .from("demo_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !req) {
      return NextResponse.json(
        { error: "Solicitud no encontrada" },
        { status: 404 },
      );
    }

    if (req.status !== "pending") {
      return NextResponse.json(
        { error: "La solicitud ya fue procesada" },
        { status: 400 },
      );
    }

    const email = (req.email as string).trim().toLowerCase();

    let targetUserId: string | null = null;
    let isExistingUser = false;

    const { data: existingId } = await supabase.rpc(
      "get_auth_user_id_by_email",
      {
        p_email: email,
      },
    );
    if (existingId) {
      targetUserId =
        typeof existingId === "string"
          ? existingId
          : ((existingId as { id?: string })?.id ?? null);
      isExistingUser = true;
    }
    if (!targetUserId) {
      const { data: inviteData, error: inviteError } =
        await supabase.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.opttius.cl"}/reset-password`,
        });
      if (inviteError) {
        logger.error("Error inviting user for demo", {
          error: inviteError,
          email,
        });
        return NextResponse.json(
          {
            error:
              "No se pudo crear el usuario. Verifica que el email sea válido.",
            details: inviteError.message,
          },
          { status: 500 },
        );
      }
      targetUserId = inviteData?.user?.id ?? null;
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: "No se pudo obtener el ID del usuario" },
        { status: 500 },
      );
    }

    const { data: orgId, error: rpcError } = await supabase.rpc(
      "create_demo_organization_for_user",
      { p_user_id: targetUserId, p_demo_type: "organic" },
    );

    if (rpcError) {
      logger.error("Error creating demo org for approved request", {
        error: rpcError,
        requestId: id,
      });
      return NextResponse.json(
        {
          error: "Error al crear la organización demo",
          details: rpcError.message,
        },
        { status: 500 },
      );
    }

    const now = new Date().toISOString();
    const demoExpires = new Date();
    demoExpires.setDate(demoExpires.getDate() + 7);

    await supabase
      .from("demo_requests")
      .update({
        status: "approved",
        funnel_stage: "approved",
        reviewed_at: now,
        reviewed_by: userId,
        organization_id: orgId,
        demo_started_at: now,
        demo_expires_at: demoExpires.toISOString(),
        last_contact_at: now,
      })
      .eq("id", id);

    logger.info("Demo request approved", {
      requestId: id,
      email,
      organizationId: orgId,
    });

    if (isExistingUser) {
      const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.opttius.cl"}/login`;
      const emailResult = await sendDemoApprovedEmail({
        email,
        fullName: (req.full_name as string) || null,
        loginUrl,
      });
      if (!emailResult.success) {
        logger.warn("Demo approved email failed to send", {
          email,
          error: emailResult.error,
        });
      }
    }

    return NextResponse.json({
      success: true,
      organizationId: orgId,
      message:
        "Demo aprobada. El usuario puede acceder con su email. Si era nuevo, recibirá un enlace de invitación.",
    });
  } catch (err) {
    if (err && typeof err === "object" && "statusCode" in err) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: (err as { statusCode: number }).statusCode },
      );
    }
    logger.error("Error in POST demo-requests approve", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
