import { createClient } from '@/utils/supabase/server';
import { Database } from '@/types_db';
import { NextRequest } from 'next/server';

export type TenantContext = {
  restaurantId: string;
  userId: string;
  role: 'admin' | 'super_admin' | 'user';
  isActive: boolean;
};

export type TenantUser = Database['public']['Tables']['restaurant_admins']['Row'] & {
  restaurant: Database['public']['Tables']['restaurants']['Row'];
};

/**
 * Extract tenant context from request path
 * Supports patterns like /dashboard/[restaurantId] and /api/restaurants/[id]
 */
export function extractTenantFromPath(pathname: string): string | null {
  // Dashboard routes: /dashboard/[restaurantId]
  const dashboardMatch = pathname.match(/^\/dashboard\/([^\/]+)/);
  if (dashboardMatch) {
    return dashboardMatch[1];
  }

  // API routes: /api/restaurants/[id]
  const apiMatch = pathname.match(/^\/api\/restaurants\/([^\/]+)/);
  if (apiMatch) {
    return apiMatch[1];
  }

  // Tip routes: /tip/[restaurantId]/[tableId]
  const tipMatch = pathname.match(/^\/tip\/([^\/]+)\/[^\/]+/);
  if (tipMatch) {
    return tipMatch[1];
  }

  return null;
}

/**
 * Get tenant context for authenticated user
 */
export async function getTenantContext(restaurantId?: string): Promise<TenantContext | null> {
  const supabase = createClient();
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return null;
    }

    // Check if user is super admin (YourappsLtd admin)
    if (user.email && isSuperAdminEmail(user.email)) {
      return {
        restaurantId: restaurantId || '',
        userId: user.id,
        role: 'super_admin',
        isActive: true
      };
    }

    // If no restaurant ID provided, try to get user's default restaurant
    if (!restaurantId) {
      const { data: adminRecord } = await supabase
        .from('restaurant_admins')
        .select('restaurant_id, role, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!adminRecord) {
        return null;
      }

      restaurantId = adminRecord.restaurant_id;
    }

    // Verify user has access to the specified restaurant
    const { data: adminRecord, error: adminError } = await supabase
      .from('restaurant_admins')
      .select(`
        restaurant_id,
        role,
        is_active,
        restaurant:restaurants(*)
      `)
      .eq('user_id', user.id)
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .single();

    if (adminError || !adminRecord) {
      return null;
    }

    return {
      restaurantId: adminRecord.restaurant_id,
      userId: user.id,
      role: adminRecord.role === 'super_admin' ? 'super_admin' : 'admin',
      isActive: adminRecord.is_active || false
    };

  } catch (error) {
    console.error('Error getting tenant context:', error);
    return null;
  }
}

/**
 * Check if email belongs to super admin (YourappsLtd)
 */
function isSuperAdminEmail(email: string): boolean {
  const superAdminDomains = ['yourapps.co.ke', 'yourappsltd.com'];
  const superAdminEmails = ['admin@tippy.co.ke', 'support@tippy.co.ke'];
  
  return superAdminEmails.includes(email.toLowerCase()) || 
         superAdminDomains.some(domain => email.toLowerCase().endsWith(`@${domain}`));
}

/**
 * Set tenant context in Supabase client for RLS
 */
export async function setTenantContext(restaurantId: string) {
  const supabase = createClient();
  
  try {
    // Set the tenant context for RLS policies
    await supabase.rpc('set_config', {
      setting_name: 'app.current_tenant',
      setting_value: restaurantId,
      is_local: true
    });
  } catch (error) {
    console.error('Error setting tenant context:', error);
  }
}

/**
 * Validate tenant access and log security events
 */
export async function validateTenantAccess(
  userId: string,
  restaurantId: string,
  action: string,
  resource: string
): Promise<boolean> {
  const supabase = createClient();

  try {
    // Check if user has access to restaurant
    const { data: adminRecord } = await supabase
      .from('restaurant_admins')
      .select('id, role, is_active')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .single();

    const hasAccess = !!adminRecord;

    // Log security event
    await logSecurityEvent({
      userId,
      restaurantId,
      action,
      resource,
      success: hasAccess,
      userAgent: '', // Will be set by middleware
      ipAddress: '', // Will be set by middleware
    });

    return hasAccess;

  } catch (error) {
    console.error('Error validating tenant access:', error);
    
    // Log failed validation
    await logSecurityEvent({
      userId,
      restaurantId,
      action,
      resource,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      userAgent: '',
      ipAddress: '',
    });

    return false;
  }
}

/**
 * Log security events for audit trail
 */
export async function logSecurityEvent(event: {
  userId: string;
  restaurantId: string;
  action: string;
  resource: string;
  success: boolean;
  error?: string;
  userAgent: string;
  ipAddress: string;
}) {
  const supabase = createClient();

  try {
    await supabase.from('audit_logs').insert({
      user_id: event.userId,
      restaurant_id: event.restaurantId,
      table_name: 'security_events',
      action: event.action,
      record_id: `${event.resource}_${Date.now()}`,
      new_values: {
        resource: event.resource,
        success: event.success,
        error: event.error,
        user_agent: event.userAgent,
        ip_address: event.ipAddress,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error logging security event:', error);
  }
}