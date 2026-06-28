export interface DashboardData {
  kpis: {
    products: {
      total: number;
      lowStock: number;
      outOfStock: number;
    };
    orders: {
      total: number;
      pending: number;
      processing: number;
      completed: number;
      failed: number;
    };
    revenue: {
      current: number;
      previous: number;
      change: number;
      currency: string;
    };
    customers: {
      total: number;
      new: number;
      returning: number;
    };
    appointments?: {
      today: number;
      scheduled: number;
      confirmed: number;
      pending: number;
    };
    workOrders?: {
      new: number;
      inProgress: number;
      completed: number;
      pending: number;
      total: number;
    };
    quotes?: {
      total: number;
      pending: number;
      converted: number;
    };
  };
  todayAppointments: unknown[];
  lowStockProducts: unknown[];
  charts: {
    revenueTrend: unknown[];
    ordersStatus: unknown;
    topProducts: unknown[];
  };
}
