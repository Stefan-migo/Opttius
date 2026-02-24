import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";

const ALLOWED_EVENTS = [
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.complained",
  "email.bounced",
  "email.opened",
  "email.clicked",
] as const;

interface ResendWebhookPayload {
  type: string;
  created_at: string;
  data: {
    email_id?: string;
    from?: string;
    to?: string[];
    subject?: string;
    template_id?: string;
    [key: string]: unknown;
  };
}

/**
 * POST /api/webhooks/resend
 * Receives Resend webhook events for email delivery, opens, clicks, bounces, etc.
 * Configure this URL in Resend Dashboard > Webhooks.
 * Responds 200 quickly to avoid retries; processes async.
 */
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ResendWebhookPayload;

    const eventType = body.type;
    if (!eventType || !ALLOWED_EVENTS.includes(eventType as (typeof ALLOWED_EVENTS)[number])) {
      logger.debug("Resend webhook: ignoring event type", { type: eventType });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const data = body.data || {};
    const emailId = data.email_id || "unknown";
    const recipient = Array.isArray(data.to)
      ? data.to[0] ?? null
      : typeof data.to === "string"
        ? data.to
        : null;
    const subject = data.subject || null;
    const templateId = data.template_id || null;

    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("email_send_events").insert({
      email_id: emailId,
      event_type: eventType,
      recipient,
      subject,
      template_id: templateId,
      metadata: data,
      created_at: body.created_at || new Date().toISOString(),
    });

    if (error) {
      logger.error("Resend webhook: failed to store event", {
        error: error.message,
        eventType,
        emailId,
      });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    logger.debug("Resend webhook: event stored", { eventType, emailId });
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    logger.error("Resend webhook error", err);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
