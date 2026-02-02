'use client';

import { Tables } from '@/types_db';

type Waiter = Pick<Tables<'waiters'>, 'id' | 'name' | 'profile_photo_url'>;

interface TipConfirmationProps {
  tipType: 'waiter' | 'restaurant';
  selectedWaiter: Waiter | null;
  restaurantName: string;
  amount: number;
  tableNumber: string;
  tableName: string | null;
  onConfirm: () => void;
  onEdit: () => void;
}

export default function TipConfirmation({
  tipType,
  selectedWaiter,
  restaurantName,
  amount,
  tableNumber,
  tableName,
  onConfirm,
  onEdit
}: TipConfirmationProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-white mb-2">Confirm Your Tip</h2>
        <p className="text-zinc-400">Please review the details before proceeding to payment</p>
      </div>

      {/* Tip Summary Card */}
      <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700 space-y-4">
        {/* Restaurant Info */}
        <div className="border-b border-zinc-700 pb-4">
          <h3 className="text-white font-semibold text-lg">{restaurantName}</h3>
          <p className="text-zinc-400">
            Table {tableNumber}
            {tableName && ` - ${tableName}`}
          </p>
        </div>

        {/* Recipient Info */}
        <div className="flex items-center space-x-4">
          {tipType === 'waiter' && selectedWaiter ? (
            <>
              {selectedWaiter.profile_photo_url ? (
                <img
                  src={selectedWaiter.profile_photo_url}
                  alt={selectedWaiter.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-zinc-600 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              <div>
                <h4 className="font-semibold text-white text-lg">{selectedWaiter.name}</h4>
                <p className="text-zinc-400">Your waiter</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-zinc-600 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-white text-lg">{restaurantName}</h4>
                <p className="text-zinc-400">Restaurant team (shared tip)</p>
              </div>
            </>
          )}
        </div>

        {/* Amount Display */}
        <div className="bg-zinc-900 rounded-lg p-4 text-center">
          <p className="text-zinc-400 text-sm mb-1">Tip Amount</p>
          <p className="text-3xl font-bold text-white">{amount} KES</p>
        </div>
      </div>

      {/* Payment Methods Info */}
      <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
        <h4 className="text-white font-medium mb-3">Payment Options</h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">M</span>
            </div>
            <span className="text-zinc-300">M-Pesa Mobile Payment</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <span className="text-zinc-300">Credit/Debit Card</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={onConfirm}
          className="w-full bg-white text-zinc-900 font-semibold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 hover:bg-zinc-100"
        >
          Proceed to Payment
        </button>
        
        <button
          onClick={onEdit}
          className="w-full bg-zinc-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 hover:bg-zinc-600 border border-zinc-600"
        >
          Edit Tip Amount
        </button>
      </div>

      <div className="text-center">
        <p className="text-xs text-zinc-500">
          Your payment is secure and processed through encrypted channels
        </p>
      </div>
    </div>
  );
}