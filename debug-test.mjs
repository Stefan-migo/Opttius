
import { vi } from 'vitest';

// Mock logger
vi.mock('@/lib/logger', () => ({
  appLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

// Import after mock
const { getSecurityMonitor } = require('@/lib/security/monitoring');
const { appLogger } = require('@/lib/logger');

console.log('Creating monitor...');
const monitor = getSecurityMonitor();

console.log('Calling logAuthEvent...');
try {
  const result = monitor.logAuthEvent(
    'auth.login_success',
    { username: 'test', sessionId: '123' },
    { userId: 'user123', ipAddress: '192.168.1.1' }
  );
  console.log('Result:', result);
  console.log('Info calls:', appLogger.info.mock.calls.length);
  console.log('Warn calls:', appLogger.warn.mock.calls.length);
  console.log('Debug calls:', appLogger.debug.mock.calls.length);
} catch (error) {
  console.log('Error:', error);
}

