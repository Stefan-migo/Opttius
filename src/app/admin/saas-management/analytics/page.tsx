'use client';

import React, { useState, useEffect } from 'react';
import { useTelemetry } from '@/lib/telemetry/hooks/use-telemetry';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, ArrowLeft, Users, Activity, Clock, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
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

export default function SaaSAnalyticsPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const { trackFeatureUsage } = useTelemetry('saas-analytics');

  useEffect(() => {
    // Track dashboard usage (only after component mounts)
    if (typeof window !== 'undefined') {
      trackFeatureUsage('usage_dashboard_view', { timeRange });
    }
  }, [timeRange, trackFeatureUsage]);

  useEffect(() => {
    // Fetch dashboard data
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/telemetry/dashboard?days=${timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90}`);
        const data = await response.json();
        setDashboardData(data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dashboardData && !loading) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Dashboard</h3>
          <p className="text-red-600 mt-1">Unable to fetch usage analytics data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header with Back Navigation */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/admin/saas-management/dashboard">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver al Dashboard
            </Button>
          </Link>
        </div>
        
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics & Telemetry Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor system performance and user behavior patterns</p>
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          {['7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg ${
                timeRange === range 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-500 text-sm font-medium">Total Users</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">{dashboardData?.overview?.totalUsers?.toLocaleString() || '0'}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-green-600 text-sm mt-2">↑ 12% from last period</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-500 text-sm font-medium">Active Users</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">{dashboardData?.overview?.activeUsers?.toLocaleString() || '0'}</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-green-600 text-sm mt-2">↑ 8% from last period</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-500 text-sm font-medium">Total Events</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">{dashboardData?.overview?.totalEvents?.toLocaleString() || '0'}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-blue-600 text-sm mt-2">↗ Steady growth</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-500 text-sm font-medium">Avg Session</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">{Math.round(dashboardData?.overview?.avgSessionDuration || 0)}s</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
            <p className="text-green-600 text-sm mt-2">↑ 5% improvement</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Active Users</h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Interactive chart visualization</p>
                <p className="text-gray-400 text-sm mt-1">Using Chart.js or similar library</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Features Usage</h3>
            <div className="space-y-3">
              {dashboardData?.topFeatures?.map((feature, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700 font-medium">{feature.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{feature.usage}%</span>
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      feature.growth > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {feature.growth > 0 ? '↗' : '↘'} {Math.abs(feature.growth)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {dashboardData?.trends?.performanceMetrics?.map((metric, index) => (
              <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <h4 className="font-medium text-gray-900">{metric.metric}</h4>
                <p className="text-2xl font-bold mt-2">
                  {typeof metric.value === 'number' ? metric.value.toFixed(2) : metric.value}
                </p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                  metric.trend === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {metric.trend === 'up' ? '↗ Improving' : '↘ Declining'}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}