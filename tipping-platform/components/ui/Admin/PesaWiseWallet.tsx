'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface WalletData {
  balance: {
    success: boolean;
    data?: {
      account_balance: number;
      available_balance: number;
      reserved_balance: number;
    };
    error?: string;
  };
  transactions: {
    success: boolean;
    data?: {
      transactions: Array<{
        id: string;
        type: string;
        amount: number;
        phone: string;
        reference: string;
        description: string;
        status: string;
        mpesa_receipt_number?: string;
        created_at: string;
      }>;
      pagination: {
        current_page: number;
        total_pages: number;
        total_records: number;
        per_page: number;
      };
    };
    error?: string;
  };
}

export function PesaWiseWallet() {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchWalletData = async (currentPage: number = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/pesawise/wallet?page=${currentPage}&perPage=20`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch wallet data');
      }

      const data = await response.json();
      setWalletData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData(page);
  }, [page]);

  if (loading && !walletData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchWalletData(page)}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const balance = walletData?.balance?.data;
  const transactions = walletData?.transactions?.data?.transactions || [];
  const pagination = walletData?.transactions?.data?.pagination;

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Account Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">
              {balance ? `KES ${balance.account_balance.toLocaleString()}` : 'N/A'}
            </div>
            <p className="text-xs text-gray-700 mt-1">Total in account</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Available Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {balance ? `KES ${balance.available_balance.toLocaleString()}` : 'N/A'}
            </div>
            <p className="text-xs text-gray-700 mt-1">Ready to use</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Reserved Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {balance ? `KES ${balance.reserved_balance.toLocaleString()}` : 'N/A'}
            </div>
            <p className="text-xs text-gray-700 mt-1">Pending transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-black">Recent Transactions</CardTitle>
              <CardDescription className="text-gray-700">PesaWise wallet transaction history</CardDescription>
            </div>
            <Button onClick={() => fetchWalletData(page)} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transactions found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(tx.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <TransactionTypeBadge type={tx.type} />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-black">
                          {tx.reference}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {tx.phone || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-black">
                          KES {tx.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={tx.status} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {tx.mpesa_receipt_number || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.total_pages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Page {pagination.current_page} of {pagination.total_pages} 
                    ({pagination.total_records} total transactions)
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))}
                      disabled={page === pagination.total_pages}
                      variant="outline"
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TransactionTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    credit: 'bg-green-100 text-green-800',
    debit: 'bg-red-100 text-red-800',
    inbound: 'bg-blue-100 text-blue-800',
    outbound: 'bg-orange-100 text-orange-800'
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[type.toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>
      {type}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'bg-green-100 text-green-800',
    success: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800'
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}
