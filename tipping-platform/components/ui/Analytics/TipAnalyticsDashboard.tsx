'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Users, CreditCard, Banknote } from 'lucide-react';

interface AnalyticsData {
  month: string;
  summary: {
    totalTips: number;
    totalAmount: number;
    totalCommission: number;
    totalNetAmount: number;
    restaurantTipsAmount: number;
    waiterTipsAmount: number;
  };
  waiterBreakdown: Array<{
    waiter: {
      id: string;
      name: string;
      phone_number: string;
    };
    totalAmount: number;
    tipCount: number;
  }>;
  distributionBreakdown: Array<{
    groupName: string;
    percentage: number;
    amount: number;
  }>;
  paymentMethodBreakdown: Record<string, { count: number; amount: number }>;
  dailyBreakdown: Array<{
    date: string;
    amount: number;
    count: number;
  }>;
  recentTips: Array<{
    id: string;
    amount: number;
    tip_type: string;
    payment_method: string;
    created_at: string;
    waiters?: { name: string };
    qr_codes?: { table_number: string };
  }>;
}

interface Props {
  restaurantId: string;
}

export function TipAnalyticsDashboard({ restaurantId }: Props) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const fetchAnalytics = async (month: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/restaurants/${restaurantId}/analytics?month=${month}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(selectedMonth);
  }, [restaurantId, selectedMonth]);

  // Generate month options for the last 12 months
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const displayStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      options.push({ value: monthStr, label: displayStr });
    }
    return options;
  };

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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
        <span className="ml-2 text-white">Loading analytics...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-8">
        <p className="text-zinc-400">Failed to load analytics data</p>
        <Button 
          onClick={() => fetchAnalytics(selectedMonth)}
          className="mt-4"
          variant="outline"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Month Selection */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Tip Analytics</h2>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-48 bg-zinc-900 border-zinc-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            {generateMonthOptions().map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-white">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Tips</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data.summary.totalTips}</div>
            <p className="text-xs text-zinc-400">
              {formatCurrency(data.summary.totalAmount)} gross
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Net Amount</CardTitle>
            <Banknote className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(data.summary.totalNetAmount)}
            </div>
            <p className="text-xs text-zinc-400">
              After {formatCurrency(data.summary.totalCommission)} commission
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Waiter Tips</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(data.summary.waiterTipsAmount)}
            </div>
            <p className="text-xs text-zinc-400">
              Individual waiter tips
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Restaurant Tips</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(data.summary.restaurantTipsAmount)}
            </div>
            <p className="text-xs text-zinc-400">
              For distribution groups
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waiter Performance */}
        <Card className="bg-zinc-900 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-white">Waiter Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.waiterBreakdown.length > 0 ? (
                data.waiterBreakdown
                  .sort((a, b) => b.totalAmount - a.totalAmount)
                  .map((waiterData) => (
                    <div key={waiterData.waiter.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{waiterData.waiter.name}</p>
                        <p className="text-sm text-zinc-400">{waiterData.tipCount} tips</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-white">
                          {formatCurrency(waiterData.totalAmount)}
                        </p>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-zinc-400 text-center py-4">No waiter tips this month</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Distribution Groups */}
        <Card className="bg-zinc-900 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-white">Restaurant Tip Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.distributionBreakdown.length > 0 ? (
                data.distributionBreakdown.map((group) => (
                  <div key={group.groupName} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-white capitalize">{group.groupName}</span>
                      <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
                        {group.percentage}%
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white">
                        {formatCurrency(group.amount)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-zinc-400 text-center py-4">No restaurant tips this month</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods */}
      <Card className="bg-zinc-900 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-white">Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(data.paymentMethodBreakdown).map(([method, stats]) => (
              <div key={method} className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
                <div>
                  <p className="font-medium text-white capitalize">{method}</p>
                  <p className="text-sm text-zinc-400">{stats.count} transactions</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-white">{formatCurrency(stats.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Tips */}
      <Card className="bg-zinc-900 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.recentTips.length > 0 ? (
              data.recentTips.map((tip) => (
                <div key={tip.id} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={tip.tip_type === 'waiter' ? 'default' : 'secondary'}
                        className={tip.tip_type === 'waiter' ? 'bg-blue-600' : 'bg-orange-600'}
                      >
                        {tip.tip_type}
                      </Badge>
                      <Badge variant="outline" className="border-zinc-600 text-zinc-300">
                        {tip.payment_method}
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-400 mt-1">
                      {tip.waiters?.name || 'Restaurant'} • Table {tip.qr_codes?.table_number || 'N/A'}
                    </p>
                    <p className="text-xs text-zinc-500">{formatDate(tip.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-white">{formatCurrency(tip.amount)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-zinc-400 text-center py-4">No tips yet this month</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}