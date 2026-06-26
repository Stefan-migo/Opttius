export interface CashClosure {
  id: string;
  pos_session_id?: string;
  branch_id: string;
  closure_date: string;
  closed_by: string;
  opening_cash_amount: number;
  total_sales: number;
  total_transactions: number;
  cash_sales: number;
  debit_card_sales: number;
  credit_card_sales: number;
  transfer_sales?: number;
  installments_sales: number;
  other_payment_sales: number;
  expected_cash: number;
  actual_cash: number | null;
  cash_difference: number;
  card_machine_debit_total: number;
  card_machine_credit_total: number;
  card_machine_difference: number;
  total_subtotal: number;
  total_tax: number;
  total_discounts: number;
  closing_cash_amount: number | null;
  notes: string | null;
  discrepancies: string | null;
  status: "draft" | "confirmed" | "reviewed" | "closed" | "reopened";
  opened_at: string;
  closed_at: string;
  confirmed_at: string | null;
  reopened_at?: string | null;
  reopened_by?: string | null;
  reopen_count?: number;
  reopen_notes?: string | null;
  branch?: {
    id: string;
    name: string;
    code: string;
  };
  closed_by_user?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface DailySummary {
  date: string;
  branch_id: string | null;
  opening_cash_amount: number;
  total_sales: number;
  total_transactions: number;
  cash_sales: number;
  cash_inflows?: number;
  cash_outflows?: number;
  debit_card_sales: number;
  credit_card_sales: number;
  transfer_sales: number;
  installments_sales: number;
  other_payment_sales: number;
  expected_cash: number;
  total_subtotal: number;
  total_tax: number;
  total_discounts: number;
  session_payments_count?: number;
}

export interface Movement {
  id: string;
  movement_type: "sale" | "partial_payment" | "credit_note";
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_rut: string | null;
  payment_method: string;
  payment_method_code: string;
  amount: number;
  payment_status: string;
  paid_at: string;
  notes: string | null;
  order_total: number;
  order_payment_status: string | null;
}
