import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { SuperAdminDashboard } from '@/components/ui/SuperAdmin/SuperAdminDashboard';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export default async function AdminPage() {
  // Create service role client that bypasses RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  
  // Check if user is authenticated and is super admin
  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        }
      }
    }
  );
  
  const { data: { user }, error } = await authClient.auth.getUser();
  
  if (error || !user) {
    redirect('/signin');
  }

  // Check if user is super admin
  const isSuperAdmin = user.email && (
    user.email.endsWith('@yourapps.co.ke') || 
    user.email.endsWith('@yourappsltd.com') ||
    ['admin@tippy.co.ke', 'support@tippy.co.ke'].includes(user.email)
  );

  if (!isSuperAdmin) {
    redirect('/unauthorized');
  }

  // Get system-wide statistics
  const [
    { data: restaurants, error: restaurantsError },
    { data: totalTips },
    { data: totalCommissions },
    { data: activeWaiters },
    { data: recentActivity },
    { data: allTips }
  ] = await Promise.all([
    // Total restaurants
    supabase
      .from('restaurants')
      .select('id, name, slug, is_active, commission_rate, created_at')
      .order('created_at', { ascending: false }),
    
    // Total tips this month
    supabase
      .from('tips')
      .select('amount, commission_amount, created_at')
      .eq('payment_status', 'completed')
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    
    // Total commissions earned
    supabase
      .from('tips')
      .select('commission_amount')
      .eq('payment_status', 'completed'),
    
    // Active waiters across all restaurants
    supabase
      .from('waiters')
      .select('id, restaurant_id')
      .eq('is_active', true),
    
    // Recent activity (audit logs)
    supabase
      .from('audit_logs')
      .select(`
        *,
        restaurant:restaurants(name)
      `)
      .order('created_at', { ascending: false })
      .limit(20),
    
    // All tips this month by restaurant
    supabase
      .from('tips')
      .select('restaurant_id, commission_amount, created_at')
      .eq('payment_status', 'completed')
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
  ]);

  // Calculate commission per restaurant this month
  const restaurantCommissions = new Map<string, number>();
  allTips?.forEach(tip => {
    const current = restaurantCommissions.get(tip.restaurant_id) || 0;
    restaurantCommissions.set(tip.restaurant_id, current + tip.commission_amount);
  });

  // Add commission data to restaurants
  const restaurantsWithCommission = restaurants?.map(r => ({
    ...r,
    commissionThisMonth: restaurantCommissions.get(r.id) || 0
  })) || [];

  console.log('Restaurants fetched:', restaurants?.length, 'Error:', restaurantsError);
  console.log('First 3 restaurants:', restaurants?.slice(0, 3));

  const stats = {
    totalRestaurants: restaurants?.length || 0,
    activeRestaurants: restaurants?.filter(r => r.is_active)?.length || 0,
    totalTipsThisMonth: totalTips?.reduce((sum, tip) => sum + tip.amount, 0) || 0,
    totalCommissionsThisMonth: totalTips?.reduce((sum, tip) => sum + tip.commission_amount, 0) || 0,
    totalCommissionsAllTime: totalCommissions?.reduce((sum, tip) => sum + tip.commission_amount, 0) || 0,
    activeWaiters: activeWaiters?.length || 0,
    tipsThisMonth: totalTips?.length || 0
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SuperAdminDashboard 
        stats={stats}
        restaurants={restaurantsWithCommission}
        recentActivity={recentActivity || []}
        userEmail={user.email || ''}
      />
    </div>
  );
}