import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createQRCodeService } from '@/utils/qr-codes';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const qrService = createQRCodeService(supabase);
    
    const qrCodeId = params.id;

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get existing QR code
    const existingQRCode = await qrService.getQRCode(qrCodeId);
    if (!existingQRCode) {
      return NextResponse.json(
        { error: 'QR code not found' },
        { status: 404 }
      );
    }

    // Verify user is admin of this restaurant
    const { data: adminCheck } = await supabase
      .from('restaurant_admins')
      .select('id')
      .eq('restaurant_id', existingQRCode.restaurant_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!adminCheck) {
      return NextResponse.json(
        { error: 'Unauthorized to regenerate QR code' },
        { status: 403 }
      );
    }

    // Regenerate QR code
    const updatedQRCode = await qrService.regenerateQRCode(
      qrCodeId,
      process.env.NEXT_PUBLIC_SITE_URL
    );

    // Generate new QR code images
    const qrData = {
      restaurantId: updatedQRCode.restaurant_id,
      tableId: updatedQRCode.id,
      tableNumber: updatedQRCode.table_number
    };

    const qrImageDataURL = await qrService.generateQRCodeDataURL(qrData);
    const qrSVG = await qrService.generateQRCodeSVG(qrData);

    return NextResponse.json({
      qrCode: updatedQRCode,
      qrImageDataURL,
      qrSVG
    });

  } catch (error) {
    console.error('Error regenerating QR code:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate QR code' },
      { status: 500 }
    );
  }
}