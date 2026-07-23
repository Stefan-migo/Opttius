/**
 * Webhook Client — restricted-privilege Supabase client for webhook handlers.
 *
 * Uses SUPABASE_WEBHOOK_KEY JWT linked to webhook_role.
 * Pattern matches src/utils/supabase/cron.ts.
 */

import { createClient } from "@supabase/supabase-js";

export function createWebhookClient() {
  const key = process.env.SUPABASE_WEBHOOK_KEY;
  if (!key) {
    throw new Error("SUPABASE_WEBHOOK_KEY is not configured");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    key,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
