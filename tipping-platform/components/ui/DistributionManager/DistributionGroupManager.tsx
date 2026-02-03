'use client';

import { useState, useEffect } from 'react';
import { DistributionGroupConfig } from '@/utils/distribution/service';

interface DistributionGroupManagerProps {
  restaurantId: string;
  restaurantName: string;
}

interface DistributionGroup {
  id: string;
  group_name: string;
  percentage: number;
  restaurant_id: string;
  created_at: string | null;
  updated_at: string | null;
}

export default function DistributionGroupManager({ 
  restaurantId, 
  restaurantName 
}: DistributionGroupManagerProps) {
  const [groups, setGroups] = useState<DistributionGroupConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [totalPercentage, setTotalPercentage] = useState(0);

  // Load existing distribution groups
  useEffect(() => {
    loadDistributionGroups();
  }, [restaurantId]);

  // Calculate total percentage whenever groups change
  useEffect(() => {
    const total = groups.reduce((sum, group) => sum + (group.percentage || 0), 0);
    setTotalPercentage(Math.round(total * 100) / 100);
  }, [groups]);

  const loadDistributionGroups = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/restaurants/${restaurantId}/distribution`);
      const data = await response.json();

      if (data.success) {
        if (data.data.length === 0) {
          // Initialize with default groups if none exist
          await initializeDefaultGroups();
        } else {
          // Convert database format to component format
          const formattedGroups = data.data.map((group: DistributionGroup) => ({
            id: group.id,
            groupName: group.group_name,
            percentage: group.percentage
          }));
          setGroups(formattedGroups);
        }
      } else {
        setErrors([data.error || 'Failed to load distribution groups']);
      }
    } catch (error) {
      setErrors(['Failed to load distribution groups']);
      console.error('Error loading distribution groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeDefaultGroups = async () => {
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/distribution`, {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        const formattedGroups = data.data.map((group: DistributionGroup) => ({
          id: group.id,
          groupName: group.group_name,
          percentage: group.percentage
        }));
        setGroups(formattedGroups);
        setSuccessMessage('Default distribution groups initialized');
      } else {
        setErrors([data.error || 'Failed to initialize default groups']);
      }
    } catch (error) {
      setErrors(['Failed to initialize default groups']);
      console.error('Error initializing default groups:', error);
    }
  };

  const addGroup = () => {
    setGroups([...groups, { groupName: '', percentage: 0 }]);
    setErrors([]);
    setSuccessMessage('');
  };

  const removeGroup = (index: number) => {
    const newGroups = groups.filter((_, i) => i !== index);
    setGroups(newGroups);
    setErrors([]);
    setSuccessMessage('');
  };

  const updateGroup = (index: number, field: 'groupName' | 'percentage', value: string | number) => {
    const newGroups = [...groups];
    newGroups[index] = { ...newGroups[index], [field]: value };
    setGroups(newGroups);
    setErrors([]);
    setSuccessMessage('');
  };

  const saveDistributionGroups = async () => {
    try {
      setIsSaving(true);
      setErrors([]);
      setSuccessMessage('');

      const response = await fetch(`/api/restaurants/${restaurantId}/distribution`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groups }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage('Distribution groups updated successfully');
        // Reload to get updated data with IDs
        await loadDistributionGroups();
      } else {
        setErrors([data.error || 'Failed to update distribution groups']);
      }
    } catch (error) {
      setErrors(['Failed to save distribution groups']);
      console.error('Error saving distribution groups:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (confirm('Are you sure you want to reset to default distribution groups? This will overwrite your current configuration.')) {
      await initializeDefaultGroups();
    }
  };

  if (isLoading) {
    return (
      <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2 text-white">Loading distribution groups...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Tip Distribution Groups</h2>
          <p className="text-zinc-400 text-sm">
            Configure how restaurant-wide tips are distributed among different groups
          </p>
        </div>
        <button
          onClick={resetToDefaults}
          className="bg-zinc-700 text-white px-4 py-2 rounded hover:bg-zinc-600 transition-colors text-sm"
        >
          Reset to Defaults
        </button>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-400 font-medium">Validation Errors</span>
          </div>
          <ul className="text-red-300 text-sm space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-400">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Distribution Groups */}
      <div className="space-y-4 mb-6">
        {groups.map((group, index) => (
          <div key={index} className="bg-zinc-900 rounded-lg p-4 border border-zinc-600">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={group.groupName}
                  onChange={(e) => updateGroup(index, 'groupName', e.target.value)}
                  placeholder="e.g., Waiters, Kitchen Staff"
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="w-32">
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Percentage
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={group.percentage}
                    onChange={(e) => updateGroup(index, 'percentage', parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 pr-8 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="absolute right-2 top-2 text-zinc-400 text-sm">%</span>
                </div>
              </div>
              <button
                onClick={() => removeGroup(index)}
                className="text-red-400 hover:text-red-300 p-2 rounded hover:bg-red-900/20 transition-colors"
                title="Remove group"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Group Button */}
      <button
        onClick={addGroup}
        className="w-full bg-zinc-700 text-white py-3 px-4 rounded-lg border-2 border-dashed border-zinc-600 hover:border-zinc-500 hover:bg-zinc-600 transition-colors mb-6"
      >
        <div className="flex items-center justify-center space-x-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Add Distribution Group</span>
        </div>
      </button>

      {/* Total Percentage Display */}
      <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-600 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-zinc-300">Total Percentage:</span>
          <span className={`text-lg font-bold ${
            Math.abs(totalPercentage - 100) < 0.01 ? 'text-green-400' : 'text-red-400'
          }`}>
            {totalPercentage}%
          </span>
        </div>
        {Math.abs(totalPercentage - 100) >= 0.01 && (
          <p className="text-red-400 text-sm mt-2">
            Total must equal 100% to save changes
          </p>
        )}
      </div>

      {/* Example Distribution */}
      {groups.length > 0 && totalPercentage > 0 && (
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-600 mb-6">
          <h3 className="text-white font-medium mb-3">Example: 1000 KES Restaurant Tip Distribution</h3>
          <div className="space-y-2">
            {groups.map((group, index) => {
              const amount = Math.round((1000 * group.percentage / 100) * 100) / 100;
              return (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-zinc-300">{group.groupName || `Group ${index + 1}`}:</span>
                  <span className="text-white font-medium">{amount} KES</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={saveDistributionGroups}
        disabled={isSaving || Math.abs(totalPercentage - 100) >= 0.01 || groups.length === 0}
        className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Saving...</span>
          </div>
        ) : (
          'Save Distribution Groups'
        )}
      </button>

      {/* Help Text */}
      <div className="mt-4 text-xs text-zinc-500">
        <p>• Distribution groups determine how restaurant-wide tips are split</p>
        <p>• Individual waiter tips go directly to the waiter (not distributed)</p>
        <p>• Total percentage must equal exactly 100%</p>
        <p>• Changes apply to future tips only</p>
      </div>
    </div>
  );
}