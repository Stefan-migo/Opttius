/**
 * Root Admin Client — restricted-privilege Supabase client for cross-org operations.
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY (same key, distinct intent label).
 * This client is for root/dev admin operations spanning multiple organizations.
 * It should NOT be used for single-tenant business logic — use per-org RLS instead.
 */

import { createClient } from "@supabase/supabase-js";

export function createRootAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured for root admin client");
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
