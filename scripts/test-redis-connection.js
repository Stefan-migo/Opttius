/**
 * Redis Connection Test Script
 * 
 * Tests Redis connectivity and basic operations
 * 
 * Usage:
 * node scripts/test-redis-connection.js
 */

// Dynamically import the ES module
async function runTest() {
  const { getRedisClient, initializeRedis, closeRedis, isRedisHealthy } = await import('../src/lib/redis/client.js');

  async function testRedisConnection() {
    console.log('🔍 Testing Redis Connection...\n');
    
    try {
      // Initialize Redis connection
      console.log('1. Initializing Redis connection...');
      await initializeRedis();
      console.log('   ✅ Connection initialized\n');
      
      // Test basic connectivity
      console.log('2. Testing basic connectivity...');
      const isHealthy = await isRedisHealthy();
      if (isHealthy) {
        console.log('   ✅ Redis is healthy and responding\n');
      } else {
        console.log('   ❌ Redis is not responding\n');
        return;
      }
      
      // Test basic operations
      console.log('3. Testing basic Redis operations...');
      const client = getRedisClient();
      
      // Set operation
      const testKey = 'opttius:test:key';
      const testValue = 'Hello Redis!';
      await client.set(testKey, testValue);
      console.log('   ✅ SET operation successful');
      
      // Get operation
      const retrievedValue = await client.get(testKey);
      if (retrievedValue === testValue) {
        console.log('   ✅ GET operation successful\n');
      } else {
        console.log('   ❌ GET operation failed\n');
        return;
      }
      
      // Test expiration
      console.log('4. Testing key expiration...');
      await client.setex(`${testKey}:expiring`, 2, 'This will expire soon');
      const ttl = await client.ttl(`${testKey}:expiring`);
      if (ttl > 0) {
        console.log('   ✅ TTL operation successful\n');
      } else {
        console.log('   ❌ TTL operation failed\n');
      }
      
      // Cleanup
      console.log('5. Cleaning up test data...');
      await client.del(testKey);
      await client.del(`${testKey}:expiring`);
      console.log('   ✅ Test data cleaned up\n');
      
      // Close connection
      console.log('6. Closing Redis connection...');
      await closeRedis();
      console.log('   ✅ Connection closed successfully\n');
      
      console.log('🎉 All Redis tests passed!');
      console.log('\n💡 Next steps:');
      console.log('   - Start using Redis-based rate limiting');
      console.log('   - Implement caching strategies');
      console.log('   - Add session storage');
      
    } catch (error) {
      console.error('❌ Redis test failed:', error.message);
      console.error('Stack:', error.stack);
      
      // Try to close connection anyway
      try {
        await closeRedis();
      } catch (closeError) {
        console.error('Error closing Redis connection:', closeError.message);
      }
      
      process.exit(1);
    }
  }

  // Run the test
  await testRedisConnection();
}

// Run the test when script is executed directly
if (require.main === module) {
  runTest().catch(console.error);
}

module.exports = { runTest };