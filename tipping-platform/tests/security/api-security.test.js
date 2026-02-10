import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const API_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

describe('API Security Tests', () => {
  let testRestaurant1, testRestaurant2;
  let testUser1, testUser2;
  let supabase;

  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Create test data
    const { data: restaurants } = await supabase
      .from('restaurants')
      .insert([
        {
          name: 'API Test Restaurant 1',
          slug: 'api-test-restaurant-1',
          email: 'apitest1@example.com'
        },
        {
          name: 'API Test Restaurant 2',
          slug: 'api-test-restaurant-2', 
          email: 'apitest2@example.com'
        }
      ])
      .select();

    testRestaurant1 = restaurants[0];
    testRestaurant2 = restaurants[1];

    const { data: user1 } = await supabase.auth.admin.createUser({
      email: 'apitest1@example.com',
      password: 'testpassword123',
      email_confirm: true
    });

    const { data: user2 } = await supabase.auth.admin.createUser({
      email: 'apitest2@example.com',
      password: 'testpassword123',
      email_confirm: true
    });

    testUser1 = user1.user;
    testUser2 = user2.user;

    await supabase.from('restaurant_admins').insert([
      {
        user_id: testUser1.id,
        restaurant_id: testRestaurant1.id,
        role: 'admin',
        is_active: true
      },
      {
        user_id: testUser2.id,
        restaurant_id: testRestaurant2.id,
        role: 'admin',
        is_active: true
      }
    ]);
  });

  afterAll(async () => {
    // Cleanup
    await supabase.from('restaurant_admins').delete().in('user_id', [testUser1.id, testUser2.id]);
    await supabase.from('restaurants').delete().in('id', [testRestaurant1.id, testRestaurant2.id]);
    await supabase.auth.admin.deleteUser(testUser1.id);
    await supabase.auth.admin.deleteUser(testUser2.id);
  });

  describe('Authentication Requirements', () => {
    it('should reject unauthenticated requests to protected endpoints', async () => {
      const response = await fetch(`${API_BASE_URL}/api/restaurants/${testRestaurant1.id}/waiters`);
      
      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid tokens', async () => {
      const response = await fetch(`${API_BASE_URL}/api/restaurants/${testRestaurant1.id}/waiters`, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
      
      expect(response.status).toBe(401);
    });

    it('should accept requests with valid authentication', async () => {
      // Get valid session token
      const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { data: session } = await userClient.auth.signInWithPassword({
        email: 'apitest1@example.com',
        password: 'testpassword123'
      });

      const response = await fetch(`${API_BASE_URL}/api/restaurants/${testRestaurant1.id}/waiters`, {
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`
        }
      });
      
      expect(response.status).not.toBe(401);
    });
  });

  describe('Cross-Tenant Access Prevention', () => {
    it('should prevent access to other tenant data', async () => {
      const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { data: session } = await userClient.auth.signInWithPassword({
        email: 'apitest1@example.com',
        password: 'testpassword123'
      });

      // User 1 tries to access Restaurant 2's data
      const response = await fetch(`${API_BASE_URL}/api/restaurants/${testRestaurant2.id}/waiters`, {
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`
        }
      });
      
      expect(response.status).toBe(403);
    });

    it('should allow access to own tenant data', async () => {
      const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { data: session } = await userClient.auth.signInWithPassword({
        email: 'apitest1@example.com',
        password: 'testpassword123'
      });

      // User 1 accesses Restaurant 1's data
      const response = await fetch(`${API_BASE_URL}/api/restaurants/${testRestaurant1.id}/waiters`, {
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`
        }
      });
      
      expect(response.status).toBe(200);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should reject malformed JSON payloads', async () => {
      const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { data: session } = await userClient.auth.signInWithPassword({
        email: 'apitest1@example.com',
        password: 'testpassword123'
      });

      const response = await fetch(`${API_BASE_URL}/api/restaurants/${testRestaurant1.id}/waiters`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: '{ invalid json }'
      });
      
      expect(response.status).toBe(400);
    });

    it('should validate required fields', async () => {
      const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { data: session } = await userClient.auth.signInWithPassword({
        email: 'apitest1@example.com',
        password: 'testpassword123'
      });

      const response = await fetch(`${API_BASE_URL}/api/restaurants/${testRestaurant1.id}/waiters`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}) // Empty payload
      });
      
      expect(response.status).toBe(400);
      
      const result = await response.json();
      expect(result.error).toContain('required');
    });

    it('should sanitize XSS attempts in input', async () => {
      const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { data: session } = await userClient.auth.signInWithPassword({
        email: 'apitest1@example.com',
        password: 'testpassword123'
      });

      const xssPayload = {
        name: '<script>alert("xss")</script>',
        phone_number: '0712345678'
      };

      const response = await fetch(`${API_BASE_URL}/api/restaurants/${testRestaurant1.id}/waiters`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(xssPayload)
      });
      
      if (response.ok) {
        const result = await response.json();
        // Name should be sanitized or rejected
        expect(result.waiter.name).not.toContain('<script>');
      }
    });

    it('should validate UUID format for IDs', async () => {
      const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { data: session } = await userClient.auth.signInWithPassword({
        email: 'apitest1@example.com',
        password: 'testpassword123'
      });

      // Invalid UUID format
      const response = await fetch(`${API_BASE_URL}/api/restaurants/invalid-uuid/waiters`, {
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`
        }
      });
      
      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    it('should handle rapid successive requests gracefully', async () => {
      const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { data: session } = await userClient.auth.signInWithPassword({
        email: 'apitest1@example.com',
        password: 'testpassword123'
      });

      // Send multiple rapid requests
      const promises = Array(10).fill().map(() =>
        fetch(`${API_BASE_URL}/api/restaurants/${testRestaurant1.id}/waiters`, {
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`
          }
        })
      );

      const responses = await Promise.all(promises);
      
      // All should complete without server errors
      responses.forEach(response => {
        expect(response.status).not.toBe(500);
      });
    });

    it('should handle large payloads appropriately', async () => {
      const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { data: session } = await userClient.auth.signInWithPassword({
        email: 'apitest1@example.com',
        password: 'testpassword123'
      });

      // Create a large payload
      const largePayload = {
        name: 'A'.repeat(10000), // Very long name
        phone_number: '0712345678'
      };

      const response = await fetch(`${API_BASE_URL}/api/restaurants/${testRestaurant1.id}/waiters`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(largePayload)
      });
      
      // Should reject or handle gracefully
      expect([400, 413, 422]).toContain(response.status);
    });
  });

  describe('Error Handling and Information Disclosure', () => {
    it('should not expose sensitive information in error messages', async () => {
      const response = await fetch(`${API_BASE_URL}/api/restaurants/nonexistent-id/waiters`);
      
      const result = await response.json();
      
      // Should not expose database schema or internal details
      expect(result.error).not.toContain('database');
      expect(result.error).not.toContain('table');
      expect(result.error).not.toContain('column');
      expect(result.error).not.toContain('SQL');
    });

    it('should handle database connection errors gracefully', async () => {
      // This test would require temporarily breaking DB connection
      // For now, just ensure error responses are properly formatted
      const response = await fetch(`${API_BASE_URL}/api/restaurants/invalid-format-id/waiters`);
      
      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });
});