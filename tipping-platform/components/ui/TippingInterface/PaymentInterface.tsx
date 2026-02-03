'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Tables } from '@/types_db';

type Waiter = Pick<Tables<'waiters'>, 'id' | 'name' | 'profile_photo_url'>;

interface PaymentInterfaceProps {
  tipType: 'waiter' | 'restaurant';
  selectedWaiter: Waiter | null;
  restaurantId: string;
  restaurantName: string;
  amount: number;
  tableId: string;
  tableNumber: string;
  tableName: string | null;
  onSuccess: (transactionId: string) => void;
  onError: (error: string) => void;
  onBack: () => void;
}

// Initialize Stripe
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#ffffff',
      '::placeholder': {
        color: '#9ca3af',
      },
      backgroundColor: 'transparent',
    },
    invalid: {
      color: '#ef4444',
    },
  },
};

function CardPaymentForm({
  tipType,
  selectedWaiter,
  restaurantId,
  amount,
  tableId,
  onSuccess,
  onError
}: Omit<PaymentInterfaceProps, 'restaurantName' | 'tableNumber' | 'tableName' | 'onBack'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>('');

  // Create payment intent when component mounts
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const response = await fetch('/api/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount,
            tipType,
            restaurantId,
            waiterId: selectedWaiter?.id,
            tableId,
            paymentMethod: 'card'
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create payment intent');
        }

        setClientSecret(data.clientSecret);
      } catch (error) {
        console.error('Error creating payment intent:', error);
        onError(error instanceof Error ? error.message : 'Failed to initialize payment');
      }
    };

    createPaymentIntent();
  }, [amount, tipType, restaurantId, selectedWaiter?.id, tableId, onError]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsProcessing(true);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      onError('Card element not found');
      setIsProcessing(false);
      return;
    }

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        console.error('Payment failed:', error);
        onError(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent.id);
      }
    } catch (error) {
      console.error('Payment error:', error);
      onError('An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
        <h3 className="text-white font-medium mb-4">Card Details</h3>
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-600">
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      <button
        type="submit"
        disabled={!stripe || !clientSecret || isProcessing}
        className="w-full bg-blue-600 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Processing Payment...</span>
          </div>
        ) : (
          `Pay ${amount} KES`
        )}
      </button>

      <div className="text-center">
        <p className="text-xs text-zinc-500">
          Your payment is secured by Stripe with 256-bit SSL encryption
        </p>
      </div>
    </form>
  );
}

function MPesaPaymentForm({
  amount,
  onError
}: {
  amount: number;
  onError: (error: string) => void;
}) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsProcessing(true);

    // M-Pesa integration placeholder
    setTimeout(() => {
      setIsProcessing(false);
      onError('M-Pesa integration coming soon');
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
        <h3 className="text-white font-medium mb-4">M-Pesa Payment</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-zinc-300 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="254712345678"
              className="w-full bg-zinc-900 border border-zinc-600 rounded-lg px-4 py-3 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isProcessing || !phoneNumber}
        className="w-full bg-green-600 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Sending STK Push...</span>
          </div>
        ) : (
          `Pay ${amount} KES via M-Pesa`
        )}
      </button>

      <div className="text-center">
        <p className="text-xs text-zinc-500">
          You will receive an STK push notification on your phone
        </p>
      </div>
    </form>
  );
}

export default function PaymentInterface(props: PaymentInterfaceProps) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | 'mpesa' | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'selecting' | 'processing' | 'success' | 'error'>('selecting');
  const [errorMessage, setErrorMessage] = useState('');
  const [transactionId, setTransactionId] = useState('');

  const handlePaymentSuccess = (txId: string) => {
    setTransactionId(txId);
    setPaymentStatus('success');
    setTimeout(() => {
      props.onSuccess(txId);
    }, 2000);
  };

  const handlePaymentError = (error: string) => {
    setErrorMessage(error);
    setPaymentStatus('error');
  };

  const resetPayment = () => {
    setSelectedPaymentMethod(null);
    setPaymentStatus('selecting');
    setErrorMessage('');
    setTransactionId('');
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
        <h2 className="text-xl font-semibold text-white mb-2">Choose Payment Method</h2>
        <p className="text-zinc-400">Select how you'd like to pay your tip</p>
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

      {!selectedPaymentMethod ? (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedPaymentMethod('card')}
            className="w-full bg-zinc-800 border border-zinc-600 rounded-lg p-4 text-left hover:bg-zinc-700 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-medium">Credit/Debit Card</h3>
                <p className="text-zinc-400 text-sm">Visa, Mastercard, and other cards</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedPaymentMethod('mpesa')}
            className="w-full bg-zinc-800 border border-zinc-600 rounded-lg p-4 text-left hover:bg-zinc-700 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <div>
                <h3 className="text-white font-medium">M-Pesa</h3>
                <p className="text-zinc-400 text-sm">Mobile money payment</p>
              </div>
            </div>
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">
              {selectedPaymentMethod === 'card' ? 'Card Payment' : 'M-Pesa Payment'}
            </h3>
            <button
              onClick={() => setSelectedPaymentMethod(null)}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {selectedPaymentMethod === 'card' ? (
            <Elements stripe={stripePromise}>
              <CardPaymentForm
                tipType={props.tipType}
                selectedWaiter={props.selectedWaiter}
                restaurantId={props.restaurantId}
                amount={props.amount}
                tableId={props.tableId}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </Elements>
          ) : (
            <MPesaPaymentForm
              amount={props.amount}
              onError={handlePaymentError}
            />
          )}
        </div>
      )}

      {!selectedPaymentMethod && (
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