/**
 * Shared types for process-sale handler dispatch.
 *
 * ProcessSaleContext is built by handleProcessSale (processSaleHandler.ts)
 * and consumed by handleRpcPath (processRpcHandler.ts) and
 * handleLegacyPath (processLegacyHandler.ts).
 *
 * All fields that were computed by the shared validation/prep phase
 * in handleProcessSale before the RPC/legacy branch.
 */
import type { SupabaseClient, User } from "@supabase/supabase-js";

export interface FrameInfo {
  frame_product_id: string | null;
  frame_name: string;
  frame_brand: string | null;
  frame_model: string | null;
  frame_color: string | null;
  frame_size: string | null;
  frame_sku: string | null;
  frame_cost: number;
  customer_own_frame: boolean;
}

export interface LensInfo {
  lens_family_id: string | null;
  lens_type: string | null;
  lens_material: string | null;
  lens_index: number | null;
  lens_treatments: string[];
  lens_tint_color: string | null;
  lens_tint_percentage: number | null;
  lens_cost: number;
  prescription_id: string | null;
  lens_sourcing_type: string | null;
}

export interface ProcessSaleContext {
  supabase: SupabaseClient;
  supabaseServiceRole: SupabaseClient;
  user: User;
  effectiveBranchId: string | null;
  fieldOperationId: string | null;
  posSessionId: string | null;
  orderOrganizationId: string | null;
  orderNumber: string;
  subtotal: number;
  tax_amount: number | null;
  total_amount: number;
  currency: string;
  payment_status: string;
  payment_method_type: string;
  email: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_rut: string | null;
  sii_rut: string | null;
  sii_business_name: string | null;
  customer: Record<string, unknown> | null;
  items: Array<Record<string, unknown>>;
  productsForStockCheck: Array<Record<string, unknown>>;
  agreement_id: string | null;
  purchase_order_id: string | null;
  copagoAmount: number | null;
  institutionalAmount: number | null;
  purchaseOrder: Record<string, unknown> | null;
  paymentsArray: Array<Record<string, unknown>>;
  deposit_amount: number | null;
  cash_received: number | null;
  fiscal_reference: string | null;
  change_amount: number | null;
  siiInvoiceNumber: string | null;
  actuallyRequiresWorkOrder: boolean;
  frameInfo: FrameInfo;
  lensInfo: LensInfo;
  presbyopia_solution: string | null;
  far_lens_family_id: string | null;
  near_lens_family_id: string | null;
  far_lens_cost: number | null;
  near_lens_cost: number | null;
  contact_lens_family_id: string | null;
  contact_lens_quantity: number | null;
  contact_lens_cost: number | null;
  treatmentsCost: number;
  laborCost: number;
  lensFamily: Record<string, unknown> | null;
  paymentAmount: number;
  dbPaymentMethod: string;
  balance: number;
  orderItems: Array<Record<string, unknown>>;
  customerName: string | null;
  billingFirstName: string | null;
  billingLastName: string | null;
  quote_id: string | null;
  quote: Record<string, unknown> | null;
  idempotency_key: string | undefined;
  contact_lens_rx_sphere_od: number | null;
  contact_lens_rx_cylinder_od: number | null;
  contact_lens_rx_axis_od: number | null;
  contact_lens_rx_add_od: number | null;
  contact_lens_rx_base_curve_od: number | null;
  contact_lens_rx_diameter_od: number | null;
  contact_lens_rx_sphere_os: number | null;
  contact_lens_rx_cylinder_os: number | null;
  contact_lens_rx_axis_os: number | null;
  contact_lens_rx_add_os: number | null;
  contact_lens_rx_base_curve_os: number | null;
  contact_lens_rx_diameter_os: number | null;
}
