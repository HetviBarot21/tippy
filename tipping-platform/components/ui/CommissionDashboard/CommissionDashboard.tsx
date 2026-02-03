/**
 * Commission Dashboard Component
 * Provides comprehensive commission tracking and analytics for YourappsLtd admin
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CommissionSummary {
  totalCommissions: number;
  totalTips: number;
  averageCommissionRate: number;
  tipCount: number;
  restaurantCount: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

interface RestaurantCommissionReport {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  commissionRate: number;
  totalCommissions: number;
  totalTips: number;
  tipCount: number;
  averageTipAmount: number;
  lastTipDate: string | null;
}

interface CommissionTrend {
  date: string;
  totalCommissions: number;
  totalTips: number;
  tipCount: number;
  averageCommissionRate: number;
}

interface PaymentMethodBreakdown {
  paymentMethod: 'card' | 'mpesa';
  totalCommissions: number;
  totalTips: number;
  tipCount: number;
  averageCommissionRate: number;
}

export function CommissionDashboard() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  });
  
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [restaurantReports, setRestaurantReports] = useState<RestaurantCommissionReport[]>([]);
  const [trends, setTrends] = useState<CommissionTrend[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentMethodBreakdown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trendInterval, setTrendInterval] = useState<'day' | 'week' | 'month'>('day');

  // Load commission data
  const loadCommissionData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load summary
      const summaryResponse = await fetch(
        `/api/admin/commission/analytics?action=summary&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      );
      const summaryData = await summaryResponse.json();
      
      if (summaryData.success) {
        setSummary(summaryData.data);
      }

      // Load restaurant reports
      const restaurantsResponse = await fetch(
        `/api/admin/commission/analytics?action=restaurants&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&limit=10`
      );
      const restaurantsData = await restaurantsResponse.json();
      
      if (restaurantsData.success) {
        setRestaurantReports(restaurantsData.data);
      }

      // Load trends
      const trendsResponse = await fetch(
        `/api/admin/commission/analytics?action=trends&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&interval=${trendInterval}`
      );
      const trendsData = await trendsResponse.json();
      
      if (trendsData.success) {
        setTrends(trendsData.data);
      }

      // Load payment method breakdown
      const paymentResponse = await fetch(
        `/api/admin/commission/analytics?action=payment-methods&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      );
      const paymentData = await paymentResponse.json();
      
      if (paymentData.success) {
        setPaymentBreakdown(paymentData.data);
      }

    } catch (err) {
      console.error('Error loading commission data:', err);
      setError('Failed to load commission data');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount and when date range changes
  useEffect(() => {
    loadCommissionData();
  }, [dateRange.startDate, dateRange.endDate, trendInterval]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Commission Dashboard</h1>
          <p className="text-muted-foreground">
            Track commission earnings and analytics across all restaurants
          </p>
        </div>
        <Button onClick={loadCommissionData} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh Data'}
        </Button>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
          <CardDescription>Select the period for commission analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                type="date"
                id="startDate"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                type="date"
                id="endDate"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="interval">Trend Interval</Label>
              <Select value={trendInterval} onValueChange={(value: 'day' | 'week' | 'month') => setTrendInterval(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalCommissions)}</div>
              <p className="text-xs text-muted-foreground">
                From {summary.tipCount} tips
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tips Processed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalTips)}</div>
              <p className="text-xs text-muted-foreground">
                Across {summary.restaurantCount} restaurants
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Commission Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.averageCommissionRate}%</div>
              <p className="text-xs text-muted-foreground">
                Weighted by tip amounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.totalTips > 0 ? ((summary.totalCommissions / summary.totalTips) * 100).toFixed(2) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Of total tip volume
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Analytics */}
      <Tabs defaultValue="restaurants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="restaurants">Restaurant Performance</TabsTrigger>
          <TabsTrigger value="trends">Commission Trends</TabsTrigger>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="restaurants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Restaurants by Commission</CardTitle>
              <CardDescription>
                Restaurants generating the most commission revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {restaurantReports.map((restaurant) => (
                  <div key={restaurant.restaurantId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium">{restaurant.restaurantName}</div>
                      <div className="text-sm text-muted-foreground">
                        {restaurant.tipCount} tips • Avg: {formatCurrency(restaurant.averageTipAmount)}
                      </div>
                      {restaurant.lastTipDate && (
                        <div className="text-xs text-muted-foreground">
                          Last tip: {formatDate(restaurant.lastTipDate)}
                        </div>
                      )}
                    </div>
                    <div className="text-right space-y-1">
                      <div className="font-bold">{formatCurrency(restaurant.totalCommissions)}</div>
                      <Badge variant="secondary">{restaurant.commissionRate}% rate</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Commission Trends</CardTitle>
              <CardDescription>
                Commission earnings over time ({trendInterval}ly)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trends.map((trend) => (
                  <div key={trend.date} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium">{formatDate(trend.date)}</div>
                      <div className="text-sm text-muted-foreground">
                        {trend.tipCount} tips • {trend.averageCommissionRate}% avg rate
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="font-bold">{formatCurrency(trend.totalCommissions)}</div>
                      <div className="text-sm text-muted-foreground">
                        from {formatCurrency(trend.totalTips)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Method Breakdown</CardTitle>
              <CardDescription>
                Commission earnings by payment method
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentBreakdown.map((method) => (
                  <div key={method.paymentMethod} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium capitalize">{method.paymentMethod}</div>
                      <div className="text-sm text-muted-foreground">
                        {method.tipCount} tips • {method.averageCommissionRate}% avg rate
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="font-bold">{formatCurrency(method.totalCommissions)}</div>
                      <div className="text-sm text-muted-foreground">
                        from {formatCurrency(method.totalTips)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}