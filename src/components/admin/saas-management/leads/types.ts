export type FunnelStage =
  | "pending"
  | "approved"
  | "demo_expiring"
  | "demo_expired"
  | "meeting_scheduled"
  | "post_meeting"
  | "negotiation"
  | "migration"
  | "converted"
  | "lost"
  | "rejected";

export interface Lead {
  id: string;
  email: string;
  full_name: string | null;
  optica_name: string | null;
  phone: string | null;
  funnel_stage: FunnelStage | null;
  lead_score?: number;
  priority_level?: string;
  created_at: string;
  last_contact_at: string | null;
  demo_expires_at: string | null;
  meeting_scheduled_at?: string | null;
  source?: string;
}

export interface LeadAIGeneratorLead {
  id: string;
  email: string;
  full_name?: string | null;
  optica_name?: string | null;
  funnel_stage?: string | null;
  lead_score?: number;
  priority_level?: string;
  notes?: string | null;
}
