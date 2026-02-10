// Mock telemetry dashboard for development and testing
// This will be expanded with real data once the telemetry system is fully implemented

export interface TelemetryStats {
  activeUsers: number;
  pageViewsToday: number;
  featureUsage: Record<string, number>;
  errorRate: number;
  avgResponseTime: number;
  topFeatures: Array<{ name: string; usage: number }>;
  performanceMetrics: {
    fcp: number;
    lcp: number;
    cls: number;
  };
}

export class TelemetryDashboard {
  /**
   * Get current telemetry statistics
   * In production, this would fetch from the telemetry database
   */
  static async getStats(timeRange: '24h' | '7d' | '30d' = '24h'): Promise<TelemetryStats> {
    // Mock data for development
    const mockStats: TelemetryStats = {
      activeUsers: Math.floor(Math.random() * 100) + 50,
      pageViewsToday: Math.floor(Math.random() * 1000) + 500,
      featureUsage: {
        'appointments': Math.floor(Math.random() * 200) + 100,
        'products': Math.floor(Math.random() * 300) + 150,
        'pos': Math.floor(Math.random() * 150) + 75,
        'customers': Math.floor(Math.random() * 100) + 50,
        'reports': Math.floor(Math.random() * 50) + 25
      },
      errorRate: Math.random() * 2, // 0-2%
      avgResponseTime: Math.floor(Math.random() * 300) + 100, // 100-400ms
      topFeatures: [
        { name: 'Products', usage: 342 },
        { name: 'Appointments', usage: 298 },
        { name: 'POS', usage: 187 },
        { name: 'Customers', usage: 143 },
        { name: 'Reports', usage: 89 }
      ],
      performanceMetrics: {
        fcp: Math.floor(Math.random() * 1000) + 800, // 800-1800ms
        lcp: Math.floor(Math.random() * 2000) + 1500, // 1500-3500ms
        cls: Math.random() * 0.1 // 0-0.1
      }
    };

    return mockStats;
  }

  /**
   * Get feature adoption trends
   */
  static async getFeatureTrends(featureName: string, days: number = 30): Promise<Array<{ date: string; count: number }>> {
    const trends = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      trends.push({
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 50) + 10
      });
    }
    
    return trends;
  }

  /**
   * Get user engagement metrics
   */
  static async getUserEngagement(): Promise<{
    sessionDuration: number;
    pagesPerSession: number;
    bounceRate: number;
  }> {
    return {
      sessionDuration: Math.floor(Math.random() * 300) + 120, // 2-7 minutes
      pagesPerSession: Math.random() * 3 + 1, // 1-4 pages
      bounceRate: Math.random() * 40 + 20 // 20-60%
    };
  }

  /**
   * Get error patterns and common issues
   */
  static async getErrorPatterns(): Promise<Array<{ 
    errorType: string; 
    count: number; 
    percentage: number 
  }>> {
    return [
      { errorType: 'Validation Error', count: 23, percentage: 45 },
      { errorType: 'Network Timeout', count: 12, percentage: 23 },
      { errorType: 'Database Connection', count: 8, percentage: 16 },
      { errorType: 'Permission Denied', count: 5, percentage: 10 },
      { errorType: 'Other', count: 3, percentage: 6 }
    ];
  }

  /**
   * Get performance bottlenecks
   */
  static async getPerformanceBottlenecks(): Promise<Array<{
    endpoint: string;
    avgTime: number;
    p95Time: number;
    errorRate: number;
  }>> {
    return [
      { endpoint: '/api/products/search', avgTime: 245, p95Time: 420, errorRate: 0.2 },
      { endpoint: '/api/appointments', avgTime: 180, p95Time: 310, errorRate: 0.1 },
      { endpoint: '/api/customers', avgTime: 156, p95Time: 280, errorRate: 0.3 },
      { endpoint: '/api/orders', avgTime: 312, p95Time: 540, errorRate: 0.5 },
      { endpoint: '/api/auth/login', avgTime: 89, p95Time: 156, errorRate: 0.1 }
    ];
  }

  /**
   * Get user journey analysis
   */
  static async getUserJourneys(): Promise<Array<{
    journey: string[];
    conversionRate: number;
    dropOffPoints: string[];
  }>> {
    return [
      {
        journey: ['Login', 'Dashboard', 'Products', 'POS', 'Checkout'],
        conversionRate: 67,
        dropOffPoints: ['Products → POS']
      },
      {
        journey: ['Login', 'Dashboard', 'Appointments', 'Calendar'],
        conversionRate: 82,
        dropOffPoints: []
      },
      {
        journey: ['Login', 'Dashboard', 'Customers', 'Customer Profile'],
        conversionRate: 45,
        dropOffPoints: ['Dashboard → Customers', 'Customer Profile']
      }
    ];
  }
}

// Export for use in components
export default TelemetryDashboard;

/**
 * Get mock dashboard data with the structure expected by the analytics page
 */
export function getMockDashboardData(days: number = 7, userId?: string, orgId?: string) {
  // Generate mock data that matches the DashboardData interface
  const totalUsers = Math.floor(Math.random() * 1000) + 500;
  const activeUsers = Math.floor(totalUsers * (Math.random() * 0.3 + 0.6)); // 60-90% of total
  const totalEvents = Math.floor(Math.random() * 10000) + 5000;
  
  return {
    overview: {
      totalUsers,
      activeUsers,
      totalEvents,
      avgSessionDuration: Math.floor(Math.random() * 300) + 120 // 2-7 minutes
    },
    trends: {
      dailyActiveUsers: Array.from({ length: days }, (_, i) => ({
        date: new Date(Date.now() - (days - i - 1) * 86400000).toISOString().split('T')[0],
        count: Math.floor(Math.random() * 100) + 50
      })),
      featureUsage: [
        { feature: 'Appointments', usage: Math.floor(Math.random() * 200) + 100 },
        { feature: 'Products', usage: Math.floor(Math.random() * 300) + 150 },
        { feature: 'POS', usage: Math.floor(Math.random() * 150) + 75 },
        { feature: 'Customers', usage: Math.floor(Math.random() * 100) + 50 }
      ],
      performanceMetrics: [
        { metric: 'Response Time', value: Math.floor(Math.random() * 200) + 100, trend: 'down' as const },
        { metric: 'Error Rate', value: Math.random() * 2, trend: 'down' as const },
        { metric: 'Throughput', value: Math.floor(Math.random() * 500) + 200, trend: 'up' as const }
      ]
    },
    topFeatures: [
      { name: 'Products', usage: Math.floor(Math.random() * 200) + 100, growth: Math.floor(Math.random() * 20) + 5 },
      { name: 'Appointments', usage: Math.floor(Math.random() * 150) + 80, growth: Math.floor(Math.random() * 15) + 3 },
      { name: 'POS', usage: Math.floor(Math.random() * 100) + 50, growth: Math.floor(Math.random() * 10) + 2 },
      { name: 'Customers', usage: Math.floor(Math.random() * 80) + 30, growth: Math.floor(Math.random() * 8) + 1 },
      { name: 'Reports', usage: Math.floor(Math.random() * 50) + 20, growth: Math.floor(Math.random() * 5) + 0 }
    ],
    errorRates: [
      { type: 'Validation Errors', rate: Math.random() * 2, change: -Math.random() * 0.5 },
      { type: 'Network Errors', rate: Math.random() * 1, change: -Math.random() * 0.3 },
      { type: 'Database Errors', rate: Math.random() * 0.5, change: -Math.random() * 0.2 }
    ]
  };
}