/** Etiquetas legibles para métodos de pago (POS y e-commerce) */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  credit: "Crédito",
  debit: "Débito",
  debit_card: "Tarjeta de Débito",
  credit_card: "Tarjeta de Crédito",
  deposit: "Depósito",
  transfer: "Transferencia",
  check: "Cheque",
  installments: "Cuotas",
  manual: "Manual",
  MercadoPago: "Mercado Pago",
  mercadopago: "Mercado Pago",
  "n/a": "N/A",
};

// Helper function to format currency (default CLP for Chile/óptica)
export function formatCurrency(amount: number, currency = "CLP"): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
  }).format(amount);
}

// Helper function to get payment method label
export function getPaymentMethodLabel(paymentMethod: string): string {
  if (!paymentMethod?.trim()) return "N/A";
  const key = paymentMethod.toLowerCase().replace(/\s+/g, "_");
  return (
    PAYMENT_METHOD_LABELS[paymentMethod] ||
    PAYMENT_METHOD_LABELS[key] ||
    paymentMethod
  );
}

// Types for order data from database
export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  variant_title?: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_email: string;
  email?: string;
  customer_name: string;
  items: OrderItem[];
  total_amount: number;
  currency?: string;
  payment_method: string;
  status: string;
  created_at: string;
  payment_id?: string;
  tracking_number?: string;
  carrier?: string;
  shipped_at?: string;
  delivered_at?: string;
  profiles?: {
    full_name?: string;
    email?: string;
  };
}
