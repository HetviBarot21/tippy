require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Use service role to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function seedDemoData() {
  console.log('🌱 Seeding demo data...');

  try {
    // Create demo restaurants
    const restaurants = [
      {
        id: '12345678-1234-4567-8901-123456789012',
        name: 'Mama Mia Italian Restaurant',
        email: 'admin@mamamia.co.ke',
        slug: 'mama-mia-italian',
        commission_rate: 10,
        is_active: true,
        address: 'Westlands, Nairobi',
        phone_number: '+254712345678'
      },
      {
        id: '12345678-1234-4567-8901-123456789013',
        name: 'Nyama Choma Palace',
        email: 'info@nyamachoma.co.ke',
        slug: 'nyama-choma-palace',
        commission_rate: 8,
        is_active: true,
        address: 'Karen, Nairobi',
        phone_number: '+254722345678'
      },
      {
        id: '12345678-1234-4567-8901-123456789014',
        name: 'Ocean Breeze Seafood',
        email: 'hello@oceanbreeze.co.ke',
        slug: 'ocean-breeze-seafood',
        commission_rate: 12,
        is_active: true,
        address: 'Diani Beach, Mombasa',
        phone_number: '+254732345678'
      }
    ];

    console.log('Creating restaurants...');
    const { data: createdRestaurants, error: restaurantError } = await supabase
      .from('restaurants')
      .upsert(restaurants, { onConflict: 'id' })
      .select();

    if (restaurantError) {
      console.error('Error creating restaurants:', restaurantError);
      return;
    }

    console.log(`✅ Created ${createdRestaurants.length} restaurants`);

    // Create waiters for each restaurant
    const waiters = [
      // Mama Mia waiters
      {
        id: '12345678-1234-4567-8901-123456789020',
        name: 'John Kamau',
        phone_number: '254712000001',
        restaurant_id: '12345678-1234-4567-8901-123456789012',
        is_active: true,
        email: 'john@mamamia.co.ke'
      },
      {
        id: '12345678-1234-4567-8901-123456789021',
        name: 'Mary Wanjiku',
        phone_number: '254712000002',
        restaurant_id: '12345678-1234-4567-8901-123456789012',
        is_active: true,
        email: 'mary@mamamia.co.ke'
      },
      // Nyama Choma waiters
      {
        id: '12345678-1234-4567-8901-123456789022',
        name: 'Peter Otieno',
        phone_number: '254712000003',
        restaurant_id: '12345678-1234-4567-8901-123456789013',
        is_active: true,
        email: 'peter@nyamachoma.co.ke'
      },
      {
        id: '12345678-1234-4567-8901-123456789023',
        name: 'Grace Akinyi',
        phone_number: '254712000004',
        restaurant_id: '12345678-1234-4567-8901-123456789013',
        is_active: true,
        email: 'grace@nyamachoma.co.ke'
      },
      // Ocean Breeze waiters
      {
        id: '12345678-1234-4567-8901-123456789024',
        name: 'Hassan Ali',
        phone_number: '254712000005',
        restaurant_id: '12345678-1234-4567-8901-123456789014',
        is_active: true,
        email: 'hassan@oceanbreeze.co.ke'
      }
    ];

    console.log('Creating waiters...');
    const { data: createdWaiters, error: waiterError } = await supabase
      .from('waiters')
      .upsert(waiters, { onConflict: 'id' })
      .select();

    if (waiterError) {
      console.error('Error creating waiters:', waiterError);
      return;
    }

    console.log(`✅ Created ${createdWaiters.length} waiters`);

    // Create QR codes/tables for each restaurant
    const qrCodes = [
      // Mama Mia tables
      {
        id: '12345678-1234-4567-8901-123456789030',
        restaurant_id: '12345678-1234-4567-8901-123456789012',
        table_number: '1',
        table_name: 'Window Table',
        qr_data: JSON.stringify({
          restaurantId: '12345678-1234-4567-8901-123456789012',
          tableId: '12345678-1234-4567-8901-123456789030'
        }),
        is_active: true
      },
      {
        id: '12345678-1234-4567-8901-123456789031',
        restaurant_id: '12345678-1234-4567-8901-123456789012',
        table_number: '2',
        table_name: 'Patio Table',
        qr_data: JSON.stringify({
          restaurantId: '12345678-1234-4567-8901-123456789012',
          tableId: '12345678-1234-4567-8901-123456789031'
        }),
        is_active: true
      },
      // Nyama Choma tables
      {
        id: '12345678-1234-4567-8901-123456789032',
        restaurant_id: '12345678-1234-4567-8901-123456789013',
        table_number: '1',
        table_name: 'Garden View',
        qr_data: JSON.stringify({
          restaurantId: '12345678-1234-4567-8901-123456789013',
          tableId: '12345678-1234-4567-8901-123456789032'
        }),
        is_active: true
      },
      {
        id: '12345678-1234-4567-8901-123456789033',
        restaurant_id: '12345678-1234-4567-8901-123456789013',
        table_number: '2',
        table_name: 'VIP Section',
        qr_data: JSON.stringify({
          restaurantId: '12345678-1234-4567-8901-123456789013',
          tableId: '12345678-1234-4567-8901-123456789033'
        }),
        is_active: true
      },
      // Ocean Breeze tables
      {
        id: '12345678-1234-4567-8901-123456789034',
        restaurant_id: '12345678-1234-4567-8901-123456789014',
        table_number: '1',
        table_name: 'Ocean View',
        qr_data: JSON.stringify({
          restaurantId: '12345678-1234-4567-8901-123456789014',
          tableId: '12345678-1234-4567-8901-123456789034'
        }),
        is_active: true
      }
    ];

    console.log('Creating QR codes/tables...');
    const { data: createdQRCodes, error: qrError } = await supabase
      .from('qr_codes')
      .upsert(qrCodes, { onConflict: 'id' })
      .select();

    if (qrError) {
      console.error('Error creating QR codes:', qrError);
      return;
    }

    console.log(`✅ Created ${createdQRCodes.length} QR codes/tables`);

    console.log('\n🎉 Demo data seeded successfully!');
    console.log('\n📍 You can now test with these URLs:');
    console.log('🍝 Mama Mia Table 1: http://localhost:3000/tip/12345678-1234-4567-8901-123456789012/12345678-1234-4567-8901-123456789030');
    console.log('🍝 Mama Mia Table 2: http://localhost:3000/tip/12345678-1234-4567-8901-123456789012/12345678-1234-4567-8901-123456789031');
    console.log('🥩 Nyama Choma Table 1: http://localhost:3000/tip/12345678-1234-4567-8901-123456789013/12345678-1234-4567-8901-123456789032');
    console.log('🥩 Nyama Choma Table 2: http://localhost:3000/tip/12345678-1234-4567-8901-123456789013/12345678-1234-4567-8901-123456789033');
    console.log('🐟 Ocean Breeze Table 1: http://localhost:3000/tip/12345678-1234-4567-8901-123456789014/12345678-1234-4567-8901-123456789034');
    
    console.log('\n📊 Admin Dashboards:');
    console.log('🍝 Mama Mia Dashboard: http://localhost:3000/test-dashboard');
    console.log('🥩 Nyama Choma Dashboard: http://localhost:3000/test-dashboard');
    console.log('🐟 Ocean Breeze Dashboard: http://localhost:3000/test-dashboard');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  }
}

// Run if called directly
if (require.main === module) {
  seedDemoData().then(() => process.exit(0));
}

module.exports = { seedDemoData };