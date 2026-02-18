'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, Edit, Trash2, Phone, Mail, User, TrendingUp } from 'lucide-react';

interface Waiter {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
  profile_photo_url?: string;
  is_active: boolean;
  created_at: string;
  distribution_group_id?: string;
  distribution_group?: {
    id: string;
    group_name: string;
    percentage: number;
  };
  stats: {
    totalTips: number;
    totalAmount: number;
    thisMonthTips: number;
    thisMonthAmount: number;
  };
}

interface Props {
  restaurantId: string;
}

export function WaiterManagementDashboard({ restaurantId }: Props) {
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [distributionGroups, setDistributionGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingWaiter, setEditingWaiter] = useState<Waiter | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    email: '',
    profile_photo_url: '',
    distribution_group_id: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  const fetchDistributionGroups = async () => {
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/distribution`);
      const data = await response.json();
      if (data.success) {
        setDistributionGroups(data.data);
      }
    } catch (error) {
      console.error('Error fetching distribution groups:', error);
    }
  };

  const fetchWaiters = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/restaurants/${restaurantId}/waiters?includeInactive=${showInactive}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch waiters');
      }
      const data = await response.json();
      setWaiters(data.waiters || []);
    } catch (error) {
      console.error('Error fetching waiters:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistributionGroups();
    fetchWaiters();
  }, [restaurantId, showInactive]);

  const handleCreateWaiter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFormLoading(true);
      const response = await fetch(`/api/restaurants/${restaurantId}/waiters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create waiter');
      }

      setIsCreateModalOpen(false);
      setFormData({ name: '', phone_number: '', email: '', profile_photo_url: '', distribution_group_id: '' });
      fetchWaiters();
    } catch (error) {
      console.error('Error creating waiter:', error);
      alert(error instanceof Error ? error.message : 'Failed to create waiter');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateWaiter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWaiter) return;

    try {
      setFormLoading(true);
      const response = await fetch(
        `/api/restaurants/${restaurantId}/waiters/${editingWaiter.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update waiter');
      }

      setEditingWaiter(null);
      setFormData({ name: '', phone_number: '', email: '', profile_photo_url: '', distribution_group_id: '' });
      fetchWaiters();
    } catch (error) {
      console.error('Error updating waiter:', error);
      alert(error instanceof Error ? error.message : 'Failed to update waiter');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeactivateWaiter = async (waiterId: string) => {
    if (!confirm('Are you sure you want to deactivate this waiter?')) return;

    try {
      const response = await fetch(
        `/api/restaurants/${restaurantId}/waiters/${waiterId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to deactivate waiter');
      }

      fetchWaiters();
    } catch (error) {
      console.error('Error deactivating waiter:', error);
      alert('Failed to deactivate waiter');
    }
  };

  const openEditModal = (waiter: Waiter) => {
    setEditingWaiter(waiter);
    setFormData({
      name: waiter.name,
      phone_number: waiter.phone_number,
      email: waiter.email || '',
      profile_photo_url: waiter.profile_photo_url || '',
      distribution_group_id: (waiter as any).distribution_group_id || ''
    });
  };

  const filteredWaiters = waiters.filter(waiter =>
    waiter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    waiter.phone_number.includes(searchTerm)
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
        <span className="ml-2 text-white">Loading waiters...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Waiter Management</h2>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Waiter
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-700 text-white">
            <DialogHeader>
              <DialogTitle>Add New Waiter</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateWaiter} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-zinc-800 border-zinc-600"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="0712345678"
                  className="bg-zinc-800 border-zinc-600"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-zinc-800 border-zinc-600"
                />
              </div>
              <div>
                <Label htmlFor="distribution_group">Distribution Group *</Label>
                <select
                  id="distribution_group"
                  value={formData.distribution_group_id}
                  onChange={(e) => setFormData({ ...formData, distribution_group_id: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a group...</option>
                  {distributionGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.group_name} ({group.percentage}%)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-zinc-400 mt-1">
                  This determines how tips are distributed to this staff member
                </p>
              </div>
              <div>
                <Label htmlFor="photo">Profile Photo URL</Label>
                <Input
                  id="photo"
                  value={formData.profile_photo_url}
                  onChange={(e) => setFormData({ ...formData, profile_photo_url: e.target.value })}
                  className="bg-zinc-800 border-zinc-600"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={formLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <Input
          placeholder="Search waiters..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm bg-zinc-900 border-zinc-700 text-white"
        />
        <Button
          variant={showInactive ? "default" : "outline"}
          onClick={() => setShowInactive(!showInactive)}
          className="whitespace-nowrap"
        >
          {showInactive ? 'Hide Inactive' : 'Show Inactive'}
        </Button>
      </div>

      {/* Waiters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWaiters.map((waiter) => (
          <Card key={waiter.id} className="bg-zinc-900 border-zinc-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {waiter.profile_photo_url ? (
                    <img
                      src={waiter.profile_photo_url}
                      alt={waiter.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center">
                      <User className="h-5 w-5 text-zinc-400" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg text-white">{waiter.name}</CardTitle>
                    <Badge variant={waiter.is_active ? "default" : "secondary"}>
                      {waiter.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditModal(waiter)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {waiter.is_active && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeactivateWaiter(waiter.id)}
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-zinc-400">
                <Phone className="h-4 w-4" />
                <span>{waiter.phone_number}</span>
              </div>
              {waiter.email && (
                <div className="flex items-center space-x-2 text-sm text-zinc-400">
                  <Mail className="h-4 w-4" />
                  <span>{waiter.email}</span>
                </div>
              )}
              
              {waiter.distribution_group && (
                <div className="flex items-center space-x-2 text-sm">
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                    {waiter.distribution_group.group_name} ({waiter.distribution_group.percentage}%)
                  </Badge>
                </div>
              )}
              
              {!waiter.distribution_group && (
                <div className="flex items-center space-x-2 text-sm">
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                    No group assigned
                  </Badge>
                </div>
              )}
              
              {/* Performance Stats */}
              <div className="pt-3 border-t border-zinc-700">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-zinc-400">This Month</p>
                    <p className="font-medium text-white">
                      {formatCurrency(waiter.stats.thisMonthAmount)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {waiter.stats.thisMonthTips} tips
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-400">All Time</p>
                    <p className="font-medium text-white">
                      {formatCurrency(waiter.stats.totalAmount)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {waiter.stats.totalTips} tips
                    </p>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-zinc-500">
                Joined {formatDate(waiter.created_at)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredWaiters.length === 0 && (
        <div className="text-center py-8">
          <p className="text-zinc-400">
            {searchTerm ? 'No waiters found matching your search.' : 'No waiters added yet.'}
          </p>
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={!!editingWaiter} onOpenChange={() => setEditingWaiter(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle>Edit Waiter</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateWaiter} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-zinc-800 border-zinc-600"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone Number *</Label>
              <Input
                id="edit-phone"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="bg-zinc-800 border-zinc-600"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-zinc-800 border-zinc-600"
              />
            </div>
            <div>
              <Label htmlFor="edit-distribution_group">Distribution Group</Label>
              <select
                id="edit-distribution_group"
                value={formData.distribution_group_id}
                onChange={(e) => setFormData({ ...formData, distribution_group_id: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No group assigned</option>
                {distributionGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.group_name} ({group.percentage}%)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="edit-photo">Profile Photo URL</Label>
              <Input
                id="edit-photo"
                value={formData.profile_photo_url}
                onChange={(e) => setFormData({ ...formData, profile_photo_url: e.target.value })}
                className="bg-zinc-800 border-zinc-600"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingWaiter(null)}
                disabled={formLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}