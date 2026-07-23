/**
 * Shared helpers for POS settings route.
 *
 * Extracted from route.ts to reduce file size.
 */
import { NextRequest, NextResponse } from "next/server";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { rateLimitConfigs, withRateLimit } from "@/lib/rate-limiting";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

export interface AuthContext {
  user: { id: string };
  isSuperAdmin: boolean;
  branchId: string | null;
  organizationId: string | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
}

export async function withPOSAuth(
  request: NextRequest,
  errorPrefix: string,
): Promise<AuthContext | NextResponse> {
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

  const branchContext = await getBranchContext(request, user.id);

  if (!branchContext.isSuperAdmin && !branchContext.branchId) {
    return NextResponse.json(
      { error: `Debe seleccionar una sucursal para ${errorPrefix}` },
      { status: 400 },
    );
  }

  return {
    user,
    isSuperAdmin: branchContext.isSuperAdmin,
    branchId: branchContext.branchId,
    organizationId: branchContext.organizationId,
    supabase,
  };
}

export async function withRateLimitWrapper(
  request: NextRequest,
  configName: "general" | "modification",
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  return (await (withRateLimit(rateLimitConfigs[configName]) as unknown)(
    request,
    handler,
  )) as NextResponse;
}

export function getMergedValue(
  settings: Record<string, unknown> | null,
  orgSettings: Record<string, unknown> | null,
  field: string,
  defaultValue: unknown = null,
): unknown {
  if (settings && settings[field] !== null && settings[field] !== undefined) {
    return settings[field];
  }
  if (
    orgSettings &&
    orgSettings[field] !== null &&
    orgSettings[field] !== undefined
  ) {
    return orgSettings[field];
  }
  return defaultValue;
}
