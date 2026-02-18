'use client';

import { useState } from 'react';
import { Tables } from '@/types_db';

type Waiter = Pick<Tables<'waiters'>, 'id' | 'name' | 'profile_photo_url'>;

interface PaymentInterfaceProps {
  tipType: 'waiter' | 'restaurant';
  selectedWaiter: Waiter | null;
  restaurantId: string;
  restaurantName: string;
  amount: number;
  tableId: string | null;
  tableNumber: string;
  tableName: string | null;
  onSuccess: (transactionId: string) => void;
  onError: (error: string) => void;
  onBack: () => void;
}

export default function PaymentInterface(props: PaymentInterfaceProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('mpesa');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'input' | 'processing' | 'success' | 'error'>('input');
  const [errorMessage, setErrorMessage] = useState('');
  const [transactionId, setTransactionId] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsProcessing(true);
    setPaymentStatus('processing');
    
    if (paymentMethod === 'mpesa') {
      setStatusMessage('Initiating M-Pesa payment...');
    } else {
      setStatusMessage('Redirecting to card payment...');
    }

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: props.amount,
          tipType: props.tipType,
          restaurantId: props.restaurantId,
          waiterId: props.selectedWaiter?.id,
          tableId: props.tableId,
          paymentMethod: paymentMethod,
          customerPhone: paymentMethod === 'mpesa' ? phoneNumber : undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to initiate ${paymentMethod === 'mpesa' ? 'M-Pesa' : 'card'} payment`);
      }

      if (paymentMethod === 'mpesa') {
        setStatusMessage('STK Push sent to your phone. Please check your phone and enter your M-Pesa PIN.');
        pollPaymentStatus(data.tipId);
      } else {
        // For card payment, redirect to payment gateway
        if (data.paymentUrl) {
          window.location.href = data.paymentUrl;
        } else {
          throw new Error('Payment URL not provided');
        }
      }

    } catch (error) {
      console.error('Payment error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to initiate payment');
      setPaymentStatus('error');
      setIsProcessing(false);
    }
  };

  const pollPaymentStatus = async (tipId: string) => {
    let attempts = 0;
    const maxAttempts = 30; // Poll for 5 minutes (30 * 10 seconds)
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/payments/${tipId}/status`);
        const data = await response.json();
        
        if (data.status === 'completed') {
          setStatusMessage('Payment successful!');
          setTransactionId(data.tipId);
          setPaymentStatus('success');
          setTimeout(() => {
            props.onSuccess(data.tipId);
          }, 2000);
          return;
        } else if (data.status === 'failed') {
          setErrorMessage('Payment failed. Please try again.');
          setPaymentStatus('error');
          setIsProcessing(false);
          return;
        } else if (data.status === 'cancelled') {
          setErrorMessage('Payment was cancelled. You can try again.');
          setPaymentStatus('error');
          setIsProcessing(false);
          return;
        } else if (data.status === 'timeout') {
          setErrorMessage('Payment timed out. Please try again.');
          setPaymentStatus('error');
          setIsProcessing(false);
          return;
        }
        
        // Continue polling if still processing
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000); // Poll every 10 seconds
          setStatusMessage(`Waiting for payment confirmation... (${Math.floor(attempts * 10 / 60)}:${(attempts * 10 % 60).toString().padStart(2, '0')})`);
        } else {
          setErrorMessage('Payment verification timed out. Please check your M-Pesa messages or try again.');
          setPaymentStatus('error');
          setIsProcessing(false);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000);
        } else {
          setErrorMessage('Unable to verify payment status. Please contact support if money was deducted.');
          setPaymentStatus('error');
          setIsProcessing(false);
        }
      }
    };
    
    // Start polling after 5 seconds
    setTimeout(poll, 5000);
  };

  const resetPayment = () => {
    setPaymentStatus('input');
    setErrorMessage('');
    setTransactionId('');
    setStatusMessage('');
    setIsProcessing(false);
  };

  if (paymentStatus === 'success') {
    return (
      <div className="text-center space-y-6">
        <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
          <p className="text-zinc-400 mb-4">Your tip has been processed successfully</p>
          <p className="text-sm text-zinc-500">Transaction ID: {transactionId}</p>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'error') {
    return (
      <div className="text-center space-y-6">
        <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Payment Failed</h2>
          <p className="text-zinc-400 mb-4">{errorMessage}</p>
        </div>
        <div className="space-y-3">
          <button
            onClick={resetPayment}
            className="w-full bg-white text-zinc-900 font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:bg-zinc-100"
          >
            Try Again
          </button>
          <button
            onClick={props.onBack}
            className="w-full bg-zinc-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 hover:bg-zinc-600 border border-zinc-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-white mb-2">Payment Method</h2>
        <p className="text-zinc-400">Choose how you want to pay</p>
      </div>

      {/* Tip Summary */}
      <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
        <div className="flex justify-between items-center">
          <span className="text-zinc-300">Tip Amount</span>
          <span className="text-xl font-bold text-white">{props.amount} KES</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-zinc-400 text-sm">
            {props.tipType === 'waiter' ? `To: ${props.selectedWaiter?.name}` : `To: ${props.restaurantName} Team`}
          </span>
        </div>
      </div>

      {/* Payment Method Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Select Payment Method
        </label>
        
        {/* M-Pesa Option */}
        <button
          type="button"
          onClick={() => setPaymentMethod('mpesa')}
          disabled={isProcessing}
          className={`w-full p-4 rounded-lg border-2 transition-all ${
            paymentMethod === 'mpesa'
              ? 'border-green-500 bg-green-500/10'
              : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-white font-medium">M-Pesa</h3>
              <p className="text-xs text-zinc-400">Pay with your Safaricom phone</p>
            </div>
            {paymentMethod === 'mpesa' && (
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </button>

        {/* Card Option */}
        <button
          type="button"
          onClick={() => setPaymentMethod('card')}
          disabled={isProcessing}
          className={`w-full p-4 rounded-lg border-2 transition-all ${
            paymentMethod === 'card'
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-white font-medium">Debit/Credit Card</h3>
              <p className="text-xs text-zinc-400">Pay with Visa, Mastercard, or other cards</p>
            </div>
            {paymentMethod === 'card' && (
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* M-Pesa Phone Number Input */}
        {paymentMethod === 'mpesa' && (
          <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-zinc-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="254712345678 or 0712345678"
                className="w-full bg-zinc-900 border border-zinc-600 rounded-lg px-4 py-3 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
                disabled={isProcessing}
              />
              <p className="text-xs text-zinc-500 mt-1">
                Enter your Safaricom phone number
              </p>
            </div>
          </div>
        )}

        {/* Card Payment Info */}
        {paymentMethod === 'card' && (
          <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm text-zinc-300">
                  You will be redirected to a secure payment page to enter your card details.
                </p>
                <p className="text-xs text-zinc-500 mt-2">
                  We accept Visa, Mastercard, and other major cards.
                </p>
              </div>
            </div>
          </div>
        )}

        {statusMessage && (
          <div className="bg-blue-900/50 border border-blue-700 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              {isProcessing && (
                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              )}
              <p className="text-blue-200 text-sm">{statusMessage}</p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isProcessing || (paymentMethod === 'mpesa' && !phoneNumber)}
          className={`w-full font-semibold py-4 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
            paymentMethod === 'mpesa'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isProcessing ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Processing...</span>
            </div>
          ) : (
            `Pay ${props.amount} KES ${paymentMethod === 'mpesa' ? 'via M-Pesa' : 'with Card'}`
          )}
        </button>

        {paymentMethod === 'mpesa' && (
          <div className="text-center">
            <p className="text-xs text-zinc-500">
              You will receive an STK push notification on your phone. Enter your M-Pesa PIN to complete the payment.
            </p>
          </div>
        )}
      </form>

      {!isProcessing && (
        <button
          onClick={props.onBack}
          className="w-full bg-zinc-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 hover:bg-zinc-600 border border-zinc-600"
        >
          Back to Confirmation
        </button>
      )}
    </div>
  );
}
