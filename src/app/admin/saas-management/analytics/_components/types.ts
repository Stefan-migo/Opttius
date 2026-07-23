export interface DashboardData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalEvents: number;
    avgSessionDuration: number;
  };
  trends: {
    dailyActiveUsers: Array<{ date: string; count: number }>;
    featureUsage: Array<{ feature: string; usage: number }>;
    performanceMetrics: Array<{
      metric: string;
      value: number;
      trend: "up" | "down";
    }>;
  };
  topFeatures: Array<{ name: string; usage: number; growth: number }>;
  errorRates: Array<{ type: string; rate: number; change: number }>;
}
