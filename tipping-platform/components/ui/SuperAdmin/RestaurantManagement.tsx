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
  commission_rate: number;
  created_at: string;
}

interface RestaurantManagementProps {
  restaurants: Restaurant[];
}

export function RestaurantManagement({ restaurants }: RestaurantManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);

  console.log('RestaurantManagement received restaurants:', restaurants);

  const filteredRestaurants = restaurants.filter(restaurant =>
    restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log('Filtered restaurants:', filteredRestaurants);

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black">Restaurant Management</h2>
          <p className="text-gray-700">Manage all restaurant tenants</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <Label htmlFor="search" className="text-black">Search Restaurants</Label>
          <Input
            id="search"
            placeholder="Search by name or slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-black"
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
          <p className="text-black">No restaurants found matching your search.</p>
        </div>
      )}

      {/* Floating Add Button */}
      <button
        onClick={() => setShowOnboarding(true)}
        className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-110 z-50"
        title="Add New Restaurant"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Add Restaurant Dialog */}
      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-black">Onboard New Restaurant</DialogTitle>
            <DialogDescription className="text-gray-700">
              Add a new restaurant to the Tippy platform
            </DialogDescription>
          </DialogHeader>
          <OnboardingForm onSuccess={() => setShowOnboarding(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface RestaurantCardProps {
  restaurant: Restaurant;
}

function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingCommission, setIsEditingCommission] = useState(false);
  const [commissionRate, setCommissionRate] = useState(restaurant.commission_rate || 10);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleToggleStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/restaurants/${restaurant.id}/toggle-status`, {
        method: 'POST',
      });

      if (response.ok) {
        window.location.reload();
      } else {
        console.error('Failed to toggle restaurant status');
      }
    } catch (error) {
      console.error('Error toggling restaurant status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCommission = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/restaurants/${restaurant.id}/commission`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commission_rate: commissionRate })
      });

      if (response.ok) {
        setIsEditingCommission(false);
        alert('Commission rate updated successfully');
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update commission rate');
      }
    } catch (error) {
      console.error('Error updating commission rate:', error);
      alert('Failed to update commission rate');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRestaurant = async () => {
    if (!confirm(`Are you sure you want to delete "${restaurant.name}"? This action cannot be undone and will delete all associated data.`)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/restaurants/${restaurant.id}/delete`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('Restaurant deleted successfully');
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete restaurant');
      }
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      alert('Failed to delete restaurant');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-black">{restaurant.name}</CardTitle>
          <Badge variant={restaurant.is_active ? 'default' : 'secondary'}>
            {restaurant.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <CardDescription className="text-gray-700">
          Slug: {restaurant.slug}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-gray-700">
          Created: {new Date(restaurant.created_at).toLocaleDateString()}
        </div>

        {/* Commission Rate */}
        <div className="border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-black">Commission Rate</span>
            {!isEditingCommission && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingCommission(true)}
              >
                Edit
              </Button>
            )}
          </div>
          
          {isEditingCommission ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(parseFloat(e.target.value))}
                  className="w-24 text-black"
                />
                <span className="text-sm text-gray-700">%</span>
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={handleUpdateCommission}
                  disabled={isLoading}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditingCommission(false);
                    setCommissionRate(restaurant.commission_rate || 10);
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-2xl font-bold text-blue-600">
              {restaurant.commission_rate || 10}%
            </div>
          )}
        </div>
        
        <div className="flex space-x-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/dashboard/${restaurant.id}`, '_blank')}
            className="text-black flex-1"
          >
            View Dashboard
          </Button>
          
          <Button
            variant={restaurant.is_active ? 'destructive' : 'default'}
            size="sm"
            onClick={handleToggleStatus}
            disabled={isLoading}
            className="text-white flex-1"
          >
            {isLoading ? 'Loading...' : restaurant.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>

        <Button
          variant="destructive"
          size="sm"
          onClick={handleDeleteRestaurant}
          disabled={isLoading}
          className="w-full mt-2 text-white bg-red-600 hover:bg-red-700"
        >
          {isLoading ? 'Deleting...' : 'Delete Restaurant'}
        </Button>
      </CardContent>
    </Card>
  );
}