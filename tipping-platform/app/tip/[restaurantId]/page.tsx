import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import TippingInterface from '@/components/ui/TippingInterface/TippingInterface';

interface PageProps {
  params: {
    restaurantId: string;
  };
}

export default async function UniversalTipPage({ params }: PageProps) {
  const { restaurantId } = params;
  
  // Use service role for public tipping page to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get restaurant by slug or ID
  let restaurantQuery = supabase
    .from('restaurants')
    .select('id, name, slug, commission_rate');
  
  // Check if restaurantId is a UUID or slug
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantId);
  
  if (isUUID) {
    restaurantQuery = restaurantQuery.eq('id', restaurantId);
  } else {
    restaurantQuery = restaurantQuery.eq('slug', restaurantId);
  }

  const { data: restaurant, error: restaurantError } = await restaurantQuery.single();

  if (restaurantError || !restaurant) {
    console.error('Restaurant error:', restaurantError);
    notFound();
  }

  // Get active waiters for the restaurant
  const { data: waiters, error: waitersError } = await supabase
    .from('waiters')
    .select('id, name, profile_photo_url')
    .eq('restaurant_id', restaurant.id)
    .eq('is_active', true)
    .order('name');

  if (waitersError) {
    console.error('Error fetching waiters:', waitersError);
  }

  return (
    <TippingInterface
      restaurant={restaurant}
      table={null}
      waiters={waiters || []}
    />
  );
}
