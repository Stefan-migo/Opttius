"use client";

export interface AnalyticsData {
  kpis: {
    totalRevenue: number;
    posRevenue: number;
    posTransactionCount?: number;
    workOrdersRevenue: number;
    revenueGrowth: number;
    totalOrders: number;
    totalWorkOrders: number;
    totalQuotes: number;
    totalAppointments: number;
    totalCustomers: number;
    newCustomers: number;
    recurringCustomers: number;
    avgOrderValue: number;
    avgWorkOrderValue: number;
    avgQuoteValue: number;
    quoteConversionRate: number;
    appointmentCompletionRate: number;
    avgDeliveryDays: number;
  };
  workOrders: {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
    byStatus: Record<string, number>;
  };
  quotes: {
    total: number;
    accepted: number;
    rejected: number;
    expired: number;
    converted: number;
    byStatus: Record<string, number>;
    conversionRate: number;
  };
  appointments: {
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
    byStatus: Record<string, number>;
    completionRate: number;
  };
  products: {
    total: number;
    lowStock: number;
    outOfStock: number;
    topProducts: Array<{
      id: string;
      name: string;
      category: string;
      revenue: number;
      quantity: number;
      orders: number;
    }>;
    categoryRevenue: Array<{ category: string; revenue: number }>;
  };
  paymentMethods: Array<{
    method: string;
    count: number;
    revenue: number;
  }>;
  trends: {
    sales: Array<{ date: string; value: number; count: number }>;
    customers: Array<{ date: string; value: number; count: number }>;
    workOrders: Array<{ date: string; value: number; count: number }>;
    quotes: Array<{ date: string; value: number; count: number }>;
    supportTickets?: Array<{ date: string; value: number; count: number }>;
  };
  support?: {
    total: number;
    open: number;
    resolved: number;
    avgResolutionMinutes: number | null;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    trends: Array<{ date: string; value: number; count: number }>;
  };
  period: {
    from: string;
    to: string;
    days: number;
  };
}

export function formatPrice(amount: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatPercentage(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function getPaymentMethodLabel(method: string) {
  const labels: Record<string, string> = {
    cash: "Efectivo",
    debit_card: "Tarjeta Débito",
    credit_card: "Tarjeta Crédito",
    installments: "Cuotas",
    transfer: "Transferencia",
    other: "Otro",
  };
  return labels[method] || method;
}

export function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "Borrador",
    sent: "Enviado",
    accepted: "Aceptado",
    rejected: "Rechazado",
    expired: "Expirado",
    converted_to_work: "Convertido",
    quote: "Presupuesto",
    ordered: "Ordenado",
    sent_to_lab: "Enviado al Lab",
    received_from_lab: "Recibido",
    mounted: "Montado",
    quality_check: "Control Calidad",
    ready_for_pickup: "Listo para Retiro",
    delivered: "Entregado",
    cancelled: "Cancelado",
    scheduled: "Agendada",
    completed: "Completada",
    no_show: "No Asistió",
  };
  return labels[status] || status;
}

export function getSupportCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    lens_issue: "Problema con lente",
    frame_issue: "Problema con marco",
    prescription_issue: "Problema con receta",
    delivery_issue: "Problema con entrega",
    payment_issue: "Problema con pago",
    appointment_issue: "Problema con cita",
    customer_complaint: "Queja del cliente",
    quality_issue: "Problema de calidad",
    other: "Otros",
  };
  return labels[category] || category;
}

export function getSupportStatusLabel(status: string) {
  const labels: Record<string, string> = {
    open: "Abierto",
    assigned: "Asignado",
    in_progress: "En progreso",
    waiting_customer: "Esperando cliente",
    resolved: "Resuelto",
    closed: "Cerrado",
  };
  return labels[status] || status;
}
