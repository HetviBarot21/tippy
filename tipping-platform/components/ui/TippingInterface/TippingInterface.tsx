'use client';

import { useState } from 'react';
import { Tables } from '@/types_db';
import TipTypeSelection from './TipTypeSelection';
import WaiterSelection from './WaiterSelection';
import AmountEntry from './AmountEntry';
import TipConfirmation from './TipConfirmation';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';

type Restaurant = Tables<'restaurants'>;
type Waiter = Pick<Tables<'waiters'>, 'id' | 'name' | 'profile_photo_url'>;

interface Table {
  id: string;
  number: string;
  name: string | null;
}

interface TippingInterfaceProps {
  restaurant: Restaurant;
  table: Table;
  waiters: Waiter[];
}

type TipStep = 'loading' | 'tip-type' | 'waiter-selection' | 'amount-entry' | 'confirmation' | 'payment';

export default function TippingInterface({ restaurant, table, waiters }: TippingInterfaceProps) {
  const [currentStep, setCurrentStep] = useState<TipStep>('tip-type');
  const [tipType, setTipType] = useState<'waiter' | 'restaurant' | null>(null);
  const [selectedWaiter, setSelectedWaiter] = useState<Waiter | null>(null);
  const [tipAmount, setTipAmount] = useState<number>(0);

  const handleTipTypeSelect = (type: 'waiter' | 'restaurant') => {
    setTipType(type);
    if (type === 'restaurant') {
      setCurrentStep('amount-entry');
    } else {
      setCurrentStep('waiter-selection');
    }
  };

  const handleWaiterSelect = (waiter: Waiter) => {
    setSelectedWaiter(waiter);
    setCurrentStep('amount-entry');
  };

  const handleAmountConfirm = (amount: number) => {
    setTipAmount(amount);
    setCurrentStep('confirmation');
  };

  const handleTipConfirm = () => {
    setCurrentStep('payment');
  };

  const handleEditAmount = () => {
    setCurrentStep('amount-entry');
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'waiter-selection':
        setCurrentStep('tip-type');
        setTipType(null);
        break;
      case 'amount-entry':
        if (tipType === 'waiter') {
          setCurrentStep('waiter-selection');
          setSelectedWaiter(null);
        } else {
          setCurrentStep('tip-type');
          setTipType(null);
        }
        break;
      case 'confirmation':
        setCurrentStep('amount-entry');
        break;
      case 'payment':
        setCurrentStep('confirmation');
        break;
    }
  };

  if (currentStep === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">{restaurant.name}</h1>
          <p className="text-zinc-400">
            Table {table.number}
            {table.name && ` - ${table.name}`}
          </p>
        </div>

        {/* Back Button */}
        {currentStep !== 'tip-type' && (
          <button
            onClick={handleBack}
            className="mb-6 flex items-center text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}

        {/* Step Content */}
        {currentStep === 'tip-type' && (
          <TipTypeSelection onSelect={handleTipTypeSelect} />
        )}

        {currentStep === 'waiter-selection' && (
          <WaiterSelection 
            waiters={waiters} 
            onSelect={handleWaiterSelect}
            restaurantName={restaurant.name}
          />
        )}

        {currentStep === 'amount-entry' && (
          <AmountEntry
            tipType={tipType!}
            selectedWaiter={selectedWaiter}
            restaurantName={restaurant.name}
            onConfirm={handleAmountConfirm}
          />
        )}

        {currentStep === 'confirmation' && (
          <TipConfirmation
            tipType={tipType!}
            selectedWaiter={selectedWaiter}
            restaurantName={restaurant.name}
            amount={tipAmount}
            tableNumber={table.number}
            tableName={table.name}
            onConfirm={handleTipConfirm}
            onEdit={handleEditAmount}
          />
        )}

        {currentStep === 'payment' && (
          <div className="text-center text-white">
            <h2 className="text-xl font-semibold mb-4">Payment Processing</h2>
            <p className="text-zinc-400">Payment integration coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}