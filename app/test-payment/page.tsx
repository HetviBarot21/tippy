'use client';

import { useState } from 'react';

export default function TestPaymentPage() {
  const [amount, setAmount] = useState('100');
  const [phone, setPhone] = useState('254712345678');
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('mpesa');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [tipId, setTipId] = useState<string>('');
  const [statusChecking, setStatusChecking] = useState(false);

  // Test IDs (you'll need to create these in Supabase Studio first)
  const testRestaurantId = '550e8400-e29b-41d4-a716-446655440000';
  const testWaiterId = '550e8400-e29b-41d4-a716-446655440001';

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: testRestaurantId,
          waiterId: testWaiterId,
          amount: parseFloat(amount),
          phoneNumber: paymentMethod === 'mpesa' ? phone : undefined,
          tipType: 'waiter',
          paymentMethod,
        }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        setTipId(data.tipId);
        
        if (paymentMethod === 'mpesa') {
          alert('✅ STK Push sent! Check your phone to complete payment.');
          // Start polling for status
          startStatusPolling(data.tipId);
        } else if (data.paymentLink) {
          alert('✅ Payment link created! Opening payment page...');
          // Open payment link in new tab
          window.open(data.paymentLink, '_blank');
        }
      } else {
        alert('❌ Payment failed: ' + (data.error || data.message));
      }
    } catch (error: any) {
      alert('❌ Error: ' + error.message);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function startStatusPolling(tipId: string) {
    setStatusChecking(true);
    let attempts = 0;
    const maxAttempts = 30;

    const interval = setInterval(async () => {
      attempts++;

      try {
        const response = await fetch(`/api/payments/status?tipId=${tipId}`);
        const data = await response.json();

        if (data.status === 'completed') {
          clearInterval(interval);
          setStatusChecking(false);
          alert('🎉 Payment completed successfully!');
          setResult({ ...result, finalStatus: 'completed' });
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setStatusChecking(false);
          alert('❌ Payment failed');
          setResult({ ...result, finalStatus: 'failed' });
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setStatusChecking(false);
          alert('⏱️ Payment is taking longer than expected. Check status manually.');
        }
      } catch (error) {
        console.error('Status check error:', error);
      }
    }, 2000); // Check every 2 seconds
  }

  async function checkStatus() {
    if (!tipId) {
      alert('No tip ID available');
      return;
    }

    setStatusChecking(true);
    try {
      const response = await fetch(`/api/payments/status?tipId=${tipId}`);
      const data = await response.json();
      alert(`Payment Status: ${data.status}\n${data.message}`);
      setResult({ ...result, statusCheck: data });
    } catch (error: any) {
      alert('Error checking status: ' + error.message);
    } finally {
      setStatusChecking(false);
    }
  }

  return (
    <div style={{ 
      maxWidth: '600px', 
      margin: '50px auto', 
      padding: '30px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#f5f5f5',
      borderRadius: '12px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }}>
      <h1 style={{ textAlign: 'center', color: '#333', marginBottom: '10px' }}>
        🧪 Payment Test Page
      </h1>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>
        Test Pesawise M-Pesa & Card Payments
      </p>

      <form onSubmit={handlePayment}>
        {/* Payment Method Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#333' }}>
            Payment Method:
          </label>
          <div style={{ display: 'flex', gap: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                value="mpesa"
                checked={paymentMethod === 'mpesa'}
                onChange={(e) => setPaymentMethod('mpesa')}
                style={{ marginRight: '8px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '16px' }}>📱 M-Pesa</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                value="card"
                checked={paymentMethod === 'card'}
                onChange={(e) => setPaymentMethod('card')}
                style={{ marginRight: '8px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '16px' }}>💳 Card</span>
            </label>
          </div>
        </div>

        {/* Amount Input */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
            Amount (KES):
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min="1"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '2px solid #ddd',
              borderRadius: '8px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Phone Number Input (only for M-Pesa) */}
        {paymentMethod === 'mpesa' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
              Phone Number:
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="254712345678"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                boxSizing: 'border-box'
              }}
            />
            <small style={{ color: '#666', fontSize: '12px' }}>
              Format: 254XXXXXXXXX
            </small>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '15px',
            fontSize: '18px',
            fontWeight: 'bold',
            color: 'white',
            backgroundColor: loading ? '#ccc' : '#4CAF50',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '15px'
          }}
        >
          {loading ? '⏳ Processing...' : `Pay KES ${amount} with ${paymentMethod === 'mpesa' ? 'M-Pesa' : 'Card'}`}
        </button>

        {/* Check Status Button */}
        {tipId && (
          <button
            type="button"
            onClick={checkStatus}
            disabled={statusChecking}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              color: '#333',
              backgroundColor: '#f0f0f0',
              border: '2px solid #ddd',
              borderRadius: '8px',
              cursor: statusChecking ? 'not-allowed' : 'pointer'
            }}
          >
            {statusChecking ? '⏳ Checking...' : '🔍 Check Payment Status'}
          </button>
        )}
      </form>

      {/* Result Display */}
      {result && (
        <div style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: result.success ? '#e8f5e9' : '#ffebee',
          borderRadius: '8px',
          border: `2px solid ${result.success ? '#4CAF50' : '#f44336'}`
        }}>
          <h3 style={{ marginTop: 0, color: result.success ? '#2e7d32' : '#c62828' }}>
            {result.success ? '✅ Success' : '❌ Error'}
          </h3>
          <pre style={{
            backgroundColor: 'white',
            padding: '15px',
            borderRadius: '6px',
            overflow: 'auto',
            fontSize: '12px',
            lineHeight: '1.5'
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {/* Instructions */}
      <div style={{
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#fff3cd',
        borderRadius: '8px',
        border: '2px solid #ffc107'
      }}>
        <h3 style={{ marginTop: 0, color: '#856404' }}>📋 Setup Instructions:</h3>
        <ol style={{ color: '#856404', lineHeight: '1.8' }}>
          <li>Make sure Docker Desktop is running</li>
          <li>Run: <code style={{ backgroundColor: '#fff', padding: '2px 6px', borderRadius: '4px' }}>npx supabase start</code></li>
          <li>Run: <code style={{ backgroundColor: '#fff', padding: '2px 6px', borderRadius: '4px' }}>npx supabase db reset</code></li>
          <li>Open Supabase Studio: <a href="http://localhost:54323" target="_blank" style={{ color: '#0066cc' }}>http://localhost:54323</a></li>
          <li>Add test data using the SQL in SETUP_GUIDE.md</li>
          <li>Test payments on this page!</li>
        </ol>
      </div>

      {/* Quick Links */}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <a 
          href="http://localhost:54323" 
          target="_blank"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            margin: '5px',
            backgroundColor: '#3ECF8E',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 'bold'
          }}
        >
          🗄️ Supabase Studio
        </a>
        <a 
          href="/" 
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            margin: '5px',
            backgroundColor: '#333',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 'bold'
          }}
        >
          🏠 Home
        </a>
      </div>
    </div>
  );
}
