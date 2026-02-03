/**
 * Commission Rate Manager Component
 * Allows YourappsLtd admin to manage commission rates for restaurants
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  commission_rate: number;
  is_active: boolean;
  created_at: string;
}

interface CommissionRateHistory {
  id: string;
  restaurant_id: string;
  old_rate: number | null;
  new_rate: number;
  changed_by: string | null;
  changed_at: string;
  reason?: string;
}

export function CommissionRateManager() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [newRate, setNewRate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [history, setHistory] = useState<CommissionRateHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load restaurants
  const loadRestaurants = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/commission?action=rates');
      const data = await response.json();

      if (data.success) {
        setRestaurants(data.data);
      } else {
        setError(data.error || 'Failed to load restaurants');
      }
    } catch (err) {
      console.error('Error loading restaurants:', err);
      setError('Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  };

  // Load commission rate history
  const loadHistory = async (restaurantId: string) => {
    try {
      const response = await fetch(`/api/admin/commission/history?restaurantId=${restaurantId}`);
      const data = await response.json();

      if (data.success) {
        setHistory(data.data);
      }
    } catch (err) {
      console.error('Error loading history:', err);
    }
  };

  // Update commission rate
  const updateCommissionRate = async () => {
    if (!selectedRestaurant || !newRate) return;

    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate < 0 || rate > 50) {
      setError('Commission rate must be between 0% and 50%');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/commission', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurantId: selectedRestaurant.id,
          commissionRate: rate,
          reason: reason || undefined,
          changedBy: 'admin' // In a real app, this would be the current user ID
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Commission rate updated to ${rate}% for ${selectedRestaurant.name}`);
        setSelectedRestaurant(null);
        setNewRate('');
        setReason('');
        await loadRestaurants(); // Reload to get updated data
      } else {
        setError(data.error || 'Failed to update commission rate');
      }
    } catch (err) {
      console.error('Error updating commission rate:', err);
      setError('Failed to update commission rate');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadRestaurants();
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Commission Rate Management</h2>
          <p className="text-muted-foreground">
            Manage commission rates for all restaurants
          </p>
        </div>
        <Button onClick={loadRestaurants} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Restaurants List */}
      <Card>
        <CardHeader>
          <CardTitle>Restaurant Commission Rates</CardTitle>
          <CardDescription>
            Current commission rates for all restaurants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {restaurants.map((restaurant) => (
              <div key={restaurant.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="font-medium">{restaurant.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {restaurant.slug} • Created: {formatDate(restaurant.created_at)}
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={restaurant.is_active ? "default" : "secondary"}>
                      {restaurant.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold">{restaurant.commission_rate}%</div>
                    <div className="text-sm text-muted-foreground">Commission Rate</div>
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedRestaurant(restaurant);
                            setNewRate(restaurant.commission_rate.toString());
                          }}
                        >
                          Edit Rate
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Commission Rate</DialogTitle>
                          <DialogDescription>
                            Change the commission rate for {restaurant.name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="newRate">New Commission Rate (%)</Label>
                            <Input
                              type="number"
                              id="newRate"
                              min="0"
                              max="50"
                              step="0.01"
                              value={newRate}
                              onChange={(e) => setNewRate(e.target.value)}
                              placeholder="Enter new rate (0-50)"
                            />
                          </div>
                          <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="reason">Reason for Change (Optional)</Label>
                            <Textarea
                              id="reason"
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              placeholder="Enter reason for commission rate change..."
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            onClick={updateCommissionRate} 
                            disabled={loading || !newRate}
                          >
                            {loading ? 'Updating...' : 'Update Rate'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        loadHistory(restaurant.id);
                        setShowHistory(true);
                        setSelectedRestaurant(restaurant);
                      }}
                    >
                      History
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Commission Rate History</DialogTitle>
            <DialogDescription>
              {selectedRestaurant && `Rate change history for ${selectedRestaurant.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No rate changes recorded
              </p>
            ) : (
              history.map((entry) => (
                <div key={entry.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="font-medium">
                        Rate changed from {entry.old_rate || 'N/A'}% to {entry.new_rate}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(entry.changed_at)}
                        {entry.changed_by && ` • Changed by: ${entry.changed_by}`}
                      </div>
                      {entry.reason && (
                        <div className="text-sm text-muted-foreground">
                          Reason: {entry.reason}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}