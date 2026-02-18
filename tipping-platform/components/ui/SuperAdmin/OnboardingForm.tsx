'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface OnboardingFormProps {
  onSuccess: () => void;
}

export function OnboardingForm({ onSuccess }: OnboardingFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [formData, setFormData] = useState({
    restaurantName: '',
    restaurantSlug: '',
    email: '',
    phoneNumber: '',
    address: '',
    adminEmail: '',
    adminName: '',
    commissionRate: 10
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Auto-generate slug from restaurant name
    if (field === 'restaurantName' && typeof value === 'string') {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData(prev => ({ ...prev, restaurantSlug: slug }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.restaurantName.trim()) {
      newErrors.restaurantName = 'Restaurant name is required';
    }

    if (!formData.restaurantSlug.trim()) {
      newErrors.restaurantSlug = 'Restaurant slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.restaurantSlug)) {
      newErrors.restaurantSlug = 'Slug must contain only lowercase letters, numbers, and hyphens';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Restaurant email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.adminEmail.trim()) {
      newErrors.adminEmail = 'Admin email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.adminEmail)) {
      newErrors.adminEmail = 'Invalid email format';
    }

    if (!formData.adminName.trim()) {
      newErrors.adminName = 'Admin name is required';
    }

    if (formData.commissionRate < 0 || formData.commissionRate > 100) {
      newErrors.commissionRate = 'Commission rate must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // If success, show confirmation
  if (showSuccess) {
    return (
      <div className="space-y-6">
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <h3 className="text-lg font-semibold text-green-900">Restaurant Created Successfully!</h3>
          </div>
          
          <div className="bg-white rounded-lg p-4 mb-4">
            <div className="space-y-3">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900">Password reset email sent</p>
                  <p className="text-sm text-gray-600 mt-1">
                    A password setup link has been sent to <span className="font-mono font-semibold">{adminEmail}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
            <p className="text-sm text-blue-900 font-medium mb-2">
              What happens next:
            </p>
            <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
              <li>Restaurant admin checks their email ({adminEmail})</li>
              <li>They click the "Set Password" link in the email</li>
              <li>They create their own secure password</li>
              <li>They can then login at: <span className="font-mono">http://localhost:3000/signin</span></li>
            </ol>
          </div>

          <Button
            onClick={() => {
              onSuccess();
              window.location.reload();
            }}
            className="w-full"
          >
            Done
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/tenants/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setAdminEmail(result.adminUser.email);
        setShowSuccess(true);
      } else {
        setErrors({ submit: result.error || 'Failed to onboard restaurant' });
      }
    } catch (error) {
      console.error('Error onboarding restaurant:', error);
      setErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="restaurantName" className="text-gray-900">Restaurant Name *</Label>
          <Input
            id="restaurantName"
            value={formData.restaurantName}
            onChange={(e) => handleInputChange('restaurantName', e.target.value)}
            placeholder="e.g., Java House"
            className="text-gray-900 bg-white"
          />
          {errors.restaurantName && (
            <p className="text-sm text-red-600">{errors.restaurantName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="restaurantSlug" className="text-gray-900">Restaurant Slug *</Label>
          <Input
            id="restaurantSlug"
            value={formData.restaurantSlug}
            onChange={(e) => handleInputChange('restaurantSlug', e.target.value)}
            placeholder="e.g., java-house"
            className="text-gray-900 bg-white"
          />
          {errors.restaurantSlug && (
            <p className="text-sm text-red-600">{errors.restaurantSlug}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-900">Restaurant Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="contact@restaurant.com"
            className="text-gray-900 bg-white"
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phoneNumber" className="text-gray-900">Phone Number</Label>
          <Input
            id="phoneNumber"
            value={formData.phoneNumber}
            onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
            placeholder="+254712345678"
            className="text-gray-900 bg-white"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address" className="text-gray-900">Address</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          placeholder="Restaurant address"
          className="text-gray-900 bg-white"
        />
      </div>

      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium mb-4 text-gray-900">Admin User Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adminName" className="text-gray-900">Admin Name *</Label>
              <Input
                id="adminName"
                value={formData.adminName}
                onChange={(e) => handleInputChange('adminName', e.target.value)}
                placeholder="John Doe"
                className="text-gray-900 bg-white"
              />
              {errors.adminName && (
                <p className="text-sm text-red-600">{errors.adminName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminEmail" className="text-gray-900">Admin Email *</Label>
              <Input
                id="adminEmail"
                type="email"
                value={formData.adminEmail}
                onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                placeholder="admin@restaurant.com"
                className="text-gray-900 bg-white"
              />
              {errors.adminEmail && (
                <p className="text-sm text-red-600">{errors.adminEmail}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label htmlFor="commissionRate" className="text-gray-900">Commission Rate (%)</Label>
        <Input
          id="commissionRate"
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={formData.commissionRate}
          onChange={(e) => handleInputChange('commissionRate', parseFloat(e.target.value) || 0)}
          className="text-gray-900 bg-white"
        />
        {errors.commissionRate && (
          <p className="text-sm text-red-600">{errors.commissionRate}</p>
        )}
      </div>

      {errors.submit && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{errors.submit}</p>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onSuccess} className="text-gray-900 border-gray-300 hover:bg-gray-100">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
          {isLoading ? 'Creating...' : 'Create Restaurant'}
        </Button>
      </div>
    </form>
  );
}