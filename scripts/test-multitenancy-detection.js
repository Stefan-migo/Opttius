/**
 * Script to test multi-tenancy detection
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testMultiTenancyDetection() {
  console.log('Testing multi-tenancy detection...');
  console.log('Supabase URL:', supabaseUrl);

  try {
    // Try to query the organizations table
    const { error, data } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);

    if (error) {
      console.log(`[Test Setup] Organizations table check failed: ${error.message}`);
      console.log('Error code:', error.code);
      console.log('Error details:', error);
      return false;
    }

    console.log(`[Test Setup] Multi-tenancy infrastructure available: ${!error}`);
    console.log('Sample data:', data);
    return !error;
  } catch (err) {
    console.log(`[Test Setup] Exception checking multi-tenancy: ${err?.message}`);
    console.log('Exception details:', err);
    return false;
  }
}

testMultiTenancyDetection()
  .then((available) => {
    console.log('\nResult:', available ? '✅ Available' : '❌ Not Available');
    process.exit(available ? 0 : 1);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
