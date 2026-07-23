export interface Tier {
  id: string;
  name: string;
  price_monthly: number;
  max_branches?: number;
  max_users?: number;
  max_customers?: number;
  max_products?: number;
  features: Record<string, boolean>;
  stats?: {
    totalOrganizations: number;
    activeOrganizations: number;
    estimatedMonthlyRevenue: number;
  };
}

export interface TierEditData {
  price_monthly: number;
  max_branches: number;
  max_users: number;
  max_customers: number;
  max_products: number;
  features: Record<string, boolean>;
}
