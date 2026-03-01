/**
 * Resolvers: Convert user-visible identifiers (names, numbers) to UUIDs for tool execution.
 * Users see quote_number, ticket_number, order_number, branch names, etc. in the UI - not UUIDs.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolve branch by name or code. Returns branch UUID or null.
 */
export async function resolveBranchByName(
  supabase: SupabaseClient,
  organizationId: string,
  branchNameOrCode: string,
): Promise<string | null> {
  const search = branchNameOrCode.trim();
  if (!search) return null;

  const { data, error } = await supabase
    .from("branches")
    .select("id")
    .eq("organization_id", organizationId)
    .or(`name.ilike.%${search}%,code.ilike.%${search}%`)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.id;
}

/**
 * Resolve quote by quote_number (e.g. "COT-2025-010"). Returns quote UUID or null.
 */
export async function resolveQuoteByNumber(
  supabase: SupabaseClient,
  organizationId: string,
  quoteNumber: string,
): Promise<string | null> {
  const num = quoteNumber.trim();
  if (!num) return null;

  const { data, error } = await supabase
    .from("quotes")
    .select("id")
    .eq("organization_id", organizationId)
    .ilike("quote_number", num)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.id;
}

/**
 * Resolve optical internal support ticket by ticket_number (e.g. "OPT-20250128-0001", "OPT-MCL2-20250128-0001").
 * Uses optical_internal_support_tickets. Filters by organization_id and optionally branch_id.
 */
export async function resolveOpticalTicketByNumber(
  supabase: SupabaseClient,
  ticketNumber: string,
  organizationId: string,
  branchId?: string | null,
): Promise<string | null> {
  const num = ticketNumber.trim();
  if (!num) return null;

  let query = supabase
    .from("optical_internal_support_tickets")
    .select("id")
    .eq("organization_id", organizationId)
    .ilike("ticket_number", num)
    .limit(1);

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return data.id;
}

/**
 * @deprecated Use resolveOpticalTicketByNumber for optical_internal_support_tickets.
 * Legacy: resolve support_tickets (B2B SaaS) by ticket_number.
 */
export async function resolveTicketByNumber(
  supabase: SupabaseClient,
  ticketNumber: string,
  organizationId?: string | null,
): Promise<string | null> {
  const num = ticketNumber.trim();
  if (!num) return null;

  let query = supabase
    .from("support_tickets")
    .select("id")
    .ilike("ticket_number", num)
    .limit(1);

  if (organizationId) {
    const { data: branches } = await supabase
      .from("branches")
      .select("id")
      .eq("organization_id", organizationId);
    const branchIds = branches?.map((b) => b.id) || [];
    if (branchIds.length > 0) {
      query = query.in("branch_id", branchIds);
    }
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return data.id;
}

/**
 * Resolve prescription by prescription_number. Returns prescription UUID or null.
 */
export async function resolvePrescriptionByNumber(
  supabase: SupabaseClient,
  organizationId: string,
  prescriptionNumber: string,
): Promise<string | null> {
  const num = prescriptionNumber.trim();
  if (!num) return null;

  const { data, error } = await supabase
    .from("prescriptions")
    .select("id")
    .eq("organization_id", organizationId)
    .ilike("prescription_number", num)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.id;
}

/**
 * Resolve customer by name or RUT. Returns customer UUID or null.
 * Uses same search pattern as getCustomers: first_name, last_name, email, rut.
 */
export async function resolveCustomerByNameOrRut(
  supabase: SupabaseClient,
  organizationId: string,
  nameOrRut: string,
  branchId?: string | null,
): Promise<string | null> {
  const search = nameOrRut.trim();
  if (!search) return null;

  let query = supabase
    .from("customers")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("is_active", true);

  if (branchId) {
    query = query.eq("branch_id", branchId);
  } else {
    const { data: branches } = await supabase
      .from("branches")
      .select("id")
      .eq("organization_id", organizationId);
    const branchIds = branches?.map((b) => b.id) || [];
    if (branchIds.length > 0) {
      query = query.in("branch_id", branchIds);
    }
  }

  const { data } = await query
    .or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,rut.ilike.%${search}%`,
    )
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

/**
 * Resolve order by order_number. Returns order UUID or null.
 */
export async function resolveOrderByNumber(
  supabase: SupabaseClient,
  organizationId: string,
  orderNumber: string,
): Promise<string | null> {
  const num = orderNumber.trim();
  if (!num) return null;

  const { data, error } = await supabase
    .from("orders")
    .select("id")
    .eq("organization_id", organizationId)
    .ilike("order_number", num)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.id;
}
