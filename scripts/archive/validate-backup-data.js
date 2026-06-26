#!/usr/bin/env node
/**
 * Validates backup data integrity: counts by organization_id in key tables.
 * Use after restore or to verify demo data consistency.
 *
 * Usage:
 *   node scripts/validate-backup-data.js
 *   ORG_ID=00000000-0000-0000-0000-000000000001 node scripts/validate-backup-data.js
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const orgId = process.env.ORG_ID || '00000000-0000-0000-0000-000000000001';

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY required in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES = [
  { name: 'organizations', filter: 'id', col: 'id' },
  { name: 'branches', filter: 'organization_id', col: 'organization_id' },
  { name: 'customers', filter: 'organization_id', col: 'organization_id' },
  { name: 'orders', filter: 'organization_id', col: 'organization_id' },
  { name: 'quotes', filter: 'organization_id', col: 'organization_id' },
  { name: 'lab_work_orders', filter: 'organization_id', col: 'organization_id' },
  { name: 'appointments', filter: 'organization_id', col: 'organization_id' },
  { name: 'products', filter: 'organization_id', col: 'organization_id' },
  { name: 'admin_users', filter: 'organization_id', col: 'organization_id' },
  { name: 'agreements', filter: 'organization_id', col: 'organization_id' },
  { name: 'field_operations', filter: 'organization_id', col: 'organization_id' },
  { name: 'chat_sessions', filter: 'organization_id', col: 'organization_id' },
];

async function validate() {
  console.log('');
  console.log('=== Validación de datos por organización ===');
  console.log('Org ID:', orgId);
  console.log('Supabase:', supabaseUrl);
  console.log('');

  let hasErrors = false;

  for (const { name, filter } of TABLES) {
    try {
      let query = supabase.from(name).select('*', { count: 'exact', head: true });

      if (filter === 'organization_id') {
        query = query.eq('organization_id', orgId);
      } else if (filter === 'id') {
        query = query.eq('id', orgId);
      }

      const { count, error } = await query;

      if (error) {
        console.log(`  ${name}: ❌ ${error.message}`);
        hasErrors = true;
      } else {
        const c = count ?? 0;
        const ok = filter === 'id' ? c === 1 : c >= 0;
        console.log(`  ${name}: ${c} ${ok ? '✓' : '⚠'}`);
      }
    } catch (e) {
      console.log(`  ${name}: ❌ ${e.message}`);
      hasErrors = true;
    }
  }

  console.log('');
  if (hasErrors) {
    console.log('⚠️  Algunas tablas tuvieron errores.');
    process.exit(1);
  }
  console.log('✓ Validación completada.');
}

validate();
