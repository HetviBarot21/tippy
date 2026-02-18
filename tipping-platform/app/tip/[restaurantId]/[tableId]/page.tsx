import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import TippingInterface from '@/components/ui/TippingInterface/TippingInterface';

interface PageProps {
  params: {
    restaurantId: string;
    tableId: string;
  };
}

export default async function TipPage({ params }: PageProps) {
  const { restaurantId, tableId } = params;
  
  // Use service role for public tipping page to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Validate QR code and get table information
  const { data: qrCode, error: qrError } = await supabase
    .from('qr_codes')
    .select(`
      id,
      table_number,
      table_name,
      is_active,
      restaurant_id
    `)
    .eq('id', tableId)
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .single();

  if (qrError || !qrCode) {
    console.error('QR Code error:', qrError);
    notFound();
  }

  // Get restaurant information
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id, name, slug, commission_rate')
    .eq('id', restaurantId)
    .single();

  if (restaurantError || !restaurant) {
    console.error('Restaurant error:', restaurantError);
    notFound();
  }

  // Get active waiters for the restaurant
  const { data: waiters, error: waitersError } = await supabase
    .from('waiters')
    .select('id, name, profile_photo_url')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .order('name');

  if (waitersError) {
    console.error('Error fetching waiters:', waitersError);
  }

  return (
    <TippingInterface
      restaurant={restaurant}
      table={{
        id: qrCode.id,
        number: qrCode.table_number,
        name: qrCode.table_name
      }}
      waiters={waiters || []}
    />
  );
}