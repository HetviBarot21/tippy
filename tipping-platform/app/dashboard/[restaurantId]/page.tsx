import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { QRCodeManager } from '@/components/ui/QRCodeManager';
import { DistributionGroupManager } from '@/components/ui/DistributionManager';

interface Props {
  params: {
    restaurantId: string;
  };
}

export default async function RestaurantDashboard({ params }: Props) {
  const supabase = createClient();
  
  // For demo purposes, skip authentication and use service role
  // In production, you'd want proper authentication
  
  // Get restaurant data
  const { data: restaurant, error: restaurantError } = await (supabase as any)
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
          {/* QR Code Management */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">QR Code Management</h2>
            <QRCodeManager 
              restaurantId={params.restaurantId}
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