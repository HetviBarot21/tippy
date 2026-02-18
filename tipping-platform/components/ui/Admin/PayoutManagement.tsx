'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Payout {
  id: string;
  amount: number;
  status: string;
  payout_type: string;
  created_at: string;
  processed_at?: string;
  transaction_reference?: string;
  waiter?: { name: string; phone_number: string };
  restaurant?: { name: string };
}

interface PayoutManagementProps {
  pendingPayouts: Payout[];
  processingPayouts: Payout[];
  completedPayouts: Payout[];
  failedPayouts: Payout[];
  userEmail: string;
}

export function PayoutManagement({
  pendingPayouts,
  processingPayouts,
  completedPayouts,
  failedPayouts,
  userEmail
}: PayoutManagementProps) {
  const [processing, setProcessing] = useState(false);
  const [selectedPayouts, setSelectedPayouts] = useState<string[]>([]);

  const handleProcessPayouts = async () => {
    if (selectedPayouts.length === 0) {
      alert('Please select payouts to process');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/payouts/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutIds: selectedPayouts })
      });

      const result = await response.json();

      if (result.success) {
        alert(`Successfully processed ${result.processed_payouts}/${result.total_payouts} payouts`);
        window.location.reload();
      } else {
        alert(`Processing failed: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      alert('Failed to process payouts');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const togglePayout = (id: string) => {
    setSelectedPayouts(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const selectAll = (payouts: Payout[]) => {
    const ids = payouts.map(p => p.id);
    setSelectedPayouts(ids);
  };

  const totalPending = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);
  const totalProcessing = processingPayouts.reduce((sum, p) => sum + p.amount, 0);
  const totalCompleted = completedPayouts.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black">Payout Management</h1>
            <p className="text-gray-700">Process and manage waiter payouts via PesaWise</p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary">{userEmail}</Badge>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/admin'}
              className="text-black"
            >
              ← Back to Admin
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingPayouts.length}</div>
            <p className="text-xs text-gray-600 mt-1">KES {totalPending.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{processingPayouts.length}</div>
            <p className="text-xs text-gray-600 mt-1">KES {totalProcessing.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedPayouts.length}</div>
            <p className="text-xs text-gray-600 mt-1">KES {totalCompleted.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedPayouts.length}</div>
            <p className="text-xs text-gray-600 mt-1">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">Pending ({pendingPayouts.length})</TabsTrigger>
          <TabsTrigger value="processing">Processing ({processingPayouts.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="failed">Failed ({failedPayouts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-black">Pending Payouts</CardTitle>
                  <CardDescription className="text-gray-700">Select payouts to process via PesaWise</CardDescription>
                </div>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => selectAll(pendingPayouts)}
                    disabled={pendingPayouts.length === 0}
                  >
                    Select All
                  </Button>
                  <Button
                    onClick={handleProcessPayouts}
                    disabled={processing || selectedPayouts.length === 0}
                  >
                    {processing ? 'Processing...' : `Process ${selectedPayouts.length} Payouts`}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <PayoutTable
                payouts={pendingPayouts}
                selectedPayouts={selectedPayouts}
                onToggle={togglePayout}
                selectable
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing">
          <Card>
            <CardHeader>
              <CardTitle className="text-black">Processing Payouts</CardTitle>
              <CardDescription className="text-gray-700">Payouts currently being processed by PesaWise</CardDescription>
            </CardHeader>
            <CardContent>
              <PayoutTable payouts={processingPayouts} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle className="text-black">Completed Payouts</CardTitle>
              <CardDescription className="text-gray-700">Successfully processed payouts (last 50)</CardDescription>
            </CardHeader>
            <CardContent>
              <PayoutTable payouts={completedPayouts} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="failed">
          <Card>
            <CardHeader>
              <CardTitle className="text-black">Failed Payouts</CardTitle>
              <CardDescription className="text-gray-700">Payouts that failed and may need retry</CardDescription>
            </CardHeader>
            <CardContent>
              <PayoutTable payouts={failedPayouts} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface PayoutTableProps {
  payouts: Payout[];
  selectedPayouts?: string[];
  onToggle?: (id: string) => void;
  selectable?: boolean;
}

function PayoutTable({ payouts, selectedPayouts = [], onToggle, selectable }: PayoutTableProps) {
  if (payouts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No payouts found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            {selectable && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Select</th>}
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waiter</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {payouts.map((payout) => (
            <tr key={payout.id} className="hover:bg-gray-50">
              {selectable && (
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedPayouts.includes(payout.id)}
                    onChange={() => onToggle?.(payout.id)}
                    className="rounded border-gray-300"
                  />
                </td>
              )}
              <td className="px-4 py-3 text-sm font-medium text-black">
                {payout.waiter?.name || 'N/A'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {payout.restaurant?.name || 'N/A'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {payout.waiter?.phone_number || 'N/A'}
              </td>
              <td className="px-4 py-3 text-sm font-semibold text-black">
                KES {payout.amount.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {payout.payout_type}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {new Date(payout.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={payout.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-orange-100 text-orange-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800'
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}
