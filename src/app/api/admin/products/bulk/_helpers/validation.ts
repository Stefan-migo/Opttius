/**
 * Bulk products API — Auth & input validation.
 *
 * @module app/api/admin/products/bulk/_helpers/validation
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";

export interface AuthResult {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: NonNullable<
    Awaited<ReturnType<Awaited<ReturnType<typeof createClient>>["auth"]["getUser"]>>["data"]["user"]
  >;
}

/**
 * Validates admin authentication and returns supabase client + user,
 * or a 401/403 NextResponse if unauthorized.
 */
export async function checkAdminAuth(
  _request: NextRequest,
): Promise<AuthResult | NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: isAdmin } = (await supabase.rpc("is_admin", {
    user_id: user.id,
  } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 },
    );
  }

  return { supabase, user };
}

/**
 * Validates the bulk request body (operation, product_ids).
 * Returns a 400 NextResponse on validation failure.
 */
export function validateBulkRequest(body: Record<string, unknown>): {
  operation: string;
  product_ids: string[];
  updates: Record<string, unknown>;
} | NextResponse {
  const { operation, product_ids, updates } = body as {
    operation?: string;
    product_ids?: unknown;
    updates?: Record<string, unknown>;
  };

  if (!Array.isArray(product_ids) || product_ids.length === 0) {
    return NextResponse.json(
      { error: "Product IDs are required" },
      { status: 400 },
    );
  }

  return { operation: operation ?? "", product_ids, updates: updates ?? {} };
}
