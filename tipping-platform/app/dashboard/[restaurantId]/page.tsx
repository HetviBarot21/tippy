import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { DistributionGroupManager } from '@/components/ui/DistributionManager';
import { TipAnalyticsDashboard } from '@/components/ui/Analytics/TipAnalyticsDashboard';
import { WaiterManagementDashboard } from '@/components/ui/WaiterManagement/WaiterManagementDashboard';
import { UniversalQRCode } from '@/components/ui/QRCodeManager/UniversalQRCode';

interface Props {
  params: {
    restaurantId: string;
  };
}

export default async function RestaurantDashboard({ params }: Props) {
  const supabase = createClient();
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/signin');
  }

  // Check if user has access to this restaurant
  const userRestaurantId = user.user_metadata?.restaurant_id;
  const isSuperAdmin = user.email && (
    user.email.endsWith('@yourapps.co.ke') || 
    user.email.endsWith('@yourappsltd.com') ||
    ['admin@tippy.co.ke', 'support@tippy.co.ke'].includes(user.email)
  );

  // Only allow access if user owns this restaurant OR is super admin
  if (!isSuperAdmin && userRestaurantId !== params.restaurantId) {
    redirect('/unauthorized');
  }
  
  // Use service role client to bypass RLS for restaurant data
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Get restaurant data
  const { data: restaurant, error: restaurantError } = await serviceClient
    .from('restaurants')
    .select('*')
    .eq('id', params.restaurantId)
    .eq('is_active', true)
    .single();

  if (restaurantError || !restaurant) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Restaurant Not Found</h1>
          <p className="text-zinc-400">The requested restaurant could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{restaurant.name} Dashboard</h1>
          <p className="text-zinc-400">
            Manage your restaurant's QR codes, tip distribution, and tipping system
          </p>
        </div>

        {/* Dashboard Sections */}
        <div className="space-y-8">
          {/* Tip Analytics */}
          <section>
            <TipAnalyticsDashboard restaurantId={params.restaurantId} />
          </section>

          {/* Waiter Management */}
          <section>
            <WaiterManagementDashboard restaurantId={params.restaurantId} />
          </section>

          {/* QR Code Management */}
          <section>
            <UniversalQRCode 
              restaurantId={params.restaurantId}
              restaurantSlug={restaurant.slug}
              restaurantName={restaurant.name}
            />
          </section>

          {/* Tip Distribution Management */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Tip Distribution Settings</h2>
            <DistributionGroupManager
              restaurantId={params.restaurantId}
              restaurantName={restaurant.name}
            />
          </section>
        </div>
      </div>
    </div>
  );
}