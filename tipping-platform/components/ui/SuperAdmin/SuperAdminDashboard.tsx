'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RestaurantManagement } from './RestaurantManagement';
import { SystemAnalytics } from './SystemAnalytics';
import { TenantSupport } from './TenantSupport';

interface SuperAdminDashboardProps {
  stats: {
    totalRestaurants: number;
    activeRestaurants: number;
    totalTipsThisMonth: number;
    totalCommissionsThisMonth: number;
    totalCommissionsAllTime: number;
    activeWaiters: number;
    tipsThisMonth: number;
  };
  restaurants: any[];
  recentActivity: any[];
  userEmail: string;
}

export function SuperAdminDashboard({ 
  stats, 
  restaurants, 
  recentActivity, 
  userEmail 
}: SuperAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
            <p className="text-gray-600">Manage all restaurants and system-wide settings</p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {userEmail}
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="restaurants">Restaurants</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Restaurants"
              value={stats.totalRestaurants}
              subtitle={`${stats.activeRestaurants} active`}
              trend="up"
            />
            <StatsCard
              title="Tips This Month"
              value={`KES ${stats.totalTipsThisMonth.toLocaleString()}`}
              subtitle={`${stats.tipsThisMonth} transactions`}
              trend="up"
            />
            <StatsCard
              title="Commission This Month"
              value={`KES ${stats.totalCommissionsThisMonth.toLocaleString()}`}
              subtitle={`Total: KES ${stats.totalCommissionsAllTime.toLocaleString()}`}
              trend="up"
            />
            <StatsCard
              title="Active Waiters"
              value={stats.activeWaiters}
              subtitle="Across all restaurants"
              trend="neutral"
            />
          </div>
        </TabsContent>

        <TabsContent value="restaurants">
          <RestaurantManagement restaurants={restaurants} />
        </TabsContent>

        <TabsContent value="analytics">
          <SystemAnalytics stats={stats} />
        </TabsContent>

        <TabsContent value="support">
          <TenantSupport recentActivity={recentActivity} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  trend: 'up' | 'down' | 'neutral';
}

function StatsCard({ title, value, subtitle, trend }: StatsCardProps) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600'
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <p className={`text-xs ${trendColors[trend]} mt-1`}>{subtitle}</p>
      </CardContent>
    </Card>
  );
}