import type { Appointment } from "./appointmentService";
import type { Quote } from "./quoteService";

export interface Customer {
  id: string; first_name?: string; last_name?: string; name?: string;
  email: string | null; phone?: string | null; rut?: string | null;
  branch_id: string; field_operation_id?: string | null; is_active?: boolean; is_active_customer?: boolean;
  created_at: string; updated_at?: string; date_of_birth?: string | null;
  last_eye_exam_date?: string | null; next_eye_exam_due?: string | null;
  medical_conditions?: string[]; allergies?: string[];
  emergency_contact_name?: string | null; emergency_contact_phone?: string | null;
  address_line_1?: string | null; address_line_2?: string | null; city?: string | null;
  state?: string | null; postal_code?: string | null; country?: string | null;
  orders?: unknown[]; prescriptions?: Prescription[]; appointments?: Appointment[];
  quotes?: Quote[]; lensPurchases?: LensPurchase[];
  analytics?: CustomerAnalytics; agreement_usage?: AgreementUsage[]; is_convenio_client?: boolean;
}

export interface AgreementUsage { agreement_id: string; agreement_name: string | null; order_count: number; last_order_at: string; total_copago: number; total_institutional: number; }

export interface Prescription {
  id: string; customer_id: string; prescription_number?: string; prescription_type?: string;
  prescription_date: string; expiration_date?: string; is_current?: boolean; is_active?: boolean;
  issued_by?: string; issued_by_license?: string;
  od_sphere?: number | null | undefined; od_cylinder?: number | null | undefined;
  od_axis?: number | null | undefined; od_add?: number | null | undefined;
  od_pd?: number | null | undefined; od_near_pd?: number | null | undefined;
  os_sphere?: number | null | undefined; os_cylinder?: number | null | undefined;
  os_axis?: number | null | undefined; os_add?: number | null | undefined;
  os_pd?: number | null | undefined; os_near_pd?: number | null | undefined;
  frame_pd?: number | null | undefined; height_segmentation?: number | null | undefined;
  pd_distance?: number | null | undefined; pd_near?: number | null | undefined;
  od_prism?: number | null | undefined; od_base?: number | null | undefined;
  os_prism?: number | null | undefined; os_base?: number | null | undefined;
  notes?: string; created_at?: string;
}

export interface LensPurchase {
  id: string; customer_id: string; prescription_id?: string; product_name: string;
  product_type: string; quantity: number; purchase_date: string; delivery_date?: string;
  status: "ordered" | "in_progress" | "ready" | "delivered" | "cancelled";
  lens_type?: string; lens_material?: string; lens_index?: number;
  frame_brand?: string; frame_model?: string; frame_color?: string;
  total_amount: number; total_price?: number; unit_price?: number; created_at?: string;
}

export interface CustomerAnalytics {
  totalSpent: number; orderCount: number; lastOrderDate?: string; avgOrderValue: number;
  segment: string; lifetimeValue: number;
  favoriteProducts?: Array<{ product?: { id: string; name?: string; featured_image?: string }; quantity: number; totalSpent: number }>;
  orderStatusCounts?: Record<string, number>;
  monthlySpending?: Array<{ month: string; amount: number; orderCount: number }>;
}

export interface CreateCustomerData {
  first_name?: string | null; last_name?: string | null; email?: string | null;
  phone?: string | null; rut?: string | null; date_of_birth?: string | null;
  gender?: "male" | "female" | "other" | "prefer_not_to_say" | null;
  address_line_1?: string | null; address_line_2?: string | null; city?: string | null;
  state?: string | null; postal_code?: string | null; country?: string | null;
  medical_conditions?: string | null; allergies?: string | null; medications?: string | null;
  medical_notes?: string | null; last_eye_exam_date?: string | null; next_eye_exam_due?: string | null;
  preferred_contact_method?: "email" | "phone" | "sms" | "whatsapp" | null;
  emergency_contact_name?: string | null; emergency_contact_phone?: string | null;
  insurance_provider?: string | null; insurance_policy_number?: string | null;
  notes?: string | null; tags?: string[] | null; is_active?: boolean;
  branch_id?: string | null; field_operation_id?: string | null;
}

export interface UpdateCustomerData extends Partial<CreateCustomerData> {}

export interface CustomerSearchParams {
  page?: number; limit?: number; search?: string; status?: string; agreementId?: string;
  branchId?: string; isGlobalView?: boolean; isSuperAdmin?: boolean; fieldOperationId?: string;
}

export interface CustomerListResponse { data: Customer[]; pagination: { page: number; limit: number; total: number; totalPages: number }; }

export interface CreatePrescriptionData {
  prescription_date: string; expiration_date?: string; prescription_number?: string;
  issued_by?: string; issued_by_license?: string;
  od_sphere?: number | null; od_cylinder?: number | null; od_axis?: number | null;
  od_add?: number | null; od_pd?: number | null; od_near_pd?: number | null;
  os_sphere?: number | null; os_cylinder?: number | null; os_axis?: number | null;
  os_add?: number | null; os_pd?: number | null; os_near_pd?: number | null;
  frame_pd?: number | null; height_segmentation?: number | null; is_current?: boolean;
}
