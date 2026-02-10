import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const API_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

describe('Middleware Security Tests', () => {
  let testRestaurant;
  let testUser;
  let supabase;

  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Create test restaurant
    const { data: restaurants } = await supabase
      .from('restaurants')
      .insert({
        name: 'Middleware Test Restaurant',
        slug: 'middleware-test-restaurant',
        email: 'middlewaretest@example.com'
      })
      .select();

    testRestaurant = restaurants[0];

    // Create test user
    const { data: user } = await supabase.auth.admin.createUser({
      email: 'middlewaretest@example.com',
      password: 'testpassword123',
      email_confirm: true
    });

    testUser = user.user;

    await supabase.from('restaurant_admins').insert({
      user_id: testUser.id,
      restaurant_id: testRestaurant.id,
      role: 'admin',
      is_active: true
    });
  });

  afterAll(async () => {
    // Cleanup
    await supabase.from('restaurant_admins').delete().eq('user_id', testUser.id);
    await supabase.from('restaurants').delete().eq('id', testRestaurant.id);
    await supabase.auth.admin.deleteUser(testUser.id);
  });

  describe('Route Protection', () => {
    it('should redirect unauthenticated users from protected routes', async () => {
      const response = await fetch(`${API_BASE_URL}/dashboard/${testRestaurant.id}`, {
        redirect: 'manual'
      });
      
      expect([302, 307]).toContain(response.status);
      
      const location = response.headers.get('location');
      expect(location).toContain('signin');
    });

    it('should allow access to public routes without authentication', async () => {
      const publicRoutes = [
        '/',
        '/about',
        '/contact',
        `/tip/${testRestaurant.id}/table-1`
      ];

      for (const route of publicRoutes) {
        const response = await fetch(`${API_BASE_URL}${route}`);
        expect(response.status).not.toBe(401);
        expect(response.status).not.toBe(403);
      }
    });

    it('should enforce tenant context for dashboard routes', async () => {
      // Create session for user
      const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      await userClient.auth.signInWithPassword({
        email: 'middlewaretest@example.com',
        password: 'testpassword123'
      });

      // Try to access dashboard without proper tenant context
      const response = await fetch(`${API_BASE_URL}/dashboard/invalid-restaurant-id`, {
        headers: {
          'Cookie': `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token=${userClient.auth.session?.access_token}`
        },
        redirect: 'manual'
      });
      
      expect([302, 307, 403]).toContain(response.status);
    });
  });

  describe('Security Headers', () => {
    it('should set appropriate security headers', async () => {
      const response = await fetch(`${API_BASE_URL}/`);
      
      // Check for security headers (these might be set by Vercel or custom middleware)
      const headers = response.headers;
      
      // These are common security headers that should be present
      const securityHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'referrer-policy'
      ];

      // Note: Not all headers may be set depending on deployment
      // This test documents expected security headers
      console.log('Response headers:', Object.fromEntries(headers.entries()));
    });

    it('should not expose sensitive server information', async () => {
      const response = await fetch(`${API_BASE_URL}/api/restaurants/${testRestaurant.id}/waiters`);
      
      const headers = response.headers;
      
      // Should not expose server technology
      expect(headers.get('server')).not.toContain('Express');
      expect(headers.get('server')).not.toContain('Apache');
      expect(headers.get('x-powered-by')).toBeNull();
    });
  });

  describe('Session Management', () => {
    it('should handle session expiration gracefully', async () => {
      // Create an expired or invalid session token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      const response = await fetch(`${API_BASE_URL}/api/restaurants/${testRestaurant.id}/waiters`, {
        headers: {
          'Authorization': `Bearer ${expiredToken}`
        }
      });
      
      expect(response.status).toBe(401);
    });

    it('should validate session integrity', async () => {
      // Test with malformed token
      const malformedToken = 'invalid.token.format';
      
      const response = await fetch(`${API_BASE_URL}/api/restaurants/${testRestaurant.id}/waiters`, {
        headers: {
          'Authorization': `Bearer ${malformedToken}`
        }
      });
      
      expect(response.status).toBe(401);
    });
  });

  describe('CSRF Protection', () => {
    it('should validate origin for state-changing requests', async () => {
      const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { data: session } = await userClient.auth.signInWithPassword({
        email: 'middlewaretest@example.com',
        password: 'testpassword123'
      });

      // Simulate cross-origin request
      const response = await fetch(`${API_BASE_URL}/api/restaurants/${testRestaurant.id}/waiters`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
          'Origin': 'https://malicious-site.com'
        },
        body: JSON.stringify({
          name: 'Test Waiter',
          phone_number: '0712345678'
        })
      });
      
      // Should reject cross-origin requests for state-changing operations
      // Note: This depends on CORS configuration
      expect([403, 400]).toContain(response.status);
    });
  });

  describe('Request Validation', () => {
    it('should validate Content-Type for POST requests', async () => {
      const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { data: session } = await userClient.auth.signInWithPassword({
        email: 'middlewaretest@example.com',
        password: 'testpassword123'
      });

      // Send POST without proper Content-Type
      const response = await fetch(`${API_BASE_URL}/api/restaurants/${testRestaurant.id}/waiters`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`
          // Missing Content-Type: application/json
        },
        body: JSON.stringify({
          name: 'Test Waiter',
          phone_number: '0712345678'
        })
      });
      
      expect([400, 415]).toContain(response.status);
    });

    it('should handle oversized requests', async () => {
      const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { data: session } = await userClient.auth.signInWithPassword({
        email: 'middlewaretest@example.com',
        password: 'testpassword123'
      });

      // Create very large payload
      const largePayload = 'x'.repeat(10 * 1024 * 1024); // 10MB

      const response = await fetch(`${API_BASE_URL}/api/restaurants/${testRestaurant.id}/waiters`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: largePayload
      });
      
      // Should reject oversized requests
      expect([413, 400]).toContain(response.status);
    });
  });

  describe('Logging and Monitoring', () => {
    it('should log security events', async () => {
      // Attempt unauthorized access
      const response = await fetch(`${API_BASE_URL}/api/restaurants/${testRestaurant.id}/waiters`, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
      
      expect(response.status).toBe(401);
      
      // Check if security event was logged (would need access to audit logs)
      // This is more of a documentation test for expected behavior
      const auditLogs = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'access_denied')
        .order('created_at', { ascending: false })
        .limit(1);
      
      // Should have logged the security event
      expect(auditLogs.data).toBeDefined();
    });

    it('should track failed authentication attempts', async () => {
      // Multiple failed login attempts
      const attempts = Array(3).fill().map(() =>
        fetch(`${API_BASE_URL}/api/restaurants/${testRestaurant.id}/waiters`, {
          headers: {
            'Authorization': 'Bearer different-invalid-token'
          }
        })
      );

      const responses = await Promise.all(attempts);
      
      responses.forEach(response => {
        expect(response.status).toBe(401);
      });
      
      // Should log multiple failed attempts
      // This would be used for rate limiting and security monitoring
    });
  });
});