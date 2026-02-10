import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';
import { 
  extractTenantFromPath, 
  getTenantContext, 
  setTenantContext,
  validateTenantAccess,
  logSecurityEvent 
} from '@/utils/auth/tenant-context';

export async function middleware(request: NextRequest) {
  // First, update the session
  const response = await updateSession(request);
  
  // Skip tenant validation for public routes
  if (isPublicRoute(request.nextUrl.pathname)) {
    return response;
  }

  // Skip tenant validation for static files and API routes that don't need it
  if (shouldSkipTenantValidation(request.nextUrl.pathname)) {
    return response;
  }

  try {
    // Extract tenant ID from the request path
    const tenantId = extractTenantFromPath(request.nextUrl.pathname);
    
    if (!tenantId) {
      // If no tenant ID in path but route requires it, redirect to tenant selection
      if (requiresTenantContext(request.nextUrl.pathname)) {
        return NextResponse.redirect(new URL('/select-restaurant', request.url));
      }
      return response;
    }

    // Get tenant context for the current user
    const tenantContext = await getTenantContext(tenantId);
    
    if (!tenantContext) {
      // User doesn't have access to this tenant
      await logSecurityEvent({
        userId: 'anonymous',
        restaurantId: tenantId,
        action: 'access_denied',
        resource: request.nextUrl.pathname,
        success: false,
        error: 'No tenant access',
        userAgent: request.headers.get('user-agent') || '',
        ipAddress: getClientIP(request)
      });

      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // Validate specific tenant access for protected routes
    if (isProtectedRoute(request.nextUrl.pathname)) {
      const hasAccess = await validateTenantAccess(
        tenantContext.userId,
        tenantId,
        request.method,
        request.nextUrl.pathname
      );

      if (!hasAccess) {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }

    // Set tenant context for RLS
    await setTenantContext(tenantId);

    // Add tenant context to request headers for API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-tenant-id', tenantId);
    requestHeaders.set('x-user-id', tenantContext.userId);
    requestHeaders.set('x-user-role', tenantContext.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  } catch (error) {
    console.error('Middleware error:', error);
    
    // Log the error
    await logSecurityEvent({
      userId: 'system',
      restaurantId: extractTenantFromPath(request.nextUrl.pathname) || 'unknown',
      action: 'middleware_error',
      resource: request.nextUrl.pathname,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown middleware error',
      userAgent: request.headers.get('user-agent') || '',
      ipAddress: getClientIP(request)
    });

    // Allow request to continue but without tenant context
    return response;
  }
}

/**
 * Check if route is public and doesn't require authentication
 */
function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    '/auth',
    '/signin',
    '/signup',
    '/api/auth',
    '/api/webhooks',
    '/tip', // Tipping interface is public
    '/',
    '/about',
    '/contact'
  ];

  return publicRoutes.some(route => pathname.startsWith(route));
}

/**
 * Check if route requires tenant context
 */
function requiresTenantContext(pathname: string): boolean {
  const tenantRoutes = [
    '/dashboard',
    '/api/restaurants',
    '/admin'
  ];

  return tenantRoutes.some(route => pathname.startsWith(route));
}

/**
 * Check if route is protected and requires additional validation
 */
function isProtectedRoute(pathname: string): boolean {
  const protectedRoutes = [
    '/dashboard',
    '/api/restaurants',
    '/api/admin'
  ];

  return protectedRoutes.some(route => pathname.startsWith(route));
}

/**
 * Check if tenant validation should be skipped
 */
function shouldSkipTenantValidation(pathname: string): boolean {
  const skipRoutes = [
    '/_next',
    '/favicon.ico',
    '/api/health',
    '/api/status',
    '/select-restaurant',
    '/unauthorized'
  ];

  return skipRoutes.some(route => pathname.startsWith(route));
}

/**
 * Extract client IP address from request
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

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
};
