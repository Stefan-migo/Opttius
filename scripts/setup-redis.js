/**
 * Redis Development Setup Script
 * 
 * This script helps set up and test Redis locally for development
 * 
 * Usage:
 * node scripts/setup-redis.js
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function checkDocker() {
  try {
    await execAsync('docker --version');
    return true;
  } catch (error) {
    console.log('❌ Docker is not installed or not in PATH');
    console.log('Please install Docker Desktop from https://www.docker.com/products/docker-desktop');
    return false;
  }
}

async function checkRedisContainer() {
  try {
    const { stdout } = await execAsync('docker ps -a --filter "name=opttius-redis" --format "{{.Names}}"');
    return stdout.trim() === 'opttius-redis';
  } catch (error) {
    return false;
  }
}

async function isRedisRunning() {
  try {
    const { stdout } = await execAsync('docker ps --filter "name=opttius-redis" --format "{{.Status}}"');
    return stdout.trim().startsWith('Up');
  } catch (error) {
    return false;
  }
}

async function startRedis() {
  console.log('🚀 Starting Redis container...');
  
  try {
    await execAsync('docker run -d --name opttius-redis -p 6379:6379 redis:7-alpine');
    console.log('✅ Redis container started successfully');
    console.log('   Redis is now running on localhost:6379');
  } catch (error) {
    console.log('❌ Failed to start Redis container:', error.message);
  }
}

async function stopRedis() {
  console.log('🛑 Stopping Redis container...');
  
  try {
    await execAsync('docker stop opttius-redis');
    await execAsync('docker rm opttius-redis');
    console.log('✅ Redis container stopped and removed');
  } catch (error) {
    console.log('❌ Failed to stop Redis container:', error.message);
  }
}

async function main() {
  console.log('🔧 Opttius Redis Setup Script');
  console.log('==============================\n');
  
  // Check if Docker is available
  const hasDocker = await checkDocker();
  if (!hasDocker) {
    return;
  }
  
  // Check if Redis container exists
  const containerExists = await checkRedisContainer();
  const isRunning = await isRedisRunning();
  
  if (containerExists && isRunning) {
    console.log('✅ Redis is already running');
    console.log('   Container: opttius-redis');
    console.log('   Port: 6379');
    console.log('\nTo stop Redis: npm run redis:stop');
    return;
  }
  
  if (containerExists && !isRunning) {
    console.log('⚠️  Redis container exists but is not running');
    console.log('Starting existing container...');
    try {
      await execAsync('docker start opttius-redis');
      console.log('✅ Redis container started');
    } catch (error) {
      console.log('❌ Failed to start existing container, removing and recreating...');
      await stopRedis();
      await startRedis();
    }
    return;
  }
  
  // No container exists, create new one
  console.log('🐳 No Redis container found, creating new one...');
  await startRedis();
}

// Add command line argument support
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--stop')) {
    stopRedis();
  } else {
    main();
  }
}

module.exports = { startRedis, stopRedis, checkDocker, checkRedisContainer, isRedisRunning };