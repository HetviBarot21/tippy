'use client';

import { useState } from 'react';
import { Tables } from '@/types_db';
import TipTypeSelection from './TipTypeSelection';
import WaiterSelection from './WaiterSelection';
import AmountEntry from './AmountEntry';
import TipConfirmation from './TipConfirmation';
import PaymentInterface from './PaymentInterface';
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
  table: Table | null;
  waiters: Waiter[];
}

type TipStep = 'loading' | 'tip-type' | 'waiter-selection' | 'amount-entry' | 'confirmation' | 'payment' | 'success';

export default function TippingInterface({ restaurant, table, waiters }: TippingInterfaceProps) {
  const [currentStep, setCurrentStep] = useState<TipStep>('tip-type');
  const [tipType, setTipType] = useState<'waiter' | 'restaurant' | null>(null);
  const [selectedWaiter, setSelectedWaiter] = useState<Waiter | null>(null);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [transactionId, setTransactionId] = useState<string>('');

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

  const handlePaymentSuccess = (txId: string) => {
    setTransactionId(txId);
    setCurrentStep('success');
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    // Could show error state or go back to confirmation
    setCurrentStep('confirmation');
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
          {table && (
            <p className="text-zinc-400">
              Table {table.number}
              {table.name && ` - ${table.name}`}
            </p>
          )}
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
            tableNumber={table?.number || ''}
            tableName={table?.name || null}
            onConfirm={handleTipConfirm}
            onEdit={handleEditAmount}
          />
        )}

        {currentStep === 'payment' && (
          <PaymentInterface
            tipType={tipType!}
            selectedWaiter={selectedWaiter}
            restaurantId={restaurant.id}
            restaurantName={restaurant.name}
            amount={tipAmount}
            tableId={table?.id || null}
            tableNumber={table?.number || ''}
            tableName={table?.name || null}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onBack={() => setCurrentStep('confirmation')}
          />
        )}

        {currentStep === 'success' && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Thank You!</h2>
              <p className="text-zinc-400 mb-4">Your tip has been sent successfully</p>
              {transactionId && (
                <p className="text-sm text-zinc-500">Transaction ID: {transactionId}</p>
              )}
            </div>
            <button
              onClick={() => {
                setCurrentStep('tip-type');
                setTipType(null);
                setSelectedWaiter(null);
                setTipAmount(0);
                setTransactionId('');
              }}
              className="bg-white text-zinc-900 font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:bg-zinc-100"
            >
              Send Another Tip
            </button>
          </div>
        )}
      </div>
    </div>
  );
}