'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RestaurantManagement } from './RestaurantManagement';
import { SystemAnalytics } from './SystemAnalytics';
import { TenantSupport } from './TenantSupport';
import { PesaWiseWallet } from '../Admin/PesaWiseWallet';
import { OnboardingForm } from './OnboardingForm';

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
  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black">Super Admin Dashboard</h1>
            <p className="text-gray-700">Manage all restaurants and system-wide settings</p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="text-sm">
              {userEmail}
            </Badge>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/admin'}
              className="text-black"
            >
              ← Back
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 bg-gray-200">
          <TabsTrigger value="overview" className="text-gray-900 data-[state=active]:bg-white data-[state=active]:text-black">Overview</TabsTrigger>
          <TabsTrigger value="wallet" className="text-gray-900 data-[state=active]:bg-white data-[state=active]:text-black">Wallet</TabsTrigger>
          <TabsTrigger value="restaurants" className="text-gray-900 data-[state=active]:bg-white data-[state=active]:text-black">Restaurants</TabsTrigger>
          <TabsTrigger value="payouts" className="text-gray-900 data-[state=active]:bg-white data-[state=active]:text-black">Payouts</TabsTrigger>
          <TabsTrigger value="analytics" className="text-gray-900 data-[state=active]:bg-white data-[state=active]:text-black">Analytics</TabsTrigger>
          <TabsTrigger value="support" className="text-gray-900 data-[state=active]:bg-white data-[state=active]:text-black">Support</TabsTrigger>
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

          <Card>
            <CardHeader>
              <CardTitle className="text-black">Quick Actions</CardTitle>
              <CardDescription className="text-gray-700">Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 relative pb-16">
              <Button 
                className="w-full justify-start text-black" 
                variant="outline"
                onClick={() => setActiveTab('wallet')}
              >
                View PesaWise Wallet
              </Button>
              <Button 
                className="w-full justify-start text-black" 
                variant="outline"
                onClick={() => window.location.href = '/admin/payouts'}
              >
                Manage Payouts
              </Button>
              <Button 
                className="w-full justify-start text-black" 
                variant="outline"
                onClick={() => setActiveTab('restaurants')}
              >
                View All Restaurants
              </Button>
              
              {/* Add Restaurant Button - Bottom Right */}
              <button
                onClick={() => setShowOnboarding(true)}
                className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 shadow-lg transition-all duration-200 hover:scale-105 flex items-center gap-2 text-sm font-medium"
                title="Add New Restaurant"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Restaurant
              </button>
            </CardContent>
          </Card>

          {/* Add Restaurant Dialog */}
          <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
              <DialogHeader>
                <DialogTitle className="text-black">Add New Restaurant</DialogTitle>
                <DialogDescription className="text-gray-700">
                  Onboard a new restaurant to the Tippy platform
                </DialogDescription>
              </DialogHeader>
              <OnboardingForm onSuccess={() => setShowOnboarding(false)} />
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="wallet">
          <PesaWiseWallet />
        </TabsContent>

        <TabsContent value="restaurants">
          <RestaurantManagement restaurants={restaurants} />
        </TabsContent>

        <TabsContent value="payouts">
          <Card>
            <CardHeader>
              <CardTitle className="text-black">Payout Management</CardTitle>
              <CardDescription className="text-gray-700">Process waiter payouts via PesaWise</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="text-white" onClick={() => window.location.href = '/admin/payouts'}>
                Go to Payout Management
              </Button>
            </CardContent>
          </Card>
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
        <CardTitle className="text-sm font-medium text-gray-700">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-black">{value}</div>
        <p className={`text-xs ${trendColors[trend]} mt-1`}>{subtitle}</p>
      </CardContent>
    </Card>
  );
}