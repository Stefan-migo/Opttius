/**
 * Cron Client — restricted-privilege Supabase client for scheduled jobs.
 *
 * Phase 1: wraps SERVICE_ROLE_KEY so the swap is isolated to one file.
 * Phase 2: replace with SUPABASE_CRON_KEY JWT linked to cron_role.
 */

import { createClient } from "@supabase/supabase-js";

export function createCronClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured for cron client");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
