import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createQRCodeService } from '@/utils/qr-codes';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const qrService = createQRCodeService(supabase);
    
    const body = await request.json();
    const { restaurantId, tableNumber, tableName } = body;

    // Validate required fields
    if (!restaurantId || !tableNumber) {
      return NextResponse.json(
        { error: 'Restaurant ID and table number are required' },
        { status: 400 }
      );
    }

    // Check if user has permission to create QR codes for this restaurant
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user is admin of this restaurant
    const { data: adminCheck } = await supabase
      .from('restaurant_admins')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!adminCheck) {
      return NextResponse.json(
        { error: 'Unauthorized to manage QR codes for this restaurant' },
        { status: 403 }
      );
    }

    // Check if QR code already exists for this table
    const existingQRCodes = await qrService.getRestaurantQRCodes(restaurantId);
    const existingTable = existingQRCodes.find(qr => qr.table_number === tableNumber);
    
    if (existingTable) {
      return NextResponse.json(
        { error: 'QR code already exists for this table number' },
        { status: 409 }
      );
    }

    // Create the QR code
    const qrCode = await qrService.createQRCode({
      restaurantId,
      tableNumber,
      tableName,
      baseUrl: process.env.NEXT_PUBLIC_SITE_URL
    });

    // Generate QR code image data
    const qrData = {
      restaurantId: qrCode.restaurant_id,
      tableId: qrCode.id,
      tableNumber: qrCode.table_number
    };

    const qrImageDataURL = await qrService.generateQRCodeDataURL(qrData);
    const qrSVG = await qrService.generateQRCodeSVG(qrData);

    return NextResponse.json({
      qrCode,
      qrImageDataURL,
      qrSVG
    });

  } catch (error) {
    console.error('Error creating QR code:', error);
    return NextResponse.json(
      { error: 'Failed to create QR code' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const qrService = createQRCodeService(supabase);
    
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user is admin of this restaurant
    const { data: adminCheck } = await supabase
      .from('restaurant_admins')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!adminCheck) {
      return NextResponse.json(
        { error: 'Unauthorized to view QR codes for this restaurant' },
        { status: 403 }
      );
    }

    // Get all QR codes for the restaurant
    const qrCodes = await qrService.getRestaurantQRCodes(restaurantId);

    return NextResponse.json({ qrCodes });

  } catch (error) {
    console.error('Error fetching QR codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch QR codes' },
      { status: 500 }
    );
  }
}