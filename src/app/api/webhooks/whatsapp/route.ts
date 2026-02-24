/**
 * Webhook WhatsApp: GET (verificación Meta) + POST (mensajes entrantes)
 * Verifica firma X-Hub-Signature-256 en POST
 */

import { NextRequest, NextResponse } from "next/server";
import { WhatsAppSignatureValidator } from "@/lib/whatsapp/signature-validator";
import { handleWebhookPayload } from "@/lib/whatsapp/webhook-handler";
import { appLogger as logger } from "@/lib/logger";
import type { WhatsAppWebhookPayload } from "@/lib/whatsapp/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken) {
    logger.warn("WHATSAPP_VERIFY_TOKEN not configured");
    return new NextResponse("Server configuration error", { status: 500 });
  }

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge ?? "", {
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const signatureHeader = request.headers.get("x-hub-signature-256");

  const rawBody = await request.text();
  const validator = new WhatsAppSignatureValidator();
  const validation = validator.validate(rawBody, signatureHeader);

  if (!validation.isValid) {
    logger.warn("WhatsApp webhook: invalid signature", {
      error: validation.error,
    });
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  } catch {
    logger.warn("WhatsApp webhook: invalid JSON payload");
    return new NextResponse("Bad Request", { status: 400 });
  }

  try {
    await handleWebhookPayload(payload);
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    logger.error(
      "WhatsApp webhook handler error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
