import { createClient } from '@/utils/supabase/server';
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
  const supabase = createClient();

  // Validate QR code and get restaurant/table information
  const { data: qrCode, error: qrError } = await supabase
    .from('qr_codes')
    .select(`
      id,
      table_number,
      table_name,
      is_active,
      restaurant:restaurants (
        id,
        name,
        slug,
        commission_rate
      )
    `)
    .eq('id', tableId)
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .single();

  if (qrError || !qrCode) {
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
      restaurant={qrCode.restaurant}
      table={{
        id: qrCode.id,
        number: qrCode.table_number,
        name: qrCode.table_name
      }}
      waiters={waiters || []}
    />
  );
}