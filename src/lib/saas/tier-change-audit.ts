/**
 * Tier change audit - records tier changes for billing and support
 *
 * @module tier-change-audit
 */

import { createServiceRoleClient } from "@/utils/supabase/service-role";

export type TierChangeSource =
  | "root"
  | "org_user"
  | "checkout"
  | "scheduled_job";

export interface TierChangeAuditParams {
  organizationId: string;
  fromTier: string;
  toTier: string;
  changedByUserId?: string | null;
  source: TierChangeSource;
}

/**
 * Record a tier change in the audit table.
 * Uses service role to bypass RLS (audit is append-only from API).
 */
export async function recordTierChange(
  params: TierChangeAuditParams,
): Promise<void> {
  const supabase = createServiceRoleClient();

  await supabase.from("tier_change_audit").insert({
    organization_id: params.organizationId,
    from_tier: params.fromTier,
    to_tier: params.toTier,
    changed_by_user_id: params.changedByUserId ?? null,
    source: params.source,
  });
}
