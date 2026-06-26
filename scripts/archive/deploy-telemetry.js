#!/usr/bin/env node

/**
 * Performance Optimization Deployment Script
 * Sets up the telemetry system for collecting real usage patterns
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Deploying Performance Optimization System');
console.log('='.repeat(50));

// Check if we're in the right directory
const requiredFiles = [
  'src/lib/telemetry/collector/browser-collector.ts',
  'src/lib/telemetry/collector/server-collector.ts',
  'src/lib/telemetry/hooks/use-telemetry.ts'
];

console.log('📋 Verifying system components...');

let allComponentsPresent = true;
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allComponentsPresent = false;
  }
}

if (!allComponentsPresent) {
  console.log('\n❌ Some required components are missing. Please ensure all telemetry files exist.');
  process.exit(1);
}

console.log('\n🔧 Creating deployment configuration...');

// Create telemetry configuration
const telemetryConfig = {
  version: '1.0.0',
  collectors: {
    browser: {
      enabled: true,
      batchSize: 10,
      flushInterval: 5000,
      maxQueueSize: 1000,
      trackPageViews: true,
      trackFeatureUsage: true,
      trackPerformance: true,
      trackErrors: true
    },
    server: {
      enabled: true,
      batchSize: 20,
      flushInterval: 10000,
      maxQueueSize: 5000,
      trackApiCalls: true,
      trackDatabaseQueries: true,
      trackExternalServices: true,
      trackSystemMetrics: true
    }
  },
  sampling: {
    // Sample rates for different event types to control data volume
    page_views: 1.0,        // 100% - critical for understanding usage
    feature_usage: 0.8,     // 80% - important for optimization
    performance: 0.5,       // 50% - resource intensive
    errors: 1.0,            // 100% - always capture errors
    api_calls: 0.3,         // 30% - high volume
    database_queries: 0.2   // 20% - very high volume
  },
  privacy: {
    // Privacy settings to protect user data
    anonymizeIp: true,
    excludeSensitivePaths: ['/api/auth', '/admin/users'],
    dataRetentionDays: 90,
    gdprCompliant: true
  },
  endpoints: {
    // Where to send telemetry data
    browserEndpoint: '/api/telemetry/browser',
    serverEndpoint: '/api/telemetry/server',
    dashboardEndpoint: '/api/telemetry/dashboard'
  }
};

// Write configuration file
const configPath = 'src/lib/telemetry/config.json';
try {
  fs.writeFileSync(configPath, JSON.stringify(telemetryConfig, null, 2));
  console.log(`✅ Telemetry configuration created: ${configPath}`);
} catch (error) {
  console.log(`❌ Failed to create configuration: ${error.message}`);
  process.exit(1);
}

console.log('\n🌐 Creating API endpoints...');

// Create API route directory if it doesn't exist
const apiDir = 'src/app/api/telemetry';
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}

// Create browser telemetry endpoint
const browserRoute = `
import { NextRequest, NextResponse } from 'next/server';
import { ServerTelemetryCollector } from '@/lib/telemetry/collector/server-collector';

export async function POST(request: NextRequest) {
  try {
    const events = await request.json();
    
    // Validate events structure
    if (!Array.isArray(events)) {
      return NextResponse.json({ error: 'Invalid event format' }, { status: 400 });
    }

    // Process events through server collector
    const collector = ServerTelemetryCollector.getInstance();
    const processedEvents = await collector.processBatch(events);
    
    return NextResponse.json({ 
      success: true, 
      processed: processedEvents.length 
    });

  } catch (error) {
    console.error('Telemetry processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Health check endpoint
    const collector = ServerTelemetryCollector.getInstance();
    const stats = collector.getStats();
    
    return NextResponse.json({ 
      status: 'healthy',
      collector: stats
    });
  } catch (error) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
`;

fs.writeFileSync(path.join(apiDir, 'browser/route.ts'), browserRoute.trim());
console.log('✅ Browser telemetry endpoint created');

// Create server telemetry endpoint
const serverRoute = `
import { NextRequest, NextResponse } from 'next/server';
import { ServerTelemetryCollector } from '@/lib/telemetry/collector/server-collector';

export async function POST(request: NextRequest) {
  try {
    const events = await request.json();
    
    if (!Array.isArray(events)) {
      return NextResponse.json({ error: 'Invalid event format' }, { status: 400 });
    }

    const collector = ServerTelemetryCollector.getInstance();
    const processedEvents = await collector.processBatch(events);
    
    return NextResponse.json({ 
      success: true, 
      processed: processedEvents.length 
    });

  } catch (error) {
    console.error('Server telemetry error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
`;

fs.writeFileSync(path.join(apiDir, 'server/route.ts'), serverRoute.trim());
console.log('✅ Server telemetry endpoint created');

// Create dashboard endpoint
const dashboardRoute = `
import { NextRequest, NextResponse } from 'next/server';
import { getMockDashboardData } from '@/lib/telemetry/dashboard/mock-dashboard';

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const userId = searchParams.get('userId') || undefined;
    const orgId = searchParams.get('orgId') || undefined;

    // Get mock dashboard data (will be replaced with real data storage)
    const dashboardData = getMockDashboardData(days, userId, orgId);
    
    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Dashboard data error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 });
  }
}
`;

fs.writeFileSync(path.join(apiDir, 'dashboard/route.ts'), dashboardRoute.trim());
console.log('✅ Dashboard endpoint created');

console.log('\n📱 Creating frontend integration components...');

// Create a telemetry provider component
const telemetryProvider = `
'use client';

import React, { useEffect } from 'react';
import { useTelemetry } from '@/lib/telemetry/hooks/use-telemetry';

interface TelemetryProviderProps {
  children: React.ReactNode;
  userId?: string;
  organizationId?: string;
  appName?: string;
}

export function TelemetryProvider({
  children,
  userId,
  organizationId,
  appName = 'Opttius'
}: TelemetryProviderProps) {
  const { initialize, trackPageView } = useTelemetry();

  useEffect(() => {
    // Initialize telemetry when component mounts
    initialize({
      userId,
      organizationId,
      appName,
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
    });

    // Track initial page view
    trackPageView({
      pageUrl: window.location.href,
      pageTitle: document.title
    });

    // Set up page view tracking for route changes
    const handleRouteChange = () => {
      setTimeout(() => {
        trackPageView({
          pageUrl: window.location.href,
          pageTitle: document.title
        });
      }, 100);
    };

    // Listen for Next.js route changes (you'll need to adapt this to your router)
    // router.events.on('routeChangeComplete', handleRouteChange);
    
    // Also track traditional navigation
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' && target.getAttribute('href')) {
        setTimeout(() => {
          trackPageView({
            pageUrl: window.location.href,
            pageTitle: document.title
          });
        }, 100);
      }
    };

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
      // router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [initialize, trackPageView, userId, organizationId, appName]);

  return <>{children}</>;
}
`;

const providersDir = 'src/components/providers';
if (!fs.existsSync(providersDir)) {
  fs.mkdirSync(providersDir, { recursive: true });
}

fs.writeFileSync(path.join(providersDir, 'telemetry-provider.tsx'), telemetryProvider.trim());
console.log('✅ Telemetry provider component created');

console.log('\n📊 Creating usage dashboard page...');

// Create dashboard page
const dashboardPage = `
'use client';

import React, { useState, useEffect } from 'react';
import { useTelemetry } from '@/lib/telemetry/hooks/use-telemetry';

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

export default function UsageAnalyticsDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const { trackFeatureUsage } = useTelemetry();

  useEffect(() => {
    // Track dashboard usage
    trackFeatureUsage('usage_dashboard_view', { timeRange });
    
    // Fetch dashboard data
    const fetchDashboardData = async () => {
      try {
        const response = await fetch(\`/api/telemetry/dashboard?days=\${timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90}\`);
        const data = await response.json();
        setDashboardData(data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [timeRange, trackFeatureUsage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dashboardData) {
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Usage Analytics Dashboard</h1>
        <p className="text-gray-600 mt-2">Monitor system performance and user behavior patterns</p>
        
        <div className="flex gap-2 mt-4">
          {['7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={\`px-4 py-2 rounded-lg \${
                timeRange === range 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }\`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Total Users</h3>
          <p className="text-3xl font-bold text-gray-900">{dashboardData.overview.totalUsers.toLocaleString()}</p>
          <p className="text-green-600 text-sm mt-1">↑ 12% from last period</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Active Users</h3>
          <p className="text-3xl font-bold text-gray-900">{dashboardData.overview.activeUsers.toLocaleString()}</p>
          <p className="text-green-600 text-sm mt-1">↑ 8% from last period</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Total Events</h3>
          <p className="text-3xl font-bold text-gray-900">{dashboardData.overview.totalEvents.toLocaleString()}</p>
          <p className="text-blue-600 text-sm mt-1">↗ Steady growth</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">Avg Session</h3>
          <p className="text-3xl font-bold text-gray-900">{Math.round(dashboardData.overview.avgSessionDuration)}s</p>
          <p className="text-green-600 text-sm mt-1">↑ 5% improvement</p>
        </div>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Active Users</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-500">Chart visualization would go here</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Features</h3>
          <div className="space-y-3">
            {dashboardData.topFeatures.map((feature, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-gray-700">{feature.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{feature.usage}%</span>
                  <span className={\`text-sm \${
                    feature.growth > 0 ? 'text-green-600' : 'text-red-600'
                  }\`}>
                    {feature.growth > 0 ? '↗' : '↘'} {Math.abs(feature.growth)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dashboardData.trends.performanceMetrics.map((metric, index) => (
            <div key={index} className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900">{metric.metric}</h4>
              <p className="text-2xl font-bold mt-2">
                {typeof metric.value === 'number' ? metric.value.toFixed(2) : metric.value}
              </p>
              <span className={\`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 \${
                metric.trend === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }\`}>
                {metric.trend === 'up' ? '↗ Improving' : '↘ Declining'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
`;

const dashboardDir = 'src/app/analytics';
if (!fs.existsSync(dashboardDir)) {
  fs.mkdirSync(dashboardDir, { recursive: true });
}

fs.writeFileSync(path.join(dashboardDir, 'page.tsx'), dashboardPage.trim());
console.log('✅ Usage analytics dashboard created');

console.log('\n✅ Deployment Complete!');
console.log('\n📋 Next Steps:');
console.log('1. Wrap your main application with <TelemetryProvider>');
console.log('2. Add telemetry tracking to key user interactions');
console.log('3. Visit /analytics to view the usage dashboard');
console.log('4. Monitor the console for telemetry events');
console.log('5. Review collected data to identify optimization opportunities');

console.log('\n🔧 To integrate telemetry into your app:');
console.log(`
// In your root layout or main component:
import { TelemetryProvider } from '@/components/providers/telemetry-provider';

export default function RootLayout({ children }) {
  return (
    <TelemetryProvider userId={currentUser?.id} organizationId={currentOrg?.id}>
      {children}
    </TelemetryProvider>
  );
}

// In your components, track feature usage:
import { useTelemetry } from '@/lib/telemetry/hooks/use-telemetry';

function MyComponent() {
  const { trackFeatureUsage } = useTelemetry();
  
  const handleClick = () => {
    trackFeatureUsage('my_feature_click', { 
      component: 'MyComponent',
      action: 'button_click' 
    });
    // ... your logic
  };
}
`);

process.exit(0);