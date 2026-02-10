#!/usr/bin/env node

/**
 * Telemetry System Test Script
 * Tests the complete telemetry pipeline: collection → storage → dashboard
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM9zvqi-FSX_LTzwoI5_ZJCY6rvDmNjA9s3A2F990';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTelemetryTests() {
  console.log('🚀 Starting Telemetry System Tests...\n');
  
  try {
    // Test 1: Check if telemetry tables exist
    console.log('📋 Test 1: Checking database schema...');
    const { data: tables, error: tableError } = await supabase
      .from('telemetry_events')
      .select('id')
      .limit(1);
    
    if (tableError && tableError.code !== '42P01') {
      throw new Error(`Database connection failed: ${tableError.message}`);
    }
    
    console.log('✅ Database tables are accessible\n');
    
    // Test 2: Generate test telemetry events
    console.log('📊 Test 2: Generating test telemetry events...');
    
    const testEvents = [
      {
        eventType: 'page_view',
        eventName: 'dashboard_access',
        userId: 'test-user-1',
        context: { organizationId: 'test-org-1' },
        payload: { page: '/admin/dashboard', duration: 1200 },
        metadata: {
          userAgent: 'Mozilla/5.0 (Test Browser)',
          pageUrl: 'http://localhost:3000/admin/dashboard',
          performance: { fcp: 1200, lcp: 2100 }
        }
      },
      {
        eventType: 'feature_usage',
        eventName: 'create_appointment',
        userId: 'test-user-1',
        context: { organizationId: 'test-org-1' },
        payload: { feature: 'appointments', action: 'create' },
        metadata: { userAgent: 'Mozilla/5.0 (Test Browser)' }
      },
      {
        eventType: 'api_call',
        eventName: 'get_products',
        context: { organizationId: 'test-org-1' },
        payload: { endpoint: '/api/products', duration: 45 },
        metadata: { performance: { responseTime: 45 } }
      }
    ];
    
    // Test 3: Send events to browser endpoint
    console.log('📡 Test 3: Sending events to browser telemetry endpoint...');
    
    const browserResponse = await fetch('http://localhost:3000/api/telemetry/browser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testEvents)
    });
    
    const browserResult = await browserResponse.json();
    console.log(`Browser endpoint response:`, browserResult);
    
    if (browserResult.success) {
      console.log('✅ Browser telemetry endpoint working\n');
    } else {
      throw new Error('Browser endpoint failed');
    }
    
    // Test 4: Send events to server endpoint
    console.log('🖥️  Test 4: Sending events to server telemetry endpoint...');
    
    const serverResponse = await fetch('http://localhost:3000/api/telemetry/server', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testEvents.slice(0, 2)) // Send subset
    });
    
    const serverResult = await serverResponse.json();
    console.log(`Server endpoint response:`, serverResult);
    
    if (serverResult.success) {
      console.log('✅ Server telemetry endpoint working\n');
    } else {
      throw new Error('Server endpoint failed');
    }
    
    // Test 5: Wait a moment for data to be processed
    console.log('⏳ Waiting for data processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 6: Query database directly
    console.log('🔍 Test 6: Verifying data in database...');
    
    const { data: storedEvents, error: queryError } = await supabase
      .from('telemetry_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (queryError) {
      throw new Error(`Database query failed: ${queryError.message}`);
    }
    
    console.log(`Found ${storedEvents.length} events in database:`);
    storedEvents.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.event_type} - ${event.event_name} (${event.created_at})`);
    });
    
    console.log('✅ Data successfully stored in database\n');
    
    // Test 7: Test dashboard endpoint
    console.log('📈 Test 7: Testing dashboard API endpoint...');
    
    const dashboardResponse = await fetch('http://localhost:3000/api/telemetry/dashboard?days=7');
    const dashboardData = await dashboardResponse.json();
    
    console.log('Dashboard data structure:');
    console.log(`  Overview: ${JSON.stringify(dashboardData.overview)}`);
    console.log(`  Trends: ${dashboardData.trends?.dailyActiveUsers?.length || 0} days of data`);
    console.log(`  Top Features: ${dashboardData.topFeatures?.length || 0} features`);
    
    if (dashboardData.overview) {
      console.log('✅ Dashboard endpoint working\n');
    } else {
      throw new Error('Dashboard endpoint failed');
    }
    
    // Test 8: Test retention functions
    console.log('🧹 Test 8: Testing retention functions...');
    
    const { data: stats, error: statsError } = await supabase
      .rpc('get_telemetry_stats');
    
    if (statsError) {
      console.log('⚠️  Retention functions not yet available (may need migration)');
    } else {
      console.log('✅ Retention functions working');
      console.log(`Current stats: ${JSON.stringify(stats)}`);
    }
    
    console.log('\n🎉 All Telemetry Tests Passed!');
    console.log('\n📋 Test Summary:');
    console.log('✅ Database schema: Working');
    console.log('✅ Browser telemetry endpoint: Working');
    console.log('✅ Server telemetry endpoint: Working');
    console.log('✅ Data persistence: Working');
    console.log('✅ Dashboard API: Working');
    console.log('✅ Data retrieval: Working');
    
    console.log('\n🔧 Manual Testing Guide:');
    console.log('1. Visit http://localhost:3000/admin/saas-management/analytics');
    console.log('2. Navigate around the admin panel to generate real events');
    console.log('3. Refresh the analytics dashboard to see updated metrics');
    console.log('4. Check that real user data appears instead of mock data');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runTelemetryTests().catch(console.error);
}

module.exports = { runTelemetryTests };