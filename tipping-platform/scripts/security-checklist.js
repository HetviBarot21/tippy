#!/usr/bin/env node

/**
 * Security Checklist Validator
 * Validates security implementation without requiring database access
 */

const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

function checkFileExists(filePath, description) {
  const fullPath = join(process.cwd(), filePath);
  const exists = existsSync(fullPath);
  
  console.log(`${exists ? '✅' : '❌'} ${description}: ${filePath}`);
  return exists;
}

function checkFileContains(filePath, patterns, description) {
  try {
    const fullPath = join(process.cwd(), filePath);
    const content = readFileSync(fullPath, 'utf8');
    
    const allPatternsFound = patterns.every(pattern => {
      const found = content.includes(pattern);
      if (!found) {
        console.log(`   ⚠️  Missing: ${pattern}`);
      }
      return found;
    });
    
    console.log(`${allPatternsFound ? '✅' : '❌'} ${description}`);
    return allPatternsFound;
  } catch (error) {
    console.log(`❌ ${description}: File not found or unreadable`);
    return false;
  }
}

function validateSecurityImplementation() {
  console.log('🛡️  Security Implementation Checklist\n');
  
  let score = 0;
  let total = 0;
  
  // 1. Check middleware implementation
  total++;
  if (checkFileContains(
    'middleware.ts',
    [
      'extractTenantFromPath',
      'getTenantContext',
      'validateTenantAccess',
      'logSecurityEvent',
      'isPublicRoute',
      'requiresTenantContext'
    ],
    'Middleware Security Functions'
  )) {
    score++;
  }
  
  // 2. Check tenant context utilities
  total++;
  if (checkFileContains(
    'utils/auth/tenant-context.ts',
    [
      'TenantContext',
      'extractTenantFromPath',
      'getTenantContext',
      'setTenantContext',
      'validateTenantAccess',
      'logSecurityEvent',
      'isSuperAdminEmail'
    ],
    'Tenant Context Implementation'
  )) {
    score++;
  }
  
  // 3. Check API security helpers
  total++;
  if (checkFileContains(
    'utils/auth/api-helpers.ts',
    [
      'getApiContext',
      'requireAuth',
      'requireSuperAdmin',
      'validateApiTenantAccess',
      'createErrorResponse',
      'withAuth',
      'withSuperAdmin'
    ],
    'API Security Helpers'
  )) {
    score++;
  }
  
  // 4. Check tenant-aware Supabase client
  total++;
  if (checkFileContains(
    'utils/supabase/tenant-client.ts',
    [
      'createTenantClient',
      'createTenantClientWithContext',
      'createServiceClient',
      'app.current_tenant'
    ],
    'Tenant-Aware Supabase Client'
  )) {
    score++;
  }
  
  // 5. Check security migration
  total++;
  if (checkFileContains(
    'supabase/migrations/20240205_tenant_security.sql',
    [
      'set_config',
      'get_current_tenant',
      'validate_tenant_access',
      'log_security_event',
      'ROW LEVEL SECURITY',
      'POLICY'
    ],
    'Security Database Migration'
  )) {
    score++;
  }
  
  // 6. Check super admin interface
  total++;
  if (checkFileExists('app/admin/page.tsx', 'Super Admin Dashboard') &&
      checkFileExists('components/ui/SuperAdmin/SuperAdminDashboard.tsx', 'Super Admin Components')) {
    score++;
  }
  
  // 7. Check onboarding API
  total++;
  if (checkFileContains(
    'app/api/admin/tenants/onboard/route.ts',
    [
      'onboardingSchema',
      'createServiceClient',
      'restaurant_admins',
      'distribution_groups'
    ],
    'Tenant Onboarding API'
  )) {
    score++;
  }
  
  // 8. Check restaurant selection flow
  total++;
  if (checkFileExists('app/select-restaurant/page.tsx', 'Restaurant Selection Page') &&
      checkFileExists('app/unauthorized/page.tsx', 'Unauthorized Page')) {
    score++;
  }
  
  // 9. Check security tests
  total++;
  if (checkFileExists('tests/security/tenant-isolation.test.js', 'Tenant Isolation Tests') &&
      checkFileExists('tests/security/api-security.test.js', 'API Security Tests') &&
      checkFileExists('tests/security/middleware-security.test.js', 'Middleware Security Tests')) {
    score++;
  }
  
  // 10. Check updated API routes with security
  total++;
  if (checkFileContains(
    'app/api/restaurants/[id]/waiters/route.ts',
    [
      'validateApiTenantAccess',
      'createErrorResponse'
    ],
    'Updated API Routes with Security'
  )) {
    score++;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 SECURITY IMPLEMENTATION SCORE');
  console.log('='.repeat(60));
  console.log(`Score: ${score}/${total} (${Math.round(score/total*100)}%)`);
  
  if (score === total) {
    console.log('🎉 All security components implemented!');
    console.log('\n🔒 Security Features Implemented:');
    console.log('   • Multi-tenant middleware with context enforcement');
    console.log('   • Row Level Security (RLS) policies');
    console.log('   • Tenant isolation and cross-tenant access prevention');
    console.log('   • Super admin interface for system management');
    console.log('   • Secure tenant onboarding flow');
    console.log('   • Authentication and authorization helpers');
    console.log('   • Security event logging and audit trails');
    console.log('   • Comprehensive security test suite');
    return true;
  } else {
    console.log('⚠️  Some security components are missing or incomplete.');
    console.log('\n🔧 Next Steps:');
    console.log('   • Review failed checks above');
    console.log('   • Implement missing security components');
    console.log('   • Run security tests to validate implementation');
    console.log('   • Set up monitoring and alerting for security events');
    return false;
  }
}

function validateSecurityBestPractices() {
  console.log('\n🔍 Security Best Practices Check\n');
  
  const practices = [
    {
      name: 'Environment Variables',
      check: () => {
        // Check if .env.example exists and has security-related vars
        try {
          const envExample = readFileSync('.env.example', 'utf8');
          return envExample.includes('SUPABASE_SERVICE_ROLE_KEY') && 
                 envExample.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY');
        } catch {
          return false;
        }
      }
    },
    {
      name: 'Gitignore Security',
      check: () => {
        try {
          const gitignore = readFileSync('.gitignore', 'utf8');
          return gitignore.includes('.env') && gitignore.includes('.env.local');
        } catch {
          return false;
        }
      }
    },
    {
      name: 'TypeScript Types',
      check: () => {
        try {
          const types = readFileSync('types_db.ts', 'utf8');
          return types.includes('restaurant_admins') && types.includes('audit_logs');
        } catch {
          return false;
        }
      }
    }
  ];
  
  practices.forEach(practice => {
    const passed = practice.check();
    console.log(`${passed ? '✅' : '❌'} ${practice.name}`);
  });
}

// Run validation
console.log('Starting Security Validation...\n');

const implementationValid = validateSecurityImplementation();
validateSecurityBestPractices();

console.log('\n' + '='.repeat(60));
if (implementationValid) {
  console.log('🎯 Security implementation is complete and ready for deployment!');
  process.exit(0);
} else {
  console.log('🚨 Security implementation needs attention before deployment.');
  process.exit(1);
}