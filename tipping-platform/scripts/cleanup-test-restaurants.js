/**
 * Script to delete test restaurants from the database
 * Run with: node scripts/cleanup-test-restaurants.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupTestRestaurants() {
  try {
    console.log('🔍 Finding test restaurants...');

    // Find all restaurants with "test" or "distribution" in their name (case insensitive)
    const { data: restaurants, error: fetchError } = await supabase
      .from('restaurants')
      .select('id, name, slug')
      .or('name.ilike.%test%,name.ilike.%distribution%,slug.ilike.%test%');

    if (fetchError) {
      console.error('❌ Error fetching restaurants:', fetchError);
      return;
    }

    if (!restaurants || restaurants.length === 0) {
      console.log('✅ No test restaurants found!');
      return;
    }

    console.log(`\n📋 Found ${restaurants.length} test restaurant(s):`);
    restaurants.forEach(r => {
      console.log(`   - ${r.name} (${r.slug})`);
    });

    console.log('\n🗑️  Deleting test restaurants...');

    // Delete each restaurant (delete audit logs first, then cascade will handle other related records)
    for (const restaurant of restaurants) {
      // First delete audit logs for this restaurant
      const { error: auditError } = await supabase
        .from('audit_logs')
        .delete()
        .eq('restaurant_id', restaurant.id);

      if (auditError) {
        console.error(`⚠️  Warning: Could not delete audit logs for ${restaurant.name}:`, auditError.message);
      }

      // Then delete the restaurant (cascade will handle other related records)
      const { error: deleteError } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', restaurant.id);

      if (deleteError) {
        console.error(`❌ Error deleting ${restaurant.name}:`, deleteError);
      } else {
        console.log(`✅ Deleted: ${restaurant.name}`);
      }
    }

    console.log('\n✨ Cleanup complete!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

cleanupTestRestaurants();
