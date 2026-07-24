/**
 * Search helpers for customer search route.
 * Extracted from route.ts to reduce file size. No behavioral changes.
 */
import {
  getBranchContext,
  getFieldOperationFromRequest,
} from "@/lib/api/branch-middleware";
import type { Database, SupabaseClient } from "@/types/supabase";
import { createServiceRoleClient } from "@/utils/supabase/server";

export async function resolveBranchContext(
  request: unknown,
  user: unknown,
  supabase: SupabaseClient<Database>,
) {
  const branchContext = await getBranchContext(request, user.id, supabase);
  const supabaseServiceRole = createServiceRoleClient();

  let orgBranchIds: string[] | null = null;
  if (
    !branchContext.branchId &&
    branchContext.isSuperAdmin &&
    branchContext.organizationId
  ) {
    const { data: branches } = await supabaseServiceRole
      .from("branches")
      .select("id")
      .eq("organization_id", branchContext.organizationId);
    orgBranchIds = branches?.map((b: unknown) => b.id) || [];
  }

  const fieldOperationId = getFieldOperationFromRequest(request);
  let operativoBranchId: string | null = null;
  if (fieldOperationId) {
    const { data: fo } = await supabaseServiceRole
      .from("field_operations")
      .select("branch_id")
      .eq("id", fieldOperationId)
      .single();
    operativoBranchId = (fo as unknown)?.branch_id ?? null;
  }

  return { branchContext, orgBranchIds, fieldOperationId, operativoBranchId };
}

export function buildSearchQuery(
  supabase: SupabaseClient<Database>,
  branchContext: unknown,
  orgBranchIds: string[] | null,
  fieldOperationId: string | null,
  operativoBranchId: string | null,
) {
  return () => {
    const q = supabase
      .from("customers")
      .select("id, first_name, last_name, email, phone, rut");
    const { branchId, isSuperAdmin, organizationId, accessibleBranches } =
      branchContext;
    if (fieldOperationId && operativoBranchId)
      return q
        .eq("branch_id", operativoBranchId)
        .eq("field_operation_id", fieldOperationId);
    if (branchId) return q.eq("branch_id", branchId);
    if (isSuperAdmin && orgBranchIds && orgBranchIds.length > 0)
      return q.in("branch_id", orgBranchIds);
    if (isSuperAdmin && organizationId)
      return q.eq("branch_id", "00000000-0000-0000-0000-000000000000");
    const primary =
      accessibleBranches.find((b: unknown) => b.isPrimary)?.id ||
      accessibleBranches[0]?.id;
    return q.eq("branch_id", primary || "00000000-0000-0000-0000-000000000000");
  };
}

export function getRpcBranchParams(
  branchContext: unknown,
  orgBranchIds: string[] | null,
  fieldOperationId: string | null,
  operativoBranchId: string | null,
) {
  let rpcBranchId: string | null = null;
  let rpcBranchIds: string[] | null = null;
  if (fieldOperationId && operativoBranchId) rpcBranchId = operativoBranchId;
  else if (branchContext.branchId) rpcBranchId = branchContext.branchId;
  else if (branchContext.isSuperAdmin && branchContext.organizationId)
    rpcBranchIds = orgBranchIds;
  else if (!branchContext.isSuperAdmin) rpcBranchIds = [];
  return { rpcBranchId, rpcBranchIds };
}

export function buildOrQuery(
  searchTerm: string,
  normalizedSearchTerm: string,
  formattedSearchTerm: string,
  isRutSearch: boolean,
) {
  let orQuery = `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`;
  if (isRutSearch) {
    orQuery += `,rut.ilike.%${searchTerm}%,rut.ilike.%${normalizedSearchTerm}%,rut.ilike.%${formattedSearchTerm}%`;
  } else {
    orQuery += `,rut.ilike.%${searchTerm}%`;
  }
  return orQuery;
}

export async function searchByRut(
  supabase: SupabaseClient<Database>,
  searchTerm: string,
  normalizedSearchTerm: string,
  rpcBranchId: string | null,
  rpcBranchIds: string[] | null,
) {
  try {
    const params = (term: string) => {
      const p: Record<string, unknown> = { rut_search_term: term };
      if (rpcBranchIds && rpcBranchIds.length === 0) return null;
      if (rpcBranchId) p.p_branch_id = rpcBranchId;
      else if (rpcBranchIds && rpcBranchIds.length > 0)
        p.p_branch_ids = rpcBranchIds;
      return p;
    };

    const p1 = params(searchTerm);
    const p2 = params(normalizedSearchTerm);
    if (p1 === null || p2 === null) return [];

    const [{ data: r1 }, { data: r2 }] = await Promise.all([
      supabase.rpc("search_customers_by_rut", p1).catch(() => ({ data: [] })),
      supabase.rpc("search_customers_by_rut", p2).catch(() => ({ data: [] })),
    ]);

    const map = new Map();
    [...(r1 || []), ...(r2 || [])].forEach((c: unknown) => {
      if (!map.has(c.id)) map.set(c.id, c);
    });
    return Array.from(map.values());
  } catch {
    return [];
  }
}
