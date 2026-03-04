/**
 * GET /api/admin/saas-management/whatsapp/conversations/[sessionId]/messages
 * Lista mensajes de una sesión WhatsApp (root solo)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRoot } from "@/lib/api/root-middleware";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { appLogger as logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    await requireRoot(request);
    const supabase = createServiceRoleClient();
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId es requerido" },
        { status: 400 },
      );
    }

    const { data: session, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("id, metadata")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 },
      );
    }

    const metadata = session.metadata as Record<string, unknown> | null;
    if (metadata?.channel !== "whatsapp") {
      return NextResponse.json(
        { error: "Sesión no es de WhatsApp" },
        { status: 400 },
      );
    }

    const { data: messages, error } = await supabase
      .from("chat_messages")
      .select("id, role, content, created_at, metadata")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      logger.error("WhatsApp messages fetch error", {
        error: error.message,
        sessionId,
      });
      return NextResponse.json(
        { error: "Error al obtener mensajes" },
        { status: 500 },
      );
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("WhatsApp messages error", err);
    return NextResponse.json(
      { error: err.message || "Error interno" },
      { status: 500 },
    );
  }
}
