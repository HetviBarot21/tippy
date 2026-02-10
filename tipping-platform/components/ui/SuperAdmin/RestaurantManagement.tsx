'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { OnboardingForm } from './OnboardingForm';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

interface RestaurantManagementProps {
  restaurants: Restaurant[];
}

export function RestaurantManagement({ restaurants }: RestaurantManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);

  const filteredRestaurants = restaurants.filter(restaurant =>
    restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Restaurant Management</h2>
          <p className="text-gray-600">Manage all restaurant tenants</p>
        </div>
        <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
          <DialogTrigger asChild>
            <Button>Add New Restaurant</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Onboard New Restaurant</DialogTitle>
              <DialogDescription>
                Add a new restaurant to the Tippy platform
              </DialogDescription>
            </DialogHeader>
            <OnboardingForm onSuccess={() => setShowOnboarding(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <Label htmlFor="search">Search Restaurants</Label>
          <Input
            id="search"
            placeholder="Search by name or slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRestaurants.map((restaurant) => (
          <RestaurantCard key={restaurant.id} restaurant={restaurant} />
        ))}
      </div>

      {filteredRestaurants.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No restaurants found matching your search.</p>
        </div>
      )}
    </div>
  );
}

interface RestaurantCardProps {
  restaurant: Restaurant;
}

function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/restaurants/${restaurant.id}/toggle-status`, {
        method: 'POST',
      });

      if (response.ok) {
        window.location.reload(); // Simple refresh for now
      } else {
        console.error('Failed to toggle restaurant status');
      }
    } catch (error) {
      console.error('Error toggling restaurant status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{restaurant.name}</CardTitle>
          <Badge variant={restaurant.is_active ? 'default' : 'secondary'}>
            {restaurant.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <CardDescription>
          Slug: {restaurant.slug}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-gray-600">
          Created: {new Date(restaurant.created_at).toLocaleDateString()}
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/dashboard/${restaurant.id}`, '_blank')}
          >
            View Dashboard
          </Button>
          
          <Button
            variant={restaurant.is_active ? 'destructive' : 'default'}
            size="sm"
            onClick={handleToggleStatus}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : restaurant.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}