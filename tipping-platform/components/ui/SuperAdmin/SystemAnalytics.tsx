'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SystemAnalyticsProps {
  stats: {
    totalRestaurants: number;
    activeRestaurants: number;
    totalTipsThisMonth: number;
    totalCommissionsThisMonth: number;
    totalCommissionsAllTime: number;
    activeWaiters: number;
    tipsThisMonth: number;
  };
}

export function SystemAnalytics({ stats }: SystemAnalyticsProps) {
  const commissionRate = stats.totalTipsThisMonth > 0 
    ? (stats.totalCommissionsThisMonth / stats.totalTipsThisMonth * 100).toFixed(1)
    : '0';

  const avgTipAmount = stats.tipsThisMonth > 0
    ? (stats.totalTipsThisMonth / stats.tipsThisMonth).toFixed(0)
    : '0';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">System Analytics</h2>
        <p className="text-gray-600">Platform-wide performance metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue Overview</CardTitle>
            <CardDescription>Commission earnings breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-2xl font-bold text-green-600">
                KES {stats.totalCommissionsThisMonth.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">This month</p>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                KES {stats.totalCommissionsAllTime.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">All time</p>
            </div>
            <div>
              <div className="text-sm text-gray-600">
                Effective rate: {commissionRate}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transaction Metrics</CardTitle>
            <CardDescription>Tip processing statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {stats.tipsThisMonth.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">Tips this month</p>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                KES {avgTipAmount}
              </div>
              <p className="text-sm text-gray-600">Average tip amount</p>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                KES {stats.totalTipsThisMonth.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">Total volume</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Platform Growth</CardTitle>
            <CardDescription>User and restaurant metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {stats.activeRestaurants}
              </div>
              <p className="text-sm text-gray-600">Active restaurants</p>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {stats.activeWaiters}
              </div>
              <p className="text-sm text-gray-600">Active waiters</p>
            </div>
            <div>
              <div className="text-sm text-gray-600">
                {((stats.activeRestaurants / stats.totalRestaurants) * 100).toFixed(1)}% activation rate
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance Insights</CardTitle>
          <CardDescription>Key platform metrics and recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Key Metrics</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Restaurant Activation Rate:</span>
                  <span className="font-medium">
                    {((stats.activeRestaurants / stats.totalRestaurants) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Waiters per Restaurant:</span>
                  <span className="font-medium">
                    {(stats.activeWaiters / stats.activeRestaurants).toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tips per Waiter:</span>
                  <span className="font-medium">
                    {(stats.tipsThisMonth / stats.activeWaiters).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Growth Opportunities</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Focus on activating {stats.totalRestaurants - stats.activeRestaurants} inactive restaurants</p>
                <p>• Average tip amount suggests good user engagement</p>
                <p>• Consider expanding waiter onboarding programs</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}