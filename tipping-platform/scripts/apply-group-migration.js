/**
 * Apply the distribution group migration to waiters table
 * Run with: node scripts/apply-group-migration.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  try {
    console.log('📝 Reading migration file...');
    
    const migrationPath = path.join(__dirname, '../supabase/migrations/20240205_add_group_to_waiters.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔧 Applying migration...\n');
    console.log(sql);
    console.log('\n⚠️  Please run this SQL in your Supabase Dashboard:');
    console.log('Go to: Supabase Dashboard → SQL Editor → New Query → Paste the above SQL → Run\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

applyMigration();
