export interface WorkOrder {
  id: string;
  work_order_number: string;
  work_order_date: string;
  customer: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  prescription?: unknown;
  quote?: unknown;
  frame_product?: unknown;
  frame_name: string;
  frame_brand?: string;
  frame_model?: string;
  frame_color?: string;
  frame_size?: string;
  frame_sku?: string;
  frame_serial_number?: string;
  lens_type: string;
  lens_material: string;
  lens_index?: number;
  lens_treatments?: string[];
  lens_tint_color?: string;
  lens_tint_percentage?: number;
  lab_name?: string;
  lab_contact?: string;
  lab_order_number?: string;
  lab_estimated_delivery_date?: string;
  status: string;
  ordered_at?: string;
  sent_to_lab_at?: string;
  lab_started_at?: string;
  lab_completed_at?: string;
  received_from_lab_at?: string;
  mounted_at?: string;
  quality_checked_at?: string;
  ready_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  frame_cost: number;
  lens_cost: number;
  treatments_cost: number;
  labor_cost: number;
  lab_cost: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  payment_status: string;
  payment_method?: string;
  deposit_amount: number;
  balance_amount: number;
  internal_notes?: string;
  customer_notes?: string;
  lab_notes?: string;
  quality_notes?: string;
  cancellation_reason?: string;
  assigned_staff?: {
    id: string;
    first_name?: string;
    last_name?: string;
  };
  pos_order_id?: string;
  created_at: string;
  presbyopia_solution?: string | null;
  far_lens_family_id?: string | null;
  near_lens_family_id?: string | null;
  far_lens_cost?: number | null;
  near_lens_cost?: number | null;
  lens_family?: { id: string; name: string } | null;
  far_lens_family?: { id: string; name: string } | null;
  near_lens_family?: { id: string; name: string } | null;
}

export interface StatusHistory {
  id: string;
  from_status: string;
  to_status: string;
  changed_at: string;
  notes?: string;
  changed_by_user?: {
    first_name?: string;
    last_name?: string;
  };
}

export interface DeliveryError {
  requiresPayment: boolean;
  balance?: number;
  orderId?: string;
  message?: string;
}

export interface LabInfo {
  lab_name: string;
  lab_contact: string;
  lab_order_number: string;
  lab_estimated_delivery_date: string;
}
