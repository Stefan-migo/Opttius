#!/usr/bin/env node

/**
 * Script to fix Phase 2 security test failures
 * Addresses missing methods, type mismatches, and configuration issues
 */

const fs = require('fs');
const path = require('path');

const testFilePath = path.join(__dirname, '../src/__tests__/security/phase2-security.test.ts');

console.log('🔧 Fixing Phase 2 security test failures...\n');

try {
  let content = fs.readFileSync(testFilePath, 'utf8');
  
  // Fix 1: Replace logGenericEvent calls with logEvent calls
  content = content.replace(/monitor\.logGenericEvent\(/g, 'monitor.logEvent(');
  
  // Fix 2: Fix SecurityAlert structure - remove eventType and source, add title/description
  content = content.replace(
    /const alert: SecurityAlert = \{\s+id: 'alert-test-1',\s+timestamp: new Date\(\)\.toISOString\(\),\s+eventType: 'SECURITY_INCIDENT',\s+severity: 'high',\s+source: 'security-monitor'/g,
    "const alert: SecurityAlert = {\n      id: 'alert-test-1',\n      title: 'Security Incident Detected',\n      description: 'A security incident was detected',\n      severity: 'high',\n      timestamp: new Date().toISOString(),\n      relatedEvents: [],\n      recommendedActions: []"
  );
  
  content = content.replace(
    /const alert: SecurityAlert = \{\s+id: 'alert-test-2',\s+timestamp: new Date\(\)\.toISOString\(\),\s+eventType: 'RATE_LIMIT_VIOLATION',\s+severity: 'medium',\s+source: 'rate-limiter'/g,
    "const alert: SecurityAlert = {\n      id: 'alert-test-2',\n      title: 'Rate Limit Violation',\n      description: 'Rate limit violation detected',\n      severity: 'medium',\n      timestamp: new Date().toISOString(),\n      relatedEvents: [],\n      recommendedActions: []"
  );
  
  content = content.replace(
    /const criticalAlert: SecurityAlert = \{\s+id: 'alert-test-3',\s+timestamp: new Date\(\)\.toISOString\(\),\s+eventType: 'SYSTEM_COMPROMISE',\s+severity: 'critical',\s+source: 'intrusion-detection'/g,
    "const criticalAlert: SecurityAlert = {\n      id: 'alert-test-3',\n      title: 'System Compromise Detected',\n      description: 'Potential system compromise detected',\n      severity: 'critical',\n      timestamp: new Date().toISOString(),\n      relatedEvents: [],\n      recommendedActions: []"
  );
  
  // Fix 3: Fix logAuthEvent calls - they need proper eventType parameter
  content = content.replace(
    /monitor\.logAuthEvent\(event\)/g,
    "monitor.logAuthEvent(event.eventType as any, event.details || {}, { userId: event.userId, ipAddress: event.ipAddress })"
  );
  
  // Fix 4: Fix sendAlert calls to match actual method signature
  const sendAlertPattern = /await alerting\.sendAlert\(\s+([^,]+),\s+([^,]+),\s+([^,]+),\s+([^,]+),\s+([^\)]+)\)/g;
  content = content.replace(sendAlertPattern, 
    "await alerting.sendAlert($1, $2, $3, $4 as SecurityEvent[], $5)"
  );
  
  fs.writeFileSync(testFilePath, content, 'utf8');
  
  console.log('✅ Applied all fixes to phase2-security.test.ts');
  console.log('📊 Current status: 5/20 tests passing (25%)');
  console.log('🎯 Goal: Achieve higher pass rate\n');
  
  console.log('Running tests to verify fixes...');
  
  // Execute the test command
  const { execSync } = require('child_process');
  try {
    const output = execSync('npx vitest run src/__tests__/security/phase2-security.test.ts', {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
      encoding: 'utf8'
    });
    console.log(output);
  } catch (error) {
    console.log('Test output:');
    console.log(error.stdout || error.message);
    if (error.stderr) {
      console.log('Errors:');
      console.log(error.stderr);
    }
  }
  
} catch (error) {
  console.error('❌ Error fixing tests:', error.message);
  process.exit(1);
}