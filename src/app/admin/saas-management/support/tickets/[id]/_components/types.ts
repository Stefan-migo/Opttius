import { z } from "zod";

import type { createSaasSupportMessageSchema } from "@/lib/api/validation/zod-schemas";

export interface TicketMessage {
  id: string;
  message: string;
  sender_name: string;
  sender_email: string;
  is_from_customer: boolean;
  is_internal: boolean;
  created_at: string;
  message_type: string;
  sender?: { id: string; email: string; role: string } | null;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  first_response_at: string | null;
  last_response_at: string | null;
  response_time_minutes: number | null;
  resolution_time_minutes: number | null;
  resolution: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  resolved_at: string | null;
  requester_email: string;
  requester_name: string | null;
  requester_role: string | null;
  organization?: { id: string; name: string; slug: string } | null;
  assigned_to_user?: { id: string; email: string; role: string } | null;
  created_by_user?: { id: string; email: string; role: string } | null;
}

export interface Template {
  id: string;
  name: string;
  subject: string | null;
  content: string;
  category: string | null;
}

export type MessageForm = z.infer<typeof createSaasSupportMessageSchema>;
