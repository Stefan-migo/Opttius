/**
 * Script to check if organizations table exists
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrganizationsTable() {
  console.log('Checking if organizations table exists...');

  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Error checking organizations table:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error);
      return false;
    }

    console.log('✅ Organizations table exists and is accessible!');
    console.log('Sample data:', data);
    return true;
  } catch (err) {
    console.error('❌ Exception checking organizations table:', err.message);
    return false;
  }
}

checkOrganizationsTable()
  .then((exists) => {
    process.exit(exists ? 0 : 1);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
