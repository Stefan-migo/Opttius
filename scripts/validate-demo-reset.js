#!/usr/bin/env node
/**
 * Validate Demo Reset
 *
 * Runs reset_demo_organization() against the database to verify the seed
 * completes without constraint violations or other errors.
 *
 * Usage:
 *   npm run validate:demo-reset
 *   node scripts/validate-demo-reset.js
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL (e.g. http://127.0.0.1:54321 for local)
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase environment variables');
  console.error('  Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function validateDemoReset() {
  console.log('Validating demo reset (reset_demo_organization)...');
  const start = Date.now();

  const { error } = await supabase.rpc('reset_demo_organization');

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  if (error) {
    console.error('');
    console.error('Demo reset FAILED');
    console.error('  Error:', error.message || String(error));
    if (error.details) console.error('  Details:', error.details);
    if (error.hint) console.error('  Hint:', error.hint);
    if (error.code) console.error('  Code:', error.code);
    console.error('');
    console.error('See docs/SEED_CONSTRAINTS_REFERENCE.md for constraint values.');
    process.exit(1);
  }

  console.log(`Demo reset OK (${elapsed}s)`);
  process.exit(0);
}

validateDemoReset().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
