import { NextRequest } from 'next/server';
import { createTenantClient, createServiceClient } from '@/utils/supabase/tenant-client';
import { getTenantContext, validateTenantAccess, logSecurityEvent } from './tenant-context';

export type ApiContext = {
  tenantId: string;
  userId: string;
  role: 'admin' | 'super_admin' | 'user';
  supabase: ReturnType<typeof createTenantClient>;
};

/**
 * Get authenticated tenant context for API routes
 */
export async function getApiContext(request: NextRequest): Promise<ApiContext | null> {
  try {
    // Get tenant and user info from headers (set by middleware)
    const tenantId = request.headers.get('x-tenant-id');
    const userId = request.headers.get('x-user-id');
    const role = request.headers.get('x-user-role') as 'admin' | 'super_admin' | 'user';

    if (!tenantId || !userId) {
      return null;
    }

    // Create tenant-aware Supabase client
    const supabase = createTenantClient();

    return {
      tenantId,
      userId,
      role,
      supabase
    };
  } catch (error) {
    console.error('Error getting API context:', error);
    return null;
  }
}

/**
 * Require authentication and tenant access for API routes
 */
export async function requireAuth(request: NextRequest): Promise<ApiContext> {
  const context = await getApiContext(request);
  
  if (!context) {
    throw new Error('Authentication required');
  }

  return context;
}

/**
 * Require super admin access for API routes
 */
export async function requireSuperAdmin(request: NextRequest): Promise<ApiContext> {
  const context = await requireAuth(request);
  
  if (context.role !== 'super_admin') {
    await logSecurityEvent({
      userId: context.userId,
      restaurantId: context.tenantId,
      action: 'unauthorized_super_admin_access',
      resource: request.url,
      success: false,
      userAgent: request.headers.get('user-agent') || '',
      ipAddress: getClientIP(request)
    });
    
    throw new Error('Super admin access required');
  }

  return context;
}

/**
 * Validate tenant access for specific restaurant
 */
export async function validateApiTenantAccess(
  request: NextRequest,
  restaurantId: string
): Promise<ApiContext> {
  const context = await requireAuth(request);
  
  // Super admins can access any tenant
  if (context.role === 'super_admin') {
    return {
      ...context,
      tenantId: restaurantId,
      supabase: createServiceClient()
    };
  }

  // Validate regular user access
  const hasAccess = await validateTenantAccess(
    context.userId,
    restaurantId,
    request.method,
    request.url
  );

  if (!hasAccess) {
    throw new Error('Access denied to this restaurant');
  }

  return {
    ...context,
    tenantId: restaurantId
  };
}

/**
 * Create error response with security logging
 */
export async function createErrorResponse(
  error: Error,
  status: number,
  context?: {
    userId?: string;
    tenantId?: string;
    request: NextRequest;
  }
) {
  if (context) {
    await logSecurityEvent({
      userId: context.userId || 'anonymous',
      restaurantId: context.tenantId || 'unknown',
      action: 'api_error',
      resource: context.request.url,
      success: false,
      error: error.message,
      userAgent: context.request.headers.get('user-agent') || '',
      ipAddress: getClientIP(context.request)
    });
  }

  return Response.json(
    { error: error.message },
    { status }
  );
}

/**
 * Extract client IP from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return request.ip || 'unknown';
}

/**
 * Wrapper for API route handlers with automatic error handling and logging
 */
export function withAuth<T extends any[]>(
  handler: (context: ApiContext, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    try {
      const context = await requireAuth(request);
      return await handler(context, ...args);
    } catch (error) {
      console.error('API error:', error);
      return createErrorResponse(
        error instanceof Error ? error : new Error('Unknown error'),
        error instanceof Error && error.message === 'Authentication required' ? 401 : 403,
        { request }
      );
    }
  };
}

/**
 * Wrapper for super admin API route handlers
 */
export function withSuperAdmin<T extends any[]>(
  handler: (context: ApiContext, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    try {
      const context = await requireSuperAdmin(request);
      return await handler(context, ...args);
    } catch (error) {
      console.error('Super admin API error:', error);
      return createErrorResponse(
        error instanceof Error ? error : new Error('Unknown error'),
        error instanceof Error && error.message === 'Authentication required' ? 401 : 403,
        { request }
      );
    }
  };
}