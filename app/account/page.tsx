import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

// Simple user info component for the tipping system
function UserInfo({ userEmail }: { userEmail: string }) {
  return (
    <div className="p-4 bg-zinc-900 rounded-lg">
      <h3 className="text-lg font-medium text-white mb-2">Account Information</h3>
      <p className="text-zinc-300">Email: {userEmail}</p>
    </div>
  );
}

// Restaurant admin info component
function RestaurantAdminInfo({ restaurants }: { restaurants: any[] }) {
  if (!restaurants || restaurants.length === 0) {
    return (
      <div className="p-4 bg-zinc-900 rounded-lg">
        <h3 className="text-lg font-medium text-white mb-2">Restaurant Access</h3>
        <p className="text-zinc-400">No restaurant access found. Contact your administrator to get access to a restaurant.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-zinc-900 rounded-lg">
      <h3 className="text-lg font-medium text-white mb-2">Restaurant Access</h3>
      <div className="space-y-2">
        {restaurants.map((admin) => (
          <div key={admin.id} className="p-3 bg-zinc-800 rounded">
            <p className="text-white font-medium">{admin.restaurant.name}</p>
            <p className="text-zinc-400 text-sm">Role: {admin.role}</p>
            <p className="text-zinc-400 text-sm">Status: {admin.is_active ? 'Active' : 'Inactive'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function Account() {
  const supabase = createClient();
  
  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return redirect('/signin');
  }

  // Get restaurant admin records for this user
  const { data: restaurantAdmins, error: adminError } = await supabase
    .from('restaurant_admins')
    .select(`
      id,
      role,
      is_active,
      restaurant:restaurants(
        id,
        name,
        slug
      )
    `)
    .eq('user_id', user.id);

  return (
    <section className="mb-32 bg-black">
      <div className="max-w-6xl px-4 py-8 mx-auto sm:px-6 sm:pt-24 lg:px-8">
        <div className="sm:align-center sm:flex sm:flex-col">
          <h1 className="text-4xl font-extrabold text-white sm:text-center sm:text-6xl">
            Account
          </h1>
          <p className="max-w-2xl m-auto mt-5 text-xl text-zinc-200 sm:text-center sm:text-2xl">
            Manage your Tippy account and restaurant access.
          </p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <UserInfo userEmail={user.email || ''} />
        <RestaurantAdminInfo restaurants={restaurantAdmins || []} />
      </div>
    </section>
  );
}
