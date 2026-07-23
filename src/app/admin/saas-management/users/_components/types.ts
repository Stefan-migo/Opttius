export interface User {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  organization_id?: string;
  is_super_admin?: boolean;
  branches?: Array<{ id: string; name: string; code: string }>;
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
  fullName?: string;
  last_login?: string;
  created_at: string;
}
