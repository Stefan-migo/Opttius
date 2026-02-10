/**
 * Billing Adapter Interface
 *
 * Patrón Adapter para facturación que permite cambiar entre
 * facturación interna (Shadow Billing) y facturación fiscal (SII)
 * sin modificar la lógica del negocio.
 */

export interface BillingAdapter {
  /**
   * Emite un documento de facturación (interno o fiscal)
   * @param order - Orden a facturar
   * @returns Resultado de la facturación con folio, PDF, etc.
   */
  emitDocument(order: Order): Promise<BillingResult>;

  /**
   * Obtiene el estado de un documento emitido
   * @param folio - Folio del documento
   * @returns Estado del documento
   */
  getDocumentStatus(folio: string): Promise<DocumentStatus>;

  /**
   * Cancela un documento emitido
   * @param folio - Folio del documento a cancelar
   * @param reason - Razón de la cancelación
   * @returns true si se canceló exitosamente
   */
  cancelDocument(folio: string, reason: string): Promise<boolean>;
}

export interface BillingResult {
  folio: string;
  pdfUrl: string;
  type: "fiscal" | "internal";
  siiFolio?: string;
  siiStatus?: string;
  timestamp: Date;
}

export interface DocumentStatus {
  status: "pending" | "accepted" | "rejected" | "cancelled";
  message?: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id?: string;
  branch_id: string;
  total_amount: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  items: OrderItem[];
  customer?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    rut?: string;
    business_name?: string;
  };
  created_at: string;
}

export interface OrderItem {
  id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sku?: string;
}
