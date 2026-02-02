'use client';

import { useState } from 'react';
import { Tables } from '@/types_db';

type Waiter = Pick<Tables<'waiters'>, 'id' | 'name' | 'profile_photo_url'>;

interface AmountEntryProps {
  tipType: 'waiter' | 'restaurant';
  selectedWaiter: Waiter | null;
  restaurantName: string;
  onConfirm: (amount: number) => void;
}

const PRESET_AMOUNTS = [50, 100, 200, 500];
const MIN_AMOUNT = 10;
const MAX_AMOUNT = 10000;

export default function AmountEntry({ tipType, selectedWaiter, restaurantName, onConfirm }: AmountEntryProps) {
  const [amount, setAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handlePresetSelect = (presetAmount: number) => {
    setAmount(presetAmount);
    setCustomAmount('');
    setError('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const numValue = parseFloat(value);
    
    if (value === '') {
      setAmount(0);
      setError('');
      return;
    }

    if (isNaN(numValue)) {
      setError('Please enter a valid amount');
      return;
    }

    if (numValue < MIN_AMOUNT) {
      setError(`Minimum tip amount is ${MIN_AMOUNT} KES`);
      return;
    }

    if (numValue > MAX_AMOUNT) {
      setError(`Maximum tip amount is ${MAX_AMOUNT} KES`);
      return;
    }

    setAmount(numValue);
    setError('');
  };

  const handleConfirm = () => {
    if (amount < MIN_AMOUNT) {
      setError(`Minimum tip amount is ${MIN_AMOUNT} KES`);
      return;
    }

    if (amount > MAX_AMOUNT) {
      setError(`Maximum tip amount is ${MAX_AMOUNT} KES`);
      return;
    }

    onConfirm(amount);
  };

  const isValidAmount = amount >= MIN_AMOUNT && amount <= MAX_AMOUNT;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-white mb-2">Enter Tip Amount</h2>
        {tipType === 'waiter' && selectedWaiter ? (
          <p className="text-zinc-400">Tipping {selectedWaiter.name}</p>
        ) : (
          <p className="text-zinc-400">Tipping {restaurantName}</p>
        )}
      </div>

      {/* Tip Summary Card */}
      <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
        <div className="flex items-center space-x-4">
          {tipType === 'waiter' && selectedWaiter ? (
            <>
              {selectedWaiter.profile_photo_url ? (
                <img
                  src={selectedWaiter.profile_photo_url}
                  alt={selectedWaiter.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-zinc-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              <div>
                <h3 className="font-semibold text-white">{selectedWaiter.name}</h3>
                <p className="text-sm text-zinc-400">Personal tip</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-zinc-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">{restaurantName}</h3>
                <p className="text-sm text-zinc-400">Restaurant tip (shared)</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Preset Amount Buttons */}
      <div>
        <h3 className="text-white font-medium mb-3">Quick amounts (KES)</h3>
        <div className="grid grid-cols-2 gap-3">
          {PRESET_AMOUNTS.map((presetAmount) => (
            <button
              key={presetAmount}
              onClick={() => handlePresetSelect(presetAmount)}
              className={`py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                amount === presetAmount
                  ? 'bg-white text-zinc-900'
                  : 'bg-zinc-700 text-white hover:bg-zinc-600 border border-zinc-600'
              }`}
            >
              {presetAmount} KES
            </button>
          ))}
        </div>
      </div>

      {/* Custom Amount Input */}
      <div>
        <h3 className="text-white font-medium mb-3">Or enter custom amount</h3>
        <div className="relative">
          <input
            type="number"
            placeholder="Enter amount"
            value={customAmount}
            onChange={(e) => handleCustomAmountChange(e.target.value)}
            min={MIN_AMOUNT}
            max={MAX_AMOUNT}
            className="w-full bg-zinc-800 text-white placeholder-zinc-400 border border-zinc-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
          />
          <span className="absolute right-3 top-3 text-zinc-400">KES</span>
        </div>
        {error && (
          <p className="text-red-400 text-sm mt-2">{error}</p>
        )}
        <p className="text-xs text-zinc-500 mt-2">
          Amount must be between {MIN_AMOUNT} and {MAX_AMOUNT} KES
        </p>
      </div>

      {/* Amount Display */}
      {amount > 0 && (
        <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
          <div className="text-center">
            <p className="text-zinc-400 text-sm">Total tip amount</p>
            <p className="text-2xl font-bold text-white">{amount} KES</p>
          </div>
        </div>
      )}

      {/* Confirm Button */}
      <button
        onClick={handleConfirm}
        disabled={!isValidAmount}
        className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 ${
          isValidAmount
            ? 'bg-white text-zinc-900 hover:bg-zinc-100 transform hover:scale-105'
            : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
        }`}
      >
        {isValidAmount ? `Confirm ${amount} KES Tip` : 'Enter Valid Amount'}
      </button>

      <div className="text-center">
        <p className="text-xs text-zinc-500">
          You'll be redirected to payment after confirmation
        </p>
      </div>
    </div>
  );
}