'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  created_at: string;
  user_id: string;
  restaurant_id: string;
  new_values: any;
  restaurant?: {
    name: string;
  };
}

interface TenantSupportProps {
  recentActivity: AuditLog[];
}

export function TenantSupport({ recentActivity }: TenantSupportProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const filteredActivity = recentActivity.filter(log => {
    const matchesSearch = !searchTerm || 
      log.restaurant?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.table_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = !filterAction || log.action === filterAction;
    
    return matchesSearch && matchesFilter;
  });

  const uniqueActions = [...new Set(recentActivity.map(log => log.action))];

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'onboard':
        return 'default';
      case 'create':
        return 'secondary';
      case 'update':
        return 'outline';
      case 'delete':
        return 'destructive';
      case 'access_denied':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatLogDetails = (log: AuditLog) => {
    if (log.new_values) {
      if (log.action === 'onboard') {
        return `Restaurant: ${log.new_values.restaurant_name}`;
      }
      if (log.new_values.resource) {
        return `Resource: ${log.new_values.resource}`;
      }
    }
    return `Table: ${log.table_name}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tenant Support</h2>
        <p className="text-gray-600">Monitor system activity and troubleshoot issues</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="search">Search Activity</Label>
          <Input
            id="search"
            placeholder="Search restaurants, actions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="filter">Filter by Action</Label>
          <select
            id="filter"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
          >
            <option value="">All Actions</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setFilterAction('');
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent System Activity</CardTitle>
          <CardDescription>
            Latest {recentActivity.length} system events and user actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredActivity.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No activity found matching your filters.
              </p>
            ) : (
              filteredActivity.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action}
                      </Badge>
                      <span className="font-medium">
                        {log.restaurant?.name || 'System'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatLogDetails(log)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                  
                  {log.restaurant_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/dashboard/${log.restaurant_id}`, '_blank')}
                    >
                      View Restaurant
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common support tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              View All Restaurants
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Export Activity Logs
            </Button>
            <Button variant="outline" className="w-full justify-start">
              System Health Check
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Support Statistics</CardTitle>
            <CardDescription>Activity summary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Events:</span>
              <span className="font-medium">{recentActivity.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Security Events:</span>
              <span className="font-medium">
                {recentActivity.filter(log => log.action.includes('access_denied')).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">New Restaurants:</span>
              <span className="font-medium">
                {recentActivity.filter(log => log.action === 'onboard').length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}