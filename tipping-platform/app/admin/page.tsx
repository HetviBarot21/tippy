import { createServiceClient } from '@/utils/supabase/tenant-client';
import { redirect } from 'next/navigation';
import { SuperAdminDashboard } from '@/components/ui/SuperAdmin/SuperAdminDashboard';

export default async function AdminPage() {
  const supabase = createServiceClient();
  
  // Check if user is authenticated and is super admin
  const { data: { user }, error } = await supabase.auth.getUser();
  
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
    { data: restaurants },
    { data: totalTips },
    { data: totalCommissions },
    { data: activeWaiters },
    { data: recentActivity }
  ] = await Promise.all([
    // Total restaurants
    supabase
      .from('restaurants')
      .select('id, name, slug, is_active, created_at')
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
      .limit(20)
  ]);

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
        restaurants={restaurants || []}
        recentActivity={recentActivity || []}
        userEmail={user.email || ''}
      />
    </div>
  );
}