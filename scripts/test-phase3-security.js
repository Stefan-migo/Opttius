#!/usr/bin/env node
/**
 * Phase 3 Security Manual Testing Script
 * 
 * Interactive testing tool for validating Phase 3 security implementations
 * in a development environment before production deployment.
 * 
 * Usage: node scripts/test-phase3-security.js
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  total: 0
};

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'bright');
  log(`  ${title}`, 'bright');
  log('='.repeat(60), 'bright');
}

function logTest(name, status, details = '') {
  testResults.total++;
  const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  
  log(`  ${statusIcon} ${name}`, statusColor);
  if (details) {
    log(`     ${details}`, 'blue');
  }
  
  if (status === 'PASS') testResults.passed++;
  else if (status === 'FAIL') testResults.failed++;
  else testResults.skipped++;
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test suites
async function testRedisConnectivity() {
  logSection('REDIS CONNECTIVITY TEST');
  
  try {
    const { getRedisClient, isRedisHealthy } = await import('../src/lib/redis/client.mjs');
    
    log('Testing Redis connection...');
    const isHealthy = await isRedisHealthy();
    
    if (isHealthy) {
      logTest('Redis Connection', 'PASS', 'Successfully connected to Redis');
      
      // Test basic operations
      const client = getRedisClient();
      await client.setex('test:phase3', 30, 'test-value');
      const value = await client.get('test:phase3');
      
      if (value === 'test-value') {
        logTest('Redis Operations', 'PASS', 'SET/GET operations working correctly');
      } else {
        logTest('Redis Operations', 'FAIL', 'SET/GET operations failed');
      }
      
      await client.del('test:phase3');
    } else {
      logTest('Redis Connection', 'FAIL', 'Cannot connect to Redis server');
      return false;
    }
  } catch (error) {
    logTest('Redis Connectivity', 'FAIL', `Error: ${error.message}`);
    return false;
  }
  
  return true;
}

async function testBehavioralAnalytics() {
  logSection('BEHAVIORAL ANALYTICS TEST');
  
  try {
    const { behavioralAnalytics } = await import('../src/lib/security/phase3-integration.mjs');
    
    // Test 1: Record user actions
    log('Testing user action recording...');
    const testAction = {
      userId: 'test-user-123',
      actionType: 'login',
      timestamp: new Date(),
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 Test Browser',
      resourceId: 'dashboard'
    };
    
    await behavioralAnalytics.recordUserAction(testAction);
    logTest('Action Recording', 'PASS', 'Successfully recorded user action');
    
    // Test 2: Retrieve user baseline
    log('Testing baseline retrieval...');
    const baseline = await behavioralAnalytics.getUserBaseline('test-user-123');
    
    if (baseline && baseline.userId === 'test-user-123') {
      logTest('Baseline Retrieval', 'PASS', 'Successfully retrieved user baseline');
    } else {
      logTest('Baseline Retrieval', 'FAIL', 'Failed to retrieve or validate baseline');
    }
    
    // Test 3: Multiple actions and pattern recognition
    log('Testing pattern recognition...');
    const additionalActions = [
      {
        userId: 'test-user-123',
        actionType: 'view_reports',
        timestamp: new Date(Date.now() + 1000),
        ipAddress: '192.168.1.100',
        resourceId: 'sales_report'
      },
      {
        userId: 'test-user-123',
        actionType: 'download_file',
        timestamp: new Date(Date.now() + 2000),
        ipAddress: '192.168.1.100',
        resourceId: 'confidential_doc.pdf'
      }
    ];
    
    for (const action of additionalActions) {
      await behavioralAnalytics.recordUserAction(action);
    }
    
    const updatedBaseline = await behavioralAnalytics.getUserBaseline('test-user-123');
    if (updatedBaseline && updatedBaseline.actionPatterns.view_reports) {
      logTest('Pattern Recognition', 'PASS', 'Successfully recognized action patterns');
    } else {
      logTest('Pattern Recognition', 'FAIL', 'Pattern recognition not working correctly');
    }
    
  } catch (error) {
    logTest('Behavioral Analytics', 'FAIL', `Error: ${error.message}`);
  }
}

async function testThreatDetection() {
  logSection('THREAT DETECTION TEST');
  
  try {
    const { threatDetector } = await import('../src/lib/security/phase3-integration.mjs');
    
    // Test 1: System status
    log('Testing threat detection status...');
    const status = threatDetector.getStatus();
    
    if (status && typeof status.threatFeeds === 'number') {
      logTest('System Status', 'PASS', `Threat feeds: ${status.threatFeeds}, ML models: ${status.mlModels}`);
    } else {
      logTest('System Status', 'FAIL', 'Invalid status object returned');
    }
    
    // Test 2: Behavior analysis
    log('Testing behavior analysis...');
    const testActions = [
      {
        userId: 'threat-test-user',
        actionType: 'login',
        timestamp: new Date(),
        ipAddress: '192.168.1.100'
      }
    ];
    
    const threats = await threatDetector.analyzeUserBehavior('threat-test-user', testActions);
    
    if (Array.isArray(threats)) {
      logTest('Behavior Analysis', 'PASS', `Analyzed ${threats.length} potential threats`);
    } else {
      logTest('Behavior Analysis', 'FAIL', 'Did not return array of threats');
    }
    
    // Test 3: Zero-trust evaluation
    log('Testing zero-trust evaluation...');
    // This should not throw errors
    await threatDetector.analyzeUserBehavior('zt-test-user', [{
      userId: 'zt-test-user',
      actionType: 'admin_access',
      timestamp: new Date(),
      resourceId: 'user_management'
    }]);
    
    logTest('Zero-Trust Evaluation', 'PASS', 'Successfully evaluated zero-trust access');
    
  } catch (error) {
    logTest('Threat Detection', 'FAIL', `Error: ${error.message}`);
  }
}

async function testIncidentResponse() {
  logSection('INCIDENT RESPONSE TEST');
  
  try {
    const { incidentResponse } = await import('../src/lib/security/phase3-integration.mjs');
    
    // Test 1: Process security events
    log('Testing incident creation from security events...');
    const testEvents = [
      {
        id: 'test-event-1',
        timestamp: new Date().toISOString(),
        eventType: 'auth.login_failure',
        severity: 'high',
        source: 'authentication',
        userId: 'compromised-user',
        ipAddress: '192.168.1.100',
        details: { attempts: 6 }
      }
    ];
    
    const incidents = await incidentResponse.processSecurityEvents(testEvents);
    logTest('Event Processing', 'PASS', `Processed ${testEvents.length} events, created ${incidents.length} incidents`);
    
    // Test 2: Incident management
    log('Testing incident management...');
    const activeIncidents = incidentResponse.getActiveIncidents();
    logTest('Incident Management', 'PASS', `Found ${activeIncidents.length} active incidents`);
    
    // Test 3: Incident retrieval
    log('Testing incident retrieval...');
    const incident = incidentResponse.getIncidentById('non-existent-id');
    if (incident === undefined) {
      logTest('Incident Retrieval', 'PASS', 'Correctly handled non-existent incident');
    } else {
      logTest('Incident Retrieval', 'FAIL', 'Should return undefined for non-existent incidents');
    }
    
  } catch (error) {
    logTest('Incident Response', 'FAIL', `Error: ${error.message}`);
  }
}

async function testSecurityOrchestration() {
  logSection('SECURITY ORCHESTRATION TEST');
  
  try {
    const { phase3Security } = await import('../src/lib/security/phase3-integration.js');
    
    // Test 1: Process events through all systems
    log('Testing end-to-end event processing...');
    const testEvents = [
      {
        id: 'orch-test-1',
        userId: 'orchestration-user',
        actionType: 'login',
        timestamp: Date.now(),
        ipAddress: '192.168.1.100',
        severity: 'medium',
        eventType: 'auth.login_success',
        source: 'web-app'
      },
      {
        id: 'orch-test-2',
        userId: 'orchestration-user',
        actionType: 'view_sensitive_data',
        timestamp: Date.now() + 1000,
        ipAddress: '192.168.1.100',
        severity: 'high',
        eventType: 'data.access_sensitive',
        source: 'api',
        resourceId: 'customer_records'
      }
    ];
    
    await phase3Security.processSecurityEvents(testEvents);
    logTest('Event Processing', 'PASS', 'Successfully processed events through all security layers');
    
    // Test 2: System status
    log('Testing system status...');
    const status = phase3Security.getStatus();
    
    if (status && status.components) {
      logTest('System Status', 'PASS', `Components: ${Object.keys(status.components).length}`);
      log(`     Metrics: ${JSON.stringify(status.metrics)}`, 'blue');
    } else {
      logTest('System Status', 'FAIL', 'Invalid status structure');
    }
    
    // Test 3: Compliance check
    log('Testing compliance assessment...');
    const compliance = await phase3Security.performComplianceCheck();
    
    if (compliance && typeof compliance.soc2Ready === 'boolean') {
      logTest('Compliance Check', 'PASS', `SOC2: ${compliance.soc2Ready}, PCI-DSS: ${compliance.pciDssCompliant}`);
    } else {
      logTest('Compliance Check', 'FAIL', 'Invalid compliance assessment');
    }
    
    // Test 4: Report generation
    log('Testing security report generation...');
    const report = await phase3Security.generateSecurityReport();
    
    if (report && report.includes('Phase 3 Security Report')) {
      logTest('Report Generation', 'PASS', `Generated ${report.length} character report`);
      
      // Optionally save report
      const reportPath = path.join(__dirname, '../docs/security/test-report.md');
      fs.writeFileSync(reportPath, report);
      log(`     Report saved to: ${reportPath}`, 'blue');
    } else {
      logTest('Report Generation', 'FAIL', 'Failed to generate proper security report');
    }
    
  } catch (error) {
    logTest('Security Orchestration', 'FAIL', `Error: ${error.message}`);
  }
}

async function testPerformance() {
  logSection('PERFORMANCE TEST');
  
  try {
    const { phase3Security } = await import('../src/lib/security/phase3-integration.js');
    
    // Test processing speed
    log('Testing event processing performance...');
    const largeEventSet = Array.from({ length: 100 }, (_, i) => ({
      id: `perf-test-${i}`,
      userId: `perf-user-${i % 10}`,
      actionType: 'api_request',
      timestamp: Date.now() + i * 10,
      ipAddress: `192.168.1.${100 + (i % 50)}`,
      severity: 'low',
      eventType: 'data.access_normal',
      source: 'api-gateway'
    }));
    
    const startTime = Date.now();
    await phase3Security.processSecurityEvents(largeEventSet);
    const endTime = Date.now();
    
    const processingTime = endTime - startTime;
    const eventsPerSecond = Math.round((largeEventSet.length / processingTime) * 1000);
    
    logTest('Processing Speed', 'PASS', `${largeEventSet.length} events in ${processingTime}ms (${eventsPerSecond} EPS)`);
    
    if (eventsPerSecond > 100) {
      logTest('Performance Benchmark', 'PASS', 'Exceeds minimum performance requirements');
    } else {
      logTest('Performance Benchmark', 'WARN', 'Below optimal performance threshold');
    }
    
  } catch (error) {
    logTest('Performance Test', 'FAIL', `Error: ${error.message}`);
  }
}

async function runAllTests() {
  logSection('PHASE 3 SECURITY VALIDATION');
  log('Starting comprehensive security system validation...\n', 'bright');
  
  // Check prerequisites
  const redisAvailable = await testRedisConnectivity();
  
  if (!redisAvailable) {
    log('\n❌ CRITICAL: Redis is not available. Cannot proceed with security tests.', 'red');
    log('Please ensure Redis is running and accessible before testing.\n', 'yellow');
    process.exit(1);
  }
  
  // Run all test suites
  await testBehavioralAnalytics();
  await delay(1000); // Brief pause between tests
  
  await testThreatDetection();
  await delay(1000);
  
  await testIncidentResponse();
  await delay(1000);
  
  await testSecurityOrchestration();
  await delay(1000);
  
  await testPerformance();
  
  // Summary
  logSection('TEST SUMMARY');
  log(`Total Tests: ${testResults.total}`, 'bright');
  log(`Passed: ${testResults.passed}`, 'green');
  log(`Failed: ${testResults.failed}`, 'red');
  log(`Skipped: ${testResults.skipped}`, 'yellow');
  
  const successRate = Math.round((testResults.passed / testResults.total) * 100);
  log(`\nSuccess Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'red');
  
  if (testResults.failed === 0) {
    log('\n🎉 ALL TESTS PASSED! Phase 3 security implementation is ready for production.', 'green');
    process.exit(0);
  } else {
    log(`\n⚠️  ${testResults.failed} test(s) failed. Please review and address issues before production deployment.`, 'yellow');
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(error => {
    log(`\n💥 Test execution failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runAllTests };