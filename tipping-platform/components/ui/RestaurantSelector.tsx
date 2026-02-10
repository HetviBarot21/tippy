'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Restaurant = {
  restaurant_id: string;
  role: string;
  restaurant: {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
  } | null;
};

interface RestaurantSelectorProps {
  restaurants: Restaurant[];
  userEmail: string;
}

export function RestaurantSelector({ restaurants, userEmail }: RestaurantSelectorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSelectRestaurant = async (restaurantId: string) => {
    setIsLoading(true);
    
    try {
      // Navigate to the restaurant dashboard
      router.push(`/dashboard/${restaurantId}`);
    } catch (error) {
      console.error('Error selecting restaurant:', error);
      setIsLoading(false);
    }
  };

  const isSuperAdmin = userEmail.endsWith('@yourapps.co.ke') || 
                      userEmail.endsWith('@yourappsltd.com') ||
                      ['admin@tippy.co.ke', 'support@tippy.co.ke'].includes(userEmail);

  if (isSuperAdmin) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <Badge variant="secondary" className="mb-4">
            Super Admin Access
          </Badge>
          <p className="text-sm text-gray-600 mb-4">
            You have super admin access. You can manage all restaurants or access the admin panel.
          </p>
        </div>
        
        <Button 
          onClick={() => router.push('/admin')}
          className="w-full"
          variant="default"
        >
          Access Admin Panel
        </Button>

        {restaurants.length > 0 && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or manage a specific restaurant</span>
              </div>
            </div>

            <div className="space-y-3">
              {restaurants.map((restaurant) => (
                <Card key={restaurant.restaurant_id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{restaurant.restaurant?.name}</h3>
                        <p className="text-sm text-gray-500">Role: {restaurant.role}</p>
                      </div>
                      <Button
                        onClick={() => handleSelectRestaurant(restaurant.restaurant_id)}
                        disabled={isLoading}
                        size="sm"
                      >
                        Select
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  if (restaurants.length === 0) {
    return (
      <div className="text-center space-y-4">
        <div className="text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900">No Restaurant Access</h3>
        <p className="text-sm text-gray-500">
          You don't have access to any restaurants yet. Please contact your administrator to get access.
        </p>
        <Button 
          onClick={() => router.push('/contact')}
          variant="outline"
        >
          Contact Support
        </Button>
      </div>
    );
  }

  if (restaurants.length === 1) {
    // Auto-redirect if user only has access to one restaurant
    const restaurant = restaurants[0];
    handleSelectRestaurant(restaurant.restaurant_id);
    
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Redirecting to {restaurant.restaurant?.name}...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {restaurants.map((restaurant) => (
          <Card key={restaurant.restaurant_id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{restaurant.restaurant?.name}</CardTitle>
              <CardDescription>
                Role: <Badge variant="outline">{restaurant.role}</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                onClick={() => handleSelectRestaurant(restaurant.restaurant_id)}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Loading...' : 'Select Restaurant'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}