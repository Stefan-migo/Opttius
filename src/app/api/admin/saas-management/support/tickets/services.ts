import type { SupabaseClient } from "@supabase/supabase-js";

interface TicketRow {
  id: string;
  organization_id?: string;
  created_by_user_id?: string;
  assigned_to?: string;
  requester_email: string;
  requester_name?: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  ticket_number: string;
  metadata?: Record<string, unknown>;
}

export async function enrichTickets(
  supabaseServiceRole: SupabaseClient,
  tickets: TicketRow[],
) {
  return Promise.all(
    (tickets || []).map(async (ticket) => {
      let organization = null;
      if (ticket.organization_id) {
        const { data: org } = await supabaseServiceRole
          .from("organizations")
          .select("id, name, slug")
          .eq("id", ticket.organization_id)
          .maybeSingle();
        organization = org;
      }
      let created_by_user = null;
      if (ticket.created_by_user_id) {
        const { data: creator } = await supabaseServiceRole
          .from("admin_users")
          .select("id, email, role")
          .eq("id", ticket.created_by_user_id)
          .maybeSingle();
        created_by_user = creator;
      }
      let assigned_to_user = null;
      if (ticket.assigned_to) {
        const { data: assigned } = await supabaseServiceRole
          .from("admin_users")
          .select("id, email, role")
          .eq("id", ticket.assigned_to)
          .maybeSingle();
        assigned_to_user = assigned;
      }
      return { ...ticket, organization, created_by_user, assigned_to_user };
    }),
  );
}

export async function notifyTicketCreated(ticket: TicketRow, orgName?: string) {
  try {
    const { NotificationService } = await import(
      "@/lib/notifications/notification-service"
    );
    await NotificationService.notifySaasSupportTicketNew(
      ticket.id,
      ticket.ticket_number,
      ticket.subject,
      ticket.requester_email,
      orgName,
    );
  } catch {
    // Non-blocking
  }
}
