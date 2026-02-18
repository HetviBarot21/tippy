/**
 * Script to create a restaurant owner user
 * Run with: node scripts/create-restaurant-owner.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createRestaurantOwner() {
  console.log('🔧 Creating restaurant owner user...\n');

  // Mama Mia owner
  const ownerEmail = 'owner@mamamia.co.ke';
  const ownerPassword = 'Owner123!@#';
  const restaurantId = '12345678-1234-4567-8901-123456789012';

  try {
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
      user_metadata: {
        role: 'restaurant_owner',
        restaurant_id: restaurantId,
        name: 'Mama Mia Owner'
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('ℹ️  User already exists');
        console.log('\n✅ Restaurant Owner Login Credentials:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📧 Email:    ${ownerEmail}`);
        console.log(`🔑 Password: ${ownerPassword}`);
        console.log(`🏪 Restaurant: Mama Mia Italian Restaurant`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('🌐 Login at: http://localhost:3000/signin');
        console.log(`📊 Dashboard: http://localhost:3000/dashboard/${restaurantId}\n`);
        return;
      }
      throw authError;
    }

    console.log('✅ Restaurant owner user created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    ', ownerEmail);
    console.log('🔑 Password: ', ownerPassword);
    console.log('🏪 Restaurant: Mama Mia Italian Restaurant');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🌐 Login at: http://localhost:3000/signin');
    console.log(`📊 Dashboard: http://localhost:3000/dashboard/${restaurantId}\n`);
    console.log('⚠️  IMPORTANT: Change this password after first login!\n');

  } catch (error) {
    console.error('❌ Error creating restaurant owner:', error.message);
    process.exit(1);
  }
}

createRestaurantOwner();
