/**
 * Apply the audit function fix to handle restaurant deletions
 * Run with: node scripts/apply-audit-fix.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyAuditFix() {
  try {
    console.log('📝 Reading migration file...');
    
    const migrationPath = path.join(__dirname, '../supabase/migrations/20240204_fix_audit_delete.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔧 Applying audit function fix...');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If exec_sql doesn't exist, we need to run it differently
      console.log('⚠️  Direct SQL execution not available. Please run this SQL manually in Supabase dashboard:');
      console.log('\n' + sql + '\n');
      console.log('Go to: Supabase Dashboard → SQL Editor → New Query → Paste the above SQL → Run');
    } else {
      console.log('✅ Audit function fix applied successfully!');
    }

  } catch (error) {
    console.error('❌ Error applying fix:', error);
    console.log('\n📋 Please run this SQL manually in Supabase dashboard:');
    const migrationPath = path.join(__dirname, '../supabase/migrations/20240204_fix_audit_delete.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('\n' + sql);
  }
}

applyAuditFix();
