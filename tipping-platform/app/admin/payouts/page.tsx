import { createServiceClient } from '@/utils/supabase/tenant-client';
import { redirect } from 'next/navigation';
import { PayoutManagement } from '@/components/ui/Admin/PayoutManagement';

export default async function PayoutsPage() {
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

  // Get pending payouts
  const { data: pendingPayouts } = await supabase
    .from('payouts')
    .select(`
      *,
      waiter:waiters(name, phone_number),
      restaurant:restaurants(name)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // Get processing payouts
  const { data: processingPayouts } = await supabase
    .from('payouts')
    .select(`
      *,
      waiter:waiters(name, phone_number),
      restaurant:restaurants(name)
    `)
    .eq('status', 'processing')
    .order('created_at', { ascending: false });

  // Get completed payouts (last 50)
  const { data: completedPayouts } = await supabase
    .from('payouts')
    .select(`
      *,
      waiter:waiters(name, phone_number),
      restaurant:restaurants(name)
    `)
    .eq('status', 'completed')
    .order('processed_at', { ascending: false })
    .limit(50);

  // Get failed payouts
  const { data: failedPayouts } = await supabase
    .from('payouts')
    .select(`
      *,
      waiter:waiters(name, phone_number),
      restaurant:restaurants(name)
    `)
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="min-h-screen bg-gray-50">
      <PayoutManagement
        pendingPayouts={pendingPayouts || []}
        processingPayouts={processingPayouts || []}
        completedPayouts={completedPayouts || []}
        failedPayouts={failedPayouts || []}
        userEmail={user.email || ''}
      />
    </div>
  );
}
