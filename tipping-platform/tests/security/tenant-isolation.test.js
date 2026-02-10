import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

describe('Tenant Isolation Security Tests', () => {
  let supabase;
  let testRestaurant1, testRestaurant2;
  let testUser1, testUser2;

  before(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create test restaurants
    const { data: restaurants } = await supabase
      .from('restaurants')
      .insert([
        {
          name: 'Test Restaurant 1',
          slug: 'test-restaurant-1',
          email: 'test1@example.com'
        },
        {
          name: 'Test Restaurant 2', 
          slug: 'test-restaurant-2',
          email: 'test2@example.com'
        }
      ])
      .select();

    testRestaurant1 = restaurants[0];
    testRestaurant2 = restaurants[1];

    // Create test users
    const { data: user1 } = await supabase.auth.admin.createUser({
      email: 'testuser1@example.com',
      password: 'testpassword123',
      email_confirm: true
    });

    const { data: user2 } = await supabase.auth.admin.createUser({
      email: 'testuser2@example.com', 
      password: 'testpassword123',
      email_confirm: true
    });

    testUser1 = user1.user;
    testUser2 = user2.user;

    // Create restaurant admin associations
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

  after(async () => {
    // Cleanup test data
    await supabase.from('restaurant_admins').delete().in('user_id', [testUser1.id, testUser2.id]);
    await supabase.from('restaurants').delete().in('id', [testRestaurant1.id, testRestaurant2.id]);
    await supabase.auth.admin.deleteUser(testUser1.id);
    await supabase.auth.admin.deleteUser(testUser2.id);
  });

  describe('RLS Policy Enforcement', () => {
    it('should prevent cross-tenant data access in restaurants table', async () => {
      // Create client for user 1
      const user1Client = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      await user1Client.auth.signInWithPassword({
        email: 'testuser1@example.com',
        password: 'testpassword123'
      });

      // Set tenant context for restaurant 1
      await user1Client.rpc('set_config', {
        setting_name: 'app.current_tenant',
        setting_value: testRestaurant1.id,
        is_local: true
      });

      // Try to access restaurant 2 data (should fail)
      const { data: restaurants, error } = await user1Client
        .from('restaurants')
        .select('*')
        .eq('id', testRestaurant2.id);

      assert.strictEqual(restaurants.length, 0);
      assert.strictEqual(error, null); // RLS should silently filter, not error
    });

    it('should allow access to own tenant data', async () => {
      const user1Client = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      await user1Client.auth.signInWithPassword({
        email: 'testuser1@example.com',
        password: 'testpassword123'
      });

      // Set tenant context for restaurant 1
      await user1Client.rpc('set_config', {
        setting_name: 'app.current_tenant',
        setting_value: testRestaurant1.id,
        is_local: true
      });

      // Access own restaurant data (should succeed)
      const { data: restaurants, error } = await user1Client
        .from('restaurants')
        .select('*')
        .eq('id', testRestaurant1.id);

      assert.strictEqual(error, null);
      assert.strictEqual(restaurants.length, 1);
      assert.strictEqual(restaurants[0].id, testRestaurant1.id);
    });

    it('should prevent cross-tenant waiter access', async () => {
      // Create waiters for both restaurants
      await supabase.from('waiters').insert([
        {
          restaurant_id: testRestaurant1.id,
          name: 'Waiter 1',
          phone_number: '0712345678'
        },
        {
          restaurant_id: testRestaurant2.id,
          name: 'Waiter 2', 
          phone_number: '0712345679'
        }
      ]);

      const user1Client = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      await user1Client.auth.signInWithPassword({
        email: 'testuser1@example.com',
        password: 'testpassword123'
      });

      // Set tenant context for restaurant 1
      await user1Client.rpc('set_config', {
        setting_name: 'app.current_tenant',
        setting_value: testRestaurant1.id,
        is_local: true
      });

      // Try to access all waiters (should only see restaurant 1's waiters)
      const { data: waiters, error } = await user1Client
        .from('waiters')
        .select('*');

      assert.strictEqual(error, null);
      assert.ok(waiters.every(waiter => waiter.restaurant_id === testRestaurant1.id));
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      
      const { data, error } = await anonClient
        .from('restaurants')
        .select('*');

      // Should get empty result due to RLS, not an error
      assert.strictEqual(data.length, 0);
    });

    it('should validate tenant context is set', async () => {
      const user1Client = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      await user1Client.auth.signInWithPassword({
        email: 'testuser1@example.com',
        password: 'testpassword123'
      });

      // Don't set tenant context
      const { data: restaurants } = await user1Client
        .from('restaurants')
        .select('*');

      // Without tenant context, should get no results
      assert.strictEqual(restaurants.length, 0);
    });

    it('should prevent privilege escalation', async () => {
      const user1Client = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      await user1Client.auth.signInWithPassword({
        email: 'testuser1@example.com',
        password: 'testpassword123'
      });

      // Try to access service role functions (should fail)
      const { error } = await user1Client
        .from('restaurants')
        .insert({
          name: 'Unauthorized Restaurant',
          slug: 'unauthorized',
          email: 'unauthorized@example.com'
        });

      // Should fail due to RLS policies
      assert.ok(error);
    });
  });

  describe('Data Integrity', () => {
    it('should prevent SQL injection in tenant context', async () => {
      const user1Client = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      await user1Client.auth.signInWithPassword({
        email: 'testuser1@example.com',
        password: 'testpassword123'
      });

      // Try SQL injection in tenant context
      const maliciousInput = "'; DROP TABLE restaurants; --";
      
      try {
        await user1Client.rpc('set_config', {
          setting_name: 'app.current_tenant',
          setting_value: maliciousInput,
          is_local: true
        });

        // Query should not execute malicious SQL
        const { data } = await user1Client
          .from('restaurants')
          .select('*');

        // Should get empty result, not crash
        assert.ok(Array.isArray(data));
      } catch (error) {
        // If it throws, it should be a validation error, not SQL error
        assert.ok(!error.message.includes('syntax error'));
      }
    });

    it('should validate UUID format for tenant IDs', async () => {
      const user1Client = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      await user1Client.auth.signInWithPassword({
        email: 'testuser1@example.com',
        password: 'testpassword123'
      });

      // Try invalid UUID format
      const invalidUuid = 'not-a-uuid';
      
      const { error } = await user1Client.rpc('set_config', {
        setting_name: 'app.current_tenant',
        setting_value: invalidUuid,
        is_local: true
      });

      // Should handle invalid UUID gracefully
      assert.strictEqual(error, null); // Function should not error
      
      const { data } = await user1Client
        .from('restaurants')
        .select('*');

      // Should get no results with invalid tenant ID
      assert.strictEqual(data.length, 0);
    });
  });
});