#!/usr/bin/env node
/**
 * Diagnose Quotes-Prescriptions Data Integrity
 *
 * Finds quotes that reference prescriptions not associated with the same customer.
 * Run before applying migrations or to audit data.
 *
 * Usage:
 *   node scripts/diagnose-quotes-prescriptions.js
 *   npm run diagnose:quotes-prescriptions
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function diagnose() {
  console.log('Diagnosing quotes-prescriptions data integrity...\n');

  const { data: quotesWithPresc } = await supabase
    .from('quotes')
    .select('id, quote_number, customer_id, prescription_id')
    .not('prescription_id', 'is', null)
    .limit(500);

  if (!quotesWithPresc?.length) {
    console.log('No quotes with prescription_id found. OK.');
    process.exit(0);
  }

  let issues = 0;

  for (const q of quotesWithPresc) {
    const { data: presc } = await supabase
      .from('prescriptions')
      .select('id, customer_id')
      .eq('id', q.prescription_id)
      .single();

    if (!presc) {
      console.log(`ISSUE: Quote ${q.quote_number} references non-existent prescription ${q.prescription_id}`);
      issues++;
    } else if (presc.customer_id !== q.customer_id) {
      console.log(
        `ISSUE: Quote ${q.quote_number} - prescription belongs to different customer (presc: ${presc.customer_id}, quote: ${q.customer_id})`,
      );
      issues++;
    }
  }

  if (issues === 0) {
    console.log('No data integrity issues found. OK.');
  } else {
    console.log(`\nFound ${issues} issue(s). Fix before applying quote-prescription consistency trigger.`);
    process.exit(1);
  }
  process.exit(0);
}

diagnose().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
