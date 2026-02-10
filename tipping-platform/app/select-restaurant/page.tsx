import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { RestaurantSelector } from '@/components/ui/RestaurantSelector';

export default async function SelectRestaurantPage() {
  const supabase = createClient();
  
  // Check if user is authenticated
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect('/signin');
  }

  // Get user's restaurant associations
  const { data: restaurants, error: restaurantsError } = await supabase
    .from('restaurant_admins')
    .select(`
      restaurant_id,
      role,
      is_active,
      restaurant:restaurants(
        id,
        name,
        slug,
        is_active
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (restaurantsError) {
    console.error('Error fetching restaurants:', restaurantsError);
  }

  const activeRestaurants = restaurants?.filter(r => r.restaurant?.is_active) || [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Select Restaurant
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Choose which restaurant you'd like to manage
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <RestaurantSelector 
            restaurants={activeRestaurants}
            userEmail={user.email || ''}
          />
        </div>
      </div>
    </div>
  );
}