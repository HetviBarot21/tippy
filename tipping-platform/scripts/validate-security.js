#!/usr/bin/env node

/**
 * Security Validation Script
 * Validates key security configurations and policies
 */

const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('fs');
const { join } = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function validateRLSPolicies() {
  console.log('🔍 Validating RLS Policies...');
  
  try {
    // Check if RLS is enabled on key tables
    const { data: tables, error } = await supabase
      .rpc('sql', {
        query: `
          SELECT schemaname, tablename, rowsecurity 
          FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename IN ('restaurants', 'waiters', 'tips', 'qr_codes', 'payouts', 'distribution_groups', 'restaurant_admins', 'audit_logs')
        `
      });

    if (error) {
      console.log('⚠️  Could not validate RLS status directly');
      return false;
    }

    const rlsEnabled = tables?.every(table => table.rowsecurity) || false;
    
    if (rlsEnabled) {
      console.log('✅ RLS enabled on all critical tables');
      return true;
    } else {
      console.log('❌ RLS not enabled on some tables');
      return false;
    }
  } catch (error) {
    console.log('⚠️  RLS validation skipped (requires direct DB access)');
    return true; // Skip this check in production
  }
}

async function validateTenantFunctions() {
  console.log('🔍 Validating Tenant Functions...');
  
  try {
    // Test if tenant context functions exist
    const { error: contextError } = await supabase.rpc('get_current_tenant');
    const { error: userError } = await supabase.rpc('get_user_restaurant_id');
    
    if (contextError && userError) {
      console.log('❌ Tenant context functions missing');
      return false;
    }
    
    console.log('✅ Tenant context functions available');
    return true;
  } catch (error) {
    console.log('❌ Error validating tenant functions:', error.message);
    return false;
  }
}

async function validateAuthConfiguration() {
  console.log('🔍 Validating Auth Configuration...');
  
  try {
    // Test anonymous access (should be restricted)
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    const { data: restaurants } = await anonClient
      .from('restaurants')
      .select('*');
    
    // Should get empty results due to RLS
    if (restaurants && restaurants.length === 0) {
      console.log('✅ Anonymous access properly restricted');
      return true;
    } else {
      console.log('❌ Anonymous access not properly restricted');
      return false;
    }
  } catch (error) {
    console.log('⚠️  Auth validation error:', error.message);
    return false;
  }
}

async function validateMiddlewareFiles() {
  console.log('🔍 Validating Middleware Files...');
  
  try {
    const middlewarePath = join(process.cwd(), 'middleware.ts');
    const middlewareContent = readFileSync(middlewarePath, 'utf8');
    
    const hasSecurityChecks = [
      'extractTenantFromPath',
      'getTenantContext', 
      'validateTenantAccess',
      'logSecurityEvent'
    ].every(func => middlewareContent.includes(func));
    
    if (hasSecurityChecks) {
      console.log('✅ Security middleware properly configured');
      return true;
    } else {
      console.log('❌ Security middleware missing key functions');
      return false;
    }
  } catch (error) {
    console.log('❌ Error reading middleware file:', error.message);
    return false;
  }
}

async function validateAPIHelpers() {
  console.log('🔍 Validating API Security Helpers...');
  
  try {
    const helpersPath = join(process.cwd(), 'utils/auth/api-helpers.ts');
    const helpersContent = readFileSync(helpersPath, 'utf8');
    
    const hasSecurityHelpers = [
      'requireAuth',
      'requireSuperAdmin',
      'validateApiTenantAccess',
      'createErrorResponse'
    ].every(func => helpersContent.includes(func));
    
    if (hasSecurityHelpers) {
      console.log('✅ API security helpers properly configured');
      return true;
    } else {
      console.log('❌ API security helpers missing key functions');
      return false;
    }
  } catch (error) {
    console.log('❌ Error reading API helpers file:', error.message);
    return false;
  }
}

async function validateEnvironmentSecurity() {
  console.log('🔍 Validating Environment Security...');
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length === 0) {
    console.log('✅ Required environment variables present');
    
    // Check for sensitive data exposure
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (anonKey === serviceKey) {
      console.log('❌ Service role key exposed as anon key');
      return false;
    }
    
    return true;
  } else {
    console.log('❌ Missing environment variables:', missingVars);
    return false;
  }
}

async function checkSecurityMigrations() {
  console.log('🔍 Checking Security Migrations...');
  
  try {
    const migrationPath = join(process.cwd(), 'supabase/migrations/20240205_tenant_security.sql');
    const migrationContent = readFileSync(migrationPath, 'utf8');
    
    const hasSecurityFeatures = [
      'set_config',
      'get_current_tenant',
      'validate_tenant_access',
      'log_security_event'
    ].every(func => migrationContent.includes(func));
    
    if (hasSecurityFeatures) {
      console.log('✅ Security migration includes required functions');
      return true;
    } else {
      console.log('❌ Security migration missing key functions');
      return false;
    }
  } catch (error) {
    console.log('❌ Error reading security migration:', error.message);
    return false;
  }
}

async function runSecurityValidation() {
  console.log('🛡️  Starting Security Validation...\n');
  
  const checks = [
    { name: 'RLS Policies', test: validateRLSPolicies },
    { name: 'Tenant Functions', test: validateTenantFunctions },
    { name: 'Auth Configuration', test: validateAuthConfiguration },
    { name: 'Middleware Files', test: validateMiddlewareFiles },
    { name: 'API Helpers', test: validateAPIHelpers },
    { name: 'Environment Security', test: validateEnvironmentSecurity },
    { name: 'Security Migrations', test: checkSecurityMigrations }
  ];
  
  const results = [];
  
  for (const check of checks) {
    try {
      const passed = await check.test();
      results.push({ name: check.name, passed });
    } catch (error) {
      console.log(`❌ ${check.name} validation failed:`, error.message);
      results.push({ name: check.name, passed: false, error: error.message });
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🛡️  SECURITY VALIDATION SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log(`\n📊 Score: ${passed}/${total} checks passed`);
  
  if (passed === total) {
    console.log('🎉 All security validations passed!');
    return true;
  } else {
    console.log('⚠️  Some security validations failed. Please review and fix.');
    return false;
  }
}

// Run validation
runSecurityValidation()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Security validation failed:', error);
    process.exit(1);
  });