import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getErrorRedirect, getStatusRedirect } from '@/utils/helpers';

export async function GET(request: NextRequest) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the `@supabase/ssr` package. It exchanges an auth code for the user's session.
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createClient();

    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        getErrorRedirect(
          `${requestUrl.origin}/signin`,
          error.name,
          "Sorry, we weren't able to log you in. Please try again."
        )
      );
    }

    // Get user data to determine redirect
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Check if super admin
      const isSuperAdmin = user.email && (
        user.email.endsWith('@yourapps.co.ke') || 
        user.email.endsWith('@yourappsltd.com') ||
        ['admin@tippy.co.ke', 'support@tippy.co.ke'].includes(user.email)
      );

      if (isSuperAdmin) {
        // Redirect super admin to admin dashboard
        return NextResponse.redirect(`${requestUrl.origin}/admin`);
      }

      // Check if restaurant owner
      const restaurantId = user.user_metadata?.restaurant_id;
      if (restaurantId) {
        // Redirect restaurant owner to their dashboard
        return NextResponse.redirect(`${requestUrl.origin}/dashboard/${restaurantId}`);
      }
    }
  }

  // Default redirect to account page
  return NextResponse.redirect(
    getStatusRedirect(
      `${requestUrl.origin}/account`,
      'Success!',
      'You are now signed in.'
    )
  );
}
