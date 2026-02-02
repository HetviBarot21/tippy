import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { QRCodeManager } from '@/components/ui/QRCodeManager';

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

  // Get restaurant data and verify admin access
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', params.restaurantId)
    .eq('is_active', true)
    .single();

  if (restaurantError || !restaurant) {
    redirect('/');
  }

  // Verify user is admin of this restaurant
  const { data: adminCheck, error: adminError } = await supabase
    .from('restaurant_admins')
    .select('id, role')
    .eq('restaurant_id', params.restaurantId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (adminError || !adminCheck) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{restaurant.name} Dashboard</h1>
          <p className="text-zinc-400">
            Manage your restaurant's QR codes and tipping system
          </p>
        </div>

        {/* QR Code Management */}
        <QRCodeManager 
          restaurantId={params.restaurantId}
          restaurantName={restaurant.name}
        />
      </div>
    </div>
  );
}