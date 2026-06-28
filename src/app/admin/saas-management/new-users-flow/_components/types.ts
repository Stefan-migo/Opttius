export type FunnelStage =
  | "pending"
  | "approved"
  | "rejected"
  | "demo_expiring"
  | "demo_expired"
  | "meeting_scheduled"
  | "post_meeting"
  | "negotiation"
  | "migration"
  | "converted"
  | "lost";

export interface DemoRequest {
  id: string;
  email: string;
  full_name: string | null;
  optica_name: string | null;
  phone: string | null;
  source: string;
  status: string;
  funnel_stage: FunnelStage | null;
  created_at: string;
  reviewed_at: string | null;
  organization_id: string | null;
  demo_started_at: string | null;
  demo_expires_at: string | null;
  meeting_url: string | null;
  meeting_scheduled_at: string | null;
  meeting_completed_at: string | null;
  offer_type: string | null;
  notes: string | null;
  last_contact_at: string | null;
  lost_reason: string | null;
  lead_score?: number;
  priority_level?: string;
  score_last_calculated_at?: string;
  assigned_to?: string;
  next_followup_at?: string;
  first_contact_at?: string;
}

export interface Stats {
  pendingRequests: number;
  approvedThisMonth: number;
  activeDemos: number;
  conversionRate?: number;
  totalConverted?: number;
  totalApproved?: number;
  expiringSoon?: number;
  byStage?: Record<string, number>;
}
