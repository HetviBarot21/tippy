import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { Database } from '@/types_db';

/**
 * Create a tenant-aware Supabase client that automatically sets tenant context
 */
export const createTenantClient = () => {
  const cookieStore = cookies();
  const headersList = headers();
  
  const client = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Ignore errors in Server Components
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Ignore errors in Server Components
          }
        }
      }
    }
  );

  // Set tenant context from headers if available
  const tenantId = headersList.get('x-tenant-id');
  if (tenantId) {
    // Set the tenant context for RLS policies
    client.rpc('set_config', {
      setting_name: 'app.current_tenant',
      setting_value: tenantId,
      is_local: true
    }).then().catch(console.error);
  }

  return client;
};

/**
 * Create a Supabase client with explicit tenant context
 */
export const createTenantClientWithContext = async (restaurantId: string) => {
  const client = createTenantClient();
  
  try {
    // Set the tenant context for RLS policies
    await client.rpc('set_config', {
      setting_name: 'app.current_tenant',
      setting_value: restaurantId,
      is_local: true
    });
  } catch (error) {
    console.error('Error setting tenant context:', error);
  }

  return client;
};

/**
 * Create a service role client for admin operations (bypasses RLS)
 */
export const createServiceClient = () => {
  const cookieStore = cookies();
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Ignore errors in Server Components
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Ignore errors in Server Components
          }
        }
      }
    }
  );
};