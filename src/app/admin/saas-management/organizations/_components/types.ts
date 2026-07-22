export interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_tier: string;
  status: string;
  owner_id?: string;
  created_at: string;
  updated_at: string;
  stats?: {
    activeUsers: number;
    branches: number;
  };
  subscriptions?: Array<{
    id: string;
    status: string;
    current_period_start?: string;
    current_period_end?: string;
  }>;
  owner?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

export type OrgAction = "suspend" | "activate" | "cancel" | "change_tier";
