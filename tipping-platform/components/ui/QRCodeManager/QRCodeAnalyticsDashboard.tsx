'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, QrCode, TrendingUp, Users, Activity } from 'lucide-react';

interface QRAnalytics {
  qrCode: {
    id: string;
    table_number: string;
    table_name?: string;
    is_active: boolean;
    created_at: string;
  };
  analytics: {
    totalTips: number;
    totalAmount: number;
    recentTipsCount: number;
    recentAmount: number;
    waiterTipsCount: number;
    waiterTipsAmount: number;
    restaurantTipsCount: number;
    restaurantTipsAmount: number;
    dailyUsage: Array<{
      date: string;
      tipCount: number;
      amount: number;
    }>;
    averageTipAmount: number;
    lastTipDate?: string;
  };
}

interface AnalyticsData {
  period: string;
  summary: {
    totalQRCodes: number;
    activeQRCodes: number;
    usedQRCodes: number;
    totalRecentTips: number;
    totalRecentAmount: number;
    averagePerTable: number;
  };
  qrAnalytics: QRAnalytics[];
  topTables: QRAnalytics[];
}

interface Props {
  restaurantId: string;
}

export function QRCodeAnalyticsDashboard({ restaurantId }: Props) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');

  const fetchAnalytics = async (days: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/restaurants/${restaurantId}/qr-analytics?days=${days}`);
      if (!response.ok) {
        throw new Error('Failed to fetch QR analytics');
      }
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (error) {
      console.error('Error fetching QR analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(selectedPeriod);
  }, [restaurantId, selectedPeriod]);

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
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
        <span className="ml-2 text-white">Loading QR analytics...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-8">
        <p className="text-zinc-400">Failed to load QR analytics data</p>
        <Button 
          onClick={() => fetchAnalytics(selectedPeriod)}
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
      {/* Header with Period Selection */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">QR Code Analytics</h3>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-40 bg-zinc-900 border-zinc-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="7" className="text-white">Last 7 days</SelectItem>
            <SelectItem value="30" className="text-white">Last 30 days</SelectItem>
            <SelectItem value="90" className="text-white">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total QR Codes</CardTitle>
            <QrCode className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data.summary.totalQRCodes}</div>
            <p className="text-xs text-zinc-400">
              {data.summary.activeQRCodes} active
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Used Tables</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data.summary.usedQRCodes}</div>
            <p className="text-xs text-zinc-400">
              {data.summary.usedQRCodes > 0 ? 
                `${Math.round((data.summary.usedQRCodes / data.summary.totalQRCodes) * 100)}% utilization` :
                'No usage yet'
              }
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Tips</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data.summary.totalRecentTips}</div>
            <p className="text-xs text-zinc-400">
              {formatCurrency(data.summary.totalRecentAmount)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Avg per Table</CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(data.summary.averagePerTable)}
            </div>
            <p className="text-xs text-zinc-400">
              Per active table
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Tables */}
        <Card className="bg-zinc-900 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-white">Top Performing Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.topTables.length > 0 ? (
                data.topTables.map((table, index) => (
                  <div key={table.qrCode.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          Table {table.qrCode.table_number}
                        </p>
                        {table.qrCode.table_name && (
                          <p className="text-sm text-zinc-400">{table.qrCode.table_name}</p>
                        )}
                        <p className="text-xs text-zinc-500">
                          {table.analytics.recentTipsCount} tips
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white">
                        {formatCurrency(table.analytics.recentAmount)}
                      </p>
                      <p className="text-xs text-zinc-400">
                        Avg: {formatCurrency(table.analytics.averageTipAmount)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-zinc-400 text-center py-4">No tips received yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table Status Overview */}
        <Card className="bg-zinc-900 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-white">Table Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.qrAnalytics.slice(0, 8).map((table) => (
                <div key={table.qrCode.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-white">
                        Table {table.qrCode.table_number}
                      </span>
                      <Badge 
                        variant={table.qrCode.is_active ? "default" : "secondary"}
                        className={table.qrCode.is_active ? 'bg-green-600' : 'bg-zinc-600'}
                      >
                        {table.qrCode.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white">
                      {table.analytics.recentTipsCount} tips
                    </p>
                    <p className="text-xs text-zinc-400">
                      {formatCurrency(table.analytics.recentAmount)}
                    </p>
                  </div>
                </div>
              ))}
              {data.qrAnalytics.length > 8 && (
                <p className="text-xs text-zinc-500 text-center">
                  And {data.qrAnalytics.length - 8} more tables...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table Analytics */}
      <Card className="bg-zinc-900 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-white">Detailed Table Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-2 text-zinc-400">Table</th>
                  <th className="text-left py-2 text-zinc-400">Status</th>
                  <th className="text-right py-2 text-zinc-400">Tips ({data.period})</th>
                  <th className="text-right py-2 text-zinc-400">Amount</th>
                  <th className="text-right py-2 text-zinc-400">Avg Tip</th>
                  <th className="text-right py-2 text-zinc-400">Last Tip</th>
                </tr>
              </thead>
              <tbody>
                {data.qrAnalytics.map((table) => (
                  <tr key={table.qrCode.id} className="border-b border-zinc-800">
                    <td className="py-3">
                      <div>
                        <span className="font-medium text-white">
                          Table {table.qrCode.table_number}
                        </span>
                        {table.qrCode.table_name && (
                          <div className="text-xs text-zinc-400">{table.qrCode.table_name}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge 
                        variant={table.qrCode.is_active ? "default" : "secondary"}
                        className={table.qrCode.is_active ? 'bg-green-600' : 'bg-zinc-600'}
                      >
                        {table.qrCode.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3 text-right text-white">
                      {table.analytics.recentTipsCount}
                    </td>
                    <td className="py-3 text-right text-white">
                      {formatCurrency(table.analytics.recentAmount)}
                    </td>
                    <td className="py-3 text-right text-white">
                      {table.analytics.recentTipsCount > 0 ? 
                        formatCurrency(table.analytics.averageTipAmount) : 
                        '-'
                      }
                    </td>
                    <td className="py-3 text-right text-zinc-400 text-xs">
                      {table.analytics.lastTipDate ? 
                        formatDate(table.analytics.lastTipDate) : 
                        'Never'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}