import { createClient } from '@/utils/supabase/server';
import QRCode from 'qrcode';
import { redirect } from 'next/navigation';

export default async function SetupTestPage() {
  const supabase = createClient();

  // Create test restaurant
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .upsert({
      id: 'test-restaurant-123',
      name: 'Test Restaurant',
      slug: 'test-restaurant',
      email: 'test@restaurant.com',
      commission_rate: 10.0,
      is_active: true,
      address: '123 Test Street, Nairobi',
      phone_number: '+254700123456'
    })
    .select()
    .single();

  if (restaurantError) {
    console.error('Restaurant error:', restaurantError);
  }

  // Create test waiters
  const waiters = [
    {
      id: 'waiter-1',
      name: 'John Doe',
      phone_number: '+254700111111',
      restaurant_id: 'test-restaurant-123',
      is_active: true,
      profile_photo_url: null
    },
    {
      id: 'waiter-2',
      name: 'Jane Smith',
      phone_number: '+254700222222',
      restaurant_id: 'test-restaurant-123',
      is_active: true,
      profile_photo_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
    },
    {
      id: 'waiter-3',
      name: 'Mike Johnson',
      phone_number: '+254700333333',
      restaurant_id: 'test-restaurant-123',
      is_active: true,
      profile_photo_url: null
    }
  ];

  const { error: waitersError } = await supabase
    .from('waiters')
    .upsert(waiters);

  if (waitersError) {
    console.error('Waiters error:', waitersError);
  }

  // Create test QR code
  const qrCodeId = 'test-qr-123';
  const tippingUrl = `http://localhost:3000/tip/test-restaurant-123/${qrCodeId}`;
  
  const { data: qrCodeData, error: qrError } = await supabase
    .from('qr_codes')
    .upsert({
      id: qrCodeId,
      restaurant_id: 'test-restaurant-123',
      table_number: '5',
      table_name: 'Window Table',
      qr_data: tippingUrl,
      is_active: true
    })
    .select()
    .single();

  if (qrError) {
    console.error('QR code error:', qrError);
  }

  // Generate QR code image
  let qrCodeImage = '';
  try {
    qrCodeImage = await QRCode.toDataURL(tippingUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      width: 256,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  } catch (error) {
    console.error('QR generation error:', error);
  }

  return (
    <div className="min-h-screen bg-zinc-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          QR Code Test Setup Complete!
        </h1>
        
        <div className="bg-zinc-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Test Data Created:</h2>
          <ul className="text-zinc-300 space-y-2">
            <li>✅ Restaurant: Test Restaurant</li>
            <li>✅ Table: #5 (Window Table)</li>
            <li>✅ Waiters: John Doe, Jane Smith, Mike Johnson</li>
            <li>✅ QR Code: Generated and active</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">
            Scan this QR Code to test the tipping flow:
          </h2>
          
          {qrCodeImage && (
            <div className="flex justify-center mb-4">
              <img 
                src={qrCodeImage} 
                alt="Test QR Code" 
                className="border-2 border-zinc-300 rounded-lg"
              />
            </div>
          )}
          
          <p className="text-sm text-zinc-600 mb-4">
            Or visit directly: 
            <br />
            <a 
              href={tippingUrl}
              className="text-blue-600 hover:underline break-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              {tippingUrl}
            </a>
          </p>
          
          <div className="mt-6 p-4 bg-zinc-100 rounded-lg">
            <h3 className="font-semibold text-zinc-900 mb-2">How to test:</h3>
            <ol className="text-sm text-zinc-700 text-left space-y-1">
              <li>1. Use your phone's camera to scan the QR code above</li>
              <li>2. Or click the link to open directly</li>
              <li>3. Test both "Tip Waiter" and "Tip Restaurant" flows</li>
              <li>4. Try different tip amounts</li>
              <li>5. Navigate back and forth between steps</li>
            </ol>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a 
            href="/demo"
            className="inline-block bg-white text-zinc-900 px-6 py-3 rounded-lg font-semibold hover:bg-zinc-100 transition-colors"
          >
            View Demo Version
          </a>
        </div>
      </div>
    </div>
  );
}