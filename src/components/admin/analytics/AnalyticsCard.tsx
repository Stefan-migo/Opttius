'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useAnalyticsData } from '@/lib/telemetry/hooks/use-analytics-data';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalEvents: number;
    avgSessionDuration: number;
  };
  trends: {
    dailyActiveUsers: Array<{date: string, count: number}>;
    featureUsage: Array<{feature: string, usage: number}>;
    performanceMetrics: Array<{metric: string, value: number, trend: 'up' | 'down'}>;
  };
  topFeatures: Array<{name: string, usage: number, growth: number}>;
  errorRates: Array<{type: string, rate: number, change: number}>;
}

interface AnalyticsCardProps {
  timeRange?: '7d' | '30d' | '90d';
  onRefresh?: () => void;
  className?: string;
}

export function AnalyticsCard({ 
  timeRange = '7d', 
  onRefresh,
  className = '',
  autoRefresh = true
}: AnalyticsCardProps & { autoRefresh?: boolean }) {
  const { data: analyticsData, loading, error, refresh } = useAnalyticsData({
    timeRange,
    autoRefreshInterval: autoRefresh ? 30000 : 0, // 30 seconds
    enabled: true
  });

  // Handle manual refresh
  const handleRefresh = () => {
    refresh();
    if (onRefresh) {
      onRefresh();
    }
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded h-20"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className={`border-destructive ${className}`}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Analytics Error
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-sm">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={handleRefresh}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const overview = analyticsData?.overview || {
    totalUsers: 0,
    activeUsers: 0,
    totalEvents: 0,
    avgSessionDuration: 0
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Usage Analytics
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {timeRange}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{overview.totalUsers.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Users</p>
          </div>
          
          <div className="text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{overview.activeUsers.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Active Users</p>
          </div>
          
          <div className="text-center">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{overview.totalEvents.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Events</p>
          </div>
          
          <div className="text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold">{Math.round(overview.avgSessionDuration)}s</p>
            <p className="text-xs text-muted-foreground">Avg Session</p>
          </div>
        </div>

        {analyticsData?.topFeatures && analyticsData.topFeatures.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Top Features</h4>
            <div className="space-y-2">
              {analyticsData.topFeatures.slice(0, 3).map((feature, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm">{feature.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{feature.usage}%</span>
                    <span className={`text-xs ${
                      feature.growth > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {feature.growth > 0 ? '↗' : '↘'} {Math.abs(feature.growth)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
