export interface Customer {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  membership_tier?: string;
  is_member?: boolean;
}

export interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  color: string;
}

export interface NewTicketForm {
  title: string;
  description: string;
  priority: string;
  category_id: string;
  customer_email: string;
  customer_name: string;
  order_id: string;
  assigned_to: string;
}
