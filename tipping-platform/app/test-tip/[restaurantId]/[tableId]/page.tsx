import { createClient } from '@supabase/supabase-js';

interface PageProps {
  params: {
    restaurantId: string;
    tableId: string;
  };
}

export default async function TestTipPage({ params }: PageProps) {
  const { restaurantId, tableId } = params;
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: qrCode, error } = await supabase
    .from('qr_codes')
    .select('*')
    .eq('id', tableId)
    .eq('restaurant_id', restaurantId)
    .single();

  return (
    <div style={{ padding: '20px', color: 'white', background: '#111' }}>
      <h1>Test Tip Page</h1>
      <p>Restaurant ID: {restaurantId}</p>
      <p>Table ID: {tableId}</p>
      <hr />
      {error ? (
        <div>
          <h2>Error:</h2>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </div>
      ) : (
        <div>
          <h2>QR Code Data:</h2>
          <pre>{JSON.stringify(qrCode, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
